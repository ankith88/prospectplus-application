'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { firestore } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Package, Scan, Users, Building, AlertTriangle, Clock, CheckCircle, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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


const getLocalIsoDate = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Unknown';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export function ScansReportingClient() {
  const [loading, setLoading] = useState(true)
  const [packages, setPackages] = useState<PackageRecord[]>([])
  const [companyMap, setCompanyMap] = useState<Record<string, { id: string, name: string, franchisee?: string }>>({})

  // Filters State
  const [filterBarcode, setFilterBarcode] = useState('')
  const [filterOrderNumber, setFilterOrderNumber] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterDateRange, setFilterDateRange] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedSpeed, setSelectedSpeed] = useState<string[]>([])
  const [selectedScanType, setSelectedScanType] = useState<string[]>([])
  const [selectedCourier, setSelectedCourier] = useState<string[]>([])
  const [selectedFranchise, setSelectedFranchise] = useState<string[]>([])

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

        setPackages(pkgs)
        setCompanyMap(cMap)
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
      .map(s => ({label: s as string, value: s as string}));
    const couriers = Array.from(new Set(packages.flatMap(p => p.scans?.map(s => s.courier)).filter(Boolean)))
      .map(c => ({label: (c as string).replace('_', ' '), value: c as string}));
    const speeds = Array.from(new Set(packages.flatMap(p => p.scans?.map(s => s.delivery_speed)).filter(Boolean)))
      .map(s => ({label: s as string, value: s as string}));
    const franchisees = Array.from(new Set(Object.values(companyMap).map(c => c.franchisee).filter(Boolean)))
      .map(f => ({label: f as string, value: f as string}));
      
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

      if (filterBarcode && (!pkg.code || typeof pkg.code !== 'string' || !pkg.code.toLowerCase().includes(filterBarcode.toLowerCase()))) return false;
      if (filterOrderNumber && (!pkg.order_number || typeof pkg.order_number !== 'string' || !pkg.order_number.toLowerCase().includes(filterOrderNumber.toLowerCase()))) return false;
      if (filterCustomer && !companyName.includes(filterCustomer.toLowerCase())) return false;
      
      if (filterDateRange !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkDate = (dateStr: string) => {
          if (!dateStr) return false;
          let d = new Date(dateStr);
          // Handle DD-MM-YYYY format
          if (isNaN(d.getTime()) && dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
              d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
            }
          }
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
          return new Date(latest.updated_at) > new Date(current.updated_at) ? latest : current;
        }, pkg.scans[0]);
      }

      if (selectedSpeed.length > 0 && (!latestScanFilter?.delivery_speed || !selectedSpeed.includes(latestScanFilter.delivery_speed))) return false;
      if (selectedScanType.length > 0 && (!latestScanFilter?.scan_type || !selectedScanType.includes(latestScanFilter.scan_type))) return false;
      if (selectedCourier.length > 0 && (!latestScanFilter?.courier || !selectedCourier.includes(latestScanFilter.courier))) return false;
      if (selectedFranchise.length > 0 && (!company?.franchisee || !selectedFranchise.includes(company.franchisee))) return false;

      // Ensure we don't show reporting for packages whose latest scan is 'futile'
      if (latestScanFilter?.scan_type?.toLowerCase().includes('futile')) return false;

      return true;
    });

    const courierCount: Record<string, number> = {}
    const speedCount: Record<string, number> = {}
    const franchiseeCount: Record<string, number> = {}
    const customerCount: Record<string, number> = {}
    const dateCount: Record<string, number> = {}
    const productTypeDaily: Record<string, Record<string, number>> = {}
    const uniqueProductTypes = new Set<string>()
    const statusCount: Record<string, number> = {}
    const locationCount: Record<string, number> = {}
    let totalTransitDays = 0;
    let deliveredWithTransitTimeCount = 0;
    let onTimeDeliveryCount = 0;
    let totalDeliveredWithEta = 0;
    let exceptionCount = 0;
    let etaVarianceSum = 0;
    let totalScans = 0;

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
      }

      const rtStatus = pkg.real_time_status?.status || 'Unknown';
      statusCount[rtStatus] = (statusCount[rtStatus] || 0) + 1;

      const isDelivered = rtStatus.toLowerCase().includes('delivered');
      const isException = rtStatus.toLowerCase().includes('exception') || rtStatus.toLowerCase().includes('delay') || rtStatus.toLowerCase().includes('lost') || rtStatus.toLowerCase().includes('alert') || rtStatus.toLowerCase().includes('attempt');

      if (isException) {
        exceptionCount++;
      }

      if (!isDelivered && pkg.real_time_status?.last_location) {
        const loc = pkg.real_time_status.last_location;
        locationCount[loc] = (locationCount[loc] || 0) + 1;
      }

      if (isDelivered && pkg.scans && pkg.scans.length > 0 && pkg.real_time_status?.updated_at) {
        const firstScan = pkg.scans.reduce((earliest, current) => {
          return new Date(earliest.updated_at) < new Date(current.updated_at) ? earliest : current;
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

        if (pkg.real_time_status?.estimated_delivery_date) {
           const etaDate = new Date(pkg.real_time_status.estimated_delivery_date);
           const dDateOnly = new Date(deliveredDate.getFullYear(), deliveredDate.getMonth(), deliveredDate.getDate());
           const etaDateOnly = new Date(etaDate.getFullYear(), etaDate.getMonth(), etaDate.getDate());

           if (!isNaN(dDateOnly.getTime()) && !isNaN(etaDateOnly.getTime())) {
             totalDeliveredWithEta++;
             if (dDateOnly <= etaDateOnly) {
               onTimeDeliveryCount++;
             }
             const diffDays = (dDateOnly.getTime() - etaDateOnly.getTime()) / (1000 * 60 * 60 * 24);
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
        onTimeRate: totalDeliveredWithEta > 0 ? ((onTimeDeliveryCount / totalDeliveredWithEta) * 100).toFixed(1) : 'N/A',
        avgEtaVariance: totalDeliveredWithEta > 0 ? (etaVarianceSum / totalDeliveredWithEta).toFixed(1) : 'N/A',
        exceptionCount,
        courierData: toChartData(courierCount),
        speedData: toChartData(speedCount, 10),
        franchiseeData: toChartData(franchiseeCount, 15),
        customerData: toChartData(customerCount, 15),
        statusData: toChartData(statusCount, 20),
        locationData: toChartData(locationCount, 15),
        timelineData: timelineArr,
        productTypeDailyData: productTypeDailyArr,
        productTypes: Array.from(uniqueProductTypes)
      }
    }
  }, [
    packages, companyMap, filterBarcode, filterOrderNumber, filterCustomer, 
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Scan Reporting</h1>
          <p className="text-muted-foreground mt-1">Analytics and insights across all package scan events.</p>
        </div>
      </div>

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
              <label className="text-xs font-medium text-slate-700 mb-1 block">Signed Customer</label>
              <Input placeholder="E.g. Acme Corp" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} />
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
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Active Exceptions</p>
              <div className="text-2xl font-bold text-slate-900">{metrics.exceptionCount}</div>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500 opacity-20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Avg ETA Variance</p>
              <div className="text-2xl font-bold text-slate-900">{metrics.avgEtaVariance !== 'N/A' ? `${Number(metrics.avgEtaVariance) > 0 ? '+' : ''}${metrics.avgEtaVariance} days` : 'N/A'}</div>
            </div>
            <Scan className="h-8 w-8 text-orange-500 opacity-20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Unique Customers</p>
              <div className="text-2xl font-bold text-slate-900">{metrics.customerData.length}</div>
            </div>
            <Users className="h-8 w-8 text-blue-500 opacity-20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Franchisees Involved</p>
              <div className="text-2xl font-bold text-slate-900">{metrics.franchiseeData.length}</div>
            </div>
            <Building className="h-8 w-8 text-orange-500 opacity-20" />
          </CardContent>
        </Card>
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
                <BarChart data={metrics.customerData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 10}} angle={-45} textAnchor="end" />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
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
                <BarChart data={metrics.statusData} margin={{ top: 5, right: 30, left: 20, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 10}} angle={-15} textAnchor="end" />
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
    </div>
  )
}
