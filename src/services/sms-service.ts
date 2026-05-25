'use server';

/**
 * Service for sending SMS messages via the MailPlus Driver SMS API.
 */

const MAILPLUS_SMS_API_URL = 'https://app.mailplus.com.au/api/v1/general/drivers/send_sms';

/**
 * Normalizes an Australian mobile number to international format (+61...)
 * Handles spaces, typical prefixes (04, +61, 61), and non-numeric characters.
 */
export async function formatAustralianMobile(phone: string): Promise<string | null> {
  if (!phone) return null;
  
  // Strip all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+61')) {
    // Already formatted, but let's check length
    return cleaned.length === 12 ? cleaned : null;
  }
  
  if (cleaned.startsWith('61')) {
    cleaned = '+' + cleaned;
    return cleaned.length === 12 ? cleaned : null;
  }
  
  if (cleaned.startsWith('04')) {
    cleaned = '+61' + cleaned.substring(1);
    return cleaned.length === 12 ? cleaned : null;
  }

  // Not a recognizable format or length
  return null;
}

/**
 * Sends an SMS using the MailPlus Driver API.
 */
export async function sendSms(phone: string, text: string): Promise<{ success: boolean; message?: string }> {
  const formattedPhone = await formatAustralianMobile(phone);
  
  if (!formattedPhone) {
    return { success: false, message: 'Invalid Australian mobile number format.' };
  }

  if (!text || text.trim() === '') {
    return { success: false, message: 'SMS text cannot be empty.' };
  }

  const apiKey = process.env.MAILPLUS_SMS_API_KEY;
  if (!apiKey) {
    console.error('[SMS Service] Missing MAILPLUS_SMS_API_KEY environment variable.');
    return { success: false, message: 'SMS service is not configured. Missing API key.' };
  }

  try {
    const response = await fetch(MAILPLUS_SMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'GENERAL-API-KEY': apiKey
      },
      body: JSON.stringify({
        phone: formattedPhone,
        text: text
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SMS Service] Failed to send SMS: ${response.status} ${errorText}`);
      return { success: false, message: `Failed to dispatch SMS: API returned ${response.status}` };
    }

    const data = await response.json();
    return { success: true, message: 'SMS sent successfully.' };

  } catch (error: any) {
    console.error('[SMS Service] Network or unexpected error sending SMS:', error);
    return { success: false, message: `An unexpected error occurred: ${error.message}` };
  }
}
