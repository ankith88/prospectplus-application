"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  Search, 
  Calendar, 
  Download, 
  RefreshCw, 
  UserCheck, 
  Globe, 
  Monitor, 
  X,
  FileText,
  ChevronDown,
  ChevronRight,
  Shield,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter
} from 'lucide-react';

interface LoginRecord {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  userRole: string;
  dateStr: string;
  timestamp: any; // Firestore Timestamp (session start)
  lastActiveTimestamp?: any; // Firestore Timestamp (last activity in session)
  isFirstLoginOfDay?: boolean;
  clientTimezone: string;
  userAgent: string;
}

export type SortOption = 
  | 'lastActive_desc' 
  | 'lastActive_asc' 
  | 'firstLogin_desc' 
  | 'firstLogin_asc' 
  | 'userName_asc' 
  | 'userName_desc' 
  | 'role_asc'
  | 'role_desc'
  | 'sessions_desc';

const getSydneyTodayStr = () => {
  const options = { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  const formatter = new Intl.DateTimeFormat('en-CA', options); // YYYY-MM-DD
  return formatter.format(new Date());
};

const getRoleBadgeStyle = (role: string) => {
  const r = (role || '').toLowerCase();
  if (r.includes('super admin')) {
    return 'bg-purple-100 text-purple-900 border-purple-200';
  }
  if (r.includes('franchisee')) {
    return 'bg-teal-100 text-teal-900 border-teal-200';
  }
  if (r.includes('admin')) {
    return 'bg-blue-100 text-blue-900 border-blue-200';
  }
  if (r.includes('field sales')) {
    return 'bg-amber-100 text-amber-900 border-amber-200';
  }
  if (r.includes('lead gen') || r.includes('dialer') || r.includes('bdr')) {
    return 'bg-emerald-100 text-emerald-900 border-emerald-200';
  }
  if (r.includes('account manager')) {
    return 'bg-indigo-100 text-indigo-900 border-indigo-200';
  }
  if (r.includes('customer success') || r.includes('customer service')) {
    return 'bg-sky-100 text-sky-900 border-sky-200';
  }
  return 'bg-slate-100 text-slate-800 border-slate-200';
};

export default function LoginActivityReport() {
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<string>(getSydneyTodayStr());
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('lastActive_desc');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const fetchLogins = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load user roles map from Firestore users collection for accurate role fallback
      const usersMap: Record<string, { role: string; email?: string; name?: string }> = {};
      try {
        const usersSnap = await getDocs(collection(firestore, 'users'));
        usersSnap.forEach((uDoc) => {
          const uData = uDoc.data();
          const role = uData.activeRole || uData.defaultRole || uData.role || (uData.assignedRoles && uData.assignedRoles[0]) || 'User';
          usersMap[uDoc.id] = {
            role,
            email: uData.email,
            name: `${uData.firstName || ''} ${uData.lastName || ''}`.trim(),
          };
        });
      } catch (uErr) {
        console.warn("Could not load users for role mapping:", uErr);
      }

      const loginsRef = collection(firestore, 'logins');
      const q = query(loginsRef, where('dateStr', '==', selectedDate));
      const querySnapshot = await getDocs(q);
      
      const records: LoginRecord[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userId = data.userId || '';
        const fallbackUser = usersMap[userId];
        const role = data.userRole || fallbackUser?.role || 'User';

        records.push({
          id: docSnap.id,
          userId: userId,
          userEmail: data.userEmail || fallbackUser?.email || '',
          userDisplayName: data.userDisplayName || fallbackUser?.name || 'Unknown User',
          userRole: role,
          dateStr: data.dateStr || '',
          timestamp: data.timestamp,
          lastActiveTimestamp: data.lastActiveTimestamp || data.timestamp,
          isFirstLoginOfDay: !!data.isFirstLoginOfDay,
          clientTimezone: data.clientTimezone || 'unknown',
          userAgent: data.userAgent || 'unknown',
        });
      });

      // Sort client-side by timestamp descending (newest session first)
      records.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });

      setLoginRecords(records);
    } catch (error: any) {
      console.error("Error fetching login records:", error);
      toast({
        variant: 'destructive',
        title: 'Error loading logins',
        description: error.message || 'Could not fetch login activity logs.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, toast]);

  useEffect(() => {
    fetchLogins();
  }, [fetchLogins]);

  // Extract unique roles present in current records
  const availableRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    loginRecords.forEach(rec => {
      if (rec.userRole) rolesSet.add(rec.userRole);
    });
    return Array.from(rolesSet).sort();
  }, [loginRecords]);

  // Filtering based on search query and selected role
  const filteredRecords = useMemo(() => {
    return loginRecords.filter(record => {
      // Role dropdown filter
      if (selectedRole !== 'ALL' && record.userRole !== selectedRole) {
        return false;
      }
      
      // Text search query filter (name, email, role, timezone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (record.userDisplayName || '').toLowerCase().includes(q);
        const matchEmail = (record.userEmail || '').toLowerCase().includes(q);
        const matchRole = (record.userRole || '').toLowerCase().includes(q);
        const matchTz = (record.clientTimezone || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRole && !matchTz) {
          return false;
        }
      }
      return true;
    });
  }, [loginRecords, searchQuery, selectedRole]);

  // Total Unique Active Users count
  const totalUniqueUsersCount = useMemo(() => {
    const uniqueIds = new Set(loginRecords.map(rec => rec.userId || rec.userEmail || rec.userDisplayName));
    return uniqueIds.size;
  }, [loginRecords]);

  // Filtered Unique Users count
  const filteredUniqueUsersCount = useMemo(() => {
    const uniqueIds = new Set(filteredRecords.map(rec => rec.userId || rec.userEmail || rec.userDisplayName));
    return uniqueIds.size;
  }, [filteredRecords]);

  // Grouped by User and sorted by activity time / user preferences
  const groupedRecords = useMemo(() => {
    const groups: Record<string, LoginRecord[]> = {};
    filteredRecords.forEach(record => {
      const key = record.userId || record.userEmail || record.userDisplayName || 'Unknown User';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    });

    const list = Object.entries(groups).map(([groupKey, records]) => {
      records.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

      const latestRecord = records[0];
      const earliestRecord = records[records.length - 1];
      const explicitFirstLogin = records.find(r => r.isFirstLoginOfDay);
      const firstLoginTimestamp = explicitFirstLogin ? explicitFirstLogin.timestamp : earliestRecord.timestamp;
      const lastActiveTimestamp = latestRecord.lastActiveTimestamp || latestRecord.timestamp;

      return {
        groupKey,
        userName: latestRecord.userDisplayName || 'Unknown User',
        userEmail: latestRecord.userEmail || '',
        userRole: latestRecord.userRole || 'User',
        userId: latestRecord.userId,
        firstLogin: firstLoginTimestamp,
        lastActive: lastActiveTimestamp,
        records
      };
    });

    // Apply sorting based on sortOption
    return list.sort((a, b) => {
      const timeLastA = a.lastActive?.seconds || 0;
      const timeLastB = b.lastActive?.seconds || 0;
      const timeFirstA = a.firstLogin?.seconds || 0;
      const timeFirstB = b.firstLogin?.seconds || 0;

      switch (sortOption) {
        case 'lastActive_desc':
          return timeLastB - timeLastA;
        case 'lastActive_asc':
          return timeLastA - timeLastB;
        case 'firstLogin_desc':
          return timeFirstB - timeFirstA;
        case 'firstLogin_asc':
          return timeFirstA - timeFirstB;
        case 'userName_asc':
          return a.userName.localeCompare(b.userName);
        case 'userName_desc':
          return b.userName.localeCompare(a.userName);
        case 'role_asc':
          return a.userRole.localeCompare(b.userRole);
        case 'role_desc':
          return b.userRole.localeCompare(a.userRole);
        case 'sessions_desc':
          return b.records.length - a.records.length;
        default:
          return timeLastB - timeLastA;
      }
    });
  }, [filteredRecords, sortOption]);

  const toggleGroup = (userName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [userName]: !prev[userName]
    }));
  };

  const expandAll = () => {
    const newExpanded: Record<string, boolean> = {};
    groupedRecords.forEach(g => {
      newExpanded[g.userName] = true;
    });
    setExpandedGroups(newExpanded);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRole('ALL');
    setSortOption('lastActive_desc');
  };

  const formatSydneyTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    const options = {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    } as const;
    return new Intl.DateTimeFormat('en-AU', options).format(date);
  };

  const exportToCsv = () => {
    if (filteredRecords.length === 0) {
      toast({ title: 'No Data', description: 'The logins list is empty.' });
      return;
    }
    const headers = [
      'User Name', 
      'Role', 
      'Email', 
      'Login Date (Sydney)', 
      'Session Start Time (Sydney)', 
      'Last Activity Time (Sydney)', 
      'First Login of Day?', 
      'Client Timezone', 
      'User Agent'
    ];
    const rows = filteredRecords.map(rec => [
      rec.userDisplayName,
      rec.userRole,
      rec.userEmail,
      rec.dateStr,
      formatSydneyTime(rec.timestamp),
      formatSydneyTime(rec.lastActiveTimestamp || rec.timestamp),
      rec.isFirstLoginOfDay ? 'Yes' : 'No',
      rec.clientTimezone,
      rec.userAgent
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `logins_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFilterActive = searchQuery !== '' || selectedRole !== 'ALL' || sortOption !== 'lastActive_desc';

  return (
    <div className="flex flex-col gap-6 p-6 bg-[#d0dfcd]/50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#095c7b] flex items-center gap-2">
            <Clock className="h-8 w-8 text-[#095c7b]" />
            Daily Login Activity Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Track daily user interactions, access times, user roles, and client device properties.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogins} className="bg-white border-[#095c7b]/20">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={exportToCsv} className="bg-[#095c7b] text-white hover:bg-[#053647]">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </header>

      {/* KPI Stats & Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Selection */}
        <Card className="bg-white border-[#095c7b]/10 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[#095c7b]" />
              Date (Sydney Time)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <Input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border-[#095c7b]/20 focus:border-[#095c7b] text-sm"
            />
          </CardContent>
        </Card>

        {/* Active Users KPI */}
        <Card className="bg-white border-[#095c7b]/10 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-[#095c7b]" />
              Active Users Today
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4 flex items-center justify-between">
            <div className="text-2xl font-extrabold text-[#095c7b]">
              {filteredUniqueUsersCount}
              {filteredUniqueUsersCount !== totalUniqueUsersCount && (
                <span className="text-xs font-normal text-slate-500 ml-1.5">
                  of {totalUniqueUsersCount} total
                </span>
              )}
            </div>
            {isFilterActive && (
              <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                Filtered
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Filter Controls: Name/Email/Role Search & Dropdown */}
        <Card className="bg-white border-[#095c7b]/10 shadow-sm flex flex-col justify-between col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-[#095c7b]" />
                Filter by Role & Text
              </span>
              {isFilterActive && (
                <button 
                  onClick={clearFilters}
                  className="text-[11px] text-[#095c7b] hover:underline font-normal capitalize"
                >
                  Clear all
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4 flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input 
                placeholder="Search name, email, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-slate-50 border-[#095c7b]/20 focus:border-[#095c7b] text-xs h-9"
              />
              {searchQuery && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1 h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="bg-slate-50 border-[#095c7b]/20 text-xs h-8">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles ({loginRecords.length})</SelectItem>
                {availableRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Sort Controls: Daily Activity Times & Name */}
        <Card className="bg-white border-[#095c7b]/10 shadow-sm flex flex-col justify-between col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpDown className="h-4 w-4 text-[#095c7b]" />
              Sort Activity Times
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <Select value={sortOption} onValueChange={(val) => setSortOption(val as SortOption)}>
              <SelectTrigger className="bg-slate-50 border-[#095c7b]/20 text-xs h-9">
                <SelectValue placeholder="Sort order..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastActive_desc">Last Active (Newest First)</SelectItem>
                <SelectItem value="lastActive_asc">Last Active (Oldest First)</SelectItem>
                <SelectItem value="firstLogin_desc">First Login (Latest First)</SelectItem>
                <SelectItem value="firstLogin_asc">First Login (Earliest First)</SelectItem>
                <SelectItem value="userName_asc">User Name (A - Z)</SelectItem>
                <SelectItem value="userName_desc">User Name (Z - A)</SelectItem>
                <SelectItem value="role_asc">Role (A - Z)</SelectItem>
                <SelectItem value="sessions_desc">Total Sessions (Most Active)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Login Log Table */}
      <Card className="border-[#095c7b]/10 bg-white shadow-sm overflow-hidden flex-1">
        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-[#095c7b] flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Login Session Log
            </CardTitle>
            <CardDescription>
              Showing active logins grouped by user for Sydney Calendar Day: <span className="font-semibold text-slate-800">{selectedDate}</span>.
            </CardDescription>
          </div>
          {groupedRecords.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll} className="h-8 text-xs border-[#095c7b]/20 text-[#095c7b] hover:bg-[#095c7b]/5">
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 text-xs border-[#095c7b]/20 text-[#095c7b] hover:bg-[#095c7b]/5">
                Collapse All
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center items-center"><Loader /></div>
          ) : groupedRecords.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead 
                    className="font-semibold cursor-pointer select-none hover:text-[#095c7b]"
                    onClick={() => setSortOption(prev => prev === 'userName_asc' ? 'userName_desc' : 'userName_asc')}
                  >
                    <div className="flex items-center gap-1">
                      <span>User Name</span>
                      {sortOption === 'userName_asc' && <ArrowUp className="h-3.5 w-3.5 text-[#095c7b]" />}
                      {sortOption === 'userName_desc' && <ArrowDown className="h-3.5 w-3.5 text-[#095c7b]" />}
                      {sortOption !== 'userName_asc' && sortOption !== 'userName_desc' && <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer select-none hover:text-[#095c7b]"
                    onClick={() => setSortOption(prev => prev === 'role_asc' ? 'role_desc' : 'role_asc')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Role</span>
                      {sortOption === 'role_asc' && <ArrowUp className="h-3.5 w-3.5 text-[#095c7b]" />}
                      {sortOption === 'role_desc' && <ArrowDown className="h-3.5 w-3.5 text-[#095c7b]" />}
                      {sortOption !== 'role_asc' && sortOption !== 'role_desc' && <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer select-none hover:text-[#095c7b]"
                    onClick={() => setSortOption(prev => prev === 'lastActive_desc' ? 'firstLogin_desc' : prev === 'firstLogin_desc' ? 'lastActive_asc' : 'lastActive_desc')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Daily Activity Times (Sydney)</span>
                      {sortOption === 'lastActive_desc' && <ArrowDown className="h-3.5 w-3.5 text-[#095c7b]" />}
                      {sortOption === 'lastActive_asc' && <ArrowUp className="h-3.5 w-3.5 text-[#095c7b]" />}
                      {sortOption === 'firstLogin_desc' && <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />}
                      {sortOption === 'firstLogin_asc' && <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />}
                      {!['lastActive_desc', 'lastActive_asc', 'firstLogin_desc', 'firstLogin_asc'].includes(sortOption) && <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Client Timezone</TableHead>
                  <TableHead className="font-semibold">User Agent / Device info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedRecords.map((group) => {
                  const isExpanded = !!expandedGroups[group.userName];
                  return (
                    <React.Fragment key={group.groupKey}>
                      <TableRow 
                        className="bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer transition-colors border-b font-medium"
                        onClick={() => toggleGroup(group.userName)}
                      >
                        <TableCell className="font-bold text-[#095c7b] py-3">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-[#095c7b] shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-[#095c7b] shrink-0" />
                            )}
                            <span>{group.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={`font-semibold px-2 py-0.5 text-[11px] ${getRoleBadgeStyle(group.userRole)}`}>
                            <Shield className="h-3 w-3 mr-1 inline-block shrink-0" />
                            {group.userRole}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-700 text-xs py-3">{group.userEmail || '-'}</TableCell>
                        <TableCell className="text-slate-600 text-xs py-3" colSpan={3}>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded text-[11px]">
                              First login: {formatSydneyTime(group.firstLogin)}
                            </span>
                            <span className="font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                              Last active: {formatSydneyTime(group.lastActive)}
                            </span>
                            <Badge className="bg-[#095c7b]/10 text-[#095c7b] hover:bg-[#095c7b]/20 border-none px-2 py-0.5 text-[10px] font-bold">
                              {group.records.length} session{group.records.length > 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && group.records.map((record) => {
                        const startTimeStr = formatSydneyTime(record.timestamp);
                        const lastActiveStr = record.lastActiveTimestamp && record.lastActiveTimestamp.seconds !== record.timestamp?.seconds
                          ? formatSydneyTime(record.lastActiveTimestamp)
                          : null;

                        return (
                          <TableRow key={record.id} className="bg-slate-50/20 hover:bg-slate-100/30 transition-colors border-b">
                            <TableCell className="pl-8 text-slate-500 text-xs font-medium" colSpan={2}>
                              <div className="flex items-center gap-1.5">
                                <span>Session Detail</span>
                                {record.isFirstLoginOfDay && (
                                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-1.5 py-0 font-bold">
                                    First Daily Login
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-400 text-xs">
                              {record.userEmail}
                            </TableCell>
                            <TableCell className="text-slate-700 text-xs font-mono">
                              <div>
                                <span className="font-semibold text-slate-800">{startTimeStr}</span>
                                {lastActiveStr && (
                                  <span className="text-[11px] text-slate-500 block font-sans mt-0.5">
                                    Last activity: {lastActiveStr}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600 text-xs">
                              <div className="flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-slate-400" />
                                {record.clientTimezone}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs max-w-md truncate" title={record.userAgent}>
                              <div className="flex items-center gap-1.5">
                                <Monitor className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {record.userAgent}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-16 text-center text-slate-500 italic">No login records match the selected date or filters.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
