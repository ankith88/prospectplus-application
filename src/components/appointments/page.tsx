

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
import type { Appointment, LeadStatus, AppointmentStatus, DiscoveryData } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Filter, SlidersHorizontal, User, X, Briefcase, Download, ArrowUpDown, Route } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import { AppointmentStatusBadge } from '@/components/appointment-status-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox'


type AppointmentWithLead = Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: LeadStatus; discoveryData?: DiscoveryData; };
type SortableAppointmentKeys = 'leadName' | 'leadStatus' | 'appointmentStatus' | 'appointmentDate' | 'dialerAssigned' | 'assignedTo' | 'duedate' | 'starttime' | 'discoveryScore';
const leadStatuses: LeadStatus[] = ['New', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'LPO Review', 'Qualified', 'Pre Qualified', 'Unqualified', 'Won', 'Lost', 'Demo', 'Reschedule', 'Trialing ShipMate'];
const appointmentStatuses: (AppointmentStatus | 'Pending')[] = ['Pending', 'Completed', 'Cancelled', 'No Show', 'Rescheduled'];


export default function AllAppointmentsPage() {
  const [allAppointments, setAllAppointments] = useState<AppointmentWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortableAppointmentKeys; direction: 'ascending' | 'descending' } | null>(null);
  const [filters, setFilters] = useState({
    user: [] as string[],
    leadAssignedTo: [] as string[],
    date: undefined as DateRange | undefined,
    createdDate: undefined as DateRange | undefined,
    leadName: '',
    status: [] as string[],
    appointmentStatus: [] as string[],
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

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const clearFilters = () => {
    setFilters({ user: [], leadAssignedTo: [], date: undefined, createdDate: undefined, leadName: '', status: [], appointmentStatus: [] });
  };
  
  const parseDateString = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    
    const dateTimeParts = dateStr.split(' ');
    const datePart = dateTimeParts[0];
    const dateParts = datePart.split('/');
    
    if (dateParts.length === 3) {
      const [day, month, year] = dateParts.map(Number);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const fullYear = year < 100 ? 2000 + year : year;
        return new Date(fullYear, month - 1, day);
      }
    }
    
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };


  const filteredAppointments = useMemo(() => {
    let appointmentsToFilter = allAppointments.filter(appointment => {
        return appointment.leadName !== 'Unknown Lead';
    });

    if (userProfile?.role !== 'admin' && userProfile?.displayName) {
        appointmentsToFilter = appointmentsToFilter.filter(c => c.dialerAssigned === userProfile.displayName);
    }
    
    const uniqueAppointmentsMap = new Map<string, AppointmentWithLead>();
    appointmentsToFilter.forEach(appointment => {
        const key = `${appointment.leadName}-${appointment.duedate}-${appointment.starttime}`;
        if (!uniqueAppointmentsMap.has(key)) {
            uniqueAppointmentsMap.set(key, appointment);
        }
    });

    const uniqueAppointments = Array.from(uniqueAppointmentsMap.values());


    return uniqueAppointments.filter(appointment => {
        const appointmentUserMatch = filters.user.length === 0 || filters.user.includes(appointment.assignedTo);
        const leadUserMatch = filters.leadAssignedTo.length === 0 || (appointment.dialerAssigned && filters.leadAssignedTo.includes(appointment.dialerAssigned));
        
        let dateMatch = true;
        if (filters.date?.from) {
            const appointmentDate = new Date(appointment.duedate);
            const fromDate = startOfDay(filters.date.from);
            const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
            dateMatch = appointmentDate >= fromDate && appointmentDate <= toDate;
        }

        let createdDateMatch = true;
        if (filters.createdDate?.from) {
            const createdDate = parseDateString(appointment.appointmentDate);
            if(createdDate) {
              const fromDate = startOfDay(filters.createdDate.from);
              const toDate = filters.createdDate.to ? endOfDay(filters.createdDate.to) : endOfDay(filters.createdDate.from);
              createdDateMatch = createdDate >= fromDate && createdDate <= toDate;
            } else {
              createdDateMatch = false;
            }
        }
        
        const leadNameMatch = filters.leadName ? appointment.leadName.toLowerCase().includes(filters.leadName.toLowerCase()) : true;
        
        const finalAppointmentUserMatch = userProfile?.role === 'admin' ? appointmentUserMatch : true;
        const finalLeadUserMatch = userProfile?.role === 'admin' ? leadUserMatch : true;

        const statusMatch = filters.status.length === 0 || filters.status.includes(appointment.leadStatus);
        
        const appointmentStatusMatch = filters.appointmentStatus.length === 0 || filters.appointmentStatus.includes(appointment.appointmentStatus || 'Pending');

        return finalAppointmentUserMatch && finalLeadUserMatch && dateMatch && createdDateMatch && leadNameMatch && statusMatch && appointmentStatusMatch;
    });
  }, [allAppointments, filters, userProfile]);
  
  const sortedAppointments = useMemo(() => {
    let sortableItems = [...filteredAppointments];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'appointmentDate') {
            aValue = parseDateString(a.appointmentDate)?.getTime() || 0;
            bValue = parseDateString(b.appointmentDate)?.getTime() || 0;
        } else if (sortConfig.key === 'duedate' || sortConfig.key === 'starttime') {
            aValue = new Date(a[sortConfig.key]).getTime();
            bValue = new Date(b[sortConfig.key]).getTime();
        } else if (sortConfig.key === 'appointmentStatus') {
            aValue = a.appointmentStatus || 'Pending';
            bValue = b.appointmentStatus || 'Pending';
        } else if (sortConfig.key === 'discoveryScore') {
          aValue = a.discoveryData?.score ?? -1;
          bValue = b.discoveryData?.score ?? -1;
        } else {
            aValue = a[sortConfig.key] || '';
            bValue = b[sortConfig.key] || '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredAppointments, sortConfig]);

  const requestSort = (key: SortableAppointmentKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortableAppointmentKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };
  
  const allUsers = useMemo(() => {
      const users = new Set(allAppointments.map(c => c.assignedTo).filter(Boolean));
      return Array.from(users as string[]).map(u => ({ value: u, label: u })).sort((a,b) => a.label.localeCompare(b.label));
  }, [allAppointments]);
  
  const allLeadUsers = useMemo(() => {
      const users = new Set(allAppointments.map(c => c.dialerAssigned).filter(Boolean));
      return Array.from(users as string[]).map(u => ({ value: u, label: u })).sort((a,b) => a.label.localeCompare(b.label));
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
    const headers = ['Lead Name', 'Lead Status', 'Appointment Status', 'Date Created', 'Assigned To (Lead)', 'Assigned To (Appointment)', 'Date', 'Time'];
    const rows = sortedAppointments.map(appt => {
        const createdDate = parseDateString(appt.appointmentDate);
        return [
            escapeCsvCell(appt.leadName),
            escapeCsvCell(appt.leadStatus),
            escapeCsvCell(appt.appointmentStatus || 'Pending'),
            escapeCsvCell(createdDate ? createdDate.toLocaleDateString() : 'N/A'),
            escapeCsvCell(appt.dialerAssigned || 'Unassigned'),
            escapeCsvCell(appt.assignedTo || 'Unassigned'),
            escapeCsvCell(new Date(appt.duedate).toLocaleDateString()),
            escapeCsvCell(new Date(appt.starttime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })),
        ]
    });

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

  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) && val.length > 0) || (typeof val === 'string' && val !== '') || (typeof val === 'object' && val !== undefined));
  
  const leadStatusOptions: Option[] = leadStatuses.map(s => ({ value: s, label: s })).sort((a,b) => a.label.localeCompare(b.label));
  const appointmentStatusOptions: Option[] = appointmentStatuses.map(s => ({ value: s, label: s })).sort((a,b) => a.label.localeCompare(b.label));


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
                            <MultiSelectCombobox
                                options={allLeadUsers}
                                selected={filters.leadAssignedTo}
                                onSelectedChange={(selected) => handleFilterChange('leadAssignedTo', selected)}
                                placeholder="Select users..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="user">Assigned To (Appointment)</Label>
                            <MultiSelectCombobox
                                options={allUsers}
                                selected={filters.user}
                                onSelectedChange={(selected) => handleFilterChange('user', selected)}
                                placeholder="Select users..."
                            />
                        </div>
                       </>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="status">Lead Status</Label>
                        <MultiSelectCombobox
                            options={leadStatusOptions}
                            selected={filters.status}
                            onSelectedChange={(selected) => handleFilterChange('status', selected)}
                            placeholder="Select statuses..."
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="appointmentStatus">Appointment Status</Label>
                        <MultiSelectCombobox
                            options={appointmentStatusOptions}
                            selected={filters.appointmentStatus}
                            onSelectedChange={(selected) => handleFilterChange('appointmentStatus', selected)}
                            placeholder="Select statuses..."
                        />
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
                    <div className="space-y-2">
                        <Label htmlFor="createdDate">Date Created</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="createdDate"
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.createdDate?.from ? (
                                  filters.createdDate.to ? (
                                    <>
                                      {format(filters.createdDate.from, "LLL d, y")} -{" "}
                                      {format(filters.createdDate.to, "LLL d, y")}
                                    </>
                                  ) : (
                                    format(filters.createdDate.from, "LLL d, y")
                                  )
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 flex" align="start">
                                <div className="flex flex-col space-y-2 border-r p-2">
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('createdDate', {from: new Date(), to: new Date()})}>Today</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('createdDate', {from: subDays(new Date(), 1), to: subDays(new Date(), 1)})}>Yesterday</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('createdDate', {from: startOfWeek(new Date()), to: endOfWeek(new Date())})}>This Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('createdDate', {from: startOfWeek(subDays(new Date(), 7)), to: endOfWeek(subDays(new Date(), 7))})}>Last Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('createdDate', {from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>This Month</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('createdDate', {from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1))})}>Last Month</Button>
                                </div>
                                <CalendarPicker
                                  mode="range"
                                  selected={filters.createdDate}
                                  onSelect={(date) => handleFilterChange('createdDate', date)}
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
                <Badge variant="secondary">{sortedAppointments.length} appointment(s)</Badge>
            </div>
             {userProfile?.role === 'admin' && (
                <Button onClick={handleExport} variant="outline" size="sm" disabled={sortedAppointments.length === 0}>
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
                  <TableHead><Button variant="ghost" onClick={() => requestSort('leadName')} className="group -ml-4">Lead{getSortIndicator('leadName')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('leadStatus')} className="group -ml-4">Lead Status{getSortIndicator('leadStatus')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('appointmentStatus')} className="group -ml-4">Appointment Status{getSortIndicator('appointmentStatus')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('discoveryScore')} className="group -ml-4">Discovery Score{getSortIndicator('discoveryScore')}</Button></TableHead>
                  <TableHead>Routing Tag</TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('appointmentDate')} className="group -ml-4">Date Created{getSortIndicator('appointmentDate')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('dialerAssigned')} className="group -ml-4">Assigned To (Lead){getSortIndicator('dialerAssigned')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('assignedTo')} className="group -ml-4">Assigned To (Appointment){getSortIndicator('assignedTo')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('duedate')} className="group -ml-4">Date{getSortIndicator('duedate')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('starttime')} className="group -ml-4">Time{getSortIndicator('starttime')}</Button></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : sortedAppointments.length > 0 ? (
                  sortedAppointments.map((appointment) => {
                    const createdDate = parseDateString(appointment.appointmentDate);
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
                        <AppointmentStatusBadge status={appointment.appointmentStatus || 'Pending'} />
                      </TableCell>
                      <TableCell>
                        {typeof appointment.discoveryData?.score === 'number' ? (
                          <ScoreIndicator score={appointment.discoveryData.score} />
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {appointment.discoveryData?.routingTag ? (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Route className="h-3 w-3" />
                            {appointment.discoveryData.routingTag}
                          </Badge>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {createdDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{createdDate.toLocaleDateString()}</span>
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
                      <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
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
