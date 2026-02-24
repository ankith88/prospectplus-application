
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
} from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Lead, Note, Address, Invoice, VisitNote, DiscoveryData } from '@/lib/types'
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
import { format, isValid, parseISO } from 'date-fns'
import { Alert, AlertTitle, AlertDescription } from './ui/alert'

interface CompanyProfileProps {
  initialCompany: Lead;
  onNoteLogged: (newNote: Note) => void;
}

const formatAddress = (address?: Address) => {
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
  const [isUpselling, setIsUpselling] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
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

  const handleUpsell = async () => {
    if (!company.id) return;
    setIsUpselling(true);
    try {
      const result = await sendUpsellToNetSuite({ leadId: company.id });
      if (result.success) toast({ title: 'Upsell Synced', description: 'NetSuite notified.' });
      else toast({ variant: 'destructive', title: 'Sync Failed', description: result.message });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsUpselling(false);
    }
  };

  if (!user) return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader /></div>;

  const fullAddressStr = formatAddress(company.address);
  const entryDate = company.dateLeadEntered ? parseISO(company.dateLeadEntered) : null;

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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <LeadStatusBadge status={company.status} />
              <p className="text-muted-foreground">&bull; {company.contacts?.length || 0} Contacts</p>
            </div>
        </div>
         <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleUpsell} disabled={isUpselling}>
                {isUpselling ? <Loader /> : <TrendingUp className="mr-2 h-4 w-4" />}
                Upsell
            </Button>
            <Button variant="outline" onClick={() => setIsLogNoteOpen(true)}>
                <ClipboardEdit className="mr-2 h-4 w-4" />
                Log Note
            </Button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
             <CardHeader><CardTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-muted-foreground" />Details</CardTitle></CardHeader>
             <CardContent className="space-y-4">
                {company.companyDescription && <div className="text-sm border-l-4 border-primary pl-4 py-2 bg-secondary/50 rounded-r-md">{company.companyDescription}</div>}
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                 <div className="space-y-1">
                    <p className="text-muted-foreground">Customer ID</p>
                    <div className="flex items-center gap-2">
                        <p className="font-medium">{company.entityId ?? 'N/A'}</p>
                        {company.entityId && (
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(company.entityId, 'Customer ID')}>
                                <Clipboard className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-muted-foreground">NetSuite Internal ID</p>
                    <div className="flex items-center gap-2">
                        <p className="font-medium">{company.salesRecordInternalId || 'N/A'}</p>
                        {company.salesRecordInternalId && (
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(company.salesRecordInternalId, 'Internal ID')}>
                                <Clipboard className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-muted-foreground">Franchisee</p>
                    <p className="font-medium">{company.franchisee || 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-muted-foreground">Date Entered</p>
                    <p className="font-medium">{entryDate && isValid(entryDate) ? format(entryDate, 'PP') : 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-muted-foreground">Campaign</p>
                    <p className="font-medium">{company.campaign || 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-muted-foreground">Source</p>
                    <p className="font-medium">{company.customerSource || 'N/A'}</p>
                 </div>
                 <div className="space-y-1"><p className="text-muted-foreground">Website</p>{company.websiteUrl ? <a href={company.websiteUrl} target="_blank" className="text-primary hover:underline">{company.websiteUrl}</a> : 'N/A'}</div>
                 <div className="space-y-1"><p className="text-muted-foreground">Industry</p><p className="font-medium">{company.industryCategory ?? 'N/A'}</p></div>
                 <div className="space-y-1"><p className="text-muted-foreground">Sales Rep</p><p className="font-medium">{company.salesRepAssigned ?? 'N/A'}</p></div>
               </div>
             </CardContent>
           </Card>
          
          {linkedVisitNote && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Info className="w-5 h-5 text-muted-foreground" />Field Discovery</CardTitle>
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
                                    <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{contact.phone}</div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-muted-foreground" />Address</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-4">
                        <p className="text-muted-foreground">{fullAddressStr}</p>
                        {company.address?.lat && (
                            <div className="h-40 rounded-md border overflow-hidden">
                                <iframe width="100%" height="100%" frameBorder="0" style={{ border: 0 }} src={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddressStr)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}></iframe>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileDigit className="w-5 h-5 text-muted-foreground" />Invoices</CardTitle></CardHeader>
                <CardContent>
                    {loadingInvoices ? <Loader /> : invoices.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>ID</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {invoices.map(inv => (
                                    <TableRow key={inv.id}>
                                        <TableCell>{inv.invoiceDate ? format(new Date(inv.invoiceDate), 'PP') : 'N/A'}</TableCell>
                                        <TableCell className="font-medium">{inv.invoiceDocumentID || inv.documentId}</TableCell>
                                        <TableCell className="text-right">${Number(inv.invoiceTotal).toFixed(2)}</TableCell>
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
    <MapModal isOpen={!!selectedAddress} onClose={() => setSelectedAddress(null)} address={selectedAddress || ''} />
    <LogNoteDialog lead={company} onNoteLogged={handleNoteLoggedAndClose} isOpen={isLogNoteOpen} onOpenChange={setIsLogNoteOpen} />
    </>
  )
}
