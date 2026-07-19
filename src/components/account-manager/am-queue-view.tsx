"use client"

import React, { useState, useMemo } from 'react';
import { Lead, Appointment } from '@/lib/types';
import { computeAmPriority, AmQueueItem, sortQueueItems, getSydneyDateString } from '@/lib/account-manager/compute-am-priority';
import { getStatusColor } from '@/lib/status-colors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateLeadDetails, logActivity, updateTaskCompletion } from '@/services/firebase';
import { 
  Phone, Mail, Calendar, FileText, CheckCircle, Clock, 
  MoreVertical, Eye, BellOff, DollarSign, ListChecks, CheckSquare 
} from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { format, addDays } from 'date-fns';

interface AmQueueViewProps {
  leads: Lead[];
  appointments: Appointment[];
  onCall: (leadId: string, phone: string) => void;
  onEmail: (lead: Lead) => void;
  onNotes: (lead: Lead) => void;
  onClickLead: (leadId: string) => void;
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
}

export function AmQueueView({
  leads,
  appointments,
  onCall,
  onEmail,
  onNotes,
  onClickLead,
  setLeads
}: AmQueueViewProps) {
  const [snoozeOpenId, setSnoozeOpenId] = useState<string | null>(null);

  // Compute and group the queue items
  const now = useMemo(() => new Date(), []);
  
  const queueItems = useMemo(() => {
    return leads
      .map(lead => {
        const leadAppts = appointments.filter(a => a.leadId === lead.id);
        return computeAmPriority(lead, leadAppts, now);
      })
      .filter(item => {
        // Exclude items that are currently snoozed in the future
        if (item.lead.snoozedUntil) {
          try {
            const snoozeDate = new Date(item.lead.snoozedUntil);
            if (!isNaN(snoozeDate.getTime()) && snoozeDate > now) {
              return false;
            }
          } catch {
            return true;
          }
        }
        return true;
      });
  }, [leads, appointments, now]);

  // Group items
  const grouped = useMemo(() => {
    const overdue: AmQueueItem[] = [];
    const due_today: AmQueueItem[] = [];
    const at_risk: AmQueueItem[] = [];
    const suggested: AmQueueItem[] = [];

    queueItems.forEach(item => {
      if (item.group === 'overdue') overdue.push(item);
      else if (item.group === 'due_today') due_today.push(item);
      else if (item.group === 'at_risk') at_risk.push(item);
      else suggested.push(item);
    });

    // Sort within groups descending by score
    overdue.sort(sortQueueItems);
    due_today.sort(sortQueueItems);
    at_risk.sort(sortQueueItems);
    suggested.sort(sortQueueItems);

    return { overdue, due_today, at_risk, suggested };
  }, [queueItems]);

  // Derived stats
  const totalCount = queueItems.length;
  const overdueCount = grouped.overdue.length;
  const dueTodayCount = grouped.due_today.length;
  const atRiskCount = grouped.at_risk.length;
  const suggestedCount = grouped.suggested.length;

  const handleSnooze = async (lead: Lead, days: number) => {
    const snoozeDate = addDays(now, days);
    const snoozeISO = snoozeDate.toISOString();
    
    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, snoozedUntil: snoozeISO } : l));
    toast.success(`Snoozed ${lead.companyName} for ${days} ${days === 1 ? 'day' : 'days'}`);
    setSnoozeOpenId(null);

    try {
      await updateLeadDetails(lead.id, lead, { snoozedUntil: snoozeISO });
      await logActivity(lead.id, {
        type: 'Update',
        notes: `Snoozed lead until ${format(snoozeDate, 'PPpp')}.`
      });
    } catch (error) {
      toast.error('Failed to snooze lead');
      // Revert optimistic update
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, snoozedUntil: lead.snoozedUntil } : l));
    }
  };

  const handleClearSnooze = async (lead: Lead) => {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, snoozedUntil: undefined } : l));
    toast.success(`Snooze cleared for ${lead.companyName}`);

    try {
      await updateLeadDetails(lead.id, lead, { snoozedUntil: '' });
      await logActivity(lead.id, {
        type: 'Update',
        notes: 'Cleared snooze settings.'
      });
    } catch (error) {
      toast.error('Failed to clear snooze');
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, snoozedUntil: lead.snoozedUntil } : l));
    }
  };

  const handleCompleteTask = async (lead: Lead, taskId: string, taskTitle: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === lead.id && l.tasks) {
        return {
          ...l,
          tasks: l.tasks.map(t => t.id === taskId ? { ...t, isCompleted: true, completedAt: new Date().toISOString() } : t)
        };
      }
      return l;
    }));
    toast.success(`Completed task: "${taskTitle}"`);

    try {
      await updateTaskCompletion(lead.id, taskId, true);
      await logActivity(lead.id, {
        type: 'Update',
        notes: `Completed task: "${taskTitle}"`
      });
    } catch (error) {
      toast.error('Failed to update task');
      // Revert state
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, tasks: lead.tasks } : l));
    }
  };

  const handleClearCancellation = async (lead: Lead) => {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, cancellationRequested: false } : l));
    toast.success(`Cancellation request cleared for ${lead.companyName}`);

    try {
      await updateLeadDetails(lead.id, lead, { cancellationRequested: false });
      await logActivity(lead.id, {
        type: 'Update',
        notes: 'Cleared cancellation requested flag.'
      });
    } catch (error) {
      toast.error('Failed to update lead');
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, cancellationRequested: lead.cancellationRequested } : l));
    }
  };

  const handleFollowUpScheduled = async (lead: Lead, dateStr: string) => {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, followUpDate: dateStr } : l));
    toast.success(`Follow-up scheduled for ${dateStr}`);

    try {
      await updateLeadDetails(lead.id, lead, { followUpDate: dateStr });
      await logActivity(lead.id, {
        type: 'Update',
        notes: `Scheduled new follow-up date: ${dateStr}`
      });
    } catch (error) {
      toast.error('Failed to set follow-up');
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, followUpDate: lead.followUpDate } : l));
    }
  };

  const handleAction = async (item: AmQueueItem) => {
    const { lead, nextAction } = item;
    if (nextAction.kind === 'call') {
      const phone = lead.customerPhone || lead.contacts?.[0]?.phone;
      if (phone) {
        onCall(lead.id, phone);
      } else {
        toast.error('No phone number available for this lead.');
      }
    } else if (nextAction.kind === 'email') {
      onEmail(lead);
    } else if (nextAction.kind === 'save-call') {
      const phone = lead.customerPhone || lead.contacts?.[0]?.phone;
      if (phone) {
        onCall(lead.id, phone);
      } else {
        onNotes(lead);
      }
    } else if (nextAction.kind === 'meeting') {
      onClickLead(lead.id);
    } else if (nextAction.kind === 'convert-trial') {
      onClickLead(lead.id);
    } else {
      onClickLead(lead.id);
    }
  };

  // Helper to render queue sections
  const renderSection = (title: string, items: AmQueueItem[], borderClass: string, badgeBg: string, badgeText: string) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Badge className={`${badgeBg} ${badgeText} font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 border-none`}>
            {title}
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">({items.length} items)</span>
        </div>
        <div className="space-y-2">
          {items.map(item => {
            const lead = item.lead;
            const primaryContact = lead.contacts?.[0];
            const contactName = primaryContact?.name || lead.discoveryData?.personSpokenWithName || 'No primary contact';
            
            // Format days since last contact
            let lastContactLabel = 'Never contacted';
            const lastContactStr = lead.lastContactedDate || lead.lastProspected || lead.dateLeadEntered;
            if (lastContactStr) {
              const lastDate = new Date(lastContactStr);
              if (!isNaN(lastDate.getTime())) {
                const daysDiff = Math.max(0, Math.round((now.getTime() - lastDate.getTime()) / (24 * 3600 * 1000)));
                lastContactLabel = `${daysDiff}d ago`;
              }
            }

            return (
              <div 
                key={lead.id} 
                className={`bg-white border-l-4 ${borderClass} rounded-r-xl border border-slate-100 hover:shadow-md transition-all duration-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => onClickLead(lead.id)}
                      className="font-bold text-[#095c7b] text-base hover:underline text-left"
                    >
                      {lead.companyName}
                    </button>
                    {lead.prospectPlusId && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        {lead.prospectPlusId}
                      </span>
                    )}
                    {item.mrrAtStake !== undefined && item.mrrAtStake > 0 && (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] px-1.5 font-bold">
                        <DollarSign className="h-3 w-3 -mr-0.5 inline" />
                        {Math.round(item.mrrAtStake)} MRR
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.reasonChips.map((chip, idx) => (
                      <Badge 
                        key={idx}
                        style={{ 
                          backgroundColor: getStatusColor(chip, '#f1f5f9'), 
                          color: '#ffffff'
                        }}
                        className="text-[10px] font-semibold py-0 px-2"
                      >
                        {chip}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Contact: {lastContactLabel}
                    </span>
                    <span>
                      Franchisee: <strong className="text-slate-700">{lead.franchisee || 'Unassigned'}</strong>
                    </span>
                    {contactName && (
                      <span>
                        Person: <strong className="text-slate-700">{contactName}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                  {/* Primary action button */}
                  <Button 
                    onClick={() => handleAction(item)}
                    size="sm"
                    className="bg-[#095c7b] hover:bg-[#084c66] text-white rounded-lg flex items-center gap-1.5 text-xs font-semibold px-4 shadow-sm"
                  >
                    {item.nextAction.kind === 'call' && <Phone className="h-3.5 w-3.5" />}
                    {item.nextAction.kind === 'save-call' && <Phone className="h-3.5 w-3.5" />}
                    {item.nextAction.kind === 'email' && <Mail className="h-3.5 w-3.5" />}
                    {item.nextAction.kind === 'meeting' && <Calendar className="h-3.5 w-3.5" />}
                    {item.nextAction.kind === 'convert-trial' && <CheckCircle className="h-3.5 w-3.5" />}
                    {item.nextAction.kind === 'follow-up' && <Clock className="h-3.5 w-3.5" />}
                    {item.nextAction.label}
                  </Button>

                  {/* Snooze control */}
                  <Popover 
                    open={snoozeOpenId === lead.id} 
                    onOpenChange={(open) => setSnoozeOpenId(open ? lead.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-slate-200"
                        title="Snooze Lead"
                      >
                        <BellOff className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1.5" align="end">
                      <div className="text-xs font-bold text-slate-700 px-2 py-1.5 border-b border-slate-100 mb-1">
                        Snooze priority alerts
                      </div>
                      <button 
                        onClick={() => handleSnooze(lead, 1)}
                        className="w-full text-left text-xs font-medium text-slate-600 hover:bg-slate-50 rounded px-2.5 py-1.5"
                      >
                        Snooze for 1 day
                      </button>
                      <button 
                        onClick={() => handleSnooze(lead, 3)}
                        className="w-full text-left text-xs font-medium text-slate-600 hover:bg-slate-50 rounded px-2.5 py-1.5"
                      >
                        Snooze for 3 days
                      </button>
                      <button 
                        onClick={() => handleSnooze(lead, 7)}
                        className="w-full text-left text-xs font-medium text-slate-600 hover:bg-slate-50 rounded px-2.5 py-1.5"
                      >
                        Snooze for 1 week
                      </button>
                    </PopoverContent>
                  </Popover>

                  {/* Overflow menu for secondary actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded-lg"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onClickLead(lead.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNotes(lead)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Add Notes
                      </DropdownMenuItem>
                      {lead.cancellationRequested && (
                        <DropdownMenuItem onClick={() => handleClearCancellation(lead)}>
                          <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                          Resolve Cancellation
                        </DropdownMenuItem>
                      )}
                      {lead.tasks?.some(t => !t.isCompleted) && (
                        <>
                          <DropdownMenuSeparator />
                          <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                            Pending Tasks
                          </div>
                          {lead.tasks.filter(t => !t.isCompleted).map(task => (
                            <DropdownMenuItem 
                              key={task.id} 
                              onClick={() => handleCompleteTask(lead, task.id, task.title)}
                              className="text-xs font-medium text-slate-600"
                            >
                              <CheckSquare className="mr-2 h-3.5 w-3.5 text-slate-400" />
                              Complete: {task.title.slice(0, 15)}...
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center bg-white border border-slate-150 rounded-2xl shadow-sm">
        <div className="bg-[#095c7b]/10 text-[#095c7b] p-4 rounded-full mb-4">
          <ListChecks className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold text-[#095c7b] mb-1">Queue clear — 0 remaining</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Fantastic! You've cleared all urgent follow-ups, hot inbound leads, and trial escalations in your queue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Header Summary Strip */}
      <div className="bg-[#095c7b]/5 border border-[#095c7b]/10 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-[#095c7b] font-semibold">
        <span className="flex items-center gap-1 font-bold text-[#095c7b]">
          <ListChecks className="h-4 w-4" />
          Queue Summary:
        </span>
        {overdueCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            {overdueCount} overdue
          </span>
        )}
        {dueTodayCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            {dueTodayCount} due today
          </span>
        )}
        {atRiskCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {atRiskCount} at risk
          </span>
        )}
        {suggestedCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            {suggestedCount} suggested
          </span>
        )}
      </div>

      {/* Render sections sequentially by priority */}
      <div className="space-y-6">
        {renderSection('Overdue', grouped.overdue, 'border-rose-500', 'bg-rose-100', 'text-rose-800')}
        {renderSection('Due Today', grouped.due_today, 'border-orange-500', 'bg-orange-100', 'text-orange-800')}
        {renderSection('At Risk', grouped.at_risk, 'border-amber-500', 'bg-amber-100', 'text-amber-800')}
        {renderSection('Suggested', grouped.suggested, 'border-slate-400', 'bg-slate-100', 'text-slate-800')}
      </div>
    </div>
  );
}
