

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
import { getLeadsFromFirebase, deleteUserRoute, getAllUserRoutes, getAllUsers, moveUserRoute, getAllActivities, bulkMoveLeadsToBucket, bulkUpdateLeadDialerRep, deleteLead, getAllAppointments, updateUserRoute } from '@/services/firebase'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import type { Lead, LeadStatus, Note, Activity, UserProfile, SavedRoute, Appointment, MapLead } from '@/lib/types'
import { useEffect, useState, useMemo, Fragment, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserX, Trash2, Route, User, Move, CheckSquare, UserPlus, Percent, TrendingUp, Search, Filter, SlidersHorizontal, X, UserCog, Download, PlusCircle, Calendar } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { useToast } from '@/hooks/use-toast'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { startOfWeek, endOfWeek, format, isToday, isThisWeek, isPast } from 'date-fns'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

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
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allDialers, setAllDialers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeToMove, setRouteToMove] = useState<RouteWithUser | null>(null);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [isMovingRoute, setIsMovingRoute] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isMoveLeadDialogOpen, setIsMoveLeadDialogOpen] = useState(false);
  const [leadsToMove, setLeadsToMove] = useState<Lead[]>([]);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [reassignToUsers, setReassignToUsers] = useState<string[]>([]);
  const [leadsToDelete, setLeadsToDelete] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingRoute, setIsUpdatingRoute] = useState<string | null>(null);


  
  const [filters, setFilters] = useState({
    companyName: '',
    status: [] as string[],
    franchisee: [] as string[],
  });


  const router = useRouter();
  const { user, userProfile, loading: authLoading, savedRoutes, setSavedRoutes } = useAuth();
  const { toast } = useToast();

  const hasAccess = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin'].includes(userProfile.role);

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, hasAccess]);
  
 const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const [leads, activities, users, routes, appointments] = await Promise.all([
            getLeadsFromFirebase({ summary: true }),
            getAllActivities(),
            getAllUsers(),
            (userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') ? getAllUserRoutes() : Promise.resolve([]),
            getAllAppointments(),
        ]);

        const fieldSalesLeads = leads.filter(lead => lead.fieldSales === true);
        setAllLeads(fieldSalesLeads);
        setAllActivities(activities);
        setAllAppointments(appointments);
        if (userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') {
            setAllRoutes(routes);
        }
        setAllDialers(users.filter(u => u.role === 'Field Sales' || u.role === 'admin' || u.role === 'Field Sales Admin'));
    } catch (error) {
      console.error("Failed to fetch field sales data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch dashboard data.' });
    } finally {
      setLoading(false);
    }
  }, [userProfile, toast]);

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [userProfile, fetchData]);
  
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
    if (!userProfile || userProfile.role !== 'Field Sales' || !userProfile.displayName) return null;

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
      !['Lost', 'Qualified', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate', 'Won', 'LocalMile Pending'].includes(lead.status) &&
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
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'Field Sales Admin') return {};
    
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
  
  const scheduledRevisits = useMemo(() => {
    const revisits = allAppointments.filter(appt => appt.revisit);
    
    let userRevisits = revisits;
    // If not an admin, filter to only show revisits for leads assigned to the current user
    if (userProfile?.role === 'Field Sales') {
        userRevisits = revisits.filter(appt => {
            const lead = allLeads.find(l => l.id === appt.leadId);
            return lead?.dialerAssigned === userProfile.displayName;
        });
    }

    return userRevisits
        .map(appt => {
            const lead = allLeads.find(l => l.id === appt.leadId);
            return lead ? { ...appt, lead } : null;
        })
        .filter(Boolean) as (Appointment & { lead: Lead })[];
  }, [allAppointments, allLeads, userProfile]);

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
    if(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') {
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
    setLeadsToMove(leads);
    setIsMoveLeadDialogOpen(true);
  };

  const handleBulkReassign = async () => {
    if (selectedLeads.length === 0 || reassignToUsers.length === 0) return;
    try {
        await bulkUpdateLeadDialerRep(selectedLeads, reassignToUsers);
        
        toast({ title: "Success", description: `${selectedLeads.length} lead(s) randomly reassigned to ${reassignToUsers.length} user(s).` });
        fetchData(); // Refresh data
    } catch (error) {
        console.error("Failed to bulk reassign leads:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to reassign leads." });
    } finally {
        setSelectedLeads([]);
        setReassignToUsers([]);
        setIsReassignDialogOpen(false);
    }
  };

  const handleReassignUserSelect = (checked: boolean, userId: string) => {
    setReassignToUsers(prev => 
        checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
  };

  const confirmDelete = (ids: string[]) => {
    if (ids.length > 0) {
        setLeadsToDelete(ids);
    }
  };

  const handleDelete = async () => {
    if (leadsToDelete.length === 0) return;
    setIsDeleting(true);
    try {
        await deleteLead(leadsToDelete);
        toast({ title: 'Success', description: `${leadsToDelete.length} lead(s) have been permanently deleted.` });
        fetchData();
        setSelectedLeads([]);
    } catch (error) {
        console.error("Failed to delete leads:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the selected leads.' });
    } finally {
        setIsDeleting(false);
        setLeadsToDelete([]);
    }
  };

  const handleAddLeadToRoute = async (leadToAdd: Lead, route: SavedRoute) => {
    if (!route || !route.id || !userProfile?.uid) return;

    setIsUpdatingRoute(route.id);
    const updatedLeads = [...route.leads, { id: leadToAdd.id, companyName: leadToAdd.companyName, latitude: leadToAdd.latitude!, longitude: leadToAdd.longitude!, address: leadToAdd.address! }];

    if (updatedLeads.length < 2) {
      await updateUserRoute(userProfile.uid, route.id, { leads: updatedLeads });
      setSavedRoutes(prev => prev.map(r => r.id === route.id ? {...r, leads: updatedLeads, directions: null} : r));
      toast({ title: 'Lead Added', description: 'Route updated. Recalculate directions on map page.' });
      setIsUpdatingRoute(null);
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    const waypoints = updatedLeads.map(l => ({ location: { lat: l.latitude, lng: l.longitude }, stopover: true }));
    const origin = route.startPoint ? (await geocodeAddress(route.startPoint)) || waypoints[0].location : waypoints[0].location;
    const destination = route.endPoint ? (await geocodeAddress(route.endPoint)) || waypoints[waypoints.length-1].location : origin;
    
    directionsService.route(
        {
            origin,
            destination,
            waypoints: waypoints.slice(1,-1),
            optimizeWaypoints: true,
            travelMode: route.travelMode!,
        },
        async (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                await updateUserRoute(userProfile.uid, route.id!, { leads: updatedLeads, directions: JSON.stringify(result) });
                setSavedRoutes(prev => prev.map(r => r.id === route.id ? {...r, leads: updatedLeads, directions: result} : r));
                toast({ title: 'Lead Added & Route Updated', description: `Directions for "${route.name}" have been recalculated.` });
            } else {
                toast({ variant: 'destructive', title: 'Route Update Failed', description: 'Could not recalculate directions. Lead was added but route needs manual update.' });
                 await updateUserRoute(userProfile.uid, route.id!, { leads: updatedLeads });
                 setSavedRoutes(prev => prev.map(r => r.id === route.id ? {...r, leads: updatedLeads, directions: null} : r));
            }
            setIsUpdatingRoute(null);
        }
    );
  };
  
    const geocodeAddress = useCallback(async (address: string): Promise<google.maps.LatLng | null> => {
        const geocoder = new window.google.maps.Geocoder();
        return new Promise((resolve) => {
            geocoder.geocode({ address, componentRestrictions: { country: 'AU' } }, (results, status) => {
                if (status === 'OK' && results?.[0]?.geometry.location) {
                    resolve(results[0].geometry.location);
                } else {
                    resolve(null);
                }
            });
        });
    }, []);


  const routesToShow = useMemo(() => {
    if (userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin' && userProfile?.uid) {
        const usersMap = new Map(allDialers.map(user => [user.uid, user.displayName]));
        const allSystemRoutes = new Map<string, RouteWithUser>();
        allRoutes.forEach(route => {
            const userName = usersMap.get(route.userId) || 'Unknown User';
            allSystemRoutes.set(route.id, { ...route, userName });
        });
        savedRoutes.forEach(route => {
            allSystemRoutes.set(route.id, {
                ...route,
                userName: userProfile.displayName || 'Admin',
                userId: userProfile.uid,
            });
        });
        return Array.from(allSystemRoutes.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return savedRoutes.map(r => ({ ...r, userName: userProfile?.displayName || '', userId: userProfile?.uid || '' }));
  }, [userProfile, savedRoutes, allRoutes, allDialers]);
  
  const escapeCsvCell = (cellData: any) => {
    if (cellData === null || cellData === undefined) {
        return '';
    }
    const stringData = String(cellData);
    if (stringData.includes('"') || stringData.includes(',') || stringData.includes('\n')) {
        return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
  };
  
    const handleExportRoutes = () => {
    if (routesToShow.length === 0) {
        toast({ variant: 'destructive', title: 'No Routes', description: 'There are no routes to export.' });
        return;
    }

    const headers = ['Route Name', 'Assigned User', 'Scheduled Date', 'Stop Number', 'Lead Name', 'Lead Address'];
    const rows: string[][] = [];

    routesToShow.forEach(route => {
        if (route.leads.length === 0) {
            rows.push([
                escapeCsvCell(route.name),
                escapeCsvCell(route.userName),
                escapeCsvCell(route.scheduledDate ? new Date(route.scheduledDate).toLocaleDateString() : 'N/A'),
                '', '', ''
            ]);
        } else {
            route.leads.forEach((lead, index) => {
                const address = lead.address ? `${lead.address.street}, ${lead.address.city}, ${lead.address.state} ${lead.address.zip}` : 'N/A';
                rows.push([
                    escapeCsvCell(route.name),
                    escapeCsvCell(route.userName),
                    escapeCsvCell(route.scheduledDate ? new Date(route.scheduledDate).toLocaleDateString() : 'N/A'),
                    escapeCsvCell(index + 1),
                    escapeCsvCell(lead.companyName),
                    escapeCsvCell(address),
                ]);
            });
        }
    });
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `saved_routes_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


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
      <AlertDialog open={leadsToDelete.length > 0} onOpenChange={(open) => !open && setLeadsToDelete([])}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete {leadsToDelete.length} lead(s) and all associated data. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader /> : 'Delete'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={isReassignDialogOpen} onOpenChange={(open) => {
        setIsReassignDialogOpen(open);
        if (!open) {
            setReassignToUsers([]);
        }
       }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reassign Leads</DialogTitle>
                <DialogDescription>
                    You are about to reassign {selectedLeads.length} lead(s). Select one or more users to randomly distribute the leads to.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label>Assign to</Label>
                <ScrollArea className="h-48 mt-2 border rounded-md p-2">
                    <div className="space-y-2">
                        {allDialers.map((u) => (
                            <div key={u.uid} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`reassign-${u.uid}`}
                                    checked={reassignToUsers.includes(u.displayName!)}
                                    onCheckedChange={(checked) => handleReassignUserSelect(!!checked, u.displayName!)}
                                />
                                <Label htmlFor={`reassign-${u.uid}`} className="font-normal">
                                    {u.displayName}
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleBulkReassign} disabled={reassignToUsers.length === 0}>
                    Confirm Reassignment
                </Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>
      <MoveLeadDialog
        leads={leadsToMove}
        isOpen={isMoveLeadDialogOpen}
        onOpenChange={setIsMoveLeadDialogOpen}
        onLeadsMoved={() => {
            fetchData();
            setSelectedLeads([]);
        }}
        targetBucket="outbound"
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
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
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
                <CardTitle>Scheduled Revisits</CardTitle>
                <CardDescription>Upcoming revisits for your leads.</CardDescription>
            </CardHeader>
            <CardContent>
                {scheduledRevisits.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company</TableHead>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Assigned To</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scheduledRevisits.map(({ lead, ...appt }) => {
                                const revisitDate = new Date(appt.starttime);
                                const isRevisitToday = isToday(revisitDate);
                                const isRevisitThisWeek = isThisWeek(revisitDate, { weekStartsOn: 1 });
                                const isRevisitOverdue = isPast(revisitDate) && !isRevisitToday;
                                return (
                                <TableRow key={appt.id} className={cn(
                                    isRevisitOverdue && 'bg-red-100/50 dark:bg-red-900/20',
                                    isRevisitToday && 'bg-green-100/50 dark:bg-green-900/20',
                                    isRevisitThisWeek && !isRevisitToday && 'bg-yellow-100/50 dark:bg-yellow-900/20',
                                )}>
                                    <TableCell>
                                        <Button variant="link" className="p-0 h-auto" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>
                                            {lead.companyName}
                                        </Button>
                                    </TableCell>
                                    <TableCell>{format(new Date(appt.starttime), 'PPpp')}</TableCell>
                                    <TableCell>{appt.assignedTo}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Add to Route
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>Existing Route</DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent>
                                                        {savedRoutes.map(route => (
                                                            <DropdownMenuItem key={route.id} onSelect={() => handleAddLeadToRoute(lead, route)} disabled={isUpdatingRoute === route.id}>
                                                                {isUpdatingRoute === route.id ? <Loader /> : route.name}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                                <DropdownMenuItem onClick={() => router.push(`/leads/map?addLead=${lead.id}`)}>
                                                    New Route
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center text-muted-foreground py-10">No revisits scheduled.</div>
                )}
            </CardContent>
        </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Route className="h-5 w-5"/> Saved Routes</CardTitle>
          <Button onClick={handleExportRoutes} variant="outline" size="sm" disabled={routesToShow.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export All Routes
          </Button>
        </CardHeader>
        <CardContent>
          {routesToShow.length > 0 ? (
            <div className="space-y-2">
              {routesToShow.map(route => (
                <Card key={route.id} className="p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <p className="font-semibold">{route.name}</p>
                            <p className="text-xs text-muted-foreground">{route.leads.length} stops &bull; Created on {new Date(route.createdAt).toLocaleDateString()}</p>
                            {(userProfile.role === 'admin' || userProfile.role === 'Field Sales Admin') && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3"/> {(route as RouteWithUser).userName}</p>
                            )}
                        </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleLoadRoute(route)}>Load on Map</Button>
                        <Button size="sm" variant="default" onClick={() => handleStartRoute(route)}>Start</Button>
                        {(userProfile.role === 'admin' || userProfile.role === 'Field Sales Admin') ? (
                            <>
                                <Button size="sm" variant="outline" onClick={() => setRouteToMove(route as RouteWithUser)}>
                                    <Move className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteRoute(route as RouteWithUser)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </>
                        ) : (
                             <Button size="sm" variant="destructive" onClick={() => handleDeleteRoute(route as RouteWithUser)}><Trash2 className="h-4 w-4" /></Button>
                        )}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle>My Assigned Leads</CardTitle>
                <div className="flex items-center gap-2">
                   {selectedLeads.length > 0 && (
                      <>
                        <Button size="sm" variant="outline" onClick={openMoveLeadsDialog}>
                            <Move className="h-4 w-4 mr-2" /> Move to Outbound ({selectedLeads.length})
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => confirmDelete(selectedLeads)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete ({selectedLeads.length})
                        </Button>
                      </>
                   )}
                </div>
            </div>
        </CardHeader>
        <CardContent>
         {filteredMyLeads.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-2">
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
      
       {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
          <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle>All Assigned Field Sales Leads</CardTitle>
                     <div className="flex items-center gap-2">
                        {selectedLeads.length > 0 && (
                            <>
                               <Button variant="destructive" size="sm" onClick={() => confirmDelete(selectedLeads)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete ({selectedLeads.length})
                               </Button>
                               <Button size="sm" variant="outline" onClick={openMoveLeadsDialog}>
                                   <Move className="h-4 w-4 mr-2" /> Move to Outbound ({selectedLeads.length})
                               </Button>
                               <Button size="sm" variant="outline" onClick={() => setIsReassignDialogOpen(true)}>
                                   <UserCog className="h-4 w-4 mr-2" /> Reassign ({selectedLeads.length})
                               </Button>
                            </>
                        )}
                    </div>
                </div>
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
                                <Accordion type="multiple" className="w-full space-y-2">
                                    {Object.entries(statusGroups).map(([status, leads]) => (
                                        <AccordionItem value={`${dialer}-${status}`} key={`${dialer}-${status}`}>
                                            <AccordionTrigger className="bg-secondary/50 px-4 rounded-md text-sm">
                                                <div className="flex items-center gap-2">
                                                    <LeadStatusBadge status={status as LeadStatus} />
                                                    <Badge variant="outline">{leads.length} Leads</Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-2">
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
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {leads.map(lead => (
                                                            <TableRow key={lead.id} data-state={selectedLeads.includes(lead.id) && "selected"}>
                                                                <TableCell>
                                                                    <Checkbox
                                                                        checked={selectedLeads.includes(lead.id)}
                                                                        onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                                                                    />
                                                                </TableCell>
                                                                <TableCell><Button variant="link" className="p-0 h-auto" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>{lead.companyName}</Button></TableCell>
                                                                <TableCell className="hidden sm:table-cell">{lead.franchisee ?? 'N/A'}</TableCell>
                                                                <TableCell className="hidden md:table-cell">{lead.industryCategory}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                                </div>
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
                        Move the route "{routeToMove?.name}" from {routeToMove?.userName} to another user.
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

    

    







