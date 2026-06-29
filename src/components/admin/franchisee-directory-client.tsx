'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Franchisee, Operator } from '@/lib/types';
import { getAllFranchisees, getOperatorsForFranchisee, updateFranchiseeCampaigns } from '@/services/firebase';
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
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Download } from 'lucide-react';
import { SmsDialog } from '@/components/sms-dialog';
import { EmailDialog } from '@/components/email-dialog';
import { useAuth } from '@/hooks/use-auth';
import { BulkImportOperators } from '@/components/admin/bulk-import-operators';

export default function FranchiseeDirectoryClient() {
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFranchisee, setSelectedFranchisee] = useState<Franchisee | null>(null);
  const [lpoNames, setLpoNames] = useState<Record<string, string>>({});
  const [nominatedLpoNames, setNominatedLpoNames] = useState<Record<string, string>>({});
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [territoryQuery, setTerritoryQuery] = useState('');
  const [campaignQuery, setCampaignQuery] = useState('');

  // Dialog states
  const [emailDialogTarget, setEmailDialogTarget] = useState<{ email: string, name: string } | null>(null);
  const [smsDialogTarget, setSmsDialogTarget] = useState<{ phone: string, name: string } | null>(null);
  const [campaignsDialogTarget, setCampaignsDialogTarget] = useState<Franchisee | null>(null);
  const [editingCampaigns, setEditingCampaigns] = useState<{ campaign: string; priority: 'High' | 'Medium' | 'Low' }[]>([]);
  const [savingCampaigns, setSavingCampaigns] = useState(false);
  const { user, userProfile } = useAuth();

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getAllFranchisees();
        const sortedData = data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setFranchisees(sortedData);

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

  // Lazy-load LPO names when a franchisee is selected
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
      // 1. Text Search (Name, Contact, Email)
      const q = searchQuery.toLowerCase();
      const matchesText = !q || 
        franchisee.name?.toLowerCase().includes(q) ||
        franchisee.mainContact?.toLowerCase().includes(q) ||
        franchisee.email?.toLowerCase().includes(q);

      // 2. Territory Search (Suburb, State, Postcode)
      const tq = territoryQuery.toLowerCase();
      let matchesTerritory = !tq;

      if (tq && !matchesTerritory) {
        // Check Main Territory
        const inMain = franchisee.territoryJson?.some(t => 
          t.suburbs?.toLowerCase().includes(tq) || 
          t.state?.toLowerCase().includes(tq) || 
          t.post_code?.toLowerCase().includes(tq)
        );
        // Check StarTrack Territory
        const inStarTrack = franchisee.mpStarTrackActivated && franchisee.starTrackSuburbsJson?.some(t => 
          t.suburbs?.toLowerCase().includes(tq) || 
          t.state?.toLowerCase().includes(tq) || 
          t.post_code?.toLowerCase().includes(tq)
        );

        // Check AusPost Territory
        const inAusPost = franchisee.ausPostSuburbsJson?.some(t => 
          t.suburbs?.toLowerCase().includes(tq) || 
          t.state?.toLowerCase().includes(tq) || 
          t.post_code?.toLowerCase().includes(tq)
        );

        matchesTerritory = !!(inMain || inStarTrack || inAusPost);
      }

      // 3. Campaign Search
      const cq = campaignQuery.toLowerCase();
      const matchesCampaign = !cq || 
        franchisee.campaignPriorities?.some(cp => cp.campaign.toLowerCase().includes(cq));

      return matchesText && matchesTerritory && matchesCampaign;
    });
  }, [franchisees, searchQuery, territoryQuery, campaignQuery]);

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
      "Internal ID", "Name", "Main Contact", "Email", "Mobile", "Sales Rep", 
      "AusPost Suburb", "AusPost State", "AusPost Postcode", "LPO ID", "LPO Name", "Nominated Post Office", "Campaigns"
    ];
    const rows: string[][] = [];

    filteredFranchisees.forEach(f => {
      const nominatedLpoText = f.nominatedPostOffice ? (nominatedLpoNames[f.nominatedPostOffice] || f.nominatedPostOfficeText || f.nominatedPostOffice) : (f.nominatedPostOfficeText || "");

      if (!f.ausPostSuburbsJson || f.ausPostSuburbsJson.length === 0) {
        rows.push([
          f.internalId || "", f.name || "", f.mainContact || "", f.email || "", f.mobile || "", f.salesRepAssigned || "",
          "", "", "", "", "", nominatedLpoText, (f.campaignPriorities || []).map(cp => `${cp.campaign}:${cp.priority}`).join(", ")
        ]);
        return;
      }

      f.ausPostSuburbsJson.forEach((t: any) => {
        const lpoId = t.parent_lpo_id || "";
        const lpoName = lpoId ? (lpoNames[lpoId] || "") : "";
        rows.push([
          f.internalId || "", f.name || "", f.mainContact || "", f.email || "", f.mobile || "", f.salesRepAssigned || "",
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
    link.setAttribute("download", "franchisee_lpo_mapping.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, contact, or email..."
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
        <div className="ml-auto flex items-center gap-2">
          <BulkImportOperators />
          <Button variant="outline" onClick={downloadCSV} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Internal ID</TableHead>
              <TableHead className="whitespace-nowrap">Name</TableHead>
              <TableHead className="whitespace-nowrap">Main Contact</TableHead>
              <TableHead className="whitespace-nowrap">Email</TableHead>
              <TableHead className="whitespace-nowrap">Mobile</TableHead>
              <TableHead className="whitespace-nowrap">Main Territory</TableHead>
              <TableHead className="whitespace-nowrap">StarTrack Coverage</TableHead>
              <TableHead className="whitespace-nowrap">AusPost Coverage</TableHead>
              <TableHead className="whitespace-nowrap">Nominated Post Office</TableHead>
              <TableHead className="whitespace-nowrap">Campaigns</TableHead>
              <TableHead className="whitespace-nowrap">Sales Rep</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFranchisees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No active franchisees found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              sortedFranchisees.map((franchisee) => (
                <TableRow 
                  key={franchisee.internalId}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedFranchisee(franchisee)}
                >
                  <TableCell className="font-medium">{franchisee.internalId}</TableCell>
                  <TableCell>{franchisee.name}</TableCell>
                  <TableCell>{franchisee.mainContact}</TableCell>
                  <TableCell>
                    {franchisee.email ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmailDialogTarget({ email: franchisee.email!, name: franchisee.mainContact || franchisee.name || 'Franchisee' });
                        }}
                        className="text-primary hover:underline text-left bg-transparent border-none p-0 cursor-pointer"
                        title="Send Email via App"
                      >
                        {franchisee.email}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {franchisee.mobile ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSmsDialogTarget({ phone: franchisee.mobile!, name: franchisee.mainContact || franchisee.name || 'Franchisee' });
                        }}
                        className="text-primary hover:underline text-left bg-transparent border-none p-0 cursor-pointer"
                        title="Send SMS via App"
                      >
                        {franchisee.mobile}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {franchisee.territoryJson?.length || 0} Suburbs
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!franchisee.mpStarTrackActivated ? (
                      <span className="text-muted-foreground text-xs">Inactive</span>
                    ) : (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                        {franchisee.starTrackSuburbsJson?.length || 0} Suburbs
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!franchisee.ausPostSuburbsJson || franchisee.ausPostSuburbsJson.length === 0 ? (
                      <span className="text-muted-foreground text-xs">Inactive</span>
                    ) : (
                      <Badge variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200 w-max">
                        {franchisee.ausPostSuburbsJson.length} Suburbs
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
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
                  <TableCell>{franchisee.salesRepAssigned || 'Unassigned'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedFranchisee} onOpenChange={(open) => !open && setSelectedFranchisee(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
          {selectedFranchisee && (
            <>
              <div className="p-6 border-b shrink-0">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedFranchisee.name}</DialogTitle>
                  <DialogDescription>
                    Territory Coverage & Operational Boundaries
                  </DialogDescription>
                </DialogHeader>
              </div>
              
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Main Courier Territory Bounds</h3>
                    {selectedFranchisee.territoryJson && selectedFranchisee.territoryJson.length > 0 ? (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Suburb</TableHead>
                              <TableHead>Post Code</TableHead>
                              <TableHead>State</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedFranchisee.territoryJson.map((t, i) => (
                              <TableRow key={i}>
                                <TableCell>{t.suburbs}</TableCell>
                                <TableCell>{t.post_code}</TableCell>
                                <TableCell>{t.state}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No primary territory configured.</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <h3 className="text-lg font-semibold">StarTrack Coverage</h3>
                        {!selectedFranchisee.mpStarTrackActivated && (
                            <Badge variant="secondary" className="ml-auto">Inactive</Badge>
                        )}
                    </div>
                    {selectedFranchisee.mpStarTrackActivated && selectedFranchisee.starTrackSuburbsJson && selectedFranchisee.starTrackSuburbsJson.length > 0 ? (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Suburb</TableHead>
                              <TableHead>Post Code</TableHead>
                              <TableHead>State</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedFranchisee.starTrackSuburbsJson.map((t, i) => (
                              <TableRow key={i}>
                                <TableCell>{t.suburbs}</TableCell>
                                <TableCell>{t.post_code}</TableCell>
                                <TableCell>{t.state}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
                         No Active StarTrack Product Mapping Provisioned
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <h3 className="text-lg font-semibold">AusPost Coverage</h3>
                        {(!selectedFranchisee.ausPostSuburbsJson || selectedFranchisee.ausPostSuburbsJson.length === 0) && (
                            <Badge variant="secondary" className="ml-auto">Inactive</Badge>
                        )}
                    </div>
                    {selectedFranchisee.ausPostSuburbsJson && selectedFranchisee.ausPostSuburbsJson.length > 0 ? (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Suburb</TableHead>
                              <TableHead>Post Code</TableHead>
                              <TableHead>State</TableHead>
                              <TableHead>LPO Mapping</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedFranchisee.ausPostSuburbsJson.map((t, i) => (
                              <TableRow key={i}>
                                <TableCell>{t.suburbs}</TableCell>
                                <TableCell>{t.post_code}</TableCell>
                                <TableCell>{t.state}</TableCell>
                                <TableCell>
                                  {t.parent_lpo_id ? (
                                    <span className="font-medium text-xs">
                                      {t.parent_lpo_id}{lpoNames[t.parent_lpo_id] ? ` - ${lpoNames[t.parent_lpo_id]}` : ''}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs italic">- No Match -</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
                         No Active AusPost Product Mapping Provisioned
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <h3 className="text-lg font-semibold">Operators</h3>
                        {loadingOperators && <Loader className="w-4 h-4 ml-2" />}
                    </div>
                    {!loadingOperators && operators.length > 0 ? (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Employment</TableHead>
                              <TableHead>Main Territory</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {operators.map((op) => (
                              <TableRow key={op.internalId}>
                                <TableCell>{`${op.givenNames} ${op.surname}`.trim() || 'N/A'}</TableCell>
                                <TableCell>
                                  {op.contactPhone ? (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSmsDialogTarget({ phone: op.contactPhone!, name: `${op.givenNames} ${op.surname}`.trim() || 'Operator' });
                                      }}
                                      className="text-primary hover:underline text-left bg-transparent border-none p-0 cursor-pointer"
                                      title="Send SMS via App"
                                    >
                                      {op.contactPhone}
                                    </button>
                                  ) : (
                                    <span className="text-muted-foreground">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {op.contactEmail ? (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEmailDialogTarget({ email: op.contactEmail!, name: `${op.givenNames} ${op.surname}`.trim() || 'Operator' });
                                      }}
                                      className="text-primary hover:underline text-left bg-transparent border-none p-0 cursor-pointer"
                                      title="Send Email via App"
                                    >
                                      {op.contactEmail}
                                    </button>
                                  ) : (
                                    <span className="text-muted-foreground">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{op.operatorStatus || 'Unknown'}</Badge>
                                </TableCell>
                                <TableCell>{op.employment || 'Unknown'}</TableCell>
                                <TableCell>
                                  {op.mainFranchiseeId === selectedFranchisee.internalId ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Yes</Badge>
                                  ) : (
                                    <span className="text-muted-foreground">No</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : !loadingOperators ? (
                      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
                         No Operators Assigned
                      </div>
                    ) : null}
                  </div>
                </div>
              </ScrollArea>
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
    </div>
  );
}
