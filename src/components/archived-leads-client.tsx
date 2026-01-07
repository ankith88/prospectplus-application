

"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getArchivedLeads, getLastNote, deleteLead, getAllUsers } from '@/services/firebase'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import type { Lead, LeadStatus, Note, Activity, Contact, UserProfile } from '@/lib/types'
import { useEffect, useState, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { MapModal } from '@/components/map-modal'
import { MapPin, ArrowUpDown, SlidersHorizontal, X, Filter, Calendar as CalendarIcon, User, Star, Download, History, RefreshCw, Route, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Badge } from '@/components/ui/badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { useToast } from '@/hooks/use-toast'
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { Checkbox } from './ui/checkbox'


type LeadWithDetails = Lead & { notes?: Note[], activity?: Activity[] };

type SortableLeadKeys = 'companyName' | 'status' | 'franchisee' | 'dialerAssigned' | 'industryCategory' | 'discoveryScore' | 'lastActivityDate';

type ExpandedLeadDetails = {
    note: Note | null;
    activity: Activity | null;
    loadingNote: boolean;
};

const LEADS_PER_PAGE = 100;
const archivedStatuses: LeadStatus[] = ['Qualified', 'Pre Qualified', 'Won', 'Lost', 'LPO Review', 'Unqualified', 'Trialing ShipMate', 'Free Trial', 'LocalMile Pending'];

export default function ArchivedLeadsClientPage() {
  const [allLeads, setAllLeads] = useState<LeadWithDetails[]>([]);
  const [allDialers, setAllDialers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortableLeadKeys; direction: 'ascending' | 'descending' } | null>({ key: 'lastActivityDate', direction: 'descending' });
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, ExpandedLeadDetails>>({});
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);


  const [filters, setFilters] = useState({
    companyName: '',
    status: [] as string[],
    franchisee: [] as string[],
    dialerAssigned: [] as string[],
    date: undefined as DateRange | undefined,
    campaign: '',
  });

  const uniqueFranchisees: Option[] = useMemo(() => {
    if (loading) return [];
    const franchisees = new Set(allLeads.map(lead => lead.franchisee).filter(Boolean));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allLeads, loading]);

  const dialerOptions: Option[] = useMemo(() => {
    const dialers = allDialers.map(d => ({ value: d.displayName!, label: d.displayName! }));
    return [
        { value: 'unassigned', label: 'Unassigned' },
        ...dialers.sort((a,b) => a.label.localeCompare(b.label))
    ];
  }, [allDialers]);

  const statusOptions: Option[] = useMemo(() => {
    return archivedStatuses.map(s => ({ value: s, label: s === 'Won' ? 'Signed' : s })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);


  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    
    if (user) {
        fetchData();
    }

  }, [user, authLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [archivedLeads, users] = await Promise.all([
          getArchivedLeads(),
          getAllUsers()
        ]);
        setAllLeads(archivedLeads);
        const dialers = users
            .filter(u => u.firstName && u.lastName)
            .map(u => ({ ...u, displayName: `${u.firstName} ${u.lastName}`.trim() }));
        setAllDialers(dialers);

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch archived leads.' });
    } finally {
        setLoading(false);
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData().finally(() => setIsRefreshing(false));
  };


  const handleFilterChange = (filterName: keyof typeof filters, value: string | string[] | DateRange | undefined) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1); 
  };

  const clearFilters = () => {
    setFilters({
      companyName: '',
      status: [],
      franchisee: [],
      dialerAssigned: [],
      date: undefined,
      campaign: '',
    });
    setCurrentPage(1);
  };

  const archivedLeads = useMemo(() => {
     return allLeads.filter(lead => {
        const companyMatch = filters.companyName ? lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
        const statusMatch = filters.status.length > 0 ? filters.status.includes(lead.status) : true;
        const franchiseeMatch = filters.franchisee.length > 0 ? (lead.franchisee && filters.franchisee.includes(lead.franchisee)) : true;
        
        let dialerMatch = true;
        if (filters.dialerAssigned.length > 0) {
            if (filters.dialerAssigned.includes('unassigned')) {
                dialerMatch = !lead.dialerAssigned || filters.dialerAssigned.includes(lead.dialerAssigned);
            } else {
                dialerMatch = lead.dialerAssigned && filters.dialerAssigned.includes(lead.dialerAssigned);
            }
        }
        
        let dateMatch = true;
        if (filters.date?.from && lead.activity?.[0]) {
            const lastActivityDate = new Date(lead.activity[0].date);
            const fromDate = startOfDay(filters.date.from);
            const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
            dateMatch = lastActivityDate >= fromDate && lastActivityDate <= toDate;
        }

        const campaignMatch = filters.campaign ? lead.campaign?.toLowerCase().includes(filters.campaign.toLowerCase()) : true;

        return companyMatch && statusMatch && franchiseeMatch && dialerMatch && dateMatch && campaignMatch;
    });
  }, [allLeads, filters]);

  const sortedLeads = useMemo(() => {
    let sortableItems = [...archivedLeads];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: string | number | undefined;
        let bValue: string | number | undefined;

        if (sortConfig.key === 'discoveryScore') {
          aValue = a.discoveryData?.score ?? -1;
          bValue = b.discoveryData?.score ?? -1;
        } else if (sortConfig.key === 'lastActivityDate') {
          aValue = a.activity?.[0]?.date ? new Date(a.activity[0].date).getTime() : 0;
          bValue = b.activity?.[0]?.date ? new Date(b.activity[0].date).getTime() : 0;
        } else {
          aValue = a[sortConfig.key] ?? '';
          bValue = b[sortConfig.key] ?? '';
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
  }, [archivedLeads, sortConfig]);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * LEADS_PER_PAGE;
    return sortedLeads.slice(startIndex, startIndex + LEADS_PER_PAGE);
  }, [sortedLeads, currentPage]);

  const totalPages = Math.ceil(sortedLeads.length / LEADS_PER_PAGE);

  const requestSort = (key: SortableLeadKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortableLeadKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

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
      const headers = [
          'Lead ID', 'Company Name', 'Status', 'Status Reason', 'Franchisee', 'Dialer Assigned', 'Sales Rep Assigned', 'Website', 'Industry', 'Sub-Industry', 'Email', 'Street', 'City', 'State', 'Postcode', 'Country', 'AI Score', 'AI Reason',
          'Discovery Score', 'Discovery Routing Tag', 'Post Office Relationship', 'Logistics Setup', 'Shipping Volume', 'Express vs Standard', 'Package Types', 'Current Providers', 'E-commerce Tech', 'Same Day Courier', 'Decision Maker', 'Pain Points',
          'Contact Name', 'Contact Title', 'Contact Email', 'Contact Phone'
      ];

      const rows: string[][] = [];

      sortedLeads.forEach(lead => {
          const baseRow = [
              escapeCsvCell(lead.id),
              escapeCsvCell(lead.companyName),
              escapeCsvCell(lead.status),
              escapeCsvCell(lead.statusReason),
              escapeCsvCell(lead.franchisee),
              escapeCsvCell(lead.dialerAssigned),
              escapeCsvCell(lead.salesRepAssigned),
              escapeCsvCell(lead.websiteUrl),
              escapeCsvCell(lead.industryCategory),
              escapeCsvCell(lead.industrySubCategory),
              escapeCsvCell(lead.customerServiceEmail),
              escapeCsvCell(lead.address?.street),
              escapeCsvCell(lead.address?.city),
              escapeCsvCell(lead.address?.state),
              escapeCsvCell(lead.address?.zip),
              escapeCsvCell(lead.address?.country),
              escapeCsvCell(lead.aiScore),
              escapeCsvCell(lead.aiReason),
              escapeCsvCell(lead.discoveryData?.score),
              escapeCsvCell(lead.discoveryData?.routingTag),
              escapeCsvCell(lead.discoveryData?.postOfficeRelationship),
              escapeCsvCell(lead.discoveryData?.logisticsSetup),
              escapeCsvCell(lead.discoveryData?.shippingVolume),
              escapeCsvCell(lead.discoveryData?.expressVsStandard),
              escapeCsvCell(lead.discoveryData?.packageType?.join('; ')),
              escapeCsvCell(lead.discoveryData?.currentProvider?.join('; ')),
              escapeCsvCell(lead.discoveryData?.eCommerceTech?.join('; ')),
              escapeCsvCell(lead.discoveryData?.sameDayCourier),
              escapeCsvCell(lead.discoveryData?.decisionMaker),
              escapeCsvCell(lead.discoveryData?.painPoints),
          ];
          
          const maxContacts = lead.contacts?.length || 0;

          if (maxContacts === 0) {
                rows.push(baseRow);
                return;
          }

          for (let i = 0; i < maxContacts; i++) {
              const contact = lead.contacts?.[i];

              const rowData = [
                  ...baseRow,
                  escapeCsvCell(contact?.name),
                  escapeCsvCell(contact?.title),
                  escapeCsvCell(contact?.email),
                  escapeCsvCell(contact?.phone),
              ];
              
              if (i === 0) {
                  rows.push(rowData);
              } else {
                  const emptyBase = Array(baseRow.length).fill('');
                  rows.push([...emptyBase, ...rowData.slice(baseRow.length)]);
              }
          }
      });

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.href) {
          URL.revokeObjectURL(link.href);
      }
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', `processed_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const toggleLeadDetails = async (leadId: string, lastActivity: Activity | null) => {
        if (expandedDetails[leadId]) {
            setExpandedDetails(prev => {
                const newState = { ...prev };
                delete newState[leadId];
                return newState;
            });
            return;
        }

        setExpandedDetails(prev => ({
            ...prev,
            [leadId]: { note: null, activity: lastActivity, loadingNote: true },
        }));

        try {
            const note = await getLastNote(leadId);
            setExpandedDetails(prev => ({
                ...prev,
                [leadId]: { ...prev[leadId], note, loadingNote: false },
            }));
        } catch (error) {
            console.error("Failed to fetch lead note:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load lead note." });
            setExpandedDetails(prev => ({
                ...prev,
                [leadId]: { ...prev[leadId], loadingNote: false },
            }));
        }
    };

    const handleDeleteLeads = async (leadIds: string[]) => {
        if (leadIds.length === 0) return;
        try {
            await deleteLead(leadIds);
            setAllLeads(prev => prev.filter(l => !leadIds.includes(l.id)));
            setSelectedLeads(prev => prev.filter(id => !leadIds.includes(id)));
            toast({ title: 'Success', description: `${leadIds.length} lead(s) have been permanently deleted.` });
        } catch (error) {
            console.error("Failed to delete leads:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the selected leads.' });
        }
    };
    
    const handleSelectLead = (leadId: string) => {
        setSelectedLeads(prev => 
            prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
        );
    };

    const handleSelectAllOnPage = (isChecked: boolean | 'indeterminate') => {
        if (isChecked) {
            setSelectedLeads(prev => [...new Set([...prev, ...paginatedLeads.map(l => l.id)])]);
        } else {
            const paginatedIds = new Set(paginatedLeads.map(l => l.id));
            setSelectedLeads(prev => prev.filter(id => !paginatedIds.has(id)));
        }
    };
    
    const isAllOnPageSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeads.includes(l.id));

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }
  
  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) ? val.length > 0 : val && val !== 'all'));

  return (
    <>
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Archived Leads</h1>
        <p className="text-muted-foreground">View your qualified, won, and lost leads.</p>
      </header>
       <Collapsible>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        <span>Filters</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
                          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input id="companyName" value={filters.companyName} onChange={(e) => handleFilterChange('companyName', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="dialerAssigned">Dialer Assigned</Label>
                            <MultiSelectCombobox
                                options={dialerOptions}
                                selected={filters.dialerAssigned}
                                onSelectedChange={(selected) => handleFilterChange('dialerAssigned', selected)}
                                placeholder="Select dialers..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                             <MultiSelectCombobox
                                options={statusOptions}
                                selected={filters.status}
                                onSelectedChange={(selected) => handleFilterChange('status', selected)}
                                placeholder="Select statuses..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="franchisee">Franchisee</Label>
                             <MultiSelectCombobox
                                options={uniqueFranchisees}
                                selected={filters.franchisee}
                                onSelectedChange={(selected) => handleFilterChange('franchisee', selected)}
                                placeholder="Select franchisees..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="campaign">Campaign</Label>
                            <Input id="campaign" value={filters.campaign} onChange={(e) => handleFilterChange('campaign', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="date">Date Archived</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className="w-full justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filters.date?.from ? (
                                    filters.date.to ? (
                                        <>
                                        {format(filters.date.from, "LLL dd, y")} -{" "}
                                        {format(filters.date.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(filters.date.from, "LLL dd, y")
                                    )
                                    ) : (
                                    <span>Pick a date</span>
                                    )}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 flex" align="start">
                                    <div className="flex flex-col space-y-2 border-r p-2">
                                        <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: new Date(), to: new Date()})}>Today</Button>
                                        <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: subDays(new Date(), 1), to: subDays(new Date(), 1)})}>Yesterday</Button>
                                        <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfWeek(new Date()), to: endOfWeek(new Date())})}>This Week</Button>
                                        <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfWeek(subDays(new Date(), 7)), to: endOfWeek(subDays(new Date(), 7))})}>Last Week</Button>
                                        <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>This Month</Button>
                                        <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1))})}>Last Month</Button>
                                    </div>
                                    <Calendar
                                        mode="range"
                                        selected={filters.date}
                                        onSelect={(date) => handleFilterChange('date', date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </CardContent>
                    {hasActiveFilters && (
                        <CardContent>
                            <Button variant="ghost" onClick={clearFilters}>
                                <X className="mr-2 h-4 w-4" /> Clear Filters
                            </Button>
                        </CardContent>
                    )}
                </CollapsibleContent>
            </Card>
        </Collapsible>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>Processed Leads</span>
            <Badge variant="secondary">{sortedLeads.length} lead(s)</Badge>
          </CardTitle>
           <div className="flex items-center gap-2">
                {userProfile?.role === 'admin' && selectedLeads.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete ({selectedLeads.length})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete {selectedLeads.length} lead(s) and all associated data. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteLeads(selectedLeads)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                {userProfile?.role === 'admin' && (
                    <Button onClick={handleExport} variant="outline" size="sm" disabled={sortedLeads.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Export All
                    </Button>
                )}
           </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={isAllOnPageSelected}
                        onCheckedChange={handleSelectAllOnPage}
                      />
                  </TableHead>
                  <TableHead className="w-[200px]">
                    <Button variant="ghost" onClick={() => requestSort('companyName')} className="group -ml-4">
                      Company
                      {getSortIndicator('companyName')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('status')} className="group -ml-4">
                      Status
                      {getSortIndicator('status')}
                    </Button>
                  </TableHead>
                   <TableHead>
                     <Button variant="ghost" onClick={() => requestSort('discoveryScore')} className="group -ml-4">
                       Discovery Score
                       {getSortIndicator('discoveryScore')}
                     </Button>
                   </TableHead>
                   <TableHead>Routing Tag</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('lastActivityDate')} className="group -ml-4">
                      Date Archived
                      {getSortIndicator('lastActivityDate')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('franchisee')} className="group -ml-4">
                      Franchisee
                      {getSortIndicator('franchisee')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('dialerAssigned')} className="group -ml-4">
                      Dialer Assigned
                      {getSortIndicator('dialerAssigned')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('industryCategory')} className="group -ml-4">
                      Industry
                      {getSortIndicator('industryCategory')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || isRefreshing ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : paginatedLeads.length > 0 ? (
                  paginatedLeads.map((lead) => (
                    <Fragment key={lead.id}>
                    <TableRow data-state={selectedLeads.includes(lead.id) && "selected"}>
                      <TableCell>
                        <Checkbox 
                            checked={selectedLeads.includes(lead.id)}
                            onCheckedChange={() => handleSelectLead(lead.id)}
                        />
                      </TableCell>
                      <TableCell>
                         <Button variant="link" className="p-0 h-auto" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>
                            {lead.companyName}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                       <TableCell>
                        {typeof lead.discoveryData?.score === 'number' ? (
                          <ScoreIndicator score={lead.discoveryData.score} />
                        ) : 'N/A'}
                       </TableCell>
                       <TableCell>
                        {lead.discoveryData?.routingTag ? (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Route className="h-3 w-3" />
                            {lead.discoveryData.routingTag}
                          </Badge>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {lead.activity?.[0]?.date ? format(new Date(lead.activity[0].date), 'dd MMM yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>{lead.franchisee ?? 'N/A'}</TableCell>
                      <TableCell>{lead.dialerAssigned ?? 'N/A'}</TableCell>
                      <TableCell>
                        {lead.industryCategory}
                      </TableCell>
                       <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toggleLeadDetails(lead.id, lead.activity?.[0] || null)}>
                                <History className="mr-2 h-4 w-4" />
                                {expandedDetails[lead.id] ? 'Hide History' : 'View History'}
                              </DropdownMenuItem>
                              {userProfile?.role === 'admin' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Lead
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the lead "{lead.companyName}" and all of its associated data (contacts, notes, etc.). This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteLeads([lead.id])} className="bg-destructive hover:bg-destructive/90">
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                     {expandedDetails[lead.id] && (
                        <TableRow>
                            <TableCell colSpan={10} className="p-0">
                                <div className="p-4 bg-secondary/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <h4 className="font-semibold mb-2">Last Activity</h4>
                                            {expandedDetails[lead.id].activity ? (
                                                <div>
                                                    <p className="font-medium">{format(new Date(expandedDetails[lead.id].activity!.date), 'PPpp')}</p>
                                                    <p className="text-muted-foreground">{expandedDetails[lead.id].activity!.notes}</p>
                                                </div>
                                            ) : <p className="text-muted-foreground">No activities found.</p>}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-2">Last Note</h4>
                                            {expandedDetails[lead.id].loadingNote ? (
                                                <Loader />
                                            ) : expandedDetails[lead.id].note ? (
                                                <div>
                                                    <p className="font-medium">{format(new Date(expandedDetails[lead.id].note!.date), 'PPpp')}</p>
                                                    <p className="text-muted-foreground">{expandedDetails[lead.id].note!.content}</p>
                                                </div>
                                            ) : <p className="text-muted-foreground">No notes found.</p>}
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                    </Fragment>
                  ))
                ) : (
                  <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                          No archived leads found.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
           {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage === totalPages}>Next</Button>
            </div>
            )}
        </CardContent>
      </Card>
    </div>
    <MapModal
        isOpen={!!selectedAddress}
        onClose={() => setSelectedAddress(null)}
        address={selectedAddress || ''}
      />
    </>
  )
}
    




