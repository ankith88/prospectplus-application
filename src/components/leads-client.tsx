

"use client"

import {
  Card,
  CardContent,
  CardFooter,
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
import { getLeadsFromFirebase } from '@/services/firebase'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import type { Lead, LeadStatus, Note, Activity, UserProfile } from '@/lib/types'
import { useEffect, useState, useMemo, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { updateLeadDialerRep, logActivity, bulkUpdateLeadDialerRep, getAllUsers, getLastNote, getLastActivity } from '@/services/firebase'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserX, MapPin, SlidersHorizontal, X, PhoneCall, UserPlus, Users, Filter, UserCog, Download, ArrowUpDown, History, PlayCircle } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { MapModal } from '@/components/map-modal'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'

type LeadWithDetails = Lead & { notes?: Note[], activity?: Activity[] };
type SortableLeadKeys = 'companyName' | 'status' | 'franchisee' | 'industryCategory';
type ExpandedLeadDetails = {
    note: Note | null;
    activity: Activity | null;
    loading: boolean;
};

interface LeadsClientPageProps {
    initialLeads: LeadWithDetails[];
    initialDialers: UserProfile[];
}


export default function LeadsClientPage({ initialLeads, initialDialers }: LeadsClientPageProps) {
  const [allLeads, setAllLeads] = useState<LeadWithDetails[]>(initialLeads);
  const [allDialers, setAllDialers] = useState<UserProfile[]>(initialDialers);
  const [loading, setLoading] = useState(false);
  const [selectedMyLeads, setSelectedMyLeads] = useState<string[]>([]);
  const [selectedAllLeads, setSelectedAllLeads] = useState<string[]>([]);
  const [selectedForReassignment, setSelectedForReassignment] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [reassignToUsers, setReassignToUsers] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortableLeadKeys; direction: 'ascending' | 'descending' } | null>(null);
  const [myLeadsPagination, setMyLeadsPagination] = useState<Record<string, number>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, ExpandedLeadDetails>>({});

  const LEADS_PER_PAGE = 10;
  const [paginationState, setPaginationState] = useState<Record<string, number>>({});
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    companyName: '',
    status: 'all',
    franchisee: '',
    industryCategory: '',
  });

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
  }, [user, authLoading, router]);
  
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

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      companyName: '',
      status: 'all',
      franchisee: '',
      industryCategory: '',
    });
  };

  const filteredLeads = useMemo(() => {
    let leads = allLeads.filter(lead => {
      const companyMatch = filters.companyName ? lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
      const statusMatch = filters.status !== 'all' ? lead.status === filters.status : true;
      const franchiseeMatch = filters.franchisee ? (lead.franchisee || '').toLowerCase().includes(filters.franchisee.toLowerCase()) : true;
      const industryMatch = filters.industryCategory ? (lead.industryCategory || '').toLowerCase().includes(filters.industryCategory.toLowerCase()) : true;
      const isArchived = ['Lost', 'Qualified', 'Won', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Demo'].includes(lead.status);
      return !isArchived && companyMatch && statusMatch && franchiseeMatch && industryMatch;
    });

    if (sortConfig !== null) {
      leads.sort((a, b) => {
        let aValue = a[sortConfig.key] ?? '';
        let bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return leads;
  }, [allLeads, filters, sortConfig]);

  const myLeads = useMemo(() => {
    if (user?.displayName) {
      return filteredLeads.filter(lead => 
        lead.dialerAssigned === user.displayName
      );
    }
    return [];
  }, [filteredLeads, user]);

  const groupedMyLeads = useMemo(() => {
    return myLeads.reduce((acc, lead) => {
      const status = lead.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(lead);
      return acc;
    }, {} as Record<string, LeadWithDetails[]>);
  }, [myLeads]);

  const groupedAssignedLeads = useMemo(() => {
    const assignedLeads = filteredLeads.filter(lead => !!lead.dialerAssigned);
    
    return assignedLeads.reduce((acc, lead) => {
      const dialer = lead.dialerAssigned!;
      const status = lead.status;

      if (!acc[dialer]) {
        acc[dialer] = {};
      }
      if (!acc[dialer][status]) {
        acc[dialer][status] = [];
      }
      acc[dialer][status].push(lead);

      return acc;
    }, {} as Record<string, Record<string, LeadWithDetails[]>>);
  }, [filteredLeads]);


  const unassignedLeads = useMemo(() => {
    return filteredLeads.filter(lead => !lead.dialerAssigned);
  }, [filteredLeads]);

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

  const exportLeadsToCsv = (leads: LeadWithDetails[], filename: string) => {
    const headers = ['Lead ID', 'Company Name', 'Dialer Assigned', 'Status', 'Industry'];
    const rows = leads.map(lead => {
        return [
            escapeCsvCell(lead.id),
            escapeCsvCell(lead.companyName),
            escapeCsvCell(lead.dialerAssigned),
            escapeCsvCell(lead.status),
            escapeCsvCell(lead.industryCategory),
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartDialing = (leads: LeadWithDetails[]) => {
    if (leads.length === 0) return;
    const leadIds = leads.map(l => l.id);
    localStorage.setItem('dialingSessionLeads', JSON.stringify(leadIds));
    router.push(`/leads/${leadIds[0]}`);
  };


  const handleBulkUnassign = async () => {
    if (selectedMyLeads.length === 0) return;
    try {
      const promises = selectedMyLeads.map(leadId => updateLeadDialerRep(leadId, null));
      await Promise.all(promises);
      
      const updatedLeads = allLeads.map(lead =>
        selectedMyLeads.includes(lead.id) ? { ...lead, dialerAssigned: undefined } : lead
      );
      setAllLeads(updatedLeads);
      toast({ title: "Success", description: `${selectedMyLeads.length} lead(s) unassigned.` });
      setSelectedMyLeads([]);
    } catch (error) {
      console.error("Failed to bulk unassign leads:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to unassign leads." });
    }
  };
  
  const handleBulkAssign = async () => {
    if (selectedAllLeads.length === 0 || !user?.displayName) return;
    try {
        const promises = selectedAllLeads.map(leadId => updateLeadDialerRep(leadId, user.displayName!));
        await Promise.all(promises);
        
        const updatedLeads = allLeads.map(lead =>
            selectedAllLeads.includes(lead.id) ? { ...lead, dialerAssigned: user.displayName! } : lead
        );
        setAllLeads(updatedLeads);
        toast({ title: "Success", description: `${selectedAllLeads.length} lead(s) assigned to you.` });
        setSelectedAllLeads([]);
    } catch (error) {
        console.error("Failed to bulk assign leads:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to assign leads." });
    }
  };
  
  const handleBulkReassign = async () => {
    if (selectedForReassignment.length === 0 || reassignToUsers.length === 0) return;
    try {
        await bulkUpdateLeadDialerRep(selectedForReassignment, reassignToUsers);
        
        const assignedLeadsMap = new Map<string, string>();
        selectedForReassignment.forEach((leadId, index) => {
            const userToAssign = reassignToUsers[index % reassignToUsers.length];
            assignedLeadsMap.set(leadId, userToAssign);
        });

        const updatedLeads = allLeads.map(lead =>
            assignedLeadsMap.has(lead.id) ? { ...lead, dialerAssigned: assignedLeadsMap.get(lead.id) } : lead
        );
        setAllLeads(updatedLeads);

        toast({ title: "Success", description: `${selectedForReassignment.length} lead(s) randomly reassigned to ${reassignToUsers.length} user(s).` });
    } catch (error) {
        console.error("Failed to bulk reassign leads:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to reassign leads." });
    } finally {
        setSelectedForReassignment([]);
        setReassignToUsers([]);
        setIsReassignDialogOpen(false);
    }
  };

  const handleSelectMyLead = (leadId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedMyLeads(prev => [...prev, leadId]);
    } else {
      setSelectedMyLeads(prev => prev.filter(id => id !== leadId));
    }
  };
  
  const handleSelectAllLead = (leadId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedAllLeads(prev => [...prev, leadId]);
    } else {
      setSelectedAllLeads(prev => prev.filter(id => id !== leadId));
    }
  };
  
  const handleSelectForReassignment = (leadId: string, checked: boolean | 'indeterminate') => {
    setSelectedForReassignment(prev => 
        checked ? [...prev, leadId] : prev.filter(id => id !== leadId)
    );
  };

  const handleSelectAllMyLeadsInGroup = (leadsInGroup: LeadWithDetails[], checked: boolean | 'indeterminate') => {
    const leadIdsInGroup = leadsInGroup.map(l => l.id);
    if (checked) {
      setSelectedMyLeads(prev => [...new Set([...prev, ...leadIdsInGroup])]);
    } else {
      setSelectedMyLeads(prev => prev.filter(id => !leadIdsInGroup.includes(id)));
    }
  };
  
  const handleSelectAllUnassignedLeads = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedAllLeads(unassignedLeads.map(l => l.id));
    } else {
      setSelectedAllLeads([]);
    }
  };

  const handleUnassign = async (leadId: string) => {
    try {
      await updateLeadDialerRep(leadId, null);
      const updatedLeads = allLeads.map(lead =>
        lead.id === leadId ? { ...lead, dialerAssigned: undefined } : lead
      );
      setAllLeads(updatedLeads);
      toast({ title: "Success", description: "Lead unassigned." });
    } catch (error) {
      console.error("Failed to unassign lead:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to unassign lead." });
    }
  };
  
  const handleAssign = async (leadId: string) => {
    if (!user?.displayName) return;
    try {
        await updateLeadDialerRep(leadId, user.displayName);
        const updatedLeads = allLeads.map(lead =>
            lead.id === leadId ? { ...lead, dialerAssigned: user.displayName! } : lead
        );
        setAllLeads(updatedLeads);
        toast({ title: "Success", description: "Lead assigned to you." });
    } catch (error) {
        console.error("Failed to assign lead:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to assign lead." });
    }
  };
  
  const formatAddress = (address: Lead['address']) => {
    if (!address) return 'N/A';
    return [address.street, address.city, address.state, address.zip, address.country].filter(Boolean).join(', ');
  }

  const handleInitiateCall = (leadId: string, phoneNumber: string) => {
    window.open(`aircall:${phoneNumber}`);
    logActivity(leadId, { type: 'Call', notes: `Initiated call to ${phoneNumber} via AirCall app.` });
    toast({
        title: "Opening AirCall",
        description: `Attempting to dial ${phoneNumber}...`,
    });
  };
  
  const handleReassignUserSelect = (checked: boolean, userId: string) => {
    setReassignToUsers(prev => 
        checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
  };
  
  const handlePageChange = (groupKey: string, newPage: number) => {
    setPaginationState(prev => ({...prev, [groupKey]: newPage}));
  };

  const handleMyLeadsPageChange = (status: string, newPage: number) => {
    setMyLeadsPagination(prev => ({ ...prev, [status]: newPage }));
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

  const hasActiveFilters = Object.values(filters).some(val => val && val !== 'all');

  return (
    <>
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Outbound Leads</h1>
        <p className="text-muted-foreground">Manage and engage with your leads.</p>
      </header>
        <Collapsible>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        <span>Filters</span>
                    </CardTitle>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="ml-2">Toggle Filters</span>
                        </Button>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
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
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {(['New', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'Demo'] as LeadStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
            <CardTitle>My Assigned Leads</CardTitle>
            <div className="flex items-center gap-2">
                {selectedMyLeads.length > 0 && (
                <Button onClick={handleBulkUnassign} variant="outline" size="sm">
                    <UserX className="mr-2 h-4 w-4" />
                    Unassign ({selectedMyLeads.length})
                </Button>
                )}
                <Button onClick={() => exportLeadsToCsv(myLeads, `my_leads_${new Date().toISOString().split('T')[0]}.csv`)} variant="outline" size="sm" disabled={myLeads.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export My Leads
                </Button>
            </div>
        </CardHeader>
        <CardContent>
           {loading ? (
             <div className="text-center"><Loader /></div>
           ) : myLeads.length > 0 ? (
            <Accordion type="multiple" defaultValue={['New']} className="w-full space-y-2">
              {Object.entries(groupedMyLeads).map(([status, leads]) => {
                const currentPage = myLeadsPagination[status] || 1;
                const totalPages = Math.ceil(leads.length / LEADS_PER_PAGE);
                const paginatedLeads = leads.slice((currentPage - 1) * LEADS_PER_PAGE, currentPage * LEADS_PER_PAGE);
                const isAllInGroupSelected = paginatedLeads.every(l => selectedMyLeads.includes(l.id));

                return (
                  <AccordionItem value={status} key={status}>
                    <div className="bg-muted px-4 rounded-md flex items-center justify-between">
                        <AccordionTrigger className="py-0 flex-1">
                          <div className="flex items-center gap-2">
                            <LeadStatusBadge status={status as LeadStatus} />
                            <Badge>{leads.length} Leads</Badge>
                          </div>
                        </AccordionTrigger>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleStartDialing(leads);
                            }}
                            disabled={leads.length === 0}
                            className="ml-4 bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
                        >
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Start Dialing
                        </Button>
                      </div>
                    <AccordionContent className="pt-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8">
                                        <Checkbox
                                            checked={paginatedLeads.length > 0 && isAllInGroupSelected}
                                            onCheckedChange={(checked) => handleSelectAllMyLeadsInGroup(paginatedLeads, checked)}
                                            aria-label={`Select all leads in ${status}`}
                                        />
                                    </TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('companyName')} className="group -ml-4">Company{getSortIndicator('companyName')}</Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('franchisee')} className="group -ml-4">Franchisee{getSortIndicator('franchisee')}</Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('industryCategory')} className="group -ml-4">Industry{getSortIndicator('industryCategory')}</Button></TableHead>
                                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedLeads.map((lead) => (
                                    <Fragment key={lead.id}>
                                    <TableRow data-state={selectedMyLeads.includes(lead.id) && "selected"}>
                                        <TableCell><Checkbox checked={selectedMyLeads.includes(lead.id)} onCheckedChange={(checked) => handleSelectMyLead(lead.id, checked)} aria-label={`Select lead ${lead.companyName}`} /></TableCell>
                                        <TableCell><Button variant="link" className="p-0 h-auto" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>{lead.companyName}</Button></TableCell>
                                        <TableCell>{lead.franchisee ?? 'N/A'}</TableCell>
                                        <TableCell>{lead.industryCategory}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => toggleLeadDetails(lead.id)}>
                                                <History className="mr-2 h-4 w-4"/>
                                                {expandedDetails[lead.id] ? 'Hide' : 'History'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                     {expandedDetails[lead.id] && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="p-0">
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
                                    </Fragment>
                                ))}
                            </TableBody>
                        </Table>
                         {totalPages > 1 && (
                            <div className="flex items-center justify-end gap-2 pt-4">
                                <Button variant="outline" size="sm" onClick={() => handleMyLeadsPageChange(status, currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
                                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => handleMyLeadsPageChange(status, currentPage + 1)} disabled={currentPage === totalPages}>Next</Button>
                            </div>
                        )}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
           ) : (
             <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                You have no actionable leads assigned.
             </div>
           )}
        </CardContent>
      </Card>
      
      {userProfile?.role === 'admin' && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
                <span>All Assigned Leads</span>
                <Badge variant="secondary">{Object.values(groupedAssignedLeads).flat().flatMap(s => Object.values(s)).flat().length} lead(s)</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
                {selectedForReassignment.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setIsReassignDialogOpen(true)}>
                        <UserCog className="mr-2 h-4 w-4" />
                        Reassign ({selectedForReassignment.length})
                    </Button>
                )}
                <Button onClick={() => exportLeadsToCsv(filteredLeads.filter(l => l.dialerAssigned), `all_assigned_leads_${new Date().toISOString().split('T')[0]}.csv`)} variant="outline" size="sm" disabled={Object.keys(groupedAssignedLeads).length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export All Assigned
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="text-center"><Loader /></div>
           ) : Object.keys(groupedAssignedLeads).length > 0 ? (
              <Accordion type="multiple" className="w-full space-y-2">
                {Object.entries(groupedAssignedLeads).map(([dialer, statusGroups]) => (
                  <AccordionItem value={dialer} key={dialer}>
                    <AccordionTrigger className="bg-muted px-4 rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{dialer}</span>
                        <Badge>{Object.values(statusGroups).flat().length} Leads</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                       <Accordion type="multiple" className="w-full space-y-1">
                          {Object.entries(statusGroups).map(([status, leads]) => {
                              const groupKey = `${dialer}-${status}`;
                              const currentPage = paginationState[groupKey] || 1;
                              const totalPages = Math.ceil(leads.length / LEADS_PER_PAGE);
                              const paginatedLeads = leads.slice((currentPage - 1) * LEADS_PER_PAGE, currentPage * LEADS_PER_PAGE);

                              return (
                                <AccordionItem value={status} key={status}>
                                  <AccordionTrigger className="bg-secondary/50 px-4 rounded-md text-sm">
                                      <div className="flex items-center gap-2">
                                          <LeadStatusBadge status={status as LeadStatus} />
                                          <Badge variant="outline">{leads.length} Leads</Badge>
                                      </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="p-2">
                                     <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Company</TableHead>
                                                <TableHead>Franchisee</TableHead>
                                                <TableHead>Industry</TableHead>
                                                <TableHead className="w-[120px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {paginatedLeads.map((lead) => (
                                            <Fragment key={lead.id}>
                                              <TableRow>
                                                  <TableCell><Button variant="link" className="p-0 h-auto" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>{lead.companyName}</Button></TableCell>
                                                  <TableCell>{lead.franchisee ?? 'N/A'}</TableCell>
                                                  <TableCell>{lead.industryCategory}</TableCell>
                                                  <TableCell className="text-right">
                                                      <div className="flex items-center justify-end">
                                                          <Button variant="ghost" size="sm" onClick={() => toggleLeadDetails(lead.id)}>
                                                              <History className="mr-2 h-4 w-4"/>
                                                              {expandedDetails[lead.id] ? 'Hide' : 'History'}
                                                          </Button>
                                                          <DropdownMenu>
                                                              <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                              </DropdownMenuTrigger>
                                                              <DropdownMenuContent>
                                                                <DropdownMenuItem onClick={() => handleUnassign(lead.id)}><UserX className="mr-2 h-4 w-4" />Unassign</DropdownMenuItem>
                                                              </DropdownMenuContent>
                                                          </DropdownMenu>
                                                      </div>
                                                  </TableCell>
                                              </TableRow>
                                              {expandedDetails[lead.id] && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="p-0">
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
                                            </Fragment>
                                          ))}
                                        </TableBody>
                                    </Table>
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-end gap-2 pt-4">
                                            <Button variant="outline" size="sm" onClick={() => handlePageChange(groupKey, currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
                                            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                                            <Button variant="outline" size="sm" onClick={() => handlePageChange(groupKey, currentPage + 1)} disabled={currentPage === totalPages}>Next</Button>
                                        </div>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              )
                          })}
                       </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
           ) : (
             <div className="py-10 text-center text-muted-foreground">
                No leads are currently assigned to any user.
             </div>
           )}
        </CardContent>
      </Card>
      )}

      {userProfile?.role === 'admin' && (
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
                <span>All Unassigned Leads</span>
                <Badge variant="secondary">{unassignedLeads.length} lead(s)</Badge>
            </CardTitle>
            <div className="flex items-center gap-4">
                {selectedAllLeads.length > 0 && (
                    <Button onClick={handleBulkAssign} variant="outline">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign {selectedAllLeads.length} Lead(s) to Me
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead className="w-8">
                    <Checkbox
                        checked={unassignedLeads.length > 0 && selectedAllLeads.length === unassignedLeads.length}
                        onCheckedChange={handleSelectAllUnassignedLeads}
                        aria-label="Select all unassigned leads"
                    />
                  </TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Franchisee</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                      <TableCell colSpan={6} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : unassignedLeads.length > 0 ? (
                  unassignedLeads.map((lead) => {
                    return (
                    <TableRow key={lead.id} data-state={selectedAllLeads.includes(lead.id) && "selected"}>
                      <TableCell>
                        <Checkbox
                            checked={selectedAllLeads.includes(lead.id)}
                            onCheckedChange={(checked) => handleSelectAllLead(lead.id, checked)}
                            aria-label={`Select lead ${lead.companyName}`}
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
                      <TableCell>{lead.franchisee ?? 'N/A'}</TableCell>
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
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleAssign(lead.id)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Assign to Me
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          No unassigned leads found.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
     <MapModal
        isOpen={!!selectedAddress}
        onClose={() => setSelectedAddress(null)}
        address={selectedAddress || ''}
      />
    <Dialog open={isReassignDialogOpen} onOpenChange={(open) => {
        setIsReassignDialogOpen(open);
        if (!open) {
            setReassignToUsers([]);
        }
    }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reassign Leads</DialogTitle>
                <DialogDescription>
                    You are about to reassign {selectedForReassignment.length} lead(s). Select one or more users to randomly distribute the leads to.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label>Assign to</Label>
                <ScrollArea className="h-48 mt-2 border rounded-md p-2">
                    <div className="space-y-2">
                        {allDialers.map((u) => (
                            <div key={u.uid} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`reassign-${u.uid}`}
                                    checked={reassignToUsers.includes(u.displayName!)}
                                    onCheckedChange={(checked) => handleReassignUserSelect(!!checked, u.displayName!)}
                                />
                                <Label htmlFor={`reassign-${u.uid}`} className="font-normal">
                                    {u.displayName}
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleBulkReassign} disabled={reassignToUsers.length === 0}>
                    Confirm Reassignment
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  )
}
