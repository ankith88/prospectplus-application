export type LeadBucket = 'outbound' | 'field_sales' | 'inbound' | 'account_manager' | 'customer_success' | 'nurture' | 'marketing';

export interface BucketHistory {
  id: string;
  oldBucket: string;
  newBucket: string;
  date: string;
  author: string;
}

export interface InboundDetails {
  formId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  submittedAt: string; // ISO date string
  referrer?: string;
  landingPage?: string;
  ipAddress?: string;
  userAgent?: string;
}

export type LeadStatus =
  | 'New'
  | 'Hot Lead'
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
  | 'LocalMile Opportunity'
  | 'Trialing LocalMile'
  | 'Free Trial'
  | 'Prospect Opportunity'
  | 'Customer Opportunity'
  | 'Priority Field Lead'
  | 'Email Brush Off'
  | 'In Qualification'
  | 'Quote Sent'
  | 'Out of Territory'


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

export interface EmailRecord {
  id: string;
  subject: string;
  bodyHtml: string;
  sentAt: string;
  sender: string;
  recipient: string;
  status: string;
  campaignId?: string;
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

export type AppointmentStatus = 'Completed' | 'Cancelled' | 'No Show' | 'Rescheduled' | 'Pending';
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
  timezone?: string;
  date?: string;
  amId?: string;
  amName?: string;
  type?: string;
  eventId?: string;
  joinUrl?: string;
  createdAt?: string;
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
  localMilePlusAuthLink?: string;
  securityCode?: string;
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

export interface DiscoveryAnswer {
  question: string;
  answer: string;
  pathway?: string;
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

  postOfficeRelationship?: string;
  logisticsSetup?: string;
  shippingVolume?: string;
  expressVsStandard?: string;
  packageType?: string[];
  currentProvider?: string[];
  eCommerceTech?: string[];
  sameDayCourier?: string;
  painPoints?: string;
  managementPathway?: 'self_managed' | 'aus_post_managed' | 'no_aus_post_usage' | null;
  discoveryAnswers?: DiscoveryAnswer[];
  lostPropertyProcess?: 'Staff organise returns manually' | 'Guests contact us to arrange shipping' | 'Rarely happens / informal process' | 'Already use a return platform';
  score?: number;
  routingTag?: string;
  scoringReason?: string;
  searchKeywords?: string[];
  interestedIn?: string;
  weeklyParcels?: string;
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

export interface ScfRecord {
    id: string;
    leadId: string;
    contactId: string;
    services: ServiceSelection[];
    startDate: string;
    status: 'Pending' | 'Accepted';
    createdAt: string;
    acceptedAt?: string;
    url: string;
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
  capturedTimezone?: string;
}

export type UserRole = 'user' | 'admin' | 'Field Sales' | 'Field Sales Admin' | 'Lead Gen' | 'Lead Gen Admin' | 'Franchisee' | 'Sales Manager' | 'Dashback' | 'Account Managers' | 'Account Manager' | 'account managers' | 'dialers' | 'Dialer' | 'Marketing Admin' | 'Marketing Manager' | 'Customer Success' | 'Customer Service' | 'super user';

export interface UserProfile {
  uid: string
  email: string
  firstName?: string
  lastName?: string
  displayName?: string
  assignedRoles?: UserRole[]
  defaultRole?: UserRole
  activeRole?: UserRole
  role?: UserRole // Deprecated, to be removed entirely once migration is complete across codebase. Keeping temporarily to prevent TS errors in unmodified files.
  phoneNumber?: string
  aircallUserId?: string
  disabled?: boolean
  linkedSalesRep?: string
  linkedBDR?: string
  franchisee?: string
  currentLocation?: { lat: number; lng: number }
  activeRoute?: string[] // IDs of active StorableRoutes
  userOnboardingStates?: Record<string, boolean>
  leaveProfile?: {
    isOnLeave: boolean;
    backupAmName?: string;
    stopAssignment: boolean;
    startDate?: string;
    endDate?: string;
  };
  microsoftAccessToken?: string;
  microsoftRefreshToken?: string;
  microsoftTokenExpiresAt?: number;
  workingHours?: {
    [dayOfWeek: string]: { start: string; end: string; enabled: boolean };
  };
  meetingBufferMinutes?: number;
  meetingSubjectTemplate?: string;
  defaultMeetingDurationMinutes?: number;
  minimumBookingNoticeHours?: number;
  defaultMeetingType?: 'phone' | 'teams';
  timezone?: string;
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

export interface DailyDeployment {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  area: string;
  startTime: string;
  createdAt: string;
}

export interface DaySchedule {
  day: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export interface FieldSalesSchedule {
  id: string;
  userId: string;
  userName: string;
  workingDays: string[]; // Deprecated but kept for backward compatibility/API
  startTime: string;    // Deprecated but kept for backward compatibility/API
  endTime: string;      // Deprecated but kept for backward compatibility/API
  daySchedules: DaySchedule[]; // New granular structure
  updatedAt: string;
  weekStarting: string; // ISO date string (YYYY-MM-DD) for the Monday of that week
  notes?: string;
}

export interface Lead {
  id: string
  entityId?: string
  companyName: string
  status: LeadStatus
  statusReason?: string
  avatarUrl?: string
  profile: string
  activity?: Activity[]
  emails?: EmailRecord[]
  notes?: Note[]
  contacts?: Contact[]
  transcripts?: Transcript[]
  tasks?: Task[]
  appointments?: Appointment[]
  invoices?: Invoice[]
  services?: ServiceSelection[];
  scfLinks?: { id: string; url: string; createdAt: string; status: 'Pending' | 'Accepted'; acceptedAt?: string }[];
  checkinQuestions?: CheckinQuestion[];
  discoveryData?: DiscoveryData;
  contactCount?: number
  address?: Address
  latitude?: number;
  longitude?: number;
  franchisee?: string;
  franchisee_id?: string;
  websiteUrl?: string;
  industryCategory?: string
  industrySubCategory?: string
  salesRepAssigned?: string
  salesRepAssignedCalendlyLink?: string;
  dialerAssigned?: string
  fieldRepAssigned?: string
  accountManagerAssigned?: string
  campaign?: string
  customerServiceEmail?: string
  customerPhone?: string
  abn?: string;
  aiScore?: number;
  aiReason?: string;
  salesRecordInternalId?: string;
  commRegId?: string;
  companyDescription?: string;
  leadType?: 'Product' | 'Service' | 'Service & Product' | string;
  multiSiteLocations?: Address[];
  parentLeadId?: string;
  demoCompleted?: 'Yes';
  fieldSales?: boolean;
  serviceType?: string;
  rate?: number;
  initialNotes?: string;
  lastProspected?: string;
  dateLeadEntered?: string;
  customerSource?: string;
  visitNoteID?: string;
  cancellationTheme?: string;
  cancellationCategory?: string;
  cancellationReason?: string;
  cancellationdate?: string;
  customerStatus?: string;
  netsuiteLeadStatus?: string;
  bucket?: LeadBucket;
  inboundDetails?: InboundDetails;
  isDuplicate?: boolean;
  similarLeads?: string[];
  geofenceRadius?: number;
  velocityScore?: number;
  lastAutomatedProgression?: string;
  behavioralScore?: number;
  demographicScore?: number;
  totalScore?: number;
  customerSuccessAssigned?: string;
  activeJourneys?: string[];
  hasMyPostBusinessAccount?: 'Yes' | 'No';
  nextBestAction?: string;
  marketingLists?: string[];
  localMileTrialsRemaining?: number;
  lastLocalMileJobCreatedAt?: string;
  localMileNudgeCount?: number;
  lastLocalMileNudgeSentAt?: string;
  localMileTnCAcceptedAt?: string;
  localMileTermsAccepted?: boolean | string;
  localMileTermsAcceptedAt?: string;
  hasCreatedJob?: boolean;
  firstJobCreatedAt?: string;
  jobCount?: number;
  potentialFranchisees?: string[];
  bucketHistory?: BucketHistory[];
  companyInsights?: CompanyInsight[];
  postalAddress?: Address;
  csCalled?: boolean;
  lastContactedDate?: string;
  bookingUrlId?: string;
  bookingContactId?: string;
  csCallCount?: number;
  sofDetails?: {
    signatureDataUrl: string;
    position: string;
    date: string;
    signedAt: string;
  };
  providedShipMateOnboarding?: boolean;
}

export interface CompanyInsight {
  id: string;
  companyName?: string;
  industry?: string;
  productsServices?: string;
  targetAudience?: string;
  valueProposition?: string;
  shippingLogisticsNeeds?: string;
  talkingPoints?: string[];
  rawSummary?: string;
  extractedEmails?: string[];
  extractedPhones?: string[];
  scannedAt: string;
}


export interface VisitEvent {
  id: string;
  leadId: string;
  userId: string;
  timestamp: string;
  eventType: 'check-in' | 'check-out';
  coordinates: { lat: number; lng: number };
}

export interface Playbook {
  id: string;
  stage: LeadStatus;
  script: string;
  mandatoryFields: string[];
  resources: { title: string; url: string }[];
}

export interface JourneyNode {
  id: string;
  type: 'trigger' | 'action' | 'wait' | 'condition';
  config: Record<string, any>;
}

export interface JourneyEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface Journey {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused';
  nodes: JourneyNode[];
  edges: JourneyEdge[];
}

export interface InteractionLog {
  id: string;
  leadId: string;
  type: 'email-open' | 'email-click' | 'website-visit';
  timestamp: string;
  metadata: Record<string, any>;
}

export type MapLead = Pick<Lead, 'id' | 'companyName' | 'status' | 'address' | 'latitude' | 'longitude' | 'dialerAssigned' | 'fieldSales' | 'lastProspected' | 'industryCategory' | 'websiteUrl' | 'visitNoteID' | 'franchisee' | 'customerServiceEmail' | 'customerPhone' | 'accountManagerAssigned'> & { isCompany: boolean; isProspect?: boolean };

export interface SuburbMapping {
  suburbs: string;       // Upper-case suburb text (e.g., "ACACIA RIDGE")
  post_code: string;     // Postal string code identifier (e.g., "4110")
  state: string;         // State abbreviation code (e.g., "QLD")
  primary_op: string[];  // Array of parsed operation identification IDs
  secondary_op: string;  // Fallback operator string parameter index 
  next_day: boolean | null; // Operational routing delivery flag mapping
  parent_lpo_id?: string; // Optional field mapping tracking if present inside LPO data maps
  lat?: number;
  lng?: number;
}

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

export interface SuburbMapping {
  suburbs: string;       // Upper-case suburb text (e.g., "ACACIA RIDGE")
  post_code: string;     // Postal string code identifier (e.g., "4110")
  state: string;         // State abbreviation code (e.g., "QLD")
  primary_op: string[];  // Array of parsed operation identification IDs
  secondary_op: string;  // Fallback operator string parameter index 
  next_day: boolean | null; // Operational routing delivery flag mapping
  parent_lpo_id?: string; // Optional field mapping tracking if present inside LPO data maps
}

export interface PartnerLocation {
  internalId: string;
  name: string;
  address1?: string;
  address2?: string;
  state: string;
  suburb: string;
  postCode: string;
  phone?: string;
  siteAccessCode?: string;
  locationType: string;
  updatedAt: string;
}

export interface Franchisee {
  internalId: string;
  name: string;
  mainContact: string;
  email: string;
  mobile: string;
  isCompanyOwned: boolean;
  commissionRate: number;
  salesRepAssigned: string;
  activeProjects: string[];
  mpExpressActivated: boolean;
  territoryRaw: string;
  territoryJson: SuburbMapping[];
  mpStarTrackActivated: boolean;
  starTrackSuburbRaw: string;
  starTrackSuburbsJson: SuburbMapping[];
  ausPostSuburbsRaw: string;
  ausPostSuburbsJson: SuburbMapping[];
  campaignPriorities?: { campaign: string; priority: 'High' | 'Medium' | 'Low' }[];
  nominatedPostOffice?: string;
  nominatedPostOfficeText?: string;
}

export interface Operator {
  internalId: string;
  mainFranchiseeId: string;
  linkedFranchiseeIds: string[];
  title: string;
  givenNames: string;
  surname: string;
  contactPhone: string;
  contactEmail: string;
  operatorStatus: string;
  employment: string;
}

export interface BrandProfile {
  id: string;
  updatedAt: string; // ISO Timestamp
  updatedBy: string; // User UID
  
  // 1. Initial Wizard Core Strategy Inputs
  strategy: {
    positioning: string;      // Core value proposition mapping
    brandMessaging: string;   // Central brand messaging framework
    offers: string[];         // Key business deliverables array
    icps: Array<{             // Array of Ideal Customer Profiles
      targetIndustry: string;
      companySize: string;
      painPoints: string[];
      valueProposition: string;
    }>;
  };
  
  // 2. Voice Guidelines & Style Examples
  voice: {
    toneKeywords: string[];         // e.g., ["Professional", "Urgent"]
    soundsLikeUsExamples: string[]; // "This sounds like us" example snippets
  };
  
  // 3. Centralized Corporate Design Tokens
  designTokens: {
    primaryColor: string; // Hex string mapping ProspectPlus (#095c7b)
    accentColor: string;  // Hex string mapping Accent (#eaf143)
    fontFamily: string;   // Typography rule mapping "Inter, sans-serif"
    logoUrl?: string;     // URL for the company logo asset
  };
  
  // 4. "Marketing Brain" Continuous Learning Layer
  marketingBrainContext: {
    topPerformingKeywords: string[];
    learnedBehaviorModifiers: string; // Aggregated text insights from historical data
    lastAnalysisTimestamp: string;
  };
}

export interface CancellationRequest {
  id: string;
  leadId: string;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  requestedDate: string; // ISO String (date of request submission)
  cancellationDate: string; // ISO String (requested stop date)
  trueServiceCancellationDate: string; // ISO String (actual date services stop)
  cancellationReason: string; // 'Price' | 'Competitor' | 'Service Quality' | 'No Longer Needed' | 'Business Closed' | 'Other'
  status: 'Pending' | 'Saved' | 'Cancelled';
  saveStrategy?: 'Keep Existing' | 'Change Frequency & Price' | 'Keep Frequency Update Price' | 'Remove Service';
  originalServices: ServiceSelection[];
  updatedServices?: ServiceSelection[];
  notes?: string;
  processedBy?: string;
  processedAt?: string;
}

