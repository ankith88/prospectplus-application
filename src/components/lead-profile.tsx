
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
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import type { Lead, Contact, Activity, Note, Transcript, Task, DiscoveryData, Appointment, Address } from '@/lib/types'
import { aiLeadScoring, AiLeadScoringOutput } from '@/ai/flows/ai-lead-scoring'
import { improveScript, ImproveScriptOutput } from '@/ai/flows/improve-script'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import { getCallTranscriptByCallId } from '@/ai/flows/get-call-transcript-flow'
import { deleteContactFromLead, logActivity, getLeadSubCollection, updateLeadAvatar, logNoteActivity, getLeadNotes, getLeadTranscripts, updateLeadStatus, getLeadActivity, getLeadTasks, addTaskToLead, updateTaskCompletion, deleteTaskFromLead, updateLeadDiscoveryData, getLeadFromFirebase, getLeadContacts, getLeadAppointments, updateLeadDetails } from '@/services/firebase'
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

export function LeadProfile({ initialLead, initialNotes, initialTranscripts, initialAppointments }: { initialLead: Lead, initialNotes: Note[], initialTranscripts: Transcript[], initialAppointments: Appointment[] }) {
  const [lead, setLead] = useState<Lead | null>(initialLead);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [transcripts, setTranscripts] = useState<Transcript[]>(initialTranscripts);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scoringResult, setScoringResult] = useState<AiLeadScoringOutput['scoredLeads'][number] | null>(null);
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


  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
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

  useEffect(() => {
    if (!lead?.id) return;

    const activityRef = collection(firestore, 'leads', lead.id, 'activity');
    const q = query(activityRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const activities: Activity[] = [];
      querySnapshot.forEach((doc) => {
        const activity = { id: doc.id, ...doc.data() } as Activity;
        activities.push(activity);
      });
      
      setLead(prevLead => prevLead ? {...prevLead, activity: activities} : null);

    });

    return () => unsubscribe();
  }, [lead?.id]);
  
  const fetchNotes = async () => {
    if (!lead) return;
    const fetchedNotes = await getLeadNotes(lead.id);
    setNotes(fetchedNotes);
  }
  
  const fetchTranscripts = async () => {
    if (!lead) return;
    const fetchedTranscripts = await getLeadTranscripts(lead.id);
    setTranscripts(fetchedTranscripts);
  }

  const fetchTasks = async () => {
    if (!lead) return;
    const fetchedTasks = await getLeadTasks(lead.id);
    setTasks(fetchedTasks);
  }

  const fetchAppointments = async () => {
    if (!lead) return;
    const fetchedAppointments = await getLeadAppointments(lead.id);
    setAppointments(fetchedAppointments);
  }

  useEffect(() => {
    fetchTasks();
    fetchAppointments();
  }, [lead?.id]);


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
      fetchNotes(); // Refresh notes & activity

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
            activity: lead.activity || []
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
        
        if (result.contacts && result.contacts.length > 0) {
            const updatedContacts = await getLeadContacts(lead.id);
            setLead(prev => prev ? { ...prev, contacts: updatedContacts } : null);
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

  const addActivity = (newActivity: Omit<Activity, 'id'>) => {
    if (lead) {
        const activityWithId: Activity = {
            ...newActivity,
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        const updatedActivities = [activityWithId, ...(lead.activity || [])];
        setLead({ ...lead, activity: updatedActivities });
        // Also log to firebase
        logActivity(lead.id, newActivity);
    }
  };

  const handleNoteLogged = (newNote: Note) => {
    setNotes(prev => [newNote, ...prev]);
    addActivity({
        type: 'Update',
        date: newNote.date,
        notes: `Note added: ${newNote.content.substring(0, 50)}...`
    })
  }
  
  const handleContactAdded = async () => {
    if (!lead) return;
    const updatedContacts = await getLeadContacts(lead.id);
    setLead(prev => prev ? { ...prev, contacts: updatedContacts } : null);
  };

  const handleContactUpdated = (updatedContact: Contact, oldContact: Contact) => {
    if (lead && lead.contacts) {
      const updatedContacts = lead.contacts.map(c => c.id === updatedContact.id ? updatedContact : c);
      setLead({ ...lead, contacts: updatedContacts });
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
      setLead(prev => prev ? { ...prev, contacts: (prev.contacts || []).filter(c => c.id !== contact.id) } : null);
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
        fetchTranscripts(); // Re-fetch transcripts to update the UI
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
        setTasks(prev => [...prev, newTask]);
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
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted, completedAt: isCompleted ? new Date().toISOString() : undefined } : t));
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
          setTasks(prev => prev.filter(t => t.id !== taskId));
          toast({ title: 'Success', description: 'Task deleted successfully.' });
      } catch (error) {
          console.error("Failed to delete task:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to delete task." });
      }
  };

  const handleDiscoverySave = async (data: DiscoveryData) => {
    if (!lead) return;
    console.log('[Client] handleDiscoverySave triggered.');

    // Step 1: Call NetSuite and handle its response.
    try {
        console.log('[Client] Preparing to call NetSuite server action...');
        const nsResult = await sendDiscoveryDataToNetSuite({ leadId: lead.id, discoveryData: data });
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
        await updateLeadDiscoveryData(lead.id, data);
        setLead(prev => prev ? { ...prev, discoveryData: data } : null);
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

  const primaryContact = lead.contacts && lead.contacts.length > 0 ? lead.contacts[0] : null;
  
  const filteredActivities = useMemo(() => {
    if (!dateFilter?.from) return lead.activity || [];
    const fromDate = startOfDay(dateFilter.from);
    const toDate = dateFilter.to ? endOfDay(dateFilter.to) : endOfDay(dateFilter.from);
    return (lead.activity || []).filter(a => {
        const activityDate = new Date(a.date);
        return activityDate >= fromDate && activityDate <= toDate;
    });
  }, [lead.activity, dateFilter]);

  const callHistory = useMemo(() => {
    return filteredActivities.filter(a => a.type === 'Call' && a.callId);
  }, [filteredActivities]);

  const displayedActivities = isActivityExpanded ? filteredActivities : filteredActivities.slice(0, 5);
  const displayedCallHistory = isCallHistoryExpanded ? callHistory : callHistory.slice(0, 5);
  const displayedNotes = isNotesExpanded ? notes : notes.slice(0, 5);
  
  const contactAttempts = useMemo(() => {
    if (!lead?.activity) return 0;
    return lead.activity.filter(a => a.type === 'Call' && a.callId).length;
  }, [lead?.activity]);


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
      <div>
        <Button variant="ghost" asChild>
          <Link href="/leads">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Leads
          </Link>
        </Button>
      </div>

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{lead.companyName}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <LeadStatusBadge status={lead.status} />
              {loading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <>
                  <p className="text-muted-foreground">&bull; {lead.contacts?.length || 0} {lead.contacts?.length === 1 ? 'Contact' : 'Contacts'}</p>
                  <p className="text-muted-foreground">&bull; Contacted {contactAttempts} {contactAttempts === 1 ? 'time' : 'times'}</p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <Button variant="outline" onClick={() => { setLastCallActivity(null); setShowPostCallDialog(true); }}>
              <PhoneCall className="mr-2 h-4 w-4" />
              Log a Call
            </Button>
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
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  Contacts
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
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
              </CardHeader>
              <CardContent className="divide-y divide-border">
                {loading ? (
                  <div className="py-4 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : lead.contacts && lead.contacts.length > 0 ? (
                  lead.contacts.map((contact, index) => (
                    <div key={contact.id || index} className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-start relative group">
                      <div className="absolute top-4 right-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => { setSelectedContact(contact); setIsEditDialogOpen(true); }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                    <span className="text-red-500">Delete</span>
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the contact {contact.name}.
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
                        </div>
                      <div className="flex items-center gap-3 font-medium sm:col-span-1">
                        <User className="w-5 h-5 text-muted-foreground shrink-0" />
                        <span className="break-all">{contact.name}</span>
                      </div>
                      <p className="text-muted-foreground sm:col-span-2 break-all">{contact.title}</p>
                      <div className="flex items-center gap-3 sm:col-start-2 sm:col-span-2">
                        <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline break-all">
                          {contact.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-3 sm:col-start-2 sm:col-span-2">
                        <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="flex items-center gap-1">
                            <span className="break-all">{contact.phone}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleInitiateCall(contact.phone)}>
                                <PhoneCall className="w-3 h-3" />
                            </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-muted-foreground">
                    No existing contacts found.
                  </div>
                )}
                {scoringResult?.prospectedContacts && scoringResult.prospectedContacts.length > 0 &&
                  scoringResult.prospectedContacts.map((contact, index) => (
                    <div key={`prospect-${index}`} className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3 font-medium sm:col-span-1">
                        <User className="w-5 h-5 text-muted-foreground shrink-0" />
                        <span className="break-all">{contact.name}</span>
                        <Badge variant="outline">Found on website</Badge>
                      </div>
                      <p className="text-muted-foreground sm:col-span-2 break-all">{contact.title}</p>
                      <div className="flex items-center gap-3 sm:col-start-2 sm:col-span-2">
                        <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline break-all">
                          {contact.email}
                        </a>
                      </div>
                    </div>
                  ))
                }
              </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                        Address
                    </CardTitle>
                    <Dialog open={isEditAddressDialogOpen} onOpenChange={setIsEditAddressDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
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
                </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <button
                      onClick={() => fullAddress !== 'No address available' && setSelectedAddress(fullAddress)}
                      disabled={fullAddress === 'No address available'}
                      className="p-1 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 mt-1"
                      title="View on map"
                  >
                      <MapPin className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </button>
                  <p className="text-sm text-muted-foreground">{fullAddress}</p>
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
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-muted-foreground" />
                  Call History
                </CardTitle>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFilter?.from ? (
                              dateFilter.to ? (
                                <>
                                  {format(dateFilter.from, "LLL d")} - {format(dateFilter.to, "LLL d")}
                                </>
                              ) : (
                                format(dateFilter.from, "LLL d, y")
                              )
                            ) : (
                              <span>Filter by date...</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <CalendarPicker
                            mode="range"
                            selected={dateFilter}
                            onSelect={setDateFilter}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : displayedCallHistory.length > 0 ? (
                <ul className="space-y-4">
                  {displayedCallHistory.map((item, index) => {
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
                                    <Button variant="outline" size="sm" onClick={() => { setSelectedTranscript(transcript); setIsTranscriptViewerOpen(true); }}>
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
                <p className="text-sm text-center text-muted-foreground py-4">
                  No AirCall call history found for the selected period.
                </p>
              )}
            </CardContent>
             {callHistory.length > 5 && (
                <CardFooter>
                  <Button
                    variant="link"
                    className="w-full"
                    onClick={() => setIsCallHistoryExpanded(!isCallHistoryExpanded)}
                  >
                    {isCallHistoryExpanded ? 'Show less' : `Show all ${callHistory.length} calls`}
                  </Button>
                </CardFooter>
              )}
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Activity History</CardTitle>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFilter?.from ? (
                              dateFilter.to ? (
                                <>
                                  {format(dateFilter.from, "LLL d")} - {format(dateFilter.to, "LLL d")}
                                </>
                              ) : (
                                format(dateFilter.from, "LLL d, y")
                              )
                            ) : (
                              <span>Filter by date...</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <CalendarPicker
                            mode="range"
                            selected={dateFilter}
                            onSelect={setDateFilter}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
              </CardHeader>
              <CardContent>
              {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                <ul className="space-y-4">
                  {displayedActivities && displayedActivities.map((item, index) => {
                    return (
                      <li key={item.id} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                          <div className="bg-secondary rounded-full p-2">
                            {item.type === 'Call' && <Phone className="h-4 w-4 text-muted-foreground" />}
                            {item.type === 'Email' && <Mail className="h-4 w-4 text-muted-foreground" />}
                            {item.type === 'Meeting' && <Calendar className="h-4 w-4 text-muted-foreground" />}
                            {item.type === 'Update' && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          {displayedActivities && index < displayedActivities.length - 1 && (
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
                    )
                  })}
                </ul>
                )}
              </CardContent>
              {filteredActivities.length > 5 && (
                <CardFooter>
                  <Button
                    variant="link"
                    className="w-full"
                    onClick={() => setIsActivityExpanded(!isActivityExpanded)}
                  >
                    {isActivityExpanded ? 'Show less' : `Show all ${filteredActivities.length} activities`}
                  </Button>
                </CardFooter>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookText className="w-5 h-5 text-muted-foreground" />
                    Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {loading ? (
                    <div className="py-4 space-y-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : displayedNotes.length > 0 ? (
                    displayedNotes.map(note => (
                      <div key={note.id} className="text-sm border-l-2 pl-4">
                        <p className="whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(note.date).toLocaleString()} by {note.author}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No notes for this lead yet.</p>
                  )}
              </CardContent>
              {notes.length > 5 && (
                  <CardFooter>
                      <Button
                          variant="link"
                          className="w-full"
                          onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                      >
                          {isNotesExpanded ? 'Show less' : 'Show all notes'}
                      </Button>
                  </CardFooter>
              )}
            </Card>
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
                            setTranscripts(prev => prev.map(t => t.id === selectedTranscript.id ? {...t, analysis} : t))
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

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    Transcripts
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {loading ? (
                    <div className="py-4 space-y-4">
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : transcripts.length > 0 ? (
                    transcripts.map(transcript => (
                        <div key={transcript.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                            <div>
                                <p className="text-sm font-medium">
                                    Call with {transcript.author}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(transcript.date).toLocaleString()}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => {
                                setSelectedTranscript(transcript);
                                setIsTranscriptViewerOpen(true);
                            }}>
                                View Transcript
                            </Button>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">No transcripts for this lead yet.</p>
                )}
            </CardContent>
          </Card>

        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="py-4 space-y-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                ) : appointments.length > 0 ? (
                  appointments.map(appointment => (
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
            </CardContent>
          </Card>
          
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

           <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ListTodo className="w-5 h-5 text-muted-foreground" />
                        Tasks & Reminders
                    </CardTitle>
                </CardHeader>
                <CardContent>
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
                        {tasks.length > 0 ? (
                            tasks.map(task => (
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
    </>
  )
}
