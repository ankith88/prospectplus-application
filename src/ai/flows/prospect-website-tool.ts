
'use server';
/**
 * @fileOverview A Genkit tool for prospecting a website for contacts using Hunter.io.
 */

import { ai } from '@/ai/genkit';
import { addContactToLead, getLeadFromFirebase } from '@/services/firebase';
import { sendContactToNetSuite } from '@/services/netsuite';
import { z } from 'genkit';
import fetch from 'node-fetch';
import type { Contact } from '@/lib/types';

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


export const prospectWebsiteTool = ai.defineTool(
  {
    name: 'prospectWebsite',
    description: 'Analyzes a website to extract social media links and contact information using the Hunter.io API. Saves new contacts to Firebase and syncs to NetSuite.',
    inputSchema: ProspectWebsiteInputSchema,
    outputSchema: ProspectWebsiteOutputSchema,
  },
  async ({ leadId, websiteUrl }) => {
    const apiKey = process.env.HUNTER_API_KEY;
    if (!apiKey) {
      console.error('Hunter.io API key is not configured.');
      throw new Error('Hunter.io API key is not configured.');
    }

    const domain = extractDomain(websiteUrl);
    if (!domain) {
      return {
        contacts: [],
        siteAnalysis: "Invalid website URL provided.",
      };
    }
    
    console.log(`Prospecting domain: ${domain} for lead ${leadId} using Hunter.io`);

    try {
      const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`;
      const response = await fetch(hunterUrl);

      if (!response.ok) {
        console.error(`Hunter.io API request failed with status: ${response.status}`);
        const errorBody = await response.text();
        console.error('Hunter.io error response:', errorBody);
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

      // Get existing contacts to avoid duplicates
      const lead = await getLeadFromFirebase(leadId, true);
      const getContactKey = (contact: {email?: string | null, phone?: string | null}) => {
          const email = (contact.email || '').toLowerCase();
          return email;
      };
      
      const existingContacts = new Set((lead?.contacts || []).map(getContactKey));
      
      const uniqueNewContacts = foundContacts.filter((contact: any) => {
        if (!contact.email) return false;
        const contactKey = getContactKey(contact);
        return !existingContacts.has(contactKey);
      });
      
      console.log(`Found ${uniqueNewContacts.length} new unique contacts to add.`);
      
      const savedContacts: Contact[] = [];

      // Save new contacts to Firebase and sync to NetSuite
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
          await sendContactToNetSuite({ leadId, contact: newContactWithId });
        }
      }

      return {
        logoUrl: hunterData?.data?.logo_url,
        contacts: savedContacts,
        siteAnalysis: `Found and saved ${savedContacts.length} new contacts via Hunter.io.`,
      };
    } catch (error) {
      console.error('Error during website prospecting with Hunter.io:', error);
      throw new Error('An error occurred while prospecting the website.');
    }
  }
);
