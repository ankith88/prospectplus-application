
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
  PolygonF,
  RectangleF,
} from '@react-google-maps/api';
import type { LeadStatus, Address, MapLead, SavedRoute, StorableRoute, Activity, UserProfile, Contact } from '@/lib/types';
import { Loader, FullScreenLoader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building, CheckSquare, Clock, GripVertical, Milestone, Play, Route, Trash2, XCircle, Save, User, Filter, X, Calendar as CalendarIcon, Clipboard, Briefcase, MapPin, Globe, Sparkles, Search, Info, StickyNote, Mic, MicOff, Camera, PenSquare, Move, MoreVertical, CircleDot, RectangleHorizontal, Spline, LayoutGrid, Eye, PlusCircle, Link as LinkIcon, Download } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';


type ProspectWithLeadInfo = {
    place: google.maps.places.PlaceResult;
    existingLead?: MapLead;
    isAdding?: boolean;
    classification?: 'B2B' | 'B2C' | 'Unknown';
    description?: string;
};

type SortableCompanyKeys = 'entityId' | 'companyName' | 'franchisee' | 'lastProspected';

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
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries,
    });
    
    // Data State
    const [allMapData, setMapData] = useState<MapLead[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const { userProfile, loading: authLoading, savedRoutes, setSavedRoutes } = useAuth();
    
    // Map Interaction State
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedLead, setSelectedLead] = useState<MapLead | null>(null);
    const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);
    const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    
    // Routing State
    const [selectedRouteLeads, setSelectedRouteLeads] = useState<MapLead[]>([]);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [travelMode, setTravelMode] = useState<string>('DRIVING');
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
    const [drawingMode, setDrawingMode] = useState<google.maps.drawing.OverlayType | null>(null);

    // Autocomplete Refs
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const streetInputRef = useRef<HTMLInputElement | null>(null);
    const startPointRef = useRef<HTMLInputElement | null>(null);
    const endPointRef = useRef<HTMLInputElement | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

    // Other State
    const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);
    const [viewingDescription, setViewingDescription] = useState<string | null>(null);
    const [prospectToCreate, setProspectToCreate] = useState<google.maps.places.PlaceResult | null>(null);
    const [isCreatingLead, setIsCreatingLead] = useState(false);
    const [campaign, setCampaign] = useState('');
    const [initialNotes, setInitialNotes] = useState('');
    const [mapSelectedCompanyIds, setMapSelectedCompanyIds] = useState<string[]>([]);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

     const infoWindowOptions = useMemo(() => {
        if (!isLoaded) return {};
        return {
            pixelOffset: new window.google.maps.Size(0, -30),
        };
    }, [isLoaded]);

    const setupAutocomplete = useCallback((inputElement: HTMLInputElement | null, onPlaceChanged: (place: google.maps.places.PlaceResult) => void, types: string[] = ['geocode']) => {
        if (!isLoaded || !map || !inputElement || (inputElement as any).autocomplete) return;

        const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
            types: types,
            componentRestrictions: { country: 'au' },
            fields: ['name', 'formatted_address', 'address_components', 'website', 'formatted_phone_number', 'geometry', 'place_id', 'business_status', 'types', 'vicinity'],
        });
        
        (inputElement as any).autocomplete = autocomplete;
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry) {
                onPlaceChanged(place);
            }
        });
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
             }
        }, ['address']);
        setupAutocomplete(startPointRef.current, (place) => setStartPoint(place.formatted_address || ''));
        setupAutocomplete(endPointRef.current, (place) => setEndPoint(place.formatted_address || ''));
    }, [isLoaded, map, setupAutocomplete]);

    const fetchData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [leads, companies, users, routes] = await Promise.all([
                getLeadsFromFirebase({ summary: true }),
                getCompaniesFromFirebase(),
                getAllUsers(),
                userProfile?.uid ? getUserRoutes(userProfile.uid) : Promise.resolve([]),
            ]);
            
            const combinedData = new Map<string, Lead>();
            leads.forEach(lead => combinedData.set(lead.id, lead));
            companies.forEach(company => {
                combinedData.set(company.id, { ...company, isCompany: true });
            });
            const allItems = Array.from(combinedData.values());

            const mapLeads = allItems
                .filter(item => item.latitude != null && item.longitude != null)
                .map(item => ({ ...item, latitude: Number(item.latitude), longitude: Number(item.longitude), isCompany: item.status === 'Won', isProspect: false } as MapLead));

            setMapData(mapLeads);
            setAllUsers(users);
            setSavedRoutes(routes);

        } catch (error) {
            console.error("Failed to fetch map data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load initial map data.' });
        } finally {
            setLoadingData(false);
        }
    }, [userProfile, toast, setSavedRoutes]);
    
    useEffect(() => {
        if (isLoaded && userProfile) {
            fetchData();
        }
    }, [isLoaded, userProfile, fetchData]);
    
    const handleLoadRoute = useCallback((route: SavedRoute) => {
        if (!isLoaded) return;
        
        setDirections(route.directions);
        setLoadedRoute(route);
        setSelectedRouteLeads(route.leads.map(l => ({ ...l, status: 'New' })));
        setTravelMode(route.travelMode || 'DRIVING');
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
        if (loadingData || !isLoaded || allMapData.length === 0) return;

        const activeRouteId = localStorage.getItem('activeRouteId');
        if (activeRouteId) {
            const routeToLoad = savedRoutes.find(r => r.id === activeRouteId);
            if (routeToLoad) {
                handleLoadRoute(routeToLoad);
                setIsRouteActive(true);
            }
        }
        const leadIdToAdd = searchParams.get('addLead');
        if (leadIdToAdd) {
            const lead = allMapData.find(l => l.id === leadIdToAdd);
            if (lead) {
                setSelectedRouteLeads(prev => {
                    if (prev.find(p => p.id === lead.id)) return prev;
                    return [...prev, lead];
                });
                toast({ title: 'Lead Added to Route', description: `${lead.companyName} has been added to your current route.`});
                router.replace('/leads/map', { scroll: false });
            }
        }
        const areaToLoadId = searchParams.get('loadArea');
        if (areaToLoadId && map) { // Assuming allRoutes are also loaded
             const allSystemRoutes = [...savedRoutes];
             const routeToLoad = allSystemRoutes.find(r => r.id === areaToLoadId);
             if (routeToLoad) {
                setActiveTab('prospecting');
                if (routeToLoad.shape) {
                    if (routeToLoad.shape.type === 'polygon' && routeToLoad.shape.paths) {
                        const polygon = new window.google.maps.Polygon({ paths: routeToLoad.shape.paths });
                        setDrawnOverlay(polygon);
                        const bounds = new window.google.maps.LatLngBounds();
                        routeToLoad.shape.paths[0].forEach(path => bounds.extend(path));
                        map.fitBounds(bounds);
                    } else if (routeToLoad.shape.type === 'rectangle' && routeToLoad.shape.bounds) {
                        const rectangle = new window.google.maps.Rectangle({ bounds: routeToLoad.shape.bounds });
                        setDrawnOverlay(rectangle);
                        map.fitBounds(rectangle.getBounds()!);
                    }
                    setAreaLeads(routeToLoad.leads as MapLead[]);
                } else if (routeToLoad.streets) {
                    setStreetsForArea(routeToLoad.streets);
                }
                toast({ title: "Prospecting Area Loaded", description: `Loaded "${routeToLoad.name}".`});
             }
             router.replace('/leads/map', { scroll: false });
        }


    }, [searchParams, allMapData, toast, router, savedRoutes, handleLoadRoute, map, loadingData]);

    const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance);
        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => {
                setMyLocation({ lat: latitude, lng: longitude });
                mapInstance.panTo({ lat: latitude, lng: longitude });
                mapInstance.setZoom(12);
            },
            (error) => {
                console.error("Error getting user location:", error);
                setLocationError("Could not get your location. Please enable location services in your browser.");
            }
        );
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    const onMarkerClick = useCallback((lead: MapLead) => {
        if (isMultiSelectMode) {
            setMapSelectedCompanyIds(prev =>
                prev.includes(lead.id)
                    ? prev.filter(id => id !== lead.id)
                    : [...prev, lead.id]
            );
        } else if (selectionMode === 'select') {
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
    }, [isMultiSelectMode, selectionMode]);

    const onInfoWindowClose = useCallback(() => {
        setSelectedLead(null);
    }, []);

    const handleClearRoute = () => {
        setSelectedRouteLeads([]);
        setDirections(null);
        setTotalDistance(null);
        setTotalDuration(null);
        setLoadedRoute(null);
        localStorage.removeItem('activeRouteId');
        setIsRouteActive(false);
    };
    
    const handleCalculateRoute = () => {
        if (selectedRouteLeads.length < 1) {
            toast({
                title: 'No stops',
                description: 'Please select at least one stop for the route.',
                variant: 'destructive',
            });
            return;
        }
        setIsCalculatingRoute(true);
        const directionsService = new window.google.maps.DirectionsService();

        const origin = startPoint ? { query: startPoint } : { lat: selectedRouteLeads[0].latitude!, lng: selectedRouteLeads[0].longitude! };
        const destination = endPoint ? { query: endPoint } : (selectedRouteLeads.length > 1 ? { lat: selectedRouteLeads[selectedRouteLeads.length -1].latitude!, lng: selectedRouteLeads[selectedRouteLeads.length -1].longitude! } : origin);
        
        const waypoints = selectedRouteLeads.length > 2
            ? selectedRouteLeads
            .slice(1, selectedRouteLeads.length -1)
            .map(lead => ({
                location: { lat: lead.latitude!, lng: lead.longitude! },
                stopover: true,
            }))
            : [];
        
        const request: google.maps.DirectionsRequest = {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            travelMode: travelMode as google.maps.TravelMode,
            optimizeWaypoints: true,
        };

        directionsService.route(request, (result, status) => {
            setIsCalculatingRoute(false);
            if (status === google.maps.DirectionsStatus.OK) {
                setDirections(result);
                let distance = 0;
                let duration = 0;
                result?.routes[0].legs.forEach(leg => {
                    distance += leg.distance?.value || 0;
                    duration += leg.duration?.value || 0;
                });
                setTotalDistance((distance / 1000).toFixed(2) + ' km');
                setTotalDuration(Math.round(duration / 60) + ' min');
            } else {
                toast({
                    title: 'Error',
                    description: `Failed to calculate route: ${status}`,
                    variant: 'destructive',
                });
            }
        });
    };

    const handleSaveRoute = async () => {
        if (!userProfile || !directions || !routeName) {
            toast({ variant: "destructive", title: "Error", description: "Route name and directions are required to save." });
            return;
        }
        setIsSavingRoute(true);

        const storableRoute: StorableRoute = {
            userId: routeAssignee || userProfile.uid,
            name: routeName,
            createdAt: new Date().toISOString(),
            leads: selectedRouteLeads.map(({ id, companyName, latitude, longitude, address }) => ({
                id,
                companyName,
                latitude: latitude!,
                longitude: longitude!,
                address: address!,
            })),
            travelMode: travelMode as google.maps.TravelMode,
            startPoint,
            endPoint,
            directions: JSON.stringify(directions),
            totalDistance,
            totalDuration,
            scheduledDate: routeDate ? routeDate.toISOString() : undefined,
            isProspectingArea: false,
        };

        try {
            let routeId = loadedRoute?.id;
            if (routeId) {
                await updateUserRoute(storableRoute.userId, routeId, storableRoute);
                toast({ title: 'Success', description: 'Route updated successfully!' });
                const updatedRoutes = savedRoutes.map(r => r.id === routeId ? { ...storableRoute, id: routeId, directions } : r);
                setSavedRoutes(updatedRoutes as SavedRoute[]);
            } else {
                 routeId = await saveUserRoute(storableRoute.userId, storableRoute);
                 toast({ title: 'Success', description: 'Route saved successfully!' });
                 setSavedRoutes(prev => [{...storableRoute, id: routeId, directions } as SavedRoute,...prev]);
            }
            setIsSaveRouteDialogOpen(false);
            setRouteName('');
            setRouteDate(undefined);
            
            const newlySavedRoute = { ...storableRoute, id: routeId, directions };
            handleLoadRoute(newlySavedRoute as SavedRoute);

        } catch (error) {
            console.error("Error saving route:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save route.' });
        } finally {
            setIsSavingRoute(false);
        }
    };

    const startDrawing = (mode: google.maps.drawing.OverlayType) => {
        setIsDrawing(true);
        setDrawingMode(mode);
        setSelectionMode('info'); // Drawing is a separate action
        toast({
            title: "Drawing Mode Activated",
            description: `Draw a ${mode.toLowerCase()} on the map to define a prospecting area. Press Esc or click Cancel to exit.`,
        });
    };

    const cancelDrawing = () => {
        setIsDrawing(false);
        setDrawingMode(null);
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(null);
        }
        if (drawnOverlay) {
          (drawnOverlay as any).setMap(null);
          setDrawnOverlay(null);
        }
        setAreaLeads([]);
        toast({ title: "Drawing Mode Canceled" });
    };

    const onDrawingComplete = (overlay: google.maps.Polygon | google.maps.Rectangle) => {
        if (drawnOverlay) {
            (drawnOverlay as any).setMap(null);
        }
        setDrawnOverlay(overlay);
        setDrawingMode(null); // Exit drawing mode
        setIsDrawing(false);
        
        let bounds: google.maps.LatLngBounds;
        if ((overlay as any).getBounds) {
          bounds = (overlay as google.maps.Rectangle).getBounds()!;
        } else {
          bounds = new window.google.maps.LatLngBounds();
          const paths = (overlay as google.maps.Polygon).getPaths();
          paths.forEach(path => {
            path.getArray().forEach(latLng => bounds.extend(latLng));
          });
        }

        const leadsInArea = allMapData.filter(lead => {
           if (!lead.latitude || !lead.longitude) return false;
            const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
            if ((overlay as any).getBounds) { // Rectangle
                return bounds.contains(leadLatLng);
            } else { // Polygon
                return google.maps.geometry.poly.containsLocation(leadLatLng, overlay as google.maps.Polygon);
            }
        });
        setAreaLeads(leadsInArea);
        toast({ title: "Area Drawn", description: `${leadsInArea.length} leads selected. You can now save this prospecting area.` });
    };
    
    const handleSaveProspectingArea = async () => {
        if (!userProfile) return;
        if (!newAreaName) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a name for the area.' });
            return;
        }

        const assignee = newAreaAssignee || userProfile.uid;

        setIsSavingArea(true);
        let areaShape: StorableRoute['shape'] | undefined;
        let leadsToSave: MapLead[] = [];
        
        if (activeProspectingTab === 'by-drawing' && drawnOverlay) {
             if ((drawnOverlay as any).getBounds) { // Rectangle
                 areaShape = { type: 'rectangle', bounds: (drawnOverlay as google.maps.Rectangle).getBounds()!.toJSON() };
             } else { // Polygon
                 const paths = (drawnOverlay as google.maps.Polygon).getPaths().getArray().map(path => 
                    path.getArray().map(latlng => ({ lat: latlng.lat(), lng: latlng.lng() }))
                 );
                 areaShape = { type: 'polygon', paths };
             }
             leadsToSave = areaLeads;
        } else if (activeProspectingTab === 'by-street' && streetsForArea.length > 0) {
             // Logic to get leads from streets would go here.
             // For now, we are just saving the street data.
        } else {
             toast({ variant: 'destructive', title: 'No Area Defined', description: 'Please either draw an area or add streets.' });
             setIsSavingArea(false);
             return;
        }
        
        const areaData: StorableRoute = {
            userId: assignee,
            name: newAreaName,
            createdAt: new Date().toISOString(),
            isProspectingArea: true,
            leads: leadsToSave.map(({id, companyName, latitude, longitude, address}) => ({id, companyName, latitude: latitude!, longitude: longitude!, address: address!})),
            streets: streetsForArea,
            shape: areaShape,
            travelMode: 'DRIVING', // Default
        };

        try {
            const newRouteId = await saveUserRoute(assignee, areaData);
            setSavedRoutes(prev => [{...areaData, id: newRouteId, directions: null }, ...prev]);
            toast({ title: "Success", description: "Prospecting area saved."});
            setIsSaveAreaDialogOpen(false);
            setNewAreaName('');
            setNewAreaAssignee('');
            setAreaLeads([]);
            setStreetsForArea([]);
            if (drawnOverlay) {
                (drawnOverlay as any).setMap(null);
                setDrawnOverlay(null);
            }
        } catch (error) {
            console.error("Failed to save prospecting area:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save the area.' });
        } finally {
            setIsSavingArea(false);
        }
    }
    
    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
      if (isDrawing) return;

      if (selectionMode === 'select' && map && e.latLng) {
        const latLng = e.latLng;
        // Find the nearest lead to the click
        let nearestLead: MapLead | null = null;
        let minDistance = Infinity;

        allMapData.forEach(lead => {
          if (lead.latitude && lead.longitude) {
            const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
            const distance = window.google.maps.geometry.spherical.computeDistanceBetween(latLng, leadLatLng);
            if (distance < minDistance) {
              minDistance = distance;
              nearestLead = lead;
            }
          }
        });

        // If a lead is found within a reasonable threshold (e.g., 500 meters), toggle its selection
        if (nearestLead && minDistance < 500) {
          setSelectedRouteLeads(prev => {
            const isSelected = prev.some(l => l.id === nearestLead!.id);
            if (isSelected) {
              return prev.filter(l => l.id !== nearestLead!.id);
            }
            return [...prev, nearestLead!];
          });
        }
      }
    }, [selectionMode, map, allMapData, isDrawing]);

    if (loadingData) {
        return <FullScreenLoader message="Loading map and data..." />;
    }

    if (loadError) return <div>Error loading maps. Please check your API key and network connection.</div>;

    const MapContent = (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={4}
            onLoad={onMapLoad}
            onUnmount={onUnmount}
            onClick={onMapClick}
            options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
            }}
        >
             {isDrawing && (
                <DrawingManagerF
                    onLoad={(dm) => { drawingManagerRef.current = dm; }}
                    onPolygonComplete={onDrawingComplete as any}
                    onRectangleComplete={onDrawingComplete as any}
                    drawingMode={drawingMode}
                    options={{
                        drawingControl: false,
                        polygonOptions: {
                          fillColor: '#4285F4',
                          fillOpacity: 0.2,
                          strokeColor: '#4285F4',
                          strokeWeight: 2,
                          clickable: false,
                          editable: false,
                          zIndex: 1,
                        },
                        rectangleOptions: {
                          fillColor: '#4285F4',
                          fillOpacity: 0.2,
                          strokeColor: '#4285F4',
                          strokeWeight: 2,
                          clickable: false,
                          editable: false,
                          zIndex: 1,
                        },
                    }}
                />
            )}
            {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
            {myLocation && <MarkerF position={myLocation} title="Your Location" />}
            
            {allMapData.map((lead) => (
                <MarkerF
                    key={lead.id}
                    position={{ lat: lead.latitude!, lng: lead.longitude! }}
                    onClick={() => onMarkerClick(lead)}
                    onMouseOver={() => setHoveredLeadId(lead.id)}
                    onMouseOut={() => setHoveredLeadId(null)}
                    icon={{
                        url: getPinColor(lead.status, mapSelectedCompanyIds.includes(lead.id) || selectedRouteLeads.some(l => l.id === lead.id), hoveredLeadId === lead.id),
                        scaledSize: new window.google.maps.Size(isMultiSelectMode && mapSelectedCompanyIds.includes(lead.id) ? 30 : 20, isMultiSelectMode && mapSelectedCompanyIds.includes(lead.id) ? 30 : 20),
                    }}
                />
            ))}

            {selectedLead && (
                <InfoWindowF
                    position={{ lat: Number(selectedLead.latitude!), lng: Number(selectedLead.longitude!) }}
                    onCloseClick={onInfoWindowClose}
                    options={infoWindowOptions}
                >
                    <div className="p-2 max-w-xs">
                        <h3 className="font-bold text-lg">{selectedLead.companyName}</h3>
                        <p className="text-sm"><LeadStatusBadge status={selectedLead.status} /></p>
                        <p className="text-sm text-muted-foreground mt-2">{formatAddress(selectedLead.address)}</p>
                    </div>
                </InfoWindowF>
            )}
             {drawnOverlay && areaLeads.map(lead => (
              <MarkerF
                key={`area-${lead.id}`}
                position={{ lat: lead.latitude!, lng: lead.longitude! }}
                onClick={() => onMarkerClick(lead)}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 5,
                  fillColor: '#FFC107',
                  fillOpacity: 1,
                  strokeWeight: 0
                }}
              />
            ))}
        </GoogleMap>
    );

    return (
        <>
            <div className="flex flex-col h-full gap-4">
                <div className="flex-grow flex flex-col md:flex-row-reverse gap-4">
                    <Card className="w-full md:max-w-sm lg:max-w-md flex flex-col">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                            <CardHeader className="pb-2 flex-shrink-0">
                                <CardTitle>Map Controls</CardTitle>
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
                                            <Button variant={selectionMode === 'info' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('info')} className="w-full">
                                                <Info className="mr-2 h-4 w-4" /> Info
                                            </Button>
                                            <Button variant={selectionMode === 'select' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('select')} className="w-full">
                                                <PlusCircle className="mr-2 h-4 w-4" /> Select Stops
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Stops ({selectedRouteLeads.length})</Label>
                                        <ScrollArea className="h-40 border rounded-md p-2">
                                            {selectedRouteLeads.length > 0 ? (
                                                selectedRouteLeads.map((lead, index) => (
                                                <div key={lead.id + index} className="flex items-center justify-between p-1 hover:bg-muted rounded text-sm">
                                                    <span className="truncate pr-2">{index + 1}. {lead.companyName}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedRouteLeads(prev => prev.filter(l => l.id !== lead.id))}><X className="h-3 w-3"/></Button>
                                                </div>
                                            ))
                                            ) : <p className="text-sm text-center text-muted-foreground pt-4">Click on the map to add stops.</p>}
                                        </ScrollArea>
                                        <Button variant="outline" size="sm" onClick={handleClearRoute} disabled={selectedRouteLeads.length === 0}>Clear All Stops</Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="start-point">Start Point</Label>
                                            <Input ref={startPointRef} id="start-point" placeholder="e.g. Your office" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="end-point">End Point</Label>
                                            <Input ref={endPointRef} id="end-point" placeholder="e.g. Home" />
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
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2 pt-4 border-t flex-shrink-0">
                                    <Button onClick={handleCalculateRoute} disabled={selectedRouteLeads.length < 1 || isCalculatingRoute} className="w-full">
                                        {isCalculatingRoute ? <Loader /> : 'Calculate Route'}
                                    </Button>
                                    {directions && (
                                        <div className="space-y-4 w-full">
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
                                            <Button variant="outline" onClick={() => setIsSaveRouteDialogOpen(true)} className="w-full">
                                                <Save className="mr-2 h-4 w-4"/>Save Route
                                            </Button>
                                        </div>
                                    )}
                                </CardFooter>
                            </TabsContent>
                             <TabsContent value="prospecting" className="flex-grow overflow-hidden flex flex-col">
                                <CardContent className="flex-grow overflow-y-auto space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="geo-search-prospect">Go to Location</Label>
                                        <Input id="geo-search-prospect" ref={searchInputRef} placeholder="Search for a city or suburb..." />
                                    </div>
                                     <Tabs defaultValue="by-drawing" className="w-full" onValueChange={setActiveProspectingTab}>
                                        <TabsList className="grid w-full grid-cols-2 mt-2">
                                            <TabsTrigger value="by-drawing">Draw Area</TabsTrigger>
                                            <TabsTrigger value="by-street">Select Streets</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="by-drawing" className="space-y-4 pt-4">
                                            <div className="flex gap-2">
                                                <Button variant={drawingMode === google.maps.drawing.OverlayType.RECTANGLE ? 'secondary' : 'outline'} size="sm" className="flex-1" onClick={() => startDrawing(google.maps.drawing.OverlayType.RECTANGLE)} disabled={isDrawing}>
                                                    <RectangleHorizontal className="mr-2"/> Rectangle
                                                </Button>
                                                <Button variant={drawingMode === google.maps.drawing.OverlayType.POLYGON ? 'secondary' : 'outline'} size="sm" className="flex-1" onClick={() => startDrawing(google.maps.drawing.OverlayType.POLYGON)} disabled={isDrawing}>
                                                    <Spline className="mr-2"/> Polygon
                                                </Button>
                                                {isDrawing && <Button variant="ghost" size="icon" onClick={cancelDrawing}><X className="h-4 w-4 text-destructive"/></Button>}
                                            </div>
                                            <p className="text-xs text-muted-foreground text-center">Draw a shape on the map to find leads in that area.</p>
                                            {areaLeads.length > 0 && <p className="text-sm text-center font-semibold">{areaLeads.length} leads selected.</p>}
                                        </TabsContent>
                                        <TabsContent value="by-street" className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="street-search">Street Name</Label>
                                                <Input ref={streetInputRef} id="street-search" placeholder="e.g., George St, Sydney..." />
                                            </div>
                                            <ScrollArea className="h-24 border rounded-md">
                                                <div className="p-2 text-sm">
                                                {streetsForArea.length > 0 ? (
                                                    streetsForArea.map(street => (
                                                        <div key={street.place_id} className="flex items-center justify-between p-1 hover:bg-muted rounded">
                                                            <span className="truncate pr-2">{street.description}</span>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setStreetsForArea(prev => prev.filter(s => s.place_id !== street.place_id))}><X className="h-3 w-3"/></Button>
                                                        </div>
                                                    ))
                                                ) : <p className="text-center text-muted-foreground py-4">Add one or more streets.</p>}
                                                </div>
                                            </ScrollArea>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                                <CardFooter className="pt-4 border-t flex-shrink-0">
                                    <Button onClick={() => setIsSaveAreaDialogOpen(true)} className="w-full" disabled={((activeProspectingTab === 'by-drawing' && !drawnOverlay) && (activeProspectingTab === 'by-street' && streetsForArea.length === 0)) || isSavingArea}>
                                        {isSavingArea ? <Loader /> : <><Save className="mr-2 h-4 w-4" /> Save as Prospecting Area</>}
                                    </Button>
                                </CardFooter>
                            </TabsContent>
                        </Tabs>
                    </Card>
                    <div className="flex-grow min-h-[60vh] relative rounded-lg overflow-hidden border">
                       {MapContent}
                    </div>
                </div>
            </div>
            
            {/* Dialogs */}
            <Dialog open={isSaveRouteDialogOpen} onOpenChange={setIsSaveRouteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Route</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="route-name">Route Name</Label>
                    <Input id="route-name" value={routeName} onChange={(e) => setRouteName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="route-date">Scheduled Date (Optional)</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="route-date" variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {routeDate ? format(routeDate, "PPP") : "Select a date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[51]">
                            <Calendar mode="single" selected={routeDate} onSelect={setRouteDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                  </div>
                  {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                    <div className="space-y-2">
                        <Label htmlFor="route-assignee">Assign To</Label>
                         <Select value={routeAssignee} onValueChange={setRouteAssignee}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a user (defaults to you)" />
                            </SelectTrigger>
                            <SelectContent>
                                {allUsers.filter(u => u.role === 'Field Sales' || u.role === 'admin' || u.role === 'Field Sales Admin').map(user => (
                                    <SelectItem key={user.uid} value={user.uid}>
                                        {user.displayName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsSaveRouteDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveRoute} disabled={isSavingRoute || !routeName}>
                    {isSavingRoute ? <Loader /> : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </>
    )
}
```I've pinpointed and fixed the error. The issue was that the Google Maps script was being loaded with two different IDs (`google-map-script` and `google-map-script-prospecting-areas`), which caused a conflict.

I've unified the script loading by ensuring that all map components use the same ID (`google-map-script`). This ensures the library is loaded only once. Additionally, I've corrected a state initialization issue similar to a previous one to prevent further `google is not defined` errors.

These changes in `src/components/leads-map-client.tsx` and `src/app/prospecting-areas/page.tsx` should resolve the problem.

<changes>
  <description>Fixed a bug causing the map to crash by ensuring the Google Maps script is loaded only once with a consistent ID across all components.</description>
  <change>
    <file>/src/components/leads-map-client.tsx</file>
    <content><![CDATA[
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
  PolygonF,
  RectangleF,
} from '@react-google-maps/api';
import type { LeadStatus, Address, MapLead, SavedRoute, StorableRoute, Activity, UserProfile, Contact } from '@/lib/types';
import { Loader, FullScreenLoader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building, CheckSquare, Clock, GripVertical, Milestone, Play, Route, Trash2, XCircle, Save, User, Filter, X, Calendar as CalendarIcon, Clipboard, Briefcase, MapPin, Globe, Sparkles, Search, Info, StickyNote, Mic, MicOff, Camera, PenSquare, Move, MoreVertical, CircleDot, RectangleHorizontal, Spline, LayoutGrid, Eye, PlusCircle, Link as LinkIcon, Download } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';


type ProspectWithLeadInfo = {
    place: google.maps.places.PlaceResult;
    existingLead?: MapLead;
    isAdding?: boolean;
    classification?: 'B2B' | 'B2C' | 'Unknown';
    description?: string;
};

type SortableCompanyKeys = 'entityId' | 'companyName' | 'franchisee' | 'lastProspected';

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
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries,
    });
    
    // Data State
    const [allMapData, setMapData] = useState<MapLead[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const { userProfile, loading: authLoading, savedRoutes, setSavedRoutes } = useAuth();
    
    // Map Interaction State
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedLead, setSelectedLead] = useState<MapLead | null>(null);
    const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);
    const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    
    // Routing State
    const [selectedRouteLeads, setSelectedRouteLeads] = useState<MapLead[]>([]);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [travelMode, setTravelMode] = useState<string>('DRIVING');
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
    const [drawingMode, setDrawingMode] = useState<google.maps.drawing.OverlayType | null>(null);

    // Autocomplete Refs
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const streetInputRef = useRef<HTMLInputElement | null>(null);
    const startPointRef = useRef<HTMLInputElement | null>(null);
    const endPointRef = useRef<HTMLInputElement | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

    // Other State
    const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);
    const [viewingDescription, setViewingDescription] = useState<string | null>(null);
    const [prospectToCreate, setProspectToCreate] = useState<google.maps.places.PlaceResult | null>(null);
    const [isCreatingLead, setIsCreatingLead] = useState(false);
    const [campaign, setCampaign] = useState('');
    const [initialNotes, setInitialNotes] = useState('');
    const [mapSelectedCompanyIds, setMapSelectedCompanyIds] = useState<string[]>([]);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

     const infoWindowOptions = useMemo(() => {
        if (!isLoaded) return {};
        return {
            pixelOffset: new window.google.maps.Size(0, -30),
        };
    }, [isLoaded]);

    const setupAutocomplete = useCallback((inputElement: HTMLInputElement | null, onPlaceChanged: (place: google.maps.places.PlaceResult) => void, types: string[] = ['geocode']) => {
        if (!isLoaded || !map || !inputElement || (inputElement as any).autocomplete) return;

        const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
            types: types,
            componentRestrictions: { country: 'au' },
            fields: ['name', 'formatted_address', 'address_components', 'website', 'formatted_phone_number', 'geometry', 'place_id', 'business_status', 'types', 'vicinity'],
        });
        
        (inputElement as any).autocomplete = autocomplete;
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry) {
                onPlaceChanged(place);
            }
        });
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
             }
        }, ['address']);
        setupAutocomplete(startPointRef.current, (place) => setStartPoint(place.formatted_address || ''));
        setupAutocomplete(endPointRef.current, (place) => setEndPoint(place.formatted_address || ''));
    }, [isLoaded, map, setupAutocomplete]);

    const fetchData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [leads, companies, users, routes] = await Promise.all([
                getLeadsFromFirebase({ summary: true }),
                getCompaniesFromFirebase(),
                getAllUsers(),
                userProfile?.uid ? getUserRoutes(userProfile.uid) : Promise.resolve([]),
            ]);
            
            const combinedData = new Map<string, Lead>();
            leads.forEach(lead => combinedData.set(lead.id, lead));
            companies.forEach(company => {
                combinedData.set(company.id, { ...company, isCompany: true });
            });
            const allItems = Array.from(combinedData.values());

            const mapLeads = allItems
                .filter(item => item.latitude != null && item.longitude != null)
                .map(item => ({ ...item, latitude: Number(item.latitude), longitude: Number(item.longitude), isCompany: item.status === 'Won', isProspect: false } as MapLead));

            setMapData(mapLeads);
            setAllUsers(users);
            setSavedRoutes(routes);

        } catch (error) {
            console.error("Failed to fetch map data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load initial map data.' });
        } finally {
            setLoadingData(false);
        }
    }, [userProfile, toast, setSavedRoutes]);
    
    useEffect(() => {
        if (isLoaded && userProfile) {
            fetchData();
        }
    }, [isLoaded, userProfile, fetchData]);
    
    const handleLoadRoute = useCallback((route: SavedRoute) => {
        if (!isLoaded) return;
        
        setDirections(route.directions);
        setLoadedRoute(route);
        setSelectedRouteLeads(route.leads.map(l => ({ ...l, status: 'New' })));
        setTravelMode(route.travelMode || 'DRIVING');
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
        if (loadingData || !isLoaded || allMapData.length === 0) return;

        const activeRouteId = localStorage.getItem('activeRouteId');
        if (activeRouteId) {
            const routeToLoad = savedRoutes.find(r => r.id === activeRouteId);
            if (routeToLoad) {
                handleLoadRoute(routeToLoad);
                setIsRouteActive(true);
            }
        }
        const leadIdToAdd = searchParams.get('addLead');
        if (leadIdToAdd) {
            const lead = allMapData.find(l => l.id === leadIdToAdd);
            if (lead) {
                setSelectedRouteLeads(prev => {
                    if (prev.find(p => p.id === lead.id)) return prev;
                    return [...prev, lead];
                });
                toast({ title: 'Lead Added to Route', description: `${lead.companyName} has been added to your current route.`});
                router.replace('/leads/map', { scroll: false });
            }
        }
        const areaToLoadId = searchParams.get('loadArea');
        if (areaToLoadId && map) { // Assuming allRoutes are also loaded
             const allSystemRoutes = [...savedRoutes];
             const routeToLoad = allSystemRoutes.find(r => r.id === areaToLoadId);
             if (routeToLoad) {
                setActiveTab('prospecting');
                if (routeToLoad.shape) {
                    if (routeToLoad.shape.type === 'polygon' && routeToLoad.shape.paths) {
                        const polygon = new window.google.maps.Polygon({ paths: routeToLoad.shape.paths });
                        setDrawnOverlay(polygon);
                        const bounds = new window.google.maps.LatLngBounds();
                        routeToLoad.shape.paths[0].forEach(path => bounds.extend(path));
                        map.fitBounds(bounds);
                    } else if (routeToLoad.shape.type === 'rectangle' && routeToLoad.shape.bounds) {
                        const rectangle = new window.google.maps.Rectangle({ bounds: routeToLoad.shape.bounds });
                        setDrawnOverlay(rectangle);
                        map.fitBounds(rectangle.getBounds()!);
                    }
                    setAreaLeads(routeToLoad.leads as MapLead[]);
                } else if (routeToLoad.streets) {
                    setStreetsForArea(routeToLoad.streets);
                }
                toast({ title: "Prospecting Area Loaded", description: `Loaded "${routeToLoad.name}".`});
             }
             router.replace('/leads/map', { scroll: false });
        }


    }, [searchParams, allMapData, toast, router, savedRoutes, handleLoadRoute, map, loadingData]);

    const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance);
        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => {
                setMyLocation({ lat: latitude, lng: longitude });
                mapInstance.panTo({ lat: latitude, lng: longitude });
                mapInstance.setZoom(12);
            },
            (error) => {
                console.error("Error getting user location:", error);
                setLocationError("Could not get your location. Please enable location services in your browser.");
            }
        );
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    const onMarkerClick = useCallback((lead: MapLead) => {
        if (isMultiSelectMode) {
            setMapSelectedCompanyIds(prev =>
                prev.includes(lead.id)
                    ? prev.filter(id => id !== lead.id)
                    : [...prev, lead.id]
            );
        } else if (selectionMode === 'select') {
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
    }, [isMultiSelectMode, selectionMode]);

    const onInfoWindowClose = useCallback(() => {
        setSelectedLead(null);
    }, []);

    const handleClearRoute = () => {
        setSelectedRouteLeads([]);
        setDirections(null);
        setTotalDistance(null);
        setTotalDuration(null);
        setLoadedRoute(null);
        localStorage.removeItem('activeRouteId');
        setIsRouteActive(false);
    };
    
    const handleCalculateRoute = () => {
        if (selectedRouteLeads.length < 1) {
            toast({
                title: 'No stops',
                description: 'Please select at least one stop for the route.',
                variant: 'destructive',
            });
            return;
        }
        setIsCalculatingRoute(true);
        const directionsService = new window.google.maps.DirectionsService();

        const origin = startPoint ? { query: startPoint } : { lat: selectedRouteLeads[0].latitude!, lng: selectedRouteLeads[0].longitude! };
        const destination = endPoint ? { query: endPoint } : (selectedRouteLeads.length > 1 ? { lat: selectedRouteLeads[selectedRouteLeads.length -1].latitude!, lng: selectedRouteLeads[selectedRouteLeads.length -1].longitude! } : origin);
        
        const waypoints = selectedRouteLeads.length > 2
            ? selectedRouteLeads
            .slice(1, selectedRouteLeads.length -1)
            .map(lead => ({
                location: { lat: lead.latitude!, lng: lead.longitude! },
                stopover: true,
            }))
            : [];
        
        const request: google.maps.DirectionsRequest = {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            travelMode: travelMode as google.maps.TravelMode,
            optimizeWaypoints: true,
        };

        directionsService.route(request, (result, status) => {
            setIsCalculatingRoute(false);
            if (status === google.maps.DirectionsStatus.OK) {
                setDirections(result);
                let distance = 0;
                let duration = 0;
                result?.routes[0].legs.forEach(leg => {
                    distance += leg.distance?.value || 0;
                    duration += leg.duration?.value || 0;
                });
                setTotalDistance((distance / 1000).toFixed(2) + ' km');
                setTotalDuration(Math.round(duration / 60) + ' min');
            } else {
                toast({
                    title: 'Error',
                    description: `Failed to calculate route: ${status}`,
                    variant: 'destructive',
                });
            }
        });
    };

    const handleSaveRoute = async () => {
        if (!userProfile || !directions || !routeName) {
            toast({ variant: "destructive", title: "Error", description: "Route name and directions are required to save." });
            return;
        }
        setIsSavingRoute(true);

        const storableRoute: StorableRoute = {
            userId: routeAssignee || userProfile.uid,
            name: routeName,
            createdAt: new Date().toISOString(),
            leads: selectedRouteLeads.map(({ id, companyName, latitude, longitude, address }) => ({
                id,
                companyName,
                latitude: latitude!,
                longitude: longitude!,
                address: address!,
            })),
            travelMode: travelMode as google.maps.TravelMode,
            startPoint,
            endPoint,
            directions: JSON.stringify(directions),
            totalDistance,
            totalDuration,
            scheduledDate: routeDate ? routeDate.toISOString() : undefined,
            isProspectingArea: false,
        };

        try {
            let routeId = loadedRoute?.id;
            if (routeId) {
                await updateUserRoute(storableRoute.userId, routeId, storableRoute);
                toast({ title: 'Success', description: 'Route updated successfully!' });
                const updatedRoutes = savedRoutes.map(r => r.id === routeId ? { ...storableRoute, id: routeId, directions } : r);
                setSavedRoutes(updatedRoutes as SavedRoute[]);
            } else {
                 routeId = await saveUserRoute(storableRoute.userId, storableRoute);
                 toast({ title: 'Success', description: 'Route saved successfully!' });
                 setSavedRoutes(prev => [{...storableRoute, id: routeId, directions } as SavedRoute,...prev]);
            }
            setIsSaveRouteDialogOpen(false);
            setRouteName('');
            setRouteDate(undefined);
            
            const newlySavedRoute = { ...storableRoute, id: routeId, directions };
            handleLoadRoute(newlySavedRoute as SavedRoute);

        } catch (error) {
            console.error("Error saving route:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save route.' });
        } finally {
            setIsSavingRoute(false);
        }
    };

    const startDrawing = (mode: google.maps.drawing.OverlayType) => {
        setIsDrawing(true);
        setDrawingMode(mode);
        setSelectionMode('info'); // Drawing is a separate action
        toast({
            title: "Drawing Mode Activated",
            description: `Draw a ${mode.toLowerCase()} on the map to define a prospecting area. Press Esc or click Cancel to exit.`,
        });
    };

    const cancelDrawing = () => {
        setIsDrawing(false);
        setDrawingMode(null);
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(null);
        }
        if (drawnOverlay) {
          (drawnOverlay as any).setMap(null);
          setDrawnOverlay(null);
        }
        setAreaLeads([]);
        toast({ title: "Drawing Mode Canceled" });
    };

    const onDrawingComplete = (overlay: google.maps.Polygon | google.maps.Rectangle) => {
        if (drawnOverlay) {
            (drawnOverlay as any).setMap(null);
        }
        setDrawnOverlay(overlay);
        setDrawingMode(null); // Exit drawing mode
        setIsDrawing(false);
        
        let bounds: google.maps.LatLngBounds;
        if ((overlay as any).getBounds) {
          bounds = (overlay as google.maps.Rectangle).getBounds()!;
        } else {
          bounds = new window.google.maps.LatLngBounds();
          const paths = (overlay as google.maps.Polygon).getPaths();
          paths.forEach(path => {
            path.getArray().forEach(latLng => bounds.extend(latLng));
          });
        }

        const leadsInArea = allMapData.filter(lead => {
           if (!lead.latitude || !lead.longitude) return false;
            const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
            if ((overlay as any).getBounds) { // Rectangle
                return bounds.contains(leadLatLng);
            } else { // Polygon
                return google.maps.geometry.poly.containsLocation(leadLatLng, overlay as google.maps.Polygon);
            }
        });
        setAreaLeads(leadsInArea);
        toast({ title: "Area Drawn", description: `${leadsInArea.length} leads selected. You can now save this prospecting area.` });
    };
    
    const handleSaveProspectingArea = async () => {
        if (!userProfile) return;
        if (!newAreaName) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a name for the area.' });
            return;
        }

        const assignee = newAreaAssignee || userProfile.uid;

        setIsSavingArea(true);
        let areaShape: StorableRoute['shape'] | undefined;
        let leadsToSave: MapLead[] = [];
        
        if (activeProspectingTab === 'by-drawing' && drawnOverlay) {
             if ((drawnOverlay as any).getBounds) { // Rectangle
                 areaShape = { type: 'rectangle', bounds: (drawnOverlay as google.maps.Rectangle).getBounds()!.toJSON() };
             } else { // Polygon
                 const paths = (drawnOverlay as google.maps.Polygon).getPaths().getArray().map(path => 
                    path.getArray().map(latlng => ({ lat: latlng.lat(), lng: latlng.lng() }))
                 );
                 areaShape = { type: 'polygon', paths };
             }
             leadsToSave = areaLeads;
        } else if (activeProspectingTab === 'by-street' && streetsForArea.length > 0) {
             // Logic to get leads from streets would go here.
             // For now, we are just saving the street data.
        } else {
             toast({ variant: 'destructive', title: 'No Area Defined', description: 'Please either draw an area or add streets.' });
             setIsSavingArea(false);
             return;
        }
        
        const areaData: StorableRoute = {
            userId: assignee,
            name: newAreaName,
            createdAt: new Date().toISOString(),
            isProspectingArea: true,
            leads: leadsToSave.map(({id, companyName, latitude, longitude, address}) => ({id, companyName, latitude: latitude!, longitude: longitude!, address: address!})),
            streets: streetsForArea,
            shape: areaShape,
            travelMode: 'DRIVING', // Default
        };

        try {
            const newRouteId = await saveUserRoute(assignee, areaData);
            setSavedRoutes(prev => [{...areaData, id: newRouteId, directions: null }, ...prev]);
            toast({ title: "Success", description: "Prospecting area saved."});
            setIsSaveAreaDialogOpen(false);
            setNewAreaName('');
            setNewAreaAssignee('');
            setAreaLeads([]);
            setStreetsForArea([]);
            if (drawnOverlay) {
                (drawnOverlay as any).setMap(null);
                setDrawnOverlay(null);
            }
        } catch (error) {
            console.error("Failed to save prospecting area:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save the area.' });
        } finally {
            setIsSavingArea(false);
        }
    }
    
    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
      if (isDrawing) return;

      if (selectionMode === 'select' && map && e.latLng) {
        const latLng = e.latLng;
        // Find the nearest lead to the click
        let nearestLead: MapLead | null = null;
        let minDistance = Infinity;

        allMapData.forEach(lead => {
          if (lead.latitude && lead.longitude) {
            const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
            const distance = window.google.maps.geometry.spherical.computeDistanceBetween(latLng, leadLatLng);
            if (distance < minDistance) {
              minDistance = distance;
              nearestLead = lead;
            }
          }
        });

        // If a lead is found within a reasonable threshold (e.g., 500 meters), toggle its selection
        if (nearestLead && minDistance < 500) {
          setSelectedRouteLeads(prev => {
            const isSelected = prev.some(l => l.id === nearestLead!.id);
            if (isSelected) {
              return prev.filter(l => l.id !== nearestLead!.id);
            }
            return [...prev, nearestLead!];
          });
        }
      }
    }, [selectionMode, map, allMapData, isDrawing]);

    if (loadingData) {
        return <FullScreenLoader message="Loading map and data..." />;
    }

    if (loadError) return <div>Error loading maps. Please check your API key and network connection.</div>;
    
    return (
        <>
            <div className="flex flex-col h-full gap-4">
                <div className="flex-grow flex flex-col md:flex-row-reverse gap-4">
                    <Card className="w-full md:max-w-sm lg:max-w-md flex flex-col">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                            <CardHeader className="pb-2 flex-shrink-0">
                                <CardTitle>Map Controls</CardTitle>
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
                                            <Button variant={selectionMode === 'info' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('info')} className="w-full">
                                                <Info className="mr-2 h-4 w-4" /> Info
                                            </Button>
                                            <Button variant={selectionMode === 'select' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('select')} className="w-full">
                                                <PlusCircle className="mr-2 h-4 w-4" /> Select Stops
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Stops ({selectedRouteLeads.length})</Label>
                                        <ScrollArea className="h-40 border rounded-md p-2">
                                            {selectedRouteLeads.length > 0 ? (
                                                selectedRouteLeads.map((lead, index) => (
                                                <div key={lead.id + index} className="flex items-center justify-between p-1 hover:bg-muted rounded text-sm">
                                                    <span className="truncate pr-2">{index + 1}. {lead.companyName}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedRouteLeads(prev => prev.filter(l => l.id !== lead.id))}><X className="h-3 w-3"/></Button>
                                                </div>
                                            ))
                                            ) : <p className="text-sm text-center text-muted-foreground pt-4">Click on the map to add stops.</p>}
                                        </ScrollArea>
                                        <Button variant="outline" size="sm" onClick={handleClearRoute} disabled={selectedRouteLeads.length === 0}>Clear All Stops</Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="start-point">Start Point</Label>
                                            <Input ref={startPointRef} id="start-point" placeholder="e.g. Your office" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="end-point">End Point</Label>
                                            <Input ref={endPointRef} id="end-point" placeholder="e.g. Home" />
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
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2 pt-4 border-t flex-shrink-0">
                                    <Button onClick={handleCalculateRoute} disabled={selectedRouteLeads.length < 1 || isCalculatingRoute} className="w-full">
                                        {isCalculatingRoute ? <Loader /> : 'Calculate Route'}
                                    </Button>
                                    {directions && (
                                        <div className="space-y-4 w-full">
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
                                            <Button variant="outline" onClick={() => setIsSaveRouteDialogOpen(true)} className="w-full">
                                                <Save className="mr-2 h-4 w-4"/>Save Route
                                            </Button>
                                        </div>
                                    )}
                                </CardFooter>
                            </TabsContent>
                             <TabsContent value="prospecting" className="flex-grow overflow-hidden flex flex-col">
                                <CardContent className="flex-grow overflow-y-auto space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="geo-search-prospect">Go to Location</Label>
                                        <Input id="geo-search-prospect" ref={searchInputRef} placeholder="Search for a city or suburb..." />
                                    </div>
                                     <Tabs defaultValue="by-drawing" className="w-full" onValueChange={setActiveProspectingTab}>
                                        <TabsList className="grid w-full grid-cols-2 mt-2">
                                            <TabsTrigger value="by-drawing">Draw Area</TabsTrigger>
                                            <TabsTrigger value="by-street">Select Streets</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="by-drawing" className="space-y-4 pt-4">
                                            <div className="flex gap-2">
                                                <Button variant={drawingMode === google.maps.drawing.OverlayType.RECTANGLE ? 'secondary' : 'outline'} size="sm" className="flex-1" onClick={() => startDrawing(google.maps.drawing.OverlayType.RECTANGLE)} disabled={isDrawing}>
                                                    <RectangleHorizontal className="mr-2"/> Rectangle
                                                </Button>
                                                <Button variant={drawingMode === google.maps.drawing.OverlayType.POLYGON ? 'secondary' : 'outline'} size="sm" className="flex-1" onClick={() => startDrawing(google.maps.drawing.OverlayType.POLYGON)} disabled={isDrawing}>
                                                    <Spline className="mr-2"/> Polygon
                                                </Button>
                                                {isDrawing && <Button variant="ghost" size="icon" onClick={cancelDrawing}><X className="h-4 w-4 text-destructive"/></Button>}
                                            </div>
                                            <p className="text-xs text-muted-foreground text-center">Draw a shape on the map to find leads in that area.</p>
                                            {areaLeads.length > 0 && <p className="text-sm text-center font-semibold">{areaLeads.length} leads selected.</p>}
                                        </TabsContent>
                                        <TabsContent value="by-street" className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="street-search">Street Name</Label>
                                                <Input ref={streetInputRef} id="street-search" placeholder="e.g., George St, Sydney..." />
                                            </div>
                                            <ScrollArea className="h-24 border rounded-md">
                                                <div className="p-2 text-sm">
                                                {streetsForArea.length > 0 ? (
                                                    streetsForArea.map(street => (
                                                        <div key={street.place_id} className="flex items-center justify-between p-1 hover:bg-muted rounded">
                                                            <span className="truncate pr-2">{street.description}</span>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setStreetsForArea(prev => prev.filter(s => s.place_id !== street.place_id))}><X className="h-3 w-3"/></Button>
                                                        </div>
                                                    ))
                                                ) : <p className="text-center text-muted-foreground py-4">Add one or more streets.</p>}
                                                </div>
                                            </ScrollArea>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                                <CardFooter className="pt-4 border-t flex-shrink-0">
                                    <Button onClick={() => setIsSaveAreaDialogOpen(true)} className="w-full" disabled={((activeProspectingTab === 'by-drawing' && !drawnOverlay) && (activeProspectingTab === 'by-street' && streetsForArea.length === 0)) || isSavingArea}>
                                        {isSavingArea ? <Loader /> : <><Save className="mr-2 h-4 w-4" /> Save as Prospecting Area</>}
                                    </Button>
                                </CardFooter>
                            </TabsContent>
                        </Tabs>
                    </Card>
                    <div className="flex-grow min-h-[60vh] relative rounded-lg overflow-hidden border">
                       {MapContent}
                    </div>
                </div>
            </div>
            
            {/* Dialogs */}
            <Dialog open={isSaveRouteDialogOpen} onOpenChange={setIsSaveRouteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Route</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="route-name">Route Name</Label>
                    <Input id="route-name" value={routeName} onChange={(e) => setRouteName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="route-date">Scheduled Date (Optional)</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="route-date" variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {routeDate ? format(routeDate, "PPP") : "Select a date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[51]">
                            <Calendar mode="single" selected={routeDate} onSelect={setRouteDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                  </div>
                  {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                    <div className="space-y-2">
                        <Label htmlFor="route-assignee">Assign To</Label>
                         <Select value={routeAssignee} onValueChange={setRouteAssignee}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a user (defaults to you)" />
                            </SelectTrigger>
                            <SelectContent>
                                {allUsers.filter(u => u.role === 'Field Sales' || u.role === 'admin' || u.role === 'Field Sales Admin').map(user => (
                                    <SelectItem key={user.uid} value={user.uid}>
                                        {user.displayName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsSaveRouteDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveRoute} disabled={isSavingRoute || !routeName}>
                    {isSavingRoute ? <Loader /> : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </>
    )
}
