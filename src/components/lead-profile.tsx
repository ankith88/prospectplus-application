
'use client'

import { useRouter } from 'next/navigation'
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
  Lightbulb,
  Link as LinkIcon,
  MessageSquare,
  Mail,
  MoreVertical,
  Phone,
  PlusCircle,
  Sparkles,
  Tag,
  Trash2,
  User,
  Users,
  ClipboardEdit,
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
} from 'lucide-react'
import { useEffect, useState, useMemo, useCallback } from 'react'
import type { Lead, Contact, Activity, Note, Transcript, Task, DiscoveryData, Appointment, Address, LeadStatus } from '@/lib/types'
import { aiLeadScoring, AiLeadScoringOutput } from '@/ai/flows/ai-lead-scoring'
import { improveScript, ImproveScriptOutput } from '@/ai/flows/improve-script'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import { getCallTranscriptByCallId } from '@/ai/flows/get-call-transcript-flow'
import { deleteContactFromLead, logActivity, updateLeadAvatar, logNoteActivity, updateLeadStatus, getLeadActivity, getLeadTasks, addTaskToLead, updateTaskCompletion, deleteTaskFromLead, updateLeadDiscoveryData, getLeadFromFirebase, getLeadContacts, getLeadAppointments, updateLeadDetails, getLeadsFromFirebase, getLeadNotes, getLeadTranscripts, updateLeadSalesRep } from '@/services/firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { Badge } from '@/components/ui/badge'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { PostCallOutcomeDialog } from './post-call-outcome-dialog'
import { TranscriptViewer } from './transcript-viewer'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Calendar as CalendarPicker } from './ui/calendar'
import { DiscoveryQuestionsDialog } from './discovery-questions-form'
import { sendDiscoveryDataToNetSuite, sendLeadUpdateToNetSuite } from '@/services/netsuite'
import { DiscoveryRadarChart } from './discovery-radar-chart'
import { AddressAutocomplete } from './address-autocomplete'
import { cn } from '@/lib/utils'

interface LeadProfileProps {
  initialLead: Lead;
}

type SubcollectionData = {
  contacts: Contact[];
  activity: Activity[];
  notes: Note[];
  transcripts: Transcript[];
  tasks: Task[];
  appointments: Appointment[];
}

const salesReps = [
    { name: 'Lee Russell', url: 'https://calendly.com/lee-russell-mailplus/mailplus-intro-call-lee' },
    { name: 'Kerina Helliwell', url: 'https://calendly.com/kerina-helliwell-mailplus/mailplus-intro-call-kerina' },
    { name: 'Luke Forbes', url: 'https://calendly.com/luke-forbes-mailplus/mailplus-intro-call-luke' },
]

export function LeadProfile({ initialLead }: LeadProfileProps) {
  const [lead, setLead] = useState<Lead | null>(initialLead);
  
  const [data, setData] = useState<Partial<SubcollectionData>>({});
  const [loadingStates, setLoadingStates] = useState({
    contacts: false,
    activity: false,
    notes: false,
    transcripts: false,
    tasks: false,
    appointments: false,
  });
  
  const [scoringResult, setScoringResult] = useState<AiLeadScoringOutput['scoredLeads'][0] | null>(null);
  const [isImprovingScript, setIsImprovingScript] = useState(false);
  const [isProspecting, setIsProspecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  const [isEditAddressDialogOpen, setIsEditAddressDialogOpen] = useState(false);
  const [isTranscriptViewerOpen, setIsTranscriptViewerOpen] = useState(false);
  const [isDiscoveryQuestionsOpen, setIsDiscoveryQuestionsOpen] = useState(false);
  const [isLogOutcomeOpen, setIsLogOutcomeOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showPostCallDialog, setShowPostCallDialog] = useState(false);
  const [lastCallActivity, setLastCallActivity] = useState<Activity | null>(null);
  const [fetchingTranscriptId, setFetchingTranscriptId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>();
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [isCallHistoryExpanded, setIsCallHistoryExpanded] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);

  const [sessionLeads, setSessionLeads] = useState<string[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const sessionLeadIds = localStorage.getItem('dialingSessionLeads');
    if (sessionLeadIds) {
      setSessionLeads(JSON.parse(sessionLeadIds));
      setIsSessionActive(true);
    } else {
      setIsSessionActive(false);
    }
  }, [lead]);
  
  useEffect(() => {
    if (initialLead.aiScore) {
      setScoringResult({
        leadId: initialLead.id,
        score: initialLead.aiScore,
        reason: initialLead.aiReason || '',
        prospectedContacts: [],
      });
    }
  }, [initialLead]);

  const loadSubcollection = useCallback(async (collectionName: keyof SubcollectionData) => {
    if (!lead || data[collectionName] || loadingStates[collectionName]) return;

    setLoadingStates(prev => ({...prev, [collectionName]: true}));
    try {
        let result: any;
        switch(collectionName) {
            case 'contacts': result = await getLeadContacts(lead.id); break;
            case 'activity': result = await getLeadActivity(lead.id); break;
            case 'notes': result = await getLeadNotes(lead.id); break;
            case 'transcripts': result = await getLeadTranscripts(lead.id); break;
            case 'tasks': result = await getLeadTasks(lead.id); break;
            case 'appointments': result = await getLeadAppointments(lead.id); break;
        }
        setData(prev => ({ ...prev, [collectionName]: result }));
    } catch (error) {
        console.error(`Error loading ${collectionName}:`, error);
        toast({ variant: 'destructive', title: `Error`, description: `Could not load ${collectionName}.` });
    } finally {
        setLoadingStates(prev => ({...prev, [collectionName]: false}));
    }
  }, [lead, data, loadingStates, toast]);


  const handleCallLogged = async (outcome: string, notes: string, contact?: any) => {
      if (!lead || !user?.displayName) return;

      const outcomeStatusMap: { [key: string]: { status: Lead['status'], reason?: string } } = {
          'Busy': { status: 'In Progress' },
          'Call Back/Follow-up': { status: 'High Touch' },
          'Gatekeeper': { status: 'Connected' },
          'Disconnected': { status: 'In Progress' },
          'Appointment Booked': { status: 'Qualified' },
          'Email Interested': { status: 'Pre Qualified' },
          'No Answer': { status: 'In Progress' },
          'Not Interested': { status: 'Lost', reason: 'Not Interested' },
          'Voicemail': { status: 'In Progress' },
          'Wrong Number': { status: 'Lost', reason: 'Wrong Contact Details' },
          'Disqualified - Not a Fit': { status: 'Unqualified' },
          'DNC - Stop List': { status: 'Lost', reason: 'Not Interested' },
      };
      
      let activityNotes = `Call logged manually. Outcome: ${outcome}. Notes: ${notes}`;
      await logActivity(lead.id, {
          type: 'Call',
          notes: activityNotes,
          author: user.displayName
      });
      loadSubcollection('activity');

      if (notes) {
        await logNoteActivity(lead.id, {
          content: notes,
          author: user.displayName,
        });
        loadSubcollection('notes');
      }

      const { status, reason } = outcomeStatusMap[outcome] || {};
      if (status) {
          await updateLeadStatus(lead.id, status, reason);
          setLead(prev => prev ? { ...prev, status } : null);
          toast({ title: 'Status Updated', description: `Lead status changed to ${status}.` });
      }
      
      toast({ title: "Success", description: "Call outcome logged successfully." });

      setShowPostCallDialog(false);
      setIsLogOutcomeOpen(false);
      setLastCallActivity(null);
  };


  const handleCalculateScore = async () => {
    if (!lead) return;
    try {
        setScoringLoading(true);
        const leadToScore = {
            leadId: lead.id,
            leadProfile: lead.profile,
            websiteUrl: lead.websiteUrl,
            activity: data.activity || []
        };
        const scoring = await aiLeadScoring([leadToScore]);
        if (scoring.scoredLeads.length > 0) {
            const result = scoring.scoredLeads[0];
            setScoringResult(result);
            setLead(prev => prev ? { ...prev, aiScore: result.score, aiReason: result.reason } : null);
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
          setLead(prev => prev ? { ...prev, avatarUrl: result.logoUrl! } : null);
          toast({ title: "Logo Found!", description: "Company logo has been updated." });
        }
        
        if (result.companyDescription) {
            setLead(prev => prev ? { ...prev, companyDescription: result.companyDescription! } : null);
            toast({ title: "Description Generated", description: "Company description has been updated." });
        }
        
        if (result.contacts && result.contacts.length > 0) {
            const updatedContacts = await getLeadContacts(lead.id);
            setData(prev => ({...prev, contacts: updatedContacts}));
            toast({ title: "Success", description: `${result.contacts.length} new contact(s) found, saved, and synced.` });
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

  const addActivity = async (newActivity: Omit<Activity, 'id'>) => {
    if (lead) {
        await logActivity(lead.id, newActivity);
        loadSubcollection('activity');
    }
  };

  const handleNoteLogged = (newNote: Note) => {
    setData(prev => ({ ...prev, notes: [newNote, ...(prev.notes || [])]}));
    addActivity({
        type: 'Update',
        date: newNote.date,
        notes: `Note added: ${newNote.content.substring(0, 50)}...`
    })
  }
  
  const handleContactAdded = async () => {
    if (!lead) return;
    const updatedContacts = await getLeadContacts(lead.id);
    setData(prev => ({ ...prev, contacts: updatedContacts }));
  };

  const handleContactUpdated = (updatedContact: Contact, oldContact: Contact) => {
    if (lead && data.contacts) {
      const updatedContacts = data.contacts.map(c => c.id === updatedContact.id ? updatedContact : c);
      setData(prev => ({ ...prev, contacts: updatedContacts }));
       addActivity({
          type: 'Update',
          date: new Date().toISOString(),
          notes: `Contact ${oldContact.name} updated to ${updatedContact.name}.`,
       });
    }
     setIsEditDialogOpen(false);
  };

  const handleLeadUpdated = (updatedLeadData: Partial<Lead>, oldLead: Lead) => {
    if (lead) {
      setLead({ ...lead, ...updatedLeadData });
    }
    setIsEditLeadDialogOpen(false);
  }

  const handleDeleteContact = async (contact: Contact) => {
    if (!lead) return;
    try {
      await deleteContactFromLead(lead.id, contact.id, contact.name);
      setData(prev => ({ ...prev, contacts: (prev.contacts || []).filter(c => c.id !== contact.id) }));
      toast({ title: "Success", description: "Contact deleted successfully." });
    } catch (error) {
      console.error("Failed to delete contact:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete contact." });
    }
  };

  const handleInitiateCall = (phoneNumber: string) => {
    if (!lead) return;
    window.open(`aircall:${phoneNumber}`);
    logActivity(lead.id, { type: 'Call', notes: `Initiated call to ${phoneNumber} via AirCall app.` });
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
        loadSubcollection('transcripts'); // Re-fetch transcripts to update the UI
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
        setData(prev => ({...prev, tasks: [...(prev.tasks || []), newTask]}));
        setNewTaskTitle('');
        setNewTaskDueDate(undefined);
        toast({ title: 'Success', description: 'Task added successfully.' });
    } catch (error) {
        console.error("Failed to add task:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to add task." });
    }
  };

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
      if (!lead || !data.tasks) return;
      try {
          await updateTaskCompletion(lead.id, taskId, isCompleted);
          const updatedTasks = data.tasks.map(t => t.id === taskId ? { ...t, isCompleted, completedAt: isCompleted ? new Date().toISOString() : undefined } : t);
          setData(prev => ({...prev, tasks: updatedTasks}));
          toast({ title: 'Success', description: `Task marked as ${isCompleted ? 'complete' : 'incomplete'}.` });
      } catch (error) {
          console.error("Failed to update task:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to update task." });
      }
  };

  const handleDeleteTask = async (taskId: string) => {
      if (!lead || !data.tasks) return;
      try {
          await deleteTaskFromLead(lead.id, taskId);
          setData(prev => ({...prev, tasks: (prev.tasks || []).filter(t => t.id !== taskId)}));
          toast({ title: 'Success', description: 'Task deleted successfully.' });
      } catch (error) {
          console.error("Failed to delete task:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to delete task." });
      }
  };

  const handleDiscoverySave = async (discoveryData: DiscoveryData) => {
    if (!lead) return;
    console.log('[Client] handleDiscoverySave triggered.');

    // Step 1: Call NetSuite and handle its response.
    try {
        console.log('[Client] Preparing to call NetSuite server action...');
        const nsResult = await sendDiscoveryDataToNetSuite({ leadId: lead.id, discoveryData: discoveryData });
        console.log('[Client] NetSuite call finished. Result:', nsResult);

        if (nsResult.success) {
            toast({ title: 'NetSuite Updated', description: 'Discovery data sent to NetSuite.' });
        } else {
            toast({ variant: 'destructive', title: 'NetSuite Error', description: `Failed to send to NetSuite: ${nsResult.message}`, duration: 10000 });
        }
    } catch (error: any) {
        console.error("[Client] Error calling NetSuite server action:", error);
        toast({ variant: "destructive", title: "Error", description: `A client-side error occurred while sending to NetSuite: ${error.message}` });
        // Decide if you want to stop the process if NetSuite fails. For now, we continue.
    }
    
    // Step 2: Save to Firebase, regardless of NetSuite outcome.
    try {
        console.log('[Client] Preparing to save to Firebase...');
        await updateLeadDiscoveryData(lead.id, discoveryData);
        setLead(prev => prev ? { ...prev, discoveryData: discoveryData } : null);
        toast({ title: 'Success', description: 'Discovery questions saved to Firebase.' });
        console.log('[Client] Firebase save successful.');
    } catch (error: any) {
        console.error("[Client] Failed to save discovery data to Firebase:", error);
        toast({ variant: "destructive", title: "Firebase Error", description: `Failed to save discovery data: ${error.message}` });
    } finally {
        setIsDiscoveryQuestionsOpen(false);
    }
  };

  const handleDiscoveryClose = (open: boolean) => {
    setIsDiscoveryQuestionsOpen(open);
  }

  const handleAddressSave = async (newAddress: Address) => {
    if (!lead) return;
    try {
      await updateLeadDetails(lead.id, lead, { address: newAddress });
      setLead(prev => prev ? { ...prev, address: newAddress } : null);
      toast({ title: "Success", description: "Address updated successfully." });
      
      const nsResult = await sendLeadUpdateToNetSuite({ leadId: lead.id, address: newAddress });
      if (nsResult.success) {
          toast({ title: "NetSuite Updated", description: "Address sent to NetSuite." });
      } else {
          toast({ variant: "destructive", title: "NetSuite Sync Failed", description: nsResult.message });
      }
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
    const currentIndex = sessionLeads.indexOf(lead.id);
    if (currentIndex === -1) {
      return { nextLeadId: null, hasNextLead: false };
    }
    const nextIndex = (currentIndex + 1) % sessionLeads.length;
    return { nextLeadId: sessionLeads[nextIndex], hasNextLead: true };
  }, [lead, sessionLeads, isSessionActive]);

  const handleNextLead = () => {
    if (nextLeadId) {
      router.push(`/leads/${nextLeadId}`);
    }
  };

  const getCalendlyLink = (url: string) => {
    if (!lead || !user?.displayName) return '#';
    
    const calendlyUrl = new URL(url);
    if (lead.id) calendlyUrl.searchParams.append('a1', lead.id);
    if(lead.entityId) calendlyUrl.searchParams.append('a2', lead.entityId);
    if(user.displayName) calendlyUrl.searchParams.append('a3', user.displayName);

    return calendlyUrl.toString();
  };
  
  const handleRepSelection = async (repName: string, repUrl: string, contact?: Contact) => {
    if (!lead) return;

    try {
      await updateLeadSalesRep(lead.id, repName, repUrl);
      setLead(prev => prev ? { ...prev, salesRepAssigned: repName, salesRepAssignedCalendlyLink: repUrl } : null);
      toast({ title: "Sales Rep Updated", description: `${repName} has been assigned to this lead.` });
      
      let finalUrl: string;
      if (contact) {
        finalUrl = getContactCalendlyLink(contact, repUrl) || '#';
      } else {
        finalUrl = getCalendlyLink(repUrl);
      }
      window.open(finalUrl, '_blank');

    } catch (error) {
        console.error("Failed to assign sales rep:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not assign sales rep." });
    }
  };

  const getContactCalendlyLink = (contact: Contact, baseUrl: string) => {
    if (!baseUrl) return null;
    const nameParts = contact.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const calendlyUrl = new URL(baseUrl);
    const params = calendlyUrl.searchParams;

    params.set('name', `${firstName} ${lastName}`);
    params.set('email', contact.email);
    if (lead) params.set('a1', lead.id);
    if (lead?.entityId) params.set('a2', lead.entityId);
    if (user?.displayName) params.set('a3', user.displayName);

    return calendlyUrl.toString();
  }


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

  const primaryContact = data.contacts && data.contacts.length > 0 ? data.contacts[0] : null;
  
  const filteredActivities = useMemo(() => {
    if (!dateFilter?.from) return data.activity || [];
    const fromDate = startOfDay(dateFilter.from);
    const toDate = dateFilter.to ? endOfDay(dateFilter.to) : endOfDay(dateFilter.from);
    return (data.activity || []).filter(a => {
        const activityDate = new Date(a.date);
        return activityDate >= fromDate && activityDate <= toDate;
    });
  }, [data.activity, dateFilter]);

  const callHistory = useMemo(() => {
    return (data.activity || []).filter(a => a.type === 'Call' && a.callId);
  }, [data.activity]);

  const displayedActivities = isActivityExpanded ? filteredActivities : filteredActivities.slice(0, 1);
  const displayedCallHistory = isCallHistoryExpanded ? callHistory : callHistory.slice(0, 1);
  const displayedNotes = isNotesExpanded ? (data.notes || []) : (data.notes || []).slice(0, 1);
  
  const contactAttempts = useMemo(() => {
    if (!data.activity) return 0;
    return data.activity.filter(a => a.type === 'Call' && a.callId).length;
  }, [data.activity]);

  return (
    <>
    <PostCallOutcomeDialog
        isOpen={showPostCallDialog}
        onClose={() => {
            setShowPostCallDialog(false);
        }}
        lead={lead}
        callActivity={lastCallActivity} // Pass null for manual logging
        onSubmit={handleCallLogged}
    />
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/leads">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Leads
          </Link>
        </Button>
        <Button onClick={handleNextLead} disabled={!hasNextLead}>
            <SkipForward className="mr-2 h-4 w-4" />
            Next in Session
        </Button>
      </div>

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{lead.companyName}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <LeadStatusBadge status={lead.status} />
                <>
                  <p className="text-muted-foreground">&bull; {data.contacts?.length || 0} {data.contacts?.length === 1 ? 'Contact' : 'Contacts'}</p>
                  <p className="text-muted-foreground">&bull; Contacted {contactAttempts} {contactAttempts === 1 ? 'time' : 'times'}</p>
                </>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <Button variant="outline" onClick={()=>{ setLastCallActivity(null); setShowPostCallDialog(true); }}>
              <PhoneCall className="mr-2 h-4 w-4" />
              Log a Call
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Appointment
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
          <LogNoteDialog lead={lead} onNoteLogged={handleNoteLogged}>
            <Button variant="outline">
              <ClipboardEdit className="mr-2 h-4 w-4" />
              Log a Note
            </Button>
          </LogNoteDialog>
           <Button
              variant="outline"
              onClick={() => window.open('https://illicium.com.au/revup_client_assets/mailplus_catch_all.html', '_blank')}
            >
              <BookText className="mr-2 h-4 w-4" />
              View Script
            </Button>
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
                        {isProspecting ? <Loader /> : <><Search className="mr-2 h-4 w-4" /><span>Prospect Website</span></>}
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
                        lead.salesRepAssignedCalendlyLink ? (
                          <a href={lead.salesRepAssignedCalendlyLink} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1">
                            <span>{lead.salesRepAssigned}</span>
                            <LinkIcon className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <p className="font-medium">{lead.salesRepAssigned}</p>
                        )
                      ) : (
                        <p className="font-medium">N/A</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Lead Source</p>
                      <p className="font-medium">{lead.campaign ?? 'N/A'}</p>
                    </div>
                  </div>
               </div>
             </CardContent>
           </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Accordion type="single" collapsible onValueChange={() => loadSubcollection('contacts')}>
             <Card>
               <AccordionItem value="contacts" className="border-b-0">
                <AccordionTrigger className="p-6">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    Contacts
                  </CardTitle>
                </AccordionTrigger>
                <AccordionContent className="px-6">
                {loadingStates.contacts ? (
                  <div className="py-4 flex justify-center"><Loader /></div>
                ) : data.contacts && data.contacts.length > 0 ? (
                  <div className="space-y-4">
                  {data.contacts.map((contact, index) => {
                     const contactCalendlyLink = getContactCalendlyLink(contact, lead.salesRepAssignedCalendlyLink || '');
                     return (
                      <Card key={contact.id || index} className="relative group/contact">
                        <CardHeader className="flex-row items-start justify-between pb-2">
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
                                    <DropdownMenuItem onSelect={() => {setSelectedContact(contact); setIsEditDialogOpen(true);}}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                </DialogTrigger>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>Delete</span>
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
                        <CardContent className="space-y-3 text-sm">
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
                         <CardFooter>
                           <div className="flex w-full items-center gap-0.5">
                                {lead.salesRepAssigned && lead.salesRepAssignedCalendlyLink ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      asChild
                                      className={cn("flex-grow rounded-r-none")}
                                    >
                                      <a href={contactCalendlyLink || '#'} target="_blank" rel="noopener noreferrer">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Schedule with {lead.salesRepAssigned}
                                      </a>
                                    </Button>
                                ) : (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="flex-grow">
                                                <Calendar className="mr-2 h-4 w-4" />
                                                Schedule Appointment
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {salesReps.map(rep => (
                                                <DropdownMenuItem key={rep.name} onSelect={() => handleRepSelection(rep.name, rep.url, contact)}>
                                                    {rep.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="px-2 rounded-l-none border-l-0">
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {salesReps.filter(rep => rep.name !== lead.salesRepAssigned).map(rep => (
                                            <DropdownMenuItem key={rep.name} onSelect={() => handleRepSelection(rep.name, rep.url, contact)}>
                                                Schedule with {rep.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                         </CardFooter>
                      </Card>
                     )
                  })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-muted-foreground">
                    No contacts found.
                  </div>
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
                </AccordionContent>
               </AccordionItem>
             </Card>
           </Accordion>
           <Accordion type="single" collapsible onValueChange={() => {}}>
            <Card>
                <AccordionItem value="address" className="border-b-0">
                    <AccordionTrigger className="p-6">
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                            Address
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent className="px-6">
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
                                        defaultValue={lead.address}
                                        onAddressSelect={handleAddressSave}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Card>
           </Accordion>
          </div>
          
          <Accordion type="single" collapsible onValueChange={() => { loadSubcollection('activity'); loadSubcollection('transcripts'); }}>
            <Card>
              <AccordionItem value="call-history" className="border-b-0">
                <AccordionTrigger className="p-6">
                  <CardTitle className="flex items-center gap-2">
                    <PhoneCall className="w-5 h-5 text-muted-foreground" />
                    Call History
                  </CardTitle>
                </AccordionTrigger>
                <AccordionContent className="px-6">
                   {loadingStates.activity || loadingStates.transcripts ? (
                     <div className="flex items-center justify-center p-8"><Loader /></div>
                   ) : callHistory.length > 0 ? (
                    <ul className="space-y-4">
                      {displayedCallHistory.map((item, index) => {
                        const transcript = (data.transcripts || []).find(t => t.callId === item.callId);
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
                      {callHistory.length > 1 && (
                          <Button variant="link" className="w-full mt-2" onClick={() => setIsCallHistoryExpanded(!isCallHistoryExpanded)}>
                              {isCallHistoryExpanded ? 'Show less' : `Show all ${callHistory.length} calls`}
                          </Button>
                      )}
                    </ul>
                   ) : (
                    <p className="text-sm text-center text-muted-foreground py-4">No AirCall call history found.</p>
                   )}
                </AccordionContent>
              </AccordionItem>
            </Card>
          </Accordion>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Accordion type="single" collapsible onValueChange={() => loadSubcollection('activity')}>
                <Card>
                    <AccordionItem value="activity" className="border-b-0">
                        <AccordionTrigger className="p-6">
                             <CardTitle>Activity History</CardTitle>
                        </AccordionTrigger>
                         <AccordionContent className="px-6">
                            {loadingStates.activity ? (
                                 <div className="flex items-center justify-center p-8"><Loader /></div>
                            ) : filteredActivities.length > 0 ? (
                                <>
                                <ul className="space-y-4">
                                {displayedActivities.map((item, index) => (
                                    <li key={item.id} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className="bg-secondary rounded-full p-2">
                                        {item.type === 'Call' && <Phone className="h-4 w-4 text-muted-foreground" />}
                                        {item.type === 'Email' && <Mail className="h-4 w-4 text-muted-foreground" />}
                                        {item.type === 'Meeting' && <Calendar className="h-4 w-4 text-muted-foreground" />}
                                        {item.type === 'Update' && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                        {filteredActivities && index < filteredActivities.length - 1 && displayedActivities.length > 1 && (
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
                                {filteredActivities.length > 1 && (
                                    <Button variant="link" className="w-full mt-2" onClick={() => setIsActivityExpanded(!isActivityExpanded)}>
                                    {isActivityExpanded ? 'Show less' : `Show all ${filteredActivities.length} activities`}
                                    </Button>
                                )}
                                </>
                            ) : (
                                 <p className="text-sm text-center text-muted-foreground py-4">No activity yet.</p>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Card>
            </Accordion>
            
            <Accordion type="single" collapsible onValueChange={() => loadSubcollection('notes')}>
                <Card>
                     <AccordionItem value="notes" className="border-b-0">
                        <AccordionTrigger className="p-6">
                            <CardTitle className="flex items-center gap-2">
                                <BookText className="w-5 h-5 text-muted-foreground" />
                                Notes
                            </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent className="px-6">
                            {loadingStates.notes ? (
                                <div className="flex items-center justify-center p-8"><Loader /></div>
                            ) : displayedNotes.length > 0 ? (
                                <>
                                <div className="space-y-4">
                                {displayedNotes.map(note => (
                                <div key={note.id} className="text-sm border-l-2 pl-4">
                                    <p className="whitespace-pre-wrap">{note.content}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                    {new Date(note.date).toLocaleString()} by {note.author}
                                    </p>
                                </div>
                                ))}
                                </div>
                                {(data.notes || []).length > 1 && (
                                    <Button variant="link" className="w-full mt-2" onClick={() => setIsNotesExpanded(!isNotesExpanded)}>
                                        {isNotesExpanded ? 'Show less' : 'Show all notes'}
                                    </Button>
                                )}
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No notes for this lead yet.</p>
                            )}
                        </AccordionContent>
                     </AccordionItem>
                </Card>
            </Accordion>
          </div>
          
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
                            const updatedTranscripts = (data.transcripts || []).map(t => t.id === selectedTranscript.id ? {...t, analysis} : t)
                            setData(prev => ({...prev, transcripts: updatedTranscripts}));
                        }}
                      />
                  )}
              </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Edit Contact</DialogTitle>
                 <DialogDescription>
                   Update the details for the contact.
                 </DialogDescription>
               </DialogHeader>
               {selectedContact && (
                <EditContactForm
                  leadId={lead.id}
                  contact={selectedContact}
                  onContactUpdated={(updatedContact) => handleContactUpdated(updatedContact, selectedContact)}
                />
               )}
             </DialogContent>
          </Dialog>

        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
          <Accordion type="single" collapsible onValueChange={() => loadSubcollection('appointments')}>
            <Card>
                 <AccordionItem value="appointments" className="border-b-0">
                     <AccordionTrigger className="p-6">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            Appointments
                        </CardTitle>
                     </AccordionTrigger>
                     <AccordionContent className="px-6">
                        {loadingStates.appointments ? (
                             <div className="flex items-center justify-center p-8"><Loader /></div>
                        ) : (data.appointments || []).length > 0 ? (
                          (data.appointments || []).map(appointment => (
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
                          ))
                        ) : (
                            <p className="text-sm text-center text-muted-foreground py-4">No appointments booked for this lead yet.</p>
                        )}
                    </AccordionContent>
                 </AccordionItem>
            </Card>
          </Accordion>
          
           <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Route className="w-5 h-5 text-muted-foreground" />
                        Discovery & Routing
                    </CardTitle>
                     <Button variant="outline" size="sm" onClick={() => setIsDiscoveryQuestionsOpen(true)}>
                        <FileQuestion className="mr-2 h-4 w-4" />
                        Open Form
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

           <Accordion type="single" collapsible onValueChange={() => loadSubcollection('tasks')}>
            <Card>
                 <AccordionItem value="tasks" className="border-b-0">
                     <AccordionTrigger className="p-6">
                        <CardTitle className="flex items-center gap-2">
                            <ListTodo className="w-5 h-5 text-muted-foreground" />
                            Tasks & Reminders
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent className="px-6">
                        <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-2 mb-4">
                            <Input 
                                placeholder="Add a new task..." 
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                            />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className="min-w-[150px] justify-start text-left font-normal"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {newTaskDueDate ? format(newTaskDueDate, "PPP") : <span>Set date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <CalendarPicker
                                        mode="single"
                                        selected={newTaskDueDate}
                                        onSelect={setNewTaskDueDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button type="submit">Add Task</Button>
                        </form>
                        <div className="space-y-2">
                            {loadingStates.tasks ? (
                                <div className="flex items-center justify-center p-8"><Loader /></div>
                            ) : (data.tasks || []).length > 0 ? (
                                (data.tasks || []).map(task => (
                                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted group">
                                        <Checkbox
                                            id={`task-${task.id}`}
                                            checked={task.isCompleted}
                                            onCheckedChange={(checked) => handleToggleTask(task.id, !!checked)}
                                        />
                                        <label htmlFor={`task-${task.id}`} className="flex-1 text-sm font-medium data-[completed=true]:line-through data-[completed=true]:text-muted-foreground" data-completed={task.isCompleted}>
                                            {task.title}
                                            <p className="text-xs text-muted-foreground">
                                                Due: {format(new Date(task.dueDate), "PP")}
                                            </p>
                                        </label>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTask(task.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-4">No tasks for this lead.</p>
                            )}
                        </div>
                    </AccordionContent>
                 </AccordionItem>
            </Card>
           </Accordion>
          
        </div>
      </main>
    </div>
    <MapModal
        isOpen={!!selectedAddress}
        onClose={() => setSelectedAddress(null)}
        address={selectedAddress || ''}
      />
    </>
  )
}
