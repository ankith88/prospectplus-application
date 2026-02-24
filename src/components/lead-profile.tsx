'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/navigation'
import {
  ArrowLeft,
  Building,
  Building2,
  Calendar as CalendarIcon,
  Clipboard,
  Edit,
  Globe,
  Hash,
  Key,
  Link as LinkIcon,
  MessageSquare,
  Mail,
  Briefcase,
  MapPin,
  Info,
  Search,
  BookText,
  FileText,
  PhoneCall,
  Download,
  Voicemail,
  ListTodo,
  FileQuestion,
  Route,
  Clock,
  SkipForward,
  ChevronDown,
  History,
  XCircle,
  FileDigit,
  Move,
  Sparkles,
  Tag,
  Users,
  Phone,
  User,
  PlusCircle,
  MoreVertical,
  ClipboardEdit,
  Trash2,
  CheckSquare,
  Mic,
  MicOff,
  Star,
  AlertCircle,
} from 'lucide-react'
import { useEffect, useState, useMemo, useCallback } from 'react'
import type { Lead, Contact, Activity, Note, Transcript, Task, DiscoveryData, Appointment, Address, LeadStatus, VisitNote, UserProfile } from '@/lib/types'
import { aiLeadScoring, AiLeadScoringOutput } from '@/ai/flows/ai-lead-scoring'
import { improveScript, ImproveScriptOutput } from '@/ai/flows/improve-script'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import { getCallTranscriptByCallId } from '@/ai/flows/get-call-transcript-flow'
import { deleteContactFromLead, logActivity, updateLeadAvatar, logNoteActivity, updateLeadStatus, getLeadActivity, getLeadTasks, addTaskToLead, updateTaskCompletion, deleteTaskFromLead, updateLeadDiscoveryData, getLeadFromFirebase, getLeadContacts, getLeadActivity as getLeadActivityFromDb, getLeadNotes, getLeadNotes as getLeadNotesFromDb, getLeadTranscripts, updateLeadSalesRep, logCallActivity, getCompaniesFromFirebase, getAllUsers, moveLeadToBucket, updateContactInLead, getLastNote, getLastActivity, deleteLead, updateLeadDetails, updateContactSendEmail, updateVisitNote } from '@/services/firebase'
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
import { Textarea } from '@/components/ui/textarea'
import { MapModal } from '@/components/map-modal'
import { useAuth } from '@/hooks/use-auth'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { collection, onSnapshot, query, where, orderBy, getDocs, limit, doc, getDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { PostCallOutcomeDialog } from './post-call-outcome-dialog'
import { TranscriptViewer } from './transcript-viewer'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Calendar as CalendarPicker } from './ui/calendar'
import { format } from 'date-fns'
import { DiscoveryQuestionsDialog } from './discovery-questions-form'
import { AddressAutocomplete } from './address-autocomplete'
import { cn } from '@/lib/utils'
import { DiscoveryRadarChart } from './discovery-radar-chart'
import { ColdCallScorecardDialog } from './cold-call-scorecard';
import { ScrollArea } from './ui/scroll-area'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'
import { Label } from './ui/label'
import { ScheduleAppointmentDialog } from './schedule-appointment-dialog';
import { salesReps } from '@/lib/constants'
import { AddContactForm } from './add-contact-form'
import { EditContactForm } from './edit-contact-form'
import { LogNoteDialog } from './log-note-dialog'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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

interface LeadProfileProps {
  initialLead: Lead;
}

const formatAddress = (address?: Address) => {
    if (!address) return 'N/A';
    return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
}

export function LeadProfile({ initialLead }: LeadProfileProps) {
  const [lead, setLead] = useState<Lead>(initialLead);
  const [scoringResult, setScoringResult] = useState<AiLeadScoringOutput['scoredLeads'][0] | null>(null);
  const [isImprovingScript, setIsImprovingScript] = useState(false);
  const [isProspecting, setIsProspecting] = useState(false);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  const [isEditAddressDialogOpen, setIsEditAddressDialogOpen] = useState(false);
  const [isTranscriptViewerOpen, setIsTranscriptViewerOpen] = useState(false);
  const [isDiscoveryQuestionsOpen, setIsDiscoveryQuestionsOpen] = useState(false);
  const [isLogOutcomeOpen, setIsLogOutcomeOpen] = useState(false);
  const [isScheduleAppointmentOpen, setIsScheduleAppointmentOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showPostCallDialog, setShowPostCallDialog] = useState(false);
  const [lastCallActivity, setLastCallActivity] = useState<Activity | null>(null);
  const [fetchingTranscriptId, setFetchingTranscriptId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>();
  const [sessionLeads, setSessionLeads] = useState<string[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [loadingNextLead, setLoadingNextLead] = useState(false);
  const [loadingBack, setLoadingBack] = useState(false);
  const [nearbyCompanies, setNearbyCompanies] = useState<Lead[]>([]);
  const [isNearbyCustomersOpen, setIsNearbyCustomersOpen] = useState(false);
  const [isFindingNearby, setIsFindingNearby] = useState(false);
  const [isMoveLeadDialogOpen, setIsMoveLeadDialogOpen] = useState(false);
  const [isLogNoteOpen, setIsLogNoteOpen] = useState(false);
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
    if (initialLead.aiScore) {
        setScoringResult({
            leadId: initialLead.id,
            score: initialLead.aiScore,
            reason: initialLead.aiReason || '',
            prospectedContacts: [],
        });
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
  
  const handleContactAdded = (newContactData: any) => {
    const newContact: Contact = {
        id: 'temp-' + Date.now(),
        name: `${newContactData.firstName} ${newContactData.lastName}`,
        title: newContactData.title,
        email: newContactData.email,
        phone: newContactData.phone,
    };
    setLead(prev => ({...prev!, contacts: [newContact, ...(prev!.contacts || [])]}));
  };

  const handleContactUpdated = (updatedContact: Contact) => {
     setLead(prev => ({...prev!, contacts: (prev!.contacts || []).map(c => c.id === updatedContact.id ? updatedContact : c)}));
  };

  const handleLeadUpdated = (updatedLeadData: Partial<Lead>) => {
    setLead(prev => ({ ...prev!, ...updatedLeadData }));
    setIsEditLeadDialogOpen(false);
  }

  const handleDeleteContact = async (contact: Contact) => {
    if (!lead) return;
    try {
      await deleteContactFromLead(lead.id, contact.id, contact.name);
      setLead(prev => ({...prev!, contacts: (prev!.contacts || []).filter(c => c.id !== contact.id)}));
      toast({ title: "Success", description: "Contact deleted." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete." });
    }
  };

  const handleInitiateCall = (leadId: string, phoneNumber: string) => {
    window.open(`aircall:${phoneNumber}`);
    logActivity(leadId, { type: 'Call', notes: `Initiated call to ${phoneNumber} via AirCall app.` });
  };

  const handleCopy = (text: string | null | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${fieldName} copied.` });
  };

  const handleGetTranscriptForCall = async (callId: string) => {
    if (!lead?.dialerAssigned) return;
    setFetchingTranscriptId(callId);
    try {
      const result = await getCallTranscriptByCallId({ callId, leadId: lead.id, leadAuthor: lead.dialerAssigned });
      if (result.transcriptFound) {
        toast({ title: "Success", description: "Transcript fetched." });
        fetchData();
      }
    } finally {
      setFetchingTranscriptId(null);
    }
  };

  const fetchData = async () => {
      const updatedLead = await getLeadFromFirebase(lead.id, true);
      if (updatedLead) setLead(updatedLead);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newTaskTitle || !newTaskDueDate || !user?.displayName) return;
    try {
        const newTask = await addTaskToLead(lead.id, { title: newTaskTitle, dueDate: newTaskDueDate.toISOString(), author: user.displayName });
        setLead(prev => ({...prev!, tasks: [newTask, ...(prev!.tasks || [])].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())}));
        setNewTaskTitle('');
        setNewTaskDueDate(undefined);
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to add task." });
    }
  };

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
      if (!lead) return;
      try {
          await updateTaskCompletion(lead.id, taskId, isCompleted);
          setLead(prev => ({...prev!, tasks: (prev!.tasks || []).map(t => t.id === taskId ? {...t, isCompleted, completedAt: isCompleted ? new Date().toISOString() : undefined} : t)}));
      } catch (error) {
          toast({ variant: "destructive", title: "Error", description: "Failed to update." });
      }
  };

  const handleDeleteTask = async (taskId: string) => {
      if (!lead) return;
      try {
          await deleteTaskFromLead(lead.id, taskId);
          setLead(prev => ({...prev!, tasks: (prev!.tasks || []).filter(t => t.id !== taskId)}));
      } catch (error) {
          toast({ variant: "destructive", title: "Error", description: "Failed to delete." });
      }
  };

  const handleDiscoverySave = async (discoveryData: DiscoveryData) => {
    if (!lead) return;
    try {
      await updateLeadDiscoveryData(lead.id, discoveryData);
      setLead(prev => ({ ...prev!, discoveryData }));
      setIsDiscoveryQuestionsOpen(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleNextLead = () => {
    if (sessionLeads.indexOf(lead.id) < sessionLeads.length - 1) {
      router.push(`/leads/${sessionLeads[sessionLeads.indexOf(lead.id) + 1]}`);
    } else {
      localStorage.removeItem('dialingSessionLeads');
      router.push('/leads');
    }
  };
  
  const handleEndSession = () => {
    localStorage.removeItem('dialingSessionLeads');
    setIsSessionActive(false);
    router.push('/leads');
  };

  const handleBackToLeads = () => {
    setLoadingBack(true);
    router.push(isCompanyProfile ? '/signed-customers' : '/leads');
  };
  
  const handleRepSelection = (repName: string, repUrl: string) => {
    if (!lead) return;
    setLead(prev => ({ ...prev!, salesRepAssigned: repName, salesRepAssignedCalendlyLink: repUrl }));
    updateLeadSalesRep(lead.id, repName, repUrl);
  };

  const handleFindNearbyCompanies = async () => {
    if (!lead.latitude || !lead.longitude) return;
    setIsFindingNearby(true);
    try {
        const allCompanies = await getCompaniesFromFirebase();
        const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
        const nearby = allCompanies.filter(company => {
          if (!company.latitude || !company.longitude || company.id === lead.id) return false;
          const itemLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
          return window.google.maps.geometry.spherical.computeDistanceBetween(leadLatLng, itemLatLng) <= 500;
        });
        setNearbyCompanies(nearby);
        setIsNearbyCustomersOpen(true);
    } finally {
        setIsFindingNearby(false);
    }
  };

  const handleLocalMileConfirm = async () => {
    const result = await initiateLocalMileTrial({ leadId: lead.id });
    if (result.success) setLead(prev => ({ ...prev, status: 'LocalMile Pending' }));
    else throw new Error(result.message);
  };

  const handleShipMateConfirm = async () => {
    const result = await initiateMPProductsTrial({ leadId: lead.id });
    if (result.success) setLead(prev => ({ ...prev, status: 'Trialing ShipMate' }));
    else throw new Error(result.message);
  };

  const renderActionButtons = () => {
    const isAdmin = userProfile?.role === 'admin';
    const isLeadGenAdmin = userProfile?.role === 'Lead Gen Admin';
    const isFieldSales = userProfile?.role === 'Field Sales' || userProfile?.role === 'Field Sales Admin';
    const isDialer = userProfile?.role === 'user' || userProfile?.role === 'Lead Gen';

    const checkInBtn = <Button variant="secondary" onClick={() => router.push(`/check-in/${lead.id}`)}><CheckSquare className="mr-2 h-4 w-4" />Check In</Button>;
    const signupBtn = <Button variant={isFieldSales || isAdmin ? "default" : "outline"} onClick={() => { setServiceSelectionMode('Signup'); setIsServiceSelectionOpen(true); }}><Briefcase className="mr-2 h-4 w-4" />Signup</Button>;
    const trialBtn = (
        <DropdownMenu>
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
    const apptBtn = <Button variant={isDialer || isAdmin || isLeadGenAdmin ? "default" : "outline"} onClick={() => setIsScheduleAppointmentOpen(true)}><CalendarIcon className="mr-2 h-4 w-4" />Schedule Appointment</Button>;
    const callBtn = <Button variant={isFieldSales ? "secondary" : "outline"} onClick={() => setShowPostCallDialog(true)}><PhoneCall className="mr-2 h-4 w-4" />{isFieldSales ? 'Log Outcome' : 'Log a Call'}</Button>;
    const processBtn = <Button onClick={() => setShowPostCallDialog(true)}><Briefcase className="mr-2 h-4 w-4" />Process Field Lead</Button>;
    const noteBtn = <Button variant="outline" onClick={() => setIsLogNoteOpen(true)}><ClipboardEdit className="mr-2 h-4 w-4" />Log a Note</Button>;
    const moveBtn = <Button variant="outline" onClick={() => setIsMoveLeadDialogOpen(true)}><Move className="mr-2 h-4 w-4" />Move Lead</Button>;

    if (isAdmin) return <div className="flex flex-wrap items-center gap-2">{checkInBtn}{processBtn}{apptBtn}{signupBtn}{trialBtn}{noteBtn}{moveBtn}</div>;
    if (isLeadGenAdmin) return <div className="flex flex-wrap items-center gap-2">{processBtn}{apptBtn}{noteBtn}{moveBtn}</div>;
    if (isFieldSales) return <div className="flex flex-wrap items-center gap-2">{checkInBtn}{signupBtn}{trialBtn}{callBtn}{noteBtn}{moveBtn}</div>;
    if (isDialer) return <div className="flex flex-wrap items-center gap-2">{apptBtn}{callBtn}{noteBtn}{moveBtn}</div>;
    return null;
  };

  const callHistory = (activities || []).filter(a => a.type === 'Call' && a.callId);
  const fullAddressStr = lead.address ? formatAddress(lead.address) : 'No address available';

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
             <CardHeader className="flex flex-row items-center justify-between">
               <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-muted-foreground" />Company Details</CardTitle>
               <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleAiProspect} disabled={isProspecting}><Sparkles className="mr-2 h-4 w-4" /> AI Prospect</Button>
                    <Button variant="outline" size="sm" onClick={handleFindNearbyCompanies} disabled={isFindingNearby}><Building className="mr-2 h-4 w-4" /> Nearby</Button>
                    <Dialog open={isEditLeadDialogOpen} onOpenChange={setIsEditLeadDialogOpen}>
                      <DialogTrigger asChild><Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button></DialogTrigger>
                      <DialogContent><DialogHeader><DialogTitle>Edit Details</DialogTitle></DialogHeader><EditLeadForm lead={lead} onLeadUpdated={handleLeadUpdated} /></DialogContent>
                    </Dialog>
               </div>
             </CardHeader>
             <CardContent className="space-y-4">
                {lead.companyDescription && <div className="text-sm border-l-4 border-primary pl-4 py-2 bg-secondary/50 rounded-r-md">{lead.companyDescription}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Customer ID</p>
                        <div className="flex items-center gap-2">
                            <p className="font-medium">{lead.entityId || 'N/A'}</p>
                            {lead.entityId && (
                                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(lead.entityId, 'Customer ID')}>
                                    <Clipboard className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">NetSuite Internal ID</p>
                        <div className="flex items-center gap-2">
                            <p className="font-medium">{lead.salesRecordInternalId || 'N/A'}</p>
                            {lead.salesRecordInternalId && (
                                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(lead.salesRecordInternalId, 'Internal ID')}>
                                    <Clipboard className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Franchisee</p>
                        <p className="font-medium">{lead.franchisee || 'N/A'}</p>
                    </div>
                    <div className="space-y-1"><p className="text-muted-foreground">Website</p>{lead.websiteUrl ? <a href={lead.websiteUrl} target="_blank" className="text-primary hover:underline flex items-center gap-1">{lead.websiteUrl}<LinkIcon className="w-3" /></a> : 'N/A'}</div>
                    <div className="space-y-1"><p className="text-muted-foreground">Industry</p><p className="font-medium">{lead.industryCategory || 'N/A'}</p></div>
                    <div className="space-y-1"><p className="text-muted-foreground">Assigned Rep</p><p className="font-medium">{lead.salesRepAssigned || 'N/A'}</p></div>
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
                        <div className="text-center"><p className="text-sm text-muted-foreground">Score</p><p className="text-2xl font-bold">{linkedVisitNote.discoveryData?.score ?? 'N/A'}</p></div>
                        <div className="text-center"><p className="text-sm text-muted-foreground">Routing</p><Badge variant="outline">{linkedVisitNote.discoveryData?.routingTag ?? 'N/A'}</Badge></div>
                    </div>
                    {linkedVisitNote.discoveryData && <DiscoveryRadarChart discoveryData={linkedVisitNote.discoveryData as DiscoveryData} />}
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
                    <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-muted-foreground" />Contacts</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {contacts.map(contact => (
                            <Card key={contact.id} className="p-3 text-sm">
                                <p className="font-semibold">{contact.name}</p>
                                <p className="text-xs text-muted-foreground mb-2">{contact.title}</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{contact.email}</div>
                                    <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{contact.phone} <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleInitiateCall(lead.id, contact.phone)}><PhoneCall className="w-3" /></Button></div>
                                </div>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-muted-foreground" />Address</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-4">
                        <p className="text-muted-foreground">{fullAddressStr}</p>
                        {lead.address?.lat && (
                            <div className="h-40 rounded-md border overflow-hidden">
                                <iframe width="100%" height="100%" frameBorder="0" style={{ border: 0 }} src={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddressStr)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}></iframe>
                            </div>
                        )}
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
                <CardHeader><CardTitle className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-muted-foreground" />Appointments</CardTitle></CardHeader>
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
                                <PopoverContent className="w-auto p-0"><CalendarPicker mode="single" selected={newTaskDueDate} onSelect={setNewTaskDueDate} initialFocus /></PopoverContent>
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
    </>
  )
}
