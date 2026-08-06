import { EmailVerificationResult } from '@/lib/types';

interface VerifyEmailsParams {
  emails: string[];
  leadId?: string;
  contactId?: string;
  forceRefresh?: boolean;
}

export async function verifyEmailsClient({
  emails,
  leadId,
  contactId,
  forceRefresh = false,
}: VerifyEmailsParams): Promise<EmailVerificationResult[]> {
  const cleanEmails = emails
    .filter(Boolean)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  if (cleanEmails.length === 0) {
    return [];
  }

  const response = await fetch('/api/email/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emails: cleanEmails,
      leadId,
      contactId,
      forceRefresh,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Verification request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.success || !Array.isArray(data.results)) {
    throw new Error(data.message || 'Invalid response format from verification server.');
  }

  return data.results;
}
