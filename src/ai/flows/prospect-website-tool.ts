
'use server';
/**
 * @fileOverview A Genkit tool for prospecting a website for contacts using Hunter.io.
 */

import { ai } from '@/ai/genkit';
import { addContactToLead, getLeadFromFirebase, updateLeadDetails } from '@/services/firebase';
import { sendContactToNetSuite } from '@/services/netsuite';
import { z } from 'genkit';
import fetch, { AbortError } from 'node-fetch';
import type { Contact } from '@/lib/types';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

const SocialLinksSchema = z.object({
  linkedIn: z.string().optional(),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
});

const ContactSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

const ProspectWebsiteOutputSchema = z.object({
  logoUrl: z.string().optional().describe("The URL of the company's logo found on the website."),
  socialLinks: SocialLinksSchema.optional().describe("Social media links found on the website."),
  contacts: z.array(ContactSchema).optional().describe("Contacts found on the website."),
  siteAnalysis: z.string().optional().describe("A brief analysis of the website content for shipping-related keywords."),
  companyDescription: z.string().optional().describe("A brief description of the company's business based on website content."),
});

const ProspectWebsiteInputSchema = z.object({
  leadId: z.string().describe('The ID of the lead to associate the contacts with.'),
  websiteUrl: z.string().describe('The URL of the website to prospect.'),
});

function extractDomain(url: string): string | null {
    try {
        const hostname = new URL(url).hostname;
        // Remove 'www.' if it exists
        return hostname.replace(/^www\./, '');
    } catch (error) {
        console.error("Invalid URL for domain extraction:", url, error);
        return null;
    }
}

/**
 * Extracts a name from an email address.
 * e.g., 'john.doe@example.com' -> 'John Doe'
 */
function extractNameFromEmail(email: string): string {
    try {
        const namePart = email.split('@')[0];
        const names = namePart.replace(/[._-]/g, ' ').split(' ');
        const capitalizedNames = names.map(name => name.charAt(0).toUpperCase() + name.slice(1));
        return capitalizedNames.join(' ');
    } catch (e) {
        return 'N/A'; // Fallback for weirdly formatted emails
    }
}

const summarizeWebsitePrompt = ai.definePrompt({
    name: 'summarizeWebsitePrompt',
    input: { schema: z.object({ siteContent: z.string() }) },
    output: { schema: z.object({ summary: z.string().describe("A detailed description of the company's business, what they sell, and their target customers, based on the website content.") }) },
    prompt: `You are an expert business analyst. Based on the following website content, provide a detailed description of the company. 

    Your description should cover:
    1. The company's core business and mission.
    2. The key products or services they offer.
    3. Their primary target audience or customer base.

    Website Content:
    """
    {{{siteContent}}}
    """
    `,
});


export const prospectWebsiteTool = ai.defineTool(
  {
    name: 'prospectWebsite',
    description: 'Analyzes a website to extract social media links and contact information using the Hunter.io API. Also generates a company description. Saves new contacts to Firebase and syncs to NetSuite.',
    inputSchema: ProspectWebsiteInputSchema,
    outputSchema: ProspectWebsiteOutputSchema,
  },
  async ({ leadId, websiteUrl }) => {
    let companyDescription = '';
    
    // Step 1: Fetch and analyze website content for a description. This is non-critical.
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 10000); // 10-second timeout

        const websiteResponse = await fetch(websiteUrl, { signal: controller.signal });
        
        clearTimeout(timeout);

        if (websiteResponse.ok) {
            const html = await websiteResponse.text();
            const textContent = html.replace(/<style[^>]*>.*<\/style>/gs, '')
                                    .replace(/<script[^>]*>.*<\/script>/gs, '')
                                    .replace(/<[^>]+>/g, ' ')
                                    .replace(/\s+/g, ' ')
                                    .trim();
            
            if (textContent) {
                const { output } = await summarizeWebsitePrompt({ siteContent: textContent.substring(0, 8000) });
                if (output?.summary) {
                    companyDescription = output.summary;
                }
            }
        }
    } catch (error: any) {
         if (error.name === 'AbortError') {
            console.error('Non-critical error: Website content fetch timed out.');
        } else {
            console.error('Non-critical error fetching or summarizing website content:', error);
        }
    }

    // Step 2: Prospect for contacts using Hunter.io. This is the primary function.
    try {
        const apiKey = process.env.HUNTER_API_KEY;
        if (!apiKey) {
            throw new Error('Hunter.io API key is not configured.');
        }

        const domain = extractDomain(websiteUrl);
        if (!domain) {
            return { siteAnalysis: "Invalid website URL provided." };
        }
        
        console.log(`Prospecting domain: ${domain} for lead ${leadId} using Hunter.io`);
        const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 15000); // 15-second timeout for Hunter API

        let response;
        try {
            response = await fetch(hunterUrl, { signal: controller.signal });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Hunter.io API request failed with status: ${response.status}`, errorBody);
            throw new Error(`Hunter.io API request failed: ${response.statusText}`);
        }

        const hunterData = await response.json() as any;

        const foundContacts = hunterData?.data?.emails?.map((emailInfo: any) => {
            const fullName = `${emailInfo.first_name || ''} ${emailInfo.last_name || ''}`.trim();
            return {
                name: fullName || extractNameFromEmail(emailInfo.value),
                title: emailInfo.position || 'N/A',
                email: emailInfo.value,
                phone: emailInfo.phone_number || 'N/A',
            };
        }) || [];

        console.log(`Found ${foundContacts.length} potential contacts from Hunter.io.`);

        const lead = await getLeadFromFirebase(leadId, true);
        if (!lead) {
            console.error(`Could not find lead with ID ${leadId}. Skipping contact processing.`);
            return {
                logoUrl: hunterData?.data?.logo_url,
                contacts: [],
                siteAnalysis: "Could not find associated lead in Firebase.",
                companyDescription: companyDescription,
            };
        }
        
        // Update the company description in Firestore if a new one was generated
        if (companyDescription) {
            await updateDoc(doc(firestore, 'leads', leadId), { companyDescription });
        }
        
        const getContactKey = (contact: {email?: string | null, phone?: string | null}) => (contact.email || '').toLowerCase();
        
        const existingContacts = new Set((lead.contacts || []).map(getContactKey));
        
        const uniqueNewContacts = foundContacts.filter((contact: any) => {
            if (!contact.email) return false;
            const contactKey = getContactKey(contact);
            return !existingContacts.has(contactKey);
        });
        
        console.log(`Found ${uniqueNewContacts.length} new unique contacts to add.`);
        
        const savedContacts: Contact[] = [];
        for (const contact of uniqueNewContacts) {
            if (contact.email) {
                const contactData = {
                    name: contact.name,
                    title: contact.title || 'N/A',
                    email: contact.email,
                    phone: contact.phone || 'N/A',
                };
                const contactId = await addContactToLead(leadId, contactData);
                const newContactWithId: Contact = { ...contactData, id: contactId };
                savedContacts.push(newContactWithId);
                
                // Wrap NetSuite call in a try/catch to prevent it from crashing the whole tool
                try {
                    await sendContactToNetSuite({ leadId, contact: newContactWithId });
                } catch (netsuiteError) {
                    console.error(`[Non-critical] Failed to sync contact ${contact.email} for lead ${leadId} to NetSuite:`, netsuiteError);
                    // Do not re-throw; allow the main function to continue.
                }
            }
        }

        return {
            logoUrl: hunterData?.data?.logo_url,
            contacts: savedContacts,
            siteAnalysis: `Found and saved ${savedContacts.length} new contacts via Hunter.io.`,
            companyDescription: companyDescription,
        };

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('Error during website prospecting with Hunter.io: API call timed out.');
            throw new Error('The request to the prospecting service timed out.');
        }
        console.error('Error during website prospecting with Hunter.io:', error);
        throw new Error('An error occurred while prospecting the website.');
    }
  }
);
