'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FranchiseProspect, KeyFactSheetData, KeyFactSheetHistoryColumn, DepositDetails, EOIData, ConfidentialityDeedData } from '@/lib/types';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AccessDenied } from '@/components/access-denied';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { encodeProspectToken } from '@/lib/presale-token';

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

  // Active Stepper Tab (1 = Fact Sheet, 2 = Deed, 3 = EOI, 4 = Deposit, 5 = Convert)
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4 | 5>(1);

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
    marketingFeePercent: '',

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
  });
  const [savingFactSheet, setSavingFactSheet] = useState(false);
  const [factSheetCustomNote, setFactSheetCustomNote] = useState('');
  const [sendingFactSheetEmail, setSendingFactSheetEmail] = useState(false);

  // Step 2: Deed Email Custom Note State
  const [deedCustomNote, setDeedCustomNote] = useState('');
  const [sendingDeedEmail, setSendingDeedEmail] = useState(false);

  // Step 3: EOI Email Custom Note State
  const [eoiCustomNote, setEOICustomNote] = useState('');
  const [sendingEOIEmail, setSendingEOIEmail] = useState(false);

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

  const fetchProspect = async () => {
    if (!prospectId) return;
    setLoading(true);
    try {
      const ref = doc(firestore, 'franchise_prospects', prospectId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = { id: snap.id, ...(snap.data() as Omit<FranchiseProspect, 'id'>) };
        setProspect(data);

        // Prefill Fact Sheet Form (All Sections A to J)
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

          territoryName: kfs.territoryName || data.preferredTerritory || '',
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
          franchiseFee: kfs.franchiseFee ?? '',
          trainingFee: kfs.trainingFee ?? '',
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

        // Automatically set initial active tab based on candidate progress
        const kfsDone = Boolean(data.keyFactSheet?.publicToken);
        const deedDone = data.confidentialityDeed?.status === 'signed_online';
        const eoiDone = data.eoiData?.status === 'signed_online';
        const depositDone = Boolean(data.depositDetails?.isPaid);

        if (!kfsDone) setActiveTab(1);
        else if (!deedDone) setActiveTab(2);
        else if (!eoiDone) setActiveTab(3);
        else if (!depositDone) setActiveTab(4);
        else setActiveTab(5);
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
  const kfsDone = Boolean(prospect.keyFactSheet?.publicToken);
  const deedDone = prospect.confidentialityDeed?.status === 'signed_online';
  const eoiDone = prospect.eoiData?.status === 'signed_online';
  const depositDone = Boolean(prospect.depositDetails?.isPaid);

  const completedCount = [kfsDone, deedDone, eoiDone, depositDone].filter(Boolean).length;
  const isPrerequisitesComplete = kfsDone && eoiDone && depositDone;

  // Determine current stage string for top stage indicator banner
  const getCurrentStageName = () => {
    if (prospect.status === 'Converted') return 'Step 5: Converted to Franchisee';
    if (!kfsDone) return 'Step 1: Key Fact Sheet (Pending Prefill & Send)';
    if (!deedDone) return 'Step 2: Confidentiality Deed (Pending Candidate Signature for Run-Along)';
    if (!eoiDone) return 'Step 3: Expression of Interest (Pending Candidate Online EOI Form)';
    if (!depositDone) return 'Step 4: Deposit (Pending 5-10% Deposit Receipt)';
    return 'Step 5: Ready for Conversion';
  };

  // Origin for links
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const kfsToken = prospect.keyFactSheet?.publicToken || encodeProspectToken('kfs', prospect.id);
  const deedToken = prospect.confidentialityDeed?.publicToken || encodeProspectToken('cd', prospect.id);
  const eoiToken = prospect.eoiData?.publicToken || encodeProspectToken('eoi', prospect.id);

  const kfsPublicUrl = `${origin}/fact-sheet/${kfsToken}`;
  const deedPublicUrl = `${origin}/confidentiality-deed/${deedToken}`;
  const eoiPublicUrl = `${origin}/eoi/${eoiToken}`;

  // Handlers
  const handleCopyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Link Copied', description: `${label} public URL copied to clipboard.` });
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
    const customMessage =
      stepType === 'fact_sheet' ? factSheetCustomNote : stepType === 'confidentiality_deed' ? deedCustomNote : eoiCustomNote;

    if (stepType === 'fact_sheet') setSendingFactSheetEmail(true);
    if (stepType === 'confidentiality_deed') setSendingDeedEmail(true);
    if (stepType === 'eoi') setSendingEOIEmail(true);

    try {
      const res = await fetch('/api/franchise-prospects/send-step-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: prospect.id,
          stepType,
          customMessage,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to send email');

      toast({
        title: 'Email Sent Successfully',
        description: `Dispatched from greg.hart@mailplus.com.au to ${prospect.email} (CC: michael.mcdaid@mailplus.com.au).`,
      });

      if (stepType === 'fact_sheet') setFactSheetCustomNote('');
      if (stepType === 'confidentiality_deed') setDeedCustomNote('');
      if (stepType === 'eoi') setEOICustomNote('');

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
      case 'Contacted':
        return <Badge className="bg-amber-500 text-white font-medium">Contacted</Badge>;
      case 'Under Review':
        return <Badge className="bg-purple-600 text-white font-medium">Under Review</Badge>;
      case 'EOI Signed':
        return <Badge className="bg-sky-600 text-white font-medium">EOI Signed</Badge>;
      case 'Converted':
        return <Badge className="bg-emerald-600 text-white font-medium">Converted</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'Archived':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-900">
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

      {/* Current Stage Indicator Banner */}
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
        <div className="text-xs font-semibold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 shrink-0">
          {completedCount} of 4 Pre-requisites Complete
        </div>
      </div>

      {/* 5-Step Progress Stepper + Interactive Tabs Header */}
      <Card className="shadow-md border-[#095c7b]/30">
        <CardHeader className="pb-3 border-b bg-slate-50 rounded-t-xl">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#095c7b] flex items-center gap-2">
            <FileText className="h-4 w-4" /> Interactive Candidate Pipeline Stepper (Click to Switch View)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {/* Step 1 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(1)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 1
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : kfsDone
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                <span>1. Key Fact Sheet</span>
                {kfsDone ? <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[10px] text-slate-600 mt-1 block font-medium">
                {kfsDone ? 'Prefilled & Link Active' : 'Pending Prefill'}
              </span>
            </button>

            {/* Step 2 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(2)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 2
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : deedDone
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                <span>2. Confidentiality Deed</span>
                {deedDone ? <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[10px] text-slate-600 mt-1 block font-medium">
                {deedDone ? 'Digitally Signed' : prospect.confidentialityDeed?.status === 'sent' ? 'Deed Email Sent' : 'Not Signed'}
              </span>
            </button>

            {/* Step 3 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(3)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 3
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : eoiDone
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                <span>3. EOI Application</span>
                {eoiDone ? <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[10px] text-slate-600 mt-1 block font-medium">
                {eoiDone ? 'Signed Online' : 'Pending Candidate EOI'}
              </span>
            </button>

            {/* Step 4 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(4)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 4
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : depositDone
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                <span>4. 5–10% Deposit</span>
                {depositDone ? <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" /> : null}
              </div>
              <span className="text-[10px] text-slate-600 mt-1 block font-medium">
                {depositDone ? `${prospect.depositDetails?.percentageDeposited || 5}% Paid ($${prospect.depositDetails?.amountPaid || 0})` : 'Not Paid'}
              </span>
            </button>

            {/* Step 5 Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(5)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                activeTab === 5
                  ? 'ring-2 ring-[#095c7b] bg-[#095c7b]/10 border-[#095c7b] shadow-sm'
                  : prospect.status === 'Converted'
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                  : isPrerequisitesComplete
                  ? 'bg-emerald-100/70 border-emerald-400'
                  : 'bg-slate-100 border-slate-300 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                <span>5. Conversion</span>
                {prospect.status === 'Converted' ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : !isPrerequisitesComplete ? (
                  <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                ) : null}
              </div>
              <span className="text-[10px] text-slate-600 mt-1 block font-medium">
                {prospect.status === 'Converted' ? 'Converted' : isPrerequisitesComplete ? 'Ready to Convert' : 'Locked (Pending 1-4)'}
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Main Dynamic Step Content Area (In-Page Content for Selected Step) */}
      <Card className="shadow-lg border-2 border-[#095c7b]/20">
        {/* Section Header with Step Navigation Controls */}
        <CardHeader className="bg-slate-900 text-white p-5 rounded-t-xl flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              {activeTab === 1 && <FileText className="h-5 w-5 text-[#eaf143]" />}
              {activeTab === 2 && <ShieldCheck className="h-5 w-5 text-[#eaf143]" />}
              {activeTab === 3 && <PenTool className="h-5 w-5 text-[#eaf143]" />}
              {activeTab === 4 && <DollarSign className="h-5 w-5 text-emerald-400" />}
              {activeTab === 5 && <UserCheck className="h-5 w-5 text-emerald-400" />}
              
              {activeTab === 1 && 'Step 1: Key Fact Sheet Prefill & Email Dispatch'}
              {activeTab === 2 && 'Step 2: Confidentiality Deed (Run-Along Agreement)'}
              {activeTab === 3 && 'Step 3: Expression of Interest (EOI Form)'}
              {activeTab === 4 && 'Step 4: 5–10% Franchise Deposit Tracking'}
              {activeTab === 5 && 'Step 5: Convert Candidate to Franchisee User'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-300 mt-0.5">
              {activeTab === 1 && 'Configure territory facts and dispatch the personalized Key Fact Sheet email to candidate.'}
              {activeTab === 2 && 'Require candidate to digitally sign the Confidentiality Deed before their run-along.'}
              {activeTab === 3 && 'Send online EOI application form link and view submitted candidate details.'}
              {activeTab === 4 && 'Log and verify the 5-10% deposit payment before account provisioning.'}
              {activeTab === 5 && 'Provision Firebase Auth account and link to territory presale wizard.'}
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
              disabled={activeTab === 5}
              onClick={() => setActiveTab((activeTab + 1) as any)}
              className="h-8 text-xs bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* ========================================================================= */}
          {/* STEP 1: KEY FACT SHEET TAB CONTENT */}
          {/* ========================================================================= */}
          {activeTab === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Prefill Key Fact Sheet Form */}
              <div className="lg:col-span-6 space-y-4 border-r pr-0 lg:pr-6">
                <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Key Fact Sheet Financial Prefill
                </h3>

                <form onSubmit={handleSaveFactSheet} className="space-y-4 pt-1 max-h-[750px] overflow-y-auto pr-2">
                  {/* Section A: About the franchisor */}
                  <div className="p-3.5 bg-slate-50 border rounded-xl space-y-3">
                    <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">A. About the Franchisor</span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Franchisor Entity Name</label>
                        <Input
                          value={factSheetForm.franchisorName}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, franchisorName: e.target.value })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Years Operating in Australia</label>
                        <Input
                          value={factSheetForm.yearsInOperation}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, yearsInOperation: e.target.value })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Financial Viability (Able to pay debts when due?)</label>
                        <select
                          value={factSheetForm.financialViability}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, financialViability: e.target.value as any })}
                          className="w-full h-8 text-xs p-1 border rounded bg-white"
                        >
                          <option value="">-- Select --</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Major disputes */}
                  <div className="p-3.5 bg-slate-50 border rounded-xl space-y-3">
                    <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">B. Major Disputes</span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Current Disclosable Legal Proceedings?</label>
                        <select
                          value={factSheetForm.currentLegalProceedings}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, currentLegalProceedings: e.target.value as any })}
                          className="w-full h-8 text-xs p-1 border rounded bg-white"
                        >
                          <option value="">-- Select --</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Final Civil Judgments / Bankruptcy?</label>
                        <select
                          value={factSheetForm.finalJudgments}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, finalJudgments: e.target.value as any })}
                          className="w-full h-8 text-xs p-1 border rounded bg-white"
                        >
                          <option value="">-- Select --</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Franchisor-Franchisee Dispute Mediation %</label>
                        <Input
                          value={factSheetForm.disputeMediationPercent}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, disputeMediationPercent: e.target.value })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section C: Current and past franchisees */}
                  <div className="p-3.5 bg-slate-50 border rounded-xl space-y-3">
                    <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">C. Current & Past Franchisees</span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Franchisee Owned Count</label>
                        <Input
                          type="number"
                          value={factSheetForm.franchiseeOwnedCount}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, franchiseeOwnedCount: Number(e.target.value) })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Corporate Owned Count</label>
                        <Input
                          type="number"
                          value={factSheetForm.corporateOwnedCount}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, corporateOwnedCount: Number(e.target.value) })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] font-bold text-slate-800 uppercase block">
                          Financial Years History Table (Number of Occurrences)
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleAddFyColumn}
                          className="h-7 text-[11px] border-slate-300 text-[#095c7b] hover:bg-[#095c7b]/10 shrink-0 font-semibold"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add FY Column
                        </Button>
                      </div>

                      <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b text-[10px] uppercase">
                            <tr>
                              <th className="p-2 min-w-[200px] border-r">Event</th>
                              {factSheetForm.historyColumns.map((col) => (
                                <th key={col.id} className="p-2 border-r min-w-[140px] text-center">
                                  <div className="flex items-center justify-between gap-1">
                                    <Input
                                      value={col.label}
                                      onChange={(e) => handleUpdateFyColumnLabel(col.id, e.target.value)}
                                      className="text-[11px] h-7 text-center font-bold bg-white text-slate-900 border-slate-300 focus:ring-1 focus:ring-[#095c7b]"
                                      placeholder="FY label..."
                                    />
                                    {factSheetForm.historyColumns.length > 1 && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveFyColumn(col.id)}
                                        className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 shrink-0"
                                        title="Remove FY Column"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y text-[11px]">
                            {HISTORICAL_EVENT_ROWS.map((row) => (
                              <tr key={row.key} className="hover:bg-slate-50/50">
                                <td className="p-2 border-r text-slate-800 font-medium">{row.label}</td>
                                {factSheetForm.historyColumns.map((col) => (
                                  <td key={col.id} className="p-1.5 border-r">
                                    <Input
                                      type="number"
                                      value={col.occurrences[row.key as keyof typeof col.occurrences] ?? 0}
                                      onChange={(e) => handleUpdateFyOccurrence(col.id, row.key, Number(e.target.value))}
                                      className="text-xs h-7 text-center bg-slate-50 font-bold text-slate-900 focus:bg-white"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Section D: Territory or site */}
                  <div className="p-3.5 bg-slate-50 border rounded-xl space-y-4">
                    <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">D. Territory & Site Details</span>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700">Target Territory Name</label>
                      <Input
                        value={factSheetForm.territoryName}
                        onChange={(e) => setFactSheetForm({ ...factSheetForm, territoryName: e.target.value })}
                        placeholder="e.g. Parramatta Central"
                        className="text-xs h-8 bg-white"
                      />
                    </div>

                    {/* Checkbox Group 1: Details of the territory or site: Tick all that apply */}
                    <div className="space-y-2 pt-1 border-t">
                      <label className="text-[11px] font-bold text-slate-800 block">
                        Details of the territory or site: Tick all that apply
                      </label>
                      <div className="space-y-1.5 text-xs bg-white p-3 border rounded-lg">
                        {[
                          { id: 'limited_premises', label: 'The franchisee can only operate the business at a particular site (limited to premises only)' },
                          { id: 'no_territory', label: 'The franchisee can operate the business anywhere but may be competing with other franchised businesses (no territory)' },
                          { id: 'exclusive_territory', label: 'No other franchised business will operate in the franchisee’s defined territory (exclusive territory)' },
                          { id: 'non_exclusive_territory', label: 'You may encounter competition from other franchisees or the franchisor in your defined territory (non-exclusive territory)' },
                          { id: 'other', label: 'other – (add details below)' },
                        ].map((item) => {
                          const isChecked = (factSheetForm.territoryDetailsSelected || []).includes(item.id);
                          return (
                            <label key={item.id} className="flex items-start gap-2.5 cursor-pointer py-1 hover:bg-slate-50 rounded px-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleTerritoryDetail(item.id)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#095c7b] focus:ring-[#095c7b]"
                              />
                              <span className={isChecked ? 'font-bold text-slate-900' : 'text-slate-700'}>{item.label}</span>
                            </label>
                          );
                        })}

                        {(factSheetForm.territoryDetailsSelected || []).includes('other') && (
                          <div className="pt-2 pl-6">
                            <label className="text-[10px] font-semibold text-slate-500 block mb-1">Other Territory Details:</label>
                            <Input
                              value={factSheetForm.territoryOtherDetails}
                              onChange={(e) => setFactSheetForm({ ...factSheetForm, territoryOtherDetails: e.target.value })}
                              placeholder="Enter additional territory or site terms..."
                              className="text-xs h-8 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checkbox Group 2: Could franchisee face competition */}
                    <div className="space-y-2 pt-1 border-t">
                      <label className="text-[11px] font-bold text-slate-800 block">
                        Could the franchisee face competition from one or more businesses that sell goods or services that are substantially the same as the franchisee, including via online sales? Tick all that apply
                      </label>
                      <div className="space-y-1.5 text-xs bg-white p-3 border rounded-lg">
                        {[
                          { id: 'not_associated', label: 'Yes, but only from businesses not associated with the franchisor' },
                          { id: 'same_brand', label: 'Yes, from another franchisee with the same brand' },
                          { id: 'franchisor', label: 'Yes, from the franchisor' },
                          { id: 'third_party', label: 'Yes, from a third party authorised by the franchisor' },
                        ].map((item) => {
                          const isChecked = (factSheetForm.competitionTypesSelected || []).includes(item.id);
                          return (
                            <label key={item.id} className="flex items-start gap-2.5 cursor-pointer py-1 hover:bg-slate-50 rounded px-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCompetitionType(item.id)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#095c7b] focus:ring-[#095c7b]"
                              />
                              <span className={isChecked ? 'font-bold text-slate-900' : 'text-slate-700'}>{item.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs pt-1 border-t">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Can franchisor change territory?</label>
                        <select
                          value={factSheetForm.canFranchisorChangeTerritory}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, canFranchisorChangeTerritory: e.target.value as any })}
                          className="w-full h-8 text-xs p-1 border rounded bg-white font-medium"
                        >
                          <option value="">-- Select --</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Can sell online?</label>
                        <select
                          value={factSheetForm.canFranchiseeSellOnline}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, canFranchiseeSellOnline: e.target.value as any })}
                          className="w-full h-8 text-xs p-1 border rounded bg-white font-medium"
                        >
                          <option value="">-- Select --</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Franchisor lease interest?</label>
                        <select
                          value={factSheetForm.leaseInterest}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, leaseInterest: e.target.value as any })}
                          className="w-full h-8 text-xs p-1 border rounded bg-white font-medium"
                        >
                          <option value="">-- Select --</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section E: Supply of goods and services */}
                  <div className="p-3.5 bg-slate-50 border rounded-xl space-y-3">
                    <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">E. Goods & Services Supply</span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Supplier Choice Restrictions?</label>
                        <select
                          value={factSheetForm.supplierRestrictions}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, supplierRestrictions: e.target.value as any })}
                          className="w-full h-8 text-xs p-1 border rounded bg-white"
                        >
                          <option value="">-- Select --</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Franchisor Receives Supplier Rebates?</label>
                        <select
                          value={factSheetForm.franchisorRebates}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, franchisorRebates: e.target.value as any })}
                          className="w-full h-8 text-xs p-1 border rounded bg-white"
                        >
                          <option value="">-- Select --</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section F: What the franchisee has to pay */}
                  <div className="p-3.5 bg-slate-50 border rounded-xl space-y-3">
                    <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">F. Financial Setup & Operating Costs</span>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Initial Franchise Fee ($)</label>
                        <Input
                          type="number"
                          value={factSheetForm.franchiseFee}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, franchiseFee: Number(e.target.value) })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Training Fee ($)</label>
                        <Input
                          type="number"
                          value={factSheetForm.trainingFee}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, trainingFee: Number(e.target.value) })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Transaction Fee ($)</label>
                        <Input
                          type="number"
                          value={factSheetForm.transactionFee}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, transactionFee: Number(e.target.value) })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Vehicle Cost Range</label>
                        <Input
                          value={factSheetForm.vehicleCostRange}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, vehicleCostRange: e.target.value })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Working Capital Range</label>
                        <Input
                          value={factSheetForm.workingCapitalRange}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, workingCapitalRange: e.target.value })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section G & H & I: Marketing, Unilateral Variation & Earnings */}
                  <div className="p-3.5 bg-slate-50 border rounded-xl space-y-3">
                    <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">G, H & I. Marketing, Terms & Earnings</span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Marketing Fund Contribution</label>
                        <Input
                          value={factSheetForm.marketingFundContribution}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, marketingFundContribution: e.target.value })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Historical Earnings Included?</label>
                        <select
                          value={factSheetForm.historicalEarningsIncluded}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, historicalEarningsIncluded: e.target.value as any })}
                          className="w-full h-8 text-xs p-1 border rounded bg-white"
                        >
                          <option value="">-- Select --</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section J: End of franchise agreement */}
                  <div className="p-3.5 bg-slate-50 border rounded-xl space-y-3">
                    <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider block">J. End of Agreement Terms</span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Agreement Term</label>
                        <Input
                          value={factSheetForm.agreementTermYears}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, agreementTermYears: e.target.value })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Document Current Date</label>
                        <Input
                          value={factSheetForm.documentDate}
                          onChange={(e) => setFactSheetForm({ ...factSheetForm, documentDate: e.target.value })}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                    </div>

                    {/* Renewal Options Checkboxes */}
                    <div className="space-y-2 pt-1 border-t">
                      <label className="text-[11px] font-bold text-slate-800 block">
                        Does a franchisee have an option to renew the franchise agreement? Tick all that apply
                      </label>
                      <div className="space-y-1.5 text-xs bg-white p-3 border rounded-lg">
                        {[
                          { id: 'new_agreement', label: 'Yes – subject to a new agreement' },
                          { id: 'subject_conditions', label: 'Yes – subject to conditions' },
                          { id: 'no', label: 'No' },
                        ].map((item) => {
                          const isChecked = (factSheetForm.renewalOptionSelected || []).includes(item.id);
                          return (
                            <label key={item.id} className="flex items-start gap-2.5 cursor-pointer py-1 hover:bg-slate-50 rounded px-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleRenewalOption(item.id)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#095c7b] focus:ring-[#095c7b]"
                              />
                              <span className={isChecked ? 'font-bold text-slate-900' : 'text-slate-700'}>{item.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-bold text-slate-700">Territory Notes / Special Terms</label>
                      <textarea
                        rows={2}
                        value={factSheetForm.notes}
                        onChange={(e) => setFactSheetForm({ ...factSheetForm, notes: e.target.value })}
                        placeholder="Add any specific territory customer counts or earnings history notes..."
                        className="w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-[#095c7b] outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={savingFactSheet} className="bg-[#095c7b] hover:bg-[#074760] text-white text-xs font-bold">
                      {savingFactSheet ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                      Save All Sections (A–J)
                    </Button>
                    {kfsDone && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open(kfsPublicUrl, '_blank')}
                        className="text-xs border-slate-300 text-[#095c7b]"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View Public Page
                      </Button>
                    )}
                  </div>
                </form>

                {/* Public Link Box */}
                <div className="p-3 bg-slate-50 border rounded-xl space-y-2 mt-4">
                  <span className="text-[11px] font-bold uppercase text-slate-600 block">Shareable Public Key Fact Sheet URL</span>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={kfsPublicUrl} className="text-xs font-mono bg-white" />
                    <Button size="sm" variant="outline" onClick={() => handleCopyLink(kfsPublicUrl, 'Key Fact Sheet')} className="shrink-0 text-xs">
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Email Preview & Send Email */}
              <div className="lg:col-span-6 space-y-4">
                <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Live Key Fact Sheet Email Preview
                </h3>

                {/* Email Routing Info Box */}
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">From Sender:</span>
                    <span className="font-bold text-slate-900">greg.hart@mailplus.com.au (Greg Hart)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">To Recipient:</span>
                    <span className="font-bold text-slate-900">{prospect.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">CC:</span>
                    <span className="font-bold text-slate-900">michael.mcdaid@mailplus.com.au</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Subject:</span>
                    <span className="font-bold text-[#095c7b]">MailPlus Key Fact Sheet - Franchise Opportunity in {prospect.preferredTerritory}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Optional Personal Note in Email</label>
                  <Input
                    value={factSheetCustomNote}
                    onChange={(e) => setFactSheetCustomNote(e.target.value)}
                    placeholder="e.g. Great speaking earlier! Here is the fact sheet we discussed..."
                    className="text-xs"
                  />
                </div>

                {/* Styled Live HTML Preview Card following AGENTS.md */}
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-200 p-4">
                  <div className="max-w-[480px] mx-auto bg-white rounded-lg shadow-sm border overflow-hidden text-xs text-slate-800">
                    <div className="bg-[#095c7b] p-4 text-center">
                      <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus" className="h-7 mx-auto inline-block" />
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="font-bold text-slate-900">Hi {prospect.fullName},</p>
                      <p>Thank you for your interest in joining the MailPlus franchise network for <strong>{factSheetForm.territoryName}</strong>.</p>
                      <div className="p-3 bg-slate-50 border rounded space-y-1 text-[11px]">
                        <p><strong>Territory:</strong> {factSheetForm.territoryName}</p>
                        <p><strong>Franchise Fee:</strong> ${Number(factSheetForm.franchiseFee).toLocaleString('en-AU')}</p>
                        <p><strong>Training Fee:</strong> ${Number(factSheetForm.trainingFee).toLocaleString('en-AU')}</p>
                      </div>
                      {factSheetCustomNote && (
                        <p className="p-2 bg-amber-50 border-l-2 border-amber-500 italic text-[11px]">"{factSheetCustomNote}"</p>
                      )}
                      <div className="text-center py-2">
                        <span className="bg-[#095c7b] text-white px-4 py-2 rounded font-bold text-[11px] inline-block">
                          View Your Key Fact Sheet &rarr;
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 text-center border-t text-[10px] text-slate-500">
                      Sent by Greg Hart &bull; Powered by MailPlus Australia
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleSendStepEmail('fact_sheet')}
                  disabled={sendingFactSheetEmail}
                  className="w-full bg-[#095c7b] hover:bg-[#074760] text-white font-bold text-xs py-2.5 gap-2"
                >
                  {sendingFactSheetEmail ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Key Fact Sheet Email Now (From Greg Hart, CC Michael McDaid)
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: CONFIDENTIALITY DEED TAB CONTENT */}
          {/* ========================================================================= */}
          {activeTab === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Deed Details & Public URL */}
              <div className="lg:col-span-6 space-y-4 border-r pr-0 lg:pr-6">
                <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Confidentiality Deed Requirement (Run-Along)
                </h3>

                <p className="text-xs text-slate-600">
                  Before a prospective buyer can observe or participate in a territory run-along, they must sign the MailPlus digital Confidentiality Deed online.
                </p>

                {/* Public Link Box */}
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

                {/* Inline Signed Deed Display (if candidate has signed) */}
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
                    <span>Candidate has not yet signed the Confidentiality Deed. Use the form on the right to dispatch the signature email.</span>
                  </div>
                )}
              </div>

              {/* Right Column: Live Email Preview & Send Email */}
              <div className="lg:col-span-6 space-y-4">
                <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Live Confidentiality Deed Email Preview
                </h3>

                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">From Sender:</span>
                    <span className="font-bold text-slate-900">greg.hart@mailplus.com.au (Greg Hart)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">To Recipient:</span>
                    <span className="font-bold text-slate-900">{prospect.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">CC:</span>
                    <span className="font-bold text-slate-900">michael.mcdaid@mailplus.com.au</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Subject:</span>
                    <span className="font-bold text-[#095c7b]">MailPlus Confidentiality Deed - Run-Along Requirement for {prospect.preferredTerritory}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Optional Custom Message in Email</label>
                  <Input
                    value={deedCustomNote}
                    onChange={(e) => setDeedCustomNote(e.target.value)}
                    placeholder="e.g. Please sign this deed prior to your run-along with our franchisee on Tuesday..."
                    className="text-xs"
                  />
                </div>

                {/* Styled Live HTML Preview Card following AGENTS.md */}
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-200 p-4">
                  <div className="max-w-[480px] mx-auto bg-white rounded-lg shadow-sm border overflow-hidden text-xs text-slate-800">
                    <div className="bg-[#095c7b] p-4 text-center">
                      <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus" className="h-7 mx-auto inline-block" />
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="font-bold text-slate-900">Hi {prospect.fullName},</p>
                      <p>Before we arrange your hands-on territory run-along in <strong>{prospect.preferredTerritory}</strong>, MailPlus requires all prospective buyers to sign a digital Confidentiality Deed.</p>
                      {deedCustomNote && (
                        <p className="p-2 bg-amber-50 border-l-2 border-amber-500 italic text-[11px]">"{deedCustomNote}"</p>
                      )}
                      <div className="text-center py-2">
                        <span className="bg-[#095c7b] text-white px-4 py-2 rounded font-bold text-[11px] inline-block">
                          Sign Confidentiality Deed Online &rarr;
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 text-center border-t text-[10px] text-slate-500">
                      Sent by Greg Hart &bull; Powered by MailPlus Australia
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleSendStepEmail('confidentiality_deed')}
                  disabled={sendingDeedEmail}
                  className="w-full bg-[#095c7b] hover:bg-[#074760] text-white font-bold text-xs py-2.5 gap-2"
                >
                  {sendingDeedEmail ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Confidentiality Deed Email (From Greg Hart, CC Michael McDaid)
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: EXPRESSION OF INTEREST (EOI) TAB CONTENT */}
          {/* ========================================================================= */}
          {activeTab === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: EOI Application Details & Public URL */}
              <div className="lg:col-span-6 space-y-4 border-r pr-0 lg:pr-6">
                <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                  <PenTool className="h-4 w-4" /> Expression of Interest (EOI) Online Application
                </h3>

                <p className="text-xs text-slate-600">
                  The candidate completes their official EOI application form online, capturing entity structure, ABN, trade references, financial assets, and digital signature.
                </p>

                {/* Public Link Box */}
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

                {/* Inline Submitted EOI Viewer */}
                {eoiDone ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-600" /> Candidate Has Completed & Signed EOI
                      </span>
                      <Badge className="bg-emerald-700 text-white text-[10px]">Signed Online</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-200">
                      <div>
                        <span className="text-slate-500 block">Applicant Name:</span>
                        <span className="font-bold text-slate-900">{prospect.eoiData?.signerName || (prospect.eoiData as any)?.applicantName || prospect.fullName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Entity Structure:</span>
                        <span className="font-bold text-slate-900">{prospect.eoiData?.entityStructure || (prospect.eoiData as any)?.entityType || 'Individual'}</span>
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
                        <span className="text-slate-500 block">Business Address:</span>
                        <span className="font-bold text-slate-900">{prospect.eoiData?.businessAddress || 'N/A'}</span>
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
                    <span>Candidate has not yet submitted their EOI form. Dispatch the application link using the form on the right.</span>
                  </div>
                )}
              </div>

              {/* Right Column: Live Email Preview & Send Email */}
              <div className="lg:col-span-6 space-y-4">
                <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Live EOI Invitation Email Preview
                </h3>

                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">From Sender:</span>
                    <span className="font-bold text-slate-900">greg.hart@mailplus.com.au (Greg Hart)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">To Recipient:</span>
                    <span className="font-bold text-slate-900">{prospect.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">CC:</span>
                    <span className="font-bold text-slate-900">michael.mcdaid@mailplus.com.au</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Subject:</span>
                    <span className="font-bold text-[#095c7b]">MailPlus Expression of Interest (EOI) Application - {prospect.preferredTerritory}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Optional Custom Note in Email</label>
                  <Input
                    value={eoiCustomNote}
                    onChange={(e) => setEOICustomNote(e.target.value)}
                    placeholder="e.g. Following your run-along, please complete your official EOI form online..."
                    className="text-xs"
                  />
                </div>

                {/* Styled Live HTML Preview Card following AGENTS.md */}
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-200 p-4">
                  <div className="max-w-[480px] mx-auto bg-white rounded-lg shadow-sm border overflow-hidden text-xs text-slate-800">
                    <div className="bg-[#095c7b] p-4 text-center">
                      <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus" className="h-7 mx-auto inline-block" />
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="font-bold text-slate-900">Hi {prospect.fullName},</p>
                      <p>The next step in securing your MailPlus franchise in <strong>{prospect.preferredTerritory}</strong> is completing your Expression of Interest (EOI) application form online.</p>
                      {eoiCustomNote && (
                        <p className="p-2 bg-amber-50 border-l-2 border-amber-500 italic text-[11px]">"{eoiCustomNote}"</p>
                      )}
                      <div className="text-center py-2">
                        <span className="bg-[#095c7b] text-white px-4 py-2 rounded font-bold text-[11px] inline-block">
                          Complete & Sign EOI Form Online &rarr;
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 text-center border-t text-[10px] text-slate-500">
                      Sent by Greg Hart &bull; Powered by MailPlus Australia
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleSendStepEmail('eoi')}
                  disabled={sendingEOIEmail}
                  className="w-full bg-[#095c7b] hover:bg-[#074760] text-white font-bold text-xs py-2.5 gap-2"
                >
                  {sendingEOIEmail ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send EOI Invitation Email (From Greg Hart, CC Michael McDaid)
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: 5-10% DEPOSIT TAB CONTENT */}
          {/* ========================================================================= */}
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
                    <label className="text-xs font-bold text-slate-700">EFT Receipt / Bank Ref</label>
                    <Input
                      value={depositForm.receiptRef}
                      onChange={(e) => setDepositForm({ ...depositForm, receiptRef: e.target.value })}
                      placeholder="e.g. FR DEP SMITH"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Deposit Notes</label>
                  <textarea
                    rows={3}
                    value={depositForm.notes}
                    onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                    placeholder="Trust account receipt details..."
                    className="w-full p-2.5 text-xs border rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <Button type="submit" disabled={savingDeposit} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5">
                  {savingDeposit ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Save Deposit Status & Update Pipeline
                </Button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: CONVERT TAB CONTENT */}
          {/* ========================================================================= */}
          {activeTab === 5 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="border-b pb-3">
                <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-600" /> Convert Candidate to Franchisee User
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Provision the candidate's Firebase Auth user account, link to their territory entity, and launch the presale wizard.
                </p>
              </div>

              {!isPrerequisitesComplete && prospect.status !== 'Converted' ? (
                <div className="p-6 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-4 text-center">
                  <div className="p-3 bg-amber-100 rounded-full text-amber-800 inline-block">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h4 className="text-base font-bold text-amber-950">Step 5 Conversion Currently Locked</h4>
                  <p className="text-xs text-amber-800 max-w-md mx-auto">
                    Candidate conversion is strictly locked until all required prerequisite steps are satisfied:
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs font-semibold max-w-md mx-auto">
                    <div className={`p-2 rounded border ${kfsDone ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-white border-amber-200 text-slate-500'}`}>
                      1. Fact Sheet {kfsDone ? '✓' : '✗'}
                    </div>
                    <div className={`p-2 rounded border ${eoiDone ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-white border-amber-200 text-slate-500'}`}>
                      3. EOI Form {eoiDone ? '✓' : '✗'}
                    </div>
                    <div className={`p-2 rounded border ${depositDone ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-white border-amber-200 text-slate-500'}`}>
                      4. Deposit {depositDone ? '✓' : '✗'}
                    </div>
                  </div>
                  <Button disabled className="bg-slate-300 text-slate-500 cursor-not-allowed text-xs font-bold">
                    Locked — Complete Steps 1, 3 & 4 to Unlock
                  </Button>
                </div>
              ) : (
                <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-4 text-center">
                  <div className="p-3 bg-emerald-100 rounded-full text-emerald-800 inline-block">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-950">All Prerequisites Completed!</h4>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto">
                    Candidate details (ABN, business address, contact numbers) will be automatically prefilled into the user creation wizard.
                  </p>

                  <Button
                    onClick={handleStartConvert}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-6 shadow-md gap-2"
                  >
                    <UserCheck className="h-4 w-4" /> Start Franchisee User Provisioning Now
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidate Profile Details & Operations Log Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        {/* Candidate Profile Card */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-slate-800">Candidate Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">First Name</span>
                  <span className="font-semibold text-slate-900">{prospect.firstName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">Last Name</span>
                  <span className="font-semibold text-slate-900">{prospect.lastName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">Email</span>
                  <span className="font-semibold text-slate-900">{prospect.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">Phone</span>
                  <span className="font-semibold text-slate-900">{prospect.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">Preferred Primary Territory</span>
                  <span className="font-semibold text-slate-900 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                    {prospect.preferredTerritory || 'Unspecified'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">Preferred State</span>
                  <span className="font-semibold text-slate-900">{prospect.preferredState || 'Unspecified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">Applicant Type</span>
                  <span className="font-semibold text-slate-900">{prospect.interest || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">Has Vehicle?</span>
                  <span className="font-semibold text-slate-900">{prospect.vehicle || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">Submitted Date</span>
                  <span className="font-semibold text-slate-900">
                    {prospect.submittedAt ? new Date(prospect.submittedAt).toLocaleDateString('en-AU') : 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Interested Territories List & Edit Action */}
              <div className="mt-5 pt-4 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> All Interested Territories ({prospect.interestedTerritories?.length || (prospect.preferredTerritory ? 1 : 0)})
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenTerritoryModal}
                    className="h-7 text-xs border-slate-300 text-[#095c7b] hover:bg-[#095c7b]/10"
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
                          className={`text-xs py-1 px-2.5 gap-1.5 ${
                            isPrimary ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold' : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {isPrimary && <Star className="h-3 w-3 text-amber-500 fill-amber-400" />}
                          {ter}
                          {isPrimary && <span className="text-[10px] text-amber-700 font-semibold">(Primary)</span>}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Application Status */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500">Change Application Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="flex flex-wrap gap-2">
                {(['New', 'Contacted', 'Under Review', 'EOI Signed', 'Converted', 'Rejected', 'Archived'] as FranchiseProspect['status'][]).map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={prospect.status === st ? 'default' : 'outline'}
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus(st)}
                    className={prospect.status === st ? 'bg-[#095c7b]' : ''}
                  >
                    {st}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Internal Timeline & Outbound Log */}
        <div className="lg:col-span-5 space-y-6">
          {/* Operations Internal Notes Timeline */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase text-slate-500">Operations Timeline & Notes</CardTitle>
              <span className="text-xs text-slate-400 font-normal">{prospect.notes?.length || 0} logged</span>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {!prospect.notes || prospect.notes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No internal notes logged yet.</p>
                ) : (
                  prospect.notes.map((note) => (
                    <div key={note.id} className="p-2.5 bg-slate-50 border rounded-md text-xs space-y-1">
                      <div className="flex justify-between items-center text-slate-500 font-medium">
                        <span>{note.createdByName}</span>
                        <span>{new Date(note.createdAt).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-800">{note.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Input
                  placeholder="Log an internal note..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  className="text-xs"
                />
                <Button onClick={handleAddNote} disabled={addingNote || !newNoteText.trim()} className="bg-[#095c7b] hover:bg-[#074760] text-xs">
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Outbound Logs */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase text-slate-500">Outbound Email Dispatch Log</CardTitle>
              <span className="text-xs text-slate-400 font-normal">{prospect.emailLogs?.length || 0} sent</span>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {!prospect.emailLogs || prospect.emailLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No outbound emails sent yet.</p>
                ) : (
                  prospect.emailLogs.map((log) => (
                    <div key={log.id} className="p-2.5 bg-slate-50 border rounded-md text-xs space-y-1">
                      <span className="font-semibold text-slate-900 block">{log.subject}</span>
                      <span className="text-[11px] text-slate-500 block">Sent by {log.sentByName} on {new Date(log.sentAt).toLocaleDateString()}</span>
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
    </div>
  );
}
