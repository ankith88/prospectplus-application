/**
 * Dialpad API Client and Provider Adapter
 * Uses Dialpad REST API v2: https://dialpad.com/api/v2
 */

export interface DialpadUser {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone_numbers?: string[];
  office_id?: number;
  state?: string;
}

export interface DialpadNumber {
  id: number;
  number: string;
  formatted_number?: string;
  type?: string;
  name?: string;
  assigned_to?: {
    id: number;
    type: string;
    name?: string;
  };
}

export interface DialpadCallRecord {
  call_id: string;
  direction: 'inbound' | 'outbound';
  state: string; // 'hungup', 'missed', 'connected', etc.
  date_started?: number; // ms timestamp
  date_ended?: number;
  date_connected?: number;
  duration?: number; // seconds or ms
  external_number?: string;
  internal_number?: string;
  was_recorded?: boolean;
  recording_url?: string;
  transcription_text?: string;
  target?: {
    id: number;
    type: string;
    name?: string;
    phone_number?: string;
    email?: string;
  };
}

export function getDialpadApiKey(): string | null {
  const key = (
    process.env.DIALPAD_API_KEY ||
    process.env.NEXT_PUBLIC_DIALPAD_API_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '');
  return key || null;
}

export function getDialpadAuthHeaders(apiKeyOverride?: string): Record<string, string> | null {
  const key = apiKeyOverride?.trim() || getDialpadApiKey();
  if (!key) return null;
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/**
 * Test Dialpad API Connectivity using the provided or environment API key.
 */
export async function testDialpadConnection(apiKeyOverride?: string): Promise<{
  success: boolean;
  userCount?: number;
  companyName?: string;
  error?: string;
}> {
  const headers = getDialpadAuthHeaders(apiKeyOverride);
  if (!headers) {
    return { success: false, error: 'Dialpad API key is not configured in environment or settings.' };
  }

  try {
    const res = await fetch('https://dialpad.com/api/v2/users?limit=10', {
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Dialpad API returned HTTP ${res.status}: ${errText}` };
    }

    const data = await res.json() as any;
    const users = data?.items || [];
    return {
      success: true,
      userCount: users.length,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error connecting to Dialpad' };
  }
}

/**
 * Creates a webhook target on Dialpad (Step 1).
 */
export async function createDialpadWebhook(
  hookUrl: string,
  secret?: string,
  apiKeyOverride?: string
): Promise<{ success: boolean; webhookId?: string | number; error?: string }> {
  const headers = getDialpadAuthHeaders(apiKeyOverride);
  if (!headers) return { success: false, error: 'Missing Dialpad API key' };

  try {
    const payload: Record<string, any> = { hook_url: hookUrl };
    if (secret) payload.secret = secret;

    const res = await fetch('https://dialpad.com/api/v2/webhooks', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }

    const data = await res.json() as any;
    return { success: true, webhookId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Creates an event subscription for a webhook target on Dialpad (Step 2).
 */
export async function createDialpadSubscription(
  webhookId: string | number,
  callEvents: string[] = ['call_hungup', 'call_missed', 'call_connected', 'transcription_ready', 'recording_ready'],
  apiKeyOverride?: string
): Promise<{ success: boolean; subscriptionId?: string | number; error?: string }> {
  const headers = getDialpadAuthHeaders(apiKeyOverride);
  if (!headers) return { success: false, error: 'Missing Dialpad API key' };

  try {
    const res = await fetch('https://dialpad.com/api/v2/subscriptions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        webhook_id: String(webhookId),
        call_events: callEvents,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }

    const data = await res.json() as any;
    return { success: true, subscriptionId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetches transcript for a specific Dialpad call.
 */
export async function fetchDialpadTranscript(callId: string, apiKeyOverride?: string): Promise<{
  utterances: Array<{ speaker: string; text: string; start_time?: number; end_time?: number }>;
} | null> {
  const headers = getDialpadAuthHeaders(apiKeyOverride);
  if (!headers) return null;

  try {
    const res = await fetch(`https://dialpad.com/api/v2/transcripts/${callId}`, {
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      // Fallback endpoint
      const fallback = await fetch(`https://dialpad.com/api/v2/calls/${callId}/transcript`, {
        headers,
        cache: 'no-store',
      });
      if (!fallback.ok) return null;
      const fbData = await fallback.json() as any;
      return parseDialpadTranscriptPayload(fbData);
    }

    const data = await res.json() as any;
    return parseDialpadTranscriptPayload(data);
  } catch (err) {
    console.warn(`[Dialpad] Failed to fetch transcript for call ${callId}:`, err);
    return null;
  }
}

function parseDialpadTranscriptPayload(data: any): { utterances: Array<{ speaker: string; text: string; start_time?: number; end_time?: number }> } | null {
  if (!data) return null;
  const rawUtterances = data.utterances || data.items || data.transcript?.utterances || [];
  if (!Array.isArray(rawUtterances) || rawUtterances.length === 0) {
    if (typeof data.text === 'string' && data.text.trim()) {
      return { utterances: [{ speaker: 'Unknown', text: data.text }] };
    }
    return null;
  }

  const utterances = rawUtterances.map((u: any) => ({
    speaker: u.speaker || u.speaker_name || (u.is_internal ? 'Agent' : 'Customer'),
    text: u.text || u.content || u.words || '',
    start_time: u.start_time || u.start_time_ms ? (u.start_time || u.start_time_ms / 1000) : undefined,
    end_time: u.end_time || u.end_time_ms ? (u.end_time || u.end_time_ms / 1000) : undefined,
  })).filter((u: any) => u.text.trim().length > 0);

  return utterances.length > 0 ? { utterances } : null;
}
