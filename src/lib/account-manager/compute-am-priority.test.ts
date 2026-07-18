import { describe, it, expect } from 'vitest';
import { computeAmPriority, sortQueueItems, AM_QUEUE_CONFIG } from './compute-am-priority';
import { Lead, Appointment } from '../types';

describe('computeAmPriority', () => {
  const baseLead: Lead = {
    id: 'lead-1',
    companyName: 'Test Corp',
    status: 'New',
    profile: 'AM pipeline test',
    rate: 100
  };

  it('correctly scores and flags cancellation requests as At Risk', () => {
    const lead: Lead = {
      ...baseLead,
      cancellationRequested: true
    };
    
    const now = new Date('2026-07-19T10:00:00+10:00');
    const result = computeAmPriority(lead, [], now);
    
    expect(result.group).toBe('at_risk');
    expect(result.reasonChips).toContain('Cancellation requested');
    expect(result.nextAction.kind).toBe('save-call');
    expect(result.score).toBeGreaterThan(AM_QUEUE_CONFIG.weights.cancellation);
  });

  it('correctly handles hot inbound/website lead SLA and escalates to overdue', () => {
    // Within SLA window: 2 hours elapsed (entered at 09:00 AEST, now is 11:00 AEST on Monday)
    const hotLeadToday: Lead = {
      ...baseLead,
      customerStatus: 'Hot Lead',
      bucket: 'inbound',
      dateLeadEntered: '2026-07-20T09:00:00+10:00'
    };
    
    const now = new Date('2026-07-20T11:00:00+10:00');
    const resultToday = computeAmPriority(hotLeadToday, [], now);
    expect(resultToday.group).toBe('due_today');
    expect(resultToday.reasonChips).toContain('Hot inbound lead (2h elapsed)');

    // Breached SLA: entered on Friday at 9:00 AEST, now is Monday at 11:00 AEST
    // Friday: 9-17 (8h), Monday: 9-11 (2h) = 10h total business hours (breached > 8h)
    const hotLeadOverdue: Lead = {
      ...baseLead,
      customerStatus: 'Hot Lead',
      bucket: 'inbound',
      dateLeadEntered: '2026-07-17T09:00:00+10:00'
    };
    
    const resultOverdue = computeAmPriority(hotLeadOverdue, [], now);
    expect(resultOverdue.group).toBe('overdue');
    expect(resultOverdue.reasonChips).toContain('Hot lead SLA breached');
  });

  it('identifies overdue follow-up dates', () => {
    const lead: Lead = {
      ...baseLead,
      followUpDate: '2026-07-18T00:00:00+10:00'
    };
    
    const now = new Date('2026-07-19T10:00:00+10:00');
    const result = computeAmPriority(lead, [], now);
    
    expect(result.group).toBe('overdue');
    expect(result.reasonChips).toContain('Follow-up overdue');
  });

  it('identifies active appointments today', () => {
    const appointments: Appointment[] = [{
      id: 'appt-1',
      leadId: 'lead-1',
      duedate: '2026-07-19T14:30:00+10:00',
      starttime: '2026-07-19T14:30:00+10:00',
      appointmentStatus: 'Pending',
      assignedTo: 'John Doe'
    }];
    
    const now = new Date('2026-07-19T10:00:00+10:00');
    const result = computeAmPriority(baseLead, appointments, now);
    
    expect(result.group).toBe('due_today');
    expect(result.reasonChips).toContain('Appointment today: Meeting');
    expect(result.nextAction.kind).toBe('meeting');
  });

  it('correctly weighs sorting order by score and MRR tie-breaks', () => {
    const itemA = computeAmPriority({ ...baseLead, id: 'A', rate: 100, cancellationRequested: true }, [], new Date('2026-07-19T10:00:00+10:00'));
    const itemB = computeAmPriority({ ...baseLead, id: 'B', rate: 500, cancellationRequested: true }, [], new Date('2026-07-19T10:00:00+10:00'));
    
    // Cancellation B has higher MRR than A, so should be sorted first (score of B should be higher due to MRR multiplier)
    expect(itemB.score).toBeGreaterThan(itemA.score);
    
    const sorted = [itemA, itemB].sort(sortQueueItems);
    expect(sorted[0].lead.id).toBe('B');
  });
});
