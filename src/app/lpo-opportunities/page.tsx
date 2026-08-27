"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { FullScreenLoader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, ArrowUpRight, Search, MapPin, Briefcase, Globe, Copy, Mail, Share2, Check, User, Link2, Unlink } from 'lucide-react';
import { Lead } from '@/lib/types';
import { encryptLeadId } from '@/lib/localmile-security';
import { useToast } from '@/hooks/use-toast';
import { ShareOpportunityDialog } from '@/components/share-opportunity-dialog';

function isLeadLinkedToLpo(op: any): boolean {
  if (op.isLpoLinked !== undefined) return Boolean(op.isLpoLinked);
  return Boolean(
    op.lpoLeadId ||
    op.linkedLpoLeadId ||
    op.ausPostParentLpoId ||
    op.parentLpoId ||
    op.isLpoLead ||
    op.lpoName ||
    op.ausPostLpoName ||
    op.linkedLpoName ||
    op.isParentLead ||
    op.bucket === 'lpo_network'
  );
}

export default function LpoOpportunitiesPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();
  const { toast } = useToast();

  const [opportunities, setOpportunities] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'linked' | 'unlinked'>('linked');

  // Share Modal & Copy Link state
  const [selectedShareLead, setSelectedShareLead] = useState<Lead | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (leadId: string) => {
    const token = encryptLeadId(leadId);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = `${origin}/lpo-opportunity/${encodeURIComponent(token)}`;

    navigator.clipboard.writeText(publicUrl);
    setCopiedId(leadId);
    toast({
      title: 'Public Link Copied!',
      description: 'Public opportunity link copied to clipboard.',
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenShareModal = (lead: Lead) => {
    setSelectedShareLead(lead);
    setShareModalOpen(true);
  };

  useEffect(() => {
    if (authLoading || loadingPermissions || !canView('lpoLeads')) return;

    // Query leads and companies collections for lpoPlusOpportunity === true or bucket === 'lpo_plus'
    const qLeads = query(collection(firestore, 'leads'), where('lpoPlusOpportunity', '==', true));
    const qCompanies = query(collection(firestore, 'companies'), where('lpoPlusOpportunity', '==', true));
    const qLeadsBucket = query(collection(firestore, 'leads'), where('bucket', '==', 'lpo_plus'));
    const qCompBucket = query(collection(firestore, 'companies'), where('bucket', '==', 'lpo_plus'));

    let leadsData: Lead[] = [];
    let companiesData: Lead[] = [];
    let leadsBucketData: Lead[] = [];
    let compBucketData: Lead[] = [];

    const unsubLeads = onSnapshot(qLeads, (snapshot) => {
      leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      combineAndSet();
    }, (err) => {
      console.error("Error fetching leads opportunities:", err);
      setLoading(false);
    });

    const unsubCompanies = onSnapshot(qCompanies, (snapshot) => {
      companiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isFromCompaniesCollection: true } as Lead));
      combineAndSet();
    }, (err) => {
      console.error("Error fetching companies opportunities:", err);
      setLoading(false);
    });

    const unsubLeadsBucket = onSnapshot(qLeadsBucket, (snapshot) => {
      leadsBucketData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      combineAndSet();
    }, (err) => {
      console.error("Error fetching leads bucket lpo_plus:", err);
    });

    const unsubCompBucket = onSnapshot(qCompBucket, (snapshot) => {
      compBucketData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isFromCompaniesCollection: true } as Lead));
      combineAndSet();
    }, (err) => {
      console.error("Error fetching companies bucket lpo_plus:", err);
    });

    async function combineAndSet() {
      // Deduplicate all combined results
      const combined = [...leadsData, ...companiesData, ...leadsBucketData, ...compBucketData];
      const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

      // Enrich with bucket_history and LPO link check
      const enriched = await Promise.all(
        unique.map(async (op) => {
          try {
            const parentColl = op.isFromCompaniesCollection ? 'companies' : 'leads';
            const subRef = collection(firestore, parentColl, op.id, 'bucket_history');
            const subSnap = await getDocs(subRef);

            const historyList: any[] = [];
            subSnap.forEach((d) => {
              historyList.push({ id: d.id, ...d.data() });
            });

            historyList.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

            let linked = isLeadLinkedToLpo(op);
            if (!linked) {
              // Deep check in lpo_leads for createdParentLeadId or linkedLeadId
              const lpoSnap = await getDocs(query(collection(firestore, 'lpo_leads'), where('createdParentLeadId', '==', op.id)));
              if (!lpoSnap.empty) {
                linked = true;
              } else {
                const lpoSnap2 = await getDocs(query(collection(firestore, 'lpo_leads'), where('linkedLeadId', '==', op.id)));
                if (!lpoSnap2.empty) linked = true;
              }
            }

            return {
              ...op,
              isLpoLinked: linked,
              bucketHistory: historyList.length > 0 ? historyList : op.bucketHistory,
            };
          } catch (err) {
            return {
              ...op,
              isLpoLinked: isLeadLinkedToLpo(op),
            };
          }
        })
      );

      enriched.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
      setOpportunities(enriched);
      setLoading(false);
    }

    return () => {
      unsubLeads();
      unsubCompanies();
      unsubLeadsBucket();
      unsubCompBucket();
    };
  }, [authLoading, loadingPermissions, canView]);

  if (authLoading || loadingPermissions) {
    return <FullScreenLoader message="Loading opportunities..." />;
  }

  if (!canView('lpoLeads')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view the LPO Opportunities page.</p>
      </div>
    );
  }

  const linkedOpps = opportunities.filter(op => isLeadLinkedToLpo(op));
  const unlinkedOpps = opportunities.filter(op => !isLeadLinkedToLpo(op));

  const filterByQuery = (list: Lead[]) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((op) => {
      const l = op as any;
      return (
        op.companyName?.toLowerCase().includes(q) ||
        op.status?.toLowerCase().includes(q) ||
        l.state?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.street?.toLowerCase().includes(q) ||
        l.zip?.toLowerCase().includes(q) ||
        l.postcode?.toLowerCase().includes(q) ||
        l.address1?.toLowerCase().includes(q) ||
        l.lpoName?.toLowerCase().includes(q) ||
        l.ausPostLpoName?.toLowerCase().includes(q) ||
        op.address?.city?.toLowerCase().includes(q) ||
        op.address?.state?.toLowerCase().includes(q) ||
        op.dialerAssigned?.toLowerCase().includes(q) ||
        op.accountManagerAssigned?.toLowerCase().includes(q) ||
        op.salesRepAssigned?.toLowerCase().includes(q)
      );
    });
  };

  const renderTable = (oppList: Lead[], isLinkedTab: boolean) => {
    const filtered = filterByQuery(oppList);

    if (loading) {
      return <div className="p-8 text-center text-slate-500">Loading opportunities...</div>;
    }

    if (filtered.length === 0) {
      return (
        <div className="p-12 text-center text-slate-500 space-y-2">
          <p className="text-base font-semibold text-slate-700">No opportunities found</p>
          <p className="text-sm text-slate-500">
            {searchQuery
              ? `No ${isLinkedTab ? 'linked' : 'unlinked'} opportunities match your search query "${searchQuery}".`
              : `There are currently no leads in the LPO.Plus bucket that are ${isLinkedTab ? 'linked to an LPO' : 'unlinked'}.`}
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader className="bg-[#095c7b] hover:bg-[#095c7b]">
          <TableRow className="hover:bg-[#095c7b]">
            <TableHead className="font-bold text-white">Company Name</TableHead>
            <TableHead className="font-bold text-white">Status</TableHead>
            <TableHead className="font-bold text-white">{isLinkedTab ? 'Linked LPO' : 'LPO Status'}</TableHead>
            <TableHead className="font-bold text-white">Location</TableHead>
            <TableHead className="font-bold text-white">Moved To Bucket By</TableHead>
            <TableHead className="font-bold text-white text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((op) => {
            const l = op as any;

            // Extract root address fields
            const rawAdd1 = l.address1 || op.address?.address1;
            const address1Val = rawAdd1 && String(rawAdd1).trim() && String(rawAdd1).toLowerCase() !== 'undefined'
              ? String(rawAdd1).trim()
              : '';

            const streetVal = (l.street || op.address?.street || '').trim();
            const cityVal = (l.city || op.address?.city || '').trim();
            const stateVal = (l.state || op.address?.state || '').trim();
            const zipVal = (l.zip || l.postcode || op.address?.zip || '').trim();

            const locationParts = [address1Val, streetVal, cityVal, stateVal, zipVal].filter(Boolean);
            const locationStr = locationParts.join(', ') || 'No location';

            // Determine author who moved this lead to LPO.Plus bucket
            let movedBy = '';
            if (Array.isArray(op.bucketHistory) && op.bucketHistory.length > 0) {
              const lpoHistory = op.bucketHistory.find((bh: any) =>
                bh.newBucket === 'lpo_plus' ||
                bh.newBucket === 'lpo_opportunity' ||
                (bh.notes && String(bh.notes).toLowerCase().includes('lpo'))
              );
              if (lpoHistory?.author) {
                movedBy = lpoHistory.author;
              } else if (op.bucketHistory[0]?.author) {
                movedBy = op.bucketHistory[0].author;
              }
            }

            if (!movedBy) {
              movedBy = l.lpoPushedBy || l.movedBy || l.pushedBy || l.updatedBy || l.createdBy || l.author || 'System';
            }

            const lpoNameStr = l.lpoName || l.ausPostLpoName || l.linkedLpoName || (l.lpoLeadId ? `LPO #${l.lpoLeadId}` : '');

            return (
              <TableRow key={op.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="font-semibold text-slate-800 py-3.5">
                  <Link
                    href={op.isFromCompaniesCollection ? `/companies/${op.id}` : `/leads/${op.id}`}
                    target="_blank"
                    className="font-bold text-[#095c7b] hover:text-[#074760] hover:underline flex items-center gap-1 group inline-flex"
                    title="Click to view full profile"
                  >
                    <span>{op.companyName}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#095c7b]/70 group-hover:text-[#074760] transition-colors" />
                  </Link>
                </TableCell>
                <TableCell className="py-3.5">
                  <Badge variant="outline" className="bg-[#095c7b]/5 text-[#095c7b] border-[#095c7b]/20">
                    {op.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-3.5">
                  {isLinkedTab ? (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium flex items-center gap-1 w-max">
                      <Link2 className="h-3 w-3 text-emerald-600" />
                      {lpoNameStr || 'Linked LPO'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 font-medium flex items-center gap-1 w-max">
                      <Unlink className="h-3 w-3 text-slate-400" />
                      Not Linked to LPO
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="py-3.5 text-slate-600">
                  <span className="flex items-center gap-1.5 text-sm">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                    {locationStr}
                  </span>
                </TableCell>
                <TableCell className="py-3.5 text-slate-600 font-medium">
                  <span className="flex items-center gap-1.5 text-sm">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    {movedBy}
                  </span>
                </TableCell>
                <TableCell className="text-right py-3.5 flex items-center justify-end gap-1.5">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleCopyLink(op.id)}
                    title={copiedId === op.id ? 'Public Link Copied!' : 'Copy Public Link'}
                    className="h-8 w-8 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    {copiedId === op.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-600" />}
                  </Button>

                  <Button
                    size="icon"
                    variant="default"
                    onClick={() => handleOpenShareModal(op)}
                    title="Share Link via Email"
                    className="h-8 w-8 bg-[#095c7b] hover:bg-[#074760] text-white rounded-lg"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>

                  <Link href={`/lpo-opportunity/${encodeURIComponent(encryptLeadId(op.id))}`} target="_blank">
                    <Button
                      size="icon"
                      variant="outline"
                      title="Open Public Opportunity Page"
                      className="h-8 w-8 border-[#095c7b]/30 text-[#095c7b] hover:bg-[#095c7b]/10 rounded-lg"
                    >
                      <Globe className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building className="h-8 w-8 text-[#095c7b]" />
            Shared Opportunities
          </h1>
          <p className="text-slate-500 mt-1">Leads pushed to the LPO.Plus project for allocation and service delivery.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-slate-200/85 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-slate-500">Total Pushed Leads</CardDescription>
            <CardTitle className="text-3xl font-bold text-[#095c7b]">{opportunities.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-200/85 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-slate-500 flex items-center gap-1.5">
              <Link2 className="h-4 w-4 text-emerald-600" />
              Linked to LPO
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">{linkedOpps.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-200/85 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-slate-500 flex items-center gap-1.5">
              <Unlink className="h-4 w-4 text-amber-600" />
              Not Linked to LPO
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-600">{unlinkedOpps.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search opportunities by name, status, rep, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
      </div>

      {/* 2 Tabs for Linked vs Not Linked */}
      <Tabs defaultValue="linked" value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-xl inline-flex">
          <TabsTrigger
            value="linked"
            className="flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg data-[state=active]:bg-[#095c7b] data-[state=active]:text-white transition-all"
          >
            <Link2 className="h-4 w-4" />
            <span>Linked to LPO</span>
            <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 data-[state=active]:bg-white/20 data-[state=active]:text-white">
              {linkedOpps.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="unlinked"
            className="flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg data-[state=active]:bg-[#095c7b] data-[state=active]:text-white transition-all"
          >
            <Unlink className="h-4 w-4" />
            <span>Not Linked to LPO</span>
            <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 data-[state=active]:bg-white/20 data-[state=active]:text-white">
              {unlinkedOpps.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="linked" className="m-0">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center justify-between">
                <span>Linked Opportunities List</span>
                <span className="text-xs font-normal text-slate-500">Showing {filterByQuery(linkedOpps).length} lead(s)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {renderTable(linkedOpps, true)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unlinked" className="m-0">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center justify-between">
                <span>Unlinked Opportunities List</span>
                <span className="text-xs font-normal text-slate-500">Showing {filterByQuery(unlinkedOpps).length} lead(s)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {renderTable(unlinkedOpps, false)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Share Opportunity Email Dialog */}
      <ShareOpportunityDialog
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        lead={selectedShareLead}
      />
    </div>
  );
}
