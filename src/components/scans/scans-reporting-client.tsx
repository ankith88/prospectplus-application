'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { firestore } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Package, Scan, Users, Building, AlertTriangle, Clock, CheckCircle, MapPin, TrendingDown, TrendingUp, UserPlus, UserMinus, Activity, RefreshCw, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from '@/components/ui/switch'
import Link from 'next/link'
import { getQuickDateRange } from '@/lib/utils'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

const SectionHelp = ({ content }: { content: React.ReactNode }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button 
        type="button" 
        className="inline-flex items-center justify-center rounded-full w-4.5 h-4.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-80 p-4 text-xs space-y-2 shadow-lg border bg-popover text-popover-foreground z-50 leading-relaxed font-normal" onClick={(e) => e.stopPropagation()}>
      {content}
    </PopoverContent>
  </Popover>
);

interface ScanRecord {
  id: number;
  scan_type: string;
  courier: string;
  updated_at: string;
  customer_ns_id?: string;
  delivery_speed?: string;
  product_type?: string;
  depot_id?: string;
}

interface PackageRecord {
  code: string;
  order_number: string;
  sync_date: string;
  scans: ScanRecord[];
  real_time_status?: {
    status: string;
    last_location?: string;
    estimated_delivery_date?: string;
    updated_at: string;
  };
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];


const AU_HOLIDAYS = [
  '2024-01-01', '2024-01-26', '2024-03-29', '2024-04-01', '2024-04-25', '2024-06-10', '2024-12-25', '2024-12-26',
  '2025-01-01', '2025-01-27', '2025-04-18', '2025-04-21', '2025-04-25', '2025-06-09', '2025-12-25', '2025-12-26',
  '2026-01-01', '2026-01-26', '2026-04-03', '2026-04-06', '2026-04-25', '2026-06-08', '2026-12-25', '2026-12-28',
  '2027-01-01', '2027-01-26', '2027-03-26', '2027-03-29', '2027-04-25', '2027-06-14', '2027-12-25', '2027-12-28'
];

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

const toYMD = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (!date || isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const getFormattedDateDDMMYYYY = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  const d = parseDateString(dateString);
  if (isNaN(d.getTime())) return 'Unknown';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy}`;
};

const addWorkingDays = (startDate: Date | string, days: number) => {
  let date = typeof startDate === 'string' ? parseDateString(startDate) : new Date(startDate);
  if (isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  let count = 0;
  while (count < days) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      if (!AU_HOLIDAYS.includes(toYMD(date))) {
        count++;
      }
    }
  }
  return date;
}

const getLocalIsoDate = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  const d = parseDateString(dateString);
  if (isNaN(d.getTime())) return 'Unknown';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getSortableTime = (str: string) => {
  if (!str) return 0;
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d.getTime();
  const match = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})(?:[ T](\d{2}:\d{2}:\d{2}))?/);
  if (match) {
    d = new Date(`${match[3]}-${match[2]}-${match[1]}T${match[4] || '00:00:00'}`);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return 0;
};

const normalizeStatus = (status: string) => {
  if (!status) return 'Unknown';
  const lower = status.toLowerCase();
  
  if (lower.includes('in transit') || lower.includes('in_transit')) {
    return 'In Transit';
  }
  
  if (lower.includes('awaiting collection') || lower.includes('collection at') || lower.includes('ready for collection')) {
    return 'Awaiting Collection';
  }
  
  if (lower.includes('delivered') || lower.includes('collected')) {
    return 'Delivered / Collected';
  }
  
  if (lower.includes('onboard for delivery') || lower.includes('out for delivery')) {
    return 'Out for Delivery';
  }
  
  if (lower.includes('arrived at depot') || lower.includes('at depot') || lower.includes('facility')) {
    return 'At Facility / Depot';
  }
  
  if (lower.includes('exception') || lower.includes('delay') || lower.includes('lost') || lower.includes('alert') || lower.includes('attempt') || lower.includes('futile')) {
    return 'Exception / Delayed';
  }
  
  // Clean up any remaining underscores
  return status.replace(/_/g, ' ');
};

const getPeriods = (filterDateRange: string, customStartDate: string, customEndDate: string) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let currentStart = new Date(todayStart);
  let currentEnd = new Date(today);
  let prevStart = new Date(todayStart);
  let prevEnd = new Date(today);

  if (filterDateRange && filterDateRange !== 'all' && filterDateRange !== 'custom') {
    const helperParam = filterDateRange === 'last_7' ? 'last7' : (filterDateRange === 'last_30' ? 'last30' : filterDateRange);
    const range = getQuickDateRange(helperParam);
    currentStart = range.from;
    currentEnd = range.to;
    
    const diffTime = currentEnd.getTime() - currentStart.getTime();
    prevEnd = new Date(currentStart.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - diffTime);
  } else if (filterDateRange === 'custom') {
    if (customStartDate) {
      currentStart = new Date(customStartDate);
      currentStart.setHours(0,0,0,0);
    } else {
      currentStart = new Date(0);
    }
    if (customEndDate) {
      currentEnd = new Date(customEndDate);
      currentEnd.setHours(23,59,59,999);
    }
    const diffTime = currentEnd.getTime() - currentStart.getTime();
    prevEnd = new Date(currentStart.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - diffTime);
  } else { // 'all'
    currentStart = new Date(0);
    prevStart = new Date(0);
    prevEnd = new Date(0);
  }

  return { currentStart, currentEnd, prevStart, prevEnd };
}

export function ScansReportingClient({
  hideFilters = false,
  hideExtraCharts = false,
  externalDateRange
}: {
  hideFilters?: boolean;
  hideExtraCharts?: boolean;
  externalDateRange?: { from?: Date; to?: Date };
} = {}) {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<{
    metrics: any;
    filtersOptions: {
      uniqueScanTypes: {label: string, value: string}[];
      uniqueCouriers: {label: string, value: string}[];
      uniqueSpeeds: {label: string, value: string}[];
      uniqueFranchisees: {label: string, value: string}[];
    }
  } | null>(null)

  // Filters State
  const [filterBarcode, setFilterBarcode] = useState('')
  const [filterConnoteNumber, setFilterConnoteNumber] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterUnlinked, setFilterUnlinked] = useState(false)
  const [filterDateRange, setFilterDateRange] = useState('this_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedSpeed, setSelectedSpeed] = useState<string[]>([])
  const [selectedScanType, setSelectedScanType] = useState<string[]>([])
  const [selectedCourier, setSelectedCourier] = useState<string[]>([])
  const [selectedFranchise, setSelectedFranchise] = useState<string[]>([])

  const [debouncedBarcode, setDebouncedBarcode] = useState('')
  const [debouncedConnoteNumber, setDebouncedConnoteNumber] = useState('')
  const [debouncedCustomer, setDebouncedCustomer] = useState('')

  useEffect(() => {
    if (externalDateRange) {
      setFilterDateRange(externalDateRange.from ? 'custom' : 'all')
      setCustomStartDate(externalDateRange.from ? toYMD(externalDateRange.from) : '')
      setCustomEndDate(externalDateRange.to ? toYMD(externalDateRange.to) : (externalDateRange.from ? toYMD(externalDateRange.from) : ''))
    }
  }, [externalDateRange])

  // Debouncing text inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedBarcode(filterBarcode)
    }, 400)
    return () => clearTimeout(handler)
  }, [filterBarcode])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedConnoteNumber(filterConnoteNumber)
    }, 400)
    return () => clearTimeout(handler)
  }, [filterConnoteNumber])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCustomer(filterCustomer)
    }, 400)
    return () => clearTimeout(handler)
  }, [filterCustomer])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (debouncedBarcode) params.set('filterBarcode', debouncedBarcode)
        if (debouncedConnoteNumber) params.set('filterConnoteNumber', debouncedConnoteNumber)
        if (debouncedCustomer) params.set('filterCustomer', debouncedCustomer)
        if (filterUnlinked) params.set('filterUnlinked', 'true')
        params.set('filterDateRange', filterDateRange)
        if (customStartDate) params.set('customStartDate', customStartDate)
        if (customEndDate) params.set('customEndDate', customEndDate)

        if (selectedSpeed.length > 0) params.set('selectedSpeed', selectedSpeed.join(','))
        if (selectedScanType.length > 0) params.set('selectedScanType', selectedScanType.join(','))
        if (selectedCourier.length > 0) params.set('selectedCourier', selectedCourier.join(','))
        if (selectedFranchise.length > 0) params.set('selectedFranchise', selectedFranchise.join(','))

        const res = await fetch(`/api/scans/report?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch scans report data')
        const data = await res.json()
        setReportData(data)
      } catch (error) {
        console.error("Error fetching report data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [
    debouncedBarcode,
    debouncedOrderNumber,
    debouncedCustomer,
    filterUnlinked,
    filterDateRange,
    customStartDate,
    customEndDate,
    selectedSpeed,
    selectedScanType,
    selectedCourier,
    selectedFranchise
  ])

  const metrics = reportData?.metrics
  const uniqueScanTypes = reportData?.filtersOptions?.uniqueScanTypes || []
  const uniqueCouriers = reportData?.filtersOptions?.uniqueCouriers || []
  const uniqueSpeeds = reportData?.filtersOptions?.uniqueSpeeds || []
  const uniqueFranchisees = reportData?.filtersOptions?.uniqueFranchisees || []

  if (loading || !metrics) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <Loader />
        <p className="text-muted-foreground text-sm">Aggregating Scan Reports...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {!hideFilters && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Scan Reporting</h1>
            <p className="text-muted-foreground mt-1">Analytics and insights across all package scan events.</p>
          </div>
        </div>
      )}

      {!hideFilters && (
        <Card id="step-report-filters">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Adjust these filters to recalculate reporting metrics dynamically.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Search Barcode</label>
                <Input placeholder="E.g. MP123456" value={filterBarcode} onChange={e => setFilterBarcode(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Connote Number</label>
                <Input placeholder="E.g. CON-123" value={filterConnoteNumber} onChange={e => setFilterConnoteNumber(e.target.value)} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-700 block">Signed Customer</label>
                  <div className="flex items-center gap-1.5">
                    <Switch id="unlinked-filter" checked={filterUnlinked} onCheckedChange={setFilterUnlinked} className="scale-75 data-[state=checked]:bg-indigo-600" />
                    <label htmlFor="unlinked-filter" className="text-[10px] font-medium text-slate-500 cursor-pointer">Unlinked Only</label>
                  </div>
                </div>
                <Input placeholder="E.g. Acme Corp" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} disabled={filterUnlinked} className={filterUnlinked ? "opacity-50 bg-slate-50" : ""} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Franchise</label>
                <MultiSelectCombobox options={uniqueFranchisees} selected={selectedFranchise} onSelectedChange={setSelectedFranchise} placeholder="Select Franchise..." />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Scan / Sync Date Range</label>
                <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeframe" />
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
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Start Date</label>
                    <Input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">End Date</label>
                    <Input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Speed</label>
                <MultiSelectCombobox options={uniqueSpeeds} selected={selectedSpeed} onSelectedChange={setSelectedSpeed} placeholder="Select Speed..." />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Scan Type</label>
                <MultiSelectCombobox options={uniqueScanTypes} selected={selectedScanType} onSelectedChange={setSelectedScanType} placeholder="Select Type..." />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Courier</label>
                <MultiSelectCombobox options={uniqueCouriers} selected={selectedCourier} onSelectedChange={setSelectedCourier} placeholder="Select Courier..." />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Stats */}
      <div id="step-report-metrics" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-muted-foreground">Filtered Packages</p>
                <SectionHelp content="Total number of scanned packages that match your active filter criteria." />
              </div>
              <div className="text-2xl font-bold text-slate-900">{metrics.totalPackages.toLocaleString()}</div>
            </div>
            <Package className="h-8 w-8 text-indigo-500 opacity-20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-muted-foreground">Missing Real-time Status</p>
                <SectionHelp content="Packages that have scan records but lack a real-time status update from the courier service." />
              </div>
              <div className="text-2xl font-bold text-slate-900">{metrics.missingRealTimeStatusCount.toLocaleString()}</div>
            </div>
            <RefreshCw className="h-8 w-8 text-orange-500 opacity-20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-muted-foreground">Status: Not Delivered</p>
                <SectionHelp content="Packages that are currently in transit, delayed, or otherwise not yet delivered to the destination." />
              </div>
              <div className="text-2xl font-bold text-slate-900">{metrics.notDeliveredCount.toLocaleString()}</div>
            </div>
            <Clock className="h-8 w-8 text-rose-500 opacity-20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-muted-foreground">Avg Transit Time</p>
                <SectionHelp content="Average business days elapsed from the first scan to delivery. Excludes weekends and Australian public holidays." />
              </div>
              <div className="text-2xl font-bold text-slate-900">{metrics.avgTransitDays} {metrics.avgTransitDays !== 'N/A' && 'days'}</div>
            </div>
            <Clock className="h-8 w-8 text-green-500 opacity-20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-muted-foreground">On-Time Delivery Rate</p>
                <SectionHelp content="Percentage of delivered packages that arrived within the courier's estimated delivery speed timeframe." />
              </div>
              <div className="text-2xl font-bold text-slate-900">{metrics.onTimeRate !== 'N/A' ? `${metrics.onTimeRate}%` : 'N/A'}</div>
            </div>
            <CheckCircle className="h-8 w-8 text-teal-500 opacity-20" />
          </CardContent>
        </Card>
        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-slate-50 transition-colors">
              <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-muted-foreground">Active Exceptions</p>
                    <SectionHelp content="Count of packages flagged by the courier with status exceptions (such as returned to sender, damaged, or delayed)." />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{metrics.exceptionCount}</div>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 opacity-20" />
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Active Exceptions ({metrics.activeExceptions.length})</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status & Location</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.activeExceptions.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Link href={`/scans?barcode=${item.barcode}`} className="text-indigo-600 hover:underline font-medium block">
                        {item.barcode}
                      </Link>
                      {item.order_number && item.order_number !== 'N/A' && (
                        <span className="text-xs text-muted-foreground">Ord: {item.order_number}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={item.customer}>
                      {item.companyId ? (
                        <Link href={`/companies/${item.companyId}`} className="text-indigo-600 hover:underline">
                          {item.customer}
                        </Link>
                      ) : (
                        item.customer
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm truncate max-w-[250px]" title={item.status}>{item.status}</span>
                        {item.last_location && item.last_location !== 'Unknown' && (
                          <span className="text-xs text-slate-500 truncate max-w-[250px]" title={item.last_location}>{item.last_location}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{item.updated_at}</TableCell>
                  </TableRow>
                ))}
                {metrics.activeExceptions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">No active exceptions found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-slate-50 transition-colors">
              <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Late Deliveries {">"} 2 Days</p>
                  <div className="text-2xl font-bold text-slate-900">{metrics.lateDeliveries.length}</div>
                </div>
                <Scan className="h-8 w-8 text-orange-500 opacity-20" />
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Late Deliveries ({metrics.lateDeliveries.length})</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status & Location</TableHead>
                  <TableHead>Timeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.lateDeliveries.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Link href={`/scans?barcode=${item.barcode}`} className="text-indigo-600 hover:underline font-medium block">
                        {item.barcode}
                      </Link>
                      {item.order_number && item.order_number !== 'N/A' && (
                        <span className="text-xs text-muted-foreground">Ord: {item.order_number}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={item.customer}>
                      {item.companyId ? (
                        <Link href={`/companies/${item.companyId}`} className="text-indigo-600 hover:underline">
                          {item.customer}
                        </Link>
                      ) : (
                        item.customer
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm truncate max-w-[250px]" title={item.status}>{item.status}</span>
                        {item.last_location && item.last_location !== 'Unknown' && (
                          <span className="text-xs text-slate-500 truncate max-w-[250px]" title={item.last_location}>{item.last_location}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col text-xs">
                        <span><span className="text-slate-500">Sync:</span> {item.sync_date}</span>
                        <span><span className="text-slate-500">Delivered:</span> {item.delivered_date}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {metrics.lateDeliveries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">No late deliveries found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Unique Customers</p>
              <div className="text-2xl font-bold text-slate-900">{metrics.totalUniqueCustomers}</div>
            </div>
            <Users className="h-8 w-8 text-blue-500 opacity-20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Franchisees Involved</p>
              <div className="text-2xl font-bold text-slate-900">{metrics.totalUniqueFranchisees}</div>
            </div>
            <Building className="h-8 w-8 text-orange-500 opacity-20" />
          </CardContent>
        </Card>
      </div>

      {/* Customer Health Stats */}
      <div className="pt-2">
        <h2 className="text-xl font-semibold text-slate-900 mt-2 mb-4">Customer Health & Retention <span className="text-sm font-normal text-slate-500 ml-2">(Based on selected date range)</span></h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:bg-slate-50 transition-colors">
                <CardContent className="p-4 flex flex-col justify-center items-center space-y-2 h-full">
                  <Activity className="h-6 w-6 text-blue-500 mb-1" />
                  <div className="text-3xl font-bold text-slate-900">{metrics.activeCustomersList.length}</div>
                  <p className="text-xs font-medium text-muted-foreground text-center">Active Customers</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Active Customers ({metrics.activeCustomersList.length})</DialogTitle>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Scans (Current Period) <span className="font-normal text-xs text-muted-foreground ml-1">{metrics.currentPeriodString}</span></TableHead>
                    <TableHead>Scans (Previous Period) <span className="font-normal text-xs text-muted-foreground ml-1">{metrics.prevPeriodString}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.activeCustomersList.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {c.companyId ? (
                          <Link href={`/companies/${c.companyId}`} className="text-indigo-600 hover:underline">
                            {c.name}
                          </Link>
                        ) : (
                          c.name
                        )}
                      </TableCell>
                      <TableCell>{c.currentPeriodScans}</TableCell>
                      <TableCell>{c.prevPeriodScans}</TableCell>
                    </TableRow>
                  ))}
                  {metrics.activeCustomersList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground h-24">No active customers found for this period.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:bg-slate-50 transition-colors">
                <CardContent className="p-4 flex flex-col justify-center items-center space-y-2 h-full">
                  <UserPlus className="h-6 w-6 text-green-500 mb-1" />
                  <div className="text-3xl font-bold text-slate-900">{metrics.newCustomersList.length}</div>
                  <p className="text-xs font-medium text-muted-foreground text-center">New Customers</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Customers ({metrics.newCustomersList.length})</DialogTitle>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>First Scan</TableHead>
                    <TableHead>Scans (Current Period) <span className="font-normal text-xs text-muted-foreground ml-1">{metrics.currentPeriodString}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.newCustomersList.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {c.companyId ? (
                          <Link href={`/companies/${c.companyId}`} className="text-indigo-600 hover:underline">
                            {c.name}
                          </Link>
                        ) : (
                          c.name
                        )}
                      </TableCell>
                      <TableCell>{c.firstScanDate ? getFormattedDateDDMMYYYY(toYMD(c.firstScanDate)) : 'Unknown'}</TableCell>
                      <TableCell>{c.currentPeriodScans}</TableCell>
                    </TableRow>
                  ))}
                  {metrics.newCustomersList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground h-24">No new customers found for this period.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:bg-slate-50 transition-colors">
                <CardContent className="p-4 flex flex-col justify-center items-center space-y-2 h-full">
                  <UserMinus className="h-6 w-6 text-red-500 mb-1" />
                  <div className="text-3xl font-bold text-slate-900">{metrics.droppedCustomersList.length}</div>
                  <p className="text-xs font-medium text-muted-foreground text-center">Dropped Customers</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Dropped Customers ({metrics.droppedCustomersList.length})</DialogTitle>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Scans (Current Period) <span className="font-normal text-xs text-muted-foreground ml-1">{metrics.currentPeriodString}</span></TableHead>
                    <TableHead>Scans (Previous Period) <span className="font-normal text-xs text-muted-foreground ml-1">{metrics.prevPeriodString}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.droppedCustomersList.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {c.companyId ? (
                          <Link href={`/companies/${c.companyId}`} className="text-indigo-600 hover:underline">
                            {c.name}
                          </Link>
                        ) : (
                          c.name
                        )}
                      </TableCell>
                      <TableCell className="text-red-500 font-bold">{c.currentPeriodScans}</TableCell>
                      <TableCell>{c.prevPeriodScans}</TableCell>
                    </TableRow>
                  ))}
                  {metrics.droppedCustomersList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground h-24">No dropped customers found for this period.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:bg-slate-50 transition-colors">
                <CardContent className="p-4 flex flex-col justify-center items-center space-y-2 h-full">
                  <TrendingDown className="h-6 w-6 text-orange-500 mb-1" />
                  <div className="text-3xl font-bold text-slate-900">{metrics.atRiskCustomersList.length}</div>
                  <p className="text-xs font-medium text-muted-foreground text-center">At-Risk Customers</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>At-Risk Customers ({metrics.atRiskCustomersList.length})</DialogTitle>
                <DialogDescription>Customers whose scan volume dropped by more than 50% compared to the previous period.</DialogDescription>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Scans (Current Period) <span className="font-normal text-xs text-muted-foreground ml-1">{metrics.currentPeriodString}</span></TableHead>
                    <TableHead>Scans (Previous Period) <span className="font-normal text-xs text-muted-foreground ml-1">{metrics.prevPeriodString}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.atRiskCustomersList.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {c.companyId ? (
                          <Link href={`/companies/${c.companyId}`} className="text-indigo-600 hover:underline">
                            {c.name}
                          </Link>
                        ) : (
                          c.name
                        )}
                      </TableCell>
                      <TableCell className="text-orange-500 font-bold">{c.currentPeriodScans}</TableCell>
                      <TableCell>{c.prevPeriodScans}</TableCell>
                    </TableRow>
                  ))}
                  {metrics.atRiskCustomersList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground h-24">No at-risk customers found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
          
          <Card>
            <CardContent className="p-4 flex flex-col justify-center items-center space-y-2 h-full">
              <TrendingUp className="h-6 w-6 text-indigo-500 mb-1" />
              <div className="text-3xl font-bold text-slate-900">{metrics.retentionRate !== 'N/A' ? `${metrics.retentionRate}%` : 'N/A'}</div>
              <p className="text-xs font-medium text-muted-foreground text-center">Retention Rate</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex flex-col justify-center items-center space-y-2 h-full">
              <Package className="h-6 w-6 text-teal-500 mb-1" />
              <div className="text-3xl font-bold text-slate-900">{metrics.avgUniqueBarcodesPerActive}</div>
              <p className="text-xs font-medium text-muted-foreground text-center">Avg Unique Barcodes / Active Customer</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 12-Week Rolling Customers Metric */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1 mb-8">
        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:border-slate-300 transition-colors">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-1.5">
                  <span>New customers vs lost customers — rolling 12 weeks</span>
                  <SectionHelp content="Compares newly acquired customers (first scan seen in past 12 weeks) against lost customers (no scans seen in past 12 weeks after previously scanning)." />
                </CardTitle>
                <CardDescription>Click to view the detailed list of new and lost customers.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.twelveWeeksData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} stackOffset="sign">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="weekLabel" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 12}} />
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                      <Bar dataKey="newCount" name="New customers" fill="#10b981" radius={[2, 2, 0, 0]} stackId="stack" />
                      <Bar dataKey="lostCount" name="Lost customers (shown negative)" fill="#ef4444" radius={[0, 0, 2, 2]} stackId="stack" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Rolling 12 Weeks Context</DialogTitle>
              <DialogDescription>New and lost customers over the last 12 weeks.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 md:grid-cols-2 mt-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">New Customers ({metrics.newCustomersLast12Weeks.length})</h3>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>First Seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.newCustomersLast12Weeks.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {c.companyId ? (
                              <Link href={`/companies/${c.companyId}`} className="text-indigo-600 hover:underline">
                                {c.name}
                              </Link>
                            ) : c.name}
                          </TableCell>
                          <TableCell>{c.firstScanDate ? getFormattedDateDDMMYYYY(toYMD(c.firstScanDate)) : 'Unknown'}</TableCell>
                        </TableRow>
                      ))}
                      {metrics.newCustomersLast12Weeks.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground h-16">No new customers found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Lost Customers ({metrics.lostCustomersLast12Weeks.length})</h3>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Last Seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.lostCustomersLast12Weeks.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {c.companyId ? (
                              <Link href={`/companies/${c.companyId}`} className="text-indigo-600 hover:underline">
                                {c.name}
                              </Link>
                            ) : c.name}
                          </TableCell>
                          <TableCell>{c.lastScanDate ? getFormattedDateDDMMYYYY(toYMD(c.lastScanDate)) : 'Unknown'}</TableCell>
                        </TableRow>
                      ))}
                      {metrics.lostCustomersLast12Weeks.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground h-16">No lost customers found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Charts Row 1: Timeline */}
      <div id="step-report-charts" className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <span>Scans per day</span>
              <SectionHelp content="Daily volume of package scan events over the selected period (defaulting to the last 14 days)." />
            </CardTitle>
            <CardDescription>Volume of scan events over the last 14 days (filtered)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.timelineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="scans" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <span>Product Types per Day</span>
              <SectionHelp content="Daily scan volume breakdown by product types (e.g., Satchels, Parcels, Letters)." />
            </CardTitle>
            <CardDescription>Scan volume by product type over the last 14 days (filtered)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.productTypeDailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                  {metrics.productTypes.map((pt, i) => (
                    <Bar key={pt} dataKey={pt} stackId="a" fill={COLORS[i % COLORS.length]} radius={metrics.productTypes.length === 1 ? [4, 4, 0, 0] : [0,0,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {!hideExtraCharts && (
        <>
          {/* Charts Row 2: Franchisee & Customers */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scans by Franchisee</CardTitle>
                <CardDescription>Top 15 franchisees by scan volume (filtered)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.franchiseeData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{fontSize: 12}} />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 15 Customers by Scans</CardTitle>
                <CardDescription>Customers generating the most scan events (filtered)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.customerData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{fontSize: 12}} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1 mb-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 15 Partner Locations by Scans</CardTitle>
                <CardDescription>Partner locations handling the most scan events (filtered)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.partnerLocationData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{fontSize: 12}} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2.5: Statuses & Bottlenecks */}
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Real Time Statuses</CardTitle>
                <CardDescription>Current tracking status distribution across packages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.statusData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{fontSize: 12}} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Geographic Bottlenecks</CardTitle>
                <CardDescription>Last known locations for undelivered packages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.locationData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{fontSize: 12}} />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 3: Couriers & Speeds */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Couriers</CardTitle>
                <CardDescription>Distribution of couriers handling packages (filtered)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.courierData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {metrics.courierData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Delivery Speeds</CardTitle>
                <CardDescription>Scans categorized by delivery speeds (filtered)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.speedData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{fontSize: 12}} />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={120} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
