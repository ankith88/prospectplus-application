
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { SavedRoute, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar, User, LayoutGrid, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { getAllUserRoutes } from '@/services/firebase';

type ProspectingArea = SavedRoute & {
  userName: string;
};

export default function ProspectingAreasPage() {
  const [prospectingAreas, setProspectingAreas] = useState<ProspectingArea[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();

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
            };
        }).filter((area): area is ProspectingArea => area !== null);
        
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
  
  const handleLoadRoute = (routeId: string) => {
    localStorage.setItem('activeRouteId', routeId);
    router.push(`/leads/map?routeId=${routeId}`);
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
        <h1 className="text-3xl font-bold tracking-tight">Prospecting Areas</h1>
        <p className="text-muted-foreground">Manage and review assigned prospecting areas.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Areas</CardTitle>
          <CardDescription>
            Showing {prospectingAreas.length} area(s).
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
                  <TableRow key={area.id}>
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
                        <Button variant="outline" size="sm" onClick={() => handleLoadRoute(area.id!)}>
                            <MapPin className="mr-2 h-4 w-4" /> Load on Map
                        </Button>
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
    </div>
  );
}
