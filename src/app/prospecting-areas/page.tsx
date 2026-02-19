'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { SavedRoute, Lead, Address, VisitNote } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Route, Calendar, MapPin, Trash2, Satellite, ExternalLink, CheckSquare, Pencil, X, History } from 'lucide-react';
import { format } from 'date-fns';
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
  const [allMapItems, setAllMapItems] = useState<Lead[]>([]);
  const [allVisitNotes, setAllVisitNotes] = useState<VisitNote[]>([]);
  const [nearbyMapItems, setNearbyMapItems] = useState<(Lead & { distance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<SavedRoute | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<SavedRoute | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite'>('roadmap');
  const [selectedItem, setSelectedItem] = useState<Lead | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [searchNearbyQuery, setSearchNearbyQuery] = useState('');

  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const hasAccess = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin'].includes(userProfile.role);

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
      
      // Deduplicate leads/companies based on ID to fix React duplicate key issues
      const deduplicatedMap = new Map<string, Lead>();
      [...companies, ...leads].forEach(item => {
          if (!deduplicatedMap.has(item.id)) {
              deduplicatedMap.set(item.id, item);
          }
      });

      setProspectingAreas(areas);
      setAllMapItems(Array.from(deduplicatedMap.values()));
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
        if(!isNaN(Number(street.latitude)) && !isNaN(Number(street.longitude))) {
            bounds.extend({ lat: Number(street.latitude), lng: Number(street.longitude) });
            hasPoints = true;
        }
    });

    (selectedArea.leads || []).forEach(lead => {
      if (!isNaN(Number(lead.latitude)) && !isNaN(Number(lead.longitude))) {
        bounds.extend({ lat: Number(lead.latitude), lng: Number(lead.longitude) });
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
        return;
    }
    
    const bounds = new window.google.maps.LatLngBounds();
    let hasBounds = false;

    if (selectedArea.shape?.type === 'polygon' && selectedArea.shape.paths?.[0]?.length) {
        selectedArea.shape.paths[0].forEach(path => {
            if (!isNaN(Number(path.lat)) && !isNaN(Number(path.lng))) {
                bounds.extend(path);
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
            if (!isNaN(Number(street.latitude)) && !isNaN(Number(street.longitude))) {
                bounds.extend({ lat: Number(street.latitude), lng: Number(street.longitude) });
                hasBounds = true;
            }
        });
    }

    if (selectedArea.leads && selectedArea.leads.length > 0) {
        selectedArea.leads.forEach(lead => {
            if (!isNaN(Number(lead.latitude)) && !isNaN(Number(lead.longitude))) {
                bounds.extend({ lat: Number(lead.latitude), lng: Number(lead.longitude) });
                hasBounds = true;
            }
        });
    }

    let areaCenter: google.maps.LatLng | null = null;

    if (hasBounds) {
        map.fitBounds(bounds);
        areaCenter = bounds.getCenter();
    } else if (selectedArea.leads?.length === 1 && !isNaN(Number(selectedArea.leads[0].latitude)) && !isNaN(Number(selectedArea.leads[0].longitude))) {
        const center = { lat: Number(selectedArea.leads[0].latitude), lng: Number(selectedArea.leads[0].longitude) };
        map.panTo(center);
        map.setZoom(15);
        areaCenter = new window.google.maps.LatLng(center.lat, center.lng);
    } else if (selectedArea.streets?.length === 1 && !isNaN(Number(selectedArea.streets[0].latitude)) && !isNaN(Number(selectedArea.streets[0].longitude))) {
        const center = { lat: Number(selectedArea.streets[0].latitude), lng: Number(selectedArea.streets[0].longitude) };
        map.panTo(center);
        map.setZoom(15);
        areaCenter = new window.google.maps.LatLng(center.lat, center.lng);
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
    } else {
        setNearbyMapItems([]);
    }

  }, [selectedArea, map, allMapItems]);

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
    const visitNotesMap = new Map(allVisitNotes.map(note => [note.id, note]));
    return filteredNearbyItems
        .filter(item => !!item.visitNoteID && visitNotesMap.has(item.visitNoteID))
        .map(item => ({
            ...item,
            visitNote: visitNotesMap.get(item.visitNoteID!)
        }))
        .sort((a, b) => new Date(b.visitNote!.createdAt).getTime() - new Date(a.visitNote!.createdAt).getTime());
  }, [filteredNearbyItems, allVisitNotes]);


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

  const handleLoadArea = useCallback((area: SavedRoute) => {
    setSelectedArea(area);
  }, []);


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
                    <CardTitle>{selectedArea.name}</CardTitle>
                    <CardDescription>
                        Created on {format(new Date(selectedArea.createdAt), 'PP')} by {selectedArea.userName}
                    </CardDescription>
                </div>
                <div className="flex gap-2">
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

                  {/* ONLY show leads that have been visited */}
                  {visitedItemsInArea.map(item => {
                        const lat = Number(item.latitude);
                        const lng = Number(item.longitude);
                        if (isNaN(lat) || isNaN(lng)) return null;
                        
                        let iconUrl = "http://maps.google.com/mapfiles/ms/icons/orange-dot.png";
                        if (hoveredItemId === item.id) iconUrl = "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";

                        return (
                            <MarkerF
                                key={`visited-item-${item.id}`}
                                position={{ lat, lng }}
                                title={item.companyName}
                                icon={{ url: iconUrl }}
                                onClick={() => setSelectedItem(item)}
                            />
                        )
                    })}

                    {selectedItem && (
                        <InfoWindowF
                            position={{ lat: Number(selectedItem.latitude!), lng: Number(selectedItem.longitude!) }}
                            onCloseClick={() => setSelectedItem(null)}
                        >
                            <div className="p-2 max-w-xs space-y-2">
                                <h3 className="font-bold text-lg">{selectedItem.companyName}</h3>
                                <div className="flex items-center gap-2">
                                    <LeadStatusBadge status={selectedItem.status} />
                                    {selectedItem.visitNoteID && <Badge variant="secondary" className="bg-orange-100 text-orange-800">Visited</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground">{formatAddressDisplay(selectedItem.address as Address)}</p>
                                <Button size="sm" onClick={() => window.open(selectedItem.status === 'Won' ? `/companies/${selectedItem.id}` : `/leads/${selectedItem.id}`, '_blank')}>
                                    <ExternalLink className="mr-2 h-4 w-4" /> View Profile
                                </Button>
                            </div>
                        </InfoWindowF>
                    )}
                </GoogleMap>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <p className="font-medium">Streets ({selectedArea.streets.length}):</p>
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
                 {selectedArea.notes && (
                    <div>
                        <h4 className="font-semibold">Notes</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 mt-2 border rounded-md bg-secondary/50 h-32 overflow-y-auto">{selectedArea.notes}</p>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-orange-500" />
                    <CardTitle>Recent Visits in Area ({visitedItemsInArea.length})</CardTitle>
                </div>
                <CardDescription>History of field sales activity within this prospecting territory.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="max-h-96 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Lead Name</TableHead>
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
                                            <Button asChild variant="link" className="p-0 h-auto">
                                                <Link href={item.status === 'Won' ? `/companies/${item.id}` : `/leads/${item.id}`} target="_blank">
                                                    {item.companyName}
                                                </Link>
                                            </Button>
                                        </TableCell>
                                        <TableCell>{format(new Date(item.visitNote!.createdAt), 'PPpp')}</TableCell>
                                        <TableCell>{item.visitNote!.capturedBy}</TableCell>
                                        <TableCell><LeadStatusBadge status={item.status} /></TableCell>
                                        <TableCell>{item.visitNote!.outcome?.type || 'N/A'}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No leads in this area have been visited yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Saved Areas</CardTitle>
          <CardDescription>
            A list of all prospecting areas defined in the system. Select one to view it on the map.
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
              {prospectingAreas.length > 0 ? (
                prospectingAreas.map(area => (
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
