'use server';
/**
 * @fileOverview A Genkit tool for prospecting a website for contacts and social media links.
 */

import { ai } from '@/ai/genkit';
import { addContactToLead, updateLeadAvatar } from '@/services/firebase';
import { z } from 'genkit';

const SocialLinksSchema = z.object({
  linkedIn: z.string().optional(),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
});

const ContactSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  email: z.string().optional(),
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

export const prospectWebsiteTool = ai.defineTool(
  {
    name: 'prospectWebsite',
    description: 'Analyzes a website to extract social media links, contact information, and relevant keywords. This tool does not actually crawl the website, but simulates the result of such an operation for demonstration purposes.',
    inputSchema: ProspectWebsiteInputSchema,
    outputSchema: ProspectWebsiteOutputSchema,
  },
  async ({ leadId, websiteUrl }) => {
    // In a real application, you would use a web scraping library
    // (e.g., Cheerio, Puppeteer) to fetch and parse the website content.
    // For this demo, we'll return mock data based on the URL.
    console.log(`Prospecting website (mock): ${websiteUrl} for lead ${leadId}`);

    if (websiteUrl.includes('123buynow')) {
      const foundContacts = [
        {
          name: 'John Doe',
          title: 'CEO',
          email: 'john.d@123buynow.com.au',
        },
        {
          name: 'Jane Smith',
          title: 'Head of Logistics',
          email: 'jane.s@123buynow.com.au',
        },
      ];
      const logoUrl = 'https://mailplus.com.au/wp-content/uploads/2021/02/mailplus-new-logo-solo-copy-4.png';

      // Save contacts to Firebase
      for (const contact of foundContacts) {
        if (contact.name && contact.email) {
          await addContactToLead(leadId, {
            id: '', // Firestore will generate an ID
            name: contact.name,
            title: contact.title || 'N/A',
            email: contact.email,
            phone: 'N/A', // No phone in mock data
          });
        }
      }
      
      // Update avatar in Firebase
      await updateLeadAvatar(leadId, logoUrl);

      return {
        logoUrl,
        socialLinks: {
          linkedIn: 'https://linkedin.com/company/123-buy-now',
          twitter: 'https://x.com/123buynow',
        },
        contacts: foundContacts,
        siteAnalysis: "The website mentions 'e-commerce store', 'shipping options', and 'returns policy', indicating they ship physical goods.",
      };
    }
    
    // Return empty objects if no specific match
    return {
      logoUrl: undefined,
      socialLinks: {},
      contacts: [],
      siteAnalysis: "No specific shipping-related keywords found on the website.",
    };
  }
);
