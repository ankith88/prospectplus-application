
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
import type { Activity, LeadStatus } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Phone, Calendar, Clock, Filter, SlidersHorizontal, User, Hash, X, Voicemail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getAllCallActivities } from '@/services/firebase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string };

export default function AllCallsPage() {
  const [allCalls, setAllCalls] = useState<CallActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user: 'all',
    date: undefined as DateRange | undefined,
    duration: 'all',
    leadName: '',
  });

  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const fetchedCalls = await getAllCallActivities();
      setAllCalls(fetchedCalls);
    } catch (error) {
      console.error("Failed to fetch calls:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch calls.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    if (authLoading) return;
    
    fetchCalls();

  }, [user, authLoading, router]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string | DateRange | undefined) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const clearFilters = () => {
    setFilters({ user: 'all', date: undefined, duration: 'all', leadName: '' });
  };
  
  const parseDuration = (durationStr?: string): number => {
    if (!durationStr) return 0;
    const minutesMatch = durationStr.match(/(\d+)m/);
    const secondsMatch = durationStr.match(/(\d+)s/);
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
    return minutes * 60 + seconds;
  };

  const filteredCalls = useMemo(() => {
    let callsToFilter = allCalls;

    if (userProfile?.role !== 'admin' && userProfile?.displayName) {
        callsToFilter = allCalls.filter(c => c.dialerAssigned === userProfile.displayName);
    }

    return callsToFilter.filter(call => {
        if (!call.callId) return false;

        const userMatch = filters.user === 'all' || call.dialerAssigned === filters.user;
        
        let dateMatch = true;
        if (filters.date?.from) {
            const callDate = new Date(call.date);
            const fromDate = startOfDay(filters.date.from);
            const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
            dateMatch = callDate >= fromDate && callDate <= toDate;
        }
        
        const durationInSeconds = parseDuration(call.duration);

        const durationMatch = () => {
            switch (filters.duration) {
                case 'under30s': return durationInSeconds < 30;
                case '30s-2min': return durationInSeconds >= 30 && durationInSeconds < 120;
                case 'over2min': return durationInSeconds >= 120;
                case 'none': return durationInSeconds === 0;
                default: return true;
            }
        };

        const leadNameMatch = filters.leadName ? call.leadName.toLowerCase().includes(filters.leadName.toLowerCase()) : true;
        
        const finalUserMatch = userProfile?.role === 'admin' ? userMatch : true;

        return finalUserMatch && dateMatch && durationMatch() && leadNameMatch;
    });
  }, [allCalls, filters, userProfile]);
  
  const allUsers = useMemo(() => {
      const users = new Set(allCalls.map(c => c.dialerAssigned).filter(Boolean));
      return Array.from(users as string[]);
  }, [allCalls]);

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  const hasActiveFilters = Object.values(filters).some(val => val && val !== 'all' && val !== '');

  return (
    <>
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">All Calls</h1>
        <p className="text-muted-foreground">Review all call activities.</p>
      </header>
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
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="leadName">Lead Name</Label>
                        <Input id="leadName" value={filters.leadName} onChange={(e) => handleFilterChange('leadName', e.target.value)} />
                    </div>
                    {userProfile?.role === 'admin' && (
                        <div className="space-y-2">
                            <Label htmlFor="user">User</Label>
                             <Select value={filters.user} onValueChange={(value) => handleFilterChange('user', value)}>
                                <SelectTrigger id="user">
                                    <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    {allUsers.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="date"
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.date?.from ? (
                                  filters.date.to ? (
                                    <>
                                      {format(filters.date.from, "LLL d, y")} -{" "}
                                      {format(filters.date.to, "LLL d, y")}
                                    </>
                                  ) : (
                                    format(filters.date.from, "LLL d, y")
                                  )
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 flex" align="start">
                                <div className="flex flex-col space-y-2 border-r p-2">
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: new Date(), to: new Date()})}>Today</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: subDays(new Date(), 1), to: subDays(new Date(), 1)})}>Yesterday</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfWeek(new Date()), to: endOfWeek(new Date())})}>This Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfWeek(subDays(new Date(), 7)), to: endOfWeek(subDays(new Date(), 7))})}>Last Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>This Month</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1))})}>Last Month</Button>
                                </div>
                                <CalendarPicker
                                  mode="range"
                                  selected={filters.date}
                                  onSelect={(date) => handleFilterChange('date', date)}
                                  initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="duration">Duration</Label>
                        <Select value={filters.duration} onValueChange={(value) => handleFilterChange('duration', value)}>
                            <SelectTrigger id="duration">
                                <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Durations</SelectItem>
                                <SelectItem value="under30s">Under 30s</SelectItem>
                                <SelectItem value="30s-2min">30s - 2min</SelectItem>
                                <SelectItem value="over2min">Over 2min</SelectItem>
                                <SelectItem value="none">No Duration</SelectItem>
                            </SelectContent>
                        </Select>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Call History</CardTitle>
          <Badge variant="secondary">{filteredCalls.length} call(s)</Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Call ID</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Recording</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : filteredCalls.length > 0 ? (
                  filteredCalls.map((call) => {
                    return (
                    <TableRow key={call.id}>
                      <TableCell>
                         <Button variant="link" className="p-0 h-auto" onClick={() => router.push(`/leads/${call.leadId}`)}>
                            {call.leadName}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {call.dialerAssigned || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={call.leadStatus} />
                      </TableCell>
                       <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span>{call.callId || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{new Date(call.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{new Date(call.date).toLocaleTimeString()}</span>
                            </div>
                        </div>
                      </TableCell>
                       <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{call.duration || 'N/A'}</span>
                          </div>
                       </TableCell>
                       <TableCell className="min-w-[20rem] whitespace-pre-wrap">
                          {call.notes}
                       </TableCell>
                       <TableCell>
                          {call.callId ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => window.open(`https://assets.aircall.io/calls/${call.callId}/recording/info`, '_blank')}>
                              <Voicemail className="mr-2 h-4 w-4" />
                              View Recording
                            </Button>
                          ) : (
                            <span>N/A</span>
                          )}
                        </TableCell>
                    </TableRow>
                  )})
                ) : (
                  <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          No calls found.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  )
}
