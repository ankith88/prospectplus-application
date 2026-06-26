'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
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
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface EmailLog {
  id: string;
  timestamp: string;
  senderEmail: string;
  subject: string;
  body?: string;
  intent?: string;
  reasoning?: string;
  suggestedStatus?: string;
  leadId?: string;
  status: string;
  error?: string;
  reason?: string;
}

export default function MailboxPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Authentication Lock
  const hasAccess = userProfile?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterIntent, setFilterIntent] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  // Draft States
  const [customInstruction, setCustomInstruction] = useState<string>('');
  const [draftSubject, setDraftSubject] = useState<string>('');
  const [draftBody, setDraftBody] = useState<string>('');
  const [draftLoading, setDraftLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.push('/');
    }
  }, [authLoading, hasAccess, router]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(firestore, 'mailbox_automation_logs'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as EmailLog));
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
    }
  }, [hasAccess]);

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

  // Reset draft when selected email changes
  useEffect(() => {
    setCustomInstruction('');
    setDraftSubject('');
    setDraftBody('');
  }, [selectedLog]);

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

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-slate-50/50">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#095c7b] fill-[#095c7b]/20" />
            AI Mailbox & Webhook Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit incoming lead emails, check Gemini intent classifications, and draft AI replies.
          </p>
        </div>
        <Button
          onClick={fetchLogs}
          disabled={loading}
          variant="outline"
          size="sm"
          className="text-xs text-[#095c7b] border-slate-200 hover:bg-slate-50 gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Inbox
        </Button>
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
              filteredLogs.map((log) => (
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
                    <span className="font-semibold text-slate-800 text-xs truncate max-w-[200px]">
                      {log.senderEmail}
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
                      {log.intent || 'Unclassified'}
                    </span>
                    {log.status === 'error' && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        <AlertCircle className="h-2.5 w-2.5" /> ERROR
                      </span>
                    )}
                  </div>
                </div>
              ))
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
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(selectedLog.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {selectedLog.leadId && (
                    <Link
                      href={`/leads/${selectedLog.leadId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#095c7b] border border-[#095c7b]/20 hover:bg-[#095c7b]/5 bg-white transition-colors shadow-sm"
                    >
                      View CRM Profile
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                <CardContent className="p-6">
                  {selectedLog.body ? (
                    <div
                      className="text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-line overflow-auto max-h-[300px] border border-slate-100 p-4 rounded-lg bg-slate-50/30"
                      dangerouslySetInnerHTML={{ __html: selectedLog.body }}
                    />
                  ) : (
                    <div className="text-xs italic text-slate-400 p-4 border border-dashed rounded-lg text-center bg-slate-50/30">
                      No email body available. (This log record represents a system transition or occurred prior to body tracking).
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
                          {selectedLog.intent || 'Unclassified'}
                        </span>
                      </div>

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
                  {selectedLog.leadId && (
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
    </div>
  );
}
