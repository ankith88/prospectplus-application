'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Franchisee, Operator } from '@/lib/types';
import { getAllFranchisees, getOperatorsForFranchisee } from '@/services/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [territoryQuery, setTerritoryQuery] = useState('');

  // Dialog states
  const [emailDialogTarget, setEmailDialogTarget] = useState<{ email: string, name: string } | null>(null);
  const [smsDialogTarget, setSmsDialogTarget] = useState<{ phone: string, name: string } | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getAllFranchisees();
        const sortedData = data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setFranchisees(sortedData);

        // Fetch unique LPO names
        const uniqueLpoIds = new Set<string>();
        data.forEach(f => {
            f.ausPostSuburbsJson?.forEach((t: any) => {
                if (t.parent_lpo_id) uniqueLpoIds.add(t.parent_lpo_id);
            });
        });

        const namesRecord: Record<string, string> = {};
        await Promise.allSettled(
            Array.from(uniqueLpoIds).map(async (id) => {
                try {
                    const res = await fetch(`/api/lpo/${id}`);
                    const json = await res.json();
                    if (json.success && json.name) {
                        namesRecord[id] = json.name;
                    }
                } catch (e) {
                    console.error("Failed to fetch LPO name for", id);
                }
            })
        );
        setLpoNames(namesRecord);
      } catch (error) {
        console.error('Failed to load franchisees:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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

      return matchesText && matchesTerritory;
    });
  }, [franchisees, searchQuery, territoryQuery]);

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
      "AusPost Suburb", "AusPost State", "AusPost Postcode", "LPO ID", "LPO Name"
    ];
    const rows: string[][] = [];

    filteredFranchisees.forEach(f => {
      if (!f.ausPostSuburbsJson || f.ausPostSuburbsJson.length === 0) {
        rows.push([
          f.internalId || "", f.name || "", f.mainContact || "", f.email || "", f.mobile || "", f.salesRepAssigned || "",
          "", "", "", "", ""
        ]);
        return;
      }

      f.ausPostSuburbsJson.forEach((t: any) => {
        const lpoId = t.parent_lpo_id || "";
        const lpoName = lpoId ? (lpoNames[lpoId] || "") : "";
        rows.push([
          f.internalId || "", f.name || "", f.mainContact || "", f.email || "", f.mobile || "", f.salesRepAssigned || "",
          t.suburbs || "", t.state || "", t.post_code || "", lpoId, lpoName
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
        <div className="ml-auto flex items-center gap-2">
          <BulkImportOperators />
          <Button variant="outline" onClick={downloadCSV} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Internal ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Main Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Main Territory</TableHead>
              <TableHead>StarTrack Coverage</TableHead>
              <TableHead>AusPost Coverage</TableHead>
              <TableHead>LPO Name</TableHead>
              <TableHead>Sales Rep</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFranchisees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No active franchisees found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredFranchisees.map((franchisee) => (
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
                    {(() => {
                        if (!franchisee.ausPostSuburbsJson || franchisee.ausPostSuburbsJson.length === 0) return null;
                        const ids = Array.from(new Set(franchisee.ausPostSuburbsJson.map((t: any) => t.parent_lpo_id).filter(Boolean)));
                        if (ids.length === 0) return null;
                        return (
                            <span className="font-bold text-xs">
                                {ids.map(id => lpoNames[id] || "").filter(Boolean).join(", ")}
                            </span>
                        );
                    })()}
                  </TableCell>
                  <TableCell>{franchisee.salesRepAssigned || 'Unassigned'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedFranchisee} onOpenChange={(open) => !open && setSelectedFranchisee(null)}>
        <SheetContent className="sm:max-w-[600px] w-[90vw] p-0 flex flex-col h-full">
          {selectedFranchisee && (
            <>
              <div className="p-6 border-b shrink-0">
                <SheetHeader>
                  <SheetTitle className="text-2xl">{selectedFranchisee.name}</SheetTitle>
                  <SheetDescription>
                    Territory Coverage & Operational Boundaries
                  </SheetDescription>
                </SheetHeader>
              </div>
              
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Main Courier Territory Bounds</h3>
                    {selectedFranchisee.territoryJson && selectedFranchisee.territoryJson.length > 0 ? (
                      <div className="rounded-md border">
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
                      <div className="rounded-md border">
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
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Suburb</TableHead>
                              <TableHead>Post Code</TableHead>
                              <TableHead>State</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedFranchisee.ausPostSuburbsJson.map((t, i) => (
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
                      <div className="rounded-md border">
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
        </SheetContent>
      </Sheet>

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
    </div>
  );
}
