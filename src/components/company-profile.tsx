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
  Trash2,
  Plus,
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
import { collection, getDocs, orderBy, query, doc, getDoc, where } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { Badge } from './ui/badge'
import { DiscoveryRadarChart } from './discovery-radar-chart'
import { sendUpsellToNetSuite } from '@/services/netsuite-upsell-proxy'
import { format, isValid } from 'date-fns'
import { Alert, AlertTitle, AlertDescription } from './ui/alert'
import { logActivity, logUpsell, getAllUsers, getCompanyFromFirebase, deleteAdditionalAddress, getOperatorsForFranchisee } from '@/services/firebase'
import { formatInTimezone, parseDateString, safeFormatDate } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { CompanyScanMetrics } from './company-scan-metrics'
import { EditAddressDialog } from './edit-address-dialog'
import { ManageAdditionalAddressesDialog } from './manage-additional-addresses-dialog'
import type { TaggedAddress } from '@/lib/types'

interface CompanyProfileProps {
  initialCompany: Lead;
  onNoteLogged: (newNote: Note) => void;
}

const formatAddressString = (address?: Address) => {
    if (!address) return 'N/A';
    const parts = [];
    if (address.address1 !== null && address.address1 !== undefined && address.address1 !== 'undefined' && address.address1.trim() !== '') {
        parts.push(address.address1);
    }
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);
    if (address.country) parts.push(address.country);
    return parts.filter(Boolean).join(', ');
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

  // Cancellation Request Dialog States
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancellationThemes, setCancellationThemes] = useState<any[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [selectedWhyId, setSelectedWhyId] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [cancellationDate, setCancellationDate] = useState(new Date().toISOString().substring(0, 10));
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);
  
  // Upsell state
  const [isUpsellDialogOpen, setIsUpsellDialogOpen] = useState(false);
  const [isUpselling, setIsUpselling] = useState(false);
  const [upsellRepUid, setUpsellRepUid] = useState('');
  const [upsellNotes, setUpsellNotes] = useState('');
  const [fieldReps, setFieldReps] = useState<UserProfile[]>([]);

  // Franchisee & Operators state
  const [franchiseeDetails, setFranchiseeDetails] = useState<any | null>(null);
  const [loadingFranchisee, setLoadingFranchisee] = useState(false);
  const [operators, setOperators] = useState<any[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [isOperatorsModalOpen, setIsOperatorsModalOpen] = useState(false);
  const [isSuburbsModalOpen, setIsSuburbsModalOpen] = useState(false);
  const [operatorMap, setOperatorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'operators'));
        const mapping: Record<string, string> = {};
        snap.docs.forEach(doc => {
          const data = doc.data();
          const fullName = `${data.givenNames || ''} ${data.surname || ''}`.trim() || data.name || doc.id;
          mapping[doc.id] = fullName;
          if (data.internalId) {
            mapping[String(data.internalId)] = fullName;
          }
        });
        setOperatorMap(mapping);
      } catch (error) {
        console.error("Failed to fetch operators mapping:", error);
      }
    };
    fetchOperators();
  }, []);

  useEffect(() => {
    const fetchFranchiseeData = async () => {
      if (!company.franchisee_id && !company.franchisee) {
        setFranchiseeDetails(null);
        return;
      }
      setLoadingFranchisee(true);
      try {
        let franchiseeDoc = null;
        
        // 1. Fetch by franchisee_id doc ID
        if (company.franchisee_id) {
          const fDoc = await getDoc(doc(firestore, 'franchisees', company.franchisee_id));
          if (fDoc.exists()) {
            franchiseeDoc = { id: fDoc.id, ...fDoc.data() };
          } else {
            // 2. Fetch by internalId matching franchisee_id
            const q = query(collection(firestore, 'franchisees'), where('internalId', '==', company.franchisee_id));
            const qSnap = await getDocs(q);
            if (!qSnap.empty) {
              franchiseeDoc = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
            }
          }
        }
        
        // 3. Fallback: fetch by name matching company.franchisee
        if (!franchiseeDoc && company.franchisee) {
          const q = query(collection(firestore, 'franchisees'), where('name', '==', company.franchisee));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            franchiseeDoc = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
          }
        }

        setFranchiseeDetails(franchiseeDoc);
      } catch (error) {
        console.error("Error fetching franchisee details:", error);
      } finally {
        setLoadingFranchisee(false);
      }
    };

    fetchFranchiseeData();
  }, [company.franchisee_id, company.franchisee]);

  const handleViewOperators = async () => {
    setIsOperatorsModalOpen(true);
    const fId = franchiseeDetails?.internalId || franchiseeDetails?.id || company.franchisee_id;
    if (!fId) return;
    setLoadingOperators(true);
    try {
      const ops = await getOperatorsForFranchisee(String(fId));
      setOperators(ops);
    } catch (error) {
      console.error("Error fetching operators:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch operators. Please try again.",
      });
    } finally {
      setLoadingOperators(false);
    }
  };

  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isAdditionalAddressDialogOpen, setIsAdditionalAddressDialogOpen] = useState(false);
  const [additionalAddressToEdit, setAdditionalAddressToEdit] = useState<TaggedAddress | null>(null);

  const handleAddAdditionalAddress = () => {
    setAdditionalAddressToEdit(null);
    setIsAdditionalAddressDialogOpen(true);
  };

  const handleEditAdditionalAddress = (addr: TaggedAddress) => {
    setAdditionalAddressToEdit(addr);
    setIsAdditionalAddressDialogOpen(true);
  };

  const handleDeleteAdditionalAddress = async (addrId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      await deleteAdditionalAddress(company.id, addrId, true);
      toast({
        title: "Address Deleted",
        description: "The address has been successfully deleted.",
      });
      const updatedCompany = await getCompanyFromFirebase(company.id, true);
      if (updatedCompany) setCompany(updatedCompany);
    } catch (error) {
      console.error("Failed to delete address:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete address. Please try again.",
      });
    }
  };

  const handleAddressSaved = async () => {
    const updatedCompany = await getCompanyFromFirebase(company.id, true);
    if (updatedCompany) setCompany(updatedCompany);
  };

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
              const reps = users.filter(u => (u.assignedRoles?.includes('Field Sales') || u.assignedRoles?.includes('Dashback') || u.assignedRoles?.includes('admin') || u.assignedRoles?.includes('Field Sales Admin')) && !u.disabled);
              setFieldReps(reps);
              if (userProfile && (userProfile.activeRole === 'Field Sales' || userProfile.activeRole === 'admin')) {
                  setUpsellRepUid(userProfile.uid);
              }
          });
      }
  }, [isUpsellDialogOpen, userProfile]);

  useEffect(() => {
    async function fetchHierarchy() {
      try {
        const snap = await getDocs(collection(firestore, 'cancellation_hierarchy'));
        setCancellationThemes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error fetching hierarchy:", e);
      }
    }
    if (isCancelDialogOpen) {
      fetchHierarchy();
    }
  }, [isCancelDialogOpen]);

  const handleConfirmCancellation = async () => {
    if (!selectedThemeId || !selectedWhyId || !selectedReasonId || !requestedBy || !cancellationDate) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill in all cancellation request fields.' });
      return;
    }
    setIsSubmittingCancellation(true);
    try {
      const selectedThemeObj = cancellationThemes.find(t => t.id === selectedThemeId);
      const selectedWhyObj = selectedThemeObj?.whys?.find((w: any) => w.id === selectedWhyId);
      const selectedReasonObj = selectedWhyObj?.reasons?.find((r: any) => r.id === selectedReasonId);
      const requestedDate = new Date().toISOString();
      const userDisplayName = user?.displayName || userProfile?.displayName || user?.email || 'System';
      const userEmail = user?.email || userProfile?.email || 'System';

      const { addDoc } = await import('firebase/firestore');
      await addDoc(collection(firestore, 'cancellations'), {
        leadId: company.id,
        companyName: company.companyName,
        contactName: company.contacts?.[0]?.name || '',
        contactEmail: company.customerServiceEmail || '',
        contactPhone: company.customerPhone || '',
        requestedDate,
        cancellationDate,
        trueServiceCancellationDate: cancellationDate,
        cancellationReason: selectedReasonObj?.name || '',
        cancellationReasonId: selectedReasonId,
        cancellationTheme: selectedThemeObj?.name || '',
        cancellationThemeId: selectedThemeId,
        cancellationWhyId: selectedWhyId,
        status: 'Pending',
        originalServices: company.services || [],
        requestedBy,
        createdBy: `${userDisplayName} (${userEmail})`,
        createdAt: new Date().toISOString(),
        callsCount: 0
      });

      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(firestore, 'leads', company.id), {
        bucket: 'customer_success',
        cancellationRequested: true,
        cancellationReason: selectedReasonObj?.name || '',
        cancellationReasonId: selectedReasonId,
        cancellationTheme: selectedThemeObj?.name || '',
        cancellationThemeId: selectedThemeId,
        cancellationCategory: selectedWhyObj?.name || '',
        cancellationWhyId: selectedWhyId,
        cancellationdate: cancellationDate
      });

      await logActivity(company.id, {
        type: 'Update',
        notes: `Cancellation request submitted by ${requestedBy}. Requested Date: ${cancellationDate}. Theme: ${selectedThemeObj?.name}, Why: ${selectedWhyObj?.name}, Reason: ${selectedReasonObj?.name}.`,
        author: userDisplayName
      });

      toast({ title: 'Success', description: 'Cancellation request has been submitted.' });
      setIsCancelDialogOpen(false);
      setCompany(prev => ({
        ...prev,
        bucket: 'customer_success',
        cancellationRequested: true,
        cancellationReason: selectedReasonObj?.name || '',
        cancellationReasonId: selectedReasonId,
        cancellationTheme: selectedThemeObj?.name || '',
        cancellationThemeId: selectedThemeId,
        cancellationCategory: selectedWhyObj?.name || '',
        cancellationWhyId: selectedWhyId,
        cancellationdate: cancellationDate
      }));
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Submission Failed', description: e.message || 'Failed to submit cancellation request.' });
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

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
    logActivity(company.id, { 
        type: 'Call', 
        notes: `Initiated call to ${phoneNumber} via AirCall app.`,
        author: user?.displayName || 'Unknown'
    });
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
          toast({ variant: 'destructive', title: 'Partial Success', description: `Logged in prospect.plus, but NetSuite sync failed: ${nsResult.message}` });
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
    const date = parseDateString(dateStr);
    return date && isValid(date) ? format(date, 'MMM d, yyyy') : '-';
  };

  const DetailItem = ({ icon: Icon, label, value, copyable, isLink, linkUrl, isWebsite, callable, leadId, emailClickable }: any) => {
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
                ) : emailClickable && value ? (
                    <a href={`mailto:${value}`} className="text-sm font-semibold text-primary hover:underline text-left">
                        {value}
                    </a>
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
              {company.bucket === 'inbound' && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Inbound</Badge>
              )}
              {(company.bucket === 'outbound' || (!company.bucket && !company.fieldSales)) && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Outbound</Badge>
              )}
              {(company.bucket === 'field_sales' || (!company.bucket && company.fieldSales)) && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Field Sales</Badge>
              )}
              {company.bucket === 'account_manager' && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Account Manager</Badge>
              )}
              {company.bucket === 'customer_success' && (
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Customer Success</Badge>
              )}
              {company.bucket === 'nurture' && (
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Nurture</Badge>
              )}
              {company.bucket === 'marketing' && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Marketing</Badge>
              )}
              {company.bucket === 'lpo_plus' && (
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">LPO.Plus</Badge>
              )}
              <span className="text-xs text-muted-foreground">&bull;</span>
              <div className="text-muted-foreground text-sm font-medium flex items-center">
                  {(() => {
                      const b = company.bucket;
                      if (b === 'outbound' || (!b && !company.fieldSales)) return <span>Dialer: {company.dialerAssigned || 'Unassigned'}</span>;
                      if (b === 'inbound' || b === 'account_manager' || (b as any) === 'multisite' || b === 'customer_success' || b === 'nurture' || b === 'marketing') return <span>AM: {company.accountManagerAssigned || 'Unassigned'}</span>;
                      if (b === 'field_sales' || (!b && company.fieldSales)) return <span>Field Rep: {company.salesRepAssigned || (company as any).fieldRepAssigned || 'Unassigned'}</span>;
                      return <span>Owner: Unassigned</span>;
                  })()}
              </div>
              <span className="text-xs text-muted-foreground">&bull;</span>
              <p className="text-muted-foreground text-sm font-medium">{company.contacts?.length || 0} Contacts</p>
            </div>
            
            {(company.localMileTrialsRemaining !== undefined || company.status?.includes('LocalMile') || company.customerStatus?.includes('LocalMile') || company.hasCreatedJob === true || String(company.hasCreatedJob) === 'true' || company.jobCount !== undefined || company.lastLocalMileJobCreatedAt !== undefined) && (
                <div className="flex wrap items-center gap-x-2 gap-y-1 mt-2">
                    {company.hasCreatedJob === true || String(company.hasCreatedJob) === 'true' ? (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" title={`First job created on ${company.firstJobCreatedAt ? new Date(company.firstJobCreatedAt).toLocaleDateString() : 'N/A'}`}>
                            Jobs Created: {company.jobCount?.toString() ?? '0'}
                        </Badge>
                    ) : (
                        company.status === 'LocalMile Pending' && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
                                Pending First Job
                            </Badge>
                        )
                    )}
                    <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200">
                        Trials Remaining: {company.localMileTrialsRemaining?.toString() ?? '5'}
                    </Badge>
                    {company.lastLocalMileJobCreatedAt && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200">
                            Last Job: {safeFormatDate(company.lastLocalMileJobCreatedAt, 'MMM d, h:mm a')}
                        </Badge>
                    )}
                </div>
            )}
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
                        <DetailItem icon={Hash} label="NetSuite Internal ID" value={(company as any).internalid || company.salesRecordInternalId} copyable />
                        <DetailItem icon={CalendarIcon} label="Date Entered" value={formatDate(company.dateLeadEntered)} />
                        <DetailItem icon={Globe} label="Website" value={company.websiteUrl} isWebsite />
                        <DetailItem icon={Hash} label="ABN" value={company.abn || '- None -'} copyable />
                        <DetailItem icon={Tag} label="Industry" value={company.industryCategory} />
                    </div>
                    <div className="space-y-8">
                        <DetailItem icon={Mail} label="Email" value={company.customerServiceEmail} copyable />
                        <DetailItem icon={Phone} label="Phone" value={company.customerPhone} copyable callable leadId={company.id} />
                        <DetailItem icon={User} label="Account Manager Assigned" value={company.accountManagerAssigned} />
                        <DetailItem icon={Briefcase} label="Lead Source" value={company.campaign || company.customerSource} />
                        <DetailItem icon={Tag} label="Sub-Industry" value={company.industrySubCategory || '- None -'} />
                    </div>
                </div>
             </CardContent>
           </Card>

          <Card>
             <CardHeader className="pb-4 border-b">
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    Franchisee Details
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
                {loadingFranchisee ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading franchisee details...</span>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-8">
                                <DetailItem icon={Tag} label="Franchisee Name" value={franchiseeDetails?.name || company.franchisee || 'Unassigned'} />
                                <DetailItem icon={User} label="Main Contact" value={franchiseeDetails?.mainContact || '-'} />
                            </div>
                            <div className="space-y-8">
                                <DetailItem icon={Mail} label="Email" value={franchiseeDetails?.email || '-'} copyable emailClickable />
                                <DetailItem icon={Phone} label="Mobile" value={franchiseeDetails?.mobile || '-'} copyable callable leadId={company.id} />
                            </div>
                        </div>
                        {(company.franchisee_id || company.franchisee) && (company.franchisee !== 'Unassigned') && (
                            <div className="pt-4 border-t flex justify-end gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setIsSuburbsModalOpen(true)}
                                    className="flex items-center gap-2"
                                >
                                    <MapPin className="h-4 w-4" />
                                    View Suburb Mappings
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleViewOperators}
                                    className="flex items-center gap-2"
                                >
                                    <Users className="h-4 w-4" />
                                    View Linked Operators
                                </Button>
                            </div>
                        )}
                    </div>
                )}
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
                            <AlertDescription>{formatInTimezone(linkedVisitNote.scheduledDate, linkedVisitNote.capturedTimezone || 'Australia/Sydney', 'PPP')} {linkedVisitNote.scheduledTime && `@ ${linkedVisitNote.scheduledTime}`}</AlertDescription>
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

                    <div className="text-sm space-y-3 pt-4 border-t">
                        <h4 className="font-semibold text-primary">Captured Details:</h4>
                        <div className="grid grid-cols-1 gap-y-3">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Metadata</span>
                                <p className="text-muted-foreground"><strong>By:</strong> {linkedVisitNote.capturedBy} &bull; <strong>Outcome:</strong> {linkedVisitNote.outcome?.type || 'N/A'}</p>
                            </div>
                            
                            {linkedVisitNote.discoveryData?.personSpokenWithName && (
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Contact Spoken With</span>
                                    <p className="text-muted-foreground">{linkedVisitNote.discoveryData.personSpokenWithName} ({linkedVisitNote.discoveryData.personSpokenWithTitle || 'Contact'})</p>
                                </div>
                            )}

                            {linkedVisitNote.discoveryData?.discoveryAnswers && linkedVisitNote.discoveryData.discoveryAnswers.length > 0 && (
                                <div className="flex flex-col gap-2 mt-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Field Discovery Answers</span>
                                    <div className="space-y-3">
                                        {linkedVisitNote.discoveryData.discoveryAnswers.map((ans, idx) => (
                                            <div key={idx} className="bg-muted/30 p-2 rounded-md border-l-2 border-primary/20">
                                                <p className="text-[11px] font-semibold text-foreground/80 leading-tight">{ans.question}</p>
                                                <p className="text-sm mt-1 text-foreground font-medium">{ans.answer}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {linkedVisitNote.discoveryData?.discoverySignals && linkedVisitNote.discoveryData.discoverySignals.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Signals Observed</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {linkedVisitNote.discoveryData.discoverySignals.map(s => (
                                            <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
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
                        
                        <Button variant="outline" className="w-full bg-sidebar-accent/20 border-none hover:bg-sidebar-accent/30 text-foreground font-medium py-6 rounded-full" onClick={() => setIsAddressDialogOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Site Address
                        </Button>

                        {/* Additional Tagged Addresses */}
                        {company.additionalAddresses && company.additionalAddresses.length > 0 && (
                            <div className="space-y-3 pt-3 border-t mt-4">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Additional Addresses</h4>
                                <div className="space-y-2">
                                    {company.additionalAddresses.map((addr) => {
                                        const addrStr = formatAddressString(addr);
                                        return (
                                            <div key={addr.id} className="flex items-start justify-between gap-2 p-2 rounded-lg border bg-card text-card-foreground">
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                                                            {addr.tag}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground break-words">{addrStr}</p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setSelectedAddress(addrStr)}>
                                                        <Search className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEditAdditionalAddress(addr)}>
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAdditionalAddress(addr.id!)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <Button variant="outline" className="w-full bg-sidebar-accent/10 border border-dashed hover:bg-sidebar-accent/20 text-foreground font-medium py-3 rounded-xl mt-4 flex items-center justify-center gap-1.5" onClick={() => handleAddAdditionalAddress()}>
                            <Plus className="h-4 w-4" />
                            Add Tagged Address
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            <CompanyScanMetrics companyId={company.id} />
        </div>
        
        {/* Right Sidebar */}
        <div className="flex flex-col gap-6">
            <Card className="border-primary bg-primary/5">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg">Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    <Button className="w-full justify-start bg-background hover:bg-muted font-medium" variant="outline" onClick={() => setIsUpsellDialogOpen(true)}>
                        <TrendingUp className="mr-2 h-4 w-4" />Record Upsell
                    </Button>
                    <Button className="w-full justify-start bg-background hover:bg-muted" variant="outline" onClick={() => setIsLogNoteOpen(true)}>
                        <ClipboardEdit className="mr-2 h-4 w-4" />Log a Note
                    </Button>
                    {!company.cancellationRequested && company.status !== 'Lost Customer' ? (
                        <Button className="w-full justify-start bg-background hover:bg-destructive/10 text-destructive border-destructive/20 hover:border-destructive/30" variant="outline" onClick={() => setIsCancelDialogOpen(true)}>
                            <FileX className="mr-2 h-4 w-4" />Request Cancellation
                        </Button>
                    ) : (
                        <div className="text-xs text-center py-1.5 px-3 bg-muted rounded-lg text-muted-foreground border">
                            Cancellation request already processed or active.
                        </div>
                    )}
                </CardContent>
            </Card>

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
                                        <TableCell>{inv.invoiceDate ? safeFormatDate(inv.invoiceDate, 'PP') : 'N/A'}</TableCell>
                                        <TableCell className="font-medium">{inv.invoiceDocumentID || inv.documentId}</TableCell>
                                        <TableCell className="text-right">${Number(inv.invoiceTotal).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            {inv.invoiceURL ? (
                                                <Button size="sm" variant="outline" asChild>
                                                    <a href={inv.invoiceURL} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        View
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
                                <div key={note.id} className="text-sm border-l-2 pl-4 py-1"><p>{note.content}</p><p className="text-xs text-muted-foreground mt-1">{safeFormatDate(note.date, 'PPpp')} by {note.author}</p></div>
                            ))}
                        </TabsContent>
                        <TabsContent value="activity" className="space-y-2 pt-4">
                            {company.activity?.map(a => <div key={a.id} className="text-xs flex justify-between"><span>{a.notes}</span><span className="text-muted-foreground">{safeFormatDate(a.date, 'PP')}</span></div>)}
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

    <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Request Customer Cancellation</DialogTitle>
                <DialogDescription>Submit a customer cancellation request to be processed by the Customer Success team.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="requestedBy">Person Requesting Cancellation*</Label>
                    <Input 
                        id="requestedBy" 
                        placeholder="e.g. Customer Contact Name or Representative" 
                        value={requestedBy} 
                        onChange={(e) => setRequestedBy(e.target.value)} 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cancelDate">Cancellation Effective Date*</Label>
                    <Input 
                        id="cancelDate" 
                        type="date" 
                        value={cancellationDate} 
                        onChange={(e) => setCancellationDate(e.target.value)} 
                    />
                </div>
                <div className="space-y-2">
                    <Label>Cancellation Theme*</Label>
                    <Select 
                        value={selectedThemeId} 
                        onValueChange={(val) => {
                            setSelectedThemeId(val);
                            setSelectedWhyId('');
                            setSelectedReasonId('');
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Theme..." />
                        </SelectTrigger>
                        <SelectContent>
                            {cancellationThemes.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {selectedThemeId && (
                    <div className="space-y-2">
                        <Label>Why*</Label>
                        <Select 
                            value={selectedWhyId} 
                            onValueChange={(val) => {
                                setSelectedWhyId(val);
                                setSelectedReasonId('');
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Category..." />
                            </SelectTrigger>
                            <SelectContent>
                                {cancellationThemes.find(t => t.id === selectedThemeId)?.whys?.map((w: any) => (
                                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {selectedWhyId && (
                    <div className="space-y-2">
                        <Label>Reason*</Label>
                        <Select 
                            value={selectedReasonId} 
                            onValueChange={setSelectedReasonId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Reason..." />
                            </SelectTrigger>
                            <SelectContent>
                                {cancellationThemes.find(t => t.id === selectedThemeId)?.whys?.find((w: any) => w.id === selectedWhyId)?.reasons?.map((r: any) => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)} disabled={isSubmittingCancellation}>Cancel</Button>
                <Button 
                    onClick={handleConfirmCancellation} 
                    className="bg-destructive hover:bg-destructive/90 text-white" 
                    disabled={isSubmittingCancellation || !requestedBy || !cancellationDate || !selectedThemeId || !selectedWhyId || !selectedReasonId}
                >
                    {isSubmittingCancellation ? <Loader /> : 'Submit Request'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <MapModal isOpen={!!selectedAddress} onClose={() => setSelectedAddress(null)} address={selectedAddress || ''} />
    <LogNoteDialog lead={company} onNoteLogged={handleNoteLoggedAndClose} isOpen={isLogNoteOpen} onOpenChange={setIsLogNoteOpen} />
    <EditAddressDialog lead={company} isOpen={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen} onLeadUpdated={(updates) => setCompany(prev => ({ ...prev, ...updates }))} />
    <ManageAdditionalAddressesDialog
        leadId={company.id}
        isCompany={true}
        addressToEdit={additionalAddressToEdit}
        isOpen={isAdditionalAddressDialogOpen}
        onOpenChange={setIsAdditionalAddressDialogOpen}
        onAddressSaved={handleAddressSaved}
    />

    <Dialog open={isOperatorsModalOpen} onOpenChange={setIsOperatorsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Operators for {franchiseeDetails?.name || company.franchisee || 'Franchisee'}
            </DialogTitle>
            <DialogDescription>
              List of operators linked to this franchisee.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {loadingOperators ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">Loading operators...</p>
              </div>
            ) : operators.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No operators found for this franchisee.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operator ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role/Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operators.map((op: any) => (
                      <TableRow key={op.internalId || op.id}>
                        <TableCell className="font-mono text-xs">{op.internalId || op.id}</TableCell>
                        <TableCell className="font-medium">
                          {`${op.title || ''} ${op.givenNames || ''} ${op.surname || ''}`.trim() || 'Unnamed'}
                        </TableCell>
                        <TableCell className="text-sm">{op.contactEmail || '-'}</TableCell>
                        <TableCell className="text-sm">{op.contactPhone || '-'}</TableCell>
                        <TableCell className="text-xs">
                          {op.operatorStatus && (
                            <Badge variant="secondary" className="mr-1">
                              {op.operatorStatus}
                            </Badge>
                          )}
                          {op.employment && (
                            <Badge variant="outline">
                              {op.employment}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsOperatorsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSuburbsModalOpen} onOpenChange={setIsSuburbsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Suburb Mappings for {franchiseeDetails?.name || company.franchisee || 'Franchisee'}
            </DialogTitle>
            <DialogDescription>
              View mapped suburbs, post codes, and operators by delivery network.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden py-4 flex flex-col min-h-0">
            <Tabs defaultValue="ausPost" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="ausPost">AusPost ({franchiseeDetails?.ausPostSuburbsJson?.length || 0})</TabsTrigger>
                <TabsTrigger value="territory">Territory ({franchiseeDetails?.territoryJson?.length || 0})</TabsTrigger>
                <TabsTrigger value="starTrack">StarTrack ({franchiseeDetails?.starTrackSuburbsJson?.length || 0})</TabsTrigger>
              </TabsList>
              
              {['ausPost', 'territory', 'starTrack'].map((tabKey) => {
                const jsonField = 
                  tabKey === 'ausPost' ? 'ausPostSuburbsJson' : 
                  tabKey === 'territory' ? 'territoryJson' : 
                  'starTrackSuburbsJson';
                const list = franchiseeDetails?.[jsonField] || [];
                
                return (
                  <TabsContent key={tabKey} value={tabKey} className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {list.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-12">
                        No suburb mappings defined for this network.
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto border rounded-lg">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                              <TableHead>Suburb</TableHead>
                              <TableHead>Post Code</TableHead>
                              <TableHead>State</TableHead>
                              <TableHead>Primary Op</TableHead>
                              <TableHead>Secondary Op</TableHead>
                              <TableHead>Next Day</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {list.map((item: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="font-semibold">{item.suburbs || item.suburb || '-'}</TableCell>
                                <TableCell>{item.post_code || item.postcode || '-'}</TableCell>
                                <TableCell className="uppercase">{item.state || '-'}</TableCell>
                                <TableCell>
                                  {(() => {
                                    const ops = Array.isArray(item.primary_op) 
                                      ? item.primary_op 
                                      : item.primary_op ? [item.primary_op] : [];
                                    return ops.map((opId: any) => operatorMap[String(opId)] || opId).join(', ') || '-';
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {operatorMap[String(item.secondary_op)] || item.secondary_op || '-'}
                                </TableCell>
                                <TableCell>{item.next_day ? 'Yes' : 'No'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
          
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsSuburbsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
