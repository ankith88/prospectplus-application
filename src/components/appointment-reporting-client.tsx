'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { AppointmentStatusBadge } from '@/components/appointment-status-badge';
import { AnimatedStatCard } from '@/components/ui/animated-stat-card';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { doc, setDoc, updateDoc, collection, addDoc, getDoc } from 'firebase/firestore';
import { safeFormatDate, getQuickDateRange, cn } from '@/lib/utils';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';
import { 
  format, startOfDay, endOfDay, isValid, parseISO,
  subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { 
  Calendar as CalendarIcon,
  CalendarCheck,
  CalendarClock,
  Clock,
  Filter,
  SlidersHorizontal,
  X,
  Search,
  Download,
  RefreshCw,
  ArrowUpDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  User,
  Building2,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  Sparkles,
  Phone,
  Mail,
  MoreHorizontal,
  FileSpreadsheet,
  Target,
  Trophy,
  Activity,
  Video
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

export interface AppointmentRecord {
  id: string;
  leadId: string;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  bookedAt: string; // ISO date of when it was booked
  appointmentDate: string; // ISO date of scheduled appointment
  appointmentStatus: 'Completed' | 'Cancelled' | 'No Show' | 'Rescheduled' | 'Pending';
  isOverdue: boolean;
  bookedBy: string; // SDR / Dialer / User
  bookedWith: string; // Account Manager
  originalBucket: string; // Outbound, Inbound, Field Sales, etc.
  currentLeadStatus: string;
  statusChangedPostAppt: boolean;
  statusChangeDate: string | null;
  statusProgression: Array<{
    oldStatus: string;
    newStatus: string;
    date: string;
    author?: string;
  }>;
  outcomeCategory: 'Won / Signed' | 'Active Pipeline' | 'Lost / Disqualified' | 'Unchanged';
  notes?: string;
  meetingType?: string;
  joinUrl?: string;
  locationOrLink?: string;
  franchisee?: string;
  postcode?: string;
  state?: string;
}

const OUTCOME_COLORS: Record<string, string> = {
  Completed: '#10b981', // Emerald
  Pending: '#3b82f6', // Blue
  Rescheduled: '#8b5cf6', // Purple
  'No Show': '#f59e0b', // Amber
  Cancelled: '#ef4444', // Red
};

const BUCKET_COLORS: Record<string, string> = {
  Outbound: '#095c7b',
  Inbound: '#0284c7',
  'Field Sales': '#10b981',
  Multisite: '#8b5cf6',
  Nurture: '#f59e0b',
  LPO: '#ec4899',
  'Customer Success': '#14b8a6',
  'Account Manager': '#6366f1',
  Unassigned: '#64748b',
};

type SortKey = 'bookedAt' | 'appointmentDate' | 'companyName' | 'appointmentStatus' | 'bookedBy' | 'bookedWith' | 'originalBucket' | 'currentLeadStatus' | 'statusChangedPostAppt';

export interface CompanyAppointmentGroup {
  key: string;
  leadId: string;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  franchisee?: string;
  state?: string;
  currentLeadStatus: string;
  originalBucket: string;
  bookedWith?: string;
  bookedBy?: string;
  appointments: AppointmentRecord[];
  latestAppointmentDate: string;
  earliestBookedAt: string;
  statusCounts: {
    Completed: number;
    Pending: number;
    'No Show': number;
    Rescheduled: number;
    Cancelled: number;
    Overdue: number;
  };
  hasStatusChanged: boolean;
}

export function AppointmentReportingClient() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const allowedRoles = useMemo(() => [
    'admin',
    'superadmin',
    'superadmins',
    'super user',
    'sales manager',
    'sales_manager',
    'outbound admin',
    'outbound admins',
    'outbound_admin'
  ], []);

  const activeRoleLower = (userProfile?.activeRole || userProfile?.role || '').toLowerCase().trim();
  const assignedRolesLower = (userProfile?.assignedRoles || []).map((r: any) => String(r).toLowerCase().trim());
  
  const isSuper = Boolean(
    isSuperAdmin ||
    (userProfile as any)?.isSuperAdmin ||
    (userProfile as any)?.superAdmin ||
    (user?.uid && SUPER_ADMIN_UIDS.includes(user.uid)) ||
    (userProfile?.uid && SUPER_ADMIN_UIDS.includes(userProfile.uid)) ||
    activeRoleLower === 'superadmin' ||
    assignedRolesLower.includes('superadmin')
  );

  const isFranchisee = Boolean(
    userProfile?.activeRole === 'Franchisee' ||
    userProfile?.activeRole === 'Franchisees' ||
    userProfile?.role === 'Franchisee' ||
    activeRoleLower === 'franchisee' ||
    activeRoleLower === 'franchisees' ||
    userProfile?.franchiseeId
  );

  const hasAccess = !isFranchisee && (
    isSuper ||
    allowedRoles.includes(activeRoleLower) ||
    assignedRolesLower.some((r: string) => allowedRoles.includes(r))
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allAppointments, setAllAppointments] = useState<AppointmentRecord[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    accountManagers: string[];
    bookedBy: string[];
    originalBuckets: string[];
    appointmentStatuses: string[];
    leadStatuses: string[];
  }>({
    accountManagers: [],
    bookedBy: [],
    originalBuckets: [],
    appointmentStatuses: [],
    leadStatuses: [],
  });

  // Filter States
  const [companySearch, setCompanySearch] = useState('');
  const [selectedAMs, setSelectedAMs] = useState<string[]>([]);
  const [selectedBookedBy, setSelectedBookedBy] = useState<string[]>([]);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedLeadStatusChange, setSelectedLeadStatusChange] = useState<string>('all'); // all, changed, unchanged, won, lost, pipeline
  
  // Date Filters - Default to Current Month for instant high-speed reporting
  const [bookedDateRange, setBookedDateRange] = useState<DateRange | undefined>(() => getQuickDateRange('thismonth'));
  const [bookedDatePreset, setBookedDatePreset] = useState<string>('thismonth');
  
  const [apptDateRange, setApptDateRange] = useState<DateRange | undefined>(undefined);
  const [apptDatePreset, setApptDatePreset] = useState<string>('all');

  // View & Pagination
  const [activeTab, setActiveTab] = useState<'analytics' | 'table' | 'progression'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'bookedAt',
    direction: 'desc'
  });

  // Expanded Companies State for Grouped Table View
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const toggleCompanyExpanded = (key: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = (allKeys: string[]) => {
    setExpandedCompanies(new Set(allKeys));
  };

  const collapseAll = () => {
    setExpandedCompanies(new Set());
  };

  // Status Change Dialog Modal
  const [statusDialogAppt, setStatusDialogAppt] = useState<AppointmentRecord | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<AppointmentRecord['appointmentStatus']>('Completed');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Drilldown Modal
  const [drilldownModal, setDrilldownModal] = useState<{
    title: string;
    description?: string;
    appointments: AppointmentRecord[];
  } | null>(null);

  // Fetch appointments data
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetch(`/api/reporting/appointments${isRefresh ? '?refresh=true' : ''}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.appointments)) {
        setAllAppointments(data.appointments);
        if (data.filterOptions) {
          setFilterOptions(data.filterOptions);
        }
      } else {
        throw new Error(data.error || 'Failed to parse appointment records');
      }
    } catch (err: any) {
      console.error('Failed to load appointment reporting:', err);
      toast({
        variant: 'destructive',
        title: 'Error Loading Appointments',
        description: err.message || 'Could not retrieve appointment reporting data.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading) {
      if (hasAccess) {
        fetchData();
      } else {
        setLoading(false);
      }
    }
  }, [authLoading, hasAccess, fetchData]);

  // Handle Booked Date Preset
  const handleBookedDatePreset = (preset: string) => {
    setBookedDatePreset(preset);
    if (preset === 'all') {
      setBookedDateRange(undefined);
    } else {
      const range = getQuickDateRange(preset);
      setBookedDateRange(range);
    }
  };

  // Handle Appointment Scheduled Date Preset
  const handleApptDatePreset = (preset: string) => {
    setApptDatePreset(preset);
    if (preset === 'all') {
      setApptDateRange(undefined);
    } else {
      const range = getQuickDateRange(preset);
      setApptDateRange(range);
    }
  };

  // Reset Filters
  const handleClearFilters = () => {
    setCompanySearch('');
    setSelectedAMs([]);
    setSelectedBookedBy([]);
    setSelectedBuckets([]);
    setSelectedStatuses([]);
    setSelectedLeadStatusChange('all');
    setBookedDateRange(getQuickDateRange('thismonth'));
    setBookedDatePreset('thismonth');
    setApptDateRange(undefined);
    setApptDatePreset('all');
    setCurrentPage(1);
    toast({ title: 'Filters Reset', description: 'Reset to Current Month view.' });
  };

  // Filtering Logic
  const filteredAppointments = useMemo(() => {
    return allAppointments.filter(appt => {
      // Company name search
      if (companySearch.trim()) {
        const query = companySearch.toLowerCase().trim();
        const matchesCompany = appt.companyName.toLowerCase().includes(query);
        const matchesContact = appt.contactName?.toLowerCase().includes(query);
        const matchesPhone = appt.contactPhone?.toLowerCase().includes(query);
        const matchesEmail = appt.contactEmail?.toLowerCase().includes(query);
        if (!matchesCompany && !matchesContact && !matchesPhone && !matchesEmail) {
          return false;
        }
      }

      // AM Filter
      if (selectedAMs.length > 0 && !selectedAMs.includes(appt.bookedWith)) {
        return false;
      }

      // Booked By / Dialer Filter
      if (selectedBookedBy.length > 0 && !selectedBookedBy.includes(appt.bookedBy)) {
        return false;
      }

      // Original Bucket Filter
      if (selectedBuckets.length > 0 && !selectedBuckets.includes(appt.originalBucket)) {
        return false;
      }

      // Appointment Status Filter
      if (selectedStatuses.length > 0) {
        if (selectedStatuses.includes('Overdue Pending')) {
          const matchStandard = selectedStatuses.includes(appt.appointmentStatus);
          const matchOverdue = appt.isOverdue;
          if (!matchStandard && !matchOverdue) return false;
        } else if (!selectedStatuses.includes(appt.appointmentStatus)) {
          return false;
        }
      }

      // Lead Status Change Filter
      if (selectedLeadStatusChange !== 'all') {
        if (selectedLeadStatusChange === 'changed' && !appt.statusChangedPostAppt) return false;
        if (selectedLeadStatusChange === 'unchanged' && appt.statusChangedPostAppt) return false;
        if (selectedLeadStatusChange === 'won' && appt.outcomeCategory !== 'Won / Signed') return false;
        if (selectedLeadStatusChange === 'lost' && appt.outcomeCategory !== 'Lost / Disqualified') return false;
        if (selectedLeadStatusChange === 'pipeline' && appt.outcomeCategory !== 'Active Pipeline') return false;
      }

      // Booking Creation Date Filter
      if (bookedDateRange?.from) {
        const bDate = new Date(appt.bookedAt);
        const from = startOfDay(bookedDateRange.from);
        const to = bookedDateRange.to ? endOfDay(bookedDateRange.to) : endOfDay(bookedDateRange.from);
        if (bDate < from || bDate > to) return false;
      }

      // Appointment Scheduled Date Filter
      if (apptDateRange?.from) {
        const aDate = new Date(appt.appointmentDate);
        const from = startOfDay(apptDateRange.from);
        const to = apptDateRange.to ? endOfDay(apptDateRange.to) : endOfDay(apptDateRange.from);
        if (aDate < from || aDate > to) return false;
      }

      return true;
    });
  }, [
    allAppointments,
    companySearch,
    selectedAMs,
    selectedBookedBy,
    selectedBuckets,
    selectedStatuses,
    selectedLeadStatusChange,
    bookedDateRange,
    apptDateRange,
  ]);

  // Group Appointments by Company
  const companyGroups = useMemo<CompanyAppointmentGroup[]>(() => {
    const groupMap = new Map<string, CompanyAppointmentGroup>();

    filteredAppointments.forEach(appt => {
      const groupKey = appt.leadId || appt.companyName || 'unknown';
      let group = groupMap.get(groupKey);
      if (!group) {
        group = {
          key: groupKey,
          leadId: appt.leadId,
          companyName: appt.companyName || 'Unnamed Company',
          contactName: appt.contactName,
          contactEmail: appt.contactEmail,
          contactPhone: appt.contactPhone,
          franchisee: appt.franchisee,
          state: appt.state,
          currentLeadStatus: appt.currentLeadStatus,
          originalBucket: appt.originalBucket,
          bookedWith: appt.bookedWith,
          bookedBy: appt.bookedBy,
          appointments: [],
          latestAppointmentDate: appt.appointmentDate,
          earliestBookedAt: appt.bookedAt,
          statusCounts: {
            Completed: 0,
            Pending: 0,
            'No Show': 0,
            Rescheduled: 0,
            Cancelled: 0,
            Overdue: 0,
          },
          hasStatusChanged: false,
        };
        groupMap.set(groupKey, group);
      }

      group.appointments.push(appt);
      if (appt.isOverdue) {
        group.statusCounts.Overdue++;
      } else if (appt.appointmentStatus in group.statusCounts) {
        group.statusCounts[appt.appointmentStatus]++;
      }
      if (appt.statusChangedPostAppt) {
        group.hasStatusChanged = true;
      }
      if (new Date(appt.appointmentDate).getTime() > new Date(group.latestAppointmentDate).getTime()) {
        group.latestAppointmentDate = appt.appointmentDate;
      }
      if (new Date(appt.bookedAt).getTime() < new Date(group.earliestBookedAt).getTime()) {
        group.earliestBookedAt = appt.bookedAt;
      }
    });

    const list = Array.from(groupMap.values());

    // Sort company groups
    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortConfig.key === 'companyName') {
        valA = a.companyName.toLowerCase();
        valB = b.companyName.toLowerCase();
      } else if (sortConfig.key === 'bookedAt') {
        valA = new Date(a.earliestBookedAt).getTime();
        valB = new Date(b.earliestBookedAt).getTime();
      } else if (sortConfig.key === 'appointmentDate') {
        valA = new Date(a.latestAppointmentDate).getTime();
        valB = new Date(b.latestAppointmentDate).getTime();
      } else if (sortConfig.key === 'currentLeadStatus') {
        valA = a.currentLeadStatus.toLowerCase();
        valB = b.currentLeadStatus.toLowerCase();
      } else if (sortConfig.key === 'originalBucket') {
        valA = a.originalBucket.toLowerCase();
        valB = b.originalBucket.toLowerCase();
      } else if (sortConfig.key === 'bookedWith') {
        valA = (a.bookedWith || '').toLowerCase();
        valB = (b.bookedWith || '').toLowerCase();
      } else if (sortConfig.key === 'bookedBy') {
        valA = (a.bookedBy || '').toLowerCase();
        valB = (b.bookedBy || '').toLowerCase();
      } else {
        valA = new Date(a.latestAppointmentDate).getTime();
        valB = new Date(b.latestAppointmentDate).getTime();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    // Sort appointments within each company group chronologically (newest first)
    list.forEach(g => {
      g.appointments.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
    });

    return list;
  }, [filteredAppointments, sortConfig]);

  // Paginated Company Groups
  const paginatedCompanyGroups = useMemo(() => {
    if (pageSize === -1) return companyGroups;
    const start = (currentPage - 1) * pageSize;
    return companyGroups.slice(start, start + pageSize);
  }, [companyGroups, currentPage, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.ceil(companyGroups.length / pageSize);

  // Toggle Column Sort
  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // KPIs & Statistics Computations
  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const completed = filteredAppointments.filter(a => a.appointmentStatus === 'Completed');
    const rescheduled = filteredAppointments.filter(a => a.appointmentStatus === 'Rescheduled');
    const noShow = filteredAppointments.filter(a => a.appointmentStatus === 'No Show');
    const cancelled = filteredAppointments.filter(a => a.appointmentStatus === 'Cancelled');
    const pending = filteredAppointments.filter(a => a.appointmentStatus === 'Pending' && !a.isOverdue);
    const overdue = filteredAppointments.filter(a => a.isOverdue);

    const statusChanged = filteredAppointments.filter(a => a.statusChangedPostAppt);
    const wonSigned = filteredAppointments.filter(a => a.outcomeCategory === 'Won / Signed');
    const activePipeline = filteredAppointments.filter(a => a.outcomeCategory === 'Active Pipeline');
    const lostDisqualified = filteredAppointments.filter(a => a.outcomeCategory === 'Lost / Disqualified');

    const completionRate = total > 0 ? (completed.length / total) * 100 : 0;
    const rescheduleRate = total > 0 ? (rescheduled.length / total) * 100 : 0;
    const noShowRate = total > 0 ? (noShow.length / total) * 100 : 0;
    const cancelRate = total > 0 ? (cancelled.length / total) * 100 : 0;
    const statusChangeRate = total > 0 ? (statusChanged.length / total) * 100 : 0;
    const wonRate = total > 0 ? (wonSigned.length / total) * 100 : 0;

    // Outcome Distribution Chart Data
    const outcomeChartData = [
      { name: 'Completed', value: completed.length, color: OUTCOME_COLORS.Completed },
      { name: 'Scheduled / Pending', value: pending.length + overdue.length, color: OUTCOME_COLORS.Pending },
      { name: 'Rescheduled', value: rescheduled.length, color: OUTCOME_COLORS.Rescheduled },
      { name: 'No Show', value: noShow.length, color: OUTCOME_COLORS['No Show'] },
      { name: 'Cancelled', value: cancelled.length, color: OUTCOME_COLORS.Cancelled },
    ].filter(d => d.value > 0);

    // Original Bucket Breakdown Data
    const bucketMap: Record<string, { total: number; completed: number; won: number; rescheduled: number; noShow: number; cancelled: number }> = {};
    filteredAppointments.forEach(a => {
      const b = a.originalBucket || 'Outbound';
      if (!bucketMap[b]) {
        bucketMap[b] = { total: 0, completed: 0, won: 0, rescheduled: 0, noShow: 0, cancelled: 0 };
      }
      bucketMap[b].total++;
      if (a.appointmentStatus === 'Completed') bucketMap[b].completed++;
      if (a.appointmentStatus === 'Rescheduled') bucketMap[b].rescheduled++;
      if (a.appointmentStatus === 'No Show') bucketMap[b].noShow++;
      if (a.appointmentStatus === 'Cancelled') bucketMap[b].cancelled++;
      if (a.outcomeCategory === 'Won / Signed') bucketMap[b].won++;
    });

    const bucketChartData = Object.entries(bucketMap).map(([bucket, counts]) => ({
      bucket,
      Total: counts.total,
      Completed: counts.completed,
      'Won / Signed': counts.won,
      'No Show': counts.noShow,
      Rescheduled: counts.rescheduled,
      Cancelled: counts.cancelled,
      completionRate: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
      winRate: counts.total > 0 ? Math.round((counts.won / counts.total) * 100) : 0,
    })).sort((a, b) => b.Total - a.Total);

    // Account Manager Breakdown Data
    const amMap: Record<string, { total: number; completed: number; won: number; noShow: number; rescheduled: number; cancelled: number; pending: number }> = {};
    filteredAppointments.forEach(a => {
      const am = a.bookedWith || 'Unassigned AM';
      if (!amMap[am]) {
        amMap[am] = { total: 0, completed: 0, won: 0, noShow: 0, rescheduled: 0, cancelled: 0, pending: 0 };
      }
      amMap[am].total++;
      if (a.appointmentStatus === 'Completed') amMap[am].completed++;
      if (a.appointmentStatus === 'Rescheduled') amMap[am].rescheduled++;
      if (a.appointmentStatus === 'No Show') amMap[am].noShow++;
      if (a.appointmentStatus === 'Cancelled') amMap[am].cancelled++;
      if (a.appointmentStatus === 'Pending') amMap[am].pending++;
      if (a.outcomeCategory === 'Won / Signed') amMap[am].won++;
    });

    const amChartData = Object.entries(amMap).map(([am, counts]) => ({
      am,
      Total: counts.total,
      Completed: counts.completed,
      'Won / Signed': counts.won,
      'No Show': counts.noShow,
      Rescheduled: counts.rescheduled,
      Cancelled: counts.cancelled,
      Pending: counts.pending,
      completionRate: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
      winRate: counts.total > 0 ? Math.round((counts.won / counts.total) * 100) : 0,
    })).sort((a, b) => b.Total - a.Total);

    // Booker / Dialer Breakdown Data
    const bookerMap: Record<string, { total: number; completed: number; won: number; noShow: number; rescheduled: number; cancelled: number }> = {};
    filteredAppointments.forEach(a => {
      const b = a.bookedBy || 'Unassigned';
      if (!bookerMap[b]) {
        bookerMap[b] = { total: 0, completed: 0, won: 0, noShow: 0, rescheduled: 0, cancelled: 0 };
      }
      bookerMap[b].total++;
      if (a.appointmentStatus === 'Completed') bookerMap[b].completed++;
      if (a.appointmentStatus === 'Rescheduled') bookerMap[b].rescheduled++;
      if (a.appointmentStatus === 'No Show') bookerMap[b].noShow++;
      if (a.appointmentStatus === 'Cancelled') bookerMap[b].cancelled++;
      if (a.outcomeCategory === 'Won / Signed') bookerMap[b].won++;
    });

    const bookerChartData = Object.entries(bookerMap).map(([booker, counts]) => ({
      booker,
      Total: counts.total,
      Completed: counts.completed,
      'Won / Signed': counts.won,
      'No Show': counts.noShow,
      Rescheduled: counts.rescheduled,
      Cancelled: counts.cancelled,
      completionRate: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
      winRate: counts.total > 0 ? Math.round((counts.won / counts.total) * 100) : 0,
    })).sort((a, b) => b.Total - a.Total);

    // Lead Status Evolution Post-Appt Data
    const leadStatusMap: Record<string, number> = {};
    filteredAppointments.forEach(a => {
      const st = a.currentLeadStatus || 'New';
      leadStatusMap[st] = (leadStatusMap[st] || 0) + 1;
    });

    const leadStatusChartData = Object.entries(leadStatusMap)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const uniqueCustomers = new Set(filteredAppointments.map(a => a.leadId || a.companyName).filter(Boolean)).size;

    return {
      total,
      uniqueCustomers,
      completed: completed.length,
      rescheduled: rescheduled.length,
      noShow: noShow.length,
      cancelled: cancelled.length,
      pending: pending.length,
      overdue: overdue.length,
      statusChanged: statusChanged.length,
      wonSigned: wonSigned.length,
      activePipeline: activePipeline.length,
      lostDisqualified: lostDisqualified.length,
      completionRate: Math.round(completionRate),
      rescheduleRate: Math.round(rescheduleRate),
      noShowRate: Math.round(noShowRate),
      cancelRate: Math.round(cancelRate),
      statusChangeRate: Math.round(statusChangeRate),
      wonRate: Math.round(wonRate),
      completedList: completed,
      rescheduledList: rescheduled,
      noShowList: noShow,
      cancelledList: cancelled,
      pendingList: pending,
      overdueList: overdue,
      statusChangedList: statusChanged,
      wonSignedList: wonSigned,
      outcomeChartData,
      bucketChartData,
      amChartData,
      bookerChartData,
      leadStatusChartData,
    };
  }, [filteredAppointments]);

  // Status Change Handler
  const handleUpdateAppointmentStatus = async () => {
    if (!statusDialogAppt) return;
    setUpdatingStatus(true);
    try {
      const apptId = statusDialogAppt.id;
      const leadId = statusDialogAppt.leadId;
      const newStatus = newStatusValue;

      const updates: any = {
        appointmentStatus: newStatus,
        updatedAt: new Date().toISOString()
      };
      if (statusNotes.trim()) {
        updates.statusNotes = statusNotes.trim();
        updates.notes = statusNotes.trim();
      }

      // 1. Update subcollection document
      const docRef = doc(firestore, 'leads', leadId, 'appointments', apptId);
      await setDoc(docRef, updates, { merge: true });

      // 2. Also check if parent lead has appointments array and update it
      const leadRef = doc(firestore, 'leads', leadId);
      const leadSnap = await getDoc(leadRef);
      if (leadSnap.exists()) {
        const leadData = leadSnap.data();
        if (Array.isArray(leadData.appointments)) {
          const updatedAppts = leadData.appointments.map((a: any) => 
            (a.id === apptId || (a.date === statusDialogAppt.appointmentDate && a.duedate === statusDialogAppt.appointmentDate))
              ? { ...a, ...updates }
              : a
          );
          await updateDoc(leadRef, { appointments: updatedAppts });
        }
      }

      // 3. Log activity
      await addDoc(collection(firestore, 'leads', leadId, 'activity'), {
        type: 'Update',
        notes: `Updated appointment status to ${newStatus}${statusNotes ? `: ${statusNotes}` : ''}`,
        author: userProfile?.displayName || user?.displayName || 'Reporting Admin',
        date: new Date().toISOString()
      }).catch(e => console.warn('Could not add activity log', e));

      // 4. Update local state
      setAllAppointments(prev => prev.map(a => {
        if (a.id === apptId && a.leadId === leadId) {
          return {
            ...a,
            appointmentStatus: newStatus,
            isOverdue: false,
            notes: statusNotes || a.notes
          };
        }
        return a;
      }));

      toast({
        title: 'Status Updated',
        description: `Appointment for ${statusDialogAppt.companyName} marked as ${newStatus}.`
      });

      setStatusDialogAppt(null);
      setStatusNotes('');
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message || 'Could not update appointment status.'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = [
        'Lead ID',
        'Company Name',
        'Contact Person',
        'Contact Email',
        'Contact Phone',
        'Booking Created Date (When Booked)',
        'Appointment Date & Time',
        'Appointment Status',
        'Is Overdue',
        'Booked By (SDR / Dialer)',
        'Booked With (Account Manager)',
        'Original Bucket',
        'Current Lead Status',
        'Status Changed Post-Appt',
        'Status Change Date',
        'Outcome Category',
        'Meeting Type',
        'Meeting Join URL',
        'Appointment Notes'
      ];

      const rows = filteredAppointments.map(a => [
        `"${a.leadId}"`,
        `"${(a.companyName || '').replace(/"/g, '""')}"`,
        `"${(a.contactName || '').replace(/"/g, '""')}"`,
        `"${(a.contactEmail || '').replace(/"/g, '""')}"`,
        `"${(a.contactPhone || '').replace(/"/g, '""')}"`,
        `"${safeFormatDate(a.bookedAt, 'yyyy-MM-dd HH:mm')}"`,
        `"${safeFormatDate(a.appointmentDate, 'yyyy-MM-dd HH:mm')}"`,
        `"${a.appointmentStatus}"`,
        `"${a.isOverdue ? 'Yes' : 'No'}"`,
        `"${(a.bookedBy || '').replace(/"/g, '""')}"`,
        `"${(a.bookedWith || '').replace(/"/g, '""')}"`,
        `"${(a.originalBucket || '').replace(/"/g, '""')}"`,
        `"${(a.currentLeadStatus || '').replace(/"/g, '""')}"`,
        `"${a.statusChangedPostAppt ? 'Yes' : 'No'}"`,
        `"${a.statusChangeDate ? safeFormatDate(a.statusChangeDate, 'yyyy-MM-dd HH:mm') : 'N/A'}"`,
        `"${a.outcomeCategory}"`,
        `"${(a.meetingType || '').replace(/"/g, '""')}"`,
        `"${(a.joinUrl || '').replace(/"/g, '""')}"`,
        `"${(a.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Appointments_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `Exported ${filteredAppointments.length} appointment records to CSV.`
      });
    } catch (err: any) {
      console.error('Export failed:', err);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: err.message || 'Could not export appointments.'
      });
    }
  };

  const amOptions: Option[] = useMemo(() => {
    return filterOptions.accountManagers.map(am => ({ value: am, label: am }));
  }, [filterOptions.accountManagers]);

  const bookerOptions: Option[] = useMemo(() => {
    return filterOptions.bookedBy.map(b => ({ value: b, label: b }));
  }, [filterOptions.bookedBy]);

  const bucketOptions: Option[] = useMemo(() => {
    return filterOptions.originalBuckets.map(b => ({ value: b, label: b }));
  }, [filterOptions.originalBuckets]);

  const statusOptions: Option[] = useMemo(() => [
    { value: 'Completed', label: 'Completed' },
    { value: 'Pending', label: 'Scheduled / Pending' },
    { value: 'Overdue Pending', label: 'Overdue Pending (Action Needed)' },
    { value: 'Rescheduled', label: 'Rescheduled' },
    { value: 'No Show', label: 'No Show' },
    { value: 'Cancelled', label: 'Cancelled' },
  ], []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (companySearch.trim()) count++;
    if (selectedAMs.length > 0) count++;
    if (selectedBookedBy.length > 0) count++;
    if (selectedBuckets.length > 0) count++;
    if (selectedStatuses.length > 0) count++;
    if (selectedLeadStatusChange !== 'all') count++;
    if (bookedDateRange?.from) count++;
    if (apptDateRange?.from) count++;
    return count;
  }, [
    companySearch,
    selectedAMs,
    selectedBookedBy,
    selectedBuckets,
    selectedStatuses,
    selectedLeadStatusChange,
    bookedDateRange,
    apptDateRange
  ]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-[#095c7b]/20 border-t-[#095c7b] animate-spin" />
          <CalendarCheck className="h-8 w-8 text-[#095c7b] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Verifying Permissions</h3>
          <p className="text-sm text-slate-500 mt-1">Checking access rights...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm my-6 max-w-2xl mx-auto">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-full border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 shadow-sm">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Access Restricted</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            This page can only be accessed by Admin, Superadmins, Sales Managers, and Outbound Admins.
          </p>
        </div>
        <div className="pt-2 flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/">Return to Dashboard</Link>
          </Button>
          <Button variant="default" className="bg-[#095c7b] hover:bg-[#074760] text-white" asChild>
            <Link href="/appointments">View My Appointments</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <CalendarCheck className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Loading Appointment Reporting</h3>
          <p className="text-sm text-slate-500 mt-1">Aggregating booking history, outcomes, AM performance, and lead transitions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#095c7b] to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <CalendarCheck className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Appointment Reporting
                <Badge className="bg-cyan-400/20 text-cyan-200 border-cyan-400/30 text-xs font-semibold px-2.5 py-0.5">
                  Analytics & Outcomes
                </Badge>
              </h1>
              <p className="text-sm text-cyan-100/80 mt-0.5">
                Complete overview of booked appointments, scheduled dates, AM assignments, outcomes, and post-appointment lead status transitions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm transition-all text-xs font-semibold"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", refreshing && "animate-spin")} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm transition-all text-xs font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-400" />
            Export CSV ({filteredAppointments.length})
          </Button>

          <Button
            asChild
            variant="secondary"
            size="sm"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all"
          >
            <Link href="/appointments">
              <CalendarIcon className="h-4 w-4 mr-1.5" />
              All Appointments View
            </Link>
          </Button>
        </div>
      </div>

      {/* Overdue Action Banner if overdue pending exists */}
      {stats.overdue > 0 && (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/95 dark:bg-rose-950/70 dark:border-rose-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
            <div>
              <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm flex items-center gap-2">
                {stats.overdue} Overdue Pending Appointments
                <Badge variant="destructive" className="font-bold text-[10px] uppercase">Action Required</Badge>
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                These appointments have passed their scheduled meeting date without a resolution. Please update them to Completed, No Show, Rescheduled, or Cancelled.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setSelectedStatuses(['Overdue Pending']);
              setActiveTab('table');
            }}
            className="font-bold text-xs shrink-0 whitespace-nowrap shadow-sm"
          >
            Filter Overdue ({stats.overdue})
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-3">
        <AnimatedStatCard
          title="Unique Customers"
          value={stats.uniqueCustomers}
          icon={<Building2 className="h-4 w-4" />}
          accentColor="indigo"
          description="Accounts booked"
          onClick={() => {
            setSelectedStatuses([]);
            setSelectedLeadStatusChange('all');
            setActiveTab('table');
          }}
          className="cursor-pointer hover:ring-2 hover:ring-indigo-500/40 transition-all"
        />

        <AnimatedStatCard
          title="Total Booked"
          value={stats.total}
          icon={<CalendarCheck className="h-4 w-4" />}
          accentColor="navy"
          description="All appointments"
          onClick={() => {
            setSelectedStatuses([]);
            setSelectedLeadStatusChange('all');
            setActiveTab('table');
          }}
          className="cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
        />

        <AnimatedStatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accentColor="emerald"
          badgeText={`${stats.completionRate}%`}
          description="Successfully held"
          onClick={() => {
            setSelectedStatuses(['Completed']);
            setActiveTab('table');
          }}
          className="cursor-pointer hover:ring-2 hover:ring-emerald-500/40 transition-all"
        />

        <AnimatedStatCard
          title="Scheduled"
          value={stats.pending}
          icon={<Clock className="h-4 w-4" />}
          accentColor="blue"
          description="Awaiting meeting"
          onClick={() => {
            setSelectedStatuses(['Pending']);
            setActiveTab('table');
          }}
          className="cursor-pointer hover:ring-2 hover:ring-blue-500/40 transition-all"
        />

        <AnimatedStatCard
          title="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle className="h-4 w-4" />}
          accentColor="rose"
          badgeText="Pending"
          description="Passed date"
          onClick={() => {
            setSelectedStatuses(['Overdue Pending']);
            setActiveTab('table');
          }}
          className="cursor-pointer hover:ring-2 hover:ring-rose-500/40 transition-all"
        />

        <AnimatedStatCard
          title="No Show"
          value={stats.noShow}
          icon={<XCircle className="h-4 w-4" />}
          accentColor="amber"
          badgeText={`${stats.noShowRate}%`}
          description="Missed meeting"
          onClick={() => {
            setSelectedStatuses(['No Show']);
            setActiveTab('table');
          }}
          className="cursor-pointer hover:ring-2 hover:ring-amber-500/40 transition-all"
        />

        <AnimatedStatCard
          title="Rescheduled"
          value={stats.rescheduled}
          icon={<RotateCcw className="h-4 w-4" />}
          accentColor="purple"
          badgeText={`${stats.rescheduleRate}%`}
          description="Moved date"
          onClick={() => {
            setSelectedStatuses(['Rescheduled']);
            setActiveTab('table');
          }}
          className="cursor-pointer hover:ring-2 hover:ring-purple-500/40 transition-all"
        />

        <AnimatedStatCard
          title="Status Changed"
          value={stats.statusChanged}
          icon={<TrendingUp className="h-4 w-4" />}
          accentColor="teal"
          badgeText={`${stats.statusChangeRate}%`}
          description="Post-appt change"
          onClick={() => {
            setSelectedLeadStatusChange('changed');
            setActiveTab('table');
          }}
          className="cursor-pointer hover:ring-2 hover:ring-teal-500/40 transition-all"
        />

        <AnimatedStatCard
          title="Won / Signed"
          value={stats.wonSigned}
          icon={<Trophy className="h-4 w-4 text-emerald-500" />}
          accentColor="emerald"
          badgeText={`${stats.wonRate}%`}
          description="Converted leads"
          onClick={() => {
            setSelectedLeadStatusChange('won');
            setActiveTab('table');
          }}
          className="cursor-pointer hover:ring-2 hover:ring-emerald-500/40 transition-all"
        />
      </div>

      {/* Filter Control Center */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-bold">Filters & Segments</CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="text-xs font-semibold px-2">
                  {activeFiltersCount} active
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Timeframe:</span>
              {[
                { id: 'thismonth', label: 'This Month' },
                { id: 'lastmonth', label: 'Last Month' },
                { id: 'thisweek', label: 'This Week' },
                { id: 'today', label: 'Today' },
                { id: 'all', label: 'All Time' },
              ].map(preset => (
                <Button
                  key={preset.id}
                  type="button"
                  variant={bookedDatePreset === preset.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleBookedDatePreset(preset.id)}
                  className={cn(
                    "h-7 px-2.5 text-xs font-semibold rounded-full",
                    bookedDatePreset === preset.id
                      ? "bg-[#095c7b] text-white hover:bg-[#074760]"
                      : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                  )}
                >
                  {preset.label}
                </Button>
              ))}

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 ml-auto"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Row 1: Search & Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Search Company / Contact */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                Company / Contact Search
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search company, contact, phone..."
                  value={companySearch}
                  onChange={e => {
                    setCompanySearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 pr-8 h-9 text-xs"
                />
                {companySearch && (
                  <button
                    onClick={() => setCompanySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Account Manager (AM) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Account Manager (AM)
              </label>
              <MultiSelectCombobox
                options={amOptions}
                selected={selectedAMs}
                onSelectedChange={(v: string[]) => {
                  setSelectedAMs(v);
                  setCurrentPage(1);
                }}
                placeholder="All Account Managers"
                className="h-9 text-xs"
              />
            </div>

            {/* Original Bucket */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                Original Bucket
              </label>
              <MultiSelectCombobox
                options={bucketOptions}
                selected={selectedBuckets}
                onSelectedChange={(v: string[]) => {
                  setSelectedBuckets(v);
                  setCurrentPage(1);
                }}
                placeholder="All Original Buckets"
                className="h-9 text-xs"
              />
            </div>

            {/* Appointment Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <CalendarCheck className="h-3.5 w-3.5 text-slate-400" />
                Appointment Outcome
              </label>
              <MultiSelectCombobox
                options={statusOptions}
                selected={selectedStatuses}
                onSelectedChange={(v: string[]) => {
                  setSelectedStatuses(v);
                  setCurrentPage(1);
                }}
                placeholder="All Appointment Outcomes"
                className="h-9 text-xs"
              />
            </div>

            {/* Booked By / Dialer */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Booked By (SDR / Dialer)
              </label>
              <MultiSelectCombobox
                options={bookerOptions}
                selected={selectedBookedBy}
                onSelectedChange={(v: string[]) => {
                  setSelectedBookedBy(v);
                  setCurrentPage(1);
                }}
                placeholder="All Bookers"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Row 2: Date Filters & Lead Status Shift */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Appointment Creation Date (When Booked) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5 text-blue-500" />
                  Booking Creation Date (When Booked)
                </label>
                {bookedDateRange?.from && (
                  <button
                    onClick={() => handleBookedDatePreset('all')}
                    className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Select value={bookedDatePreset} onValueChange={handleBookedDatePreset}>
                  <SelectTrigger className="h-9 text-xs w-[130px]">
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="thisweek">This Week</SelectItem>
                    <SelectItem value="lastweek">Last Week</SelectItem>
                    <SelectItem value="thismonth">This Month</SelectItem>
                    <SelectItem value="lastmonth">Last Month</SelectItem>
                    <SelectItem value="thisyear">This Year</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 text-xs flex-1 justify-start font-normal text-left">
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                      {bookedDateRange?.from ? (
                        bookedDateRange.to ? (
                          <>
                            {format(bookedDateRange.from, 'LLL dd, y')} - {format(bookedDateRange.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(bookedDateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        <span className="text-slate-400">Custom Range...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      initialFocus
                      mode="range"
                      defaultMonth={bookedDateRange?.from}
                      selected={bookedDateRange}
                      onSelect={range => {
                        setBookedDateRange(range);
                        setBookedDatePreset('custom');
                        setCurrentPage(1);
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Appointment Date (Scheduled Meeting Date) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Appointment Date (Scheduled Meeting)
                </label>
                {apptDateRange?.from && (
                  <button
                    onClick={() => handleApptDatePreset('all')}
                    className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Select value={apptDatePreset} onValueChange={handleApptDatePreset}>
                  <SelectTrigger className="h-9 text-xs w-[130px]">
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="thisweek">This Week</SelectItem>
                    <SelectItem value="lastweek">Last Week</SelectItem>
                    <SelectItem value="thismonth">This Month</SelectItem>
                    <SelectItem value="lastmonth">Last Month</SelectItem>
                    <SelectItem value="thisyear">This Year</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 text-xs flex-1 justify-start font-normal text-left">
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                      {apptDateRange?.from ? (
                        apptDateRange.to ? (
                          <>
                            {format(apptDateRange.from, 'LLL dd, y')} - {format(apptDateRange.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(apptDateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        <span className="text-slate-400">Custom Range...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      initialFocus
                      mode="range"
                      defaultMonth={apptDateRange?.from}
                      selected={apptDateRange}
                      onSelect={range => {
                        setApptDateRange(range);
                        setApptDatePreset('custom');
                        setCurrentPage(1);
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Post-Appointment Lead Status Transition */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                Post-Appointment Lead Status Shift
              </label>
              <Select
                value={selectedLeadStatusChange}
                onValueChange={v => {
                  setSelectedLeadStatusChange(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Lead Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads (Changed & Unchanged)</SelectItem>
                  <SelectItem value="changed">Status Changed After Appointment ({stats.statusChanged})</SelectItem>
                  <SelectItem value="unchanged">Status Unchanged / Pending ({stats.total - stats.statusChanged})</SelectItem>
                  <SelectItem value="won">Converted to Won / Signed ({stats.wonSigned})</SelectItem>
                  <SelectItem value="pipeline">Active in Pipeline ({stats.activePipeline})</SelectItem>
                  <SelectItem value="lost">Moved to Lost / Disqualified ({stats.lostDisqualified})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs: Table vs Analytics vs Progression */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
            <TabsTrigger value="table" className="text-xs font-bold gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Detailed Appointments Table ({filteredAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs font-bold gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Outcome & AM Analytics
            </TabsTrigger>
            <TabsTrigger value="progression" className="text-xs font-bold gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Lead Status Progression Funnel
            </TabsTrigger>
          </TabsList>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Showing <strong>{filteredAppointments.length}</strong> of {allAppointments.length} total booked appointments</span>
          </div>
        </div>

        {/* TAB 1: DETAILED APPOINTMENTS TABLE - GROUPED BY COMPANY */}
        <TabsContent value="table" className="space-y-4">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Grouped Table Header Bar with Global Expand / Collapse */}
            <div className="px-4 py-3 border-b bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#095c7b]/10 text-[#095c7b] dark:text-cyan-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Grouped by Company Name</span>
                    <Badge variant="outline" className="text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {companyGroups.length} {companyGroups.length === 1 ? 'Company' : 'Companies'}
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Click any company row to expand and view all booked appointments and historical outcomes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {expandedCompanies.size === companyGroups.length && companyGroups.length > 0 ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={collapseAll}
                    className="h-8 text-xs font-semibold gap-1.5 shadow-sm"
                  >
                    <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                    <span>Collapse All</span>
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => expandAll(companyGroups.map(g => g.key))}
                    className="h-8 text-xs font-semibold gap-1.5 shadow-sm"
                  >
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    <span>Expand All ({companyGroups.length})</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-100/75 dark:bg-slate-800/75 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 px-3"></TableHead>
                    <TableHead 
                      className="cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-200"
                      onClick={() => handleSort('companyName')}
                    >
                      <div className="flex items-center gap-1">
                        Company Name
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-200"
                      onClick={() => handleSort('appointmentDate')}
                    >
                      <div className="flex items-center gap-1">
                        Appointments Count
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-200">
                      Outcome Breakdown
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-200"
                      onClick={() => handleSort('bookedWith')}
                    >
                      <div className="flex items-center gap-1">
                        Booked With (AM)
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-200"
                      onClick={() => handleSort('originalBucket')}
                    >
                      <div className="flex items-center gap-1">
                        Original Bucket
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-200"
                      onClick={() => handleSort('currentLeadStatus')}
                    >
                      <div className="flex items-center gap-1">
                        Current Lead Status
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-200 text-center">
                      Status Changed?
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-200 text-right pr-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedCompanyGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CalendarIcon className="h-8 w-8 text-slate-300" />
                          <p className="font-semibold text-sm">No appointment records found matching the active filters.</p>
                          <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2 text-xs">
                            Reset Filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCompanyGroups.map((group) => {
                      const isExpanded = expandedCompanies.has(group.key);
                      return (
                        <React.Fragment key={group.key}>
                          {/* Parent Company Row */}
                          <TableRow 
                            onClick={() => toggleCompanyExpanded(group.key)}
                            className={cn(
                              "cursor-pointer transition-colors border-b select-none",
                              isExpanded 
                                ? "bg-slate-100/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700" 
                                : "hover:bg-slate-50/70 dark:hover:bg-slate-900/70"
                            )}
                          >
                            {/* Chevron Toggle Button */}
                            <TableCell className="w-10 px-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCompanyExpanded(group.key);
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-[#095c7b] dark:text-cyan-400 font-bold transition-transform duration-200" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200" />
                                )}
                              </Button>
                            </TableCell>

                            {/* Company Name & Contact Info */}
                            <TableCell className="font-medium py-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Link
                                    href={`/leads/${group.leadId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 group text-sm"
                                  >
                                    <span>{group.companyName}</span>
                                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                  </Link>
                                  {group.franchisee && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                                      {group.franchisee}
                                    </Badge>
                                  )}
                                  {group.state && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-50 text-slate-500 border-slate-200">
                                      {group.state}
                                    </Badge>
                                  )}
                                </div>
                                {(group.contactName || group.contactPhone || group.contactEmail) && (
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                                    {group.contactName && (
                                      <span className="flex items-center gap-0.5 font-medium text-slate-700 dark:text-slate-300">
                                        <User className="h-3 w-3 text-slate-400" />
                                        {group.contactName}
                                      </span>
                                    )}
                                    {group.contactPhone && (
                                      <span className="flex items-center gap-0.5">
                                        <Phone className="h-2.5 w-2.5 text-slate-400" />
                                        {group.contactPhone}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Appointments Count & Date */}
                            <TableCell className="text-xs whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-[#095c7b] text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-xs">
                                  {group.appointments.length} {group.appointments.length === 1 ? 'Appt' : 'Appts'}
                                </Badge>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Latest: {safeFormatDate(group.latestAppointmentDate, 'd MMM yyyy')}
                                </span>
                              </div>
                            </TableCell>

                            {/* Outcome Summary Breakdown */}
                            <TableCell>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {group.statusCounts.Completed > 0 && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-semibold">
                                    Completed ({group.statusCounts.Completed})
                                  </Badge>
                                )}
                                {group.statusCounts.Overdue > 0 && (
                                  <Badge variant="destructive" className="text-[10px] font-bold">
                                    Overdue ({group.statusCounts.Overdue})
                                  </Badge>
                                )}
                                {group.statusCounts.Pending > 0 && (
                                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 text-[10px] font-semibold">
                                    Scheduled ({group.statusCounts.Pending})
                                  </Badge>
                                )}
                                {group.statusCounts['No Show'] > 0 && (
                                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] font-semibold">
                                    No Show ({group.statusCounts['No Show']})
                                  </Badge>
                                )}
                                {group.statusCounts.Rescheduled > 0 && (
                                  <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 text-[10px] font-semibold">
                                    Rescheduled ({group.statusCounts.Rescheduled})
                                  </Badge>
                                )}
                                {group.statusCounts.Cancelled > 0 && (
                                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 text-[10px] font-semibold">
                                    Cancelled ({group.statusCounts.Cancelled})
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* Booked With (AM) */}
                            <TableCell className="text-xs">
                              <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                {group.bookedWith || 'Unassigned AM'}
                              </div>
                            </TableCell>

                            {/* Original Bucket */}
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className="text-[11px] font-semibold bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {group.originalBucket}
                              </Badge>
                            </TableCell>

                            {/* Current Lead Status */}
                            <TableCell>
                              <LeadStatusBadge status={group.currentLeadStatus as any} />
                            </TableCell>

                            {/* Status Changed Post-Appt */}
                            <TableCell className="text-center">
                              {group.hasStatusChanged ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-2">
                                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                                  Changed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]">
                                  Unchanged
                                </Badge>
                              )}
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right pr-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCompanyExpanded(group.key);
                                  }}
                                  className="h-8 text-xs font-semibold gap-1 text-slate-600 dark:text-slate-300 hover:text-primary"
                                >
                                  <span>{isExpanded ? 'Hide' : 'View'} ({group.appointments.length})</span>
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* EXPANDED SECTION: All Appointments for this Company */}
                          {isExpanded && (
                            <TableRow className="bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-50/60 border-b">
                              <TableCell colSpan={9} className="p-0">
                                <div className="p-4 pl-12 pr-6 border-l-4 border-l-[#095c7b] bg-gradient-to-b from-slate-50/90 to-white dark:from-slate-900/90 dark:to-slate-950 space-y-3">
                                  <div className="flex items-center justify-between gap-2 border-b pb-2">
                                    <div className="flex items-center gap-2">
                                      <CalendarCheck className="h-4 w-4 text-[#095c7b] dark:text-cyan-400" />
                                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                        All Booked Appointments for {group.companyName} ({group.appointments.length})
                                      </span>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      asChild
                                      className="h-7 text-xs gap-1 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-950/20"
                                    >
                                      <Link href={`/leads/${group.leadId}`}>
                                        <ExternalLink className="h-3 w-3" />
                                        Open Lead Profile
                                      </Link>
                                    </Button>
                                  </div>

                                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                                    <Table>
                                      <TableHeader className="bg-slate-100/80 dark:bg-slate-800/80 text-[11px]">
                                        <TableRow className="hover:bg-transparent">
                                          <TableHead className="font-bold py-2 text-slate-700 dark:text-slate-200 w-12 text-center">#</TableHead>
                                          <TableHead className="font-bold py-2 text-slate-700 dark:text-slate-200">When Booked (Creation Date)</TableHead>
                                          <TableHead className="font-bold py-2 text-slate-700 dark:text-slate-200">Scheduled Meeting Time</TableHead>
                                          <TableHead className="font-bold py-2 text-slate-700 dark:text-slate-200">Appointment Status</TableHead>
                                          <TableHead className="font-bold py-2 text-slate-700 dark:text-slate-200">Who Booked (Dialer / SDR)</TableHead>
                                          <TableHead className="font-bold py-2 text-slate-700 dark:text-slate-200">Booked With (AM)</TableHead>
                                          <TableHead className="font-bold py-2 text-slate-700 dark:text-slate-200">Original Bucket</TableHead>
                                          <TableHead className="font-bold py-2 text-slate-700 dark:text-slate-200 text-right pr-3">Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {group.appointments.map((appt, idx) => (
                                          <TableRow key={`${appt.leadId}-${appt.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs">
                                            <TableCell className="font-bold text-slate-400 py-2.5 text-center">
                                              #{idx + 1}
                                            </TableCell>
                                            
                                            {/* When Booked */}
                                            <TableCell className="py-2.5 whitespace-nowrap">
                                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                                {safeFormatDate(appt.bookedAt, 'EEE, d MMM yyyy')}
                                              </div>
                                              <div className="text-[11px] text-slate-500">
                                                {safeFormatDate(appt.bookedAt, 'h:mm a')}
                                              </div>
                                            </TableCell>

                                            {/* Scheduled Appointment Date */}
                                            <TableCell className="py-2.5 whitespace-nowrap">
                                              <div className="flex items-center gap-1.5">
                                                <CalendarClock className="h-3.5 w-3.5 text-[#095c7b] dark:text-cyan-400 shrink-0" />
                                                <div>
                                                  <div className="font-bold text-slate-900 dark:text-slate-100">
                                                    {safeFormatDate(appt.appointmentDate, 'EEE, d MMM yyyy')}
                                                  </div>
                                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                                                    {safeFormatDate(appt.appointmentDate, 'h:mm a')}
                                                    {appt.meetingType && (
                                                      <span className="ml-1 text-[10px] text-slate-400">({appt.meetingType})</span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              {appt.isOverdue && (
                                                <Badge variant="destructive" className="text-[9px] uppercase px-1 py-0 mt-0.5 font-bold">
                                                  Overdue Pending
                                                </Badge>
                                              )}
                                            </TableCell>

                                            {/* Appointment Status */}
                                            <TableCell className="py-2.5">
                                              <div className="flex flex-col gap-1">
                                                <AppointmentStatusBadge status={appt.appointmentStatus} />
                                                {appt.notes && (
                                                  <p className="text-[10px] text-slate-500 truncate max-w-[200px]" title={appt.notes}>
                                                    {appt.notes}
                                                  </p>
                                                )}
                                              </div>
                                            </TableCell>

                                            {/* Who Booked */}
                                            <TableCell className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                                              <div className="flex items-center gap-1">
                                                <User className="h-3 w-3 text-slate-400" />
                                                <span>{appt.bookedBy}</span>
                                              </div>
                                            </TableCell>

                                            {/* Booked With */}
                                            <TableCell className="py-2.5 font-bold text-indigo-700 dark:text-indigo-300">
                                              <div className="flex items-center gap-1">
                                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                                <span>{appt.bookedWith}</span>
                                              </div>
                                            </TableCell>

                                            {/* Original Bucket */}
                                            <TableCell className="py-2.5">
                                              <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300">
                                                {appt.originalBucket}
                                              </Badge>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="py-2.5 text-right pr-3">
                                              <div className="flex items-center justify-end gap-1">
                                                {appt.joinUrl && (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                    className="h-7 text-[11px] px-2 text-blue-600 gap-1 border-blue-200"
                                                  >
                                                    <a href={appt.joinUrl} target="_blank" rel="noreferrer">
                                                      <Video className="h-3 w-3" />
                                                      Join
                                                    </a>
                                                  </Button>
                                                )}

                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    setStatusDialogAppt(appt);
                                                    setNewStatusValue(appt.appointmentStatus);
                                                    setStatusNotes(appt.notes || '');
                                                  }}
                                                  className="h-7 text-[11px] px-2 gap-1 text-[#095c7b] border-slate-200 hover:bg-slate-100"
                                                >
                                                  <CalendarCheck className="h-3 w-3" />
                                                  Status
                                                </Button>

                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end" className="w-44">
                                                    <DropdownMenuItem asChild>
                                                      <Link href={`/leads/${appt.leadId}`} className="cursor-pointer text-xs">
                                                        <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                                        Open Lead Profile
                                                      </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                      onClick={() => {
                                                        setStatusDialogAppt(appt);
                                                        setNewStatusValue(appt.appointmentStatus);
                                                        setStatusNotes(appt.notes || '');
                                                      }}
                                                      className="cursor-pointer text-xs text-primary font-semibold"
                                                    >
                                                      <CalendarCheck className="h-3.5 w-3.5 mr-2" />
                                                      Change Outcome
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls for Company Groups */}
            <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Companies per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={v => {
                    setPageSize(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="-1">All</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-slate-500 ml-2">
                  Showing {paginatedCompanyGroups.length > 0 ? (currentPage - 1) * (pageSize === -1 ? companyGroups.length : pageSize) + 1 : 0} -{' '}
                  {pageSize === -1 ? companyGroups.length : Math.min(currentPage * pageSize, companyGroups.length)} of {companyGroups.length} companies ({filteredAppointments.length} total appointments)
                </span>
              </div>

              {pageSize !== -1 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: OUTCOME & AM ANALYTICS */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Charts Row 1: Donut Outcome & Original Bucket Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Outcome Breakdown Donut */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  Appointment Outcome Distribution
                </CardTitle>
                <CardDescription>Breakdown of all {stats.total} booked appointments by outcome</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {stats.outcomeChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data to display</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.outcomeChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {stats.outcomeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value} appointments`, 'Count']} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Original Bucket Breakdown Bar */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Appointments by Original Lead Bucket
                </CardTitle>
                <CardDescription>Volume and completion rate by source bucket when booked</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {stats.bucketChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data to display</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.bucketChartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                      <Bar dataKey="Total" fill="#095c7b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Won / Signed" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Account Manager (AM) Performance Breakdown Table & Chart */}
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <User className="h-5 w-5 text-indigo-600" />
                    Account Manager (AM) Breakdown & Outcomes
                  </CardTitle>
                  <CardDescription>
                    Performance of assigned Account Managers across booked appointments and conversion to won accounts.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100/60 dark:bg-slate-900/60">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Account Manager</TableHead>
                      <TableHead className="text-center font-bold text-xs">Total Appointments</TableHead>
                      <TableHead className="text-center font-bold text-xs text-emerald-600">Completed</TableHead>
                      <TableHead className="text-center font-bold text-xs text-blue-600">Scheduled / Pending</TableHead>
                      <TableHead className="text-center font-bold text-xs text-purple-600">Rescheduled</TableHead>
                      <TableHead className="text-center font-bold text-xs text-amber-600">No Show</TableHead>
                      <TableHead className="text-center font-bold text-xs text-rose-600">Cancelled</TableHead>
                      <TableHead className="text-center font-bold text-xs text-emerald-700">Won / Signed</TableHead>
                      <TableHead className="text-right font-bold text-xs">Completion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.amChartData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-6 text-slate-400">
                          No Account Manager data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.amChartData.map(row => (
                        <TableRow key={row.am} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <TableCell className="font-bold text-xs text-indigo-900 dark:text-indigo-200">
                            {row.am}
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs">{row.Total}</TableCell>
                          <TableCell className="text-center font-semibold text-xs text-emerald-600">{row.Completed}</TableCell>
                          <TableCell className="text-center text-xs text-blue-600">{row.Pending}</TableCell>
                          <TableCell className="text-center text-xs text-purple-600">{row.Rescheduled}</TableCell>
                          <TableCell className="text-center text-xs text-amber-600">{row['No Show']}</TableCell>
                          <TableCell className="text-center text-xs text-rose-600">{row.Cancelled}</TableCell>
                          <TableCell className="text-center font-bold text-xs text-emerald-700">{row['Won / Signed']}</TableCell>
                          <TableCell className="text-right font-bold text-xs">
                            <Badge className={cn("text-xs font-bold", row.completionRate >= 50 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700")}>
                              {row.completionRate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Booker / Dialer Breakdown Table */}
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Booked By (Dialer / SDR) Leaderboard & Outcomes
              </CardTitle>
              <CardDescription>
                Breakdown of appointments scheduled by each team member and resulting outcome rates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100/60 dark:bg-slate-900/60">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Booked By (Dialer / SDR)</TableHead>
                      <TableHead className="text-center font-bold text-xs">Appointments Booked</TableHead>
                      <TableHead className="text-center font-bold text-xs text-emerald-600">Completed</TableHead>
                      <TableHead className="text-center font-bold text-xs text-purple-600">Rescheduled</TableHead>
                      <TableHead className="text-center font-bold text-xs text-amber-600">No Show</TableHead>
                      <TableHead className="text-center font-bold text-xs text-rose-600">Cancelled</TableHead>
                      <TableHead className="text-center font-bold text-xs text-emerald-700">Won / Signed</TableHead>
                      <TableHead className="text-right font-bold text-xs">Win Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.bookerChartData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-slate-400">
                          No Booker data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.bookerChartData.map(row => (
                        <TableRow key={row.booker} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {row.booker}
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs">{row.Total}</TableCell>
                          <TableCell className="text-center font-semibold text-xs text-emerald-600">{row.Completed}</TableCell>
                          <TableCell className="text-center text-xs text-purple-600">{row.Rescheduled}</TableCell>
                          <TableCell className="text-center text-xs text-amber-600">{row['No Show']}</TableCell>
                          <TableCell className="text-center text-xs text-rose-600">{row.Cancelled}</TableCell>
                          <TableCell className="text-center font-bold text-xs text-emerald-700">{row['Won / Signed']}</TableCell>
                          <TableCell className="text-right font-bold text-xs">
                            <Badge className="bg-emerald-100 text-emerald-800 text-xs font-bold">
                              {row.winRate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: LEAD STATUS PROGRESSION FUNNEL */}
        <TabsContent value="progression" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Post-Appointment Lead Status Transition Analysis
              </CardTitle>
              <CardDescription>
                Track how leads progressed after the appointment was booked (e.g. from Appointment Booked to Quote Sent, Won, or other pipeline statuses).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Top Summary Progress Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border bg-purple-50/60 dark:bg-purple-950/40 border-purple-200">
                  <div className="text-xs font-semibold text-purple-700 uppercase">Status Shift Rate</div>
                  <div className="text-2xl font-black text-purple-900 dark:text-purple-100 mt-1">{stats.statusChangeRate}%</div>
                  <p className="text-xs text-purple-600 mt-1">{stats.statusChanged} of {stats.total} leads progressed</p>
                </div>

                <div className="p-4 rounded-xl border bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200">
                  <div className="text-xs font-semibold text-emerald-700 uppercase">Won / Signed Conversion</div>
                  <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">{stats.wonRate}%</div>
                  <p className="text-xs text-emerald-600 mt-1">{stats.wonSigned} signed deals achieved</p>
                </div>

                <div className="p-4 rounded-xl border bg-blue-50/60 dark:bg-blue-950/40 border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 uppercase">Active In Pipeline</div>
                  <div className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-1">{stats.activePipeline}</div>
                  <p className="text-xs text-blue-600 mt-1">Quotes, trials & ongoing engagement</p>
                </div>

                <div className="p-4 rounded-xl border bg-slate-50/60 dark:bg-slate-900/40 border-slate-200">
                  <div className="text-xs font-semibold text-slate-700 uppercase">Still In Booking Stage</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.total - stats.statusChanged}</div>
                  <p className="text-xs text-slate-500 mt-1">Awaiting status update after meeting</p>
                </div>
              </div>

              {/* Status Breakdown Bar Chart */}
              <div className="h-[320px]">
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Current Status Breakdown of Booked Leads</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.leadStatusChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="status" type="category" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val: any) => [`${val} leads`, 'Count']} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QUICK STATUS UPDATE DIALOG */}
      <Dialog open={!!statusDialogAppt} onOpenChange={open => !open && setStatusDialogAppt(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Update Appointment Status
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update the outcome status for <strong>{statusDialogAppt?.companyName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Appointment Outcome</label>
              <Select
                value={newStatusValue}
                onValueChange={(val: any) => setNewStatusValue(val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Completed">Completed (Successfully Held)</SelectItem>
                  <SelectItem value="No Show">No Show (Prospect Missed)</SelectItem>
                  <SelectItem value="Rescheduled">Rescheduled (Moved to New Time)</SelectItem>
                  <SelectItem value="Cancelled">Cancelled (Meeting Called Off)</SelectItem>
                  <SelectItem value="Pending">Pending (Scheduled)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Resolution Notes (Optional)</label>
              <Input
                placeholder="e.g., Prospect attended, demonstrated LocalMile, sent quote..."
                value={statusNotes}
                onChange={e => setStatusNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setStatusDialogAppt(null)} disabled={updatingStatus} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdateAppointmentStatus} disabled={updatingStatus} className="text-xs font-bold">
              {updatingStatus ? 'Saving...' : 'Save Outcome'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
