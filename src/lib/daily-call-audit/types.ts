export interface Utterance {
  speaker: string | number;
  text: string;
  start_time?: number;
  end_time?: number;
}

export interface DailyAuditCallRecord {
  callId: string;
  date: string;
  author: string;
  phoneNumber?: string;
  durationSeconds: number;
  durationFormatted: string;
  notes?: string;
  direction?: 'inbound' | 'outbound';
  aircallStatus?: string;
  recordingUrl?: string;
  leadId?: string;
  leadType?: 'leads' | 'companies' | 'unassigned';
  leadName?: string;
  prospectPlusId?: string;
  utterances: Utterance[];
  transcriptRawText: string;
}

export interface EvidenceRecord {
  callId: string;
  leadName?: string;
  prospectPlusId?: string;
  repName?: string;
  note?: string;
}

export interface ScorecardItem {
  targetTitle: string;
  targetDescription: string;
  todaySummary: string;
  isMet: boolean;
  metStatusText: string; // e.g. "ALEX YES · WARREN NO", "NO — 11 missed", "NO — 4 calls flagged"
  evidenceCallIds: string[];
  evidenceDetails?: EvidenceRecord[];
}

export interface TrackedListItem {
  commitment: string;
  status: string;
  details?: string;
}

export interface AMRepSummary {
  repName: string;
  dialsCount: number;
  connectedCount: number;
  summary: string;
  flaggedNotes?: string;
}

export interface DailyAuditReportData {
  title: string; // e.g. "J2 daily — Friday 25 September (week 8, day 5)"
  dateString: string; // DD-MM-YYYY
  dateFormatted: string; // e.g. "Friday 25 September 2026"
  headlineStats: {
    totalSdrDials: number;
    repDialsBreakdown: { repName: string; dials: number; note?: string }[];
    totalConversationsAnalysed: number;
    sources: string;
  };
  scorecard: ScorecardItem[];
  narrative: {
    whatWentRight: string;
    theUncomfortableOne: string;
  };
  trackedLists: TrackedListItem[];
  amDayInBrief: {
    summary: string;
    reps: AMRepSummary[];
  };
}
