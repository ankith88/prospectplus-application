

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
import { createNewLead, getLeadsFromFirebase, checkForDuplicateLead, logActivity } from '@/services/firebase'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import type { Lead, LeadStatus, Address, UserProfile, Contact } from '@/lib/types'
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
import { Building, Search, Briefcase, PlusCircle, Eye, Phone, Globe, Link as LinkIcon, Locate, MousePointerClick, CheckSquare, Map as MapIcon, Car, Footprints, Bike, Route, X, History, PenSquare, Trash2, Save } from 'lucide-react'
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
import { AddressAutocomplete } from './address-autocomplete'
import { Textarea } from './ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
}

const center = {
  lat: -25.2744,
  lng: 133.7751,
}

type MapLead = Pick<Lead, 'id' | 'companyName' | 'status' | 'address' | 'franchisee' | 'industryCategory' | 'latitude' | 'longitude' | 'websiteUrl' | 'discoveryData' | 'dialerAssigned'> & { isProspect?: boolean };

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

type SavedRoute = {
    name: string;
    createdAt: string;
    leads: MapLead[];
    directions: google.maps.DirectionsResult;
    travelMode: google.maps.TravelMode;
};

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
    const location = components.find(c => c.types.includes('location'))
    if(location){
        address.lat = (location as any).geometry.location.lat();
        address.lng = (location as any).geometry.location.lng();
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
  const [selectedProspects, setSelectedProspects] = useState<google.maps.places.PlaceResult[]>([]);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [prospectSearchQuery, setProspectSearchQuery] = useState('')
  const [geoSearchQuery, setGeoSearchQuery] = useState('');
  const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);

  // Routing and Drawing state
  const [selectedRouteLeads, setSelectedRouteLeads] = useState<MapLead[]>([]);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [travelMode, setTravelMode] = useState<google.maps.TravelMode | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [showRouteStops, setShowRouteStops] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [routeName, setRouteName] = useState('');
  
  // State for creating lead from prospect
  const [prospectToCreate, setProspectToCreate] = useState<MapLead | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [initialNotes, setInitialNotes] = useState('');


  const [filters, setFilters] = useState({
    franchisee: 'all',
    status: 'all',
    state: 'all',
  });

  const router = useRouter()
  const { toast } = useToast()
  const { userProfile, loading: authLoading } = useAuth();


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
                setShowRouteStops(true);
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

  
  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true);
    let allLeads = await getLeadsFromFirebase({ summary: true });

    if (userProfile && userProfile.role !== 'admin' && userProfile.displayName) {
        allLeads = allLeads.filter(lead => lead.dialerAssigned === userProfile.displayName);
    }

    const leadsWithCoords = allLeads.filter(
      (lead) => lead.latitude != null && lead.longitude != null && !isNaN(parseFloat(String(lead.latitude))) && !isNaN(parseFloat(String(lead.longitude)))
    ).map(lead => ({
        ...lead,
        latitude: parseFloat(String(lead.latitude)),
        longitude: parseFloat(String(lead.longitude)),
    }));
    
    setLeads(leadsWithCoords as MapLead[]);
    setLoadingLeads(false);
  }, [userProfile]);
  
  useEffect(() => {
    if (userProfile?.uid) {
        const storedRoutes = localStorage.getItem(`savedMapRoutes_${userProfile.uid}`);
        if (storedRoutes) {
            setSavedRoutes(JSON.parse(storedRoutes));
        }
    }
  }, [userProfile]);

  useEffect(() => {
    if (isLoaded && userProfile) {
      fetchLeads();
    }
  }, [isLoaded, fetchLeads, userProfile]);
  
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
        const franchiseeMatch = filters.franchisee === 'all' || lead.franchisee === filters.franchisee;
        const statusMatch = filters.status === 'all' ? true : lead.status === filters.status;
        const stateMatch = filters.state === 'all' || lead.address?.state === filters.state;
        
        return franchiseeMatch && statusMatch && stateMatch;
    });
  }, [leads, filters]);

  const onMarkerClick = useCallback((lead: MapLead) => {
    setSelectedLead(lead);
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
    const placesService = new window.google.maps.places.PlacesService(map);
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
    
    const placesService = new window.google.maps.places.PlacesService(map);
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

        // Prospect with Hunter.io if website exists
        if (prospect.website) {
            try {
                const hunterResult = await prospectWebsiteTool({
                    leadId: 'new-lead-prospecting', // Special ID to prevent saving
                    websiteUrl: prospect.website,
                });

                if (hunterResult.contacts && hunterResult.contacts.length > 0) {
                    const firstContact = hunterResult.contacts[0];
                    const nameParts = firstContact.name?.split(' ') || [];
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
            // Fallback to default contact info
            const websiteDomain = (prospect.website || '').replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
            primaryContact = {
                name: `Info ${prospect.name}`,
                title: 'Primary Contact',
                email: websiteDomain ? `info@${websiteDomain}` : '',
                phone: prospect.formatted_phone_number || '',
            };
        }
        const nameParts = primaryContact.name.split(' ');
        
        const newLeadData = {
            companyName: prospect.name,
            websiteUrl: prospect.website || '',
            industryCategory: selectedLead?.industryCategory || '',
            address: parseAddressComponents(prospect.address_components || []),
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
                await fetchLeads(); // Refresh leads on the map
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
                            dialerAssigned: undefined,
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

    const handleClearRoute = () => {
        setDirections(null);
        setSelectedRouteLeads([]);
        setShowRouteStops(false);
        setRouteName('');
        setTravelMode(null);
    };

  const handleCheckIn = (lead: MapLead) => {
    if (lead.isProspect) {
      const url = new URL('/leads/new', window.location.origin);
      url.searchParams.set('companyName', lead.companyName);
      if (lead.websiteUrl) {
          url.searchParams.set('websiteUrl', lead.websiteUrl);
      }
      if (prospectSearchQuery) {
          url.searchParams.set('industryCategory', prospectSearchQuery);
      }
      if (lead.address) {
        url.searchParams.set('street', lead.address.street);
        url.searchParams.set('city', lead.address.city);
        url.searchParams.set('state', lead.address.state);
        url.searchParams.set('zip', lead.address.zip);
        if (lead.address.lat) url.searchParams.set('lat', lead.address.lat.toString());
        if (lead.address.lng) url.searchParams.set('lng', lead.address.lng.toString());
      }
      window.open(url.toString(), '_blank');
    } else if (lead.id) {
        window.open(`/leads/${lead.id}`, '_blank');
        logActivity(lead.id, {
            type: 'Update',
            notes: 'Checked in at location via map.'
        });
    }
  };


    const onCircleComplete = useCallback((circle: google.maps.Circle) => {
        if (!window.google || !map) return;
        
        const center = circle.getCenter();
        const radius = circle.getRadius();
        
        if (!center || !radius) return;

        const leadsInCircle = filteredLeads.filter(lead => {
            if (lead.latitude && lead.longitude) {
                const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
                const distance = window.google.maps.geometry.spherical.computeDistanceBetween(center, leadLatLng);
                return distance <= radius;
            }
            return false;
        });

        setSelectedRouteLeads(leadsInCircle);
        toast({ title: `${leadsInCircle.length} leads selected.`, description: "Choose a travel mode and create your route." });
        
        circle.setMap(null);
        setIsDrawing(false);
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(null);
        }
    }, [map, filteredLeads, toast]);

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
    if (!myLocation) {
        toast({
            variant: "destructive",
            title: "Location Needed",
            description: "Please set your location on the map first before creating a route.",
        });
        handleShowMyLocation();
        return;
    }

    const leadsForRouting: MapLead[] = selectedProspects.map((p) => {
        const address = p.address_components ? parseAddressComponents(p.address_components) : { street: p.formatted_address || '', city: '', state: '', zip: '', country: 'Australia' };
        address.lat = p.geometry?.location?.lat();
        address.lng = p.geometry?.location?.lng();

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
        };
    });
    
    setSelectedRouteLeads(leadsForRouting);
    handleCreateRoute(selectedTravelMode, leadsForRouting);
    setIsProspectsDialogOpen(false);
    setSelectedProspects([]);
  };
  
    const handleSaveRoute = () => {
        if (!routeName) {
            toast({ variant: 'destructive', title: 'Route Name Required', description: 'Please enter a name for your route.' });
            return;
        }
        if (!directions || selectedRouteLeads.length === 0 || !travelMode) {
            toast({ variant: 'destructive', title: 'Cannot Save', description: 'An active route is required to save.' });
            return;
        }

        const newRoute: SavedRoute = {
            name: routeName,
            createdAt: new Date().toISOString(),
            leads: selectedRouteLeads,
            directions,
            travelMode,
        };

        const updatedRoutes = [...savedRoutes, newRoute];
        setSavedRoutes(updatedRoutes);
        if (userProfile?.uid) {
            localStorage.setItem(`savedMapRoutes_${userProfile.uid}`, JSON.stringify(updatedRoutes));
        }
        setRouteName('');
        toast({ title: 'Route Saved', description: `Route "${routeName}" has been saved.` });
    };

    const handleLoadRoute = (route: SavedRoute) => {
        setSelectedRouteLeads(route.leads);
        setDirections(route.directions);
        setTravelMode(route.travelMode);
        setShowRouteStops(true);
        toast({ title: 'Route Loaded', description: `Route "${route.name}" is now active.` });
    };

    const handleDeleteRoute = (routeName: string) => {
        const updatedRoutes = savedRoutes.filter(route => route.name !== routeName);
        setSavedRoutes(updatedRoutes);
        if (userProfile?.uid) {
            localStorage.setItem(`savedMapRoutes_${userProfile.uid}`, JSON.stringify(updatedRoutes));
        }
        toast({ title: 'Route Deleted', description: `Route "${routeName}" has been removed.` });
    };



  if (loadError) {
    return <div>Error loading maps. Please check your API key and network connection.</div>
  }

  if (!isLoaded || loadingLeads || authLoading) {
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
    pixelOffset: new window.google.maps.Size(0, -30),
  };

  const sortedRouteLegs = directions?.routes[0]?.legs
    .map((leg, index) => {
      const orderIndex = directions.routes[0].waypoint_order[index - 1] ?? -1;
      const lead = index === 0 ? null : selectedRouteLeads[orderIndex]; // leg 0 is from origin
      return { leg, lead, stopNumber: index };
    })
    .filter(item => item.leg && item.lead)
    ?? [];

  const waypointOrderMap = new Map<string, number>();
    if (directions) {
        directions.routes[0].waypoint_order.forEach((originalIndex, optimizedIndex) => {
            const lead = selectedRouteLeads[originalIndex];
            if (lead) {
                waypointOrderMap.set(lead.id, optimizedIndex + 1);
            }
        });
    }

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
    <div className="flex flex-col gap-4 h-full">
        <div className="grid grid-cols-1 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span><MapIcon className="h-5 w-5" /> Filters</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                  <CardHeader>
                      <CardTitle>Field Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
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
                      <div className="space-y-2">
                        <Label>Draw to Route</Label>
                        <Button onClick={() => setIsDrawing(true)} variant="outline" className="w-full"><PenSquare className="mr-2 h-4 w-4" /> Select Area</Button>
                      </div>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle>Saved Routes</CardTitle>
                  </CardHeader>
                  <CardContent>
                      {savedRoutes.length > 0 ? (
                          <ScrollArea className="h-48">
                              <div className="space-y-2">
                                  {savedRoutes.map(route => (
                                      <div key={route.name} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                          <div>
                                              <p className="font-semibold">{route.name}</p>
                                              <p className="text-xs text-muted-foreground">{route.leads.length} stops &bull; Created on {new Date(route.createdAt).toLocaleDateString()}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <Button size="sm" variant="outline" onClick={() => handleLoadRoute(route)}>Load</Button>
                                              <Button size="sm" variant="destructive" onClick={() => handleDeleteRoute(route.name)}><Trash2 className="h-4 w-4" /></Button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </ScrollArea>
                      ) : (
                          <div className="text-center text-muted-foreground py-10">No saved routes yet.</div>
                      )}
                  </CardContent>
              </Card>
            </div>
        </div>
        <div className="flex-grow min-h-[300px] h-[calc(100vh-32rem)] relative">
        <div className="h-full w-full absolute top-0 left-0">
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
              {filteredLeads.map((lead) => (
                  <MarkerF
                    key={lead.id}
                    position={{ lat: lead.latitude!, lng: lead.longitude! }}
                    onClick={() => onMarkerClick(lead)}
                    icon={{ 
                      url: getPinColor(lead.status, selectedRouteLeads.some(l => l.id === lead.id)),
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
                    icon={{ 
                      url: getPinColor(lead.status, true),
                      scaledSize: new window.google.maps.Size(40, 40),
                      labelOrigin: new window.google.maps.Point(20, 15),
                    }}
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
        {!directions && selectedRouteLeads.length > 0 && (
            <Card className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-auto">
                <CardContent className="p-4 flex items-center gap-4">
                    <p className="text-sm font-semibold">{selectedRouteLeads.length} stops selected.</p>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button disabled={isCalculatingRoute}>
                                {isCalculatingRoute ? <Loader /> : <Route className="mr-2 h-4 w-4" />}
                                Create Route
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
                     <Button variant="secondary" onClick={() => setSelectedRouteLeads([])}>
                        Clear Selection
                    </Button>
                </CardContent>
            </Card>
        )}
        <aside className={cn(
        "transition-all duration-300 ease-in-out bg-card/95 border-l rounded-lg flex flex-col absolute top-0 right-0 h-full z-10 backdrop-blur-sm",
        showRouteStops ? "w-full md:w-96" : "w-0 p-0 border-none hidden"
      )}>
        {showRouteStops && (
          <>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Route className="h-5 w-5"/> Selected Stops ({selectedRouteLeads.length})</span>
                <Button variant="ghost" size="icon" onClick={handleClearRoute}><X className="h-4 w-4"/></Button>
              </CardTitle>
                <div className="space-y-2 pt-2">
                    {directions && (
                        <CardDescription>
                            Total Distance: {directions.routes[0].legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0) / 1000} km
                            <br />
                            Total Duration: {Math.round(directions.routes[0].legs.reduce((total, leg) => total + (leg.duration?.value || 0), 0) / 60)} mins
                        </CardDescription>
                    )}
                    <div className="space-y-1">
                        <Label htmlFor="route-name">Route Name</Label>
                        <div className="flex gap-2">
                        <Input 
                            id="route-name" 
                            placeholder="e.g. Tuesday Afternoon Run" 
                            value={routeName}
                            onChange={(e) => setRouteName(e.target.value)}
                        />
                        <Button onClick={handleSaveRoute} disabled={!routeName || !directions}>
                            <Save className="mr-2 h-4 w-4" /> Save
                        </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <ScrollArea className="flex-grow">
              <CardContent className="space-y-2 pt-2">
                {selectedRouteLeads.map((lead, index) => {
                  const leg = directions?.routes[0].legs[index + 1];
                  return (
                    <Card key={lead.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                           <p className="font-bold">{waypointOrderMap.get(lead.id) || index + 1}. {lead.companyName}</p>
                          <p className="text-xs text-muted-foreground">{formatAddress(lead.address)}</p>
                        </div>
                        <LeadStatusBadge status={lead.status} />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                            {directions && leg ? `${leg.duration?.text} • ${leg.distance?.text}` : 'Calculating...'}
                        </p>
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
              </CardContent>
            </ScrollArea>
             <CardFooter>
                 <Button onClick={() => travelMode && handleCreateRoute(travelMode, selectedRouteLeads)} disabled={isCalculatingRoute || selectedRouteLeads.length === 0} className="w-full">
                  {isCalculatingRoute ? <Loader /> : 'Re-calculate Route'}
                </Button>
             </CardFooter>
          </>
        )}
      </aside>
        </div>
    </div>
      
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
                              <TableHead className="w-8"><Checkbox onCheckedChange={(checked) => setSelectedProspects(checked ? prospects.map(p => p.place) : [])} /></TableHead>
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
                                  <TableCell><Checkbox checked={selectedProspects.some(p => p.place_id === prospectInfo.place.place_id)} onCheckedChange={() => handleProspectSelection(prospectInfo.place)} /></TableCell>
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
    </>
  )
}
