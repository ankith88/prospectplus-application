"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot, addDoc, getDocs, serverTimestamp, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useGoogleMapsScript } from '@/hooks/use-google-maps';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { FullScreenLoader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building, 
  ArrowUpRight, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  Search, 
  RefreshCw, 
  Filter, 
  Users, 
  Check, 
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  LogIn,
  Send,
  Clock,
  FileCheck,
  Ban,
  CheckSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

interface LpoLead {
  id: string;
  prospectPlusId: string;
  lpoName: string;
  lpoOwnerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  postcode: string;
  status: string;
  notUsingLpoPlus?: boolean;
  lpoCreatedDate?: any;
  createdAt?: any;
  lastPortalSyncAt?: any;

  // Linkage fields
  createdParentLeadId?: string | null;
  createdChildLeadIds?: string[] | null;
  linkedLeadId?: string | null;
  linkedLeadCompanyName?: string | null;
  linkedCustomerId?: string | null;
  rawCustomerName?: string | null;
  linkStatus?: string | null;
  linkedPartnerLocationId?: string | null;
  linkedPartnerLocationName?: string | null;
  linkedNcl?: string | null;
  linkedFranchiseeName?: string | null;
  companyNameFranchise?: string | null;
  franchisee?: string | null;
  franchiseeName?: string | null;
  assignedFranchisee?: string | null;
  assignedFranchiseeName?: string | null;
  linkedFranchisees?: any[] | null;
  franchisees?: any[] | null;
}

interface PipelineProgress {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  statusLabel: string;
  badgeClass: string;
  isLost: boolean;
  milestones: Array<{ name: string; completed: boolean }>;
}

const getPipelineProgress = (statusStr: string): PipelineProgress => {
  const status = statusStr || 'New';
  const isLost = status === 'Lost' || status.toLowerCase().includes('lost');
  const isNotUsing = status === 'Not Using LPO.Plus' || status.toLowerCase().includes('not using');

  const milestonesList = [
    'New',
    'Linked to Partner Location',
    'Induction',
    'Operations Setup',
    'Franchisees Assigned',
    'SCF Sent',
    'SCF Accepted',
    'Signed',
    'LPO.Plus Access Sent',
    'LPO.Plus Logged In',
    'Lead Created',
  ];

  let currentStep = 1;

  if (isLost || isNotUsing) {
    currentStep = 0;
  } else if (['Lead Created'].includes(status)) {
    currentStep = 11;
  } else if (['LPO.Plus Logged In', 'LPO.PLUS Sign In Email Sent', 'LPO.Plus Sign In Email Sent'].includes(status)) {
    currentStep = 10;
  } else if (['LPO.Plus Access Sent'].includes(status)) {
    currentStep = 9;
  } else if (['Signed'].includes(status)) {
    currentStep = 8;
  } else if (['SCF Accepted'].includes(status)) {
    currentStep = 7;
  } else if (['SCF Sent'].includes(status)) {
    currentStep = 6;
  } else if (['Franchisees Assigned'].includes(status)) {
    currentStep = 5;
  } else if (['Operations Setup'].includes(status)) {
    currentStep = 4;
  } else if (['Induction'].includes(status)) {
    currentStep = 3;
  } else if (['Linked to Partner Location'].includes(status)) {
    currentStep = 2;
  } else {
    currentStep = 1;
  }

  const milestones = milestonesList.map((m, idx) => ({
    name: m,
    completed: !isLost && !isNotUsing && currentStep >= idx + 1,
  }));

  const totalSteps = 11;
  const percentage = isLost || isNotUsing ? 0 : Math.round((currentStep / totalSteps) * 100);

  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
  if (isLost) {
    badgeClass = 'bg-rose-100 text-rose-800 border-rose-200 font-bold';
  } else if (isNotUsing) {
    badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
  } else if (status === 'Signed') {
    badgeClass = 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
  } else if (status === 'LPO.Plus Logged In') {
    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
  } else if (status === 'LPO.Plus Access Sent') {
    badgeClass = 'bg-sky-100 text-sky-800 border-sky-300 font-bold';
  } else if (status === 'SCF Accepted') {
    badgeClass = 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold';
  } else if (status === 'SCF Sent') {
    badgeClass = 'bg-blue-100 text-blue-900 border-blue-300 font-semibold';
  } else if (status === 'Franchisees Assigned' || status === 'Operations Setup' || status === 'Induction') {
    badgeClass = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
  } else if (status === 'Linked to Partner Location') {
    badgeClass = 'bg-teal-100 text-teal-800 border-teal-200 font-semibold';
  }

  return {
    currentStep,
    totalSteps,
    percentage,
    statusLabel: status,
    badgeClass,
    isLost,
    milestones,
  };
};

export default function LpoLeadsListPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const isFranchisee = userProfile?.activeRole === 'Franchisee' || userProfile?.activeRole?.toLowerCase() === 'franchisee' || userProfile?.role?.toLowerCase() === 'franchisee';
  const { canView, loadingPermissions } = usePermissions();
  const { toast } = useToast();
  const [leads, setLeads] = useState<LpoLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [isSyncingPortal, setIsSyncingPortal] = useState(false);

  // Tab State: 'wip' | 'scf_sent' | 'scf_accepted' | 'signed' | 'access_sent' | 'logged_in' | 'not_using_lpo_plus' | 'active' | 'lost'
  const [activeTab, setActiveTab] = useState<'wip' | 'scf_sent' | 'scf_accepted' | 'signed' | 'access_sent' | 'logged_in' | 'not_using_lpo_plus' | 'active' | 'lost'>('wip');

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [franchiseeFilter, setFranchiseeFilter] = useState<string>('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [partnerLocations, setPartnerLocations] = useState<any[]>([]);
  const [selectedPartnerLocationId, setSelectedPartnerLocationId] = useState<string>('');
  const [crmLeadsMap, setCrmLeadsMap] = useState<Map<string, any>>(new Map());

  const parseDateValue = (raw: any): { timestamp: number; formatted: string } => {
    if (!raw) return { timestamp: 0, formatted: '—' };

    if (typeof raw.toDate === 'function') {
      const date = raw.toDate();
      return {
        timestamp: date.getTime(),
        formatted: date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
    }

    if (typeof raw.seconds === 'number') {
      const date = new Date(raw.seconds * 1000);
      return {
        timestamp: date.getTime(),
        formatted: date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
    }

    if (raw instanceof Date) {
      return {
        timestamp: raw.getTime(),
        formatted: raw.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
    }

    if (typeof raw === 'string' || typeof raw === 'number') {
      const str = String(raw).trim();
      if (!str) return { timestamp: 0, formatted: '—' };

      const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1;
        const year = parseInt(dmyMatch[3], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return {
            timestamp: date.getTime(),
            formatted: date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
          };
        }
      }

      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return {
          timestamp: parsed.getTime(),
          formatted: parsed.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
        };
      }

      return { timestamp: 0, formatted: str };
    }

    return { timestamp: 0, formatted: '—' };
  };

  const getLeadDateInfo = (lead: LpoLead) => {
    if (lead.lpoCreatedDate) {
      const parsed = parseDateValue(lead.lpoCreatedDate);
      if (parsed.formatted !== '—' || parsed.timestamp > 0) {
        return parsed;
      }
    }
    return parseDateValue(lead.createdAt);
  };

  // Helper function to check if lead/company is Signed
  const isLeadOrLinkedSigned = (l: LpoLead): boolean => {
    if (l.status === 'Signed') return true;
    const targetLeadId = l.createdParentLeadId || l.linkedLeadId;
    if (targetLeadId && crmLeadsMap.has(targetLeadId)) {
      const crmData = crmLeadsMap.get(targetLeadId);
      const st = (crmData?.status || crmData?.customerStatus || '').toLowerCase();
      if (st === 'signed' || st === 'won' || st === 'customer' || st === 'signed customer') {
        return true;
      }
    }
    return false;
  };

  // Raw lead buckets by tab
  const wipLeadsRaw = leads.filter(
    (l) =>
      l.status !== 'Lost' &&
      !l.status?.toLowerCase().includes('lost') &&
      !l.notUsingLpoPlus &&
      l.status !== 'SCF Sent' &&
      l.status !== 'SCF Accepted' &&
      !isLeadOrLinkedSigned(l) &&
      l.status !== 'LPO.Plus Access Sent' &&
      l.status !== 'LPO.Plus Logged In' &&
      l.status !== 'LPO.PLUS Sign In Email Sent' &&
      l.status !== 'LPO.Plus Sign In Email Sent'
  );
  const scfSentLeadsRaw = leads.filter(
    (l) => l.status === 'SCF Sent' && !l.notUsingLpoPlus
  );
  const scfAcceptedLeadsRaw = leads.filter(
    (l) => l.status === 'SCF Accepted' && !isLeadOrLinkedSigned(l) && !l.notUsingLpoPlus
  );
  const signedLeadsRaw = leads.filter(
    (l) => isLeadOrLinkedSigned(l) && !l.notUsingLpoPlus
  );
  const accessSentLeadsRaw = leads.filter(
    (l) => l.status === 'LPO.Plus Access Sent' && !l.notUsingLpoPlus
  );
  const loggedInLeadsRaw = leads.filter(
    (l) => (l.status === 'LPO.Plus Logged In' || l.status === 'LPO.PLUS Sign In Email Sent' || l.status === 'LPO.Plus Sign In Email Sent') && !l.notUsingLpoPlus
  );
  const notUsingLpoPlusLeadsRaw = leads.filter(
    (l) => l.status === 'Not Using LPO.Plus' || l.notUsingLpoPlus === true
  );
  const activeLeadsRaw = leads.filter(
    (l) => l.status !== 'Lost' && !l.status?.toLowerCase().includes('lost') && !l.notUsingLpoPlus
  );
  const lostLeadsRaw = leads.filter(
    (l) => l.status === 'Lost' || l.status?.toLowerCase().includes('lost')
  );

  const partnerLocationsMap = React.useMemo(() => {
    const map = new Map<string, any>();
    partnerLocations.forEach((loc) => {
      if (loc.id) map.set(loc.id, loc);
      if (loc.name) map.set(String(loc.name).toLowerCase().trim(), loc);
    });
    return map;
  }, [partnerLocations]);

  const getLeadFranchiseeName = (lead: LpoLead): string => {
    if (!lead) return '';

    // 1. Direct string fields on lead
    if (lead.linkedFranchiseeName && typeof lead.linkedFranchiseeName === 'string' && lead.linkedFranchiseeName.trim()) {
      return lead.linkedFranchiseeName.trim();
    }
    if (lead.companyNameFranchise && typeof lead.companyNameFranchise === 'string' && lead.companyNameFranchise.trim()) {
      return lead.companyNameFranchise.trim();
    }
    if (lead.franchiseeName && typeof lead.franchiseeName === 'string' && lead.franchiseeName.trim()) {
      return lead.franchiseeName.trim();
    }
    if (lead.franchisee && typeof lead.franchisee === 'string' && lead.franchisee.trim()) {
      return lead.franchisee.trim();
    }
    if (lead.assignedFranchisee && typeof lead.assignedFranchisee === 'string' && lead.assignedFranchisee.trim()) {
      return lead.assignedFranchisee.trim();
    }
    if (lead.assignedFranchiseeName && typeof lead.assignedFranchiseeName === 'string' && lead.assignedFranchiseeName.trim()) {
      return lead.assignedFranchiseeName.trim();
    }

    // 2. Linked franchisees array
    const zeesArray = lead.linkedFranchisees || lead.franchisees;
    if (Array.isArray(zeesArray) && zeesArray.length > 0) {
      const names = zeesArray
        .map((f: any) => {
          if (!f) return '';
          if (typeof f === 'string') return f.trim();
          if (typeof f === 'object') {
            return (f.name || f.franchiseeName || f.companyName || f.label || f.title || f.franchiseeId || '').trim();
          }
          return '';
        })
        .filter(Boolean);

      if (names.length > 0) {
        return Array.from(new Set(names)).join(', ');
      }
    }

    // 3. Check linked partner location
    const partnerId = lead.linkedPartnerLocationId;
    const partnerName = lead.linkedPartnerLocationName;

    let partner = partnerId ? partnerLocationsMap.get(partnerId) : undefined;
    if (!partner && partnerName) {
      partner = partnerLocationsMap.get(partnerName.toLowerCase().trim());
    }

    if (partner) {
      const partnerFran =
        partner.franchisee ||
        partner.franchiseeName ||
        partner.assignedFranchisee ||
        partner.companyNameFranchise ||
        partner.linkedFranchiseeName;
      if (typeof partnerFran === 'string' && partnerFran.trim()) {
        return partnerFran.trim();
      }
      if (Array.isArray(partnerFran) && partnerFran.length > 0) {
        const pNames = partnerFran.map((f: any) => (typeof f === 'string' ? f : f.name || '')).filter(Boolean);
        if (pNames.length > 0) return pNames.join(', ');
      }
    }

    // 4. Check linked CRM lead / customer
    const targetLeadId = lead.createdParentLeadId || lead.linkedLeadId || lead.linkedCustomerId;
    if (targetLeadId && crmLeadsMap.has(targetLeadId)) {
      const crmLead = crmLeadsMap.get(targetLeadId);
      if (crmLead) {
        const crmFran = crmLead.franchisee || crmLead.franchiseeName || crmLead.assignedFranchisee || crmLead.companyNameFranchise;
        if (typeof crmFran === 'string' && crmFran.trim()) {
          return crmFran.trim();
        }
      }
    }

    return '';
  };

  // Collect unique franchisee names for filter
  const uniqueFranchisees = Array.from(
    new Set(
      leads
        .map((l) => getLeadFranchiseeName(l))
        .filter(Boolean)
    )
  ).sort();

  const handleSyncPortalStatus = async () => {
    setIsSyncingPortal(true);
    try {
      const res = await fetch('/api/lpo-leads/sync-portal-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'LPO.Plus Status Synced',
          description: `Checked ${data.totalChecked} leads. Updated ${data.updatedCount} status changes (${data.loggedInCount} Logged In, ${data.accessSentCount} Access Sent).`,
        });
      } else {
        throw new Error(data.error || 'Failed to sync portal status');
      }
    } catch (err: any) {
      console.error('Error syncing LPO.Plus portal status:', err);
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: err.message || 'Failed to sync with LPO.Plus database.',
      });
    } finally {
      setIsSyncingPortal(false);
    }
  };

  const filterLeadsList = (leadList: LpoLead[]) => {
    return leadList
      .filter((lead) => {
        // 1. Status Filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'LPO.Plus Logged In') {
            const isLpoLoggedIn = lead.status === 'LPO.Plus Logged In' || lead.status === 'LPO.PLUS Sign In Email Sent' || lead.status === 'LPO.Plus Sign In Email Sent';
            if (!isLpoLoggedIn) return false;
          } else if (statusFilter === 'Lost') {
            const isLost = lead.status === 'Lost' || lead.status?.toLowerCase().includes('lost');
            if (!isLost) return false;
          } else if (lead.status !== statusFilter) {
            return false;
          }
        }

        // 2. Franchisee Filter
        if (franchiseeFilter !== 'all') {
          const leadFran = getLeadFranchiseeName(lead);
          if (!leadFran.toLowerCase().includes(franchiseeFilter.toLowerCase())) return false;
        }

        // 3. Search Term
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase().trim();
        const formattedCreated = getLeadDateInfo(lead).formatted.toLowerCase();
        const franName = getLeadFranchiseeName(lead).toLowerCase();
        return (
          lead.lpoName?.toLowerCase().includes(term) ||
          lead.lpoOwnerName?.toLowerCase().includes(term) ||
          lead.email?.toLowerCase().includes(term) ||
          lead.phone?.toLowerCase().includes(term) ||
          lead.prospectPlusId?.toLowerCase().includes(term) ||
          lead.status?.toLowerCase().includes(term) ||
          lead.linkedLeadCompanyName?.toLowerCase().includes(term) ||
          lead.rawCustomerName?.toLowerCase().includes(term) ||
          lead.linkedCustomerId?.toLowerCase().includes(term) ||
          lead.linkedPartnerLocationName?.toLowerCase().includes(term) ||
          franName.includes(term) ||
          formattedCreated.includes(term)
        );
      })
      .sort((a, b) => getLeadDateInfo(b).timestamp - getLeadDateInfo(a).timestamp);
  };

  const handleToggleNotUsingLpoPlus = async (lead: LpoLead) => {
    const isCurrentlyNotUsing = lead.status === 'Not Using LPO.Plus' || lead.notUsingLpoPlus === true;
    const newNotUsingState = !isCurrentlyNotUsing;
    const newStatus = newNotUsingState ? 'Not Using LPO.Plus' : 'New';

    try {
      const docRef = doc(firestore, 'lpo_leads', lead.id);
      await updateDoc(docRef, {
        notUsingLpoPlus: newNotUsingState,
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(firestore, 'lpo_leads', lead.id, 'activity'), {
        type: 'StatusChange',
        notes: newNotUsingState
          ? 'Marked as NOT using the LPO.Plus system.'
          : 'Re-enabled LPO.Plus system usage. Status reset to New.',
        author: userProfile?.displayName || userProfile?.email || 'System User',
        createdAt: serverTimestamp()
      });

      toast({
        title: newNotUsingState ? 'Marked as Not Using LPO.Plus' : 'LPO.Plus System Re-enabled',
        description: `LPO lead ${lead.lpoName} status updated to ${newStatus}.`,
      });
    } catch (err: any) {
      console.error('Error toggling LPO.Plus status:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update LPO lead.',
      });
    }
  };

  const filteredWipLeads = filterLeadsList(wipLeadsRaw);
  const filteredScfSentLeads = filterLeadsList(scfSentLeadsRaw);
  const filteredScfAcceptedLeads = filterLeadsList(scfAcceptedLeadsRaw);
  const filteredSignedLeads = filterLeadsList(signedLeadsRaw);
  const filteredAccessSentLeads = filterLeadsList(accessSentLeadsRaw);
  const filteredLoggedInLeads = filterLeadsList(loggedInLeadsRaw);
  const filteredNotUsingLeads = filterLeadsList(notUsingLpoPlusLeadsRaw);
  const filteredActiveLeads = filterLeadsList(activeLeadsRaw);
  const filteredLostLeads = filterLeadsList(lostLeadsRaw);

  const hasActiveFilters = Boolean(searchTerm || statusFilter !== 'all' || franchiseeFilter !== 'all');

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setFranchiseeFilter('all');
  };

  // Google Places Autocomplete & Partner selection states
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [addressPredictions, setAddressPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);

  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  const { isLoaded } = useGoogleMapsScript();

  useEffect(() => {
    if (isCreateOpen && isLoaded && window.google && !autocompleteService.current) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
    }
    if (!isCreateOpen) {
      setAddressPredictions([]);
      setLat(null);
      setLng(null);
    }
  }, [isCreateOpen, isLoaded]);

  const handleAddressInputChange = (value: string) => {
    setAddress1(value);
    if (autocompleteService.current && value.trim()) {
      autocompleteService.current.getPlacePredictions(
        { input: value, componentRestrictions: { country: 'au' } },
        (preds, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && preds) {
            setAddressPredictions(preds);
          } else {
            setAddressPredictions([]);
          }
        }
      );
    } else {
      setAddressPredictions([]);
    }
  };

  const handleAddressPredictionSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    placesService.current?.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['address_components', 'geometry'],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
          setLat(place.geometry.location.lat());
          setLng(place.geometry.location.lng());

          const components = place.address_components || [];
          let streetNum = '';
          let route = '';
          let sub = '';
          let st = '';
          let pc = '';

          for (const c of components) {
            if (c.types.includes('street_number')) streetNum = c.long_name;
            if (c.types.includes('route')) route = c.long_name;
            if (c.types.includes('locality')) sub = c.long_name;
            if (c.types.includes('administrative_area_level_1')) st = c.short_name;
            if (c.types.includes('postal_code')) pc = c.long_name;
          }

          setAddress1(`${streetNum} ${route}`.trim());
          if (sub) setCity(sub);
          if (st) setState(st);
          if (pc) setPostcode(pc);
          setAddressPredictions([]);
        }
      }
    );
  };

  const handlePartnerLocationChange = (partnerId: string) => {
    setSelectedPartnerLocationId(partnerId);
    if (partnerId) {
      const partner = partnerLocations.find(l => l.id === partnerId);
      if (partner) {
        setAddress1(partner.address1 || '');
        setAddress2(partner.address2 || partner.unit || partner.level || partner.unitOrLevel || '');
        setCity(partner.suburb || partner.city || '');
        setState(partner.state || '');
        setPostcode(partner.postCode || partner.postcode || '');
        if (partner.lat || partner.latitude) {
          setLat(parseFloat(partner.lat || partner.latitude));
        }
        if (partner.lng || partner.longitude) {
          setLng(parseFloat(partner.lng || partner.longitude));
        }
      }
    }
  };

  // Form states
  const [lpoName, setLpoName] = useState('');
  const [lpoOwnerName, setLpoOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreateLpoLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lpoName || !lpoOwnerName || !email || !phone) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    setCreating(true);
    try {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let randomStr = '';
      for (let i = 0; i < 6; i++) {
        randomStr += chars[Math.floor(Math.random() * chars.length)];
      }
      const prospectPlusId = `MPxLPO${randomStr}`;

      const selectedPartner = partnerLocations.find((l) => l.id === selectedPartnerLocationId);
      const partnerFranName = selectedPartner
        ? (selectedPartner.franchisee || selectedPartner.franchiseeName || selectedPartner.assignedFranchisee || selectedPartner.companyNameFranchise || selectedPartner.linkedFranchiseeName || null)
        : null;

      const newLeadData = {
        prospectPlusId,
        lpoName,
        lpoOwnerName,
        email,
        phone,
        address1,
        address2,
        city,
        state,
        postcode,
        notes,
        lat: lat ? String(lat) : null,
        lng: lng ? String(lng) : null,
        status: selectedPartner ? 'Linked to Partner Location' : 'New',
        conversionStep: selectedPartner ? 2 : 1,
        linkedPartnerLocationId: selectedPartner ? selectedPartner.id : null,
        linkedPartnerLocationName: selectedPartner ? selectedPartner.name : null,
        linkedFranchiseeName: partnerFranName,
        companyNameFranchise: partnerFranName,
        source: 'Head Office Generated',
        createdBy: userProfile?.displayName || userProfile?.email || 'System User',
        createdById: userProfile?.uid || null,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'lpo_leads'), newLeadData);

      toast({
        title: 'LPO Lead Created',
        description: `Successfully created LPO lead ${lpoName}.`,
      });

      // Reset form
      setLpoName('');
      setLpoOwnerName('');
      setEmail('');
      setPhone('');
      setAddress1('');
      setAddress2('');
      setCity('');
      setState('');
      setPostcode('');
      setNotes('');
      setSelectedPartnerLocationId('');
      setIsCreateOpen(false);
    } catch (err) {
      console.error('Error creating LPO lead:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create LPO lead.',
      });
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (authLoading || loadingPermissions || !canView('lpoLeads')) return;

    const q = query(collection(firestore, 'lpo_leads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData: LpoLead[] = [];
      const docsToUpdate: any[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let status = data.status;

        if (
          status === 'LPO.PLUS Sign In Email Sent' ||
          status === 'LPO.Plus Sign In Email Sent' ||
          (typeof status === 'string' && status.toLowerCase().trim() === 'lpo.plus sign in email sent')
        ) {
          status = 'LPO.Plus Logged In';
          docsToUpdate.push(docSnap.ref);
        }

        leadsData.push({
          id: docSnap.id,
          ...data,
          status,
        } as LpoLead);
      });

      if (docsToUpdate.length > 0) {
        const batch = writeBatch(firestore);
        docsToUpdate.forEach((docRef) => {
          batch.update(docRef, { status: 'LPO.Plus Logged In' });
        });
        batch.commit().catch((err) => console.error('Error auto-updating LPO lead status to LPO.Plus Logged In:', err));
      }

      setLeads(leadsData);
      setLoadingLeads(false);
    }, (err) => {
      console.error('Error fetching LPO leads:', err);
      setLoadingLeads(false);
    });

    const fetchPartners = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'partner_locations'));
        const locs: any[] = [];
        snap.forEach((docSnap) => {
          locs.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPartnerLocations(locs);
      } catch (err) {
        console.error('Error fetching partner locations:', err);
      }
    };

    const fetchCrmLeads = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'leads'));
        const map = new Map<string, any>();
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          map.set(docSnap.id, data);
          if (data.customerEntityId) map.set(String(data.customerEntityId).trim(), data);
          if (data.prospectPlusId) map.set(String(data.prospectPlusId).trim(), data);
        });
        setCrmLeadsMap(map);
      } catch (err) {
        console.error('Error fetching CRM leads:', err);
      }
    };

    fetchPartners();
    fetchCrmLeads();

    return () => unsubscribe();
  }, [authLoading, loadingPermissions, canView]);

  if (authLoading || loadingPermissions) {
    return <FullScreenLoader message="Loading..." />;
  }

  if (!canView('lpoLeads')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view the LPO Leads page.</p>
      </div>
    );
  }

  const renderLeadsTable = (leadList: LpoLead[], emptyMessage: string) => {
    if (loadingLeads) {
      return <div className="p-8 text-center text-slate-500">Loading leads...</div>;
    }

    if (leadList.length === 0) {
      return (
        <div className="p-8 text-center text-slate-500">
          {hasActiveFilters ? 'No LPO leads match your selected filters.' : emptyMessage}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader className="bg-[#095c7b] hover:bg-[#095c7b]">
          <TableRow className="hover:bg-[#095c7b]">
            <TableHead className="font-bold text-white w-[100px]">Lead ID</TableHead>
            <TableHead className="font-bold text-white min-w-[120px]">DATE CREATED</TableHead>
            <TableHead className="font-bold text-white min-w-[180px]">LPO Location / Owner</TableHead>
            <TableHead className="font-bold text-white min-w-[180px]">LINKED CUSTOMER</TableHead>
            <TableHead className="font-bold text-white min-w-[160px]">LINKED FRANCHISEE</TableHead>
            <TableHead className="font-bold text-white min-w-[240px]">PIPELINE STAGE & STATUS</TableHead>
            <TableHead className="font-bold text-white text-right w-[80px]">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leadList.map((lead) => {
            const progress = getPipelineProgress(lead.status);
            const isLost = progress.isLost;
            const isLpoLoggedIn = lead.status === 'LPO.Plus Logged In' || lead.status === 'LPO.PLUS Sign In Email Sent' || lead.status === 'LPO.Plus Sign In Email Sent';
            const isLpoAccessSent = lead.status === 'LPO.Plus Access Sent';
            const targetLeadId = lead.createdParentLeadId || lead.linkedLeadId;
            const hasLinkedCustomer = Boolean(targetLeadId || lead.linkedLeadCompanyName || lead.rawCustomerName || lead.linkedCustomerId);
            const franchiseeName = getLeadFranchiseeName(lead);

            return (
              <TableRow 
                key={lead.id} 
                className={
                  isLost 
                    ? "bg-rose-50/80 hover:bg-rose-100/90 transition-colors" 
                    : isLpoLoggedIn
                    ? "bg-emerald-50/80 hover:bg-emerald-100/90 transition-colors"
                    : isLpoAccessSent
                    ? "bg-sky-50/80 hover:bg-sky-100/90 transition-colors"
                    : "hover:bg-slate-50/50 transition-colors"
                }
              >
                {/* LEAD ID */}
                <TableCell className="font-medium text-[#095c7b] py-3.5">
                  <Link href={`/lpo-leads/${lead.id}`} className="hover:underline">
                    {lead.prospectPlusId}
                  </Link>
                </TableCell>

                {/* DATE CREATED */}
                <TableCell className="text-xs font-semibold text-slate-700 whitespace-nowrap py-3.5">
                  {getLeadDateInfo(lead).formatted}
                </TableCell>

                {/* LPO LOCATION / OWNER */}
                <TableCell className="font-medium text-slate-900 py-3.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/lpo-leads/${lead.id}`} className="font-bold text-slate-800 hover:text-[#095c7b] hover:underline">
                        {lead.lpoName}
                      </Link>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{lead.lpoOwnerName} &bull; {lead.email}</p>
                  </div>
                </TableCell>
                
                {/* LINKED CUSTOMER */}
                <TableCell className="py-3.5">
                  {hasLinkedCustomer ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[11px] px-2 py-0.5 font-bold">
                          Linked
                        </Badge>
                        {lead.linkedCustomerId && (
                          <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
                            ID: {lead.linkedCustomerId}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {targetLeadId ? (
                          <Link 
                            href={`/leads/${targetLeadId}`} 
                            className="text-[#095c7b] hover:text-[#053647] hover:underline inline-flex items-center gap-1 font-bold"
                            target="_blank"
                            title={`View linked CRM lead (${targetLeadId})`}
                          >
                            {lead.lpoName || lead.linkedLeadCompanyName || lead.rawCustomerName || 'Parent Lead'}
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                          </Link>
                        ) : (
                          <span className="text-slate-800 font-semibold">{lead.linkedLeadCompanyName || lead.rawCustomerName}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                      Unlinked
                    </span>
                  )}
                </TableCell>

                {/* LINKED FRANCHISEE */}
                <TableCell className="py-3.5">
                  {franchiseeName ? (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-[#095c7b] shrink-0" />
                      <span className="text-xs font-bold text-slate-800 bg-teal-50 text-[#095c7b] px-2 py-1 rounded border border-teal-200/80">
                        {franchiseeName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Unassigned</span>
                  )}
                </TableCell>

                {/* PIPELINE STAGE & STATUS */}
                <TableCell className="py-3.5">
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer space-y-1.5 group">
                        <div className="flex items-center justify-between gap-2">
                          <Badge className={`${progress.badgeClass} text-xs px-2.5 py-0.5 border shadow-2xs`}>
                            {progress.statusLabel}
                          </Badge>
                          {!isLost && (
                            <span className="text-[11px] font-bold text-slate-500">
                              Step {progress.currentStep}/{progress.totalSteps}
                            </span>
                          )}
                        </div>

                        {/* Stepper Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                          {isLost ? (
                            <div className="bg-rose-500 h-full w-full" />
                          ) : (
                            <div 
                              className="bg-[#095c7b] h-full transition-all duration-300 rounded-full" 
                              style={{ width: `${progress.percentage}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-900 text-white p-3 max-w-sm rounded-lg shadow-xl border border-slate-700">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                          <span className="font-bold text-xs text-teal-400 flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Pipeline Milestones
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {isLost ? 'Lost Lead' : `${progress.percentage}% Complete`}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-1 text-[11px]">
                          {progress.milestones.map((m, idx) => (
                            <div key={m.name} className="flex items-center gap-2">
                              {m.completed ? (
                                <Check className="h-3 w-3 text-emerald-400 shrink-0 font-bold" />
                              ) : (
                                <div className="h-3 w-3 rounded-full border border-slate-600 shrink-0" />
                              )}
                              <span className={m.completed ? "text-slate-100 font-medium" : "text-slate-500"}>
                                {idx + 1}. {m.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>

                {/* ACTION */}
                <TableCell className="text-right py-3.5 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleNotUsingLpoPlus(lead)}
                      title={lead.status === 'Not Using LPO.Plus' || lead.notUsingLpoPlus ? "Re-enable LPO.Plus system" : "Mark as Not Using LPO.Plus system"}
                      className={`h-7 px-2 text-xs font-semibold ${
                        lead.status === 'Not Using LPO.Plus' || lead.notUsingLpoPlus
                          ? "text-amber-800 bg-amber-100 hover:bg-amber-200"
                          : "text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                      }`}
                    >
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      {lead.status === 'Not Using LPO.Plus' || lead.notUsingLpoPlus ? "Not Using LPO.Plus" : "Mark Not Using"}
                    </Button>
                    <Link 
                      href={`/lpo-leads/${lead.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#095c7b] hover:text-[#053647]"
                    >
                      Profile
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <TooltipProvider>
      <div className="w-full max-w-full space-y-6">
        {/* PAGE HEADER */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building className="h-8 w-8 text-[#095c7b]" />
              Participating LPOs
            </h1>
            <p className="text-slate-500 mt-1">Manage and track Licensed Post Office franchise leads.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSyncPortalStatus}
              disabled={isSyncingPortal}
              variant="outline"
              className="border-teal-600 text-teal-700 hover:bg-teal-50 font-semibold"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingPortal ? 'animate-spin' : ''}`} />
              Sync LPO.Plus Status
            </Button>
            <Button asChild variant="outline" className="border-[#095c7b] text-[#095c7b] hover:bg-teal-50 font-semibold">
              <Link href="/admin/import-lpos">
                <Upload className="h-4 w-4 mr-2" />
                Import LPOs
              </Link>
            </Button>
            <Button 
              onClick={() => setIsCreateOpen(true)} 
              className="bg-[#095c7b] hover:bg-[#053647] text-white font-bold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create LPO Lead
            </Button>
          </div>
        </div>

        {/* SEPARATE FILTER CONTROLS SECTION */}
        <Card className="border-slate-200/80 shadow-xs bg-slate-50/50">
          <CardHeader className="py-3 px-4 border-b border-slate-200/60 bg-slate-100/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-[#095c7b]" />
                Filter & Search Controls
              </CardTitle>
              {hasActiveFilters && (
                <Button
                  onClick={handleClearFilters}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 font-semibold px-2"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Search Input */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Search LPOs</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search name, owner, email, ID..."
                    className="pl-9 bg-white h-9 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Pipeline Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white h-9 text-xs font-semibold">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Signed">Signed</SelectItem>
                    <SelectItem value="SCF Accepted">SCF Accepted</SelectItem>
                    <SelectItem value="SCF Sent">SCF Sent</SelectItem>
                    <SelectItem value="LPO.Plus Logged In">LPO.Plus Logged In</SelectItem>
                    <SelectItem value="LPO.Plus Access Sent">LPO.Plus Access Sent</SelectItem>
                    <SelectItem value="Not Using LPO.Plus">Not Using LPO.Plus</SelectItem>
                    <SelectItem value="Franchisees Assigned">Franchisees Assigned</SelectItem>
                    <SelectItem value="Operations Setup">Operations Setup</SelectItem>
                    <SelectItem value="Induction">Induction</SelectItem>
                    <SelectItem value="Linked to Partner Location">Partner Linked</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Franchisee Filter */}
              {!isFranchisee && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Linked Franchisee</Label>
                  <Select value={franchiseeFilter} onValueChange={setFranchiseeFilter}>
                    <SelectTrigger className="bg-white h-9 text-xs font-semibold">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                      <SelectValue placeholder="All Franchisees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Franchisees</SelectItem>
                      {uniqueFranchisees.map((fName) => (
                        <SelectItem key={fName} value={fName}>
                          {fName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* TABS & TABLE CARD */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-4">
          <TabsList className="bg-slate-200/70 p-1 border border-slate-300/60 rounded-xl h-auto flex flex-wrap sm:inline-flex">
            <TabsTrigger 
              value="wip" 
              className="rounded-lg font-bold px-3.5 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-[#095c7b] data-[state=active]:shadow-xs"
            >
              <Clock className="h-4 w-4 mr-1.5 text-[#095c7b]" />
              Work in Progress ({filteredWipLeads.length})
            </TabsTrigger>

            <TabsTrigger 
              value="scf_sent" 
              className="rounded-lg font-bold px-3.5 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-800 data-[state=active]:shadow-xs"
            >
              <Send className="h-4 w-4 mr-1.5 text-blue-600" />
              SCF Sent ({filteredScfSentLeads.length})
            </TabsTrigger>

            <TabsTrigger 
              value="scf_accepted" 
              className="rounded-lg font-bold px-3.5 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-800 data-[state=active]:shadow-xs"
            >
              <FileCheck className="h-4 w-4 mr-1.5 text-indigo-600" />
              SCF Accepted ({filteredScfAcceptedLeads.length})
            </TabsTrigger>

            <TabsTrigger 
              value="signed" 
              className="rounded-lg font-bold px-3.5 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-purple-800 data-[state=active]:shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5 text-purple-600" />
              Signed ({filteredSignedLeads.length})
            </TabsTrigger>

            <TabsTrigger 
              value="access_sent" 
              className="rounded-lg font-bold px-3.5 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-xs"
            >
              <Send className="h-4 w-4 mr-1.5 text-sky-600" />
              LPO.Plus Access Sent ({filteredAccessSentLeads.length})
            </TabsTrigger>

            <TabsTrigger 
              value="logged_in" 
              className="rounded-lg font-bold px-3.5 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs"
            >
              <LogIn className="h-4 w-4 mr-1.5 text-emerald-600" />
              LPO.Plus Logged In ({filteredLoggedInLeads.length})
            </TabsTrigger>

            <TabsTrigger 
              value="not_using_lpo_plus" 
              className="rounded-lg font-bold px-3.5 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-amber-800 data-[state=active]:shadow-xs"
            >
              <Ban className="h-4 w-4 mr-1.5 text-amber-600" />
              Not Using LPO.Plus ({filteredNotUsingLeads.length})
            </TabsTrigger>

            <TabsTrigger 
              value="active" 
              className="rounded-lg font-bold px-3.5 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-xs"
            >
              <Building className="h-4 w-4 mr-1.5 text-slate-600" />
              All Active LPOs ({filteredActiveLeads.length})
            </TabsTrigger>

            <TabsTrigger 
              value="lost" 
              className="rounded-lg font-bold px-3.5 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-rose-700 data-[state=active]:shadow-xs"
            >
              <XCircle className="h-4 w-4 mr-1.5 text-rose-500" />
              Lost LPOs ({filteredLostLeads.length})
            </TabsTrigger>
          </TabsList>

          {/* WORK IN PROGRESS TAB CONTENT */}
          <TabsContent value="wip">
            <Card className="border-slate-200/80 shadow-sm border-teal-200/60">
              <CardHeader className="bg-teal-50/50 py-3 border-b border-teal-100">
                <CardTitle className="text-sm font-bold text-teal-900 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#095c7b]" />
                  Work in Progress Onboarding Enquiries ({filteredWipLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderLeadsTable(filteredWipLeads, 'No work in progress LPO leads found.')}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCF SENT TAB CONTENT */}
          <TabsContent value="scf_sent">
            <Card className="border-slate-200/80 shadow-sm border-blue-200/60">
              <CardHeader className="bg-blue-50/50 py-3 border-b border-blue-100">
                <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                  <Send className="h-4 w-4 text-blue-600" />
                  SCF Sent LPO Leads ({filteredScfSentLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderLeadsTable(filteredScfSentLeads, 'No SCF Sent LPO leads found.')}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCF ACCEPTED TAB CONTENT */}
          <TabsContent value="scf_accepted">
            <Card className="border-slate-200/80 shadow-sm border-indigo-200/60">
              <CardHeader className="bg-indigo-50/50 py-3 border-b border-indigo-100">
                <CardTitle className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-indigo-600" />
                  SCF Accepted LPO Leads ({filteredScfAcceptedLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderLeadsTable(filteredScfAcceptedLeads, 'No SCF Accepted LPO leads found.')}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SIGNED TAB CONTENT */}
          <TabsContent value="signed">
            <Card className="border-slate-200/80 shadow-sm border-purple-200/60">
              <CardHeader className="bg-purple-50/50 py-3 border-b border-purple-100">
                <CardTitle className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  Signed LPO Leads & Accounts ({filteredSignedLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderLeadsTable(filteredSignedLeads, 'No Signed LPO leads found.')}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LPO.PLUS ACCESS SENT TAB CONTENT */}
          <TabsContent value="access_sent">
            <Card className="border-slate-200/80 shadow-sm border-sky-200/60">
              <CardHeader className="bg-sky-50/50 py-3 border-b border-sky-100">
                <CardTitle className="text-sm font-bold text-sky-800 flex items-center gap-1.5">
                  <Send className="h-4 w-4 text-sky-600" />
                  LPO.Plus Access Sent (Pending Login) ({filteredAccessSentLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderLeadsTable(filteredAccessSentLeads, 'No LPO.Plus access sent records found.')}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LPO.PLUS LOGGED IN TAB CONTENT */}
          <TabsContent value="logged_in">
            <Card className="border-slate-200/80 shadow-sm border-emerald-200/60">
              <CardHeader className="bg-emerald-50/50 py-3 border-b border-emerald-100">
                <CardTitle className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                  <LogIn className="h-4 w-4 text-emerald-600" />
                  LPO.Plus Logged In Accounts ({filteredLoggedInLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderLeadsTable(filteredLoggedInLeads, 'No LPO.Plus logged in accounts found.')}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOT USING LPO.PLUS TAB CONTENT */}
          <TabsContent value="not_using_lpo_plus">
            <Card className="border-slate-200/80 shadow-sm border-amber-200/60">
              <CardHeader className="bg-amber-50/50 py-3 border-b border-amber-100">
                <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                  <Ban className="h-4 w-4 text-amber-600" />
                  LPO Leads Not Using LPO.Plus System ({filteredNotUsingLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderLeadsTable(filteredNotUsingLeads, 'No LPO leads marked as not using LPO.Plus system.')}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ALL ACTIVE TAB CONTENT */}
          <TabsContent value="active">
            <Card className="border-slate-200/80 shadow-sm">
              <CardContent className="p-0">
                {renderLeadsTable(filteredActiveLeads, 'No active LPO leads found.')}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LOST TAB CONTENT */}
          <TabsContent value="lost">
            <Card className="border-slate-200/80 shadow-sm border-rose-200/60">
              <CardHeader className="bg-rose-50/50 py-3 border-b border-rose-100">
                <CardTitle className="text-sm font-bold text-rose-800 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-rose-600" />
                  Lost or Inactive LPO Enquiries ({filteredLostLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderLeadsTable(filteredLostLeads, 'No lost LPO leads recorded.')}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CREATE LPO DIALOG */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl bg-white rounded-xl shadow-xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building className="h-5 w-5 text-[#095c7b]" />
                Create LPO Lead
              </DialogTitle>
              <DialogDescription>
                Add a new Licensed Post Office lead. The source will be set to "Head Office Generated".
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateLpoLead} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">LPO Location / Name <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                  <Input 
                    required 
                    placeholder="e.g. Chatswood West LPO" 
                    value={lpoName}
                    onChange={(e) => setLpoName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">LPO Owner Name <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                  <Input 
                    required 
                    placeholder="e.g. John Smith" 
                    value={lpoOwnerName}
                    onChange={(e) => setLpoOwnerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Email Address <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                  <Input 
                    required 
                    type="email" 
                    placeholder="e.g. john@lpo.com.au" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Phone Number <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                  <Input 
                    required 
                    placeholder="e.g. 0412 345 678" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Partner Location selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Link Partner Location (Optional)</Label>
                <Select value={selectedPartnerLocationId} onValueChange={handlePartnerLocationChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a Partner Location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {partnerLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name || loc.lpoName} ({loc.suburb || loc.city || ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Address Auto-complete */}
              <div className="space-y-1.5 relative">
                <Label className="text-xs font-semibold text-slate-700">Street Address</Label>
                <Input 
                  placeholder="Search address or enter manually..." 
                  value={address1}
                  onChange={(e) => handleAddressInputChange(e.target.value)}
                />
                {addressPredictions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-md border shadow-lg max-h-48 overflow-y-auto">
                    {addressPredictions.map((pred) => (
                      <button
                        type="button"
                        key={pred.place_id}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 border-b border-slate-50 last:border-0"
                        onClick={() => handleAddressPredictionSelect(pred)}
                      >
                        {pred.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">City / Suburb</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">State</Label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Postcode</Label>
                  <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Notes (Optional)</Label>
                <Textarea 
                  rows={2} 
                  placeholder="Add any initial notes or details..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="bg-[#095c7b] hover:bg-[#053647] text-white font-bold">
                  {creating ? 'Creating...' : 'Create Lead'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
