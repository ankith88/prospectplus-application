'use client';

import { useState } from 'react';
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
import type { VisitNote } from '@/lib/types';
import { Copy, Check, Mail } from 'lucide-react';
import { format } from 'date-fns';

import { updateVisitNote } from '@/services/firebase';

interface DashbackEmailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  note: VisitNote;
  onProcessed?: (noteId: string, status: 'Converted' | 'Rejected') => void;
}

export function DashbackEmailDialog({ isOpen, onOpenChange, note, onProcessed }: DashbackEmailDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const companyName = note.companyName || 'Unknown Company';
  const address = note.address ? `${note.address.street}, ${note.address.city}, ${note.address.state} ${note.address.zip}` : 'No address provided';
  const contactName = note.discoveryData?.personSpokenWithName || 'N/A';
  const contactTitle = note.discoveryData?.personSpokenWithTitle || 'N/A';
  const contactEmail = note.discoveryData?.personSpokenWithEmail || 'N/A';
  const contactPhone = note.discoveryData?.personSpokenWithPhone || 'N/A';
  const capturedBy = note.capturedBy;
  const outcome = note.outcome?.type || 'N/A';
  const apptDate = note.scheduledDate ? format(new Date(note.scheduledDate), 'PPP') : 'N/A';
  const apptTime = note.scheduledTime || 'N/A';
  const noteContent = note.content;

  const emailBody = `
Hi Andy,

Please find the details for a Dashback Qualified Lead:

**Company Details**
Company Name: ${companyName}
Address: ${address}

**Contact Details**
Contact Name: ${contactName}
Title: ${contactTitle}
Email: ${contactEmail}
Phone: ${contactPhone}

**Visit Details**
Captured By: ${capturedBy}
Outcome: ${outcome}
Appointment Date: ${apptDate}
Appointment Time: ${apptTime}

**Notes**
${noteContent}

Best regards,
${capturedBy}
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    toast({
      title: 'Copied to clipboard',
      description: 'The email body has been copied to your clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      await updateVisitNote(note.id, { status: 'Converted' });
      toast({
        title: 'Note Processed',
        description: 'The visit note has been marked as converted.',
      });
      if (onProcessed) {
        onProcessed(note.id, 'Converted');
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update the note status.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            Email Andy (andy@dashback.com.au)
          </DialogTitle>
          <DialogDescription>
            Copy the following details and email them to Andy manually.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="relative group">
            <ScrollArea className="h-[400px] w-full rounded-md border p-6 bg-slate-50 font-mono text-sm whitespace-pre-wrap">
              {emailBody}
            </ScrollArea>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied' : 'Copy Text'}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-muted-foreground italic text-center sm:text-left">
            Copy the details above, then mark as processed to clear it from your queue.
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">Cancel</Button>
            {note.status === 'New' && (
              <Button 
                onClick={handleProcess} 
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
              >
                {isProcessing ? 'Processing...' : 'Mark as Processed'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
