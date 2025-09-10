

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
import type { Appointment, LeadStatus } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Filter, SlidersHorizontal, User, X, Briefcase, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getAllAppointments } from '@/services/firebase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { LeadStatusBadge } from '@/components/lead-status-badge'

type AppointmentWithLead = Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: LeadStatus };

export default function AllAppointmentsPage() {
  const [allAppointments, setAllAppointments] = useState<AppointmentWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user: 'all',
    leadAssignedTo: 'all',
    date: undefined as DateRange | undefined,
    leadName: '',
    status: 'all' as LeadStatus | 'all',
  });

  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const fetchedAppointments = await getAllAppointments();
      setAllAppointments(fetchedAppointments);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch appointments.' });
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
    
    fetchAppointments();

  }, [user, authLoading, router]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string | DateRange | undefined) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const clearFilters = () => {
    setFilters({ user: 'all', leadAssignedTo: 'all', date: undefined, leadName: '', status: 'all' });
  };

  const filteredAppointments = useMemo(() => {
    let appointmentsToFilter = allAppointments;

    if (userProfile?.role !== 'admin' && userProfile?.displayName) {
        appointmentsToFilter = allAppointments.filter(c => c.dialerAssigned === userProfile.displayName);
    }

    return appointmentsToFilter.filter(appointment => {
        if (!appointment.leadName) {
            return false;
        }

        const appointmentUserMatch = filters.user === 'all' || appointment.assignedTo === filters.user;
        const leadUserMatch = filters.leadAssignedTo === 'all' || appointment.dialerAssigned === filters.leadAssignedTo;
        
        let dateMatch = true;
        if (filters.date?.from) {
            const appointmentDate = new Date(appointment.duedate);
            const fromDate = startOfDay(filters.date.from);
            const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
            dateMatch = appointmentDate >= fromDate && appointmentDate <= toDate;
        }
        
        const leadNameMatch = filters.leadName ? appointment.leadName.toLowerCase().includes(filters.leadName.toLowerCase()) : true;
        
        const finalAppointmentUserMatch = userProfile?.role === 'admin' ? appointmentUserMatch : true;
        const finalLeadUserMatch = userProfile?.role === 'admin' ? leadUserMatch : true;

        const statusMatch = filters.status === 'all' || appointment.leadStatus === filters.status;

        return finalAppointmentUserMatch && finalLeadUserMatch && dateMatch && leadNameMatch && statusMatch;
    });
  }, [allAppointments, filters, userProfile]);
  
  const allUsers = useMemo(() => {
      const users = new Set(allAppointments.map(c => c.assignedTo).filter(Boolean));
      return Array.from(users as string[]);
  }, [allAppointments]);
  
  const allLeadUsers = useMemo(() => {
      const users = new Set(allAppointments.map(c => c.dialerAssigned).filter(Boolean));
      return Array.from(users as string[]);
  }, [allAppointments]);

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

  const handleExport = () => {
    const headers = ['Lead Name', 'Lead Status', 'Date Created', 'Assigned To (Lead)', 'Assigned To (Appointment)', 'Date', 'Time'];
    const rows = filteredAppointments.map(appt => [
        escapeCsvCell(appt.leadName),
        escapeCsvCell(appt.leadStatus),
        escapeCsvCell(appt.appointmentDate ? new Date(appt.appointmentDate).toLocaleDateString() : 'N/A'),
        escapeCsvCell(appt.dialerAssigned || 'Unassigned'),
        escapeCsvCell(appt.assignedTo || 'Unassigned'),
        escapeCsvCell(new Date(appt.duedate).toLocaleDateString()),
        escapeCsvCell(new Date(appt.starttime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })),
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `appointments_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


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
        <h1 className="text-3xl font-bold tracking-tight">All Appointments</h1>
        <p className="text-muted-foreground">Review all scheduled appointments.</p>
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
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="leadName">Lead Name</Label>
                        <Input id="leadName" value={filters.leadName} onChange={(e) => handleFilterChange('leadName', e.target.value)} />
                    </div>
                    {userProfile?.role === 'admin' && (
                       <>
                        <div className="space-y-2">
                            <Label htmlFor="leadAssignedTo">Assigned To (Lead)</Label>
                             <Select value={filters.leadAssignedTo} onValueChange={(value) => handleFilterChange('leadAssignedTo', value)}>
                                <SelectTrigger id="leadAssignedTo">
                                    <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    {allLeadUsers.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="user">Assigned To (Appointment)</Label>
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
                       </>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="status">Lead Status</Label>
                        <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {(['New', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'LPO Review', 'Qualified', 'Pre Qualified', 'Unqualified', 'Won', 'Lost'] as LeadStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Appointment Date</Label>
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
                     {hasActiveFilters && (
                        <div className="space-y-2 col-start-1">
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
            <div className="flex items-center gap-4">
                <CardTitle>Appointment Schedule</CardTitle>
                <Badge variant="secondary">{filteredAppointments.length} appointment(s)</Badge>
            </div>
             {userProfile?.role === 'admin' && (
                <Button onClick={handleExport} variant="outline" size="sm" disabled={filteredAppointments.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Lead Status</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Assigned To (Lead)</TableHead>
                  <TableHead>Assigned To (Appointment)</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : filteredAppointments.length > 0 ? (
                  filteredAppointments.map((appointment) => {
                    return (
                    <TableRow key={appointment.id}>
                      <TableCell>
                         <Button variant="link" className="p-0 h-auto flex items-center gap-2" onClick={() => window.open(`/leads/${appointment.leadId}`, '_blank')}>
                            <Briefcase className="h-4 w-4" />
                            {appointment.leadName}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={appointment.leadStatus} />
                      </TableCell>
                      <TableCell>
                        {appointment.appointmentDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(appointment.appointmentDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          'N/A'
                        )}
                       </TableCell>
                       <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {appointment.dialerAssigned || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {appointment.assignedTo || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(appointment.duedate).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                       <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(appointment.starttime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                          </div>
                       </TableCell>
                    </TableRow>
                  )})
                ) : (
                  <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          No appointments found.
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
