'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Lead, Activity, LeadStatus, Playbook } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from './ui/loader'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Info, BookOpen, ThumbsUp, Clock, XCircle, AlertTriangle, ChevronDown, ChevronRight, ChevronLeft, Folder, FileText, Check, Mail } from 'lucide-react'
import { logCallActivity, logActivity, addTaskToLead } from '@/services/firebase'
import { sendFieldSalesOutcomeToNetSuite } from '@/services/netsuite-field-sales-proxy'
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore'
import { firestore as db } from '@/lib/firebase'
import { sendSms } from '@/services/sms-service'
import { Checkbox } from '@/components/ui/checkbox'
import { VisualIframeEditor } from '@/components/ui/visual-iframe-editor'

const formSchema = z.object({
  outcome: z.string().min(1, 'An outcome is required.'),
  notes: z.string().optional(),
  targetEmail: z.string().optional(),
  targetPhone: z.string().optional(),
  followUpPeriod: z.string().optional(),
  followUpDate: z.string().optional(),
  callBackDateTime: z.string().optional(),
  sendEmail: z.boolean().optional(),
  sendSms: z.boolean().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().optional(),
}).refine(data => {
  if (data.outcome === 'Qualified - Call Back/Send Info') {
    return !!data.callBackDateTime && data.callBackDateTime.trim() !== '';
  }
  return true;
}, {
  message: 'Date and time is mandatory for Qualified - Call Back/Send Info.',
  path: ['callBackDateTime'],
});

interface PostCallOutcomeDialogProps {
  lead: Lead
  callActivity?: Activity | null
  isOpen: boolean
  onClose: () => void
  onOutcomeLogged: (newStatus?: LeadStatus, outcome?: string) => void
  onSessionNext?: () => void;
  isSessionActive?: boolean;
  processMode?: boolean;
  initialOutcome?: string;
}

type SubmissionStatus = 'idle' | 'saving_outcome' | 'complete' | 'error';

const outcomeGroups = {
  "Positive / Progressing": [
    'Register Now',
    'Appointment Booked',
    'Email Interested',
    'Qualified - Call Back/Send Info'
  ],
  "Follow-up / Ongoing": [
    'Call Back/Follow-up',
    'Email Brush-Off',
    'Gatekeeper',
    'No Answer',
    'Prospect - No Access/No Contact',
    'Voicemail',
    'Future Follow-up'
  ],
  "Lost / Disqualified": [
    'Disconnected',
    'DNC - Stop List',
    'Empty / Closed',
    'LOST - No Contact',
    'LOST - No Response',
    'Lost - Out of Territory',
    'LOST - Duplicate',
    'LOST - Existing Customer',
    'Not a Fit',
    'Not Interested',
    'Unqualified Opportunity',
    'Wrong Number'
  ]
};

const isLpoExemptOutcome = (selectedOutcome: string) => {
  if (!selectedOutcome) return false;
  const normalized = selectedOutcome.trim().toLowerCase();
  return (
    normalized === 'lost - no answer' ||
    normalized === 'no answer' ||
    normalized === 'wrong number' ||
    normalized === 'disconnected' ||
    normalized === 'lost - no contact'
  );
};

const outcomeStructure = [
  {
    name: "Positive / Progressing",
    colorClass: "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/30 dark:bg-emerald-950/5",
    headerColor: "text-emerald-700 dark:text-emerald-400",
    icon: ThumbsUp,
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    subgroups: [
      {
        name: "Progressing",
        items: [
          'Register Now',
          'Appointment Booked',
          'Email Interested',
          'Qualified - Call Back/Send Info'
        ]
      }
    ]
  },
  {
    name: "Follow-up / Ongoing",
    colorClass: "border-blue-200 bg-blue-50/20 dark:border-blue-900/30 dark:bg-blue-950/5",
    headerColor: "text-blue-700 dark:text-blue-400",
    icon: Clock,
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    subgroups: [
      {
        name: "Scheduled Follow-up",
        items: ['Call Back/Follow-up', 'Email Brush-Off', 'Future Follow-up']
      },
      {
        name: "No Contact",
        items: ['Gatekeeper', 'No Answer', 'Prospect - No Access/No Contact', 'Voicemail']
      }
    ]
  },
  {
    name: "Lost / Disqualified",
    colorClass: "border-rose-200 bg-rose-50/20 dark:border-rose-900/30 dark:bg-rose-950/5",
    headerColor: "text-rose-700 dark:text-rose-400",
    icon: XCircle,
    badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
    subgroups: [
      {
        name: "Refusal & Fit",
        items: ['Not Interested', 'Not a Fit', 'Unqualified Opportunity', 'DNC - Stop List']
      },
      {
        name: "Contact Issues",
        items: ['Disconnected', 'Wrong Number', 'LOST - No Response', 'LOST - No Contact']
      },
      {
        name: "Data & Operations",
        items: ['LOST - Duplicate', 'LOST - Existing Customer', 'Lost - Out of Territory', 'Empty / Closed']
      }
    ]
  }
];



export function PostCallOutcomeDialog({ lead, callActivity, isOpen, onClose, onOutcomeLogged, onSessionNext, isSessionActive, processMode = false, initialOutcome = '' }: PostCallOutcomeDialogProps) {
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [submissionState, setSubmissionState] = useState<SubmissionStatus>('idle');
  const [firebaseDuration, setFirebaseDuration] = useState<number | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [uniqueEmails, setUniqueEmails] = useState<{email: string, label: string, name: string}[]>([]);
  const [uniquePhones, setUniquePhones] = useState<{phone: string, label: string, name: string}[]>([]);
  const [accountManagerEmail, setAccountManagerEmail] = useState('');
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outcome: '',
      notes: '',
      targetEmail: '',
      targetPhone: '',
      followUpPeriod: '6_months',
      followUpDate: '',
      sendEmail: true,
      sendSms: true,
      cc: '',
      bcc: '',
      subject: '',
    },
  });
  
  const outcome = form.watch('outcome');
  const followUpPeriod = form.watch('followUpPeriod');
  const targetPhone = form.watch('targetPhone');

  const getSmsPreview = () => {
    const targetPhoneObj = uniquePhones.find(p => p.phone === targetPhone);
    const contactNameFull = targetPhoneObj ? (targetPhoneObj.name === lead.companyName ? 'there' : targetPhoneObj.name) : 'there';
    const contactFirstName = contactNameFull === 'there' ? 'there' : contactNameFull.split(' ')[0];
    const displayName = userProfile?.displayName || user?.displayName || 'your MailPlus rep';
    const userPhone = userProfile?.phoneNumber || 'my number';
    return `Hi ${contactFirstName}, thanks for your interest in MailPlus. I'm ${displayName}. I just tried to call you for a quick chat. Save my number ${userPhone} and call me back, or text me your best day/time for a call. We've got great solutions and prices I think you'll love. Please respond to my number (not this one). Thank you, ${displayName}.`;
  };

  // Cancellation hierarchy selector states
  const [cancellationThemes, setCancellationThemes] = useState<any[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');
  const [selectedWhyId, setSelectedWhyId] = useState<string>('');
  const [selectedReasonId, setSelectedReasonId] = useState<string>('');

  // Email Interested template states
  const [marketingTemplates, setMarketingTemplates] = useState<{ id: string; name: string; subject?: string; body?: string; campaignId?: string }[]>([]);
  const [marketingCampaigns, setMarketingCampaigns] = useState<{ id: string; name: string; templateId?: string; emailTemplateIds?: string[] }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [editableEmailBody, setEditableEmailBody] = useState<string>('');
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<Record<string, boolean>>({});
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState<boolean>(false);

  // Group templates by campaign container
  const groupedTemplates = useMemo(() => {
    const groups: { campaignId: string; campaignName: string; templates: any[] }[] = [];
    
    marketingCampaigns.forEach(camp => {
      const campName = (camp.name || '').toLowerCase();
      if (campName.includes('sales quotes') || campName.includes('quotes & sign up')) {
        return;
      }

      const campTemplates = marketingTemplates.filter(t => camp.templateId === t.id || camp.emailTemplateIds?.includes(t.id) || t.campaignId === camp.id);
      if (campTemplates.length > 0) {
        groups.push({
          campaignId: camp.id,
          campaignName: camp.name || 'Unnamed Campaign',
          templates: campTemplates,
        });
      }
    });
    
    const linkedTemplateIds = new Set([
      ...marketingCampaigns.map(c => c.templateId),
      ...marketingCampaigns.flatMap(c => c.emailTemplateIds || []),
      ...marketingTemplates.filter(t => t.campaignId).map(t => t.id)
    ]);
    const unlinkedTemplates = marketingTemplates.filter(t => !linkedTemplateIds.has(t.id));
    if (unlinkedTemplates.length > 0) {
      groups.push({
        campaignId: 'unlinked',
        campaignName: 'General / Unlinked Templates',
        templates: unlinkedTemplates,
      });
    }
    
    return groups;
  }, [marketingTemplates, marketingCampaigns]);

  // Local LPO questions states
  const [hasMyPostBusinessAccount, setHasMyPostBusinessAccount] = useState<'Yes' | 'No' | ''>('');
  const [parcelVolumeGreaterThan20, setParcelVolumeGreaterThan20] = useState<'Yes' | 'No' | ''>('');

  const resetAndClose = () => {
    onClose();
  };

  // Fetch cancellation hierarchy
  useEffect(() => {
    async function fetchHierarchy() {
      try {
        const snap = await getDocs(collection(db, 'cancellation_hierarchy'));
        setCancellationThemes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error fetching hierarchy:", e);
      }
    }
    if (isOpen) {
      fetchHierarchy();
    }
  }, [isOpen]);

  // Handle outcome auto-mapping
  useEffect(() => {
    if (!outcome) return;
    async function triggerAutoMap() {
      const { autoMapLostOutcome } = await import('@/lib/cancellation-reasons-mapper');
      const match = autoMapLostOutcome(outcome);
      if (match) {
        setSelectedThemeId(match.themeId);
        setSelectedWhyId(match.whyId);
        setSelectedReasonId(match.reasonId);
      } else {
        // Reset if it's not a pre-mapped lost outcome but is still in the lost group
        const isLost = outcomeGroups["Lost / Disqualified"].includes(outcome);
        if (!isLost) {
          setSelectedThemeId('');
          setSelectedWhyId('');
          setSelectedReasonId('');
        }
      }
    }
    triggerAutoMap();
  }, [outcome]);

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSubmissionState('idle');
      setWizardStep(1);
      setFirebaseDuration(null);
      setSyncMessage(null);
      setSelectedThemeId('');
      setSelectedWhyId('');
      setSelectedReasonId('');
      setSelectedTemplateId('');
      setEditableEmailBody('');
      setHasMyPostBusinessAccount('');
      setParcelVolumeGreaterThan20('');
    } else {
        setWizardStep(initialOutcome ? 2 : 1);
        setHasMyPostBusinessAccount(lead?.hasMyPostBusinessAccount || '');
        setParcelVolumeGreaterThan20(lead?.parcelVolumeGreaterThan20 || '');
        form.reset({
            outcome: initialOutcome || '',
            notes: callActivity?.notes || '',
            targetEmail: '',
            targetPhone: '',
            sendEmail: true,
            sendSms: true,
            cc: '',
            bcc: '',
            subject: '',
        });
        
        // Fetch playbook for the current stage
        const fetchPlaybook = async () => {
          if (!lead.status) return;
          try {
             const pbRef = collection(db, 'playbooks');
             const q = query(pbRef, where('stage', '==', lead.status));
             const snapshot = await getDocs(q);
             if (!snapshot.empty) {
               setPlaybook({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Playbook);
             } else {
               setPlaybook(null);
             }
          } catch (e) {
            console.error('Error fetching playbook', e);
          }
        };
        fetchPlaybook();
    }
  }, [isOpen, callActivity, form, lead.status]);

  const compilePlaceholders = useCallback((text: string) => {
    if (!text) return '';
    let result = text;
    
    const primaryContact = lead.contacts?.find((c: any) => c.isPrimary) || lead.contacts?.[0];
    const contactName = primaryContact?.name || lead.companyName || 'Valued Customer';
    const contactFirstName = primaryContact?.firstName || contactName.split(' ')[0] || contactName;

    const salesRep = lead.salesRepAssigned || userProfile?.displayName || userProfile?.name || 'MailPlus Representative';
    const franchiseeName = lead.franchisee || userProfile?.franchisee || 'MailPlus';

    const companyName = lead.companyName || 'your company';
    const city = lead.address?.city || lead.city || '';

    const bookingLink = lead.bookingUrlId ? `https://prospectplus.com.au/book/${lead.bookingUrlId}` : '';
    const generalBookingLink = lead.generalBookingUrlId ? `https://prospectplus.com.au/book/${lead.generalBookingUrlId}` : '';
    const scfLink = lead.dynamicScfUrl || (lead.id ? `https://prospectplus.com.au/scf/${lead.id}` : '');
    const sofLink = lead.standingOrderFormLink || (lead.id ? `https://prospectplus.com.au/sof/${lead.id}` : '');
    const regLink = (lead as any).localMileRegistrationLink || (lead.id ? `https://prospectplus.com.au/localmile-registration/${lead.id}` : '');
    const actLink = (lead as any).localMileActivationLink || '';

    result = result
      .replace(/\{\{Contact\.Name\}\}/gi, contactName)
      .replace(/\{\{Contact\.FirstName\}\}/gi, contactFirstName)
      .replace(/\{\{Company\.Name\}\}/gi, companyName)
      .replace(/\{\{SalesRep\.Name\}\}/gi, salesRep)
      .replace(/\{\{Franchisee\.Name\}\}/gi, franchiseeName)
      .replace(/\{\{Franchisee\.MainContact\}\}/gi, (lead as any).franchiseeMainContact || franchiseeName)
      .replace(/\{\{Franchisee\.ContactName\}\}/gi, (lead as any).franchiseeMainContact || franchiseeName)
      .replace(/\{\{Franchisee\.Email\}\}/gi, (lead as any).franchiseeEmail || 'sales@mailplus.com.au')
      .replace(/\{\{Franchisee\.Mobile\}\}/gi, (lead as any).franchiseeMobile || '')
      .replace(/\{\{AccountManager\.Name\}\}/gi, lead.accountManagerAssigned || salesRep)
      .replace(/\{\{AccountManager\.Mobile\}\}/gi, (lead as any).accountManagerMobile || '')
      .replace(/\{\{AccountManager\.Calendly\}\}/gi, (lead as any).salesRepAssignedCalendlyLink || '')
      .replace(/\{\{Lead\.ContactBookingLink\}\}/gi, bookingLink)
      .replace(/\{\{Lead\.GeneralBookingLink\}\}/gi, generalBookingLink)
      .replace(/\{\{Lead\.City\}\}/gi, city)
      .replace(/\{\{Trials\.Remaining\}\}/gi, ((lead as any).localMileTrialsRemaining || 0).toString())
      .replace(/\{\{Lead\.SCFLink\}\}/gi, scfLink)
      .replace(/\{\{Prospect\.ProspectPlusID\}\}/gi, lead.prospectPlusId || lead.id || '')
      .replace(/\{\{prospect_plus_id\}\}/gi, lead.prospectPlusId || lead.id || '')
      .replace(/\{\{Lead\.LocalMileRegistrationLink\}\}/gi, regLink)
      .replace(/\{\{Lead\.LocalMileActivationLink\}\}/gi, actLink)
      .replace(/\{\{LocalMileActivationLink\}\}/gi, actLink)
      .replace(/\{\{Contact\.LocalMileActivationLink\}\}/gi, actLink)
      .replace(/\{\{Lead\.StandingOrderFormLink\}\}/gi, sofLink)
      .replace(/\{\{Lead\.SOFLink\}\}/gi, sofLink)
      .replace(/\{\{Lead\.StandingOrderLink\}\}/gi, sofLink)
      .replace(/\{\{Schedule\.ServiceDate\}\}/gi, (lead as any).scheduledServiceDate || '')
      .replace(/\{\{Schedule\.ScheduledServiceDate\}\}/gi, (lead as any).scheduledServiceDate || '');

    return result;
  }, [lead, userProfile]);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const found = marketingTemplates.find(t => t.id === templateId);
    if (found) {
      if (found.subject) {
        form.setValue('subject', compilePlaceholders(found.subject));
      }
      const bodyContent = found.body || (found as any).html || (found as any).content || (found as any).templateHtml || '';
      if (bodyContent) {
        setEditableEmailBody(compilePlaceholders(bodyContent));
      }
    } else if (templateId) {
      getDoc(doc(db, 'marketing_templates', templateId)).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.subject) form.setValue('subject', compilePlaceholders(data.subject));
          const bodyContent = data?.body || data?.html || data?.content || data?.templateHtml || '';
          if (bodyContent) setEditableEmailBody(compilePlaceholders(bodyContent));
        }
      }).catch(console.error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    async function fetchTemplatesAndCampaigns() {
      try {
        const [templatesSnap, campaignsSnap] = await Promise.all([
          getDocs(collection(db, 'marketing_templates')),
          getDocs(collection(db, 'marketing_campaigns'))
        ]);
        const loadedTemplates = templatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setMarketingTemplates(loadedTemplates);
        setMarketingCampaigns(campaignsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));

        // If template ID was already selected or defaulted, apply it now with loaded templates
        if (selectedTemplateId) {
          const found = loadedTemplates.find(t => t.id === selectedTemplateId);
          if (found) {
            if (found.subject) form.setValue('subject', compilePlaceholders(found.subject));
            const bodyContent = found.body || found.html || found.content || found.templateHtml || '';
            if (bodyContent) setEditableEmailBody(compilePlaceholders(bodyContent));
          }
        }
      } catch (e) {
        console.error("Error fetching marketing templates or campaigns", e);
      }
    }
    fetchTemplatesAndCampaigns();
  }, [isOpen, selectedTemplateId, compilePlaceholders, form]);

  useEffect(() => {
    if (!isOpen || (outcome !== 'Email Interested' && outcome !== 'Email Brush-Off' && outcome !== 'Email Brush Off')) return;
    const activeRole = userProfile?.activeRole;
    if (activeRole === 'user' || !selectedTemplateId) {
      applyTemplate('ZNI8yZ4PP5Q7UawHhbZh');
    }
  }, [isOpen, outcome]);

  useEffect(() => {
    async function fetchTemplateSubject() {
      if (!isOpen || !outcome) return;
      
      if (outcome === 'LOST - No Response') {
        try {
          const docRef = doc(db, 'marketing_templates', 'IxIOJNAExBaWNsnKfHs0');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const subj = docSnap.data()?.subject || 'Outbound Update';
            form.setValue('subject', compilePlaceholders(subj));
          }
        } catch (e) {
          console.error("Error fetching No Response template subject:", e);
        }
      } else if (outcome === 'Lost - Out of Territory') {
        try {
          const templatesRef = collection(db, 'marketing_templates');
          const q = query(templatesRef, where('name', '==', 'Sales - Out of Territory'));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const subj = querySnapshot.docs[0].data()?.subject || 'Outbound Update';
            form.setValue('subject', compilePlaceholders(subj));
          }
        } catch (e) {
          console.error("Error fetching Out of Territory template subject:", e);
        }
      }
    }
    fetchTemplateSubject();
  }, [isOpen, outcome, form, compilePlaceholders]);

  useEffect(() => {
    if (!isOpen) return;
    const emails = [];
    if (lead.customerServiceEmail) {
        emails.push({ email: lead.customerServiceEmail, label: 'Company Email', name: lead.companyName });
    }
    lead.contacts?.forEach(c => {
        if (c.email) {
            emails.push({ email: c.email, label: c.name || 'Contact', name: c.name || 'Valued Customer' });
        }
    });
    const unique = Array.from(new Map(emails.map(item => [item.email.toLowerCase(), item])).values());
    setUniqueEmails(unique);
    
    if (unique.length === 1 && !form.getValues('targetEmail')) {
        form.setValue('targetEmail', unique[0].email);
    }

    const resolveAmEmail = async () => {
      const amAssigned = lead?.accountManagerAssigned;
      if (!amAssigned) {
        setAccountManagerEmail('');
        return;
      }
      try {
        const usersRef = collection(db, 'users');
        // Try displayName
        const qDisplayName = query(usersRef, where('displayName', '==', amAssigned));
        const snapDisplayName = await getDocs(qDisplayName);
        if (!snapDisplayName.empty && snapDisplayName.docs[0].data()?.email) {
          setAccountManagerEmail(snapDisplayName.docs[0].data().email);
          return;
        }
        // Check all docs
        const qAll = query(usersRef);
        const snapAll = await getDocs(qAll);
        const name = amAssigned.toLowerCase();
        const found = snapAll.docs.find(d => {
          const data = d.data();
          const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim().toLowerCase();
          const dispName = (data.displayName || '').toLowerCase();
          const emailName = (data.email || '').split('@')[0].toLowerCase();
          return fullName === name || dispName === name || emailName === name || d.id === amAssigned;
        });
        if (found && found.data()?.email) {
          setAccountManagerEmail(found.data().email);
        } else {
          setAccountManagerEmail('');
        }
      } catch (error) {
        console.error("Error resolving AM email", error);
      }
    };
    resolveAmEmail();

    const phones: {phone: string, label: string, name: string}[] = [];
    if (lead.customerPhone) {
        phones.push({ phone: lead.customerPhone, label: 'Company Phone', name: lead.companyName });
    }
    lead.contacts?.forEach(c => {
        if (c.phone) {
            phones.push({ phone: c.phone, label: c.name || 'Contact', name: c.name || 'there' });
        }
    });
    const uniqueP = Array.from(new Map(phones.map(item => [item.phone, item])).values());
    setUniquePhones(uniqueP);
    
    if (uniqueP.length === 1 && !form.getValues('targetPhone')) {
        form.setValue('targetPhone', uniqueP[0].phone);
    }
  }, [isOpen, lead, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'Could not identify the current user.',
        });
        return;
    }

    const isLostOutcome = outcomeGroups["Lost / Disqualified"].includes(values.outcome);
    if (userProfile?.activeRole === 'user' && isLostOutcome && !isLpoExemptOutcome(values.outcome)) {
        if (!hasMyPostBusinessAccount || !parcelVolumeGreaterThan20) {
            toast({
                variant: 'destructive',
                title: 'Local LPO Details Required',
                description: 'You must answer both Local LPO questions (MyPost Business Account and Parcel Volume > 20 per day) before logging a Lost outcome.',
            });
            return;
        }
    }

    if ((values.outcome === 'LOST - No Response' || values.outcome === 'Lost - Out of Territory') && values.sendEmail && uniqueEmails.length > 0 && !values.targetEmail) {
        form.setError('targetEmail', { type: 'manual', message: 'Please select an email address.' });
        return;
    }

    if (values.outcome === 'No Answer' && values.sendSms && uniquePhones.length > 0 && !values.targetPhone) {
        form.setError('targetPhone', { type: 'manual', message: 'Please select a phone number.' });
        return;
    }
    
    setFirebaseDuration(null);
    setSubmissionState('saving_outcome');

    try {
        const firebaseStartTime = performance.now();
        
        // 1. Sync outcome with NetSuite unconditionally
        const nsResult = await sendFieldSalesOutcomeToNetSuite({
            leadId: lead.id,
            outcome: values.outcome,
            linkedSalesRep: lead.salesRepAssigned || 'Unassigned',
            processedBy: user.displayName || lead.dialerAssigned || 'Unknown'
        });
        
        if (nsResult.success) {
            setSyncMessage("Successfully synced with NetSuite.");
        } else {
            setSyncMessage(`Note: Data saved locally but NetSuite sync failed: ${nsResult.message}`);
        }

        // 2. Log to Firebase
        const newStatus = await logCallActivity(
            lead.id,
            {
                outcome: values.outcome,
                notes: values.notes || '',
                author: user.displayName || 'Unknown',
                salesRecordInternalId: lead.salesRecordInternalId,
            }
        );

        // Save hierarchy fields if a theme has been selected (automatically or manually)
        const isLost = outcomeGroups["Lost / Disqualified"].includes(values.outcome);
        if (isLost && selectedThemeId) {
            const selectedThemeObj = cancellationThemes.find(t => t.id === selectedThemeId);
            const selectedWhyObj = selectedThemeObj?.whys?.find((w: any) => w.id === selectedWhyId);
            const selectedReasonObj = selectedWhyObj?.reasons?.find((r: any) => r.id === selectedReasonId);

            await updateDoc(doc(db, 'leads', lead.id), {
                cancellationTheme: selectedThemeObj?.name || '',
                cancellationThemeId: selectedThemeId,
                cancellationCategory: selectedWhyObj?.name || '',
                cancellationWhyId: selectedWhyId,
                cancellationReason: selectedReasonObj?.name || '',
                cancellationReasonId: selectedReasonId,
                cancellationdate: new Date().toISOString().split('T')[0]
            });
        }

        // Save Local LPO answers if populated
        if (hasMyPostBusinessAccount || parcelVolumeGreaterThan20) {
            await updateDoc(doc(db, 'leads', lead.id), {
                hasMyPostBusinessAccount: hasMyPostBusinessAccount || lead.hasMyPostBusinessAccount || 'No',
                parcelVolumeGreaterThan20: parcelVolumeGreaterThan20 || lead.parcelVolumeGreaterThan20 || 'No'
            });
        }
        
        const firebaseEndTime = performance.now();
        setFirebaseDuration((firebaseEndTime - firebaseStartTime) / 1000);

        // Special handling for Qualified - Call Back/Send Info & Call Back/Follow-up
        if ((values.outcome === 'Qualified - Call Back/Send Info' || values.outcome === 'Call Back/Follow-up') && values.callBackDateTime) {
            const callBackIso = new Date(values.callBackDateTime).toISOString();
            const actionText = values.outcome === 'Qualified - Call Back/Send Info' ? 'Call Back / Send Info' : 'Call Back / Follow-up';
            
            await updateDoc(doc(db, 'leads', lead.id), { 
                followUpDate: callBackIso,
                nextBestAction: actionText
            });

            await addTaskToLead(lead.id, {
                title: actionText,
                dueDate: callBackIso,
                author: user.displayName || 'System'
            });
        }

        // Special handling for Future Follow-up
        if (values.outcome === 'Future Follow-up') {
            const period = values.followUpPeriod || '6_months';
            const d = new Date();
            if (period === '1_month') {
                d.setMonth(d.getMonth() + 1);
            } else if (period === '3_months') {
                d.setMonth(d.getMonth() + 3);
            } else if (period === '6_months') {
                d.setMonth(d.getMonth() + 6);
            } else if (period === 'custom' && values.followUpDate) {
                const customD = new Date(values.followUpDate);
                if (!isNaN(customD.getTime())) {
                    d.setTime(customD.getTime());
                } else {
                    d.setMonth(d.getMonth() + 6);
                }
            } else {
                d.setMonth(d.getMonth() + 6);
            }
            const followUpIso = d.toISOString();
            
            await updateDoc(doc(db, 'leads', lead.id), { 
                followUpDate: followUpIso,
                customerStatus: 'Future Follow-up' 
            });

            await addTaskToLead(lead.id, {
                title: `Future Follow-up: Re-contact Lead`,
                dueDate: followUpIso,
                author: user.displayName || 'System'
            });
        }

        // 3. Special handling for Email Interested & Email Brush-Off
        if ((values.outcome === 'Email Interested' || values.outcome === 'Email Brush-Off' || values.outcome === 'Email Brush Off') && values.sendEmail) {
            const targetEmail = values.targetEmail;
            const targetEmailObj = uniqueEmails.find(e => e.email === targetEmail);
            const contactName = targetEmailObj ? targetEmailObj.name : '';

            if (targetEmail) {
                try {
                    const response = await fetch('/api/campaigns/send-direct', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            leadIds: [lead.id],
                            templateId: selectedTemplateId || 'ZNI8yZ4PP5Q7UawHhbZh',
                            targetEmail: targetEmail,
                            cc: values.cc || undefined,
                            bcc: values.bcc || undefined,
                            customSubject: values.subject || undefined,
                            customHtml: editableEmailBody || undefined,
                            customSenderEmail: userProfile?.activeRole === 'user' ? 'sales@mailplus.com.au' : (user?.email?.endsWith('@mailplus.com.au') ? user.email : undefined),
                            overrideContactName: contactName
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        console.error(`Failed to send ${values.outcome} email`, result.message);
                        toast({ variant: 'destructive', title: 'Email Error', description: result.message || 'Failed to send email.' });
                    } else {
                        toast({ title: 'Email Sent', description: `${values.outcome} email was sent successfully.` });
                    }
                } catch (e: any) {
                    console.error(`Error sending ${values.outcome} email:`, e);
                    toast({ variant: 'destructive', title: 'Email Error', description: e.message || 'Error sending email.' });
                }
            } else {
                toast({ variant: 'destructive', title: 'No Email Found', description: 'Could not find a valid email address to send the email to.' });
            }
        }

        // 3a. Special handling for LOST - No Response
        if (values.outcome === 'LOST - No Response' && values.sendEmail) {
            const targetEmail = values.targetEmail;
            const targetEmailObj = uniqueEmails.find(e => e.email === targetEmail);
            const contactName = targetEmailObj ? targetEmailObj.name : '';

            if (targetEmail) {
                try {
                    const response = await fetch('/api/campaigns/send-direct', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            leadIds: [lead.id],
                            templateId: 'IxIOJNAExBaWNsnKfHs0',
                            targetEmail: targetEmail,
                            cc: values.cc || undefined,
                            bcc: values.bcc || undefined,
                            customSubject: values.subject || undefined,
                            customSenderEmail: userProfile?.activeRole === 'user' ? 'sales@mailplus.com.au' : (user?.email?.endsWith('@mailplus.com.au') ? user.email : undefined),
                            overrideContactName: contactName
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        console.error('Failed to send LOST - No Response email', result.message);
                        toast({ variant: 'destructive', title: 'Email Error', description: result.message || 'Failed to send No Response email.' });
                    } else {
                        toast({ title: 'Email Sent', description: 'Lost - No Response email was automatically sent.' });
                    }
                } catch (e) {
                    console.error('Error sending direct email:', e);
                }
            } else {
                toast({ variant: 'destructive', title: 'No Email Found', description: 'Could not find a valid email address to send the No Response email to.' });
            }
        }

        // 3b. Special handling for Lost - Out of Territory
        if (values.outcome === 'Lost - Out of Territory' && values.sendEmail) {
            const targetEmail = values.targetEmail;
            const targetEmailObj = uniqueEmails.find(e => e.email === targetEmail);
            const contactName = targetEmailObj ? targetEmailObj.name : '';

            if (targetEmail) {
                try {
                    const templatesRef = collection(db, 'marketing_templates');
                    const q = query(templatesRef, where('name', '==', 'Sales - Out of Territory'));
                    const querySnapshot = await getDocs(q);
                    
                    if (querySnapshot.empty) {
                        console.error('Template "Sales - Out of Territory" not found.');
                        toast({ variant: 'destructive', title: 'Email Error', description: 'Template "Sales - Out of Territory" not found.' });
                    } else {
                        const templateId = querySnapshot.docs[0].id;
                        const response = await fetch('/api/campaigns/send-direct', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                leadIds: [lead.id],
                                templateId: templateId,
                                targetEmail: targetEmail,
                                cc: values.cc || undefined,
                                bcc: values.bcc || undefined,
                                customSubject: values.subject || undefined,
                                customSenderEmail: userProfile?.activeRole === 'user' ? 'sales@mailplus.com.au' : (user?.email?.endsWith('@mailplus.com.au') ? user.email : undefined),
                                overrideContactName: contactName
                            })
                        });
                        const result = await response.json();
                        if (!result.success) {
                            console.error('Failed to send Sales - Out of Territory email', result.message);
                            toast({ variant: 'destructive', title: 'Email Error', description: result.message || 'Failed to send Out of Territory email.' });
                        } else {
                            toast({ title: 'Email Sent', description: 'Sales - Out of Territory email was automatically sent.' });
                        }
                    }
                } catch (e: any) {
                    console.error('Error sending direct email:', e);
                    toast({ variant: 'destructive', title: 'Email Error', description: e.message || 'Error querying template or sending email.' });
                }
            } else {
                toast({ variant: 'destructive', title: 'No Email Found', description: 'Could not find a valid email address to send the email to.' });
            }
        }

        // 4. Special handling for No Answer (SMS)
        if (values.outcome === 'No Answer' && values.sendSms) {
            const targetPhone = values.targetPhone;
            const targetPhoneObj = uniquePhones.find(p => p.phone === targetPhone);
            const contactNameFull = targetPhoneObj ? (targetPhoneObj.name === lead.companyName ? 'there' : targetPhoneObj.name) : 'there';
            const contactFirstName = contactNameFull === 'there' ? 'there' : contactNameFull.split(' ')[0];
            
            if (targetPhone) {
                const displayName = userProfile?.displayName || user.displayName || 'your MailPlus rep';
                const userPhone = userProfile?.phoneNumber || 'my number';
                const smsMessage = `Hi ${contactFirstName}, thanks for your interest in MailPlus. I'm ${displayName}. I just tried to call you for a quick chat. Save my number ${userPhone} and call me back, or text me your best day/time for a call. We've got great solutions and prices I think you'll love. Please respond to my number (not this one). Thank you, ${displayName}.`;
                
                try {
                    const smsResult = await sendSms(targetPhone, smsMessage);
                    if (smsResult.success) {
                        toast({ title: 'SMS Sent', description: 'Automatic No Answer SMS was sent.' });
                        await logActivity(lead.id, {
                            type: 'Update',
                            notes: `Automatic SMS sent to ${targetPhone} (${contactNameFull}) on 'No Answer'.`,
                            author: user.displayName || 'System'
                        });
                    } else {
                        toast({ variant: 'destructive', title: 'SMS Failed', description: smsResult.message || 'Failed to send No Answer SMS.' });
                    }
                } catch (e: any) {
                    console.error('Error sending SMS:', e);
                    toast({ variant: 'destructive', title: 'SMS Error', description: e.message || 'Error sending No Answer SMS.' });
                }
            } else if (uniquePhones.length > 0) {
                 toast({ variant: 'destructive', title: 'No Phone Selected', description: 'Could not send the No Answer SMS.' });
            }
        }

        setSubmissionState('complete');
        onOutcomeLogged(newStatus, values.outcome); 

    } catch (error: any) {
        setSubmissionState('error');
        console.error("Failed to save call outcome:", error);
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Could not save the call outcome. Please try again.',
        });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) resetAndClose();
    }}>
      <DialogContent
        className="sm:max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
            if (submissionState !== 'idle' && submissionState !== 'error' && submissionState !== 'complete') {
                e.preventDefault();
            }
        }}
      >
        <DialogHeader>
          <DialogTitle>Stage Guidance & Outcome</DialogTitle>
          <DialogDescription>
            {lead.companyName} is currently in <strong>{lead.status}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        {submissionState === 'idle' || submissionState === 'error' ? (
          <div className="space-y-4">
             {playbook && (
               <div className="bg-primary/10 border border-primary/20 rounded-md p-4 text-sm mb-4">
                 <h4 className="font-semibold text-primary flex items-center gap-2 mb-2">
                   <BookOpen className="h-4 w-4" /> Playbook: {lead.status}
                 </h4>
                 <p className="text-muted-foreground mb-3">{playbook.script}</p>
                 
                 {playbook.mandatoryFields?.length > 0 && (
                   <div className="mb-2">
                     <span className="font-semibold">Must Cover: </span>
                     {playbook.mandatoryFields.join(', ')}
                   </div>
                 )}
                 {playbook.resources?.length > 0 && (
                   <div className="flex gap-2 text-xs">
                     <span className="font-semibold">Resources: </span>
                     {playbook.resources.map((r, i) => (
                       <a key={i} href={r.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                         {r.title}
                       </a>
                     ))}
                   </div>
                 )}
               </div>
             )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* 2-Step Progress Indicator Bar */}
                <div className="flex items-center justify-between border-b pb-3 mb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${wizardStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-emerald-100 text-emerald-800'}`}>
                      {wizardStep === 2 ? '✓' : '1'}
                    </div>
                    <span className={wizardStep === 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                      1. Select Outcome
                    </span>
                  </div>
                  <div className="h-0.5 w-12 bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${wizardStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-400'}`}>
                      2
                    </div>
                    <span className={wizardStep === 2 ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                      2. Outcome Details &amp; Send
                    </span>
                  </div>
                </div>

                {wizardStep === 1 ? (
                  /* STEP 1: SELECT OUTCOME */
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="outcome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Choose an outcome to proceed:
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              {outcomeStructure.map((group) => {
                                const GroupIcon = group.icon;
                                
                                const filteredSubgroups = group.subgroups.map(sub => {
                                  const visibleItems = sub.items.filter(o => {
                                    const activeRole = userProfile?.activeRole;

                                    if (activeRole === 'user') {
                                      const hiddenForUserRole = [
                                        'Lost - Out of Territory',
                                        'Voicemail',
                                        'LOST - Duplicate',
                                        'LOST - Existing Customer',
                                        'Future Follow-up'
                                      ];
                                      if (hiddenForUserRole.includes(o)) {
                                        return false;
                                      }
                                    }

                                    const exceptFieldSales = [
                                      'Busy',
                                      'Call Back/Follow-up',
                                      'Disconnected',
                                      'DNC - Stop List',
                                      'LOST - No Contact',
                                      'LOST - No Response',
                                      'No Answer',
                                      'Voicemail',
                                      'Wrong Number'
                                    ];
                                    const fieldSalesOnly = [
                                      'Empty / Closed',
                                      'Prospect - No Access/No Contact',
                                      'Unqualified Opportunity'
                                    ];

                                    if (o === 'Register Now' || o === 'Register') {
                                      return activeRole === 'admin' || activeRole === 'user';
                                    }
                                    if (exceptFieldSales.includes(o)) {
                                      return activeRole !== 'Field Sales';
                                    }
                                    if (fieldSalesOnly.includes(o)) {
                                      return activeRole === 'Field Sales' || activeRole === 'Field Sales Admin';
                                    }
                                    return true;
                                  });
                                  return { ...sub, visibleItems };
                                }).filter(sub => sub.visibleItems.length > 0);

                                if (filteredSubgroups.length === 0) return null;

                                return (
                                  <div 
                                    key={group.name} 
                                    className={`rounded-xl border p-3.5 shadow-sm transition-all ${group.colorClass}`}
                                  >
                                    <div className="flex items-center gap-2 mb-2.5">
                                      <GroupIcon className={`h-4 w-4 ${group.headerColor}`} />
                                      <h4 className={`text-xs font-semibold tracking-tight ${group.headerColor}`}>
                                        {group.name}
                                      </h4>
                                    </div>

                                    <div className="space-y-2.5">
                                      {filteredSubgroups.map((sub, idx) => (
                                        <div key={idx} className="space-y-1.5">
                                          {group.subgroups.length > 1 && (
                                            <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                              {sub.name}
                                            </h5>
                                          )}
                                          <div className="flex flex-wrap gap-1.5">
                                            {sub.visibleItems.map(o => {
                                              const isSelected = field.value === o;
                                              return (
                                                <button
                                                  key={o}
                                                  type="button"
                                                  onClick={() => {
                                                    field.onChange(o);
                                                    setWizardStep(2);
                                                  }}
                                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                                    isSelected 
                                                      ? 'bg-primary border-primary text-primary-foreground shadow-sm scale-[1.02]' 
                                                      : 'bg-background hover:bg-muted border-input text-foreground hover:scale-[1.01]'
                                                  }`}
                                                >
                                                  {o}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter className="mt-4 flex items-center justify-between sm:justify-between w-full">
                      <Button type="button" variant="outline" onClick={resetAndClose}>Cancel</Button>
                      <Button 
                        type="button" 
                        disabled={!outcome}
                        onClick={() => setWizardStep(2)}
                      >
                        Next: Log Details →
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  /* STEP 2: LOG DETAILS & SUBMIT */
                  <div className="space-y-4">
                    {/* Selected Outcome Top Banner */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-900 shadow-sm">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Selected Outcome:</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{outcome}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100/50 px-2 shrink-0 font-medium"
                        onClick={() => setWizardStep(1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Change
                      </Button>
                    </div>

                    {(outcome === 'LOST - No Response' || outcome === 'Lost - Out of Territory' || outcome === 'Email Interested' || outcome === 'Email Brush-Off' || outcome === 'Email Brush Off') && uniqueEmails.length > 0 && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="sendEmail"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3 bg-muted/40">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-xs font-medium cursor-pointer">
                                  {outcome === 'Lost - Out of Territory'
                                    ? "Send automatic 'Sales - Out of Territory' email"
                                    : outcome === 'Email Brush-Off' || outcome === 'Email Brush Off'
                                    ? "Send 'Email Brush-Off' template email"
                                    : outcome === 'Email Interested'
                                    ? "Send 'Email Interested' template email"
                                    : "Send automatic 'No Response' email"}
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        {form.watch('sendEmail') && (
                          <div className="space-y-4 border rounded-md p-3 bg-muted/20">
                            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-md border border-slate-200/80 text-xs">
                              <div className="flex items-center gap-2 truncate">
                                <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                                <span className="font-semibold text-slate-700 dark:text-slate-300">From Address:</span>
                                <span className="font-mono text-slate-900 dark:text-slate-100 font-medium truncate">
                                  {userProfile?.activeRole === 'user'
                                    ? 'sales@mailplus.com.au'
                                    : (user?.email?.endsWith('@mailplus.com.au') ? user.email : (user?.email || 'sales@mailplus.com.au'))}
                                </span>
                              </div>
                              {userProfile?.activeRole === 'user' && (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                                  Default Sender
                                </Badge>
                              )}
                            </div>

                            {(outcome === 'Email Interested' || outcome === 'Email Brush-Off' || outcome === 'Email Brush Off') && (
                              <div className="space-y-1.5">
                                <FormLabel className="text-xs font-semibold">Select Email Template</FormLabel>
                                <Popover open={isTemplateDropdownOpen} onOpenChange={setIsTemplateDropdownOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={isTemplateDropdownOpen}
                                      className="w-full justify-between bg-white text-xs h-9 font-normal border-slate-200"
                                    >
                                      <span className="truncate">
                                        {marketingTemplates.find(t => t.id === selectedTemplateId)?.name || "Select a template..."}
                                      </span>
                                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[440px] p-2 max-h-80 overflow-y-auto z-[9999]" align="start" onWheel={(e) => e.stopPropagation()}>
                                    <div className="space-y-1 text-xs">
                                      {groupedTemplates.map(group => {
                                        const isExpanded = !!expandedCampaignIds[group.campaignId];
                                        return (
                                          <div key={group.campaignId} className="border rounded-md overflow-hidden bg-slate-50/50">
                                            <button
                                              type="button"
                                              onClick={() => setExpandedCampaignIds(prev => ({ ...prev, [group.campaignId]: !prev[group.campaignId] }))}
                                              className="w-full flex items-center justify-between p-2 font-semibold text-slate-700 hover:bg-slate-100/80 transition-colors text-left"
                                            >
                                              <div className="flex items-center gap-1.5 truncate">
                                                {isExpanded ? (
                                                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                                ) : (
                                                  <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                                )}
                                                <Folder className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                <span className="truncate">{group.campaignName}</span>
                                              </div>
                                              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 shrink-0">
                                                {group.templates.length}
                                              </span>
                                            </button>

                                            {isExpanded && (
                                              <div className="divide-y border-t bg-white">
                                                {group.templates.map((t: any) => {
                                                  const isSelected = t.id === selectedTemplateId;
                                                  return (
                                                    <button
                                                      key={t.id}
                                                      type="button"
                                                      onClick={() => {
                                                        applyTemplate(t.id);
                                                        setIsTemplateDropdownOpen(false);
                                                      }}
                                                      className={`w-full flex items-center justify-between p-2 text-left hover:bg-blue-50/60 transition-colors ${
                                                        isSelected ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-700'
                                                      }`}
                                                    >
                                                      <div className="flex items-center gap-2 truncate">
                                                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate">{t.name}</span>
                                                      </div>
                                                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}

                            <FormField
                              control={form.control}
                              name="targetEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-semibold">
                                      {outcome === 'Lost - Out of Territory'
                                        ? "Send 'Sales - Out of Territory' Email To"
                                        : (outcome === 'Email Interested' || outcome === 'Email Brush-Off' || outcome === 'Email Brush Off')
                                        ? "Send Email To"
                                        : "Send 'No Response' Email To"}
                                    </FormLabel>
                                     {uniqueEmails.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] px-2"
                                        onClick={() => {
                                          const allEmails = uniqueEmails.map(e => e.email).join(', ');
                                          form.setValue('targetEmail', allEmails);
                                        }}
                                      >
                                        Select All Contacts
                                      </Button>
                                    )}
                                  </div>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter recipient email(s), comma separated"
                                      className="text-xs"
                                    />
                                  </FormControl>
                                  {uniqueEmails.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      {uniqueEmails.map(e => {
                                        const currentVal = form.getValues('targetEmail') || '';
                                        const isSelected = currentVal
                                          .split(',')
                                          .map(x => x.trim().toLowerCase())
                                          .includes(e.email.toLowerCase());
                                        return (
                                          <button
                                            key={e.email}
                                            type="button"
                                            onClick={() => {
                                              const emails = currentVal.split(',').map(x => x.trim()).filter(Boolean);
                                              const idx = emails.findIndex(x => x.toLowerCase() === e.email.toLowerCase());
                                              if (idx > -1) {
                                                emails.splice(idx, 1);
                                              } else {
                                                emails.push(e.email);
                                              }
                                              form.setValue('targetEmail', emails.join(', '));
                                            }}
                                            className={`px-2 py-1 text-[10px] font-medium rounded border transition-all ${
                                              isSelected
                                                ? 'bg-primary/10 border-primary/30 text-primary'
                                                : 'bg-background hover:bg-muted border-input text-muted-foreground'
                                            }`}
                                          >
                                            {isSelected ? '✓ ' : '+ '}
                                            {e.email} ({e.label})
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {(outcome === 'Email Interested' || outcome === 'Email Brush-Off' || outcome === 'Email Brush Off') && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Dynamic Placeholders</span>
                                <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border max-h-36 overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
                                  {[
                                    { label: 'Contact Name', placeholder: '{{Contact.Name}}' },
                                    { label: 'First Name', placeholder: '{{Contact.FirstName}}' },
                                    { label: 'Company Name', placeholder: '{{Company.Name}}' },
                                    { label: 'Sales Rep', placeholder: '{{SalesRep.Name}}' },
                                    { label: 'Franchisee', placeholder: '{{Franchisee.Name}}' },
                                    { label: 'Franchisee Contact Name', placeholder: '{{Franchisee.MainContact}}' },
                                    { label: 'Franchisee Email', placeholder: '{{Franchisee.Email}}' },
                                    { label: 'Franchisee Mobile', placeholder: '{{Franchisee.Mobile}}' },
                                    { label: 'Scheduled Service Date', placeholder: '{{Schedule.ServiceDate}}' },
                                    { label: 'Remaining Trials', placeholder: '{{Trials.Remaining}}' },
                                    { label: 'Prospect ID', placeholder: '{{Prospect.ProspectPlusID}}' },
                                    { label: 'AM Name', placeholder: '{{AccountManager.Name}}' },
                                    { label: 'AM Mobile', placeholder: '{{AccountManager.Mobile}}' },
                                    { label: 'AM Calendly', placeholder: '{{AccountManager.Calendly}}' },
                                    { label: 'Contact Booking Link', placeholder: '{{Lead.ContactBookingLink}}' },
                                    { label: 'General Booking Link', placeholder: '{{Lead.GeneralBookingLink}}' },
                                    { label: 'City', placeholder: '{{Lead.City}}' },
                                    { label: 'Public SCF Link', placeholder: '{{Lead.SCFLink}}' },
                                    { label: 'Standing Order Form Link', placeholder: '{{Lead.StandingOrderFormLink}}' },
                                    { label: 'LocalMile Registration Link', placeholder: '{{Lead.LocalMileRegistrationLink}}' },
                                    { label: 'LocalMile Activation Link', placeholder: '{{Lead.LocalMileActivationLink}}' },
                                    { label: 'Accept URL', placeholder: '{{acceptUrl}}' },
                                    { label: 'Receiver Name', placeholder: '{{Receiver.Name}}' },
                                    { label: 'Receiver Full Address', placeholder: '{{Receiver.FullAddress}}' },
                                    { label: 'Ticket Number', placeholder: '{{Ticket.Number}}' },
                                    { label: 'Tracking ID', placeholder: '{{Tracking.ID}}' },
                                    { label: 'Unsubscribe Link', placeholder: '{{unsubscribe_link}}' },
                                    { label: 'Service Table', placeholder: '{{Service.Table}}' },
                                    { label: 'Product Table', placeholder: '{{Product.Table}}' },
                                  ].map((ph) => (
                                    <button
                                      key={ph.placeholder}
                                      type="button"
                                      onClick={() => {
                                        const subjectInput = document.getElementById('outcome-email-subject-input') as HTMLInputElement;
                                        if (document.activeElement === subjectInput) {
                                          const start = subjectInput.selectionStart || 0;
                                          const end = subjectInput.selectionEnd || 0;
                                          const text = subjectInput.value;
                                          const before = text.substring(0, start);
                                          const after = text.substring(end, text.length);
                                          form.setValue('subject', before + ph.placeholder + after);
                                          setTimeout(() => {
                                            subjectInput.focus();
                                            subjectInput.setSelectionRange(start + ph.placeholder.length, start + ph.placeholder.length);
                                          }, 0);
                                        } else if (typeof window !== 'undefined' && (window as any).__iframeEditorInsert) {
                                          (window as any).__iframeEditorInsert(ph.placeholder);
                                        }
                                      }}
                                      className="text-[10px] font-medium bg-slate-50 text-slate-700 px-2 py-1 rounded border hover:bg-slate-100 transition-colors shadow-sm"
                                    >
                                      + {ph.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <FormField
                              control={form.control}
                              name="subject"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-semibold">Subject</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      id="outcome-email-subject-input"
                                      placeholder="Enter email subject"
                                      className="text-xs"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {(outcome === 'Email Interested' || outcome === 'Email Brush-Off' || outcome === 'Email Brush Off') && (
                              <div className="space-y-1.5">
                                <FormLabel className="text-xs font-semibold">Email Preview / Editor</FormLabel>
                                <div className="border rounded-md bg-white flex flex-col min-h-[350px] relative overflow-hidden">
                                  <VisualIframeEditor
                                    body={editableEmailBody}
                                    setBody={setEditableEmailBody}
                                    primaryColor="#095c7b"
                                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                    readOnly={false}
                                  />
                                </div>
                              </div>
                            )}

                            <FormField
                              control={form.control}
                              name="cc"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-semibold">CC</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter CC email(s), comma separated"
                                      className="text-xs"
                                    />
                                  </FormControl>
                                  <div className="flex gap-1.5 mt-1">
                                    {user?.email && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] px-2"
                                        onClick={() => {
                                          const current = form.getValues('cc') || '';
                                          const emails = current.split(',').map(x => x.trim()).filter(Boolean);
                                          const userEmail = user.email;
                                          if (userEmail && !emails.includes(userEmail)) {
                                            emails.push(userEmail);
                                            form.setValue('cc', emails.join(', '));
                                          }
                                        }}
                                      >
                                        + Add Me ({user.email})
                                      </Button>
                                    )}
                                    {accountManagerEmail && user?.email !== accountManagerEmail && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] px-2"
                                        onClick={() => {
                                          const current = form.getValues('cc') || '';
                                          const emails = current.split(',').map(x => x.trim()).filter(Boolean);
                                          if (!emails.includes(accountManagerEmail)) {
                                            emails.push(accountManagerEmail);
                                            form.setValue('cc', emails.join(', '));
                                          }
                                        }}
                                      >
                                        + Add AM ({accountManagerEmail})
                                      </Button>
                                    )}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="bcc"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-semibold">BCC</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter BCC email(s), comma separated"
                                      className="text-xs"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {outcome === 'No Answer' && uniquePhones.length > 0 && (
                      <div className="space-y-4 border p-4 rounded-lg bg-amber-50/40 border-amber-200">
                        <FormField
                          control={form.control}
                          name="sendSms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3 bg-white">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-xs font-semibold cursor-pointer">
                                  Send automatic 'Missed Call' SMS to prospect
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        {form.watch('sendSms') && (
                          <FormField
                            control={form.control}
                            name="targetPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold">Select Target Phone Number</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || uniquePhones[0]?.phone}>
                                  <FormControl>
                                    <SelectTrigger className="bg-white text-xs">
                                      <SelectValue placeholder="Select phone number" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {uniquePhones.map(p => (
                                        <SelectItem key={p.phone} value={p.phone}>
                                          {p.phone} ({p.label})
                                        </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {field.value && (
                                  <div className="mt-3 text-xs bg-muted/65 border border-border/80 rounded-md p-3 text-muted-foreground space-y-1.5">
                                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                                      <Info className="h-3.5 w-3.5 text-blue-500" />
                                      Automatic SMS will be sent:
                                    </span>
                                    <p className="italic bg-background/60 p-2.5 rounded border border-border/50 font-mono text-[11px] leading-relaxed">
                                      "{getSmsPreview()}"
                                    </p>
                                  </div>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )}
                    {outcome === 'No Answer' && uniquePhones.length === 0 && (
                       <p className="text-sm text-destructive">No phone numbers found for this lead. The automatic SMS will not be sent.</p>
                    )}

                    {(outcome === 'Qualified - Call Back/Send Info' || outcome === 'Call Back/Follow-up') && (
                      <div className="space-y-3 border p-4 rounded-lg bg-blue-50/40 border-blue-200">
                        <FormField
                          control={form.control}
                          name="callBackDateTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-blue-600" />
                                <span>
                                  Call Back Date &amp; Time{' '}
                                  {outcome === 'Qualified - Call Back/Send Info' ? (
                                    <span className="text-destructive">*</span>
                                  ) : (
                                    <span className="text-muted-foreground font-normal text-[11px]">(Optional)</span>
                                  )}
                                </span>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="datetime-local" 
                                  {...field} 
                                  className="bg-white text-xs"
                                />
                              </FormControl>
                              <p className="text-[11px] text-muted-foreground">
                                {outcome === 'Qualified - Call Back/Send Info'
                                  ? 'A task will automatically be created for this date & time to remind you when to call back.'
                                  : 'Optional: Select a date & time to automatically create a follow-up task reminder.'}
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {outcome === 'Future Follow-up' && (
                      <div className="space-y-4 border p-3 rounded-lg bg-slate-50/50">
                        <FormField
                          control={form.control}
                          name="followUpPeriod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Follow-up In</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select period" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="6_months">6 Months (Recommended)</SelectItem>
                                  <SelectItem value="3_months">3 Months</SelectItem>
                                  <SelectItem value="1_month">1 Month</SelectItem>
                                  <SelectItem value="custom">Custom Date</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {followUpPeriod === 'custom' && (
                          <FormField
                            control={form.control}
                            name="followUpDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Custom Follow-up Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )}

                    {outcomeGroups["Lost / Disqualified"].includes(outcome) && (
                      <div className="space-y-4 border p-4 rounded-lg bg-slate-50/50">
                        {userProfile?.activeRole === 'user' && (
                          <div className={`space-y-3 border p-3 rounded-md ${isLpoExemptOutcome(outcome) ? 'bg-slate-100/60 border-slate-200' : 'bg-amber-50/60 border-amber-200'}`}>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                              {!isLpoExemptOutcome(outcome) && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                              <span>{isLpoExemptOutcome(outcome) ? 'Local LPO Account Details (Optional)' : 'Mandatory Local LPO Account Details'}</span>
                            </div>
                            <p className="text-[11px] text-amber-800/90">
                              {isLpoExemptOutcome(outcome)
                                ? 'Answer both account questions if known:'
                                : 'Please answer both account questions before marking this lead as Lost:'}
                            </p>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-slate-700">
                                Existing MyPost Business Account?{!isLpoExemptOutcome(outcome) ? ' *' : ''}
                              </Label>
                              <Select value={hasMyPostBusinessAccount} onValueChange={(val: any) => setHasMyPostBusinessAccount(val)}>
                                <SelectTrigger className="bg-white text-xs h-8">
                                  <SelectValue placeholder="Select Yes / No" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Yes">Yes</SelectItem>
                                  <SelectItem value="No">No</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-slate-700">
                                Weekly parcel volume greater than 20?{!isLpoExemptOutcome(outcome) ? ' *' : ''}
                              </Label>
                              <Select value={parcelVolumeGreaterThan20} onValueChange={(val: any) => setParcelVolumeGreaterThan20(val)}>
                                <SelectTrigger className="bg-white text-xs h-8">
                                  <SelectValue placeholder="Select Yes / No" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Yes">Yes</SelectItem>
                                  <SelectItem value="No">No</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Loss Reason Theme</Label>
                          <Select value={selectedThemeId} onValueChange={(val) => {
                            setSelectedThemeId(val);
                            setSelectedWhyId('');
                            setSelectedReasonId('');
                          }}>
                            <SelectTrigger className="bg-white text-xs">
                              <SelectValue placeholder="Select Primary Theme" />
                            </SelectTrigger>
                            <SelectContent>
                              {cancellationThemes.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedThemeId && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Category / Why</Label>
                            <Select value={selectedWhyId} onValueChange={(val) => {
                              setSelectedWhyId(val);
                              setSelectedReasonId('');
                            }}>
                              <SelectTrigger className="bg-white text-xs">
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                              <SelectContent>
                                {cancellationThemes.find(t => t.id === selectedThemeId)?.whys?.map((w: any) => (
                                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {selectedWhyId && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Specific Reason</Label>
                            <Select value={selectedReasonId} onValueChange={(val) => setSelectedReasonId(val)}>
                              <SelectTrigger className="bg-white text-xs">
                                <SelectValue placeholder="Select Specific Reason" />
                              </SelectTrigger>
                              <SelectContent>
                                {cancellationThemes
                                  .find(t => t.id === selectedThemeId)?.whys
                                  ?.find((w: any) => w.id === selectedWhyId)?.reasons
                                  ?.map((r: any) => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold">Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Add any notes from the interaction..." {...field} className="text-xs min-h-[80px]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {submissionState === 'error' && (
                      <p className="text-sm text-destructive">An error occurred. Please try again.</p>
                    )}
                    
                    <DialogFooter className="mt-4 flex items-center justify-between sm:justify-between w-full">
                      <Button type="button" variant="outline" onClick={() => setWizardStep(1)}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                      <Button type="submit" disabled={form.formState.isSubmitting || !outcome}>
                        {form.formState.isSubmitting ? 'Processing...' : 'Save Outcome'}
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </form>
            </Form>
          </div>
        ) : (
            <div className="py-8">
                <ul className="space-y-4">
                    <li className="flex items-center justify-between gap-3">
                       <div className="flex items-center gap-3">
                         {submissionState === 'saving_outcome' ? <Loader /> : <CheckCircle className="h-5 w-5 text-green-500" />}
                        <div className="flex flex-col">
                            <span className={submissionState !== 'saving_outcome' ? 'text-muted-foreground font-medium' : 'font-medium'}>
                                Updating record...
                            </span>
                            {syncMessage && <span className="text-[10px] text-muted-foreground">{syncMessage}</span>}
                        </div>
                       </div>
                        {firebaseDuration !== null && <span className="text-xs text-muted-foreground">{firebaseDuration.toFixed(2)}s</span>}
                    </li>
                </ul>
                {submissionState === 'complete' && (
                     <DialogFooter className="mt-8 flex w-full items-center justify-end">
                        {isSessionActive && onSessionNext ? (
                            <Button onClick={onSessionNext}>Next in Session</Button>
                        ) : (
                            <Button variant="secondary" onClick={resetAndClose}>Done</Button>
                        )}
                     </DialogFooter>
                )}
            </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

