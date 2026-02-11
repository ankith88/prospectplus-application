'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { SavedRoute, UserProfile, MapLead } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar, User, MapPin, Trash2, Filter, SlidersHorizontal, X, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { getAllUserRoutes, deleteUserRoute } from '@/services/firebase';
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
import { useToast } from '@/hooks/use-toast';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
} from '@react-google-maps/api';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';


// Styles and map options from leads-map-client.tsx
const containerStyle = {
  width: '100%',
  height: '60vh', // Adjust height as needed
  borderRadius: '0.5rem',
};

const center = {
  lat: -25.2744,
  lng: 133.7751,
};

const libraries: ('places' | 'drawing' | 'geometry')[] = ['places', 'drawing', 'geometry'];

type ProspectingArea = SavedRoute & {
  userName: string;
  userId: string;
};

export default function ProspectingAreasPage() {
  const [prospectingAreas, setProspectingAreas] = useState<ProspectingArea[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // New state for map
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedArea, setSelectedArea] = useState<ProspectingArea | null>(null);
  const [selectedLead, setSelectedLead] = useState<MapLead | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<ProspectingArea | null>(null);

  // New state for filters
  const [filters, setFilters] = useState({
    areaName: '',
    assignedUser: [] as string[],
    creationDate: undefined as Date | undefined,
  });

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const hasAccess = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin'].includes(userProfile.role);

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, hasAccess]);

  useEffect(() => {
    if (!userProfile) return;

    const fetchProspectingAreas = async () => {
      setLoading(true);
      try {
        const allRoutes = await getAllUserRoutes();

        let routesToProcess = allRoutes.filter(route => (route as any).isProspectingArea);
        
        if(userProfile.role === 'Field Sales') {
            routesToProcess = routesToProcess.filter(route => route.userId === userProfile.uid);
        }

        const areas = routesToProcess.map(route => {
            return {
              ...route,
              userName: (route as any).userName || 'Unknown User',
              userId: (route as any).userId || '',
            };
        }).filter((area): area is ProspectingArea => area !== null && !!area.userId);
        
        areas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProspectingAreas(areas);

      } catch (error) {
        console.error("Failed to fetch prospecting areas:", error);
      } finally {
        setLoading(false);
      }
    };

    if (hasAccess) {
        fetchProspectingAreas();
    }
  }, [userProfile, hasAccess]);
  
  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      areaName: '',
      assignedUser: [],
      creationDate: undefined,
    });
  };

  const userOptions: Option[] = useMemo(() => {
    const users = new Set(prospectingAreas.map(a => a.userName));
    return Array.from(users).map(u => ({ value: u, label: u }));
  }, [prospectingAreas]);

  const filteredProspectingAreas = useMemo(() => {
    return prospectingAreas.filter(area => {
        const nameMatch = filters.areaName
            ? area.name.toLowerCase().includes(filters.areaName.toLowerCase())
            : true;
        
        const userMatch = filters.assignedUser.length === 0
            ? true
            : filters.assignedUser.includes(area.userName);
            
        let dateMatch = true;
        if (filters.creationDate) {
            const areaDate = startOfDay(new Date(area.createdAt));
            const filterDate = startOfDay(filters.creationDate);
            dateMatch = areaDate.getTime() === filterDate.getTime();
        }

        return nameMatch && userMatch && dateMatch;
    });
  }, [prospectingAreas, filters]);

  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) ? val.length > 0 : !!val));

  const handleLoadArea = (area: ProspectingArea) => {
    setSelectedArea(area);
    setSelectedLead(null); // Clear any selected lead when loading a new area
  };

  useEffect(() => {
    if (map && selectedArea && selectedArea.leads.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      selectedArea.leads.forEach(lead => {
        if (lead.latitude && lead.longitude) {
          bounds.extend(new window.google.maps.LatLng(lead.latitude, lead.longitude));
        }
      });
      map.fitBounds(bounds);
    }
  }, [map, selectedArea]);
  
  const handleDelete = async () => {
    if (!areaToDelete) return;

    try {
      await deleteUserRoute(areaToDelete.userId, areaToDelete.id!);
      setProspectingAreas(prev => prev.filter(area => area.id !== areaToDelete.id));
      toast({ title: "Success", description: `Prospecting area "${areaToDelete.name}" has been deleted.` });
      if (selectedArea?.id === areaToDelete.id) {
        setSelectedArea(null);
      }
    } catch (error) {
      console.error("Failed to delete prospecting area:", error);
      toast({ variant: 'destructive', title: "Error", description: "Could not delete the area." });
    } finally {
      setAreaToDelete(null);
    }
  };


  if (loading || authLoading || !isLoaded || !hasAccess) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Prospecting Areas</h1>
        <p className="text-muted-foreground">Manage and review assigned prospecting areas.</p>
      </header>

      {/* Filters Card */}
      <Collapsible>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" /> Filters
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="ml-2">Toggle Filters</span>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="areaName">Area Name</Label>
                <Input
                  id="areaName"
                  value={filters.areaName}
                  onChange={(e) => handleFilterChange('areaName', e.target.value)}
                  placeholder="Filter by name..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedUser">Assigned User</Label>
                <MultiSelectCombobox
                  options={userOptions}
                  selected={filters.assignedUser}
                  onSelectedChange={(val) => handleFilterChange('assignedUser', val)}
                  placeholder="Select users..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creationDate">Creation Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="creationDate"
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.creationDate ? format(filters.creationDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.creationDate}
                      onSelect={(date) => handleFilterChange('creationDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {hasActiveFilters && (
                <div className="space-y-2">
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
          <CardTitle>Areas</CardTitle>
          <CardDescription>
            Showing {filteredProspectingAreas.length} area(s). {selectedArea && `Currently viewing: ${selectedArea.name}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area Name</TableHead>
                <TableHead>Assigned User</TableHead>
                <TableHead>Creation Date</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProspectingAreas.length > 0 ? (
                filteredProspectingAreas.map(area => (
                  <TableRow key={area.id} className={selectedArea?.id === area.id ? 'bg-muted' : ''}>
                    <TableCell className="font-medium">{area.name}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                           <User className="h-4 w-4 text-muted-foreground"/>
                           {area.userName}
                        </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground"/>
                            {format(new Date(area.createdAt), 'PPpp')}
                       </div>
                    </TableCell>
                    <TableCell>{area.leads.length}</TableCell>
                    <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => handleLoadArea(area)}>
                                <MapPin className="mr-2 h-4 w-4" /> Load on Map
                            </Button>
                             <Button variant="destructive" size="sm" onClick={() => setAreaToDelete(area)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No prospecting areas found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selectedArea && (
        <Card>
          <CardHeader>
            <CardTitle>Map View: {selectedArea.name}</CardTitle>
          </CardHeader>
          <CardContent>
             <div style={containerStyle}>
                {isLoaded ? (
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
                     {selectedArea.leads.map(lead => (
                        <MarkerF
                          key={lead.id}
                          position={{ lat: lead.latitude!, lng: lead.longitude! }}
                          onClick={() => setSelectedLead(lead as MapLead)}
                        />
                      ))}
                      {selectedLead && (
                        <InfoWindowF
                            position={{ lat: selectedLead.latitude!, lng: selectedLead.longitude! }}
                            onCloseClick={() => setSelectedLead(null)}
                        >
                           <div className="p-2 max-w-xs space-y-2">
                               <h3 className="font-bold">{selectedLead.companyName}</h3>
                               <p className="text-sm text-muted-foreground">
                                   {selectedLead.address?.street}, {selectedLead.address?.city}
                               </p>
                                <Button size="sm" onClick={() => router.push(`/leads/${selectedLead.id}`)}>
                                    View Lead
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
      )}
    </div>
    <AlertDialog open={!!areaToDelete} onOpenChange={(open) => !open && setAreaToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the prospecting area "{areaToDelete?.name}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
