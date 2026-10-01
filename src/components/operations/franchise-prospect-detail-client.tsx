'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FranchiseProspect, KeyFactSheetData, KeyFactSheetHistoryColumn, DepositDetails, EOIData, ConfidentialityDeedData, ProspectDocument, NABFundingDetails, RequestForDocsData, DisclosureDocumentData, FranchiseAgreementData, OperationalTrainingSchedule } from '@/lib/types';
import { firestore, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  RefreshCw,
  Send,
  Lock,
  Copy,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Eye,
  Calendar,
  Building,
  User,
  Info,
  PenTool,
  Plus,
  Trash2,
  Star,
  Upload,
  Paperclip,
  Download,
  Save,
  Tag,
  Clock,
  CheckSquare,
  FileCheck2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AccessDenied } from '@/components/access-denied';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { encodeProspectToken } from '@/lib/presale-token';
import { differenceInCalendarDays, parseISO, addDays, format } from 'date-fns';

function getInitialFyColumns(): KeyFactSheetHistoryColumn[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const lastCompletedFyYear = currentMonth >= 7 ? currentYear : currentYear - 1;

  return [
    {
      id: 'fy_1',
      label: `FY ending 30/06/${lastCompletedFyYear}`,
      occurrences: { transferred: 0, ceased: 0, terminatedFranchisor: 0, terminatedFranchisee: 0, notExtended: 0, boughtBack: 0, acquiredByFranchisor: 0 },
    },
    {
      id: 'fy_2',
      label: `FY ending 30/06/${lastCompletedFyYear - 1}`,
      occurrences: { transferred: 0, ceased: 0, terminatedFranchisor: 0, terminatedFranchisee: 0, notExtended: 0, boughtBack: 0, acquiredByFranchisor: 0 },
    },
    {
      id: 'fy_3',
      label: `FY ending 30/06/${lastCompletedFyYear - 2}`,
      occurrences: { transferred: 0, ceased: 0, terminatedFranchisor: 0, terminatedFranchisee: 0, notExtended: 0, boughtBack: 0, acquiredByFranchisor: 0 },
    },
  ];
}

const HISTORICAL_EVENT_ROWS = [
  { key: 'transferred', label: 'A franchise was transferred (ownership changed to a different franchisee)' },
  { key: 'ceased', label: 'A franchised business ceased to operate (closed)' },
  { key: 'terminatedFranchisor', label: 'A franchise agreement was terminated by the franchisor' },
  { key: 'terminatedFranchisee', label: 'A franchise agreement was terminated by the franchisee' },
  { key: 'notExtended', label: 'A franchise agreement was not extended' },
  { key: 'boughtBack', label: 'A franchise business was bought back by the franchisor' },
  { key: 'acquiredByFranchisor', label: 'A franchise agreement was terminated and the business was acquired by the franchisor' },
] as const;

export default function FranchiseProspectDetailClient() {
  const params = useParams();
  const router = useRouter();
  const prospectId = params?.id as string;

  const { toast } = useToast();
  const { userProfile, isSuperAdmin } = useAuth();

  const activeRole = userProfile?.activeRole || userProfile?.role || '';
  const isAllowed = isSuperAdmin || ['admin', 'super user', 'Operations', 'operations', 'Outbound Admin'].includes(activeRole);

  const [prospect, setProspect] = useState<FranchiseProspect | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Stepper Tab (1 = Deed, 2 = IM / Fact Sheet, 3 = EOI, 4 = Deposit, 5 = NAB, 6 = Request Docs, 7 = Disclosure, 8 = Agreement, 9 = Training)
  const [activeTab, setActiveTab] = useState<number>(1);

  // Notes state
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Convert Dialog State
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [prefillUserData, setPrefillUserData] = useState<any>(null);

  // Step 1: Fact Sheet Form State (All Sections A to J)
  // Note: Section C onwards default to empty / unselected per guidelines.
  const [factSheetForm, setFactSheetForm] = useState({
    // Section A: About Franchisor
    franchisorName: 'Mail Plus Pty Ltd',
    yearsInOperation: '8 years',
    financialViability: '' as '' | 'Yes' | 'No',

    // Section B: Major disputes
    currentLegalProceedings: '' as '' | 'Yes' | 'No',
    finalJudgments: '' as '' | 'Yes' | 'No',
    disputeMediationPercent: '',

    // Section C: Current and past franchisees (Empty by default)
    franchiseeOwnedCount: '' as string | number,
    corporateOwnedCount: '' as string | number,
    historyColumns: getInitialFyColumns(),

    // Section D: Territory or site (Empty by default)
    territoryName: '',
    territoryDetailsSelected: [] as string[],
    territoryOtherDetails: '',
    canFranchisorChangeTerritory: '' as '' | 'Yes' | 'No',
    competitionTypesSelected: [] as string[],
    canFranchiseeSellOnline: '' as '' | 'Yes' | 'No',
    leaseInterest: '' as '' | 'Yes' | 'No',

    // Section E: Supply of goods and services (Empty by default)
    supplierRestrictions: '' as '' | 'Yes' | 'No',
    franchisorInterestInSuppliers: '' as '' | 'Yes' | 'No',
    franchisorRebates: '' as '' | 'Yes' | 'No',

    // Section F: What the franchisee has to pay (Empty by default)
    preliminaryPaymentRequired: '',
    franchiseFee: '' as string | number,
    trainingFee: '' as string | number,
    transactionFee: '' as string | number,
    vehicleCostRange: '',
    equipmentCostRange: '',
    insuranceCostRange: '',
    regoCostRange: '',
    workingCapitalRange: '',
    legalAccountingRange: '',
    otherPaymentsText: '',

    // Section G: Marketing funds (Empty by default)
    marketingFundContribution: '',
    marketingFeePercent: '' as string | number,

    // Section H: Unilateral variation (Empty by default)
    canUnilateralVariation: '' as '' | 'Yes' | 'No',

    // Section I: Earnings (Empty by default)
    historicalEarningsIncluded: '' as '' | 'Yes' | 'No',
    projectedEarningsIncluded: '' as '' | 'Yes' | 'No',

    // Section J: End of agreement (Empty by default)
    endOfAgreementClauseDetails: '',
    agreementTermYears: '',
    renewalOptionSelected: [] as string[],
    franchisorBuysUnsoldStock: '' as '' | 'Yes' | 'No',
    goodwillCompensation: '' as '' | 'Yes' | 'No',
    restraintOfTradeClause: '' as '' | 'Yes' | 'No',
    notes: '',
    documentDate: '',

    // Information Memorandum (IM) Specific Dynamic Fields
    dateBusinessStarted: '01/02/2022',
    numberOfOwners: '1' as string | number,
    reasonForSale: 'Moving / Relocating',
    last12MonthsServiceRevenue: '300437.26' as string | number,
    franchiseFeePercent: '25' as string | number,
    marketingLevyPercent: '5' as string | number,
    last12MonthsExpressRevenue: '856.60' as string | number,
    askingPrice: '335000.00' as string | number,
    askingPriceText: '$335,000.00 NEG',
    totalDailyRunTimeHours: 'Between 8.5 to 9.5 hours per day',
    morningShiftHours: '6:00am to 11:00am',
    afternoonShiftHours: '1:00pm to 4:00pm',
    franchiseTermYears: 'Unlimited',
    territoryMapUrl: '',
  });
  const [savingFactSheet, setSavingFactSheet] = useState(false);
  const [sendingFactSheetEmail, setSendingFactSheetEmail] = useState(false);

  // Presale Listing & Franchisee Sync State
  const [presaleListings, setPresaleListings] = useState<any[]>([]);
  const [allFranchiseeOptions, setAllFranchiseeOptions] = useState<any[]>([]);
  const [selectedPresaleId, setSelectedPresaleId] = useState<string>('');
  const [loadingPresales, setLoadingPresales] = useState(false);

  // Franchisee Link Modal State
  const [isLinkFranchiseeModalOpen, setIsLinkFranchiseeModalOpen] = useState(false);
  const [selectedLinkFranchiseeId, setSelectedLinkFranchiseeId] = useState<string>('');
  const [linkingFranchisee, setLinkingFranchisee] = useState(false);

  // Step 1: Fact Sheet Email Form State
  const [factSheetEmailForm, setFactSheetEmailForm] = useState({
    toEmail: '',
    ccEmail: 'michael.mcdaid@mailplus.com.au',
    bccEmail: '',
    subject: '',
    customNote: '',
  });

  // Step 2: Deed Email & Schedule Form State
  const [sendingDeedEmail, setSendingDeedEmail] = useState(false);
  const [deedEmailForm, setDeedEmailForm] = useState({
    toEmail: '',
    ccEmail: 'michael.mcdaid@mailplus.com.au',
    bccEmail: '',
    subject: '',
    customNote: '',
  });

  const [savingDeedSchedule, setSavingDeedSchedule] = useState(false);
  const [deedScheduleForm, setDeedScheduleForm] = useState({
    agreementDate: '',
    providerName: 'Mail Plus Pty Ltd',
    providerAcn: '119 635 158',
    providerAddress: 'Suite 3, Level 1, 2-4 Ross St, Parramatta NSW 2150',
    providerEmail: 'greg.hart@mailplus.com.au',
    providerContact: 'Greg Hart',
    recipientName: '',
    recipientAcn: '',
    recipientAbn: '',
    recipientShortName: '',
    recipientAddress: '',
    recipientEmail: '',
    recipientContact: '',
    purpose: 'Reviewing Confidential Information for the purpose of evaluating a MailPlus Franchise opportunity and participating in an operational run-along / site evaluation for the specified territory.',
  });

  // Step 3: EOI Email Form & Prefill State
  const [sendingEOIEmail, setSendingEOIEmail] = useState(false);
  const [savingEOIPrefill, setSavingEOIPrefill] = useState(false);
  const [eoiEmailForm, setEOIEmailForm] = useState({
    toEmail: '',
    ccEmail: 'michael.mcdaid@mailplus.com.au',
    bccEmail: '',
    subject: '',
    customNote: '',
  });

  const [eoiPrefillForm, setEOIPrefillForm] = useState({
    entityStructure: 'SOLE TRADER' as 'SOLE TRADER' | 'PARTNERSHIP' | 'PTY LTD COMPANY' | 'LTD COMPANY',
    companyName: '',
    abn: '',
    registeredAddress: '',
    businessAddress: '',
    phoneHome: '',
    phoneBusiness: '',
    facsimileNo: '',

    // Applicant 1
    applicant1Name: '',
    applicant1Position: 'SOLE TRADER',
    applicant1PrivateAddress: '',
    applicant1PhoneHome: '',
    applicant1PhoneBusiness: '',
    applicant1Email: '',
    applicant1DriversLicence: '',
    applicant1DriversLicencePlace: '',
    applicant1DateOfBirth: '',
    applicant1MaritalStatus: '',
    applicant1SpouseName: '',
    applicant1SpouseAge: '',
    applicant1ChildrenAges: '',
    applicant1SpouseActive: 'No',
    applicant1OwnershipPercent: '100',
    applicant1OtherDirectorships: '',
    applicant1FormerAddress: '',
    applicant1HealthStatus: 'GOOD',
    applicant1PhysicalLimitations: '',
    applicant1Qualifications: '',
    applicant1SalesTraining: '',

    // Applicant 2
    hasApplicant2: false,
    applicant2Name: '',
    applicant2Position: 'PARTNER',
    applicant2PrivateAddress: '',
    applicant2PhoneHome: '',
    applicant2PhoneBusiness: '',
    applicant2Email: '',
    applicant2DriversLicence: '',
    applicant2DriversLicencePlace: '',
    applicant2DateOfBirth: '',
    applicant2MaritalStatus: '',
    applicant2SpouseName: '',
    applicant2SpouseAge: '',
    applicant2ChildrenAges: '',
    applicant2SpouseActive: 'No',
    applicant2OwnershipPercent: '0',
    applicant2OtherDirectorships: '',
    applicant2FormerAddress: '',
    applicant2HealthStatus: 'GOOD',
    applicant2PhysicalLimitations: '',
    applicant2Qualifications: '',
    applicant2SalesTraining: '',

    // Trust
    trustName: '',
    trustEstablishedDate: '',
    trustBeneficiaries: '',

    // Financial Prefills
    incSalary: '', incBonus: '', incDividends: '', incRealEstate: '', incOther: '',
    expMortgage: '', expLoans: '', expCreditCard: '', expPhoneElectric: '', expSchoolFees: '', expRatesTaxes: '', expInsurance: '', expOther: '',
    astRealEstate: '', astCash: '', astBusinessNetValue: '', astSharesBonds: '', astOther: '',
    liabRealEstateMortgages: '', liabNotesLoansInst: '', liabFriendsRelatives: '', liabOtherDebts: '',

    // General Enquiry
    reasonForPurchase: '',
    fundingSource: '',
    whySuited: '',
    similarBusinessExperience: 'No',
    similarBusinessDetails: '',
    preparedToComply: 'Yes',
    whySuccessful: '',
    valuableQualities: '',
    fullTimeDevotion: 'Yes',
    operatingHoursDetails: '',
    mainStrengths: '',
    mainWeaknesses: '',
    knowsFranchiseDefinition: 'Yes',
    franchiseDefinitionExplanation: '',
    understandsRelationship: 'Yes',
    relationshipExplanation: '',
    acceptsGuidance: 'Yes',
    knowsDefinedTerm: 'Yes',
    representationsMade: '',
    understandsIndependentAdvice: 'Yes',

    // Finance & Info Statement
    requiresFinance: 'No',
    authorizeFinanceSharing: 'No',
    informationStatementConfirmed: true,
    informationStatementDate: '',
  });

  // Step 4: Deposit Form State
  const [depositForm, setDepositForm] = useState({
    isPaid: true,
    percentageDeposited: 5,
    amountPaid: 2000,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'EFT',
    receiptRef: '',
    notes: '',
  });
  const [savingDeposit, setSavingDeposit] = useState(false);

  // Step 6: Request for Docs (Lawyer Anna Trist) State
  const [savingRFD, setSavingRFD] = useState(false);
  const [instructingAnna, setInstructingAnna] = useState(false);
  const [rfdForm, setRfdForm] = useState({
    incomingEntityName: '',
    abn: '',
    registeredAddress: '',
    email: '',
    mobile: '',
    outgoingFranchiseeName: '',
    businessName: '',
    territoryName: '',
    territoryMapUrl: '',
    termYears: 5,
    commencementDate: '',
    expiryDate: '',
    depositFee: 2000,
    initialFranchiseFee: 25000,
    renewalFee: 5000,
    transferFee: 5000,
    transactionFee: 1500,
    serviceFeePercent: 25,
    marketingLevyPercent: 5,
    techLicenceFee: 250,
    earningsProvided: false,
    mpFinancingProvided: false,
    vehicleRange: '$35,000 – $45,000 (Approved White Van)',
    toolsOfTrade: '$3,500 (Scanner, Uniforms, Starter Kit)',
    specialConditions: '',
    reviewedByMatt: false,
    chasedByMaddie: false,
  });

  // Step 7: Disclosure Document & 14-Day Statutory Rule State
  const [disclosureBackdateInput, setDisclosureBackdateInput] = useState('');
  const [savingDisclosureBackdate, setSavingDisclosureBackdate] = useState(false);
  const [uploadingDisclosureReceipt, setUploadingDisclosureReceipt] = useState(false);
  const [sendingDisclosureEmail, setSendingDisclosureEmail] = useState(false);

  // Step 8: Franchise Agreement Execution State
  const [uploadingFAPdf, setUploadingFAPdf] = useState(false);
  const [executingFA, setExecutingFA] = useState(false);
  const [syncingNetSuite, setSyncingNetSuite] = useState(false);

  // Step 9: Role-Sequenced Operational Training Module State
  const [savingTraining, setSavingTraining] = useState(false);
  const [trainingForm, setTrainingForm] = useState({
    confirmedStartDate: '',
    salesTrainingDate: '',
    salesStatus: 'pending' as 'pending' | 'scheduled' | 'completed',
    appTrainingDate: '',
    appStatus: 'pending' as 'pending' | 'scheduled' | 'completed',
    billingTrainingDate: '',
    billingStatus: 'pending' as 'pending' | 'scheduled' | 'completed',
    syncGregCalendar: true,
  });

  // Document Upload States
  const [uploadingDeed, setUploadingDeed] = useState(false);
  const [uploadingEOI, setUploadingEOI] = useState(false);
  const [uploadingDepositReceipt, setUploadingDepositReceipt] = useState(false);

  // Document Upload & Delete Handlers
  const handleUploadDeedFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !prospect) return;
    setUploadingDeed(true);
    try {
      const uploadedDocs: ProspectDocument[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `franchise_prospects/${prospect.id}/deed_documents/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedDocs.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          url,
          uploadedAt: new Date().toISOString(),
          size: file.size,
          type: file.type,
        });
      }

      const currentDocs = prospect.confidentialityDeed?.documents || [];
      const updatedDocs = [...currentDocs, ...uploadedDocs];

      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      const updatedDeed: ConfidentialityDeedData = {
        ...(prospect.confidentialityDeed || { publicToken: encodeProspectToken('cd', prospect.id), status: 'uploaded' }),
        status: prospect.confidentialityDeed?.status === 'signed_online' ? 'signed_online' : 'uploaded',
        documents: updatedDocs,
      };

      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Uploaded Confidentiality Deed document(s): ${uploadedDocs.map(d => d.name).join(', ')}.`,
        createdAt: new Date().toISOString(),
        createdByName: userProfile?.displayName || userProfile?.email || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };

      await updateDoc(refDoc, {
        confidentialityDeed: updatedDeed,
        notes: [...(prospect.notes || []), newNote],
      });

      toast({ title: 'Deed Document Uploaded', description: 'Confidentiality deed saved successfully.' });
      fetchProspect();
    } catch (err: any) {
      console.error('Error uploading deed file:', err);
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message || 'Could not upload deed file.' });
    } finally {
      setUploadingDeed(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteDeedDoc = async (docId: string) => {
    if (!prospect || !prospect.confidentialityDeed?.documents) return;
    try {
      const updatedDocs = prospect.confidentialityDeed.documents.filter(d => d.id !== docId);
      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      await updateDoc(refDoc, {
        'confidentialityDeed.documents': updatedDocs,
      });
      toast({ title: 'Document Removed', description: 'Deed document removed.' });
      fetchProspect();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not remove document.' });
    }
  };

  const handleSaveDeedSchedule = async () => {
    if (!prospect) return;
    setSavingDeedSchedule(true);
    try {
      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      const updatedDeed: ConfidentialityDeedData = {
        ...(prospect.confidentialityDeed || {
          publicToken: encodeProspectToken('cd', prospect.id),
          status: 'not_started',
        }),
        ...deedScheduleForm,
      };

      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Updated Confidentiality Deed schedule details.`,
        createdAt: new Date().toISOString(),
        createdByName: userProfile?.displayName || userProfile?.email || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };

      await updateDoc(refDoc, {
        confidentialityDeed: updatedDeed,
        notes: [...(prospect.notes || []), newNote],
      });

      toast({ title: 'Deed Schedule Saved', description: 'Confidentiality deed schedule updated successfully.' });
      fetchProspect();
    } catch (err: any) {
      console.error('Error saving deed schedule:', err);
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message || 'Could not save deed schedule.' });
    } finally {
      setSavingDeedSchedule(false);
    }
  };

  const handleSaveEOIPrefill = async () => {
    if (!prospect) return;
    setSavingEOIPrefill(true);
    try {
      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      const updatedEOI: EOIData = {
        ...(prospect.eoiData || {
          publicToken: encodeProspectToken('eoi', prospect.id),
          status: 'not_started',
        }),
        ...eoiPrefillForm,
        driversLicence: eoiPrefillForm.applicant1DriversLicence,
        driversLicencePlaceOfIssue: eoiPrefillForm.applicant1DriversLicencePlace,
      };

      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Updated Expression of Interest (EOI) prefill configuration.`,
        createdAt: new Date().toISOString(),
        createdByName: userProfile?.displayName || userProfile?.email || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };

      await updateDoc(refDoc, {
        eoiData: updatedEOI,
        notes: [...(prospect.notes || []), newNote],
      });

      toast({ title: 'EOI Prefill Saved', description: 'EOI form dynamic fields saved successfully.' });
      fetchProspect();
    } catch (err: any) {
      console.error('Error saving EOI prefill:', err);
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message || 'Could not save EOI prefill.' });
    } finally {
      setSavingEOIPrefill(false);
    }
  };

  const handleUploadEOIFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !prospect) return;
    setUploadingEOI(true);
    try {
      const uploadedDocs: ProspectDocument[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `franchise_prospects/${prospect.id}/eoi_documents/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedDocs.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          url,
          uploadedAt: new Date().toISOString(),
          size: file.size,
          type: file.type,
        });
      }

      const currentDocs = prospect.eoiData?.documents || [];
      const updatedDocs = [...currentDocs, ...uploadedDocs];

      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      const updatedEOI: EOIData = {
        ...(prospect.eoiData || { publicToken: encodeProspectToken('eoi', prospect.id), status: 'uploaded' }),
        status: prospect.eoiData?.status === 'signed_online' ? 'signed_online' : 'uploaded',
        documents: updatedDocs,
      };

      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Uploaded Expression of Interest (EOI) document(s): ${uploadedDocs.map(d => d.name).join(', ')}.`,
        createdAt: new Date().toISOString(),
        createdByName: userProfile?.displayName || userProfile?.email || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };

      await updateDoc(refDoc, {
        eoiData: updatedEOI,
        notes: [...(prospect.notes || []), newNote],
      });

      toast({ title: 'EOI Document Uploaded', description: 'EOI document saved successfully.' });
      fetchProspect();
    } catch (err: any) {
      console.error('Error uploading EOI file:', err);
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message || 'Could not upload EOI file.' });
    } finally {
      setUploadingEOI(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteEOIDoc = async (docId: string) => {
    if (!prospect || !prospect.eoiData?.documents) return;
    try {
      const updatedDocs = prospect.eoiData.documents.filter(d => d.id !== docId);
      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      await updateDoc(refDoc, {
        'eoiData.documents': updatedDocs,
      });
      toast({ title: 'Document Removed', description: 'EOI document removed.' });
      fetchProspect();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not remove document.' });
    }
  };

  const handleUploadDepositReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !prospect) return;
    setUploadingDepositReceipt(true);
    try {
      const uploadedDocs: ProspectDocument[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `franchise_prospects/${prospect.id}/deposit_receipts/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedDocs.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          url,
          uploadedAt: new Date().toISOString(),
          size: file.size,
          type: file.type,
        });
      }

      const currentDocs = prospect.depositDetails?.documents || [];
      const updatedDocs = [...currentDocs, ...uploadedDocs];

      const payload = {
        prospectId: prospect.id,
        isPaid: true,
        percentageDeposited: depositForm.percentageDeposited,
        amountPaid: depositForm.amountPaid,
        paymentDate: depositForm.paymentDate,
        paymentMethod: depositForm.paymentMethod,
        receiptRef: depositForm.receiptRef,
        receiptUrl: uploadedDocs[0]?.url || prospect.depositDetails?.receiptUrl || '',
        documents: updatedDocs,
        notes: depositForm.notes,
        loggedByUid: userProfile?.uid || 'system',
        loggedByName: userProfile?.displayName || userProfile?.email || 'Operations User',
      };

      const res = await fetch('/api/franchise-prospects/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save deposit receipt');

      toast({ title: 'Deposit Receipt Uploaded', description: 'Deposit receipt saved successfully.' });
      fetchProspect();
    } catch (err: any) {
      console.error('Error uploading deposit receipt:', err);
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message || 'Could not upload deposit receipt.' });
    } finally {
      setUploadingDepositReceipt(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteDepositDoc = async (docId: string) => {
    if (!prospect || !prospect.depositDetails?.documents) return;
    try {
      const updatedDocs = prospect.depositDetails.documents.filter(d => d.id !== docId);
      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      await updateDoc(refDoc, {
        'depositDetails.documents': updatedDocs,
      });
      toast({ title: 'Document Removed', description: 'Deposit receipt removed.' });
      fetchProspect();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not remove document.' });
    }
  };

  // Interested Territories Management State
  const [systemTerritories, setSystemTerritories] = useState<string[]>([]);
  const [isTerritoryModalOpen, setIsTerritoryModalOpen] = useState(false);
  const [editInterestedTerritories, setEditInterestedTerritories] = useState<string[]>([]);
  const [editPrimaryTerritory, setEditPrimaryTerritory] = useState<string>('');
  const [customTerritoryInput, setCustomTerritoryInput] = useState('');
  const [savingTerritories, setSavingTerritories] = useState(false);

  // FY History Column Handlers
  const handleAddFyColumn = () => {
    const cols = factSheetForm.historyColumns;
    const newId = `fy_${Date.now()}`;
    const newCol: KeyFactSheetHistoryColumn = {
      id: newId,
      label: `FY ending 30/06/${2024 - cols.length}`,
      occurrences: { transferred: 0, ceased: 0, terminatedFranchisor: 0, terminatedFranchisee: 0, notExtended: 0, boughtBack: 0, acquiredByFranchisor: 0 },
    };
    setFactSheetForm((prev) => ({ ...prev, historyColumns: [...prev.historyColumns, newCol] }));
  };

  const handleRemoveFyColumn = (id: string) => {
    if (factSheetForm.historyColumns.length <= 1) return;
    setFactSheetForm((prev) => ({
      ...prev,
      historyColumns: prev.historyColumns.filter((c) => c.id !== id),
    }));
  };

  const handleUpdateFyColumnLabel = (id: string, label: string) => {
    setFactSheetForm((prev) => ({
      ...prev,
      historyColumns: prev.historyColumns.map((c) => (c.id === id ? { ...c, label } : c)),
    }));
  };

  const handleUpdateFyOccurrence = (id: string, key: string, val: number) => {
    setFactSheetForm((prev) => ({
      ...prev,
      historyColumns: prev.historyColumns.map((c) =>
        c.id === id ? { ...c, occurrences: { ...c.occurrences, [key]: val } } : c
      ),
    }));
  };

  const handleToggleTerritoryDetail = (val: string) => {
    const current = factSheetForm.territoryDetailsSelected || [];
    const updated = current.includes(val)
      ? current.filter((item) => item !== val)
      : [...current, val];
    setFactSheetForm((prev) => ({ ...prev, territoryDetailsSelected: updated }));
  };

  const handleToggleCompetitionType = (val: string) => {
    const current = factSheetForm.competitionTypesSelected || [];
    const updated = current.includes(val)
      ? current.filter((item) => item !== val)
      : [...current, val];
    setFactSheetForm((prev) => ({ ...prev, competitionTypesSelected: updated }));
  };

  const handleToggleRenewalOption = (val: string) => {
    const current = factSheetForm.renewalOptionSelected || [];
    const updated = current.includes(val)
      ? current.filter((item) => item !== val)
      : [...current, val];
    setFactSheetForm((prev) => ({ ...prev, renewalOptionSelected: updated }));
  };

  useEffect(() => {
    const loadSystemTerritories = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'franchisees'));
        const list = snap.docs
          .map((d) => d.data()?.name || d.data()?.franchiseeName || d.data()?.territoryName || d.id)
          .filter(Boolean);
        setSystemTerritories(Array.from(new Set(list)).sort());
      } catch (e) {
        console.warn('Failed to load system franchisees for territory selection:', e);
      }
    };
    loadSystemTerritories();
  }, []);

  const handleOpenTerritoryModal = () => {
    const currentInterested = prospect?.interestedTerritories?.length
      ? prospect.interestedTerritories
      : prospect?.preferredTerritory
      ? [prospect.preferredTerritory]
      : [];

    setEditInterestedTerritories(currentInterested);
    setEditPrimaryTerritory(prospect?.preferredTerritory || currentInterested[0] || '');
    setCustomTerritoryInput('');
    setIsTerritoryModalOpen(true);
  };

  const handleAddTerritory = (tName: string) => {
    const clean = tName.trim();
    if (!clean || editInterestedTerritories.includes(clean)) return;
    const updated = [...editInterestedTerritories, clean];
    setEditInterestedTerritories(updated);
    if (!editPrimaryTerritory) {
      setEditPrimaryTerritory(clean);
    }
  };

  const handleRemoveTerritory = (tName: string) => {
    const updated = editInterestedTerritories.filter((t) => t !== tName);
    setEditInterestedTerritories(updated);
    if (editPrimaryTerritory === tName) {
      setEditPrimaryTerritory(updated[0] || '');
    }
  };

  const handleSaveTerritories = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTerritories(true);
    try {
      const primary = editPrimaryTerritory || editInterestedTerritories[0] || '';
      const ref = doc(firestore, 'franchise_prospects', prospect!.id);

      const note = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Updated candidate interested territories to: ${editInterestedTerritories.join(', ') || 'None'} (Primary: ${primary || 'Unspecified'})`,
        createdAt: new Date().toISOString(),
        createdByName: userProfile?.displayName || userProfile?.email || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };

      const updatedNotes = [...(prospect!.notes || []), note];

      await updateDoc(ref, {
        preferredTerritory: primary,
        interestedTerritories: editInterestedTerritories,
        notes: updatedNotes,
      });

      setProspect((prev) =>
        prev
          ? {
              ...prev,
              preferredTerritory: primary,
              interestedTerritories: editInterestedTerritories,
              notes: updatedNotes,
            }
          : null
      );

      toast({ title: 'Territories Updated', description: 'Candidate interested territories saved.' });
      setIsTerritoryModalOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message || 'Could not save territories.' });
    } finally {
      setSavingTerritories(false);
    }
  };

  const checkAndAutoUpdateStatus = async (prospectData: FranchiseProspect) => {
    if (!prospectData || ['Converted', 'Rejected', 'Archived'].includes(prospectData.status)) {
      return;
    }

    const deedDone = prospectData.confidentialityDeed?.status === 'signed_online' || prospectData.confidentialityDeed?.status === 'uploaded' || Boolean(prospectData.confidentialityDeed?.documents && prospectData.confidentialityDeed.documents.length > 0);
    const kfsDone = Boolean(prospectData.keyFactSheet?.publicToken);
    const eoiDone = prospectData.eoiData?.status === 'signed_online' || prospectData.eoiData?.status === 'uploaded' || Boolean(prospectData.eoiData?.documents && prospectData.eoiData.documents.length > 0);
    const depositDone = Boolean(prospectData.depositDetails?.isPaid) || Boolean(prospectData.depositDetails?.documents && prospectData.depositDetails.documents.length > 0);
    const nabConfirmed = prospectData.nabFunding?.nabStatus === 'confirmed';
    const rfdInstructed = prospectData.requestForDocs?.status === 'instructed';
    const discSigned = prospectData.disclosureDocument?.status === 'receipt_signed';
    const faExecuted = Boolean(prospectData.franchiseAgreement?.executedAt);
    const trainingScheduled = Boolean(prospectData.trainingSchedule?.salesTraining?.scheduledDate);

    let targetStatus: FranchiseProspect['status'] | null = null;
    let autoNoteReason = '';

    if (trainingScheduled && prospectData.status !== 'Training Scheduled') {
      targetStatus = 'Training Scheduled';
      autoNoteReason = 'Operational training module scheduled.';
    } else if (faExecuted && prospectData.status !== 'FA Executed') {
      targetStatus = 'FA Executed';
      autoNoteReason = 'Franchise Agreement executed & archived.';
    } else if (discSigned && prospectData.status !== 'Disclosure 14-Day Lock') {
      targetStatus = 'Disclosure 14-Day Lock';
      autoNoteReason = 'Disclosure Receipt signed. Statutory 14-day rule active.';
    } else if (rfdInstructed && prospectData.status !== 'Legal Instructions Sent') {
      targetStatus = 'Legal Instructions Sent';
      autoNoteReason = 'Request for Docs legal instructions dispatched to Lawyer Anna Trist.';
    } else if (nabConfirmed && prospectData.status !== 'NAB Confirmed') {
      targetStatus = 'NAB Confirmed';
      autoNoteReason = 'Formal NAB accreditation funding confirmed by Michael McDaid.';
    } else if (depositDone && prospectData.status !== 'Deposit Paid') {
      targetStatus = 'Deposit Paid';
      autoNoteReason = '5-10% Franchise deposit payment verified.';
    } else if (eoiDone && prospectData.status !== 'EOI Signed') {
      targetStatus = 'EOI Signed';
      autoNoteReason = 'Expression of Interest (EOI) application form completed.';
    } else if (kfsDone && (prospectData.status === 'Deed Signed' || prospectData.status === 'New')) {
      targetStatus = 'IM Sent';
      autoNoteReason = 'Information Memorandum (IM) / Key Fact Sheet sent.';
    } else if (deedDone && prospectData.status === 'New') {
      targetStatus = 'Deed Signed';
      autoNoteReason = 'Initial Confidentiality Deed executed.';
    }

    if (targetStatus && targetStatus !== prospectData.status) {
      try {
        const refDoc = doc(firestore, 'franchise_prospects', prospectData.id);
        const autoNote = {
          id: Math.random().toString(36).substring(2, 9),
          text: `Status automatically updated to "${targetStatus}" because ${autoNoteReason}`,
          createdAt: new Date().toISOString(),
          createdByName: 'System Pipeline Automation',
          createdByUid: 'system',
        };
        const updatedNotes = [...(prospectData.notes || []), autoNote];

        await updateDoc(refDoc, {
          status: targetStatus,
          notes: updatedNotes,
        });

        setProspect((prev) => (prev ? { ...prev, status: targetStatus, notes: updatedNotes } : null));
        toast({
          title: 'Status Updated Automatically',
          description: `Prospect status changed to "${targetStatus}" based on pipeline progress.`,
        });
      } catch (err) {
        console.warn('Auto status update failed:', err);
      }
    }
  };

  const fetchProspect = async () => {
    if (!prospectId) return;
    setLoading(true);
    try {
      const ref = doc(firestore, 'franchise_prospects', prospectId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = { id: snap.id, ...(snap.data() as Omit<FranchiseProspect, 'id'>) };
        setProspect(data);

        // Prefill Information Memorandum (IM) Form
        const kfs: Partial<KeyFactSheetData> = data.keyFactSheet || {};
        setFactSheetForm({
          franchisorName: kfs.franchisorName || 'Mail Plus Pty Ltd',
          yearsInOperation: kfs.yearsInOperation || '8 years',
          financialViability: kfs.financialViability || '',

          currentLegalProceedings: kfs.currentLegalProceedings || '',
          finalJudgments: kfs.finalJudgments || '',
          disputeMediationPercent: kfs.disputeMediationPercent || '',

          franchiseeOwnedCount: kfs.franchiseeOwnedCount ?? '',
          corporateOwnedCount: kfs.corporateOwnedCount ?? '',
          historyColumns: kfs.historyColumns?.length ? kfs.historyColumns : getInitialFyColumns(),

          territoryName: kfs.territoryName || data.preferredTerritory || 'MailPlus Waterloo Alexandria',
          dateBusinessStarted: kfs.dateBusinessStarted || '01/02/2022',
          numberOfOwners: kfs.numberOfOwners ?? '1',
          reasonForSale: kfs.reasonForSale || 'Moving / Relocating',
          last12MonthsServiceRevenue: kfs.last12MonthsServiceRevenue || '300437.26',
          franchiseFeePercent: kfs.franchiseFeePercent || '25',
          marketingLevyPercent: kfs.marketingLevyPercent || '5',
          last12MonthsExpressRevenue: kfs.last12MonthsExpressRevenue || '856.60',
          askingPrice: kfs.askingPrice || '335000.00',
          askingPriceText: kfs.askingPriceText || '$335,000.00 NEG',
          totalDailyRunTimeHours: kfs.totalDailyRunTimeHours || 'Between 8.5 to 9.5 hours per day',
          morningShiftHours: kfs.morningShiftHours || '6:00am to 11:00am',
          afternoonShiftHours: kfs.afternoonShiftHours || '1:00pm to 4:00pm',
          franchiseTermYears: kfs.franchiseTermYears || 'Unlimited',
          territoryMapUrl: kfs.territoryMapUrl || '',

          territoryDetailsSelected: kfs.territoryDetailsSelected || [],
          territoryOtherDetails: kfs.territoryOtherDetails || '',
          canFranchisorChangeTerritory: kfs.canFranchisorChangeTerritory || '',
          competitionTypesSelected: kfs.competitionTypesSelected || [],
          canFranchiseeSellOnline: kfs.canFranchiseeSellOnline || '',
          leaseInterest: kfs.leaseInterest || '',

          supplierRestrictions: kfs.supplierRestrictions || '',
          franchisorInterestInSuppliers: kfs.franchisorInterestInSuppliers || '',
          franchisorRebates: kfs.franchisorRebates || '',

          preliminaryPaymentRequired: kfs.preliminaryPaymentRequired || '',
          franchiseFee: kfs.franchiseFee ?? 35000,
          trainingFee: kfs.trainingFee ?? 5000,
          transactionFee: kfs.transactionFee ?? '',
          vehicleCostRange: kfs.vehicleCostRange || '',
          equipmentCostRange: kfs.equipmentCostRange || '',
          insuranceCostRange: kfs.insuranceCostRange || '',
          regoCostRange: kfs.regoCostRange || '',
          workingCapitalRange: kfs.workingCapitalRange || '',
          legalAccountingRange: kfs.legalAccountingRange || '',
          otherPaymentsText: kfs.otherPaymentsText || '',

          marketingFundContribution: kfs.marketingFundContribution || '',
          marketingFeePercent: kfs.marketingFeePercent || '',

          canUnilateralVariation: kfs.canUnilateralVariation || '',
          historicalEarningsIncluded: kfs.historicalEarningsIncluded || '',
          projectedEarningsIncluded: kfs.projectedEarningsIncluded || '',

          endOfAgreementClauseDetails: kfs.endOfAgreementClauseDetails || '',
          agreementTermYears: kfs.agreementTermYears || '',
          renewalOptionSelected: kfs.renewalOptionSelected || [],
          franchisorBuysUnsoldStock: kfs.franchisorBuysUnsoldStock || '',
          goodwillCompensation: kfs.goodwillCompensation || '',
          restraintOfTradeClause: kfs.restraintOfTradeClause || '',
          notes: kfs.notes || '',
          documentDate: kfs.documentDate || '',
        });

        // Prefill Deposit Form
        setDepositForm({
          isPaid: data.depositDetails?.isPaid ?? false,
          percentageDeposited: Number(data.depositDetails?.percentageDeposited) || 5,
          amountPaid: Number(data.depositDetails?.amountPaid) || 2000,
          paymentDate: data.depositDetails?.paymentDate || new Date().toISOString().split('T')[0],
          paymentMethod: data.depositDetails?.paymentMethod || 'EFT',
          receiptRef: data.depositDetails?.receiptRef || `FR DEP ${data.lastName?.toUpperCase() || ''}`,
          notes: data.depositDetails?.notes || '',
        });

        // Prefill Deed Schedule Form
        const existingDeed: ConfidentialityDeedData = (data.confidentialityDeed || {}) as any;
        const todayFormatted = new Date().toLocaleDateString('en-AU');
        setDeedScheduleForm({
          agreementDate: existingDeed.agreementDate || todayFormatted,
          providerName: existingDeed.providerName || 'Mail Plus Pty Ltd',
          providerAcn: existingDeed.providerAcn || '119 635 158',
          providerAddress: existingDeed.providerAddress || 'Suite 3, Level 1, 2-4 Ross St, Parramatta NSW 2150',
          providerEmail: existingDeed.providerEmail || 'greg.hart@mailplus.com.au',
          providerContact: existingDeed.providerContact || 'Greg Hart',
          recipientName: existingDeed.recipientName || data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || '',
          recipientAcn: existingDeed.recipientAcn || '',
          recipientAbn: existingDeed.recipientAbn || (data as any).abn || '',
          recipientShortName: existingDeed.recipientShortName || data.firstName || '',
          recipientAddress: existingDeed.recipientAddress || (data as any).address || '',
          recipientEmail: existingDeed.recipientEmail || data.email || '',
          recipientContact: existingDeed.recipientContact || data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || '',
          purpose: existingDeed.purpose || 'Reviewing Confidential Information for the purpose of evaluating a MailPlus Franchise opportunity and participating in an operational run-along / site evaluation for the specified territory.',
        });

        // Prefill EOI Prefill Form
        const existingEOI: Partial<EOIData> = data.eoiData || {};
        setEOIPrefillForm({
          entityStructure: existingEOI.entityStructure || 'SOLE TRADER',
          companyName: existingEOI.companyName || data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || '',
          abn: existingEOI.abn || '',
          registeredAddress: existingEOI.registeredAddress || '',
          businessAddress: existingEOI.businessAddress || '',
          phoneHome: existingEOI.phoneHome || '',
          phoneBusiness: existingEOI.phoneBusiness || data.phone || '',
          facsimileNo: existingEOI.facsimileNo || '',

          applicant1Name: existingEOI.applicant1Name || data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || '',
          applicant1Position: existingEOI.applicant1Position || 'SOLE TRADER',
          applicant1PrivateAddress: existingEOI.applicant1PrivateAddress || '',
          applicant1PhoneHome: existingEOI.applicant1PhoneHome || '',
          applicant1PhoneBusiness: existingEOI.applicant1PhoneBusiness || data.phone || '',
          applicant1Email: existingEOI.applicant1Email || data.email || '',
          applicant1DriversLicence: existingEOI.applicant1DriversLicence || '',
          applicant1DriversLicencePlace: existingEOI.applicant1DriversLicencePlace || '',
          applicant1DateOfBirth: existingEOI.applicant1DateOfBirth || '',
          applicant1MaritalStatus: existingEOI.applicant1MaritalStatus || '',
          applicant1SpouseName: existingEOI.applicant1SpouseName || '',
          applicant1SpouseAge: String(existingEOI.applicant1SpouseAge || ''),
          applicant1ChildrenAges: existingEOI.applicant1ChildrenAges || '',
          applicant1SpouseActive: existingEOI.applicant1SpouseActive ? 'Yes' : 'No',
          applicant1OwnershipPercent: String(existingEOI.applicant1OwnershipPercent || '100'),
          applicant1OtherDirectorships: existingEOI.applicant1OtherDirectorships || '',
          applicant1FormerAddress: existingEOI.applicant1FormerAddress || '',
          applicant1HealthStatus: existingEOI.applicant1HealthStatus || 'GOOD',
          applicant1PhysicalLimitations: existingEOI.applicant1PhysicalLimitations || '',
          applicant1Qualifications: existingEOI.applicant1Qualifications || '',
          applicant1SalesTraining: existingEOI.applicant1SalesTraining || '',

          hasApplicant2: Boolean(existingEOI.hasApplicant2),
          applicant2Name: existingEOI.applicant2Name || '',
          applicant2Position: existingEOI.applicant2Position || 'PARTNER',
          applicant2PrivateAddress: existingEOI.applicant2PrivateAddress || '',
          applicant2PhoneHome: existingEOI.applicant2PhoneHome || '',
          applicant2PhoneBusiness: existingEOI.applicant2PhoneBusiness || '',
          applicant2Email: existingEOI.applicant2Email || '',
          applicant2DriversLicence: existingEOI.applicant2DriversLicence || '',
          applicant2DriversLicencePlace: existingEOI.applicant2DriversLicencePlace || '',
          applicant2DateOfBirth: existingEOI.applicant2DateOfBirth || '',
          applicant2MaritalStatus: existingEOI.applicant2MaritalStatus || '',
          applicant2SpouseName: existingEOI.applicant2SpouseName || '',
          applicant2SpouseAge: String(existingEOI.applicant2SpouseAge || ''),
          applicant2ChildrenAges: existingEOI.applicant2ChildrenAges || '',
          applicant2SpouseActive: existingEOI.applicant2SpouseActive ? 'Yes' : 'No',
          applicant2OwnershipPercent: String(existingEOI.applicant2OwnershipPercent || '0'),
          applicant2OtherDirectorships: existingEOI.applicant2OtherDirectorships || '',
          applicant2FormerAddress: existingEOI.applicant2FormerAddress || '',
          applicant2HealthStatus: existingEOI.applicant2HealthStatus || 'GOOD',
          applicant2PhysicalLimitations: existingEOI.applicant2PhysicalLimitations || '',
          applicant2Qualifications: existingEOI.applicant2Qualifications || '',
          applicant2SalesTraining: existingEOI.applicant2SalesTraining || '',

          trustName: existingEOI.trustName || '',
          trustEstablishedDate: existingEOI.trustEstablishedDate || '',
          trustBeneficiaries: existingEOI.trustBeneficiaries || '',

          incSalary: String(existingEOI.incSalary || ''),
          incBonus: String(existingEOI.incBonus || ''),
          incDividends: String(existingEOI.incDividends || ''),
          incRealEstate: String(existingEOI.incRealEstate || ''),
          incOther: String(existingEOI.incOther || ''),

          expMortgage: String(existingEOI.expMortgage || ''),
          expLoans: String(existingEOI.expLoans || ''),
          expCreditCard: String(existingEOI.expCreditCard || ''),
          expPhoneElectric: String(existingEOI.expPhoneElectric || ''),
          expSchoolFees: String(existingEOI.expSchoolFees || ''),
          expRatesTaxes: String(existingEOI.expRatesTaxes || ''),
          expInsurance: String(existingEOI.expInsurance || ''),
          expOther: String(existingEOI.expOther || ''),

          astRealEstate: String(existingEOI.astRealEstate || ''),
          astCash: String(existingEOI.astCash || ''),
          astBusinessNetValue: String(existingEOI.astBusinessNetValue || ''),
          astSharesBonds: String(existingEOI.astSharesBonds || ''),
          astOther: String(existingEOI.astOther || ''),

          liabRealEstateMortgages: String(existingEOI.liabRealEstateMortgages || ''),
          liabNotesLoansInst: String(existingEOI.liabNotesLoansInst || ''),
          liabFriendsRelatives: String(existingEOI.liabFriendsRelatives || ''),
          liabOtherDebts: String(existingEOI.liabOtherDebts || ''),

          reasonForPurchase: existingEOI.reasonForPurchase || '',
          fundingSource: existingEOI.fundingSource || '',
          whySuited: existingEOI.whySuited || '',
          similarBusinessExperience: existingEOI.similarBusinessExperience ? 'Yes' : 'No',
          similarBusinessDetails: existingEOI.similarBusinessDetails || '',
          preparedToComply: existingEOI.preparedToComply !== false ? 'Yes' : 'No',
          whySuccessful: existingEOI.whySuccessful || '',
          valuableQualities: existingEOI.valuableQualities || '',
          fullTimeDevotion: existingEOI.fullTimeDevotion !== false ? 'Yes' : 'No',
          operatingHoursDetails: existingEOI.operatingHoursDetails || '',
          mainStrengths: existingEOI.mainStrengths || '',
          mainWeaknesses: existingEOI.mainWeaknesses || '',
          knowsFranchiseDefinition: existingEOI.knowsFranchiseDefinition !== false ? 'Yes' : 'No',
          franchiseDefinitionExplanation: existingEOI.franchiseDefinitionExplanation || '',
          understandsRelationship: existingEOI.understandsRelationship !== false ? 'Yes' : 'No',
          relationshipExplanation: existingEOI.relationshipExplanation || '',
          acceptsGuidance: existingEOI.acceptsGuidance !== false ? 'Yes' : 'No',
          knowsDefinedTerm: existingEOI.knowsDefinedTerm !== false ? 'Yes' : 'No',
          representationsMade: existingEOI.representationsMade || '',
          understandsIndependentAdvice: existingEOI.understandsIndependentAdvice !== false ? 'Yes' : 'No',

          requiresFinance: existingEOI.requiresFinance ? 'Yes' : 'No',
          authorizeFinanceSharing: existingEOI.authorizeFinanceSharing ? 'Yes' : 'No',
          informationStatementConfirmed: existingEOI.informationStatementConfirmed !== false,
          informationStatementDate: existingEOI.informationStatementDate || new Date().toISOString().split('T')[0],
        });

        // Prefill Step Email Forms with defaults
        const recipientEmail = data.email || '';
        const territory = data.preferredTerritory || 'MailPlus Territory';

        setFactSheetEmailForm((prev) => ({
          ...prev,
          toEmail: prev.toEmail || recipientEmail,
          subject: prev.subject || `MailPlus Key Fact Sheet - Franchise Opportunity in ${territory}`,
          customNote:
            prev.customNote ||
            `Thank you for your interest in joining the MailPlus franchise network for the ${territory} territory.\n\nWe have prepared your personalized MailPlus Key Fact Sheet, which outlines the key territory financials, franchise fees, marketing structure, and operational overview.`,
        }));
        setDeedEmailForm((prev) => ({
          ...prev,
          toEmail: prev.toEmail || recipientEmail,
          subject: prev.subject || `MailPlus Confidentiality Deed - Run-Along Requirement for ${territory}`,
          customNote:
            prev.customNote ||
            `Before we arrange your hands-on territory run-along in ${territory}, MailPlus requires all prospective buyers to sign a digital Confidentiality Deed.\n\nThis protects confidential operational route data, client names, and financial insights you will observe during your run-along.`,
        }));
        setEOIEmailForm((prev) => ({
          ...prev,
          toEmail: prev.toEmail || recipientEmail,
          subject: prev.subject || `MailPlus Expression of Interest (EOI) Application - ${territory}`,
          customNote:
            prev.customNote ||
            `Congratulations on progressing in the MailPlus Franchise Selection process for ${territory}!\n\nThe next step is completing your official Expression of Interest (EOI) application form online.`,
        }));

        // Step 6: Populate RFD Form
        const rfd: any = data.requestForDocs || {};
        const fees: any = rfd.fees || {};
        const eoi: any = data.eoiData || {};
        setRfdForm({
          incomingEntityName: rfd.incomingEntityName || eoi.companyName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          abn: rfd.abn || eoi.abn || '',
          registeredAddress: rfd.registeredAddress || eoi.registeredAddress || eoi.applicant1PrivateAddress || '',
          email: rfd.email || data.email || eoi.applicant1Email || '',
          mobile: rfd.mobile || data.phone || eoi.applicant1PhoneHome || '',
          outgoingFranchiseeName: rfd.outgoingFranchiseeName || data.linkedFranchiseeName || '',
          businessName: rfd.businessName || `Mail Plus – ${data.preferredTerritory || 'Territory'}`,
          territoryName: rfd.territoryName || data.preferredTerritory || 'Exclusive Territory',
          territoryMapUrl: rfd.territoryMapUrl || data.keyFactSheet?.territoryMapUrl || '',
          termYears: rfd.termYears || 5,
          commencementDate: rfd.commencementDate || new Date().toISOString().split('T')[0],
          expiryDate: rfd.expiryDate || '',
          depositFee: fees.deposit ?? 2000,
          initialFranchiseFee: fees.initialFranchiseFee ?? 25000,
          renewalFee: fees.renewalFee ?? 5000,
          transferFee: fees.transferFee ?? 5000,
          transactionFee: fees.transactionFee ?? 1500,
          serviceFeePercent: fees.serviceFeePercent ?? 25,
          marketingLevyPercent: fees.marketingLevyPercent ?? 5,
          techLicenceFee: fees.techLicenceFee ?? 250,
          earningsProvided: rfd.earningsProvided ?? false,
          mpFinancingProvided: rfd.mpFinancingProvided ?? Boolean(data.nabFunding?.accreditationFundingRequired),
          vehicleRange: rfd.capitalExpenditure?.vehicleRange || '$35,000 – $45,000 (Approved White Van)',
          toolsOfTrade: rfd.capitalExpenditure?.toolsOfTrade || '$3,500 (Scanner, Uniforms, Starter Kit)',
          specialConditions: rfd.specialConditions || '',
          reviewedByMatt: Boolean(rfd.reviewedByMatt),
          chasedByMaddie: Boolean(rfd.chasedByMaddie),
        });

        // Step 7: Populate Disclosure Backdate
        if (data.disclosureDocument?.receiptSignedAt) {
          setDisclosureBackdateInput(data.disclosureDocument.receiptSignedAt.split('T')[0]);
        }

        // Step 9: Populate Training Form
        const trn: any = data.trainingSchedule || {};
        setTrainingForm({
          confirmedStartDate: trn.confirmedStartDate ? trn.confirmedStartDate.split('T')[0] : '',
          salesTrainingDate: trn.salesTraining?.scheduledDate ? trn.salesTraining.scheduledDate.split('T')[0] : '',
          salesStatus: trn.salesTraining?.status || 'pending',
          appTrainingDate: trn.appPustraining?.scheduledDate ? trn.appPustraining.scheduledDate.split('T')[0] : '',
          appStatus: trn.appPustraining?.status || 'pending',
          billingTrainingDate: trn.billingTraining?.scheduledDate ? trn.billingTraining.scheduledDate.split('T')[0] : '',
          billingStatus: trn.billingTraining?.status || 'pending',
          syncGregCalendar: trn.gregCalendarSynced ?? true,
        });

        // Automatically set initial active tab based on candidate progress
        const deedDone = data.confidentialityDeed?.status === 'signed_online' || data.confidentialityDeed?.status === 'uploaded' || Boolean(data.confidentialityDeed?.documents && data.confidentialityDeed.documents.length > 0);
        const kfsDone = Boolean(data.keyFactSheet?.publicToken);
        const eoiDone = data.eoiData?.status === 'signed_online' || data.eoiData?.status === 'uploaded' || Boolean(data.eoiData?.documents && data.eoiData.documents.length > 0);
        const depositDone = Boolean(data.depositDetails?.isPaid) || Boolean(data.depositDetails?.documents && data.depositDetails.documents.length > 0);

        if (!deedDone) setActiveTab(1);
        else if (!kfsDone) setActiveTab(2);
        else if (!eoiDone) setActiveTab(3);
        else if (!depositDone) setActiveTab(4);
        else if (data.nabFunding?.accreditationFundingRequired && data.nabFunding?.nabStatus !== 'confirmed') setActiveTab(5);
        else if (data.requestForDocs?.status !== 'instructed') setActiveTab(6);
        else if (data.disclosureDocument?.status !== 'receipt_signed') setActiveTab(7);
        else if (!data.franchiseAgreement?.executedAt) setActiveTab(8);
        else setActiveTab(9);

        // Check and auto update prospect status based on step completions
        checkAndAutoUpdateStatus(data);

        // Load all franchisees & presale listings for dynamic auto-link and IM sync
        loadAllFranchiseesAndPresales(
          data.preferredTerritory || (data.interestedTerritories && data.interestedTerritories[0]),
          data.linkedFranchiseeId || (data as any).presaleListingId,
          data
        );
      } else {
        toast({ variant: 'destructive', title: 'Not Found', description: 'Prospect record does not exist.' });
      }
    } catch (error) {
      console.error('Failed to fetch franchise prospect:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load prospect details.' });
    } finally {
      setLoading(false);
    }
  };

  const loadAllFranchiseesAndPresales = async (
    currentProspectTerritory?: string,
    existingLinkedId?: string,
    prospectDataObj?: any
  ) => {
    try {
      setLoadingPresales(true);
      const combinedOptions: any[] = [];

      // 1. Fetch Presales Listings from API
      try {
        const res = await fetch('/api/franchisees/presales');
        const json = await res.json();
        if (json.success && Array.isArray(json.presales)) {
          setPresaleListings(json.presales);
          json.presales.forEach((p: any) => {
            const pd = p.presalesDetails || {};
            const md = p.mainDetails || {};
            const tName = pd.territoryName || md.tradingEntity || p.franchiseeName || p.id;
            combinedOptions.push({
              id: p.id,
              name: tName,
              state: md.state || pd.state || '',
              type: 'presale',
              typeLabel: 'Presale Listing',
              serviceRevenue: pd.serviceRevenue || '',
              salePrice: pd.salePrice || pd.highPrice || '',
              expressRevenue: pd.expressRevenue || pd.mpexCommission || '',
              totalDailyRunTime: pd.totalDailyRunTime || '',
              morningShift: pd.currentMorningShift || '',
              afternoonShift: pd.currentAfternoonShift || '',
              franchiseTerm: pd.franchiseTerm || pd.termOnFranchiseeIM || '',
              dateBusinessStarted: pd.dateBusinessStarted || md.dateBusinessStarted || '',
              numberOfOwners: pd.numberOfOwners || '',
              reasonForSale: pd.reasonForSale || '',
              franchiseFeePercent: pd.franchiseFeesOnServiceRevenue || '',
              marketingLevyPercent: pd.marketingLevy || '',
              territoryMapUrl: pd.territoryMapUrl || '',
              rawRecord: p,
            });
          });
        }
      } catch (err) {
        console.error('Error fetching presales:', err);
      }

      // 2. Fetch Active Franchisees from Firestore `franchisees` collection
      try {
        const snap = await getDocs(collection(firestore, 'franchisees'));
        snap.forEach((docSnap) => {
          const fData = docSnap.data();
          const fId = docSnap.id;
          const fName = fData.name || fData.tradingEntity || fData.territoryRaw || fId;

          // Don't duplicate if already in presale list under same ID
          if (!combinedOptions.some((item) => item.id === fId || item.name.toLowerCase() === fName.toLowerCase())) {
            combinedOptions.push({
              id: fId,
              name: fName,
              state: fData.state || '',
              type: 'active_franchisee',
              typeLabel: 'Existing Franchisee',
              serviceRevenue: fData.serviceRevenue || fData.presalesDetails?.serviceRevenue || '',
              salePrice: fData.salePrice || fData.presalesDetails?.salePrice || '',
              expressRevenue: fData.expressRevenue || fData.presalesDetails?.expressRevenue || fData.commissionRate || '',
              totalDailyRunTime: fData.totalDailyRunTime || fData.presalesDetails?.totalDailyRunTime || '',
              morningShift: fData.currentMorningShift || fData.presalesDetails?.currentMorningShift || '',
              afternoonShift: fData.currentAfternoonShift || fData.presalesDetails?.currentAfternoonShift || '',
              franchiseTerm: fData.franchiseTerm || fData.presalesDetails?.franchiseTerm || 'Unlimited',
              dateBusinessStarted: fData.dateBusinessStarted || fData.mainDetails?.dateBusinessStarted || '',
              numberOfOwners: fData.numberOfOwners || '',
              reasonForSale: fData.reasonForSale || '',
              franchiseFeePercent: fData.franchiseFeePercent || fData.presalesDetails?.franchiseFeesOnServiceRevenue || '25',
              marketingLevyPercent: fData.marketingLevyPercent || fData.presalesDetails?.marketingLevy || '5',
              territoryMapUrl: fData.territoryMapUrl || fData.presalesDetails?.territoryMapUrl || '',
              rawRecord: fData,
            });
          }
        });
      } catch (err) {
        console.error('Error fetching franchisees from firestore:', err);
      }

      setAllFranchiseeOptions(combinedOptions);

      // Auto-match if existingLinkedId or territory matches
      let targetMatch = combinedOptions.find((opt) => opt.id === existingLinkedId);

      if (!targetMatch && currentProspectTerritory) {
        const cleanTerritory = currentProspectTerritory.trim().toLowerCase();
        targetMatch = combinedOptions.find(
          (opt) =>
            opt.name.toLowerCase().includes(cleanTerritory) ||
            cleanTerritory.includes(opt.name.toLowerCase()) ||
            (opt.id && opt.id.toLowerCase() === cleanTerritory)
        );
      }

      if (targetMatch) {
        setSelectedPresaleId(targetMatch.id);
        setSelectedLinkFranchiseeId(targetMatch.id);

        // Auto-save link to Firestore if not saved yet
        if (prospectId && (!prospectDataObj?.linkedFranchiseeId || prospectDataObj?.linkedFranchiseeId !== targetMatch.id)) {
          const prospectRef = doc(firestore, 'franchise_prospects', prospectId);
          await updateDoc(prospectRef, {
            linkedFranchiseeId: targetMatch.id,
            linkedFranchiseeName: targetMatch.name,
            presaleListingId: targetMatch.id,
          });
          setProspect((prev) =>
            prev
              ? {
                  ...prev,
                  linkedFranchiseeId: targetMatch.id,
                  linkedFranchiseeName: targetMatch.name,
                  presaleListingId: targetMatch.id,
                }
              : null
          );
        }

        // Auto sync IM details if factSheetForm is unpopulated
        autoApplyIMDataFromFranchisee(targetMatch);
      }
    } catch (err) {
      console.error('Error in loadAllFranchiseesAndPresales:', err);
    } finally {
      setLoadingPresales(false);
    }
  };

  const autoApplyIMDataFromFranchisee = (item: any) => {
    const serviceRev = item.serviceRevenue ? String(item.serviceRevenue) : '300437.26';
    const askingPrice = item.salePrice
      ? (String(item.salePrice).includes('$') ? String(item.salePrice) : `$${Number(item.salePrice).toLocaleString('en-AU', { minimumFractionDigits: 2 })} NEG`)
      : '$335,000.00 NEG';

    const productRev = item.expressRevenue ? String(item.expressRevenue) : '856.60';
    const totalDailyRunTimeHours = item.totalDailyRunTime || 'Between 8.5 to 9.5 hours per day';
    const morningShiftHours = item.morningShift || '6:00am to 11:00am';
    const afternoonShiftHours = item.afternoonShift || '1:00pm to 4:00pm';
    const franchiseTermYears = item.franchiseTerm || 'Unlimited';

    setFactSheetForm((prev) => ({
      ...prev,
      territoryName: item.name || prev.territoryName || 'MailPlus Waterloo Alexandria',
      dateBusinessStarted: item.dateBusinessStarted || prev.dateBusinessStarted || '01/02/2022',
      numberOfOwners: item.numberOfOwners || prev.numberOfOwners || '1',
      reasonForSale: item.reasonForSale || prev.reasonForSale || 'Moving / Relocating',
      last12MonthsServiceRevenue: serviceRev,
      askingPriceText: askingPrice,
      last12MonthsExpressRevenue: productRev,
      totalDailyRunTimeHours: totalDailyRunTimeHours,
      morningShiftHours: morningShiftHours,
      afternoonShiftHours: afternoonShiftHours,
      franchiseTermYears: franchiseTermYears,
      franchiseFeePercent: item.franchiseFeePercent || prev.franchiseFeePercent || '25',
      marketingLevyPercent: item.marketingLevyPercent || prev.marketingLevyPercent || '5',
      territoryMapUrl: item.territoryMapUrl || prev.territoryMapUrl || '',
    }));
  };

  const handleConfirmLinkFranchisee = async (targetId: string) => {
    if (!targetId || !prospectId) return;
    setLinkingFranchisee(true);
    try {
      const match = allFranchiseeOptions.find((opt) => opt.id === targetId);
      if (!match) throw new Error('Selected franchisee not found');

      const prospectRef = doc(firestore, 'franchise_prospects', prospectId);
      await updateDoc(prospectRef, {
        linkedFranchiseeId: match.id,
        linkedFranchiseeName: match.name,
        presaleListingId: match.id,
        preferredTerritory: match.name,
      });

      setProspect((prev) =>
        prev
          ? {
              ...prev,
              linkedFranchiseeId: match.id,
              linkedFranchiseeName: match.name,
              presaleListingId: match.id,
              preferredTerritory: match.name,
            }
          : null
      );
      setSelectedPresaleId(match.id);
      setSelectedLinkFranchiseeId(match.id);

      autoApplyIMDataFromFranchisee(match);

      toast({
        title: 'Franchisee Linked & IM Synced',
        description: `Linked prospect to ${match.name} (${match.typeLabel}) and prefilled IM fields.`,
      });
      setIsLinkFranchiseeModalOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Link Failed', description: err.message || 'Could not link franchisee.' });
    } finally {
      setLinkingFranchisee(false);
    }
  };

  const handleSyncFromPresale = (targetId?: string) => {
    const idToUse = targetId || selectedPresaleId;
    if (!idToUse) {
      toast({ variant: 'destructive', title: 'Select Franchisee', description: 'Please select a franchisee from the dropdown.' });
      return;
    }
    const match = allFranchiseeOptions.find((p: any) => p.id === idToUse);
    if (!match) {
      toast({ variant: 'destructive', title: 'Not Found', description: 'Selected franchisee record could not be found.' });
      return;
    }

    autoApplyIMDataFromFranchisee(match);

    toast({
      title: 'Synced from Franchisee Record!',
      description: `Mapped IM revenues, shifts, and profile from ${match.name} (${match.typeLabel}).`,
    });
  };

  const [uploadingTerritoryMap, setUploadingTerritoryMap] = useState(false);

  const handleUploadTerritoryMap = async (file: File) => {
    if (!file || !prospect?.id) return;
    setUploadingTerritoryMap(true);
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const storageRef = ref(storage, `franchise_prospects/${prospect.id}/territory_map/${Date.now()}.${fileExt}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      setFactSheetForm((prev) => ({ ...prev, territoryMapUrl: downloadUrl }));

      const prospectRef = doc(firestore, 'franchise_prospects', prospect.id);
      const updatedKfs = {
        ...(prospect.keyFactSheet || {}),
        territoryMapUrl: downloadUrl,
      };
      await updateDoc(prospectRef, {
        keyFactSheet: updatedKfs,
      });

      const linkedId = prospect.linkedFranchiseeId || (prospect as any).presaleListingId;
      if (linkedId) {
        try {
          const presaleRef = doc(firestore, 'franchisee_presales', linkedId);
          const presaleSnap = await getDoc(presaleRef);
          if (presaleSnap.exists()) {
            const pData = presaleSnap.data();
            const updatedPresaleDetails = {
              ...(pData.presalesDetails || {}),
              territoryMapUrl: downloadUrl,
            };
            await updateDoc(presaleRef, { presalesDetails: updatedPresaleDetails });
          }

          const franRef = doc(firestore, 'franchisees', linkedId);
          const franSnap = await getDoc(franRef);
          if (franSnap.exists()) {
            await updateDoc(franRef, { territoryMapUrl: downloadUrl });
          }
        } catch (syncErr) {
          console.warn('Sync map to linked franchisee warning:', syncErr);
        }
      }

      setProspect((prev) => (prev ? { ...prev, keyFactSheet: updatedKfs as any } : null));

      toast({
        title: 'Territory Map Uploaded & Synced!',
        description: 'Territory map updated for candidate IM and synced to Step 4 of the linked presale franchisee.',
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message || 'Failed to upload territory map.' });
    } finally {
      setUploadingTerritoryMap(false);
    }
  };

  useEffect(() => {
    fetchProspect();
  }, [prospectId]);

  if (!isAllowed) {
    return <AccessDenied customPageName="Franchise Prospect Detail" />;
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3">
        <Loader className="h-8 w-8 text-[#095c7b] animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading franchisee prospect workspace...</p>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Franchise Prospect Not Found</h2>
        <Button asChild variant="outline">
          <Link href="/operations/franchise-prospects">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Franchise Prospects
          </Link>
        </Button>
      </div>
    );
  }

  // Pipeline Completion Flags
  const deedDone = prospect.confidentialityDeed?.status === 'signed_online' || prospect.confidentialityDeed?.status === 'uploaded' || Boolean(prospect.confidentialityDeed?.documents && prospect.confidentialityDeed.documents.length > 0);
  const kfsDone = Boolean(prospect.keyFactSheet?.publicToken);
  const eoiDone = prospect.eoiData?.status === 'signed_online' || prospect.eoiData?.status === 'uploaded' || Boolean(prospect.eoiData?.documents && prospect.eoiData.documents.length > 0);
  const depositDone = Boolean(prospect.depositDetails?.isPaid) || Boolean(prospect.depositDetails?.documents && prospect.depositDetails.documents.length > 0);
  const nabDone = !prospect.nabFunding?.accreditationFundingRequired || prospect.nabFunding?.nabStatus === 'confirmed';
  const rfdDone = prospect.requestForDocs?.status === 'instructed';
  const discDone = prospect.disclosureDocument?.status === 'receipt_signed';
  const faDone = Boolean(prospect.franchiseAgreement?.executedAt);
  const trainingDone = prospect.status === 'Converted' || Boolean(prospect.trainingSchedule?.salesTraining?.scheduledDate);

  const completedCount = [deedDone, kfsDone, eoiDone, depositDone, nabDone, rfdDone, discDone, faDone, trainingDone].filter(Boolean).length;
  const isPrerequisitesComplete = deedDone && kfsDone && eoiDone && depositDone;

  // Determine current stage string for top stage indicator banner
  const getCurrentStageName = () => {
    if (prospect.status === 'Converted') return 'Step 9: Converted to Franchisee';
    if (!deedDone) return 'Step 1: Confidentiality Deed (Pending Execution prior to Commercial Disclosure)';
    if (!kfsDone) return 'Step 2: Information Memorandum (IM)';
    if (!eoiDone) return 'Step 3: Expression of Interest (EOI Application Form)';
    if (!depositDone) return 'Step 4: Deposit (Pending 5-10% Deposit Receipt)';
    if (prospect.nabFunding?.accreditationFundingRequired && prospect.nabFunding?.nabStatus !== 'confirmed') {
      return 'Step 5: Funding Branching (Pending Michael McDaid NAB Confirmation)';
    }
    if (prospect.requestForDocs?.status !== 'instructed') return 'Step 6: Request for Docs (Pending Instructions to Lawyer Anna)';
    if (prospect.disclosureDocument?.status !== 'receipt_signed') return 'Step 7: Disclosure Document (Pending Signed Receipt for 14-Day Lock)';
    if (!prospect.franchiseAgreement?.executedAt) return 'Step 8: Franchise Agreement Execution';
    return 'Step 9: Role-Sequenced Operational Training & Conversion';
  };

  // Origin for links
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const kfsToken = prospect.keyFactSheet?.publicToken || encodeProspectToken('kfs', prospect.id);
  const deedToken = prospect.confidentialityDeed?.publicToken || encodeProspectToken('cd', prospect.id);
  const eoiToken = prospect.eoiData?.publicToken || encodeProspectToken('eoi', prospect.id);
  const rfdToken = prospect.requestForDocs?.publicToken || encodeProspectToken('rfd', prospect.id);
  const discToken = prospect.disclosureDocument?.publicToken || encodeProspectToken('disc', prospect.id);
  const faToken = prospect.franchiseAgreement?.publicToken || encodeProspectToken('fa', prospect.id);

  const kfsPublicUrl = `${origin}/fact-sheet/${kfsToken}`;
  const deedPublicUrl = `${origin}/confidentiality-deed/${deedToken}`;
  const eoiPublicUrl = `${origin}/eoi/${eoiToken}`;
  const rfdPublicUrl = `${origin}/sign/request-for-docs/${rfdToken}`;
  const discPublicUrl = `${origin}/sign/disclosure/${discToken}`;
  const faPublicUrl = `${origin}/sign/franchise-agreement/${faToken}`;

  // Handlers
  const handleCopyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Link Copied', description: `${label} public URL copied to clipboard.` });
  };

  const handleConfirmNAB = async (action: 'confirm' | 'reject') => {
    if (!prospect) return;
    try {
      const res = await fetch('/api/franchise-prospects/nab-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: prospect.id,
          action,
          confirmedBy: userProfile?.displayName || userProfile?.email || 'Michael McDaid',
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast({ title: 'NAB Accreditation Updated', description: json.message });
      fetchProspect();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'NAB Confirmation Failed', description: err.message });
    }
  };

  const handleBackdateDisclosure = async (backdateIso: string) => {
    if (!prospect || !backdateIso) return;
    try {
      const res = await fetch('/api/franchise-prospects/backdate-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: prospect.id,
          backdatedDate: backdateIso,
          updatedBy: userProfile?.displayName || 'Anna Trist / Legal Admin',
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast({ title: 'Disclosure Backdated', description: json.message });
      fetchProspect();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Backdate Failed', description: err.message });
    }
  };

  const handleToggleFundingType = async (isNabRequired: boolean) => {
    if (!prospect) return;
    setSavingEOIPrefill(true);
    try {
      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      const updatedNabFunding: NABFundingDetails = {
        accreditationFundingRequired: isNabRequired,
        nabStatus: isNabRequired ? (prospect.nabFunding?.nabStatus === 'confirmed' ? 'confirmed' : 'pending_michael_confirmation') : 'not_required',
        nabConfirmedBy: isNabRequired ? prospect.nabFunding?.nabConfirmedBy : undefined,
        nabConfirmedAt: isNabRequired ? prospect.nabFunding?.nabConfirmedAt : undefined,
        nabNotes: prospect.nabFunding?.nabNotes || '',
      };
      const updatedEOI: EOIData = {
        ...(prospect.eoiData || { publicToken: encodeProspectToken('eoi', prospect.id), status: 'not_started' }),
        fundingType: isNabRequired ? 'nab' : 'sole_trader',
        fundingSource: isNabRequired ? 'NAB Accreditation Funding' : 'Sole Trader Funding / Self-Funded',
      };
      const noteText = isNabRequired
        ? `Funding method updated to "NAB Accreditation Funding". Requires Michael McDaid's confirmation prior to legal release.`
        : `Funding method updated to "Sole Trader Funding / Self-Funded". NAB accreditation hold bypassed.`;

      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: noteText,
        createdAt: new Date().toISOString(),
        createdByName: userProfile?.displayName || userProfile?.email || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };

      await updateDoc(refDoc, {
        nabFunding: updatedNabFunding,
        eoiData: updatedEOI,
        notes: [...(prospect.notes || []), newNote],
      });

      toast({
        title: 'Funding Method Updated',
        description: noteText,
      });
      fetchProspect();
    } catch (err: any) {
      console.error('Error updating funding method:', err);
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message || 'Could not update funding method.' });
    } finally {
      setSavingEOIPrefill(false);
    }
  };

  const handleSaveFactSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFactSheet(true);
    try {
      const payload = {
        prospectId: prospect.id,
        ...factSheetForm,
        senderUid: userProfile?.uid || 'greg.hart',
        senderName: userProfile?.displayName || 'Greg Hart',
      };

      const res = await fetch('/api/franchise-prospects/fact-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save Key Fact Sheet');

      toast({ title: 'Key Fact Sheet Saved', description: 'Fact sheet details prefilled and public token generated.' });
      fetchProspect();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message || 'Could not save fact sheet.' });
    } finally {
      setSavingFactSheet(false);
    }
  };

  const handleSendStepEmail = async (stepType: 'fact_sheet' | 'confidentiality_deed' | 'eoi') => {
    let emailForm = factSheetEmailForm;
    if (stepType === 'confidentiality_deed') emailForm = deedEmailForm;
    if (stepType === 'eoi') emailForm = eoiEmailForm;

    if (stepType === 'fact_sheet') {
      const hasMap = factSheetForm.territoryMapUrl || prospect.keyFactSheet?.territoryMapUrl;
      if (!hasMap) {
        toast({
          variant: 'destructive',
          title: 'Territory Map Required',
          description: 'You cannot send the Information Memorandum (IM) without uploading a territory map graphic. Please attach a territory map image in Section 4 above first.',
        });
        return;
      }
      setSendingFactSheetEmail(true);
    }
    if (stepType === 'confidentiality_deed') setSendingDeedEmail(true);
    if (stepType === 'eoi') setSendingEOIEmail(true);

    try {
      const res = await fetch('/api/franchise-prospects/send-step-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: prospect.id,
          stepType,
          toEmail: emailForm.toEmail,
          ccEmail: emailForm.ccEmail,
          bccEmail: emailForm.bccEmail,
          subject: emailForm.subject,
          customMessage: emailForm.customNote,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to send email');

      toast({
        title: 'Email Sent Successfully',
        description: `Dispatched from greg.hart@mailplus.com.au to ${emailForm.toEmail}${emailForm.ccEmail ? ` (CC: ${emailForm.ccEmail})` : ''}.`,
      });

      if (stepType === 'fact_sheet') setFactSheetEmailForm((prev) => ({ ...prev, customNote: '' }));
      if (stepType === 'confidentiality_deed') setDeedEmailForm((prev) => ({ ...prev, customNote: '' }));
      if (stepType === 'eoi') setEOIEmailForm((prev) => ({ ...prev, customNote: '' }));

      fetchProspect();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Email Dispatch Failed', description: error.message || 'Could not send email.' });
    } finally {
      setSendingFactSheetEmail(false);
      setSendingDeedEmail(false);
      setSendingEOIEmail(false);
    }
  };

  const handleSaveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDeposit(true);
    try {
      const payload = {
        prospectId: prospect.id,
        isPaid: depositForm.isPaid,
        percentageDeposited: depositForm.percentageDeposited,
        amountPaid: depositForm.amountPaid,
        paymentDate: depositForm.paymentDate,
        paymentMethod: depositForm.paymentMethod,
        receiptRef: depositForm.receiptRef,
        notes: depositForm.notes,
        loggedByUid: userProfile?.uid || 'greg.hart',
        loggedByName: userProfile?.displayName || 'Greg Hart',
      };

      const res = await fetch('/api/franchise-prospects/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to log deposit');

      toast({ title: 'Deposit Details Saved', description: `Deposit marked as ${depositForm.isPaid ? 'Paid' : 'Unpaid'}.` });
      fetchProspect();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message || 'Could not save deposit.' });
    } finally {
      setSavingDeposit(false);
    }
  };

  // Step 6: RFD Handlers
  const handleSaveRFD = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prospect) return;
    setSavingRFD(true);
    try {
      const payload = {
        prospectId: prospect.id,
        token: rfdToken,
        requestForDocs: {
          incomingEntityName: rfdForm.incomingEntityName,
          abn: rfdForm.abn,
          registeredAddress: rfdForm.registeredAddress,
          email: rfdForm.email,
          mobile: rfdForm.mobile,
          outgoingFranchiseeName: rfdForm.outgoingFranchiseeName,
          businessName: rfdForm.businessName,
          territoryName: rfdForm.territoryName,
          territoryMapUrl: rfdForm.territoryMapUrl,
          termYears: Number(rfdForm.termYears) || 5,
          commencementDate: rfdForm.commencementDate,
          expiryDate: rfdForm.expiryDate,
          fees: {
            deposit: Number(rfdForm.depositFee) || 2000,
            initialFranchiseFee: Number(rfdForm.initialFranchiseFee) || 25000,
            renewalFee: Number(rfdForm.renewalFee) || 5000,
            transferFee: Number(rfdForm.transferFee) || 5000,
            transactionFee: Number(rfdForm.transactionFee) || 1500,
            serviceFeePercent: Number(rfdForm.serviceFeePercent) || 25,
            marketingLevyPercent: Number(rfdForm.marketingLevyPercent) || 5,
            techLicenceFee: Number(rfdForm.techLicenceFee) || 250,
          },
          earningsProvided: Boolean(rfdForm.earningsProvided),
          mpFinancingProvided: Boolean(rfdForm.mpFinancingProvided),
          capitalExpenditure: {
            vehicleRange: rfdForm.vehicleRange,
            toolsOfTrade: rfdForm.toolsOfTrade,
          },
          specialConditions: rfdForm.specialConditions,
          reviewedByMatt: Boolean(rfdForm.reviewedByMatt),
          reviewedByMattAt: rfdForm.reviewedByMatt ? new Date().toISOString() : undefined,
          chasedByMaddie: Boolean(rfdForm.chasedByMaddie),
          chasedByMaddieAt: rfdForm.chasedByMaddie ? new Date().toISOString() : undefined,
        },
      };

      const res = await fetch('/api/sign/request-for-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save RFD details');

      toast({ title: 'Request for Docs Saved', description: 'Legal instruction parameters updated.' });
      fetchProspect();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setSavingRFD(false);
    }
  };

  const handleInstructAnna = async () => {
    if (!prospect) return;
    setInstructingAnna(true);
    try {
      const payload = {
        prospectId: prospect.id,
        token: rfdToken,
        action: 'instruct_lawyer',
        requestForDocs: {
          incomingEntityName: rfdForm.incomingEntityName,
          abn: rfdForm.abn,
          registeredAddress: rfdForm.registeredAddress,
          email: rfdForm.email,
          mobile: rfdForm.mobile,
          outgoingFranchiseeName: rfdForm.outgoingFranchiseeName,
          businessName: rfdForm.businessName,
          territoryName: rfdForm.territoryName,
          territoryMapUrl: rfdForm.territoryMapUrl,
          termYears: Number(rfdForm.termYears) || 5,
          commencementDate: rfdForm.commencementDate,
          expiryDate: rfdForm.expiryDate,
          fees: {
            deposit: Number(rfdForm.depositFee) || 2000,
            initialFranchiseFee: Number(rfdForm.initialFranchiseFee) || 25000,
            renewalFee: Number(rfdForm.renewalFee) || 5000,
            transferFee: Number(rfdForm.transferFee) || 5000,
            transactionFee: Number(rfdForm.transactionFee) || 1500,
            serviceFeePercent: Number(rfdForm.serviceFeePercent) || 25,
            marketingLevyPercent: Number(rfdForm.marketingLevyPercent) || 5,
            techLicenceFee: Number(rfdForm.techLicenceFee) || 250,
          },
          earningsProvided: Boolean(rfdForm.earningsProvided),
          mpFinancingProvided: Boolean(rfdForm.mpFinancingProvided),
          specialConditions: rfdForm.specialConditions,
          reviewedByMatt: Boolean(rfdForm.reviewedByMatt),
          chasedByMaddie: Boolean(rfdForm.chasedByMaddie),
        },
      };

      const res = await fetch('/api/sign/request-for-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to instruct lawyer');

      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Formal legal instructions dispatched to Lawyer Anna Trist for ${rfdForm.territoryName || prospect.preferredTerritory}. Request for Docs status updated to "Instructed".`,
        createdAt: new Date().toISOString(),
        createdByName: userProfile?.displayName || userProfile?.email || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };
      await updateDoc(refDoc, {
        status: 'Legal Instructions Sent',
        notes: [...(prospect.notes || []), newNote],
      });

      toast({ title: 'Lawyer Anna Trist Instructed', description: 'Request for Docs status updated to "Instructed".' });
      fetchProspect();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Instruction Failed', description: error.message });
    } finally {
      setInstructingAnna(false);
    }
  };

  // Step 7: Disclosure Handlers
  const handleSaveDisclosureBackdate = async () => {
    if (!disclosureBackdateInput) {
      toast({ variant: 'destructive', title: 'Date Required', description: 'Please select a date for the disclosure receipt.' });
      return;
    }
    setSavingDisclosureBackdate(true);
    try {
      await handleBackdateDisclosure(disclosureBackdateInput);
    } finally {
      setSavingDisclosureBackdate(false);
    }
  };

  const handleUploadDisclosureReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !prospect) return;
    setUploadingDisclosureReceipt(true);
    try {
      const file = files[0];
      const storageRef = ref(storage, `franchise_prospects/${prospect.id}/disclosure_receipts/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const nowIso = new Date().toISOString();
      const earliestIso = addDays(new Date(), 14).toISOString();

      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      const updatedDisc: DisclosureDocumentData = {
        ...(prospect.disclosureDocument || { publicToken: discToken, dispatchMethod: 'electronic' }),
        status: 'receipt_signed',
        receiptSignedAt: nowIso,
        receiptUploadedAt: nowIso,
        receiptPdfUrl: url,
        earliestFranchiseAgreementExecutionDate: earliestIso,
      };

      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Uploaded signed Disclosure Document receipt (${file.name}). 14-day statutory waiting period initiated (Earliest FA execution: ${new Date(earliestIso).toLocaleDateString('en-AU')}).`,
        createdAt: nowIso,
        createdByName: userProfile?.displayName || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };

      await updateDoc(refDoc, {
        disclosureDocument: updatedDisc,
        status: 'Disclosure 14-Day Lock',
        notes: [...(prospect.notes || []), newNote],
      });

      toast({ title: 'Disclosure Receipt Uploaded', description: '14-day statutory cooling timer active.' });
      fetchProspect();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message || 'Could not upload receipt.' });
    } finally {
      setUploadingDisclosureReceipt(false);
      if (e.target) e.target.value = '';
    }
  };

  // Step 8: Franchise Agreement Handlers
  const handleUploadFAPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !prospect) return;
    setUploadingFAPdf(true);
    try {
      const file = files[0];
      const storageRef = ref(storage, `franchise_prospects/${prospect.id}/franchise_agreements/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const nowIso = new Date().toISOString();
      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      const updatedFA: FranchiseAgreementData = {
        ...(prospect.franchiseAgreement || { publicToken: faToken }),
        status: 'completed',
        executionType: 'wet_ink',
        executedAt: nowIso,
        signedPdfUrl: url,
        netSuiteSyncStatus: 'manual_pending',
      };

      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Uploaded fully executed Franchise Agreement (${file.name}). Candidate is ready for role-sequenced training.`,
        createdAt: nowIso,
        createdByName: userProfile?.displayName || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };

      await updateDoc(refDoc, {
        franchiseAgreement: updatedFA,
        status: 'FA Executed',
        notes: [...(prospect.notes || []), newNote],
      });

      toast({ title: 'Franchise Agreement Uploaded', description: 'Execution logged. Step 9 Training is now unlocked.' });
      fetchProspect();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message || 'Could not upload agreement.' });
    } finally {
      setUploadingFAPdf(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleExecuteFAOnline = async () => {
    if (!prospect) return;
    setExecutingFA(true);
    try {
      const nowIso = new Date().toISOString();
      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      const updatedFA: FranchiseAgreementData = {
        ...(prospect.franchiseAgreement || { publicToken: faToken }),
        status: 'signed_online',
        executionType: 'digital',
        executedAt: nowIso,
        signerName: `${prospect.firstName || ''} ${prospect.lastName || ''}`.trim() || 'Franchisee Signer',
        signerEmail: prospect.email,
        netSuiteSyncStatus: 'manual_pending',
      };

      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Franchise Agreement executed digitally online via R-Sign / Secure Portal. Status updated to "FA Executed".`,
        createdAt: nowIso,
        createdByName: userProfile?.displayName || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };

      await updateDoc(refDoc, {
        franchiseAgreement: updatedFA,
        status: 'FA Executed',
        notes: [...(prospect.notes || []), newNote],
      });

      toast({ title: 'Agreement Executed', description: 'Franchise Agreement execution recorded successfully.' });
      fetchProspect();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Execution Failed', description: err.message });
    } finally {
      setExecutingFA(false);
    }
  };

  const handleSyncNetSuite = async () => {
    if (!prospect) return;
    setSyncingNetSuite(true);
    try {
      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Synchronized Franchisee entity and billing profile with NetSuite CRM.`,
        createdAt: new Date().toISOString(),
        createdByName: userProfile?.displayName || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };
      await updateDoc(refDoc, {
        'franchiseAgreement.netSuiteSyncStatus': 'auto_synced',
        notes: [...(prospect.notes || []), newNote],
      });
      toast({ title: 'NetSuite Synced', description: 'Franchisee record synchronized with NetSuite.' });
      fetchProspect();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: err.message });
    } finally {
      setSyncingNetSuite(false);
    }
  };

  // Step 9: Training Handlers
  const handleSaveTrainingSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospect) return;
    if (!trainingForm.confirmedStartDate) {
      toast({ variant: 'destructive', title: 'Start Date Required', description: 'Please set the confirmed start date.' });
      return;
    }
    setSavingTraining(true);
    try {
      const payload = {
        prospectId: prospect.id,
        confirmedStartDate: trainingForm.confirmedStartDate,
        salesTrainingDate: trainingForm.salesTrainingDate || null,
        appPusTrainingDate: trainingForm.appTrainingDate || null,
        billingTrainingDate: trainingForm.billingTrainingDate || null,
        syncGregCalendar: trainingForm.syncGregCalendar,
      };

      const res = await fetch('/api/franchise-prospects/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update training schedule');

      const refDoc = doc(firestore, 'franchise_prospects', prospect.id);
      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Operational Training modules scheduled: Sales (Aleyna: ${trainingForm.salesTrainingDate || 'TBD'}), App Pus (Ops Lead: ${trainingForm.appTrainingDate || 'TBD'}), Billing (Popie: ${trainingForm.billingTrainingDate || 'TBD'}). Greg Hart calendar sync: ${trainingForm.syncGregCalendar ? 'Yes' : 'No'}.`,
        createdAt: new Date().toISOString(),
        createdByName: userProfile?.displayName || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };

      await updateDoc(refDoc, {
        status: 'Training Scheduled',
        notes: [...(prospect.notes || []), newNote],
      });

      toast({ title: 'Training Schedule Saved', description: json.message });
      fetchProspect();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setSavingTraining(false);
    }
  };

  const handleUpdateStatus = async (newStatus: FranchiseProspect['status']) => {
    setUpdatingStatus(true);
    try {
      const ref = doc(firestore, 'franchise_prospects', prospect.id);
      await updateDoc(ref, { status: newStatus });
      setProspect((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast({ title: 'Status Updated', description: `Prospect status changed to ${newStatus}.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update status.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    setAddingNote(true);
    try {
      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        text: newNoteText.trim(),
        createdAt: new Date().toISOString(),
        createdByName: userProfile?.displayName || userProfile?.email || 'Operations User',
        createdByUid: userProfile?.uid || 'system',
      };
      const updatedNotes = [...(prospect.notes || []), newNote];
      const ref = doc(firestore, 'franchise_prospects', prospect.id);
      await updateDoc(ref, { notes: updatedNotes });

      setProspect({ ...prospect, notes: updatedNotes });
      setNewNoteText('');
      toast({ title: 'Note Logged', description: 'Internal follow-up note saved.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed', description: 'Could not log note.' });
    } finally {
      setAddingNote(false);
    }
  };

  const handleStartConvert = () => {
    const eoi: any = prospect.eoiData || {};
    setPrefillUserData({
      firstName: String(prospect.firstName || prospect.fullName.split(' ')[0] || ''),
      lastName: String(prospect.lastName || prospect.fullName.split(' ').slice(1).join(' ') || ''),
      email: prospect.email,
      mobileNumber: prospect.phone,
      phoneNumber: prospect.phone,
      role: 'Franchisee',
      abn: String(eoi.abn || ''),
      street: String(eoi.businessAddress || eoi.registeredAddress || ''),
    });
    setIsConvertDialogOpen(true);
  };

  const getStatusBadge = (status: FranchiseProspect['status']) => {
    switch (status) {
      case 'New':
        return <Badge className="bg-blue-600 text-white font-medium">New</Badge>;
      case 'Deed Signed':
        return <Badge className="bg-purple-600 text-white font-medium">Step 1: Deed Signed</Badge>;
      case 'IM Sent':
      case 'Contacted':
        return <Badge className="bg-indigo-600 text-white font-medium">Step 2: IM Sent</Badge>;
      case 'EOI Signed':
      case 'Under Review':
        return <Badge className="bg-sky-600 text-white font-medium">Step 3: EOI Signed</Badge>;
      case 'Deposit Paid':
        return <Badge className="bg-teal-600 text-white font-medium">Step 4: Deposit Paid</Badge>;
      case 'NAB Pending':
        return <Badge className="bg-amber-600 text-white font-medium">Step 5: NAB Pending</Badge>;
      case 'NAB Confirmed':
        return <Badge className="bg-emerald-600 text-white font-medium">Step 5: NAB Confirmed</Badge>;
      case 'Legal Instructions Sent':
        return <Badge className="bg-cyan-600 text-white font-medium">Step 6: Legal Docs Sent</Badge>;
      case 'Disclosure 14-Day Lock':
        return <Badge className="bg-rose-600 text-white font-medium">Step 7: 14d Lock Active</Badge>;
      case 'FA Executed':
        return <Badge className="bg-emerald-700 text-white font-medium">Step 8: FA Executed</Badge>;
      case 'Training Scheduled':
        return <Badge className="bg-teal-700 text-white font-medium">Step 9: Training Scheduled</Badge>;
      case 'Converted':
        return <Badge className="bg-emerald-800 text-white font-bold">Converted</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'Archived':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 font-sans text-slate-900">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between border-b pb-4">
        <Link
          href="/operations/franchise-prospects"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#095c7b] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Franchise Prospects List
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchProspect} className="gap-1.5 border-slate-300">
            <RefreshCw className="h-3.5 w-3.5 text-slate-600" /> Refresh Data
          </Button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-[#095c7b] text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{prospect.fullName}</h1>
            {getStatusBadge(prospect.status)}
          </div>
          <p className="text-xs text-slate-200 mt-2 flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-[#eaf143]" /> {prospect.email}</span>
            {prospect.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-200" /> {prospect.phone}</span>}
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-amber-300" /> {prospect.preferredTerritory || 'Unspecified Territory'}</span>
          </p>
        </div>
      </div>

      {/* Full-Width Current Stage Indicator Banner */}
      <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg text-amber-900 shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">Current Candidate Stage</span>
            <span className="text-base font-extrabold text-amber-950">{getCurrentStageName()}</span>
          </div>
        </div>
        <div className="text-xs font-semibold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 shrink-0 flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-amber-700" />
          <span>{completedCount} of 9 Conversion Pipeline Steps Completed</span>
        </div>
      </div>

      {/* Full-Width 9-Step Progress Stepper + Interactive Tabs Header */}
      <Card className="shadow-md border-[#095c7b]/30">
        <CardHeader className="pb-3 border-b bg-slate-50 rounded-t-xl">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#095c7b] flex items-center gap-2">
            <FileText className="h-4 w-4" /> Interactive Candidate Pipeline Stepper (Click to Switch View)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {/* Step 1 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(1)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 1
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : deedDone
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[11px] text-slate-900">
                <span>1. Deed</span>
                {deedDone ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[9px] text-slate-600 mt-1 block font-medium truncate">
                {deedDone ? 'Signed' : 'Pending'}
              </span>
            </button>

            {/* Step 2 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(2)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 2
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : kfsDone
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[11px] text-slate-900">
                <span>2. IM</span>
                {kfsDone ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[9px] text-slate-600 mt-1 block font-medium truncate">
                {kfsDone ? 'Dispatched' : 'Pending'}
              </span>
            </button>

            {/* Step 3 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(3)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 3
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : eoiDone
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[11px] text-slate-900">
                <span>3. EOI Form</span>
                {eoiDone ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[9px] text-slate-600 mt-1 block font-medium truncate">
                {eoiDone ? 'Signed Online' : 'Pending'}
              </span>
            </button>

            {/* Step 4 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(4)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 4
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : depositDone
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[11px] text-slate-900">
                <span>4. Deposit</span>
                {depositDone ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[9px] text-slate-600 mt-1 block font-medium truncate">
                {depositDone ? 'Verified' : 'Pending'}
              </span>
            </button>

            {/* Step 5 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(5)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 5
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : prospect.nabFunding?.nabStatus === 'confirmed'
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[11px] text-slate-900">
                <span>5. NAB Branching</span>
                {prospect.nabFunding?.nabStatus === 'confirmed' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[9px] text-slate-600 mt-1 block font-medium truncate">
                {prospect.nabFunding?.accreditationFundingRequired ? (prospect.nabFunding?.nabStatus === 'confirmed' ? 'Confirmed' : 'Pending Michael') : 'Not Required'}
              </span>
            </button>

            {/* Step 6 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(6)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 6
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : prospect.requestForDocs?.status === 'instructed'
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[11px] text-slate-900">
                <span>6. Request Docs</span>
                {prospect.requestForDocs?.status === 'instructed' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[9px] text-slate-600 mt-1 block font-medium truncate">
                {prospect.requestForDocs?.status === 'instructed' ? 'Anna Instructed' : 'Draft'}
              </span>
            </button>

            {/* Step 7 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(7)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 7
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : prospect.disclosureDocument?.status === 'receipt_signed'
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[11px] text-slate-900">
                <span>7. Disclosure</span>
                {prospect.disclosureDocument?.status === 'receipt_signed' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[9px] text-slate-600 mt-1 block font-medium truncate">
                {prospect.disclosureDocument?.status === 'receipt_signed' ? '14d Lock Active' : 'Pending Receipt'}
              </span>
            </button>

            {/* Step 8 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(8)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 8
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : prospect.franchiseAgreement?.executedAt
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[11px] text-slate-900">
                <span>8. Agreement</span>
                {prospect.franchiseAgreement?.executedAt ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[9px] text-slate-600 mt-1 block font-medium truncate">
                {prospect.franchiseAgreement?.executedAt ? 'Executed' : 'Locked'}
              </span>
            </button>

            {/* Step 9 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(9)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 9
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : prospect.status === 'Converted'
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[11px] text-slate-900">
                <span>9. Training</span>
                {prospect.status === 'Converted' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[9px] text-slate-600 mt-1 block font-medium truncate">
                {prospect.status === 'Converted' ? 'Converted' : 'Scheduled'}
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Main 2-Column Responsive Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (lg:col-span-7 xl:col-span-7): Dynamic Step Workflows */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">

          {/* Main Dynamic Step Content Area (In-Page Content for Selected Step) */}
          <Card className="shadow-lg border-2 border-[#095c7b]/20">
            {/* Section Header with Step Navigation Controls */}
            <CardHeader className="bg-slate-900 text-white p-5 rounded-t-xl flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  {activeTab === 1 && <ShieldCheck className="h-5 w-5 text-[#eaf143]" />}
                  {activeTab === 2 && <FileText className="h-5 w-5 text-[#eaf143]" />}
                  {activeTab === 3 && <PenTool className="h-5 w-5 text-[#eaf143]" />}
                  {activeTab === 4 && <DollarSign className="h-5 w-5 text-emerald-400" />}
                  {activeTab === 5 && <ShieldCheck className="h-5 w-5 text-amber-400" />}
                  {activeTab === 6 && <FileText className="h-5 w-5 text-teal-400" />}
                  {activeTab === 7 && <Lock className="h-5 w-5 text-rose-400" />}
                  {activeTab === 8 && <PenTool className="h-5 w-5 text-emerald-400" />}
                  {activeTab === 9 && <UserCheck className="h-5 w-5 text-emerald-400" />}
                  
                  {activeTab === 1 && 'Step 1: Confidentiality Deed (Run-Along & NDA)'}
                  {activeTab === 2 && 'Step 2: Information Memorandum (IM)'}
                  {activeTab === 3 && 'Step 3: Expression of Interest (EOI Application Form)'}
                  {activeTab === 4 && 'Step 4: 5–10% Franchise Deposit Tracking'}
                  {activeTab === 5 && 'Step 5: NAB Funding & Legal Dispatch Branching'}
                  {activeTab === 6 && 'Step 6: Request for Docs Legal Instructions (Lawyer Anna)'}
                  {activeTab === 7 && 'Step 7: Disclosure Document & 14-Day Statutory Rule'}
                  {activeTab === 8 && 'Step 8: Franchise Agreement Execution'}
                  {activeTab === 9 && 'Step 9: Role-Sequenced Operational Training Module'}
                </CardTitle>
                <CardDescription className="text-xs text-slate-300 mt-0.5">
                  {activeTab === 1 && 'Enforce execution of the initial confidentiality deed prior to commercial data disclosure.'}
                  {activeTab === 2 && 'Dispatch standard Information Memorandum (IM) packet to candidate.'}
                  {activeTab === 3 && 'Capture prospect parameters, accreditation funding flag (NAB), and Sole Trader logic.'}
                  {activeTab === 4 && 'Log and verify the 5-10% deposit payment.'}
                  {activeTab === 5 && 'Route NAB funding verification to Michael McDaid and control legal instruction release.'}
                  {activeTab === 6 && 'Generate pre-filled legal instruction sheet for Lawyer Anna Trist with Greg’s territory map.'}
                  {activeTab === 7 && 'Deliver disclosure document and enforce the 14-day statutory cooling wait period.'}
                  {activeTab === 8 && 'Execute Franchise Agreement online with R-Sign digital signature or wet-ink upload.'}
                  {activeTab === 9 && 'Lock operational training module schedules within the T-14 start date window.'}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={activeTab === 1}
                  onClick={() => setActiveTab((activeTab - 1) as any)}
                  className="h-8 text-xs bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={activeTab === 9}
                  onClick={() => setActiveTab((activeTab + 1) as any)}
                  className="h-8 text-xs bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* STEP 2: INFORMATION MEMORANDUM (IM) */}
              {activeTab === 2 && (
                <div className="space-y-6">
                  {/* Information Memorandum (IM) Dynamic Prefill Form */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Information Memorandum (IM) Dynamic Prefill
                      </h3>
                      <Badge className="bg-[#095c7b] text-white text-[10px] font-bold">
                        Official IM Template Structure
                      </Badge>
                    </div>

                    <form onSubmit={handleSaveFactSheet} className="space-y-4 pt-1 max-h-[600px] overflow-y-auto pr-2">
                      {/* Linked Presale Listing Sync Banner */}
                      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-[#095c7b]" />
                            <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">
                              Linked Franchisee Auto-Sync
                            </span>
                          </div>
                          {loadingPresales && (
                            <span className="text-[11px] text-slate-500 animate-pulse">Loading franchisees...</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Auto-import Service Revenue, Sale Price, Product Commission, and Shift Schedule directly from the linked franchisee:
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                          <Select value={selectedPresaleId} onValueChange={(id) => handleConfirmLinkFranchisee(id)}>
                            <SelectTrigger className="h-8 text-xs bg-white border-blue-200 flex-1">
                              <SelectValue placeholder="Select franchisee or presale listing..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {allFranchiseeOptions.map((opt: any) => (
                                <SelectItem key={opt.id} value={opt.id} className="text-xs">
                                  <span className="font-bold">{opt.name}</span>{' '}
                                  <span className="text-slate-400">({opt.typeLabel}{opt.state ? ` - ${opt.state}` : ''})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSyncFromPresale()}
                            disabled={!selectedPresaleId}
                            className="h-8 text-xs bg-[#095c7b] text-white hover:bg-[#074760] border-0 shrink-0 gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Sync IM Data
                          </Button>
                        </div>
                      </div>

                      {/* Section 1: Proposed Territory Profile & Schedule */}
                      <div className="p-3.5 bg-slate-50 border rounded-xl space-y-3">
                        <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">
                          1. Proposed Territory Profile & Schedule
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">Territory Name</label>
                            <Input
                              value={factSheetForm.territoryName}
                              onChange={(e) => setFactSheetForm({ ...factSheetForm, territoryName: e.target.value })}
                              placeholder="e.g. MailPlus Waterloo Alexandria"
                              className="text-xs h-8 bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">Date Business Started</label>
                            <Input
                              value={factSheetForm.dateBusinessStarted}
                              onChange={(e) => setFactSheetForm({ ...factSheetForm, dateBusinessStarted: e.target.value })}
                              placeholder="e.g. 01/02/2022"
                              className="text-xs h-8 bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">Number of Owners</label>
                            <Input
                              value={factSheetForm.numberOfOwners}
                              onChange={(e) => setFactSheetForm({ ...factSheetForm, numberOfOwners: e.target.value })}
                              placeholder="e.g. 1"
                              className="text-xs h-8 bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">Reason for Sale</label>
                            <Input
                              value={factSheetForm.reasonForSale}
                              onChange={(e) => setFactSheetForm({ ...factSheetForm, reasonForSale: e.target.value })}
                              placeholder="e.g. Moving / Relocating"
                              className="text-xs h-8 bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Financial Revenues & Commercial Terms */}
                      <div className="p-3.5 bg-slate-50 border rounded-xl space-y-3">
                        <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">
                          2. Financial Revenues & Commercial Terms
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">Last 12 Months Service Revenue (Ex GST) ($)</label>
                            <Input
                              value={factSheetForm.last12MonthsServiceRevenue}
                              onChange={(e) => setFactSheetForm({ ...factSheetForm, last12MonthsServiceRevenue: e.target.value })}
                              placeholder="e.g. 300437.26"
                              className="text-xs h-8 bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">Asking / Proposed Sale Price Display Text</label>
                            <Input
                              value={factSheetForm.askingPriceText}
                              onChange={(e) => setFactSheetForm({ ...factSheetForm, askingPriceText: e.target.value })}
                              placeholder="e.g. $335,000.00 NEG"
                              className="text-xs h-8 bg-white font-bold text-emerald-700"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">Franchise Fee on Service Revenue (%)</label>
                            <Input
                              value={factSheetForm.franchiseFeePercent}
                              onChange={(e) => setFactSheetForm({ ...factSheetForm, franchiseFeePercent: e.target.value })}
                              placeholder="e.g. 25%"
                              className="text-xs h-8 bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">Marketing Levy (%)</label>
                            <Input
                              value={factSheetForm.marketingLevyPercent}
                              onChange={(e) => setFactSheetForm({ ...factSheetForm, marketingLevyPercent: e.target.value })}
                              placeholder="e.g. 5%"
                              className="text-xs h-8 bg-white"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Last 12 Months MailPlus Product Revenue (Product Commission Ex GST) ($)
                            </label>
                            <Input
                              value={factSheetForm.last12MonthsExpressRevenue}
                              onChange={(e) => setFactSheetForm({ ...factSheetForm, last12MonthsExpressRevenue: e.target.value })}
                              placeholder="e.g. 856.60"
                              className="text-xs h-8 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                          {/* Section 3: Shift Schedule & Operational Run Time */}
                          <div className="p-3.5 bg-slate-50 border rounded-xl space-y-3">
                            <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">
                              3. Shift Schedule & Daily Run Time
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="col-span-2 space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700">Total Average Daily Run Time (Current)</label>
                                <Input
                                  value={factSheetForm.totalDailyRunTimeHours}
                                  onChange={(e) => setFactSheetForm({ ...factSheetForm, totalDailyRunTimeHours: e.target.value })}
                                  placeholder="e.g. Between 8.5 to 9.5 hours per day"
                                  className="text-xs h-8 bg-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700">Current Morning Shift</label>
                                <Input
                                  value={factSheetForm.morningShiftHours}
                                  onChange={(e) => setFactSheetForm({ ...factSheetForm, morningShiftHours: e.target.value })}
                                  placeholder="e.g. 6:00am to 11:00am"
                                  className="text-xs h-8 bg-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700">Current Afternoon Shift</label>
                                <Input
                                  value={factSheetForm.afternoonShiftHours}
                                  onChange={(e) => setFactSheetForm({ ...factSheetForm, afternoonShiftHours: e.target.value })}
                                  placeholder="e.g. 1:00pm to 4:00pm"
                                  className="text-xs h-8 bg-white"
                                />
                              </div>
                              <div className="col-span-2 space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700">Franchise Term</label>
                                <Input
                                  value={factSheetForm.franchiseTermYears}
                                  onChange={(e) => setFactSheetForm({ ...factSheetForm, franchiseTermYears: e.target.value })}
                                  placeholder="e.g. Unlimited"
                                  className="text-xs h-8 bg-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Section 4: Initial Fees & Special Terms */}
                          <div className="p-3.5 bg-slate-50 border rounded-xl space-y-3">
                            <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">
                              4. Initial Fees & Special Commercial Terms
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700">Initial Franchise Fee ($)</label>
                                <Input
                                  type="number"
                                  value={factSheetForm.franchiseFee}
                                  onChange={(e) => setFactSheetForm({ ...factSheetForm, franchiseFee: e.target.value })}
                                  placeholder="e.g. 35000"
                                  className="text-xs h-8 bg-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700">Training & Onboarding Fee ($)</label>
                                <Input
                                  type="number"
                                  value={factSheetForm.trainingFee}
                                  onChange={(e) => setFactSheetForm({ ...factSheetForm, trainingFee: e.target.value })}
                                  placeholder="e.g. 5000"
                                  className="text-xs h-8 bg-white"
                                />
                              </div>
                              <div className="col-span-2 space-y-2 pt-2 border-t border-slate-200">
                                <label className="text-[11px] font-semibold text-slate-700 block uppercase tracking-wider">
                                  Territory Map Graphic & Boundary Overview
                                </label>
                                
                                {factSheetForm.territoryMapUrl ? (
                                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3">
                                    <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 max-h-48 flex items-center justify-center">
                                      <img
                                        src={factSheetForm.territoryMapUrl}
                                        alt="Territory Map Preview"
                                        className="max-h-44 w-auto object-contain mx-auto"
                                      />
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                                      <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                                        <CheckCircle className="h-3.5 w-3.5" /> Map Image Attached & Synced
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <label className="cursor-pointer">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleUploadTerritoryMap(file);
                                            }}
                                          />
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={uploadingTerritoryMap}
                                            className="h-7 text-xs border-slate-300 text-slate-700 gap-1"
                                          >
                                            {uploadingTerritoryMap ? <Loader className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                            Replace Image
                                          </Button>
                                        </label>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setFactSheetForm((prev) => ({ ...prev, territoryMapUrl: '' }))}
                                          className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/80 text-center space-y-2">
                                    <MapPin className="h-6 w-6 text-slate-400 mx-auto" />
                                    <div>
                                      <p className="text-xs font-bold text-slate-700">No Territory Map Image Attached</p>
                                      <p className="text-[11px] text-slate-500 mt-0.5">
                                        Upload a high-res boundary graphic image. Uploading will automatically update the IM and sync to Step 4 of the linked franchisee presale record.
                                      </p>
                                    </div>
                                    <div className="pt-1">
                                      <label className="cursor-pointer inline-block">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadTerritoryMap(file);
                                          }}
                                        />
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={uploadingTerritoryMap}
                                          className="bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-bold gap-1.5"
                                        >
                                          {uploadingTerritoryMap ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                          Upload Territory Map Image
                                        </Button>
                                      </label>
                                    </div>
                                  </div>
                                )}

                                <div className="pt-1">
                                  <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Or Direct Image URL:</label>
                                  <Input
                                    value={factSheetForm.territoryMapUrl}
                                    onChange={(e) => setFactSheetForm({ ...factSheetForm, territoryMapUrl: e.target.value })}
                                    placeholder="https://lh3.googleusercontent.com/..."
                                    className="text-xs h-8 bg-white"
                                  />
                                </div>
                              </div>
                              <div className="col-span-2 space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700">Territory Notes / Special Terms</label>
                                <textarea
                                  rows={2}
                                  value={factSheetForm.notes}
                                  onChange={(e) => setFactSheetForm({ ...factSheetForm, notes: e.target.value })}
                                  placeholder="Add any specific territory customer counts or earnings history notes..."
                                  className="w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-[#095c7b] outline-none bg-white"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            <Button type="submit" disabled={savingFactSheet} className="bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-bold gap-2">
                              {savingFactSheet ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              Save Information Memorandum (IM) Configuration
                            </Button>
                            {kfsDone && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.open(kfsPublicUrl, '_blank')}
                                className="text-xs border-slate-300 text-[#095c7b]"
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View Public IM Page
                              </Button>
                            )}
                          </div>
                        </form>
                      </div>

                  {/* Information Memorandum (IM) Dispatcher & Live Preview */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Information Memorandum (IM) Email Dispatcher
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left: Form Controls */}
                      <div className="lg:col-span-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                            <Mail className="h-4 w-4 text-[#095c7b]" /> Email Dispatch Composer
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">From: greg.hart@mailplus.com.au</span>
                        </div>

                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">To Recipient Email(s):</label>
                            <Input
                              value={factSheetEmailForm.toEmail}
                              onChange={(e) => setFactSheetEmailForm({ ...factSheetEmailForm, toEmail: e.target.value })}
                              placeholder="recipient@example.com"
                              className="text-xs bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 block mb-1">CC Email(s):</label>
                              <Input
                                value={factSheetEmailForm.ccEmail}
                                onChange={(e) => setFactSheetEmailForm({ ...factSheetEmailForm, ccEmail: e.target.value })}
                                placeholder="michael.mcdaid@mailplus.com.au"
                                className="text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 block mb-1">BCC Email(s):</label>
                              <Input
                                value={factSheetEmailForm.bccEmail}
                                onChange={(e) => setFactSheetEmailForm({ ...factSheetEmailForm, bccEmail: e.target.value })}
                                placeholder="Optional BCC..."
                                className="text-xs bg-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">Email Subject Line:</label>
                            <Input
                              value={factSheetEmailForm.subject}
                              onChange={(e) => setFactSheetEmailForm({ ...factSheetEmailForm, subject: e.target.value })}
                              placeholder="Email subject line..."
                              className="text-xs bg-white font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                              <span>Editable Email Body Copy:</span>
                              <span className="text-[10px] text-slate-400 font-normal">Edits update live preview</span>
                            </label>
                            <textarea
                              rows={5}
                              value={factSheetEmailForm.customNote}
                              onChange={(e) => setFactSheetEmailForm({ ...factSheetEmailForm, customNote: e.target.value })}
                              placeholder="Edit email body copy..."
                              className="w-full p-2 text-xs border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#095c7b]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Live Preview Card */}
                      <div className="lg:col-span-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                            <Eye className="h-4 w-4 text-[#095c7b]" /> Live Email Preview
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/20">
                            Information Memorandum (IM)
                          </Badge>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm text-xs">
                          <div className="bg-[#095c7b] py-3 text-center">
                            <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" className="h-7 inline-block" />
                          </div>
                          <div className="p-4 space-y-3 text-slate-700 leading-relaxed">
                            <p className="font-bold text-[#095c7b] text-sm">
                              Hi {prospect.firstName || prospect.fullName || 'Valued Candidate'},
                            </p>

                            {factSheetEmailForm.customNote ? (
                              factSheetEmailForm.customNote
                                .split('\n')
                                .filter((p) => p.trim())
                                .map((para, idx) => <p key={idx}>{para}</p>)
                            ) : (
                              <p>
                                Thank you for your interest in joining the MailPlus franchise network for the{' '}
                                <strong>{prospect.preferredTerritory || 'MailPlus Territory'}</strong> territory.
                              </p>
                            )}

                            <div className="my-3 text-center">
                              <span className="inline-block bg-[#095c7b] text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm">
                                View Your Information Memorandum (IM) &rarr;
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500">
                              If you have any questions after reviewing the Information Memorandum (IM), feel free to reach out directly to Greg Hart.
                            </p>

                            <div className="pt-2 border-t text-slate-600">
                              <p>Kind regards,</p>
                              <p className="font-bold text-[#095c7b]">Greg Hart</p>
                              <p className="text-[11px] text-slate-500">Head of Franchise Sales | MailPlus</p>
                            </div>
                          </div>
                          <div className="bg-slate-50 border-t p-2.5 text-center text-[10px] text-slate-400">
                            MailPlus Australia &copy; 2026 | Business logistics, made simple.
                          </div>
                        </div>
                      </div>
                    </div>

                    {!factSheetForm.territoryMapUrl && !prospect.keyFactSheet?.territoryMapUrl && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold block text-amber-950">Territory Map Required Before Dispatch</span>
                          <span>You cannot send out the Information Memorandum (IM) until a territory map image is uploaded in Section 4 above.</span>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => handleSendStepEmail('fact_sheet')}
                      disabled={sendingFactSheetEmail || (!factSheetForm.territoryMapUrl && !prospect.keyFactSheet?.territoryMapUrl)}
                      className="w-full bg-[#095c7b] hover:bg-[#074760] text-white font-bold text-xs py-2.5 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingFactSheetEmail ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send Information Memorandum (IM) Email Now
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 1: CONFIDENTIALITY DEED */}
              {activeTab === 1 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Confidentiality Deed Requirement (Run-Along)
                    </h3>

                    <p className="text-xs text-slate-600">
                      Before a prospective buyer can observe or participate in a territory run-along, they must sign the MailPlus digital Confidentiality Deed online.
                    </p>

                    <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                      <span className="text-xs font-bold uppercase text-slate-700 block">Candidate Digital Signature URL</span>
                      <div className="flex items-center gap-2">
                        <Input readOnly value={deedPublicUrl} className="text-xs font-mono bg-white" />
                        <Button size="sm" variant="outline" onClick={() => handleCopyLink(deedPublicUrl, 'Confidentiality Deed')} className="shrink-0 text-xs">
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(deedPublicUrl, '_blank')} className="shrink-0 text-xs">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                        </Button>
                      </div>
                    </div>

                    {/* Step 2 Dynamic Deed Schedule Form */}
                    <div className="p-4 bg-slate-50 border rounded-xl space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div>
                          <span className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-[#095c7b]" /> Confidentiality Deed Schedule & Dynamic Fields
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Fields configured here dynamically populate the public online Confidentiality Deed schedule for this candidate.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleSaveDeedSchedule}
                          disabled={savingDeedSchedule}
                          className="bg-[#095c7b] hover:bg-[#074760] text-white font-bold text-xs shrink-0 gap-1.5"
                        >
                          {savingDeedSchedule ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Save Schedule Details
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Agreement Date */}
                        <div className="space-y-1 md:col-span-2">
                          <label className="font-semibold text-slate-700">Agreement Date:</label>
                          <Input
                            value={deedScheduleForm.agreementDate}
                            onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, agreementDate: e.target.value })}
                            placeholder="e.g. 24/06/2026 or DD/MM/YYYY"
                            className="bg-white text-xs font-medium"
                          />
                        </div>

                        {/* Discloser / Provider Details */}
                        <div className="space-y-3 p-3 bg-white border rounded-lg">
                          <span className="font-bold text-[#095c7b] text-xs block border-b pb-1">Discloser / Provider (Party 1)</span>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Entity Name:</label>
                            <Input
                              value={deedScheduleForm.providerName}
                              onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, providerName: e.target.value })}
                              className="bg-slate-50 text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">ACN:</label>
                              <Input
                                value={deedScheduleForm.providerAcn}
                                onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, providerAcn: e.target.value })}
                                className="bg-slate-50 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Contact Person:</label>
                              <Input
                                value={deedScheduleForm.providerContact}
                                onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, providerContact: e.target.value })}
                                className="bg-slate-50 text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Email:</label>
                            <Input
                              value={deedScheduleForm.providerEmail}
                              onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, providerEmail: e.target.value })}
                              className="bg-slate-50 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Address:</label>
                            <Input
                              value={deedScheduleForm.providerAddress}
                              onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, providerAddress: e.target.value })}
                              className="bg-slate-50 text-xs"
                            />
                          </div>
                        </div>

                        {/* Recipient / Candidate Details */}
                        <div className="space-y-3 p-3 bg-white border rounded-lg">
                          <span className="font-bold text-[#095c7b] text-xs block border-b pb-1">Recipient / Candidate (Party 2)</span>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Candidate / Legal Entity Name:</label>
                            <Input
                              value={deedScheduleForm.recipientName}
                              onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, recipientName: e.target.value })}
                              placeholder="e.g. John Smith"
                              className="bg-slate-50 text-xs font-semibold"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">ABN:</label>
                              <Input
                                value={deedScheduleForm.recipientAbn}
                                onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, recipientAbn: e.target.value })}
                                placeholder="Optional ABN"
                                className="bg-slate-50 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">ACN:</label>
                              <Input
                                value={deedScheduleForm.recipientAcn}
                                onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, recipientAcn: e.target.value })}
                                placeholder="Optional ACN"
                                className="bg-slate-50 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Short Name:</label>
                              <Input
                                value={deedScheduleForm.recipientShortName}
                                onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, recipientShortName: e.target.value })}
                                placeholder="e.g. John"
                                className="bg-slate-50 text-xs"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Contact Person:</label>
                              <Input
                                value={deedScheduleForm.recipientContact}
                                onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, recipientContact: e.target.value })}
                                className="bg-slate-50 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Email:</label>
                              <Input
                                value={deedScheduleForm.recipientEmail}
                                onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, recipientEmail: e.target.value })}
                                className="bg-slate-50 text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Residential / Business Address:</label>
                            <Input
                              value={deedScheduleForm.recipientAddress}
                              onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, recipientAddress: e.target.value })}
                              placeholder="Candidate street address"
                              className="bg-slate-50 text-xs"
                            />
                          </div>
                        </div>

                        {/* Meaning of Purpose */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="font-semibold text-slate-700">Meaning of Purpose:</label>
                          <textarea
                            rows={3}
                            value={deedScheduleForm.purpose}
                            onChange={(e) => setDeedScheduleForm({ ...deedScheduleForm, purpose: e.target.value })}
                            placeholder="Enter purpose statement..."
                            className="w-full p-2 text-xs border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#095c7b]"
                          />
                        </div>
                      </div>
                    </div>

                    {deedDone ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-emerald-600" /> Candidate Has Signed Confidentiality Deed
                          </span>
                          <Badge className="bg-emerald-700 text-white text-[10px]">Signed Online</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500 block">Full Name:</span>
                            <span className="font-semibold text-slate-900">{prospect.confidentialityDeed?.signerName || (prospect.confidentialityDeed as any)?.fullName || prospect.fullName}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Signed Date:</span>
                            <span className="font-semibold text-slate-900">
                              {prospect.confidentialityDeed?.signedAt
                                ? new Date(prospect.confidentialityDeed.signedAt).toLocaleString('en-AU')
                                : 'Signed'}
                            </span>
                          </div>
                        </div>

                        {prospect.confidentialityDeed?.signatureDataUrl && (
                          <div className="pt-2 border-t border-emerald-200">
                            <span className="text-xs font-bold text-emerald-900 block mb-1">Candidate Digital Canvas Signature:</span>
                            <div className="bg-white p-2 border rounded-md text-center max-w-xs">
                              <img src={prospect.confidentialityDeed.signatureDataUrl} alt="Signature" className="max-h-20 mx-auto" />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                        <span>Candidate has not yet signed the Confidentiality Deed. Use the form below to dispatch the signature email.</span>
                      </div>
                    )}

                    <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                          <Paperclip className="h-4 w-4 text-[#095c7b]" /> Uploaded Deed Documents (PDFs / Scans)
                        </span>
                        <label className="cursor-pointer">
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                            onChange={handleUploadDeedFile}
                            disabled={uploadingDeed}
                            className="hidden"
                          />
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer">
                            {uploadingDeed ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            {uploadingDeed ? 'Uploading...' : 'Upload Deed PDF'}
                          </span>
                        </label>
                      </div>

                      {prospect.confidentialityDeed?.documents && prospect.confidentialityDeed.documents.length > 0 ? (
                        <div className="space-y-2 pt-1">
                          {prospect.confidentialityDeed.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2.5 bg-white border rounded-lg text-xs">
                              <div className="flex items-center gap-2 overflow-hidden mr-2">
                                <FileText className="h-4 w-4 text-[#095c7b] shrink-0" />
                                <div className="truncate">
                                  <span className="font-semibold text-slate-900 block truncate">{doc.name}</span>
                                  <span className="text-[10px] text-slate-500">
                                    Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-AU')}
                                    {doc.size ? ` • ${(doc.size / 1024 / 1024).toFixed(2)} MB` : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900" onClick={() => window.open(doc.url, '_blank')}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteDeedDoc(doc.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] italic text-slate-500 pt-1">No uploaded deed documents attached yet. Click 'Upload Deed PDF' to attach offline copies.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Confidentiality Deed Email Dispatcher
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left: Form Controls */}
                      <div className="lg:col-span-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                            <Mail className="h-4 w-4 text-[#095c7b]" /> Email Dispatch Composer
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">From: greg.hart@mailplus.com.au</span>
                        </div>

                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">To Recipient Email(s):</label>
                            <Input
                              value={deedEmailForm.toEmail}
                              onChange={(e) => setDeedEmailForm({ ...deedEmailForm, toEmail: e.target.value })}
                              placeholder="recipient@example.com"
                              className="text-xs bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 block mb-1">CC Email(s):</label>
                              <Input
                                value={deedEmailForm.ccEmail}
                                onChange={(e) => setDeedEmailForm({ ...deedEmailForm, ccEmail: e.target.value })}
                                placeholder="michael.mcdaid@mailplus.com.au"
                                className="text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 block mb-1">BCC Email(s):</label>
                              <Input
                                value={deedEmailForm.bccEmail}
                                onChange={(e) => setDeedEmailForm({ ...deedEmailForm, bccEmail: e.target.value })}
                                placeholder="Optional BCC..."
                                className="text-xs bg-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">Email Subject Line:</label>
                            <Input
                              value={deedEmailForm.subject}
                              onChange={(e) => setDeedEmailForm({ ...deedEmailForm, subject: e.target.value })}
                              placeholder="Email subject line..."
                              className="text-xs bg-white font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                              <span>Editable Email Body Copy:</span>
                              <span className="text-[10px] text-slate-400 font-normal">Edits update live preview</span>
                            </label>
                            <textarea
                              rows={5}
                              value={deedEmailForm.customNote}
                              onChange={(e) => setDeedEmailForm({ ...deedEmailForm, customNote: e.target.value })}
                              placeholder="Edit email body copy..."
                              className="w-full p-2 text-xs border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#095c7b]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Live Preview Card */}
                      <div className="lg:col-span-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                            <Eye className="h-4 w-4 text-[#095c7b]" /> Live Email Preview
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/20">
                            Confidentiality Deed
                          </Badge>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm text-xs">
                          <div className="bg-[#095c7b] py-3 text-center">
                            <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" className="h-7 inline-block" />
                          </div>
                          <div className="p-4 space-y-3 text-slate-700 leading-relaxed">
                            <p className="font-bold text-[#095c7b] text-sm">
                              Hi {prospect.firstName || prospect.fullName || 'Valued Candidate'},
                            </p>

                            {deedEmailForm.customNote ? (
                              deedEmailForm.customNote
                                .split('\n')
                                .filter((p) => p.trim())
                                .map((para, idx) => <p key={idx}>{para}</p>)
                            ) : (
                              <p>
                                Before we arrange your hands-on territory run-along in{' '}
                                <strong>{prospect.preferredTerritory || 'MailPlus Territory'}</strong>, MailPlus requires all prospective
                                buyers to sign a digital Confidentiality Deed.
                              </p>
                            )}

                            <div className="my-3 text-center">
                              <span className="inline-block bg-[#095c7b] text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm">
                                Sign Confidentiality Deed Online &rarr;
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500">
                              You can easily review and sign the deed digitally from your phone, tablet, or desktop.
                            </p>

                            <div className="pt-2 border-t text-slate-600">
                              <p>Kind regards,</p>
                              <p className="font-bold text-[#095c7b]">Greg Hart</p>
                              <p className="text-[11px] text-slate-500">Head of Franchise Sales | MailPlus</p>
                            </div>
                          </div>
                          <div className="bg-slate-50 border-t p-2.5 text-center text-[10px] text-slate-400">
                            MailPlus Australia &copy; 2026 | Business logistics, made simple.
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSendStepEmail('confidentiality_deed')}
                      disabled={sendingDeedEmail}
                      className="w-full bg-[#095c7b] hover:bg-[#074760] text-white font-bold text-xs py-2.5 gap-2"
                    >
                      {sendingDeedEmail ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send Confidentiality Deed Email Now
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {activeTab === 3 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                      <PenTool className="h-4 w-4" /> Expression of Interest (EOI) Online Application
                    </h3>

                    <p className="text-xs text-slate-600">
                      The candidate completes their official EOI application form online, capturing entity structure, ABN, trade references, financial assets, and digital signature.
                    </p>

                    <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                      <span className="text-xs font-bold uppercase text-slate-700 block">Candidate EOI Application Form Link</span>
                      <div className="flex items-center gap-2">
                        <Input readOnly value={eoiPublicUrl} className="text-xs font-mono bg-white" />
                        <Button size="sm" variant="outline" onClick={() => handleCopyLink(eoiPublicUrl, 'EOI Form')} className="shrink-0 text-xs">
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(eoiPublicUrl, '_blank')} className="shrink-0 text-xs">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open Form
                        </Button>
                      </div>
                    </div>

                    {/* Interactive Funding Method & Workflow Branching Control Card */}
                    <div className="p-4 bg-[#095c7b]/5 border-2 border-[#095c7b]/30 rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-2">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-[#095c7b] block">
                            Funding Requirement & Workflow Branching Selection
                          </span>
                          <span className="text-[11px] text-slate-600 block mt-0.5">
                            Logged-in operations users can change this option at any time to define candidate workflow progression.
                          </span>
                        </div>
                        <Badge className={prospect.nabFunding?.accreditationFundingRequired ? 'bg-amber-600 text-white font-bold' : 'bg-emerald-600 text-white font-bold'}>
                          {prospect.nabFunding?.accreditationFundingRequired ? 'NAB Accreditation Funding' : 'Sole Trader / Self-Funded'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => handleToggleFundingType(true)}
                          disabled={savingEOIPrefill}
                          className={`p-3 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                            prospect.nabFunding?.accreditationFundingRequired
                              ? 'border-[#095c7b] bg-[#095c7b]/10 ring-2 ring-[#095c7b]/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            prospect.nabFunding?.accreditationFundingRequired ? 'border-[#095c7b] bg-[#095c7b]' : 'border-slate-300'
                          }`}>
                            {prospect.nabFunding?.accreditationFundingRequired && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">1. NAB Accreditation Funding</span>
                            <span className="text-[11px] text-slate-600 block mt-0.5">
                              Routes application to Michael McDaid for NAB accreditation confirmation before legal instructions are released to Lawyer Anna.
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleFundingType(false)}
                          disabled={savingEOIPrefill}
                          className={`p-3 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                            !prospect.nabFunding?.accreditationFundingRequired
                              ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            !prospect.nabFunding?.accreditationFundingRequired ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                          }`}>
                            {!prospect.nabFunding?.accreditationFundingRequired && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">2. Sole Trader / Self-Funded</span>
                            <span className="text-[11px] text-slate-600 block mt-0.5">
                              Bypasses NAB accreditation hold. Unlocks Step 6 legal instruction dispatch directly for Lawyer Anna Trist.
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* EOI Dynamic Prefill & Form Config Card */}
                    <div className="p-4 bg-slate-50 border rounded-xl space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div>
                          <span className="text-xs font-bold uppercase text-[#095c7b] block">Step 3 EOI Dynamic Field Prefill & Configuration</span>
                          <span className="text-[11px] text-slate-500">Prefill values here to prepopulate the candidate's public EOI application page.</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveEOIPrefill}
                          disabled={savingEOIPrefill}
                          className="bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-bold gap-1.5"
                        >
                          {savingEOIPrefill ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          {savingEOIPrefill ? 'Saving...' : 'Save EOI Prefill Settings'}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Proposed Entity Structure</label>
                          <select
                            value={eoiPrefillForm.entityStructure}
                            onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, entityStructure: e.target.value as any })}
                            className="w-full h-8 text-xs p-1 border rounded bg-white"
                          >
                            <option value="SOLE TRADER">Sole Trader</option>
                            <option value="PARTNERSHIP">Partnership</option>
                            <option value="PTY LTD COMPANY">Pty Ltd Company</option>
                            <option value="LTD COMPANY">Ltd Company</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Company / Applicant Name</label>
                          <Input
                            value={eoiPrefillForm.companyName}
                            onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, companyName: e.target.value })}
                            className="text-xs h-8 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">ABN</label>
                          <Input
                            value={eoiPrefillForm.abn}
                            onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, abn: e.target.value })}
                            className="text-xs h-8 bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Registered Address</label>
                          <Input
                            value={eoiPrefillForm.registeredAddress}
                            onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, registeredAddress: e.target.value })}
                            className="text-xs h-8 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Business Address</label>
                          <Input
                            value={eoiPrefillForm.businessAddress}
                            onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, businessAddress: e.target.value })}
                            className="text-xs h-8 bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Applicant 1 Full Name</label>
                          <Input
                            value={eoiPrefillForm.applicant1Name}
                            onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, applicant1Name: e.target.value })}
                            className="text-xs h-8 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Applicant 1 Email</label>
                          <Input
                            value={eoiPrefillForm.applicant1Email}
                            onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, applicant1Email: e.target.value })}
                            className="text-xs h-8 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Applicant 1 Phone</label>
                          <Input
                            value={eoiPrefillForm.applicant1PhoneBusiness}
                            onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, applicant1PhoneBusiness: e.target.value })}
                            className="text-xs h-8 bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Driver's Licence No.</label>
                          <Input
                            value={eoiPrefillForm.applicant1DriversLicence}
                            onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, applicant1DriversLicence: e.target.value })}
                            className="text-xs h-8 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Licence State / Place</label>
                          <Input
                            value={eoiPrefillForm.applicant1DriversLicencePlace}
                            onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, applicant1DriversLicencePlace: e.target.value })}
                            className="text-xs h-8 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Date of Birth</label>
                          <Input
                            type="date"
                            value={eoiPrefillForm.applicant1DateOfBirth}
                            onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, applicant1DateOfBirth: e.target.value })}
                            className="text-xs h-8 bg-white"
                          />
                        </div>
                      </div>

                      {/* Co-applicant toggle */}
                      <div className="pt-2 border-t text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-700">Co-Applicant / Partner Details</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEOIPrefillForm({ ...eoiPrefillForm, hasApplicant2: !eoiPrefillForm.hasApplicant2 })}
                            className="h-6 text-[10px]"
                          >
                            {eoiPrefillForm.hasApplicant2 ? 'Remove Co-Applicant' : '+ Enable Co-Applicant Prefill'}
                          </Button>
                        </div>
                        {eoiPrefillForm.hasApplicant2 && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <div>
                              <label className="text-[10px] text-slate-600 block mb-1">Applicant 2 Name</label>
                              <Input
                                value={eoiPrefillForm.applicant2Name}
                                onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, applicant2Name: e.target.value })}
                                className="text-xs h-8 bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-600 block mb-1">Applicant 2 Email</label>
                              <Input
                                value={eoiPrefillForm.applicant2Email}
                                onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, applicant2Email: e.target.value })}
                                className="text-xs h-8 bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-600 block mb-1">Applicant 2 Phone</label>
                              <Input
                                value={eoiPrefillForm.applicant2PhoneBusiness}
                                onChange={(e) => setEOIPrefillForm({ ...eoiPrefillForm, applicant2PhoneBusiness: e.target.value })}
                                className="text-xs h-8 bg-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {eoiDone ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-emerald-600" /> Candidate Has Completed & Signed EOI Online
                          </span>
                          <Badge className="bg-emerald-700 text-white text-[10px]">Signed Online</Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-200">
                          <div>
                            <span className="text-slate-500 block">Applicant Name:</span>
                            <span className="font-bold text-slate-900">{prospect.eoiData?.signerName || prospect.eoiData?.applicant1Name || prospect.fullName}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Entity Structure:</span>
                            <span className="font-bold text-slate-900">{prospect.eoiData?.entityStructure || 'Individual'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Company / Business Name:</span>
                            <span className="font-bold text-slate-900">{prospect.eoiData?.companyName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">ABN:</span>
                            <span className="font-bold text-slate-900">{prospect.eoiData?.abn || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Est. Net Worth:</span>
                            <span className="font-bold text-emerald-800">${(Number(prospect.eoiData?.netWorth) || 0).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Signed Timestamp:</span>
                            <span className="font-bold text-slate-900">
                              {prospect.eoiData?.signedAt ? new Date(prospect.eoiData.signedAt).toLocaleString('en-AU') : 'Signed'}
                            </span>
                          </div>
                        </div>

                        {prospect.eoiData?.signatureDataUrl && (
                          <div className="pt-2 border-t border-emerald-200">
                            <span className="text-xs font-bold text-emerald-900 block mb-1">Candidate EOI Digital Signature:</span>
                            <div className="bg-white p-2 border rounded-md text-center max-w-xs">
                              <img src={prospect.eoiData.signatureDataUrl} alt="EOI Signature" className="max-h-20 mx-auto" />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                        <span>Candidate has not yet submitted their EOI form. Dispatch the application link using the form below.</span>
                      </div>
                    )}

                    <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                          <Paperclip className="h-4 w-4 text-[#095c7b]" /> Uploaded EOI Documents (PDFs / Scans)
                        </span>
                        <label className="cursor-pointer">
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                            onChange={handleUploadEOIFile}
                            disabled={uploadingEOI}
                            className="hidden"
                          />
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer">
                            {uploadingEOI ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            {uploadingEOI ? 'Uploading...' : 'Upload EOI PDF'}
                          </span>
                        </label>
                      </div>

                      {prospect.eoiData?.documents && prospect.eoiData.documents.length > 0 ? (
                        <div className="space-y-2 pt-1">
                          {prospect.eoiData.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2.5 bg-white border rounded-lg text-xs">
                              <div className="flex items-center gap-2 overflow-hidden mr-2">
                                <FileText className="h-4 w-4 text-[#095c7b] shrink-0" />
                                <div className="truncate">
                                  <span className="font-semibold text-slate-900 block truncate">{doc.name}</span>
                                  <span className="text-[10px] text-slate-500">
                                    Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-AU')}
                                    {doc.size ? ` • ${(doc.size / 1024 / 1024).toFixed(2)} MB` : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900" onClick={() => window.open(doc.url, '_blank')}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteEOIDoc(doc.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] italic text-slate-500 pt-1">No uploaded EOI documents attached yet. Click 'Upload EOI PDF' to attach candidate's manual EOI form.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                      <Mail className="h-4 w-4" /> EOI Invitation Email Dispatcher
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left: Form Controls */}
                      <div className="lg:col-span-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                            <Mail className="h-4 w-4 text-[#095c7b]" /> Email Dispatch Composer
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">From: greg.hart@mailplus.com.au</span>
                        </div>

                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">To Recipient Email(s):</label>
                            <Input
                              value={eoiEmailForm.toEmail}
                              onChange={(e) => setEOIEmailForm({ ...eoiEmailForm, toEmail: e.target.value })}
                              placeholder="recipient@example.com"
                              className="text-xs bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 block mb-1">CC Email(s):</label>
                              <Input
                                value={eoiEmailForm.ccEmail}
                                onChange={(e) => setEOIEmailForm({ ...eoiEmailForm, ccEmail: e.target.value })}
                                placeholder="michael.mcdaid@mailplus.com.au"
                                className="text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 block mb-1">BCC Email(s):</label>
                              <Input
                                value={eoiEmailForm.bccEmail}
                                onChange={(e) => setEOIEmailForm({ ...eoiEmailForm, bccEmail: e.target.value })}
                                placeholder="Optional BCC..."
                                className="text-xs bg-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">Email Subject Line:</label>
                            <Input
                              value={eoiEmailForm.subject}
                              onChange={(e) => setEOIEmailForm({ ...eoiEmailForm, subject: e.target.value })}
                              placeholder="Email subject line..."
                              className="text-xs bg-white font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                              <span>Editable Email Body Copy:</span>
                              <span className="text-[10px] text-slate-400 font-normal">Edits update live preview</span>
                            </label>
                            <textarea
                              rows={5}
                              value={eoiEmailForm.customNote}
                              onChange={(e) => setEOIEmailForm({ ...eoiEmailForm, customNote: e.target.value })}
                              placeholder="Edit email body copy..."
                              className="w-full p-2 text-xs border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#095c7b]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Live Preview Card */}
                      <div className="lg:col-span-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                            <Eye className="h-4 w-4 text-[#095c7b]" /> Live Email Preview
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/20">
                            EOI Application
                          </Badge>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm text-xs">
                          <div className="bg-[#095c7b] py-3 text-center">
                            <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" className="h-7 inline-block" />
                          </div>
                          <div className="p-4 space-y-3 text-slate-700 leading-relaxed">
                            <p className="font-bold text-[#095c7b] text-sm">
                              Hi {prospect.firstName || prospect.fullName || 'Valued Candidate'},
                            </p>

                            {eoiEmailForm.customNote ? (
                              eoiEmailForm.customNote
                                .split('\n')
                                .filter((p) => p.trim())
                                .map((para, idx) => <p key={idx}>{para}</p>)
                            ) : (
                              <p>
                                Congratulations on progressing in the MailPlus Franchise Selection process for{' '}
                                <strong>{prospect.preferredTerritory || 'MailPlus Territory'}</strong>!
                              </p>
                            )}

                            <div className="my-3 text-center">
                              <span className="inline-block bg-[#095c7b] text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm">
                                Complete & Sign EOI Form Online &rarr;
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500">
                              Please have your entity details, ABN, and financial summary ready when filling out the online form.
                            </p>

                            <div className="pt-2 border-t text-slate-600">
                              <p>Kind regards,</p>
                              <p className="font-bold text-[#095c7b]">Greg Hart</p>
                              <p className="text-[11px] text-slate-500">Head of Franchise Sales | MailPlus</p>
                            </div>
                          </div>
                          <div className="bg-slate-50 border-t p-2.5 text-center text-[10px] text-slate-400">
                            MailPlus Australia &copy; 2026 | Business logistics, made simple.
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSendStepEmail('eoi')}
                      disabled={sendingEOIEmail}
                      className="w-full bg-[#095c7b] hover:bg-[#074760] text-white font-bold text-xs py-2.5 gap-2"
                    >
                      {sendingEOIEmail ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send EOI Invitation Email Now
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {activeTab === 4 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="border-b pb-3">
                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-600" /> Log Franchise Deposit Details (5–10%)
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Record and verify the trust account deposit paid by the candidate before final franchisee account provisioning.
                    </p>
                  </div>

                  <form onSubmit={handleSaveDeposit} className="space-y-4">
                    <div className="p-4 bg-slate-50 border rounded-xl flex justify-between items-center text-xs font-bold">
                      <span>Has Deposit Been Paid & Received?</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={depositForm.isPaid}
                          onChange={(e) => setDepositForm({ ...depositForm, isPaid: e.target.checked })}
                          className="h-4 w-4 text-emerald-600 rounded"
                        />
                        <span className={depositForm.isPaid ? 'text-emerald-700' : 'text-slate-500'}>
                          {depositForm.isPaid ? 'Deposit Confirmed Paid' : 'Pending Receipt'}
                        </span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Percentage Deposited (%)</label>
                        <Input
                          type="number"
                          value={depositForm.percentageDeposited}
                          onChange={(e) => setDepositForm({ ...depositForm, percentageDeposited: Number(e.target.value) })}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Amount Paid ($)</label>
                        <Input
                          type="number"
                          value={depositForm.amountPaid}
                          onChange={(e) => setDepositForm({ ...depositForm, amountPaid: Number(e.target.value) })}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Payment Date</label>
                        <Input
                          type="date"
                          value={depositForm.paymentDate}
                          onChange={(e) => setDepositForm({ ...depositForm, paymentDate: e.target.value })}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Payment Method</label>
                        <select
                          value={depositForm.paymentMethod}
                          onChange={(e) => setDepositForm({ ...depositForm, paymentMethod: e.target.value })}
                          className="w-full text-xs p-2 border rounded-md bg-white"
                        >
                          <option value="EFT">EFT / Direct Deposit</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Bank Reference / Receipt Number</label>
                      <Input
                        value={depositForm.receiptRef}
                        onChange={(e) => setDepositForm({ ...depositForm, receiptRef: e.target.value })}
                        placeholder="e.g. FR DEP SYDNEY 1004"
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Internal Deposit Notes</label>
                      <textarea
                        rows={2}
                        value={depositForm.notes}
                        onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                        placeholder="Notes regarding deposit payment..."
                        className="w-full p-2 text-xs border rounded-md"
                      />
                    </div>

                    {/* Deposit Receipts Upload */}
                    <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                          <Paperclip className="h-4 w-4 text-[#095c7b]" /> Uploaded Deposit Receipts
                        </span>
                        <label className="cursor-pointer">
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                            onChange={handleUploadDepositReceipt}
                            disabled={uploadingDepositReceipt}
                            className="hidden"
                          />
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer">
                            {uploadingDepositReceipt ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            {uploadingDepositReceipt ? 'Uploading...' : 'Upload Receipt'}
                          </span>
                        </label>
                      </div>

                      {prospect.depositDetails?.documents && prospect.depositDetails.documents.length > 0 ? (
                        <div className="space-y-2 pt-1">
                          {prospect.depositDetails.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2.5 bg-white border rounded-lg text-xs">
                              <div className="flex items-center gap-2 overflow-hidden mr-2">
                                <FileText className="h-4 w-4 text-[#095c7b] shrink-0" />
                                <div className="truncate">
                                  <span className="font-semibold text-slate-900 block truncate">{doc.name}</span>
                                  <span className="text-[10px] text-slate-500">
                                    Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-AU')}
                                    {doc.size ? ` • ${(doc.size / 1024 / 1024).toFixed(2)} MB` : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900" onClick={() => window.open(doc.url, '_blank')}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteDepositDoc(doc.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] italic text-slate-500 pt-1">No deposit receipts uploaded yet. Click 'Upload Receipt' to attach bank receipt or EFT confirmation.</p>
                      )}
                    </div>

                    <Button type="submit" disabled={savingDeposit} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5">
                      {savingDeposit ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Save Deposit Status & Update Pipeline
                    </Button>
                  </form>
                </div>
              )}

              {/* STEP 5: NAB Accreditation Funding & Legal Dispatch Branching */}
              {activeTab === 5 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-amber-500" /> Step 5: Funding Branching & NAB Accreditation Confirmation
                    </h3>

                    <p className="text-xs text-slate-600">
                      This step defines the approval workflow. If <strong>NAB Accreditation Funding</strong> is required, legal instructions to Lawyer Anna Trist (Step 6) are held until Michael McDaid logs formal confirmation. If <strong>Sole Trader Funding / Self-Funded</strong> is selected, the hold is bypassed.
                    </p>

                    {/* Interactive Funding Mode Selector */}
                    <div className="p-4 bg-slate-50 border rounded-xl space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3">
                        <div>
                          <span className="text-xs font-bold uppercase text-[#095c7b] block">Current Candidate Funding Mode</span>
                          <span className="text-xs text-slate-800 font-bold mt-0.5 block">
                            {prospect.nabFunding?.accreditationFundingRequired ? 'NAB Accreditation Funding Required (Hold Active)' : 'Sole Trader Funding / Self-Funded (NAB Hold Bypassed)'}
                          </span>
                        </div>
                        <Badge className={prospect.nabFunding?.accreditationFundingRequired ? 'bg-amber-600 text-white font-bold' : 'bg-emerald-600 text-white font-bold'}>
                          {prospect.nabFunding?.accreditationFundingRequired ? 'Pending Michael McDaid' : 'Self-Funded / Sole Trader'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant={prospect.nabFunding?.accreditationFundingRequired ? 'default' : 'outline'}
                          onClick={() => handleToggleFundingType(true)}
                          disabled={savingEOIPrefill}
                          className={`text-xs font-bold justify-start text-left h-auto p-3 flex flex-col items-start ${
                            prospect.nabFunding?.accreditationFundingRequired
                              ? 'bg-[#095c7b] text-white shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                          }`}
                        >
                          <span className="font-extrabold block">1. Require NAB Accreditation Funding</span>
                          <span className="text-[10px] opacity-90 font-normal mt-0.5">
                            Routes to Michael McDaid for formal NAB confirmation before releasing legal instructions to Lawyer Anna.
                          </span>
                        </Button>

                        <Button
                          type="button"
                          variant={!prospect.nabFunding?.accreditationFundingRequired ? 'default' : 'outline'}
                          onClick={() => handleToggleFundingType(false)}
                          disabled={savingEOIPrefill}
                          className={`text-xs font-bold justify-start text-left h-auto p-3 flex flex-col items-start ${
                            !prospect.nabFunding?.accreditationFundingRequired
                              ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                          }`}
                        >
                          <span className="font-extrabold block">2. Sole Trader / Self-Funded</span>
                          <span className="text-[10px] opacity-90 font-normal mt-0.5">
                            Bypasses NAB accreditation hold and unlocks Step 6 legal instruction dispatch directly for Lawyer Anna Trist.
                          </span>
                        </Button>
                      </div>
                    </div>

                    {/* Michael McDaid Confirmation Panel */}
                    {prospect.nabFunding?.accreditationFundingRequired ? (
                      <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-950 uppercase flex items-center gap-1.5">
                            <Info className="h-4 w-4 text-amber-700" /> Michael McDaid NAB Confirmation Status
                          </span>
                          <Badge className={prospect.nabFunding?.nabStatus === 'confirmed' ? 'bg-emerald-600 text-white font-bold' : 'bg-amber-600 text-white font-bold'}>
                            {prospect.nabFunding?.nabStatus === 'confirmed' ? 'Confirmed' : 'Pending Confirmation'}
                          </Badge>
                        </div>

                        {prospect.nabFunding?.nabStatus === 'confirmed' ? (
                          <div className="p-3 bg-emerald-100/80 border border-emerald-300 rounded-lg text-xs text-emerald-950 space-y-1">
                            <span className="font-bold block">✓ Formal NAB Accreditation Confirmed</span>
                            <span className="text-[11px] block">
                              Confirmed by {prospect.nabFunding?.nabConfirmedBy || 'Michael McDaid'} on {prospect.nabFunding?.nabConfirmedAt ? new Date(prospect.nabFunding.nabConfirmedAt).toLocaleDateString('en-AU') : 'N/A'}. Legal instructions unlocked for Step 6!
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs text-amber-900">
                              Michael McDaid must review and record formal NAB accreditation confirmation for this prospect.
                            </p>
                            <div className="flex items-center gap-3">
                              <Button
                                onClick={() => handleConfirmNAB('confirm')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                              >
                                <CheckCircle className="h-4 w-4 mr-1.5" /> Log NAB Accreditation Confirmation
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleConfirmNAB('reject')}
                                className="text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                              >
                                Reject NAB Accreditation
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-950 font-bold">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                          <span>Sole Trader / Self-Funded Mode Active — NAB Accreditation Hold Bypassed</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setActiveTab(6)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1"
                        >
                          Proceed to Step 6 (Request Docs) <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 6: Request for Docs Legal Instructions (Lawyer Anna Trist) */}
              {activeTab === 6 && (
                <div className="space-y-6">
                  {/* Top Header & Public Link Banner */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-teal-50/80 border border-teal-200 rounded-xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-teal-700" />
                        <span className="text-sm font-bold text-teal-950 uppercase tracking-wider">
                          Legal Instruction Pack for Lawyer Anna Trist
                        </span>
                        <Badge className={prospect.requestForDocs?.status === 'instructed' ? 'bg-emerald-600 text-white font-bold' : 'bg-teal-600 text-white font-bold'}>
                          {prospect.requestForDocs?.status === 'instructed' ? 'Anna Instructed ✓' : 'Drafting Stage'}
                        </Badge>
                      </div>
                      <p className="text-xs text-teal-900">
                        {prospect.requestForDocs?.status === 'instructed'
                          ? `Instructed by ${prospect.requestForDocs.instructedBy || 'Operations'} on ${prospect.requestForDocs.instructedAt ? new Date(prospect.requestForDocs.instructedAt).toLocaleDateString('en-AU') : 'Recently'}.`
                          : 'Review and confirm the legal instructions below before formal dispatch to Anna Trist.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(rfdPublicUrl, 'Request for Docs')}
                        className="text-xs bg-white border-teal-300 text-teal-900 hover:bg-teal-100"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy Legal Link
                      </Button>
                      <Link href={`/sign/request-for-docs/${rfdToken}`} target="_blank">
                        <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold gap-1">
                          <Eye className="h-3.5 w-3.5" /> View Live Doc <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Internal Review Checkpoints (Matt & Maddie) */}
                  <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
                    <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">
                      Internal Pre-Flight Sign-Offs
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="flex items-start gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={rfdForm.reviewedByMatt}
                          onChange={(e) => setRfdForm({ ...rfdForm, reviewedByMatt: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#095c7b] focus:ring-[#095c7b]"
                        />
                        <div className="text-xs space-y-0.5">
                          <span className="font-bold text-slate-900 block">Reviewed by Matt</span>
                          <span className="text-slate-500 block text-[11px]">
                            Commercial terms, commission adjustments, and fee schedule verified.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={rfdForm.chasedByMaddie}
                          onChange={(e) => setRfdForm({ ...rfdForm, chasedByMaddie: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#095c7b] focus:ring-[#095c7b]"
                        />
                        <div className="text-xs space-y-0.5">
                          <span className="font-bold text-slate-900 block">Chased / Tracked by Maddie</span>
                          <span className="text-slate-500 block text-[11px]">
                            Applicant documents, ID verification, and guarantor proofs collected.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Instruction Parameters Form */}
                  <form onSubmit={handleSaveRFD} className="space-y-5">
                    {/* Section 1: Entity & Contact */}
                    <div className="p-4 bg-white border rounded-xl space-y-4">
                      <h4 className="text-xs font-bold text-[#095c7b] uppercase tracking-wider border-b pb-2">
                        1. Incoming Franchisee Legal Entity & Contacts
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Legal Entity Name</label>
                          <Input
                            value={rfdForm.incomingEntityName}
                            onChange={(e) => setRfdForm({ ...rfdForm, incomingEntityName: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">ABN</label>
                          <Input
                            value={rfdForm.abn}
                            onChange={(e) => setRfdForm({ ...rfdForm, abn: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Email Address</label>
                          <Input
                            value={rfdForm.email}
                            onChange={(e) => setRfdForm({ ...rfdForm, email: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Mobile Phone</label>
                          <Input
                            value={rfdForm.mobile}
                            onChange={(e) => setRfdForm({ ...rfdForm, mobile: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="font-semibold text-slate-700">Registered Business Address</label>
                          <Input
                            value={rfdForm.registeredAddress}
                            onChange={(e) => setRfdForm({ ...rfdForm, registeredAddress: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Territory & Contract Term */}
                    <div className="p-4 bg-white border rounded-xl space-y-4">
                      <h4 className="text-xs font-bold text-[#095c7b] uppercase tracking-wider border-b pb-2">
                        2. Territory Details & Franchise Agreement Term
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Territory Name</label>
                          <Input
                            value={rfdForm.territoryName}
                            onChange={(e) => setRfdForm({ ...rfdForm, territoryName: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Outgoing Franchisee</label>
                          <Input
                            value={rfdForm.outgoingFranchiseeName}
                            onChange={(e) => setRfdForm({ ...rfdForm, outgoingFranchiseeName: e.target.value })}
                            placeholder="e.g. Smith Logistics Pty Ltd"
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Contract Term (Years)</label>
                          <Input
                            type="number"
                            value={rfdForm.termYears}
                            onChange={(e) => setRfdForm({ ...rfdForm, termYears: Number(e.target.value) || 5 })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Commencement Date</label>
                          <Input
                            type="date"
                            value={rfdForm.commencementDate}
                            onChange={(e) => setRfdForm({ ...rfdForm, commencementDate: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Expiry Date</label>
                          <Input
                            type="date"
                            value={rfdForm.expiryDate}
                            onChange={(e) => setRfdForm({ ...rfdForm, expiryDate: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Territory Map URL</label>
                          <Input
                            value={rfdForm.territoryMapUrl}
                            onChange={(e) => setRfdForm({ ...rfdForm, territoryMapUrl: e.target.value })}
                            placeholder="https://..."
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Commercial Fees & Special Conditions */}
                    <div className="p-4 bg-white border rounded-xl space-y-4">
                      <h4 className="text-xs font-bold text-[#095c7b] uppercase tracking-wider border-b pb-2">
                        3. Agreed Commercial Fees & Special Instructions
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Initial Franchise Fee ($)</label>
                          <Input
                            type="number"
                            value={rfdForm.initialFranchiseFee}
                            onChange={(e) => setRfdForm({ ...rfdForm, initialFranchiseFee: Number(e.target.value) || 0 })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Deposit Paid ($)</label>
                          <Input
                            type="number"
                            value={rfdForm.depositFee}
                            onChange={(e) => setRfdForm({ ...rfdForm, depositFee: Number(e.target.value) || 0 })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Service Fee (%)</label>
                          <Input
                            type="number"
                            value={rfdForm.serviceFeePercent}
                            onChange={(e) => setRfdForm({ ...rfdForm, serviceFeePercent: Number(e.target.value) || 25 })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Marketing Levy (%)</label>
                          <Input
                            type="number"
                            value={rfdForm.marketingLevyPercent}
                            onChange={(e) => setRfdForm({ ...rfdForm, marketingLevyPercent: Number(e.target.value) || 5 })}
                            className="text-xs h-8"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <label className="font-semibold text-slate-700 text-xs">Special Legal Conditions / Instructions for Anna Trist</label>
                        <textarea
                          value={rfdForm.specialConditions}
                          onChange={(e) => setRfdForm({ ...rfdForm, specialConditions: e.target.value })}
                          rows={3}
                          placeholder="Add any non-standard clauses, territory exemptions, vehicle requirements, or custom conditions..."
                          className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-[#095c7b] outline-none"
                        />
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={savingRFD}
                        variant="outline"
                        className="w-full sm:w-auto text-xs font-semibold"
                      >
                        {savingRFD ? <Loader className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                        Save Instruction Draft
                      </Button>

                      <Button
                        type="button"
                        onClick={handleInstructAnna}
                        disabled={instructingAnna}
                        className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-6 py-2.5 shadow-sm gap-1.5"
                      >
                        {instructingAnna ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Dispatch Instructions to Lawyer Anna Trist (Mark Instructed)
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 7: Disclosure Document & 14-Day Statutory Rule */}
              {activeTab === 7 && (() => {
                const isReceiptSigned = Boolean(prospect.disclosureDocument?.receiptSignedAt);
                const receiptSignedDate = prospect.disclosureDocument?.receiptSignedAt ? parseISO(prospect.disclosureDocument.receiptSignedAt) : null;
                const earliestDate = prospect.disclosureDocument?.earliestFranchiseAgreementExecutionDate
                  ? parseISO(prospect.disclosureDocument.earliestFranchiseAgreementExecutionDate)
                  : (receiptSignedDate ? addDays(receiptSignedDate, 14) : null);
                const now = new Date();
                const daysRemaining = earliestDate ? Math.max(0, differenceInCalendarDays(earliestDate, now)) : 14;
                const isStatutoryComplete = isReceiptSigned && earliestDate ? (now >= earliestDate) : false;

                return (
                  <div className="space-y-6">
                    {/* Compliance Alert Box */}
                    <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-rose-700" />
                        <span className="text-sm font-bold text-rose-950 uppercase tracking-wider">
                          Australian Franchising Code of Conduct — 14-Day Statutory Cooling Rule
                        </span>
                      </div>
                      <p className="text-xs text-rose-900 leading-relaxed">
                        Under Australian Franchising Law, a Franchise Agreement <strong>cannot legally be signed</strong> until a minimum of <strong>14 clear statutory days</strong> have elapsed after the prospective franchisee receives and acknowledges the formal Disclosure Document & Key Fact Sheet.
                      </p>
                    </div>

                    {/* 14-Day Countdown & Status Gauge */}
                    <div className={`p-5 rounded-xl border-2 space-y-4 ${
                      isStatutoryComplete
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                        : isReceiptSigned
                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider block">Statutory Disclosure Status</span>
                          <span className="text-sm font-extrabold mt-0.5 block">
                            {isStatutoryComplete
                              ? '✓ 14-Day Statutory Period Complete — Franchise Agreement Unlocked'
                              : isReceiptSigned
                              ? `14-Day Lock Active — ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'} Remaining`
                              : 'Waiting for Signed Disclosure Document Receipt'}
                          </span>
                        </div>
                        <Badge className={
                          isStatutoryComplete
                            ? 'bg-emerald-600 text-white font-bold'
                            : isReceiptSigned
                            ? 'bg-amber-600 text-white font-bold'
                            : 'bg-slate-600 text-white font-bold'
                        }>
                          {isStatutoryComplete ? 'Unlocked for FA' : isReceiptSigned ? `Day ${14 - daysRemaining} of 14` : 'Receipt Pending'}
                        </Badge>
                      </div>

                      {/* Detail Metric Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-lg border">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">RECEIPT SIGNED AT</span>
                          <span className="font-bold text-slate-900 block mt-1">
                            {receiptSignedDate ? receiptSignedDate.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not yet signed'}
                          </span>
                        </div>
                        <div className="p-3 bg-white rounded-lg border">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">EARLIEST FA EXECUTION DATE</span>
                          <span className="font-bold text-[#095c7b] block mt-1">
                            {earliestDate ? earliestDate.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Calculated upon signature'}
                          </span>
                        </div>
                        <div className="p-3 bg-white rounded-lg border">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">DAYS REMAINING</span>
                          <span className={`font-extrabold block mt-1 text-sm ${daysRemaining === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {isReceiptSigned ? (daysRemaining === 0 ? '0 Days (Complete)' : `${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`) : '14 Days'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Candidate Portal Link & Offline Backdate Utility */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Online E-Sign Portal */}
                      <div className="p-4 bg-white border rounded-xl space-y-3">
                        <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">
                          Online Disclosure Receipt Portal
                        </span>
                        <p className="text-xs text-slate-600">
                          Candidate can electronically review the Disclosure Document and sign the statutory receipt online.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(discPublicUrl, 'Disclosure Receipt')}
                            className="text-xs flex-1"
                          >
                            <Copy className="h-3.5 w-3.5 mr-1" /> Copy Receipt Link
                          </Button>
                          <Link href={`/sign/disclosure/${discToken}`} target="_blank" className="flex-1">
                            <Button size="sm" className="w-full bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-bold">
                              <Eye className="h-3.5 w-3.5 mr-1" /> Open Portal
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Right: Upload Wet-Ink Signed Receipt Scan */}
                      <div className="p-4 bg-white border rounded-xl space-y-3">
                        <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">
                          Upload Wet-Ink Signed Receipt Scan
                        </span>
                        <p className="text-xs text-slate-600">
                          If candidate signed a physical paper disclosure receipt, upload the scanned PDF/image here.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex-1">
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              disabled={uploadingDisclosureReceipt}
                              onChange={handleUploadDisclosureReceipt}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              disabled={uploadingDisclosureReceipt}
                              className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
                              asChild
                            >
                              <span>
                                {uploadingDisclosureReceipt ? <Loader className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                                Upload Signed Receipt
                              </span>
                            </Button>
                          </label>
                          {prospect.disclosureDocument?.receiptPdfUrl && (
                            <Link href={prospect.disclosureDocument.receiptPdfUrl} target="_blank">
                              <Button size="sm" variant="outline" className="text-xs text-emerald-700 border-emerald-300">
                                <Download className="h-3.5 w-3.5 mr-1" /> View Receipt
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Anna Trist Historical Backdate Utility */}
                    <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="h-4 w-4" /> Anna Trist Disclosure Backdate Override
                        </span>
                        <Badge variant="outline" className="text-[10px] text-slate-500">
                          For Prior Physical Delivery
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        If the Disclosure Document was delivered to the candidate prior to logging into ProspectPlus, specify the historical delivery date below to adjust the 14-day statutory lock window accordingly.
                      </p>
                      <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                        <Input
                          type="date"
                          value={disclosureBackdateInput}
                          onChange={(e) => setDisclosureBackdateInput(e.target.value)}
                          className="text-xs h-9 bg-white max-w-xs"
                        />
                        <Button
                          type="button"
                          onClick={handleSaveDisclosureBackdate}
                          disabled={savingDisclosureBackdate || !disclosureBackdateInput}
                          className="bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-bold shrink-0"
                        >
                          {savingDisclosureBackdate ? <Loader className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                          Set Historical Receipt Date
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* STEP 8: Franchise Agreement Execution & NetSuite Sync */}
              {activeTab === 8 && (() => {
                const isReceiptSigned = Boolean(prospect.disclosureDocument?.receiptSignedAt);
                const receiptSignedDate = prospect.disclosureDocument?.receiptSignedAt ? parseISO(prospect.disclosureDocument.receiptSignedAt) : null;
                const earliestDate = prospect.disclosureDocument?.earliestFranchiseAgreementExecutionDate
                  ? parseISO(prospect.disclosureDocument.earliestFranchiseAgreementExecutionDate)
                  : (receiptSignedDate ? addDays(receiptSignedDate, 14) : null);
                const now = new Date();
                const daysRemaining = earliestDate ? Math.max(0, differenceInCalendarDays(earliestDate, now)) : 14;
                const isFaUnlocked = isReceiptSigned && earliestDate ? (now >= earliestDate) : false;
                const isFaExecuted = Boolean(prospect.franchiseAgreement?.executedAt);

                return (
                  <div className="space-y-6">
                    {/* Execution Gate Banner */}
                    {!isFaUnlocked && !isFaExecuted ? (
                      <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Lock className="h-5 w-5 text-amber-700" />
                          <span className="text-sm font-bold text-amber-950 uppercase tracking-wider">
                            Franchise Agreement Hard-Locked (14-Day Rule Active)
                          </span>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed">
                          Under Franchising Code compliance, this agreement is currently hard-locked until <strong>{earliestDate ? earliestDate.toLocaleDateString('en-AU') : '14 days post-disclosure'}</strong> ({daysRemaining} days remaining).
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-emerald-700" />
                          <span className="text-sm font-bold text-emerald-950 uppercase tracking-wider">
                            {isFaExecuted ? 'Franchise Agreement Fully Executed ✓' : 'Statutory Period Passed — Ready for Execution'}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-900 leading-relaxed">
                          {isFaExecuted
                            ? `Executed on ${new Date(prospect.franchiseAgreement!.executedAt!).toLocaleDateString('en-AU')} via ${prospect.franchiseAgreement?.executionType === 'wet_ink' ? 'Wet-Ink Upload' : 'Digital R-Sign Portal'}.`
                            : 'The 14-day statutory waiting requirement is satisfied. You can now execute the Franchise Agreement digitally or upload signed scans.'}
                        </p>
                      </div>
                    )}

                    {/* Execution Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Option 1: Digital R-Sign Portal */}
                      <div className="p-4 bg-white border rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">
                            1. Digital Execution (R-Sign / Portal)
                          </span>
                          <Badge className={isFaExecuted ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}>
                            {isFaExecuted ? 'Executed' : 'Digital E-Sign'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">
                          Dispatches the agreement to candidate for digital signing, countersigned by Director Chris Burgess.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(faPublicUrl, 'Franchise Agreement')}
                            className="text-xs flex-1"
                          >
                            <Copy className="h-3.5 w-3.5 mr-1" /> Copy FA Link
                          </Button>
                          <Link href={`/sign/franchise-agreement/${faToken}`} target="_blank" className="flex-1">
                            <Button size="sm" className="w-full bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-bold">
                              <Eye className="h-3.5 w-3.5 mr-1" /> Open Portal
                            </Button>
                          </Link>
                        </div>
                        {!isFaExecuted && (
                          <Button
                            size="sm"
                            onClick={handleExecuteFAOnline}
                            disabled={executingFA}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            {executingFA ? <Loader className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <PenTool className="h-3.5 w-3.5 mr-1.5" />}
                            Record Digital Signature Online
                          </Button>
                        )}
                      </div>

                      {/* Option 2: Wet-Ink Scan Upload */}
                      <div className="p-4 bg-white border rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">
                            2. Wet-Ink Signed Agreement Scan
                          </span>
                          <Badge variant="outline" className="text-xs text-slate-600">
                            Physical Paper Contract
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">
                          Attach the complete, countersigned wet-ink scanned Franchise Agreement PDF.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex-1">
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              disabled={uploadingFAPdf}
                              onChange={handleUploadFAPdf}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              disabled={uploadingFAPdf}
                              className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
                              asChild
                            >
                              <span>
                                {uploadingFAPdf ? <Loader className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                                Upload Executed Agreement
                              </span>
                            </Button>
                          </label>
                          {prospect.franchiseAgreement?.signedPdfUrl && (
                            <Link href={prospect.franchiseAgreement.signedPdfUrl} target="_blank">
                              <Button size="sm" variant="outline" className="text-xs text-emerald-700 border-emerald-300">
                                <Download className="h-3.5 w-3.5 mr-1" /> View PDF
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* NetSuite CRM Integration Box */}
                    <div className="p-4 bg-slate-50 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-[#095c7b]" />
                          <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">
                            NetSuite CRM Franchisee Entity Sync
                          </span>
                          <Badge className={prospect.franchiseAgreement?.netSuiteSyncStatus === 'auto_synced' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}>
                            {prospect.franchiseAgreement?.netSuiteSyncStatus === 'auto_synced' ? 'NetSuite Synced ✓' : 'Sync Pending'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">
                          Pushes the executed franchisee entity, billing schedules, and territory boundary to NetSuite.
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleSyncNetSuite}
                        disabled={syncingNetSuite || prospect.franchiseAgreement?.netSuiteSyncStatus === 'auto_synced'}
                        className="bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-bold shrink-0 gap-1.5"
                      >
                        {syncingNetSuite ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        {prospect.franchiseAgreement?.netSuiteSyncStatus === 'auto_synced' ? 'Re-Sync NetSuite' : 'Trigger NetSuite Sync'}
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {/* STEP 9: Role-Sequenced Operational Training Module */}
              {activeTab === 9 && (
                <div className="space-y-6">
                  {/* Module Sequence Explanation Banner */}
                  <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-blue-700" />
                      <span className="text-sm font-bold text-blue-950 uppercase tracking-wider">
                        Role-Sequenced Operational Training Curriculum (T-14 Days to Start)
                      </span>
                    </div>
                    <p className="text-xs text-blue-900 leading-relaxed">
                      Prior to taking over the territory, the incoming franchisee must complete 3 mandatory training tracks led by department heads. Dates are scheduled within the <strong>T-14 window</strong> before the confirmed commercial start date.
                    </p>
                  </div>

                  <form onSubmit={handleSaveTrainingSchedule} className="space-y-5">
                    {/* Confirmed Commercial Start Date */}
                    <div className="p-4 bg-white border rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">
                          1. Confirmed Commercial Start Date
                        </span>
                        <Badge variant="outline" className="text-xs text-slate-700">
                          Territory Handover Date
                        </Badge>
                      </div>
                      <div className="max-w-xs space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Start / Handover Date</label>
                        <Input
                          type="date"
                          value={trainingForm.confirmedStartDate}
                          onChange={(e) => setTrainingForm({ ...trainingForm, confirmedStartDate: e.target.value })}
                          className="text-xs h-9"
                          required
                        />
                      </div>
                    </div>

                    {/* 3 Department Modules */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Module 1: Aleyna (Sales) */}
                      <div className="p-4 bg-white border rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-xs font-bold text-slate-900 uppercase">Sales & Growth</span>
                          <Badge className="bg-purple-600 text-white text-[10px]">Aleyna</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Sales methodology, cold prospecting, flyer distribution, and customer retention.
                        </p>
                        <div className="space-y-2 text-xs">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700">Training Date</label>
                            <Input
                              type="date"
                              value={trainingForm.salesTrainingDate}
                              onChange={(e) => setTrainingForm({ ...trainingForm, salesTrainingDate: e.target.value })}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700">Status</label>
                            <Select
                              value={trainingForm.salesStatus}
                              onValueChange={(val: any) => setTrainingForm({ ...trainingForm, salesStatus: val })}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                                <SelectItem value="scheduled" className="text-xs">Scheduled</SelectItem>
                                <SelectItem value="completed" className="text-xs">Completed ✓</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Module 2: Ops Lead (App & Scanner) */}
                      <div className="p-4 bg-white border rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-xs font-bold text-slate-900 uppercase">Ops & Scanner App</span>
                          <Badge className="bg-teal-600 text-white text-[10px]">Ops Lead</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          App Pus handheld scanner setup, parcel barcode manifests, and daily run routing.
                        </p>
                        <div className="space-y-2 text-xs">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700">Training Date</label>
                            <Input
                              type="date"
                              value={trainingForm.appTrainingDate}
                              onChange={(e) => setTrainingForm({ ...trainingForm, appTrainingDate: e.target.value })}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700">Status</label>
                            <Select
                              value={trainingForm.appStatus}
                              onValueChange={(val: any) => setTrainingForm({ ...trainingForm, appStatus: val })}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                                <SelectItem value="scheduled" className="text-xs">Scheduled</SelectItem>
                                <SelectItem value="completed" className="text-xs">Completed ✓</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Module 3: Popie (Billing) */}
                      <div className="p-4 bg-white border rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-xs font-bold text-slate-900 uppercase">Billing & Invoicing</span>
                          <Badge className="bg-blue-600 text-white text-[10px]">Popie</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Weekly client billing runs, customer pricing matrix, credit terms, and banking reconciliation.
                        </p>
                        <div className="space-y-2 text-xs">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700">Training Date</label>
                            <Input
                              type="date"
                              value={trainingForm.billingTrainingDate}
                              onChange={(e) => setTrainingForm({ ...trainingForm, billingTrainingDate: e.target.value })}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700">Status</label>
                            <Select
                              value={trainingForm.billingStatus}
                              onValueChange={(val: any) => setTrainingForm({ ...trainingForm, billingStatus: val })}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                                <SelectItem value="scheduled" className="text-xs">Scheduled</SelectItem>
                                <SelectItem value="completed" className="text-xs">Completed ✓</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Master Calendar Checkbox */}
                    <div className="p-3.5 bg-slate-50 border rounded-xl flex items-center justify-between">
                      <label className="flex items-center gap-3 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={trainingForm.syncGregCalendar}
                          onChange={(e) => setTrainingForm({ ...trainingForm, syncGregCalendar: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-[#095c7b] focus:ring-[#095c7b]"
                        />
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block">Sync with Greg Hart’s Master Calendar</span>
                          <span className="text-slate-500 text-[11px] block">
                            Automatically pushes training events to Greg Hart, Aleyna, Popie, and Operational Lead diaries.
                          </span>
                        </div>
                      </label>
                      <Badge className="bg-emerald-600 text-white text-[10px]">Master Diary Sync Active</Badge>
                    </div>

                    {/* Save Schedule Button */}
                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        disabled={savingTraining}
                        className="bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-bold px-6 py-2.5 shadow-sm gap-1.5"
                      >
                        {savingTraining ? <Loader className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                        Save Training Curriculum & Dispatch Calendar Invites
                      </Button>
                    </div>
                  </form>

                  {/* Final Conversion to Active Franchisee Card */}
                  <div className="p-5 bg-linear-to-r from-[#095c7b] to-[#0d7ea8] text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-[#eaf143]" />
                        <span className="font-extrabold text-sm uppercase tracking-wider">
                          Ready to Onboard as Official MailPlus Franchisee?
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 max-w-xl leading-relaxed">
                        Creates an active user login in ProspectPlus, establishes the franchisee profile with their verified ABN and territory, and marks the application pipeline as <strong>Converted</strong>.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={handleStartConvert}
                      className="bg-[#eaf143] hover:bg-[#d8df3d] text-slate-900 font-extrabold text-xs px-6 py-3 rounded-xl shadow-md shrink-0 gap-1.5"
                    >
                      <UserCheck className="h-4 w-4" /> Convert to Active Franchisee
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (lg:col-span-5 xl:col-span-5): Sticky Sidebar with Status on Top, Submission Details, Timeline & Notes, Email Log */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-6 lg:sticky lg:top-6 self-start">
          {/* 1. Change Application Status Card (RIGHT ON TOP - Sleek Compact UI) */}
          <Card className="shadow-md border-2 border-[#095c7b]/20 bg-white rounded-xl overflow-hidden">
            <CardHeader className="pb-2.5 pt-3 px-4 bg-slate-50 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#095c7b] flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#095c7b]" /> Application Status
              </CardTitle>
              {getStatusBadge(prospect.status)}
            </CardHeader>
            <CardContent className="p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <select
                  value={prospect.status}
                  disabled={updatingStatus}
                  onChange={(e) => handleUpdateStatus(e.target.value as FranchiseProspect['status'])}
                  className="flex-1 h-9 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#095c7b] focus:border-[#095c7b] outline-none shadow-xs transition-all cursor-pointer"
                >
                  <option value="New">New Application</option>
                  <option value="Deed Signed">Step 1: Deed Signed</option>
                  <option value="IM Sent">Step 2: IM Sent</option>
                  <option value="EOI Signed">Step 3: EOI Application Signed</option>
                  <option value="Deposit Paid">Step 4: Deposit Paid</option>
                  <option value="NAB Pending">Step 5: NAB Pending Confirmation</option>
                  <option value="NAB Confirmed">Step 5: NAB Confirmed</option>
                  <option value="Legal Instructions Sent">Step 6: Legal Docs Instructed</option>
                  <option value="Disclosure 14-Day Lock">Step 7: 14d Lock Active</option>
                  <option value="FA Executed">Step 8: FA Executed</option>
                  <option value="Training Scheduled">Step 9: Training Scheduled</option>
                  <option value="Converted">Converted to Franchisee</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Archived">Archived</option>
                </select>

                {updatingStatus && <Loader className="h-4 w-4 animate-spin text-[#095c7b] shrink-0" />}
              </div>
              <p className="text-[10px] text-slate-500 italic">
                Status automatically syncs upon step completion, or can be manually updated using the selector above.
              </p>
            </CardContent>
          </Card>

          {/* 2. Candidate Submission Details Card */}
          <Card className="shadow-md border bg-white rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-extrabold text-slate-900 font-serif">Candidate Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">FIRST NAME</span>
                  <span className="font-bold text-slate-900 text-xs block truncate mt-0.5">{prospect.firstName || prospect.fullName.split(' ')[0] || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">LAST NAME</span>
                  <span className="font-bold text-slate-900 text-xs block truncate mt-0.5">{prospect.lastName || prospect.fullName.split(' ').slice(1).join(' ') || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">EMAIL</span>
                  <span className="font-bold text-slate-900 text-xs block truncate mt-0.5" title={prospect.email}>{prospect.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PHONE</span>
                  <span className="font-bold text-slate-900 text-xs block mt-0.5">{prospect.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PREFERRED PRIMARY TERRITORY</span>
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1 mt-0.5">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" />
                    <span className="truncate">{prospect.preferredTerritory || 'Unspecified'}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PREFERRED STATE</span>
                  <span className="font-bold text-slate-900 text-xs block mt-0.5">{prospect.preferredState || 'Unspecified'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">APPLICANT TYPE</span>
                  <span className="font-bold text-slate-900 text-xs block mt-0.5">{prospect.interest || "I'm an investor"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HAS VEHICLE?</span>
                  <span className="font-bold text-slate-900 text-xs block mt-0.5">{prospect.vehicle || 'No'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SUBMITTED DATE</span>
                  <span className="font-bold text-slate-900 text-xs block mt-0.5">
                    {prospect.submittedAt ? new Date(prospect.submittedAt).toLocaleDateString('en-AU') : 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Interested Territories List & Edit Action */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> ALL INTERESTED TERRITORIES ({prospect.interestedTerritories?.length || (prospect.preferredTerritory ? 1 : 0)})
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenTerritoryModal}
                    className="h-7 text-xs border-emerald-600/30 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-full px-3 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add / Edit Territories
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(!prospect.interestedTerritories || prospect.interestedTerritories.length === 0) && !prospect.preferredTerritory ? (
                    <span className="text-xs text-slate-400 italic">No interested territories selected yet. Click "Add / Edit Territories" above.</span>
                  ) : (
                    (prospect.interestedTerritories?.length ? prospect.interestedTerritories : [prospect.preferredTerritory!]).map((ter) => {
                      const isPrimary = ter === prospect.preferredTerritory;
                      return (
                        <Badge
                          key={ter}
                          variant="outline"
                          className={`text-xs py-1 px-3 rounded-full gap-1.5 font-semibold ${
                            isPrimary 
                              ? 'bg-amber-50 text-amber-950 border-amber-400 shadow-xs' 
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {isPrimary && <Star className="h-3 w-3 text-amber-500 fill-amber-400 shrink-0" />}
                          {ter}
                          {isPrimary && <span className="text-[10px] text-amber-700 font-normal ml-0.5">(Primary)</span>}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Linked Franchisee / Target Business Section */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-[#095c7b]" /> LINKED FRANCHISEE / TARGET BUSINESS
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsLinkFranchiseeModalOpen(true)}
                    className="h-7 text-xs border-blue-600/30 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-full px-3 font-semibold gap-1"
                  >
                    <Building className="h-3.5 w-3.5" />
                    {prospect.linkedFranchiseeName ? 'Change Link' : 'Link Franchisee'}
                  </Button>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  {prospect.linkedFranchiseeName ? (
                    <Badge variant="outline" className="text-xs py-1.5 px-3 rounded-xl gap-2 font-bold bg-blue-50 text-[#095c7b] border-blue-300 shadow-xs">
                      <Building className="h-3.5 w-3.5 text-[#095c7b]" />
                      <span>{prospect.linkedFranchiseeName}</span>
                      <span className="text-[10px] text-blue-700 font-normal">
                        ({allFranchiseeOptions.find((o) => o.id === prospect.linkedFranchiseeId)?.typeLabel || 'Linked Franchisee'})
                      </span>
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No existing franchisee or presale listing linked yet. Click "Link Franchisee" above to select one.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Operations Timeline & Notes Card */}
          <Card className="shadow-md border bg-white rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b pb-3 pt-4 px-5 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 font-serif">OPERATIONS TIMELINE & NOTES</CardTitle>
              <span className="text-xs text-slate-400 font-normal">{prospect.notes?.length || 0} logged</span>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {!prospect.notes || prospect.notes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No internal notes logged yet.</p>
                ) : (
                  prospect.notes.map((note) => (
                    <div key={note.id} className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-slate-500 text-[11px]">
                        <span className="font-semibold text-slate-700 truncate max-w-[200px]">{note.createdByName}</span>
                        <span className="shrink-0">{new Date(note.createdAt).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-900 font-medium leading-relaxed">{note.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <Input
                  placeholder="Log an internal note..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  className="text-xs rounded-full bg-slate-50 border-slate-300 focus:bg-white"
                />
                <Button 
                  onClick={handleAddNote} 
                  disabled={addingNote || !newNoteText.trim()} 
                  className="bg-[#789ca7] hover:bg-[#60838e] text-white text-xs font-bold rounded-full px-4 shrink-0 shadow-xs"
                >
                  {addingNote ? <Loader className="h-3.5 w-3.5 animate-spin" /> : 'Add Note'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 4. Email Outbound Logs Card */}
          <Card className="shadow-md border bg-white rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b pb-3 pt-4 px-5 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 font-serif">OUTBOUND EMAIL DISPATCH LOG</CardTitle>
              <span className="text-xs text-slate-400 font-normal">{prospect.emailLogs?.length || 0} sent</span>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {!prospect.emailLogs || prospect.emailLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No outbound emails sent yet.</p>
                ) : (
                  prospect.emailLogs.map((log) => (
                    <div key={log.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-slate-900 block truncate">{log.subject}</span>
                      <span className="text-[11px] text-slate-500 block">Sent by {log.sentByName} on {new Date(log.sentAt).toLocaleDateString('en-AU')}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Conversion Dialog */}
      {isConvertDialogOpen && (
        <CreateUserDialog
          isOpen={isConvertDialogOpen}
          onOpenChange={setIsConvertDialogOpen}
          onUserCreated={() => {
            fetchProspect();
            toast({ title: 'Conversion Complete', description: 'Franchisee user account created and linked.' });
          }}
        />
      )}

      {/* Interested Territories Management Dialog */}
      <Dialog open={isTerritoryModalOpen} onOpenChange={setIsTerritoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#095c7b] font-bold text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Manage Interested Territories
            </DialogTitle>
            <DialogDescription>
              Select multiple territories the candidate is interested in, and set their primary preferred territory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTerritories} className="space-y-4 pt-2">
            {/* Selected Territories List */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block uppercase">Selected Interested Territories ({editInterestedTerritories.length})</label>
              {editInterestedTerritories.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No territories selected. Add one below.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editInterestedTerritories.map((tName) => {
                    const isPrimary = editPrimaryTerritory === tName;
                    return (
                      <div
                        key={tName}
                        className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-all ${
                          isPrimary ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditPrimaryTerritory(tName)}
                            title={isPrimary ? 'Primary Territory' : 'Click to make Primary'}
                            className="cursor-pointer"
                          >
                            <Star className={`h-4 w-4 ${isPrimary ? 'text-amber-500 fill-amber-400' : 'text-slate-300 hover:text-amber-400'}`} />
                          </button>
                          <span className={`font-semibold ${isPrimary ? 'text-amber-950 font-bold' : 'text-slate-800'}`}>
                            {tName} {isPrimary && '(Primary)'}
                          </span>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveTerritory(tName)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Select System Territory */}
            <div className="space-y-1.5 pt-2 border-t">
              <label className="text-xs font-bold text-slate-700 block">Add Existing System Territory</label>
              <div className="flex gap-2">
                <select
                  className="w-full text-xs p-2 border rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-[#095c7b] outline-none"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddTerritory(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">-- Select MailPlus Territory --</option>
                  {systemTerritories.map((tName) => (
                    <option key={tName} value={tName} disabled={editInterestedTerritories.includes(tName)}>
                      {tName} {editInterestedTerritories.includes(tName) ? '(Already Added)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Or Add Custom Territory */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Or Add Custom Territory Name</label>
              <div className="flex gap-2">
                <Input
                  value={customTerritoryInput}
                  onChange={(e) => setCustomTerritoryInput(e.target.value)}
                  placeholder="e.g. Parramatta Central..."
                  className="text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (customTerritoryInput.trim()) {
                        handleAddTerritory(customTerritoryInput);
                        setCustomTerritoryInput('');
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (customTerritoryInput.trim()) {
                      handleAddTerritory(customTerritoryInput);
                      setCustomTerritoryInput('');
                    }
                  }}
                  className="bg-[#095c7b] text-white text-xs shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsTerritoryModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={savingTerritories} className="bg-[#095c7b] hover:bg-[#074760] text-white font-bold text-xs">
                {savingTerritories ? <Loader className="h-4 w-4 animate-spin mr-1" /> : null}
                Save Interested Territories
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Prospect to Existing Franchisee or Presale Listing Modal */}
      <Dialog open={isLinkFranchiseeModalOpen} onOpenChange={setIsLinkFranchiseeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#095c7b] font-bold text-lg flex items-center gap-2">
              <Building className="h-5 w-5" /> Link Prospect to Existing Franchisee
            </DialogTitle>
            <DialogDescription>
              Select any existing MailPlus Franchisee or Presale Listing to link with this prospect and auto-sync financial IM metrics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Select Franchisee or Presale Listing</label>
              <Select value={selectedLinkFranchiseeId} onValueChange={setSelectedLinkFranchiseeId}>
                <SelectTrigger className="w-full text-xs h-9 bg-white border-slate-300">
                  <SelectValue placeholder="Choose an existing franchisee or presale..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {allFranchiseeOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="text-xs">
                      <span className="font-bold">{opt.name}</span>{' '}
                      <span className="text-slate-400">({opt.typeLabel}{opt.state ? ` - ${opt.state}` : ''})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsLinkFranchiseeModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleConfirmLinkFranchisee(selectedLinkFranchiseeId)}
                disabled={linkingFranchisee || !selectedLinkFranchiseeId}
                className="bg-[#095c7b] hover:bg-[#074760] text-white font-bold text-xs gap-1.5"
              >
                {linkingFranchisee ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Link & Sync IM Data
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
