
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
import { updateLeadDialerRep, logActivity, bulkUpdateLeadDialerRep, getAllUsers, getLastNote, getLastActivity, deleteLead, bulkMoveLeadsToBucket, mergeLeads, addLeadsToMarketingList } from '@/services/firebase'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserX, MapPin, SlidersHorizontal, X, PhoneCall, UserPlus, Users, Filter, UserCog, Download, ArrowUpDown, History, PlayCircle, RefreshCw, XCircle, Trash2, Move, Calendar as CalendarIcon, AlertTriangle, GitMerge, Mail, Send, Loader2, ListFilter } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { Checkbox } from '@/components/ui/checkbox'
import { firestore } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
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
  currentBucket?: string;
}

function MoveLeadDialog({ leads, isOpen, onOpenChange, onLeadsMoved, targetBucket, currentBucket }: MoveLeadDialogProps) {
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
                                <SelectValue placeholder={isLoadingUsers ? 'Loading users...' : `Select a ${targetBucket === 'field' ? 'Field Sales Rep' : (currentBucket === 'inbound' ? 'Sales Rep' : 'Dialer')}`} />
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

function MergeLeadsDialog({ masterLead, similarLeads, isOpen, onOpenChange, onMerged }: { masterLead: Lead | null, similarLeads: Lead[], isOpen: boolean, onOpenChange: (open: boolean) => void, onMerged: () => void }) {
    const [selectedDuplicateId, setSelectedDuplicateId] = useState<string>('');
    const [isMerging, setIsMerging] = useState(false);
    const { toast } = useToast();

    const handleMerge = async () => {
        if (!masterLead || !selectedDuplicateId) return;
        setIsMerging(true);
        try {
            await mergeLeads(masterLead.id, selectedDuplicateId);
            toast({ title: "Success", description: "Leads merged successfully." });
            onMerged();
            onOpenChange(false);
        } catch (error) {
            console.error("Merge error:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to merge leads." });
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Merge Potential Duplicate</DialogTitle>
                    <DialogDescription>
                        Select a lead to merge into <strong>{masterLead?.companyName}</strong>. This will transfer all history and contacts.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label className="mb-2 block">Found Similar Lead(s)</Label>
                    <ScrollArea className="h-48 mt-2 border rounded-md p-2">
                        <div className="space-y-3">
                            {similarLeads.map((lead) => (
                                <div key={lead.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                    <Checkbox
                                        id={`merge-${lead.id}`}
                                        checked={selectedDuplicateId === lead.id}
                                        onCheckedChange={() => setSelectedDuplicateId(lead.id)}
                                        className="mt-1"
                                    />
                                    <Label htmlFor={`merge-${lead.id}`} className="font-normal flex flex-col cursor-pointer w-full">
                                        <span className="font-semibold">{lead.companyName}</span>
                                        <span className="text-xs text-muted-foreground">{lead.address?.city || 'No City'}, {lead.customerPhone || 'No Phone'}</span>
                                        <span className="text-xs text-muted-foreground mt-1">Bucket: {lead.bucket || 'outbound'} | Status: {lead.status}</span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleMerge} disabled={!selectedDuplicateId || isMerging} className="bg-orange-600 hover:bg-orange-700">
                        {isMerging ? <Loader /> : 'Merge & Consolidate'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export interface AddToMarketingListDialogProps {
    leads: Lead[];
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onLeadsAdded: () => void;
    existingLists: string[];
}

export function AddToMarketingListDialog({ leads, isOpen, onOpenChange, onLeadsAdded, existingLists }: AddToMarketingListDialogProps) {
    const [listName, setListName] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        if (leads.length === 0 || !listName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select leads and provide a list name.' });
            return;
        }
        setIsSaving(true);
        try {
            await addLeadsToMarketingList(leads.map(l => l.id), listName.trim());
            toast({ title: 'Success', description: `${leads.length} lead(s) have been added to the marketing list: ${listName.trim()}` });
            onLeadsAdded();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to add leads to marketing list:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not add the selected leads to the list.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setListName('');
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add {leads.length} Lead(s) to Marketing List</DialogTitle>
                    <DialogDescription>Type a new list name or choose an existing one.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="marketing-list-name">List Name</Label>
                        <Input 
                            id="marketing-list-name"
                            list="existing-marketing-lists"
                            value={listName}
                            onChange={(e) => setListName(e.target.value)}
                            placeholder="e.g. Q4 Target List"
                        />
                        <datalist id="existing-marketing-lists">
                            {existingLists.map(list => (
                                <option key={list} value={list} />
                            ))}
                        </datalist>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!listName.trim() || isSaving}>
                        {isSaving ? <Loader/> : 'Add to List'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const leadStatuses: LeadStatus[] = ['New', 'Priority Lead', 'Priority Field Lead', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'Trialing ShipMate', 'Reschedule', 'In Qualification', 'Quote Sent', 'Qualified', 'Pre Qualified', 'Unqualified', 'LocalMile Pending', 'LocalMile Opportunity', 'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off'];


interface LeadsClientPageProps {
  title?: string;
  initialBucket?: string;
}

export default function LeadsClientPage({ 
  title = "Outbound Leads", 
  initialBucket = "outbound" 
}: LeadsClientPageProps) {
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
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [masterLeadForMerge, setMasterLeadForMerge] = useState<Lead | null>(null);
  const [similarLeadsForMerge, setSimilarLeadsForMerge] = useState<Lead[]>([]);
  const [isMarketingListDialogOpen, setIsMarketingListDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isBulkEmailDialogOpen, setIsBulkEmailDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [senderType, setSenderType] = useState<'default' | 'me' | 'custom'>('default');
  const [customSenderEmail, setCustomSenderEmail] = useState<string>('');


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
    bucket: initialBucket,
    netsuiteStatus: [] as string[],
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

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'marketing_templates'));
        setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Failed to load templates for quick send:', error);
      }
    };
    fetchTemplates();
  }, []);

  const handleSendBulkEmail = async () => {
    if (selectedLeads.length === 0 || !selectedTemplateId) {
      toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both leads and a template.' });
      return;
    }

    let finalSenderEmail: string | undefined = undefined;
    if (senderType === 'me') {
      if (user?.email && user.email.endsWith('@mailplus.com.au')) {
        finalSenderEmail = user.email;
      } else {
        toast({
          variant: 'destructive',
          title: 'Authorization Error',
          description: 'Your logged-in email address must belong to the @mailplus.com.au domain to send emails.'
        });
        return;
      }
    } else if (senderType === 'custom') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!customSenderEmail || !emailRegex.test(customSenderEmail) || !customSenderEmail.endsWith('@mailplus.com.au')) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: 'Please specify a valid custom sender email ending with @mailplus.com.au.'
        });
        return;
      }
      finalSenderEmail = customSenderEmail;
    }

    setIsSendingEmails(true);
    try {
      const response = await fetch('/api/campaigns/send-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeads,
          templateId: selectedTemplateId,
          customSenderEmail: finalSenderEmail
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Dispatch Successful',
          description: `Template sent directly to ${result.metrics.sent} lead contact(s). Bounces: ${result.metrics.bounced}.`
        });
        setSelectedLeads([]);
        setIsBulkEmailDialogOpen(false);
        setSelectedTemplateId('');
        setSenderType('default');
        setCustomSenderEmail('');
      } else {
        toast({
          variant: 'destructive',
          title: 'Send Failed',
          description: result.message || 'System failed to send the template email.'
        });
      }
    } catch (error: any) {
      console.error('Bulk send error:', error);
      toast({
        variant: 'destructive',
        title: 'Network Error',
        description: error.message || 'Unable to connect to the bulk send API.'
      });
    } finally {
      setIsSendingEmails(false);
    }
  };

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
        const dialers = fetchedUsers.filter(u => ['user', 'admin', 'Lead Gen', 'Lead Gen Admin', 'Sales Manager'].includes(u.role || '') && !u.disabled);
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
      bucket: 'all',
      netsuiteStatus: [],
    });
    setCurrentPage(1);
  };

  const filteredLeads = useMemo(() => {
    let leads = allLeads.filter(lead => {
      const isAccountManager = userProfile?.role === 'Account Managers' || userProfile?.role === 'Account Manager';
      if (isAccountManager && lead.accountManagerAssigned !== user?.displayName) {
          return false;
      }
        
      const companyNameMatch = filters.companyName ? lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
      const statusMatch = filters.status.length > 0 ? filters.status.includes(lead.status) : true;
      const franchiseeMatch = filters.franchisee.length === 0 || (lead.franchisee && filters.franchisee.includes(lead.franchisee));
      const suburbMatch = filters.suburb ? lead.address?.city?.toLowerCase().includes(filters.suburb.toLowerCase()) : true;
      const isArchived = filters.bucket === 'inbound'
        ? ['Lost', 'Won', 'LPO Review'].includes(lead.status)
        : ['Lost', 'Qualified', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate', 'Won', 'LocalMile Pending', 'LocalMile Opportunity', 'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off', 'In Qualification', 'Quote Sent'].includes(lead.status);
      
      // New bucket filtering logic
      let bucketMatch = true;
      if (filters.bucket !== 'all') {
          bucketMatch = lead.bucket === filters.bucket;
      }
      
      const isFieldSalesLead = (lead.bucket === 'field_sales' || (lead.fieldSales === true && !lead.bucket)) && lead.status !== 'Priority Field Lead';

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
      const netsuiteStatusMatch = filters.netsuiteStatus.length === 0 || (lead.netsuiteLeadStatus && filters.netsuiteStatus.includes(lead.netsuiteLeadStatus));

      return !isArchived && !isFieldSalesLead && companyNameMatch && statusMatch && franchiseeMatch && campaignMatch && suburbMatch && dateLeadEnteredMatch && sourceMatch && entityIdMatch && bucketMatch && netsuiteStatusMatch;
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
      const isInbound = filters.bucket === 'inbound';
      return filteredLeads.filter(lead => {
        const assignedToMe = isInbound 
          ? lead.salesRepAssigned === user.displayName 
          : lead.dialerAssigned === user.displayName;
        return assignedToMe || (userProfile?.role === 'Franchisee' && lead.franchisee === userProfile.franchisee)
      });
    }
    return [];
  }, [filteredLeads, user, userProfile, filters.bucket]);

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
    const isInbound = filters.bucket === 'inbound';
    const assignedLeads = filteredLeads.filter(lead => 
      isInbound ? !!lead.salesRepAssigned : !!lead.dialerAssigned
    );
    
    return assignedLeads.reduce((acc, lead) => {
      const assignee = (isInbound ? lead.salesRepAssigned : lead.dialerAssigned)!;
      const status = lead.status;

      if (!acc[assignee]) {
        acc[assignee] = {};
      }
      if (!acc[assignee][status]) {
        acc[assignee][status] = [];
      }
      acc[assignee][status].push(lead);

      return acc;
    }, {} as Record<string, Record<string, LeadWithDetails[]>>);
  }, [filteredLeads, filters.bucket]);


  const unassignedLeads = useMemo(() => {
    const isInbound = filters.bucket === 'inbound';
    return filteredLeads.filter(lead => 
      isInbound ? !lead.salesRepAssigned : !lead.dialerAssigned
    );
  }, [filteredLeads, filters.bucket]);

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
              escapeCsvCell(lead.entityId),
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
    'Internal ID', 'Customer ID', 'Company Name', 'Status', 'Status Reason', 'Franchisee', 'Dialer Assigned', 'Sales Rep Assigned', 'Website', 'Industry', 'Sub-Industry', 'Email', 'Phone', 'Street', 'City', 'State', 'Postcode', 'Country', 'AI Score', 'AI Reason',
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

  const handleExportAllAssigned = async () => {
    const assignedLeads = filteredLeads.filter(l => l.dialerAssigned || l.salesRepAssigned);
    if (assignedLeads.length === 0) return;
    
    toast({ title: 'Starting Export', description: `Fetching full data for ${assignedLeads.length} leads...` });
    try {
        const leadIds = assignedLeads.map(l => l.id);
        const fullLeadsData = await getLeadsFromFirebase({ 
            summary: false,
            leadIds: leadIds
        });

        const rows = generateLeadsRows(fullLeadsData);
        downloadCsv(leadExportHeaders, rows, `all_assigned_leads_${new Date().toISOString().split('T')[0]}.csv`);
        
        toast({ title: 'Export Complete', description: `${fullLeadsData.length} leads have been exported.` });

    } catch (error) {
        console.error("Failed to export all assigned leads:", error);
        toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not export assigned leads.' });
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
      const isInbound = filters.bucket === 'inbound';
      const updateData = isInbound ? { salesRepAssigned: undefined } : { dialerAssigned: undefined };
      await bulkUpdateLeadDialerRep(idsToUnassign, [null], isInbound);
      
      const updatedLeads = allLeads.map(lead =>
        idsToUnassign.includes(lead.id) ? { ...lead, ...updateData } : lead
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
        const isInbound = filters.bucket === 'inbound';
        const updateData = isInbound ? { salesRepAssigned: user.displayName! } : { dialerAssigned: user.displayName! };
        await bulkUpdateLeadDialerRep(selectedLeads, [user.displayName], isInbound);
        
        const updatedLeads = allLeads.map(lead =>
            selectedLeads.includes(lead.id) ? { ...lead, ...updateData } : lead
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
        const isInbound = filters.bucket === 'inbound';
        await bulkUpdateLeadDialerRep(idsForReassignment, reassignToUsers, isInbound);
        
        const assignedLeadsMap = new Map<string, string>();
        idsForReassignment.forEach((leadId, index) => {
            const userToAssign = reassignToUsers[index % reassignToUsers.length];
            assignedLeadsMap.set(leadId, userToAssign);
        });

        const updatedLeads = allLeads.map(lead => {
            if (assignedLeadsMap.has(lead.id)) {
                const assignee = assignedLeadsMap.get(lead.id)!;
                return isInbound 
                    ? { ...lead, salesRepAssigned: assignee } 
                    : { ...lead, dialerAssigned: assignee };
            }
            return lead;
        });
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
      const isInbound = filters.bucket === 'inbound';
      await updateLeadDialerRep(leadId, null, isInbound);
      const updatedLeads = allLeads.map(lead => {
        if (lead.id === leadId) {
            return isInbound ? { ...lead, salesRepAssigned: undefined } : { ...lead, dialerAssigned: undefined };
        }
        return lead;
      });
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
        const isInbound = filters.bucket === 'inbound';
        await updateLeadDialerRep(leadId, user.displayName!, isInbound );
        const updatedLeads = allLeads.map(lead => {
            if (lead.id === leadId) {
                return isInbound ? { ...lead, salesRepAssigned: user.displayName! } : { ...lead, dialerAssigned: user.displayName! };
            }
            return lead;
        });
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

  const uniqueMarketingLists: string[] = useMemo(() => {
    const lists = new Set<string>();
    allLeads.forEach(lead => {
        lead.marketingLists?.forEach(list => lists.add(list));
    });
    return Array.from(lists).sort((a, b) => a.localeCompare(b));
  }, [allLeads]);

  const uniqueNetSuiteStatuses: Option[] = useMemo(() => {
    const statuses = new Set(allLeads.map(lead => lead.netsuiteLeadStatus).filter(Boolean));
    return Array.from(statuses).map(s => ({ value: s!, label: s! })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allLeads]);
  
  const dialerOptions: Option[] = useMemo(() => {
    const uniqueNames = new Set(allDialers.map(d => d.displayName).filter(Boolean));
    return Array.from(uniqueNames).map(name => ({ value: name!, label: name! })).sort((a,b) => a.label.localeCompare(b.label));
  }, [allDialers]);
  
  const isAdminView = userProfile?.role === 'admin' || userProfile?.role === 'Marketing Admin' || userProfile?.role === 'Marketing Manager' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin';

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
        currentBucket={filters.bucket}
    />
    <MergeLeadsDialog
        masterLead={masterLeadForMerge}
        similarLeads={similarLeadsForMerge}
        isOpen={isMergeDialogOpen}
        onOpenChange={setIsMergeDialogOpen}
        onMerged={() => {
            fetchData();
            setMasterLeadForMerge(null);
            setSimilarLeadsForMerge([]);
        }}
    />
    <AddToMarketingListDialog
        leads={allLeads.filter(l => (selectedLeads.length > 0 ? selectedLeads : selectedForReassignment).includes(l.id))}
        isOpen={isMarketingListDialogOpen}
        onOpenChange={setIsMarketingListDialogOpen}
        onLeadsAdded={() => {
            fetchData();
            setSelectedLeads([]);
            setSelectedForReassignment([]);
        }}
        existingLists={uniqueMarketingLists}
    />
    <Dialog open={isBulkEmailDialogOpen} onOpenChange={(open) => { setIsBulkEmailDialogOpen(open); if(!open) setSelectedTemplateId(''); }}>
        <DialogContent className="max-w-md bg-card border">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <span>Send Dynamic Template Email</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                    Choose a marketing template to email directly to the <strong>{selectedLeads.length}</strong> selected lead contact(s).
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 border-y my-2">
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">Send From</Label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setSenderType('default')}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-all text-center ${
                                senderType === 'default'
                                    ? 'bg-primary border-primary text-white shadow-sm'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            Default
                        </button>
                        <button
                            type="button"
                            onClick={() => setSenderType('me')}
                            disabled={!user?.email || !user.email.endsWith('@mailplus.com.au')}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-all text-center ${
                                !user?.email || !user.email.endsWith('@mailplus.com.au')
                                    ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                    : senderType === 'me'
                                    ? 'bg-primary border-primary text-white shadow-sm'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            title={user?.email ? `Send as ${user.email}` : 'Log in using @mailplus.com.au to enable'}
                        >
                            My Account
                        </button>
                        <button
                            type="button"
                            onClick={() => setSenderType('custom')}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-all text-center ${
                                senderType === 'custom'
                                    ? 'bg-primary border-primary text-white shadow-sm'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            Custom
                        </button>
                    </div>
                    {senderType === 'me' && user?.email && (
                        <p className="text-[10px] text-slate-500 italic mt-1">
                            Email will be dispatched from your account: <strong className="text-slate-600">{user.email}</strong>
                        </p>
                    )}
                    {senderType === 'custom' && (
                        <div className="space-y-1.5 mt-2 animate-in fade-in duration-200">
                            <Input
                                type="email"
                                placeholder="e.g., info@mailplus.com.au"
                                value={customSenderEmail}
                                onChange={(e) => setCustomSenderEmail(e.target.value)}
                                className="bg-slate-50 text-xs h-8 border-slate-200 focus-visible:ring-primary focus-visible:ring-offset-0"
                            />
                            <p className="text-[9px] text-slate-400">
                                Address must end with <strong className="text-slate-500">@mailplus.com.au</strong>.
                            </p>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Email Template</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger className="bg-slate-50 text-xs">
                            <SelectValue placeholder="Choose a layout template..." />
                        </SelectTrigger>
                        <SelectContent>
                            {templates.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedTemplateId && (
                    <div className="bg-slate-50 border rounded-lg p-3 space-y-2 animate-in fade-in duration-200">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Subject Line</span>
                            <span className="text-xs font-semibold text-slate-700">
                                {templates.find(t => t.id === selectedTemplateId)?.subject || 'No Subject'}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Body Preview</span>
                            <ScrollArea className="h-28 text-[11px] text-slate-600 font-sans border rounded bg-white p-2 mt-1 whitespace-pre-wrap">
                                {templates.find(t => t.id === selectedTemplateId)?.body || 'No content preview available'}
                            </ScrollArea>
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsBulkEmailDialogOpen(false)}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleSendBulkEmail} 
                    disabled={!selectedTemplateId || isSendingEmails}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                >
                    {isSendingEmails ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Sending Outbound...</span>
                        </>
                    ) : (
                        <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Dispatch Email</span>
                        </>
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
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
                        <div className="space-y-2">
                            <Label htmlFor="bucket">Bucket</Label>
                            <Select value={filters.bucket} onValueChange={(value) => handleFilterChange('bucket', value)}>
                                <SelectTrigger id="bucket-select">
                                    <SelectValue placeholder="Select bucket" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Buckets</SelectItem>
                                    <SelectItem value="outbound">Outbound</SelectItem>
                                    <SelectItem value="field_sales">Field Sales</SelectItem>
                                    <SelectItem value="inbound">Inbound (NetSuite)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {filters.bucket === 'inbound' && (
                            <div className="space-y-2">
                                <Label htmlFor="netsuiteStatus">NetSuite Status</Label>
                                <MultiSelectCombobox
                                    options={uniqueNetSuiteStatuses}
                                    selected={filters.netsuiteStatus}
                                    onSelectedChange={(selected) => handleFilterChange('netsuiteStatus', selected)}
                                    placeholder="Select NetSuite statuses..."
                                />
                            </div>
                        )}
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
                        <Button onClick={() => setIsBulkEmailDialogOpen(true)} variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5">
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email ({selectedLeads.length})
                        </Button>
                        <Button onClick={() => openMoveLeadsDialog('field')} variant="outline" size="sm">
                            <Move className="h-4 w-4 mr-2" />
                            Move to Field Sales ({selectedLeads.length})
                        </Button>
                        <Button onClick={() => setIsMarketingListDialogOpen(true)} variant="outline" size="sm" className="border-secondary text-secondary-foreground hover:bg-secondary/80">
                            <ListFilter className="h-4 w-4 mr-2" />
                            Add to List ({selectedLeads.length})
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
                                        <TableHead className="hidden lg:table-cell px-2 md:px-4">NetSuite Status</TableHead>
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
                                                        <Button variant="link" className="p-0 h-auto text-left flex items-center gap-2">
                                                            {lead.companyName}
                                                            {lead.bucket === 'inbound' && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Inbound</Badge>}
                                                            {lead.isDuplicate && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Potential Duplicate Found</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>View Lead</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStartDialing(leads, lead.id)}>Start dialing from here</DropdownMenuItem>
                                                        {lead.isDuplicate && (
                                                            <DropdownMenuItem onClick={() => {
                                                                setMasterLeadForMerge(lead);
                                                                setSimilarLeadsForMerge(allLeads.filter(l => lead.similarLeads?.includes(l.id)));
                                                                setIsMergeDialogOpen(true);
                                                            }} className="text-orange-600 focus:text-orange-600 font-semibold">
                                                                <GitMerge className="mr-2 h-4 w-4" />
                                                                Merge Duplicate
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell px-2 md:px-4">{lead.franchisee ?? 'N/A'}</TableCell>
                                            <TableCell className="hidden md:table-cell px-2 md:px-4">{lead.industryCategory}</TableCell>
                                            <TableCell className="hidden lg:table-cell px-2 md:px-4">
                                                {lead.netsuiteLeadStatus ? (
                                                    <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200">
                                                        {lead.netsuiteLeadStatus}
                                                    </Badge>
                                                ) : 'N/A'}
                                            </TableCell>
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
                                                <TableCell colSpan={6} className="p-0 md:p-0">
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
                       <Button onClick={() => setIsMarketingListDialogOpen(true)} variant="outline" size="sm" className="border-secondary text-secondary-foreground hover:bg-secondary/80">
                           <ListFilter className="h-4 w-4 mr-2" />
                           Add to List ({selectedForReassignment.length})
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
                <Button onClick={handleExportAllAssigned} variant="outline" size="sm" disabled={Object.keys(groupedAssignedLeads).length === 0}>
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
                                                    <TableHead className="hidden lg:table-cell px-2 md:px-4">NetSuite Status</TableHead>
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
                                                    <TableCell className="hidden lg:table-cell px-2 md:px-4">
                                                        {lead.netsuiteLeadStatus ? (
                                                            <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200">
                                                                {lead.netsuiteLeadStatus}
                                                            </Badge>
                                                        ) : 'N/A'}
                                                    </TableCell>
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
                                                        <TableCell colSpan={6} className="p-0">
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
                        <Button onClick={() => setIsBulkEmailDialogOpen(true)} variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5">
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email ({selectedLeads.length})
                        </Button>
                        <Button onClick={() => setIsMarketingListDialogOpen(true)} variant="outline" size="sm" className="border-secondary text-secondary-foreground hover:bg-secondary/80">
                            <ListFilter className="h-4 w-4 mr-2" />
                            Add to List ({selectedLeads.length})
                        </Button>
                        <Button onClick={handleBulkAssign} variant="outline" size="sm">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Assign {selectedLeads.length} Lead(s) to Me
                        </Button>
                        <Button onClick={() => {
                            setIdsForReassignment(selectedLeads);
                            setIsReassignDialogOpen(true);
                        }} variant="outline" size="sm">
                            <Users className="mr-2 h-4 w-4" />
                            Assign {selectedLeads.length} Lead(s) to {filters.bucket === 'inbound' ? 'Sales Rep' : 'Dialer'}
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
                                        <TableHead className="hidden lg:table-cell px-2 md:px-4">NetSuite Status</TableHead>
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
                                            <TableCell className="hidden lg:table-cell px-2 md:px-4">
                                                {lead.netsuiteLeadStatus ? (
                                                    <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200">
                                                        {lead.netsuiteLeadStatus}
                                                    </Badge>
                                                ) : 'N/A'}
                                            </TableCell>
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
