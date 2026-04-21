'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { getVisitNotes, deleteVisitNote, getCompaniesFromFirebase, getLeadsFromFirebase, bulkUpdateFieldSales } from '@/services/firebase';
import type { VisitNote, Address, Lead } from '@/lib/types';
import { format, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';
import { VisitNoteProcessorDialog } from './visit-note-processor-dialog';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LeadStatusBadge } from './lead-status-badge';
import { Trash2, Edit, Filter, SlidersHorizontal, X, Calendar as CalendarIcon, Camera, ChevronDown, ChevronUp, Image as ImageIcon, ArrowUpDown, RefreshCw, Download, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar } from './ui/calendar';
import type { DateRange } from 'react-day-picker';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { cn, isOutsideOfficeHours } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Moon } from 'lucide-react';
import { Check, AlertCircle, Mail as MailIcon } from 'lucide-react';
import { DashbackEmailDialog } from './dashback-email-dialog';

type SortableKeys = 'capturedBy' | 'createdAt' | 'companyName' | 'address' | 'outcome' | 'status';

export default function VisitNotesClient() {
  const [notes, setNotes] = useState<VisitNote[]>([]);
  const [allRecords, setAllRecords] = useState<(Lead & { sourceCollection?: 'leads' | 'companies' })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedNote, setSelectedNote] = useState<VisitNote | null>(null);
  const [isProcessorOpen, setIsProcessorOpen] = useState(false);
  const [isDashbackEmailOpen, setIsDashbackEmailOpen] = useState(false);
  const [dashbackNoteToEmail, setDashbackNoteToEmail] = useState<VisitNote | null>(null);
  
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'createdAt', direction: 'descending' });

  const router = useRouter();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    capturedBy: [] as string[],
    date: undefined as DateRange | undefined,
    outcome: [] as string[],
    status: [] as string[],
    companyName: '',
    fieldSales: 'all' as 'all' | 'yes' | 'no',
    dashbackOnly: false,
  });

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    
    if (notes.length === 0) {
      setLoading(true);
    }
    
    setIsRefreshing(true);
    
    try {
      const canSeeAll = ['admin', 'Lead Gen Admin', 'Field Sales Admin', 'Franchisee'].includes(userProfile.role!);
      const [fetchedNotes, companies, leads] = await Promise.all([
        canSeeAll ? getVisitNotes() : getVisitNotes(userProfile.uid),
        getCompaniesFromFirebase({ skipCoordinateCheck: true }),
        getLeadsFromFirebase({ summary: true })
      ]);
      const taggedCompanies = companies.map(c => c ? { ...c, sourceCollection: 'companies' as const } : null).filter(Boolean) as (Lead & { sourceCollection: 'companies' })[];
      const taggedLeads = leads.map(l => ({ ...l, sourceCollection: 'leads' as const }));
      
      setNotes(fetchedNotes);
      setAllRecords([...taggedCompanies, ...taggedLeads]);
    } catch (error) {
      console.error("Failed to fetch visit notes:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not reload visit notes.' });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [userProfile, toast, notes.length]);

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [userProfile, fetchData]);

  const recordsMap = useMemo(() => new Map(allRecords.map(r => [r.id, r])), [allRecords]);

  const visibleNotes = useMemo(() => {
    if (!userProfile) return [];
    if (userProfile.role !== 'Franchisee') return notes;

    return notes.filter(note => {
        const isCapturedByMe = note.capturedByUid === userProfile.uid;
        
        let isLinkedToMyFranchise = false;
        if (note.leadId) {
            const linkedRecord = recordsMap.get(note.leadId);
            if (linkedRecord && linkedRecord.franchisee === userProfile.franchisee) {
                isLinkedToMyFranchise = true;
            }
        }
        
        return isCapturedByMe || isLinkedToMyFranchise;
    });
  }, [notes, userProfile, recordsMap]);

  const handleProcessNote = (note: VisitNote) => {
    setSelectedNote(note);
    setIsProcessorOpen(true);
  };
  
  const handleNoteProcessed = (noteId: string, status: 'Converted' | 'Rejected', leadId?: string) => {
    setNotes(prev => prev.map(n => n.id === noteId ? {...n, status, leadId} : n));
  };

  const handleExecuteDelete = async (noteId: string) => {
    setIsDeleting(true);
    try {
      await deleteVisitNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast({ title: 'Success', description: 'Visit note deleted.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the note.' });
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectNote = (id: string, isConverted: boolean) => {
    if (!isConverted) return;
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableNotes = filteredNotes.filter(n => n.status === 'Converted' && n.leadId);
      setSelectedNoteIds(new Set(selectableNotes.map(n => n.id)));
    } else {
      setSelectedNoteIds(new Set());
    }
  };

  const handleBulkFieldSalesUpdate = async (value: boolean) => {
    if (selectedNoteIds.size === 0) return;
    
    setIsRefreshing(true);
    try {
      const selectedNotes = notes.filter(n => selectedNoteIds.has(n.id));
      const updates = selectedNotes
        .filter(n => n.status === 'Converted' && n.leadId)
        .map(n => {
          const record = recordsMap.get(n.leadId!);
          const updateData: any = { fieldSales: value };
          
          // If moving out of Field Sales and lead is currently Lost, reset to New and unassign
          if (value === false && record?.status === 'Lost') {
            updateData.customerStatus = 'New';
            updateData.dialerAssigned = '';
          }
          
          return {
            id: n.leadId!,
            type: (record?.sourceCollection || 'leads') as 'leads' | 'companies',
            data: updateData
          };
        });
      
      if (updates.length === 0) {
        toast({ variant: 'destructive', title: 'Invalid Selection', description: 'None of the selected notes are converted or linked to a lead.' });
        return;
      }

      console.log('Bulk updating fieldSales for:', updates);
      await bulkUpdateFieldSales(updates, value);
      toast({ title: 'Success', description: `Updated ${updates.length} records to fieldSales: ${value}.` });
      setSelectedNoteIds(new Set());
      await fetchData();
    } catch (error: any) {
      console.error("Bulk update failed:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      toast({ variant: 'destructive', title: 'Error', description: `Bulk update failed: ${error.message || 'Unknown error'}` });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      capturedBy: [],
      date: undefined,
      outcome: [],
      status: [],
      companyName: '',
      fieldSales: 'all',
      dashbackOnly: false,
    });
  };

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

  const formatAddressString = (address?: Address) => {
    if (!address) return '';
    return `${address.street || ''} ${address.city || ''}`.trim();
  };
  
  const filteredNotes = useMemo(() => {
    let result = visibleNotes.filter(note => {
      const companyNameMatch = filters.companyName
        ? note.companyName?.toLowerCase().includes(filters.companyName.toLowerCase())
        : true;
      
      const capturedByMatch = filters.capturedBy.length === 0
        ? true
        : filters.capturedBy.includes(note.capturedBy);
        
      const outcomeMatch = filters.outcome.length === 0
        ? true
        : note.outcome?.type && filters.outcome.includes(note.outcome.type);

      const statusMatch = filters.status.length === 0
        ? true
        : filters.status.includes(note.status);

      let dateMatch = true;
      if (filters.date?.from) {
        const noteDate = new Date(note.createdAt);
        const fromDate = startOfDay(filters.date.from);
        const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
        dateMatch = noteDate >= fromDate && noteDate <= toDate;
      }

      let fieldSalesMatch = true;
      if (filters.fieldSales !== 'all') {
        const linkedRecord = note.leadId ? recordsMap.get(note.leadId) : null;
        const isFieldSales = linkedRecord?.fieldSales === true;
        fieldSalesMatch = filters.fieldSales === 'yes' ? isFieldSales : !isFieldSales;
      }

      const isDashback = !!note.discoveryData?.lostPropertyProcess;
      const dashbackMatch = !filters.dashbackOnly || isDashback;

      return companyNameMatch && capturedByMatch && outcomeMatch && statusMatch && dateMatch && fieldSalesMatch && dashbackMatch;
    });

    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'address':
            aValue = formatAddressString(a.address);
            bValue = formatAddressString(b.address);
            break;
          case 'outcome':
            aValue = a.outcome?.type || '';
            bValue = b.outcome?.type || '';
            break;
          default:
            aValue = (a as any)[sortConfig.key] || '';
            bValue = (b as any)[sortConfig.key] || '';
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

    return result;
  }, [visibleNotes, filters, sortConfig]);

  const capturedByOptions: Option[] = useMemo(() => {
    const users = new Set(visibleNotes.map(n => n.capturedBy));
    return Array.from(users).map(u => ({ value: u, label: u }));
  }, [visibleNotes]);

  const outcomeOptions: Option[] = useMemo(() => {
    const outcomes = new Set(visibleNotes.map(n => n.outcome?.type).filter(Boolean));
    return (Array.from(outcomes) as string[]).map(o => ({ value: o, label: o }));
  }, [visibleNotes]);

  const statusOptions: Option[] = useMemo(() => {
    const statuses = new Set(visibleNotes.map(n => n.status));
    return Array.from(statuses).map(s => ({ value: s, label: s }));
  }, [visibleNotes]);

  const statusColorMap: Record<VisitNote['status'], string> = {
    'New': 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Converted': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
  };

  const canProcess = userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin' || userProfile?.role === 'Franchisee';
  const isAdmin = userProfile?.role === 'admin';
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
    if (filteredNotes.length === 0) {
        toast({ title: 'No Data', description: 'There is no data to export with the current filters.'});
        return;
    }

    const headers = ['Date', 'Time', 'Captured By', 'Company Name', 'Address', 'Outcome', 'Note Status', 'Lead Status', 'Lead ID', 'Entity ID', 'Field Sales', 'Note Content'];
    const rows = filteredNotes.map(note => {
        const record = note.leadId ? recordsMap.get(note.leadId) : null;
        const noteDate = new Date(note.createdAt);
        return [
            escapeCsvCell(format(noteDate, 'PP')),
            escapeCsvCell(new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: true }).format(noteDate)),
            escapeCsvCell(note.capturedBy),
            escapeCsvCell(note.companyName || 'N/A'),
            escapeCsvCell(formatAddressString(note.address) || 'N/A'),
            escapeCsvCell(note.outcome?.type || 'N/A'),
            escapeCsvCell(note.status),
            escapeCsvCell(record?.status || 'N/A'),
            escapeCsvCell(note.leadId || 'N/A'),
            escapeCsvCell(record?.entityId || 'N/A'),
            escapeCsvCell(record?.fieldSales ? 'Yes' : 'No'),
            escapeCsvCell(note.content),
        ];
    });
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `visit_notes_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: `${filteredNotes.length} notes exported to CSV.` });
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Visit Notes Queue</h1>
          <p className="text-muted-foreground">Review and process notes captured by the Field Sales team.</p>
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
                    {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="ml-2">Toggle Filters</span>
                    </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={filters.companyName} onChange={(e) => handleFilterChange('companyName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Captured By</Label>
                  <MultiSelectCombobox options={capturedByOptions} selected={filters.capturedBy} onSelectedChange={(selected) => handleFilterChange('capturedBy', selected)} placeholder="Select users..." />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <MultiSelectCombobox options={statusOptions} selected={filters.status} onSelectedChange={(selected) => handleFilterChange('status', selected)} placeholder="Select statuses..." />
                </div>
                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <MultiSelectCombobox options={outcomeOptions} selected={filters.outcome} onSelectedChange={(selected) => handleFilterChange('outcome', selected)} placeholder="Select outcomes..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date Captured</Label>
                  <Popover>
                    <PopoverTrigger asChild><Button id="date" variant={"outline"} className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filters.date?.from ? (filters.date.to ? <>{format(filters.date.from, "LLL dd, y")} - {format(filters.date.to, "LLL dd, y")}</> : format(filters.date.from, "LLL dd, y")) : (<span>Pick a date range</span>)}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0 flex" align="start">
                      <Calendar mode="range" selected={filters.date} onSelect={(date) => handleFilterChange('date', date)} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Field Sales Bucket</Label>
                  <Select value={filters.fieldSales} onValueChange={(v) => handleFilterChange('fieldSales', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Buckets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buckets</SelectItem>
                      <SelectItem value="yes">Field Sales Only</SelectItem>
                      <SelectItem value="no">Not Field Sales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pb-2">
                  <Checkbox 
                    id="dashbackOnly" 
                    checked={filters.dashbackOnly} 
                    onCheckedChange={(checked) => handleFilterChange('dashbackOnly', !!checked)} 
                  />
                  <Label htmlFor="dashbackOnly" className="text-sm font-medium leading-none">
                    Dashback Visit Notes Only
                  </Label>
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
            <div>
              <CardTitle>Visit Notes</CardTitle>
              <CardDescription>
                Displaying {filteredNotes.length} of {visibleNotes.length} visible notes. Click column headers to sort.
              </CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm" disabled={filteredNotes.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    {isAdmin && (
                        <TableHead className="w-[40px]">
                          <Checkbox 
                            checked={selectedNoteIds.size > 0 && selectedNoteIds.size === filteredNotes.filter(n => n.status === 'Converted' && n.leadId).length}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                          />
                        </TableHead>
                    )}
                    {userProfile && ['admin', 'Lead Gen Admin', 'Field Sales Admin', 'Franchisee'].includes(userProfile.role!) && (
                        <TableHead>
                          <Button variant="ghost" onClick={() => requestSort('capturedBy')} className="group -ml-4">
                            Captured By{getSortIndicator('capturedBy')}
                          </Button>
                        </TableHead>
                    )}
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('createdAt')} className="group -ml-4">
                        Date{getSortIndicator('createdAt')}
                      </Button>
                    </TableHead>
                    <TableHead>Time (AEST)</TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('companyName')} className="group -ml-4">
                        Company Name{getSortIndicator('companyName')}
                      </Button>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <Button variant="ghost" onClick={() => requestSort('address')} className="group -ml-4">
                        Address{getSortIndicator('address')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('outcome')} className="group -ml-4">
                        Outcome{getSortIndicator('outcome')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('status')} className="group -ml-4">
                        Status{getSortIndicator('status')}
                      </Button>
                    </TableHead>
                    <TableHead>Scheduled Appt</TableHead>
                    <TableHead>Field Sales</TableHead>
                    <TableHead>Lead Status</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Lead ID</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                    <TableRow>
                        <TableCell colSpan={9} className="text-center h-24">
                        <Loader />
                        </TableCell>
                    </TableRow>
                    ) : filteredNotes.length > 0 ? (
                    filteredNotes.map((note) => {
                        const canManage = userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen Admin' || userProfile?.role === 'Field Sales Admin' || note.capturedByUid === userProfile?.uid;
                        const isFieldSales = userProfile?.role === 'Field Sales';
                        const isConverted = note.status === 'Converted';
                        const canEdit = canManage && !(isFieldSales && isConverted);
                        const canDelete = userProfile?.role === 'admin';
                        const isExpanded = expandedNoteIds.has(note.id);
                        const isAwaitingDelete = confirmDeleteId === note.id;
                        
                        const linkedRecord = note.leadId ? recordsMap.get(note.leadId) : null;
                        const isCompanyTarget = linkedRecord?.sourceCollection === 'companies';

                        return (
                        <Fragment key={note.id}>
                        <TableRow className={cn(isExpanded && "bg-muted/30", selectedNoteIds.has(note.id) && "bg-primary/5")}>
                        {isAdmin && (
                            <TableCell>
                                <Checkbox 
                                  checked={selectedNoteIds.has(note.id)}
                                  onCheckedChange={() => handleSelectNote(note.id, note.status === 'Converted')}
                                  disabled={note.status !== 'Converted' || !note.leadId}
                                />
                            </TableCell>
                        )}
                        {userProfile && ['admin', 'Lead Gen Admin', 'Field Sales Admin', 'Franchisee'].includes(userProfile.role!) && (
                            <TableCell>{note.capturedBy}</TableCell>
                        )}
                        <TableCell>{format(new Date(note.createdAt), 'PP')}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {new Intl.DateTimeFormat('en-AU', { 
                                    timeZone: 'Australia/Sydney', 
                                    hour: '2-digit', 
                                    minute: '2-digit', 
                                    hour12: true 
                                }).format(new Date(note.createdAt))}
                                {isOutsideOfficeHours(new Date(note.createdAt)) && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 border-amber-200 bg-amber-50 text-amber-700 flex items-center gap-0.5">
                                        <Moon className="h-2 w-2" />
                                        After Hours
                                    </Badge>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>{note.companyName || 'N/A'}</TableCell>
                        <TableCell className="hidden sm:table-cell">{note.address ? `${note.address.street}, ${note.address.city}` : 'N/A'}</TableCell>
                        <TableCell className="whitespace-normal max-w-[150px]">{note.outcome?.type || 'N/A'}</TableCell>
                        <TableCell>
                            <Badge className={statusColorMap[note.status]}>{note.status}</Badge>
                        </TableCell>
                        <TableCell>
                            {note.outcome?.type === 'Qualified - Set Appointment' && note.scheduledDate ? (
                                <div className="flex flex-col text-xs">
                                    <div className="flex items-center gap-1 font-medium">
                                        <CalendarIcon className="h-3 w-3" />
                                        {isValid(new Date(note.scheduledDate)) ? format(new Date(note.scheduledDate), 'PP') : 'Invalid Date'}
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {note.scheduledTime || 'N/A'}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                            )}
                        </TableCell>
                        <TableCell>
                            {linkedRecord ? (
                                <Badge variant={linkedRecord.fieldSales ? "default" : "secondary"}>
                                    {linkedRecord.fieldSales ? "Yes" : "No"}
                                </Badge>
                            ) : '-'}
                        </TableCell>
                        <TableCell>
                            {linkedRecord ? (
                                <LeadStatusBadge status={linkedRecord.status} />
                            ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{linkedRecord?.entityId || '-'}</TableCell>
                        <TableCell className="text-xs font-mono">{note.leadId || '-'}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                            {note.status === 'Converted' && note.leadId ? (
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={isCompanyTarget ? `/companies/${note.leadId}` : `/leads/${note.leadId}`} target="_blank">View Profile</Link>
                                    </Button>
                                ) : canProcess ? (
                                    <Button
                                    size="sm"
                                    onClick={() => handleProcessNote(note)}
                                    disabled={!!note.discoveryData?.lostPropertyProcess && note.status === 'New'}
                                    >
                                    {note.status === 'New' ? (!!note.discoveryData?.lostPropertyProcess ? 'Dashback Note' : 'Process') : 'View'}
                                    </Button>
                                ) : null}
                            
                            {!!note.discoveryData?.lostPropertyProcess && (note.outcome?.type === 'Qualified - Set Appointment' || note.outcome?.type === 'Qualified - Call Back /Send Info') && (
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                    onClick={() => {
                                        setDashbackNoteToEmail(note);
                                        setIsDashbackEmailOpen(true);
                                    }}
                                >
                                    <MailIcon className="h-4 w-4 mr-1" />
                                    Email Andy
                                </Button>
                            )}
                            {canEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/capture-visit?noteId=${note.id}`)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                            {canManage && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className={cn("h-8 w-8", isExpanded && "bg-accent")} 
                                    disabled={!note.imageUrls || note.imageUrls.length === 0}
                                    onClick={() => toggleExpand(note.id)}
                                >
                                    <ImageIcon className="h-4 w-4" />
                                </Button>
                            )}
                            {canDelete && (
                                isAwaitingDelete ? (
                                    <div className="flex items-center gap-1">
                                        <Button size="sm" variant="destructive" onClick={() => handleExecuteDelete(note.id)} disabled={isDeleting}>
                                            {isDeleting ? <Loader /> : "Confirm"}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                                    </div>
                                ) : (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirmDeleteId(note.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )
                            )}
                            </div>
                        </TableCell>
                        </TableRow>
                        {isExpanded && (
                            <TableRow className="bg-muted/30 border-b-0">
                                <TableCell colSpan={9} className="p-4">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-sm">Attached Images ({note.imageUrls?.length})</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {note.imageUrls?.map((url, i) => (
                                                <div key={i} className="relative aspect-video rounded-md overflow-hidden border bg-background group cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                                    <Image src={url} alt="Visit image" fill className="object-cover transition-transform group-hover:scale-105" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        </Fragment>
                    )})
                    ) : (
                    <TableRow>
                        <TableCell colSpan={9} className="text-center h-24">
                        No visible visit notes found.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && selectedNoteIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardContent className="py-3 px-6 flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-primary">{selectedNoteIds.size} Selected</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Converted Notes Only</span>
              </div>
              
              <div className="h-8 w-px bg-border" />
              
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-white gap-2 h-9"
                  onClick={() => handleBulkFieldSalesUpdate(true)}
                  disabled={isRefreshing}
                >
                  <Check className="h-4 w-4" />
                  Mark Field Sales: True
                </Button>
                
                <Button 
                  size="sm" 
                  variant="destructive"
                  className="gap-2 h-9"
                  onClick={() => handleBulkFieldSalesUpdate(false)}
                  disabled={isRefreshing}
                >
                  <X className="h-4 w-4" />
                  Mark Field Sales: False
                </Button>
                
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setSelectedNoteIds(new Set())}
                  disabled={isRefreshing}
                  className="h-9"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedNote && (
        <VisitNoteProcessorDialog
          isOpen={isProcessorOpen}
          onOpenChange={setIsProcessorOpen}
          note={selectedNote}
          onProcessed={handleNoteProcessed}
        />
      )}

      {dashbackNoteToEmail && (
        <DashbackEmailDialog
          isOpen={isDashbackEmailOpen}
          onOpenChange={setIsDashbackEmailOpen}
          note={dashbackNoteToEmail}
        />
      )}
    </>
  );
}
