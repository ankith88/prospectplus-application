
'use client';

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
  HeatmapLayer
} from '@react-google-maps/api'
import { createNewLead, getLeadsFromFirebase, getCompaniesFromFirebase, checkForDuplicateLead, logActivity, saveUserRoute, getUserRoutes, deleteUserRoute, updateUserRoute, getAllUsers, getAllUserRoutes, getAllActivities } from '@/services/firebase'
import type { Lead, LeadStatus, Address, UserProfile, Contact, MapLead, SavedRoute, StorableRoute, Activity } from '@/lib/types'
import { Loader } from './ui/loader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { LeadStatusBadge } from './lead-status-badge'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building, Search, Briefcase, PlusCircle, Eye, Phone, Globe, Link as LinkIcon, Locate, MousePointerClick, CheckSquare, Map as MapIcon, Car, Footprints, Bike, Route, X, History, PenSquare, Trash2, Save, Filter, SlidersHorizontal, Sparkles, PhoneCall, CircleDot, RectangleHorizontal, Spline, GripVertical, UserPlus, MapPin, Play, XCircle, MoreHorizontal, Clock, Milestone, Satellite, ExternalLink } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from './ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { CalendarIcon, Download } from 'lucide-react'
import { Calendar } from './ui/calendar'
import { format, startOfDay, endOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile'


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

const getPinColor = (status: LeadStatus, isInRouteList: boolean, isCheckedForRouting: boolean, isHovered: boolean): string => {
    if (isHovered) {
        return 'http://maps.google.com/mapfiles/ms/icons/purple-pushpin.png';
    }

    if (isCheckedForRouting) {
      return 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png';
    }
    
    if (isInRouteList) {
        return 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png';
    }
    
    const statusColors: Record<LeadStatus, string> = {
        'New': 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        'Contacted': 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
        'In Progress': 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
        'Connected': 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
        'High Touch': 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
        'Reschedule': 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
        'Qualified': 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        'Pre Qualified': 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        'Trialing ShipMate': 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        'Free Trial': 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        'LocalMile Pending': 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        'Won': 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        'Lost': 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        'Unqualified': 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        'Priority Lead': 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        'Priority Field Lead': 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        'LPO Review': 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png',
        'Prospect Opportunity': 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png',
        'Customer Opportunity': 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png',
    };
    
    return statusColors[status] || 'http://maps.google.com/mapfiles/ms/icons/grey.png'; // Default
};


export default function LeadsMapClient() {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  })
  const [mapData, setMapData] = useState<MapLead[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [selectedLead, setSelectedLead] = useState<MapLead | null>(null)
  const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);
  const [clickedKmlFeature, setClickedKmlFeature] = useState<ClickedKmlFeature | null>(null)
  const [prospects, setProspects] = useState<ProspectWithLeadInfo[]>([])
  const [isProspectsDialogOpen, setIsProspectsDialogOpen] = useState(false)
  const [selectedProspects, setSelectedProspects] = useState<google.maps.places.PlaceResult[]>([]);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false)
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
  const [allDialers, setAllDialers] = useState<UserProfile[]>([]);
  const [leadToRouteMap, setLeadToRouteMap] = useState<Map<string, string>>(new Map());
  const [loadedRoute, setLoadedRoute] = useState<SavedRoute | null>(null);
  const [routeDate, setRouteDate] = useState<Date>();
  const [routeAssignee, setRouteAssignee] = useState<string>('');
  const [assignableUsers, setAssignableUsers] = useState<UserProfile[]>([]);
  const [allCheckInActivities, setAllCheckInActivities] = useState<Activity[]>([]);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite'>('roadmap');

  const [isCreatingArea, setIsCreatingArea] = useState(false);
  const [areaLeads, setAreaLeads] = useState<MapLead[]>([]);
  const [areaName, setAreaName] = useState('');
  const [areaAssignee, setAreaAssignee] = useState('');
  const [isSavingArea, setIsSavingArea] = useState(false);
  const [heatmapData, setHeatmapData] = useState<google.maps.LatLng[]>([]);

  
  const geoSearchInputNodeRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const startPointAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const endPointAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [selectedForRouting, setSelectedForRouting] = useState<string[]>([]);

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

  const [routeNameFilter, setRouteNameFilter] = useState('');
  const [routeAddressFilter, setRouteAddressFilter] = useState('');

  const [searchedLocation, setSearchedLocation] = useState<google.maps.LatLngLiteral | null>(null);
  
  const [streetsForArea, setStreetsForArea] = useState<{place_id: string, description: string}[]>([]);
  const [streetMarkers, setStreetMarkers] = useState<google.maps.LatLngLiteral[]>([]);
  const [streetSearchInput, setStreetSearchInput] = useState('');
  const [streetPredictions, setStreetPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [streetAutocompleteService, setStreetAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [isSaveAreaDialogOpen, setIsSaveAreaDialogOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaAssignee, setNewAreaAssignee] = useState('');


  const [filters, setFilters] = useState({
    companyName: '',
    franchisee: [] as string[],
    status: [] as string[],
    state: [] as string[],
    checkInStatus: 'all' as 'all' | 'checked-in' | 'not-checked-in',
    checkInDate: undefined as DateRange | undefined,
    routeStatus: 'all' as 'all' | 'in-route' | 'not-in-route',
    campaign: 'all',
    fieldSales: 'all' as 'all' | 'yes' | 'no',
    dialerAssigned: [] as string[],
  });
  
  const router = useRouter()
  const { toast } = useToast()
  const { userProfile, loading: authLoading, savedRoutes } = useAuth();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const routeIdToLoad = searchParams.get('routeId');
  const addLeadId = searchParams.get('addLead');

  const isFieldSalesUser = userProfile?.role === 'Field Sales' || userProfile?.role === 'Field Sales Admin';
  const canCreateArea = userProfile?.role && ['admin', 'Field Sales Admin', 'Lead Gen Admin'].includes(userProfile.role);

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
    if (isCreatingArea) {
        setIsCreatingArea(false);
    }
    toast({ title: "Drawing Mode Canceled" });
  };
  
  const startAreaCreation = (mode: google.maps.drawing.OverlayType) => {
    setIsCreatingArea(true);
    startDrawing(mode);
  }

  const cancelAreaCreation = () => {
    cancelDrawing();
  }

  const handleRemoveFromArea = (leadId: string) => {
    setAreaLeads(prev => prev.filter(l => l.id !== leadId));
  };
  
  const handleSaveProspectingArea = async () => {
    let finalAreaName = newAreaName.trim();
    if (!finalAreaName) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Please provide a name for the prospecting area.' });
      return;
    }

    if (canCreateArea && !newAreaAssignee) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select an assignee for the area.',
      });
      return;
    }
    
    const assigneeToUse = canCreateArea ? newAreaAssignee : userProfile?.uid;
    if (!assigneeToUse) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not determine assignee.' });
        return;
    }

    setIsSavingArea(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const geocodedStreets = await Promise.all(
          streetsForArea.map(street => 
              new Promise<{ name: string; placeId: string, lat: number, lng: number } | null>(resolve => {
                  geocoder.geocode({ placeId: street.place_id }, (results, status) => {
                      if (status === 'OK' && results?.[0]?.geometry?.location) {
                          resolve({
                              name: street.description,
                              placeId: street.place_id,
                              lat: results[0].geometry.location.lat(),
                              lng: results[0].geometry.location.lng()
                          });
                      } else {
                          resolve(null);
                      }
                  });
              })
          )
      );

      const validStreets = geocodedStreets.filter(s => s !== null) as { name: string; placeId: string, lat: number, lng: number }[];

      const newRouteData: Partial<StorableRoute> = {
        name: finalAreaName,
        createdAt: new Date().toISOString(),
        streets: validStreets,
        leads: areaLeads,
        travelMode: google.maps.TravelMode.DRIVING,
        isProspectingArea: true,
      };

      const savedRouteId = await saveUserRoute(assigneeToUse, newRouteData as any);
      
      const assigneeData = assignableUsers.find(u => u.uid === assigneeToUse);
      const newRouteForState: SavedRoute & { userName: string, userId: string } = {
        ...newRouteData as any,
        id: savedRouteId,
        userId: assigneeToUse,
        userName: assigneeData?.displayName || userProfile?.displayName || 'Unknown',
        directions: null,
      };

      setAllSystemRoutes(prev => [newRouteForState, ...prev]);

      toast({
        title: 'Area Created',
        description: `Prospecting area "${finalAreaName}" has been created and assigned.`,
      });
      
      setNewAreaName('');
      setNewAreaAssignee('');
      setAreaLeads([]);
      setStreetsForArea([]);
      setStreetMarkers([]);
      setHeatmapData([]);
      setIsCreatingArea(false);
      setIsSaveAreaDialogOpen(false);
      
    } catch (error) {
      console.error('Failed to save prospecting area:', error);
      toast({
        variant: 'destructive',
        title: 'Error Saving Area',
        description: 'An unexpected error occurred while saving the prospecting area.',
      });
    } finally {
      setIsSavingArea(false);
    }
  };


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
    if (isLoaded) {
      setTravelMode(google.maps.TravelMode.DRIVING);
      setStreetAutocompleteService(new window.google.maps.places.AutocompleteService());
    }
  }, [isLoaded]);

  useEffect(() => {
    setLocalSavedRoutes(savedRoutes);
  }, [savedRoutes]);

  useEffect(() => {
    if (!userProfile) return;

    if (canCreateArea) {
        getAllUsers().then(users => {
            setAssignableUsers(users.filter(u => u.role === 'Field Sales'));
        });
    }

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
  }, [userProfile, canCreateArea]);
  
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
        if (isLoaded && userProfile) {
            const fetchData = async () => {

                setLoadingData(true);
                try {
                    const [mapLeads, mapCompanies, checkIns, users] = await Promise.all([
                        getLeadsFromFirebase({ summary: true }),
                        getCompaniesFromFirebase(),
                        getAllActivities(true),
                        getAllUsers(),
                    ]);
                    
                    setAllCheckInActivities(checkIns);
                    setAllDialers(users);
                    setAssignableUsers(users.filter(u => u.role === 'Field Sales'));

                    const uniqueMap = new Map<string, MapLead>();

                    if (mapLeads) {
                        mapLeads
                            .filter(lead => lead.latitude != null && lead.longitude != null)
                            .forEach(lead => {
                                const mapLead: MapLead = {
                                    ...lead,
                                    latitude: Number(lead.latitude),
                                    longitude: Number(lead.longitude),
                                    isCompany: false,
                                    isProspect: false,
                                };
                                uniqueMap.set(lead.id, mapLead);
                            });
                    }

                    if (mapCompanies) {
                        mapCompanies
                            .filter(company => company.latitude != null && company.longitude != null)
                            .forEach(company => {
                                const mapLead: MapLead = {
                                    ...company,
                                    latitude: Number(company.latitude),
                                    longitude: Number(company.longitude),
                                    isCompany: true,
                                    isProspect: false,
                                    status: 'Won' as const,
                                };
                                // This will overwrite a lead if it's also a company, ensuring it's treated as a company
                                uniqueMap.set(company.id, mapLead);
                            });
                    }

                    setMapData(Array.from(uniqueMap.values()));

                } catch (error) {
                    console.error("Failed to fetch map data:", error);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not load map data.' });
                } finally {
                    setLoadingData(false);
                }
            };
            fetchData();
        }
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
        if (loadingData || !isLoaded || (!routeIdToLoad && !localStorage.getItem('activeRouteId'))) return;
        
        const routeId = routeIdToLoad || localStorage.getItem('activeRouteId');
        if (!routeId) return;

        const allAvailableRoutes = [...allSystemRoutes, ...localSavedRoutes];
        const uniqueRoutes = Array.from(new Set(allAvailableRoutes.map(r => r.id))).map(id => allAvailableRoutes.find(r => r.id === id)!);
        
        const routeToLoad = uniqueRoutes.find(r => r.id === routeId);

        if (routeToLoad) {
            handleLoadRoute(routeToLoad);
            if (localStorage.getItem('activeRouteId')) {
                setIsRouteActive(true);
            }
            if (routeIdToLoad) {
                router.replace('/leads/map', { scroll: false });
            }
        } else if (routeIdToLoad) {
            toast({
                variant: 'destructive',
                title: 'Route Not Found',
                description: "The specified route could not be found.",
            });
        }
    }, [allSystemRoutes, localSavedRoutes, isLoaded, loadingData, handleLoadRoute, routeIdToLoad, toast, router]);
    
     useEffect(() => {
      if(addLeadId && mapData.length > 0){
        const leadToAdd = mapData.find(l => l.id === addLeadId);
        if(leadToAdd) {
            setSelectedRouteLeads(prev => [...prev, leadToAdd]);
             toast({
                title: "Lead Added to Route Planner",
                description: `${leadToAdd.companyName} has been added to your current route list.`,
            });
        }
        router.replace('/leads/map', { scroll: false });
      }
    }, [addLeadId, mapData, router, toast]);

    const visibleData = useMemo(() => {
      if (!userProfile) return [];
      const displayName = userProfile.displayName;
      
      return mapData.filter(item => {
        if (userProfile.role === 'admin' || userProfile.role === 'Lead Gen Admin') {
          return true;
        }
        if (userProfile.role === 'Field Sales' || userProfile.role === 'Field Sales Admin') {
          return item.isCompany || (item.fieldSales === true && (userProfile.role === 'Field Sales' ? item.dialerAssigned === displayName : true));
        }
        if (userProfile.role === 'user' || userProfile.role === 'Lead Gen') {
          return !item.isCompany && item.dialerAssigned === displayName;
        }
        return false;
      });
    }, [mapData, userProfile]);
  
    const filteredData = useMemo(() => {
        if (!userProfile) return [];
    
        const checkedInLeadIds = new Set(allCheckInActivities.map(a => a.leadId));
    
        return visibleData.filter(item => {
          const companyNameMatch = filters.companyName ? item.companyName?.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
          const dialerMatch = filters.dialerAssigned.length === 0 || (item.dialerAssigned && filters.dialerAssigned.includes(item.dialerAssigned));
          const franchiseeMatch = filters.franchisee.length === 0 || (item.franchisee && filters.franchisee.includes(item.franchisee));
          const stateMatch = filters.state.length === 0 || (item.address?.state && filters.state.includes(item.address.state));
          const statusMatch = filters.status.length > 0 ? filters.status.includes(item.status) : true;
    
          let campaignMatch = true;
          if (filters.campaign && filters.campaign !== 'all') {
            const leadCampaign = (item as Lead).campaign;
            if (filters.campaign === 'D2D') {
              campaignMatch = leadCampaign === 'Door-to-Door Field Sales' || leadCampaign === 'Door-to-door Field Sales';
            } else {
              campaignMatch = leadCampaign === filters.campaign;
            }
          }
    
          if (!companyNameMatch || !dialerMatch || !franchiseeMatch || !stateMatch || !statusMatch || !campaignMatch) {
            return false;
          }
    
          if (item.isCompany) {
            return true;
          }
    
          const hasBeenCheckedIn = checkedInLeadIds.has(item.id);
          const checkInStatusMatch = filters.checkInStatus === 'all' ||
            (filters.checkInStatus === 'checked-in' && hasBeenCheckedIn) ||
            (filters.checkInStatus === 'not-checked-in' && !hasBeenCheckedIn);
    
          let checkInDateMatch = true;
          if (filters.checkInDate?.from) {
            if (!hasBeenCheckedIn) {
              checkInDateMatch = false;
            } else {
              const fromDate = startOfDay(filters.checkInDate.from);
              const toDate = filters.checkInDate.to ? endOfDay(filters.checkInDate.to) : endOfDay(filters.checkInDate.from);
              const checkInActivity = allCheckInActivities.find(a => a.leadId === item.id);
              if (checkInActivity) {
                const checkInDate = new Date(checkInActivity.date);
                checkInDateMatch = checkInDate >= fromDate && checkInDate <= toDate;
              } else {
                checkInDateMatch = false;
              }
            }
          }
    
          const isInRoute = leadToRouteMap.has(item.id);
          const routeStatusMatch = filters.routeStatus === 'all' ||
            (filters.routeStatus === 'in-route' && isInRoute) ||
            (filters.routeStatus === 'not-in-route' && !isInRoute);
    
          const fieldSalesMatch = filters.fieldSales === 'all' ||
            (filters.fieldSales === 'yes' && item.fieldSales === true) ||
            (filters.fieldSales === 'no' && (item.fieldSales === false || item.fieldSales === undefined));
    
          return checkInStatusMatch && checkInDateMatch && routeStatusMatch && fieldSalesMatch;
        });
    }, [visibleData, filters, allCheckInActivities, leadToRouteMap, userProfile]);
    
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

  const dialerOptions: Option[] = useMemo(() => {
    return allDialers
      .filter(d => d.displayName)
      .map(d => ({ value: d.displayName!, label: d.displayName! }))
      .sort((a,b) => a.label.localeCompare(b.label));
  }, [allDialers]);

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
        let campaign = lead.campaign;
        if (campaign === 'Door-to-Door Field Sales' || campaign === 'Door-to-door Field Sales') {
            campaign = 'D2D';
        }
        return campaign;
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
    
    // Use the core name for a broader match
    const coreName = keyword.split(' - ')[0];

    const handleResults = async (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const openProspects = results.filter(place => place.business_status === 'OPERATIONAL');

        const detailedProspectsPromises = openProspects.map(async (place) => {
          if (!place.place_id) return null;
          
          const detailedPlace = await getPlaceDetails(place.place_id);
          if (!detailedPlace) return null;

          const getComponent = (type: string) => detailedPlace.address_components?.find(c => c.types.includes(type))?.long_name;
          const prospectSuburb = (getComponent('locality') || getComponent('postal_town') || '').toLowerCase();
          const prospectPostcode = (getComponent('postal_code') || '').toLowerCase();
          
          const isDuplicate = mapData.some(existing => {
              const existingNameLower = existing.companyName.toLowerCase().replace(/[^a-z0-9]/gi, '');
              
              const coreNameToMatch = coreName.toLowerCase().replace(/[^a-z0-9]/gi, '');
              if (!existingNameLower.includes(coreNameToMatch)) {
                  return false;
              }

              const existingCity = ((existing as any).city || '').trim().toLowerCase();
              const existingZip = ((existing as any).zip || '').trim().toLowerCase();
              
              if (!existingCity || !existingZip) return false;

              const isSuburbMatch = existingCity.includes(prospectSuburb) || prospectSuburb.includes(existingCity);
              const isPostcodeMatch = existingZip === prospectPostcode;

              return isSuburbMatch && isPostcodeMatch;
          });

          if (isDuplicate) {
             const existingLead = mapData.find(l => {
                  const existingNameLower = l.companyName.toLowerCase().replace(/[^a-z0-9]/gi, '');
                  if (!existingNameLower.includes(coreName.toLowerCase().replace(/[^a-z0-9]/gi, ''))) return false;
                  
                  const existingCity = ((l as any).city || '').trim().toLowerCase();
                  const existingZip = ((l as any).zip || '').trim().toLowerCase();
                  
                   if (!existingCity || !existingZip) return false;

                   const isSuburbMatch = existingCity.includes(prospectSuburb) || prospectSuburb.includes(existingCity);
                   const isPostcodeMatch = existingZip === prospectPostcode;

                   return isSuburbMatch && isPostcodeMatch;
             });
             return { place: detailedPlace, existingLead: existingLead, classification: 'B2B', description: 'Existing lead/customer.' };
          }

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
          
          return { place: detailedPlace, existingLead: undefined, classification, description };
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

  const handleStreetSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStreetSearchInput(value);
    if (streetAutocompleteService && value) {
      streetAutocompleteService.getPlacePredictions(
        { input: value, componentRestrictions: { country: 'au' }, types: ['address'] },
        (preds, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && preds) {
            setStreetPredictions(preds);
          } else {
            setStreetPredictions([]);
          }
        }
      );
    } else {
      setStreetPredictions([]);
    }
  };

  const handleStreetSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!streetsForArea.find(s => s.place_id === prediction.place_id)) {
      setStreetsForArea(prev => [...prev, { place_id: prediction.place_id, description: prediction.description }]);
      
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
            const location = results[0].geometry.location;
            setStreetMarkers(prev => [...prev, { lat: location.lat(), lng: location.lng() }]);
            map?.panTo(location);
            map?.setZoom(15);
        }
      });
    }
    setStreetSearchInput('');
    setStreetPredictions([]);
  };

  const handleRemoveStreet = (place_id: string) => {
    setStreetsForArea(prev => prev.filter(s => s.place_id !== place_id));
    setStreetMarkers(prev => {
        // This is a bit tricky without more info, so we'll just clear them all and let them be re-added if necessary
        // A more robust solution would store lat/lng with the street in streetsForArea
        return [];
    })
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

        const duplicateId = await checkForDuplicateLead(
            place.name, 
            place.website,
            `info@${(place.website || '').replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]}`,
            parseAddressComponents(place.address_components || [])
        );
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
        setSelectedForRouting([]);
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
    
    const handleLocateLead = (lead: MapLead) => {
        if (map && lead.latitude && lead.longitude) {
            map.panTo({ lat: lead.latitude, lng: lead.longitude });
            map.setZoom(17);
            setSelectedLead(lead);
        }
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
            startPoint,
            endPoint,
            directions: directions ? JSON.stringify(directions) : undefined,
            scheduledDate: routeDate ? new Date(routeDate).toISOString() : undefined,
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
    
    const formatAddress = (address?: { street?: string; city?: string; state?: string, franchisee?: string } | string) => {
        if (!address) return 'Address not available';
        if (typeof address === 'string') return address;
        return [
            address.street,
            address.city,
            address.state,
        ].filter(Boolean).join(', ');
    }
    
    const sortedSelectedRouteLeads = useMemo(() => {
        let filtered = [...selectedRouteLeads];

        if (routeNameFilter) {
            filtered = filtered.filter(lead => lead.companyName.toLowerCase().includes(routeNameFilter.toLowerCase()));
        }

        if (routeAddressFilter) {
            filtered = filtered.filter(lead => 
                formatAddress(lead.address as Address).toLowerCase().includes(routeAddressFilter.toLowerCase())
            );
        }

        return filtered.sort((a, b) => {
            const addressA = ((a.address as Address)?.street || '').toLowerCase();
            const addressB = ((b.address as Address)?.street || '').toLowerCase();
            if (addressA.localeCompare(addressB) !== 0) {
                return addressA.localeCompare(addressB);
            }
            return a.companyName.toLowerCase().localeCompare(b.companyName.toLowerCase());
        });
    }, [selectedRouteLeads, routeNameFilter, routeAddressFilter]);
    
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
        initAutocomplete(node, autocompleteRef, (place) => {
            if (place.geometry?.location) {
                const location = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                };
                setSearchedLocation(location);

                if (place.geometry?.viewport) {
                    map.fitBounds(place.geometry.viewport);
                } else {
                    map.panTo(location);
                    map.setZoom(15);
                }
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

    const onDrawingComplete = (overlay: google.maps.Circle | google.maps.Rectangle | google.maps.Polygon) => {
        const getter = (obj: any, key: string) => typeof obj.get === 'function' ? obj.get(key) : obj[key];
    
        const itemsInShape = filteredData.filter(item => {
            if (item.latitude && item.longitude) {
                const itemLatLng = new window.google.maps.LatLng(item.latitude, item.longitude);
                if ((overlay as any).get('radius')) { // Circle
                    const center = (overlay as google.maps.Circle).getCenter();
                    if (!center) return false;
                    return google.maps.geometry.spherical.computeDistanceBetween(center, itemLatLng) <= (overlay as google.maps.Circle).getRadius();
                } else if ((overlay as any).get('bounds')) { // Rectangle
                    const bounds = (overlay as google.maps.Rectangle).getBounds();
                    return !!bounds && bounds.contains(itemLatLng);
                } else { // Polygon
                    return google.maps.geometry.poly.containsLocation(itemLatLng, overlay as google.maps.Polygon);
                }
            }
            return false;
        });
    
        if (isCreatingArea) {
            setAreaLeads(itemsInShape as MapLead[]);
            setHeatmapData(itemsInShape.map(l => new window.google.maps.LatLng(l.latitude!, l.longitude!)));
        } else {
            setSelectedRouteLeads(prev => {
                const currentIds = new Set(prev.map(p => p.id));
                const newLeads = itemsInShape.filter(l => !currentIds.has(l.id));
                return [...prev, ...newLeads];
            });
            
            toast({
                title: `${itemsInShape.length} Leads Added`,
                description: "Leads within the drawn area have been added to your route list.",
            });
        }
        
        (overlay as any).setMap(null); // Remove the shape from the map
        setDrawingMode(null);
        setIsDrawing(false);
    };

    const handleExportProspects = useCallback(() => {
        if (prospects.length === 0) {
        toast({ variant: 'destructive', title: 'No Data', description: 'There are no prospects to export.' });
        return;
        }

        const headers = ['Name', 'Address', 'Classification', 'Description', 'Website', 'Phone'];
        const rows = prospects.map(p => {
        return [
            escapeCsvCell(p.place.name),
            escapeCsvCell(p.place.vicinity),
            escapeCsvCell(p.classification),
            escapeCsvCell(p.description),
            escapeCsvCell(p.place.website),
            escapeCsvCell(p.place.formatted_phone_number),
        ];
        });

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `nearby_prospects_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [prospects, toast]);
    

    const handleFindProspectsNearMe = useCallback(() => {
        if (!myLocation) {
            toast({
                variant: 'destructive',
                title: 'Location Unknown',
                description: 'Click "My Location" first to set your position on the map.',
            });
            handleShowMyLocation();
            return;
        }
        if (!prospectSearchQuery) {
            toast({
                variant: 'destructive',
                title: 'Search Term Missing',
                description: 'Please enter what you are looking for (e.g., "cafe").',
            });
            return;
        }
        findProspects(myLocation, prospectSearchQuery);
    }, [myLocation, prospectSearchQuery, findProspects, handleShowMyLocation, toast]);

  if (authLoading || loadingData || !isLoaded) {
      return (
          <div className="flex h-full items-center justify-center">
            <Loader />
          </div>
      )
  }
  
  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) ? val.length > 0 : val && val !== 'all'));
  
  const infoWindowOptions = {
    pixelOffset: new window.google.maps.Size(0, -30),
  };

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
    const isToday = (dateString?: string) => {
      if (!dateString) return false;
      const date = new Date(dateString);
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    };

    return (
      <>
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
                          <Button onClick={handleShowMyLocation} variant="outline" size="sm">
                          <Locate className="mr-2 h-4 w-4" /> My Location
                          </Button>
                          <Button
                              onClick={() => setMapTypeId(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
                              variant="outline" size="sm"
                          >
                          <Satellite className="mr-2 h-4 w-4" />
                          {mapTypeId === 'roadmap' ? 'Satellite' : 'Roadmap'}
                          </Button>
                          <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                              <SlidersHorizontal className="h-4 w-4" />
                              <span className="ml-2">Toggle Controls</span>
                          </Button>
                          </CollapsibleTrigger>
                      </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <div className="px-6 pb-4">
                      <div className="space-y-2">
                        <Label>Go to Location</Label>
                        <Input id="geo-search-input" placeholder="Suburb, state, postcode..." ref={geoSearchInputRef} />
                      </div>
                    </div>

                    <Tabs defaultValue="filters">
                        <CardContent>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="filters">Filters</TabsTrigger>
                            <TabsTrigger value="route-planner">Route Planner</TabsTrigger>
                            <TabsTrigger value="prospecting">Prospecting</TabsTrigger>
                        </TabsList>
                        </CardContent>
                        <TabsContent value="filters">
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Company Name</Label>
                                    <Input placeholder="Filter by company name..." value={filters.companyName} onChange={(e) => handleFilterChange('companyName', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                <Label>Dialer Assigned</Label>
                                <MultiSelectCombobox options={dialerOptions} selected={filters.dialerAssigned} onSelectedChange={(selected) => handleFilterChange('dialerAssigned', selected)} placeholder="Select Dialers..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Franchisee</Label>
                                    <MultiSelectCombobox options={uniqueFranchisees} selected={filters.franchisee} onSelectedChange={(selected) => handleFilterChange('franchisee', selected)} placeholder="Select Franchisees..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <MultiSelectCombobox options={uniqueStatuses} selected={filters.status} onSelectedChange={(selected) => handleFilterChange('status', selected)} placeholder="Select Statuses..."/>
                                </div>
                                <div className="space-y-2">
                                    <Label>State</Label>
                                    <MultiSelectCombobox options={uniqueStates} selected={filters.state} onSelectedChange={(selected) => handleFilterChange('state', selected)} placeholder="Select States..." />
                                </div>
                                <div className="space-y-2">
                                <Label>Lead Type</Label>
                                <Select value={filters.fieldSales} onValueChange={(value) => handleFilterChange('fieldSales', value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="all">All Leads</SelectItem>
                                    <SelectItem value="yes">Field Sales</SelectItem>
                                    <SelectItem value="no">Outbound</SelectItem>
                                    </SelectContent>
                                </Select>
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
                                <Select value={filters.checkInStatus} onValueChange={(value) => handleFilterChange('checkInStatus', value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="checked-in">Checked-in</SelectItem>
                                    <SelectItem value="not-checked-in">Not Checked-in</SelectItem>
                                    </SelectContent>
                                </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Check-in Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button id="checkInDate" variant={'outline'} className="w-full justify-start text-left font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filters.checkInDate?.from ? (filters.checkInDate.to ? <>{format(filters.checkInDate.from, "LLL dd, y")} - {format(filters.checkInDate.to, "LLL dd, y")}</> : format(filters.checkInDate.from, "LLL dd, y")) : <span>Pick a date range</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-[11]">
                                            <Calendar mode="range" selected={filters.checkInDate} onSelect={(date) => handleFilterChange('checkInDate', date)}/>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                <Label>Route Status</Label>
                                <Select value={filters.routeStatus} onValueChange={(value) => handleFilterChange('routeStatus', value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="in-route">In a Saved Route</SelectItem>
                                    <SelectItem value="not-in-route">Not in a Route</SelectItem>
                                    </SelectContent>
                                </Select>
                                </div>
                                {hasActiveFilters && (
                                    <div className="space-y-2 col-start-1">
                                        <Button variant="ghost" onClick={clearFilters}>
                                            <X className="mr-2 h-4 w-4" /> Clear Filters
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </TabsContent>
                        <TabsContent value="route-planner">
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                <Label>Selection Tools</Label>
                                <div className="flex items-center gap-2">
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
                                        <X className="mr-2 h-4 w-4"/>
                                    </Button>
                                    )}
                                </div>
                                </div>
                            </CardContent>
                        </TabsContent>
                        <TabsContent value="prospecting">
                          <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label>Find New Prospects Near Me</Label>
                                <div className="flex items-center gap-2">
                                    <Input placeholder="e.g. cafe, warehouse" value={prospectSearchQuery} onChange={e => setProspectSearchQuery(e.target.value)} />
                                    <Button onClick={handleFindProspectsNearMe} disabled={isSearchingNearby}>
                                        {isSearchingNearby ? <Loader/> : <Search className="h-4 w-4" />}
                                    </Button>
                                </div>
                              </div>
                              <Separator/>
                              <Tabs defaultValue="by-drawing">
                                <TabsList className="grid w-full grid-cols-2">
                                  <TabsTrigger value="by-drawing">By Drawing</TabsTrigger>
                                  <TabsTrigger value="by-street">By Street</TabsTrigger>
                                </TabsList>
                                <TabsContent value="by-drawing" className="pt-4">
                                  <div className="space-y-2">
                                    <Label>Draw Prospecting Area</Label>
                                    <p className="text-xs text-muted-foreground">Draw a shape on the map to find all businesses within that area.</p>
                                    <div className="flex items-center gap-2">
                                      <Button onClick={() => startAreaCreation(google.maps.drawing.OverlayType.RECTANGLE)} variant="outline" className="w-full" disabled={isDrawing}>
                                          <RectangleHorizontal className="mr-2 h-4 w-4"/> Draw Rectangle
                                      </Button>
                                      <Button onClick={() => startAreaCreation(google.maps.drawing.OverlayType.POLYGON)} variant="outline" className="w-full" disabled={isDrawing}>
                                          <Spline className="mr-2 h-4 w-4"/> Draw Polygon
                                      </Button>
                                      {isDrawing && isCreatingArea && (<Button onClick={cancelAreaCreation} variant="destructive"><X className="mr-2 h-4 w-4"/></Button>)}
                                    </div>
                                  </div>
                                </TabsContent>
                                <TabsContent value="by-street" className="pt-4">
                                  <div className="space-y-2">
                                    <Label>Search by Street Name</Label>
                                     <Input
                                        placeholder="Start typing a street name..."
                                        value={streetSearchInput}
                                        onChange={handleStreetSearchChange}
                                     />
                                    {streetPredictions.length > 0 && (
                                        <Card className="relative z-50 w-full mt-1">
                                            <CardContent className="p-1">
                                                {streetPredictions.map((prediction) => (
                                                    <div
                                                        key={prediction.place_id}
                                                        className="p-2 hover:bg-accent rounded-md cursor-pointer text-sm"
                                                        onClick={() => handleStreetSelect(prediction)}
                                                    >
                                                        {prediction.description}
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    )}
                                  </div>
                                </TabsContent>
                              </Tabs>
                          </CardContent>
                        </TabsContent>
                    </Tabs>
                  </CollapsibleContent>
              </Card>
          </Collapsible>
          <div className="flex-grow min-h-[60vh] relative rounded-lg overflow-hidden border">
          <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={4}
              onLoad={setMap}
              onClick={onMapClick}
              options={{ streetViewControl: false, mapTypeControl: false, clickableIcons: false }}
              mapTypeId={mapTypeId}
          >
            {isDrawing && (
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
            {filteredData.map((item) => {
              if (item.latitude == null || item.longitude == null) return null;
              const isSelected = selectedRouteLeads.some(l => l.id === item.id);
              const isChecked = selectedForRouting.includes(item.id);
              const pinColor = getPinColor(item.status, isSelected, isChecked, hoveredLeadId === item.id);
        
              return (
                <MarkerF
                  key={item.id}
                  position={{ lat: item.latitude, lng: item.longitude }}
                  icon={{ url: pinColor }}
                  onClick={() => onMarkerClick(item)}
                  onMouseOver={() => setHoveredLeadId(item.id)}
                  onMouseOut={() => setHoveredLeadId(null)}
                />
              );
            })}
             {selectedLead && (
              <InfoWindowF
                position={{ lat: Number(selectedLead.latitude!), lng: Number(selectedLead.longitude!) }}
                onCloseClick={onInfoWindowClose}
                options={infoWindowOptions}
              >
                <div className="p-2 max-w-xs space-y-2">
                  <h3 className="font-bold text-lg">{selectedLead.companyName}</h3>
                  <p className="text-sm"><LeadStatusBadge status={selectedLead.status} /></p>
                  <p className="text-sm text-muted-foreground">{formatAddress(selectedLead.address as Address)}</p>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" onClick={() => window.open(selectedLead.isCompany ? `/companies/${selectedLead.id}` : `/leads/${selectedLead.id}`, '_blank')}>
                      <ExternalLink className="mr-2 h-4 w-4" /> View {selectedLead.isCompany ? 'Customer' : 'Lead'}
                    </Button>
                    {selectedLead.isCompany ? (
                      <>
                        <Button size="sm" variant="outline" onClick={handleFindNearbyCompanies} disabled={isFindingNearby}>
                          {isFindingNearby ? <Loader /> : <Search className="mr-2 h-4 w-4" />}
                          Nearby Leads
                        </Button>
                         <Button size="sm" variant="outline" onClick={handleFindNearby} disabled={isFindingNearby || (selectedLead.lastProspected && isToday(selectedLead.lastProspected))}>
                          {isFindingNearby ? <Loader /> : <Sparkles className="mr-2 h-4 w-4" />}
                          {isFindingNearby ? 'Searching...' : 'AI Find Similar'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleFindMultiSites}>
                          <Building className="mr-2 h-4 w-4" /> Find Multi-sites
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => handleCheckIn(selectedLead)}>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        Check In
                      </Button>
                    )}
                  </div>
                </div>
              </InfoWindowF>
            )}
            {streetMarkers.map((marker, index) => (
                <MarkerF
                    key={`street-marker-${index}`}
                    position={marker}
                    icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/blue-pushpin.png',
                    }}
                />
            ))}
          </GoogleMap>
          </div>
      </div>
      <Dialog open={isSaveAreaDialogOpen} onOpenChange={setIsSaveAreaDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Save Prospecting Area</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="area-name">Area Name</Label>
                    <Input
                        id="area-name"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        placeholder="e.g. North Sydney Industrial Zone"
                    />
                </div>
                {canCreateArea && (
                    <div className="space-y-2">
                        <Label htmlFor="area-assignee">Assign to Field Rep</Label>
                        <Select value={newAreaAssignee} onValueChange={setNewAreaAssignee}>
                            <SelectTrigger id="area-assignee">
                                <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent>
                                {assignableUsers.map((user) => (
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
                <Button variant="outline" onClick={() => setIsSaveAreaDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveProspectingArea} disabled={isSavingArea || !newAreaName || (canCreateArea && !newAreaAssignee)}>
                    {isSavingArea ? <Loader /> : 'Save Area'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
    );
}

    

    