
"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getLeadsFromFirebase, deleteUserRoute, getAllUserRoutes, getAllUsers, moveUserRoute, getAllActivities } from '@/services/firebase'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import type { Lead, LeadStatus, Note, Activity, UserProfile, SavedRoute } from '@/lib/types'
import { useEffect, useState, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserX, PlayCircle, Trash2, Route, User, Move, CheckSquare, UserPlus, Percent, TrendingUp, Search } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { useToast } from '@/hooks/use-toast'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { startOfWeek, endOfWeek } from 'date-fns'

type LeadWithDetails = Lead & { notes?: Note[], activity?: Activity[] };
type RouteWithUser = SavedRoute & { userName: string; userId: string };

export default function FieldSalesPage() {
  const [allLeads, setAllLeads] = useState<LeadWithDetails[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [allRoutes, setAllRoutes] = useState<RouteWithUser[]>([]);
  const [allDialers, setAllDialers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeToMove, setRouteToMove] = useState<RouteWithUser | null>(null);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [isMovingRoute, setIsMovingRoute] = useState(false);
  const [myLeadsSearchQuery, setMyLeadsSearchQuery] = useState('');


  const router = useRouter();
  const { user, userProfile, loading: authLoading, savedRoutes, setSavedRoutes } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && (!userProfile?.role || !['admin', 'Field Sales'].includes(userProfile.role))) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      if (userProfile?.role === 'admin') {
          const [leads, routes, users, activities] = await Promise.all([
              getLeadsFromFirebase({ summary: true }), // Fetch all leads for admin
              getAllUserRoutes(),
              getAllUsers(),
              getAllActivities(),
          ]);
          setAllLeads(leads);
          setAllActivities(activities);
          setAllRoutes(routes);
          setAllDialers(users.filter(u => u.role === 'Field Sales' || u.role === 'admin'));
      } else if (userProfile?.displayName) {
          const [leads, activities] = await Promise.all([
             getLeadsFromFirebase({ dialerAssigned: userProfile.displayName }),
             getAllActivities()
          ]);
          setAllLeads(leads);
          setAllActivities(activities);
      }
    } catch (error) {
      console.error("Failed to fetch field sales data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch dashboard data.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [userProfile]);
  
  const weeklyStats = useMemo(() => {
    if (userProfile?.role !== 'Field Sales' || !userProfile.displayName) return null;

    const now = new Date();
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });

    const leadsThisWeek = allLeads.filter(l => {
        const activityDate = l.activity?.[0]?.date ? new Date(l.activity[0].date) : null;
        return activityDate && activityDate >= startOfThisWeek && activityDate <= endOfThisWeek;
    });
    
    const activitiesThisWeek = allActivities.filter(a => {
        const activityDate = new Date(a.date);
        return a.author === userProfile.displayName && activityDate >= startOfThisWeek && activityDate <= endOfThisWeek;
    });

    const checkInActivities = activitiesThisWeek.filter(a => a.notes?.includes('Checked in at location via map.'));
    const totalCheckIns = new Set(checkInActivities.map(a => a.leadId)).size;
    
    const signedUpLeads = leadsThisWeek.filter(l => l.dialerAssigned === userProfile.displayName && l.status === 'Won');
    const trialingLeads = leadsThisWeek.filter(l => l.dialerAssigned === userProfile.displayName && l.status === 'Trialing ShipMate');
    
    const totalSignups = signedUpLeads.length;
    const totalTrials = trialingLeads.length;
    
    const conversionRate = totalCheckIns > 0 ? ((totalSignups + totalTrials) / totalCheckIns) * 100 : 0;

    return {
      totalCheckIns,
      totalSignups,
      totalTrials,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
    };
  }, [allLeads, allActivities, userProfile]);

  const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  const myLeads = useMemo(() => {
    if (user?.displayName) {
      const actionableLeads = allLeads.filter(lead => 
        (lead as any).fieldSales === true &&
        lead.dialerAssigned === user.displayName && 
        !['Lost', 'Qualified', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate', 'Won'].includes(lead.status)
      );

      if (!myLeadsSearchQuery) {
        return actionableLeads;
      }
      return actionableLeads.filter(lead => lead.companyName.toLowerCase().includes(myLeadsSearchQuery.toLowerCase()));
    }
    return [];
  }, [allLeads, user, myLeadsSearchQuery]);

  const groupedMyLeads = useMemo(() => {
    return myLeads.reduce((acc, lead) => {
      const status = lead.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(lead);
      return acc;
    }, {} as Record<string, LeadWithDetails[]>);
  }, [myLeads]);
  
  const groupedAllAssignedLeads = useMemo(() => {
    if (userProfile?.role !== 'admin') return {};
    
    const relevantLeads = allLeads.filter(lead => 
        (lead as any).fieldSales === true && 
        lead.dialerAssigned &&
        lead.dialerAssigned !== userProfile.displayName
    );
      
    return relevantLeads.reduce((acc, lead) => {
        const dialer = lead.dialerAssigned || 'Unassigned';
        if (!acc[dialer]) {
            acc[dialer] = {};
        }
        const status = lead.status;
        if (!acc[dialer][status]) {
            acc[dialer][status] = [];
        }
        acc[dialer][status].push(lead);
        return acc;
    }, {} as Record<string, Record<string, Lead[]>>);
  }, [allLeads, userProfile]);

  const handleStartDialing = (leads: LeadWithDetails[], startingFromLeadId?: string) => {
    let sortedLeadIds = leads.map(l => l.id);
    if (startingFromLeadId) {
      const startIndex = sortedLeadIds.indexOf(startingFromLeadId);
      if (startIndex !== -1) {
        sortedLeadIds = [...sortedLeadIds.slice(startIndex), ...sortedLeadIds.slice(0, startIndex)];
      }
    }
    localStorage.setItem('dialingSessionLeads', JSON.stringify(sortedLeadIds));
    router.push(`/leads/${sortedLeadIds[0]}`);
  };

  const handleLoadRoute = (route: SavedRoute) => {
    const leadIds = route.leads.map(l => l.id);
    localStorage.setItem('dialingSessionLeads', JSON.stringify(leadIds));
    router.push(`/leads/map`);
    toast({ title: 'Route Loaded', description: `Route "${route.name}" is now active on the map.` });
  };

  const handleStartRoute = (route: SavedRoute) => {
    if (!route.directions) {
        toast({ variant: 'destructive', title: 'Cannot Start Route', description: 'No directions available for this route.' });
        return;
    }
    const directionsData = route.directions as any; // Cast to access nested properties
    const origin = 'Current+Location';
    const destination = directionsData.routes[0].legs.slice(-1)[0].end_address;
    const waypoints = directionsData.routes[0].legs
        .slice(0, -1) // All legs except the last one
        .map((leg: any) => leg.end_address)
        .join('|');

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(waypoints)}&travelmode=${route.travelMode?.toLowerCase()}`;
    window.open(mapsUrl, '_blank');
  };

  const handleDeleteRoute = async (route: RouteWithUser) => {
    const routeOwner = allDialers.find(d => d.displayName === route.userName);
    if (!routeOwner?.uid || !route.id) return;
    await deleteUserRoute(routeOwner.uid, route.id);
    if(userProfile?.role === 'admin') {
      setAllRoutes(prev => prev.filter(r => r.id !== route.id));
    } else {
      setSavedRoutes(prev => prev.filter(r => r.id !== route.id));
    }
    toast({ title: 'Route Deleted', description: `Route "${route.name}" has been removed.` });
  };

  const handleMoveRoute = async () => {
    if (!routeToMove || !targetUserId || !userProfile?.uid) return;
    setIsMovingRoute(true);
    try {
        await moveUserRoute(routeToMove.userId, targetUserId, routeToMove.id!);
        toast({ title: 'Route Moved', description: `Route "${routeToMove.name}" has been moved successfully.` });
        fetchData(); // Refetch all data to reflect the change
        setRouteToMove(null);
        setTargetUserId('');
    } catch (error) {
        console.error("Failed to move route:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not move the route.' });
    } finally {
        setIsMovingRoute(false);
    }
  };


  if (loading || authLoading || !userProfile) {
    return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader /></div>;
  }
  
  const routesToShow = userProfile.role === 'admin' ? allRoutes : savedRoutes;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Field Sales Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {userProfile.firstName}.</p>
      </header>

      {userProfile.role === 'Field Sales' && weeklyStats && (
        <Card>
            <CardHeader>
                <CardTitle>This Week's Performance</CardTitle>
                <CardDescription>Metrics from {startOfWeek(new Date(), { weekStartsOn: 1 }).toLocaleDateString()} to {endOfWeek(new Date(), { weekStartsOn: 1 }).toLocaleDateString()}.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Check-ins" value={weeklyStats.totalCheckIns} icon={CheckSquare} />
                <StatCard title="New Signups" value={weeklyStats.totalSignups} icon={UserPlus} />
                <StatCard title="New Free Trials" value={weeklyStats.totalTrials} icon={TrendingUp} />
                <StatCard title="Visit Conversion Rate" value={`${weeklyStats.conversionRate}%`} icon={Percent} />
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Route className="h-5 w-5"/> Saved Routes</CardTitle>
        </CardHeader>
        <CardContent>
          {routesToShow.length > 0 ? (
            <div className="space-y-2">
              {routesToShow.map(route => (
                <Card key={route.id} className="p-3">
                  {userProfile.role === 'admin' ? (
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <p className="font-semibold">{route.name}</p>
                            <p className="text-xs text-muted-foreground">{route.leads.length} stops &bull; Created on {new Date(route.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3"/> {(route as RouteWithUser).userName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setRouteToMove(route as RouteWithUser)}>
                            <Move className="mr-2 h-4 w-4" /> Move
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteRoute(route as RouteWithUser)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                     </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{route.name}</p>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleLoadRoute(route)}>Load on Map</Button>
                        <Button size="sm" variant="default" onClick={() => handleStartRoute(route)}>Start</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteRoute(route as RouteWithUser)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-10">You have no saved routes. Create one from the Territory Map.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle>My Assigned Leads</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search my leads..."
                      className="pl-9"
                      value={myLeadsSearchQuery}
                      onChange={(e) => setMyLeadsSearchQuery(e.target.value)}
                    />
                  </div>
            </div>
        </CardHeader>
        <CardContent>
         {myLeads.length > 0 ? (
            <Accordion type="multiple" defaultValue={['New', 'Priority Lead']} className="w-full space-y-2">
              {Object.entries(groupedMyLeads).sort(([statusA], [statusB]) => statusA.localeCompare(statusB)).map(([status, leads]) => (
                <AccordionItem value={status} key={status}>
                  <div className="bg-muted px-4 rounded-md flex items-center justify-between">
                    <AccordionTrigger className="py-2 flex-1">
                      <div className="flex items-center gap-2">
                        <LeadStatusBadge status={status as LeadStatus} />
                        <Badge>{leads.length} Leads</Badge>
                      </div>
                    </AccordionTrigger>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartDialing(leads);
                      }}
                      className="ml-4 bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Start Session
                    </Button>
                  </div>
                  <AccordionContent className="pt-2">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead className="hidden sm:table-cell">Franchisee</TableHead>
                            <TableHead className="hidden md:table-cell">Industry</TableHead>
                            <TableHead className="w-[120px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leads.map((lead) => (
                            <Fragment key={lead.id}>
                              <TableRow>
                                <TableCell>
                                  <Button variant="link" className="p-0 h-auto text-left" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>{lead.companyName}</Button>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">{lead.franchisee ?? 'N/A'}</TableCell>
                                <TableCell className="hidden md:table-cell">{lead.industryCategory}</TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>View Lead</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStartDialing(leads, lead.id)}>Start session from here</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            </Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              {myLeadsSearchQuery ? 'No leads match your search.' : 'You have no actionable leads assigned.'}
            </div>
          )}
        </CardContent>
      </Card>
      
       {userProfile?.role === 'admin' && (
          <Card>
            <CardHeader>
                <CardTitle>All Assigned Field Sales Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(groupedAllAssignedLeads).length > 0 ? (
                 <Accordion type="multiple" className="w-full space-y-4">
                    {Object.entries(groupedAllAssignedLeads).sort(([dialerA], [dialerB]) => dialerA.localeCompare(dialerB)).map(([dialer, statusGroups]) => (
                        <AccordionItem value={dialer} key={dialer}>
                           <AccordionTrigger className="bg-muted px-4 rounded-md">
                                <div className="flex items-center gap-2 font-semibold">
                                    <User className="h-5 w-5" />
                                    <span>{dialer}</span>
                                    <Badge>{Object.values(statusGroups).flat().length} Leads</Badge>
                                </div>
                            </AccordionTrigger>
                             <AccordionContent className="pt-2">
                                <Accordion type="multiple" className="w-full space-y-2" defaultValue={Object.keys(statusGroups)}>
                                    {Object.entries(statusGroups).map(([status, leads]) => (
                                        <AccordionItem value={`${dialer}-${status}`} key={`${dialer}-${status}`}>
                                            <AccordionTrigger className="bg-secondary/50 px-4 rounded-md text-sm">
                                                <div className="flex items-center gap-2">
                                                    <LeadStatusBadge status={status as LeadStatus} />
                                                    <Badge variant="outline">{leads.length} Leads</Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-2">
                                                <Table>
                                                    <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Franchisee</TableHead><TableHead>Industry</TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                        {leads.map(lead => (
                                                            <TableRow key={lead.id}><TableCell><Button variant="link" className="p-0 h-auto" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>{lead.companyName}</Button></TableCell><TableCell>{lead.franchisee ?? 'N/A'}</TableCell><TableCell>{lead.industryCategory}</TableCell></TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                 </Accordion>
              ) : (
                 <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">No other field sales leads are currently assigned.</div>
              )}
            </CardContent>
          </Card>
      )}
      
       <Dialog open={!!routeToMove} onOpenChange={(open) => !open && setRouteToMove(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Move Route</DialogTitle>
                    <DialogDescription>
                        Move the route "{routeToMove?.name}" from {(routeToMove as RouteWithUser)?.userName} to another user.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="target-user">New Owner</Label>
                     <Select onValueChange={setTargetUserId}>
                        <SelectTrigger id="target-user">
                            <SelectValue placeholder="Select a new user" />
                        </SelectTrigger>
                        <SelectContent>
                            {allDialers
                                .filter(d => d.uid !== (routeToMove as RouteWithUser)?.userId)
                                .map(d => (
                                <SelectItem key={d.uid} value={d.uid}>{d.displayName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setRouteToMove(null)}>Cancel</Button>
                    <Button onClick={handleMoveRoute} disabled={isMovingRoute || !targetUserId}>
                        {isMovingRoute ? <Loader /> : 'Confirm Move'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

    