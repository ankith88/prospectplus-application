'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { FranchiseeSwitcher } from '@/components/franchisee-switcher';
import { getLeadsFromFirebase, getAllAppointments } from '@/services/firebase';
import type { Lead, Appointment, Task } from '@/lib/types';
import { AccessDenied } from '@/components/access-denied';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarWidget } from '@/components/ui/calendar';
import { Loader } from '@/components/ui/loader';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { addDays, startOfDay, isBefore, format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Calendar as CalendarIcon,
  Clock,
  PlusCircle,
  Briefcase,
  BarChart3,
  Video,
  ExternalLink,
  Mail,
  UserCheck,
  Sparkles,
  TrendingUp,
  ArrowRight,
  PlayCircle,
  Store,
  Flame,
  Zap,
  Info,
  ChevronRight,
  Bell,
  Users,
  CheckCircle2,
  CalendarCheck,
  CheckSquare,
  ListTodo,
  XCircle,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface AvailableSlot {
  start: string;
  end: string;
  formattedTime: string;
}

export default function FranchiseeHomeClient() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selected date on calendar widget
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  // Booking Modal States - Earliest booking date is TOMORROW (no same-day or past)
  const tomorrow = useMemo(() => addDays(startOfDay(new Date()), 1), []);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState<Date | undefined>(tomorrow);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 AM');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [additionalEmails, setAdditionalEmails] = useState<string>('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [confirmedJoinUrl, setConfirmedJoinUrl] = useState<string | null>(null);

  const isFranchiseeRole =
    userProfile?.activeRole === 'Franchisee' ||
    userProfile?.activeRole?.toLowerCase() === 'franchisee';

  // Identify active franchisee ID and name
  const currentFranId = useMemo(() => {
    if (!userProfile) return null;
    return userProfile.activeFranchiseeId || userProfile.franchiseeId || userProfile.franchiseeInternalId || null;
  }, [userProfile]);

  const activeFranName = useMemo(() => {
    if (!userProfile) return 'Franchise Territory';
    const linked = userProfile.linkedFranchisees || [];
    const active = linked.find((f) => f.franchiseeId === currentFranId);
    return active?.franchiseeName || userProfile.franchisee || 'My Franchise';
  }, [userProfile, currentFranId]);

  const userDisplayName = userProfile?.displayName || user?.displayName || 'Franchisee';

  // Function to refresh appointments
  const refreshAppointments = async () => {
    try {
      const fetchedAppts = await getAllAppointments();
      setAppointments(fetchedAppts);
    } catch (err) {
      console.error('Failed to refresh appointments:', err);
    }
  };

  // Load leads, appointments, and trigger day-of reminder check
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setLoadingData(true);
      try {
        const [fetchedLeads, fetchedAppts] = await Promise.all([
          getLeadsFromFirebase({ summary: true }),
          getAllAppointments().catch(() => [])
        ]);

        // Filter leads for this franchisee territory if applicable
        const territoryLeads = fetchedLeads.filter((l) => {
          if (!currentFranId && !userProfile?.franchisee) return true;
          const leadFranId = l.franchisee_id || (l as any).franchiseeId || (l as any).franchiseeInternalId;
          const matchesFranId =
            leadFranId === currentFranId ||
            userProfile?.linkedFranchiseeIds?.includes(leadFranId || '');
          const matchesFranName = l.franchisee === activeFranName || l.franchisee === userProfile?.franchisee;
          return matchesFranId || matchesFranName;
        });

        setLeads(territoryLeads.length > 0 ? territoryLeads : fetchedLeads);
        setAppointments(fetchedAppts);

        // Background call to process day-of email reminders for training sessions
        fetch('/api/calendar/training-reminders').catch(() => {});
      } catch (error) {
        console.error('Failed to load franchisee home data:', error);
      } finally {
        setLoadingData(false);
      }
    }

    if (!authLoading) {
      loadData();
    }
  }, [user, userProfile, authLoading, currentFranId, activeFranName]);

  // Fetch real Teams calendar availability for Aleyna when bookingDate changes
  useEffect(() => {
    async function fetchAleynaAvailability() {
      if (!bookingDate || !isBookingOpen) return;
      setLoadingSlots(true);
      try {
        const dateStr = format(bookingDate, 'yyyy-MM-dd');
        const res = await fetch(`/api/calendar/availability?email=aleyna.harnett@mailplus.com.au&date=${dateStr}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.slots) && data.slots.length > 0) {
          setAvailableSlots(data.slots);
          setSelectedSlot(data.slots[0].formattedTime || '10:00 AM');
        } else {
          setAvailableSlots([]);
        }
      } catch (err) {
        console.error('Failed to fetch Aleyna availability:', err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchAleynaAvailability();
  }, [bookingDate, isBookingOpen]);

  // Map lead IDs to company names
  const leadsMap = useMemo(() => {
    return new Map(leads.map((l) => [l.id, l.companyName]));
  }, [leads]);

  // Set of lead IDs belonging to the logged in franchisee territory
  const territoryLeadIds = useMemo(() => {
    return new Set(leads.map((l) => l.id));
  }, [leads]);

  // Calculate territory lead metrics & distribution breakdown
  const metrics = useMemo(() => {
    const total = leads.length;
    const quotesSent = leads.filter(
      (l) => l.status === 'In Progress' || l.status === 'Contacted' || l.status === 'Pre Qualified'
    ).length;
    const activeTrials = leads.filter((l) => l.status === 'Qualified' || l.status === 'LPO Review').length;
    const wonLeads = leads.filter((l) => l.status === 'Won').length;

    return {
      total,
      quotesSent,
      activeTrials,
      wonLeads,
    };
  }, [leads]);

  // Detailed distribution of leads based on requested categories
  const leadDistribution = useMemo(() => {
    const quoteSentAccepted = leads.filter((l) =>
      ['Quote Sent', 'Quote Accepted'].includes(l.status as string)
    ).length;

    const localMileTrial = leads.filter(
      (l) =>
        ['Trialing LocalMile', 'LocalMile Pending', 'LocalMile Opportunity', 'LocalMile Trial'].includes(l.status as string) ||
        ((l as any).trialType || '').toLowerCase().includes('localmile')
    ).length;

    const shipMateTrial = leads.filter(
      (l) =>
        ['Trialing ShipMate', 'ShipMate Trial', 'Free Trial'].includes(l.status as string) ||
        ((l as any).trialType || '').toLowerCase().includes('shipmate')
    ).length;

    const workInProgress = leads.filter((l) =>
      [
        'In Progress',
        'Contacted',
        'Connected',
        'In Qualification',
        'Qualified',
        'Pre Qualified',
        'Reschedule',
        'Future Follow-up',
        'High Touch'
      ].includes(l.status as string)
    ).length;

    const hotPriorityLeads = leads.filter(
      (l) =>
        ['Hot Lead', 'Priority Lead', 'Priority Field Lead'].includes(l.status as string) ||
        (l as any).priority === 'High' ||
        (l as any).isHot === true
    ).length;

    const newLeads = leads.filter(
      (l) => ['New', 'New Lead', 'Uncontacted'].includes(l.status as string) || !l.status
    ).length;

    return {
      quoteSentAccepted,
      localMileTrial,
      shipMateTrial,
      workInProgress,
      hotPriorityLeads,
      newLeads
    };
  }, [leads]);

  // Current Month Performance Snapshot (High level view of current month only)
  const currentMonthSnapshot = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthName = now.toLocaleString('en-AU', { month: 'long', year: 'numeric' });

    // Filter leads created or active in current month
    const thisMonthLeads = leads.filter((l) => {
      const dateVal = (l as any).createdAt || (l as any).created_at || (l as any).updatedAt || (l as any).updated_at;
      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const pool = thisMonthLeads.length > 0 ? thisMonthLeads : leads;
    const totalLeads = pool.length;
    const wonLeads = pool.filter((l) => l.status === 'Won').length;
    const inDiscussion = pool.filter((l) =>
      ['In Progress', 'Contacted', 'Pre Qualified', 'Quote Sent', 'Quote Accepted', 'Qualified'].includes(l.status as string)
    ).length;
    const quotesSent = pool.filter((l) =>
      ['Quote Sent', 'Quote Accepted'].includes(l.status as string)
    ).length;

    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    return {
      monthName,
      totalLeads,
      wonLeads,
      inDiscussion,
      quotesSent,
      conversionRate
    };
  }, [leads]);

  // Label for 3-month appointment scope window (Prev Month, Current Month, Next Month)
  const threeMonthWindowLabel = useMemo(() => {
    const now = new Date();
    const prevM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const nextM = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevStr = prevM.toLocaleString('en-AU', { month: 'short' });
    const nextStr = nextM.toLocaleString('en-AU', { month: 'short', year: 'numeric' });
    return `${prevStr} – ${nextStr}`;
  }, []);

  // Filter appointments specifically linked ONLY to this franchisee's leads/companies OR Aleyna training,
  // restricted to Previous Month, Current Month, and Next Month
  const franchiseeAppointments = useMemo(() => {
    const now = new Date();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);

    return appointments.filter((appt) => {
      const isTerritoryLead = territoryLeadIds.has(appt.leadId);
      const isAleyna =
        appt.assignedTo === 'Aleyna Harnett' ||
        (appt as any).isTeams === true ||
        appt.type === 'Teams Training Session' ||
        (appt as any).isTraining === true;
      const isAssignedToUser =
        appt.assignedTo === userDisplayName ||
        appt.assignedTo === userProfile?.email ||
        (appt as any).franchiseeUserId === user?.uid;
      const isTerritoryFran =
        (appt as any).franchisee === activeFranName ||
        (appt as any).franchisee === userProfile?.franchisee;

      const matchesContext = isTerritoryLead || isAleyna || isAssignedToUser || isTerritoryFran;
      if (!matchesContext) return false;

      // Restrict date range to Previous Month, Current Month, and Next Month
      const rawDate = appt.duedate || appt.appointmentDate || (appt as any).createdAt || (appt as any).created_at;
      if (!rawDate) return true;
      const apptDate = new Date(rawDate);
      if (isNaN(apptDate.getTime())) return true;

      return apptDate >= startOfPrevMonth && apptDate <= endOfNextMonth;
    });
  }, [appointments, territoryLeadIds, userDisplayName, userProfile, activeFranName, user?.uid]);

  // Categorized appointments for status tabs
  const scheduledAppts = useMemo(() => {
    return franchiseeAppointments.filter(
      (a) =>
        !a.appointmentStatus ||
        (a.appointmentStatus as string) === 'Scheduled' ||
        (a.appointmentStatus as string) === 'Upcoming'
    );
  }, [franchiseeAppointments]);

  const pendingAppts = useMemo(() => {
    return franchiseeAppointments.filter((a) => a.appointmentStatus === 'Pending');
  }, [franchiseeAppointments]);

  const completedAppts = useMemo(() => {
    return franchiseeAppointments.filter((a) => a.appointmentStatus === 'Completed');
  }, [franchiseeAppointments]);

  const noShowAppts = useMemo(() => {
    return franchiseeAppointments.filter(
      (a) => a.appointmentStatus === 'No Show' || a.appointmentStatus === 'Cancelled' || a.appointmentStatus === 'Rescheduled'
    );
  }, [franchiseeAppointments]);

  // Aleyna Training Appointments (Dedicated separate tab)
  const aleynaAppts = useMemo(() => {
    return franchiseeAppointments.filter(
      (a) =>
        a.assignedTo === 'Aleyna Harnett' ||
        (a as any).isTeams === true ||
        a.type === 'Teams Training Session' ||
        (a as any).isTraining === true
    );
  }, [franchiseeAppointments]);

  // Agenda appointments for selected date on home calendar widget
  const dayAppointments = useMemo(() => {
    if (!selectedDate) return franchiseeAppointments.slice(0, 5);
    const dateStr = selectedDate.toISOString().split('T')[0];
    return franchiseeAppointments.filter((a) => {
      if (!a.duedate) return false;
      const apptDateStr = new Date(a.duedate).toISOString().split('T')[0];
      return apptDateStr === dateStr;
    });
  }, [franchiseeAppointments, selectedDate]);

  // Helper renderer for appointment list inside tab content
  const renderAppointmentList = (list: Appointment[], emptyMsg: string) => {
    if (loadingData) {
      return (
        <div className="py-12 flex justify-center">
          <Loader />
        </div>
      );
    }

    if (!list || list.length === 0) {
      return (
        <div className="py-10 flex flex-col items-center justify-center text-center space-y-3 border-2 border-dashed rounded-xl bg-slate-50/40">
          <div className="p-3 rounded-full bg-slate-100 text-slate-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-xs text-slate-500 max-w-sm">{emptyMsg}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
        {list.map((appt) => {
          const leadCompanyName =
            (appt as any).leadName ||
            leadsMap.get(appt.leadId) ||
            (appt.type === 'Teams Training Session' ? 'ProspectPlus Training Session with Aleyna' : 'Scheduled Appointment');

          const apptDate = appt.duedate ? new Date(appt.duedate) : appt.appointmentDate ? new Date(appt.appointmentDate) : null;
          let dateFormatted = 'N/A';
          if (apptDate && !isNaN(apptDate.getTime())) {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const apptStr = format(apptDate, 'yyyy-MM-dd');
            dateFormatted = apptStr === todayStr
              ? `Today at ${appt.starttime || 'Scheduled time'}`
              : `${apptDate.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })}${appt.starttime ? ` at ${appt.starttime}` : ''}`;
          }

          const isTeams = (appt as any).isTeams || appt.type === 'Teams Training Session' || (appt as any).meetingType === 'teams';
          const status = appt.appointmentStatus || 'Scheduled';
          const joinUrl = (appt as any).joinUrl || (appt as any).teamsUrl;

          let statusBadgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
          if (status === 'Completed') statusBadgeVariant = 'default';
          else if (status === 'No Show' || status === 'Cancelled') statusBadgeVariant = 'destructive';
          else if (status === 'Pending') statusBadgeVariant = 'outline';

          return (
            <div
              key={appt.id}
              className="p-4 rounded-xl border bg-white hover:border-[#095c7b]/40 transition-all shadow-sm space-y-2 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-[#095c7b]/10 text-[#095c7b]">
                    {isTeams ? <Video className="h-4 w-4 text-blue-600" /> : <CalendarIcon className="h-4 w-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 group-hover:text-[#095c7b] transition-colors">
                      {leadCompanyName}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Host: <strong>{appt.assignedTo || 'Aleyna Harnett'}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isTeams && (
                    <Badge className="bg-blue-600 text-white font-bold text-[10px]">
                      Teams
                    </Badge>
                  )}
                  <Badge variant={statusBadgeVariant} className="text-[10px] font-semibold">
                    {status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 font-medium border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-[#095c7b]" /> {dateFormatted}
                </span>
                <div className="flex items-center gap-2">
                  {joinUrl && (
                    <a
                      href={joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 font-bold underline hover:text-blue-800 flex items-center gap-1"
                    >
                      <Video className="h-3 w-3" /> Join Teams
                    </a>
                  )}
                  {appt.leadId && (
                    <Button
                      variant="link"
                      size="sm"
                      asChild
                      className="p-0 h-auto text-xs text-[#095c7b] font-bold hover:underline"
                    >
                      <Link href={`/leads/${appt.leadId}`} className="flex items-center gap-1">
                        View Lead <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Handle Confirm Booking with Aleyna via Teams
  const handleConfirmTeamsBooking = async () => {
    if (!bookingDate || !selectedSlot) {
      toast.error('Please select a date and time slot.');
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const res = await fetch('/api/calendar/book-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: bookingDate.toISOString(),
          timeSlot: selectedSlot,
          franchiseeName: activeFranName,
          userEmail: user?.email || userProfile?.email || 'franchisee@mailplus.com.au',
          userName: userProfile?.displayName || user?.displayName || 'Franchisee User',
          userId: user?.uid || '',
          notes: bookingNotes,
          additionalEmails
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule appointment');

      setConfirmedJoinUrl(data.joinUrl);
      setBookingSuccess(true);
      toast.success('Training Session Scheduled via Teams!', {
        description: `Marked on your calendar for ${bookingDate.toLocaleDateString()} at ${selectedSlot}`
      });

      // Refresh appointments to immediately display on home calendar widget
      await refreshAppointments();
    } catch (err: any) {
      console.error('Booking error:', err);
      toast.error(err.message || 'Could not schedule appointment');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (userProfile && !isFranchiseeRole) {
    return <AccessDenied customPageName="Franchisee Home Page" />;
  }

  const userFirstName = userProfile?.displayName
    ? userProfile.displayName.split(' ')[0]
    : user?.displayName
    ? user.displayName.split(' ')[0]
    : 'Franchisee';

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#095c7b] via-[#0b6a8d] to-[#0d7ca5] text-white p-6 rounded-2xl shadow-md border border-[#095c7b]/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome to Your <span className="font-extrabold text-[#eaf143]">ProspectPlus</span> Homepage!
            </h1>
          </div>
          <p className="text-slate-100 text-sm sm:text-base font-medium">
            Welcome back, <strong className="text-[#eaf143]">{userFirstName}</strong>! Here is your central hub for managing territory leads, appointments, and sales reporting.
          </p>
        </div>

        {/* Territory Switcher & Primary Create Lead CTA Button */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
            <Store className="h-5 w-5 text-[#eaf143] shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-200 tracking-wider">Active Territory</span>
              <span className="text-sm font-bold text-white">{activeFranName}</span>
            </div>
            <FranchiseeSwitcher />
          </div>

          <Button
            asChild
            className="bg-[#eaf143] hover:bg-[#dce336] text-[#095c7b] font-extrabold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 h-11 px-5 rounded-xl border border-yellow-300 shrink-0"
          >
            <Link href="/leads/new">
              <PlusCircle className="h-5 w-5 text-[#095c7b]" />
              <span>Create New Lead</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* HERO QUICK METRICS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-[#095c7b]/20 bg-gradient-to-br from-emerald-500/10 via-white to-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">This Month Conversion</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{currentMonthSnapshot.conversionRate}%</span>
                <span className="text-[11px] text-emerald-700 font-semibold truncate">{currentMonthSnapshot.wonLeads} Won</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#095c7b]/20 bg-gradient-to-br from-indigo-500/10 via-white to-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Total Territory Leads</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{metrics.total}</span>
                <span className="text-[11px] text-slate-500 font-medium">In Pipeline</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#095c7b]/20 bg-gradient-to-br from-amber-500/10 via-white to-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Appointments Scope</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{franchiseeAppointments.length}</span>
                <span className="text-[11px] text-amber-700 font-semibold truncate">3-Month Window</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#095c7b]/20 bg-gradient-to-br from-teal-500/10 via-white to-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Current Month Wins</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{currentMonthSnapshot.wonLeads}</span>
                <span className="text-[11px] text-teal-700 font-semibold truncate">{currentMonthSnapshot.monthName}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 1: CALENDAR & REMINDERS/UPDATES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CALENDAR SECTION (Top Left - 5 cols) */}
        <Card className="lg:col-span-5 flex flex-col border-[#095c7b]/30 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-slate-50/80 border-b pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#095c7b]/10 text-[#095c7b]">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-[#095c7b]">Calendar:</CardTitle>
                  <CardDescription className="text-xs">Scheduled appointments & follow-ups</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs text-[#095c7b] hover:text-[#095c7b]/80">
                <Link href="/appointments" className="flex items-center gap-1 font-semibold">
                  View All <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col items-center justify-between gap-4">
            <div className="w-full flex justify-center border rounded-xl p-2 bg-white shadow-inner">
              <CalendarWidget
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
              />
            </div>

            {/* Agenda list for selected date */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                <span>Schedule ({selectedDate ? selectedDate.toLocaleDateString() : 'Today'})</span>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {dayAppointments.length} Event(s)
                </Badge>
              </div>

              {loadingData ? (
                <div className="py-4 flex justify-center">
                  <Loader />
                </div>
              ) : dayAppointments.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {dayAppointments.map((appt) => {
                    const leadCompanyName =
                      (appt as any).leadName ||
                      leadsMap.get(appt.leadId) ||
                      'Scheduled Appointment';
                    const isTeams = (appt as any).isTeams || appt.type === 'Teams Training Session' || (appt as any).meetingType === 'teams';

                    return (
                      <div
                        key={appt.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border bg-slate-50/50 hover:bg-slate-100/80 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Clock className="h-3.5 w-3.5 text-[#095c7b] shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{leadCompanyName}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isTeams && (
                            <Badge className="bg-blue-600 text-white text-[9px] font-bold">
                              Teams
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] bg-[#095c7b]/10 text-[#095c7b]">
                            {appt.starttime || 'Scheduled'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-center border rounded-lg bg-slate-50/40 text-slate-500 text-xs flex items-center justify-center gap-2">
                  <Info className="h-4 w-4 text-slate-400" />
                  No meetings or tasks scheduled for this date.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* REMINDERS / UPDATES SECTION - TABBED LAYOUT FOR APPOINTMENT STATUSES + ALEYNA TRAINING */}
        <Card className="lg:col-span-7 flex flex-col border-[#095c7b]/30 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-slate-50/80 border-b pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#095c7b]/10 text-[#095c7b]">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg font-bold text-[#095c7b]">Reminders/Updates?</CardTitle>
                    <Badge variant="outline" className="bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/30 text-[10px] font-bold">
                      📅 Scope: 3-Month Window ({threeMonthWindowLabel})
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Appointments across Previous, Current, & Next Month ({threeMonthWindowLabel})
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] font-bold text-xs">
                {franchiseeAppointments.length} Appointments
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
            <Tabs defaultValue="scheduled" className="w-full flex-1 flex flex-col">
              <TabsList className="grid grid-cols-5 w-full bg-slate-100 p-1 rounded-xl text-xs">
                <TabsTrigger value="scheduled" className="text-[11px] font-bold py-1.5">
                  Scheduled ({scheduledAppts.length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-[11px] font-bold py-1.5">
                  Pending ({pendingAppts.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-[11px] font-bold py-1.5">
                  Completed ({completedAppts.length})
                </TabsTrigger>
                <TabsTrigger value="noshow" className="text-[11px] font-bold py-1.5">
                  No Show ({noShowAppts.length})
                </TabsTrigger>
                <TabsTrigger
                  value="aleyna"
                  className="text-[11px] font-bold py-1.5 data-[state=active]:bg-[#095c7b] data-[state=active]:text-white flex items-center gap-1 justify-center"
                >
                  <Video className="h-3 w-3" />
                  Aleyna ({aleynaAppts.length})
                </TabsTrigger>
              </TabsList>

              {/* TAB CONTENT: SCHEDULED */}
              <TabsContent value="scheduled" className="mt-3 flex-1">
                {renderAppointmentList(scheduledAppts, 'No scheduled appointments for your territory leads.')}
              </TabsContent>

              {/* TAB CONTENT: PENDING */}
              <TabsContent value="pending" className="mt-3 flex-1">
                {renderAppointmentList(pendingAppts, 'No pending appointments for your territory leads.')}
              </TabsContent>

              {/* TAB CONTENT: COMPLETED */}
              <TabsContent value="completed" className="mt-3 flex-1">
                {renderAppointmentList(completedAppts, 'No completed appointments yet.')}
              </TabsContent>

              {/* TAB CONTENT: NO SHOW / CANCELLED */}
              <TabsContent value="noshow" className="mt-3 flex-1">
                {renderAppointmentList(noShowAppts, 'No "No Show" or cancelled appointments.')}
              </TabsContent>

              {/* TAB CONTENT: ALEYNA TRAINING */}
              <TabsContent value="aleyna" className="mt-3 flex-1">
                {renderAppointmentList(
                  aleynaAppts,
                  'No training sessions scheduled with Aleyna yet. Click "Book Training Session with Aleyna" below to schedule one!'
                )}
              </TabsContent>
            </Tabs>

            {/* Quick Action Footer */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#095c7b]/10 to-[#095c7b]/5 border border-[#095c7b]/20 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Zap className="h-4 w-4 text-[#095c7b] shrink-0" />
                <span className="text-slate-700 font-medium">
                  <strong>Tip</strong>: Use the tabs above to filter by status or view your 1-on-1 Teams training sessions with Aleyna.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: ALL LEADS HUB & SALES PROCESS SNAPSHOT (CURRENT MONTH VIEW) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: ALL LEADS BREAKDOWN */}
        <Card className="flex flex-col border-2 border-[#095c7b] shadow-md hover:shadow-lg transition-all bg-gradient-to-b from-white to-slate-50/50 group">
          <CardHeader className="pb-3 border-b border-[#095c7b]/20 bg-[#095c7b]/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#095c7b] text-white shadow-sm group-hover:scale-105 transition-transform">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-extrabold text-[#095c7b]">All Leads:</CardTitle>
                  <CardDescription className="text-xs">Live distribution across territory pipeline</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-[#095c7b]/10 text-[#095c7b] font-bold text-xs">
                {metrics.total} Total Leads
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Comprehensive breakdown of your territory leads grouped by active trial types, quote status, work in progress, and lead priorities.
            </p>

            {/* Territory Live Lead Distribution Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 flex flex-col justify-between shadow-xs">
                <span className="text-[11px] text-amber-800 font-semibold truncate">Quote Sent / Accepted</span>
                <span className="text-lg font-extrabold text-amber-900 mt-1">{leadDistribution.quoteSentAccepted}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 flex flex-col justify-between shadow-xs">
                <span className="text-[11px] text-emerald-800 font-semibold truncate">In LocalMile Trial</span>
                <span className="text-lg font-extrabold text-emerald-900 mt-1">{leadDistribution.localMileTrial}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50/90 border border-indigo-200 flex flex-col justify-between shadow-xs">
                <span className="text-[11px] text-indigo-800 font-semibold truncate">ShipMate Trial</span>
                <span className="text-lg font-extrabold text-indigo-900 mt-1">{leadDistribution.shipMateTrial}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-50/90 border border-sky-200 flex flex-col justify-between shadow-xs">
                <span className="text-[11px] text-sky-800 font-semibold truncate">Work In Progress</span>
                <span className="text-lg font-extrabold text-sky-900 mt-1">{leadDistribution.workInProgress}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50/90 border border-rose-200 flex flex-col justify-between shadow-xs">
                <span className="text-[11px] text-rose-800 font-semibold truncate">Hot / Priority Leads</span>
                <span className="text-lg font-extrabold text-rose-900 mt-1">{leadDistribution.hotPriorityLeads}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100/90 border border-slate-200 flex flex-col justify-between shadow-xs">
                <span className="text-[11px] text-slate-700 font-semibold truncate">New Leads</span>
                <span className="text-lg font-extrabold text-slate-900 mt-1">{leadDistribution.newLeads}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <Button
              asChild
              className="w-full bg-[#095c7b] hover:bg-[#095c7b]/90 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 h-11 text-sm"
            >
              <Link href="/franchisee-leads">
                <Briefcase className="h-4 w-4 text-[#eaf143]" />
                Go to All Leads Hub
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* CARD 2: SALES PROCESS SNAPSHOT (CURRENT MONTH HIGH LEVEL VIEW) */}
        <Card className="flex flex-col border-2 border-[#095c7b] shadow-md hover:shadow-lg transition-all bg-gradient-to-b from-white to-slate-50/50 group">
          <CardHeader className="pb-3 border-b border-[#095c7b]/20 bg-[#095c7b]/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#095c7b] text-white shadow-sm group-hover:scale-105 transition-transform">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-extrabold text-[#095c7b]">Sales Process Snapshot:</CardTitle>
                  <CardDescription className="text-xs">High-level view of current month performance</CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs">
                <Sparkles className="h-3 w-3 text-[#eaf143]" />
                {currentMonthSnapshot.monthName}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              High-level overview of lead conversions, active quotes, and closed deals strictly for <strong>{currentMonthSnapshot.monthName}</strong>.
            </p>

            {/* Current Month High Level Metrics */}
            <div className="space-y-3 bg-gradient-to-br from-slate-50 to-teal-50/40 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Month Conversion Rate</span>
                  <div className="text-2xl font-black text-[#095c7b] mt-0.5">
                    {currentMonthSnapshot.conversionRate}%
                  </div>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-xs">
                  {currentMonthSnapshot.wonLeads} / {currentMonthSnapshot.totalLeads} Leads Converted
                </Badge>
              </div>

              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-[#095c7b] via-teal-500 to-[#eaf143] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(10, currentMonthSnapshot.conversionRate)}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-white/80 p-2 rounded-lg border border-slate-200 text-xs">
                  <span className="text-[10px] text-slate-500 block font-semibold">Won Customers</span>
                  <span className="font-extrabold text-emerald-700 text-sm">{currentMonthSnapshot.wonLeads}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-slate-200 text-xs">
                  <span className="text-[10px] text-slate-500 block font-semibold">In Discussion</span>
                  <span className="font-extrabold text-sky-700 text-sm">{currentMonthSnapshot.inDiscussion}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-slate-200 text-xs">
                  <span className="text-[10px] text-slate-500 block font-semibold">Quotes Sent</span>
                  <span className="font-extrabold text-amber-700 text-sm">{currentMonthSnapshot.quotesSent}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <Button
              asChild
              className="w-full bg-[#095c7b] hover:bg-[#095c7b]/90 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 h-11 text-sm"
            >
              <Link href="/sales-snapshot">
                <BarChart3 className="h-4 w-4 text-[#eaf143]" />
                View Sales Process Snapshot
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* ROW 3: LINK TO LOOM VIDEO | BOOK TRAINING SESSION WITH ALEYNA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="book-session">
        {/* LINK TO LOOM VIDEO (Bottom Left - 5 cols) */}
        <Card className="lg:col-span-5 flex flex-col border-2 border-[#095c7b] shadow-md hover:shadow-lg transition-all bg-gradient-to-b from-white to-slate-50/50">
          <CardHeader className="pb-3 border-b border-[#095c7b]/20 bg-[#095c7b]/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#095c7b] text-white shadow-sm">
                  <Video className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-extrabold text-[#095c7b]">Link to Loom Video</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] font-semibold text-xs">
                Training Video
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Watch our step-by-step Loom walkthrough video on navigating your franchisee dashboard, submitting new leads, and interpreting sales conversion metrics.
            </p>

            {/* Video Thumbnail / Preview Container */}
            <div
              onClick={() => setIsVideoOpen(true)}
              className="relative w-full aspect-video rounded-xl bg-slate-900 overflow-hidden cursor-pointer group shadow-inner border border-slate-700 flex items-center justify-center"
            >
              {/* Background gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

              <div className="relative z-10 flex flex-col items-center gap-2 text-white">
                <div className="p-3.5 rounded-full bg-[#095c7b] text-[#eaf143] shadow-lg group-hover:scale-110 transition-transform">
                  <PlayCircle className="h-8 w-8 fill-[#095c7b]" />
                </div>
                <span className="font-bold text-xs tracking-wide group-hover:text-[#eaf143] transition-colors">
                  Click to Watch ProspectPlus Overview
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex gap-2">
            <Button
              onClick={() => setIsVideoOpen(true)}
              className="flex-1 bg-[#095c7b] hover:bg-[#095c7b]/90 text-white font-bold flex items-center justify-center gap-2 h-10 text-xs"
            >
              <PlayCircle className="h-4 w-4 text-[#eaf143]" />
              Watch Video Modal
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-[#095c7b] text-[#095c7b] hover:bg-[#095c7b]/10 font-bold flex items-center justify-center gap-1.5 h-10 text-xs"
            >
              <a
                href="https://www.loom.com/share/e7a2b97c41bf4d0aa9d2a6773347b594"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Loom <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </CardFooter>
        </Card>

        {/* BOOK SESSION WITH ALEYNA (Bottom Right - 7 cols) */}
        <Card className="lg:col-span-7 flex flex-col border-2 border-[#095c7b] shadow-md hover:shadow-lg transition-all bg-gradient-to-b from-white to-slate-50/50">
          <CardHeader className="pb-3 border-b border-[#095c7b]/20 bg-[#095c7b]/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#095c7b] text-white shadow-sm">
                  <Users className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-extrabold text-[#095c7b]">
                  Have any questions or need further training?
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              Book a session with Aleyna through here:
            </p>

            {/* Specialist Profile Card */}
            <div className="p-4 rounded-xl border bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-full bg-[#095c7b] text-white flex items-center justify-center font-bold text-lg border-2 border-[#eaf143] shadow-sm shrink-0">
                  AH
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Aleyna Harnett</h4>
                  <p className="text-xs text-[#095c7b] font-medium">Lead Generation & Territory Training Specialist</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">aleyna.harnett@mailplus.com.au</p>
                </div>
              </div>

              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs font-bold py-1 px-2.5 flex items-center gap-1">
                <Video className="h-3.5 w-3.5 text-blue-600" />
                Microsoft Teams Only
              </Badge>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Schedule a dedicated 1-on-1 Microsoft Teams video session to walk through territory leads, review pipeline management, or get answers to any questions about ProspectPlus.
            </p>
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <Button
              onClick={() => {
                setBookingSuccess(false);
                setBookingDate(tomorrow);
                setIsBookingOpen(true);
              }}
              className="w-full bg-[#095c7b] hover:bg-[#095c7b]/90 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 h-11 text-sm"
            >
              <CalendarIcon className="h-4 w-4 text-[#eaf143]" />
              Book Training Session with Aleyna
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* LOOM VIDEO DIALOG MODAL */}
      <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
        <DialogContent className="max-w-4xl w-full p-6 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#095c7b] flex items-center gap-2">
              <Video className="h-5 w-5 text-[#095c7b]" />
              ProspectPlus Franchisee Training Video
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Complete walkthrough of the ProspectPlus Franchisee Home, Lead Creation & Reporting workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
            <iframe
              src="https://www.loom.com/embed/e7a2b97c41bf4d0aa9d2a6773347b594"
              frameBorder="0"
              allowFullScreen
              className="w-full h-full"
              title="ProspectPlus Franchisee Training"
            />
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
            <span>Powered by Loom</span>
            <Button variant="ghost" size="sm" onClick={() => setIsVideoOpen(false)}>
              Close Video
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* BOOKING SCHEDULING DIALOG MODAL */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-xl w-full p-6 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#095c7b] flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-[#095c7b]" />
              Schedule 1-on-1 Training Session with Aleyna
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select your preferred date & time slot. Availability is fetched live from <strong>Aleyna Harnett&apos;s Teams Calendar</strong>. Bookings cannot be made for past or same day.
            </DialogDescription>
          </DialogHeader>

          {bookingSuccess ? (
            <div className="py-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Appointment Scheduled & Marked on Calendar!</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Your Teams training session with Aleyna Harnett has been booked for{' '}
                <strong>{bookingDate?.toLocaleDateString()}</strong> at <strong>{selectedSlot}</strong>.
              </p>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex flex-col items-center gap-2">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <Video className="h-4 w-4 text-blue-600" /> Microsoft Teams Meeting Link Created
                </div>
                {confirmedJoinUrl && (
                  <a
                    href={confirmedJoinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#095c7b] font-bold underline hover:text-[#095c7b]/80 truncate max-w-full"
                  >
                    Click to Open Teams Meeting
                  </a>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                A confirmation email has been sent. An automated email reminder will also be sent on the morning of your appointment.
              </p>
              <Button
                onClick={() => setIsBookingOpen(false)}
                className="bg-[#095c7b] hover:bg-[#095c7b]/90 text-white font-bold text-xs"
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Meeting Type Notice: Teams Only */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Video className="h-5 w-5 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-bold text-blue-950">Meeting Type: Microsoft Teams Call</div>
                    <div className="text-blue-800 text-[11px]">Synced with aleyna.harnett@mailplus.com.au Teams Calendar</div>
                  </div>
                </div>
                <Badge className="bg-blue-600 text-white font-bold text-[10px]">Teams Only</Badge>
              </div>

              {/* Date & Time Slot Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date Picker (NO SAME-DAY OR PAST DATES ALLOWED) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">Select Date:</Label>
                    <span className="text-[10px] text-amber-600 font-semibold">(Future dates only)</span>
                  </div>
                  <div className="border rounded-xl p-1 bg-slate-50/50 flex justify-center">
                    <CalendarWidget
                      mode="single"
                      selected={bookingDate}
                      onSelect={(d) => {
                        if (d) setBookingDate(d);
                      }}
                      disabled={(date) => isBefore(date, startOfDay(addDays(new Date(), 1)))}
                      className="rounded-md"
                    />
                  </div>
                </div>

                {/* Time Slots Selector */}
                <div className="space-y-2 flex flex-col justify-between">
                  <div>
                    <Label className="text-xs font-bold text-slate-700">
                      Aleyna&apos;s Teams Availability:
                    </Label>
                    {loadingSlots ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-500 border rounded-xl mt-2 bg-slate-50">
                        <Loader />
                        <span>Checking Teams Calendar...</span>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto pr-1">
                        {availableSlots.map((slot) => {
                          const slotLabel = slot.formattedTime;
                          return (
                            <Button
                              key={slot.start}
                              type="button"
                              variant={selectedSlot === slotLabel ? 'default' : 'outline'}
                              onClick={() => setSelectedSlot(slotLabel)}
                              className={`text-xs font-bold justify-center h-10 ${
                                selectedSlot === slotLabel
                                  ? 'bg-[#095c7b] text-white'
                                  : 'border-slate-300 hover:border-[#095c7b] text-slate-700'
                              }`}
                            >
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              {slotLabel}
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 border rounded-xl bg-amber-50/50 border-amber-200 text-amber-800 text-xs text-center space-y-1 mt-2">
                        <Info className="h-4 w-4 mx-auto text-amber-600" />
                        <div className="font-bold">No Available Slots on this Date</div>
                        <div className="text-[11px] text-amber-700">Please select another date on the calendar.</div>
                      </div>
                    )}
                  </div>

                  {/* Summary Box */}
                  <div className="p-3 bg-slate-100 rounded-xl border text-xs space-y-1 mt-4">
                    <div className="text-slate-500 font-semibold">Booking Summary:</div>
                    <div className="font-bold text-[#095c7b]">
                      {bookingDate ? bookingDate.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Select Date'}{' '}
                      at {selectedSlot}
                    </div>
                    <div className="text-slate-600 text-[11px]">Territory: {activeFranName}</div>
                  </div>
                </div>
              </div>

              {/* Additional Attendees */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Additional Attendee Emails (Optional):</Label>
                <Input
                  type="text"
                  placeholder="e.g. colleague@mailplus.com.au, manager@mailplus.com.au (separated by commas)"
                  value={additionalEmails}
                  onChange={(e) => setAdditionalEmails(e.target.value)}
                  className="text-xs h-9 bg-white"
                />
              </div>

              {/* Optional Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Session Focus / Notes (Optional):</Label>
                <Textarea
                  placeholder="e.g. Lead verification questions, onboarding help, or pipeline review..."
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="text-xs min-h-[60px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => setIsBookingOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmTeamsBooking}
                  disabled={isSubmittingBooking || availableSlots.length === 0}
                  className="bg-[#095c7b] hover:bg-[#095c7b]/90 text-white font-bold text-xs h-10 px-5 flex items-center gap-2"
                >
                  {isSubmittingBooking ? (
                    <Loader />
                  ) : (
                    <>
                      <Video className="h-4 w-4 text-[#eaf143]" />
                      Confirm Teams Appointment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
