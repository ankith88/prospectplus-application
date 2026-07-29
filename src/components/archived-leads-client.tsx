
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
import { getArchivedLeads, getLastNote, getLastActivity, deleteLead, getAllUsers } from '@/services/firebase'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import type { Lead, LeadStatus, Note, Activity, Contact, UserProfile } from '@/lib/types'
import { useEffect, useState, useMemo, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { MapModal } from '@/components/map-modal'
import { MapPin, ArrowUpDown, SlidersHorizontal, X, Filter, Calendar as CalendarIcon, User, Star, Download, History, RefreshCw, Route, Trash2, CheckCircle2, XCircle, Archive } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'
import { getQuickDateRange, parseDateString } from '@/lib/utils'


type LeadWithDetails = Lead & { notes?: Note[], activity?: Activity[] };

type SortableLeadKeys = 'companyName' | 'status' | 'bucket' | 'franchisee' | 'dialerAssigned' | 'lastActivityDate';

const BUCKET_TABS = [
  { value: 'all', label: 'All Buckets' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'field_sales', label: 'Field Sales' },
  { value: 'account_manager', label: 'Account Management' },
  { value: 'customer_success', label: 'Customer Success' },
  { value: 'nurture', label: 'Nurture' },
  { value: 'marketing', label: 'Marketing' },
];

const getAssignedRepForLead = (lead: LeadWithDetails) => {
  const b = (lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound')).toLowerCase();
  if (b === 'account_manager') {
    return lead.accountManagerAssigned || lead.salesRepAssigned || lead.dialerAssigned || 'Unassigned';
  } else if (b === 'customer_success') {
    return (lead as any).customerSuccessAssigned || lead.accountManagerAssigned || lead.dialerAssigned || 'Unassigned';
  } else if (b === 'field_sales') {
    return (lead as any).fieldRepAssigned || lead.dialerAssigned || lead.salesRepAssigned || 'Unassigned';
  } else {
    return lead.dialerAssigned || lead.salesRepAssigned || lead.accountManagerAssigned || 'Unassigned';
  }
};

const getBucketBadge = (lead: LeadWithDetails) => {
  const b = (lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound')).toLowerCase();
  switch (b) {
    case 'outbound':
      return <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-medium">Outbound</Badge>;
    case 'inbound':
      return <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-medium">Inbound</Badge>;
    case 'field_sales':
      return <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-medium">Field Sales</Badge>;
    case 'account_manager':
      return <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-medium">Account Management</Badge>;
    case 'customer_success':
      return <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-medium">Customer Success</Badge>;
    case 'nurture':
      return <Badge variant="outline" className="bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 font-medium">Nurture</Badge>;
    case 'marketing':
      return <Badge variant="outline" className="bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800 font-medium">Marketing</Badge>;
    default:
      return <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium">Outbound</Badge>;
  }
};

const isOrWasOutboundLead = (lead: LeadWithDetails) => {
  const currentBucket = (lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound')).toLowerCase();
  if (currentBucket === 'outbound') return true;

  if (lead.bucketHistory && Array.isArray(lead.bucketHistory) && lead.bucketHistory.length > 0) {
    const wasOutboundInHistory = lead.bucketHistory.some(bh => {
      const oldB = (bh.oldBucket || '').toLowerCase();
      const newB = (bh.newBucket || '').toLowerCase();
      return oldB === 'outbound' || newB === 'outbound';
    });
    if (wasOutboundInHistory) return true;
  }

  const prevB = ((lead as any).previousBucket || (lead as any).originalBucket || '').toLowerCase();
  if (prevB === 'outbound') return true;

  return false;
};

type ExpandedLeadDetails = {
    note: Note | null;
    activity: Activity | null;
    loading: boolean;
};

const LEADS_PER_PAGE = 100;
const archivedStatuses: LeadStatus[] = ['Qualified', 'Appointment Booked', 'Pre Qualified', 'Won', 'Lost', 'Lost Customer', 'LPO Review', 'Unqualified', 'Trialing ShipMate', 'Free Trial', 'LocalMile Pending', 'LocalMile Opportunity', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off', 'In Qualification', 'Quote Sent', 'Quote Accepted'];

const getDefaultFilters = (role?: string) => {
  const isOutboundOrUser = role === 'user' || role?.toLowerCase() === 'user' || role === 'Outbound Admin';
  return {
    companyName: '',
    status: [] as string[],
    franchisee: [] as string[],
    dialerAssigned: [] as string[],
    appointmentAssignedTo: [] as string[],
    isFieldSourced: 'all' as 'all' | 'yes' | 'no',
    activityDate: undefined as DateRange | undefined,
    appointmentDate: undefined as DateRange | undefined,
    dialerAssignmentDate: isOutboundOrUser ? ({ from: new Date(2026, 6, 10), to: new Date() } as DateRange | undefined) : undefined,
    leadCreatedDate: undefined as DateRange | undefined,
    campaign: 'all',
    statusReason: [] as string[],
    date: undefined as DateRange | undefined,
    checkInDate: undefined as DateRange | undefined,
  };
};

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
  const [activeTab, setActiveTab] = useState<'positive' | 'lost' | 'all'>('positive');

  const [filters, setFilters] = useState(() => getDefaultFilters(userProfile?.activeRole));

  useEffect(() => {
    if (userProfile?.activeRole) {
      setFilters(getDefaultFilters(userProfile.activeRole));
    }
  }, [userProfile?.activeRole]);

  const uniqueFranchisees: Option[] = useMemo(() => {
    if (loading) return [];
    const franchisees = new Set(allLeads.map(lead => lead.franchisee).filter(Boolean));
    return Array.from(franchisees as Set<string>).map(f => ({ value: f, label: f })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allLeads, loading]);

  const activeUserRoleUserNames = useMemo(() => {
    const set = new Set<string>();
    allDialers.forEach(u => {
      if (u.disabled) return;
      if (userProfile?.activeRole === 'Outbound Admin' && u.uid === 'mrSuI8158RN5vMumjIBq7Za8uTg2') return;
      const role = u.role || u.activeRole || '';
      const assignedRoles = u.assignedRoles || [];
      const isUserRole = role === 'user' || role.toLowerCase() === 'user' || assignedRoles.some(r => r === 'user' || r.toLowerCase() === 'user');
      if (isUserRole) {
        if (u.displayName) set.add(u.displayName);
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ');
        if (fullName) set.add(fullName);
        if (u.email) set.add(u.email);
      }
    });
    return set;
  }, [allDialers, userProfile]);

  const dialerOptions: Option[] = useMemo(() => {
    let usersToDisplay = allDialers;
    if (userProfile?.activeRole === 'Outbound Admin') {
      usersToDisplay = allDialers.filter(u => {
        if (u.disabled || u.uid === 'mrSuI8158RN5vMumjIBq7Za8uTg2') return false;
        const role = u.role || u.activeRole || '';
        const assignedRoles = u.assignedRoles || [];
        return role === 'user' || role.toLowerCase() === 'user' || assignedRoles.some(r => r === 'user' || r.toLowerCase() === 'user');
      });
    }
    const uniqueNames = new Set(usersToDisplay.map(d => d.displayName).filter(Boolean));
    const dialers = Array.from(uniqueNames).map(name => ({ value: name!, label: name! }));
    return [
        { value: 'unassigned', label: 'Unassigned' },
        ...dialers.sort((a,b) => a.label.localeCompare(b.label))
    ];
  }, [allDialers, userProfile]);

  const statusOptions: Option[] = useMemo(() => {
    return archivedStatuses.map(s => ({ value: s, label: s === 'Won' ? 'Signed' : s })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);
  
  const uniqueCampaigns: Option[] = useMemo(() => {
    const campaigns = new Set(allLeads.map(lead => {
        const campaign = lead.campaign;
        if (campaign === 'Door-to-Door Field Sales' || campaign === 'Door-to-door Field Sales') {
            return 'D2D';
        }
        return campaign;
    }).filter(Boolean));

    return Array.from(campaigns as Set<string>).map(c => ({ value: c, label: c })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allLeads]);

  const statusReasonOptions: Option[] = useMemo(() => {
    if (loading) return [];
    const reasons = new Set(allLeads.map(lead => lead.statusReason).filter(Boolean));
    return Array.from(reasons as Set<string>).map(r => ({ value: r, label: r })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allLeads, loading]);

  const amOptions: Option[] = useMemo(() => {
    if (loading) return [];
    const ams = new Set<string>();
    allLeads.forEach(lead => {
      if (lead.accountManagerAssigned) ams.add(lead.accountManagerAssigned);
      if (lead.salesRepAssigned) ams.add(lead.salesRepAssigned);
      if (lead.appointments) {
        lead.appointments.forEach(a => { if (a.assignedTo) ams.add(a.assignedTo); });
      }
    });
    return Array.from(ams).map(am => ({ value: am, label: am })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allLeads, loading]);


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
    setFilters(getDefaultFilters(userProfile?.activeRole));
    setCurrentPage(1);
  };

  const baseFilteredLeads = useMemo(() => {
     let leads = allLeads;

     if (userProfile?.activeRole === 'Field Sales Admin') {
        leads = leads.filter(lead => lead.fieldSales === true);
     } else if (userProfile?.activeRole === 'Field Sales' && userProfile.displayName) {
        leads = leads.filter(lead => lead.fieldSales === true && lead.dialerAssigned === userProfile.displayName);
     } else if (userProfile?.activeRole === 'Account Managers' || userProfile?.activeRole === 'Account Manager' || userProfile?.activeRole === 'account managers') {
        const loggedInAmName = userProfile.displayName || [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ');
        if (loggedInAmName) {
            leads = leads.filter(lead => lead.accountManagerAssigned === loggedInAmName);
        }
     } else if (userProfile?.activeRole === 'Outbound Admin') {
        leads = leads.filter(lead => {
          if (!isOrWasOutboundLead(lead)) return false;
          const assignedRep = lead.dialerAssigned || lead.salesRepAssigned || lead.accountManagerAssigned;
          return !!(assignedRep && assignedRep !== 'mrSuI8158RN5vMumjIBq7Za8uTg2' && activeUserRoleUserNames.has(assignedRep));
        });
     } else if (userProfile?.activeRole === 'dialers' || userProfile?.activeRole === 'Dialer' || userProfile?.activeRole === 'user') {
        const loggedInUserName = userProfile.displayName || [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || user?.displayName;
        leads = leads.filter(lead => {
          if (!isOrWasOutboundLead(lead)) return false;
          if (!loggedInUserName) return true;
          return (
            lead.dialerAssigned === loggedInUserName || 
            lead.accountManagerAssigned === loggedInUserName || 
            lead.salesRepAssigned === loggedInUserName
          );
        });
     }
     
      return leads.filter(lead => {
        const companyNameMatch = filters.companyName ? lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
        const statusMatch = filters.status.length > 0 ? filters.status.includes(lead.status) : true;
        const franchiseeMatch = filters.franchisee.length > 0 ? (lead.franchisee && filters.franchisee.includes(lead.franchisee)) : true;
        const statusReasonMatch = filters.statusReason.length > 0 ? (lead.statusReason && filters.statusReason.includes(lead.statusReason)) : true;
        
        let dialerMatch = true;
        if (filters.dialerAssigned.length > 0) {
            if (filters.dialerAssigned.includes('unassigned')) {
                dialerMatch = !lead.dialerAssigned || filters.dialerAssigned.includes(lead.dialerAssigned as string);
            } else {
                dialerMatch = !!(lead.dialerAssigned && filters.dialerAssigned.includes(lead.dialerAssigned));
            }
        }

        let amMatch = true;
        if (filters.appointmentAssignedTo.length > 0) {
            const amVal = lead.accountManagerAssigned || lead.salesRepAssigned;
            const apptAmMatch = lead.appointments?.some(a => a.assignedTo && filters.appointmentAssignedTo.includes(a.assignedTo));
            amMatch = !!(amVal && filters.appointmentAssignedTo.includes(amVal)) || !!apptAmMatch;
        }

        let fieldSourcedMatch = true;
        if (filters.isFieldSourced !== 'all') {
            const isField = !!lead.visitNoteID || lead.fieldSales === true;
            if (filters.isFieldSourced === 'yes') {
                fieldSourcedMatch = isField;
            } else if (filters.isFieldSourced === 'no') {
                fieldSourcedMatch = !isField;
            }
        }
        
        const targetActivityDateFilter = filters.activityDate || filters.date;
        let dateMatch = true;
        if (targetActivityDateFilter?.from) {
            const dateStr = lead.activity?.[0]?.date || lead.lastProspected;
            const lastActivityDate = parseDateString(dateStr);
            if (lastActivityDate) {
                const fromDate = startOfDay(targetActivityDateFilter.from);
                const toDate = targetActivityDateFilter.to ? endOfDay(targetActivityDateFilter.to) : endOfDay(targetActivityDateFilter.from);
                dateMatch = lastActivityDate >= fromDate && lastActivityDate <= toDate;
            } else {
                dateMatch = false;
            }
        }

        let appointmentDateMatch = true;
        if (filters.appointmentDate?.from) {
            if (!lead.appointments || lead.appointments.length === 0) {
                appointmentDateMatch = false;
            } else {
                const fromDate = startOfDay(filters.appointmentDate.from);
                const toDate = filters.appointmentDate.to ? endOfDay(filters.appointmentDate.to) : endOfDay(filters.appointmentDate.from);
                appointmentDateMatch = lead.appointments.some(a => {
                    const d = parseDateString(a.date || (a as any).scheduledDate || (a as any).starttime || (a as any).duedate);
                    return d && d >= fromDate && d <= toDate;
                });
            }
        }

        let assignmentDateMatch = true;
        if (filters.dialerAssignmentDate?.from) {
            const dateStr = lead.assignedToDialerAt || lead.cancellationdate || lead.dateLeadEntered || (lead as any).createdAt || (lead as any).dateCreated || lead.lastProspected || lead.activity?.[0]?.date;
            const assignDate = parseDateString(dateStr);
            if (!assignDate) {
                assignmentDateMatch = true;
            } else {
                const fromDate = startOfDay(filters.dialerAssignmentDate.from);
                const toDate = filters.dialerAssignmentDate.to ? endOfDay(filters.dialerAssignmentDate.to) : endOfDay(filters.dialerAssignmentDate.from);
                assignmentDateMatch = assignDate >= fromDate && assignDate <= toDate;
            }
        }

        let leadCreatedDateMatch = true;
        if (filters.leadCreatedDate?.from) {
            const createdDate = parseDateString((lead as any).dateCreated || lead.dateLeadEntered || (lead as any).createdAt);
            if (!createdDate) {
                leadCreatedDateMatch = false;
            } else {
                const fromDate = startOfDay(filters.leadCreatedDate.from);
                const toDate = filters.leadCreatedDate.to ? endOfDay(filters.leadCreatedDate.to) : endOfDay(filters.leadCreatedDate.from);
                leadCreatedDateMatch = createdDate >= fromDate && createdDate <= toDate;
            }
        }

        let checkInDateMatch = true;
        if (filters.checkInDate?.from) {
            const fromDate = startOfDay(filters.checkInDate.from);
            const toDate = filters.checkInDate.to ? endOfDay(filters.checkInDate.to) : endOfDay(filters.checkInDate.from);
            const checkInActivity = lead.activity?.find(a => a.notes === 'Checked in at location via map.');
            if (checkInActivity) {
                const checkInDate = parseDateString(checkInActivity.date);
                checkInDateMatch = checkInDate ? (checkInDate >= fromDate && checkInDate <= toDate) : false;
            } else {
                checkInDateMatch = false;
            }
        }

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

        return companyNameMatch && statusMatch && franchiseeMatch && dialerMatch && amMatch && fieldSourcedMatch && dateMatch && appointmentDateMatch && assignmentDateMatch && leadCreatedDateMatch && campaignMatch && checkInDateMatch && statusReasonMatch;
    });
  }, [allLeads, filters, userProfile, activeUserRoleUserNames, user]);

  const [selectedBucket, setSelectedBucket] = useState<string>('all');

  const isLostStatus = (status: string) => ['Lost', 'Lost Customer', 'Unqualified'].includes(status);

  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = { all: baseFilteredLeads.length };
    BUCKET_TABS.forEach(t => { if (t.value !== 'all') counts[t.value] = 0; });
    baseFilteredLeads.forEach(lead => {
      const b = (lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound')).toLowerCase();
      if (counts[b] !== undefined) {
        counts[b]++;
      }
    });
    return counts;
  }, [baseFilteredLeads]);

  const currentBucketLeads = useMemo(() => {
    if (selectedBucket === 'all') return baseFilteredLeads;
    return baseFilteredLeads.filter(lead => {
      const b = (lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound')).toLowerCase();
      return b === selectedBucket;
    });
  }, [baseFilteredLeads, selectedBucket]);

  const positiveLeadsCount = useMemo(() => {
    return currentBucketLeads.filter(l => !isLostStatus(l.status)).length;
  }, [currentBucketLeads]);

  const lostLeadsCount = useMemo(() => {
    return currentBucketLeads.filter(l => isLostStatus(l.status)).length;
  }, [currentBucketLeads]);

  const archivedLeads = useMemo(() => {
    if (activeTab === 'positive') {
      return currentBucketLeads.filter(l => !isLostStatus(l.status));
    }
    if (activeTab === 'lost') {
      return currentBucketLeads.filter(l => isLostStatus(l.status));
    }
    return currentBucketLeads;
  }, [currentBucketLeads, activeTab]);

  const sortedLeads = useMemo(() => {
    let sortableItems = [...archivedLeads];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: string | number | undefined;
        let bValue: string | number | undefined;

        if (sortConfig.key === 'bucket') {
          aValue = (a.bucket || (a.fieldSales ? 'field_sales' : 'outbound')).toLowerCase();
          bValue = (b.bucket || (b.fieldSales ? 'field_sales' : 'outbound')).toLowerCase();
        } else if (sortConfig.key === 'dialerAssigned') {
          aValue = getAssignedRepForLead(a);
          bValue = getAssignedRepForLead(b);
        } else if (sortConfig.key === 'lastActivityDate') {
          const dateAStr = a.activity?.[0]?.date || a.lastProspected;
          const dateBStr = b.activity?.[0]?.date || b.lastProspected;
          aValue = dateAStr ? new Date(dateAStr).getTime() : 0;
          bValue = dateBStr ? new Date(dateBStr).getTime() : 0;
        } else {
          aValue = (a[sortConfig.key as keyof Lead] as string | number | undefined) ?? '';
          bValue = (b[sortConfig.key as keyof Lead] as string | number | undefined) ?? '';
        }
        
        if ((aValue ?? '') < (bValue ?? '')) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if ((aValue ?? '') > (bValue ?? '')) {
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

  const getContactFirstAndLastName = (contact?: Partial<Contact>) => {
    if (!contact) return { firstName: '', lastName: '' };
    if (contact.firstName) {
      const lastName = contact.name ? contact.name.replace(contact.firstName, '').trim() : '';
      return { firstName: contact.firstName, lastName };
    }
    if (contact.name) {
      const parts = contact.name.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      return { firstName, lastName };
    }
    return { firstName: '', lastName: '' };
  };

  const handleExport = () => {
      const headers = [
          'Company Name', 'Website URL', 'Company Phone', 'Company Email', 'ABN', 'Street Address', 'Suburb / City', 'State', 'Postcode', 'Country',
          'Postal Street Address', 'Postal Suburb / City', 'Postal State', 'Postal Postcode',
          'Address 2 Tag', 'Address 2 Street', 'Address 2 Suburb / City', 'Address 2 State', 'Address 2 Postcode',
          'Address 3 Tag', 'Address 3 Street', 'Address 3 Suburb / City', 'Address 3 State', 'Address 3 Postcode',
          'Internal ID', 'Customer ID', 'Status', 'Status Reason', 'Franchisee', 'Dialer Assigned', 'Sales Rep Assigned', 'Industry', 'Sub-Industry', 'AI Score', 'AI Reason',
          'Discovery Score', 'Discovery Routing Tag', 'Post Office Relationship', 'Logistics Setup', 'Shipping Volume', 'Express vs Standard', 'Package Types', 'Current Providers', 'E-commerce Tech', 'Same Day Courier', 'Decision Maker', 'Pain Points',
          'Contact 1 First Name', 'Contact 1 Last Name', 'Contact 1 Title', 'Contact 1 Email', 'Contact 1 Phone',
          'Contact 2 First Name', 'Contact 2 Last Name', 'Contact 2 Title', 'Contact 2 Email', 'Contact 2 Phone',
          'Contact 3 First Name', 'Contact 3 Last Name', 'Contact 3 Title', 'Contact 3 Email', 'Contact 3 Phone'
      ];

      const rows: string[][] = [];

      sortedLeads.forEach(lead => {
          const contacts = lead.contacts || [];
          const c1 = getContactFirstAndLastName(contacts[0]);
          const c2 = getContactFirstAndLastName(contacts[1]);
          const c3 = getContactFirstAndLastName(contacts[2]);

          const addrs = lead.additionalAddresses || [];
          const a2 = addrs[0];
          const a3 = addrs[1];

          const row = [
              escapeCsvCell(lead.companyName),
              escapeCsvCell(lead.websiteUrl),
              escapeCsvCell(lead.customerPhone),
              escapeCsvCell(lead.customerServiceEmail),
              escapeCsvCell(lead.abn),
              escapeCsvCell(lead.address?.street),
              escapeCsvCell(lead.address?.city),
              escapeCsvCell(lead.address?.state),
              escapeCsvCell(lead.address?.zip),
              escapeCsvCell(lead.address?.country),
              // Postal Address
              escapeCsvCell(lead.postalAddress?.street),
              escapeCsvCell(lead.postalAddress?.city),
              escapeCsvCell(lead.postalAddress?.state),
              escapeCsvCell(lead.postalAddress?.zip),
              // Address 2 (Tagged)
              escapeCsvCell(a2?.tag),
              escapeCsvCell(a2?.street),
              escapeCsvCell(a2?.city),
              escapeCsvCell(a2?.state),
              escapeCsvCell(a2?.zip),
              // Address 3 (Tagged)
              escapeCsvCell(a3?.tag),
              escapeCsvCell(a3?.street),
              escapeCsvCell(a3?.city),
              escapeCsvCell(a3?.state),
              escapeCsvCell(a3?.zip),
              escapeCsvCell(lead.id),
              escapeCsvCell(lead.entityId),
              escapeCsvCell(lead.status),
              escapeCsvCell(lead.statusReason),
              escapeCsvCell(lead.franchisee),
              escapeCsvCell(lead.dialerAssigned),
              escapeCsvCell(lead.salesRepAssigned),
              escapeCsvCell(lead.industryCategory),
              escapeCsvCell(lead.industrySubCategory),
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
              // Contact 1
              escapeCsvCell(c1.firstName),
              escapeCsvCell(c1.lastName),
              escapeCsvCell(contacts[0]?.title),
              escapeCsvCell(contacts[0]?.email),
              escapeCsvCell(contacts[0]?.phone),
              // Contact 2
              escapeCsvCell(c2.firstName),
              escapeCsvCell(c2.lastName),
              escapeCsvCell(contacts[1]?.title),
              escapeCsvCell(contacts[1]?.email),
              escapeCsvCell(contacts[1]?.phone),
              // Contact 3
              escapeCsvCell(c3.firstName),
              escapeCsvCell(c3.lastName),
              escapeCsvCell(contacts[2]?.title),
              escapeCsvCell(contacts[2]?.email),
              escapeCsvCell(contacts[2]?.phone),
          ];
          rows.push(row);
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
            [leadId]: { note: null, activity: lastActivity, loading: true },
        }));

        try {
            const [note, fetchedActivity] = await Promise.all([
                getLastNote(leadId),
                lastActivity ? Promise.resolve(lastActivity) : getLastActivity(leadId)
            ]);
            setExpandedDetails(prev => ({
                ...prev,
                [leadId]: { ...prev[leadId], note, activity: fetchedActivity, loading: false },
            }));
        } catch (error) {
            console.error("Failed to fetch lead details:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load lead details." });
            setExpandedDetails(prev => ({
                ...prev,
                [leadId]: { ...prev[leadId], loading: false },
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

  const defaultAssignmentFrom = new Date(2026, 6, 10).getTime();
  const hasActiveFilters = useMemo(() => {
    const isOutboundOrUser = userProfile?.activeRole === 'user' || userProfile?.activeRole?.toLowerCase() === 'user' || userProfile?.activeRole === 'Outbound Admin';
    const isCustomAssignmentDate = isOutboundOrUser
      ? (filters.dialerAssignmentDate?.from ? filters.dialerAssignmentDate.from.getTime() !== defaultAssignmentFrom : true)
      : !!filters.dialerAssignmentDate;

    return (
      filters.companyName !== '' ||
      filters.status.length > 0 ||
      filters.franchisee.length > 0 ||
      filters.dialerAssigned.length > 0 ||
      filters.appointmentAssignedTo.length > 0 ||
      filters.isFieldSourced !== 'all' ||
      filters.campaign !== 'all' ||
      filters.statusReason.length > 0 ||
      !!filters.activityDate ||
      !!filters.appointmentDate ||
      !!filters.leadCreatedDate ||
      !!filters.date ||
      !!filters.checkInDate ||
      isCustomAssignmentDate
    );
  }, [filters, userProfile?.activeRole, defaultAssignmentFrom]);

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Archived Leads</h1>
          <p className="text-muted-foreground">View your positive outcomes, qualified, and lost leads.</p>
        </div>
      </header>

      <div className="space-y-4">
        {/* Bucket Main Tabs */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bucket Filter</div>
          <Tabs value={selectedBucket} onValueChange={(val) => { setSelectedBucket(val); setCurrentPage(1); }}>
            <TabsList className="flex flex-wrap h-auto w-full items-center justify-start bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs gap-1.5">
              {BUCKET_TABS.map(tab => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="flex items-center gap-2 rounded-lg py-1.5 px-3 text-xs sm:text-sm font-semibold transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/60 dark:data-[state=active]:border-slate-700/60"
                >
                  <span>{tab.label}</span>
                  <Badge variant="secondary" className="ml-1 bg-slate-200/70 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] px-1.5 py-0.2 rounded-full font-bold">
                    {bucketCounts[tab.value] ?? 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Status Outcome Sub-tabs */}
        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val as 'positive' | 'lost' | 'all'); setCurrentPage(1); }}>
          <TabsList className="flex flex-wrap sm:inline-flex h-auto w-full sm:w-auto items-center justify-start bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs gap-1.5">
            <TabsTrigger 
              value="positive" 
              className="flex items-center justify-center gap-2.5 rounded-lg py-2 px-3.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/60 dark:data-[state=active]:border-slate-700/60"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Positive Outcomes</span>
              <Badge variant="secondary" className="ml-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
                {positiveLeadsCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="lost" 
              className="flex items-center justify-center gap-2.5 rounded-lg py-2 px-3.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-rose-700 dark:data-[state=active]:text-rose-400 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/60 dark:data-[state=active]:border-slate-700/60"
            >
              <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <span>Lost / Unqualified</span>
              <Badge variant="secondary" className="ml-1 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
                {lostLeadsCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className="flex items-center justify-center gap-2.5 rounded-lg py-2 px-3.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/60 dark:data-[state=active]:border-slate-700/60"
            >
              <Archive className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>All Archived</span>
              <Badge variant="secondary" className="ml-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 text-[11px] px-2 py-0.5 rounded-full font-bold">
                {currentBucketLeads.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
       <Collapsible defaultOpen={false}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <Filter className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg font-bold leading-none">Filters</CardTitle>
                    </div>
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
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Assigned To (Dialer)</Label>
                            <MultiSelectCombobox
                                options={dialerOptions}
                                selected={filters.dialerAssigned}
                                onSelectedChange={(selected) => handleFilterChange('dialerAssigned', selected)}
                                placeholder="Select dialers..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Account Manager</Label>
                            <MultiSelectCombobox
                                options={amOptions}
                                selected={filters.appointmentAssignedTo}
                                onSelectedChange={(selected) => handleFilterChange('appointmentAssignedTo', selected)}
                                placeholder="Select AMs..."
                            />
                        </div>
                        {userProfile?.activeRole !== 'Franchisee' && (
                            <div className="space-y-2">
                                <Label>Franchisee</Label>
                                <MultiSelectCombobox
                                    options={uniqueFranchisees}
                                    selected={filters.franchisee}
                                    onSelectedChange={(selected) => handleFilterChange('franchisee', selected)}
                                    placeholder="Select franchisees..."
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Sourced from Field?</Label>
                            <Select value={filters.isFieldSourced} onValueChange={(val) => handleFilterChange('isFieldSourced', val as any)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sources</SelectItem>
                                    <SelectItem value="yes">Transitioned from Field</SelectItem>
                                    <SelectItem value="no">Outbound Original Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                             <MultiSelectCombobox
                                options={statusOptions}
                                selected={filters.status}
                                onSelectedChange={(selected) => handleFilterChange('status', selected)}
                                placeholder="Select statuses..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Activity Date Range Preset</Label>
                            <Select onValueChange={(val) => handleFilterChange('activityDate', getQuickDateRange(val))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select preset..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="yesterday">Yesterday</SelectItem>
                                    <SelectItem value="this-week">This Week</SelectItem>
                                    <SelectItem value="last-week">Last Week</SelectItem>
                                    <SelectItem value="this-month">This Month</SelectItem>
                                    <SelectItem value="last-month">Last Month</SelectItem>
                                    <SelectItem value="this-quarter">This Quarter</SelectItem>
                                    <SelectItem value="this-year">This Year</SelectItem>
                                    <SelectItem value="last-year">Last Year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Activity Date (Total Engagement)</Label>
                            <div className="relative w-full">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-10 pl-3 pr-8 py-2 justify-start text-left font-normal text-xs md:text-sm overflow-hidden whitespace-nowrap text-ellipsis">
                                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                            <span className="truncate">
                                                {filters.activityDate?.from ? (
                                                    filters.activityDate.to ? <>{format(filters.activityDate.from, "LLL dd, y")} - {format(filters.activityDate.to, "LLL dd, y")}</> : format(filters.activityDate.from, "LLL dd, y")
                                                ) : (
                                                    "Pick a date range"
                                                )}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 flex" align="start">
                                        <Calendar mode="range" selected={filters.activityDate} onSelect={(date) => handleFilterChange('activityDate', date)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                {filters.activityDate && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFilterChange('activityDate', undefined);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full hover:bg-slate-100 p-1"
                                        title="Clear activity date filter"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Appointment Date (Schedule)</Label>
                            <div className="relative w-full">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-10 pl-3 pr-8 py-2 justify-start text-left font-normal text-xs md:text-sm overflow-hidden whitespace-nowrap text-ellipsis">
                                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                            <span className="truncate">
                                                {filters.appointmentDate?.from ? (
                                                    filters.appointmentDate.to ? <>{format(filters.appointmentDate.from, "LLL dd, y")} - {format(filters.appointmentDate.to, "LLL dd, y")}</> : format(filters.appointmentDate.from, "LLL dd, y")
                                                ) : (
                                                    "Pick a date range"
                                                )}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 flex" align="start">
                                        <Calendar mode="range" selected={filters.appointmentDate} onSelect={(date) => handleFilterChange('appointmentDate', date)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                {filters.appointmentDate && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFilterChange('appointmentDate', undefined);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full hover:bg-slate-100 p-1"
                                        title="Clear appointment date filter"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Dialer Assignment Date</Label>
                            <div className="relative w-full">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-10 pl-3 pr-8 py-2 justify-start text-left font-normal text-xs md:text-sm overflow-hidden whitespace-nowrap text-ellipsis">
                                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                            <span className="truncate">
                                                {filters.dialerAssignmentDate?.from ? (
                                                    filters.dialerAssignmentDate.to ? <>{format(filters.dialerAssignmentDate.from, "LLL dd, y")} - {format(filters.dialerAssignmentDate.to, "LLL dd, y")}</> : format(filters.dialerAssignmentDate.from, "LLL dd, y")
                                                ) : (
                                                    "Pick a date range"
                                                )}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 flex" align="start">
                                        <Calendar mode="range" selected={filters.dialerAssignmentDate} onSelect={(date) => handleFilterChange('dialerAssignmentDate', date)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                {filters.dialerAssignmentDate && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFilterChange('dialerAssignmentDate', undefined);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full hover:bg-slate-100 p-1"
                                        title="Clear assignment date filter"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Lead Created Date (dateCreated)</Label>
                            <div className="relative w-full">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-10 pl-3 pr-8 py-2 justify-start text-left font-normal text-xs md:text-sm overflow-hidden whitespace-nowrap text-ellipsis">
                                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                            <span className="truncate">
                                                {filters.leadCreatedDate?.from ? (
                                                    filters.leadCreatedDate.to ? <>{format(filters.leadCreatedDate.from, "LLL dd, y")} - {format(filters.leadCreatedDate.to, "LLL dd, y")}</> : format(filters.leadCreatedDate.from, "LLL dd, y")
                                                ) : (
                                                    "Pick a date range"
                                                )}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 flex" align="start">
                                        <Calendar mode="range" selected={filters.leadCreatedDate} onSelect={(date) => handleFilterChange('leadCreatedDate', date)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                {filters.leadCreatedDate && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFilterChange('leadCreatedDate', undefined);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full hover:bg-slate-100 p-1"
                                        title="Clear lead created date filter"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input id="companyName" value={filters.companyName} onChange={(e) => handleFilterChange('companyName', e.target.value)} placeholder="Search company..." />
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
                             <Label htmlFor="statusReason">Lost Reason</Label>
                              <MultiSelectCombobox
                                 options={statusReasonOptions}
                                 selected={filters.statusReason}
                                 onSelectedChange={(selected) => handleFilterChange('statusReason', selected)}
                                 placeholder="Select lost reasons..."
                             />
                         </div>    
                    </CardContent>
                    {hasActiveFilters && (
                        <CardContent className="pt-0">
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs">
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
                {(userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Sales Manager') && selectedLeads.length > 0 && (
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
                {(userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Sales Manager') && (
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
                    <Button variant="ghost" onClick={() => requestSort('bucket')} className="group -ml-4">
                      Bucket
                      {getSortIndicator('bucket')}
                    </Button>
                  </TableHead>
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
                      Assigned Rep
                      {getSortIndicator('dialerAssigned')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || isRefreshing ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center"><Loader /></TableCell>
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
                         <Button variant="link" className="p-0 h-auto" onClick={() => window.open(lead.status === 'Won' ? `/companies/${lead.id}` : `/leads/${lead.id}`, '_blank')}>
                            {lead.companyName}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell>
                        {getBucketBadge(lead)}
                      </TableCell>
                      <TableCell>
                        {lead.activity?.[0]?.date ? format(new Date(lead.activity[0].date), 'dd MMM yyyy') : (lead.lastProspected ? format(new Date(lead.lastProspected), 'dd MMM yyyy') : 'N/A')}
                      </TableCell>
                      <TableCell>{lead.franchisee ?? 'N/A'}</TableCell>
                      <TableCell>{getAssignedRepForLead(lead)}</TableCell>
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
                              {(userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Sales Manager') && (
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
                            <TableCell colSpan={8} className="p-0">
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
                  ))
                ) : (
                  <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
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
