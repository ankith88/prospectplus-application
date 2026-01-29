
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  GoogleMap,
  MarkerF,
  InfoWindowF,
  DirectionsRenderer,
} from '@react-google-maps/api';
import type { LeadStatus, Address, MapLead, SavedRoute, StorableRoute, Activity, UserProfile, Lead } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Building, CheckSquare, Clock, GripVertical, Milestone, Play, Route, Trash2, XCircle, Save, User, Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAllUserRoutes, getUserRoutes, getAllUsers, getCompaniesFromFirebase } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
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

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const center = {
  lat: -25.2744,
  lng: 133.7751,
};


export default function SavedRoutesPage() {
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [loadedRoute, setLoadedRoute] = useState<SavedRoute | null>(null);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [totalDistance, setTotalDistance] = useState<string | null>(null);
    const [totalDuration, setTotalDuration] = useState<string | null>(null);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [isRouteActive, setIsRouteActive] = useState(false);
    const [allRoutes, setAllRoutes] = useState<SavedRoute[]>([]);
    const [activeTab, setActiveTab] = useState('stops');
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [allCompanies, setAllCompanies] = useState<Lead[]>([]);
    const [isNearbyCompaniesDialogOpen, setIsNearbyCompaniesDialogOpen] = useState(false);
    const [nearbyCompanies, setNearbyCompanies] = useState<Lead[]>([]);
    const [isFindingNearby, setIsFindingNearby] = useState(false);
    const [findingNearbyFor, setFindingNearbyFor] = useState<MapLead | null>(null);

    const [routeNameFilter, setRouteNameFilter] = useState('');
    const [routeDateFilter, setRouteDateFilter] = useState<Date | undefined>();
    const [routeUserFilter, setRouteUserFilter] = useState<string[]>([]);


    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    useEffect(() => {
        if (typeof window !== 'undefined' && window.google) {
            setScriptLoaded(true);
        }
    }, []);

    const loadingData = !scriptLoaded || !userProfile || authLoading;

    const handleLoadRoute = useCallback((route: SavedRoute) => {
        if (!scriptLoaded) return;
        
        setDirections(route.directions);
        setLoadedRoute(route);
        setTotalDistance(route.totalDistance || null);
        setTotalDuration(route.totalDuration || null);

        if (route.id) {
            localStorage.setItem('activeRouteId', route.id);
            setIsRouteActive(true);
            toast({ title: 'Route Loaded', description: `Route "${route.name}" is now active.` });
        }
        setActiveTab('stops');
    }, [scriptLoaded, toast]);

    useEffect(() => {
        const fetchData = async () => {
          if (scriptLoaded && userProfile) {
            setLoadingData(true);
            try {
              const promises: [Promise<SavedRoute[]>, Promise<UserProfile[]>, Promise<Lead[]>] = [
                (userProfile.role === 'admin' || userProfile.role === 'Field Sales Admin') ? getAllUserRoutes() : getUserRoutes(userProfile.uid),
                getAllUsers(),
                getCompaniesFromFirebase()
              ];
              
              const [routes, users, companies] = await Promise.all(promises);
              
              setAllRoutes(routes);
              setAllUsers(users);
              setAllCompanies(companies);
            } catch (error) {
              console.error("Failed to fetch page data:", error);
              toast({ variant: 'destructive', title: 'Error', description: 'Could not load initial data.' });
            } finally {
              setLoadingData(false);
            }
          }
        };
        fetchData();
    }, [scriptLoaded, userProfile, toast]);

    useEffect(() => {
        if (loadingData || !scriptLoaded || allRoutes.length === 0) return;

        const activeRouteId = localStorage.getItem('activeRouteId');
        if (activeRouteId) {
            const routeToLoad = allRoutes.find(r => r.id === activeRouteId);
            if (routeToLoad) {
                handleLoadRoute(routeToLoad);
                setIsRouteActive(true);
            }
        }
    }, [allRoutes, scriptLoaded, loadingData, handleLoadRoute]);
    
    const sortedRouteLegs = useMemo(() => {
        if (!directions || !loadedRoute?.leads.length) return [];
        
        const waypointOrder = directions.routes[0].waypoint_order;

        const orderedLeads = waypointOrder.map(originalIndex => loadedRoute.leads[originalIndex]);

        return directions.routes[0].legs.map((leg, index) => {
            const lead = orderedLeads[index];
            return { lead, leg, stopNumber: index + 1 };
        });
    }, [directions, loadedRoute]);
    
    const handleStartRoute = () => {
        if (!directions || !directions.routes || directions.routes.length === 0 || !loadedRoute) {
            toast({ variant: 'destructive', title: 'Cannot Start Route', description: 'No active route available.' });
            return;
        }
    
        const origin = loadedRoute.startPoint || `${''}${directions.routes[0].legs[0].start_location.lat()},${''}${directions.routes[0].legs[0].start_location.lng()}`;
        const destination = loadedRoute.endPoint || `${''}${directions.routes[0].legs.slice(-1)[0].end_location.lat()},${''}${directions.routes[0].legs.slice(-1)[0].end_location.lng()}`;
        const waypoints = directions.routes[0].legs
            .slice(0, -1)
            .map((leg: any) => leg.end_address)
            .join('|');
    
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoints)}&travelmode=${loadedRoute.travelMode?.toLowerCase()}`;
        
        window.open(mapsUrl, '_blank');
        setIsRouteActive(true);
    };

    const handleStopRoute = () => {
        setIsRouteActive(false);
        setDirections(null);
        setLoadedRoute(null);
        localStorage.removeItem('activeRouteId');
        setTotalDistance(null);
        setTotalDuration(null);
        toast({ title: 'Route Cleared', description: 'Active route has been cleared. Select another route to load.' });
    };

     const formatAddress = (address?: Address) => {
        if (!address) return 'N/A';
        return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
    }
    
    const handleFindNearbyCompanies = useCallback(async (lead: MapLead) => {
        if (!lead?.latitude || !lead?.longitude || !window.google?.maps?.geometry) {
            toast({ variant: 'destructive', title: 'Location Missing', description: 'This lead does not have valid coordinates to find nearby customers.' });
            return;
        }

        setIsFindingNearby(true);
        setFindingNearbyFor(lead);
        try {
            const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
            
            const nearby = allCompanies.filter(company => {
            if (!company.latitude || !company.longitude || company.id === lead.id) {
                return false;
            }
            const itemLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
            const distance = window.google.maps.geometry.spherical.computeDistanceBetween(leadLatLng, itemLatLng);
            return distance <= 1000; // 1km radius
            });

            setNearbyCompanies(nearby);
            setIsNearbyCompaniesDialogOpen(true);
            if(nearby.length === 0) {
                toast({ title: 'No Nearby Customers', description: 'No signed customers found within a 1km radius.' });
            }
        } catch (error) {
            console.error("Error finding nearby companies:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch nearby companies.' });
        } finally {
            setIsFindingNearby(false);
            setFindingNearbyFor(null);
        }
    }, [allCompanies, toast]);

    const userOptionsForFilter = useMemo(() => {
        if (userProfile?.role !== 'admin' && userProfile?.role !== 'Field Sales Admin') {
            return [];
        }
        const usersWithRoutes = new Set(allRoutes.map(r => (r as any).userName));
        return Array.from(usersWithRoutes).map(name => ({ value: name, label: name }));
    }, [allRoutes, userProfile]);

    const filteredAllRoutes = useMemo(() => {
        return allRoutes.filter(route => {
            const nameMatch = routeNameFilter ? route.name.toLowerCase().includes(routeNameFilter.toLowerCase()) : true;
            
            let dateMatch = true;
            if (routeDateFilter) {
                if (!route.scheduledDate) {
                    dateMatch = false;
                } else {
                    const routeDate = new Date(route.scheduledDate);
                    const filterDate = new Date(routeDateFilter);
                    dateMatch = routeDate.getFullYear() === filterDate.getFullYear() &&
                                routeDate.getMonth() === filterDate.getMonth() &&
                                routeDate.getDate() === filterDate.getDate();
                }
            }
            
            const userMatch = routeUserFilter.length === 0 || routeUserFilter.includes((route as any).userName);

            return nameMatch && dateMatch && userMatch;
        });
    }, [allRoutes, routeNameFilter, routeDateFilter, routeUserFilter]);

    if (loadingData) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full gap-4">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Saved Route</h1>
                <p className="text-muted-foreground">{loadedRoute ? `Viewing route: ${loadedRoute.name}` : 'No active route loaded. Select a route from the list.'}</p>
            </header>
            <div className="flex-grow flex flex-col md:flex-row-reverse gap-4">
                 <Card className="w-full md:max-w-sm lg:max-w-md flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                         <CardHeader className="pb-2 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <CardTitle>
                                    {isRouteActive && loadedRoute ? loadedRoute.name : 'Routes'}
                                </CardTitle>
                                {isRouteActive && (
                                    <div className="flex items-center gap-2">
                                        <Badge variant="destructive">Active</Badge>
                                        <Button variant="ghost" size="icon" onClick={handleStopRoute}>
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <TabsList className="grid w-full grid-cols-2 mt-2">
                                <TabsTrigger value="stops">
                                    <span className="flex items-center gap-2">
                                        <Route className="h-4 w-4" /> Stops ({loadedRoute?.leads.length || 0})
                                    </span>
                                </TabsTrigger>
                                <TabsTrigger value="routes">
                                    <span className="flex items-center gap-2">
                                        <Save className="h-4 w-4" /> All Routes ({allRoutes.length})
                                    </span>
                                </TabsTrigger>
                            </TabsList>
                        </CardHeader>
                        
                        <TabsContent value="stops" className="flex-grow overflow-hidden flex flex-col">
                            <CardContent className="flex-grow overflow-hidden flex flex-col gap-2">
                                <ScrollArea className="flex-grow">
                                    <div className="space-y-2">
                                        {loadedRoute && sortedRouteLegs.length > 0 ? sortedRouteLegs.map(({ lead, leg, stopNumber }) => {
                                            if (!lead) return null;
                                            return (
                                                <div key={lead.id}>
                                                    <Card className="p-3 flex items-center gap-2">
                                                    <div className="flex-grow">
                                                        <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold">
                                                                <Button variant="link" className="p-0 h-auto text-left" asChild>
                                                                    <Link href={`/leads/${lead.id}`} target="_blank">{stopNumber}. {lead.companyName}</Link>
                                                                </Button>
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">{formatAddress(lead.address)}</p>
                                                        </div>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2">
                                                        <p className="text-xs text-muted-foreground">
                                                            {leg?.duration?.text} • {leg?.distance?.text}
                                                        </p>
                                                        <div className="flex gap-1">
                                                          <Button size="sm" variant="secondary" onClick={() => router.push(`/check-in/${lead.id}`)}>
                                                              <CheckSquare className="mr-2 h-4 w-4" />
                                                              Check In
                                                          </Button>
                                                          <Button size="sm" variant="outline" onClick={() => handleFindNearbyCompanies(lead)} disabled={isFindingNearby && findingNearbyFor?.id === lead.id}>
                                                            {isFindingNearby && findingNearbyFor?.id === lead.id ? <Loader /> : <Building className="h-4 w-4" />}
                                                          </Button>
                                                        </div>
                                                        </div>
                                                    </div>
                                                    </Card>
                                                </div>
                                            )
                                        }) : (
                                            <div className="text-center text-muted-foreground pt-10">No stops in this route, or no route loaded.</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                            {loadedRoute && (
                                <CardFooter className="flex flex-col gap-2 pt-4 border-t flex-shrink-0">
                                    {totalDistance && totalDuration && (
                                        <div className="flex justify-around w-full text-center text-sm p-2 bg-muted rounded-md">
                                            <div className="flex items-center gap-2">
                                                <Milestone className="h-4 w-4 text-muted-foreground"/>
                                                <div>
                                                    <p className="font-semibold">{totalDistance}</p>
                                                    <p className="text-xs text-muted-foreground">Total Distance</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground"/>
                                                <div>
                                                    <p className="font-semibold">{totalDuration}</p>
                                                    <p className="text-xs text-muted-foreground">Total Time</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <Button onClick={handleStartRoute} className="w-full bg-green-600 hover:bg-green-700" disabled={!directions}>
                                        <Play className="mr-2 h-4 w-4" />
                                        Start Route
                                    </Button>
                                </CardFooter>
                            )}
                        </TabsContent>

                        <TabsContent value="routes" className="flex-grow overflow-hidden flex flex-col">
                            <CardContent className="flex-grow overflow-hidden flex flex-col gap-2">
                                <div className="flex-shrink-0 p-1 space-y-2 border-b mb-2">
                                    <h4 className="font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <Input placeholder="Filter by route name..." value={routeNameFilter} onChange={e => setRouteNameFilter(e.target.value)} />
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {routeDateFilter ? format(routeDateFilter, "PPP") : <span>Filter by date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 z-[51]">
                                                <Calendar mode="single" selected={routeDateFilter} onSelect={setRouteDateFilter} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                                        <div className="pt-2">
                                            <MultiSelectCombobox
                                                options={userOptionsForFilter}
                                                selected={routeUserFilter}
                                                onSelectedChange={setRouteUserFilter}
                                                placeholder="Filter by user..."
                                            />
                                        </div>
                                    )}
                                    {(routeNameFilter || routeDateFilter || routeUserFilter.length > 0) && (
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            setRouteNameFilter('');
                                            setRouteDateFilter(undefined);
                                            setRouteUserFilter([]);
                                        }}><X className="mr-2 h-4 w-4" /> Clear Filters</Button>
                                    )}
                                </div>
                                <ScrollArea className="flex-grow">
                                {filteredAllRoutes.length > 0 ? (
                                    <div className="space-y-2">
                                    {filteredAllRoutes.map(route => (
                                        <Card key={route.id} className="p-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold">{route.name}</p>
                                                    <p className="text-xs text-muted-foreground">{route.leads.length} stops &bull; Created on {new Date(route.createdAt).toLocaleDateString()}</p>
                                                    {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3"/> {(route as any).userName}</p>
                                                    )}
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => handleLoadRoute(route)}>Load Route</Button>
                                            </div>
                                        </Card>
                                    ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground pt-10">No saved routes match filters.</p>
                                )}
                                </ScrollArea>
                            </CardContent>
                        </TabsContent>
                    </Tabs>
                </Card>
                <div className="flex-grow min-h-[60vh] relative rounded-lg overflow-hidden border">
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={center}
                        zoom={4}
                    >
                         {directions && (
                            <DirectionsRenderer
                                directions={directions}
                                options={{
                                    suppressMarkers: true,
                                    polylineOptions: {
                                        strokeColor: '#095c7b',
                                        strokeWeight: 6,
                                        strokeOpacity: 0.8,
                                    },
                                }}
                            />
                        )}
                        {loadedRoute && sortedRouteLegs.map(({ lead, stopNumber }) => {
                           if (!lead) return null;
                           return (
                               <MarkerF
                                key={`route-${lead.id}`}
                                position={{ lat: lead.latitude!, lng: lead.longitude! }}
                                label={stopNumber.toString()}
                               />
                           )
                        })}
                    </GoogleMap>
                </div>
            </div>
            <Dialog open={isNearbyCompaniesDialogOpen} onOpenChange={setIsNearbyCompaniesDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Nearby Signed Customers</DialogTitle>
                        <DialogDescription>
                            Found {nearbyCompanies.length} signed customer(s) within a 1km radius.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                        {nearbyCompanies.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company Name</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>Industry</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {nearbyCompanies.map(company => (
                                        <TableRow key={company.id}>
                                            <TableCell className="font-semibold whitespace-normal">
                                                <Button variant="link" asChild className="p-0 h-auto text-left whitespace-normal">
                                                    <Link href={`/companies/${company.id}`} target="_blank">{company.companyName}</Link>
                                                </Button>
                                            </TableCell>
                                            <TableCell className="whitespace-normal">{formatAddress(company.address as Address)}</TableCell>
                                            <TableCell className="whitespace-normal">{company.industryCategory || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No nearby customers found.</p>
                        )}
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNearbyCompaniesDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
