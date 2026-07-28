'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { firestore } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Star, TrendingDown, TrendingUp, Minus, Download, FileText, ExternalLink, RefreshCw, Phone, PhoneCall, Mail } from 'lucide-react'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getQuickDateRange } from '@/lib/utils'
import Link from 'next/link'
import { LogNoteDialog } from '@/components/log-note-dialog'
import type { Note } from '@/lib/types'
import { usePerformance } from '@/hooks/use-performance'
import { useAuth } from '@/hooks/use-auth'
import { logCsCallActivity } from '@/services/firebase'

interface PackageRecord {
  code: string;
  order_number: string;
  sync_date: string;
  scans: {
    scan_type: string;
    courier: string;
    updated_at: string;
    customer_ns_id?: string;
    delivery_speed?: string;
  }[];
}

interface CustomerStats {
  id: string;
  prospectPlusId?: string;
  companyId?: string;
  type?: 'companies' | 'leads';
  name: string;
  franchisee: string;
  contactName?: string;
  phone?: string;
  email?: string;
  csCalled?: boolean;
  csCallCount?: number;
  lastContactedDate?: string | null;
  allTimeBarcodes: number;
  currentWeekScans: number;
  currentMonthScans: number;
  weeklyAverage: number;
  monthlyAverage: number;
  deliverySpeeds: Record<string, number>;
  lastScanDate: string | Date | null;
  lastContact?: {
    date: string | null;
    type: string | null;
    author: string | null;
    notes: string | null;
  } | null;
}

const parseDateString = (dateStr: string) => {
  if (!dateStr) return new Date(NaN);
  if (typeof dateStr !== 'string') return new Date(dateStr);
  
  if (dateStr.match(/^\d{2}-\d{2}-\d{4}/)) {
    const [dd, mm, yyyy] = dateStr.split('T')[0].split(' ')[0].split('-');
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  }
  
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
    const [dd, mm, yyyy] = dateStr.split(' ')[0].split('/');
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  }

  return new Date(dateStr);
}

const getFormattedDateDDMMYYYY = (date: Date | null) => {
  if (!date || isNaN(date.getTime())) return 'N/A';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const getUsageStatus = (current: number, average: number) => {
  if (average === 0 && current > 0) return 'above';
  if (average === 0 && current === 0) return 'similar';
  
  const ratio = current / average;
  if (ratio < 0.9) return 'below';
  if (ratio > 1.1) return 'above';
  return 'similar';
}

const UsageBadge = ({ current, average }: { current: number, average: number }) => {
  const status = getUsageStatus(current, average);
  const diff = current - average;
  const pct = average > 0 ? Math.round((diff / average) * 100) : (current > 0 ? 100 : 0);

  if (status === 'below') {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1 w-max">
        <TrendingDown className="h-3 w-3" />
        {diff > 0 ? '+' : ''}{Math.round(diff)} ({pct}%)
      </Badge>
    );
  }
  if (status === 'above') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1 w-max">
        <TrendingUp className="h-3 w-3" />
        {diff > 0 ? '+' : ''}{Math.round(diff)} ({pct > 0 ? '+' : ''}{pct}%)
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1 w-max">
      <Minus className="h-3 w-3" />
      {diff > 0 ? '+' : ''}{Math.round(diff)} ({pct > 0 ? '+' : ''}{pct}%)
    </Badge>
  );
}

export function TopUsersClient() {
  const { userProfile } = useAuth();
  const loggedInCsName = userProfile?.displayName || userProfile?.name || userProfile?.email || 'CS Agent';

  const [loading, setLoading] = useState(true)
  const [topUsers, setTopUsers] = useState<CustomerStats[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterColorCode, setFilterColorCode] = useState('all')
  const [selectedFranchise, setSelectedFranchise] = useState<string[]>([])
  const [filterDateRange, setFilterDateRange] = useState('prev_and_this_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [sortBy, setSortBy] = useState('rank')
  const [timeframeMode, setTimeframeMode] = useState<'weekly' | 'monthly'>('weekly')
  const [selectedCustomerForNote, setSelectedCustomerForNote] = useState<{ id: string; companyName: string; type: 'companies' | 'leads' } | null>(null)

  // Call dialog state
  const [selectedCustomerForCall, setSelectedCustomerForCall] = useState<{ stat: CustomerStats } | null>(null)
  const [callOutcome, setCallOutcome] = useState('Call Back/Follow-up')
  const [callNotes, setCallNotes] = useState('')
  const [submittingCall, setSubmittingCall] = useState(false)

  const { setLoadTime, setPageName, setIsCustom } = usePerformance()

  useEffect(() => {
    setIsCustom(true);
    setPageName("Top Barcode Users");
  }, [setIsCustom, setPageName]);

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | null>(null)

  const fetchData = async (forceRefresh = false) => {
    const startTimePerf = performance.now()
    try {
      setLoading(true)
      if (forceRefresh) setIsRefreshing(true)
      let startStr = ''
      let endStr = ''
      
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      
      let startDate = new Date(0)
      let endDate = new Date(today)

      if (filterDateRange && filterDateRange !== 'all' && filterDateRange !== 'custom') {
        const range = getQuickDateRange(filterDateRange === 'last_7' ? 'last7' : (filterDateRange === 'last_30' ? 'last30' : filterDateRange))
        startDate = range.from
        endDate = range.to
      } else if (filterDateRange === 'custom') {
        if (customStartDate) {
          startDate = new Date(customStartDate)
          startDate.setHours(0, 0, 0, 0)
        }
        if (customEndDate) {
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
        }
      }

      if (startDate.getTime() !== new Date(0).getTime()) {
        startStr = startDate.toISOString()
      }
      endStr = endDate.toISOString()

      const url = `/api/scans/top-users?startDate=${encodeURIComponent(startStr)}&endDate=${encodeURIComponent(endStr)}&range=${encodeURIComponent(filterDateRange)}${forceRefresh ? '&refresh=true' : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('API request failed')
      const data = await res.json()
      
      setTopUsers(data.customers || [])
      if (data.cachedAt) {
        setCachedAt(data.cachedAt)
      }
    } catch (error) {
      console.error("Error fetching top users report data:", error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
      setLoadTime(Math.round(performance.now() - startTimePerf))
    }
  }

  useEffect(() => {
    fetchData()
  }, [filterDateRange, customStartDate, customEndDate])

  const handleSaveCallOutcome = async () => {
    if (!selectedCustomerForCall || !selectedCustomerForCall.stat.companyId) return;
    setSubmittingCall(true);
    const stat = selectedCustomerForCall.stat;
    const companyId = stat.companyId;
    if (!companyId) return;
    try {
      await logCsCallActivity(
        companyId,
        {
          outcome: callOutcome,
          notes: callNotes,
          author: loggedInCsName || 'CS Agent',
          salesRecordInternalId: stat.id
        },
        stat.type || 'companies'
      );

      const nowStr = new Date().toISOString();
      setTopUsers(prev => prev.map(u => {
        if (u.id === stat.id) {
          return {
            ...u,
            csCalled: true,
            csCallCount: (u.csCallCount || 0) + 1,
            lastContactedDate: nowStr,
            lastContact: {
              date: nowStr,
              type: 'Update',
              author: loggedInCsName || 'CS Agent',
              notes: `[CS Outcome] ${callOutcome}. Notes: ${callNotes || 'N/A'}`
            }
          };
        }
        return u;
      }));

      setSelectedCustomerForCall(null);
      setCallNotes('');
      setCallOutcome('Call Back/Follow-up');
    } catch (err) {
      console.error("Failed to save CS call activity:", err);
    } finally {
      setSubmittingCall(false);
    }
  };

  const uniqueFranchisees = useMemo(() => {
    const franchisees = Array.from(new Set(topUsers.map(c => c.franchisee).filter(Boolean)))
    return franchisees.map(f => ({ label: f as string, value: f as string })).sort((a, b) => a.label.localeCompare(b.label))
  }, [topUsers])

  const filteredStats = useMemo(() => {
    let result = topUsers.filter(stat => {
      // Search term
      if (searchTerm && !stat.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !stat.franchisee.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !stat.id.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(stat.prospectPlusId && stat.prospectPlusId.toLowerCase().includes(searchTerm.toLowerCase())) &&
          !(stat.contactName && stat.contactName.toLowerCase().includes(searchTerm.toLowerCase())) &&
          !(stat.phone && stat.phone.toLowerCase().includes(searchTerm.toLowerCase())) &&
          !(stat.email && stat.email.toLowerCase().includes(searchTerm.toLowerCase()))) {
        return false
      }

      // Franchisee
      if (selectedFranchise.length > 0 && !selectedFranchise.includes(stat.franchisee)) {
        return false
      }

      // Color Code / Status
      const status = timeframeMode === 'weekly' 
        ? getUsageStatus(stat.currentWeekScans, stat.weeklyAverage)
        : getUsageStatus(stat.currentMonthScans, stat.monthlyAverage)
      if (filterColorCode !== 'all' && filterColorCode !== status) {
        return false
      }

      return true
    })

    // Sort
    if (sortBy === 'color_red') {
      result.sort((a, b) => {
        const statusA = timeframeMode === 'weekly' ? getUsageStatus(a.currentWeekScans, a.weeklyAverage) : getUsageStatus(a.currentMonthScans, a.monthlyAverage)
        const statusB = timeframeMode === 'weekly' ? getUsageStatus(b.currentWeekScans, b.weeklyAverage) : getUsageStatus(b.currentMonthScans, b.monthlyAverage)
        const valMap = { below: 1, similar: 2, above: 3 }
        return valMap[statusA as keyof typeof valMap] - valMap[statusB as keyof typeof valMap]
      })
    } else if (sortBy === 'color_green') {
      result.sort((a, b) => {
        const statusA = timeframeMode === 'weekly' ? getUsageStatus(a.currentWeekScans, a.weeklyAverage) : getUsageStatus(a.currentMonthScans, a.monthlyAverage)
        const statusB = timeframeMode === 'weekly' ? getUsageStatus(b.currentWeekScans, b.weeklyAverage) : getUsageStatus(b.currentMonthScans, b.monthlyAverage)
        const valMap = { above: 1, similar: 2, below: 3 }
        return valMap[statusA as keyof typeof valMap] - valMap[statusB as keyof typeof valMap]
      })
    }

    return result
  }, [topUsers, searchTerm, selectedFranchise, filterColorCode, sortBy, timeframeMode])

  const handleExportCSV = () => {
    const headers = [
      'Rank',
      'Customer Name',
      'Prospect+ ID',
      'Customer NS ID',
      'Franchise',
      'Contact Person',
      'Phone',
      'Email',
      'CS Called',
      'CS Call Count',
      'Last Contacted Date',
      'Total Barcodes (Period)',
      'Last Scan Date',
      'Weekly Avg',
      'Last 7 Days',
      'Weekly Drop-off Status',
      'Monthly Avg',
      'Last 30 Days',
      'Monthly Drop-off Status'
    ]

    const rows = filteredStats.map((stat, idx) => {
      const wStatus = getUsageStatus(stat.currentWeekScans, stat.weeklyAverage)
      const mStatus = getUsageStatus(stat.currentMonthScans, stat.monthlyAverage)
      
      return [
        idx + 1,
        `"${stat.name.replace(/"/g, '""')}"`,
        `"${(stat.prospectPlusId || stat.companyId || stat.id).replace(/"/g, '""')}"`,
        `"${stat.id.replace(/"/g, '""')}"`,
        `"${stat.franchisee.replace(/"/g, '""')}"`,
        `"${(stat.contactName || '').replace(/"/g, '""')}"`,
        `"${(stat.phone || '').replace(/"/g, '""')}"`,
        `"${(stat.email || '').replace(/"/g, '""')}"`,
        stat.csCalled ? 'Yes' : 'No',
        stat.csCallCount || 0,
        stat.lastContactedDate ? getFormattedDateDDMMYYYY(new Date(stat.lastContactedDate)) : 'N/A',
        stat.allTimeBarcodes,
        getFormattedDateDDMMYYYY(stat.lastScanDate ? new Date(stat.lastScanDate) : null),
        Math.round(stat.weeklyAverage),
        stat.currentWeekScans,
        wStatus,
        Math.round(stat.monthlyAverage),
        stat.currentMonthScans,
        mStatus
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `top_users_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Calculate specific date labels for table headers
  const today = new Date()

  const last7Start = new Date(today)
  last7Start.setDate(today.getDate() - 7)
  const last7DaysLabel = `${last7Start.getDate()}/${last7Start.getMonth()+1} - ${today.getDate()}/${today.getMonth()+1}`

  const last30Start = new Date(today)
  last30Start.setDate(today.getDate() - 30)
  const last30DaysLabel = `${last30Start.getDate()}/${last30Start.getMonth()+1} - ${today.getDate()}/${today.getMonth()+1}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
            Top 100 Barcode Users
          </h1>
          <p className="text-muted-foreground mt-1">Analytics identifying drop-offs in usage for your top customers.</p>
        </div>
        <div className="flex items-center gap-3">
          {cachedAt && (
            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 rounded-full px-3 py-1 font-medium">
              Data Updated: {new Date(cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(cachedAt).toLocaleDateString()})
            </span>
          )}
          <Button 
            onClick={() => fetchData(true)} 
            disabled={isRefreshing}
            variant="outline" 
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader id="step-top-filters" className="pb-3 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Top Signed Customers</CardTitle>
            <CardDescription>
              Ranked by scan volume within the selected period. Color coding compares current vs historical performance relative to the end date.
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div> Below Average (&lt;90%)</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></div> Similar (90% - 110%)</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div> Above Average (&gt;110%)</span>
              </div>
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="w-40">
              <Select value={timeframeMode} onValueChange={(val: 'weekly' | 'monthly') => setTimeframeMode(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Mode: Weekly</SelectItem>
                  <SelectItem value="monthly">Mode: Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rank">Sort: Rank (Barcodes)</SelectItem>
                  <SelectItem value="color_red">Sort: Color (Red First)</SelectItem>
                  <SelectItem value="color_green">Sort: Color (Green First)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select value={filterColorCode} onValueChange={setFilterColorCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Color Code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Filter: All Colors</SelectItem>
                  <SelectItem value="below">Red (Below Avg)</SelectItem>
                  <SelectItem value="similar">Orange (Similar)</SelectItem>
                  <SelectItem value="above">Green (Above Avg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <MultiSelectCombobox 
                options={uniqueFranchisees} 
                selected={selectedFranchise} 
                onSelectedChange={setSelectedFranchise} 
                placeholder="Filter Franchise..." 
              />
            </div>
            <div className="w-40">
              <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Scan Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prev_and_this_month">Prev & This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_7">Last 7 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_30">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filterDateRange === 'custom' && (
              <>
                <div className="w-40">
                  <Input 
                    type="date" 
                    value={customStartDate} 
                    onChange={e => setCustomStartDate(e.target.value)} 
                    title="Start Date"
                  />
                </div>
                <div className="w-40">
                  <Input 
                    type="date" 
                    value={customEndDate} 
                    onChange={e => setCustomEndDate(e.target.value)} 
                    title="End Date"
                  />
                </div>
              </>
            )}
            <div className="w-48">
              <Input 
                placeholder="Search..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent id="step-top-table">
          {loading && <div className="text-xs text-muted-foreground mb-2 animate-pulse">Updating...</div>}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-12 text-center">Rank</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Prospect+ ID</TableHead>
                  <TableHead>Franchise</TableHead>
                  <TableHead>Contact Details</TableHead>
                  <TableHead>Call Tracker</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Total Barcodes<br/><span className="text-xs text-muted-foreground font-normal">(In Period)</span></TableHead>
                  <TableHead>Last Scan Date</TableHead>
                  <TableHead>Delivery Speeds</TableHead>
                  <TableHead className="text-right">Weekly Avg</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Last 7 Days<br/>
                    <span className="text-xs text-muted-foreground font-normal">({last7DaysLabel})</span>
                  </TableHead>
                  <TableHead>Weekly Drop-off</TableHead>
                  <TableHead className="text-right">Monthly Avg</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Last 30 Days<br/>
                    <span className="text-xs text-muted-foreground font-normal">({last30DaysLabel})</span>
                  </TableHead>
                  <TableHead>Monthly Drop-off</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStats.map((stat, idx) => {
                  const status = timeframeMode === 'weekly' 
                    ? getUsageStatus(stat.currentWeekScans, stat.weeklyAverage)
                    : getUsageStatus(stat.currentMonthScans, stat.monthlyAverage);
                  
                  let rowClass = "";
                  if (status === 'below') rowClass = "bg-red-50/40 hover:bg-red-50";
                  else if (status === 'above') rowClass = "bg-green-50/40 hover:bg-green-50";
                  else rowClass = "bg-orange-50/40 hover:bg-orange-50";

                  return (
                    <TableRow key={stat.id} className={rowClass}>
                      <TableCell className="text-center font-medium text-slate-500">#{idx + 1}</TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-1.5">
                          {stat.companyId ? (
                            <Link 
                              href={`/${stat.type}/${stat.companyId}`} 
                              target="_blank" 
                              className="text-indigo-600 hover:underline flex items-center gap-1 group"
                            >
                              {stat.name}
                              <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          ) : (
                            <span className="text-slate-700">{stat.name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs">{stat.prospectPlusId || stat.companyId || stat.id}</TableCell>
                      <TableCell className="text-slate-500">{stat.franchisee}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs gap-1 text-slate-600">
                          <span className="font-semibold text-slate-800">{stat.contactName || 'No Contact'}</span>
                          {stat.phone && (
                            <a 
                              href={`tel:${stat.phone}`}
                              className="flex items-center gap-1.5 hover:text-[#095c7b] cursor-pointer group w-fit"
                              title="Call Phone Number"
                            >
                              <Phone className="h-3 w-3 text-slate-400 group-hover:text-[#095c7b] shrink-0" />
                              <span>{stat.phone}</span>
                            </a>
                          )}
                          {stat.email && (
                            <a 
                              href={`mailto:${stat.email}`}
                              className="flex items-center gap-1.5 hover:text-[#095c7b] cursor-pointer group w-fit max-w-[180px]"
                              title="Send Email"
                            >
                              <Mail className="h-3 w-3 text-slate-400 group-hover:text-[#095c7b] shrink-0" />
                              <span className="truncate">{stat.email}</span>
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {stat.csCalled ? (
                            <Badge className="bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1 w-max">
                              ✓ Called {stat.csCallCount ? `(${stat.csCallCount}x)` : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-semibold w-max">
                              Pending Call
                            </Badge>
                          )}
                          {stat.lastContactedDate && (
                            <span className="text-[10px] text-slate-400 block">
                              {getFormattedDateDDMMYYYY(new Date(stat.lastContactedDate))}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">{stat.allTimeBarcodes.toLocaleString()}</TableCell>
                      
                      <TableCell className="text-slate-500 whitespace-nowrap text-[13px]">{getFormattedDateDDMMYYYY(stat.lastScanDate ? new Date(stat.lastScanDate) : null)}</TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-[11px] text-slate-500 w-32">
                          {Object.entries(stat.deliverySpeeds).map(([speed, count]) => (
                            <div key={speed} className="flex justify-between items-center">
                              <span className="truncate pr-2" title={speed}>{speed}:</span>
                              <span className="font-medium text-slate-700">{count}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">{Math.round(stat.weeklyAverage)}</TableCell>
                      <TableCell className="text-right font-medium">{stat.currentWeekScans}</TableCell>
                      <TableCell>
                        <UsageBadge current={stat.currentWeekScans} average={stat.weeklyAverage} />
                      </TableCell>
                      
                      <TableCell className="text-right">{Math.round(stat.monthlyAverage)}</TableCell>
                      <TableCell className="text-right font-medium">{stat.currentMonthScans}</TableCell>
                      <TableCell>
                        <UsageBadge current={stat.currentMonthScans} average={stat.monthlyAverage} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {stat.companyId && (
                            <>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 rounded-full border-[#095c7b]/20 text-[#095c7b] hover:bg-slate-100"
                                onClick={() => setSelectedCustomerForCall({ stat })}
                                title="Mark Called"
                              >
                                <PhoneCall className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 rounded-full border-[#095c7b]/20 text-[#095c7b] hover:bg-slate-100"
                                onClick={() => setSelectedCustomerForNote({ id: stat.companyId!, companyName: stat.name, type: stat.type! })}
                                title="View Notes & Activities"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={16} className="h-24 text-center text-muted-foreground">
                      No top users found matching search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {selectedCustomerForNote && (
        <LogNoteDialog
          lead={{ id: selectedCustomerForNote.id, companyName: selectedCustomerForNote.companyName, type: selectedCustomerForNote.type } as any}
          isOpen={!!selectedCustomerForNote}
          onOpenChange={(open) => {
            if (!open) setSelectedCustomerForNote(null)
          }}
          onNoteLogged={(newNote) => {
            setSelectedCustomerForNote(null)
            fetchData()
          }}
        />
      )}

      {selectedCustomerForCall && (
        <Dialog open={!!selectedCustomerForCall} onOpenChange={(open) => !open && setSelectedCustomerForCall(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#095c7b]">
                <PhoneCall className="h-5 w-5 text-[#095c7b]" />
                Log CS Call & Outcome
              </DialogTitle>
              <DialogDescription>
                Record a call outcome for <strong>{selectedCustomerForCall?.stat.name}</strong>. This logs activity without changing company status.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Call Outcome</Label>
                <Select value={callOutcome} onValueChange={setCallOutcome}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spoken to Customer">Spoken to Customer</SelectItem>
                    <SelectItem value="Call Back/Follow-up">Call Back/Follow-up</SelectItem>
                    <SelectItem value="Left Voicemail">Left Voicemail</SelectItem>
                    <SelectItem value="Meeting Scheduled">Meeting Scheduled</SelectItem>
                    <SelectItem value="Account Review Requested">Account Review Requested</SelectItem>
                    <SelectItem value="No Answer">No Answer</SelectItem>
                    <SelectItem value="Issue Escalated">Issue Escalated</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Call Notes & Details</Label>
                <Textarea
                  placeholder="Enter notes from the call..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  className="min-h-[100px] text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCustomerForCall(null)} disabled={submittingCall}>
                Cancel
              </Button>
              <Button onClick={handleSaveCallOutcome} disabled={submittingCall} className="bg-[#095c7b] hover:bg-[#074760] text-white">
                {submittingCall ? 'Saving...' : 'Save Call Activity'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
