

'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
  KmlLayer,
  DirectionsRenderer,
  DrawingManagerF,
  CircleF,
} from '@react-google-maps/api'
import { createNewLead, getLeadsFromFirebase, getCompaniesFromFirebase, checkForDuplicateLead, logActivity, saveUserRoute, getUserRoutes, deleteUserRoute, updateUserRoute, getAllUsers, getAllUserRoutes, getAllActivities } from '@/services/firebase'
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import type { Lead, LeadStatus, Address, UserProfile, Contact, MapLead, SavedRoute, StorableRoute, Activity } from '@/lib/types'
import { Loader } from './ui/loader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { LeadStatusBadge } from './lead-status-badge'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { useRouter } from 'next/navigation'
import { Building, Search, Briefcase, PlusCircle, Eye, Phone, Globe, Link as LinkIcon, Locate, MousePointerClick, CheckSquare, Map as MapIcon, Car, Footprints, Bike, Route, X, History, PenSquare, Trash2, Save, Filter, SlidersHorizontal, Sparkles, PhoneCall, CircleDot, RectangleHorizontal, Spline, GripVertical, UserPlus, MapPin, Play, XCircle, MoreHorizontal, Clock, Milestone } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from './ui/input';
import { Switch } from './ui/switch'
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from './ui/scroll-area'
import { cn } from '@/lib/utils'
import { Checkbox } from './ui/checkbox'
import { Textarea } from './ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Separator } from './ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from './ui/calendar'
import { format, startOfDay, endOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile'


const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
}

const center = {
  lat: -25.2744,
  lng: 133.7751,
}

type ProspectWithLeadInfo = {
    place: google.maps.places.PlaceResult;
    existingLead?: MapLead;
    isAdding?: boolean;
    classification?: 'B2B' | 'B2C' | 'Unknown';
    description?: string;
};

type KmlFeatureData = {
  name: string;
  description: string;
}

type ClickedKmlFeature = {
  featureData: KmlFeatureData;
  latLng: google.maps.LatLng;
}

const parseAddressComponents = (components: google.maps.GeocoderAddressComponent[]): Address => {
    const address: Partial<Address> = { country: 'Australia' };
    const get = (type: string, useShortName = false) => {
        const comp = components.find(c => c.types.includes(type));
        return useShortName ? comp?.short_name : comp?.long_name;
    };

    const streetNumber = get('street_number');
    const route = get('route');
    
    address.street = `${streetNumber || ''} ${route || ''}`.trim();
    address.address1 = get('subpremise'); // For level, suite, etc.
    address.city = get('locality') || get('postal_town');
    address.state = get('administrative_area_level_1', true);
    address.zip = get('postal_code');
    
    if ((components as any).geometry?.location) {
        address.lat = (components as any).geometry.location.lat();
        address.lng = (components as any).geometry.location.lng();
    }


    return address as Address;
};

const getPinColor = (status: LeadStatus, isSelected: boolean): string => {
    const greenStatuses: LeadStatus[] = ['Qualified', 'Pre Qualified', 'Trialing ShipMate'];
    const yellowStatuses: LeadStatus[] = ['Contacted', 'In Progress', 'Connected', 'High Touch', 'Reschedule'];
    const redStatuses: LeadStatus[] = ['Lost', 'Unqualified', 'Priority Lead'];
    const blueStatuses: LeadStatus[] = ['New'];
    const purpleStatuses: LeadStatus[] = ['LPO Review'];

    if (isSelected) {
      return 'http://maps.google.com/mapfiles/ms/icons/purple-pushpin.png';
    }
    
    if (status === 'Won') {
      return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
    }

    if (greenStatuses.includes(status)) {
        return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
    }
    if (yellowStatuses.includes(status)) {
        return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
    }
     if (redStatuses.includes(status)) {
        return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
    }
    if (blueStatuses.includes(status)) {
        return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    }
     if (purpleStatuses.includes(status)) {
        return 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png';
    }
    return 'http://maps.google.com/mapfiles/ms/icons/grey.png'; // Default
};


export default function LeadsMapClient() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-unused', // Make ID unique to avoid conflicts, though script tag in layout is primary
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const [mapData, setMapData] = useState<MapLead[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [selectedLead, setSelectedLead] = useState<MapLead | null>(null)
  const [clickedKmlFeature, setClickedKmlFeature] = useState<ClickedKmlFeature | null>(null)
  const [prospects, setProspects] = useState<ProspectWithLeadInfo[]>([])
  const [isProspectsDialogOpen, setIsProspectsDialogOpen] = useState(false)
  const [selectedProspects, setSelectedProspects] = useState<google.maps.places.PlaceResult[]>([]);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [prospectSearchQuery, setProspectSearchQuery] = useState('')
  const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);
  const [viewingDescription, setViewingDescription] = useState<string | null>(null);
  const [nearbyCompanies, setNearbyCompanies] = useState<MapLead[]>([]);
  const [isNearbyCompaniesDialogOpen, setIsNearbyCompaniesDialogOpen] = useState(false);
  const [isFindingNearby, setIsFindingNearby] = useState(false);
  const [localSavedRoutes, setLocalSavedRoutes] = useState<SavedRoute[]>([]);
  const [allSystemRoutes, setAllSystemRoutes] = useState<SavedRoute[]>([]);
  const [leadToRouteMap, setLeadToRouteMap] = useState<Map<string, string>>(new Map());
  const [loadedRoute, setLoadedRoute] = useState<SavedRoute | null>(null);
  const [routeDate, setRouteDate] = useState<Date>();
  const [routeAssignee, setRouteAssignee] = useState<string>('');
  const [assignableUsers, setAssignableUsers] = useState<UserProfile[]>([]);
  const [allCheckInActivities, setAllCheckInActivities] = useState<Activity[]>([]);

  
  const geoSearchAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const startPointAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const endPointAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [selectedRouteLeads, setSelectedRouteLeads] = useState<MapLead[]>([]);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [travelMode, setTravelMode] = useState<google.maps.TravelMode | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const [routeName, setRouteName] = useState('');
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'info' | 'select'>('info');
  const [drawingMode, setDrawingMode] = useState<google.maps.drawing.OverlayType | null>(null);
  const [startPoint, setStartPoint] = useState<string>('My Location');
  const [endPoint, setEndPoint] = useState<string>('');
  const [totalDistance, setTotalDistance] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState<string | null>(null);
  
  const [prospectToCreate, setProspectToCreate] = useState<google.maps.places.PlaceResult | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [campaign, setCampaign] = useState('');
  const [initialNotes, setInitialNotes] = useState('');

  const [analyzingTerritory, setAnalyzingTerritory] = useState(false);
  const [drawnTerritory, setDrawnTerritory] = useState<{ center: google.maps.LatLng | null; radius: number } | null>(null);

  const [filters, setFilters] = useState({
    franchisee: [] as string[],
    status: [] as string[],
    state: [] as string[],
    checkInStatus: 'all' as 'all' | 'checked-in' | 'not-checked-in',
    checkInDate: undefined as DateRange | undefined,
    routeStatus: 'all' as 'all' | 'in-route' | 'not-in-route',
    campaign: 'all',
  });
  
  const router = useRouter()
  const { toast } = useToast()
  const { userProfile, loading: authLoading, savedRoutes } = useAuth();
  const isMobile = useIsMobile();

  const isFieldSalesUser = userProfile?.role === 'Field Sales' || userProfile?.role === 'Field Sales Admin';

  useEffect(() => {
    if (isFieldSalesUser) {
      setFilters(prev => ({
        ...prev,
        checkInStatus: 'not-checked-in',
        routeStatus: 'not-in-route',
      }));
    }
  }, [isFieldSalesUser]);

  useEffect(() => {
    if (isLoaded && window.google) {
      setTravelMode(null);
    }
  }, [isLoaded]);

  useEffect(() => {
    setLocalSavedRoutes(savedRoutes);
  }, [savedRoutes]);

  useEffect(() => {
    if (!userProfile) return;

    const fetchAllRoutes = async () => {
      const allRoutes = await getAllUserRoutes();
      setAllSystemRoutes(allRoutes);

      const leadMap = new Map<string, string>();
      for (const route of allRoutes) {
        for (const lead of route.leads) {
          leadMap.set(lead.id, route.name);
        }
      }
      setLeadToRouteMap(leadMap);
    };

    fetchAllRoutes();
  }, [userProfile]);
  
  const handleShowMyLocation = useCallback(() => {
    setLocationError(null);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                setMyLocation(pos);
                map?.panTo(pos);
                map?.setZoom(15);
                toast({ title: "Location Found", description: "Your current location has been set." });
            },
            () => {
                const errorMsg = 'Geolocation permission denied. Please enable it in your browser settings.';
                setLocationError(errorMsg);
                toast({ variant: 'destructive', title: 'Location Error', description: errorMsg });
            }
        );
    } else {
        const errorMsg = 'Geolocation is not supported by this browser.';
        setLocationError(errorMsg);
        toast({ variant: 'destructive', title: 'Location Error', description: errorMsg });
    }
  }, [map, toast]);

  useEffect(() => {
    if (isLoaded && map && userProfile?.role === 'Field Sales' && !myLocation) {
      handleShowMyLocation();
    }
  }, [isLoaded, map, userProfile, myLocation, handleShowMyLocation]);

  const geocodeAddress = useCallback(async (address: string): Promise<google.maps.LatLng | null> => {
    if (!isLoaded) return null;
    const geocoder = new window.google.maps.Geocoder();
    return new Promise((resolve) => {
        geocoder.geocode({ address, componentRestrictions: { country: 'au' } }, (results, status) => {
            if (status === 'OK' && results?.[0]?.geometry.location) {
                resolve(results[0].geometry.location);
            } else {
                resolve(null);
            }
        });
    });
  }, [isLoaded]);

const handleCreateRoute = useCallback(async (selectedTravelMode: google.maps.TravelMode, leadsForRoute: MapLead[]) => {
    if (!map) return;
    if (leadsForRoute.length < 1) {
        toast({ variant: "destructive", title: "Not enough stops", description: "Please select at least 1 lead to create a route." });
        return;
    }
    
    let origin: google.maps.LatLng | string | null = null;
    if (startPoint === 'My Location') {
        if (!myLocation) {
            toast({ variant: 'destructive', title: 'Location unknown', description: 'Click "My Location" first or enter a start address.' });
            handleShowMyLocation();
            return;
        }
        origin = myLocation;
    } else {
        origin = await geocodeAddress(startPoint);
        if (!origin) {
            toast({ variant: 'destructive', title: 'Invalid Start Point', description: 'Could not find the specified start address.' });
            return;
        }
    }
    
    let destination: google.maps.LatLng | string | null = null;
    if (endPoint) {
        destination = await geocodeAddress(endPoint);
        if (!destination) {
            toast({ variant: 'destructive', title: 'Invalid End Point', description: 'Could not find the specified end address.' });
            destination = null;
        }
    }

    let leadsToRoute = [...leadsForRoute];
    if (leadsToRoute.length > 23) {
        toast({
            title: 'Too many stops',
            description: `Google Maps API supports a maximum of 25 total locations. Using the first 23 stops.`,
        });
        leadsToRoute = leadsForRoute.slice(0, 23);
    }


    setTravelMode(selectedTravelMode);
    setIsCalculatingRoute(true);
    setDirections(null);
    setTotalDistance(null);
    setTotalDuration(null);
    const directionsService = new window.google.maps.DirectionsService();

    const waypoints = leadsToRoute.map(lead => ({
        location: { lat: lead.latitude!, lng: lead.longitude! },
        stopover: true,
    }));

    directionsService.route(
        {
            origin: origin,
            destination: destination || origin,
            waypoints,
            optimizeWaypoints: true,
            travelMode: selectedTravelMode,
        },
        (result, status) => {
            setIsCalculatingRoute(false);
            if (status === window.google.maps.DirectionsStatus.OK && result) {
                setDirections(result);
                setSelectedRouteLeads(leadsToRoute);

                let totalDist = 0;
                let totalDur = 0;
                result.routes[0].legs.forEach(leg => {
                    totalDist += leg.distance?.value || 0;
                    totalDur += leg.duration?.value || 0;
                });
                
                setTotalDistance((totalDist / 1000).toFixed(1) + ' km');

                const hours = Math.floor(totalDur / 3600);
                const minutes = Math.floor((totalDur % 3600) / 60);
                setTotalDuration(`${hours > 0 ? `${hours} hr ` : ''}${minutes} min`);

            } else {
                console.error(`error fetching directions ${result}`);
                toast({ variant: "destructive", title: "Route Error", description: `Failed to calculate directions: ${status}` });
            }
        }
    );
}, [map, toast, myLocation, handleShowMyLocation, startPoint, endPoint, geocodeAddress]);

  
    useEffect(() => {
        const fetchData = async () => {
            if (!isLoaded || !userProfile) return;

            setLoadingData(true);
            try {
                const [mapLeads, mapCompanies, checkIns] = await Promise.all([
                    getLeadsFromFirebase({ summary: true }),
                    getCompaniesFromFirebase(),
                    getAllActivities(true)
                ]);
                
                setAllCheckInActivities(checkIns);

                let leadsMapData: MapLead[] = [];
                if (mapLeads) {
                    leadsMapData = mapLeads
                        .filter(lead => lead.latitude != null && lead.longitude != null)
                        .map(lead => ({
                            ...lead,
                            latitude: Number(lead.latitude),
                            longitude: Number(lead.longitude),
                            isCompany: false,
                            isProspect: false
                        }));
                }

                let companiesMapData: MapLead[] = [];
                if (mapCompanies) {
                    companiesMapData = mapCompanies
                        .filter(company => company.latitude != null && company.longitude != null)
                        .map(company => ({
                            ...company,
                            latitude: Number(company.latitude),
                            longitude: Number(company.longitude),
                            isCompany: true,
                            isProspect: false
                        }));
                }

                setMapData([...leadsMapData, ...companiesMapData]);

                const users = await getAllUsers();
                setAssignableUsers(users.filter(u => u.role === 'Field Sales' || u.role === 'admin'));

            } catch (error) {
                console.error("Failed to fetch map data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load map data.' });
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [isLoaded, userProfile, toast]);
    
    const handleLoadRoute = useCallback((route: SavedRoute) => {
        if (!isLoaded) return;
        
        const archivedStatuses: LeadStatus[] = ['Lost', 'Qualified', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate', 'Won', 'Free Trial', 'LocalMile Pending'];
        const activeLeadsInRoute = route.leads.filter(leadInRoute => {
            const fullLead = mapData.find(l => l.id === leadInRoute.id);
            return fullLead && !archivedStatuses.includes(fullLead.status);
        });

        setSelectedRouteLeads(activeLeadsInRoute);
        
        if (route.directions) {
            setDirections(route.directions as google.maps.DirectionsResult);
        } else {
            setDirections(null);
        }
        setTravelMode(route.travelMode);
        setLoadedRoute(route);
        setStartPoint(route.startPoint || 'My Location');
        setEndPoint(route.endPoint || '');
        setTotalDistance(route.totalDistance || null);
        setTotalDuration(route.totalDuration || null);
        toast({ title: 'Route Loaded', description: `Route "${route.name}" is now active.` });
    }, [isLoaded, mapData, toast]);

     useEffect(() => {
        if (loadingData || !isLoaded || localSavedRoutes.length === 0) return;

        const activeRouteId = localStorage.getItem('activeRouteId');
        if (activeRouteId) {
            const routeToLoad = localSavedRoutes.find(r => r.id === activeRouteId);
            if (routeToLoad) {
                handleLoadRoute(routeToLoad);
                setIsRouteActive(true);
            }
        }
    }, [localSavedRoutes, isLoaded, loadingData, handleLoadRoute]);

  
    const filteredData = useMemo(() => {
        if (!userProfile) return [];

        let dataToFilter = mapData;

        // Role-based filtering
        const displayName = userProfile.displayName;
        if (userProfile.role === 'Field Sales') {
            dataToFilter = dataToFilter.filter(item => !item.isCompany && item.fieldSales === true && item.dialerAssigned === displayName);
        } else if (userProfile.role === 'Field Sales Admin') {
            dataToFilter = dataToFilter.filter(item => !item.isCompany && item.fieldSales === true);
        } else if (userProfile.role === 'user') {
            dataToFilter = dataToFilter.filter(item => !item.isCompany && item.dialerAssigned === displayName);
        }

        const checkedInLeadIds = new Set(allCheckInActivities.map(a => a.leadId));

        // Apply UI filters
        dataToFilter = dataToFilter.filter(item => {
            const franchiseeMatch = filters.franchisee.length === 0 || (item.franchisee && filters.franchisee.includes(item.franchisee));
            const stateMatch = filters.state.length === 0 || (item.address?.state && filters.state.includes(item.address.state));
            const statusMatch = filters.status.length === 0 || filters.status.includes(item.status);
            
            const hasBeenCheckedIn = checkedInLeadIds.has(item.id);
            const checkInStatusMatch = filters.checkInStatus === 'all' ||
                                     (filters.checkInStatus === 'checked-in' && hasBeenCheckedIn) ||
                                     (filters.checkInStatus === 'not-checked-in' && !hasBeenCheckedIn);

            let checkInDateMatch = true;
            if (filters.checkInDate?.from && hasBeenCheckedIn) {
                const fromDate = startOfDay(filters.checkInDate.from);
                const toDate = filters.checkInDate.to ? endOfDay(filters.checkInDate.to) : endOfDay(filters.checkInDate.from);
                const checkInActivity = allCheckInActivities.find(a => a.leadId === item.id);
                if (checkInActivity) {
                    const checkInDate = new Date(checkInActivity.date);
                    checkInDateMatch = checkInDate >= fromDate && checkInDate <= toDate;
                } else {
                    checkInDateMatch = false;
                }
            } else if (filters.checkInDate?.from) {
                checkInDateMatch = false;
            }
            
            const isInRoute = leadToRouteMap.has(item.id);
            const routeStatusMatch = filters.routeStatus === 'all' ||
                                     (filters.routeStatus === 'in-route' && isInRoute) ||
                                     (filters.routeStatus === 'not-in-route' && !isInRoute);
            
            let campaignMatch = true;
            if (filters.campaign && filters.campaign !== 'all') {
                const leadCampaign = (item as Lead).campaign;
                const filterCampaign = filters.campaign;
                if (filterCampaign === 'D2D') {
                    campaignMatch = leadCampaign === 'Door-to-Door Field Sales';
                } else {
                    campaignMatch = leadCampaign === filterCampaign;
                }
            }


            return franchiseeMatch && stateMatch && statusMatch && checkInStatusMatch && checkInDateMatch && routeStatusMatch && campaignMatch;
        });
        
        return dataToFilter;
    
    }, [mapData, filters, userProfile, allCheckInActivities, leadToRouteMap]);
    
    const { leadsCount, signedCustomersCount } = useMemo(() => {
        let leads = 0;
        let signedCustomers = 0;
        filteredData.forEach(item => {
            if (item.isCompany) {
                signedCustomers++;
            } else {
                leads++;
            }
        });
        return { leadsCount: leads, signedCustomersCount: signedCustomers };
    }, [filteredData]);


  const onMarkerClick = useCallback((item: MapLead) => {
    if (selectionMode === 'select') {
        const archivedStatuses: LeadStatus[] = ['Won', 'Lost', 'Qualified', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate', 'Free Trial', 'LocalMile Pending'];
        if (item.status && archivedStatuses.includes(item.status)) {
            toast({
                variant: 'destructive',
                title: 'Cannot Add Lead',
                description: `${item.companyName} has an archived status and cannot be added to a route.`
            });
            return;
        }

        const isAssigned = leadToRouteMap.has(item.id);
        if (isAssigned) {
            toast({
                variant: 'destructive',
                title: 'Already Assigned',
                description: `${item.companyName} is already in the route "${leadToRouteMap.get(item.id)}".`
            });
            return;
        }

        setSelectedRouteLeads(prev => {
            if (prev.some(l => l.id === item.id)) {
                return prev.filter(l => l.id !== item.id);
            } else {
                return [...prev, item];
            }
        });
    } else {
        setSelectedLead(item);
    }
  }, [selectionMode, leadToRouteMap, toast]);

  const onInfoWindowClose = useCallback(() => {
    setSelectedLead(null);
    setClickedKmlFeature(null);
  }, []);

  const onKmlLayerClick = useCallback((e: google.maps.KmlMouseEvent) => {
    if (e.featureData) {
      const featureData = {
        name: e.featureData.name || 'Unknown Territory',
        description: e.featureData.description || ''
      };
      setClickedKmlFeature({ featureData, latLng: e.latLng! });
    }
  }, []);
  
  const onMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (selectionMode === 'info') {
      setSelectedLead(null);
    }
  }, [selectionMode]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const uniqueFranchisees: Option[] = useMemo(() => {
    const franchisees = new Set(mapData.map(item => item.franchisee).filter(Boolean));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f })).sort((a, b) => a.label.localeCompare(b.label));
  }, [mapData]);

  const uniqueStatuses: Option[] = useMemo(() => {
    const statuses = new Set(mapData.map(item => item.status));
    return Array.from(statuses).map(s => ({ value: s, label: s})).sort((a, b) => a.label.localeCompare(b.label));
  }, [mapData]);

  const uniqueStates: Option[] = useMemo(() => {
    const states = new Set(mapData.map(item => item.address?.state).filter(Boolean));
    return Array.from(states as string[]).map(s => ({ value: s, label: s })).sort((a, b) => a.label.localeCompare(b.label));
  }, [mapData]);

  const uniqueCampaigns: Option[] = useMemo(() => {
    const campaigns = new Set(mapData.map(item => {
        const lead = item as Lead;
        const campaign = lead.campaign;
        return campaign === 'Door-to-Door Field Sales' ? 'D2D' : campaign;
    }).filter(Boolean));

    return Array.from(campaigns as string[]).map(c => ({ value: c, label: c })).sort((a, b) => a.label.localeCompare(b.label));
  }, [mapData]);
  
  const getPlaceDetails = useCallback(async (placeId: string): Promise<google.maps.places.PlaceResult | null> => {
    if (!map) return Promise.resolve(null);
    const placesService = new window.google.maps.places.PlacesService(map);
    return new Promise((resolve) => {
        placesService.getDetails({
            placeId,
            fields: ['name', 'formatted_address', 'address_components', 'website', 'formatted_phone_number', 'geometry', 'place_id', 'business_status', 'types', 'vicinity']
        }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                resolve(place);
            } else {
                resolve(null);
            }
        });
    });
  }, [map]);

 const findProspects = useCallback(async (location: google.maps.LatLngLiteral, keyword: string, useTextSearch: boolean = false) => {
    if (!map) return;
    setProspects([]); 

    setIsSearchingNearby(true);
    toast({ title: 'AI Analysis', description: 'Searching for similar prospects nearby...' });

    const placesService = new window.google.maps.places.PlacesService(map);
    const handleResults = async (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const openProspects = results.filter(place => place.business_status === 'OPERATIONAL');

        const detailedProspectsPromises = openProspects.map(async (place) => {
          if (!place.place_id) return null;
          
          const detailedPlace = await getPlaceDetails(place.place_id);
          if (!detailedPlace) return null;

          const getComponent = (type: string) => detailedPlace.address_components?.find(c => c.types.includes(type))?.long_name;
          const prospectSuburb = getComponent('locality');
          const prospectPostcode = getComponent('postal_code');
          
          const isDuplicate = mapData.some(existing => {
              const similarName = existing.companyName.toLowerCase().includes(detailedPlace.name?.toLowerCase() || 'a-very-unlikely-company-name') || detailedPlace.name?.toLowerCase().includes(existing.companyName.toLowerCase());
              const sameSuburb = existing.address?.city?.toLowerCase() === prospectSuburb?.toLowerCase();
              const samePostcode = existing.address?.zip === prospectPostcode;
              return similarName && sameSuburb && samePostcode;
          });

          if (isDuplicate) {
              return null;
          }
          
          const existingLead = mapData.find(l => l.companyName.toLowerCase() === detailedPlace.name?.toLowerCase());

          let description = 'No website to analyze.';
          if (detailedPlace.website) {
            try {
              const prospectResult = await aiProspectWebsiteTool({
                leadId: 'new-lead-prospecting',
                websiteUrl: detailedPlace.website,
              });
              description = prospectResult.companyDescription || 'AI analysis of website failed.';
            } catch (e) {
              console.error('Error prospecting website for description', e);
              description = 'AI analysis of website failed.';
            }
          }

          const b2cTypes = ['store', 'clothing_store', 'convenience_store', 'department_store', 'shoe_store', 'supermarket', 'bakery', 'cafe', 'restaurant'];
          const classification = detailedPlace.types?.some(type => b2cTypes.includes(type)) ? 'B2C' : 'B2B';
          
          return { place: detailedPlace, existingLead, classification, description };
        });

        const resolvedProspects = (await Promise.all(detailedProspectsPromises))
            .filter((p): p is ProspectWithLeadInfo => p !== null);

        setProspects(resolvedProspects);
        setIsSearchingNearby(false);

        if (resolvedProspects.length > 0) {
            setIsProspectsDialogOpen(true);
        } else {
            toast({ variant: "destructive", title: "Search Complete", description: "No new prospects found." });
        }
      } else {
        toast({ variant: "destructive", title: "Search Failed", description: "No new prospects found." });
        setIsSearchingNearby(false);
      }
    };
    
    if (useTextSearch) {
        const request: google.maps.places.TextSearchRequest = {
            query: keyword,
            region: 'AU',
        };
        placesService.textSearch(request, handleResults);
    } else {
        const request: google.maps.places.PlaceSearchRequest = {
            location,
            radius: 2000,
            keyword,
        };
        placesService.nearbySearch(request, handleResults);
    }
    
  }, [map, mapData, getPlaceDetails, toast]);
  
  const handleFindNearby = useCallback(async () => {
    if (!selectedLead || !map) return;
  
    setIsSearchingNearby(true);
    toast({ title: "Analyzing Lead...", description: "AI is identifying key attributes to find similar prospects." });
    
    let searchKeywords: string[] = [];
  
    if (selectedLead.websiteUrl) {
      try {
        const prospectResult = await aiProspectWebsiteTool({ 
          leadId: selectedLead.id, 
          websiteUrl: selectedLead.websiteUrl 
        });
        if (prospectResult.searchKeywords && prospectResult.searchKeywords.length > 0) {
          searchKeywords = prospectResult.searchKeywords;
        }
      } catch (e) {
        console.error('AI prospecting for keywords failed, falling back.', e);
      }
    }
  
    if (searchKeywords.length === 0 && (selectedLead as any).discoveryData?.searchKeywords?.length) {
      searchKeywords = (selectedLead as any).discoveryData.searchKeywords;
    }
  
    if (searchKeywords.length === 0 && selectedLead.industryCategory) {
      searchKeywords = [selectedLead.industryCategory];
    }
  
    if (searchKeywords.length === 0) {
      toast({ variant: "destructive", title: "Cannot Search", description: "No industry or keywords available for this lead." });
      setIsSearchingNearby(false);
      return;
    }
    
    findProspects({ lat: selectedLead.latitude!, lng: selectedLead.longitude! }, searchKeywords.join(' '));
  }, [selectedLead, map, toast, findProspects]);
  
  const handleFindNearbyCompanies = useCallback(async () => {
    if (!selectedLead || !selectedLead.latitude || !selectedLead.longitude || !window.google?.maps?.geometry) {
        toast({ variant: 'destructive', title: 'Location Missing', description: 'This lead does not have valid coordinates to find nearby customers.' });
        return;
    }

    setIsFindingNearby(true);
    try {
        const leadLatLng = new window.google.maps.LatLng(selectedLead.latitude, selectedLead.longitude);
        const allCompanies = await getCompaniesFromFirebase();
        
        const nearby = allCompanies.filter(company => {
          if (!company.latitude || !company.longitude || company.id === selectedLead.id) {
            return false;
          }
          const itemLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
          const distance = window.google.maps.geometry.spherical.computeDistanceBetween(leadLatLng, itemLatLng);
          return distance <= 500; // 500m radius
        });

        setNearbyCompanies(nearby);
        setIsNearbyCompaniesDialogOpen(true);
        if(nearby.length === 0) {
            toast({ title: 'No Nearby Customers', description: 'No signed customers found within a 500m radius.' });
        }
    } catch (error) {
        console.error("Error finding nearby companies:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch nearby companies.' });
    } finally {
        setIsFindingNearby(false);
    }
  }, [selectedLead, toast]);

    const handleFindMultiSites = useCallback(() => {
    if (!selectedLead) return;
    findProspects({ lat: -25.2744, lng: 133.7751 }, selectedLead.companyName, true);
  }, [selectedLead, findProspects]);


  const handleFindProspectsNearMe = () => {
    if (!myLocation) {
        toast({ variant: 'destructive', title: 'Location unknown', description: 'Click "My Location" first to find your position.' });
        return;
    }
    if (!prospectSearchQuery) {
        toast({ variant: 'destructive', title: 'Search term required', description: 'Please enter a business type to search for (e.g., "cafe", "warehouse").' });
        return;
    }
    findProspects(myLocation, prospectSearchQuery);
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
        
        const addressData = parseAddressComponents(place.address_components || []);
        addressData.lat = place.geometry.location.lat();
        addressData.lng = place.geometry.location.lng();


        const newLeadData = {
            companyName: place.name,
            websiteUrl: place.website || '',
            industryCategory: selectedLead?.industryCategory || '',
            campaign: leadCampaign,
            address: addressData,
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
                toast({ title: 'Lead Created', description: `${newLeadData.companyName} has been created.` });
                
                const newMapLead: MapLead = {
                  id: result.leadId!,
                  companyName: newLeadData.companyName,
                  status: 'New',
                  address: newLeadData.address as Address,
                  industryCategory: newLeadData.industryCategory,
                  latitude: newLeadData.address.lat,
                  longitude: newLeadData.address.lng,
                  dialerAssigned: undefined,
                  customerPhone: newLeadData.contact.phone,
                };
                setMapData(prev => [...prev, newMapLead]);
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
    
    const handleClearRoute = () => {
        setDirections(null);
        setSelectedRouteLeads([]);
        setRouteName('');
        setTravelMode(null);
        setIsRouteActive(false);
        setLoadedRoute(null);
        setRouteDate(undefined);
        localStorage.removeItem('activeRouteId');
        setTotalDistance(null);
        setTotalDuration(null);
    };

    const handleCheckIn = (lead: MapLead) => {
        if (!lead.id) {
            toast({variant: 'destructive', title: 'Error', description: 'Cannot check in to a prospect without an ID.'});
            return;
        }
        router.push(`/check-in/${lead.id}`);
    };
    

  const handleAnalyzeTerritory = useCallback(async () => {
    if (!drawnTerritory?.center || selectedRouteLeads.length === 0) {
      toast({ variant: 'destructive', title: 'No Area or Leads', description: 'Please select an area with leads to analyze.' });
      return;
    }

    setAnalyzingTerritory(true);
    let searchKeywords: string[] = [];

    const successfulLeads = selectedRouteLeads.filter(l => l.status === 'Won' || l.status === 'Qualified');
    
    if (successfulLeads.length > 0) {
      const industries = successfulLeads.map(l => l.industryCategory).filter(Boolean);
      if (industries.length > 0) {
        const industryCounts = industries.reduce((acc, industry) => {
          acc[industry!] = (acc[industry!] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const mostCommonIndustry = Object.keys(industryCounts).reduce((a, b) => industryCounts[a] > industryCounts[b] ? a : b);
        searchKeywords = [mostCommonIndustry];
        toast({ title: 'AI Analysis', description: `Searching for prospects similar to your successful leads in the "${mostCommonIndustry}" industry.` });
      }
    } else {
      const allIndustries = selectedRouteLeads.map(l => l.industryCategory).filter(Boolean);
      if (allIndustries.length > 0) {
        const industryCounts = allIndustries.reduce((acc, industry) => {
          acc[industry!] = (acc[industry!] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const mostCommonIndustry = Object.keys(industryCounts).reduce((a, b) => industryCounts[a] > industryCounts[b] ? a : b);
        searchKeywords = [mostCommonIndustry];
        toast({ title: 'AI Analysis', description: `No successful leads found. Searching for prospects in the most common industry: "${mostCommonIndustry}".` });
      }
    }

    if (searchKeywords.length === 0) {
      toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Could not determine a common profile to search for.' });
      setAnalyzingTerritory(false);
      return;
    }

    findProspects({ lat: drawnTerritory.center.lat(), lng: drawnTerritory.center.lng() }, searchKeywords.join(' '));
    setAnalyzingTerritory(false);
    setDrawnTerritory(null);
  }, [drawnTerritory, selectedRouteLeads, findProspects, toast]);


    const onDrawingComplete = (overlay: google.maps.Circle | google.maps.Rectangle | google.maps.Polygon) => {
        const leadsInShape = filteredData.filter(lead => {
            if (lead.isCompany) return false;
            if (leadToRouteMap.has(lead.id)) return false;
            if (lead.latitude && lead.longitude) {
                const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
                if ((overlay as any).get('radius')) {
                    return google.maps.geometry.spherical.computeDistanceBetween(
                        (overlay as google.maps.Circle).getCenter()!, 
                        leadLatLng
                    ) <= (overlay as google.maps.Circle).getRadius();
                } else if ((overlay as any).get('bounds')) {
                    return (overlay as google.maps.Rectangle).getBounds()!.contains(leadLatLng);
                } else {
                    return google.maps.geometry.poly.containsLocation(leadLatLng, overlay as google.maps.Polygon);
                }
            }
            return false;
        });

        setSelectedRouteLeads(prev => [...new Set([...prev, ...leadsInShape])]);
        
        toast({
          title: `${leadsInShape.length} Stops Added`,
          description: "You can continue to select more areas or individual stops.",
        });
        
        (overlay as any).setMap(null);
        setDrawingMode(null);
    };

    const handleRemoveFromRoute = (leadId: string) => {
        setSelectedRouteLeads(prev => prev.filter(l => l.id !== leadId));
    };

  const handleProspectSelection = (prospect: google.maps.places.PlaceResult) => {
    setSelectedProspects(prev => {
      const isSelected = prev.some(p => p.place_id === prospect.place_id);
      if (isSelected) {
        return prev.filter(p => p.place_id !== prospect.place_id);
      } else {
        return [...prev, prospect];
      }
    });
  };

  const handleCreateRouteFromProspects = (selectedTravelMode: google.maps.TravelMode) => {
    if (selectedProspects.length === 0) {
        toast({ variant: 'destructive', title: 'No Prospects Selected', description: 'Please select one or more prospects to create a route.' });
        return;
    }
    
    const leadsForRouting: MapLead[] = selectedProspects.map((p) => {
        const addressComponents = p.address_components || [];
        let address: Address;

        if (addressComponents.length > 0) {
          address = parseAddressComponents(addressComponents);
        } else {
          address = { street: p.formatted_address || '', city: '', state: '', zip: '', country: 'Australia' };
        }
        
        address.lat = p.geometry?.location?.lat()!;
        address.lng = p.geometry?.location?.lng()!;

        return {
            id: p.place_id || `prospect-${p.name}`,
            companyName: p.name || 'Unknown Prospect',
            status: 'New',
            latitude: p.geometry?.location?.lat()!,
            longitude: p.geometry?.location?.lng()!,
            address: address,
            websiteUrl: p.website || '',
            isProspect: true,
            dialerAssigned: undefined,
            customerPhone: p.formatted_phone_number,
        };
    });
    
    handleCreateRoute(selectedTravelMode, leadsForRouting);
    setIsProspectsDialogOpen(false);
    setSelectedProspects([]);
  };
  
    useEffect(() => {
        if (routeDate) {
            const dateString = format(routeDate, 'ddMMyyyy - EEE').toUpperCase();
            setRouteName(prevName => {
                const manualPart = prevName.split(' - ').slice(1).join(' - ').trim();
                return manualPart ? `${dateString} - ${manualPart}` : `${dateString} -`;
            });
        }
    }, [routeDate]);

    const handleSaveRoute = async () => {
        const userIdToSave = (userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && routeAssignee ? routeAssignee : userProfile?.uid;
        if (!userIdToSave) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Could not identify user to save route.' });
            return;
        }

        const newRoute: Omit<StorableRoute, 'id'> = {
            name: routeName,
            createdAt: new Date().toISOString(),
            leads: selectedRouteLeads,
            travelMode: travelMode!,
            directions: directions ? JSON.stringify(directions) : undefined,
            scheduledDate: routeDate ? new Date(routeDate).toISOString() : undefined,
            startPoint,
            endPoint,
            totalDistance: totalDistance,
            totalDuration: totalDuration,
        };

        const savedRouteId = await saveUserRoute(userIdToSave, newRoute);
        if (userIdToSave === userProfile?.uid) {
            setLocalSavedRoutes(prev => [...prev, { ...newRoute, id: savedRouteId, directions: directions }]);
        }
        setRouteName('');
        setRouteDate(undefined);
        setRouteAssignee('');
        toast({ title: 'Route Saved', description: `Route "${routeName}" has been saved successfully.` });
    };

    const handleDeleteRoute = async (routeId: string, routeName: string) => {
        if (!userProfile?.uid) return;
        await deleteUserRoute(userProfile.uid, routeId);
        setLocalSavedRoutes(prev => prev.filter(route => route.id !== routeId));
        toast({ title: 'Route Deleted', description: `Route "${routeName}" has been removed.` });
    };

    const handleStartRoute = () => {
        if (!directions || !directions.routes || directions.routes.length === 0) {
            toast({ variant: 'destructive', title: 'Cannot Start Route', description: 'No active route available.' });
            return;
        }
        
        if (loadedRoute) {
            localStorage.setItem('activeRouteId', loadedRoute.id!);
        }
    
        const origin = startPoint === 'My Location' ? 'Current+Location' : startPoint;
        const destination = endPoint || origin;
        const waypoints = directions.routes[0].legs
            .slice(0, -1)
            .map((leg: any) => leg.end_address)
            .join('|');
    
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(waypoints)}&travelmode=${travelMode?.toLowerCase()}`;
        
        window.open(mapsUrl, '_blank');
        setIsRouteActive(true);
    };

    const handleStopRoute = () => {
        setIsRouteActive(false);
        handleClearRoute();
        toast({ title: 'Route Stopped', description: 'Active route has been cleared.' });
    };

    const startDrawing = (mode: google.maps.drawing.OverlayType) => {
        setIsDrawing(true);
        setDrawingMode(mode);
        toast({
            title: "Drawing Mode Activated",
            description: `Draw a ${mode.toLowerCase()} on the map to select leads. Press Esc or click Cancel to exit.`,
        });
    };

    const cancelDrawing = () => {
        setIsDrawing(false);
        setDrawingMode(null);
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(null);
        }
        toast({
            title: "Drawing Mode Canceled",
        });
    };

    const formatAddress = (address?: { street?: string; city?: string; state?: string, franchisee?: string } | string) => {
        if (!address) return 'Address not available';
        if (typeof address === 'string') return address;
        return [
            address.street,
            address.city,
            address.state,
        ].filter(Boolean).join(', ');
    }
    
    const sortedRouteLegs = useMemo(() => {
        if (!directions || !selectedRouteLeads.length) return [];
        
        const waypointOrder = directions.routes[0].waypoint_order;
        return waypointOrder.map((index, stopNumber) => {
            const lead = selectedRouteLeads[index];
            const leg = directions.routes[0].legs[stopNumber];
            return { lead, leg, stopNumber: stopNumber + 1 };
        });
    }, [directions, selectedRouteLeads]);
    
    const waypointOrderMap = useMemo(() => {
        if (!directions) return new Map();
        const map = new Map<string, number>();
        directions.routes[0].waypoint_order.forEach((originalIndex, routeIndex) => {
            const leadId = selectedRouteLeads[originalIndex]?.id;
            if (leadId) {
                map.set(leadId, routeIndex + 1);
            }
        });
        return map;
    }, [directions, selectedRouteLeads]);
  
    const infoWindowOptions = {
        pixelOffset: new window.google.maps.Size(0, -30),
    };

    const initAutocomplete = useCallback((
      inputEl: HTMLInputElement | null,
      autocompleteRef: React.MutableRefObject<google.maps.places.Autocomplete | null>,
      onPlaceChanged: (place: google.maps.places.PlaceResult) => void
    ) => {
      if (inputEl && isLoaded && !autocompleteRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(inputEl, {
          types: ['geocode'],
          componentRestrictions: { country: 'au' },
        });
        autocomplete.setFields(['geometry', 'formatted_address']);
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place) {
            onPlaceChanged(place);
          }
        });
        autocompleteRef.current = autocomplete;
      }
    }, [isLoaded]);
    
    const geoSearchInputRef = useCallback((node: HTMLInputElement) => {
      if (node !== null && map) {
        initAutocomplete(node, geoSearchAutocompleteRef, (place) => {
          if (place.geometry?.viewport) {
            map?.fitBounds(place.geometry.viewport);
          } else if (place.geometry?.location) {
            map?.panTo(place.geometry.location);
            map?.setZoom(15);
          }
        });
      }
    }, [map, initAutocomplete]);
  
    const startPointInputRef = useCallback((node: HTMLInputElement) => {
      if (node !== null) {
        initAutocomplete(node, startPointAutocompleteRef, (place) => {
          if (place.formatted_address) {
            setStartPoint(place.formatted_address);
          }
        });
      }
    }, [initAutocomplete]);
  
    const endPointInputRef = useCallback((node: HTMLInputElement) => {
      if (node !== null) {
        initAutocomplete(node, endPointAutocompleteRef, (place) => {
          if (place.formatted_address) {
            setEndPoint(place.formatted_address);
          }
        });
      }
    }, [initAutocomplete]);

    if (loadError) {
        return <div>Error loading maps. Please check your API key and network connection.</div>
    }
    
    if (authLoading || loadingData) {
        return (
            <div className="flex h-full items-center justify-center">
            <Loader />
            </div>
        )
    }
    
    const MapLegend = () => (
      <div className="absolute bottom-4 left-4 bg-background/80 p-2 rounded-lg shadow-lg text-xs space-y-1">
        <h4 className="font-bold text-center">Legend</h4>
        <div className="flex items-center gap-2">
             <img src="http://maps.google.com/mapfiles/ms/icons/green-dot.png" alt="Signed" className="h-4 w-4" />
            Signed Customer
        </div>
        <div className="flex items-center gap-2"><img src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" alt="New" className="h-4 w-4" /> New</div>
        <div className="flex items-center gap-2"><img src="http://maps.google.com/mapfiles/ms/icons/yellow-dot.png" alt="In Progress" className="h-4 w-4" /> In Progress</div>
        <div className="flex items-center gap-2"><img src="http://maps.google.com/mapfiles/ms/icons/green-dot.png" alt="Qualified" className="h-4 w-4" /> Qualified/Trial</div>
        <div className="flex items-center gap-2"><img src="http://maps.google.com/mapfiles/ms/icons/red-dot.png" alt="Lost" className="h-4 w-4" /> Lost/Unqualified</div>
      </div>
    );


    return (
    <div className="flex flex-col h-full gap-4">
        <Collapsible defaultOpen={!isMobile}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MapIcon className="h-5 w-5" />
                        <CardTitle>Map Controls</CardTitle>
                        <CardDescription>
                            Displaying {leadsCount} leads and {signedCustomersCount} signed customers.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleShowMyLocation} variant="outline" size="sm"><Locate className="mr-2 h-4 w-4" /> My Location</Button>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <SlidersHorizontal className="h-4 w-4" />
                                <span className="ml-2">Toggle Controls</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </CardHeader>
                <CollapsibleContent>
                    <Tabs defaultValue="filters">
                        <CardContent>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="filters">Filters</TabsTrigger>
                                <TabsTrigger value="actions">Actions</TabsTrigger>
                            </TabsList>
                        </CardContent>
                        <TabsContent value="filters">
                             <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Franchisee</Label>
                                    <MultiSelectCombobox options={uniqueFranchisees} selected={filters.franchisee} onSelectedChange={(selected) => handleFilterChange('franchisee', selected)} placeholder="Select Franchisees..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <MultiSelectCombobox options={uniqueStatuses} selected={filters.status} onSelectedChange={(selected) => handleFilterChange('status', selected)} placeholder="Select Statuses..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>State</Label>
                                    <MultiSelectCombobox options={uniqueStates} selected={filters.state} onSelectedChange={(selected) => handleFilterChange('state', selected)} placeholder="Select States..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Campaign</Label>
                                     <Select value={filters.campaign} onValueChange={(value) => handleFilterChange('campaign', value)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Campaigns</SelectItem>
                                            {uniqueCampaigns.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2">
                                    <Label>Visit Status</Label>
                                    <Select value={filters.checkInStatus} onValueChange={(value) => handleFilterChange('checkInStatus', value)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="checked-in">Checked-in</SelectItem><SelectItem value="not-checked-in">Not Checked-in</SelectItem></SelectContent></Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Check-in Date</Label>
                                    <Popover><PopoverTrigger asChild><Button variant={"outline"} className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filters.checkInDate?.from ? (filters.checkInDate.to ? <>{format(filters.checkInDate.from, "LLL dd, y")} - {format(filters.checkInDate.to, "LLL dd, y")}</> : format(filters.checkInDate.from, "LLL dd, y")) : <span>Pick a date range</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 z-[11]"><Calendar mode="range" selected={filters.checkInDate} onSelect={(date) => handleFilterChange('checkInDate', date)} /></PopoverContent></Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Route Status</Label>
                                    <Select value={filters.routeStatus} onValueChange={(value) => handleFilterChange('routeStatus', value)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="in-route">In a Saved Route</SelectItem><SelectItem value="not-in-route">Not in a Route</SelectItem></SelectContent></Select>
                                </div>
                            </CardContent>
                        </TabsContent>
                        <TabsContent value="actions">
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="geo-search-input">Go to Location</Label>
                                    <Input
                                        id="geo-search-input"
                                        placeholder="Suburb, state, postcode..."
                                        ref={geoSearchInputRef}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="prospect-search">Find Prospects Near Me</Label>
                                    <div className="flex items-center gap-2">
                                        <Input id="prospect-search" placeholder="e.g. cafe, warehouse" value={prospectSearchQuery} onChange={(e) => setProspectSearchQuery(e.target.value)} />
                                        <Button onClick={handleFindProspectsNearMe} disabled={isSearchingNearby}>
                                            {isSearchingNearby ? <Loader/> : <Search className="h-4 w-4"/>}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Selection Mode</Label>
                                    <div className='flex items-center gap-2'>
                                        <Button onClick={() => setSelectionMode(prev => prev === 'info' ? 'select' : 'info')} variant={selectionMode === 'select' ? 'secondary' : 'outline'} className="w-full">
                                            <MousePointerClick className="mr-2 h-4 w-4" /> Click to Select
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="w-full" disabled={isDrawing}>
                                                    <PenSquare className="mr-2 h-4 w-4" /> Draw to Select
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => startDrawing(google.maps.drawing.OverlayType.CIRCLE)}><CircleDot className="mr-2 h-4 w-4" />Circle</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => startDrawing(google.maps.drawing.OverlayType.RECTANGLE)}><RectangleHorizontal className="mr-2 h-4 w-4" />Rectangle</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => startDrawing(google.maps.drawing.OverlayType.POLYGON)}><Spline className="mr-2 h-4 w-4" />Polygon</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        {isDrawing && (
                                            <Button onClick={cancelDrawing} variant="destructive">
                                                <X className="mr-2 h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </TabsContent>
                    </Tabs>
                     {isFieldSalesUser && (
                        <div className="px-6 pb-4">
                             <Alert>
                                <Sparkles className="h-4 w-4" />
                                <AlertTitle className="text-sm font-semibold">Field Sales View</AlertTitle>
                                <AlertDescription className="text-xs">
                                By default, the map shows your assigned leads that have NOT been checked into and are NOT in a saved route.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                </CollapsibleContent>
            </Card>
        </Collapsible>
        
        <div className="flex-grow flex flex-col md:flex-row-reverse gap-4">
            {(selectedRouteLeads.length > 0 || directions) && (
                 <Card className="w-full md:max-w-sm lg:max-w-md flex flex-col">
                    <CardHeader className="pb-2 flex-shrink-0">
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Route className="h-5 w-5" /> Selected Stops ({selectedRouteLeads.length})
                                {isRouteActive && <Badge variant="destructive">Active</Badge>}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => { handleClearRoute(); setDrawnTerritory(null); }}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-hidden flex flex-col gap-2">
                        <ScrollArea className="flex-grow">
                          <div className="space-y-2">
                            {(directions ? sortedRouteLegs : selectedRouteLeads.map((l, i) => ({lead: l, stopNumber: i+1}))).map((item, index) => {
                              if (!item.lead) return null;
                              const lead = item.lead;
                              const leg = (item as any).leg;
                              return (
                                <div key={lead.id}>
                                  <Card className="p-3 flex items-center gap-2">
                                    <GripVertical className="cursor-grab text-muted-foreground" />
                                    <div className="flex-grow">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-bold">
                                            <Button variant="link" className="p-0 h-auto text-left" asChild>
                                              <Link href={`/leads/${lead.id}`} target="_blank">{item.stopNumber ? `${item.stopNumber}. ` : ''}{lead.companyName}</Link>
                                            </Button>
                                          </p>
                                          <p className="text-xs text-muted-foreground">{formatAddress(lead.address as Address)}</p>
                                        </div>
                                        <LeadStatusBadge status={lead.status} />
                                      </div>
                                      <div className="flex items-center justify-between mt-2">
                                        {leg && (
                                          <p className="text-xs text-muted-foreground">
                                            {leg?.duration?.text} • {leg?.distance?.text}
                                          </p>
                                        )}
                                        <div className='flex gap-2'>
                                          <Button size="sm" variant="secondary" onClick={() => handleCheckIn(lead)}>
                                            {lead.isProspect ? <PlusCircle className="mr-2 h-4 w-4" /> : <CheckSquare className="mr-2 h-4 w-4" />}
                                            {lead.isProspect ? 'Add New Lead' : 'Check In'}
                                          </Button>
                                          <Button size="sm" variant="destructive" onClick={() => handleRemoveFromRoute(lead.id)}>
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </Card>
                                </div>
                              )
                            })}
                          </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2 pt-4 border-t flex-shrink-0">
                       <div className="w-full space-y-1">
                          <Label htmlFor="start-point-input">Start Point</Label>
                          <div className="flex gap-2">
                              <Input id="start-point-input" placeholder="Enter start address" value={startPoint} onChange={e => setStartPoint(e.target.value)} ref={startPointInputRef} />
                              <Button variant="ghost" size="icon" onClick={() => setStartPoint('My Location')}><Locate className="h-4 w-4" /></Button>
                          </div>
                      </div>
                      <div className="w-full space-y-1">
                          <Label htmlFor="end-point-input">End Point (Optional)</Label>
                          <Input id="end-point-input" placeholder="Defaults to start point" value={endPoint} onChange={e => setEndPoint(e.target.value)} ref={endPointInputRef} />
                      </div>
                        {totalDistance && totalDuration && (
                            <div className="flex justify-around w-full text-center text-sm p-2 bg-muted rounded-md">
                                <div className="flex items-center gap-2">
                                    <Milestone className="h-4 w-4 text-muted-foreground"/>
                                    <div>
                                        <p className="font-semibold">{totalDistance}</p>
                                        <p className="text-xs text-muted-foreground">Total Distance</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground"/>
                                    <div>
                                        <p className="font-semibold">{totalDuration}</p>
                                        <p className="text-xs text-muted-foreground">Total Time</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button disabled={isCalculatingRoute || selectedRouteLeads.length === 0} className="w-full">
                                    {isCalculatingRoute ? <Loader /> : <Route className="mr-2 h-4 w-4" />}
                                    {directions ? 'Re-calculate Route' : 'Create Route'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleCreateRoute(google.maps.TravelMode.DRIVING, selectedRouteLeads)}><Car className="mr-2 h-4 w-4" />Driving</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreateRoute(google.maps.TravelMode.WALKING, selectedRouteLeads)}><Footprints className="mr-2 h-4 w-4" />Walking</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreateRoute(google.maps.TravelMode.BICYCLING, selectedRouteLeads)}><Bike className="mr-2 h-4 w-4" />Bicycling</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {directions && (
                          <>
                            <div className="w-full flex gap-2">
                                <Button onClick={handleStartRoute} className="w-full bg-green-600 hover:bg-green-700">
                                    <Play className="mr-2 h-4 w-4" />
                                    Start Route
                                </Button>
                                {isRouteActive && (
                                    <Button onClick={handleStopRoute} variant="destructive" className="w-full">
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Stop Route
                                    </Button>
                                )}
                            </div>
                            <Separator />
                            <div className="w-full space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="route-date">Schedule Date (Optional)</Label>
                                        <Popover><PopoverTrigger asChild><Button id="route-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !routeDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{routeDate ? format(routeDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 z-[11]"><Calendar mode="single" selected={routeDate} onSelect={setRouteDate} initialFocus /></PopoverContent></Popover>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="route-name">Route Name</Label>
                                        <Input id="route-name" placeholder="e.g. Tuesday Afternoon Run" value={routeName} onChange={(e) => setRouteName(e.target.value)} />
                                    </div>
                                </div>
                                {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                                    <div className="space-y-1">
                                        <Label htmlFor="route-assignee">Assign Route To</Label>
                                        <Select value={routeAssignee} onValueChange={setRouteAssignee}>
                                            <SelectTrigger><SelectValue placeholder="Select a user..." /></SelectTrigger>
                                            <SelectContent>
                                                {assignableUsers.map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <Button onClick={handleSaveRoute} disabled={!routeName || ((userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && !routeAssignee)} className="w-full">
                                    <Save className="mr-2 h-4 w-4" /> Save Route
                                </Button>
                            </div>
                          </>
                        )}
                        <Button variant="secondary" onClick={() => { handleClearRoute(); setDrawnTerritory(null); }} className="w-full">Clear Selection</Button>
                    </CardFooter>
                </Card>
            )}
            <div className="flex-grow min-h-[60vh] relative rounded-lg overflow-hidden border">
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center}
                    zoom={4}
                    onLoad={setMap}
                    onClick={onMapClick}
                    options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        clickableIcons: false,
                    }}
                >
                    {isDrawing && window.google && (
                        <DrawingManagerF
                            onLoad={(dm) => (drawingManagerRef.current = dm)}
                            onCircleComplete={(c) => onDrawingComplete(c)}
                            onRectangleComplete={(r) => onDrawingComplete(r)}
                            onPolygonComplete={(p) => onDrawingComplete(p)}
                            drawingMode={drawingMode}
                            options={{
                                drawingControl: false,
                                circleOptions: { fillColor: '#8884d8', fillOpacity: 0.2, strokeColor: '#8884d8', strokeWeight: 2, clickable: false, editable: false, zIndex: 1, },
                                rectangleOptions: { fillColor: '#8884d8', fillOpacity: 0.2, strokeColor: '#8884d8', strokeWeight: 2, clickable: false, editable: false, zIndex: 1, },
                                polygonOptions: { fillColor: '#8884d8', fillOpacity: 0.2, strokeColor: '#8884d8', strokeWeight: 2, clickable: false, editable: false, zIndex: 1, },
                            }}
                        />
                    )}
                    <KmlLayer
                        url="https://www.google.com/maps/d/kml?mid=1egKvN5mXdjzwKTzEV5zsLIoEo7_2x3E&force=true"
                        options={{ preserveViewport: true, suppressInfoWindows: true }}
                        onClick={onKmlLayerClick}
                    />
                    {filteredData.map((item) => (
                        <MarkerF
                            key={item.isCompany ? `company-${item.id}` : `lead-${item.id}`}
                            position={{ lat: item.latitude!, lng: item.longitude! }}
                            onClick={() => onMarkerClick(item)}
                            icon={getPinColor(item.status, selectedRouteLeads.some(l => l.id === item.id))}
                            visible={directions === null}
                        />
                    ))}
                    
                    {directions && selectedRouteLeads.map(lead => (
                        <MarkerF
                            key={`route-${lead.id}`}
                            position={{ lat: lead.latitude!, lng: lead.longitude! }}
                            onClick={() => onMarkerClick(lead)}
                            label={(waypointOrderMap.get(lead.id) || 0).toString()}
                        />
                    ))}

                    {myLocation && (
                        <MarkerF
                            position={myLocation}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: '#4285F4',
                                fillOpacity: 1,
                                strokeColor: 'white',
                                strokeWeight: 2,
                            }}
                        />
                    )}

                    {directions && (
                        <DirectionsRenderer
                            directions={directions}
                            options={{
                                suppressMarkers: true,
                                polylineOptions: {
                                    strokeColor: '#095c7b',
                                    strokeWeight: 6,
                                    strokeOpacity: 0.8,
                                },
                            }}
                        />
                    )}

                    {selectedLead && (
                        <InfoWindowF
                            position={{ lat: selectedLead.latitude!, lng: selectedLead.longitude! }}
                            onCloseClick={onInfoWindowClose}
                            options={infoWindowOptions}
                        >
                            <div className="space-y-3 p-1 max-w-xs bg-card text-card-foreground rounded-lg shadow-lg">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg">{selectedLead.companyName}</h3>
                                    <LeadStatusBadge status={selectedLead.status} />
                                </div>

                                {leadToRouteMap.has(selectedLead.id) && (
                                    <Badge variant="secondary" className="w-full justify-center">
                                        <Route className="mr-2 h-4 w-4" />
                                        Already in route: {leadToRouteMap.get(selectedLead.id)}
                                    </Badge>
                                )}

                                <div className="space-y-2 text-sm text-muted-foreground">
                                    {selectedLead.industryCategory && (
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="h-4 w-4 shrink-0" />
                                            <span>{selectedLead.industryCategory}</span>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-2">
                                        <Building className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>{formatAddress(selectedLead.address as Address)}</span>
                                    </div>
                                    {selectedLead.websiteUrl && (
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-4 w-4 shrink-0" />
                                            <a href={selectedLead.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
                                                <span>{selectedLead.websiteUrl.replace(/^(https?:\/\/)?(www\.)?/, '')}</span>
                                                <LinkIcon className="h-3 w-3" />
                                            </a>
                                        </div>
                                    )}
                                    {selectedLead.customerPhone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 shrink-0" />
                                            <a href={`tel:${selectedLead.customerPhone}`} className="text-primary hover:underline flex items-center gap-1">
                                                <span>{selectedLead.customerPhone}</span>
                                                <PhoneCall className="h-3 w-3" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => window.open(selectedLead.isCompany ? `/companies/${selectedLead.id}` : `/leads/${selectedLead.id}`, '_blank')} className="flex-1">
                                            <Briefcase className="mr-2 h-4 w-4" />
                                            View Profile
                                        </Button>
                                        {(!selectedLead.isCompany || userProfile?.role === 'Field Sales') && (
                                            <Button size="sm" variant="secondary" onClick={() => handleCheckIn(selectedLead)} className="flex-1">
                                                <CheckSquare className="mr-2 h-4 w-4" />
                                                Check In
                                            </Button>
                                        )}
                                    </div>
                                    {!selectedLead.isCompany && (
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="secondary" className="flex-1 whitespace-normal h-auto" onClick={handleFindNearbyCompanies} disabled={isFindingNearby}>
                                                <Building className="mr-2 h-4 w-4" />
                                                Nearby Customers
                                            </Button>
                                            <Button size="sm" variant="secondary" className="flex-1 whitespace-normal h-auto" onClick={handleFindNearby} disabled={isSearchingNearby}>
                                                {isSearchingNearby ? <Loader /> : <><Sparkles className="mr-2 h-4 w-4" /><span>AI Find Nearby</span></>}
                                            </Button>
                                            <Button size="sm" variant="secondary" className="flex-1 whitespace-normal h-auto" onClick={handleFindMultiSites}>
                                                <Building className="mr-2 h-4 w-4" />
                                                Find Multi-sites
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </InfoWindowF>
                    )}

                    {clickedKmlFeature && (
                        <InfoWindowF
                            position={clickedKmlFeature.latLng}
                            onCloseClick={onInfoWindowClose}
                        >
                            <div className="p-2">
                                <h3 className="font-bold">{clickedKmlFeature.featureData.name}</h3>
                            </div>
                        </InfoWindowF>
                    )}
                    {!isFieldSalesUser && <MapLegend />}
                </GoogleMap>
            </div>
        </div>

        <Dialog open={isProspectsDialogOpen} onOpenChange={setIsProspectsDialogOpen}>
            <DialogContent className="max-w-4xl w-[95vw] md:w-full">
                <DialogHeader>
                    <DialogTitle>Nearby Prospects</DialogTitle>
                    <DialogDescription>
                        Found {prospects.length} potential leads near {selectedLead?.companyName || 'your location'}.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                    <div className="md:hidden space-y-4">
                        {prospects.map(prospectInfo => (
                            <Card key={prospectInfo.place.place_id} className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="font-medium pr-2">{prospectInfo.place.name}</div>
                                    <Checkbox 
                                        checked={selectedProspects.some(p => p.place_id === prospectInfo.place.place_id)} 
                                        onCheckedChange={() => handleProspectSelection(prospectInfo.place)} 
                                    />
                                </div>
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
                                        <Button size="sm" variant="outline" onClick={() => window.open(`/leads/${prospectInfo.existingLead!.id}`, '_blank')}>
                                            <Eye className="mr-2 h-4 w-4" /> View
                                        </Button>
                                    ) : (
                                        <Button size="sm" onClick={() => setProspectToCreate(prospectInfo.place)} disabled={prospectInfo.isAdding}>
                                            {prospectInfo.isAdding ? <Loader /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                            Add
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>

                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8"><Checkbox onCheckedChange={(checked) => setSelectedProspects(checked ? prospects.map(p => p.place) : [])} /></TableHead>
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
                                        <TableCell><Checkbox checked={selectedProspects.some(p => p.place_id === prospectInfo.place.place_id)} onCheckedChange={() => handleProspectSelection(prospectInfo.place)} /></TableCell>
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button disabled={selectedProspects.length === 0}>
                                <Route className="mr-2 h-4 w-4" />
                                Create Route from Selected ({selectedProspects.length})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleCreateRouteFromProspects(google.maps.TravelMode.DRIVING)}>
                                <Car className="mr-2 h-4 w-4" />
                                Driving
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCreateRouteFromProspects(google.maps.TravelMode.WALKING)}>
                                <Footprints className="mr-2 h-4 w-4" />
                                Walking
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCreateRouteFromProspects(google.maps.TravelMode.BICYCLING)}>
                                <Bike className="mr-2 h-4 w-4" />
                                Bicycling
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                    <Button onClick={handleCreateLeadFromProspect} disabled={isCreatingLead || ((userProfile?.role === 'user' || userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin') && !campaign)}>
                        {isCreatingLead ? <Loader /> : 'Confirm & Create Lead'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={!!duplicateLeadId} onOpenChange={() => setDuplicateLeadId(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Duplicate Lead Found</DialogTitle>
                    <DialogDescription>
                        A lead with this name or phone number already exists in the system.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setDuplicateLeadId(null)}>Cancel</Button>
                    <Button onClick={() => { window.open(`/leads/${duplicateLeadId}`, '_blank'); setDuplicateLeadId(null); }}>
                        View Existing Lead
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
    );
}
    
    
