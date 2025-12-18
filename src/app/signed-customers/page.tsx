

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
import type { Lead, Address, MapLead } from '@/lib/types'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Building, Mail, MapPin, Phone, Star, Filter, SlidersHorizontal, X, ExternalLink, Globe, Search, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getCompaniesFromFirebase, getLeadsFromFirebase } from '@/services/firebase'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'

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
  const { user, authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<MapLead | null>(null);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geoSearchInputNodeRef = useRef<HTMLInputElement | null>(null);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);


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
        .map(c => ({ ...c, latitude: Number(c.latitude), longitude: Number(c.longitude), isCompany: true, isProspect: false } as MapLead));
      
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

  const handleFindNearbyLeads = useCallback(() => {
    if (!selectedCompany || !selectedCompany.latitude || !selectedCompany.longitude || !window.google?.maps?.geometry) return;
    const centerLatLng = new google.maps.LatLng(selectedCompany.latitude, selectedCompany.longitude);
    
    const nearby = allMapData.filter(item => {
      if (item.isCompany || !item.latitude || !item.longitude) return false;
      const itemLatLng = new google.maps.LatLng(item.latitude, item.longitude);
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(centerLatLng, itemLatLng);
      return distance <= 500;
    });
    
    if (nearby.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      nearby.forEach(item => bounds.extend({ lat: item.latitude!, lng: item.longitude! }));
      map?.fitBounds(bounds);
      toast({ title: 'Nearby Leads Found', description: `Found ${nearby.length} leads within 500m.` });
    } else {
      toast({ title: 'No Nearby Leads', description: 'No leads found within a 500m radius.' });
    }
    setSelectedCompany(null);
  }, [selectedCompany, allMapData, map, toast]);

  const handleFindSimilar = useCallback(async () => {
    if (!selectedCompany || !map) return;
  
    setIsSearchingNearby(true);
    toast({ title: "Analyzing Company...", description: "AI is identifying key attributes to find similar prospects." });
    
    let searchKeywords: string[] = [];
  
    if (selectedCompany.websiteUrl) {
      try {
        const prospectResult = await prospectWebsiteTool({ 
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
    
    const placesService = new window.google.maps.places.PlacesService(map);
    placesService.nearbySearch({
      location: { lat: selectedCompany.latitude!, lng: selectedCompany.longitude! },
      radius: 2000,
      keyword: searchKeywords.join(' '),
    }, (results, status) => {
        setIsSearchingNearby(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            toast({ title: 'Similar Prospects Found', description: `Found ${results.length} similar businesses nearby.` });
            const bounds = new google.maps.LatLngBounds();
            results.forEach(place => place.geometry?.location && bounds.extend(place.geometry.location));
            map.fitBounds(bounds);
        } else {
            toast({ variant: 'destructive', title: 'Search Failed', description: 'Could not find similar prospects.' });
        }
    });
    setSelectedCompany(null);
  }, [selectedCompany, map, toast]);

  const handleFindMultiSites = useCallback(() => {
    if (!selectedCompany) return;
    const companyNameBase = selectedCompany.companyName.split(' ')[0]; // Simple logic to get base name
    const multiSites = allMapData.filter(item => 
      !item.isCompany && item.companyName.toLowerCase().includes(companyNameBase.toLowerCase())
    );
    
    if (multiSites.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      multiSites.forEach(item => bounds.extend({ lat: item.latitude!, lng: item.longitude! }));
      map?.fitBounds(bounds);
      toast({ title: 'Multi-sites Found', description: `Found ${multiSites.length} potential multi-site leads.` });
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

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }
  
  const hasActiveFilters = filters.companyName !== '' || filters.franchisee.length > 0 || (geoSearchInputNodeRef.current && geoSearchInputNodeRef.current.value !== '');

  return (
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
  )
}
