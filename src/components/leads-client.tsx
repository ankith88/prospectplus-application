
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
import { updateLeadDialerRep, logActivity, bulkUpdateLeadDialerRep, getAllUsers, getLastNote, getLastActivity, deleteLead, bulkMoveLeadsToBucket } from '@/services/firebase'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserX, MapPin, SlidersHorizontal, X, PhoneCall, UserPlus, Users, Filter, UserCog, Download, ArrowUpDown, History, PlayCircle, RefreshCw, XCircle, Trash2, Move, Calendar as CalendarIcon } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { MapModal } from '@/components/map-modal'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format, startOfDay, endOfDay } from 'date-fns'
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
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Calendar } from './ui/calendar'
import type { DateRange } from 'react-day-picker';


type LeadWithDetails = Lead & { notes?: Note[], activity?: Activity[] };
type SortableLeadKeys = 'companyName' | 'status' | 'franchisee';
type ExpandedLeadDetails = {
    note: Note | null;
    activity: Activity | null;
    loading: boolean;
};

interface MoveLeadDialogProps {
  leads: Lead[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLeadsMoved: () => void;
  targetBucket: 'field' | 'outbound';
}

function MoveLeadDialog({ leads, isOpen, onOpenChange, onLeadsMoved, targetBucket }: MoveLeadDialogProps) {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const { toast } = useToast();
    
    useEffect(() => {
        const fetchUsers = async () => {
            if (!isOpen) return;

            setIsLoadingUsers(true);
            const allUsers = await getAllUsers();
            const filteredUsers = allUsers.filter(u => {
                if (targetBucket === 'field') {
                    return u.role === 'Field Sales' || u.role === 'Dashback' || u.role === 'admin';
                }
                if (targetBucket === 'outbound') {
                    return u.role === 'user';
                }
                return false;
            });
            setUsers(filteredUsers.filter(u => !u.disabled));
            setIsLoadingUsers(false);
        };
        fetchUsers();
    }, [isOpen, targetBucket]);

    const handleMoveLeads = async () => {
        if (leads.length === 0 || !selectedUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select leads and a user to assign them to.' });
            return;
        }
        setIsMoving(true);
        try {
            await bulkMoveLeadsToBucket({
                leadIds: leads.map(l => l.id),
                fieldSales: targetBucket === 'field',
                assigneeDisplayName: selectedUser,
            });
            toast({ title: 'Success', description: `${leads.length} lead(s) have been moved and reassigned.` });
            onLeadsMoved();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to move leads:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not move the selected leads.' });
        } finally {
            setIsMoving(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setSelectedUser('');
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Move {leads.length} Lead(s)</DialogTitle>
                    <DialogDescription>Move selected leads to the {targetBucket === 'field' ? 'Field Sales' : 'Outbound'} bucket and reassign.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Assign To</Label>
                         <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger disabled={isLoadingUsers}>
                                <SelectValue placeholder={isLoadingUsers ? 'Loading users...' : `Select a ${targetBucket === 'field' ? 'Field Sales Rep' : 'Dialer'}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map(user => (
                                    <SelectItem key={user.uid} value={user.displayName!}>
                                        {user.displayName} ({user.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleMoveLeads} disabled={!selectedUser || isMoving}>
                        {isMoving ? <Loader/> : 'Confirm Move'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const leadStatuses: LeadStatus[] = ['New', 'Priority Lead', 'Priority Field Lead', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'Trialing ShipMate', 'Reschedule', 'In Qualification', 'Quote Sent'];

export default function LeadsClientPage() {
  const [allLeads, setAllLeads] = useState<LeadWithDetails[]>([]);
  const [allDialers, setAllDialers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedForReassignment, setSelectedForReassignment] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [reassignToUsers, setReassignToUsers] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortableLeadKeys; direction: 'ascending' | 'descending' } | null>(null);
  const [myLeadsPagination, setMyLeadsPagination] = useState<Record<string, number>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, ExpandedLeadDetails>>({});
  const [isStartingDialing, setIsStartingDialing] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [leadsToDelete, setLeadsToDelete] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoveLeadDialogOpen, setIsMoveLeadDialogOpen] = useState(false);
  const [leadsToMove, setLeadsToMove] = useState<Lead[]>([]);
  const [idsForReassignment, setIdsForReassignment] = useState<string[]>([]);


  const LEADS_PER_PAGE = 10;
  const [paginationState, setPaginationState] = useState<Record<string, number>>({});
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    companyName: '',
    status: [] as string[],
    franchisee: [] as string[],
    campaign: 'all',
    suburb: '',
    dateLeadEntered: undefined as DateRange | undefined,
    source: [] as string[],
    entityId: '',
  });
  
  useEffect(() => {
    const sessionExists = localStorage.getItem('dialingSessionLeads') !== null;
    setIsSessionActive(sessionExists);
  }, []);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    
    if (user && userProfile) {
        fetchData();
    }

  }, [user, authLoading, router, userProfile]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [fetchedLeads, fetchedUsers] = await Promise.all([
            getLeadsFromFirebase({ 
                summary: true,
                franchisee: userProfile?.role === 'Franchisee' ? userProfile.franchisee : undefined
            }),
            getAllUsers()
        ]);
        setAllLeads(fetchedLeads);
        const dialers = fetchedUsers.filter(u => u.role === 'user' && !u.disabled);
        setAllDialers(dialers);

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch leads.' });
    } finally {
        setLoading(false);
    }
  }


  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData().finally(() => setIsRefreshing(false));
  };
  
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

  const [currentPage, setCurrentPage] = useState(1);
  const handleFilterChange = (filterName: keyof typeof filters, value: string | string[] | DateRange | undefined) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1); 
  };

  const clearFilters = () => {
    setFilters({
      companyName: '',
      status: [],
      franchisee: [],
      campaign: 'all',
      suburb: '',
      dateLeadEntered: undefined,
      source: [],
      entityId: '',
    });
    setCurrentPage(1);
  };

  const filteredLeads = useMemo(() => {
    let leads = allLeads.filter(lead => {
      const companyNameMatch = filters.companyName ? lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
      const statusMatch = filters.status.length > 0 ? filters.status.includes(lead.status) : true;
      const franchiseeMatch = filters.franchisee.length === 0 || (lead.franchisee && filters.franchisee.includes(lead.franchisee));
      const suburbMatch = filters.suburb ? lead.address?.city?.toLowerCase().includes(filters.suburb.toLowerCase()) : true;
      const isArchived = ['Lost', 'Qualified', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate', 'Won', 'LocalMile Pending', 'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off', 'In Qualification', 'Quote Sent'].includes(lead.status);
      const isFieldSalesLead = lead.fieldSales === true && lead.status !== 'Priority Field Lead';

      let campaignMatch = true;
        if (filters.campaign && filters.campaign !== 'all') {
            const leadCampaign = (lead as Lead).campaign;
            const filterCampaign = filters.campaign;
            if (filterCampaign === 'D2D') {
              campaignMatch = leadCampaign === 'Door-to-Door Field Sales' || leadCampaign === 'Door-to-door Field Sales';
            } else {
              campaignMatch = leadCampaign === filterCampaign;
            }
        }
        
      const dateLeadEnteredMatch = !filters.dateLeadEntered?.from || (lead.dateLeadEntered && new Date(lead.dateLeadEntered) >= startOfDay(filters.dateLeadEntered.from) && new Date(lead.dateLeadEntered) <= endOfDay(filters.dateLeadEntered.to || filters.dateLeadEntered.from));
      const sourceMatch = filters.source.length === 0 || (lead.customerSource && filters.source.includes(lead.customerSource));
      const entityIdMatch = filters.entityId ? lead.entityId?.toLowerCase().includes(filters.entityId.toLowerCase()) : true;

      return !isArchived && !isFieldSalesLead && companyNameMatch && statusMatch && franchiseeMatch && campaignMatch && suburbMatch && dateLeadEnteredMatch && sourceMatch && entityIdMatch;
    });

    if (sortConfig !== null) {
      leads.sort((a, b) => {
        let aValue = a[sortConfig.key as keyof Lead] ?? '';
        let bValue = b[sortConfig.key as keyof Lead] ?? '';
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
        lead.dialerAssigned === user.displayName || (userProfile?.role === 'Franchisee' && lead.franchisee === userProfile.franchisee)
      );
    }
    return [];
  }, [filteredLeads, user, userProfile]);

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

  const groupedUnassignedLeads = useMemo(() => {
    return unassignedLeads.reduce((acc, lead) => {
      const status = lead.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(lead);
      return acc;
    }, {} as Record<string, LeadWithDetails[]>);
  }, [unassignedLeads]);

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

  const generateLeadsRows = (leads: Lead[]) => {
      const rows: string[][] = [];
      for (const lead of leads) {
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
              escapeCsvCell(lead.customerPhone),
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
              escapeCsvCell(lead.discoveryData?.decisionMakerName),
              escapeCsvCell(lead.discoveryData?.painPoints),
          ];

          const contacts = lead.contacts || [];
          if (contacts.length === 0) {
              rows.push([...baseRow, '', '', '', '']);
          } else {
              contacts.forEach((contact, index) => {
                  const contactRow = [
                      escapeCsvCell(contact.name),
                      escapeCsvCell(contact.title),
                      escapeCsvCell(contact.email),
                      escapeCsvCell(contact.phone),
                  ];
                  
                  if (index === 0) {
                      rows.push([...baseRow, ...contactRow]);
                  } else {
                      const emptyBase = Array(baseRow.length).fill('');
                      rows.push([...emptyBase, ...contactRow]);
                  }
              });
          }
      }
      return rows;
  };

  const downloadCsv = (headers: string[], rows: string[][], filename: string) => {
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const leadExportHeaders = [
    'Lead ID', 'Company Name', 'Status', 'Status Reason', 'Franchisee', 'Dialer Assigned', 'Sales Rep Assigned', 'Website', 'Industry', 'Sub-Industry', 'Email', 'Phone', 'Street', 'City', 'State', 'Postcode', 'Country', 'AI Score', 'AI Reason',
    'Discovery Score', 'Discovery Routing Tag', 'Post Office Relationship', 'Logistics Setup', 'Shipping Volume', 'Express vs Standard', 'Package Types', 'Current Providers', 'E-commerce Tech', 'Same Day Courier', 'Decision Maker', 'Pain Points',
    'Contact Name', 'Contact Title', 'Contact Email', 'Contact Phone'
  ];

  const handleExportAll = async () => {
    toast({ title: 'Starting Export', description: 'Fetching all lead data. This may take a moment...' });
    try {
        const allLeadsData = await getLeadsFromFirebase({ 
            summary: false,
            franchisee: userProfile?.role === 'Franchisee' ? userProfile.franchisee : undefined
        });

        const rows = generateLeadsRows(allLeadsData);
        downloadCsv(leadExportHeaders, rows, `all_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        
        toast({ title: 'Export Complete', description: `${allLeadsData.length} leads have been exported.` });

    } catch (error) {
        console.error("Failed to export all leads:", error);
        toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not export all leads.' });
    }
  };

  const handleExportSelected = async () => {
    if (selectedLeads.length === 0) return;
    
    toast({ title: 'Starting Export', description: `Fetching data for ${selectedLeads.length} selected leads...` });
    try {
        const selectedLeadsData = await getLeadsFromFirebase({ 
            leadIds: selectedLeads,
            summary: false
        });

        const rows = generateLeadsRows(selectedLeadsData);
        downloadCsv(leadExportHeaders, rows, `selected_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        
        toast({ title: 'Export Complete', description: `${selectedLeadsData.length} leads have been exported.` });

    } catch (error) {
        console.error("Failed to export selected leads:", error);
        toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not export selected leads.' });
    }
  };

  const handleExportMyLeads = async () => {
    toast({ title: 'Starting Export', description: `Fetching full data for ${myLeads.length} leads...` });
    try {
        const leadIds = myLeads.map(l => l.id);
        const fullLeadsData = await getLeadsFromFirebase({ 
            summary: false,
            leadIds: leadIds
        });

        const rows = generateLeadsRows(fullLeadsData);
        downloadCsv(leadExportHeaders, rows, `my_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        
        toast({ title: 'Export Complete', description: `${fullLeadsData.length} leads have been exported.` });

    } catch (error) {
        console.error("Failed to export my leads:", error);
        toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not export my leads.' });
    }
  };

  const handleStartDialing = (leads: LeadWithDetails[], startingFromLeadId?: string) => {
    if (leads.length === 0 || isStartingDialing) return;
    
    setIsStartingDialing(true);

    let sortedLeadIds = leads.map(l => l.id);

    if (startingFromLeadId) {
        const startIndex = sortedLeadIds.indexOf(startingFromLeadId);
        if (startIndex !== -1) {
            sortedLeadIds = [
                ...sortedLeadIds.slice(startIndex),
                ...sortedLeadIds.slice(0, startIndex)
            ];
        }
    }
    
    localStorage.setItem('dialingSessionLeads', JSON.stringify(sortedLeadIds));
    setIsSessionActive(true);
    router.push(`/leads/${sortedLeadIds[0]}`);
  };

  const handleEndSession = () => {
    localStorage.removeItem('dialingSessionLeads');
    setIsSessionActive(false);
    toast({ title: 'Dialing Session Ended' });
  };


  const handleBulkUnassign = async (idsToUnassign: string[]) => {
    if (idsToUnassign.length === 0) return;
    try {
      await bulkUpdateLeadDialerRep(idsToUnassign, [null]);
      
      const updatedLeads = allLeads.map(lead =>
        idsToUnassign.includes(lead.id) ? { ...lead, dialerAssigned: undefined } : lead
      );
      setAllLeads(updatedLeads);
      toast({ title: "Success", description: `${idsToUnassign.length} lead(s) unassigned.` });
      setSelectedLeads([]);
      setSelectedForReassignment([]);
    } catch (error) {
      console.error("Failed to bulk unassign leads:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to unassign leads." });
    }
  };
  
  const handleBulkAssign = async () => {
    if (selectedLeads.length === 0 || !user?.displayName) return;
    try {
        await bulkUpdateLeadDialerRep(selectedLeads, [user.displayName]);
        
        const updatedLeads = allLeads.map(lead =>
            selectedLeads.includes(lead.id) ? { ...lead, dialerAssigned: user.displayName! } : lead
        );
        setAllLeads(updatedLeads);
        toast({ title: "Success", description: `${selectedLeads.length} lead(s) assigned to you.` });
        setSelectedLeads([]);
    } catch (error) {
        console.error("Failed to bulk assign leads:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to assign leads." });
    }
  };
  
  const handleBulkReassign = async () => {
    if (idsForReassignment.length === 0 || reassignToUsers.length === 0) return;
    try {
        await bulkUpdateLeadDialerRep(idsForReassignment, reassignToUsers);
        
        const assignedLeadsMap = new Map<string, string>();
        idsForReassignment.forEach((leadId, index) => {
            const userToAssign = reassignToUsers[index % reassignToUsers.length];
            assignedLeadsMap.set(leadId, userToAssign);
        });

        const updatedLeads = allLeads.map(lead =>
            assignedLeadsMap.has(lead.id) ? { ...lead, dialerAssigned: assignedLeadsMap.get(lead.id) } : lead
        );
        setAllLeads(updatedLeads);

        toast({ title: "Success", description: `${idsForReassignment.length} lead(s) randomly reassigned to ${reassignToUsers.length} user(s).` });
    } catch (error) {
        console.error("Failed to bulk reassign leads:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to reassign leads." });
    } finally {
        setSelectedLeads(prev => prev.filter(id => !idsForReassignment.includes(id)));
        setSelectedForReassignment(prev => prev.filter(id => !idsForReassignment.includes(id)));
        setIdsForReassignment([]);
        setReassignToUsers([]);
        setIsReassignDialogOpen(false);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const handleSelectForReassignment = (leadId: string, checked: boolean | 'indeterminate') => {
    setSelectedForReassignment(prev => 
        checked ? [...prev, leadId] : prev.filter(id => id !== leadId)
    );
  };

  const handleSelectAllInGroup = (leadsInGroup: LeadWithDetails[], listType: 'myLeads' | 'unassigned' | 'reassign') => {
      const leadIdsInGroup = leadsInGroup.map(l => l.id);
      const targetSelection = listType === 'reassign' ? selectedForReassignment : selectedLeads;
      const setTargetSelection = listType === 'reassign' ? setSelectedForReassignment : setSelectedLeads;

      const isChecked = leadIdsInGroup.length > 0 && leadIdsInGroup.every(id => targetSelection.includes(id));
      
      let newSelectedLeads = [...targetSelection];
      if (isChecked) {
          newSelectedLeads = newSelectedLeads.filter(id => !leadIdsInGroup.includes(id));
      } else {
          newSelectedLeads = [...new Set([...newSelectedLeads, ...leadIdsInGroup])];
      }
      setTargetSelection(newSelectedLeads);
  };
  
  const handleSelectAllForReassignment = (leadsInGroup: LeadWithDetails[], isChecked: boolean) => {
    const leadIdsInGroup = leadsInGroup.map(l => l.id);
    if (isChecked) {
        setSelectedForReassignment(prev => [...new Set([...prev, ...leadIdsInGroup])]);
    } else {
        setSelectedForReassignment(prev => prev.filter(id => !leadIdsInGroup.includes(id)));
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
        await updateLeadDialerRep(leadId, user.displayName! );
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

  const handleJumpToPage = (e: React.FormEvent<HTMLFormElement>, groupKey: string, totalPages: number, setPageFn: (key: string, page: number) => void) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const page = parseInt(formData.get('page') as string, 10);
    if (!isNaN(page) && page > 0 && page <= totalPages) {
        setPageFn(groupKey, page);
    }
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
    
    const confirmDelete = (ids: string[]) => {
        if (ids.length > 0) {
            setLeadsToDelete(ids);
        }
    };

    const handleDelete = async () => {
        if (leadsToDelete.length === 0) return;

        setIsDeleting(true);
        try {
            await deleteLead(leadsToDelete);
            toast({ title: 'Success', description: `${leadsToDelete.length} lead(s) have been permanently deleted.` });
            setAllLeads(prev => prev.filter(l => !leadsToDelete.includes(l.id)));
            setSelectedLeads([]);
            setSelectedForReassignment([]);
        } catch (error) {
            console.error("Failed to delete leads:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete the selected leads." });
        } finally {
            setIsDeleting(false);
            setLeadsToDelete([]);
        }
    };
    
    const openMoveLeadsDialog = (targetBucket: 'field' | 'outbound') => {
        const leadsToProcess = selectedLeads.length > 0 ? selectedLeads : selectedForReassignment;
        const leads = allLeads.filter(l => leadsToProcess.includes(l.id));
        setLeadsToMove(leads);
        setIsMoveLeadDialogOpen(true);
    };

  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) ? val.length > 0 : val && val !== 'all'));
  
  const leadStatusOptions: Option[] = leadStatuses.map(s => ({ value: s, label: s === 'Won' ? 'Signed' : s })).sort((a,b) => a.label.localeCompare(b.label));
  
  const uniqueFranchisees: Option[] = useMemo(() => {
    const franchisees = new Set(allLeads.map(lead => lead.franchisee).filter(Boolean));
    return Array.from(franchisees).map(f => ({ value: f!, label: f! })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allLeads]);
  
  const uniqueSources: Option[] = useMemo(() => {
    const sources = new Set(allLeads.map(lead => lead.customerSource).filter(Boolean));
    return Array.from(sources).map(s => ({ value: s!, label: s! })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allLeads]);
  
  const uniqueCampaigns: Option[] = useMemo(() => {
    const campaigns = new Set(allLeads.map(lead => {
        const campaign = lead.campaign;
        if (campaign === 'Door-to-Door Field Sales' || campaign === 'Door-to-door Field Sales') {
            return 'D2D';
        }
        return campaign;
    }).filter(Boolean));

    return Array.from(campaigns).map(c => ({ value: c!, label: c! })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allLeads]);
  
  const dialerOptions: Option[] = useMemo(() => {
    const uniqueNames = new Set(allDialers.map(d => d.displayName).filter(Boolean));
    return Array.from(uniqueNames).map(name => ({ value: name!, label: name! })).sort((a,b) => a.label.localeCompare(b.label));
  }, [allDialers]);
  
  const isAdminView = userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin';

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <>
    <MoveLeadDialog
        leads={leadsToMove}
        isOpen={isMoveLeadDialogOpen}
        onOpenChange={setIsMoveLeadDialogOpen}
        onLeadsMoved={() => {
            fetchData(); // Refresh data after moving
            setSelectedLeads([]);
            setSelectedForReassignment([]);
        }}
        targetBucket="field"
    />
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
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="entityId">Customer ID</Label>
                            <Input id="entityId" value={filters.entityId} onChange={(e) => handleFilterChange('entityId', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input id="companyName" value={filters.companyName} onChange={(e) => handleFilterChange('companyName', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="suburb">Suburb</Label>
                            <Input id="suburb" value={filters.suburb} onChange={(e) => handleFilterChange('suburb', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                             <MultiSelectCombobox
                                options={leadStatusOptions}
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
                             <Select value={filters.campaign} onValueChange={(value) => handleFilterChange('campaign', value)}>
                                <SelectTrigger id="campaign-select">
                                    <SelectValue placeholder="Select a campaign" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Campaigns</SelectItem>
                                    {uniqueCampaigns.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="source">Source</Label>
                            <MultiSelectCombobox
                                options={uniqueSources}
                                selected={filters.source}
                                onSelectedChange={(selected) => handleFilterChange('source', selected)}
                                placeholder="Select sources..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dateLeadEntered">Date Lead Entered</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="dateLeadEntered" variant={"outline"} className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {filters.dateLeadEntered?.from ? (filters.dateLeadEntered.to ? <>{format(filters.dateLeadEntered.from, "LLL dd, y")} - {format(filters.dateLeadEntered.to, "LLL dd, y")}</> : format(filters.dateLeadEntered.from, "LLL dd, y")) : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 flex" align="start">
                                    <Calendar mode="range" selected={filters.dateLeadEntered} onSelect={(date) => handleFilterChange('dateLeadEntered', date)} initialFocus />
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
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle>{userProfile?.role === 'Franchisee' ? `${userProfile.franchisee} Franchise Leads` : 'My Assigned Leads'}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
                {isSessionActive && (
                  <Button onClick={handleEndSession} variant="destructive" size="sm">
                    <XCircle className="mr-2 h-4 w-4" />
                    End Session
                  </Button>
                )}
                {selectedLeads.length > 0 && isAdminView && (
                    <>
                        <Button onClick={() => confirmDelete(selectedLeads)} variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete ({selectedLeads.length})
                        </Button>
                        <Button onClick={() => handleBulkUnassign(selectedLeads)} variant="outline" size="sm">
                            <UserX className="mr-2 h-4 w-4" />
                            Unassign ({selectedLeads.length})
                        </Button>
                    </>
                )}
                {selectedLeads.length > 0 && (
                    <div className="flex gap-2">
                        <Button onClick={() => openMoveLeadsDialog('field')} variant="outline" size="sm">
                            <Move className="h-4 w-4 mr-2" />
                            Move to Field Sales ({selectedLeads.length})
                        </Button>
                        <Button onClick={handleExportSelected} variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Export Selected ({selectedLeads.length})
                        </Button>
                    </div>
                )}
                <Button onClick={handleExportMyLeads} variant="outline" size="sm" disabled={myLeads.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export {userProfile?.role === 'Franchisee' ? 'Franchise' : 'My'} Leads
                </Button>
                 {isAdminView && (
                    <Button onClick={handleExportAll} variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export All Leads
                    </Button>
                 )}
            </div>
        </CardHeader>
        <CardContent>
           {loading || isRefreshing ? (
             <div className="text-center"><Loader /></div>
           ) : myLeads.length > 0 ? (
            <Accordion type="multiple" defaultValue={['New']} className="w-full space-y-2">
              {Object.entries(groupedMyLeads).sort(([statusA], [statusB]) => statusA.localeCompare(statusB)).map(([status, leads]) => {
                const currentPage = myLeadsPagination[status] || 1;
                const totalPages = Math.ceil(leads.length / LEADS_PER_PAGE);
                const paginatedLeads = leads.slice((currentPage - 1) * LEADS_PER_PAGE, currentPage * LEADS_PER_PAGE);
                const isAllInGroupSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeads.includes(l.id));

                return (
                  <AccordionItem value={status} key={status}>
                    <div className="bg-muted px-4 rounded-md flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Checkbox
                                checked={isAllInGroupSelected}
                                onCheckedChange={() => handleSelectAllInGroup(paginatedLeads, 'myLeads')}
                                onClick={(e) => e.stopPropagation()}
                                id={`select-all-myleads-${status}`}
                            />
                            <AccordionTrigger className="py-0 flex-1">
                              <div className="flex items-center gap-2">
                                <LeadStatusBadge status={status as LeadStatus} />
                                <Badge>{leads.length} Leads</Badge>
                              </div>
                            </AccordionTrigger>
                        </div>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleStartDialing(leads);
                            }}
                            disabled={leads.length === 0 || isStartingDialing}
                             className="ml-4 bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
                        >
                            {isStartingDialing ? <Loader /> : <PlayCircle className="mr-2 h-4 w-4" />}
                            {isStartingDialing ? 'Starting...' : 'Start Dialing'}
                        </Button>
                      </div>
                    <AccordionContent className="pt-2">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8 px-2 md:px-4"></TableHead>
                                        <TableHead className="px-2 md:px-4"><Button variant="ghost" onClick={() => requestSort('companyName')} className="group -ml-4">Company{getSortIndicator('companyName')}</Button></TableHead>
                                        <TableHead className="hidden sm:table-cell px-2 md:px-4"><Button variant="ghost" onClick={() => requestSort('franchisee')} className="group -ml-4">Franchisee{getSortIndicator('franchisee')}</Button></TableHead>
                                        <TableHead className="hidden md:table-cell px-2 md:px-4">Industry</TableHead>
                                        <TableHead className="w-[120px] text-right px-2 md:px-4">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedLeads.map((lead) => (
                                        <Fragment key={lead.id}>
                                        <TableRow data-state={selectedLeads.includes(lead.id) && "selected"}>
                                            <TableCell className="px-2 md:px-4">
                                            <Checkbox 
                                                    checked={selectedLeads.includes(lead.id)} 
                                                    onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)} 
                                                    aria-label={`Select lead ${lead.companyName}`} 
                                                />
                                            </TableCell>
                                            <TableCell className="px-2 md:px-4">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="link" className="p-0 h-auto text-left">{lead.companyName}</Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>View Lead</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStartDialing(leads, lead.id)}>Start dialing from here</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell px-2 md:px-4">{lead.franchisee ?? 'N/A'}</TableCell>
                                            <TableCell className="hidden md:table-cell px-2 md:px-4">{lead.industryCategory}</TableCell>
                                            <TableCell className="text-right px-2 md:px-4">
                                                <div className="hidden md:inline-flex">
                                                    <Button variant="ghost" size="sm" onClick={() => toggleLeadDetails(lead.id)}>
                                                        <History className="mr-2 h-4 w-4"/>
                                                        {expandedDetails[lead.id] ? 'Hide' : 'History'}
                                                    </Button>
                                                </div>
                                                <div className="inline-flex md:hidden">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => toggleLeadDetails(lead.id)}><History className="mr-2 h-4 w-4"/>View History</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {expandedDetails[lead.id] && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="p-0 md:p-0">
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
                        </div>
                         {totalPages > 1 && (
                            <div className="flex items-center justify-end gap-2 pt-4 text-sm">
                                <Button variant="outline" size="sm" onClick={() => handleMyLeadsPageChange(status, currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
                                <div className="flex items-center gap-1">
                                    Page
                                    <form onSubmit={(e) => handleJumpToPage(e, status, totalPages, handleMyLeadsPageChange)} >
                                        <Input
                                            type="number"
                                            name="page"
                                            defaultValue={currentPage}
                                            className="h-7 w-12"
                                            min="1"
                                            max={totalPages}
                                        />
                                    </form>
                                    of {totalPages}
                                </div>
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
      
      {isAdminView && (
       <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
                <span>All Assigned Leads</span>
                <Badge variant="secondary">{Object.values(groupedAssignedLeads).flat().flatMap(s => Object.values(s)).flat().length} lead(s)</Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
                {selectedForReassignment.length > 0 && (
                    <>
                       <Button variant="destructive" size="sm" onClick={() => confirmDelete(selectedForReassignment)}>
                           <Trash2 className="mr-2 h-4 w-4" />
                           Delete ({selectedForReassignment.length})
                       </Button>
                        <Button onClick={() => openMoveLeadsDialog('field')} variant="outline" size="sm">
                            <Move className="h-4 w-4 mr-2" />
                            Move to Field Sales ({selectedForReassignment.length})
                        </Button>
                       <Button variant="outline" size="sm" onClick={() => handleBulkUnassign(selectedForReassignment)}>
                           <UserX className="mr-2 h-4 w-4" />
                           Unassign ({selectedForReassignment.length})
                       </Button>
                       <Button variant="outline" size="sm" onClick={() => {
                           setIdsForReassignment(selectedForReassignment);
                           setIsReassignDialogOpen(true);
                       }}>
                           <UserCog className="h-4 w-4 mr-2" />
                           Reassign ({selectedForReassignment.length})
                       </Button>
                    </>
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
                {Object.entries(groupedAssignedLeads).sort(([dialerA], [dialerB]) => dialerA.localeCompare(dialerB)).map(([dialer, statusGroups]) => (
                  <AccordionItem value={dialer} key={dialer}>
                    <div className="bg-muted px-4 rounded-md flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                              checked={Object.values(statusGroups).flat().length > 0 && Object.values(statusGroups).flat().every(l => selectedForReassignment.includes(l.id))}
                              onCheckedChange={(checked) => handleSelectAllForReassignment(Object.values(statusGroups).flat(), !!checked)}
                              onClick={(e) => e.stopPropagation()}
                              id={`select-all-${dialer}`}
                              aria-label={`Select all leads for ${dialer}`}
                          />
                          <AccordionTrigger className="py-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{dialer}</span>
                              <Badge>{Object.values(statusGroups).flat().length} Leads</Badge>
                            </div>
                          </AccordionTrigger>
                        </div>
                    </div>
                    <AccordionContent className="pt-2">
                       <Accordion type="multiple" className="w-full space-y-1">
                          {Object.entries(statusGroups).sort(([statusA], [statusB]) => statusA.localeCompare(statusB)).map(([status, leads]) => {
                              const groupKey = `${dialer}-${status}`;
                              const currentPage = paginationState[groupKey] || 1;
                              const totalPages = Math.ceil(leads.length / LEADS_PER_PAGE);
                              const paginatedLeads = leads.slice((currentPage - 1) * LEADS_PER_PAGE, currentPage * LEADS_PER_PAGE);
                              const areAllInGroupSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selectedForReassignment.includes(l.id));

                              return (
                                <AccordionItem value={status} key={status}>
                                  <div className="bg-secondary/50 px-4 rounded-md flex items-center">
                                    <Checkbox
                                        checked={areAllInGroupSelected}
                                        onCheckedChange={(checked) => handleSelectAllForReassignment(paginatedLeads, !!checked)}
                                        onClick={(e) => e.stopPropagation()}
                                        id={`select-all-${dialer}-${status}`}
                                        className="mr-2"
                                        aria-label={`Select all leads for ${dialer} with status ${status}`}
                                    />
                                    <AccordionTrigger className="py-2 text-sm flex-1">
                                      <div className="flex items-center gap-2">
                                          <LeadStatusBadge status={status as LeadStatus} />
                                          <Badge variant="outline">{leads.length} Leads</Badge>
                                      </div>
                                    </AccordionTrigger>
                                  </div>
                                  <AccordionContent className="p-2">
                                     <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-8 px-2 md:px-4"></TableHead>
                                                    <TableHead className="px-2 md:px-4">Company</TableHead>
                                                    <TableHead className="hidden sm:table-cell px-2 md:px-4">Franchisee</TableHead>
                                                    <TableHead className="hidden md:table-cell px-2 md:px-4">Industry</TableHead>
                                                    <TableHead className="w-[120px] text-right px-2 md:px-4">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {paginatedLeads.map((lead) => (
                                                <Fragment key={lead.id}>
                                                <TableRow data-state={selectedForReassignment.includes(lead.id) && "selected"}>
                                                    <TableCell className="px-2 md:px-4">
                                                        <Checkbox
                                                            checked={selectedForReassignment.includes(lead.id)}
                                                            onCheckedChange={(checked) => handleSelectForReassignment(lead.id, !!checked)}
                                                            aria-label={`Select lead ${lead.companyName}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-2 md:px-4"><Button variant="link" className="p-0 h-auto text-left" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>{lead.companyName}</Button></TableCell>
                                                    <TableCell className="hidden sm:table-cell px-2 md:px-4">{lead.franchisee ?? 'N/A'}</TableCell>
                                                    <TableCell className="hidden md:table-cell px-2 md:px-4">{lead.industryCategory}</TableCell>
                                                    <TableCell className="text-right px-2 md:px-4">
                                                        <div className="hidden md:inline-flex">
                                                            <Button variant="ghost" size="sm" onClick={() => toggleLeadDetails(lead.id)}><History className="mr-2 h-4 w-4"/>{expandedDetails[lead.id] ? 'Hide' : 'History'}</Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent>
                                                                    <DropdownMenuItem onClick={() => handleUnassign(lead.id)}><UserX className="mr-2 h-4 w-4" />Unassign</DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => confirmDelete([lead.id])}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                         <div className="inline-flex md:hidden">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent>
                                                                    <DropdownMenuItem onClick={() => toggleLeadDetails(lead.id)}><History className="mr-2 h-4 w-4"/>View History</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleUnassign(lead.id)}><UserX className="mr-2 h-4 w-4" />Unassign</DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => confirmDelete([lead.id])}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
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
                                     </div>
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-end gap-2 pt-4 text-sm">
                                            <Button variant="outline" size="sm" onClick={() => handlePageChange(groupKey, currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
                                             <div className="flex items-center gap-1">
                                                Page
                                                <form onSubmit={(e) => handleJumpToPage(e, groupKey, totalPages, handlePageChange)}>
                                                    <Input
                                                        type="number"
                                                        name="page"
                                                        defaultValue={currentPage}
                                                        className="h-7 w-12"
                                                        min="1"
                                                        max={totalPages}
                                                    />
                                                </form>
                                                of {totalPages}
                                            </div>
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

      {isAdminView && (
       <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
                <span>All Unassigned Leads</span>
                <Badge variant="secondary">{unassignedLeads.length} lead(s)</Badge>
            </CardTitle>
            <div className="flex items-center gap-4">
                 {selectedLeads.length > 0 && (
                     <>
                        <Button variant="destructive" size="sm" onClick={() => confirmDelete(selectedLeads)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete ({selectedLeads.length})
                        </Button>
                         <Button onClick={() => openMoveLeadsDialog('field')} variant="outline" size="sm">
                            <Move className="h-4 w-4 mr-2" />
                            Move to Field Sales ({selectedLeads.length})
                        </Button>
                     </>
                 )}
                {selectedLeads.length > 0 && (
                    <div className="flex gap-2">
                        <Button onClick={handleBulkAssign} variant="outline" size="sm">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Assign {selectedLeads.length} Lead(s) to Me
                        </Button>
                        <Button onClick={() => {
                            setIdsForReassignment(selectedLeads);
                            setIsReassignDialogOpen(true);
                        }} variant="outline" size="sm">
                            <Users className="mr-2 h-4 w-4" />
                            Assign {selectedLeads.length} Lead(s) to Dialer
                        </Button>
                        <Button onClick={handleExportSelected} variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Export Selected ({selectedLeads.length})
                        </Button>
                    </div>
                )}
            </div>
        </CardHeader>
        <CardContent>
           {loading || isRefreshing ? (
             <div className="text-center"><Loader /></div>
           ) : unassignedLeads.length > 0 ? (
            <Accordion type="multiple" defaultValue={['New']} className="w-full space-y-2">
              {Object.entries(groupedUnassignedLeads).sort(([statusA], [statusB]) => statusA.localeCompare(statusB)).map(([status, leads]) => {
                const groupKey = `unassigned-${status}`;
                const currentPage = paginationState[groupKey] || 1;
                const totalPages = Math.ceil(leads.length / LEADS_PER_PAGE);
                const paginatedLeads = leads.slice((currentPage - 1) * LEADS_PER_PAGE, currentPage * LEADS_PER_PAGE);
                const isAllInGroupSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeads.includes(l.id));

                return (
                  <AccordionItem value={status} key={status}>
                    <div className="bg-muted px-4 rounded-md flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Checkbox
                                checked={isAllInGroupSelected}
                                onCheckedChange={() => handleSelectAllInGroup(paginatedLeads, 'unassigned')}
                                onClick={(e) => e.stopPropagation()}
                                id={`select-all-unassigned-${status}`}
                            />
                            <AccordionTrigger className="py-0 flex-1">
                              <div className="flex items-center gap-2">
                                <LeadStatusBadge status={status as LeadStatus} />
                                <Badge>{leads.length} Leads</Badge>
                              </div>
                            </AccordionTrigger>
                        </div>
                      </div>
                    <AccordionContent className="pt-2">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8 px-2 md:px-4"></TableHead>
                                        <TableHead className="px-2 md:px-4">Company</TableHead>
                                        <TableHead className="hidden sm:table-cell px-2 md:px-4">Franchisee</TableHead>
                                        <TableHead className="hidden md:table-cell px-2 md:px-4">Industry</TableHead>
                                        <TableHead className="w-[120px] text-right px-2 md:px-4">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedLeads.map((lead) => (
                                        <TableRow key={lead.id} data-state={selectedLeads.includes(lead.id) && "selected"}>
                                            <TableCell className="px-2 md:px-4">
                                                <Checkbox 
                                                    checked={selectedLeads.includes(lead.id)} 
                                                    onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)} 
                                                    aria-label={`Select lead ${lead.companyName}`} 
                                                />
                                            </TableCell>
                                            <TableCell className="px-2 md:px-4">
                                                <Button variant="link" className="p-0 h-auto text-left" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>
                                                    {lead.companyName}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell px-2 md:px-4">{lead.franchisee ?? 'N/A'}</TableCell>
                                            <TableCell className="hidden md:table-cell px-2 md:px-4">{lead.industryCategory}</TableCell>
                                            <TableCell className="text-right px-2 md:px-4">
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
                                                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => confirmDelete([lead.id])}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                         {totalPages > 1 && (
                            <div className="flex items-center justify-end gap-2 pt-4 text-sm">
                                <Button variant="outline" size="sm" onClick={() => handlePageChange(groupKey, currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
                                <div className="flex items-center gap-1">
                                    Page
                                    <form onSubmit={(e) => handleJumpToPage(e, groupKey, totalPages, handlePageChange)} >
                                        <Input
                                            type="number"
                                            name="page"
                                            defaultValue={currentPage}
                                            className="h-7 w-12"
                                            min="1"
                                            max={totalPages}
                                        />
                                    </form>
                                    of {totalPages}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handlePageChange(groupKey, currentPage + 1)} disabled={currentPage === totalPages}>Next</Button>
                            </div>
                        )}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
           ) : (
             <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                No unassigned leads found.
             </div>
           )}
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
                    You are about to reassign {idsForReassignment.length} lead(s). Select one or more users to randomly distribute the leads to.
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
    <AlertDialog open={leadsToDelete.length > 0} onOpenChange={(open) => !open && setLeadsToDelete([])}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete {leadsToDelete.length} lead(s) and all associated data (contacts, notes, etc.). This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader /> : 'Delete'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
