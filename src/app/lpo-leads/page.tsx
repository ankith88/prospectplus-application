"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { FullScreenLoader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building, ArrowUpRight, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LpoLead {
  id: string;
  prospectPlusId: string;
  lpoName: string;
  lpoOwnerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  postcode: string;
  status: string;
  createdAt?: any;
}

export default function LpoLeadsListPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();
  const { toast } = useToast();
  const [leads, setLeads] = useState<LpoLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form states
  const [lpoName, setLpoName] = useState('');
  const [lpoOwnerName, setLpoOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreateLpoLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lpoName || !lpoOwnerName || !email || !phone) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    setCreating(true);
    try {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let randomStr = '';
      for (let i = 0; i < 6; i++) {
        randomStr += chars[Math.floor(Math.random() * chars.length)];
      }
      const prospectPlusId = `LPO${randomStr}`;

      const newLeadData = {
        prospectPlusId,
        lpoName,
        lpoOwnerName,
        email,
        phone,
        address1,
        address2,
        city,
        state,
        postcode,
        notes,
        status: 'New',
        source: 'Head Office Generated',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'lpo_leads'), newLeadData);

      toast({
        title: 'LPO Lead Created',
        description: `Successfully created LPO lead ${lpoName}.`,
      });

      // Reset form
      setLpoName('');
      setLpoOwnerName('');
      setEmail('');
      setPhone('');
      setAddress1('');
      setAddress2('');
      setCity('');
      setState('');
      setPostcode('');
      setNotes('');
      setIsCreateOpen(false);
    } catch (err) {
      console.error('Error creating LPO lead:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create LPO lead.',
      });
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (authLoading || loadingPermissions || !canView('lpoLeads')) return;

    const q = query(collection(firestore, 'lpo_leads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData: LpoLead[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        leadsData.push({
          id: doc.id,
          ...data,
        } as LpoLead);
      });
      setLeads(leadsData);
      setLoadingLeads(false);
    }, (error) => {
      console.error('Error fetching LPO leads:', error);
      setLoadingLeads(false);
    });

    return () => unsubscribe();
  }, [authLoading, loadingPermissions, canView]);

  if (authLoading || loadingPermissions) {
    return <FullScreenLoader message="Loading..." />;
  }

  if (!canView('lpoLeads')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view the LPO Leads page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building className="h-8 w-8 text-[#095c7b]" />
            LPO Leads
          </h1>
          <p className="text-slate-500 mt-1">Manage and track Licensed Post Office franchise leads.</p>
        </div>
        <Button 
          onClick={() => setIsCreateOpen(true)} 
          className="bg-[#095c7b] hover:bg-[#053647] text-white font-bold"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create LPO Lead
        </Button>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-semibold text-slate-800">Enquiries List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingLeads ? (
            <div className="p-8 text-center text-slate-500">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No LPO leads found.</div>
          ) : (
            <Table>
              <TableHeader className="bg-[#095c7b] hover:bg-[#095c7b]">
                <TableRow className="hover:bg-[#095c7b]">
                  <TableHead className="font-bold text-white w-[100px]">Lead ID</TableHead>
                  <TableHead className="font-bold text-white min-w-[180px]">LPO Location / Owner</TableHead>
                  <TableHead className="font-bold text-white text-center w-[70px]">NEW</TableHead>
                  <TableHead className="font-bold text-white text-center w-[120px]">PARTNER LINKED</TableHead>
                  <TableHead className="font-bold text-white text-center w-[100px]">INDUCTION</TableHead>
                  <TableHead className="font-bold text-white text-center w-[160px]">FRANCHISEES ASSIGNED</TableHead>
                  <TableHead className="font-bold text-white text-center w-[90px]">SCF SENT</TableHead>
                  <TableHead className="font-bold text-white text-center w-[120px]">SCF ACCEPTED</TableHead>
                  <TableHead className="font-bold text-white text-center w-[120px]">PORTAL ACCESS</TableHead>
                  <TableHead className="font-bold text-white text-center w-[140px]">PORTAL LOGGED IN</TableHead>
                  <TableHead className="font-bold text-white text-center w-[130px]">NETSUITE SYNCED</TableHead>
                  <TableHead className="font-bold text-white text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const isNew = true; // Always new if it exists
                  const isPartnerLinked = ['Linked to Partner Location', 'Induction', 'Franchisees Assigned', 'SCF Sent', 'SCF Accepted', 'LPO.Plus Access Sent', 'LPO.Plus Logged In', 'Lead Created'].includes(lead.status);
                  const isInduction = ['Induction', 'Franchisees Assigned', 'SCF Sent', 'SCF Accepted', 'LPO.Plus Access Sent', 'LPO.Plus Logged In', 'Lead Created'].includes(lead.status);
                  const isFranchiseesAssigned = ['Franchisees Assigned', 'SCF Sent', 'SCF Accepted', 'LPO.Plus Access Sent', 'LPO.Plus Logged In', 'Lead Created'].includes(lead.status);
                  const isScfSent = ['SCF Sent', 'SCF Accepted', 'LPO.Plus Access Sent', 'LPO.Plus Logged In', 'Lead Created'].includes(lead.status);
                  const isScfAccepted = ['SCF Accepted', 'LPO.Plus Access Sent', 'LPO.Plus Logged In', 'Lead Created'].includes(lead.status);
                  const isPortalAccess = ['LPO.Plus Access Sent', 'LPO.Plus Logged In', 'Lead Created'].includes(lead.status);
                  const isPortalLoggedIn = ['LPO.Plus Logged In', 'Lead Created'].includes(lead.status);
                  const isNetsuiteSynced = ['Lead Created'].includes(lead.status);

                  return (
                    <TableRow key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-[#095c7b] py-3.5">
                        {lead.prospectPlusId}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 py-3.5">
                        <div>
                          <p className="font-bold text-slate-800">{lead.lpoName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{lead.lpoOwnerName} &bull; {lead.email}</p>
                        </div>
                      </TableCell>
                      
                      {/* NEW */}
                      <TableCell className="text-center py-3.5">
                        <Clock className="h-4.5 w-4.5 text-slate-600 mx-auto" />
                      </TableCell>

                      {/* PARTNER LINKED */}
                      <TableCell className="text-center py-3.5">
                        {isPartnerLinked ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 fill-emerald-100 mx-auto" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-rose-500 mx-auto" />
                        )}
                      </TableCell>

                      {/* INDUCTION */}
                      <TableCell className="text-center py-3.5">
                        {isInduction ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 fill-emerald-100 mx-auto" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-rose-500 mx-auto" />
                        )}
                      </TableCell>

                      {/* FRANCHISEES ASSIGNED */}
                      <TableCell className="text-center py-3.5">
                        {isFranchiseesAssigned ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 fill-emerald-100 mx-auto" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-rose-500 mx-auto" />
                        )}
                      </TableCell>

                      {/* SCF SENT */}
                      <TableCell className="text-center py-3.5">
                        {isScfSent ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 fill-emerald-100 mx-auto" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-rose-500 mx-auto" />
                        )}
                      </TableCell>

                      {/* SCF ACCEPTED */}
                      <TableCell className="text-center py-3.5">
                        {isScfAccepted ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 fill-emerald-100 mx-auto" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-rose-500 mx-auto" />
                        )}
                      </TableCell>

                      {/* PORTAL ACCESS */}
                      <TableCell className="text-center py-3.5">
                        {isPortalAccess ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 fill-emerald-100 mx-auto" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-rose-500 mx-auto" />
                        )}
                      </TableCell>

                      {/* PORTAL LOGGED IN */}
                      <TableCell className="text-center py-3.5">
                        {isPortalLoggedIn ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 fill-emerald-100 mx-auto" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-rose-500 mx-auto" />
                        )}
                      </TableCell>

                      {/* NETSUITE SYNCED */}
                      <TableCell className="text-center py-3.5">
                        {isNetsuiteSynced ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 fill-emerald-100 mx-auto" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-rose-500 mx-auto" />
                        )}
                      </TableCell>

                      <TableCell className="text-right py-3.5">
                        <Link 
                          href={`/lpo-leads/${lead.id}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[#095c7b] hover:text-[#053647]"
                        >
                          Profile
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Building className="h-5 w-5 text-[#095c7b]" />
              Create LPO Lead
            </DialogTitle>
            <DialogDescription>
              Add a new Licensed Post Office lead. The source will be set to "Head Office Generated".
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLpoLead} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lpoName" className="font-semibold text-slate-700">LPO Name *</Label>
                <Input id="lpoName" value={lpoName} onChange={(e) => setLpoName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lpoOwnerName" className="font-semibold text-slate-700">LPO Owner Name *</Label>
                <Input id="lpoOwnerName" value={lpoOwnerName} onChange={(e) => setLpoOwnerName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold text-slate-700">Contact Email *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-semibold text-slate-700">Contact Phone *</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address1" className="font-semibold text-slate-700">Address line 1</Label>
                <Input id="address1" value={address1} onChange={(e) => setAddress1(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address2" className="font-semibold text-slate-700">Address line 2</Label>
                <Input id="address2" value={address2} onChange={(e) => setAddress2(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2 md:col-span-2">
                <div className="space-y-2">
                  <Label htmlFor="city" className="font-semibold text-slate-700">Suburb</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="font-semibold text-slate-700">State</Label>
                  <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode" className="font-semibold text-slate-700">Postcode</Label>
                  <Input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="notes" className="font-semibold text-slate-700">Notes / Comments</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="bg-[#095c7b] hover:bg-[#053647] text-white">
                {creating ? 'Creating...' : 'Save Lead'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
