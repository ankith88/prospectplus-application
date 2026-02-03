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
import { analyzeVisitNote } from '@/ai/flows/analyze-visit-note';
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
  const [analysis, setAnalysis] = useState<VisitNoteAnalysis | null>(note.analyzedData || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    if (note.analyzedData) {
      setAnalysis(note.analyzedData);
    } else {
      setAnalysis(null);
    }
  }, [note]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeVisitNote(note.content);
      setAnalysis(result);
      await updateVisitNote(note.id, { analyzedData: result });
    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast({ variant: 'destructive', title: 'AI Analysis Failed', description: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateLead = () => {
    if (!note) return;
    setIsCreating(true);

    const params = new URLSearchParams();
    
    if (note.companyName) params.set('companyName', note.companyName);
    if (note.address) {
        if (note.address.street) params.set('street', note.address.street);
        if (note.address.city) params.set('city', note.address.city);
        if (note.address.state) params.set('state', note.address.state);
        if (note.address.zip) params.set('zip', note.address.zip);
        if (note.address.lat) params.set('lat', note.address.lat.toString());
        if (note.address.lng) params.set('lng', note.address.lng.toString());
    }

    if (note.analyzedData) {
      const { contactName, contactDetails } = note.analyzedData;
      if (contactName) {
        const nameParts = contactName.split(' ');
        params.set('contactFirstName', nameParts[0] || '');
        params.set('contactLastName', nameParts.slice(1).join(' '));
      }
      if (contactDetails) {
          const emailMatch = contactDetails.match(/[\w.-]+@[\w.-]+\.\w+/);
          if (emailMatch) params.set('email', emailMatch[0]);

          const phoneMatch = contactDetails.match(/\b\d{8,12}\b/);
          if (phoneMatch) params.set('phone', phoneMatch[0]);
      }
    }
    
    params.set('fromVisitNote', note.id);
    params.set('initialNotes', note.content);

    router.push(`/leads/new?${params.toString()}`);
    onOpenChange(false);
  };
  
  const handleReject = async () => {
    setIsRejecting(true);
    try {
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Process Visit Note</DialogTitle>
          <DialogDescription>
            For: <span className="font-semibold">{note.companyName || 'Unknown Company'}</span> at <span className="text-muted-foreground">{formatAddressDisplay(note.address)}</span>
            <br />
            Captured by {note.capturedBy} on {format(new Date(note.createdAt), 'PPpp')}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
             <div>
                <h4 className="font-semibold mb-2">Original Note</h4>
                <ScrollArea className="h-48 rounded-md border p-4 bg-secondary/50">
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                </ScrollArea>
             </div>
             {(note.frontImageDataUri || note.backImageDataUri) && (
                 <div>
                    <h4 className="font-semibold mb-2">Attached Images</h4>
                     <div className="flex gap-4">
                        {note.frontImageDataUri && <Image src={note.frontImageDataUri} alt="Front of card" width={200} height={120} className="rounded-md border"/>}
                        {note.backImageDataUri && <Image src={note.backImageDataUri} alt="Back of card" width={200} height={120} className="rounded-md border"/>}
                    </div>
                 </div>
             )}
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">AI Analysis</h4>
            <div className="h-full rounded-md border p-4">
              {isAnalyzing ? (
                <div className="flex items-center justify-center h-full"><Loader /></div>
              ) : analysis ? (
                <ScrollArea className="h-48">
                    <ul className="space-y-2 text-sm">
                    <li><strong>Company:</strong> {analysis.companyName || 'N/A'}</li>
                    <li><strong>Address:</strong> {analysis.address || 'N/A'}</li>
                    <li><strong>Contact:</strong> {analysis.contactName || 'N/A'}</li>
                    <li><strong>Details:</strong> {analysis.contactDetails || 'N/A'}</li>
                    <li><strong>Outcome:</strong> {analysis.outcome || 'N/A'}</li>
                    <li><strong>Actions:</strong> {analysis.actionItems?.join(', ') || 'N/A'}</li>
                    </ul>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                  Click "Analyze" to extract details.
                </div>
              )}
            </div>
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
          
          <Button variant="outline" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader /> : 'Analyze with AI'}
          </Button>
          
          <Button onClick={handleCreateLead} disabled={!note.companyName && !analysis || isCreating}>
            {isCreating ? <Loader /> : 'Create Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
