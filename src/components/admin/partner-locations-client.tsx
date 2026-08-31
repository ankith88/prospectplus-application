'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  MapPin, Plus, Search, Filter, Download, RefreshCw, Upload, Edit, Trash2, 
  Building2, Landmark, Store, CheckCircle2, AlertCircle, Phone, Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

export interface PartnerLocationRecord {
  id: string;
  internalId: string;
  name: string;
  address1?: string;
  address2?: string;
  state: string;
  suburb: string;
  postCode: string;
  phone?: string;
  siteAccessCode?: string;
  locationType: string;
  updatedAt?: string;
  createdAt?: string;
}

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

const COMMON_LOCATION_TYPES = [
  'AusPost',
  'Bank',
  'Depot',
  'Hub',
  'LPO',
  'Toll',
  'Other'
];

export function PartnerLocationsClient() {
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const [locations, setLocations] = useState<PartnerLocationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Create / Edit Dialog state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<PartnerLocationRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState({
    internalId: '',
    name: '',
    locationType: 'AusPost',
    customLocationType: '',
    address1: '',
    address2: '',
    suburb: '',
    state: 'NSW',
    postCode: '',
    phone: '',
    siteAccessCode: ''
  });

  // Delete Dialog state
  const [deleteTarget, setDeleteTarget] = useState<PartnerLocationRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch Partner Locations from Firestore
  const fetchLocations = useCallback(async (showToast = false) => {
    try {
      setRefreshing(true);
      const snap = await getDocs(collection(firestore, 'partner_locations'));
      const locs: PartnerLocationRecord[] = [];
      
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        locs.push({
          id: docId,
          internalId: data.internalId || docId,
          name: data.name || '',
          address1: data.address1 || '',
          address2: data.address2 || '',
          state: data.state || '',
          suburb: data.suburb || '',
          postCode: data.postCode || data.postcode || '',
          phone: data.phone || '',
          siteAccessCode: data.siteAccessCode || data.site_access_code || '',
          locationType: data.locationType || data.location_type || 'AusPost',
          updatedAt: data.updatedAt || '',
          createdAt: data.createdAt || ''
        });
      });

      // Sort alphabetically by name
      locs.sort((a, b) => a.name.localeCompare(b.name));
      setLocations(locs);
      
      if (showToast) {
        toast({ title: 'Refreshed', description: `Loaded ${locs.length} partner locations.` });
      }
    } catch (err) {
      console.error('Error fetching partner locations:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Failed to load partner locations from database.' 
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Unique Location Types present in dataset
  const availableLocationTypes = useMemo(() => {
    const typesSet = new Set<string>();
    COMMON_LOCATION_TYPES.forEach(t => typesSet.add(t));
    locations.forEach(loc => {
      if (loc.locationType) typesSet.add(loc.locationType);
    });
    return Array.from(typesSet).sort();
  }, [locations]);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      // State Filter
      if (stateFilter !== 'ALL' && loc.state.toUpperCase() !== stateFilter.toUpperCase()) {
        return false;
      }
      // Type Filter
      if (typeFilter !== 'ALL' && loc.locationType.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchInternalId = loc.internalId.toLowerCase().includes(q);
        const matchName = loc.name.toLowerCase().includes(q);
        const matchSuburb = loc.suburb.toLowerCase().includes(q);
        const matchPostcode = loc.postCode.toLowerCase().includes(q);
        const matchPhone = loc.phone?.toLowerCase().includes(q) || false;
        const matchAddress = loc.address1?.toLowerCase().includes(q) || loc.address2?.toLowerCase().includes(q) || false;
        const matchAccessCode = loc.siteAccessCode?.toLowerCase().includes(q) || false;
        
        if (!matchInternalId && !matchName && !matchSuburb && !matchPostcode && !matchPhone && !matchAddress && !matchAccessCode) {
          return false;
        }
      }
      return true;
    });
  }, [locations, searchQuery, stateFilter, typeFilter]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = locations.length;
    let ausPostCount = 0;
    let bankCount = 0;
    let otherCount = 0;

    locations.forEach(loc => {
      const typeLower = (loc.locationType || '').toLowerCase();
      if (typeLower.includes('auspost') || typeLower.includes('lpo') || typeLower.includes('post')) {
        ausPostCount++;
      } else if (typeLower.includes('bank')) {
        bankCount++;
      } else {
        otherCount++;
      }
    });

    return { total, ausPostCount, bankCount, otherCount };
  }, [locations]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingLocation(null);
    setFormData({
      internalId: '',
      name: '',
      locationType: 'AusPost',
      customLocationType: '',
      address1: '',
      address2: '',
      suburb: '',
      state: 'NSW',
      postCode: '',
      phone: '',
      siteAccessCode: ''
    });
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (loc: PartnerLocationRecord) => {
    setEditingLocation(loc);
    const isStandardType = COMMON_LOCATION_TYPES.includes(loc.locationType);
    setFormData({
      internalId: loc.internalId,
      name: loc.name,
      locationType: isStandardType ? loc.locationType : 'Other',
      customLocationType: isStandardType ? '' : loc.locationType,
      address1: loc.address1 || '',
      address2: loc.address2 || '',
      suburb: loc.suburb,
      state: loc.state || 'NSW',
      postCode: loc.postCode,
      phone: loc.phone || '',
      siteAccessCode: loc.siteAccessCode || ''
    });
    setIsFormOpen(true);
  };

  // Save (Create or Update) Location
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.internalId.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Internal ID / Code is required.' });
      return;
    }
    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Location Name is required.' });
      return;
    }
    if (!formData.suburb.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Suburb is required.' });
      return;
    }
    if (!formData.postCode.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Postcode is required.' });
      return;
    }

    const finalLocationType = formData.locationType === 'Other' && formData.customLocationType.trim() 
      ? formData.customLocationType.trim() 
      : formData.locationType;

    setIsSubmitting(true);
    const nowStr = new Date().toISOString();
    const docId = formData.internalId.trim();

    const payload = {
      internalId: docId,
      name: formData.name.trim(),
      locationType: finalLocationType,
      address1: formData.address1.trim(),
      address2: formData.address2.trim(),
      suburb: formData.suburb.trim(),
      state: formData.state.toUpperCase().trim(),
      postCode: formData.postCode.trim(),
      phone: formData.phone.trim(),
      siteAccessCode: formData.siteAccessCode.trim(),
      updatedAt: nowStr,
      ...(editingLocation ? {} : { createdAt: nowStr })
    };

    try {
      const locRef = doc(firestore, 'partner_locations', docId);
      await setDoc(locRef, payload, { merge: true });

      toast({ 
        title: editingLocation ? 'Location Updated' : 'Location Created', 
        description: `Successfully saved ${formData.name.trim()} (${docId}).` 
      });

      setIsFormOpen(false);
      fetchLocations();
    } catch (err) {
      console.error('Error saving partner location:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Save Failed', 
        description: 'Failed to write location to Firestore database.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Location
  const handleDeleteLocation = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'partner_locations', deleteTarget.id));
      toast({ 
        title: 'Location Deleted', 
        description: `Deleted ${deleteTarget.name} (${deleteTarget.internalId}).` 
      });
      setDeleteTarget(null);
      fetchLocations();
    } catch (err) {
      console.error('Error deleting location:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Delete Failed', 
        description: 'Could not delete partner location.' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredLocations.length === 0) {
      toast({ title: 'No Data', description: 'No locations available to export.' });
      return;
    }

    const headers = ['Internal ID', 'Name', 'Location Type', 'Address 1', 'Address 2', 'Suburb', 'State', 'Post Code', 'Phone', 'Site Access Code', 'Updated At'];
    const rows = filteredLocations.map(loc => [
      loc.internalId,
      loc.name,
      loc.locationType,
      loc.address1 || '',
      loc.address2 || '',
      loc.suburb,
      loc.state,
      loc.postCode,
      loc.phone || '',
      loc.siteAccessCode || '',
      loc.updatedAt || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `partner_locations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: 'Exported CSV', description: `Exported ${filteredLocations.length} locations.` });
  };

  // Get Badge Color by Location Type
  const getTypeBadge = (typeStr: string) => {
    const t = (typeStr || '').toLowerCase();
    if (t.includes('auspost') || t.includes('lpo') || t.includes('post')) {
      return <Badge className="bg-sky-600 hover:bg-sky-700 text-white font-medium">{typeStr}</Badge>;
    }
    if (t.includes('bank')) {
      return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">{typeStr}</Badge>;
    }
    if (t.includes('depot') || t.includes('hub')) {
      return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">{typeStr}</Badge>;
    }
    if (t.includes('toll')) {
      return <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-medium">{typeStr}</Badge>;
    }
    return <Badge variant="secondary" className="font-medium">{typeStr || 'Partner'}</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 md:p-6 min-h-screen">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2.5">
              <MapPin className="h-7 w-7 text-[#095c7b]" />
              Partner Locations Directory
            </h1>
            <Badge variant="outline" className="bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/20 font-bold">
              {stats.total} Total
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Superadmin directory to manage, create, edit, and delete partner locations (AusPost, Banks, Depots, Hubs).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchLocations(true)} 
            disabled={refreshing}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCsv}
            disabled={filteredLocations.length === 0}
            className="h-9 gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            asChild
            className="h-9 gap-1.5 text-[#095c7b] border-[#095c7b]/30 hover:bg-[#095c7b]/5"
          >
            <Link href="/admin/locations/import">
              <Upload className="h-4 w-4" />
              Bulk CSV Import
            </Link>
          </Button>

          {isSuperAdmin && (
            <Button 
              size="sm" 
              onClick={handleOpenCreate}
              className="h-9 gap-1.5 bg-[#095c7b] hover:bg-[#07465e] text-white shadow-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Add Partner Location
            </Button>
          )}
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#095c7b] shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Locations</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</h3>
            </div>
            <div className="p-3 bg-[#095c7b]/10 rounded-full text-[#095c7b]">
              <MapPin className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AusPost Locations</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.ausPostCount}</h3>
            </div>
            <div className="p-3 bg-sky-50 rounded-full text-sky-600">
              <Store className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank Locations</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.bankCount}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
              <Landmark className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Other / Depots</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.otherCount}</h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-full text-purple-600">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by ID, name, suburb, postcode, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-slate-300 focus-visible:ring-[#095c7b]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Label className="text-xs font-semibold text-slate-500 shrink-0">State:</Label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="h-9 w-[130px] border-slate-300">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All States</SelectItem>
                  {AUSTRALIAN_STATES.map(st => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Label className="text-xs font-semibold text-slate-500 shrink-0">Type:</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-[140px] border-slate-300">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {availableLocationTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(searchQuery || stateFilter !== 'ALL' || typeFilter !== 'ALL') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchQuery('');
                  setStateFilter('ALL');
                  setTypeFilter('ALL');
                }}
                className="h-9 text-xs text-slate-500 hover:text-slate-900"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="py-3.5 px-4 bg-slate-50/70 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">
              Locations ({filteredLocations.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Showing matching records in Firestore
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading partner locations...</span>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-16 px-4 text-center">
              <MapPin className="h-10 w-10 text-slate-300 mb-2" />
              <h4 className="text-base font-bold text-slate-700">No Partner Locations Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {locations.length === 0 
                  ? 'No partner location records exist in the database yet. Click "Add Partner Location" to create one.' 
                  : 'No records match your active search or filter criteria. Try clearing filters.'}
              </p>
              {isSuperAdmin && locations.length === 0 && (
                <Button 
                  size="sm" 
                  onClick={handleOpenCreate} 
                  className="mt-4 bg-[#095c7b] hover:bg-[#07465e]"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add First Location
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-[120px] font-bold text-slate-700">Internal ID</TableHead>
                    <TableHead className="font-bold text-slate-700">Location Name</TableHead>
                    <TableHead className="w-[130px] font-bold text-slate-700">Type</TableHead>
                    <TableHead className="font-bold text-slate-700">Suburb & State</TableHead>
                    <TableHead className="font-bold text-slate-700">Street Address</TableHead>
                    <TableHead className="font-bold text-slate-700">Contact / Phone</TableHead>
                    <TableHead className="font-bold text-slate-700">Site Access Code</TableHead>
                    <TableHead className="text-right font-bold text-slate-700 w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((loc) => (
                    <TableRow key={loc.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Internal ID */}
                      <TableCell className="font-mono text-xs font-bold text-[#095c7b]">
                        <span className="bg-[#095c7b]/10 text-[#095c7b] px-2 py-0.5 rounded border border-[#095c7b]/20">
                          {loc.internalId}
                        </span>
                      </TableCell>

                      {/* Name */}
                      <TableCell className="font-semibold text-slate-800 text-sm">
                        {loc.name}
                      </TableCell>

                      {/* Location Type */}
                      <TableCell>
                        {getTypeBadge(loc.locationType)}
                      </TableCell>

                      {/* Suburb, State, Postcode */}
                      <TableCell className="text-sm">
                        <span className="font-medium text-slate-700">{loc.suburb}</span>
                        {loc.state && <span className="ml-1 text-slate-500 font-bold">{loc.state}</span>}
                        {loc.postCode && <span className="ml-1 text-slate-400 text-xs">({loc.postCode})</span>}
                      </TableCell>

                      {/* Address */}
                      <TableCell className="text-xs text-slate-600 max-w-[200px] truncate">
                        {loc.address1 || loc.address2 ? (
                          <>
                            {loc.address1} {loc.address2 ? `, ${loc.address2}` : ''}
                          </>
                        ) : (
                          <span className="text-slate-400 italic">No street address</span>
                        )}
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="text-xs text-slate-600">
                        {loc.phone ? (
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {loc.phone}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </TableCell>

                      {/* Access Code */}
                      <TableCell className="text-xs">
                        {loc.siteAccessCode ? (
                          <div className="flex items-center gap-1 font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded max-w-[140px] truncate">
                            <Key className="h-3 w-3 text-amber-600 shrink-0" />
                            <span className="truncate">{loc.siteAccessCode}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        {isSuperAdmin ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(loc)}
                              className="h-8 w-8 text-slate-600 hover:text-[#095c7b] hover:bg-[#095c7b]/10"
                              title="Edit location"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(loc)}
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete location"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Read-only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#095c7b]" />
              {editingLocation ? 'Edit Partner Location' : 'Add New Partner Location'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingLocation 
                ? `Update details for location ID ${editingLocation.internalId}` 
                : 'Fill out the details below to add a new location to Firestore.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLocation} className="space-y-4 py-2">
            
            {/* Internal ID & Location Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Internal ID / Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. 27852 or DEPOT-01"
                  value={formData.internalId}
                  onChange={(e) => setFormData(prev => ({ ...prev, internalId: e.target.value }))}
                  disabled={Boolean(editingLocation)}
                  required
                  className="font-mono text-sm border-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Location Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.locationType}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, locationType: val }))}
                >
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_LOCATION_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Location Type input if "Other" */}
            {formData.locationType === 'Other' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Specify Location Type</Label>
                <Input
                  placeholder="e.g. Distribution Center, Freight Hub"
                  value={formData.customLocationType}
                  onChange={(e) => setFormData(prev => ({ ...prev, customLocationType: e.target.value }))}
                  className="border-slate-300"
                />
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Location Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Abbotsford DC, Kennards Moore Park"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                className="border-slate-300"
              />
            </div>

            {/* Address Line 1 & Line 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Address Line 1</Label>
                <Input
                  placeholder="e.g. 45 Grosvenor St"
                  value={formData.address1}
                  onChange={(e) => setFormData(prev => ({ ...prev, address1: e.target.value }))}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Address Line 2</Label>
                <Input
                  placeholder="e.g. Building B, Level 1"
                  value={formData.address2}
                  onChange={(e) => setFormData(prev => ({ ...prev, address2: e.target.value }))}
                  className="border-slate-300"
                />
              </div>
            </div>

            {/* Suburb, State, Postcode */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1 sm:col-span-1">
                <Label className="text-xs font-bold text-slate-700">
                  Suburb <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Abbotsford"
                  value={formData.suburb}
                  onChange={(e) => setFormData(prev => ({ ...prev, suburb: e.target.value }))}
                  required
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-1.5 col-span-1 sm:col-span-1">
                <Label className="text-xs font-bold text-slate-700">
                  State <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.state}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, state: val }))}
                >
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUSTRALIAN_STATES.map(st => (
                      <SelectItem key={st} value={st}>{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-1 sm:col-span-1">
                <Label className="text-xs font-bold text-slate-700">
                  Postcode <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. 3067"
                  value={formData.postCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, postCode: e.target.value }))}
                  required
                  className="border-slate-300"
                />
              </div>
            </div>

            {/* Phone & Site Access Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Phone</Label>
                <Input
                  placeholder="e.g. 03 9123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Site Access Code</Label>
                <Input
                  placeholder="e.g. Gate code #1234"
                  value={formData.siteAccessCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, siteAccessCode: e.target.value }))}
                  className="border-slate-300 font-mono text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t mt-4 flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#095c7b] hover:bg-[#07465e] text-white"
              >
                {isSubmitting ? 'Saving...' : editingLocation ? 'Update Location' : 'Create Location'}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Delete Partner Location?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              Are you sure you want to permanently delete location{' '}
              <strong className="text-slate-900">{deleteTarget?.name}</strong> (ID:{' '}
              <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{deleteTarget?.internalId}</code>)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocation}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Location'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
