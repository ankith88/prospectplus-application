'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  DollarSign, 
  Percent, 
  ShieldAlert, 
  Check, 
  X, 
  Layers, 
  Tag, 
  Building2, 
  Users, 
  Download, 
  Upload, 
  Info, 
  Lock, 
  Unlock, 
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  ArrowUpDown,
  Filter,
  Package,
  Calendar,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { 
  ServiceLineItemDoc, 
  CommissionModelType, 
  COMMISSION_MODEL_OPTIONS, 
  SERVICE_CATEGORIES, 
  FREQUENCY_PRESETS,
  FranchiseeServiceCommissionOverride,
  calculateServiceCommissionEstimate
} from '@/lib/services-types';
import { BulkImportServices } from '@/components/admin/bulk-import-services';

interface FranchiseeInfo {
  id: string;
  internalId: string;
  name: string;
  territory?: string;
  state?: string;
  commissionRate?: number; // Franchisee's default standard commission % (e.g. 0.70)
}

export function ServiceLineItemsManager() {
  const { user, userProfile, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  // State for services & franchisees
  const [services, setServices] = useState<ServiceLineItemDoc[]>([]);
  const [franchisees, setFranchisees] = useState<FranchiseeInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'service' | 'extra'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [commissionModelFilter, setCommissionModelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  // Modal State for Create / Edit Service
  const [isServiceModalOpen, setIsServiceModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedService, setSelectedService] = useState<Partial<ServiceLineItemDoc>>({
    code: '',
    netsuiteItemName: '',
    netsuiteItemId: '',
    itemType: 'service',
    category: 'Postal',
    basePrice: 0,
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    gstApplicable: 'Yes',
    partnerCommissionAccount: 'Franchise Commissions',
    partnerCommissionModel: 'Percentage of Sales - Franchisee Defined',
    partnerCommissionRate: '',
    description: '',
    isActive: true,
    franchiseeCommissions: {},
  });
  const [activeModalTab, setActiveModalTab] = useState<string>('general');
  const [savingService, setSavingService] = useState<boolean>(false);

  // Modal State for Franchisee Commissions Matrix
  const [isFranchiseeMatrixOpen, setIsFranchiseeMatrixOpen] = useState<boolean>(false);
  const [matrixTargetService, setMatrixTargetService] = useState<ServiceLineItemDoc | null>(null);
  const [matrixOverrides, setMatrixOverrides] = useState<Record<string, FranchiseeServiceCommissionOverride>>({});
  const [matrixSearchQuery, setMatrixSearchQuery] = useState<string>('');
  const [matrixStateFilter, setMatrixStateFilter] = useState<string>('all');
  const [savingMatrix, setSavingMatrix] = useState<boolean>(false);

  // Quick Inline Rate Edit Popover
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [tempRateValue, setTempRateValue] = useState<string>('');
  const [tempIsFixedValue, setTempIsFixedValue] = useState<boolean>(false);

  // Bulk Import Modal
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);

  // Fetch Services & Franchisees
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch Services
      const res = await fetch('/api/admin/services?includeInactive=true');
      if (res.ok) {
        const data = await res.json();
        if (data.services) {
          setServices(data.services);
        }
      } else {
        // Fallback to direct Firestore
        const snap = await getDocs(collection(firestore, 'services'));
        const list: ServiceLineItemDoc[] = snap.docs.map(d => {
          const docData = d.data();
          const rawCat = String(docData.category || '').trim();
          const isExtra = docData.itemType === 'extra' || rawCat.toLowerCase().includes('extra');
          const basePrice = docData.basePrice != null && !isNaN(Number(docData.basePrice))
            ? Number(docData.basePrice)
            : (docData.defaultRate != null && !isNaN(Number(docData.defaultRate)) ? Number(docData.defaultRate) : 0);

          return {
            id: d.id,
            code: docData.code || d.id,
            netsuiteItemName: docData.netsuiteItemName || docData.name || docData.code || d.id,
            netsuiteItemId: docData.netsuiteItemId ? String(docData.netsuiteItemId) : undefined,
            itemType: (docData.itemType || (isExtra ? 'extra' : 'service')) as 'service' | 'extra',
            category: docData.category || (isExtra ? 'Extras' : 'Services'),
            basePrice,
            defaultRate: basePrice,
            isFixedRate: docData.isFixedRate === true,
            defaultFrequency: docData.defaultFrequency || (isExtra ? 'Adhoc' : 'Mon,Tue,Wed,Thu,Fri'),
            gstApplicable: docData.gstApplicable ?? 'Yes',
            partnerCommissionAccount: docData.partnerCommissionAccount || 'Franchise Commissions',
            partnerCommissionModel: (docData.partnerCommissionModel || 'Percentage of Sales - Franchisee Defined') as CommissionModelType,
            partnerCommissionRate: docData.partnerCommissionRate ?? '',
            description: docData.description || '',
            isActive: docData.isActive !== false,
            franchiseeCommissions: docData.franchiseeCommissions || {},
          };
        });
        list.sort((a, b) => a.code.localeCompare(b.code));
        setServices(list);
      }

      // 2. Fetch Franchisees
      const franSnap = await getDocs(collection(firestore, 'franchisees'));
      const franList: FranchiseeInfo[] = franSnap.docs.map(d => {
        const fd = d.data();
        let commRate = 0.70; // 70% default
        if (fd.commissionRate != null) {
          const num = Number(fd.commissionRate);
          if (!isNaN(num)) {
            commRate = num > 1 ? num / 100 : num;
          }
        }
        return {
          id: d.id,
          internalId: String(fd.internalId || d.id),
          name: fd.name || `Franchisee ${d.id}`,
          territory: fd.territoryRaw || fd.territory || '',
          state: fd.state || (fd.territoryRaw?.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i)?.[0] || ''),
          commissionRate: commRate,
        };
      });

      franList.sort((a, b) => a.name.localeCompare(b.name));
      setFranchisees(franList);

    } catch (err: any) {
      console.error('Failed to load services or franchisees:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to load data',
        description: err.message || 'Could not fetch services catalog.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      // Status Filter
      if (statusFilter === 'active' && !service.isActive) return false;
      if (statusFilter === 'inactive' && service.isActive) return false;

      // Type Filter
      if (typeFilter !== 'all' && service.itemType !== typeFilter) return false;

      // Category Filter
      if (categoryFilter !== 'all' && service.category?.toLowerCase() !== categoryFilter.toLowerCase()) return false;

      // Commission Model Filter
      if (commissionModelFilter !== 'all' && service.partnerCommissionModel !== commissionModelFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = service.code?.toLowerCase().includes(q);
        const matchesName = service.netsuiteItemName?.toLowerCase().includes(q);
        const matchesId = service.netsuiteItemId?.toLowerCase().includes(q) || service.id?.toLowerCase().includes(q);
        const matchesCat = service.category?.toLowerCase().includes(q);
        const matchesDesc = service.description?.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesId && !matchesCat && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [services, statusFilter, typeFilter, categoryFilter, commissionModelFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const active = services.filter(s => s.isActive);
    const servicesCount = active.filter(s => s.itemType === 'service').length;
    const extrasCount = active.filter(s => s.itemType === 'extra').length;
    const fixedRateCount = active.filter(s => s.isFixedRate).length;
    const inactiveCount = services.filter(s => !s.isActive).length;

    const franDefinedCount = active.filter(s => s.partnerCommissionModel === 'Percentage of Sales - Franchisee Defined').length;
    const itemDefinedCount = active.filter(s => s.partnerCommissionModel === 'Percentage of Sales - Item Defined' || s.partnerCommissionModel === 'Unit Rate - Item Defined').length;
    const hundredPercentCount = active.filter(s => s.partnerCommissionModel === '100% Franchisee Commission').length;
    const noCommCount = active.filter(s => s.partnerCommissionModel === 'No Franchisee Commission').length;

    return {
      totalActive: active.length,
      servicesCount,
      extrasCount,
      fixedRateCount,
      inactiveCount,
      franDefinedCount,
      itemDefinedCount,
      hundredPercentCount,
      noCommCount,
    };
  }, [services]);

  // Open modal to Create New Service
  const handleOpenCreateModal = () => {
    setSelectedService({
      id: '',
      code: '',
      netsuiteItemName: '',
      netsuiteItemId: '',
      itemType: 'service',
      category: 'Postal',
      basePrice: 10.00,
      isFixedRate: false,
      defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
      gstApplicable: 'Yes',
      partnerCommissionAccount: 'Franchise Commissions',
      partnerCommissionModel: 'Percentage of Sales - Franchisee Defined',
      partnerCommissionRate: '',
      description: '',
      isActive: true,
      franchiseeCommissions: {},
    });
    setModalMode('create');
    setActiveModalTab('general');
    setIsServiceModalOpen(true);
  };

  // Open modal to Edit Service
  const handleOpenEditModal = (service: ServiceLineItemDoc) => {
    setSelectedService({
      ...service,
      franchiseeCommissions: service.franchiseeCommissions || {}
    });
    setModalMode('edit');
    setActiveModalTab('general');
    setIsServiceModalOpen(true);
  };

  // Save Service (Create or Update)
  const handleSaveService = async () => {
    if (!selectedService.code?.trim()) {
      toast({ variant: 'destructive', title: 'Code is required', description: 'Please provide a short code for the service.' });
      return;
    }
    if (!selectedService.netsuiteItemName?.trim()) {
      toast({ variant: 'destructive', title: 'Name is required', description: 'Please provide a NetSuite item name.' });
      return;
    }

    setSavingService(true);
    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/admin/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestorUid: user?.uid,
            service: selectedService
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to create service.');
        }
        toast({ title: 'Service Created', description: `Successfully created ${selectedService.code}.` });
      } else {
        const serviceId = selectedService.id || selectedService.code;
        const res = await fetch(`/api/admin/services/${serviceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestorUid: user?.uid,
            updates: selectedService
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to update service.');
        }
        toast({ title: 'Service Updated', description: `Successfully updated ${selectedService.code}.` });
      }

      setIsServiceModalOpen(false);
      loadData(true);
    } catch (err: any) {
      console.error('Error saving service:', err);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err.message || 'Failed to save service line item.'
      });
    } finally {
      setSavingService(false);
    }
  };

  // Toggle Active / Inactive Status
  const handleToggleActive = async (service: ServiceLineItemDoc) => {
    try {
      const res = await fetch(`/api/admin/services/${service.id}?requestorUid=${user?.uid}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to toggle status.');
      }
      toast({
        title: data.isActive ? 'Service Activated' : 'Service Inactivated',
        description: `${service.code} is now ${data.isActive ? 'Active' : 'Inactive'}.`
      });

      // Update local state immediately
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, isActive: data.isActive } : s));
    } catch (err: any) {
      console.error('Error toggling active status:', err);
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: err.message || 'Failed to update service status.'
      });
    }
  };

  // Save Inline Quick Rate
  const handleSaveInlineRate = async (serviceId: string) => {
    const num = parseFloat(tempRateValue);
    if (isNaN(num) || num < 0) {
      toast({ variant: 'destructive', title: 'Invalid Rate', description: 'Please enter a valid non-negative number.' });
      return;
    }

    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestorUid: user?.uid,
          updates: {
            basePrice: num,
            defaultRate: num,
            isFixedRate: tempIsFixedValue
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update rate.');
      }

      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, basePrice: num, defaultRate: num, isFixedRate: tempIsFixedValue } : s));
      setEditingRateId(null);
      toast({ title: 'Default Rate Updated', description: `Updated rate to $${num.toFixed(2)}.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    }
  };

  // Open Franchisee Commission Matrix for a specific service
  const handleOpenFranchiseeMatrix = (service: ServiceLineItemDoc) => {
    setMatrixTargetService(service);
    setMatrixOverrides(service.franchiseeCommissions ? JSON.parse(JSON.stringify(service.franchiseeCommissions)) : {});
    setMatrixSearchQuery('');
    setMatrixStateFilter('all');
    setIsFranchiseeMatrixOpen(true);
  };

  // Update a single Franchisee's override in matrix
  const handleUpdateFranchiseeOverride = (
    franId: string, 
    franName: string, 
    field: keyof FranchiseeServiceCommissionOverride, 
    value: any
  ) => {
    setMatrixOverrides(prev => {
      const current = prev[franId] || {
        franchiseeId: franId,
        franchiseeName: franName,
        commissionModel: undefined,
        commissionRate: undefined,
        customBaseRate: undefined,
      };

      const updated = {
        ...current,
        [field]: value,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.displayName || user?.email || 'admin'
      };

      // If user sets model back to default, we can remove the override or keep it clean
      return {
        ...prev,
        [franId]: updated
      };
    });
  };

  // Reset a single Franchisee's override back to default
  const handleResetFranchiseeOverride = (franId: string) => {
    setMatrixOverrides(prev => {
      const copy = { ...prev };
      delete copy[franId];
      return copy;
    });
  };

  // Bulk Apply Model to Filtered Franchisees
  const handleBulkApplyModel = (model: CommissionModelType, rate?: number) => {
    const updated: Record<string, FranchiseeServiceCommissionOverride> = { ...matrixOverrides };
    filteredMatrixFranchisees.forEach(f => {
      updated[f.internalId] = {
        franchiseeId: f.internalId,
        franchiseeName: f.name,
        commissionModel: model,
        commissionRate: rate !== undefined ? rate : undefined,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.displayName || 'admin'
      };
    });
    setMatrixOverrides(updated);
    toast({
      title: 'Bulk Structure Applied',
      description: `Applied '${model}' to ${filteredMatrixFranchisees.length} franchisees.`
    });
  };

  // Save Franchisee Commissions Matrix
  const handleSaveFranchiseeMatrix = async () => {
    if (!matrixTargetService) return;

    setSavingMatrix(true);
    try {
      const res = await fetch(`/api/admin/services/${matrixTargetService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestorUid: user?.uid,
          updates: {
            franchiseeCommissions: matrixOverrides
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update franchisee commissions.');
      }

      toast({
        title: 'Franchisee Commissions Saved',
        description: `Saved custom commission rules for '${matrixTargetService.code}'.`
      });

      // Update local state
      setServices(prev => prev.map(s => s.id === matrixTargetService.id ? { ...s, franchiseeCommissions: matrixOverrides } : s));
      setIsFranchiseeMatrixOpen(false);
    } catch (err: any) {
      console.error('Failed to save matrix:', err);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err.message || 'Could not save franchisee commission overrides.'
      });
    } finally {
      setSavingMatrix(false);
    }
  };

  // Export Services to CSV
  const handleExportCSV = () => {
    const headers = [
      'Internal ID',
      'Code',
      'NetSuite Item Name',
      'NetSuite Item ID',
      'Item Type',
      'Category',
      'Base Price / Rate ($)',
      'Is Fixed Rate',
      'Default Frequency',
      'GST Applicable',
      'Partner Commission Account',
      'Partner Commission Model',
      'Partner Commission Rate',
      'Custom Franchisee Overrides Count',
      'Status',
      'Description'
    ];

    const rows = services.map(s => {
      const overrideCount = s.franchiseeCommissions ? Object.keys(s.franchiseeCommissions).length : 0;
      return [
        `"${s.id}"`,
        `"${s.code.replace(/"/g, '""')}"`,
        `"${s.netsuiteItemName.replace(/"/g, '""')}"`,
        `"${s.netsuiteItemId || ''}"`,
        `"${s.itemType}"`,
        `"${s.category || ''}"`,
        `"${s.basePrice.toFixed(2)}"`,
        `"${s.isFixedRate ? 'Yes' : 'No'}"`,
        `"${s.defaultFrequency || ''}"`,
        `"${s.gstApplicable ?? 'Yes'}"`,
        `"${s.partnerCommissionAccount || ''}"`,
        `"${s.partnerCommissionModel || ''}"`,
        `"${s.partnerCommissionRate ?? ''}"`,
        `"${overrideCount}"`,
        `"${s.isActive ? 'Active' : 'Inactive'}"`,
        `"${(s.description || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mailplus_services_catalog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Matrix Filtered Franchisees
  const filteredMatrixFranchisees = useMemo(() => {
    return franchisees.filter(f => {
      if (matrixStateFilter !== 'all') {
        if (!f.state || !f.state.toUpperCase().includes(matrixStateFilter.toUpperCase())) {
          return false;
        }
      }
      if (matrixSearchQuery.trim()) {
        const q = matrixSearchQuery.toLowerCase().trim();
        const matchesName = f.name?.toLowerCase().includes(q);
        const matchesId = f.internalId?.toLowerCase().includes(q);
        const matchesTerr = f.territory?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesTerr) return false;
      }
      return true;
    });
  }, [franchisees, matrixStateFilter, matrixSearchQuery]);

  // Helper Badge for Commission Model
  const renderCommissionModelBadge = (model?: string, rate?: any) => {
    switch (model) {
      case '100% Franchisee Commission':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium border-0">100% Franchisee</Badge>;
      case 'No Franchisee Commission':
        return <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-[11px] font-medium border-0">No Commission (0%)</Badge>;
      case 'Unit Rate - Item Defined':
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium border-0">
            Unit Rate {rate ? `($${Number(rate).toFixed(2)})` : ''}
          </Badge>
        );
      case 'Percentage of Sales - Item Defined':
        return (
          <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium border-0">
            Item Defined {rate ? `(${rate}%)` : ''}
          </Badge>
        );
      case 'Percentage of Sales - Franchisee Defined':
      default:
        return <Badge className="bg-[#095c7b] hover:bg-[#074760] text-white text-[11px] font-medium border-0">Franchisee Defined (%)</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="h-8 w-8 text-[#095c7b]" />
            Service Line Items & Commission Catalog
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage standard services, ancillary extras, default pricing rates, and franchisee commission structures across Australia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkImportOpen(true)}
            className="h-9 gap-1.5"
          >
            <Upload className="h-4 w-4 text-[#095c7b]" />
            Bulk Import CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Export Catalog
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="h-9 gap-1.5 bg-[#095c7b] hover:bg-[#074760] text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create New Item
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 shadow-sm bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Services</CardDescription>
            <CardTitle className="text-2xl font-bold text-[#095c7b] mt-0.5">{metrics.servicesCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Scheduled pickup & delivery lines
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">Extras & Ancillary</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 mt-0.5">{metrics.extrasCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Adhoc bags, admin fees, special runs ({metrics.fixedRateCount} fixed price)
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">Franchisee % Defined</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600 mt-0.5">{metrics.franDefinedCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Inherits standard franchisee rate split
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">Custom & 100% Items</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 mt-0.5">{metrics.hundredPercentCount + metrics.itemDefinedCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            {metrics.hundredPercentCount} at 100%, {metrics.itemDefinedCount} item-fixed rates
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Table Card */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/40 dark:bg-slate-900/40">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Code, Item Name, Category, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-white dark:bg-slate-950"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                <SelectTrigger className="h-9 w-[130px] text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="service">Services Only</SelectItem>
                  <SelectItem value="extra">Extras Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Commission Model Filter */}
              <Select value={commissionModelFilter} onValueChange={setCommissionModelFilter}>
                <SelectTrigger className="h-9 w-[180px] text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Commission Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Commission Models</SelectItem>
                  <SelectItem value="Percentage of Sales - Franchisee Defined">Franchisee Defined (%)</SelectItem>
                  <SelectItem value="Percentage of Sales - Item Defined">Item Defined (%)</SelectItem>
                  <SelectItem value="Unit Rate - Item Defined">Unit Rate ($)</SelectItem>
                  <SelectItem value="100% Franchisee Commission">100% Franchisee</SelectItem>
                  <SelectItem value="No Franchisee Commission">No Commission (0%)</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-[140px] text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {SERVICE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="h-9 w-[120px] text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                  <SelectItem value="all">All Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200">
                <TableRow>
                  <TableHead className="w-[80px] font-semibold text-xs text-slate-700 dark:text-slate-300">Status</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs text-slate-700 dark:text-slate-300">Type</TableHead>
                  <TableHead className="min-w-[180px] font-semibold text-xs text-slate-700 dark:text-slate-300">Item Code & Name</TableHead>
                  <TableHead className="min-w-[130px] font-semibold text-xs text-slate-700 dark:text-slate-300">Category</TableHead>
                  <TableHead className="min-w-[140px] font-semibold text-xs text-slate-700 dark:text-slate-300">Default Rate ($)</TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-xs text-slate-700 dark:text-slate-300">Schedule</TableHead>
                  <TableHead className="min-w-[210px] font-semibold text-xs text-slate-700 dark:text-slate-300">Commission Structure</TableHead>
                  <TableHead className="min-w-[160px] font-semibold text-xs text-slate-700 dark:text-slate-300">Franchisee Overrides</TableHead>
                  <TableHead className="text-right font-semibold text-xs text-slate-700 dark:text-slate-300 w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-[#095c7b]" />
                        <span>Loading service catalog and commission rules...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="h-8 w-8 text-slate-300" />
                        <span className="font-medium text-slate-600">No service line items match your criteria.</span>
                        <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setTypeFilter('all'); setCategoryFilter('all'); setStatusFilter('all'); }}>
                          Reset Filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map(service => {
                    const overrideCount = service.franchiseeCommissions ? Object.keys(service.franchiseeCommissions).length : 0;

                    return (
                      <TableRow 
                        key={service.id}
                        className={`hover:bg-slate-50/80 transition-colors ${!service.isActive ? 'opacity-60 bg-slate-50/40' : ''}`}
                      >
                        {/* Status Toggle / Badge */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={service.isActive}
                              onCheckedChange={() => handleToggleActive(service)}
                              className="data-[state=checked]:bg-emerald-600"
                              title={service.isActive ? "Active (Click to inactivate)" : "Inactive (Click to activate)"}
                            />
                            <span className={`text-[11px] font-semibold ${service.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {service.isActive ? 'Active' : 'Off'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Item Type */}
                        <TableCell>
                          {service.itemType === 'service' ? (
                            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold">
                              Service
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-semibold">
                              Extra
                            </Badge>
                          )}
                        </TableCell>

                        {/* Code & NetSuite Item Name */}
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{service.code}</span>
                              {service.netsuiteItemId && (
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                                  ID: {service.netsuiteItemId}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1" title={service.netsuiteItemName}>
                              {service.netsuiteItemName}
                            </span>
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            {service.category || 'General'}
                          </span>
                        </TableCell>

                        {/* Default Rate with Quick Popover Edit */}
                        <TableCell>
                          <Popover
                            open={editingRateId === service.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setEditingRateId(service.id);
                                setTempRateValue(String(service.basePrice || 0));
                                setTempIsFixedValue(Boolean(service.isFixedRate));
                              } else {
                                setEditingRateId(null);
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button 
                                className="group flex items-center gap-1.5 px-2 py-1 -mx-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                                title="Click to quickly adjust default rate or fixity"
                              >
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                  ${Number(service.basePrice || 0).toFixed(2)}
                                </span>
                                {service.isFixedRate ? (
                                  <Badge variant="secondary" className="text-[10px] py-0 px-1 bg-slate-200 text-slate-700 gap-0.5" title="Locked rate in quotation">
                                    <Lock className="h-2.5 w-2.5" /> Fixed
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-slate-400 group-hover:text-slate-600 flex items-center">
                                    <Edit3 className="h-3 w-3 ml-0.5 opacity-0 group-hover:opacity-100" />
                                  </span>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-3 space-y-3" align="start">
                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-slate-900">Default Rate for {service.code}</h4>
                                <p className="text-[11px] text-muted-foreground">Adjust base default price applied when selecting this item.</p>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Base Rate ($ AUD)</Label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-semibold">$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={tempRateValue}
                                    onChange={(e) => setTempRateValue(e.target.value)}
                                    className="pl-6 h-8 text-xs font-semibold"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 pt-1">
                                <Checkbox
                                  id={`fix-${service.id}`}
                                  checked={tempIsFixedValue}
                                  onCheckedChange={(checked) => setTempIsFixedValue(Boolean(checked))}
                                />
                                <Label htmlFor={`fix-${service.id}`} className="text-xs cursor-pointer">
                                  Fixed Rate (Lock price from sales edits)
                                </Label>
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingRateId(null)}>
                                  Cancel
                                </Button>
                                <Button size="sm" className="h-7 text-xs bg-[#095c7b] hover:bg-[#074760]" onClick={() => handleSaveInlineRate(service.id)}>
                                  Save Rate
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* Frequency Schedule */}
                        <TableCell>
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {service.defaultFrequency || 'Adhoc'}
                          </span>
                        </TableCell>

                        {/* Commission Structure */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div>
                              {renderCommissionModelBadge(service.partnerCommissionModel, service.partnerCommissionRate)}
                            </div>
                            {service.partnerCommissionAccount && (
                              <span className="text-[10px] text-slate-400">
                                Acct: {service.partnerCommissionAccount}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Franchisee Overrides Matrix Button */}
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenFranchiseeMatrix(service)}
                            className={`h-7 px-2.5 text-xs gap-1.5 border-dashed ${
                              overrideCount > 0 
                                ? 'border-amber-300 bg-amber-50/50 text-amber-800 font-semibold' 
                                : 'text-slate-600'
                            }`}
                          >
                            <Users className="h-3.5 w-3.5" />
                            {overrideCount > 0 ? (
                              <span>{overrideCount} Custom Overrides</span>
                            ) : (
                              <span>All Default</span>
                            )}
                          </Button>
                        </TableCell>

                        {/* Action Buttons */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEditModal(service)}
                                    className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Service Details & Rates</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenFranchiseeMatrix(service)}
                                    className="h-8 w-8 text-[#095c7b] hover:text-[#074760] hover:bg-blue-50"
                                  >
                                    <Percent className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Franchisee Commissions</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* CREATE & EDIT SERVICE LINE ITEM DIALOG                                     */}
      {/* ========================================================================= */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-2 border-b bg-slate-50/70">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-[#095c7b]" />
              {modalMode === 'create' ? 'Create New Service Line Item' : `Edit Service: ${selectedService.code}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure line item specifications, default pricing, GST compliance, and partner commission models.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeModalTab} onValueChange={setActiveModalTab} className="p-6 pt-4 space-y-4">
            <TabsList className="grid grid-cols-2 w-full max-w-sm">
              <TabsTrigger value="general" className="text-xs">General & Pricing</TabsTrigger>
              <TabsTrigger value="commission" className="text-xs">Commission Structure</TabsTrigger>
            </TabsList>

            {/* TAB 1: General & Pricing */}
            <TabsContent value="general" className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Item Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Line Item Type <span className="text-red-500">*</span></Label>
                  <Select
                    value={selectedService.itemType || 'service'}
                    onValueChange={(val: 'service' | 'extra') => {
                      setSelectedService(prev => ({
                        ...prev,
                        itemType: val,
                        defaultFrequency: val === 'extra' ? 'Adhoc' : (prev.defaultFrequency || 'Mon,Tue,Wed,Thu,Fri'),
                        category: val === 'extra' && prev.category === 'Postal' ? 'Extras' : prev.category
                      }));
                    }}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Core Service (Scheduled Pickup / Delivery / DX / Courier)</SelectItem>
                      <SelectItem value="extra">Extra / Ancillary (Adhoc bags, satchels, admin fees)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Item Code */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Item Code <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g. AMPO, PMPO, 10910, H2H"
                    value={selectedService.code || ''}
                    onChange={(e) => setSelectedService(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="text-xs font-mono font-bold"
                  />
                </div>

                {/* NetSuite Item Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">NetSuite Item Description / Display Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g. AM Mail Pickup from Post Office"
                    value={selectedService.netsuiteItemName || ''}
                    onChange={(e) => setSelectedService(prev => ({ ...prev, netsuiteItemName: e.target.value }))}
                    className="text-xs"
                  />
                </div>

                {/* NetSuite Item ID */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">NetSuite Item ID / Internal Code</Label>
                  <Input
                    placeholder="e.g. 24, 501, 10911"
                    value={selectedService.netsuiteItemId || ''}
                    onChange={(e) => setSelectedService(prev => ({ ...prev, netsuiteItemId: e.target.value }))}
                    className="text-xs font-mono"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Service Category</Label>
                  <Select
                    value={selectedService.category || 'Postal'}
                    onValueChange={(val) => setSelectedService(prev => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Default Rate / Base Price */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Base Rate ($ AUD) <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-semibold">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={selectedService.basePrice ?? ''}
                      onChange={(e) => setSelectedService(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                      className="pl-7 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Default Frequency */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Frequency / Run Schedule</Label>
                  <Select
                    value={selectedService.defaultFrequency || (selectedService.itemType === 'extra' ? 'Adhoc' : 'Mon,Tue,Wed,Thu,Fri')}
                    onValueChange={(val) => setSelectedService(prev => ({ ...prev, defaultFrequency: val }))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_PRESETS.map(freq => (
                        <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fixed Rate Checkbox */}
                <div className="flex items-center space-x-2 sm:col-span-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  <Checkbox
                    id="modalIsFixedRate"
                    checked={selectedService.isFixedRate || false}
                    onCheckedChange={(checked) => setSelectedService(prev => ({ ...prev, isFixedRate: Boolean(checked) }))}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="modalIsFixedRate" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-slate-600" />
                      Lock Default Rate (Fixed Rate Item)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      When enabled, sales dialers and operators cannot alter this price during quote or invoice generation (e.g. $9.00 admin fee, $3.50 extra bags).
                    </p>
                  </div>
                </div>

                {/* GST Applicable */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">GST Applicable</Label>
                  <Select
                    value={selectedService.gstApplicable === 'No' ? 'No' : 'Yes'}
                    onValueChange={(val) => setSelectedService(prev => ({ ...prev, gstApplicable: val as any }))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="GST Applicable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes (10% GST Applied)</SelectItem>
                      <SelectItem value="No">No (GST Free / Zero-Rated)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Internal Notes / Description</Label>
                  <Textarea
                    placeholder="Optional description of service workflows or operational notes..."
                    value={selectedService.description || ''}
                    onChange={(e) => setSelectedService(prev => ({ ...prev, description: e.target.value }))}
                    className="text-xs resize-none h-16"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Commission Structure */}
            <TabsContent value="commission" className="space-y-4 pt-2">
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 rounded-lg space-y-1 text-xs">
                <div className="font-semibold text-[#095c7b] flex items-center gap-1.5">
                  <Info className="h-4 w-4" />
                  Service-Level Commission Model
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Select the default commission model applied to all franchisees for this service. You can also define custom overrides for specific franchisees in the Franchisee Matrix tab.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Partner Commission Account */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Partner Commission Account</Label>
                  <Input
                    placeholder="e.g. Franchise Commissions"
                    value={selectedService.partnerCommissionAccount || 'Franchise Commissions'}
                    onChange={(e) => setSelectedService(prev => ({ ...prev, partnerCommissionAccount: e.target.value }))}
                    className="text-xs"
                  />
                </div>

                {/* Commission Model Dropdown (Directly from User Screenshot) */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Partner Commission Model <span className="text-red-500">*</span></Label>
                  <Select
                    value={selectedService.partnerCommissionModel || 'Percentage of Sales - Franchisee Defined'}
                    onValueChange={(val: CommissionModelType) => setSelectedService(prev => ({ ...prev, partnerCommissionModel: val }))}
                  >
                    <SelectTrigger className="text-xs font-semibold">
                      <SelectValue placeholder="Select Commission Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMISSION_MODEL_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs py-2">
                          <div className="flex flex-col">
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Partner Commission Rate (Conditional on model) */}
                {(selectedService.partnerCommissionModel === 'Percentage of Sales - Item Defined' || 
                  selectedService.partnerCommissionModel === 'Unit Rate - Item Defined') && (
                  <div className="space-y-1.5 sm:col-span-2 p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                    <Label className="text-xs font-semibold text-amber-900">
                      {selectedService.partnerCommissionModel === 'Percentage of Sales - Item Defined' 
                        ? 'Item Commission Percentage (%)' 
                        : 'Fixed Unit Rate ($ AUD per unit)'
                      }
                    </Label>
                    <div className="relative max-w-xs mt-1">
                      <span className="absolute left-3 top-2 text-xs font-bold text-amber-800">
                        {selectedService.partnerCommissionModel === 'Percentage of Sales - Item Defined' ? '%' : '$'}
                      </span>
                      <Input
                        type="number"
                        step={selectedService.partnerCommissionModel === 'Percentage of Sales - Item Defined' ? '1' : '0.01'}
                        min="0"
                        placeholder={selectedService.partnerCommissionModel === 'Percentage of Sales - Item Defined' ? 'e.g. 70' : 'e.g. 5.00'}
                        value={selectedService.partnerCommissionRate ?? ''}
                        onChange={(e) => setSelectedService(prev => ({ ...prev, partnerCommissionRate: e.target.value }))}
                        className="pl-7 h-8 text-xs font-bold border-amber-300"
                      />
                    </div>
                    <p className="text-[11px] text-amber-700 mt-1">
                      {selectedService.partnerCommissionModel === 'Percentage of Sales - Item Defined'
                        ? 'Every franchisee will receive this exact percentage of the invoice line amount.'
                        : 'Franchisee is paid this flat dollar amount for every unit or stop performed.'
                      }
                    </p>
                  </div>
                )}

                {/* Calculation Simulation Preview */}
                <div className="sm:col-span-2 p-3 bg-slate-50 border rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <span>Commission Calculation Preview:</span>
                    <span className="text-[11px] font-normal text-muted-foreground">Based on Base Price: ${Number(selectedService.basePrice || 0).toFixed(2)}</span>
                  </div>
                  {(() => {
                    const est = calculateServiceCommissionEstimate(
                      selectedService.partnerCommissionModel,
                      Number(selectedService.basePrice || 0),
                      selectedService.partnerCommissionRate,
                      0.70 // sample 70% standard franchisee
                    );
                    return (
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="bg-white p-2 rounded border text-xs">
                          <span className="text-[10px] text-muted-foreground block">Customer Price</span>
                          <span className="font-bold text-slate-800">${Number(selectedService.basePrice || 0).toFixed(2)}</span>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-xs">
                          <span className="text-[10px] text-emerald-700 block">Franchisee Payout</span>
                          <span className="font-bold text-emerald-700">${est.commissionAmountPerUnit.toFixed(2)} ({est.commissionPercentage}%)</span>
                        </div>
                        <div className="bg-blue-50 p-2 rounded border border-blue-200 text-xs">
                          <span className="text-[10px] text-blue-700 block">Franchisor Margin</span>
                          <span className="font-bold text-blue-700">${est.franchisorAmountPerUnit.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="p-4 border-t bg-slate-50 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsServiceModalOpen(false)}
              disabled={savingService}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveService}
              disabled={savingService}
              className="bg-[#095c7b] hover:bg-[#074760] text-white"
            >
              {savingService ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  {modalMode === 'create' ? 'Create Line Item' : 'Save Changes'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* FRANCHISEE COMMISSIONS MATRIX DIALOG                                      */}
      {/* ========================================================================= */}
      <Dialog open={isFranchiseeMatrixOpen} onOpenChange={setIsFranchiseeMatrixOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-3 border-b bg-slate-50/70">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#095c7b]" />
                  Franchisee Commissions: {matrixTargetService?.code} ({matrixTargetService?.netsuiteItemName})
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Item Base Rate: <strong className="text-slate-900">${Number(matrixTargetService?.basePrice || 0).toFixed(2)}</strong> | Default Model: <strong className="text-[#095c7b]">{matrixTargetService?.partnerCommissionModel}</strong>
                </DialogDescription>
              </div>

              {/* Bulk Quick Model Application */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 bg-white">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Bulk Apply Structure
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 space-y-2.5" align="end">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-slate-900">Bulk Apply to {filteredMatrixFranchisees.length} Filtered Franchisees</h5>
                    <p className="text-[11px] text-muted-foreground">Quickly assign a specific commission model to all visible franchisees.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="justify-start text-xs h-7 text-emerald-700" 
                      onClick={() => handleBulkApplyModel('100% Franchisee Commission')}
                    >
                      Set to 100% Franchisee Commission
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="justify-start text-xs h-7 text-[#095c7b]" 
                      onClick={() => handleBulkApplyModel('Percentage of Sales - Franchisee Defined')}
                    >
                      Set to Franchisee Defined (%)
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="justify-start text-xs h-7 text-slate-700" 
                      onClick={() => handleBulkApplyModel('No Franchisee Commission')}
                    >
                      Set to No Commission (0%)
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start text-xs h-7 text-red-600 hover:text-red-700" 
                      onClick={() => {
                        setMatrixOverrides({});
                        toast({ title: 'Reset Overrides', description: 'All franchisees reset to item default.' });
                      }}
                    >
                      Reset All to Item Default
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </DialogHeader>

          {/* Matrix Search & State Filters */}
          <div className="p-4 border-b bg-white dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search franchisee by name, ID, or territory..."
                value={matrixSearchQuery}
                onChange={(e) => setMatrixSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground whitespace-nowrap">State:</span>
              <Select value={matrixStateFilter} onValueChange={setMatrixStateFilter}>
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="NSW">NSW</SelectItem>
                  <SelectItem value="VIC">VIC</SelectItem>
                  <SelectItem value="QLD">QLD</SelectItem>
                  <SelectItem value="WA">WA</SelectItem>
                  <SelectItem value="SA">SA</SelectItem>
                  <SelectItem value="TAS">TAS</SelectItem>
                  <SelectItem value="ACT">ACT</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-xs font-semibold text-slate-500 ml-2">
                {filteredMatrixFranchisees.length} Franchisees
              </span>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="flex-1 overflow-y-auto min-h-[300px]">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                <TableRow>
                  <TableHead className="w-[180px] font-semibold text-xs text-slate-700">Franchisee & Territory</TableHead>
                  <TableHead className="w-[110px] font-semibold text-xs text-slate-700">Default %</TableHead>
                  <TableHead className="min-w-[220px] font-semibold text-xs text-slate-700">Service Commission Structure</TableHead>
                  <TableHead className="w-[130px] font-semibold text-xs text-slate-700">Custom Rate</TableHead>
                  <TableHead className="w-[140px] font-semibold text-xs text-slate-700">Net Unit Payout</TableHead>
                  <TableHead className="w-[80px] text-right font-semibold text-xs text-slate-700">Reset</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatrixFranchisees.map(f => {
                  const override = matrixOverrides[f.internalId];
                  const isOverridden = Boolean(override && override.commissionModel);

                  const effectiveModel = override?.commissionModel || matrixTargetService?.partnerCommissionModel || 'Percentage of Sales - Franchisee Defined';
                  const est = calculateServiceCommissionEstimate(
                    matrixTargetService?.partnerCommissionModel,
                    Number(matrixTargetService?.basePrice || 0),
                    matrixTargetService?.partnerCommissionRate,
                    f.commissionRate || 0.70,
                    override
                  );

                  return (
                    <TableRow 
                      key={f.internalId} 
                      className={`hover:bg-slate-50/80 transition-colors ${isOverridden ? 'bg-amber-50/30' : ''}`}
                    >
                      {/* Franchisee Name & Territory */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            {f.name}
                            {isOverridden && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 bg-amber-50 text-amber-800 font-semibold">
                                Custom
                              </Badge>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-500 line-clamp-1">
                            {f.internalId} {f.state ? `• ${f.state}` : ''} {f.territory ? `(${f.territory})` : ''}
                          </span>
                        </div>
                      </TableCell>

                      {/* Default Standard Commission Rate */}
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px] font-mono">
                          {Math.round((f.commissionRate || 0.70) * 100)}%
                        </Badge>
                      </TableCell>

                      {/* Structure Override Select */}
                      <TableCell>
                        <Select
                          value={override?.commissionModel || 'DEFAULT'}
                          onValueChange={(val) => {
                            if (val === 'DEFAULT') {
                              handleResetFranchiseeOverride(f.internalId);
                            } else {
                              handleUpdateFranchiseeOverride(f.internalId, f.name, 'commissionModel', val as CommissionModelType);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Use Item Default" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DEFAULT" className="text-xs font-semibold text-slate-500">
                              Use Item Default ({matrixTargetService?.partnerCommissionModel})
                            </SelectItem>
                            {COMMISSION_MODEL_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Custom Rate Input (% or $) */}
                      <TableCell>
                        {effectiveModel === 'Percentage of Sales - Item Defined' || effectiveModel === 'Unit Rate - Item Defined' ? (
                          <div className="relative">
                            <span className="absolute left-2 top-2 text-[10px] text-slate-400 font-bold">
                              {effectiveModel === 'Percentage of Sales - Item Defined' ? '%' : '$'}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={effectiveModel === 'Percentage of Sales - Item Defined' ? 'e.g. 75' : 'e.g. 6.00'}
                              value={override?.commissionRate ?? ''}
                              onChange={(e) => handleUpdateFranchiseeOverride(f.internalId, f.name, 'commissionRate', parseFloat(e.target.value) || undefined)}
                              className="h-8 pl-5 text-xs font-bold"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">N/A</span>
                        )}
                      </TableCell>

                      {/* Net Unit Payout calculation */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-emerald-700">
                            ${est.commissionAmountPerUnit.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {est.summaryText}
                          </span>
                        </div>
                      </TableCell>

                      {/* Reset override button */}
                      <TableCell className="text-right">
                        {isOverridden && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResetFranchiseeOverride(f.internalId)}
                            className="h-7 w-7 text-slate-400 hover:text-red-600"
                            title="Reset to default structure"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {Object.keys(matrixOverrides).length} custom franchisee overrides configured.
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFranchiseeMatrixOpen(false)}
                disabled={savingMatrix}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveFranchiseeMatrix}
                disabled={savingMatrix}
                className="bg-[#095c7b] hover:bg-[#074760] text-white"
              >
                {savingMatrix ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Save Franchisee Commissions
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* BULK IMPORT SERVICES CSV MODAL                                             */}
      {/* ========================================================================= */}
      <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#095c7b]" />
              Bulk Import Services & Line Items CSV
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload a CSV file of services with NetSuite internal IDs, commission models, base pricing, and categories.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <BulkImportServices />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setIsBulkImportOpen(false); loadData(true); }}>
              Close & Refresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
