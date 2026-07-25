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
import { TrendingUp } from 'lucide-react';

interface NotifyUpsellDialogProps {
  company: Lead | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotifyUpsellDialog({ company, isOpen, onOpenChange }: NotifyUpsellDialogProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!company) return null;

  const amName = company.accountManagerAssigned || 'Unassigned AM';

  const handleSendUpsellNotification = async () => {
    if (!notes.trim()) {
      toast({ variant: 'destructive', title: 'Notes Required', description: 'Please enter details regarding the customer upsell interest.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const requesterName = userProfile?.displayName || [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || 'User';
      const requesterEmail = userProfile?.email || '';

      // Find Account Manager email & UID
      let amEmail = (company as any).accountManagerEmail || '';
      let amUid = '';

      const allUsers = await getAllUsers();
      const matchedAmUser = allUsers.find(u => 
        u.displayName?.trim().toLowerCase() === amName.trim().toLowerCase() ||
        u.email?.trim().toLowerCase() === amEmail.trim().toLowerCase()
      );

      if (matchedAmUser) {
        amEmail = matchedAmUser.email || amEmail;
        amUid = matchedAmUser.uid;
      }

      // If no AM email found, fall back to admins / sales managers
      if (!amEmail) {
        const fallbackAdmin = allUsers.find(u => u.assignedRoles?.includes('Sales Manager') || u.assignedRoles?.includes('admin'));
        if (fallbackAdmin) {
          amEmail = fallbackAdmin.email || 'luke.forbes@mailplus.com.au';
        } else {
          amEmail = 'luke.forbes@mailplus.com.au';
        }
      }

      // 1. Send Email to AM
      const res = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'upsell_notification',
          payload: {
            companyId: company.id,
            companyName: company.companyName || 'Signed Customer',
            accountManagerName: amName,
            accountManagerEmail: amEmail,
            requesterName,
            requesterEmail,
            upsellNotes: notes
          }
        })
      });

      if (!res.ok) {
        console.warn('Upsell email warning:', await res.text());
      }

      // 2. Send In-App Notification to AM
      if (amUid) {
        await createNotification(amUid, {
          title: `Upsell Opportunity: ${company.companyName}`,
          message: `${requesterName} captured an upsell request for ${company.companyName}. Notes: ${notes}`,
          type: 'upsell_notification',
          companyId: company.id,
          requesterName,
          requesterEmail
        });
      }

      // 3. Log Activity
      await logActivity(company.id, {
        type: 'Update',
        notes: `Upsell interest notified to ${amName} by ${requesterName}. Notes: ${notes}`,
        author: requesterName
      });

      toast({ title: 'Account Manager Notified', description: `Upsell notification sent to ${amName} (${amEmail}).` });
      setNotes('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to send upsell notification:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not notify Account Manager.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <TrendingUp className="h-5 w-5" />
            Notify AM for Upsell
          </DialogTitle>
          <DialogDescription>
            Notify Account Manager <strong>{amName}</strong> about an upsell interest for <strong>{company.companyName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label htmlFor="upsell-notes">Upsell Details / Interest Notes</Label>
            <Textarea
              id="upsell-notes"
              placeholder="Specify parcel volume increases, new product interest, or customer requests..."
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
          <Button onClick={handleSendUpsellNotification} disabled={isSubmitting || !notes.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isSubmitting ? <Loader /> : 'Send Notification to AM'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
