# Database & Data Model Reference

> **ORM / Engine:** `FIREBASE` • **Total Tables:** 62 • **Total Columns/Fields:** 798

**Schema Sources:** `firestore.rules (and codebase collections)`

## Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    franchisees {
        string id PK
        any name 
        any Fallback 
        any t 
        any fList 
        any list 
        any territoryMapUrl 
        any internalId 
        any existingUserIds 
        Timestamp updatedAt 
    }
    services {
        string id PK
        any leadId 
        any insight 
    }
    users {
        string id PK
        any r 
        Timestamp matchedUser 
        any uid 
        string start 
        string end 
        any meetingBufferMinutes 
        Timestamp defaultMeetingDurationMinutes 
        any minimumBookingNoticeHours 
        any leaveProfile 
        string title 
        string description 
        boolean summary 
        any users 
        any email 
        string s 
        Timestamp matchedData 
        Timestamp updateData 
        boolean fieldSales 
        string customerStatus 
        any name 
        any visitNoteID 
        any franchisee 
        any activeRole 
        string Firestore 
        any targetFranchiseeId 
        Timestamp userOnboardingStates 
        boolean merge 
        Timestamp updates 
        string adminApprovalStatus 
        any pendingAdminRequestId 
        any currentAssignedRoles 
        string displayName 
        Timestamp data 
        any requestorUid 
        string method 
        any body 
        any key 
        Timestamp createdAt 
        boolean isRead 
        any userId 
        Timestamp notificationId 
        any nId 
        any rId 
        any leadIds 
        any directions 
        any rid 
        any src 
        any target 
        any services 
        Timestamp updatedAt 
        any journeyId 
        any author 
        any noteText 
        any keepBucket 
    }
    routes {
        string id PK
        any userId 
        any directions 
        any uid 
        any rid 
    }
    leads {
        string id PK
        string type 
        any lead1985895Doc 
        any missingBothList 
        any missingIdList 
        Timestamp missingDateList 
        string companyName 
        string status 
        string customerStatus 
        string notes 
        Timestamp updatesSummary 
        any assignedTo 
        Timestamp localMileRegistrationLink 
        any prospectPlusId 
        any sofLink 
        any sampleBlankLeads 
        Timestamp matches 
        Timestamp date 
        string author 
        any error 
        any pass 
        any ref 
        any col 
        any currentFs 
        any logoUrl 
        any lastExecutionTime 
        any activeJourneys 
        string title 
        boolean merge 
        any a 
        any appointments 
        Timestamp leadsData 
        Timestamp companiesData 
        Timestamp leadsBucketData 
        Timestamp compBucketData 
        string leads 
        any jobCount 
        boolean hasCreatedJob 
        any localMileTrialsRemaining 
        any franchisee 
        any franchisee_id 
        any websiteUrl 
        any website 
        Timestamp updatedAt 
        any compSnap 
        string dialog 
        boolean cancellationRequested 
        string bucket 
        any services 
        Timestamp cancellationReason 
        boolean syncedWithNetSuite 
        boolean serviceChangeRequested 
        any fetchedLeads 
        any extractedCsCalls 
        any address 
        any b 
        any e 
        any contactCount 
        boolean isPrimary 
        Timestamp createdAt 
        string content 
        Timestamp ampoRate 
        Timestamp pmpoRate 
        Timestamp packageRate 
        Timestamp additionalBagRate 
        string warning 
        any resetPayload 
        boolean isConverted 
        boolean fieldSales 
        any dialerAssigned 
        any recipients 
        any tempRecipients 
        boolean empty 
        any name 
        any pAccounts 
        string confidence 
        any Default 
        string firstNameKey 
        string lastNameKey 
        string titleKey 
        string emailKey 
        string phoneKey 
        Timestamp contactData 
        any firstName 
        any email 
        string oldBucket 
        any newBucket 
        any leadId 
        any journeyId 
        string currentNodeId 
        any entryTime 
        any j 
        any nodeId 
        string description 
        Timestamp updates 
        any accountManagerAssigned 
        boolean les 
        string sendEmail 
        boolean optedOut 
        Timestamp updateData 
        Timestamp assignmentUpdates 
        any NEW 
        Timestamp cancellationTheme 
        Timestamp cancellationThemeId 
        Timestamp cancellationCategory 
        Timestamp cancellationWhyId 
        any hasMyPostBusinessAccount 
        Timestamp parcelVolumeGreaterThan20 
        any currentCarrier 
        Timestamp followUpDate 
        any nextBestAction 
        Timestamp dueDate 
        any up 
        any generalBookingUrlId 
        string variant 
        any hildDocs 
        any tag 
        any address1 
        any street 
        any city 
        any salesRepAssigned 
        any salesRepAssignedCalendlyLink 
        any aiScore 
        any aiReason 
        any action 
        any isFieldSales 
        any phoneNumber 
        any displayName 
        any leadName 
        boolean isCompleted 
        any taskId 
        Timestamp completedAt 
        any ed 
        any kId 
        any existingAppts 
        Timestamp appointmentStatus 
        Timestamp discoveryData 
        any questions 
        any checkinQuestions 
        any checkinScore 
        any checkinRoutingTag 
        any checkinScoringReason 
        Timestamp data 
        any scorecardId 
        any analysis 
        any alysis 
        any uid 
        any leadIds 
        any listName 
        any noteText 
        any keepBucket 
        any oldBuckets 
        any marketingLists 
        any oldName 
        any newName 
        any ame 
        any lists 
        boolean isReviewed 
        any null 
        any ids 
        any uthor 
        any assignmentMap 
        any exportedToCompany 
        any authorName 
        any exportedBy 
        boolean isExported 
        Timestamp exportBatchId 
        any cid 
        boolean isDuplicate 
        any te 
        Timestamp ata 
        any potentialFranchisees 
        Timestamp assignedToDialerAt 
        any companyId 
        Timestamp scannedAt 
        boolean ignoreDuplicateWarning 
        boolean isAllSynced 
        number unsyncedCount 
        boolean success 
        number count 
        string message 
        any dIds 
        any parentLeadId 
        boolean isChildLead 
        any netsuiteId 
        any internalid 
        Timestamp createdChildLeadIds 
        boolean isParentLead 
        Timestamp parentData 
        any parentCompanyId 
        boolean isChildSite 
        string campaign 
        string ID 
        string Name 
        string Field 
    }
    companies {
        string id PK
        any lead1985895Doc 
        any ref 
        Timestamp data 
        Timestamp localMileRegistrationLink 
        any Case 
        any prospectPlusId 
        any sofLink 
        any col 
        any currentFs 
        any docSnap 
        Timestamp leadsData 
        Timestamp companiesData 
        Timestamp leadsBucketData 
        Timestamp compBucketData 
        string customerStatus 
        string companies 
        any a 
        any b 
        boolean merge 
        string type 
        string notes 
        any websiteUrl 
        any website 
        Timestamp updatedAt 
        any compSnap 
        boolean cancellationRequested 
        string status 
        Timestamp date 
        any author 
        boolean syncedWithNetSuite 
        any services 
        boolean serviceChangeRequested 
        any companyName 
        any address 
        any street 
        any leads 
        any extraLeadQueries 
        string content 
        any name 
        any pAccounts 
        any zeeLeads 
        boolean isFromCompaniesCollection 
        any snap 
        any isCompany 
        any leadId 
        any activity 
        any sub 
        any ids 
        boolean ignoreDuplicateWarning 
        boolean isDuplicate 
        boolean success 
        number linkedCount 
        string error 
        boolean isParent 
        boolean isParentLead 
        boolean isMultisite 
        string accountType 
        string bucket 
        string campaign 
        any parentLeadId 
        any parentCompanyId 
        boolean isChildSite 
        any parentCompanyPayload 
    }
    visitnotes {
        string id PK
        string status 
        Timestamp createdAt 
        any q 
        Timestamp data 
    }
    upsells {
        string id PK
        any q 
        Timestamp data 
    }
    daily_area_logs {
        string id PK
        Timestamp createdAt 
        any uid 
        string timeZone 
        any null 
        Timestamp data 
    }
    field_sales_schedules {
        string id PK
        Timestamp data 
        Timestamp updatedAt 
        any leadId 
    }
    marketing_templates {
        string id PK
        string variant 
        string title 
        any j 
        string description 
        Timestamp createdAt 
        string failed 
        string template 
    }
    marketing_sms_templates {
        string id PK
        any j 
        string title 
        string description 
        Timestamp createdAt 
        string failed 
        string template 
    }
    marketing_campaigns {
        string id PK
        string title 
        string variant 
        any e 
        any description 
        any c 
    }
    campaign_deliveries {
        string id PK
    }
    marketing_suppression_list {
        string id PK
        any tempRecipients 
        any list 
        any email 
        Timestamp unsubscribedAt 
        string campaignId 
        string leadId 
        any companyName 
        any leadName 
    }
    outlook_integrations {
        string id PK
        string title 
        string description 
        string failed 
        boolean merge 
    }
    settings {
        string id PK
        Timestamp features 
        string title 
        string variant 
        any recipients 
        boolean merge 
        string description 
        any frequency 
    }
    journeys {
        string id PK
    }
    Journeys {
        string id PK
        string variant 
        string title 
        string status 
        any prev 
        string description 
        any name 
        any body 
        string campaigns 
        string journey 
        string type 
        string journeys 
        any n 
    }
    unassigned_calls {
        string id PK
        any calls 
        any callId 
        string title 
        string description 
        string call 
        any lId 
    }
    bucket_history {
        string id PK
        any companyName 
        Timestamp dateLeadEntered 
        string originalBucket 
        any bucketHistory 
        boolean merge 
    }
    invoices {
        string id PK
        any missingBothList 
        any missingIdList 
        string realization 
        string title 
        string description 
        string invoices 
        string fallback 
    }
    cancellation_hierarchy {
        string id PK
        string hierarchy 
        string title 
        string description 
        string mode 
        any themeId 
        any name 
        any subject 
    }
    app_tickets {
        string id PK
        Timestamp status 
        any note 
        Timestamp updatedAt 
        Timestamp updatedByName 
        string role 
        any emailSent 
        any title 
        any description 
        Timestamp createdBy 
        Timestamp createdByName 
        Timestamp createdByEmail 
        Timestamp newStatus 
        any type 
        Timestamp platform 
        Timestamp attachments 
        string timeZone 
    }
    brandProfiles {
        string id PK
        string profile 
        boolean merge 
        string title 
        string description 
    }
    emails {
        string id PK
        any items 
        any leadCache 
    }
    tickets {
        string id PK
        any enquiryType 
        Timestamp updatedAt 
        any prev 
        any list 
        any enquirerName 
        any enquirerEmail 
        any enquirerPhone 
        any raisedBy 
        any source 
        any enquirySource 
        string action 
        any user 
        Timestamp date 
        string status 
        string notes 
        any hasNewReceiverDetails 
        any newReceiverName 
        any newReceiverAddress 
        any newReceiverEmail 
        any newReceiverPhone 
        any customerCompany 
        any companyId 
        any customerAccountNumber 
        any customerTier 
        Timestamp updateData 
        any timestamp 
        string type 
        string direction 
        string from 
        any to 
        any subject 
        any author 
        string content 
        any assignedUser 
        any assignedUserName 
        Timestamp createdAt 
        Timestamp atedAt 
        any cc 
        any bcc 
        Timestamp attachments 
        string method 
        any ts 
        any starTrackEnquiries 
        any t 
        boolean isMasterCase 
        any parentTicketId 
        string title 
        string description 
    }
    operators {
        string id PK
        any internalId 
        any mapping 
        string operators 
        any newCMap 
        any name 
    }
    operations_tickets {
        string id PK
        string ticketId 
        any type 
        any linkedTrackingTicket 
        any depot 
        string status 
        any assignee 
        string day 
        string month 
        any raised 
        Timestamp createdAt 
        any description 
    }
    it_tickets {
        string id PK
        string ticketId 
        string type 
        any linkedTrackingTicket 
        any description 
        string status 
        string day 
        string month 
        any priority 
        any raised 
        Timestamp createdAt 
    }
    packages {
        string id PK
        any rangeNameMap 
    }
    contacts {
        string id PK
        any contactDoc 
        any email 
        any name 
        any phone 
        any d 
    }
    activity {
        string id PK
        string type 
        Timestamp date 
        string notes 
        any author 
        any subject 
        any bodyHtml 
        Timestamp sentAt 
        any sender 
        Timestamp Status 
        any nodeId 
        string nodeType 
        Timestamp updatedAt 
        Timestamp createdAt 
        any fetches 
        any leadId 
    }
    tasks {
        string id PK
        string title 
        Timestamp dueDate 
        any dialerAssigned 
        boolean isCompleted 
        Timestamp createdAt 
        string author 
        any leadName 
        any leadId 
    }
    journey_states {
        string id PK
    }
    localMileJobs {
        string id PK
        any d 
    }
    InteractionLogs {
        string id PK
        string type 
        any timestamp 
        any userAgent 
        any ip 
    }
    partner_locations {
        string id PK
        any locs 
        any t 
        boolean merge 
        any internalId 
        any name 
        any address1 
        any title 
        string description 
        string data 
        any ausPostLocs 
    }
    lpo_leads {
        string id PK
        any notUsingLpoPlus 
        Timestamp status 
        Timestamp updatedAt 
        string type 
        any notes 
        any author 
        Timestamp createdAt 
        string title 
        string description 
        Timestamp leadsData 
        Timestamp docsToUpdate 
        any isLpoLinked 
        any bucketHistory 
        any historyList 
        any allLeads 
        any lpoName 
        string variant 
        any conversionStep 
        any list 
        Timestamp updatePayload 
        any childIds 
        Timestamp ampoRate 
        Timestamp pmpoRate 
        Timestamp packageRate 
        Timestamp additionalBagRate 
        any linkedFranchisees 
        any linkedFranchiseeName 
        any companyNameFranchise 
        any prev 
        any resetPayload 
        boolean isConverted 
        Timestamp createdParentLeadId 
        Timestamp createdChildLeadIds 
        any linkedLeadId 
        any linkedLeadCompanyName 
        any lf 
    }
    notes {
        string id PK
        any name 
        any leadId 
    }
    scfs {
        string id PK
        any fetchedInvoices 
        any companiesList 
        boolean isCompany 
        any leadsList 
        string fallback 
    }
    appointments {
        string id PK
        any fetches 
    }
    logins {
        string id PK
        string apping 
        any records 
    }
    mailbox_automation_logs {
        string id PK
        any err 
    }
    cancellations {
        string id PK
        number callsCount 
        string method 
        any body 
        string status 
        Timestamp saveStrategy 
        any notes 
        any processedBy 
        any Sort 
        string type 
        Timestamp updatedServices 
        any avg3MonthInvoiceMRR 
        boolean trueServiceCancellationDate 
        Timestamp cancellationReason 
        Timestamp cancellationReasonId 
        Timestamp cancellationTheme 
        any cancelList 
        any franchisee 
        any cancelledByFranchisee 
        any isFranchiseeCancelled 
        any title 
        string description 
        Timestamp isReductionTurnedCancellation 
        Timestamp attachments 
        any source 
        string requestType 
        any leadId 
        any netsuiteId 
        Timestamp cancellationThemeId 
        Timestamp cancellationWhy 
        Timestamp cancellationWhyId 
    }
    cs_requests {
        string id PK
        string method 
        any body 
        string type 
        any leadId 
        any csList 
        string status 
        Timestamp saveStrategy 
        any notes 
        Timestamp attachments 
        any processedBy 
        Timestamp updatedServices 
        boolean trueServiceCancellationDate 
        Timestamp cancellationTheme 
        Timestamp cancellationThemeId 
        Timestamp cancellationWhy 
        Timestamp cancellationWhyId 
        Timestamp cancellationReason 
    }
    cancellationThemes {
        string id PK
    }
    products {
        string id PK
        any D 
    }
    marketing_assets {
        string id PK
        string assets 
        string title 
        string description 
        any error 
        string failed 
    }
    marketing_snippets {
        string id PK
        string title 
        string description 
        Timestamp createdAt 
        string failed 
        Timestamp updatedAt 
        string snippet 
    }
    franchise_prospects {
        string id PK
        Timestamp updatedDeed 
        any publicToken 
        string status 
        string title 
        string description 
        string variant 
        Timestamp updatedEOI 
        any driversLicence 
        any documents 
        string text 
        Timestamp createdAt 
        string createdByName 
        any kfs 
        any linkedFranchiseeId 
        any linkedFranchiseeName 
        any presaleListingId 
        any preferredTerritory 
        any pUrl 
        any territoryMapUrl 
        any keyFactSheet 
        Timestamp updatedNabFunding 
        Timestamp accreditationFundingRequired 
        Timestamp nabStatus 
        any nabConfirmedBy 
        any notes 
        any list 
    }
    franchisee_presales {
        string id PK
        any territoryMapUrl 
    }
    playbooks {
        string id PK
    }
    sync_jobs {
        string id PK
        any barcodes 
        string status 
        any total 
        number completed 
        Timestamp created_at 
    }
    dialingSessions {
        string id PK
        any userId 
        any userDisplayName 
        any startTime 
        any endTime 
        number duration 
        any totalLeadsCount 
        any leadsVisited 
        any leadsVisitedCount 
        string status 
        string title 
        string description 
    }
    VisitEvents {
        string id PK
        any timestamp 
    }
    adminApprovalRequests {
        string id PK
        Timestamp requestData 
        any userId 
        any userEmail 
        any userName 
        string requestedRole 
        string status 
        string adminApprovalStatus 
        any pendingAdminRequestId 
    }
    notifications {
        string id PK
        Timestamp createdAt 
        boolean isRead 
    }
    transcripts {
        string id PK
    }
    lead_export_batches {
        string id PK
        any exportedBy 
        any exportedByUid 
        any leadCount 
        any notes 
    }
    lead_campaigns {
        string id PK
        any dbCampaigns 
        any name 
        any description 
        boolean isBuiltIn 
        boolean isActive 
        Timestamp createdBy 
        Timestamp createdAt 
        any campaignId 
    }
    onboardingRequests {
        string id PK
        Timestamp atedAt 
        string type 
        Timestamp date 
        string notes 
        any results 
        any appointmentDetails 
        Timestamp appointmentDate 
        Timestamp updatePayload 
        Timestamp updatedAt 
        any requests 
    }
    users ||--o{ routes : "id"
```

---

## Table Directory

| Table / Model | Columns | Primary Key | Relations | Source File |
| :--- | :--- | :--- | :--- | :--- |
| [`franchisees`](#table-franchisees) | 10 | `id` | 0 | `check-franchisees.ts` |
| [`services`](#table-services) | 3 | `id` | 0 | `firestore.rules` |
| [`users`](#table-users) | 55 | `id` | 1 | `firestore.rules` |
| [`routes`](#table-routes) | 5 | `id` | 0 | `firestore.rules` |
| [`leads`](#table-leads) | 195 | `id` | 0 | `firestore.rules` |
| [`companies`](#table-companies) | 64 | `id` | 0 | `firestore.rules` |
| [`visitnotes`](#table-visitnotes) | 5 | `id` | 0 | `firestore.rules` |
| [`upsells`](#table-upsells) | 3 | `id` | 0 | `firestore.rules` |
| [`daily_area_logs`](#table-daily_area_logs) | 6 | `id` | 0 | `firestore.rules` |
| [`field_sales_schedules`](#table-field_sales_schedules) | 4 | `id` | 0 | `firestore.rules` |
| [`marketing_templates`](#table-marketing_templates) | 8 | `id` | 0 | `firestore.rules` |
| [`marketing_sms_templates`](#table-marketing_sms_templates) | 7 | `id` | 0 | `firestore.rules` |
| [`marketing_campaigns`](#table-marketing_campaigns) | 6 | `id` | 0 | `firestore.rules` |
| [`campaign_deliveries`](#table-campaign_deliveries) | 1 | `id` | 0 | `firestore.rules` |
| [`marketing_suppression_list`](#table-marketing_suppression_list) | 9 | `id` | 0 | `firestore.rules` |
| [`outlook_integrations`](#table-outlook_integrations) | 5 | `id` | 0 | `firestore.rules` |
| [`settings`](#table-settings) | 8 | `id` | 0 | `firestore.rules` |
| [`journeys`](#table-journeys) | 1 | `id` | 0 | `firestore.rules` |
| [`Journeys`](#table-journeys) | 13 | `id` | 0 | `firestore.rules` |
| [`unassigned_calls`](#table-unassigned_calls) | 7 | `id` | 0 | `firestore.rules` |
| [`bucket_history`](#table-bucket_history) | 6 | `id` | 0 | `scratch/find-website-leads-missing-history.ts` |
| [`invoices`](#table-invoices) | 8 | `id` | 0 | `scratch/report_invoices.ts` |
| [`cancellation_hierarchy`](#table-cancellation_hierarchy) | 8 | `id` | 0 | `scripts/seed-cancellation-reasons.ts` |
| [`app_tickets`](#table-app_tickets) | 17 | `id` | 0 | `src/app/admin/app-tickets/page.tsx` |
| [`brandProfiles`](#table-brandprofiles) | 5 | `id` | 0 | `src/app/admin/brand-bot/page.tsx` |
| [`emails`](#table-emails) | 3 | `id` | 0 | `src/app/admin/mailbox/page.tsx` |
| [`tickets`](#table-tickets) | 49 | `id` | 0 | `src/app/admin/tickets/[ticketId]/page.tsx` |
| [`operators`](#table-operators) | 6 | `id` | 0 | `src/app/admin/tickets/[ticketId]/page.tsx` |
| [`operations_tickets`](#table-operations_tickets) | 12 | `id` | 0 | `src/app/admin/tickets/[ticketId]/page.tsx` |
| [`it_tickets`](#table-it_tickets) | 11 | `id` | 0 | `src/app/admin/tickets/[ticketId]/page.tsx` |
| [`packages`](#table-packages) | 2 | `id` | 0 | `src/app/admin/tickets/page.tsx` |
| [`contacts`](#table-contacts) | 6 | `id` | 0 | `src/app/api/campaigns/send/route.ts` |
| [`activity`](#table-activity) | 16 | `id` | 0 | `src/app/api/campaigns/send/route.ts` |
| [`tasks`](#table-tasks) | 9 | `id` | 0 | `src/app/api/nurture/process/route.ts` |
| [`journey_states`](#table-journey_states) | 1 | `id` | 0 | `src/app/api/nurture/process/route.ts` |
| [`localMileJobs`](#table-localmilejobs) | 2 | `id` | 0 | `src/app/api/nurture/process/route.ts` |
| [`InteractionLogs`](#table-interactionlogs) | 5 | `id` | 0 | `src/app/api/tracking/email-click/route.ts` |
| [`partner_locations`](#table-partner_locations) | 11 | `id` | 0 | `src/app/check-in/[leadId]/select-services/page.tsx` |
| [`lpo_leads`](#table-lpo_leads) | 37 | `id` | 0 | `src/app/lpo-leads/[id]/page.tsx` |
| [`notes`](#table-notes) | 3 | `id` | 0 | `src/app/lpo-opportunity/[id]/page.tsx` |
| [`scfs`](#table-scfs) | 6 | `id` | 0 | `src/components/account-manager/am-reports-dashboard.tsx` |
| [`appointments`](#table-appointments) | 2 | `id` | 0 | `src/components/account-manager/multisites-dashboard.tsx` |
| [`logins`](#table-logins) | 3 | `id` | 0 | `src/components/admin/login-report.tsx` |
| [`mailbox_automation_logs`](#table-mailbox_automation_logs) | 2 | `id` | 0 | `src/components/ai-email-copilot.tsx` |
| [`cancellations`](#table-cancellations) | 31 | `id` | 0 | `src/components/cancel-customer-dialog.tsx` |
| [`cs_requests`](#table-cs_requests) | 18 | `id` | 0 | `src/components/cancel-customer-dialog.tsx` |
| [`cancellationThemes`](#table-cancellationthemes) | 1 | `id` | 0 | `src/components/company-profile.tsx` |
| [`products`](#table-products) | 2 | `id` | 0 | `src/components/lead-products.tsx` |
| [`marketing_assets`](#table-marketing_assets) | 6 | `id` | 0 | `src/components/marketing/asset-library.tsx` |
| [`marketing_snippets`](#table-marketing_snippets) | 7 | `id` | 0 | `src/components/marketing/snippet-builder.tsx` |
| [`franchise_prospects`](#table-franchise_prospects) | 27 | `id` | 0 | `src/components/operations/franchise-prospect-detail-client.tsx` |
| [`franchisee_presales`](#table-franchisee_presales) | 2 | `id` | 0 | `src/components/operations/franchise-prospect-detail-client.tsx` |
| [`playbooks`](#table-playbooks) | 1 | `id` | 0 | `src/components/post-call-outcome-dialog.tsx` |
| [`sync_jobs`](#table-sync_jobs) | 6 | `id` | 0 | `src/components/scans/scans-client.tsx` |
| [`dialingSessions`](#table-dialingsessions) | 12 | `id` | 0 | `src/hooks/use-dialing-session.tsx` |
| [`VisitEvents`](#table-visitevents) | 2 | `id` | 0 | `src/services/LocationService.ts` |
| [`adminApprovalRequests`](#table-adminapprovalrequests) | 9 | `id` | 0 | `src/services/admin-approval.ts` |
| [`notifications`](#table-notifications) | 3 | `id` | 0 | `src/services/firebase-server.ts` |
| [`transcripts`](#table-transcripts) | 1 | `id` | 0 | `src/services/firebase.ts` |
| [`lead_export_batches`](#table-lead_export_batches) | 5 | `id` | 0 | `src/services/firebase.ts` |
| [`lead_campaigns`](#table-lead_campaigns) | 9 | `id` | 0 | `src/services/lead-campaigns.ts` |
| [`onboardingRequests`](#table-onboardingrequests) | 11 | `id` | 0 | `src/services/onboarding-service.ts` |

---

## Table Specifications

### Table: `franchisees`

> Firestore NoSQL Collection

- **Source:** `check-franchisees.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `name` | `any` | Yes | - | - | Field discovered from code reference in check-franchisees.ts |
| `Fallback` | `any` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `t` | `any` | Yes | - | - | Field discovered from code reference in lead-profile.tsx |
| `fList` | `any` | Yes | - | - | Field discovered from code reference in lpo-conversion-wizard.tsx |
| `list` | `any` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `territoryMapUrl` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `internalId` | `any` | Yes | - | - | Field discovered from code reference in service-selection-dialog.tsx |
| `existingUserIds` | `any` | Yes | - | - | Field discovered from code reference in use-auth.tsx |
| `updatedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `services`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `leadId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `insight` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `users`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `r` | `any` | Yes | - | - | Field discovered from code reference in services.ts |
| `matchedUser` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `uid` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `start` | `string` | Yes | - | - | Field discovered from code reference in calendar-settings-config.tsx |
| `end` | `string` | Yes | - | - | Field discovered from code reference in calendar-settings-config.tsx |
| `meetingBufferMinutes` | `any` | Yes | - | - | Field discovered from code reference in calendar-settings-config.tsx |
| `defaultMeetingDurationMinutes` | `Timestamp` | Yes | - | - | Field discovered from code reference in calendar-settings-config.tsx |
| `minimumBookingNoticeHours` | `any` | Yes | - | - | Field discovered from code reference in calendar-settings-config.tsx |
| `leaveProfile` | `any` | Yes | - | - | Field discovered from code reference in am-leave-management.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in am-leave-management.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in am-leave-management.tsx |
| `summary` | `boolean` | Yes | - | - | Field discovered from code reference in bulk-account-manager-updater.tsx |
| `users` | `any` | Yes | - | - | Field discovered from code reference in bulk-account-manager-updater.tsx |
| `email` | `any` | Yes | - | - | Field discovered from code reference in login-report.tsx |
| `s` | `string` | Yes | - | - | Field discovered from code reference in call-notification-listener.tsx |
| `matchedData` | `Timestamp` | Yes | - | - | Field discovered from code reference in lead-profile.tsx |
| `updateData` | `Timestamp` | Yes | - | - | Field discovered from code reference in new-lead-form.tsx |
| `fieldSales` | `boolean` | Yes | - | - | Field discovered from code reference in new-lead-form.tsx |
| `customerStatus` | `string` | Yes | - | - | Field discovered from code reference in new-lead-form.tsx |
| `name` | `any` | Yes | - | - | Field discovered from code reference in share-opportunity-dialog.tsx |
| `visitNoteID` | `any` | Yes | - | - | Field discovered from code reference in visit-note-processor-dialog.tsx |
| `franchisee` | `any` | Yes | - | - | Field discovered from code reference in use-auth.tsx |
| `activeRole` | `any` | Yes | - | - | Field discovered from code reference in use-auth.tsx |
| `Firestore` | `string` | Yes | - | - | Field discovered from code reference in use-auth.tsx |
| `targetFranchiseeId` | `any` | Yes | - | - | Field discovered from code reference in use-auth.tsx |
| `userOnboardingStates` | `Timestamp` | Yes | - | - | Field discovered from code reference in use-auth.tsx |
| `merge` | `boolean` | Yes | - | - | Field discovered from code reference in use-auth.tsx |
| `updates` | `Timestamp` | Yes | - | - | Field discovered from code reference in use-auth.tsx |
| `adminApprovalStatus` | `string` | Yes | - | - | Field discovered from code reference in admin-approval.ts |
| `pendingAdminRequestId` | `any` | Yes | - | - | Field discovered from code reference in admin-approval.ts |
| `currentAssignedRoles` | `any` | Yes | - | - | Field discovered from code reference in admin-approval.ts |
| `displayName` | `string` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `data` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `requestorUid` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `method` | `string` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `body` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `key` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `isRead` | `boolean` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `userId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `notificationId` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `nId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `rId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `leadIds` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `directions` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `rid` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `src` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `target` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `services` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `updatedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `journeyId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `author` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `noteText` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `keepBucket` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |

#### Foreign Key Relations

| Local Column | References Table | Target Column | Cardinality |
| :--- | :--- | :--- | :--- |
| `id` | `routes` | `usersId` | `1:N` |

---

### Table: `routes`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `userId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `directions` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `uid` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `rid` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `leads`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `type` | `string` | Yes | - | - | Field discovered from code reference in aircall.ts |
| `lead1985895Doc` | `any` | Yes | - | - | Field discovered from code reference in check-outbound-field-sales.ts |
| `missingBothList` | `any` | Yes | - | - | Field discovered from code reference in report_invoices_client.ts |
| `missingIdList` | `any` | Yes | - | - | Field discovered from code reference in report_invoices_client.ts |
| `missingDateList` | `Timestamp` | Yes | - | - | Field discovered from code reference in report_invoices_client.ts |
| `companyName` | `string` | Yes | - | - | Field discovered from code reference in test-lead-1985895-reporting.ts |
| `status` | `string` | Yes | - | - | Field discovered from code reference in test-lead-1985895-reporting.ts |
| `customerStatus` | `string` | Yes | - | - | Field discovered from code reference in test-lead-1985895-reporting.ts |
| `notes` | `string` | Yes | - | - | Field discovered from code reference in test-lead-1985895-reporting.ts |
| `updatesSummary` | `Timestamp` | Yes | - | - | Field discovered from code reference in assign-blank-am-leads.ts |
| `assignedTo` | `any` | Yes | - | - | Field discovered from code reference in assign-blank-am-leads.ts |
| `localMileRegistrationLink` | `Timestamp` | Yes | - | - | Field discovered from code reference in backfill-localmile-links.ts |
| `prospectPlusId` | `any` | Yes | - | - | Field discovered from code reference in backfill-prospect-plus-id.ts |
| `sofLink` | `any` | Yes | - | - | Field discovered from code reference in backfill-sof-links.ts |
| `sampleBlankLeads` | `any` | Yes | - | - | Field discovered from code reference in check-blank-am-leads.ts |
| `matches` | `Timestamp` | Yes | - | - | Field discovered from code reference in find-uncalled-leads.ts |
| `date` | `Timestamp` | Yes | - | - | Field discovered from code reference in sync-uncalled-leads.ts |
| `author` | `string` | Yes | - | - | Field discovered from code reference in sync-uncalled-leads.ts |
| `error` | `any` | Yes | - | - | Field discovered from code reference in sync-uncalled-leads.ts |
| `pass` | `any` | Yes | - | - | Field discovered from code reference in update-customer-status.ts |
| `ref` | `any` | Yes | - | - | Field discovered from code reference in update-outbound-field-sales-false.ts |
| `col` | `any` | Yes | - | - | Field discovered from code reference in update-outbound-field-sales-false.ts |
| `currentFs` | `any` | Yes | - | - | Field discovered from code reference in update-outbound-field-sales-false.ts |
| `logoUrl` | `any` | Yes | - | - | Field discovered from code reference in prospect-website-tool.ts |
| `lastExecutionTime` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `activeJourneys` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `merge` | `boolean` | Yes | - | - | Field discovered from code reference in page.tsx |
| `a` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `appointments` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `leadsData` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `companiesData` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `leadsBucketData` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `compBucketData` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `leads` | `string` | Yes | - | - | Field discovered from code reference in franchisee-invoicing-client.tsx |
| `jobCount` | `any` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `hasCreatedJob` | `boolean` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `localMileTrialsRemaining` | `any` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `franchisee` | `any` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `franchisee_id` | `any` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `websiteUrl` | `any` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `website` | `any` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `updatedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `compSnap` | `any` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `dialog` | `string` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `cancellationRequested` | `boolean` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `bucket` | `string` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `services` | `any` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `cancellationReason` | `Timestamp` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `syncedWithNetSuite` | `boolean` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `serviceChangeRequested` | `boolean` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `fetchedLeads` | `any` | Yes | - | - | Field discovered from code reference in reporting-client.tsx |
| `extractedCsCalls` | `any` | Yes | - | - | Field discovered from code reference in reporting-client.tsx |
| `address` | `any` | Yes | - | - | Field discovered from code reference in discover-multisites-dialog.tsx |
| `b` | `any` | Yes | - | - | Field discovered from code reference in lead-profile.tsx |
| `e` | `any` | Yes | - | - | Field discovered from code reference in lead-profile.tsx |
| `contactCount` | `any` | Yes | - | - | Field discovered from code reference in lpo-conversion-wizard.tsx |
| `isPrimary` | `boolean` | Yes | - | - | Field discovered from code reference in lpo-conversion-wizard.tsx |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in lpo-conversion-wizard.tsx |
| `content` | `string` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `ampoRate` | `Timestamp` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `pmpoRate` | `Timestamp` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `packageRate` | `Timestamp` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `additionalBagRate` | `Timestamp` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `warning` | `string` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `resetPayload` | `any` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `isConverted` | `boolean` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `fieldSales` | `boolean` | Yes | - | - | Field discovered from code reference in allocate-bucket-dialog.tsx |
| `dialerAssigned` | `any` | Yes | - | - | Field discovered from code reference in allocate-bucket-dialog.tsx |
| `recipients` | `any` | Yes | - | - | Field discovered from code reference in campaign-scheduler 2.tsx |
| `tempRecipients` | `any` | Yes | - | - | Field discovered from code reference in campaign-scheduler.tsx |
| `empty` | `boolean` | Yes | - | - | Field discovered from code reference in campaign-scheduler.tsx |
| `name` | `any` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `pAccounts` | `any` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `confidence` | `string` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `Default` | `any` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `firstNameKey` | `string` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `lastNameKey` | `string` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `titleKey` | `string` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `emailKey` | `string` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `phoneKey` | `string` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `contactData` | `Timestamp` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `firstName` | `any` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `email` | `any` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `oldBucket` | `string` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `newBucket` | `any` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `leadId` | `any` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `journeyId` | `any` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `currentNodeId` | `string` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `entryTime` | `any` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `j` | `any` | Yes | - | - | Field discovered from code reference in lead-nurture-card.tsx |
| `nodeId` | `any` | Yes | - | - | Field discovered from code reference in lead-nurture-card.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in lead-nurture-card.tsx |
| `updates` | `Timestamp` | Yes | - | - | Field discovered from code reference in lead-nurture-card.tsx |
| `accountManagerAssigned` | `any` | Yes | - | - | Field discovered from code reference in marketing-lists-client.tsx |
| `les` | `boolean` | Yes | - | - | Field discovered from code reference in marketing-lists-client.tsx |
| `sendEmail` | `string` | Yes | - | - | Field discovered from code reference in suppression-list.tsx |
| `optedOut` | `boolean` | Yes | - | - | Field discovered from code reference in suppression-list.tsx |
| `updateData` | `Timestamp` | Yes | - | - | Field discovered from code reference in new-lead-form.tsx |
| `assignmentUpdates` | `Timestamp` | Yes | - | - | Field discovered from code reference in new-lead-form.tsx |
| `NEW` | `any` | Yes | - | - | Field discovered from code reference in new-lead-form.tsx |
| `cancellationTheme` | `Timestamp` | Yes | - | - | Field discovered from code reference in post-call-outcome-dialog.tsx |
| `cancellationThemeId` | `Timestamp` | Yes | - | - | Field discovered from code reference in post-call-outcome-dialog.tsx |
| `cancellationCategory` | `Timestamp` | Yes | - | - | Field discovered from code reference in post-call-outcome-dialog.tsx |
| `cancellationWhyId` | `Timestamp` | Yes | - | - | Field discovered from code reference in post-call-outcome-dialog.tsx |
| `hasMyPostBusinessAccount` | `any` | Yes | - | - | Field discovered from code reference in post-call-outcome-dialog.tsx |
| `parcelVolumeGreaterThan20` | `Timestamp` | Yes | - | - | Field discovered from code reference in post-call-outcome-dialog.tsx |
| `currentCarrier` | `any` | Yes | - | - | Field discovered from code reference in post-call-outcome-dialog.tsx |
| `followUpDate` | `Timestamp` | Yes | - | - | Field discovered from code reference in post-call-outcome-dialog.tsx |
| `nextBestAction` | `any` | Yes | - | - | Field discovered from code reference in post-call-outcome-dialog.tsx |
| `dueDate` | `Timestamp` | Yes | - | - | Field discovered from code reference in post-call-outcome-dialog.tsx |
| `up` | `any` | Yes | - | - | Field discovered from code reference in post-call-outcome-dialog.tsx |
| `generalBookingUrlId` | `any` | Yes | - | - | Field discovered from code reference in schedule-appointment-dialog.tsx |
| `variant` | `string` | Yes | - | - | Field discovered from code reference in schedule-appointment-dialog.tsx |
| `hildDocs` | `any` | Yes | - | - | Field discovered from code reference in service-selection-dialog.tsx |
| `tag` | `any` | Yes | - | - | Field discovered from code reference in bank-utils.ts |
| `address1` | `any` | Yes | - | - | Field discovered from code reference in bank-utils.ts |
| `street` | `any` | Yes | - | - | Field discovered from code reference in bank-utils.ts |
| `city` | `any` | Yes | - | - | Field discovered from code reference in bank-utils.ts |
| `salesRepAssigned` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `salesRepAssignedCalendlyLink` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `aiScore` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `aiReason` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `action` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `isFieldSales` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `phoneNumber` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `displayName` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `leadName` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `isCompleted` | `boolean` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `taskId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `completedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `ed` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `kId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `existingAppts` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `appointmentStatus` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `discoveryData` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `questions` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `checkinQuestions` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `checkinScore` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `checkinRoutingTag` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `checkinScoringReason` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `data` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `scorecardId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `analysis` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `alysis` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `uid` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `leadIds` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `listName` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `noteText` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `keepBucket` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `oldBuckets` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `marketingLists` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `oldName` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `newName` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `ame` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `lists` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `isReviewed` | `boolean` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `null` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `ids` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `uthor` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `assignmentMap` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `exportedToCompany` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `authorName` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `exportedBy` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `isExported` | `boolean` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `exportBatchId` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `cid` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `isDuplicate` | `boolean` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `te` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `ata` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `potentialFranchisees` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `assignedToDialerAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `companyId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `scannedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `ignoreDuplicateWarning` | `boolean` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `isAllSynced` | `boolean` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `unsyncedCount` | `number` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `success` | `boolean` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `count` | `number` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `message` | `string` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `dIds` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `parentLeadId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `isChildLead` | `boolean` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `netsuiteId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `internalid` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `createdChildLeadIds` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `isParentLead` | `boolean` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `parentData` | `Timestamp` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `parentCompanyId` | `any` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `isChildSite` | `boolean` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `campaign` | `string` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `ID` | `string` | Yes | - | - | Field discovered from code reference in test-leads.ts |
| `Name` | `string` | Yes | - | - | Field discovered from code reference in test-leads.ts |
| `Field` | `string` | Yes | - | - | Field discovered from code reference in test-leads.ts |

---

### Table: `companies`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `lead1985895Doc` | `any` | Yes | - | - | Field discovered from code reference in check-outbound-field-sales.ts |
| `ref` | `any` | Yes | - | - | Field discovered from code reference in backfill-localmile-links.ts |
| `data` | `Timestamp` | Yes | - | - | Field discovered from code reference in backfill-localmile-links.ts |
| `localMileRegistrationLink` | `Timestamp` | Yes | - | - | Field discovered from code reference in backfill-localmile-links.ts |
| `Case` | `any` | Yes | - | - | Field discovered from code reference in backfill-localmile-links.ts |
| `prospectPlusId` | `any` | Yes | - | - | Field discovered from code reference in backfill-prospect-plus-id.ts |
| `sofLink` | `any` | Yes | - | - | Field discovered from code reference in backfill-sof-links.ts |
| `col` | `any` | Yes | - | - | Field discovered from code reference in update-outbound-field-sales-false.ts |
| `currentFs` | `any` | Yes | - | - | Field discovered from code reference in update-outbound-field-sales-false.ts |
| `docSnap` | `any` | Yes | - | - | Field discovered from code reference in update-outbound-field-sales-false.ts |
| `leadsData` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `companiesData` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `leadsBucketData` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `compBucketData` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `customerStatus` | `string` | Yes | - | - | Field discovered from code reference in multisites-dashboard.tsx |
| `companies` | `string` | Yes | - | - | Field discovered from code reference in franchisee-invoicing-client.tsx |
| `a` | `any` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `b` | `any` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `merge` | `boolean` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `type` | `string` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `notes` | `string` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `websiteUrl` | `any` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `website` | `any` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `updatedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `compSnap` | `any` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `cancellationRequested` | `boolean` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `status` | `string` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `date` | `Timestamp` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `author` | `any` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `syncedWithNetSuite` | `boolean` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `services` | `any` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `serviceChangeRequested` | `boolean` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `companyName` | `any` | Yes | - | - | Field discovered from code reference in discover-multisites-dialog.tsx |
| `address` | `any` | Yes | - | - | Field discovered from code reference in discover-multisites-dialog.tsx |
| `street` | `any` | Yes | - | - | Field discovered from code reference in discover-multisites-dialog.tsx |
| `leads` | `any` | Yes | - | - | Field discovered from code reference in lead-profile.tsx |
| `extraLeadQueries` | `any` | Yes | - | - | Field discovered from code reference in lead-profile.tsx |
| `content` | `string` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `name` | `any` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `pAccounts` | `any` | Yes | - | - | Field discovered from code reference in import-leads-client.tsx |
| `zeeLeads` | `any` | Yes | - | - | Field discovered from code reference in sales-snapshot-client.tsx |
| `isFromCompaniesCollection` | `boolean` | Yes | - | - | Field discovered from code reference in sales-snapshot-client.tsx |
| `snap` | `any` | Yes | - | - | Field discovered from code reference in sales-snapshot-client.tsx |
| `isCompany` | `any` | Yes | - | - | Field discovered from code reference in sales-snapshot-client.tsx |
| `leadId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `activity` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `sub` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `ids` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `ignoreDuplicateWarning` | `boolean` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `isDuplicate` | `boolean` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `success` | `boolean` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `linkedCount` | `number` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `error` | `string` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `isParent` | `boolean` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `isParentLead` | `boolean` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `isMultisite` | `boolean` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `accountType` | `string` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `bucket` | `string` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `campaign` | `string` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `parentLeadId` | `any` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `parentCompanyId` | `any` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `isChildSite` | `boolean` | Yes | - | - | Field discovered from code reference in mass-link-service.ts |
| `parentCompanyPayload` | `any` | Yes | - | - | Field discovered from code reference in parent-lead-conversion.ts |

---

### Table: `visitnotes`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `status` | `string` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `q` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `data` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `upsells`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `q` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `data` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `daily_area_logs`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `uid` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `timeZone` | `string` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `null` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `data` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `field_sales_schedules`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `data` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `updatedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `leadId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `marketing_templates`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `variant` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `j` | `any` | Yes | - | - | Field discovered from code reference in lead-nurture-card.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in template-builder 2.tsx |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in template-builder 2.tsx |
| `failed` | `string` | Yes | - | - | Field discovered from code reference in template-builder 2.tsx |
| `template` | `string` | Yes | - | - | Field discovered from code reference in template-builder.tsx |

---

### Table: `marketing_sms_templates`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `j` | `any` | Yes | - | - | Field discovered from code reference in lead-nurture-card.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in sms-template-builder.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in sms-template-builder.tsx |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in sms-template-builder.tsx |
| `failed` | `string` | Yes | - | - | Field discovered from code reference in sms-template-builder.tsx |
| `template` | `string` | Yes | - | - | Field discovered from code reference in sms-template-builder.tsx |

---

### Table: `marketing_campaigns`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `title` | `string` | Yes | - | - | Field discovered from code reference in campaign-scheduler 2.tsx |
| `variant` | `string` | Yes | - | - | Field discovered from code reference in campaign-scheduler 2.tsx |
| `e` | `any` | Yes | - | - | Field discovered from code reference in campaign-scheduler 2.tsx |
| `description` | `any` | Yes | - | - | Field discovered from code reference in campaign-scheduler 2.tsx |
| `c` | `any` | Yes | - | - | Field discovered from code reference in campaign-scheduler.tsx |

---

### Table: `campaign_deliveries`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |

---

### Table: `marketing_suppression_list`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `tempRecipients` | `any` | Yes | - | - | Field discovered from code reference in campaign-scheduler.tsx |
| `list` | `any` | Yes | - | - | Field discovered from code reference in suppression-list.tsx |
| `email` | `any` | Yes | - | - | Field discovered from code reference in suppression-list.tsx |
| `unsubscribedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in suppression-list.tsx |
| `campaignId` | `string` | Yes | - | - | Field discovered from code reference in suppression-list.tsx |
| `leadId` | `string` | Yes | - | - | Field discovered from code reference in suppression-list.tsx |
| `companyName` | `any` | Yes | - | - | Field discovered from code reference in suppression-list.tsx |
| `leadName` | `any` | Yes | - | - | Field discovered from code reference in suppression-list.tsx |

---

### Table: `outlook_integrations`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `title` | `string` | Yes | - | - | Field discovered from code reference in outlook-settings 2.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in outlook-settings 2.tsx |
| `failed` | `string` | Yes | - | - | Field discovered from code reference in outlook-settings 2.tsx |
| `merge` | `boolean` | Yes | - | - | Field discovered from code reference in outlook-settings.tsx |

---

### Table: `settings`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `features` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `variant` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `recipients` | `any` | Yes | - | - | Field discovered from code reference in daily-report-recipients.tsx |
| `merge` | `boolean` | Yes | - | - | Field discovered from code reference in daily-report-recipients.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in daily-report-recipients.tsx |
| `frequency` | `any` | Yes | - | - | Field discovered from code reference in daily-report-recipients.tsx |

---

### Table: `journeys`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |

---

### Table: `Journeys`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `variant` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `status` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `prev` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `name` | `any` | Yes | - | - | Field discovered from code reference in campaign-scheduler.tsx |
| `body` | `any` | Yes | - | - | Field discovered from code reference in campaign-scheduler.tsx |
| `campaigns` | `string` | Yes | - | - | Field discovered from code reference in move-to-nurture-dialog.tsx |
| `journey` | `string` | Yes | - | - | Field discovered from code reference in nurture-journeys.tsx |
| `type` | `string` | Yes | - | - | Field discovered from code reference in nurture-journeys.tsx |
| `journeys` | `string` | Yes | - | - | Field discovered from code reference in template-builder.tsx |
| `n` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `unassigned_calls`

> Firestore Collection [Rules: Security Rules Active]

- **Source:** `firestore.rules`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `calls` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `callId` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `call` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `lId` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |

---

### Table: `bucket_history`

> Firestore NoSQL Collection

- **Source:** `scratch/find-website-leads-missing-history.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `companyName` | `any` | Yes | - | - | Field discovered from code reference in find-website-leads-missing-history.ts |
| `dateLeadEntered` | `Timestamp` | Yes | - | - | Field discovered from code reference in find-website-leads-missing-history.ts |
| `originalBucket` | `string` | Yes | - | - | Field discovered from code reference in backfill-website-lead-bucket-history.ts |
| `bucketHistory` | `any` | Yes | - | - | Field discovered from code reference in backfill-website-lead-bucket-history.ts |
| `merge` | `boolean` | Yes | - | - | Field discovered from code reference in backfill-website-lead-bucket-history.ts |

---

### Table: `invoices`

> Firestore NoSQL Collection

- **Source:** `scratch/report_invoices.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `missingBothList` | `any` | Yes | - | - | Field discovered from code reference in report_invoices.ts |
| `missingIdList` | `any` | Yes | - | - | Field discovered from code reference in report_invoices.ts |
| `realization` | `string` | Yes | - | - | Field discovered from code reference in am-reports-dashboard.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in bulk-export-invoices.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in bulk-export-invoices.tsx |
| `invoices` | `string` | Yes | - | - | Field discovered from code reference in franchisee-invoicing-client.tsx |
| `fallback` | `string` | Yes | - | - | Field discovered from code reference in sales-snapshot-client.tsx |

---

### Table: `cancellation_hierarchy`

> Firestore NoSQL Collection

- **Source:** `scripts/seed-cancellation-reasons.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `hierarchy` | `string` | Yes | - | - | Field discovered from code reference in cancellation-reasons-manager.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in cancellation-reasons-manager.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in cancellation-reasons-manager.tsx |
| `mode` | `string` | Yes | - | - | Field discovered from code reference in cancellation-reasons-manager.tsx |
| `themeId` | `any` | Yes | - | - | Field discovered from code reference in cancellation-reasons-manager.tsx |
| `name` | `any` | Yes | - | - | Field discovered from code reference in nurture-journeys.tsx |
| `subject` | `any` | Yes | - | - | Field discovered from code reference in nurture-journeys.tsx |

---

### Table: `app_tickets`

> Firestore NoSQL Collection

- **Source:** `src/app/admin/app-tickets/page.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `status` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `note` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `updatedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `updatedByName` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `role` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `emailSent` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `title` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `description` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `createdBy` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `createdByName` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `createdByEmail` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `newStatus` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `type` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `platform` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `attachments` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `timeZone` | `string` | Yes | - | - | Field discovered from code reference in access-denied.tsx |

---

### Table: `brandProfiles`

> Firestore NoSQL Collection

- **Source:** `src/app/admin/brand-bot/page.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `profile` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `merge` | `boolean` | Yes | - | - | Field discovered from code reference in page.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |

---

### Table: `emails`

> Firestore NoSQL Collection

- **Source:** `src/app/admin/mailbox/page.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `items` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `leadCache` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |

---

### Table: `tickets`

> Firestore NoSQL Collection

- **Source:** `src/app/admin/tickets/[ticketId]/page.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `enquiryType` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `updatedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `prev` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `list` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `enquirerName` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `enquirerEmail` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `enquirerPhone` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `raisedBy` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `source` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `enquirySource` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `action` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `user` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `date` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `status` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `notes` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `hasNewReceiverDetails` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `newReceiverName` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `newReceiverAddress` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `newReceiverEmail` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `newReceiverPhone` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `customerCompany` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `companyId` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `customerAccountNumber` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `customerTier` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `updateData` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `timestamp` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `type` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `direction` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `from` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `to` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `subject` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `author` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `content` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `assignedUser` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `assignedUserName` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `atedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `cc` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `bcc` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `attachments` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `method` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `ts` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `starTrackEnquiries` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `t` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `isMasterCase` | `boolean` | Yes | - | - | Field discovered from code reference in bulk-upload-dialog.tsx |
| `parentTicketId` | `any` | Yes | - | - | Field discovered from code reference in bulk-upload-dialog.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in ticket-deletion.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in ticket-deletion.tsx |

---

### Table: `operators`

> Firestore NoSQL Collection

- **Source:** `src/app/admin/tickets/[ticketId]/page.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `internalId` | `any` | Yes | - | - | Field discovered from code reference in operators-directory-client.tsx |
| `mapping` | `any` | Yes | - | - | Field discovered from code reference in company-profile.tsx |
| `operators` | `string` | Yes | - | - | Field discovered from code reference in my-franchise-client.tsx |
| `newCMap` | `any` | Yes | - | - | Field discovered from code reference in scans-client.tsx |
| `name` | `any` | Yes | - | - | Field discovered from code reference in scans-client.tsx |

---

### Table: `operations_tickets`

> Firestore NoSQL Collection

- **Source:** `src/app/admin/tickets/[ticketId]/page.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `ticketId` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `type` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `linkedTrackingTicket` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `depot` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `status` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `assignee` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `day` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `month` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `raised` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `description` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |

---

### Table: `it_tickets`

> Firestore NoSQL Collection

- **Source:** `src/app/admin/tickets/[ticketId]/page.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `ticketId` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `type` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `linkedTrackingTicket` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `description` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `status` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `day` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `month` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `priority` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `raised` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |

---

### Table: `packages`

> Firestore NoSQL Collection

- **Source:** `src/app/admin/tickets/page.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `rangeNameMap` | `any` | Yes | - | - | Field discovered from code reference in scans-client.tsx |

---

### Table: `contacts`

> Firestore NoSQL Collection

- **Source:** `src/app/api/campaigns/send/route.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `contactDoc` | `any` | Yes | - | - | Field discovered from code reference in route.ts |
| `email` | `any` | Yes | - | - | Field discovered from code reference in route.ts |
| `name` | `any` | Yes | - | - | Field discovered from code reference in route.ts |
| `phone` | `any` | Yes | - | - | Field discovered from code reference in route.ts |
| `d` | `any` | Yes | - | - | Field discovered from code reference in route.ts |

---

### Table: `activity`

> Firestore NoSQL Collection

- **Source:** `src/app/api/campaigns/send/route.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `type` | `string` | Yes | - | - | Field discovered from code reference in route.ts |
| `date` | `Timestamp` | Yes | - | - | Field discovered from code reference in route.ts |
| `notes` | `string` | Yes | - | - | Field discovered from code reference in route.ts |
| `author` | `any` | Yes | - | - | Field discovered from code reference in route.ts |
| `subject` | `any` | Yes | - | - | Field discovered from code reference in route.ts |
| `bodyHtml` | `any` | Yes | - | - | Field discovered from code reference in route.ts |
| `sentAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in route.ts |
| `sender` | `any` | Yes | - | - | Field discovered from code reference in route.ts |
| `Status` | `Timestamp` | Yes | - | - | Field discovered from code reference in route.ts |
| `nodeId` | `any` | Yes | - | - | Field discovered from code reference in route.ts |
| `nodeType` | `string` | Yes | - | - | Field discovered from code reference in route.ts |
| `updatedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in actions.ts |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in actions.ts |
| `fetches` | `any` | Yes | - | - | Field discovered from code reference in reports-client.tsx |
| `leadId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `tasks`

> Firestore NoSQL Collection

- **Source:** `src/app/api/nurture/process/route.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `title` | `string` | Yes | - | - | Field discovered from code reference in route.ts |
| `dueDate` | `Timestamp` | Yes | - | - | Field discovered from code reference in route.ts |
| `dialerAssigned` | `any` | Yes | - | - | Field discovered from code reference in route.ts |
| `isCompleted` | `boolean` | Yes | - | - | Field discovered from code reference in route.ts |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in route.ts |
| `author` | `string` | Yes | - | - | Field discovered from code reference in route.ts |
| `leadName` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `leadId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `journey_states`

> Firestore NoSQL Collection

- **Source:** `src/app/api/nurture/process/route.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |

---

### Table: `localMileJobs`

> Firestore NoSQL Collection

- **Source:** `src/app/api/nurture/process/route.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `d` | `any` | Yes | - | - | Field discovered from code reference in route.ts |

---

### Table: `InteractionLogs`

> Firestore NoSQL Collection

- **Source:** `src/app/api/tracking/email-click/route.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `type` | `string` | Yes | - | - | Field discovered from code reference in route.ts |
| `timestamp` | `any` | Yes | - | - | Field discovered from code reference in route.ts |
| `userAgent` | `any` | Yes | - | - | Field discovered from code reference in route.ts |
| `ip` | `any` | Yes | - | - | Field discovered from code reference in route.ts |

---

### Table: `partner_locations`

> Firestore NoSQL Collection

- **Source:** `src/app/check-in/[leadId]/select-services/page.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `locs` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `t` | `any` | Yes | - | - | Field discovered from code reference in import-locations-client.tsx |
| `merge` | `boolean` | Yes | - | - | Field discovered from code reference in import-locations-client.tsx |
| `internalId` | `any` | Yes | - | - | Field discovered from code reference in partner-locations-client.tsx |
| `name` | `any` | Yes | - | - | Field discovered from code reference in partner-locations-client.tsx |
| `address1` | `any` | Yes | - | - | Field discovered from code reference in partner-locations-client.tsx |
| `title` | `any` | Yes | - | - | Field discovered from code reference in partner-locations-client.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in partner-locations-client.tsx |
| `data` | `string` | Yes | - | - | Field discovered from code reference in suburb-mapping-client.tsx |
| `ausPostLocs` | `any` | Yes | - | - | Field discovered from code reference in closest-auspost-banner.tsx |

---

### Table: `lpo_leads`

> Firestore NoSQL Collection

- **Source:** `src/app/lpo-leads/[id]/page.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `notUsingLpoPlus` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `status` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `updatedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `type` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `notes` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `author` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in page.tsx |
| `leadsData` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `docsToUpdate` | `Timestamp` | Yes | - | - | Field discovered from code reference in page.tsx |
| `isLpoLinked` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `bucketHistory` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `historyList` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `allLeads` | `any` | Yes | - | - | Field discovered from code reference in lpo-lead-deletion.tsx |
| `lpoName` | `any` | Yes | - | - | Field discovered from code reference in lead-profile.tsx |
| `variant` | `string` | Yes | - | - | Field discovered from code reference in lpo-conversion-wizard.tsx |
| `conversionStep` | `any` | Yes | - | - | Field discovered from code reference in lpo-conversion-wizard.tsx |
| `list` | `any` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `updatePayload` | `Timestamp` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `childIds` | `any` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `ampoRate` | `Timestamp` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `pmpoRate` | `Timestamp` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `packageRate` | `Timestamp` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `additionalBagRate` | `Timestamp` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `linkedFranchisees` | `any` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `linkedFranchiseeName` | `any` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `companyNameFranchise` | `any` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `prev` | `any` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `resetPayload` | `any` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `isConverted` | `boolean` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `createdParentLeadId` | `Timestamp` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `createdChildLeadIds` | `Timestamp` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `linkedLeadId` | `any` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `linkedLeadCompanyName` | `any` | Yes | - | - | Field discovered from code reference in lpo-lead-profile.tsx |
| `lf` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `notes`

> Firestore NoSQL Collection

- **Source:** `src/app/lpo-opportunity/[id]/page.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `name` | `any` | Yes | - | - | Field discovered from code reference in page.tsx |
| `leadId` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `scfs`

> Firestore NoSQL Collection

- **Source:** `src/components/account-manager/am-reports-dashboard.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `fetchedInvoices` | `any` | Yes | - | - | Field discovered from code reference in am-reports-dashboard.tsx |
| `companiesList` | `any` | Yes | - | - | Field discovered from code reference in franchisee-invoicing-client.tsx |
| `isCompany` | `boolean` | Yes | - | - | Field discovered from code reference in franchisee-invoicing-client.tsx |
| `leadsList` | `any` | Yes | - | - | Field discovered from code reference in franchisee-invoicing-client.tsx |
| `fallback` | `string` | Yes | - | - | Field discovered from code reference in sales-snapshot-client.tsx |

---

### Table: `appointments`

> Firestore NoSQL Collection

- **Source:** `src/components/account-manager/multisites-dashboard.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `fetches` | `any` | Yes | - | - | Field discovered from code reference in reports-client.tsx |

---

### Table: `logins`

> Firestore NoSQL Collection

- **Source:** `src/components/admin/login-report.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `apping` | `string` | Yes | - | - | Field discovered from code reference in login-report.tsx |
| `records` | `any` | Yes | - | - | Field discovered from code reference in login-report.tsx |

---

### Table: `mailbox_automation_logs`

> Firestore NoSQL Collection

- **Source:** `src/components/ai-email-copilot.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `err` | `any` | Yes | - | - | Field discovered from code reference in ai-email-copilot.tsx |

---

### Table: `cancellations`

> Firestore NoSQL Collection

- **Source:** `src/components/cancel-customer-dialog.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `callsCount` | `number` | Yes | - | - | Field discovered from code reference in cancel-customer-dialog.tsx |
| `method` | `string` | Yes | - | - | Field discovered from code reference in cancel-customer-dialog.tsx |
| `body` | `any` | Yes | - | - | Field discovered from code reference in cancel-customer-dialog.tsx |
| `status` | `string` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `saveStrategy` | `Timestamp` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `notes` | `any` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `processedBy` | `any` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `Sort` | `any` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `type` | `string` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `updatedServices` | `Timestamp` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `avg3MonthInvoiceMRR` | `any` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `trueServiceCancellationDate` | `boolean` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `cancellationReason` | `Timestamp` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `cancellationReasonId` | `Timestamp` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `cancellationTheme` | `Timestamp` | Yes | - | - | Field discovered from code reference in cancellation-dashboard.tsx |
| `cancelList` | `any` | Yes | - | - | Field discovered from code reference in cancellation-reporting-client.tsx |
| `franchisee` | `any` | Yes | - | - | Field discovered from code reference in cancellation-reporting-client.tsx |
| `cancelledByFranchisee` | `any` | Yes | - | - | Field discovered from code reference in cancellation-reporting-client.tsx |
| `isFranchiseeCancelled` | `any` | Yes | - | - | Field discovered from code reference in cancellation-reporting-client.tsx |
| `title` | `any` | Yes | - | - | Field discovered from code reference in cancellation-reporting-client.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in cancellation-reporting-client.tsx |
| `isReductionTurnedCancellation` | `Timestamp` | Yes | - | - | Field discovered from code reference in cancellation-reporting-client.tsx |
| `attachments` | `Timestamp` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `source` | `any` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `requestType` | `string` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `leadId` | `any` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `netsuiteId` | `any` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `cancellationThemeId` | `Timestamp` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `cancellationWhy` | `Timestamp` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `cancellationWhyId` | `Timestamp` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |

---

### Table: `cs_requests`

> Firestore NoSQL Collection

- **Source:** `src/components/cancel-customer-dialog.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `method` | `string` | Yes | - | - | Field discovered from code reference in cancel-customer-dialog.tsx |
| `body` | `any` | Yes | - | - | Field discovered from code reference in cancel-customer-dialog.tsx |
| `type` | `string` | Yes | - | - | Field discovered from code reference in cancel-customer-dialog.tsx |
| `leadId` | `any` | Yes | - | - | Field discovered from code reference in cancel-customer-dialog.tsx |
| `csList` | `any` | Yes | - | - | Field discovered from code reference in cancellation-reporting-client.tsx |
| `status` | `string` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `saveStrategy` | `Timestamp` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `notes` | `any` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `attachments` | `Timestamp` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `processedBy` | `any` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `updatedServices` | `Timestamp` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `trueServiceCancellationDate` | `boolean` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `cancellationTheme` | `Timestamp` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `cancellationThemeId` | `Timestamp` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `cancellationWhy` | `Timestamp` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `cancellationWhyId` | `Timestamp` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |
| `cancellationReason` | `Timestamp` | Yes | - | - | Field discovered from code reference in cs-requests-dashboard.tsx |

---

### Table: `cancellationThemes`

> Firestore NoSQL Collection

- **Source:** `src/components/company-profile.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |

---

### Table: `products`

> Firestore NoSQL Collection

- **Source:** `src/components/lead-products.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `D` | `any` | Yes | - | - | Field discovered from code reference in lead-profile.tsx |

---

### Table: `marketing_assets`

> Firestore NoSQL Collection

- **Source:** `src/components/marketing/asset-library.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `assets` | `string` | Yes | - | - | Field discovered from code reference in asset-library.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in asset-library.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in asset-library.tsx |
| `error` | `any` | Yes | - | - | Field discovered from code reference in asset-library.tsx |
| `failed` | `string` | Yes | - | - | Field discovered from code reference in asset-library.tsx |

---

### Table: `marketing_snippets`

> Firestore NoSQL Collection

- **Source:** `src/components/marketing/snippet-builder.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `title` | `string` | Yes | - | - | Field discovered from code reference in snippet-builder.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in snippet-builder.tsx |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in snippet-builder.tsx |
| `failed` | `string` | Yes | - | - | Field discovered from code reference in snippet-builder.tsx |
| `updatedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in snippet-builder.tsx |
| `snippet` | `string` | Yes | - | - | Field discovered from code reference in snippet-builder.tsx |

---

### Table: `franchise_prospects`

> Firestore NoSQL Collection

- **Source:** `src/components/operations/franchise-prospect-detail-client.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `updatedDeed` | `Timestamp` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `publicToken` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `status` | `string` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `variant` | `string` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `updatedEOI` | `Timestamp` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `driversLicence` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `documents` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `text` | `string` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `createdByName` | `string` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `kfs` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `linkedFranchiseeId` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `linkedFranchiseeName` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `presaleListingId` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `preferredTerritory` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `pUrl` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `territoryMapUrl` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `keyFactSheet` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `updatedNabFunding` | `Timestamp` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `accreditationFundingRequired` | `Timestamp` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `nabStatus` | `Timestamp` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `nabConfirmedBy` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `notes` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |
| `list` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospects-client.tsx |

---

### Table: `franchisee_presales`

> Firestore NoSQL Collection

- **Source:** `src/components/operations/franchise-prospect-detail-client.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `territoryMapUrl` | `any` | Yes | - | - | Field discovered from code reference in franchise-prospect-detail-client.tsx |

---

### Table: `playbooks`

> Firestore NoSQL Collection

- **Source:** `src/components/post-call-outcome-dialog.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |

---

### Table: `sync_jobs`

> Firestore NoSQL Collection

- **Source:** `src/components/scans/scans-client.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `barcodes` | `any` | Yes | - | - | Field discovered from code reference in scans-client.tsx |
| `status` | `string` | Yes | - | - | Field discovered from code reference in scans-client.tsx |
| `total` | `any` | Yes | - | - | Field discovered from code reference in scans-client.tsx |
| `completed` | `number` | Yes | - | - | Field discovered from code reference in scans-client.tsx |
| `created_at` | `Timestamp` | Yes | - | - | Field discovered from code reference in scans-client.tsx |

---

### Table: `dialingSessions`

> Firestore NoSQL Collection

- **Source:** `src/hooks/use-dialing-session.tsx`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `userId` | `any` | Yes | - | - | Field discovered from code reference in use-dialing-session.tsx |
| `userDisplayName` | `any` | Yes | - | - | Field discovered from code reference in use-dialing-session.tsx |
| `startTime` | `any` | Yes | - | - | Field discovered from code reference in use-dialing-session.tsx |
| `endTime` | `any` | Yes | - | - | Field discovered from code reference in use-dialing-session.tsx |
| `duration` | `number` | Yes | - | - | Field discovered from code reference in use-dialing-session.tsx |
| `totalLeadsCount` | `any` | Yes | - | - | Field discovered from code reference in use-dialing-session.tsx |
| `leadsVisited` | `any` | Yes | - | - | Field discovered from code reference in use-dialing-session.tsx |
| `leadsVisitedCount` | `any` | Yes | - | - | Field discovered from code reference in use-dialing-session.tsx |
| `status` | `string` | Yes | - | - | Field discovered from code reference in use-dialing-session.tsx |
| `title` | `string` | Yes | - | - | Field discovered from code reference in use-dialing-session.tsx |
| `description` | `string` | Yes | - | - | Field discovered from code reference in use-dialing-session.tsx |

---

### Table: `VisitEvents`

> Firestore NoSQL Collection

- **Source:** `src/services/LocationService.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `timestamp` | `any` | Yes | - | - | Field discovered from code reference in LocationService.ts |

---

### Table: `adminApprovalRequests`

> Firestore NoSQL Collection

- **Source:** `src/services/admin-approval.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `requestData` | `Timestamp` | Yes | - | - | Field discovered from code reference in admin-approval.ts |
| `userId` | `any` | Yes | - | - | Field discovered from code reference in admin-approval.ts |
| `userEmail` | `any` | Yes | - | - | Field discovered from code reference in admin-approval.ts |
| `userName` | `any` | Yes | - | - | Field discovered from code reference in admin-approval.ts |
| `requestedRole` | `string` | Yes | - | - | Field discovered from code reference in admin-approval.ts |
| `status` | `string` | Yes | - | - | Field discovered from code reference in admin-approval.ts |
| `adminApprovalStatus` | `string` | Yes | - | - | Field discovered from code reference in admin-approval.ts |
| `pendingAdminRequestId` | `any` | Yes | - | - | Field discovered from code reference in admin-approval.ts |

---

### Table: `notifications`

> Firestore NoSQL Collection

- **Source:** `src/services/firebase-server.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in firebase-server.ts |
| `isRead` | `boolean` | Yes | - | - | Field discovered from code reference in firebase-server.ts |

---

### Table: `transcripts`

> Firestore NoSQL Collection

- **Source:** `src/services/firebase.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |

---

### Table: `lead_export_batches`

> Firestore NoSQL Collection

- **Source:** `src/services/firebase.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `exportedBy` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `exportedByUid` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `leadCount` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |
| `notes` | `any` | Yes | - | - | Field discovered from code reference in firebase.ts |

---

### Table: `lead_campaigns`

> Firestore NoSQL Collection

- **Source:** `src/services/lead-campaigns.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `dbCampaigns` | `any` | Yes | - | - | Field discovered from code reference in lead-campaigns.ts |
| `name` | `any` | Yes | - | - | Field discovered from code reference in lead-campaigns.ts |
| `description` | `any` | Yes | - | - | Field discovered from code reference in lead-campaigns.ts |
| `isBuiltIn` | `boolean` | Yes | - | - | Field discovered from code reference in lead-campaigns.ts |
| `isActive` | `boolean` | Yes | - | - | Field discovered from code reference in lead-campaigns.ts |
| `createdBy` | `Timestamp` | Yes | - | - | Field discovered from code reference in lead-campaigns.ts |
| `createdAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in lead-campaigns.ts |
| `campaignId` | `any` | Yes | - | - | Field discovered from code reference in lead-campaigns.ts |

---

### Table: `onboardingRequests`

> Firestore NoSQL Collection

- **Source:** `src/services/onboarding-service.ts`
- **ORM Definition:** `firebase`

#### Columns

| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `string (DocID)` | **No** | - | `PRIMARY KEY` | Auto-generated Firestore document ID |
| `atedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in onboarding-service.ts |
| `type` | `string` | Yes | - | - | Field discovered from code reference in onboarding-service.ts |
| `date` | `Timestamp` | Yes | - | - | Field discovered from code reference in onboarding-service.ts |
| `notes` | `string` | Yes | - | - | Field discovered from code reference in onboarding-service.ts |
| `results` | `any` | Yes | - | - | Field discovered from code reference in onboarding-service.ts |
| `appointmentDetails` | `any` | Yes | - | - | Field discovered from code reference in onboarding-service.ts |
| `appointmentDate` | `Timestamp` | Yes | - | - | Field discovered from code reference in onboarding-service.ts |
| `updatePayload` | `Timestamp` | Yes | - | - | Field discovered from code reference in onboarding-service.ts |
| `updatedAt` | `Timestamp` | Yes | - | - | Field discovered from code reference in onboarding-service.ts |
| `requests` | `any` | Yes | - | - | Field discovered from code reference in onboarding-service.ts |

---

*Generated automatically by [DocuPulse](https://github.com/docupulse/docupulse)*
