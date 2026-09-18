# Module: `src/lib/types.ts`

- **Language:** TypeScript
- **Total Lines:** 1901

## Exported Symbols & API

### `TYPE` `LeadBucket`

- **Line:** 1
- **Signature:** `'outbound' | 'field_sales' | 'inbound' | 'account_manager' | 'customer_success' | 'nurture' | 'marketing' | 'lpo_plus' | 'lpo_network' | 'in_review' | 'multisite' | '' | 'blank' | 'unassigned' | (string & {})`

---

### `INTERFACE` `BucketHistory`

- **Line:** 3

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `oldBucket` | `string` | No | - |
| `newBucket` | `string` | No | - |
| `date` | `string` | No | - |
| `author` | `string` | No | - |

---

### `INTERFACE` `StatusHistory`

- **Line:** 11

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `oldStatus` | `string` | Yes | - |
| `newStatus` | `string` | No | - |
| `date` | `string` | No | - |
| `author` | `string` | Yes | - |

---

### `INTERFACE` `InboundDetails`

- **Line:** 19

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `formId` | `string` | Yes | - |
| `utmSource` | `string` | Yes | - |
| `utmMedium` | `string` | Yes | - |
| `utmCampaign` | `string` | Yes | - |
| `utmContent` | `string` | Yes | - |
| `utmTerm` | `string` | Yes | - |
| `adClickId` | `string` | Yes | - |
| `channel` | `string` | Yes | - |
| `posthogDistinctId` | `string` | Yes | - |
| `posthogSessionId` | `string` | Yes | - |
| `posthogSessionUrl` | `string` | Yes | - |
| `submittedAt` | `string` | No | - |
| `referrer` | `string` | Yes | - |
| `landingPage` | `string` | Yes | - |
| `ipAddress` | `string` | Yes | - |
| `userAgent` | `string` | Yes | - |

---

### `TYPE` `LeadStatus`

- **Line:** 38
- **Signature:** `| 'New'
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
  | 'ShipMate Trial Stopped'`

---

### `TYPE` `ReviewCategory`

- **Line:** 77
- **Signature:** `'Good Example' | 'Coaching Opportunity' | 'Needs Improvement'`

---

### `INTERFACE` `CheckinQuestion`

- **Line:** 79

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `question` | `string` | No | - |
| `answer` | `string | string[]` | No | - |

---

### `INTERFACE` `Review`

- **Line:** 84

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `reviewer` | `string` | No | - |
| `date` | `string` | No | - |
| `notes` | `string` | No | - |
| `category` | `ReviewCategory` | Yes | - |

---

### `INTERFACE` `EmailRecord`

- **Line:** 92

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `subject` | `string` | No | - |
| `bodyHtml` | `string` | No | - |
| `sentAt` | `string` | No | - |
| `sender` | `string` | No | - |
| `recipient` | `string` | No | - |
| `status` | `string` | No | - |
| `campaignId` | `string` | Yes | - |

---

### `INTERFACE` `Activity`

- **Line:** 103

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `leadId` | `string` | Yes | - |
| `type` | `'Call' | 'Email' | 'Meeting' | 'Update' | 'CS Call'` | No | - |
| `date` | `string` | No | - |
| `duration` | `string` | Yes | - |
| `notes` | `string` | No | - |
| `callId` | `string` | Yes | - |
| `author` | `string` | Yes | - |
| `email` | `string` | Yes | - |
| `review` | `Review` | Yes | - |
| `isReviewed` | `boolean` | Yes | - |
| `syncedWithNetSuite` | `boolean` | Yes | - |
| `aircallStatus` | `string` | Yes | - |
| `recordingUrl` | `string` | Yes | - |
| `recordingAssetUrl` | `string` | Yes | - |
| `event` | `string` | Yes | - |
| `isCustomerSuccess` | `boolean` | Yes | - |

---

### `INTERFACE` `Note`

- **Line:** 123

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `date` | `string` | No | - |
| `author` | `string` | No | - |
| `content` | `string` | No | - |
| `syncedWithNetSuite` | `boolean` | Yes | - |

---

### `INTERFACE` `Task`

- **Line:** 131

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `title` | `string` | No | - |
| `dueDate` | `string` | No | - |
| `isCompleted` | `boolean` | No | - |
| `createdAt` | `string` | No | - |
| `completedAt` | `string` | Yes | - |
| `author` | `string` | No | - |
| `dialerAssigned` | `string` | Yes | - |
| `outlookEventId` | `string` | Yes | - |
| `durationMinutes` | `number` | Yes | - |

---

### `TYPE` `AppointmentStatus`

- **Line:** 144
- **Signature:** `'Completed' | 'Cancelled' | 'No Show' | 'Rescheduled' | 'Pending'`

---

### `INTERFACE` `Appointment`

- **Line:** 145

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `duedate` | `string` | No | - |
| `starttime` | `string` | No | - |
| `assignedTo` | `string` | No | - |
| `appointmentDate` | `string` | Yes | - |
| `appointmentStatus` | `AppointmentStatus` | Yes | - |
| `revisit` | `boolean` | Yes | - |
| `leadId` | `string` | No | - |
| `prospectPlusId` | `string` | Yes | - |
| `dialerAssigned` | `string` | Yes | - |
| `timezone` | `string` | Yes | - |
| `date` | `string` | Yes | - |
| `amId` | `string` | Yes | - |
| `amName` | `string` | Yes | - |
| `type` | `string` | Yes | - |
| `eventId` | `string` | Yes | - |
| `joinUrl` | `string` | Yes | - |
| `createdAt` | `string` | Yes | - |
| `franchisee` | `string` | Yes | - |
| `franchiseeName` | `string` | Yes | - |
| `franchiseeUserName` | `string` | Yes | - |
| `franchiseeEmail` | `string` | Yes | - |
| `userName` | `string` | Yes | - |
| `userEmail` | `string` | Yes | - |
| `leadName` | `string` | Yes | - |
| `companyName` | `string` | Yes | - |
| `notes` | `string` | Yes | - |
| `statusNotes` | `string` | Yes | - |

---

### `INTERFACE` `TranscriptAnalysis`

- **Line:** 176

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `summary` | `string` | No | - |
| `sentiment` | `'Positive' | 'Negative' | 'Neutral'` | No | - |
| `actionItems` | `string[]` | No | - |
| `keyTopics` | `string[]` | No | - |

---

### `INTERFACE` `Transcript`

- **Line:** 182

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `date` | `string` | No | - |
| `author` | `string` | No | - |
| `content` | `string` | No | - |
| `callId` | `string` | No | - |
| `analysis` | `TranscriptAnalysis` | Yes | - |
| `phoneNumber` | `string` | Yes | - |

---

### `TYPE` `EmailVerificationStatus`

- **Line:** 192
- **Signature:** `'deliverable' | 'risky' | 'undeliverable' | 'unknown'`

---

### `INTERFACE` `EmailVerificationResult`

- **Line:** 194

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | No | - |
| `status` | `EmailVerificationStatus` | No | - |
| `score` | `number` | No | - |
| `reason` | `string` | Yes | - |
| `verifiedAt` | `string` | No | - |
| `cached` | `boolean` | Yes | - |
| `details` | `{
    regexp?: boolean;
    gibberish?: boolean;
    disposable?: boolean;
    webmail?: boolean;
    mxRecords?: boolean;
    smtpCheck?: boolean;
    acceptAll?: boolean;
  }` | Yes | - |

---

### `INTERFACE` `Contact`

- **Line:** 212

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `firstName` | `string` | Yes | - |
| `lastName` | `string` | Yes | - |
| `title` | `string` | No | - |
| `email` | `string` | No | - |
| `phone` | `string` | No | - |
| `syncedWithNetSuite` | `boolean` | Yes | - |
| `accessToLocalMile` | `'yes' | 'no'` | Yes | - |
| `accessToShipMate` | `'yes' | 'no'` | Yes | - |
| `sendEmail` | `'yes' | 'no'` | Yes | - |
| `localMilePlusAuthLink` | `string` | Yes | - |
| `securityCode` | `string` | Yes | - |
| `isPrimary` | `boolean` | Yes | - |
| `isAccountsPayable` | `boolean` | Yes | - |
| `verificationStatus` | `EmailVerificationStatus` | Yes | - |
| `verificationScore` | `number` | Yes | - |
| `verifiedAt` | `string` | Yes | - |
| `accountActivated` | `boolean` | Yes | - |
| `createPasswordEmailSent` | `boolean` | Yes | - |
| `shipmateStatus` | `'Activated' | 'Password Sent' | 'No Access'` | Yes | - |
| `shipmateCheckedAt` | `string` | Yes | - |

---

### `INTERFACE` `Address`

- **Line:** 237

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `address1` | `string` | Yes | - |
| `street` | `string` | No | - |
| `city` | `string` | No | - |
| `state` | `string` | No | - |
| `zip` | `string` | No | - |
| `country` | `string` | No | - |
| `lat` | `number` | Yes | - |
| `lng` | `number` | Yes | - |
| `partnerLocationId` | `string` | Yes | - |
| `partnerLocationName` | `string` | Yes | - |

---

### `INTERFACE` `TaggedAddress`

- **Line:** 250

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | - |
| `tag` | `string` | No | - |
| `createdAt` | `string` | Yes | - |

---

### `INTERFACE` `DiscoveryAnswer`

- **Line:** 257

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `question` | `string` | No | - |
| `answer` | `string` | No | - |
| `pathway` | `string` | Yes | - |

---

### `INTERFACE` `DiscoveryData`

- **Line:** 263

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `discoverySignals` | `string[]` | Yes | - |
| `inconvenience` | `'Very inconvenient' | 'Somewhat inconvenient' | 'Not a big issue'` | Yes | - |
| `occurrence` | `'Daily' | 'Weekly' | 'Ad-hoc'` | Yes | - |
| `recurring` | `'Yes - predictable' | 'Sometimes' | 'One-off'` | Yes | - |
| `taskOwner` | `'Shared admin responsibility' | 'Dedicated staff role' | 'Ad-hoc / whoever is free'` | Yes | - |
| `businessType` | `'Retail' | 'B2B'` | Yes | - |
| `personSpokenWithName` | `string` | Yes | - |
| `personSpokenWithTitle` | `string` | Yes | - |
| `personSpokenWithEmail` | `string` | Yes | - |
| `personSpokenWithPhone` | `string` | Yes | - |
| `personSpokenWithTags` | `string[]` | Yes | - |
| `decisionMakerName` | `string` | Yes | - |
| `decisionMakerTitle` | `string` | Yes | - |
| `decisionMakerEmail` | `string` | Yes | - |
| `decisionMakerPhone` | `string` | Yes | - |
| `postOfficeRelationship` | `string` | Yes | - |
| `logisticsSetup` | `string` | Yes | - |
| `shippingVolume` | `string` | Yes | - |
| `expressVsStandard` | `string` | Yes | - |
| `packageType` | `string[]` | Yes | - |
| `currentProvider` | `string[]` | Yes | - |
| `eCommerceTech` | `string[]` | Yes | - |
| `sameDayCourier` | `string` | Yes | - |
| `painPoints` | `string` | Yes | - |
| `managementPathway` | `'self_managed' | 'aus_post_managed' | 'no_aus_post_usage' | null` | Yes | - |
| `discoveryAnswers` | `DiscoveryAnswer[]` | Yes | - |
| `lostPropertyProcess` | `'Staff organise returns manually' | 'Guests contact us to arrange shipping' | 'Rarely happens / informal process' | 'Already use a return platform'` | Yes | - |
| `score` | `number` | Yes | - |
| `routingTag` | `string` | Yes | - |
| `scoringReason` | `string` | Yes | - |
| `searchKeywords` | `string[]` | Yes | - |
| `interestedIn` | `string` | Yes | - |
| `weeklyParcels` | `string` | Yes | - |
| `lodgementEvidence` | `string` | Yes | - |
| `shipperEvidence` | `string` | Yes | - |
| `shopifyDetected` | `string` | Yes | - |
| `prospectSummary` | `string` | Yes | - |
| `xeroDetected` | `string` | Yes | - |
| `apRelationship` | `string` | Yes | - |
| `suggestedProduct` | `string` | Yes | - |
| `suggestedOpener` | `string` | Yes | - |
| `suggestedPersonalisation` | `string` | Yes | - |

---

### `INTERFACE` `InvoiceItem`

- **Line:** 311

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `service` | `string` | No | - |
| `rate` | `number` | No | - |
| `qty` | `number` | No | - |
| `totalAmount` | `number` | No | - |

---

### `INTERFACE` `Invoice`

- **Line:** 318

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | - |
| `documentId` | `string` | Yes | - |
| `invoiceDocumentID` | `string` | Yes | - |
| `invoiceInternalID` | `string` | Yes | - |
| `invoiceDate` | `string` | Yes | - |
| `invoiceTotal` | `number | string` | No | - |
| `invoiceType` | `string` | No | - |
| `invoiceURL` | `string` | Yes | - |
| `invoiceStatus` | `string` | Yes | - |
| `status` | `string` | Yes | - |
| `syncedWithNetSuite` | `boolean` | Yes | - |
| `items` | `InvoiceItem[]` | Yes | - |

---

### `INTERFACE` `ServiceSelection`

- **Line:** 333

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | - |
| `name` | `string` | No | - |
| `frequency` | `('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] | 'Adhoc' | string` | No | - |
| `rate` | `number` | Yes | - |
| `quantity` | `number` | Yes | - |
| `trialStartDate` | `string` | Yes | - |
| `trialEndDate` | `string` | Yes | - |
| `startDate` | `string` | Yes | - |

---

### `INTERFACE` `ScfRecord`

- **Line:** 344

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `leadId` | `string` | No | - |
| `contactId` | `string` | No | - |
| `services` | `ServiceSelection[]` | No | - |
| `products` | `any[]` | Yes | - |
| `startDate` | `string` | No | - |
| `status` | `'Pending' | 'Accepted' | 'Cancelled' | 'Signed' | 'Quote Accepted'` | No | - |
| `createdAt` | `string` | No | - |
| `updatedAt` | `string` | Yes | - |
| `createdBy` | `string` | Yes | - |
| `createdByName` | `string` | Yes | - |
| `createdByEmail` | `string` | Yes | - |
| `createdByUid` | `string` | Yes | - |
| `acceptedAt` | `string` | Yes | - |
| `signedAt` | `string` | Yes | - |
| `url` | `string` | No | - |
| `uploadedPdfUrl` | `string` | Yes | - |
| `uploadedPdfName` | `string` | Yes | - |
| `uploadedPdfAt` | `string` | Yes | - |
| `uploadedPdfBy` | `string` | Yes | - |
| `bankLocationId` | `string` | Yes | - |
| `bankLocationName` | `string` | Yes | - |

---

### `INTERFACE` `VisitNoteAnalysis`

- **Line:** 369

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `companyName` | `string` | Yes | - |
| `address` | `string` | Yes | - |
| `contactName` | `string` | Yes | - |
| `contactTitle` | `string` | Yes | - |
| `contactEmail` | `string` | Yes | - |
| `contactPhone` | `string` | Yes | - |
| `outcome` | `string` | Yes | - |
| `actionItems` | `string[]` | Yes | - |

---

### `INTERFACE` `VisitNote`

- **Line:** 380

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `content` | `string` | No | - |
| `capturedBy` | `string` | No | - |
| `capturedByUid` | `string` | No | - |
| `createdAt` | `string` | No | - |
| `status` | `'New' | 'In Progress' | 'Converted' | 'Rejected'` | No | - |
| `leadId` | `string` | Yes | - |
| `googlePlaceId` | `string` | Yes | - |
| `companyName` | `string` | Yes | - |
| `address` | `Address` | Yes | - |
| `outcome` | `{
    type: string;
    details: Record<string, any>;
  }` | Yes | - |
| `analyzedData` | `VisitNoteAnalysis` | Yes | - |
| `imageUrls` | `string[]` | Yes | - |
| `websiteUrl` | `string` | Yes | - |
| `discoveryData` | `Partial<DiscoveryData>` | Yes | - |
| `franchisee` | `string` | Yes | - |
| `scheduledDate` | `string` | Yes | - |
| `scheduledTime` | `string` | Yes | - |
| `capturedTimezone` | `string` | Yes | - |

---

### `TYPE` `UserRole`

- **Line:** 405
- **Signature:** `'user' | 'Outbound Admin' | 'admin' | 'Field Sales' | 'Field Sales Admin' | 'Lead Gen' | 'Lead Gen Admin' | 'Franchisee' | 'Sales Manager' | 'Dashback' | 'Account Managers' | 'Account Manager' | 'account managers' | 'dialers' | 'Dialer' | 'Marketing Manager' | 'Customer Success' | 'Customer Service' | 'super user' | 'Operations' | 'Finance' | 'Finanace Manager' | 'Finance Manager' | 'Data Admin'`

---

### `INTERFACE` `UserProfile`

- **Line:** 407

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `uid` | `string` | No | - |
| `email` | `string` | No | - |
| `name` | `string` | Yes | - |
| `firstName` | `string` | Yes | - |
| `lastName` | `string` | Yes | - |
| `displayName` | `string` | Yes | - |
| `assignedRoles` | `UserRole[]` | Yes | - |
| `defaultRole` | `UserRole` | Yes | - |
| `activeRole` | `UserRole` | Yes | - |
| `role` | `UserRole` | Yes | - |
| `phoneNumber` | `string` | Yes | - |
| `mobileNumber` | `string` | Yes | - |
| `aircallPhoneNumber` | `string` | Yes | - |
| `aircallUserId` | `string` | Yes | - |
| `salesRepId` | `string` | Yes | - |
| `accountManagerId` | `string` | Yes | - |
| `netsuiteId` | `string` | Yes | - |
| `disabled` | `boolean` | Yes | - |
| `linkedSalesRep` | `string` | Yes | - |
| `linkedBDR` | `string` | Yes | - |
| `franchisee` | `string` | Yes | - |
| `franchiseeId` | `string` | Yes | - |
| `franchiseeInternalId` | `string` | Yes | - |
| `linkedFranchiseeIds` | `string[]` | Yes | - |
| `historicalFranchiseeIds` | `string[]` | Yes | - |
| `currentLocation` | `{ lat: number; lng: number }` | Yes | - |
| `activeRoute` | `string[]` | Yes | - |
| `pinnedNav` | `string[]` | Yes | - |
| `pinnedPaths` | `string[]` | Yes | - |
| `userOnboardingStates` | `Record<string, boolean>` | Yes | - |
| `accessibleSharedMailboxes` | `string[]` | Yes | - |
| `leaveProfile` | `{
    isOnLeave: boolean;
    backupAmName?: string;
    stopAssignment: boolean;
    startDate?: string;
    endDate?: string;
  }` | Yes | - |
| `microsoftAccessToken` | `string` | Yes | - |
| `microsoftRefreshToken` | `string` | Yes | - |
| `microsoftTokenExpiresAt` | `number` | Yes | - |
| `workingHours` | `{
    [dayOfWeek: string]: { start: string; end: string; enabled: boolean };
  }` | Yes | - |
| `meetingBufferMinutes` | `number` | Yes | - |
| `meetingSubjectTemplate` | `string` | Yes | - |
| `defaultMeetingDurationMinutes` | `number` | Yes | - |
| `minimumBookingNoticeHours` | `number` | Yes | - |
| `defaultMeetingType` | `'phone' | 'teams'` | Yes | - |
| `timezone` | `string` | Yes | - |
| `sidebarAlwaysOpen` | `boolean` | Yes | - |
| `adminApprovalStatus` | `'pending' | 'approved' | 'rejected'` | Yes | - |
| `pendingAdminRequestId` | `string` | Yes | - |
| `franchiseeRole` | `'owner' | 'investor'` | Yes | - |
| `personalEmail` | `string` | Yes | - |
| `abn` | `string` | Yes | - |
| `addressDetails` | `{
    street?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    fullAddress?: string;
  }` | Yes | - |
| `bankDetails` | `{
    bsb?: string;
    accountNumber?: string;
    accountName?: string;
  }` | Yes | - |
| `linkedFranchisees` | `Array<{
    franchiseeId: string;
    franchiseeName: string;
    relationship: 'owner' | 'investor';
    isDefault?: boolean;
  }>` | Yes | - |
| `activeFranchiseeId` | `string` | Yes | - |

---

### `INTERFACE` `AdminApprovalRequest`

- **Line:** 485

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `userId` | `string` | No | - |
| `userEmail` | `string` | No | - |
| `userName` | `string` | No | - |
| `requestedRole` | `'admin'` | No | - |
| `requestedByUid` | `string` | No | - |
| `requestedByName` | `string` | No | - |
| `status` | `'pending' | 'approved' | 'rejected'` | No | - |
| `createdAt` | `string` | No | - |
| `updatedAt` | `string` | Yes | - |
| `actionedByUid` | `string` | Yes | - |
| `actionedByName` | `string` | Yes | - |

---

### `INTERFACE` `Upsell`

- **Line:** 500

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `companyId` | `string` | No | - |
| `companyName` | `string` | No | - |
| `repName` | `string` | No | - |
| `repUid` | `string` | No | - |
| `date` | `string` | No | - |
| `notes` | `string` | Yes | - |

---

### `INTERFACE` `DailyDeployment`

- **Line:** 510

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `userId` | `string` | No | - |
| `userName` | `string` | No | - |
| `date` | `string` | No | - |
| `area` | `string` | No | - |
| `startTime` | `string` | No | - |
| `createdAt` | `string` | No | - |

---

### `INTERFACE` `DaySchedule`

- **Line:** 520

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `day` | `string` | No | - |
| `startTime` | `string` | No | - |
| `endTime` | `string` | No | - |
| `enabled` | `boolean` | No | - |

---

### `INTERFACE` `FieldSalesSchedule`

- **Line:** 527

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `userId` | `string` | No | - |
| `userName` | `string` | No | - |
| `workingDays` | `string[]` | No | - |
| `startTime` | `string` | No | - |
| `endTime` | `string` | No | - |
| `daySchedules` | `DaySchedule[]` | No | - |
| `updatedAt` | `string` | No | - |
| `weekStarting` | `string` | No | - |
| `notes` | `string` | Yes | - |

---

### `INTERFACE` `Lead`

- **Line:** 540

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `customerEntityId` | `string` | Yes | - |
| `internalid` | `string` | Yes | - |
| `internalId` | `string` | Yes | - |
| `entityId` | `string` | Yes | - |
| `companyName` | `string` | No | - |
| `status` | `LeadStatus` | No | - |
| `statusReason` | `string` | Yes | - |
| `avatarUrl` | `string` | Yes | - |
| `profile` | `string` | No | - |
| `activity` | `Activity[]` | Yes | - |
| `emails` | `EmailRecord[]` | Yes | - |
| `notes` | `Note[]` | Yes | - |
| `contacts` | `Contact[]` | Yes | - |
| `transcripts` | `Transcript[]` | Yes | - |
| `tasks` | `Task[]` | Yes | - |
| `appointments` | `Appointment[]` | Yes | - |
| `invoices` | `Invoice[]` | Yes | - |
| `services` | `ServiceSelection[]` | Yes | - |
| `scfLinks` | `{ id: string; url: string; createdAt: string; status: 'Pending' | 'Accepted'; acceptedAt?: string }[]` | Yes | - |
| `lastSelectionType` | `'services' | 'products' | 'both' | null` | Yes | - |
| `checkinQuestions` | `CheckinQuestion[]` | Yes | - |
| `discoveryData` | `DiscoveryData` | Yes | - |
| `contactCount` | `number` | Yes | - |
| `address` | `Address` | Yes | - |
| `state` | `string` | Yes | - |
| `street` | `string` | Yes | - |
| `zip` | `string` | Yes | - |
| `latitude` | `number` | Yes | - |
| `longitude` | `number` | Yes | - |
| `lpoPlusStatus` | `string` | Yes | - |
| `lpoPlusProvisionedAt` | `string` | Yes | - |
| `lpoPlusPasswordResetAt` | `string` | Yes | - |
| `defaultPassword` | `string` | Yes | - |
| `franchisee` | `string` | Yes | - |
| `franchisee_id` | `string` | Yes | - |
| `websiteUrl` | `string` | Yes | - |
| `inboundPageUrl` | `string` | Yes | - |
| `pageURL` | `string` | Yes | - |
| `interestedIn` | `string` | Yes | - |
| `industryCategory` | `string` | Yes | - |
| `industrySubCategory` | `string` | Yes | - |
| `salesRepAssigned` | `string` | Yes | - |
| `salesRepAssignedCalendlyLink` | `string` | Yes | - |
| `dialerAssigned` | `string` | Yes | - |
| `fieldRepAssigned` | `string` | Yes | - |
| `accountManagerAssigned` | `string` | Yes | - |
| `campaign` | `string` | Yes | - |
| `weeklyParcels` | `string` | Yes | - |
| `customerServiceEmail` | `string` | Yes | - |
| `customerPhone` | `string` | Yes | - |
| `abn` | `string` | Yes | - |
| `city` | `string` | Yes | - |
| `dynamicScfUrl` | `string` | Yes | - |
| `standingOrderFormLink` | `string` | Yes | - |
| `localMileRegistrationLink` | `string` | Yes | - |
| `localMileActivationLink` | `string` | Yes | - |
| `aiScore` | `number` | Yes | - |
| `aiReason` | `string` | Yes | - |
| `salesRecordInternalId` | `string` | Yes | - |
| `commRegId` | `string` | Yes | - |
| `companyDescription` | `string` | Yes | - |
| `wasOutbound` | `boolean` | Yes | - |
| `wasInbound` | `boolean` | Yes | - |
| `originalBucket` | `string` | Yes | - |
| `assignedToDialerAt` | `string` | Yes | - |
| `leadType` | `'Product' | 'Service' | 'Service & Product' | string` | Yes | - |
| `multiSiteLocations` | `Address[]` | Yes | - |
| `additionalAddresses` | `TaggedAddress[]` | Yes | - |
| `bankLocationId` | `string` | Yes | - |
| `bankLocationName` | `string` | Yes | - |
| `partnerLocationId` | `string` | Yes | - |
| `partnerLocationName` | `string` | Yes | - |
| `bankLocation` | `any` | Yes | - |
| `partnerLocation` | `any` | Yes | - |
| `parentLeadId` | `string` | Yes | - |
| `isParentLead` | `boolean` | Yes | - |
| `isChildLead` | `boolean` | Yes | - |
| `isLpoLead` | `boolean` | Yes | - |
| `lpoLeadId` | `string` | Yes | - |
| `linkedLpoLeadId` | `string` | Yes | - |
| `lpoLeadName` | `string` | Yes | - |
| `lpoName` | `string` | Yes | - |
| `createdParentLeadId` | `string` | Yes | - |
| `createdChildLeadIds` | `string[]` | Yes | - |
| `source` | `string` | Yes | - |
| `ampoRate` | `number` | Yes | - |
| `pmpoRate` | `number` | Yes | - |
| `packageRate` | `number` | Yes | - |
| `additionalBagRate` | `number` | Yes | - |
| `servicesAndRates` | `any` | Yes | - |
| `demoCompleted` | `'Yes'` | Yes | - |
| `fieldSales` | `boolean` | Yes | - |
| `serviceType` | `string` | Yes | - |
| `selectedServiceOption` | `string` | Yes | - |
| `rate` | `number` | Yes | - |
| `initialNotes` | `string` | Yes | - |
| `lastProspected` | `string` | Yes | - |
| `dateLeadEntered` | `string` | Yes | - |
| `dateRegistrationSent` | `string` | Yes | - |
| `registrationSentAt` | `string` | Yes | - |
| `localMileRegistrationSentAt` | `string` | Yes | - |
| `dateLocalmileAccepted` | `string` | Yes | - |
| `localMileAcceptedAt` | `string` | Yes | - |
| `customerSource` | `string` | Yes | - |
| `visitNoteID` | `string` | Yes | - |
| `syncedWithNetSuite` | `boolean` | Yes | - |
| `netSuiteSyncStatus` | `'synced' | 'failed' | 'pending' | string` | Yes | - |
| `netSuiteSyncError` | `string | null` | Yes | - |
| `netSuiteSyncAttemptCount` | `number` | Yes | - |
| `cancellationTheme` | `string` | Yes | - |
| `cancellationThemeId` | `string` | Yes | - |
| `cancellationCategory` | `string` | Yes | - |
| `cancellationWhyId` | `string` | Yes | - |
| `cancellationReason` | `string` | Yes | - |
| `cancellationReasonId` | `string` | Yes | - |
| `cancellationdate` | `string` | Yes | - |
| `customerStatus` | `string` | Yes | - |
| `cancellationRequested` | `boolean` | Yes | - |
| `serviceChangeRequested` | `boolean` | Yes | - |
| `lastServiceChangeRequestDate` | `string` | Yes | - |
| `netsuiteLeadStatus` | `string` | Yes | - |
| `droppedOffBrochures` | `boolean` | Yes | - |
| `hadConversationWithContact` | `boolean` | Yes | - |
| `isPriority` | `boolean` | Yes | - |
| `outsideTerritoryConfirmed` | `boolean` | Yes | - |
| `franchiseeReviewPending` | `boolean` | Yes | - |
| `isZeeCreated` | `boolean` | Yes | - |
| `leadSource` | `string` | Yes | - |
| `createdByRole` | `string` | Yes | - |
| `createdByUid` | `string` | Yes | - |
| `bucket` | `LeadBucket` | Yes | - |
| `attemptCount` | `number` | Yes | - |
| `totalCalls` | `number` | Yes | - |
| `inboundDetails` | `InboundDetails` | Yes | - |
| `attribution` | `Record<string, any>` | Yes | - |
| `marketingChannel` | `string` | Yes | - |
| `posthogSessionUrl` | `string` | Yes | - |
| `isDuplicate` | `boolean` | Yes | - |
| `ignoreDuplicateWarning` | `boolean` | Yes | - |
| `similarLeads` | `string[]` | Yes | - |
| `duplicateConfidence` | `'High' | 'Medium' | 'Low' | 'None'` | Yes | - |
| `duplicateMatchReasons` | `string[]` | Yes | - |
| `geofenceRadius` | `number` | Yes | - |
| `velocityScore` | `number` | Yes | - |
| `lastAutomatedProgression` | `string` | Yes | - |
| `behavioralScore` | `number` | Yes | - |
| `demographicScore` | `number` | Yes | - |
| `totalScore` | `number` | Yes | - |
| `customerSuccessAssigned` | `string` | Yes | - |
| `activeJourneys` | `string[]` | Yes | - |
| `hasMyPostBusinessAccount` | `'Yes' | 'No'` | Yes | - |
| `parcelVolumeGreaterThan20` | `'Yes' | 'No'` | Yes | - |
| `currentCarrier` | `string` | Yes | - |
| `nextBestAction` | `string` | Yes | - |
| `marketingLists` | `string[]` | Yes | - |
| `localMileTrialsRemaining` | `number` | Yes | - |
| `localMileTrialStopped` | `boolean` | Yes | - |
| `localMileTrialCancelled` | `boolean` | Yes | - |
| `trialCancelledAt` | `string` | Yes | - |
| `lastLocalMileJobCreatedAt` | `string` | Yes | - |
| `localMileNudgeCount` | `number` | Yes | - |
| `lastLocalMileNudgeSentAt` | `string` | Yes | - |
| `localMileTnCAcceptedAt` | `string` | Yes | - |
| `localMileTermsAccepted` | `boolean | string` | Yes | - |
| `localMileTermsAcceptedAt` | `string` | Yes | - |
| `hasCreatedJob` | `boolean` | Yes | - |
| `firstJobCreatedAt` | `string` | Yes | - |
| `jobCount` | `number` | Yes | - |
| `potentialFranchisees` | `string[]` | Yes | - |
| `bucketHistory` | `BucketHistory[]` | Yes | - |
| `statusHistory` | `StatusHistory[]` | Yes | - |
| `initialAppointmentBucket` | `string` | Yes | - |
| `companyInsights` | `CompanyInsight[]` | Yes | - |
| `postalAddress` | `Address` | Yes | - |
| `billingAddressType` | `'site' | 'postal' | 'custom' | string` | Yes | - |
| `billingAddress` | `Address` | Yes | - |
| `csCalled` | `boolean` | Yes | - |
| `lastContactedDate` | `string` | Yes | - |
| `lastCsOutcome` | `string` | Yes | - |
| `lastCsNotes` | `string` | Yes | - |
| `lastCsAuthor` | `string` | Yes | - |
| `lastCsContactedDate` | `string` | Yes | - |
| `csOutcomeHistory` | `Array<{
    outcome: string;
    notes?: string;
    author?: string;
    date: string;
    salesRecordInternalId?: string;
  }>` | Yes | - |
| `bookingUrlId` | `string` | Yes | - |
| `bookingContactId` | `string` | Yes | - |
| `generalBookingUrlId` | `string` | Yes | - |
| `csCallCount` | `number` | Yes | - |
| `sofLink` | `string` | Yes | - |
| `sofDetails` | `{
    signatureDataUrl: string;
    position: string;
    date: string;
    signedAt: string;
  }` | Yes | - |
| `providedShipMateOnboarding` | `boolean` | Yes | - |
| `followUpDate` | `string` | Yes | - |
| `prospectPlusId` | `string` | Yes | - |
| `chosenPremiumPlan` | `string` | Yes | - |
| `chosenExpressPlan` | `string` | Yes | - |
| `lodgementEvidence` | `string` | Yes | - |
| `shipperEvidence` | `string` | Yes | - |
| `shopifyDetected` | `string` | Yes | - |
| `prospectSummary` | `string` | Yes | - |
| `xeroDetected` | `string` | Yes | - |
| `apRelationship` | `string` | Yes | - |
| `suggestedProduct` | `string` | Yes | - |
| `suggestedOpener` | `string` | Yes | - |
| `suggestedPersonalisation` | `string` | Yes | - |
| `pricing_table` | `PricingTableRow[]` | Yes | - |
| `suburb_mapping` | `LeadSuburbMapping[]` | Yes | - |
| `quoteSentAt` | `string` | Yes | - |
| `signedUpAt` | `string` | Yes | - |
| `scfAcceptedAt` | `string` | Yes | - |
| `trialStartedAt` | `string` | Yes | - |
| `isFromCompaniesCollection` | `boolean` | Yes | - |
| `snoozedUntil` | `string` | Yes | - |
| `lpoPlusOpportunity` | `boolean` | Yes | - |
| `scfs` | `any[]` | Yes | - |
| `isExported` | `boolean` | Yes | - |
| `exportedAt` | `string` | Yes | - |
| `exportedBy` | `string` | Yes | - |
| `exportedToCompany` | `string` | Yes | - |
| `exportBatchId` | `string` | Yes | - |
| `exportHistory` | `Array<{
    exportedAt: string;
    exportedBy: string;
    exportedToCompany: string;
    batchId: string;
  }>` | Yes | - |

---

### `INTERFACE` `LeadExportBatch`

- **Line:** 781

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `batchId` | `string` | No | - |
| `exportedToCompany` | `string` | No | - |
| `exportedBy` | `string` | No | - |
| `exportedByUid` | `string` | No | - |
| `leadCount` | `number` | No | - |
| `exportedAt` | `string` | No | - |
| `leadIds` | `string[]` | No | - |
| `notes` | `string` | Yes | - |

---

### `INTERFACE` `CompanyInsight`

- **Line:** 793

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `companyName` | `string` | Yes | - |
| `industry` | `string` | Yes | - |
| `productsServices` | `string` | Yes | - |
| `targetAudience` | `string` | Yes | - |
| `valueProposition` | `string` | Yes | - |
| `shippingLogisticsNeeds` | `string` | Yes | - |
| `talkingPoints` | `string[]` | Yes | - |
| `rawSummary` | `string` | Yes | - |
| `extractedEmails` | `string[]` | Yes | - |
| `extractedPhones` | `string[]` | Yes | - |
| `scannedAt` | `string` | No | - |

---

### `INTERFACE` `VisitEvent`

- **Line:** 809

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `leadId` | `string` | No | - |
| `userId` | `string` | No | - |
| `timestamp` | `string` | No | - |
| `eventType` | `'check-in' | 'check-out'` | No | - |
| `coordinates` | `{ lat: number; lng: number }` | No | - |

---

### `INTERFACE` `Playbook`

- **Line:** 818

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `stage` | `LeadStatus` | No | - |
| `script` | `string` | No | - |
| `mandatoryFields` | `string[]` | No | - |
| `resources` | `{ title: string; url: string }[]` | No | - |

---

### `INTERFACE` `JourneyNode`

- **Line:** 826

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `type` | `'trigger' | 'action' | 'wait' | 'condition'` | No | - |
| `config` | `Record<string, any>` | No | - |

---

### `INTERFACE` `JourneyEdge`

- **Line:** 832

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `source` | `string` | No | - |
| `target` | `string` | No | - |
| `condition` | `string` | Yes | - |

---

### `INTERFACE` `Journey`

- **Line:** 839

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `status` | `'draft' | 'active' | 'paused'` | No | - |
| `nodes` | `JourneyNode[]` | No | - |
| `edges` | `JourneyEdge[]` | No | - |

---

### `INTERFACE` `InteractionLog`

- **Line:** 847

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `leadId` | `string` | No | - |
| `type` | `'email-open' | 'email-click' | 'website-visit'` | No | - |
| `timestamp` | `string` | No | - |
| `metadata` | `Record<string, any>` | No | - |

---

### `TYPE` `MapLead`

- **Line:** 855
- **Signature:** `Pick<Lead, 'id' | 'companyName' | 'status' | 'address' | 'latitude' | 'longitude' | 'dialerAssigned' | 'fieldSales' | 'lastProspected' | 'industryCategory' | 'websiteUrl' | 'visitNoteID' | 'franchisee' | 'customerServiceEmail' | 'customerPhone' | 'accountManagerAssigned' | 'services' | 'bucket'> & { isCompany: boolean; isProspect?: boolean }`

---

### `INTERFACE` `SuburbMapping`

- **Line:** 857

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `suburbs` | `string` | No | - |
| `post_code` | `string` | No | - |
| `state` | `string` | No | - |
| `primary_op` | `string[]` | No | - |
| `secondary_op` | `string | any[] | Record<string, any> | null` | Yes | - |
| `next_day` | `boolean | null` | No | - |
| `parent_lpo_id` | `string` | Yes | - |
| `lat` | `number` | Yes | - |
| `lng` | `number` | Yes | - |

---

### `INTERFACE` `StorableRoute`

- **Line:** 869

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | - |
| `userId` | `string` | No | - |
| `userName` | `string` | Yes | - |
| `name` | `string` | No | - |
| `createdAt` | `string` | No | - |
| `leads` | `{ id: string; companyName: string; latitude: number; longitude: number; address: Address; }[]` | No | - |
| `travelMode` | `google.maps.TravelMode` | No | - |
| `startPoint` | `string` | Yes | - |
| `endPoint` | `string` | Yes | - |
| `directions` | `string` | Yes | - |
| `scheduledDate` | `string` | Yes | - |
| `totalDistance` | `string | null` | Yes | - |
| `totalDuration` | `string | null` | Yes | - |
| `isProspectingArea` | `boolean` | Yes | - |
| `isUnassigned` | `boolean` | Yes | - |
| `notes` | `string` | Yes | - |
| `streets` | `{ place_id: string; description: string; latitude: number; longitude: number; }[]` | Yes | - |
| `shape` | `{
    type: 'rectangle' | 'polygon';
    bounds?: google.maps.LatLngBoundsLiteral;
    paths?: google.maps.LatLngLiteral[][];
  }` | Yes | - |
| `status` | `'Active' | 'Completed' | 'Pending Approval' | 'Approved' | 'Reviewed'` | Yes | - |
| `imageUrls` | `string[]` | Yes | - |

---

### `TYPE` `SavedRoute`

- **Line:** 896
- **Signature:** `Omit<StorableRoute, 'directions'> & {
  directions: google.maps.DirectionsResult | null;
  userName: string;
}`

---

### `INTERFACE` `SuburbMapping`

- **Line:** 901

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `suburbs` | `string` | No | - |
| `post_code` | `string` | No | - |
| `state` | `string` | No | - |
| `primary_op` | `string[]` | No | - |
| `secondary_op` | `string | any[] | Record<string, any> | null` | Yes | - |
| `next_day` | `boolean | null` | No | - |
| `parent_lpo_id` | `string` | Yes | - |

---

### `INTERFACE` `PartnerLocation`

- **Line:** 911

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `internalId` | `string` | No | - |
| `name` | `string` | No | - |
| `address1` | `string` | Yes | - |
| `address2` | `string` | Yes | - |
| `state` | `string` | No | - |
| `suburb` | `string` | No | - |
| `postCode` | `string` | No | - |
| `phone` | `string` | Yes | - |
| `siteAccessCode` | `string` | Yes | - |
| `locationType` | `string` | No | - |
| `updatedAt` | `string` | No | - |

---

### `INTERFACE` `FranchiseeAgreementRecord`

- **Line:** 925

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `fileName` | `string` | No | - |
| `storagePath` | `string` | Yes | - |
| `downloadUrl` | `string` | Yes | - |
| `uploadedAt` | `string` | No | - |
| `uploadedByUid` | `string` | Yes | - |
| `uploadedByName` | `string` | Yes | - |
| `extractedData` | `{
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
  }` | Yes | - |

---

### `INTERFACE` `Franchisee`

- **Line:** 961

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | - |
| `internalId` | `string` | No | - |
| `prospectPlusId` | `string` | Yes | - |
| `name` | `string` | No | - |
| `mainContact` | `string` | No | - |
| `email` | `string` | No | - |
| `mobile` | `string` | No | - |
| `isCompanyOwned` | `boolean` | No | - |
| `commissionRate` | `number` | No | - |
| `salesRepAssigned` | `string` | No | - |
| `activeProjects` | `string[]` | No | - |
| `mpExpressActivated` | `boolean` | No | - |
| `territoryRaw` | `string` | No | - |
| `territoryJson` | `SuburbMapping[]` | No | - |
| `tgeSuburbsJSON` | `SuburbMapping[]` | Yes | - |
| `ironMountainSuburbsJson` | `SuburbMapping[]` | Yes | - |
| `mpStarTrackActivated` | `boolean` | No | - |
| `starTrackSuburbRaw` | `string` | No | - |
| `starTrackSuburbsJson` | `SuburbMapping[]` | No | - |
| `ausPostSuburbsRaw` | `string` | No | - |
| `ausPostSuburbsJson` | `SuburbMapping[]` | No | - |
| `campaignPriorities` | `{ campaign: string; priority: 'High' | 'Medium' | 'Low' }[]` | Yes | - |
| `nominatedPostOffice` | `string` | Yes | - |
| `nominatedPostOfficeText` | `string` | Yes | - |
| `starTrackLodgementPoints` | `any[] | string` | Yes | - |
| `mpExpressLodgementPoints` | `any[] | string` | Yes | - |
| `currentOwnerUserId` | `string` | Yes | - |
| `linkedUserIds` | `string[]` | Yes | - |
| `linkedUserEmail` | `string` | Yes | - |
| `agreements` | `FranchiseeAgreementRecord[]` | Yes | - |
| `ownershipHistory` | `{
    userId: string;
    ownerName?: string;
    sharedEmail?: string;
    personalEmail?: string;
    startDate?: string;
    endDate?: string;
  }[]` | Yes | - |
| `owners` | `Array<{
    userId: string;
    name: string;
    email: string;
    personalEmail?: string;
    abn?: string;
    bankDetails?: { bsb?: string; accountNumber?: string; accountName?: string };
    addressDetails?: any;
  }>` | Yes | - |
| `investors` | `Array<{
    userId: string;
    name: string;
    email: string;
    personalEmail?: string;
    abn?: string;
    bankDetails?: { bsb?: string; accountNumber?: string; accountName?: string };
    addressDetails?: any;
  }>` | Yes | - |
| `linkedUsers` | `Array<{
    userId: string;
    name: string;
    email: string;
    personalEmail?: string;
    abn?: string;
    bankDetails?: { bsb?: string; accountNumber?: string; accountName?: string };
    addressDetails?: any;
    relationship: 'owner' | 'investor';
  }>` | Yes | - |

---

### `INTERFACE` `ProspectEmailLog`

- **Line:** 1030

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `sentAt` | `string` | No | - |
| `sentByUid` | `string` | No | - |
| `sentByName` | `string` | No | - |
| `subject` | `string` | No | - |
| `recipient` | `string` | No | - |
| `customMessage` | `string` | Yes | - |
| `attachments` | `Array<{
    name: string;
    url?: string;
    size?: number;
  }>` | No | - |
| `status` | `'Sent' | 'Failed'` | No | - |
| `error` | `string` | Yes | - |

---

### `INTERFACE` `KeyFactSheetHistoryColumn`

- **Line:** 1047

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `label` | `string` | No | - |
| `occurrences` | `{
    transferred?: number;
    ceased?: number;
    terminatedFranchisor?: number;
    terminatedFranchisee?: number;
    notExtended?: number;
    boughtBack?: number;
    acquiredByFranchisor?: number;
  }` | No | - |

---

### `INTERFACE` `KeyFactSheetData`

- **Line:** 1061

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `publicToken` | `string` | No | - |
| `sentAt` | `string` | Yes | - |
| `sentByUid` | `string` | Yes | - |
| `sentByName` | `string` | Yes | - |
| `dateBusinessStarted` | `string` | Yes | - |
| `numberOfOwners` | `number | string` | Yes | - |
| `reasonForSale` | `string` | Yes | - |
| `last12MonthsServiceRevenue` | `number | string` | Yes | - |
| `franchiseFeePercent` | `number | string` | Yes | - |
| `marketingLevyPercent` | `number | string` | Yes | - |
| `last12MonthsExpressRevenue` | `number | string` | Yes | - |
| `askingPrice` | `number | string` | Yes | - |
| `askingPriceText` | `string` | Yes | - |
| `totalDailyRunTimeHours` | `string` | Yes | - |
| `morningShiftHours` | `string` | Yes | - |
| `afternoonShiftHours` | `string` | Yes | - |
| `franchiseTermYears` | `string` | Yes | - |
| `territoryMapUrl` | `string` | Yes | - |
| `franchisorName` | `string` | Yes | - |
| `yearsInOperation` | `string` | Yes | - |
| `financialViability` | `'Yes' | 'No'` | Yes | - |
| `currentLegalProceedings` | `'Yes' | 'No'` | Yes | - |
| `finalJudgments` | `'Yes' | 'No'` | Yes | - |
| `disputeMediationPercent` | `string` | Yes | - |
| `franchiseeOwnedCount` | `number | string` | Yes | - |
| `corporateOwnedCount` | `number | string` | Yes | - |
| `historyColumns` | `KeyFactSheetHistoryColumn[]` | Yes | - |
| `historyFy2024` | `{
    transferred?: number | string;
    ceased?: number | string;
    terminatedFranchisor?: number | string;
    terminatedFranchisee?: number | string;
    notExtended?: number | string;
    boughtBack?: number | string;
    acquiredByFranchisor?: number | string;
  }` | Yes | - |
| `historyFy2023` | `{
    transferred?: number | string;
    ceased?: number | string;
    terminatedFranchisor?: number | string;
    terminatedFranchisee?: number | string;
    notExtended?: number | string;
    boughtBack?: number | string;
    acquiredByFranchisor?: number | string;
  }` | Yes | - |
| `historyFy2022` | `{
    transferred?: number | string;
    ceased?: number | string;
    terminatedFranchisor?: number | string;
    terminatedFranchisee?: number | string;
    notExtended?: number | string;
    boughtBack?: number | string;
    acquiredByFranchisor?: number | string;
  }` | Yes | - |
| `territoryName` | `string` | Yes | - |
| `territoryDetailsSelected` | `string[]` | Yes | - |
| `territoryOtherDetails` | `string` | Yes | - |
| `canFranchisorChangeTerritory` | `'Yes' | 'No'` | Yes | - |
| `competitionTypesSelected` | `string[]` | Yes | - |
| `canFranchiseeSellOnline` | `'Yes' | 'No'` | Yes | - |
| `leaseInterest` | `'Yes' | 'No'` | Yes | - |
| `supplierRestrictions` | `'Yes' | 'No'` | Yes | - |
| `franchisorInterestInSuppliers` | `'Yes' | 'No'` | Yes | - |
| `franchisorRebates` | `'Yes' | 'No'` | Yes | - |
| `preliminaryPaymentRequired` | `string` | Yes | - |
| `setupCostsText` | `string` | Yes | - |
| `ongoingPaymentsText` | `string` | Yes | - |
| `otherPaymentsText` | `string` | Yes | - |
| `franchiseFee` | `number | string` | Yes | - |
| `trainingFee` | `number | string` | Yes | - |
| `transactionFee` | `number | string` | Yes | - |
| `vehicleCostRange` | `string` | Yes | - |
| `equipmentCostRange` | `string` | Yes | - |
| `insuranceCostRange` | `string` | Yes | - |
| `regoCostRange` | `string` | Yes | - |
| `workingCapitalRange` | `string` | Yes | - |
| `legalAccountingRange` | `string` | Yes | - |
| `marketingFundContribution` | `string` | Yes | - |
| `marketingFeePercent` | `number | string` | Yes | - |
| `administrationFeePercent` | `number | string` | Yes | - |
| `canUnilateralVariation` | `'Yes' | 'No'` | Yes | - |
| `historicalEarningsIncluded` | `'Yes' | 'No'` | Yes | - |
| `projectedEarningsIncluded` | `'Yes' | 'No'` | Yes | - |
| `endOfAgreementClauseDetails` | `string` | Yes | - |
| `agreementTermYears` | `string` | Yes | - |
| `renewalOptionSelected` | `string[]` | Yes | - |
| `franchisorBuysUnsoldStock` | `'Yes' | 'No'` | Yes | - |
| `goodwillCompensation` | `'Yes' | 'No'` | Yes | - |
| `restraintOfTradeClause` | `'Yes' | 'No'` | Yes | - |
| `notes` | `string` | Yes | - |
| `documentDate` | `string` | Yes | - |

---

### `INTERFACE` `ProspectDocument`

- **Line:** 1177

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `url` | `string` | No | - |
| `uploadedAt` | `string` | No | - |
| `size` | `number` | Yes | - |
| `type` | `string` | Yes | - |

---

### `INTERFACE` `ConfidentialityDeedData`

- **Line:** 1186

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `publicToken` | `string` | No | - |
| `status` | `'not_started' | 'sent' | 'signed_online' | 'uploaded'` | No | - |
| `sentAt` | `string` | Yes | - |
| `sentToEmail` | `string` | Yes | - |
| `signedAt` | `string` | Yes | - |
| `signerName` | `string` | Yes | - |
| `signerEmail` | `string` | Yes | - |
| `signerAddress` | `string` | Yes | - |
| `signatureDataUrl` | `string` | Yes | - |
| `ipAddress` | `string` | Yes | - |
| `documents` | `ProspectDocument[]` | Yes | - |
| `agreementDate` | `string` | Yes | - |
| `providerName` | `string` | Yes | - |
| `providerAcn` | `string` | Yes | - |
| `providerAddress` | `string` | Yes | - |
| `providerEmail` | `string` | Yes | - |
| `providerContact` | `string` | Yes | - |
| `recipientName` | `string` | Yes | - |
| `recipientAcn` | `string` | Yes | - |
| `recipientAbn` | `string` | Yes | - |
| `recipientShortName` | `string` | Yes | - |
| `recipientAddress` | `string` | Yes | - |
| `recipientEmail` | `string` | Yes | - |
| `recipientContact` | `string` | Yes | - |
| `purpose` | `string` | Yes | - |

---

### `INTERFACE` `EOIData`

- **Line:** 1216

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `publicToken` | `string` | No | - |
| `status` | `'not_started' | 'sent' | 'signed_online' | 'uploaded'` | No | - |
| `sentAt` | `string` | Yes | - |
| `signedAt` | `string` | Yes | - |
| `signerName` | `string` | Yes | - |
| `signerEmail` | `string` | Yes | - |
| `signatureDataUrl` | `string` | Yes | - |
| `documents` | `ProspectDocument[]` | Yes | - |
| `entityStructure` | `'SOLE TRADER' | 'PARTNERSHIP' | 'PTY LTD COMPANY' | 'LTD COMPANY'` | Yes | - |
| `companyName` | `string` | Yes | - |
| `abn` | `string` | Yes | - |
| `registeredAddress` | `string` | Yes | - |
| `businessAddress` | `string` | Yes | - |
| `phoneHome` | `string` | Yes | - |
| `phoneBusiness` | `string` | Yes | - |
| `facsimileNo` | `string` | Yes | - |
| `applicant1Name` | `string` | Yes | - |
| `applicant1Position` | `'SOLE TRADER' | 'PARTNER' | 'DIRECTOR' | 'SHAREHOLDER' | string` | Yes | - |
| `applicant1PrivateAddress` | `string` | Yes | - |
| `applicant1PhoneHome` | `string` | Yes | - |
| `applicant1PhoneBusiness` | `string` | Yes | - |
| `applicant1Email` | `string` | Yes | - |
| `applicant1DriversLicence` | `string` | Yes | - |
| `applicant1DriversLicencePlace` | `string` | Yes | - |
| `driversLicence` | `string` | Yes | - |
| `driversLicencePlaceOfIssue` | `string` | Yes | - |
| `applicant1DateOfBirth` | `string` | Yes | - |
| `applicant1MaritalStatus` | `string` | Yes | - |
| `applicant1SpouseName` | `string` | Yes | - |
| `applicant1SpouseAge` | `string` | Yes | - |
| `applicant1ChildrenAges` | `string` | Yes | - |
| `applicant1SpouseActive` | `boolean | string` | Yes | - |
| `applicant1OwnershipPercent` | `number | string` | Yes | - |
| `applicant1OtherDirectorships` | `string` | Yes | - |
| `applicant1FormerAddress` | `string` | Yes | - |
| `applicant1HealthStatus` | `'GOOD' | 'FAIR' | 'POOR' | string` | Yes | - |
| `applicant1PhysicalLimitations` | `string` | Yes | - |
| `applicant1Qualifications` | `string` | Yes | - |
| `applicant1SalesTraining` | `string` | Yes | - |
| `hasApplicant2` | `boolean` | Yes | - |
| `applicant2Name` | `string` | Yes | - |
| `applicant2Position` | `'SOLE TRADER' | 'PARTNER' | 'DIRECTOR' | 'SHAREHOLDER' | string` | Yes | - |
| `applicant2PrivateAddress` | `string` | Yes | - |
| `applicant2PhoneHome` | `string` | Yes | - |
| `applicant2PhoneBusiness` | `string` | Yes | - |
| `applicant2Email` | `string` | Yes | - |
| `applicant2DriversLicence` | `string` | Yes | - |
| `applicant2DriversLicencePlace` | `string` | Yes | - |
| `applicant2DateOfBirth` | `string` | Yes | - |
| `applicant2MaritalStatus` | `string` | Yes | - |
| `applicant2SpouseName` | `string` | Yes | - |
| `applicant2SpouseAge` | `string` | Yes | - |
| `applicant2ChildrenAges` | `string` | Yes | - |
| `applicant2SpouseActive` | `boolean | string` | Yes | - |
| `applicant2OwnershipPercent` | `number | string` | Yes | - |
| `applicant2OtherDirectorships` | `string` | Yes | - |
| `applicant2FormerAddress` | `string` | Yes | - |
| `applicant2HealthStatus` | `'GOOD' | 'FAIR' | 'POOR' | string` | Yes | - |
| `applicant2PhysicalLimitations` | `string` | Yes | - |
| `applicant2Qualifications` | `string` | Yes | - |
| `applicant2SalesTraining` | `string` | Yes | - |
| `trustName` | `string` | Yes | - |
| `trustEstablishedDate` | `string` | Yes | - |
| `trustBeneficiaries` | `string` | Yes | - |
| `employmentHistory` | `Array<{
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
  }>` | Yes | - |
| `references` | `Array<{
    name: string;
    phone: string;
    position: string;
    company: string;
    nature: string; // e.g. Trade 1, Trade 2, Personal
  }>` | Yes | - |
| `convictionPlaceYear` | `string` | Yes | - |
| `convictionType` | `string` | Yes | - |
| `convictionPenalty` | `string` | Yes | - |
| `plaintiffName` | `string` | Yes | - |
| `defendantName` | `string` | Yes | - |
| `yearIssued` | `string` | Yes | - |
| `yearConcluded` | `string` | Yes | - |
| `subjectMatter` | `string` | Yes | - |
| `judgmentNatureQuantum` | `string` | Yes | - |
| `convictions` | `string` | Yes | - |
| `legalProceedings` | `string` | Yes | - |
| `incSalary` | `number | string` | Yes | - |
| `incBonus` | `number | string` | Yes | - |
| `incDividends` | `number | string` | Yes | - |
| `incRealEstate` | `number | string` | Yes | - |
| `incOther` | `number | string` | Yes | - |
| `incOtherSpecify` | `string` | Yes | - |
| `monthlyIncome` | `number | string` | Yes | - |
| `expMortgage` | `number | string` | Yes | - |
| `expLoans` | `number | string` | Yes | - |
| `expCreditCard` | `number | string` | Yes | - |
| `expPhoneElectric` | `number | string` | Yes | - |
| `expSchoolFees` | `number | string` | Yes | - |
| `expRatesTaxes` | `number | string` | Yes | - |
| `expInsurance` | `number | string` | Yes | - |
| `expOther` | `number | string` | Yes | - |
| `expOtherSpecify` | `string` | Yes | - |
| `monthlyExpenditure` | `number | string` | Yes | - |
| `astRealEstate` | `number | string` | Yes | - |
| `astCash` | `number | string` | Yes | - |
| `astBusinessNetValue` | `number | string` | Yes | - |
| `astSharesBonds` | `number | string` | Yes | - |
| `astOther` | `number | string` | Yes | - |
| `totalAssets` | `number | string` | Yes | - |
| `liabRealEstateMortgages` | `number | string` | Yes | - |
| `liabNotesLoansInst` | `number | string` | Yes | - |
| `liabFriendsRelatives` | `number | string` | Yes | - |
| `liabOtherDebts` | `number | string` | Yes | - |
| `totalLiabilities` | `number | string` | Yes | - |
| `netWorth` | `number | string` | Yes | - |
| `reasonForPurchase` | `string` | Yes | - |
| `fundingSource` | `string` | Yes | - |
| `fundingType` | `'nab' | 'sole_trader' | 'self_funded' | string` | Yes | - |
| `whySuited` | `string` | Yes | - |
| `similarBusinessExperience` | `boolean | string` | Yes | - |
| `similarBusinessDetails` | `string` | Yes | - |
| `preparedToComply` | `boolean | string` | Yes | - |
| `whySuccessful` | `string` | Yes | - |
| `valuableQualities` | `string` | Yes | - |
| `fullTimeDevotion` | `boolean | string` | Yes | - |
| `operatingHoursDetails` | `string` | Yes | - |
| `mainStrengths` | `string` | Yes | - |
| `mainWeaknesses` | `string` | Yes | - |
| `knowsFranchiseDefinition` | `boolean | string` | Yes | - |
| `franchiseDefinitionExplanation` | `string` | Yes | - |
| `understandsRelationship` | `boolean | string` | Yes | - |
| `relationshipExplanation` | `string` | Yes | - |
| `acceptsGuidance` | `boolean | string` | Yes | - |
| `knowsDefinedTerm` | `boolean | string` | Yes | - |
| `representationsMade` | `string` | Yes | - |
| `understandsIndependentAdvice` | `boolean | string` | Yes | - |
| `requiresFinance` | `boolean | string` | Yes | - |
| `authorizeFinanceSharing` | `boolean | string` | Yes | - |
| `informationStatementConfirmed` | `boolean | string` | Yes | - |
| `informationStatementDate` | `string` | Yes | - |
| `declarationConfirmed` | `boolean` | Yes | - |

---

### `INTERFACE` `DepositDetails`

- **Line:** 1397

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isPaid` | `boolean` | No | - |
| `percentageDeposited` | `number | string` | Yes | - |
| `amountPaid` | `number | string` | Yes | - |
| `paymentDate` | `string` | Yes | - |
| `paymentMethod` | `'EFT' | 'Cheque' | 'Credit Card' | 'Other'` | Yes | - |
| `receiptRef` | `string` | Yes | - |
| `receiptUrl` | `string` | Yes | - |
| `notes` | `string` | Yes | - |
| `loggedByUid` | `string` | Yes | - |
| `loggedByName` | `string` | Yes | - |
| `loggedAt` | `string` | Yes | - |
| `documents` | `ProspectDocument[]` | Yes | - |

---

### `INTERFACE` `RequestForDocsData`

- **Line:** 1412

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `publicToken` | `string` | No | - |
| `status` | `'draft' | 'sent' | 'instructed' | 'completed'` | No | - |
| `sentAt` | `string` | Yes | - |
| `instructedAt` | `string` | Yes | - |
| `instructedBy` | `string` | Yes | - |
| `outgoingFranchiseeName` | `string` | Yes | - |
| `disputeDetails` | `string` | Yes | - |
| `withheldConsent` | `boolean` | Yes | - |
| `incomingEntityName` | `string` | Yes | - |
| `abn` | `string` | Yes | - |
| `registeredAddress` | `string` | Yes | - |
| `email` | `string` | Yes | - |
| `mobile` | `string` | Yes | - |
| `isSoleTrader` | `boolean` | Yes | - |
| `guarantors` | `Array<{ name: string; address: string; email: string; phone: string }>` | Yes | - |
| `manager` | `{ name: string; address: string; email: string; phone: string }` | Yes | - |
| `outgoingLawyer` | `string` | Yes | - |
| `outgoingAccountant` | `string` | Yes | - |
| `incomingLawyer` | `string` | Yes | - |
| `incomingAccountant` | `string` | Yes | - |
| `businessName` | `string` | Yes | - |
| `territoryName` | `string` | Yes | - |
| `territoryMapUrl` | `string` | Yes | - |
| `termYears` | `number` | Yes | - |
| `commencementDate` | `string` | Yes | - |
| `expiryDate` | `string` | Yes | - |
| `fees` | `{
    deposit?: number;
    initialFranchiseFee?: number;
    renewalFee?: number;
    transferFee?: number;
    transactionFee?: number;
    serviceFeePercent?: number;
    marketingLevyPercent?: number;
    techLicenceFee?: number;
    coolOffRetained?: number;
  }` | Yes | - |
| `earningsProvided` | `boolean` | Yes | - |
| `mpFinancingProvided` | `boolean` | Yes | - |
| `capitalExpenditure` | `{
    vehicleRange?: string;
    toolsOfTrade?: string;
  }` | Yes | - |
| `specialConditions` | `string` | Yes | - |
| `reviewedByMatt` | `boolean` | Yes | - |
| `reviewedByMattAt` | `string` | Yes | - |
| `chasedByMaddie` | `boolean` | Yes | - |
| `chasedByMaddieAt` | `string` | Yes | - |

---

### `INTERFACE` `DisclosureDocumentData`

- **Line:** 1463

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `publicToken` | `string` | No | - |
| `status` | `'not_started' | 'dispatched' | 'receipt_signed' | 'completed'` | No | - |
| `dispatchMethod` | `'electronic' | 'postal'` | No | - |
| `dispatchedAt` | `string` | Yes | - |
| `receiptSignedAt` | `string` | Yes | - |
| `receiptBackdated` | `boolean` | Yes | - |
| `receiptUploadedAt` | `string` | Yes | - |
| `receiptPdfUrl` | `string` | Yes | - |
| `signerName` | `string` | Yes | - |
| `signerEmail` | `string` | Yes | - |
| `signerIp` | `string` | Yes | - |
| `earliestFranchiseAgreementExecutionDate` | `string` | Yes | - |

---

### `INTERFACE` `FranchiseAgreementData`

- **Line:** 1478

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `publicToken` | `string` | No | - |
| `status` | `'locked' | 'available' | 'signed_online' | 'wet_signed_uploaded' | 'completed'` | No | - |
| `earliestExecutionDate` | `string` | Yes | - |
| `executedAt` | `string` | Yes | - |
| `signedPdfUrl` | `string` | Yes | - |
| `executionType` | `'digital' | 'wet_ink'` | Yes | - |
| `netSuiteSyncStatus` | `'auto_synced' | 'manual_pending' | 'uploaded'` | Yes | - |
| `signerName` | `string` | Yes | - |
| `signerEmail` | `string` | Yes | - |
| `signerIp` | `string` | Yes | - |
| `signatureDataUrl` | `string` | Yes | - |

---

### `INTERFACE` `NABFundingDetails`

- **Line:** 1492

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `accreditationFundingRequired` | `boolean` | No | - |
| `nabStatus` | `'not_required' | 'pending_michael_confirmation' | 'confirmed' | 'rejected'` | No | - |
| `nabConfirmedBy` | `string` | Yes | - |
| `nabConfirmedAt` | `string` | Yes | - |
| `nabNotes` | `string` | Yes | - |

---

### `INTERFACE` `OperationalTrainingSchedule`

- **Line:** 1500

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `confirmedStartDate` | `string` | Yes | - |
| `salesTraining` | `{
    trainer: 'Aleyna';
    scheduledDate?: string;
    status: 'pending' | 'scheduled' | 'completed';
    alertsSent?: boolean;
  }` | Yes | - |
| `appPustraining` | `{
    trainer: 'Operational Lead';
    scheduledDate?: string;
    status: 'pending' | 'scheduled' | 'completed';
    alertsSent?: boolean;
  }` | Yes | - |
| `billingTraining` | `{
    trainer: 'Popie';
    scheduledDate?: string;
    status: 'pending' | 'scheduled' | 'completed';
    alertsSent?: boolean;
  }` | Yes | - |
| `gregCalendarSynced` | `boolean` | Yes | - |

---

### `INTERFACE` `FranchiseProspect`

- **Line:** 1523

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `firstName` | `string` | No | - |
| `lastName` | `string` | No | - |
| `fullName` | `string` | No | - |
| `email` | `string` | No | - |
| `phone` | `string` | No | - |
| `preferredState` | `string` | Yes | - |
| `preferredTerritory` | `string` | Yes | - |
| `interestedTerritories` | `string[]` | Yes | - |
| `interest` | `string` | Yes | - |
| `vehicle` | `string` | Yes | - |
| `experience` | `string` | Yes | - |
| `employment` | `string` | Yes | - |
| `message` | `string` | Yes | - |
| `status` | `| 'New'
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
    | 'Archived'` | No | - |
| `brochureSent` | `boolean` | Yes | - |
| `brochureSentAt` | `string` | Yes | - |
| `emailLogs` | `ProspectEmailLog[]` | Yes | - |
| `notes` | `Array<{
    id: string;
    text: string;
    createdAt: string;
    createdByName: string;
    createdByUid: string;
  }>` | Yes | - |
| `submittedAt` | `string` | No | - |
| `sourceApp` | `string` | Yes | - |
| `convertedUserId` | `string` | Yes | - |
| `convertedFranchiseeId` | `string` | Yes | - |
| `linkedFranchiseeId` | `string` | Yes | - |
| `linkedFranchiseeName` | `string` | Yes | - |
| `presaleListingId` | `string` | Yes | - |
| `keyFactSheet` | `KeyFactSheetData` | Yes | - |
| `confidentialityDeed` | `ConfidentialityDeedData` | Yes | - |
| `eoiData` | `EOIData` | Yes | - |
| `depositDetails` | `DepositDetails` | Yes | - |
| `requestForDocs` | `RequestForDocsData` | Yes | - |
| `disclosureDocument` | `DisclosureDocumentData` | Yes | - |
| `franchiseAgreement` | `FranchiseAgreementData` | Yes | - |
| `nabFunding` | `NABFundingDetails` | Yes | - |
| `trainingSchedule` | `OperationalTrainingSchedule` | Yes | - |

---

### `INTERFACE` `Operator`

- **Line:** 1585

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `internalId` | `string` | No | - |
| `mainFranchiseeId` | `string` | No | - |
| `linkedFranchiseeIds` | `string[]` | No | - |
| `title` | `string` | No | - |
| `givenNames` | `string` | No | - |
| `surname` | `string` | No | - |
| `contactPhone` | `string` | No | - |
| `contactEmail` | `string` | No | - |
| `operatorStatus` | `string` | No | - |
| `employment` | `string` | No | - |

---

### `INTERFACE` `BrandProfile`

- **Line:** 1598

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `updatedAt` | `string` | No | - |
| `updatedBy` | `string` | No | - |
| `strategy` | `{
    positioning: string;      // Core value proposition mapping
    brandMessaging: string;   // Central brand messaging framework
    offers: string[];         // Key business deliverables array
    icps: Array<{             // Array of Ideal Customer Profiles
      targetIndustry: string;
      companySize: string;
      painPoints: string[];
      valueProposition: string;
    }>;
  }` | No | - |
| `voice` | `{
    toneKeywords: string[];         // e.g., ["Professional", "Urgent"]
    soundsLikeUsExamples: string[]; // "This sounds like us" example snippets
  }` | No | - |
| `designTokens` | `{
    primaryColor: string; // Hex string mapping ProspectPlus (#095c7b)
    accentColor: string;  // Hex string mapping Accent (#eaf143)
    fontFamily: string;   // Typography rule mapping "Inter, sans-serif"
    logoUrl?: string;     // URL for the company logo asset
  }` | No | - |
| `marketingBrainContext` | `{
    topPerformingKeywords: string[];
    learnedBehaviorModifiers: string; // Aggregated text insights from historical data
    lastAnalysisTimestamp: string;
  }` | No | - |

---

### `VARIABLE` `RETENTION_STRATEGIES`

- **Line:** 1638

---

### `TYPE` `RetentionStrategy`

- **Line:** 1647
- **Signature:** `typeof RETENTION_STRATEGIES[number]`

---

### `FUNCTION` `normalizeRetentionStrategy`

- **Line:** 1649
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `strategy` | `string` | No | - | - |

---

### `INTERFACE` `CancellationRequest`

- **Line:** 1674

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `leadId` | `string` | No | - |
| `prospectPlusId` | `string` | Yes | - |
| `netsuiteId` | `string` | Yes | - |
| `companyName` | `string` | No | - |
| `contactName` | `string` | Yes | - |
| `contactEmail` | `string` | Yes | - |
| `contactPhone` | `string` | Yes | - |
| `requestedDate` | `string` | No | - |
| `cancellationDate` | `string` | No | - |
| `trueServiceCancellationDate` | `string` | No | - |
| `cancellationReason` | `string` | No | - |
| `cancellationTheme` | `string` | Yes | - |
| `cancellationThemeId` | `string` | Yes | - |
| `cancellationWhyId` | `string` | Yes | - |
| `cancellationReasonId` | `string` | Yes | - |
| `status` | `'Pending' | 'Saved' | 'Cancelled'` | No | - |
| `saveStrategy` | `RetentionStrategy | string` | Yes | - |
| `originalServices` | `ServiceSelection[]` | No | - |
| `updatedServices` | `ServiceSelection[]` | Yes | - |
| `notes` | `string` | Yes | - |
| `processedBy` | `string` | Yes | - |
| `processedAt` | `string` | Yes | - |
| `requestedBy` | `string` | Yes | - |
| `createdBy` | `string` | Yes | - |
| `createdAt` | `any` | Yes | - |
| `callsCount` | `number` | Yes | - |
| `originalMRR` | `number` | Yes | - |
| `savedMRR` | `number` | Yes | - |
| `isSignedCustomer` | `boolean` | Yes | - |
| `avg3MonthInvoiceMRR` | `number` | Yes | - |
| `newInvoiceMRR` | `number` | Yes | - |
| `serviceRateChanged` | `boolean` | Yes | - |
| `serviceFrequencyChanged` | `boolean` | Yes | - |
| `serviceDeleted` | `boolean` | Yes | - |
| `cancelledByFranchisee` | `boolean` | Yes | - |
| `isFranchiseeCancelled` | `boolean` | Yes | - |
| `cancellationType` | `'GREY' | 'GREEN' | 'YELLOW' | 'RED'` | Yes | - |
| `isReductionTurnedCancellation` | `boolean` | Yes | - |
| `reductionTurnedCancellationNotes` | `string` | Yes | - |
| `franchisee` | `string` | Yes | - |

---

### `TYPE` `CSRequestType`

- **Line:** 1718
- **Signature:** `'change_of_service' | 'cancellation'`

---

### `TYPE` `ServiceChangeCategory`

- **Line:** 1719
- **Signature:** `'price_change' | 'frequency_change' | 'add_service' | 'remove_service'`

---

### `INTERFACE` `CSRequest`

- **Line:** 1721

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `leadId` | `string` | No | - |
| `prospectPlusId` | `string` | Yes | - |
| `netsuiteId` | `string` | Yes | - |
| `companyName` | `string` | No | - |
| `requestType` | `CSRequestType` | No | - |
| `contactName` | `string` | Yes | - |
| `contactEmail` | `string` | Yes | - |
| `contactPhone` | `string` | Yes | - |
| `serviceChangeCategories` | `ServiceChangeCategory[]` | Yes | - |
| `requestedServices` | `ServiceSelection[]` | Yes | - |
| `effectiveDate` | `string` | Yes | - |
| `cancellationTheme` | `string` | Yes | - |
| `cancellationThemeId` | `string` | Yes | - |
| `cancellationWhyId` | `string` | Yes | - |
| `cancellationReason` | `string` | Yes | - |
| `cancellationReasonId` | `string` | Yes | - |
| `cancellationDate` | `string` | Yes | - |
| `trueServiceCancellationDate` | `string` | Yes | - |
| `saveStrategy` | `string` | Yes | - |
| `attachments` | `Array<{
    name: string;
    url: string;
    size?: number;
    type?: string;
    uploadedAt?: string;
  }>` | Yes | - |
| `requestedDate` | `string` | No | - |
| `requestedBy` | `string` | Yes | - |
| `capturedBy` | `string` | Yes | - |
| `notes` | `string` | Yes | - |
| `status` | `'Pending' | 'In Progress' | 'Completed' | 'Saved' | 'Cancelled'` | No | - |
| `originalServices` | `ServiceSelection[]` | Yes | - |
| `updatedServices` | `ServiceSelection[]` | Yes | - |
| `processedBy` | `string` | Yes | - |
| `processedAt` | `string` | Yes | - |
| `createdAt` | `any` | Yes | - |
| `callsCount` | `number` | Yes | - |
| `originalMRR` | `number` | Yes | - |
| `savedMRR` | `number` | Yes | - |

---

### `INTERFACE` `PricingTableRow`

- **Line:** 1772

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `type` | `string` | No | - |
| `delivery_zone` | `string` | No | - |
| `product` | `string` | No | - |
| `price` | `number` | No | - |

---

### `INTERFACE` `SuburbDriver`

- **Line:** 1779

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `ns_id` | `string` | No | - |
| `is_primary` | `boolean` | No | - |

---

### `INTERFACE` `LeadSuburbMapping`

- **Line:** 1784

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `courier` | `string` | No | - |
| `depot_id` | `string | null` | No | - |
| `hub_id` | `string | null` | No | - |
| `only_second_driver` | `boolean` | No | - |
| `broadcast` | `boolean` | No | - |
| `customer_ns_id` | `string` | No | - |
| `postcode` | `string` | No | - |
| `suburb` | `string` | No | - |
| `state` | `string` | No | - |
| `drivers` | `SuburbDriver[]` | No | - |

---

### `TYPE` `OnboardingRequestStatus`

- **Line:** 1797
- **Signature:** `'Pending' | 'Appointment Booked' | 'Completed' | 'Cancelled'`

---

### `TYPE` `OnboardingRequestPriority`

- **Line:** 1798
- **Signature:** `'Standard' | 'Urgent'`

---

### `INTERFACE` `OnboardingAppointmentDetails`

- **Line:** 1800

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `appointmentDate` | `string` | No | - |
| `appointmentType` | `string` | Yes | - |
| `locationOrLink` | `string` | Yes | - |
| `notes` | `string` | Yes | - |
| `scheduledByUid` | `string` | No | - |
| `scheduledByName` | `string` | No | - |
| `scheduledAt` | `string` | No | - |

---

### `INTERFACE` `OnboardingRequest`

- **Line:** 1810

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `leadId` | `string` | No | - |
| `companyId` | `string` | Yes | - |
| `companyName` | `string` | No | - |
| `contactName` | `string` | No | - |
| `contactEmail` | `string` | Yes | - |
| `contactPhone` | `string` | Yes | - |
| `requestedByUid` | `string` | No | - |
| `requestedByName` | `string` | No | - |
| `requestedAt` | `string` | No | - |
| `status` | `OnboardingRequestStatus` | No | - |
| `priority` | `OnboardingRequestPriority` | No | - |
| `assignedToUid` | `string` | No | - |
| `assignedToName` | `string` | No | - |
| `preferredTimeframe` | `string` | Yes | - |
| `notes` | `string` | Yes | - |
| `appointmentDetails` | `OnboardingAppointmentDetails` | Yes | - |
| `completedAt` | `string` | Yes | - |
| `completedByUid` | `string` | Yes | - |
| `completedByName` | `string` | Yes | - |
| `cancelledAt` | `string` | Yes | - |
| `cancellationReason` | `string` | Yes | - |
| `createdAt` | `string` | Yes | - |
| `updatedAt` | `string` | Yes | - |

---

### `INTERFACE` `OnboardingMetricsSummary`

- **Line:** 1837

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `totalRequests` | `number` | No | - |
| `pendingCount` | `number` | No | - |
| `bookedCount` | `number` | No | - |
| `completedCount` | `number` | No | - |
| `cancelledCount` | `number` | No | - |
| `bookingRatePercentage` | `number` | No | - |

---

### `INTERFACE` `LpoLead`

- **Line:** 1846

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | - |
| `prospectPlusId` | `string` | No | - |
| `lpoName` | `string` | No | - |
| `lpoOwnerName` | `string` | No | - |
| `email` | `string` | No | - |
| `phone` | `string` | No | - |
| `address1` | `string` | Yes | - |
| `address2` | `string` | Yes | - |
| `city` | `string` | Yes | - |
| `state` | `string` | Yes | - |
| `postcode` | `string` | Yes | - |
| `lat` | `string | number | null` | Yes | - |
| `lng` | `string | number | null` | Yes | - |
| `notes` | `string` | Yes | - |
| `status` | `string` | No | - |
| `source` | `string` | Yes | - |
| `createdAt` | `any` | Yes | - |
| `updatedAt` | `any` | Yes | - |
| `createdBy` | `string` | Yes | - |
| `createdById` | `string | null` | Yes | - |
| `lpoInternalId` | `string` | Yes | - |
| `inactive` | `boolean` | Yes | - |
| `secondaryInternalId` | `string` | Yes | - |
| `lpoCreatedDate` | `string` | Yes | - |
| `lpoLastModifiedDate` | `string` | Yes | - |
| `linkedNcl` | `string` | Yes | - |
| `rawCustomerName` | `string` | Yes | - |
| `linkedCustomerId` | `string` | Yes | - |
| `companyNameFranchise` | `string` | Yes | - |
| `lpoTier` | `string` | Yes | - |
| `poLevelTier` | `string` | Yes | - |
| `pageURL` | `string` | Yes | - |
| `salesRep` | `string` | Yes | - |
| `validationProvided` | `string` | Yes | - |
| `leadGenerator` | `string` | Yes | - |
| `faceToFace` | `string` | Yes | - |
| `confAndCall` | `string` | Yes | - |
| `acceptedTerms` | `string | boolean` | Yes | - |
| `dynamicScf` | `string` | Yes | - |
| `adhocBooking` | `string` | Yes | - |
| `defaultPassword` | `string` | Yes | - |
| `linkedLeadId` | `string | null` | Yes | - |
| `linkedLeadCompanyName` | `string | null` | Yes | - |
| `linkStatus` | `'Linked' | 'Unlinked'` | Yes | - |
| `isConverted` | `boolean` | Yes | - |
| `conversionStep` | `number` | Yes | - |
| `linkedPartnerLocationId` | `string | null` | Yes | - |
| `linkedPartnerLocationName` | `string | null` | Yes | - |

---

