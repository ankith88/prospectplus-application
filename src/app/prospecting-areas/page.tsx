
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { SavedRoute, UserProfile, MapLead } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar, User, MapPin, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
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
      <Card>
        <CardHeader>
          <CardTitle>Areas</CardTitle>
          <CardDescription>
            Showing {prospectingAreas.length} area(s). {selectedArea && `Currently viewing: ${selectedArea.name}`}
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
              {prospectingAreas.length > 0 ? (
                prospectingAreas.map(area => (
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

    