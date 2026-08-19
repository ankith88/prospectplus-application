"use client";

import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where, deleteDoc, deleteField } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { logActivity } from '@/services/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Phone, Mail, MapPin, Calendar, Clock, Save, FileText, Send, User, CheckCircle2, DollarSign, Truck, UserCheck, Edit3, Link2, ArrowUpRight, RefreshCw, Lock, Trash2, RotateCcw, Copy, Key, ExternalLink } from 'lucide-react';
import { LpoConversionWizard, buildLpoServicesArray } from './lpo-conversion-wizard';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';

interface LpoLeadProfileProps {
  initialLead: any;
}

export function LpoLeadProfile({ initialLead }: LpoLeadProfileProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [lead, setLead] = useState(initialLead);

  useEffect(() => {
    setLead(initialLead);
  }, [initialLead]);

  const rawStatus = lead?.status || initialLead.status || 'New';
  const initialStatus = (rawStatus === 'LPO.PLUS Sign In Email Sent' || rawStatus === 'LPO.Plus Sign In Email Sent') ? 'LPO.Plus Logged In' : rawStatus;
  const [status, setStatus] = useState(initialStatus);
  const [noteContent, setNoteContent] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [isEditingConversion, setIsEditingConversion] = useState(false);

  // Service Rate Editing State
  const [isEditRatesOpen, setIsEditRatesOpen] = useState(false);
  const [editAmpo, setEditAmpo] = useState(String(lead?.ampoRate ?? '0'));
  const [editPmpo, setEditPmpo] = useState(String(lead?.pmpoRate ?? '0'));
  const [editPackage, setEditPackage] = useState(String(lead?.packageRate ?? '0'));
  const [editAddBag, setEditAddBag] = useState(String(lead?.additionalBagRate ?? '0'));
  const [savingRates, setSavingRates] = useState(false);

  useEffect(() => {
    if (lead) {
      setEditAmpo(String(lead.ampoRate ?? '0'));
      setEditPmpo(String(lead.pmpoRate ?? '0'));
      setEditPackage(String(lead.packageRate ?? '0'));
      setEditAddBag(String(lead.additionalBagRate ?? '0'));
    }
  }, [lead]);

  const isScfAccepted = ['SCF Accepted', 'LPO.Plus Access Sent', 'LPO.Plus Logged In'].includes(lead?.status || status);
  const hasLinkedCustomer = Boolean(lead.linkedLeadId || lead.linkedLeadCompanyName || lead.rawCustomerName || lead.linkedCustomerId);

  // Sync real-time updates for activities/notes
  useEffect(() => {
    const q = query(
      collection(firestore, 'lpo_leads', lead.id, 'activity'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setActivities(list);
      setLoadingActivities(false);
    }, (err) => {
      console.error('Error fetching activities:', err);
      setLoadingActivities(false);
    });

    return () => unsubscribe();
  }, [lead.id]);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'Lost') {
      const confirmLost = window.confirm(
        'Marking this LPO Lead as Lost will update all linked parent and child leads/companies to Lost, disable LPO.Plus account access, and send an email notification to Fiona Harrison & Michael McDaid.\n\nDo you wish to proceed?'
      );
      if (!confirmLost) return;
    }

    setSavingStatus(true);
    try {
      if (newStatus === 'Lost') {
        const res = await fetch('/api/lpo-leads/mark-lost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lpoLeadId: lead.id,
            updatedBy: userProfile?.displayName || userProfile?.email || 'System User'
          })
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to process Lost status');
        }
      } else {
        const docRef = doc(firestore, 'lpo_leads', lead.id);
        await updateDoc(docRef, { status: newStatus });
        
        // Log status change activity
        await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
          type: 'StatusChange',
          notes: `Status updated from "${status}" to "${newStatus}"`,
          author: userProfile?.displayName || userProfile?.email || 'System User',
          createdAt: serverTimestamp(),
        });
      }

      setStatus(newStatus);
      setLead((prev: any) => ({ ...prev, status: newStatus }));
      toast({
        title: newStatus === 'Lost' ? 'LPO Lead & Linked Records Marked Lost' : 'Status Updated',
        description: newStatus === 'Lost'
          ? 'LPO Lead and all linked parent/child leads marked as Lost. LPO.Plus access disabled & email notification sent to Fiona & Michael.'
          : `Lead status changed to ${newStatus}.`,
      });
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update lead status.',
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    try {
      const authorName = userProfile?.displayName || userProfile?.email || 'System User';
      const nowIso = new Date().toISOString();
      const content = noteContent.trim();

      await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
        type: 'Note',
        notes: content,
        author: authorName,
        createdAt: serverTimestamp(),
      });

      const targetParentId = lead.createdParentLeadId || lead.linkedLeadId || lead.parentLeadId;
      const childIds: string[] = Array.isArray(lead.createdChildLeadIds) ? lead.createdChildLeadIds : [];
      const crmLeadIdsToSync = new Set<string>();
      if (targetParentId) crmLeadIdsToSync.add(targetParentId);
      childIds.forEach(id => crmLeadIdsToSync.add(id));

      for (const crmId of Array.from(crmLeadIdsToSync)) {
        try {
          const lRef = doc(firestore, 'leads', crmId);
          const lSnap = await getDoc(lRef);
          if (lSnap.exists()) {
            await addDoc(collection(firestore, 'leads', crmId, 'notes'), {
              content: `LPO Lead Note: ${content}`,
              author: authorName,
              date: nowIso,
              syncedWithNetSuite: false
            });
            await logActivity(crmId, { type: 'Update', notes: `LPO Note added: ${content.substring(0, 100)}...`, date: nowIso }, 'leads');
          } else {
            const cRef = doc(firestore, 'companies', crmId);
            const cSnap = await getDoc(cRef);
            if (cSnap.exists()) {
              await addDoc(collection(firestore, 'companies', crmId, 'notes'), {
                content: `LPO Lead Note: ${content}`,
                author: authorName,
                date: nowIso,
                syncedWithNetSuite: false
              });
              await logActivity(crmId, { type: 'Update', notes: `LPO Note added: ${content.substring(0, 100)}...`, date: nowIso }, 'companies');
            }
          }
        } catch (e) {
          console.warn(`Could not sync LPO note to CRM lead ${crmId}:`, e);
        }
      }

      setNoteContent('');
      toast({
        title: 'Note Added',
        description: 'Staff note successfully recorded and synced to linked CRM lead records.',
      });
    } catch (err) {
      console.error('Error adding note:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add staff note.',
      });
    }
  };

  const handleSaveServiceRates = async () => {
    if (isScfAccepted) {
      toast({
        variant: 'destructive',
        title: 'Editing Locked',
        description: 'Service rates cannot be updated after SCF has been accepted.'
      });
      return;
    }

    setSavingRates(true);
    try {
      const am = parseFloat(editAmpo) || 0;
      const pm = parseFloat(editPmpo) || 0;
      const pkg = parseFloat(editPackage) || 0;
      const add = parseFloat(editAddBag) || 0;

      const newServices = buildLpoServicesArray(am, pm, pkg, add);

      // 1. Update LPO Lead Document in 'lpo_leads'
      const lpoDocRef = doc(firestore, 'lpo_leads', lead.id);
      const updatedData = {
        ampoRate: am,
        pmpoRate: pm,
        packageRate: pkg,
        additionalBagRate: add,
        servicesAndRates: {
          ...(lead.servicesAndRates || {}),
          ampoRate: am,
          pmpoRate: pm,
          packageRate: pkg,
          additionalBagRate: add
        },
        updatedAt: serverTimestamp()
      };
      await updateDoc(lpoDocRef, updatedData);

      // 2. Sync to linked CRM Leads (Parent Lead & Child Leads)
      const targetParentId = lead.createdParentLeadId || lead.linkedLeadId;
      if (targetParentId) {
        // Update Parent Lead
        const parentRef = doc(firestore, 'leads', targetParentId);
        await updateDoc(parentRef, {
          ampoRate: am,
          pmpoRate: pm,
          packageRate: pkg,
          additionalBagRate: add,
          services: newServices,
          updatedAt: serverTimestamp()
        }).catch((err) => console.warn('Warning updating parent lead rates:', err));

        // Update Child Leads if any
        if (lead.createdChildLeadIds && Array.isArray(lead.createdChildLeadIds)) {
          for (const childId of lead.createdChildLeadIds) {
            const childRef = doc(firestore, 'leads', childId);
            await updateDoc(childRef, {
              ampoRate: am,
              pmpoRate: pm,
              packageRate: pkg,
              additionalBagRate: add,
              services: newServices,
              updatedAt: serverTimestamp()
            }).catch((err) => console.warn('Warning updating child lead rates:', err));
          }
        }
      }

      // 3. Add activity log entry
      await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
        type: 'RateUpdate',
        notes: `Agreed service rates updated: AM PO ($${am}), PM PO ($${pm}), Package ($${pkg}), Add. Bag ($${add}). Synchronized to CRM leads collection.`,
        author: userProfile?.displayName || userProfile?.email || 'System User',
        createdAt: serverTimestamp()
      });

      setLead((prev: any) => ({
        ...prev,
        ampoRate: am,
        pmpoRate: pm,
        packageRate: pkg,
        additionalBagRate: add
      }));

      toast({
        title: 'Service Rates Updated',
        description: 'Agreed rates and CRM services array successfully updated and synchronized.'
      });

      setIsEditRatesOpen(false);
    } catch (err) {
      console.error('Error updating service rates:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update service rates.'
      });
    } finally {
      setSavingRates(false);
    }
  };

  // Franchisee Resolution & Editing State
  const [isEditFranchiseesOpen, setIsEditFranchiseesOpen] = useState(false);
  const [allFranchisees, setAllFranchisees] = useState<any[]>([]);
  const [selectedFranchiseeNames, setSelectedFranchiseeNames] = useState<string[]>([]);
  const [savingFranchisees, setSavingFranchisees] = useState(false);

  const getResolvedFranchisees = (leadData: any): string[] => {
    if (!leadData) return [];
    const names: string[] = [];

    if (leadData.linkedFranchisees && Array.isArray(leadData.linkedFranchisees) && leadData.linkedFranchisees.length > 0) {
      leadData.linkedFranchisees.forEach((f: any) => {
        if (typeof f === 'string' && f.trim()) names.push(f.trim());
        else if (typeof f === 'object' && f) {
          const n = f.name || f.franchiseeName || f.companyName || f.label || f.title;
          if (n && typeof n === 'string' && n.trim()) names.push(n.trim());
        }
      });
    }

    if (leadData.franchisees && Array.isArray(leadData.franchisees) && leadData.franchisees.length > 0) {
      leadData.franchisees.forEach((f: any) => {
        if (typeof f === 'string' && f.trim()) names.push(f.trim());
        else if (typeof f === 'object' && f) {
          const n = f.name || f.franchiseeName || f.companyName || f.label || f.title;
          if (n && typeof n === 'string' && n.trim()) names.push(n.trim());
        }
      });
    }

    const directFields = [
      leadData.linkedFranchiseeName,
      leadData.companyNameFranchise,
      leadData.franchiseeName,
      leadData.franchisee,
      leadData.assignedFranchisee,
      leadData.assignedFranchiseeName
    ];

    directFields.forEach((val) => {
      if (val && typeof val === 'string' && val.trim()) {
        val.split(',').forEach((s) => {
          if (s.trim()) names.push(s.trim());
        });
      }
    });

    return Array.from(new Set(names));
  };

  const handleOpenEditFranchisees = async () => {
    setSelectedFranchiseeNames(getResolvedFranchisees(lead));
    setIsEditFranchiseesOpen(true);
    if (allFranchisees.length === 0) {
      try {
        const snap = await getDocs(collection(firestore, 'franchisees'));
        const list: any[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const fName = data.name || data.mainContact || docSnap.id;
          list.push({ id: docSnap.id, name: fName, ...data });
        });
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setAllFranchisees(list);
      } catch (err) {
        console.error('Error fetching franchisees:', err);
      }
    }
  };

  const handleSaveFranchisees = async () => {
    setSavingFranchisees(true);
    try {
      const linkedFranchiseesPayload = selectedFranchiseeNames.map((name) => {
        const matchingDoc = allFranchisees.find((f) => (f.name || f.mainContact) === name);
        return {
          franchiseeId: matchingDoc?.id || name,
          name: name,
        };
      });

      const combinedName = selectedFranchiseeNames.join(', ');
      const lpoDocRef = doc(firestore, 'lpo_leads', lead.id);

      const updatePayload: any = {
        linkedFranchisees: linkedFranchiseesPayload,
        linkedFranchiseeName: combinedName || null,
        companyNameFranchise: combinedName || null,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(lpoDocRef, updatePayload);

      await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
        type: 'FranchiseeUpdate',
        notes: `Linked Franchisee assignment updated to: "${combinedName || 'Unassigned'}"`,
        author: userProfile?.displayName || userProfile?.email || 'System User',
        createdAt: serverTimestamp(),
      });

      setLead((prev: any) => ({
        ...prev,
        linkedFranchisees: linkedFranchiseesPayload,
        linkedFranchiseeName: combinedName || null,
        companyNameFranchise: combinedName || null,
      }));

      toast({
        title: 'Franchisee Assignment Updated',
        description: `Linked franchisee(s) set to: ${combinedName || 'Unassigned'}.`,
      });

      setIsEditFranchiseesOpen(false);
    } catch (err) {
      console.error('Error updating franchisee assignment:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update franchisee assignment.',
      });
    } finally {
      setSavingFranchisees(false);
    }
  };

  // Reset CRM Leads State
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resettingLeads, setResettingLeads] = useState(false);

  const handleResetCrmLeads = async () => {
    const targetParentId = lead.createdParentLeadId || lead.linkedLeadId;
    if (!targetParentId) return;

    setResettingLeads(true);
    try {
      // 1. Find all child lead IDs linked to this parent
      const childIdsToDelete = new Set<string>(lead.createdChildLeadIds || []);
      
      const qChild = query(collection(firestore, 'leads'), where('parentLeadId', '==', targetParentId));
      const childSnap = await getDocs(qChild);
      childSnap.forEach((docSnap) => {
        childIdsToDelete.add(docSnap.id);
      });

      // 2. Delete Parent Lead Document
      await deleteDoc(doc(firestore, 'leads', targetParentId)).catch((err) => {
        console.warn('Parent lead document delete warning:', err);
      });

      // 3. Delete Child Lead Documents
      let deletedChildCount = 0;
      for (const childId of Array.from(childIdsToDelete)) {
        await deleteDoc(doc(firestore, 'leads', childId)).catch((err) => {
          console.warn(`Child lead document ${childId} delete warning:`, err);
        });
        deletedChildCount++;
      }

      // 4. Reset LPO Lead Document
      const lpoDocRef = doc(firestore, 'lpo_leads', lead.id);
      const resetPayload: any = {
        isConverted: false,
        createdParentLeadId: deleteField(),
        createdChildLeadIds: deleteField(),
        linkedLeadId: deleteField(),
        linkedLeadCompanyName: deleteField(),
        status: 'Franchisees Assigned',
        conversionStep: 1,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(lpoDocRef, resetPayload);

      // 5. Add Activity Log
      await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
        type: 'ConversionReset',
        notes: `CRM Parent Lead (${targetParentId}) and ${deletedChildCount} Child Lead(s) were deleted from the database. Conversion status reset for re-conversion.`,
        author: userProfile?.displayName || userProfile?.email || 'System User',
        createdAt: serverTimestamp(),
      });

      // 6. Update local state to re-enable wizard
      const updatedLeadState = {
        ...lead,
        isConverted: false,
        createdParentLeadId: undefined,
        createdChildLeadIds: undefined,
        linkedLeadId: undefined,
        linkedLeadCompanyName: undefined,
        status: 'Franchisees Assigned',
        conversionStep: 1,
      };
      setLead(updatedLeadState);
      setStatus('Franchisees Assigned');
      setIsEditingConversion(true);

      toast({
        title: 'CRM Leads Deleted',
        description: `Parent lead ${targetParentId} and ${deletedChildCount} child lead(s) deleted. Conversion reset!`,
      });

      setIsResetDialogOpen(false);
    } catch (err: any) {
      console.error('Error resetting CRM leads:', err);
      toast({
        variant: 'destructive',
        title: 'Error Resetting Leads',
        description: err.message || 'Failed to delete CRM leads.',
      });
    } finally {
      setResettingLeads(false);
    }
  };

  const handleUpdateLpoStatus = async (newStatus: string, notes: string) => {
    try {
      if (newStatus === 'Lost') {
        const res = await fetch('/api/lpo-leads/mark-lost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lpoLeadId: lead.id,
            lossReason: notes,
            updatedBy: userProfile?.displayName || userProfile?.email || 'System User'
          })
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to process Lost status');
        }
      } else {
        const docRef = doc(firestore, 'lpo_leads', lead.id);
        await updateDoc(docRef, { status: newStatus });
        
        await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
          type: 'StatusChange',
          notes,
          author: userProfile?.displayName || userProfile?.email || 'System User',
          createdAt: serverTimestamp(),
        });
      }

      setLead((prev: any) => ({ ...prev, status: newStatus }));
      setStatus(newStatus);
      toast({
        title: newStatus === 'Lost' ? 'LPO Lead & Linked Records Marked Lost' : 'Status Updated',
        description: newStatus === 'Lost'
          ? 'LPO Lead and linked records marked as Lost. LPO.Plus access disabled & email notification sent to Fiona & Michael.'
          : `Status changed to ${newStatus}.`,
      });
    } catch (err: any) {
      console.error('Error updating LPO status:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update status.',
      });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusOptions = ['New', 'Linked to Partner Location', 'Induction', 'Operations Setup', 'Franchisees Assigned', 'SCF Sent', 'SCF Accepted', 'LPO.Plus Access Sent', 'LPO.Plus Logged In', 'Lead Created', 'Lost'];

  const [isRecheckingPortal, setIsRecheckingPortal] = useState(false);

  const handleRecheckLpoPlusStatus = async () => {
    setIsRecheckingPortal(true);
    try {
      const res = await fetch('/api/lpo-leads/sync-portal-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lpoLeadId: lead.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.updatesLog && data.updatesLog.length > 0) {
          const newSt = data.updatesLog[0].newStatus;
          setStatus(newSt);
          setLead((prev: any) => ({ ...prev, status: newSt }));
          toast({
            title: 'LPO.Plus Status Updated',
            description: `Status updated to '${newSt}' based on live LPO.Plus database check.`,
          });
        } else {
          toast({
            title: 'Status Verified',
            description: `LPO.Plus status is up-to-date ('${status}').`,
          });
        }
      } else {
        throw new Error(data.error || 'Failed to verify portal status');
      }
    } catch (err: any) {
      console.error('Error rechecking LPO.Plus status:', err);
      toast({
        variant: 'destructive',
        title: 'Check Failed',
        description: err.message || 'Failed to re-check status against LPO.Plus database.',
      });
    } finally {
      setIsRecheckingPortal(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-50 text-[#095c7b] rounded-lg">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{lead.lpoName}</h1>
              <Badge className="bg-slate-100 text-[#095c7b] hover:bg-slate-100 border-[#095c7b]/20">
                {lead.prospectPlusId}
              </Badge>
              <Badge className="bg-[#eef6ed] text-[#095c7b] hover:bg-[#eef6ed] border-[#095c7b]/10 font-semibold">
                {status}
              </Badge>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              LPO Owner: <span className="font-semibold text-slate-700">{lead.lpoOwnerName}</span>
              {lead.abn && <span className="ml-3 text-xs bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded border border-slate-200">ABN: {lead.abn}</span>}
            </p>
            
            {hasLinkedCustomer && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 flex-wrap text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                  Linked CRM Customer:
                </span>
                {lead.linkedLeadId ? (
                  <a
                    href={`/leads/${lead.linkedLeadId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#095c7b] hover:underline bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                  >
                    {lead.linkedLeadCompanyName || lead.rawCustomerName || 'CRM Lead'}
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    {lead.linkedLeadCompanyName || lead.rawCustomerName}
                  </span>
                )}
                {lead.linkedCustomerId && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-mono text-[10px] font-bold">
                    ID: {lead.linkedCustomerId}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleRecheckLpoPlusStatus}
            disabled={isRecheckingPortal}
            variant="outline"
            size="sm"
            className="border-teal-600 text-teal-700 hover:bg-teal-50 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRecheckingPortal ? 'animate-spin' : ''}`} />
            Re-check LPO.Plus Status
          </Button>
          {lead.isConverted && (
            <Button
              onClick={() => setIsEditingConversion((prev) => !prev)}
              className="bg-[#095c7b] hover:bg-[#053647] text-white font-semibold text-sm rounded-lg"
            >
              <Edit3 className="w-4 h-4 mr-1.5" />
              {isEditingConversion ? 'Cancel Edit' : 'Edit Lead Conversion'}
            </Button>
          )}
          <span className="text-sm font-semibold text-slate-600">Sales Process:</span>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={savingStatus}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact and address details */}
        <div className="lg:col-span-2 space-y-6">
          {lead.isConverted && !isEditingConversion ? (
            <Card className="border-emerald-200 bg-emerald-50/10 shadow-sm border-2">
              <CardHeader className="bg-emerald-50/30 border-b border-emerald-100 flex flex-row items-center justify-between py-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    LPO Lead Converted
                  </CardTitle>
                  <CardDescription className="text-emerald-700/80 text-xs">
                    This LPO Lead has been successfully converted.
                  </CardDescription>
                </div>
                {lead.convertedAt && (
                  <span className="text-xs text-emerald-600 font-medium">
                    Converted: {new Date(lead.convertedAt).toLocaleDateString('en-AU')}
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                
                {/* Linked Inbound Lead */}
                <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-150 shadow-sm flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">NetSuite Connected CRM Lead</p>
                    {lead.linkedLeadId || lead.createdParentLeadId ? (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-bold text-[#095c7b]">{lead.linkedLeadCompanyName || lead.lpoName || 'CRM Lead'}</span>
                        <Badge className="bg-[#095c7b] text-white text-[10px]">ID: {lead.createdParentLeadId || lead.linkedLeadId}</Badge>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 mt-1 italic">Awaiting sync / lead creation from NetSuite API</p>
                    )}
                  </div>
                  {(lead.linkedLeadId || lead.createdParentLeadId) && (
                    <Button asChild size="sm" className="bg-[#095c7b] hover:bg-[#053647]">
                      <a href={`/leads/${lead.createdParentLeadId || lead.linkedLeadId}`}>
                        View CRM Lead
                      </a>
                    </Button>
                  )}
                </div>

                {/* LPO.PLUS Account & Access Credentials */}
                <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#095c7b] text-white rounded-md">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">LPO.PLUS Account & Access Credentials</h4>
                        <p className="text-xs text-slate-500">Provisioned in mp-lpo-connect / lpoconnect database</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-semibold">
                      {status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sign-In Portal</p>
                      <a
                        href="https://lpo.plus/signin"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[#095c7b] hover:underline flex items-center gap-1 mt-0.5"
                      >
                        https://lpo.plus/signin
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Username (Email)</p>
                      <p className="text-xs font-mono font-bold text-slate-800 truncate mt-0.5">{lead.email}</p>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Default Password</p>
                        <p className="text-xs font-mono font-bold text-[#095c7b] mt-0.5">{lead.defaultPassword || 'MailPlus2026!'}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const credText = `LPO.PLUS Credentials:\nPortal: https://lpo.plus/signin\nUsername: ${lead.email}\nPassword: ${lead.defaultPassword || 'MailPlus2026!'}`;
                          navigator.clipboard.writeText(credText);
                          toast({
                            title: 'Credentials Copied',
                            description: 'LPO.PLUS sign-in details copied to clipboard.',
                          });
                        }}
                        className="h-8 px-2 text-slate-600 hover:text-[#095c7b] hover:bg-slate-100"
                        title="Copy Credentials"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Delete Created CRM Leads & Reset Conversion Button */}
                {(lead.createdParentLeadId || lead.linkedLeadId) && (
                  <div className="p-4 bg-rose-50/70 rounded-lg border border-rose-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        CRM Leads Management & Re-Conversion
                      </p>
                      <p className="text-xs text-rose-700 mt-0.5">
                        Delete created CRM Parent & Child leads from database to restart conversion wizard from scratch.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setIsResetDialogOpen(true)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Delete CRM Leads & Reset Wizard
                    </Button>
                  </div>
                )}

                {/* Linked Partner & Kerry Induction */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">Linked AusPost Partner Location</p>
                    <p className="text-sm font-bold text-[#095c7b] mt-1">
                      {lead.linkedPartnerLocationName || 'None Linked'}
                    </p>
                    {lead.linkedPartnerLocationId && (
                      <p className="text-xs text-slate-400 mt-0.5">ID: {lead.linkedPartnerLocationId}</p>
                    )}
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">Inducted by Kerry</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {lead.inductedByKerry || 'Yes'}
                    </p>
                  </div>
                </div>

                {/* Agreed Rates */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Agreed Rates (Ex GST)
                    </h4>
                    {isScfAccepted ? (
                      <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200 bg-slate-50 font-semibold px-2 py-0.5">
                        <Lock className="w-3 h-3 mr-1 text-slate-400" /> Rates Locked (SCF Accepted)
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditRatesOpen(true)}
                        className="border-[#095c7b] text-[#095c7b] hover:bg-[#095c7b]/10 text-xs font-bold py-1 h-7"
                      >
                        <Edit3 className="w-3 h-3 mr-1" /> Edit Rates
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                      <p className="text-xs text-slate-500 font-medium">AMPO Rate</p>
                      <p className="text-base font-bold text-[#095c7b] mt-0.5">${lead.ampoRate ?? '0'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                      <p className="text-xs text-slate-500 font-medium">PMPO Rate</p>
                      <p className="text-base font-bold text-[#095c7b] mt-0.5">${lead.pmpoRate ?? '0'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                      <p className="text-xs text-slate-500 font-medium">Package Rate</p>
                      <p className="text-base font-bold text-[#095c7b] mt-0.5">${lead.packageRate ?? '0'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                      <p className="text-xs text-slate-500 font-medium">Add. Bag Rate</p>
                      <p className="text-base font-bold text-[#095c7b] mt-0.5">${lead.additionalBagRate ?? '0'}</p>
                    </div>
                  </div>
                </div>

                {/* Operations Overview */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    Operations Overview
                  </h4>
                  <div className="p-4 bg-white rounded-lg border border-slate-100 shadow-sm text-sm space-y-2">
                    <p>
                      <span className="text-slate-500 font-medium">Operates own service:</span>{' '}
                      <span className="font-semibold text-slate-800">{lead.operatesCollectionDelivery || 'Yes'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500 font-medium">Last Sweep Time:</span>{' '}
                      <span className="font-semibold text-slate-800">{lead.lastDailySweepTime || '02:00 pm'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500 font-medium">Franchisee Access:</span>{' '}
                      <span className="font-semibold text-slate-800">{lead.franchiseeAccess || 'Car Park'}</span>
                    </p>
                  </div>
                </div>

                {/* Linked Franchisees */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      Linked Franchisees
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenEditFranchisees}
                      className="border-[#095c7b] text-[#095c7b] hover:bg-[#095c7b]/10 text-xs font-bold py-1 h-7"
                    >
                      <Edit3 className="w-3 h-3 mr-1" /> Edit Franchisees
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {getResolvedFranchisees(lead).length > 0 ? (
                      getResolvedFranchisees(lead).map((fName) => (
                        <Badge key={fName} className="bg-[#095c7b] hover:bg-[#095c7b] text-white py-1.5 px-3 text-xs rounded-full">
                          {fName}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 italic">No franchisees linked.</span>
                    )}
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="border-t border-slate-200/80 pt-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Workflow Actions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateLpoStatus('SCF Sent', 'Service Commencement Form (SCF) emailed to LPO.')}
                      disabled={lead.status !== 'Franchisees Assigned'}
                      className="bg-[#095c7b] text-white hover:bg-[#053647]"
                    >
                      Send SCF
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateLpoStatus('SCF Accepted', 'SCF accepted and signed by LPO.')}
                      disabled={lead.status !== 'SCF Sent'}
                      className="bg-teal-650 text-white hover:bg-teal-700"
                    >
                      Mark SCF Accepted
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateLpoStatus('LPO.Plus Access Sent', 'Access credentials sent to LPO.Plus.')}
                      disabled={lead.status !== 'SCF Accepted'}
                      className="bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Send LPO.Plus Access
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateLpoStatus('LPO.Plus Logged In', 'LPO owner logged into LPO.Plus.')}
                      disabled={lead.status !== 'LPO.Plus Access Sent'}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Simulate LPO.Plus Login
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          ) : (
            <LpoConversionWizard
              lead={lead}
              onSuccess={(updatedLead) => {
                setLead((prev: any) => ({ ...prev, ...updatedLead }));
                setStatus(updatedLead.status || status);
                if (updatedLead.isConverted) {
                  setIsEditingConversion(false);
                }
              }}
            />
          )}
        </div>

        {/* Activity Timeline & Enquiry Info Column */}
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">Enquiry Information</CardTitle>
              <CardDescription>Details submitted by LPO owner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* LPO Overview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">LPO Details</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 text-xs font-medium">LPO Name:</span>
                  <span className="font-bold text-slate-900 text-sm text-right">{lead.lpoName || '—'}</span>
                </div>
                {lead.lpoOwnerName && (
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200/50 pt-1.5">
                    <span className="text-slate-600 text-xs font-medium">LPO Owner:</span>
                    <span className="font-semibold text-slate-800 text-xs text-right">{lead.lpoOwnerName}</span>
                  </div>
                )}
                {lead.abn && (
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200/50 pt-1.5">
                    <span className="text-slate-600 text-xs font-medium">ABN:</span>
                    <span className="font-mono font-semibold text-slate-800 text-xs text-right">{lead.abn}</span>
                  </div>
                )}
              </div>

              {/* Contact Information (Single Column with break-all to prevent overflow) */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50/70 border border-slate-100 min-w-0 overflow-hidden">
                  <Mail className="h-5 w-5 text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 font-medium">Contact Email</p>
                    {userProfile?.activeRole === 'user' ? (
                      <span className="text-xs font-semibold text-slate-800 break-all block">
                        {lead.email}
                      </span>
                    ) : (
                      <a href={`mailto:${lead.email}`} className="text-xs font-semibold text-[#095c7b] hover:underline break-all block">
                        {lead.email}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50/70 border border-slate-100 min-w-0 overflow-hidden">
                  <Phone className="h-5 w-5 text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 font-medium">Contact Phone</p>
                    <a href={`tel:${lead.phone}`} className="text-xs font-semibold text-[#095c7b] hover:underline break-all block">
                      {lead.phone}
                    </a>
                  </div>
                </div>
              </div>

              {(hasLinkedCustomer || lead.createdParentLeadId || lead.linkedLeadId) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Building className="h-4 w-4 text-[#095c7b]" />
                    Linked CRM Lead & Quotes
                  </h3>
                  <div className="p-4 border border-blue-200/80 rounded-xl bg-blue-50/50 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{lead.lpoName || lead.linkedLeadCompanyName || lead.rawCustomerName || 'LPO Parent Lead'}</span>
                      <Badge className="bg-[#095c7b] text-white text-[10px] font-semibold">LPO Network</Badge>
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <p><span className="text-slate-500 font-medium">Assigned Account Manager:</span> <strong className="text-slate-900 font-semibold">Kerry O'Neill</strong></p>
                      <p><span className="text-slate-500 font-medium">Assigned Franchisee:</span> <strong className="text-slate-800">MailPlus Pty Ltd (435)</strong></p>
                      {lead.linkedCustomerId && (
                        <p><span className="text-slate-500 font-medium">Customer Entity ID:</span> <span className="font-mono font-bold text-[#095c7b]">{lead.linkedCustomerId}</span></p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-blue-200/60 flex items-center gap-2 flex-wrap">
                      <a 
                        href={`/leads/${lead.createdParentLeadId || lead.linkedLeadId}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-bold text-[#095c7b] hover:bg-[#095c7b]/10 bg-white px-3 py-1.5 rounded-lg border border-[#095c7b]/30 inline-flex items-center gap-1 shadow-xs transition-colors"
                      >
                        View CRM Lead Profile
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                      <a 
                        href={`/leads/${lead.createdParentLeadId || lead.linkedLeadId}?tab=scf`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-bold text-emerald-800 hover:bg-emerald-100 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-300 inline-flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        Send Quote / Create SCF
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  Address Details
                </h3>
                <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/20 text-sm space-y-2">
                  <p><span className="text-slate-500 font-medium">Street Address:</span> {lead.address1 ? `${lead.address1}, ` : ''}{lead.address2}</p>
                  <p><span className="text-slate-500 font-medium">Suburb:</span> {lead.city || '—'}</p>
                  <p><span className="text-slate-500 font-medium">State:</span> {lead.state || '—'}</p>
                  <p><span className="text-slate-500 font-medium">Postcode:</span> {lead.postcode || '—'}</p>
                  {(lead.lat && lead.lng) && (
                    <p><span className="text-slate-500 font-medium">Coordinates:</span> {lead.lat}, {lead.lng}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Form Notes & Comments
                </h3>
                <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/20 text-sm whitespace-pre-wrap">
                  {lead.notes || 'No notes were provided during submission.'}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 pt-4 border-t border-slate-100 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Received: {formatDate(lead.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Building className="h-3.5 w-3.5" />
                  Source: <span className="font-semibold text-slate-650">{lead.source || 'Website'}</span>
                </span>
                {lead.pageURL && (
                  <span className="flex items-center gap-1">
                    <Building className="h-3.5 w-3.5" />
                    URL: <a href={lead.pageURL} target="_blank" rel="noopener noreferrer" className="hover:underline">{lead.pageURL}</a>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add Staff Note Card */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">Add Staff Note</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddNote} className="space-y-4">
                <Textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Record an interaction, call details, or follow-up notes..."
                  rows={4}
                  className="w-full border-slate-200 focus-visible:ring-[#095c7b]"
                />
                <div className="flex justify-end">
                  <Button type="submit" className="bg-[#095c7b] hover:bg-[#053647] text-white font-bold">
                    <Send className="h-4 w-4 mr-2" />
                    Save Note
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">Activity Timeline</CardTitle>
              <CardDescription>History and system updates</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[600px] space-y-6">
              {loadingActivities ? (
                <div className="text-center text-slate-500 py-4">Loading activities...</div>
              ) : activities.length === 0 ? (
                <div className="text-center text-slate-500 py-4">No activities logged yet.</div>
              ) : (
                <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-6">
                  {activities.map((act) => (
                    <div key={act.id} className="relative">
                      {/* Dot icon */}
                      <span className="absolute -left-[25px] top-1 p-1 bg-white border-2 border-slate-200 rounded-full text-slate-400">
                        {act.type === 'StatusChange' ? (
                          <Clock className="h-3 w-3 text-[#095c7b]" />
                        ) : (
                          <User className="h-3 w-3 text-slate-500" />
                        )}
                      </span>

                      <div>
                        <p className="text-sm font-semibold text-slate-800">{act.author}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(act.createdAt)}</p>
                        <div className="text-sm text-slate-600 mt-2 p-2 bg-slate-50/50 rounded-lg border border-slate-100">
                          {act.notes}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EDIT SERVICE RATES DIALOG */}
      <Dialog open={isEditRatesOpen} onOpenChange={setIsEditRatesOpen}>
        <DialogContent className="max-w-md bg-white rounded-xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Update Service Rates & Sync
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modify agreed service rates for this LPO lead. Saving will automatically update and synchronize the services and rates on all linked CRM lead records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">AMPO Rate ($ / sweep)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmpo}
                  onChange={(e) => setEditAmpo(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">PMPO Rate ($ / sweep)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPmpo}
                  onChange={(e) => setEditPmpo(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Package Rate ($ / parcel)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPackage}
                  onChange={(e) => setEditPackage(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Add. Bag Rate ($ / bag)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAddBag}
                  onChange={(e) => setEditAddBag(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Note: Service rates can only be modified <strong>before</strong> the Service Commencement Form (SCF) is accepted.</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsEditRatesOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveServiceRates}
              disabled={savingRates}
              className="bg-[#095c7b] hover:bg-[#053647] text-white font-bold"
            >
              {savingRates ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving & Syncing...
                </>
              ) : (
                'Save & Sync Service Rates'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE CRM LEADS CONFIRMATION ALERT DIALOG */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent className="bg-white rounded-xl shadow-xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-rose-700 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-600" />
              Delete Created CRM Leads & Reset?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 space-y-2">
              <p>
                Are you sure you want to delete the generated CRM Parent Lead (<strong className="font-mono text-slate-800">{lead.createdParentLeadId || lead.linkedLeadId}</strong>) and all associated Child Leads from the <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-800">leads</code> database collection?
              </p>
              <p className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900 font-medium">
                ⚠️ This will permanently remove the lead records and reset this LPO Lead state so you can re-run the 4-step Conversion Wizard from Step 1 with updated rates and franchisee assignments.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={resettingLeads}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetCrmLeads}
              disabled={resettingLeads}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {resettingLeads ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting Leads...
                </>
              ) : (
                'Yes, Delete Leads & Reset'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* EDIT LINKED FRANCHISEES DIALOG */}
      <Dialog open={isEditFranchiseesOpen} onOpenChange={setIsEditFranchiseesOpen}>
        <DialogContent className="max-w-md bg-white rounded-xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-[#095c7b]" />
              Assign / Edit Linked Franchisees
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select the franchisee(s) linked to this Licensed Post Office (LPO) lead.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Select Franchisees</Label>
              <MultiSelectCombobox
                options={allFranchisees.map((f) => ({
                  label: f.name || f.mainContact || f.id,
                  value: f.name || f.mainContact || f.id,
                }))}
                selected={selectedFranchiseeNames}
                onSelectedChange={setSelectedFranchiseeNames}
                placeholder="Choose linked franchisees..."
              />
            </div>

            {selectedFranchiseeNames.length > 0 && (
              <div className="p-3 bg-teal-50/70 rounded-lg border border-teal-200/80 text-xs text-teal-900">
                <p className="font-semibold">Selected ({selectedFranchiseeNames.length}):</p>
                <p className="mt-0.5 text-teal-800 font-medium">{selectedFranchiseeNames.join(', ')}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsEditFranchiseesOpen(false)} disabled={savingFranchisees}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveFranchisees}
              disabled={savingFranchisees}
              className="bg-[#095c7b] hover:bg-[#053647] text-white font-bold"
            >
              {savingFranchisees ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Franchisee Assignment'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
