// Central status coloring system to ensure consistent colors across pages

export const STATUS_COLORS: Record<string, string> = {
  // Priority / Hot Leads (Crimson/Rose)
  'Hot Lead': '#f43f5e',
  'Priority Lead': '#f43f5e',
  'Priority Field Lead': '#f43f5e',
  'High Touch': '#f43f5e',

  // New (Blue)
  'New': '#3b82f6',

  // Active / Positive (Cyan/Teal - Trials & Quotes)
  'Trialing ShipMate': '#06b6d4',
  'Trialing LocalMile': '#06b6d4',
  'Free Trial': '#06b6d4',
  'Quote Sent': '#06b6d4',
  'Quote Accepted': '#10b981',
  'Qualified': '#06b6d4',
  'Pre Qualified': '#06b6d4',
  'In Progress': '#06b6d4',
  'Contacted': '#06b6d4',
  'Connected': '#06b6d4',
  'Prospect Opportunity': '#06b6d4',
  'Customer Opportunity': '#06b6d4',
  'In Qualification': '#06b6d4',
  'LocalMile Pending': '#06b6d4',
  'LocalMile Opportunity': '#06b6d4',

  // Very Positive Outcome (Emerald Green - Won / Signed / Customer)
  'Won': '#10b981',
  'Signed': '#10b981',
  'Customer': '#10b981',

  // No Answer / Follow-up (Orange)
  'No Answer': '#f97316',
  'No Response': '#f97316',
  'Reschedule': '#f97316',
  'Future Follow-up': '#f97316',

  // Negative / Dead (Red)
  'Lost': '#ef4444',
  'Lost Customer': '#ef4444',
  'Unqualified': '#ef4444',
  'Email Brush Off': '#ef4444',
  'LPO Review': '#ef4444',
};

export function getStatusColor(statusName: string, fallbackColor: string = '#94a3b8'): string {
  if (!statusName) return fallbackColor;
  
  // Clean string for lookup
  const cleanStatus = statusName.trim();
  if (STATUS_COLORS[cleanStatus]) {
    return STATUS_COLORS[cleanStatus];
  }

  // Fallback pattern matching
  const normalized = cleanStatus.toLowerCase();
  
  if (normalized.includes('won') || normalized.includes('signed') || normalized.includes('customer')) {
    return STATUS_COLORS['Won'];
  }
  if (normalized.includes('lost') || normalized.includes('unqualified') || normalized.includes('dead') || normalized.includes('rejected')) {
    return STATUS_COLORS['Lost'];
  }
  if (normalized.includes('trial') || normalized.includes('quote') || normalized.includes('progress') || normalized.includes('qualif')) {
    return STATUS_COLORS['Free Trial'];
  }
  if (normalized.includes('hot') || normalized.includes('priority')) {
    return STATUS_COLORS['Hot Lead'];
  }
  if (normalized.includes('no answer') || normalized.includes('no response') || normalized.includes('reschedule') || normalized.includes('follow-up')) {
    return STATUS_COLORS['No Answer'];
  }

  return fallbackColor;
}
