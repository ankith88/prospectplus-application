
'use server';
/**
 * @fileOverview An AI flow to analyze a business card image and extract information.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BusinessCardAnalysisInputSchema = z.object({
  imageDataUri: z.string().describe("A photo of a business card as a data URI."),
});
export type BusinessCardAnalysisInput = z.infer<typeof BusinessCardAnalysisInputSchema>;

const BusinessCardAnalysisOutputSchema = z.object({
  companyName: z.string().optional().describe("The name of the company on the business card."),
  personName: z.string().optional().describe("The name of the person on the business card."),
  jobTitle: z.string().optional().describe("The job title of the person."),
  phoneNumber: z.string().optional().describe("The phone number."),
  email: z.string().optional().describe("The email address."),
  website: z.string().optional().describe("The company website."),
  address: z.string().optional().describe("The full address on the card."),
});
export type BusinessCardAnalysisOutput = z.infer<typeof BusinessCardAnalysisOutputSchema>;

const analyzeBusinessCardPrompt = ai.definePrompt({
    name: 'analyzeBusinessCardPrompt',
    input: { schema: BusinessCardAnalysisInputSchema },
    output: { schema: BusinessCardAnalysisOutputSchema },
    prompt: `You are an expert business card reader. Analyze the following image of a business card and extract the key information.

    Business Card Image:
    {{media url=imageDataUri}}

    Your Tasks:
    1.  Extract the company name.
    2.  Extract the person's full name.
    3.  Extract the person's job title.
    4.  Extract the primary phone number.
    5.  Extract the email address.
    6.  Extract the website URL.
    7.  Extract the full physical address.

    Provide the output in the specified JSON format. If a piece of information is not present, omit the field or leave it as an empty string.
    `,
});

const analyzeBusinessCardFlow = ai.defineFlow(
    {
        name: 'analyzeBusinessCardFlow',
        inputSchema: BusinessCardAnalysisInputSchema,
        outputSchema: BusinessCardAnalysisOutputSchema,
    },
    async (input) => {
        const { output } = await analyzeBusinessCardPrompt(input);
        if (!output) {
            throw new Error("AI failed to analyze the business card.");
        }
        return output;
    }
);

export async function analyzeBusinessCard(input: BusinessCardAnalysisInput): Promise<BusinessCardAnalysisOutput> {
    return analyzeBusinessCardFlow(input);
}
