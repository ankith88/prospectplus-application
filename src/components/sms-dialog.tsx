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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { sendSms } from '@/services/sms-service';
import { Loader2, Send, AlertTriangle } from 'lucide-react';

import { replaceTemplatePlaceholders } from '@/lib/template-replacer';

interface SmsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  recipientName?: string;
  lead?: any;
  leadId?: string;
}

export function SmsDialog({ isOpen, onClose, phoneNumber, recipientName, lead, leadId }: SmsDialogProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const isUserRole = userProfile?.activeRole === 'user' || userProfile?.activeRole?.toLowerCase() === 'user' || userProfile?.role === 'user';

  const handleSend = async () => {
    if (isUserRole) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Users with the "user" role are not allowed to send SMS.' });
      return;
    }

    if (!message.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Message cannot be empty.' });
      return;
    }

    setIsSending(true);
    try {
      const activeLead = lead || (leadId ? { id: leadId } : undefined);
      const finalMessage = activeLead 
        ? replaceTemplatePlaceholders(message, {
            lead: activeLead,
            accountManager: {
              name: userProfile?.displayName || '',
              mobile: userProfile?.mobileNumber || userProfile?.phoneNumber || '',
              email: userProfile?.email || ''
            },
            salesRep: userProfile?.displayName || ''
          })
        : replaceTemplatePlaceholders(message, {});

      const result = await sendSms(phoneNumber, finalMessage, userProfile?.activeRole || userProfile?.role);
      if (result.success) {
        toast({ title: 'SMS Sent', description: 'Your message has been dispatched successfully.' });
        setMessage('');
        onClose();
      } else {
        toast({ variant: 'destructive', title: 'SMS Failed', description: result.message || 'Failed to send SMS.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred while sending SMS.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send SMS</DialogTitle>
          <DialogDescription>
            Compose a message to {recipientName ? `${recipientName} (${phoneNumber})` : phoneNumber}.
          </DialogDescription>
        </DialogHeader>
        {isUserRole && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Users with the 'user' role are not permitted to send SMS messages.</span>
          </div>
        )}
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Enter your SMS text..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isUserRole}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim() || isUserRole} className="gap-2">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
