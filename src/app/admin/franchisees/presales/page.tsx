'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { TerritoryPresaleWizard } from '@/components/admin/territory-presale-wizard';
import { PresaleRecord } from '@/lib/presale-types';
import { getAllFranchisees } from '@/services/firebase';
import { Franchisee } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

export default function TerritoryPresalesPage() {
  const [presales, setPresales] = useState<PresaleRecord[]>([]);
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

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

      if (pRes.success && Array.isArray(pRes.data)) {
        setPresales(pRes.data);
      }
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

  const filteredPresales = useMemo(() => {
    return presales.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesText =
        !q ||
        p.franchiseeName?.toLowerCase().includes(q) ||
        p.mainDetails?.tradingEntity?.toLowerCase().includes(q) ||
        p.mainDetails?.mainContact?.toLowerCase().includes(q) ||
        p.mainDetails?.email?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

      return matchesText && matchesStatus;
    });
  }, [presales, searchQuery, statusFilter]);

  const handleOpenWizard = (id: string) => {
    setSelectedFranchiseeId(id);
    setWizardOpen(true);
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
            <SelectTrigger className="w-[260px] text-xs">
              <SelectValue placeholder="Mark Territory for Sale..." />
            </SelectTrigger>
            <SelectContent>
              {franchisees.map((f) => (
                <SelectItem key={f.internalId} value={String(f.internalId)}>
                  {f.name} ({f.internalId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedFranchiseeId && (
            <Button
              onClick={() => setWizardOpen(true)}
              className="bg-[#095c7b] hover:bg-[#07465e] text-white text-xs gap-1.5"
            >
              <Plus className="h-4 w-4" /> Open Presale Wizard
            </Button>
          )}
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
          <SelectTrigger className="w-[200px] text-xs bg-white">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Presale Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Deed Pending">Deed Pending</SelectItem>
            <SelectItem value="Deed Signed">Deed Signed</SelectItem>
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
                <TableHead className="text-xs font-bold uppercase text-slate-700">Status</TableHead>
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
                    <Badge variant="outline" className="font-semibold text-[11px]">
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

      {/* Territory Presale Wizard Modal */}
      {selectedFranchiseeId && (
        <TerritoryPresaleWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          franchiseeId={selectedFranchiseeId}
          franchiseeName={franchisees.find((f) => String(f.internalId) === String(selectedFranchiseeId))?.name || ''}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
