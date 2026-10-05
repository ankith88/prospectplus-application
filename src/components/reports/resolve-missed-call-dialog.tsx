"use client";

import { useState } from 'react';
import Link from 'next/link';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PhoneCall,
  PhoneMissed,
  CheckCircle2,
  Building,
  User,
  Clock,
  ExternalLink,
  Trash2,
  Send,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { EnrichedInboundCall } from '@/services/aircall-reporting-server';

interface ResolveMissedCallDialogProps {
  call: EnrichedInboundCall | null;
  isOpen: boolean;
  onClose: () => void;
  onResolved: (updatedCall: EnrichedInboundCall) => void;
}

export function ResolveMissedCallDialog({
  call,
  isOpen,
  onClose,
  onResolved,
}: ResolveMissedCallDialogProps) {
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  const [resolutionType, setResolutionType] = useState<string>('callback_manual');
  const [notes, setNotes] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>(
    userProfile?.displayName || user?.displayName || userProfile?.name || ''
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  if (!call) return null;

  const isAlreadyResolved = call.followup.status === 'resolved_manually';
  const callDate = new Date(call.startedAt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const resolvedBy = authorName.trim() || userProfile?.displayName || user?.displayName || 'Staff Member';
      const userEmail = user?.email || userProfile?.email || '';

      const res = await fetch('/api/reports/aircall-missed-calls/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: call.id,
          resolutionType,
          notes: notes.trim(),
          authorName: resolvedBy,
          authorEmail: userEmail,
          leadId: call.matchedLead?.id || null,
          leadType: call.matchedLead?.type || null,
          callerNumber: call.callerNumber,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save resolution');
      }

      toast({
        title: 'Missed Call Resolved',
        description: 'Follow-up status and activity logged successfully.',
      });

      const resLabels: Record<string, string> = {
        callback_manual: 'Outbound Callback Made',
        left_voicemail: 'Left Voicemail',
        emailed: 'Contacted via Email',
        spam_wrong_number: 'Marked Spam / Wrong Number',
        handled_external: 'Handled Externally',
        other: 'Resolved',
      };

      const updatedCall: EnrichedInboundCall = {
        ...call,
        hasCallback: true,
        callbackDetails: {
          date: new Date().toISOString(),
          author: resolvedBy,
          notes: notes.trim() || resLabels[resolutionType] || 'Resolved',
        },
        followup: {
          status: 'resolved_manually',
          label: resLabels[resolutionType] || 'Resolved Manually',
          actionType: 'manual',
          performedAt: new Date().toISOString(),
          author: resolvedBy,
          notes: notes.trim(),
          resolutionType,
        },
      };

      onResolved(updatedCall);
      onClose();
    } catch (err: any) {
      toast({
        title: 'Resolution Failed',
        description: err.message || 'Could not update resolution.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResolution = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/aircall-missed-calls/resolve?callId=${call.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to remove resolution');
      }

      toast({
        title: 'Resolution Removed',
        description: 'Missed call marked back as pending action.',
      });

      const updatedCall: EnrichedInboundCall = {
        ...call,
        hasCallback: false,
        callbackDetails: undefined,
        followup: {
          status: 'unreturned',
          label: 'Action Needed',
          actionType: 'none',
        },
      };

      onResolved(updatedCall);
      onClose();
    } catch (err: any) {
      toast({
        title: 'Failed to Remove',
        description: err.message || 'Could not remove resolution.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-xs tracking-wide uppercase">
            <PhoneMissed className="h-4 w-4" />
            <span>Missed Call Resolution & Activity Log</span>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            Follow Up on {call.callerNumber}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Log your callback, note, or resolution so management and team members know this call was handled.
          </DialogDescription>
        </DialogHeader>

        {/* Call Summary Card */}
        <div className="p-3.5 rounded-lg border bg-slate-50/80 dark:bg-slate-900/60 flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Received At:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {format(callDate, 'dd MMM yyyy, hh:mm a')}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Aircall Line:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {call.aircallNumberName} ({call.aircallNumberDigits})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Caller / Contact:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {call.callerNumber}
              </span>
              <a
                href={`tel:${call.callerNumber.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded transition"
                title="Dial now"
              >
                <PhoneCall className="h-3 w-3" />
                <span>Call</span>
              </a>
            </div>
          </div>

          {call.matchedLead && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Building className="h-3.5 w-3.5 text-blue-500" />
                Matched Lead:
              </span>
              <div className="flex items-center gap-1.5">
                <Link
                  href={call.matchedLead.leadUrl}
                  target="_blank"
                  className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  {call.matchedLead.companyName}
                  <ExternalLink className="h-3 w-3 inline" />
                </Link>
                <Badge variant="outline" className="text-[10px] uppercase font-bold py-0">
                  {call.matchedLead.status}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Form to Log Resolution */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resType" className="text-xs font-semibold">
              Action / Resolution Type
            </Label>
            <Select value={resolutionType} onValueChange={setResolutionType}>
              <SelectTrigger id="resType" className="h-9 text-xs">
                <SelectValue placeholder="Select resolution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="callback_manual">📞 Outbound Callback Made</SelectItem>
                <SelectItem value="left_voicemail">🗣️ Left Voicemail</SelectItem>
                <SelectItem value="emailed">✉️ Contacted via Email</SelectItem>
                <SelectItem value="spam_wrong_number">🚫 Spam / Robocall / Wrong Number</SelectItem>
                <SelectItem value="handled_external">🏢 Handled by Operations / Customer Service</SelectItem>
                <SelectItem value="other">✅ Other Resolution</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold">
              Follow-Up Notes / Outcome
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g. Called back and spoke with director. Booked meeting for Thursday 10am."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[80px]"
            />
            {call.matchedLead && (
              <p className="text-[11px] text-slate-400">
                💡 This note will also be automatically logged onto <strong>{call.matchedLead.companyName}</strong>&apos;s activity timeline.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="author" className="text-xs font-semibold">
              Logged By
            </Label>
            <Input
              id="author"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your Name"
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 mt-3 pt-3 border-t">
            {isAlreadyResolved ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleDeleteResolution}
                disabled={deleting || submitting}
                className="text-xs text-red-600 hover:bg-red-50 border-red-200 h-9"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {deleting ? 'Removing...' : 'Remove Resolution'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={submitting}
                className="text-xs h-9"
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#095c7b] hover:bg-[#07475e] text-white text-xs h-9 gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{submitting ? 'Saving...' : 'Mark as Resolved'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
