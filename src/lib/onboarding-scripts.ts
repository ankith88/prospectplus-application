export type OnboardingRouteKey = 
  | '/field-sales' 
  | '/capture-visit'
  | '/leads' 
  | '/leads/inbound'
  | '/lead-profile' 
  | '/customer-success/pipeline' 
  | '/account-manager/pipeline' 
  | '/reports'
  | '/reports/inbound'
  | '/field-activity-report' 
  | '/account-manager/reports'
  | '/scans'
  | '/scans/report'
  | '/scans/top-users'
  | '/admin/brand-bot'
  | '/admin/marketing'
  | '/company-profile'
  | '/leads/new'
  | '/admin/dashboard';

export const onboardingScripts: Record<OnboardingRouteKey, any[]> = {
  '/field-sales': [
    {
      id: 'field-sales-1',
      attachTo: { element: '#step-trigger-daily-area-log', on: 'bottom' },
      text: 'Before seeing prospects, you must log your territory here. This wipes stale GPS caches and syncs reporting logs for your franchise boundary. Click the button to open the log.',
    },
    {
      id: 'field-sales-2',
      attachTo: { element: '#step-daily-area-log-dialog', on: 'right' },
      text: 'Here you confirm your daily deployment. This ensures you are tracked properly for the day.',
    },
    {
      id: 'field-sales-3',
      attachTo: { element: '#step-territory-pin', on: 'top' },
      text: 'This represents a prospect in your geofenced area. Tap a prospect pin to view details and start a visit.',
    }
  ],
  '/capture-visit': [
    {
      id: 'capture-visit-1',
      attachTo: { element: '#step-capture-visit-form', on: 'left' },
      text: 'Placeholder text like \'N/A\' is structurally blocked to keep communications accurate. Make sure to input valid Email Suffixes and ABN continuous digits.',
    },
    {
      id: 'capture-visit-2',
      attachTo: { element: '#step-no-access-outcome', on: 'top' },
      text: 'Selecting this instantly flips your field assignment to false, rolls the pipeline back to \'New\', and reassigns this profile directly to your Inside Dialer (Linked BDR).',
    }
  ],
  '/leads': [
    {
      id: 'leads-filters',
      attachTo: { element: '#step-leads-filters', on: 'bottom' },
      title: 'Filters & Search',
      text: 'Use these filters and the search bar to find exactly the leads you are looking for.',
    },
    {
      id: 'leads-export',
      attachTo: { element: '#step-leads-export', on: 'top' },
      title: 'Export Leads',
      text: 'Export your current list of leads to a CSV file for external reporting.',
    },
    {
      id: 'leads-table',
      attachTo: { element: '#step-leads-table', on: 'top' },
      title: 'Leads Table',
      text: 'View and manage all your assigned leads in this comprehensive table view.',
    }
  ],
  '/leads/inbound': [
    {
      id: 'inbound-leads-filters',
      attachTo: { element: '#step-leads-filters', on: 'bottom' },
      title: 'Filtering Inbound Leads',
      text: 'Refine your view of inbound leads using these filters.',
    },
    {
      id: 'inbound-leads-export',
      attachTo: { element: '#step-leads-export', on: 'top' },
      title: 'Export Inbound Leads',
      text: 'Export your current list of inbound leads to a CSV file.',
    },
    {
      id: 'inbound-leads-table',
      attachTo: { element: '#step-leads-table', on: 'top' },
      title: 'Inbound Leads Table',
      text: 'View and manage all your inbound leads in this comprehensive table view.',
    }
  ],
  '/lead-profile': [
    {
      id: 'lead-profile-1',
      attachTo: { element: '#step-tab-profile', on: 'bottom' },
      text: 'The Profile tab displays all critical firmographics, addresses, standing orders, and quick access templates for this Lead.',
    },
    {
      id: 'lead-profile-2',
      attachTo: { element: '#step-tab-contacts', on: 'bottom' },
      text: 'The Contacts tab houses all identified employees, their titles, direct lines, and emails.',
    },
    {
      id: 'lead-profile-3',
      attachTo: { element: '#step-tab-insights', on: 'bottom' },
      text: 'The AI Insights tab automatically scrapes the prospect\'s website to surface target audience vectors and talking points.',
    },
    {
      id: 'lead-profile-4',
      attachTo: { element: '#step-tab-quotes', on: 'bottom' },
      text: 'The Quotes tab lets you review all historical Service Creation Forms (SCFs) and generated quotes for this lead.',
    },
    {
      id: 'lead-profile-5',
      attachTo: { element: '#step-tab-tasks', on: 'bottom' },
      text: 'The Tasks tab manages your follow-ups, to-dos, and next best actions surfaced by AI.',
    },
    {
      id: 'lead-profile-6',
      attachTo: { element: '#step-assignment-ledger', on: 'top' },
      text: 'The History tab provides a comprehensive audit log of status changes, bucket handoffs, and past call transcripts.',
    },
    {
      id: 'lead-profile-7',
      attachTo: { element: '#step-post-call-outcome', on: 'left' },
      text: 'This button manually triggers the post-call outcome screen, which otherwise locks your screen when an AirCall finishes. You are strictly required to pick an audited outcome before you can proceed.',
    },
    {
      id: 'lead-profile-8',
      attachTo: { element: '#step-log-note-btn', on: 'left' },
      text: 'Use this button to append a simple text note to the timeline, maintaining the lead\'s historical context.',
    },
    {
      id: 'lead-profile-9',
      attachTo: { element: '#step-edit-profile-btn', on: 'bottom' },
      text: 'Click here to edit the core demographic details of the lead, such as company name, size, and address details.',
    },
    {
      id: 'lead-profile-10',
      attachTo: { element: '#step-sale-deals', on: 'left' },
      text: 'The Sale Deals dropdown contains options for converting this lead, such as generating Quotes, processing Signups, or offering Free Trials.',
    }
  ],
  '/company-profile': [
    {
      id: 'company-profile-1',
      attachTo: { element: '#step-tab-profile', on: 'bottom' },
      text: 'The Profile tab displays all critical firmographics, addresses, and quick access templates for this Company.',
    },
    {
      id: 'company-profile-2',
      attachTo: { element: '#step-tab-contacts', on: 'bottom' },
      text: 'The Contacts tab houses all identified employees, their titles, direct lines, and emails.',
    },
    {
      id: 'company-profile-3',
      attachTo: { element: '#step-tab-insights', on: 'bottom' },
      text: 'The AI Insights tab automatically scrapes the company\'s website to surface target audience vectors and talking points.',
    },
    {
      id: 'company-profile-4',
      attachTo: { element: '#step-tab-quotes', on: 'bottom' },
      text: 'The Quotes tab lets you review all historical Service Creation Forms (SCFs) and generated quotes for this company.',
    },
    {
      id: 'company-profile-5',
      attachTo: { element: '#step-tab-tasks', on: 'bottom' },
      text: 'The Tasks tab manages your follow-ups, to-dos, and next best actions surfaced by AI.',
    },
    {
      id: 'company-profile-6',
      attachTo: { element: '#step-assignment-ledger', on: 'top' },
      text: 'The History tab provides a comprehensive audit log of status changes, bucket handoffs, and past call transcripts.',
    },
    {
      id: 'company-profile-7',
      attachTo: { element: '#step-log-note-btn', on: 'left' },
      text: 'Use this button to append a text note to the company timeline, maintaining historical context for account managers.',
    },
    {
      id: 'company-profile-8',
      attachTo: { element: '#step-edit-profile-btn', on: 'bottom' },
      text: 'Click here to edit the core demographic details of the company, such as name, size, and address details.',
    },
    {
      id: 'company-profile-9',
      attachTo: { element: '#step-sale-deals', on: 'left' },
      text: 'The Sale Deals dropdown contains options for processing new signups or offering free trials to this company.',
    }
  ],
  '/leads/new': [
    {
      id: 'leads-new-1',
      attachTo: { element: '#step-company-search', on: 'bottom' },
      text: 'Start by searching for the prospect\'s business name or partial address here. The Google Places API will instantly fetch firmographics like website and phone numbers.',
    },
    {
      id: 'leads-new-2',
      attachTo: { element: '#step-address-autocomplete', on: 'bottom' },
      text: 'Using the Google address autocomplete ensures data accuracy. The system will automatically parse the zip code to decide which franchisee territory this lead falls into and who can service the customer.',
    }
  ],
  '/customer-success/pipeline': [
    {
      id: 'cs-pipeline-search',
      attachTo: { element: '#step-cs-search', on: 'bottom' },
      title: 'Pipeline Search',
      text: 'Quickly find a specific company in your pipeline by typing their name here.',
    },
    {
      id: 'cs-pipeline-filters',
      attachTo: { element: '#step-cs-filters', on: 'bottom' },
      title: 'Advanced Filters',
      text: 'Use this section to filter leads by Status, Campaign, and Location. It helps you focus on specific segments.',
    },
    {
      id: 'cs-pipeline-tabs',
      attachTo: { element: '#step-cs-tabs', on: 'bottom' },
      title: 'Pipeline Stages',
      text: 'The pipeline organizes leads into 5 dynamic buckets: Priority, Work in Progress, Quotes Out, Product Pending, and LocalMile. These tabs prioritize your daily workflow.',
    },
    {
      id: 'cs-pipeline-views',
      attachTo: { element: '#step-process-mode-toggle', on: 'bottom' },
      title: 'Visualization Modes',
      text: 'You can switch how you visualize leads between a Table, Kanban Board, Accordion Groups, or a flat Grid view depending on your preference.',
    },
    {
      id: 'cs-pipeline-sort',
      attachTo: { element: '#step-cs-sort', on: 'left' },
      title: 'Sort Leads',
      text: 'Sort the leads in your current view by Franchisee, Company Name, or Date Assigned to easily locate what you need.',
    }
  ],
  '/reports': [
    {
      id: 'reports-filters',
      attachTo: { element: '#step-outbound-filters', on: 'bottom' },
      title: 'Report Filters',
      text: 'Adjust the date range and other filters to customize the report data.',
    },
    {
      id: 'reports-metrics',
      attachTo: { element: '#step-outbound-metrics', on: 'top' },
      title: 'Key Metrics',
      text: 'View high-level performance indicators for your outbound activities.',
    }
  ],
  '/reports/inbound': [
    {
      id: 'inbound-reports-filters',
      attachTo: { element: '#step-inbound-filters', on: 'bottom' },
      title: 'Inbound Filters',
      text: 'Customize the inbound reporting data by adjusting these filters.',
    },
    {
      id: 'inbound-reports-metrics',
      attachTo: { element: '#step-inbound-metrics', on: 'top' },
      title: 'Inbound Metrics',
      text: 'Monitor key inbound performance metrics here.',
    },
    {
      id: 'inbound-reports-charts',
      attachTo: { element: '#step-inbound-charts', on: 'top' },
      title: 'Inbound Charts',
      text: 'Visualize your inbound lead data with these interactive charts.',
    }
  ],
  '/field-activity-report': [
    {
      id: 'field-activity-filters',
      attachTo: { element: '#step-field-filters', on: 'bottom' },
      title: 'Activity Filters',
      text: 'Filter field activities by date, representative, and type.',
    },
    {
      id: 'field-activity-metrics',
      attachTo: { element: '#step-field-metrics', on: 'top' },
      title: 'Activity Summary',
      text: 'Get a quick summary of total field activities.',
    },
    {
      id: 'field-activity-charts',
      attachTo: { element: '#step-field-charts', on: 'top' },
      title: 'Activity Breakdown',
      text: 'Visualize field activities over time and by outcome.',
    }
  ],
  '/account-manager/reports': [
    {
      id: 'am-reports-filters',
      attachTo: { element: '#step-am-filters', on: 'bottom' },
      title: 'AM Report Filters',
      text: 'Filter your Account Management reports by various parameters.',
    },
    {
      id: 'am-reports-metrics',
      attachTo: { element: '#step-am-metrics', on: 'top' },
      title: 'AM Key Metrics',
      text: 'View essential metrics for your account management performance.',
    },
    {
      id: 'am-reports-tabs',
      attachTo: { element: '#step-am-tabs', on: 'top' },
      title: 'Report Categories',
      text: 'Switch between different reporting categories for deeper insights.',
    }
  ],
  '/scans': [
    {
      id: 'scan-kpis',
      attachTo: { element: '#step-scan-kpis', on: 'bottom' },
      title: 'Scan KPIs',
      text: 'Review the high-level key performance indicators for scan events.',
    },
    {
      id: 'scan-filters',
      attachTo: { element: '#step-scan-filters', on: 'bottom' },
      title: 'Scan Filters',
      text: 'Filter the list of scan events to find specific items.',
    },
    {
      id: 'scan-table',
      attachTo: { element: '#step-scan-table', on: 'top' },
      title: 'Scan Events List',
      text: 'View and manage individual scan events in this table.',
    }
  ],
  '/scans/report': [
    {
      id: 'scan-report-filters',
      attachTo: { element: '#step-report-filters', on: 'bottom' },
      title: 'Reporting Filters',
      text: 'Filter your scan reports by date and other criteria.',
    },
    {
      id: 'scan-report-metrics',
      attachTo: { element: '#step-report-metrics', on: 'top' },
      title: 'Reporting Metrics',
      text: 'See the summary metrics for scan reporting.',
    },
    {
      id: 'scan-report-charts',
      attachTo: { element: '#step-report-charts', on: 'top' },
      title: 'Reporting Charts',
      text: 'Visualize the scan data with these interactive charts.',
    }
  ],
  '/scans/top-users': [
    {
      id: 'top-users-filters',
      attachTo: { element: '#step-top-filters', on: 'bottom' },
      title: 'Top Users Filters',
      text: 'Filter the top users list by specific date ranges.',
    },
    {
      id: 'top-users-table',
      attachTo: { element: '#step-top-table', on: 'top' },
      title: 'Top Users List',
      text: 'View the list of top signed customers based on scan activity.',
    }
  ],
  '/account-manager/pipeline': [
    {
      id: 'account-manager-1',
      attachTo: { element: '#step-pipeline-search', on: 'bottom' },
      text: 'Quickly find a specific company in your pipeline by typing their name here.',
    },
    {
      id: 'account-manager-2',
      attachTo: { element: '#step-pipeline-filters', on: 'bottom' },
      text: 'Use this collapsible section to filter leads by Status, Campaign, Appointments, Franchisee, and Location. It helps you focus on specific segments.',
    },
    {
      id: 'account-manager-3',
      attachTo: { element: '#step-retention-segments', on: 'bottom' },
      text: 'The pipeline organizes leads into 5 dynamic buckets: Priority, Work in Progress, Quotes Out, Product Pending, and LocalMile. These tabs prioritize your daily workflow.',
    },
    {
      id: 'account-manager-4',
      attachTo: { element: '#step-pipeline-views', on: 'bottom' },
      text: 'You can switch how you visualize leads between a Kanban Board, Accordion Groups, or a flat Grid view depending on your preference.',
    },
    {
      id: 'account-manager-5',
      attachTo: { element: '#step-pipeline-sort', on: 'left' },
      text: 'Sort the leads in your current view by Franchisee, Company Name, or Date Assigned to easily locate what you need.',
    }
  ],
  '/admin/brand-bot': [
    {
      id: 'brand-bot-1',
      attachTo: { element: '#step-brand-bot-config', on: 'bottom' },
      text: 'Input Positioning, ICP matrices, and Voice rules here. These securely seed Firebase Genkit prompt iterations.',
    },
    {
      id: 'brand-bot-2',
      attachTo: { element: '#step-design-tokens', on: 'right' },
      text: 'The campaign template builder programmatically inherits and locks corporate colors (#095c7b, #eaf143) and typography (Inter) here.',
    }
  ],
  '/admin/marketing': [
    {
      id: 'marketing-1',
      attachTo: { element: '#step-domain-integration', on: 'top' },
      text: 'Emails dispatch cleanly via the Microsoft Graph API using the @mailplus.com.au domain from here.',
    },
    {
      id: 'marketing-2',
      attachTo: { element: '#step-suppression-lists', on: 'bottom' },
      text: 'Automatic suppression logic is triggered here when an end-recipient hits a footer unsubscribe link.',
    }
  ],
  '/admin/dashboard': [
    {
      id: 'dashboard-1',
      attachTo: { element: '.sidebar-nav-theme', on: 'right' },
      title: 'Navigation Bar',
      text: 'Welcome to your dashboard! Here is the main navigation bar. Use it to switch between all available modules, features, and pipelines based on your role.',
    },
    {
      id: 'dashboard-2',
      attachTo: { element: '#step-primary-action', on: 'bottom' },
      title: 'Date Range Filters',
      text: 'This is the primary filtering action for your dashboard. Change the dates here to instantly recalculate all reports across the view.',
    },
    {
      id: 'dashboard-3',
      attachTo: { element: '#step-settings-panel', on: 'left' },
      title: 'Account Settings',
      text: 'Click here to open your account settings panel, view your active roles, and log out or manage personal settings.',
    }
  ]
};
