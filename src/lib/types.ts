

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
  | 'Pre Qualified'

export type ReviewCategory = 'Good Example' | 'Coaching Opportunity' | 'Needs Improvement';

export interface Review {
  id: string;
  reviewer: string;
  date: string;
  notes: string;
  category?: ReviewCategory;
}

export interface Activity {
  id: string
  type: 'Call' | 'Email' | 'Meeting' | 'Update'
  date: string
  duration?: string // e.g., "5m 32s"
  notes: string
  callId?: string
  author?: string
  review?: Review;
  isReviewed?: boolean;
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

export interface Appointment {
  id: string;
  duedate: string;
  starttime: string;
  assignedTo: string;
  appointmentDate?: string;
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
  address1?: string; // For Suite/Level/Unit
  street: string
  city: string
  state: string
  zip: string
  country: string
}

export interface DiscoveryData {
    postOfficeRelationship?: 'Yes-Driver' | 'Yes-Post Office walk up' | 'No';
    logisticsSetup?: 'Drop-off' | 'Routine collection' | 'Ad-hoc';
    servicePayment?: 'Yes' | 'No';
    shippingVolume?: '<5' | '<20' | '20-100' | '100+';
    expressVsStandard?: 'Mostly Standard (>=80%)' | 'Balanced Mix (20-79% Express)' | 'Mostly Express (>=80%)';
    packageType?: Array<string>;
    currentProvider?: Array<string>;
    otherProvider?: string;
    eCommerceTech?: Array<string>;
    otherECommerceTech?: string;
    sameDayCourier?: 'Yes' | 'Occasional' | 'Never';
    decisionMaker?: 'Owner' | 'Influencer' | 'Gatekeeper';
    painPoints?: string;
    score?: number;
    routingTag?: string;
    scoringReason?: string;
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
  salesRepAssignedCalendlyLink?: string
  dialerAssigned?: string
  campaign?: string
  customerServiceEmail?: string
  customerPhone?: string
  aiScore?: number;
  aiReason?: string;
  salesRecordInternalId?: string;
  discoveryData?: DiscoveryData;
  companyDescription?: string;
}

export interface UserProfile {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    phoneNumber: string;
    aircallUserId?: string;
    role?: 'user' | 'admin';
}

    

    

    
