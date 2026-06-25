

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
import type { Transcript, Lead } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Phone, Calendar, Clock, FileText, DownloadCloud, Hash, X, Filter, SlidersHorizontal, User, Voicemail, Download } from 'lucide-react'
import { getUserCallTranscripts } from '@/ai/flows/get-user-call-transcripts-flow'
import { useToast } from '@/hooks/use-toast'
import { getAllTranscripts } from '@/services/firebase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { TranscriptViewer } from '@/components/transcript-viewer'
import { getQuickDateRange } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getLeadsTool } from '@/ai/flows/get-leads-tool'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'

export default function TranscriptsPage() {
  const [allTranscripts, setAllTranscripts] = useState<Transcript[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [filters, setFilters] = useState({
    leadName: '',
    phoneNumber: '',
    callId: '',
    date: undefined as DateRange | undefined,
  });

  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const hasAccess = userProfile?.activeRole && ['admin', 'Marketing Admin', 'Marketing Manager', 'user', 'Sales Manager', 'Account Manager', 'Account Managers', 'account managers'].includes(userProfile.activeRole);

  const fetchTranscripts = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const fetchedTranscripts = await getAllTranscripts();

      const isAm = userProfile?.activeRole === 'Account Managers' || userProfile?.activeRole === 'Account Manager' || userProfile?.activeRole === 'account managers';
      if (userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Marketing Admin' || userProfile?.activeRole === 'Marketing Manager' || isAm) {
        setAllTranscripts(fetchedTranscripts);
      } else {
        const myTranscripts = fetchedTranscripts.filter(t => t.author === user.displayName);
        setAllTranscripts(myTranscripts);
      }

    } catch (error) {
      console.error("Failed to fetch transcripts:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch transcripts.' });
    } finally {
      setLoading(false);
    }
  }

  const fetchLeads = async () => {
      try {
          const leads = await getLeadsTool({ summary: true });
          setAllLeads(leads);
      } catch (error) {
          console.error("Failed to fetch leads:", error);
      }
  }

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    if (authLoading) return;
    
    fetchTranscripts();
    fetchLeads();

  }, [user, userProfile, authLoading, router, toast]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string | DateRange | undefined) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ leadName: '', phoneNumber: '', callId: '', date: undefined });
  };

  const getLeadByPhoneNumber = (phoneNumber: string) => {
      if (!phoneNumber) return null;
      return allLeads.find(lead => lead.customerPhone === phoneNumber);
  }
  
  const filteredTranscripts = useMemo(() => {
    const isAm = userProfile?.activeRole === 'Account Managers' || userProfile?.activeRole === 'Account Manager' || userProfile?.activeRole === 'account managers';

    return allTranscripts.filter(transcript => {
        const lead = getLeadByPhoneNumber(transcript.phoneNumber || '');
        
        if (isAm) {
            const isAuthor = transcript.author === user?.displayName || transcript.author === userProfile?.displayName;
            const isAmLead = lead && lead.accountManagerAssigned === userProfile?.displayName;
            if (!isAuthor && !isAmLead) return false;
        }

        const phoneMatch = filters.phoneNumber ? (transcript.phoneNumber || '').includes(filters.phoneNumber) : true;
        const callIdMatch = filters.callId ? (transcript.callId || '').includes(filters.callId) : true;
        const transcriptDate = new Date(transcript.date);
        const dateMatch = filters.date?.from ? (transcriptDate >= filters.date.from && transcriptDate <= (filters.date.to || filters.date.from)) : true;
        const leadNameMatch = filters.leadName ? lead?.companyName.toLowerCase().includes(filters.leadName.toLowerCase()) : true;

        return phoneMatch && callIdMatch && dateMatch && leadNameMatch;
    });
  }, [allTranscripts, filters, allLeads, userProfile, user]);

  const handleSyncTranscripts = async () => {
    if (!user?.displayName || !userProfile?.aircallUserId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not identify user or AirCall User ID.' });
        return;
    }
    try {
        setIsSyncing(true);
        const result = await getUserCallTranscripts({ 
            userDisplayName: user.displayName,
            aircallUserId: userProfile.aircallUserId
        });
        
        if (result.error) {
            toast({ variant: 'destructive', title: 'Sync Failed', description: result.error });
        } else if (result.newTranscriptsCount > 0) {
            toast({ title: 'Success', description: `Synced ${result.newTranscriptsCount} new transcript(s).` });
            fetchTranscripts(); // Re-fetch all to get the latest
        } else {
            toast({ title: 'No New Transcripts', description: 'No new transcripts were found to sync.' });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'An unknown error occurred.' });
    } finally {
        setIsSyncing(false);
    }
  }

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

  const formatTranscriptContent = (content: string): string => {
    try {
        const utterances = JSON.parse(content);
        if (Array.isArray(utterances)) {
            return utterances.map(u => `${u.speaker || u.participant_type}: ${u.text}`).join('\n');
        }
        return content;
    } catch (e) {
        return content; // Return as is if not a valid JSON
    }
  };

  const handleExport = () => {
    const headers = ['Lead Name', 'Phone Number', 'User', 'Call ID', 'Date', 'Time', 'Transcript'];
    const rows = filteredTranscripts.map(transcript => {
        const lead = getLeadByPhoneNumber(transcript.phoneNumber || '');
        return [
            escapeCsvCell(lead?.companyName || 'Unknown'),
            escapeCsvCell(transcript.phoneNumber),
            escapeCsvCell(transcript.author),
            escapeCsvCell(transcript.callId),
            escapeCsvCell(new Date(transcript.date).toLocaleDateString()),
            escapeCsvCell(new Date(transcript.date).toLocaleTimeString()),
            escapeCsvCell(formatTranscriptContent(transcript.content)),
        ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `transcripts_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  if (loading || authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page. Please contact Ankith Ravindran if you need access.</p>
      </div>
    );
  }

  const hasActiveFilters = Object.values(filters).some(val => val);

  return (
    <>
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">All Transcripts</h1>
            <p className="text-muted-foreground">Review call transcripts. {(userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Marketing Admin' || userProfile?.activeRole === 'Marketing Manager') ? 'Showing all transcripts.' : (userProfile?.activeRole === 'Account Managers' || userProfile?.activeRole === 'Account Manager' || userProfile?.activeRole === 'account managers') ? 'Showing transcripts for your assigned leads.' : 'Showing your transcripts.'}</p>
        </div>
        <Button onClick={handleSyncTranscripts} disabled={isSyncing}>
            {isSyncing ? <Loader/> : <DownloadCloud className="mr-2 h-4 w-4" />}
            {isSyncing ? 'Syncing...' : 'Sync My Transcripts'}
        </Button>
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
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="leadName">Lead Name</Label>
                        <Input id="leadName" value={filters.leadName} onChange={(e) => handleFilterChange('leadName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input id="phoneNumber" value={filters.phoneNumber} onChange={(e) => handleFilterChange('phoneNumber', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="callId">Call ID</Label>
                        <Input id="callId" value={filters.callId} onChange={(e) => handleFilterChange('callId', e.target.value)} />
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
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', getQuickDateRange('Today'))}>Today</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', getQuickDateRange('Yesterday'))}>Yesterday</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', getQuickDateRange('This Week'))}>This Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', getQuickDateRange('Last Week'))}>Last Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', getQuickDateRange('This Month'))}>This Month</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', getQuickDateRange('Last Month'))}>Last Month</Button>
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
                     {hasActiveFilters && (
                        <div className="space-y-2">
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
              <Badge variant="secondary">{filteredTranscripts.length} transcript(s)</Badge>
            </div>
            {(userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Marketing Admin' || userProfile?.activeRole === 'Marketing Manager') && (
                <Button onClick={handleExport} variant="outline" size="sm" disabled={filteredTranscripts.length === 0}>
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
                  <TableHead>Lead / Phone Number</TableHead>
                  <TableHead className="hidden md:table-cell">User</TableHead>
                  <TableHead className="hidden sm:table-cell">Call ID</TableHead>
                  <TableHead className="hidden sm:table-cell">Date & Time</TableHead>
                  <TableHead>Transcript</TableHead>
                  <TableHead>Recording</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : filteredTranscripts.length > 0 ? (
                  filteredTranscripts.map((transcript) => {
                    const lead = getLeadByPhoneNumber(transcript.phoneNumber || '');
                    return (
                    <TableRow key={transcript.id}>
                      <TableCell>
                        <div className="flex flex-col">
                            {lead ? (
                                <Button variant="link" className="p-0 h-auto justify-start" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>
                                    {lead.companyName}
                                </Button>
                            ) : (
                                <span>{transcript.phoneNumber || 'Unknown'}</span>
                            )}
                            <span className="text-xs text-muted-foreground">{transcript.phoneNumber || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {lead?.dialerAssigned || 'Unassigned'}
                        </div>
                      </TableCell>
                       <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2 font-medium">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span>{transcript.callId || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex flex-col text-sm">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{new Date(transcript.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{new Date(transcript.date).toLocaleTimeString()}</span>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedTranscript(transcript); setIsViewerOpen(true); }}>
                            <FileText className="mr-2 h-4 w-4" />
                            View Transcript
                        </Button>
                      </TableCell>
                       <TableCell>
                          {transcript.callId ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => window.open(`https://assets.aircall.io/calls/${transcript.callId}/recording/info`, '_blank')}>
                              <Voicemail className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">Recording</span>
                            </Button>
                          ) : (
                            <span>N/A</span>
                          )}
                        </TableCell>
                    </TableRow>
                  )})
                ) : (
                  <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          No transcripts found.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
                    leadId={getLeadByPhoneNumber(selectedTranscript.phoneNumber || '')?.id || ''}
                    leadName={getLeadByPhoneNumber(selectedTranscript.phoneNumber || '')?.companyName || selectedTranscript.phoneNumber || 'Unknown'}
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
    </>
  )
}
