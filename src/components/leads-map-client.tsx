'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
  DirectionsRenderer,
  DrawingManagerF,
  CircleF,
  HeatmapLayer
} from '@react-google-maps/api';
import type { Lead, Address, MapLead, SavedRoute, StorableRoute, Activity, UserProfile } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building, CheckSquare, Clock, GripVertical, Milestone, Play, Route, Trash2, XCircle, Save, User, Filter, X, Calendar as CalendarIcon, Clipboard, Briefcase, MapPin, Globe, Sparkles, Search, Move, PenSquare, MoreHorizontal, CircleDot, RectangleHorizontal, Spline, LayoutGrid } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAllUserRoutes, getUserRoutes, getAllUsers, getCompaniesFromFirebase, saveUserRoute, updateUserRoute, deleteUserRoute, getLeadsFromFirebase } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const center = {
  lat: -25.2744,
  lng: 133.7751,
};

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'drawing', 'geometry', 'visualization'];

export default function LeadsMapClient() {
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries,
    });
    
    // Data State
    const [allMapData, setAllMapData] = useState<MapLead[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const { userProfile, savedRoutes, setSavedRoutes } = useAuth();
    
    // Map Interaction State
    const [selectedLead, setSelectedLead] = useState<MapLead | null>(null);
    const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);
    const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Routing State
    const [selectedRouteLeads, setSelectedRouteLeads] = useState<MapLead[]>([]);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [travelMode, setTravelMode] = useState<google.maps.TravelMode>(google.maps.TravelMode.DRIVING);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [isSaveRouteDialogOpen, setIsSaveRouteDialogOpen] = useState(false);
    const [routeName, setRouteName] = useState('');
    const [routeDate, setRouteDate] = useState<Date | undefined>();
    const [routeAssignee, setRouteAssignee] = useState('');

    // Prospecting Area State
    const [isSaveAreaDialogOpen, setIsSaveAreaDialogOpen] = useState(false);
    const [newAreaName, setNewAreaName] = useState('');
    const [newAreaAssignee, setNewAreaAssignee] = useState('');
    const [streetsForArea, setStreetsForArea] = useState<{ place_id: string; description: string }[]>([]);
    const [drawnOverlay, setDrawnOverlay] = useState<google.maps.Polygon | google.maps.Rectangle | null>(null);
    const [areaLeads, setAreaLeads] = useState<MapLead[]>([]);
    const [isSavingArea, setIsSavingArea] = useState(false);
    const [activeProspectingTab, setActiveProspectingTab] = useState("by-drawing");

    // UI State
    const [activeTab, setActiveTab] = useState('route-planner');
    const [selectionMode, setSelectionMode] = useState<'info' | 'select'>('info');
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingMode, setDrawingMode] = useState<google.maps.drawing.OverlayType | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager>(null);
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const routeIdToLoad = searchParams.get('routeId');

    // Autocomplete State
    const searchInputRef = useRef<HTMLInputElement>(null);
    const streetInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isLoaded || !map) return;
    
        const setupAutocomplete = (inputRef: React.RefObject<HTMLInputElement>, onPlaceChanged: (place: google.maps.places.PlaceResult) => void) => {
            if (inputRef.current && !(inputRef.current as any).autocomplete) {
                const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
                    types: ['geocode'],
                    componentRestrictions: { country: 'au' },
                    fields: ['name', 'formatted_address', 'address_components', 'geometry', 'place_id', 'website'],
                });
                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (place.geometry) {
                        onPlaceChanged(place);
                    }
                });
                (inputRef.current as any).autocomplete = autocomplete;
            }
        };

        setupAutocomplete(searchInputRef, (place) => {
            if (place.geometry?.viewport) {
                map.fitBounds(place.geometry.viewport);
            } else if (place.geometry?.location) {
                map.setCenter(place.geometry.location);
                map.setZoom(15);
            }
        });
        setupAutocomplete(streetInputRef, (place) => {
            if (place.place_id && place.formatted_address) {
                setStreetsForArea(prev => [...prev, { place_id: place.place_id!, description: place.formatted_address! }]);
                if (streetInputRef.current) streetInputRef.current.value = '';
            }
        });

    }, [isLoaded, map]);

    useEffect(() => {
        if (!userProfile) return;
    
        const fetchData = async () => {
          setLoadingData(true);
          try {
            const [leads, companies, routes, users, activities] = await Promise.all([
              getLeadsFromFirebase({ summary: true }),
              getCompaniesFromFirebase(),
              userProfile.role === 'admin' || userProfile.role === 'Field Sales Admin' ? getAllUserRoutes() : getUserRoutes(userProfile.uid),
              getAllUsers(),
              getAllActivities(true)
            ]);
    
            const allItems = [
              ...leads.map(l => ({ ...l, isCompany: false })),
              ...companies.map(c => ({ ...c, isCompany: true, status: 'Won' as const }))
            ].filter(item => item.latitude != null && item.longitude != null)
             .map(item => ({...item, latitude: Number(item.latitude), longitude: Number(item.longitude)})) as MapLead[];
             
            setMapData(allItems);
            setAllRoutes(routes);
            setAllCheckInActivities(activities);
            const fieldSalesUsers = users.filter(u => u.role === 'Field Sales');
            setAllDialers(fieldSalesUsers);
            setAssignableUsers(fieldSalesUsers);

          } catch (error) {
            console.error("Error fetching initial map data:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not load map data." });
          } finally {
            setLoadingData(false);
          }
        };
        fetchData();
    }, [userProfile, toast]);

    const handleClearRoute = useCallback(() => {
        setDirections(null);
        setSelectedRouteLeads([]);
        setTotalDistance(null);
        setTotalDuration(null);
        setLoadedRoute(null);
        setRouteName('');
        setRouteDate(undefined);
        setRouteAssignee('');
    }, []);

    const onDrawingComplete = useCallback((overlay: google.maps.Polygon | google.maps.Rectangle) => {
        if (drawingMode) {
            setDrawingMode(null);
            setIsDrawing(false);
            setDrawnOverlay(overlay); // Keep the overlay on the map

            const leadsInShape: MapLead[] = [];
            filteredData.forEach(lead => {
                const leadLatLng = new google.maps.LatLng(lead.latitude!, lead.longitude!);
                let isInside = false;
                if (overlay.get('radius')) { // Circle
                    const circle = overlay as google.maps.Circle;
                    isInside = google.maps.geometry.spherical.computeDistanceBetween(leadLatLng, circle.getCenter()!) <= circle.getRadius();
                } else if (overlay.get('bounds')) { // Rectangle
                    const rectangle = overlay as google.maps.Rectangle;
                    isInside = rectangle.getBounds()!.contains(leadLatLng);
                } else { // Polygon
                    const polygon = overlay as google.maps.Polygon;
                    isInside = google.maps.geometry.poly.containsLocation(leadLatLng, polygon);
                }

                if (isInside) {
                    leadsInShape.push(lead);
                }
            });
            
            if (activeProspectingTab === 'by-drawing') {
                setAreaLeads(leadsInShape);
            } else {
                 setSelectedRouteLeads(prev => {
                    const existingIds = new Set(prev.map(l => l.id));
                    const newLeads = leadsInShape.filter(l => !existingIds.has(l.id));
                    return [...prev, ...newLeads];
                });
            }
            
            overlay.setMap(null); // Remove the drawing manager's overlay, we'll render our own based on state

            if (activeProspectingTab === 'by-drawing' && leadsInShape.length > 0) {
              setNewAreaName('');
              setNewAreaAssignee(userProfile?.uid || '');
              setIsSaveAreaDialogOpen(true);
            }

        }
    }, [mapData, drawingMode, activeProspectingTab, userProfile]);

    const filteredData = useMemo(() => {
        return mapData.filter(item => {
            const companyNameMatch = filters.companyName ? item.companyName?.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
            const statusMatch = filters.status.length > 0 ? filters.status.includes(item.status) : true;
            return companyNameMatch && statusMatch;
        });
    }, [mapData, filters]);

    const handleSaveProspectingArea = async () => {
        if (!newAreaName.trim()) {
            toast({ variant: 'destructive', title: "Validation Error", description: "Area name is required." });
            return;
        }

        if ((userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && !newAreaAssignee) {
             toast({ variant: 'destructive', title: "Validation Error", description: "Please assign a sales rep." });
            return;
        }

        setIsSavingArea(true);
        try {
            const userId = (userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') ? newAreaAssignee : userProfile!.uid;
            
            const newRouteData: Partial<StorableRoute> = {
                name: newAreaName,
                createdAt: new Date().toISOString(),
                isProspectingArea: true,
                travelMode: google.maps.TravelMode.DRIVING, // default value
            };

            if (streetsForArea.length > 0) {
                newRouteData.streets = streetsForArea;
            } else if (drawnOverlay) {
                const leadsInArea = selectedRouteLeads.filter(lead => {
                     const leadLatLng = new google.maps.LatLng(lead.latitude!, lead.longitude!);
                     if (drawnOverlay instanceof google.maps.Polygon) {
                         return google.maps.geometry.poly.containsLocation(leadLatLng, drawnOverlay);
                     } else if (drawnOverlay instanceof google.maps.Rectangle) {
                         return drawnOverlay.getBounds()!.contains(leadLatLng);
                     }
                     return false;
                });
                newRouteData.leads = leadsInArea.map(l => ({ id: l.id, companyName: l.companyName, latitude: l.latitude!, longitude: l.longitude!, address: l.address! }));
                if (drawnOverlay instanceof google.maps.Polygon) {
                  newRouteData.shape = { type: 'polygon', paths: drawnOverlay.getPath().getArray().map(p => p.toJSON()) };
                } else if (drawnOverlay instanceof google.maps.Rectangle) {
                   newRouteData.shape = { type: 'rectangle', bounds: drawnOverlay.getBounds()!.toJSON() };
                }
            } else {
                 toast({ variant: 'destructive', title: "No Area Defined", description: "Please select streets or draw an area." });
                 setIsSavingArea(false);
                 return;
            }

            const routeId = await saveUserRoute(userId, newRouteData as StorableRoute);
            
            const newRoute = { ...newRouteData, id: routeId, directions: null } as SavedRoute;
            setSavedRoutes(prev => [...prev, newRoute]);
            
            toast({ title: "Success", description: "Prospecting area saved." });
            
            // Reset state
            setIsSaveAreaDialogOpen(false);
            setNewAreaName('');
            setNewAreaAssignee('');
            setStreetsForArea([]);
            setDrawnOverlay(null);
            setSelectedRouteLeads([]);

        } catch (error) {
            console.error("Failed to save prospecting area:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save the area." });
        } finally {
            setIsSavingArea(false);
        }
    };


    if (!isLoaded) return <FullScreenLoader message="Loading maps..." />;
    if (loadError) return <div className="text-destructive-foreground bg-destructive p-4 rounded-md">Error loading maps. Please check your API key and network connection.</div>;

    const MapContent = (
      <div className="flex-grow h-[calc(100vh-220px)] md:h-full relative rounded-lg overflow-hidden border">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={5}
          onLoad={setMap}
          onClick={onMapClick}
          options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, zoomControl: true }}
          mapTypeId={mapTypeId}
        >
          {myLocation && <MarkerF position={myLocation} title="Your Location" />}
          
          {filteredData.map(item => (
            <MarkerF
              key={item.id}
              position={{ lat: item.latitude!, lng: item.longitude! }}
              title={item.companyName}
              icon={{
                url: getPinColor(item.status, (selectedRouteLeads.some(l => l.id === item.id) || (areaLeads.some(l => l.id === item.id))), false, hoveredLeadId === item.id),
                scaledSize: new google.maps.Size(isMultiSelectMode && selectedRouteLeads.some(l => l.id === item.id) ? 12 : 8, isMultiSelectMode && selectedRouteLeads.some(l => l.id === item.id) ? 12 : 8),
              }}
              onClick={() => onMarkerClick(item)}
              onMouseOver={() => setHoveredLeadId(item.id)}
              onMouseOut={() => setHoveredLeadId(null)}
            />
          ))}

          {selectedLead && (
            <InfoWindowF
                position={{ lat: selectedLead.latitude!, lng: selectedLead.longitude! }}
                onCloseClick={onInfoWindowClose}
                options={infoWindowOptions}
            >
                <div className="p-2 max-w-xs space-y-2">
                    <h3 className="font-bold text-lg">{selectedLead.companyName}</h3>
                    <p><LeadStatusBadge status={selectedLead.status} /></p>
                    <p className="text-sm text-muted-foreground">{formatAddress(selectedLead.address as Address)}</p>
                    <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={() => router.push(selectedLead.isCompany ? `/companies/${selectedLead.id}` : `/leads/${selectedLead.id}`)}>
                            <ExternalLink className="mr-2 h-4 w-4" /> View {selectedLead.isCompany ? 'Customer' : 'Lead'}
                        </Button>
                        {!selectedLead.isCompany && (
                            <Button size="sm" variant="secondary" onClick={() => handleCheckIn(selectedLead)}>
                                <CheckSquare className="mr-2 h-4 w-4" />
                                Check In
                            </Button>
                        )}
                    </div>
                </div>
            </InfoWindowF>
          )}

          {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}

          {isDrawing && (
              <DrawingManagerF
                  onLoad={(dm) => (drawingManagerRef.current = dm as any)}
                  onOverlayComplete={(e) => {
                      if (e.overlay) {
                          onDrawingComplete(e.overlay as google.maps.Polygon | google.maps.Rectangle);
                      }
                      e.overlay?.setMap(null);
                  }}
                  drawingMode={drawingMode}
                  options={{
                      drawingControl: false,
                      polygonOptions: {
                          fillColor: '#4285F4',
                          fillOpacity: 0.2,
                          strokeColor: '#4285F4',
                          strokeWeight: 2,
                      },
                      rectangleOptions: {
                          fillColor: '#4285F4',
                          fillOpacity: 0.2,
                          strokeColor: '#4285F4',
                          strokeWeight: 2,
                      },
                  }}
              />
          )}

        </GoogleMap>
        <MapLegend />
      </div>
    );

    return (
        <>
            <div className="flex flex-col h-full gap-4">
                <div className="flex-grow flex flex-col md:flex-row-reverse gap-4">
                    <Card className="w-full md:max-w-sm lg:max-w-md xl:max-w-lg flex flex-col">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                            <CardHeader className="pb-2 flex-shrink-0">
                                <CardTitle>Map Tools</CardTitle>
                                <TabsList className="grid w-full grid-cols-2 mt-2">
                                    <TabsTrigger value="route-planner">Route Planner</TabsTrigger>
                                    <TabsTrigger value="prospecting">Prospecting Area</TabsTrigger>
                                </TabsList>
                            </CardHeader>
                            
                            <TabsContent value="route-planner" className="flex-grow overflow-hidden flex flex-col">
                                <CardContent className="flex-grow overflow-y-auto p-4 space-y-4">
                                  {/* Route Planner Content */}
                                    <div className="space-y-2">
                                        <Label>Selection Mode</Label>
                                        <div className="flex gap-2">
                                            <Button variant={selectionMode === 'info' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('info')} className="w-full">
                                                <Info className="mr-2" /> Info
                                            </Button>
                                            <Button variant={selectionMode === 'select' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('select')} className="w-full">
                                                <PlusCircle className="mr-2" /> Select
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Draw Selection Area</Label>
                                         <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="flex-1" onClick={() => startDrawing(google.maps.drawing.OverlayType.RECTANGLE)} disabled={isDrawing}>
                                                <RectangleHorizontal className="mr-2"/> Rectangle
                                            </Button>
                                            <Button variant="outline" size="sm" className="flex-1" onClick={() => startDrawing(google.maps.drawing.OverlayType.POLYGON)} disabled={isDrawing}>
                                                <Spline className="mr-2"/> Polygon
                                            </Button>
                                            {isDrawing && <Button variant="ghost" size="icon" onClick={cancelDrawing}><X className="text-destructive"/></Button>}
                                        </div>
                                    </div>

                                    <Separator />
                                     <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <Label>Selected Stops ({selectedRouteLeads.length})</Label>
                                            <Button variant="outline" size="sm" onClick={handleClearRoute}>Clear All</Button>
                                        </div>
                                        <ScrollArea className="h-40 border rounded-md">
                                            <div className="p-2 space-y-1">
                                            {selectedRouteLeads.length > 0 ? selectedRouteLeads.map(lead => (
                                                <div key={lead.id} className="flex items-center justify-between text-sm p-1 rounded-md hover:bg-muted">
                                                    <span className="truncate pr-2">{lead.companyName}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedRouteLeads(prev => prev.filter(l => l.id !== lead.id))}><X className="h-4 w-4"/></Button>
                                                </div>
                                            )) : <p className="text-center text-muted-foreground p-4">No stops selected.</p>}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-4 border-t flex-col items-stretch gap-2">
                                    <Button onClick={() => setIsSaveRouteDialogOpen(true)} disabled={selectedRouteLeads.length === 0}>
                                        <Save className="mr-2"/> Save Route
                                    </Button>
                                </CardFooter>
                            </TabsContent>
                            
                            <TabsContent value="prospecting" className="flex-grow overflow-hidden flex flex-col">
                                 <Tabs defaultValue="by-drawing" onValueChange={setActiveProspectingTab}>
                                     <CardContent className="p-4">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="by-drawing">By Drawing</TabsTrigger>
                                            <TabsTrigger value="by-street">By Street</TabsTrigger>
                                        </TabsList>
                                     </CardContent>
                                     <TabsContent value="by-drawing" className="space-y-4 p-4 pt-0">
                                         <Label>Draw prospecting area on the map</Label>
                                          <div className="flex gap-2">
                                              <Button variant="outline" size="sm" className="flex-1" onClick={() => startDrawing(google.maps.drawing.OverlayType.RECTANGLE)} disabled={isDrawing}>
                                                  <RectangleHorizontal className="mr-2"/> Rectangle
                                              </Button>
                                              <Button variant="outline" size="sm" className="flex-1" onClick={() => startDrawing(google.maps.drawing.OverlayType.POLYGON)} disabled={isDrawing}>
                                                  <Spline className="mr-2"/> Polygon
                                              </Button>
                                              {isDrawing && <Button variant="ghost" size="icon" onClick={cancelDrawing}><X className="text-destructive"/></Button>}
                                          </div>
                                           {areaLeads.length > 0 && (
                                            <div className="space-y-2 pt-2">
                                                <p className="text-sm font-medium">{areaLeads.length} leads selected in the drawn area.</p>
                                                <Button onClick={() => setIsSaveAreaDialogOpen(true)} className="w-full">
                                                    <Save className="mr-2"/> Save Prospecting Area
                                                </Button>
                                            </div>
                                          )}
                                     </TabsContent>
                                     <TabsContent value="by-street" className="space-y-4 p-4 pt-0">
                                         <div className="space-y-2">
                                            <Label htmlFor="street-search">Search for streets</Label>
                                            <Input
                                                id="street-search"
                                                ref={streetInputRef}
                                                placeholder="e.g., George St, Sydney"
                                            />
                                        </div>
                                        <ScrollArea className="h-48 border rounded-md">
                                            {streetsForArea.length > 0 ? (
                                                <div className="p-2 space-y-1">
                                                    {streetsForArea.map(street => (
                                                        <div key={street.place_id} className="flex items-center justify-between p-1 rounded-md text-sm">
                                                            <span className="truncate pr-2">{street.description}</span>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setStreetsForArea(prev => prev.filter(s => s.place_id !== street.place_id))}><X className="h-4 w-4"/></Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-center text-muted-foreground p-4">No streets selected yet.</p>
                                            )}
                                        </ScrollArea>
                                        {streetsForArea.length > 0 && (
                                             <Button onClick={() => setIsSaveAreaDialogOpen(true)} className="w-full">
                                                <Save className="mr-2"/> Save Prospecting Area
                                            </Button>
                                        )}
                                     </TabsContent>
                                 </Tabs>
                            </TabsContent>
                        </Tabs>
                    </Card>
                    <div className="md:hidden">
                        {MapContent}
                    </div>
                </div>
                <div className="hidden md:block md:flex-grow">
                    {MapContent}
                </div>
            </div>
             <Dialog open={isSaveAreaDialogOpen} onOpenChange={setIsSaveAreaDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Prospecting Area</DialogTitle>
                        <DialogDescription>
                            Name this area. If you are an admin, you can also assign it to a Field Sales Rep.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="area-name" className="text-right">Name</Label>
                            <Input id="area-name" value={newAreaName} onChange={e => setNewAreaName(e.target.value)} className="col-span-3" />
                        </div>
                        {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="area-assignee" className="text-right">Assign To</Label>
                                <Select value={newAreaAssignee} onValueChange={setNewAreaAssignee}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a rep" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allDialers.map(user => (
                                            <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveAreaDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveProspectingArea} disabled={isSavingArea}>
                            {isSavingArea ? <Loader /> : 'Save Area'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

const MapLegend = () => (
    <div className="absolute bottom-4 left-4 bg-background/80 p-2 rounded-lg shadow-lg text-xs space-y-1 backdrop-blur-sm">
      <h4 className="font-bold text-center">Legend</h4>
      <div className="flex items-center gap-2">
           <img src="http://maps.google.com/mapfiles/ms/icons/green-dot.png" alt="Signed Customer" className="h-4 w-4" />
          <span>Signed Customer</span>
      </div>
      <div className="flex items-center gap-2">
           <img src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" alt="Lead" className="h-4 w-4" />
          <span>Lead</span>
      </div>
      <div className="flex items-center gap-2">
           <img src="http://maps.google.com/mapfiles/ms/icons/orange-dot.png" alt="In Route" className="h-4 w-4" />
          <span>In Current Route</span>
      </div>
      <div className="flex items-center gap-2">
        <img src="http://maps.google.com/mapfiles/ms/icons/purple-dot.png" alt="Selected" className="h-4 w-4" />
        <span>Selected</span>
      </div>
       <div className="flex items-center gap-2">
        <img src="http://maps.google.com/mapfiles/ms/icons/blue-pushpin.png" alt="Selected Street" className="h-4 w-4" />
        <span>Selected Street</span>
      </div>
    </div>
);