export const PATHWAYS = [
  {
    id: 'self_managed',
    title: 'SELF-MANAGED',
    description: 'Lodging at Post Office',
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
    questions: [
      { id: 'q1', label: 'How often do you visit the post office?' },
      { id: 'q2', label: 'What is the biggest inconvenience of doing this yourself?' },
    ]
  },
  {
    id: 'aus_post_managed',
    title: 'AUSTRALIA POST-MANAGED',
    description: 'Current AP Customer',
    color: 'bg-primary',
    hoverColor: 'hover:bg-primary/90',
    questions: [
      { id: 'q1', label: 'How often do you currently receive collections?' },
      { id: 'q2', label: 'Are you looking to change anything about your current setup?' },
    ]
  },
  {
    id: 'no_aus_post_usage',
    title: 'NO AUSTRALIA POST USAGE',
    description: 'No current AP services',
    color: 'bg-red-600',
    hoverColor: 'hover:bg-red-700',
    questions: []
  }
];

export const LOST_PROPERTY_OPTIONS = [
  { id: 'manual', label: 'Staff organise returns manually', description: 'Team packs items, arranges postage or courier' },
  { id: 'guest_contact', label: 'Guests contact us to arrange shipping', description: 'Staff manage payments, labels or booking' },
  { id: 'rare', label: 'Rarely happens / informal process', description: 'No standard system for returns' },
  { id: 'platform', label: 'Already use a return platform', description: 'Lost property handled through a system' },
];
