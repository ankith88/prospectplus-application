"use client"

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { AccessDenied } from '@/components/access-denied'
import { Loader } from '@/components/ui/loader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  getLeadsFromFirebase,
  getCompaniesFromFirebase,
} from '@/services/firebase'
import {
  bulkLinkLeadsToParent,
  bulkUnlinkLeads,
  validateCsvRows,
  CsvRowValidation,
} from '@/services/mass-link-service'
import type { Lead } from '@/lib/types'
import {
  Network,
  Search,
  Building,
  CheckCircle2,
  AlertTriangle,
  X,
  UploadCloud,
  FileSpreadsheet,
  Link2,
  Unlink,
  Filter,
  ArrowRight,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UserCheck,
} from 'lucide-react'

export function MassLinkCustomersClient() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [leads, setLeads] = useState<Lead[]>([])
  const [loadingData, setLoadingData] = useState<boolean>(true)

  // Tab State
  const [activeTab, setActiveTab] = useState<'interactive' | 'csv'>('interactive')

  // Selected Parent State
  const [parentSearch, setParentSearch] = useState<string>('')
  const [selectedParent, setSelectedParent] = useState<Lead | null>(null)
  const [showParentDropdown, setShowParentDropdown] = useState<boolean>(false)

  // Candidate Filters State
  const [candidateSearch, setCandidateSearch] = useState<string>('')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [bucketFilter, setBucketFilter] = useState<string>('all')
  const [linkStatusFilter, setLinkStatusFilter] = useState<string>('unlinked') // 'all', 'unlinked', 'other_parent', 'this_parent'
  const [matchDomainOnly, setMatchDomainOnly] = useState<boolean>(false)

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(25)

  // Selection State
  const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set())

  // Modal / Processing State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)
  const [actionType, setActionType] = useState<'link' | 'unlink'>('link')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // CSV Tab State
  const [csvRawText, setCsvRawText] = useState<string>('')
  const [csvValidations, setCsvValidations] = useState<CsvRowValidation[]>([])

  // Load Data
  const fetchData = async () => {
    setLoadingData(true)
    try {
      const [leadsRes, compRes] = await Promise.all([
        getLeadsFromFirebase(),
        getCompaniesFromFirebase(),
      ])

      const combinedMap = new Map<string, Lead>()
      leadsRes.forEach((l) => {
        if (l.id) combinedMap.set(l.id, l)
      })
      compRes.forEach((c) => {
        if (c.id) combinedMap.set(c.id, c)
      })

      const allList = Array.from(combinedMap.values())
      setLeads(allList)
    } catch (err: any) {
      console.error('Failed to load accounts:', err)
      toast({
        title: 'Error loading data',
        description: err.message || 'Could not fetch customer accounts.',
        variant: 'destructive',
      })
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData()
    }
  }, [isSuperAdmin])

  // Extract Parent Domain if email present
  const parentDomain = useMemo(() => {
    const parentEmail = (selectedParent as any)?.email
    if (!parentEmail) return ''
    const parts = parentEmail.split('@')
    return parts.length === 2 ? parts[1].toLowerCase().trim() : ''
  }, [selectedParent])

  // Parent Dropdown Candidates
  const parentCandidates = useMemo(() => {
    if (!parentSearch.trim()) return []
    const q = parentSearch.toLowerCase().trim()
    return leads
      .filter((l) => {
        const name = (l.companyName || (l as any).company_name || '').toLowerCase()
        const id = (l.id || '').toLowerCase()
        const pid = (l.prospectPlusId || '').toLowerCase()
        const email = ((l as any).email || '').toLowerCase()
        return name.includes(q) || id.includes(q) || pid.includes(q) || email.includes(q)
      })
      .slice(0, 10)
  }, [parentSearch, leads])

  // Calculate current child count for selected parent
  const parentChildCount = useMemo(() => {
    if (!selectedParent) return 0
    return leads.filter((l) => l.parentLeadId === selectedParent.id || (l as any).parentCompanyId === selectedParent.id).length
  }, [selectedParent, leads])

  // Unique States list for filter
  const stateOptions = useMemo(() => {
    const states = new Set<string>()
    leads.forEach((l) => {
      const st = l.address?.state || l.state
      if (st) states.add(st.toUpperCase())
    })
    return Array.from(states).sort()
  }, [leads])

  // Filter Candidate Leads
  const filteredCandidates = useMemo(() => {
    return leads.filter((l) => {
      // Exclude selected parent itself
      if (selectedParent && l.id === selectedParent.id) return false

      // Search Filter
      if (candidateSearch.trim()) {
        const q = candidateSearch.toLowerCase().trim()
        const name = (l.companyName || (l as any).company_name || '').toLowerCase()
        const id = (l.id || '').toLowerCase()
        const pid = (l.prospectPlusId || '').toLowerCase()
        const email = ((l as any).email || '').toLowerCase()
        const suburb = (l.address?.city || (l as any).suburb || '').toLowerCase()
        const matches = name.includes(q) || id.includes(q) || pid.includes(q) || email.includes(q) || suburb.includes(q)
        if (!matches) return false
      }

      // State Filter
      if (stateFilter !== 'all') {
        const st = (l.address?.state || l.state || '').toUpperCase()
        if (st !== stateFilter) return false
      }

      // Bucket Filter
      if (bucketFilter !== 'all') {
        const status = (l.customerStatus || l.status || l.bucket || '').toLowerCase()
        if (!status.includes(bucketFilter.toLowerCase())) return false
      }

      // Link Status Filter
      if (linkStatusFilter === 'unlinked') {
        if (l.parentLeadId || (l as any).parentCompanyId) return false
      } else if (linkStatusFilter === 'other_parent') {
        if (!l.parentLeadId && !(l as any).parentCompanyId) return false
        if (selectedParent && (l.parentLeadId === selectedParent.id || (l as any).parentCompanyId === selectedParent.id)) return false
      } else if (linkStatusFilter === 'this_parent') {
        if (!selectedParent) return false
        if (l.parentLeadId !== selectedParent.id && (l as any).parentCompanyId !== selectedParent.id) return false
      }

      // Domain Match Filter
      if (matchDomainOnly && parentDomain) {
        const childEmail = ((l as any).email || '').toLowerCase()
        if (!childEmail.endsWith(`@${parentDomain}`)) return false
      }

      return true
    })
  }, [leads, selectedParent, candidateSearch, stateFilter, bucketFilter, linkStatusFilter, matchDomainOnly, parentDomain])

  // Paginated Candidates
  const totalPages = Math.ceil(filteredCandidates.length / pageSize) || 1
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCandidates.slice(start, start + pageSize)
  }, [filteredCandidates, currentPage, pageSize])

  // Handle Select All Visible
  const isAllVisibleSelected = useMemo(() => {
    if (paginatedCandidates.length === 0) return false
    return paginatedCandidates.every((c) => selectedChildIds.has(c.id))
  }, [paginatedCandidates, selectedChildIds])

  const toggleSelectAllVisible = () => {
    const next = new Set(selectedChildIds)
    if (isAllVisibleSelected) {
      paginatedCandidates.forEach((c) => next.delete(c.id))
    } else {
      paginatedCandidates.forEach((c) => next.add(c.id))
    }
    setSelectedChildIds(next)
  }

  const toggleSelectChild = (id: string) => {
    const next = new Set(selectedChildIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedChildIds(next)
  }

  // Conflicting children count
  const conflictingChildren = useMemo(() => {
    return Array.from(selectedChildIds)
      .map((id) => leads.find((l) => l.id === id))
      .filter((l) => l && l.parentLeadId && selectedParent && l.parentLeadId !== selectedParent.id) as Lead[]
  }, [selectedChildIds, leads, selectedParent])

  // Execute Bulk Link / Unlink
  const handleExecuteAction = async () => {
    if (actionType === 'link' && !selectedParent) return

    setIsSubmitting(true)
    try {
      const childArray = Array.from(selectedChildIds)

      if (actionType === 'link' && selectedParent) {
        const res = await bulkLinkLeadsToParent(selectedParent.id, childArray, user?.email || undefined)
        if (res.success) {
          toast({
            title: 'Mass Link Complete',
            description: `Successfully linked ${res.linkedCount} customer accounts under ${res.parentName}.`,
          })
          setSelectedChildIds(new Set())
          setShowConfirmModal(false)
          fetchData()
        } else {
          toast({
            title: 'Mass Link Failed',
            description: res.error || 'Failed to mass link accounts.',
            variant: 'destructive',
          })
        }
      } else if (actionType === 'unlink') {
        const res = await bulkUnlinkLeads(childArray, user?.email || undefined)
        if (res.success) {
          toast({
            title: 'Mass Unlink Complete',
            description: `Successfully unlinked ${res.linkedCount} customer accounts.`,
          })
          setSelectedChildIds(new Set())
          setShowConfirmModal(false)
          fetchData()
        } else {
          toast({
            title: 'Unlink Failed',
            description: res.error || 'Failed to unlink accounts.',
            variant: 'destructive',
          })
        }
      }
    } catch (err: any) {
      toast({
        title: 'Execution Error',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle CSV Parse
  const handleParseCsv = () => {
    if (!csvRawText.trim()) {
      setCsvValidations([])
      return
    }

    const lines = csvRawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      setCsvValidations([])
      return
    }

    // Skip header line if detected
    const firstLine = lines[0].toLowerCase()
    const startIndex = firstLine.includes('child') || firstLine.includes('parent') ? 1 : 0

    const rows: Array<{ childIdentifier: string; parentIdentifier: string }> = []
    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''))
      if (parts.length >= 2) {
        rows.push({ childIdentifier: parts[0], parentIdentifier: parts[1] })
      }
    }

    const validations = validateCsvRows(rows, leads)
    setCsvValidations(validations)
  }

  // Handle Execute CSV Mappings
  const handleExecuteCsv = async () => {
    const validRows = csvValidations.filter((v) => v.status === 'valid' || v.status === 'conflict')
    if (validRows.length === 0) {
      toast({
        title: 'No Valid Mappings',
        description: 'There are no valid CSV mappings ready for processing.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    let totalLinked = 0

    try {
      // Group by target Parent ID
      const parentGroups = new Map<string, string[]>()
      validRows.forEach((row) => {
        if (row.parentLead?.id && row.childLead?.id) {
          const pId = row.parentLead.id
          const cId = row.childLead.id
          if (!parentGroups.has(pId)) parentGroups.set(pId, [])
          parentGroups.get(pId)!.push(cId)
        }
      })

      for (const [pId, cIds] of Array.from(parentGroups.entries())) {
        const res = await bulkLinkLeadsToParent(pId, cIds, user?.email || undefined)
        if (res.success) {
          totalLinked += res.linkedCount
        }
      }

      toast({
        title: 'CSV Bulk Import Complete',
        description: `Successfully mass-linked ${totalLinked} accounts across ${parentGroups.size} parent accounts.`,
      })

      setCsvRawText('')
      setCsvValidations([])
      fetchData()
    } catch (err: any) {
      toast({
        title: 'CSV Execution Failed',
        description: err.message || 'Failed to process CSV mappings.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render Auth Checks
  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="interactive" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Interactive Multi-Select
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            CSV Bulk Upload
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: INTERACTIVE MULTI-SELECT ================= */}
        <TabsContent value="interactive" className="space-y-6 pt-4">
          {/* Step 1: Select Parent Customer Account */}
          <Card className="border-2 border-primary/20 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5 text-primary" />
                1. Select Target Parent Customer Account
              </CardTitle>
              <CardDescription>
                Search and select the primary Parent Customer Account that candidate accounts will be linked to.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedParent ? (
                <div className="relative max-w-xl">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search Parent by Company Name, Account #, Email, or ID..."
                      value={parentSearch}
                      onChange={(e) => {
                        setParentSearch(e.target.value)
                        setShowParentDropdown(true)
                      }}
                      onFocus={() => setShowParentDropdown(true)}
                      className="pl-9 pr-4 py-2"
                    />
                  </div>

                  {showParentDropdown && parentCandidates.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                      <div className="max-h-60 overflow-auto py-1">
                        {parentCandidates.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors"
                            onClick={() => {
                              setSelectedParent(p)
                              setParentSearch('')
                              setShowParentDropdown(false)
                            }}
                          >
                            <div>
                              <div className="font-medium text-foreground">
                                {p.companyName || (p as any).company_name || 'Unnamed Account'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {p.id} | {p.address?.state || p.state || 'N/A'} {(p as any).email ? `| ${(p as any).email}` : ''}
                              </div>
                            </div>
                            {(p as any).isParent && (
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                                Current Parent
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-accent/40 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-foreground">
                        {selectedParent.companyName || (selectedParent as any).company_name}
                      </h4>
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Active Target Parent</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span><strong>ID:</strong> {selectedParent.id}</span>
                      {selectedParent.prospectPlusId && <span><strong>PP ID:</strong> {selectedParent.prospectPlusId}</span>}
                      {(selectedParent as any).email && <span><strong>Email:</strong> {(selectedParent as any).email}</span>}
                      <span><strong>State:</strong> {selectedParent.address?.state || selectedParent.state || 'N/A'}</span>
                      <span><strong>Current Linked Children:</strong> {parentChildCount}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedParent(null)
                      setLinkStatusFilter('unlinked')
                    }}
                    className="self-start sm:self-center gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    Change Parent
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Candidate Customer Selection Grid */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Layers className="h-5 w-5 text-primary" />
                    2. Filter & Select Candidate Customer Accounts
                  </CardTitle>
                  <CardDescription>
                    Filter accounts across your database and check the accounts you wish to mass link.
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  disabled={loadingData}
                  className="gap-1.5 self-start sm:self-center"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                  Refresh Accounts
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 rounded-lg border bg-muted/20">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Search Candidate</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Name, email, city..."
                      value={candidateSearch}
                      onChange={(e) => {
                        setCandidateSearch(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">State</label>
                  <Select
                    value={stateFilter}
                    onValueChange={(v) => {
                      setStateFilter(v)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {stateOptions.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Linking Status</label>
                  <Select
                    value={linkStatusFilter}
                    onValueChange={(v) => {
                      setLinkStatusFilter(v)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unlinked">Unlinked Accounts Only</SelectItem>
                      <SelectItem value="all">All Accounts</SelectItem>
                      <SelectItem value="other_parent">Linked to Other Parents</SelectItem>
                      {selectedParent && <SelectItem value="this_parent">Linked to Selected Parent</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Bucket / Stage</label>
                  <Select
                    value={bucketFilter}
                    onValueChange={(v) => {
                      setBucketFilter(v)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Buckets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buckets</SelectItem>
                      <SelectItem value="signed">Signed Customers</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="field_sales">Field Sales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end pb-1">
                  {selectedParent && parentDomain ? (
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                      <Checkbox
                        checked={matchDomainOnly}
                        onCheckedChange={(c) => {
                          setMatchDomainOnly(Boolean(c))
                          setCurrentPage(1)
                        }}
                      />
                      <span>Match Parent Domain (<code>@{parentDomain}</code>)</span>
                    </label>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Select parent for domain matching</span>
                  )}
                </div>
              </div>

              {/* Selection Summary Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-accent/30">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold">
                    {selectedChildIds.size} Accounts Selected
                  </Badge>
                  {selectedChildIds.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedChildIds(new Set())}
                      className="text-xs text-muted-foreground hover:text-foreground h-7"
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedChildIds.size === 0}
                    onClick={() => {
                      setActionType('unlink')
                      setShowConfirmModal(true)
                    }}
                    className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    Unlink Selected ({selectedChildIds.size})
                  </Button>

                  <Button
                    size="sm"
                    disabled={selectedChildIds.size === 0 || !selectedParent}
                    onClick={() => {
                      setActionType('link')
                      setShowConfirmModal(true)
                    }}
                    className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Mass Link ({selectedChildIds.size}) to Parent
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllVisibleSelected}
                          onCheckedChange={toggleSelectAllVisible}
                          aria-label="Select all visible accounts"
                        />
                      </TableHead>
                      <TableHead>Customer / Company</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Bucket / Status</TableHead>
                      <TableHead>Current Parent Linking</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingData ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <Loader />
                        </TableCell>
                      </TableRow>
                    ) : paginatedCandidates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          No candidate accounts found matching your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCandidates.map((c) => {
                        const isSelected = selectedChildIds.has(c.id)
                        const currentParentId = c.parentLeadId || (c as any).parentCompanyId
                        const isLinkedToCurrentTarget = selectedParent && currentParentId === selectedParent.id

                        return (
                          <TableRow
                            key={c.id}
                            className={`hover:bg-accent/40 cursor-pointer ${
                              isSelected ? 'bg-primary/5' : ''
                            }`}
                            onClick={() => toggleSelectChild(c.id)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectChild(c.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-foreground">
                                {c.companyName || (c as any).company_name || 'Unnamed Account'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {c.id} {(c as any).email ? `| ${(c as any).email}` : ''}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {c.address?.city || (c as any).suburb || 'N/A'}, {c.address?.state || c.state || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {c.customerStatus || c.status || c.bucket || 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isLinkedToCurrentTarget ? (
                                <Badge className="bg-emerald-600 text-white text-xs gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Linked to Target
                                </Badge>
                              ) : currentParentId ? (
                                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1 border-amber-500/20">
                                  <AlertTriangle className="h-3 w-3" />
                                  Linked to {currentParentId.slice(0, 10)}...
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Unlinked
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-2">
                <div>
                  Showing {filteredCandidates.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                  {Math.min(currentPage * pageSize, filteredCandidates.length)} of {filteredCandidates.length} candidate accounts
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        setPageSize(Number(v))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-8 w-16 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 2: CSV BULK UPLOAD ================= */}
        <TabsContent value="csv" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UploadCloud className="h-5 w-5 text-primary" />
                CSV Bulk Customer-Parent Mapping
              </CardTitle>
              <CardDescription>
                Paste CSV content or upload a CSV file with pairs of Child Account identifiers and Parent Account identifiers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-xs space-y-2">
                <div className="font-semibold text-foreground">Expected CSV Format:</div>
                <div className="font-mono bg-background p-2 rounded border">
                  child_identifier, parent_identifier<br />
                  CUST-10492, PAR-0001<br />
                  melbourne@acme.com, PAR-0001<br />
                  "7-Eleven Parramatta", "7-Eleven HQ"
                </div>
                <p className="text-muted-foreground">
                  Identifiers can be Account ID, ProspectPlus ID, Company Name, or Account Email.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">CSV Content / Text Input</label>
                <textarea
                  rows={6}
                  placeholder={`child_identifier,parent_identifier\nmelbourne@acme.com,PAR-0001\nsydney@acme.com,PAR-0001`}
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  className="w-full rounded-md border p-3 text-xs font-mono bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCsvRawText('')
                    setCsvValidations([])
                  }}
                  disabled={!csvRawText}
                  size="sm"
                >
                  Clear CSV
                </Button>

                <Button
                  onClick={handleParseCsv}
                  disabled={!csvRawText.trim()}
                  size="sm"
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Parse & Validate CSV
                </Button>
              </div>

              {/* Validation Results Grid */}
              {csvValidations.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-foreground">
                      Pre-Flight Validation Staging ({csvValidations.length} Rows)
                    </div>
                    <Button
                      onClick={handleExecuteCsv}
                      disabled={isSubmitting || csvValidations.filter((v) => v.status === 'valid' || v.status === 'conflict').length === 0}
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isSubmitting ? (
                        <Loader />
                      ) : (
                        <>
                          <Link2 className="h-4 w-4" />
                          Execute Valid CSV Mappings ({csvValidations.filter((v) => v.status === 'valid' || v.status === 'conflict').length})
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="w-16">Row #</TableHead>
                          <TableHead>Child Input</TableHead>
                          <TableHead>Parent Input</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Validation Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvValidations.map((v) => (
                          <TableRow key={v.rowNumber}>
                            <TableCell className="font-mono text-xs">{v.rowNumber}</TableCell>
                            <TableCell className="text-xs font-medium">{v.childInput}</TableCell>
                            <TableCell className="text-xs font-medium">{v.parentInput}</TableCell>
                            <TableCell>
                              {v.status === 'valid' ? (
                                <Badge className="bg-emerald-600 text-white text-xs">Ready</Badge>
                              ) : v.status === 'conflict' ? (
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">Reassigning</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">Error</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{v.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'link' ? (
                <>
                  <Link2 className="h-5 w-5 text-primary" />
                  Confirm Mass Link Operation
                </>
              ) : (
                <>
                  <Unlink className="h-5 w-5 text-destructive" />
                  Confirm Mass Unlink Operation
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'link' ? (
                <>
                  You are about to link <strong>{selectedChildIds.size} customer accounts</strong> under Parent Account:{' '}
                  <span className="font-semibold text-foreground">{selectedParent?.companyName || (selectedParent as any)?.company_name}</span>.
                </>
              ) : (
                <>
                  You are about to unlink <strong>{selectedChildIds.size} customer accounts</strong> from their parent accounts.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {actionType === 'link' && conflictingChildren.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Existing Parent Reassignment Notice:
              </div>
              <p>
                {conflictingChildren.length} of the selected accounts are currently linked to another parent and will be reassigned to{' '}
                <strong>{selectedParent?.companyName}</strong>.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteAction}
              disabled={isSubmitting}
              className={actionType === 'unlink' ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}
            >
              {isSubmitting ? (
                <Loader />
              ) : actionType === 'link' ? (
                `Execute Mass Link (${selectedChildIds.size})`
              ) : (
                `Execute Mass Unlink (${selectedChildIds.size})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
