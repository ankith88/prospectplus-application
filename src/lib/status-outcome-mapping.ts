import type { LeadStatus } from './types';

export interface OutcomeInfo {
  outcome: string;
  reason?: string;
  notes?: string;
}

export interface StatusDetailInfo {
  category: 'Automated Call Outcome' | 'Sales Pipeline Workflow' | 'Disqualified & Lost';
  description: string;
  outcomes: OutcomeInfo[];
}

export const STATUS_TO_OUTCOMES_MAP: Record<string, OutcomeInfo[]> = {
  'New': [
    { outcome: 'Prospect - No Access/No Contact', notes: 'Lead reset or uncontactable field prospect' },
  ],
  'In Progress': [
    { outcome: 'Busy', notes: 'Line busy on outbound call attempt' },
    { outcome: 'No Answer', notes: 'No answer on call attempt' },
    { outcome: 'Voicemail', notes: 'Voicemail left for prospect' },
  ],
  'High Touch': [
    { outcome: 'Call Back/Follow-up', notes: 'Prospect requested a callback or scheduled follow-up' },
  ],
  'Connected': [
    { outcome: 'Gatekeeper', notes: 'Reached receptionist or gatekeeper' },
  ],
  'Pre Qualified': [
    { outcome: 'Email Interested', notes: 'Prospect expressed interest via email' },
  ],
  'In Qualification': [
    { outcome: 'Qualified - Call Back/Send Info', notes: 'Prospect qualified and requesting further info' },
  ],
  'Appointment Booked': [],
  'Qualified': [],
  'Reschedule': [
    { outcome: 'Reschedule', notes: 'Appointment or call needed rescheduling' },
  ],
  'Email Brush Off': [
    { outcome: 'Email Brush-Off', notes: 'Prospect brushed off via email' },
  ],
  'Priority Field Lead': [
    { outcome: 'Unqualified Opportunity', notes: 'Field opportunity requiring priority BDR follow-up' },
  ],
  'LocalMile Opportunity': [
    { outcome: 'Register Now', notes: 'Prospect ready for LocalMile registration' },
  ],
  'Future Follow-up': [
    { outcome: 'Future Follow-up', notes: 'Longer term follow-up scheduled' },
  ],
  'Won': [
    { outcome: 'Upsell', notes: 'Successful upsell or signed customer deal' },
  ],
  'Lost': [
    { outcome: 'Disconnected', reason: 'Wrong Contact Details', notes: 'Phone line disconnected' },
    { outcome: 'DNC - Stop List', reason: 'Not Interested', notes: 'Added to Do-Not-Call list' },
    { outcome: 'Empty / Closed', reason: 'Closed Business', notes: 'Business is closed down' },
    { outcome: 'LOST - No Contact', reason: 'No Contact', notes: 'Unable to establish contact' },
    { outcome: 'LOST - No Response', reason: 'No Response', notes: 'No response after multiple attempts' },
    { outcome: 'Lost - Out of Territory', reason: 'Out of Territory', notes: 'Outside operating geographic region' },
    { outcome: 'LOST - Duplicate', reason: 'Duplicate', notes: 'Duplicate lead record' },
    { outcome: 'LOST - Existing Customer', reason: 'Existing Customer', notes: 'Already an existing customer' },
    { outcome: 'Not a Fit', reason: 'Not a Fit', notes: 'Not a good fit for MailPlus services' },
    { outcome: 'Not Interested', reason: 'Not Interested', notes: 'Prospect rejected offer' },
    { outcome: 'Wrong Number', reason: 'Wrong Contact Details', notes: 'Incorrect phone number' },
  ]
};

export const WORKFLOW_STATUS_EXPLANATIONS: Record<string, { category: StatusDetailInfo['category']; description: string }> = {
  'New': {
    category: 'Automated Call Outcome',
    description: 'Newly imported or reset lead awaiting initial dialer contact.',
  },
  'In Progress': {
    category: 'Automated Call Outcome',
    description: 'Outreach underway (busy, voicemail, or no answer).',
  },
  'High Touch': {
    category: 'Automated Call Outcome',
    description: 'Active lead with scheduled callback or follow-up requested by prospect.',
  },
  'Connected': {
    category: 'Automated Call Outcome',
    description: 'Initial contact made with receptionist or gatekeeper.',
  },
  'Pre Qualified': {
    category: 'Automated Call Outcome',
    description: 'Prospect expressed positive interest via email response.',
  },
  'In Qualification': {
    category: 'Automated Call Outcome',
    description: 'Qualified lead requesting formal follow-up or information package.',
  },
  'Appointment Booked': {
    category: 'Sales Pipeline Workflow',
    description: 'Demo or sales meeting successfully booked on calendar by rep.',
  },
  'Qualified': {
    category: 'Sales Pipeline Workflow',
    description: 'Lead meets ideal customer profile and qualification requirements.',
  },
  'Reschedule': {
    category: 'Automated Call Outcome',
    description: 'Scheduled appointment or call requires rescheduling.',
  },
  'Email Brush Off': {
    category: 'Automated Call Outcome',
    description: 'Prospect sent soft brush-off via email.',
  },
  'Priority Field Lead': {
    category: 'Automated Call Outcome',
    description: 'High-priority field lead requiring BDR intervention.',
  },
  'LocalMile Opportunity': {
    category: 'Automated Call Outcome',
    description: 'Prospect identified for LocalMile digital onboarding.',
  },
  'LocalMile Pending': {
    category: 'Sales Pipeline Workflow',
    description: 'LocalMile activation link generated and awaiting customer signup.',
  },
  'Trialing LocalMile': {
    category: 'Sales Pipeline Workflow',
    description: 'Active customer currently on a LocalMile service trial.',
  },
  'Trialing ShipMate': {
    category: 'Sales Pipeline Workflow',
    description: 'Customer currently active on a ShipMate trial period.',
  },
  'LocalMile Trial Stopped': {
    category: 'Disqualified & Lost',
    description: 'LocalMile free trial was manually cancelled or stopped.',
  },
  'ShipMate Trial Stopped': {
    category: 'Disqualified & Lost',
    description: 'ShipMate free trial was manually cancelled or stopped.',
  },
  'Quote Sent': {
    category: 'Sales Pipeline Workflow',
    description: 'Formal proposal or Standing Order Form (SCF) issued to prospect.',
  },
  'Quote Accepted': {
    category: 'Sales Pipeline Workflow',
    description: 'Proposal or SCF approved by prospect.',
  },
  'Future Follow-up': {
    category: 'Automated Call Outcome',
    description: 'Nurture lead deferred for future follow-up outreach.',
  },
  'Won': {
    category: 'Sales Pipeline Workflow',
    description: 'Customer successfully signed or upsell deal won.',
  },
  'Lost': {
    category: 'Disqualified & Lost',
    description: 'Lead closed out as lost or disqualified with specific NetSuite loss reason.',
  },
  'Lost Customer': {
    category: 'Disqualified & Lost',
    description: 'Former customer account cancelled or churned.',
  },
};

export const REVERSE_OUTCOME_TO_STATUS_MAP: Record<string, { status: LeadStatus; reason?: string }> = {
  'Busy': { status: 'In Progress' },
  'Call Back/Follow-up': { status: 'High Touch' },
  'Disconnected': { status: 'Lost', reason: 'Wrong Contact Details' },
  'DNC - Stop List': { status: 'Lost', reason: 'Not Interested' },
  'Email Interested': { status: 'Pre Qualified' },
  'Email Brush-Off': { status: 'Email Brush Off' },
  'Email Brush Off': { status: 'Email Brush Off' },
  'Empty / Closed': { status: 'Lost', reason: 'Closed Business' },
  'Gatekeeper': { status: 'Connected' },
  'LOST - No Contact': { status: 'Lost', reason: 'No Contact' },
  'LOST - No Response': { status: 'Lost', reason: 'No Response' },
  'Lost - Out of Territory': { status: 'Lost', reason: 'Out of Territory' },
  'LOST - Duplicate': { status: 'Lost', reason: 'Duplicate' },
  'LOST - Existing Customer': { status: 'Lost', reason: 'Existing Customer' },
  'No Answer': { status: 'In Progress' },
  'Not a Fit': { status: 'Lost', reason: 'Not a Fit' },
  'Not Interested': { status: 'Lost', reason: 'Not Interested' },
  'Prospect - No Access/No Contact': { status: 'New' },
  'Qualified - Call Back/Send Info': { status: 'In Qualification' },
  'Reschedule': { status: 'Reschedule' },
  'Unqualified Opportunity': { status: 'Priority Field Lead' },
  'Upsell': { status: 'Won' },
  'Voicemail': { status: 'In Progress' },
  'Wrong Number': { status: 'Lost', reason: 'Wrong Contact Details' },
  'Future Follow-up': { status: 'Future Follow-up' },
  'Register Now': { status: 'LocalMile Opportunity' },
};

/**
 * Deduplicates and returns the list of call outcomes that trigger a transition to the specified lead status.
 */
export function getOutcomesForStatus(status: string): OutcomeInfo[] {
  if (!status) return [];
  const normalized = status.trim();
  const rawList = normalized === 'Signed' 
    ? (STATUS_TO_OUTCOMES_MAP['Won'] || []) 
    : (STATUS_TO_OUTCOMES_MAP[normalized] || []);

  // Deduplicate outcomes by normalized outcome string (lowercase, ignoring spaces & hyphens)
  const seen = new Set<string>();
  const uniqueOutcomes: OutcomeInfo[] = [];

  for (const item of rawList) {
    const key = item.outcome.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueOutcomes.push(item);
    }
  }

  return uniqueOutcomes;
}

export function getStatusOutcomeExplanation(status: string): string {
  const normalized = (status || '').trim();
  if (WORKFLOW_STATUS_EXPLANATIONS[normalized]) {
    return WORKFLOW_STATUS_EXPLANATIONS[normalized].description;
  }

  if (normalized === 'New' || normalized === 'Unassigned' || normalized === 'Imported') {
    return `The 'New' status indicates a newly added lead in your pipeline awaiting initial contact from either the Outbound Team or an Account Manager.`;
  }

  const outcomes = getOutcomesForStatus(status);
  if (!outcomes || outcomes.length === 0) {
    return `Status '${status}' is managed manually or by system workflows.`;
  }

  if (outcomes.length === 1) {
    return `Lead transitions to '${status}' when logging the outcome: "${outcomes[0].outcome}".`;
  }

  const list = outcomes.map(o => `"${o.outcome}"`).join(', ');
  return `Lead transitions to '${status}' when logging any of these outcomes: ${list}.`;
}

