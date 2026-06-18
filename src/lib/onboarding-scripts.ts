import { Step } from 'react-joyride';

export type OnboardingRouteKey = 
  | '/field-sales' 
  | '/capture-visit'
  | '/leads' 
  | '/lead-profile' 
  | '/customer-success/pipeline' 
  | '/account-manager/pipeline' 
  | '/admin/brand-bot'
  | '/admin/marketing'
  | '/company-profile'
  | '/leads/new';

export const onboardingScripts: Record<OnboardingRouteKey, Step[]> = {
  '/field-sales': [
    {
      target: '#step-trigger-daily-area-log',
      content: 'Before seeing prospects, you must log your territory here. This wipes stale GPS caches and syncs reporting logs for your franchise boundary. Click the button to open the log.',
      skipBeacon: true,
      blockTargetInteraction: false,
      placement: 'bottom',
    },
    {
      target: '#step-daily-area-log-dialog',
      content: 'Here you confirm your daily deployment. This ensures you are tracked properly for the day.',
      placement: 'right',
    },
    {
      target: '#step-territory-pin',
      content: 'This represents a prospect in your geofenced area. Tap a prospect pin to view details and start a visit.',
      placement: 'top',
    }
  ],
  '/capture-visit': [
    {
      target: '#step-capture-visit-form',
      content: 'Placeholder text like \'N/A\' is structurally blocked to keep communications accurate. Make sure to input valid Email Suffixes and ABN continuous digits.',
      placement: 'left',
    },
    {
      target: '#step-no-access-outcome',
      content: 'Selecting this instantly flips your field assignment to false, rolls the pipeline back to \'New\', and reassigns this profile directly to your Inside Dialer (Linked BDR).',
      placement: 'top',
    }
  ],
  '/leads': [
    {
      target: '#step-priority-dial-table',
      content: 'This is the prioritized CRM table indexing and AI lead weights. Focus your efforts here first.',
      skipBeacon: true,
      placement: 'bottom',
    },
    {
      target: '#step-performance-telemetry',
      content: 'These dashboard performance logging counters track your execution down to the millisecond.',
      placement: 'top',
    },
    {
      target: '#step-audience-filters',
      content: 'Use these dynamic list constructor dropdowns querying customerCampaign, salesRepAssigned, and franchisee elements.',
      placement: 'left',
    }
  ],
  '/lead-profile': [
    {
      target: '#step-tab-profile',
      content: 'The Profile tab displays all critical firmographics, addresses, standing orders, and quick access templates for this Lead.',
      placement: 'bottom',
    },
    {
      target: '#step-tab-contacts',
      content: 'The Contacts tab houses all identified employees, their titles, direct lines, and emails.',
      placement: 'bottom',
    },
    {
      target: '#step-tab-insights',
      content: 'The AI Insights tab automatically scrapes the prospect\'s website to surface target audience vectors and talking points.',
      placement: 'bottom',
    },
    {
      target: '#step-tab-quotes',
      content: 'The Quotes tab lets you review all historical Service Creation Forms (SCFs) and generated quotes for this lead.',
      placement: 'bottom',
    },
    {
      target: '#step-tab-tasks',
      content: 'The Tasks tab manages your follow-ups, to-dos, and next best actions surfaced by AI.',
      placement: 'bottom',
    },
    {
      target: '#step-assignment-ledger',
      content: 'The History tab provides a comprehensive audit log of status changes, bucket handoffs, and past call transcripts.',
      placement: 'top',
    },
    {
      target: '#step-post-call-outcome',
      content: 'This button manually triggers the post-call outcome screen, which otherwise locks your screen when an AirCall finishes. You are strictly required to pick an audited outcome before you can proceed.',
      placement: 'left',
    },
    {
      target: '#step-log-note-btn',
      content: 'Use this button to append a simple text note to the timeline, maintaining the lead\'s historical context.',
      placement: 'left',
    },
    {
      target: '#step-edit-profile-btn',
      content: 'Click here to edit the core demographic details of the lead, such as company name, size, and address details.',
      placement: 'bottom',
    },
    {
      target: '#step-sale-deals',
      content: 'The Sale Deals dropdown contains options for converting this lead, such as generating Quotes, processing Signups, or offering Free Trials.',
      placement: 'left',
    }
  ],
  '/company-profile': [
    {
      target: '#step-tab-profile',
      content: 'The Profile tab displays all critical firmographics, addresses, and quick access templates for this Company.',
      placement: 'bottom',
    },
    {
      target: '#step-tab-contacts',
      content: 'The Contacts tab houses all identified employees, their titles, direct lines, and emails.',
      placement: 'bottom',
    },
    {
      target: '#step-tab-insights',
      content: 'The AI Insights tab automatically scrapes the company\'s website to surface target audience vectors and talking points.',
      placement: 'bottom',
    },
    {
      target: '#step-tab-quotes',
      content: 'The Quotes tab lets you review all historical Service Creation Forms (SCFs) and generated quotes for this company.',
      placement: 'bottom',
    },
    {
      target: '#step-tab-tasks',
      content: 'The Tasks tab manages your follow-ups, to-dos, and next best actions surfaced by AI.',
      placement: 'bottom',
    },
    {
      target: '#step-assignment-ledger',
      content: 'The History tab provides a comprehensive audit log of status changes, bucket handoffs, and past call transcripts.',
      placement: 'top',
    },
    {
      target: '#step-log-note-btn',
      content: 'Use this button to append a text note to the company timeline, maintaining historical context for account managers.',
      placement: 'left',
    },
    {
      target: '#step-edit-profile-btn',
      content: 'Click here to edit the core demographic details of the company, such as name, size, and address details.',
      placement: 'bottom',
    },
    {
      target: '#step-sale-deals',
      content: 'The Sale Deals dropdown contains options for processing new signups or offering free trials to this company.',
      placement: 'left',
    }
  ],
  '/leads/new': [
    {
      target: '#step-company-search',
      content: 'Start by searching for the prospect\'s business name or partial address here. The Google Places API will instantly fetch firmographics like website and phone numbers.',
      placement: 'bottom',
    },
    {
      target: '#step-address-autocomplete',
      content: 'Using the Google address autocomplete ensures data accuracy. The system will automatically parse the zip code to decide which franchisee territory this lead falls into and who can service the customer.',
      placement: 'bottom',
    }
  ],
  '/customer-success/pipeline': [
    {
      target: '#step-lifecycle-chevron',
      content: 'Observe how leads are pushed programmatically between stages like Trialing ShipMate or Free Trial.',
      skipBeacon: true,
      placement: 'bottom',
    },
    {
      target: '#step-scf-form',
      content: 'Configure dynamic rates and frequencies here. Fields auto-populate from NetSuite\'s database architecture using Mustache merge field properties.',
      placement: 'left',
    },
    {
      target: '#step-process-mode-toggle',
      content: 'Toggling this option elevates standard CRM logging into an active NetSuite transaction state, restricting selection to audited financial pipelines.',
      placement: 'right',
    },
    {
      target: '#step-netsuite-sync-btn',
      content: 'On click, data pushes natively to NetSuite ERP. If the network fails, a local fallback loop saves the data to Firestore so no client orders are ever lost.',
      placement: 'top',
    }
  ],
  '/account-manager/pipeline': [
    {
      target: '#step-retention-segments',
      content: 'These are the three dynamic lifestyle buckets: Priority Focus, Newly Assigned, and Active WIP.',
      skipBeacon: true,
      placement: 'bottom',
    },
    {
      target: '#step-assignment-ledger',
      content: 'These timeline audit logs track historical handoffs between BDRs, Field Reps, and previous managers.',
      placement: 'top',
    }
  ],
  '/admin/brand-bot': [
    {
      target: '#step-brand-bot-config',
      content: 'Input Positioning, ICP matrices, and Voice rules here. These securely seed Firebase Genkit prompt iterations.',
      skipBeacon: true,
      placement: 'bottom',
    },
    {
      target: '#step-design-tokens',
      content: 'The campaign template builder programmatically inherits and locks corporate colors (#095c7b, #eaf143) and typography (Inter) here.',
      placement: 'right',
    }
  ],
  '/admin/marketing': [
    {
      target: '#step-domain-integration',
      content: 'Emails dispatch cleanly via the Microsoft Graph API using the @mailplus.com.au domain from here.',
      placement: 'top',
    },
    {
      target: '#step-suppression-lists',
      content: 'Automatic suppression logic is triggered here when an end-recipient hits a footer unsubscribe link.',
      placement: 'bottom',
    }
  ]
};
