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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  PlusCircle,
  Users,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Lead } from '@/lib/types';
import type { LocalMileCompanyStatusResponse } from '@/services/localmile-company-service';

interface ReactivateLocalMileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  localMileStatus: LocalMileCompanyStatusResponse | null;
  onSuccess?: () => void;
}

export function ReactivateLocalMileDialog({
  isOpen,
  onOpenChange,
  lead,
  localMileStatus,
  onSuccess,
}: ReactivateLocalMileDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [restoreScheduledJobs, setRestoreScheduledJobs] = useState<boolean>(true);

  // Available contacts with emails
  const eligibleContacts = (lead.contacts || []).filter(
    (c) => c.email && typeof c.email === 'string' && c.email.includes('@')
  );

  const pmpoService = (lead.services || []).find((s: any) => {
    const sName = String(s.name || s.service || '').toLowerCase();
    return sName.includes('pmpo') || sName.includes('outgoing mail lodgement');
  });

  const pmpoFreq = pmpoService?.frequency;
  const isRecurringPmpo = Boolean(
    pmpoService && (
      (Array.isArray(pmpoFreq) && pmpoFreq.length > 0) ||
      (typeof pmpoFreq === 'string' && pmpoFreq.trim().toLowerCase() !== 'adhoc' && pmpoFreq.trim().length > 0)
    ) &&
    (!(pmpoService as any).serviceType || String((pmpoService as any).serviceType).toLowerCase() !== 'adhoc')
  );

  // Map contacts to their LocalMile database user status
  const localMileUsers = localMileStatus?.users || [];

  const contactStatusList = eligibleContacts.map((c) => {
    const matchedUser = localMileUsers.find(
      (u) => u.email && c.email && u.email.trim().toLowerCase() === c.email.trim().toLowerCase()
    );

    const isUserActive = Boolean(
      matchedUser && (matchedUser.status === 'Active' || matchedUser.status === 'active') && !matchedUser.disabled
    );

    const isUserExisting = Boolean(matchedUser && !isUserActive);
    const needsNewAccess = !matchedUser;

    return {
      contact: c,
      matchedUser,
      isUserActive,
      isUserExisting,
      needsNewAccess,
    };
  });

  const needingAccessContacts = contactStatusList.filter((item) => item.needsNewAccess);
  const needingAccessCount = needingAccessContacts.length;

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const selectAllNeedingAccess = () => {
    const ids = needingAccessContacts.map((item) => item.contact.id);
    setSelectedContactIds(ids);
  };

  const selectAll = () => {
    setSelectedContactIds(eligibleContacts.map((c) => c.id));
  };

  const clearSelection = () => {
    setSelectedContactIds([]);
  };

  // Users in LocalMile that are not matched to any contact on the lead
  const unlinkedLocalMileUsers = localMileUsers.filter(
    (u) =>
      u.email &&
      !eligibleContacts.some(
        (c) => c.email && c.email.trim().toLowerCase() === u.email.trim().toLowerCase()
      )
  );

  const selectedContactItems = contactStatusList.filter((item) =>
    selectedContactIds.includes(item.contact.id)
  );

  const handleReactivate = async () => {
    setIsSubmitting(true);
    try {
      const selectedContactsPayload = selectedContactItems.map((item) => ({
        id: item.contact.id,
        email: item.contact.email,
        name: item.contact.name || '',
        phone: item.contact.phone || '',
      }));

      const staffName =
        userProfile?.displayName ||
        user?.displayName ||
        user?.email ||
        'Staff';

      const res = await fetch('/api/localmile/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: lead.id,
          contacts: selectedContactsPayload,
          contactId: selectedContactsPayload.length === 1 ? selectedContactsPayload[0].id : undefined,
          contactEmail: selectedContactsPayload.length === 1 ? selectedContactsPayload[0].email : undefined,
          reactivateScheduledJobs: restoreScheduledJobs,
          reactivatedBy: staffName,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to reactivate company.');
      }

      const newProvisionCount = selectedContactItems.filter((i) => i.needsNewAccess).length;
      const resendCount = selectedContactItems.filter((i) => !i.needsNewAccess).length;

      let contactMsg = '';
      if (newProvisionCount > 0 && resendCount > 0) {
        contactMsg = ` Provisioned access for ${newProvisionCount} contact(s) and resent credentials to ${resendCount} existing contact(s).`;
      } else if (newProvisionCount > 0) {
        contactMsg = ` Provisioned new LocalMile access for ${newProvisionCount} contact(s).`;
      } else if (resendCount > 0) {
        contactMsg = ` Resent credentials to ${resendCount} contact(s).`;
      }

      toast({
        title: 'Company Reactivated',
        description: `Successfully restored ${lead.companyName || 'Company'} to active in LocalMile database.${contactMsg}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('[ReactivateLocalMileDialog] Error:', err);
      toast({
        variant: 'destructive',
        title: 'Reactivation Failed',
        description: err.message || 'An unexpected error occurred while reactivating.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onOpenChange(open)}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
            <RefreshCw className="h-5 w-5 text-emerald-600 animate-spin-reverse" />
            Reactivate in LocalMile
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400 pt-1">
            Restore account access for <strong>{lead.companyName || 'this company'}</strong> in the LocalMile database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status Alert Banner */}
          <Alert className="bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-xs font-bold uppercase tracking-wider">
              Current LocalMile Status: Cancelled
            </AlertTitle>
            <AlertDescription className="text-xs mt-1 space-y-1">
              <div>
                <strong>LocalMile Company ID:</strong> {lead.id}
              </div>
              {localMileStatus?.deactivatedAt && (
                <div>
                  <strong>Deactivated On:</strong>{' '}
                  {new Date(localMileStatus.deactivatedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
              <div>
                <strong>LocalMile Database Users:</strong> {localMileUsers.length} user(s) ({localMileStatus?.activeUsersCount || 0} active, {localMileStatus?.pendingUsersCount || 0} pending)
              </div>
            </AlertDescription>
          </Alert>

          {/* Interactive Multi-Select Contact Selection & Status List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <UserCheck className="h-3.5 w-3.5 text-[#095c7b]" />
                Select Contact(s) for LocalMile Access
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {selectedContactIds.length === 0
                  ? 'None selected'
                  : `${selectedContactIds.length} of ${eligibleContacts.length} selected`}
              </span>
            </div>

            {/* Quick-action selection chips */}
            {eligibleContacts.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {needingAccessCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllNeedingAccess}
                    className="h-7 px-2.5 text-[11px] border-sky-300 bg-sky-50/80 hover:bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 font-medium"
                  >
                    <Sparkles className="h-3 w-3 mr-1 text-sky-600" />
                    Select All Needing Access ({needingAccessCount})
                  </Button>
                )}
                {eligibleContacts.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectAll}
                      className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      Select All
                    </Button>
                    {selectedContactIds.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearSelection}
                        className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      >
                        Clear
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Contact Cards */}
            <div className="space-y-2">
              {contactStatusList.map(({ contact, isUserActive, isUserExisting, needsNewAccess }) => {
                const isSelected = selectedContactIds.includes(contact.id);

                return (
                  <div
                    key={contact.id}
                    onClick={() => toggleContact(contact.id)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-lg border text-xs transition-all block cursor-pointer select-none',
                      isSelected
                        ? needsNewAccess
                          ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-1 ring-sky-500 shadow-xs'
                          : 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-1 ring-emerald-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleContact(contact.id)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            isSelected && needsNewAccess && 'data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600',
                            isSelected && !needsNewAccess && 'data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600'
                          )}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                            <span>{contact.name || 'Unnamed Contact'}</span>
                            {contact.isPrimary && (
                              <span className="text-[10px] font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded shrink-0">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate" title={contact.email}>
                            {contact.email}
                            {contact.phone && <span className="ml-2 text-slate-400">· {contact.phone}</span>}
                          </div>
                        </div>
                      </div>

                      {isUserActive ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold text-[10px] px-2 py-0.5 flex items-center gap-1 shrink-0"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Has Active Access
                        </Badge>
                      ) : isUserExisting ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 font-semibold text-[10px] px-2 py-0.5 flex items-center gap-1 shrink-0"
                        >
                          <RefreshCw className="h-3 w-3 text-amber-600" />
                          Existing Account
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 font-semibold text-[10px] px-2 py-0.5 flex items-center gap-1 shrink-0"
                        >
                          <PlusCircle className="h-3 w-3 text-sky-600" />
                          Needs New Access
                        </Badge>
                      )}
                    </div>

                    {/* Contextual Action Note when Selected */}
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        {needsNewAccess ? (
                          <div className="text-[11px] text-sky-900 dark:text-sky-200 flex items-start gap-1.5 font-normal">
                            <Sparkles className="h-3.5 w-3.5 text-sky-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>Will Provision New Access:</strong> Confirming will provision a new user account for <strong>{contact.name || contact.email}</strong> in LocalMile and dispatch their activation invite link.
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-1.5 font-normal">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>Will Resend Credentials:</strong> Confirming will restore company access and resend activation / login details to <strong>{contact.name || contact.email}</strong>.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {eligibleContacts.length === 0 && (
                <div className="p-3 text-center rounded-lg border border-dashed text-xs text-muted-foreground">
                  No contacts with valid email addresses found for this company.
                </div>
              )}
            </div>

            {/* Selection Status Summary */}
            {selectedContactIds.length > 0 ? (
              <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>
                  <strong>{selectedContactIds.length} contact(s) selected:</strong>{' '}
                  {selectedContactItems.filter((i) => i.needsNewAccess).length} to provision,{' '}
                  {selectedContactItems.filter((i) => !i.needsNewAccess).length} to resend.
                </span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline ml-2 cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            ) : (
              <div className="p-2 rounded-md bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 italic">
                No contacts selected. Company will be reactivated and existing database users re-enabled without dispatching new email invites.
              </div>
            )}
          </div>

            {/* Other LocalMile Users not listed in ProspectPlus Contacts */}
            {unlinkedLocalMileUsers.length > 0 && (
              <div className="pt-1.5 mt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Other User(s) Found in LocalMile Database
                </div>
                <div className="space-y-1">
                  {unlinkedLocalMileUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-1.5 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between gap-2"
                    >
                      <div className="truncate text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{u.name || 'User'}</span> ({u.email})
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-medium px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-200 shrink-0"
                      >
                        {u.status || 'Active'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Action Explanations */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Reactivation Actions
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
              <li>Sets company status back to <span className="text-emerald-700 font-semibold">active</span> in LocalMile.</li>
              <li>Re-enables existing users and clears cancellation flags.</li>
              <li>Restores recurring collection scheduled jobs (if applicable).</li>
              <li>Logs a permanent audit record in ProspectPlus activity history.</li>
            </ul>
          </div>

          {/* Scheduled Jobs Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {isRecurringPmpo ? (
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="restore-scheduled-jobs"
                  checked={restoreScheduledJobs}
                  onCheckedChange={(checked) => setRestoreScheduledJobs(Boolean(checked))}
                />
                <div className="grid gap-1 leading-none">
                  <label
                    htmlFor="restore-scheduled-jobs"
                    className="text-xs font-semibold cursor-pointer text-slate-800 dark:text-slate-200"
                  >
                    Restore PMPO Scheduled Collections
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Reactivates recurring scheduled parcel collections in the LocalMile database.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      PMPO Collection Schedule: Adhoc
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Adhoc collection service does not require recurring scheduled collections.
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold bg-slate-100 text-slate-600 border-slate-200 shrink-0">
                  No Schedule Needed
                </Badge>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            size="sm"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleReactivate}
            disabled={isSubmitting}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Reactivating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Confirm Reactivation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
