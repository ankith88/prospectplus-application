'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Franchisee, Operator, UserProfile } from '@/lib/types';
import { getAllFranchisees, getAllUsers, getOperatorsForFranchisee, updateFranchiseeCampaigns } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, MapPin, Download, RefreshCw, Tag, Upload, FileText, ExternalLink,
  Users, CreditCard, Building2, Calendar, Phone, Mail, ShieldCheck, UserCheck,
  CheckCircle2, Info, UserX, AlertCircle, HeartHandshake, FileCheck, Landmark
} from 'lucide-react';
import { SmsDialog } from '@/components/sms-dialog';
import { EmailDialog } from '@/components/email-dialog';
import { useAuth } from '@/hooks/use-auth';
import { BulkImportOperators } from '@/components/admin/bulk-import-operators';
import { UploadAgreementDialog } from '@/components/admin/upload-agreement-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';


export function getLinkedUsersForFranchisee(f: Franchisee | null, allUsers: UserProfile[]) {
  if (!f) return [];
  const fIdStr = String(f.internalId || f.id || '');
  const fIdNum = Number(f.internalId || f.id);

  const matchedFromUsersCol = allUsers.filter(u => {
    if (!u) return false;
    const uFranId = String(u.franchiseeId || u.franchiseeInternalId || '');
    if (uFranId && (uFranId === fIdStr || (fIdNum && uFranId === String(fIdNum)))) {
      return true;
    }
    if (Array.isArray(u.linkedFranchiseeIds)) {
      if (u.linkedFranchiseeIds.some(id => String(id) === fIdStr || (fIdNum && String(id) === String(fIdNum)))) {
        return true;
      }
    }
    if (Array.isArray(f.linkedUserIds) && u.uid && f.linkedUserIds.includes(u.uid)) {
      return true;
    }
    if (f.linkedUserEmail && u.email && f.linkedUserEmail.toLowerCase() === u.email.toLowerCase()) {
      return true;
    }
    if (f.currentOwnerUserId && u.uid && f.currentOwnerUserId === u.uid) {
      return true;
    }
    return false;
  });

  const userMap = new Map<string, any>();

  matchedFromUsersCol.forEach(u => {
    const rawAny = u as any;
    const bankDetails = rawAny.bankAccount || rawAny.bankDetails || {
      accountName: rawAny.bankAccountName || '',
      bsb: rawAny.bsbNumber || '',
      accountNumber: rawAny.bankAccountNumber || '',
    };
    const addressDetails = rawAny.address || rawAny.addressDetails || {
      street: rawAny.address1 || rawAny.street || '',
      suburb: rawAny.suburb || '',
      state: rawAny.state || '',
      postcode: rawAny.postcode || '',
      fullAddress: rawAny.registeredAddress || rawAny.fullAddress || '',
    };

    const userKey = u.uid || u.email;
    userMap.set(userKey, {
      userId: u.uid,
      name: u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
      email: u.email,
      personalEmail: rawAny.personalEmail || '',
      mobile: u.phoneNumber || u.mobileNumber || rawAny.mobile || '',
      role: u.activeRole || rawAny.role || 'Franchisee',
      relationship: rawAny.typeOfOwner || (u.activeRole?.toLowerCase().includes('owner') ? 'owner' : u.activeRole?.toLowerCase().includes('investor') ? 'investor' : 'owner'),
      abn: rawAny.abn || '',
      dateOfBirth: rawAny.dateOfBirth || '',
      businessStartDate: rawAny.businessStartDate || '',
      bankDetails: {
        accountName: bankDetails.accountName || bankDetails.bankAccountName || rawAny.bankAccountName || '',
        bsb: bankDetails.bsb || bankDetails.bsbNumber || rawAny.bsbNumber || '',
        accountNumber: bankDetails.accountNumber || bankDetails.bankAccountNumber || rawAny.bankAccountNumber || '',
      },
      addressDetails: {
        street: addressDetails.street || addressDetails.address1 || '',
        suburb: addressDetails.suburb || '',
        state: addressDetails.state || '',
        postcode: addressDetails.postcode || '',
        fullAddress: addressDetails.fullAddress || addressDetails.registeredAddress || [addressDetails.street || addressDetails.address1, addressDetails.suburb, addressDetails.state, addressDetails.postcode].filter(Boolean).join(', ') || '',
      },
      nextOfKin: rawAny.nextOfKin || null,
      agreements: rawAny.franchiseeAgreements || rawAny.agreements || [],
      rawUser: u,
    });
  });

  if (Array.isArray(f.linkedUsers)) {
    f.linkedUsers.forEach((lu: any) => {
      const key = lu.userId || lu.email;
      if (key && !userMap.has(key)) {
        userMap.set(key, {
          userId: lu.userId,
          name: lu.name || lu.email,
          email: lu.email,
          personalEmail: lu.personalEmail || '',
          mobile: lu.mobile || '',
          role: 'Franchisee',
          relationship: lu.relationship || 'owner',
          abn: lu.abn || '',
          bankDetails: lu.bankDetails || {},
          addressDetails: lu.addressDetails || {},
        });
      }
    });
  }

  if (Array.isArray(f.owners)) {
    f.owners.forEach((ow: any) => {
      const key = ow.userId || ow.email;
      if (key && !userMap.has(key)) {
        userMap.set(key, {
          userId: ow.userId,
          name: ow.name || ow.email,
          email: ow.email,
          personalEmail: ow.personalEmail || '',
          mobile: ow.mobile || '',
          role: 'Franchisee Owner',
          relationship: 'owner',
          abn: ow.abn || '',
          bankDetails: ow.bankDetails || {},
          addressDetails: ow.addressDetails || {},
        });
      }
    });
  }

  if (Array.isArray(f.investors)) {
    f.investors.forEach((inv: any) => {
      const key = inv.userId || inv.email;
      if (key && !userMap.has(key)) {
        userMap.set(key, {
          userId: inv.userId,
          name: inv.name || inv.email,
          email: inv.email,
          personalEmail: inv.personalEmail || '',
          mobile: inv.mobile || '',
          role: 'Franchisee Investor',
          relationship: 'investor',
          abn: inv.abn || '',
          bankDetails: inv.bankDetails || {},
          addressDetails: inv.addressDetails || {},
        });
      }
    });
  }

  return Array.from(userMap.values());
}

export default function FranchiseeDirectoryClient() {
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFranchisee, setSelectedFranchisee] = useState<Franchisee | null>(null);
  const [uploadDialogFranchisee, setUploadDialogFranchisee] = useState<Franchisee | null>(null);
  const [lpoNames, setLpoNames] = useState<Record<string, string>>({});
  const [nominatedLpoNames, setNominatedLpoNames] = useState<Record<string, string>>({});
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [territoryQuery, setTerritoryQuery] = useState('');
  const [campaignQuery, setCampaignQuery] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'company' | 'franchisee'>('all');


  // Dialog states
  const [emailDialogTarget, setEmailDialogTarget] = useState<{ email: string, name: string } | null>(null);
  const [smsDialogTarget, setSmsDialogTarget] = useState<{ phone: string, name: string } | null>(null);
  const [campaignsDialogTarget, setCampaignsDialogTarget] = useState<Franchisee | null>(null);
  const [editingCampaigns, setEditingCampaigns] = useState<{ campaign: string; priority: 'High' | 'Medium' | 'Low' }[]>([]);
  const [savingCampaigns, setSavingCampaigns] = useState(false);

  // Selection & Sync states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);

  const { user, userProfile, isSuperAdmin } = useAuth();
  const isUserRole = userProfile?.activeRole === 'user' || userProfile?.activeRole?.toLowerCase() === 'user' || userProfile?.role === 'user';
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const [data, usersData] = await Promise.all([
          getAllFranchisees(),
          getAllUsers().catch(err => {
            console.error("Failed to load users for directory:", err);
            return [] as UserProfile[];
          })
        ]);
        const sortedData = data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setFranchisees(sortedData);
        setAllUsers(usersData || []);

        const uniqueNominatedLpoIds = new Set<string>();
        data.forEach(f => {
          if (f.nominatedPostOffice) {
            uniqueNominatedLpoIds.add(f.nominatedPostOffice);
          }
        });

        const nominatedNamesRecord: Record<string, string> = {};
        await Promise.allSettled(
          Array.from(uniqueNominatedLpoIds).map(async (id) => {
            try {
              const snap = await getDoc(doc(firestore, 'partner_locations', id));
              if (snap.exists()) {
                nominatedNamesRecord[id] = snap.data().name;
              }
            } catch (e) {
              console.error("Failed to fetch nominated LPO name for", id);
            }
          })
        );
        setNominatedLpoNames(nominatedNamesRecord);
      } catch (error) {
        console.error('Failed to load franchisees:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function fetchLpoNamesForSelected() {
      if (!selectedFranchisee || !selectedFranchisee.ausPostSuburbsJson) return;
      
      const uniqueLpoIds = Array.from(
        new Set(
          selectedFranchisee.ausPostSuburbsJson
            .map((t: any) => t.parent_lpo_id)
            .filter(Boolean)
        )
      ) as string[];

      if (uniqueLpoIds.length === 0) return;

      const missingIds = uniqueLpoIds.filter(id => !lpoNames[id]);
      if (missingIds.length === 0) return;

      await Promise.allSettled(
        missingIds.map(async (id) => {
          try {
            const res = await fetch(`/api/lpo/${id}`);
            const json = await res.json();
            if (json.success && json.name) {
              setLpoNames(prev => ({
                ...prev,
                [id]: json.name
              }));
            }
          } catch (e) {
            console.error("Failed to fetch LPO name for", id);
          }
        })
      );
    }
    fetchLpoNamesForSelected();
  }, [selectedFranchisee]);

  const filteredFranchisees = useMemo(() => {
    return franchisees.filter((franchisee) => {
      const q = searchQuery.toLowerCase();
      const linked = getLinkedUsersForFranchisee(franchisee, allUsers);
      const matchesLinked = linked.some(
        lu => lu.name?.toLowerCase().includes(q) || lu.email?.toLowerCase().includes(q)
      );

      const matchesText = !q || 
        franchisee.name?.toLowerCase().includes(q) ||
        franchisee.mainContact?.toLowerCase().includes(q) ||
        franchisee.email?.toLowerCase().includes(q) ||
        matchesLinked;

      const tq = territoryQuery.toLowerCase();
      let matchesTerritory = !tq;

      if (tq && !matchesTerritory) {
        const inMain = franchisee.territoryJson?.some(t => 
          t.suburbs?.toLowerCase().includes(tq) || 
          t.state?.toLowerCase().includes(tq) || 
          t.post_code?.toLowerCase().includes(tq)
        );
        const inStarTrack = franchisee.mpStarTrackActivated && franchisee.starTrackSuburbsJson?.some(t => 
          t.suburbs?.toLowerCase().includes(tq) || 
          t.state?.toLowerCase().includes(tq) || 
          t.post_code?.toLowerCase().includes(tq)
        );

        const inAusPost = franchisee.ausPostSuburbsJson?.some(t => 
          t.suburbs?.toLowerCase().includes(tq) || 
          t.state?.toLowerCase().includes(tq) || 
          t.post_code?.toLowerCase().includes(tq)
        );

        matchesTerritory = !!(inMain || inStarTrack || inAusPost);
      }

      const cq = campaignQuery.toLowerCase();
      const matchesCampaign = !cq || 
        franchisee.campaignPriorities?.some(cp => cp.campaign.toLowerCase().includes(cq));

      const matchesOwnership =
        ownershipFilter === 'all' ||
        (ownershipFilter === 'company' && !!franchisee.isCompanyOwned) ||
        (ownershipFilter === 'franchisee' && !franchisee.isCompanyOwned);

      return matchesText && matchesTerritory && matchesCampaign && matchesOwnership;
    });
  }, [franchisees, allUsers, searchQuery, territoryQuery, campaignQuery, ownershipFilter]);

  const sortedFranchisees = useMemo(() => {
    if (!campaignQuery) return filteredFranchisees;
    const cq = campaignQuery.toLowerCase();
    const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
    
    return [...filteredFranchisees].sort((a, b) => {
      const aPriority = a.campaignPriorities?.find(cp => cp.campaign.toLowerCase().includes(cq))?.priority;
      const bPriority = b.campaignPriorities?.find(cp => cp.campaign.toLowerCase().includes(cq))?.priority;
      
      const aWeight = aPriority ? priorityWeight[aPriority] : 0;
      const bWeight = bPriority ? priorityWeight[bPriority] : 0;
      
      return bWeight - aWeight;
    });
  }, [filteredFranchisees, campaignQuery]);

  const canEditCampaigns = useMemo(() => {
    if (!userProfile) return false;
    const allowedRoles = ['admin', 'Sales Manager', 'Marketing Manager', 'Lead Gen Admin'];
    if (userProfile.role && allowedRoles.includes(userProfile.role)) return true;
    if (userProfile.assignedRoles && userProfile.assignedRoles.some((r: string) => allowedRoles.includes(r))) return true;
    return false;
  }, [userProfile]);

  const canUploadAgreement = useMemo(() => {
    if (isSuperAdmin) return true;
    const role = (userProfile?.activeRole || userProfile?.role || '').toLowerCase();
    const assigned = (userProfile?.assignedRoles || []).map((r: string) => (r || '').toLowerCase());
    return (
      role === 'admin' ||
      role === 'operations' ||
      role.includes('operations') ||
      assigned.includes('admin') ||
      assigned.includes('operations')
    );
  }, [isSuperAdmin, userProfile]);

  const reloadFranchisees = async () => {
    try {
      const [data, usersData] = await Promise.all([
        getAllFranchisees(),
        getAllUsers().catch(() => [] as UserProfile[])
      ]);
      const sortedData = data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setFranchisees(sortedData);
      setAllUsers(usersData || []);
      if (selectedFranchisee) {
        const updated = sortedData.find(f => f.internalId === selectedFranchisee.internalId);
        if (updated) setSelectedFranchisee(updated);
      }
    } catch (e) {
      console.error("Failed to reload franchisees:", e);
    }
  };

  const handleSaveCampaigns = async () => {
    if (!campaignsDialogTarget) return;
    setSavingCampaigns(true);
    try {
      const newCampaigns = editingCampaigns.filter(c => c.campaign.trim() !== '');
      await updateFranchiseeCampaigns(campaignsDialogTarget.internalId, newCampaigns);
      setFranchisees(prev => prev.map(f => f.internalId === campaignsDialogTarget.internalId ? { ...f, campaignPriorities: newCampaigns } : f));
      setCampaignsDialogTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingCampaigns(false);
    }
  };

  const handleSync = async (idsToSync: string[] = []) => {
    setSyncing(true);
    const isAll = idsToSync.length === 0;
    toast({
      title: 'Syncing Franchisees',
      description: isAll
        ? 'Sending request to sync all franchisees...'
        : `Sending request to sync ${idsToSync.length} franchisee(s)...`
    });

    try {
      const response = await fetch('/api/franchisees/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(idsToSync.length > 0 ? { ids: idsToSync } : {})
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Sync Completed',
          description: data.message || `Successfully synced franchisee(s).`
        });
        if (idsToSync.length > 0) {
          setSelectedIds(prev => prev.filter(id => !idsToSync.includes(id)));
        } else {
          setSelectedIds([]);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Sync Failed',
          description: data.message || 'An error occurred during synchronization.'
        });
      }
    } catch (error: any) {
      console.error('[Sync Franchisees] error:', error);
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: error.message || 'Failed to connect to the sync endpoint.'
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    async function fetchOperators() {
      if (selectedFranchisee) {
        setLoadingOperators(true);
        try {
          const ops = await getOperatorsForFranchisee(selectedFranchisee.internalId);
          setOperators(ops);
        } catch (e) {
          console.error("Failed to fetch operators:", e);
          setOperators([]);
        } finally {
          setLoadingOperators(false);
        }
      } else {
        setOperators([]);
      }
    }
    fetchOperators();
  }, [selectedFranchisee]);

  const downloadCSV = () => {
    const header = [
      "Internal ID", "Name", "Ownership", "Main Contact", "Linked Users", "Email", "Mobile", "Sales Rep", 
      "AusPost Suburb", "AusPost State", "AusPost Postcode", "LPO ID", "LPO Name", "Nominated Post Office", "Campaigns"
    ];
    const rows: string[][] = [];

    filteredFranchisees.forEach(f => {
      const nominatedLpoText = f.nominatedPostOffice ? (nominatedLpoNames[f.nominatedPostOffice] || f.nominatedPostOfficeText || f.nominatedPostOffice) : (f.nominatedPostOfficeText || "");
      const linkedUserText = getLinkedUsersForFranchisee(f, allUsers)
        .map(u => `${u.name} (${u.email})${u.relationship ? ` [${u.relationship}]` : ''}`)
        .join("; ");
      const ownershipText = f.isCompanyOwned ? "Company Owned" : "Franchisee Owned";

      if (!f.ausPostSuburbsJson || f.ausPostSuburbsJson.length === 0) {
        rows.push([
          f.internalId || "", f.name || "", ownershipText, f.mainContact || "", linkedUserText, f.email || "", f.mobile || "", f.salesRepAssigned || "",
          "", "", "", "", "", nominatedLpoText, (f.campaignPriorities || []).map(cp => `${cp.campaign}:${cp.priority}`).join(", ")
        ]);
        return;
      }

      f.ausPostSuburbsJson.forEach((t: any) => {
        const lpoId = t.parent_lpo_id || "";
        const lpoName = lpoId ? (lpoNames[lpoId] || "") : "";
        rows.push([
          f.internalId || "", f.name || "", ownershipText, f.mainContact || "", linkedUserText, f.email || "", f.mobile || "", f.salesRepAssigned || "",
          t.suburbs || "", t.state || "", t.post_code || "", lpoId, lpoName, nominatedLpoText, (f.campaignPriorities || []).map(cp => `${cp.campaign}:${cp.priority}`).join(", ")
        ]);
      });
    });

    const csvContent = [
      header.join(","),
      ...rows.map(row => row.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "franchisee_directory_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedLinkedUsers = useMemo(() => {
    return getLinkedUsersForFranchisee(selectedFranchisee, allUsers);
  }, [selectedFranchisee, allUsers]);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, contact, email, or linked user..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative flex-1 w-full max-w-sm">
          <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search territory (suburb, state, postcode)..."
            className="pl-8"
            value={territoryQuery}
            onChange={(e) => setTerritoryQuery(e.target.value)}
          />
        </div>
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by campaign..."
            className="pl-8"
            value={campaignQuery}
            onChange={(e) => setCampaignQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={ownershipFilter} onValueChange={(val: 'all' | 'company' | 'franchisee') => setOwnershipFilter(val)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Ownership" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ownership</SelectItem>
              <SelectItem value="company">Company Owned</SelectItem>
              <SelectItem value="franchisee">Franchisee Owned</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="default"
            onClick={() => handleSync(selectedIds)}
            disabled={syncing}
            className="flex items-center gap-2 bg-[#095c7b] text-white hover:bg-[#07465e] transition-all duration-200 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {selectedIds.length > 0 ? `Sync Selected (${selectedIds.length})` : 'Sync Franchisees'}
          </Button>
          <BulkImportOperators />

          <Button variant="outline" onClick={downloadCSV} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              {isSuperAdmin && (
                <TableHead className="w-[50px] whitespace-nowrap">
                  <Checkbox
                    checked={
                      sortedFranchisees.length > 0 &&
                      sortedFranchisees.every(f => selectedIds.includes(f.internalId))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const allVisibleIds = sortedFranchisees.map(f => f.internalId);
                        setSelectedIds(prev => Array.from(new Set([...prev, ...allVisibleIds])));
                      } else {
                        const allVisibleIds = sortedFranchisees.map(f => f.internalId);
                        setSelectedIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
                      }
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead className="whitespace-nowrap font-bold text-slate-700">Internal ID</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-slate-700">Franchisee Name</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-slate-700">Ownership</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-slate-700">Linked Users</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-slate-700">Main Contact</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-slate-700">Email</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-slate-700">Mobile</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-slate-700">Main Territory</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-slate-700">StarTrack</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-slate-700">AusPost</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-slate-700">Nominated LPO</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-slate-700">Campaigns</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-slate-700">Sales Rep</TableHead>
              <TableHead className="whitespace-nowrap text-right font-bold text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFranchisees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                  No active franchisees found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              sortedFranchisees.map((franchisee) => {
                const linkedUsers = getLinkedUsersForFranchisee(franchisee, allUsers);
                return (
                  <TableRow 
                    key={franchisee.internalId}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setSelectedFranchisee(franchisee)}
                  >
                    {isSuperAdmin && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(franchisee.internalId)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(prev => [...prev, franchisee.internalId]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== franchisee.internalId));
                            }
                          }}
                          aria-label={`Select ${franchisee.name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-semibold text-slate-900">#{franchisee.internalId}</TableCell>
                    <TableCell className="font-bold text-slate-900">{franchisee.name}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {franchisee.isCompanyOwned ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-xs whitespace-nowrap font-medium">
                          Company Owned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs whitespace-nowrap font-medium">
                          Franchisee Owned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {linkedUsers.length === 0 ? (
                        <span className="text-slate-400 text-xs italic">Unlinked</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 items-center max-w-[240px]">
                          {linkedUsers.slice(0, 2).map((lu: any, idx: number) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border-emerald-200 font-medium flex items-center gap-1 hover:bg-emerald-100 transition-colors cursor-pointer"
                              onClick={() => setSelectedFranchisee(franchisee)}
                              title={`${lu.name} (${lu.email}) - ${lu.relationship || lu.role}`}
                            >
                              <Users className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[100px]">{lu.name}</span>
                              <span className="text-[9px] text-emerald-600 font-bold">({lu.relationship === 'owner' ? 'Owner' : lu.relationship === 'investor' ? 'Investor' : 'Linked'})</span>
                            </Badge>
                          ))}
                          {linkedUsers.length > 2 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-slate-500 font-normal">
                              +{linkedUsers.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{franchisee.mainContact || 'N/A'}</TableCell>
                    <TableCell>
                      {franchisee.email ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEmailDialogTarget({ email: franchisee.email!, name: franchisee.mainContact || franchisee.name || 'Franchisee' });
                          }}
                          className="text-[#095c7b] hover:underline text-left bg-transparent border-none p-0 cursor-pointer text-xs font-medium"
                          title="Send Email via App"
                        >
                          {franchisee.email}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {franchisee.mobile ? (
                        !isUserRole ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSmsDialogTarget({ phone: franchisee.mobile!, name: franchisee.mainContact || franchisee.name || 'Franchisee' });
                            }}
                            className="text-[#095c7b] hover:underline text-left bg-transparent border-none p-0 cursor-pointer text-xs font-medium"
                            title="Send SMS via App"
                          >
                            {franchisee.mobile}
                          </button>
                        ) : (
                          <span className="text-xs">{franchisee.mobile}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        {franchisee.territoryJson?.length || 0} Suburbs
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!franchisee.mpStarTrackActivated ? (
                        <span className="text-muted-foreground text-xs">Inactive</span>
                      ) : (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 text-[11px]">
                          {franchisee.starTrackSuburbsJson?.length || 0} Suburbs
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!franchisee.ausPostSuburbsJson || franchisee.ausPostSuburbsJson.length === 0 ? (
                        <span className="text-muted-foreground text-xs">Inactive</span>
                      ) : (
                        <Badge variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200 text-[11px] w-max">
                          {franchisee.ausPostSuburbsJson.length} Suburbs
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {franchisee.nominatedPostOffice ? (nominatedLpoNames[franchisee.nominatedPostOffice] || franchisee.nominatedPostOfficeText || franchisee.nominatedPostOffice) : (franchisee.nominatedPostOfficeText || "")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 items-center">
                        {franchisee.campaignPriorities?.map((cp, i) => (
                          <Badge key={i} variant="outline" className={`text-[10px] ${cp.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' : cp.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                            {cp.campaign} ({cp.priority})
                          </Badge>
                        ))}
                        {canEditCampaigns && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setCampaignsDialogTarget(franchisee);
                              setEditingCampaigns(franchisee.campaignPriorities || []);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {franchisee.campaignPriorities?.length ? 'Edit' : 'Add'}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{franchisee.salesRepAssigned || 'Unassigned'}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {canUploadAgreement && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadDialogFranchisee(franchisee);
                            }}
                            className="h-7 text-[11px] px-2 gap-1 border-[#095c7b] text-[#095c7b] hover:bg-[#095c7b]/10 font-semibold"
                            title="Upload & Scrape Franchisee Agreement PDF"
                          >
                            <Upload className="h-3 w-3 text-[#095c7b]" /> Upload Agreement
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/franchisees/presales/${franchisee.internalId}`);
                          }}
                          className="h-7 text-[11px] px-2 gap-1 border-[#095c7b] text-[#095c7b] hover:bg-[#095c7b]/10 font-semibold"
                          title="Mark Territory for Sale / Presales"
                        >
                          <Tag className="h-3 w-3 text-[#095c7b]" /> Presale
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync([franchisee.internalId])}
                            disabled={syncing}
                            className="h-7 w-7 p-0"
                            title="Sync Franchisee"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground hover:text-primary ${syncing ? 'animate-spin' : ''}`} />
                            <span className="sr-only">Sync</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Redesigned Franchisee Detail Dashboard Dialog */}
      <Dialog open={!!selectedFranchisee} onOpenChange={(open) => !open && setSelectedFranchisee(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden bg-white shadow-2xl border border-slate-200">
          {selectedFranchisee && (
            <>
              {/* Header */}
              <div className="p-6 bg-white border-b shrink-0 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <DialogTitle className="text-2xl font-bold text-slate-900">{selectedFranchisee.name}</DialogTitle>
                      <Badge className="bg-[#095c7b] text-white font-mono text-xs">
                        ID: #{selectedFranchisee.internalId}
                      </Badge>
                      {selectedFranchisee.isCompanyOwned && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                          Company Owned
                        </Badge>
                      )}
                      {selectedFranchisee.mpStarTrackActivated && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          StarTrack Active
                        </Badge>
                      )}
                      {selectedFranchisee.ausPostSuburbsJson && selectedFranchisee.ausPostSuburbsJson.length > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                          AusPost Active
                        </Badge>
                      )}
                    </div>
                    <DialogDescription className="text-xs text-slate-500 flex items-center gap-3 pt-1">
                      <span>Main Contact: <strong className="text-slate-700">{selectedFranchisee.mainContact || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Email: <strong className="text-slate-700">{selectedFranchisee.email || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Sales Rep: <strong className="text-slate-700">{selectedFranchisee.salesRepAssigned || 'Unassigned'}</strong></span>
                    </DialogDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {canUploadAgreement && (
                      <Button
                        variant="outline"
                        onClick={() => setUploadDialogFranchisee(selectedFranchisee)}
                        className="border-[#095c7b] text-[#095c7b] hover:bg-[#095c7b]/10 text-xs gap-1.5 font-semibold"
                      >
                        <Upload className="h-4 w-4 text-[#095c7b]" /> Upload Agreement PDF
                      </Button>
                    )}
                    <Button
                      onClick={() => router.push(`/admin/franchisees/presales/${selectedFranchisee.internalId}`)}
                      className="bg-[#095c7b] hover:bg-[#07465e] text-white text-xs gap-1.5 font-semibold shadow-sm"
                    >
                      <Tag className="h-4 w-4 text-[#eaf143]" /> Presale Management
                    </Button>
                  </div>
                </div>

                {/* Key Summary Metric Cards Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 border rounded-xl flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Linked Users</span>
                      <span className="text-lg font-extrabold text-slate-900">{selectedLinkedUsers.length} Account(s)</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border rounded-xl flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 text-[#095c7b] rounded-lg shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Agreements</span>
                      <span className="text-lg font-extrabold text-slate-900">{selectedFranchisee.agreements?.length || 0} Document(s)</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border rounded-xl flex items-center gap-3">
                    <div className="p-2.5 bg-purple-100 text-purple-800 rounded-lg shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Territory</span>
                      <span className="text-lg font-extrabold text-slate-900">
                        {(selectedFranchisee.territoryJson?.length || 0) + (selectedFranchisee.starTrackSuburbsJson?.length || 0) + (selectedFranchisee.ausPostSuburbsJson?.length || 0)} Suburbs
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border rounded-xl flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Operators</span>
                      <span className="text-lg font-extrabold text-slate-900">{loadingOperators ? '...' : `${operators.length} Assigned`}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Tabs */}
              <Tabs defaultValue="linked-users" className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Main Content Tabs Header */}
                <div className="px-6 py-3 bg-slate-50/80 border-b shrink-0 w-full">
                  <TabsList className="bg-slate-200/70 p-1.5 rounded-xl h-auto flex flex-wrap sm:flex-nowrap gap-1.5 w-full justify-start border border-slate-200 shadow-inner">
                    <TabsTrigger 
                      value="linked-users" 
                      className="group flex-1 sm:flex-initial px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg text-slate-600 border border-transparent transition-all duration-200 gap-2 hover:text-slate-900 hover:bg-white/60 data-[state=active]:bg-[#095c7b] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-[#095c7b]"
                    >
                      <Users className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span>Linked User Accounts</span>
                      <span className="ml-1 px-2 py-0.5 text-[11px] rounded-full font-extrabold transition-colors bg-slate-200/90 text-slate-700 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                        {selectedLinkedUsers.length}
                      </span>
                    </TabsTrigger>

                    <TabsTrigger 
                      value="agreements" 
                      className="group flex-1 sm:flex-initial px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg text-slate-600 border border-transparent transition-all duration-200 gap-2 hover:text-slate-900 hover:bg-white/60 data-[state=active]:bg-[#095c7b] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-[#095c7b]"
                    >
                      <FileText className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span>Agreements & AI Details</span>
                      <span className="ml-1 px-2 py-0.5 text-[11px] rounded-full font-extrabold transition-colors bg-slate-200/90 text-slate-700 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                        {selectedFranchisee.agreements?.length || 0}
                      </span>
                    </TabsTrigger>

                    <TabsTrigger 
                      value="territory" 
                      className="group flex-1 sm:flex-initial px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg text-slate-600 border border-transparent transition-all duration-200 gap-2 hover:text-slate-900 hover:bg-white/60 data-[state=active]:bg-[#095c7b] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-[#095c7b]"
                    >
                      <MapPin className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span>Territory Bounds & LPO</span>
                    </TabsTrigger>

                    <TabsTrigger 
                      value="campaigns" 
                      className="group flex-1 sm:flex-initial px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg text-slate-600 border border-transparent transition-all duration-200 gap-2 hover:text-slate-900 hover:bg-white/60 data-[state=active]:bg-[#095c7b] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-[#095c7b]"
                    >
                      <Tag className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span>Campaign Priorities</span>
                    </TabsTrigger>

                    <TabsTrigger 
                      value="operators" 
                      className="group flex-1 sm:flex-initial px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg text-slate-600 border border-transparent transition-all duration-200 gap-2 hover:text-slate-900 hover:bg-white/60 data-[state=active]:bg-[#095c7b] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-[#095c7b]"
                    >
                      <UserCheck className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span>Operators</span>
                      <span className="ml-1 px-2 py-0.5 text-[11px] rounded-full font-extrabold transition-colors bg-slate-200/90 text-slate-700 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                        {operators.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* TAB 1: LINKED USERS */}
                <TabsContent 
                  value="linked-users" 
                  className="data-[state=active]:flex data-[state=active]:flex-col flex-1 w-full min-h-0 overflow-y-auto p-6 mt-0 space-y-6 focus-visible:outline-none bg-white"
                >
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Linked User Accounts (`users` collection)</h3>
                      <p className="text-xs text-slate-500">
                        Complete profile, bank details, tax ABN, address, and next of kin for users linked with this franchisee.
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                      {selectedLinkedUsers.length} User(s) Linked
                    </Badge>
                  </div>

                  {selectedLinkedUsers.length > 0 ? (
                    <div className={selectedLinkedUsers.length === 1 ? "w-full" : "grid grid-cols-1 lg:grid-cols-2 gap-6 w-full"}>
                      {selectedLinkedUsers.map((usr: any, index: number) => (
                        <div key={usr.userId || index} className="w-full p-6 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all space-y-6">
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-lg border border-emerald-200 shrink-0">
                                {(usr.name || usr.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-lg text-slate-900">{usr.name || usr.email}</h4>
                                  <Badge className={usr.relationship === 'owner' ? 'bg-emerald-600 text-white' : usr.relationship === 'investor' ? 'bg-purple-600 text-white' : 'bg-[#095c7b] text-white'}>
                                    {usr.relationship === 'owner' ? 'Owner' : usr.relationship === 'investor' ? 'Investor' : (usr.role || 'Linked User')}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-600 font-medium">{usr.email}</p>
                                {usr.personalEmail && (
                                  <p className="text-[11px] text-slate-400">Personal: {usr.personalEmail}</p>
                                )}
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              {usr.email && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEmailDialogTarget({ email: usr.email, name: usr.name })}
                                  className="h-8 text-xs gap-1.5 text-[#095c7b] border-[#095c7b] hover:bg-[#095c7b]/10 font-semibold"
                                >
                                  <Mail className="w-3.5 h-3.5" /> Send Email
                                </Button>
                              )}
                              {usr.mobile && !isUserRole && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSmsDialogTarget({ phone: usr.mobile, name: usr.name })}
                                  className="h-8 text-xs gap-1.5 text-[#095c7b] border-[#095c7b] hover:bg-[#095c7b]/10 font-semibold"
                                >
                                  <Phone className="w-3.5 h-3.5" /> Send SMS ({usr.mobile})
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Legal & Tax Grid */}
                          <div className="p-4 bg-slate-50/80 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border border-slate-100">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ABN</span>
                              <span className="font-bold text-slate-900 text-sm">{usr.abn || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date of Birth</span>
                              <span className="font-bold text-slate-900 text-sm">{usr.dateOfBirth || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Start Date</span>
                              <span className="font-bold text-slate-900 text-sm">{usr.businessStartDate || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">User Account ID</span>
                              <span className="font-mono font-bold text-slate-700 text-xs truncate block max-w-[140px]" title={usr.userId || 'N/A'}>{usr.userId || 'N/A'}</span>
                            </div>
                          </div>

                          {/* Bank & Address 2-Column Section */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Bank Details Box */}
                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                              <div className="flex items-center justify-between text-[#095c7b] font-bold text-xs">
                                <span className="flex items-center gap-1.5">
                                  <Landmark className="w-4 h-4 text-[#095c7b]" /> Bank Account Financial Details
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                                <div>
                                  <span className="text-[10px] font-medium text-slate-500 block">Account Name</span>
                                  <span className="font-bold text-slate-900">{usr.bankDetails?.accountName || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-medium text-slate-500 block">BSB</span>
                                  <span className="font-bold text-slate-900">{usr.bankDetails?.bsb || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-medium text-slate-500 block">Account Number</span>
                                  <span className="font-bold text-slate-900">{usr.bankDetails?.accountNumber || 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Address Details Box */}
                            <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-xl space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <MapPin className="w-4 h-4 text-slate-600" /> Residential & Registered Address
                              </div>
                              <p className="text-xs text-slate-900 font-semibold pt-1">
                                {usr.addressDetails && (usr.addressDetails.fullAddress || [usr.addressDetails.street, usr.addressDetails.suburb, usr.addressDetails.state, usr.addressDetails.postcode].filter(Boolean).join(', ')) ? (
                                  usr.addressDetails.fullAddress || [usr.addressDetails.street, usr.addressDetails.suburb, usr.addressDetails.state, usr.addressDetails.postcode].filter(Boolean).join(', ')
                                ) : (
                                  <span className="text-slate-400 italic">No address on file</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Next of Kin Box */}
                          {usr.nextOfKin && (usr.nextOfKin.name || usr.nextOfKin.mobile) ? (
                            <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-xl space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <HeartHandshake className="w-4 h-4 text-rose-500" /> Next of Kin / Emergency Contact
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1">
                                <span className="font-bold text-slate-900">{usr.nextOfKin.name || 'N/A'} ({usr.nextOfKin.relationship || 'Emergency Contact'})</span>
                                {usr.nextOfKin.mobile && !isUserRole && (
                                  <button 
                                    onClick={() => setSmsDialogTarget({ phone: usr.nextOfKin.mobile, name: usr.nextOfKin.name || 'Next of Kin' })}
                                    className="text-xs text-[#095c7b] hover:underline font-bold"
                                  >
                                    SMS: {usr.nextOfKin.mobile}
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 border border-dashed rounded-xl text-center bg-white space-y-3 w-full">
                      <UserX className="w-12 h-12 text-slate-300 mx-auto" />
                      <h4 className="font-bold text-slate-800 text-base">No User Account Linked Yet</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        There are currently no user profiles in the system linked to this franchisee ID (#{selectedFranchisee.internalId}). You can link users via Admin User Settings or when uploading franchisee agreements.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* TAB 2: AGREEMENTS */}
                <TabsContent 
                  value="agreements" 
                  className="data-[state=active]:flex data-[state=active]:flex-col flex-1 w-full min-h-0 overflow-y-auto p-6 mt-0 space-y-6 focus-visible:outline-none bg-white"
                >
                  <div className="flex items-center justify-between border-b pb-3 w-full">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Franchisee Agreements & Extracted Contract Details</h3>
                      <p className="text-xs text-slate-500">Legal PDF contracts and AI extracted terms for {selectedFranchisee.name}.</p>
                    </div>
                    {canUploadAgreement && (
                      <Button
                        size="sm"
                        onClick={() => setUploadDialogFranchisee(selectedFranchisee)}
                        className="bg-[#095c7b] text-white hover:bg-[#07465e] text-xs gap-1.5 font-semibold"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload New Agreement PDF
                      </Button>
                    )}
                  </div>

                  {selectedFranchisee.agreements && selectedFranchisee.agreements.length > 0 ? (
                    <div className="space-y-4 w-full">
                      {selectedFranchisee.agreements.map((ag: any, idx: number) => (
                        <div key={ag.id || idx} className="p-5 border rounded-xl bg-white shadow-sm space-y-4 w-full">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-3 bg-blue-100 rounded-xl text-[#095c7b]">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{ag.fileName}</h4>
                                <p className="text-xs text-slate-500">
                                  Uploaded on {new Date(ag.uploadedAt).toLocaleDateString()} {ag.uploadedByName ? `by ${ag.uploadedByName}` : ''}
                                </p>
                              </div>
                            </div>
                            {ag.downloadUrl && (
                              <a
                                href={ag.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold text-[#095c7b] hover:bg-[#095c7b]/10 bg-white shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5" /> View / Download PDF <ExternalLink className="w-3 h-3 ml-0.5" />
                              </a>
                            )}
                          </div>

                          {ag.extractedData && !ag.extractedData.error ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              <div className="p-3.5 bg-slate-50 border rounded-lg space-y-1">
                                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Entity & Legal Info</span>
                                <p className="font-bold text-slate-900 text-sm">{ag.extractedData.entityName || 'N/A'}</p>
                                {ag.extractedData.acnAbn && <p className="text-slate-700 font-medium">ABN/ACN: {ag.extractedData.acnAbn}</p>}
                                {ag.extractedData.registeredAddress && <p className="text-slate-500 text-[11px] pt-1">{ag.extractedData.registeredAddress}</p>}
                              </div>

                              <div className="p-3.5 bg-slate-50 border rounded-lg space-y-1">
                                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Contract Term & Dates</span>
                                <p className="font-medium text-slate-800">Commencement: <strong className="text-slate-900">{ag.extractedData.commencementDate || 'N/A'}</strong></p>
                                <p className="font-medium text-slate-800">Expiry Date: <strong className="text-slate-900">{ag.extractedData.expiryDate || 'N/A'}</strong></p>
                                <p className="text-slate-600 text-[11px]">Duration: {ag.extractedData.termDuration || '5 years'}</p>
                              </div>

                              <div className="p-3.5 bg-slate-50 border rounded-lg space-y-1">
                                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Fees & Financials</span>
                                <p className="text-slate-700">Deposit Amount: <strong>${ag.extractedData.depositAmount?.toLocaleString() || '0'}</strong></p>
                                <p className="text-slate-700">Service Fee: <strong>{ag.extractedData.franchiseServiceFee || 'N/A'}</strong></p>
                                <p className="text-slate-700">Marketing Levy: <strong>{ag.extractedData.marketingLevy || 'N/A'}</strong></p>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 border border-dashed rounded-xl text-center bg-white space-y-3 w-full">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                      <h4 className="font-bold text-slate-800 text-base">No Franchisee Agreement Uploaded</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Upload the legal franchisee agreement PDF to extract key terms automatically with AI.
                      </p>
                      {canUploadAgreement && (
                        <Button
                          size="sm"
                          onClick={() => setUploadDialogFranchisee(selectedFranchisee)}
                          className="bg-[#095c7b] text-white hover:bg-[#07465e] text-xs font-semibold"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Agreement PDF
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* TAB 3: TERRITORY & LPO */}
                <TabsContent 
                  value="territory" 
                  className="data-[state=active]:flex data-[state=active]:flex-col flex-1 w-full min-h-0 overflow-y-auto p-6 mt-0 space-y-6 focus-visible:outline-none bg-white"
                >
                  {/* Nominated LPO Banner */}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-200 text-amber-900 rounded-lg">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Nominated Australia Post LPO</span>
                        <h4 className="font-bold text-amber-950 text-base">
                          {selectedFranchisee.nominatedPostOffice ? (nominatedLpoNames[selectedFranchisee.nominatedPostOffice] || selectedFranchisee.nominatedPostOfficeText || selectedFranchisee.nominatedPostOffice) : (selectedFranchisee.nominatedPostOfficeText || "None Specified")}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Main Courier Bounds */}
                  <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-bold text-slate-900 text-base">Main Courier Territory Bounds</h4>
                      <Badge variant="outline">{selectedFranchisee.territoryJson?.length || 0} Suburbs</Badge>
                    </div>
                    {selectedFranchisee.territoryJson && selectedFranchisee.territoryJson.length > 0 ? (
                      <div className="rounded-xl border bg-white overflow-hidden shadow-sm w-full">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="font-bold">Suburb</TableHead>
                              <TableHead className="font-bold">Post Code</TableHead>
                              <TableHead className="font-bold">State</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedFranchisee.territoryJson.map((t, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-semibold">{t.suburbs}</TableCell>
                                <TableCell>{t.post_code}</TableCell>
                                <TableCell>{t.state}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic p-4 border border-dashed rounded-lg bg-white w-full">No primary courier territory configured.</p>
                    )}
                  </div>

                  {/* StarTrack Coverage */}
                  <div className="space-y-3 pt-2 w-full">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-bold text-slate-900 text-base">StarTrack Product Coverage</h4>
                      {selectedFranchisee.mpStarTrackActivated ? (
                        <Badge className="bg-blue-600 text-white">{selectedFranchisee.starTrackSuburbsJson?.length || 0} Suburbs</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {selectedFranchisee.mpStarTrackActivated && selectedFranchisee.starTrackSuburbsJson && selectedFranchisee.starTrackSuburbsJson.length > 0 ? (
                      <div className="rounded-xl border bg-white overflow-hidden shadow-sm w-full">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="font-bold">Suburb</TableHead>
                              <TableHead className="font-bold">Post Code</TableHead>
                              <TableHead className="font-bold">State</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedFranchisee.starTrackSuburbsJson.map((t, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-semibold">{t.suburbs}</TableCell>
                                <TableCell>{t.post_code}</TableCell>
                                <TableCell>{t.state}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="p-6 border border-dashed rounded-lg text-center text-xs text-muted-foreground bg-white w-full">
                        No Active StarTrack Product Mapping Provisioned
                      </div>
                    )}
                  </div>

                  {/* AusPost Coverage */}
                  <div className="space-y-3 pt-2 w-full">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-bold text-slate-900 text-base">AusPost Product Coverage & LPO Mapping</h4>
                      {selectedFranchisee.ausPostSuburbsJson && selectedFranchisee.ausPostSuburbsJson.length > 0 ? (
                        <Badge className="bg-red-600 text-white">{selectedFranchisee.ausPostSuburbsJson.length} Suburbs</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {selectedFranchisee.ausPostSuburbsJson && selectedFranchisee.ausPostSuburbsJson.length > 0 ? (
                      <div className="rounded-xl border bg-white overflow-hidden shadow-sm w-full">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="font-bold">Suburb</TableHead>
                              <TableHead className="font-bold">Post Code</TableHead>
                              <TableHead className="font-bold">State</TableHead>
                              <TableHead className="font-bold">LPO Mapping</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedFranchisee.ausPostSuburbsJson.map((t, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-semibold">{t.suburbs}</TableCell>
                                <TableCell>{t.post_code}</TableCell>
                                <TableCell>{t.state}</TableCell>
                                <TableCell>
                                  {t.parent_lpo_id ? (
                                    <span className="font-bold text-xs text-[#095c7b]">
                                      {t.parent_lpo_id}{lpoNames[t.parent_lpo_id] ? ` - ${lpoNames[t.parent_lpo_id]}` : ''}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs italic">- No LPO Match -</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="p-6 border border-dashed rounded-lg text-center text-xs text-muted-foreground bg-white w-full">
                        No Active AusPost Product Mapping Provisioned
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* TAB 4: CAMPAIGNS */}
                <TabsContent 
                  value="campaigns" 
                  className="data-[state=active]:flex data-[state=active]:flex-col flex-1 w-full min-h-0 overflow-y-auto p-6 mt-0 space-y-6 focus-visible:outline-none bg-white"
                >
                  <div className="flex items-center justify-between border-b pb-3 w-full">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Campaign Priorities & Sales Assignment</h3>
                      <p className="text-xs text-slate-500">Target marketing campaigns prioritized for this franchisee territory.</p>
                    </div>
                    {canEditCampaigns && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCampaignsDialogTarget(selectedFranchisee);
                          setEditingCampaigns(selectedFranchisee.campaignPriorities || []);
                        }}
                        className="border-[#095c7b] text-[#095c7b] hover:bg-[#095c7b]/10 text-xs font-semibold"
                      >
                        Edit Campaigns
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <div className="p-5 border rounded-xl bg-white space-y-4 shadow-sm w-full">
                      <h4 className="font-bold text-slate-900 text-base border-b pb-2 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#095c7b]" /> Active Campaign Priorities
                      </h4>
                      {selectedFranchisee.campaignPriorities && selectedFranchisee.campaignPriorities.length > 0 ? (
                        <div className="space-y-2">
                          {selectedFranchisee.campaignPriorities.map((cp, idx) => (
                            <div key={idx} className="p-3 border rounded-lg flex items-center justify-between bg-slate-50">
                              <span className="font-bold text-slate-800 text-xs">{cp.campaign}</span>
                              <Badge className={cp.priority === 'High' ? 'bg-red-600 text-white' : cp.priority === 'Medium' ? 'bg-yellow-600 text-white' : 'bg-slate-600 text-white'}>
                                {cp.priority} Priority
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic p-4 border border-dashed rounded-lg text-center">No campaign priorities configured.</p>
                      )}
                    </div>

                    <div className="p-5 border rounded-xl bg-white space-y-4 shadow-sm w-full">
                      <h4 className="font-bold text-slate-900 text-base border-b pb-2 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-[#095c7b]" /> Sales & Account Representation
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Sales Representative</span>
                          <p className="font-bold text-slate-900 text-sm">{selectedFranchisee.salesRepAssigned || 'Unassigned'}</p>
                        </div>
                        <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Franchisee NetSuite / Internal Code</span>
                          <p className="font-mono font-bold text-slate-800">{selectedFranchisee.internalId}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 5: OPERATORS */}
                <TabsContent 
                  value="operators" 
                  className="data-[state=active]:flex data-[state=active]:flex-col flex-1 w-full min-h-0 overflow-y-auto p-6 mt-0 space-y-6 focus-visible:outline-none bg-white"
                >
                  <div className="flex items-center justify-between border-b pb-3 w-full">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Franchisee Operators Roster</h3>
                      <p className="text-xs text-slate-500">Drivers and operational staff linked to {selectedFranchisee.name}.</p>
                    </div>
                    {loadingOperators && <Loader className="w-4 h-4" />}
                  </div>

                  {!loadingOperators && operators.length > 0 ? (
                    <div className="rounded-xl border bg-white overflow-hidden shadow-sm w-full">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="font-bold">Operator Name</TableHead>
                            <TableHead className="font-bold">Phone Number</TableHead>
                            <TableHead className="font-bold">Email Address</TableHead>
                            <TableHead className="font-bold">Status</TableHead>
                            <TableHead className="font-bold">Employment</TableHead>
                            <TableHead className="font-bold">Main Territory</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {operators.map((op) => (
                            <TableRow key={op.internalId}>
                              <TableCell className="font-bold text-slate-900">{`${op.givenNames || ''} ${op.surname || ''}`.trim() || 'N/A'}</TableCell>
                              <TableCell>
                                {op.contactPhone ? (
                                  !isUserRole ? (
                                    <button 
                                      onClick={() => setSmsDialogTarget({ phone: op.contactPhone!, name: `${op.givenNames} ${op.surname}`.trim() || 'Operator' })}
                                      className="text-[#095c7b] hover:underline font-medium text-xs"
                                      title="Send SMS"
                                    >
                                      {op.contactPhone}
                                    </button>
                                  ) : (
                                    <span className="text-xs">{op.contactPhone}</span>
                                  )
                                ) : (
                                  <span className="text-muted-foreground text-xs">N/A</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {op.contactEmail ? (
                                  <button 
                                    onClick={() => setEmailDialogTarget({ email: op.contactEmail!, name: `${op.givenNames} ${op.surname}`.trim() || 'Operator' })}
                                    className="text-[#095c7b] hover:underline font-medium text-xs"
                                    title="Send Email"
                                  >
                                    {op.contactEmail}
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground text-xs">N/A</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[11px]">{op.operatorStatus || 'Unknown'}</Badge>
                              </TableCell>
                              <TableCell className="text-xs">{op.employment || 'Unknown'}</TableCell>
                              <TableCell>
                                {op.mainFranchiseeId === selectedFranchisee.internalId ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Main</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">Linked</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : !loadingOperators ? (
                    <div className="p-12 border border-dashed rounded-xl text-center bg-white space-y-2 w-full">
                      <Users className="w-12 h-12 text-slate-300 mx-auto" />
                      <h4 className="font-bold text-slate-800 text-base">No Operators Assigned</h4>
                      <p className="text-xs text-slate-500">No driver or operator records are assigned to this franchisee.</p>
                    </div>
                  ) : null}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      {emailDialogTarget && (
        <EmailDialog
          isOpen={!!emailDialogTarget}
          onClose={() => setEmailDialogTarget(null)}
          toEmail={emailDialogTarget.email}
          recipientName={emailDialogTarget.name}
          senderEmail={user?.email || undefined}
        />
      )}

      {smsDialogTarget && (
        <SmsDialog
          isOpen={!!smsDialogTarget}
          onClose={() => setSmsDialogTarget(null)}
          phoneNumber={smsDialogTarget.phone}
          recipientName={smsDialogTarget.name}
        />
      )}

      {campaignsDialogTarget && (
        <Dialog open={!!campaignsDialogTarget} onOpenChange={(open) => !open && setCampaignsDialogTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Campaigns for {campaignsDialogTarget.name}</DialogTitle>
              <DialogDescription>
                Add or remove campaigns and set their priority levels.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              {editingCampaigns.map((cp, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input 
                    value={cp.campaign}
                    onChange={(e) => {
                      const newArr = [...editingCampaigns];
                      newArr[index].campaign = e.target.value;
                      setEditingCampaigns(newArr);
                    }}
                    placeholder="Campaign Name"
                    className="flex-1"
                  />
                  <select 
                    value={cp.priority}
                    onChange={(e) => {
                      const newArr = [...editingCampaigns];
                      newArr[index].priority = e.target.value as any;
                      setEditingCampaigns(newArr);
                    }}
                    className="flex h-9 w-28 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <Button variant="outline" size="sm" className="px-2" onClick={() => setEditingCampaigns(editingCampaigns.filter((_, i) => i !== index))}>
                    X
                  </Button>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEditingCampaigns([...editingCampaigns, { campaign: '', priority: 'Medium' }])}
              >
                + Add Campaign
              </Button>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setCampaignsDialogTarget(null)}>Cancel</Button>
                <Button onClick={handleSaveCampaigns} disabled={savingCampaigns}>
                  {savingCampaigns ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {uploadDialogFranchisee && (
        <UploadAgreementDialog
          isOpen={!!uploadDialogFranchisee}
          onClose={() => setUploadDialogFranchisee(null)}
          franchiseeId={uploadDialogFranchisee.internalId}
          franchiseeName={uploadDialogFranchisee.name}
          onSuccess={reloadFranchisees}
        />
      )}
    </div>
  );
}
