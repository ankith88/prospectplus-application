'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarCheck,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  UserCheck,
  Building,
  PlusCircle,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getOnboardingRequests,
  updateOnboardingRequestStatus,
  calculateOnboardingMetrics,
  DEFAULT_LIAM_UID
} from '@/services/onboarding-service';
import type { OnboardingRequest, OnboardingRequestStatus, OnboardingRequestPriority } from '@/lib/types';
import { BookOnboardingAppointmentDialog } from './book-onboarding-appointment-dialog';
import { OrganiseOnboardingDialog } from './organise-onboarding-dialog';
import { format, parseISO, isWithinInterval, subDays, startOfMonth } from 'date-fns';

export function OnboardingRequestsClient() {
  const router = useRouter();
  const { user, userProfile, isSuperAdmin, loading: authLoading } = useAuth();
  const { canView } = usePermissions();
  const { toast } = useToast();

  // Access check: Liam, Marketing Manager, Customer Success, Admin, SuperAdmin
  const isLiam = user?.uid === DEFAULT_LIAM_UID;
  const isMarketingManager = userProfile?.activeRole === 'Marketing Manager' || userProfile?.role === 'Marketing Manager';
  const isCustomerSuccess = userProfile?.activeRole === 'Customer Success' || userProfile?.role === 'Customer Success';
  const isAdmin = userProfile?.activeRole === 'admin' || userProfile?.role === 'admin' || isSuperAdmin;
  const hasAccess = isLiam || isMarketingManager || isCustomerSuccess || isAdmin || canView('customerSuccessOnboarding');

  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Dialogs state
  const [selectedRequestForBooking, setSelectedRequestForBooking] = useState<OnboardingRequest | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isOrganiseOpen, setIsOrganiseOpen] = useState(false);

  const fetchRequests = async () => {
    try {
      setRefreshing(true);
      const data = await getOnboardingRequests();
      setRequests(data);
    } catch (err) {
      console.error('Error loading onboarding requests:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load onboarding requests.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchRequests();
    }
  }, [authLoading]);

  // Date filtered requests for top metrics reporting
  const dateFilteredRequestsForMetrics = useMemo(() => {
    if (dateRangeFilter === 'all') return requests;
    const now = new Date();
    return requests.filter(req => {
      if (!req.requestedAt) return false;
      const reqDate = parseISO(req.requestedAt);
      if (dateRangeFilter === '30days') {
        return reqDate >= subDays(now, 30);
      } else if (dateRangeFilter === 'thisMonth') {
        return reqDate >= startOfMonth(now);
      }
      return true;
    });
  }, [requests, dateRangeFilter]);

  // Metrics calculation for top reporting section
  const metrics = useMemo(() => {
    return calculateOnboardingMetrics(dateFilteredRequestsForMetrics);
  }, [dateFilteredRequestsForMetrics]);

  // Filtered requests for table display
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Search filter
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const matchName = req.companyName?.toLowerCase().includes(queryLower);
        const matchContact = req.contactName?.toLowerCase().includes(queryLower);
        const matchLeadId = req.leadId?.toLowerCase().includes(queryLower);
        if (!matchName && !matchContact && !matchLeadId) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && req.priority !== priorityFilter) {
        return false;
      }

      // Assignee filter
      if (assigneeFilter === 'liam' && req.assignedToUid !== DEFAULT_LIAM_UID) {
        return false;
      } else if (assigneeFilter === 'me' && req.assignedToUid !== user?.uid) {
        return false;
      }

      // Date range filter
      if (dateRangeFilter !== 'all' && req.requestedAt) {
        const now = new Date();
        const reqDate = parseISO(req.requestedAt);
        if (dateRangeFilter === '30days' && reqDate < subDays(now, 30)) return false;
        if (dateRangeFilter === 'thisMonth' && reqDate < startOfMonth(now)) return false;
      }

      return true;
    });
  }, [requests, searchQuery, statusFilter, priorityFilter, assigneeFilter, dateRangeFilter, user?.uid]);

  const handleOpenBooking = (req: OnboardingRequest) => {
    setSelectedRequestForBooking(req);
    setIsBookingOpen(true);
  };

  const handleUpdateStatus = async (reqId: string, status: OnboardingRequestStatus) => {
    try {
      await updateOnboardingRequestStatus(reqId, status, {
        userUid: user?.uid || '',
        userName: userProfile?.displayName || user?.email || 'User',
      });
      toast({ title: 'Status Updated', description: `Request marked as ${status}.` });
      fetchRequests();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    }
  };

  const getStatusBadge = (status: OnboardingRequestStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3" /> Pending Appointment
          </Badge>
        );
      case 'Appointment Booked':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 flex items-center gap-1 font-medium">
            <CalendarCheck className="w-3 h-3" /> Appointment Booked
          </Badge>
        );
      case 'Completed':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Onboarding Completed
          </Badge>
        );
      case 'Cancelled':
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader className="w-8 h-8 text-primary" />
        <p className="text-sm text-muted-foreground">Loading onboarding requests dashboard...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Access Restricted
            </CardTitle>
            <CardDescription>
              This page is restricted to Liam, Marketing Managers, and the Customer Success team.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Onboarding Requests</h1>
            {isLiam && (
              <Badge className="bg-primary/10 text-primary border-primary/20">Assigned Rep: Liam</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track signed customer onboarding requests and schedule onboarding appointments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRequests}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            onClick={() => setIsOrganiseOpen(true)}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Organise Onboarding Request
          </Button>
        </div>
      </div>

      {/* TOP REPORTING SECTION */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Onboarding Performance & Status Reporting
            </CardTitle>
            <CardDescription className="text-xs">
              Overview of request volume and onboarding appointment conversion status
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Requests</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{metrics.totalRequests}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Submitted onboarding leads</p>
            </div>

            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Pending Appointments</p>
              <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-1">{metrics.pendingCount}</p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mt-1">Actionable workload for Liam</p>
            </div>

            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Appointments Booked</p>
              <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">{metrics.bookedCount}</p>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80 mt-1">Scheduled onboarding sessions</p>
            </div>

            <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-400 uppercase tracking-wider">Completed Onboardings</p>
              <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 mt-1">{metrics.completedCount}</p>
              <p className="text-[11px] text-blue-800/80 dark:text-blue-400/80 mt-1">Successfully onboarded</p>
            </div>
          </div>

          {/* Appointment Status Conversion Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Appointment Conversion Rate</span>
              <span className="font-bold text-foreground">{metrics.bookingRatePercentage}% Organised</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 flex overflow-hidden">
              {metrics.totalRequests > 0 ? (
                <>
                  <div
                    className="bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(metrics.bookedCount / metrics.totalRequests) * 100}%` }}
                    title={`Appointments Booked: ${metrics.bookedCount}`}
                  />
                  <div
                    className="bg-blue-500 transition-all duration-300"
                    style={{ width: `${(metrics.completedCount / metrics.totalRequests) * 100}%` }}
                    title={`Completed: ${metrics.completedCount}`}
                  />
                  <div
                    className="bg-amber-400 transition-all duration-300"
                    style={{ width: `${(metrics.pendingCount / metrics.totalRequests) * 100}%` }}
                    title={`Pending: ${metrics.pendingCount}`}
                  />
                  <div
                    className="bg-slate-300 dark:bg-slate-600 transition-all duration-300"
                    style={{ width: `${(metrics.cancelledCount / metrics.totalRequests) * 100}%` }}
                    title={`Cancelled: ${metrics.cancelledCount}`}
                  />
                </>
              ) : (
                <div className="w-full bg-slate-200 dark:bg-slate-700" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Pending ({metrics.pendingCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Appointment Booked ({metrics.bookedCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Completed ({metrics.completedCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span> Cancelled ({metrics.cancelledCount})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEARCH AND FILTERS BAR */}
      <Card className="border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by company name, contact, or lead ID..."
                className="pl-9 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending Appointment</SelectItem>
                  <SelectItem value="Appointment Booked">Appointment Booked</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="w-full md:w-[150px]">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Filter */}
            <div className="w-full md:w-[160px]">
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Reps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All CS Reps</SelectItem>
                  <SelectItem value="liam">Liam (Default)</SelectItem>
                  <SelectItem value="me">Assigned to Me</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* REQUESTS TABLE */}
      <Card className="border-border">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Onboarding Requests ({filteredRequests.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 text-xs">
                <TableHead className="w-[220px]">Company Name</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Requested By & Date</TableHead>
                <TableHead>Assigned Rep</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled Appointment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                    No onboarding requests found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map(req => {
                  const appointment = req.appointmentDetails;
                  return (
                    <TableRow key={req.id} className="hover:bg-muted/40 transition-colors">
                      {/* Company Name */}
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-primary shrink-0" />
                          <span>{req.companyName}</span>
                        </div>
                      </TableCell>

                      {/* Contact Info */}
                      <TableCell className="text-xs">
                        <p className="font-medium text-foreground">{req.contactName || 'N/A'}</p>
                        {req.contactEmail && <p className="text-muted-foreground truncate max-w-[180px]">{req.contactEmail}</p>}
                        {req.contactPhone && <p className="text-muted-foreground">{req.contactPhone}</p>}
                      </TableCell>

                      {/* Requested By & Date */}
                      <TableCell className="text-xs">
                        <p className="font-medium text-foreground">{req.requestedByName}</p>
                        <p className="text-muted-foreground">
                          {req.requestedAt ? format(parseISO(req.requestedAt), 'dd MMM yyyy, h:mm a') : 'N/A'}
                        </p>
                      </TableCell>

                      {/* Assigned Rep */}
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="font-medium bg-background">
                          {req.assignedToName}
                        </Badge>
                      </TableCell>

                      {/* Priority */}
                      <TableCell>
                        {req.priority === 'Urgent' ? (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200">
                            Urgent
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Standard
                          </Badge>
                        )}
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>{getStatusBadge(req.status)}</TableCell>

                      {/* Scheduled Appointment */}
                      <TableCell className="text-xs">
                        {appointment?.appointmentDate ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(parseISO(appointment.appointmentDate), 'dd MMM yyyy, h:mm a')}
                            </p>
                            {appointment.appointmentType && (
                              <p className="text-[11px] text-muted-foreground">{appointment.appointmentType}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Not scheduled yet</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {req.status === 'Pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenBooking(req)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs h-8 gap-1"
                            >
                              <CalendarCheck className="w-3.5 h-3.5" />
                              Organise Appointment
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => router.push(`/companies/${req.companyId || req.leadId}`)}>
                                <ExternalLink className="w-3.5 h-3.5 mr-2" /> View Company Profile
                              </DropdownMenuItem>
                              {req.status !== 'Appointment Booked' && req.status !== 'Completed' && (
                                <DropdownMenuItem onClick={() => handleOpenBooking(req)}>
                                  <CalendarCheck className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Book Appointment
                                </DropdownMenuItem>
                              )}
                              {req.status !== 'Completed' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(req.id, 'Completed')}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-blue-600" /> Mark Completed
                                </DropdownMenuItem>
                              )}
                              {req.status !== 'Cancelled' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(req.id, 'Cancelled')} className="text-destructive">
                                  <XCircle className="w-3.5 h-3.5 mr-2" /> Cancel Request
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIALOGS */}
      <BookOnboardingAppointmentDialog
        open={isBookingOpen}
        onOpenChange={setIsBookingOpen}
        request={selectedRequestForBooking}
        onSuccess={() => {
          fetchRequests();
          setSelectedRequestForBooking(null);
        }}
      />

      <OrganiseOnboardingDialog
        open={isOrganiseOpen}
        onOpenChange={setIsOrganiseOpen}
        onSuccess={fetchRequests}
      />
    </div>
  );
}
