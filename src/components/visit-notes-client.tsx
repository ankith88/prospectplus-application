'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { getVisitNotes, updateVisitNote } from '@/services/firebase';
import type { VisitNote } from '@/lib/types';
import { format } from 'date-fns';
import { VisitNoteProcessorDialog } from './visit-note-processor-dialog';
import { useRouter } from 'next/navigation';

export default function VisitNotesClient() {
  const [notes, setNotes] = useState<VisitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<VisitNote | null>(null);
  const [isProcessorOpen, setIsProcessorOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      const fetchedNotes = await getVisitNotes();
      setNotes(fetchedNotes);
      setLoading(false);
    };
    fetchNotes();
  }, []);

  const handleProcessNote = (note: VisitNote) => {
    setSelectedNote(note);
    setIsProcessorOpen(true);
  };
  
  const handleNoteProcessed = (noteId: string, status: 'Converted' | 'Rejected', leadId?: string) => {
    updateVisitNote(noteId, { status, leadId });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, status, leadId } : n));
    if (status === 'Converted' && leadId) {
        router.push(`/leads/${leadId}`);
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
                  notes.map((note) => (
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
                        <Button
                          size="sm"
                          onClick={() => handleProcessNote(note)}
                          disabled={note.status !== 'New'}
                        >
                          {note.status === 'New' ? 'Process' : 'View'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
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
    </>
  );
}
