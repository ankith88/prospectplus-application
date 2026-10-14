"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { collection, getDocs, updateDoc, doc, getDoc, query, where } from 'firebase/firestore';
import { firestore, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LossReasonPicker } from '@/components/loss-reason-picker';
import { getMergedCancellationHierarchy } from '@/lib/cancellation-reasons-mapper';
import { deactivateLocalMileAccessForLead } from '@/services/localmile-deactivation';
import { Lead, CSRequest, ServiceSelection, RETENTION_STRATEGIES, RetentionStrategy } from '@/lib/types';
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
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/services/firebase';
import { initiateOutboundCall } from '@/lib/telephony';
import { sendFieldSalesOutcomeToNetSuite } from '@/services/netsuite-field-sales-proxy';
import { ServiceSelectionDialog } from '@/components/service-selection-dialog';
import { 
  ListTodo, 
  Wrench, 
  UserMinus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Copy, 
  Phone, 
  ExternalLink, 
  Sparkles, 
  Search, 
  RefreshCw, 
  Trash2,
  DollarSign,
  Calendar,
  Filter,
  Plus,
  Paperclip,
  TrendingUp,
  Mail,
  ArrowUpRight,
  ArrowDownRight,
  Equal,
  Info,
  Zap
} from 'lucide-react';

const REASONS = ['Price too high', 'Competitor offer', 'Service Quality issues', 'No longer needed', 'Business closed', 'Other'];

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
export type DayOfWeek = typeof DAYS_OF_WEEK[number];

export const COMMON_SERVICES = [
  'AMPO',
  'PMPO',
  'EB',
  'CB',
  'Parcel Pickup',
  'Express Lodgement',
  'Weekly Banking',
  'Mail Delivery',
];

export const parseFrequencyDays = (freq: any): DayOfWeek[] => {
  if (Array.isArray(freq)) {
    return freq.filter((d): d is DayOfWeek => DAYS_OF_WEEK.includes(d as any));
  }
  if (typeof freq === 'string') {
    if (freq === 'Adhoc') return [];
    if (freq.includes('5') || freq.toLowerCase() === 'daily') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    if (freq.includes('3')) return ['Mon', 'Wed', 'Fri'];
    if (freq.includes('2')) return ['Tue', 'Thu'];
    if (freq.includes('1')) return ['Mon'];
    if (freq.includes('4')) return ['Mon', 'Tue', 'Wed', 'Thu'];
    if (freq.includes(',')) {
      const parts = freq.split(',').map(s => s.trim());
      return parts.filter((d): d is DayOfWeek => DAYS_OF_WEEK.includes(d as any));
    }
    if (DAYS_OF_WEEK.includes(freq as any)) return [freq as DayOfWeek];
  }
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
};

export const calculateServiceMonthlyCost = (rate: number, frequency: any): number => {
  if (!rate || isNaN(rate)) return 0;
  if (frequency === 'Adhoc') return Math.round(rate * 1 * 100) / 100;
  const days = parseFrequencyDays(frequency);
  if (days.length === 0) return Math.round(rate * 1 * 100) / 100;
  return Math.round(rate * days.length * 4.33 * 100) / 100;
};

export const calculateTotalMRR = (services: ServiceSelection[]): number => {
  if (!services || !Array.isArray(services)) return 0;
  const total = services.reduce((sum, srv) => {
    const rate = typeof srv.rate === 'number' ? srv.rate : parseFloat(String(srv.rate || 0)) || 0;
    return sum + calculateServiceMonthlyCost(rate, srv.frequency);
  }, 0);
  return Math.round(total * 100) / 100;
};

export const normalizeInitialServices = (services: ServiceSelection[]): ServiceSelection[] => {
  if (!services || !Array.isArray(services)) return [];
  return services.map(s => {
    const rateNum = typeof s.rate === 'number' ? s.rate : parseFloat(String(s.rate || 0)) || 0;
    if (s.frequency === 'Adhoc') {
      return { ...s, frequency: 'Adhoc', rate: rateNum };
    }
    const days = parseFrequencyDays(s.frequency);
    return {
      ...s,
      frequency: days.length > 0 ? days : 'Adhoc',
      rate: rateNum
    };
  });
};

export default function CSRequestsDashboard() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CSRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtering
  const [activeTab, setActiveTab] = useState<'all' | 'change_of_service' | 'cancellation'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Request & Processing Modal
  const [selectedRequest, setSelectedRequest] = useState<CSRequest | null>(null);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Helper to sync legacy cancellations collection
  const syncMirroredCancellation = async (req: CSRequest, updates: any) => {
    try {
      if (req.id) {
        await updateDoc(doc(firestore, 'cancellations', req.id), updates).catch(() => {});
      }
      if (req.leadId) {
        const cancelSnap = await getDocs(query(collection(firestore, 'cancellations'), where('leadId', '==', req.leadId)));
        await Promise.all(cancelSnap.docs.map(d => updateDoc(d.ref, updates).catch(() => {})));
      }
    } catch (e) {
      console.warn('[CS Requests] Mirror sync warning:', e);
    }
  };

  // Processing States for Service Change
  const [editServices, setEditServices] = useState<ServiceSelection[]>([]);
  const [serviceChangeNotes, setServiceChangeNotes] = useState('');
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState<string>('');
  const [customServiceName, setCustomServiceName] = useState<string>('');
  const [isAddingCustomService, setIsAddingCustomService] = useState<boolean>(false);

  // Custom Day Toggle for Service Frequency
  const handleToggleServiceDay = (index: number, day: DayOfWeek) => {
    const updated = [...editServices];
    const target = { ...updated[index] };
    const currentDays = parseFrequencyDays(target.frequency);
    let nextDays: DayOfWeek[];
    if (target.frequency === 'Adhoc') {
      nextDays = [day];
    } else if (currentDays.includes(day)) {
      nextDays = currentDays.filter(d => d !== day);
    } else {
      nextDays = DAYS_OF_WEEK.filter(d => currentDays.includes(d) || d === day);
    }
    target.frequency = nextDays.length === 0 ? 'Adhoc' : nextDays;
    updated[index] = target;
    setEditServices(updated);
  };

  const handleSetAllDays = (index: number) => {
    const updated = [...editServices];
    updated[index] = { ...updated[index], frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] };
    setEditServices(updated);
  };

  const handleSetAdhoc = (index: number) => {
    const updated = [...editServices];
    updated[index] = { ...updated[index], frequency: 'Adhoc' };
    setEditServices(updated);
  };

  const handleAddService = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setEditServices(prev => [
      ...prev,
      {
        name: trimmed,
        frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        rate: 14.50,
      }
    ]);
    setSelectedServiceToAdd('');
    setCustomServiceName('');
    setIsAddingCustomService(false);
  };

  // Live MRR Computations
  const baselineMRR = useMemo(() => {
    if (!selectedRequest) return 0;
    if (typeof selectedRequest.originalMRR === 'number' && selectedRequest.originalMRR > 0) {
      return selectedRequest.originalMRR;
    }
    const orig = selectedRequest.originalServices && selectedRequest.originalServices.length > 0 
      ? selectedRequest.originalServices 
      : selectedRequest.requestedServices || [];
    return calculateTotalMRR(orig);
  }, [selectedRequest]);

  const newMRR = useMemo(() => {
    return calculateTotalMRR(editServices);
  }, [editServices]);

  const mrrDelta = useMemo(() => {
    return Math.round((newMRR - baselineMRR) * 100) / 100;
  }, [newMRR, baselineMRR]);

  const changeAnalysis = useMemo(() => {
    if (!selectedRequest) return { rateChanged: false, freqChanged: false, added: false, deleted: false };
    const orig = selectedRequest.originalServices || [];
    const origNames = orig.map(s => s.name.trim().toLowerCase());
    const newNames = editServices.map(s => s.name.trim().toLowerCase());

    const added = newNames.some(name => !origNames.includes(name));
    const deleted = origNames.some(name => !newNames.includes(name));

    let rateChanged = false;
    let freqChanged = false;

    for (const ns of editServices) {
      const match = orig.find(os => os.name.trim().toLowerCase() === ns.name.trim().toLowerCase());
      if (match) {
        if (Number(match.rate || 0) !== Number(ns.rate || 0)) {
          rateChanged = true;
        }
        const oDays = parseFrequencyDays(match.frequency).sort().join(',');
        const nDays = parseFrequencyDays(ns.frequency).sort().join(',');
        const oAdhoc = match.frequency === 'Adhoc';
        const nAdhoc = ns.frequency === 'Adhoc';
        if (oDays !== nDays || oAdhoc !== nAdhoc) {
          freqChanged = true;
        }
      }
    }

    return { rateChanged, freqChanged, added, deleted };
  }, [selectedRequest, editServices]);

  // Processing States for Service Change
  const [serviceEffectiveDate, setServiceEffectiveDate] = useState<string>('');

  // Processing States for Cancellation
  const [cancelSaveStrategy, setCancelSaveStrategy] = useState<RetentionStrategy>('Keep Existing Services & Pricing');
  const [cancelSavedDate, setCancelSavedDate] = useState<string>('');
  const [cancelReason, setCancelReason] = useState('Other');
  const [trueCancellationDate, setTrueCancellationDate] = useState('');
  const [processMode, setProcessMode] = useState<'save' | 'cancel'>('save');
  const [cancelNotes, setCancelNotes] = useState('');

  // Email Notification States for Processing CS Requests
  const [sendNotificationEmail, setSendNotificationEmail] = useState(true);
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('mailplusit@mailplus.com.au, sarah.hart@mailplus.com.au');
  const [recipientSuggestions, setRecipientSuggestions] = useState<{
    franchiseeEmail?: string;
    franchiseeName?: string;
    contactEmail?: string;
    contactName?: string;
  }>({});
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Resell workflow states for Customer Retention
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
        toast({
          title: 'Customer Not Found',
          description: 'Could not locate customer details for sending resell quote.',
          variant: 'destructive',
        });
      }
    } catch (e) {
      console.error("Failed to load lead for resell:", e);
      toast({
        title: 'Error',
        description: 'Failed to load lead details for resell.',
        variant: 'destructive',
      });
    } finally {
      setLoadingResellLead(false);
    }
  };

  const handleResellSuccess = async () => {
    if (!selectedRequest) return;
    try {
      const userDisplayName = userProfile?.displayName || userProfile?.email || 'Customer Success Rep';
      const processedAt = new Date().toISOString();

      await updateDoc(doc(firestore, 'cs_requests', selectedRequest.id), {
        status: 'Saved',
        saveStrategy: cancelSaveStrategy,
        notes: cancelNotes ? `Resell / Quote issued. Strategy: ${cancelSaveStrategy}. Notes: ${cancelNotes}` : 'Resell / Quote issued to customer',
        attachments: proofAttachments,
        processedBy: userDisplayName,
        processedAt
      });

      await syncMirroredCancellation(selectedRequest, {
        status: 'Saved',
        saveStrategy: cancelSaveStrategy,
        notes: cancelNotes ? `Resell / Quote issued. Strategy: ${cancelSaveStrategy}. Notes: ${cancelNotes}` : 'Resell / Quote issued to customer',
        attachments: proofAttachments,
        processedBy: userDisplayName,
        processedAt
      });

      const saveCompRef = doc(firestore, 'companies', selectedRequest.leadId);
      const saveLeadRef = doc(firestore, 'leads', selectedRequest.leadId);
      const [saveCompSnap, saveLeadSnap] = await Promise.all([
        getDoc(saveCompRef),
        getDoc(saveLeadRef)
      ]);

      const saveUpdates = {
        cancellationRequested: false,
        customerStatus: 'Won'
      };

      if (saveCompSnap.exists()) {
        await updateDoc(saveCompRef, saveUpdates);
        await logActivity(selectedRequest.leadId, {
          type: 'Update',
          date: processedAt,
          notes: `Customer Saved from Cancellation via Resell / Quote Update. Strategy: ${cancelSaveStrategy}`,
          author: userDisplayName,
        }, 'companies');
      }

      if (saveLeadSnap.exists()) {
        await updateDoc(saveLeadRef, saveUpdates);
        await logActivity(selectedRequest.leadId, {
          type: 'Update',
          date: processedAt,
          notes: `Customer Saved from Cancellation via Resell / Quote Update. Strategy: ${cancelSaveStrategy}`,
          author: userDisplayName,
        }, 'leads');
      }

      toast({
        title: 'Resell Quote Sent',
        description: `${selectedRequest.companyName} retention quote sent & customer marked as Saved!`,
      });

      setIsResellDialogOpen(false);
      setProcessModalOpen(false);
      fetchRequests();
    } catch (e) {
      console.error("Error finalizing resell save for CS request:", e);
      toast({
        title: 'Error',
        description: 'Failed to update request status after sending quote.',
        variant: 'destructive',
      });
    }
  };

  // Cancellation Hierarchy & Proof Attachments
  const [cancellationThemes, setCancellationThemes] = useState<any[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [selectedWhyId, setSelectedWhyId] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [proofAttachments, setProofAttachments] = useState<Array<{ name: string; url: string; size?: number; type?: string; uploadedAt?: string }>>([]);
  const [uploadingProofFile, setUploadingProofFile] = useState(false);

  useEffect(() => {
    fetchRequests();
    const fetchHierarchy = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'cancellation_hierarchy'));
        setCancellationThemes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error fetching cancellation hierarchy:', e);
      }
    };
    fetchHierarchy();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Helper to identify public portal or company profile requests
      const isPublicOrProfileRequest = (item: any) => {
        if (!item) return false;
        if (item.source === 'public_portal' || item.source === 'company_profile') return true;
        if (item.cancellationTheme === 'Customer Portal Request' || item.cancellationTheme === 'Company Profile Request') return true;
        if (item.processedBy === 'Customer Online Portal') return true;
        // If it's a service change request from cs_requests, keep it
        if (item.requestType === 'change_of_service') return true;
        return false;
      };

      // 1. Fetch from cs_requests (public portal & company profile CS requests)
      const csSnap = await getDocs(collection(firestore, 'cs_requests'));
      const csList = csSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as CSRequest))
        .filter(isPublicOrProfileRequest);

      // 2. Fetch items from cancellations collection, filtering ONLY for public portal & company profile requests
      const cancelSnap = await getDocs(collection(firestore, 'cancellations'));
      const legacyList = cancelSnap.docs
        .map(d => {
          const data = d.data();
          return {
            id: d.id,
            source: data.source,
            requestType: 'cancellation' as const,
            leadId: data.leadId,
            netsuiteId: data.netsuiteId || '',
            companyName: data.companyName || 'Unknown Company',
            contactName: data.contactName,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            requestedDate: data.requestedDate || new Date().toISOString(),
            cancellationDate: data.cancellationDate,
            cancellationReason: data.cancellationReason,
            cancellationTheme: data.cancellationTheme,
            cancellationWhy: data.cancellationWhy,
            status: data.status || 'Pending',
            notes: data.cancellationNotes || data.notes || '',
            originalServices: data.originalServices || [],
            processedBy: data.processedBy,
            createdAt: data.createdAt,
          } as CSRequest;
        })
        .filter(isPublicOrProfileRequest);

      // Deduplicate by leadId + requestType + requestedDate (or doc ID)
      const existingKeys = new Set(
        csList.map(item => {
          const dateStr = item.requestedDate ? item.requestedDate.substring(0, 10) : '';
          return `${item.leadId}_${item.requestType}_${dateStr}`;
        })
      );
      const existingIds = new Set(csList.map(item => item.id));

      const merged = [...csList];

      for (const leg of legacyList) {
        const dateStr = leg.requestedDate ? leg.requestedDate.substring(0, 10) : '';
        const key = `${leg.leadId}_${leg.requestType}_${dateStr}`;
        if (!existingIds.has(leg.id) && !existingKeys.has(key)) {
          merged.push(leg);
          existingKeys.add(key);
        }
      }

      // Sort: Pending first, then by requestedDate desc
      merged.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return new Date(b.requestedDate || 0).getTime() - new Date(a.requestedDate || 0).getTime();
      });

      setRequests(merged);
    } catch (e) {
      console.error('[CS Requests Dashboard] Error fetching requests:', e);
      toast({
        title: 'Error loading requests',
        description: 'Failed to retrieve CS requests.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtered requests computed property
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // 1. Tab filter
      if (activeTab === 'change_of_service' && req.requestType !== 'change_of_service') return false;
      if (activeTab === 'cancellation' && req.requestType !== 'cancellation') return false;

      // 2. Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'Pending' && req.status !== 'Pending') return false;
        if (statusFilter === 'Completed' && req.status !== 'Completed' && req.status !== 'Saved') return false;
        if (statusFilter === 'Cancelled' && req.status !== 'Cancelled') return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const comp = (req.companyName || '').toLowerCase();
        const ns = (req.netsuiteId || '').toLowerCase();
        const contact = (req.contactName || '').toLowerCase();
        const email = (req.contactEmail || '').toLowerCase();
        return comp.includes(q) || ns.includes(q) || contact.includes(q) || email.includes(q);
      }

      return true;
    });
  }, [requests, activeTab, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = requests.length;
    const serviceChanges = requests.filter(r => r.requestType === 'change_of_service').length;
    const cancellations = requests.filter(r => r.requestType === 'cancellation').length;
    const pending = requests.filter(r => r.status === 'Pending').length;

    return { total, serviceChanges, cancellations, pending };
  }, [requests]);

  const handleAddEmail = (target: 'to' | 'cc', emailToAdd?: string) => {
    if (!emailToAdd) return;
    const clean = emailToAdd.trim();
    if (!clean) return;

    if (target === 'to') {
      const currentList = emailTo.split(',').map(e => e.trim()).filter(Boolean);
      if (!currentList.includes(clean)) {
        setEmailTo([...currentList, clean].join(', '));
      }
    } else {
      const currentList = emailCc.split(',').map(e => e.trim()).filter(Boolean);
      if (!currentList.includes(clean)) {
        setEmailCc([...currentList, clean].join(', '));
      }
    }
  };

  const handleOpenProcess = (req: CSRequest) => {
    setSelectedRequest(req);
    setEditServices(normalizeInitialServices(req.requestedServices || req.originalServices || []));
    setServiceChangeNotes(req.notes || '');
    setSelectedServiceToAdd('');
    setCustomServiceName('');
    setIsAddingCustomService(false);
    const initialEffDate = req.effectiveDate || req.requestedDate?.substring(0, 10) || new Date().toISOString().substring(0, 10);
    setServiceEffectiveDate(initialEffDate);

    setCancelSaveStrategy('Keep Existing Services & Pricing');
    setCancelSavedDate(new Date().toISOString().substring(0, 10));
    setCancelReason(req.cancellationReason || 'Other');
    setTrueCancellationDate(req.cancellationDate?.substring(0, 10) || new Date().toISOString().substring(0, 10));
    setCancelNotes(req.notes || '');
    setProcessMode('save');

    // Email notification defaults
    setSendNotificationEmail(true);
    const initialTo = req.contactEmail || '';
    setEmailTo(initialTo);
    setEmailCc('mailplusit@mailplus.com.au, sarah.hart@mailplus.com.au');
    setRecipientSuggestions({
      contactEmail: req.contactEmail || '',
      contactName: req.contactName || '',
    });

    if (req.leadId) {
      setLoadingRecipients(true);
      fetch(`/api/cs-requests?action=recipients&leadId=${req.leadId}`)
        .then(res => res.json())
        .then(data => {
          if (data?.success) {
            setRecipientSuggestions({
              franchiseeEmail: data.franchiseeEmail,
              franchiseeName: data.franchiseeName,
              contactEmail: data.contactEmail || req.contactEmail,
              contactName: data.contactName || req.contactName,
            });
            // If franchisee email exists, default TO to franchisee email
            if (data.franchiseeEmail) {
              setEmailTo(data.franchiseeEmail);
            } else if (data.contactEmail && !initialTo) {
              setEmailTo(data.contactEmail);
            }
            if (data.defaultCc) {
              setEmailCc(data.defaultCc);
            }
          }
        })
        .catch(err => console.warn('[CS Requests] Error loading recipient details:', err))
        .finally(() => setLoadingRecipients(false));
    }

    // Pre-populate cancellation hierarchy IDs
    const activeThemes = getMergedCancellationHierarchy(cancellationThemes);
    let initThemeId = req.cancellationThemeId || '';
    let initWhyId = req.cancellationWhyId || '';
    let initReasonId = req.cancellationReasonId || '';

    if (!initReasonId && req.cancellationReason) {
      for (const t of activeThemes) {
        for (const w of (t.whys || [])) {
          for (const r of (w.reasons || [])) {
            if (
              r.name.toLowerCase() === req.cancellationReason.toLowerCase() ||
              r.id === req.cancellationReasonId
            ) {
              initThemeId = String(t.id);
              initWhyId = String(w.id);
              initReasonId = String(r.id);
              break;
            }
          }
        }
      }
    }
    setSelectedThemeId(initThemeId);
    setSelectedWhyId(initWhyId);
    setSelectedReasonId(initReasonId);
    setProofAttachments(req.attachments || []);

    setProcessModalOpen(true);
  };

  const handleProofFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingProofFile(true);
    try {
      const uploadedList = [...proofAttachments];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fileUrl = '';

        try {
          const storageRef = ref(storage, `cancellations/proofs/${selectedRequest?.leadId || 'general'}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          fileUrl = await getDownloadURL(storageRef);
        } catch (storageErr) {
          console.warn('[Proof Upload] Firebase Storage fallback to Base64:', storageErr);
          fileUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        uploadedList.push({
          name: file.name,
          url: fileUrl,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        });
      }
      setProofAttachments(uploadedList);
      toast({
        title: 'Document Attached',
        description: `${files.length} proof document(s) attached.`,
      });
    } catch (err: any) {
      console.error('Error attaching proof file:', err);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err.message || 'Failed to attach proof document.',
      });
    } finally {
      setUploadingProofFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveProofAttachment = (index: number) => {
    setProofAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopyPublicLink = (companyId: string, companyName: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prospectplus.com.au';
    const publicUrl = `${origin}/customer-request/${companyId}`;
    navigator.clipboard.writeText(publicUrl);

    toast({
      title: 'Public Request Link Copied',
      description: `Link for ${companyName} copied to clipboard!`,
    });
  };

  const handleInitiateCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    initiateOutboundCall(phoneNumber, userProfile);
  };

  // Process Change of Service (Applies new services & completes request)
  const handleProcessServiceChange = async (newStatus: 'Completed' | 'Cancelled') => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const userDisplayName = userProfile?.displayName || userProfile?.email || 'Customer Success Rep';
      const processedAt = new Date().toISOString();

      const todayStr = processedAt.substring(0, 10);
      const targetEffectiveDate = (serviceEffectiveDate || selectedRequest.effectiveDate || todayStr).trim();
      const isFutureDated = targetEffectiveDate > todayStr;

      if (newStatus === 'Completed') {
        const compRef = doc(firestore, 'companies', selectedRequest.leadId);
        const leadRef = doc(firestore, 'leads', selectedRequest.leadId);
        const [compSnap, leadSnap] = await Promise.all([
          getDoc(compRef),
          getDoc(leadRef)
        ]);

        const existingData = compSnap.exists() ? compSnap.data() : (leadSnap.exists() ? leadSnap.data() : null);
        const originalServices: ServiceSelection[] = selectedRequest.originalServices || existingData?.services || [];
        const existingMonthlyValue = typeof existingData?.monthlyValue === 'number' && existingData.monthlyValue > 0 
          ? existingData.monthlyValue 
          : (typeof existingData?.mrr === 'number' && existingData.mrr > 0 ? existingData.mrr : 0);
        
        const effectiveBaselineMRR = selectedRequest.originalMRR ?? (
          existingMonthlyValue > 0 ? existingMonthlyValue : calculateTotalMRR(originalServices)
        );
        const calculatedNewMRR = calculateTotalMRR(editServices);
        const calculatedDelta = Math.round((calculatedNewMRR - effectiveBaselineMRR) * 100) / 100;
        const deltaFormatted = calculatedDelta >= 0 ? `+$${calculatedDelta.toFixed(2)}` : `-$${Math.abs(calculatedDelta).toFixed(2)}`;

        if (isFutureDated) {
          // Future-dated: Stage under scheduledServiceChange.
          // Current live services, rates, and MRR remain untouched today.
          // The daily transition cron (/api/cron/process-scheduled-service-changes) will promote them on targetEffectiveDate.
          const scheduledPayload = {
            services: editServices,
            monthlyValue: calculatedNewMRR,
            mrr: calculatedNewMRR,
            effectiveDate: targetEffectiveDate,
            requestedAt: processedAt,
            processedBy: userDisplayName,
            notes: serviceChangeNotes,
            mrrDelta: calculatedDelta,
            originalMRR: effectiveBaselineMRR,
          };

          const updates: any = {
            scheduledServiceChange: scheduledPayload,
            serviceChangeRequested: false,
            updatedAt: processedAt,
          };

          if (compSnap.exists()) {
            await updateDoc(compRef, updates);
          }
          if (leadSnap.exists()) {
            await updateDoc(leadRef, updates);
          }

          // Update cs_requests document
          await updateDoc(doc(firestore, 'cs_requests', selectedRequest.id), {
            status: 'Completed',
            updatedServices: editServices,
            originalMRR: effectiveBaselineMRR,
            newMRR: calculatedNewMRR,
            savedMRR: calculatedNewMRR,
            mrrDelta: calculatedDelta,
            effectiveDate: targetEffectiveDate,
            isScheduledFuture: true,
            serviceRateChanged: changeAnalysis.rateChanged,
            serviceFrequencyChanged: changeAnalysis.freqChanged,
            serviceAdded: changeAnalysis.added,
            serviceDeleted: changeAnalysis.deleted,
            notes: serviceChangeNotes ? `${selectedRequest.notes || ''}\n[Scheduled for ${targetEffectiveDate}]: ${serviceChangeNotes}` : selectedRequest.notes,
            processedBy: userDisplayName,
            processedAt,
          });

          // Log activity
          await logActivity(selectedRequest.leadId, {
            type: 'Update',
            date: processedAt,
            notes: `Change of Service Request processed by ${userDisplayName}.\nEffective Date: ${targetEffectiveDate} (Future Scheduled Transition).\nCurrent services and MRR ($${effectiveBaselineMRR.toFixed(2)}/mo) remain active today.\nRates will automatically transition on ${targetEffectiveDate} to new MRR: $${calculatedNewMRR.toFixed(2)} (${deltaFormatted}/mo).`,
            author: userDisplayName,
          }, compSnap.exists() ? 'companies' : 'leads');

          toast({
            title: 'Service Change Scheduled for Future',
            description: `Rates and MRR ($${calculatedNewMRR.toFixed(2)}/mo) will take effect automatically on ${targetEffectiveDate}. Current MRR ($${effectiveBaselineMRR.toFixed(2)}/mo) remains active until then.`,
          });
        } else {
          // Immediate or Back-Dated: Update live services, rates, and MRR immediately.
          const previousHistory = existingData?.serviceHistory || [];
          const historyRecord = {
            services: originalServices,
            replacedAt: processedAt,
            replacedBy: userDisplayName,
            reason: serviceChangeNotes ? `Service Change: ${serviceChangeNotes}` : 'Change of Service completed in CS Requests',
            source: 'Direct Staff Adjustment (No SF Sent)',
            previousMRR: effectiveBaselineMRR,
            newMRR: calculatedNewMRR,
            mrrDelta: calculatedDelta,
            effectiveDate: targetEffectiveDate,
          };

          const updates: any = {
            services: editServices,
            monthlyValue: calculatedNewMRR,
            mrr: calculatedNewMRR,
            estimatedMrr: calculatedNewMRR,
            serviceChangeRequested: false,
            scheduledServiceChange: null,
            lastServiceChangeDate: processedAt,
            customerStatus: 'Won',
            serviceHistory: [historyRecord, ...previousHistory],
            updatedAt: processedAt,
          };

          if (compSnap.exists()) {
            await updateDoc(compRef, updates);
          }
          if (leadSnap.exists()) {
            await updateDoc(leadRef, updates);
          }

          // Update cs_requests document
          await updateDoc(doc(firestore, 'cs_requests', selectedRequest.id), {
            status: 'Completed',
            updatedServices: editServices,
            originalMRR: effectiveBaselineMRR,
            newMRR: calculatedNewMRR,
            savedMRR: calculatedNewMRR,
            mrrDelta: calculatedDelta,
            effectiveDate: targetEffectiveDate,
            isScheduledFuture: false,
            serviceRateChanged: changeAnalysis.rateChanged,
            serviceFrequencyChanged: changeAnalysis.freqChanged,
            serviceAdded: changeAnalysis.added,
            serviceDeleted: changeAnalysis.deleted,
            notes: serviceChangeNotes ? `${selectedRequest.notes || ''}\n[Resolution]: ${serviceChangeNotes}` : selectedRequest.notes,
            processedBy: userDisplayName,
            processedAt,
          });

          // Log activity
          await logActivity(selectedRequest.leadId, {
            type: 'Update',
            date: processedAt,
            notes: `Change of Service Request completed by ${userDisplayName}.\nEffective Date: ${targetEffectiveDate} (${targetEffectiveDate < todayStr ? 'Back-Dated' : 'Today'} - Applied Immediately).\nMRR updated: $${effectiveBaselineMRR.toFixed(2)} → $${calculatedNewMRR.toFixed(2)} (${deltaFormatted}/mo).\nActive services count: ${editServices.length}`,
            author: userDisplayName,
          }, compSnap.exists() ? 'companies' : 'leads');

          const sanitizedTo = emailTo.split(',').map(e => e.trim()).filter(Boolean).join(', ');
          const sanitizedCc = emailCc.split(',').map(e => e.trim()).filter(Boolean).join(', ');

          toast({
            title: 'Service Change Completed',
            description: `Services and MRR ($${calculatedNewMRR.toFixed(2)}/mo) updated immediately (Effective: ${targetEffectiveDate}).${sendNotificationEmail && sanitizedTo ? ` Notification sent to ${sanitizedTo}.` : ''}`,
          });

          // Trigger automated Service Change Email Notification if enabled
          if (sendNotificationEmail && sanitizedTo) {
            fetch('/api/notifications/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'service_change_outcome',
                payload: {
                  outcome: 'Service Change',
                  leadId: selectedRequest.leadId,
                  companyName: selectedRequest.companyName,
                  services: editServices,
                  originalMRR: effectiveBaselineMRR,
                  newMRR: calculatedNewMRR,
                  mrrDelta: calculatedDelta,
                  serviceChangeNotes,
                  effectiveDate: targetEffectiveDate,
                  isFutureDated,
                  processedBy: userDisplayName,
                  processedByEmail: userProfile?.email || '',
                  customFrom: userProfile?.email ? `${userDisplayName} <${userProfile.email}>` : undefined,
                  customTo: sanitizedTo,
                  customCc: sanitizedCc,
                }
              })
            })
              .then(res => res.json())
              .then(data => {
                if (data && !data.success) {
                  console.warn('[CS Requests] Email notification failed:', data.reason || data.error);
                  toast({
                    title: 'Email Delivery Warning',
                    description: `Service change applied, but notification email failed: ${data.reason || 'Unknown error'}`,
                    variant: 'destructive',
                  });
                }
              })
              .catch(emailErr => console.error("[CS Requests] Error sending service change email:", emailErr));
          }
        }
      } else {
        // Dismiss / Cancel request
        await updateDoc(doc(firestore, 'cs_requests', selectedRequest.id), {
          status: 'Cancelled',
          notes: serviceChangeNotes ? `${selectedRequest.notes || ''}\n[Dismissed]: ${serviceChangeNotes}` : selectedRequest.notes,
          processedBy: userDisplayName,
          processedAt,
        });

        const compRef = doc(firestore, 'companies', selectedRequest.leadId);
        const leadRef = doc(firestore, 'leads', selectedRequest.leadId);
        const [compSnap, leadSnap] = await Promise.all([
          getDoc(compRef),
          getDoc(leadRef)
        ]);

        if (compSnap.exists()) {
          await updateDoc(compRef, { serviceChangeRequested: false });
        }
        if (leadSnap.exists()) {
          await updateDoc(leadRef, { serviceChangeRequested: false });
        }

        toast({
          title: 'Request Dismissed',
          description: `Service change request marked as cancelled.`,
        });
      }

      setProcessModalOpen(false);
      fetchRequests();
    } catch (e) {
      console.error('[CS Requests Dashboard] Error processing service change:', e);
      toast({
        title: 'Error',
        description: 'Failed to update request.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Process Cancellation (Save or True Cancel)
  const handleProcessCancellation = async () => {
    if (!selectedRequest) return;

    if (processMode === 'cancel') {
      if (!selectedThemeId || !selectedWhyId || !selectedReasonId) {
        toast({
          variant: 'destructive',
          title: 'Theme, Why & Reason Required',
          description: 'You must select a Theme, Why (Category), and Reason to process the cancellation.',
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const userDisplayName = userProfile?.displayName || userProfile?.email || 'Customer Success Rep';
      const effectiveSavedDate = cancelSavedDate || new Date().toISOString().substring(0, 10);
      const processedAt = cancelSavedDate ? new Date(`${cancelSavedDate}T12:00:00`).toISOString() : new Date().toISOString();

      if (processMode === 'save') {
        if (['Change Frequency & Update Price', 'Keep Frequency & Update Price', 'Remove Specific Service Item'].includes(cancelSaveStrategy)) {
          // If strategy involves service/rate changes, route user to Resell quote process
          setSubmitting(false);
          await handleOpenResellDialog();
          return;
        }

        // Mark as Saved (Keep Existing Services & Pricing)
        await updateDoc(doc(firestore, 'cs_requests', selectedRequest.id), {
          status: 'Saved',
          saveStrategy: cancelSaveStrategy,
          savedDate: effectiveSavedDate,
          updatedServices: editServices,
          notes: cancelNotes,
          attachments: proofAttachments,
          processedBy: userDisplayName,
          processedAt
        });

        // Update cancellations collection if exists
        await syncMirroredCancellation(selectedRequest, {
          status: 'Saved',
          saveStrategy: cancelSaveStrategy,
          savedDate: effectiveSavedDate,
          updatedServices: editServices,
          notes: cancelNotes,
          attachments: proofAttachments,
          processedBy: userDisplayName,
          processedAt
        });

        // Update lead/company services & status in both collections if present
        const saveCompRef = doc(firestore, 'companies', selectedRequest.leadId);
        const saveLeadRef = doc(firestore, 'leads', selectedRequest.leadId);
        const [saveCompSnap, saveLeadSnap] = await Promise.all([
          getDoc(saveCompRef),
          getDoc(saveLeadRef)
        ]);

        const saveUpdates = {
          services: editServices,
          cancellationRequested: false,
          customerStatus: 'Won'
        };

        if (saveCompSnap.exists()) {
          await updateDoc(saveCompRef, saveUpdates);
          await logActivity(selectedRequest.leadId, {
            type: 'Update',
            date: processedAt,
            notes: `Customer Saved from Cancellation. Strategy: ${cancelSaveStrategy}. Notes: ${cancelNotes}`,
            author: userDisplayName,
          }, 'companies');
        }

        if (saveLeadSnap.exists()) {
          await updateDoc(saveLeadRef, saveUpdates);
          await logActivity(selectedRequest.leadId, {
            type: 'Update',
            date: processedAt,
            notes: `Customer Saved from Cancellation. Strategy: ${cancelSaveStrategy}. Notes: ${cancelNotes}`,
            author: userDisplayName,
          }, 'leads');
        }

        // Trigger automated Franchisee Email Notification (Saved)
        const sanitizedTo = emailTo.split(',').map(e => e.trim()).filter(Boolean).join(', ');
        const sanitizedCc = emailCc.split(',').map(e => e.trim()).filter(Boolean).join(', ');

        if (sendNotificationEmail && sanitizedTo) {
          fetch('/api/notifications/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'franchisee_cancellation_outcome',
              payload: {
                outcome: 'Saved',
                leadId: selectedRequest.leadId,
                companyName: selectedRequest.companyName,
                saveStrategy: cancelSaveStrategy,
                savedDate: effectiveSavedDate,
                services: editServices,
                saveNotes: cancelNotes,
                processedBy: userDisplayName,
                processedByEmail: userProfile?.email || '',
                customFrom: userProfile?.email ? `${userDisplayName} <${userProfile.email}>` : undefined,
                customTo: sanitizedTo,
                customCc: sanitizedCc,
              }
            })
          })
            .then(res => res.json())
            .then(data => {
              if (data && !data.success) {
                console.warn('[CS Requests] Email notification failed:', data.reason || data.error);
                toast({
                  title: 'Email Delivery Warning',
                  description: `Customer marked as Saved, but notification email failed: ${data.reason || 'Unknown error'}`,
                  variant: 'destructive',
                });
              }
            })
            .catch(emailErr => console.error("[CS Requests] Error sending franchisee save email:", emailErr));
        }

        toast({
          title: 'Customer Saved',
          description: `${selectedRequest.companyName} marked as Saved!${sendNotificationEmail && sanitizedTo ? ` Notification sent to ${sanitizedTo}.` : ''}`,
        });
      } else {
        // Resolve Theme, Why, and Reason details
        const activeThemes = getMergedCancellationHierarchy(cancellationThemes);
        const selectedThemeObj = activeThemes.find(t => String(t.id) === String(selectedThemeId));
        const selectedWhyObj = selectedThemeObj?.whys?.find((w: any) => String(w.id) === String(selectedWhyId));
        const selectedReasonObj = selectedWhyObj?.reasons?.find((r: any) => String(r.id) === String(selectedReasonId));

        const themeName = selectedThemeObj?.name || selectedRequest.cancellationTheme || '';
        const whyName = selectedWhyObj?.name || (selectedRequest as any).cancellationWhy || (selectedRequest as any).cancellationCategory || '';
        const reasonName = selectedReasonObj?.name || selectedRequest.cancellationReason || 'Other';

        // True Service Cancellation
        await updateDoc(doc(firestore, 'cs_requests', selectedRequest.id), {
          status: 'Cancelled',
          trueServiceCancellationDate: trueCancellationDate,
          cancellationTheme: themeName,
          cancellationThemeId: selectedThemeId,
          cancellationWhy: whyName,
          cancellationWhyId: selectedWhyId,
          cancellationReason: reasonName,
          cancellationReasonId: selectedReasonId,
          notes: cancelNotes,
          attachments: proofAttachments,
          processedBy: userDisplayName,
          processedAt
        });

        await syncMirroredCancellation(selectedRequest, {
          status: 'Cancelled',
          trueServiceCancellationDate: trueCancellationDate,
          cancellationTheme: themeName,
          cancellationThemeId: selectedThemeId,
          cancellationWhy: whyName,
          cancellationWhyId: selectedWhyId,
          cancellationReason: reasonName,
          cancellationReasonId: selectedReasonId,
          notes: cancelNotes,
          attachments: proofAttachments,
          processedBy: userDisplayName,
          processedAt
        });

        // Update lead/company doc in both collections if present
        const cancelCompRef = doc(firestore, 'companies', selectedRequest.leadId);
        const cancelLeadRef = doc(firestore, 'leads', selectedRequest.leadId);
        const [cancelCompSnap, cancelLeadSnap] = await Promise.all([
          getDoc(cancelCompRef),
          getDoc(cancelLeadRef)
        ]);

        const cancelUpdates = {
          customerStatus: 'Lost Customer',
          status: 'Lost Customer',
          cancellationRequested: false,
          cancellationdate: trueCancellationDate,
          cancellationTheme: themeName,
          cancellationThemeId: selectedThemeId,
          cancellationCategory: whyName,
          cancellationWhyId: selectedWhyId,
          cancellationReason: reasonName,
          cancellationReasonId: selectedReasonId,
        };

        const activityNotes = `True Service Cancellation processed. Stop Date: ${trueCancellationDate}.\nTheme: ${themeName} | Why: ${whyName} | Reason: ${reasonName}.${proofAttachments.length > 0 ? `\nProof Attachments: ${proofAttachments.length} document(s).` : ''}${cancelNotes ? `\nNotes: ${cancelNotes}` : ''}`;

        if (cancelCompSnap.exists()) {
          await updateDoc(cancelCompRef, cancelUpdates);
          await logActivity(selectedRequest.leadId, {
            type: 'Update',
            date: processedAt,
            notes: activityNotes,
            author: userDisplayName,
          }, 'companies');
        }

        if (cancelLeadSnap.exists()) {
          await updateDoc(cancelLeadRef, cancelUpdates);
          await logActivity(selectedRequest.leadId, {
            type: 'Update',
            date: processedAt,
            notes: activityNotes,
            author: userDisplayName,
          }, 'leads');
        }

        // Deactivate LocalMile access if applicable
        await deactivateLocalMileAccessForLead(selectedRequest.leadId, undefined, cancelCompSnap.exists() ? 'companies' : 'leads');

        // Call NetSuite outcome sync with Customer - Lost outcome (Script 2514)
        try {
          const leadData = (cancelCompSnap.exists() ? cancelCompSnap.data() : cancelLeadSnap.data()) || {};
          const nsRes = await sendFieldSalesOutcomeToNetSuite({
            leadId: selectedRequest.leadId,
            outcome: "Customer - Lost",
            linkedSalesRep: leadData?.salesRepAssigned || leadData?.accountManagerAssigned || 'Unassigned',
            processedBy: userDisplayName,
            cancellationTheme: themeName,
            cancellationWhy: whyName,
            cancellationReason: reasonName,
            cancellationDate: trueCancellationDate,
            cancellationNotes: cancelNotes,
          });

          if (nsRes.success) {
            const syncUpdates = {
              netsuiteLeadStatus: 'Customer - Lost',
              syncedWithNetSuite: true,
              lastSyncedWithNetSuite: new Date().toISOString()
            };
            if (cancelCompSnap.exists()) await updateDoc(cancelCompRef, syncUpdates);
            if (cancelLeadSnap.exists()) await updateDoc(cancelLeadRef, syncUpdates);
          }
        } catch (nsErr) {
          console.error("[CS Requests] NetSuite outcome sync failed during true cancellation:", nsErr);
        }

        // Trigger LPO cancellation cascade (child cancellation & LPO.Plus access disabling)
        try {
          await fetch('/api/companies/cancel-cascade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadId: selectedRequest.leadId,
              companyName: selectedRequest.companyName,
              cancellationReason: reasonName,
              cancelledBy: userDisplayName
            })
          });
        } catch (cascadeErr) {
          console.error("[CS Requests] Error triggering LPO cancellation cascade:", cascadeErr);
        }

        // Trigger automated Franchisee Email Notification (Cancelled)
        const sanitizedTo = emailTo.split(',').map(e => e.trim()).filter(Boolean).join(', ');
        const sanitizedCc = emailCc.split(',').map(e => e.trim()).filter(Boolean).join(', ');

        if (sendNotificationEmail && sanitizedTo) {
          fetch('/api/notifications/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'franchisee_cancellation_outcome',
              payload: {
                outcome: 'Cancelled',
                leadId: selectedRequest.leadId,
                companyName: selectedRequest.companyName,
                cancellationTheme: themeName,
                cancellationWhy: whyName,
                cancellationReason: reasonName,
                cancellationDate: trueCancellationDate,
                trueServiceCancellationDate: trueCancellationDate,
                cancellationNotes: cancelNotes,
                processedBy: userDisplayName,
                processedByEmail: userProfile?.email || '',
                customFrom: userProfile?.email ? `${userDisplayName} <${userProfile.email}>` : undefined,
                customTo: sanitizedTo,
                customCc: sanitizedCc,
              }
            })
          })
            .then(res => res.json())
            .then(data => {
              if (data && !data.success) {
                console.warn('[CS Requests] Email notification failed:', data.reason || data.error);
                toast({
                  title: 'Email Delivery Warning',
                  description: `Cancellation recorded, but notification email failed: ${data.reason || 'Unknown error'}`,
                  variant: 'destructive',
                });
              }
            })
            .catch(emailErr => console.error("[CS Requests] Error sending franchisee cancel email:", emailErr));
        }

        toast({
          title: 'Cancellation Finalized',
          description: `Service cancellation recorded for ${selectedRequest.companyName}.${sendNotificationEmail && sanitizedTo ? ` Notification sent to ${sanitizedTo}.` : ''}`,
        });
      }

      setProcessModalOpen(false);
      fetchRequests();
    } catch (e) {
      console.error('[CS Requests Dashboard] Error processing cancellation:', e);
      toast({
        title: 'Error',
        description: 'Failed to update request.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ListTodo className="w-7 h-7 text-[#095c7b]" />
            Customer Success Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage incoming Service Change and Cancellation requests from clients and portals.
          </p>
        </div>

        <Button
          onClick={fetchRequests}
          variant="outline"
          size="sm"
          className="self-start md:self-auto gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Requests
        </Button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Total Requests</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
              <ListTodo className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-100 bg-sky-50/40 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-sky-700">Change of Service</p>
              <h3 className="text-2xl font-bold text-[#095c7b] mt-1">{stats.serviceChanges}</h3>
            </div>
            <div className="p-3 bg-[#095c7b] text-white rounded-xl">
              <Wrench className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-rose-50/40 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-rose-700">Cancellations</p>
              <h3 className="text-2xl font-bold text-rose-900 mt-1">{stats.cancellations}</h3>
            </div>
            <div className="p-3 bg-rose-600 text-white rounded-xl">
              <UserMinus className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50/40 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-800">Pending Action</p>
              <h3 className="text-2xl font-bold text-amber-900 mt-1">{stats.pending}</h3>
            </div>
            <div className="p-3 bg-amber-500 text-white rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar & Tabs */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* Navigation Sub-Tabs */}
            <Tabs 
              value={activeTab} 
              onValueChange={(val) => setActiveTab(val as any)}
              className="w-full md:w-auto"
            >
              <TabsList className="bg-slate-100 p-1">
                <TabsTrigger value="all" className="text-xs font-semibold">
                  All Requests ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="change_of_service" className="text-xs font-semibold">
                  <Wrench className="w-3.5 h-3.5 mr-1.5" />
                  Service Changes ({stats.serviceChanges})
                </TabsTrigger>
                <TabsTrigger value="cancellation" className="text-xs font-semibold">
                  <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                  Cancellations ({stats.cancellations})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search & Status Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search company, ID, contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] text-xs h-9">
                  <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed / Saved</SelectItem>
                  <SelectItem value="Cancelled">Cancelled / Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardHeader>

        {/* Requests Table */}
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <ListTodo className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-semibold text-slate-700 text-base">No CS Requests Found</h3>
              <p className="text-xs text-slate-500">No matching requests for the selected filter view.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Requested Date</TableHead>
                    <TableHead className="text-xs font-bold">Company Name</TableHead>
                    <TableHead className="text-xs font-bold">Request Type</TableHead>
                    <TableHead className="text-xs font-bold">Details / Reason</TableHead>
                    <TableHead className="text-xs font-bold">Contact Person</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req) => {
                    const isServiceChange = req.requestType === 'change_of_service';
                    const formattedDate = req.requestedDate 
                      ? new Date(req.requestedDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'N/A';

                    return (
                      <TableRow key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Date */}
                        <TableCell className="text-xs font-medium text-slate-600 whitespace-nowrap">
                          {formattedDate}
                        </TableCell>

                        {/* Company Name & IDs */}
                        <TableCell>
                          <div className="flex flex-col">
                            <Link 
                              href={`/leads/${req.leadId}`}
                              className="font-bold text-slate-900 text-xs hover:text-[#095c7b] hover:underline flex items-center gap-1"
                            >
                              {req.companyName}
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </Link>
                            <span className="text-[11px] text-slate-500 font-medium">Prospect+ ID: #{req.prospectPlusId || req.leadId}</span>
                            {req.netsuiteId && (
                              <span className="text-[11px] text-slate-400">NetSuite ID: #{req.netsuiteId}</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Request Type Badge */}
                        <TableCell>
                          {isServiceChange ? (
                            <Badge className="bg-sky-100 text-[#095c7b] border-sky-200 hover:bg-sky-200 text-[11px] font-semibold gap-1">
                              <Wrench className="w-3 h-3" /> Change of Service
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200 text-[11px] font-semibold gap-1">
                              <UserMinus className="w-3 h-3" /> Cancellation
                            </Badge>
                          )}
                        </TableCell>

                        {/* Details / Summary */}
                        <TableCell className="max-w-[220px]">
                          <div className="text-xs text-slate-700 truncate">
                            {isServiceChange ? (
                              req.serviceChangeCategories && req.serviceChangeCategories.length > 0 
                                ? req.serviceChangeCategories.map(c => c.replace('_', ' ')).join(', ')
                                : req.notes || 'Service updates requested'
                            ) : (
                              req.cancellationReason || req.cancellationTheme || 'Cancellation requested'
                            )}
                          </div>
                          {req.effectiveDate && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-slate-400">Eff: {req.effectiveDate}</span>
                              {(req as any).isScheduledFuture && req.status === 'Completed' && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-100 text-amber-800">
                                  Future Scheduled
                                </span>
                              )}
                            </div>
                          )}
                          {req.cancellationDate && !isServiceChange && (
                            <div className="text-[10px] text-rose-500 font-medium">Stop: {req.cancellationDate}</div>
                          )}
                        </TableCell>

                        {/* Contact Person */}
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold text-slate-800">{req.contactName || 'Primary Contact'}</span>
                            <span className="text-slate-400 text-[11px]">{req.contactEmail || req.contactPhone || 'N/A'}</span>
                          </div>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell>
                          <Badge 
                            variant={
                              req.status === 'Pending' ? 'outline' : 
                              req.status === 'Completed' || req.status === 'Saved' ? 'default' : 'secondary'
                            }
                            className={`text-[11px] ${
                              req.status === 'Pending' ? 'border-amber-400 text-amber-800 bg-amber-50' :
                              req.status === 'Completed' || req.status === 'Saved' ? 'bg-emerald-600 text-white' :
                              'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </TableCell>

                        {/* Action Buttons */}
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            
                            {/* Copy Public Link */}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Copy Public Request URL"
                              onClick={() => handleCopyPublicLink(req.leadId, req.companyName)}
                              className="h-8 px-2 text-slate-500 hover:text-[#095c7b] hover:bg-sky-50"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>

                            {/* Call Contact */}
                            {req.contactPhone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Call Contact via AirCall"
                                onClick={() => handleInitiateCall(req.contactPhone!)}
                                className="h-8 px-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Process Request Button */}
                            <Button
                              size="sm"
                              onClick={() => handleOpenProcess(req)}
                              className={`h-8 px-3 text-xs font-bold text-white ${
                                req.status === 'Pending' 
                                  ? 'bg-[#095c7b] hover:bg-[#07475f]' 
                                  : 'bg-slate-700 hover:bg-slate-800'
                              }`}
                            >
                              Process
                            </Button>

                          </div>
                        </TableCell>

                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------- PROCESS REQUEST MODAL ---------------- */}
      {selectedRequest && (
        <Dialog open={processModalOpen} onOpenChange={setProcessModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#095c7b] flex items-center gap-2">
                {selectedRequest.requestType === 'change_of_service' ? (
                  <>
                    <Wrench className="w-5 h-5 text-sky-500" />
                    Process Service Change: {selectedRequest.companyName}
                  </>
                ) : (
                  <>
                    <UserMinus className="w-5 h-5 text-rose-500" />
                    Process Cancellation: {selectedRequest.companyName}
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Review request details, update active services, and mark status.
              </DialogDescription>
            </DialogHeader>

            {/* Modal Body */}
            <div className="space-y-6 py-2">

              {/* Request Overview Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold text-slate-500">Prospect+ ID:</span>{' '}
                    <span className="font-bold text-slate-800">#{selectedRequest.prospectPlusId || selectedRequest.leadId}</span>
                  </div>
                  {selectedRequest.netsuiteId && (
                    <div>
                      <span className="font-semibold text-slate-500">NetSuite ID:</span>{' '}
                      <span className="font-bold text-slate-800">#{selectedRequest.netsuiteId}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-slate-500">Person Requesting (External):</span>{' '}
                    <span className="font-bold text-slate-800">{selectedRequest.requestedBy || selectedRequest.contactName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Captured By (Internal Staff):</span>{' '}
                    <span className="font-bold text-slate-800">{selectedRequest.capturedBy || selectedRequest.processedBy || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Email:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedRequest.contactEmail || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Phone:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedRequest.contactPhone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Requested Date:</span>{' '}
                    <span className="font-bold text-slate-800">
                      {selectedRequest.requestedDate ? new Date(selectedRequest.requestedDate).toLocaleDateString('en-AU') : 'N/A'}
                    </span>
                  </div>
                </div>

                {selectedRequest.notes && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-500 block mb-0.5">Customer Notes:</span>
                    <p className="bg-white p-2.5 rounded border border-slate-200 text-slate-700 italic">
                      "{selectedRequest.notes}"
                    </p>
                  </div>
                )}

                {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-500 block mb-1">Uploaded Attachments ({selectedRequest.attachments.length}):</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[#095c7b] hover:bg-sky-50 font-semibold text-xs transition-colors"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[180px]">{att.name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ---------------- CHANGE OF SERVICE MODAL BODY ---------------- */}
              {selectedRequest.requestType === 'change_of_service' && (
                <div className="space-y-4">
                  
                  {/* Live MRR Impact & Variance Card */}
                  <div className="p-3.5 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/70 via-white to-emerald-50/50 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-[#095c7b]" />
                        <span className="text-xs font-bold text-slate-800">Monthly Recurring Revenue (MRR) Impact</span>
                      </div>
                      <Badge 
                        variant="outline"
                        className={`text-[11px] font-bold px-2 py-0.5 border ${
                          mrrDelta > 0 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                            : mrrDelta < 0 
                              ? 'bg-rose-50 text-rose-700 border-rose-300' 
                              : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        {mrrDelta > 0 ? (
                          <span className="flex items-center gap-0.5"><ArrowUpRight className="w-3.5 h-3.5" /> +${mrrDelta.toFixed(2)}/mo Expansion</span>
                        ) : mrrDelta < 0 ? (
                          <span className="flex items-center gap-0.5"><ArrowDownRight className="w-3.5 h-3.5" /> -${Math.abs(mrrDelta).toFixed(2)}/mo Contraction</span>
                        ) : (
                          <span className="flex items-center gap-0.5"><Equal className="w-3.5 h-3.5" /> No MRR Change</span>
                        )}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center">
                      <div className="p-2 rounded-lg bg-white/80 border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-medium">Previous / Baseline</span>
                        <span className="text-sm font-bold text-slate-700">${baselineMRR.toFixed(2)}<span className="text-[10px] font-normal text-slate-400">/mo</span></span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/80 border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-medium">Updated Rate & Schedule</span>
                        <span className="text-sm font-bold text-[#095c7b]">${newMRR.toFixed(2)}<span className="text-[10px] font-normal text-slate-400">/mo</span></span>
                      </div>
                      <div className={`p-2 rounded-lg border ${
                        mrrDelta > 0 
                          ? 'bg-emerald-50/50 border-emerald-200' 
                          : mrrDelta < 0 
                            ? 'bg-rose-50/50 border-rose-200' 
                            : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="text-[10px] text-slate-500 block font-medium">Net Variance</span>
                        <span className={`text-sm font-bold ${
                          mrrDelta > 0 ? 'text-emerald-700' : mrrDelta < 0 ? 'text-rose-700' : 'text-slate-700'
                        }`}>
                          {mrrDelta >= 0 ? `+$${mrrDelta.toFixed(2)}` : `-$${Math.abs(mrrDelta).toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    {/* Change Indicator Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">Detected Changes:</span>
                      {changeAnalysis.rateChanged && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Rate Adjustment
                        </span>
                      )}
                      {changeAnalysis.freqChanged && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800">
                          Schedule / Days Changed
                        </span>
                      )}
                      {changeAnalysis.added && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          New Service Added
                        </span>
                      )}
                      {changeAnalysis.deleted && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                          Service Removed
                        </span>
                      )}
                      {!changeAnalysis.rateChanged && !changeAnalysis.freqChanged && !changeAnalysis.added && !changeAnalysis.deleted && (
                        <span className="text-[10px] text-slate-400 italic">No modifications detected yet</span>
                      )}
                    </div>
                  </div>

                  {/* Direct Update (No SF Sent) Notice */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 flex items-start gap-2 text-xs">
                    <Info className="w-4 h-4 text-[#095c7b] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">Direct CRM Update (No SF Required): </span>
                      Applying changes here directly recalculates and commits the updated MRR and active service schedules to the company and lead profile without waiting for a re-signed Service Confirmation Form.
                    </div>
                  </div>

                  {/* Header & Services List */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-bold text-slate-900 block">
                        Update Company Active Services ({editServices.length})
                      </Label>
                      <span className="text-[11px] text-slate-500">
                        Select specific days of the week for each service or toggle Adhoc
                      </span>
                    </div>

                    {/* Add Service Trigger */}
                    {!isAddingCustomService && (
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={selectedServiceToAdd}
                          onValueChange={(val) => {
                            if (val === '__custom__') {
                              setIsAddingCustomService(true);
                            } else {
                              handleAddService(val);
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs bg-white border-dashed border-[#095c7b] text-[#095c7b] hover:bg-sky-50 px-2.5 font-semibold">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            <span>Add Service</span>
                          </SelectTrigger>
                          <SelectContent>
                            {COMMON_SERVICES.filter(cs => !editServices.some(es => es.name.toLowerCase() === cs.toLowerCase())).map((name) => (
                              <SelectItem key={name} value={name} className="text-xs">
                                + {name}
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom__" className="text-xs text-sky-600 font-semibold border-t">
                              + Custom Service Name...
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Custom Service Name Input Box */}
                  {isAddingCustomService && (
                    <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/60 flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Enter service name (e.g. Daily Document Collection)"
                        value={customServiceName}
                        onChange={(e) => setCustomServiceName(e.target.value)}
                        className="h-8 text-xs bg-white flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddService(customServiceName);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddService(customServiceName)}
                        disabled={!customServiceName.trim()}
                        className="h-8 text-xs bg-[#095c7b] hover:bg-[#07475f] text-white px-3 font-semibold"
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAddingCustomService(false);
                          setCustomServiceName('');
                        }}
                        className="h-8 text-xs text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Service Cards */}
                  <div className="space-y-3">
                    {editServices.length === 0 ? (
                      <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                        No active services remaining. Click &quot;Add Service&quot; above to add one.
                      </div>
                    ) : (
                      editServices.map((srv, idx) => {
                        const currentDays = parseFrequencyDays(srv.frequency);
                        const isAdhoc = srv.frequency === 'Adhoc';
                        const serviceMonthlyCost = calculateServiceMonthlyCost(srv.rate || 0, srv.frequency);

                        return (
                          <div key={srv.id || idx} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3 hover:border-slate-300 transition-all shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                  {srv.name}
                                </span>
                                <span className="text-[11px] font-semibold text-[#095c7b]">
                                  Est. ${serviceMonthlyCost.toFixed(2)}/mo
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditServices(editServices.filter((_, i) => i !== idx))}
                                className="text-rose-600 hover:bg-rose-50 h-7 px-2 text-[11px]"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                Remove
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                              {/* Custom Days of Week Selector */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <Label className="text-[11px] font-semibold text-slate-600">
                                    Schedule / Active Days
                                  </Label>
                                  <span className="text-[10px] font-medium text-slate-500">
                                    {isAdhoc ? 'Adhoc / On Demand' : `${currentDays.length} day${currentDays.length === 1 ? '' : 's'}/wk`}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                  {DAYS_OF_WEEK.map((day) => {
                                    const isSelected = !isAdhoc && currentDays.includes(day);
                                    return (
                                      <button
                                        key={day}
                                        type="button"
                                        onClick={() => handleToggleServiceDay(idx, day)}
                                        className={`h-7 px-2.5 text-xs font-bold rounded-md transition-all ${
                                          isSelected
                                            ? 'bg-[#095c7b] text-white shadow-sm ring-1 ring-[#095c7b]'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                                        }`}
                                        title={`Toggle ${day}day`}
                                      >
                                        {day}
                                      </button>
                                    );
                                  })}

                                  {/* Quick Select All Mon-Fri */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetAllDays(idx)}
                                    className={`h-7 px-2 text-[10px] font-semibold rounded-md border transition-all ${
                                      !isAdhoc && currentDays.length === 5
                                        ? 'bg-sky-100 text-[#095c7b] border-sky-300 font-bold'
                                        : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'
                                    }`}
                                    title="Set all 5 days (Mon-Fri)"
                                  >
                                    All (M-F)
                                  </button>

                                  {/* Adhoc Mode Toggle */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetAdhoc(idx)}
                                    className={`h-7 px-2 text-[10px] font-semibold rounded-md border transition-all ${
                                      isAdhoc
                                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-bold'
                                        : 'bg-white text-slate-500 hover:bg-purple-50 hover:text-purple-700 border-slate-200'
                                    }`}
                                    title="Set as Adhoc / On Demand"
                                  >
                                    Adhoc
                                  </button>
                                </div>
                              </div>

                              {/* Rate Input */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <Label className="text-[11px] font-semibold text-slate-600">
                                    Rate ($ per service / visit)
                                  </Label>
                                  <span className="text-[10px] text-slate-400">
                                    {isAdhoc ? '$Rate × 1' : '$Rate × Days × 4.33'}
                                  </span>
                                </div>

                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={srv.rate ?? 0}
                                    onChange={(e) => {
                                      const updated = [...editServices];
                                      updated[idx].rate = parseFloat(e.target.value) || 0;
                                      setEditServices(updated);
                                    }}
                                    className="h-8 pl-6 text-xs font-semibold bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Effective Date & Update Timing Card */}
                  <div className="p-3.5 rounded-xl border bg-slate-50/80 border-slate-200 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                          <Calendar className="w-3.5 h-3.5 text-[#095c7b]" />
                          Effective Date * (Rate Start Date)
                        </Label>
                        <Input
                          type="date"
                          value={serviceEffectiveDate}
                          onChange={(e) => setServiceEffectiveDate(e.target.value)}
                          className="h-9 text-xs bg-white border-slate-300 font-medium"
                        />
                      </div>
                      <div className="text-xs flex flex-col justify-center">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Execution Schedule</span>
                        {serviceEffectiveDate > new Date().toISOString().substring(0, 10) ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100/90 text-amber-900 border border-amber-300 font-semibold text-[11.5px]">
                            <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>Future Scheduled ({serviceEffectiveDate})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100/90 text-emerald-900 border border-emerald-300 font-semibold text-[11.5px]">
                            <Zap className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>{serviceEffectiveDate < new Date().toISOString().substring(0, 10) ? 'Back-Dated (Immediate Update)' : 'Effective Today (Immediate Update)'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Explanatory timing alert */}
                    {serviceEffectiveDate > new Date().toISOString().substring(0, 10) ? (
                      <div className="text-[11px] text-amber-800 bg-amber-50/90 p-2.5 rounded-lg border border-amber-200/80 leading-relaxed flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Scheduled for Future:</strong> The company's current active services and MRR will remain in place today. These new rates will be staged under scheduled service changes and promoted automatically on <strong>{serviceEffectiveDate}</strong> by the nightly transition engine.
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50/90 p-2.5 rounded-lg border border-emerald-200/80 leading-relaxed flex items-start gap-2">
                        <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Immediate Live Update:</strong> Because this effective date is {serviceEffectiveDate < new Date().toISOString().substring(0, 10) ? 'back-dated' : 'today'}, the new service rates, frequencies, and MRR (${newMRR.toFixed(2)}/mo) will take effect immediately in active CRM records and operational run sheets.
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 mb-1 block">Resolution Notes</Label>
                    <Textarea
                      placeholder="Add resolution details or actions taken..."
                      value={serviceChangeNotes}
                      onChange={(e) => setServiceChangeNotes(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                </div>
              )}

              {/* ---------------- CANCELLATION MODAL BODY ---------------- */}
              {selectedRequest.requestType === 'cancellation' && (
                <div className="space-y-4">
                  
                  {/* Action Mode Toggle */}
                  <div className="flex rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setProcessMode('save')}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                        processMode === 'save'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Save Customer (Retention)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProcessMode('cancel')}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                        processMode === 'cancel'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Finalize Cancellation
                    </button>
                  </div>

                      {processMode === 'save' ? (
                        <div className="space-y-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs font-semibold text-slate-700 mb-1 block">Retention Strategy</Label>
                              <Select 
                                value={cancelSaveStrategy} 
                                onValueChange={(val: any) => setCancelSaveStrategy(val)}
                              >
                                <SelectTrigger className="h-9 text-xs bg-white">
                                  <SelectValue />
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
                            <div>
                              <Label className="text-xs font-semibold text-slate-700 mb-1 block">Saved / Effective Date</Label>
                              <Input
                                type="date"
                                value={cancelSavedDate}
                                onChange={(e) => setCancelSavedDate(e.target.value)}
                                className="h-9 text-xs bg-white"
                              />
                            </div>
                          </div>

                          {['Change Frequency & Update Price', 'Keep Frequency & Update Price', 'Remove Specific Service Item'].includes(cancelSaveStrategy) && (selectedRequest as any)?.bucket !== 'lpo_network' && (
                            <div className="p-3.5 rounded-xl bg-emerald-100/80 border border-emerald-300 space-y-2.5 shadow-2xs">
                              <div className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                                <div>
                                  <h5 className="text-xs font-bold text-emerald-900">Resell Quote Process Required</h5>
                                  <p className="text-[11.5px] text-emerald-800 leading-snug mt-0.5">
                                    Modifying services or rates requires launching the official Resell workflow to issue an updated quote & commencement agreement for customer sign-off.
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                onClick={handleOpenResellDialog}
                                disabled={loadingResellLead}
                                className="w-full h-8 text-xs bg-[#095c7b] hover:bg-[#07475f] text-white font-bold flex items-center justify-center gap-1.5 rounded-lg shadow-2xs"
                              >
                                {loadingResellLead ? <Loader className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                                Modify Services & Send Resell Quote
                              </Button>
                            </div>
                          )}

                      <div>
                        <Label className="text-xs font-semibold text-slate-700 mb-1 block">Retention Notes</Label>
                        <Textarea
                          placeholder="Log agreement details with client..."
                          value={cancelNotes}
                          onChange={(e) => setCancelNotes(e.target.value)}
                          rows={2}
                          className="text-xs bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4 rounded-xl bg-rose-50/50 border border-rose-200">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 mb-1 block">True Stop Date *</Label>
                        <Input
                          type="date"
                          value={trueCancellationDate}
                          onChange={(e) => setTrueCancellationDate(e.target.value)}
                          className="h-9 text-xs bg-white"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Label className="text-xs font-bold text-slate-800">
                            Cancellation Theme, Why & Reason <span className="text-rose-600 font-bold">* Mandatory</span>
                          </Label>
                        </div>
                        <LossReasonPicker
                          cancellationThemes={cancellationThemes}
                          selectedThemeId={selectedThemeId}
                          selectedWhyId={selectedWhyId}
                          selectedReasonId={selectedReasonId}
                          onSelect={(tId, wId, rId) => {
                            setSelectedThemeId(tId);
                            setSelectedWhyId(wId);
                            setSelectedReasonId(rId);
                          }}
                          disabled={submitting}
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700 mb-1 block">Cancellation Notes</Label>
                        <Textarea
                          placeholder="Final exit notes..."
                          value={cancelNotes}
                          onChange={(e) => setCancelNotes(e.target.value)}
                          rows={2}
                          className="text-xs bg-white"
                        />
                      </div>

                      {/* Proof Document Attachments Section */}
                      <div className="pt-3 border-t border-rose-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-[#095c7b]" />
                            Attach Proof Documents / Evidence
                          </Label>
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#095c7b] text-white hover:bg-[#07475f] text-xs font-semibold transition-colors">
                            {uploadingProofFile ? (
                              <Loader className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            Attach Document
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={handleProofFileUpload}
                              disabled={uploadingProofFile || submitting}
                            />
                          </label>
                        </div>

                        {proofAttachments.length > 0 ? (
                          <div className="space-y-1.5 mt-2">
                            {proofAttachments.map((att, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs">
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-[#095c7b] font-medium hover:underline truncate max-w-[80%]"
                                >
                                  <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{att.name}</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                                </a>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveProofAttachment(idx)}
                                  className="h-6 px-1.5 text-rose-600 hover:bg-rose-50 text-[11px]"
                                  disabled={submitting}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No proof documents attached yet.</p>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ---------------- EMAIL NOTIFICATION RECIPIENTS SECTION ---------------- */}
              <div className="p-4 rounded-xl border border-sky-200/80 bg-gradient-to-b from-sky-50/70 to-slate-50 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#095c7b]" />
                    <span className="text-xs font-bold text-slate-800">Email Notification Recipients</span>
                    {loadingRecipients && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 font-normal">
                        <Loader className="w-3 h-3 animate-spin" /> Resolving franchisee...
                      </span>
                    )}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={sendNotificationEmail}
                      onChange={(e) => setSendNotificationEmail(e.target.checked)}
                      className="rounded border-slate-300 text-[#095c7b] focus:ring-[#095c7b] h-3.5 w-3.5"
                    />
                    Send Email on Process
                  </label>
                </div>

                {sendNotificationEmail && (
                  <div className="space-y-3 pt-2.5 border-t border-sky-100">
                    {/* TO Recipients */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-slate-700">
                          TO Address <span className="text-slate-400 font-normal">(Primary Recipient / Franchisee)</span>
                        </Label>
                      </div>
                      <Input
                        type="text"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        placeholder="e.g. franchisee@mailplus.com.au, customer@example.com"
                        className="h-8 text-xs bg-white border-slate-200"
                      />
                      {/* Quick Add suggestions for TO */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {recipientSuggestions.franchiseeEmail && (
                          <button
                            type="button"
                            onClick={() => handleAddEmail('to', recipientSuggestions.franchiseeEmail)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors shadow-2xs"
                            title="Add franchisee email"
                          >
                            + Franchisee: {recipientSuggestions.franchiseeEmail}
                          </button>
                        )}
                        {recipientSuggestions.contactEmail && (
                          <button
                            type="button"
                            onClick={() => handleAddEmail('to', recipientSuggestions.contactEmail)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors shadow-2xs"
                            title="Add customer contact email"
                          >
                            + Contact: {recipientSuggestions.contactEmail}
                          </button>
                        )}
                        {userProfile?.email && (
                          <button
                            type="button"
                            onClick={() => handleAddEmail('to', userProfile.email!)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors shadow-2xs"
                            title="Add my email"
                          >
                            + Myself: {userProfile.email}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* CC Recipients */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-slate-700">
                          CC Address <span className="text-slate-400 font-normal">(Internal & Tracking)</span>
                        </Label>
                      </div>
                      <Input
                        type="text"
                        value={emailCc}
                        onChange={(e) => setEmailCc(e.target.value)}
                        placeholder="e.g. mailplusit@mailplus.com.au, sarah.hart@mailplus.com.au"
                        className="h-8 text-xs bg-white border-slate-200"
                      />
                      {/* Quick Add suggestions for CC */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleAddEmail('cc', 'mailplusit@mailplus.com.au')}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
                        >
                          + mailplusit@mailplus.com.au
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddEmail('cc', 'sarah.hart@mailplus.com.au')}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
                        >
                          + sarah.hart@mailplus.com.au
                        </button>
                        {userProfile?.email && (
                          <button
                            type="button"
                            onClick={() => handleAddEmail('cc', userProfile.email!)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
                          >
                            + Myself: {userProfile.email}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[10.5px] text-slate-500 italic">Separate multiple email addresses with commas. Notification contains the full service and outcome breakdown.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProcessModalOpen(false)}
                disabled={submitting}
              >
                Close
              </Button>

              {selectedRequest.requestType === 'change_of_service' ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleProcessServiceChange('Cancelled')}
                    disabled={submitting}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    Dismiss Request
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleProcessServiceChange('Completed')}
                    disabled={submitting}
                    className="bg-[#095c7b] hover:bg-[#07475f] text-white font-bold"
                  >
                    {submitting ? <Loader /> : 'Apply Service Changes'}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={handleProcessCancellation}
                  disabled={submitting}
                  className={`font-bold text-white ${
                    processMode === 'save' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? (
                    <Loader />
                  ) : processMode === 'save' ? (
                    ['Keep Existing Services & Pricing', 'One-Off Credit or Goodwill Gesture', 'MailPlus Absorbing a Cost'].includes(cancelSaveStrategy) ? 'Save Customer' : 'Save & Launch Resell Quote'
                  ) : (
                    'Confirm Cancellation'
                  )}
                </Button>
              )}
            </DialogFooter>

          </DialogContent>
        </Dialog>
      )}

      {/* Service Selection / Resell Dialog for Customer Retention */}
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
