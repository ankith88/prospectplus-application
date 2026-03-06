'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { SavedRoute, Lead, Address, VisitNote, LeadStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Route as RouteIcon, Calendar, MapPin, Trash2, Satellite, ExternalLink, CheckSquare, Pencil, X, History, Star, Search, CheckCircle2, AlertCircle, Image as ImageIcon, ClipboardCheck, ArrowRight, Flame, Target, Percent, Clock, Map as MapIcon, ChevronRight, Download } from 'lucide-react';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { getAllUserRoutes, deleteUserRoute, getCompaniesFromFirebase, updateUserRoute, getLeadsFromFirebase, getVisitNotes, saveUserRoute } from '@/services/firebase';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
  PolygonF,
  RectangleF,
  HeatmapLayerF,
  PolylineF,
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

const escapeCsvCell = (cellData: any) => {
    if (cellData === null || cellData === undefined) return '';
    const stringData = String(cellData);
    if (stringData.includes('"') || stringData.includes(',') || stringData.includes('\n')) {
        return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
};

export default function ProspectingAreasPage() {
  const [prospectingAreas, setProspectingAreas] = useState<SavedRoute[]>([]);
  const [allMapItems, setAllMapItems] = useState<Lead[]>([]);
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
  const [isFinalizing, setIsFinalizing] = useState<string | null>(null);
  const [isCreatingFollowup, setIsCreatingFollowup] = useState<string | null>(null);
  
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

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

      setAllMapItems(Array.from(deduplicatedMap.values()));
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
        const centerRef = areaCenter;
        const radiusInMeters = 5000;

        const nearbyWithDistance = allMapItems
            .map(item => {
                const lat = Number(item.latitude);
                const lng = Number(item.longitude);
                if (isNaN(lat) || isNaN(lng)) return null;
                const itemLatLng = new window.google.maps.LatLng(lat, lng);
                const distance = window.google.maps.geometry.spherical.computeDistanceBetween(centerRef, itemLatLng);
                if (distance <= radiusInMeters) {
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
                const distance = window.google.maps.geometry.spherical.computeDistanceBetween(centerRef, noteLatLng);
                if (distance <= radiusInMeters) {
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

  }, [selectedArea, map, allMapItems, allVisitNotes, isAdmin]);

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
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [nearbyVisitNotes, searchNearbyQuery, allMapItems]);

  const timelineItems = useMemo(() => {
      return [...visitedItemsInArea].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [visitedItemsInArea]);

  const timelineGroups = useMemo(() => {
      const groups: Record<string, typeof timelineItems> = {};
      timelineItems.forEach(item => {
          const dateKey = format(new Date(item.createdAt), 'yyyy-MM-dd');
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(item);
      });
      return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [timelineItems]);

  const timelinePath = useMemo(() => {
      return timelineItems.map(item => ({ lat: item.latitude!, lng: item.longitude! }));
  }, [timelineItems]);

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

  const heatmapData = useMemo(() => {
    if (!isLoaded || !showHeatmap || !nearbyVisitNotes.length || !window.google?.maps?.LatLng) return [];
    return nearbyVisitNotes.map(n => ({
        location: new window.google.maps.LatLng(n.address?.lat!, n.address?.lng!),
        weight: 1
    }));
  }, [isLoaded, nearbyVisitNotes, showHeatmap]);


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
          areaToDelete && setAreaToDelete(null);
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

    const handleFinalizeReview = async (area: SavedRoute) => {
        if (!area.userId || !area.id) return;
        setIsFinalizing(area.id);
        try {
            await updateUserRoute(area.userId, area.id, { status: 'Reviewed' });
            setProspectingAreas(prev => prev.map(a => a.id === area.id ? { ...a, status: 'Reviewed' } : a));
            toast({ title: 'Review Finalized', description: `"${area.name}" has been marked as reviewed.` });
            setSelectedArea(null);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Review Failed' });
        } finally {
            setIsFinalizing(null);
        }
    };

    const handleCreateFollowup = async (area: SavedRoute) => {
        if (!area.userId || !userProfile?.uid) return;
        setIsCreatingFollowup(area.id!);
        try {
            const newArea: Omit<SavedRoute, 'directions' | 'userName'> = {
                userId: area.userId,
                name: `${area.name} - Follow-up`,
                createdAt: new Date().toISOString(),
                leads: [], // Fresh start
                travelMode: area.travelMode,
                isProspectingArea: true,
                streets: area.streets || [],
                shape: area.shape,
                status: 'Approved', // Already approved once
                notes: `Follow-up prospecting for missed opportunities in ${area.name}. Original review completed by ${userProfile.displayName}.`,
            };

            await saveUserRoute(area.userId, newArea as any);
            toast({ title: 'Follow-up Created', description: `A new follow-up area has been assigned to ${area.userName}.` });
            fetchProspectingAreas();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Follow-up Failed' });
        } finally {
            setIsCreatingFollowup(null);
        }
    };

  const handleLoadArea = useCallback((area: SavedRoute) => {
    setSelectedArea(area);
    setSearchNearbyQuery(''); 
    setShowHeatmap(false);
    setShowTimeline(false);
  }, []);

  const handleExportPathAudit = () => {
      if (timelineItems.length === 0) {
          toast({ title: 'No Data', description: 'No visits to export.' });
          return;
      }
      const headers = ['Sequence', 'Date', 'Day', 'Time', 'Company', 'Captured By', 'Status', 'Outcome'];
      const rows = timelineItems.map((item, index) => {
          const d = new Date(item.createdAt);
          return [
              (index + 1).toString(),
              format(d, 'yyyy-MM-dd'),
              format(d, 'EEEE'),
              format(d, 'p'),
              item.companyName,
              item.capturedBy,
              item.leadStatus,
              item.outcome?.type || 'N/A'
          ];
      });

      const csvContent = [headers.join(','), ...rows.map(r => r.map(escapeCsvCell).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `path_audit_${selectedArea?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const { pendingAreas, activeAreas, completedAreas } = useMemo(() => {
      const pending = prospectingAreas.filter(a => a.status === 'Pending Approval');
      const completed = prospectingAreas.filter(a => a.status === 'Completed' || a.status === 'Reviewed');
      const active = prospectingAreas.filter(a => 
        a.status === 'Approved' || 
        a.status === 'Active' || 
        !a.status
      );
      return { pendingAreas: pending, activeAreas: active, completedAreas: completed };
  }, [prospectingAreas]);

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
        <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <CardTitle>{selectedArea.name}</CardTitle>
                        <Badge variant={
                            selectedArea.status === 'Pending Approval' ? 'destructive' : 
                            selectedArea.status === 'Reviewed' ? 'secondary' : 
                            selectedArea.status === 'Completed' ? 'default' : 'outline'
                        }>
                            {selectedArea.status || 'Active'}
                        </Badge>
                    </div>
                    <CardDescription>
                        Created on {format(new Date(selectedArea.createdAt), 'PP')} by {selectedArea.userName}
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    {isAdmin && (selectedArea.status === 'Completed' || selectedArea.status === 'Reviewed') && (
                        <>
                            <Button 
                                variant={showHeatmap ? 'secondary' : 'outline'} 
                                size="sm"
                                onClick={() => { 
                                    const nextValue = !showHeatmap;
                                    setShowHeatmap(nextValue); 
                                    if(nextValue) setShowTimeline(false); 
                                }}
                                className={cn(showHeatmap && "bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300")}
                            >
                                <Flame className={cn("mr-2 h-4 w-4", showHeatmap && "text-orange-600")} />
                                {showHeatmap ? 'Hide Coverage Map' : 'Show Coverage Map'}
                            </Button>
                            <Button 
                                variant={showTimeline ? 'secondary' : 'outline'} 
                                size="sm"
                                onClick={() => { 
                                    const nextValue = !showTimeline;
                                    setShowTimeline(nextValue); 
                                    if(nextValue) setShowHeatmap(false); 
                                }}
                                className={cn(showTimeline && "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300")}
                            >
                                <Clock className={cn("mr-2 h-4 w-4", showTimeline && "text-blue-600")} />
                                {showTimeline ? 'Hide Path Audit' : 'Timeline Review'}
                            </Button>
                        </>
                    )}

                    {isAdmin && selectedArea.status === 'Pending Approval' && (
                        <Button onClick={() => handleApproveArea(selectedArea)} disabled={isApproving === selectedArea.id} className="bg-green-600 hover:bg-green-700">
                            {isApproving === selectedArea.id ? <Loader /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Approve Area</>}
                        </Button>
                    )}
                    {isAdmin && selectedArea.status === 'Completed' && (
                        <>
                            <Button onClick={() => handleFinalizeReview(selectedArea)} disabled={isFinalizing === selectedArea.id} className="bg-blue-600 hover:bg-blue-700">
                                {isFinalizing === selectedArea.id ? <Loader /> : <><ClipboardCheck className="mr-2 h-4 w-4" /> Finalize Review</>}
                            </Button>
                            <Button onClick={() => handleCreateFollowup(selectedArea)} disabled={isCreatingFollowup === selectedArea.id} variant="outline">
                                {isCreatingFollowup === selectedArea.id ? <Loader /> : <><ArrowRight className="mr-2 h-4 w-4" /> Create Follow-up</>}
                            </Button>
                        </>
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
                  
                  {showHeatmap && heatmapData.length > 0 && (
                      <HeatmapLayerF
                        data={heatmapData}
                        options={{
                            radius: 40,
                            opacity: 0.6,
                        }}
                      />
                  )}

                  {showTimeline && (
                      <PolylineF
                        path={timelinePath}
                        options={{
                            strokeColor: "#2563eb",
                            strokeOpacity: 0.8,
                            strokeWeight: 3,
                            icons: [{
                                icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                                offset: '100%',
                                repeat: '100px'
                            }]
                        }}
                      />
                  )}

                  {/* Street Markers */}
                  {!showHeatmap && (selectedArea.streets || []).map(street => {
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
                  {!showHeatmap && groupedPins.map((group, idx) => {
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
                                label={showTimeline && group.some(i => i.type === 'visited') ? { text: (timelineItems.findIndex(t => t.id === group.find(i => i.type === 'visited')!.id) + 1).toString(), color: 'white', fontWeight: 'bold' } : group.length > 1 ? { text: group.length.toString(), color: 'white', fontWeight: 'bold' } : undefined}
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
                {showTimeline && (
                    <Card className="border-blue-200 bg-blue-50/20">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-700">
                                    <Clock className="h-5 w-5" />
                                    <CardTitle className="text-lg">Path Audit: Chronological Visit Sequence</CardTitle>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleExportPathAudit}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Path Audit
                                </Button>
                            </div>
                            <CardDescription>Track the movement and timing of field activities, grouped by day.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8 pt-4">
                            {timelineGroups.length > 0 ? timelineGroups.map(([dateKey, items]) => (
                                <div key={dateKey} className="space-y-4">
                                    <div className="flex items-center gap-2 sticky top-0 bg-white/95 backdrop-blur z-20 py-2 border-b border-blue-100 shadow-sm">
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                        <h5 className="font-bold text-sm text-blue-800">
                                            {format(new Date(dateKey), 'EEEE, MMMM do, yyyy')}
                                        </h5>
                                        <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700">{items.length} visits</Badge>
                                    </div>
                                    <div className="relative pl-6 space-y-4 before:absolute before:inset-0 before:ml-[1.25rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-blue-200">
                                        {items.map((item) => {
                                            const globalIndex = timelineItems.findIndex(t => t.id === item.id);
                                            return (
                                                <div key={item.id} className="relative flex items-center justify-between gap-4 group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm z-10 font-bold group-hover:scale-110 transition-transform">
                                                            {globalIndex + 1}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="font-bold text-sm leading-none">{item.companyName}</p>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Badge variant="outline" className="text-[10px] bg-white">
                                                                    {format(new Date(item.createdAt), 'p')}
                                                                </Badge>
                                                                <span>&bull;</span>
                                                                <span>{item.capturedBy}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => {
                                                            if(map && item.latitude && item.longitude) {
                                                                map.panTo({ lat: item.latitude, lng: item.longitude });
                                                                map.setZoom(18);
                                                                setSelectedGroup([{ ...item, type: 'visited' }]);
                                                            }
                                                        }}>
                                                            <MapPin className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                            <Link href={item.leadStatus === 'Won' ? `/companies/${item.leadId}` : `/leads/${item.leadId}`} target="_blank">
                                                                <ExternalLink className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-muted-foreground italic">No visits logged in this area.</div>
                            )}
                        </CardContent>
                    </Card>
                )}

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
        </div>
      )}

      <Tabs defaultValue="approved">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger value="approved">Active ({activeAreas.length})</TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                  Pending ({myPendingAreas.length})
                  {myPendingAreas.length > 0 && <span className="h-2 w-2 rounded-full bg-red-500" />}
              </TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedAreas.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="approved">
            <Card>
                <CardHeader>
                <CardTitle>Active Prospecting Areas</CardTitle>
                <CardDescription>
                    Designated areas currently being worked by the team.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Area Name</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Contents</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {activeAreas.length > 0 ? (
                        activeAreas.map(area => (
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
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    {isAdmin && (
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
                                    >
                                        <CheckSquare className="mr-2 h-4 w-4" />
                                        Mark Done
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleLoadArea(area)}}>
                                        <MapPin className="mr-2 h-4 w-4" /> View
                                    </Button>
                                    {isAdmin && (
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
                        <TableCell colSpan={4} className="h-24 text-center">
                            No active prospecting areas found.
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
                                            {isApproving === area.id ? <Loader /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Approve</>}
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

          <TabsContent value="completed">
            <Card>
                <CardHeader>
                <CardTitle>Completed Areas (Pending Admin Review)</CardTitle>
                <CardDescription>
                    Areas marked as complete by reps. Admins should review coverage and finalize or re-assign.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Area Name</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Completed At</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {completedAreas.length > 0 ? (
                        completedAreas.map(area => (
                        <TableRow key={area.id} onClick={() => handleLoadArea(area)} className={cn("cursor-pointer hover:bg-muted/50", selectedArea?.id === area.id && 'bg-secondary')}>
                            <TableCell className="font-medium">{area.name}</TableCell>
                            <TableCell>{area.userName}</TableCell>
                            <TableCell>{format(new Date(area.createdAt), 'PP')}</TableCell>
                            <TableCell>
                                <Badge variant={area.status === 'Reviewed' ? 'secondary' : 'default'}>
                                    {area.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    {isAdmin && area.status === 'Completed' ? (
                                        <Button 
                                            variant="default" 
                                            size="sm" 
                                            className="bg-blue-600 hover:bg-blue-700" 
                                            onClick={(e) => { e.stopPropagation(); handleLoadArea(area); }}
                                        >
                                            <ClipboardCheck className="mr-2 h-4 w-4" />
                                            Review
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleLoadArea(area)}}>
                                            <MapPin className="mr-2 h-4 w-4" /> View
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No completed areas found.
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
