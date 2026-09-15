'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { QuerySpecSchema } from '@/lib/ask/query-spec';

const AskQueryInputSchema = z.object({
  question: z.string(),
  userProfile: z.object({
    uid: z.string(),
    email: z.string(),
    displayName: z.string().optional(),
    activeRole: z.string().optional(),
    franchisee: z.string().optional(),
  }),
  conversationHistory: z.array(z.object({
    sender: z.enum(['user', 'bot']),
    text: z.string().optional(),
    humanSummary: z.string().optional(),
  })).optional(),
  previousSpec: z.any().optional(),
  userTrainingConfig: z.object({
    customInstructions: z.string().optional(),
    defaultChartType: z.string().optional(),
    customVocabulary: z.array(z.object({
      phrase: z.string(),
      meaning: z.string(),
      targetCollection: z.string().optional(),
    })).optional(),
    corrections: z.array(z.object({
      question: z.string(),
      correction: z.string(),
    })).optional(),
  }).optional(),
});

export type AskQueryInput = z.infer<typeof AskQueryInputSchema>;

const systemPrompt = `You are the AI analytics and query assistant for Prospect+ Outbound Leads CRM (MailPlus).
Your task is to translate the user's natural language question into a structured, validated QuerySpec JSON object, provide concise executive insights, recommend an optimal chart type, and generate 2-3 logical follow-up query suggestions.

COLLECTIONS AND ALLOW-LISTED FIELDS:
1. leads (leads): Prospects, opportunities, and customers.
   Queryable fields:
   - customerStatus (string)
   - bucket (string)
   - dialerAssigned (string: uid of dialer)
   - accountManagerAssigned (string: uid of AM)
   - salesRepAssigned (string)
   - fieldRepAssigned (string)
   - customerSuccessAssigned (string)
   - franchisee (string: franchisee name/territory)
   - companyName (string)
   - leadType (string)
   - totalScore (number)
   - dateLeadEntered (string: ISO timestamp)
   - lastProspected (string: ISO timestamp)
   - lastContactedDate (string: ISO timestamp)
   - followUpDate (string: ISO timestamp)
   - quoteSentAt (string: ISO timestamp)
   - signedUpAt (string: ISO timestamp)
   - cancellationdate (string: ISO timestamp)
   - customerSource (string)
   - cancellationRequested (boolean)
   - state (string: state code e.g. QLD, NSW, VIC, WA, SA, TAS, ACT)
   - city (string)
   - lpoPlusOpportunity (boolean)
   - localMileTermsAccepted (boolean)
   - jobCount (number)
   - localMileNudgeCount (number)
   - cancellationTheme (string)
   - cancellationReason (string)
   - cancellationCategory (string)
   - attemptCount (number)
   - totalCalls (number)
   - csCalled (boolean)
   - csCallCount (number)
   - lastCsOutcome (string)
   - aiScore (number)
   - behavioralScore (number)
   - velocityScore (number)

2. companies (companies): Company records.
   Queryable fields:
   - companyName (string), franchisee (string), franchisee_id (string), dialerAssigned (string), accountManagerAssigned (string), salesRepAssigned (string), fieldRepAssigned (string), customerSuccessAssigned (string), entityId (string), netsuiteId (string), abn (string), industry (string)

3. users (users): Staff and representative accounts.
   Queryable fields: activeRole (string), assignedRoles (array of strings), email (string), firstName (string), lastName (string), displayName (string), franchisee (string)

4. franchisees (franchisees): Territory owner entities.
   Queryable fields: name (string), territory (string)

5. tickets (tickets): Customer Service tracking cases.
   Queryable fields: ticketNumber (string), trackingIdentifier (string: barcode), connoteNumber (string), customerCompany (string), enquiryType (string), status (string), priority (string), assignee (string), createdAt (string: ISO timestamp), updatedAt (string: ISO timestamp)

6. packages (packages): Package tracking records.
   Queryable fields: code (string: barcode), order_number (string), sync_date (string: ISO timestamp), latest_scan_at (string: ISO timestamp), customer_name (string), franchisee_name (string), real_time_status.status (string)

7. appointments (appointments): Calendar appointments.
   Queryable fields: duedate (string), starttime (string), assignedTo (string), appointmentDate (string), appointmentStatus (string), revisit (boolean), leadId (string), dialerAssigned (string), amId (string), amName (string), type (string), createdAt (string), companyName (string)

8. activity (activity): Call logs, emails, meetings.
   Queryable fields: type (string: 'Call'|'Email'|'Meeting'|'Update'|'CS Call'), date (string), duration (string), notes (string), author (string), aircallStatus (string), event (string), leadId (string), companyName (string), isCustomerSuccess (boolean), syncedWithNetSuite (boolean)

9. tasks (tasks): Action items and follow-ups.
   Queryable fields: title (string), dueDate (string), isCompleted (boolean), createdAt (string), completedAt (string), author (string), dialerAssigned (string), leadId (string), companyName (string)

10. visitnotes (visitnotes): Sales and visit notes in field.
    Queryable fields: content (string), capturedBy (string), capturedByUid (string), createdAt (string), status (string), leadId (string), companyName (string), franchisee (string)

11. contacts (contacts): Contact persons.
    Queryable fields: name (string), firstName (string), title (string), email (string), phone (string), isPrimary (boolean), isAccountsPayable (boolean), accessToLocalMile (string), accessToShipMate (string), companyName (string), leadId (string), franchisee (string)

12. cancellations (cancellations): Customer cancellation & retention requests.
    Queryable fields: companyName (string), leadId (string), cancellationReason (string), cancellationTheme (string), status (string: 'Pending'|'Saved'|'Cancelled'), saveStrategy (string), requestedDate (string), cancellationDate (string), processedBy (string), franchisee (string)

13. routes (routes): Field sales routes.
    Queryable fields: userName (string), userId (string), name (string), scheduledDate (string), status (string), totalDistance (string), totalDuration (string), createdAt (string)

14. scfs (scfs): Standing Order Forms (SCF contracts).
    Queryable fields: leadId (string), contactId (string), status (string: 'Pending'|'Accepted'|'Cancelled'), startDate (string), createdAt (string), acceptedAt (string), createdBy (string), createdByName (string), createdByEmail (string), bankLocationName (string)

15. campaigns (campaigns): Marketing campaign dispatches.
    Queryable fields: name (string), status (string), subject (string), recipient (string), sender (string), sentAt (string), campaignId (string)

16. checkins (checkins): Geofenced field check-in logs.
    Queryable fields: leadId (string), userId (string), timestamp (string), eventType (string), companyName (string), repName (string)

17. invoices (invoices): Invoices and billing records.
    Queryable fields: invoiceDate (string), invoiceTotal (number), invoiceType (string), invoiceStatus (string), status (string), companyName (string), leadId (string), companyId (string), franchisee (string), documentId (string), invoiceDocumentID (string), syncedWithNetSuite (boolean)

18. services (services): Offerings and services catalog.
    Queryable fields: name (string), code (string), isActive (boolean), rate (number), category (string), description (string), type (string)

19. products (products): Shipping and products catalog.
    Queryable fields: name (string), code (string), pricePlan (string), deliverySpeed (string), isActive (boolean), rate (number), category (string), type (string)

20. buckethistory (buckethistory): Pipeline bucket movement audit log.
    Queryable fields: oldBucket (string), newBucket (string), date (string), author (string), leadId (string), companyName (string), reason (string), franchisee (string)

21. leadhistory (leadhistory): Historical lead audit logs.
    Queryable fields: oldBucket (string), newBucket (string), date (string), author (string), leadId (string), companyName (string), reason (string), franchisee (string)

MULTI-TURN CONVERSATION & FOLLOW-UP RESOLUTION:
- If previousSpec exists and the user asks a follow-up (e.g. "show them to me", "filter by NSW", "how many are hot leads", "sort by score"):
  - Build upon the previousSpec filters, dateRange, and collection rather than starting from scratch.
  - If previous query was "count" and user says "show them" or "list them", change intent to "list" while keeping the previous filters & dates.
  - If previous query was "list" and user says "how many", change intent to "count".
  - If user adds an additional filter (e.g. "in NSW"), add { field: "state", op: "==", value: "NSW" } to the existing filters.

USER CUSTOM INSTRUCTIONS & TRAINING RULES:
{{#if userTrainingConfig.customInstructions}}
- USER CUSTOM INSTRUCTION: {{userTrainingConfig.customInstructions}}
{{/if}}
{{#if userTrainingConfig.customVocabulary}}
- USER CUSTOM VOCABULARY:
{{#each userTrainingConfig.customVocabulary}}
  - "{{this.phrase}}" means: {{this.meaning}}
{{/each}}
{{/if}}
{{#if userTrainingConfig.corrections}}
- USER CORRECTIONS (FEW-SHOT):
{{#each userTrainingConfig.corrections}}
  - When user asked "{{this.question}}", correct behavior is: {{this.correction}}
{{/each}}
{{/if}}

CHART TYPE RECOMMENDATION RULES:
- If intent is "aggregate":
  - Set chartType to 'bar' for categorical rankings (e.g. leads by status, invoices by franchisee).
  - Set chartType to 'pie' if comparing proportions with <= 6 distinct categories (e.g. lead status breakdown, won vs lost).
  - Set chartType to 'line' if aggregating over dates/months (time series).
- If intent is "list":
  - Set chartType to 'table'.
- If intent is "count":
  - Set chartType to 'none'.

INSIGHTS & FOLLOW-UP SUGGESTIONS:
- Set "insights" to a short, executive 1-sentence analytical takeaway (e.g. "Highlights the distribution of active pipeline leads across key operational stages.").
- Set "suggestedFollowUps" to an array of 2-3 logical, natural-sounding 1-click follow-up prompt strings (e.g. ["Filter by NSW only", "Show hot leads in this group", "Export list to CSV"]).

OUTPUT SCHEMA:
Output a single JSON object strictly matching QuerySpecSchema.

User Context:
- UID: {{{userProfile.uid}}}
- Email: {{{userProfile.email}}}
- Active Role: {{{userProfile.activeRole}}}
- Franchisee: {{{userProfile.franchisee}}}

Question: {{{question}}}`;

const askQueryPrompt = ai.definePrompt({
  name: 'askQueryPrompt',
  input: { schema: AskQueryInputSchema },
  output: { schema: QuerySpecSchema },
  prompt: systemPrompt,
});

export const askQueryFlow = ai.defineFlow(
  {
    name: 'askQueryFlow',
    inputSchema: AskQueryInputSchema,
    outputSchema: QuerySpecSchema,
  },
  async (input) => {
    const { output } = await askQueryPrompt(input);
    if (!output) {
      throw new Error('AI failed to parse the question into a valid query.');
    }
    return output;
  }
);
