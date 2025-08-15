export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Unqualified'
  | 'Lost'
  | 'Won'

export interface Activity {
  id: string
  type: 'Call' | 'Email' | 'Meeting'
  date: string
  duration?: string // e.g., "5m 32s"
  notes: string
}

export interface Contact {
  id: string
  name: string
  title: string
  email: string
  phone: string
}

export interface Address {
  street: string
  city: string
  state: string
  zip: string
  country: string
}

export interface Lead {
  id: string
  entityId: string
  companyName: string
  status: LeadStatus
  avatarUrl: string
  profile: string // This will be the text used for AI prompts
  activity: Activity[]
  contacts: Contact[]
  address?: Address
  franchisee?: string
  websiteUrl?: string
  industryCategory?: string
  industrySubCategory?: string
  salesRepAssigned?: string
  campaign?: string
}
