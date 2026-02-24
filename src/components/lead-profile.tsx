'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  Calendar,
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
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import type { Lead, Contact, Activity, Note, Transcript, Task, DiscoveryData, Appointment, Address, LeadStatus, VisitNote } from '@/lib/types'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import { logActivity, updateLeadAvatar, updateLeadStatus, getLeadFromFirebase, addTaskToLead, updateTaskCompletion, updateLeadDiscoveryData, logCallActivity, deleteLead, getLastNote, getLastActivity } from '@/services/firebase'
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
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { PostCallOutcomeDialog } from './post-call-outcome-dialog'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Calendar as CalendarPicker } from './ui/calendar'
import { format } from 'date-fns'
import { DiscoveryQuestionsDialog } from './discovery-questions-form'
import { cn } from '@/lib/utils'
import { DiscoveryRadarChart } from './discovery-radar-chart'
import { ScrollArea } from './ui/scroll-area'
import { ScheduleAppointmentDialog } from './schedule-appointment-dialog';
import { LogNoteDialog } from './log-note-dialog'
import { Badge } from '@/components/ui/badge'
import { AddContactForm } from './add-contact-form'
import { EditContactForm } from './edit-contact-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { initiateLocalMileTrial, initiateMPProductsTrial } from '@/services/netsuite-localmile-proxy'

interface LeadProfileProps {
  initialLead: Lead;
}

const formatAddressString = (address?: Address) => {
    if (!address) return 'N/A';
    return [address.address1, address.street, address.city, address.state, address.zip, address.country].filter(Boolean).join(', ');
}

export function LeadProfile({ initialLead }: LeadProfileProps) {
  const [lead, setLead] = useState<Lead>(initialLead);
  const [isProspecting, setIsProspecting] = useState(false);
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  const [isDiscoveryQuestionsOpen, setIsDiscoveryQuestionsOpen] = useState(false);
  const [isScheduleAppointmentOpen, setIsScheduleAppointmentOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showPostCallDialog, setShowPostCallDialog] = useState(false);
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
    const currentIndex = sessionLeads.indexOf(lead.id);
    if (currentIndex !== -1 && currentIndex < sessionLeads.length - 1) {
      setLoadingNextLead(true);
      router.push(`/leads/${sessionLeads[currentIndex + 1]}`);
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
    if (isSessionActive) {
        const updatedSessionLeads = sessionLeads.filter(id => id !== lead?.id);
        localStorage.setItem('dialingSessionLeads', JSON.stringify(updatedSessionLeads));
        setSessionLeads(updatedSessionLeads);
    }
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
        if (result.contacts && result.contacts.length > 0) setLead(prev => ({...prev!, contacts: [...(prev!.contacts || []), ...result.contacts!]}));
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

  const handleInitiateCall = (leadId: string, phoneNumber: string) => {
    if (!phoneNumber) return;
    window.open(`aircall:${phoneNumber}`);
    logActivity(leadId, { type: 'Call', notes: `Initiated call to ${phoneNumber} via AirCall app.` });
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

  const handleLocalMileConfirm = async () => {
    const result = await initiateLocalMileTrial({ leadId: lead.id });
    if (result.success) {
        toast({ title: 'Success', description: 'LocalMile trial initiated.' });
        setLead(prev => ({ ...prev, status: 'LocalMile Pending' }));
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
        throw new Error(result.message);
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

  const DetailItem = ({ icon: Icon, label, value, copyable, isLink, linkUrl, isWebsite, callable, leadId }: any) => {
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
                    <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => handleInitiateCall(leadId, value)}>
                        <PhoneCall className="h-3 w-3" />
                    </Button>
                )}
            </div>
        </div>
    );
  };

  const renderActionButtons = () => {
    const isAdmin = userProfile?.role === 'admin';
    const isLeadGenAdmin = userProfile?.role === 'Lead Gen Admin';
    const isFieldSales = userProfile?.role === 'Field Sales' || userProfile?.role === 'Field Sales Admin';
    const isDialer = userProfile?.role === 'user' || userProfile?.role === 'Lead Gen';

    const checkInBtn = <Button key="check-in" variant="secondary" onClick={() => router.push(`/check-in/${lead.id}`)}><CheckSquare className="mr-2 h-4 w-4" />Check In</Button>;
    const signupBtn = <Button key="signup" variant={isFieldSales || isAdmin ? "default" : "outline"} onClick={() => { setServiceSelectionMode('Signup'); setIsServiceSelectionOpen(true); }}><Briefcase className="mr-2 h-4 w-4" />Signup</Button>;
    const trialBtn = (
        <DropdownMenu key="trial-dropdown">
            <DropdownMenuTrigger asChild>
              <Button variant={isFieldSales || isAdmin ? "default" : "outline"}><Star className="mr-2 h-4 w-4" />Free Trial</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => { setServiceSelectionMode('Free Trial'); setIsServiceSelectionOpen(true); }}>Service</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsShipMateDialogOpen(true)}>ShipMate</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsLocalMileDialogOpen(true)}>LocalMile</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
    const apptBtn = <Button key="appt" variant={isDialer || isAdmin || isLeadGenAdmin ? "default" : "outline"} onClick={() => setIsScheduleAppointmentOpen(true)}><Calendar className="mr-2 h-4 w-4" />Schedule Appointment</Button>;
    const callBtn = <Button key="call" variant={isFieldSales ? "secondary" : "outline"} onClick={() => setShowPostCallDialog(true)}><PhoneCall className="mr-2 h-4 w-4" />{isFieldSales ? 'Log Outcome' : 'Log a Call'}</Button>;
    const processBtn = <Button key="process" onClick={() => setShowPostCallDialog(true)}><Briefcase className="mr-2 h-4 w-4" />Process Field Lead</Button>;
    const noteBtn = <Button key="note" variant="outline" onClick={() => setIsLogNoteOpen(true)}><ClipboardEdit className="mr-2 h-4 w-4" />Log a Note</Button>;
    const moveBtn = <Button key="move" variant="outline" onClick={() => setIsMoveLeadDialogOpen(true)}><Move className="mr-2 h-4 w-4" />Move Lead</Button>;

    if (isAdmin) return <div className="flex flex-wrap items-center gap-2">{checkInBtn}{processBtn}{apptBtn}{signupBtn}{trialBtn}{noteBtn}{moveBtn}</div>;
    if (isLeadGenAdmin) return <div className="flex flex-wrap items-center gap-2">{processBtn}{apptBtn}{noteBtn}{moveBtn}</div>;
    if (isFieldSales) return <div className="flex flex-wrap items-center gap-2">{checkInBtn}{signupBtn}{trialBtn}{callBtn}{noteBtn}{moveBtn}</div>;
    if (isDialer) return <div className="flex flex-wrap items-center gap-2">{apptBtn}{callBtn}{noteBtn}{moveBtn}</div>;
    return null;
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
        processMode={userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen Admin'}
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
        <div>
            <h1 className="text-3xl font-bold">{lead.companyName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <LeadStatusBadge status={lead.status} />
              <p className="text-muted-foreground text-sm">&bull; {contacts?.length || 0} Contacts &bull; Contacted {callHistory.length} times</p>
            </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">{renderActionButtons()}</div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
               <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-muted-foreground" />Company Details</CardTitle>
               <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleAiProspect} disabled={isProspecting}><Sparkles className="mr-2 h-4 w-4" /> AI Prospect</Button>
                    <Dialog open={isEditLeadDialogOpen} onOpenChange={setIsEditLeadDialogOpen}>
                      <DialogTrigger asChild><Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button></DialogTrigger>
                      <DialogContent><DialogHeader><DialogTitle>Edit Details</DialogTitle></DialogHeader><EditLeadForm lead={lead} onLeadUpdated={handleLeadUpdated} /></DialogContent>
                    </Dialog>
               </div>
             </CardHeader>
             <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="space-y-8">
                        <DetailItem icon={Key} label="Customer ID" value={lead.entityId} copyable />
                        <DetailItem icon={Hash} label="NetSuite Internal ID" value={lead.internalid || lead.salesRecordInternalId} copyable />
                        <DetailItem icon={Tag} label="Franchisee" value={lead.franchisee} />
                        <DetailItem icon={Calendar} label="Date Entered" value={lead.dateLeadEntered ? format(new Date(lead.dateLeadEntered), 'MMM d, yyyy') : '-'} />
                        <DetailItem icon={Globe} label="Website" value={lead.websiteUrl} isWebsite />
                        <DetailItem icon={Tag} label="Industry" value={lead.industryCategory} />
                    </div>
                    <div className="space-y-8">
                        <DetailItem icon={Mail} label="Email" value={lead.customerServiceEmail} copyable />
                        <DetailItem icon={Phone} label="Phone" value={lead.customerPhone} copyable callable leadId={lead.id} />
                        <DetailItem icon={User} label="Sales Rep Assigned" value={lead.salesRepAssigned} isLink linkUrl={lead.salesRepAssignedCalendlyLink} />
                        <DetailItem icon={Briefcase} label="Lead Source" value={lead.campaign || lead.customerSource} />
                        <DetailItem icon={Tag} label="Sub-Industry" value={lead.industrySubCategory || '- None -'} />
                    </div>
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
                            <AlertDescription>{format(new Date(linkedVisitNote.scheduledDate), 'PPP')} {linkedVisitNote.scheduledTime && `@ ${linkedVisitNote.scheduledTime}`}</AlertDescription>
                        </Alert>
                    )}
                    <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted">
                        <div className="text-center"><p className="text-xs text-muted-foreground">Score</p><p className="text-2xl font-bold">{linkedVisitNote.discoveryData?.score ?? 'N/A'}</p></div>
                        <div className="text-center"><p className="text-sm text-muted-foreground">Routing</p><Badge variant="outline">{linkedVisitNote.discoveryData?.routingTag ?? 'N/A'}</Badge></div>
                    </div>
                    {linkedVisitNote.discoveryData && <DiscoveryRadarChart discoveryData={linkedVisitNote.discoveryData as DiscoveryData} />}
                    
                    <div className="space-y-2 pt-4 border-t">
                        <h4 className="font-semibold text-sm">Visit Note Content:</h4>
                        <div className="p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap italic text-muted-foreground">
                            {linkedVisitNote.content}
                        </div>
                    </div>

                    <div className="text-sm space-y-2 pt-4 border-t">
                        <h4 className="font-semibold">Captured Answers:</h4>
                        <ul className="list-disc pl-5 text-muted-foreground">
                            <li><strong>Captured By:</strong> {linkedVisitNote.capturedBy}</li>
                            <li><strong>Outcome:</strong> {linkedVisitNote.outcome?.type || 'N/A'}</li>
                            {linkedVisitNote.discoveryData?.personSpokenWithName && <li><strong>Contact:</strong> {linkedVisitNote.discoveryData.personSpokenWithName} ({linkedVisitNote.discoveryData.personSpokenWithTitle || 'Contact'})</li>}
                            {linkedVisitNote.discoveryData?.discoverySignals?.map(s => <li key={s}>{s}</li>)}
                        </ul>
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
                                <p className="font-semibold">{contact.name}</p>
                                <p className="text-xs text-muted-foreground mb-2">{contact.title}</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{contact.email}</div>
                                    <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{contact.phone} <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleInitiateCall(lead.id, contact.phone)}><PhoneCall className="h-3 w-3" /></Button></div>
                                </div>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <Building className="w-6 h-6 text-muted-foreground" />
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
                        
                        {lead.address?.lat && (
                            <div className="h-48 rounded-xl border overflow-hidden shadow-inner bg-muted">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    frameBorder="0" 
                                    style={{ border: 0 }} 
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddressStr)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}
                        
                        <Button variant="outline" className="w-full bg-sidebar-accent/20 border-none hover:bg-sidebar-accent/30 text-foreground font-medium py-6 rounded-full" onClick={() => setIsEditLeadDialogOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Address
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader><CardTitle>History</CardTitle></CardHeader>
                <CardContent>
                    <Tabs defaultValue="notes">
                        <TabsList><TabsTrigger value="notes">Notes</TabsTrigger><TabsTrigger value="calls">Calls</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList>
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
                    </Tabs>
                </CardContent>
            </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-muted-foreground" />Appointments</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {appointments.map(a => <div key={a.id} className="text-sm p-2 bg-muted rounded-md">Appt with {a.assignedTo} on {format(new Date(a.duedate), 'PP')}</div>)}
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
                                <div className="text-center"><p className="text-xs text-muted-foreground">Routing</p><Badge variant="outline">{lead.discoveryData.routingTag}</Badge></div>
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
                setLead(prev => ({ ...prev, contacts: [...(prev.contacts || []), { ...newContact, id: 'temp-' + Date.now() }] }));
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
    </>
  )
}
