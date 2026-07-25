"use client"

import { useState } from 'react';
import { Lead } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { createNotification, logActivity, getAllUsers } from '@/services/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Send } from 'lucide-react';

interface RequestAssignmentDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestAssignmentDialog({ lead, isOpen, onOpenChange }: RequestAssignmentDialogProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const handleSendRequest = async () => {
    if (!notes.trim()) {
      toast({ variant: 'destructive', title: 'Notes Required', description: 'Please provide a reason or notes for requesting this lead assignment.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const requesterName = userProfile?.displayName || [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || 'Account Manager';
      const requesterEmail = userProfile?.email || '';

      // 1. Send Email Notification to Luke & Aleyna
      const emailRes = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lead_assignment_request',
          payload: {
            leadId: lead.id,
            companyName: lead.companyName || (lead as any).contactName || 'Lead',
            currentAssignee: lead.accountManagerAssigned || (lead as any).assignedTo || 'Unassigned',
            requesterName,
            requesterEmail,
            requestNotes: notes
          }
        })
      });

      if (!emailRes.ok) {
        console.warn('Email dispatch warning:', await emailRes.text());
      }

      // 2. In-app notifications to Luke & Aleyna if user docs exist
      try {
        const allUsers = await getAllUsers();
        const adminTargets = allUsers.filter(u => 
          u.email === 'luke.forbes@mailplus.com.au' || 
          u.email === 'aleyna.harnett@mailplus.com.au' ||
          u.assignedRoles?.includes('Sales Manager') ||
          u.assignedRoles?.includes('admin')
        );

        for (const adminUser of adminTargets) {
          await createNotification(adminUser.uid, {
            title: `Lead Assignment Requested`,
            message: `${requesterName} requested assignment for lead "${lead.companyName}". Notes: ${notes}`,
            type: 'lead_assignment_request',
            leadId: lead.id,
            requesterName,
            requesterEmail
          });
        }
      } catch (notifErr) {
        console.error('In-app notification error:', notifErr);
      }

      // 3. Log Activity on Lead
      await logActivity(lead.id, {
        type: 'Update',
        notes: `Assignment requested by ${requesterName}. Notes: ${notes}`,
        author: requesterName
      });

      toast({ title: 'Request Sent', description: 'Lead assignment request sent to Luke Forbes and Aleyna Harnett.' });
      setNotes('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to submit assignment request:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not submit assignment request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Send className="h-5 w-5" />
            Request Lead Assignment
          </DialogTitle>
          <DialogDescription>
            Submit a request to assign <strong>{lead.companyName || 'this lead'}</strong> to yourself. This will notify Sales Management.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label htmlFor="request-notes">Reason / Notes</Label>
            <Textarea
              id="request-notes"
              placeholder="Explain why you are requesting assignment of this lead..."
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSendRequest} disabled={isSubmitting || !notes.trim()} className="bg-[#095c7b] hover:bg-[#053647]">
            {isSubmitting ? <Loader /> : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
