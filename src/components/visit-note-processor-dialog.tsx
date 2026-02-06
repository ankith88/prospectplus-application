
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import type { VisitNote, VisitNoteAnalysis, Address } from '@/lib/types';
import { useRouter } from 'next/navigation';
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
} from '@/components/ui/alert-dialog';
import { createNewLead, updateVisitNote } from '@/services/firebase';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { format } from 'date-fns';

interface VisitNoteProcessorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  note: VisitNote;
  onProcessed: (noteId: string, status: 'Converted' | 'Rejected', leadId?: string) => void;
}

const formatAddressDisplay = (address: Address | undefined) => {
    if (!address) return 'No address captured.';
    return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
};

export function VisitNoteProcessorDialog({ isOpen, onOpenChange, note, onProcessed }: VisitNoteProcessorDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const handleCreateLead = () => {
    if (!note) return;
    setIsCreating(true);
    const params = new URLSearchParams();
    params.set('fromVisitNote', note.id);
    router.push(`/leads/new?${params.toString()}`);
    onOpenChange(false);
  };
  
  const handleReject = async () => {
    setIsRejecting(true);
    try {
        await updateVisitNote(note.id, { status: 'Rejected' });
        onProcessed(note.id, 'Rejected');
        toast({ title: 'Note Rejected', description: 'The visit note has been marked as rejected.' });
        onOpenChange(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not reject the note.' });
    } finally {
        setIsRejecting(false);
    }
  }

  return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process Visit Note</DialogTitle>
            <DialogDescription>
              For: <span className="font-semibold">{note.companyName || 'Unknown Company'}</span> at <span className="text-muted-foreground">{formatAddressDisplay(note.address)}</span>
              <br />
              Captured by {note.capturedBy} on {format(new Date(note.createdAt), 'PPpp')}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-6 py-4">
            <div className="space-y-4">
               <div>
                  <h4 className="font-semibold mb-2">Original Note</h4>
                  <ScrollArea className="h-48 rounded-md border p-4 bg-secondary/50">
                  <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                  </ScrollArea>
               </div>
               {note.imageUrls && note.imageUrls.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2">Attached Images</h4>
                        <ScrollArea className="h-40">
                            <div className="flex gap-4 flex-wrap p-1">
                                {note.imageUrls.map((url, index) => (
                                    <Image key={index} src={url} alt={`Visit image ${index + 1}`} width={200} height={120} className="rounded-md border object-cover"/>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
                {note.discoveryData && Object.keys(note.discoveryData).length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2">Field Discovery Data</h4>
                        <ScrollArea className="h-32 rounded-md border p-4 text-sm">
                            <ul className="list-disc pl-5 space-y-1">
                            {Object.entries(note.discoveryData).map(([key, value]) => {
                                if (!value || (Array.isArray(value) && value.length === 0)) return null;
                                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                                const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
                                return (
                                <li key={key}>
                                    <span className="font-semibold">{formattedKey}:</span>{' '}
                                    <span className="text-muted-foreground">{formattedValue}</span>
                                </li>
                                )
                            })}
                            </ul>
                        </ScrollArea>
                    </div>
                )}
            </div>
          </div>

          <DialogFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isRejecting || isCreating}>
                      {isRejecting ? <Loader /> : 'Reject Note'}
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will mark the note as rejected and remove it from the active queue.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReject}>Confirm Rejection</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button onClick={handleCreateLead} disabled={isCreating}>
              {isCreating ? <Loader /> : 'Create Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
