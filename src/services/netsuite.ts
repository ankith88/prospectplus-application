/**
 * @fileOverview A service for interacting with the NetSuite API.
 */
import type { Lead } from '@/lib/types'

// This is a placeholder for the actual NetSuite API client.
// In a real application, you would use an OAuth 1.0 library to sign requests.
async function getLeadsFromNetSuite(): Promise<Lead[]> {
  console.log("Fetching leads from NetSuite...")
  console.log("Account ID:", process.env.NETSUITE_ACCOUNT_ID)
  // This is where you would implement the actual API call to NetSuite.
  // For this example, we will return a modified version of the static data
  // to simulate a live API call.
  
  // You would typically use an HTTP client with OAuth 1.0a authentication.
  // const url = `https://${process.env.NETSUITE_ACCOUNT_ID}.suitetalk.api.netsuite.com/services/rest/record/v1/lead`
  // const headers = { /* ... OAuth headers ... */ }
  // const response = await fetch(url, { headers })
  // const data = await response.json()
  // return data.items.map(transformNetSuiteLeadToCrmLead)

  // Returning static data for demonstration purposes
  return [
    {
      id: 'ns-lead-1',
      name: 'Alex Johnson',
      title: 'Marketing Director',
      company: 'Innovate Corp',
      email: 'alex.j@innovate.com',
      phone: '+1-202-555-0176',
      status: 'New',
      avatarUrl: 'https://placehold.co/100x100/E2E8F0/475569.png?text=AJ',
      profile: 'Alex is the Marketing Director at Innovate Corp, a fast-growing tech startup specializing in AI-driven analytics. They recently secured Series B funding. Alex has shown interest in marketing automation tools and has downloaded a whitepaper on lead generation.',
      activity: [
        { id: 'act-1-1', type: 'Email', date: '2023-10-26', notes: 'Initial outreach email sent.' },
      ],
    },
    {
      id: 'ns-lead-2',
      name: 'Samantha Rodriguez',
      title: 'VP of Sales',
      company: 'Quantum Solutions',
      email: 's.rodriguez@quantum.co',
      phone: '+1-310-555-0188',
      status: 'Contacted',
      avatarUrl: 'https://placehold.co/100x100/E2E8F0/475569.png?text=SR',
      profile: 'Samantha is the VP of Sales at Quantum Solutions, a large enterprise in the logistics sector. The company is looking to overhaul its CRM system. Samantha has 15 years of experience in sales leadership and is focused on improving team efficiency.',
      activity: [
        { id: 'act-2-1', type: 'Call', duration: '15m 20s', date: '2023-10-25', notes: 'Introductory call. Discussed current CRM pain points. Follow-up scheduled.' },
        { id: 'act-2-2', type: 'Email', date: '2023-10-22', notes: 'Initial contact.' },
      ],
    },
  ];
}


// Placeholder for data transformation logic
// function transformNetSuiteLeadToCrmLead(netsuiteLead: any): Lead {
//   return {
//     id: netsuiteLead.id,
//     name: netsuiteLead.fields.companyName,
//     ...
//   }
// }


export { getLeadsFromNetSuite }
