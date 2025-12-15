
"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getLeadsFromFirebase, deleteUserRoute, updateLeadDialerRep } from '@/services/firebase'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import type { Lead, LeadStatus, Note, Activity, UserProfile, SavedRoute } from '@/lib/types'
import { useEffect, useState, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserX, History, PlayCircle, Trash2, Route, Car, Footprints, Bike } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { useToast } from '@/hooks/use-toast'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

type LeadWithDetails = Lead & { notes?: Note[], activity?: Activity[] };

export default function FieldSalesPage() {
  const [allLeads, setAllLeads] = useState<LeadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, userProfile, loading: authLoading, savedRoutes, setSavedRoutes } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && (!userProfile?.role || userProfile.role !== 'Field Sales')) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const leads = await getLeadsFromFirebase({ dialerAssigned: userProfile?.displayName });
      setAllLeads(leads);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch assigned leads.' });
    } finally {
      setLoading(false);
    }
  }

  const myLeads = useMemo(() => {
    if (user?.displayName) {
      return allLeads.filter(lead => lead.dialerAssigned === user.displayName && !['Lost', 'Qualified', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate', 'Won'].includes(lead.status));
    }
    return [];
  }, [allLeads, user]);

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
    const myLocation = `${userProfile?.latitude},${userProfile?.longitude}`;
    const firstStop = route.directions.routes[0].legs[0].end_location;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${myLocation}&destination=${firstStop.lat()},${firstStop.lng()}&travelmode=${route.travelMode?.toLowerCase()}`;
    window.open(mapsUrl, '_blank');
  };

  const handleDeleteRoute = async (routeId: string, routeName: string) => {
    if (!userProfile?.uid) return;
    await deleteUserRoute(userProfile.uid, routeId);
    setSavedRoutes(prev => prev.filter(route => route.id !== routeId));
    toast({ title: 'Route Deleted', description: `Route "${routeName}" has been removed.` });
  };


  if (loading || authLoading || !userProfile) {
    return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Field Sales Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {userProfile.firstName}. Here are your routes and assigned leads.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Route className="h-5 w-5"/> My Saved Routes</CardTitle>
        </CardHeader>
        <CardContent>
          {savedRoutes.length > 0 ? (
            <div className="space-y-2">
              {savedRoutes.map(route => (
                <Card key={route.id} className="p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-semibold">{route.name}</p>
                      <p className="text-xs text-muted-foreground">{route.leads.length} stops &bull; Created on {new Date(route.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleLoadRoute(route)}>Load on Map</Button>
                      <Button size="sm" variant="default" onClick={() => handleStartRoute(route)}>Start</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteRoute(route.id!, route.name)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
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
          <CardTitle>My Assigned Leads</CardTitle>
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
              You have no actionable leads assigned.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
