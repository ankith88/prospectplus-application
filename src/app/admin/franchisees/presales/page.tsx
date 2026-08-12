'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Search, Tag, FileCheck, Building2, Plus, Edit3, ShieldAlert } from 'lucide-react';
import { PresaleRecord } from '@/lib/presale-types';
import { getAllFranchisees } from '@/services/firebase';
import { Franchisee } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

export default function TerritoryPresalesPage() {
  const router = useRouter();
  const [presales, setPresales] = useState<PresaleRecord[]>([]);
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string | null>(null);

  const { userProfile, isSuperAdmin } = useAuth();
  const isAdminOrOps =
    isSuperAdmin ||
    ['admin', 'operations', 'Operations', 'Operations Manager', 'Sales Manager'].includes(
      userProfile?.activeRole || userProfile?.role || ''
    );

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, franList] = await Promise.all([
        fetch('/api/franchisees/presales').then((r) => r.json()),
        getAllFranchisees(),
      ]);

      const fetchedPresales: PresaleRecord[] = (pRes.success && Array.isArray(pRes.data)) ? pRes.data : [];

      // Build comprehensive franchisee lookup map supporting internalId, id, and prospectPlusId
      const franchiseesMap = new Map<string, Franchisee>();
      (franList || []).forEach((f) => {
        if (f.internalId) franchiseesMap.set(String(f.internalId), f);
        if (f.id) franchiseesMap.set(String(f.id), f);
        if ((f as any).prospectPlusId) franchiseesMap.set(String((f as any).prospectPlusId), f);
      });

      // Ensure all fetched presales have franchiseeName, franchiseeId and mainDetails
      const enrichedPresales = fetchedPresales.map((p) => {
        const pId = String(p.franchiseeId || p.id || '');
        const f = franchiseesMap.get(pId);
        return {
          ...p,
          franchiseeId: pId,
          franchiseeName: (p.franchiseeName && p.franchiseeName !== pId) ? p.franchiseeName : p.mainDetails?.tradingEntity || f?.name || pId,
        };
      });

      // Include any franchisee marked for sale that hasn't created a presale doc yet
      (franList || []).forEach((f: any) => {
        const possibleIds = [String(f.internalId), String(f.id), String(f.prospectPlusId)].filter(Boolean);
        const alreadyIncluded = enrichedPresales.some((p) =>
          possibleIds.includes(String(p.franchiseeId)) || possibleIds.includes(String(p.id))
        );

        if ((f.isForSale || f.presaleStatus) && !alreadyIncluded) {
          const mainId = String(f.internalId || f.id || f.prospectPlusId);
          enrichedPresales.push({
            id: mainId,
            franchiseeId: mainId,
            franchiseeName: f.name || mainId,
            status: (f.presaleStatus as any) || 'Step 1: Main Details',
            step1Status: 'Completed',
            step2Status: 'Not Started',
            step3Status: 'Not Started',
            step4Status: 'Not Started',
            mainDetails: {
              tradingEntity: f.name || '',
              mainContact: f.mainContact || '',
              mobileNumber: f.mobile || '',
              email: f.email || '',
              abn: f.abn || '',
              dateListedForSale: new Date().toISOString().split('T')[0],
              address: typeof f.address === 'string' ? f.address : '',
            },
            deedOfVariation: { status: 'not_started' },
            presalesDetails: {
              commencementDate: '',
              expiryDate: f.expiryDate || '',
              ultimateExpiryDate: f.ultimateExpiryDate || '',
              unlimitedTermOffer: f.unlimitedTermOffer || '',
              unlimitedTermFee: 0,
              renewalTermsYears: 0,
              termOnFranchiseeIM: '',
              dateBusinessStarted: f.dateBusinessStarted || '',
              totalDailyRunTime: '',
              lowPrice: 0,
              highPrice: 0,
              serviceRevenue: '',
              serviceRevenueYear: '',
              mpexCommission: 0,
              mpexCommissionYear: '',
              sendleCommission: 0,
              sendleCommissionYear: '',
              salesCommissionPercent: 0,
              nabAccreditation: '',
              nabAccreditationFee: 0,
              salePrice: '',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      });

      setPresales(enrichedPresales);
      setFranchisees(franList || []);
    } catch (err) {
      console.error('Failed to load presales data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sortedFranchisees = useMemo(() => {
    return [...franchisees].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [franchisees]);

  const filteredPresales = useMemo(() => {
    return presales.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesText =
        !q ||
        p.franchiseeName?.toLowerCase().includes(q) ||
        p.mainDetails?.tradingEntity?.toLowerCase().includes(q) ||
        p.mainDetails?.mainContact?.toLowerCase().includes(q) ||
        p.mainDetails?.email?.toLowerCase().includes(q) ||
        p.franchiseeId?.toLowerCase().includes(q);

      let matchesStatus = statusFilter === 'all';
      if (!matchesStatus) {
        const pStatus = p.status as string;
        if (statusFilter === 'Draft' || statusFilter === 'Step 1: Main Details') {
          matchesStatus = pStatus === 'Draft' || pStatus === 'Step 1: Main Details';
        } else if (statusFilter === 'Deed Pending' || statusFilter === 'Step 2: Deed Pending') {
          matchesStatus = pStatus === 'Deed Pending' || pStatus === 'Step 2: Deed Pending';
        } else if (statusFilter === 'Deed Signed' || statusFilter === 'Step 3: Verification Pending') {
          matchesStatus = pStatus === 'Deed Signed' || pStatus === 'Step 3: Verification Pending';
        } else if (statusFilter === 'Step 4: Presales Details') {
          matchesStatus = pStatus === 'Step 4: Presales Details';
        } else {
          matchesStatus = pStatus === statusFilter;
        }
      }

      return matchesText && matchesStatus;
    });
  }, [presales, searchQuery, statusFilter]);

  const handleOpenWizard = (id: string) => {
    router.push(`/admin/franchisees/presales/${id}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="h-7 w-7 text-[#095c7b]" />
            Territory Presales & Exit Program Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage franchisees marking their territories for sale, Deed of Variation digital signatures, and presale valuations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedFranchiseeId || ''}
            onValueChange={(val) => {
              if (val) handleOpenWizard(val);
            }}
          >
            <SelectTrigger className="w-[280px] text-xs">
              <SelectValue placeholder="Select Territory to Mark for Sale..." />
            </SelectTrigger>
            <SelectContent>
              {sortedFranchisees.map((f) => {
                const idVal = f.internalId || (f as any).id;
                return (
                  <SelectItem key={idVal} value={String(idVal)}>
                    {f.name} ({idVal})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by territory, franchisee name, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-white"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[240px] text-xs bg-white">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Presale Statuses</SelectItem>
            <SelectItem value="Step 1: Main Details">Step 1: Main Details (Draft)</SelectItem>
            <SelectItem value="Step 2: Deed Pending">Step 2: Deed Pending</SelectItem>
            <SelectItem value="Step 3: Verification Pending">Step 3: Verification / Deed Signed</SelectItem>
            <SelectItem value="Step 4: Franchisee IM Confirmation">Step 4: Franchisee IM Confirmation</SelectItem>
            <SelectItem value="Active Presale">Active Presale</SelectItem>
            <SelectItem value="Sold">Sold</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader className="mx-auto text-[#095c7b]" />
            <p className="text-sm text-slate-500 font-medium">Loading presale territories...</p>
          </div>
        ) : filteredPresales.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-slate-700 text-base">No Presale Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Select a franchisee from the top dropdown to mark their territory as for sale and begin presales.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase text-slate-700">Franchisee / Territory</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-700">Main Contact & Email</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-700">Date Listed</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-700">Deed of Variation</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-700">Sale Price ($)</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-700">Presale Status</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPresales.map((presale) => (
                <TableRow key={presale.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell className="font-medium text-xs text-slate-900">
                    <div className="font-bold text-[#095c7b]">{presale.mainDetails?.tradingEntity || presale.franchiseeName}</div>
                    <div className="text-[11px] text-slate-400">ID: {presale.franchiseeId}</div>
                  </TableCell>

                  <TableCell className="text-xs text-slate-700">
                    <div>{presale.mainDetails?.mainContact || 'N/A'}</div>
                    <div className="text-[11px] text-slate-400">{presale.mainDetails?.email || 'N/A'}</div>
                  </TableCell>

                  <TableCell className="text-xs text-slate-700">
                    {presale.mainDetails?.dateListedForSale || 'N/A'}
                  </TableCell>

                  <TableCell className="text-xs">
                    {presale.deedOfVariation?.status === 'signed_online' && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px]">
                        Signed Online
                      </Badge>
                    )}
                    {presale.deedOfVariation?.status === 'pdf_uploaded' && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[11px]">
                        PDF Uploaded
                      </Badge>
                    )}
                    {(!presale.deedOfVariation?.status || presale.deedOfVariation?.status === 'not_started') && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[11px]">
                        Pending Deed
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-xs font-bold text-emerald-700">
                    ${Number(presale.presalesDetails?.salePrice || 0).toLocaleString()}
                  </TableCell>

                  <TableCell className="text-xs">
                    <Badge
                      className={
                        presale.status === 'Active Presale'
                          ? 'bg-emerald-600 text-white font-bold text-[11px]'
                          : presale.status === 'Step 4: Franchisee IM Confirmation'
                          ? 'bg-blue-600 text-white font-bold text-[11px]'
                          : presale.status === 'Cancelled'
                          ? 'bg-red-100 text-red-800 border-red-300 font-bold text-[11px]'
                          : 'bg-slate-100 text-slate-800 border-slate-300 font-semibold text-[11px]'
                      }
                    >
                      {presale.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenWizard(presale.franchiseeId)}
                      className="text-xs gap-1 border-[#095c7b] text-[#095c7b] hover:bg-[#095c7b]/10"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Manage Presale
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

    </div>
  );
}
