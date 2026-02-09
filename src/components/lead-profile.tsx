
'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building,
  Building2,
  Calendar,
  CheckCircle,
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
} from 'lucide-react'
import { useEffect, useState, useMemo, useCallback } from 'react'
import type { Lead, Contact, Activity, Note, Transcript, Task, DiscoveryData, Appointment, Address, LeadStatus, Invoice, UserProfile, CheckinQuestion, VisitNote } from '@/lib/types'
import { aiLeadScoring, AiLeadScoringOutput } from '@/ai/flows/ai-lead-scoring'
import { improveScript, ImproveScriptOutput } from '@/ai/flows/improve-script'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import { getCallTranscriptByCallId } from '@/ai/flows/get-call-transcript-flow'
import { deleteContactFromLead, logActivity, updateLeadAvatar, logNoteActivity, updateLeadStatus, getLeadActivity, getLeadTasks, addTaskToLead, updateTaskCompletion, deleteTaskFromLead, updateLeadDiscoveryData, getLeadFromFirebase, getLeadContacts, getLeadAppointments, updateLeadDetails, getLeadsFromFirebase, getLeadNotes, getLeadTranscripts, updateLeadSalesRep, logCallActivity, getCompaniesFromFirebase, getAllUsers, moveLeadToBucket, updateContactInLead } from '@/services/firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AddContactForm } from '@/components/add-contact-form'
import { EditContactForm } from '@/components/edit-contact-form'
import { LogNoteDialog } from '@/components/log-note-dialog'
import { useToast } from '@/hooks/use-toast'
import { EditLeadForm } from '@/components/edit-lead-form'
import { Loader } from '@/components/ui/loader'
import { Textarea } from '@/components/ui/textarea'
import { MapModal } from '@/components/map-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { collection, onSnapshot, query, where, orderBy, getDocs, limit, doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { PostCallOutcomeDialog } from './post-call-outcome-dialog'
import { TranscriptViewer } from './transcript-viewer'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker';
import { Calendar as CalendarPicker } from './ui/calendar'
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


interface LeadProfileProps {
  initialLead: Lead;
}

interface MoveLeadDialogProps {
  lead: Lead;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadMoved: () => void;
}

function MoveLeadDialog({ lead, isOpen, onOpenChange, onLeadMoved }: MoveLeadDialogProps) {
    const [bucket, setBucket] = useState<'field' | 'outbound' | ''>('');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const { toast } = useToast();
    
    useEffect(() => {
        const fetchUsers = async () => {
            if (!isOpen) return;

            setIsLoadingUsers(true);
            const allUsers = await getAllUsers();
            const filteredUsers = allUsers.filter(u => {
                if (bucket === 'field') {
                    return u.role === 'Field Sales' || u.role === 'admin';
                }
                if (bucket === 'outbound') {
                    return u.role === 'user';
                }
                return false;
            });
            setUsers(filteredUsers);
            setIsLoadingUsers(false);
        };
        fetchUsers();
    }, [bucket, isOpen]);

    const handleMoveLead = async () => {
        if (!bucket || !selectedUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a bucket and a user.' });
            return;
        }
        setIsMoving(true);
        try {
            await moveLeadToBucket({
                leadId: lead.id,
                fieldSales: bucket === 'field',
                assigneeDisplayName: selectedUser,
            });
            toast({ title: 'Success', description: 'Lead has been moved and reassigned.' });
            onLeadMoved();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to move lead:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not move the lead.' });
        } finally {
            setIsMoving(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setBucket('');
            setSelectedUser('');
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Move Lead</DialogTitle>
                    <DialogDescription>Move {lead.companyName} to a different sales bucket and reassign.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Bucket</Label>
                        <RadioGroup value={bucket} onValueChange={(value) => setBucket(value as 'field' | 'outbound')}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="field" id="field" />
                                <Label htmlFor="field">Field Sales (fieldSales = true)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="outbound" id="outbound" />
                                <Label htmlFor="outbound">Outbound (fieldSales = false)</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    {bucket && (
                         <div className="space-y-2">
                             <Label>Assign To</Label>
                             <Select value={selectedUser} onValueChange={setSelectedUser}>
                                <SelectTrigger disabled={isLoadingUsers}>
                                    <SelectValue placeholder={isLoadingUsers ? 'Loading users...' : 'Select a user'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map(user => (
                                        <SelectItem key={user.uid} value={user.displayName!}>
                                            {user.displayName} ({user.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                         </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleMoveLead} disabled={!bucket || !selectedUser || isMoving}>
                        {isMoving ? <Loader/> : 'Confirm Move'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function LeadProfile({ initialLead }: LeadProfileProps) {
  const [lead, setLead] = useState<Lead>(initialLead);
  const [scoringResult, setScoringResult] = useState<AiLeadScoringOutput['scoredLeads'][0] | null>(null);
  const [isImprovingScript, setIsImprovingScript] = useState(false);
  const [isProspecting, setIsProspecting] = useState(false);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);
  const [sessionLeads, setSessionLeads] = useState<string[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [loadingNextLead, setLoadingNextLead] = useState(false);
  const [loadingBack, setLoadingBack] = useState(false);
  const [nearbyCompanies, setNearbyCompanies] = useState<Lead[]>([]);
  const [isNearbyCompaniesDialogOpen, setIsNearbyCompaniesDialogOpen] = useState(false);
  const [isFindingNearby, setIsFindingNearby] = useState(false);
  const [isMoveLeadDialogOpen, setIsMoveLeadDialogOpen] = useState(false);
  const [isLogNoteOpen, setIsLogNoteOpen] = useState(false);
  const [visitNoteDiscovery, setVisitNoteDiscovery] = useState<Partial<DiscoveryData> | null>(null);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(false);


  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  
  const isCompanyProfile = pathname.startsWith('/companies/');
  const { contacts = [], activity: activities = [], notes = [], transcripts = [], tasks = [], appointments = [], invoices = [] } = lead;


  useEffect(() => {
    setLead(initialLead);
    const visitNoteId = initialLead.visitNoteID;
    const fetchVisitNoteData = async () => {
        if (visitNoteId) {
            setIsDiscoveryLoading(true);
            try {
                const noteRef = doc(firestore, 'visitnotes', visitNoteId);
                const noteSnap = await getDoc(noteRef);
                if (noteSnap.exists()) {
                    const visitNote = noteSnap.data() as VisitNote;
                    if (visitNote.discoveryData) {
                        setVisitNoteDiscovery(visitNote.discoveryData);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch visit note discovery data:", error);
            } finally {
                setIsDiscoveryLoading(false);
            }
        }
    };
    fetchVisitNoteData();

    const sessionLeadIds = localStorage.getItem('dialingSessionLeads');
    if (sessionLeadIds) {
      const leads = JSON.parse(sessionLeadIds);
      setSessionLeads(leads);
      if (initialLead && leads.includes(initialLead.id)) {
        setIsSessionActive(true);
      } else {
        setIsSessionActive(false);
      }
    } else {
      setIsSessionActive(false);
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
    if (newStatus) {
       setLead(prev => ({...prev!, status: newStatus}));
    }
    
    if (isSessionActive) {
        const currentLeadId = lead?.id;
        if(currentLeadId) {
            const updatedSessionLeads = sessionLeads.filter(id => id !== currentLeadId);
            localStorage.setItem('dialingSessionLeads', JSON.stringify(updatedSessionLeads));
            setSessionLeads(updatedSessionLeads);
        }
    }
};


  const handleCalculateScore = async () => {
    if (!lead) return;
    try {
        setScoringLoading(true);
        const leadToScore = {
            leadId: lead.id,
            leadProfile: lead.profile,
            websiteUrl: lead.websiteUrl,
            activity: activities || []
        };
        const scoring = await aiLeadScoring([leadToScore]);
        if (scoring.scoredLeads.length > 0) {
            const result = scoring.scoredLeads[0];
            setScoringResult(result);
            setLead(prev => ({ ...prev!, aiScore: result.score, aiReason: result.reason }));
        }
    } catch (error) {
        console.error("Failed to calculate score:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to calculate AI score." });
    } finally {
        setScoringLoading(false);
    }
  }

  const handleProspectWebsite = async () => {
    if (!lead || !lead.websiteUrl) {
        toast({ variant: "destructive", title: "No Website", description: "No website URL available for this lead to prospect." });
        return;
    }
    try {
        setIsProspecting(true);
        const result = await prospectWebsiteTool({
            leadId: lead.id,
            websiteUrl: lead.websiteUrl,
        });
        
        if (result.logoUrl) {
          await updateLeadAvatar(lead.id, result.logoUrl);
          setLead(prev => ({ ...prev!, avatarUrl: result.logoUrl! }));
          toast({ title: "Logo Found!", description: "Company logo has been updated." });
        }
        
        if (result.companyDescription) {
            setLead(prev => ({...prev!, companyDescription: result.companyDescription! }));
            toast({ title: "Description Generated", description: "Company description has been updated." });
        }
        
        if (result.contacts && result.contacts.length > 0) {
            setLead(prev => ({...prev!, contacts: [...(prev!.contacts || []), ...result.contacts!]}));
            toast({ title: "Success", description: `${result.contacts.length} new contact(s) found and saved.` });
        } else {
            toast({ title: "No New Contacts", description: "No new contacts were found on the website." });
        }

    } catch (error) {
        console.error("Failed to prospect website:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to prospect website." });
    } finally {
        setIsProspecting(false);
    }
  };

  const addActivity = async (newActivity: Omit<Activity, 'id' | 'date'>) => {
    if (lead) {
        const newActivityId = await logActivity(lead.id, { ...newActivity, date: new Date().toISOString() });
        setLead(prev => ({...prev!, activity: [{...newActivity, id: newActivityId, date: new Date().toISOString()}, ...(prev!.activity || [])] as Activity[] }));
    }
  };

  const handleNoteLogged = (newNote: Note) => {
    setLead(prev => ({...prev!, notes: [newNote, ...(prev!.notes || [])]}));
    setIsLogNoteOpen(false);
  };
  
  const handleContactAdded = (newContactData: any) => {
    const newContact: Contact = {
        id: 'temp-' + Date.now(), // Temporary unique ID for rendering
        name: `${newContactData.firstName} ${newContactData.lastName}`,
        title: newContactData.title,
        email: newContactData.email,
        phone: newContactData.phone,
    };
    setLead(prev => ({...prev!, contacts: [newContact, ...(prev!.contacts || [])]}));
  };

  const handleContactUpdated = (updatedContact: Contact) => {
     addActivity({
        type: 'Update',
        notes: `Contact ${updatedContact.name} updated.`,
        author: user?.displayName,
     });
     setLead(prev => ({...prev!, contacts: (prev!.contacts || []).map(c => c.id === updatedContact.id ? updatedContact : c)}));
  };

  const handleLeadUpdated = (updatedLeadData: Partial<Lead>, oldLead: Lead) => {
    setLead(prev => ({ ...prev!, ...updatedLeadData }));
    setIsEditLeadDialogOpen(false);
  }

  const handleDeleteContact = async (contact: Contact) => {
    if (!lead) return;
    try {
      await deleteContactFromLead(lead.id, contact.id, contact.name);
      setLead(prev => ({...prev!, contacts: (prev!.contacts || []).filter(c => c.id !== contact.id)}));
      toast({ title: "Success", description: "Contact deleted successfully." });
    } catch (error) {
      console.error("Failed to delete contact:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete contact." });
    }
  };

  const handleInitiateCall = (phoneNumber: string) => {
    if (!lead) return;
    window.open(`aircall:${phoneNumber}`);
    logActivity(lead.id, { type: 'Call', notes: `Initiated call to ${phoneNumber} via AirCall app.`, date: new Date().toISOString() });
    toast({
        title: "Opening AirCall",
        description: `Attempting to dial ${phoneNumber}...`,
    });
  };

  const handleCopy = (text: string | null | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
        title: "Copied to clipboard",
        description: `${fieldName} copied successfully.`,
    });
  };

  const handleGetTranscriptForCall = async (callId: string) => {
    console.log(`[Client] 'Fetch Transcript' button clicked for call ID: ${callId}`);

    if (!lead) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not identify lead.' });
      return;
    }
    if (!lead.dialerAssigned) {
      toast({ variant: 'destructive', title: 'Error', description: 'Lead has no assigned dialer to attribute the transcript to.' });
      return;
    }
    try {
      console.log('[Client] Calling getCallTranscriptByCallId flow...');
      setFetchingTranscriptId(callId);
      
      const result = await getCallTranscriptByCallId({
        callId: callId,
        leadId: lead.id,
        leadAuthor: lead.dialerAssigned,
      });
      
      console.log('[Client] Flow result:', result);

      if (result.transcriptFound) {
        toast({ title: "Success", description: "Transcript fetched and logged." });
        const newTranscript = {
          id: 'temp-' + callId,
          callId: callId,
          date: new Date().toISOString(),
          content: '{"utterances":[]}', // Placeholder
          author: lead.dialerAssigned
        };
        setLead(prev => ({...prev!, transcripts: [newTranscript, ...(prev!.transcripts || [])]}));
      } else {
        toast({ variant: "destructive", title: "Failed", description: result.error || "Could not retrieve transcript." });
      }
    } catch (error: any) {
      console.error("[Client] Error calling flow:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "An unexpected error occurred during analysis." });
    } finally {
      setFetchingTranscriptId(null);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newTaskTitle || !newTaskDueDate || !user?.displayName) {
        toast({ variant: 'destructive', title: 'Error', description: 'Task title and due date are required.' });
        return;
    }
    try {
        const newTask = await addTaskToLead(lead.id, {
            title: newTaskTitle,
            dueDate: newTaskDueDate.toISOString(),
            author: user.displayName,
        });
        setLead(prev => ({...prev!, tasks: [newTask, ...(prev!.tasks || [])].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())}));
        setNewTaskTitle('');
        setNewTaskDueDate(undefined);
        toast({ title: 'Success', description: 'Task added successfully.' });
    } catch (error) {
        console.error("Failed to add task:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to add task." });
    }
  };

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
      if (!lead) return;
      try {
          await updateTaskCompletion(lead.id, taskId, isCompleted);
          setLead(prev => ({...prev!, tasks: (prev!.tasks || []).map(t => t.id === taskId ? {...t, isCompleted, completedAt: isCompleted ? new Date().toISOString() : undefined} : t)}));
          toast({ title: 'Success', description: `Task marked as ${isCompleted ? 'complete' : 'incomplete'}.` });
      } catch (error) {
          console.error("Failed to update task:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to update task." });
      }
  };

  const handleDeleteTask = async (taskId: string) => {
      if (!lead) return;
      try {
          await deleteTaskFromLead(lead.id, taskId);
          setLead(prev => ({...prev!, tasks: (prev!.tasks || []).filter(t => t.id !== taskId)}));
          toast({ title: 'Success', description: 'Task deleted successfully.' });
      } catch (error) {
          console.error("Failed to delete task:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to delete task." });
      }
  };

  const handleDiscoverySave = async (discoveryData: DiscoveryData) => {
    if (!lead) return;
    try {
      await updateLeadDiscoveryData(lead.id, discoveryData);
      setLead(prev => ({ ...prev!, discoveryData: discoveryData }));
      toast({ title: 'Success', description: 'Discovery questions saved.' });
      setIsDiscoveryQuestionsOpen(false);
    } catch (error: any) {
        console.error("[Client] Failed to save discovery data to Firebase:", error);
        toast({ variant: "destructive", title: "Firebase Error", description: `Failed to save discovery data: ${error.message}` });
    }
  };

  const handleDiscoveryClose = (open: boolean) => {
    setIsDiscoveryQuestionsOpen(open);
  }

  const handleAddressSave = async (newAddress: Address) => {
    if (!lead) return;
    try {
      await updateLeadDetails(lead.id, lead, { address: newAddress });
      setLead(prev => ({ ...prev!, address: newAddress }));
      toast({ title: "Success", description: "Address updated successfully." });
    } catch (error) {
      console.error("Failed to update address:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update address." });
    } finally {
      setIsEditAddressDialogOpen(false);
    }
  }

  const { nextLeadId, hasNextLead } = useMemo(() => {
    if (!lead || !isSessionActive || sessionLeads.length === 0) {
      return { nextLeadId: null, hasNextLead: false };
    }
    if (!sessionLeads.includes(lead.id)) {
      return { nextLeadId: sessionLeads[0], hasNextLead: true };
    }

    const currentIndex = sessionLeads.indexOf(lead.id);
    if (currentIndex < sessionLeads.length - 1) {
      return { nextLeadId: sessionLeads[currentIndex + 1], hasNextLead: true };
    }
    
    return { nextLeadId: null, hasNextLead: false };
}, [lead, sessionLeads, isSessionActive]);

  const handleNextLead = () => {
    setLoadingNextLead(true);
    if (nextLeadId) {
      router.push(`/leads/${nextLeadId}`);
    } else {
      localStorage.removeItem('dialingSessionLeads');
      toast({ title: "Dialing Session Complete!", description: "You've actioned all leads in this session."});
      router.push('/leads');
    }
  };
  
  const handleEndSession = () => {
    localStorage.removeItem('dialingSessionLeads');
    setIsSessionActive(false);
    setSessionLeads([]);
    toast({ title: 'Dialing Session Ended', description: 'You can start a new session from the leads page.' });
  };

  const handleBackToLeads = () => {
    setLoadingBack(true);
    const destination = isCompanyProfile ? '/signed-customers' : '/leads';
    router.push(destination);
  };
  
  const handleRepSelection = (repName: string, repUrl: string) => {
    if (!lead) return;
    
    setLead(prev => ({ ...prev!, salesRepAssigned: repName, salesRepAssignedCalendlyLink: repUrl }));
    toast({ title: "Sales Rep Updated", description: `${repName} has been assigned to this lead.` });

    updateLeadSalesRep(lead.id, repName, repUrl)
        .then(() => {
            console.log(`Lead ${lead.id} successfully assigned to ${repName} in the background.`);
        })
        .catch(error => {
            console.error("Failed to assign sales rep in the background:", error);
            toast({ variant: "destructive", title: "Background Sync Failed", description: "Could not save the sales rep assignment." });
        });
  };

  const handleFindNearbyCompanies = useCallback(async () => {
    if (!lead.latitude || !lead.longitude || !window.google?.maps?.geometry) {
        toast({ variant: 'destructive', title: 'Location Missing', description: 'This lead does not have valid coordinates to find nearby customers.' });
        return;
    }

    setIsFindingNearby(true);
    try {
        const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
        const allCompanies = await getCompaniesFromFirebase();
        
        const nearby = allCompanies.filter(company => {
          if (!company.latitude || !company.longitude || company.id === lead.id) {
            return false;
          }
          const itemLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
          const distance = window.google.maps.geometry.spherical.computeDistanceBetween(leadLatLng, itemLatLng);
          return distance <= 500; // 500m radius
        });

        setNearbyCompanies(nearby);
        setIsNearbyCompaniesDialogOpen(true);
        if(nearby.length === 0) {
            toast({ title: 'No Nearby Customers', description: 'No signed customers found within a 500m radius.' });
        }
    } catch (error) {
        console.error("Error finding nearby companies:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch nearby companies.' });
    } finally {
        setIsFindingNearby(false);
    }
  }, [lead, toast]);


  const renderActionButtons = () => {
    const isAdmin = userProfile?.role === 'admin';
    const isLeadGenAdmin = userProfile?.role === 'Lead Gen Admin';
    const isFieldSales = userProfile?.role === 'Field Sales';
    const isFieldSalesAdmin = userProfile?.role === 'Field Sales Admin';
    const isDialer = userProfile?.role === 'user' || userProfile?.role === 'Lead Gen';

    const checkInButton = (
      <Button variant="secondary" onClick={() => router.push(`/check-in/${lead.id}`)}>
        <CheckSquare className="mr-2 h-4 w-4" />
        Check In
      </Button>
    );

    const signupButton = (
      <Button variant={(isFieldSales || isFieldSalesAdmin || isAdmin) ? "default" : "outline"} onClick={() => router.push(`/check-in/${lead.id}/select-services?mode=signup`)}>
        <Briefcase className="mr-2 h-4 w-4" />
        Signup
      </Button>
    );

    const freeTrialButton = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={(isFieldSales || isFieldSalesAdmin || isAdmin) ? "default" : "outline"}>
                <Sparkles className="mr-2 h-4 w-4" />
                Free Trial
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => router.push(`/check-in/${lead.id}/select-services?mode=service-trial`)}>Service</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/check-in/${lead.id}/select-services?mode=shipmate-trial`)}>ShipMate</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/check-in/${lead.id}/select-services?mode=localmile-trial`)}>LocalMile</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const scheduleAppointmentButton = (
        <Button variant={isDialer || isAdmin || isLeadGenAdmin ? "default" : "outline"} onClick={() => setIsScheduleAppointmentOpen(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Appointment
        </Button>
    );
    
    const logCallButton = (
        <Button variant={(isFieldSales || isFieldSalesAdmin) ? "secondary" : "outline"} onClick={() => { setLastCallActivity(null); setShowPostCallDialog(true); }}>
            <PhoneCall className="mr-2 h-4 w-4" />{(isFieldSales || isFieldSalesAdmin) ? 'Log Outcome' : 'Log a Call'}
        </Button>
    );

    const processFieldLeadButton = (
      <Button onClick={() => { setLastCallActivity(null); setShowPostCallDialog(true); }}>
        <Briefcase className="mr-2 h-4 w-4" />
        Process Field Lead
      </Button>
    );

    const logNoteButton = (
        <Button variant="outline" onClick={() => setIsLogNoteOpen(true)}>
            <ClipboardEdit className="mr-2 h-4 w-4" />
            Log a Note
        </Button>
    );
    
    const viewScriptButton = (
        <Button variant="outline" onClick={() => window.open('https://illicium.com.au/revup_client_assets/mailplus_catch_all.html', '_blank')}>
            <BookText className="mr-2 h-4 w-4" />View Script
        </Button>
    );
    
    const scorecardButton = (
        <ColdCallScorecardDialog lead={lead} dialerName={lead.dialerAssigned || userProfile.displayName || ''} onScorecardSubmit={() => {}} />
    );
    
    const moveLeadButton = (
        <Button variant="outline" onClick={() => setIsMoveLeadDialogOpen(true)}>
            <Move className="mr-2 h-4 w-4" />
            Move Lead
        </Button>
    );

    if (isAdmin || isLeadGenAdmin) {
        return <div className="flex flex-wrap items-center gap-2">{checkInButton}{processFieldLeadButton}{scheduleAppointmentButton}{signupButton}{freeTrialButton}{logNoteButton}{viewScriptButton}{scorecardButton}{moveLeadButton}</div>;
    }
    
    if (isFieldSales || isFieldSalesAdmin) {
        return <div className="flex flex-wrap items-center gap-2">{checkInButton}{signupButton}{freeTrialButton}{logCallButton}{logNoteButton}{scorecardButton}{moveLeadButton}</div>;
    }
    
    if (isDialer) {
        return <div className="flex flex-wrap items-center gap-2">{scheduleAppointmentButton}{logCallButton}{logNoteButton}{viewScriptButton}{moveLeadButton}</div>;
    }

    return null;
  };


  if (!lead || !user) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }
  
  const fullAddress = lead.address
    ? [lead.address.address1, lead.address.street, lead.address.city, lead.address.state, lead.address.zip, lead.address.country].filter(Boolean).join(', ')
    : 'No address available';

  const primaryContact = contacts && contacts.length > 0 ? contacts[0] : null;
  
  const callHistory = useMemo(() => {
    return (activities || []).filter(a => a.type === 'Call' && a.callId);
  }, [activities]);
  
  const contactAttempts = useMemo(() => {
    return (activities || []).filter(a => a.type === 'Call' && a.callId).length;
  }, [activities]);

  const formatAddress = (address?: { street?: string; city?: string; state?: string, franchisee?: string } | string) => {
    if (!address) return 'Address not available';
    if (typeof address === 'string') return address;
    return [
        address.street,
        address.city,
        address.state,
    ].filter(Boolean).join(', ');
  }

  return (
    <>
    <MoveLeadDialog
        lead={lead}
        isOpen={isMoveLeadDialogOpen}
        onOpenChange={setIsMoveLeadDialogOpen}
        onLeadMoved={() => router.refresh()} // Refresh page data after moving
    />
     {isScheduleAppointmentOpen && (
        <ScheduleAppointmentDialog
            isOpen={isScheduleAppointmentOpen}
            onOpenChange={setIsScheduleAppointmentOpen}
            lead={lead}
        />
    )}

    <Dialog open={isNearbyCompaniesDialogOpen} onOpenChange={setIsNearbyCompaniesDialogOpen}>
      <DialogContent className="max-w-3xl">
          <DialogHeader>
              <DialogTitle>Nearby Signed Customers</DialogTitle>
              <DialogDescription>
                  Found {nearbyCompanies.length} signed customer(s) within a 500m radius of {lead?.companyName}.
              </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
              {nearbyCompanies.length > 0 ? (
                  <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company Name</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Industry</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {nearbyCompanies.map(company => (
                                <TableRow key={company.id}>
                                    <TableCell className="font-semibold">{company.companyName}</TableCell>
                                    <TableCell>{formatAddress(company.address as Address)}</TableCell>
                                    <TableCell>{company.industryCategory || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
              ) : (
                  <p className="text-center text-muted-foreground py-8">No nearby customers found.</p>
              )}
          </ScrollArea>
           <DialogFooter>
              <Button onClick={() => setIsNearbyCompaniesDialogOpen(false)}>Close</Button>
           </DialogFooter>
      </DialogContent>
    </Dialog>
    <PostCallOutcomeDialog
        isOpen={showPostCallDialog}
        onClose={() => {
            setShowPostCallDialog(false);
        }}
        lead={lead}
        callActivity={lastCallActivity}
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
              <Button onClick={handleEndSession} variant="destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  End Session
              </Button>
              <Button onClick={handleNextLead} disabled={loadingNextLead}>
                  {loadingNextLead ? <Loader /> : <SkipForward className="mr-2 h-4 w-4" />}
                  {loadingNextLead ? 'Loading...' : 'Next in Session'}
              </Button>
          </div>
        )}
      </div>

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{lead.companyName}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <LeadStatusBadge status={lead.status} />
                <>
                  <p className="text-muted-foreground">&bull; {contacts?.length || 0} {contacts?.length === 1 ? 'Contact' : 'Contacts'}</p>
                  <p className="text-muted-foreground">&bull; Contacted {contactAttempts} {contactAttempts === 1 ? 'time' : 'times'}</p>
                </>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            {renderActionButtons()}
        </div>
      </header>

      <DiscoveryQuestionsDialog 
        lead={lead} 
        onSave={handleDiscoverySave}
        isOpen={isDiscoveryQuestionsOpen}
        onOpenChange={handleDiscoveryClose}
      />

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
             <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
               <CardTitle className="flex items-center gap-2">
                 <Building className="w-5 h-5 text-muted-foreground" />
                 Company Details
               </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleProspectWebsite} disabled={isProspecting || !lead.websiteUrl}>
                        {isProspecting ? <Loader /> : <><Sparkles className="mr-2 h-4 w-4" /><span>AI Prospect</span></>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleFindNearbyCompanies} disabled={isFindingNearby}>
                        {isFindingNearby ? <Loader /> : <><Building className="mr-2 h-4 w-4" /> Nearby Customers</>}
                    </Button>
                    <Dialog open={isEditLeadDialogOpen} onOpenChange={setIsEditLeadDialogOpen}>
                      <DialogTrigger asChild>
                         <Button variant="outline" size="sm">
                           <Edit className="mr-2 h-4 w-4" />
                           Edit Details
                         </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Lead Details</DialogTitle>
                        </DialogHeader>
                        <EditLeadForm lead={lead} onLeadUpdated={handleLeadUpdated} />
                      </DialogContent>
                    </Dialog>
                </div>
             </CardHeader>
             <CardContent className="space-y-4">
                {lead.companyDescription && (
                    <div className="text-sm text-muted-foreground border-l-4 border-primary pl-4 py-2 bg-secondary/50 rounded-r-md">
                        {lead.companyDescription}
                    </div>
                )}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                 <div className="flex items-start gap-3">
                   <Key className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Customer ID</p>
                     <div className="flex items-center gap-1">
                        <p className="font-medium break-all">{lead.entityId ?? 'N/A'}</p>
                        {lead.entityId && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(lead.entityId, 'Customer ID')}>
                                <Clipboard className="w-3 h-3" />
                            </Button>
                        )}
                     </div>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Hash className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">NetSuite Internal ID</p>
                     <div className="flex items-center gap-1">
                        <p className="font-medium break-all">{lead.id ?? 'N/A'}</p>
                        {lead.id && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(lead.id, 'NetSuite Internal ID')}>
                                <Clipboard className="w-3 h-3" />
                            </Button>
                        )}
                     </div>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Tag className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Franchisee</p>
                     <p className="font-medium">{lead.franchisee ?? 'N/A'}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Globe className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Website</p>
                     {lead.websiteUrl ? (
                        <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1 break-all">
                            <span>{lead.websiteUrl}</span>
                            <LinkIcon className="w-3 h-3 shrink-0" />
                        </a>
                     ) : (
                        <p className="font-medium">N/A</p>
                     )}
                   </div>
                 </div>
                  <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Industry</p>
                     <p className="font-medium">{lead.industryCategory ?? 'N/A'}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Tag className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Sub-Industry</p>
                     <p className="font-medium">{lead.industrySubCategory || 'N/A'}</p>
                   </div>
                 </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <div className="flex items-center gap-1">
                        <p className="font-medium break-all">{lead.customerServiceEmail ?? 'N/A'}</p>
                        {lead.customerServiceEmail && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(lead.customerServiceEmail, 'Email')}>
                                <Clipboard className="w-3 h-3" />
                            </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <div className="flex items-center gap-1">
                        <span className="font-medium break-all">{lead.customerPhone ?? 'N/A'}</span>
                        {lead.customerPhone && (
                            <>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(lead.customerPhone, 'Phone')}>
                                <Clipboard className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleInitiateCall(lead.customerPhone!)}>
                                <PhoneCall className="w-3 h-3" />
                            </Button>
                            </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Sales Rep Assigned</p>
                      {lead.salesRepAssigned ? (
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                            <Button variant="link" className="p-0 h-auto font-medium">
                                {lead.salesRepAssigned} <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent>
                                {salesReps.map(rep => (
                                    <DropdownMenuItem key={rep.name} onSelect={() => handleRepSelection(rep.name, rep.url)}>
                                        Assign to {rep.name}
                                    </DropdownMenuItem>
                                ))}
                           </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="link" className="p-0 h-auto font-medium">
                                Assign a Sales Rep <ChevronDown className="ml-2 h-4 w-4" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent>
                                {salesReps.map(rep => (
                                    <DropdownMenuItem key={rep.name} onSelect={() => handleRepSelection(rep.name, rep.url)}>
                                        {rep.name}
                                    </DropdownMenuItem>
                                ))}
                           </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                   <div className="flex items-start gap-3">
                    <Briefcase className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Campaign</p>
                      <p className="font-medium">{lead.campaign ?? 'N/A'}</p>
                    </div>
                  </div>
                   <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Lead Source</p>
                      <p className="font-medium">{lead.customerSource ?? 'N/A'}</p>
                    </div>
                  </div>
                   <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Date Lead Entered</p>
                      <p className="font-medium">{lead.dateLeadEntered ? new Date(lead.dateLeadEntered).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
               </div>
             </CardContent>
           </Card>
          
          {visitNoteDiscovery && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-muted-foreground" />
                        Field Discovery from Visit Note
                    </CardTitle>
                    <CardDescription>
                        The following discovery data was captured during the initial visit.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isDiscoveryLoading ? (
                        <div className="flex justify-center p-8"><Loader /></div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted">
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-muted-foreground">Score</p>
                                    <p className="text-2xl font-bold">{visitNoteDiscovery.score}</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-muted-foreground">Routing Tag</p>
                                    <Badge variant="outline">{visitNoteDiscovery.routingTag}</Badge>
                                </div>
                            </div>
                            <DiscoveryRadarChart discoveryData={visitNoteDiscovery as DiscoveryData} />
                            {visitNoteDiscovery.scoringReason && (
                                <div className="text-xs text-muted-foreground p-2 border-t">
                                    <strong>Scoring Rationale:</strong> {visitNoteDiscovery.scoringReason}
                                </div>
                            )}
                             <div className="text-sm space-y-2 pt-4 border-t">
                                <h4 className="font-semibold">Captured Answers:</h4>
                                <ul className="list-disc pl-5 text-muted-foreground">
                                    {visitNoteDiscovery.discoverySignals && visitNoteDiscovery.discoverySignals.length > 0 && (
                                        <li><strong>Signals:</strong> {visitNoteDiscovery.discoverySignals.join(', ')}</li>
                                    )}
                                    {visitNoteDiscovery.inconvenience && <li><strong>Inconvenience:</strong> {visitNoteDiscovery.inconvenience}</li>}
                                    {visitNoteDiscovery.occurrence && <li><strong>Occurrence:</strong> {visitNoteDiscovery.occurrence}</li>}
                                    {(visitNoteDiscovery as any).taskOwner && <li><strong>Task Owner:</strong> {(visitNoteDiscovery as any).taskOwner}</li>}
                                </ul>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
          )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-muted-foreground" />
                            Contacts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {contacts.length > 0 ? (
                      <div className="space-y-4">
                      {contacts.map((contact, index) => {
                         return (
                          <Dialog key={contact.id || index} onOpenChange={(open) => !open && setSelectedContact(null)}>
                              <Card className="relative group/contact p-4">
                                  <CardHeader className="flex-row items-start justify-between pb-2 p-0">
                                      <div>
                                          <p className="font-semibold">{contact.name}</p>
                                          <p className="text-sm text-muted-foreground">{contact.title}</p>
                                      </div>
                                      <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                                  <MoreVertical className="h-4 w-4" />
                                              </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent>
                                              <DialogTrigger asChild>
                                                  <DropdownMenuItem onSelect={() => setSelectedContact(contact)}>
                                                      <Edit className="mr-2 h-4 w-4" /> Edit
                                                  </DropdownMenuItem>
                                              </DialogTrigger>
                                              <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                      </DropdownMenuItem>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                      <AlertDialogHeader>
                                                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                          <AlertDialogDescription>
                                                              This will permanently delete the contact {contact.name}. This action cannot be undone.
                                                          </AlertDialogDescription>
                                                      </AlertDialogHeader>
                                                      <AlertDialogFooter>
                                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                          <AlertDialogAction onClick={() => handleDeleteContact(contact)} className="bg-destructive hover:bg-destructive/90">
                                                              Delete
                                                          </AlertDialogAction>
                                                      </AlertDialogFooter>
                                                  </AlertDialogContent>
                                              </AlertDialog>
                                          </DropdownMenuContent>
                                      </DropdownMenu>
                                  </CardHeader>
                                  <CardContent className="space-y-3 text-sm p-0 pt-2">
                                      <div className="flex items-center gap-3">
                                          <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                                          <a href={`mailto:${contact.email}`} className="text-primary hover:underline break-all">
                                              {contact.email}
                                          </a>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                                          <div className="flex items-center gap-1">
                                              <span className="break-all">{contact.phone}</span>
                                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleInitiateCall(contact.phone)}>
                                                  <PhoneCall className="w-3 h-3" />
                                              </Button>
                                          </div>
                                      </div>
                                  </CardContent>
                                  <CardFooter className="p-0 pt-4">
                                       <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => setIsScheduleAppointmentOpen(true)}
                                        >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            Schedule Appointment
                                        </Button>
                                  </CardFooter>
                              </Card>
                              <DialogContent>
                                  <DialogHeader>
                                      <DialogTitle>Edit Contact</DialogTitle>
                                  </DialogHeader>
                                  {selectedContact && (
                                      <EditContactForm
                                          leadId={lead.id}
                                          contact={selectedContact}
                                          onContactUpdated={handleContactUpdated}
                                          onClose={() => setSelectedContact(null)}
                                      />
                                  )}
                              </DialogContent>
                          </Dialog>
                         )
                      })}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-muted-foreground">No contacts found.</div>
                    )}
                     <Dialog>
                      <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full mt-4">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Add Contact
                          </Button>
                      </DialogTrigger>
                      <DialogContent>
                          <DialogHeader>
                          <DialogTitle>Add New Contact</DialogTitle>
                          <DialogDescription>
                              Enter the details for the new contact.
                          </DialogDescription>
                          </DialogHeader>
                          <AddContactForm leadId={lead.id} onContactAdded={handleContactAdded}/>
                      </DialogContent>
                    </Dialog>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                            Address
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div className="flex-1">
                                    <p className="text-muted-foreground break-words">{fullAddress}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={fullAddress === 'No address available'} onClick={() => setSelectedAddress(fullAddress)}>
                                            <Search className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={fullAddress === 'No address available'} onClick={() => handleCopy(fullAddress, 'Address')}>
                                            <Clipboard className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            {fullAddress !== 'No address available' && (
                                <div className="h-48 w-full rounded-md overflow-hidden border">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        style={{ border: 0 }}
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(
                                            fullAddress
                                        )}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                        allowFullScreen
                                        aria-hidden="false"
                                        tabIndex={0}
                                    ></iframe>
                                </div>
                            )}
                                <Dialog open={isEditAddressDialogOpen} onOpenChange={setIsEditAddressDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Address
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Edit Address</DialogTitle>
                                    </DialogHeader>
                                    <AddressAutocomplete
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" />
                History
              </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="notes">
                    <TabsList>
                        <TabsTrigger value="checkin">Check-in Data</TabsTrigger>
                        <TabsTrigger value="notes">Notes</TabsTrigger>
                        <TabsTrigger value="calls">Call History</TabsTrigger>
                        <TabsTrigger value="activity">Activity History</TabsTrigger>
                    </TabsList>
                     <TabsContent value="checkin">
                        {lead.checkinQuestions && lead.checkinQuestions.length > 0 ? (
                            <div className="space-y-4 mt-4">
                            {lead.checkinQuestions.map((q, index) => (
                                <div key={index} className="text-sm border-l-2 pl-4">
                                    <p className="font-semibold">{q.question}</p>
                                    <p className="text-muted-foreground whitespace-pre-wrap">
                                        {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
                                    </p>
                                </div>
                            ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No check-in data recorded for this lead.</p>
                        )}
                    </TabsContent>
                    <TabsContent value="notes">
                        {notes.length > 0 ? (
                            <div className="space-y-4 mt-4">
                            {notes.map(note => (
                            <div key={note.id} className="text-sm border-l-2 pl-4">
                                <p className="whitespace-pre-wrap">{note.content}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                {new Date(note.date).toLocaleString()} by {note.author}
                                </p>
                            </div>
                            ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No notes for this lead yet.</p>
                        )}
                    </TabsContent>
                    <TabsContent value="calls">
                         {callHistory.length > 0 ? (
                            <ul className="space-y-4 mt-4">
                                {callHistory.map((item) => {
                                const transcript = transcripts.find(t => t.callId === item.callId);
                                return (
                                    <li key={item.id} className="flex gap-4 group">
                                    <div className="flex-1 pb-4 border-b last:border-b-0 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                        <p className="font-medium">Call {item.duration && `(${item.duration})`}</p>
                                        <p className="text-sm text-muted-foreground text-right flex-shrink-0">{new Date(item.date).toLocaleString()}</p>
                                        </div>
                                        <div className="text-sm text-muted-foreground break-words">
                                        {item.notes}
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-1 gap-2">
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 break-all">
                                            <Hash className="w-3 h-3 flex-shrink-0" />
                                            <span>Call ID: {item.callId}</span>
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopy(item.callId, 'Call ID')}>
                                                <Clipboard className="w-2.5 h-2.5" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {transcript ? (
                                                <Button variant="outline" size="sm" onClick={()=>{ setSelectedTranscript(transcript); setIsTranscriptViewerOpen(true); }}>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    View Transcript
                                                </Button>
                                            ) : (
                                                <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleGetTranscriptForCall(item.callId!)}
                                                disabled={fetchingTranscriptId === item.callId}
                                                >
                                                {fetchingTranscriptId === item.callId ? <Loader /> : 'Fetch Transcript'}
                                                </Button>
                                            )}
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => window.open(`https://assets.aircall.io/calls/${item.callId}/recording/info`, '_blank')}>
                                                <Voicemail className="mr-2 h-4 w-4" />
                                                Recording
                                            </Button>
                                        </div>
                                        </div>
                                    </div>
                                    </li>
                                )
                                })}
                            </ul>
                            ) : (
                            <p className="text-sm text-center text-muted-foreground py-4">No AirCall call history found.</p>
                            )}
                    </TabsContent>
                    <TabsContent value="activity">
                         {activities.length > 0 ? (
                            <ul className="space-y-4 mt-4">
                            {activities.map((item, index) => (
                                <li key={item.id} className="flex gap-4 group">
                                <div className="flex flex-col items-center">
                                    <div className="bg-secondary rounded-full p-2">
                                    {item.type === 'Call' && <Phone className="h-4 w-4 text-muted-foreground" />}
                                    {item.type === 'Email' && <Mail className="h-4 w-4 text-muted-foreground" />}
                                    {item.type === 'Meeting' && <Calendar className="h-4 w-4 text-muted-foreground" />}
                                    {item.type === 'Update' && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                    {activities && index < activities.length - 1 && (
                                        <div className="w-px h-full bg-border"></div>
                                    )}
                                </div>
                                <div className="flex-1 pb-4 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium">{item.type} {item.type === 'Call' && item.duration && `(${item.duration})`}</p>
                                    <p className="text-sm text-muted-foreground text-right flex-shrink-0">{new Date(item.date).toLocaleString()}</p>
                                    </div>
                                    <div className="text-sm text-muted-foreground break-words">
                                    {item.notes}
                                    </div>
                                </div>
                                </li>
                            ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-center text-muted-foreground py-4">No activity yet.</p>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
          </Card>
          
          <Dialog open={isTranscriptViewerOpen} onOpenChange={setIsTranscriptViewerOpen}>
              <DialogContent className="max-w-2xl">
                  <DialogHeader>
                      <DialogTitle>Call Transcript</DialogTitle>
                  </DialogHeader>
                  {selectedTranscript && lead && (
                      <TranscriptViewer 
                        transcript={selectedTranscript} 
                        leadName={lead.companyName} 
                        leadId={lead.id}
                        onAnalysisComplete={(analysis) => {
                          setLead(prev => ({...prev!, transcripts: (prev!.transcripts || []).map(t => t.id === selectedTranscript.id ? {...t, analysis} : t)}));
                        }}
                      />
                  )}
              </DialogContent>
          </Dialog>

        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        Appointments
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {appointments.length > 0 ? (
                        <>
                        {appointments.map(appointment => (
                            <div key={appointment.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">{format(new Date(appointment.duedate), 'MMM')}</p>
                                    <p className="text-lg font-bold">{format(new Date(appointment.duedate), 'd')}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">
                                        Appointment with {appointment.assignedTo}
                                    </p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(appointment.starttime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </p>
                                </div>
                            </div>
                            </div>
                        ))}
                        </>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-4">No appointments booked for this lead yet.</p>
                    )}
                </CardContent>
          </Card>
          
           <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Route className="w-5 h-5 text-muted-foreground" />
                        Discovery & Routing
                    </CardTitle>
                     <Button variant="outline" size="sm" onClick={() => setIsDiscoveryQuestionsOpen(true)}>
                        <FileQuestion className="mr-2 h-4 w-4" />
                        Open Discovery Form
                    </Button>
                </CardHeader>
                 <CardContent>
                    {lead.discoveryData ? (
                        <div className="flex flex-col gap-4">
                             <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted">
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-muted-foreground">Score</p>
                                    <p className="text-2xl font-bold">{lead.discoveryData.score}</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-muted-foreground">Routing Tag</p>
                                    <Badge variant="outline">{lead.discoveryData.routingTag}</Badge>
                                </div>
                            </div>
                            <DiscoveryRadarChart discoveryData={lead.discoveryData} />
                             {lead.discoveryData.scoringReason && (
                                <div className="text-xs text-muted-foreground p-2 border-t">
                                    <strong>Scoring Rationale:</strong> {lead.discoveryData.scoringReason}
                                </div>
                            )}
                        </div>
                    ) : (
                         <div className="text-center text-muted-foreground py-4">
                            <p>No discovery data yet. Open the form to begin.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
      </main>
    </div>
    <MapModal
        isOpen={!!selectedAddress}
        onClose={() => setSelectedAddress(null)}
        address={selectedAddress || ''}
      />
      <LogNoteDialog lead={lead} onNoteLogged={handleNoteLogged} isOpen={isLogNoteOpen} onOpenChange={setIsLogNoteOpen}/>
    </>
  )
}
