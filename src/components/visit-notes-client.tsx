
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { getVisitNotes, deleteVisitNote } from '@/services/firebase';
import type { VisitNote } from '@/lib/types';
import { format } from 'date-fns';
import { VisitNoteProcessorDialog } from './visit-note-processor-dialog';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { MoreHorizontal, Trash2, Edit } from 'lucide-react';
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

export default function VisitNotesClient() {
  const [notes, setNotes] = useState<VisitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<VisitNote | null>(null);
  const [isProcessorOpen, setIsProcessorOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<VisitNote | null>(null);
  const router = useRouter();
  const { userProfile } = useAuth();
  const { toast } = useToast();

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


  const statusColorMap: Record<VisitNote['status'], string> = {
    'New': 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Converted': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
  };


  return (
    <>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Visit Notes Queue</h1>
          <p className="text-muted-foreground">Review and process notes captured by the Field Sales team.</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>New Visit Notes</CardTitle>
            <CardDescription>
              Displaying {notes.filter(n => n.status === 'New').length} new notes.
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
                  <TableHead>Note Preview</TableHead>
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
                ) : notes.length > 0 ? (
                  notes.map((note) => {
                    const canManage = userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin' || note.capturedByUid === userProfile?.uid;
                    return (
                    <TableRow key={note.id}>
                      <TableCell>{note.capturedBy}</TableCell>
                      <TableCell>{format(new Date(note.createdAt), 'PPpp')}</TableCell>
                      <TableCell>{note.companyName || 'N/A'}</TableCell>
                      <TableCell>{note.address ? `${note.address.street}, ${note.address.city}` : 'N/A'}</TableCell>
                      <TableCell className="max-w-xs truncate">{note.content}</TableCell>
                      <TableCell>
                        <Badge className={statusColorMap[note.status]}>{note.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Button
                            size="sm"
                            onClick={() => handleProcessNote(note)}
                            disabled={note.status !== 'New'}
                          >
                            {note.status === 'New' ? 'Process' : 'View'}
                          </Button>
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
