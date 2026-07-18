'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { QuerySpecSchema, COLLECTION_FIELDS } from '@/lib/ask/query-spec';

const AskQueryInputSchema = z.object({
  question: z.string(),
  userProfile: z.object({
    uid: z.string(),
    email: z.string(),
    displayName: z.string().optional(),
    activeRole: z.string().optional(),
    franchisee: z.string().optional(),
  }),
});

export type AskQueryInput = z.infer<typeof AskQueryInputSchema>;

const systemPrompt = `You are the database query assistant for Prospect+ Outbound Leads CRM.
Your task is to translate the user's natural language question into a structured, validated QuerySpec JSON object.

COLLECTIONS AND ALLOW-LISTED FIELDS:
1. leads (leads): Represents prospects, opportunities, and customers.
   Queryable fields:
   - status (string)
   - bucket (string)
   - dialerAssigned (string: uid of the dialer)
   - accountManagerAssigned (string: uid of the AM)
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

2. companies (companies): Company records.
   Queryable fields:
   - companyName (string)
   - franchisee (string: franchisee name/territory)
   - franchisee_id (string)
   - dialerAssigned (string)
   - accountManagerAssigned (string)
   - salesRepAssigned (string)
   - fieldRepAssigned (string)
   - customerSuccessAssigned (string)

3. users (users): Staff and representative accounts.
   Queryable fields:
   - activeRole (string)
   - assignedRoles (array of strings)
   - email (string)
   - firstName (string)
   - lastName (string)
   - displayName (string)
   - franchisee (string)

4. franchisees (franchisees): Territory owner entities.
   Queryable fields:
   - name (string)
   - territory (string)

RULES & TERMINOLOGY:
- Intent is "list" (retrieve matching records), "count" (count of records), or "aggregate" (grouping/summaries).
- If the user asks for "my" leads or "leads assigned to me", inject a filter on the appropriate field.
  - If user activeRole is 'Account Manager' / 'Account Managers', filter 'accountManagerAssigned' == userProfile.uid.
  - If user activeRole is 'Dialer' / 'Lead Gen', filter 'dialerAssigned' == userProfile.uid.
  - If user activeRole is 'Field Sales', filter 'fieldRepAssigned' == userProfile.uid.
- Status values include: New, Hot Lead, Priority Lead, Contacted, In Progress, Connected, High Touch, Qualified, Pre Qualified, Quote Sent, Won, Lost, Lost Customer, Unqualified, Out of Territory, Future Follow-up, No Answer, Trialing ShipMate.
- Bucket values include: outbound, field_sales, inbound, account_manager, customer_success, nurture, marketing.
- When filtering dates (e.g. "this week", "last month", "yesterday", "today"), use the 'dateRange' field in the QuerySpec. Set dateRange.field to the relevant timestamp field (e.g., dateLeadEntered, signedUpAt, etc.) and dateRange.from/dateRange.to to the relative range name (e.g. "this_week", "last_month", "today", "yesterday") so the query runner can resolve the exact boundaries.
- Limit clamp: default to 25, maximum is 100.
- "won leads" / "leads we won" corresponds to leads with status == "Won".
- "quotes sent" corresponds to status == "Quote Sent".
- "out of territory leads" corresponds to status == "Out of Territory".
- "dialers" means users with activeRole == "Dialer" or assignedRoles array-contains "Dialer" (or activeRole == "Lead Gen" / "Lead Gen Admin").

Output a single JSON object strictly matching the QuerySpec schema. Use the humanSummary field to explain in one plain English sentence what the query does.

User context:
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
