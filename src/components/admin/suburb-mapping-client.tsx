'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, getDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Franchisee, Operator } from '@/lib/types';
import { getAllFranchisees, getOperatorsForFranchisee } from '@/services/firebase';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Plus, Trash2, ShieldAlert, Check, Copy, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places'];

interface SuburbItem {
  suburbs: string;
  post_code: string;
  state: string;
  primary_op: string[];
  secondary_op?: string;
  next_day: boolean | null;
  parent_lpo_id?: string;
  lat?: number;
  lng?: number;
}

interface LodgementPoint {
  depotId: string;
  name: string;
  suburb: string;
  postcode: string;
  state: string;
  operators: string[];
  operatorId?: string; // fallback single operator for compatibility
}

export default function SuburbMappingClient() {
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string>('');
  const [selectedFranchisee, setSelectedFranchisee] = useState<Franchisee | null>(null);
  
  const [operators, setOperators] = useState<Operator[]>([]);
  const [depots, setDepots] = useState<any[]>([]);
  const [linkedLPOs, setLinkedLPOs] = useState<{ id: string; companyName: string }[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('main');
  
  // Local state for each type of suburbs
  const [mainTerritory, setMainTerritory] = useState<SuburbItem[]>([]);
  const [starTrackSuburbs, setStarTrackSuburbs] = useState<SuburbItem[]>([]);
  const [tgeSuburbs, setTgeSuburbs] = useState<SuburbItem[]>([]);
  const [ironMountainSuburbs, setIronMountainSuburbs] = useState<SuburbItem[]>([]);
  const [ausPostSuburbs, setAusPostSuburbs] = useState<SuburbItem[]>([]);
  
  // Local state for lodgement points
  const [expressLodgement, setExpressLodgement] = useState<LodgementPoint[]>([]);
  const [starTrackLodgement, setStarTrackLodgement] = useState<LodgementPoint[]>([]);
  
  // Autocomplete state
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected depot to add
  const [selectedDepotToAdd, setSelectedDepotToAdd] = useState<string>('');

  const { toast } = useToast();
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Load all franchisees & depots initially
  useEffect(() => {
    async function init() {
      try {
        const franchiseesData = await getAllFranchisees();
        franchiseesData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setFranchisees(franchiseesData);
        
        // Fetch depots
        const depotsSnap = await getDocs(collection(firestore, 'partner_locations'));
        const depotsList = depotsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDepots(depotsList);
      } catch (err) {
        console.error('Failed to load initial data:', err);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load initial configuration data' });
      } finally {
        setLoadingData(false);
      }
    }
    init();
  }, [toast]);

  // Load franchisee specific data when selected Franchisee changes
  useEffect(() => {
    if (!selectedFranchiseeId) {
      setSelectedFranchisee(null);
      setOperators([]);
      setLinkedLPOs([]);
      clearMappingStates();
      return;
    }

    const franchisee = franchisees.find(f => f.internalId === selectedFranchiseeId) || null;
    setSelectedFranchisee(franchisee);
    
    if (franchisee) {
      // Load operators
      getOperatorsForFranchisee(franchisee.internalId).then(ops => {
        setOperators(ops);
      });
      
      // Query linked LPOs (companies collection where linkedLPOFranchisees contains franchisee ID)
      const qId = query(collection(firestore, 'companies'), where('linkedLPOFranchisees', 'array-contains', franchisee.internalId));
      getDocs(qId).then(snap => {
        const lpos = snap.docs.map(doc => ({ id: doc.id, companyName: doc.data().companyName || doc.id }));
        setLinkedLPOs(lpos);
      }).catch(err => {
        console.error('Failed to load linked LPOs:', err);
      });
      
      // Set mapped suburb lists
      setMainTerritory(franchisee.territoryJson ? franchisee.territoryJson.map(sanitizeSuburbItem) : []);
      setStarTrackSuburbs(franchisee.starTrackSuburbsJson ? franchisee.starTrackSuburbsJson.map(sanitizeSuburbItem) : []);
      setTgeSuburbs(franchisee.tgeSuburbsJSON ? franchisee.tgeSuburbsJSON.map(sanitizeSuburbItem) : []);
      setIronMountainSuburbs(franchisee.ironMountainSuburbsJson ? franchisee.ironMountainSuburbsJson.map(sanitizeSuburbItem) : []);
      setAusPostSuburbs(franchisee.ausPostSuburbsJson ? franchisee.ausPostSuburbsJson.map(sanitizeSuburbItem) : []);
      
      // Parse lodgement points
      setExpressLodgement(parseLodgementPoints(franchisee.mpExpressLodgementPoints));
      setStarTrackLodgement(parseLodgementPoints(franchisee.starTrackLodgementPoints));
    }
  }, [selectedFranchiseeId, franchisees]);

  const clearMappingStates = () => {
    setMainTerritory([]);
    setStarTrackSuburbs([]);
    setTgeSuburbs([]);
    setIronMountainSuburbs([]);
    setAusPostSuburbs([]);
    setExpressLodgement([]);
    setStarTrackLodgement([]);
  };

  const sanitizeSuburbItem = (item: any): SuburbItem => {
    let primary_op: string[] = [];
    if (Array.isArray(item.primary_op)) {
      primary_op = item.primary_op;
    } else if (typeof item.primary_op === 'string' && item.primary_op) {
      primary_op = [item.primary_op];
    }
    return {
      suburbs: item.suburbs || '',
      post_code: item.post_code || '',
      state: item.state || '',
      primary_op,
      secondary_op: item.secondary_op || '',
      next_day: item.next_day ?? false,
      parent_lpo_id: item.parent_lpo_id || '',
      lat: item.lat,
      lng: item.lng
    };
  };

  const parseLodgementPoints = (pts: any): LodgementPoint[] => {
    if (!pts) return [];
    let parsed: any[] = [];
    if (typeof pts === 'string') {
      try {
        parsed = JSON.parse(pts);
      } catch {
        parsed = [];
      }
    } else if (Array.isArray(pts)) {
      parsed = pts;
    }
    
    return parsed.map(pt => ({
      depotId: pt.depotId || pt.depot_id || pt.depot || '',
      name: pt.name || pt.depot || '',
      suburb: pt.suburb || pt.city || '',
      postcode: pt.postcode || pt.post_code || pt.zip || '',
      state: pt.state || '',
      operators: Array.isArray(pt.operators) ? pt.operators : (pt.operatorId || pt.operator_id || pt.operator ? [pt.operatorId || pt.operator_id || pt.operator] : [])
    }));
  };

  // Clone Main Territory to TGE (Express)
  const handleCloneMainToTGE = () => {
    setTgeSuburbs([...mainTerritory]);
    toast({ title: 'Success', description: 'Copied Main Franchisee Territory mapping to TGE Express' });
  };

  // Google Places Autocomplete handling
  const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place.address_components || !place.geometry?.location) return;

    let suburb = '';
    let state = '';
    let postcode = '';
    let street = '';

    // Try to extract street details
    let streetNumber = '';
    let route = '';

    for (const comp of place.address_components) {
      if (comp.types.includes('street_number')) {
        streetNumber = comp.long_name;
      }
      if (comp.types.includes('route')) {
        route = comp.long_name;
      }
      if (comp.types.includes('locality')) {
        suburb = comp.long_name;
      }
      if (comp.types.includes('administrative_area_level_1')) {
        state = comp.short_name;
      }
      if (comp.types.includes('postal_code')) {
        postcode = comp.long_name;
      }
    }

    if (route) {
      street = streetNumber ? `${streetNumber} ${route}` : route;
    }

    // Name is the street if available, otherwise suburb
    const name = street ? `${street}, ${suburb}` : suburb;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    if (!suburb && !street) {
      toast({ variant: 'destructive', title: 'Invalid Location', description: 'Could not extract suburb or street information.' });
      return;
    }

    const newItem: SuburbItem = {
      suburbs: name,
      post_code: postcode || '',
      state: state || '',
      primary_op: [],
      next_day: false,
      parent_lpo_id: '',
      lat,
      lng
    };

    // Add to current tab
    if (activeTab === 'main') {
      if (mainTerritory.some(i => i.suburbs === newItem.suburbs && i.post_code === newItem.post_code)) return;
      setMainTerritory([...mainTerritory, newItem]);
    } else if (activeTab === 'star_track') {
      if (starTrackSuburbs.some(i => i.suburbs === newItem.suburbs && i.post_code === newItem.post_code)) return;
      setStarTrackSuburbs([...starTrackSuburbs, newItem]);
    } else if (activeTab === 'tge') {
      if (tgeSuburbs.some(i => i.suburbs === newItem.suburbs && i.post_code === newItem.post_code)) return;
      setTgeSuburbs([...tgeSuburbs, newItem]);
    } else if (activeTab === 'iron_mountain') {
      if (ironMountainSuburbs.some(i => i.suburbs === newItem.suburbs && i.post_code === newItem.post_code)) return;
      setIronMountainSuburbs([...ironMountainSuburbs, newItem]);
    } else if (activeTab === 'aus_post') {
      if (ausPostSuburbs.some(i => i.suburbs === newItem.suburbs && i.post_code === newItem.post_code)) return;
      setAusPostSuburbs([...ausPostSuburbs, newItem]);
    }

    setSearchQuery('');
    toast({ title: 'Added', description: `Successfully added ${name}` });
  };

  const handleRemoveSuburb = (index: number, type: string) => {
    if (type === 'main') {
      setMainTerritory(mainTerritory.filter((_, i) => i !== index));
    } else if (type === 'star_track') {
      setStarTrackSuburbs(starTrackSuburbs.filter((_, i) => i !== index));
    } else if (type === 'tge') {
      setTgeSuburbs(tgeSuburbs.filter((_, i) => i !== index));
    } else if (type === 'iron_mountain') {
      setIronMountainSuburbs(ironMountainSuburbs.filter((_, i) => i !== index));
    } else if (type === 'aus_post') {
      setAusPostSuburbs(ausPostSuburbs.filter((_, i) => i !== index));
    }
  };

  const handleUpdateSuburbOperators = (index: number, type: string, operatorIds: string[]) => {
    const updater = (list: SuburbItem[]) => {
      const updated = [...list];
      updated[index] = { ...updated[index], primary_op: operatorIds };
      return updated;
    };
    if (type === 'main') setMainTerritory(updater(mainTerritory));
    else if (type === 'star_track') setStarTrackSuburbs(updater(starTrackSuburbs));
    else if (type === 'tge') setTgeSuburbs(updater(tgeSuburbs));
    else if (type === 'iron_mountain') setIronMountainSuburbs(updater(ironMountainSuburbs));
    else if (type === 'aus_post') setAusPostSuburbs(updater(ausPostSuburbs));
  };

  const handleUpdateLPOParent = (index: number, parentId: string) => {
    const updated = [...ausPostSuburbs];
    updated[index] = { ...updated[index], parent_lpo_id: parentId };
    setAusPostSuburbs(updated);
  };

  const handleUpdateNextDay = (index: number, type: string, nextDay: boolean) => {
    const updater = (list: SuburbItem[]) => {
      const updated = [...list];
      updated[index] = { ...updated[index], next_day: nextDay };
      return updated;
    };
    if (type === 'main') setMainTerritory(updater(mainTerritory));
    else if (type === 'star_track') setStarTrackSuburbs(updater(starTrackSuburbs));
    else if (type === 'tge') setTgeSuburbs(updater(tgeSuburbs));
    else if (type === 'iron_mountain') setIronMountainSuburbs(updater(ironMountainSuburbs));
    else if (type === 'aus_post') setAusPostSuburbs(updater(ausPostSuburbs));
  };

  // Add Depot Lodgement point
  const handleAddDepot = (isExpress: boolean) => {
    if (!selectedDepotToAdd) return;
    const depotInfo = depots.find(d => d.id === selectedDepotToAdd);
    if (!depotInfo) return;

    const newItem: LodgementPoint = {
      depotId: depotInfo.internalId || depotInfo.id,
      name: depotInfo.name || '',
      suburb: depotInfo.suburb || '',
      postcode: depotInfo.postCode || '',
      state: depotInfo.state || '',
      operators: []
    };

    if (isExpress) {
      if (expressLodgement.some(d => d.depotId === newItem.depotId)) return;
      setExpressLodgement([...expressLodgement, newItem]);
    } else {
      if (starTrackLodgement.some(d => d.depotId === newItem.depotId)) return;
      setStarTrackLodgement([...starTrackLodgement, newItem]);
    }
    setSelectedDepotToAdd('');
    toast({ title: 'Depot Added', description: `Successfully added lodgement point: ${newItem.name}` });
  };

  const handleRemoveDepot = (index: number, isExpress: boolean) => {
    if (isExpress) {
      setExpressLodgement(expressLodgement.filter((_, i) => i !== index));
    } else {
      setStarTrackLodgement(starTrackLodgement.filter((_, i) => i !== index));
    }
  };

  const handleUpdateDepotOperators = (index: number, isExpress: boolean, operatorIds: string[]) => {
    if (isExpress) {
      const updated = [...expressLodgement];
      updated[index] = { ...updated[index], operators: operatorIds, operatorId: operatorIds[0] || '' };
      setExpressLodgement(updated);
    } else {
      const updated = [...starTrackLodgement];
      updated[index] = { ...updated[index], operators: operatorIds, operatorId: operatorIds[0] || '' };
      setStarTrackLodgement(updated);
    }
  };

  // Save all franchisee modifications
  const handleSave = async () => {
    if (!selectedFranchisee) return;
    setSaving(true);
    try {
      const docRef = doc(firestore, 'franchisees', selectedFranchisee.internalId);
      
      const payload: any = {
        territoryJson: mainTerritory.map(item => ({
          ...item,
          primary_op: item.primary_op
        })),
        starTrackSuburbsJson: starTrackSuburbs.map(item => ({
          ...item,
          primary_op: item.primary_op
        })),
        tgeSuburbsJSON: tgeSuburbs.map(item => ({
          ...item,
          primary_op: item.primary_op
        })),
        ironMountainSuburbsJson: ironMountainSuburbs.map(item => ({
          ...item,
          primary_op: item.primary_op
        })),
        ausPostSuburbsJson: ausPostSuburbs.map(item => ({
          ...item,
          primary_op: item.primary_op
        })),
        mpExpressLodgementPoints: expressLodgement.map(pt => ({
          depotId: pt.depotId,
          name: pt.name,
          suburb: pt.suburb,
          postcode: pt.postcode,
          state: pt.state,
          operators: pt.operators,
          operatorId: pt.operators[0] || ''
        })),
        starTrackLodgementPoints: starTrackLodgement.map(pt => ({
          depotId: pt.depotId,
          name: pt.name,
          suburb: pt.suburb,
          postcode: pt.postcode,
          state: pt.state,
          operators: pt.operators,
          operatorId: pt.operators[0] || ''
        })),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(docRef, payload);
      
      toast({ title: 'Success', description: 'Franchisee suburb mapping and lodgement points saved successfully!' });
    } catch (err) {
      console.error('Failed to save franchisee mappings:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save franchisee changes to Firestore' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 flex flex-col h-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="w-full sm:w-80">
          <label className="text-sm font-medium text-slate-700 block mb-1">Select Franchisee</label>
          <Select value={selectedFranchiseeId} onValueChange={setSelectedFranchiseeId}>
            <SelectTrigger className="w-full bg-white border border-slate-300">
              <SelectValue placeholder="Choose a franchisee..." />
            </SelectTrigger>
            <SelectContent>
              {franchisees.map(f => (
                <SelectItem key={f.internalId} value={f.internalId}>
                  {f.name || f.internalId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedFranchisee && (
          <Button onClick={handleSave} disabled={saving} className="bg-[#095c7b] hover:bg-[#07475d] text-white">
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        )}
      </div>

      {!selectedFranchisee ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 border-2 border-dashed border-slate-200 rounded-xl">
          <MapPin className="w-12 h-12 mb-2 text-slate-300" />
          <p className="text-lg font-medium">No Franchisee Selected</p>
          <p className="text-sm text-slate-400">Select a franchisee from the dropdown above to manage mappings.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Suburb Mapping / Autocomplete Section */}
          {activeTab !== 'lodgements' && (
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800">Add Street or Suburb mapping</CardTitle>
                <CardDescription>Search using Google Autocomplete and add it to the active mapping tab below.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                    options={{ componentRestrictions: { country: 'au' } }}
                  >
                    <div className="relative">
                      <Input
                        placeholder="Search for street address or suburb..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full"
                      />
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    </div>
                  </Autocomplete>
                ) : (
                  <div className="h-10 bg-slate-100 animate-pulse rounded" />
                )}
              </CardContent>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-slate-100 p-1 rounded-lg">
              <TabsTrigger value="main">Main Territory</TabsTrigger>
              <TabsTrigger value="star_track">Premium (StarTrack)</TabsTrigger>
              <TabsTrigger value="tge">Express (TGE)</TabsTrigger>
              <TabsTrigger value="iron_mountain">Iron Mountain</TabsTrigger>
              <TabsTrigger value="aus_post">LPO Suburbs</TabsTrigger>
              <TabsTrigger value="lodgements">Lodgement Points</TabsTrigger>
            </TabsList>

            {/* Main Franchisee Territory Tab */}
            <TabsContent value="main" className="mt-4">
              {renderSuburbTable(mainTerritory, 'main')}
            </TabsContent>

            {/* Premium / StarTrack Tab */}
            <TabsContent value="star_track" className="mt-4">
              {renderSuburbTable(starTrackSuburbs, 'star_track')}
            </TabsContent>

            {/* Express / TGE Tab */}
            <TabsContent value="tge" className="mt-4">
              <div className="mb-4 flex justify-between items-center bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 text-sm">
                  <Info className="w-4 h-4" />
                  <span>Clone/Copy territory map from main franchisee territory if not yet populated.</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleCloneMainToTGE} className="border-amber-300 text-amber-900 hover:bg-amber-100 gap-1">
                  <Copy className="w-3.5 h-3.5" /> Clone Main Territory
                </Button>
              </div>
              {renderSuburbTable(tgeSuburbs, 'tge')}
            </TabsContent>

            {/* Iron Mountain Tab */}
            <TabsContent value="iron_mountain" className="mt-4">
              {renderSuburbTable(ironMountainSuburbs, 'iron_mountain')}
            </TabsContent>

            {/* LPO Tab */}
            <TabsContent value="aus_post" className="mt-4">
              {renderSuburbTable(ausPostSuburbs, 'aus_post')}
            </TabsContent>

            {/* Lodgement Points Tab */}
            <TabsContent value="lodgements" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Express Lodgement */}
                <Card className="border border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Express Lodgement Depots (TGE)</CardTitle>
                    <CardDescription>Select depots where Express products are lodged and which operators service them.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderDepotSelector(true)}
                    {renderDepotTable(expressLodgement, true)}
                  </CardContent>
                </Card>

                {/* Premium Lodgement */}
                <Card className="border border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Premium Lodgement Depots (StarTrack)</CardTitle>
                    <CardDescription>Select depots where Premium products are lodged and which operators service them.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderDepotSelector(false)}
                    {renderDepotTable(starTrackLodgement, false)}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );

  // Suburb mapping rendering helper
  function renderSuburbTable(list: SuburbItem[], type: string) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-1/3">Street / Suburb</TableHead>
                <TableHead>Postcode</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Operators</TableHead>
                {type === 'aus_post' && <TableHead>LPO Parent</TableHead>}
                <TableHead className="text-center">Next Day</TableHead>
                <TableHead className="w-[80px] text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={type === 'aus_post' ? 7 : 6} className="text-center py-8 text-slate-400">
                    No mapping items added. Use the input box above to search and add.
                  </TableCell>
                </TableRow>
              ) : (
                list.map((item, index) => (
                  <TableRow key={`${item.suburbs}-${item.post_code}-${index}`}>
                    <TableCell className="font-medium text-slate-700">{item.suburbs}</TableCell>
                    <TableCell>{item.post_code}</TableCell>
                    <TableCell className="uppercase">{item.state}</TableCell>
                    <TableCell>
                      {renderOperatorPopover(item.primary_op, (selectedIds) => handleUpdateSuburbOperators(index, type, selectedIds))}
                    </TableCell>
                    {type === 'aus_post' && (
                      <TableCell>
                        {linkedLPOs.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No linked LPO parents found</span>
                        ) : (
                          <Select
                            value={item.parent_lpo_id || 'none'}
                            onValueChange={(val) => handleUpdateLPOParent(index, val === 'none' ? '' : val)}
                          >
                            <SelectTrigger className="w-48 bg-white border border-slate-200 text-xs">
                              <SelectValue placeholder="Select Parent..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {linkedLPOs.map(lpo => (
                                <SelectItem key={lpo.id} value={lpo.id} className="text-xs">
                                  {lpo.companyName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Checkbox
                        checked={!!item.next_day}
                        onCheckedChange={(checked) => handleUpdateNextDay(index, type, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveSuburb(index, type)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  // Operator popover picker
  function renderOperatorPopover(selectedIds: string[], onChange: (ids: string[]) => void) {
    const selectedOps = operators.filter(o => selectedIds.includes(o.internalId));
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-56 justify-start text-left bg-white font-normal border-slate-200">
            {selectedOps.length === 0 ? (
              <span className="text-slate-400 text-xs">Select Operators...</span>
            ) : (
              <div className="flex flex-wrap gap-1 max-w-[200px] overflow-hidden truncate">
                {selectedOps.map(op => (
                  <Badge key={op.internalId} variant="secondary" className="text-[10px] py-0 px-1 bg-slate-100">
                    {op.givenNames} {op.surname}
                  </Badge>
                ))}
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-white shadow-md border border-slate-200" align="start">
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {operators.length === 0 ? (
              <div className="p-2 text-xs text-slate-400 text-center">No operators available</div>
            ) : (
              operators.map(op => {
                const isSelected = selectedIds.includes(op.internalId);
                return (
                  <div
                    key={op.internalId}
                    className="flex items-center space-x-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs"
                    onClick={() => {
                      const newIds = isSelected
                        ? selectedIds.filter(id => id !== op.internalId)
                        : [...selectedIds, op.internalId];
                      onChange(newIds);
                    }}
                  >
                    <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center ${isSelected ? 'bg-[#095c7b] border-[#095c7b] text-white' : 'border-slate-300'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span>{op.givenNames} {op.surname}</span>
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Depot Selector helper
  function renderDepotSelector(isExpress: boolean) {
    return (
      <div className="flex gap-2 items-center">
        <Select value={selectedDepotToAdd} onValueChange={setSelectedDepotToAdd}>
          <SelectTrigger className="flex-1 bg-white border border-slate-200">
            <SelectValue placeholder="Select a depot to add..." />
          </SelectTrigger>
          <SelectContent>
            {depots.map(d => (
              <SelectItem key={d.id} value={d.id}>
                {d.name || d.id} ({d.suburb || 'No Suburb'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => handleAddDepot(isExpress)} className="bg-[#095c7b] hover:bg-[#07475d] text-white">
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>
    );
  }

  // Depot Table rendering helper
  function renderDepotTable(list: LodgementPoint[], isExpress: boolean) {
    return (
      <Table className="border border-slate-100 rounded-lg overflow-hidden">
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Depot Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Operators Lodging</TableHead>
            <TableHead className="w-[60px] text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                No depots added yet.
              </TableCell>
            </TableRow>
          ) : (
            list.map((pt, index) => (
              <TableRow key={`${pt.depotId}-${index}`}>
                <TableCell className="font-semibold text-slate-700 text-xs">{pt.name}</TableCell>
                <TableCell className="text-xs text-slate-500">
                  {pt.suburb}, {pt.state} {pt.postcode}
                </TableCell>
                <TableCell>
                  {renderOperatorPopover(pt.operators, (selectedIds) => handleUpdateDepotOperators(index, isExpress, selectedIds))}
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveDepot(index, isExpress)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  }
}
