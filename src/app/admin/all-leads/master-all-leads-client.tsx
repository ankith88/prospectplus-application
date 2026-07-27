"use client"

import { useEffect, useState, useMemo } from 'react'
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
import { getLeadsFromFirebase, getAllUsers, bulkReassignLeads, markLeadsAsExported } from '@/services/firebase'
import type { Lead, UserProfile, LeadBucket } from '@/lib/types'
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
  ChevronRight
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

const BUCKET_LABELS: Record<string, string> = {
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

export function MasterAllLeadsClient() {
  const { userProfile, isSuperAdmin, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const isAllowed = useMemo(() => {
    if (isSuperAdmin) return true
    const role = userProfile?.activeRole || userProfile?.role || ''
    return ['admin', 'super user', 'Sales Manager', 'Marketing Admin', 'Marketing Manager', 'Outbound Admin'].includes(role)
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
  const [excludeAlreadyExported, setExcludeAlreadyExported] = useState(true)
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
    if (isAllowed) {
      fetchData()
    }
  }, [isAllowed])

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
        if (!leadCreatedStr) return false
        const leadDate = new Date(leadCreatedStr)
        if (dateCreatedFrom && leadDate < new Date(dateCreatedFrom)) return false
        if (dateCreatedTo) {
          const toDate = new Date(dateCreatedTo)
          toDate.setHours(23, 59, 59, 999)
          if (leadDate > toDate) return false
        }
      }

      // 9. Date Lead Entered Range
      if (dateEnteredFrom || dateEnteredTo) {
        const leadEnteredStr = lead.dateLeadEntered || lead.assignedToDialerAt || (lead as any).createdAt
        if (!leadEnteredStr) return false
        const leadDate = new Date(leadEnteredStr)
        if (dateEnteredFrom && leadDate < new Date(dateEnteredFrom)) return false
        if (dateEnteredTo) {
          const toDate = new Date(dateEnteredTo)
          toDate.setHours(23, 59, 59, 999)
          if (leadDate > toDate) return false
        }
      }

      return true
    })
  }, [
    leads, searchQuery, filterSource, filterBucket, filterStatus,
    filterDialer, filterAccountManager, filterExportStatus,
    dateCreatedFrom, dateCreatedTo, dateEnteredFrom, dateEnteredTo
  ])

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [
    searchQuery, filterSource, filterBucket, filterStatus,
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

  // Open Export Dialog
  const handleOpenExportModal = () => {
    if (selectedLeads.length === 0) {
      toast({ variant: 'destructive', title: 'Select Leads', description: 'Please select at least one lead to export.' })
      return
    }
    setExternalCompany('')
    setExportNotes('')
    setExcludeAlreadyExported(exportedSelectedCount > 0)
    setIsExportDialogOpen(true)
  }

  // Execute CSV Export and Mark Exported
  const handleExecuteExport = async () => {
    if (!externalCompany.trim()) {
      toast({ variant: 'destructive', title: 'Company Name Required', description: 'Please enter the external company or partner name.' })
      return
    }

    let leadsToExport = selectedLeadObjects
    if (excludeAlreadyExported && exportedSelectedCount > 0) {
      leadsToExport = selectedLeadObjects.filter(l => !l.isExported)
    }

    if (leadsToExport.length === 0) {
      toast({ variant: 'destructive', title: 'No Leads to Export', description: 'All selected leads have already been exported.' })
      return
    }

    setIsExporting(true)
    try {
      // 1. Generate CSV
      const headers = [
        'NetSuite ID',
        'ProspectPlus ID',
        'Company Name',
        'Status',
        'Bucket',
        'Customer Source',
        'Date Created',
        'Date Lead Entered',
        'Dialer Assigned',
        'Account Manager Assigned',
        'Contact Name',
        'Contact Email',
        'Contact Phone',
        'City',
        'State',
        'Is Previously Exported',
        'Exported At',
        'Exported To Company'
      ]

      const escapeCsv = (val: any) => {
        if (val === undefined || val === null) return '""'
        const str = String(val).replace(/"/g, '""')
        return `"${str}"`
      }

      const rows = leadsToExport.map(l => [
        escapeCsv(l.entityId || ''),
        escapeCsv(l.prospectPlusId || l.id),
        escapeCsv(l.companyName || ''),
        escapeCsv(l.status || ''),
        escapeCsv(l.bucket || 'unassigned'),
        escapeCsv(l.customerSource || ''),
        escapeCsv((l as any).dateCreated || l.dateLeadEntered || (l as any).createdAt || ''),
        escapeCsv(l.dateLeadEntered || l.assignedToDialerAt || ''),
        escapeCsv(l.dialerAssigned || ''),
        escapeCsv(l.accountManagerAssigned || ''),
        escapeCsv(l.contacts?.[0]?.name || ''),
        escapeCsv(l.customerServiceEmail || l.contacts?.[0]?.email || ''),
        escapeCsv(l.customerPhone || l.contacts?.[0]?.phone || ''),
        escapeCsv(l.address?.city || l.city || ''),
        escapeCsv(l.address?.state || l.state || ''),
        escapeCsv(l.isExported ? 'Yes' : 'No'),
        escapeCsv(l.exportedAt || ''),
        escapeCsv(l.exportedToCompany || '')
      ])

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
      setLeads(prev => prev.map(l => {
        if (leadIdsToMark.includes(l.id)) {
          return {
            ...l,
            isExported: true,
            exportedAt: exportedAtNow,
            exportedBy: authorName,
            exportedToCompany: externalCompany.trim(),
            exportBatchId: res.batchId
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
                  <TableHead>Source</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Date Entered</TableHead>
                  <TableHead>Dialer</TableHead>
                  <TableHead>Account Manager</TableHead>
                  <TableHead className="text-right">Export Tracking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      No leads match the specified criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLeads.map((lead) => {
                    const isSelected = selectedLeads.includes(lead.id)
                    const dateCreatedStr = (lead as any).dateCreated || lead.dateLeadEntered || (lead as any).createdAt
                    const dateEnteredStr = lead.dateLeadEntered || lead.assignedToDialerAt

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
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{lead.companyName}</span>
                            <div className="text-[11px] text-muted-foreground flex gap-2">
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
                        <TableCell className="text-xs text-muted-foreground">
                          {lead.customerSource || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {dateCreatedStr ? format(parseISO(dateCreatedStr), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {dateEnteredStr ? format(parseISO(dateEnteredStr), 'dd/MM/yyyy') : '-'}
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
                                Exported
                              </Badge>
                              <span className="text-[10px] text-muted-foreground mt-0.5" title={`Exported by ${lead.exportedBy || 'Admin'}`}>
                                to {lead.exportedToCompany || 'External'}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                              Unexported
                            </Badge>
                          )}
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
                  To prevent duplicate sharing with external partners, choose how to handle previously exported leads:
                </p>
                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input 
                      type="radio" 
                      name="exportOption" 
                      checked={excludeAlreadyExported} 
                      onChange={() => setExcludeAlreadyExported(true)} 
                    />
                    <span className="font-medium">Exclude previously exported leads ({selectedLeads.length - exportedSelectedCount} leads will be exported)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input 
                      type="radio" 
                      name="exportOption" 
                      checked={!excludeAlreadyExported} 
                      onChange={() => setExcludeAlreadyExported(false)} 
                    />
                    <span>Force re-export all selected leads ({selectedLeads.length} leads)</span>
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
                  {excludeAlreadyExported ? selectedLeads.length - exportedSelectedCount : selectedLeads.length} leads
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
