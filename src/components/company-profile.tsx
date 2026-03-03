
'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  Calendar as CalendarIcon,
  Clipboard,
  Link as LinkIcon,
  Mail,
  MapPin,
  History,
  Phone,
  Users,
  FileDigit,
  ClipboardEdit,
  TrendingUp,
  Info,
  PhoneCall,
  Key,
  Hash,
  Tag,
  Globe,
  User,
  Briefcase,
  Search,
  Edit,
  FileX,
  ExternalLink,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Lead, Note, Address, Invoice, VisitNote, DiscoveryData, UserProfile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Loader } from '@/components/ui/loader'
import { MapModal } from '@/components/map-modal'
import { useAuth } from '@/hooks/use-auth'
import { LogNoteDialog } from './log-note-dialog'
import { collection, getDocs, orderBy, query, doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { Badge } from './ui/badge'
import { DiscoveryRadarChart } from './discovery-radar-chart'
import { sendUpsellToNetSuite } from '@/services/netsuite-upsell-proxy'
import { format, isValid } from 'date-fns'
import { Alert, AlertTitle, AlertDescription } from './ui/alert'
import { logActivity, logUpsell, getAllUsers } from '@/services/firebase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'

interface CompanyProfileProps {
  initialCompany: Lead;
  onNoteLogged: (newNote: Note) => void;
}

const formatAddressString = (address?: Address) => {
    if (!address) return 'N/A';
    return [address.address1, address.street, address.city, address.state, address.zip, address.country].filter(Boolean).join(', ');
}

export function CompanyProfile({ initialCompany, onNoteLogged }: CompanyProfileProps) {
  const [company, setCompany] = useState<Lead>(initialCompany);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [loadingBack, setLoadingBack] = useState(false);
  const [isLogNoteOpen, setIsLogNoteOpen] = useState(false);
  const [linkedVisitNote, setLinkedVisitNote] = useState<VisitNote | null>(null);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(false);
  
  // Upsell state
  const [isUpsellDialogOpen, setIsUpsellDialogOpen] = useState(false);
  const [isUpselling, setIsUpselling] = useState(false);
  const [upsellRepUid, setUpsellRepUid] = useState('');
  const [upsellNotes, setUpsellNotes] = useState('');
  const [fieldReps, setFieldReps] = useState<UserProfile[]>([]);

  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  
  useEffect(() => {
    setCompany(initialCompany);
    
    const visitNoteId = initialCompany.visitNoteID;
    if (visitNoteId) {
        setIsDiscoveryLoading(true);
        const noteRef = doc(firestore, 'visitnotes', visitNoteId);
        getDoc(noteRef).then(noteSnap => {
            if (noteSnap.exists()) {
                setLinkedVisitNote({ id: noteSnap.id, ...noteSnap.data() } as VisitNote);
            }
        }).finally(() => setIsDiscoveryLoading(false));
    }
  }, [initialCompany]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!company.id) return;
      setLoadingInvoices(true);
      try {
        const invoicesRef = collection(firestore, 'companies', company.id, 'invoices');
        const invoicesSnapshot = await getDocs(query(invoicesRef, orderBy('invoiceDate', 'desc')));
        const invoicesData = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Invoice));
        setInvoices(invoicesData);
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
      } finally {
        setLoadingInvoices(false);
      }
    };
    
    fetchInvoices();
  }, [company.id]);

  useEffect(() => {
      if (isUpsellDialogOpen) {
          getAllUsers().then(users => {
              const reps = users.filter(u => (u.role === 'Field Sales' || u.role === 'admin' || u.role === 'Field Sales Admin') && !u.disabled);
              setFieldReps(reps);
              if (userProfile && (userProfile.role === 'Field Sales' || userProfile.role === 'admin')) {
                  setUpsellRepUid(userProfile.uid);
              }
          });
      }
  }, [isUpsellDialogOpen, userProfile]);

  const handleNoteLoggedAndClose = (newNote: Note) => {
    onNoteLogged(newNote);
    setIsLogNoteOpen(false);
  };

  const handleCopy = (text: string | null | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${fieldName} copied.` });
  };

  const handleBackToLeads = () => {
    setLoadingBack(true);
    router.push('/signed-customers');
  };

  const handleInitiateCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    window.open(`aircall:${phoneNumber}`);
    logActivity(company.id, { type: 'Call', notes: `Initiated call to ${phoneNumber} via AirCall app.` });
  };

  const handleConfirmUpsell = async () => {
    if (!company.id || !upsellRepUid) return;
    setIsUpselling(true);
    try {
      const rep = fieldReps.find(r => r.uid === upsellRepUid);
      
      // 1. Sync with NetSuite
      const nsResult = await sendUpsellToNetSuite({ leadId: company.id });
      
      // 2. Log in Firebase for Activity and Commission reporting
      await logUpsell({
          companyId: company.id,
          companyName: company.companyName,
          repUid: upsellRepUid,
          repName: rep?.displayName || 'Unknown Rep',
          date: new Date().toISOString(),
          notes: upsellNotes
      });

      if (nsResult.success) {
          toast({ title: 'Upsell Recorded', description: 'Activity logged and NetSuite notified.' });
      } else {
          toast({ variant: 'destructive', title: 'Partial Success', description: `Logged in ProspectPlus, but NetSuite sync failed: ${nsResult.message}` });
      }
      setIsUpsellDialogOpen(false);
      setUpsellNotes('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsUpselling(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isValid(date) ? format(date, 'MMM d, yyyy') : '-';
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
                    <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => handleInitiateCall(value)}>
                        <PhoneCall className="h-3 w-3" />
                    </Button>
                )}
            </div>
        </div>
    );
  };

  if (!user) return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader /></div>;

  const fullAddressStr = formatAddressString(company.address);
  const hasCancellationDetails = company.status === 'Lost Customer' || company.cancellationTheme || company.cancellationCategory || company.cancellationReason || company.cancellationdate;

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
        <div>
            <h1 className="text-3xl font-bold">{company.companyName}</h1>
            <div className="flex wrap items-center gap-x-2 gap-y-1 mt-1">
              <LeadStatusBadge status={company.status} />
              <p className="text-muted-foreground text-sm">&bull; {company.contacts?.length || 0} Contacts</p>
            </div>
        </div>
         <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsUpsellDialogOpen(true)}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Record Upsell
            </Button>
            <Button variant="outline" onClick={() => setIsLogNoteOpen(true)}>
                <ClipboardEdit className="mr-2 h-4 w-4" />
                Log Note
            </Button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {hasCancellationDetails && (
            <Card className="border-red-200 bg-red-50/30">
                <CardHeader className="pb-4 border-b border-red-100">
                    <CardTitle className="flex items-center gap-2 text-red-800">
                        <FileX className="w-5 h-5" />
                        Cancellation Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <DetailItem icon={Tag} label="Cancellation Theme" value={company.cancellationTheme} />
                        <DetailItem icon={Briefcase} label="Cancellation Category" value={company.cancellationCategory} />
                        <DetailItem icon={CalendarIcon} label="Cancellation Date" value={company.cancellationdate} />
                        <DetailItem icon={Clipboard} label="Cancellation Reason" value={company.cancellationReason} />
                    </div>
                </CardContent>
            </Card>
          )}

          <Card>
             <CardHeader className="pb-4 border-b">
                <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-muted-foreground" />Company Details</CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="space-y-8">
                        <DetailItem icon={Key} label="Customer ID" value={company.entityId} copyable />
                        <DetailItem icon={Hash} label="NetSuite Internal ID" value={company.internalid || company.salesRecordInternalId} copyable />
                        <DetailItem icon={Tag} label="Franchisee" value={company.franchisee} />
                        <DetailItem icon={CalendarIcon} label="Date Entered" value={formatDate(company.dateLeadEntered)} />
                        <DetailItem icon={Globe} label="Website" value={company.websiteUrl} isWebsite />
                        <DetailItem icon={Tag} label="Industry" value={company.industryCategory} />
                    </div>
                    <div className="space-y-8">
                        <DetailItem icon={Mail} label="Email" value={company.customerServiceEmail} copyable />
                        <DetailItem icon={Phone} label="Phone" value={company.customerPhone} copyable callable leadId={company.id} />
                        <DetailItem icon={User} label="Sales Rep Assigned" value={company.salesRepAssigned} isLink linkUrl={company.salesRepAssignedCalendlyLink} />
                        <DetailItem icon={Briefcase} label="Lead Source" value={company.campaign || company.customerSource} />
                        <DetailItem icon={Tag} label="Sub-Industry" value={company.industrySubCategory || '- None -'} />
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
                        {company.contacts?.map(contact => (
                            <div key={contact.id} className="p-3 border rounded-md text-sm">
                                <p className="font-semibold">{contact.name}</p>
                                <p className="text-xs text-muted-foreground">{contact.title}</p>
                                <div className="mt-2 space-y-1">
                                    <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{contact.email}</div>
                                    <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{contact.phone} <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleInitiateCall(contact.phone)}><PhoneCall className="h-3 w-3" /></Button></div>
                                </div>
                            </div>
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
                        
                        {company.address?.lat && (
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
                        
                        <Button variant="outline" className="w-full bg-sidebar-accent/20 border-none hover:bg-sidebar-accent/30 text-foreground font-medium py-6 rounded-full" onClick={() => {}}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Address
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileDigit className="w-5 h-5 text-muted-foreground" />Invoices</CardTitle></CardHeader>
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
                                                        View Invoice
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
                    ) : <div className="text-center py-10 text-muted-foreground">No invoices found.</div>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>History</CardTitle></CardHeader>
                <CardContent>
                    <Tabs defaultValue="notes">
                        <TabsList><TabsTrigger value="notes">Notes</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList>
                        <TabsContent value="notes" className="space-y-4 pt-4">
                            {company.notes?.map(note => (
                                <div key={note.id} className="text-sm border-l-2 pl-4 py-1"><p>{note.content}</p><p className="text-xs text-muted-foreground mt-1">{format(new Date(note.date), 'PPpp')} by {note.author}</p></div>
                            ))}
                        </TabsContent>
                        <TabsContent value="activity" className="space-y-2 pt-4">
                            {company.activity?.map(a => <div key={a.id} className="text-xs flex justify-between"><span>{a.notes}</span><span className="text-muted-foreground">{format(new Date(a.date), 'PP')}</span></div>)}
                        </TabsContent>
                    </Tabs>
                </CardContent>
          </Card>
        </div>
      </main>
    </div>
    
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

    <MapModal isOpen={!!selectedAddress} onClose={() => setSelectedAddress(null)} address={selectedAddress || ''} />
    <LogNoteDialog lead={company} onNoteLogged={handleNoteLoggedAndClose} isOpen={isLogNoteOpen} onOpenChange={setIsLogNoteOpen} />
    </>
  )
}
