
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { SavedRoute, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Clock, Route, Calendar, User, MapPin, Play, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { getAllUserRoutes, getAllUsers, deleteUserRoute } from '@/services/firebase';
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


export default function SavedRoutesPage() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userProfile, loading: authLoading, savedRoutes, setSavedRoutes } = useAuth();
  const { toast } = useToast();

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
        if (userProfile.role === 'admin' || userProfile.role === 'Field Sales Admin') {
          const allUsers = await getAllUsers();
          const allRoutesData = await getAllUserRoutes();
          const usersMap = new Map(allUsers.map(u => [u.uid, u.displayName]));
          const routesWithUser = allRoutesData.map(r => ({
              ...r,
              userName: usersMap.get((r as any).userId) || 'Unknown User'
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

  const handleLoadRoute = (route: SavedRoute) => {
    if (!route.id) return;
    localStorage.setItem('activeRouteId', route.id);
    router.push(`/leads/map`);
    toast({ title: 'Route Loaded', description: `Route "${route.name}" is now active on the map.` });
  };
  
  const handleStartRoute = (route: SavedRoute) => {
    if (!route.directions) {
        toast({ variant: 'destructive', title: 'Cannot Start Route', description: 'No directions available for this route.' });
        return;
    }
    const directionsData = route.directions as any;
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


  if (loading || authLoading || !hasAccess) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route Name</TableHead>
                { (userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && <TableHead>User</TableHead> }
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Total Distance</TableHead>
                <TableHead>Total Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.length > 0 ? (
                routes.map(route => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.name}</TableCell>
                     { (userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && <TableCell>{(route as any).userName || 'N/A'}</TableCell> }
                    <TableCell>
                        {route.scheduledDate ? (
                           <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground"/>
                                {format(new Date(route.scheduledDate), 'PP')}
                           </div>
                        ) : 'N/A'}
                    </TableCell>
                    <TableCell>{route.leads.length}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                           <MapPin className="h-4 w-4 text-muted-foreground"/>
                           {route.totalDistance || 'N/A'}
                        </div>
                    </TableCell>
                    <TableCell>
                         <div className="flex items-center gap-2">
                           <Clock className="h-4 w-4 text-muted-foreground"/>
                           {route.totalDuration || 'N/A'}
                        </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleLoadRoute(route)} disabled={userProfile?.role !== 'admin' && (route as any).userId !== userProfile?.uid && userProfile?.uid !== 'ncyhwLtOG1W7TZ43PkYCcObeCAf2'}>
                        <Route className="mr-2 h-4 w-4" /> Load
                      </Button>
                       <Button size="sm" variant="default" onClick={() => handleStartRoute(route)} disabled={!route.directions}>
                        <Play className="mr-2 h-4 w-4" /> Start
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4" /></Button>
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
        </CardContent>
      </Card>
    </div>
  );
}
