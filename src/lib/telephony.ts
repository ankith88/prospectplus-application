import type { UserProfile, TelephonyProviderType } from '@/lib/types';

/**
 * Returns the active dialer URI based on the telephony provider.
 */
export function getDialerUri(phoneNumber: string, provider: TelephonyProviderType = 'aircall'): string {
  if (!phoneNumber) return '';
  const cleanDigits = phoneNumber.trim().replace(/[^\d+]/g, '');
  if (provider === 'dialpad') {
    return `dialpad:${cleanDigits}`;
  }
  return `aircall:${cleanDigits}`;
}

/**
 * Resolves the phone number for a rep/account manager dynamically based on active telephony provider.
 */
export function getRepresentativePhoneNumber(
  user: Partial<UserProfile> | null | undefined,
  activeProvider: TelephonyProviderType = 'aircall'
): string {
  if (!user) return '';

  if (activeProvider === 'dialpad') {
    return (
      user.dialpadPhoneNumber ||
      user.aircallPhoneNumber ||
      user.mobileNumber ||
      user.phoneNumber ||
      ''
    );
  }

  return (
    user.aircallPhoneNumber ||
    user.dialpadPhoneNumber ||
    user.mobileNumber ||
    user.phoneNumber ||
    ''
  );
}

/**
 * Initiates an outbound call by opening the native application protocol.
 */
export function initiateOutboundCall(
  phoneNumber: string,
  provider: TelephonyProviderType = 'aircall'
): void {
  if (typeof window === 'undefined' || !phoneNumber) return;
  const uri = getDialerUri(phoneNumber, provider);
  if (uri) {
    window.open(uri, '_self');
  }
}
