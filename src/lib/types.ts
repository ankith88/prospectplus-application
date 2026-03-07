
export type LeadStatus =
  | 'New'
  | 'Priority Lead'
  | 'Contacted'
  | 'In Progress'
  | 'Connected'
  | 'High Touch'
  | 'Trialing ShipMate'
  | 'Reschedule'
  | 'Qualified'
  | 'Pre Qualified'
  | 'Won'
  | 'Lost'
  | 'Lost Customer'
  | 'LPO Review'
  | 'Unqualified'
  | 'LocalMile Pending'
  | 'Free Trial'
  | 'Prospect Opportunity'
  | 'Customer Opportunity'
  | 'Priority Field Lead'
  | 'Email Brush Off'
  | 'In Qualification'


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
  leadId: string;
  dialerAssigned?: string;
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
  discoverySignals?: string[];
  inconvenience?: 'Very inconvenient' | 'Somewhat inconvenient' | 'Not a big issue';
  occurrence?: 'Daily' | 'Weekly' | 'Ad-hoc';
  recurring?: 'Yes - predictable' | 'Sometimes' | 'One-off';
  taskOwner?: 'Shared admin responsibility' | 'Dedicated staff role' | 'Ad-hoc / whoever is free';
  businessType?: 'Retail' | 'B2B';
  personSpokenWithName?: string;
  personSpokenWithTitle?: string;
  personSpokenWithEmail?: string;
  personSpokenWithPhone?: string;
  personSpokenWithTags?: string[];
  decisionMakerName?: string;
  decisionMakerTitle?: string;
  decisionMakerEmail?: string;
  decisionMakerPhone?: string;

  lostPropertyProcess?: string;
  dashbackOpportunity?: string;

  score?: number;
  routingTag?: string;
  scoringReason?: string;
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

export interface VisitNoteAnalysis {
  companyName?: string;
  address?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  outcome?: string;
  actionItems?: string[];
}

export interface VisitNote {
  id: string;
  content: string;
  capturedBy: string;
  capturedByUid: string;
  createdAt: string;
  status: 'New' | 'In Progress' | 'Converted' | 'Rejected';
  leadId?: string; // ID of the lead created from this note
  googlePlaceId?: string;
  companyName?: string;
  address?: Address;
  outcome?: {
    type: string;
    details: Record<string, any>;
  };
  analyzedData?: VisitNoteAnalysis;
  imageUrls?: string[];
  websiteUrl?: string;
  discoveryData?: Partial<DiscoveryData>;
  franchisee?: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface UserProfile {
  uid: string
  email: string
  firstName?: string
  lastName?: string
  displayName?: string
  role?: 'user' | 'admin' | 'Field Sales' | 'Field Sales Admin' | 'Lead Gen' | 'Lead Gen Admin' | 'Franchisee'
  phoneNumber?: string
  aircallUserId?: string
  disabled?: boolean
  linkedSalesRep?: string
  linkedBDR?: string
  franchisee?: string
}

export interface Upsell {
  id: string;
  companyId: string;
  companyName: string;
  repName: string;
  repUid: string;
  date: string;
  notes?: string;
}

export interface Lead {
  id: string
  entityId?: string
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
  discoveryData?: DiscoveryData;
  contactCount?: number
  address?: Address
  latitude?: number;
  longitude?: number;
  franchisee?: string;
  websiteUrl?: string;
  industryCategory?: string
  industrySubCategory?: string
  salesRepAssigned?: string
  salesRepAssignedCalendlyLink?: string;
  dialerAssigned?: string
  campaign?: string
  customerServiceEmail?: string
  customerPhone?: string
  abn?: string;
  aiScore?: number;
  aiReason?: string;
  salesRecordInternalId?: string;
  companyDescription?: string;
  leadType?: string;
  demoCompleted?: 'Yes';
  fieldSales?: boolean;
  initialNotes?: string;
  lastProspected?: string;
  dateLeadEntered?: string;
  customerSource?: string;
  visitNoteID?: string;
  cancellationTheme?: string;
  cancellationCategory?: string;
  cancellationReason?: string;
  cancellationdate?: string;
}

export type MapLead = Pick<Lead, 'id' | 'companyName' | 'status' | 'address' | 'latitude' | 'longitude' | 'dialerAssigned' | 'fieldSales' | 'lastProspected' | 'industryCategory' | 'websiteUrl' | 'visitNoteID' | 'franchisee'> & { isCompany: boolean; isProspect?: boolean };

export interface StorableRoute {
  id?: string;
  userId: string;
  userName?: string;
  name: string;
  createdAt: string;
  leads: { id: string; companyName: string; latitude: number; longitude: number; address: Address; }[];
  travelMode: google.maps.TravelMode;
  startPoint?: string;
  endPoint?: string;
  directions?: string; // JSON.stringified google.maps.DirectionsResult
  scheduledDate?: string;
  totalDistance?: string | null;
  totalDuration?: string | null;
  isProspectingArea?: boolean;
  isUnassigned?: boolean;
  notes?: string;
  streets?: { place_id: string; description: string; latitude: number; longitude: number; }[];
  shape?: {
    type: 'rectangle' | 'polygon';
    bounds?: google.maps.LatLngBoundsLiteral;
    paths?: google.maps.LatLngLiteral[][];
  };
  status?: 'Active' | 'Completed' | 'Pending Approval' | 'Approved' | 'Reviewed';
  imageUrls?: string[];
}

export type SavedRoute = Omit<StorableRoute, 'directions'> & {
  directions: google.maps.DirectionsResult | null;
  userName: string;
};
