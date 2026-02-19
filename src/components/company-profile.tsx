'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  Building2,
  Calendar,
  Clipboard,
  Globe,
  Hash,
  Key,
  Link as LinkIcon,
  MessageSquare,
  Mail,
  Briefcase,
  MapPin,
  Search,
  History,
  Phone,
  User,
  Users,
  FileDigit,
  ClipboardEdit,
  Tag,
  ExternalLink,
  Info,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Lead, Contact, Activity, Note, Address, Invoice, VisitNote, DiscoveryData } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { ScrollArea } from './ui/scroll-area'
import { LogNoteDialog } from './log-note-dialog'
import { collection, getDocs, orderBy, query, doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { Badge } from './ui/badge'
import { DiscoveryRadarChart } from './discovery-radar-chart'


interface CompanyProfileProps {
  initialCompany: Lead;
  onNoteLogged: (newNote: Note) => void;
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
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load invoices for this company.",
        });
      } finally {
        setLoadingInvoices(false);
      }
    };
    
    fetchInvoices();
  }, [company.id, toast]);

  const handleNoteLoggedAndClose = (newNote: Note) => {
    onNoteLogged(newNote);
    setIsLogNoteOpen(false);
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

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  const fullAddress = company.address
    ? [company.address.address1, company.address.street, company.address.city, company.address.state, company.address.zip, company.address.country].filter(Boolean).join(', ')
    : 'No address available';

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
              <p className="text-muted-foreground">&bull; {company.contacts?.length || 0} {company.contacts?.length === 1 ? 'Contact' : 'Contacts'}</p>
            </div>
          </div>
        </div>
         <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsLogNoteOpen(true)}>
                <ClipboardEdit className="mr-2 h-4 w-4" />
                Log a Note
            </Button>
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
                        <span className="break-all">{company.customerPhone ?? 'N/A'}</span>
                        {company.customerPhone && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(company.customerPhone, 'Phone')}>
                                <Clipboard className="w-3 h-3" />
                            </Button>
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
                      <p className="text-muted-foreground">Campaign</p>
                      <p className="font-medium">{company.campaign ?? 'N/A'}</p>
                    </div>
                  </div>
                   <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Lead Source</p>
                      <p className="font-medium">{company.customerSource ?? 'N/A'}</p>
                    </div>
                  </div>
                   <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Date Lead Entered</p>
                      <p className="font-medium">{company.dateLeadEntered ? new Date(company.dateLeadEntered).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
               </div>
             </CardContent>
           </Card>
          
          {linkedVisitNote && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-muted-foreground" />
                        Field Discovery from Visit Note
                    </CardTitle>
                    <CardDescription>
                        The following discovery data and notes were captured during the initial visit.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isDiscoveryLoading ? (
                        <div className="flex justify-center p-8"><Loader /></div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {linkedVisitNote.content && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Original Visit Notes:</h4>
                                    <div className="p-4 rounded-md bg-muted text-sm whitespace-pre-wrap text-muted-foreground italic">
                                        "{linkedVisitNote.content}"
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted">
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-muted-foreground">Score</p>
                                    <p className="text-2xl font-bold">{linkedVisitNote.discoveryData?.score ?? 'N/A'}</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-muted-foreground">Routing Tag</p>
                                    <Badge variant="outline">{linkedVisitNote.discoveryData?.routingTag ?? 'N/A'}</Badge>
                                </div>
                            </div>
                            {linkedVisitNote.discoveryData && (
                                <DiscoveryRadarChart discoveryData={linkedVisitNote.discoveryData as DiscoveryData} />
                            )}
                            {linkedVisitNote.discoveryData?.scoringReason && (
                                <div className="text-xs text-muted-foreground p-2 border-t">
                                    <strong>Scoring Rationale:</strong> {linkedVisitNote.discoveryData.scoringReason}
                                </div>
                            )}
                             <div className="text-sm space-y-2 pt-4 border-t">
                                <h4 className="font-semibold">Captured Answers:</h4>
                                <ul className="list-disc pl-5 text-muted-foreground">
                                    {linkedVisitNote.discoveryData?.discoverySignals && linkedVisitNote.discoveryData.discoverySignals.length > 0 && (
                                        <li><strong>Signals:</strong> {linkedVisitNote.discoveryData.discoverySignals.join(', ')}</li>
                                    )}
                                    {linkedVisitNote.discoveryData?.inconvenience && <li><strong>Inconvenience:</strong> {linkedVisitNote.discoveryData.inconvenience}</li>}
                                    {linkedVisitNote.discoveryData?.occurrence && <li><strong>Occurrence:</strong> {linkedVisitNote.discoveryData.occurrence}</li>}
                                    {(linkedVisitNote.discoveryData as any)?.taskOwner && <li><strong>Task Owner:</strong> {(linkedVisitNote.discoveryData as any).taskOwner}</li>}
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
                    {company.contacts && company.contacts.length > 0 ? (
                    <div className="space-y-4">
                    {company.contacts.map((contact, index) => (
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
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileDigit className="w-5 h-5 text-muted-foreground" />
                        Invoices
                    </CardTitle>
                     <CardDescription>
                        Financial records for this company.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="max-h-[60vh]">
                        {loadingInvoices ? (
                            <div className="flex justify-center py-10"><Loader /></div>
                        ) : invoices.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice Date</TableHead>
                                            <TableHead>Invoice ID</TableHead>
                                            <TableHead>Invoice Type</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.map((invoice) => (
                                            <TableRow key={invoice.id}>
                                                <TableCell>{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'N/A'}</TableCell>
                                                <TableCell className="font-medium">{invoice.invoiceDocumentID || invoice.documentId}</TableCell>
                                                <TableCell>{!invoice.invoiceType || invoice.invoiceType === '- None -' ? 'Service' : invoice.invoiceType}</TableCell>
                                                <TableCell className="text-right">${' '}{Number(invoice.invoiceTotal).toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    {invoice.invoiceURL && (
                                                        <Button asChild variant="outline" size="sm">
                                                            <a href={invoice.invoiceURL} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="mr-2 h-4 w-4" /> View
                                                            </a>
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                No invoices found for this company.
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

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
                            {company.notes && company.notes.length > 0 ? (
                                <div className="space-y-4 mt-4">
                                {company.notes.map(note => (
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
                            {company.activity && company.activity.length > 0 ? (
                                <ul className="space-y-4 mt-4">
                                {company.activity.map((item, index) => (
                                    <li key={item.id} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className="bg-secondary rounded-full p-2">
                                        {item.type === 'Call' && <Phone className="h-4 w-4 text-muted-foreground" />}
                                        {item.type === 'Email' && <Mail className="h-4 w-4 text-muted-foreground" />}
                                        {item.type === 'Meeting' && <Calendar className="h-4 w-4 text-muted-foreground" />}
                                        {item.type === 'Update' && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                        {company.activity && index < company.activity.length - 1 && (
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
      </main>
    </div>
    <MapModal
        isOpen={!!selectedAddress}
        onClose={() => setSelectedAddress(null)}
        address={selectedAddress || ''}
      />
    <LogNoteDialog lead={company} onNoteLogged={handleNoteLoggedAndClose} isOpen={isLogNoteOpen} onOpenChange={setIsLogNoteOpen} />
    </>
  )
}
