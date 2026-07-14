'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, query, limit, collectionGroup, getDoc, doc, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Mail,
  Search,
  Sparkles,
  Loader2,
  Clock,
  Send,
  HelpCircle,
  Inbox,
  User,
  ExternalLink,
  ChevronRight,
  X,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface EmailLog {
  id: string;
  timestamp: string;
  senderEmail: string;
  recipientEmail?: string;
  subject: string;
  body?: string;
  intent?: string;
  reasoning?: string;
  suggestedStatus?: string;
  leadId?: string;
  status: string;
  error?: string;
  reason?: string;
  companyName?: string;
  leadName?: string;
}

export default function SharedMailboxPage() {
  const { userProfile, loading: authLoading, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Authentication check: Admin, Customer Service, and Marketing Manager roles
  const allowedRoles = ['admin', 'super user', 'Customer Service', 'Marketing Manager', 'Marketing Admin'];
  const hasAccess = isSuperAdmin || 
                    userProfile?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2' ||
                    (userProfile?.activeRole && allowedRoles.includes(userProfile.activeRole));

  const [activeTab, setActiveTab] = useState<string>('customerservice@mailplus.com.au');
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  // App Ticket states
  const [isAppTicketOpen, setIsAppTicketOpen] = useState(false);
  const [appTicketTitle, setAppTicketTitle] = useState('');
  const [appTicketDesc, setAppTicketDesc] = useState('');
  const [isCreatingAppTicket, setIsCreatingAppTicket] = useState(false);

  // Tabs determined by user profile configuration
  const sharedTabs = userProfile?.accessibleSharedMailboxes && userProfile.accessibleSharedMailboxes.length > 0
    ? userProfile.accessibleSharedMailboxes
    : ['customerservice@mailplus.com.au'];

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.push('/');
    }
  }, [authLoading, hasAccess, router]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(
        collectionGroup(firestore, 'emails'),
        limit(200)
      );
      const snap = await getDocs(q);
      const items: EmailLog[] = [];
      const leadCache: Record<string, any> = {};

      for (const d of snap.docs) {
        const data = d.data();
        const senderEmail = data.sender || data.senderEmail || '';
        const recipientEmail = data.recipient || data.recipientEmail || '';

        // Restrict strictly to emails matching the selected shared tab address
        const targetEmail = activeTab.toLowerCase().trim();
        if (senderEmail.toLowerCase() !== targetEmail && recipientEmail.toLowerCase() !== targetEmail) {
          continue;
        }

        const parentRef = d.ref.parent.parent;
        let companyName = '';
        let leadName = '';

        if (parentRef) {
          const leadId = parentRef.id;
          if (leadCache[leadId] === undefined) {
            const leadSnap = await getDoc(parentRef);
            if (leadSnap.exists()) {
              leadCache[leadId] = leadSnap.data();
            } else {
              leadCache[leadId] = null;
            }
          }

          if (leadCache[leadId]) {
            companyName = leadCache[leadId].companyName || '';
            leadName = leadCache[leadId].displayName || leadCache[leadId].firstName || '';
          }
        }

        const timestamp = data.sentAt || data.timestamp || new Date().toISOString();
        const body = data.bodyHtml || data.body || '';

        items.push({
          id: d.id,
          timestamp,
          senderEmail,
          recipientEmail,
          subject: data.subject || '(No Subject)',
          body,
          intent: data.intent,
          reasoning: data.reasoning,
          suggestedStatus: data.suggestedStatus,
          leadId: parentRef?.id || undefined,
          status: data.status || 'success',
          companyName,
          leadName
        });
      }

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(items);
      setSelectedLog(items.length > 0 ? items[0] : null);
    } catch (err: any) {
      console.error('Failed to load shared mailbox logs:', err);
      toast({
        variant: 'destructive',
        title: 'Error loading shared mailbox',
        description: 'Failed to retrieve email logs from Firestore.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchLogs();
    }
  }, [hasAccess, activeTab]);

  const handleOpenAppTicketDialog = () => {
    if (!selectedLog) return;
    setAppTicketTitle(`[Automation Request] Mailbox Automation for ${selectedLog.intent || 'Unclassified'}`);
    setAppTicketDesc(
      `Please develop an automation for this type of email received on shared mailbox: ${activeTab}.\n\n` +
      `Email Details:\n` +
      `- Sender: ${selectedLog.senderEmail}\n` +
      `- Subject: ${selectedLog.subject}\n` +
      `- Intent: ${selectedLog.intent || 'Unclassified'}\n` +
      `- AI Suggestion: ${selectedLog.suggestedStatus || 'No Transition'}\n` +
      `- Reason: ${selectedLog.reasoning || selectedLog.reason || 'N/A'}\n\n` +
      `Proposed Automation Rule: [Describe how this query should be auto-processed]`
    );
    setIsAppTicketOpen(true);
  };

  const handleCreateAppTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appTicketTitle.trim() || !appTicketDesc.trim()) {
      toast({
        variant: 'destructive',
        title: 'Required Fields',
        description: 'Please provide a title and description for the support request.'
      });
      return;
    }

    setIsCreatingAppTicket(true);
    try {
      await addDoc(collection(firestore, 'app_tickets'), {
        title: appTicketTitle.trim(),
        type: 'feature',
        description: appTicketDesc.trim(),
        status: 'open',
        createdBy: userProfile?.uid || 'unknown-user',
        createdByName: userProfile?.displayName || userProfile?.email || 'User',
        createdByEmail: userProfile?.email || 'User',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'App Support Ticket Created',
        description: 'Your automation feature request has been submitted to the Super Admin.'
      });
      setIsAppTicketOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Failed to Submit',
        description: err.message || 'Error occurred while creating ticket.'
      });
    } finally {
      setIsCreatingAppTicket(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.senderEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derived Category Metrics for dashboard statistics view
  const categoryStats = React.useMemo(() => {
    const counts: Record<string, number> = {
      'New Lead / Sales Inquiry': 0,
      'Delivery / Tracking Issue': 0,
      'Customer Dispute / Escalation': 0,
      'Invoice / Billing Question': 0,
      'Other / Uncategorized': 0
    };

    logs.forEach(log => {
      const intent = log.intent;
      if (intent === 'Interested') counts['New Lead / Sales Inquiry']++;
      else if (log.subject.includes('Delayed') || log.subject.includes('Tracking') || log.subject.includes('Sweep')) counts['Delivery / Tracking Issue']++;
      else if (intent === 'Objection/Follow-up') counts['Customer Dispute / Escalation']++;
      else if (log.subject.toLowerCase().includes('invoice') || log.subject.toLowerCase().includes('billing')) counts['Invoice / Billing Question']++;
      else counts['Other / Uncategorized']++;
    });

    return counts;
  }, [logs]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#095c7b]" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50/50">
      {/* Top Banner and Tabs selection */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Inbox className="h-5 w-5 text-[#095c7b]" />
            Shared Customer Service Inbox
          </h1>
          <p className="text-xs text-slate-500">Access and triage shared team mailboxes with AI analytics</p>
        </div>
        <div className="flex border rounded-lg overflow-hidden bg-slate-100 p-1 shrink-0">
          {sharedTabs.map((tab: string) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === tab 
                  ? 'bg-white text-[#095c7b] shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 pb-0">
        {Object.entries(categoryStats).map(([cat, count]) => (
          <Card key={cat} className="p-3 border-slate-200 shadow-sm bg-white rounded-xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase truncate">{cat}</div>
            <div className="text-lg font-extrabold text-slate-800 mt-1">{count} <span className="text-xs font-medium text-slate-400">({logs.length ? Math.round((count/logs.length)*100) : 0}%)</span></div>
          </Card>
        ))}
      </div>

      {/* Main Panel layout split */}
      <div className="flex flex-1 overflow-hidden p-6 gap-6">
        {/* Left List Pane */}
        <div className="w-80 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search subject or sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs border-slate-200 bg-white"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#095c7b]" />
                <span className="text-[11px]">Syncing emails...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No emails matched filters.</div>
            ) : (
              filteredLogs.map(log => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedLog?.id === log.id 
                      ? 'bg-[#095c7b]/5 border-l-4 border-l-[#095c7b]'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-slate-800 text-xs truncate">{log.senderEmail}</span>
                    <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-1 truncate">{log.subject}</div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold inline-block mt-2 ${
                    log.intent === 'Interested' 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : log.intent === 'Objection/Follow-up' 
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {log.intent || 'Other'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Details Pane */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          {selectedLog ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="border-b pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">{selectedLog.subject}</h2>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5">
                    <span>From: <strong>{selectedLog.senderEmail}</strong></span>
                    <span>Received: <strong>{new Date(selectedLog.timestamp).toLocaleString()}</strong></span>
                  </div>
                </div>
                {selectedLog.leadId && (
                  <Link
                    href={`/leads/${selectedLog.leadId}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#095c7b] border border-[#095c7b]/20 hover:bg-[#095c7b]/5 transition-colors bg-white shadow-sm"
                  >
                    View Lead Profile
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {selectedLog.body ? (
                <div
                  className="text-xs text-slate-700 font-sans leading-relaxed border p-4 rounded-lg bg-slate-50/50 max-h-[300px] overflow-y-auto whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: selectedLog.body }}
                />
              ) : (
                <div className="text-xs italic text-slate-400 p-4 border border-dashed rounded-lg text-center bg-slate-50/30">
                  No email body available.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <Card className="p-4 border-slate-200 shadow-sm bg-white rounded-xl col-span-1">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 mb-3">
                    <Sparkles className="h-4 w-4 text-[#095c7b]" />
                    AI Actions
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">INTENT</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">{selectedLog.intent || 'Other'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">SUGGESTED CRM STATUS</span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-bold">{selectedLog.suggestedStatus || 'No Change'}</span>
                    </div>
                    <div className="pt-2 border-t mt-2">
                      <Button
                        onClick={handleOpenAppTicketDialog}
                        className="w-full text-[10px] h-7 bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1 rounded shadow-sm"
                      >
                        <Sparkles className="h-3 w-3 shrink-0" />
                        Request App Automation
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-slate-200 shadow-sm bg-white rounded-xl col-span-2">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 mb-3">
                    <HelpCircle className="h-4 w-4 text-[#095c7b]" />
                    AI Reasoning
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    {selectedLog.reasoning || selectedLog.reason || 'No reasoning available for this log entry.'}
                  </p>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">Select an email to view details.</div>
          )}
        </div>
      </div>

      {/* App Ticket Automation Dialog */}
      {isAppTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-[#095c7b] p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-[#eaf143] fill-[#eaf143]" />
                  Request Automation Feature
                </h3>
                <p className="text-[10px] text-slate-200 mt-1">
                  Submit this suggestion directly to the App Support & Feedback board.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAppTicketOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 h-7 w-7 rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleCreateAppTicket} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ticket Title</label>
                <Input
                  value={appTicketTitle}
                  onChange={(e) => setAppTicketTitle(e.target.value)}
                  placeholder="e.g. [Automation Request] Missed Sweep Alerts"
                  className="text-xs border-slate-200 focus-visible:ring-[#095c7b] h-9"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Describe Automation Details</label>
                <Textarea
                  value={appTicketDesc}
                  onChange={(e) => setAppTicketDesc(e.target.value)}
                  placeholder="Detail the rule and how the application should automate this type of request..."
                  className="text-xs border-slate-200 focus-visible:ring-[#095c7b] min-h-[220px]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAppTicketOpen(false)}
                  className="text-xs border-slate-200 h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingAppTicket}
                  className="text-xs bg-[#095c7b] hover:bg-[#0b6d91] text-white font-semibold gap-1.5 h-9"
                >
                  {isCreatingAppTicket ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Submit Feature Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
