

'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { SavedRoute, UserProfile, Lead, Address } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Clock, Route, Calendar, User, MapPin, Trash2, Satellite, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { getAllUserRoutes, deleteUserRoute, getCompaniesFromFirebase } from '@/services/firebase';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
  PolygonF,
  RectangleF,
} from '@react-google-maps/api';
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
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';


const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: -33.8688,
  lng: 151.2093,
};

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'drawing', 'geometry', 'visualization'];

const formatAddressDisplay = (address?: Address) => {
    if (!address) return '';
    return [address.address1, address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
};

export default function ProspectingAreasPage() {
  const [prospectingAreas, setProspectingAreas] = useState<SavedRoute[]>([]);
  const [allCompanies, setAllCompanies] = useState<Lead[]>([]);
  const [nearbyCompanies, setNearbyCompanies] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<SavedRoute | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<SavedRoute | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite'>('roadmap');
  const [selectedCompany, setSelectedCompany] = useState<Lead | null>(null);

  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

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
        const [allRoutes, companies] = await Promise.all([
          getAllUserRoutes(),
          getCompaniesFromFirebase()
        ]);
        const areas = allRoutes.filter(route => route.isProspectingArea);
        
        let userAreas = areas;
        if (userProfile.role === 'Field Sales') {
            userAreas = areas.filter(area => area.userId === userProfile.uid);
        }

        userAreas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProspectingAreas(userAreas);
        setAllCompanies(companies);
      } catch (error) {
        console.error("Failed to fetch prospecting areas:", error);
        toast({ variant: "destructive", title: 'Error', description: 'Could not fetch prospecting areas.' });
      } finally {
        setLoading(false);
      }
    };
    if(hasAccess) {
        fetchProspectingAreas();
    }
  }, [userProfile, hasAccess, toast]);
  
  const mapCenter = useMemo(() => {
    if (!isLoaded || !selectedArea) return defaultCenter;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;
    
    (selectedArea.streets || []).forEach(street => {
        if(street.latitude && street.longitude) {
            bounds.extend({ lat: street.latitude, lng: street.longitude });
            hasPoints = true;
        }
    });

    (selectedArea.leads || []).forEach(lead => {
      if (lead.latitude && lead.longitude) {
        bounds.extend({ lat: lead.latitude, lng: lead.longitude });
        hasPoints = true;
      }
    });

    if (hasPoints) {
      return bounds.getCenter().toJSON();
    }
    
    return defaultCenter;
  }, [selectedArea, isLoaded]);


  const handleDeleteArea = async () => {
      if (!areaToDelete || !areaToDelete.userId) return;

      try {
          await deleteUserRoute(areaToDelete.userId, areaToDelete.id!);
          setProspectingAreas(prev => prev.filter(area => area.id !== areaToDelete.id));
          if (selectedArea?.id === areaToDelete.id) {
              setSelectedArea(null);
          }
          toast({ title: "Success", description: "Prospecting area deleted." });
      } catch (error) {
          console.error("Failed to delete area:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not delete the area." });
      } finally {
          setAreaToDelete(null);
      }
  };

  const handleLoadArea = useCallback((area: SavedRoute) => {
    setSelectedArea(area);
    setNearbyCompanies([]);
    if(map && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      let hasBounds = false;

      if (area.shape?.type === 'polygon' && area.shape.paths?.[0]?.length) {
        area.shape.paths[0].forEach(path => bounds.extend(path));
        hasBounds = true;
      } else if (area.shape?.type === 'rectangle' && area.shape.bounds) {
        const rectBounds = new window.google.maps.LatLngBounds(area.shape.bounds);
        bounds.union(rectBounds);
        hasBounds = true;
      }

      if (area.streets && area.streets.length > 0) {
        area.streets.forEach(street => {
            if (street.latitude && street.longitude) {
                bounds.extend({ lat: street.latitude, lng: street.longitude });
                hasBounds = true;
            }
        });
      }

      if (area.leads && area.leads.length > 0) {
        area.leads.forEach(lead => {
            if (lead.latitude && lead.longitude) {
                bounds.extend({ lat: lead.latitude, lng: lead.longitude });
                hasBounds = true;
            }
        });
      }
      
      if (hasBounds) {
        map.fitBounds(bounds);
        const areaCenter = bounds.getCenter();
        const nearby = allCompanies.filter(company => {
            if (!company.latitude || !company.longitude) return false;
            const companyLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
            const distance = window.google.maps.geometry.spherical.computeDistanceBetween(areaCenter, companyLatLng);
            return distance <= 5000; // 5km
        });
        setNearbyCompanies(nearby);
      } else if (area.leads?.length === 1 && area.leads[0].latitude && area.leads[0].longitude) {
          const center = { lat: area.leads[0].latitude, lng: area.leads[0].longitude };
          map.panTo(center);
          map.setZoom(15);
           const areaCenter = new window.google.maps.LatLng(center.lat, center.lng);
           const nearby = allCompanies.filter(company => {
               if (!company.latitude || !company.longitude) return false;
               const companyLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
               const distance = window.google.maps.geometry.spherical.computeDistanceBetween(areaCenter, companyLatLng);
               return distance <= 5000;
           });
           setNearbyCompanies(nearby);
      } else if (area.streets?.length === 1 && area.streets[0].latitude && area.streets[0].longitude) {
          const center = { lat: area.streets[0].latitude, lng: area.streets[0].longitude };
          map.panTo(center);
          map.setZoom(15);
           const areaCenter = new window.google.maps.LatLng(center.lat, center.lng);
           const nearby = allCompanies.filter(company => {
               if (!company.latitude || !company.longitude) return false;
               const companyLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
               const distance = window.google.maps.geometry.spherical.computeDistanceBetween(areaCenter, companyLatLng);
               return distance <= 5000;
           });
           setNearbyCompanies(nearby);
      }
    }
  }, [map, allCompanies]);


  if (loading || authLoading || !isLoaded) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }
   if (loadError) return <div>Error loading maps</div>;

  return (
    <>
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Prospecting Areas</h1>
        <p className="text-muted-foreground">Review and manage your team's designated prospecting areas.</p>
      </header>

      {selectedArea && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>{selectedArea.name}</CardTitle>
                    <CardDescription>
                        Created on {format(new Date(selectedArea.createdAt), 'PP')} by {selectedArea.userName}
                    </CardDescription>
                </div>
                <Button
                    onClick={() => setMapTypeId(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
                    variant="outline"
                    size="sm"
                >
                    <Satellite className="mr-2 h-4 w-4" />
                    {mapTypeId === 'roadmap' ? 'Satellite' : 'Roadmap'}
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div style={containerStyle}>
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={mapCenter}
                    zoom={14}
                    onLoad={setMap}
                    mapTypeId={mapTypeId}
                >
                  {selectedArea.shape?.type === 'polygon' && selectedArea.shape.paths && (
                    <PolygonF
                      paths={selectedArea.shape.paths}
                      options={{ fillColor: '#4285F4', fillOpacity: 0.2, strokeColor: '#4285F4', strokeWeight: 2 }}
                    />
                  )}
                  {selectedArea.shape?.type === 'rectangle' && selectedArea.shape.bounds && (
                    <RectangleF
                      bounds={selectedArea.shape.bounds}
                      options={{ fillColor: '#4285F4', fillOpacity: 0.2, strokeColor: '#4285F4', strokeWeight: 2 }}
                    />
                  )}
                  {(selectedArea.leads || []).map(lead => (
                      <MarkerF
                          key={lead.id}
                          position={{ lat: lead.latitude, lng: lead.longitude }}
                          title={lead.companyName}
                      />
                  ))}
                  {(selectedArea.streets || []).map(street => (
                      <MarkerF
                          key={street.place_id}
                          position={{ lat: street.latitude, lng: street.longitude }}
                          title={street.description}
                          icon={{ url: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png" }}
                      />
                  ))}
                  {nearbyCompanies.map(company => (
                        <MarkerF
                            key={`company-${company.id}`}
                            position={{ lat: company.latitude!, lng: company.longitude! }}
                            title={company.companyName}
                            icon={{ url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }}
                            onClick={() => setSelectedCompany(company)}
                        />
                    ))}

                    {selectedCompany && (
                        <InfoWindowF
                            position={{ lat: Number(selectedCompany.latitude!), lng: Number(selectedCompany.longitude!) }}
                            onCloseClick={() => setSelectedCompany(null)}
                        >
                            <div className="p-2 max-w-xs space-y-2">
                                <h3 className="font-bold text-lg">{selectedCompany.companyName}</h3>
                                <p className="text-sm text-muted-foreground">{formatAddressDisplay(selectedCompany.address as Address)}</p>
                                <Button size="sm" onClick={() => window.open(`/companies/${selectedCompany.id}`, '_blank')}>
                                    <ExternalLink className="mr-2 h-4 w-4" /> View Profile
                                </Button>
                            </div>
                        </InfoWindowF>
                    )}
                </GoogleMap>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-semibold">Contents of this Area</h4>
                    <ScrollArea className="h-32 border rounded-md mt-2">
                        <div className="p-2 text-sm">
                            {selectedArea.leads && selectedArea.leads.length > 0 && (
                                <div>
                                    <p className="font-medium">Leads ({selectedArea.leads.length}):</p>
                                    <ul className="list-disc list-inside">
                                        {selectedArea.leads.map(l => <li key={l.id}>{l.companyName}</li>)}
                                    </ul>
                                </div>
                            )}
                            {selectedArea.streets && selectedArea.streets.length > 0 && (
                                <div className="mt-2">
                                    <p className="font-medium">Streets ({selectedArea.streets.length}):</p>
                                    <ul className="list-disc list-inside">
                                        {selectedArea.streets.map(s => <li key={s.place_id}>{s.description}</li>)}
                                    </ul>
                                </div>
                            )}
                            {(!selectedArea.leads || selectedArea.leads.length === 0) && (!selectedArea.streets || selectedArea.streets.length === 0) && (
                                <p className="text-muted-foreground p-4 text-center">This area is empty.</p>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                 {selectedArea.notes && (
                    <div>
                        <h4 className="font-semibold">Notes</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 mt-2 border rounded-md bg-secondary/50 h-32 overflow-y-auto">{selectedArea.notes}</p>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Saved Areas</CardTitle>
          <CardDescription>
            A list of all prospecting areas. Select one to view it on the map.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area Name</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Contents</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prospectingAreas.length > 0 ? (
                prospectingAreas.map(area => (
                  <TableRow key={area.id} onClick={() => handleLoadArea(area)} className={selectedArea?.id === area.id ? 'bg-secondary' : 'cursor-pointer'}>
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
                            {format(new Date(area.createdAt), 'PP')}
                       </div>
                    </TableCell>
                    <TableCell>
                        {area.streets?.length || 0} streets / {area.leads?.length || 0} leads
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleLoadArea(area)}}>
                                <MapPin className="mr-2 h-4 w-4" /> View on Map
                            </Button>
                             <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); setAreaToDelete(area)}}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No prospecting areas found. Create one from the Territory Map.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
                <AlertDialogAction onClick={handleDeleteArea} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
