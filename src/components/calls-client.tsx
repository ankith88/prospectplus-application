
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
import { Phone, Calendar, Clock, Filter, SlidersHorizontal, User, Hash, X, Voicemail, Download, FileText, MessageSquare, Edit, Users, ArrowUpDown } from 'lucide-react'
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


type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string };
const reviewCategories: ReviewCategory[] = ['Good Example', 'Coaching Opportunity', 'Needs Improvement'];

type SortableCallKeys = 'leadName' | 'dialerAssigned' | 'leadStatus' | 'date' | 'duration';

const CALLS_PER_PAGE = 50;

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


  const [filters, setFilters] = useState({
    user: [] as string[],
    date: undefined as DateRange | undefined,
    duration: 'all',
    leadName: '',
    status: [] as string[],
    reviewed: 'all' as 'all' | 'reviewed' | 'not_reviewed',
    reviewedBy: [] as string[],
    reviewCategory: [] as string[],
  });

  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedCalls, fetchedTranscripts, fetchedUsers] = await Promise.all([
        getAllCallActivities(),
        getAllTranscripts(),
        getAllUsers(),
      ]);
      setAllCalls(fetchedCalls);
      setAllTranscripts(fetchedTranscripts);
       const dialers = fetchedUsers
        .filter(u => u.role !== 'admin' && u.firstName && u.lastName)
        .map(u => ({ ...u, displayName: `${u.firstName} ${u.lastName}`.trim() }));
      setAllDialers(dialers);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch calls or transcripts.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    
    if(user) {
        fetchData();
    }
  }, [user, authLoading, router]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1);
  };
  
  const clearFilters = () => {
    setFilters({ user: [], date: undefined, duration: 'all', leadName: '', status: [], reviewed: 'all', reviewedBy: [], reviewCategory: [] });
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
    // Group calls by callId to ensure uniqueness
    const uniqueCallsMap = new Map<string, CallActivity>();
    allCalls.forEach(call => {
        if (call.callId) {
            // Keep the most recent record for a given callId if duplicates exist
            const existing = uniqueCallsMap.get(call.callId);
            if (!existing || new Date(call.date) > new Date(existing.date)) {
                uniqueCallsMap.set(call.callId, call);
            }
        }
    });

    let callsToFilter = Array.from(uniqueCallsMap.values());
    
    if (userProfile?.role !== 'admin' && userProfile?.displayName) {
        callsToFilter = callsToFilter.filter(c => c.dialerAssigned === userProfile.displayName);
    }

    return callsToFilter.filter(call => {
        const userMatch = filters.user.length === 0 || (call.dialerAssigned && filters.user.includes(call.dialerAssigned));
        
        let dateMatch = true;
        if (filters.date?.from) {
            const callDate = new Date(call.date);
            const fromDate = startOfDay(filters.date.from);
            const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
            dateMatch = callDate >= fromDate && callDate <= toDate;
        }
        
        const durationInSeconds = parseDuration(call.duration);
        const durationMatch = () => {
            switch (filters.duration) {
                case 'under30s': return durationInSeconds < 30;
                case '30s-2min': return durationInSeconds >= 30 && durationInSeconds < 120;
                case 'over2min': return durationInSeconds >= 120;
                case 'none': return durationInSeconds === 0;
                default: return true;
            }
        };

        const leadNameMatch = filters.leadName ? call.leadName.toLowerCase().includes(filters.leadName.toLowerCase()) : true;
        const statusMatch = filters.status.length === 0 || filters.status.includes(call.leadStatus);
        
        const reviewedMatch = filters.reviewed === 'all' || 
                              (filters.reviewed === 'reviewed' && !!call.review) ||
                              (filters.reviewed === 'not_reviewed' && !call.review);
                              
        const reviewedByMatch = filters.reviewedBy.length === 0 || (call.review?.reviewer && filters.reviewedBy.includes(call.review.reviewer));
        const reviewCategoryMatch = filters.reviewCategory.length === 0 || (call.review?.category && filters.reviewCategory.includes(call.review.category));

        const finalUserMatch = userProfile?.role === 'admin' ? userMatch : true;

        return finalUserMatch && dateMatch && durationMatch() && leadNameMatch && statusMatch && reviewedMatch && reviewedByMatch && reviewCategoryMatch;
    });
  }, [allCalls, filters, userProfile]);
  
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

  const paginatedCalls = useMemo(() => {
    const startIndex = (currentPage - 1) * CALLS_PER_PAGE;
    return sortedCalls.slice(startIndex, startIndex + CALLS_PER_PAGE);
  }, [sortedCalls, currentPage]);

  const totalPages = Math.ceil(sortedCalls.length / CALLS_PER_PAGE);
  
  const allUsersOptions: Option[] = useMemo(() => {
      const users = new Set(allCalls.map(c => c.dialerAssigned).filter(Boolean));
      return Array.from(users as string[]).map(u => ({ value: u, label: u }));
  }, [allCalls]);

  const allReviewersOptions: Option[] = useMemo(() => {
      const reviewers = new Set(allCalls.map(c => c.review?.reviewer).filter(Boolean));
      return Array.from(reviewers as string[]).map(r => ({ value: r, label: r }));
  }, [allCalls]);
  
  const leadStatusOptions: Option[] = (['New', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'LPO Review', 'Qualified', 'Pre Qualified', 'Unqualified', 'Won', 'Lost', 'Trialing ShipMate', 'Reschedule'] as LeadStatus[]).map(s => ({ value: s, label: s }));
  const reviewCategoryOptions: Option[] = reviewCategories.map(c => ({ value: c, label: c }));

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
    const headers = ['Lead Name', 'User', 'Status', 'Call ID', 'Date', 'Time', 'Duration', 'Notes', 'Reviewed By', 'Review Notes', 'Review Category'];
    const rows = sortedCalls.map(call => [
        escapeCsvCell(call.leadName),
        escapeCsvCell(call.dialerAssigned || 'Unassigned'),
        escapeCsvCell(call.leadStatus),
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
            toast({ title: "Success", description: "Transcript fetched and will appear shortly." });
            fetchData(); // Refetch all data to get the new transcript
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

  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) ? val.length > 0 : val && val !== 'all'));

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
            <TableCell>
                <Button variant="link" className="p-0 h-auto" onClick={() => window.open(`/leads/${call.leadId}`, '_blank')}>
                {call.leadName}
                </Button>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {call.dialerAssigned || 'Unassigned'}
                </div>
            </TableCell>
            <TableCell>
                <LeadStatusBadge status={call.leadStatus} />
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
            <TableCell className="min-w-[20rem] whitespace-pre-wrap">
                {call.notes}
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
            <TableCell>
                <div className="flex flex-col sm:flex-row gap-2">
                {call.callId && (
                    <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(`https://assets.aircall.io/calls/${call.callId}/recording/info`, '_blank')}>
                    <Voicemail className="mr-2 h-4 w-4" />
                    Recording
                    </Button>
                )}
                {call.callId && (
                    transcript ? (
                        <Button variant="outline" size="sm" onClick={() => { setSelectedTranscript(transcript); setIsViewerOpen(true); }}>
                            <FileText className="mr-2 h-4 w-4" />
                            Transcript
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => handleGetTranscriptForCall(call)} disabled={fetchingTranscriptId === call.callId}>
                            {fetchingTranscriptId === call.callId ? <Loader /> : <Download className="mr-2 h-4 w-4" />}
                            Fetch
                        </Button>
                    )
                )}
                {call.review && (
                <Button variant="secondary" size="sm" onClick={() => setViewingReview(call.review!)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    View Review
                </Button>
                )}
                {userProfile?.role === 'admin' && (
                    <Button variant="outline" size="sm" onClick={() => {
                        setReviewingCall(call);
                        setReviewNotes(call.review?.notes || "");
                        setReviewCategory(call.review?.category || "");
                    }}>
                        <Edit className="mr-2 h-4 w-4" />
                        {call.isReviewed ? 'Edit Review' : 'Add Review'}
                    </Button>
                )}
                </div>
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
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="leadName">Lead Name</Label>
                        <Input id="leadName" value={filters.leadName} onChange={(e) => handleFilterChange('leadName', e.target.value)} />
                    </div>
                    {userProfile?.role === 'admin' && (
                       <>
                        <div className="space-y-2">
                            <Label htmlFor="user">User</Label>
                             <MultiSelectCombobox
                                options={allUsersOptions}
                                selected={filters.user}
                                onSelectedChange={(selected) => handleFilterChange('user', selected)}
                                placeholder="Select users..."
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="reviewedBy">Reviewed By</Label>
                             <MultiSelectCombobox
                                options={allReviewersOptions}
                                selected={filters.reviewedBy}
                                onSelectedChange={(selected) => handleFilterChange('reviewedBy', selected)}
                                placeholder="Select reviewers..."
                            />
                        </div>
                       </>
                    )}
                     <div className="space-y-2">
                        <Label htmlFor="status">Lead Status</Label>
                        <MultiSelectCombobox
                            options={leadStatusOptions}
                            selected={filters.status}
                            onSelectedChange={(selected) => handleFilterChange('status', selected)}
                            placeholder="Select statuses..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reviewed">Review Status</Label>
                        <Select value={filters.reviewed} onValueChange={(value) => handleFilterChange('reviewed', value)}>
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
                            selected={filters.reviewCategory}
                            onSelectedChange={(selected) => handleFilterChange('reviewCategory', selected)}
                            placeholder="Select categories..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
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
                                      {format(filters.date.from, "LLL d, y")} -{" "}
                                      {format(filters.date.to, "LLL d, y")}
                                    </>
                                  ) : (
                                    format(filters.date.from, "LLL d, y")
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
                                <CalendarPicker
                                  mode="range"
                                  selected={filters.date}
                                  onSelect={(date) => handleFilterChange('date', date)}
                                  initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="duration">Duration</Label>
                        <Select value={filters.duration} onValueChange={(value) => handleFilterChange('duration', value)}>
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
            <div className="flex items-center gap-4">
                <CardTitle>Call History</CardTitle>
                <Badge variant="secondary">{sortedCalls.length} call(s)</Badge>
            </div>
            {userProfile?.role === 'admin' && (
                <Button onClick={handleExport} variant="outline" size="sm" disabled={sortedCalls.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('leadName')} className="group -ml-4">Lead{getSortIndicator('leadName')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('dialerAssigned')} className="group -ml-4">User{getSortIndicator('dialerAssigned')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('leadStatus')} className="group -ml-4">Status{getSortIndicator('leadStatus')}</Button></TableHead>
                  <TableHead>Call ID</TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('date')} className="group -ml-4">Date & Time{getSortIndicator('date')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('duration')} className="group -ml-4">Duration{getSortIndicator('duration')}</Button></TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Reviewed By</TableHead>
                  <TableHead>Review Category</TableHead>
                  <TableHead>Actions</TableHead>
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
