

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
import { getLeadsTool } from '@/ai/flows/get-leads-tool'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import type { Lead, LeadStatus, Note, Activity, UserProfile } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { updateLeadDialerRep, logActivity, getAllNotes, getAllActivities, bulkUpdateLeadDialerRep, getAllUsers } from '@/services/firebase'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserX, MapPin, SlidersHorizontal, X, PhoneCall, UserPlus, Users, Filter, UserCog, Download } from 'lucide-react'
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


type LeadWithDetails = Lead & { notes?: Note[], activity?: Activity[] };

export default function LeadsPage() {
  const [allLeads, setAllLeads] = useState<LeadWithDetails[]>([]);
  const [allDialers, setAllDialers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMyLeads, setSelectedMyLeads] = useState<string[]>([]);
  const [selectedAllLeads, setSelectedAllLeads] = useState<string[]>([]);
  const [selectedForReassignment, setSelectedForReassignment] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [reassignToUsers, setReassignToUsers] = useState<string[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    companyName: '',
    status: 'all',
    franchisee: '',
    industryCategory: '',
    phoneNumber: '',
  });

  useEffect(() => {
    async function getLeads() {
      if (!user && !authLoading) {
        router.push('/signin');
        return;
      }
      if (authLoading) return;

      try {
        setLoading(true);
        const [fetchedLeads, allNotes, allActivities, fetchedUsers] = await Promise.all([
          getLeadsTool({ summary: true }),
          getAllNotes(),
          getAllActivities(),
          getAllUsers()
        ]);
        
        const activeDialers = fetchedUsers
          .filter(u => u.role !== 'admin' && u.firstName && u.lastName)
          .map(u => ({...u, displayName: `${u.firstName} ${u.lastName}`.trim() }));

        setAllDialers(activeDialers);

        const notesByLead = new Map<string, Note[]>();
        allNotes.forEach(note => {
            if (!notesByLead.has(note.leadId)) {
                notesByLead.set(note.leadId, []);
            }
            notesByLead.get(note.leadId)!.push(note);
        });

        const activitiesByLead = new Map<string, Activity[]>();
        allActivities.forEach(activity => {
            if (!activitiesByLead.has(activity.leadId)) {
                activitiesByLead.set(activity.leadId, []);
            }
            activitiesByLead.get(activity.leadId)!.push(activity);
        });

        const leadsWithDetails = fetchedLeads.map(lead => ({
          ...lead,
          notes: notesByLead.get(lead.id) || [],
          activity: activitiesByLead.get(lead.id) || [],
        }));
        
        setAllLeads(leadsWithDetails);

      } catch (error) {
        console.error("Failed to fetch leads:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch leads." });
      } finally {
        setLoading(false);
      }
    }
    getLeads();
  }, [user, authLoading, router, toast]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      companyName: '',
      status: 'all',
      franchisee: '',
      industryCategory: '',
      phoneNumber: '',
    });
  };

  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
      const companyMatch = filters.companyName ? lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
      const statusMatch = filters.status !== 'all' ? lead.status === filters.status : true;
      const franchiseeMatch = filters.franchisee ? (lead.franchisee || '').toLowerCase().includes(filters.franchisee.toLowerCase()) : true;
      const industryMatch = filters.industryCategory ? (lead.industryCategory || '').toLowerCase().includes(filters.industryCategory.toLowerCase()) : true;
      const phoneMatch = filters.phoneNumber ? (lead.customerPhone || '').replace(/\D/g, '').includes(filters.phoneNumber.replace(/\D/g, '')) : true;
      const isArchived = ['Lost', 'Qualified', 'Won', 'LPO Review', 'Pre Qualified', 'Unqualified'].includes(lead.status);
      return !isArchived && companyMatch && statusMatch && franchiseeMatch && industryMatch && phoneMatch;
    });
  }, [allLeads, filters]);

  const myLeads = useMemo(() => {
    if (user?.displayName) {
      return filteredLeads.filter(lead => 
        lead.dialerAssigned === user.displayName
      );
    }
    return [];
  }, [filteredLeads, user]);

  useEffect(() => {
    if (!loading && myLeads.length > 0 && searchParams.get('nextLead') === 'true') {
        const lastLeadStatus = searchParams.get('lastLeadStatus') as LeadStatus | null;
        const statusToFind = lastLeadStatus || 'New';
        
        const leadsInStatus = myLeads.filter(lead => lead.status === statusToFind);

        if (leadsInStatus.length > 0) {
            router.replace(`/leads/${leadsInStatus[0].id}`);
        } else {
             const newLeads = myLeads.filter(lead => lead.status === 'New');
             if (newLeads.length > 0) {
                 router.replace(`/leads/${newLeads[0].id}`);
             } else {
                router.replace('/leads');
             }
        }
    }
  }, [loading, myLeads, searchParams, router]);


  const leadsByStatus = useMemo(() => {
    const grouped = myLeads.reduce((acc, lead) => {
      const status = lead.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(lead);
      return acc;
    }, {} as Record<LeadStatus, LeadWithDetails[]>);

    const preferredOrder: LeadStatus[] = ["New", "High Touch", "Connected", "In Progress"];
    
    return Object.entries(grouped).sort(([statusA], [statusB]) => {
        const indexA = preferredOrder.indexOf(statusA as LeadStatus);
        const indexB = preferredOrder.indexOf(statusB as LeadStatus);

        if (indexA === -1 && indexB === -1) return statusA.localeCompare(statusB);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
    });

  }, [myLeads]);
  
  const allAssignedLeads = useMemo(() => {
    return filteredLeads.filter(lead => !!lead.dialerAssigned);
  }, [filteredLeads]);
  
  const leadsByUser = useMemo(() => {
    const groupedByUser = allAssignedLeads.reduce((acc, lead) => {
        const user = lead.dialerAssigned;
        if (user) {
            if (!acc[user]) {
                acc[user] = {};
            }
            const status = lead.status;
            if (!acc[user][status]) {
                acc[user][status] = [];
            }
            acc[user][status].push(lead);
        }
        return acc;
    }, {} as Record<string, Record<string, LeadWithDetails[]>>);

    return Object.entries(groupedByUser)
        .sort(([userA], [userB]) => userA.localeCompare(userB))
        .map(([user, statuses]) => {
            const sortedStatuses = Object.entries(statuses).sort(([statusA], [statusB]) => statusA.localeCompare(statusB));
            const totalLeads = sortedStatuses.reduce((sum, [, leads]) => sum + leads.length, 0);
            return [user, sortedStatuses, totalLeads] as [string, [string, LeadWithDetails[]][], number];
        });
  }, [allAssignedLeads]);

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
    const headers = ['Lead ID', 'Company Name', 'Dialer Assigned', 'Status', 'Phone', 'Industry', 'Last Activity Note', 'Last Activity Date', 'Last Note Content', 'Last Note Date', 'Last Note Author'];
    const rows = leads.map(lead => {
        const lastActivity = lead.activity?.[0];
        const lastNote = lead.notes?.[0];
        return [
            escapeCsvCell(lead.id),
            escapeCsvCell(lead.companyName),
            escapeCsvCell(lead.dialerAssigned),
            escapeCsvCell(lead.status),
            escapeCsvCell(lead.customerPhone),
            escapeCsvCell(lead.industryCategory),
            escapeCsvCell(lastActivity?.notes),
            escapeCsvCell(lastActivity ? new Date(lastActivity.date).toLocaleString() : ''),
            escapeCsvCell(lastNote?.content),
            escapeCsvCell(lastNote ? new Date(lastNote.date).toLocaleString() : ''),
            escapeCsvCell(lastNote?.author),
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
  
  const handleSelectAllForReassignment = (userLeads: LeadWithDetails[], checked: boolean | 'indeterminate') => {
      const leadIds = userLeads.map(l => l.id);
      if (checked) {
          setSelectedForReassignment(prev => [...new Set([...prev, ...leadIds])]);
      } else {
          setSelectedForReassignment(prev => prev.filter(id => !leadIds.includes(id)));
      }
  };


  const handleSelectAllMyLeads = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedMyLeads(myLeads.map(l => l.id));
    } else {
      setSelectedMyLeads([]);
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


  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  const hasActiveFilters = Object.values(filters).some(val => val && val !== 'all');
  const showUnassigned = userProfile?.role !== 'admin';

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
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input id="companyName" value={filters.companyName} onChange={(e) => handleFilterChange('companyName', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input id="phoneNumber" value={filters.phoneNumber} onChange={(e) => handleFilterChange('phoneNumber', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {(['New', 'Contacted', 'In Progress', 'Connected', 'High Touch'] as LeadStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
             <Accordion type="multiple" className="w-full">
                {leadsByStatus.map(([status, leads]) => (
                  <AccordionItem value={status} key={status}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <LeadStatusBadge status={status as LeadStatus} />
                        <span className="font-semibold">{status}</span>
                        <Badge variant="secondary">{leads.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                       <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Company</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Industry</TableHead>
                              <TableHead>Last Activity</TableHead>
                              <TableHead>Last Note</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leads.map((lead) => {
                              const lastActivity = lead.activity?.[0];
                              const lastNote = lead.notes?.[0];
                              return (
                                <TableRow key={lead.id}>
                                  <TableCell>
                                    <Button variant="link" className="p-0 h-auto" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>
                                      {lead.companyName}
                                    </Button>
                                  </TableCell>
                                  <TableCell>
                                    {lead.customerPhone ? (
                                      <div className="flex items-center gap-1">
                                          <span className="font-medium break-all">{lead.customerPhone}</span>
                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); handleInitiateCall(lead.id, lead.customerPhone!)}}>
                                              <PhoneCall className="w-3 h-3" />
                                          </Button>
                                      </div>
                                    ) : 'N/A'}
                                  </TableCell>
                                  <TableCell>{lead.industryCategory}</TableCell>
                                  <TableCell className="min-w-[200px] whitespace-pre-wrap">
                                    {lastActivity ? (
                                      <div className="flex flex-col">
                                        <span className="font-medium">{lastActivity.notes}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(lastActivity.date).toLocaleDateString()}</span>
                                      </div>
                                    ) : (
                                      'N/A'
                                    )}
                                  </TableCell>
                                  <TableCell className="min-w-[200px] whitespace-pre-wrap">
                                    {lastNote ? (
                                        <div className="flex flex-col">
                                            <span className="font-medium">{lastNote.content}</span>
                                            <span className="text-xs text-muted-foreground">{new Date(lastNote.date).toLocaleDateString()} by {lastNote.author}</span>
                                        </div>
                                    ) : 'N/A'}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                       </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
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
                <Badge variant="secondary">{allAssignedLeads.length} lead(s)</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
                {selectedForReassignment.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setIsReassignDialogOpen(true)}>
                        <UserCog className="mr-2 h-4 w-4" />
                        Reassign ({selectedForReassignment.length})
                    </Button>
                )}
                <Button onClick={() => exportLeadsToCsv(allAssignedLeads, `all_assigned_leads_${new Date().toISOString().split('T')[0]}.csv`)} variant="outline" size="sm" disabled={allAssignedLeads.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export All Assigned
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="text-center"><Loader /></div>
           ) : allAssignedLeads.length > 0 ? (
             <Accordion type="multiple" className="w-full">
                {leadsByUser.map(([user, statuses, totalLeads]) => (
                  <AccordionItem value={user} key={user}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <span className="font-semibold">{user}</span>
                        <Badge variant="secondary">{totalLeads} lead(s)</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Accordion type="multiple" className="w-full pl-4">
                            {statuses.map(([status, leads]) => (
                                <AccordionItem value={`${user}-${status}`} key={`${user}-${status}`}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-2">
                                            <LeadStatusBadge status={status as LeadStatus} />
                                            <span className="font-semibold">{status}</span>
                                            <Badge variant="secondary">{leads.length}</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                       <Table>
                                          <TableHeader>
                                            <TableRow>
                                               <TableHead className="w-8">
                                                <Checkbox
                                                    checked={leads.every(l => selectedForReassignment.includes(l.id))}
                                                    onCheckedChange={(checked) => handleSelectAllForReassignment(leads, checked)}
                                                    aria-label={`Select all leads for ${user} with status ${status}`}
                                                />
                                                </TableHead>
                                              <TableHead>Company</TableHead>
                                              <TableHead>Phone</TableHead>
                                              <TableHead>Last Activity</TableHead>
                                              <TableHead className="w-[50px] text-right">Actions</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {leads.map((lead) => {
                                               const addressString = formatAddress(lead.address);
                                               const lastActivity = lead.activity?.[0];
                                               return (
                                                <TableRow key={lead.id} data-state={selectedForReassignment.includes(lead.id) && "selected"}>
                                                  <TableCell>
                                                      <Checkbox
                                                        checked={selectedForReassignment.includes(lead.id)}
                                                        onCheckedChange={(checked) => handleSelectForReassignment(lead.id, checked)}
                                                        aria-label={`Select lead ${lead.companyName}`}
                                                      />
                                                  </TableCell>
                                                  <TableCell>
                                                    <Button variant="link" className="p-0 h-auto" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>
                                                      {lead.companyName}
                                                    </Button>
                                                  </TableCell>
                                                  <TableCell>
                                                    {lead.customerPhone ? (
                                                      <div className="flex items-center gap-1">
                                                          <span className="font-medium break-all">{lead.customerPhone}</span>
                                                           <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); handleInitiateCall(lead.id, lead.customerPhone!)}}>
                                                              <PhoneCall className="w-3 h-3" />
                                                          </Button>
                                                      </div>
                                                    ) : 'N/A'}
                                                  </TableCell>
                                                  <TableCell className="min-w-[200px] whitespace-pre-wrap">
                                                    {lastActivity ? (
                                                      <div className="flex flex-col">
                                                        <span className="font-medium">{lastActivity.notes}</span>
                                                        <span className="text-xs text-muted-foreground">{new Date(lastActivity.date).toLocaleDateString()}</span>
                                                      </div>
                                                    ) : (
                                                      'N/A'
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                          <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                          </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                          <DropdownMenuItem onClick={() => handleUnassign(lead.id)}>
                                                            <UserX className="mr-2 h-4 w-4" />
                                                            Unassign
                                                          </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                      </DropdownMenu>
                                                  </TableCell>
                                                </TableRow>
                                               )
                                            })}
                                          </TableBody>
                                       </Table>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
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
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Franchisee</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                      <TableCell colSpan={7} className="text-center"><Loader /></TableCell>
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
                        {lead.customerPhone ? (
                           <div className="flex items-center gap-1">
                               <span className="font-medium break-all">{lead.customerPhone}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); handleInitiateCall(lead.id, lead.customerPhone!)}}>
                                   <PhoneCall className="w-3 h-3" />
                               </Button>
                           </div>
                        ) : 'N/A'}
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
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
