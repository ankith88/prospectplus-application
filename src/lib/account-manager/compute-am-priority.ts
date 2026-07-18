import { Lead, Appointment, Task } from '../types';

export interface AmQueueItem {
  lead: Lead;
  score: number;                 // higher = more urgent
  reasonChips: string[];         // e.g. ["Cancellation requested", "No contact 24d"]
  primaryReason: string;         // the single headline reason, drives grouping
  nextAction: {                  // one unambiguous action for the row
    kind: 'call' | 'email' | 'meeting' | 'save-call' | 'follow-up' | 'convert-trial';
    label: string;               // e.g. "Save call — cancellation requested"
  };
  group: 'overdue' | 'due_today' | 'at_risk' | 'suggested';
  mrrAtStake?: number;           // from lead.rate / services, for display + weighting
}

export const AM_QUEUE_CONFIG = {
  COLD_DAYS_THRESHOLD: 14,
  TRIAL_ENDING_WINDOW_DAYS: 7,
  HOT_LEAD_SLA_BUSINESS_HOURS: 8,
  
  // Scoring weights
  weights: {
    cancellation: 1000,
    hotLead: 800,
    trialEnding: 600,
    appointmentToday: 500,
    taskDue: 400,
    overdueFollowUp: 300,
    goneCold: 100,
    mrrMultiplier: 0.1, // added weight per dollar of MRR
    hotLeadAgeMultiplier: 5, // added weight per business hour elapsed for hot leads
    trialEndingAgeMultiplier: 10, // added weight per day of trialing age
    coldDaysMultiplier: 2
  },
  
  churnStatuses: ['Cancellation Requested', 'Cancellation Pending', 'Save Stage', 'Lost Customer Opportunity'],
  trialingStatuses: ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'Trialing']
};

/**
 * Formats a date to YYYY-MM-DD in Sydney timezone.
 */
export function getSydneyDateString(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  const day = parts.find(p => p.type === 'day')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const year = parts.find(p => p.type === 'year')?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Calculates business hours elapsed between start and end date in Sydney timezone.
 * Sydney business hours are Mon-Fri 09:00 - 17:00.
 */
export function getElapsedBusinessHours(start: Date, end: Date): number {
  if (start >= end) return 0;
  
  const realDiffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (realDiffHours > 720) {
    return 240; // cap calculation if difference is huge (over 30 days)
  }
  
  let current = new Date(start.getTime());
  let businessHours = 0;
  
  const stepMs = 30 * 60 * 1000; // 30 minute steps
  while (current < end) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Australia/Sydney',
      hour12: false,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric'
    });
    const parts = formatter.formatToParts(current);
    const wday = parts.find(p => p.type === 'weekday')?.value;
    const hourVal = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    
    const isWeekend = wday === 'Sat' || wday === 'Sun';
    const isBizHour = !isWeekend && hourVal >= 9 && hourVal < 17;
    
    if (isBizHour) {
      businessHours += 0.5;
    }
    current.setTime(current.getTime() + stepMs);
  }
  return businessHours;
}

export function computeAmPriority(
  lead: Lead,
  appointments: Appointment[],
  now: Date
): AmQueueItem {
  const reasonChips: string[] = [];
  const matchedSignals: Array<{
    score: number;
    primaryReason: string;
    group: 'overdue' | 'due_today' | 'at_risk' | 'suggested';
    nextAction: AmQueueItem['nextAction'];
  }> = [];

  // Calculate MRR at stake
  let mrr = lead.rate ?? 0;
  if (lead.services && lead.services.length > 0) {
    const servicesTotal = lead.services.reduce((sum, s) => sum + (s.rate ?? 0), 0);
    if (servicesTotal > 0) mrr = servicesTotal;
  }

  const todayStr = getSydneyDateString(now);

  // 1. Cancellation requested / Churn status
  const isCancellation = lead.cancellationRequested === true || 
                         AM_QUEUE_CONFIG.churnStatuses.includes(lead.customerStatus || '') ||
                         AM_QUEUE_CONFIG.churnStatuses.includes(lead.status || '');
  if (isCancellation) {
    const reason = lead.cancellationRequested ? 'Cancellation requested' : `Status: ${lead.customerStatus || lead.status}`;
    reasonChips.push(reason);
    matchedSignals.push({
      score: AM_QUEUE_CONFIG.weights.cancellation + (mrr * AM_QUEUE_CONFIG.weights.mrrMultiplier),
      primaryReason: reason,
      group: 'at_risk',
      nextAction: {
        kind: 'save-call',
        label: lead.nextBestAction || 'Save call — cancellation requested'
      }
    });
  }

  // 2. Hot inbound / website lead
  const isHotLead = (lead.customerStatus === 'Hot Lead') && 
                    (lead.bucket === 'inbound' || lead.customerSource === 'Website');
  if (isHotLead) {
    let elapsedBizHours = 0;
    if (lead.dateLeadEntered) {
      const enteredDate = new Date(lead.dateLeadEntered);
      if (!isNaN(enteredDate.getTime())) {
        elapsedBizHours = getElapsedBusinessHours(enteredDate, now);
      }
    }
    const isOverdue = elapsedBizHours > AM_QUEUE_CONFIG.HOT_LEAD_SLA_BUSINESS_HOURS;
    const reason = `Hot inbound lead (${Math.round(elapsedBizHours)}h elapsed)`;
    reasonChips.push(reason);
    if (isOverdue) {
      reasonChips.push('Hot lead SLA breached');
    }
    matchedSignals.push({
      score: AM_QUEUE_CONFIG.weights.hotLead + 
             (elapsedBizHours * AM_QUEUE_CONFIG.weights.hotLeadAgeMultiplier) + 
             (mrr * AM_QUEUE_CONFIG.weights.mrrMultiplier),
      primaryReason: reason,
      group: isOverdue ? 'overdue' : 'due_today',
      nextAction: {
        kind: 'call',
        label: lead.nextBestAction || 'Call — Hot inbound lead'
      }
    });
  }

  // 3. Trial ending
  const isTrial = AM_QUEUE_CONFIG.trialingStatuses.includes(lead.customerStatus || '') ||
                  AM_QUEUE_CONFIG.trialingStatuses.includes(lead.status || '') ||
                  (lead.customerStatus || '').startsWith('Trialing');
  if (isTrial) {
    let daysSinceTrialStart = 0;
    if (lead.trialStartedAt) {
      const trialStart = new Date(lead.trialStartedAt);
      if (!isNaN(trialStart.getTime())) {
        daysSinceTrialStart = Math.max(0, (now.getTime() - trialStart.getTime()) / (24 * 3600 * 1000));
      }
    } else {
      // Fallback: assume trial started 7 days ago if no trialStartedAt is present
      daysSinceTrialStart = 7;
    }
    // Trial duration is 14 days. We are in the trial ending window if days remaining <= trialEndingWindowDays
    const daysRemaining = 14 - daysSinceTrialStart;
    if (daysRemaining <= AM_QUEUE_CONFIG.TRIAL_ENDING_WINDOW_DAYS) {
      const reason = `Trial ending (${Math.max(0, Math.round(daysRemaining))} days left)`;
      reasonChips.push(reason);
      matchedSignals.push({
        score: AM_QUEUE_CONFIG.weights.trialEnding + 
               (daysSinceTrialStart * AM_QUEUE_CONFIG.weights.trialEndingAgeMultiplier) + 
               (mrr * AM_QUEUE_CONFIG.weights.mrrMultiplier),
        primaryReason: reason,
        group: 'at_risk',
        nextAction: {
          kind: 'convert-trial',
          label: lead.nextBestAction || 'Convert trial — trial ending'
        }
      });
    }
  }

  // 4. Appointment today (excluding completed/cancelled)
  const activeApptsToday = appointments.filter(appt => {
    const d = appt.date || appt.appointmentDate || appt.duedate || appt.starttime;
    if (!d) return false;
    const status = appt.appointmentStatus || 'Pending';
    if (status === 'Completed' || status === 'Cancelled') return false;
    
    try {
      const apptDateStr = getSydneyDateString(new Date(d));
      return apptDateStr === todayStr;
    } catch {
      return false;
    }
  });

  if (activeApptsToday.length > 0) {
    const appt = activeApptsToday[0];
    const reason = `Appointment today: ${appt.type || 'Meeting'}`;
    reasonChips.push(reason);
    matchedSignals.push({
      score: AM_QUEUE_CONFIG.weights.appointmentToday + (mrr * AM_QUEUE_CONFIG.weights.mrrMultiplier),
      primaryReason: reason,
      group: 'due_today',
      nextAction: {
        kind: 'meeting',
        label: lead.nextBestAction || `Meeting — ${appt.type || 'Scheduled appointment'}`
      }
    });
  }

  // 5. Tasks due
  const incompleteTasks = lead.tasks?.filter(t => !t.isCompleted && t.dueDate) || [];
  incompleteTasks.forEach(task => {
    try {
      const taskDateStr = getSydneyDateString(new Date(task.dueDate));
      const isOverdue = taskDateStr < todayStr;
      const isDueToday = taskDateStr === todayStr;
      
      if (isOverdue || isDueToday) {
        const reason = isOverdue ? `Task overdue: ${task.title}` : `Task due: ${task.title}`;
        reasonChips.push(reason);
        matchedSignals.push({
          score: AM_QUEUE_CONFIG.weights.taskDue + (mrr * AM_QUEUE_CONFIG.weights.mrrMultiplier) + (isOverdue ? 50 : 0),
          primaryReason: reason,
          group: isOverdue ? 'overdue' : 'due_today',
          nextAction: {
            kind: 'follow-up',
            label: lead.nextBestAction || `Follow-up — ${task.title}`
          }
        });
      }
    } catch {
      // Ignore parsing errors
    }
  });

  // 6. Overdue follow-up date
  if (lead.followUpDate) {
    try {
      const followUpDateStr = getSydneyDateString(new Date(lead.followUpDate));
      if (followUpDateStr < todayStr) {
        const reason = 'Follow-up overdue';
        reasonChips.push(reason);
        matchedSignals.push({
          score: AM_QUEUE_CONFIG.weights.overdueFollowUp + (mrr * AM_QUEUE_CONFIG.weights.mrrMultiplier),
          primaryReason: reason,
          group: 'overdue',
          nextAction: {
            kind: 'follow-up',
            label: lead.nextBestAction || 'Follow-up — scheduled follow-up'
          }
        });
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // 7. Gone cold
  const lastContactStr = lead.lastContactedDate || lead.lastProspected || lead.dateLeadEntered;
  if (lastContactStr) {
    try {
      const lastContactDate = new Date(lastContactStr);
      if (!isNaN(lastContactDate.getTime())) {
        const daysCold = Math.max(0, (now.getTime() - lastContactDate.getTime()) / (24 * 3600 * 1000));
        if (daysCold > AM_QUEUE_CONFIG.COLD_DAYS_THRESHOLD) {
          const reason = `No contact in ${Math.round(daysCold)} days`;
          reasonChips.push(reason);
          matchedSignals.push({
            score: AM_QUEUE_CONFIG.weights.goneCold + 
                   (daysCold * AM_QUEUE_CONFIG.weights.coldDaysMultiplier) + 
                   (mrr * AM_QUEUE_CONFIG.weights.mrrMultiplier),
            primaryReason: reason,
            group: 'suggested',
            nextAction: {
              kind: 'call',
              label: lead.nextBestAction || 'Call — gone cold'
            }
          });
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // Fallback if no signals match
  if (matchedSignals.length === 0) {
    return {
      lead,
      score: mrr * AM_QUEUE_CONFIG.weights.mrrMultiplier,
      reasonChips: ['No urgent signals'],
      primaryReason: 'No urgent signals',
      nextAction: {
        kind: 'follow-up',
        label: lead.nextBestAction || 'Follow-up'
      },
      group: 'suggested',
      mrrAtStake: mrr
    };
  }

  // If there are matches, select the highest scoring match
  matchedSignals.sort((a, b) => b.score - a.score);
  const highest = matchedSignals[0];

  return {
    lead,
    score: highest.score,
    reasonChips: Array.from(new Set(reasonChips)), // deduplicate chips
    primaryReason: highest.primaryReason,
    nextAction: highest.nextAction,
    group: highest.group,
    mrrAtStake: mrr
  };
}

export function sortQueueItems(a: AmQueueItem, b: AmQueueItem): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  // Tie-breaker 1: nextBestAction presence
  const hasNbaA = !!a.lead.nextBestAction;
  const hasNbaB = !!b.lead.nextBestAction;
  if (hasNbaA !== hasNbaB) {
    return hasNbaB ? 1 : -1;
  }
  // Tie-breaker 2: aiScore / totalScore
  const aiA = a.lead.aiScore ?? a.lead.totalScore ?? 0;
  const aiB = b.lead.aiScore ?? b.lead.totalScore ?? 0;
  if (aiB !== aiA) {
    return aiB - aiA;
  }
  // Tie-breaker 3: MRR at stake
  const mrrA = a.mrrAtStake ?? 0;
  const mrrB = b.mrrAtStake ?? 0;
  return mrrB - mrrA;
}
