import type { UserProfile, TelephonyProviderType } from '@/lib/types';

/**
 * Resolves the effective telephony provider for a specific user,
 * taking into account their individual preference override and falling back
 * to the system global default.
 */
export function resolveUserTelephonyProvider(
  user?: Partial<UserProfile> | null,
  globalDefault: TelephonyProviderType = 'aircall'
): TelephonyProviderType {
  if (user?.preferredTelephonyProvider && user.preferredTelephonyProvider !== 'default') {
    return user.preferredTelephonyProvider;
  }
  return globalDefault;
}

/**
 * Returns the active dialer URI based on the user's preferred telephony provider
 * or explicit provider.
 */
export function getDialerUri(
  phoneNumber: string,
  providerOrUser?: TelephonyProviderType | Partial<UserProfile> | null,
  globalDefault: TelephonyProviderType = 'aircall'
): string {
  if (!phoneNumber) return '';
  const cleanDigits = phoneNumber.trim().replace(/[^\d+]/g, '');

  let provider: TelephonyProviderType = globalDefault;
  if (typeof providerOrUser === 'string') {
    provider = providerOrUser;
  } else if (providerOrUser && typeof providerOrUser === 'object') {
    provider = resolveUserTelephonyProvider(providerOrUser, globalDefault);
  }

  if (provider === 'dialpad') {
    return `dialpad:${cleanDigits}`;
  }
  return `aircall:${cleanDigits}`;
}

/**
 * Resolves the phone number for a rep/account manager dynamically.
 * Prioritizes the phone number corresponding to the rep's preferred provider,
 * falling back to the alternative provider or standard mobile/phone.
 */
export function getRepresentativePhoneNumber(
  user: Partial<UserProfile> | null | undefined,
  globalDefault: TelephonyProviderType = 'aircall'
): string {
  if (!user) return '';

  const effectiveProvider = resolveUserTelephonyProvider(user, globalDefault);

  if (effectiveProvider === 'dialpad') {
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
  providerOrUser?: TelephonyProviderType | Partial<UserProfile> | null,
  globalDefault: TelephonyProviderType = 'aircall'
): void {
  if (typeof window === 'undefined' || !phoneNumber) return;
  const uri = getDialerUri(phoneNumber, providerOrUser, globalDefault);
  if (uri) {
    window.open(uri, '_self');
  }
}
