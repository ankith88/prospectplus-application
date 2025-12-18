

"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Lead, Address, MapLead, Contact } from '@/lib/types'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Building, Mail, MapPin, Phone, Star, Filter, SlidersHorizontal, X, ExternalLink, Globe, Search, Sparkles, Eye, PlusCircle, Link as LinkIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getCompaniesFromFirebase, getLeadsFromFirebase, createNewLead, checkForDuplicateLead } from '@/services/firebase'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api'
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'

type ProspectWithLeadInfo = {
    place: google.maps.places.PlaceResult;
    existingLead?: MapLead;
    isAdding?: boolean;
    classification?: 'B2B' | 'B2C' | 'Unknown';
    description?: string;
};

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '0.5rem',
};

const center = {
  lat: -25.2744,
  lng: 133.7751,
};

const libraries: ('places' | 'drawing' | 'geometry')[] = ['places', 'drawing', 'geometry'];

export default function SignedCustomersPage() {
  const [allMapData, setAllMapData] = useState<MapLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    companyName: '',
    franchisee: [] as string[],
  });
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<MapLead | null>(null);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geoSearchInputNodeRef = useRef<HTMLInputElement | null>(null);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [prospects, setProspects] = useState<ProspectWithLeadInfo[]>([])
  const [isProspectsDialogOpen, setIsProspectsDialogOpen] = useState(false);
  const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);
  const [viewingDescription, setViewingDescription] = useState<string | null>(null);


  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });
  
  const geoSearchInputRef = useCallback((node: HTMLInputElement) => {
    if (node !== null && isLoaded && map && !autocompleteRef.current) {
        geoSearchInputNodeRef.current = node;
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
        autocompleteRef.current = autocomplete;
    }
  }, [isLoaded, map]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companies, leads] = await Promise.all([
        getCompaniesFromFirebase(),
        getLeadsFromFirebase({ summary: true }),
      ]);
      const companyMapLeads = companies
        .filter(c => c.latitude != null && c.longitude != null)
        .map(c => ({ ...c, latitude: Number(c.latitude), longitude: Number(c.longitude), isCompany: true, isProspect: false, status: 'Won' as const } as MapLead));
      
      const leadMapLeads = leads
        .filter(l => l.latitude != null && l.longitude != null)
        .map(l => ({ ...l, latitude: Number(l.latitude), longitude: Number(l.longitude), isCompany: false, isProspect: false } as MapLead));

      setAllMapData([...companyMapLeads, ...leadMapLeads]);
    } catch (error) {
      console.error("Failed to fetch signed customers:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch map data.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    if (authLoading) return;
    
    fetchData();

  }, [user, authLoading, router]);
  
  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const clearFilters = () => {
    setFilters({ companyName: '', franchisee: [] });
    if (geoSearchInputNodeRef.current) {
        geoSearchInputNodeRef.current.value = '';
    }
  };
  
  const uniqueFranchisees: Option[] = useMemo(() => {
    const franchisees = new Set(allMapData.filter(l => l.isCompany).map(lead => lead.franchisee).filter(Boolean));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allMapData]);

  const filteredCompanies = useMemo(() => {
    return allMapData.filter(item => {
        if (!item.isCompany) return false;
        const companyMatch = filters.companyName ? item.companyName.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
        const franchiseeMatch = filters.franchisee.length === 0 || (item.franchisee && filters.franchisee.includes(item.franchisee));
        return companyMatch && franchiseeMatch;
    });
  }, [allMapData, filters]);

  const mapCompanies = useMemo(() => {
    return filteredCompanies.filter(
      (company) =>
        company.latitude != null &&
        company.longitude != null &&
        !isNaN(Number(company.latitude)) &&
        !isNaN(Number(company.longitude))
    );
  }, [filteredCompanies]);

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

  const handleFindNearbyLeads = useCallback(() => {
    if (!selectedCompany || !selectedCompany.latitude || !selectedCompany.longitude || !window.google?.maps?.geometry) return;
    const centerLatLng = new google.maps.LatLng(selectedCompany.latitude, selectedCompany.longitude);
    
    const nearby = allMapData
      .filter(item => {
        if (item.isCompany || !item.latitude || !item.longitude) return false;
        const itemLatLng = new google.maps.LatLng(item.latitude, item.longitude);
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(centerLatLng, itemLatLng);
        return distance <= 500;
      })
      .map(lead => ({ place: { name: lead.companyName, vicinity: lead.address?.street, place_id: lead.id }, existingLead: lead, classification: 'B2B' as const }));

    setProspects(nearby);
    if (nearby.length > 0) {
      setIsProspectsDialogOpen(true);
    } else {
      toast({ title: 'No Nearby Leads', description: 'No leads found within a 500m radius.' });
    }
    setSelectedCompany(null);
  }, [selectedCompany, allMapData, map, toast]);

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
          
          const existingLead = allMapData.find(l => l.companyName.toLowerCase() === detailedPlace.name?.toLowerCase());

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
  }, [map, allMapData, getPlaceDetails, toast]);

  const handleFindSimilar = useCallback(async () => {
    if (!selectedCompany || !map) return;
  
    setIsSearchingNearby(true);
    toast({ title: "Analyzing Company...", description: "AI is identifying key attributes to find similar prospects." });
    
    let searchKeywords: string[] = [];
  
    if (selectedCompany.websiteUrl) {
      try {
        const prospectResult = await aiProspectWebsiteTool({ 
          leadId: selectedCompany.id, 
          websiteUrl: selectedCompany.websiteUrl 
        });
        if (prospectResult.searchKeywords && prospectResult.searchKeywords.length > 0) {
          searchKeywords = prospectResult.searchKeywords;
        }
      } catch (e) {
        console.error('AI prospecting for keywords failed, falling back.', e);
      }
    }
  
    if (searchKeywords.length === 0 && selectedCompany.industryCategory) {
      searchKeywords = [selectedCompany.industryCategory];
    }
  
    if (searchKeywords.length === 0) {
      toast({ variant: "destructive", title: "Cannot Search", description: "No industry or keywords available for this company." });
      setIsSearchingNearby(false);
      return;
    }
    
    findProspects({ lat: selectedCompany.latitude!, lng: selectedCompany.longitude! }, searchKeywords.join(' '));
    setSelectedCompany(null);
  }, [selectedCompany, map, toast, findProspects]);

  const handleFindMultiSites = useCallback(() => {
    if (!selectedCompany) return;
    const companyNameBase = selectedCompany.companyName.split(' ')[0]; // Simple logic to get base name
    const multiSites = allMapData
      .filter(item => !item.isCompany && item.companyName.toLowerCase().includes(companyNameBase.toLowerCase()))
      .map(lead => ({ place: { name: lead.companyName, vicinity: lead.address?.street, place_id: lead.id }, existingLead: lead, classification: 'B2B' as const }));
    
    setProspects(multiSites);
    if (multiSites.length > 0) {
      setIsProspectsDialogOpen(true);
    } else {
      toast({ title: 'No Multi-sites Found', description: 'No other leads with a similar name were found.' });
    }
    setSelectedCompany(null);
  }, [selectedCompany, allMapData, map, toast]);


  const formatAddress = (address?: Address) => {
    if (!address) return 'N/A';
    return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
  }
  
  const onMarkerClick = useCallback((company: MapLead) => {
    setSelectedCompany(company);
  }, []);

  const onInfoWindowClose = useCallback(() => {
    setSelectedCompany(null);
  }, []);
  
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
        
        const addressData = { street: prospect.vicinity, city: '', state: '', zip: '', country: 'Australia' };
        if (prospect.address_components) {
            const get = (type: string, useShortName = false) => {
                const comp = prospect.address_components?.find(c => c.types.includes(type));
                return useShortName ? comp?.short_name : comp?.long_name;
            };
            addressData.city = get('locality') || get('postal_town') || '';
            addressData.state = get('administrative_area_level_1', true) || '';
            addressData.zip = get('postal_code') || '';
        }

        const newLeadData = {
            companyName: prospect.name,
            websiteUrl: prospect.website || '',
            address: {
                lat: prospect.geometry.location.lat(),
                lng: prospect.geometry.location.lng(),
                ...addressData,
            },
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
        }
    };

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }
  
  const hasActiveFilters = filters.companyName !== '' || filters.franchisee.length > 0 || (geoSearchInputNodeRef.current && geoSearchInputNodeRef.current.value !== '');

  return (
    <>
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Signed Customers</h1>
        <p className="text-muted-foreground">A list of all your won accounts.</p>
      </header>

       <Collapsible>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
               <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="ml-2">Toggle Filters</span>
                  </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input id="companyName" value={filters.companyName} onChange={(e) => handleFilterChange('companyName', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="franchisee">Franchisee</Label>
                         <MultiSelectCombobox
                            options={uniqueFranchisees}
                            selected={filters.franchisee}
                            onSelectedChange={(selected) => handleFilterChange('franchisee', selected)}
                            placeholder="Select franchisees..."
                        />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="geo-search">Go to Location</Label>
                      <Input
                          id="geo-search"
                          ref={geoSearchInputRef}
                          placeholder="Suburb, state, postcode..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                            }
                          }}
                      />
                    </div>
                     {hasActiveFilters && (
                        <div className="space-y-2 col-start-1">
                            <Button variant="ghost" onClick={clearFilters}>
                                <X className="mr-2 h-4 w-4" /> Clear Filters
                            </Button>
                        </div>
                    )}
                </CardContent>
            </CollapsibleContent>
          </Card>
      </Collapsible>
      
      <Card>
        <CardHeader>
            <CardTitle>Customer Map</CardTitle>
            <CardDescription>Visual representation of your signed customers.</CardDescription>
        </CardHeader>
        <CardContent>
            <div style={{ height: '500px', width: '100%' }}>
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={center}
                        zoom={4}
                        onLoad={setMap}
                    >
                        {mapCompanies.map(company => (
                            <MarkerF
                                key={company.id}
                                position={{ lat: Number(company.latitude!), lng: Number(company.longitude!) }}
                                onClick={() => onMarkerClick(company)}
                                icon={{
                                    url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                                }}
                            />
                        ))}

                        {selectedCompany && (
                            <InfoWindowF
                                position={{ lat: Number(selectedCompany.latitude!), lng: Number(selectedCompany.longitude!) }}
                                onCloseClick={onInfoWindowClose}
                            >
                                <div className="p-2 max-w-xs space-y-2">
                                    <h3 className="font-bold text-lg">{selectedCompany.companyName}</h3>
                                    <p className="text-sm text-muted-foreground">{formatAddress(selectedCompany.address)}</p>
                                    <div className="flex flex-col gap-2">
                                        <Button size="sm" onClick={() => window.open(`/companies/${selectedCompany.id}`, '_blank')}>
                                            <ExternalLink className="mr-2 h-4 w-4" /> View Profile
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={handleFindNearbyLeads}>
                                            <Search className="mr-2 h-4 w-4" /> Nearby Leads
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={handleFindSimilar} disabled={isSearchingNearby}>
                                            {isSearchingNearby ? <Loader/> : <Sparkles className="mr-2 h-4 w-4"/>}
                                            AI Find Similar
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={handleFindMultiSites}>
                                            <Building className="mr-2 h-4 w-4" /> Find Multi-sites
                                        </Button>
                                    </div>
                                </div>
                            </InfoWindowF>
                        )}
                    </GoogleMap>
                ) : loadError ? (
                  <div className="flex h-full items-center justify-center text-destructive">Error loading map.</div>
                ) : (
                  <div className="flex h-full items-center justify-center"><Loader /></div>
                )}
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  <span>All Signed Customers</span>
                </CardTitle>
                <Badge variant="secondary">{filteredCompanies.length} customer(s)</Badge>
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Franchisee</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : filteredCompanies.length > 0 ? (
                  filteredCompanies.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                         <Button variant="link" className="p-0 h-auto flex items-center gap-2 text-left" onClick={() => window.open(`/companies/${lead.id}`, '_blank')}>
                            <Building className="h-4 w-4" />
                            {lead.companyName}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {lead.franchisee || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{formatAddress(lead.address)}</span>
                        </div>
                      </TableCell>
                       <TableCell>
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.customerServiceEmail || 'N/A'}</span>
                        </div>
                       </TableCell>
                       <TableCell>
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.customerPhone || 'N/A'}</span>
                        </div>
                       </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                          No signed customers found.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
        <Dialog open={isProspectsDialogOpen} onOpenChange={setIsProspectsDialogOpen}>
            <DialogContent className="max-w-4xl w-[95vw] md:w-full">
                <DialogHeader>
                    <DialogTitle>Nearby Prospects</DialogTitle>
                    <DialogDescription>
                        Found {prospects.length} potential leads.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                    <div className="md:hidden space-y-4">
                        {prospects.map(prospectInfo => (
                            <Card key={prospectInfo.place.place_id} className="p-4">
                                <div className="font-medium pr-2">{prospectInfo.place.name}</div>
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
                                        <Button size="sm" variant="outline" onClick={() => window.open(prospectInfo.existingLead!.isCompany ? `/companies/${prospectInfo.existingLead!.id}` : `/leads/${prospectInfo.existingLead!.id}`, '_blank')}>
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
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
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
                                        <TableCell>
                                            <div className="font-medium">{prospectInfo.place.name}</div>
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
                </ScrollArea>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsProspectsDialogOpen(false)}>Close</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  )
}
