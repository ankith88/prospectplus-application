

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Unqualified'
  | 'Lost'
  | 'Won'
  | 'LPO Review'
  | 'In Progress'
  | 'Connected'
  | 'High Touch'

export interface Activity {
  id: string
  type: 'Call' | 'Email' | 'Meeting' | 'Update'
  date: string
  duration?: string // e.g., "5m 32s"
  notes: string
  callId?: string
  author?: string
}

export interface Note {
    id: string;
    date: string;
    author: string;
    content: string;
}

export interface Task {
    id: string;
    title: string;
    dueDate: string;
    isCompleted: boolean;
    createdAt: string;
    completedAt?: string;
    author: string;
}

export interface TranscriptAnalysis {
  summary: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  actionItems: string[];
  keyTopics: string[];
}
export interface Transcript {
    id: string;
    date: string;
    author: string;
    content: string; // This will now be a JSON string of utterances
    callId: string;
    analysis?: TranscriptAnalysis;
    phoneNumber?: string;
}

export interface Contact {
  id: string
  name: string
  title: string
  email: string
  phone: string
}

export interface Address {
  street: string
  city: string
  state: string
  zip: string
  country: string
}

export interface ScorecardPillarScore {
    pillar: string;
    score: number;
    feedback: string;
}

export interface ScorecardAnalysis {
    overallScore: number;
    overallFeedback: string;
    pillarScores: ScorecardPillarScore[];
}

export interface Scorecard {
    id: string;
    leadId: string;
    dialerAssigned: string;
    date: string;
    // Opening
    openingClarity: 'clear' | 'unclear' | 'somewhat_clear';
    openingRapport: boolean;
    // Diagnostics
    diagnosticQuestionQuality: 'effective' | 'ineffective' | 'needs_improvement';
    painPointIdentification: boolean;
    // Pitch
    pitchClarity: 'clear' | 'unclear' | 'somewhat_clear';
    pitchRelevance: 'relevant' | 'irrelevant' | 'somewhat_relevant';
    valuePropositionCommunicated: boolean;
    // Close
    nextStepsDefined: 'clear' | 'unclear' | 'not_defined';
    objectionHandling: 'effective' | 'ineffective' | 'not_applicable';
    // Overall
    callControl: 'strong' | 'weak' | 'moderate';
    listeningSkills: 'strong' | 'weak' | 'moderate';
    confidence: 'high' | 'low' | 'moderate';
    // AI Analysis
    analysis?: ScorecardAnalysis;
}


export interface Lead {
  id: string
  entityId: string
  companyName: string
  status: LeadStatus
  statusReason?: string;
  avatarUrl?: string
  profile: string // This will be the text used for AI prompts
  activity?: Activity[]
  notes?: Note[]
  contacts?: Contact[]
  contactCount?: number
  address?: Address
  franchisee?: string
  websiteUrl?: string
  industryCategory?: string
  industrySubCategory?: string
  salesRepAssigned?: string
  dialerAssigned?: string
  campaign?: string
  customerServiceEmail?: string
  customerPhone?: string
  aiScore?: number;
  aiReason?: string;
  salesRecordInternalId?: string;
  scorecards?: Scorecard[];
}

export interface UserProfile {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    aircallUserId?: string;
    role?: 'user' | 'admin';
}
