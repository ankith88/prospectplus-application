

'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  GoogleMap,
  MarkerF,
  InfoWindowF,
  DirectionsRenderer,
  DrawingManagerF,
} from '@react-google-maps/api';
import type { LeadStatus, Address, MapLead, SavedRoute, StorableRoute, Activity, UserProfile, Contact, Lead } from '@/lib/types';
import { Loader, FullScreenLoader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building, CheckSquare, Clock, GripVertical, Milestone, Play, Route, Trash2, XCircle, Save, User, Filter, X, Calendar as CalendarIcon, Clipboard, Briefcase, MapPin, Globe, Sparkles, Search, Info, StickyNote, Mic, MicOff, Camera, PenSquare, Move, MoreVertical, CircleDot, RectangleHorizontal, Spline, Map as MapIcon, ArrowUpDown, ExternalLink, PlusCircle, Download, Eye, SlidersHorizontal, Satellite, MousePointerClick } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAllUserRoutes, getUserRoutes, getAllUsers, getCompaniesFromFirebase, saveUserRoute, updateUserRoute, deleteUserRoute, getLeadsFromFirebase, createNewLead, checkForDuplicateLead, updateLeadDetails } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay } from 'date-fns';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from './ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';


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
    
    // Map State
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedLead, setSelectedLead] = useState<MapLead | null>(null);
    const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);
    const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [searchedLocation, setSearchedLocation] = useState<google.maps.LatLngLiteral | null>(null);

    // Route Planning State
    const [selectedRouteLeads, setSelectedRouteLeads] = useState<MapLead[]>([]);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [travelMode, setTravelMode] = useState<google.maps.TravelMode>('DRIVING');
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
    const [streetsForArea, setStreetsForArea] = useState<{ place_id: string; description: string; latitude: number; longitude: number; }[]>([]);
    const [prospects, setProspects] = useState<ProspectWithLeadInfo[]>([])
    const [isProspectsDialogOpen, setIsProspectsDialogOpen] = useState(false);
    const [isSearchingNearby, setIsSearchingNearby] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState('prospecting');
    const [selectionMode, setSelectionMode] = useState<'info' | 'select'>('info');

    // Autocomplete Refs
    const startPointRef = useRef<HTMLInputElement | null>(null);
    const endPointRef = useRef<HTMLInputElement | null>(null);
    const geoSearchInputNodeRef = useRef<HTMLInputElement | null>(null);

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
    
    const [drawingMode, setDrawingMode] = useState<google.maps.drawing.OverlayType | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

    const [mapFilters, setMapFilters] = useState({
        companyName: '',
        franchisee: [] as string[],
        status: [] as string[],
        leadType: 'all',
        dialerAssigned: [] as string[],
        state: [] as string[],
        campaign: 'all',
    });
    
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
            setSavedRoutes(fetchedRoutes as SavedRoute[]);
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
        if (loadingData || !isLoaded || savedRoutes.length === 0) return;

        const activeRouteId = localStorage.getItem('activeRouteId');
        const routeToLoadId = searchParams.get('routeId');
        
        const targetRouteId = routeToLoadId || activeRouteId;

        if (targetRouteId) {
            const routeToLoad = savedRoutes.find(r => r.id === targetRouteId);
            if (routeToLoad) {
                handleLoadRoute(routeToLoad);
                if (routeToLoadId) {
                    router.replace('/leads/map', { scroll: false });
                }
            }
        }
    }, [savedRoutes, isLoaded, loadingData, searchParams, router, handleLoadRoute]);

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

  const geoSearchInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node !== null && isLoaded && map) {
        const autocomplete = new window.google.maps.places.Autocomplete(node, {
            types: ['geocode'],
            componentRestrictions: { country: 'au' },
        });
        autocomplete.setFields(['geometry']);
        
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.viewport) {
                map.fitBounds(place.geometry.viewport);
            } else if (place.geometry?.location) {
                map.panTo(place.geometry.location);
                map.setZoom(15);
            }
        });
    }
  }, [isLoaded, map]);

    const streetSearchInputCallbackRef = useCallback((node: HTMLInputElement | null) => {
        if (node && isLoaded && map) {
            if ((node as any).autocomplete) return;
    
            const autocomplete = new window.google.maps.places.Autocomplete(node, {
                types: ['address'],
                componentRestrictions: { country: 'au' },
            });
            autocomplete.setFields(['place_id', 'formatted_address', 'geometry']);
    
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (place.place_id && place.formatted_address && place.geometry?.location) {
                    const newStreet = { 
                        place_id: place.place_id, 
                        description: place.formatted_address,
                        latitude: place.geometry.location.lat(),
                        longitude: place.geometry.location.lng(),
                    };
                    
                    setStreetsForArea(prev => {
                        if (prev.some(s => s.place_id === newStreet.place_id)) {
                            return prev;
                        }
                        return [...prev, newStreet];
                    });
                    
                    if (place.geometry?.location) {
                        const location = place.geometry.location.toJSON();
                        setSearchedLocation(location);
                        map.panTo(location);
                        map.setZoom(17);
                    }
                    if (node) {
                        node.value = '';
                    }
                }
            });
            (node as any).autocomplete = autocomplete;
        }
    }, [isLoaded, map]);


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
        setSearchedLocation(null);
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
        if (!isLoaded || !window.google) return;
    
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
    }, [isLoaded, map, allMapData, selectionMode]);


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
    }, [selectionMode, isMultiSelectMode]);

    const onInfoWindowClose = useCallback(() => {
        setSelectedLead(null);
    }, []);

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
                routeId = await saveUserRoute(assigneeId, storableRoute);
                const newRoute: SavedRoute = { ...storableRoute, id: routeId, directions, userName: allUsers.find(u => u.uid === assigneeId)?.displayName || 'Unknown' }
                setSavedRoutes(prev => [...prev, newRoute]);
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
        if (streetsForArea.length === 0) {
            toast({ variant: 'destructive', title: 'No Streets', description: 'Please add at least one street to the area.' });
            return;
        }
        if (!userProfile?.uid) {
             toast({ variant: 'destructive', title: 'Authentication Error', description: 'Could not identify user.' });
             return;
        }

        setIsSavingArea(true);
        try {
            const assigneeId = (userProfile.role === 'admin' || userProfile.role === 'Field Sales Admin') && newAreaAssignee ? newAreaAssignee : userProfile.uid;

            const areaData: Omit<StorableRoute, 'id'> = {
                userId: assigneeId,
                name: newAreaName,
                createdAt: new Date().toISOString(),
                leads: [],
                travelMode: 'DRIVING',
                isProspectingArea: true,
                streets: streetsForArea,
            };

            const newId = await saveUserRoute(assigneeId, areaData);
            const newRoute: SavedRoute = { ...areaData, id: newId, directions: null, userName: allUsers.find(u => u.uid === assigneeId)?.displayName || 'Unknown' }
            setSavedRoutes(prev => [...prev, newRoute]);
            
            toast({ title: 'Success', description: 'Prospecting area saved successfully.' });
            
            // Reset state
            setNewAreaName('');
            setNewAreaAssignee('');
            setStreetsForArea([]);
            setIsSaveAreaDialogOpen(false);

        } catch (error) {
            console.error("Failed to save prospecting area:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'An error occurred while saving the area.' });
        } finally {
            setIsSavingArea(false);
        }
    };
    
    const handleAddLeadClick = async (place: google.maps.places.PlaceResult) => {
        if (!place.website) {
            openCreateLeadPage(place);
            return;
        }
        
        try {
            const prospectResult = await aiProspectWebsiteTool({ leadId: 'new-lead-prospecting', websiteUrl: place.website });
            const hasEmail = prospectResult.contacts?.some(c => c.email);
            const hasPhone = prospectResult.contacts?.some(c => c.phone && c.phone !== 'N/A') || place.formatted_phone_number;
    
            if (hasEmail && hasPhone) {
                setProspectToCreate(place);
            } else {
                openCreateLeadPage(place, prospectResult.contacts);
            }
    
        } catch (error) {
            console.error('Error during prospecting, redirecting to manual entry:', error);
            openCreateLeadPage(place);
        }
      };
      
        const openCreateLeadPage = (place: google.maps.places.PlaceResult, contacts?: Contact[]) => {
            const params = new URLSearchParams();
            if (place.name) params.set('companyName', place.name);
            if (place.website) params.set('websiteUrl', place.website);
            if (place.formatted_phone_number) params.set('phone', place.formatted_phone_number);
            
            if (place.address_components) {
                const get = (type: string) => place.address_components?.find(c => c.types.includes(type))?.long_name || '';
                const street_number = get('street_number');
                const route = get('route');
                params.set('street', `${street_number} ${route}`.trim());
                params.set('city', get('locality') || get('postal_town'));
                params.set('state', get('administrative_area_level_1'));
                params.set('zip', get('postal_code'));
            } else if (place.vicinity) {
                params.set('street', place.vicinity);
            }
            
            if (place.geometry?.location) {
                params.set('lat', place.geometry.location.lat().toString());
                params.set('lng', place.geometry.location.lng().toString());
            }
    
            const primaryContact = contacts?.[0];
            if (primaryContact?.email) {
                // Even if one is missing, we pass what we have. The form will require the rest.
            }
    
            window.open(`/leads/new?${params.toString()}`, '_blank');
            toast({ title: "Complete Lead Details", description: "Please fill in the missing email or phone number." });
        };
    
    
      const handleCreateLeadFromProspect = async () => {
        if (!prospectToCreate || !userProfile?.displayName) return;
    
        const place = prospectToCreate;
        if (!place.name || !place.vicinity || !place.geometry?.location) {
            toast({ variant: 'destructive', title: 'Error', description: 'Prospect is missing required information (name, address, location).' });
            return;
        }
    
        const placeId = place.place_id;
        if (!placeId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Prospect is missing a Place ID.' });
            return;
        }
    
        const duplicateId = await checkForDuplicateLead(place.name, place.formatted_phone_number || '');
        if (duplicateId) {
            setDuplicateLeadId(duplicateId);
            setProspectToCreate(null);
            return;
        }
    
        setIsCreatingLead(true);
        setProspects(prev => prev.map(p => p.place.place_id === placeId ? { ...p, isAdding: true } : p));
        
        let leadCampaign = campaign;
        if (userProfile?.role === 'Field Sales' || userProfile?.role === 'Field Sales Admin') {
            leadCampaign = 'Door-to-Door';
        }
        if (!leadCampaign && (userProfile?.role === 'user' || userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin')) {
             toast({ variant: 'destructive', title: 'Campaign Required', description: 'Please select a campaign for this lead.' });
             setIsCreatingLead(false);
             setProspects(prev => prev.map(p => p.place.place_id === placeId ? { ...p, isAdding: false } : p));
             return;
        }
    
        let primaryContact: Omit<Contact, 'id'> | null = null;
        if (place.website) {
            try {
                const hunterResult = await aiProspectWebsiteTool({ leadId: 'new-lead-prospecting', websiteUrl: place.website });
                if (hunterResult.contacts && hunterResult.contacts.length > 0) {
                    const firstContact = hunterResult.contacts[0];
                    primaryContact = {
                        name: firstContact.name || 'Info',
                        title: firstContact.title || 'Primary Contact',
                        email: firstContact.email || '',
                        phone: firstContact.phone || place.formatted_phone_number || '',
                    };
                    toast({ title: 'Contact Found!', description: `Automatically found contact: ${primaryContact.name}.` });
                }
            } catch (error) { console.warn('AI prospecting for contact failed.', error); }
        }
        
        if (!primaryContact) {
            const websiteDomain = (place.website || '').replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
            primaryContact = {
                name: `Info ${place.name}`,
                title: 'Primary Contact',
                email: websiteDomain ? `info@${websiteDomain}` : '',
                phone: place.formatted_phone_number || '',
            };
        }
        const nameParts = primaryContact.name.split(' ');
        
        const addressData: Partial<Address> = { country: 'Australia' };
        if (place.address_components) {
            const get = (type: string, useShortName = false) => {
                const comp = place.address_components?.find(c => c.types.includes(type));
                return useShortName ? comp?.short_name : comp?.long_name;
            };
            addressData.city = get('locality') || get('postal_town') || '';
            addressData.state = get('administrative_area_level_1', true) || '';
            addressData.zip = get('postal_code') || '';
        }
        addressData.street = place.vicinity;
    
        const newLeadData = {
            companyName: place.name,
            websiteUrl: place.website || '',
            campaign: leadCampaign,
            address: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                ...addressData,
            } as Address,
            contact: {
                firstName: nameParts[0] || 'Info',
                lastName: nameParts.slice(1).join(' ') || place.name,
                title: primaryContact.title,
                email: primaryContact.email,
                phone: primaryContact.phone,
            },
            initialNotes: initialNotes,
            dialerAssigned: userProfile.displayName,
        };
    
        try {
            const result = await createNewLead(newLeadData as any);
            if (result.success && result.leadId) {
                toast({ title: 'Lead Created', description: `${newLeadData.companyName} has been created successfully.` });
                
                const newMapLead: MapLead = {
                  id: result.leadId!,
                  companyName: newLeadData.companyName,
                  status: 'New',
                  address: newLeadData.address as Address,
                  latitude: newLeadData.address.lat,
                  longitude: newLeadData.address.lng,
                  dialerAssigned: undefined,
                  customerPhone: newLeadData.contact.phone,
                };
                setAllMapData(prev => [...prev, newMapLead]);
                setProspects(prev => prev.map(p => p.place.place_id === placeId
                    ? { ...p, isAdding: false, existingLead: newMapLead }
                    : p
                ));
            } else {
                toast({ variant: 'destructive', title: 'Creation Failed', description: result.message || 'Failed to create lead.' });
                setProspects(prev => prev.map(p => p.place.place_id === placeId ? { ...p, isAdding: false } : p));
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'An unexpected error occurred.' });
            setProspects(prev => prev.map(p => p.place.place_id === placeId ? { ...p, isAdding: false } : p));
        } finally {
            setIsCreatingLead(false);
            setProspectToCreate(null);
            setInitialNotes('');
            setCampaign('');
        }
      };
      
    const handleMapFilterChange = (filterName: keyof typeof mapFilters, value: any) => {
        setMapFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const clearMapFilters = () => {
        setMapFilters({
            companyName: '',
            franchisee: [],
            status: [],
            leadType: 'all',
            dialerAssigned: [],
            state: [],
            campaign: 'all',
        });
        if (geoSearchInputNodeRef.current) {
            geoSearchInputNodeRef.current.value = '';
        }
    };

    const filteredMapData = useMemo(() => {
        return allMapData.filter(item => {
            const companyNameMatch = mapFilters.companyName ? item.companyName.toLowerCase().includes(mapFilters.companyName.toLowerCase()) : true;
            const franchiseeMatch = mapFilters.franchisee.length === 0 || (item.franchisee && mapFilters.franchisee.includes(item.franchisee));
            const statusMatch = mapFilters.status.length === 0 || mapFilters.status.includes(item.status);
            const isCompanyMatch = mapFilters.leadType === 'all' || (mapFilters.leadType === 'customers' && item.isCompany) || (mapFilters.leadType === 'leads' && !item.isCompany);
            const dialerMatch = mapFilters.dialerAssigned.length === 0 || (item.dialerAssigned && mapFilters.dialerAssigned.includes(item.dialerAssigned));
            const stateMatch = mapFilters.state.length === 0 || (item.address?.state && mapFilters.state.includes(item.address.state));
            const campaignMatch = mapFilters.campaign === 'all' || item.campaign === mapFilters.campaign;

            return companyNameMatch && franchiseeMatch && statusMatch && isCompanyMatch && dialerMatch && stateMatch && campaignMatch;
        });
    }, [allMapData, mapFilters]);
    
    const uniqueFranchisees: Option[] = useMemo(() => {
        const franchisees = new Set(allMapData.map(lead => lead.franchisee).filter(Boolean));
        return Array.from(franchisees as string[]).map(f => ({ value: f, label: f })).sort((a, b) => a.label.localeCompare(b.label));
    }, [allMapData]);
    
    const uniqueDialers: Option[] = useMemo(() => {
        const dialers = new Set(allMapData.map(lead => lead.dialerAssigned).filter(Boolean));
        return Array.from(dialers as string[]).map(d => ({ value: d, label: d })).sort((a, b) => a.label.localeCompare(b.label));
    }, [allMapData]);

    const uniqueStates: Option[] = useMemo(() => {
        const states = new Set(allMapData.map(lead => lead.address?.state).filter(Boolean));
        return Array.from(states as string[]).map(s => ({ value: s, label: s })).sort((a, b) => a.label.localeCompare(b.label));
    }, [allMapData]);

    const uniqueCampaigns: Option[] = useMemo(() => {
        const campaigns = new Set(allMapData.map(lead => lead.campaign).filter(Boolean));
        return Array.from(campaigns as string[]).map(c => ({ value: c, label: c })).sort((a, b) => a.label.localeCompare(b.label));
    }, [allMapData]);

    const allStatuses: LeadStatus[] = [...new Set(allMapData.map(l => l.status))];
    const statusOptions: Option[] = allStatuses.map(s => ({ value: s, label: s })).sort((a,b) => a.label.localeCompare(b.label));
    const hasActiveMapFilters = Object.values(mapFilters).some(v => (Array.isArray(v) && v.length > 0) || (typeof v === 'string' && v !== 'all' && v !== ''));


    if (loadingData) {
        return <FullScreenLoader message="Loading Map & Data..." />;
    }

    if (loadError) return <div>Error loading maps. Please check your API key and network connection.</div>;

    return (
        <>
        <div className="flex flex-col gap-4 h-full">
             <Card>
                <Collapsible>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Map Controls</CardTitle>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4" /> Toggle Controls</Button>
                            </CollapsibleTrigger>
                        </div>
                    </CardHeader>
                    <CollapsibleContent>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>Go to Location</Label>
                                    <Input ref={geoSearchInputRef} placeholder="Enter a location..."/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Company Name</Label>
                                    <Input value={mapFilters.companyName} onChange={e => handleMapFilterChange('companyName', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Franchisee</Label>
                                    <MultiSelectCombobox options={uniqueFranchisees} selected={mapFilters.franchisee} onSelectedChange={(val) => handleMapFilterChange('franchisee', val)} placeholder="Select franchisees..."/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <MultiSelectCombobox options={statusOptions} selected={mapFilters.status} onSelectedChange={(val) => handleMapFilterChange('status', val)} placeholder="Select statuses..."/>
                                </div>
                                 <div className="space-y-2">
                                    <Label>Assigned Dialer</Label>
                                    <MultiSelectCombobox options={uniqueDialers} selected={mapFilters.dialerAssigned} onSelectedChange={(val) => handleMapFilterChange('dialerAssigned', val)} placeholder="Select dialers..."/>
                                </div>
                                 <div className="space-y-2">
                                    <Label>Lead Type</Label>
                                    <Select value={mapFilters.leadType} onValueChange={(v) => handleMapFilterChange('leadType', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Items</SelectItem>
                                            <SelectItem value="customers">Signed Customers</SelectItem>
                                            <SelectItem value="leads">Leads</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Campaign</Label>
                                    <Select value={mapFilters.campaign} onValueChange={(v) => handleMapFilterChange('campaign', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Campaigns</SelectItem>
                                            {uniqueCampaigns.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>State</Label>
                                    <MultiSelectCombobox options={uniqueStates} selected={mapFilters.state} onSelectedChange={(val) => handleMapFilterChange('state', val)} placeholder="Select states..."/>
                                </div>
                            </div>
                             {hasActiveMapFilters && (
                                <div className="pt-4">
                                    <Button variant="ghost" onClick={clearMapFilters}>
                                        <X className="mr-2 h-4 w-4" /> Clear All Filters
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </CollapsibleContent>
                </Collapsible>
            </Card>
            <Card>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <CardHeader>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="prospecting">Prospecting Area</TabsTrigger>
                            <TabsTrigger value="route-planner">Route Planner</TabsTrigger>
                        </TabsList>
                    </CardHeader>
                    <TabsContent value="prospecting">
                        <CardContent className="space-y-4">
                           <div className="space-y-2">
                                <Label htmlFor="street-search">Search by Street</Label>
                                <Input ref={streetSearchInputCallbackRef} placeholder="Search for a street..."/>
                            </div>
                            <Label>Streets for Area ({streetsForArea.length})</Label>
                            <ScrollArea className="h-40 rounded-md border">
                                {streetsForArea.length > 0 ? (
                                    <div className="p-2 text-sm space-y-1">
                                        {streetsForArea.map(s => (
                                            <div key={s.place_id} className="flex items-center justify-between p-1 rounded-md hover:bg-accent">
                                                <span>{s.description}</span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6" 
                                                    onClick={() => setStreetsForArea(prev => prev.filter(street => street.place_id !== s.place_id))}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-muted-foreground text-sm">Search for streets to add them here.</div>
                                )}
                            </ScrollArea>
                            <Button className="w-full" onClick={() => setIsSaveAreaDialogOpen(true)} disabled={streetsForArea.length === 0}>
                                Save Prospecting Area
                            </Button>
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="route-planner">
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Route Controls</Label>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Button variant={selectionMode === 'info' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('info')}><Info className="mr-2" /> Info</Button>
                                        <Button variant={selectionMode === 'select' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('select')}><PlusCircle className="mr-2" /> Add to Route</Button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Stops ({selectedRouteLeads.length})</Label>
                                <div className="flex gap-2">
                                    <Button onClick={handleClearRoute} variant="destructive" className="w-full">Clear All Stops</Button>
                                </div>
                                <ScrollArea className="h-48 rounded-md border">
                                    {selectedRouteLeads.length > 0 ? (
                                        <div className="p-2 space-y-2">
                                            {selectedRouteLeads.map((lead, index) => (
                                                <div key={lead.id} className="flex items-center justify-between p-2 rounded-md bg-muted text-sm">
                                                    <span className="truncate">{index + 1}. {lead.companyName}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedRouteLeads(prev => prev.filter(l => l.id !== lead.id))}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-muted-foreground text-sm">Select leads on the map to add them to your route.</div>
                                    )}
                                </ScrollArea>
                            </div>
                            <div className="space-y-2">
                                <Label>Route Options</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Input ref={startPointRef} placeholder="Start point (optional)" />
                                    <Input ref={endPointRef} placeholder="End point (optional)" />
                                </div>
                                <Select value={travelMode} onValueChange={(v) => setTravelMode(v as google.maps.TravelMode)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DRIVING">Driving</SelectItem>
                                        <SelectItem value="WALKING">Walking</SelectItem>
                                        <SelectItem value="BICYCLING">Bicycling</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleCalculateRoute} disabled={isCalculatingRoute || selectedRouteLeads.length < 2} className="w-full">
                                    {isCalculatingRoute ? <Loader /> : "Calculate Route"}
                                </Button>
                            </div>
                             <Button onClick={handleSaveRouteDialog} className="w-full" disabled={selectedRouteLeads.length === 0}>
                                Save Route
                            </Button>
                        </CardContent>
                    </TabsContent>
                </Tabs>
             </Card>
            <div className="relative rounded-lg overflow-hidden border h-[60vh] xl:h-auto xl:flex-grow">
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={center}
                        zoom={4}
                        onLoad={onMapLoad}
                        onClick={onMapClick}
                        options={{
                            streetViewControl: false,
                            mapTypeControl: false,
                            fullscreenControl: false
                        }}
                    >
                        {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}

                        {filteredMapData.map(lead => (
                            <MarkerF
                                key={lead.id}
                                position={{ lat: lead.latitude!, lng: lead.longitude! }}
                                onClick={() => onMarkerClick(lead)}
                                onMouseOver={() => setHoveredLeadId(lead.id)}
                                onMouseOut={() => setHoveredLeadId(null)}
                                icon={{
                                    url: getPinIcon(lead.status, selectedRouteLeads.some(l => l.id === lead.id) || mapSelectedCompanyIds.includes(lead.id), hoveredLeadId === lead.id)
                                }}
                            />
                        ))}
                        
                        {searchedLocation && (
                            <MarkerF
                                position={searchedLocation}
                                icon={{
                                    url: "http://maps.google.com/mapfiles/kml/paddle/black-dot.png",
                                }}
                            />
                        )}

                        {selectedLead && (
                            <InfoWindowF
                                position={{ lat: Number(selectedLead.latitude!), lng: Number(selectedLead.longitude!) }}
                                onCloseClick={onInfoWindowClose}
                                options={infoWindowOptions}
                            >
                                <div className="p-2 max-w-xs space-y-2">
                                    <h3 className="font-bold text-lg">{selectedLead.companyName}</h3>
                                    <p className="text-sm text-muted-foreground">{formatAddress(selectedLead.address as Address)}</p>
                                    <div className="flex items-center gap-2">
                                        <LeadStatusBadge status={selectedLead.status} />
                                        {selectedLead.isCompany && <Badge variant="secondary">Signed Customer</Badge>}
                                    </div>
                                    <div className="flex flex-col gap-2 pt-2">
                                        <Button size="sm" onClick={() => window.open(selectedLead.isCompany ? `/companies/${selectedLead.id}` : `/leads/${selectedLead.id}`, '_blank')}>
                                            <ExternalLink className="mr-2 h-4 w-4" /> View {selectedLead.isCompany ? 'Profile' : 'Lead'}
                                        </Button>
                                    </div>
                                </div>
                            </InfoWindowF>
                        )}

                         {myLocation && <MarkerF position={myLocation} title="Your Location" icon={{ url: "http://maps.google.com/mapfiles/ms/icons/green.png" }} />}

                    </GoogleMap>
                ) : loadError ? (
                  <div className="flex h-full items-center justify-center text-destructive">Error loading map.</div>
                ) : (
                  <div className="flex h-full items-center justify-center"><Loader /></div>
                )}
            </div>
        </div>
            <Dialog open={isSaveRouteDialogOpen} onOpenChange={setIsSaveRouteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Route</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                         <div className="space-y-2">
                            <Label htmlFor="route-name">Route Name</Label>
                            <Input id="route-name" value={routeName} onChange={(e) => setRouteName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Schedule For</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {routeDate ? format(routeDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={routeDate} onSelect={setRouteDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        {userProfile?.role !== 'Field Sales' && (
                            <div className="space-y-2">
                                <Label>Assign To</Label>
                                <Select value={routeAssignee} onValueChange={setRouteAssignee}>
                                    <SelectTrigger><SelectValue placeholder="Select a Field Sales Rep" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={userProfile?.uid || ''}>Myself</SelectItem>
                                        {allUsers.filter(u => u.role === 'Field Sales').map(user => (
                                            <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveRouteDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveRoute} disabled={isSavingRoute || !routeName.trim()}>
                            {isSavingRoute ? <Loader/> : 'Save Route'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             <Dialog open={isSaveAreaDialogOpen} onOpenChange={setIsSaveAreaDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Prospecting Area</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                         <div className="space-y-2">
                            <Label htmlFor="area-name">Area Name</Label>
                            <Input id="area-name" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} />
                        </div>
                        {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                            <div className="space-y-2">
                                <Label>Assign To</Label>
                                <Select value={newAreaAssignee} onValueChange={setNewAreaAssignee}>
                                    <SelectTrigger><SelectValue placeholder="Select a Field Sales Rep" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={userProfile?.uid || ''}>Myself ({userProfile?.displayName})</SelectItem>
                                        {allUsers.filter(u => u.role === 'Field Sales').map(user => (
                                            <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveAreaDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveProspectingArea} disabled={isSavingArea || !newAreaName.trim()}>
                            {isSavingArea ? <Loader /> : 'Save Area'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
