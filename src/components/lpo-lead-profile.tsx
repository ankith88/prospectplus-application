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
import { Building, Phone, Mail, MapPin, Calendar, Clock, Save, FileText, Send, User } from 'lucide-react';

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

  const statusOptions = ['New', 'Contacted', 'Proposal Sent', 'Contract Review', 'Qualified', 'Lost'];

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
            </div>
            <p className="text-slate-500 text-sm mt-1">LPO Owner: <span className="font-semibold text-slate-700">{lead.lpoOwnerName}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
                    <a href={`mailto:${lead.email}`} className="text-sm font-semibold text-[#095c7b] hover:underline">
                      {lead.email}
                    </a>
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

              <div className="flex items-center gap-4 text-xs text-slate-400 pt-4 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Received: {formatDate(lead.createdAt)}
                </span>
                {lead.pageURL && (
                  <span className="flex items-center gap-1">
                    <Building className="h-3.5 w-3.5" />
                    Source: <a href={lead.pageURL} target="_blank" rel="noopener noreferrer" className="hover:underline">{lead.pageURL}</a>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

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
