
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
  History,
  XCircle,
  FileDigit,
} from 'lucide-react'
import { useEffect, useState, useMemo, useCallback } from 'react'
import type { Lead, Contact, Activity, Note, Transcript, Task, DiscoveryData, Appointment, Address, LeadStatus, Invoice } from '@/lib/types'
import { aiLeadScoring, AiLeadScoringOutput } from '@/ai/flows/ai-lead-scoring'
import { improveScript, ImproveScriptOutput } from '@/ai/flows/improve-script'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import { getCallTranscriptByCallId } from '@/ai/flows/get-call-transcript-flow'
import { deleteContactFromLead, logActivity, updateLeadAvatar, logNoteActivity, updateLeadStatus, getLeadActivity, getLeadTasks, addTaskToLead, updateTaskCompletion, deleteTaskFromLead, updateLeadDiscoveryData, getCompanyFromFirebase, getLeadContacts, getLeadAppointments, updateLeadDetails, getLeadsFromFirebase, getLeadNotes, getLeadTranscripts, updateLeadSalesRep, logCallActivity } from '@/services/firebase'
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
import { AddressAutocomplete } from './address-autocomplete'
import { cn } from '@/lib/utils'
import { DiscoveryRadarChart } from './discovery-radar-chart'
import { ColdCallScorecardDialog } from './cold-call-scorecard';

interface CompanyProfileProps {
  initialCompany: Lead;
}

const salesReps = [
    { name: 'Lee Russell', url: 'https://calendly.com/lee-russell-mailplus/mailplus-intro-call-lee' },
    { name: 'Kerina Helliwell', url: 'https://calendly.com/kerina-helliwell-mailplus/mailplus-intro-call-kerina' },
    { name: 'Luke Forbes', url: 'https://calendly.com/luke-forbes-mailplus/mailplus-intro-call-luke' },
];

export function CompanyProfile({ initialCompany }: CompanyProfileProps) {
  const company = initialCompany; // Use the prop directly
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
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showPostCallDialog, setShowPostCallDialog] = useState(false);
  const [lastCallActivity, setLastCallActivity] = useState<Activity | null>(null);
  const [fetchingTranscriptId, setFetchingTranscriptId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>();
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);

  const [loadingBack, setLoadingBack] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  
  const { contacts = [], activity: activities = [], notes = [], transcripts = [], tasks = [], appointments = [], invoices = [] } = company;

  useEffect(() => {
    if (company.aiScore) {
      setScoringResult({
        leadId: company.id,
        score: company.aiScore,
        reason: company.aiReason || '',
        prospectedContacts: [],
      });
    }
  }, [company]);


  const handleCallLogged = (newStatus?: LeadStatus) => {
    // A full re-fetch might be the simplest to ensure data consistency.
    // For now, this is a placeholder. The parent page would need to handle the update.
    if (newStatus) {
       // Parent page would refetch
    }
};

  const handleCopy = (text: string | null | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
        title: "Copied to clipboard",
        description: `${fieldName} copied successfully.`,
    });
  };

  const handleBackToLeads = () => {
    setLoadingBack(true);
    router.push('/signed-customers');
  };

  if (!company || !user) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  const fullAddress = company.address
    ? [company.address.address1, company.address.street, company.address.city, company.address.state, company.address.zip, company.address.country].filter(Boolean).join(', ')
    : 'No address available';

  const primaryContact = contacts && contacts.length > 0 ? contacts[0] : null;

  return (
    <>
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBackToLeads} disabled={loadingBack}>
          {loadingBack ? <Loader /> : <ArrowLeft className="mr-2 h-4 w-4" />}
          Back to Signed Customers
        </Button>
      </div>

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{company.companyName}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <LeadStatusBadge status={company.status} />
                <>
                  <p className="text-muted-foreground">&bull; {contacts?.length || 0} {contacts?.length === 1 ? 'Contact' : 'Contacts'}</p>
                </>
            </div>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
             <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
               <CardTitle className="flex items-center gap-2">
                 <Building className="w-5 h-5 text-muted-foreground" />
                 Company Details
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                {company.companyDescription && (
                    <div className="text-sm text-muted-foreground border-l-4 border-primary pl-4 py-2 bg-secondary/50 rounded-r-md">
                        {company.companyDescription}
                    </div>
                )}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                 <div className="flex items-start gap-3">
                   <Key className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Customer ID</p>
                     <div className="flex items-center gap-1">
                        <p className="font-medium break-all">{company.entityId ?? 'N/A'}</p>
                        {company.entityId && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(company.entityId, 'Customer ID')}>
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
                        <p className="font-medium break-all">{company.id ?? 'N/A'}</p>
                        {company.id && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(company.id, 'NetSuite Internal ID')}>
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
                     <p className="font-medium">{company.franchisee ?? 'N/A'}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Globe className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Website</p>
                     {company.websiteUrl ? (
                        <a href={company.websiteUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1 break-all">
                            <span>{company.websiteUrl}</span>
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
                     <p className="font-medium">{company.industryCategory ?? 'N/A'}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Tag className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Sub-Industry</p>
                     <p className="font-medium">{company.industrySubCategory || 'N/A'}</p>
                   </div>
                 </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <div className="flex items-center gap-1">
                        <p className="font-medium break-all">{company.customerServiceEmail ?? 'N/A'}</p>
                        {company.customerServiceEmail && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(company.customerServiceEmail, 'Email')}>
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
                        <span className="font-medium break-all">{company.customerPhone ?? 'N/A'}</span>
                        {company.customerPhone && (
                            <>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(company.customerPhone, 'Phone')}>
                                <Clipboard className="w-3 h-3" />
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
                      {company.salesRepAssigned ? (
                        company.salesRepAssignedCalendlyLink ? (
                          <a href={company.salesRepAssignedCalendlyLink} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1">
                            <span>{company.salesRepAssigned}</span>
                            <LinkIcon className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <p className="font-medium">{company.salesRepAssigned}</p>
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
                      <p className="font-medium">{company.campaign ?? 'N/A'}</p>
                    </div>
                  </div>
               </div>
             </CardContent>
           </Card>
          
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
                  {contacts.map((contact, index) => (
                      <Card key={contact.id || index} className="p-4">
                          <CardHeader className="flex-row items-start justify-between pb-2 p-0">
                              <div>
                                  <p className="font-semibold">{contact.name}</p>
                                  <p className="text-sm text-muted-foreground">{contact.title}</p>
                              </div>
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
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-muted-foreground">No contacts found.</div>
                )}
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
                    </div>
                </CardContent>
            </Card>
          </div>
            
          {invoices && invoices.length > 0 && (
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileDigit className="w-5 h-5 text-muted-foreground" />
                        Invoices
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice ID</TableHead>
                                <TableHead>Service Type</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.documentId}</TableCell>
                                    <TableCell>{invoice.invoiceType || 'Service'}</TableCell>
                                    <TableCell className="text-right">${invoice.invoiceTotal.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
              </Card>
          )}

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
                        <TabsTrigger value="notes">Notes</TabsTrigger>
                        <TabsTrigger value="activity">Activity History</TabsTrigger>
                    </TabsList>
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
                            <p className="text-sm text-muted-foreground text-center py-4">No notes for this company yet.</p>
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
                        <p className="text-sm text-center text-muted-foreground py-4">No appointments booked for this company yet.</p>
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
    </>
  )
}
