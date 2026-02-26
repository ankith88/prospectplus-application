
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, VisitNote, UserProfile, Address } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Filter, SlidersHorizontal, X, RefreshCw, Calendar as CalendarIcon, User, Briefcase, MapPin, ArrowUpDown, Download } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { getAllLeadsForReport, getCompaniesFromFirebase, getAllUsers, getVisitNotes } from '@/services/firebase';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { LeadStatusBadge } from './lead-status-badge';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

type SortableKeys = 'dateLeadEntered' | 'leadId' | 'entityId' | 'companyName' | 'status' | 'franchisee' | 'dialerAssigned' | 'outcome' | 'address';
type LeadWithVisitNote = Lead & { visitNote: VisitNote };

export default function CheckinsClientPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allVisitNotes, setAllVisitNotes] = useState<VisitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    date: undefined as DateRange | undefined,
    user: [] as string[],
    franchisee: [] as string[],
    status: [] as string[],
  });
  
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'dateLeadEntered', direction: 'descending' });

  // Initialize filters from URL search params
  useEffect(() => {
    const userParam = searchParams.get('user');
    const franchiseeParam = searchParams.get('franchisee');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const statusParam = searchParams.get('status');

    const newFilters = { ...filters };
    if (userParam) newFilters.user = userParam.split(',');
    if (franchiseeParam) newFilters.franchisee = franchiseeParam.split(',');
    
    if (statusParam) {
        // If statusParam is "Converted", we don't want to filter by the Lead status
        // but it acts as a signal that we're looking at all visits that became records.
        if (statusParam !== 'Converted') {
            newFilters.status = statusParam.split(',');
        }
    }

    if (dateFrom) {
        newFilters.date = {
            from: parseISO(dateFrom),
            to: dateTo ? parseISO(dateTo) : undefined
        };
    }
    setFilters(newFilters);
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    toast({ title: 'Loading Data...', description: 'Fetching lead and visit note records.' });
    try {
        const [refreshedLeads, companies, visitNotes] = await Promise.all([
            getAllLeadsForReport(),
            getCompaniesFromFirebase(),
            getVisitNotes(),
        ]);
        const allItems = [...refreshedLeads, ...companies];
        setAllLeads(allItems);
        setAllVisitNotes(visitNotes);
    } catch (error) {
        console.error("Failed to refresh data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the latest data.' });
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      date: undefined,
      user: [],
      franchisee: [],
      status: [],
    });
  };
  
  const leadsWithVisitNotes = useMemo(() => {
    const visitNotesMap = new Map(allVisitNotes.map(note => [note.id, note]));
    
    return allLeads
      .filter(lead => lead.visitNoteID && visitNotesMap.has(lead.visitNoteID))
      .map(lead => ({
        ...lead,
        visitNote: visitNotesMap.get(lead.visitNoteID!),
      }));
  }, [allLeads, allVisitNotes]);

  const filteredLeads = useMemo(() => {
    let leads = leadsWithVisitNotes;

    if (userProfile?.role === 'Field Sales') {
        leads = leads.filter(l => l.visitNote?.capturedBy === userProfile.displayName);
    } else if (filters.user.length > 0) {
        leads = leads.filter(l => l.visitNote && filters.user.includes(l.visitNote.capturedBy));
    }
    
    if (filters.franchisee.length > 0) {
        leads = leads.filter(l => l.franchisee && filters.franchisee.includes(l.franchisee));
    }
    
    if (filters.status.length > 0) {
        leads = leads.filter(l => filters.status.includes(l.status));
    }

    if (filters.date?.from) {
        const fromDate = startOfDay(filters.date.from);
        const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
        leads = leads.filter(l => {
            if (!l.visitNote?.createdAt) return false;
            const noteDate = new Date(l.visitNote.createdAt);
            return noteDate >= fromDate && noteDate <= toDate;
        });
    }

    return leads;

  }, [leadsWithVisitNotes, filters, userProfile]);

  const sortedLeads = useMemo(() => {
    let sortableItems: LeadWithVisitNote[] = [...filteredLeads];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
            case 'dateLeadEntered':
                aValue = a.visitNote?.createdAt ? new Date(a.visitNote.createdAt).getTime() : 0;
                bValue = b.visitNote?.createdAt ? new Date(b.visitNote.createdAt).getTime() : 0;
                break;
            case 'dialerAssigned':
                aValue = a.visitNote?.capturedBy || '';
                bValue = b.visitNote?.capturedBy || '';
                break;
            case 'leadId':
                aValue = a.id;
                bValue = b.id;
                break;
            case 'entityId':
                aValue = a.entityId || '';
                bValue = b.entityId || '';
                break;
            case 'outcome':
                aValue = a.visitNote?.outcome?.type || '';
                bValue = b.visitNote?.outcome?.type || '';
                break;
            case 'address':
                aValue = a.address ? `${a.address.street} ${a.address.city}` : '';
                bValue = b.address ? `${b.address.street} ${b.address.city}` : '';
                break;
            default:
                aValue = (a as any)[sortConfig.key] ?? '';
                bValue = (b as any)[sortConfig.key] ?? '';
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
  }, [filteredLeads, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortableKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  const userOptions: Option[] = useMemo(() => {
    const users = new Set(allVisitNotes.map(n => n.capturedBy));
    return Array.from(users).map(u => ({ value: u, label: u }));
  }, [allVisitNotes]);

  const franchiseeOptions: Option[] = useMemo(() => {
    const franchisees = new Set(allLeads.map(l => l.franchisee).filter(Boolean));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f }));
  }, [allLeads]);

  const statusOptions: Option[] = useMemo(() => {
    const statuses = new Set(allLeads.map(l => l.status));
    return Array.from(statuses).map(s => ({ value: s, label: s}));
  }, [allLeads]);

  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) ? val.length > 0 : !!val));

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
    if (sortedLeads.length === 0) {
        toast({ title: 'No Data', description: 'There is no data to export with the current filters.'});
        return;
    }

    const headers = ['Date Created', 'Lead ID', 'Company ID', 'Company', 'Address', 'Status', 'Franchisee', 'Field Sales Rep', 'Visit Outcome'];
    const rows = sortedLeads.map(lead => [
        escapeCsvCell(lead.visitNote?.createdAt ? format(new Date(lead.visitNote.createdAt), 'PPpp') : 'N/A'),
        escapeCsvCell(lead.id),
        escapeCsvCell(lead.entityId || 'N/A'),
        escapeCsvCell(lead.companyName),
        escapeCsvCell(lead.address ? `${lead.address.street}, ${lead.address.city}, ${lead.address.state} ${lead.address.zip}` : 'N/A'),
        escapeCsvCell(lead.status),
        escapeCsvCell(lead.franchisee || 'N/A'),
        escapeCsvCell(lead.visitNote?.capturedBy || 'N/A'),
        escapeCsvCell(lead.visitNote?.outcome?.type || 'N/A'),
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `field_sourced_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  if (authLoading || loading) {
    return <div className="flex h-full items-center justify-center"><Loader /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Field-Sourced Leads</h1>
        <p className="text-muted-foreground">A log of all leads generated from visit notes.</p>
      </header>
        <Collapsible>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                     <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        <span>Filters</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button onClick={fetchData} variant="outline" size="sm" disabled={isRefreshing || loading}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                            {isRefreshing || loading ? 'Refreshing...' : 'Refresh Data'}
                        </Button>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <SlidersHorizontal className="h-4 w-4" />
                                <span className="ml-2">Toggle Controls</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </CardHeader>
                 <CollapsibleContent>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        {userProfile?.role !== 'Field Sales' && (
                            <div className="space-y-2">
                                <Label htmlFor="user">Field Sales User</Label>
                                <MultiSelectCombobox options={userOptions} selected={filters.user} onSelectedChange={(selected) => handleFilterChange('user', selected)} placeholder="Select users..." />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="franchisee">Franchisee</Label>
                            <MultiSelectCombobox options={franchiseeOptions} selected={filters.franchisee} onSelectedChange={(selected) => handleFilterChange('franchisee', selected)} placeholder="Select franchisees..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <MultiSelectCombobox options={statusOptions} selected={filters.status} onSelectedChange={(selected) => handleFilterChange('status', selected)} placeholder="Select statuses..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Date Created</Label>
                            <Popover>
                                <PopoverTrigger asChild><Button id="date" variant={"outline"} className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filters.date?.from ? (filters.date.to ? <>{format(filters.date.from, "LLL dd, y")} - {format(filters.date.to, "LLL dd, y")}</> : format(filters.date.from, "LLL dd, y")) : <span>Pick a date range</span>}</Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0 flex" align="start">
                                    <Calendar mode="range" selected={filters.date} onSelect={(date) => handleFilterChange('date', date)} />
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
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Field-Sourced Leads</CardTitle>
                <CardDescription>Found {sortedLeads.length} lead(s) matching your criteria.</CardDescription>
              </div>
              <Button onClick={handleExport} variant="outline" size="sm" disabled={sortedLeads.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Button variant="ghost" onClick={() => requestSort('dateLeadEntered')} className="group -ml-4">Date Created{getSortIndicator('dateLeadEntered')}</Button></TableHead>
                            <TableHead><Button variant="ghost" onClick={() => requestSort('leadId')} className="group -ml-4">Lead ID{getSortIndicator('leadId')}</Button></TableHead>
                            <TableHead><Button variant="ghost" onClick={() => requestSort('entityId')} className="group -ml-4">Company ID{getSortIndicator('entityId')}</Button></TableHead>
                            <TableHead><Button variant="ghost" onClick={() => requestSort('companyName')} className="group -ml-4">Company{getSortIndicator('companyName')}</Button></TableHead>
                            <TableHead><Button variant="ghost" onClick={() => requestSort('address')} className="group -ml-4">Address{getSortIndicator('address')}</Button></TableHead>
                            <TableHead><Button variant="ghost" onClick={() => requestSort('status')} className="group -ml-4">Status{getSortIndicator('status')}</Button></TableHead>
                            <TableHead><Button variant="ghost" onClick={() => requestSort('franchisee')} className="group -ml-4">Franchisee{getSortIndicator('franchisee')}</Button></TableHead>
                            <TableHead><Button variant="ghost" onClick={() => requestSort('dialerAssigned')} className="group -ml-4">Field Sales Rep{getSortIndicator('dialerAssigned')}</Button></TableHead>
                            <TableHead><Button variant="ghost" onClick={() => requestSort('outcome')} className="group -ml-4">Visit Outcome{getSortIndicator('outcome')}</Button></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedLeads.length > 0 ? (
                            sortedLeads.map(lead => {
                                const visitDate = lead.visitNote?.createdAt ? parseISO(lead.visitNote.createdAt) : null;
                                return (
                                <TableRow key={lead.id}>
                                    <TableCell>{visitDate && isValid(visitDate) ? format(visitDate, 'PPpp') : 'N/A'}</TableCell>
                                    <TableCell>{lead.id}</TableCell>
                                    <TableCell>{lead.entityId || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Button variant="link" asChild className="p-0 h-auto">
                                            <Link href={lead.status === 'Won' ? `/companies/${lead.id}` : `/leads/${lead.id}`} target="_blank">{lead.companyName}</Link>
                                        </Button>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <MapPin className="h-3 w-3"/>
                                            {lead.address ? `${lead.address.street}, ${lead.address.city}` : 'N/A'}
                                        </p>
                                    </TableCell>
                                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                                    <TableCell><Badge variant="outline">{lead.franchisee || 'N/A'}</Badge></TableCell>
                                    <TableCell>{lead.visitNote?.capturedBy || 'N/A'}</TableCell>
                                    <TableCell>{lead.visitNote?.outcome?.type || 'N/A'}</TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">
                                    No leads found for the selected filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
