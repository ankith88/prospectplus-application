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
  RectangleF,
  PolygonF,
} from '@react-google-maps/api';
import type { Lead, Address, MapLead, SavedRoute, StorableRoute, Activity, UserProfile, Contact } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    Building, 
    CheckSquare, 
    Clock, 
    GripVertical, 
    Milestone, 
    Play, 
    Route, 
    Trash2, 
    XCircle, 
    Save, 
    User, 
    Filter, 
    X, 
    Calendar as CalendarIcon, 
    Clipboard, 
    Briefcase, 
    MapPin, 
    Globe, 
    Sparkles, 
    Search,
    Move,
    PenSquare,
    MoreVertical,
    CircleDot,
    RectangleHorizontal,
    Spline,
    LayoutGrid,
    Eye,
    PlusCircle,
    Link as LinkIcon,
    Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAllUserRoutes, getUserRoutes, getAllUsers, getCompaniesFromFirebase, saveUserRoute, updateUserRoute, deleteUserRoute, getLeadsFromFirebase, createNewLead, checkForDuplicateLead } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const center = {
  lat: -25.2744,
  lng: 133.7751,
};

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ['places', 'drawing', 'geometry', 'visualization'];

const getPinColor = (status?: LeadStatus, isSelected?: boolean, isHovered?: boolean) => {
    if (isSelected) return 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png';
    if (isHovered) return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
    switch (status) {
        case 'Won': return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
        case 'Lost':
        case 'Unqualified':
            return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
        case 'In Progress':
        case 'Contacted':
        case 'Connected':
        case 'High Touch':
             return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
        case 'Qualified':
        case 'Pre Qualified':
        case 'Trialing ShipMate':
             return 'http://maps.google.com/mapfiles/ms/icons/ltblue-dot.png';
        case 'Priority Lead':
        case 'Priority Field Lead':
            return 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png'
        case 'New':
        default:
            return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    }
};

const infoWindowOptions = {
    pixelOffset: new google.maps.Size(0, -30),
};

export default function LeadsMapClient() {
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries,
    });
    
    // Data State
    const [allMapData, setMapData] = useState<MapLead[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const { userProfile, loading: authLoading } = useAuth();
    
    // Map Interaction State
    const [selectedLead, setSelectedLead] = useState<MapLead | null>(null);
    const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);
    const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Routing State
    const [selectedRouteLeads, setSelectedRouteLeads] = useState<MapLead[]>([]);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [travelMode, setTravelMode] = useState<google.maps.TravelMode>('DRIVING' as google.maps.TravelMode);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [isSaveRouteDialogOpen, setIsSaveRouteDialogOpen] = useState(false);
    const [routeName, setRouteName] = useState('');
    const [routeDate, setRouteDate] = useState<Date | undefined>();
    const [routeAssignee, setRouteAssignee] = useState('');
    const [startPoint, setStartPoint] = useState('');
    const [endPoint, setEndPoint] = useState('');
    const [totalDistance, setTotalDistance] = useState<string | null>(null);
    const [totalDuration, setTotalDuration] = useState<string | null>(null);
    const [loadedRoute, setLoadedRoute] = useState<SavedRoute | null>(null);


    // Prospecting Area State
    const [isSaveAreaDialogOpen, setIsSaveAreaDialogOpen] = useState(false);
    const [newAreaName, setNewAreaName] = useState('');
    const [newAreaAssignee, setNewAreaAssignee] = useState('');
    const [streetsForArea, setStreetsForArea] = useState<{ place_id: string; description: string }[]>([]);
    const [drawnOverlay, setDrawnOverlay] = useState<google.maps.Polygon | google.maps.Rectangle | null>(null);
    const [areaLeads, setAreaLeads] = useState<MapLead[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState('route-planner');
    const [activeProspectingTab, setActiveProspectingTab] = useState("by-drawing");
    const [selectionMode, setSelectionMode] = useState<'info' | 'select'>('info');
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingMode, setDrawingMode] = useState<google.maps.drawing.OverlayType | null>(null);
    
    // Autocomplete State
    const searchInputRef = useRef<HTMLInputElement>(null);
    const streetInputRef = useRef<HTMLInputElement>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager>(null);
    const addLeadId = searchParams.get('addLead');
    const routeIdToLoad = searchParams.get('routeId');

    const handleBack = () => {
        router.back();
    };

    const setupAutocomplete = useCallback((inputElement: HTMLInputElement | null, onPlaceChanged: (place: google.maps.places.PlaceResult) => void) => {
        if (!isLoaded || !map || !inputElement || (inputElement as any).autocomplete) return;

        const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
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
        (inputElement as any).autocomplete = autocomplete;
    }, [isLoaded, map]);

    useEffect(() => {
        setupAutocomplete(searchInputRef.current, (place) => {
             if (place.geometry?.viewport) {
                map?.fitBounds(place.geometry.viewport);
            } else if (place.geometry?.location) {
                map?.panTo(place.geometry.location);
                map?.setZoom(15);
            }
        });
        setupAutocomplete(streetInputRef.current, (place) => {
             if (place.place_id && place.formatted_address) {
                setStreetsForArea(prev => [...prev, { place_id: place.place_id!, description: place.formatted_address! }]);
                if (streetInputRef.current) streetInputRef.current.value = '';
            }
        });
    }, [isLoaded, map, setupAutocomplete, activeProspectingTab]);

    const fetchData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [leads, companies, users] = await Promise.all([
                getLeadsFromFirebase({ summary: true }),
                getCompaniesFromFirebase(),
                getAllUsers(),
            ]);

            const companiesMap = new Map(companies.map(c => [c.id, c]));

            const allItems = leads.map(l => {
                if (companiesMap.has(l.id)) {
                    const companyData = companiesMap.get(l.id)!;
                    companiesMap.delete(l.id); // Remove from map to avoid duplication
                    return { ...companyData, ...l, isCompany: true };
                }
                return { ...l, isCompany: false };
            });
            
            companies.forEach(c => {
                if (!leads.some(l => l.id === c.id)) {
                    allItems.push({ ...c, isCompany: true });
                }
            });


            const mapLeads = allItems
                .filter(item => item.latitude != null && item.longitude != null)
                .map(item => ({ ...item, latitude: Number(item.latitude), longitude: Number(item.longitude) } as MapLead));
            
            setMapData(mapLeads);
            setAllUsers(users);
        } catch (error) {
            console.error("Failed to fetch map data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load map data.' });
        } finally {
            setLoadingData(false);
        }
    }, [toast]);
    
    useEffect(() => {
        if (isLoaded && userProfile) {
            fetchData();
        }
    }, [isLoaded, userProfile, fetchData]);

    useEffect(() => {
      if (addLeadId && allMapData.length > 0) {
        const leadToAdd = allMapData.find(lead => lead.id === addLeadId);
        if (leadToAdd) {
            setSelectedRouteLeads(prev => {
                if (prev.some(l => l.id === leadToAdd.id)) return prev;
                return [...prev, leadToAdd];
            });
            toast({
                title: "Lead Added",
                description: `${leadToAdd.companyName} has been added to your current route.`
            });
             // Clean the URL
            router.replace('/leads/map', { scroll: false });
        }
      }
    }, [addLeadId, allMapData, toast, router]);

    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (selectionMode !== 'select' || !map) return;
    
        const clickedLatLng = e.latLng;
        if (!clickedLatLng) return;

        const service = new window.google.maps.places.PlacesService(map);
        service.nearbySearch({
            location: clickedLatLng,
            radius: 50, // search in a 50 meter radius
            type: 'establishment'
        }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                const place = results[0];
                const existingLead = allMapData.find(l => l.googlePlaceId === place.place_id);
                
                const newLead: MapLead = {
                    id: place.place_id || `temp-${Date.now()}`,
                    companyName: place.name || 'Unknown',
                    address: {
                        street: place.vicinity || place.formatted_address || ''
                    },
                    latitude: place.geometry?.location?.lat() || 0,
                    longitude: place.geometry?.location?.lng() || 0,
                    isCompany: false,
                    isProspect: !existingLead, // Mark as prospect if it's not an existing lead
                    status: existingLead ? existingLead.status : 'New',
                };
                
                if (selectedRouteLeads.every(l => l.id !== newLead.id)) {
                    setSelectedRouteLeads(prev => [...prev, newLead]);
                }
            }
        });
    }, [selectionMode, map, allMapData, selectedRouteLeads]);
    
    if (!isLoaded) return <FullScreenLoader message="Loading map..." />;
    if (loadError) return <div className="p-4 text-center text-destructive">Error loading Google Maps. Please check your connection and API key.</div>;
    
    const onMarkerClick = (lead: MapLead) => {
        if (selectionMode === 'select') {
            setSelectedRouteLeads(prev => {
                if (prev.some(l => l.id === lead.id)) {
                    return prev.filter(l => l.id !== lead.id);
                } else {
                    return [...prev, lead];
                }
            });
        } else {
            setSelectedLead(lead);
        }
    };
    
    const onInfoWindowClose = () => {
        setSelectedLead(null);
    };

    const cancelDrawing = () => {
        setIsDrawing(false);
        setDrawingMode(null);
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(null);
        }
        if (drawnOverlay) {
            drawnOverlay.setMap(null);
            setDrawnOverlay(null);
        }
        setAreaLeads([]);
        toast({ title: "Drawing Canceled" });
    };

    const startDrawing = (mode: google.maps.drawing.OverlayType) => {
        if (drawnOverlay) {
            drawnOverlay.setMap(null);
        }
        setDrawnOverlay(null);
        setAreaLeads([]);
        setIsDrawing(true);
        setDrawingMode(mode);
        toast({
            title: "Drawing Mode Activated",
            description: `Draw a ${mode.toLowerCase()} on the map to define an area.`,
        });
    };

    const onDrawingComplete = (overlay: google.maps.Polygon | google.maps.Rectangle) => {
        if (drawingMode) {
            setDrawingMode(null);
            setIsDrawing(false);
            setDrawnOverlay(overlay);
            
            const leadsInShape: MapLead[] = [];
            allMapData.forEach(lead => {
                const leadLatLng = new window.google.maps.LatLng(lead.latitude!, lead.longitude!);
                let isInside = false;
                if (overlay instanceof google.maps.Polygon) {
                    isInside = google.maps.geometry.poly.containsLocation(leadLatLng, overlay);
                } else if (overlay instanceof google.maps.Rectangle) {
                    isInside = overlay.getBounds()!.contains(leadLatLng);
                }

                if (isInside) {
                    leadsInShape.push(lead);
                }
            });
            
            setAreaLeads(leadsInShape);
            
            // We set the map to null to hide the drawing manager's overlay
            // and use our state-managed overlay for display.
            overlay.setMap(null);

            if (leadsInShape.length > 0) {
              setNewAreaName('');
              setNewAreaAssignee(userProfile?.uid || '');
              setIsSaveAreaDialogOpen(true);
            } else {
              toast({
                  title: 'No Leads Found',
                  description: 'No leads were found in the selected area.',
                  variant: 'default',
              });
              setDrawnOverlay(null); // Clear the shape if no leads are found
            }
        }
    };

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

            if (activeProspectingTab === 'by-street') {
                newRouteData.streets = streetsForArea;
            } else if (drawnOverlay && areaLeads.length > 0) {
                newRouteData.leads = areaLeads.map(l => ({ id: l.id, companyName: l.companyName, latitude: l.latitude!, longitude: l.longitude!, address: l.address! }));
                 if (drawnOverlay instanceof google.maps.Polygon) {
                  newRouteData.shape = { type: 'polygon', paths: drawnOverlay.getPath().getArray().map(p => p.toJSON()) };
                } else if (drawnOverlay instanceof google.maps.Rectangle) {
                   newRouteData.shape = { type: 'rectangle', bounds: drawnOverlay.getBounds()!.toJSON() };
                }
            } else {
                 toast({ variant: 'destructive', title: "No Area Defined", description: "Please select streets or draw an area with leads." });
                 setIsSavingArea(false);
                 return;
            }

            const routeId = await saveUserRoute(userId, newRouteData as StorableRoute);
            
            toast({ title: "Success", description: "Prospecting area saved." });
            
            // Reset state
            setIsSaveAreaDialogOpen(false);
            setNewAreaName('');
            setNewAreaAssignee('');
            setStreetsForArea([]);
            if(drawnOverlay) drawnOverlay.setMap(null);
            setDrawnOverlay(null);
            setAreaLeads([]);

        } catch (error) {
            console.error("Failed to save prospecting area:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save the area." });
        } finally {
            setIsSavingArea(false);
        }
    };
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-4 h-[calc(100vh-140px)]">
             <div className="relative rounded-lg overflow-hidden border">
                {MapContent}
             </div>
             <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Map Controls</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                   <Tabs defaultValue="route-planner" className="w-full" value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="route-planner">Route Planner</TabsTrigger>
                        <TabsTrigger value="prospecting">Prospecting Area</TabsTrigger>
                      </TabsList>
                      <TabsContent value="route-planner" className="space-y-4 pt-4">
                           <div className="space-y-2">
                            <Label>Selection Mode</Label>
                            <div className="flex gap-2">
                                <Button variant={selectionMode === 'info' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('info')} className="w-full">
                                    <Info className="mr-2 h-4 w-4" /> Info
                                </Button>
                                <Button variant={selectionMode === 'select' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('select')} className="w-full">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Select
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
                                {isDrawing && <Button variant="ghost" size="icon" onClick={cancelDrawing}><X className="h-4 w-4 text-destructive"/></Button>}
                            </div>
                           </div>
                           <div className="space-y-2">
                                <Label>Stops ({selectedRouteLeads.length})</Label>
                                <ScrollArea className="h-40 border rounded-md p-2">
                                    {selectedRouteLeads.length > 0 ? (
                                        selectedRouteLeads.map((lead, index) => (
                                        <div key={lead.id + index} className="flex items-center justify-between p-1 hover:bg-muted rounded">
                                            <span className="text-sm truncate pr-2">{index + 1}. {lead.companyName}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedRouteLeads(prev => prev.filter(l => l.id !== lead.id))}><X className="h-3 w-3"/></Button>
                                        </div>
                                    ))
                                    ) : <p className="text-sm text-center text-muted-foreground pt-4">Click on the map to add stops.</p>}
                                </ScrollArea>
                                <Button variant="outline" size="sm" onClick={handleClearRoute} disabled={selectedRouteLeads.length === 0}>Clear All Stops</Button>
                            </div>
                            <div className="space-y-2">
                               <Label>Travel Mode</Label>
                                <Select value={travelMode} onValueChange={(value) => setTravelMode(value as google.maps.TravelMode)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DRIVING">Driving</SelectItem>
                                        <SelectItem value="WALKING">Walking</SelectItem>
                                        <SelectItem value="BICYCLING">Bicycling</SelectItem>
                                        <SelectItem value="TRANSIT">Transit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <Button onClick={handleCalculateRoute} disabled={selectedRouteLeads.length < 2 || isCalculatingRoute} className="w-full">
                                {isCalculatingRoute ? <Loader /> : 'Calculate Route'}
                            </Button>
                            {directions && (
                                <div className="space-y-4 pt-4 border-t">
                                    <div className="flex justify-around w-full text-center text-sm p-2 bg-muted rounded-md">
                                        <div className="flex items-center gap-2">
                                            <Milestone className="h-4 w-4 text-muted-foreground"/>
                                            <div>
                                                <p className="font-semibold">{totalDistance}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground"/>
                                            <div>
                                                <p className="font-semibold">{totalDuration}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setIsSaveRouteDialogOpen(true)} className="flex-1">
                                            <Save className="mr-2 h-4 w-4"/>Save Route
                                        </Button>
                                    </div>
                                </div>
                            )}
                      </TabsContent>
                      <TabsContent value="prospecting" className="space-y-4 pt-4">
                           {/* Prospecting Content */}
                            <Tabs defaultValue="by-drawing" className="w-full" onValueChange={setActiveProspectingTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="by-drawing">Draw Area</TabsTrigger>
                                    <TabsTrigger value="by-street">Add Streets</TabsTrigger>
                                </TabsList>
                                <TabsContent value="by-drawing" className="space-y-4 pt-4">
                                     <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => startDrawing(google.maps.drawing.OverlayType.RECTANGLE)} disabled={isDrawing}>
                                            <RectangleHorizontal className="mr-2"/> Draw Rectangle
                                        </Button>
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => startDrawing(google.maps.drawing.OverlayType.POLYGON)} disabled={isDrawing}>
                                            <Spline className="mr-2"/> Draw Polygon
                                        </Button>
                                        {isDrawing && <Button variant="ghost" size="icon" onClick={cancelDrawing}><X className="h-4 w-4 text-destructive"/></Button>}
                                    </div>
                                    {areaLeads.length > 0 && <p className="text-sm text-center text-muted-foreground">{areaLeads.length} leads selected in drawn area.</p>}
                                </TabsContent>
                                <TabsContent value="by-street" className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="street-input">Street Name</Label>
                                        <Input ref={streetInputRef} id="street-input" placeholder="e.g., George St, Sydney" />
                                    </div>
                                    <ScrollArea className="h-32 border rounded-md p-2">
                                        {streetsForArea.length > 0 ? (
                                            streetsForArea.map(street => (
                                                <div key={street.place_id} className="flex items-center justify-between p-1 hover:bg-muted rounded text-sm">
                                                    <span className="truncate pr-2">{street.description}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setStreetsForArea(prev => prev.filter(s => s.place_id !== street.place_id))}><X className="h-3 w-3"/></Button>
                                                </div>
                                            ))
                                        ) : <p className="text-sm text-center text-muted-foreground pt-4">Add streets to define the area.</p>}
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                            <Button onClick={() => setIsSaveAreaDialogOpen(true)} disabled={((activeProspectingTab === 'by-drawing' && !drawnOverlay) && (activeProspectingTab === 'by-street' && streetsForArea.length === 0))} className="w-full">
                                <LayoutGrid className="mr-2"/> Save Prospecting Area
                            </Button>
                      </TabsContent>
                   </Tabs>
                </CardContent>
             </Card>
        </div>
    );
}