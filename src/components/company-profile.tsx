'use client'

import { useRouter } from 'next/navigation'
import { CopyButton } from '@/components/ui/copy-button'
import { DialerInsightsDialog, DialerInsightsData } from '@/components/dialer-insights-dialog'

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
  CalendarCheck,
  ShieldCheck,
  Loader2,
  Check,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { OrganiseOnboardingDialog } from '@/components/customer-success/organise-onboarding-dialog'
import { getOnboardingRequestByLeadId } from '@/services/onboarding-service'
import type { OnboardingRequest } from '@/lib/types'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import type { Lead, LeadStatus, Note, Address, Invoice, VisitNote, DiscoveryData, UserProfile } from '@/lib/types'
import { EmailVerificationBadge } from '@/components/ui/email-verification-badge'
import { verifyEmailsClient } from '@/lib/verify-email-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { format, isValid } from 'date-fns'
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
import { CancelCustomerDialog } from '@/components/cancel-customer-dialog'
import { LogNoteDialog } from './log-note-dialog'
import { LossReasonPicker } from './loss-reason-picker'
import { collection, getDocs, orderBy, query, doc, getDoc, setDoc, where, onSnapshot, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { canEditSignedCustomerAddress, canFranchiseeAccessLead, canChangeFranchisee } from '@/lib/lead-permissions'
import { sendCompanyCustomerUpdateToNetSuite } from '@/services/netsuite'
import { AccessDenied } from '@/components/access-denied'
import { RequestAddressChangeDialog } from '@/components/request-address-change-dialog'
import { NotifyUpsellDialog } from '@/components/notify-upsell-dialog'
import { Badge } from './ui/badge'
import { DiscoveryRadarChart } from './discovery-radar-chart'
import { logActivity, getAllUsers, getCompanyFromFirebase, deleteAdditionalAddress, getOperatorsForFranchisee, getAllFranchisees } from '@/services/firebase'
import { formatInTimezone, parseDateString, safeFormatDate, getLeadDisplayDateValue, getLeadDisplayDateLabel } from '@/lib/utils'
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
  const { user, userProfile, isSuperAdmin } = useAuth();

  if (userProfile && initialCompany && !canFranchiseeAccessLead(initialCompany, userProfile)) {
    return <AccessDenied customPageName={initialCompany.companyName ? `Company: ${initialCompany.companyName}` : 'Company Details'} />;
  }

  const isAdmin = userProfile?.activeRole === 'admin' || userProfile?.role === 'admin' || isSuperAdmin;

  const [company, setCompany] = useState<Lead>(initialCompany);
  const [localMileJobs, setLocalMileJobs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [showAllInvoices, setShowAllInvoices] = useState(false);

  const sortedNotes = useMemo(() => {
    return [...(company.notes || [])].sort((a, b) => {
      const timeA = new Date(a.date || (a as any).createdAt || 0).getTime();
      const timeB = new Date(b.date || (b as any).createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [company.notes]);

  const sortedCalls = useMemo(() => {
    const calls = (company.activity || []).filter(a => a.type === 'Call' || a.notes?.includes('Initiated call') || a.aircallStatus === 'initiated' || a.callId);
    return [...calls].sort((a, b) => {
      const timeA = new Date(a.date || (a as any).createdAt || 0).getTime();
      const timeB = new Date(b.date || (b as any).createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [company.activity]);

  const sortedActivities = useMemo(() => {
    return [...(company.activity || [])].sort((a, b) => {
      const timeA = new Date(a.date || (a as any).createdAt || 0).getTime();
      const timeB = new Date(b.date || (b as any).createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [company.activity]);

  const sortedEmails = useMemo(() => {
    return [...(company.emails || [])].sort((a, b) => {
      const timeA = new Date(a.sentAt || (a as any).date || (a as any).createdAt || 0).getTime();
      const timeB = new Date(b.sentAt || (b as any).date || (b as any).createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [company.emails]);

  useEffect(() => {
    if (!company?.id) return;
    const q = query(collection(firestore, 'leads', company.id, 'localMileJobs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsList = snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }));
      setLocalMileJobs(jobsList);

      if (jobsList.length > 0) {
        const validJobsCount = jobsList.filter(j => j.status !== 'recredited' && j.status !== 'cancelled').length;
        const computedTrials = Math.max(0, 5 - validJobsCount);
        const computedJobCount = jobsList.length;

        if (company.jobCount !== computedJobCount || company.localMileTrialsRemaining !== computedTrials || !company.hasCreatedJob) {
          updateDoc(doc(firestore, 'leads', company.id), {
            jobCount: computedJobCount,
            hasCreatedJob: true,
            localMileTrialsRemaining: computedTrials,
          }).catch(err => console.warn('Failed auto-syncing company job stats:', err));

          setCompany(prev => prev ? {
            ...prev,
            jobCount: computedJobCount,
            hasCreatedJob: true,
            localMileTrialsRemaining: computedTrials
          } : prev);
        }
      }
    });
    return () => unsubscribe();
  }, [company?.id, company?.jobCount, company?.localMileTrialsRemaining, company?.hasCreatedJob]);

  const { recentInvoices, olderInvoices } = useMemo(() => {
    if (!invoices || invoices.length === 0) return { recentInvoices: [], olderInvoices: [] };
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoffTime = oneYearAgo.getTime();

    const recent: Invoice[] = [];
    const older: Invoice[] = [];

    invoices.forEach(inv => {
      if (!inv.invoiceDate) {
        recent.push(inv);
        return;
      }
      const invTime = new Date(inv.invoiceDate).getTime();
      if (isNaN(invTime) || invTime >= cutoffTime) {
        recent.push(inv);
      } else {
        older.push(inv);
      }
    });

    return { recentInvoices: recent, olderInvoices: older };
  }, [invoices]);

  const displayedInvoices = showAllInvoices ? invoices : recentInvoices;
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [loadingBack, setLoadingBack] = useState(false);
  const [isLogNoteOpen, setIsLogNoteOpen] = useState(false);
  const [linkedVisitNote, setLinkedVisitNote] = useState<VisitNote | null>(null);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(false);

  // Cancellation Request Dialog State
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelMode, setCancelMode] = useState<'request' | 'cancel'>('request');
  
  // Onboarding Request state
  const [isOnboardingDialogOpen, setIsOnboardingDialogOpen] = useState(false);
  const [existingOnboardingRequest, setExistingOnboardingRequest] = useState<OnboardingRequest | null>(null);

  useEffect(() => {
    if (company?.id) {
      getOnboardingRequestByLeadId(company.id)
        .then(req => setExistingOnboardingRequest(req))
        .catch(err => console.error('Error fetching onboarding request for company:', err));
    }
  }, [company?.id]);

  // LPO.Plus Provisioning state & Suburb Validation
  const [isProvisioningLpoPlus, setIsProvisioningLpoPlus] = useState(false);
  const [lpoSuburbs, setLpoSuburbs] = useState<any[]>([]);
  const [loadingLpoSuburbs, setLoadingLpoSuburbs] = useState(false);

  const isLpoParentAccount = Boolean(
    company?.isParentLead ||
    company?.bucket === 'lpo_network' ||
    company?.bucket === 'lpo_plus' ||
    (company as any)?.source === 'LPO Lead Conversion' ||
    company?.leadSource === 'LPO Expressions of Interest' ||
    company?.lpoLeadId ||
    (company as any)?.linkedLpoLeadId
  );

  useEffect(() => {
    if (!company?.id || !isLpoParentAccount) return;

    async function checkLpoSuburbs() {
      setLoadingLpoSuburbs(true);
      try {
        const franchiseeRefs = new Set<string>();
        const parentLpoId = (company as any).ausPostParentLpoId || company.lpoLeadId || company.linkedLpoLeadId || company.id;
        const extractedSuburbs: any[] = [];

        if (company.franchisee_id) franchiseeRefs.add(String(company.franchisee_id));
        if ((company as any).franchiseeInternalId) franchiseeRefs.add(String((company as any).franchiseeInternalId));
        if ((company as any).franchisee) franchiseeRefs.add(String((company as any).franchisee));

        // Check linkedFranchisees array on company
        const linkedFrans = (company as any).linkedFranchisees;
        if (Array.isArray(linkedFrans)) {
          linkedFrans.forEach((lf: any) => {
            if (!lf) return;
            if (lf.franchiseeId) franchiseeRefs.add(String(lf.franchiseeId));
            if (lf.internalId) franchiseeRefs.add(String(lf.internalId));
            if (lf.id) franchiseeRefs.add(String(lf.id));
            if (lf.name) franchiseeRefs.add(String(lf.name));
            if (lf.franchiseeName) franchiseeRefs.add(String(lf.franchiseeName));

            let embedded = lf.ausPostSuburbsJson || lf.ausPostTerritoryJson || lf.suburbs;
            if (typeof embedded === 'string') {
              try { embedded = JSON.parse(embedded); } catch (e) {}
            }
            if (Array.isArray(embedded) && embedded.length > 0) {
              extractedSuburbs.push(...embedded);
            }
          });
        }

        // Check linkedFranchiseeIds array on company
        const linkedFranIds = (company as any).linkedFranchiseeIds;
        if (Array.isArray(linkedFranIds)) {
          linkedFranIds.forEach((id: any) => {
            if (id) franchiseeRefs.add(String(id));
          });
        }

        // Candidate parent IDs to match child companies / leads
        const parentIdSet = new Set<string>();
        if (company.id) parentIdSet.add(String(company.id));
        if ((company as any).internalId) parentIdSet.add(String((company as any).internalId));
        if ((company as any).prospectPlusId) parentIdSet.add(String((company as any).prospectPlusId));
        if (company.lpoLeadId) parentIdSet.add(String(company.lpoLeadId));
        if ((company as any).linkedLpoLeadId) parentIdSet.add(String((company as any).linkedLpoLeadId));
        if ((company as any).ausPostParentLpoId) parentIdSet.add(String((company as any).ausPostParentLpoId));
        if (parentLpoId) parentIdSet.add(String(parentLpoId));

        // Build queries across leads and companies collections
        const childQueries: any[] = [];
        for (const pId of Array.from(parentIdSet)) {
          childQueries.push(
            query(collection(firestore, 'leads'), where('parentLeadId', '==', pId)),
            query(collection(firestore, 'leads'), where('parentCompanyId', '==', pId)),
            query(collection(firestore, 'leads'), where('createdParentLeadId', '==', pId)),
            query(collection(firestore, 'leads'), where('ausPostParentLpoId', '==', pId)),
            query(collection(firestore, 'companies'), where('parentCompanyId', '==', pId)),
            query(collection(firestore, 'companies'), where('parentLeadId', '==', pId)),
            query(collection(firestore, 'companies'), where('createdParentLeadId', '==', pId)),
            query(collection(firestore, 'companies'), where('ausPostParentLpoId', '==', pId))
          );
        }

        const childSnaps = await Promise.all(childQueries.map(q => getDocs(q).catch(() => ({ docs: [] }))));

        childSnaps.forEach(snap => {
          snap.docs.forEach((docSnap: any) => {
            const d = docSnap.data();
            if (!d) return;
            
            if (d.franchisee_id) franchiseeRefs.add(String(d.franchisee_id));
            if (d.franchiseeInternalId) franchiseeRefs.add(String(d.franchiseeInternalId));
            if (d.franchisee) franchiseeRefs.add(String(d.franchisee));
            if (Array.isArray(d.linkedFranchiseeIds)) {
              d.linkedFranchiseeIds.forEach((id: any) => { if (id) franchiseeRefs.add(String(id)); });
            }
            if (Array.isArray(d.linkedFranchisees)) {
              d.linkedFranchisees.forEach((lf: any) => {
                if (!lf) return;
                if (lf.franchiseeId) franchiseeRefs.add(String(lf.franchiseeId));
                if (lf.internalId) franchiseeRefs.add(String(lf.internalId));
                if (lf.id) franchiseeRefs.add(String(lf.id));
                if (lf.name) franchiseeRefs.add(String(lf.name));
                if (lf.franchiseeName) franchiseeRefs.add(String(lf.franchiseeName));

                let embedded = lf.ausPostSuburbsJson || lf.ausPostTerritoryJson || lf.suburbs;
                if (typeof embedded === 'string') {
                  try { embedded = JSON.parse(embedded); } catch (e) {}
                }
                if (Array.isArray(embedded) && embedded.length > 0) {
                  extractedSuburbs.push(...embedded);
                }
              });
            }
          });
        });

        // Load all franchisees from franchisees collection
        const allFranchisees = await getAllFranchisees();

        for (const ref of Array.from(franchiseeRefs)) {
          if (!ref) continue;
          const cleanRef = String(ref).trim().toLowerCase();

          // Match franchisee document from franchisees collection
          const fData = allFranchisees.find(f => {
            if (!f) return false;
            return (
              String(f.id || '').trim().toLowerCase() === cleanRef ||
              String(f.internalId || '').trim().toLowerCase() === cleanRef ||
              String((f as any).prospectPlusId || '').trim().toLowerCase() === cleanRef ||
              String(f.name || '').trim().toLowerCase() === cleanRef ||
              String((f as any).code || '').trim().toLowerCase() === cleanRef
            );
          });

          if (fData) {
            let suburbs = fData.ausPostSuburbsJson || (fData as any).ausPostTerritoryJson || (fData as any).territoryJson || (fData as any).ausPostSuburbsRaw || (fData as any).custentity_ap_suburbs_json;
            if (typeof suburbs === 'string') {
              try { suburbs = JSON.parse(suburbs); } catch (e) {}
            }
            if (Array.isArray(suburbs) && suburbs.length > 0) {
              extractedSuburbs.push(...suburbs);
            }
          }
        }

        setLpoSuburbs(extractedSuburbs);
      } catch (err) {
        console.error('Error checking LPO franchisee suburbs:', err);
      } finally {
        setLoadingLpoSuburbs(false);
      }
    }

    checkLpoSuburbs();
  }, [company?.id, isLpoParentAccount]);

  const handleProvisionLpoPlus = async () => {
    if (!company || lpoSuburbs.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Suburbs Required',
        description: 'Linked franchisee does not have active Australia Post suburb mappings (ausPostSuburbsJson).'
      });
      return;
    }

    setIsProvisioningLpoPlus(true);
    try {
      const primaryContact = company.contacts?.find((c: any) => c.isPrimary) || company.contacts?.[0];
      const nameParts = (primaryContact?.name || company.companyName || 'LPO Contact').trim().split(' ');
      const firstName = primaryContact?.firstName || nameParts[0] || 'LPO';
      const lastName = primaryContact?.lastName || nameParts.slice(1).join(' ') || 'Contact';
      const email = primaryContact?.email || company.customerServiceEmail || '';
      const phone = primaryContact?.phone || company.customerPhone || '';

      const res = await fetch('/api/lpo-plus/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          netsuiteId: company.id, // Document ID matches Parent Lead / Company Doc ID in ProspectPlus!
          lpoName: company.companyName,
          contactFirstName: firstName,
          contactLastName: lastName,
          contactEmail: email,
          contactPhone: phone,
          defaultPassword: 'MailPlus2026!',
          address1: company.address?.address1 || '',
          street: company.address?.street || company.street || '',
          city: company.address?.city || company.city || '',
          state: company.address?.state || company.state || '',
          zip: company.address?.zip || company.zip || '',
          latitude: company.address?.lat ?? company.latitude ?? '',
          longitude: company.address?.lng ?? company.longitude ?? '',
          ampoRate: (company as any).ampoRate || '0',
          pmpoRate: (company as any).pmpoRate || '0',
          packageRate: (company as any).packageRate || '0',
          additionalBagRate: (company as any).additionalBagRate || '0',
          territorySuburbs: lpoSuburbs
        })
      });

      const data = await res.json();
      if (data.success) {
        const updatedFields = {
          lpoPlusStatus: 'Provisioned',
          defaultPassword: 'MailPlus2026!',
          lpoPlusProvisionedAt: new Date().toISOString(),
          status: 'LPO.Plus Access Sent' as LeadStatus
        };

        try {
          const compRef = doc(firestore, 'companies', company.id);
          const leadRef = doc(firestore, 'leads', company.id);
          await setDoc(compRef, updatedFields, { merge: true });

          try {
            const leadSnap = await getDoc(leadRef);
            if (leadSnap.exists()) {
              await updateDoc(leadRef, updatedFields);
            }
          } catch (e) {}

          await logActivity(
            company.id,
            {
              type: 'Update',
              notes: `LPO.Plus account created. Auth User (UID: ${data.authId}) and 'lpo' document (${company.id}) created in lpoconnect DB. Welcome email dispatched to ${email}.`,
              author: userProfile?.displayName || userProfile?.email || 'System User',
            },
            'companies'
          );
        } catch (clientErr) {
          console.warn('[LPO.Plus Client Sync Warning] Already provisioned on server:', clientErr);
        }

        setCompany(prev => ({ ...prev, ...updatedFields }));
        toast({
          title: 'LPO.Plus Account Created',
          description: `Auth user and documents created in LPO.Plus DB. Welcome email sent to ${email}.`,
        });
      } else {
        throw new Error(data.error || 'Provisioning failed');
      }
    } catch (err: any) {
      console.error('Error creating LPO.Plus account:', err);
      toast({
        variant: 'destructive',
        title: 'Provisioning Error',
        description: err.message || 'Failed to create LPO.Plus account.',
      });
    } finally {
      setIsProvisioningLpoPlus(false);
    }
  };
  const [isNotifyUpsellDialogOpen, setIsNotifyUpsellDialogOpen] = useState(false);
  const [isReqAddressDialogOpen, setIsReqAddressDialogOpen] = useState(false);

  // Franchisee Lookup State
  const [isFranchiseeLookupOpen, setIsFranchiseeLookupOpen] = useState(false);
  const [isLookingUpFranchisee, setIsLookingUpFranchisee] = useState(false);
  const [franchiseeMatches, setFranchiseeMatches] = useState<any[]>([]);
  const [showAllFranchiseesInLookup, setShowAllFranchiseesInLookup] = useState(false);
  const [lookupSearchQuery, setLookupSearchQuery] = useState('');

  // Franchisee & Operators state
  const [franchiseeDetails, setFranchiseeDetails] = useState<any | null>(null);
  const [loadingFranchisee, setLoadingFranchisee] = useState(false);
  const [operators, setOperators] = useState<any[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [isOperatorsModalOpen, setIsOperatorsModalOpen] = useState(false);
  const [isSuburbsModalOpen, setIsSuburbsModalOpen] = useState(false);
  const [operatorMap, setOperatorMap] = useState<Record<string, string>>({});
  const [checkingShipmateId, setCheckingShipmateId] = useState<string | null>(null);
  const [verifyingEmails, setVerifyingEmails] = useState<Record<string, boolean>>({});
  const autoVerifiedCompanyRef = useRef<Set<string>>(new Set());

  const handleManageAdditionalAddresses = () => {
    setIsAdditionalAddressDialogOpen(true);
  };

  const handleFranchiseeLookup = async () => {
      if (!canChangeFranchisee(company, userProfile, isSuperAdmin)) {
          toast({
              variant: 'destructive',
              title: 'Action Denied',
              description: 'For signed customers, only admins or superadmins can change the franchisee.'
          });
          return;
      }
      setIsLookingUpFranchisee(true);
      setFranchiseeMatches([]);
      setShowAllFranchiseesInLookup(false);
      setLookupSearchQuery('');
      setIsFranchiseeLookupOpen(true);
      try {
          const snap = await getDocs(collection(firestore, 'franchisees'));
          const franchisees = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
          const matches = franchisees.filter(f => {
              if (!f.territoryJson) return false;
              const companyCity = company.address?.city?.toLowerCase().trim();
              const companyState = company.address?.state?.toLowerCase().trim();
              const companyZip = company.address?.zip?.toLowerCase().trim();
              
              if (!companyCity || !companyState || !companyZip) return false;

              return f.territoryJson.some((t: any) => 
                  t.suburbs?.toLowerCase().trim() === companyCity &&
                  t.state?.toLowerCase().trim() === companyState &&
                  t.post_code?.toLowerCase().trim() === companyZip
              );
          });
          setFranchiseeMatches(matches);
      } catch (error) {
          toast({ variant: 'destructive', title: 'Lookup Error', description: 'Failed to fetch franchisees.' });
      } finally {
          setIsLookingUpFranchisee(false);
      }
  };

  const handleFranchiseeSelection = async (franchisee: any) => {
      if (!canChangeFranchisee(company, userProfile, isSuperAdmin)) {
          toast({
              variant: 'destructive',
              title: 'Action Denied',
              description: 'For signed customers, only admins or superadmins can change the franchisee.'
          });
          return;
      }
      try {
          const franchiseeId = String(franchisee.internalId || franchisee.id);
          const compRef = doc(firestore, 'companies', company.id);
          await updateDoc(compRef, { franchisee: franchisee.name, franchisee_id: franchiseeId });
          
          try {
              const leadRef = doc(firestore, 'leads', company.id);
              await updateDoc(leadRef, { franchisee: franchisee.name, franchisee_id: franchiseeId });
          } catch (_) {}

          setCompany(prev => ({ ...prev, franchisee: franchisee.name, franchisee_id: franchiseeId }));
          
          await sendCompanyCustomerUpdateToNetSuite({
              internalId: company.id,
              companyName: company.companyName || '',
              email: company.customerServiceEmail || '',
              phone: company.customerPhone || '',
              franchiseeId: franchiseeId,
              prospectPlusId: company.id,
              abn: (company as any).abn || '',
          });

          toast({ title: 'Franchisee Updated', description: `Customer mapped to ${franchisee.name} and synced with NetSuite.` });
          setIsFranchiseeLookupOpen(false);
      } catch (error) {
          toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to update customer franchisee.' });
      }
  };

  const handleVerifySingleEmail = async (contact: any) => {
    if (!contact.email) return;
    const normEmail = contact.email.toLowerCase().trim();
    setVerifyingEmails((prev) => ({ ...prev, [normEmail]: true }));

    try {
      const results = await verifyEmailsClient({
        emails: [contact.email],
        companyId: company.id,
        contactId: contact.id,
        forceRefresh: true,
      });

      if (results.length > 0) {
        const res = results[0];
        setCompany((prev) => ({
          ...prev,
          contacts: (prev.contacts || []).map((c: any) => {
            if ((c.email && c.email.toLowerCase().trim() === normEmail) || (contact.id && c.id === contact.id)) {
              return {
                ...c,
                verificationStatus: res.status,
                verificationScore: res.score,
                verifiedAt: res.verifiedAt,
              };
            }
            return c;
          }),
        }));

        toast({
          title: res.cached ? 'Verification Result (Cached)' : 'Email Verified',
          description: `${contact.email} is ${res.status.toUpperCase()} (${res.score}% deliverability score).`,
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: err.message || 'Could not verify email',
      });
    } finally {
      setVerifyingEmails((prev) => ({ ...prev, [normEmail]: false }));
    }
  };

  // Automatically verify unverified company contact emails in the background on load
  useEffect(() => {
    if (!company?.id || autoVerifiedCompanyRef.current.has(company.id)) return;

    const unverifiedContacts = (company.contacts || []).filter(
      (c: any) => c.email && c.email.includes('@') && (!c.verificationStatus || c.verificationStatus === 'unknown')
    );

    if (unverifiedContacts.length === 0) return;

    autoVerifiedCompanyRef.current.add(company.id);
    const emailList = unverifiedContacts.map((c: any) => (c.email as string).trim());

    setVerifyingEmails((prev) => {
      const next = { ...prev };
      emailList.forEach((e) => {
        next[e.toLowerCase()] = true;
      });
      return next;
    });

    verifyEmailsClient({
      emails: emailList,
      companyId: company.id,
      forceRefresh: false, // Check Firestore cache first for instant resolution & 0 API cost
    })
      .then((results) => {
        if (results && results.length > 0) {
          setCompany((prev) => ({
            ...prev,
            contacts: (prev.contacts || []).map((c: any) => {
              if (!c.email) return c;
              const norm = c.email.toLowerCase().trim();
              const match = results.find((r) => r.email.toLowerCase().trim() === norm);
              if (match) {
                return {
                  ...c,
                  verificationStatus: match.status,
                  verificationScore: match.score,
                  verifiedAt: match.verifiedAt,
                };
              }
              return c;
            }),
          }));
        }
      })
      .catch((err) => {
        console.warn('[CompanyProfile] Background email verification failed:', err);
      })
      .finally(() => {
        setVerifyingEmails((prev) => {
          const next = { ...prev };
          emailList.forEach((e) => {
            delete next[e.toLowerCase()];
          });
          return next;
        });
      });
  }, [company?.id, company?.contacts]);

  const [isEditingWebsite, setIsEditingWebsite] = useState(false);
  const [websiteValue, setWebsiteValue] = useState(initialCompany.websiteUrl || (initialCompany as any).website || '');
  const [isSavingWebsite, setIsSavingWebsite] = useState(false);

  const handleSaveWebsite = async (urlOverride?: string) => {
    const rawVal = (urlOverride !== undefined ? urlOverride : websiteValue).trim();
    if (!rawVal) {
      toast({ variant: 'destructive', title: 'No Website URL', description: 'Please enter a website URL to save.' });
      return;
    }
    let formattedUrl = rawVal;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setIsSavingWebsite(true);
    try {
      const compRef = doc(firestore, 'companies', company.id);
      const leadRef = doc(firestore, 'leads', company.id);
      await Promise.all([
        setDoc(compRef, { websiteUrl: formattedUrl, website: formattedUrl, updatedAt: new Date().toISOString() }, { merge: true }),
        setDoc(leadRef, { websiteUrl: formattedUrl, website: formattedUrl, updatedAt: new Date().toISOString() }, { merge: true }),
      ]);

      setCompany(prev => ({ ...prev, websiteUrl: formattedUrl, website: formattedUrl } as any));
      setWebsiteValue(formattedUrl);
      setIsEditingWebsite(false);

      toast({
        title: 'Website URL Saved to Record',
        description: `Saved "${formattedUrl}" under websiteUrl field.`,
      });
    } catch (error: any) {
      console.error('Failed to update websiteUrl:', error);
      toast({
        variant: 'destructive',
        title: 'Error Saving Website',
        description: error?.message || 'Failed to save website URL.',
      });
    } finally {
      setIsSavingWebsite(false);
    }
  };

  const handleCheckShipmateStatus = async (contact: any) => {
    if (!contact.email) return;
    setCheckingShipmateId(contact.id);
    try {
      const res = await fetch('/api/contacts/check-shipmate-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: company.id,
          parentType: 'companies',
          contactId: contact.id,
          email: contact.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to check ShipMate status');
      }

      setCompany(prev => ({
        ...prev,
        contacts: prev.contacts?.map(c =>
          c.id === contact.id
            ? {
                ...c,
                accessToShipMate: data.accessToShipMate,
                accountActivated: data.accountActivated,
                createPasswordEmailSent: data.createPasswordEmailSent,
                shipmateStatus: data.shipmateStatus,
                shipmateCheckedAt: data.shipmateCheckedAt,
              }
            : c
        ),
      }));

      if (data.accountActivated) {
        toast({
          title: 'ShipMate Account Activated',
          description: `${contact.name} (${contact.email}) has an active ShipMate portal account.`,
        });
      } else if (data.createPasswordEmailSent) {
        toast({
          title: 'Not Activated (Password Setup Email Sent)',
          description: `${contact.name} (${contact.email}) has NOT activated their account, but HAS received the password setup email.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Not Activated (Password Email Not Received)',
          description: `${contact.name} (${contact.email}) has NOT activated their account and has NOT received the password setup email.`,
        });
      }
    } catch (err: any) {
      console.error('Error checking ShipMate status:', err);
      toast({
        variant: 'destructive',
        title: 'Check Failed',
        description: err.message || 'Could not verify ShipMate portal status.',
      });
    } finally {
      setCheckingShipmateId(null);
    }
  };

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

  const [dialerInsightsOpen, setDialerInsightsOpen] = useState(false);
  const [pendingDialData, setPendingDialData] = useState<DialerInsightsData | null>(null);

  const executeCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    window.open(`aircall:${phoneNumber}`);
    logActivity(company.id, { 
        type: 'Call', 
        notes: `Initiated call to ${phoneNumber} via AirCall app.`,
        author: user?.displayName || 'Unknown',
        email: user?.email || undefined,
        aircallStatus: 'initiated'
    }, 'companies');
  };

  const handleInitiateCall = (phoneNumber: string) => {
    if (!phoneNumber) return;

    const opener = company.suggestedOpener || company.discoveryData?.suggestedOpener || (company as any)['Suggessted Opener'] || (company as any)['Suggested Opener'];
    const personalisation = company.suggestedPersonalisation || company.discoveryData?.suggestedPersonalisation || (company as any)['Suggested Personalisation'];
    const apRel = company.apRelationship || company.discoveryData?.apRelationship || (company as any)['AP Relationship'] || (company as any)['AP Relationship '];

    const hasInsights = Boolean(
      (opener && opener.trim().length > 0) ||
      (personalisation && personalisation.trim().length > 0) ||
      (apRel && apRel.trim().length > 0)
    );

    if (!hasInsights) {
      executeCall(phoneNumber);
    } else {
      setPendingDialData({
        leadId: company.id,
        companyName: company.companyName,
        phoneNumber,
        suggestedOpener: opener,
        suggestedPersonalisation: personalisation,
        apRelationship: apRel
      });
      setDialerInsightsOpen(true);
    }
  };



  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = parseDateString(dateStr);
    return date && isValid(date) ? format(date, 'MMM d, yyyy') : '-';
  };

  const DetailItem = ({ icon: Icon, label, value, copyable, isLink, linkUrl, isWebsite, callable, leadId, emailClickable, actionIcon: ActionIcon, onActionClick, isActionLoading, actionClassName }: any) => {
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
                    userProfile?.activeRole === 'user' ? (
                        <span className="text-sm font-semibold text-foreground text-left">{value}</span>
                    ) : (
                        <a href={`mailto:${value}`} className="text-sm font-semibold text-primary hover:underline text-left">
                            {value}
                        </a>
                    )
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
                
                {ActionIcon && onActionClick && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-5 w-5 ml-1 ${actionClassName || 'text-muted-foreground hover:text-foreground'}`}
                        onClick={onActionClick}
                        disabled={isActionLoading}
                    >
                        {isActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ActionIcon className="h-3.5 w-3.5" />}
                    </Button>
                )}

                {copyable && value && (
                    <CopyButton
                        textToCopy={value}
                        size="icon"
                        className="h-5 w-5"
                        iconClassName="h-3.5 w-3.5"
                    />
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
              {company.bucket === 'lpo_network' && (
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">LPO Network</Badge>
              )}
              {company.bucket === 'inbound' && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Inbound</Badge>
              )}
              {(company.bucket === 'outbound' || (!company.bucket && company.bucket !== 'lpo_network' && !company.fieldSales)) && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Outbound</Badge>
              )}
              {(company.bucket === 'field_sales' || (!company.bucket && company.fieldSales)) && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Field Sales</Badge>
              )}
              {company.bucket === 'multisite' && (
                  <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300">MultiSite</Badge>
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
            
            {(() => {
                const actualJobCount = localMileJobs.length > 0 ? localMileJobs.length : (company.jobCount || 0);
                const validJobsCount = localMileJobs.filter(j => j.status !== 'recredited' && j.status !== 'cancelled').length;
                const actualTrialsRemaining = localMileJobs.length > 0 ? Math.max(0, 5 - validJobsCount) : (company.localMileTrialsRemaining ?? 5);
                const hasJobs = company.hasCreatedJob === true || String(company.hasCreatedJob) === 'true' || actualJobCount > 0;

                if (!hasJobs && company.localMileTrialsRemaining === undefined && !company.status?.includes('LocalMile') && !company.customerStatus?.includes('LocalMile') && company.jobCount === undefined && !company.lastLocalMileJobCreatedAt) {
                    return null;
                }

                return (
                    <div className="flex wrap items-center gap-x-2 gap-y-1 mt-2">
                        {hasJobs ? (
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" title={`First job created on ${company.firstJobCreatedAt ? new Date(company.firstJobCreatedAt).toLocaleDateString() : 'N/A'}`}>
                                Jobs Created: {actualJobCount}
                            </Badge>
                        ) : (
                            company.status === 'LocalMile Pending' && (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
                                    Pending First Job
                                </Badge>
                            )
                        )}
                        <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200">
                            Trials Remaining: {actualTrialsRemaining}
                        </Badge>
                        {company.lastLocalMileJobCreatedAt && (
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200">
                                Last Job: {safeFormatDate(company.lastLocalMileJobCreatedAt, 'MMM d, h:mm a')}
                            </Badge>
                        )}
                    </div>
                );
            })()}
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
          {(() => {
            const isSignedUp = (company.status as string) === 'Signed' || (company.customerStatus as string) === 'Signed' || company.status === 'Won' || company.customerStatus === 'Won' || (company.status as string) === 'Active' || (company.customerStatus as string) === 'Active' || company.lpoPlusStatus === 'Provisioned' || Boolean(company.defaultPassword);
            if (!isLpoParentAccount || !isSignedUp) return null;

            return (
              <Card className="border-[#095c7b]/30 bg-gradient-to-r from-slate-50 via-sky-50/20 to-white shadow-sm">
              <CardHeader className="pb-3 border-b border-[#095c7b]/10 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-[#095c7b] flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#095c7b]" />
                    LPO.PLUS Account & Access Credentials
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    LPO.PLUS Portal access and sign-in details for this participating LPO contact.
                  </p>
                </div>
                {company.lpoPlusStatus === 'Provisioned' || company.defaultPassword ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold px-2.5 py-1">
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> LPO.Plus Access Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-semibold px-2.5 py-1">
                    Not Created Yet
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="pt-4">
                {company.lpoPlusStatus === 'Provisioned' || company.defaultPassword ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-3.5 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                          Portal Sign-In URL
                        </span>
                        <a
                          href="https://lpo.plus/signin"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#095c7b] hover:underline flex items-center gap-1 mt-0.5"
                        >
                          https://lpo.plus/signin <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      </div>

                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                          Username (Email)
                        </span>
                        <span className="text-xs font-semibold text-foreground mt-0.5 block">
                          {company.contacts?.[0]?.email || company.customerServiceEmail || 'N/A'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                          Default Password
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                          {company.defaultPassword || 'MailPlus2026!'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-slate-500 italic">
                        Account created in <code>lpoconnect</code> DB (Doc ID: <strong>{company.id}</strong>).
                      </p>
                      <CopyButton
                        textToCopy={`Portal: https://lpo.plus/signin\nUsername: ${company.contacts?.[0]?.email || company.customerServiceEmail || ''}\nPassword: ${company.defaultPassword || 'MailPlus2026!'}`}
                        label="Copy Sign-in Details"
                        variant="outline"
                        size="sm"
                        className="border-[#095c7b]/30 text-[#095c7b] hover:bg-[#095c7b]/5"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loadingLpoSuburbs ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#095c7b]" />
                        Checking linked franchisee Australia Post suburb mappings...
                      </div>
                    ) : lpoSuburbs.length === 0 ? (
                      <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900 py-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="font-bold text-xs uppercase tracking-wider text-amber-900">
                          Cannot Create LPO.Plus Account
                        </AlertTitle>
                        <AlertDescription className="text-xs text-amber-800 mt-1">
                          The linked franchisee(s) do not have active Australia Post suburb mappings (<code>ausPostSuburbsJson</code>) assigned. Please assign Australia Post suburb mappings to the franchisee first before creating the LPO.Plus account.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                        <div>
                          <p className="text-xs text-slate-700 font-medium">
                            Ready to create LPO.Plus Account with <strong>{lpoSuburbs.length}</strong> Australia Post suburb mapping(s) from linked franchisee(s).
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Document ID in <code>lpoconnect</code> database will match Parent Lead ID: <strong>{company.id}</strong>.
                          </p>
                        </div>
                        <Button
                          onClick={handleProvisionLpoPlus}
                          disabled={isProvisioningLpoPlus}
                          className="bg-[#095c7b] hover:bg-[#053647] text-white font-bold text-sm shadow-sm shrink-0"
                        >
                          {isProvisioningLpoPlus ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating LPO.Plus Account...
                            </>
                          ) : (
                            <>
                              <Key className="w-4 h-4 mr-2 text-[#EAF044]" />
                              Create LPO.Plus Account
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })()}

          <Card>
             <CardHeader className="pb-4 border-b">
                <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-muted-foreground" />Company Details</CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="space-y-8">
                        <DetailItem icon={Key} label="Customer ID" value={company.entityId} copyable />
                        <DetailItem icon={Hash} label="NetSuite Internal ID" value={(company as any).internalid || company.salesRecordInternalId} copyable />
                        <DetailItem icon={CalendarIcon} label={getLeadDisplayDateLabel(company)} value={formatDate(getLeadDisplayDateValue(company))} />
                        {isEditingWebsite ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Globe className="h-4 w-4" />
                                    <span className="text-[11px] font-medium uppercase tracking-wider">Website URL</span>
                                </div>
                                <div className="flex items-center gap-2 min-h-[1.5rem]">
                                    <Input
                                        value={websiteValue}
                                        onChange={(e) => setWebsiteValue(e.target.value)}
                                        placeholder="https://example.com"
                                        className="h-8 flex-1 text-xs bg-white"
                                        disabled={isSavingWebsite}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                        onClick={() => handleSaveWebsite()}
                                        disabled={isSavingWebsite}
                                    >
                                        {isSavingWebsite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                        onClick={() => {
                                            setIsEditingWebsite(false);
                                            setWebsiteValue(company.websiteUrl || '');
                                        }}
                                        disabled={isSavingWebsite}
                                    >
                                        <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <DetailItem
                                icon={Globe}
                                label="Website"
                                value={company.websiteUrl}
                                isWebsite
                                actionIcon={Edit}
                                onActionClick={() => {
                                    setIsEditingWebsite(true);
                                    setWebsiteValue(company.websiteUrl || '');
                                }}
                                actionClassName="text-primary hover:text-primary/80 hover:bg-primary/5 h-6 w-6"
                            />
                        )}
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
                                <DetailItem 
                                    icon={Tag} 
                                    label="Franchisee Name" 
                                    value={franchiseeDetails?.name || company.franchisee || 'Unassigned'} 
                                    actionIcon={canChangeFranchisee(company, userProfile, isSuperAdmin) ? Search : undefined}
                                    onActionClick={canChangeFranchisee(company, userProfile, isSuperAdmin) ? handleFranchiseeLookup : undefined}
                                    isActionLoading={isLookingUpFranchisee}
                                    actionClassName="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                />
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
                            <div key={contact.id} className="p-3 border rounded-md text-sm space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold">{contact.name}</p>
                                        <p className="text-xs text-muted-foreground">{contact.title}</p>
                                    </div>
                                    {contact.email && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 px-2 shrink-0 flex items-center gap-1"
                                            disabled={checkingShipmateId === contact.id}
                                            onClick={() => handleCheckShipmateStatus(contact)}
                                        >
                                            {checkingShipmateId === contact.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                                            )}
                                            Check ShipMate
                                        </Button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {contact.isPrimary && (
                                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 py-0 h-4 font-bold">Primary</Badge>
                                    )}
                                    {contact.shipmateStatus === 'Activated' ? (
                                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 py-0 h-4 font-semibold">ShipMate Activated</Badge>
                                    ) : contact.shipmateStatus === 'Password Sent' ? (
                                        <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-300 py-0 h-4 font-semibold">ShipMate Password Sent (Not Activated)</Badge>
                                    ) : contact.shipmateStatus === 'No Access' ? (
                                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 py-0 h-4 font-semibold">ShipMate Not Activated & No Email</Badge>
                                    ) : contact.accessToShipMate === 'yes' ? (
                                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 py-0 h-4">ShipMate Access</Badge>
                                    ) : null}
                                </div>

                                <div className="space-y-1.5 pt-1 border-t text-xs">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span>{contact.email}</span>
                                        </div>
                                        {contact.email && (
                                            <EmailVerificationBadge
                                                status={contact.verificationStatus}
                                                score={contact.verificationScore}
                                                verifiedAt={contact.verifiedAt}
                                                onVerify={() => handleVerifySingleEmail(contact)}
                                                loading={!!verifyingEmails[contact.email?.toLowerCase().trim()]}
                                                size="sm"
                                            />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{contact.phone} <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => handleInitiateCall(contact.phone)}><PhoneCall className="h-3 w-3" /></Button></div>
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
                        
                        <Button 
                            variant="outline" 
                            className="w-full bg-sidebar-accent/20 border-none hover:bg-sidebar-accent/30 text-foreground font-medium py-6 rounded-full" 
                            onClick={() => {
                                if (canEditSignedCustomerAddress(userProfile, isSuperAdmin)) {
                                    setIsAddressDialogOpen(true);
                                } else {
                                    setIsReqAddressDialogOpen(true);
                                }
                            }}
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            {canEditSignedCustomerAddress(userProfile, isSuperAdmin) ? 'Edit Site Address' : 'Request Address Change'}
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
                    {['user', 'Customer Success', 'customer success', 'Customer Service', 'customer service'].includes(userProfile?.activeRole || '') && company.bucket !== 'lpo_network' && (
                        <Button className="w-full justify-start bg-background hover:bg-muted font-medium text-emerald-700 border-emerald-200" variant="outline" onClick={() => setIsNotifyUpsellDialogOpen(true)}>
                            <TrendingUp className="mr-2 h-4 w-4" />Notify AM for Upsell
                        </Button>
                    )}
                    <Button className="w-full justify-start bg-background hover:bg-muted font-medium text-primary border-primary/20" variant="outline" onClick={() => setIsOnboardingDialogOpen(true)}>
                        <CalendarCheck className="mr-2 h-4 w-4 text-primary" />Organise Onboarding Request
                    </Button>
                    <Button className="w-full justify-start bg-background hover:bg-muted" variant="outline" onClick={() => setIsLogNoteOpen(true)}>
                        <ClipboardEdit className="mr-2 h-4 w-4" />Log a Note
                    </Button>
                    {company.status !== 'Lost Customer' ? (
                        <>
                            {company.bucket !== 'lpo_network' && (
                                <Button 
                                    className="w-full justify-start bg-background hover:bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300 font-medium" 
                                    variant="outline" 
                                    onClick={() => {
                                        setCancelMode('request');
                                        setIsCancelDialogOpen(true);
                                    }}
                                >
                                    <FileX className="mr-2 h-4 w-4 text-amber-600" />
                                    Request Cancellation
                                </Button>
                            )}
                            {isAdmin && (
                                <Button 
                                    className="w-full justify-start bg-background hover:bg-destructive/10 text-destructive border-destructive/20 hover:border-destructive/30 font-medium" 
                                    variant="outline" 
                                    onClick={() => {
                                        setCancelMode('cancel');
                                        setIsCancelDialogOpen(true);
                                    }}
                                >
                                    <FileX className="mr-2 h-4 w-4 text-destructive" />
                                    Cancel Customer Directly
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="text-xs text-center py-1.5 px-3 bg-muted rounded-lg text-muted-foreground border">
                            Customer status: Lost Customer
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileDigit className="w-5 h-5 text-muted-foreground" />Invoices</CardTitle></CardHeader>
                <CardContent>
                    {loadingInvoices ? <Loader /> : displayedInvoices.length > 0 ? (
                        <div className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayedInvoices.map(inv => (
                                        <React.Fragment key={inv.id}>
                                            <TableRow>
                                                <TableCell>{inv.invoiceDate ? safeFormatDate(inv.invoiceDate, 'PP') : 'N/A'}</TableCell>
                                                <TableCell className="font-medium">{inv.invoiceDocumentID || inv.documentId}</TableCell>
                                                <TableCell>
                                                    {(() => {
                                                        const statusStr = inv.invoiceStatus || inv.status;
                                                        if (!statusStr) return <span className="text-xs text-muted-foreground">-</span>;
                                                        const lower = statusStr.toLowerCase();
                                                        let badgeClass = "bg-slate-50 text-slate-700 border-slate-200";
                                                        if (lower.includes('paid')) {
                                                            badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                                        } else if (lower.includes('overdue')) {
                                                            badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                                                        } else if (lower.includes('open') || lower.includes('unpaid') || lower.includes('pending')) {
                                                            badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                                                        }
                                                        return (
                                                            <Badge variant="outline" className={`text-[11px] font-medium ${badgeClass}`}>
                                                                {statusStr}
                                                            </Badge>
                                                        );
                                                    })()}
                                                </TableCell>
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
                                            {inv.items && inv.items.length > 0 && (
                                                <TableRow key={`${inv.id}-items`} className="bg-slate-50/50 hover:bg-slate-50/50">
                                                    <TableCell colSpan={5} className="py-2 pl-8 pr-4">
                                                        <div className="text-xs font-semibold text-slate-700 mb-1">Line Items:</div>
                                                        <div className="rounded-md border border-slate-200 overflow-hidden bg-white">
                                                            <Table className="text-xs">
                                                                <TableHeader className="bg-slate-100/70">
                                                                    <TableRow>
                                                                        <TableHead className="h-7 text-xs font-semibold text-slate-600">Service</TableHead>
                                                                        <TableHead className="h-7 text-xs font-semibold text-slate-600 text-right">Rate</TableHead>
                                                                        <TableHead className="h-7 text-xs font-semibold text-slate-600 text-center">Qty</TableHead>
                                                                        <TableHead className="h-7 text-xs font-semibold text-slate-600 text-right">Amount</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {inv.items.map((item, idx) => (
                                                                        <TableRow key={idx} className="h-7 border-slate-100">
                                                                            <TableCell className="py-1 font-medium">{item.service}</TableCell>
                                                                            <TableCell className="py-1 text-right">${Number(item.rate).toFixed(2)}</TableCell>
                                                                            <TableCell className="py-1 text-center">{item.qty}</TableCell>
                                                                            <TableCell className="py-1 text-right font-medium">${Number(item.totalAmount).toFixed(2)}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                            {olderInvoices.length > 0 && (
                                <div className="pt-2 flex justify-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowAllInvoices(!showAllInvoices)}
                                        className="text-xs font-medium gap-1.5"
                                    >
                                        <History className="h-3.5 w-3.5" />
                                        {showAllInvoices ? 'Show Last 1 Year Only' : `Show Older Invoices (${olderInvoices.length})`}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : <div className="text-center py-10 text-muted-foreground">No invoices found.</div>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-muted-foreground" />History</CardTitle></CardHeader>
                <CardContent>
                    <Tabs defaultValue="notes">
                        <TabsList>
                            <TabsTrigger value="notes">Notes ({sortedNotes.length})</TabsTrigger>
                            <TabsTrigger value="calls">Calls ({sortedCalls.length})</TabsTrigger>
                            <TabsTrigger value="activity">Activity ({sortedActivities.length})</TabsTrigger>
                            <TabsTrigger value="emails">Emails ({sortedEmails.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="notes" className="space-y-4 pt-4">
                            {sortedNotes.map(note => (
                                <div key={note.id} className="text-sm border-l-2 pl-4 py-1 border-primary/40">
                                    <p className="whitespace-pre-wrap">{note.content}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{safeFormatDate(note.date, 'PPpp')} by {note.author}</p>
                                </div>
                            ))}
                            {sortedNotes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No notes found.</p>}
                        </TabsContent>
                        <TabsContent value="calls" className="space-y-3 pt-4">
                            {sortedCalls.map(call => (
                                <div key={call.id} className="text-sm border-b pb-3 last:border-b-0 space-y-1">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <p className="font-medium text-foreground">{call.notes}</p>
                                            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-0.5">
                                                {call.author && <span>By: {call.author}</span>}
                                                {call.callId && <span>• AirCall ID: <code className="bg-muted px-1 rounded font-mono text-[10px]">{call.callId}</code></span>}
                                                {call.duration && <span>• Duration: {call.duration}</span>}
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0 text-right">
                                            {safeFormatDate(call.date, 'PPpp')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {sortedCalls.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No calls found.</p>}
                        </TabsContent>
                        <TabsContent value="activity" className="space-y-2 pt-4">
                            {sortedActivities.map(a => (
                                <div key={a.id} className="text-xs flex justify-between border-b pb-2 last:border-b-0 gap-4">
                                    <span className="font-medium text-foreground">{a.notes}</span>
                                    <span className="text-muted-foreground shrink-0">{safeFormatDate(a.date, 'PPpp')}</span>
                                </div>
                            ))}
                            {sortedActivities.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activity found.</p>}
                        </TabsContent>
                        <TabsContent value="emails" className="space-y-4 pt-4">
                            {sortedEmails.map(email => (
                                <div key={email.id} className="text-sm border-b pb-2 flex justify-between items-start gap-4">
                                    <div>
                                        <p className="font-medium">{email.subject}</p>
                                        <p className="text-xs text-muted-foreground">{safeFormatDate(email.sentAt || (email as any).date, 'PPpp')} to {email.recipient}</p>
                                    </div>
                                </div>
                            ))}
                            {sortedEmails.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No emails sent yet.</p>}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
    


    <CancelCustomerDialog
        isOpen={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        lead={company}
        mode={cancelMode}
        onSuccess={(updates) => {
            if (updates) {
                setCompany(prev => ({ ...prev, ...updates }));
            }
        }}
    />

    <MapModal isOpen={!!selectedAddress} onClose={() => setSelectedAddress(null)} address={selectedAddress || ''} />
    <LogNoteDialog lead={company} onNoteLogged={handleNoteLoggedAndClose} isOpen={isLogNoteOpen} onOpenChange={setIsLogNoteOpen} />
    <EditAddressDialog lead={company} isOpen={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen} onLeadUpdated={(updates) => setCompany(prev => ({ ...prev, ...updates }))} />
    <RequestAddressChangeDialog company={company} isOpen={isReqAddressDialogOpen} onOpenChange={setIsReqAddressDialogOpen} />
    <NotifyUpsellDialog company={company} isOpen={isNotifyUpsellDialogOpen} onOpenChange={setIsNotifyUpsellDialogOpen} />
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
                                  {(() => {
                                    const sec = item.secondary_op;
                                    if (!sec) return '-';
                                    if (Array.isArray(sec)) {
                                      return sec.map((op: any) => typeof op === 'object' && op !== null ? (op.name || op.franchisee || op.id || JSON.stringify(op)) : (operatorMap[String(op)] || op)).join(', ') || '-';
                                    }
                                    if (typeof sec === 'object') {
                                      return (sec as any).name || (sec as any).franchisee || JSON.stringify(sec);
                                    }
                                    return operatorMap[String(sec)] || String(sec);
                                  })()}
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
      <OrganiseOnboardingDialog
        open={isOnboardingDialogOpen}
        onOpenChange={setIsOnboardingDialogOpen}
        lead={company}
        onSuccess={() => {
          if (company?.id) {
            getOnboardingRequestByLeadId(company.id).then(req => setExistingOnboardingRequest(req));
          }
        }}
      />

    <Dialog open={isFranchiseeLookupOpen} onOpenChange={setIsFranchiseeLookupOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Territory Franchisee Lookup
                </DialogTitle>
                <DialogDescription>
                    Automated territory lookup based on company site address ({company.address?.city || 'No City'}, {company.address?.state || 'No State'} {company.address?.zip || 'No Zip'}).
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
                {isLookingUpFranchisee ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2 text-sm text-muted-foreground">Matching territory...</span>
                    </div>
                ) : (
                    <>
                        {franchiseeMatches.length > 0 && !showAllFranchiseesInLookup && (
                            <div className="space-y-3">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Matched Territory Franchisee(s)
                                </Label>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                    {franchiseeMatches.map((f: any) => (
                                        <div 
                                            key={f.id} 
                                            className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-colors"
                                            onClick={() => handleFranchiseeSelection(f)}
                                        >
                                            <div>
                                                <div className="font-semibold text-sm">{f.name}</div>
                                                <div className="text-xs text-muted-foreground">ID: {f.internalId || f.id} • {f.mainContact || 'No contact'}</div>
                                            </div>
                                            <Button size="sm" variant="secondary">Select</Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {franchiseeMatches.length === 0 && !showAllFranchiseesInLookup && (
                            <div className="text-center py-6 border rounded-lg bg-muted/20 space-y-2">
                                <p className="text-sm font-medium text-destructive">No exact territory match found</p>
                                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                                    No franchisee territory matched postcode {company.address?.zip || 'N/A'}. You can browse all franchisees below.
                                </p>
                            </div>
                        )}

                        <div className="pt-2 border-t flex flex-col gap-2">
                            <Button 
                                type="button"
                                variant="outline" 
                                size="sm"
                                className="w-full text-xs"
                                onClick={async () => {
                                    if (!showAllFranchiseesInLookup) {
                                        setShowAllFranchiseesInLookup(true);
                                        if (franchiseeMatches.length === 0) {
                                            const snap = await getDocs(collection(firestore, 'franchisees'));
                                            setFranchiseeMatches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
                                        }
                                    } else {
                                        setShowAllFranchiseesInLookup(false);
                                    }
                                }}
                            >
                                {showAllFranchiseesInLookup ? 'Show Matched Territory Only' : 'Search / Select From All Franchisees'}
                            </Button>

                            {showAllFranchiseesInLookup && (
                                <div className="space-y-3 pt-2">
                                    <Input
                                        placeholder="Search franchisee by name or ID..."
                                        value={lookupSearchQuery}
                                        onChange={(e) => setLookupSearchQuery(e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                        {franchiseeMatches
                                            .filter(f => !lookupSearchQuery || f.name?.toLowerCase().includes(lookupSearchQuery.toLowerCase()) || String(f.internalId || f.id).includes(lookupSearchQuery))
                                            .map((f: any) => (
                                                <div 
                                                    key={f.id} 
                                                    className="flex items-center justify-between p-2.5 border rounded-lg hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-colors text-xs"
                                                    onClick={() => handleFranchiseeSelection(f)}
                                                >
                                                    <div>
                                                        <div className="font-semibold">{f.name}</div>
                                                        <div className="text-[11px] text-muted-foreground">ID: {f.internalId || f.id}</div>
                                                    </div>
                                                    <Button size="sm" variant="ghost" className="h-7 text-xs">Assign</Button>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsFranchiseeLookupOpen(false)}>Cancel</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <DialerInsightsDialog
      open={dialerInsightsOpen}
      onOpenChange={setDialerInsightsOpen}
      data={pendingDialData}
      onConfirmDial={() => {
        if (pendingDialData) {
          executeCall(pendingDialData.phoneNumber || '');
        }
      }}
    />
    </>
  )
}
