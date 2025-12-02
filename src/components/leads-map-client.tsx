

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindow,
  KmlLayer,
} from '@react-google-maps/api'
import { createNewLead, getLeadsFromFirebase } from '@/services/firebase'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import type { Lead, LeadStatus, Address } from '@/lib/types'
import { Loader } from './ui/loader'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
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
import { industryCategories } from '@/lib/constants'
import { Badge } from './ui/badge'
import { useRouter } from 'next/navigation'
import { Building, Search, Briefcase, PlusCircle, Eye, Phone, Globe, Link as LinkIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
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

const getPinColor = (status: LeadStatus): string => {
    const greenStatuses: LeadStatus[] = ['Qualified', 'Won', 'Pre Qualified', 'Trialing ShipMate'];
    const yellowStatuses: LeadStatus[] = ['Contacted', 'In Progress', 'Connected', 'High Touch', 'Reschedule'];
    const redStatuses: LeadStatus[] = ['Lost', 'Unqualified', 'Priority Lead'];
    const blueStatuses: Lead[] = ['New'];
    const purpleStatuses: LeadStatus[] = ['LPO Review'];

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
  const [clickedKmlFeature, setClickedKmlFeature] = useState<ClickedKmlFeature | null>(null);
  const [prospects, setProspects] = useState<ProspectWithLeadInfo[]>([]);
  const [isProspectsDialogOpen, setIsProspectsDialogOpen] = useState(false);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const router = useRouter();
  const { toast } = useToast();


  const [filters, setFilters] = useState({
    franchisee: 'all',
    status: 'all',
    state: 'all',
  });

  const { isLoaded } = useJsApiLoader({
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
    setSelectedLead(lead)
  }, [])

  const onInfoWindowClose = useCallback(() => {
    setSelectedLead(null)
    setClickedKmlFeature(null)
  }, [])

  const onKmlLayerClick = useCallback((e: google.maps.KmlMouseEvent) => {
    if (e.featureData) {
      const featureData = {
        name: e.featureData.name || 'Unknown Territory',
        description: e.featureData.description || ''
      };
      setClickedKmlFeature({ featureData, latLng: e.latLng! });
    }
  }, []);

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

  const handleFindNearby = async () => {
    if (!map || !selectedLead) return;

    setIsSearchingNearby(true);
    setProspects([]);
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

    const placesService = new google.maps.places.PlacesService(map);
    const request: google.maps.places.PlaceSearchRequest = {
        location: { lat: selectedLead.latitude!, lng: selectedLead.longitude! },
        radius: 2000, 
        keyword: searchKeywords.join(' '),
    };
    
    placesService.nearbySearch(request, async (results, status) => {
        setIsSearchingNearby(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const openProspects = results.filter(place => place.business_status === 'OPERATIONAL');

            const detailedProspects = await Promise.all(
                openProspects.map(async (place) => {
                    const existingLead = leads.find(l => l.companyName.toLowerCase() === place.name?.toLowerCase());
                    let detailedPlace = place;
                    // Fetch details only if needed, and place_id exists
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
    disableAutoPan: false,
    content: `
      <style>
        .gm-ui-hover-effect { display: none !important; }
        .gm-style-iw-d { overflow: hidden !important; max-width: none !important; max-height: none !important; padding: 0 !important; }
        .gm-style-iw-c { padding: 0 !important; border-radius: 8px !important; box-shadow: none !important; background-color: transparent !important; }
        .gm-style-iw-c button { display: none !important; }
        .custom-iw-container { display: flex; align-items: center; padding: 4px 8px; background-color: white; border-radius: 8px; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1); font-family: sans-serif; }
        .custom-iw-content { font-weight: 600; font-size: 14px; margin-right: 0px; white-space: nowrap; }
      </style>
    `,
  };

  return (
    <div className="flex flex-col gap-4 flex-grow">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span>Filters</span>
                    <Badge variant="secondary">{filteredLeads.length} lead(s)</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="flex-grow">
            <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={4}
            onLoad={setMap}
            options={{
                streetViewControl: false,
                mapTypeControl: false,
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
                icon={{ url: getPinColor(lead.status) }}
                />
            ))}

            {selectedLead && (
                <InfoWindow
                position={{ lat: selectedLead.latitude!, lng: selectedLead.longitude! }}
                onCloseClick={onInfoWindowClose}
                >
                <div className="space-y-2 p-2 max-w-xs">
                    <h3 className="font-bold text-lg">{selectedLead.companyName}</h3>
                    <div className="flex items-center gap-2">
                        <LeadStatusBadge status={selectedLead.status} />
                        {selectedLead.industryCategory && <span className="text-sm text-muted-foreground">{selectedLead.industryCategory}</span>}
                    </div>
                    <p className="text-sm">
                        {formatAddress(selectedLead.address)}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => window.open(`/leads/${selectedLead.id}`, '_blank')}>
                            <Briefcase className="mr-2 h-4 w-4" />
                            View Profile
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleFindNearby} disabled={isSearchingNearby || (!selectedLead.industryCategory && !selectedLead.websiteUrl)}>
                            {isSearchingNearby ? <Loader /> : <><Search className="mr-2 h-4 w-4" /> Find Nearby</>}
                        </Button>
                    </div>
                </div>
                </InfoWindow>
            )}

            {clickedKmlFeature && (
                <InfoWindow
                    position={clickedKmlFeature.latLng}
                    onCloseClick={onInfoWindowClose}
                    options={infoWindowOptions}
                >
                    <div
                        className="custom-iw-container"
                        onClick={(e) => e.stopPropagation()}
                    >
                      <div className="custom-iw-content" style={{ display: 'flex', alignItems: 'center' }}>
                          <span>{clickedKmlFeature.featureData.name}</span>
                      </div>
                    </div>
                </InfoWindow>
            )}
            </GoogleMap>
        </div>

        <Dialog open={isProspectsDialogOpen} onOpenChange={setIsProspectsDialogOpen}>
            <DialogContent className="max-w-6xl">
                <DialogHeader>
                    <DialogTitle>Nearby Prospects</DialogTitle>
                    <DialogDescription>
                        Found {prospects.length} potential leads near {selectedLead?.companyName}.
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
  )
}
