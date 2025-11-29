
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindow,
} from '@react-google-maps/api'
import { getLeadsFromFirebase } from '@/services/firebase'
import type { Lead, LeadStatus } from '@/lib/types'
import { Loader } from './ui/loader'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useRouter } from 'next/navigation'
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

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
}

const center = {
  lat: -25.2744,
  lng: 133.7751,
}

type MapLead = Pick<Lead, 'id' | 'companyName' | 'status' | 'address' | 'franchisee' | 'industryCategory'> & {
    latitude: number;
    longitude: number;
};


export default function LeadsMapClient() {
  const [leads, setLeads] = useState<MapLead[]>([])
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [selectedLead, setSelectedLead] = useState<MapLead | null>(null)
  const [filters, setFilters] = useState({
    franchisee: 'all',
    status: 'all',
    industry: 'all',
  });

  const router = useRouter()

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  })

  useEffect(() => {
    const fetchLeads = async () => {
      setLoadingLeads(true)
      const allLeads = await getLeadsFromFirebase({ summary: true })
      
      const leadsWithLocation = allLeads.filter(
        (lead): lead is MapLead => 
            typeof lead.latitude === 'number' && 
            typeof lead.longitude === 'number'
      );

      setLeads(leadsWithLocation)
      setLoadingLeads(false)
    }

    fetchLeads()
  }, [])
  
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
        const franchiseeMatch = filters.franchisee === 'all' || !lead.franchisee ? true : lead.franchisee === filters.franchisee;
        const statusMatch = filters.status === 'all' ? true : lead.status === filters.status;
        const industryMatch = filters.industry === 'all' || !lead.industryCategory ? true : lead.industryCategory === filters.industry;
        return franchiseeMatch && statusMatch && industryMatch;
    });
  }, [leads, filters]);

  const onMarkerClick = useCallback((lead: MapLead) => {
    setSelectedLead(lead)
  }, [])

  const onInfoWindowClose = useCallback(() => {
    setSelectedLead(null)
  }, [])

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


  if (!isLoaded || loadingLeads) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  const formatAddress = (address?: { street?: string; city?: string; state?: string }) => {
    if (!address) return 'Address not available';
    return [
        address.street,
        address.city,
        address.state,
    ].filter(Boolean).join(', ');
  }

  return (
    <div className="flex flex-col gap-4 flex-grow">
        <Card>
            <CardHeader>
                <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                            {industryCategories.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
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
            options={{
                streetViewControl: false,
                mapTypeControl: false,
            }}
            >
            {filteredLeads.map((lead) => (
                <MarkerF
                key={lead.id}
                position={{ lat: lead.latitude, lng: lead.longitude }}
                onClick={() => onMarkerClick(lead)}
                />
            ))}

            {selectedLead && (
                <InfoWindow
                position={{ lat: selectedLead.latitude, lng: selectedLead.longitude }}
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
                    <Button size="sm" onClick={() => router.push(`/leads/${selectedLead.id}`)}>
                    View Profile
                    </Button>
                </div>
                </InfoWindow>
            )}
            </GoogleMap>
        </div>
    </div>
  )
}
