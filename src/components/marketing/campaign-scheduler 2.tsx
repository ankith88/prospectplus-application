'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Loader2, Calendar as CalendarIcon, Clock, Users, ShieldAlert, Send, ListFilter, Plus, Trash2, MailOpen, CheckCircle } from 'lucide-react';
import { salesReps } from '@/lib/constants';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface Campaign {
  id?: string;
  name: string;
  templateId: string;
  templateName?: string;
  audienceFilters: {
    customerCampaign?: string;
    salesRepAssigned?: string;
    dialerAssigned?: string;
    franchisee?: string;
  };
  senderName: string;
  replyToEmail: string;
  subjectLine: string;
  schedulingType: 'instant' | 'scheduled';
  scheduledAt?: string;
  status: 'draft' | 'queued' | 'sending' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
  metrics?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
}

export function CampaignScheduler({ onCampaignCreated }: { onCampaignCreated?: () => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [senderName, setSenderName] = useState('MailPlus Outbound Marketing');
  const [replyToEmail, setReplyToEmail] = useState('marketing@mailplus.com.au');
  const [subjectLine, setSubjectLine] = useState('');
  const [schedulingType, setSchedulingType] = useState<'instant' | 'scheduled'>('instant');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Audience filters
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [filterSalesRep, setFilterSalesRep] = useState('all');
  const [filterDialer, setFilterDialer] = useState('all');
  const [filterFranchisee, setFilterFranchisee] = useState('all');

  // Query options scanned from leads
  const [uniqueCampaigns, setUniqueCampaigns] = useState<string[]>([]);
  const [uniqueDialers, setUniqueDialers] = useState<string[]>([]);
  const [uniqueFranchisees, setUniqueFranchisees] = useState<string[]>([]);

  // Calculation metrics
  const [scannedRecipients, setScannedRecipients] = useState(0);
  const [scannedSuppressed, setScannedSuppressed] = useState(0);
  const [calculatingRecipients, setCalculatingRecipients] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchCampaignsAndTemplates();
    scanUniqueLeadFields();
  }, []);

  // Recalculate match size whenever filters change
  useEffect(() => {
    if (isOpen) {
      calculateAudienceSize();
    }
  }, [filterCampaign, filterSalesRep, filterDialer, filterFranchisee, isOpen]);

  const fetchCampaignsAndTemplates = async () => {
    setLoading(true);
    try {
      const [campaignsSnap, templatesSnap] = await Promise.all([
        getDocs(collection(firestore, 'marketing_campaigns')),
        getDocs(collection(firestore, 'marketing_templates'))
      ]);

      const tList = templatesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Template[];
      setTemplates(tList);

      const cList = campaignsSnap.docs.map(doc => {
        const data = doc.data();
        const t = tList.find(temp => temp.id === data.templateId);
        return {
          id: doc.id,
          templateName: t ? t.name : 'Unknown Template',
          ...data
        };
      }) as Campaign[];
      
      setCampaigns(cList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Error fetching scheduler data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load campaigns.'
      });
    } finally {
      setLoading(false);
    }
  };

  const scanUniqueLeadFields = async () => {
    try {
      const snap = await getDocs(collection(firestore, 'leads'));
      const camps = new Set<string>();
      const dialers = new Set<string>();
      const frans = new Set<string>();

      snap.docs.forEach(doc => {
        const d = doc.data();
        if (d.campaign || d.customerCampaign) camps.add(d.campaign || d.customerCampaign);
        if (d.dialerAssigned) dialers.add(d.dialerAssigned);
        if (d.franchisee) frans.add(d.franchisee);
      });

      setUniqueCampaigns(Array.from(camps).sort());
      setUniqueDialers(Array.from(dialers).sort());
      setUniqueFranchisees(Array.from(frans).sort());
    } catch (error) {
      console.error('Lead scanning failed:', error);
    }
  };

  const calculateAudienceSize = async () => {
    setCalculatingRecipients(true);
    try {
      const leadsSnap = await getDocs(collection(firestore, 'leads'));
      const suppressionSnap = await getDocs(collection(firestore, 'marketing_suppression_list'));
      const suppressed = new Set(suppressionSnap.docs.map(doc => doc.id.toLowerCase().trim()));

      let matchedCount = 0;
      let suppressedCount = 0;

      for (const doc of leadsSnap.docs) {
        const lead = doc.data();

        // 1. Apply segmentation filters
        if (filterCampaign !== 'all' && (lead.campaign || lead.customerCampaign) !== filterCampaign) continue;
        if (filterSalesRep !== 'all' && lead.salesRepAssigned !== filterSalesRep) continue;
        if (filterDialer !== 'all' && lead.dialerAssigned !== filterDialer) continue;
        if (filterFranchisee !== 'all' && lead.franchisee !== filterFranchisee) continue;

        // 2. Fetch contacts or direct email
        const contactsSnap = await getDocs(collection(firestore, 'leads', doc.id, 'contacts'));
        const recipients: string[] = [];

        if (!contactsSnap.empty) {
          contactsSnap.docs.forEach(cDoc => {
            const c = cDoc.data();
            if (c.email && c.sendEmail !== 'no' && !c.optedOut) {
              recipients.push(c.email.toLowerCase().trim());
            }
          });
        } else {
          const email = lead.customerServiceEmail;
          if (email) recipients.push(email.toLowerCase().trim());
        }

        // 3. Count total recipients & suppressions
        recipients.forEach(email => {
          if (suppressed.has(email)) {
            suppressedCount++;
          } else {
            matchedCount++;
          }
        });
      }

      setScannedRecipients(matchedCount);
      setScannedSuppressed(suppressedCount);

    } catch (error) {
      console.error('Error calculating audience size:', error);
    } finally {
      setCalculatingRecipients(false);
    }
  };

  const handleTemplateChange = (val: string) => {
    setSelectedTemplateId(val);
    const temp = templates.find(t => t.id === val);
    if (temp) {
      setSubjectLine(temp.subject);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await deleteDoc(doc(firestore, 'marketing_campaigns', id));
      toast({ title: 'Campaign deleted.' });
      fetchCampaignsAndTemplates();
    } catch {
      toast({ variant: 'destructive', title: 'Deletion failed.' });
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Mandatory Validations
    if (!campaignName || !selectedTemplateId || !senderName || !replyToEmail || !subjectLine) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'All basic setup fields are required.'
      });
      return;
    }

    // 2. Outbound @mailplus.com.au check
    if (!replyToEmail.endsWith('@mailplus.com.au')) {
      toast({
        variant: 'destructive',
        title: 'Domain Security Block',
        description: 'Sender Reply-To Email must route natively through an authorized @mailplus.com.au account to protect domain reputation and deliverability.'
      });
      return;
    }

    if (schedulingType === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      toast({
        variant: 'destructive',
        title: 'Scheduling Error',
        description: 'Please specify the future send date and time.'
      });
      return;
    }

    setSubmitting(true);
    const now = new Date().toISOString();
    const scheduledAt = schedulingType === 'scheduled' ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null;

    try {
      const campaignData: Omit<Campaign, 'id'> = {
        name: campaignName,
        templateId: selectedTemplateId,
        senderName,
        replyToEmail,
        subjectLine,
        schedulingType,
        audienceFilters: {
          customerCampaign: filterCampaign === 'all' ? undefined : filterCampaign,
          salesRepAssigned: filterSalesRep === 'all' ? undefined : filterSalesRep,
          dialerAssigned: filterDialer === 'all' ? undefined : filterDialer,
          franchisee: filterFranchisee === 'all' ? undefined : filterFranchisee
        },
        status: schedulingType === 'scheduled' ? 'queued' : 'sending',
        createdAt: now,
        metrics: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0
        }
      };

      if (scheduledAt) {
        campaignData.scheduledAt = scheduledAt;
      }

      // Add to Firestore
      const docRef = await addDoc(collection(firestore, 'marketing_campaigns'), campaignData);
      
      toast({
        title: schedulingType === 'scheduled' ? 'Campaign Scheduled' : 'Campaign Initiated',
        description: schedulingType === 'scheduled' 
          ? `Queued to send on ${new Date(scheduledAt!).toLocaleString()}` 
          : 'Compiling templates and dispatching via Microsoft Outlook Network...'
      });

      setIsOpen(false);

      // If instant, trigger backend send immediately
      if (schedulingType === 'instant') {
        const response = await fetch('/api/campaigns/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: docRef.id })
        });
        const result = await response.json();
        
        if (result.success) {
          toast({
            title: 'Dispatched Successfully',
            description: `Sent to ${result.metrics.sent} lead contacts. Bounces: ${result.metrics.bounced}.`
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Send API Failed',
            description: result.message || 'System was unable to complete Outlook SMTP routing.'
          });
        }
      }

      fetchCampaignsAndTemplates();
      if (onCampaignCreated) onCampaignCreated();

    } catch (error) {
      console.error('Error queuing campaign:', error);
      toast({
        variant: 'destructive',
        title: 'Error Scheduling Campaign',
        description: 'Failed to write configuration to Firestore.'
      });
    } finally {
      setSubmitting(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setCampaignName('');
    setSelectedTemplateId('');
    setSubjectLine('');
    setSchedulingType('instant');
    setScheduledDate('');
    setScheduledTime('');
    setFilterCampaign('all');
    setFilterSalesRep('all');
    setFilterDialer('all');
    setFilterFranchisee('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-medium tracking-tight">Campaign Automations</h2>
          <p className="text-xs text-muted-foreground">Queue, segments, and dispatch outbound marketing campaigns</p>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
            <form onSubmit={handleScheduleSubmit}>
              <DialogHeader>
                <DialogTitle>Setup Outbound Marketing Campaign</DialogTitle>
                <DialogDescription>
                  Configure Microsoft Outlook-authenticated communications. Follow spam act compliance strictly.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-y my-4">
                {/* Left Form: Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-slate-800 border-b pb-1">1. Envelope Setup</h3>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Campaign Identifier</label>
                    <Input 
                      placeholder="e.g. Q2 Outbound Welcome Blast"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Sender Display Name</label>
                      <Input 
                        placeholder="e.g. MailPlus Sales"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Reply-To Address</label>
                      <Input 
                        placeholder="e.g. info@mailplus.com.au"
                        value={replyToEmail}
                        onChange={(e) => setReplyToEmail(e.target.value)}
                        className={!replyToEmail.endsWith('@mailplus.com.au') ? 'border-destructive text-destructive' : ''}
                      />
                      {!replyToEmail.endsWith('@mailplus.com.au') && (
                        <span className="text-[10px] text-destructive font-semibold">Must match @mailplus.com.au domain</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 font-semibold">Email Template</label>
                    <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder="Select email layout..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Subject Line</label>
                    <Input 
                      placeholder="Email subject..."
                      value={subjectLine}
                      onChange={(e) => setSubjectLine(e.target.value)}
                    />
                  </div>
                </div>

                {/* Right Form: Targeting & Segment */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-800 border-b pb-1 flex items-center gap-1.5 mb-3">
                      <ListFilter className="h-4 w-4 text-blue-500" /> 2. Target Segmentation
                    </h3>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Source Campaign</label>
                        <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                          <SelectTrigger className="bg-white text-xs h-9">
                            <SelectValue placeholder="All Campaigns" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Campaigns</SelectItem>
                            {uniqueCampaigns.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Assigned Sales Rep</label>
                        <Select value={filterSalesRep} onValueChange={setFilterSalesRep}>
                          <SelectTrigger className="bg-white text-xs h-9">
                            <SelectValue placeholder="All Reps" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sales Reps</SelectItem>
                            {salesReps.map(r => (
                              <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Dialer Assigned</label>
                        <Select value={filterDialer} onValueChange={setFilterDialer}>
                          <SelectTrigger className="bg-white text-xs h-9">
                            <SelectValue placeholder="All Dialers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Dialers</SelectItem>
                            {uniqueDialers.map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Franchisee</label>
                        <Select value={filterFranchisee} onValueChange={setFilterFranchisee}>
                          <SelectTrigger className="bg-white text-xs h-9">
                            <SelectValue placeholder="All Franchisees" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Franchisees</SelectItem>
                            {uniqueFranchisees.map(f => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Reactive Audience Size Calculator */}
                  <div className="bg-white rounded-lg p-3 border space-y-2">
                    <span className="text-xs font-semibold text-slate-600 block">Recipient Delivery Pool</span>
                    {calculatingRecipients ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                        <span>Querying leads and applying suppressions...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-blue-50/50 p-2 rounded-md border border-blue-100">
                          <span className="text-[9px] uppercase font-bold text-blue-600 block">Matched Pool</span>
                          <span className="text-base font-bold text-blue-700">{scannedRecipients + scannedSuppressed}</span>
                        </div>
                        <div className="bg-amber-50/50 p-2 rounded-md border border-amber-100">
                          <span className="text-[9px] uppercase font-bold text-amber-600 block">Suppressed</span>
                          <span className="text-base font-bold text-amber-700">{scannedSuppressed}</span>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-md border border-emerald-100">
                          <span className="text-[9px] uppercase font-bold text-emerald-600 block">Net Volume</span>
                          <span className="text-base font-bold text-emerald-700">{scannedRecipients}</span>
                        </div>
                      </div>
                    )}
                    {scannedSuppressed > 0 && (
                      <span className="text-[10px] text-amber-600 flex items-center gap-1 mt-1 font-medium">
                        <ShieldAlert className="h-3 w-3 shrink-0" /> Suppressed emails automatically excluded from delivery pool.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Scheduling */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 mb-6">
                <h3 className="font-semibold text-sm text-slate-800 border-b pb-1 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-500" /> 3. Schedule Option
                </h3>
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input 
                      type="radio" 
                      name="sched" 
                      checked={schedulingType === 'instant'}
                      onChange={() => setSchedulingType('instant')}
                      className="accent-primary"
                    />
                    Instant Send (Immediate dispatch queue)
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input 
                      type="radio" 
                      name="sched" 
                      checked={schedulingType === 'scheduled'}
                      onChange={() => setSchedulingType('scheduled')}
                      className="accent-primary"
                    />
                    Scheduled Send (Future trigger)
                  </label>
                </div>

                {schedulingType === 'scheduled' && (
                  <div className="flex gap-4 pt-2 animate-in slide-in-from-top-1 duration-200">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Send Date</label>
                      <Input 
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="bg-white text-xs h-9 w-40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Send Time</label>
                      <Input 
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="bg-white text-xs h-9 w-32"
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting || scannedRecipients === 0}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Preparing Send...
                    </>
                  ) : schedulingType === 'instant' ? (
                    <>
                      <Send className="h-4 w-4" /> Dispatch Now
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="h-4 w-4" /> Lock In Schedule
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns Queue Table */}
      <Card className="bg-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col h-40 items-center justify-center p-6 text-center text-muted-foreground gap-2">
              <MailOpen className="h-8 w-8 opacity-40" />
              <span className="text-sm">No campaigns configured yet. Click 'Create Campaign' to start.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Campaign Name</th>
                    <th className="p-4">Template</th>
                    <th className="p-4">Audience Criteria</th>
                    <th className="p-4">Send Queue</th>
                    <th className="p-4">Deliveries</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {campaigns.map(c => {
                    const filters = c.audienceFilters || {};
                    const filterChips = [];
                    if (filters.customerCampaign) filterChips.push(`Campaign: ${filters.customerCampaign}`);
                    if (filters.salesRepAssigned) filterChips.push(`Rep: ${filters.salesRepAssigned}`);
                    if (filters.dialerAssigned) filterChips.push(`Dialer: ${filters.dialerAssigned}`);
                    if (filters.franchisee) filterChips.push(`Franchisee: ${filters.franchisee}`);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-semibold text-slate-800">{c.name}</td>
                        <td className="p-4 text-muted-foreground">{c.templateName}</td>
                        <td className="p-4 max-w-[200px]">
                          {filterChips.length === 0 ? (
                            <span className="text-slate-400 italic">Broad blast (All Leads)</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {filterChips.map(chip => (
                                <span key={chip} className="bg-slate-100 border text-[9px] px-1.5 py-0.5 rounded font-medium text-slate-600">
                                  {chip}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {c.schedulingType === 'instant' ? (
                            'Instant Delivery'
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-slate-700">Scheduled Trigger</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(c.scheduledAt!).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-bold text-slate-700">
                          {c.status === 'sent' ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                              <span>{c.metrics?.sent} Recipient(s)</span>
                            </div>
                          ) : c.status === 'sending' ? (
                            <span className="text-blue-500 animate-pulse">Dispatching...</span>
                          ) : (
                            <span className="text-slate-400 italic font-normal">Pending dispatch</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.status === 'sent' ? 'bg-emerald-100 text-emerald-800' :
                            c.status === 'sending' ? 'bg-blue-100 text-blue-800' :
                            c.status === 'queued' ? 'bg-amber-100 text-amber-800' :
                            c.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDelete(c.id!, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
