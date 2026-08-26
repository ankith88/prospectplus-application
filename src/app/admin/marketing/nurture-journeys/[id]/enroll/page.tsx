'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { Loader2, ArrowLeft, Users, CheckCircle2, PlayCircle, AlertCircle, Eye, Building2, Sparkles, Mail, Send, TestTube, Search, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { replaceTemplatePlaceholders, extractUserMobile } from '@/lib/template-replacer';

export default function EnrollLeadsPage() {
  const { userProfile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const journeyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [journey, setJourney] = useState<any>(null);
  const [matchingLeads, setMatchingLeads] = useState<any[]>([]);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [enrolling, setEnrolling] = useState(false);
  const [activating, setActivating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Test Email Modal state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedLeadForTest, setSelectedLeadForTest] = useState<any>(null);
  const [selectedStepId, setSelectedStepId] = useState<string>('');
  const [testRecipientEmail, setTestRecipientEmail] = useState<string>('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (journeyId) {
      fetchJourneyAndEvaluate();
    }
  }, [journeyId]);

  const parseLeadDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val?.toDate === 'function') return val.toDate();
    if (typeof val === 'number') return new Date(val);
    if (typeof val === 'string') {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const getFieldValue = (field: string, leadData: any) => {
    if (field === 'cancellationCategory') {
      return (leadData.cancellationCategory || leadData.cancellationWhy || '').toString().trim();
    }
    if (field === 'isCompany' || field === 'recordType') {
      const isComp = leadData.isCompany === true || String(leadData.isCompany).toLowerCase() === 'true' || leadData.recordType === 'company';
      return isComp ? 'Company' : 'Lead';
    }
    if (field === 'localMileJobCount') {
      return Number(leadData.jobCount || 0);
    }
    if (field === 'localMileTermsAccepted') {
      return leadData.localMileTermsAccepted === true || String(leadData.localMileTermsAccepted).toLowerCase() === 'true';
    }
    return (leadData[field] ?? '').toString().trim();
  };

  const evaluateCondition = (cond: any, leadData: any) => {
    if (!cond.field) return false;
    const op = cond.operator || 'equals';

    if (cond.field === 'dateLeadEntered' || cond.field === 'dateEntered' || cond.field === 'createdAt') {
      const leadDate = parseLeadDate(leadData.dateLeadEntered || leadData.dateEntered || leadData.createdAt || leadData.createdDate);
      if (op === 'is_empty') return !leadDate;
      if (op === 'is_not_empty') return !!leadDate;
      if (!leadDate) return false;

      const leadTime = leadDate.getTime();
      let fromStr = cond.valueFrom || '';
      let toStr = cond.valueTo || '';

      if (cond.value && typeof cond.value === 'string' && cond.value.includes('|')) {
        const parts = cond.value.split('|');
        fromStr = fromStr || parts[0];
        toStr = toStr || parts[1];
      } else if (!fromStr && cond.value) {
        fromStr = String(cond.value);
      }

      if (op === 'between') {
        let match = true;
        if (fromStr) {
          const fromTime = new Date(`${fromStr}T00:00:00`).getTime();
          if (!isNaN(fromTime)) match = match && leadTime >= fromTime;
        }
        if (toStr) {
          const toTime = new Date(`${toStr}T23:59:59.999`).getTime();
          if (!isNaN(toTime)) match = match && leadTime <= toTime;
        }
        return match;
      }

      if (op === 'after' || op === 'greater_than') {
        if (!fromStr) return true;
        const fromTime = new Date(`${fromStr}T00:00:00`).getTime();
        return !isNaN(fromTime) ? leadTime >= fromTime : true;
      }

      if (op === 'before' || op === 'less_than') {
        const targetStr = toStr || fromStr;
        if (!targetStr) return true;
        const toTime = new Date(`${targetStr}T23:59:59.999`).getTime();
        return !isNaN(toTime) ? leadTime <= toTime : true;
      }

      if (op === 'equals') {
        if (!fromStr) return true;
        const fromTime = new Date(`${fromStr}T00:00:00`).getTime();
        const toTime = new Date(`${fromStr}T23:59:59.999`).getTime();
        return leadTime >= fromTime && leadTime <= toTime;
      }

      if (op === 'not_equals') {
        if (!fromStr) return true;
        const fromTime = new Date(`${fromStr}T00:00:00`).getTime();
        const toTime = new Date(`${fromStr}T23:59:59.999`).getTime();
        return leadTime < fromTime || leadTime > toTime;
      }
    }

    if (op === 'is_empty') {
      const val = getFieldValue(cond.field, leadData);
      if (typeof val === 'boolean') return !val;
      if (typeof val === 'number') return false;
      return val === '' || val === null || val === undefined;
    }

    if (op === 'is_not_empty') {
      const val = getFieldValue(cond.field, leadData);
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return true;
      return val !== '' && val !== null && val !== undefined;
    }

    if (cond.field === 'localMileJobCount') {
      const leadNum = Number(leadData.jobCount || 0);
      const targetNum = Number(cond.value);
      return op === 'not_equals' ? leadNum !== targetNum : leadNum === targetNum;
    }

    if (cond.field === 'localMileTermsAccepted') {
      const isAccepted = leadData.localMileTermsAccepted === true || String(leadData.localMileTermsAccepted).toLowerCase() === 'true';
      const targetValue = cond.value === true || String(cond.value).toLowerCase() === 'true';
      return op === 'not_equals' ? isAccepted !== targetValue : isAccepted === targetValue;
    }

    const leadVal = getFieldValue(cond.field, leadData).toLowerCase();
    const targetVal = String(cond.value || '').toLowerCase().trim();

    if (op === 'not_equals') {
      return leadVal !== targetVal;
    }
    return leadVal === targetVal;
  };

  const fetchJourneyAndEvaluate = async () => {
    setLoading(true);
    try {
      // 1. Fetch Journey
      const jDoc = await getDoc(doc(firestore, 'Journeys', journeyId));
      if (!jDoc.exists()) {
        toast({ variant: 'destructive', title: 'Journey not found' });
        router.push('/admin/marketing/nurture-journeys');
        return;
      }
      
      const jData = jDoc.data();
      setJourney({ id: jDoc.id, ...jData });

      // 2. Extract Conditions
      const triggerNode = jData.nodes?.find((n: any) => n.type === 'trigger' && n.config?.autoEnroll);
      if (!triggerNode || !triggerNode.config.enrollConditionGroups) {
        toast({ 
          variant: 'destructive', 
          title: 'No enrollment conditions', 
          description: 'This journey does not have auto-enrollment conditions configured.' 
        });
        setLoading(false);
        return;
      }

      const conditionGroups = triggerNode.config.enrollConditionGroups;

      // 3. Fetch all leads and evaluate in memory
      const leadsSnap = await getDocs(collection(firestore, 'leads'));
      const allLeads = leadsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      setTotalLeadsCount(allLeads.length);

      const matched = allLeads.filter(leadData => {
        // Skip leads already in this journey
        const currentActive = leadData.activeJourneys || [];
        if (currentActive.includes(journeyId)) return false;

        // Evaluate conditions (OR between groups, AND within groups)
        return conditionGroups.some((group: any) => 
          group.conditions?.every((cond: any) => evaluateCondition(cond, leadData))
        );
      });

      setMatchingLeads(matched);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ variant: 'destructive', title: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const startEnrollment = async () => {
    if (matchingLeads.length === 0) return;
    setEnrolling(true);

    try {
      const cancelOtherJourneys = journey.nodes?.find((n: any) => n.type === 'trigger')?.config?.cancelOtherJourneys || false;
      const batchSize = 50;
      let processed = 0;

      const author = userProfile?.displayName || (userProfile?.firstName && userProfile?.lastName ? `${userProfile.firstName} ${userProfile.lastName}` : userProfile?.firstName) || userProfile?.email || 'Admin';
      const nowStr = new Date().toISOString();

      for (let i = 0; i < matchingLeads.length; i += batchSize) {
        const batchLeads = matchingLeads.slice(i, i + batchSize);
        const batch = writeBatch(firestore);

        batchLeads.forEach(lead => {
          const leadRef = doc(firestore, 'leads', lead.id);
          const currentActive = lead.activeJourneys || [];
          
          let journeysToKeep = [...currentActive];
          if (cancelOtherJourneys) {
            journeysToKeep = [journeyId];
          } else {
            journeysToKeep.push(journeyId);
          }

          batch.update(leadRef, { activeJourneys: journeysToKeep });

          const activityRef = doc(collection(firestore, 'leads', lead.id, 'activity'));
          batch.set(activityRef, {
            type: 'Update',
            date: nowStr,
            notes: `Lead enrolled in nurture campaign '${journey?.name || 'Nurture Campaign'}' via Admin Nurture Enrollment by ${author}.`,
            author
          });
        });

        await batch.commit();
        processed += batchLeads.length;
        
        setEnrolledCount(processed);
        setProgress((processed / matchingLeads.length) * 100);
      }

      setCompleted(true);
      toast({ title: 'Enrollment Complete', description: `Successfully enrolled ${processed} leads.` });
    } catch (error) {
      console.error('Error during enrollment batch:', error);
      toast({ variant: 'destructive', title: 'Enrollment failed during processing' });
    } finally {
      setEnrolling(false);
    }
  };

  const activateAndStartEnrollment = async () => {
    if (!journeyId) return;
    setActivating(true);
    try {
      const jRef = doc(firestore, 'Journeys', journeyId);
      await updateDoc(jRef, { status: 'active' });
      setJourney((prev: any) => ({ ...prev, status: 'active' }));
      toast({ title: 'Journey Activated', description: 'Journey status updated to Active.' });
      await startEnrollment();
    } catch (error) {
      console.error('Error activating journey:', error);
      toast({ variant: 'destructive', title: 'Failed to activate journey' });
    } finally {
      setActivating(false);
    }
  };

  // Filter email steps from journey nodes
  const emailSteps = (journey?.nodes || []).filter(
    (n: any) => n.type === 'action' && (n.config?.actionType === 'email' || !n.config?.actionType)
  );

  const getLeadEmail = (lead: any): string => {
    if (!lead) return '';
    if (lead.email && typeof lead.email === 'string' && lead.email.trim()) return lead.email.trim();
    if (lead.contactEmail && typeof lead.contactEmail === 'string' && lead.contactEmail.trim()) return lead.contactEmail.trim();
    if (lead.contactPersonEmail && typeof lead.contactPersonEmail === 'string' && lead.contactPersonEmail.trim()) return lead.contactPersonEmail.trim();
    if (lead.customerServiceEmail && typeof lead.customerServiceEmail === 'string' && lead.customerServiceEmail.trim()) return lead.customerServiceEmail.trim();
    if (Array.isArray(lead.emails) && lead.emails.length > 0 && lead.emails[0]?.email) return lead.emails[0].email.trim();
    return '';
  };

  const handleOpenTestModal = (lead: any) => {
    setSelectedLeadForTest(lead);
    const leadEmail = getLeadEmail(lead);
    setTestRecipientEmail(leadEmail || userProfile?.email || '');
    if (emailSteps.length > 0) {
      setSelectedStepId(emailSteps[0].id);
    }
    setTestModalOpen(true);
  };

  const handleSendTestEmail = async () => {
    if (!testRecipientEmail || !selectedLeadForTest || !selectedStepId) {
      toast({ variant: 'destructive', title: 'Invalid parameters', description: 'Please select an email step and specify a test recipient email.' });
      return;
    }

    setSendingTest(true);
    try {
      const stepNode = emailSteps.find((n: any) => n.id === selectedStepId);
      if (!stepNode) {
        toast({ variant: 'destructive', title: 'Step node not found' });
        setSendingTest(false);
        return;
      }

      const stepConfig = stepNode.config || {};
      let subject = stepConfig.subject || 'Nurture Campaign Test Email';
      let rawHtml = stepConfig.emailBody || '';

      // If step uses a stored template, fetch template content
      if (stepConfig.templateId && stepConfig.templateId !== 'custom') {
        const tDoc = await getDoc(doc(firestore, 'marketing_templates', stepConfig.templateId));
        if (tDoc.exists()) {
          const tData = tDoc.data();
          if (tData?.subject) subject = tData.subject;
          if (tData?.body) rawHtml = tData.body;
        }
      }

      if (!rawHtml) {
        toast({ variant: 'destructive', title: 'No email content', description: 'The selected step has no template or email body configured.' });
        setSendingTest(false);
        return;
      }

      // Merge Lead Variables & Resolve AM Details strictly from users collection
      const leadName = selectedLeadForTest.contactPersonName || selectedLeadForTest.companyName || 'Valued Customer';
      const companyName = selectedLeadForTest.companyName || selectedLeadForTest.tradingName || 'Your Business';
      let amName = selectedLeadForTest.accountManagerAssigned || selectedLeadForTest.salesRepAssigned || 'MailPlus Team';
      let amMobile = '';
      let amEmail = selectedLeadForTest.accountManagerEmail || '';
      let amCalendly = selectedLeadForTest.salesRepAssignedCalendlyLink || '';

      if (amName) {
        try {
          const amTrimmed = amName.trim();
          const userDocById = await getDoc(doc(firestore, 'users', amTrimmed));
          let matchedUser: any = userDocById.exists() ? userDocById.data() : null;

          if (!matchedUser) {
            const usersSnap = await getDocs(collection(firestore, 'users'));
            const targetLower = amTrimmed.toLowerCase();
            const foundDoc = usersSnap.docs.find(d => {
              const uData = d.data() || {};
              const fullName = `${uData.firstName || ''} ${uData.lastName || ''}`.trim().toLowerCase();
              const displayName = (uData.displayName || '').trim().toLowerCase();
              const name = (uData.name || '').trim().toLowerCase();
              const email = (uData.email || '').trim().toLowerCase();
              return fullName === targetLower || displayName === targetLower || name === targetLower || email === targetLower || d.id.toLowerCase() === targetLower;
            });
            if (foundDoc) matchedUser = foundDoc.data();
          }

          if (matchedUser) {
            amName = `${matchedUser.firstName || ''} ${matchedUser.lastName || ''}`.trim() || matchedUser.displayName || matchedUser.name || amTrimmed;
            amMobile = extractUserMobile(matchedUser);
            amEmail = matchedUser.email || amEmail;
            amCalendly = matchedUser.calendlyLink || matchedUser.calendly || amCalendly;
          }
        } catch (e) {
          console.error('Error resolving AM details from users collection for test email:', e);
        }
      }

      const primaryContact = selectedLeadForTest.contacts?.find((c: any) => c.isPrimary) || selectedLeadForTest.contacts?.[0] || null;
      const contactName = primaryContact?.name || selectedLeadForTest.contactPersonName || selectedLeadForTest.displayName || selectedLeadForTest.companyName || 'Valued Customer';
      const contactFirstName = primaryContact?.firstName || contactName.split(' ')[0];
      const localMilePlusAuthLink = primaryContact?.localMilePlusAuthLink || selectedLeadForTest.localMileActivationLink || '';
      const localMileSecurityCode = primaryContact?.securityCode || selectedLeadForTest.securityCode || selectedLeadForTest.localMileSecurityCode || '';

      const scfLink = selectedLeadForTest.dynamicScfUrl || (selectedLeadForTest.id ? `https://prospectplus.com.au/scf/${selectedLeadForTest.id}` : '');
      const sofLink = selectedLeadForTest.sofLink || selectedLeadForTest.standingOrderFormLink || '';
      const localMileLink = selectedLeadForTest.localMileRegistrationLink || '';

      const placeholderCtx = {
        lead: selectedLeadForTest,
        contact: {
          ...primaryContact,
          name: contactName,
          firstName: contactFirstName,
          email: primaryContact?.email || selectedLeadForTest.customerServiceEmail || selectedLeadForTest.email || '',
          phone: primaryContact?.phone || selectedLeadForTest.phone || '',
          localMilePlusAuthLink,
          securityCode: localMileSecurityCode
        },
        accountManager: {
          name: amName,
          mobile: amMobile,
          email: amEmail,
          calendly: amCalendly
        },
        salesRep: selectedLeadForTest.salesRepAssigned,
        franchisee: {
          name: selectedLeadForTest.franchisee || 'MailPlus',
          mainContact: selectedLeadForTest.franchiseeMainContact || selectedLeadForTest.franchisee || 'MailPlus',
          email: selectedLeadForTest.franchiseeEmail || '',
          mobile: selectedLeadForTest.franchiseeMobile || selectedLeadForTest.franchiseePhone || ''
        },
        customLinks: {
          scfLink,
          sofLink,
          localMileLink,
          localMileActivationLink: localMilePlusAuthLink,
          localMileSecurityCode,
          trialsRemaining: selectedLeadForTest.localMileTrialsRemaining ?? 5
        }
      };

      let bodyHtml = replaceTemplatePlaceholders(rawHtml, placeholderCtx);
      subject = replaceTemplatePlaceholders(subject, placeholderCtx);

      const leadEmailAddr = getLeadEmail(selectedLeadForTest);
      const isSentToActualLead = leadEmailAddr && testRecipientEmail.toLowerCase().trim() === leadEmailAddr.toLowerCase().trim();

      // Prepend test dispatch banner
      const testBanner = `
        <div style="background-color: ${isSentToActualLead ? '#fef2f2' : '#fef3c7'}; border: 1px solid ${isSentToActualLead ? '#fca5a5' : '#fde68a'}; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: ${isSentToActualLead ? '#991b1b' : '#92400e'}; font-family: sans-serif; text-align: center;">
          ⚡ <strong>NURTURE TEST DISPATCH:</strong> Previewing template step for <strong>${companyName}</strong> (${leadName}). Sent to <u>${testRecipientEmail}</u>${isSentToActualLead ? ' (Actual Lead Address)' : ''}.
        </div>
      `;
      bodyHtml = testBanner + bodyHtml;

      // Dispatch test email via API
      const res = await fetch('/api/campaigns/send-custom-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testRecipientEmail,
          subject: `[TEST PREVIEW] ${subject}`,
          html: bodyHtml,
          leadId: selectedLeadForTest.id
        })
      });

      const result = await res.json();
      if (result.success) {
        toast({ 
          title: 'Test Email Dispatched! 🚀', 
          description: `Sent test email to ${testRecipientEmail} using variables for '${companyName}'.` 
        });
        setTestModalOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Test email failed', description: result.message || 'Failed to dispatch test email.' });
      }
    } catch (err: any) {
      console.error('Error dispatching test email:', err);
      toast({ variant: 'destructive', title: 'Error dispatching email', description: err?.message || 'An error occurred.' });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center flex-col gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Evaluating Leads...</p>
      </div>
    );
  }

  const isDraftOrPaused = journey?.status !== 'active';

  const filteredLeads = matchingLeads.filter((lead) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const companyName = (lead.companyName || '').toLowerCase();
    const tradingName = (lead.tradingName || '').toLowerCase();
    const contactName = (lead.contactPersonName || '').toLowerCase();
    const email = (lead.email || getLeadEmail(lead) || '').toLowerCase();
    return companyName.includes(q) || tradingName.includes(q) || contactName.includes(q) || email.includes(q);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 mt-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/marketing/nurture-journeys')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {isDraftOrPaused ? 'Journey Lead Preview & Testing' : 'Retroactive Lead Enrollment'}
              </h2>
              {journey?.status === 'active' ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-semibold border-emerald-200">
                  Active
                </Badge>
              ) : journey?.status === 'paused' ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-semibold">
                  Paused (Preview Mode)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-semibold">
                  Draft (Testing Mode)
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5">Journey: <span className="font-medium text-slate-900">{journey?.name}</span></p>
          </div>
        </div>
      </div>

      {isDraftOrPaused && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-amber-900 text-sm shadow-sm">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Draft / Testing Mode Active</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              You are inspecting the actual leads that match the trigger criteria for this journey while it is in <strong className="uppercase">{journey?.status}</strong> status. 
              You can send test emails using lead variables to a custom email address before activating.
            </p>
          </div>
        </div>
      )}

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Evaluation Results
          </CardTitle>
          <CardDescription>
            We evaluated <strong>{totalLeadsCount}</strong> total leads against the enrollment conditions of this journey.
            Leads that are already enrolled in this journey have been excluded from the results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-50 border rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2">
            <span className="text-5xl font-bold text-slate-800">{matchingLeads.length}</span>
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Leads Match Criteria</span>
          </div>

          {matchingLeads.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  Matching Leads Preview {searchQuery.trim() ? `(${filteredLeads.length} of ${matchingLeads.length})` : `(${Math.min(matchingLeads.length, 50)} of ${matchingLeads.length})`}
                </h4>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search by company name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-8 h-8 text-xs bg-white border-slate-200"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {emailSteps.length > 0 && (
                    <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 shrink-0">
                      <Mail className="h-3.5 w-3.5" />
                      {emailSteps.length} Email Step{emailSteps.length === 1 ? '' : 's'} Available for Testing
                    </span>
                  )}
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden bg-white max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Company / Name</TableHead>
                      <TableHead className="text-xs font-semibold">Contact Person</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Bucket</TableHead>
                      <TableHead className="text-xs font-semibold">Lead Source</TableHead>
                      {emailSteps.length > 0 && (
                        <TableHead className="text-xs font-semibold text-right">Testing</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={emailSteps.length > 0 ? 6 : 5} className="h-24 text-center text-xs text-slate-500">
                          No leads matching &quot;{searchQuery}&quot; found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.slice(0, 50).map((lead) => (
                        <TableRow key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-medium text-xs text-slate-800">
                            {lead.companyName || lead.tradingName || lead.contactPersonName || 'Unnamed Lead'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {lead.contactPersonName || lead.email || '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {lead.customerStatus || lead.status || 'New'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 capitalize">
                            {lead.bucket || 'outbound'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {lead.leadSourceName || lead.leadSource || lead.campaignName || '-'}
                          </TableCell>
                          {emailSteps.length > 0 && (
                            <TableCell className="text-right text-xs">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-xs gap-1.5 text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                                onClick={() => handleOpenTestModal(lead)}
                                title="Send test email using this lead's data to a test email address"
                              >
                                <TestTube className="h-3.5 w-3.5" />
                                <span>Test Email</span>
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredLeads.length > 50 && (
                <p className="text-[11px] text-slate-400 text-right italic">
                  Showing first 50 of {filteredLeads.length} matching leads
                </p>
              )}
            </div>
          )}

          {(enrolling || completed) && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm font-medium text-slate-700">
                <span>Progress</span>
                <span>{enrolledCount} / {matchingLeads.length}</span>
              </div>
              <Progress value={progress} className="h-3" />
              {completed && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-md text-sm font-medium border border-emerald-100">
                    <CheckCircle2 className="h-5 w-5" />
                    All eligible leads have been successfully queued for enrollment!
                  </div>
                  <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded border border-slate-100">
                    Note: The background Nurture Process Engine will initialize these leads and send any immediate steps at the top of the next hour.
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t bg-slate-50/50 p-6">
          <Button variant="outline" onClick={() => router.push('/admin/marketing/nurture-journeys')} disabled={enrolling || activating}>
            {completed ? 'Back to Dashboard' : 'Cancel'}
          </Button>
          {!completed && (
            isDraftOrPaused ? (
              <Button 
                onClick={activateAndStartEnrollment} 
                disabled={matchingLeads.length === 0 || enrolling || activating}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                {activating || enrolling ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Activating & Enrolling...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Activate Journey & Enroll Leads</>
                )}
              </Button>
            ) : (
              <Button 
                onClick={startEnrollment} 
                disabled={matchingLeads.length === 0 || enrolling}
                className="gap-2"
              >
                {enrolling ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enrolling...</>
                ) : (
                  <><PlayCircle className="h-4 w-4" /> Start Enrollment</>
                )}
              </Button>
            )
          )}
        </CardFooter>
      </Card>

      {/* Test Email Dispatch Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <TestTube className="h-5 w-5 text-indigo-600" />
              Send Test Email for Lead
            </DialogTitle>
            <DialogDescription>
              Dispatches a test nurture email populated with real lead variables. You can send it directly to the actual lead or to your own test email address.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const actualLeadEmail = getLeadEmail(selectedLeadForTest);
            const isActualLeadSelected = actualLeadEmail && testRecipientEmail.toLowerCase().trim() === actualLeadEmail.toLowerCase().trim();
            const isMyEmailSelected = userProfile?.email && testRecipientEmail.toLowerCase().trim() === userProfile.email.toLowerCase().trim();

            return (
              <div className="space-y-4 py-3">
                <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1">
                  <div className="font-semibold text-slate-700">Selected Preview Lead:</div>
                  <div className="text-slate-900 font-medium flex items-center justify-between gap-2">
                    <span className="truncate">
                      {selectedLeadForTest?.companyName || selectedLeadForTest?.tradingName || 'Unnamed Lead'}
                      {selectedLeadForTest?.contactPersonName && ` (${selectedLeadForTest.contactPersonName})`}
                    </span>
                    {actualLeadEmail ? (
                      <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border-emerald-200 shrink-0">
                        {actualLeadEmail}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-mono text-slate-400 bg-slate-100 shrink-0">
                        No email on lead
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Select Journey Email Step</label>
                  <Select value={selectedStepId} onValueChange={setSelectedStepId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select email step" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailSteps.map((step: any, idx: number) => (
                        <SelectItem key={step.id} value={step.id}>
                          Step {idx + 1}: {step.config?.subject || 'Email Step'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Test Recipient Target</label>

                  {/* Quick Select Cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!actualLeadEmail}
                      onClick={() => actualLeadEmail && setTestRecipientEmail(actualLeadEmail)}
                      className={`p-2.5 text-xs rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                        !actualLeadEmail
                          ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                          : isActualLeadSelected
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-medium shadow-sm ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                        🎯 Send to Actual Lead
                      </span>
                      <span className="text-[11px] truncate text-slate-500">
                        {actualLeadEmail || 'No email on lead'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTestRecipientEmail(userProfile?.email || '')}
                      className={`p-2.5 text-xs rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                        isMyEmailSelected
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-medium shadow-sm ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                        👤 Send to My Email
                      </span>
                      <span className="text-[11px] truncate text-slate-500">{userProfile?.email || 'Admin email'}</span>
                    </button>
                  </div>

                  <div className="pt-1">
                    <Input 
                      type="email" 
                      placeholder="your.email@example.com"
                      value={testRecipientEmail}
                      onChange={(e) => setTestRecipientEmail(e.target.value)}
                      className="h-9 font-mono text-xs"
                    />
                  </div>

                  {isActualLeadSelected ? (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[11px] text-amber-800 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Direct Lead Dispatch:</strong> This test email will be sent directly to the actual lead's inbox (<u>{actualLeadEmail}</u>).
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">The test email will be sent directly to this target address.</p>
                  )}
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTestModalOpen(false)} disabled={sendingTest}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendTestEmail} 
              disabled={sendingTest || !testRecipientEmail || !selectedStepId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              {sendingTest ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Dispatching...</>
              ) : (
                <><Send className="h-4 w-4" /> Dispatch Test Email</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
