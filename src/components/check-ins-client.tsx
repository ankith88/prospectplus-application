
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Activity, LeadStatus, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Filter, SlidersHorizontal, X, RefreshCw, Calendar as CalendarIcon, User, Briefcase, MapPin } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { getLeadsFromFirebase, getAllUsers, getSubCollection } from '@/services/firebase';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { LeadStatusBadge } from './lead-status-badge';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

async function getCheckInActivities(): Promise<Activity[]> {
    const q = query(collectionGroup(firestore, 'activity'), where('notes', '==', 'Checked in at location via map.'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        leadId: doc.ref.parent.parent!.id,
        ...doc.data()
    } as Activity));
}

export default function CheckinsClientPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allCheckInActivities, setAllCheckInActivities] = useState<Activity[]>([]);
  const [allFieldSalesUsers, setAllFieldSalesUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    date: undefined as DateRange | undefined,
    user: [] as string[],
    franchisee: [] as string[],
    status: [] as string[],
  });

  const fetchData = async () => {
    setLoading(true);
    toast({ title: 'Loading Data...', description: 'Fetching check-in records.' });
    try {
        const [refreshedLeads, refreshedUsers, refreshedActivities] = await Promise.all([
            getLeadsFromFirebase({ summary: true }),
            getAllUsers(),
            getCheckInActivities(),
        ]);
        
        setAllLeads(refreshedLeads);
        setAllCheckInActivities(refreshedActivities);
        setAllFieldSalesUsers(refreshedUsers.filter(u => u.role === 'Field Sales'));
        toast({ title: 'Success', description: 'Data has been loaded.' });
    } catch (error) {
        console.error("Failed to refresh data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the latest data.' });
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      date: undefined,
      user: [],
      franchisee: [],
      status: [],
    });
  };

  const checkedInLeads = useMemo(() => {
    const checkInLeadIds = new Map<string, Activity>();

    allCheckInActivities.forEach(activity => {
        if (!checkInLeadIds.has(activity.leadId) || new Date(activity.date) > new Date(checkInLeadIds.get(activity.leadId)!.date)) {
            checkInLeadIds.set(activity.leadId, activity);
        }
    });

    let leads = allLeads
        .filter(lead => checkInLeadIds.has(lead.id))
        .map(lead => ({
            ...lead,
            checkInActivity: checkInLeadIds.get(lead.id)!
        }));

    // Apply filters
    if (userProfile?.role === 'Field Sales') {
        leads = leads.filter(l => l.checkInActivity.author === userProfile.displayName);
    } else {
         if (filters.user.length > 0) {
            leads = leads.filter(l => l.checkInActivity.author && filters.user.includes(l.checkInActivity.author));
        }
    }
    
    if (filters.franchisee.length > 0) {
        leads = leads.filter(l => l.franchisee && filters.franchisee.includes(l.franchisee));
    }
    
    if (filters.status.length > 0) {
        leads = leads.filter(l => filters.status.includes(l.status));
    }

    if (filters.date?.from) {
        const fromDate = startOfDay(filters.date.from);
        const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
        leads = leads.filter(l => {
            const checkInDate = new Date(l.checkInActivity.date);
            return checkInDate >= fromDate && checkInDate <= toDate;
        });
    }

    return leads.sort((a,b) => new Date(b.checkInActivity.date).getTime() - new Date(a.checkInActivity.date).getTime());

  }, [allCheckInActivities, allLeads, filters, userProfile]);

  const userOptions: Option[] = useMemo(() => {
    return allFieldSalesUsers.map(u => ({ value: u.displayName!, label: u.displayName! }));
  }, [allFieldSalesUsers]);

  const franchiseeOptions: Option[] = useMemo(() => {
    const franchisees = new Set(allLeads.map(l => l.franchisee).filter(Boolean));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f }));
  }, [allLeads]);

  const statusOptions: Option[] = useMemo(() => {
    const statuses = new Set(allLeads.map(l => l.status));
    return Array.from(statuses).map(s => ({ value: s, label: s}));
  }, [allLeads]);

  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) && val.length > 0) || !!val);

  if (authLoading || loading) {
    return <div className="flex h-full items-center justify-center"><Loader /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Check-in History</h1>
        <p className="text-muted-foreground">A log of all physical lead check-ins.</p>
      </header>
        <Collapsible>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                     <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        <span>Filters</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button onClick={fetchData} variant="outline" size="sm" disabled={isRefreshing || loading}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                            {isRefreshing || loading ? 'Refreshing...' : 'Refresh Data'}
                        </Button>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <SlidersHorizontal className="h-4 w-4" />
                                <span className="ml-2">Toggle Filters</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </CardHeader>
                 <CollapsibleContent>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        {userProfile?.role !== 'Field Sales' && (
                            <div className="space-y-2">
                                <Label htmlFor="user">Field Sales User</Label>
                                <MultiSelectCombobox
                                    options={userOptions}
                                    selected={filters.user}
                                    onSelectedChange={(selected) => handleFilterChange('user', selected)}
                                    placeholder="Select users..."
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="franchisee">Franchisee</Label>
                            <MultiSelectCombobox
                                options={franchiseeOptions}
                                selected={filters.franchisee}
                                onSelectedChange={(selected) => handleFilterChange('franchisee', selected)}
                                placeholder="Select franchisees..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <MultiSelectCombobox
                                options={statusOptions}
                                selected={filters.status}
                                onSelectedChange={(selected) => handleFilterChange('status', selected)}
                                placeholder="Select statuses..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Check-in Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button id="date" variant="outline" className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filters.date?.from ? (
                                    filters.date.to ? (
                                        <>{format(filters.date.from, "LLL dd, y")} - {format(filters.date.to, "LLL dd, y")}</>
                                    ) : (
                                        format(filters.date.from, "LLL dd, y")
                                    )
                                    ) : (
                                    <span>Pick a date range</span>
                                    )}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 flex" align="start">
                                    <Calendar
                                    mode="range"
                                    selected={filters.date}
                                    onSelect={(date) => handleFilterChange('date', date)}
                                    initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        {hasActiveFilters && (
                            <div className="space-y-2">
                                <Button variant="ghost" onClick={clearFilters}>
                                    <X className="mr-2 h-4 w-4" /> Clear Filters
                                </Button>
                            </div>
                        )}
                    </CardContent>
                 </CollapsibleContent>
            </Card>
        </Collapsible>
        <Card>
            <CardHeader>
                <CardTitle>Checked-in Leads</CardTitle>
                <CardDescription>Found {checkedInLeads.length} check-in(s) matching your criteria.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Lead ID</TableHead>
                            <TableHead>Company ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Franchisee</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Check-in Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {checkedInLeads.length > 0 ? (
                            checkedInLeads.map(lead => (
                                <TableRow key={lead.id}>
                                    <TableCell>
                                        <Button variant="link" asChild className="p-0 h-auto">
                                            <Link href={`/leads/${lead.id}`}>{lead.companyName}</Link>
                                        </Button>
                                         <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <MapPin className="h-3 w-3"/>
                                            {lead.address?.city || 'N/A'}
                                        </p>
                                    </TableCell>
                                    <TableCell>{lead.id}</TableCell>
                                    <TableCell>{lead.entityId || 'N/A'}</TableCell>
                                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                                    <TableCell><Badge variant="outline">{lead.franchisee || 'N/A'}</Badge></TableCell>
                                    <TableCell>{lead.checkInActivity.author}</TableCell>
                                    <TableCell>{format(new Date(lead.checkInActivity.date), 'PPpp')}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No check-ins found for the selected filters.
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
