'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { firestore, storage } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, limit, collectionGroup, getDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Mail,
  Search,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Copy,
  Check,
  ShieldAlert,
  Send,
  HelpCircle,
  Inbox,
  User,
  ExternalLink,
  Plus,
  CornerUpLeft,
  ChevronRight,
  Paperclip,
  X
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

export default function MailboxPage() {
  const { userProfile, loading: authLoading, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Authentication Lock
  const allowedMailboxRoles = [
    'admin',
    'super user',
    'Sales Manager',
    'Marketing Manager',
    'Marketing Admin',
    'Customer Success',
    'Account Managers',
    'Account Manager',
    'account managers'
  ];
  const hasAccess = isSuperAdmin || 
                    userProfile?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2' || 
                    (userProfile?.activeRole && allowedMailboxRoles.includes(userProfile.activeRole));

  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterIntent, setFilterIntent] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  // Compose Modal States
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [composeToLeadId, setComposeToLeadId] = useState<string>('');
  const [composeToEmail, setComposeToEmail] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [sendLoading, setSendLoading] = useState<boolean>(false);
  const [composeAttachments, setComposeAttachments] = useState<{ name: string; url: string }[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);

  // Draft States
  const [customInstruction, setCustomInstruction] = useState<string>('');
  const [draftSubject, setDraftSubject] = useState<string>('');
  const [draftBody, setDraftBody] = useState<string>('');
  const [draftLoading, setDraftLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // App Ticket states
  const [isAppTicketOpen, setIsAppTicketOpen] = useState(false);
  const [appTicketTitle, setAppTicketTitle] = useState('');
  const [appTicketDesc, setAppTicketDesc] = useState('');
  const [isCreatingAppTicket, setIsCreatingAppTicket] = useState(false);

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.push('/');
    }
  }, [authLoading, hasAccess, router]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Delta sync incoming emails from Microsoft Graph API
      if (userProfile?.uid) {
        try {
          await fetch('/api/mailbox/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userProfile.uid }),
          });
        } catch (syncErr) {
          console.warn('[Mailbox Page] Sync warning:', syncErr);
        }
      }

      const q = query(
        collectionGroup(firestore, 'emails'),
        limit(150)
      );
      const snap = await getDocs(q);
      const items: EmailLog[] = [];
      const leadCache: Record<string, any> = {};

      for (const d of snap.docs) {
        const data = d.data();
        const senderEmail = data.sender || data.senderEmail || '';
        const recipientEmail = data.recipient || data.recipientEmail || '';

        // Filter: only show emails connected to the user's email
        const userEmail = userProfile?.email?.toLowerCase();
        if (userEmail) {
          if (senderEmail.toLowerCase() !== userEmail && recipientEmail.toLowerCase() !== userEmail) {
            continue;
          }
        } else {
          // If userEmail is not available for some reason, don't show any emails to prevent exposure
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

      // Sort by timestamp descending
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setLogs(items);
      if (items.length > 0 && !selectedLog) {
        setSelectedLog(items[0]);
      }
    } catch (err: any) {
      console.error('Failed to load mailbox logs:', err);
      toast({
        variant: 'destructive',
        title: 'Error loading mailbox',
        description: 'Failed to retrieve email logs from Firestore.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchLogs();
      // Load active leads for compose dropdown
      getDocs(collection(firestore, 'leads')).then((snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeadsList(list);
      }).catch(err => {
        console.error('Failed to load leads list:', err);
      });
    }
  }, [hasAccess, userProfile?.uid]);

  // Handle lead selection auto-filling recipient email
  useEffect(() => {
    if (composeToLeadId) {
      const selected = leadsList.find(l => l.id === composeToLeadId);
      if (selected) {
        setComposeToEmail(selected.customerServiceEmail || '');
      }
    }
  }, [composeToLeadId, leadsList]);

  const handleGenerateDraft = async () => {
    if (!selectedLog?.leadId) return;
    setDraftLoading(true);
    try {
      const res = await fetch('/api/copilot/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLog.leadId, customInstruction }),
      });
      const data = await res.json();
      if (data.success && data.draft) {
        setDraftSubject(data.draft.subject);
        setDraftBody(data.draft.body);
        toast({
          title: 'Draft Generated',
          description: 'Gemini has created a contextual reply draft.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Generation Failed',
          description: data.error || 'Failed to generate email reply draft.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Network Error',
        description: 'Unable to connect to Gemini draft generator.',
      });
    } finally {
      setDraftLoading(false);
    }
  };

  const handleCopyDraft = () => {
    const fullText = `Subject: ${draftSubject}\n\n${draftBody}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied to Clipboard',
      description: 'Draft subject and body copied successfully.',
    });
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAttachment(true);
    try {
      const storageRef = ref(storage, `mailbox/attachments/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setComposeAttachments((prev) => [...prev, { name: file.name, url: downloadURL }]);
      toast({ title: 'Attachment Added', description: `${file.name} attached successfully.` });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Failed to upload attachment.' });
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const removeAttachment = (url: string) => {
    setComposeAttachments((prev) => prev.filter((a) => a.url !== url));
  };
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeToEmail || !composeSubject || !composeBody) {
      toast({
        variant: 'destructive',
        title: 'Fields Required',
        description: 'Please specify recipient email, subject and body.'
      });
      return;
    }

    setSendLoading(true);
    try {
      const res = await fetch('/api/campaigns/send-custom-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeToEmail,
          subject: composeSubject,
          html: composeBody.replace(/\n/g, '<br>'),
          attachments: composeAttachments
        })
      });

      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Email Sent',
          description: data.message || 'Email dispatched successfully.'
        });
        setIsComposeOpen(false);
        setComposeToLeadId('');
        setComposeToEmail('');
        setComposeSubject('');
        setComposeBody('');
        setComposeAttachments([]);
        fetchLogs();
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to Send',
          description: data.message || 'Error occurred during sending.'
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Send Error',
        description: err.message || 'Network failure dispatching email.'
      });
    } finally {
      setSendLoading(false);
    }
  };

  const handleOpenReply = () => {
    if (!selectedLog) return;
    setComposeToEmail(selectedLog.senderEmail);
    setComposeSubject(`Re: ${selectedLog.subject}`);
    const dateStr = new Date(selectedLog.timestamp).toLocaleString();
    const cleanBody = selectedLog.body ? selectedLog.body.replace(/<[^>]*>/g, '') : '';
    setComposeBody(`\n\nOn ${dateStr}, ${selectedLog.senderEmail} wrote:\n> ${cleanBody.split('\n').join('\n> ')}`);
    setIsComposeOpen(true);
  };

  // Reset draft when selected email changes
  useEffect(() => {
    setCustomInstruction('');
    setDraftSubject('');
    setDraftBody('');
  }, [selectedLog]);

  const handleOpenAppTicketDialog = () => {
    if (!selectedLog) return;
    setAppTicketTitle(`[Automation Request] Mailbox Automation for ${selectedLog.intent || 'Unclassified'}`);
    setAppTicketDesc(
      `Please develop an automation for this type of email.\n\n` +
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

  if (authLoading || !hasAccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#095c7b]" />
          <span className="text-sm text-slate-500 font-medium">Verifying credentials...</span>
        </div>
      </div>
    );
  }

  // Filtering logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.recipientEmail && log.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.body && log.body.toLowerCase().includes(searchQuery.toLowerCase()));

    const logIntent = log.intent || 'Other';
    if (filterIntent === 'all') return matchesSearch;
    if (filterIntent === 'Interested') return matchesSearch && logIntent === 'Interested';
    if (filterIntent === 'Objection') return matchesSearch && (logIntent.includes('Objection') || logIntent === 'Objection/Follow-up');
    if (filterIntent === 'Unsubscribe') return matchesSearch && (logIntent.includes('Unsubscribe') || logIntent === 'Unsubscribe Request');
    if (filterIntent === 'Other') return matchesSearch && logIntent !== 'Interested' && !logIntent.includes('Objection') && !logIntent.includes('Unsubscribe');
    return matchesSearch;
  });

  const getIntentBadgeStyles = (intent: string | undefined) => {
    if (!intent) return 'bg-slate-100 text-slate-700';
    if (intent === 'Interested') return 'bg-emerald-50 text-emerald-700 border-emerald-100 border';
    if (intent === 'Unsubscribe Request' || intent.includes('Unsubscribe')) return 'bg-rose-50 text-rose-700 border-rose-100 border';
    if (intent.includes('Objection')) return 'bg-amber-50 text-amber-700 border-amber-100 border';
    return 'bg-blue-50 text-blue-700 border-blue-100 border';
  };

  const isSentEmail = (log: EmailLog) => {
    return log.status === 'sent' || log.status === 'simulated' || log.senderEmail.includes('@mailplus.com.au');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-slate-50/50 relative">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#095c7b] fill-[#095c7b]/20" />
            AI Mailbox & Outbox Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit incoming and sent lead emails, check Gemini intent classifications, and send custom messages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsComposeOpen(true)}
            className="text-xs bg-[#095c7b] hover:bg-[#0b6d91] text-white font-semibold gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" />
            Compose Email
          </Button>
          <Button
            onClick={fetchLogs}
            disabled={loading}
            variant="outline"
            size="sm"
            className="text-xs text-[#095c7b] border-slate-200 hover:bg-slate-50 gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Inbox Workspace */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Pane - List & Filters */}
        <div className="w-full md:w-[420px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
          {/* Filters Area */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search email, sender, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-white border-slate-200 focus-visible:ring-[#095c7b]"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
              {[
                { label: 'All', value: 'all' },
                { label: 'Interested', value: 'Interested' },
                { label: 'Objections', value: 'Objection' },
                { label: 'Opt-Outs', value: 'Unsubscribe' },
                { label: 'Other', value: 'Other' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilterIntent(tab.value)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all border ${
                    filterIntent === tab.value
                      ? 'bg-[#095c7b] text-white border-[#095c7b]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mail List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#095c7b]" />
                <span className="text-xs">Loading email records...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2 px-4 text-center">
                <Inbox className="h-8 w-8 text-slate-300" />
                <span className="text-xs font-medium">No matching emails found.</span>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isSent = isSentEmail(log);
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-4 cursor-pointer transition-colors relative ${
                      selectedLog?.id === log.id
                        ? 'bg-slate-50 border-l-4 border-l-[#095c7b]'
                        : 'hover:bg-slate-50/50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-slate-800 text-xs truncate max-w-[200px] flex items-center gap-1.5">
                        {isSent ? (
                          <>
                            <Send className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="text-[10px] text-blue-600 font-bold shrink-0">SENT:</span>
                            <span className="truncate">{log.recipientEmail}</span>
                          </>
                        ) : (
                          <>
                            <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                            <span className="truncate">{log.senderEmail}</span>
                          </>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-600 mt-1 truncate">
                      {log.subject}
                    </div>
                    {log.body && (
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {log.body.replace(/<[^>]*>/g, '')}
                      </div>
                    )}
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getIntentBadgeStyles(log.intent)}`}>
                        {log.intent || (isSent ? 'Outbound Outbox' : 'Unclassified')}
                      </span>
                      {log.status === 'error' && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                          <AlertCircle className="h-2.5 w-2.5" /> ERROR
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane - Detail View */}
        <div className="flex-1 bg-slate-50/50 overflow-y-auto p-6">
          {selectedLog ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Email Content Box */}
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
                <div className="bg-[#095c7b]/5 p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-slate-800">{selectedLog.subject}</h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        From: <strong className="text-slate-700 font-semibold">{selectedLog.senderEmail}</strong>
                      </span>
                      {selectedLog.recipientEmail && (
                        <span className="flex items-center gap-1 font-medium">
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          To: <strong className="text-slate-700 font-semibold">{selectedLog.recipientEmail}</strong>
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(selectedLog.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isSentEmail(selectedLog) && (
                      <Button
                        onClick={handleOpenReply}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#095c7b] hover:bg-[#0b6d91] text-white transition-colors shadow-sm h-8"
                      >
                        <CornerUpLeft className="h-3.5 w-3.5" />
                        Reply
                      </Button>
                    )}
                    {selectedLog.leadId && (
                      <Link
                        href={`/leads/${selectedLog.leadId}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#095c7b] border border-[#095c7b]/20 hover:bg-[#095c7b]/5 bg-white transition-colors shadow-sm h-8"
                      >
                        View CRM Profile
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>

                <CardContent className="p-6">
                  {selectedLog.body ? (
                    <div
                      className="text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-line overflow-auto max-h-[300px] border border-slate-100 p-4 rounded-lg bg-slate-50/30"
                      dangerouslySetInnerHTML={{ __html: selectedLog.body }}
                    />
                  ) : (
                    <div className="text-xs italic text-slate-400 p-4 border border-dashed rounded-lg text-center bg-slate-50/30">
                      No email body available.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Diagnosis Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: AI Intent Metadata */}
                <div className="lg:col-span-1 space-y-6">
                  <Card className="border-slate-200 shadow-sm bg-white rounded-xl">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[#095c7b] fill-[#095c7b]/10" />
                        Gemini Classification
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">CLASSIFIED INTENT</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block ${getIntentBadgeStyles(selectedLog.intent)}`}>
                          {selectedLog.intent || (isSentEmail(selectedLog) ? 'Outbound Outbox' : 'Unclassified')}
                        </span>
                      </div>

                      {!isSentEmail(selectedLog) && (
                        <>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">SUGGESTED CRM STATUS</span>
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-bold">
                              {selectedLog.suggestedStatus || 'No Transition'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">PROCESSING STATUS</span>
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold inline-block ${
                              selectedLog.status === 'success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : selectedLog.status === 'error'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {selectedLog.status.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="pt-2 border-t border-slate-100 mt-2">
                            <Button
                              onClick={handleOpenAppTicketDialog}
                              className="w-full text-[10px] h-7 bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1 rounded shadow-sm"
                            >
                              <Sparkles className="h-3 w-3 shrink-0" />
                              Request App Automation
                            </Button>
                          </div>
                        </>
                      )}

                      {selectedLog.error && (
                        <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-[10px] font-mono leading-normal">
                          <strong className="block mb-1">ERROR LOG:</strong>
                          {selectedLog.error}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Reasoning & Draft Reply */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Reasoning */}
                  <Card className="border-slate-200 shadow-sm bg-white rounded-xl">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="h-4 w-4 text-[#095c7b]" />
                        Gemini Reasoning
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 text-xs text-slate-600 leading-relaxed italic bg-slate-50/20">
                      {selectedLog.reasoning ? (
                        `"${selectedLog.reasoning}"`
                      ) : selectedLog.reason ? (
                        selectedLog.reason
                      ) : (
                        "No classification reasoning logs written for this action."
                      )}
                    </CardContent>
                  </Card>

                  {/* AI Reply Copilot */}
                  {selectedLog.leadId && !isSentEmail(selectedLog) && (
                    <Card className="border-[#095c7b]/20 shadow-md bg-white rounded-xl overflow-hidden">
                      <div className="bg-[#095c7b] text-white p-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-4.5 w-4.5 text-[#eaf143] fill-[#eaf143]" />
                          Draft Contextual Reply
                        </CardTitle>
                        <p className="text-[10px] text-slate-200 mt-1">
                          Draft an Outlook response using Gemini based on lead status, email history, and your instructions.
                        </p>
                      </div>

                      <CardContent className="p-5 space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Custom Directive</label>
                          <Textarea
                            placeholder="e.g. 'Politely address their objection on pricing and suggest a 10-minute demo call for next Tuesday.'"
                            value={customInstruction}
                            onChange={(e) => setCustomInstruction(e.target.value)}
                            className="text-xs border-slate-200 focus-visible:ring-[#095c7b] min-h-[80px]"
                          />
                        </div>

                        <Button
                          onClick={handleGenerateDraft}
                          disabled={draftLoading || !selectedLog.leadId}
                          className="w-full bg-[#095c7b] hover:bg-[#0b6d91] text-white font-semibold text-xs h-9 gap-1.5 shadow-sm"
                        >
                          {draftLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating Draft...
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              Generate Reply Draft
                            </>
                          )}
                        </Button>

                        {(draftSubject || draftBody) && (
                          <div className="space-y-3 bg-[#095c7b]/5 p-4 border border-[#095c7b]/10 rounded-lg animate-in fade-in duration-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Response Draft</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyDraft}
                                className="h-7 text-[10px] border-slate-200 text-slate-600 hover:text-slate-800 gap-1"
                              >
                                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                {copied ? 'Copied' : 'Copy'}
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <Input
                                value={draftSubject}
                                readOnly
                                className="bg-white text-xs border-slate-200 font-medium"
                              />
                              <Textarea
                                value={draftBody}
                                readOnly
                                className="bg-white text-xs border-slate-200 min-h-[140px]"
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 py-40">
              <Mail className="h-12 w-12 text-slate-300 animate-pulse" />
              <h3 className="font-semibold text-sm text-slate-600">No Email Selected</h3>
              <p className="text-xs max-w-xs text-center text-slate-500">
                Select an email log from the sidebar to view full diagnostic categorization and AI replies.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#095c7b] p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <Send className="h-4 w-4" />
                Compose New Email
              </h3>
              <button
                onClick={() => {
                  setIsComposeOpen(false);
                  setComposeToLeadId('');
                  setComposeToEmail('');
                  setComposeSubject('');
                  setComposeBody('');
                  setComposeAttachments([]);
                }}
                className="text-slate-200 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Link to Lead Contact (Optional)</label>
                <select
                  value={composeToLeadId}
                  onChange={(e) => setComposeToLeadId(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#095c7b]"
                >
                  <option value="">-- Select Lead --</option>
                  {leadsList.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.companyName || lead.firstName || 'Unnamed Lead'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Recipient Email Address *</label>
                <Input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={composeToEmail}
                  onChange={(e) => setComposeToEmail(e.target.value)}
                  className="text-xs border-slate-200 h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Subject Line *</label>
                <Input
                  required
                  placeholder="Enter email subject..."
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="text-xs border-slate-200 h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Message Body *</label>
                <Textarea
                  required
                  placeholder="Draft your email message details here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="text-xs border-slate-200 min-h-[160px] font-sans"
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">Attachments</label>
                  <label className="text-xs font-semibold text-[#095c7b] hover:text-[#053647] cursor-pointer flex items-center gap-1">
                    {isUploadingAttachment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                    <span>{isUploadingAttachment ? 'Uploading...' : 'Attach File'}</span>
                    <input 
                      type="file" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      disabled={isUploadingAttachment}
                    />
                  </label>
                </div>
                {composeAttachments.length > 0 && (
                  <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {composeAttachments.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-slate-700 py-0.5">
                        <span className="truncate max-w-[85%]">{file.name}</span>
                        <button 
                          type="button"
                          onClick={() => removeAttachment(file.url)}
                          className="text-slate-400 hover:text-red-500 p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsComposeOpen(false);
                    setComposeToLeadId('');
                    setComposeToEmail('');
                    setComposeSubject('');
                    setComposeBody('');
                    setComposeAttachments([]);
                  }}
                  className="text-xs border-slate-200 h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={sendLoading || isUploadingAttachment}
                  className="text-xs bg-[#095c7b] hover:bg-[#0b6d91] text-white font-semibold gap-1.5 h-9"
                >
                  {sendLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
