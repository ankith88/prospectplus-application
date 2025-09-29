
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
import { getLeadsFromFirebase, getLastNote, getLastActivity } from '@/services/firebase'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import type { Lead, LeadStatus, Note, Activity, Contact } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { MapModal } from '@/components/map-modal'
import { MapPin, ArrowUpDown, SlidersHorizontal, X, Filter, Calendar as CalendarIcon, User, Star, Download, History, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Badge } from '@/components/ui/badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { useToast } from '@/hooks/use-toast'


type LeadWithDetails = Lead & { notes?: Note[], activity?: Activity[] };

type SortableLeadKeys = 'companyName' | 'status' | 'franchisee' | 'dialerAssigned' | 'industryCategory' | 'discoveryScore';

type ExpandedLeadDetails = {
    note: Note | null;
    activity: Activity | null;
    loading: boolean;
};

const LEADS_PER_PAGE = 100;

interface ArchivedLeadsClientPageProps {
  initialLeads: LeadWithDetails[];
}

export default function ArchivedLeadsClientPage({ initialLeads }: ArchivedLeadsClientPageProps) {
  const [allLeads, setAllLeads] = useState<LeadWithDetails[]>(initialLeads);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortableLeadKeys; direction: 'ascending' | 'descending' } | null>(null);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, ExpandedLeadDetails>>({});

  const [filters, setFilters] = useState({
    companyName: '',
    status: 'all',
    franchisee: '',
    industryCategory: '',
    date: undefined as DateRange | undefined,
  });

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
    }
  }, [user, authLoading, router]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    // The loading state will be reset by the page reloading
  };
  
  useEffect(() => {
    setIsRefreshing(false);
  }, [initialLeads]);


  const handleFilterChange = (filterName: keyof typeof filters, value: string | DateRange | undefined) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1); 
  };

  const clearFilters = () => {
    setFilters({
      companyName: '',
      status: 'all',
      franchisee: '',
      industryCategory: '',
      date: undefined,
    });
    setCurrentPage(1);
  };

  const archivedLeads = useMemo(() => {
     return allLeads.filter(lead => {
        const companyMatch = filters.companyName ? lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
        const statusMatch = filters.status !== 'all' ? lead.status === filters.status : true;
        const franchiseeMatch = filters.franchisee ? (lead.franchisee || '').toLowerCase().includes(filters.franchisee.toLowerCase()) : true;
        const industryMatch = filters.industryCategory ? (lead.industryCategory || '').toLowerCase().includes(filters.industryCategory.toLowerCase()) : true;

        let dateMatch = true;
        if (filters.date?.from && lead.activity?.[0]) {
            const lastActivityDate = new Date(lead.activity[0].date);
            dateMatch = lastActivityDate >= filters.date.from && lastActivityDate <= (filters.date.to || filters.date.from)
        }

        return companyMatch && statusMatch && franchiseeMatch && industryMatch && dateMatch;
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

  const toggleLeadDetails = async (leadId: string) => {
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
            [leadId]: { note: null, activity: null, loading: true },
        }));

        try {
            const [note, activity] = await Promise.all([
                getLastNote(leadId),
                getLastActivity(leadId)
            ]);
            setExpandedDetails(prev => ({
                ...prev,
                [leadId]: { note, activity, loading: false },
            }));
        } catch (error) {
            console.error("Failed to fetch lead details:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load lead details." });
            setExpandedDetails(prev => ({
                ...prev,
                [leadId]: { note: null, activity: null, loading: false },
            }));
        }
    };

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }
  
  const hasActiveFilters = Object.values(filters).some(val => val && val !== 'all' && val !== '');

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
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input id="companyName" value={filters.companyName} onChange={(e) => handleFilterChange('companyName', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Archived</SelectItem>
                                    <SelectItem value="Qualified">Qualified</SelectItem>
                                    <SelectItem value="Pre Qualified">Pre Qualified</SelectItem>
                                    <SelectItem value="Won">Won</SelectItem>
                                    <SelectItem value="Lost">Lost</SelectItem>
                                    <SelectItem value="LPO Review">LPO Review</SelectItem>
                                    <SelectItem value="Unqualified">Unqualified</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="franchisee">Franchisee</Label>
                            <Input id="franchisee" value={filters.franchisee} onChange={(e) => handleFilterChange('franchisee', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="industry">Industry</Label>
                            <Input id="industry" value={filters.industryCategory} onChange={(e) => handleFilterChange('industryCategory', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="date">Date (Last Activity)</Label>
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
           {userProfile?.role === 'admin' && (
              <Button onClick={handleExport} variant="outline" size="sm" disabled={sortedLeads.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export All
              </Button>
            )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                       Score
                       {getSortIndicator('discoveryScore')}
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
                    <TableCell colSpan={7} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : paginatedLeads.length > 0 ? (
                  paginatedLeads.map((lead) => (
                    <>
                    <TableRow key={lead.id}>
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
                      <TableCell>{lead.franchisee ?? 'N/A'}</TableCell>
                      <TableCell>{lead.dialerAssigned ?? 'N/A'}</TableCell>
                      <TableCell>
                        {lead.industryCategory}
                      </TableCell>
                       <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => toggleLeadDetails(lead.id)}>
                              <History className="mr-2 h-4 w-4"/>
                              {expandedDetails[lead.id] ? 'Hide' : 'History'}
                          </Button>
                      </TableCell>
                    </TableRow>
                     {expandedDetails[lead.id] && (
                        <TableRow>
                            <TableCell colSpan={7} className="p-0">
                                <div className="p-4 bg-secondary/50">
                                    {expandedDetails[lead.id].loading ? (
                                        <Loader />
                                    ) : (
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
                                                {expandedDetails[lead.id].note ? (
                                                    <div>
                                                        <p className="font-medium">{format(new Date(expandedDetails[lead.id].note!.date), 'PPpp')}</p>
                                                        <p className="text-muted-foreground">{expandedDetails[lead.id].note!.content}</p>
                                                    </div>
                                                ) : <p className="text-muted-foreground">No notes found.</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                    </>
                  ))
                ) : (
                  <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
