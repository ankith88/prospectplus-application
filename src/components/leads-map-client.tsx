
'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import { createNewLead, getLeadsFromFirebase, getCompaniesFromFirebase, checkForDuplicateLead, logActivity, saveUserRoute, getUserRoutes, deleteUserRoute, updateUserRoute } from '@/services/firebase'
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import type { Lead, LeadStatus, Address, UserProfile, Contact, MapLead, SavedRoute, StorableRoute } from '@/lib/types'
import { Loader } from './ui/loader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { LeadStatusBadge } from './lead-status-badge'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { useRouter } from 'next/navigation'
import { Building, Search, Briefcase, PlusCircle, Eye, Phone, Globe, Link as LinkIcon, Locate, MousePointerClick, CheckSquare, Map as MapIcon, Car, Footprints, Bike, Route, X, History, PenSquare, Trash2, Save, Filter, SlidersHorizontal, Sparkles, PhoneCall } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
import { format } from 'date-fns'


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
    
    // This is a bit of a hack to get lat/lng, as it's not directly in address_components
    // The correct way is to use place.geometry.location if available.
    // This is a fallback.
    if ((components as any).geometry?.location) {
        address.lat = (components as any).geometry.location.lat();
        address.lng = (components as any).geometry.location.lng();
    }


    return address as Address;
};


const getPinColor = (status: LeadStatus, isSelected: boolean): string => {
    const greenStatuses: LeadStatus[] = ['Qualified', 'Won', 'Pre Qualified', 'Trialing ShipMate'];
    const yellowStatuses: LeadStatus[] = ['Contacted', 'In Progress', 'Connected', 'High Touch', 'Reschedule'];
    const redStatuses: LeadStatus[] = ['Lost', 'Unqualified', 'Priority Lead'];
    const blueStatuses: LeadStatus[] = ['New'];
    const purpleStatuses: LeadStatus[] = ['LPO Review'];

    if (isSelected) {
      return 'http://maps.google.com/mapfiles/ms/icons/purple-pushpin.png';
    }
    
    if (status === 'Won') {
      return 'http://maps.google.com/mapfiles/ms/icons/teal-pushpin.png';
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
    return 'http://maps.google.com/mapfiles/ms/icons/grey-dot.png'; // Default
};


export default function LeadsMapClient() {
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
  const [geoSearchQuery, setGeoSearchQuery] = useState('');
  const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);
  const [viewingDescription, setViewingDescription] = useState<string | null>(null);
  const [nearbyCompanies, setNearbyCompanies] = useState<MapLead[]>([]);
  const [isNearbyCompaniesDialogOpen, setIsNearbyCompaniesDialogOpen] = useState(false);
  const [isFindingNearby, setIsFindingNearby] = useState(false);
  const [localSavedRoutes, setLocalSavedRoutes] = useState<SavedRoute[]>([]);
  const [loadedRoute, setLoadedRoute] = useState<SavedRoute | null>(null);
  const [routeDate, setRouteDate] = useState<Date>();


  // Routing and Drawing state
  const [selectedRouteLeads, setSelectedRouteLeads] = useState<MapLead[]>([]);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [travelMode, setTravelMode] = useState<google.maps.TravelMode | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const [routeName, setRouteName] = useState('');
  const [isRouteActive, setIsRouteActive] = useState(false);
  
  // State for creating lead from prospect
  const [prospectToCreate, setProspectToCreate] = useState<MapLead | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [initialNotes, setInitialNotes] = useState('');

  // State for AI territory analysis
  const [analyzingTerritory, setAnalyzingTerritory] = useState(false);
  const [drawnTerritory, setDrawnTerritory] = useState<{ center: google.maps.LatLng | null; radius: number } | null>(null);

  const [filters, setFilters] = useState({
    franchisee: [] as string[],
    status: [] as string[],
    state: [] as string[],
    type: 'all' as 'all' | 'leads' | 'companies'
  });

  const router = useRouter()
  const { toast } = useToast()
  const { userProfile, loading: authLoading, savedRoutes } = useAuth();

  useEffect(() => {
    setLocalSavedRoutes(savedRoutes);
  }, [savedRoutes]);
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places', 'drawing', 'geometry']
  })
  
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

  // Automatically show location for Lead Gen users
  useEffect(() => {
    if (isLoaded && map && userProfile?.role === 'Field Sales' && !myLocation) {
      handleShowMyLocation();
    }
  }, [isLoaded, map, userProfile, myLocation, handleShowMyLocation]);

const handleCreateRoute = useCallback((selectedTravelMode: google.maps.TravelMode, leadsForRoute: MapLead[]) => {
    if (!map) return;
    if (leadsForRoute.length < 1) {
        toast({ variant: "destructive", title: "Not enough stops", description: "Please select at least 1 lead to create a route." });
        return;
    }
    if (leadsForRoute.length > 25) {
        toast({ variant: "destructive", title: "Too many stops", description: `The maximum number of stops for a route is 25. You have selected ${leadsForRoute.length}.` });
        return;
    }

    if (!myLocation) {
        toast({ variant: 'destructive', title: 'Location unknown', description: 'Click "My Location" first to find your position before creating a route.' });
        handleShowMyLocation();
        return;
    }

    setTravelMode(selectedTravelMode);
    setIsCalculatingRoute(true);
    setDirections(null);
    const directionsService = new window.google.maps.DirectionsService();

    const origin = myLocation;
    const destination = myLocation;
    const waypoints = leadsForRoute.map(lead => ({
        location: { lat: lead.latitude!, lng: lead.longitude! },
        stopover: true,
    }));

    // Waypoint optimization reorders the waypoints to create the most efficient route.
    directionsService.route(
        {
            origin,
            destination,
            waypoints,
            optimizeWaypoints: true,
            travelMode: selectedTravelMode,
        },
        (result, status) => {
            setIsCalculatingRoute(false);
            if (status === window.google.maps.DirectionsStatus.OK) {
                setDirections(result);
                // Also set the selected leads for the route stops UI
                setSelectedRouteLeads(leadsForRoute);
            } else {
                console.error(`error fetching directions ${result}`);
                toast({ variant: "destructive", title: "Route Error", description: `Failed to calculate directions: ${status}` });
            }
        }
    );
}, [map, toast, myLocation, handleShowMyLocation]);

  useEffect(() => {
    if (isLoaded && window.google) {
      setTravelMode(null);
    }
  }, [isLoaded]);
  
    useEffect(() => {
        const fetchData = async () => {
            if (!isLoaded || !userProfile) return;

            setLoadingData(true);
            try {
                const [mapLeads, mapCompanies] = await Promise.all([
                    getLeadsFromFirebase({ summary: true }),
                    getCompaniesFromFirebase(),
                ]);
                
                let allMapData: MapLead[] = [];

                if (mapLeads) {
                    const leadsWithCoords = mapLeads
                        .filter(lead => lead.latitude != null && lead.longitude != null)
                        .map(lead => ({
                            ...lead,
                            latitude: Number(lead.latitude),
                            longitude: Number(lead.longitude),
                            isCompany: false,
                            isProspect: false
                        }));
                    allMapData = [...allMapData, ...leadsWithCoords];
                }

                if (mapCompanies) {
                    const companiesWithCoords = mapCompanies
                        .filter(company => company.latitude != null && company.longitude != null)
                        .map(company => ({
                            ...company,
                            latitude: Number(company.latitude),
                            longitude: Number(company.longitude),
                            isCompany: true,
                            isProspect: false,
                        }));
                    allMapData = [...allMapData, ...companiesWithCoords];
                }
                
                setMapData(allMapData);

            } catch (error) {
                console.error("Failed to fetch map data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load map data.' });
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [isLoaded, userProfile, toast]);

  
  const filteredData = useMemo(() => {
    let dataToFilter = mapData;

    // For Field Sales users, filter to only their assigned leads (and all companies).
    if (userProfile?.role === 'Field Sales') {
      dataToFilter = mapData.filter(item => {
        // Always include companies (signed customers)
        if (item.isCompany) {
          return true;
        }
        // Only include leads assigned to them
        return item.dialerAssigned === userProfile.displayName;
      });
    }

    return dataToFilter.filter(item => {
      const franchiseeMatch = filters.franchisee.length === 0 || (item.franchisee && filters.franchisee.includes(item.franchisee));
      
      const statusMatch = filters.status.length === 0 || filters.status.includes(item.status);
      
      const stateMatch = filters.state.length === 0 || (item.address?.state && filters.state.includes(item.address.state));
      
      const typeMatch = filters.type === 'all' || (filters.type === 'leads' && !item.isCompany) || (filters.type === 'companies' && item.isCompany);

      return franchiseeMatch && statusMatch && stateMatch && typeMatch;
    });
  }, [mapData, filters, userProfile]);


  const onMarkerClick = useCallback((item: MapLead) => {
    setSelectedLead(item);
  }, []);

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
    if (selectedLead) {
        setSelectedLead(null);
    }
  }, [selectedLead]);

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

 const findProspects = useCallback(async (location: google.maps.LatLngLiteral, keyword: string) => {
    if (!map) return;
    setProspects([]); 

    setIsSearchingNearby(true);
    toast({ title: 'AI Analysis', description: 'Searching for similar prospects nearby...' });

    const placesService = new window.google.maps.places.PlacesService(map);
    const request: google.maps.places.PlaceSearchRequest = {
      location,
      radius: 2000,
      keyword,
    };

    placesService.nearbySearch(request, async (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const openProspects = results.filter(place => place.business_status === 'OPERATIONAL');

        const detailedProspectsPromises = openProspects.map(async (place) => {
          if (!place.place_id) return null;
          
          const detailedPlace = await getPlaceDetails(place.place_id);
          if (!detailedPlace) return null;
          
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
    });
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
  
    if (searchKeywords.length === 0 && selectedLead.discoveryData?.searchKeywords?.length) {
      searchKeywords = selectedLead.discoveryData.searchKeywords;
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
  
  const handleFindNearbyCompanies = useCallback(() => {
    if (!selectedLead || !selectedLead.latitude || !selectedLead.longitude || !window.google?.maps?.geometry) return;

    const leadLatLng = new window.google.maps.LatLng(selectedLead.latitude, selectedLead.longitude);
    
    const nearby = mapData.filter(item => {
      if (!item.isCompany || !item.latitude || !item.longitude || item.id === selectedLead.id) {
        return false;
      }
      const itemLatLng = new window.google.maps.LatLng(item.latitude, item.longitude);
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(leadLatLng, itemLatLng);
      return distance <= 500; // 500m radius
    });

    setNearbyCompanies(nearby);
    setIsNearbyCompaniesDialogOpen(true);
    if(nearby.length === 0) {
        toast({ title: 'No Nearby Customers', description: 'No signed customers found within a 500m radius.' });
    }
  }, [selectedLead, mapData, toast]);


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
  
    const handleCreateLeadFromProspect = async (prospect: google.maps.places.PlaceResult) => {
        if (!prospect.name || !prospect.vicinity || !prospect.geometry?.location) {
            toast({ variant: 'destructive', title: 'Error', description: 'Prospect is missing required information (name, address, location).' });
            return;
        }

        const placeId = prospect.place_id;
        if (!placeId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Prospect is missing a Place ID.' });
            return;
        }

        const duplicateId = await checkForDuplicateLead(prospect.name, prospect.formatted_phone_number || '');
        if (duplicateId) {
            setDuplicateLeadId(duplicateId);
            return;
        }

        setProspects(prev => prev.map(p => p.place.place_id === placeId ? { ...p, isAdding: true } : p));
        
        let primaryContact: Omit<Contact, 'id'> | null = null;

        if (prospect.website) {
            try {
                const hunterResult = await aiProspectWebsiteTool({
                    leadId: 'new-lead-prospecting',
                    websiteUrl: prospect.website,
                });

                if (hunterResult.contacts && hunterResult.contacts.length > 0) {
                    const firstContact = hunterResult.contacts[0];
                    primaryContact = {
                        name: firstContact.name || 'Info',
                        title: firstContact.title || 'Primary Contact',
                        email: firstContact.email || '',
                        phone: firstContact.phone || prospect.formatted_phone_number || '',
                    };
                    toast({ title: 'Contact Found!', description: `Automatically found contact: ${primaryContact.name}.` });
                }
            } catch (error) {
                console.warn('Hunter.io prospecting failed, using default contact info.', error);
            }
        }
        
        if (!primaryContact) {
            const websiteDomain = (prospect.website || '').replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
            primaryContact = {
                name: `Info ${prospect.name}`,
                title: 'Primary Contact',
                email: websiteDomain ? `info@${websiteDomain}` : '',
                phone: prospect.formatted_phone_number || '',
            };
        }
        const nameParts = primaryContact.name.split(' ');
        
        const addressData = parseAddressComponents(prospect.address_components || []);
        addressData.lat = prospect.geometry.location.lat();
        addressData.lng = prospect.geometry.location.lng();


        const newLeadData = {
            companyName: prospect.name,
            websiteUrl: prospect.website || '',
            industryCategory: selectedLead?.industryCategory || '',
            address: addressData,
            contact: {
                firstName: nameParts[0] || 'Info',
                lastName: nameParts.slice(1).join(' ') || prospect.name,
                title: primaryContact.title,
                email: primaryContact.email,
                phone: primaryContact.phone,
            }
        };

        try {
            const result = await createNewLead(newLeadData);
            if (result.success && result.leadId) {
                toast({ title: 'Lead Created', description: `${newLeadData.companyName} has been created successfully.` });
                // No need to fetch all data again, just add the new lead to mapData
                const newMapLead: MapLead = {
                  id: result.leadId!,
                  companyName: newLeadData.companyName,
                  status: 'New' as LeadStatus,
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
        }
    };
    
    const handleGeoSearch = () => {
        if (!geoSearchQuery || !map) return;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: geoSearchQuery, componentRestrictions: { country: 'AU' } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                map.fitBounds(results[0].geometry.viewport);
            } else {
                toast({ variant: 'destructive', title: 'Location not found', description: `Could not find a location for "${geoSearchQuery}".` });
            }
        });
    };

    const handleClearRoute = () => {
        setDirections(null);
        setSelectedRouteLeads([]);
        setRouteName('');
        setTravelMode(null);
        setIsRouteActive(false);
        setLoadedRoute(null);
        setRouteDate(undefined);
    };

    const handleCheckIn = (lead: MapLead) => {
        if (!lead.id) {
            toast({variant: 'destructive', title: 'Error', description: 'Cannot check in to a prospect without an ID.'});
            return;
        }

        logActivity(lead.id, { 
            type: 'Update', 
            notes: 'Checked in at location via map.', 
            author: userProfile?.displayName 
        });

        router.push(`/check-in/${lead.id}`);

        if (loadedRoute && userProfile?.uid) {
             const updatedLeads = selectedRouteLeads.filter(l => l.id !== lead.id);
             if (updatedLeads.length === 0) {
                 deleteUserRoute(userProfile.uid, loadedRoute.id!);
                 setLocalSavedRoutes(prev => prev.filter(r => r.id !== loadedRoute.id));
                 handleClearRoute();
                 toast({ title: 'Route Complete!', description: `You have completed all stops for "${loadedRoute.name}". The route has been removed.` });
             } else {
                 setSelectedRouteLeads(updatedLeads);
                 const updatedRouteData: Partial<StorableRoute> = { 
                     leads: updatedLeads.map(l => ({ id: l.id, latitude: l.latitude!, longitude: l.longitude!, companyName: l.companyName, address: l.address! }))
                 };
                 updateUserRoute(userProfile.uid, loadedRoute.id!, updatedRouteData);
                 setLocalSavedRoutes(prev => prev.map(r => r.id === loadedRoute.id ? { ...r, leads: updatedLeads } as SavedRoute : r));
                 setLoadedRoute(prev => prev ? { ...prev, leads: updatedLeads } as SavedRoute : null);
                 toast({ title: 'Stop Completed', description: `${lead.companyName} has been removed from your active route.` });
             }
         } else if (selectedRouteLeads.some(routeLead => routeLead.id === lead.id)) {
             setSelectedRouteLeads(prev => prev.filter(l => l.id !== lead.id));
             toast({ title: 'Stop Completed', description: `${lead.companyName} has been removed from your active route.` });
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


    const onCircleComplete = useCallback((circle: google.maps.Circle) => {
        if (!window.google || !map) return;
        
        const center = circle.getCenter();
        const radius = circle.getRadius();
        
        if (!center || !radius) return;

        const leadsInCircle = filteredData.filter(lead => {
            if (lead.isCompany) {
                return false; // Exclude companies from selection
            }
            if (lead.latitude && lead.longitude) {
                const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
                const distance = window.google.maps.geometry.spherical.computeDistanceBetween(center, leadLatLng);
                return distance <= radius;
            }
            return false;
        });

        setSelectedRouteLeads(leadsInCircle);
        setDrawnTerritory({ center, radius });

        toast({
          title: `${leadsInCircle.length} Stops Selected`,
          description: "You can now create a route or analyze the territory.",
        });
        
        circle.setMap(null);
        setIsDrawing(false);
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(null);
        }
    }, [map, filteredData, toast]);

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
            status: 'New' as LeadStatus,
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
                // If there's an existing manually entered part, keep it
                const manualPart = prevName.split(' - ').slice(1).join(' - ').trim();
                return manualPart ? `${dateString} - ${manualPart}` : `${dateString} -`;
            });
        }
    }, [routeDate]);

    const handleSaveRoute = async () => {
        if (!userProfile?.uid) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Could not identify user to save route.' });
            return;
        }

        const newRoute: SavedRoute = {
            name: routeName,
            createdAt: new Date().toISOString(),
            leads: selectedRouteLeads,
            directions,
            travelMode,
            scheduledDate: routeDate,
        };

        const savedRouteId = await saveUserRoute(userProfile.uid, newRoute);
        setLocalSavedRoutes(prev => [...prev, {...newRoute, id: savedRouteId}]);
        setRouteName('');
        setRouteDate(undefined);
        toast({ title: 'Route Saved', description: `Route "${routeName}" has been saved to your profile.` });
    };

    const handleLoadRoute = (route: SavedRoute) => {
        if (!isLoaded) return;
        setSelectedRouteLeads(route.leads);
        
        if (route.directions) {
            setDirections(route.directions as google.maps.DirectionsResult);
        } else {
            setDirections(null);
        }
        setTravelMode(route.travelMode);
        setLoadedRoute(route);
        toast({ title: 'Route Loaded', description: `Route "${route.name}" is now active.` });
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
    
        const firstLeg = directions.routes[0].legs[0];
        const lastLeg = directions.routes[0].legs[directions.routes[0].legs.length - 1];
    
        if (!firstLeg || !lastLeg) {
            toast({ variant: 'destructive', title: 'Cannot Start Route', description: 'Invalid route data.' });
            return;
        }
    
        const origin = 'Current+Location';
        const destination = lastLeg.end_address;
        const waypoints = directions.routes[0].legs
            .slice(0, -1) // All legs except the last one
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

    const startDrawing = () => {
        setIsDrawing(true);
        toast({
            title: "Drawing Mode Activated",
            description: "Draw a circle on the map to select leads. Press Esc or click Cancel to exit.",
        });
    };

    const cancelDrawing = () => {
        setIsDrawing(false);
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(null);
        }
        toast({
            title: "Drawing Mode Canceled",
        });
    };

    const { waypointOrderMap, sortedRouteLegs } = useMemo(() => {
        const waypointOrderMap = new Map<string, number>();
        if (directions) {
        directions.routes[0].waypoint_order.forEach((originalIndex, optimizedIndex) => {
            const lead = selectedRouteLeads[originalIndex];
            if (lead) {
            waypointOrderMap.set(lead.id, optimizedIndex + 1);
            }
        });
        }

        const sortedRouteLegs =
        directions?.routes[0]?.legs
            .map((leg, index) => {
            if (index === 0) return { leg, lead: null, stopNumber: 0 }; // Origin
            const orderIndex = directions.routes[0].waypoint_order[index - 1];
            const lead = selectedRouteLeads[orderIndex];
            return { leg, lead, stopNumber: index };
            })
            .filter((item) => item.leg && item.lead) ?? [];
        
        return { waypointOrderMap, sortedRouteLegs };
    }, [directions, selectedRouteLeads]);


    if (loadError) {
        return <div>Error loading maps. Please check your API key and network connection.</div>
    }
    
    if (!isLoaded || loadingData || authLoading) {
        return (
            <div className="flex h-full items-center justify-center">
            <Loader />
            </div>
        )
    }
  
    const formatAddress = (address?: { street?: string; city?: string; state?: string, franchisee?: string } | string) => {
        if (!address) return 'Address not available';
        if (typeof address === 'string') return address;
        return [
            address.street,
            address.city,
            address.state,
        ].filter(Boolean).join(', ');
    }
  
    const infoWindowOptions = {
        pixelOffset: new window.google.maps.Size(0, -30),
    };

    return (
    <div className="flex flex-col h-full gap-4">
      <AlertDialog open={!!duplicateLeadId} onOpenChange={() => setDuplicateLeadId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Duplicate Lead Found</AlertDialogTitle>
                <AlertDialogDescription>
                    A lead with this name or address already exists in the system.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDuplicateLeadId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => window.open(`/leads/${duplicateLeadId}`, '_blank')}>
                    View Existing Lead
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={!!prospectToCreate} onOpenChange={(open) => !open && setProspectToCreate(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
                <DialogDescription>Create a new lead for {prospectToCreate?.companyName}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <p>Company: <span className="font-semibold">{prospectToCreate?.companyName}</span></p>
                <p>Address: <span className="font-semibold">{formatAddress(prospectToCreate?.address)}</span></p>
                <Label htmlFor="initial-notes">Initial Notes</Label>
                <Textarea 
                    id="initial-notes"
                    value={initialNotes}
                    onChange={(e) => setInitialNotes(e.target.value)}
                    placeholder="Add any initial notes or comments here..."
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setProspectToCreate(null)}>Cancel</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={viewingDescription !== null} onOpenChange={(open) => !open && setViewingDescription(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>AI Prospect Description</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
                <div className="py-4 text-sm text-muted-foreground pr-6">
                    {viewingDescription}
                </div>
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={() => setViewingDescription(null)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isNearbyCompaniesDialogOpen} onOpenChange={setIsNearbyCompaniesDialogOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Nearby Signed Customers</DialogTitle>
                <DialogDescription>
                    Found {nearbyCompanies.length} signed customer(s) within a 500m radius of {selectedLead?.companyName}.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
                {nearbyCompanies.length > 0 ? (
                    <div className="space-y-2 p-1">
                        {nearbyCompanies.map(company => (
                             <Card key={company.id} className="p-3">
                                <div className="flex flex-col space-y-1">
                                    <Button variant="link" className="p-0 h-auto font-semibold justify-start" onClick={() => window.open(`/companies/${company.id}`, '_blank')}>{company.companyName}</Button>
                                    <p className="text-sm text-muted-foreground">{formatAddress(company.address)}</p>
                                    <p className="text-sm text-muted-foreground"><span className="font-semibold">Franchisee:</span> {company.franchisee || 'N/A'}</p>
                                    {company.industryCategory && <p className="text-sm text-muted-foreground"><span className="font-semibold">Industry:</span> {company.industryCategory}</p>}
                                    {company.websiteUrl && (
                                        <a href={company.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 pt-1">
                                            <Globe className="h-4 w-4" />
                                            <span>Visit Website</span>
                                        </a>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-8">No nearby customers found.</p>
                )}
            </ScrollArea>
            <DialogFooter>
                <Button onClick={() => setIsNearbyCompaniesDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
        <div className="flex-shrink-0">
            <Collapsible>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MapIcon className="h-5 w-5" />
                            <CardTitle>Map Controls</CardTitle>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <SlidersHorizontal className="h-4 w-4" />
                                <span className="ml-2">Toggle Controls</span>
                            </Button>
                        </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                        <Tabs defaultValue="filters">
                            <CardContent>
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="filters">Filters</TabsTrigger>
                                    <TabsTrigger value="actions">Actions</TabsTrigger>
                                    <TabsTrigger value="routes">Routes</TabsTrigger>
                                </TabsList>
                            </CardContent>
                            <TabsContent value="filters">
                                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                    <Label htmlFor="type-mobile">Show</Label>
                                    <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                        <SelectItem value="all">All Locations</SelectItem>
                                        <SelectItem value="leads">Leads Only</SelectItem>
                                        <SelectItem value="companies">Signed Customers Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="franchisee-mobile">Franchisee</Label>
                                        <MultiSelectCombobox
                                            options={uniqueFranchisees}
                                            selected={filters.franchisee}
                                            onSelectedChange={(selected) => handleFilterChange('franchisee', selected)}
                                            placeholder="Select Franchisees..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="status-mobile">Status</Label>
                                        <MultiSelectCombobox
                                            options={uniqueStatuses}
                                            selected={filters.status}
                                            onSelectedChange={(selected) => handleFilterChange('status', selected)}
                                            placeholder="Select Statuses..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state-mobile">State</Label>
                                        <MultiSelectCombobox
                                            options={uniqueStates}
                                            selected={filters.state}
                                            onSelectedChange={(selected) => handleFilterChange('state', selected)}
                                            placeholder="Select States..."
                                        />
                                    </div>
                                </CardContent>
                            </TabsContent>
                            <TabsContent value="actions">
                                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="geo-search-mobile">Go to Location</Label>
                                        <div className="flex items-center gap-2">
                                            <Input id="geo-search-mobile" placeholder="Suburb, state, postcode..." value={geoSearchQuery} onChange={(e) => setGeoSearchQuery(e.target.value)} />
                                            <Button onClick={handleGeoSearch}><Search className="h-4 w-4"/></Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>My Location</Label>
                                        <Button onClick={handleShowMyLocation} variant="outline" className="w-full"><Locate className="mr-2 h-4 w-4" /> Show My Location</Button>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="prospect-search-mobile">Find Prospects Near Me</Label>
                                        <div className="flex items-center gap-2">
                                            <Input id="prospect-search-mobile" placeholder="e.g. cafe, warehouse" value={prospectSearchQuery} onChange={(e) => setProspectSearchQuery(e.target.value)} />
                                            <Button onClick={handleFindProspectsNearMe} disabled={isSearchingNearby}>
                                                {isSearchingNearby ? <Loader/> : <Search className="h-4 w-4"/>}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Draw to Route</Label>
                                        <div className="flex gap-2">
                                            <Button onClick={startDrawing} variant="outline" className="w-full" disabled={isDrawing}>
                                                <PenSquare className="mr-2 h-4 w-4" /> Select Area
                                            </Button>
                                            {isDrawing && (
                                                <Button onClick={cancelDrawing} variant="destructive">
                                                    <X className="mr-2 h-4 w-4" /> Cancel
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </TabsContent>
                            <TabsContent value="routes">
                                <CardContent>
                                    {localSavedRoutes.length > 0 ? (
                                        <ScrollArea className="h-48">
                                            <div className="space-y-2">
                                                {localSavedRoutes.map(route => (
                                                    <Card key={route.id} className="p-3">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-semibold">{route.name}</p>
                                                                <p className="text-xs text-muted-foreground">{route.leads.length} stops &bull; Created on {new Date(route.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Button size="sm" variant="outline" onClick={() => handleLoadRoute(route)}>Load</Button>
                                                                <Button size="sm" variant="destructive" onClick={() => handleDeleteRoute(route.id!, route.name)}><Trash2 className="h-4 w-4" /></Button>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    ) : (
                                        <div className="text-center text-muted-foreground py-10">No saved routes yet.</div>
                                    )}
                                </CardContent>
                            </TabsContent>
                        </Tabs>
                    </CollapsibleContent>
                </Card>
            </Collapsible>
        </div>

        {selectedRouteLeads.length > 0 && (
             <div className="flex-shrink-0 bg-card/95 border rounded-lg">
                <div className="flex flex-col h-full">
                    <CardHeader className="pb-2 flex-shrink-0">
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Route className="h-5 w-5"/> Selected Stops ({selectedRouteLeads.length})
                            {isRouteActive && <Badge variant="destructive">Active</Badge>}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => { handleClearRoute(); setDrawnTerritory(null); }}><X className="h-4 w-4"/></Button>
                    </CardTitle>
                        {directions && (
                            <div className="space-y-2 pt-2">
                                <div className="flex flex-col gap-2">
                                    <CardDescription>
                                        Total Distance: {directions.routes[0].legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0) / 1000} km
                                        <br />
                                        Total Duration: {Math.round(directions.routes[0].legs.reduce((total, leg) => total + (leg.duration?.value || 0), 0) / 60)} mins
                                    </CardDescription>
                                    {isRouteActive ? (
                                        <Button onClick={handleStopRoute} className="w-full" variant="destructive">
                                            <X className="mr-2 h-4 w-4" />
                                            Stop Route
                                        </Button>
                                    ) : (
                                        <Button onClick={handleStartRoute} className="w-full bg-green-600 hover:bg-green-700">
                                            Start Route
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="route-name">Route Name</Label>
                                    <div className="flex gap-2">
                                    <Input 
                                        id="route-name" 
                                        placeholder="e.g. Tuesday Afternoon Run" 
                                        value={routeName}
                                        onChange={(e) => setRouteName(e.target.value)}
                                    />
                                    <Button onClick={handleSaveRoute} disabled={!routeName && !routeDate}>
                                        <Save className="mr-2 h-4 w-4" /> Save
                                    </Button>
                                    </div>
                                    <div className="space-y-1">
                                    <Label htmlFor="route-date">Schedule Date (Optional)</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="route-date"
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !routeDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {routeDate ? format(routeDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-[11]">
                                            <Calendar
                                                mode="single"
                                                selected={routeDate}
                                                onSelect={setRouteDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardHeader>
                    <ScrollArea className="flex-grow min-h-0 px-6 max-h-64">
                        <div className="space-y-2 pt-2">
                            {(directions ? sortedRouteLegs : selectedRouteLeads.map(l => ({lead: l}))).map((item, index) => {
                            if (!item.lead) return null;
                            const lead = item.lead;
                            const leg = (item as any).leg;
                            return (
                                <Card key={lead.id} className="p-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                    <p className="font-bold">{item.stopNumber ? `${item.stopNumber}. ` : ''}{lead.companyName}</p>
                                    <p className="text-xs text-muted-foreground">{formatAddress(lead.address)}</p>
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
                                        {lead.isProspect ? <PlusCircle className="mr-2 h-4 w-4"/> : <CheckSquare className="mr-2 h-4 w-4"/>}
                                        {lead.isProspect ? 'Add New Lead' : 'Check In'}
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleRemoveFromRoute(lead.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    </div>
                                </div>
                                </Card>
                            )
                            })}
                        </div>
                    </ScrollArea>
                    <CardFooter className="flex flex-col gap-2 flex-shrink-0 pt-4 px-6 pb-6">
                        {drawnTerritory && (
                            <Button onClick={handleAnalyzeTerritory} disabled={analyzingTerritory} className="w-full">
                                {analyzingTerritory ? <Loader /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Analyze Territory for Opportunities
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button disabled={isCalculatingRoute || selectedRouteLeads.length === 0} className="w-full">
                                    {isCalculatingRoute ? <Loader /> : <Route className="mr-2 h-4 w-4" />}
                                    {directions ? 'Re-calculate Route' : 'Create Route'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleCreateRoute(google.maps.TravelMode.DRIVING, selectedRouteLeads)}>
                                    <Car className="mr-2 h-4 w-4" />
                                    Driving
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreateRoute(google.maps.TravelMode.WALKING, selectedRouteLeads)}>
                                    <Footprints className="mr-2 h-4 w-4" />
                                    Walking
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreateRoute(google.maps.TravelMode.BICYCLING, selectedRouteLeads)}>
                                    <Bike className="mr-2 h-4 w-4" />
                                    Bicycling
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="secondary" onClick={() => { handleClearRoute(); setDrawnTerritory(null); }} className="w-full">
                            Clear Selection
                        </Button>
                    </CardFooter>
                </div>
                </div>
            )}
        
        <div className="flex-grow min-h-[50vh] relative rounded-lg overflow-hidden">
            <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={4}
            onLoad={mapInstance => {
                setMap(mapInstance);
            }}
            onClick={onMapClick}
            options={{
                streetViewControl: false,
                mapTypeControl: false,
            }}
            >
            {isDrawing && window.google && (
                <DrawingManagerF
                onLoad={(dm) => (drawingManagerRef.current = dm)}
                onCircleComplete={onCircleComplete}
                drawingMode={window.google.maps.drawing.OverlayType.CIRCLE}
                options={{
                    drawingControl: false,
                    circleOptions: {
                    fillColor: '#8884d8',
                    fillOpacity: 0.2,
                    strokeColor: '#8884d8',
                    strokeWeight: 2,
                    clickable: false,
                    editable: false,
                    zIndex: 1,
                    },
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
                    icon={{ 
                    url: getPinColor(item.status, selectedRouteLeads.some(l => l.id === item.id)),
                    scaledSize: new window.google.maps.Size(32, 32)
                    }}
                    visible={directions === null} // Hide original markers when route is active
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
                        suppressMarkers: true, // We use our custom markers
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

                    <div className="space-y-2 text-sm text-muted-foreground">
                        {selectedLead.industryCategory && (
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 shrink-0" />
                                <span>{selectedLead.industryCategory}</span>
                            </div>
                        )}
                        <div className="flex items-start gap-2">
                            <Building className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{formatAddress(selectedLead.address)}</span>
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
                        <Button size="sm" onClick={() => window.open(selectedLead.isCompany ? `/companies/${selectedLead.id}` : `/leads/${selectedLead.id}`, '_blank')}>
                            <Briefcase className="mr-2 h-4 w-4" />
                            View Profile
                        </Button>
                    {!selectedLead.isCompany && (
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" className="flex-1 whitespace-normal h-auto" onClick={handleFindNearbyCompanies} disabled={isFindingNearby}>
                                    <Building className="mr-2 h-4 w-4" />
                                    Nearby Customers
                                </Button>
                                <Button size="sm" variant="secondary" className="flex-1 whitespace-normal h-auto" onClick={handleFindNearby} disabled={isSearchingNearby}>
                                    {isSearchingNearby ? <Loader /> : <><Sparkles className="mr-2 h-4 w-4" /><span>AI Find Nearby</span></>}
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
            </GoogleMap>
        </div>
      <Dialog open={isProspectsDialogOpen} onOpenChange={setIsProspectsDialogOpen}>
            <DialogContent className="max-w-4xl w-[95vw] md:w-full">
                <DialogHeader>
                    <DialogTitle>Nearby Prospects</DialogTitle>
                    <DialogDescription>
                        Found {prospects.length} potential leads near {selectedLead?.companyName || 'your location'}.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    {/* Mobile View: List of Cards */}
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
                                        <Button size="sm" onClick={() => handleCreateLeadFromProspect(prospectInfo.place)} disabled={prospectInfo.isAdding}>
                                            {prospectInfo.isAdding ? <Loader /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                            Add
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Desktop View: Table */}
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
                                            <div className="flex gap-2 items-center">
                                                {prospectInfo.place.website && (
                                                    <a href={prospectInfo.place.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                                        <Globe className="h-3 w-3" />
                                                        <span>Website</span>
                                                    </a>
                                                )}
                                                {prospectInfo.place.formatted_phone_number && (
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        <span>{prospectInfo.place.formatted_phone_number}</span>
                                                    </div>
                                                )}
                                            </div>
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
                                                <Button size="sm" onClick={() => handleCreateLeadFromProspect(prospectInfo.place)} disabled={prospectInfo.isAdding}>
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
                </div>
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
    </div>
    );
}
