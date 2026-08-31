'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getAllAppointments, getAllUsers } from '@/services/firebase';
import type { Appointment, UserProfile } from '@/lib/types';
import { AccessDenied } from '@/components/access-denied';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/ui/loader';
import { toast } from 'sonner';
import { formatInTimezone } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Video,
  User,
  Mail,
  Building,
  BarChart3,
  CalendarCheck,
  TrendingUp,
  Filter,
  FileText,
  ChevronRight
} from 'lucide-react';

export function TrainingAppointmentsClient() {
  const { user, userProfile, loading: authLoading, isSuperAdmin } = useAuth();

  const activeRoleLower = (userProfile?.activeRole as string)?.toLowerCase() || '';
  const isAleyna =
    userProfile?.email?.toLowerCase() === 'aleyna.harnett@mailplus.com.au' ||
    userProfile?.displayName?.toLowerCase().includes('aleyna') ||
    user?.uid === 'a543AEr3TcaHyj4c1Gh0fJoQ6UB2';

  const isOperationsRole =
    activeRoleLower === 'operations' ||
    activeRoleLower.includes('operations') ||
    activeRoleLower === 'operations manager';

  const hasAccess =
    isSuperAdmin ||
    isAleyna ||
    activeRoleLower === 'admin' ||
    activeRoleLower === 'super user' ||
    isOperationsRole;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'NEXT_MONTH' | 'PAST'>('ALL');

  // Action Modals State
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [actionType, setActionType] = useState<'COMPLETE' | 'RESCHEDULE' | 'CANCEL' | 'NOSHOW' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00 AM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTrainingAppointments = async () => {
    setLoading(true);
    try {
      const [allAppts, allUsers] = await Promise.all([
        getAllAppointments(),
        getAllUsers().catch(() => [])
      ]);

      const usersMap = new Map<string, UserProfile>();
      const usersEmailMap = new Map<string, UserProfile>();
      allUsers.forEach((u) => {
        if (u.uid) usersMap.set(u.uid, u);
        if (u.email) usersEmailMap.set(u.email.toLowerCase(), u);
      });

      const rawTrainingAppts = allAppts.filter(
        (a: any) =>
          a.isTraining === true ||
          a.type === 'Teams Training Session' ||
          (a.leadId && String(a.leadId).startsWith('training-')) ||
          (a.notes && String(a.notes).toLowerCase().includes('prospectplus training session'))
      );

      const enrichedAppts = rawTrainingAppts.map((a: any) => {
        const userId =
          a.franchiseeUserId ||
          a.userId ||
          (a.leadId && a.leadId.startsWith('training-') ? a.leadId.replace('training-', '') : null);
        const email = (a.franchiseeEmail || a.userEmail || '').toLowerCase();

        const userObj = (userId ? usersMap.get(userId) : null) || (email ? usersEmailMap.get(email) : null);

        let franName = a.franchisee || a.franchiseeName;
        if (!franName || franName === 'Franchisee Territory' || franName === 'Franchise Territory' || franName === 'My Franchise') {
          if (userObj?.franchisee) franName = userObj.franchisee;
          else if ((userObj as any)?.linkedFranchisees?.[0]?.franchiseeName) franName = (userObj as any).linkedFranchisees[0].franchiseeName;
          else franName = 'MailPlus Territory';
        }

        let userName = a.franchiseeUserName || a.userName;
        if (!userName || userName === 'Franchisee User' || userName === 'Franchisee') {
          if (userObj) {
            userName = userObj.displayName || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.name || userObj.email;
          } else {
            userName = 'Franchisee User';
          }
        }

        let userEmail = a.franchiseeEmail || a.userEmail;
        if (!userEmail || userEmail === 'N/A' || !userEmail.includes('@')) {
          if (userObj?.email) userEmail = userObj.email;
          else userEmail = 'N/A';
        }

        return {
          ...a,
          franchisee: franName,
          franchiseeUserName: userName,
          franchiseeEmail: userEmail
        };
      });

      setAppointments(enrichedAppts);
    } catch (err) {
      console.error('Failed to fetch training appointments:', err);
      toast.error('Failed to load training appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && hasAccess) {
      fetchTrainingAppointments();
    }
  }, [authLoading, hasAccess]);

  // Derived KPI & Filtered Appointments
  const filteredAppointments = useMemo(() => {
    const nowStr = formatInTimezone(new Date(), 'Australia/Sydney', 'yyyy-MM-dd');
    const currentMonthStr = formatInTimezone(new Date(), 'Australia/Sydney', 'yyyy-MM');

    return appointments.filter((appt: any) => {
      const status = appt.appointmentStatus || 'Pending';
      if (selectedStatus !== 'ALL' && status !== selectedStatus) return false;

      const apptDateVal = appt.duedate || appt.appointmentDate || appt.createdAt;
      const apptDateStr = apptDateVal
        ? formatInTimezone(new Date(apptDateVal), 'Australia/Sydney', 'yyyy-MM-dd')
        : '';
      const apptMonthStr = apptDateVal
        ? formatInTimezone(new Date(apptDateVal), 'Australia/Sydney', 'yyyy-MM')
        : '';

      if (dateFilter === 'THIS_MONTH' && apptMonthStr !== currentMonthStr) return false;
      if (dateFilter === 'PAST' && apptDateStr >= nowStr) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const fran = (appt.franchisee || appt.franchiseeName || '').toLowerCase();
        const userN = (appt.franchiseeUserName || appt.userName || '').toLowerCase();
        const userE = (appt.franchiseeEmail || appt.userEmail || '').toLowerCase();
        const notesText = (appt.notes || appt.statusNotes || '').toLowerCase();
        const title = (appt.leadName || '').toLowerCase();

        return (
          fran.includes(query) ||
          userN.includes(query) ||
          userE.includes(query) ||
          notesText.includes(query) ||
          title.includes(query)
        );
      }

      return true;
    });
  }, [appointments, selectedStatus, dateFilter, searchTerm]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    const total = appointments.length;
    let completed = 0;
    let pending = 0;
    let cancelled = 0;
    let noShow = 0;
    let rescheduled = 0;

    const franchiseeCounts: Record<string, number> = {};

    appointments.forEach((a: any) => {
      const status = a.appointmentStatus || 'Pending';
      if (status === 'Completed') completed++;
      else if (status === 'Pending' || status === 'Scheduled') pending++;
      else if (status === 'Cancelled') cancelled++;
      else if (status === 'No Show') noShow++;
      else if (status === 'Rescheduled') rescheduled++;

      const fran = a.franchisee || a.franchiseeName || 'Unknown Territory';
      franchiseeCounts[fran] = (franchiseeCounts[fran] || 0) + 1;
    });

    const completedRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const noShowRate = total > 0 ? Math.round(((noShow + cancelled) / total) * 100) : 0;

    const topFranchisees = Object.entries(franchiseeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total,
      completed,
      pending,
      cancelled,
      noShow,
      rescheduled,
      completedRate,
      noShowRate,
      topFranchisees
    };
  }, [appointments]);

  // Update Status API Handler
  const handleUpdateStatus = async () => {
    if (!selectedAppt || !actionType) return;
    setIsSubmitting(true);

    try {
      if (actionType === 'CANCEL') {
        const res = await fetch('/api/calendar/cancel-appointment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: selectedAppt.id,
            leadId: selectedAppt.leadId,
            reason: cancelReason || actionNotes || 'Cancelled via Aleyna Training Dashboard',
            cancelledBy: userProfile?.displayName || user?.displayName || 'Aleyna Harnett',
            userEmail: user?.email || userProfile?.email || ''
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to cancel training appointment');
        toast.success('Training session cancelled and participants notified via email.');
      } else {
        const newStatus =
          actionType === 'COMPLETE'
            ? 'Completed'
            : actionType === 'NOSHOW'
            ? 'No Show'
            : actionType === 'RESCHEDULE'
            ? 'Rescheduled'
            : 'Pending';

        let notesText = actionNotes;
        if (actionType === 'RESCHEDULE' && rescheduleDate) {
          notesText = `Rescheduled to ${rescheduleDate} at ${rescheduleTime}.${actionNotes ? ` Notes: ${actionNotes}` : ''}`;
        }

        const res = await fetch('/api/calendar/update-training-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: selectedAppt.id,
            leadId: selectedAppt.leadId,
            status: newStatus,
            notes: notesText,
            updatedBy: userProfile?.displayName || user?.displayName || 'Aleyna Harnett',
            userEmail: user?.email || userProfile?.email || ''
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update appointment status');
        toast.success(`Appointment marked as ${newStatus}!`);
      }

      // Close Modal & Refresh List
      setActionType(null);
      setSelectedAppt(null);
      setActionNotes('');
      setCancelReason('');
      await fetchTrainingAppointments();
    } catch (err: any) {
      console.error('Status update error:', err);
      toast.error(err.message || 'Could not update appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader className="h-6 w-6 text-[#095c7b]" />
        <p className="text-xs font-semibold text-slate-500">Authenticating session...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied customPageName="Franchisee Training Sessions" />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* BRAND BANNER HEADER */}
      <div className="bg-gradient-to-r from-[#095c7b] via-[#0b6a8e] to-[#095c7b] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#eaf143] text-[#095c7b] font-extrabold text-xs px-2.5 py-0.5 uppercase tracking-wider">
                Aleyna's Training Portal
              </Badge>
              <span className="text-xs font-medium text-slate-200 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[#eaf143]" /> Sydney Time (AEST/AEDT)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Franchisee Training Sessions
            </h1>
            <p className="text-sm text-slate-200 max-w-2xl">
              Track 1-on-1 Teams training bookings, manage session outcomes (Completed, Rescheduled, Cancelled, No Show), and review franchisee engagement analytics.
            </p>
          </div>

          <Button
            onClick={fetchTrainingAppointments}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs shrink-0 flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: TOTAL BOOKINGS */}
        <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Booked</span>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <CalendarCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">{metrics.total}</span>
              <span className="text-xs font-medium text-slate-500">Sessions</span>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: COMPLETED */}
        <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-emerald-600">{metrics.completed}</span>
              <Badge className="bg-emerald-100 text-emerald-800 font-bold text-xs">
                {metrics.completedRate}% Rate
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: UPCOMING / PENDING */}
        <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming / Pending</span>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-amber-600">{metrics.pending}</span>
              <span className="text-xs font-medium text-slate-500">Scheduled</span>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: NO SHOW / CANCELLED */}
        <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">No Show / Cancelled</span>
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <XCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-rose-600">{metrics.noShow + metrics.cancelled}</span>
              <Badge className="bg-rose-100 text-rose-800 font-bold text-xs">
                {metrics.noShowRate}% Rate
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ANALYTICS REPORTING SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* STATUS DISTRIBUTION BREAKDOWN */}
        <Card className="lg:col-span-2 border border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#095c7b]" /> Session Status Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of all franchisee training appointments by status outcome.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {/* Visual Progress Bar */}
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all"
                title="Completed"
              />
              <div
                style={{ width: `${metrics.total > 0 ? (metrics.pending / metrics.total) * 100 : 0}%` }}
                className="bg-amber-400 h-full transition-all"
                title="Upcoming / Pending"
              />
              <div
                style={{ width: `${metrics.total > 0 ? (metrics.rescheduled / metrics.total) * 100 : 0}%` }}
                className="bg-blue-400 h-full transition-all"
                title="Rescheduled"
              />
              <div
                style={{ width: `${metrics.total > 0 ? (metrics.noShow / metrics.total) * 100 : 0}%` }}
                className="bg-purple-500 h-full transition-all"
                title="No Show"
              />
              <div
                style={{ width: `${metrics.total > 0 ? (metrics.cancelled / metrics.total) * 100 : 0}%` }}
                className="bg-rose-500 h-full transition-all"
                title="Cancelled"
              />
            </div>

            {/* Status Legend Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 text-center">
                <span className="block text-[11px] font-bold text-emerald-700 uppercase">Completed</span>
                <span className="text-lg font-extrabold text-emerald-900">{metrics.completed}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-100 text-center">
                <span className="block text-[11px] font-bold text-amber-700 uppercase">Pending</span>
                <span className="text-lg font-extrabold text-amber-900">{metrics.pending}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-center">
                <span className="block text-[11px] font-bold text-blue-700 uppercase">Rescheduled</span>
                <span className="text-lg font-extrabold text-blue-900">{metrics.rescheduled}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-100 text-center">
                <span className="block text-[11px] font-bold text-purple-700 uppercase">No Show</span>
                <span className="text-lg font-extrabold text-purple-900">{metrics.noShow}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100 text-center">
                <span className="block text-[11px] font-bold text-rose-700 uppercase">Cancelled</span>
                <span className="text-lg font-extrabold text-rose-900">{metrics.cancelled}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TOP FRANCHISEES LEADERBOARD */}
        <Card className="border border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="h-4 w-4 text-[#095c7b]" /> Top Booking Territories
            </CardTitle>
            <CardDescription className="text-xs">
              Territories with the highest training engagement.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 divide-y divide-slate-100">
            {metrics.topFranchisees.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">No territory data recorded yet.</p>
            ) : (
              metrics.topFranchisees.map(([franName, count], idx) => (
                <div key={franName} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={franName}>
                    {idx + 1}. {franName}
                  </span>
                  <Badge variant="secondary" className="font-bold text-[11px] bg-slate-100 text-slate-700">
                    {count} {count === 1 ? 'session' : 'sessions'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* APPOINTMENTS TABLE & CONTROLS */}
      <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#095c7b]" /> Training Session Appointments
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Manage all booked 1-on-1 Teams sessions with Aleyna.
              </CardDescription>
            </div>

            {/* SEARCH & FILTER BAR */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  type="text"
                  placeholder="Search franchisee, name, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-lg"
                />
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending / Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No Show">No Show</option>
              </select>

              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e: any) => setDateFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
              >
                <option value="ALL">All Dates</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="PAST">Past Dates</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader className="h-6 w-6 text-[#095c7b]" />
              <p className="text-xs font-semibold text-slate-500">Loading franchisee appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="py-16 text-center border-b border-slate-100 bg-slate-50/30">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No appointments found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No franchisee training sessions match your current search and filter criteria.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredAppointments.map((appt: any) => {
                const status = appt.appointmentStatus || 'Pending';
                const apptDate = appt.duedate ? new Date(appt.duedate) : null;
                const formattedDate = apptDate && !isNaN(apptDate.getTime())
                  ? formatInTimezone(apptDate, 'Australia/Sydney', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                  : appt.appointmentDate || 'N/A';
                const timeSlot = appt.starttime || appt.timeSlot || 'Scheduled Time';
                const franName = appt.franchisee || appt.franchiseeName || 'Franchisee Territory';
                const userName = appt.franchiseeUserName || appt.userName || 'Franchisee User';
                const userEmail = appt.franchiseeEmail || appt.userEmail || 'N/A';
                const joinUrl = appt.joinUrl || appt.teamsUrl;

                let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                if (status === 'Completed') statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold';
                else if (status === 'Pending' || status === 'Scheduled') statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
                else if (status === 'Rescheduled') statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200 font-bold';
                else if (status === 'Cancelled') statusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-200 font-bold';
                else if (status === 'No Show') statusBadgeClass = 'bg-purple-100 text-purple-800 border-purple-200 font-bold';

                return (
                  <div key={appt.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* LEFT: Appointment Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${statusBadgeClass} text-[11px] px-2.5 py-0.5 border`}>
                          {status}
                        </Badge>
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-[#095c7b]" /> {franName}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-400" /> {userName}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Mail className="h-3.5 w-3.5 text-slate-400" /> {userEmail}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 pt-1">
                        <span className="flex items-center gap-1 text-[#095c7b] font-bold">
                          <Clock className="h-3.5 w-3.5" /> {formattedDate} at {timeSlot} (Sydney Time)
                        </span>

                        {joinUrl && (
                          <a
                            href={joinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 underline"
                          >
                            <Video className="h-3.5 w-3.5" /> Join Teams Meeting
                          </a>
                        )}
                      </div>

                      {appt.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-100/70 p-2 rounded-md mt-1 border border-slate-200/50">
                          Notes: {appt.notes}
                        </p>
                      )}
                    </div>

                    {/* RIGHT: Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {/* Mark Completed */}
                      {status !== 'Completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAppt(appt);
                            setActionType('COMPLETE');
                            setActionNotes('');
                          }}
                          className="h-8 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                        </Button>
                      )}

                      {/* Mark Reschedule */}
                      {status !== 'Completed' && status !== 'Cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAppt(appt);
                            setActionType('RESCHEDULE');
                            setActionNotes('');
                          }}
                          className="h-8 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
                        >
                          <Clock className="h-3.5 w-3.5 mr-1" /> Reschedule
                        </Button>
                      )}

                      {/* Mark No-Show */}
                      {status !== 'Completed' && status !== 'No Show' && status !== 'Cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAppt(appt);
                            setActionType('NOSHOW');
                            setActionNotes('');
                          }}
                          className="h-8 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" /> No Show
                        </Button>
                      )}

                      {/* Mark Cancelled */}
                      {status !== 'Cancelled' && status !== 'Completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAppt(appt);
                            setActionType('CANCEL');
                            setCancelReason('');
                          }}
                          className="h-8 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ACTION DIALOG MODAL */}
      <Dialog open={!!actionType} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {actionType === 'COMPLETE' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {actionType === 'RESCHEDULE' && <Clock className="h-5 w-5 text-blue-600" />}
              {actionType === 'CANCEL' && <XCircle className="h-5 w-5 text-rose-600" />}
              {actionType === 'NOSHOW' && <AlertTriangle className="h-5 w-5 text-purple-600" />}
              {actionType === 'COMPLETE' && 'Mark Session as Completed'}
              {actionType === 'RESCHEDULE' && 'Reschedule Session'}
              {actionType === 'CANCEL' && 'Cancel Training Session'}
              {actionType === 'NOSHOW' && 'Mark Franchisee as No Show'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Updating training session for{' '}
              <strong>{selectedAppt?.franchisee || selectedAppt?.franchiseeUserName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Cancel Reason */}
            {actionType === 'CANCEL' && (
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Reason for Cancellation:</label>
                <Textarea
                  placeholder="e.g. Franchisee requested cancellation due to scheduling conflict..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="text-xs bg-slate-50 border-slate-200"
                />
              </div>
            )}

            {/* Reschedule Date/Time Inputs */}
            {actionType === 'RESCHEDULE' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">New Date:</label>
                    <Input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="text-xs bg-slate-50 border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">New Time:</label>
                    <select
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md font-medium"
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="01:00 PM">01:00 PM</option>
                      <option value="01:30 PM">01:30 PM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="02:30 PM">02:30 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                      <option value="03:30 PM">03:30 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Optional Notes */}
            {actionType !== 'CANCEL' && (
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Notes / Comments (Optional):</label>
                <Textarea
                  placeholder="Add session notes, follow-up items, or feedback..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="text-xs bg-slate-50 border-slate-200"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionType(null)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateStatus}
              disabled={isSubmitting}
              className={`text-xs font-bold ${
                actionType === 'CANCEL'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : actionType === 'COMPLETE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-[#095c7b] hover:bg-[#084b64] text-white'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Confirm Outcome'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
