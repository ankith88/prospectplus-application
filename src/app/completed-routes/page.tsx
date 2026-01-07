
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { SavedRoute, Activity, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Clock, Route, Calendar, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { getAllUserRoutes, getAllActivities, getAllUsers } from '@/services/firebase';

type CompletedRoute = SavedRoute & {
  completedAt: string;
  userName: string;
};

export default function CompletedRoutesPage() {
  const [completedRoutes, setCompletedRoutes] = useState<CompletedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();

  const hasAccess = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin'].includes(userProfile.role);

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, hasAccess]);

  useEffect(() => {
    if (!userProfile) return;

    const fetchCompletedRoutes = async () => {
      setLoading(true);
      try {
        const [allRoutes, allCheckIns, allUsers] = await Promise.all([
          getAllUserRoutes(),
          getAllActivities(true), // Fetch only check-in activities
          getAllUsers(),
        ]);

        const usersMap = new Map(allUsers.map(u => [u.uid, u.displayName]));

        const checkInsByLead = allCheckIns.reduce((acc, activity) => {
          if (!acc[activity.leadId]) {
            acc[activity.leadId] = [];
          }
          acc[activity.leadId].push(new Date(activity.date).getTime());
          return acc;
        }, {} as Record<string, number[]>);
        
        let routesToProcess = allRoutes;
        
        if(userProfile.role === 'Field Sales') {
            routesToProcess = allRoutes.filter(route => route.userId === userProfile.uid);
        }

        const completed = routesToProcess.map(route => {
          if (route.leads.length === 0) return null;

          let lastCheckInTime = 0;
          const allLeadsVisited = route.leads.every(lead => {
            const visitTimes = checkInsByLead[lead.id];
            if (!visitTimes) return false;

            const routeCreationTime = new Date(route.createdAt).getTime();
            const lastVisit = Math.max(...visitTimes.filter(t => t > routeCreationTime));
            
            if (lastVisit > lastCheckInTime) {
                lastCheckInTime = lastVisit;
            }
            return lastVisit > routeCreationTime;
          });

          if (allLeadsVisited) {
            return {
              ...route,
              completedAt: new Date(lastCheckInTime).toISOString(),
              userName: usersMap.get(route.userId) || 'Unknown User',
            };
          }
          return null;
        }).filter((route): route is CompletedRoute => route !== null);
        
        completed.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        setCompletedRoutes(completed);

      } catch (error) {
        console.error("Failed to fetch completed routes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedRoutes();
  }, [userProfile]);

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
        <h1 className="text-3xl font-bold tracking-tight">Completed Routes</h1>
        <p className="text-muted-foreground">A history of all fully visited field sales routes.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Route History</CardTitle>
          <CardDescription>
            Showing {completedRoutes.length} completed route(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route Name</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Completion Date</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Total Distance</TableHead>
                <TableHead>Total Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedRoutes.length > 0 ? (
                completedRoutes.map(route => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.name}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                           <User className="h-4 w-4 text-muted-foreground"/>
                           {route.userName}
                        </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground"/>
                            {format(new Date(route.completedAt), 'PPpp')}
                       </div>
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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No completed routes found.
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
