

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { getVisitNotes, deleteVisitNote } from '@/services/firebase';
import type { VisitNote } from '@/lib/types';
import { format, startOfDay, endOfDay } from 'date-fns';
import { VisitNoteProcessorDialog } from './visit-note-processor-dialog';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { MoreHorizontal, Trash2, Edit, Filter, SlidersHorizontal, X, Calendar as CalendarIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar } from './ui/calendar';
import type { DateRange } from 'react-day-picker';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox';
import Link from 'next/link';


export default function VisitNotesClient() {
  const [notes, setNotes] = useState<VisitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<VisitNote | null>(null);
  const [isProcessorOpen, setIsProcessorOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<VisitNote | null>(null);
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

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    try {
      await deleteVisitNote(noteToDelete.id);
      setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
      toast({ title: 'Success', description: 'Visit note deleted.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the note.' });
    } finally {
      setNoteToDelete(null);
    }
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
    });
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Captured By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Address</TableHead>
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
                    const canManage = userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin' || note.capturedByUid === userProfile?.uid;
                    return (
                    <TableRow key={note.id}>
                      <TableCell>{note.capturedBy}</TableCell>
                      <TableCell>{format(new Date(note.createdAt), 'PPpp')}</TableCell>
                      <TableCell>{note.companyName || 'N/A'}</TableCell>
                      <TableCell>{note.address ? `${note.address.street}, ${note.address.city}` : 'N/A'}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{note.outcome?.type || 'N/A'}</TableCell>
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
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => router.push(`/capture-visit?noteId=${note.id}`)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onSelect={() => setNoteToDelete(note)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
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
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the visit note. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
