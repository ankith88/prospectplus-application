
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
  DirectionsRenderer,
} from '@react-google-maps/api';
import type { LeadStatus, Address, MapLead, SavedRoute, StorableRoute, Activity } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Building, CheckSquare, Clock, GripVertical, Milestone, Play, Route, Trash2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const center = {
  lat: -25.2744,
  lng: 133.7751,
};

const getPinColor = (status: LeadStatus, isSelected: boolean): string => {
    if (isSelected) {
      return 'http://maps.google.com/mapfiles/ms/icons/purple-pushpin.png';
    }
    if (status === 'Won') {
      return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
    }
    const greenStatuses: LeadStatus[] = ['Qualified', 'Pre Qualified', 'Trialing ShipMate'];
    if (greenStatuses.includes(status)) {
        return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
    }
    const yellowStatuses: LeadStatus[] = ['Contacted', 'In Progress', 'Connected', 'High Touch', 'Reschedule'];
    if (yellowStatuses.includes(status)) {
        return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
    }
     const redStatuses: LeadStatus[] = ['Lost', 'Unqualified', 'Priority Lead'];
    if (redStatuses.includes(status)) {
        return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
    }
    const blueStatuses: LeadStatus[] = ['New'];
    if (blueStatuses.includes(status)) {
        return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    }
     const purpleStatuses: LeadStatus[] = ['LPO Review'];
    if (purpleStatuses.includes(status)) {
        return 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png';
    }
    return 'http://maps.google.com/mapfiles/ms/icons/grey.png'; // Default
};


export default function SavedRoutesPage() {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries: ['geometry']
    });

    const [loadedRoute, setLoadedRoute] = useState<SavedRoute | null>(null);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [totalDistance, setTotalDistance] = useState<string | null>(null);
    const [totalDuration, setTotalDuration] = useState<string | null>(null);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [isRouteActive, setIsRouteActive] = useState(false);


    const { savedRoutes, userProfile } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const loadingData = !isLoaded || !userProfile;

    const handleLoadRoute = useCallback((route: SavedRoute) => {
        if (!isLoaded) return;
        
        setDirections(route.directions);
        setLoadedRoute(route);
        setTotalDistance(route.totalDistance || null);
        setTotalDuration(route.totalDuration || null);
    }, [isLoaded]);

    useEffect(() => {
        if (loadingData || !isLoaded || savedRoutes.length === 0) return;

        const activeRouteId = localStorage.getItem('activeRouteId');
        if (activeRouteId) {
            const routeToLoad = savedRoutes.find(r => r.id === activeRouteId);
            if (routeToLoad) {
                handleLoadRoute(routeToLoad);
                setIsRouteActive(true);
            }
        }
    }, [savedRoutes, isLoaded, loadingData, handleLoadRoute]);
    
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
        toast({ title: 'Route Stopped', description: 'Active route has been cleared.' });
        router.push('/field-sales');
    };

     const formatAddress = (address?: { street?: string; city?: string; state?: string, franchisee?: string } | string) => {
        if (!address) return 'Address not available';
        if (typeof address === 'string') return address;
        return [
            address.street,
            address.city,
            address.state,
        ].filter(Boolean).join(', ');
    }

    if (loadError) {
        return <div>Error loading maps. Please check your API key and network connection.</div>
    }

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
                <p className="text-muted-foreground">{loadedRoute ? loadedRoute.name : 'No active route loaded.'}</p>
            </header>
            <div className="flex-grow flex flex-col md:flex-row-reverse gap-4">
                 <Card className="w-full md:max-w-sm lg:max-w-md flex flex-col">
                    <CardHeader className="pb-2 flex-shrink-0">
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Route className="h-5 w-5" /> Selected Stops ({loadedRoute?.leads.length || 0})
                                {isRouteActive && <Badge variant="destructive">Active</Badge>}
                            </span>
                             <Button variant="ghost" size="icon" onClick={handleStopRoute}>
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-hidden flex flex-col gap-2">
                         <ScrollArea className="flex-grow">
                            <div className="space-y-2">
                                {sortedRouteLegs.map(({ lead, leg, stopNumber }) => {
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
                                                <Button size="sm" variant="secondary" onClick={() => router.push(`/check-in/${lead.id}`)}>
                                                    <CheckSquare className="mr-2 h-4 w-4" />
                                                    Check In
                                                </Button>
                                                </div>
                                            </div>
                                            </Card>
                                        </div>
                                    )
                                })}
                            </div>
                         </ScrollArea>
                    </CardContent>
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
                        {loadedRoute && sortedRouteLegs.map(({ lead, stopNumber }) => (
                           <MarkerF
                            key={`route-${lead.id}`}
                            position={{ lat: lead.latitude!, lng: lead.longitude! }}
                            label={stopNumber.toString()}
                           />
                        ))}
                    </GoogleMap>
                </div>
            </div>
        </div>
    );
}
