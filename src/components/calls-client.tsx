

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
import type { Activity, LeadStatus, Transcript, Review, ReviewCategory, UserProfile } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Phone, Calendar, Clock, Filter, SlidersHorizontal, User, Hash, X, Voicemail, Download, FileText, MessageSquare, Edit, Users, ArrowUpDown, MoreVertical, Layers } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getAllCallActivities, getAllTranscripts, addCallReview, getAllUsers } from '@/services/firebase'
import { getCallTranscriptByCallId } from '@/ai/flows/get-call-transcript-flow'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getQuickDateRange } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { TranscriptViewer } from '@/components/transcript-viewer'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { ScrollArea } from './ui/scroll-area'
import { Checkbox } from './ui/checkbox'
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend as ChartLegend, ResponsiveContainer, BarChart, Cell, LabelList } from 'recharts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'


type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string; accountManagerAssigned?: string; leadBucket?: string; movedFromBucket?: string; movedToBucket?: string; movedFromStatus?: LeadStatus; movedToStatus?: LeadStatus };
const reviewCategories: ReviewCategory[] = ['Good Example', 'Coaching Opportunity', 'Needs Improvement'];

type SortableCallKeys = 'leadName' | 'dialerAssigned' | 'leadStatus' | 'leadBucket' | 'date' | 'duration';

const CALLS_PER_PAGE = 50;
const leadStatuses: LeadStatus[] = ['New', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'LPO Review', 'Qualified', 'Pre Qualified', 'Unqualified', 'Won', 'Lost', 'Trialing ShipMate', 'Reschedule'];

const bucketNames: Record<string, string> = {
  outbound: 'Outbound',
  field_sales: 'Field Sales',
  inbound: 'Inbound',
  account_manager: 'Account Manager',
  customer_success: 'Customer Success',
  nurture: 'Nurture',
  marketing: 'Marketing',
};

function cleanCallNotes(notes: string): string {
    if (!notes) return '';
    let cleaned = notes.replace(/Recording:\s*https?:\/\/\S+/gi, '');
    cleaned = cleaned.replace(/https?:\/\/production-pdx-[^?\s]+\S*/gi, '');
    cleaned = cleaned.replace(/Aircall call:\s*/gi, '');
    return cleaned.trim().replace(/\n\s*\n/g, '\n');
}

export default function CallsClientPage() {
  const [allCalls, setAllCalls] = useState<CallActivity[]>([]);
  const [allTranscripts, setAllTranscripts] = useState<Transcript[]>([]);
  const [allDialers, setAllDialers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [fetchingTranscriptId, setFetchingTranscriptId] = useState<string | null>(null);
  const [reviewingCall, setReviewingCall] = useState<CallActivity | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewCategory, setReviewCategory] = useState<ReviewCategory | "">("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [viewingReview, setViewingReview] = useState<Review | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: SortableCallKeys; direction: 'ascending' | 'descending' } | null>({ key: 'date', direction: 'descending' });
  const [activeCallTab, setActiveCallTab] = useState<'callId' | 'initiated'>('callId');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [pendingFilters, setPendingFilters] = useState({
    user: [] as string[],
    date: getQuickDateRange('todayandyesterday') as DateRange | undefined,
    duration: 'all',
    leadName: '',
    status: [] as string[],
    reviewed: 'all' as 'all' | 'reviewed' | 'not_reviewed',
    reviewedBy: [] as string[],
    reviewCategory: [] as string[],
    bucket: [] as string[],
  });

  const [appliedFilters, setAppliedFilters] = useState(pendingFilters);

  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const fetchInitialData = async () => {
    try {
      const [fetchedTranscripts, fetchedUsers] = await Promise.all([
        getAllTranscripts(),
        getAllUsers(),
      ]);
      setAllTranscripts(fetchedTranscripts);
      const dialers = fetchedUsers
        .filter(u => !u.assignedRoles?.includes('admin') && u.firstName && u.lastName)
        .map(u => ({ ...u, displayName: `${u.firstName} ${u.lastName}`.trim() }));
      setAllDialers(dialers);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    }
  }

  const fetchCallsData = async () => {
    setLoading(true);
    try {
      const fromStr = appliedFilters.date?.from ? appliedFilters.date.from.toISOString() : undefined;
      const toStr = appliedFilters.date?.to ? appliedFilters.date.to.toISOString() : undefined;
      const fetchedCalls = await getAllCallActivities(fromStr, toStr);
      setAllCalls(fetchedCalls);
    } catch (error) {
      console.error("Failed to fetch calls:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch calls.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    
    if (user) {
      fetchInitialData();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchCallsData();
    }
  }, [user, appliedFilters.date]);

  const handlePendingFilterChange = (filterName: keyof typeof pendingFilters, value: any) => {
    setPendingFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(pendingFilters);
    setCurrentPage(1);
  };
  
  const clearFilters = () => {
    const cleared = {
      user: [],
      date: undefined,
      duration: 'all',
      leadName: '',
      status: [],
      reviewed: 'all' as 'all' | 'reviewed' | 'not_reviewed',
      reviewedBy: [],
      reviewCategory: [],
      bucket: []
    };
    setPendingFilters(cleared);
    setAppliedFilters(cleared);
    setCurrentPage(1);
  };
  
  const parseDuration = (durationStr?: string): number => {
    if (!durationStr) return 0;
    const minutesMatch = durationStr.match(/(\d+)m/);
    const secondsMatch = durationStr.match(/(\d+)s/);
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
    return minutes * 60 + seconds;
  };
  
  const filteredCalls = useMemo(() => {
    let callsToFilter = allCalls || [];

    // Deduplicate calls by callId if callId is present
    const seenCallIds = new Set<string>();
    callsToFilter = callsToFilter.filter(c => {
      if (c.callId) {
        if (seenCallIds.has(c.callId)) {
          return false;
        }
        seenCallIds.add(c.callId);
      }
      return true;
    });
    
    const isAm = userProfile?.activeRole === 'Account Managers' || userProfile?.activeRole === 'Account Manager' || userProfile?.activeRole === 'account managers';
    if (isAm && userProfile?.displayName) {
        callsToFilter = callsToFilter.filter(c => 
            c.author === userProfile.displayName || 
            c.accountManagerAssigned === userProfile.displayName
        );
    } else if (userProfile?.activeRole !== 'admin' && userProfile?.displayName) {
        callsToFilter = callsToFilter.filter(c => 
            c.author === userProfile.displayName || 
            c.dialerAssigned === userProfile.displayName
        );
    }

    return callsToFilter.filter(call => {
        const callUser = call.author || call.dialerAssigned;
        const userMatch = appliedFilters.user.length === 0 || (callUser && appliedFilters.user.includes(callUser));
        
        let dateMatch = true;
        if (appliedFilters.date?.from) {
            const callDate = new Date(call.date);
            const fromDate = startOfDay(appliedFilters.date.from);
            const toDate = appliedFilters.date.to ? endOfDay(appliedFilters.date.to) : endOfDay(appliedFilters.date.from);
            dateMatch = callDate >= fromDate && callDate <= toDate;
        }
        
        const durationInSeconds = parseDuration(call.duration);
        const durationMatch = () => {
            switch (appliedFilters.duration) {
                case 'under30s': return durationInSeconds < 30;
                case '30s-2min': return durationInSeconds >= 30 && durationInSeconds < 120;
                case 'over2min': return durationInSeconds >= 120;
                case 'none': return durationInSeconds === 0;
                default: return true;
            }
        };

        const leadNameMatch = appliedFilters.leadName ? call.leadName.toLowerCase().includes(appliedFilters.leadName.toLowerCase()) : true;
        const statusMatch = appliedFilters.status.length === 0 || appliedFilters.status.includes(call.leadStatus);
        const bucketMatch = appliedFilters.bucket.length === 0 || (call.leadBucket && appliedFilters.bucket.includes(call.leadBucket));
        
        const reviewedMatch = appliedFilters.reviewed === 'all' || 
                              (appliedFilters.reviewed === 'reviewed' && !!call.review) ||
                              (appliedFilters.reviewed === 'not_reviewed' && !call.review);
                              
        const reviewedByMatch = appliedFilters.reviewedBy.length === 0 || (call.review?.reviewer && appliedFilters.reviewedBy.includes(call.review.reviewer));
        const reviewCategoryMatch = appliedFilters.reviewCategory.length === 0 || (call.review?.category && appliedFilters.reviewCategory.includes(call.review.category));

        const finalUserMatch = userProfile?.activeRole === 'admin' ? userMatch : true;

        return finalUserMatch && dateMatch && durationMatch() && leadNameMatch && statusMatch && bucketMatch && reviewedMatch && reviewedByMatch && reviewCategoryMatch;
    });
  }, [allCalls, appliedFilters, userProfile]);
  
  const sortedCalls = useMemo(() => {
    let sortableItems = [...filteredCalls];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'date') {
            aValue = new Date(a.date).getTime();
            bValue = new Date(b.date).getTime();
        } else if (sortConfig.key === 'duration') {
            aValue = parseDuration(a.duration);
            bValue = parseDuration(b.duration);
        } else {
            aValue = a[sortConfig.key] || '';
            bValue = b[sortConfig.key] || '';
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
  }, [filteredCalls, sortConfig]);

  const requestSort = (key: SortableCallKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortableCallKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  const tabFilteredCalls = useMemo(() => {
    if (activeCallTab === 'callId') {
      return sortedCalls.filter(c => !!c.callId);
    } else {
      return sortedCalls.filter(c => !c.callId);
    }
  }, [sortedCalls, activeCallTab]);

  const uniqueLeadsCount = useMemo(() => {
    return new Set(tabFilteredCalls.map(c => c.leadId)).size;
  }, [tabFilteredCalls]);

  const agentStats = useMemo(() => {
    const counts: Record<string, number> = {};
    tabFilteredCalls.forEach(c => {
      const agent = c.author || c.dialerAssigned || 'Unassigned';
      counts[agent] = (counts[agent] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([agent, count]) => ({ agent, count }))
      .sort((a, b) => b.count - a.count);
  }, [tabFilteredCalls]);

  const activeUsers = useMemo(() => {
    const users = new Set<string>();
    tabFilteredCalls.forEach(call => {
      const user = call.author || call.dialerAssigned || 'Unassigned';
      users.add(user);
    });
    return Array.from(users);
  }, [tabFilteredCalls]);

  const activeBuckets = useMemo(() => {
    const buckets = new Set<string>();
    tabFilteredCalls.forEach(call => {
      const b = call.movedFromBucket || call.leadBucket || 'outbound';
      buckets.add(b);
    });
    return Array.from(buckets);
  }, [tabFilteredCalls]);

  const activeUserBucketCombos = useMemo(() => {
    const combos = new Set<string>();
    tabFilteredCalls.forEach(call => {
      const user = call.author || call.dialerAssigned || 'Unassigned';
      const bucket = call.movedFromBucket || call.leadBucket || 'outbound';
      combos.add(`${user}__${bucket}`);
    });
    return Array.from(combos).map(str => {
      const [user, bucket] = str.split('__');
      return {
        key: `user_bucket_${user}_${bucket}`,
        user,
        bucket,
        label: `${user} (${bucketNames[bucket] || bucket})`
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [tabFilteredCalls]);

  const totalCallsByBucket = useMemo(() => {
    const counts: Record<string, number> = {};
    tabFilteredCalls.forEach(call => {
      const b = call.movedFromBucket || call.leadBucket || 'outbound';
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([bucket, count]) => ({
        bucket,
        label: bucketNames[bucket] || bucket,
        count
      }))
      .sort((a, b) => b.count - a.count);
  }, [tabFilteredCalls]);

  const chartData = useMemo(() => {
    const dailyData: Record<string, { 
      date: string; 
      totalCalls: number; 
      uniqueLeads: Set<string>; 
      users: Record<string, number>;
      buckets: Record<string, number>;
      userBuckets: Record<string, number>;
    }> = {};
    
    tabFilteredCalls.forEach(call => {
      if (!call.date) return;
      const d = new Date(call.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dateDisplay = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const user = call.author || call.dialerAssigned || 'Unassigned';
      const callBucket = call.movedFromBucket || call.leadBucket || 'outbound';
      const comboKey = `user_bucket_${user}_${callBucket}`;
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateDisplay,
          totalCalls: 0,
          uniqueLeads: new Set<string>(),
          users: {},
          buckets: {},
          userBuckets: {}
        };
      }
      
      dailyData[dateKey].totalCalls += 1;
      dailyData[dateKey].uniqueLeads.add(call.leadId);
      dailyData[dateKey].users[user] = (dailyData[dateKey].users[user] || 0) + 1;
      dailyData[dateKey].buckets[callBucket] = (dailyData[dateKey].buckets[callBucket] || 0) + 1;
      dailyData[dateKey].userBuckets[comboKey] = (dailyData[dateKey].userBuckets[comboKey] || 0) + 1;
    });

    const sortedDates = Object.entries(dailyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(entry => entry[1]);

    return sortedDates.map(day => ({
      date: day.date,
      'Unique Customers': day.uniqueLeads.size,
      'Total Calls': day.totalCalls,
      ...Object.fromEntries(Object.entries(day.users).map(([u, c]) => [`user_${u}`, c])),
      ...Object.fromEntries(Object.entries(day.buckets).map(([b, c]) => [`bucket_${b}`, c])),
      ...day.userBuckets
    }));
  }, [tabFilteredCalls]);

  const userBucketChartData = useMemo(() => {
    const userMap: Record<string, Record<string, number>> = {};
    
    activeUsers.forEach(u => {
      userMap[u] = {};
      activeBuckets.forEach(b => {
        userMap[u][`bucket_${b}`] = 0;
      });
    });

    tabFilteredCalls.forEach(call => {
      const user = call.author || call.dialerAssigned || 'Unassigned';
      const bucket = call.movedFromBucket || call.leadBucket || 'outbound';
      if (userMap[user]) {
        userMap[user][`bucket_${bucket}`] = (userMap[user][`bucket_${bucket}`] || 0) + 1;
      }
    });

    return Object.entries(userMap).map(([user, bucketsData]) => ({
      user,
      ...bucketsData
    })).sort((a, b) => {
      const totalA = Object.values(a).reduce((sum: number, val) => typeof val === 'number' ? sum + val : sum, 0);
      const totalB = Object.values(b).reduce((sum: number, val) => typeof val === 'number' ? sum + val : sum, 0);
      return totalB - totalA;
    });
  }, [tabFilteredCalls, activeUsers, activeBuckets]);

  const chartColors = [
    '#095c7b',
    '#0d8ca3',
    '#ff9f43',
    '#10ac84',
    '#ee5253',
    '#5f27cd',
    '#341f97',
    '#f368e0',
  ];

  const bucketColors: Record<string, string> = {
    'outbound': '#095c7b',
    'inbound': '#0d8ca3',
    'nurture': '#ff9f43',
    'field_sales': '#10ac84',
    'unassigned': '#ee5253',
    'n/a': '#94a3b8',
  };

  const paginatedCalls = useMemo(() => {
    const startIndex = (currentPage - 1) * CALLS_PER_PAGE;
    return tabFilteredCalls.slice(startIndex, startIndex + CALLS_PER_PAGE);
  }, [tabFilteredCalls, currentPage]);

  const totalPages = Math.ceil(tabFilteredCalls.length / CALLS_PER_PAGE);
  
  const allUsersOptions: Option[] = useMemo(() => {
      const users = new Set((allCalls || []).map(c => c.author || c.dialerAssigned).filter((x): x is string => !!x));
      return Array.from(users).map(u => ({ value: u, label: u })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allCalls]);

  const allReviewersOptions: Option[] = useMemo(() => {
      const reviewers = new Set((allCalls || []).map(c => c.review?.reviewer).filter((x): x is string => !!x));
      return Array.from(reviewers).map(r => ({ value: r, label: r })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allCalls]);
  
  const leadStatusOptions: Option[] = leadStatuses.map(s => ({ value: s, label: s })).sort((a,b) => a.label.localeCompare(b.label));
  const reviewCategoryOptions: Option[] = reviewCategories.map(c => ({ value: c, label: c })).sort((a,b) => a.label.localeCompare(b.label));
  const bucketOptions: Option[] = Object.entries(bucketNames).map(([value, label]) => ({ value, label })).sort((a,b) => a.label.localeCompare(b.label));

  const transcriptsByCallId = useMemo(() => {
    return allTranscripts.reduce((acc, transcript) => {
        if (transcript.callId) {
            acc[transcript.callId] = transcript;
        }
        return acc;
    }, {} as Record<string, Transcript>);
  }, [allTranscripts]);


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
    const headers = ['Lead Name', 'User', 'Status', 'Bucket', 'Call ID', 'Date', 'Time', 'Duration', 'Notes', 'Reviewed By', 'Review Notes', 'Review Category'];
    const rows = sortedCalls.map(call => [
        escapeCsvCell(call.leadName),
        escapeCsvCell(call.author || call.dialerAssigned || 'Unassigned'),
        escapeCsvCell(call.leadStatus),
        escapeCsvCell(bucketNames[call.leadBucket || ''] || call.leadBucket || 'N/A'),
        escapeCsvCell(call.callId),
        escapeCsvCell(new Date(call.date).toLocaleDateString()),
        escapeCsvCell(new Date(call.date).toLocaleTimeString()),
        escapeCsvCell(call.duration || 'N/A'),
        escapeCsvCell(call.notes),
        escapeCsvCell(call.review?.reviewer || ''),
        escapeCsvCell(call.review?.notes || ''),
        escapeCsvCell(call.review?.category || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `calls_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGetTranscriptForCall = async (call: CallActivity) => {
    if (!call.callId || !user?.displayName) return;
    setFetchingTranscriptId(call.callId);
    try {
        const result = await getCallTranscriptByCallId({
            callId: call.callId,
            leadId: call.leadId,
            leadAuthor: user.displayName
        });

        if (result.transcriptFound) {
            fetchCallsData();
            fetchInitialData(); // Refetch all data to get the new transcript
        } else {
            toast({ variant: "destructive", title: "Failed", description: result.error || "Could not retrieve transcript." });
        }
    } catch (error: any) {
        console.error("Error fetching transcript:", error);
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setFetchingTranscriptId(null);
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewingCall || !reviewNotes || !reviewCategory || !user?.displayName) return;
    setIsSubmittingReview(true);
    try {
      await addCallReview(reviewingCall.leadId, reviewingCall.id, {
        reviewer: user.displayName,
        notes: reviewNotes,
        category: reviewCategory
      });
      toast({ title: "Success", description: "Review submitted successfully." });
      // Optimistically update UI
      setAllCalls(prev => prev.map(c => 
        c.id === reviewingCall.id 
        ? { ...c, isReviewed: true, review: { id: '', date: new Date().toISOString(), reviewer: user.displayName!, notes: reviewNotes, category: reviewCategory } } 
        : c
      ));
      setReviewingCall(null);
      setReviewNotes("");
      setReviewCategory("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to submit review." });
    } finally {
      setIsSubmittingReview(false);
    }
  };


  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  const hasActiveFilters = Object.values(appliedFilters).some(val => (Array.isArray(val) ? val.length > 0 : val && val !== 'all'));

  const ReviewCategoryBadge = ({ category }: { category?: ReviewCategory }) => {
    if (!category) return <span className="text-muted-foreground">N/A</span>;
    const colorClass = {
        'Good Example': "bg-green-100 text-green-800 border-green-200",
        'Coaching Opportunity': "bg-yellow-100 text-yellow-800 border-yellow-200",
        'Needs Improvement': "bg-red-100 text-red-800 border-red-200",
    }[category];
    return <Badge variant="outline" className={colorClass}>{category}</Badge>;
  };
  
  const renderCallRow = (call: CallActivity) => {
    const transcript = call.callId ? transcriptsByCallId[call.callId] : null;
    return (
        <TableRow key={call.id}>
            <TableCell className="text-left w-[80px]">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                        {call.callId && (
                            <DropdownMenuItem onClick={() => window.open(`https://assets.aircall.io/calls/${call.callId}/recording/info`, '_blank')} className="cursor-pointer flex items-center gap-2">
                                <Voicemail className="h-4 w-4" />
                                <span>Recording</span>
                            </DropdownMenuItem>
                        )}
                        {call.callId && (
                            transcript ? (
                                <DropdownMenuItem onClick={() => { setSelectedTranscript(transcript); setIsViewerOpen(true); }} className="cursor-pointer flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    <span>Transcript</span>
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem 
                                    onClick={() => handleGetTranscriptForCall(call)} 
                                    disabled={fetchingTranscriptId === call.callId}
                                    className="cursor-pointer flex items-center gap-2"
                                >
                                    {fetchingTranscriptId === call.callId ? <Loader className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                                    <span>Fetch Transcript</span>
                                </DropdownMenuItem>
                            )
                        )}
                        {call.review && (
                            <DropdownMenuItem onClick={() => setViewingReview(call.review!)} className="cursor-pointer flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                <span>View Review</span>
                            </DropdownMenuItem>
                        )}
                        {userProfile?.activeRole === 'admin' && activeCallTab !== 'initiated' && (
                            <DropdownMenuItem 
                                onClick={() => {
                                    setReviewingCall(call);
                                    setReviewNotes(call.review?.notes || "");
                                    setReviewCategory(call.review?.category || "");
                                }} 
                                className="cursor-pointer flex items-center gap-2"
                            >
                                <Edit className="h-4 w-4" />
                                <span>{call.isReviewed ? 'Edit Review' : 'Add Review'}</span>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
            <TableCell className="max-w-[12rem] whitespace-normal break-words">
                <Button variant="link" className="p-0 h-auto whitespace-normal text-left break-words" onClick={() => window.open(`/leads/${call.leadId}`, '_blank')}>
                {call.leadName}
                </Button>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {call.author || call.dialerAssigned || 'Unassigned'}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col gap-1">
                    <div className="w-fit">
                        <LeadStatusBadge status={call.leadStatus} />
                    </div>
                    {call.movedFromStatus && call.movedToStatus && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap bg-indigo-50/50 border border-indigo-100 rounded px-1.5 py-0.5 w-fit">
                            <span className="font-semibold text-indigo-700">Moved:</span>
                            <span>{call.movedFromStatus}</span>
                            <span>➔</span>
                            <span>{call.movedToStatus}</span>
                        </div>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="capitalize whitespace-nowrap w-fit">
                        {bucketNames[call.leadBucket || ''] || call.leadBucket || 'N/A'}
                    </Badge>
                    {call.movedFromBucket && call.movedToBucket && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap bg-amber-50/50 border border-amber-100 rounded px-1.5 py-0.5 w-fit">
                            <span className="font-semibold text-amber-700">Moved:</span>
                            <span>{bucketNames[call.movedFromBucket] || call.movedFromBucket}</span>
                            <span>➔</span>
                            <span>{bucketNames[call.movedToBucket] || call.movedToBucket}</span>
                        </div>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2 font-medium">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span>{call.callId || 'N/A'}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col text-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(call.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(call.date).toLocaleTimeString()}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{call.duration || 'N/A'}</span>
                </div>
            </TableCell>

            <TableCell>
                {call.review?.reviewer ? (
                    <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {call.review.reviewer}
                    </div>
                ) : (
                    <span className="text-muted-foreground">N/A</span>
                )}
            </TableCell>
            <TableCell>
                <ReviewCategoryBadge category={call.review?.category} />
            </TableCell>
        </TableRow>
    );
  };

  return (
    <>
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">All Calls</h1>
        <p className="text-muted-foreground">Review all call activities.</p>
      </header>


       <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
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
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="leadName">Lead Name</Label>
                        <Input id="leadName" value={pendingFilters.leadName} onChange={(e) => handlePendingFilterChange('leadName', e.target.value)} />
                    </div>
                    {userProfile?.activeRole === 'admin' && (
                       <>
                        <div className="space-y-2">
                            <Label htmlFor="user">User</Label>
                             <MultiSelectCombobox
                                options={allUsersOptions}
                                selected={pendingFilters.user}
                                onSelectedChange={(selected) => handlePendingFilterChange('user', selected)}
                                placeholder="Select users..."
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="reviewedBy">Reviewed By</Label>
                             <MultiSelectCombobox
                                options={allReviewersOptions}
                                selected={pendingFilters.reviewedBy}
                                onSelectedChange={(selected) => handlePendingFilterChange('reviewedBy', selected)}
                                placeholder="Select reviewers..."
                            />
                        </div>
                       </>
                    )}
                     <div className="space-y-2">
                        <Label htmlFor="status">Lead Status</Label>
                        <MultiSelectCombobox
                            options={leadStatusOptions}
                            selected={pendingFilters.status}
                            onSelectedChange={(selected) => handlePendingFilterChange('status', selected)}
                            placeholder="Select statuses..."
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="bucket">Bucket</Label>
                        <MultiSelectCombobox
                            options={bucketOptions}
                            selected={pendingFilters.bucket}
                            onSelectedChange={(selected) => handlePendingFilterChange('bucket', selected)}
                            placeholder="Select buckets..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reviewed">Review Status</Label>
                        <Select value={pendingFilters.reviewed} onValueChange={(value) => handlePendingFilterChange('reviewed', value)}>
                            <SelectTrigger id="reviewed">
                                <SelectValue placeholder="Select review status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="reviewed">Reviewed</SelectItem>
                                <SelectItem value="not_reviewed">Not Reviewed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reviewCategory">Review Category</Label>
                        <MultiSelectCombobox
                            options={reviewCategoryOptions}
                            selected={pendingFilters.reviewCategory}
                            onSelectedChange={(selected) => handlePendingFilterChange('reviewCategory', selected)}
                            placeholder="Select categories..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quick-date">Predefined Date Range</Label>
                        <Select onValueChange={(value) => handlePendingFilterChange('date', getQuickDateRange(value))}>
                            <SelectTrigger id="quick-date">
                                <SelectValue placeholder="Quick select..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Today">Today</SelectItem>
                                <SelectItem value="Yesterday">Yesterday</SelectItem>
                                <SelectItem value="todayandyesterday">Today & Yesterday</SelectItem>
                                <SelectItem value="This Week">This Week</SelectItem>
                                <SelectItem value="Last Week">Last Week</SelectItem>
                                <SelectItem value="This Month">This Month</SelectItem>
                                <SelectItem value="Last Month">Last Month</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Custom Date Range</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="date"
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {pendingFilters.date?.from ? (
                                  pendingFilters.date.to ? (
                                    <>
                                      {format(pendingFilters.date.from, "LLL d, y")} -{" "}
                                      {format(pendingFilters.date.to, "LLL d, y")}
                                    </>
                                  ) : (
                                    format(pendingFilters.date.from, "LLL d, y")
                                  )
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 flex" align="start">
                                <div className="flex flex-col space-y-2 border-r p-2">
                                  <Button variant="ghost" className="justify-start" onClick={() => handlePendingFilterChange('date', getQuickDateRange('Today'))}>Today</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handlePendingFilterChange('date', getQuickDateRange('Yesterday'))}>Yesterday</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handlePendingFilterChange('date', getQuickDateRange('todayandyesterday'))}>Today & Yesterday</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handlePendingFilterChange('date', getQuickDateRange('This Week'))}>This Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handlePendingFilterChange('date', getQuickDateRange('Last Week'))}>Last Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handlePendingFilterChange('date', getQuickDateRange('This Month'))}>This Month</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handlePendingFilterChange('date', getQuickDateRange('Last Month'))}>Last Month</Button>
                                </div>
                                <CalendarPicker
                                  mode="range"
                                  selected={pendingFilters.date}
                                  onSelect={(date) => handlePendingFilterChange('date', date)}
                                  initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="duration">Duration</Label>
                        <Select value={pendingFilters.duration} onValueChange={(value) => handlePendingFilterChange('duration', value)}>
                            <SelectTrigger id="duration">
                                <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Durations</SelectItem>
                                <SelectItem value="under30s">Under 30s</SelectItem>
                                <SelectItem value="30s-2min">30s - 2min</SelectItem>
                                <SelectItem value="over2min">Over 2min</SelectItem>
                                <SelectItem value="none">No Duration</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-full flex flex-wrap gap-2 pt-2 justify-end border-t border-slate-100 mt-2">
                        {hasActiveFilters && (
                            <Button variant="ghost" onClick={clearFilters}>
                                <X className="mr-2 h-4 w-4" /> Clear Filters
                            </Button>
                        )}
                        <Button onClick={applyFilters} className="bg-[#095c7b] hover:bg-[#074b64] text-white">
                            Apply Filter
                        </Button>
                    </div>
                </CardContent>
            </CollapsibleContent>
          </Card>
      </Collapsible>

      {/* Stats & Analytics Reporting Section (Moved below filters) */}
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{tabFilteredCalls.length}</div>
              <p className="text-xs text-muted-foreground">in current date range / filters</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Unique Leads & Companies</p>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{uniqueLeadsCount}</div>
              <p className="text-xs text-muted-foreground">distinct accounts contacted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Calls by Bucket</p>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="max-h-20 overflow-y-auto space-y-1 mt-1 pr-2">
                {totalCallsByBucket.length > 0 ? (
                  totalCallsByBucket.map(({ bucket, label, count }) => (
                    <div key={bucket} className="flex justify-between items-center text-xs">
                      <span className="font-medium truncate max-w-[150px] capitalize">{label}</span>
                      <Badge variant="secondary" className="px-1.5 py-0.5 bg-[#095c7b] text-white rounded-full font-bold">{count}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">No bucket data available</div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Agent Call Breakdown</p>
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="max-h-20 overflow-y-auto space-y-1 mt-1 pr-2">
                {agentStats.length > 0 ? (
                  agentStats.map(({ agent, count }) => (
                    <div key={agent} className="flex justify-between items-center text-xs">
                      <span className="font-medium truncate max-w-[150px]">{agent}</span>
                      <Badge variant="secondary" className="px-1.5 py-0.5">{count}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">No call data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Graphs (Two Side-by-Side on large screens) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Left Chart: Call Analytics Over Time */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Call Analytics Over Time</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip formatter={(value, name) => [value, name]} />
                    <ChartLegend />
                    <Bar
                      dataKey="Total Calls"
                      fill="#095c7b"
                      name="Total Calls"
                    >
                      <LabelList dataKey="Total Calls" position="top" className="fill-slate-700 text-[10px] font-semibold" />
                    </Bar>
                    <Line
                      type="monotone"
                      dataKey="Unique Customers"
                      stroke="#ef5350"
                      strokeWidth={3}
                      activeDot={{ r: 8 }}
                      name="Unique Customers"
                    >
                      <LabelList dataKey="Unique Customers" position="top" className="fill-red-600 text-[10px] font-semibold" />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  No data available for the selected filters.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Chart: Calls by Bucket by User */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Calls by Bucket by User</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              {userBucketChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userBucketChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" />
                    <XAxis dataKey="user" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip formatter={(value, name) => [value, bucketNames[String(name).replace('bucket_', '')] || String(name).replace('bucket_', '')]} />
                    <ChartLegend formatter={(value) => bucketNames[String(value).replace('bucket_', '')] || String(value).replace('bucket_', '')} />
                    {activeBuckets.map((bucket, idx) => (
                      <Bar
                        key={bucket}
                        dataKey={`bucket_${bucket}`}
                        stackId="a"
                        fill={bucketColors[bucket.toLowerCase()] || chartColors[idx % chartColors.length]}
                        name={`bucket_${bucket}`}
                      >
                        <LabelList dataKey={`bucket_${bucket}`} position="top" className="fill-slate-700 text-[10px] font-semibold" />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  No data available for the selected filters.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeCallTab} onValueChange={(val) => { setActiveCallTab(val as any); setCurrentPage(1); }} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-slate-100 p-1">
          <TabsTrigger value="callId" className="font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-[#095c7b]">
            Calls with Call ID
          </TabsTrigger>
          <TabsTrigger value="initiated" className="font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-[#095c7b]">
            Initiated Calls
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="w-full max-w-full overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
                <CardTitle>Call History</CardTitle>
                <Badge variant="secondary">{tabFilteredCalls.length} call(s)</Badge>
            </div>
            {userProfile?.activeRole === 'admin' && (
                <Button onClick={handleExport} variant="outline" size="sm" disabled={tabFilteredCalls.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left w-[80px]">Actions</TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('leadName')} className="group -ml-4">Lead{getSortIndicator('leadName')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('dialerAssigned')} className="group -ml-4">User{getSortIndicator('dialerAssigned')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('leadStatus')} className="group -ml-4">Status{getSortIndicator('leadStatus')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('leadBucket')} className="group -ml-4">Bucket{getSortIndicator('leadBucket')}</Button></TableHead>
                  <TableHead>Call ID</TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('date')} className="group -ml-4">Date & Time{getSortIndicator('date')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('duration')} className="group -ml-4">Duration{getSortIndicator('duration')}</Button></TableHead>
                  <TableHead>Reviewed By</TableHead>
                  <TableHead>Review Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : paginatedCalls.length > 0 ? (
                  paginatedCalls.map(renderCallRow)
                ) : (
                  <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                          No calls found.
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
    
    <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Call Transcript</DialogTitle>
            </DialogHeader>
            {selectedTranscript && (
                <TranscriptViewer
                    transcript={selectedTranscript}
                    leadId={allCalls.find(c => c.callId === selectedTranscript.callId)?.leadId || ''}
                    leadName={allCalls.find(c => c.callId === selectedTranscript.callId)?.leadName || 'Unknown'}
                    onAnalysisComplete={(analysis) => {
                        // Optimistically update the UI
                        const updatedTranscripts = allTranscripts.map(t =>
                            t.id === selectedTranscript.id ? { ...t, analysis } : t
                        );
                        setAllTranscripts(updatedTranscripts);
                    }}
                />
            )}
        </DialogContent>
    </Dialog>

    <Dialog open={!!reviewingCall} onOpenChange={(open) => { if(!open) setReviewingCall(null); }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Review Call</DialogTitle>
                <DialogDescription>Add feedback for the call with {reviewingCall?.leadName}.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                  <Label htmlFor="review-category">Category</Label>
                  <Select value={reviewCategory} onValueChange={(value) => setReviewCategory(value as ReviewCategory)}>
                      <SelectTrigger id="review-category">
                          <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                          {reviewCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="review-notes">Review Notes</Label>
                  <Textarea 
                      id="review-notes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Enter your feedback here..."
                      rows={5}
                  />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setReviewingCall(null)}>Cancel</Button>
                <Button onClick={handleSubmitReview} disabled={isSubmittingReview || !reviewNotes || !reviewCategory}>
                    {isSubmittingReview ? <Loader/> : 'Submit Review'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

     <Dialog open={!!viewingReview} onOpenChange={(open) => { if(!open) setViewingReview(null); }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Call Review</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
               <div>
                 <p className="text-sm font-semibold">Reviewer</p>
                 <p className="text-sm text-muted-foreground">{viewingReview?.reviewer}</p>
               </div>
                <div>
                 <p className="text-sm font-semibold">Date</p>
                 <p className="text-sm text-muted-foreground">{viewingReview ? new Date(viewingReview.date).toLocaleString() : ''}</p>
               </div>
                <div>
                 <p className="text-sm font-semibold">Category</p>
                 <ReviewCategoryBadge category={viewingReview?.category} />
               </div>
               <div>
                 <p className="text-sm font-semibold">Notes</p>
                 <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReview?.notes}</p>
               </div>
            </div>
            <DialogFooter>
                <Button onClick={() => setViewingReview(null)}>Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    </>
  )
}

    
