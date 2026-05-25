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
  Key,
  Hash,
  Tag,
  Globe,
  User,
  MoreHorizontal,
  Activity as ActivityIcon,
  RefreshCw,
  MessageSquare,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import type { Lead, Contact, Activity, Note, Transcript, Task, DiscoveryData, Appointment, Address, LeadStatus, VisitNote } from '@/lib/types'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import { logActivity, updateLeadAvatar, updateLeadStatus, getLeadFromFirebase, addTaskToLead, updateTaskCompletion, updateLeadDiscoveryData, logCallActivity, deleteLead, getLastNote, getLastActivity, updateLeadFieldSales, updateLeadDetails, updateContactInLead } from '@/services/firebase'
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
import { EditLeadForm } from '@/components/edit-lead-form'
import { Loader } from '@/components/ui/loader'
import { MapModal } from '@/components/map-modal'
import { useAuth } from '@/hooks/use-auth'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { PostCallOutcomeDialog } from './post-call-outcome-dialog'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Switch } from './ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Calendar as CalendarPicker } from './ui/calendar'
import { format, isValid } from 'date-fns'
import { DiscoveryQuestionsDialog } from './discovery-questions-form'
import { cn, formatInTimezone } from '@/lib/utils'
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
import { Alert, AlertTitle, AlertDescription } from './ui/alert'
import { initiateLocalMileTrial, initiateMPProductsTrial, resendLocalMileEmail, recreateLocalMileCode } from '@/services/netsuite-localmile-proxy'
import { SmsDialog } from '@/components/sms-dialog'

interface LeadProfileProps {
  initialLead: Lead;
}

const formatAddressString = (address?: Address) => {
    if (!address) return 'N/A';
    const parts = [];
    if (address.address1 !== null && address.address1 !== undefined && address.address1.trim() !== '') {
        parts.push(address.address1);
    }
    parts.push(address.street, address.city, address.state, address.zip, address.country);
    return parts.filter(Boolean).join(', ');
}

export function LeadProfile({ initialLead }: LeadProfileProps) {
  const [lead, setLead] = useState<Lead>(initialLead);
  const [isProspecting, setIsProspecting] = useState(false);
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  const [isDiscoveryQuestionsOpen, setIsDiscoveryQuestionsOpen] = useState(false);
  const [isScheduleAppointmentOpen, setIsScheduleAppointmentOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showPostCallDialog, setShowPostCallDialog] = useState(false);
  const [dialogProcessMode, setDialogProcessMode] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setnewTaskDueDate] = useState<Date | undefined>();
  const [sessionLeads, setSessionLeads] = useState<string[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [loadingNextLead, setLoadingNextLead] = useState(false);
  const [loadingBack, setLoadingBack] = useState(false);
  const [isMoveLeadDialogOpen, setIsMoveLeadDialogOpen] = useState(false);
  const [isLogNoteOpen, setIsLogNoteOpen] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [linkedVisitNote, setLinkedVisitNote] = useState<VisitNote | null>(null);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(false);
  const [isServiceSelectionOpen, setIsServiceSelectionOpen] = useState(false);
  const [serviceSelectionMode, setServiceSelectionMode] = useState<'Free Trial' | 'Signup'>('Signup');
  const [isLocalMileDialogOpen, setIsLocalMileDialogOpen] = useState(false);
  const [isShipMateDialogOpen, setIsShipMateDialogOpen] = useState(false);
  const [isFranchiseeLookupOpen, setIsFranchiseeLookupOpen] = useState(false);
  const [franchiseeMatches, setFranchiseeMatches] = useState<any[]>([]);
  const [isLookingUpFranchisee, setIsLookingUpFranchisee] = useState(false);

  // Quick template email states
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [targetEmailAddress, setTargetEmailAddress] = useState<string>('');
  const [senderType, setSenderType] = useState<'default' | 'me' | 'custom'>('default');
  const [customSenderEmail, setCustomSenderEmail] = useState<string>('');

  // SMS states
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsTargetPhone, setSmsTargetPhone] = useState<string>('');
  const [smsTargetName, setSmsTargetName] = useState<string>('');

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
          await updateLeadDetails(lead.id, lead, { franchisee: franchisee.name });
          setLead(prev => ({ ...prev, franchisee: franchisee.name }));
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

  const handleEndSession = useCallback(() => {
    localStorage.removeItem('dialingSessionLeads');
    setIsSessionActive(false);
    setSessionLeads([]);
    toast({ title: 'Dialing Session Ended' });
  }, [toast]);

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

  const handleNoteLogged = (newNote: Note) => {
    setLead(prev => ({...prev!, notes: [newNote, ...(prev!.notes || [])]}));
    setIsLogNoteOpen(false);
  };
  
  const handleLeadUpdated = (updatedLeadData: Partial<Lead>) => {
    setLead(prev => ({ ...prev!, ...updatedLeadData }));
    setIsEditLeadDialogOpen(false);
  }

  const handleToggleFieldSales = async (checked: boolean) => {
    try {
        await updateLeadFieldSales(lead.id, checked);
        setLead(prev => ({ ...prev, fieldSales: checked }));
        toast({ title: 'Bucket Updated', description: `Lead moved to ${checked ? 'Field Sales' : 'Outbound'} bucket.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update bucket allocation.' });
    }
  }

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

            setLead(prev => ({ 
                ...prev, 
                status: 'LocalMile Pending', 
                serviceType, 
                rate,
                contacts: prev.contacts?.map(c => 
                   (c.id === contact.id && result.localMilePlusAuthLink && result.securityCode) ? { 
                       ...c, 
                       localMilePlusAuthLink: result.localMilePlusAuthLink,
                       securityCode: result.securityCode
                   } : c
                )
            }));
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        // Fallback to local Firestore save if NetSuite fails
        await updateLeadDetails(lead.id, lead, { status: 'LocalMile Pending', serviceType, rate });
        setLead(prev => ({ ...prev, status: 'LocalMile Pending', serviceType, rate }));
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
    const result = await initiateMPProductsTrial({ leadId: lead.id });
    if (result.success) {
        toast({ title: 'Success', description: 'ShipMate trial initiated.' });
        setLead(prev => ({ ...prev, status: 'Trialing ShipMate' }));
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

  const DetailItem = ({ icon: Icon, label, value, copyable, isLink, linkUrl, isWebsite, callable, leadId, emailClickable }: any) => {
    return (
        <div className="space-y-1">
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
                        <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => handleInitiateCall(leadId, value)}>
                            <PhoneCall className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => handleInitiateSms(value, lead.companyName || 'Lead')}>
                            <MessageSquare className="h-3 w-3" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
  };

  const renderActionButtons = () => {
    const isAdmin = userProfile?.role === 'admin';
    const isLeadGenAdmin = userProfile?.role === 'Lead Gen Admin';
    const isFieldSales = userProfile?.role === 'Field Sales' || userProfile?.role === 'Dashback' || userProfile?.role === 'Field Sales Admin';
    const isDialer = userProfile?.role === 'user' || userProfile?.role === 'Lead Gen';

    const checkInItem = <DropdownMenuItem key="check-in" onSelect={() => router.push(`/check-in/${lead.id}`)}><CheckSquare className="mr-2 h-4 w-4" />Check In</DropdownMenuItem>;
    const processItem = <DropdownMenuItem key="process" onSelect={() => { setDialogProcessMode(true); setShowPostCallDialog(true); }}><Briefcase className="mr-2 h-4 w-4" />Process Field Lead</DropdownMenuItem>;
    const callItem = <DropdownMenuItem key="call" onSelect={() => { setDialogProcessMode(false); setShowPostCallDialog(true); }}><PhoneCall className="mr-2 h-4 w-4" />{isFieldSales ? 'Log Outcome' : 'Log a Call'}</DropdownMenuItem>;
    const noteItem = <DropdownMenuItem key="note" onSelect={() => setIsLogNoteOpen(true)}><ClipboardEdit className="mr-2 h-4 w-4" />Log a Note</DropdownMenuItem>;
    
    const signupItem = <DropdownMenuItem key="signup" onSelect={() => { setServiceSelectionMode('Signup'); setIsServiceSelectionOpen(true); }}><Briefcase className="mr-2 h-4 w-4" />Signup</DropdownMenuItem>;
    
    const freeTrialItem = (
        <DropdownMenuSub key="trial">
            <DropdownMenuSubTrigger><Star className="mr-2 h-4 w-4" />Free Trial</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={() => { setServiceSelectionMode('Free Trial'); setIsServiceSelectionOpen(true); }}>Service</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsShipMateDialogOpen(true)}>ShipMate</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsLocalMileDialogOpen(true)}>LocalMile</DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
        </DropdownMenuSub>
    );

    const moveItem = <DropdownMenuItem key="move" onSelect={() => setIsMoveLeadDialogOpen(true)}><Move className="mr-2 h-4 w-4" />Move Lead</DropdownMenuItem>;

    let salesItems: React.ReactNode[] = [];
    let activityItems: React.ReactNode[] = [];
    let showSchedule = false;
    let showProcessLead = false;

    const isMailPlusPtyLtd = lead.franchisee?.toLowerCase() === 'mailplus pty ltd';

    if (isAdmin) {
        salesItems = isMailPlusPtyLtd ? [moveItem] : [signupItem, freeTrialItem, moveItem];
        activityItems = [callItem, noteItem, checkInItem];
        showSchedule = true;
        showProcessLead = true;
    } else if (isLeadGenAdmin) {
        salesItems = [moveItem];
        activityItems = [noteItem];
        showSchedule = true;
        showProcessLead = true;
    } else if (isFieldSales) {
        salesItems = isMailPlusPtyLtd ? [moveItem] : [signupItem, freeTrialItem, moveItem];
        activityItems = [callItem, noteItem, checkInItem];
        showSchedule = false;
        showProcessLead = false;
    } else if (isDialer) {
        salesItems = [moveItem];
        activityItems = [callItem, noteItem];
        showSchedule = true;
        showProcessLead = false;
    } else {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {salesItems.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline"><Briefcase className="mr-2 h-4 w-4" />Sales</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {salesItems}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            {activityItems.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline"><ActivityIcon className="mr-2 h-4 w-4" />Log Activity</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {activityItems}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            {showProcessLead && (
                <Button variant="default" onClick={() => { setDialogProcessMode(true); setShowPostCallDialog(true); }}>
                    <Briefcase className="mr-2 h-4 w-4" />Process Field Lead
                </Button>
            )}
            {showSchedule && (
                <Button variant="default" onClick={() => setIsScheduleAppointmentOpen(true)}>
                    <CalendarIcon className="mr-2 h-4 w-4" />Schedule
                </Button>
            )}
        </div>
    );
  };

  const callHistory = (activities || []).filter(a => a.type === 'Call' && a.callId);
  const fullAddressStr = lead.address ? formatAddressString(lead.address) : 'No address available';

  return (
    <>
    <PostCallOutcomeDialog
        isOpen={showPostCallDialog}
        onClose={() => setShowPostCallDialog(false)}
        lead={lead}
        onOutcomeLogged={handleCallLogged}
        onSessionNext={handleNextLead}
        isSessionActive={isSessionActive}
        processMode={dialogProcessMode}
    />
    <SmsDialog
        isOpen={smsDialogOpen}
        onClose={() => setSmsDialogOpen(false)}
        phoneNumber={smsTargetPhone}
        recipientName={smsTargetName}
    />
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

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {lead.avatarUrl ? (
                    <img src={lead.avatarUrl} alt={lead.companyName} className="h-full w-full rounded-lg object-cover" />
                ) : (
                    <Building className="h-8 w-8" />
                )}
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{lead.companyName}</h1>
                <div className="flex wrap items-center gap-x-2 gap-y-1 mt-1">
                    <LeadStatusBadge status={lead.status} />
                    {lead.bucket === 'inbound' && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Inbound</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">&bull;</span>
                    <p className="text-muted-foreground text-sm">{lead.industryCategory || 'No Industry'}</p>
                </div>
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

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
             <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-muted-foreground" />Company Details</CardTitle>
                {!isCompanyProfile && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditLeadDialogOpen(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Details
                    </Button>
                )}
             </CardHeader>
             <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="space-y-8">
                        <DetailItem icon={Key} label="Customer ID" value={lead.entityId} copyable />
                        <DetailItem icon={Hash} label="NetSuite Internal ID" value={lead.salesRecordInternalId || (lead as any).internalid} copyable />
                        <div className="flex flex-col items-start gap-2">
                            <DetailItem icon={Tag} label="Franchisee" value={lead.franchisee} />
                            {lead.franchisee?.toLowerCase() === 'mailplus pty ltd' && (
                                <Button variant="secondary" size="sm" onClick={handleFranchiseeLookup} disabled={isLookingUpFranchisee}>
                                    {isLookingUpFranchisee ? <Loader className="w-4 h-4 mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                                    Lookup Territory
                                </Button>
                            )}
                        </div>
                        <DetailItem icon={CalendarIcon} label="Date Entered" value={lead.dateLeadEntered ? (isValid(new Date(lead.dateLeadEntered)) ? format(new Date(lead.dateLeadEntered), 'MMM d, yyyy') : '-') : '-'} />
                        <DetailItem icon={Globe} label="Website" value={lead.websiteUrl} isWebsite />
                        <DetailItem icon={Tag} label="Industry" value={lead.industryCategory} />
                    </div>
                    <div className="space-y-8">
                        <DetailItem icon={Mail} label="Email" value={lead.customerServiceEmail} copyable emailClickable />
                        <DetailItem icon={Phone} label="Phone" value={lead.customerPhone} copyable callable leadId={lead.id} />
                        <DetailItem icon={User} label="Sales Rep Assigned" value={lead.salesRepAssigned} isLink linkUrl={lead.salesRepAssignedCalendlyLink} />
                        <DetailItem icon={Briefcase} label="Campaign" value={lead.campaign} />
                        <DetailItem icon={Briefcase} label="Source" value={lead.customerSource} />
                        <DetailItem icon={Tag} label="Sub-Industry" value={lead.industrySubCategory || '- None -'} />
                    </div>
                </div>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="pb-4 border-b">
                <CardTitle className="flex items-center gap-2"><Move className="w-5 h-5 text-muted-foreground" />Bucket Allocation</CardTitle>
                <CardDescription>Determines where this lead appears in reporting and dialer lists.</CardDescription>
             </CardHeader>
             <CardContent className="pt-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold">
                            Current Bucket: {
                                lead.bucket === 'inbound' ? 'Inbound' :
                                lead.fieldSales ? 'Field Sales' : 'Outbound'
                            }
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {lead.bucket === 'inbound' 
                                ? 'This lead came through an inbound channel and is awaiting processing.' 
                                : lead.fieldSales 
                                    ? 'This lead is currently routed to the field sales team.' 
                                    : 'This lead is currently routed to the outbound dialing team.'}
                        </span>
                    </div>
                    {userProfile?.role === 'admin' ? (
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-muted-foreground">Outbound</span>
                            <Switch 
                                id="field-sales-toggle"
                                checked={!!lead.fieldSales} 
                                onCheckedChange={handleToggleFieldSales}
                            />
                            <span className="text-xs font-medium text-muted-foreground">Field Sales</span>
                        </div>
                    ) : (
                        <Badge variant="secondary">
                            {lead.bucket === 'inbound' ? 'Inbound Bucket' : lead.fieldSales ? 'Field Sales Bucket' : 'Outbound Bucket'}
                        </Badge>
                    )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" 
                                    onClick={() => setContactToEdit(contact)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold">{contact.name}</p>
                                    {contact.accessToLocalMile === 'yes' && (
                                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 py-0 h-4">LocalMile Access</Badge>
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
                                                {userProfile?.role === 'admin' && (
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
                <Card>
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
                            <Button variant="outline" className="w-full bg-sidebar-accent/20 border-none hover:bg-sidebar-accent/30 text-foreground font-medium py-6 rounded-full" onClick={() => setIsEditLeadDialogOpen(true)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Address
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader><CardTitle>History</CardTitle></CardHeader>
                <CardContent>
                    <Tabs defaultValue="notes">
                        <TabsList><TabsTrigger value="notes">Notes</TabsTrigger><TabsTrigger value="calls">Calls</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger><TabsTrigger value="emails">Emails</TabsTrigger></TabsList>
                        <TabsContent value="notes" className="space-y-4 pt-4">
                            {notes.map(note => (
                                <div key={note.id} className="text-sm border-l-2 pl-4 py-1"><p>{note.content}</p><p className="text-xs text-muted-foreground mt-1">{format(new Date(note.date), 'PPpp')} by {note.author}</p></div>
                            ))}
                        </TabsContent>
                        <TabsContent value="calls" className="space-y-4 pt-4">
                            {callHistory.map(call => (
                                <div key={call.id} className="text-sm border-b pb-2"><p className="font-medium">{call.notes}</p><p className="text-xs text-muted-foreground">{format(new Date(call.date), 'PPpp')} ({call.duration})</p></div>
                            ))}
                        </TabsContent>
                        <TabsContent value="activity" className="space-y-2 pt-4">
                            {activities.map(a => <div key={a.id} className="text-xs flex justify-between"><span>{a.notes}</span><span className="text-muted-foreground">{format(new Date(a.date), 'PP')}</span></div>)}
                        </TabsContent>
                        <TabsContent value="emails" className="space-y-4 pt-4">
                            {lead.emails?.map(email => (
                                <div key={email.id} className="text-sm border-b pb-2">
                                    <p className="font-medium">{email.subject}</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(email.sentAt), 'PPpp')} to {email.recipient}</p>
                                    <div className="mt-2 text-xs text-muted-foreground max-h-32 overflow-y-auto" dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
                                </div>
                            ))}
                            {(!lead.emails || lead.emails.length === 0) && <p className="text-sm text-muted-foreground text-center">No emails sent yet.</p>}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-muted-foreground" />Appointments</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {appointments.map(a => <div key={a.id} className="text-sm p-2 bg-muted rounded-md">Appt with {a.assignedTo} on {formatInTimezone(a.duedate, a.timezone || 'Australia/Sydney', 'PP')}</div>)}
                    {appointments.length === 0 && <p className="text-sm text-muted-foreground text-center">No appointments.</p>}
                </CardContent>
          </Card>
          
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
        </div>
      </main>
    </div>
    <MapModal isOpen={!!selectedAddress} onClose={() => setSelectedAddress(null)} address={selectedAddress || ''} />
    <LogNoteDialog lead={lead} onNoteLogged={handleNoteLogged} isOpen={isLogNoteOpen} onOpenChange={setIsLogNoteOpen}/>
    <ServiceSelectionDialog isOpen={isServiceSelectionOpen} onOpenChange={setIsServiceSelectionOpen} lead={lead} mode={serviceSelectionMode} />
    <LocalMileAccessDialog isOpen={isLocalMileDialogOpen} onOpenChange={setIsLocalMileDialogOpen} lead={lead} onConfirm={handleLocalMileConfirm} />
    <ShipMateAccessDialog isOpen={isShipMateDialogOpen} onOpenChange={setIsShipMateDialogOpen} lead={lead} onConfirm={handleShipMateConfirm} />
    <DiscoveryQuestionsDialog lead={lead} onSave={handleDiscoverySave} isOpen={isDiscoveryQuestionsOpen} onOpenChange={setIsDiscoveryQuestionsOpen} />
    <ScheduleAppointmentDialog lead={lead} isOpen={isScheduleAppointmentOpen} onOpenChange={setIsScheduleAppointmentOpen} />
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
        <DialogContent className="max-w-md bg-card border">
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
                    <div className="bg-slate-50 border rounded-lg p-3 space-y-2 animate-in fade-in duration-200">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Subject Line</span>
                            <span className="text-xs font-semibold text-slate-700">
                                {templates.find(t => t.id === selectedTemplateId)?.subject || 'No Subject'}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Body Preview</span>
                            <ScrollArea className="h-28 text-[11px] text-slate-600 font-sans border rounded bg-white p-2 mt-1 whitespace-pre-wrap">
                                {templates.find(t => t.id === selectedTemplateId)?.body || 'No content preview available'}
                            </ScrollArea>
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
    </>
  )
}
