'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';

interface EmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  toEmail: string;
  recipientName?: string;
  senderEmail?: string;
}

export function EmailDialog({ isOpen, onClose, toEmail, recipientName, senderEmail }: EmailDialogProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!subject.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Subject cannot be empty.' });
      return;
    }
    if (!message.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Message cannot be empty.' });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/campaigns/send-custom-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          subject,
          html: message.replace(/\n/g, '<br/>'),
          customFrom: senderEmail
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: 'Email Sent', description: 'Your message has been dispatched successfully.' });
        setSubject('');
        setMessage('');
        onClose();
      } else {
        toast({ variant: 'destructive', title: 'Email Failed', description: result.message || 'Failed to send email.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred while sending the email.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>
            Compose an email to {recipientName ? `${recipientName} (${toEmail})` : toEmail}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {senderEmail && (
            <div className="text-xs text-muted-foreground flex gap-1">
              <span>Sending as:</span>
              <span className="font-semibold text-foreground">{senderEmail}</span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your email text..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[150px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim() || !subject.trim()} className="gap-2">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
