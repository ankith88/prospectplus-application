
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { SavedRoute, Lead, Address, VisitNote, LeadStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Route as RouteIcon, Calendar, MapPin, Trash2, Satellite, ExternalLink, CheckSquare, Pencil, X, History, Star, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { getAllUserRoutes, deleteUserRoute, getCompaniesFromFirebase, updateUserRoute, getLeadsFromFirebase, getVisitNotes } from '@/services/firebase';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
  PolygonF,
  RectangleF,
} from '@react-google-maps/api';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: -33.8688,
  lng: 151.2093,
};

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'drawing', 'geometry', 'visualization'];

const formatAddressDisplay = (address?: Address) => {
    if (!address) return '';
    return [address.address1, address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
};

export default function ProspectingAreasPage() {
  const [prospectingAreas, setProspectingAreas] = useState<SavedRoute[]>([]);
  const [allMapItems, setAllMapData] = useState<Lead[]>([]);
  const [allVisitNotes, setAllVisitNotes] = useState<VisitNote[]>([]);
  const [nearbyMapItems, setNearbyMapItems] = useState<(Lead & { distance: number })[]>([]);
  const [nearbyVisitNotes, setNearbyVisitNotes] = useState<(VisitNote & { distance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<SavedRoute | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<SavedRoute | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite'>('roadmap');
  const [selectedGroup, setSelectedGroup] = useState<any[] | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [searchNearbyQuery, setSearchNearbyQuery] = useState('');
  const [isApproving, setIsApproving] = useState<string | null>(null);

  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const hasAccess = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Franchisee'].includes(userProfile.role);
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen Admin';

  const fetchProspectingAreas = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const [allRoutes, companies, leads, visitNotes] = await Promise.all([
        getAllUserRoutes(),
        getCompaniesFromFirebase(),
        getLeadsFromFirebase({ summary: true }),
        getVisitNotes()
      ]);
      
      const areas = allRoutes.filter(route => route.isProspectingArea);
      
      const deduplicatedMap = new Map<string, Lead>();
      [...companies, ...leads].forEach(item => {
          if (!deduplicatedMap.has(item.id)) {
              deduplicatedMap.set(item.id, item);
          } else {
              const existing = deduplicatedMap.get(item.id)!;
              if (item.status === 'Won' && existing.status !== 'Won') {
                  deduplicatedMap.set(item.id, item);
              }
          }
      });

      setAllMapData(Array.from(deduplicatedMap.values()));
      setProspectingAreas(areas);
      setAllVisitNotes(visitNotes);
    } catch (error) {
      console.error("Failed to fetch prospecting areas:", error);
      toast({ variant: "destructive", title: 'Error', description: 'Could not fetch prospecting areas.' });
    } finally {
      setLoading(false);
    }
  }, [userProfile, toast]);

  useEffect(() => {
    if (userProfile && hasAccess) {
        fetchProspectingAreas();
    }
  }, [userProfile, hasAccess, fetchProspectingAreas]);
  
  const mapCenter = useMemo(() => {
    if (!isLoaded || !selectedArea) return defaultCenter;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    (selectedArea.streets || []).forEach(street => {
        const lat = Number(street.latitude);
        const lng = Number(street.longitude);
        if(!isNaN(lat) && !isNaN(lng)) {
            bounds.extend({ lat, lng });
            hasPoints = true;
        }
    });

    (selectedArea.leads || []).forEach(lead => {
      const lat = Number(lead.latitude);
      const lng = Number(lead.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        bounds.extend({ lat, lng });
        hasPoints = true;
      }
    });

    if (hasPoints) {
      return bounds.getCenter().toJSON();
    }
    
    return defaultCenter;
  }, [selectedArea, isLoaded]);

  useEffect(() => {
    if (!selectedArea || !map || !window.google) {
        setNearbyMapItems([]);
        setNearbyVisitNotes([]);
        return;
    }
    
    const bounds = new window.google.maps.LatLngBounds();
    let hasBounds = false;

    if (selectedArea.shape?.type === 'polygon' && selectedArea.shape.paths?.[0]?.length) {
        selectedArea.shape.paths[0].forEach(path => {
            const lat = Number(path.lat);
            const lng = Number(path.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                bounds.extend({ lat, lng });
                hasBounds = true;
            }
        });
    } else if (selectedArea.shape?.type === 'rectangle' && selectedArea.shape.bounds) {
        const rectBounds = new window.google.maps.LatLngBounds(selectedArea.shape.bounds);
        bounds.union(rectBounds);
        hasBounds = true;
    }

    if (selectedArea.streets && selectedArea.streets.length > 0) {
        selectedArea.streets.forEach(street => {
            const lat = Number(street.latitude);
            const lng = Number(street.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                bounds.extend({ lat, lng });
                hasBounds = true;
            }
        });
    }

    if (selectedArea.leads && selectedArea.leads.length > 0) {
        selectedArea.leads.forEach(lead => {
            const lat = Number(lead.latitude);
            const lng = Number(lead.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                bounds.extend({ lat, lng });
                hasBounds = true;
            }
        });
    }

    let areaCenter: google.maps.LatLng | null = null;

    if (hasBounds) {
        map.fitBounds(bounds);
        areaCenter = bounds.getCenter();
    } else if (selectedArea.leads?.length === 1) {
        const lat = Number(selectedArea.leads[0].latitude);
        const lng = Number(selectedArea.leads[0].longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
            const center = { lat, lng };
            map.panTo(center);
            map.setZoom(15);
            areaCenter = new window.google.maps.LatLng(center.lat, center.lng);
        }
    } else if (selectedArea.streets?.length === 1) {
        const lat = Number(selectedArea.streets[0].latitude);
        const lng = Number(selectedArea.streets[0].longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
            const center = { lat, lng };
            map.panTo(center);
            map.setZoom(15);
            areaCenter = new window.google.maps.LatLng(center.lat, center.lng);
        }
    }
    
    if (areaCenter) {
        const nearbyWithDistance = allMapItems
            .map(item => {
                const lat = Number(item.latitude);
                const lng = Number(item.longitude);
                if (isNaN(lat) || isNaN(lng)) return null;
                const itemLatLng = new window.google.maps.LatLng(lat, lng);
                const distance = window.google.maps.geometry.spherical.computeDistanceBetween(areaCenter!, itemLatLng);
                if (distance <= 5000) {
                    return { ...item, distance };
                }
                return null;
            })
            .filter((c): c is Lead & { distance: number } => c !== null);
        
        nearbyWithDistance.sort((a, b) => a.distance - b.distance);
        setNearbyMapItems(nearbyWithDistance);

        const notesNearby = allVisitNotes
            .map(note => {
                const lat = note.address?.lat;
                const lng = note.address?.lng;
                if (!lat || !lng) return null;
                const noteLatLng = new window.google.maps.LatLng(lat, lng);
                const distance = window.google.maps.geometry.spherical.computeDistanceBetween(areaCenter!, noteLatLng);
                if (distance <= 5000) {
                    return { ...note, distance };
                }
                return null;
            })
            .filter((n): n is VisitNote & { distance: number } => n !== null);
        
        notesNearby.sort((a, b) => a.distance - b.distance);
        setNearbyVisitNotes(notesNearby);
    } else {
        setNearbyMapItems([]);
        setNearbyVisitNotes([]);
    }

  }, [selectedArea, map, allMapItems, allVisitNotes]);

  const filteredNearbyItems = useMemo(() => {
    let items = nearbyMapItems;
    if (searchNearbyQuery) {
      items = items.filter(item =>
        item.companyName.toLowerCase().includes(searchNearbyQuery.toLowerCase())
      );
    }
    return items;
  }, [nearbyMapItems, searchNearbyQuery]);

  const visitedItemsInArea = useMemo(() => {
    let items = nearbyVisitNotes;
    if (searchNearbyQuery) {
      items = items.filter(note =>
        (note.companyName || '').toLowerCase().includes(searchNearbyQuery.toLowerCase())
      );
    }
    
    return items.map(note => {
        const lead = note.leadId ? allMapItems.find(l => l.id === note.leadId) : null;
        return {
            ...note,
            leadStatus: lead?.status || 'New',
            latitude: note.address?.lat,
            longitude: note.address?.lng,
            companyName: note.companyName || 'Unknown Company',
        };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [nearbyVisitNotes, searchNearbyQuery, allMapItems]);

  const signedCustomersInArea = useMemo(() => {
    return filteredNearbyItems.filter(item => item.status === 'Won' || item.status === 'Lost Customer');
  }, [filteredNearbyItems]);

  const groupedPins = useMemo(() => {
    const groups = new Map<string, any[]>();
    
    // Group visited items
    visitedItemsInArea.forEach(item => {
        const key = `${item.latitude},${item.longitude}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push({ ...item, type: 'visited' });
    });

    // Group signed customers
    signedCustomersInArea.forEach(item => {
        if (visitedItemsInArea.some(v => v.leadId === item.id)) return;
        const key = `${item.latitude},${item.longitude}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push({ ...item, type: 'signed' });
    });

    return Array.from(groups.values());
  }, [visitedItemsInArea, signedCustomersInArea]);


  const handleDeleteArea = async () => {
      if (!areaToDelete || !areaToDelete.userId) return;

      try {
          await deleteUserRoute(areaToDelete.userId, areaToDelete.id!);
          setProspectingAreas(prev => prev.filter(area => area.id !== areaToDelete.id));
          if (selectedArea?.id === areaToDelete.id) {
              setSelectedArea(null);
          }
          toast({ title: "Success", description: "Prospecting area deleted." });
      } catch (error) {
          console.error("Failed to delete area:", error);
          toast({ variant: "destructive", title: 'Error', description: "Could not delete the area." });
      } finally {
          setAreaToDelete(null);
      }
  };
  
    const handleMarkAsComplete = async (area: SavedRoute) => {
        if (!area.userId || !area.id) {
            toast({ variant: 'destructive', title: 'Error', description: 'Area information is missing.' });
            return;
        }
        try {
            await updateUserRoute(area.userId, area.id, { status: 'Completed' });
            setProspectingAreas(prevAreas => 
                prevAreas.map(a => a.id === area.id ? { ...a, status: 'Completed' } : a)
            );
            toast({ title: 'Success', description: `"${area.name}" marked as complete.` });
        } catch (error) {
            console.error("Failed to mark area as complete:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update the area status.' });
        }
    };

    const handleApproveArea = async (area: SavedRoute) => {
        if (!area.userId || !area.id) return;
        setIsApproving(area.id);
        try {
            await updateUserRoute(area.userId, area.id, { status: 'Approved' });
            setProspectingAreas(prev => prev.map(a => a.id === area.id ? { ...a, status: 'Approved' } : a));
            toast({ title: 'Area Approved', description: `"${area.name}" is now visible to the entire team.` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Approval Failed' });
        } finally {
            setIsApproving(null);
        }
    };

  const handleLoadArea = useCallback((area: SavedRoute) => {
    setSelectedArea(area);
    setSearchNearbyQuery(''); // Reset search when loading new area
  }, []);

  const { pendingAreas, approvedAreas } = useMemo(() => {
      const pending = prospectingAreas.filter(a => a.status === 'Pending Approval');
      const approved = prospectingAreas.filter(a => a.status !== 'Pending Approval');
      return { pendingAreas: pending, approvedAreas: approved };
  }, [prospectingAreas]);

  // For regular users, only show approved areas or their own pending areas
  const visibleApprovedAreas = useMemo(() => {
      if (!approvedAreas) return [];
      // Show Approved, Completed, Active, or areas with no explicit status (which default to Active)
      return approvedAreas.filter(a => 
        a.status === 'Approved' || 
        a.status === 'Completed' || 
        a.status === 'Active' || 
        !a.status
      );
  }, [approvedAreas]);

  const myPendingAreas = useMemo(() => {
      if (!pendingAreas) return [];
      if (isAdmin) return pendingAreas;
      return pendingAreas.filter(a => a.userId === userProfile?.uid);
  }, [pendingAreas, isAdmin, userProfile]);


  if (loading || authLoading || !isLoaded) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }
   if (loadError) return <div>Error loading maps</div>;

  return (
    <>
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Prospecting Areas</h1>
        <p className="text-muted-foreground">Review and manage designated prospecting areas across the team.</p>
      </header>

      {selectedArea && (
        <>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <CardTitle>{selectedArea.name}</CardTitle>
                        <Badge variant={selectedArea.status === 'Pending Approval' ? 'destructive' : 'default'}>{selectedArea.status || 'Active'}</Badge>
                    </div>
                    <CardDescription>
                        Created on {format(new Date(selectedArea.createdAt), 'PP')} by {selectedArea.userName}
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    {isAdmin && selectedArea.status === 'Pending Approval' && (
                        <Button onClick={() => handleApproveArea(selectedArea)} disabled={isApproving === selectedArea.id} className="bg-green-600 hover:bg-green-700">
                            {isApproving === selectedArea.id ? <Loader /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Approve Area</>}
                        </Button>
                    )}
                    <Button
                        onClick={() => setMapTypeId(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
                        variant="outline"
                        size="sm"
                    >
                        <Satellite className="mr-2 h-4 w-4" />
                        {mapTypeId === 'roadmap' ? 'Satellite' : 'Roadmap'}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedArea(null)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <div style={containerStyle}>
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={mapCenter}
                    zoom={14}
                    onLoad={setMap}
                    mapTypeId={mapTypeId}
                    onClick={() => setSelectedGroup(null)}
                >
                  {selectedArea.shape?.type === 'polygon' && selectedArea.shape.paths && (
                    <PolygonF
                      paths={selectedArea.shape.paths}
                      options={{ fillColor: '#4285F4', fillOpacity: 0.2, strokeColor: '#4285F4', strokeWeight: 2 }}
                    />
                  )}
                  {selectedArea.shape?.type === 'rectangle' && selectedArea.shape.bounds && (
                    <RectangleF
                      bounds={selectedArea.shape.bounds}
                      options={{ fillColor: '#4285F4', fillOpacity: 0.2, strokeColor: '#4285F4', strokeWeight: 2 }}
                    />
                  )}
                  
                  {/* Street Markers */}
                  {(selectedArea.streets || []).map(street => {
                      const lat = Number(street.latitude);
                      const lng = Number(street.longitude);
                      if (isNaN(lat) || isNaN(lng)) return null;
                      return (
                        <MarkerF
                            key={`street-${street.place_id}`}
                            position={{ lat, lng }}
                            title={street.description}
                            icon={{ url: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png" }}
                        />
                      );
                  })}

                  {/* Grouped Markers */}
                  {groupedPins.map((group, idx) => {
                        const first = group[0];
                        const lat = Number(first.latitude);
                        const lng = Number(first.longitude);
                        if (isNaN(lat) || isNaN(lng)) return null;
                        
                        let iconUrl = "http://maps.google.com/mapfiles/ms/icons/ltblue-dot.png";
                        if (group.some(i => i.type === 'signed')) iconUrl = "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
                        if (group.some(i => i.type === 'visited')) iconUrl = "http://maps.google.com/mapfiles/ms/icons/orange-dot.png";
                        if (group.some(i => i.id === hoveredItemId)) iconUrl = "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";

                        return (
                            <MarkerF
                                key={`group-marker-${idx}`}
                                position={{ lat, lng }}
                                title={`${group.length} records`}
                                label={group.length > 1 ? { text: group.length.toString(), color: 'white', fontWeight: 'bold' } : undefined}
                                icon={{ url: iconUrl }}
                                onClick={() => setSelectedGroup(group)}
                            />
                        )
                    })}

                    {selectedGroup && (
                        <InfoWindowF
                            position={{ lat: Number(selectedGroup[0].latitude!), lng: Number(selectedGroup[0].longitude!) }}
                            onCloseClick={() => setSelectedGroup(null)}
                        >
                            <div className="p-2 max-w-md">
                                {selectedGroup.length === 1 ? (
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">{selectedGroup[0].companyName}</h3>
                                        <div className="flex items-center gap-2">
                                            <LeadStatusBadge status={selectedGroup[0].status || selectedGroup[0].leadStatus} />
                                            {selectedGroup[0].type === 'visited' && <Badge variant="secondary" className="bg-orange-100 text-orange-800">Visited</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{formatAddressDisplay(selectedGroup[0].address as Address)}</p>
                                        <Button 
                                            size="sm" 
                                            onClick={() => window.open((selectedGroup[0].status === 'Won' || selectedGroup[0].leadStatus === 'Won') ? `/companies/${selectedGroup[0].leadId || selectedGroup[0].id}` : `/leads/${selectedGroup[0].leadId || selectedGroup[0].id}`, '_blank')}
                                            disabled={!allMapItems.some(l => l.id === (selectedGroup[0].leadId || selectedGroup[0].id))}
                                        >
                                            <ExternalLink className="mr-2 h-4 w-4" /> View Profile
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <h3 className="font-bold border-b pb-2">{selectedGroup.length} Records at this Location</h3>
                                        <ScrollArea className="h-64">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Company</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead className="text-right">Action</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedGroup.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="font-medium p-2 text-xs">
                                                                {item.companyName}
                                                            </TableCell>
                                                            <TableCell className="p-2">
                                                                <LeadStatusBadge status={item.status || item.leadStatus} />
                                                            </TableCell>
                                                            <TableCell className="text-right p-2">
                                                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => window.open((item.status === 'Won' || item.leadStatus === 'Won') ? `/companies/${item.leadId || item.id}` : `/leads/${item.leadId || item.id}`, '_blank')}>
                                                                    View
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </div>
                                )}
                            </div>
                        </InfoWindowF>
                    )}
                </GoogleMap>
            </div>
            
            <div className="mt-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative flex-grow max-w-md">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search company names in this area..."
                            className="pl-8"
                            value={searchNearbyQuery}
                            onChange={(e) => setSearchNearbyQuery(e.target.value)}
                        />
                        {searchNearbyQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1 h-8 w-8"
                                onClick={() => setSearchNearbyQuery('')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold">Contents of this Area</h4>
                            <ScrollArea className="h-32 border rounded-md mt-2">
                                <div className="p-2 text-sm">
                                    {selectedArea.leads && selectedArea.leads.length > 0 && (
                                        <div>
                                            <p className="font-medium">Designated Leads ({selectedArea.leads.length}):</p>
                                            <ul className="list-disc list-inside">
                                                {selectedArea.leads.map(l => <li key={l.id}>{l.companyName}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {selectedArea.streets && selectedArea.streets.length > 0 && (
                                        <div className="mt-2">
                                            <p className="font-medium">Streets/Buildings ({selectedArea.streets.length}):</p>
                                            <ul className="list-disc list-inside">
                                                {selectedArea.streets.map(s => <li key={s.place_id}>{s.description}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {(!selectedArea.leads || selectedArea.leads.length === 0) && (!selectedArea.streets || selectedArea.streets.length === 0) && (
                                        <p className="text-muted-foreground p-4 text-center">This area is empty.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                        {selectedArea.imageUrls && selectedArea.imageUrls.length > 0 && (
                            <div>
                                <h4 className="font-semibold">Evidence Photos</h4>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {selectedArea.imageUrls.map((url, idx) => (
                                        <div key={idx} className="relative aspect-video rounded border overflow-hidden cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                            <img src={url} alt="Evidence" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {selectedArea.notes && (
                        <div>
                            <h4 className="font-semibold">Notes</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 mt-2 border rounded-md bg-secondary/50 h-32 overflow-y-auto">{selectedArea.notes}</p>
                        </div>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5 text-orange-500" />
                            <CardTitle>Recent Visits in Area ({visitedItemsInArea.length})</CardTitle>
                        </div>
                        <CardDescription>History of all field sales activity within a 5km radius of the area center.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-96 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company Name</TableHead>
                                        <TableHead>Visited When</TableHead>
                                        <TableHead>Visited By</TableHead>
                                        <TableHead>Lead Status</TableHead>
                                        <TableHead>Visit Outcome</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visitedItemsInArea.length > 0 ? (
                                        visitedItemsInArea.map(item => (
                                            <TableRow key={`visited-${item.id}`}>
                                                <TableCell className="font-medium">
                                                    {item.leadId ? (
                                                        <Button asChild variant="link" className="p-0 h-auto">
                                                            <Link href={item.leadStatus === 'Won' || item.leadStatus === 'Lost Customer' ? `/companies/${item.leadId}` : `/leads/${item.leadId}`} target="_blank">
                                                                {item.companyName}
                                                            </Link>
                                                        </Button>
                                                    ) : (
                                                        <span className="font-medium">{item.companyName}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{format(new Date(item.createdAt), 'PPpp')}</TableCell>
                                                <TableCell>{item.capturedBy}</TableCell>
                                                <TableCell><LeadStatusBadge status={item.leadStatus as any} /></TableCell>
                                                <TableCell>{item.outcome?.type || 'N/A'}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No leads in this area match the search or have been visited.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-green-500" />
                            <CardTitle>Nearby Signed Customers ({signedCustomersInArea.length})</CardTitle>
                        </div>
                        <CardDescription>Signed customer records within a 5km radius of the area center.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-96 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company Name</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>Franchisee</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {signedCustomersInArea.length > 0 ? (
                                        signedCustomersInArea.map(item => (
                                            <TableRow key={`nearby-signed-${item.id}`}>
                                                <TableCell className="font-medium">{item.companyName}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{formatAddressDisplay(item.address as Address)}</TableCell>
                                                <TableCell>{item.franchisee || 'N/A'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild size="sm" variant="outline">
                                                        <Link href={`/companies/${item.id}`} target="_blank">View Profile</Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No signed customers match the search in this radius.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
          </CardContent>
        </Card>
      </>
      )}

      <Tabs defaultValue="approved">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="approved">Approved Areas ({visibleApprovedAreas.length})</TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                  Pending Approval ({myPendingAreas.length})
                  {myPendingAreas.length > 0 && <span className="h-2 w-2 rounded-full bg-red-500" />}
              </TabsTrigger>
          </TabsList>
          
          <TabsContent value="approved">
            <Card>
                <CardHeader>
                <CardTitle>Active Prospecting Areas</CardTitle>
                <CardDescription>
                    Designated areas approved for prospecting.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Area Name</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Contents</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {visibleApprovedAreas.length > 0 ? (
                        visibleApprovedAreas.map(area => (
                        <TableRow key={area.id} onClick={() => handleLoadArea(area)} className={cn("cursor-pointer hover:bg-muted/50", selectedArea?.id === area.id && 'bg-secondary')}>
                            <TableCell className="font-medium">{area.name}</TableCell>
                            <TableCell>
                            <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground"/>
                                    {format(new Date(area.createdAt), 'PP')}
                            </div>
                            </TableCell>
                            <TableCell>
                                {area.streets?.length || 0} streets / {area.leads?.length || 0} leads
                            </TableCell>
                            <TableCell>
                                <Badge variant={area.status === 'Completed' ? 'default' : 'outline'}>
                                    {area.status || 'Active'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    {userProfile && ['admin', 'Field Sales Admin', 'Lead Gen Admin'].includes(userProfile.role!) && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={(e) => { e.stopPropagation(); router.push(`/leads/map?editArea=${area.id}`) }}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); handleMarkAsComplete(area); }}
                                        disabled={area.status === 'Completed'}
                                    >
                                        <CheckSquare className="mr-2 h-4 w-4" />
                                        Complete
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleLoadArea(area)}}>
                                        <MapPin className="mr-2 h-4 w-4" /> View
                                    </Button>
                                    {userProfile && ['admin', 'Field Sales Admin'].includes(userProfile.role!) && (
                                        <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); setAreaToDelete(area)}}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No prospecting areas found. Create one from the Territory Map.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
                <CardHeader>
                <CardTitle>Pending Approval</CardTitle>
                <CardDescription>
                    {isAdmin ? "Review areas submitted by franchisees for approval." : "Areas you've submitted that are awaiting review."}
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Area Name</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Submitted At</TableHead>
                        <TableHead>Evidence</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {myPendingAreas.length > 0 ? (
                        myPendingAreas.map(area => (
                        <TableRow key={area.id} onClick={() => handleLoadArea(area)} className={cn("cursor-pointer hover:bg-muted/50", selectedArea?.id === area.id && 'bg-secondary')}>
                            <TableCell className="font-medium">{area.name}</TableCell>
                            <TableCell>{area.userName}</TableCell>
                            <TableCell>{format(new Date(area.createdAt), 'PP')}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1">
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    <span>{area.imageUrls?.length || 0} photos</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    {isAdmin && (
                                        <Button 
                                            variant="default" 
                                            size="sm" 
                                            className="bg-green-600 hover:bg-green-700" 
                                            onClick={(e) => { e.stopPropagation(); handleApproveArea(area); }}
                                            disabled={isApproving === area.id}
                                        >
                                            {isApproving === area.id ? <Loader /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                            Approve
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleLoadArea(area)}}>
                                        <MapPin className="mr-2 h-4 w-4" /> Review
                                    </Button>
                                    {(isAdmin || area.userId === userProfile?.uid) && (
                                        <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); setAreaToDelete(area)}}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No areas currently pending approval.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
    </div>
    
    <AlertDialog open={!!areaToDelete} onOpenChange={(open) => !open && setAreaToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the prospecting area "{areaToDelete?.name}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteArea} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
