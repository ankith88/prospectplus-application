'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  GoogleMap,
  MarkerF,
  InfoWindowF,
  DirectionsRenderer,
} from '@react-google-maps/api';
import type { LeadStatus, Address, MapLead, SavedRoute, StorableRoute, Activity, UserProfile, Contact, Lead, DiscoveryData } from '@/lib/types';
import { Loader, FullScreenLoader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building, CheckSquare, Clock, Milestone, Play, Route, Trash2, XCircle, Save, User, Filter, X, Calendar as CalendarIcon, Clipboard, Briefcase, MapPin, Globe, Sparkles, Search, Info, StickyNote, Mic, MicOff, Camera, PenSquare, Move, MoreVertical, CircleDot, RectangleHorizontal, Spline, Map as MapIcon, ArrowUpDown, ExternalLink, PlusCircle, Download, Eye, SlidersHorizontal, Satellite, MousePointerClick, Upload, ChevronLeft, Check } from 'lucide-react';
import { getAllUserRoutes, getUserRoutes, getAllUsers, getCompaniesFromFirebase, saveUserRoute, updateUserRoute, getLeadsFromFirebase, createNewLead, checkForDuplicateLead } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarPicker } from './ui/calendar';
import { format } from 'date-fns';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool';
import { cn } from '@/lib/utils';
import { useJsApiLoader } from '@react-google-maps/api';
import { Textarea } from './ui/textarea';
import { collection, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { LeadStatusBadge } from './lead-status-badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: -25.2744,
  lng: 133.7751,
};

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'drawing', 'geometry', 'visualization'];

async function compressImage(dataUrl: string, maxWidth = 1024, quality = 0.6): Promise<string> {
    return new Promise((resolve) => {
        const img = new window.Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
}

function getPinIcon(status: LeadStatus, isSelected: boolean, isHovered: boolean) {
    if (isSelected) return 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png';
    if (isHovered) return 'http://maps.google.com/mapfiles/ms/icons/yellow.png';

    switch (status) {
        case 'Won': return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
        case 'Lost':
        case 'Unqualified':
        case 'Lost Customer':
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
    const [selectedGroup, setSelectedGroup] = useState<MapLead[] | null>(null);
    const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);
    const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [searchedLocation, setSearchedLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite'>('roadmap');

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
    const [newAreaNotes, setNewAreaNotes] = useState('');
    const [newAreaAssignees, setNewAreaAssignees] = useState<string[]>([]);
    const [streetsForArea, setStreetsForArea] = useState<{ place_id: string; description: string; latitude: number; longitude: number; }[]>([]);
    const [areaStep, setAreaStep] = useState<'details' | 'camera'>('details');
    const [areaImages, setAreaImages] = useState<string[]>([]);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // UI State
    const [activeTab, setActiveTab] = useState('prospecting');
    const [selectionMode, setSelectionMode] = useState<'info' | 'select'>('info');

    // Autocomplete Refs
    const startPointRef = useRef<HTMLInputElement | null>(null);
    const endPointRef = useRef<HTMLInputElement | null>(null);
    const geoSearchInputNodeRef = useRef<HTMLInputElement | null>(null);

    // Filter state
    const [mapFilters, setMapFilters] = useState({
        companyName: '',
        franchisee: [] as string[],
        status: [] as string[],
        leadType: 'all',
        dialerAssigned: [] as string[],
        state: [] as string[],
        campaign: 'all',
        hasVisitNote: 'all' as 'all' | 'yes' | 'no',
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
                getCompaniesFromFirebase({
                    franchisee: userProfile?.role === 'Franchisee' ? userProfile.franchisee : undefined
                }),
                getLeadsFromFirebase({ 
                    summary: true,
                    franchisee: userProfile?.role === 'Franchisee' ? userProfile.franchisee : undefined
                }),
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
                .filter(item => !isNaN(Number(item.latitude)) && !isNaN(Number(item.longitude)))
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
            state: [] as string[],
            campaign: 'all',
            hasVisitNote: 'all',
        });
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
            const hasVisitNoteMatch = mapFilters.hasVisitNote === 'all' ||
                                      (mapFilters.hasVisitNote === 'yes' && !!item.visitNoteID) ||
                                      (mapFilters.hasVisitNote === 'no' && !item.visitNoteID);

            return companyNameMatch && franchiseeMatch && statusMatch && isCompanyMatch && dialerMatch && stateMatch && campaignMatch && hasVisitNoteMatch;
        });
    }, [allMapData, mapFilters]);

    // Group markers by location
    const groupedMapData = useMemo(() => {
        const groups = new Map<string, MapLead[]>();
        filteredMapData.forEach(item => {
            const key = `${item.latitude},${item.longitude}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(item);
        });
        return Array.from(groups.values());
    }, [filteredMapData]);

    // Handle editing an existing route/area from URL params
    useEffect(() => {
        const routeId = searchParams.get('editArea');
        if (routeId && isLoaded && savedRoutes.length > 0) {
            const area = savedRoutes.find(r => r.id === routeId);
            if (area && area.isProspectingArea) {
                setLoadedRoute(area);
                setNewAreaName(area.name);
                setNewAreaNotes(area.notes || '');
                setStreetsForArea(area.streets || []);
                if (area.userId) {
                    setNewAreaAssignees([area.userId]);
                }
                if (area.imageUrls) {
                    setAreaImages(area.imageUrls);
                }
                setActiveTab('prospecting');
                
                // Focus map on the area
                if (map && area.streets?.length) {
                    const bounds = new window.google.maps.LatLngBounds();
                    area.streets.forEach(s => bounds.extend({ lat: s.latitude, lng: s.longitude }));
                    map.fitBounds(bounds);
                }
            }
        }
    }, [searchParams, isLoaded, savedRoutes, map]);

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
        const placesService = new window.google.maps.PlacesService(map);
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
                types: ['geocode', 'establishment'],
                componentRestrictions: { country: 'au' },
            });
            autocomplete.setFields(['place_id', 'name', 'types', 'formatted_address', 'geometry']);
    
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (place.place_id && place.geometry?.location) {
                    const isBusiness = place.types?.includes('establishment');
                    const description = isBusiness ? place.name : place.formatted_address;

                    if (description) {
                        const newStreet = { 
                            place_id: place.place_id, 
                            description: description!,
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
            () => {
                setLocationError("Could not get your location. Please enable location services in your browser.");
            }
        );
    }, [searchParams]);

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
            .map(l => ({ location: { lat: Number(l.latitude), lng: Number(l.longitude) }, stopover: true }));
        
        const origin = startPoint ? { query: startPoint } : { lat: Number(selectedRouteLeads[0].latitude), lng: Number(selectedRouteLeads[0].longitude) };
        const destination = endPoint ? { query: endPoint } : { lat: Number(selectedRouteLeads[selectedRouteLeads.length - 1].latitude), lng: Number(selectedRouteLeads[selectedRouteLeads.length - 1].longitude) };

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
        setSelectedGroup(null);
    }, [isLoaded]);


    const onMarkerClick = useCallback((group: MapLead[]) => {
      if (selectionMode === 'select' && group.length === 1) {
            const lead = group[0];
            setSelectedRouteLeads(prev => {
                const isSelected = prev.some(l => l.id === lead.id);
                if (isSelected) {
                    return prev.filter(l => l.id !== lead.id);
                }
                return [...prev, lead];
            });
        } else {
            setSelectedGroup(group);
        }
    }, [selectionMode]);

    const onInfoWindowClose = useCallback(() => {
        setSelectedGroup(null);
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
        if (userProfile?.role === 'Franchisee' && areaImages.length === 0) {
            toast({ variant: 'destructive', title: 'Evidence Required', description: 'Franchisees must provide at least one photo of the area.' });
            return;
        }
        if (!userProfile?.uid) {
             toast({ variant: 'destructive', title: 'Authentication Error', description: 'Could not identify user.' });
             return;
        }

        setIsSavingArea(true);
        try {
            const isUnassigned = newAreaAssignees.length === 0;
            const assigneeIds = isUnassigned ? [userProfile.uid] : newAreaAssignees;
            
            // If it's a franchisee, it starts as pending
            const status: StorableRoute['status'] = userProfile.role === 'Franchisee' ? 'Pending Approval' : 'Approved';

            const baseAreaData: Omit<StorableRoute, 'id'> = {
                userId: '', // Set per assignee
                userName: userProfile.displayName,
                name: newAreaName,
                createdAt: new Date().toISOString(),
                leads: [],
                travelMode: 'DRIVING',
                isProspectingArea: true,
                isUnassigned: isUnassigned,
                streets: streetsForArea,
                notes: newAreaNotes,
                status: status,
                imageUrls: areaImages,
            };

            if (loadedRoute?.id && !isUnassigned && assigneeIds.length === 1 && assigneeIds[0] === loadedRoute.userId) {
                await updateUserRoute(loadedRoute.userId, loadedRoute.id, { ...baseAreaData, userId: loadedRoute.userId });
                toast({ title: 'Success', description: 'Prospecting area updated.' });
            } else {
                const savePromises = assigneeIds.map(uid => {
                    const areaData = { ...baseAreaData, userId: uid };
                    return saveUserRoute(uid, areaData);
                });
                await Promise.all(savePromises);
                toast({ title: 'Success', description: status === 'Pending Approval' ? 'Area submitted for approval.' : `Prospecting area saved for ${assigneeIds.length} user(s).` });
            }
            
            fetchData();
            setNewAreaName('');
            setNewAreaNotes('');
            setNewAreaAssignees([]);
            setStreetsForArea([]);
            setAreaImages([]);
            setIsSaveAreaDialogOpen(false);
            setAreaStep('details');
            setLoadedRoute(null);

        } catch (error) {
            console.error("Failed to save prospecting area:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'An error occurred while saving the area.' });
        } finally {
            setIsSavingArea(false);
        }
    };

    const handleToggleCamera = async () => {
        if (isCameraActive) {
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
            setIsCameraActive(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setIsCameraActive(true);
            } catch (err) {
                toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera.' });
            }
        }
    };

    const handleCaptureImage = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext('2d');
        context?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const compressed = await compressImage(dataUrl);
        setAreaImages(prev => [...prev, compressed]);
        handleToggleCamera();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    if (typeof reader.result === 'string') {
                        const compressed = await compressImage(reader.result);
                        setAreaImages(prev => [...prev, compressed]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const Legend = () => (
      <div className="p-4 border-t">
        <h4 className="font-medium mb-2 text-base">Legend</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <img src="http://maps.google.com/mapfiles/ms/icons/green-dot.png" alt="Signed Customer" className="h-4 w-4" />
            <span>Signed Customer</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="http://maps.google.com/mapfiles/ms/icons/ltblue-dot.png" alt="Lead (New)" className="h-4 w-4" />
            <span>Lead (New)</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" alt="Lead (In Progress)" className="h-4 w-4" />
            <span>Lead (In Progress)</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="http://maps.google.com/mapfiles/ms/icons/yellow-dot.png" alt="Lead (Qualified/Trial)" className="h-4 w-4" />
            <span>Lead (Qualified/Trial)</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="http://maps.google.com/mapfiles/ms/icons/red-dot.png" alt="Lead (Lost/Unqualified)" className="h-4 w-4" />
            <span>Lost / Unqualified / Lost Customer</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="http://maps.google.com/mapfiles/ms/icons/purple-dot.png" alt="Selected for Route" className="h-4 w-4" />
            <span>Selected for Route</span>
          </div>
        </div>
      </div>
    );

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
        return Array.from(states as string[]).map(s => ({ value: s, label: s }));
    }, [allMapData]);

    const uniqueCampaigns: Option[] = useMemo(() => {
        const campaigns = new Set(allMapData.map(lead => lead.campaign).filter(Boolean));
        return Array.from(campaigns as string[]).map(c => ({ value: c, label: c })).sort((a, b) => a.label.localeCompare(b.label));
    }, [allMapData]);

    const activeFieldSalesUserOptions: Option[] = useMemo(() => {
        return allUsers
            .filter(u => (u.role === 'Field Sales' || u.role === 'Field Sales Admin') && !u.disabled)
            .map(u => ({ value: u.uid, label: u.displayName || u.email }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [allUsers]);

    const allStatuses: LeadStatus[] = [...new Set(allMapData.map(l => l.status))];
    const statusOptions: Option[] = allStatuses.map(s => ({ value: s, label: s })).sort((a,b) => a.label.localeCompare(b.label));
    const hasActiveMapFilters = Object.values(mapFilters).some(v => (Array.isArray(v) && v.length > 0) || (typeof v === 'string' && v !== 'all' && v !== ''));


    if (loadingData) {
        return <FullScreenLoader message="Loading Map & Data..." />;
    }

    if (loadError) return <div>Error loading maps. Please check your API key and network connection.</div>;

    return (
        <>
        <div className="h-full flex flex-col gap-4">
             <Card>
                <Collapsible>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Map Controls</CardTitle>
                             <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => setMapTypeId(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Satellite className="mr-2 h-4 w-4" />
                                    {mapTypeId === 'roadmap' ? 'Satellite' : 'Roadmap'}
                                </Button>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4" /> Toggle Controls</Button>
                                </CollapsibleTrigger>
                            </div>
                        </div>
                    </CardHeader>
                    <CollapsibleContent>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>Go to Location</Label>
                                    <input ref={geoSearchInputRef} placeholder="Enter a location..." className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
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
                                <div className="space-y-2">
                                    <Label>Visit Note</Label>
                                    <Select value={mapFilters.hasVisitNote} onValueChange={(v) => handleMapFilterChange('hasVisitNote', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="yes">With Visit Note</SelectItem>
                                            <SelectItem value="no">Without Visit Note</SelectItem>
                                        </SelectContent>
                                    </Select>
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
            <div className="flex-grow flex-col md:flex-row flex gap-4">
                <Card className="w-full md:max-w-sm lg:max-w-md flex flex-col">
                    <Tabs defaultValue="prospecting" value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-grow">
                         <CardHeader className="pb-2 flex-shrink-0">
                            <TabsList className="grid w-full grid-cols-2 mt-2">
                                <TabsTrigger value="prospecting">Prospecting Area</TabsTrigger>
                                <TabsTrigger value="route-planner">Route Planner</TabsTrigger>
                            </TabsList>
                        </CardHeader>
                        
                        <TabsContent value="prospecting" className="mt-0 flex-grow overflow-hidden flex flex-col">
                            <CardContent className="flex-grow overflow-hidden flex flex-col gap-2">
                               <div className="space-y-2">
                                    <Label htmlFor="street-search">Search by Street or Building</Label>
                                    <Input ref={streetSearchInputCallbackRef} placeholder="Search for a street..."/>
                                </div>
                                <Label>Streets/Buildings for Area ({streetsForArea.length})</Label>
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
                                        <div className="p-4 text-center text-muted-foreground text-sm">Search for streets/buildings to add them here.</div>
                                    )}
                                </ScrollArea>
                                <Button className="w-full" onClick={() => setIsSaveAreaDialogOpen(true)} disabled={streetsForArea.length === 0}>
                                    {loadedRoute ? 'Update Prospecting Area' : 'Save Prospecting Area'}
                                </Button>
                            </CardContent>
                        </TabsContent>
                        <TabsContent value="route-planner" className="mt-0 flex-grow overflow-hidden flex flex-col">
                            <CardContent className="flex-grow overflow-hidden flex flex-col gap-2">
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
                    <Legend />
                </Card>
                <div className="relative rounded-lg overflow-hidden border h-[80vh] flex-grow">
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={defaultCenter}
                        zoom={4}
                        onLoad={onMapLoad}
                        onClick={onMapClick}
                        options={{
                            streetViewControl: false,
                            mapTypeControl: false,
                            fullscreenControl: false
                        }}
                        mapTypeId={mapTypeId}
                    >
                         {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}

                        {groupedMapData.map((group, groupIdx) => {
                            const firstLead = group[0];
                            const lat = Number(firstLead.latitude);
                            const lng = Number(firstLead.longitude);
                            if (isNaN(lat) || isNaN(lng)) return null;

                            // Determine group priority status for pin icon
                            let displayStatus: LeadStatus = firstLead.status;
                            if (group.some(l => l.status === 'Won')) displayStatus = 'Won';
                            else if (group.some(l => ['Qualified', 'Pre Qualified', 'Trialing ShipMate'].includes(l.status))) displayStatus = 'Qualified';
                            else if (group.some(l => ['In Progress', 'Contacted', 'Connected'].includes(l.status))) displayStatus = 'In Progress';

                            const isSelected = group.some(l => selectedRouteLeads.some(rl => rl.id === l.id));
                            const isHovered = group.some(l => l.id === hoveredLeadId);

                            return (
                                <MarkerF
                                    key={`group-${groupIdx}-${firstLead.id}`}
                                    position={{ lat, lng }}
                                    onClick={() => onMarkerClick(group)}
                                    onMouseOver={() => setHoveredLeadId(group[0].id)}
                                    onMouseOut={() => setHoveredLeadId(null)}
                                    label={group.length > 1 ? { text: group.length.toString(), color: 'white', fontWeight: 'bold' } : undefined}
                                    icon={{
                                        url: getPinIcon(displayStatus, isSelected, isHovered)
                                    }}
                                />
                            );
                        })}
                        
                        {searchedLocation && (
                            <MarkerF
                                position={searchedLocation}
                                icon={{
                                    url: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png",
                                }}
                            />
                        )}

                        {selectedGroup && (
                            <InfoWindowF
                                position={{ lat: Number(selectedGroup[0].latitude!), lng: Number(selectedGroup[0].longitude!) }}
                                onCloseClick={onInfoWindowClose}
                                options={infoWindowOptions}
                            >
                                <div className="p-2 max-w-md">
                                    {selectedGroup.length === 1 ? (
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-lg">{selectedGroup[0].companyName}</h3>
                                            <p className="text-sm text-muted-foreground">{formatAddress(selectedGroup[0].address as Address)}</p>
                                            <div className="flex items-center gap-2">
                                                <LeadStatusBadge status={selectedGroup[0].status} />
                                                {selectedGroup[0].isCompany && <Badge variant="secondary">Signed Customer</Badge>}
                                            </div>
                                            <div className="flex flex-col gap-2 pt-2">
                                                <Button size="sm" onClick={() => window.open(selectedGroup[0].isCompany ? `/companies/${selectedGroup[0].id}` : `/leads/${selectedGroup[0].id}`, '_blank')}>
                                                    <ExternalLink className="mr-2 h-4 w-4" /> View {selectedGroup[0].isCompany ? 'Profile' : 'Lead'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between border-b pb-2">
                                                <h3 className="font-bold">{selectedGroup.length} Records at this Location</h3>
                                            </div>
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
                                                        {selectedGroup.map((lead) => (
                                                            <TableRow key={lead.id}>
                                                                <TableCell className="font-medium p-2 text-xs">
                                                                    {lead.companyName}
                                                                </TableCell>
                                                                <TableCell className="p-2">
                                                                    <LeadStatusBadge status={lead.status} />
                                                                </TableCell>
                                                                <TableCell className="text-right p-2">
                                                                    <div className="flex flex-col gap-1">
                                                                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => window.open(lead.isCompany ? `/companies/${lead.id}` : `/leads/${lead.id}`, '_blank')}>
                                                                            View
                                                                        </Button>
                                                                        {selectionMode === 'select' && (
                                                                            <Button 
                                                                                size="sm" 
                                                                                variant={selectedRouteLeads.some(rl => rl.id === lead.id) ? 'destructive' : 'outline'} 
                                                                                className="h-7 text-xs"
                                                                                onClick={() => {
                                                                                    setSelectedRouteLeads(prev => {
                                                                                        const isSelected = prev.some(l => l.id === lead.id);
                                                                                        if (isSelected) return prev.filter(l => l.id !== lead.id);
                                                                                        return [...prev, lead];
                                                                                    });
                                                                                }}
                                                                            >
                                                                                {selectedRouteLeads.some(rl => rl.id === lead.id) ? 'Remove' : 'Add'}
                                                                            </Button>
                                                                        )}
                                                                    </div>
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

                         {myLocation && <MarkerF position={myLocation} title="Your Location" icon={{ url: "http://maps.google.com/mapfiles/ms/icons/green.png" }} />}

                    </GoogleMap>
                </div>
            </div>
        </div>
        <Dialog open={isSaveAreaDialogOpen} onOpenChange={setIsSaveAreaDialogOpen}>
            <DialogContent className={cn(areaStep === 'camera' && "max-w-2xl")}>
                <DialogHeader>
                    <DialogTitle>{loadedRoute ? 'Update' : 'Save'} Prospecting Area</DialogTitle>
                    <DialogDescription>
                        {userProfile?.role === 'Franchisee' ? 'Franchisees must provide evidence photos for approval.' : 'Set details for the prospecting area.'}
                    </DialogDescription>
                </DialogHeader>
                
                {areaStep === 'details' ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="area-name">Area Name</Label>
                            <Input id="area-name" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} placeholder="e.g. Sydney CBD North" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="area-notes">Notes</Label>
                            <Textarea id="area-notes" value={newAreaNotes} onChange={(e) => setNewAreaNotes(e.target.value)} placeholder="Add any relevant notes for this area..." rows={4} />
                        </div>
                        {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="area-assignees">Assign To Field Sales Users (Leave empty for Unassigned)</Label>
                                    <Button variant="link" size="sm" onClick={() => setNewAreaAssignees(activeFieldSalesUserOptions.map(o => o.value))}>Select All</Button>
                                </div>
                                <MultiSelectCombobox 
                                    options={activeFieldSalesUserOptions}
                                    selected={newAreaAssignees}
                                    onSelectedChange={setNewAreaAssignees}
                                    placeholder="Select users..."
                                />
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsSaveAreaDialogOpen(false)}>Cancel</Button>
                            {userProfile?.role === 'Franchisee' ? (
                                <Button onClick={() => setAreaStep('camera')}>Next: Capture Evidence</Button>
                            ) : (
                                <Button onClick={handleSaveProspectingArea} disabled={isSavingArea}>
                                    {isSavingArea ? <Loader /> : 'Save Area'}
                                </Button>
                            )}
                        </DialogFooter>
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="flex justify-between items-center mb-2">
                            <Button variant="ghost" size="sm" onClick={() => setAreaStep('details')}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Details</Button>
                            <Badge variant="secondary">{areaImages.length} photo(s) captured</Badge>
                        </div>
                        
                        <div className="relative aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                            {isCameraActive ? (
                                <>
                                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                                    <Button size="icon" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full h-12 w-12" onClick={handleCaptureImage}><CircleDot className="h-8 w-8" /></Button>
                                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-white" onClick={handleToggleCamera}><X /></Button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <Button variant="outline" onClick={handleToggleCamera}><Camera className="mr-2 h-4 w-4" /> Start Camera</Button>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="area-image-upload" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
                                            <Upload className="mr-2 h-4 w-4" /> Upload Photo
                                        </Label>
                                        <Input id="area-image-upload" type="file" className="sr-only" accept="image/*" multiple onChange={handleImageUpload} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {areaImages.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-4">
                                {areaImages.map((img, idx) => (
                                    <div key={idx} className="relative aspect-video rounded border overflow-hidden group">
                                        <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                                        <Button 
                                            variant="destructive" 
                                            size="icon" 
                                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                                            onClick={() => setAreaImages(prev => prev.filter((_, i) => i !== idx))}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <DialogFooter className="pt-4 border-t">
                            <Button variant="outline" onClick={() => setIsSaveAreaDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveProspectingArea} disabled={isSavingArea || areaImages.length === 0}>
                                {isSavingArea ? <Loader /> : 'Submit for Approval'}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>

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
                        <Label htmlFor="route-date">Scheduled Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {routeDate ? format(routeDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[51]">
                                <CalendarPicker mode="single" selected={routeDate} onSelect={setRouteDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                        <div className="space-y-2">
                            <Label htmlFor="route-assignee">Assign To</Label>
                            <Select value={routeAssignee} onValueChange={setRouteAssignee}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allUsers
                                        .filter(u => (u.role === 'Field Sales' || u.role === 'Field Sales Admin') && !u.disabled)
                                        .map(u => (
                                            <SelectItem key={u.uid} value={u.uid}>{u.displayName || u.email}</SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSaveRouteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveRoute} disabled={isSavingRoute}>
                        {isSavingRoute ? <Loader /> : 'Save Route'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        </>
    );
}
