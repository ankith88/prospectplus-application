'use client'

import React, { useEffect, useState } from 'react'
import { firestore } from '@/lib/firebase'
import { Operator } from '@/lib/types'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { ChevronDown, ChevronRight, Package, Truck, ExternalLink, RefreshCw, Download, Copy, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Scan {
  id: number;
  scan_type: string;
  courier: string;
  updated_at: string;
  receiver_name?: string;
  receiver_suburb?: string;
  futile_reason?: string;
  customer_ns_id?: string;
  email?: string;
  post_code?: string;
  state?: string;
  address1?: string;
  address2?: string;
  phone?: string;
  delivery_speed?: string;
  product_type?: string;
  depot_id?: string;
  delivery_zone?: string;
  operator_ns_id?: string;
}

interface PackageRecord {
  code: string;
  manifested_at: string | null;
  weight: string;
  order_number: string;
  sync_date: string;
  scans: Scan[];
  real_time_status?: { 
    status: string; 
    updated_at: string; 
    delivered: boolean;
    estimated_delivery_date?: string | null;
    last_location?: string | null;
  };
  operator_ns_id?: string;
}

const getBadgeColor = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('futile')) return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
  if (t.includes('lodgement')) return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
  if (t.includes('pickup')) return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
  return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
}

export function ScansClient() {
  const [packages, setPackages] = useState<PackageRecord[]>([])
  const [companyMap, setCompanyMap] = useState<Record<string, { id: string, name: string, franchisee?: string }>>({})
  const [operatorMap, setOperatorMap] = useState<Record<string, Operator>>({})
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState<Record<string, boolean>>({})
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [filterBarcode, setFilterBarcode] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterUnlinked, setFilterUnlinked] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [filterRecipient, setFilterRecipient] = useState('')
  const [filterOrderNumber, setFilterOrderNumber] = useState('')
  const [selectedBarcodes, setSelectedBarcodes] = useState<Set<string>>(new Set())
  const [selectedSpeed, setSelectedSpeed] = useState<string[]>([])
  const [selectedScanType, setSelectedScanType] = useState<string[]>([])
  const [selectedCourier, setSelectedCourier] = useState<string[]>([])
  const [selectedFranchise, setSelectedFranchise] = useState<string[]>([])
  const [selectedProductType, setSelectedProductType] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const barcode = params.get('barcode');
      if (barcode) {
        setFilterBarcode(barcode);
      }
    }
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterBarcode, filterOrderNumber, filterCustomer, filterDate, filterRecipient, selectedSpeed, selectedScanType, selectedCourier, selectedFranchise, selectedProductType, filterUnlinked])

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch Packages
        const packagesSnap = await getDocs(collection(firestore, 'packages'))
        const pkgs = packagesSnap.docs.map(doc => doc.data() as PackageRecord)
        
        // 2. Extract unique customer_ns_id values
        const uniqueNsIds = new Set<string>()
        pkgs.forEach(pkg => {
          pkg.scans?.forEach(scan => {
            if (scan.customer_ns_id) {
              uniqueNsIds.add(scan.customer_ns_id)
            }
          })
        })

        // 3. Fetch Companies to build a map from internalid -> Company ID and Name
        // We will fetch both leads and companies to be safe, or just companies if that's all that's used.
        // User stated "companies & leads collection, both", so we will fetch both to map it.
        const cMap: Record<string, { id: string, name: string, franchisee?: string }> = {}
        
        const [companiesSnap, leadsSnap, operatorsSnap] = await Promise.all([
          getDocs(collection(firestore, 'companies')),
          getDocs(collection(firestore, 'leads')),
          getDocs(collection(firestore, 'operators'))
        ])

        const processDocs = (snap: any) => {
          snap.docs.forEach((doc: any) => {
            const data = doc.data()
            if (data.internalid) {
              // Convert to string for consistent mapping
              cMap[String(data.internalid)] = {
                id: doc.id,
                name: data.companyName || 'Unknown Company',
                franchisee: data.franchisee || ''
              }
            }
          })
        }

        processDocs(companiesSnap)
        processDocs(leadsSnap)

        const oMap: Record<string, Operator> = {}
        operatorsSnap.docs.forEach((doc: any) => {
          const data = doc.data() as Operator
          if (doc.id) {
            oMap[doc.id] = { ...data, internalId: doc.id }
          }
        })

        setPackages(pkgs)
        setCompanyMap(cMap)
        setOperatorMap(oMap)
      } catch (error) {
        console.error("Error fetching scans data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const toggleRow = (code: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(code)) {
      newExpanded.delete(code)
    } else {
      newExpanded.add(code)
    }
    setExpandedRows(newExpanded)
  }

  const exportToCSV = () => {
    const headers = ['Scan Date', 'Barcode', 'Order Number', 'Courier & Speed', 'Product Type', 'MailPlus Scan', 'Real-time Status', 'Signed Customer', 'Franchisee', 'Operator', 'Receiver Details'];
    const rows = filteredPackages.map(pkg => {
      let customerNsId = null;
      if (pkg.scans && pkg.scans.length > 0) {
        const scanWithNsId = pkg.scans.find(s => s.customer_ns_id)
        if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id
      }
      const company = customerNsId ? companyMap[customerNsId] : null;
      
      let latestScan = pkg.scans?.[pkg.scans.length - 1];
      if (pkg.scans && pkg.scans.length > 0) {
        latestScan = pkg.scans.reduce((latest, current) => {
          return new Date(latest.updated_at) > new Date(current.updated_at) ? latest : current;
        }, pkg.scans[0]);
      }

      const courierSpeed = `${latestScan?.courier?.replace('_', ' ') || '-'} / ${latestScan?.delivery_speed || '-'}`;
      const recDetails = [latestScan?.receiver_suburb, latestScan?.state, latestScan?.post_code].filter(Boolean).join(', ');
      
      let operatorNsId = pkg.operator_ns_id;
      if (!operatorNsId && pkg.scans && pkg.scans.length > 0) {
        const scanWithOpNsId = pkg.scans.find(s => s.operator_ns_id);
        if (scanWithOpNsId) operatorNsId = scanWithOpNsId.operator_ns_id;
      }
      
      const operator = operatorNsId ? operatorMap[operatorNsId] : null;
      const operatorName = operator ? `${operator.givenNames} ${operator.surname}`.trim() : '-';

      return [
        latestScan ? new Date(latestScan.updated_at).toLocaleString() : '-',
        pkg.code,
        pkg.order_number || '-',
        courierSpeed,
        latestScan?.product_type || '-',
        latestScan?.scan_type || '-',
        pkg.real_time_status?.status || '-',
        company?.name || '-',
        company?.franchisee || '-',
        operatorName,
        recDetails || '-'
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `scans_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCheckStatus = async (pkg: PackageRecord) => {
    setStatusLoading(prev => ({ ...prev, [pkg.code]: true }));
    try {
      const identifier = pkg.code;
      
      const res = await fetch(`/api/tracking?identifier=${identifier}&packageId=${pkg.code}`);
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      
      // Update package state
      setPackages(prev => prev.map(p => 
        p.code === pkg.code 
          ? { 
              ...p, 
              real_time_status: { 
                status: data.status, 
                updated_at: data.updated_at || new Date().toISOString(), 
                delivered: data.delivered,
                estimated_delivery_date: data.estimated_delivery_date,
                last_location: data.last_location
              } 
            }
          : p
      ));
    } catch (error) {
      console.error(error);
    } finally {
      setStatusLoading(prev => ({ ...prev, [pkg.code]: false }));
    }
  };

  const handleBulkCheckStatus = async () => {
    if (selectedBarcodes.size === 0) return;
    
    try {
      const barcodesArray = Array.from(selectedBarcodes);
      const jobsRef = collection(firestore, 'sync_jobs');
      
      await addDoc(jobsRef, {
        barcodes: barcodesArray,
        status: 'pending',
        total: barcodesArray.length,
        completed: 0,
        created_at: serverTimestamp(),
      });
      
      // Deselect to prevent double click
      setSelectedBarcodes(new Set());
    } catch (error) {
      console.error("Failed to start bulk sync job:", error);
    }
  };

  // Compute unique options for multiselects
  const uniqueScanTypes = Array.from(new Set(packages.flatMap(p => p.scans?.map(s => s.scan_type)).filter(Boolean)))
    .map(s => ({label: s as string, value: s as string})).sort((a, b) => a.label.localeCompare(b.label));
  const uniqueCouriers = Array.from(new Set(packages.flatMap(p => p.scans?.map(s => s.courier)).filter(Boolean)))
    .map(c => ({label: (c as string).replace('_', ' '), value: c as string})).sort((a, b) => a.label.localeCompare(b.label));
  const uniqueSpeeds = Array.from(new Set(packages.flatMap(p => p.scans?.map(s => s.delivery_speed)).filter(Boolean)))
    .map(s => ({label: s as string, value: s as string})).sort((a, b) => a.label.localeCompare(b.label));
  const uniqueProductTypes = Array.from(new Set(packages.flatMap(p => p.scans?.map(s => s.product_type)).filter(Boolean)))
    .map(s => ({label: s as string, value: s as string})).sort((a, b) => a.label.localeCompare(b.label));
  const uniqueFranchisees = Array.from(new Set(Object.values(companyMap).map(c => c.franchisee).filter(Boolean)))
    .map(f => ({label: f as string, value: f as string})).sort((a, b) => a.label.localeCompare(b.label));

  const filteredPackages = packages.filter(pkg => {
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
    
    // Determine the latest scan for the new filters
    let latestScanFilter = pkg.scans?.[pkg.scans.length - 1];
    if (pkg.scans && pkg.scans.length > 0) {
      latestScanFilter = pkg.scans.reduce((latest, current) => {
        return new Date(latest.updated_at) > new Date(current.updated_at) ? latest : current;
      }, pkg.scans[0]);
    }

    if (filterDate) {
       const [y, m, d] = filterDate.split('-');
       const formattedSync = `${d}-${m}-${y}`;
       const hasMatchingScan = pkg.scans?.some(scan => scan.updated_at?.startsWith(filterDate));
       if (!hasMatchingScan && (!pkg.sync_date || typeof pkg.sync_date !== 'string' || !pkg.sync_date.includes(formattedSync))) return false;
    }

    if (filterRecipient && latestScanFilter) {
      const rec = filterRecipient.toLowerCase();
      const rName = latestScanFilter.receiver_name?.toLowerCase() || '';
      const rSub = latestScanFilter.receiver_suburb?.toLowerCase() || '';
      const rState = latestScanFilter.state?.toLowerCase() || '';
      const rPost = latestScanFilter.post_code?.toLowerCase() || '';
      if (!rName.includes(rec) && !rSub.includes(rec) && !rState.includes(rec) && !rPost.includes(rec)) return false;
    }

    if (selectedSpeed.length > 0 && (!latestScanFilter?.delivery_speed || !selectedSpeed.includes(latestScanFilter.delivery_speed))) return false;
    if (selectedScanType.length > 0 && (!latestScanFilter?.scan_type || !selectedScanType.includes(latestScanFilter.scan_type))) return false;
    if (selectedCourier.length > 0 && (!latestScanFilter?.courier || !selectedCourier.includes(latestScanFilter.courier))) return false;
    if (selectedFranchise.length > 0 && (!company?.franchisee || !selectedFranchise.includes(company.franchisee))) return false;
    if (selectedProductType.length > 0 && (!latestScanFilter?.product_type || !selectedProductType.includes(latestScanFilter.product_type))) return false;

    return true;
  });

  const sortedFilteredPackages = [...filteredPackages].sort((a, b) => {
    const getProps = (pkg: PackageRecord) => {
      let latest = pkg.scans?.[pkg.scans.length - 1];
      if (pkg.scans && pkg.scans.length > 0) {
        latest = pkg.scans.reduce((l, c) => new Date(l.updated_at) > new Date(c.updated_at) ? l : c, pkg.scans[0]);
      }
      const scanDate = latest ? new Date(latest.updated_at).getTime() : 0;
      
      let customerNsId = null;
      if (pkg.scans && pkg.scans.length > 0) {
        const scanWithNsId = pkg.scans.find(s => s.customer_ns_id)
        if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id
      }
      const customerName = (customerNsId ? companyMap[customerNsId]?.name : '') || '';
      const courierSpeed = `${latest?.courier || ''} ${latest?.delivery_speed || ''}`.toLowerCase();
      // Handle weights that might be empty or strings like "1.5 kg"
      const weightStr = typeof pkg.weight === 'string' ? pkg.weight.replace(/[^0-9.]/g, '') : '';
      const weight = parseFloat(weightStr) || 0;
      
      return { scanDate, customerName, courierSpeed, weight };
    };

    const propsA = getProps(a);
    const propsB = getProps(b);

    if (propsA.scanDate !== propsB.scanDate) {
      return propsB.scanDate - propsA.scanDate; // Scan Date Descending
    }
    if (propsA.customerName !== propsB.customerName) {
      return propsA.customerName.localeCompare(propsB.customerName); // Customer Ascending
    }
    if (propsA.courierSpeed !== propsB.courierSpeed) {
      return propsA.courierSpeed.localeCompare(propsB.courierSpeed); // Courier & Speed Ascending
    }
    return propsA.weight - propsB.weight; // Weight Ascending
  });

  const totalPages = Math.ceil(sortedFilteredPackages.length / itemsPerPage)
  const paginatedPackages = sortedFilteredPackages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <Loader />
        <p className="text-muted-foreground text-sm">Loading Scan Events...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Scan Events</h1>
          <p className="text-muted-foreground mt-1">Track package scanning events and linked customers.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedBarcodes.size > 0 && (
            <Button onClick={handleBulkCheckStatus} className="flex items-center gap-2" disabled={Object.values(statusLoading).some(Boolean)}>
              <RefreshCw className={`h-4 w-4 ${Object.values(statusLoading).some(Boolean) ? 'animate-spin' : ''}`} />
              Sync Selected ({selectedBarcodes.size})
            </Button>
          )}
          <Button variant="outline" onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-500" />
            Packages Directory
          </CardTitle>
          <CardDescription>All scanned packages synced from MailPlus API. Showing {filteredPackages.length} package(s).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
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
                  <Switch id="unlinked-filter-events" checked={filterUnlinked} onCheckedChange={setFilterUnlinked} className="scale-75 data-[state=checked]:bg-indigo-600" />
                  <label htmlFor="unlinked-filter-events" className="text-[10px] font-medium text-slate-500 cursor-pointer">Unlinked Only</label>
                </div>
              </div>
              <Input placeholder="E.g. Acme Corp" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} disabled={filterUnlinked} className={filterUnlinked ? "opacity-50 bg-slate-50" : ""} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Franchise</label>
              <MultiSelectCombobox options={uniqueFranchisees} selected={selectedFranchise} onSelectedChange={setSelectedFranchise} placeholder="Select Franchise..." />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Scan / Sync Date</label>
              <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Recipient (Suburb, State, Postcode)</label>
              <Input placeholder="E.g. Sydney" value={filterRecipient} onChange={e => setFilterRecipient(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Product Type</label>
              <MultiSelectCombobox options={uniqueProductTypes} selected={selectedProductType} onSelectedChange={setSelectedProductType} placeholder="Select Product..." />
            </div>
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
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[40px] pl-4">
                    <Checkbox 
                      checked={sortedFilteredPackages.length > 0 && sortedFilteredPackages.every(p => selectedBarcodes.has(p.code))}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedBarcodes);
                        if (checked) {
                          sortedFilteredPackages.forEach(p => newSelected.add(p.code));
                        } else {
                          sortedFilteredPackages.forEach(p => newSelected.delete(p.code));
                        }
                        setSelectedBarcodes(newSelected);
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="font-semibold text-slate-700">Scan Date</TableHead>
                  <TableHead className="font-semibold text-slate-700">Barcode</TableHead>
                  <TableHead className="font-semibold text-slate-700">Order Number</TableHead>
                  <TableHead className="font-semibold text-slate-700">Courier & Speed</TableHead>
                  <TableHead className="font-semibold text-slate-700">Product Type</TableHead>
                  <TableHead className="font-semibold text-slate-700">MailPlus Scan</TableHead>
                  <TableHead className="font-semibold text-slate-700">Real-time Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Signed Customer</TableHead>
                  <TableHead className="font-semibold text-slate-700">Franchisee</TableHead>
                  <TableHead className="font-semibold text-slate-700">Operator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPackages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                      No packages found. Wait for the daily sync to run.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPackages.map((pkg) => {
                    const isExpanded = expandedRows.has(pkg.code)
                    
                    // Determine Customer using the first available customer_ns_id from scans
                    let customerNsId = null;
                    if (pkg.scans && pkg.scans.length > 0) {
                      const scanWithNsId = pkg.scans.find(s => s.customer_ns_id)
                      if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id
                    }

                    const company = customerNsId ? companyMap[customerNsId] : null

                    // Determine the latest scan
                    let latestScan = pkg.scans?.[pkg.scans.length - 1] // assumes chronological or we can sort
                    if (pkg.scans && pkg.scans.length > 0) {
                      latestScan = pkg.scans.reduce((latest, current) => {
                        return new Date(latest.updated_at) > new Date(current.updated_at) ? latest : current;
                      }, pkg.scans[0]);
                    }

                    return (
                      <React.Fragment key={pkg.code}>
                        <TableRow className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggleRow(pkg.code)}>
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedBarcodes.has(pkg.code)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedBarcodes);
                                if (checked) {
                                  newSelected.add(pkg.code);
                                } else {
                                  newSelected.delete(pkg.code);
                                }
                                setSelectedBarcodes(newSelected);
                              }}
                            />
                          </TableCell>
                          <TableCell className="pl-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm">
                            {latestScan ? new Date(latestScan.updated_at).toLocaleString() : '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{pkg.code}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(pkg.code);
                                  toast.success('Barcode copied');
                                }}
                                className="text-slate-400 hover:text-indigo-600 focus:outline-none"
                                title="Copy Barcode"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{pkg.order_number || '-'}</span>
                              {pkg.order_number && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(pkg.order_number);
                                    toast.success('Order Number copied');
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 focus:outline-none"
                                  title="Copy Order Number"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex flex-col">
                              <span className="font-medium capitalize">{latestScan?.courier?.replace('_', ' ') || '-'}</span>
                              <span className="text-[10px] text-muted-foreground">{latestScan?.delivery_speed || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm capitalize">{latestScan?.product_type || '-'}</TableCell>
                          <TableCell>
                            {latestScan ? (
                              <Badge variant="outline" className={getBadgeColor(latestScan.scan_type)}>
                                {latestScan.scan_type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No Scans</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {pkg.real_time_status ? (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium truncate max-w-[150px]" title={pkg.real_time_status.status}>
                                    {pkg.real_time_status.status}
                                  </span>
                                  {pkg.real_time_status.last_location && (
                                    <span className="text-[10px] text-slate-600 truncate max-w-[150px]" title={pkg.real_time_status.last_location}>
                                      Loc: {pkg.real_time_status.last_location}
                                    </span>
                                  )}
                                  {pkg.real_time_status.estimated_delivery_date && (
                                    <span className="text-[10px] text-indigo-600 font-medium truncate max-w-[150px]">
                                      ETA: {new Date(pkg.real_time_status.estimated_delivery_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(pkg.real_time_status.updated_at).toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not checked</span>
                              )}
                              {!latestScan?.scan_type?.toLowerCase().includes('futile') && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCheckStatus(pkg); }}
                                  disabled={statusLoading[pkg.code]}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-indigo-600 disabled:opacity-50"
                                  title="Check latest status"
                                >
                                  <RefreshCw className={`h-3 w-3 ${statusLoading[pkg.code] ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {company ? (
                              <Link 
                                href={`/companies/${company.id}`} 
                                className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 text-sm font-medium"
                                target="_blank"
                              >
                                {company.name}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-slate-400 text-sm">
                                {customerNsId ? `Unknown (NS ID: ${customerNsId})` : 'Unlinked'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {company?.franchisee || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {(() => {
                              let operatorNsId = pkg.operator_ns_id;
                              if (!operatorNsId && pkg.scans && pkg.scans.length > 0) {
                                const scanWithOpNsId = pkg.scans.find(s => s.operator_ns_id);
                                if (scanWithOpNsId) operatorNsId = scanWithOpNsId.operator_ns_id;
                              }
                              if (operatorNsId && operatorMap[operatorNsId]) {
                                const op = operatorMap[operatorNsId];
                                return (
                                  <div className="flex flex-col">
                                    <span className="font-medium">{`${op.givenNames} ${op.surname}`.trim()}</span>
                                    {op.contactPhone && (
                                      <span className="text-[10px] text-muted-foreground">{op.contactPhone}</span>
                                    )}
                                  </div>
                                );
                              }
                              return '-';
                            })()}
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Scans Sub-table */}
                        {isExpanded && (
                          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                            <TableCell colSpan={11} className="p-0 border-b-0">
                              <div className="px-14 py-4 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div className="bg-white p-3 rounded border shadow-sm">
                                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Package Details</h5>
                                    <div className="space-y-1 text-sm text-slate-700">
                                      <p><span className="font-medium">Manifested At:</span> {pkg.manifested_at ? new Date(pkg.manifested_at).toLocaleString() : '-'}</p>
                                      <p><span className="font-medium">Weight:</span> {pkg.weight || '-'}</p>
                                    </div>
                                  </div>
                                  <div className="bg-white p-3 rounded border shadow-sm">
                                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Delivery Details</h5>
                                    <div className="space-y-1 text-sm text-slate-700">
                                      <p><span className="font-medium">Speed:</span> {latestScan?.delivery_speed || '-'}</p>
                                      <p><span className="font-medium">Zone:</span> {latestScan?.delivery_zone || '-'}</p>
                                      <p><span className="font-medium">Depot ID:</span> {latestScan?.depot_id || '-'}</p>
                                    </div>
                                  </div>
                                  <div className="bg-white p-3 rounded border shadow-sm">
                                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recipient Details</h5>
                                    <div className="space-y-1 text-sm text-slate-700">
                                      <p className="font-medium">{latestScan?.receiver_name || '-'}</p>
                                      <p>{latestScan?.email || '-'}</p>
                                      <p>{latestScan?.phone || '-'}</p>
                                      <p className="text-xs text-slate-500">
                                        {[latestScan?.address1, latestScan?.address2, latestScan?.receiver_suburb, latestScan?.state, latestScan?.post_code].filter(Boolean).join(', ')}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-2 mb-1">
                                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-slate-500" />
                                    Scan History
                                  </h4>
                                  <Link href={`/admin/tickets/create?identifier=${pkg.code}`} onClick={e => e.stopPropagation()}>
                                    <Button variant="outline" size="sm" className="flex items-center gap-2 h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                      <PlusCircle className="h-3.5 w-3.5" />
                                      Create Ticket
                                    </Button>
                                  </Link>
                                </div>
                                {pkg.scans && pkg.scans.length > 0 ? (
                                  <div className="rounded border bg-white shadow-sm overflow-hidden">
                                    <Table>
                                      <TableHeader className="bg-slate-100/50">
                                        <TableRow>
                                          <TableHead className="h-8 text-xs">Date</TableHead>
                                          <TableHead className="h-8 text-xs">Type</TableHead>
                                          <TableHead className="h-8 text-xs">Courier</TableHead>
                                          <TableHead className="h-8 text-xs">Receiver</TableHead>
                                          <TableHead className="h-8 text-xs">Details</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {pkg.scans.map((scan) => (
                                          <TableRow key={scan.id}>
                                            <TableCell className="text-xs text-slate-600">
                                              {new Date(scan.updated_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-xs font-medium">
                                              <Badge variant="outline" className={getBadgeColor(scan.scan_type) + " text-[10px] px-1 py-0 h-5"}>
                                                {scan.scan_type}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs capitalize text-slate-600">
                                              {scan.courier?.replace('_', ' ')}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600">
                                              {scan.receiver_name} {scan.receiver_suburb ? `(${scan.receiver_suburb})` : ''}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500 max-w-xs truncate" title={scan.futile_reason}>
                                              {scan.futile_reason || '-'}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500">No scan events recorded for this package.</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-slate-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPackages.length)} of {filteredPackages.length} packages
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-600 px-2">Page {currentPage} of {totalPages}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
