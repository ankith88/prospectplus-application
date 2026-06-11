'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Franchisee } from '@/lib/types';
import { getAllFranchisees } from '@/services/firebase';
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
import { Search, MapPin } from 'lucide-react';
import { SmsDialog } from '@/components/sms-dialog';
import { EmailDialog } from '@/components/email-dialog';
import { useAuth } from '@/hooks/use-auth';

export default function FranchiseeDirectoryClient() {
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFranchisee, setSelectedFranchisee] = useState<Franchisee | null>(null);

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
                      <Badge variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200">
                        {franchisee.ausPostSuburbsJson.length} Suburbs
                      </Badge>
                    )}
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
