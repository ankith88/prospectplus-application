'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, where, addDoc } from 'firebase/firestore';
import { Loader2, Search, Trash2, Plus, ShieldAlert, FileSpreadsheet, ExternalLink, Check } from 'lucide-react';
import Link from 'next/link';

interface SuppressedEmail {
  id: string;
  email: string;
  unsubscribedAt: string;
  deliveryId?: string;
  campaignId?: string;
  leadId?: string;
  companyName?: string;
  leadName?: string;
}

export function SuppressionList() {
  const [suppressedList, setSuppressedList] = useState<SuppressedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newLeadName, setNewLeadName] = useState('');
  const [adding, setAdding] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchSuppressionList();
  }, []);

  const fetchSuppressionList = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(firestore, 'marketing_suppression_list'),
        orderBy('unsubscribedAt', 'desc')
      );
      const snap = await getDocs(q);
      const list: SuppressedEmail[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          email: data.email || doc.id,
          unsubscribedAt: data.unsubscribedAt || new Date().toISOString(),
          deliveryId: data.deliveryId,
          campaignId: data.campaignId,
          leadId: data.leadId,
          companyName: data.companyName,
          leadName: data.leadName
        });
      });
      setSuppressedList(list);
    } catch (error) {
      console.error('Error fetching suppression list:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load the suppression list.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    const emailKey = newEmail.toLowerCase().trim();
    setAdding(true);

    try {
      const now = new Date().toISOString();

      // 1. Add to Firestore suppression collection
      await setDoc(doc(firestore, 'marketing_suppression_list', emailKey), {
        email: emailKey,
        unsubscribedAt: now,
        campaignId: 'manual',
        leadId: 'manual',
        companyName: newCompanyName || 'Manually Suppressed',
        leadName: newLeadName || 'Direct'
      });

      // 2. Find any lead contacts matching this email to opt them out automatically
      // We will perform a search on leads. It's client-side, so we query Firestore leads
      const leadsRef = collection(firestore, 'leads');
      const leadsSnap = await getDocs(leadsRef);

      let foundAndUpdated = false;

      for (const leadDoc of leadsSnap.docs) {
        // Query the contacts subcollection
        const contactsRef = collection(firestore, 'leads', leadDoc.id, 'contacts');
        const contactsSnap = await getDocs(query(contactsRef, where('email', '==', newEmail)));

        if (!contactsSnap.empty) {
          foundAndUpdated = true;
          // Update all matching contacts under this lead
          for (const cDoc of contactsSnap.docs) {
            await setDoc(doc(firestore, 'leads', leadDoc.id, 'contacts', cDoc.id), {
              sendEmail: 'no',
              optedOut: true
            }, { merge: true });
          }

          // Add activity log
          const activityRef = collection(firestore, 'leads', leadDoc.id, 'activity');
          await addDoc(activityRef, {
            type: 'Update',
            date: now,
            notes: `Manual Marketing Suppression: Contact opted out of campaigns by Admin command.`,
            author: 'Admin Dashboard'
          });
        }
      }

      toast({
        title: 'Suppression Added',
        description: foundAndUpdated 
          ? `Suppressed ${emailKey} and updated matching lead contact profile.`
          : `Suppressed ${emailKey} globally.`
      });

      setNewEmail('');
      setNewCompanyName('');
      setNewLeadName('');
      setIsAddOpen(false);
      fetchSuppressionList();

    } catch (error) {
      console.error('Error adding suppression:', error);
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: 'Could not write suppression record.'
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (suppressed: SuppressedEmail) => {
    if (!confirm(`Are you sure you want to resubscribe ${suppressed.email}? This will restore permission to receive marketing emails.`)) {
      return;
    }

    try {
      const emailKey = suppressed.email.toLowerCase().trim();

      // 1. Delete from global suppression collection
      await deleteDoc(doc(firestore, 'marketing_suppression_list', emailKey));

      // 2. If it was associated with a lead, update lead contact field permission
      if (suppressed.leadId && suppressed.leadId !== 'direct' && suppressed.leadId !== 'manual') {
        const leadRef = doc(firestore, 'leads', suppressed.leadId);
        
        // Find contacts subcollection matching this email
        const contactsRef = collection(firestore, 'leads', suppressed.leadId, 'contacts');
        const contactsSnap = await getDocs(query(contactsRef, where('email', '==', suppressed.email)));

        for (const cDoc of contactsSnap.docs) {
          await setDoc(doc(firestore, 'leads', suppressed.leadId, 'contacts', cDoc.id), {
            sendEmail: 'yes',
            optedOut: false
          }, { merge: true });
        }

        // Add re-opt-in activity log
        const activityRef = collection(firestore, 'leads', suppressed.leadId, 'activity');
        await addDoc(activityRef, {
          type: 'Update',
          date: new Date().toISOString(),
          notes: `Marketing Re-Opt-In: Contact '${suppressed.leadName}' (${suppressed.email}) resubscribed manually by Admin.`,
          author: 'Admin Dashboard'
        });
      }

      toast({
        title: 'Resubscribed Successfully',
        description: `Removed ${suppressed.email} from suppression list.`
      });

      fetchSuppressionList();

    } catch (error) {
      console.error('Error removing suppression:', error);
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: 'Failed to delete suppression record.'
      });
    }
  };

  const exportToCSV = () => {
    if (suppressedList.length === 0) return;

    const headers = ['Email Address', 'Contact Name', 'Company Name', 'Lead ID', 'Unsubscribed At', 'Source Campaign'];
    const rows = filteredList.map(item => [
      item.email,
      item.leadName || 'Unknown',
      item.companyName || 'Unknown',
      item.leadId || 'N/A',
      new Date(item.unsubscribedAt).toLocaleString(),
      item.campaignId || 'manual'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'unsubscribed_suppression_list.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredList = suppressedList.filter(item => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      item.email.toLowerCase().includes(term) ||
      (item.companyName && item.companyName.toLowerCase().includes(term)) ||
      (item.leadName && item.leadName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm rounded-xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl font-normal text-slate-800 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Unsubscribe & Suppression List
            </CardTitle>
            <CardDescription className="text-xs">
              View and manage lead contacts who have opted out of outbound marketing campaigns
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              disabled={filteredList.length === 0}
              className="text-xs h-9 gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export List (CSV)
            </Button>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 gap-1.5">
                  <Plus className="h-4 w-4" /> Add Manual Block
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleManualAdd}>
                  <DialogHeader>
                    <DialogTitle>Add Manual Suppression</DialogTitle>
                    <DialogDescription>
                      Manually add an email address to the global suppression list to block outbound messages.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Email Address *</label>
                      <Input 
                        type="email" 
                        required 
                        placeholder="e.g. contact@domain.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Company Name (Optional)</label>
                      <Input 
                        placeholder="e.g. Acme Corp"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Contact Person Name (Optional)</label>
                      <Input 
                        placeholder="e.g. John Doe"
                        value={newLeadName}
                        onChange={(e) => setNewLeadName(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddOpen(false)}
                      disabled={adding}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={adding || !newEmail}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Block'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search Controls */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by email, company name, or lead contact..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50/50"
            />
          </div>

          {/* List Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="text-xs">Querying suppression database...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg bg-slate-50/50 text-slate-500 gap-2">
              <span className="text-xs">No matching suppressions found.</span>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b">
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Lead / Company</th>
                    <th className="p-3">Opt-Out Date</th>
                    <th className="p-3">Campaign Source</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-medium text-slate-800">
                        {item.email}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{item.leadName || 'Direct'}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            {item.companyName || 'Unknown'}
                            {item.leadId && item.leadId !== 'direct' && item.leadId !== 'manual' && (
                              <Link 
                                href={`/leads/${item.leadId}`} 
                                className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-0.5 ml-1"
                                target="_blank"
                              >
                                View Profile <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">
                        {new Date(item.unsubscribedAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[10px]">
                        {item.campaignId || 'manual'}
                      </td>
                      <td className="p-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemove(item)}
                          className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 text-[11px]"
                        >
                          <Check className="h-3.5 w-3.5" /> Opt Back In
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
