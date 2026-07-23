'use client';

import React, { useState, useEffect } from 'react';
import { Lead } from '@/lib/types';
import { firestore } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { encryptLeadId } from '@/lib/localmile-security';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Mail,
  Copy,
  Send,
  UserPlus,
  Users,
  Search,
  Check,
  X,
  Loader2,
  Building,
  Hash,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ShareOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

export function ShareOpportunityDialog({
  open,
  onOpenChange,
  lead,
}: ShareOpportunityDialogProps) {
  const { toast } = useToast();
  
  // Recipients & Form States
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [toInput, setToInput] = useState<string>('');
  const [ccInput, setCcInput] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  
  // Active Users State
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  
  // Submit State
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Initialize modal state when lead opens
  useEffect(() => {
    if (open && lead) {
      const companyName = lead.companyName || (lead as any).tradingName || 'Opportunity';
      setSubject(`Shared LPO Opportunity: ${companyName}`);
      setCustomMessage(`Hi,\n\nPlease review the public details for ${companyName} via the link below.\n\nKind regards,`);
      setToEmails([]);
      setCcEmails([]);
      setToInput('');
      setCcInput('');
      setIsCopied(false);

      // Fetch system users
      fetchSystemUsers();
    }
  }, [open, lead]);

  const fetchSystemUsers = async () => {
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(firestore, 'users'));
      const users: SystemUser[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (!data.disabled && data.email) {
          users.push({
            id: doc.id,
            name: data.displayName || data.name || data.email.split('@')[0] || 'User',
            email: data.email.toLowerCase().trim(),
            role: data.activeRole || data.role || data.defaultRole || 'Staff',
          });
        }
      });
      users.sort((a, b) => a.name.localeCompare(b.name));
      setSystemUsers(users);

      // Expand all role accordions by default
      const roleMap: Record<string, boolean> = {};
      users.forEach(u => {
        roleMap[u.role] = true;
      });
      setExpandedRoles(roleMap);
    } catch (err) {
      console.error('Failed to load active users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  if (!lead) return null;

  const publicToken = encryptLeadId(lead.id);
  const getPublicUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/lpo-opportunity/${encodeURIComponent(publicToken)}`;
  };

  const handleCopyLink = () => {
    const url = getPublicUrl();
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    toast({
      title: 'Public Link Copied!',
      description: 'The public opportunity link has been copied to your clipboard.',
    });
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Recipient addition helpers
  const addEmailToField = (field: 'to' | 'cc', emailStr: string) => {
    const email = emailStr.trim().toLowerCase();
    if (!email || !email.includes('@')) return;

    if (field === 'to') {
      if (!toEmails.includes(email)) {
        setToEmails(prev => [...prev, email]);
      }
      setToInput('');
    } else {
      if (!ccEmails.includes(email)) {
        setCcEmails(prev => [...prev, email]);
      }
      setCcInput('');
    }
  };

  const removeEmailFromField = (field: 'to' | 'cc', email: string) => {
    if (field === 'to') {
      setToEmails(prev => prev.filter(e => e !== email));
    } else {
      setCcEmails(prev => prev.filter(e => e !== email));
    }
  };

  const handleKeyDownInput = (field: 'to' | 'cc', e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ' '].includes(e.key)) {
      e.preventDefault();
      const val = field === 'to' ? toInput : ccInput;
      addEmailToField(field, val);
    }
  };

  // Group filtered users by Role
  const filteredUsers = systemUsers.filter(u => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const groupedUsersByRole = filteredUsers.reduce((acc, user) => {
    const r = user.role || 'Staff';
    if (!acc[r]) acc[r] = [];
    acc[r].push(user);
    return acc;
  }, {} as Record<string, SystemUser[]>);

  const roleKeys = Object.keys(groupedUsersByRole).sort();

  const toggleRoleExpand = (role: string) => {
    setExpandedRoles(prev => ({ ...prev, [role]: !prev[role] }));
  };

  // Send Email Action
  const handleSendEmail = async () => {
    // Include any typed email in To input if not empty
    let finalTo = [...toEmails];
    if (toInput.trim() && toInput.includes('@') && !finalTo.includes(toInput.trim().toLowerCase())) {
      finalTo.push(toInput.trim().toLowerCase());
    }

    let finalCc = [...ccEmails];
    if (ccInput.trim() && ccInput.includes('@') && !finalCc.includes(ccInput.trim().toLowerCase())) {
      finalCc.push(ccInput.trim().toLowerCase());
    }

    if (finalTo.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Recipient Required',
        description: 'Please specify at least one email address in the "To" field.',
      });
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch('/api/lpo-opportunities/share-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          to: finalTo,
          cc: finalCc,
          subject: subject.trim(),
          message: customMessage.trim(),
          token: publicToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send email');
      }

      toast({
        title: 'Email Sent Successfully!',
        description: `Opportunity link emailed to ${finalTo.join(', ')}.`,
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error('Send opportunity email error:', err);
      toast({
        variant: 'destructive',
        title: 'Send Failed',
        description: err.message || 'Failed to dispatch opportunity email.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const companyName = lead.companyName || (lead as any).tradingName || 'Opportunity';
  const prospectPlusId = lead.prospectPlusId || (lead as any).lpoProspectPlusId || `LPO-${lead.id.substring(0, 8).toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white rounded-2xl p-0 overflow-hidden border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <DialogHeader className="bg-[#095c7b] text-white p-6 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                <Mail className="h-6 w-6 text-cyan-200" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                  Share Public Opportunity Link
                </DialogTitle>
                <DialogDescription className="text-xs text-cyan-100 mt-0.5">
                  Send encrypted public page link to team members or external partners
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleCopyLink}
              className="bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 rounded-xl flex items-center gap-1.5"
            >
              {isCopied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              <span>{isCopied ? 'Copied Link!' : 'Copy Link'}</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Body - 2 Columns */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* Left Column: Email Form */}
          <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            
            {/* Lead Brief Banner */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 text-sm block">{companyName}</span>
                <span className="text-slate-500 flex items-center gap-1 font-medium">
                  <Hash className="h-3 w-3 text-[#095c7b]" />
                  Prospect+ ID: {prospectPlusId}
                </span>
              </div>
              <Badge variant="outline" className="bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/20 font-bold">
                {lead.status || lead.customerStatus || 'LPO Opportunity'}
              </Badge>
            </div>

            {/* To Recipients Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>To (Recipients)*</span>
                <span className="text-[11px] font-normal text-slate-400">Press enter or comma to add</span>
              </label>
              <div className="min-h-[42px] p-2 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#095c7b]/20 focus-within:border-[#095c7b]">
                {toEmails.map(email => (
                  <Badge key={email} className="bg-[#095c7b] text-white text-xs py-1 px-2.5 rounded-lg flex items-center gap-1.5">
                    <span>{email}</span>
                    <button type="button" onClick={() => removeEmailFromField('to', email)} className="hover:bg-white/20 rounded p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  type="email"
                  placeholder={toEmails.length === 0 ? "Type email address or pick from users list..." : "Add another email..."}
                  value={toInput}
                  onChange={e => setToInput(e.target.value)}
                  onKeyDown={e => handleKeyDownInput('to', e)}
                  onBlur={() => addEmailToField('to', toInput)}
                  className="flex-1 min-w-[180px] text-xs bg-transparent border-none outline-none focus:ring-0 p-1 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* CC Recipients Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>CC (Multiple People)</span>
                <span className="text-[11px] font-normal text-slate-400">Press enter or comma to add</span>
              </label>
              <div className="min-h-[42px] p-2 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#095c7b]/20 focus-within:border-[#095c7b]">
                {ccEmails.map(email => (
                  <Badge key={email} variant="secondary" className="bg-slate-200 text-slate-800 text-xs py-1 px-2.5 rounded-lg flex items-center gap-1.5">
                    <span>{email}</span>
                    <button type="button" onClick={() => removeEmailFromField('cc', email)} className="hover:bg-slate-300 rounded p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  type="email"
                  placeholder={ccEmails.length === 0 ? "Add CC email address..." : "Add another CC email..."}
                  value={ccInput}
                  onChange={e => setCcInput(e.target.value)}
                  onKeyDown={e => handleKeyDownInput('cc', e)}
                  onBlur={() => addEmailToField('cc', ccInput)}
                  className="flex-1 min-w-[180px] text-xs bg-transparent border-none outline-none focus:ring-0 p-1 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Subject
              </label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="text-xs border-slate-200 rounded-xl bg-white"
              />
            </div>

            {/* Custom Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Personal Message (Optional)
              </label>
              <Textarea
                rows={4}
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="Type a custom message to include in the email..."
                className="text-xs border-slate-200 rounded-xl bg-white leading-relaxed"
              />
            </div>

          </div>

          {/* Right Column: Active System Users Directory */}
          <div className="w-full lg:w-80 bg-slate-50/70 p-5 flex flex-col overflow-hidden shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#095c7b]" />
                Active System Users
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {filteredUsers.length} Users
              </span>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search user by name or email..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="pl-8 text-xs bg-white border-slate-200 rounded-xl h-8"
              />
            </div>

            {/* Users Directory List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingUsers ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#095c7b]" />
                  Loading active users...
                </div>
              ) : roleKeys.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  No active users match search query.
                </div>
              ) : (
                roleKeys.map(role => {
                  const usersInRole = groupedUsersByRole[role];
                  const isExpanded = expandedRoles[role] !== false;

                  return (
                    <div key={role} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
                      {/* Role Accordion Header */}
                      <button
                        type="button"
                        onClick={() => toggleRoleExpand(role)}
                        className="w-full px-3 py-2 bg-slate-100/70 hover:bg-slate-100 text-left flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{role}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full font-semibold">
                            {usersInRole.length}
                          </span>
                        </span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                      </button>

                      {/* User Items */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100">
                          {usersInRole.map(user => (
                            <div key={user.id} className="p-2.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-slate-800 truncate">
                                  {user.name}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {user.email}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  title={`Add ${user.name} to To`}
                                  onClick={() => addEmailToField('to', user.email)}
                                  className="px-2 py-0.5 bg-[#095c7b]/10 hover:bg-[#095c7b] text-[#095c7b] hover:text-white rounded text-[10px] font-bold transition-colors"
                                >
                                  +To
                                </button>

                                <button
                                  type="button"
                                  title={`Add ${user.name} to CC`}
                                  onClick={() => addEmailToField('cc', user.email)}
                                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-700 text-slate-700 hover:text-white rounded text-[10px] font-bold transition-colors"
                                >
                                  +CC
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <DialogFooter className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 flex flex-row items-center justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
            className="text-xs font-medium text-slate-600 rounded-xl"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSendEmail}
              disabled={isSending || (toEmails.length === 0 && !toInput.trim())}
              className="bg-[#095c7b] hover:bg-[#074760] text-white font-bold text-xs rounded-xl px-5 shadow-sm flex items-center gap-2"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Send Opportunity Email</span>
            </Button>
          </div>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
