'use client'

import React, { useEffect, useState } from 'react'
import { firestore } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
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
import { ChevronDown, ChevronRight, Package, Truck, ExternalLink } from 'lucide-react'
import Link from 'next/link'

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
}

interface PackageRecord {
  code: string;
  manifested_at: string | null;
  weight: string;
  order_number: string;
  sync_date: string;
  scans: Scan[];
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
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [filterBarcode, setFilterBarcode] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterScanDate, setFilterScanDate] = useState('')
  const [filterSyncDate, setFilterSyncDate] = useState('')
  const [filterOrderNumber, setFilterOrderNumber] = useState('')
  const [selectedSpeed, setSelectedSpeed] = useState<string[]>([])
  const [selectedScanType, setSelectedScanType] = useState<string[]>([])
  const [selectedCourier, setSelectedCourier] = useState<string[]>([])
  const [selectedFranchise, setSelectedFranchise] = useState<string[]>([])

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
        
        const [companiesSnap, leadsSnap] = await Promise.all([
          getDocs(collection(firestore, 'companies')),
          getDocs(collection(firestore, 'leads'))
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

        setPackages(pkgs)
        setCompanyMap(cMap)
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

  // Compute unique options for multiselects
  const uniqueScanTypes = Array.from(new Set(packages.flatMap(p => p.scans?.map(s => s.scan_type)).filter(Boolean)))
    .map(s => ({label: s as string, value: s as string}));
  const uniqueCouriers = Array.from(new Set(packages.flatMap(p => p.scans?.map(s => s.courier)).filter(Boolean)))
    .map(c => ({label: (c as string).replace('_', ' '), value: c as string}));
  const uniqueSpeeds = Array.from(new Set(packages.flatMap(p => p.scans?.map(s => s.delivery_speed)).filter(Boolean)))
    .map(s => ({label: s as string, value: s as string}));
  const uniqueFranchisees = Array.from(new Set(Object.values(companyMap).map(c => c.franchisee).filter(Boolean)))
    .map(f => ({label: f as string, value: f as string}));

  const filteredPackages = packages.filter(pkg => {
    let customerNsId = null;
    if (pkg.scans && pkg.scans.length > 0) {
      const scanWithNsId = pkg.scans.find(s => s.customer_ns_id)
      if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id
    }
    const company = customerNsId ? companyMap[customerNsId] : null;
    const companyName = company ? company.name.toLowerCase() : '';

    if (filterBarcode && !pkg.code.toLowerCase().includes(filterBarcode.toLowerCase())) return false;
    if (filterOrderNumber && (!pkg.order_number || !pkg.order_number.toLowerCase().includes(filterOrderNumber.toLowerCase()))) return false;
    if (filterCustomer && !companyName.includes(filterCustomer.toLowerCase())) return false;
    // sync_date is like DD-MM-YYYY, filterSyncDate is YYYY-MM-DD
    if (filterSyncDate) {
       const [y, m, d] = filterSyncDate.split('-');
       const formattedSync = `${d}-${m}-${y}`;
       if (!pkg.sync_date.includes(formattedSync)) return false;
    }
    if (filterScanDate) {
      const hasMatchingScan = pkg.scans?.some(scan => scan.updated_at.startsWith(filterScanDate));
      if (!hasMatchingScan) return false;
    }
    
    // Determine the latest scan for the new filters
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

    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader size="lg" message="Loading Scan Events..." />
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
              <label className="text-xs font-medium text-slate-700 mb-1 block">Signed Customer</label>
              <Input placeholder="E.g. Acme Corp" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Franchise</label>
              <MultiSelectCombobox options={uniqueFranchisees} selected={selectedFranchise} onSelectedChange={setSelectedFranchise} placeholder="Select Franchise..." />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Scan Date</label>
              <Input type="date" value={filterScanDate} onChange={e => setFilterScanDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Sync Date</label>
              <Input type="date" value={filterSyncDate} onChange={e => setFilterSyncDate(e.target.value)} />
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
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="font-semibold text-slate-700">Scan Date</TableHead>
                  <TableHead className="font-semibold text-slate-700">Barcode</TableHead>
                  <TableHead className="font-semibold text-slate-700">Order Number</TableHead>
                  <TableHead className="font-semibold text-slate-700">Latest Scan</TableHead>
                  <TableHead className="font-semibold text-slate-700">Signed Customer</TableHead>
                  <TableHead className="font-semibold text-slate-700">Franchisee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPackages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No packages found. Wait for the daily sync to run.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPackages.map((pkg) => {
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
                          <TableCell className="pl-4">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm">
                            {latestScan ? new Date(latestScan.updated_at).toLocaleString() : '-'}
                          </TableCell>
                          <TableCell className="font-medium">{pkg.code}</TableCell>
                          <TableCell>{pkg.order_number || '-'}</TableCell>
                          <TableCell>
                            {latestScan ? (
                              <Badge variant="outline" className={getBadgeColor(latestScan.scan_type)}>
                                {latestScan.scan_type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No Scans</span>
                            )}
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
                        </TableRow>
                        
                        {/* Expanded Scans Sub-table */}
                        {isExpanded && (
                          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                            <TableCell colSpan={7} className="p-0 border-b-0">
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
                                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-slate-500" />
                                  Scan History
                                </h4>
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
        </CardContent>
      </Card>
    </div>
  )
}
