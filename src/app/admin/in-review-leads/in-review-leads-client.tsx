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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { getLeadsFromFirebase, getAllUsers, bulkReassignLeads, getAllFranchisees } from '@/services/firebase'
import type { Lead, UserProfile, LeadBucket, Franchisee } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Loader } from '@/components/ui/loader'
import { 
  Search, 
  Filter, 
  Shuffle, 
  RotateCcw, 
  UserCheck, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Lock,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Eye,
  SlidersHorizontal,
  Building,
  Briefcase,
  RefreshCw
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { DateRange } from 'react-day-picker'

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

export function InReviewLeadsClient() {
  const { userProfile, isSuperAdmin, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const isAllowed = useMemo(() => {
    const role = userProfile?.activeRole || userProfile?.role || ''
    if (role === 'user' || role.toLowerCase() === 'user') return false
    if (isSuperAdmin) return true
    return ['admin', 'super user', 'Sales Manager', 'Marketing Admin', 'Marketing Manager', 'Outbound Admin', 'Lead Gen Admin', 'Account Managers', 'Account Manager'].includes(role)
  }, [isSuperAdmin, userProfile])

  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [franchisees, setFranchisees] = useState<Franchisee[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  // Filters state - identical to Outbound Leads page filters
  const [filters, setFilters] = useState({
    prospectPlusId: '',
    entityId: '',
    companyName: '',
    suburb: '',
    status: [] as string[],
    franchisee: [] as string[],
    campaign: 'all',
    source: [] as string[],
    dateLeadEntered: undefined as DateRange | undefined,
    customerStatus: [] as string[],
  })

  // Assignment action state
  const [selectedTargetBucket, setSelectedTargetBucket] = useState<string>('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isAssigning, setIsAssigning] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const fetchData = async (isRef = false) => {
    if (isRef) setIsRefreshing(true)
    else setLoading(true)

    try {
      const [fetchedLeads, fetchedUsers, fetchedFranchisees] = await Promise.all([
        getLeadsFromFirebase({ summary: true }),
        getAllUsers(),
        getAllFranchisees()
      ])
      // Filter for in_review leads
      const inReviewLeads = fetchedLeads.filter((l: Lead) => l.bucket === 'in_review')
      setLeads(inReviewLeads)
      setUsers(fetchedUsers)
      setFranchisees(fetchedFranchisees)
    } catch (error) {
      console.error('Failed to fetch in_review lead data:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch lead records.' })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.replace('/leads')
    } else if (isAllowed) {
      fetchData()
    }
  }, [authLoading, isAllowed, router])

  // Filter Combobox Option Collections
  const leadStatusOptions = useMemo(() => {
    const statuses = ['New', 'Contact Attempted', 'Contacted', 'Qualified', 'Unqualified', 'Lost', 'Future Follow Up', 'Out of Territory']
    const existingInLeads = new Set(leads.map(l => l.status).filter(Boolean) as string[])
    existingInLeads.forEach(s => { if (!statuses.includes(s)) statuses.push(s) })
    return statuses.map(s => ({ value: s, label: s }))
  }, [leads])

  const uniqueFranchisees = useMemo(() => {
    return franchisees.map(f => ({ value: f.name, label: f.name })).sort((a, b) => a.label.localeCompare(b.label))
  }, [franchisees])

  const uniqueCampaigns = useMemo(() => {
    const set = new Set<string>()
    leads.forEach(l => { if (l.campaign) set.add(l.campaign) })
    return Array.from(set).map(c => ({ value: c, label: c })).sort((a, b) => a.label.localeCompare(b.label))
  }, [leads])

  const uniqueSources = useMemo(() => {
    const set = new Set<string>()
    leads.forEach(l => { if (l.customerSource) set.add(l.customerSource) })
    return Array.from(set).map(s => ({ value: s, label: s })).sort((a, b) => a.label.localeCompare(b.label))
  }, [leads])

  const uniqueCustomerStatuses = useMemo(() => {
    const set = new Set<string>()
    leads.forEach(l => { if (l.customerStatus) set.add(l.customerStatus) })
    return Array.from(set).map(cs => ({ value: cs, label: cs })).sort((a, b) => a.label.localeCompare(b.label))
  }, [leads])

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }))
  }

  const handleClearFilters = () => {
    setFilters({
      prospectPlusId: '',
      entityId: '',
      companyName: '',
      suburb: '',
      status: [],
      franchisee: [],
      campaign: 'all',
      source: [],
      dateLeadEntered: undefined,
      customerStatus: [],
    })
  }

  // Filter application matching Outbound Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // 1. Prospect+ ID
      if (filters.prospectPlusId.trim()) {
        const q = filters.prospectPlusId.toLowerCase().trim()
        const matchId = (lead.prospectPlusId || lead.id || '').toLowerCase().includes(q)
        if (!matchId) return false
      }

      // 2. Customer ID / Entity ID
      if (filters.entityId.trim()) {
        const q = filters.entityId.toLowerCase().trim()
        const matchEntity = (lead.entityId || '').toLowerCase().includes(q)
        if (!matchEntity) return false
      }

      // 3. Company Name
      if (filters.companyName.trim()) {
        const q = filters.companyName.toLowerCase().trim()
        const matchCompany = (lead.companyName || '').toLowerCase().includes(q)
        if (!matchCompany) return false
      }

      // 4. Suburb
      if (filters.suburb.trim()) {
        const q = filters.suburb.toLowerCase().trim()
        const leadSuburb = lead.address?.city || (lead as any).city || (lead as any).suburb || ''
        if (!leadSuburb.toLowerCase().includes(q)) return false
      }

      // 5. Lead Status (MultiSelect)
      if (filters.status.length > 0) {
        if (!filters.status.includes(lead.status || '')) return false
      }

      // 6. Franchisee (MultiSelect)
      if (filters.franchisee.length > 0) {
        const leadFran = (lead as any).franchiseeName || (lead as any).franchisee || ''
        if (!filters.franchisee.includes(leadFran)) return false
      }

      // 7. Campaign
      if (filters.campaign !== 'all') {
        if (lead.campaign !== filters.campaign) return false
      }

      // 8. Source / Customer Source (MultiSelect)
      if (filters.source.length > 0) {
        if (!filters.source.includes(lead.customerSource || '')) return false
      }

      // 9. Customer Status (MultiSelect)
      if (filters.customerStatus.length > 0) {
        if (!filters.customerStatus.includes(lead.customerStatus || '')) return false
      }

      // 10. Date Lead Entered Range
      if (filters.dateLeadEntered?.from) {
        const leadEnteredStr = lead.dateLeadEntered || lead.assignedToDialerAt || (lead as any).createdAt
        const leadDate = parseAnyDate(leadEnteredStr)
        if (!leadDate) return false

        const fromDate = new Date(filters.dateLeadEntered.from)
        fromDate.setHours(0, 0, 0, 0)
        if (leadDate < fromDate) return false

        if (filters.dateLeadEntered.to) {
          const toDate = new Date(filters.dateLeadEntered.to)
          toDate.setHours(23, 59, 59, 999)
          if (leadDate > toDate) return false
        }
      }

      return true
    })
  }, [leads, filters])

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Paginated View
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLeads.slice(start, start + pageSize)
  }, [filteredLeads, currentPage, pageSize])

  // Eligible users based on selected target bucket
  const eligibleUsers = useMemo(() => {
    if (!selectedTargetBucket) return []
    return users.filter(u => {
      if (u.disabled) return false
      const roles = u.assignedRoles || []
      const primaryRole = u.activeRole || u.role || ''
      const allRoles = [...roles, primaryRole]

      switch (selectedTargetBucket) {
        case 'outbound':
          return allRoles.some(r => ['user', 'Dialer', 'dialers', 'Lead Gen', 'Lead Gen Admin', 'Outbound Admin'].includes(r))
        case 'field_sales':
          return allRoles.some(r => ['Field Sales', 'Field Sales Admin'].includes(r))
        case 'inbound':
          return allRoles.some(r => ['Sales Manager', 'Account Managers', 'Account Manager', 'Lead Gen Admin'].includes(r))
        case 'account_manager':
          return allRoles.some(r => ['Sales Manager', 'Account Managers', 'Account Manager', 'account managers'].includes(r))
        case 'customer_success':
          return allRoles.some(r => ['Customer Success'].includes(r))
        case 'nurture':
        case 'marketing':
          return allRoles.some(r => ['admin', 'Marketing Admin', 'Marketing Manager'].includes(r))
        default:
          return true
      }
    }).map(u => ({
      value: u.uid || u.email || '',
      label: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Unknown User'
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [users, selectedTargetBucket])

  // Table Selection Handlers
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

  // Multi-user Equal and Random Bucket Reassignment Handler
  const handleAssignLeads = async () => {
    if (selectedLeads.length === 0 || !selectedTargetBucket) {
      toast({ variant: 'destructive', title: 'Action Required', description: 'Select leads and a target bucket.' })
      return
    }

    if (selectedUsers.length === 0 && !['nurture', 'marketing', 'unassigned', 'lpo_plus'].includes(selectedTargetBucket)) {
      toast({ variant: 'destructive', title: 'Action Required', description: 'Select at least one user for assignment.' })
      return
    }

    setIsAssigning(true)
    try {
      const assignmentMap: Record<string, string> = {}
      const leadCurrentBuckets: Record<string, string> = {}

      const selectedLeadObjs = leads.filter(l => selectedLeads.includes(l.id))
      selectedLeadObjs.forEach(l => {
        leadCurrentBuckets[l.id] = l.bucket || 'in_review'
      })

      if (['nurture', 'marketing', 'unassigned', 'lpo_plus'].includes(selectedTargetBucket)) {
        selectedLeads.forEach(leadId => {
          assignmentMap[leadId] = ''
        })
      } else if (selectedUsers.length > 0) {
        // Multi-select random and equal distribution algorithm
        // 1. Shuffle selected leads randomly
        const shuffledLeadIds = [...selectedLeads].sort(() => Math.random() - 0.5)
        // 2. Shuffle selected users randomly
        const shuffledUserIds = [...selectedUsers].sort(() => Math.random() - 0.5)

        // 3. Assign leads equally round-robin across shuffled users
        shuffledLeadIds.forEach((leadId, index) => {
          const assignedUser = shuffledUserIds[index % shuffledUserIds.length]
          assignmentMap[leadId] = assignedUser
        })
      }

      await bulkReassignLeads(
        selectedLeads,
        selectedTargetBucket,
        assignmentMap,
        userProfile?.displayName || userProfile?.email || 'Admin',
        leadCurrentBuckets
      )

      const targetLabel = BUCKET_LABELS[selectedTargetBucket] || selectedTargetBucket
      toast({ 
        title: 'Bucket Reassignment Successful', 
        description: `Successfully moved ${selectedLeads.length} leads to ${targetLabel}${selectedUsers.length > 1 ? ` (randomly & equally assigned across ${selectedUsers.length} selected users)` : ''}.` 
      })

      // Remove reassigned leads from local in_review state
      setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)))
      setSelectedLeads([])
      setSelectedTargetBucket('')
      setSelectedUsers([])
    } catch (error) {
      console.error('In review bucket assignment error:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign leads.' })
    } finally {
      setIsAssigning(false)
    }
  }

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.prospectPlusId ||
      filters.entityId ||
      filters.companyName ||
      filters.suburb ||
      filters.status.length > 0 ||
      filters.franchisee.length > 0 ||
      filters.campaign !== 'all' ||
      filters.source.length > 0 ||
      filters.dateLeadEntered ||
      filters.customerStatus.length > 0
    )
  }, [filters])

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
            You do not have permission to access the In Review Leads page.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 text-white dark:bg-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total In Review Leads</p>
              <p className="text-2xl font-bold mt-1">{leads.length.toLocaleString()}</p>
            </div>
            <Layers className="w-8 h-8 text-amber-400 opacity-80" />
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

        <Card className="bg-purple-950/40 border-purple-800/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-400 font-medium uppercase tracking-wider">Selected Leads</p>
              <p className="text-2xl font-bold mt-1 text-purple-300">
                {selectedLeads.length.toLocaleString()}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-purple-400 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Outbound Leads Filter Suite */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              In Review Lead Filters
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={() => fetchData(true)} variant="outline" size="sm" disabled={isRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8 gap-1">
                  <X className="w-3.5 h-3.5" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="prospectPlusId">Prospect+ ID</Label>
              <Input
                id="prospectPlusId"
                value={filters.prospectPlusId}
                onChange={(e) => handleFilterChange('prospectPlusId', e.target.value)}
                placeholder="Filter Prospect+ ID..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entityId">Customer ID</Label>
              <Input
                id="entityId"
                value={filters.entityId}
                onChange={(e) => handleFilterChange('entityId', e.target.value)}
                placeholder="Filter Customer ID..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={filters.companyName}
                onChange={(e) => handleFilterChange('companyName', e.target.value)}
                placeholder="Filter Company Name..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suburb">Suburb</Label>
              <Input
                id="suburb"
                value={filters.suburb}
                onChange={(e) => handleFilterChange('suburb', e.target.value)}
                placeholder="Filter Suburb..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Lead Status</Label>
              <MultiSelectCombobox
                options={leadStatusOptions}
                selected={filters.status}
                onSelectedChange={(selected) => handleFilterChange('status', selected)}
                placeholder="Select lead statuses..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchisee">Franchisee</Label>
              <MultiSelectCombobox
                options={uniqueFranchisees}
                selected={filters.franchisee}
                onSelectedChange={(selected) => handleFilterChange('franchisee', selected)}
                placeholder="Select franchisees..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign">Campaign</Label>
              <Select value={filters.campaign} onValueChange={(val) => handleFilterChange('campaign', val)}>
                <SelectTrigger id="campaign-select">
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {uniqueCampaigns.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <MultiSelectCombobox
                options={uniqueSources}
                selected={filters.source}
                onSelectedChange={(selected) => handleFilterChange('source', selected)}
                placeholder="Select customer sources..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateLeadEntered">Date Lead Entered</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="dateLeadEntered"
                    variant="outline"
                    className="w-full h-10 px-3 py-2 justify-start text-left font-normal text-xs md:text-sm overflow-hidden whitespace-nowrap text-ellipsis"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {filters.dateLeadEntered?.from ? (
                        filters.dateLeadEntered.to ? (
                          <>{format(filters.dateLeadEntered.from, "LLL dd, y")} - {format(filters.dateLeadEntered.to, "LLL dd, y")}</>
                        ) : (
                          format(filters.dateLeadEntered.from, "LLL dd, y")
                        )
                      ) : (
                        "Pick a date"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 flex" align="start">
                  <Calendar
                    mode="range"
                    selected={filters.dateLeadEntered}
                    onSelect={(date) => handleFilterChange('dateLeadEntered', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerStatus">NetSuite / Customer Status</Label>
              <MultiSelectCombobox
                options={uniqueCustomerStatuses}
                selected={filters.customerStatus}
                onSelectedChange={(selected) => handleFilterChange('customerStatus', selected)}
                placeholder="Select NetSuite statuses..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action & Reassignment Card (styled like Master Directory) */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-primary" />
            Bulk Move & Assign Leads ({selectedLeads.length} Selected)
          </CardTitle>
          <CardDescription>
            Select a target bucket and multi-select dialers or account managers to randomly and equally distribute selected leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Target Bucket Selector */}
            <div className="w-full sm:w-64 space-y-1.5">
              <Label className="text-xs font-medium">1. Target Bucket</Label>
              <Select 
                value={selectedTargetBucket} 
                onValueChange={(val) => {
                  setSelectedTargetBucket(val)
                  setSelectedUsers([])
                }}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select destination bucket..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound (Dialer)</SelectItem>
                  <SelectItem value="account_manager">Account Manager</SelectItem>
                  <SelectItem value="field_sales">Field Sales</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="customer_success">Customer Success</SelectItem>
                  <SelectItem value="nurture">Nurture</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="lpo_plus">LPO Plus</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Multi-Selector for Outbound & Account Manager or other user buckets */}
            {selectedTargetBucket && !['nurture', 'marketing', 'unassigned', 'lpo_plus'].includes(selectedTargetBucket) && (
              <div className="w-full sm:w-80 space-y-1.5">
                <Label className="text-xs font-medium">
                  2. Select {selectedTargetBucket === 'outbound' ? 'Dialer(s)' : selectedTargetBucket === 'account_manager' ? 'Account Manager(s)' : 'User(s)'} (Multi-select for Random Equal Split)
                </Label>
                <MultiSelectCombobox
                  options={eligibleUsers}
                  selected={selectedUsers}
                  onSelectedChange={setSelectedUsers}
                  placeholder={`Select ${selectedTargetBucket === 'outbound' ? 'dialers' : selectedTargetBucket === 'account_manager' ? 'account managers' : 'users'}...`}
                />
              </div>
            )}

            {/* Execute Move Button */}
            <Button 
              onClick={handleAssignLeads} 
              disabled={isAssigning || selectedLeads.length === 0 || !selectedTargetBucket}
              className="gap-2"
            >
              {isAssigning ? <Loader className="w-4 h-4" /> : <Shuffle className="w-4 h-4" />}
              Move Selected Leads ({selectedLeads.length})
            </Button>
          </div>

          {selectedTargetBucket && selectedUsers.length > 1 && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              The system will randomly and equally divide {selectedLeads.length} lead(s) among the {selectedUsers.length} selected {selectedTargetBucket === 'outbound' ? 'dialers' : 'account managers'}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Main Leads Data Table (styled like Master Directory) */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                  <TableHead className="w-12 text-center">
                    <Checkbox 
                      checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                      onCheckedChange={(checked) => handleSelectAllFiltered(!!checked)}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Prospect+ ID</TableHead>
                  <TableHead className="font-semibold">Customer ID</TableHead>
                  <TableHead className="font-semibold">Company Name</TableHead>
                  <TableHead className="font-semibold">Contact Details</TableHead>
                  <TableHead className="font-semibold">Suburb</TableHead>
                  <TableHead className="font-semibold">Lead Status</TableHead>
                  <TableHead className="font-semibold">NetSuite Status</TableHead>
                  <TableHead className="font-semibold">Source</TableHead>
                  <TableHead className="font-semibold">Date Entered</TableHead>
                  <TableHead className="font-semibold">Assigned Rep</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                      No leads in review match your filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLeads.map(lead => {
                    const isSelected = selectedLeads.includes(lead.id)
                    const contact = lead.contacts?.[0]
                    const assignedRep = lead.dialerAssigned || lead.accountManagerAssigned || lead.salesRepAssigned || lead.fieldRepAssigned || '-'
                    const suburbName = lead.address?.city || (lead as any).city || (lead as any).suburb || '-'

                    return (
                      <TableRow key={lead.id} className={isSelected ? 'bg-primary/5' : undefined}>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectRow(lead.id, !!checked)}
                            aria-label={`Select ${lead.companyName}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium">
                          {lead.prospectPlusId || lead.id}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {lead.entityId || '-'}
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          <Link href={`/leads/${lead.id}`} className="hover:underline text-primary">
                            {lead.companyName || 'Unnamed Lead'}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs">
                          {contact ? (
                            <div>
                              <p className="font-medium text-foreground">{contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '-'}</p>
                              <p className="text-muted-foreground">{contact.email || contact.phone || '-'}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {suburbName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {lead.status || 'New'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.customerStatus ? (
                            <Badge variant="secondary" className="text-xs font-normal">
                              {lead.customerStatus}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {lead.customerSource || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {safeFormatDate(lead.dateLeadEntered || lead.assignedToDialerAt || (lead as any).createdAt)}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {assignedRep}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Link href={`/leads/${lead.id}`}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View lead</span>
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
          <div className="flex flex-wrap items-center justify-between p-4 border-t gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {paginatedLeads.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredLeads.length)} of {filteredLeads.length} records</span>
              <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default InReviewLeadsClient
