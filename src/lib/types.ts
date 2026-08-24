export type LeadBucket = 'outbound' | 'field_sales' | 'inbound' | 'account_manager' | 'customer_success' | 'nurture' | 'marketing' | 'lpo_plus' | 'lpo_network' | 'in_review' | 'multisite' | '' | 'blank' | 'unassigned' | (string & {});

export interface BucketHistory {
  id: string;
  oldBucket: string;
  newBucket: string;
  date: string;
  author: string;
}

export interface StatusHistory {
  id: string;
  oldStatus?: string;
  newStatus: string;
  date: string;
  author?: string;
}

export interface InboundDetails {
  formId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  adClickId?: string;
  channel?: string;
  posthogDistinctId?: string;
  posthogSessionId?: string;
  posthogSessionUrl?: string;
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
  | 'Appointment Booked'
  | 'Pre Qualified'
  | 'Won'
  | 'Lost'
  | 'Lost Customer'
  | 'LPO Review'
  | 'LPO Opportunity'
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
  | 'Quote Accepted'
  | 'Out of Territory'
  | 'Future Follow-up'
  | 'No Answer'
  | 'Address Check'
  | 'Address Confirmed'
  | 'LocalMile Trial Stopped'
  | 'ShipMate Trial Stopped'


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
  leadId?: string
  type: 'Call' | 'Email' | 'Meeting' | 'Update'
  date: string
  duration?: string // e.g., "5m 32s"
  notes: string
  callId?: string
  author?: string
  email?: string
  review?: Review;
  isReviewed?: boolean;
  syncedWithNetSuite?: boolean;
  aircallStatus?: string;
  recordingUrl?: string;
  recordingAssetUrl?: string;
  event?: string;
  isCustomerSuccess?: boolean;
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
    outlookEventId?: string;
    durationMinutes?: number;
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
  prospectPlusId?: string;
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

export type EmailVerificationStatus = 'deliverable' | 'risky' | 'undeliverable' | 'unknown';

export interface EmailVerificationResult {
  email: string;
  status: EmailVerificationStatus;
  score: number; // 0 - 100
  reason?: string;
  verifiedAt: string;
  cached?: boolean;
  details?: {
    regexp?: boolean;
    gibberish?: boolean;
    disposable?: boolean;
    webmail?: boolean;
    mxRecords?: boolean;
    smtpCheck?: boolean;
    acceptAll?: boolean;
  };
}

export interface Contact {
  id: string
  name: string
  firstName?: string
  lastName?: string
  title: string
  email: string
  phone: string
  syncedWithNetSuite?: boolean;
  accessToLocalMile?: 'yes' | 'no';
  accessToShipMate?: 'yes' | 'no';
  sendEmail?: 'yes' | 'no';
  localMilePlusAuthLink?: string;
  securityCode?: string;
  isPrimary?: boolean;
  isAccountsPayable?: boolean;
  verificationStatus?: EmailVerificationStatus;
  verificationScore?: number;
  verifiedAt?: string;
  accountActivated?: boolean;
  createPasswordEmailSent?: boolean;
  shipmateStatus?: 'Activated' | 'Password Sent' | 'No Access';
  shipmateCheckedAt?: string;
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
  partnerLocationId?: string;
  partnerLocationName?: string;
}

export interface TaggedAddress extends Address {
  id?: string;
  tag: string;
  createdAt?: string;
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

  // Enrichment fields (Columns BR - BZ)
  lodgementEvidence?: string;
  shipperEvidence?: string;
  shopifyDetected?: string;
  prospectSummary?: string;
  xeroDetected?: string;
  apRelationship?: string;
  suggestedProduct?: string;
  suggestedOpener?: string;
  suggestedPersonalisation?: string;
}

export interface InvoiceItem {
    service: string;
    rate: number;
    qty: number;
    totalAmount: number;
}

export interface Invoice {
    id?: string;
    documentId?: string;
    invoiceDocumentID?: string;
    invoiceInternalID?: string;
    invoiceDate?: string;
    invoiceTotal: number | string;
    invoiceType: string;
    invoiceURL?: string;
    invoiceStatus?: string;
    status?: string;
    syncedWithNetSuite?: boolean;
    items?: InvoiceItem[];
}

export interface ServiceSelection {
    id?: string;
    name: string;
    frequency: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] | 'Adhoc' | string;
    rate?: number;
    quantity?: number;
    trialStartDate?: string;
    trialEndDate?: string;
    startDate?: string;
}

export interface ScfRecord {
    id: string;
    leadId: string;
    contactId: string;
    services: ServiceSelection[];
    products?: any[];
    startDate: string;
    status: 'Pending' | 'Accepted' | 'Cancelled' | 'Signed' | 'Quote Accepted';
    createdAt: string;
    updatedAt?: string;
    createdBy?: string;
    createdByName?: string;
    createdByEmail?: string;
    createdByUid?: string;
    acceptedAt?: string;
    signedAt?: string;
    url: string;
    uploadedPdfUrl?: string;
    uploadedPdfName?: string;
    uploadedPdfAt?: string;
    uploadedPdfBy?: string;
    bankLocationId?: string;
    bankLocationName?: string;
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

export type UserRole = 'user' | 'Outbound Admin' | 'admin' | 'Field Sales' | 'Field Sales Admin' | 'Lead Gen' | 'Lead Gen Admin' | 'Franchisee' | 'Sales Manager' | 'Dashback' | 'Account Managers' | 'Account Manager' | 'account managers' | 'dialers' | 'Dialer' | 'Marketing Manager' | 'Customer Success' | 'Customer Service' | 'super user' | 'Operations' | 'Finance' | 'Finanace Manager' | 'Finance Manager' | 'Data Admin';

export interface UserProfile {
  uid: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  displayName?: string
  assignedRoles?: UserRole[]
  defaultRole?: UserRole
  activeRole?: UserRole
  role?: UserRole // Deprecated, to be removed entirely once migration is complete across codebase. Keeping temporarily to prevent TS errors in unmodified files.
  phoneNumber?: string
  mobileNumber?: string
  aircallPhoneNumber?: string
  aircallUserId?: string
  salesRepId?: string
  accountManagerId?: string
  netsuiteId?: string
  disabled?: boolean
  linkedSalesRep?: string
  linkedBDR?: string
  franchisee?: string
  franchiseeId?: string
  franchiseeInternalId?: string
  linkedFranchiseeIds?: string[]
  historicalFranchiseeIds?: string[]
  currentLocation?: { lat: number; lng: number }
  activeRoute?: string[] // IDs of active StorableRoutes
  pinnedNav?: string[]
  pinnedPaths?: string[]
  userOnboardingStates?: Record<string, boolean>
  accessibleSharedMailboxes?: string[]
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
  sidebarAlwaysOpen?: boolean;
  adminApprovalStatus?: 'pending' | 'approved' | 'rejected';
  pendingAdminRequestId?: string;
  franchiseeRole?: 'owner' | 'investor';
  personalEmail?: string;
  abn?: string;
  addressDetails?: {
    street?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    fullAddress?: string;
  };
  bankDetails?: {
    bsb?: string;
    accountNumber?: string;
    accountName?: string;
  };
  linkedFranchisees?: Array<{
    franchiseeId: string;
    franchiseeName: string;
    relationship: 'owner' | 'investor';
    isDefault?: boolean;
  }>;
  activeFranchiseeId?: string;
}

export interface AdminApprovalRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  requestedRole: 'admin';
  requestedByUid: string;
  requestedByName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  actionedByUid?: string;
  actionedByName?: string;
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
  internalid?: string
  internalId?: string
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
  lastSelectionType?: 'services' | 'products' | 'both' | null;
  checkinQuestions?: CheckinQuestion[];
  discoveryData?: DiscoveryData;
  contactCount?: number
  address?: Address
  state?: string;
  street?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  lpoPlusStatus?: string;
  lpoPlusProvisionedAt?: string;
  lpoPlusPasswordResetAt?: string;
  defaultPassword?: string;
  franchisee?: string;
  franchisee_id?: string;
  websiteUrl?: string;
  inboundPageUrl?: string;
  pageURL?: string;
  interestedIn?: string;
  industryCategory?: string
  industrySubCategory?: string
  salesRepAssigned?: string
  salesRepAssignedCalendlyLink?: string;
  dialerAssigned?: string
  fieldRepAssigned?: string
  accountManagerAssigned?: string
  campaign?: string
  weeklyParcels?: string;
  customerServiceEmail?: string
  customerPhone?: string
  abn?: string;
  city?: string;
  dynamicScfUrl?: string;
  standingOrderFormLink?: string;
  localMileRegistrationLink?: string;
  localMileActivationLink?: string;
  aiScore?: number;
  aiReason?: string;
  salesRecordInternalId?: string;
  commRegId?: string;
  companyDescription?: string;
  wasOutbound?: boolean;
  wasInbound?: boolean;
  originalBucket?: string;
  assignedToDialerAt?: string;
  leadType?: 'Product' | 'Service' | 'Service & Product' | string;
  multiSiteLocations?: Address[];
  additionalAddresses?: TaggedAddress[];
  bankLocationId?: string;
  bankLocationName?: string;
  partnerLocationId?: string;
  partnerLocationName?: string;
  bankLocation?: any;
  partnerLocation?: any;
  parentLeadId?: string;
  isParentLead?: boolean;
  isChildLead?: boolean;
  isLpoLead?: boolean;
  lpoLeadId?: string;
  linkedLpoLeadId?: string;
  lpoLeadName?: string;
  lpoName?: string;
  createdParentLeadId?: string;
  createdChildLeadIds?: string[];
  source?: string;
  ampoRate?: number;
  pmpoRate?: number;
  packageRate?: number;
  additionalBagRate?: number;
  servicesAndRates?: any;
  demoCompleted?: 'Yes';
  fieldSales?: boolean;
  serviceType?: string;
  selectedServiceOption?: string;
  rate?: number;
  initialNotes?: string;
  lastProspected?: string;
  dateLeadEntered?: string;
  dateRegistrationSent?: string;
  registrationSentAt?: string;
  localMileRegistrationSentAt?: string;
  dateLocalmileAccepted?: string;
  localMileAcceptedAt?: string;
  customerSource?: string;
  visitNoteID?: string;
  syncedWithNetSuite?: boolean;
  netSuiteSyncStatus?: 'synced' | 'failed' | 'pending' | string;
  netSuiteSyncError?: string | null;
  netSuiteSyncAttemptCount?: number;
  cancellationTheme?: string;
  cancellationThemeId?: string;
  cancellationCategory?: string;
  cancellationWhyId?: string;
  cancellationReason?: string;
  cancellationReasonId?: string;
  cancellationdate?: string;
  customerStatus?: string;
  cancellationRequested?: boolean;
  serviceChangeRequested?: boolean;
  lastServiceChangeRequestDate?: string;
  netsuiteLeadStatus?: string;
  droppedOffBrochures?: boolean;
  hadConversationWithContact?: boolean;
  isPriority?: boolean;
  outsideTerritoryConfirmed?: boolean;
  franchiseeReviewPending?: boolean;
  isZeeCreated?: boolean;
  leadSource?: string;
  createdByRole?: string;
  createdByUid?: string;
  bucket?: LeadBucket;
  attemptCount?: number;
  totalCalls?: number;
  inboundDetails?: InboundDetails;
  attribution?: Record<string, any>;
  marketingChannel?: string;
  posthogSessionUrl?: string;
  isDuplicate?: boolean;
  ignoreDuplicateWarning?: boolean;
  similarLeads?: string[];
  duplicateConfidence?: 'High' | 'Medium' | 'Low' | 'None';
  duplicateMatchReasons?: string[];
  geofenceRadius?: number;
  velocityScore?: number;
  lastAutomatedProgression?: string;
  behavioralScore?: number;
  demographicScore?: number;
  totalScore?: number;
  customerSuccessAssigned?: string;
  activeJourneys?: string[];
  hasMyPostBusinessAccount?: 'Yes' | 'No';
  parcelVolumeGreaterThan20?: 'Yes' | 'No';
  currentCarrier?: string;
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
  statusHistory?: StatusHistory[];
  initialAppointmentBucket?: string;
  companyInsights?: CompanyInsight[];
  postalAddress?: Address;
  billingAddressType?: 'site' | 'postal' | 'custom' | string;
  billingAddress?: Address;
  csCalled?: boolean;
  lastContactedDate?: string;
  lastCsOutcome?: string;
  lastCsNotes?: string;
  lastCsAuthor?: string;
  lastCsContactedDate?: string;
  csOutcomeHistory?: Array<{
    outcome: string;
    notes?: string;
    author?: string;
    date: string;
    salesRecordInternalId?: string;
  }>;
  bookingUrlId?: string;
  bookingContactId?: string;
  generalBookingUrlId?: string;
  csCallCount?: number;
  sofLink?: string;
  sofDetails?: {
    signatureDataUrl: string;
    position: string;
    date: string;
    signedAt: string;
  };
  providedShipMateOnboarding?: boolean;
  followUpDate?: string;
  prospectPlusId?: string;
  chosenPremiumPlan?: string;
  chosenExpressPlan?: string;

  // Enrichment & AI Discovery fields (CSV Columns BR-BZ)
  lodgementEvidence?: string;
  shipperEvidence?: string;
  shopifyDetected?: string;
  prospectSummary?: string;
  xeroDetected?: string;
  apRelationship?: string;
  suggestedProduct?: string;
  suggestedOpener?: string;
  suggestedPersonalisation?: string;
  pricing_table?: PricingTableRow[];
  suburb_mapping?: LeadSuburbMapping[];
  quoteSentAt?: string;
  signedUpAt?: string;
  scfAcceptedAt?: string;
  trialStartedAt?: string;
  isFromCompaniesCollection?: boolean;
  snoozedUntil?: string;
  lpoPlusOpportunity?: boolean;
  scfs?: any[];
  isExported?: boolean;
  exportedAt?: string;
  exportedBy?: string;
  exportedToCompany?: string;
  exportBatchId?: string;
  exportHistory?: Array<{
    exportedAt: string;
    exportedBy: string;
    exportedToCompany: string;
    batchId: string;
  }>;
}

export interface LeadExportBatch {
  id: string;
  batchId: string;
  exportedToCompany: string;
  exportedBy: string;
  exportedByUid: string;
  leadCount: number;
  exportedAt: string;
  leadIds: string[];
  notes?: string;
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

export type MapLead = Pick<Lead, 'id' | 'companyName' | 'status' | 'address' | 'latitude' | 'longitude' | 'dialerAssigned' | 'fieldSales' | 'lastProspected' | 'industryCategory' | 'websiteUrl' | 'visitNoteID' | 'franchisee' | 'customerServiceEmail' | 'customerPhone' | 'accountManagerAssigned' | 'services' | 'bucket'> & { isCompany: boolean; isProspect?: boolean };

export interface SuburbMapping {
  suburbs: string;       // Upper-case suburb text (e.g., "ACACIA RIDGE")
  post_code: string;     // Postal string code identifier (e.g., "4110")
  state: string;         // State abbreviation code (e.g., "QLD")
  primary_op: string[];  // Array of parsed operation identification IDs
  secondary_op?: string | any[] | Record<string, any> | null;  // Fallback operator string or array/object mapping 
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
  secondary_op?: string | any[] | Record<string, any> | null;  // Fallback operator string or array/object mapping 
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

export interface FranchiseeAgreementRecord {
  id: string;
  fileName: string;
  storagePath?: string;
  downloadUrl?: string;
  uploadedAt: string;
  uploadedByUid?: string;
  uploadedByName?: string;
  extractedData?: {
    entityName?: string;
    acnAbn?: string;
    registeredAddress?: string;
    contactEmail?: string;
    guarantors?: Array<{ name?: string; address?: string; email?: string }>;
    manager?: { name?: string; address?: string; email?: string };
    businessName?: string;
    territoryName?: string;
    premisesAddress?: string;
    commencementDate?: string;
    expiryDate?: string;
    termDuration?: string;
    renewalTerms?: string;
    depositAmount?: number;
    initialFranchiseFee?: string;
    franchiseServiceFee?: string;
    marketingLevy?: string;
    trainingFee?: number;
    transferFee?: number;
    renewalFee?: string;
    defaultInterestRate?: string;
    specialConditions?: string[];
    signatories?: string[];
    executionDate?: string;
  };
}

export interface Franchisee {
  id?: string;
  internalId: string;
  prospectPlusId?: string;
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
  tgeSuburbsJSON?: SuburbMapping[];
  ironMountainSuburbsJson?: SuburbMapping[];
  mpStarTrackActivated: boolean;
  starTrackSuburbRaw: string;
  starTrackSuburbsJson: SuburbMapping[];
  ausPostSuburbsRaw: string;
  ausPostSuburbsJson: SuburbMapping[];
  campaignPriorities?: { campaign: string; priority: 'High' | 'Medium' | 'Low' }[];
  nominatedPostOffice?: string;
  nominatedPostOfficeText?: string;
  starTrackLodgementPoints?: any[] | string;
  mpExpressLodgementPoints?: any[] | string;
  currentOwnerUserId?: string;
  linkedUserIds?: string[];
  linkedUserEmail?: string;
  agreements?: FranchiseeAgreementRecord[];
  ownershipHistory?: {
    userId: string;
    ownerName?: string;
    sharedEmail?: string;
    personalEmail?: string;
    startDate?: string;
    endDate?: string;
  }[];
  owners?: Array<{
    userId: string;
    name: string;
    email: string;
    personalEmail?: string;
    abn?: string;
    bankDetails?: { bsb?: string; accountNumber?: string; accountName?: string };
    addressDetails?: any;
  }>;
  investors?: Array<{
    userId: string;
    name: string;
    email: string;
    personalEmail?: string;
    abn?: string;
    bankDetails?: { bsb?: string; accountNumber?: string; accountName?: string };
    addressDetails?: any;
  }>;
  linkedUsers?: Array<{
    userId: string;
    name: string;
    email: string;
    personalEmail?: string;
    abn?: string;
    bankDetails?: { bsb?: string; accountNumber?: string; accountName?: string };
    addressDetails?: any;
    relationship: 'owner' | 'investor';
  }>;
}

export interface ProspectEmailLog {
  id: string;
  sentAt: string;
  sentByUid: string;
  sentByName: string;
  subject: string;
  recipient: string;
  customMessage?: string;
  attachments: Array<{
    name: string;
    url?: string;
    size?: number;
  }>;
  status: 'Sent' | 'Failed';
  error?: string;
}

export interface KeyFactSheetHistoryColumn {
  id: string;
  label: string;
  occurrences: {
    transferred?: number;
    ceased?: number;
    terminatedFranchisor?: number;
    terminatedFranchisee?: number;
    notExtended?: number;
    boughtBack?: number;
    acquiredByFranchisor?: number;
  };
}

export interface KeyFactSheetData {
  publicToken: string;
  sentAt?: string;
  sentByUid?: string;
  sentByName?: string;
  
  // Information Memorandum (IM) Specific Fields (From Official IM Template)
  dateBusinessStarted?: string;
  numberOfOwners?: number | string;
  reasonForSale?: string;
  last12MonthsServiceRevenue?: number | string;
  franchiseFeePercent?: number | string;
  marketingLevyPercent?: number | string;
  last12MonthsExpressRevenue?: number | string;
  askingPrice?: number | string;
  askingPriceText?: string;
  totalDailyRunTimeHours?: string;
  morningShiftHours?: string;
  afternoonShiftHours?: string;
  franchiseTermYears?: string;
  territoryMapUrl?: string;

  // Section A: About the franchisor
  franchisorName?: string;
  yearsInOperation?: string;
  financialViability?: 'Yes' | 'No';

  // Section B: Major disputes
  currentLegalProceedings?: 'Yes' | 'No';
  finalJudgments?: 'Yes' | 'No';
  disputeMediationPercent?: string;

  // Section C: Current and past franchisees
  franchiseeOwnedCount?: number | string;
  corporateOwnedCount?: number | string;
  historyColumns?: KeyFactSheetHistoryColumn[];
  historyFy2024?: {
    transferred?: number | string;
    ceased?: number | string;
    terminatedFranchisor?: number | string;
    terminatedFranchisee?: number | string;
    notExtended?: number | string;
    boughtBack?: number | string;
    acquiredByFranchisor?: number | string;
  };
  historyFy2023?: {
    transferred?: number | string;
    ceased?: number | string;
    terminatedFranchisor?: number | string;
    terminatedFranchisee?: number | string;
    notExtended?: number | string;
    boughtBack?: number | string;
    acquiredByFranchisor?: number | string;
  };
  historyFy2022?: {
    transferred?: number | string;
    ceased?: number | string;
    terminatedFranchisor?: number | string;
    terminatedFranchisee?: number | string;
    notExtended?: number | string;
    boughtBack?: number | string;
    acquiredByFranchisor?: number | string;
  };

  // Section D: The territory or site for the business
  territoryName?: string;
  territoryDetailsSelected?: string[];
  territoryOtherDetails?: string;
  canFranchisorChangeTerritory?: 'Yes' | 'No';
  competitionTypesSelected?: string[];
  canFranchiseeSellOnline?: 'Yes' | 'No';
  leaseInterest?: 'Yes' | 'No';

  // Section E: Supply of goods and services to the franchisee
  supplierRestrictions?: 'Yes' | 'No';
  franchisorInterestInSuppliers?: 'Yes' | 'No';
  franchisorRebates?: 'Yes' | 'No';

  // Section F: What the franchisee has to pay to operate the franchise
  preliminaryPaymentRequired?: string;
  setupCostsText?: string;
  ongoingPaymentsText?: string;
  otherPaymentsText?: string;
  franchiseFee?: number | string;
  trainingFee?: number | string;
  transactionFee?: number | string;
  vehicleCostRange?: string;
  equipmentCostRange?: string;
  insuranceCostRange?: string;
  regoCostRange?: string;
  workingCapitalRange?: string;
  legalAccountingRange?: string;

  // Section G: Marketing funds
  marketingFundContribution?: string;
  marketingFeePercent?: number | string;
  administrationFeePercent?: number | string;

  // Section H: Unilateral variation
  canUnilateralVariation?: 'Yes' | 'No';

  // Section I: Earnings
  historicalEarningsIncluded?: 'Yes' | 'No';
  projectedEarningsIncluded?: 'Yes' | 'No';

  // Section J: What happens at the end of the franchise agreement
  endOfAgreementClauseDetails?: string;
  agreementTermYears?: string;
  renewalOptionSelected?: string[];
  franchisorBuysUnsoldStock?: 'Yes' | 'No';
  goodwillCompensation?: 'Yes' | 'No';
  restraintOfTradeClause?: 'Yes' | 'No';
  notes?: string;
  documentDate?: string;
}

export interface ProspectDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  size?: number;
  type?: string;
}

export interface ConfidentialityDeedData {
  publicToken: string;
  status: 'not_started' | 'sent' | 'signed_online' | 'uploaded';
  sentAt?: string;
  sentToEmail?: string;
  signedAt?: string;
  signerName?: string;
  signerEmail?: string;
  signerAddress?: string;
  signatureDataUrl?: string;
  ipAddress?: string;
  documents?: ProspectDocument[];

  // Dynamic Deed Schedule Fields
  agreementDate?: string;
  providerName?: string;
  providerAcn?: string;
  providerAddress?: string;
  providerEmail?: string;
  providerContact?: string;
  recipientName?: string;
  recipientAcn?: string;
  recipientAbn?: string;
  recipientShortName?: string;
  recipientAddress?: string;
  recipientEmail?: string;
  recipientContact?: string;
  purpose?: string;
}

export interface EOIData {
  publicToken: string;
  status: 'not_started' | 'sent' | 'signed_online' | 'uploaded';
  sentAt?: string;
  signedAt?: string;
  signerName?: string;
  signerEmail?: string;
  signatureDataUrl?: string;
  documents?: ProspectDocument[];
  
  // Section 1: Entity Structure & Company Details
  entityStructure?: 'SOLE TRADER' | 'PARTNERSHIP' | 'PTY LTD COMPANY' | 'LTD COMPANY';
  companyName?: string;
  abn?: string;
  registeredAddress?: string;
  businessAddress?: string;
  phoneHome?: string;
  phoneBusiness?: string;
  facsimileNo?: string;

  // Section 2: Applicant 1 Details
  applicant1Name?: string;
  applicant1Position?: 'SOLE TRADER' | 'PARTNER' | 'DIRECTOR' | 'SHAREHOLDER' | string;
  applicant1PrivateAddress?: string;
  applicant1PhoneHome?: string;
  applicant1PhoneBusiness?: string;
  applicant1Email?: string;
  applicant1DriversLicence?: string;
  applicant1DriversLicencePlace?: string;
  driversLicence?: string;
  driversLicencePlaceOfIssue?: string;
  applicant1DateOfBirth?: string;
  applicant1MaritalStatus?: string;
  applicant1SpouseName?: string;
  applicant1SpouseAge?: string;
  applicant1ChildrenAges?: string;
  applicant1SpouseActive?: boolean | string;
  applicant1OwnershipPercent?: number | string;
  applicant1OtherDirectorships?: string;
  applicant1FormerAddress?: string;
  applicant1HealthStatus?: 'GOOD' | 'FAIR' | 'POOR' | string;
  applicant1PhysicalLimitations?: string;
  applicant1Qualifications?: string;
  applicant1SalesTraining?: string;

  // Section 2 (cont): Applicant 2 Details (Optional)
  hasApplicant2?: boolean;
  applicant2Name?: string;
  applicant2Position?: 'SOLE TRADER' | 'PARTNER' | 'DIRECTOR' | 'SHAREHOLDER' | string;
  applicant2PrivateAddress?: string;
  applicant2PhoneHome?: string;
  applicant2PhoneBusiness?: string;
  applicant2Email?: string;
  applicant2DriversLicence?: string;
  applicant2DriversLicencePlace?: string;
  applicant2DateOfBirth?: string;
  applicant2MaritalStatus?: string;
  applicant2SpouseName?: string;
  applicant2SpouseAge?: string;
  applicant2ChildrenAges?: string;
  applicant2SpouseActive?: boolean | string;
  applicant2OwnershipPercent?: number | string;
  applicant2OtherDirectorships?: string;
  applicant2FormerAddress?: string;
  applicant2HealthStatus?: 'GOOD' | 'FAIR' | 'POOR' | string;
  applicant2PhysicalLimitations?: string;
  applicant2Qualifications?: string;
  applicant2SalesTraining?: string;

  // Section 3: Trusts
  trustName?: string;
  trustEstablishedDate?: string;
  trustBeneficiaries?: string;

  // Section 4: Employment History
  employmentHistory?: Array<{
    occupation: string;
    position: string;
    company: string;
    businessType: string;
    address: string;
    contactPerson: string;
    phone: string;
    periodOfEmployment?: string;
    commencementDate?: string;
    reasonLeft?: string;
    responsibilities?: string;
  }>;

  // Section 5: References
  references?: Array<{
    name: string;
    phone: string;
    position: string;
    company: string;
    nature: string; // e.g. Trade 1, Trade 2, Personal
  }>;

  // Section 6: Convictions and Legal Proceedings
  convictionPlaceYear?: string;
  convictionType?: string;
  convictionPenalty?: string;
  plaintiffName?: string;
  defendantName?: string;
  yearIssued?: string;
  yearConcluded?: string;
  subjectMatter?: string;
  judgmentNatureQuantum?: string;
  convictions?: string;
  legalProceedings?: string;

  // Section 7: Household Income & Expenditure (Monthly Breakdown)
  incSalary?: number | string;
  incBonus?: number | string;
  incDividends?: number | string;
  incRealEstate?: number | string;
  incOther?: number | string;
  incOtherSpecify?: string;
  monthlyIncome?: number | string;

  expMortgage?: number | string;
  expLoans?: number | string;
  expCreditCard?: number | string;
  expPhoneElectric?: number | string;
  expSchoolFees?: number | string;
  expRatesTaxes?: number | string;
  expInsurance?: number | string;
  expOther?: number | string;
  expOtherSpecify?: string;
  monthlyExpenditure?: number | string;

  // Section 8: Statement of Assets & Liabilities
  astRealEstate?: number | string;
  astCash?: number | string;
  astBusinessNetValue?: number | string;
  astSharesBonds?: number | string;
  astOther?: number | string;
  totalAssets?: number | string;

  liabRealEstateMortgages?: number | string;
  liabNotesLoansInst?: number | string;
  liabFriendsRelatives?: number | string;
  liabOtherDebts?: number | string;
  totalLiabilities?: number | string;
  netWorth?: number | string;

  // Section 9: General Enquiry by MailPlus
  reasonForPurchase?: string;
  fundingSource?: string;
  fundingType?: 'nab' | 'sole_trader' | 'self_funded' | string;
  whySuited?: string;
  similarBusinessExperience?: boolean | string;
  similarBusinessDetails?: string;
  preparedToComply?: boolean | string;
  whySuccessful?: string;
  valuableQualities?: string;
  fullTimeDevotion?: boolean | string;
  operatingHoursDetails?: string;
  mainStrengths?: string;
  mainWeaknesses?: string;
  knowsFranchiseDefinition?: boolean | string;
  franchiseDefinitionExplanation?: string;
  understandsRelationship?: boolean | string;
  relationshipExplanation?: string;
  acceptsGuidance?: boolean | string;
  knowsDefinedTerm?: boolean | string;
  representationsMade?: string;
  understandsIndependentAdvice?: boolean | string;

  // Section 12: Franchise Purchase & Banking Sharing
  requiresFinance?: boolean | string;
  authorizeFinanceSharing?: boolean | string;

  // Section 13: Information Statement Confirmation
  informationStatementConfirmed?: boolean | string;
  informationStatementDate?: string;

  // Section 14: Declaration
  declarationConfirmed?: boolean;
}

export interface DepositDetails {
  isPaid: boolean;
  percentageDeposited?: number | string; // e.g. 5, 10
  amountPaid?: number | string;
  paymentDate?: string;
  paymentMethod?: 'EFT' | 'Cheque' | 'Credit Card' | 'Other';
  receiptRef?: string; // e.g. 'FR DEP SMITH'
  receiptUrl?: string;
  notes?: string;
  loggedByUid?: string;
  loggedByName?: string;
  loggedAt?: string;
  documents?: ProspectDocument[];
}

export interface RequestForDocsData {
  publicToken: string;
  status: 'draft' | 'sent' | 'instructed' | 'completed';
  sentAt?: string;
  instructedAt?: string;
  instructedBy?: string;
  outgoingFranchiseeName?: string;
  disputeDetails?: string;
  withheldConsent?: boolean;
  incomingEntityName?: string;
  abn?: string;
  registeredAddress?: string;
  email?: string;
  mobile?: string;
  isSoleTrader?: boolean;
  guarantors?: Array<{ name: string; address: string; email: string; phone: string }>;
  manager?: { name: string; address: string; email: string; phone: string };
  outgoingLawyer?: string;
  outgoingAccountant?: string;
  incomingLawyer?: string;
  incomingAccountant?: string;
  businessName?: string;
  territoryName?: string;
  territoryMapUrl?: string;
  termYears?: number;
  commencementDate?: string;
  expiryDate?: string;
  fees?: {
    deposit?: number;
    initialFranchiseFee?: number;
    renewalFee?: number;
    transferFee?: number;
    transactionFee?: number;
    serviceFeePercent?: number;
    marketingLevyPercent?: number;
    techLicenceFee?: number;
    coolOffRetained?: number;
  };
  earningsProvided?: boolean;
  mpFinancingProvided?: boolean;
  capitalExpenditure?: {
    vehicleRange?: string;
    toolsOfTrade?: string;
  };
  specialConditions?: string;
  reviewedByMatt?: boolean;
  reviewedByMattAt?: string;
  chasedByMaddie?: boolean;
  chasedByMaddieAt?: string;
}

export interface DisclosureDocumentData {
  publicToken: string;
  status: 'not_started' | 'dispatched' | 'receipt_signed' | 'completed';
  dispatchMethod: 'electronic' | 'postal';
  dispatchedAt?: string;
  receiptSignedAt?: string;
  receiptBackdated?: boolean;
  receiptUploadedAt?: string;
  receiptPdfUrl?: string;
  signerName?: string;
  signerEmail?: string;
  signerIp?: string;
  earliestFranchiseAgreementExecutionDate?: string; // receiptSignedAt + 14 days
}

export interface FranchiseAgreementData {
  publicToken: string;
  status: 'locked' | 'available' | 'signed_online' | 'wet_signed_uploaded' | 'completed';
  earliestExecutionDate?: string;
  executedAt?: string;
  signedPdfUrl?: string;
  executionType?: 'digital' | 'wet_ink';
  netSuiteSyncStatus?: 'auto_synced' | 'manual_pending' | 'uploaded';
  signerName?: string;
  signerEmail?: string;
  signerIp?: string;
  signatureDataUrl?: string;
}

export interface NABFundingDetails {
  accreditationFundingRequired: boolean;
  nabStatus: 'not_required' | 'pending_michael_confirmation' | 'confirmed' | 'rejected';
  nabConfirmedBy?: string;
  nabConfirmedAt?: string;
  nabNotes?: string;
}

export interface OperationalTrainingSchedule {
  confirmedStartDate?: string;
  salesTraining?: {
    trainer: 'Aleyna';
    scheduledDate?: string;
    status: 'pending' | 'scheduled' | 'completed';
    alertsSent?: boolean;
  };
  appPustraining?: {
    trainer: 'Operational Lead';
    scheduledDate?: string;
    status: 'pending' | 'scheduled' | 'completed';
    alertsSent?: boolean;
  };
  billingTraining?: {
    trainer: 'Popie';
    scheduledDate?: string;
    status: 'pending' | 'scheduled' | 'completed';
    alertsSent?: boolean;
  };
  gregCalendarSynced?: boolean;
}

export interface FranchiseProspect {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  preferredState?: string;
  preferredTerritory?: string;
  interestedTerritories?: string[];
  interest?: string;
  vehicle?: string;
  experience?: string;
  employment?: string;
  message?: string;
  status:
    | 'New'
    | 'Deed Signed'
    | 'IM Sent'
    | 'Contacted'
    | 'Under Review'
    | 'EOI Signed'
    | 'Deposit Paid'
    | 'NAB Pending'
    | 'NAB Confirmed'
    | 'Legal Instructions Sent'
    | 'Disclosure 14-Day Lock'
    | 'FA Executed'
    | 'Training Scheduled'
    | 'Converted'
    | 'Rejected'
    | 'Archived';
  brochureSent?: boolean;
  brochureSentAt?: string;
  emailLogs?: ProspectEmailLog[];
  notes?: Array<{
    id: string;
    text: string;
    createdAt: string;
    createdByName: string;
    createdByUid: string;
  }>;
  submittedAt: string;
  sourceApp?: string;
  convertedUserId?: string;
  convertedFranchiseeId?: string;
  linkedFranchiseeId?: string;
  linkedFranchiseeName?: string;
  presaleListingId?: string;

  // Step-by-Step Prospect Pipeline Fields
  keyFactSheet?: KeyFactSheetData;
  confidentialityDeed?: ConfidentialityDeedData;
  eoiData?: EOIData;
  depositDetails?: DepositDetails;
  requestForDocs?: RequestForDocsData;
  disclosureDocument?: DisclosureDocumentData;
  franchiseAgreement?: FranchiseAgreementData;
  nabFunding?: NABFundingDetails;
  trainingSchedule?: OperationalTrainingSchedule;
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

export const RETENTION_STRATEGIES = [
  'Keep Existing Services & Pricing',
  'Change Frequency & Update Price',
  'Keep Frequency & Update Price',
  'Remove Specific Service Item',
  'One-Off Credit or Goodwill Gesture',
  'MailPlus Absorbing a Cost',
] as const;

export type RetentionStrategy = typeof RETENTION_STRATEGIES[number];

export function normalizeRetentionStrategy(strategy?: string): string {
  if (!strategy) return 'Keep Existing Services & Pricing';
  
  switch (strategy) {
    case 'Keep Existing':
    case 'Keep Existing Services & Pricing':
      return 'Keep Existing Services & Pricing';
    case 'Change Frequency & Price':
    case 'Change Frequency & Update Price':
      return 'Change Frequency & Update Price';
    case 'Keep Frequency Update Price':
    case 'Keep Frequency & Update Price':
      return 'Keep Frequency & Update Price';
    case 'Remove Service':
    case 'Remove Specific Service Item':
      return 'Remove Specific Service Item';
    case 'One-Off Credit or Goodwill Gesture':
      return 'One-Off Credit or Goodwill Gesture';
    case 'MailPlus Absorbing a Cost':
      return 'MailPlus Absorbing a Cost';
    default:
      return strategy;
  }
}

export interface CancellationRequest {
  id: string;
  leadId: string;
  prospectPlusId?: string;
  netsuiteId?: string;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  requestedDate: string; // ISO String
  cancellationDate: string; // ISO String (requested stop date)
  trueServiceCancellationDate: string; // ISO String (actual date services stop)
  cancellationReason: string; // 'Price' | 'Competitor' | 'Service Quality' | 'No Longer Needed' | 'Business Closed' | 'Other'
  cancellationTheme?: string;
  cancellationThemeId?: string;
  cancellationWhyId?: string;
  cancellationReasonId?: string;
  status: 'Pending' | 'Saved' | 'Cancelled';
  saveStrategy?: RetentionStrategy | string;
  originalServices: ServiceSelection[];
  updatedServices?: ServiceSelection[];
  notes?: string;
  processedBy?: string;
  processedAt?: string;
  requestedBy?: string;
  createdBy?: string;
  createdAt?: any;
  callsCount?: number;
  originalMRR?: number;
  savedMRR?: number;
  isSignedCustomer?: boolean;
  avg3MonthInvoiceMRR?: number;
  newInvoiceMRR?: number;
  serviceRateChanged?: boolean;
  serviceFrequencyChanged?: boolean;
  serviceDeleted?: boolean;
}

export type CSRequestType = 'change_of_service' | 'cancellation';
export type ServiceChangeCategory = 'price_change' | 'frequency_change' | 'add_service' | 'remove_service';

export interface CSRequest {
  id: string;
  leadId: string;
  prospectPlusId?: string;
  netsuiteId?: string;
  companyName: string;
  requestType: CSRequestType;
  
  // Contact details
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  // Service change details
  serviceChangeCategories?: ServiceChangeCategory[];
  requestedServices?: ServiceSelection[];
  effectiveDate?: string;
  
  // Cancellation details
  cancellationTheme?: string;
  cancellationThemeId?: string;
  cancellationWhyId?: string;
  cancellationReason?: string;
  cancellationReasonId?: string;
  cancellationDate?: string;
  trueServiceCancellationDate?: string;
  saveStrategy?: string;
  
  // Request metadata
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
    type?: string;
    uploadedAt?: string;
  }>;
  requestedDate: string; // ISO string
  requestedBy?: string;
  capturedBy?: string;
  notes?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Saved' | 'Cancelled';
  originalServices?: ServiceSelection[];
  updatedServices?: ServiceSelection[];
  processedBy?: string;
  processedAt?: string;
  createdAt?: any;
  callsCount?: number;
  originalMRR?: number;
  savedMRR?: number;
}

export interface PricingTableRow {
  type: string;
  delivery_zone: string;
  product: string;
  price: number;
}

export interface SuburbDriver {
  ns_id: string;
  is_primary: boolean;
}

export interface LeadSuburbMapping {
  courier: string;
  depot_id: string | null;
  hub_id: string | null;
  only_second_driver: boolean;
  broadcast: boolean;
  customer_ns_id: string;
  postcode: string;
  suburb: string;
  state: string;
  drivers: SuburbDriver[];
}

export type OnboardingRequestStatus = 'Pending' | 'Appointment Booked' | 'Completed' | 'Cancelled';
export type OnboardingRequestPriority = 'Standard' | 'Urgent';

export interface OnboardingAppointmentDetails {
  appointmentDate: string; // ISO date string
  appointmentType?: string; // e.g. 'Video Call', 'Phone Call', 'Onsite Visit'
  locationOrLink?: string;
  notes?: string;
  scheduledByUid: string;
  scheduledByName: string;
  scheduledAt: string; // ISO date string
}

export interface OnboardingRequest {
  id: string;
  leadId: string;
  companyId?: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  requestedByUid: string;
  requestedByName: string;
  requestedAt: string; // ISO date string
  status: OnboardingRequestStatus;
  priority: OnboardingRequestPriority;
  assignedToUid: string;
  assignedToName: string;
  preferredTimeframe?: string;
  notes?: string;
  appointmentDetails?: OnboardingAppointmentDetails;
  completedAt?: string;
  completedByUid?: string;
  completedByName?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OnboardingMetricsSummary {
  totalRequests: number;
  pendingCount: number;
  bookedCount: number;
  completedCount: number;
  cancelledCount: number;
  bookingRatePercentage: number;
}

export interface LpoLead {
  id?: string;
  prospectPlusId: string;
  lpoName: string;
  lpoOwnerName: string;
  email: string;
  phone: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  lat?: string | number | null;
  lng?: string | number | null;
  notes?: string;
  status: string;
  source?: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  createdById?: string | null;

  // CSV Import fields
  lpoInternalId?: string;
  inactive?: boolean;
  secondaryInternalId?: string;
  lpoCreatedDate?: string;
  lpoLastModifiedDate?: string;
  linkedNcl?: string;
  rawCustomerName?: string;
  linkedCustomerId?: string; // Column I ID
  companyNameFranchise?: string;
  lpoTier?: string;
  poLevelTier?: string;
  pageURL?: string;
  salesRep?: string;
  validationProvided?: string;
  leadGenerator?: string;
  faceToFace?: string;
  confAndCall?: string;
  acceptedTerms?: string | boolean;
  dynamicScf?: string;
  adhocBooking?: string;
  defaultPassword?: string;

  // Customer & Partner linkage
  linkedLeadId?: string | null;
  linkedLeadCompanyName?: string | null;
  linkStatus?: 'Linked' | 'Unlinked';
  isConverted?: boolean;
  conversionStep?: number;
  linkedPartnerLocationId?: string | null;
  linkedPartnerLocationName?: string | null;
}

