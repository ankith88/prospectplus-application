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
 * Uses the modern Call Event Subscriptions endpoint: POST https://dialpad.com/api/v2/subscriptions/call
 */
export async function createDialpadSubscription(
  webhookId: string | number,
  callEvents: string[] = ['all'],
  apiKeyOverride?: string
): Promise<{ success: boolean; subscriptionId?: string | number; error?: string }> {
  const headers = getDialpadAuthHeaders(apiKeyOverride);
  if (!headers) return { success: false, error: 'Missing Dialpad API key' };

  try {
    // 1. Try modern Call Event Subscriptions endpoint
    const res = await fetch('https://dialpad.com/api/v2/subscriptions/call', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        webhook_id: String(webhookId),
        call_states: callEvents.length > 0 ? callEvents : ['all'],
      }),
    });

    if (res.ok) {
      const data = await res.json() as any;
      return { success: true, subscriptionId: data.id };
    }

    // 2. Fallback to generic subscriptions endpoint
    const fallbackRes = await fetch('https://dialpad.com/api/v2/subscriptions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        webhook_id: String(webhookId),
        call_events: ['call_hungup', 'call_missed', 'call_connected', 'transcription_ready', 'recording_ready'],
      }),
    });

    if (!fallbackRes.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }

    const data = await fallbackRes.json() as any;
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

function parseDialpadTranscriptPayload(data: any): { utterances: Array<{ speaker: string; text: string; participant_type?: 'internal' | 'external'; user_id?: string; start_time?: number; end_time?: number; time?: string }> } | null {
  if (!data) return null;
  // Dialpad REST API returns spoken transcript lines in `data.lines`
  const rawLines = data.lines || data.utterances || data.items || data.transcript?.utterances || [];
  if (Array.isArray(rawLines) && rawLines.length > 0) {
    // Filter for actual transcript utterances (exclude internal marker moments like 'action_item_v2', 'question')
    const transcriptItems = rawLines.filter((l: any) => l.type === 'transcript' || (!l.type && (l.content || l.text)));
    const targetItems = transcriptItems.length > 0 ? transcriptItems : rawLines.filter((l: any) => l.type !== 'moment');

    const utterances = targetItems.map((u: any) => {
      const isInternal = Boolean(u.user_id || u.is_internal || (u.name && !u.name.startsWith('+') && !u.name.startsWith('04')));
      const speaker = u.name || u.speaker || u.speaker_name || (isInternal ? 'Agent' : 'Customer');
      const text = u.content || u.text || u.words || '';
      return {
        speaker: String(speaker).trim() || (isInternal ? 'Agent' : 'Customer'),
        text: String(text).trim(),
        participant_type: (isInternal ? 'internal' : 'external') as 'internal' | 'external',
        user_id: u.user_id ? String(u.user_id) : undefined,
        time: u.time,
        start_time: u.start_time || u.start_time_ms ? (u.start_time || u.start_time_ms / 1000) : undefined,
        end_time: u.end_time || u.end_time_ms ? (u.end_time || u.end_time_ms / 1000) : undefined,
      };
    }).filter((u: any) => u.text.length > 0);

    if (utterances.length > 0) {
      return { utterances };
    }
  }

  if (typeof data.text === 'string' && data.text.trim()) {
    return { utterances: [{ speaker: 'Unknown', text: data.text.trim(), participant_type: 'external' }] };
  }
  return null;
}

/**
 * Fetches call details for a specific Dialpad call by ID.
 */
export async function fetchDialpadCall(callId: string, apiKeyOverride?: string): Promise<any | null> {
  const headers = getDialpadAuthHeaders(apiKeyOverride);
  if (!headers) return null;

  try {
    const res = await fetch(`https://dialpad.com/api/v2/call/${callId}`, {
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      // Fallback endpoint
      const fb = await fetch(`https://dialpad.com/api/v2/calls/${callId}`, {
        headers,
        cache: 'no-store',
      });
      if (!fb.ok) return null;
      return await fb.json();
    }

    return await res.json();
  } catch (err) {
    console.warn(`[Dialpad] Failed to fetch call details for ${callId}:`, err);
    return null;
  }
}

/**
 * Fetches recent concluded calls from Dialpad.
 */
export async function fetchRecentDialpadCalls(
  options?: { limit?: number; targetId?: string | number },
  apiKeyOverride?: string
): Promise<any[]> {
  const headers = getDialpadAuthHeaders(apiKeyOverride);
  if (!headers) return [];

  const limit = options?.limit || 20;
  let url = `https://dialpad.com/api/v2/call?limit=${limit}`;
  if (options?.targetId) {
    url += `&target_id=${options.targetId}`;
  }

  try {
    const res = await fetch(url, {
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      const fb = await fetch(`https://dialpad.com/api/v2/calls?limit=${limit}`, {
        headers,
        cache: 'no-store',
      });
      if (!fb.ok) return [];
      const fbData = await fb.json() as any;
      return fbData?.items || fbData?.calls || [];
    }

    const data = await res.json() as any;
    return data?.items || data?.calls || [];
  } catch (err) {
    console.warn('[Dialpad] Failed to fetch recent calls:', err);
    return [];
  }
}

