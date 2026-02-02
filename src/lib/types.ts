
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
  | 'Trialing ShipMate'
  | 'Reschedule'
  | 'Priority Lead'
  | 'Priority Field Lead'
  | 'LocalMile Pending'
  | 'Free Trial'

export type ReviewCategory = 'Good Example' | 'Coaching Opportunity' | 'Needs Improvement';

export interface CheckinQuestion {
  question: string;
  answer: string | string[];
}

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
  syncedWithNetSuite?: boolean;
}

export interface Note {
    id: string;
    date: string;
    author: string;
    content: string;
    syncedWithNetSuite?: boolean;
}

export interface Task {
    id: string;
    title: string;
    dueDate: string;
    isCompleted: boolean;
    createdAt: string;
    completedAt?: string;
    author: string;
    dialerAssigned?: string;
}

export type AppointmentStatus = 'Completed' | 'Cancelled' | 'No Show' | 'Rescheduled';
export interface Appointment {
  id: string;
  duedate: string;
  starttime: string;
  assignedTo: string;
  appointmentDate?: string;
  appointmentStatus?: AppointmentStatus;
  revisit?: boolean;
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
  syncedWithNetSuite?: boolean;
  accessToLocalMile?: 'yes' | 'no';
  accessToShipMate?: 'yes' | 'no';
  sendEmail?: 'yes' | 'no';
}

export interface Address {
  address1?: string; // For Suite/Level/Unit
  street: string
  city: string
  state: string
  zip: string
  country: string
  lat?: number;
  lng?: number;
}

export interface DiscoveryData {
    relevanceCheck?: 'Yes' | 'No';
    reasonsToLeave?: string[];
    postOfficeRelationship?: 'Yes-Driver' | 'Yes-Post Office walk up' | 'No';
    logisticsSetup?: 'Drop-off' | 'Routine collection' | 'Ad-hoc';
    servicePayment?: 'Yes' | 'No';
    shippingVolume?: '<5' | '<20' | '20-100' | '100+';
    expressVsStandard?: 'Mostly Standard (>=80%)' | 'Balanced Mix (20-79% Express)', 'Mostly Express (>=80%)';
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
    checkInCompleted?: boolean;
    searchKeywords?: string[];
}

export interface Invoice {
    id: string;
    documentId: string;
    invoiceDocumentID?: string;
    invoiceDate?: string;
    invoiceTotal: number;
    invoiceType: string;
    invoiceURL?: string;
}

export interface ServiceSelection {
    name: 'Outgoing Mail Lodgement' | 'Express Banking';
    frequency: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] | 'Adhoc';
    rate?: number;
    trialStartDate?: string;
    trialEndDate?: string;
    startDate?: string;
}

export interface Lead {
  id: string
  entityId: string
  companyName: string
  status: LeadStatus
  statusReason?: string;
  avatarUrl?: string
  profile: string
  activity?: Activity[]
  notes?: Note[]
  contacts?: Contact[]
  transcripts?: Transcript[]
  tasks?: Task[]
  appointments?: Appointment[]
  invoices?: Invoice[]
  services?: ServiceSelection[];
  checkinQuestions?: CheckinQuestion[];
  checkinScore?: number;
  checkinScoringReason?: string;
  checkinRoutingTag?: string;
  contactCount?: number
  address?: Address
  latitude?: number;
  longitude?: number;
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
  abn?: string;
  aiScore?: number;
  aiReason?: string;
  salesRecordInternalId?: string;
  discoveryData?: DiscoveryData;
  companyDescription?: string;
  leadType?: string;
  demoCompleted?: 'Yes';
  fieldSales?: boolean;
  initialNotes?: string;
  lastProspected?: string;
  dateLeadEntered?: string;
  customerSource?: string;
}

export interface UserProfile {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    phoneNumber: string;
    aircallUserId?: string;
    role?: 'user' | 'admin' | 'Field Sales' | 'Field Sales Admin' | 'Lead Gen' | 'Lead Gen Admin';
    disabled?: boolean;
}

export type MapLead = Pick<Lead, 'id' | 'companyName' | 'status' | 'address' | 'franchisee' | 'industryCategory' | 'latitude' | 'longitude' | 'websiteUrl' | 'discoveryData' | 'dialerAssigned' | 'customerPhone' | 'fieldSales' | 'lastProspected'> & { isProspect?: boolean, isCompany?: boolean };

export type StorableRoute = {
    id?: string;
    name: string;
    createdAt: string;
    leads: { id: string, latitude: number, longitude: number, companyName: string, address: Address }[];
    travelMode: google.maps.TravelMode;
    startPoint?: string;
    endPoint?: string;
    directions?: string;
    scheduledDate?: string;
    totalDistance?: string | null;
    totalDuration?: string | null;
};


export type SavedRoute = Omit<StorableRoute, 'directions'> & {
    directions: google.maps.DirectionsResult | null;
    scheduledDate?: string | Date;
};
