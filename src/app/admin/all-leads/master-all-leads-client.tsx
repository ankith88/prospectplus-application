"use client"

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { getLeadsFromFirebase, getAllUsers, bulkReassignLeads, markLeadsAsExported, getLeadContacts, getSubCollection } from '@/services/firebase'
import type { Lead, UserProfile, LeadBucket, Contact } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Loader } from '@/components/ui/loader'
import { 
  Search, 
  Filter, 
  Shuffle, 
  Download, 
  RotateCcw, 
  Building2, 
  Calendar as CalendarIcon, 
  UserCheck, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Send,
  Lock,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

const BUCKET_LABELS: Record<string, string> = {
  in_review: 'In Review',
  outbound: 'Outbound (Dialer)',
  field_sales: 'Field Sales',
  inbound: 'Inbound',
  account_manager: 'Account Manager',
  customer_success: 'Customer Success',
  nurture: 'Nurture',
  marketing: 'Marketing',
  lpo_plus: 'LPO Plus',
  unassigned: 'Unassigned'
}

function parseAnyDate(val: any): Date | null {
  if (val === null || val === undefined || val === '') return null
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val
  }
  if (typeof val === 'number') {
    const ms = val < 1e11 ? val * 1000 : val
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        const d = val.toDate()
        return isNaN(d.getTime()) ? null : d
      } catch {
        return null
      }
    }
    if (typeof val.seconds === 'number') {
      const d = new Date(val.seconds * 1000)
      return isNaN(d.getTime()) ? null : d
    }
    if (typeof val._seconds === 'number') {
      const d = new Date(val._seconds * 1000)
      return isNaN(d.getTime()) ? null : d
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return null

    const dmY = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (dmY) {
      const d = new Date(Number(dmY[3]), Number(dmY[2]) - 1, Number(dmY[1]))
      if (!isNaN(d.getTime())) return d
    }

    try {
      const parsedIso = parseISO(trimmed)
      if (!isNaN(parsedIso.getTime())) return parsedIso
    } catch {}

    try {
      const parsedStandard = new Date(trimmed)
      if (!isNaN(parsedStandard.getTime())) return parsedStandard
    } catch {}
  }
  return null
}

function safeFormatDate(val: any, outputFormat = 'dd/MM/yyyy'): string {
  const d = parseAnyDate(val)
  if (!d) return '-'
  try {
    return format(d, outputFormat)
  } catch {
    return '-'
  }
}

function getLeadFranchisee(lead: any): string {
  if (!lead) return ''
  return (
    lead.franchisee ||
    lead.franchiseeName ||
    lead.assignedFranchisee ||
    lead.franchisee_name ||
    lead.franchiseeCode ||
    lead.territory ||
    (lead.address && typeof lead.address === 'object' ? lead.address.franchisee : '') ||
    ''
  )
}

function isLeadActiveLpo(lead: any): boolean {
  if (!lead) return false
  return !!(
    lead.lpoPlusOpportunity ||
    lead.bucket === 'lpo_plus' ||
    lead.status === 'LPO Review' ||
    lead.status === 'LPO Opportunity' ||
    lead.parent_lpo_id ||
    lead.parentLpoId ||
    lead.lpoName ||
    lead.isLpo
  )
}

export function MasterAllLeadsClient() {
  const { userProfile, isSuperAdmin, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const isAllowed = useMemo(() => {
    const role = userProfile?.activeRole || userProfile?.role || ''
    if (role === 'user' || role.toLowerCase() === 'user') return false
    if (isSuperAdmin) return true
    return ['admin', 'super user', 'Sales Manager', 'Marketing Admin', 'Marketing Manager'].includes(role)
  }, [isSuperAdmin, userProfile])

  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSource, setFilterSource] = useState('ALL')
  const [filterBucket, setFilterBucket] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterFranchisee, setFilterFranchisee] = useState('ALL')
  const [filterActiveLpo, setFilterActiveLpo] = useState<'ALL' | 'YES' | 'NO'>('ALL')
  const [filterDialer, setFilterDialer] = useState('ALL')
  const [filterAccountManager, setFilterAccountManager] = useState('ALL')
  const [filterExportStatus, setFilterExportStatus] = useState<'ALL' | 'UNEXPORTED' | 'EXPORTED'>('ALL')
  
  const [dateCreatedFrom, setDateCreatedFrom] = useState('')
  const [dateCreatedTo, setDateCreatedTo] = useState('')
  const [dateEnteredFrom, setDateEnteredFrom] = useState('')
  const [dateEnteredTo, setDateEnteredTo] = useState('')

  // Assignment action state
  const [selectedTargetBucket, setSelectedTargetBucket] = useState<string>('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isAssigning, setIsAssigning] = useState(false)

  // Export Dialog state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [externalCompany, setExternalCompany] = useState('')
  const [exportNotes, setExportNotes] = useState('')
  const [exportFilterMode, setExportFilterMode] = useState<'ALL_PREVIOUS' | 'TARGET_COMPANY_ONLY' | 'INCLUDE_ALL'>('ALL_PREVIOUS')
  const [isExporting, setIsExporting] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [fetchedLeads, fetchedUsers] = await Promise.all([
        getLeadsFromFirebase({ summary: true }),
        getAllUsers()
      ])
      setLeads(fetchedLeads)
      setUsers(fetchedUsers)
    } catch (error) {
      console.error('Failed to fetch master lead data:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch lead records.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.replace('/leads')
    } else if (isAllowed) {
      fetchData()
    }
  }, [authLoading, isAllowed, router])

  // Unique list options for filters
  const uniqueSources = useMemo(() => {
    const set = new Set<string>()
    leads.forEach(l => {
      if (l.customerSource) set.add(l.customerSource)
    })
    return Array.from(set).sort()
  }, [leads])

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>()
    leads.forEach(l => {
      if (l.status) set.add(l.status)
    })
    return Array.from(set).sort()
  }, [leads])

  const uniqueFranchisees = useMemo(() => {
    const set = new Set<string>()
    leads.forEach(l => {
      const f = getLeadFranchisee(l)
      if (f) set.add(f)
    })
    return Array.from(set).sort()
  }, [leads])

  const uniqueDialers = useMemo(() => {
    const set = new Set<string>()
    leads.forEach(l => {
      if (l.dialerAssigned) set.add(l.dialerAssigned)
    })
    return Array.from(set).sort()
  }, [leads])

  const uniqueAccountManagers = useMemo(() => {
    const set = new Set<string>()
    leads.forEach(l => {
      if (l.accountManagerAssigned) set.add(l.accountManagerAssigned)
    })
    return Array.from(set).sort()
  }, [leads])

  // Filter logic
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // 1. Text Search (Company Name, Contact Name, ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchCompany = lead.companyName?.toLowerCase().includes(q)
        const matchContact = lead.contacts?.[0]?.name?.toLowerCase().includes(q)
        const matchId = lead.entityId?.toLowerCase().includes(q) || lead.prospectPlusId?.toLowerCase().includes(q)
        if (!matchCompany && !matchContact && !matchId) return false
      }

      // 2. Customer Source
      if (filterSource !== 'ALL' && lead.customerSource !== filterSource) {
        return false
      }

      // 3. Bucket
      if (filterBucket !== 'ALL') {
        const b = lead.bucket || 'unassigned'
        if (b !== filterBucket) return false
      }

      // 4. Status
      if (filterStatus !== 'ALL' && lead.status !== filterStatus) {
        return false
      }

      // 4b. Franchisee
      if (filterFranchisee !== 'ALL') {
        const leadFran = getLeadFranchisee(lead)
        if (filterFranchisee === 'UNASSIGNED') {
          if (leadFran) return false
        } else if (leadFran !== filterFranchisee) {
          return false
        }
      }

      // 4c. Active LPO
      if (filterActiveLpo === 'YES' && !isLeadActiveLpo(lead)) {
        return false
      }
      if (filterActiveLpo === 'NO' && isLeadActiveLpo(lead)) {
        return false
      }

      // 5. Dialer Assigned
      if (filterDialer !== 'ALL') {
        if ((filterDialer === 'UNASSIGNED' && lead.dialerAssigned) || 
            (filterDialer !== 'UNASSIGNED' && lead.dialerAssigned !== filterDialer)) {
          return false
        }
      }

      // 6. Account Manager Assigned
      if (filterAccountManager !== 'ALL') {
        if ((filterAccountManager === 'UNASSIGNED' && lead.accountManagerAssigned) || 
            (filterAccountManager !== 'UNASSIGNED' && lead.accountManagerAssigned !== filterAccountManager)) {
          return false
        }
      }

      // 7. Export Status
      if (filterExportStatus === 'UNEXPORTED' && lead.isExported) {
        return false
      }
      if (filterExportStatus === 'EXPORTED' && !lead.isExported) {
        return false
      }

      // 8. Date Created Range
      if (dateCreatedFrom || dateCreatedTo) {
        const leadCreatedStr = (lead as any).dateCreated || lead.dateLeadEntered || (lead as any).createdAt
        const leadDate = parseAnyDate(leadCreatedStr)
        if (!leadDate) return false
        if (dateCreatedFrom) {
          const fromDate = parseAnyDate(dateCreatedFrom)
          if (fromDate && leadDate < fromDate) return false
        }
        if (dateCreatedTo) {
          const toDate = parseAnyDate(dateCreatedTo)
          if (toDate) {
            toDate.setHours(23, 59, 59, 999)
            if (leadDate > toDate) return false
          }
        }
      }

      // 9. Date Lead Entered Range
      if (dateEnteredFrom || dateEnteredTo) {
        const leadEnteredStr = lead.dateLeadEntered || lead.assignedToDialerAt || (lead as any).createdAt
        const leadDate = parseAnyDate(leadEnteredStr)
        if (!leadDate) return false
        if (dateEnteredFrom) {
          const fromDate = parseAnyDate(dateEnteredFrom)
          if (fromDate && leadDate < fromDate) return false
        }
        if (dateEnteredTo) {
          const toDate = parseAnyDate(dateEnteredTo)
          if (toDate) {
            toDate.setHours(23, 59, 59, 999)
            if (leadDate > toDate) return false
          }
        }
      }

      return true
    })
  }, [
    leads, searchQuery, filterSource, filterBucket, filterStatus,
    filterFranchisee, filterActiveLpo,
    filterDialer, filterAccountManager, filterExportStatus,
    dateCreatedFrom, dateCreatedTo, dateEnteredFrom, dateEnteredTo
  ])

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [
    searchQuery, filterSource, filterBucket, filterStatus,
    filterFranchisee, filterActiveLpo,
    filterDialer, filterAccountManager, filterExportStatus,
    dateCreatedFrom, dateCreatedTo, dateEnteredFrom, dateEnteredTo
  ])

  // Paginated View
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLeads.slice(start, start + pageSize)
  }, [filteredLeads, currentPage, pageSize])

  // Eligible users for selected bucket
  const eligibleUsers = useMemo(() => {
    if (!selectedTargetBucket) return []
    return users.filter(u => {
      if (u.disabled) return false
      const roles = u.assignedRoles || []
      switch (selectedTargetBucket) {
        case 'outbound':
          return roles.some(r => ['user', 'Dialer', 'dialers', 'Lead Gen', 'Lead Gen Admin'].includes(r))
        case 'field_sales':
          return roles.some(r => ['Field Sales', 'Field Sales Admin'].includes(r))
        case 'inbound':
          return roles.some(r => ['Sales Manager', 'Account Managers', 'Account Manager'].includes(r))
        case 'account_manager':
          return roles.some(r => ['Sales Manager', 'Account Managers', 'Account Manager'].includes(r))
        case 'customer_success':
          return roles.some(r => ['Customer Success'].includes(r))
        case 'nurture':
        case 'marketing':
          return roles.some(r => ['admin', 'Marketing Admin', 'Marketing Manager'].includes(r))
        default:
          return true
      }
    })
  }, [users, selectedTargetBucket])

  // Handlers for table selection
  const handleSelectAllFiltered = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(l => l.id))
    } else {
      setSelectedLeads([])
    }
  }

  const handleSelectRow = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId])
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId))
    }
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterSource('ALL')
    setFilterBucket('ALL')
    setFilterStatus('ALL')
    setFilterFranchisee('ALL')
    setFilterActiveLpo('ALL')
    setFilterDialer('ALL')
    setFilterAccountManager('ALL')
    setFilterExportStatus('ALL')
    setDateCreatedFrom('')
    setDateCreatedTo('')
    setDateEnteredFrom('')
    setDateEnteredTo('')
  }

  // Bulk Reassignment Handler
  const handleAssignLeads = async (isRandom: boolean) => {
    if (selectedLeads.length === 0 || !selectedTargetBucket) {
      toast({ variant: 'destructive', title: 'Action Required', description: 'Select leads and a target bucket.' })
      return
    }

    if (selectedUsers.length === 0 && !['nurture', 'marketing'].includes(selectedTargetBucket)) {
      toast({ variant: 'destructive', title: 'Action Required', description: 'Select at least one user for assignment.' })
      return
    }

    setIsAssigning(true)
    try {
      const assignmentMap: Record<string, string> = {}
      const leadCurrentBuckets: Record<string, string> = {}

      const selectedLeadObjs = leads.filter(l => selectedLeads.includes(l.id))
      selectedLeadObjs.forEach(l => {
        leadCurrentBuckets[l.id] = l.bucket || 'unassigned'
      })

      if (['nurture', 'marketing'].includes(selectedTargetBucket)) {
        selectedLeads.forEach(leadId => {
          assignmentMap[leadId] = ''
        })
      } else if (isRandom && selectedUsers.length > 0) {
        let userIndex = 0
        selectedLeads.forEach(leadId => {
          assignmentMap[leadId] = selectedUsers[userIndex]
          userIndex = (userIndex + 1) % selectedUsers.length
        })
      } else {
        selectedLeads.forEach(leadId => {
          assignmentMap[leadId] = selectedUsers[0]
        })
      }

      await bulkReassignLeads(
        selectedLeads,
        selectedTargetBucket,
        assignmentMap,
        userProfile?.displayName || userProfile?.email || 'Admin',
        leadCurrentBuckets
      )

      toast({ 
        title: 'Bucket Push Successful', 
        description: `Successfully moved ${selectedLeads.length} leads to ${BUCKET_LABELS[selectedTargetBucket] || selectedTargetBucket}.` 
      })

      // Update state locally
      setLeads(prev => prev.map(l => {
        if (selectedLeads.includes(l.id)) {
          const updated: Lead = {
            ...l,
            bucket: selectedTargetBucket as LeadBucket
          }
          if (selectedTargetBucket === 'outbound') updated.dialerAssigned = assignmentMap[l.id]
          if (selectedTargetBucket === 'field_sales') updated.fieldRepAssigned = assignmentMap[l.id]
          if (selectedTargetBucket === 'inbound') updated.salesRepAssigned = assignmentMap[l.id]
          if (selectedTargetBucket === 'account_manager') updated.accountManagerAssigned = assignmentMap[l.id]
          if (selectedTargetBucket === 'customer_success') updated.customerSuccessAssigned = assignmentMap[l.id]
          return updated
        }
        return l
      }))

      setSelectedLeads([])
      setSelectedTargetBucket('')
      setSelectedUsers([])
    } catch (error) {
      console.error('Assignment error:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign leads.' })
    } finally {
      setIsAssigning(false)
    }
  }

  // Selected Leads Export Information
  const selectedLeadObjects = useMemo(() => {
    return leads.filter(l => selectedLeads.includes(l.id))
  }, [leads, selectedLeads])

  const exportedSelectedCount = useMemo(() => {
    return selectedLeadObjects.filter(l => l.isExported).length
  }, [selectedLeadObjects])

  const finalExportCount = useMemo(() => {
    if (exportFilterMode === 'ALL_PREVIOUS') {
      return selectedLeadObjects.filter(l => !l.isExported).length
    }
    if (exportFilterMode === 'TARGET_COMPANY_ONLY') {
      const targetName = externalCompany.trim().toLowerCase()
      if (!targetName) return selectedLeads.length
      return selectedLeadObjects.filter(l => {
        if (!l.isExported) return true
        const matchCurrent = l.exportedToCompany?.toLowerCase() === targetName
        const matchHistory = l.exportHistory?.some(h => h.exportedToCompany?.toLowerCase() === targetName)
        return !matchCurrent && !matchHistory
      }).length
    }
    return selectedLeads.length
  }, [selectedLeadObjects, selectedLeads.length, exportFilterMode, externalCompany])

  // Open Export Dialog
  const handleOpenExportModal = () => {
    if (selectedLeads.length === 0) {
      toast({ variant: 'destructive', title: 'Select Leads', description: 'Please select at least one lead to export.' })
      return
    }
    setExternalCompany('')
    setExportNotes('')
    setExportFilterMode(exportedSelectedCount > 0 ? 'ALL_PREVIOUS' : 'INCLUDE_ALL')
    setIsExportDialogOpen(true)
  }

  // Execute CSV Export and Mark Exported
  const handleExecuteExport = async () => {
    if (!externalCompany.trim()) {
      toast({ variant: 'destructive', title: 'Company Name Required', description: 'Please enter the external company or partner name.' })
      return
    }

    const targetName = externalCompany.trim().toLowerCase()

    let leadsToExport = selectedLeadObjects
    if (exportFilterMode === 'ALL_PREVIOUS') {
      leadsToExport = selectedLeadObjects.filter(l => !l.isExported)
    } else if (exportFilterMode === 'TARGET_COMPANY_ONLY') {
      leadsToExport = selectedLeadObjects.filter(l => {
        if (!l.isExported) return true
        const matchCurrent = l.exportedToCompany?.toLowerCase() === targetName
        const matchHistory = l.exportHistory?.some(h => h.exportedToCompany?.toLowerCase() === targetName)
        return !matchCurrent && !matchHistory
      })
    }

    if (leadsToExport.length === 0) {
      toast({ variant: 'destructive', title: 'No Leads to Export', description: 'No selected leads match the export criteria for this target company.' })
      return
    }

    setIsExporting(true)
    try {
      // Fetch subcollection contacts for selected leads to guarantee full contact export
      const contactsByLeadId: Record<string, Contact[]> = {}
      await Promise.all(leadsToExport.map(async (lead) => {
        let contactsList: Contact[] = lead.contacts || []
        if (contactsList.length === 0) {
          try {
            const subContacts = await getLeadContacts(lead.id)
            if (subContacts && subContacts.length > 0) {
              contactsList = subContacts
            } else {
              const compContacts = await getSubCollection<Contact>('companies', lead.id, 'contacts', 'name', 'asc')
              contactsList = compContacts || []
            }
          } catch {
            contactsList = []
          }
        }
        contactsByLeadId[lead.id] = contactsList
      }))

      // 1. Generate CSV matching standard Import CSV template
      const headers = [
        'Prospect+ ID',
        'NetSuite ID',
        'Company Name',
        'Website URL',
        'Company Phone',
        'Company Email',
        'ABN (11 digits)',
        'Address Line 1',
        'Street Address',
        'Suburb / City',
        'State',
        'Postcode',
        'Country',
        'Franchisee',
        'Is Active LPO',
        'Status',
        'Lead Bucket',
        'Customer Source',
        'Contact 1 First Name',
        'Contact 1 Last Name',
        'Contact 1 Title',
        'Contact 1 Email',
        'Contact 1 Phone',
        'Contact 2 First Name',
        'Contact 2 Last Name',
        'Contact 2 Title',
        'Contact 2 Email',
        'Contact 2 Phone',
        'Contact 3 First Name',
        'Contact 3 Last Name',
        'Contact 3 Title',
        'Contact 3 Email',
        'Contact 3 Phone',
        'Total Contacts',
        'All Contacts Details',
        'Date Created',
        'Date Lead Entered',
        'Dialer Assigned',
        'Account Manager Assigned',
        'Is Previously Exported',
        'Export Count',
        'All Shared Companies',
        'Latest Exported At',
        'Latest Exported To Company'
      ]

      const escapeCsv = (val: any) => {
        if (val === undefined || val === null) return '""'
        const str = String(val).replace(/"/g, '""')
        return `"${str}"`
      }

      const getContactNameParts = (c: any) => {
        if (!c) return { firstName: '', lastName: '' }
        if (c.firstName || c.lastName) {
          return { firstName: c.firstName || '', lastName: c.lastName || '' }
        }
        if (c.name) {
          const parts = String(c.name).trim().split(/\s+/)
          return {
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || ''
          }
        }
        return { firstName: '', lastName: '' }
      }

      const rows = leadsToExport.map(l => {
        const historyCompanies = (l.exportHistory || []).map(h => `${h.exportedToCompany} (${safeFormatDate(h.exportedAt)})`).join('; ')
        const exportCount = l.exportHistory?.length || (l.isExported ? 1 : 0)

        const leadAddress1 = l.address?.address1 || (l as any).address1 || ''
        const leadStreet = l.address?.street || (l as any).street || ''
        const leadCity = l.address?.city || (l as any).city || l.city || ''
        const leadState = l.address?.state || (l as any).state || l.state || ''
        const leadZip = l.address?.zip || (l as any).zip || (l as any).postcode || ''
        const leadCountry = l.address?.country || (l as any).country || ''
        const leadFranchisee = getLeadFranchisee(l)
        const isActiveLpo = isLeadActiveLpo(l) ? 'Yes' : 'No'
        const leadEmail = l.customerServiceEmail || (l as any).email || ''
        const leadPhone = l.customerPhone || (l as any).phone || ''
        const leadWebsite = l.websiteUrl || ''
        const leadAbn = l.abn || ''

        const contacts = contactsByLeadId[l.id] || l.contacts || []
        const c1 = contacts[0] || null
        const c2 = contacts[1] || null
        const c3 = contacts[2] || null

        const c1Parts = getContactNameParts(c1)
        const c2Parts = getContactNameParts(c2)
        const c3Parts = getContactNameParts(c3)

        const contactsDetails = contacts.map(c => {
          const parts = [c.name || `${c.firstName || ''} ${(c as any).lastName || ''}`.trim(), c.title || (c as any).role, c.email, c.phone].filter(Boolean)
          return parts.join(' - ')
        }).join('; ')

        return [
          escapeCsv(l.prospectPlusId || l.id),
          escapeCsv(l.entityId || ''),
          escapeCsv(l.companyName || ''),
          escapeCsv(leadWebsite),
          escapeCsv(leadPhone),
          escapeCsv(leadEmail),
          escapeCsv(leadAbn),
          escapeCsv(leadAddress1),
          escapeCsv(leadStreet),
          escapeCsv(leadCity),
          escapeCsv(leadState),
          escapeCsv(leadZip),
          escapeCsv(leadCountry),
          escapeCsv(leadFranchisee),
          escapeCsv(isActiveLpo),
          escapeCsv(l.status || ''),
          escapeCsv(l.bucket || 'unassigned'),
          escapeCsv(l.customerSource || ''),
          escapeCsv(c1Parts.firstName),
          escapeCsv(c1Parts.lastName),
          escapeCsv(c1?.title || (c1 as any)?.role || ''),
          escapeCsv(c1?.email || ''),
          escapeCsv(c1?.phone || ''),
          escapeCsv(c2Parts.firstName),
          escapeCsv(c2Parts.lastName),
          escapeCsv(c2?.title || (c2 as any)?.role || ''),
          escapeCsv(c2?.email || ''),
          escapeCsv(c2?.phone || ''),
          escapeCsv(c3Parts.firstName),
          escapeCsv(c3Parts.lastName),
          escapeCsv(c3?.title || (c3 as any)?.role || ''),
          escapeCsv(c3?.email || ''),
          escapeCsv(c3?.phone || ''),
          escapeCsv(contacts.length),
          escapeCsv(contactsDetails),
          escapeCsv(safeFormatDate((l as any).dateCreated || l.dateLeadEntered || (l as any).createdAt, 'yyyy-MM-dd HH:mm:ss')),
          escapeCsv(safeFormatDate(l.dateLeadEntered || l.assignedToDialerAt, 'yyyy-MM-dd HH:mm:ss')),
          escapeCsv(l.dialerAssigned || ''),
          escapeCsv(l.accountManagerAssigned || ''),
          escapeCsv(l.isExported ? 'Yes' : 'No'),
          escapeCsv(exportCount),
          escapeCsv(historyCompanies || l.exportedToCompany || ''),
          escapeCsv(safeFormatDate(l.exportedAt, 'yyyy-MM-dd HH:mm:ss')),
          escapeCsv(l.exportedToCompany || '')
        ]
      })

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const cleanCompName = externalCompany.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
      link.href = url
      link.setAttribute('download', `leads_export_${cleanCompName}_${format(new Date(), 'yyyy-MM-dd')}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 2. Mark leads as exported in Firebase
      const leadIdsToMark = leadsToExport.map(l => l.id)
      const authorName = userProfile?.displayName || userProfile?.email || 'Admin'
      const authorUid = userProfile?.uid || ''

      const res = await markLeadsAsExported(leadIdsToMark, externalCompany.trim(), authorName, authorUid, exportNotes)

      toast({ 
        title: 'Export Complete & Tracked', 
        description: `Successfully exported ${res.leadCount} leads (Batch ID: ${res.batchId}) and marked as shared with ${externalCompany.trim()}.` 
      })

      // 3. Local State Update
      const exportedAtNow = new Date().toISOString()
      const newHistoryItem = {
        exportedAt: exportedAtNow,
        exportedBy: authorName,
        exportedToCompany: externalCompany.trim(),
        batchId: res.batchId
      }

      setLeads(prev => prev.map(l => {
        if (leadIdsToMark.includes(l.id)) {
          const existingHistory = l.exportHistory || []
          return {
            ...l,
            isExported: true,
            exportedAt: exportedAtNow,
            exportedBy: authorName,
            exportedToCompany: externalCompany.trim(),
            exportBatchId: res.batchId,
            exportHistory: [...existingHistory, newHistoryItem]
          }
        }
        return l
      }))

      setIsExportDialogOpen(false)
      setSelectedLeads([])
    } catch (error) {
      console.error('Export error:', error)
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Failed to process lead export.' })
    } finally {
      setIsExporting(false)
    }
  }

  if (authLoading || (loading && isAllowed)) {
    return (
      <div className="flex h-[450px] items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!isAllowed) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader className="text-center">
          <Lock className="w-12 h-12 text-destructive mx-auto mb-2" />
          <CardTitle>Access Restricted</CardTitle>
          <CardDescription>
            This page is accessible only by Admins and Super Admins.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 text-white dark:bg-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Leads</p>
              <p className="text-2xl font-bold mt-1">{leads.length.toLocaleString()}</p>
            </div>
            <Layers className="w-8 h-8 text-sky-400 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-emerald-950/40 border-emerald-800/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Unexported (Clean)</p>
              <p className="text-2xl font-bold mt-1 text-emerald-300">
                {leads.filter(l => !l.isExported).length.toLocaleString()}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-purple-950/40 border-purple-800/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-400 font-medium uppercase tracking-wider">Exported / Shared</p>
              <p className="text-2xl font-bold mt-1 text-purple-300">
                {leads.filter(l => l.isExported).length.toLocaleString()}
              </p>
            </div>
            <Send className="w-8 h-8 text-purple-400 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-blue-950/40 border-blue-800/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">Filtered Result</p>
              <p className="text-2xl font-bold mt-1 text-blue-300">
                {filteredLeads.length.toLocaleString()}
              </p>
            </div>
            <Filter className="w-8 h-8 text-blue-400 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Multi-Criteria Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Master Lead Filters
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleClearFilters} className="h-8 gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* 1. Name / Search */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Search Lead / Company / ID</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input 
                  placeholder="Company, contact or ID..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>

            {/* 2. Customer Source */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Customer Source</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  {uniqueSources.map(src => (
                    <SelectItem key={src} value={src}>{src}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Bucket */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Lead Bucket</Label>
              <Select value={filterBucket} onValueChange={setFilterBucket}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Buckets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Buckets</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="outbound">Outbound (Dialer)</SelectItem>
                  <SelectItem value="field_sales">Field Sales</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="account_manager">Account Manager</SelectItem>
                  <SelectItem value="customer_success">Customer Success</SelectItem>
                  <SelectItem value="nurture">Nurture</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="lpo_plus">LPO Plus</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Status */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {uniqueStatuses.map(st => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4b. Franchisee */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Franchisee</Label>
              <Select value={filterFranchisee} onValueChange={setFilterFranchisee}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Franchisees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Franchisees</SelectItem>
                  <SelectItem value="UNASSIGNED">Unassigned / None</SelectItem>
                  {uniqueFranchisees.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4c. Active LPO Filter */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Active LPO</Label>
              <Select value={filterActiveLpo} onValueChange={(val: any) => setFilterActiveLpo(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All LPO Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Leads (LPO & Non-LPO)</SelectItem>
                  <SelectItem value="YES">Active LPO Only</SelectItem>
                  <SelectItem value="NO">Non-LPO Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 5. Dialer Assigned */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Dialer Assigned</Label>
              <Select value={filterDialer} onValueChange={setFilterDialer}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Dialers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Dialers</SelectItem>
                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                  {uniqueDialers.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 6. Account Manager */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Account Manager</Label>
              <Select value={filterAccountManager} onValueChange={setFilterAccountManager}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Account Managers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Account Managers</SelectItem>
                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                  {uniqueAccountManagers.map(am => (
                    <SelectItem key={am} value={am}>{am}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 7. Export Status */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Export Status</Label>
              <Select value={filterExportStatus} onValueChange={(val: any) => setFilterExportStatus(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Export Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Leads (Exported & Unexported)</SelectItem>
                  <SelectItem value="UNEXPORTED">Unexported Only (Clean List)</SelectItem>
                  <SelectItem value="EXPORTED">Exported Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 8. Date Created Range */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs font-medium">Date Created Range</Label>
              <div className="flex gap-1">
                <Input 
                  type="date" 
                  value={dateCreatedFrom} 
                  onChange={e => setDateCreatedFrom(e.target.value)} 
                  className="text-xs h-9" 
                  title="From Date"
                />
                <Input 
                  type="date" 
                  value={dateCreatedTo} 
                  onChange={e => setDateCreatedTo(e.target.value)} 
                  className="text-xs h-9" 
                  title="To Date"
                />
              </div>
            </div>

            {/* 9. Date Lead Entered Range */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs font-medium">Date Lead Entered Range</Label>
              <div className="flex gap-1">
                <Input 
                  type="date" 
                  value={dateEnteredFrom} 
                  onChange={e => setDateEnteredFrom(e.target.value)} 
                  className="text-xs h-9" 
                  title="From Date"
                />
                <Input 
                  type="date" 
                  value={dateEnteredTo} 
                  onChange={e => setDateEnteredTo(e.target.value)} 
                  className="text-xs h-9" 
                  title="To Date"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action & Export Toolbar */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-md border border-primary/20">
              {selectedLeads.length} lead(s) selected
            </span>

            {/* Target Bucket Selector */}
            <div className="w-[180px]">
              <Select value={selectedTargetBucket} onValueChange={(val) => { setSelectedTargetBucket(val); setSelectedUsers([]); }}>
                <SelectTrigger className="h-9 bg-background text-xs">
                  <SelectValue placeholder="Push to Bucket..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="outbound">Outbound (Dialer)</SelectItem>
                  <SelectItem value="field_sales">Field Sales</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="account_manager">Account Manager</SelectItem>
                  <SelectItem value="customer_success">Customer Success</SelectItem>
                  <SelectItem value="nurture">Nurture</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target User Selector */}
            <div className="w-[240px]">
              <MultiSelectCombobox
                options={eligibleUsers.map(u => ({ value: u.displayName || u.email, label: u.displayName || u.email }))}
                selected={selectedUsers}
                onSelectedChange={setSelectedUsers}
                placeholder={selectedTargetBucket ? "Assign to User(s)..." : "Select bucket first"}
              />
            </div>

            <Button 
              size="sm"
              onClick={() => handleAssignLeads(false)}
              disabled={selectedLeads.length === 0 || !selectedTargetBucket || isAssigning || (selectedUsers.length === 0 && !['nurture', 'marketing'].includes(selectedTargetBucket))}
              className="h-9 gap-1"
            >
              {isAssigning ? <Loader className="w-3.5 h-3.5 mr-1" /> : <UserCheck className="w-3.5 h-3.5" />}
              Push Bucket
            </Button>

            <Button 
              variant="outline"
              size="sm"
              onClick={() => handleAssignLeads(true)}
              disabled={selectedLeads.length === 0 || !selectedTargetBucket || selectedUsers.length < 2 || isAssigning}
              title="Round-robin equal distribution among selected users"
              className="h-9 gap-1 bg-background"
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-600" />
              Random Assign
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="default"
              size="sm"
              onClick={handleOpenExportModal}
              disabled={selectedLeads.length === 0}
              className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              <Download className="w-4 h-4" />
              Export & Mark Shared ({selectedLeads.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Leads Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[45px] text-center">
                    <Checkbox 
                      checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                      onCheckedChange={handleSelectAllFiltered}
                    />
                  </TableHead>
                  <TableHead>Company & ID</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Franchisee</TableHead>
                  <TableHead>LPO</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Date Entered</TableHead>
                  <TableHead>Dialer</TableHead>
                  <TableHead>Account Manager</TableHead>
                  <TableHead className="text-right">Export Tracking</TableHead>
                  <TableHead className="text-center w-[60px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                      No leads match the specified criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLeads.map((lead) => {
                    const isSelected = selectedLeads.includes(lead.id)
                    const dateCreatedStr = (lead as any).dateCreated || lead.dateLeadEntered || (lead as any).createdAt
                    const dateEnteredStr = lead.dateLeadEntered || lead.assignedToDialerAt
                    const leadUrl = lead.status === 'Won' || lead.customerStatus === 'Won' || (lead.status as string) === 'Signed' || (lead.customerStatus as string) === 'Signed' || (lead as any).isCompany ? `/companies/${lead.id}` : `/leads/${lead.id}`

                    return (
                      <TableRow key={lead.id} className={isSelected ? 'bg-muted/60' : ''}>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectRow(lead.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <Link 
                              href={leadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-primary hover:underline inline-flex items-center gap-1.5 group"
                            >
                              <span>{lead.companyName || 'Unnamed Lead'}</span>
                              <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <div className="text-[11px] text-muted-foreground flex gap-2 mt-0.5">
                              {lead.entityId && <span>NS ID: {lead.entityId}</span>}
                              {lead.prospectPlusId && <span>PP ID: {lead.prospectPlusId}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs font-normal">
                            {BUCKET_LABELS[lead.bucket || 'unassigned'] || lead.bucket}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[11px]">
                            {lead.status || 'New'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {getLeadFranchisee(lead) || '-'}
                        </TableCell>
                        <TableCell>
                          {isLeadActiveLpo(lead) ? (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100 border-amber-300 text-[10px]">
                              Active LPO
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {lead.customerSource || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {safeFormatDate(dateCreatedStr)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {safeFormatDate(dateEnteredStr)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {lead.dialerAssigned || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {lead.accountManagerAssigned || '-'}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {lead.isExported ? (
                            <div className="inline-flex flex-col items-end">
                              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 hover:bg-purple-100 border-purple-300">
                                Exported {lead.exportHistory && lead.exportHistory.length > 1 ? `(${lead.exportHistory.length}x)` : ''}
                              </Badge>
                              <span 
                                className="text-[10px] text-muted-foreground mt-0.5" 
                                title={
                                  lead.exportHistory && lead.exportHistory.length > 0
                                    ? lead.exportHistory.map(h => `${h.exportedToCompany} (${safeFormatDate(h.exportedAt)})`).join(' • ')
                                    : `Exported by ${lead.exportedBy || 'Admin'} to ${lead.exportedToCompany || 'External'}`
                                }
                              >
                                {lead.exportHistory && lead.exportHistory.length > 1
                                  ? `Shared (${new Set(lead.exportHistory.map(h => h.exportedToCompany)).size} parties)`
                                  : `to ${lead.exportedToCompany || 'External'}`}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                              Unexported
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0" title="Open lead profile in new tab">
                            <Link href={leadUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              <span className="sr-only">Open lead profile</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Showing {filteredLeads.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredLeads.length)} of {filteredLeads.length} leads</span>
              <Select value={String(pageSize)} onValueChange={val => { setPageSize(Number(val)); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-xs w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>

            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs px-2">Page {currentPage} of {totalPages}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export & Tracking Dialog Modal */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Send className="w-5 h-5 text-emerald-600" />
              Export & Share Leads
            </DialogTitle>
            <DialogDescription>
              Export selected leads to CSV and record metadata to prevent re-exporting in future campaigns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Warning if previous exports exist in selection */}
            {exportedSelectedCount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-md space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{exportedSelectedCount} of {selectedLeads.length} selected lead(s) were previously exported!</span>
                </div>
                <p className="text-amber-700 dark:text-amber-400">
                  Leads can be shared amongst multiple external parties. Select your duplicate sharing strategy:
                </p>
                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input 
                      type="radio" 
                      name="exportOption" 
                      className="mt-0.5"
                      checked={exportFilterMode === 'ALL_PREVIOUS'} 
                      onChange={() => setExportFilterMode('ALL_PREVIOUS')} 
                    />
                    <div>
                      <span className="font-medium block">Exclude leads exported to ANY external party</span>
                      <span className="text-[11px] text-muted-foreground">Only fresh/unexported leads ({selectedLeads.length - exportedSelectedCount} leads) will be exported.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input 
                      type="radio" 
                      name="exportOption" 
                      className="mt-0.5"
                      checked={exportFilterMode === 'TARGET_COMPANY_ONLY'} 
                      onChange={() => setExportFilterMode('TARGET_COMPANY_ONLY')} 
                    />
                    <div>
                      <span className="font-medium block">Exclude only leads exported to THIS specific target company</span>
                      <span className="text-[11px] text-muted-foreground">Allows sharing leads with new external partners, while avoiding duplicate exports to the same partner.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input 
                      type="radio" 
                      name="exportOption" 
                      className="mt-0.5"
                      checked={exportFilterMode === 'INCLUDE_ALL'} 
                      onChange={() => setExportFilterMode('INCLUDE_ALL')} 
                    />
                    <div>
                      <span className="font-medium block">Export all selected leads regardless of export history ({selectedLeads.length} leads)</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                External Company / Partner Name <span className="text-destructive">*</span>
              </Label>
              <Input 
                placeholder="e.g. Acme Marketing, Outbound Agency B..."
                value={externalCompany}
                onChange={e => setExternalCompany(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                This company name will be logged on each lead document to flag that it was shared.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Export Purpose / Notes (Optional)</Label>
              <Input 
                placeholder="e.g. Q3 Telemarketing Campaign, Event Follow-up..."
                value={exportNotes}
                onChange={e => setExportNotes(e.target.value)}
              />
            </div>

            <div className="bg-muted/40 p-3 rounded-md text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Selected:</span>
                <span className="font-medium">{selectedLeads.length} leads</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Final Export Count:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {finalExportCount} leads
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button 
              onClick={handleExecuteExport} 
              disabled={isExporting || !externalCompany.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isExporting ? <Loader className="w-4 h-4 mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Confirm Export & Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
