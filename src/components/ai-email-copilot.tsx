'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getLeadsFromFirebase } from '@/services/firebase';
import {
  Sparkles,
  Mail,
  History,
  Terminal,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  Info,
  ShieldAlert,
  Send,
  HelpCircle
} from 'lucide-react';
import type { Lead } from '@/lib/types';

interface AIEmailCopilotProps {
  allLeads?: Lead[];
  selectedLeadIds?: string[];
}

export function AIEmailCopilot({ allLeads = [], selectedLeadIds = [] }: AIEmailCopilotProps) {
  const { toast } = useToast();
  
  // Leads Loading States
  const [localLeads, setLocalLeads] = useState<Lead[]>(allLeads);
  const [localLeadsLoading, setLocalLeadsLoading] = useState<boolean>(false);

  // Selection States
  const [activeLeadId, setActiveLeadId] = useState<string>('');
  
  // Summary & Draft States
  const [summary, setSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  
  const [customInstruction, setCustomInstruction] = useState<string>('');
  const [draftSubject, setDraftSubject] = useState<string>('');
  const [draftBody, setDraftBody] = useState<string>('');
  const [draftLoading, setDraftLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Webhook Simulator States
  const [simSenderEmail, setSimSenderEmail] = useState<string>('');
  const [simSubject, setSimSubject] = useState<string>('');
  const [simBody, setSimBody] = useState<string>('');
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Webhook Logs States
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  
  // Tab State: 'copilot' | 'simulator' | 'logs'
  const [activeTab, setActiveTab] = useState<'copilot' | 'simulator' | 'logs'>('copilot');

  // Load leads if not provided in props
  useEffect(() => {
    if (allLeads && allLeads.length > 0) {
      setLocalLeads(allLeads);
    } else {
      setLocalLeadsLoading(true);
      getLeadsFromFirebase({ summary: true })
        .then((leads) => {
          setLocalLeads(leads);
          if (leads.length > 0) {
            setActiveLeadId(leads[0].id);
          }
        })
        .catch((err) => {
          console.error('[Gemini Leads Fetch Error]:', err);
          toast({
            variant: 'destructive',
            title: 'Error Loading Leads',
            description: 'Could not fetch active leads list for Gemini.',
          });
        })
        .finally(() => setLocalLeadsLoading(false));
    }
  }, [allLeads]);

  // Sync active lead with parent selection
  useEffect(() => {
    if (selectedLeadIds.length > 0) {
      setActiveLeadId(selectedLeadIds[0]);
    } else if (localLeads.length > 0 && !activeLeadId) {
      setActiveLeadId(localLeads[0].id);
    }
  }, [selectedLeadIds, localLeads]);

  // Load summary whenever active lead changes
  useEffect(() => {
    if (activeLeadId) {
      fetchSummary(activeLeadId);
      // Auto-populate simulation email if lead has contacts
      const lead = localLeads.find(l => l.id === activeLeadId);
      const contact = lead?.contacts?.[0] || (lead as any)?.contact;
      if (contact?.email) {
        setSimSenderEmail(contact.email);
      } else if (lead?.customerServiceEmail) {
        setSimSenderEmail(lead.customerServiceEmail);
      }
    } else {
      setSummary('');
      setDraftSubject('');
      setDraftBody('');
    }
  }, [activeLeadId, localLeads]);

  const fetchSummary = async (leadId: string) => {
    setSummaryLoading(true);
    try {
      const res = await fetch('/api/copilot/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
      } else {
        setSummary('Could not generate summary.');
      }
    } catch (err: any) {
      setSummary('Failed to connect to Gemini summary service.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!activeLeadId) return;
    setDraftLoading(true);
    try {
      const res = await fetch('/api/copilot/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: activeLeadId, customInstruction }),
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

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simSenderEmail) {
      toast({
        variant: 'destructive',
        title: 'Input Required',
        description: 'Please provide a sender email address.',
      });
      return;
    }
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await fetch('/api/integrations/microsoft/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isSimulation: true,
          senderEmail: simSenderEmail,
          subject: simSubject || 'Simulated Outbound Inquiry',
          body: simBody || 'Simulated body',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data);
        toast({
          title: 'Webhook Simulated',
          description: `Email processed with intent: ${data.intent}`,
        });
        fetchLogs();
      } else {
        toast({
          variant: 'destructive',
          title: 'Simulation Failed',
          description: data.error || 'Error processing webhook event.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Network failure during webhook simulation.',
      });
    } finally {
      setSimLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const q = query(
        collection(firestore, 'mailbox_automation_logs'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(items);
    } catch (err: any) {
      console.error('Failed to load webhook logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const activeLead = localLeads.find(l => l.id === activeLeadId);

  return (
    <Card className="border-[#095c7b]/20 shadow-md rounded-xl overflow-hidden bg-white mt-6">
      {/* Premium Header */}
      <div className="bg-[#095c7b] text-white p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#eaf143] fill-[#eaf143] animate-pulse" />
            Gemini Email Assistant & Mailbox Automation
          </CardTitle>
          <CardDescription className="text-slate-200 text-xs mt-1">
            Context-aware email draft assistance, background webhook tracking, and Gemini intent classification.
          </CardDescription>
        </div>
        <div className="flex bg-[#074b64] p-1 rounded-lg border border-[#0b6d91]">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'copilot' ? 'bg-[#095c7b] text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            Gemini Drafts
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'simulator' ? 'bg-[#095c7b] text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            Webhook Simulator
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'logs' ? 'bg-[#095c7b] text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            Automation Logs
          </button>
        </div>
      </div>

      <CardContent className="p-6">
        {activeTab === 'copilot' && (
          <div className="space-y-6">
            {/* Lead Selector & Thread Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4 lg:col-span-1 border-r border-slate-100 pr-6">
                <div className="space-y-2">
                  <Label htmlFor="active-lead-select" className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Select Active Lead
                  </Label>
                  {localLeadsLoading ? (
                    <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#095c7b]" />
                      <span>Loading CRM leads...</span>
                    </div>
                  ) : (
                    <Select value={activeLeadId} onValueChange={setActiveLeadId}>
                      <SelectTrigger id="active-lead-select" className="border-slate-200 h-10 text-xs">
                        <SelectValue placeholder="Choose a lead..." />
                      </SelectTrigger>
                      <SelectContent>
                        {localLeads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id} className="text-xs">
                            {lead.companyName} ({lead.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {activeLead && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="font-semibold text-[#095c7b] text-xs">Lead Context</div>
                    <div><strong>Industry:</strong> {activeLead.industryCategory || 'N/A'}</div>
                    <div><strong>Current Status:</strong> {activeLead.status}</div>
                    <div><strong>Assigned Rep:</strong> {activeLead.dialerAssigned || activeLead.salesRepAssigned || 'Unassigned'}</div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="h-4 w-4 text-[#095c7b]" />
                    Gemini Email Thread Summary
                  </Label>
                  {activeLeadId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchSummary(activeLeadId)}
                      disabled={summaryLoading}
                      className="h-7 text-xs text-[#095c7b] hover:text-[#0b6d91] p-1.5"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${summaryLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  )}
                </div>

                <div className="min-h-[110px] p-4 bg-slate-50 border border-slate-100 rounded-lg text-xs leading-relaxed text-slate-700">
                  {summaryLoading ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-[#095c7b]" />
                      <span>Synthesizing email history...</span>
                    </div>
                  ) : summary ? (
                    <div className="whitespace-pre-line">{summary}</div>
                  ) : (
                    <span className="italic text-slate-400">Select a lead to see their email thread summary.</span>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Draft Generator Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-instruction" className="text-xs font-bold text-slate-700">
                    Drafting Prompt / Custom Direction
                  </Label>
                  <Textarea
                    id="custom-instruction"
                    placeholder="e.g. 'Acknowledge their objection on pricing and propose a short 10-minute demo next Tuesday morning.'"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    className="min-h-[120px] text-xs border-slate-200 focus-visible:ring-[#095c7b]"
                  />
                  <p className="text-[10px] text-slate-400">
                    Specify the key message, discount offers, or follow-up schedule you want Gemini to include.
                  </p>
                </div>
                <Button
                  onClick={handleGenerateDraft}
                  disabled={draftLoading || !activeLeadId}
                  className="w-full bg-[#095c7b] hover:bg-[#0b6d91] text-white font-semibold text-xs h-10 gap-2 shadow-sm"
                >
                  {draftLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating Gemini Draft...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-[#eaf143] fill-[#eaf143]" />
                      Generate Reply Draft
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">Generated Email Draft Output</Label>
                  {(draftSubject || draftBody) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyDraft}
                      className="h-8 text-xs border-slate-200 text-slate-600 hover:text-slate-800 gap-1.5"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy Draft'}
                    </Button>
                  )}
                </div>

                <div className="space-y-3 bg-[#095c7b]/5 p-4 border border-[#095c7b]/10 rounded-lg">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Subject Line</span>
                    <Input
                      value={draftSubject}
                      onChange={(e) => setDraftSubject(e.target.value)}
                      placeholder="Subject will appear here..."
                      className="bg-white text-xs border-slate-200 font-medium"
                      readOnly
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Email Body</span>
                    <Textarea
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                      placeholder="Generated email draft body..."
                      className="bg-white text-xs border-slate-200 min-h-[160px] font-sans"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-[#095c7b] shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Microsoft Outlook Webhook Simulation Console</p>
                <p>
                  Use this console to simulate an incoming email notification to our webhook endpoint. The backend will:
                </p>
                <ol className="list-decimal pl-4 space-y-1 mt-1 font-mono text-[10px]">
                  <li>Locate lead contact matching the "Sender Email".</li>
                  <li>Categorize reply intent via Gemini AI models (Interested, Unsubscribe, Objection, etc.).</li>
                  <li>Update lead state, route opt-outs to Suppression lists, and register logs.</li>
                </ol>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form */}
              <form onSubmit={handleSimulateWebhook} className="lg:col-span-1 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sim-sender" className="text-xs font-bold text-slate-700">Sender Email (Lead Contact) *</Label>
                  <Input
                    id="sim-sender"
                    type="email"
                    required
                    placeholder="customer@company.com"
                    value={simSenderEmail}
                    onChange={(e) => setSimSenderEmail(e.target.value)}
                    className="text-xs border-slate-200 h-9"
                  />
                  <p className="text-[10px] text-slate-400">Must match an email of an existing lead contact in the CRM.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sim-subject" className="text-xs font-bold text-slate-700">Email Subject</Label>
                  <Input
                    id="sim-subject"
                    placeholder="e.g. Please unsubscribe me immediately"
                    value={simSubject}
                    onChange={(e) => setSimSubject(e.target.value)}
                    className="text-xs border-slate-200 h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sim-body" className="text-xs font-bold text-slate-700">Email Body</Label>
                  <Textarea
                    id="sim-body"
                    placeholder="e.g. We are no longer interested in your campaign. Please remove us from your mailing list."
                    value={simBody}
                    onChange={(e) => setSimBody(e.target.value)}
                    className="text-xs border-slate-200 min-h-[100px]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSimSenderEmail(simSenderEmail);
                      setSimSubject('Stop emailing me');
                      setSimBody('Please remove our email from your marketing list. Thanks.');
                    }}
                    className="text-[10px] h-8 px-2 border-slate-200"
                  >
                    Load Opt-Out Example
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSimSenderEmail(simSenderEmail);
                      setSimSubject('Pricing Inquiry');
                      setSimBody('We would love to schedule a demo. What is the pricing structure for 10kg parcels?');
                    }}
                    className="text-[10px] h-8 px-2 border-slate-200"
                  >
                    Load Interest Example
                  </Button>
                </div>

                <Button
                  type="submit"
                  disabled={simLoading}
                  className="w-full bg-[#095c7b] hover:bg-[#0b6d91] text-white font-semibold text-xs h-10 gap-1.5"
                >
                  {simLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Firing Simulation...
                    </>
                  ) : (
                    <>
                      <Terminal className="h-4 w-4" />
                      Simulate Incoming Webhook
                    </>
                  )}
                </Button>
              </form>

              {/* Simulation Result */}
              <div className="lg:col-span-2 space-y-3">
                <Label className="text-xs font-bold text-slate-700">State Transition & Processing Results</Label>
                <div className="border border-slate-200 rounded-lg p-5 min-h-[280px] bg-slate-900 text-slate-200 font-mono text-[11px] overflow-auto space-y-4">
                  {simResult ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">AUTOMATION TRANSACTION COMPLETE</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-y-2 text-xs">
                        <div className="text-slate-400">Status:</div>
                        <div className="col-span-2 font-bold text-white">{simResult.status}</div>

                        <div className="text-slate-400">Classified Intent:</div>
                        <div className="col-span-2 text-sky-300 font-bold flex items-center gap-1.5">
                          {simResult.intent === 'Unsubscribe Request' ? (
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                          )}
                          {simResult.intent}
                        </div>

                        <div className="text-slate-400">Suggested CRM State:</div>
                        <div className="col-span-2 text-yellow-300 font-semibold">{simResult.suggestedStatus}</div>

                        <div className="text-slate-400">Matched Lead ID:</div>
                        <div className="col-span-2 text-slate-300">{simResult.leadId}</div>
                      </div>

                      <div className="space-y-1 mt-3">
                        <div className="text-slate-400 font-bold border-t border-slate-800 pt-2">Gemini Reasoning:</div>
                        <p className="text-slate-300 leading-relaxed italic">"{simResult.reasoning}"</p>
                      </div>

                      <div className="bg-slate-800/50 p-2.5 rounded border border-slate-800 space-y-1">
                        <div className="font-bold text-white">System Side-Effects Executed:</div>
                        {simResult.intent === 'Unsubscribe Request' ? (
                          <ul className="list-disc pl-4 space-y-1 text-slate-300">
                            <li>Contact optedOut set to <span className="text-emerald-400">true</span></li>
                            <li>Contact sendEmail permission set to <span className="text-rose-400">"no"</span></li>
                            <li>Record written to global <span className="text-sky-300">marketing_suppression_list</span></li>
                            <li>Lead status updated to <span className="text-amber-400">Unqualified</span></li>
                            <li>Activity history updated under lead</li>
                          </ul>
                        ) : (
                          <ul className="list-disc pl-4 space-y-1 text-slate-300">
                            <li>Email added to lead's emails subcollection</li>
                            <li>Lead status updated to <span className="text-emerald-400">{simResult.suggestedStatus}</span></li>
                            <li>Activity log registered in CRM profile</li>
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-slate-500 gap-2">
                      <Terminal className="h-8 w-8 text-slate-600" />
                      <span>Simulate an email delivery to view processing logs and transitions.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Displaying the latest mailbox automation transactions and routing errors.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={logsLoading}
                className="h-8 text-xs border-slate-200 gap-1.5"
              >
                <RefreshCw className={`h-3 w-3 ${logsLoading ? 'animate-spin' : ''}`} />
                Refresh Logs
              </Button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white text-xs">
              {logsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-[#095c7b]" />
                  <span>Loading transaction logs...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg bg-slate-50/50 text-slate-400">
                  <span>No transactions recorded yet. Run a webhook simulation!</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Sender Email</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3">AI Intent</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Transition / Error Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-slate-500 font-mono text-[10px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3 font-medium text-slate-800">{log.senderEmail}</td>
                          <td className="p-3 text-slate-600 truncate max-w-[150px]" title={log.subject}>
                            {log.subject}
                          </td>
                          <td className="p-3">
                            {log.intent ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                log.intent === 'Unsubscribe Request'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : log.intent === 'Interested'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {log.intent}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'error'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {log.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-[10px] font-mono text-slate-500 max-w-[280px] truncate" title={log.error || log.reason || log.reasoning}>
                            {log.error ? (
                              <span className="text-rose-600 font-bold">ERROR: {log.error}</span>
                            ) : log.reason ? (
                              log.reason
                            ) : (
                              `crm status -> ${log.suggestedStatus}`
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
