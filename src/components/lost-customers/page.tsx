'use client';

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
import type { Lead, Address } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Building, Mail, MapPin, Phone, Search, XCircle, Trash2, Calendar, FileText, Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCompaniesFromFirebase } from '@/services/firebase';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend as RechartsLegend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatAddress = (address?: Address) => {
  if (!address) return 'N/A';
  return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
};

const parseDDMMYYYY = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

type SortKey = 'entityId' | 'companyName' | 'franchisee' | 'cancellationdate';

export default function LostCustomersComponent() {
  const [lostCustomers, setLostCustomers] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState({
    companyName: '',
    franchisee: '',
    reason: '',
    startDate: '',
    endDate: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    companyName: '',
    franchisee: '',
    reason: '',
    startDate: '',
    endDate: '',
  });
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({
    key: 'cancellationdate',
    direction: 'descending',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const companies = await getCompaniesFromFirebase({
        skipCoordinateCheck: true,
        franchisee: userProfile?.activeRole === 'Franchisee' ? userProfile.franchisee : undefined,
      });

      // Filter for lost status
      const lostCompanies = companies.filter(
        (c) => c.status === 'Lost Customer' || c.customerStatus === 'Lost Customer'
      );

      const combined = lostCompanies.map((c) => ({ ...c, isCompany: true }));

      // Remove duplicate IDs just in case
      const seenIds = new Set<string>();
      const uniqueList = combined.filter((item) => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      });

      setLostCustomers(uniqueList);
    } catch (error) {
      console.error('Failed to fetch lost customers:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch lost customers.' });
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = canView('signedCustomers');

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    if (authLoading || loadingPermissions || !userProfile) return;

    if (hasAccess) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, authLoading, loadingPermissions, router, userProfile, hasAccess]);

  const handleFilterChange = (filterName: keyof typeof draftFilters, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      companyName: '',
      franchisee: '',
      reason: '',
      startDate: '',
      endDate: '',
    };
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setCurrentPage(1);
  };

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const filteredAndSortedList = useMemo(() => {
    let result = lostCustomers.filter((item) => {
      const companyMatch = appliedFilters.companyName
        ? item.companyName.toLowerCase().includes(appliedFilters.companyName.toLowerCase())
        : true;
      const franchiseeMatch = appliedFilters.franchisee
        ? (item.franchisee || '').toLowerCase().includes(appliedFilters.franchisee.toLowerCase())
        : true;
      const reasonMatch = appliedFilters.reason
        ? (item.cancellationReason || '').toLowerCase().includes(appliedFilters.reason.toLowerCase()) ||
          (item.cancellationTheme || '').toLowerCase().includes(appliedFilters.reason.toLowerCase())
        : true;

      const dateMatch = (() => {
        if (!appliedFilters.startDate && !appliedFilters.endDate) return true;
        const itemDate = parseDDMMYYYY(item.cancellationdate);
        if (!itemDate) return false;

        if (appliedFilters.startDate) {
          const start = new Date(appliedFilters.startDate);
          start.setHours(0, 0, 0, 0);
          if (itemDate < start) return false;
        }
        if (appliedFilters.endDate) {
          const end = new Date(appliedFilters.endDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end) return false;
        }
        return true;
      })();

      return companyMatch && franchiseeMatch && reasonMatch && dateMatch;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        if (sortConfig.key === 'cancellationdate') {
          const dateA = parseDDMMYYYY(a.cancellationdate)?.getTime() || 0;
          const dateB = parseDDMMYYYY(b.cancellationdate)?.getTime() || 0;
          return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
        }

        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';

        if (sortConfig.key === 'entityId') {
          valA = (a as any).entityId || '';
          valB = (b as any).entityId || '';
        }

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [lostCustomers, appliedFilters, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedList.length / itemsPerPage);
  const paginatedList = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedList, currentPage, itemsPerPage]);

  const appliedReportingStats = useMemo(() => {
    let startLimit: Date | null = null;
    let endLimit: Date | null = null;
    let title = '';

    if (appliedFilters.startDate || appliedFilters.endDate) {
      if (appliedFilters.startDate) {
        startLimit = new Date(appliedFilters.startDate);
        startLimit.setHours(0, 0, 0, 0);
      }
      if (appliedFilters.endDate) {
        endLimit = new Date(appliedFilters.endDate);
        endLimit.setHours(23, 59, 59, 999);
      }

      const formatBound = (d: Date) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      if (startLimit && endLimit) {
        title = `${formatBound(startLimit)} - ${formatBound(endLimit)}`;
      } else if (startLimit) {
        title = `From ${formatBound(startLimit)}`;
      } else if (endLimit) {
        title = `Until ${formatBound(endLimit)}`;
      }
    } else {
      const now = new Date();
      startLimit = new Date(now.getFullYear(), now.getMonth(), 1);
      endLimit = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      title = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }

    const matchingCancellations = lostCustomers.filter((item) => {
      const parsedDate = parseDDMMYYYY(item.cancellationdate);
      if (!parsedDate) return false;

      if (startLimit && parsedDate < startLimit) return false;
      if (endLimit && parsedDate > endLimit) return false;

      const companyMatch = appliedFilters.companyName
        ? item.companyName.toLowerCase().includes(appliedFilters.companyName.toLowerCase())
        : true;
      const franchiseeMatch = appliedFilters.franchisee
        ? (item.franchisee || '').toLowerCase().includes(appliedFilters.franchisee.toLowerCase())
        : true;
      const reasonMatch = appliedFilters.reason
        ? (item.cancellationReason || '').toLowerCase().includes(appliedFilters.reason.toLowerCase()) ||
          (item.cancellationTheme || '').toLowerCase().includes(appliedFilters.reason.toLowerCase())
        : true;

      return companyMatch && franchiseeMatch && reasonMatch;
    });

    const themeCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const franchiseeCounts: Record<string, number> = {};
    const cancelledByCounts: Record<string, number> = {};

    matchingCancellations.forEach((item) => {
      const theme = item.cancellationTheme || 'Uncategorized';
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;

      const category = item.cancellationCategory || 'Uncategorized';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;

      const franchisee = item.franchisee || 'Unknown Franchisee';
      franchiseeCounts[franchisee] = (franchiseeCounts[franchisee] || 0) + 1;

      const cancelledBy = (item as any).serviceCancelledBy || 'Unspecified';
      cancelledByCounts[cancelledBy] = (cancelledByCounts[cancelledBy] || 0) + 1;
    });

    return {
      total: matchingCancellations.length,
      themes: Object.entries(themeCounts).sort((a, b) => b[1] - a[1]),
      categories: Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]),
      franchisees: Object.entries(franchiseeCounts).sort((a, b) => b[1] - a[1]),
      cancelledBy: Object.entries(cancelledByCounts).sort((a, b) => b[1] - a[1]),
      rangeName: title,
    };
  }, [lostCustomers, appliedFilters]);

  const chartData = useMemo(() => {
    const themes = appliedReportingStats.themes.map(([name, value]) => ({ name, value }));
    const categories = appliedReportingStats.categories.map(([name, value]) => ({ name, value }));
    const franchisees = appliedReportingStats.franchisees.map(([name, value]) => ({ name, value }));
    const cancelledBy = appliedReportingStats.cancelledBy.map(([name, value]) => ({ name, value }));
    return { themes, categories, franchisees, cancelledBy };
  }, [appliedReportingStats]);

  const COLORS = ['#095c7b', '#f43f5e', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6', '#ec4899'];

  const applyPresetRange = (preset: string) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (preset) {
      case 'today':
        start = now;
        end = now;
        break;
      case 'yesterday':
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        start = yesterday;
        end = yesterday;
        break;
      case 'this_week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        end = new Date();
        break;
      }
      case 'last_week': {
        const lastWeekStart = new Date();
        lastWeekStart.setDate(now.getDate() - now.getDay() - 6);
        const lastWeekEnd = new Date();
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        start = lastWeekStart;
        end = lastWeekEnd;
        break;
      }
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      }
      case 'last_quarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const year = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        start = new Date(year, lastQuarter * 3, 1);
        end = new Date(year, (lastQuarter + 1) * 3, 0);
        break;
      }
      case 'last_7_days': {
        const last7 = new Date();
        last7.setDate(now.getDate() - 7);
        start = last7;
        end = new Date();
        break;
      }
      case 'last_30_days': {
        const last30 = new Date();
        last30.setDate(now.getDate() - 30);
        start = last30;
        end = new Date();
        break;
      }
      default:
        break;
    }

    const formatDateStr = (d: Date | null) => {
      if (!d) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setDraftFilters((prev) => ({
      ...prev,
      startDate: formatDateStr(start),
      endDate: formatDateStr(end),
    }));
  };

  if (loading || authLoading || loadingPermissions) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#095c7b] flex items-center gap-2">
            <XCircle className="h-8 w-8 text-destructive" />
            Lost Customers
          </h1>
          <p className="text-muted-foreground">
            A comprehensive list of signed customers who have cancelled their services.
          </p>
        </div>
      </div>

      {/* Monthly Cancellation Report */}
      <Card className="border border-sky-100 bg-[#095c7b]/5 overflow-hidden shadow-sm">
        <CardHeader className="bg-[#095c7b] text-white py-4 px-6 flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5" /> {appliedReportingStats.rangeName} Cancellation Summary
            </CardTitle>
            <CardDescription className="text-sky-100 text-xs">
              Overview of cancellations recorded for the applied date range.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-[#095c7b] bg-white hover:bg-white text-sm font-bold px-3 py-1">
            {appliedReportingStats.total} Total
          </Badge>
        </CardHeader>
        <CardContent className="p-6">
          {appliedReportingStats.total === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-4">
              No cancellations recorded for {appliedReportingStats.rangeName} yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Themes Pie Chart */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 border-b pb-2 flex justify-between items-center">
                    <span>Cancellation Themes</span>
                    <Badge variant="outline" className="text-[10px]">{appliedReportingStats.themes.length} Unique</Badge>
                  </h3>
                </div>
                <div className="h-48 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.themes}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.themes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${value} cancellations`, 'Count']} />
                      <RechartsLegend iconSize={8} layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Categories Bar Chart */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 border-b pb-2 flex justify-between items-center">
                    <span>Cancellation Categories</span>
                    <Badge variant="outline" className="text-[10px]">{appliedReportingStats.categories.length} Unique</Badge>
                  </h3>
                </div>
                <div className="h-48 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.categories}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={10} />
                      <YAxis dataKey="name" type="category" width={90} fontSize={10} tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 12)}...` : value} />
                      <RechartsTooltip formatter={(value) => [`${value}`, 'Cancellations']} />
                      <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Franchisees Bar Chart */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 border-b pb-2 flex justify-between items-center">
                    <span>Franchisee Breakdown</span>
                    <Badge variant="outline" className="text-[10px]">{appliedReportingStats.franchisees.length} Active</Badge>
                  </h3>
                </div>
                <div className="h-48 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.franchisees}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={10} />
                      <YAxis dataKey="name" type="category" width={90} fontSize={10} tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 12)}...` : value} />
                      <RechartsTooltip formatter={(value) => [`${value}`, 'Cancellations']} />
                      <Bar dataKey="value" fill="#095c7b" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cancelled By Bar Chart */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 border-b pb-2 flex justify-between items-center">
                    <span>Cancelled By</span>
                    <Badge variant="outline" className="text-[10px]">{appliedReportingStats.cancelledBy.length} Active</Badge>
                  </h3>
                </div>
                <div className="h-48 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.cancelledBy}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={10} />
                      <YAxis dataKey="name" type="category" width={90} fontSize={10} tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 12)}...` : value} />
                      <RechartsTooltip formatter={(value) => [`${value}`, 'Cancellations']} />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-[#095c7b]">
            <Filter className="h-5 w-5" /> Filters
          </CardTitle>
          <CardDescription>Refine the list of lost customers below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by company name..."
                  value={draftFilters.companyName}
                  onChange={(e) => handleFilterChange('companyName', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Franchisee</label>
              <Input
                placeholder="Filter by franchisee..."
                value={draftFilters.franchisee}
                onChange={(e) => handleFilterChange('franchisee', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cancellation Reason / Theme</label>
              <Input
                placeholder="Filter by reason or theme..."
                value={draftFilters.reason}
                onChange={(e) => handleFilterChange('reason', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#095c7b] flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Date Preset
              </label>
              <Select onValueChange={(val) => applyPresetRange(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a preset range..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                  <SelectItem value="last_quarter">Last Quarter</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#095c7b]">Start Date</label>
              <Input
                type="date"
                value={draftFilters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#095c7b]">End Date</label>
              <Input
                type="date"
                value={draftFilters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={handleResetFilters}>
              Reset Filters
            </Button>
            <Button className="bg-[#095c7b] hover:bg-[#074b64]" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('entityId')} className="group -ml-4">
                    ID <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </Button>
                </TableHead>
                <TableHead className="max-w-xs">
                  <Button variant="ghost" onClick={() => requestSort('companyName')} className="group -ml-4">
                    Company Name <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('franchisee')} className="group -ml-4">
                    Franchisee <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('cancellationdate')} className="group -ml-4">
                    Cancellation Date <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </Button>
                </TableHead>
                <TableHead>Theme & Category</TableHead>
                <TableHead>Cancelled By / On</TableHead>
                <TableHead className="max-w-md">Reason</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedList.length > 0 ? (
                paginatedList.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/20">
                    <TableCell className="font-semibold text-xs">{(lead as any).entityId || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs font-medium">
                      <Button
                        variant="link"
                        className="p-0 h-auto text-left whitespace-normal flex items-start gap-2 text-[#095c7b] hover:underline"
                        onClick={() => window.open((lead as any).isCompany ? `/companies/${lead.id}` : `/leads/${lead.id}`, '_blank')}
                      >
                        <Building className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{lead.companyName}</span>
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm">{lead.franchisee || 'N/A'}</TableCell>
                    <TableCell className="text-sm">
                      {lead.cancellationdate ? (() => {
                        const parsedDate = parseDDMMYYYY(lead.cancellationdate);
                        return parsedDate ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 text-red-500" />
                            {parsedDate.toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{lead.cancellationdate}</span>
                        );
                      })() : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {lead.cancellationTheme && (
                          <Badge variant="outline" className="w-fit text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            {lead.cancellationTheme}
                          </Badge>
                        )}
                        {lead.cancellationCategory && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {lead.cancellationCategory}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-foreground">{(lead as any).serviceCancelledBy || 'N/A'}</span>
                        {(lead as any).serviceCancelledOnDate && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date((lead as any).serviceCancelledOnDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md text-xs text-muted-foreground">
                      <div className="flex items-start gap-1.5">
                        <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/75" />
                        <span className="line-clamp-2">{lead.cancellationReason || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      <div className="space-y-1">
                        {lead.customerServiceEmail && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[150px]">{lead.customerServiceEmail}</span>
                          </div>
                        )}
                        {lead.customerPhone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{lead.customerPhone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No lost customers found matching criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-muted px-6 py-4">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-semibold">{filteredAndSortedList.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(filteredAndSortedList.length, currentPage * itemsPerPage)}</span> of{' '}
                <span className="font-semibold">{filteredAndSortedList.length}</span> results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-xs font-medium text-muted-foreground">
                  Page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
