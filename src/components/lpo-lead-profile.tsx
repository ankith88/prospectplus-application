"use client";

import React, { useEffect, useState } from 'react';
import { doc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Building, Phone, Mail, MapPin, Calendar, Clock, Save, FileText, Send, User, CheckCircle2, DollarSign, Truck, UserCheck, Edit3 } from 'lucide-react';
import { LpoConversionWizard } from './lpo-conversion-wizard';

interface LpoLeadProfileProps {
  initialLead: any;
}

export function LpoLeadProfile({ initialLead }: LpoLeadProfileProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [lead, setLead] = useState(initialLead);
  const [status, setStatus] = useState(initialLead.status || 'New');
  const [noteContent, setNoteContent] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [isEditingConversion, setIsEditingConversion] = useState(false);


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
    setSavingStatus(true);
    try {
      const docRef = doc(firestore, 'lpo_leads', lead.id);
      await updateDoc(docRef, { status: newStatus });
      
      // Log status change activity
      await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
        type: 'StatusChange',
        notes: `Status updated from "${status}" to "${newStatus}"`,
        author: userProfile?.displayName || userProfile?.email || 'System User',
        createdAt: serverTimestamp(),
      });

      setStatus(newStatus);
      setLead((prev: any) => ({ ...prev, status: newStatus }));
      toast({
        title: 'Status Updated',
        description: `Lead status changed to ${newStatus}.`,
      });
    } catch (err) {
      console.error('Error updating status:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update lead status.',
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    try {
      await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
        type: 'Note',
        notes: noteContent.trim(),
        author: userProfile?.displayName || userProfile?.email || 'System User',
        createdAt: serverTimestamp(),
      });

      setNoteContent('');
      toast({
        title: 'Note Added',
        description: 'Staff note successfully recorded.',
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

  const handleUpdateLpoStatus = async (newStatus: string, notes: string) => {
    try {
      const docRef = doc(firestore, 'lpo_leads', lead.id);
      await updateDoc(docRef, { status: newStatus });
      
      await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
        type: 'StatusChange',
        notes,
        author: userProfile?.displayName || userProfile?.email || 'System User',
        createdAt: serverTimestamp(),
      });

      setLead((prev: any) => ({ ...prev, status: newStatus }));
      setStatus(newStatus);
      toast({
        title: 'Status Updated',
        description: `Status changed to ${newStatus}.`,
      });
    } catch (err) {
      console.error('Error updating LPO status:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update status.',
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
            <p className="text-slate-500 text-sm mt-1">LPO Owner: <span className="font-semibold text-slate-700">{lead.lpoOwnerName}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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
                    {lead.linkedLeadId ? (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-bold text-[#095c7b]">{lead.linkedLeadCompanyName || 'CRM Lead'}</span>
                        <Badge className="bg-[#095c7b] text-white text-[10px]">ID: {lead.linkedLeadId}</Badge>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 mt-1 italic">Awaiting sync / lead creation from NetSuite API</p>
                    )}
                  </div>
                  {lead.linkedLeadId && (
                    <Button asChild size="sm" className="bg-[#095c7b] hover:bg-[#053647]">
                      <a href={`/leads/${lead.linkedLeadId}`}>
                        View CRM Lead
                      </a>
                    </Button>
                  )}
                </div>

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
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Agreed Rates (Ex GST)
                  </h4>
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
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Linked Franchisees
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {lead.linkedFranchisees && lead.linkedFranchisees.length > 0 ? (
                      lead.linkedFranchisees.map((fran: any) => (
                        <Badge key={fran.franchiseeId} className="bg-[#095c7b] hover:bg-[#095c7b] text-white py-1.5 px-3 text-xs rounded-full">
                          {fran.name}
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
          {/* Add Staff Note */}
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
                  className="w-100 border-slate-200 focus-visible:ring-[#095c7b]"
                />
                <div className="flex justify-end">
                  <Button type="submit" className="bg-[#095c7b] hover:bg-[#053647] text-white">
                    <Send className="h-4 w-4 mr-2" />
                    Save Note
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">Enquiry Information</CardTitle>
              <CardDescription>Details submitted by LPO owner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50/50">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Contact Email</p>
                    {userProfile?.activeRole === 'user' ? (
                      <span className="text-sm font-semibold text-slate-800">
                        {lead.email}
                      </span>
                    ) : (
                      <a href={`mailto:${lead.email}`} className="text-sm font-semibold text-[#095c7b] hover:underline">
                        {lead.email}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50/50">
                  <Phone className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Contact Phone</p>
                    <a href={`tel:${lead.phone}`} className="text-sm font-semibold text-[#095c7b] hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                </div>
              </div>

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
    </div>
  );
}
