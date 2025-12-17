

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
import { getLeadsFromFirebase, deleteUserRoute, getAllUserRoutes, getAllUsers, moveUserRoute, getAllActivities, bulkMoveLeadsToBucket } from '@/services/firebase'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import type { Lead, LeadStatus, Note, Activity, UserProfile, SavedRoute } from '@/lib/types'
import { useEffect, useState, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserX, PlayCircle, Trash2, Route, User, Move, CheckSquare, UserPlus, Percent, TrendingUp, Search, Filter, SlidersHorizontal, X } from 'lucide-react'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox'
import { Checkbox } from '@/components/ui/checkbox'

type LeadWithDetails = Lead & { notes?: Note[], activity?: Activity[] };
type RouteWithUser = SavedRoute & { userName: string; userId: string };
const leadStatuses: LeadStatus[] = ['New', 'Priority Lead', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'Trialing ShipMate', 'Reschedule'];

interface MoveLeadDialogProps {
  leads: Lead[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLeadsMoved: () => void;
  targetBucket: 'field' | 'outbound';
}


function MoveLeadDialog({ leads, isOpen, onOpenChange, onLeadsMoved, targetBucket }: MoveLeadDialogProps) {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const { toast } = useToast();
    
    useEffect(() => {
        const fetchUsers = async () => {
            if (!isOpen) return;

            setIsLoadingUsers(true);
            const allUsers = await getAllUsers();
            const filteredUsers = allUsers.filter(u => {
                if (targetBucket === 'field') {
                    return u.role === 'Field Sales' || u.role === 'admin';
                }
                if (targetBucket === 'outbound') {
                    return u.role === 'user';
                }
                return false;
            });
            setUsers(filteredUsers);
            setIsLoadingUsers(false);
        };
        fetchUsers();
    }, [isOpen, targetBucket]);

    const handleMoveLeads = async () => {
        if (leads.length === 0 || !selectedUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select leads and a user to assign them to.' });
            return;
        }
        setIsMoving(true);
        try {
            await bulkMoveLeadsToBucket({
                leadIds: leads.map(l => l.id),
                fieldSales: targetBucket === 'field',
                assigneeDisplayName: selectedUser,
            });
            toast({ title: 'Success', description: `${leads.length} lead(s) have been moved and reassigned.` });
            onLeadsMoved();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to move leads:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not move the selected leads.' });
        } finally {
            setIsMoving(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setSelectedUser('');
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Move {leads.length} Lead(s)</DialogTitle>
                    <DialogDescription>Move selected leads to the {targetBucket === 'field' ? 'Field Sales' : 'Outbound'} bucket and reassign.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Assign To</Label>
                         <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger disabled={isLoadingUsers}>
                                <SelectValue placeholder={isLoadingUsers ? 'Loading users...' : `Select a ${targetBucket === 'field' ? 'Field Sales Rep' : 'Dialer'}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map(user => (
                                    <SelectItem key={user.uid} value={user.displayName!}>
                                        {user.displayName} ({user.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleMoveLeads} disabled={!selectedUser || isMoving}>
                        {isMoving ? <Loader/> : 'Confirm Move'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function FieldSalesPage() {
  const [allLeads, setAllLeads] = useState<LeadWithDetails[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [allRoutes, setAllRoutes] = useState<RouteWithUser[]>([]);
  const [allDialers, setAllDialers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeToMove, setRouteToMove] = useState<RouteWithUser | null>(null);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [isMovingRoute, setIsMovingRoute] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isMoveLeadDialogOpen, setIsMoveLeadDialogOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    companyName: '',
    status: [] as string[],
    franchisee: [] as string[],
  });


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
        const [leads, activities, routes, users] = await Promise.all([
            getLeadsFromFirebase({ summary: true }),
            getAllActivities(),
            userProfile?.role === 'admin' ? getAllUserRoutes() : Promise.resolve([]),
            getAllUsers(),
        ]);

        const fieldSalesLeads = leads.filter(lead => lead.fieldSales === true);
        setAllLeads(fieldSalesLeads);
        setAllActivities(activities);

        if (userProfile?.role === 'admin') {
            setAllRoutes(routes);
        }
        setAllDialers(users.filter(u => u.role === 'Field Sales' || u.role === 'admin'));
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
  
    const handleFilterChange = (filterName: keyof typeof filters, value: string | string[]) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      companyName: '',
      status: [],
      franchisee: [],
    });
  };

  const weeklyStats = useMemo(() => {
    if (userProfile?.role !== 'Field Sales' || !userProfile.displayName) return null;

    const now = new Date();
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
    
    const activitiesThisWeek = allActivities.filter(a => {
        const activityDate = new Date(a.date);
        return a.author === userProfile.displayName && activityDate >= startOfThisWeek && activityDate <= endOfThisWeek;
    });

    const checkInActivities = activitiesThisWeek.filter(a => a.notes?.includes('Checked in at location via map.'));
    const totalCheckIns = new Set(checkInActivities.map(a => a.leadId)).size;
    
    const leadsThisWeek = allLeads.filter(l => {
        return checkInActivities.some(a => a.leadId === l.id);
    });
    
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
  
  const filteredMyLeads = useMemo(() => {
    if (!userProfile?.displayName) return [];
    
    let leads = allLeads.filter(lead => 
      lead.dialerAssigned === userProfile.displayName &&
      !['Lost', 'Qualified', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate', 'Won'].includes(lead.status) &&
      lead.fieldSales === true
    );

    if (filters.companyName) {
      leads = leads.filter(lead => lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase()));
    }
    if (filters.status.length > 0) {
      leads = leads.filter(lead => filters.status.includes(lead.status));
    }
    if (filters.franchisee.length > 0) {
      leads = leads.filter(lead => lead.franchisee && filters.franchisee.includes(lead.franchisee));
    }

    return leads;
  }, [allLeads, userProfile, filters]);


  const groupedMyLeads = useMemo(() => {
    return filteredMyLeads.reduce((acc, lead) => {
      const status = lead.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(lead);
      return acc;
    }, {} as Record<string, LeadWithDetails[]>);
  }, [filteredMyLeads]);
  
  const groupedAllAssignedLeads = useMemo(() => {
    if (userProfile?.role !== 'admin') return {};
    
    let relevantLeads = allLeads.filter(lead => lead.fieldSales === true);

    if (filters.companyName) {
      relevantLeads = relevantLeads.filter(lead => lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase()));
    }
    if (filters.status.length > 0) {
      relevantLeads = relevantLeads.filter(lead => filters.status.includes(lead.status));
    }
    if (filters.franchisee.length > 0) {
      relevantLeads = relevantLeads.filter(lead => lead.franchisee && filters.franchisee.includes(lead.franchisee));
    }
      
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
  }, [allLeads, userProfile, filters]);

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

  const handleSelectLead = (leadId: string, checked: boolean) => {
    setSelectedLeads(prev => 
        checked ? [...prev, leadId] : prev.filter(id => id !== leadId)
    );
  };
  
  const openMoveLeadsDialog = () => {
    const leads = allLeads.filter(l => selectedLeads.includes(l.id));
    // Here you can set the leads to be moved and open the dialog
    // For now, let's just log it
    console.log("Moving leads:", leads);
    setIsMoveLeadDialogOpen(true);
  };

  const routesToShow = userProfile?.role === 'admin' ? allRoutes : savedRoutes;
  const leadStatusOptions: Option[] = leadStatuses.map(s => ({ value: s, label: s })).sort((a, b) => a.label.localeCompare(b.label));
  const uniqueFranchisees: Option[] = useMemo(() => {
    const franchisees = new Set(allLeads.map(lead => lead.franchisee).filter(Boolean));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allLeads]);
  const hasActiveFilters = filters.companyName !== '' || filters.status.length > 0 || filters.franchisee.length > 0;

  if (loading || authLoading || !userProfile) {
    return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader /></div>;
  }
  
  return (
    <div className="flex flex-col gap-6">
      <MoveLeadDialog
        leads={allLeads.filter(l => selectedLeads.includes(l.id))}
        isOpen={isMoveLeadDialogOpen}
        onOpenChange={setIsMoveLeadDialogOpen}
        onLeadsMoved={() => {
            fetchData(); // Refresh data after moving
            setSelectedLeads([]);
        }}
        targetBucket="outbound" // We are moving from field sales to outbound
    />
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

      <Collapsible>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    <span>Filters</span>
                </CardTitle>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="ml-2">Toggle Filters</span>
                    </Button>
                </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input id="companyName" value={filters.companyName} onChange={(e) => handleFilterChange('companyName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <MultiSelectCombobox
                            options={leadStatusOptions}
                            selected={filters.status}
                            onSelectedChange={(selected) => handleFilterChange('status', selected)}
                            placeholder="Select statuses..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="franchisee">Franchisee</Label>
                         <MultiSelectCombobox
                            options={uniqueFranchisees}
                            selected={filters.franchisee}
                            onSelectedChange={(selected) => handleFilterChange('franchisee', selected)}
                            placeholder="Select franchisees..."
                        />
                    </div>
                </CardContent>
                {hasActiveFilters && (
                    <CardContent>
                        <Button variant="ghost" onClick={clearFilters}>
                            <X className="mr-2 h-4 w-4" /> Clear Filters
                        </Button>
                    </CardContent>
                )}
            </CollapsibleContent>
        </Card>
      </Collapsible>

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
                <div className="flex items-center gap-2">
                   {selectedLeads.length > 0 && (
                      <Button size="sm" variant="outline" onClick={openMoveLeadsDialog}>
                         <Move className="h-4 w-4 mr-2" /> Move to Outbound ({selectedLeads.length})
                      </Button>
                   )}
                </div>
            </div>
        </CardHeader>
        <CardContent>
         {filteredMyLeads.length > 0 ? (
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
                  </div>
                  <AccordionContent className="pt-2">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">
                                <Checkbox
                                    checked={leads.length > 0 && leads.every(l => selectedLeads.includes(l.id))}
                                    onCheckedChange={(checked) => {
                                        const leadIds = leads.map(l => l.id);
                                        setSelectedLeads(prev => checked ? [...new Set([...prev, ...leadIds])] : prev.filter(id => !leadIds.includes(id)));
                                    }}
                                />
                            </TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead className="hidden sm:table-cell">Franchisee</TableHead>
                            <TableHead className="hidden md:table-cell">Industry</TableHead>
                            <TableHead className="w-[120px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leads.map((lead) => (
                            <Fragment key={lead.id}>
                              <TableRow data-state={selectedLeads.includes(lead.id) && "selected"}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedLeads.includes(lead.id)}
                                        onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                                    />
                                </TableCell>
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
              {hasActiveFilters ? 'No leads match your search/filters.' : 'You have no actionable field sales leads assigned.'}
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

