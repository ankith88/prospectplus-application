
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { SavedRoute, UserProfile, Lead, MapLead, Address } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Clock, Route, Calendar, User, MapPin, Play, Trash2, X, GripVertical, CheckSquare, Bike, Car, Footprints, Save } from 'lucide-react';
import { format } from 'date-fns';
import { getAllUserRoutes, getAllUsers, deleteUserRoute, updateUserRoute, getLeadsFromFirebase } from '@/services/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, MarkerF } from '@react-google-maps/api';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const libraries: ('places' | 'drawing' | 'geometry')[] = ['places', 'drawing', 'geometry'];

export default function SavedRoutesPage() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedRoute, setLoadedRoute] = useState<SavedRoute | null>(null);
  const [selectedRouteLeads, setSelectedRouteLeads] = useState<MapLead[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [totalDistance, setTotalDistance] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const router = useRouter();
  const { userProfile, loading: authLoading, savedRoutes, setSavedRoutes } = useAuth();
  const { toast } = useToast();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const hasAccess = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin'].includes(userProfile.role);

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, hasAccess]);

  useEffect(() => {
    if (!userProfile) return;

    const fetchRoutes = async () => {
      setLoading(true);
      try {
        const [allUsers, allLeadsData] = await Promise.all([
            (userProfile.role === 'admin' || userProfile.role === 'Field Sales Admin') ? getAllUsers() : Promise.resolve([]),
            getLeadsFromFirebase({ summary: true }),
        ]);
        setAllLeads(allLeadsData);

        if (userProfile.role === 'admin' || userProfile.role === 'Field Sales Admin') {
          const allRoutesData = await getAllUserRoutes();
          const usersMap = new Map(allUsers.map(u => [u.uid, u.displayName]));
          const routesWithUser = allRoutesData.map(r => ({
              ...r,
              userName: (r as any).userId ? usersMap.get((r as any).userId) || 'Unknown User' : 'Unknown User'
          }));
          setRoutes(routesWithUser);
        } else {
          setRoutes(savedRoutes.map(r => ({...r, userName: userProfile.displayName || ''})));
        }
      } catch (error) {
        console.error("Failed to fetch routes:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch saved routes.' });
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [userProfile, savedRoutes, toast]);

  const handleLoadRoute = useCallback((route: SavedRoute) => {
    setLoadedRoute(route);
    const leadsWithFullData = route.leads.map(stop => {
        const fullLead = allLeads.find(l => l.id === stop.id);
        return fullLead ? { ...stop, status: fullLead.status, isProspect: false } : { ...stop, status: 'New', isProspect: true };
    });
    setSelectedRouteLeads(leadsWithFullData as MapLead[]);
    if (route.directions) {
        setDirections(route.directions);
    }
    setTotalDistance(route.totalDistance || null);
    setTotalDuration(route.totalDuration || null);
    localStorage.setItem('activeRouteId', route.id!);
  }, [allLeads]);
  
  const handleStartRoute = (route: SavedRoute) => {
    if (!directions) {
        toast({ variant: 'destructive', title: 'Cannot Start Route', description: 'No directions available for this route.' });
        return;
    }
    const directionsData = directions as any;
    const origin = route.startPoint === 'My Location' ? 'Current+Location' : route.startPoint;
    const destination = route.endPoint || origin;
    const waypoints = directionsData.routes[0].legs
        .slice(0, -1)
        .map((leg: any) => leg.end_address)
        .join('|');

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(waypoints)}&travelmode=${route.travelMode?.toLowerCase()}`;
    window.open(mapsUrl, '_blank');
  };

  const handleDeleteRoute = async (route: SavedRoute) => {
    if (!userProfile?.uid || !route.id) return;
    try {
        const userId = (route as any).userId || userProfile.uid;
        await deleteUserRoute(userId, route.id);
        
        setRoutes(prev => prev.filter(r => r.id !== route.id));
        if (userId === userProfile.uid) {
            setSavedRoutes(prev => prev.filter(r => r.id !== route.id));
        }

        toast({ title: 'Route Deleted', description: `Route "${route.name}" has been removed.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the route.' });
    }
  };

  const handleClearRoute = () => {
    setLoadedRoute(null);
    setSelectedRouteLeads([]);
    setDirections(null);
    localStorage.removeItem('activeRouteId');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(selectedRouteLeads);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSelectedRouteLeads(items);
    setDirections(null); // Force recalculation
    setTotalDistance(null);
    setTotalDuration(null);
  };
  
  const handleRecalculateRoute = async (travelMode: google.maps.TravelMode) => {
    if (!loadedRoute || !userProfile || selectedRouteLeads.length < 2) return;
    
    setIsRecalculating(true);
    
    const geocodeAddress = async (address: string): Promise<google.maps.LatLng | null> => {
        const geocoder = new window.google.maps.Geocoder();
        return new Promise((resolve) => {
            geocoder.geocode({ address, componentRestrictions: { country: 'AU' } }, (results, status) => {
                if (status === 'OK' && results?.[0]?.geometry.location) {
                    resolve(results[0].geometry.location);
                } else {
                    resolve(null);
                }
            });
        });
    };

    const origin = loadedRoute.startPoint ? (await geocodeAddress(loadedRoute.startPoint)) || selectedRouteLeads[0] : selectedRouteLeads[0];
    const destination = loadedRoute.endPoint ? (await geocodeAddress(loadedRoute.endPoint)) : origin;
    
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: origin.latitude, lng: origin.longitude },
        destination: { lat: destination.latitude, lng: destination.longitude },
        waypoints: selectedRouteLeads.slice(1, -1).map(l => ({ location: { lat: l.latitude, lng: l.longitude }, stopover: true })),
        optimizeWaypoints: true,
        travelMode: travelMode,
      },
      async (result, status) => {
        if (status === 'OK' && result) {
            setDirections(result);
            
            let totalDist = 0;
            let totalDur = 0;
            result.routes[0].legs.forEach(leg => {
                totalDist += leg.distance?.value || 0;
                totalDur += leg.duration?.value || 0;
            });
            
            const distanceString = (totalDist / 1000).toFixed(1) + ' km';
            
            const hours = Math.floor(totalDur / 3600);
            const minutes = Math.floor((totalDur % 3600) / 60);
            const durationString = `${hours > 0 ? `${hours} hr ` : ''}${minutes} min`;

            setTotalDistance(distanceString);
            setTotalDuration(durationString);

            const userId = (loadedRoute as any).userId || userProfile.uid;
            await updateUserRoute(userId, loadedRoute.id!, {
                leads: selectedRouteLeads,
                directions: JSON.stringify(result),
                totalDistance: distanceString,
                totalDuration: durationString,
            });
            
            toast({ title: 'Route Recalculated', description: 'The route has been updated with the new stop order.' });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: `Failed to recalculate route: ${status}` });
        }
        setIsRecalculating(false);
      }
    );
  };
  
  const handleRemoveFromRoute = (leadId: string) => {
    setSelectedRouteLeads(prev => prev.filter(l => l.id !== leadId));
    setDirections(null); // Force recalculation
  };
  
    const sortedRouteLegs = useMemo(() => {
    if (!directions) {
        return selectedRouteLeads.map((lead, index) => ({ lead, stopNumber: index + 1, leg: null }));
    }
    const orderedLeads = directions.routes[0].waypoint_order.map(i => selectedRouteLeads[i]);
    const finalLegs = [selectedRouteLeads[0], ...orderedLeads];
    
    return finalLegs.map((lead, index) => ({
      lead,
      stopNumber: index + 1,
      leg: directions.routes[0].legs[index] || null,
    }));
  }, [directions, selectedRouteLeads]);


  if (loading || authLoading || !hasAccess || !isLoaded) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }
  
  if (loadError) {
    return <div>Error loading map. Please check your API key.</div>
  }

  if (loadedRoute) {
    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-10rem)] gap-4">
            <div className="flex-grow min-h-[40vh] md:h-full relative rounded-lg overflow-hidden border">
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={{ lat: loadedRoute.leads[0].latitude, lng: loadedRoute.leads[0].longitude }}
                    zoom={10}
                >
                    {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
                    {selectedRouteLeads.map(lead => (
                        <MarkerF
                            key={lead.id}
                            position={{ lat: lead.latitude, lng: lead.longitude }}
                        />
                    ))}
                </GoogleMap>
            </div>
            <Card className="w-full md:max-w-sm lg:max-w-md flex flex-col">
                <CardHeader className="pb-2 flex-shrink-0">
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Route className="h-5 w-5" /> Selected Stops ({selectedRouteLeads.length})
                        </span>
                        <Button variant="ghost" size="icon" onClick={handleClearRoute}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow overflow-hidden flex flex-col gap-2">
                   <ScrollArea className="flex-grow">
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="droppable-stops">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                              {sortedRouteLegs.map((item, index) => {
                                if (!item.lead) return null;
                                const lead = item.lead;
                                const leg = item.leg;
                                return (
                                  <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                    {(provided) => (
                                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                        <Card className="p-3 flex items-start gap-2">
                                          <GripVertical className="cursor-grab text-muted-foreground mt-1" />
                                          <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <p className="font-bold">
                                                  <Button variant="link" className="p-0 h-auto text-left" asChild>
                                                    <Link href={`/leads/${lead.id}`} target="_blank">{item.stopNumber}. {lead.companyName}</Link>
                                                  </Button>
                                                </p>
                                                <p className="text-xs text-muted-foreground">{lead.address.street}, {lead.address.city}</p>
                                              </div>
                                              <LeadStatusBadge status={lead.status} />
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                {leg && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {leg?.duration?.text} • {leg?.distance?.text}
                                                    </p>
                                                )}
                                                <div className='flex gap-2'>
                                                  <Button size="sm" variant="secondary" onClick={() => router.push(`/check-in/${lead.id}`)}>
                                                    <CheckSquare className="mr-2 h-4 w-4" />
                                                    Check In
                                                  </Button>
                                                  <Button size="sm" variant="destructive" onClick={() => handleRemoveFromRoute(lead.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                            </div>
                                          </div>
                                        </Card>
                                      </div>
                                    )}
                                  </Draggable>
                                )
                              })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </ScrollArea>
                </CardContent>
                 <CardFooter className="flex flex-col gap-2 pt-4 border-t flex-shrink-0">
                        {totalDistance && totalDuration && (
                            <div className="flex justify-around w-full text-center text-sm p-2 bg-muted rounded-md">
                                <div className="flex items-center gap-2">
                                    <Route className="h-4 w-4 text-muted-foreground"/>
                                    <div><p className="font-semibold">{totalDistance}</p></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground"/>
                                    <div><p className="font-semibold">{totalDuration}</p></div>
                                </div>
                            </div>
                        )}
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button disabled={isRecalculating || selectedRouteLeads.length < 2} className="w-full">
                                    {isRecalculating ? <Loader /> : <Route className="mr-2 h-4 w-4" />}
                                    Re-calculate Route
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleRecalculateRoute(google.maps.TravelMode.DRIVING)}><Car className="mr-2 h-4 w-4" />Driving</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRecalculateRoute(google.maps.TravelMode.WALKING)}><Footprints className="mr-2 h-4 w-4" />Walking</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRecalculateRoute(google.maps.TravelMode.BICYCLING)}><Bike className="mr-2 h-4 w-4" />Bicycling</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={() => handleStartRoute(loadedRoute)} className="w-full bg-green-600 hover:bg-green-700" disabled={!directions}>
                            <Play className="mr-2 h-4 w-4" />
                            Start Route
                        </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Saved Routes</h1>
        <p className="text-muted-foreground">Manage and start your field sales routes.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>My Routes</CardTitle>
          <CardDescription>
            Showing {routes.length} saved route(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route Name</TableHead>
                  { (userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && <TableHead className="hidden sm:table-cell">Field Sales</TableHead> }
                  <TableHead className="hidden md:table-cell">Scheduled Date</TableHead>
                  <TableHead>Stops</TableHead>
                  <TableHead className="hidden lg:table-cell">Total Distance</TableHead>
                  <TableHead className="hidden lg:table-cell">Total Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.length > 0 ? (
                  routes.map(route => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">{route.name}</TableCell>
                       { (userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && <TableCell className="hidden sm:table-cell">{(route as any).userName || 'N/A'}</TableCell> }
                      <TableCell className="hidden md:table-cell">
                          {route.scheduledDate ? (
                             <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground"/>
                                  {format(new Date(route.scheduledDate), 'PP')}
                             </div>
                          ) : 'N/A'}
                      </TableCell>
                      <TableCell>{route.leads.length}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                             <MapPin className="h-4 w-4 text-muted-foreground"/>
                             {route.totalDistance || 'N/A'}
                          </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                           <div className="flex items-center gap-2">
                             <Clock className="h-4 w-4 text-muted-foreground"/>
                             {route.totalDuration || 'N/A'}
                          </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="icon" variant="outline" onClick={() => handleLoadRoute(route)}>
                          <Route className="h-4 w-4" />
                        </Button>
                         <Button size="icon" variant="default" onClick={() => handleStartRoute(route)} disabled={!route.directions}>
                          <Play className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button size="icon" variant="destructive"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete the route "{route.name}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteRoute(route)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin' ? 7 : 6} className="h-24 text-center">
                      No saved routes found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

