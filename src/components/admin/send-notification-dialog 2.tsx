
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '../ui/loader';
import { createNotification } from '@/services/firebase';
import { Send, BellRing } from 'lucide-react';

interface SendNotificationDialogProps {
  users: { uid: string; displayName: string }[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SendNotificationDialog({
  users,
  isOpen,
  onOpenChange,
  onSuccess,
}: SendNotificationDialogProps) {
  const [title, setTitle] = useState('Important Reminder');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a message.' });
      return;
    }

    setIsSending(true);
    try {
      await Promise.all(
        users.map((user) =>
          createNotification(user.uid, {
            title,
            message,
            type: 'admin_broadcast',
          })
        )
      );

      toast({
        title: 'Notifications Sent',
        description: `Alert sent to ${users.length} user(s).`,
      });
      onSuccess?.();
      onOpenChange(false);
      setMessage('');
    } catch (error) {
      console.error('Failed to send notifications:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send notifications.' });
    } finally {
      setIsSending(false);
    }
  };

  const setDeploymentReminder = () => {
      setTitle('Daily Deployment Reminder');
      setMessage("Hi! We haven't seen your deployment log for today yet. Please remember to log your target area from the Field Visits menu so we can track team coverage accurately. Have a great day!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Send Notification
          </DialogTitle>
          <DialogDescription>
            This message will appear as a real-time pop-up alert for {users.length} selected user(s).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={setDeploymentReminder}>
                  Template: Deployment Log
              </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notif-title">Title</Label>
            <Input
              id="notif-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notif-message">Message</Label>
            <Textarea
              id="notif-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim()}>
            {isSending ? <Loader /> : <><Send className="mr-2 h-4 w-4" /> Send Alert</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
