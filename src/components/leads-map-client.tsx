
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  GoogleMap,
  MarkerF,
  InfoWindowF,
  DirectionsRenderer,
  DrawingManagerF,
  PolygonF,
  RectangleF,
} from '@react-google-maps/api';
import type { LeadStatus, Address, MapLead, SavedRoute, StorableRoute, Activity, UserProfile, Contact, Lead } from '@/lib/types';
import { Loader, FullScreenLoader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building, CheckSquare, Clock, GripVertical, Milestone, Play, Route, Trash2, XCircle, Save, User, Filter, X, Calendar as CalendarIcon, Clipboard, Briefcase, MapPin, Globe, Sparkles, Search, Info, StickyNote, Mic, MicOff, Camera, PenSquare, Move, MoreVertical, CircleDot, RectangleHorizontal, Spline, Map as MapIcon, ArrowUpDown, ExternalLink, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAllUserRoutes, getUserRoutes, getAllUsers, getCompaniesFromFirebase, saveUserRoute, updateUserRoute, deleteUserRoute, getLeadsFromFirebase, createNewLead, checkForDuplicateLead, updateLeadDetails } from '@/services/firebase';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool';
import { cn } from '@/lib/utils';
import { useJsApiLoader } from '@react-google-maps/api';

type ProspectWithLeadInfo = {
    place: google.maps.places.PlaceResult;
    existingLead?: MapLead;
    isAdding?: boolean;
    classification?: 'B2B' | 'B2C' | 'Unknown';
    description?: string;
};

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

function getPinIcon(status: LeadStatus, isSelected: boolean, isHovered: boolean) {
    if (isSelected) return 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png';
    if (isHovered) return 'http://maps.google.com/mapfiles/ms/icons/yellow.png';

    switch (status) {
        case 'Won': return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
        case 'Lost':
        case 'Unqualified':
            return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
        case 'In Progress':
        case 'Contacted':
        case 'Connected':
             return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
        case 'Qualified':
        case 'Pre Qualified':
        case 'Trialing ShipMate':
             return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
        default:
            return 'http://maps.google.com/mapfiles/ms/icons/ltblue-dot.png';
    }
}

const formatAddress = (address?: Address) => {
    if (!address) return 'N/A';
    return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
}


export default function LeadsMapClient() {
    const [allMapData, setAllMapData] = useState<MapLead[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [allRoutes, setAllRoutes] = useState<SavedRoute[]>([]);
    
    // Map State
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedLead, setSelectedLead] = useState<MapLead | null>(null);
    const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);
    const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Route Planning State
    const [selectedRouteLeads, setSelectedRouteLeads] = useState<MapLead[]>([]);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [travelMode, setTravelMode] = useState<google.maps.TravelMode | 'DRIVING'>('DRIVING');
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [isSaveRouteDialogOpen, setIsSaveRouteDialogOpen] = useState(false);
    const [routeName, setRouteName] = useState('');
    const [routeDate, setRouteDate] = useState<Date | undefined>();
    const [routeAssignee, setRouteAssignee] = useState('');
    const [startPoint, setStartPoint] = useState('');
    const [endPoint, setEndPoint] = useState('');
    const [totalDistance, setTotalDistance] = useState<string | null>(null);
    const [totalDuration, setTotalDuration] = useState<string | null>(null);
    const [isRouteActive, setIsRouteActive] = useState(false);
    const [isSavingRoute, setIsSavingRoute] = useState(false);
    const [loadedRoute, setLoadedRoute] = useState<SavedRoute | null>(null);
    
    // Prospecting Area State
    const [isSaveAreaDialogOpen, setIsSaveAreaDialogOpen] = useState(false);
    const [isSavingArea, setIsSavingArea] = useState(false);
    const [newAreaName, setNewAreaName] = useState('');
    const [newAreaAssignee, setNewAreaAssignee] = useState('');
    const [streetsForArea, setStreetsForArea] = useState<{ place_id: string; description: string }[]>([]);
    const [drawnOverlay, setDrawnOverlay] = useState<google.maps.Polygon | google.maps.Rectangle | null>(null);
    const [areaLeads, setAreaLeads] = useState<MapLead[]>([]);
    const [prospects, setProspects] = useState<ProspectWithLeadInfo[]>([])
    const [isProspectsDialogOpen, setIsProspectsDialogOpen] = useState(false);
    const [isSearchingNearby, setIsSearchingNearby] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState('route-planner');
    const [activeProspectingTab, setActiveProspectingTab] = useState("by-drawing");
    const [selectionMode, setSelectionMode] = useState<'info' | 'select'>('info');
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingMode, setDrawingMode] = useState<'rectangle' | 'polygon' | null>(null);

    // Autocomplete Refs
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const streetInputRef = useRef<HTMLInputElement | null>(null);
    const startPointRef = useRef<HTMLInputElement | null>(null);
    const endPointRef = useRef<HTMLInputElement | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

    // Dialog & Form State
    const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);
    const [viewingDescription, setViewingDescription] = useState<string | null>(null);
    const [prospectToCreate, setProspectToCreate] = useState<google.maps.places.PlaceResult | null>(null);
    const [isCreatingLead, setIsCreatingLead] = useState(false);
    const [campaign, setCampaign] = useState('');
    const [initialNotes, setInitialNotes] = useState('');
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);


    const [mapSelectedCompanyIds, setMapSelectedCompanyIds] = useState<string[]>([]);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    
    const { userProfile, loading: authLoading, savedRoutes, setSavedRoutes } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries,
    });
    
    const infoWindowOptions = useMemo(() => {
        if (!isLoaded) return {};
        return {
            pixelOffset: new window.google.maps.Size(0, -30),
        };
    }, [isLoaded]);

    const fetchData = useCallback(async () => {
        setLoadingData(true);
        try {
             const routesPromise = userProfile && (userProfile.role === 'admin' || userProfile.role === 'Field Sales Admin')
                ? getAllUserRoutes()
                : userProfile ? getUserRoutes(userProfile.uid) : Promise.resolve([]);

            const [fetchedCompanies, fetchedLeads, fetchedUsers, fetchedRoutes] = await Promise.all([
                getCompaniesFromFirebase(),
                getLeadsFromFirebase({ summary: true }),
                getAllUsers(),
                routesPromise,
            ]);
            
            const combinedData = new Map<string, Lead>();
            
            fetchedLeads.forEach(lead => combinedData.set(lead.id, lead));
            
            fetchedCompanies.forEach(company => {
                if(!combinedData.has(company.id)) {
                  combinedData.set(company.id, { ...company, isCompany: true } as Lead);
                } else {
                  const existingLead = combinedData.get(company.id);
                  if (existingLead && existingLead.status === 'Won') {
                      combinedData.set(company.id, { ...existingLead, ...company, isCompany: true });
                  }
                }
            });

            const allItems = Array.from(combinedData.values());

            const mapLeads = allItems
                .filter(item => item.latitude != null && item.longitude != null)
                .map(item => ({ ...item, latitude: Number(item.latitude), longitude: Number(item.longitude), isCompany: item.status === 'Won', isProspect: false } as MapLead));


            setAllMapData(mapLeads);
            setAllUsers(fetchedUsers);
            setAllRoutes(fetchedRoutes as SavedRoute[]);
        } catch (error) {
            console.error("Failed to fetch map data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load initial map data.' });
        } finally {
            setLoadingData(false);
        }
    }, [userProfile, toast]);
    
    useEffect(() => {
        if (isLoaded && userProfile) {
            fetchData();
        }
    }, [isLoaded, userProfile, fetchData]);

    const handleLoadRoute = useCallback((route: SavedRoute) => {
        if (!isLoaded) return;
        
        setDirections(route.directions);
        setLoadedRoute(route);
        setSelectedRouteLeads(route.leads.map(l => ({ ...l, status: 'New' } as MapLead)));
        setTravelMode((route.travelMode || 'DRIVING') as google.maps.TravelMode);
        setStartPoint(route.startPoint || '');
        setEndPoint(route.endPoint || '');
        setTotalDistance(route.totalDistance || null);
        setTotalDuration(route.totalDuration || null);

        if (route.id) {
            localStorage.setItem('activeRouteId', route.id);
            setIsRouteActive(true);
            toast({ title: 'Route Loaded', description: `Route "${route.name}" is now active.` });
        }
        setActiveTab('route-planner');
    }, [isLoaded, toast]);
    
    useEffect(() => {
        if (loadingData || !isLoaded || allRoutes.length === 0) return;

        const activeRouteId = localStorage.getItem('activeRouteId');
        const routeToLoadId = searchParams.get('routeId');
        
        const targetRouteId = routeToLoadId || activeRouteId;

        if (targetRouteId) {
            const routeToLoad = allRoutes.find(r => r.id === targetRouteId);
            if (routeToLoad) {
                handleLoadRoute(routeToLoad);
                if (routeToLoadId) {
                    router.replace('/leads/map', { scroll: false });
                }
            }
        }
    }, [allRoutes, isLoaded, loadingData, searchParams, router, handleLoadRoute]);

    const getPlaceDetails = useCallback(async (placeId: string): Promise<google.maps.places.PlaceResult | null> => {
        if (!map) return Promise.resolve(null);
        const placesService = new window.google.maps.places.PlacesService(map);
        return new Promise((resolve) => {
            placesService.getDetails({
                placeId,
                fields: ['name', 'formatted_address', 'address_components', 'website', 'formatted_phone_number', 'geometry', 'place_id', 'business_status', 'types', 'vicinity']
            }, (place, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                    resolve(place);
                } else {
                    resolve(null);
                }
            });
        });
    }, [map]);

    const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance);
        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => {
                setMyLocation({ lat: latitude, lng: longitude });
                 if (!searchParams.toString()) {
                    mapInstance.panTo({ lat: latitude, lng: longitude });
                    mapInstance.setZoom(12);
                }
            },
            (error) => {
                console.error("Error getting user location:", error);
                setLocationError("Could not get your location. Please enable location services in your browser.");
            }
        );
    }, [searchParams]);

    const handlePredictionSelect = useCallback(async (prediction: google.maps.places.AutocompletePrediction) => {
        const place = await getPlaceDetails(prediction.place_id);
        if (place) {
            setSelectedPlace(place);
            setSearchQuery(place.name || '');
            setPredictions([]);

            if (map && place.geometry?.location) {
                map.panTo(place.geometry.location);
                map.setZoom(17);
            }
        }
    }, [getPlaceDetails, map]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        if (value) {
            autocompleteService.current?.getPlacePredictions({ input: value, componentRestrictions: { country: 'au' } }, (preds, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && preds) {
                    setPredictions(preds);
                }
            });
        } else {
            setPredictions([]);
        }
    }, []);

    const handleClearRoute = () => {
        setSelectedRouteLeads([]);
        setDirections(null);
        setTotalDistance(null);
        setTotalDuration(null);
        setStartPoint('');
        setEndPoint('');
        if(startPointRef.current) startPointRef.current.value = '';
        if(endPointRef.current) endPointRef.current.value = '';
    };

    const geocodeAddress = useCallback(async (address: string): Promise<google.maps.LatLng | null> => {
        if (!isLoaded) return null;
        const geocoder = new window.google.maps.Geocoder();
        return new Promise((resolve) => {
            geocoder.geocode({ address, componentRestrictions: { country: 'AU' } }, (results, status) => {
                if (status === 'OK' && results?.[0]?.geometry.location) {
                    resolve(results[0].geometry.location);
                } else {
                    resolve(null);
                }
            });
        });
    }, [isLoaded]);

    const handleCalculateRoute = async () => {
        if (selectedRouteLeads.length < 2) {
            toast({ variant: "destructive", title: "Not enough stops", description: "Please select at least two stops to calculate a route." });
            return;
        }
        if (!isLoaded) return;
        
        setIsCalculatingRoute(true);
        const directionsService = new window.google.maps.DirectionsService();

        const waypoints = selectedRouteLeads
            .slice(1, -1)
            .map(l => ({ location: { lat: l.latitude!, lng: l.longitude! }, stopover: true }));
        
        const origin = startPoint ? { query: startPoint } : { lat: selectedRouteLeads[0].latitude!, lng: selectedRouteLeads[0].longitude! };
        const destination = endPoint ? { query: endPoint } : { lat: selectedRouteLeads[selectedRouteLeads.length - 1].latitude!, lng: selectedRouteLeads[selectedRouteLeads.length - 1].longitude! };

        directionsService.route(
            {
                origin: origin,
                destination: destination,
                waypoints: waypoints,
                optimizeWaypoints: true,
                travelMode: travelMode as google.maps.TravelMode,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    setDirections(result);
                    if (result?.routes[0]) {
                        let distance = 0;
                        let duration = 0;
                        result.routes[0].legs.forEach(leg => {
                            distance += leg.distance?.value || 0;
                            duration += leg.duration?.value || 0;
                        });
                        setTotalDistance(`${(distance / 1000).toFixed(1)} km`);
                        setTotalDuration(new Date(duration * 1000).toISOString().substr(11, 8));
                    }
                } else {
                    toast({ variant: 'destructive', title: 'Routing Error', description: `Failed to calculate directions: ${status}` });
                }
                setIsCalculatingRoute(false);
            }
        );
    };

    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (isDrawing || !isLoaded || !window.google) return;
    
        if (selectionMode === 'select' && map && e.latLng) {
            const clickedLatLng = e.latLng;
            let nearestLead: MapLead | null = null;
            let minDistance = Infinity;

            allMapData.forEach(lead => {
                if (lead.latitude && lead.longitude) {
                    const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
                    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(clickedLatLng, leadLatLng);
                    
                    if (distance < 500 && distance < minDistance) { 
                        minDistance = distance;
                        nearestLead = lead;
                    }
                }
            });

            if (nearestLead) {
                setSelectedRouteLeads(prev => {
                    const isSelected = prev.some(l => l.id === nearestLead!.id);
                    if (isSelected) {
                        return prev.filter(l => l.id !== nearestLead!.id);
                    }
                    return [...prev, nearestLead!];
                });
            } else {
                setSelectedLead(null);
            }
        } else {
            setSelectedLead(null);
        }
    }, [isDrawing, isLoaded, map, allMapData, selectionMode]);


    const onMarkerClick = useCallback((lead: MapLead) => {
        if (selectionMode === 'select') {
            setSelectedRouteLeads(prev => {
                const isSelected = prev.some(l => l.id === lead.id);
                if (isSelected) {
                    return prev.filter(l => l.id !== lead.id);
                }
                return [...prev, lead];
            });
        } else {
            setSelectedLead(lead);
        }
    }, [selectionMode]);

    const onInfoWindowClose = useCallback(() => {
        setSelectedLead(null);
    }, []);

    const onDrawingComplete = (overlay: google.maps.Circle | google.maps.Rectangle | google.maps.Polygon) => {
        if (!isLoaded || !window.google) return;

        setDrawnOverlay(overlay as any);

        const leadsInShape = allMapData.filter(lead => {
            if (lead.latitude && lead.longitude) {
                const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
                if ((overlay as any).getBounds) { // Rectangle or Circle
                     return (overlay as any).getBounds().contains(leadLatLng);
                } else if (typeof google.maps.geometry.poly.containsLocation === 'function') { // Polygon
                    return google.maps.geometry.poly.containsLocation(leadLatLng, overlay as google.maps.Polygon);
                }
            }
            return false;
        });

        if (activeTab === 'route-planner') {
            setSelectedRouteLeads(prev => [...new Set([...prev, ...leadsInShape])]);
            toast({
                title: `${leadsInShape.length} Stops Added`,
                description: "Leads within the drawn area have been added to your route.",
            });
        } else {
            setAreaLeads(leadsInShape);
            toast({
                title: `${leadsInShape.length} Leads Selected`,
                description: "You can now save this as a prospecting area.",
            });
        }
        
        
        (overlay as any).setMap(null); // Remove the drawing from the map
        setDrawingMode(null);
        setIsDrawing(false);
    };

     const startDrawing = (mode: 'rectangle' | 'polygon') => {
        if (!isLoaded) return;
        setIsDrawing(true);
        setDrawingMode(mode);
        toast({
            title: "Drawing Mode Activated",
            description: `Draw a ${mode} on the map. Press Esc or click Cancel to exit.`,
        });
    };

    const cancelDrawing = () => {
        setIsDrawing(false);
        setDrawingMode(null);
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(null);
        }
        toast({ title: "Drawing Mode Canceled" });
    };

    const handleSaveRouteDialog = () => {
        if (selectedRouteLeads.length === 0) {
            toast({ variant: "destructive", title: "Cannot Save", description: "Add at least one stop to save a route." });
            return;
        }
        setRouteName(`Route - ${format(new Date(), 'PP')}`);
        setRouteDate(new Date());
        setIsSaveRouteDialogOpen(true);
    };

    const handleSaveRoute = async () => {
        if (!userProfile?.uid || !routeName.trim()) {
            toast({ variant: 'destructive', title: 'Cannot Save', description: 'Route name is required.' });
            return;
        }
    
        setIsSavingRoute(true);
        try {
            const assigneeId = routeAssignee || userProfile.uid;

            const storableRoute: StorableRoute = {
                userId: assigneeId,
                name: routeName,
                createdAt: new Date().toISOString(),
                leads: selectedRouteLeads.map(l => ({ id: l.id, companyName: l.companyName, latitude: l.latitude!, longitude: l.longitude!, address: l.address! })),
                travelMode: travelMode,
                startPoint: startPoint,
                endPoint: endPoint,
                directions: directions ? JSON.stringify(directions) : undefined,
                scheduledDate: routeDate?.toISOString(),
                totalDistance,
                totalDuration,
            };
            
            let routeId: string;

            if (loadedRoute?.id && loadedRoute.userId === assigneeId) {
                // Update existing route
                await updateUserRoute(assigneeId, loadedRoute.id, storableRoute);
                routeId = loadedRoute.id;
                setSavedRoutes(prev => prev.map(r => r.id === routeId ? { ...r, ...storableRoute, directions } : r));
                toast({ title: "Route Updated", description: "Your route has been successfully updated." });
            } else {
                 // Create new route
                routeId = await saveUserRoute(storableRoute);
                const newRoute: SavedRoute = { ...storableRoute, id: routeId, directions, userName: allUsers.find(u => u.uid === assigneeId)?.displayName || 'Unknown' };
                setSavedRoutes(prev => [newRoute, ...prev]);
                toast({ title: "Route Saved", description: "Your new route has been saved." });
            }
    
            localStorage.setItem('activeRouteId', routeId);
            setIsSaveRouteDialogOpen(false);
            setRouteName('');
            setRouteDate(undefined);
            setRouteAssignee('');
    
        } catch (error) {
            console.error("Failed to save route:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save the route.' });
        } finally {
            setIsSavingRoute(false);
        }
    };
    
    const handleSaveProspectingArea = async () => {
        if (!newAreaName.trim()) {
            toast({ variant: 'destructive', title: 'Missing Name', description: 'Please provide a name for the prospecting area.' });
            return;
        }
        if (!userProfile?.uid) {
             toast({ variant: 'destructive', title: 'Authentication Error', description: 'Could not identify user.' });
             return;
        }

        setIsSavingArea(true);
        try {
            const assignee = allUsers.find(u => u.displayName === newAreaAssignee);
            const assigneeId = assignee?.uid || userProfile.uid;

            const areaData: Omit<StorableRoute, 'id'> = {
                userId: assigneeId,
                name: newAreaName,
                createdAt: new Date().toISOString(),
                leads: areaLeads.map(l => ({ id: l.id, companyName: l.companyName, latitude: l.latitude!, longitude: l.longitude!, address: l.address! })),
                travelMode: 'DRIVING',
                isProspectingArea: true,
                streets: streetsForArea,
            };

            if (drawnOverlay) {
                if ((drawnOverlay as any).getBounds) { // Rectangle
                    areaData.shape = {
                        type: 'rectangle',
                        bounds: (drawnOverlay as google.maps.Rectangle).getBounds()!.toJSON(),
                    }
                } else { // Polygon
                     areaData.shape = {
                        type: 'polygon',
                        paths: (drawnOverlay as google.maps.Polygon).getPaths().getArray().map(p => p.getArray().map(latLng => latLng.toJSON())),
                    }
                }
            }

            const newId = await saveUserRoute(areaData);
            setSavedRoutes(prev => [...prev, { ...areaData, id: newId, directions: null, userName: allUsers.find(u => u.uid === assigneeId)?.displayName || 'Unknown' }]);
            
            toast({ title: 'Success', description: 'Prospecting area saved successfully.' });
            
            // Reset state
            setNewAreaName('');
            setNewAreaAssignee('');
            setAreaLeads([]);
            setStreetsForArea([]);
            if (drawnOverlay) {
                (drawnOverlay as any).setMap(null);
                setDrawnOverlay(null);
            }
            setIsSaveAreaDialogOpen(false);

        } catch (error) {
            console.error("Failed to save prospecting area:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'An error occurred while saving the area.' });
        } finally {
            setIsSavingArea(false);
        }
    };
    
    // ... other handlers like handleAddLeadClick, handleCreateLeadFromProspect, etc.
    
    if (loadingData || !isLoaded) {
        return <FullScreenLoader message="Loading Map & Data..." />;
    }

    if (loadError) return <div>Error loading maps. Please check your API key and network connection.</div>;

    const allMapMarkers = allMapData.map(lead => (
        <MarkerF
            key={lead.id}
            position={{ lat: lead.latitude!, lng: lead.longitude! }}
            title={lead.companyName}
            onClick={() => onMarkerClick(lead)}
            onMouseOver={() => setHoveredLeadId(lead.id)}
            onMouseOut={() => setHoveredLeadId(null)}
            icon={getPinIcon(lead.status, selectedLead?.id === lead.id || mapSelectedCompanyIds.includes(lead.id), hoveredLeadId === lead.id)}
            visible={true} 
        />
    ));

    return (
        <>
            <div className="flex flex-col h-full gap-4">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight">Territory Map</h1>
                    <p className="text-muted-foreground">Visualize leads, plan routes, and define prospecting areas.</p>
                </header>
                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                    <Card className="md:col-span-1 flex flex-col">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                            <CardHeader className="pb-2 flex-shrink-0">
                                <CardTitle>
                                    {activeTab === 'route-planner' ? 'Route Planner' : 'Prospecting Areas'}
                                </CardTitle>
                                <TabsList className="grid w-full grid-cols-2 mt-2">
                                    <TabsTrigger value="route-planner">Route Planner</TabsTrigger>
                                    <TabsTrigger value="prospecting">Prospecting</TabsTrigger>
                                </TabsList>
                            </CardHeader>
                            
                            <TabsContent value="route-planner" className="flex-grow overflow-hidden flex flex-col">
                                 <CardContent className="flex-grow overflow-y-auto space-y-4">
                                     <div className="space-y-2">
                                        <Label>Selection Mode</Label>
                                        <div className="flex gap-2">
                                            <Button variant={selectionMode === 'info' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('info')} className="w-full"><Info className="mr-2" /> Info</Button>
                                            <Button variant={selectionMode === 'select' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('select')} className="w-full"><PlusCircle className="mr-2" /> Add to Route</Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label>Stops ({selectedRouteLeads.length})</Label>
                                            <div className="flex gap-2">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="icon" disabled={isDrawing}>
                                                            <PenSquare className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => startDrawing('rectangle')}><RectangleHorizontal className="mr-2 h-4 w-4" />Rectangle</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => startDrawing('polygon')}><Spline className="mr-2 h-4 w-4" />Polygon</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                 </DropdownMenu>
                                                 {isDrawing && (<Button variant="ghost" size="icon" onClick={cancelDrawing}><X className="h-4 w-4 text-destructive"/></Button>)}
                                            </div>
                                        </div>
                                        <ScrollArea className="h-40 border rounded-md p-2">
                                            {selectedRouteLeads.length > 0 ? (
                                                selectedRouteLeads.map((lead, index) => (
                                                <div key={lead.id + index} className="flex items-center justify-between p-1 hover:bg-muted rounded text-sm">
                                                    <span className="truncate pr-2">{index + 1}. {lead.companyName}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedRouteLeads(prev => prev.filter(l => l.id !== lead.id))}><X className="h-3 w-3"/></Button>
                                                </div>
                                            ))
                                            ) : <div className="text-sm text-center text-muted-foreground pt-4">Click on the map to add stops or use the drawing tools.</div>}
                                        </ScrollArea>
                                        <Button variant="outline" size="sm" onClick={handleClearRoute} disabled={selectedRouteLeads.length === 0}>Clear All Stops</Button>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-semibold">Route Options</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="start-point">Start Point (Optional)</Label>
                                                <Input ref={startPointRef} id="start-point" placeholder="e.g. Your office" onChange={e => setStartPoint(e.target.value)} value={startPoint} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="end-point">End Point (Optional)</Label>
                                                <Input ref={endPointRef} id="end-point" placeholder="e.g. Home" onChange={e => setEndPoint(e.target.value)} value={endPoint} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Travel Mode</Label>
                                            <Select value={travelMode as string} onValueChange={(value) => setTravelMode(value as google.maps.TravelMode)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="DRIVING">Driving</SelectItem>
                                                    <SelectItem value="WALKING">Walking</SelectItem>
                                                    <SelectItem value="BICYCLING">Bicycling</SelectItem>
                                                    <SelectItem value="TRANSIT">Transit</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                 </CardContent>
                                  <CardFooter className="flex flex-col gap-2 pt-4 border-t flex-shrink-0">
                                    {directions && totalDistance && totalDuration && (
                                        <div className="flex justify-around w-full text-center text-sm p-2 bg-muted rounded-md">
                                            <div className="flex items-center gap-2"><Milestone className="h-4 w-4 text-muted-foreground"/><div><p className="font-semibold">{totalDistance}</p></div></div>
                                            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground"/><div><p className="font-semibold">{totalDuration}</p></div></div>
                                        </div>
                                    )}
                                     <div className="flex w-full gap-2">
                                        <Button onClick={handleCalculateRoute} disabled={selectedRouteLeads.length < 2 || isCalculatingRoute} className="flex-1">
                                            {isCalculatingRoute ? <Loader /> : 'Calculate Route'}
                                        </Button>
                                        <Button variant="outline" onClick={handleSaveRouteDialog} className="flex-1" disabled={!directions || isSavingRoute}>
                                            <Save className="mr-2 h-4 w-4"/>Save Route
                                        </Button>
                                    </div>
                                    {isRouteActive && (
                                         <Button onClick={() => router.push('/saved-routes')} className="w-full bg-green-600 hover:bg-green-700" disabled={!directions}>
                                            <Play className="mr-2 h-4 w-4" />
                                            View Active Route
                                        </Button>
                                    )}
                                </CardFooter>
                            </TabsContent>

                             <TabsContent value="prospecting" className="flex-grow overflow-hidden flex flex-col">
                                <CardContent className="flex-grow overflow-y-auto space-y-4">
                                     <Tabs defaultValue={activeProspectingTab} onValueChange={setActiveProspectingTab} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="by-drawing">By Area</TabsTrigger>
                                            <TabsTrigger value="by-street">By Street</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="by-drawing" className="space-y-4 pt-4">
                                            <div className="flex gap-2">
                                                <Button variant={drawingMode === 'rectangle' ? 'secondary' : 'outline'} size="sm" className="flex-1" onClick={() => startDrawing('rectangle')} disabled={isDrawing}>
                                                    <RectangleHorizontal className="mr-2"/> Rectangle
                                                </Button>
                                                <Button variant={drawingMode === 'polygon' ? 'secondary' : 'outline'} size="sm" className="flex-1" onClick={() => startDrawing('polygon')} disabled={isDrawing}>
                                                    <Spline className="mr-2"/> Polygon
                                                </Button>
                                                {isDrawing && (<Button variant="ghost" size="icon" onClick={cancelDrawing}><X className="h-4 w-4 text-destructive"/></Button>)}
                                            </div>
                                            {(drawnOverlay || areaLeads.length > 0) && (
                                                <Alert>
                                                    <AlertTitle>{areaLeads.length} Leads Selected</AlertTitle>
                                                    <AlertDescription>
                                                        You've selected {areaLeads.length} leads in the drawn area. You can now save this as a prospecting area.
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </TabsContent>
                                        <TabsContent value="by-street" className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="street-search-input">Search & Add Streets</Label>
                                                <Input ref={streetInputRef} id="street-search-input" placeholder="Enter street name..." />
                                            </div>
                                            {streetsForArea.length > 0 && (
                                                <ScrollArea className="h-32 border rounded-md p-1">
                                                    {streetsForArea.map((street, index) => (
                                                        <div key={street.place_id + index} className="flex justify-between items-center text-sm p-1">
                                                            <span className="truncate">{street.description}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => setStreetsForArea(prev => prev.filter(s => s.place_id !== street.place_id))}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </ScrollArea>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                                <CardFooter className="pt-4 border-t flex-shrink-0">
                                    <Button onClick={() => setIsSaveAreaDialogOpen(true)} className="w-full" disabled={(!drawnOverlay && streetsForArea.length === 0) || isSavingArea}>
                                        {isSavingArea ? <Loader/> : <><Save className="mr-2 h-4 w-4" /> Save Prospecting Area</>}
                                    </Button>
                                </CardFooter>
                            </TabsContent>
                        </Tabs>
                    </Card>
                    <div className="md:col-span-2 flex-grow min-h-[60vh] relative rounded-lg overflow-hidden border">
                        <GoogleMap
                            mapContainerStyle={containerStyle}
                            center={center}
                            zoom={4}
                            onLoad={onMapLoad}
                            onClick={onMapClick}
                            options={{
                                mapTypeControlOptions: isLoaded ? {
                                    style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                                    position: window.google.maps.ControlPosition.TOP_CENTER,
                                } : undefined,
                            }}
                        >
                            {allMapMarkers}
                            {selectedLead && (
                                <InfoWindowF
                                    position={{ lat: selectedLead.latitude!, lng: selectedLead.longitude! }}
                                    onCloseClick={onInfoWindowClose}
                                    options={infoWindowOptions}
                                >
                                    <div className="p-1 max-w-xs space-y-2">
                                        <h3 className="font-bold">{selectedLead.companyName}</h3>
                                        <div className="text-sm text-muted-foreground">{selectedLead.address?.street || 'No address'}</div>
                                        <LeadStatusBadge status={selectedLead.status} />
                                        <div className="flex flex-col gap-2 pt-2">
                                            <Button size="sm" onClick={() => window.open(selectedLead.isCompany ? `/companies/${selectedLead.id}` : `/leads/${selectedLead.id}`, '_blank')}>
                                                <ExternalLink className="mr-2 h-4 w-4" /> View Profile
                                            </Button>
                                            {selectedLead.isCompany && (
                                                 <Button size="sm" variant="outline" onClick={() => {}} disabled={isSearchingNearby || (selectedLead.lastProspected && isToday(selectedLead.lastProspected))}>
                                                    {isSearchingNearby && selectedLead?.id === selectedLead.id ? <Loader /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                    {isSearchingNearby ? 'Searching...' : 'AI Find Similar'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </InfoWindowF>
                            )}
                            {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, preserveViewport: true }} />}
                             {isLoaded && isDrawing && (
                                <DrawingManagerF
                                    onLoad={(dm) => (drawingManagerRef.current = dm)}
                                    onCircleComplete={(c) => onDrawingComplete(c)}
                                    onRectangleComplete={(r) => onDrawingComplete(r)}
                                    onPolygonComplete={(p) => onDrawingComplete(p)}
                                    drawingMode={drawingMode ? google.maps.drawing.OverlayType[drawingMode.toUpperCase() as keyof typeof google.maps.drawing.OverlayType] : null}
                                    options={{
                                        drawingControl: false,
                                        circleOptions: { fillColor: '#4285F4', fillOpacity: 0.2, strokeColor: '#4285F4', strokeWeight: 2 },
                                        rectangleOptions: { fillColor: '#4285F4', fillOpacity: 0.2, strokeColor: '#4285F4', strokeWeight: 2 },
                                        polygonOptions: { fillColor: '#4285F4', fillOpacity: 0.2, strokeColor: '#4285F4', strokeWeight: 2 },
                                    }}
                                />
                            )}
                        </GoogleMap>
                    </div>
                </div>
            </div>
             <Dialog open={isSaveRouteDialogOpen} onOpenChange={setIsSaveRouteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Route</DialogTitle>
                        <DialogDescription>Name your route and assign it to a user.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="routeName">Route Name</Label>
                            <Input id="routeName" value={routeName} onChange={e => setRouteName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Scheduled Date</Label>
                          <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {routeDate ? format(routeDate, 'PPP') : 'Select a date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent>
                                <Calendar mode="single" selected={routeDate} onSelect={setRouteDate} initialFocus />
                              </PopoverContent>
                          </Popover>
                        </div>
                        {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                            <div className="space-y-2">
                                <Label htmlFor="route-assignee">Assign to User</Label>
                                <Select onValueChange={setRouteAssignee} value={routeAssignee}>
                                    <SelectTrigger id="route-assignee">
                                        <SelectValue placeholder="Select a user..."/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={userProfile.uid}>{userProfile.displayName} (Me)</SelectItem>
                                        {allUsers.filter(u => u.role === 'Field Sales' && u.uid !== userProfile.uid).map(user => (
                                            <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveRouteDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveRoute} disabled={isSavingRoute || !routeName}>
                            {isSavingRoute ? <Loader/> : 'Save Route'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
             <Dialog open={isSaveAreaDialogOpen} onOpenChange={setIsSaveAreaDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Prospecting Area</DialogTitle>
                        <DialogDescription>Name this area and assign it to a user.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="areaName">Area Name</Label>
                            <Input id="areaName" value={newAreaName} onChange={e => setNewAreaName(e.target.value)} placeholder="e.g. North Sydney Industrial Zone" />
                        </div>
                        {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                            <div className="space-y-2">
                                <Label htmlFor="area-assignee">Assign to User</Label>
                                <Select onValueChange={setNewAreaAssignee} value={newAreaAssignee}>
                                    <SelectTrigger id="area-assignee">
                                        <SelectValue placeholder="Select a user..."/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={userProfile.uid}>{userProfile.displayName} (Me)</SelectItem>
                                        {allUsers.filter(u => u.role === 'Field Sales').map(user => (
                                            <SelectItem key={user.uid} value={user.displayName!}>{user.displayName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveAreaDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveProspectingArea} disabled={isSavingArea || !newAreaName}>
                            {isSavingArea ? <Loader/> : <><Save className="mr-2 h-4 w-4" /> Save Prospecting Area</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             <Dialog open={isProspectsDialogOpen} onOpenChange={setIsProspectsDialogOpen}>
                <DialogContent className="w-[95vw] md:w-full max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Nearby Prospects</DialogTitle>
                        <DialogDescription>
                            Found {prospects.length} potential leads.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                        <div className="md:hidden space-y-4">
                            {prospects.map(prospectInfo => (
                                <Card key={prospectInfo.place.place_id} className="p-4">
                                    <div className="font-medium pr-2">{prospectInfo.place.name}</div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {prospectInfo.place.vicinity}
                                    </div>
                                    {prospectInfo.description && (
                                        <div>
                                        <p className="text-sm my-2 text-muted-foreground line-clamp-2">
                                            {prospectInfo.description}
                                        </p>
                                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setViewingDescription(prospectInfo.description || null)}>Read More</Button>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center mt-2">
                                        <Badge variant={prospectInfo.classification === 'B2B' ? 'default' : 'secondary'}>
                                            {prospectInfo.classification}
                                        </Badge>
                                        {prospectInfo.existingLead ? (
                                            <Button size="sm" variant="outline" onClick={() => window.open(prospectInfo.existingLead!.isCompany ? `/companies/${prospectInfo.existingLead!.id}` : `/leads/${prospectInfo.existingLead!.id}`, '_blank')}>
                                                <Eye className="mr-2 h-4 w-4" /> View
                                            </Button>
                                        ) : (
                                            <Button size="sm" onClick={() => {}} disabled={prospectInfo.isAdding}>
                                                {prospectInfo.isAdding ? <Loader /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                                Add
                                            </Button>
                                        )}
                                    </div>
                                     {prospectInfo.place.website && (
                                        <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                                            <a href={prospectInfo.place.website} target="_blank" rel="noopener noreferrer">
                                                <Globe className="mr-2 h-4 w-4" />
                                                Visit Website
                                            </a>
                                        </Button>
                                    )}
                                </Card>
                            ))}
                        </div>
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {prospects.map(prospectInfo => (
                                        <TableRow key={prospectInfo.place.place_id}>
                                            <TableCell>
                                                <div className="font-medium">{prospectInfo.place.name}</div>
                                                 {prospectInfo.place.website && (
                                                    <Button asChild variant="link" size="sm" className="p-0 h-auto">
                                                        <a href={prospectInfo.place.website} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1">
                                                            <Globe className="h-3 w-3" />
                                                            Website
                                                        </a>
                                                    </Button>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                    <div className="flex flex-col items-start max-w-xs">
                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                            {prospectInfo.description}
                                                        </p>
                                                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setViewingDescription(prospectInfo.description || null)}>Read More</Button>
                                                    </div>
                                            </TableCell>
                                            <TableCell>{prospectInfo.place.vicinity}</TableCell>
                                            <TableCell><Badge variant={prospectInfo.classification === 'B2B' ? 'default' : 'secondary'}>{prospectInfo.classification}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                {prospectInfo.existingLead ? (
                                                    <Button size="sm" variant="outline" onClick={() => window.open(prospectInfo.existingLead!.isCompany ? `/companies/${prospectInfo.existingLead!.id}` : `/leads/${prospectInfo.existingLead!.id}`, '_blank')}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" onClick={() => setProspectToCreate(prospectInfo.place)} disabled={prospectInfo.isAdding}>
                                                        {prospectInfo.isAdding ? <Loader /> : <PlusCircle className="mr-2 h-4 w-4"/>}
                                                        {prospectInfo.isAdding ? 'Adding...' : 'Add Lead'}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </ScrollArea>
                     <DialogFooter>
                        <Button onClick={() => {}} variant="outline" disabled={prospects.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Export Prospects
                        </Button>
                        <Button variant="outline" onClick={() => setIsProspectsDialogOpen(false)}>Close</Button>
                     </DialogFooter>
                </DialogContent>
            </Dialog>
             <Dialog open={!!duplicateLeadId} onOpenChange={() => setDuplicateLeadId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Duplicate Found</DialogTitle>
                        <DialogDescription>
                            This business appears to already exist in your system.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDuplicateLeadId(null)}>Cancel</Button>
                        <Button onClick={() => {
                            if (duplicateLeadId) {
                                router.push(`/leads/${duplicateLeadId}`);
                                onOpenChange(false);
                            }
                        }}>
                            View Existing Lead
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={!!viewingDescription} onOpenChange={() => setViewingDescription(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>AI Company Description</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] text-sm text-muted-foreground">
                        {viewingDescription}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <Dialog open={!!prospectToCreate} onOpenChange={(open) => !open && setProspectToCreate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Lead</DialogTitle>
                        <DialogDescription>Confirm details for {prospectToCreate?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {(userProfile?.role === 'user' || userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin') && (
                            <div className="space-y-2">
                                <Label htmlFor="campaign-select">Campaign *</Label>
                                <Select value={campaign} onValueChange={setCampaign}>
                                    <SelectTrigger id="campaign-select">
                                        <SelectValue placeholder="Select a campaign" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Outbound">Outbound</SelectItem>
                                        <SelectItem value="Door-to-Door">Door-to-Door</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                         <div className="space-y-2">
                            <Label htmlFor="initial-notes">Initial Notes (Optional)</Label>
                            <Textarea id="initial-notes" placeholder="e.g., Found via AI prospect search for cafes." value={initialNotes} onChange={(e) => setInitialNotes(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProspectToCreate(null)}>Cancel</Button>
                        <Button onClick={() => {}} disabled={isCreatingLead || ((userProfile?.role === 'user' || userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin') && !campaign)}>
                            {isCreatingLead ? <Loader /> : 'Confirm & Create Lead'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
