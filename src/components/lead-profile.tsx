'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  Calendar as CalendarIcon,
  Clipboard,
  Edit,
  Link as LinkIcon,
  PhoneCall,
  ListTodo,
  Route,
  History,
  XCircle,
  Move,
  Sparkles,
  Users,
  PlusCircle,
  ClipboardEdit,
  Trash2,
  CheckSquare,
  Star,
  Info,
  TrendingUp,
  Briefcase,
  Mail,
  Phone,
  Search,
  SkipForward,
  MapPin,
  Inbox,
  Key,
  Hash,
  Tag,
  Globe,
  User,
  MoreHorizontal,
  Activity as ActivityIcon,
  RefreshCw,
  MessageSquare,
  ListFilter,
  Package,
  AlertCircle,
  Check,
  Clock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import type { Lead, Contact, Activity, Note, Transcript, Task, DiscoveryData, Appointment, Address, LeadStatus, VisitNote, CompanyInsight, UserProfile } from '@/lib/types'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import { generateNextBestAction } from '@/ai/flows/next-best-action'
import { gatherCompanyInsights } from '@/ai/flows/gather-company-insights'
import { sendUpsellToNetSuite } from '@/services/netsuite-upsell-proxy'
import { logActivity, updateLeadAvatar, updateLeadStatus, getLeadFromFirebase, addTaskToLead, updateTaskCompletion, updateLeadDiscoveryData, logCallActivity, deleteLead, getLastNote, getLastActivity, updateLeadFieldSales, updateLeadDetails, updateContactInLead, updateLeadNextBestAction, deleteContactFromLead, getScfRecords, logBucketChange, addCompanyInsight, logUpsell, getAllUsers } from '@/services/firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { MultiSiteManager } from './multi-site-manager'
import { LeadProducts } from './lead-products'
import { EditLeadForm } from '@/components/edit-lead-form'
import { Loader } from '@/components/ui/loader'
import { LeadNurtureCard } from '@/components/marketing/lead-nurture-card'
import { MapModal } from '@/components/map-modal'
import { useAuth } from '@/hooks/use-auth'
import { doc, getDoc, collection, getDocs, query, where, onSnapshot, updateDoc, setDoc } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { PostCallOutcomeDialog } from './post-call-outcome-dialog'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Checkbox } from './ui/checkbox'
import { Switch } from './ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Calendar as CalendarPicker } from './ui/calendar'
import { format, isValid } from 'date-fns'
import { DiscoveryQuestionsDialog } from './discovery-questions-form'
import { cn, formatInTimezone, parseDateString } from '@/lib/utils'
import { DiscoveryRadarChart } from './discovery-radar-chart'
import { ScrollArea } from './ui/scroll-area'
import { ScheduleAppointmentDialog } from './schedule-appointment-dialog';
import { LogNoteDialog } from './log-note-dialog'
import { Badge } from '@/components/ui/badge'
import { AddContactForm } from './add-contact-form'
import { EditContactForm } from './edit-contact-form'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu'
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
import { ServiceSelectionDialog } from './service-selection-dialog'
import { LocalMileAccessDialog } from './localmile-access-dialog'
import { ShipMateAccessDialog } from './shipmate-access-dialog'
import { EditPostalAddressDialog } from './edit-postal-address-dialog'
import { EditAddressDialog } from './edit-address-dialog'
import { SofDialog } from './standing-order-form'
import { Alert, AlertTitle, AlertDescription } from './ui/alert'
import { initiateLocalMileTrial, initiateMPProductsTrial, resendLocalMileEmail, recreateLocalMileCode } from '@/services/netsuite-localmile-proxy'
import { SmsDialog } from '@/components/sms-dialog'
import { AddToMarketingListDialog } from './leads-client'
import { MoveToNurtureDialog } from '@/components/marketing/move-to-nurture-dialog'
import { canAssignToAm } from '@/lib/leave-utils'

interface LeadProfileProps {
  initialLead: Lead;
}

const formatAddressString = (address?: Address) => {
    if (!address) return 'N/A';
    const parts = [];
    if (address.address1 !== null && address.address1 !== undefined && address.address1 !== 'undefined' && address.address1.trim() !== '') {
        parts.push(address.address1);
    }
    parts.push(address.street, address.city, address.state, address.zip, address.country);
    return parts.filter(Boolean).join(', ');
}

export function LeadProfile({ initialLead }: LeadProfileProps) {
    const [lead, setLead] = useState<Lead>(initialLead);
    const [subAppointments, setSubAppointments] = useState<any[]>([]);

    useEffect(() => {
        if (!lead.id) return;
        const q = query(collection(firestore, 'leads', lead.id, 'appointments'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const appts = snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }));
            appts.sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
            setSubAppointments(appts);
        });
        return () => unsubscribe();
    }, [lead.id]);
  const hasAmpoService = lead.services?.some(s => {
    const n = s.name.toLowerCase();
    return n.includes("ampo") || n.includes("pmpo") || n.includes("amstreet") || n.includes("mail processing") || n.includes("redirection");
  }) ?? false;
  const [nextBestActionLoading, setNextBestActionLoading] = useState(false);
  const [accountManagers, setAccountManagers] = useState<string[]>([]);
  const [csReps, setCsReps] = useState<string[]>([]);
  const [isFetchingAMs, setIsFetchingAMs] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
        setIsFetchingAMs(true);
        try {
            const usersRef = collection(firestore, 'users');
            const amQ = query(usersRef, where('assignedRoles', 'array-contains', 'Account Managers'));
            const csQ = query(usersRef, where('assignedRoles', 'array-contains', 'Customer Success'));

            const [amSnap, csSnap] = await Promise.all([getDocs(amQ), getDocs(csQ)]);
            
            const processSnap = (snap: any, isAm = false) => snap.docs.map((d: any) => {
                const data = d.data();
                if (isAm && !canAssignToAm(data)) return null;
                const name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
                return name || data.displayName || data.email;
            }).filter(Boolean);

            setAccountManagers(processSnap(amSnap, true));
            setCsReps(processSnap(csSnap, false));
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsFetchingAMs(false);
        }
    };
    fetchUsers();
  }, []);

  const calculateEngagementScore = (currentLead: Lead) => {
    let score = 0;
    if (currentLead.aiScore) {
        score += (currentLead.aiScore * 0.4);
    }
    if (currentLead.discoveryData && Object.keys(currentLead.discoveryData).length > 0) {
        score += Math.min(20, Object.keys(currentLead.discoveryData).length * 2);
    }
    const callsCount = (currentLead.activity || []).filter(a => a.type === 'Call').length;
    score += Math.min(20, callsCount * 5);
    const notesCount = (currentLead.notes || []).length;
    score += Math.min(20, notesCount * 5);
    return Math.min(100, Math.round(score));
  };
  const engagementScore = calculateEngagementScore(lead);

  const handleGenerateNextBestAction = async () => {
    setNextBestActionLoading(true);
    try {
      const result = await generateNextBestAction({
        leadId: lead.id,
        leadProfile: lead.profile || '',
        activities: JSON.stringify(lead.activity?.slice(0, 5) || []),
        notes: JSON.stringify(lead.notes?.slice(0, 5) || []),
        transcripts: JSON.stringify(lead.transcripts?.slice(0, 2) || []),
        discoveryData: JSON.stringify(lead.discoveryData || {}),
      });
      await updateLeadNextBestAction(lead.id, result.nextBestAction);
      setLead(prev => ({ ...prev, nextBestAction: result.nextBestAction }));
      toast({ title: 'Next Best Action Generated', description: 'The AI has analyzed the lead and suggested a next step.' });
    } catch (error) {
      console.error(error);
    } finally {
      setNextBestActionLoading(false);
    }
  };

  const [isProspecting, setIsProspecting] = useState(false);
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  const [isDiscoveryQuestionsOpen, setIsDiscoveryQuestionsOpen] = useState(false);
  const [isScheduleAppointmentOpen, setIsScheduleAppointmentOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showPostCallDialog, setShowPostCallDialog] = useState(false);
  const [preSelectedOutcome, setPreSelectedOutcome] = useState<string>('');
  const [dialogProcessMode, setDialogProcessMode] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setnewTaskDueDate] = useState<Date | undefined>();
  const [sessionLeads, setSessionLeads] = useState<string[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [loadingNextLead, setLoadingNextLead] = useState(false);
  const [loadingBack, setLoadingBack] = useState(false);

  const [isMoveToNurtureDialogOpen, setIsMoveToNurtureDialogOpen] = useState(false);
  const [isLogNoteOpen, setIsLogNoteOpen] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [linkedVisitNote, setLinkedVisitNote] = useState<VisitNote | null>(null);

  // Invoices & Upsell state for Company profile
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [isUpsellDialogOpen, setIsUpsellDialogOpen] = useState(false);
  const [isUpselling, setIsUpselling] = useState(false);
  const [upsellRepUid, setUpsellRepUid] = useState('');
  const [upsellNotes, setUpsellNotes] = useState('');
  const [fieldReps, setFieldReps] = useState<UserProfile[]>([]);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(false);
  const [isServiceSelectionOpen, setIsServiceSelectionOpen] = useState(false);
  const [isMarketingListDialogOpen, setIsMarketingListDialogOpen] = useState(false);
  const [allMarketingLists, setAllMarketingLists] = useState<string[]>([]);
  const [serviceSelectionMode, setServiceSelectionMode] = useState<'Free Trial' | 'Signup' | 'Quote'>('Signup');
  const [isLocalMileDialogOpen, setIsLocalMileDialogOpen] = useState(false);
  const [isShipMateDialogOpen, setIsShipMateDialogOpen] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isPostalAddressDialogOpen, setIsPostalAddressDialogOpen] = useState(false);
  const [isSofDialogOpen, setIsSofDialogOpen] = useState(false);
  const [isFranchiseeLookupOpen, setIsFranchiseeLookupOpen] = useState(false);
  const [franchiseeMatches, setFranchiseeMatches] = useState<any[]>([]);
  const [isLookingUpFranchisee, setIsLookingUpFranchisee] = useState(false);
  const [isProductQuoteOpen, setIsProductQuoteOpen] = useState(false);
  const [isMissingLeadTypeDialogOpen, setIsMissingLeadTypeDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [tempLeadType, setTempLeadType] = useState<string>('');

  const [isAnalyzingWebsite, setIsAnalyzingWebsite] = useState(false);
  const [companyInsights, setCompanyInsights] = useState<CompanyInsight[]>(initialLead.companyInsights || []);
  const [ausPostParentLpoId, setAusPostParentLpoId] = useState<string | null>(null);
  const [ausPostLpoName, setAusPostLpoName] = useState<string | null>(null);
  const [isAusPostLoading, setIsAusPostLoading] = useState(false);

  // Quick template email states
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [targetEmailAddress, setTargetEmailAddress] = useState<string>('');
  const [senderType, setSenderType] = useState<'default' | 'me' | 'custom'>('default');
  const [customSenderEmail, setCustomSenderEmail] = useState<string>('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // SMS states
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsTargetPhone, setSmsTargetPhone] = useState<string>('');
  const [smsTargetName, setSmsTargetName] = useState<string>('');

  // Email Preview and Forward states
  const [previewEmail, setPreviewEmail] = useState<any | null>(null);
  const [forwardEmail, setForwardEmail] = useState<any | null>(null);
  const [forwardEmailTarget, setForwardEmailTarget] = useState<string>('');
  const [isForwarding, setIsForwarding] = useState(false);

  // SCF Links
  const [scfLinks, setScfLinks] = useState<any[]>([]);



  useEffect(() => {
    if (isMarketingListDialogOpen && allMarketingLists.length === 0) {
        import('@/services/firebase').then(({ getLeadsFromFirebase }) => {
            getLeadsFromFirebase({ summary: true }).then((leads: any[]) => {
                const lists = new Set<string>();
                leads.forEach(l => {
                    if (l.marketingLists && Array.isArray(l.marketingLists)) {
                        l.marketingLists.forEach((list: string) => lists.add(list));
                    }
                });
                setAllMarketingLists(Array.from(lists).sort());
            }).catch(e => console.error("Failed to fetch marketing lists", e));
        });
    }
  }, [isMarketingListDialogOpen, allMarketingLists.length]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'marketing_templates'));
        setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Failed to load templates for profile page send:', error);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!selectedTemplateId) {
      setPreviewHtml('');
      return;
    }
    setPreviewLoading(true);
    
    fetch('/api/templates/generate-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: selectedTemplateId,
        leadId: lead.id
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setPreviewHtml(data.html);
      } else {
        setPreviewHtml('<p class="text-red-500 text-center py-4">Failed to generate preview</p>');
      }
    })
    .catch(err => {
      console.error(err);
      setPreviewHtml('<p class="text-red-500 text-center py-4">Error generating preview</p>');
    })
    .finally(() => {
      setPreviewLoading(false);
    });
  }, [selectedTemplateId, lead.id]);

  const handleSendSingleEmail = async () => {
    if (!targetEmailAddress || !selectedTemplateId) {
      toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a template.' });
      return;
    }

    let finalSenderEmail: string | undefined = undefined;
    if (senderType === 'me') {
      if (user?.email && user.email.endsWith('@mailplus.com.au')) {
        finalSenderEmail = user.email;
      } else {
        toast({
          variant: 'destructive',
          title: 'Authorization Error',
          description: 'Your logged-in email address must belong to the @mailplus.com.au domain to send emails.'
        });
        return;
      }
    } else if (senderType === 'custom') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!customSenderEmail || !emailRegex.test(customSenderEmail) || !customSenderEmail.endsWith('@mailplus.com.au')) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: 'Please specify a valid custom sender email ending with @mailplus.com.au.'
        });
        return;
      }
      finalSenderEmail = customSenderEmail;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/campaigns/send-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: [lead.id],
          templateId: selectedTemplateId,
          targetEmail: targetEmailAddress,
          customSenderEmail: finalSenderEmail
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Email Sent Successfully',
          description: `Template sent directly to ${targetEmailAddress}.`
        });

        // Refetch the lead profile to update activities
        try {
          const docRef = doc(firestore, 'leads', lead.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
             setLead({ id: docSnap.id, ...docSnap.data() } as Lead);
          }
        } catch (e) {
          console.error("Failed to refresh lead data:", e);
        }

        setIsEmailDialogOpen(false);
        setSelectedTemplateId('');
        setTargetEmailAddress('');
        setSenderType('default');
        setCustomSenderEmail('');
      } else {
        toast({
          variant: 'destructive',
          title: 'Send Failed',
          description: result.message || 'System failed to send the template email.'
        });
      }
    } catch (error: any) {
      console.error('Direct send error:', error);
      toast({
        variant: 'destructive',
        title: 'Network Error',
        description: error.message || 'Unable to connect to the bulk send API.'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleForwardEmail = async () => {
    if (!forwardEmailTarget || !forwardEmailTarget.includes('@')) {
        toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please enter a valid email address.' });
        return;
    }
    setIsForwarding(true);
    try {
        const response = await fetch('/api/campaigns/send-custom-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: forwardEmailTarget,
                subject: `Fwd: ${forwardEmail.subject}`,
                html: `<div><p>---------- Forwarded message ---------</p><p>Subject: ${forwardEmail.subject}</p></div><br/>${forwardEmail.bodyHtml}`,
                customFrom: user?.email && user.email.endsWith('@mailplus.com.au') ? user.email : undefined
            })
        });
        const result = await response.json();
        if (result.success) {
            toast({ title: 'Success', description: 'Email forwarded successfully.' });
            setForwardEmail(null);
            setForwardEmailTarget('');
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message || 'Failed to forward email.' });
        }
    } catch (e: any) {
         toast({ variant: 'destructive', title: 'Error', description: e.message || 'Network error.' });
    } finally {
        setIsForwarding(false);
    }
  };

  const handleEmailClick = (email: string) => {
    if (!email) return;
    setTargetEmailAddress(email);
    setIsEmailDialogOpen(true);
  };

  const handleFranchiseeLookup = async () => {
      setIsLookingUpFranchisee(true);
      setFranchiseeMatches([]);
      setIsFranchiseeLookupOpen(true);
      try {
          const snap = await getDocs(collection(firestore, 'franchisees'));
          const franchisees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          const matches = franchisees.filter(f => {
              if (!f.territoryJson) return false;
              const leadCity = lead.address?.city?.toLowerCase().trim();
              const leadState = lead.address?.state?.toLowerCase().trim();
              const leadZip = lead.address?.zip?.toLowerCase().trim();
              
              if (!leadCity || !leadState || !leadZip) return false;

              return f.territoryJson.some((t: any) => 
                  t.suburbs?.toLowerCase().trim() === leadCity &&
                  t.state?.toLowerCase().trim() === leadState &&
                  t.post_code?.toLowerCase().trim() === leadZip
              );
          });
          setFranchiseeMatches(matches);
      } catch (error) {
          toast({ variant: 'destructive', title: 'Lookup Error', description: 'Failed to fetch franchisees.' });
      } finally {
          setIsLookingUpFranchisee(false);
      }
  };

  const handleFranchiseeSelection = async (franchisee: any) => {
      try {
          const franchiseeId = franchisee.internalId || franchisee.id;
          await updateLeadDetails(lead.id, lead, { franchisee: franchisee.name, franchisee_id: franchiseeId });
          setLead(prev => ({ ...prev, franchisee: franchisee.name, franchisee_id: franchiseeId }));
          toast({ title: 'Franchisee Updated', description: `Lead mapped to ${franchisee.name}.` });
          setIsFranchiseeLookupOpen(false);
      } catch (error) {
          toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to update lead franchisee.' });
      }
  };

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  
  const isCompanyProfile = pathname.startsWith('/companies/');
  const { contacts = [], activity: activities = [], notes = [], transcripts = [], tasks = [], appointments = [] } = lead;

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!isCompanyProfile || !lead.id) return;
      setLoadingInvoices(true);
      try {
        const invoicesRef = collection(firestore, 'companies', lead.id, 'invoices');
        const invoicesSnapshot = await getDocs(query(invoicesRef));
        const invoicesData = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort manually or use orderBy if index exists
        invoicesData.sort((a: any, b: any) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
        setInvoices(invoicesData);
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
      } finally {
        setLoadingInvoices(false);
      }
    };
    
    fetchInvoices();
  }, [lead.id, isCompanyProfile]);

  useEffect(() => {
      if (isUpsellDialogOpen && isCompanyProfile) {
          const fetchUsers = async () => {
              const usersRef = collection(firestore, 'users');
              const usersSnap = await getDocs(usersRef);
              const users = usersSnap.docs.map(d => d.data() as any);
              const reps = users.filter(u => (u.assignedRoles?.includes('Field Sales') || u.assignedRoles?.includes('Dashback') || u.assignedRoles?.includes('admin') || u.assignedRoles?.includes('Field Sales Admin')) && !u.disabled);
              setFieldReps(reps);
              if (userProfile && (userProfile.activeRole === 'Field Sales' || userProfile.activeRole === 'admin')) {
                  setUpsellRepUid(userProfile.uid);
              }
          };
          fetchUsers();
      }
  }, [isUpsellDialogOpen, userProfile, isCompanyProfile]);

  const handleEndSession = useCallback(() => {
    localStorage.removeItem('dialingSessionLeads');
    setIsSessionActive(false);
    setSessionLeads([]);
    toast({ title: 'Dialing Session Ended' });
  }, [toast]);

  const handleConfirmUpsell = async () => {
    if (!lead.id || !upsellRepUid) return;
    setIsUpselling(true);
    try {
      const rep = fieldReps.find(r => r.uid === upsellRepUid);
      
      // 1. Sync with NetSuite
      const nsResult = await sendUpsellToNetSuite({ leadId: lead.id });
      
      // 2. Log in Firebase for Activity and Commission reporting
      await logUpsell({
          companyId: lead.id,
          companyName: lead.companyName,
          repUid: upsellRepUid,
          repName: rep?.displayName || 'Unknown Rep',
          date: new Date().toISOString(),
          notes: upsellNotes
      });

      if (nsResult.success) {
          toast({ title: 'Upsell Recorded', description: 'Activity logged and NetSuite notified.' });
      } else {
          toast({ variant: 'destructive', title: 'Partial Success', description: `Logged in prospect.plus, but NetSuite sync failed: ${nsResult.message}` });
      }
      setIsUpsellDialogOpen(false);
      setUpsellNotes('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsUpselling(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete || !contactToDelete.id) return;
    setIsDeletingContact(true);
    try {
        await deleteContactFromLead(lead.id, contactToDelete.id, contactToDelete.name);
        setLead(prev => ({
            ...prev,
            contacts: prev.contacts?.filter(c => c.id !== contactToDelete?.id)
        }));
        toast({ title: 'Contact Deleted', description: 'The contact has been removed.' });
        
        logActivity(lead.id, {
            type: 'Update',
            notes: `Deleted contact: ${contactToDelete.name}`,
            author: user?.displayName || 'System'
        });
        
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to delete contact' });
    } finally {
        setIsDeletingContact(false);
        setContactToDelete(null);
    }
  };

  const handleNextLead = useCallback(() => {
    setShowPostCallDialog(false);

    const currentIndex = sessionLeads.indexOf(lead.id);
    let nextLeadId: string | null = null;

    if (currentIndex !== -1 && currentIndex < sessionLeads.length - 1) {
      nextLeadId = sessionLeads[currentIndex + 1];
    }

    const updatedSessionLeads = sessionLeads.filter(id => id !== lead.id);
    localStorage.setItem('dialingSessionLeads', JSON.stringify(updatedSessionLeads));
    setSessionLeads(updatedSessionLeads);

    if (nextLeadId) {
      setLoadingNextLead(true);
      router.push(`/leads/${nextLeadId}`);
    } else if (updatedSessionLeads.length > 0) {
      setLoadingNextLead(true);
      router.push(`/leads/${updatedSessionLeads[0]}`);
    } else {
      toast({ title: 'Session Complete', description: 'You have reached the end of your dialing list.' });
      handleEndSession();
    }
  }, [lead.id, sessionLeads, router, toast, handleEndSession]);

  useEffect(() => {
    setLead(initialLead);
    setCompanyInsights(initialLead.companyInsights || []);
    const visitNoteId = initialLead.visitNoteID;
    if (visitNoteId) {
        setIsDiscoveryLoading(true);
        const noteRef = doc(firestore, 'visitnotes', visitNoteId);
        getDoc(noteRef).then(noteSnap => {
            if (noteSnap.exists()) {
                setLinkedVisitNote({ id: noteSnap.id, ...noteSnap.data() } as VisitNote);
            }
        }).finally(() => setIsDiscoveryLoading(false));
    }

    getScfRecords(initialLead.id).then(records => setScfLinks(records)).catch(console.error);

    const sessionLeadIds = localStorage.getItem('dialingSessionLeads');
    if (sessionLeadIds) {
      const leads = JSON.parse(sessionLeadIds);
      setSessionLeads(leads);
      if (initialLead && leads.includes(initialLead.id)) {
        setIsSessionActive(true);
      } else {
        setIsSessionActive(false);
      }
    }
  }, [initialLead]);

  useEffect(() => {
    const fetchAusPostMapping = async () => {
        setIsAusPostLoading(true);
        try {
            const snap = await getDocs(collection(firestore, 'franchisees'));
            const franchisees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            
            const leadCity = lead.address?.city?.toLowerCase().trim();
            const leadState = lead.address?.state?.toLowerCase().trim();
            const leadZip = lead.address?.zip?.toLowerCase().trim();
            
            const matchLpo = async (parent_lpo_id: string) => {
                setAusPostParentLpoId(parent_lpo_id);
                try {
                    const res = await fetch(`/api/lpo/${parent_lpo_id}`);
                    const data = await res.json();
                    if (data.success && data.name) {
                        setAusPostLpoName(data.name);
                    }
                } catch (err) {
                    console.error("Error fetching LPO name:", err);
                }
            };

            // First priority: assigned franchisee
            if (lead.franchisee_id) {
                const assignedFranchisee = franchisees.find(f => f.internalId === lead.franchisee_id || f.id === lead.franchisee_id);
                if (assignedFranchisee && assignedFranchisee.ausPostSuburbsJson && assignedFranchisee.ausPostSuburbsJson.length > 0) {
                    // Try to match address within the assigned franchisee
                    if (leadCity && leadState && leadZip) {
                        const match = assignedFranchisee.ausPostSuburbsJson.find((t: any) => 
                            t.suburbs?.toLowerCase().trim() === leadCity &&
                            t.state?.toLowerCase().trim() === leadState &&
                            t.post_code?.toLowerCase().trim() === leadZip
                        );
                        if (match && match.parent_lpo_id) {
                            await matchLpo(match.parent_lpo_id);
                            return;
                        }
                    }
                    // Fallback: first LPO of the assigned franchisee
                    const firstMatch = assignedFranchisee.ausPostSuburbsJson.find((t: any) => t.parent_lpo_id);
                    if (firstMatch && firstMatch.parent_lpo_id) {
                        await matchLpo(firstMatch.parent_lpo_id);
                        return;
                    }
                }
            }

            // Second priority: search all franchisees if we have an address
            if (!leadCity || !leadState || !leadZip) {
                setAusPostParentLpoId(null);
                setAusPostLpoName(null);
                return;
            }

            for (const f of franchisees) {
                if (f.ausPostSuburbsJson) {
                    const match = f.ausPostSuburbsJson.find((t: any) => 
                        t.suburbs?.toLowerCase().trim() === leadCity &&
                        t.state?.toLowerCase().trim() === leadState &&
                        t.post_code?.toLowerCase().trim() === leadZip
                    );
                    if (match && match.parent_lpo_id) {
                        await matchLpo(match.parent_lpo_id);
                        return;
                    }
                }
            }
            
            // No match found
            setAusPostParentLpoId(null);
            setAusPostLpoName(null);
        } catch (error) {
            console.error("Failed to fetch AusPost mapping", error);
        } finally {
            setIsAusPostLoading(false);
        }
    };
    fetchAusPostMapping();
  }, [lead.address, lead.franchisee_id]);

  const handleCallLogged = (newStatus?: LeadStatus) => {
    if (newStatus) setLead(prev => ({...prev!, status: newStatus}));
  };

  const handleAiProspect = async () => {
    if (!lead || !lead.websiteUrl) return;
    setIsProspecting(true);
    try {
        const result = await prospectWebsiteTool({ leadId: lead.id, websiteUrl: lead.websiteUrl });
        if (result.logoUrl) {
          await updateLeadAvatar(lead.id, result.logoUrl);
          setLead(prev => ({ ...prev!, avatarUrl: result.logoUrl! }));
        }
        if (result.companyDescription) setLead(prev => ({...prev!, companyDescription: result.companyDescription! }));
        if (result.contacts && result.contacts.length > 0) {
          setLead(prev => ({
            ...prev,
            contacts: [...(prev.contacts || []), ...(result.contacts as Contact[])]
          }));
        }
        toast({ title: "Success", description: "Prospecting complete." });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Prospecting failed." });
    } finally {
        setIsProspecting(false);
    }
  };

  const handleGatherCompanyInsights = async () => {
    if (!lead || !lead.websiteUrl) return;
    setIsAnalyzingWebsite(true);
    try {
        const response = await gatherCompanyInsights({ websiteUrl: lead.websiteUrl });
        if (!response.success || !response.data) {
            throw new Error(response.error || "Failed to scan website.");
        }
        const result = response.data;
        const newInsightData = {
            companyName: result.companyName || lead.companyName || '',
            industry: result.industry || '',
            productsServices: result.productsServices || '',
            targetAudience: result.targetAudience || '',
            valueProposition: result.valueProposition || '',
            shippingLogisticsNeeds: result.shippingLogisticsNeeds || '',
            talkingPoints: result.talkingPoints || [],
            rawSummary: result.rawSummary || '',
            extractedEmails: result.extractedEmails || [],
            extractedPhones: result.extractedPhones || [],
            scannedAt: new Date().toISOString()
        };
        const newInsightId = await addCompanyInsight(lead.id, newInsightData);
        const newInsight: CompanyInsight = {
            id: newInsightId,
            ...newInsightData
        };
        setCompanyInsights(prev => [newInsight, ...prev]);

        if (result.rawSummary) {
            await updateLeadDetails(lead.id, lead, { companyDescription: result.rawSummary });
            setLead(prev => ({ ...prev, companyDescription: result.rawSummary! }));
        }

        toast({ title: "Success", description: "Website scanned and insights gathered successfully!" });
    } catch (error: any) {
        console.error(error);
        toast({ variant: "destructive", title: "Scan Failed", description: error.message || "Failed to scan website." });
    } finally {
        setIsAnalyzingWebsite(false);
    }
  };

  const handleNoteLogged = (newNote: Note) => {
    setLead(prev => ({...prev!, notes: [newNote, ...(prev!.notes || [])]}));
    setIsLogNoteOpen(false);
  };
  
  const handleLeadUpdated = (updatedLeadData: Partial<Lead>) => {
    setLead(prev => ({ ...prev!, ...updatedLeadData }));
    setIsEditLeadDialogOpen(false);
    logActivity(lead.id, {
        type: 'Update',
        notes: `Company details changed.`,
        author: user?.displayName || 'Unknown'
    });
  }

  const handleBucketChange = async (newBucket: string) => {
    if (newBucket === 'nurture') {
      setIsMoveToNurtureDialogOpen(true);
      return;
    }
    try {
        const isField = newBucket === 'field_sales';
        const oldBucket = lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound');
        const author = user?.displayName || user?.email || 'System';

        await updateLeadDetails(lead.id, lead, { bucket: newBucket as any, fieldSales: isField });
        await logBucketChange(lead.id, oldBucket, newBucket, author);

        setLead(prev => {
            const updatedHistory = [
                {
                    id: `bh-${Date.now()}`,
                    oldBucket,
                    newBucket,
                    date: new Date().toISOString(),
                    author
                },
                ...(prev.bucketHistory || [])
            ];
            return { ...prev, bucket: newBucket as any, fieldSales: isField, bucketHistory: updatedHistory };
        });

        toast({ title: 'Bucket Updated', description: `Lead moved to ${newBucket === 'field_sales' ? 'Field Sales' : newBucket} bucket.` });
        logActivity(lead.id, {
            type: 'Update',
            notes: `Bucket changed to ${newBucket === 'field_sales' ? 'Field Sales' : newBucket}.`,
            author
        });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update bucket allocation.' });
    }
  }

  const handleAccountManagerChange = async (amName: string) => {
    try {
        const oldBucket = lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound');
        const author = user?.displayName || user?.email || 'System';
        const newBookingUrlId = crypto.randomUUID();

        await updateLeadDetails(lead.id, lead, { accountManagerAssigned: amName, bucket: 'account_manager', bookingUrlId: newBookingUrlId });
        await logBucketChange(lead.id, oldBucket, 'account_manager', author);

        setLead(prev => {
            const updatedHistory = [
                {
                    id: `bh-${Date.now()}`,
                    oldBucket,
                    newBucket: 'account_manager',
                    date: new Date().toISOString(),
                    author
                },
                ...(prev.bucketHistory || [])
            ];
            return { ...prev, accountManagerAssigned: amName, bucket: 'account_manager', fieldSales: false, bookingUrlId: newBookingUrlId, bucketHistory: updatedHistory };
        });

        toast({ title: 'Account Manager Assigned', description: `Lead assigned to ${amName} and moved to Account Manager bucket.` });
        logActivity(lead.id, {
            type: 'Update',
            notes: `Account Manager assigned: ${amName}`,
            author
        });
        return newBookingUrlId;
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not assign account manager.' });
        return null;
    }
  };

  const handleCustomerSuccessChange = async (csName: string) => {
    try {
        const oldBucket = lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound');
        const author = user?.displayName || user?.email || 'System';

        await updateLeadDetails(lead.id, lead, { customerSuccessAssigned: csName, bucket: 'customer_success' });
        await logBucketChange(lead.id, oldBucket, 'customer_success', author);

        setLead(prev => {
            const updatedHistory = [
                {
                    id: `bh-${Date.now()}`,
                    oldBucket,
                    newBucket: 'customer_success',
                    date: new Date().toISOString(),
                    author
                },
                ...(prev.bucketHistory || [])
            ];
            return { ...prev, customerSuccessAssigned: csName, bucket: 'customer_success', fieldSales: false, bucketHistory: updatedHistory };
        });

        toast({ title: 'Customer Success Assigned', description: `Lead assigned to ${csName} and moved to Customer Success bucket.` });
        logActivity(lead.id, {
            type: 'Update',
            notes: `Customer Success assigned: ${csName}`,
            author
        });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not assign customer success rep.' });
    }
  };

  const handleMyPostBusinessChange = async (value: string) => {
    try {
        await updateLeadDetails(lead.id, lead, { hasMyPostBusinessAccount: value as 'Yes' | 'No' });
        setLead(prev => ({ ...prev, hasMyPostBusinessAccount: value as 'Yes' | 'No' }));
        toast({ title: 'Updated', description: 'My Post Business account status updated.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update account status.' });
    }
  };

  const handleInitiateCall = (leadId: string, phoneNumber: string) => {
    if (!phoneNumber) return;
    window.open(`aircall:${phoneNumber}`);
    logActivity(leadId, { 
        type: 'Call', 
        notes: `Initiated call to ${phoneNumber} via AirCall app.`,
        author: user?.displayName || 'Unknown'
    });
  };

  const handleInitiateSms = (phoneNumber: string, recipientName: string = '') => {
    setSmsTargetPhone(phoneNumber);
    setSmsTargetName(recipientName);
    setSmsDialogOpen(true);
  };

  const handleCopy = (text: string | null | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${fieldName} copied.` });
  };

  const handleBackToLeads = () => {
    setLoadingBack(true);
    router.push(isCompanyProfile ? '/signed-customers' : '/leads');
  };

  const handleLocalMileConfirm = async (serviceType: string, rate: number, selectedContactsInfo: any[] = []) => {
    try {
        const contact = selectedContactsInfo[0] || {};
        const result = await initiateLocalMileTrial({ 
            leadId: lead.id, 
            serviceType, 
            rate,
            contactFirstName: contact.firstName,
            contactLastName: contact.lastName,
            contactEmail: contact.email,
            contactPhone: contact.phone,
            userEmail: user?.email || undefined,
            userName: user?.displayName || undefined
        });
        if (result.success) {
            toast({ title: 'Success', description: 'LocalMile trial initiated and synced with NetSuite.' });
            
            if (contact.id && result.localMilePlusAuthLink && result.securityCode) {
               await updateContactInLead(lead.id, contact.id, {
                   localMilePlusAuthLink: result.localMilePlusAuthLink,
                   securityCode: result.securityCode
               });
            }

            await updateLeadDetails(lead.id, lead, { customerStatus: 'LocalMile Opportunity', serviceType, rate, bucket: 'customer_success', localMileTrialsRemaining: 5 });

            setLead(prev => ({ 
                ...prev, 
                status: 'LocalMile Opportunity', 
                serviceType, 
                rate,
                localMileTrialsRemaining: 5,
                contacts: prev.contacts?.map(c => 
                   (c.id === contact.id && result.localMilePlusAuthLink && result.securityCode) ? { 
                       ...c, 
                       localMilePlusAuthLink: result.localMilePlusAuthLink,
                       securityCode: result.securityCode
                   } : c
                )
            }));
            logActivity(lead.id, {
                type: 'Update',
                notes: `Initiated LocalMile Trial (${serviceType} at $${rate})`,
                author: user?.displayName || 'Unknown'
            });
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        // Fallback to local Firestore save if NetSuite fails
        await updateLeadDetails(lead.id, lead, { customerStatus: 'LocalMile Opportunity', serviceType, rate });
        setLead(prev => ({ ...prev, status: 'LocalMile Opportunity', serviceType, rate }));
        toast({ 
            variant: 'destructive', 
            title: 'NetSuite Sync Failed', 
            description: `Pricing saved locally. Please contact Ankith Ravindran for manual clean-up routines. Error: ${error.message}` 
        });
        throw error;
    }
  };

  const handleResendLocalMileEmail = async (contact: any) => {
    try {
        const result = await resendLocalMileEmail({
            contactEmail: contact.email,
            contactFirstName: contact.name,
            securityCode: contact.securityCode,
            localMilePlusAuthLink: contact.localMilePlusAuthLink,
            userEmail: user?.email || undefined,
            leadId: lead.id,
            contactPhone: contact.phone
        });
        if (result.success) {
            toast({ title: 'Email Sent', description: 'Authentication email has been resent to ' + contact.email });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message || 'Failed to resend email' });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not resend email.' });
    }
  };

  const handleRecreateSecurityCode = async (contact: any) => {
    try {
        const result = await recreateLocalMileCode({ email: contact.email });
        if (result.success && result.securityCode) {
            // Update local state
            setLead(prev => ({ 
                ...prev, 
                contacts: prev.contacts?.map(c => 
                    c.id === contact.id ? { ...c, securityCode: result.securityCode } : c
                ) 
            }));
            // Update Firestore
            if (contact.id) {
                await updateContactInLead(lead.id, contact.id, {
                    securityCode: result.securityCode
                });
            }
            toast({ title: 'Success', description: 'Security code recreated successfully.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message || 'Failed to recreate code.' });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not recreate security code.' });
    }
  };

  const handleShipMateConfirm = async () => {
    const result = await initiateMPProductsTrial({ 
        leadId: lead.id,
        userEmail: user?.email || undefined,
        userName: user?.displayName || undefined
    });
    if (result.success) {
        toast({ title: 'Success', description: 'ShipMate trial initiated.' });
        await updateLeadDetails(lead.id, lead, { customerStatus: 'Trialing ShipMate' });
        setLead(prev => ({ ...prev, status: 'Trialing ShipMate' }));
        logActivity(lead.id, {
            type: 'Update',
            notes: `Initiated ShipMate Trial`,
            author: user?.displayName || 'Unknown'
        });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
        throw new Error(result.message);
    }
  };

  const handleDiscoverySave = async (data: DiscoveryData) => {
    try {
        await updateLeadDiscoveryData(lead.id, data);
        setLead(prev => ({ ...prev, discoveryData: data }));
        toast({ title: 'Discovery Saved', description: 'Discovery data has been updated and synced.' });
        setIsDiscoveryQuestionsOpen(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save discovery data.' });
    }
  };

    const handleUpdateAppointment = async (appt: any, updates: any) => {
        try {
            const docRef = doc(firestore, 'leads', lead.id, 'appointments', appt.id);
            await setDoc(docRef, { ...appt, ...updates }, { merge: true });
            
            // Sync to lead array
            const newAppointments = (lead.appointments || []).map((a: any) => a.id === appt.id ? { ...a, ...updates } : a);
            await updateDoc(doc(firestore, 'leads', lead.id), { appointments: newAppointments });

            toast({ title: "Appointment updated" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Failed to update appointment: " + e.message });
        }
    };

    const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskDueDate || !user?.displayName) return;
    try {
        const newTask = await addTaskToLead(lead.id, {
            title: newTaskTitle,
            dueDate: newTaskDueDate.toISOString(),
            author: user.displayName,
        });
        setLead(prev => ({ ...prev, tasks: [newTask, ...(prev.tasks || [])] }));
        setNewTaskTitle('');
        setnewTaskDueDate(undefined);
        toast({ title: 'Task Added' });
        logActivity(lead.id, {
            type: 'Update',
            notes: `Created task: ${newTaskTitle}`,
            author: user.displayName || 'Unknown'
        });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add task.' });
    }
  };

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
        await updateTaskCompletion(lead.id, taskId, isCompleted);
        setLead(prev => ({
            ...prev,
            tasks: prev.tasks?.map(t => t.id === taskId ? { ...t, isCompleted } : t)
        }));
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update task.' });
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isValid(date) ? format(date, 'MMM d, yyyy') : '-';
  };

   const DetailItem = ({ icon: Icon, label, value, copyable, isLink, linkUrl, isWebsite, callable, leadId, emailClickable, actionIcon: ActionIcon, onActionClick, isActionLoading, actionClassName }: any) => {
    return (
        <div className="space-y-1" id={callable ? "step-aircall-link" : undefined}>
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
            </div>
            <div className="flex items-center gap-2 min-h-[1.5rem]">
                {isWebsite ? (
                    value ? (
                        <a href={value} target="_blank" className="text-sm font-semibold text-primary hover:underline truncate max-w-[250px]">
                            {value}
                        </a>
                    ) : <span className="text-sm text-muted-foreground">-</span>
                ) : emailClickable && value ? (
                    <button 
                        onClick={() => handleEmailClick(value)} 
                        className="text-sm font-semibold text-primary hover:underline text-left"
                    >
                        {value}
                    </button>
                ) : isLink ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">{value || '-'}</span>
                        {value && linkUrl && (
                            <a href={linkUrl} target="_blank" className="text-primary hover:text-primary/80">
                                <LinkIcon className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                ) : (
                    <span className="text-sm font-semibold">{value || '-'}</span>
                )}
                
                {copyable && value && (
                    <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => handleCopy(value, label)}>
                        <Clipboard className="h-3 w-3" />
                    </Button>
                )}
                
                {callable && value && (
                    <>
                        <Button id="step-aircall-link" variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => handleInitiateCall(leadId, value)}>
                            <PhoneCall className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => handleInitiateSms(value, lead.companyName || 'Lead')}>
                            <MessageSquare className="h-3 w-3" />
                        </Button>
                    </>
                )}

                {ActionIcon && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-5 w-5 rounded-full", actionClassName || "text-muted-foreground hover:text-foreground")}
                        onClick={onActionClick}
                        disabled={isActionLoading}
                        title={label === "Franchisee" ? "Change Franchisee" : undefined}
                    >
                        {isActionLoading ? <Loader className="h-3 w-3" /> : <ActionIcon className="h-3 w-3" />}
                    </Button>
                )}
            </div>
        </div>
    );
  };

  const isAdmin = userProfile?.activeRole === 'admin';
  const isLeadGenAdmin = userProfile?.activeRole === 'Lead Gen Admin';
  const isFieldSales = userProfile?.activeRole === 'Field Sales' || userProfile?.activeRole === 'Dashback' || userProfile?.activeRole === 'Field Sales Admin';
  const isDialer = userProfile?.activeRole === 'user' || userProfile?.activeRole === 'Lead Gen' || userProfile?.activeRole === 'Account Managers';
  const isMailPlusPtyLtd = lead.franchisee?.toLowerCase() === 'mailplus pty ltd';

  let showSchedule = false;
  let showProcessLead = false;
  let showCall = false;
  let showNote = false;
  let showCheckIn = false;
  let showSales = false;

  if (isAdmin) {
      showSales = true;
      showSchedule = true;
      showProcessLead = true;
      showCall = true;
      showNote = true;
      showCheckIn = true;
  } else if (isLeadGenAdmin) {
      showSales = true;
      showSchedule = true;
      showProcessLead = true;
      showCall = false; 
      showNote = true;
      showCheckIn = false;
  } else if (isFieldSales) {
      showSales = true;
      showSchedule = false;
      showProcessLead = false;
      showCall = true;
      showNote = true;
      showCheckIn = true;
  } else if (isDialer) {
      showSales = true;
      showSchedule = true;
      showProcessLead = false;
      showCall = true;
      showNote = true;
      showCheckIn = false;
  }

  const requireLeadType = (action: () => void) => {
      if (lead.leadType) {
          action();
      } else {
          setPendingAction(() => action);
          setTempLeadType('');
          setIsMissingLeadTypeDialogOpen(true);
      }
  };

  const handleSaveMissingLeadType = async () => {
      if (!tempLeadType) {
          toast({ variant: 'destructive', title: 'Error', description: 'Please select a lead type.' });
          return;
      }
      try {
          await updateLeadDetails(lead.id, lead, { leadType: tempLeadType });
          setLead(prev => ({ ...prev, leadType: tempLeadType }));
          toast({ title: 'Success', description: 'Lead type saved.' });
          setIsMissingLeadTypeDialogOpen(false);
          if (pendingAction) {
              pendingAction();
              setPendingAction(null);
          }
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not save lead type.' });
      }
  };

  const renderActionButtons = () => {
    if (isCompanyProfile || !showSales) return null;

    const signupItem = <DropdownMenuItem key="signup" onSelect={(e) => { e.preventDefault(); requireLeadType(() => { setServiceSelectionMode('Signup'); setIsServiceSelectionOpen(true); }); }}><Briefcase className="mr-2 h-4 w-4" />Signup</DropdownMenuItem>;
    
    const quoteItem = (
        <DropdownMenuSub key="quote">
            <DropdownMenuSubTrigger><Briefcase className="mr-2 h-4 w-4" />Quote</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); requireLeadType(() => setIsProductQuoteOpen(true)); }}>Products</DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); requireLeadType(() => { setServiceSelectionMode('Quote'); setIsServiceSelectionOpen(true); }); }}>Services</DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
        </DropdownMenuSub>
    );
    
    const trialsExceeded = lead.localMileTrialsRemaining !== undefined && lead.localMileTrialsRemaining <= 1;

    const freeTrialItem = (
        <DropdownMenuSub key="trial">
            <DropdownMenuSubTrigger disabled={trialsExceeded} className={trialsExceeded ? "opacity-50 cursor-not-allowed text-muted-foreground flex justify-between items-center w-full" : ""}>
                <span className="flex items-center">
                    <Star className="mr-2 h-4 w-4" />Free Trial
                </span>
                {trialsExceeded && (
                    <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded ml-2 uppercase font-bold shrink-0">
                        Restricted
                    </span>
                )}
            </DropdownMenuSubTrigger>
            {!trialsExceeded && (
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); requireLeadType(() => setIsShipMateDialogOpen(true)); }}>ShipMate</DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); requireLeadType(() => setIsLocalMileDialogOpen(true)); }}>LocalMile</DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            )}
        </DropdownMenuSub>
    );

    let salesItems: React.ReactNode[] = isMailPlusPtyLtd ? [] : [quoteItem, signupItem, freeTrialItem];

    if (salesItems.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button id="step-sale-deals" className="bg-amber-500 hover:bg-amber-600 text-white border-transparent"><Briefcase className="mr-2 h-4 w-4" />Sale Deals</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {salesItems}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
  };

  const callHistory = (activities || []).filter(a => a.type === 'Call' && a.callId);
  const fullAddressStr = lead.address ? formatAddressString(lead.address) : 'No address available';

  return (
    <>
    <PostCallOutcomeDialog
        lead={lead}
        isOpen={showPostCallDialog}
        onClose={() => setShowPostCallDialog(false)}
        onOutcomeLogged={handleCallLogged}
        onSessionNext={handleNextLead}
        isSessionActive={isSessionActive}
        processMode={dialogProcessMode}
        initialOutcome={preSelectedOutcome}
    />
    <MoveToNurtureDialog
        leads={[lead]}
        isOpen={isMoveToNurtureDialogOpen}
        onOpenChange={setIsMoveToNurtureDialogOpen}
        onLeadsMoved={async () => {
            try {
              const updatedLead = await getLeadFromFirebase(lead.id, true);
              if (updatedLead) {
                 setLead(updatedLead);
              }
            } catch (e) {
              console.error("Failed to refresh lead data:", e);
            }
        }}
    />
    <SmsDialog
        isOpen={smsDialogOpen}
        onClose={() => setSmsDialogOpen(false)}
        phoneNumber={smsTargetPhone}
        recipientName={smsTargetName}
    />
    <Dialog open={isMissingLeadTypeDialogOpen} onOpenChange={setIsMissingLeadTypeDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Select Lead Type</DialogTitle>
                <DialogDescription>Please specify the type of this lead before proceeding.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Select value={tempLeadType} onValueChange={setTempLeadType}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Product">Product</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                        <SelectItem value="Service & Product">Service &amp; Product</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsMissingLeadTypeDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveMissingLeadType}>Save &amp; Continue</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <Dialog open={isProductQuoteOpen} onOpenChange={setIsProductQuoteOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Products Quote</DialogTitle>
                <DialogDescription>View the pricing for premium products to provide a quote.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <LeadProducts lead={lead} />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsProductQuoteOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <AddToMarketingListDialog
        leads={[lead]}
        isOpen={isMarketingListDialogOpen}
        onOpenChange={setIsMarketingListDialogOpen}
        onLeadsAdded={() => {
            // refresh data
            const docRef = doc(firestore, 'leads', lead.id);
            getDoc(docRef).then(docSnap => {
                if (docSnap.exists()) {
                    setLead({ id: docSnap.id, ...docSnap.data() } as Lead);
                }
            });
            logActivity(lead.id, {
                type: 'Update',
                notes: `Added to marketing list(s)`,
                author: user?.displayName || 'Unknown'
            });
        }}
        existingLists={allMarketingLists.length > 0 ? allMarketingLists : (lead.marketingLists || [])}
    />
    <Dialog open={!!previewEmail} onOpenChange={(open) => !open && setPreviewEmail(null)}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{previewEmail?.subject}</DialogTitle>
                <DialogDescription>To: {previewEmail?.recipient}</DialogDescription>
            </DialogHeader>
            <div className="flex-1 mt-4 border rounded-md overflow-hidden min-h-[450px]">
                <iframe 
                    title="Email Preview"
                    srcDoc={previewEmail?.bodyHtml || ''} 
                    className="w-full h-full border-none bg-white"
                />
            </div>
        </DialogContent>
    </Dialog>
    <Dialog open={!!forwardEmail} onOpenChange={(open) => !open && setForwardEmail(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Forward Email</DialogTitle>
                <DialogDescription>Enter the recipient's email address to forward this message.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>To</Label>
                    <Input 
                        placeholder="recipient@example.com" 
                        value={forwardEmailTarget} 
                        onChange={(e) => setForwardEmailTarget(e.target.value)} 
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setForwardEmail(null)}>Cancel</Button>
                <Button onClick={handleForwardEmail} disabled={isForwarding || !forwardEmailTarget}>
                    {isForwarding ? <Loader className="mr-2 h-4 w-4" /> : null}
                    Send
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <AlertDialog open={!!contactToDelete} onOpenChange={(open) => !open && setContactToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to delete {contactToDelete?.name}? This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingContact}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={(e) => {
                        e.preventDefault();
                        handleDeleteContact();
                    }}
                    disabled={isDeletingContact}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                    {isDeletingContact ? <Loader className="mr-2 h-4 w-4" /> : null}
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBackToLeads} disabled={loadingBack}>
          {loadingBack ? <Loader /> : <ArrowLeft className="mr-2 h-4 w-4" />}
          Back to {isCompanyProfile ? 'Signed Customers' : 'All Leads'}
        </Button>
        {isSessionActive && (
          <div className="flex items-center gap-2">
              <Button onClick={handleEndSession} variant="destructive"><XCircle className="mr-2 h-4 w-4" />End Session</Button>
              <Button onClick={handleNextLead} disabled={loadingNextLead}>{loadingNextLead ? <Loader /> : <SkipForward className="mr-2 h-4 w-4" />}Next</Button>
          </div>
        )}
      </div>

      {lead.isDuplicate && (
          <Alert className="bg-orange-50 border-orange-200 text-orange-800">
              <AlertCircle className="h-4 w-4 !text-orange-800" />
              <AlertTitle className="font-bold">Merged Lead Record</AlertTitle>
              <AlertDescription>
                  This lead has been merged into a Company Profile. Please view and edit the active record here: <a href={`/companies/${lead.id}`} className="font-bold underline hover:text-orange-900">View Company Profile</a>
              </AlertDescription>
          </Alert>
      )}

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary overflow-hidden relative">
                {lead.avatarUrl ? (
                    <img src={lead.avatarUrl} alt={lead.companyName} className="h-full w-full rounded-lg object-cover" />
                ) : lead.websiteUrl ? (
                    <>
                        <img 
                            src={`https://logo.clearbit.com/${lead.websiteUrl.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0]}`} 
                            alt={lead.companyName} 
                            className="h-full w-full object-contain p-1 bg-white" 
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.classList.remove('hidden');
                                }
                            }}
                        />
                        <Building className="h-8 w-8 hidden" />
                    </>
                ) : (
                    <Building className="h-8 w-8" />
                )}
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{lead.companyName}</h1>
                <div className="flex wrap items-center gap-x-2 gap-y-1 mt-1">
                    <LeadStatusBadge status={lead.customerStatus?.toLowerCase().includes('hot lead') ? 'Hot Lead' : lead.status} />
                    {lead.status === 'Future Follow-up' && lead.followUpDate && (
                        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                          Re-engage: {formatDate(lead.followUpDate)}
                        </Badge>
                    )}
                    {lead.bucket?.toLowerCase().replace(/ /g, '_') === 'inbound' && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Inbound</Badge>
                    )}
                    {(lead.bucket?.toLowerCase().replace(/ /g, '_') === 'outbound' || (!lead.bucket && !lead.fieldSales)) && (
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Outbound</Badge>
                    )}
                    {(lead.bucket?.toLowerCase().replace(/ /g, '_') === 'field_sales' || (!lead.bucket && lead.fieldSales)) && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Field Sales</Badge>
                    )}
                    {lead.bucket?.toLowerCase().replace(/ /g, '_') === 'account_manager' && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Account Manager</Badge>
                    )}
                    {lead.bucket?.toLowerCase().replace(/ /g, '_') === 'customer_success' && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Customer Success</Badge>
                    )}
                    {lead.bucket?.toLowerCase().replace(/ /g, '_') === 'nurture' && (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Nurture</Badge>
                    )}
                    {lead.bucket?.toLowerCase().replace(/ /g, '_') === 'marketing' && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Marketing</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">&bull;</span>
                    <div className="text-muted-foreground text-sm font-medium flex items-center">
                        {(() => {
                            const b = lead.bucket?.toLowerCase().replace(/ /g, '_');
                            if (b === 'outbound' || (!b && !lead.fieldSales)) return <span>Dialer: {lead.dialerAssigned || 'Unassigned'}</span>;
                            if (b === 'inbound' || b === 'account_manager' || (b as any) === 'multisite' || b === 'customer_success' || b === 'nurture' || b === 'marketing') return <span>AM: {lead.accountManagerAssigned || 'Unassigned'}</span>;
                            if (b === 'field_sales' || (!b && lead.fieldSales)) return <span>Field Rep: {lead.salesRepAssigned || (lead as any).fieldRepAssigned || 'Unassigned'}</span>;
                            return <span>Owner: Unassigned</span>;
                        })()}
                    </div>
                    <span className="text-xs text-muted-foreground">&bull;</span>
                    <Popover>
                        <PopoverTrigger asChild>
                            <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-0.5 rounded-full border cursor-pointer hover:bg-secondary/70 transition-colors" title="Click to see how this score is calculated">
                                <ActivityIcon className={cn("w-3.5 h-3.5", engagementScore > 75 ? "text-green-500" : engagementScore > 40 ? "text-yellow-500" : "text-red-500")} />
                                <span className="text-xs font-semibold">Health: {engagementScore}/100</span>
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4">
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm">Health Score Calculation</h4>
                                <p className="text-xs text-muted-foreground">
                                    The health score ({engagementScore}/100) is automatically calculated based on several factors:
                                </p>
                                <ul className="text-xs space-y-1.5 list-disc pl-4 text-muted-foreground">
                                    <li><strong>Activity:</strong> Frequency and recency of calls, emails, and meetings.</li>
                                    <li><strong>Discovery:</strong> Completeness of gathered information (e.g., shipping volume, pain points).</li>
                                    <li><strong>AI Fit:</strong> How well the lead matches the ideal customer profile.</li>
                                </ul>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                {(lead.localMileTrialsRemaining !== undefined || lead.status?.includes('LocalMile') || lead.customerStatus?.includes('LocalMile') || lead.hasCreatedJob === true || String(lead.hasCreatedJob) === 'true' || lead.jobCount !== undefined || lead.lastLocalMileJobCreatedAt !== undefined) && (
                    <div className="flex wrap items-center gap-x-2 gap-y-1 mt-2">
                        {lead.hasCreatedJob === true || String(lead.hasCreatedJob) === 'true' ? (
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" title={`First job created on ${lead.firstJobCreatedAt ? new Date(lead.firstJobCreatedAt).toLocaleDateString() : 'N/A'}`}>
                                Jobs Created: {lead.jobCount?.toString() ?? '0'}
                            </Badge>
                        ) : (
                            lead.status === 'LocalMile Pending' && (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
                                    Pending First Job
                                </Badge>
                            )
                        )}
                        <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200">
                            Trials Remaining: {lead.localMileTrialsRemaining?.toString() ?? '5'}
                        </Badge>
                        {lead.lastLocalMileJobCreatedAt && (
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200">
                                Last Job: {format(new Date(lead.lastLocalMileJobCreatedAt), 'MMM d, h:mm a')}
                            </Badge>
                        )}
                    </div>
                )}
            </div>
        </div>
        <div className="flex flex-col items-end gap-2">
            {renderActionButtons()}
        </div>
      </header>

      {lead.franchisee?.toLowerCase() === 'mailplus pty ltd' && (
          <Alert className="bg-orange-50 border-orange-200 text-orange-800">
              <Info className="h-4 w-4 !text-orange-800" />
              <AlertTitle>Notice</AlertTitle>
              <AlertDescription>
                  Sales options (Signup and Free Trial) are unavailable because this lead belongs to MailPlus Pty Ltd.
              </AlertDescription>
          </Alert>
      )}

      {lead.localMileTrialsRemaining !== undefined && lead.localMileTrialsRemaining <= 1 && (
          <Alert className="bg-red-50 border-red-200 text-red-800 mb-6">
              <AlertCircle className="h-4 w-4 !text-red-800" />
              <AlertTitle className="font-semibold text-red-900">Conversion Call Required</AlertTitle>
              <AlertDescription className="text-red-700">
                  This lead has only <strong>{lead.localMileTrialsRemaining}</strong> LocalMile free trials remaining. Free Trial options are restricted. Please use the <strong>Sales &gt; Signup</strong> workflow to convert this customer.
              </AlertDescription>
          </Alert>
      )}


      {lead.status === 'Trialing ShipMate' && (
          <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                  <div>
                      <AlertTitle className="font-semibold text-blue-900">ShipMate Onboarding Status</AlertTitle>
                      <AlertDescription className="text-blue-700">
                          {lead.providedShipMateOnboarding 
                              ? "ShipMate Onboarding has been successfully completed for this customer." 
                              : "This customer is currently trialing ShipMate. Onboarding is pending."}
                      </AlertDescription>
                  </div>
              </div>
              <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm shrink-0">
                  <Checkbox 
                      id="shipmate-onboarding" 
                      checked={lead.providedShipMateOnboarding || false}
                      onCheckedChange={async (checked) => {
                          const isChecked = !!checked;
                          try {
                              await updateLeadDetails(lead.id, lead, { providedShipMateOnboarding: isChecked });
                              setLead(prev => ({ ...prev, providedShipMateOnboarding: isChecked }));
                              await logActivity(lead.id, {
                                  type: 'Update',
                                  notes: `ShipMate Onboarding status changed to: ${isChecked ? 'Completed' : 'Not Provided'}`,
                                  author: user?.displayName || 'Unknown'
                              });
                              toast({
                                  title: isChecked ? 'Onboarding Complete' : 'Onboarding Reset',
                                  description: isChecked ? 'Marked ShipMate Onboarding as provided.' : 'Marked ShipMate Onboarding as pending.',
                              });
                          } catch (e) {
                              toast({
                                  variant: 'destructive',
                                  title: 'Error',
                                  description: 'Failed to update onboarding status.',
                              });
                          }
                      }}
                  />
                  <label htmlFor="shipmate-onboarding" className="text-sm font-semibold text-blue-950 cursor-pointer select-none">
                      Onboarding Provided
                  </label>
              </div>
          </Alert>
      )}

            <Alert className="bg-primary/5 border-primary/20 flex flex-col sm:flex-row items-start sm:items-center py-3 px-4 shadow-sm mb-6">
        <div className="flex items-center gap-3 flex-1 w-full">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
                <AlertTitle className="text-sm font-semibold mb-0 flex items-center gap-2">
                    AI Suggested Next Action
                </AlertTitle>
                <AlertDescription className="text-sm text-muted-foreground mt-0.5">
                    {lead.nextBestAction ? lead.nextBestAction : "No action suggested yet. Click refresh to generate."}
                </AlertDescription>
            </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleGenerateNextBestAction} disabled={nextBestActionLoading} className="shrink-0 sm:ml-4 mt-3 sm:mt-0 w-full sm:w-auto h-8 bg-white/50 hover:bg-white shadow-sm border border-primary/10">
            {nextBestActionLoading ? <Loader className="w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />} 
            Refresh Action
        </Button>
      </Alert>
      
<main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-6 flex overflow-x-auto w-full h-auto bg-muted/50 p-1.5 rounded-xl md:rounded-full border shadow-inner gap-1 hide-scrollbar">
                <TabsTrigger id="step-tab-profile" value="profile" className="flex-1 min-w-fit whitespace-nowrap px-4 py-2.5 rounded-lg md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm text-muted-foreground transition-all">Profile</TabsTrigger>
                <TabsTrigger id="step-tab-contacts" value="contacts" className="flex-1 min-w-fit whitespace-nowrap px-4 py-2.5 rounded-lg md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm text-muted-foreground transition-all">Contacts</TabsTrigger>
                <TabsTrigger id="step-tab-insights" value="insights" className="flex-1 min-w-fit whitespace-nowrap px-4 py-2.5 rounded-lg md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm text-muted-foreground transition-all">AI Insights</TabsTrigger>
                <TabsTrigger id="step-tab-discovery" value="discovery" className="flex-1 min-w-fit whitespace-nowrap px-4 py-2.5 rounded-lg md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm text-muted-foreground transition-all">Discovery</TabsTrigger>
                <TabsTrigger id="step-tab-quotes" value="quotes" className="flex-1 min-w-fit whitespace-nowrap px-4 py-2.5 rounded-lg md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm text-muted-foreground transition-all">Quotes</TabsTrigger>
                <TabsTrigger id="step-tab-tasks" value="tasks" className="flex-1 min-w-fit whitespace-nowrap px-4 py-2.5 rounded-lg md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm text-muted-foreground transition-all">Tasks</TabsTrigger>
                <TabsTrigger id="step-assignment-ledger" value="history" className="flex-1 min-w-fit whitespace-nowrap px-4 py-2.5 rounded-lg md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm text-muted-foreground transition-all">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="flex flex-col gap-6 mt-0">
                <Card>
             <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-muted-foreground" />Company Details</CardTitle>
                {!isCompanyProfile && (
                    <Button id="step-edit-profile-btn" variant="outline" size="sm" onClick={() => setIsEditLeadDialogOpen(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Details
                    </Button>
                )}
             </CardHeader>
             <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
                    <div className="space-y-8">
                        <DetailItem icon={Key} label="Customer ID" value={lead.entityId} copyable />
                        <DetailItem icon={Hash} label="NetSuite Internal ID" value={(lead as any).internalid || lead.id} copyable />
                        <DetailItem 
                            icon={Tag} 
                            label="Franchisee" 
                            value={lead.franchisee || '- Unassigned -'} 
                            actionIcon={Search}
                            onActionClick={handleFranchiseeLookup}
                            isActionLoading={isLookingUpFranchisee}
                            actionClassName="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        />
                        <DetailItem icon={CalendarIcon} label="Date Entered" value={(() => {
                            const parsed = parseDateString(lead.dateLeadEntered);
                            return parsed && isValid(parsed) ? format(parsed, 'MMM d, yyyy') : '-';
                        })()} />
                    </div>
                    <div className="space-y-8">
                        <DetailItem icon={Mail} label="Email" value={lead.customerServiceEmail} copyable emailClickable />
                        <DetailItem icon={Phone} label="Phone" value={lead.customerPhone} copyable callable leadId={lead.id} />
                        <DetailItem icon={Globe} label="Website" value={lead.websiteUrl} isWebsite />
                        <DetailItem icon={User} label="Sales Rep Assigned" value={lead.salesRepAssigned} isLink linkUrl={lead.salesRepAssignedCalendlyLink} />
                    </div>
                    <div className="space-y-8">
                        <DetailItem icon={Briefcase} label="Campaign" value={lead.campaign} />
                        <DetailItem icon={Briefcase} label="Source" value={lead.customerSource} />
                        <DetailItem icon={Tag} label="Industry" value={lead.industryCategory} />
                        <DetailItem icon={Tag} label="Sub-Industry" value={lead.industrySubCategory || '- None -'} />
                    </div>
                </div>
             </CardContent>
           </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="h-full">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <MapPin className="w-6 h-6 text-muted-foreground" />
                            Address
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                                <p className="text-sm text-muted-foreground leading-relaxed">{fullAddressStr}</p>
                            </div>
                            <div className="flex items-center gap-3 pl-6">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setSelectedAddress(fullAddressStr)}>
                                    <Search className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleCopy(fullAddressStr, 'Address')}>
                                    <Clipboard className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        
                        {lead.latitude && lead.longitude && (
                            <div className="h-48 rounded-xl border overflow-hidden shadow-inner bg-muted mt-4">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    frameBorder="0" 
                                    style={{ border: 0 }} 
                                    src={`https://maps.google.com/maps?q=${lead.latitude},${lead.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}
                        
                        {!isCompanyProfile && (
                            <Button variant="outline" className="w-full bg-sidebar-accent/20 border-none hover:bg-sidebar-accent/30 text-foreground font-medium py-6 rounded-full mt-4" onClick={() => setIsAddressDialogOpen(true)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Address
                            </Button>
                        )}
                    </CardContent>
                </Card>
                <Card className={cn("border-2 transition-all duration-300 h-full flex flex-col", lead.postalAddress?.street ? "border-primary/20" : "border-amber-300 bg-amber-50/10 dark:bg-amber-950/10")}>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                <Inbox className="w-6 h-6 text-primary" />
                                Postal / PO Box Address
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Required for AMPO service to auto-fill the Standing Order Form.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-1 flex flex-col">
                            {lead.postalAddress?.street ? (
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-start gap-2.5">
                                        <Inbox className="w-4.5 h-4.5 text-muted-foreground mt-1 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{lead.postalAddress.street}</p>
                                            <p className="text-sm text-muted-foreground">{lead.postalAddress.city}, {lead.postalAddress.state} {lead.postalAddress.zip}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{lead.postalAddress.country}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg text-xs font-semibold flex-1">
                                    <Info className="w-4 h-4 shrink-0" />
                                    <span>Please add a PO Box address to complete Standing Order requirements.</span>
                                </div>
                            )}
                            {!isCompanyProfile && (
                                <div className="mt-auto">
                                  <Button 
                                      variant="outline" 
                                      className="w-full bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/30 text-primary font-semibold py-5 rounded-full mt-2 transition-all"
                                      onClick={() => setIsPostalAddressDialogOpen(true)}
                                  >
                                      <Edit className="mr-2 h-4 w-4" />
                                      {lead.postalAddress?.street ? 'Edit Postal Address' : 'Add Postal Address'}
                                  </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="h-full flex flex-col">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="w-5 h-5 text-muted-foreground" />
                            Lead Type <span className="text-destructive ml-1">*</span>
                        </CardTitle>
                        <CardDescription className="text-destructive font-medium text-xs">This information is mandatory.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-semibold">
                                        Current Type: {lead.leadType || 'Unassigned'}
                                    </span>
                                </div>
                                <Select 
                                    value={lead.leadType || ""} 
                                    onValueChange={async (val) => {
                                        try {
                                            await updateLeadDetails(lead.id, lead, { leadType: val });
                                            setLead(prev => ({ ...prev, leadType: val }));
                                            toast({ title: 'Updated', description: 'Lead type saved.' });
                                        } catch (e) {
                                            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update lead type.' });
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Product">Product</SelectItem>
                                        <SelectItem value="Service">Service</SelectItem>
                                        <SelectItem value="Service & Product">Service &amp; Product</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
               <Card className="h-full flex flex-col">
                 <CardHeader className="pb-4 border-b">
                    <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-muted-foreground" />Local LPO Mapping</CardTitle>
                    <CardDescription>Manage My Post Business account status and view the automatically linked LPO based on the lead's address. <span className="text-destructive font-medium text-xs">Account information is mandatory.</span></CardDescription>
                 </CardHeader>
                 <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold">
                                Existing Account: {lead.hasMyPostBusinessAccount || 'Unknown'}
                            </span>
                        </div>
                        <Select value={lead.hasMyPostBusinessAccount || ""} onValueChange={handleMyPostBusinessChange}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg border">
                        <DetailItem 
                            icon={MapPin} 
                            label="Designated LPO (Franchisee)" 
                            value={isAusPostLoading ? 'Loading...' : (ausPostParentLpoId ? `${ausPostParentLpoId}${ausPostLpoName ? ` - ${ausPostLpoName}` : ''}` : '- No Match -')} 
                        />
                    </div>
                 </CardContent>
               </Card>
               <MultiSiteManager lead={lead as Lead} contacts={contacts} onLocationsUpdated={() => window.location.reload()} />
            </div>
            </TabsContent>

            <TabsContent value="insights" className="flex flex-col gap-6 mt-0">
                <Card className="border border-primary/10 shadow-md">
                    <CardHeader className="pb-4 border-b flex flex-row items-center justify-between flex-wrap gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary animate-pulse" />AI Company Insights</CardTitle>
                            <CardDescription>Scan the lead's website to retrieve company details, audience targeting, and logistics needs.</CardDescription>
                        </div>
                        {lead.websiteUrl ? (
                            <Button 
                                onClick={handleGatherCompanyInsights} 
                                disabled={isAnalyzingWebsite}
                                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 py-2.5 rounded-full shadow-md flex items-center gap-2"
                            >
                                {isAnalyzingWebsite ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Analyzing Website...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Scan Website
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button disabled variant="outline" className="rounded-full">
                                No Website Configured
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="pt-6">
                        {!lead.websiteUrl ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-amber-50/50 rounded-xl border border-amber-100">
                                <Globe className="w-10 h-10 text-amber-500 mb-3" />
                                <h3 className="font-semibold text-amber-800 text-lg mb-1">No Website Url Found</h3>
                                <p className="text-sm text-amber-600/80 max-w-md">
                                    Please edit this lead's details to add a company website URL before scanning with AI bots.
                                </p>
                            </div>
                        ) : companyInsights.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/30 rounded-xl border border-dashed">
                                <Sparkles className="w-12 h-12 text-muted-foreground/50 mb-4" />
                                <h3 className="font-semibold text-foreground text-lg mb-1">No Website Insights Yet</h3>
                                <p className="text-sm text-muted-foreground max-w-md mb-6">
                                    Click "Scan Website" to let the AI bots fetch `{lead.websiteUrl}` and gather details about their business, target audience, and courier requirements.
                                </p>
                                <Button 
                                    onClick={handleGatherCompanyInsights} 
                                    disabled={isAnalyzingWebsite}
                                    variant="outline"
                                    className="rounded-full shadow-sm"
                                >
                                    {isAnalyzingWebsite ? (
                                        <>
                                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                                            Scanning...
                                        </>
                                    ) : (
                                        "Initiate First Scan"
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Latest Scan Results */}
                                {companyInsights[0] && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between pb-2 border-b">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                                <Clock className="w-3.5 h-3.5" /> Latest Analysis: {new Date(companyInsights[0].scannedAt).toLocaleString()}
                                            </span>
                                            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
                                                Active Insight
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-2 space-y-6">
                                                {/* Company Overview Card */}
                                                <Card className="bg-muted/30 border border-muted-foreground/10">
                                                    <CardHeader className="py-4 border-b">
                                                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                                            <Building className="w-4 h-4 text-primary" /> Company Overview
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-4 space-y-3">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Company Name</span>
                                                                <p className="text-sm font-semibold text-foreground mt-0.5">{companyInsights[0].companyName || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Industry</span>
                                                                <p className="text-sm font-semibold text-foreground mt-0.5">{companyInsights[0].industry || '-'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="border-t pt-3">
                                                            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Products & Services</span>
                                                            <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap">{companyInsights[0].productsServices || '-'}</p>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-3">
                                                            <div>
                                                                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Target Audience</span>
                                                                <p className="text-sm text-foreground/90 mt-0.5">{companyInsights[0].targetAudience || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Value Proposition</span>
                                                                <p className="text-sm text-foreground/90 mt-0.5">{companyInsights[0].valueProposition || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Logistics and Courier Needs Card */}
                                                <Card className="border-l-4 border-l-primary bg-primary/5 border-primary/10">
                                                    <CardHeader className="py-4 border-b border-primary/10">
                                                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                                                            <Package className="w-4 h-4" /> Logistics & Shipping Needs Analysis
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-4">
                                                        <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                                                            {companyInsights[0].shippingLogisticsNeeds || "No shipping-specific analysis could be parsed from the website."}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* Talking Points & Contact Info Column */}
                                            <div className="space-y-6">
                                                <Card className="bg-primary/5 border border-primary/20 shadow-sm">
                                                    <CardHeader className="py-4 border-b border-primary/10">
                                                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                                                            <CheckCircle2 className="w-4 h-4" /> Cold Call Talking Points
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-4 px-4 pb-4">
                                                        {companyInsights[0].talkingPoints && companyInsights[0].talkingPoints.length > 0 ? (
                                                            <ul className="space-y-3">
                                                                {companyInsights[0].talkingPoints.map((tp, idx) => (
                                                                    <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90 leading-relaxed">
                                                                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 bg-emerald-50 rounded-full p-0.5" />
                                                                        <span>{tp}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground">No custom talking points generated.</p>
                                                        )}
                                                    </CardContent>
                                                </Card>

                                                {/* Extracted Contacts Card */}
                                                <Card className="bg-muted/10 border border-muted-foreground/10">
                                                    <CardHeader className="py-4 border-b">
                                                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                                            <Users className="w-4 h-4 text-muted-foreground" /> Extracted Web Contacts
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-4 space-y-3">
                                                        <div>
                                                            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Emails Found</span>
                                                            {companyInsights[0].extractedEmails && companyInsights[0].extractedEmails.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                    {companyInsights[0].extractedEmails.map((email, idx) => (
                                                                        <span key={idx} className="text-[11px] bg-muted-foreground/10 border text-foreground/90 font-medium px-2 py-0.5 rounded-md truncate max-w-full">
                                                                            {email}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground mt-1 block text-muted-foreground/60">- None detected -</span>
                                                            )}
                                                        </div>
                                                        <div className="border-t pt-3">
                                                            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phones Found</span>
                                                            {companyInsights[0].extractedPhones && companyInsights[0].extractedPhones.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                    {companyInsights[0].extractedPhones.map((phone, idx) => (
                                                                        <span key={idx} className="text-[11px] bg-muted-foreground/10 border text-foreground/90 font-medium px-2 py-0.5 rounded-md">
                                                                            {phone}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground mt-1 block text-muted-foreground/60">- None detected -</span>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>

                                        {/* Raw Summary Accordion */}
                                        <Card className="border border-muted-foreground/10">
                                            <CardHeader className="py-4 border-b bg-muted/20">
                                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-muted-foreground" /> Full Website Text Summary
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                                    {companyInsights[0].rawSummary || "-"}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Scan History */}
                                {companyInsights.length > 1 && (
                                    <div className="mt-8 pt-6 border-t">
                                        <h4 className="text-sm font-bold flex items-center gap-2 mb-4"><History className="w-4 h-4 text-muted-foreground" /> Scan History</h4>
                                        <div className="space-y-2">
                                            {companyInsights.slice(1).map((insight) => (
                                                <div key={insight.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-lg text-xs">
                                                    <div className="flex items-center gap-3">
                                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                                        <div>
                                                            <span className="font-semibold text-foreground/90">{insight.companyName || "Company Scanned"}</span>
                                                            <span className="text-muted-foreground ml-2">({insight.industry || "General"})</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-muted-foreground">{new Date(insight.scannedAt).toLocaleDateString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="discovery" className="flex flex-col gap-6 mt-0">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Route className="w-5 h-5 text-muted-foreground" />Discovery</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setIsDiscoveryQuestionsOpen(true)} className="mt-2">Open Form</Button>
                    </CardHeader>
                    <CardContent>
                        {lead.discoveryData ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center gap-4 p-3 rounded-lg bg-muted">
                                    <div className="text-center"><p className="text-xs text-muted-foreground">Score</p><p className="text-xl font-bold">{lead.discoveryData.score}</p></div>
                                    <div className="text-center"><p className="text-sm text-muted-foreground">Routing</p><Badge variant="outline">{lead.discoveryData.routingTag}</Badge></div>
                                </div>
                                <DiscoveryRadarChart discoveryData={lead.discoveryData} />
                            </div>
                        ) : <p className="text-sm text-muted-foreground text-center">No discovery data yet.</p>}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="contacts" className="flex flex-col gap-6 mt-0">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-muted-foreground" />Contacts</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setIsAddingContact(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {contacts.map(contact => (
                            <Card key={contact.id} className="p-3 text-sm relative group">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => setContactToEdit(contact)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => setContactToDelete(contact)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold">{contact.name}</p>
                                    {contact.accessToLocalMile === 'yes' && (
                                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 py-0 h-4">LocalMile Access</Badge>
                                    )}
                                    {contact.accessToShipMate === 'yes' && (
                                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 py-0 h-4">ShipMate Access</Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{contact.title}</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3 h-3 text-muted-foreground" />
                                        {contact.email ? (
                                            <button 
                                                onClick={() => handleEmailClick(contact.email)} 
                                                className="text-primary hover:underline font-semibold text-left"
                                            >
                                                {contact.email}
                                            </button>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{contact.phone} <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleInitiateCall(lead.id, contact.phone)}><PhoneCall className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleInitiateSms(contact.phone, contact.name)}><MessageSquare className="h-3 w-3" /></Button></div>
                                    
                                    {contact.localMilePlusAuthLink && contact.securityCode && (
                                        <div className="mt-3 pt-2 border-t border-muted-foreground/20 space-y-1 text-xs">
                                            <p className="font-semibold text-primary">LocalMile.Plus Access Info:</p>
                                            <p className="flex items-center gap-2">
                                                <span className="font-medium">Link:</span>
                                                <a href={contact.localMilePlusAuthLink} target="_blank" className="text-blue-600 hover:underline truncate max-w-[150px]" title={contact.localMilePlusAuthLink}>{contact.localMilePlusAuthLink}</a>
                                                <Button variant="ghost" size="icon" className="h-4 w-4 ml-auto" onClick={() => handleCopy(contact.localMilePlusAuthLink, 'Auth Link')}><Clipboard className="h-3 w-3" /></Button>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <span className="font-medium">Code:</span>
                                                <span className="font-mono bg-muted px-1 py-0.5 rounded">{contact.securityCode}</span>
                                                <Button variant="ghost" size="icon" className="h-4 w-4 ml-auto" onClick={() => handleCopy(contact.securityCode, 'Security Code')}><Clipboard className="h-3 w-3" /></Button>
                                            </p>
                                            <div className="flex flex-col gap-2 mt-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="w-full text-xs" 
                                                    onClick={() => handleResendLocalMileEmail(contact)}
                                                >
                                                    <Mail className="w-3 h-3 mr-2" />
                                                    Resend Auth Email
                                                </Button>
                                                {userProfile?.activeRole === 'admin' && (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="w-full text-xs text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700" 
                                                        onClick={() => handleRecreateSecurityCode(contact)}
                                                    >
                                                        <RefreshCw className="w-3 h-3 mr-2" />
                                                        Recreate Security Code
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </CardContent>
                </Card>

            </TabsContent>

            <TabsContent value="quotes" className="flex flex-col gap-6 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="h-full">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <CheckSquare className="w-5 h-5 text-muted-foreground" />
                                Agreements &amp; T&amp;C's
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg border gap-4">
                                <div>
                                    <p className="font-semibold text-sm">LocalMile Platform T&amp;C's</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {lead.localMileTermsAcceptedAt || lead.localMileTnCAcceptedAt 
                                            ? `Accepted on ${format(new Date(lead.localMileTermsAcceptedAt || lead.localMileTnCAcceptedAt!), 'PPpp')}`
                                            : "Pending acceptance"}
                                    </p>
                                </div>
                                <Badge variant={lead.localMileTermsAcceptedAt || lead.localMileTnCAcceptedAt ? "outline" : "secondary"} className={lead.localMileTermsAcceptedAt || lead.localMileTnCAcceptedAt ? "bg-green-100 text-green-700 border-green-200" : ""}>
                                    {lead.localMileTermsAcceptedAt || lead.localMileTnCAcceptedAt ? "Accepted" : "Pending"}
                                </Badge>
                            </div>
                            {scfLinks.length > 0 && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg border gap-4">
                                    <div>
                                        <p className="font-semibold text-sm">Service Commencement Form (SCF) T&amp;C's</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {scfLinks.some(s => s.status === 'Accepted') 
                                                ? `Accepted via SCF`
                                                : "Pending acceptance via SCF"}
                                        </p>
                                    </div>
                                    <Badge variant={scfLinks.some(s => s.status === 'Accepted') ? "outline" : "secondary"} className={scfLinks.some(s => s.status === 'Accepted') ? "bg-green-100 text-green-700 border-green-200" : ""}>
                                        {scfLinks.some(s => s.status === 'Accepted') ? "Accepted" : "Pending"}
                                    </Badge>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    {scfLinks.length > 0 && (
                    <Card className="h-full">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-muted-foreground" />
                                Service Commencement Forms
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                {scfLinks.map(scf => (
                                    <div key={scf.id} className="flex flex-wrap items-center justify-between p-4 bg-muted/50 rounded-lg border gap-4">
                                        <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">SCF Generated</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-medium ${scf.status === 'Accepted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {scf.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <CalendarIcon className="h-3 w-3" />
                                                {formatDate(scf.createdAt)}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                                            <Button variant="outline" size="sm" asChild className="flex-1 bg-white hover:bg-slate-50 text-[#095c7b] border-[#095c7b]">
                                                <a href={`/scf/${scf.id}`} target="_blank" rel="noopener noreferrer">
                                                    <LinkIcon className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">View Form</span>
                                                </a>
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleCopy(`${window.location.origin}/scf/${scf.id}`, 'SCF Link')} className="flex-1">
                                                <Clipboard className="h-4 w-4 mr-2 shrink-0" /> <span className="truncate">Copy Link</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    )}
                    {hasAmpoService && (
                    <Card className={cn("border-2 h-full flex flex-col", lead.sofDetails?.signatureDataUrl ? "border-green-200 bg-green-50/5" : "border-amber-200 bg-amber-50/5")}>
                        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                    <FileText className="w-5 h-5 text-primary" />
                                    Australia Post Standing Order Form (SOF)
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Required for delivery of Signature on Delivery Mail (R9B)
                                </CardDescription>
                            </div>
                            {lead.sofDetails?.signatureDataUrl && (
                                <Badge variant="outline" className="bg-green-100 border-green-200 text-green-800 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Signed &amp; Authorized
                                </Badge>
                            )}
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4 flex-1 flex flex-col justify-center">
                            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
                                <div className="space-y-1 flex-1 min-w-[200px]">
                                    <p className="text-sm font-semibold">Digital Standing Order Form</p>
                                    <p className="text-xs text-muted-foreground break-words">
                                        {lead.sofDetails?.signatureDataUrl 
                                            ? `Digitally signed by ${lead.sofDetails.position} on ${lead.sofDetails.date}`
                                            : "Pending signature. Please enter postal details first, then sign."}
                                    </p>
                                </div>
                                <Button 
                                    onClick={() => setIsSofDialogOpen(true)}
                                    className={cn("flex-1 min-w-[200px] font-semibold shadow-sm transition-all shrink-0", lead.sofDetails?.signatureDataUrl ? "bg-[#095c7b] hover:bg-[#095c7b]/90 text-white" : "bg-amber-500 hover:bg-amber-600 text-white")}
                                >
                                    <FileText className="w-4 h-4 mr-2 shrink-0" />
                                    <span className="truncate">{lead.sofDetails?.signatureDataUrl ? "View / Export Signed SOF" : "Open & Sign SOF"}</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    )}
                </div>
            {lead.services && lead.services.length > 0 && (
                <Card >
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-muted-foreground" />
                            Selected Services
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Service Name</TableHead>
                                        <TableHead>Frequency</TableHead>
                                        <TableHead>Rate</TableHead>
                                        <TableHead>Start Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lead.services.map((svc, idx) => (
                                        <TableRow key={idx} className={idx % 2 === 0 ? "bg-slate-50/80" : "bg-white"}>
                                            <TableCell className="font-medium">{svc.name}</TableCell>
                                            <TableCell>
                                                {Array.isArray(svc.frequency) 
                                                    ? (svc.frequency.length === 5 ? 'Daily' : svc.frequency.join(', '))
                                                    : svc.frequency}
                                            </TableCell>
                                            <TableCell>
                                                {svc.rate ? `$${Number(svc.rate).toFixed(2)}` : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {svc.startDate ? format(new Date(svc.startDate), 'MMM d, yyyy') : (svc.trialStartDate && svc.trialEndDate ? `Trial: ${format(new Date(svc.trialStartDate), 'MMM d')} - ${format(new Date(svc.trialEndDate), 'MMM d, yyyy')}` : '-')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
                <LeadProducts lead={lead} />
                </TabsContent>

            <TabsContent value="tasks" className="flex flex-col gap-6 mt-0">
                <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-muted-foreground" />Appointments</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {(() => {
                        const allAppointmentsMap = new Map();
                        appointments.forEach(a => allAppointmentsMap.set(a.id, a));
                        subAppointments.forEach(a => allAppointmentsMap.set(a.id, a));
                        const allAppointments = Array.from(allAppointmentsMap.values()).sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
                        
                        if (allAppointments.length === 0) return <p className="text-sm text-muted-foreground text-center">No appointments.</p>;

                        return allAppointments.map(a => {
                            const dateStr = a.date || a.duedate;
                            const person = a.amName || a.assignedTo;
                            return (
                                <div key={a.id} className="text-sm p-3 bg-muted rounded-md shadow-sm border border-border/40 relative flex flex-col gap-1.5">
                                    <div className="flex justify-between items-start">
                                        <div className="font-semibold text-foreground">Appt with {person} on {dateStr ? formatInTimezone(dateStr, a.timezone || 'Australia/Sydney', 'PP') : 'Unknown'}</div>
                                        <div className="flex items-center gap-2">
                                            {a.appointmentStatus && (
                                                <Badge 
                                                    variant="outline"
                                                    className={
                                                        a.appointmentStatus === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        a.appointmentStatus === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        a.appointmentStatus === 'Rescheduled' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                        'bg-slate-50 text-slate-700 border-slate-200'
                                                    }
                                                >
                                                    {a.appointmentStatus}
                                                </Badge>
                                            )}
                                            {(!a.appointmentStatus || a.appointmentStatus === 'Pending') && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 px-2 text-xs border bg-background">Manage</Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => {
                                                            const notes = window.prompt("Add notes for completion (optional):");
                                                            if (notes !== null) handleUpdateAppointment(a, { appointmentStatus: 'Completed', notes });
                                                        }}>Mark Completed</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => {
                                                            const notes = window.prompt("Add cancellation reason/notes (optional):");
                                                            if (notes !== null) handleUpdateAppointment(a, { appointmentStatus: 'Cancelled', notes });
                                                        }}>Mark Cancelled</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => {
                                                            if (!lead.bookingUrlId) {
                                                                toast({ variant: 'destructive', title: "Lead does not have a booking URL ID" });
                                                                return;
                                                            }
                                                            const url = `/book/${lead.bookingUrlId}?reschedule=${a.id}`;
                                                            window.open(url, '_blank');
                                                        }}>Reschedule</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                    {a.type && <div className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>{a.type === 'teams' ? 'Microsoft Teams Meeting' : 'Phone Call'}</div>}
                                    {a.joinUrl && <div><a href={a.joinUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">Join Meeting</a></div>}
                                    {a.notes && <div className="mt-1 p-2 bg-background border rounded text-xs text-muted-foreground whitespace-pre-wrap"><span className="font-semibold text-foreground">Notes:</span> {a.notes}</div>}
                                </div>
                            );
                        });
                    })()}
                </CardContent>
          </Card>
                <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><ListTodo className="w-5 h-5 text-muted-foreground" />Tasks</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleAddTask} className="flex flex-col gap-2">
                        <Input placeholder="New task..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
                        <div className="flex gap-2">
                            <Popover>
                                <PopoverTrigger asChild><Button variant="outline" className="flex-1 text-left font-normal">{newTaskDueDate ? format(newTaskDueDate, "PPP") : "Pick date"}</Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><CalendarPicker mode="single" selected={newTaskDueDate} onSelect={setnewTaskDueDate} initialFocus /></PopoverContent>
                            </Popover>
                            <Button type="submit" size="icon"><PlusCircle className="h-4 w-4" /></Button>
                        </div>
                    </form>
                    <div className="space-y-2">
                        {tasks.map(t => <div key={t.id} className="flex items-center gap-2 text-sm"><Checkbox checked={t.isCompleted} onCheckedChange={(c) => handleToggleTask(t.id, !!c)} /><span className={cn(t.isCompleted && "line-through text-muted-foreground")}>{t.title}</span></div>)}
                    </div>
                </CardContent>
            </Card>
                {linkedVisitNote && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Info className="w-5 h-5 text-muted-foreground" />Field Discovery from Visit Note</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {linkedVisitNote.outcome && (
                            <div className="p-3 bg-muted rounded-md border text-sm font-semibold flex items-center justify-between">
                                <span>Visit Outcome:</span>
                                <Badge variant="secondary">{linkedVisitNote.outcome.type}</Badge>
                            </div>
                        )}
                        {linkedVisitNote.scheduledDate && (
                            <Alert className="bg-primary/5 border-primary/20">
                                <CalendarIcon className="h-4 w-4 text-primary" />
                                <AlertTitle>Scheduled Follow-up</AlertTitle>
                                <AlertDescription>{formatInTimezone(linkedVisitNote.scheduledDate, linkedVisitNote.capturedTimezone || 'Australia/Sydney', 'PPP')} {linkedVisitNote.scheduledTime && `@ ${linkedVisitNote.scheduledTime}`}</AlertDescription>
                            </Alert>
                        )}
                        <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted">
                            <div className="text-center"><p className="text-xs text-muted-foreground">Score</p><p className="text-xl font-bold">{linkedVisitNote.discoveryData?.score ?? 'N/A'}</p></div>
                            <div className="text-center"><p className="text-xs text-muted-foreground">Routing</p><Badge variant="outline">{linkedVisitNote.discoveryData?.routingTag ?? 'N/A'}</Badge></div>
                        </div>
                        {linkedVisitNote.discoveryData && <DiscoveryRadarChart discoveryData={linkedVisitNote.discoveryData as DiscoveryData} />}
                        
                        <div className="space-y-2 pt-4 border-t">
                            <h4 className="font-semibold text-sm">Visit Note Content:</h4>
                            <div className="p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap italic text-muted-foreground">
                                {linkedVisitNote.content}
                            </div>
                        </div>

                        <div className="text-sm space-y-3 pt-4 border-t">
                            <h4 className="font-semibold text-primary">Captured Details:</h4>
                            <div className="grid grid-cols-1 gap-y-3">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Metadata</span>
                                    <p className="text-muted-foreground"><strong>By:</strong> {linkedVisitNote.capturedBy} &bull; <strong>Outcome:</strong> {linkedVisitNote.outcome?.type || 'N/A'}</p>
                                </div>
                                
                                {linkedVisitNote.discoveryData?.personSpokenWithName && (
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Contact Spoken With</span>
                                        <p className="text-muted-foreground">{linkedVisitNote.discoveryData.personSpokenWithName} ({linkedVisitNote.discoveryData.personSpokenWithTitle || 'Contact'})</p>
                                    </div>
                                )}

                                {linkedVisitNote.discoveryData?.discoveryAnswers && linkedVisitNote.discoveryData.discoveryAnswers.length > 0 && (
                                    <div className="flex flex-col gap-2 mt-1">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Field Discovery Answers</span>
                                        <div className="space-y-3">
                                            {linkedVisitNote.discoveryData.discoveryAnswers.map((ans, idx) => (
                                                <div key={idx} className="bg-muted/30 p-2 rounded-md border-l-2 border-primary/20">
                                                    <p className="text-[11px] font-semibold text-foreground/80 leading-tight">{ans.question}</p>
                                                    <p className="text-sm mt-1 text-foreground font-medium">{ans.answer}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {linkedVisitNote.discoveryData?.discoverySignals && linkedVisitNote.discoveryData.discoverySignals.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Signals Observed</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {linkedVisitNote.discoveryData.discoverySignals.map(s => (
                                                <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
            </TabsContent>
            <TabsContent value="history" className="flex flex-col gap-6 mt-0">
                <Card>
                    <CardHeader className="pb-3 border-b"><CardTitle className="flex items-center gap-2"><ClipboardEdit className="w-5 h-5 text-muted-foreground" />Notes</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {notes.map(note => (
                            <div key={note.id} className="text-sm border-l-2 pl-4 py-1 border-primary/40"><p>{note.content}</p><p className="text-xs text-muted-foreground mt-1">{format(new Date(note.date), 'PPpp')} by {note.author}</p></div>
                        ))}
                        {notes.length === 0 && <p className="text-sm text-muted-foreground text-center">No notes found.</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3 border-b"><CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-muted-foreground" />Calls</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {callHistory.map(call => (
                            <div key={call.id} className="text-sm border-b pb-2"><p className="font-medium">{call.notes}</p><p className="text-xs text-muted-foreground">{format(new Date(call.date), 'PPpp')} ({call.duration})</p></div>
                        ))}
                        {callHistory.length === 0 && <p className="text-sm text-muted-foreground text-center">No calls found.</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3 border-b"><CardTitle className="flex items-center gap-2"><ActivityIcon className="w-5 h-5 text-muted-foreground" />Activity</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-2">
                        {activities.map(a => (
                            <div key={a.id} className="text-xs flex flex-col sm:flex-row sm:justify-between border-b pb-2 last:border-b-0 gap-1 sm:gap-4">
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-medium text-foreground">{a.notes}</span>
                                    {a.author && <span className="text-[10px] text-muted-foreground">Performed by: {a.author}</span>}
                                </div>
                                <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0 self-start sm:self-center">
                                    {formatInTimezone(a.date, 'Australia/Sydney', 'PPpp')}
                                </span>
                            </div>
                        ))}
                        {activities.length === 0 && <p className="text-sm text-muted-foreground text-center">No activity found.</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3 border-b"><CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-muted-foreground" />Emails</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {lead.emails?.map(email => (
                            <div key={email.id} className="text-sm border-b pb-2 flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <p className="font-medium">{email.subject}</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(email.sentAt), 'PPpp')} to {email.recipient}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setPreviewEmail(email)}>Preview</Button>
                                    <Button variant="outline" size="sm" onClick={() => setForwardEmail(email)}>Forward</Button>
                                </div>
                            </div>
                        ))}
                        {(!lead.emails || lead.emails.length === 0) && <p className="text-sm text-muted-foreground text-center">No emails sent yet.</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3 border-b"><CardTitle className="flex items-center gap-2"><Move className="w-5 h-5 text-muted-foreground" />Bucket History</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {lead.bucketHistory && lead.bucketHistory.length > 0 ? (
                            <div className="space-y-3">
                                {lead.bucketHistory.map((history) => (
                                    <div key={history.id} className="text-sm border-l-2 pl-4 py-1 border-primary/30">
                                        <p className="font-semibold text-slate-700">
                                            Moved from <span className="capitalize">{history.oldBucket.replace('_', ' ')}</span> to <span className="capitalize">{history.newBucket.replace('_', ' ')}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {isValid(new Date(history.date)) ? format(new Date(history.date), 'PPpp') : history.date} by {history.author}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center">No bucket changes recorded.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>

        </div>
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 self-start">
               <Card className="bg-primary/5 border-primary shadow-sm">
                 <CardHeader className="pb-3 border-b border-primary/10">
                    <CardTitle className="flex items-center gap-2 text-primary font-bold"><Move className="w-5 h-5" />Bucket Allocation</CardTitle>
                 </CardHeader>
                 <CardContent className="pt-4 space-y-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-foreground">
                                Current Bucket: {
                                    lead.bucket === 'inbound' ? 'Inbound' :
                                    lead.bucket === 'account_manager' ? 'Account Manager' :
                                    lead.bucket === 'customer_success' ? 'Customer Success' :
                                    lead.bucket === 'nurture' ? 'Nurture' :
                                    lead.bucket === 'marketing' ? 'Marketing' :
                                    lead.fieldSales ? 'Field Sales' : 'Outbound'
                                }
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                                {lead.bucket === 'inbound' 
                                    ? 'This lead came through an inbound channel and is awaiting processing.' 
                                    : lead.bucket === 'account_manager'
                                        ? 'This lead is managed by an Account Manager.'
                                        : lead.bucket === 'customer_success'
                                            ? 'This lead is managed by the Customer Success team.'
                                            : lead.bucket === 'nurture'
                                                ? 'This lead is in the nurture campaign.'
                                                : lead.bucket === 'marketing'
                                                    ? 'This lead is in the marketing campaign.'
                                                    : lead.fieldSales 
                                                        ? 'This lead is currently routed to the field sales team.' 
                                                        : 'This lead is currently routed to the outbound dialing team.'}
                            </span>
                        </div>
                        {userProfile?.activeRole === 'admin' ? (
                            <Select value={lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound')} onValueChange={handleBucketChange}>
                                <SelectTrigger className="w-full bg-white border-primary/20 shadow-sm">
                                    <SelectValue placeholder="Select bucket" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="inbound">Inbound</SelectItem>
                                    <SelectItem value="outbound">Outbound</SelectItem>
                                    <SelectItem value="field_sales">Field Sales</SelectItem>
                                    <SelectItem value="account_manager">Account Manager</SelectItem>
                                    <SelectItem value="customer_success">Customer Success</SelectItem>
                                    <SelectItem value="nurture">Nurture</SelectItem>
                                    <SelectItem value="marketing">Marketing</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <Badge variant="secondary" className="w-max bg-primary/10 text-primary">
                                {lead.bucket === 'inbound' ? 'Inbound Bucket' : lead.bucket === 'account_manager' ? 'Account Manager Bucket' : lead.bucket === 'customer_success' ? 'Customer Success Bucket' : lead.bucket === 'nurture' ? 'Nurture Bucket' : lead.bucket === 'marketing' ? 'Marketing Bucket' : lead.fieldSales ? 'Field Sales Bucket' : 'Outbound Bucket'}
                            </Badge>
                        )}
                    </div>
                    
                    {(lead.bucket === 'account_manager' || lead.bucket === 'inbound') && (
                        <div className="flex flex-col gap-3 pt-3 border-t border-primary/10">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-foreground">
                                    Account Manager: {lead.accountManagerAssigned || 'Unassigned'}
                                </span>
                            </div>
                            <Select value={lead.accountManagerAssigned || undefined} onValueChange={handleAccountManagerChange}>
                                <SelectTrigger className="w-full bg-white border-primary/20 shadow-sm">
                                    <SelectValue placeholder="Assign AM" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accountManagers.length === 0 && (
                                        <SelectItem value="none" disabled>No Account Managers found</SelectItem>
                                    )}
                                    {accountManagers.map(am => (
                                        <SelectItem key={am} value={am}>{am}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {lead.bookingUrlId && (
                                <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                    <p className="text-xs text-blue-800 font-medium mb-1">Booking Link for Lead</p>
                                    <div className="flex items-center gap-2">
                                        <Input readOnly value={`${window.location.origin}/book/${lead.bookingUrlId}`} className="h-8 text-xs bg-white" />
                                        <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/book/${lead.bookingUrlId}`);
                                            toast({ title: 'Copied', description: 'Booking link copied to clipboard.' });
                                        }}>Copy</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {lead.bucket === 'customer_success' && (
                        <div className="flex flex-col gap-3 pt-3 border-t border-primary/10">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-foreground">
                                    Customer Success: {lead.customerSuccessAssigned || 'Unassigned'}
                                </span>
                            </div>
                            <Select value={lead.customerSuccessAssigned || undefined} onValueChange={handleCustomerSuccessChange}>
                                <SelectTrigger className="w-full bg-white border-primary/20 shadow-sm">
                                    <SelectValue placeholder="Assign CS" />
                                </SelectTrigger>
                                <SelectContent>
                                    {csReps.length === 0 && (
                                        <SelectItem value="none" disabled>No CS reps found</SelectItem>
                                    )}
                                    {csReps.map(cs => (
                                        <SelectItem key={cs} value={cs}>{cs}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                 </CardContent>
               </Card>
            <Card className="border-primary bg-primary/5">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg">Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {isCompanyProfile && (
                        <Button className="w-full justify-start font-medium bg-background hover:bg-muted" variant="outline" onClick={() => setIsUpsellDialogOpen(true)}>
                            <TrendingUp className="mr-2 h-4 w-4" />Record Upsell
                        </Button>
                    )}
                    {(!isCompanyProfile && (showCall || showProcessLead)) && (
                        <Button id="step-post-call-outcome" className="w-full justify-start font-medium" variant="default" onClick={() => requireLeadType(() => { setPreSelectedOutcome(''); setDialogProcessMode(false); setShowPostCallDialog(true); })}>
                            <PhoneCall className="mr-2 h-4 w-4" />Log Outcome / Call
                        </Button>
                    )}
                    {((!isCompanyProfile && showNote) || isCompanyProfile) && (
                        <Button id="step-log-note-btn" className="w-full justify-start bg-background hover:bg-muted" variant="outline" onClick={() => setIsLogNoteOpen(true)}>
                            <ClipboardEdit className="mr-2 h-4 w-4" />Log a Note
                        </Button>
                    )}
                    {!isCompanyProfile && showSchedule && (
                        <Button className="w-full justify-start bg-background hover:bg-muted" variant="outline" onClick={() => setIsScheduleAppointmentOpen(true)}>
                            <CalendarIcon className="mr-2 h-4 w-4" />Schedule Appointment
                        </Button>
                    )}
                    {!isCompanyProfile && showSchedule && lead.bookingUrlId && (
                        <Button className="w-full justify-start bg-background hover:bg-muted" variant="outline" onClick={() => {
                            const url = `${window.location.origin}/book/${lead.bookingUrlId}`;
                            navigator.clipboard.writeText(url);
                            toast({ title: 'Link Copied', description: 'Booking link copied to clipboard.' });
                        }}>
                            <LinkIcon className="mr-2 h-4 w-4" />Copy Booking Link
                        </Button>
                    )}
                </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50/30 shadow-sm">
                <CardHeader className="pb-3 border-b border-orange-100">
                    <CardTitle className="flex items-center gap-2 text-lg text-orange-800"><TrendingUp className="w-5 h-5" />Marketing & Nurture</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <Button className="w-full justify-start bg-white hover:bg-orange-100 border-orange-200 text-orange-800 font-medium" variant="outline" onClick={() => requireLeadType(() => setIsMarketingListDialogOpen(true))}>
                        <ListFilter className="mr-2 h-4 w-4" />Add to Marketing List
                    </Button>
                    <div className="pt-2">
                        <LeadNurtureCard 
                            leadId={lead.id} 
                            leadData={lead} 
                            onRefreshLead={async () => {
                                const docRef = doc(firestore, 'leads', lead.id);
                                const docSnap = await getDoc(docRef);
                                if (docSnap.exists()) {
                                    setLead({ id: docSnap.id, ...docSnap.data() } as Lead);
                                }
                            }} 
                        />
                    </div>
                </CardContent>
            </Card>

            {isCompanyProfile && (
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-muted-foreground" />Invoices</CardTitle></CardHeader>
                    <CardContent>
                        {loadingInvoices ? <Loader /> : invoices.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>ID</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map(inv => (
                                        <TableRow key={inv.id}>
                                            <TableCell>{inv.invoiceDate ? format(new Date(inv.invoiceDate), 'PP') : 'N/A'}</TableCell>
                                            <TableCell className="font-medium">{inv.invoiceDocumentID || inv.documentId}</TableCell>
                                            <TableCell className="text-right">${Number(inv.invoiceTotal).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                {inv.invoiceURL ? (
                                                    <Button size="sm" variant="outline" asChild>
                                                        <a href={inv.invoiceURL} target="_blank" rel="noopener noreferrer">
                                                            <ExternalLink className="h-4 w-4 mr-2" />
                                                            View
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">No link</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-xl border border-dashed">
                                <FileText className="w-8 h-8 text-muted-foreground/50 mb-3" />
                                <p className="text-sm text-muted-foreground">No invoices found.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

        </div>

</main>
    </div>
    <MapModal isOpen={!!selectedAddress} onClose={() => setSelectedAddress(null)} address={selectedAddress || ''} />
    <LogNoteDialog lead={lead} onNoteLogged={handleNoteLogged} isOpen={isLogNoteOpen} onOpenChange={setIsLogNoteOpen}/>
    <ServiceSelectionDialog isOpen={isServiceSelectionOpen} onOpenChange={setIsServiceSelectionOpen} lead={lead} mode={serviceSelectionMode} />
    <LocalMileAccessDialog isOpen={isLocalMileDialogOpen} onOpenChange={setIsLocalMileDialogOpen} lead={lead} onConfirm={handleLocalMileConfirm} />
    <ShipMateAccessDialog isOpen={isShipMateDialogOpen} onOpenChange={setIsShipMateDialogOpen} lead={lead} onConfirm={handleShipMateConfirm} />
    <EditAddressDialog lead={lead} isOpen={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen} onLeadUpdated={(updates) => setLead(prev => ({ ...prev, ...updates }))} />
    <EditPostalAddressDialog lead={lead} isOpen={isPostalAddressDialogOpen} onOpenChange={setIsPostalAddressDialogOpen} onLeadUpdated={(updates) => setLead(prev => ({ ...prev, ...updates }))} />
    <SofDialog lead={lead} isOpen={isSofDialogOpen} onOpenChange={setIsSofDialogOpen} onLeadUpdated={(updates) => setLead(prev => ({ ...prev, ...updates }))} />
    <DiscoveryQuestionsDialog lead={lead} onSave={handleDiscoverySave} isOpen={isDiscoveryQuestionsOpen} onOpenChange={setIsDiscoveryQuestionsOpen} />
    <ScheduleAppointmentDialog 
       lead={lead} 
       isOpen={isScheduleAppointmentOpen} 
       onOpenChange={setIsScheduleAppointmentOpen} 
       accountManagers={accountManagers}
       onAssignAccountManager={handleAccountManagerChange}
    />
    <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <AddContactForm leadId={lead.id} onContactAdded={(newContact) => {
                setLead(prev => ({ ...prev, contacts: [...(prev.contacts || []), newContact] }));
                setIsAddingContact(false);
            }} />
        </DialogContent>
    </Dialog>
    <Dialog open={!!contactToEdit} onOpenChange={(open) => !open && setContactToEdit(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Contact</DialogTitle>
            </DialogHeader>
            {contactToEdit && (
                <EditContactForm 
                    leadId={lead.id} 
                    contact={contactToEdit} 
                    onContactUpdated={(updated) => {
                        setLead(prev => ({ 
                            ...prev, 
                            contacts: prev.contacts?.map(c => c.id === updated.id ? updated : c) 
                        }));
                    }} 
                    onClose={() => setContactToEdit(null)}
                />
            )}
        </DialogContent>
    </Dialog>
    <Dialog open={isEditLeadDialogOpen} onOpenChange={setIsEditLeadDialogOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Edit Lead Details</DialogTitle>
            </DialogHeader>
            <EditLeadForm lead={lead} onLeadUpdated={handleLeadUpdated} />
        </DialogContent>
    </Dialog>
    <Dialog open={isEmailDialogOpen} onOpenChange={(open) => { setIsEmailDialogOpen(open); if(!open) setSelectedTemplateId(''); }}>
        <DialogContent className="max-w-3xl bg-card border w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <span>Send Dynamic Template Email</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                    Choose a marketing template to email directly to <strong>{targetEmailAddress}</strong>.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 border-y my-2">
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">Send From</Label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setSenderType('default')}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-all text-center ${
                                senderType === 'default'
                                    ? 'bg-primary border-primary text-white shadow-sm'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            Default
                        </button>
                        <button
                            type="button"
                            onClick={() => setSenderType('me')}
                            disabled={!user?.email || !user.email.endsWith('@mailplus.com.au')}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-all text-center ${
                                !user?.email || !user.email.endsWith('@mailplus.com.au')
                                    ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                    : senderType === 'me'
                                    ? 'bg-primary border-primary text-white shadow-sm'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            title={user?.email ? `Send as ${user.email}` : 'Log in using @mailplus.com.au to enable'}
                        >
                            My Account
                        </button>
                        <button
                            type="button"
                            onClick={() => setSenderType('custom')}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-all text-center ${
                                senderType === 'custom'
                                    ? 'bg-primary border-primary text-white shadow-sm'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            Custom
                        </button>
                    </div>
                    {senderType === 'me' && user?.email && (
                        <p className="text-[10px] text-slate-500 italic mt-1">
                            Email will be dispatched from your account: <strong className="text-slate-600">{user.email}</strong>
                        </p>
                    )}
                    {senderType === 'custom' && (
                        <div className="space-y-1.5 mt-2 animate-in fade-in duration-200">
                            <Input
                                type="email"
                                placeholder="e.g., info@mailplus.com.au"
                                value={customSenderEmail}
                                onChange={(e) => setCustomSenderEmail(e.target.value)}
                                className="bg-slate-50 text-xs h-8 border-slate-200 focus-visible:ring-primary focus-visible:ring-offset-0"
                            />
                            <p className="text-[9px] text-slate-400">
                                Address must end with <strong className="text-slate-500">@mailplus.com.au</strong>.
                            </p>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Email Template</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger className="bg-slate-50 text-xs">
                            <SelectValue placeholder="Choose a layout template..." />
                        </SelectTrigger>
                        <SelectContent>
                            {templates.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedTemplateId && (
                    <div className="bg-slate-50 border rounded-lg p-3 space-y-3 animate-in fade-in duration-200">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Email Preview</span>
                            <div className="bg-white rounded-lg shadow-md border overflow-hidden flex flex-col w-full">
                               {/* Simulated Email Header */}
                               <div className="border-b bg-slate-50 px-6 py-4 text-sm text-muted-foreground shrink-0 space-y-1 text-left">
                                  <div><span className="font-semibold text-slate-700 w-16 inline-block">From:</span> outbound@mailplus.com.au</div>
                                  <div><span className="font-semibold text-slate-700 w-16 inline-block">To:</span> {targetEmailAddress || lead.contacts?.[0]?.email || 'recipient@example.com'}</div>
                                  <div className="truncate"><span className="font-semibold text-slate-700 w-16 inline-block">Subject:</span> {templates.find(t => t.id === selectedTemplateId)?.subject || '(No Subject)'}</div>
                                </div>

                                {/* Email Body Wrapper */}
                                <div className="border-t bg-white min-h-[400px] flex items-center justify-center relative overflow-hidden">
                                    {previewLoading ? (
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span className="text-xs">Generating branded preview...</span>
                                        </div>
                                    ) : previewHtml ? (
                                        <iframe 
                                            title="Email Preview"
                                            srcDoc={previewHtml}
                                            className="w-full min-h-[450px] border-none bg-white"
                                        />
                                    ) : (
                                        <span className="text-xs text-muted-foreground">No preview available</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsEmailDialogOpen(false)}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleSendSingleEmail} 
                    disabled={!selectedTemplateId || isSendingEmail}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                >
                    {isSendingEmail ? (
                        <>
                            <Loader className="h-3 w-3 mr-1" />
                            Sending...
                        </>
                    ) : (
                        'Dispatch Email'
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <Dialog open={isFranchiseeLookupOpen} onOpenChange={setIsFranchiseeLookupOpen}>
        <DialogContent className="max-w-md bg-card border">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    <span>Territory Lookup Results</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                    Select a matching franchisee based on the lead's address ({lead.address?.city}, {lead.address?.state} {lead.address?.zip}).
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 border-y my-2">
                {isLookingUpFranchisee ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader className="w-6 h-6 text-primary animate-spin" />
                    </div>
                ) : franchiseeMatches.length > 0 ? (
                    <ScrollArea className="h-48 text-sm">
                        <div className="space-y-2 pr-4">
                            {franchiseeMatches.map((f: any) => (
                                <div key={f.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                                    <div>
                                        <p className="font-semibold text-foreground">{f.name}</p>
                                        <p className="text-xs text-muted-foreground">{f.email}</p>
                                    </div>
                                    <Button size="sm" onClick={() => handleFranchiseeSelection(f)}>Select</Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <p className="text-sm text-center text-muted-foreground py-8">No matching franchisees found in the territory.</p>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsFranchiseeLookupOpen(false)}>
                    Close
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    
    <Dialog open={isUpsellDialogOpen} onOpenChange={setIsUpsellDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Record Upsell</DialogTitle>
                <DialogDescription>Mark this customer as having been successfully upsold by a representative.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Field Representative*</Label>
                    <Select value={upsellRepUid} onValueChange={setUpsellRepUid}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select representative..." />
                        </SelectTrigger>
                        <SelectContent>
                            {fieldReps.map(rep => (
                                <SelectItem key={rep.uid} value={rep.uid}>{rep.displayName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Upsell Details / Notes</Label>
                    <Textarea 
                        placeholder="What was upsold? e.g., Added parcel delivery service." 
                        value={upsellNotes} 
                        onChange={(e) => setUpsellNotes(e.target.value)} 
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsUpsellDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmUpsell} disabled={isUpselling || !upsellRepUid}>
                    {isUpselling ? <Loader /> : 'Confirm Upsell ($50 Commission)'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  )
}
