
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
import type { Lead, Address } from '@/lib/types'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Building, Mail, MapPin, Phone, Star, Filter, SlidersHorizontal, X, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getCompaniesFromFirebase } from '@/services/firebase'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api'

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
  const [signedLeads, setSignedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    companyName: '',
    franchisee: [] as string[],
  });
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<Lead | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const fetchSignedLeads = async () => {
    try {
      setLoading(true);
      const companies = await getCompaniesFromFirebase();
      setSignedLeads(companies);
    } catch (error) {
      console.error("Failed to fetch signed customers:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch signed customers.' });
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
    
    fetchSignedLeads();

  }, [user, authLoading, router, toast]);
  
  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const clearFilters = () => {
    setFilters({ companyName: '', franchisee: [] });
  };
  
  const uniqueFranchisees: Option[] = useMemo(() => {
    const franchisees = new Set(signedLeads.map(lead => lead.franchisee).filter(Boolean));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f })).sort((a, b) => a.label.localeCompare(b.label));
  }, [signedLeads]);

  const filteredSignedLeads = useMemo(() => {
    return signedLeads.filter(lead => {
        const companyMatch = filters.companyName ? lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
        const franchiseeMatch = filters.franchisee.length === 0 || (lead.franchisee && filters.franchisee.includes(lead.franchisee));
        return companyMatch && franchiseeMatch;
    });
  }, [signedLeads, filters]);

  const mapCompanies = useMemo(() => {
    return filteredSignedLeads.filter(
      (company) =>
        company.latitude != null &&
        company.longitude != null &&
        !isNaN(Number(company.latitude)) &&
        !isNaN(Number(company.longitude))
    );
  }, [filteredSignedLeads]);


  const formatAddress = (address?: Address) => {
    if (!address) return 'N/A';
    return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
  }
  
  const onMarkerClick = useCallback((company: Lead) => {
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
  
  const hasActiveFilters = filters.companyName !== '' || filters.franchisee.length > 0;

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
                                <div className="p-2 max-w-xs">
                                    <h3 className="font-bold text-lg mb-2">{selectedCompany.companyName}</h3>
                                    <p className="text-sm text-muted-foreground mb-2">{formatAddress(selectedCompany.address)}</p>
                                    <Button size="sm" onClick={() => window.open(`/companies/${selectedCompany.id}`, '_blank')}>
                                        <ExternalLink className="mr-2 h-4 w-4" /> View Profile
                                    </Button>
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
                <Badge variant="secondary">{filteredSignedLeads.length} customer(s)</Badge>
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
                ) : filteredSignedLeads.length > 0 ? (
                  filteredSignedLeads.map((lead) => (
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
