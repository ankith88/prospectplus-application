
'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { getVisitNotes, deleteVisitNote } from '@/services/firebase';
import type { VisitNote, Address } from '@/lib/types';
import { format, startOfDay, endOfDay } from 'date-fns';
import { VisitNoteProcessorDialog } from './visit-note-processor-dialog';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Trash2, Edit, Filter, SlidersHorizontal, X, Calendar as CalendarIcon, Camera, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar } from './ui/calendar';
import type { DateRange } from 'react-day-picker';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox';
import Link from 'next/link';
import Image from 'next/image';
import { ScrollArea } from './ui/scroll-area';

export default function VisitNotesClient() {
  const [notes, setNotes] = useState<VisitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<VisitNote | null>(null);
  const [isProcessorOpen, setIsProcessorOpen] = useState(false);
  
  // Inline states
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    capturedBy: [] as string[],
    date: undefined as DateRange | undefined,
    outcome: [] as string[],
    companyName: '',
    status: ['New'] as string[],
  });

  useEffect(() => {
    if (!userProfile) return;
    const fetchNotes = async () => {
      setLoading(true);
      const canSeeAll = ['admin', 'Lead Gen Admin', 'Field Sales Admin'].includes(userProfile.role!);
      const fetchedNotes = canSeeAll ? await getVisitNotes() : await getVisitNotes(userProfile.uid);
      setNotes(fetchedNotes);
      setLoading(false);
    };
    fetchNotes();
  }, [userProfile]);

  const handleProcessNote = (note: VisitNote) => {
    setSelectedNote(note);
    setIsProcessorOpen(true);
  };
  
  const handleNoteProcessed = (noteId: string, status: 'Converted' | 'Rejected', leadId?: string) => {
    setNotes(prev => prev.map(n => n.id === noteId ? {...n, status, leadId} : n));
  };

  const handleExecuteDelete = async (noteId: string) => {
    setIsDeleting(true);
    try {
      await deleteVisitNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast({ title: 'Success', description: 'Visit note deleted.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the note.' });
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      capturedBy: [],
      date: undefined,
      outcome: [],
      companyName: '',
      status: [],
    });
  };
  
  const capturedByOptions: Option[] = useMemo(() => {
    const users = new Set(notes.map(n => n.capturedBy));
    return Array.from(users).map(u => ({ value: u, label: u }));
  }, [notes]);

  const outcomeOptions: Option[] = useMemo(() => {
    const outcomes = new Set(notes.map(n => n.outcome?.type).filter(Boolean));
    return Array.from(outcomes as string[]).map(o => ({ value: o, label: o }));
  }, [notes]);

  const statusOptions: Option[] = useMemo(() => {
    const statuses = new Set(notes.map(n => n.status));
    return Array.from(statuses).map(s => ({ value: s, label: s }));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const companyNameMatch = filters.companyName
        ? note.companyName?.toLowerCase().includes(filters.companyName.toLowerCase())
        : true;
      
      const capturedByMatch = filters.capturedBy.length === 0
        ? true
        : filters.capturedBy.includes(note.capturedBy);
        
      const outcomeMatch = filters.outcome.length === 0
        ? true
        : note.outcome?.type && filters.outcome.includes(note.outcome.type);

      const statusMatch = filters.status.length === 0
        ? true
        : filters.status.includes(note.status);

      let dateMatch = true;
      if (filters.date?.from) {
        const noteDate = new Date(note.createdAt);
        const fromDate = startOfDay(filters.date.from);
        const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
        dateMatch = noteDate >= fromDate && noteDate <= toDate;
      }

      return companyNameMatch && capturedByMatch && outcomeMatch && statusMatch && dateMatch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notes, filters]);

  const statusColorMap: Record<VisitNote['status'], string> = {
    'New': 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Converted': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
  };

  const canProcess = userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin';
  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) ? val.length > 0 : !!val));

  return (
    <>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Visit Notes Queue</h1>
          <p className="text-muted-foreground">Review and process notes captured by the Field Sales team.</p>
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
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={filters.companyName} onChange={(e) => handleFilterChange('companyName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Captured By</Label>
                  <MultiSelectCombobox options={capturedByOptions} selected={filters.capturedBy} onSelectedChange={(selected) => handleFilterChange('capturedBy', selected)} placeholder="Select users..." />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <MultiSelectCombobox options={statusOptions} selected={filters.status} onSelectedChange={(selected) => handleFilterChange('status', selected)} placeholder="Select statuses..." />
                </div>
                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <MultiSelectCombobox options={outcomeOptions} selected={filters.outcome} onSelectedChange={(selected) => handleFilterChange('outcome', selected)} placeholder="Select outcomes..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date Captured</Label>
                  <Popover>
                    <PopoverTrigger asChild><Button id="date" variant={"outline"} className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filters.date?.from ? (filters.date.to ? <>{format(filters.date.from, "LLL dd, y")} - {format(filters.date.to, "LLL dd, y")}</> : format(filters.date.from, "LLL dd, y")) : <span>Pick a date range</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0 flex" align="start">
                      <Calendar mode="range" selected={filters.date} onSelect={(date) => handleFilterChange('date', date)} />
                    </PopoverContent>
                  </Popover>
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
          <CardHeader>
            <CardTitle>Visit Notes</CardTitle>
            <CardDescription>
              Displaying {filteredNotes.length} of {notes.length} notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    {userProfile && ['admin', 'Lead Gen Admin', 'Field Sales Admin'].includes(userProfile.role!) && (
                        <TableHead>Captured By</TableHead>
                    )}
                    <TableHead>Date</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Address</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                        <Loader />
                        </TableCell>
                    </TableRow>
                    ) : filteredNotes.length > 0 ? (
                    filteredNotes.map((note) => {
                        const canManage = userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen Admin' || userProfile?.role === 'Field Sales Admin' || note.capturedByUid === userProfile?.uid;
                        const canDelete = userProfile?.role === 'admin';
                        const isExpanded = expandedNoteIds.has(note.id);
                        const isAwaitingDelete = confirmDeleteId === note.id;

                        return (
                        <Fragment key={note.id}>
                        <TableRow className={cn(isExpanded && "bg-muted/30")}>
                        {userProfile && ['admin', 'Lead Gen Admin', 'Field Sales Admin'].includes(userProfile.role!) && (
                            <TableCell>{note.capturedBy}</TableCell>
                        )}
                        <TableCell>{format(new Date(note.createdAt), 'PP')}</TableCell>
                        <TableCell>{note.companyName || 'N/A'}</TableCell>
                        <TableCell className="hidden sm:table-cell">{note.address ? `${note.address.street}, ${note.address.city}` : 'N/A'}</TableCell>
                        <TableCell className="whitespace-normal max-w-[150px]">{note.outcome?.type || 'N/A'}</TableCell>
                        <TableCell>
                            <Badge className={statusColorMap[note.status]}>{note.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                            {note.status === 'Converted' && note.leadId ? (
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={`/leads/${note.leadId}`} target="_blank">View Lead</Link>
                                    </Button>
                                ) : canProcess ? (
                                    <Button
                                    size="sm"
                                    onClick={() => handleProcessNote(note)}
                                    >
                                    {note.status === 'New' ? 'Process' : 'View'}
                                    </Button>
                                ) : null}
                            {canManage && (
                                <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/capture-visit?noteId=${note.id}`)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn("h-8 w-8", isExpanded && "bg-accent")} 
                                        disabled={!note.imageUrls || note.imageUrls.length === 0}
                                        onClick={() => toggleExpand(note.id)}
                                    >
                                        <ImageIcon className="h-4 w-4" />
                                    </Button>
                                    {canDelete && (
                                        isAwaitingDelete ? (
                                            <div className="flex items-center gap-1">
                                                <Button size="sm" variant="destructive" onClick={() => handleExecuteDelete(note.id)} disabled={isDeleting}>
                                                    {isDeleting ? <Loader /> : "Confirm"}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                                            </div>
                                        ) : (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirmDeleteId(note.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )
                                    )}
                                </>
                            )}
                            </div>
                        </TableCell>
                        </TableRow>
                        {isExpanded && (
                            <TableRow className="bg-muted/30 border-b-0">
                                <TableCell colSpan={7} className="p-4">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-sm">Attached Images ({note.imageUrls?.length})</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {note.imageUrls?.map((url, i) => (
                                                <div key={i} className="relative aspect-video rounded-md overflow-hidden border bg-background group cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                                    <Image src={url} alt="Visit image" fill className="object-cover transition-transform group-hover:scale-105" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        </Fragment>
                    )})
                    ) : (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                        No visit notes found.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedNote && (
        <VisitNoteProcessorDialog
          isOpen={isProcessorOpen}
          onOpenChange={setIsProcessorOpen}
          note={selectedNote}
          onProcessed={handleNoteProcessed}
        />
      )}
    </>
  );
}
