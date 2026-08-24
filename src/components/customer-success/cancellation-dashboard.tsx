"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, getDocs, updateDoc, doc, addDoc, limit, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { deactivateLocalMileAccessForLead } from '@/services/localmile-deactivation';
import { Lead, CancellationRequest, ServiceSelection, RETENTION_STRATEGIES, RetentionStrategy } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader } from '@/components/ui/loader';
import { 
  ShieldAlert, 
  Smile, 
  Trash2, 
  HelpCircle, 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertTriangle,
  Sparkles,
  Calendar,
  ChevronRight,
  Info,
  Phone,
  PhoneCall
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { sendFieldSalesOutcomeToNetSuite } from '@/services/netsuite-field-sales-proxy';
import { logActivity } from '@/services/firebase';
import { ServiceSelectionDialog } from '@/components/service-selection-dialog';
import { fetch3MonthAvgInvoiceMRR } from '@/lib/cancellation-invoice-helper';

import { useToast } from '@/hooks/use-toast';

const REASONS = ['Price too high', 'Competitor offer', 'Service Quality issues', 'No longer needed', 'Business closed', 'Other'];
const COLORS = ['#095c7b', '#38bdf8', '#fb7185', '#34d399', '#fbbf24', '#a78bfa'];

export default function CancellationDashboard() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processMode, setProcessMode] = useState<'save' | 'cancel'>('save');

  // Save Strategy Form States
  const [saveStrategy, setSaveStrategy] = useState<RetentionStrategy>('Keep Existing Services & Pricing');
  const [editServices, setEditServices] = useState<ServiceSelection[]>([]);
  const [saveNotes, setSaveNotes] = useState('');

  // Cancel Form States
  const [cancelReason, setCancelReason] = useState('');
  const [trueCancellationDate, setTrueCancellationDate] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');

  // Signed customer & 3-month avg invoice states
  const [avg3MonthInvoice, setAvg3MonthInvoice] = useState<number | null>(null);
  const [isSignedCustomer, setIsSignedCustomer] = useState<boolean>(false);
  const [loadingInvoiceAvg, setLoadingInvoiceAvg] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState(false);

  // Resell workflow states
  const [fullLeadForResell, setFullLeadForResell] = useState<Lead | null>(null);
  const [isResellDialogOpen, setIsResellDialogOpen] = useState(false);
  const [loadingResellLead, setLoadingResellLead] = useState(false);

  const handleOpenResellDialog = async () => {
    if (!selectedRequest) return;
    setLoadingResellLead(true);
    try {
      const compSnap = await getDoc(doc(firestore, 'companies', selectedRequest.leadId));
      const leadSnap = compSnap.exists() ? compSnap : await getDoc(doc(firestore, 'leads', selectedRequest.leadId));
      if (leadSnap.exists()) {
        setFullLeadForResell({ id: leadSnap.id, ...leadSnap.data() } as Lead);
        setIsResellDialogOpen(true);
      } else {
        console.error("Lead/Company not found for resell dialog:", selectedRequest.leadId);
        toast({
          title: 'Customer Not Found',
          description: 'Could not locate customer details for sending resell quote.',
          variant: 'destructive',
        });
      }
    } catch (e) {
      console.error("Failed to load lead for resell:", e);
    } finally {
      setLoadingResellLead(false);
    }
  };

  const handleResellSuccess = async () => {
    if (!selectedRequest) return;
    try {
      const userDisplayName = userProfile?.displayName || userProfile?.email || 'System';
      const processedAt = new Date().toISOString();

      await updateDoc(doc(firestore, 'cancellations', selectedRequest.id), {
        status: 'Saved',
        saveStrategy: saveStrategy || 'Change Frequency & Update Price',
        notes: saveNotes ? `Resell / Quote issued. Notes: ${saveNotes}` : 'Resell / Quote issued to customer',
        processedBy: userDisplayName,
        processedAt
      });

      const compRef = doc(firestore, 'companies', selectedRequest.leadId);
      const leadRef = doc(firestore, 'leads', selectedRequest.leadId);
      const [compSnap, leadSnap] = await Promise.all([
        getDoc(compRef),
        getDoc(leadRef)
      ]);

      const updates = {
        cancellationRequested: false,
        customerStatus: 'Won'
      };

      if (compSnap.exists()) {
        await updateDoc(compRef, updates);
        await logActivity(selectedRequest.leadId, {
          type: 'Update',
          date: processedAt,
          notes: `Customer Saved from Cancellation via Resell / Quote Update.`,
          author: userDisplayName,
        }, 'companies');
      }

      if (leadSnap.exists()) {
        await updateDoc(leadRef, updates);
        await logActivity(selectedRequest.leadId, {
          type: 'Update',
          date: processedAt,
          notes: `Customer Saved from Cancellation via Resell / Quote Update.`,
          author: userDisplayName,
        }, 'leads');
      }

      setIsResellDialogOpen(false);
      setProcessModalOpen(false);
      fetchRequests();
    } catch (e) {
      console.error("Error finalizing resell save for cancellation request:", e);
    }
  };

  // Dynamic hierarchy states
  const [cancellationThemes, setCancellationThemes] = useState<any[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');
  const [selectedWhyId, setSelectedWhyId] = useState<string>('');
  const [selectedReasonId, setSelectedReasonId] = useState<string>('');

  useEffect(() => {
    fetchRequests();
    async function fetchHierarchy() {
      try {
        const snap = await getDocs(collection(firestore, 'cancellation_hierarchy'));
        setCancellationThemes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error fetching cancellation hierarchy:", e);
      }
    }
    fetchHierarchy();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(firestore, 'cancellations'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CancellationRequest));
      // Sort: Pending first, then by requestedDate desc
      const sorted = list.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime();
      });
      setRequests(sorted);
    } catch (e) {
      console.error("Error fetching cancellation requests:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProcess = async (req: CancellationRequest) => {
    setSelectedRequest(req);
    // Initialize services editing from request original services or lead's current services
    setEditServices(JSON.parse(JSON.stringify(req.originalServices || [])));
    setSaveStrategy('Keep Existing Services & Pricing');
    setProcessMode('save');
    setCancelReason(req.cancellationReason || 'Price too high');
    setSelectedThemeId(req.cancellationThemeId || '');
    setSelectedWhyId(req.cancellationWhyId || '');
    setSelectedReasonId(req.cancellationReasonId || '');
    setTrueCancellationDate(req.cancellationDate?.substring(0, 10) || new Date().toISOString().substring(0, 10));
    setSaveNotes('');
    setCancelNotes('');
    setProcessModalOpen(true);

    // Fetch signed status and 3-month average invoice value
    setLoadingInvoiceAvg(true);
    try {
      const leadDoc = await getDoc(doc(firestore, 'leads', req.leadId));
      const compDoc = await getDoc(doc(firestore, 'companies', req.leadId));
      const leadData = (compDoc.exists() ? compDoc.data() : leadDoc.data()) || {};
      const statusStr = leadData.customerStatus || leadData.status || '';
      const isSigned = ['Won', 'Signed', 'Customer', 'Lost Customer'].includes(statusStr) || compDoc.exists() || !!leadData.signedUpAt;
      
      setIsSignedCustomer(isSigned);

      if (isSigned) {
        const invoiceRes = await fetch3MonthAvgInvoiceMRR(req.leadId, req.leadId);
        setAvg3MonthInvoice(invoiceRes.avgMonthlyInvoice);
      } else {
        setAvg3MonthInvoice(null);
      }
    } catch (err) {
      console.error("Error fetching signed customer invoice average:", err);
      setIsSignedCustomer(false);
      setAvg3MonthInvoice(null);
    } finally {
      setLoadingInvoiceAvg(false);
    }
  };

  const calculateMRR = (services: ServiceSelection[]) => {
    if (!services || services.length === 0) return 0;
    let mrr = 0;
    for (const service of services) {
      if (!service.rate) continue;
      if (service.frequency === 'Adhoc') {
        mrr += service.rate * 1;
      } else if (Array.isArray(service.frequency)) {
        const weeklyDays = service.frequency.length;
        if (weeklyDays > 0) {
          mrr += service.rate * weeklyDays * 4.33;
        }
      }
    }
    return mrr;
  };

  const handleInitiateCall = async (req: CancellationRequest, phoneNumber: string) => {
    if (!phoneNumber) return;
    try {
      window.open(`aircall:${phoneNumber}`);
      const newCallsCount = (req.callsCount || 0) + 1;
      
      // Update local state
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, callsCount: newCallsCount } : r));
      
      // Update firestore request document
      await updateDoc(doc(firestore, 'cancellations', req.id), {
        callsCount: newCallsCount
      });
      
      // Log activity to lead profile
      const userDisplayName = userProfile?.displayName || userProfile?.email || 'System';
      await logActivity(req.leadId, {
        type: 'Call',
        notes: `Initiated call to customer regarding cancellation request. Total calls: ${newCallsCount}.`,
        author: userDisplayName
      });
    } catch (e) {
      console.error("Error logging call:", e);
    }
  };

  const handleSaveCustomer = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const userDisplayName = userProfile?.displayName || userProfile?.email || 'System';
      const processedAt = new Date().toISOString();

      // 1. Calculate updated services based on strategy
      let finalServices = [...editServices];
      if (saveStrategy === 'Keep Existing Services & Pricing') {
        finalServices = [...(selectedRequest.originalServices || [])];
      }

      // Analyze changes
      const originalServices = selectedRequest.originalServices || [];
      let serviceRateChanged = false;
      let serviceFrequencyChanged = false;
      let serviceDeleted = false;

      for (const orig of originalServices) {
        const match = finalServices.find(s => s.name === orig.name);
        if (!match) {
          serviceDeleted = true;
        } else {
          if (orig.rate !== match.rate) {
            serviceRateChanged = true;
          }
          const origFreqStr = Array.isArray(orig.frequency) ? [...orig.frequency].sort().join(',') : orig.frequency;
          const matchFreqStr = Array.isArray(match.frequency) ? [...match.frequency].sort().join(',') : match.frequency;
          if (origFreqStr !== matchFreqStr) {
            serviceFrequencyChanged = true;
          }
        }
      }

      if (finalServices.length < originalServices.length) {
        serviceDeleted = true;
      }

      const newInvoiceMRR = calculateMRR(finalServices);
      const savedMRR = newInvoiceMRR; // Retained revenue monthly value
      const baselineAvg = isSignedCustomer ? (avg3MonthInvoice ?? 0) : calculateMRR(originalServices);

      // 2. Update Company/Lead document
      const saveCompRef = doc(firestore, 'companies', selectedRequest.leadId);
      const saveLeadRef = doc(firestore, 'leads', selectedRequest.leadId);
      const [saveCompSnap, saveLeadSnap] = await Promise.all([
        getDoc(saveCompRef),
        getDoc(saveLeadRef)
      ]);

      const saveUpdates = {
        customerStatus: 'Won',
        bucket: 'customer_success',
        services: finalServices,
        cancellationRequested: false
      };

      if (saveCompSnap.exists()) {
        await updateDoc(saveCompRef, saveUpdates);
        await logActivity(selectedRequest.leadId, {
          type: 'Update',
          date: processedAt,
          notes: `Customer Saved from Cancellation. Strategy: ${saveStrategy}. Notes: ${saveNotes}`,
          author: userDisplayName,
        }, 'companies');
      }

      if (saveLeadSnap.exists()) {
        await updateDoc(saveLeadRef, saveUpdates);
        await logActivity(selectedRequest.leadId, {
          type: 'Update',
          date: processedAt,
          notes: `Customer Saved from Cancellation. Strategy: ${saveStrategy}. Notes: ${saveNotes}`,
          author: userDisplayName,
        }, 'leads');
      }

      // 3. Update Cancellation Request document
      const cancelReqRef = doc(firestore, 'cancellations', selectedRequest.id);
      await updateDoc(cancelReqRef, {
        status: 'Saved',
        saveStrategy,
        updatedServices: finalServices,
        notes: saveNotes,
        processedBy: userDisplayName,
        processedAt,
        isSignedCustomer,
        avg3MonthInvoiceMRR: isSignedCustomer ? (avg3MonthInvoice ?? 0) : undefined,
        newInvoiceMRR,
        originalMRR: baselineAvg,
        savedMRR,
        serviceRateChanged,
        serviceFrequencyChanged,
        serviceDeleted
      });

      setProcessModalOpen(false);
      fetchRequests();
    } catch (e) {
      console.error("Error saving customer:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelCustomer = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const userDisplayName = userProfile?.displayName || userProfile?.email || 'System';
      const processedAt = new Date().toISOString();

      const selectedThemeObj = cancellationThemes.find(t => t.id === selectedThemeId);
      const selectedWhyObj = selectedThemeObj?.whys?.find((w: any) => w.id === selectedWhyId);
      const selectedReasonObj = selectedWhyObj?.reasons?.find((r: any) => r.id === selectedReasonId);

      // 1. Update document in both 'companies' and 'leads' collections if present
      const compRef = doc(firestore, 'companies', selectedRequest.leadId);
      const leadRef = doc(firestore, 'leads', selectedRequest.leadId);
      const [compSnap, leadSnap] = await Promise.all([
        getDoc(compRef),
        getDoc(leadRef)
      ]);

      const cancellationUpdates = {
        customerStatus: 'Lost Customer',
        status: 'Lost Customer',
        cancellationReason: selectedReasonObj?.name || cancelReason,
        cancellationReasonId: selectedReasonId,
        cancellationTheme: selectedThemeObj?.name || '',
        cancellationThemeId: selectedThemeId,
        cancellationCategory: selectedWhyObj?.name || '',
        cancellationWhyId: selectedWhyId,
        cancellationdate: trueCancellationDate,
        cancellationRequested: false
      };

      if (compSnap.exists()) {
        await updateDoc(compRef, cancellationUpdates);
        await addDoc(collection(firestore, 'companies', selectedRequest.leadId, 'activity'), {
          type: 'Update',
          date: processedAt,
          notes: `Customer Cancellation Completed. Reason: ${cancelReason}. True Stop Date: ${trueCancellationDate}. Notes: ${cancelNotes}`,
          author: userDisplayName,
          syncedWithNetSuite: false
        });
      }

      if (leadSnap.exists()) {
        await updateDoc(leadRef, cancellationUpdates);
        await addDoc(collection(firestore, 'leads', selectedRequest.leadId, 'activity'), {
          type: 'Update',
          date: processedAt,
          notes: `Customer Cancellation Completed. Reason: ${cancelReason}. True Stop Date: ${trueCancellationDate}. Notes: ${cancelNotes}`,
          author: userDisplayName,
          syncedWithNetSuite: false
        });
      }

      const originalServices = selectedRequest.originalServices || [];
      const lostMRR = isSignedCustomer ? (avg3MonthInvoice ?? 0) : calculateMRR(originalServices);

      // 2. Update Cancellation Request document
      const cancelReqRef = doc(firestore, 'cancellations', selectedRequest.id);
      await updateDoc(cancelReqRef, {
        status: 'Cancelled',
        trueServiceCancellationDate: trueCancellationDate,
        cancellationReason: selectedReasonObj?.name || cancelReason,
        cancellationReasonId: selectedReasonId,
        cancellationTheme: selectedThemeObj?.name || '',
        cancellationThemeId: selectedThemeId,
        cancellationWhyId: selectedWhyId,
        notes: cancelNotes,
        processedBy: userDisplayName,
        processedAt,
        isSignedCustomer,
        avg3MonthInvoiceMRR: isSignedCustomer ? (avg3MonthInvoice ?? 0) : undefined,
        originalMRR: lostMRR
      });

      // Call NetSuite outcome sync with Customer - Lost outcome
      try {
        const leadData = (compSnap.exists() ? compSnap.data() : leadSnap.data()) || {};
        await sendFieldSalesOutcomeToNetSuite({
          leadId: selectedRequest.leadId,
          outcome: "Customer - Lost",
          linkedSalesRep: leadData?.salesRepAssigned || 'Unassigned',
          processedBy: userDisplayName,
          cancellationTheme: selectedThemeObj?.name || '',
          cancellationWhy: selectedWhyObj?.name || '',
          cancellationReason: selectedReasonObj?.name || cancelReason,
          cancellationDate: trueCancellationDate,
          cancellationNotes: cancelNotes
        });
      } catch (nsErr) {
        console.error("NetSuite outcome sync failed during cancellation", nsErr);
      }

      // Call external LocalMile deactivation logic
      deactivateLocalMileAccessForLead(selectedRequest.leadId, undefined, compSnap.exists() ? 'companies' : 'leads').catch(err => {
        console.error("LocalMile deactivation api fail", err);
      });

      // Trigger LPO cancellation cascade (child cancellation & LPO.Plus access disabling)
      try {
        await fetch('/api/companies/cancel-cascade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: selectedRequest.leadId,
            companyName: selectedRequest.companyName,
            cancellationReason: selectedReasonObj?.name || cancelReason,
            cancelledBy: userDisplayName
          })
        });
      } catch (cascadeErr) {
        console.error("Error triggering LPO cancellation cascade:", cascadeErr);
      }

      setProcessModalOpen(false);
      fetchRequests();
    } catch (e) {
      console.error("Error cancelling customer:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateServiceRate = (index: number, rate: number) => {
    setEditServices(prev => prev.map((s, idx) => idx === index ? { ...s, rate } : s));
  };

  const handleUpdateServiceFreq = (index: number, day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Adhoc', checked: boolean) => {
    setEditServices(prev => prev.map((s, idx) => {
      if (idx !== index) return s;
      if (day === 'Adhoc') {
        return { ...s, frequency: checked ? 'Adhoc' : [] };
      }
      let currentFreq = Array.isArray(s.frequency) ? [...s.frequency] : [];
      if (checked) {
        if (!currentFreq.includes(day)) currentFreq.push(day);
      } else {
        currentFreq = currentFreq.filter(d => d !== day);
      }
      return { ...s, frequency: currentFreq };
    }));
  };

  const handleRemoveService = (index: number) => {
    setEditServices(prev => prev.filter((_, idx) => idx !== index));
  };

  // Reporting Calculations
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'Pending').length;
    const saved = requests.filter(r => r.status === 'Saved').length;
    const cancelled = requests.filter(r => r.status === 'Cancelled').length;
    const successRate = total > 0 ? Math.round((saved / (saved + cancelled || 1)) * 100) : 0;

    // Reason breakdown
    const reasonsMap: Record<string, number> = {};
    requests.filter(r => r.status === 'Cancelled').forEach(r => {
      const reason = r.cancellationReason || 'Other';
      reasonsMap[reason] = (reasonsMap[reason] || 0) + 1;
    });
    const reasonsData = Object.entries(reasonsMap).map(([name, value]) => ({ name, value }));

    // Strategy breakdown
    const strategyMap: Record<string, number> = {};
    requests.filter(r => r.status === 'Saved').forEach(r => {
      const strategy = r.saveStrategy || 'Keep Existing';
      strategyMap[strategy] = (strategyMap[strategy] || 0) + 1;
    });
    const strategyData = Object.entries(strategyMap).map(([name, value]) => ({ name, value }));

    // Dates trend
    const dateMap: Record<string, { requested: number; cancelled: number }> = {};
    requests.forEach(r => {
      const reqDate = r.requestedDate?.substring(0, 7) || 'N/A'; // YYYY-MM
      if (!dateMap[reqDate]) dateMap[reqDate] = { requested: 0, cancelled: 0 };
      dateMap[reqDate].requested += 1;
      
      if (r.status === 'Cancelled' && r.trueServiceCancellationDate) {
        const cancelDate = r.trueServiceCancellationDate.substring(0, 7);
        if (!dateMap[cancelDate]) dateMap[cancelDate] = { requested: 0, cancelled: 0 };
        dateMap[cancelDate].cancelled += 1;
      }
    });
    const trendData = Object.entries(dateMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      total,
      pending,
      saved,
      cancelled,
      successRate,
      reasonsData,
      strategyData,
      trendData
    };
  }, [requests]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#d0dfcd]">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col bg-[#d0dfcd] min-h-screen sidebar-nav-theme">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#095c7b] tracking-tight">Customer Retention Center</h1>
          <p className="text-[#095c7b]/80 mt-1">Manage cancellation requests, apply save strategies, and track retention health.</p>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white/90 border-[#095c7b]/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Enquiries</p>
              <h3 className="text-2xl font-bold text-[#095c7b]">{stats.total}</h3>
            </div>
            <div className="p-2.5 bg-[#095c7b]/10 rounded-full text-[#095c7b]">
              <HelpCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/90 border-[#095c7b]/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Pipeline</p>
              <h3 className="text-2xl font-bold text-amber-600">{stats.pending}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-full text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-[#095c7b]/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Customers Saved</p>
              <h3 className="text-2xl font-bold text-emerald-600">{stats.saved}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-full text-emerald-600">
              <Smile className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-[#095c7b]/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Save Success Rate</p>
              <h3 className="text-2xl font-bold text-[#095c7b]">{stats.successRate}%</h3>
            </div>
            <div className="p-2.5 bg-[#eaf143]/20 rounded-full text-[#095c7b]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="pipeline" className="flex-1 flex flex-col h-full overflow-hidden">
        <TabsList className="bg-white/80 p-1.5 rounded-t-xl border border-white/60 w-fit shrink-0 gap-2 mb-0">
          <TabsTrigger value="pipeline" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
            Cancellation Pipeline ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
            Reports & Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="m-0 flex-1 bg-white/70 rounded-b-xl border border-t-0 border-white/60 p-4 overflow-y-auto">
          {requests.filter(r => r.status === 'Pending').length === 0 ? (
            <div className="text-center p-12 text-slate-500">No active cancellation requests found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-[#095c7b]">Company Name</TableHead>
                  <TableHead className="font-bold text-[#095c7b]">Requested Date</TableHead>
                  <TableHead className="font-bold text-[#095c7b]">Target Cancel Date</TableHead>
                  <TableHead className="font-bold text-[#095c7b]">Reason</TableHead>
                  <TableHead className="font-bold text-[#095c7b]">Calls Made</TableHead>
                  <TableHead className="font-bold text-[#095c7b]">Status</TableHead>
                  <TableHead className="font-bold text-[#095c7b]">Processed By</TableHead>
                  <TableHead className="font-bold text-[#095c7b] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.filter(r => r.status === 'Pending').map(req => (
                  <TableRow key={req.id}>
                    <TableCell className="font-semibold text-slate-800">
                      <div>
                        <a 
                          href={`/companies/${req.leadId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline text-[#095c7b] font-bold inline-block"
                        >
                          {req.companyName}
                        </a>
                        <div className="text-xs text-slate-500 font-normal flex items-center gap-2 mt-1 flex-wrap">
                          <span>{req.contactName || 'No Contact'}</span>
                          {req.contactPhone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-[#095c7b] hover:bg-[#095c7b]/10 rounded-full"
                              onClick={() => handleInitiateCall(req, req.contactPhone!)}
                              title="Call Customer"
                            >
                              <PhoneCall className="h-3 w-3" />
                            </Button>
                          )}
                          {(req.contactEmail || req.contactPhone) && <span className="text-slate-300">|</span>}
                          <span>{[req.contactPhone, req.contactEmail].filter(Boolean).join(' | ')}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {req.requestedDate ? new Date(req.requestedDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {req.cancellationDate ? new Date(req.cancellationDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 font-medium">
                      <Badge variant="outline" className="bg-slate-50 text-slate-700">
                        {req.cancellationReason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-700 text-center">
                      <Badge variant="secondary" className="font-semibold">
                        {req.callsCount || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        req.status === 'Pending' ? 'bg-amber-500 text-white' :
                        req.status === 'Saved' ? 'bg-emerald-500 text-white' :
                        'bg-rose-500 text-white'
                      }>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {req.processedBy ? (
                        <div>
                          <div>{req.processedBy}</div>
                          <div className="text-[10px] text-slate-400">
                            {req.processedAt ? new Date(req.processedAt).toLocaleDateString() : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unprocessed</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'Pending' ? (
                        <Button 
                          onClick={() => handleOpenProcess(req)} 
                          className="bg-[#095c7b] text-white hover:bg-[#074760] size-sm rounded-full gap-1"
                        >
                          Process Request <ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="text-slate-400 text-xs italic">
                          {req.status === 'Saved' ? `Saved: ${req.saveStrategy}` : 'Cancelled'}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="reports" className="m-0 flex-1 bg-white/70 rounded-b-xl border border-t-0 border-white/60 p-4 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Cancellation Reason Chart */}
            <Card className="bg-white/95 shadow-sm border-[#095c7b]/10">
              <CardHeader>
                <CardTitle className="text-[#095c7b] text-base font-bold">Cancellation Reasons</CardTitle>
                <CardDescription>Breakdown of cancellation reasons for lost customers</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {stats.reasonsData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-400 italic">No cancellation data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.reasonsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.reasonsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Save Strategy Chart */}
            <Card className="bg-white/95 shadow-sm border-[#095c7b]/10">
              <CardHeader>
                <CardTitle className="text-[#095c7b] text-base font-bold">Save Strategies Performance</CardTitle>
                <CardDescription>Breakdown of retention strategies used to save customers</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {stats.strategyData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-400 italic">No saved customers data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.strategyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.strategyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trend Chart */}
            <Card className="bg-white/95 shadow-sm border-[#095c7b]/10 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-[#095c7b] text-base font-bold">Retention & Cancellation Trend</CardTitle>
                <CardDescription>Requested cancellations vs actual true service cancellations</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {stats.trendData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-400 italic">No trend data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="requested" fill="#095c7b" name="Requested Cancellations" />
                      <Bar dataKey="cancelled" fill="#fb7185" name="True Service Cancellations" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>

      {/* Process Request Dialog */}
      <Dialog open={processModalOpen} onOpenChange={setProcessModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#095c7b]">
              Process Request: {selectedRequest?.companyName}
            </DialogTitle>
            <DialogDescription>
              Decide whether to apply a save strategy or execute the customer cancellation.
            </DialogDescription>
          </DialogHeader>

          {isSignedCustomer && (
            <div className="bg-sky-50/90 border border-sky-200 p-3.5 rounded-xl mb-4 flex items-center justify-between text-xs text-sky-900 shadow-2xs">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#095c7b] text-white">Signed Customer</Badge>
                <span className="font-semibold text-slate-700">3-Month Avg Invoice Value:</span>
              </div>
              <span className="font-bold text-sm text-[#095c7b]">
                {loadingInvoiceAvg ? 'Calculating...' : `$${(avg3MonthInvoice ?? 0).toFixed(2)}/mo`}
              </span>
            </div>
          )}

          {/* Toggle Process Mode */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg mb-6">
            <Button
              variant={processMode === 'save' ? 'default' : 'ghost'}
              className={`rounded-md py-1.5 text-sm ${processMode === 'save' ? 'bg-[#095c7b] text-white' : 'text-slate-600'}`}
              onClick={() => setProcessMode('save')}
            >
              <Smile className="h-4 w-4 mr-2" /> Save Customer
            </Button>
            <Button
              variant={processMode === 'cancel' ? 'default' : 'ghost'}
              className={`rounded-md py-1.5 text-sm ${processMode === 'cancel' ? 'bg-rose-600 text-white' : 'text-slate-600'}`}
              onClick={() => setProcessMode('cancel')}
            >
              <ShieldAlert className="h-4 w-4 mr-2" /> Complete Cancel
            </Button>
          </div>

          {processMode === 'save' ? (
            <div className="space-y-6">
              {/* Existing Services & Price Points Overview */}
              <div className="border border-slate-200 p-3.5 rounded-xl bg-slate-50 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#095c7b] flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#095c7b]" /> Current Active Services & Price Points
                  </span>
                  <Badge variant="outline" className="text-xs font-semibold text-[#095c7b] bg-[#095c7b]/5 border-[#095c7b]/20">
                    Est. MRR: ${calculateMRR(selectedRequest?.originalServices || []).toFixed(2)}/mo
                  </Badge>
                </div>

                {(!selectedRequest?.originalServices || selectedRequest.originalServices.length === 0) ? (
                  <div className="text-xs text-slate-500 italic py-1">No existing active services listed on this request.</div>
                ) : (
                  <div className="space-y-2">
                    {selectedRequest.originalServices.map((srv, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
                        <div>
                          <div className="font-bold text-slate-800">{srv.name}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            Frequency: <span className="font-medium text-slate-700">{Array.isArray(srv.frequency) ? srv.frequency.join(', ') : (srv.frequency || 'Adhoc')}</span>
                          </div>
                        </div>
                        <div className="font-bold text-[#095c7b] bg-[#095c7b]/5 px-3 py-1.5 rounded-md border border-[#095c7b]/15 text-xs">
                          ${srv.rate ? srv.rate.toFixed(2) : '0.00'} / trip
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Card: Launch Resell / Send New Quote Workflow */}
              {(selectedRequest as any).bucket !== 'lpo_network' && (
                <div className="bg-emerald-50/80 border border-emerald-200/90 p-4 rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 fill-emerald-100" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900">Change Service, Frequency or Price</h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Launch the official Resell / Send New Quote workflow to modify pricing or pickup days and issue an updated commencement form for customer sign-off.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleOpenResellDialog}
                    disabled={loadingResellLead}
                    className="w-full bg-[#095c7b] hover:bg-[#074760] text-white font-semibold text-xs py-2.5 shadow-sm rounded-lg flex items-center justify-center gap-2"
                  >
                    {loadingResellLead ? (
                      <Loader />
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4" />
                        Modify Services & Send Resell Quote
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Alternative Quick / Direct Save */}
              <div className="space-y-4 pt-3 border-t border-slate-200/80">
                <div className="space-y-2">
                  <Label htmlFor="saveStrategy" className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Retention Strategy
                  </Label>
                  <Select 
                    value={saveStrategy} 
                    onValueChange={(val: any) => setSaveStrategy(val)}
                  >
                    <SelectTrigger id="saveStrategy">
                      <SelectValue placeholder="Select strategy..." />
                    </SelectTrigger>
                    <SelectContent>
                      {RETENTION_STRATEGIES.map((strat) => (
                        <SelectItem key={strat} value={strat}>
                          {strat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saveNotes" className="font-bold text-slate-700">Retention Notes</Label>
                  <Textarea
                    id="saveNotes"
                    placeholder="Enter notes about how the customer was saved, discounts offered, or general agreement..."
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    className="min-h-[90px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setProcessModalOpen(false)} disabled={submitting}>Cancel</Button>
                <Button 
                  onClick={handleSaveCustomer} 
                  className="bg-[#095c7b] text-white hover:bg-[#074760]"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save & Retain Customer'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cancelTheme" className="font-bold text-rose-700">Theme</Label>
                  <Select 
                    value={selectedThemeId} 
                    onValueChange={(val) => {
                      setSelectedThemeId(val);
                      setSelectedWhyId('');
                      setSelectedReasonId('');
                    }}
                  >
                    <SelectTrigger id="cancelTheme">
                      <SelectValue placeholder="Select Theme..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cancellationThemes.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trueDate" className="font-bold text-rose-700">True Cancellation Date</Label>
                  <div className="relative">
                    <Input
                      id="trueDate"
                      type="date"
                      value={trueCancellationDate}
                      onChange={(e) => setTrueCancellationDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {selectedThemeId && (
                  <div className="space-y-2">
                    <Label htmlFor="cancelWhy" className="font-bold text-rose-700">Why</Label>
                    <Select 
                      value={selectedWhyId} 
                      onValueChange={(val) => {
                        setSelectedWhyId(val);
                        setSelectedReasonId('');
                      }}
                    >
                      <SelectTrigger id="cancelWhy">
                        <SelectValue placeholder="Select Subcategory..." />
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
                    <Label htmlFor="cancelReason" className="font-bold text-rose-700">Reason</Label>
                    <Select 
                      value={selectedReasonId} 
                      onValueChange={setSelectedReasonId}
                    >
                      <SelectTrigger id="cancelReason">
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

              <div className="space-y-2">
                <Label htmlFor="cancelNotes" className="font-bold text-slate-700">Cancellation Notes</Label>
                <Textarea
                  id="cancelNotes"
                  placeholder="Enter detailed reasons why the customer cannot be saved or additional exit survey info..."
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
                <Info className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700 space-y-1">
                  <p className="font-bold">Important Notice</p>
                  <p>Completing the cancellation will change the customer status to <span className="font-bold">Lost Customer</span> and deactivate any associated external platform user accounts.</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setProcessModalOpen(false)} disabled={submitting}>Cancel</Button>
                <Button 
                  onClick={handleCancelCustomer} 
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  disabled={submitting}
                >
                  {submitting ? 'Cancelling...' : 'Confirm & Cancel Service'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Service Selection / Resell Dialog for Cancellation Save */}
      {isResellDialogOpen && fullLeadForResell && (
        <ServiceSelectionDialog
          isOpen={isResellDialogOpen}
          onOpenChange={setIsResellDialogOpen}
          lead={fullLeadForResell}
          mode="Resell"
          onSuccess={handleResellSuccess}
        />
      )}

    </div>
  );
}
