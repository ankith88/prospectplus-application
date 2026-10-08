import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { TelephonySettings, TelephonyProviderType } from '@/lib/types';
import { testDialpadConnection } from './telephony/dialpad-provider';

const db = getFirestore(adminApp);
const SETTINGS_DOC_PATH = 'system_settings/telephony';

let cachedSettings: TelephonySettings | null = null;
let cacheExpiry = 0;

/**
 * Gets the current telephony settings from Firestore with a 30-second server cache.
 */
export async function getTelephonySettingsServer(forceFresh = false): Promise<TelephonySettings> {
  const now = Date.now();
  if (!forceFresh && cachedSettings && now < cacheExpiry) {
    return cachedSettings;
  }

  try {
    const snap = await db.doc(SETTINGS_DOC_PATH).get();
    if (snap.exists) {
      const data = snap.data() as TelephonySettings;
      cachedSettings = {
        activeProvider: data.activeProvider || 'aircall',
        aircall: {
          enabled: data.aircall?.enabled !== false,
          apiId: data.aircall?.apiId || process.env.AIRCALL_API_ID || '',
          apiToken: data.aircall?.apiToken || process.env.AIRCALL_API_TOKEN || '',
          webhookSecret: data.aircall?.webhookSecret || process.env.WEBHOOK_SECRET || '',
        },
        dialpad: {
          enabled: data.dialpad?.enabled !== false,
          apiKey: data.dialpad?.apiKey || process.env.DIALPAD_API_KEY || '',
          webhookSecret: data.dialpad?.webhookSecret || process.env.WEBHOOK_SECRET || '',
          webhookId: data.dialpad?.webhookId || '',
          officeId: data.dialpad?.officeId || '',
        },
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      };
    } else {
      // Default initial state
      cachedSettings = {
        activeProvider: 'aircall',
        aircall: {
          enabled: true,
          apiId: process.env.AIRCALL_API_ID || '',
          apiToken: process.env.AIRCALL_API_TOKEN || '',
          webhookSecret: process.env.WEBHOOK_SECRET || '',
        },
        dialpad: {
          enabled: true,
          apiKey: process.env.DIALPAD_API_KEY || '',
          webhookSecret: process.env.WEBHOOK_SECRET || '',
          webhookId: '',
        },
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      };
    }
  } catch (err) {
    console.warn('[Telephony Server] Failed to fetch settings from Firestore, fallback to env:', err);
    cachedSettings = {
      activeProvider: 'aircall',
      aircall: {
        enabled: true,
        apiId: process.env.AIRCALL_API_ID || '',
        apiToken: process.env.AIRCALL_API_TOKEN || '',
        webhookSecret: process.env.WEBHOOK_SECRET || '',
      },
      dialpad: {
        enabled: true,
        apiKey: process.env.DIALPAD_API_KEY || '',
        webhookSecret: process.env.WEBHOOK_SECRET || '',
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'fallback',
    };
  }

  cacheExpiry = now + 30000; // 30s cache
  return cachedSettings;
}

/**
 * Updates the telephony settings in Firestore (Superadmin action).
 */
export async function updateTelephonySettingsServer(
  updates: Partial<TelephonySettings>,
  updatedBy: string
): Promise<TelephonySettings> {
  const current = await getTelephonySettingsServer(true);
  const merged: TelephonySettings = {
    ...current,
    ...updates,
    aircall: {
      ...current.aircall,
      ...(updates.aircall || {}),
    },
    dialpad: {
      ...current.dialpad,
      ...(updates.dialpad || {}),
    },
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  await db.doc(SETTINGS_DOC_PATH).set(merged, { merge: true });
  cachedSettings = merged;
  cacheExpiry = Date.now() + 30000;
  return merged;
}

/**
 * Tests the connection for the specified telephony provider.
 */
export async function testProviderConnectionServer(
  provider: TelephonyProviderType,
  customApiKey?: string
): Promise<{ success: boolean; message: string; details?: any }> {
  if (provider === 'dialpad') {
    const res = await testDialpadConnection(customApiKey);
    if (res.success) {
      return {
        success: true,
        message: `Successfully connected to Dialpad API! (Found ${res.userCount ?? 0} active users)`,
        details: res,
      };
    } else {
      return {
        success: false,
        message: res.error || 'Failed to connect to Dialpad API',
        details: res,
      };
    }
  } else {
    // AirCall check
    const apiId = process.env.AIRCALL_API_ID || '';
    const apiToken = process.env.AIRCALL_API_TOKEN || '';
    if (!apiId || !apiToken) {
      return { success: false, message: 'AirCall credentials missing in environment.' };
    }
    try {
      const creds = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
      const res = await fetch('https://api.aircall.io/v1/ping', {
        headers: { Authorization: `Basic ${creds}` },
      });
      if (res.ok) {
        return { success: true, message: 'Successfully connected to AirCall API!' };
      }
      return { success: false, message: `AirCall API returned status ${res.status}` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error connecting to AirCall' };
    }
  }
}
