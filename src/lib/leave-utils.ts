import { UserProfile } from './types';

/**
 * Determines if a user (Account Manager) is currently on leave based on their leave profile
 * and the current date (checking against startDate and endDate if provided).
 */
export function isAmActivelyOnLeave(user: UserProfile): boolean {
  if (!user.leaveProfile || !user.leaveProfile.isOnLeave) {
    return false;
  }

  const { startDate, endDate } = user.leaveProfile;
  const todayStr = new Date().toISOString().split('T')[0];

  if (endDate) {
    // If today is strictly greater than endDate, leave is over
    if (todayStr > endDate) {
      return false;
    }
  }

  if (startDate) {
    // If today is strictly less than startDate, leave hasn't started
    if (todayStr < startDate) {
      return false;
    }
  }

  // If it falls within the date range, or no dates are specified but isOnLeave is true
  return true;
}

/**
 * Determines if a lead can be assigned to this Account Manager.
 * Returns false if the AM is actively on leave and has "stopAssignment" enabled.
 */
export function canAssignToAm(user: UserProfile): boolean {
  if (isAmActivelyOnLeave(user) && user.leaveProfile?.stopAssignment) {
    return false;
  }
  return true;
}
