

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
