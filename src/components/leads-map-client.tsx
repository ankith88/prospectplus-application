

'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
  KmlLayer,
  DirectionsRenderer,
} from '@react-google-maps/api'
import { createNewLead, getLeadsFromFirebase, checkForDuplicateLead, logActivity } from '@/services/firebase'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import type { Lead, LeadStatus, Address } from '@/lib/types'
import { Loader } from './ui/loader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { LeadStatusBadge } from './lead-status-badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { useRouter } from 'next/navigation'
import { Building, Search, Briefcase, PlusCircle, Eye, Phone, Globe, Link as LinkIcon, Locate, MousePointerClick, CheckSquare, Map, Car, Walk, Bike, Route, X, History } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
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


const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
}

const center = {
  lat: -25.2744,
  lng: 133.7751,
}

type MapLead = Pick<Lead, 'id' | 'companyName' | 'status' | 'address' | 'franchisee' | 'industryCategory' | 'latitude' | 'longitude' | 'websiteUrl' | 'discoveryData'>;

type ProspectWithLeadInfo = {
    place: google.maps.places.PlaceResult;
    existingLead?: MapLead;
    isAdding?: boolean;
};

type KmlFeatureData = {
  name: string;
  description: string;
}

type ClickedKmlFeature = {
  featureData: KmlFeatureData;
  latLng: google.maps.LatLng;
}

const getPinColor = (status: LeadStatus, isSelected: boolean): string => {
    const greenStatuses: LeadStatus[] = ['Qualified', 'Won', 'Pre Qualified', 'Trialing ShipMate'];
    const yellowStatuses: LeadStatus[] = ['Contacted', 'In Progress', 'Connected', 'High Touch', 'Reschedule'];
    const redStatuses: LeadStatus[] = ['Lost', 'Unqualified', 'Priority Lead'];
    const blueStatuses: LeadStatus[] = ['New'];
    const purpleStatuses: LeadStatus[] = ['LPO Review'];

    if (isSelected) {
      return 'http://maps.google.com/mapfiles/ms/icons/purple-pushpin.png';
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
  const [leads, setLeads] = useState<MapLead[]>([])
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [selectedLead, setSelectedLead] = useState<MapLead | null>(null)
  const [clickedKmlFeature, setClickedKmlFeature] = useState<ClickedKmlFeature | null>(null)
  const [prospects, setProspects] = useState<ProspectWithLeadInfo[]>([])
  const [isProspectsDialogOpen, setIsProspectsDialogOpen] = useState(false)
  const [isSearchingNearby, setIsSearchingNearby] = useState(false)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [prospectSearchQuery, setProspectSearchQuery] = useState('')
  const [isQuickAddMode, setIsQuickAddMode] = useState(false)
  const [geoSearchQuery, setGeoSearchQuery] = useState('');
  const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);

  // Routing state
  const [selectedRouteLeads, setSelectedRouteLeads] = useState<MapLead[]>([]);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [travelMode, setTravelMode] = useState<google.maps.TravelMode>(google.maps.TravelMode.DRIVING);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [showRouteStops, setShowRouteStops] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const [filters, setFilters] = useState({
    franchisee: 'all',
    status: 'all',
    state: 'all',
  });

  const router = useRouter()
  const { toast } = useToast()

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places']
  })

  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true);
    const allLeads = await getLeadsFromFirebase({ summary: true });

    const leadsWithCoords = allLeads.filter(
      (lead) => lead.latitude != null && lead.longitude != null && !isNaN(parseFloat(String(lead.latitude))) && !isNaN(parseFloat(String(lead.longitude)))
    ).map(lead => ({
        ...lead,
        latitude: parseFloat(String(lead.latitude)),
        longitude: parseFloat(String(lead.longitude)),
    }));
    
    setLeads(leadsWithCoords as MapLead[]);
    setLoadingLeads(false);
  }, []);
  
  useEffect(() => {
    const savedRoute = localStorage.getItem('activeRoute');
    if (savedRoute) {
      const { leads: savedLeads, directions: savedDirections, travelMode: savedTravelMode } = JSON.parse(savedRoute);
      setSelectedRouteLeads(savedLeads);
      setDirections(savedDirections);
      setTravelMode(savedTravelMode);
      setShowRouteStops(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      fetchLeads();
    }
  }, [isLoaded, fetchLeads]);
  
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
        const franchiseeMatch = filters.franchisee === 'all' || lead.franchisee === filters.franchisee;
        const statusMatch = filters.status === 'all' ? true : lead.status === filters.status;
        const stateMatch = filters.state === 'all' || lead.address?.state === filters.state;
        return franchiseeMatch && statusMatch && stateMatch;
    });
  }, [leads, filters]);

  const onMarkerClick = useCallback((lead: MapLead) => {
    const isAlreadySelected = selectedRouteLeads.some(l => l.id === lead.id);
    if (isAlreadySelected) {
        setSelectedRouteLeads(prev => prev.filter(l => l.id !== lead.id));
    } else {
        setSelectedRouteLeads(prev => [...prev, lead]);
    }
    setSelectedLead(lead);
  }, [selectedRouteLeads]);

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
    if (!isQuickAddMode || !e.latLng) {
      if (selectedLead) setSelectedLead(null); // Deselect lead on map click
      return;
    };

    toast({ title: 'Finding address...', description: 'Geocoding the selected location.' });

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: e.latLng }, async (results, status) => {
        if (status === 'OK' && results && results[0]) {
            const place = results[0];
            const companyName = place.formatted_address.split(',')[0]
            const getAddressComponent = (type: string, useShortName = false) => {
                const component = place.address_components?.find(c => c.types.includes(type));
                return useShortName ? component?.short_name : component?.long_name || '';
            }
            
            const duplicateId = await checkForDuplicateLead(companyName, '');
            if (duplicateId) {
                setDuplicateLeadId(duplicateId);
                setIsQuickAddMode(false); // Turn off mode after check
                return;
            }

            const addressParams = new URLSearchParams({
                companyName: companyName,
                street: `${getAddressComponent('street_number')} ${getAddressComponent('route')}`.trim(),
                city: getAddressComponent('locality') || getAddressComponent('postal_town'),
                state: getAddressComponent('administrative_area_level_1', true),
                zip: getAddressComponent('postal_code'),
                lat: e.latLng!.lat().toString(),
                lng: e.latLng!.lng().toString(),
            });

            setIsQuickAddMode(false);
            router.push(`/leads/new?${addressParams.toString()}`);
        } else {
            toast({ variant: 'destructive', title: 'Geocoding Failed', description: `Could not find address for this location. Status: ${status}` });
        }
    });
  }, [isQuickAddMode, router, toast, selectedLead]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const uniqueFranchisees = useMemo(() => {
    const franchisees = new Set(leads.map(lead => lead.franchisee).filter(Boolean));
    return Array.from(franchisees as string[]);
  }, [leads]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(leads.map(lead => lead.status));
    return Array.from(statuses);
  }, [leads]);

  const uniqueStates = useMemo(() => {
    const states = new Set(leads.map(lead => lead.address?.state).filter(Boolean));
    return Array.from(states as string[]);
  }, [leads]);
  
  const getPlaceDetails = useCallback((placeId: string): Promise<google.maps.places.PlaceResult | null> => {
    if (!map) return Promise.resolve(null);
    const placesService = new google.maps.places.PlacesService(map);
    return new Promise((resolve) => {
        placesService.getDetails({
            placeId,
            fields: ['name', 'formatted_address', 'address_components', 'website', 'formatted_phone_number', 'geometry', 'place_id', 'business_status']
        }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                resolve(place);
            } else {
                resolve(null);
            }
        });
    });
  }, [map]);

  const findProspects = useCallback((location: google.maps.LatLngLiteral, keyword: string) => {
    if (!map) return;
    setIsSearchingNearby(true);
    setProspects([]);
    
    const placesService = new google.maps.places.PlacesService(map);
    const request: google.maps.places.PlaceSearchRequest = {
        location,
        radius: 2000, 
        keyword,
    };

    placesService.nearbySearch(request, async (results, status) => {
        setIsSearchingNearby(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const openProspects = results.filter(place => place.business_status === 'OPERATIONAL');

            const detailedProspects = await Promise.all(
                openProspects.map(async (place) => {
                    const existingLead = leads.find(l => l.companyName.toLowerCase() === place.name?.toLowerCase());
                    let detailedPlace = place;
                    if (place.place_id && (!place.website || !place.formatted_phone_number || !place.business_status)) {
                        const details = await getPlaceDetails(place.place_id);
                        if (details) {
                            detailedPlace = { ...place, ...details };
                        }
                    }
                    return { place: detailedPlace, existingLead };
                })
            );

            setProspects(detailedProspects);
            
            if (detailedProspects.length > 0) {
                setIsProspectsDialogOpen(true);
                toast({ title: `Found ${detailedProspects.length} prospects nearby.` });
            } else {
                toast({ title: "No new prospects found nearby." });
            }
        } else {
             toast({ variant: "destructive", title: "Search Failed", description: "No new prospects found." });
        }
    });
  }, [map, leads, getPlaceDetails, toast]);
  
  const handleFindNearby = async () => {
    if (!selectedLead || !map) return;

    setIsSearchingNearby(true);
    let searchKeywords: string[] = [];
    
    if (selectedLead.discoveryData?.searchKeywords && selectedLead.discoveryData.searchKeywords.length > 0) {
        searchKeywords = selectedLead.discoveryData.searchKeywords;
    } 
    else if (selectedLead.websiteUrl) {
        toast({ title: "Analyzing Website", description: "AI is analyzing the website to find better prospects..." });
        try {
            const prospectResult = await prospectWebsiteTool({ leadId: selectedLead.id, websiteUrl: selectedLead.websiteUrl });
            if (prospectResult.searchKeywords && prospectResult.searchKeywords.length > 0) {
                searchKeywords = prospectResult.searchKeywords;
                toast({ title: "Analysis Complete", description: "Using AI-generated keywords for search." });
            }
        } catch (e) {
            console.error('AI prospecting failed, falling back to industry.', e);
        }
    }

    if (searchKeywords.length === 0 && selectedLead.industryCategory) {
        searchKeywords = [selectedLead.industryCategory];
        toast({ title: "Using Industry Category", description: "No specific keywords found, searching by industry." });
    }

    if (searchKeywords.length === 0) {
        toast({ variant: "destructive", title: "Cannot Search", description: "No industry or keywords available for this lead." });
        setIsSearchingNearby(false);
        return;
    }
    
    findProspects({ lat: selectedLead.latitude!, lng: selectedLead.longitude! }, searchKeywords.join(' '));
  };


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

  const handleShowMyLocation = () => {
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
            },
            () => {
                setLocationError('Geolocation permission denied. Please enable it in your browser settings.');
                toast({ variant: 'destructive', title: 'Location Error', description: 'Could not get your location.' });
            }
        );
    } else {
        setLocationError('Geolocation is not supported by this browser.');
        toast({ variant: 'destructive', title: 'Location Error', description: 'Geolocation is not supported by this browser.' });
    }
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
        
        const details = prospect; // We have already fetched details

        if (!details) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch prospect details.' });
            setProspects(prev => prev.map(p => p.place.place_id === placeId ? { ...p, isAdding: false } : p));
            return;
        }

        const addressComponents = details.address_components;
        const getAddressComponent = (type: string, useShortName = false) => {
            const component = addressComponents?.find(c => c.types.includes(type));
            return useShortName ? component?.short_name : component?.long_name || '';
        }

        const newLeadData = {
            companyName: details.name || prospect.name,
            websiteUrl: details.website || '',
            industryCategory: selectedLead?.industryCategory || '',
            address: {
                street: `${getAddressComponent('street_number')} ${getAddressComponent('route')}`.trim(),
                city: getAddressComponent('locality') || getAddressComponent('postal_town'),
                state: getAddressComponent('administrative_area_level_1', true),
                zip: getAddressComponent('postal_code'),
                country: 'Australia',
                lat: details.geometry?.location?.lat(),
                lng: details.geometry?.location?.lng(),
            },
            contact: { // Default contact, can be updated later
                firstName: 'Info',
                lastName: details.name || prospect.name,
                title: 'Primary Contact',
                email: `info@${(details.website || '').replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]}`,
                phone: details.formatted_phone_number || '',
            }
        };

        try {
            const result = await createNewLead(newLeadData);
            if (result.success && result.leadId) {
                toast({ title: 'Lead Created', description: `${newLeadData.companyName} has been created successfully.` });
                await fetchLeads(); // Refresh leads on the map
                // Update the prospect in the dialog to show it's now an existing lead
                setProspects(prev => prev.map(p => p.place.place_id === placeId
                    ? {
                        ...p,
                        isAdding: false,
                        existingLead: {
                            id: result.leadId!,
                            companyName: newLeadData.companyName,
                            status: 'New' as LeadStatus,
                            address: newLeadData.address as Address,
                            industryCategory: newLeadData.industryCategory,
                            latitude: newLeadData.address.lat,
                            longitude: newLeadData.address.lng,
                        }
                    }
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

    const handleCreateRoute = useCallback(() => {
    if (!map || selectedRouteLeads.length < 2) {
      toast({ variant: "destructive", title: "Not enough stops", description: "Please select at least 2 leads to create a route." });
      return;
    }

    if (!myLocation) {
        toast({ variant: 'destructive', title: 'Location unknown', description: 'Click "My Location" first to find your position before creating a route.' });
        return;
    }

    setIsCalculatingRoute(true);
    const directionsService = new google.maps.DirectionsService();

    const origin = myLocation;
    const destination = myLocation; 
    const waypoints = selectedRouteLeads.map(lead => ({
      location: { lat: lead.latitude!, lng: lead.longitude! },
      stopover: true,
    }));

    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        optimizeWaypoints: true,
        travelMode: travelMode,
      },
      (result, status) => {
        setIsCalculatingRoute(false);
        if (status === google.maps.DirectionsStatus.OK) {
          setDirections(result);
          setShowRouteStops(true);
          const routeState = {
            leads: selectedRouteLeads,
            directions: result,
            travelMode: travelMode,
          };
          localStorage.setItem('activeRoute', JSON.stringify(routeState));
        } else {
          console.error(`error fetching directions ${result}`);
          toast({ variant: "destructive", title: "Route Error", description: `Failed to calculate directions: ${status}` });
        }
      }
    );
  }, [map, selectedRouteLeads, travelMode, toast, myLocation]);

  const handleClearRoute = () => {
    setDirections(null);
    setSelectedRouteLeads([]);
    setShowRouteStops(false);
    localStorage.removeItem('activeRoute');
  };

  const handleCheckIn = async (leadId: string) => {
    try {
        await logActivity(leadId, { type: 'Update', notes: 'Checked in via map route.' });
        router.push(`/leads/${leadId}`);
    } catch (error) {
        console.error('Failed to log check-in', error);
        toast({ variant: 'destructive', title: 'Check-in failed', description: 'Could not log activity.' });
    }
  };


  if (loadError) {
    return <div>Error loading maps. Please check your API key and network connection.</div>
  }

  if (!isLoaded || loadingLeads) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  const formatAddress = (address?: { street?: string; city?: string; state?: string } | string) => {
    if (!address) return 'Address not available';
    if (typeof address === 'string') return address;
    return [
        address.street,
        address.city,
        address.state,
    ].filter(Boolean).join(', ');
  }
  
  const infoWindowOptions = {
    pixelOffset: new google.maps.Size(0, -30),
  };

  const sortedRouteLegs = directions?.routes[0]?.legs
    .map((leg, index) => {
      const orderIndex = directions.routes[0].waypoint_order[index - 1] ?? -1;
      const lead = index === 0 ? null : selectedRouteLeads[orderIndex]; // leg 0 is from origin
      return { leg, lead };
    })
    .filter(item => item.leg && item.lead)
    ?? [];

  return (
    <>
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
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 h-full">
      <div className="flex flex-col gap-4 flex-grow">
        <TooltipProvider>
             <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span><Map className="h-5 w-5" /> Filters</span>
                            <Badge variant="secondary">{filteredLeads.length} lead(s)</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="franchisee">Franchisee</Label>
                            <Select value={filters.franchisee} onValueChange={(value) => handleFilterChange('franchisee', value)}>
                                <SelectTrigger id="franchisee">
                                    <SelectValue placeholder="Select Franchisee" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Franchisees</SelectItem>
                                    {uniqueFranchisees.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {uniqueStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Select value={filters.state} onValueChange={(value) => handleFilterChange('state', value)}>
                                <SelectTrigger id="state">
                                    <SelectValue placeholder="Select State" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All States</SelectItem>
                                    {uniqueStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Field Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                         <div className="space-y-2">
                            <Label htmlFor="geo-search">Go to Location</Label>
                            <div className="flex items-center gap-2">
                                <Input id="geo-search" placeholder="Suburb, state, postcode..." value={geoSearchQuery} onChange={(e) => setGeoSearchQuery(e.target.value)} />
                                <Button onClick={handleGeoSearch}><Search className="h-4 w-4"/></Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>My Location</Label>
                            <Button onClick={handleShowMyLocation} variant="outline" className="w-full"><Locate className="mr-2 h-4 w-4" /> Show My Location</Button>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="prospect-search">Find Prospects Near Me</Label>
                            <div className="flex items-center gap-2">
                                <Input id="prospect-search" placeholder="e.g. cafe, warehouse" value={prospectSearchQuery} onChange={(e) => setProspectSearchQuery(e.target.value)} />
                                <Button onClick={handleFindProspectsNearMe} disabled={isSearchingNearby}><Search className="h-4 w-4"/></Button>
                            </div>
                        </div>
                        <div className="space-y-2 flex flex-col justify-end">
                          <Label>Quick Add</Label>
                           <Tooltip>
                                <TooltipTrigger asChild>
                                   <span className="flex items-center space-x-2">
                                        <Switch
                                            checked={isQuickAddMode}
                                            onCheckedChange={setIsQuickAddMode}
                                            aria-label="Toggle Quick Add Mode"
                                        />
                                        <Label htmlFor="quick-add-mode" className="text-sm font-normal text-muted-foreground">
                                            Click map to add a lead
                                        </Label>
                                   </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>When enabled, click on the map to create a new lead at that location.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
        <div className="flex-grow min-h-[300px] h-[calc(100vh-32rem)] relative">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={4}
              onLoad={mapInstance => {
                  setMap(mapInstance);
                  mapRef.current = mapInstance;
              }}
              onClick={onMapClick}
              options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  clickableIcons: isQuickAddMode, // Disable clicking on default POIs unless in quick add mode
                  cursor: isQuickAddMode ? 'crosshair' : 'default',
              }}
            >
              <KmlLayer
                  url="https://www.google.com/maps/d/kml?mid=1egKvN5mXdjzwKTzEV5zsLIoEo7_2x3E&force=true"
                  options={{ preserveViewport: true, suppressInfoWindows: true }}
                  onClick={onKmlLayerClick}
              />
              {filteredLeads.map((lead) => (
                  <MarkerF
                    key={lead.id}
                    position={{ lat: lead.latitude!, lng: lead.longitude! }}
                    onClick={() => onMarkerClick(lead)}
                    icon={{ 
                      url: getPinColor(lead.status, selectedRouteLeads.some(l => l.id === lead.id)),
                      scaledSize: new google.maps.Size(32, 32)
                    }}
                  />
              ))}

              {myLocation && (
                  <MarkerF
                      position={myLocation}
                      icon={{
                          path: google.maps.SymbolPath.CIRCLE,
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
                  <div className="space-y-2 p-2 max-w-xs bg-card text-card-foreground rounded-lg shadow-lg">
                      <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{selectedLead.companyName}</h3>
                          <LeadStatusBadge status={selectedLead.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                          {selectedLead.industryCategory || 'N/A'}
                      </p>
                      <p className="text-sm">
                          {formatAddress(selectedLead.address)}
                      </p>
                      <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => window.open(`/leads/${selectedLead.id}`, '_blank')}>
                              <Briefcase className="mr-2 h-4 w-4" />
                              View Profile
                          </Button>
                          <Button size="sm" variant="secondary" onClick={handleFindNearby} disabled={isSearchingNearby}>
                              {isSearchingNearby ? <Loader /> : <><Search className="mr-2 h-4 w-4" /> Find Nearby</>}
                          </Button>
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
      </div>
      <aside className={cn(
        "transition-all duration-300 ease-in-out bg-card border-l rounded-lg flex flex-col",
        showRouteStops ? "w-full md:w-96" : "w-0 p-0 border-none"
      )}>
        {showRouteStops && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Route className="h-5 w-5"/> Route Stops</span>
                <Button variant="ghost" size="icon" onClick={handleClearRoute}><X className="h-4 w-4"/></Button>
              </CardTitle>
              {directions && (
                <CardDescription>
                  Total Distance: {directions.routes[0].legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0) / 1000} km
                  <br />
                  Total Duration: {Math.round(directions.routes[0].legs.reduce((total, leg) => total + (leg.duration?.value || 0), 0) / 60)} mins
                </CardDescription>
              )}
            </CardHeader>
            <ScrollArea className="flex-grow">
              <CardContent className="space-y-2">
                {sortedRouteLegs.map(({ leg, lead }, index) => {
                  if (!lead) return null;
                  return (
                    <Card key={lead.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{index + 1}. {lead.companyName}</p>
                          <p className="text-xs text-muted-foreground">{formatAddress(lead.address)}</p>
                        </div>
                        <LeadStatusBadge status={lead.status} />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {leg.duration?.text} &bull; {leg.distance?.text}
                        </p>
                        <Button size="sm" variant="secondary" onClick={() => handleCheckIn(lead.id)}>
                          <CheckSquare className="mr-2 h-4 w-4"/>
                          Check In
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </CardContent>
            </ScrollArea>
          </>
        )}
      </aside>

       <Dialog open={isProspectsDialogOpen} onOpenChange={setIsProspectsDialogOpen}>
          <DialogContent className="max-w-6xl">
              <DialogHeader>
                  <DialogTitle>Nearby Prospects</DialogTitle>
                  <DialogDescription>
                      Found {prospects.length} potential leads near {selectedLead?.companyName || 'your location'}.
                  </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Company Name</TableHead>
                              <TableHead>Address</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Website</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {prospects.map(prospectInfo => (
                              <TableRow key={prospectInfo.place.place_id}>
                                  <TableCell>{prospectInfo.place.name}</TableCell>
                                  <TableCell>{prospectInfo.place.vicinity}</TableCell>
                                  <TableCell>{prospectInfo.place.formatted_phone_number || 'N/A'}</TableCell>
                                  <TableCell>
                                      {prospectInfo.place.website ? (
                                          <a href={prospectInfo.place.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                              <LinkIcon className="h-3 w-3" />
                                              <span>Visit</span>
                                          </a>
                                      ) : (
                                          'N/A'
                                      )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                      {prospectInfo.existingLead ? (
                                          <Button size="sm" variant="outline" onClick={() => window.open(`/leads/${prospectInfo.existingLead!.id}`, '_blank')}>
                                              <Eye className="mr-2 h-4 w-4" />
                                              View Lead
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
          </DialogContent>
      </Dialog>
    </div>

     {selectedRouteLeads.length > 0 && (
        <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 w-auto shadow-2xl">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Route className="h-5 w-5 text-primary" />
                <p className="font-bold">{selectedRouteLeads.length} stop(s) selected</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={travelMode === 'DRIVING' ? 'default' : 'outline'} size="icon" onClick={() => setTravelMode(google.maps.TravelMode.DRIVING)}><Car className="h-4 w-4" /></Button>
              <Button variant={travelMode === 'WALKING' ? 'default' : 'outline'} size="icon" onClick={() => setTravelMode(google.maps.TravelMode.WALKING)}><Walk className="h-4 w-4" /></Button>
              <Button variant={travelMode === 'BICYCLING' ? 'default' : 'outline'} size="icon" onClick={() => setTravelMode(google.maps.TravelMode.BICYCLING)}><Bike className="h-4 w-4" /></Button>
            </div>
            <Button onClick={handleCreateRoute} disabled={isCalculatingRoute || !myLocation}>
              {isCalculatingRoute ? <Loader /> : 'Create Route'}
            </Button>
            <Button variant="destructive" onClick={handleClearRoute}>Clear</Button>
          </CardContent>
        </Card>
      )}
    </>
  )
}
