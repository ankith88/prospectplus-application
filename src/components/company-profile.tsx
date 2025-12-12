
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { LeadStatusBadge } from '@/components/lead-status-badge'
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
import { useToast } from '@/hooks/use-toast'
import { Loader } from '@/components/ui/loader'
import { MapModal } from '@/components/map-modal'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { getSubCollection } from '@/services/firebase';
import { ScrollArea } from './ui/scroll-area'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'


interface CompanyProfileProps {
  initialCompany: Lead;
}

function InvoicesDialog({ companyId, open, onOpenChange }: { companyId: string, open: boolean, onOpenChange: (open: boolean) => void }) {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && companyId) {
            const fetchInvoices = async () => {
                setLoading(true);
                try {
                    const invoicesRef = collection(firestore, 'companies', companyId, 'invoices');
                    const snapshot = await getDocs(invoicesRef);
                    const invoiceData = snapshot.docs.map(doc => ({ id: doc.id, documentId: doc.data().documentId, invoiceTotal: doc.data().invoiceTotal, invoiceType: doc.data().invoiceType || 'Service' } as Invoice));
                    setInvoices(invoiceData);
                } catch (error) {
                    console.error("Failed to fetch invoices:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchInvoices();
        }
    }, [open, companyId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Invoices</DialogTitle>
                    <DialogDescription>
                        Showing all invoices for this company.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader />
                        </div>
                    ) : invoices.length > 0 ? (
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
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            No invoices found for this company.
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}


export function CompanyProfile({ initialCompany: company }: CompanyProfileProps) {
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [loadingBack, setLoadingBack] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { contacts = [], activity: activities = [], notes = [] } = company;

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

  return (
    <>
    <InvoicesDialog 
        companyId={company.id} 
        open={isInvoiceDialogOpen} 
        onOpenChange={setIsInvoiceDialogOpen} 
    />
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
              <p className="text-muted-foreground">&bull; {contacts?.length || 0} {contacts?.length === 1 ? 'Contact' : 'Contacts'}</p>
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
                <Button variant="outline" size="sm" onClick={() => setIsInvoiceDialogOpen(true)}>
                    <FileDigit className="mr-2 h-4 w-4" />
                    View Invoices
                </Button>
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
