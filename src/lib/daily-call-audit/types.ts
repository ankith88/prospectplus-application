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

export interface SDRPerformanceMetrics {
  repName: string;
  dials: number;
  uniqueLeadsCount?: number;
  firstCallTime?: string;
  lastCallTime?: string;
  hoursOnPhone?: string;
  conversations45sPlus: number;
  dialsPerConversation: string | number;
  qualifyingRate: string;
  fiveFreeOpportunitiesTaken: number;
  fiveFreeOpportunitiesMissed: number;
  fullCardsCompleted: number;
  unapprovedClaimsCount: number;
  mobileCapturedAtBookingCount: number;
  notesSummary?: string;
}

export interface ScorecardItem {
  measureNumber: number;
  targetTitle: string;
  targetDescription: string;
  todaySummary: string;
  isMet: boolean;
  metStatusText: string; // e.g. "MET", "NOT MET", "NO — 11 missed", "ALEX YES · WARREN NO"
  evidenceCallIds: string[]; // Formatted as: "{Lead Name} (ID: {prospectPlusId}) [Call: {callId}]"
}

export interface CallCardLineEvaluation {
  lineName: string;
  prescribedWords: string;
  complianceRateOrCount: string;
  status: string;
  liveEvidenceExample: string;
}

export interface DailyTrendRow {
  measure: string;
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  read: string;
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

export interface ExecutiveQuestionItem {
  questionNumber: number;
  questionTitle: string; // "1 · Did we turn up?", "2 · Did we take the fork?", "3 · Did we book properly?", "4 · Did we keep our promises?", "5 · Did anything leak?"
  answer: string;
  evidence: string;
}

export interface DiaryItem {
  time?: string;
  title: string;
  rep?: string;
  details?: string;
}

export interface BenchmarkItem {
  behaviour: string;
  whereWeAre: string;
  bar: string;
  statusLevel: 'green' | 'amber' | 'red';
}

export interface ForkBreakdown {
  serviceSignalsCount: number;
  serviceFiveFreeOffered: number;
  serviceFiveFreeMissed: number;
  productSignalsCount: number;
  productShipMateRaised: number;
  productWrongFork: number;
  productMissed: number;
  proofSummary: string;
}

export interface AMScorecardItem {
  measureNumber: number;
  title: string;
  description: string;
  todayStatus: string;
  isMet: boolean;
}

export interface DailyAuditReportData {
  title: string; // e.g. "Daily — Monday 28 September (week 9, day 1)"
  dateString: string; // DD-MM-YYYY
  dateFormatted: string; // e.g. "Monday, 28 September 2026"
  headlineStats: {
    totalSdrDials: number;
    totalUniqueLeads?: number;
    repDialsBreakdown: { repName: string; dials: number; uniqueLeads?: number; note?: string }[];
    totalConversationsAnalysed: number;
    sources: string;
  };
  executiveQuestions: ExecutiveQuestionItem[];
  tomorrowDiary: DiaryItem[];
  benchmarks: BenchmarkItem[];
  forkBreakdown?: ForkBreakdown;
  sdrRosterMetrics: SDRPerformanceMetrics[];
  scorecard: ScorecardItem[];
  callCardLines: CallCardLineEvaluation[];
  dayByDayTrends: DailyTrendRow[];
  amScorecard: AMScorecardItem[];
  narrative: {
    whatWentRight: string;
    theUncomfortableOne: string;
    actionableInsightForLeadership: string;
  };
  trackedLists: TrackedListItem[];
  amDayInBrief: {
    summary: string;
    reps: AMRepSummary[];
  };
}

