

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindow,
  KmlLayer,
} from '@react-google-maps/api'
import { getLeadsFromFirebase } from '@/services/firebase'
import { prospectWebsiteTool } from '@/services/firebase'
import type { Lead, LeadStatus } from '@/lib/types'
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
import { Building, Search, Briefcase, PlusCircle, Eye } from 'lucide-react'
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
    const blueStatuses: LeadStatus[] = ['New'];
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
    industry: 'all',
    state: 'all',
  });

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places']
  })

  useEffect(() => {
    const fetchLeads = async () => {
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
    }

    if (isLoaded) {
      fetchLeads();
    }
  }, [isLoaded]);
  
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
        const franchiseeMatch = filters.franchisee === 'all' || lead.franchisee === filters.franchisee;
        const statusMatch = filters.status === 'all' ? true : lead.status === filters.status;
        const industryMatch = filters.industry === 'all' || !lead.industryCategory ? true : lead.industryCategory === filters.industry;
        const stateMatch = filters.state === 'all' || lead.address?.state === filters.state;
        return franchiseeMatch && statusMatch && industryMatch && stateMatch;
    });
  }, [leads, filters]);

  const onMarkerClick = useCallback((lead: MapLead) => {
    setSelectedLead(lead)
  }, [])

  const onInfoWindowClose = useCallback(() => {
    setSelectedLead(null)
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
        const prospectResult = await prospectWebsiteTool({ leadId: selectedLead.id, websiteUrl: selectedLead.websiteUrl });
        if (prospectResult.searchKeywords && prospectResult.searchKeywords.length > 0) {
            searchKeywords = prospectResult.searchKeywords;
            toast({ title: "Analysis Complete", description: "Using AI-generated keywords for search." });
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
    
    placesService.nearbySearch(request, (results, status) => {
        setIsSearchingNearby(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
             const existingLeadNames = new Set(leads.map(l => l.companyName.toLowerCase()));
             const prospectsWithLeadInfo = results.map(place => {
                const existingLead = leads.find(l => l.companyName.toLowerCase() === place.name?.toLowerCase());
                return { place, existingLead };
             });

            setProspects(prospectsWithLeadInfo);
            
            if (prospectsWithLeadInfo.length > 0) {
                setIsProspectsDialogOpen(true);
                toast({ title: `Found ${prospectsWithLeadInfo.length} prospects nearby.` });
            } else {
                toast({ title: "No new prospects found nearby." });
            }
        } else {
             toast({ variant: "destructive", title: "Search Failed", description: "No new prospects found." });
        }
    });
  };

  const handleCreateLeadFromProspect = (prospect: google.maps.places.PlaceResult) => {
    const queryParams = new URLSearchParams();
    if (prospect.name) queryParams.append('companyName', prospect.name);
    if (prospect.vicinity) queryParams.append('address', prospect.vicinity);
    if (prospect.geometry?.location) {
        queryParams.append('lat', prospect.geometry.location.lat().toString());
        queryParams.append('lng', prospect.geometry.location.lng().toString());
    }
    
    router.push(`/leads/new?${queryParams.toString()}`);
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
        .gm-ui-hover-effect {
            display: none !important;
        }
        .gm-style-iw-d {
            overflow: hidden !important;
            padding: 0 !important;
        }
        .gm-style-iw-c {
            padding: 0 !important;
            border-radius: 8px !important;
        }
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
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={filters.industry} onValueChange={(value) => handleFilterChange('industry', value)}>
                        <SelectTrigger id="industry">
                            <SelectValue placeholder="Select Industry" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Industries</SelectItem>
                            {industryCategories.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
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
                    onCloseClick={() => setClickedKmlFeature(null)}
                    options={infoWindowOptions}
                >
                    <div className="p-2">
                        <h4 className="font-semibold text-sm">{clickedKmlFeature.featureData.name}</h4>
                    </div>
                </InfoWindow>
            )}
            </GoogleMap>
        </div>

        <Dialog open={isProspectsDialogOpen} onOpenChange={setIsProspectsDialogOpen}>
            <DialogContent className="max-w-4xl">
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
                                <TableHead>Source Industry</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {prospects.map(prospectInfo => (
                                <TableRow key={prospectInfo.place.place_id}>
                                    <TableCell>{prospectInfo.place.name}</TableCell>
                                    <TableCell>{prospectInfo.place.vicinity}</TableCell>
                                    <TableCell>{selectedLead?.industryCategory || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        {prospectInfo.existingLead ? (
                                            <Button size="sm" variant="outline" onClick={() => window.open(`/leads/${prospectInfo.existingLead!.id}`, '_blank')}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Lead
                                            </Button>
                                        ) : (
                                            <Button size="sm" onClick={() => handleCreateLeadFromProspect(prospectInfo.place)}>
                                                <PlusCircle className="mr-2 h-4 w-4"/>
                                                Add Lead
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
