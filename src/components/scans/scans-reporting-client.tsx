'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { firestore } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Package, Scan, Users, Building, AlertTriangle, Clock, CheckCircle, MapPin, TrendingDown, TrendingUp, UserPlus, UserMinus, Activity } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from '@/components/ui/switch'
import Link from 'next/link'

interface ScanRecord {
  id: number;
  scan_type: string;
  courier: string;
  updated_at: string;
  customer_ns_id?: string;
  delivery_speed?: string;
  product_type?: string;
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

const toYMD = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
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

  if (filterDateRange === 'today') {
    currentStart = new Date(todayStart);
    prevStart = new Date(todayStart);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(prevStart);
    prevEnd.setHours(23, 59, 59, 999);
  } else if (filterDateRange === 'last_7') {
    currentStart.setDate(todayStart.getDate() - 7);
    prevEnd = new Date(currentStart);
    prevEnd.setMilliseconds(-1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 7);
    prevStart.setHours(0,0,0,0);
  } else if (filterDateRange === 'last_30') {
    currentStart.setDate(todayStart.getDate() - 30);
    prevEnd = new Date(currentStart);
    prevEnd.setMilliseconds(-1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 30);
    prevStart.setHours(0,0,0,0);
  } else if (filterDateRange === 'this_week') {
    const day = todayStart.getDay();
    const diff = todayStart.getDate() - day + (day === 0 ? -6 : 1);
    currentStart.setDate(diff);
    prevEnd = new Date(currentStart);
    prevEnd.setMilliseconds(-1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
    prevStart.setHours(0,0,0,0);
  } else if (filterDateRange === 'this_month') {
    currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
    prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    prevEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
  } else if (filterDateRange === 'last_month') {
    currentStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    currentEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    prevStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    prevEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0, 23, 59, 59, 999);
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
  const [packages, setPackages] = useState<PackageRecord[]>([])
  const [companyMap, setCompanyMap] = useState<Record<string, { id: string, name: string, franchisee?: string }>>({})
  const [partnerLocationMap, setPartnerLocationMap] = useState<Record<string, { id: string, name: string }>>({})

  // Filters State
  const [filterBarcode, setFilterBarcode] = useState('')
  const [filterOrderNumber, setFilterOrderNumber] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterUnlinked, setFilterUnlinked] = useState(false)
  const [filterDateRange, setFilterDateRange] = useState('this_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedSpeed, setSelectedSpeed] = useState<string[]>([])
  const [selectedScanType, setSelectedScanType] = useState<string[]>([])
  const [selectedCourier, setSelectedCourier] = useState<string[]>([])
  const [selectedFranchise, setSelectedFranchise] = useState<string[]>([])

  useEffect(() => {
    if (externalDateRange) {
      setFilterDateRange(externalDateRange.from ? 'custom' : 'all')
      setCustomStartDate(externalDateRange.from ? toYMD(externalDateRange.from) : '')
      setCustomEndDate(externalDateRange.to ? toYMD(externalDateRange.to) : (externalDateRange.from ? toYMD(externalDateRange.from) : ''))
    }
  }, [externalDateRange])

  useEffect(() => {
    async function fetchData() {
      try {
        const [packagesSnap, companiesSnap, leadsSnap] = await Promise.all([
          getDocs(collection(firestore, 'packages')),
          getDocs(collection(firestore, 'companies')),
          getDocs(collection(firestore, 'leads'))
        ])

        const pkgs = packagesSnap.docs.map(doc => doc.data() as PackageRecord)
        const cMap: Record<string, { id: string, name: string, franchisee?: string }> = {}

        const processDocs = (snap: any) => {
          snap.docs.forEach((doc: any) => {
            const data = doc.data()
            if (data.internalid) {
              cMap[String(data.internalid)] = {
                id: doc.id,
                name: data.companyName || 'Unknown Company',
                franchisee: data.franchisee || 'Unassigned'
              }
            }
          })
        }
        processDocs(companiesSnap)
        processDocs(leadsSnap)

        const pLocMap: Record<string, { id: string, name: string }> = {}
        const pLocSnap = await getDocs(collection(firestore, 'partner_locations'))
        pLocSnap.docs.forEach((doc: any) => {
          const data = doc.data()
          if (data.internalId || doc.id) {
            const key = String(data.internalId || doc.id)
            pLocMap[key] = { id: doc.id, name: data.name || 'Unknown Location' }
          }
        })

        setPackages(pkgs)
        setCompanyMap(cMap)
        setPartnerLocationMap(pLocMap)
      } catch (error) {
        console.error("Error fetching report data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Unique Options for Selects
  const { uniqueScanTypes, uniqueCouriers, uniqueSpeeds, uniqueFranchisees } = useMemo(() => {
    const scanTypes = Array.from(new Set(packages.flatMap(p => p.scans?.map(s => s.scan_type)).filter(Boolean)))
      .map(s => ({label: s as string, value: s as string})).sort((a, b) => a.label.localeCompare(b.label));
    const couriers = Array.from(new Set(packages.flatMap(p => p.scans?.map(s => s.courier)).filter(Boolean)))
      .map(c => ({label: (c as string).replace('_', ' '), value: c as string})).sort((a, b) => a.label.localeCompare(b.label));
    const speeds = Array.from(new Set(packages.flatMap(p => p.scans?.map(s => s.delivery_speed)).filter(Boolean)))
      .map(s => ({label: s as string, value: s as string})).sort((a, b) => a.label.localeCompare(b.label));
    const franchisees = Array.from(new Set(Object.values(companyMap).map(c => c.franchisee).filter(Boolean)))
      .map(f => ({label: f as string, value: f as string})).sort((a, b) => a.label.localeCompare(b.label));
      
    return { uniqueScanTypes: scanTypes, uniqueCouriers: couriers, uniqueSpeeds: speeds, uniqueFranchisees: franchisees };
  }, [packages, companyMap])

  // Filtered Packages & Metrics
  const { filteredPackages, metrics } = useMemo(() => {
    const filtered = packages.filter(pkg => {
      let customerNsId = null;
      if (pkg.scans && pkg.scans.length > 0) {
        const scanWithNsId = pkg.scans.find(s => s.customer_ns_id)
        if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id
      }
      const company = customerNsId ? companyMap[customerNsId] : null;
      const companyName = company ? company.name.toLowerCase() : '';

      if (filterUnlinked && company) return false;

      if (filterBarcode && (!pkg.code || typeof pkg.code !== 'string' || !pkg.code.toLowerCase().includes(filterBarcode.toLowerCase()))) return false;
      if (filterOrderNumber && (!pkg.order_number || typeof pkg.order_number !== 'string' || !pkg.order_number.toLowerCase().includes(filterOrderNumber.toLowerCase()))) return false;
      if (!filterUnlinked && filterCustomer && !companyName.includes(filterCustomer.toLowerCase())) return false;
      
      const isSpecificSearch = filterBarcode.trim() !== '' || filterOrderNumber.trim() !== '';
      
      if (filterDateRange !== 'all' && !isSpecificSearch) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkDate = (dateStr: string) => {
          if (!dateStr) return false;
          let d = parseDateString(dateStr);
          if (isNaN(d.getTime())) return false;

          d.setHours(0, 0, 0, 0);

          if (filterDateRange === 'today') {
            return d.getTime() === today.getTime();
          }
          if (filterDateRange === 'last_7') {
            const last7 = new Date(today);
            last7.setDate(today.getDate() - 7);
            return d >= last7 && d <= today;
          }
          if (filterDateRange === 'last_30') {
            const last30 = new Date(today);
            last30.setDate(today.getDate() - 30);
            return d >= last30 && d <= today;
          }
          if (filterDateRange === 'this_week') {
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            const startOfWeek = new Date(today);
            startOfWeek.setDate(diff);
            startOfWeek.setHours(0,0,0,0);
            return d >= startOfWeek;
          }
          if (filterDateRange === 'this_month') {
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
          }
          if (filterDateRange === 'last_month') {
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
          }
          if (filterDateRange === 'custom') {
            const start = customStartDate ? new Date(customStartDate) : null;
            if (start) start.setHours(0,0,0,0);
            const end = customEndDate ? new Date(customEndDate) : null;
            if (end) end.setHours(23,59,59,999);

            if (start && end) return d >= start && d <= end;
            if (start) return d >= start;
            if (end) return d <= end;
            return true;
          }
          return true;
        }

        const hasMatchingScan = pkg.scans?.some(scan => checkDate(scan.updated_at));
        if (!hasMatchingScan && !checkDate(pkg.sync_date)) {
          return false;
        }
      }
      
      let latestScanFilter = pkg.scans?.[pkg.scans.length - 1];
      if (pkg.scans && pkg.scans.length > 0) {
        latestScanFilter = pkg.scans.reduce((latest, current) => {
          return getSortableTime(latest.updated_at) > getSortableTime(current.updated_at) ? latest : current;
        }, pkg.scans[0]);
      }

      if (selectedSpeed.length > 0 && (!latestScanFilter?.delivery_speed || !selectedSpeed.includes(latestScanFilter.delivery_speed))) return false;
      if (selectedScanType.length > 0 && (!latestScanFilter?.scan_type || !selectedScanType.includes(latestScanFilter.scan_type))) return false;
      if (selectedCourier.length > 0 && (!latestScanFilter?.courier || !selectedCourier.includes(latestScanFilter.courier))) return false;
      if (selectedFranchise.length > 0 && (!company?.franchisee || !selectedFranchise.includes(company.franchisee))) return false;

      // Ensure we don't show reporting for packages whose latest scan type is 'futile'
      if (latestScanFilter?.scan_type?.toLowerCase().includes('futile')) return false;

      // Exclude packages if they contain an "Allocate" or "Stockzee" scan
      const hasExcludedScan = pkg.scans?.some(scan => {
        const type = scan.scan_type?.toLowerCase() || '';
        return type.includes('allocate') || type.includes('stockzee');
      });
      if (hasExcludedScan) return false;

      return true;
    });

    const courierCount: Record<string, number> = {}
    const speedCount: Record<string, number> = {}
    const franchiseeCount: Record<string, number> = {}
    const partnerLocationCount: Record<string, number> = {}
    const customerCount: Record<string, number> = {}
    const dateCount: Record<string, number> = {}
    const productTypeDaily: Record<string, Record<string, number>> = {}
    const uniqueProductTypes = new Set<string>()
    const statusCount: Record<string, number> = {}
    const locationCount: Record<string, number> = {}
    let totalTransitDays = 0;
    let deliveredWithTransitTimeCount = 0;
    let onTimeDeliveryCount = 0;
    let totalDeliveredWithSyncDate = 0;
    let exceptionCount = 0;
    let etaVarianceSum = 0;
    let totalScans = 0;
    const lateDeliveries: Array<{ barcode: string; delivered_date: string; sync_date: string; status: string; last_location: string; customer: string; order_number: string; companyId: string | null }> = [];
    const activeExceptions: Array<{ barcode: string; status: string; last_location: string; updated_at: string; customer: string; order_number: string; companyId: string | null }> = [];

    filtered.forEach(pkg => {
      let customerNsId = null;
      const seenDates = new Set<string>();
      const seenDateProd = new Set<string>();
      const seenCouriers = new Set<string>();
      const seenSpeeds = new Set<string>();
      if (pkg.scans && pkg.scans.length > 0) {
        const scanWithNsId = pkg.scans.find(s => s.customer_ns_id)
        if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id
      }

      const company = customerNsId ? companyMap[customerNsId] : null;
      const franchisee = company?.franchisee || 'Unassigned';
      const custName = company?.name || 'Unlinked';
      const scanLen = pkg.scans?.length || 0;

      totalScans += scanLen;
      if (scanLen > 0) {
        franchiseeCount[franchisee] = (franchiseeCount[franchisee] || 0) + 1;
        customerCount[custName] = (customerCount[custName] || 0) + 1;
        
        let latestScan = pkg.scans?.[pkg.scans.length - 1];
        if (pkg.scans && pkg.scans.length > 0) {
          latestScan = pkg.scans.reduce((latest, current) => {
            return getSortableTime(latest.updated_at) > getSortableTime(current.updated_at) ? latest : current;
          }, pkg.scans[0]);
        }
        
        const depotId = latestScan?.depot_id;
        if (depotId && partnerLocationMap[depotId]) {
          const locName = partnerLocationMap[depotId].name;
          partnerLocationCount[locName] = (partnerLocationCount[locName] || 0) + 1;
        }
      }

      const rawStatus = pkg.real_time_status?.status || 'Unknown';
      const rtStatus = normalizeStatus(rawStatus);
      statusCount[rtStatus] = (statusCount[rtStatus] || 0) + 1;

      const isDelivered = rtStatus.toLowerCase().includes('delivered');
      const isException = rtStatus.toLowerCase().includes('exception') || rtStatus.toLowerCase().includes('delay') || rtStatus.toLowerCase().includes('lost') || rtStatus.toLowerCase().includes('alert') || rtStatus.toLowerCase().includes('attempt');

      if (isException) {
        exceptionCount++;
        activeExceptions.push({
          barcode: pkg.code,
          status: pkg.real_time_status?.status || 'Unknown',
          last_location: pkg.real_time_status?.last_location || 'Unknown',
          updated_at: getLocalIsoDate(pkg.real_time_status?.updated_at),
          customer: custName,
          order_number: pkg.order_number || 'N/A',
          companyId: company?.id || null
        });
      }

      if (!isDelivered && pkg.real_time_status?.last_location) {
        const loc = pkg.real_time_status.last_location;
        locationCount[loc] = (locationCount[loc] || 0) + 1;
      }

      if (isDelivered && pkg.scans && pkg.scans.length > 0 && pkg.real_time_status?.updated_at) {
        const firstScan = pkg.scans.reduce((earliest, current) => {
          return getSortableTime(earliest.updated_at) < getSortableTime(current.updated_at) ? earliest : current;
        }, pkg.scans[0]);
        
        const firstScanDate = new Date(firstScan.updated_at);
        const deliveredDate = new Date(pkg.real_time_status.updated_at);
        
        if (!isNaN(firstScanDate.getTime()) && !isNaN(deliveredDate.getTime())) {
          const diffTime = deliveredDate.getTime() - firstScanDate.getTime();
          if (diffTime >= 0) {
            const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            totalTransitDays += diffDays;
            deliveredWithTransitTimeCount++;
          }
        }

        if (pkg.sync_date) {
           const syncDateObj = parseDateString(pkg.sync_date);
           const expectedDeliveryDate = addWorkingDays(syncDateObj, 2);
           const dDateOnly = new Date(deliveredDate.getFullYear(), deliveredDate.getMonth(), deliveredDate.getDate());
           
           if (expectedDeliveryDate && !isNaN(dDateOnly.getTime())) {
             totalDeliveredWithSyncDate++;
             if (dDateOnly <= expectedDeliveryDate) {
               onTimeDeliveryCount++;
             } else {
               lateDeliveries.push({
                 barcode: pkg.code,
                 delivered_date: getFormattedDateDDMMYYYY(pkg.real_time_status.updated_at),
                 sync_date: getFormattedDateDDMMYYYY(pkg.sync_date),
                 status: pkg.real_time_status.status || 'Unknown',
                 last_location: pkg.real_time_status.last_location || 'Unknown',
                 customer: custName,
                 order_number: pkg.order_number || 'N/A',
                 companyId: company?.id || null
               });
             }
             const diffDays = (dDateOnly.getTime() - expectedDeliveryDate.getTime()) / (1000 * 60 * 60 * 24);
             etaVarianceSum += diffDays;
           }
        }
      }

      pkg.scans?.forEach(scan => {
        const courier = scan.courier ? scan.courier.replace('_', ' ') : 'Unknown';
        if (!seenCouriers.has(courier)) {
          seenCouriers.add(courier);
          courierCount[courier] = (courierCount[courier] || 0) + 1;
        }
        
        const speed = scan.delivery_speed || 'Unknown';
        if (!seenSpeeds.has(speed)) {
          seenSpeeds.add(speed);
          speedCount[speed] = (speedCount[speed] || 0) + 1;
        }

        const date = getLocalIsoDate(scan.updated_at);
        if (!seenDates.has(date)) {
          seenDates.add(date);
          dateCount[date] = (dateCount[date] || 0) + 1;
        }
        
        const prodType = scan.product_type || 'Unknown';
        uniqueProductTypes.add(prodType);
        const dateProdKey = `${date}|${prodType}`;
        if (!seenDateProd.has(dateProdKey)) {
          seenDateProd.add(dateProdKey);
          if (!productTypeDaily[date]) productTypeDaily[date] = {};
          productTypeDaily[date][prodType] = (productTypeDaily[date][prodType] || 0) + 1;
        }
      });
    });

    // Calculate Customer Health Metrics (using ALL packages)
    const { currentStart, currentEnd, prevStart, prevEnd } = getPeriods(filterDateRange, customStartDate, customEndDate);
    
    const customerUsage: Record<string, {
      name: string;
      companyId: string | null;
      firstScanDate: Date | null;
      currentPeriodScans: number;
      prevPeriodScans: number;
      currentPeriodUniquePackages: Set<string>;
    }> = {};

    packages.forEach(pkg => {
      let customerNsId = null;
      if (pkg.scans && pkg.scans.length > 0) {
        const scanWithNsId = pkg.scans.find(s => s.customer_ns_id);
        if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id;
      }
      const company = customerNsId ? companyMap[customerNsId] : null;
      const custName = company?.name || 'Unlinked';

      if (!customerUsage[custName]) {
        customerUsage[custName] = {
          name: custName,
          companyId: company?.id || null,
          firstScanDate: null,
          currentPeriodScans: 0,
          prevPeriodScans: 0,
          currentPeriodUniquePackages: new Set<string>()
        };
      }

      const allDates: Date[] = [];
      if (pkg.sync_date) allDates.push(parseDateString(pkg.sync_date));
      pkg.scans?.forEach(s => {
        if (s.updated_at) allDates.push(parseDateString(s.updated_at));
      });

      allDates.forEach(d => {
        if (isNaN(d.getTime())) return;
        
        if (!customerUsage[custName].firstScanDate || d < customerUsage[custName].firstScanDate!) {
          customerUsage[custName].firstScanDate = d;
        }

        if (d >= currentStart && d <= currentEnd) {
          customerUsage[custName].currentPeriodScans++;
          if (pkg.code) customerUsage[custName].currentPeriodUniquePackages.add(pkg.code);
        } else if (d >= prevStart && d <= prevEnd) {
          customerUsage[custName].prevPeriodScans++;
        }
      });
    });

    const activeCustomers: typeof customerUsage[string][] = [];
    const newCustomers: typeof customerUsage[string][] = [];
    const droppedCustomers: typeof customerUsage[string][] = [];
    const atRiskCustomers: typeof customerUsage[string][] = [];

    let totalActiveCurrentScans = 0;
    let totalActiveCurrentUniquePackages = 0;

    Object.values(customerUsage).forEach(cu => {
      // Skip 'Unlinked' if we only want to track signed customers
      if (cu.name === 'Unlinked') return;

      if (cu.currentPeriodScans > 0) {
        activeCustomers.push(cu);
        totalActiveCurrentScans += cu.currentPeriodScans;
        totalActiveCurrentUniquePackages += cu.currentPeriodUniquePackages.size;

        // New customer check
        if (cu.firstScanDate && cu.firstScanDate >= currentStart && cu.firstScanDate <= currentEnd) {
          newCustomers.push(cu);
        }

        // At risk check (dropped > 50% compared to prev period, and prev period had at least 10 scans to filter out noise)
        if (cu.prevPeriodScans > 10 && cu.currentPeriodScans < (cu.prevPeriodScans * 0.5)) {
          atRiskCustomers.push(cu);
        }
      } else if (cu.prevPeriodScans > 0) {
        // Active last period but 0 this period -> dropped
        droppedCustomers.push(cu);
      }
    });

    const avgUniqueBarcodesPerActive = activeCustomers.length > 0 ? (totalActiveCurrentUniquePackages / activeCustomers.length).toFixed(1) : '0';
    
    // Retention rate: Of the customers active in prev period, what % are active in current period?
    let prevActiveCount = 0;
    let retainedCount = 0;
    Object.values(customerUsage).forEach(cu => {
      if (cu.name === 'Unlinked') return;
      if (cu.prevPeriodScans > 0) {
        prevActiveCount++;
        if (cu.currentPeriodScans > 0) {
          retainedCount++;
        }
      }
    });
    const retentionRate = prevActiveCount > 0 ? ((retainedCount / prevActiveCount) * 100).toFixed(1) : 'N/A';

    const toChartData = (obj: Record<string, number>, limit = 20) => {
      return Object.entries(obj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
    };

    const productTypeDailyArr = Object.entries(productTypeDaily)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);
      
    const timelineArr = Object.entries(dateCount)
      .map(([date, value]) => ({ date, scans: value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);

    return {
      filteredPackages: filtered,
      metrics: {
        totalPackages: filtered.length,
        totalScans,
        avgTransitDays: deliveredWithTransitTimeCount > 0 ? (totalTransitDays / deliveredWithTransitTimeCount).toFixed(1) : 'N/A',
        onTimeRate: totalDeliveredWithSyncDate > 0 ? ((onTimeDeliveryCount / totalDeliveredWithSyncDate) * 100).toFixed(1) : 'N/A',
        avgEtaVariance: totalDeliveredWithSyncDate > 0 ? (etaVarianceSum / totalDeliveredWithSyncDate).toFixed(1) : 'N/A',
        lateDeliveries,
        activeExceptions,
        exceptionCount,
        courierData: toChartData(courierCount),
        speedData: toChartData(speedCount, 10),
        franchiseeData: toChartData(franchiseeCount, 15),
        partnerLocationData: toChartData(partnerLocationCount, 15),
        customerData: toChartData(customerCount, 15),
        totalUniqueCustomers: Object.keys(customerCount).length,
        totalUniqueFranchisees: Object.keys(franchiseeCount).length,
        statusData: toChartData(statusCount, 20),
        locationData: toChartData(locationCount, 15),
        timelineData: timelineArr,
        productTypeDailyData: productTypeDailyArr,
        productTypes: Array.from(uniqueProductTypes),
        retentionRate,
        avgUniqueBarcodesPerActive,
        activeCustomersList: activeCustomers.sort((a,b) => b.currentPeriodScans - a.currentPeriodScans),
        newCustomersList: newCustomers.sort((a,b) => b.currentPeriodScans - a.currentPeriodScans),
        droppedCustomersList: droppedCustomers.sort((a,b) => b.prevPeriodScans - a.prevPeriodScans),
        atRiskCustomersList: atRiskCustomers.sort((a,b) => b.prevPeriodScans - a.prevPeriodScans),
        prevPeriodString: filterDateRange !== 'all' ? `(${getFormattedDateDDMMYYYY(toYMD(prevStart))} to ${getFormattedDateDDMMYYYY(toYMD(prevEnd))})` : '',
        currentPeriodString: filterDateRange !== 'all' ? `(${getFormattedDateDDMMYYYY(toYMD(currentStart))} to ${getFormattedDateDDMMYYYY(toYMD(currentEnd))})` : '',
      }
    }
  }, [
    packages, companyMap, filterBarcode, filterOrderNumber, filterCustomer, filterUnlinked,
    filterDateRange, customStartDate, customEndDate, selectedSpeed, selectedScanType, 
    selectedCourier, selectedFranchise
  ])

  if (loading) {
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
        <Card>
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
                <label className="text-xs font-medium text-slate-700 mb-1 block">Order Number</label>
                <Input placeholder="E.g. ORD-123" value={filterOrderNumber} onChange={e => setFilterOrderNumber(e.target.value)} />
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Filtered Packages</p>
              <div className="text-2xl font-bold text-slate-900">{metrics.totalPackages.toLocaleString()}</div>
            </div>
            <Package className="h-8 w-8 text-indigo-500 opacity-20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Avg Transit Time</p>
              <div className="text-2xl font-bold text-slate-900">{metrics.avgTransitDays} {metrics.avgTransitDays !== 'N/A' && 'days'}</div>
            </div>
            <Clock className="h-8 w-8 text-green-500 opacity-20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">On-Time Delivery Rate</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Active Exceptions</p>
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

      {/* Charts Row 1: Timeline */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scans per day</CardTitle>
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
            <CardTitle className="text-base">Product Types per Day</CardTitle>
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
