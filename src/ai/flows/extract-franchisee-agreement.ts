/**
 * @fileOverview Genkit AI flow to scrape and extract key information from Franchisee Agreement PDFs.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const ExtractFranchiseeAgreementInputSchema = z.object({
  pdfDataUri: z.string().describe("Base64 data URI of the Franchisee Agreement PDF document (e.g. data:application/pdf;base64,...)."),
  fileName: z.string().optional().describe("Original filename of the document."),
});
export type ExtractFranchiseeAgreementInput = z.infer<typeof ExtractFranchiseeAgreementInputSchema>;

export const GuarantorDetailSchema = z.object({
  name: z.string().optional().default(""),
  address: z.string().optional().default(""),
  email: z.string().optional().default(""),
});

export const ManagerDetailSchema = z.object({
  name: z.string().optional().default(""),
  address: z.string().optional().default(""),
  email: z.string().optional().default(""),
});

export const ExtractFranchiseeAgreementOutputSchema = z.object({
  entityName: z.string().optional().default("").describe("Legal company or franchisee entity name (e.g. Parveen Pty Ltd)."),
  acnAbn: z.string().optional().default("").describe("ACN or ABN number."),
  registeredAddress: z.string().optional().default("").describe("Registered address of the franchisee entity."),
  contactEmail: z.string().optional().default("").describe("Primary contact or personal email specified in agreement."),
  
  guarantors: z.array(GuarantorDetailSchema).optional().default([]).describe("List of guarantors listed in the agreement."),
  manager: ManagerDetailSchema.optional().describe("Nominated manager details if listed."),
  
  businessName: z.string().optional().default("").describe("Trading / business name (e.g. Mail Plus - Homebush)."),
  territoryName: z.string().optional().default("").describe("Territory description or location (e.g. Homebush (NSW))."),
  premisesAddress: z.string().optional().default("").describe("Premises address listed in Item 6."),
  
  commencementDate: z.string().optional().default("").describe("Agreement commencement date in YYYY-MM-DD or standard date format."),
  expiryDate: z.string().optional().default("").describe("Agreement expiry date in YYYY-MM-DD or standard date format."),
  termDuration: z.string().optional().default("").describe("Initial term duration (e.g. 5 years)."),
  renewalTerms: z.string().optional().default("").describe("Details of renewal terms (e.g. unlimited 5 year terms)."),
  
  depositAmount: z.number().optional().default(0).describe("Deposit amount in AUD."),
  initialFranchiseFee: z.string().optional().default("").describe("Initial franchise fee details."),
  franchiseServiceFee: z.string().optional().default("").describe("Franchise service fee (e.g. 25% of Turnover)."),
  marketingLevy: z.string().optional().default("").describe("Marketing levy percentage (e.g. 5% of Turnover)."),
  trainingFee: z.number().optional().default(0).describe("Training fee amount in AUD."),
  transferFee: z.number().optional().default(0).describe("Transfer fee amount in AUD."),
  renewalFee: z.string().optional().default("").describe("Renewal fee details."),
  defaultInterestRate: z.string().optional().default("").describe("Default interest rate (e.g. 13.5% per annum)."),
  
  specialConditions: z.array(z.string()).optional().default([]).describe("List of special conditions or variations noted in Item 23."),
  signatories: z.array(z.string()).optional().default([]).describe("Names of signatories who executed the agreement."),
  executionDate: z.string().optional().default("").describe("Date document was signed/executed."),
});
export type ExtractFranchiseeAgreementOutput = z.infer<typeof ExtractFranchiseeAgreementOutputSchema>;

const extractFranchiseeAgreementPrompt = ai.definePrompt({
  name: 'extractFranchiseeAgreementPrompt',
  input: { schema: ExtractFranchiseeAgreementInputSchema },
  output: { schema: ExtractFranchiseeAgreementOutputSchema },
  prompt: `You are an expert legal document analyst specializing in Mail Plus Franchise Agreements.
Analyze the attached Franchise Agreement PDF document and extract all essential operational, commercial, entity, and financial details.

Document Media:
{{media url=pdfDataUri}}

Tasks to Extract:
1. Franchisee Entity Name (e.g. Parveen Pty Ltd), ACN/ABN (e.g. ACN 661 486 778 or ABN), registered address, and primary email address.
2. Guarantors: Full name(s), address(es), and email address(es) of all guarantors listed in Item 2 or execution section.
3. Manager: Name, address, and email of the nominated manager in Item 3.
4. Business & Territory Details: Business Name (Item 4), Territory Name/Description (Item 5), Premises Address (Item 6).
5. Dates & Term: Commencement Date (Item 8), Expiry Date (Item 9), Initial Term duration (Item 7), and Renewal Terms (Item 10). Format dates as YYYY-MM-DD whenever possible.
6. Financial Fees & Amounts (from Schedule of Franchised Business details):
   - Deposit amount (numeric AUD, e.g. 5000)
   - Initial Franchise Fee description or amount
   - Franchise Service Fee (e.g. "25% of Turnover")
   - Marketing Levy (e.g. "5% of Turnover")
   - Training Fee (numeric AUD, e.g. 3000)
   - Transfer Fee (numeric AUD, e.g. 3000)
   - Renewal Fee description (e.g. "Nil (administrative costs of $2,500 must be paid on each renewal)")
   - Default Interest Rate (e.g. "13.5% per annum")
7. Special Conditions: Any custom clauses listed under Item 23 / Special Conditions.
8. Signatories: Full names of all persons who signed or DocuSigned the agreement, and execution date if visible.

Ensure high precision and accuracy. Provide the output matching the specified JSON schema.
`,
});

const extractFranchiseeAgreementFlow = ai.defineFlow(
  {
    name: 'extractFranchiseeAgreementFlow',
    inputSchema: ExtractFranchiseeAgreementInputSchema,
    outputSchema: ExtractFranchiseeAgreementOutputSchema,
  },
  async (input) => {
    if (!input.pdfDataUri) {
      throw new Error("PDF data URI must be provided.");
    }
    const { output } = await extractFranchiseeAgreementPrompt(input);
    if (!output) {
      throw new Error("AI failed to extract information from the Franchisee Agreement.");
    }
    return output;
  }
);

export async function extractFranchiseeAgreement(
  input: ExtractFranchiseeAgreementInput
): Promise<ExtractFranchiseeAgreementOutput> {
  return extractFranchiseeAgreementFlow(input);
}
