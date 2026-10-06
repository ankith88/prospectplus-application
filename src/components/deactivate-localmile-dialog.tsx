'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Loader2,
  AlertTriangle,
  ShieldOff,
  UserX,
  CalendarX2,
  Info,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Lead } from '@/lib/types';
import type { LocalMileCompanyStatusResponse } from '@/services/localmile-company-service';

interface DeactivateLocalMileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  localMileStatus?: LocalMileCompanyStatusResponse | null;
  onSuccess?: () => void;
}

export function DeactivateLocalMileDialog({
  isOpen,
  onOpenChange,
  lead,
  localMileStatus,
  onSuccess,
}: DeactivateLocalMileDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('Customer requested LocalMile access deactivation');
  const [deactivateScheduledJobs, setDeactivateScheduledJobs] = useState(true);

  // Active users in LocalMile database or contacts on lead
  const localMileUsers = localMileStatus?.users || [];
  const contactsWithAccess = (lead.contacts || []).filter(
    (c) => c.accessToLocalMile === 'yes' || c.localMilePlusAuthLink || c.securityCode
  );

  const handleDeactivate = async () => {
    setIsSubmitting(true);
    try {
      const staffName =
        userProfile?.displayName ||
        user?.displayName ||
        user?.email ||
        'Staff';

      const res = await fetch('/api/localmile/deactivate-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: lead.id,
          leadId: lead.id,
          reason: reason.trim() || 'Manual LocalMile account deactivation',
          deactivateScheduledJobs,
          deactivatedBy: staffName,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to deactivate LocalMile account.');
      }

      toast({
        title: 'LocalMile Account Deactivated',
        description: `Successfully revoked LocalMile access for ${lead.companyName || 'the company'}.`,
      });

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('[DeactivateLocalMileDialog] Error:', error);
      toast({
        variant: 'destructive',
        title: 'Deactivation Failed',
        description: error?.message || 'Failed to deactivate LocalMile account. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950/50">
              <ShieldOff className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Deactivate LocalMile Account
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Revoke portal access and cancel pickup operations in LocalMile Plus.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Informational Banner */}
          <Alert className="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-200">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="ml-2">
              <AlertTitle className="text-xs font-semibold">Standalone LocalMile Deactivation</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed mt-0.5">
                This action only disables the <strong>LocalMile Parcel Pickup</strong> account and credentials. The customer will <strong>NOT</strong> be cancelled or marked as lost in ProspectPlus.
              </AlertDescription>
            </div>
          </Alert>

          {/* Company Target Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {lead.companyName || 'Company'}
                </span>
              </div>
              <Badge variant="outline" className="text-xs font-semibold bg-rose-50 text-rose-700 border-rose-200">
                Deactivation Target
              </Badge>
            </div>
            <p className="text-xs text-slate-500">ID: {lead.id}</p>
          </div>

          {/* Impact Checklist */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
              What will happen:
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 p-2 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                <UserX className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Revoke User Login Credentials
                  </span>
                  <p className="text-slate-500 text-[11px]">
                    Disables portal accounts in LocalMile Plus for associated contacts and sets LocalMile Access to &quot;No&quot;.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                <CalendarX2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Inactivate Scheduled Pickup Runs
                  </span>
                  <p className="text-slate-500 text-[11px]">
                    Stops recurring scheduled runs in LocalMile dispatch so drivers are not dispatched.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Users who will be revoked */}
          {(localMileUsers.length > 0 || contactsWithAccess.length > 0) && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Associated Users &amp; Contacts ({localMileUsers.length || contactsWithAccess.length})
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1 border rounded p-2 bg-slate-50/50 dark:bg-slate-900/40 text-xs">
                {localMileUsers.length > 0 ? (
                  localMileUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-1 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{u.name || u.email}</span>
                      <span className="text-[11px] text-slate-500">{u.email}</span>
                    </div>
                  ))
                ) : (
                  contactsWithAccess.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-1 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{c.name || c.email}</span>
                      <span className="text-[11px] text-slate-500">{c.email}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-1.5">
            <Label htmlFor="deactivation-reason" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Deactivation Reason
            </Label>
            <Input
              id="deactivation-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer paused parcel service, requested login removal"
              className="text-xs"
            />
          </div>

          {/* Scheduled Jobs Toggle */}
          <div className="flex items-start space-x-2 pt-1">
            <Checkbox
              id="deactivate-jobs-check"
              checked={deactivateScheduledJobs}
              onCheckedChange={(checked) => setDeactivateScheduledJobs(Boolean(checked))}
            />
            <label
              htmlFor="deactivate-jobs-check"
              className="text-xs font-medium leading-none cursor-pointer select-none text-slate-700 dark:text-slate-300"
            >
              Inactivate all scheduled / recurring pickup jobs in LocalMile Plus
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeactivate}
            disabled={isSubmitting}
            className="text-xs font-semibold flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deactivating...</span>
              </>
            ) : (
              <>
                <ShieldOff className="h-3.5 w-3.5" />
                <span>Confirm Deactivate LocalMile</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
