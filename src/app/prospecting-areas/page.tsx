'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { SavedRoute, UserProfile, Lead, Address } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Clock, Route, Calendar, User, MapPin, Trash2, Satellite, ExternalLink, CheckSquare, Pencil, X } from 'lucide-react';
import { format } from 'date-fns';
import { getAllUserRoutes, deleteUserRoute, getCompaniesFromFirebase, updateUserRoute } from '@/services/firebase';
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
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';


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
  const [nearbyCompanies, setNearbyCompanies] = useState<(Lead & { distance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<SavedRoute | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<SavedRoute | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite'>('roadmap');
  const [selectedCompany, setSelectedCompany] = useState<Lead | null>(null);
  const [hoveredCompanyId, setHoveredCompanyId] = useState<string | null>(null);
  const [searchNearbyQuery, setSearchNearbyQuery] = useState('');

  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const hasAccess = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin'].includes(userProfile.role);

  const fetchProspectingAreas = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const [allRoutes, companies] = await Promise.all([
        getAllUserRoutes(),
        getCompaniesFromFirebase()
      ]);
      // All users see all prospecting areas
      const areas = allRoutes.filter(route => route.isProspectingArea);
      
      setProspectingAreas(areas);
      setAllCompanies(companies);
    } catch (error) {
      console.error("Failed to fetch prospecting areas:", error);
      toast({ variant: "destructive", title: 'Error', description: 'Could not fetch prospecting areas.' });
    } finally {
      setLoading(false);
    }
  }, [userProfile, toast]);

  useEffect(() => {
    if (userProfile && hasAccess) {
        fetchProspectingAreas();
    }
  }, [userProfile, hasAccess, fetchProspectingAreas]);
  
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

  useEffect(() => {
    if (!selectedArea || !map || !window.google) {
        setNearbyCompanies([]);
        return;
    }
    
    const bounds = new window.google.maps.LatLngBounds();
    let hasBounds = false;

    if (selectedArea.shape?.type === 'polygon' && selectedArea.shape.paths?.[0]?.length) {
        selectedArea.shape.paths[0].forEach(path => bounds.extend(path));
        hasBounds = true;
    } else if (selectedArea.shape?.type === 'rectangle' && selectedArea.shape.bounds) {
        const rectBounds = new window.google.maps.LatLngBounds(selectedArea.shape.bounds);
        bounds.union(rectBounds);
        hasBounds = true;
    }

    if (selectedArea.streets && selectedArea.streets.length > 0) {
        selectedArea.streets.forEach(street => {
            if (street.latitude && street.longitude) {
                bounds.extend({ lat: street.latitude, lng: street.longitude });
                hasBounds = true;
            }
        });
    }

    if (selectedArea.leads && selectedArea.leads.length > 0) {
        selectedArea.leads.forEach(lead => {
            if (lead.latitude && lead.longitude) {
                bounds.extend({ lat: lead.latitude, lng: lead.longitude });
                hasBounds = true;
            }
        });
    }

    let areaCenter: google.maps.LatLng | null = null;

    if (hasBounds) {
        map.fitBounds(bounds);
        areaCenter = bounds.getCenter();
    } else if (selectedArea.leads?.length === 1 && selectedArea.leads[0].latitude && selectedArea.leads[0].longitude) {
        const center = { lat: selectedArea.leads[0].latitude, lng: selectedArea.leads[0].longitude };
        map.panTo(center);
        map.setZoom(15);
        areaCenter = new window.google.maps.LatLng(center.lat, center.lng);
    } else if (selectedArea.streets?.length === 1 && selectedArea.streets[0].latitude && selectedArea.streets[0].longitude) {
        const center = { lat: selectedArea.streets[0].latitude, lng: selectedArea.streets[0].longitude };
        map.panTo(center);
        map.setZoom(15);
        areaCenter = new window.google.maps.LatLng(center.lat, center.lng);
    }
    
    if (areaCenter) {
        const nearbyWithDistance = allCompanies
            .map(company => {
                if (!company.latitude || !company.longitude) return null;
                const companyLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
                const distance = window.google.maps.geometry.spherical.computeDistanceBetween(areaCenter!, companyLatLng);
                if (distance <= 5000) {
                    return { ...company, distance };
                }
                return null;
            })
            .filter((c): c is Lead & { distance: number } => c !== null);
        
        nearbyWithDistance.sort((a, b) => a.distance - b.distance);
        setNearbyCompanies(nearbyWithDistance);
    } else {
        setNearbyCompanies([]);
    }

  }, [selectedArea, map, allCompanies]);

  const filteredNearbyCompanies = useMemo(() => {
    if (!searchNearbyQuery) {
      return nearbyCompanies;
    }
    return nearbyCompanies.filter(company =>
      company.companyName.toLowerCase().includes(searchNearbyQuery.toLowerCase())
    );
  }, [nearbyCompanies, searchNearbyQuery]);


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
          toast({ variant: "destructive", title: 'Error', description: "Could not delete the area." });
      } finally {
          setAreaToDelete(null);
      }
  };
  
    const handleMarkAsComplete = async (area: SavedRoute) => {
        if (!area.userId || !area.id) {
            toast({ variant: 'destructive', title: 'Error', description: 'Area information is missing.' });
            return;
        }
        try {
            await updateUserRoute(area.userId, area.id, { status: 'Completed' });
            setProspectingAreas(prevAreas => 
                prevAreas.map(a => a.id === area.id ? { ...a, status: 'Completed' } : a)
            );
            toast({ title: 'Success', description: `"${area.name}" marked as complete.` });
        } catch (error) {
            console.error("Failed to mark area as complete:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update the area status.' });
        }
    };

  const handleLoadArea = useCallback((area: SavedRoute) => {
    setSelectedArea(area);
  }, []);


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
        <p className="text-muted-foreground">Review and manage designated prospecting areas across the team.</p>
      </header>

      {selectedArea && (
        <>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>{selectedArea.name}</CardTitle>
                    <CardDescription>
                        Created on {format(new Date(selectedArea.createdAt), 'PP')} by {selectedArea.userName}
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setMapTypeId(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
                        variant="outline"
                        size="sm"
                    >
                        <Satellite className="mr-2 h-4 w-4" />
                        {mapTypeId === 'roadmap' ? 'Satellite' : 'Roadmap'}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedArea(null)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
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
                  {filteredNearbyCompanies.map(company => (
                        <MarkerF
                            key={`company-${company.id}`}
                            position={{ lat: company.latitude!, lng: company.longitude! }}
                            title={company.companyName}
                            icon={{ url: hoveredCompanyId === company.id ? "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png" : "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }}
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
        {nearbyCompanies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Nearby Signed Customers ({filteredNearbyCompanies.length})</CardTitle>
                <CardDescription>Customers within a 5km radius of the prospecting area, sorted by proximity.</CardDescription>
                 <div className="pt-2">
                    <Input
                        placeholder="Search nearby customers..."
                        value={searchNearbyQuery}
                        onChange={(e) => setSearchNearbyQuery(e.target.value)}
                    />
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Franchisee</TableHead>
                        <TableHead>Distance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredNearbyCompanies.map(company => (
                        <TableRow
                            key={company.id}
                            onMouseEnter={() => setHoveredCompanyId(company.id)}
                            onMouseLeave={() => setHoveredCompanyId(null)}
                        >
                            <TableCell>{company.companyName}</TableCell>
                            <TableCell>{formatAddressDisplay(company.address as Address)}</TableCell>
                            <TableCell>{company.franchisee || 'N/A'}</TableCell>
                            <TableCell>{(company.distance / 1000).toFixed(2)} km</TableCell>
                            <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                                <Link href={`/companies/${company.id}`} target="_blank">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Profile
                                </Link>
                            </Button>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
              </CardContent>
            </Card>
        )}
      </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Saved Areas</CardTitle>
          <CardDescription>
            A list of all prospecting areas defined in the system. Select one to view it on the map.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Contents</TableHead>
                <TableHead>Status</TableHead>
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
                            <Calendar className="h-4 w-4 text-muted-foreground"/>
                            {format(new Date(area.createdAt), 'PP')}
                       </div>
                    </TableCell>
                    <TableCell>
                        {area.streets?.length || 0} streets / {area.leads?.length || 0} leads
                    </TableCell>
                    <TableCell>
                        <Badge variant={area.status === 'Completed' ? 'default' : 'outline'}>
                            {area.status || 'Active'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                            {userProfile && ['admin', 'Field Sales Admin', 'Lead Gen Admin'].includes(userProfile.role!) && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); router.push(`/leads/map?editArea=${area.id}`) }}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleMarkAsComplete(area); }}
                                disabled={area.status === 'Completed'}
                            >
                                <CheckSquare className="mr-2 h-4 w-4" />
                                Complete
                            </Button>
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleLoadArea(area)}}>
                                <MapPin className="mr-2 h-4 w-4" /> View
                            </Button>
                             {userProfile && ['admin', 'Field Sales Admin'].includes(userProfile.role!) && (
                                <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); setAreaToDelete(area)}}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                             )}
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