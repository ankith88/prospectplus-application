"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

interface LoginRecord {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  dateStr: string;
  timestamp: any; // Firestore Timestamp
  clientTimezone: string;
  userAgent: string;
}

const getSydneyTodayStr = () => {
  const options = { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  const formatter = new Intl.DateTimeFormat('en-CA', options); // YYYY-MM-DD
  return formatter.format(new Date());
};

export default function LoginActivityReport() {
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<string>(getSydneyTodayStr());
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogins = useCallback(async () => {
    setIsLoading(true);
    try {
      const loginsRef = collection(firestore, 'logins');
      const q = query(loginsRef, where('dateStr', '==', selectedDate));
      const querySnapshot = await getDocs(q);
      
      const records: LoginRecord[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        records.push({
          id: docSnap.id,
          userId: data.userId || '',
          userEmail: data.userEmail || '',
          userDisplayName: data.userDisplayName || 'Unknown User',
          dateStr: data.dateStr || '',
          timestamp: data.timestamp,
          clientTimezone: data.clientTimezone || 'unknown',
          userAgent: data.userAgent || 'unknown',
        });
      });

      // Sort client-side by timestamp descending
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

  // Filtering based on search query
  const filteredRecords = useMemo(() => {
    return loginRecords.filter(record => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        record.userDisplayName.toLowerCase().includes(q) ||
        record.userEmail.toLowerCase().includes(q) ||
        record.clientTimezone.toLowerCase().includes(q)
      );
    });
  }, [loginRecords, searchQuery]);

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
      timeZoneName: 'long'
    } as const;
    return new Intl.DateTimeFormat('en-AU', options).format(date);
  };

  const exportToCsv = () => {
    if (filteredRecords.length === 0) {
      toast({ title: 'No Data', description: 'The logins list is empty.' });
      return;
    }
    const headers = ['User Name', 'Email', 'Login Date (Sydney)', 'Exact Login Time (Sydney)', 'Client Timezone', 'User Agent'];
    const rows = filteredRecords.map(rec => [
      rec.userDisplayName,
      rec.userEmail,
      rec.dateStr,
      formatSydneyTime(rec.timestamp),
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

  return (
    <div className="flex flex-col gap-6 p-6 bg-[#d0dfcd]/50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#095c7b] flex items-center gap-2">
            <Clock className="h-8 w-8 text-[#095c7b]" />
            Daily Login Activity Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Track daily user interactions, access times, and client device properties. Restricted to Super Admin.
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

      {/* KPI Stats / Filters Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white border-[#095c7b]/10 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 font-medium uppercase tracking-wider">Date Selection (Sydney Time)</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-[#095c7b] shrink-0" />
            <Input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border-[#095c7b]/20 focus:border-[#095c7b] text-sm"
            />
          </CardContent>
        </Card>

        <Card className="bg-white border-[#095c7b]/10 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Active Users Today</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-3xl font-extrabold text-[#095c7b] flex items-center gap-2">
              <UserCheck className="h-7 w-7 text-[#095c7b]" />
              {loginRecords.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#095c7b]/10 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 font-medium uppercase tracking-wider">Filter Results</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 relative">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Filter by name, email, timezone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 border-[#095c7b]/20 focus:border-[#095c7b]"
              />
              {searchQuery && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Login Log Table */}
      <Card className="border-[#095c7b]/10 bg-white shadow-sm overflow-hidden flex-1">
        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-bold text-[#095c7b] flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Login Session Log
          </CardTitle>
          <CardDescription>
            Showing active logins for Sydney Calendar Day: <span className="font-semibold text-slate-800">{selectedDate}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center items-center"><Loader /></div>
          ) : filteredRecords.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="font-semibold">User Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Exact Login Time (Sydney)</TableHead>
                  <TableHead className="font-semibold">Client Timezone</TableHead>
                  <TableHead className="font-semibold">User Agent / Device info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-slate-50/60 transition-colors border-b">
                    <TableCell className="font-semibold text-slate-800">{record.userDisplayName}</TableCell>
                    <TableCell className="text-slate-600 text-xs">{record.userEmail}</TableCell>
                    <TableCell className="text-slate-700 text-xs font-mono">
                      {formatSydneyTime(record.timestamp)}
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
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-16 text-center text-slate-500 italic">No login records found for this date.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
