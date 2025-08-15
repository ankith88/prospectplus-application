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

export interface Lead {
  id: string
  name: string
  title: string
  company: string
  email: string
  phone: string
  status: LeadStatus
  avatarUrl: string
  profile: string // This will be the text used for AI prompts
  activity: Activity[]
}
