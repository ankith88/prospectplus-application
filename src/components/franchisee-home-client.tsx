'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePerformance } from '@/hooks/use-performance';
import { FranchiseeSwitcher } from '@/components/franchisee-switcher';
import { getLeadsFromFirebase, getAllAppointments } from '@/services/firebase';
import type { Lead, Appointment, Task } from '@/lib/types';
import { AccessDenied } from '@/components/access-denied';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarWidget } from '@/components/ui/calendar';
import { Loader, FullScreenLoader } from '@/components/ui/loader';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { addDays, startOfDay, isBefore, format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { isWeekendOrPublicHoliday } from '@/lib/australian-holidays';
import { formatInTimezone } from '@/lib/utils';

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
  HelpCircle,
  FileText,
  Search,
  Building2,
  Play,
  ArrowUpRight
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

  // Selected date & active calendar month state on calendar widget
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const activeMonthDate = useMemo(() => {
    return selectedDate || calendarMonth || new Date();
  }, [selectedDate, calendarMonth]);

  const activeMonthName = useMemo(() => {
    return activeMonthDate.toLocaleString('en-AU', { month: 'long', year: 'numeric' });
  }, [activeMonthDate]);

  // Quick View Pop-Up Modal State
  const [activeQuickViewModal, setActiveQuickViewModal] = useState<'won' | 'quotes' | 'trials' | 'appointments' | null>(null);
  const [quickViewSearch, setQuickViewSearch] = useState<string>('');

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
  // Cancellation Modal States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [apptToCancel, setApptToCancel] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

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

  const { setLoadTime, setPageName, setIsCustom } = usePerformance();

  useEffect(() => {
    setIsCustom(true);
    setPageName('Franchisee Homepage');
  }, [setIsCustom, setPageName]);

  // Load leads, appointments, and trigger day-of reminder check
  useEffect(() => {
    const startTimePerf = performance.now();
    async function loadData() {
      if (!user) return;
      setLoadingData(true);
      try {
        const targetFranchisee = (activeFranName && activeFranName !== 'Franchise Territory' && activeFranName !== 'My Franchise')
          ? activeFranName
          : userProfile?.franchisee;

        let fetchedLeads = await getLeadsFromFirebase({ summary: true, franchisee: targetFranchisee });
        if (fetchedLeads.length === 0 && targetFranchisee) {
          // Mismatch fallback: load summary leads
          fetchedLeads = await getLeadsFromFirebase({ summary: true });
        }
        const fetchedAppts = await getAllAppointments().catch(() => []);

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
        const duration = Math.round(performance.now() - startTimePerf);
        setLoadTime(duration);
        console.log(`[Performance Dynamic] /franchisee-home - Load Time: ${duration}ms`);
      }
    }

    if (!authLoading) {
      loadData();
    }
  }, [user, userProfile, authLoading, currentFranId, activeFranName, setLoadTime]);

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

  // Detailed distribution of leads based on requested categories for active selected month
  const targetMonthLeads = useMemo(() => {
    const targetYear = activeMonthDate.getFullYear();
    const targetMonth = activeMonthDate.getMonth();
    return leads.filter((l) => {
      const dateVal = (l as any).createdAt || (l as any).created_at || (l as any).updatedAt || (l as any).updated_at;
      if (!dateVal) return true;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return true;
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });
  }, [leads, activeMonthDate]);

  const leadDistribution = useMemo(() => {
    const pool = targetMonthLeads.length > 0 ? targetMonthLeads : leads;
    const quoteSentAccepted = pool.filter((l) =>
      ['Quote Sent', 'Quote Accepted'].includes(l.status as string)
    ).length;

    const localMileTrial = pool.filter(
      (l) =>
        ['Trialing LocalMile', 'LocalMile Pending', 'LocalMile Opportunity', 'LocalMile Trial'].includes(l.status as string) ||
        ((l as any).trialType || '').toLowerCase().includes('localmile')
    ).length;

    const shipMateTrial = pool.filter(
      (l) =>
        ['Trialing ShipMate', 'ShipMate Trial', 'Free Trial'].includes(l.status as string) ||
        ((l as any).trialType || '').toLowerCase().includes('shipmate')
    ).length;

    const workInProgress = pool.filter((l) =>
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

    const hotPriorityLeads = pool.filter(
      (l) =>
        ['Hot Lead', 'Priority Lead', 'Priority Field Lead'].includes(l.status as string) ||
        (l as any).priority === 'High' ||
        (l as any).isHot === true
    ).length;

    const newLeads = pool.filter(
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
  }, [leads, targetMonthLeads]);

  // Current Month Performance Snapshot (High level view of selected month)
  const currentMonthSnapshot = useMemo(() => {
    const targetYear = activeMonthDate.getFullYear();
    const targetMonth = activeMonthDate.getMonth();
    const monthName = activeMonthName;

    const pool = targetMonthLeads.length > 0 ? targetMonthLeads : leads;
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
  }, [leads, targetMonthLeads, activeMonthDate, activeMonthName]);

  // Metric 1: Leads Won / Signed Up This Month
  const wonLeadsThisMonth = useMemo(() => {
    const targetYear = activeMonthDate.getFullYear();
    const targetMonth = activeMonthDate.getMonth();

    return leads.filter((l) => {
      const statusStr = (l.status || '').toLowerCase();
      const custStatusStr = ((l as any).customerStatus || '').toLowerCase();
      const isWon =
        statusStr === 'won' ||
        statusStr === 'signed' ||
        statusStr === 'converted' ||
        custStatusStr === 'won' ||
        custStatusStr === 'signed' ||
        !!(l as any).signedUpAt ||
        !!(l as any).wonAt;

      if (!isWon) return false;

      let dateVal =
        (l as any).signedUpAt ||
        (l as any).wonAt ||
        (l as any).dateWon ||
        (l as any).convertedAt;

      if (!dateVal && (l as any).statusHistory && Array.isArray((l as any).statusHistory)) {
        const hist = (l as any).statusHistory.find((h: any) =>
          ['won', 'signed', 'converted'].includes((h.status || '').toLowerCase())
        );
        if (hist?.date) dateVal = hist.date;
      }

      if (!dateVal) {
        dateVal = (l as any).createdAt || (l as any).created_at;
      }

      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });
  }, [leads, activeMonthDate]);

  // Metric 2: Quotes Sent Leads (Filtered for active month)
  const quotesSentLeads = useMemo(() => {
    const targetYear = activeMonthDate.getFullYear();
    const targetMonth = activeMonthDate.getMonth();

    return leads.filter((l) => {
      const statusStr = (l.status || '').toLowerCase();
      const isQuote =
        statusStr.includes('quote') ||
        statusStr === 'proposal sent' ||
        statusStr === 'in discussion' ||
        !!(l as any).quoteSentAt ||
        !!(l as any).quotesSent;

      if (!isQuote) return false;

      let dateVal =
        (l as any).quoteSentAt ||
        (l as any).quotesSentAt ||
        (l as any).dateQuoteSent ||
        (l as any).scfSentAt;

      if (!dateVal && (l as any).statusHistory && Array.isArray((l as any).statusHistory)) {
        const hist = (l as any).statusHistory.find((h: any) =>
          (h.status || '').toLowerCase().includes('quote')
        );
        if (hist?.date) dateVal = hist.date;
      }

      if (!dateVal) {
        dateVal = (l as any).createdAt || (l as any).created_at;
      }

      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });
  }, [leads, activeMonthDate]);

  // Metric 3: Trials (ShipMate or LocalMile) Leads (Filtered for active month)
  const trialLeads = useMemo(() => {
    const targetYear = activeMonthDate.getFullYear();
    const targetMonth = activeMonthDate.getMonth();

    return leads.filter((l) => {
      const statusStr = (l.status || '').toLowerCase();
      const trialTypeStr = ((l as any).trialType || '').toLowerCase();
      const isShipmate = (l as any).shipmateStatus === 'Activated' || trialTypeStr.includes('shipmate');
      const isLocalmile = trialTypeStr.includes('localmile');

      const isTrial =
        statusStr.includes('trial') ||
        statusStr.includes('localmile') ||
        statusStr.includes('shipmate') ||
        statusStr === 'free trial' ||
        isShipmate ||
        isLocalmile;

      if (!isTrial) return false;

      let dateVal =
        (l as any).trialStartDate ||
        (l as any).trialActivatedAt ||
        (l as any).shipmateActivatedAt ||
        (l as any).localmileActivatedAt;

      if (!dateVal && (l as any).statusHistory && Array.isArray((l as any).statusHistory)) {
        const hist = (l as any).statusHistory.find((h: any) =>
          (h.status || '').toLowerCase().includes('trial') ||
          (h.status || '').toLowerCase().includes('shipmate') ||
          (h.status || '').toLowerCase().includes('localmile')
        );
        if (hist?.date) dateVal = hist.date;
      }

      if (!dateVal) {
        dateVal = (l as any).createdAt || (l as any).created_at;
      }

      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });
  }, [leads, activeMonthDate]);

  // Label for active month appointment scope
  const threeMonthWindowLabel = useMemo(() => {
    return activeMonthName;
  }, [activeMonthName]);

  // Filter appointments specifically linked ONLY to this franchisee's leads/companies OR Aleyna training,
  // restricted to the selected active month
  const franchiseeAppointments = useMemo(() => {
    const targetYear = activeMonthDate.getFullYear();
    const targetMonth = activeMonthDate.getMonth();
    const startOfTargetMonth = new Date(targetYear, targetMonth, 1, 0, 0, 0);
    const endOfTargetMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

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

      // Restrict date range to active selected month
      const rawDate = appt.duedate || appt.appointmentDate || (appt as any).createdAt || (appt as any).created_at;
      if (!rawDate) return true;
      const apptDate = new Date(rawDate);
      if (isNaN(apptDate.getTime())) return true;

      return apptDate >= startOfTargetMonth && apptDate <= endOfTargetMonth;
    });
  }, [appointments, territoryLeadIds, userDisplayName, userProfile, activeFranName, user?.uid, activeMonthDate]);

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

  // Quick View Items filter for Metric Card Pop-ups
  const quickViewItems = useMemo(() => {
    let baseList: any[] = [];
    if (activeQuickViewModal === 'won') baseList = wonLeadsThisMonth;
    else if (activeQuickViewModal === 'quotes') baseList = quotesSentLeads;
    else if (activeQuickViewModal === 'trials') baseList = trialLeads;
    else if (activeQuickViewModal === 'appointments') baseList = franchiseeAppointments;

    if (!quickViewSearch.trim()) return baseList;
    const q = quickViewSearch.toLowerCase().trim();
    return baseList.filter((item) => {
      const companyName = (item.companyName || item.leadName || '').toLowerCase();
      const contactName = (item.contactName || item.contactPerson || item.assignedTo || '').toLowerCase();
      const status = (item.status || item.appointmentStatus || '').toLowerCase();
      return companyName.includes(q) || contactName.includes(q) || status.includes(q);
    });
  }, [activeQuickViewModal, wonLeadsThisMonth, quotesSentLeads, trialLeads, franchiseeAppointments, quickViewSearch]);

  // Agenda appointments for selected date on home calendar widget
  const dayAppointments = useMemo(() => {
    if (!selectedDate) return franchiseeAppointments.slice(0, 5);
    const dateStr = formatInTimezone(selectedDate, 'Australia/Sydney', 'yyyy-MM-dd');
    return franchiseeAppointments.filter((a) => {
      if (!a.duedate && !a.appointmentDate) return false;
      const apptDateStr = formatInTimezone(a.duedate || a.appointmentDate, 'Australia/Sydney', 'yyyy-MM-dd');
      return apptDateStr === dateStr;
    });
  }, [franchiseeAppointments, selectedDate]);

  // Helper renderer for appointment list inside tab content
  const renderAppointmentList = (list: Appointment[], emptyMsg: string) => {
    if (loadingData) {
      return (
        <div className="py-12 flex justify-center">
          <Loader size="lg" label="Loading scheduled appointments..." />
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <CalendarIcon className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-slate-600">{emptyMsg}</p>
          <p className="text-xs text-slate-400 mt-1">Book 1-on-1 sessions with Aleyna using the schedule button above.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {list.map((appt) => {
          const rawName = (appt as any).leadName || (appt as any).companyName;
          const displayLeadName =
            (appt as any).isTraining || appt.type === 'Teams Training Session' || !rawName
              ? 'Prospect+ Training x Aleyna'
              : rawName || leadsMap.get(appt.leadId) || 'Prospect+ Training x Aleyna';

          const apptDate = appt.duedate ? new Date(appt.duedate) : appt.appointmentDate ? new Date(appt.appointmentDate) : null;
          let dateFormatted = 'N/A';
          if (apptDate && !isNaN(apptDate.getTime())) {
            const todayStr = formatInTimezone(new Date(), 'Australia/Sydney', 'yyyy-MM-dd');
            const apptStr = formatInTimezone(apptDate, 'Australia/Sydney', 'yyyy-MM-dd');
            dateFormatted = apptStr === todayStr
              ? `Today at ${appt.starttime || 'Scheduled time'}`
              : `${formatInTimezone(apptDate, 'Australia/Sydney', 'EEE, MMM d')}${appt.starttime ? ` at ${appt.starttime}` : ''}`;
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
                  {status !== 'Completed' && status !== 'Cancelled' && status !== 'No Show' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setApptToCancel(appt);
                        setCancelReason('');
                        setIsCancelModalOpen(true);
                      }}
                      className="p-0 h-auto text-xs text-rose-600 font-bold hover:text-rose-800 hover:bg-transparent flex items-center gap-1 ml-1"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Cancel
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
          date: formatInTimezone(bookingDate, 'Australia/Sydney', 'yyyy-MM-dd'),
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

  // Handle Cancel Appointment
  const handleCancelAppointment = async () => {
    if (!apptToCancel) return;
    setIsSubmittingCancel(true);
    try {
      const res = await fetch('/api/calendar/cancel-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: apptToCancel.id,
          leadId: apptToCancel.leadId,
          reason: cancelReason,
          cancelledBy: userProfile?.displayName || user?.displayName || userProfile?.email || 'Franchisee User',
          userEmail: user?.email || userProfile?.email || ''
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel appointment');

      toast.success('Appointment Cancelled!', {
        description: 'Aleyna and participants have been notified and calendar updated.'
      });

      setIsCancelModalOpen(false);
      setApptToCancel(null);
      setCancelReason('');
      await refreshAppointments();
    } catch (err: any) {
      console.error('Cancellation error:', err);
      toast.error(err.message || 'Could not cancel appointment');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  if (authLoading || loadingData) {
    return <FullScreenLoader message="Loading Franchisee Homepage..." />;
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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Your ProspectPlus Homepage
            </h1>
          </div>
          <p className="text-slate-100 text-sm sm:text-base font-medium">
            Welcome back, <strong className="text-[#eaf143]">{userFirstName}</strong>. Manage your territory leads, appointments and sales reporting from here.
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
        {/* CARD 1: LEADS WON / SIGNED UP THIS MONTH */}
        <Card
          onClick={() => {
            setQuickViewSearch('');
            setActiveQuickViewModal('won');
          }}
          className="border-[#095c7b]/20 bg-gradient-to-br from-emerald-500/10 via-white to-white shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-emerald-500/50 hover:scale-[1.01]"
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Leads Won / Signed Up</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{wonLeadsThisMonth.length}</span>
                <span className="text-[11px] text-emerald-700 font-semibold truncate">{currentMonthSnapshot.monthName}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: QUOTES SENT */}
        <Card
          onClick={() => {
            setQuickViewSearch('');
            setActiveQuickViewModal('quotes');
          }}
          className="border-[#095c7b]/20 bg-gradient-to-br from-amber-500/10 via-white to-white shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-amber-500/50 hover:scale-[1.01]"
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Quotes Sent</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{quotesSentLeads.length}</span>
                <span className="text-[11px] text-amber-700 font-semibold truncate">Active Quotes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: TRIALS (SHIPMATE OR LOCALMILE) */}
        <Card
          onClick={() => {
            setQuickViewSearch('');
            setActiveQuickViewModal('trials');
          }}
          className="border-[#095c7b]/20 bg-gradient-to-br from-indigo-500/10 via-white to-white shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-indigo-500/50 hover:scale-[1.01]"
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Trials (ShipMate/LocalMile)</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{trialLeads.length}</span>
                <span className="text-[11px] text-indigo-700 font-semibold truncate">ShipMate & LocalMile</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: APPOINTMENTS */}
        <Card
          onClick={() => {
            setQuickViewSearch('');
            setActiveQuickViewModal('appointments');
          }}
          className="border-[#095c7b]/20 bg-gradient-to-br from-teal-500/10 via-white to-white shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-teal-500/50 hover:scale-[1.01]"
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shrink-0">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Appointments</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{franchiseeAppointments.length}</span>
                <span className="text-[11px] text-teal-700 font-semibold truncate">{activeMonthName}</span>
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
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col items-center justify-between gap-4">
            <div className="w-full flex justify-center border rounded-xl p-2 bg-white shadow-inner">
              <CalendarWidget
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d);
                  if (d) setCalendarMonth(d);
                }}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
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
                    const rawName = (appt as any).leadName && (appt as any).leadName !== 'Unknown Lead' ? (appt as any).leadName : null;
                    const leadCompanyName =
                      (appt as any).isTraining || appt.type === 'Teams Training Session' || !rawName
                        ? 'Prospect+ Training x Aleyna'
                        : rawName || leadsMap.get(appt.leadId) || 'Prospect+ Training x Aleyna';
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
                    <CardTitle className="text-lg font-bold text-[#095c7b]">Appointments</CardTitle>
                    <Badge variant="outline" className="bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/30 text-[10px] font-bold">
                      📅 Month: {activeMonthName}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Appointments scheduled for {activeMonthName}
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
        <Card className="lg:col-span-5 flex flex-col border border-[#095c7b]/20 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-100 bg-[#f4f8f7]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-full bg-[#095c7b] text-white shadow-xs">
                  <Video className="h-4 w-4" />
                </div>
                <CardTitle className="text-lg font-bold text-[#095c7b]">How to Use ProspectPlus</CardTitle>
              </div>
              <Badge variant="outline" className="bg-[#d9ebd9] text-[#2c5234] border-none font-medium text-xs py-1 px-3 rounded-full">
                Training Video
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              A step-by-step walkthrough of your dashboard — submitting leads, reading your pipeline and understanding your conversion metrics.
            </p>

            {/* Embedded Loom Video Player */}
            <div
              className="relative w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-slate-950"
              style={{ position: "relative", paddingBottom: "52.5%", height: 0 }}
            >
              <iframe
                src="https://www.loom.com/embed/0728502b4cae4de98e553af04de9f98e"
                frameBorder="0"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                title="ProspectPlus Franchisee Training"
              />
            </div>
          </CardContent>
          <CardFooter className="p-5 pt-0 flex gap-3">
            <Button
              onClick={() => setIsVideoOpen(true)}
              className="flex-1 bg-[#095c7b] hover:bg-[#074861] text-white font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 h-12 rounded-full text-sm"
            >
              <Play className="h-4 w-4 fill-[#eaf143] text-[#eaf143]" />
              Watch Video
            </Button>
            <Button
              variant="ghost"
              asChild
              className="flex-1 bg-[#d9ebd9] hover:bg-[#cbe3cb] text-[#095c7b] font-extrabold shadow-none transition-all flex items-center justify-center gap-1.5 h-12 rounded-full text-sm border-none"
            >
              <a
                href="https://www.loom.com/share/0728502b4cae4de98e553af04de9f98e"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in New Tab <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          </CardFooter>
        </Card>

        {/* BOOK SESSION WITH ALEYNA (Bottom Right - 7 cols) */}
        <Card className="lg:col-span-7 flex flex-col border border-[#095c7b]/20 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-100 bg-[#f4f8f7]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-full bg-[#095c7b] text-white shadow-xs">
                  <Users className="h-4 w-4" />
                </div>
                <CardTitle className="text-lg font-bold text-[#095c7b]">
                  Questions or need more training?
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
            {/* Specialist Profile Card */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-full bg-[#095c7b] text-white flex items-center justify-center font-bold text-lg border-2 border-[#eaf143] shadow-xs shrink-0">
                  AH
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">Aleyna Harnett</h4>
                  <p className="text-xs text-[#095c7b] font-bold">Lead Generation & Territory Training Specialist</p>
                  <p className="text-xs text-slate-500 mt-0.5">aleyna.harnett@mailplus.com.au</p>
                </div>
              </div>

              <Badge variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-300 text-xs font-bold py-1.5 px-3 rounded-full flex items-center gap-1.5 shrink-0">
                <Video className="h-3.5 w-3.5 text-blue-600" />
                Via Microsoft Teams
              </Badge>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              Book a 1-on-1 Teams session to walk through your territory leads, pipeline management, or any ProspectPlus questions.
            </p>
          </CardContent>
          <CardFooter className="p-5 pt-0">
            <Button
              onClick={() => {
                setBookingSuccess(false);
                setBookingDate(tomorrow);
                setIsBookingOpen(true);
              }}
              className="w-full bg-[#095c7b] hover:bg-[#074861] text-white font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 h-12 rounded-full text-sm"
            >
              <CalendarIcon className="h-4.5 w-4.5 text-[#eaf143]" />
              Book a Session with Aleyna
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
          <div
            className="w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner"
            style={{ position: "relative", paddingBottom: "52.5%", height: 0 }}
          >
            <iframe
              src="https://www.loom.com/embed/0728502b4cae4de98e553af04de9f98e"
              frameBorder="0"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
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
                    <span className="text-[10px] text-amber-600 font-semibold">(Weekdays only, excl. public holidays)</span>
                  </div>
                  <div className="border rounded-xl p-1 bg-slate-50/50 flex justify-center">
                    <CalendarWidget
                      mode="single"
                      selected={bookingDate}
                      onSelect={(d) => {
                        if (d) setBookingDate(d);
                      }}
                      disabled={(date) => isBefore(date, startOfDay(addDays(new Date(), 1))) || isWeekendOrPublicHoliday(date)}
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

      {/* QUICK VIEW POP-UP DIALOG MODAL FOR METRIC CARDS */}
      <Dialog
        open={activeQuickViewModal !== null}
        onOpenChange={(open) => {
          if (!open) setActiveQuickViewModal(null);
        }}
      >
        <DialogContent className="max-w-3xl w-full p-6 bg-white rounded-2xl max-h-[85vh] flex flex-col">
          {activeQuickViewModal && (() => {
            let title = '';
            let subtitle = '';
            let icon = null;
            let badgeBg = '';

            if (activeQuickViewModal === 'won') {
              title = `Leads Won / Signed Up (${currentMonthSnapshot.monthName})`;
              subtitle = `Territory leads won or signed up in ${currentMonthSnapshot.monthName}`;
              icon = <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
              badgeBg = 'bg-emerald-100 text-emerald-800';
            } else if (activeQuickViewModal === 'quotes') {
              title = 'Quotes Sent Leads';
              subtitle = 'Territory leads with active quotes or proposals sent';
              icon = <FileText className="h-5 w-5 text-amber-600" />;
              badgeBg = 'bg-amber-100 text-amber-800';
            } else if (activeQuickViewModal === 'trials') {
              title = 'Trials (ShipMate & LocalMile)';
              subtitle = 'Territory leads currently on active ShipMate or LocalMile trials';
              icon = <TrendingUp className="h-5 w-5 text-indigo-600" />;
              badgeBg = 'bg-indigo-100 text-indigo-800';
            } else if (activeQuickViewModal === 'appointments') {
              title = 'Territory Appointments';
              subtitle = `Scheduled appointments across 3-month window (${threeMonthWindowLabel})`;
              icon = <CalendarCheck className="h-5 w-5 text-teal-600" />;
              badgeBg = 'bg-teal-100 text-teal-800';
            }

            return (
              <>
                <DialogHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-100">{icon}</div>
                      <div>
                        <DialogTitle className="text-lg font-bold text-slate-900">{title}</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">{subtitle}</DialogDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`font-bold text-xs ${badgeBg}`}>
                      {quickViewItems.length} {activeQuickViewModal === 'appointments' ? 'Appointments' : 'Leads'}
                    </Badge>
                  </div>

                  {/* Search Bar */}
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder={`Search ${activeQuickViewModal === 'appointments' ? 'appointments or leads' : 'company, contact or status'}...`}
                      value={quickViewSearch}
                      onChange={(e) => setQuickViewSearch(e.target.value)}
                      className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
                    />
                  </div>
                </DialogHeader>

                {/* Body Content List */}
                <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 max-h-[55vh]">
                  {loadingData ? (
                    <div className="py-12 flex justify-center">
                      <Loader />
                    </div>
                  ) : quickViewItems.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 border-2 border-dashed rounded-xl bg-slate-50/50">
                      <Building2 className="h-8 w-8 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-600">No matching records found</p>
                      <p className="text-[11px] text-slate-400">
                        {quickViewSearch ? 'Try a different search term.' : 'There are currently no records in this section.'}
                      </p>
                    </div>
                  ) : activeQuickViewModal === 'appointments' ? (
                    quickViewItems.map((appt: any) => {
                      const rawName = appt.leadName && appt.leadName !== 'Unknown Lead' ? appt.leadName : null;
                      const leadCompanyName =
                        appt.isTraining || appt.type === 'Teams Training Session' || !rawName
                          ? 'Prospect+ Training x Aleyna'
                          : rawName || leadsMap.get(appt.leadId) || 'Prospect+ Training x Aleyna';
                      const isTeams = appt.isTeams || appt.type === 'Teams Training Session' || appt.meetingType === 'teams';
                      const status = appt.appointmentStatus || 'Scheduled';

                      const apptDate = appt.duedate ? new Date(appt.duedate) : appt.appointmentDate ? new Date(appt.appointmentDate) : null;
                      let dateFormatted = 'N/A';
                      if (apptDate && !isNaN(apptDate.getTime())) {
                        dateFormatted = `${apptDate.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })}${appt.starttime ? ` at ${appt.starttime}` : ''}`;
                      }

                      return (
                        <div
                          key={appt.id}
                          className="p-3.5 rounded-xl border bg-white hover:border-[#095c7b]/40 transition-all shadow-xs flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-[#095c7b]/10 text-[#095c7b] shrink-0">
                              {isTeams ? <Video className="h-4 w-4 text-blue-600" /> : <CalendarIcon className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 truncate">{leadCompanyName}</h4>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-[#095c7b]" /> {dateFormatted}
                                </span>
                                <span>•</span>
                                <span>Host: {appt.assignedTo || 'Aleyna Harnett'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-[10px] font-semibold">
                              {status}
                            </Badge>
                            {status !== 'Completed' && status !== 'Cancelled' && status !== 'No Show' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setApptToCancel(appt);
                                  setCancelReason('');
                                  setIsCancelModalOpen(true);
                                }}
                                className="h-8 text-xs text-rose-600 font-bold hover:text-rose-800 flex items-center gap-1"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    quickViewItems.map((lead: any) => {
                      const contactName = lead.contactPerson || lead.contactName || (lead.firstName ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : null);
                      const contactPhone = lead.phone || lead.customerPhone;
                      const contactEmail = lead.email || lead.customerServiceEmail;
                      const location = [lead.suburb, lead.state].filter(Boolean).join(', ');

                      return (
                        <div
                          key={lead.id}
                          className="p-3.5 rounded-xl border bg-white hover:border-[#095c7b]/40 transition-all shadow-xs flex items-center justify-between gap-3 text-xs group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-[#095c7b]/10 text-[#095c7b] shrink-0">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 group-hover:text-[#095c7b] transition-colors truncate">
                                  {lead.companyName}
                                </h4>
                                {lead.status && (
                                  <Badge className="bg-[#095c7b]/10 text-[#095c7b] text-[10px] font-bold shrink-0">
                                    {lead.status}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-500">
                                {contactName && <span>Contact: <strong>{contactName}</strong></span>}
                                {contactPhone && <span>Phone: {contactPhone}</span>}
                                {contactEmail && <span className="truncate max-w-[200px]">Email: {contactEmail}</span>}
                                {location && <span>Location: {location}</span>}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 text-xs border-[#095c7b]/30 text-[#095c7b] hover:bg-[#095c7b]/10 font-bold shrink-0"
                          >
                            <Link href={`/leads/${lead.id}`} className="flex items-center gap-1">
                              View Lead <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* CANCELLATION CONFIRMATION DIALOG MODAL */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md w-full p-6 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" />
              Cancel Booked Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to cancel this appointment? This will notify <strong>Aleyna Harnett</strong> and remove the event from Outlook / Google calendars.
            </DialogDescription>
          </DialogHeader>

          {apptToCancel && (
            <div className="space-y-4 py-2">
              {/* Summary Card */}
              <div className="p-3.5 bg-slate-50 border rounded-xl text-xs space-y-1.5">
                <div className="font-bold text-slate-900">
                  {apptToCancel.isTraining || apptToCancel.type === 'Teams Training Session' || !apptToCancel.leadName || apptToCancel.leadName === 'Unknown Lead'
                    ? 'Prospect+ Training x Aleyna'
                    : apptToCancel.leadName || leadsMap.get(apptToCancel.leadId) || 'Prospect+ Training x Aleyna'}
                </div>
                <div className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                  <Clock className="h-3.5 w-3.5 text-[#095c7b]" />
                  <span>
                    {apptToCancel.duedate ? new Date(apptToCancel.duedate).toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Scheduled Date'}
                    {apptToCancel.starttime ? ` at ${apptToCancel.starttime}` : ''}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Host: <strong>{apptToCancel.assignedTo || 'Aleyna Harnett'}</strong>
                </div>
              </div>

              {/* Cancellation Reason */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Reason for cancellation (Optional):</Label>
                <Textarea
                  placeholder="e.g. Schedule conflict, client rescheduled, or no longer needed..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={isSubmittingCancel}
                >
                  Keep Appointment
                </Button>
                <Button
                  onClick={handleCancelAppointment}
                  disabled={isSubmittingCancel}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-4 flex items-center gap-1.5"
                >
                  {isSubmittingCancel ? (
                    <Loader />
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Confirm Cancellation
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
