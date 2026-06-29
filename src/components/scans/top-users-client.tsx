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
import { Star, TrendingDown, TrendingUp, Minus, Download, FileText, ExternalLink } from 'lucide-react'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getQuickDateRange } from '@/lib/utils'
import Link from 'next/link'
import { LogNoteDialog } from '@/components/log-note-dialog'
import type { Note } from '@/lib/types'

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
  companyId?: string;
  type?: 'companies' | 'leads';
  name: string;
  franchisee: string;
  allTimeBarcodes: number;
  currentWeekScans: number;
  currentMonthScans: number;
  weeklyAverage: number;
  monthlyAverage: number;
  deliverySpeeds: Record<string, number>;
  lastScanDate: string | Date | null;
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
  const [loading, setLoading] = useState(true)
  const [topUsers, setTopUsers] = useState<CustomerStats[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterColorCode, setFilterColorCode] = useState('all')
  const [selectedFranchise, setSelectedFranchise] = useState<string[]>([])
  const [filterDateRange, setFilterDateRange] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [sortBy, setSortBy] = useState('rank')
  const [timeframeMode, setTimeframeMode] = useState<'weekly' | 'monthly'>('weekly')
  const [selectedCustomerForNote, setSelectedCustomerForNote] = useState<{ id: string; companyName: string; type: 'companies' | 'leads' } | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
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

      const url = `/api/scans/top-users?startDate=${encodeURIComponent(startStr)}&endDate=${encodeURIComponent(endStr)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('API request failed')
      const data = await res.json()
      
      setTopUsers(data.customers || [])
    } catch (error) {
      console.error("Error fetching top users report data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filterDateRange, customStartDate, customEndDate])

  const uniqueFranchisees = useMemo(() => {
    const franchisees = Array.from(new Set(topUsers.map(c => c.franchisee).filter(Boolean)))
    return franchisees.map(f => ({ label: f as string, value: f as string })).sort((a, b) => a.label.localeCompare(b.label))
  }, [topUsers])

  const filteredStats = useMemo(() => {
    let result = topUsers.filter(stat => {
      // Search term
      if (searchTerm && !stat.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !stat.franchisee.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !stat.id.toLowerCase().includes(searchTerm.toLowerCase())) {
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

    if (sortBy === 'color_red') {
      const order = { 'below': 0, 'similar': 1, 'above': 2 }
      result.sort((a, b) => {
        const aStatus = timeframeMode === 'weekly' ? getUsageStatus(a.currentWeekScans, a.weeklyAverage) : getUsageStatus(a.currentMonthScans, a.monthlyAverage)
        const bStatus = timeframeMode === 'weekly' ? getUsageStatus(b.currentWeekScans, b.weeklyAverage) : getUsageStatus(b.currentMonthScans, b.monthlyAverage)
        if (order[aStatus] !== order[bStatus]) return order[aStatus] - order[bStatus]
        return b.allTimeBarcodes - a.allTimeBarcodes
      })
    } else if (sortBy === 'color_green') {
      const order = { 'above': 0, 'similar': 1, 'below': 2 }
      result.sort((a, b) => {
        const aStatus = timeframeMode === 'weekly' ? getUsageStatus(a.currentWeekScans, a.weeklyAverage) : getUsageStatus(a.currentMonthScans, a.monthlyAverage)
        const bStatus = timeframeMode === 'weekly' ? getUsageStatus(b.currentWeekScans, b.weeklyAverage) : getUsageStatus(b.currentMonthScans, b.monthlyAverage)
        if (order[aStatus] !== order[bStatus]) return order[aStatus] - order[bStatus]
        return b.allTimeBarcodes - a.allTimeBarcodes
      })
    }

    return result
  }, [topUsers, searchTerm, selectedFranchise, filterColorCode, sortBy, timeframeMode])

  const { last7DaysLabel, last30DaysLabel } = useMemo(() => {
    const formatStr = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      return `${dd}/${mm}`
    }
    
    let endDate = new Date()
    if (filterDateRange === 'today') {
      endDate = new Date()
    } else if (filterDateRange === 'yesterday') {
      endDate = new Date()
      endDate.setDate(endDate.getDate() - 1)
      endDate.setHours(23, 59, 59, 999)
    } else if (filterDateRange === 'last_7') {
      endDate = new Date()
    } else if (filterDateRange === 'last_30') {
      endDate = new Date()
    } else if (filterDateRange === 'this_week') {
      endDate = new Date()
    } else if (filterDateRange === 'this_month') {
      endDate = new Date()
    } else if (filterDateRange === 'last_month') {
      endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0, 23, 59, 59, 999)
    } else if (filterDateRange === 'custom' && customEndDate) {
      endDate = new Date(customEndDate)
      endDate.setHours(23, 59, 59, 999)
    }

    const wStart = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    const mStart = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    return {
      last7DaysLabel: `${formatStr(wStart)} - ${formatStr(endDate)}`,
      last30DaysLabel: `${formatStr(mStart)} - ${formatStr(endDate)}`
    }
  }, [filterDateRange, customEndDate])

  const handleExportCSV = () => {
    const headers = [
      'Rank', 'Customer Name', 'Customer NS ID', 'Franchise', 'Total Barcodes', 'Last Scan Date',
      'Delivery Speeds Breakdown',
      'Weekly Average', 'Last 7 Days', 'Monthly Average', 'Last 30 Days'
    ]

    const rows = filteredStats.map((stat, idx) => {
      const speedsStr = Object.entries(stat.deliverySpeeds)
        .map(([speed, count]) => `${speed}: ${count}`)
        .join(' | ')

      return [
        idx + 1,
        `"${stat.name.replace(/"/g, '""')}"`,
        `"${stat.id}"`,
        `"${stat.franchisee.replace(/"/g, '""')}"`,
        stat.allTimeBarcodes,
        `"${getFormattedDateDDMMYYYY(stat.lastScanDate ? new Date(stat.lastScanDate) : null)}"`,
        `"${speedsStr}"`,
        Math.round(stat.weeklyAverage),
        stat.currentWeekScans,
        Math.round(stat.monthlyAverage),
        stat.currentMonthScans
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `top_users_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading && topUsers.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <Loader />
        <p className="text-muted-foreground text-sm">Aggregating Top User Reports...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
            Top 100 Barcode Users
          </h1>
          <p className="text-muted-foreground mt-1">Analytics identifying drop-offs in usage for your top customers.</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
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
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Customer NS ID</TableHead>
                  <TableHead>Franchise</TableHead>
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
                            <>
                              <Link 
                                href={`/${stat.type}/${stat.companyId}`} 
                                target="_blank" 
                                className="text-indigo-600 hover:underline flex items-center gap-1 group"
                              >
                                {stat.name}
                                <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                                onClick={() => setSelectedCustomerForNote({ id: stat.companyId!, companyName: stat.name, type: stat.type! })}
                                title="Add note for customer"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-slate-700">{stat.name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{stat.id}</TableCell>
                      <TableCell className="text-slate-500">{stat.franchisee}</TableCell>
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
                    </TableRow>
                  )
                })}
                {filteredStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">
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
    </div>
  )
}
