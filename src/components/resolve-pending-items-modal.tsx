"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Calendar, CheckSquare, Clock, User, Check, X, Info } from 'lucide-react';
import type { Appointment, Task, AppointmentStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';

export interface AppointmentResolution {
  id: string;
  status: AppointmentStatus;
  notes?: string;
}

export interface TaskResolution {
  id: string;
  action: 'complete' | 'cancel' | 'keep';
}

export interface ResolvePendingItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  targetStatus?: string;
  pendingAppointments: Appointment[];
  pendingTasks: Task[];
  onConfirm: (
    appointmentResolutions: AppointmentResolution[],
    taskResolutions: TaskResolution[]
  ) => Promise<void>;
}

export function ResolvePendingItemsModal({
  isOpen,
  onClose,
  leadName,
  targetStatus = 'Lost',
  pendingAppointments,
  pendingTasks,
  onConfirm,
}: ResolvePendingItemsModalProps) {
  const [apptStates, setApptStates] = useState<Record<string, { status: AppointmentStatus; notes: string }>>({});
  const [taskStates, setTaskStates] = useState<Record<string, 'complete' | 'cancel' | 'keep'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Initialize appointment resolutions default to 'Cancelled'
      const initAppts: Record<string, { status: AppointmentStatus; notes: string }> = {};
      pendingAppointments.forEach(a => {
        initAppts[a.id] = { status: 'Cancelled', notes: '' };
      });
      setApptStates(initAppts);

      // Initialize task resolutions default to 'complete'
      const initTasks: Record<string, 'complete' | 'cancel' | 'keep'> = {};
      pendingTasks.forEach(t => {
        initTasks[t.id] = 'complete';
      });
      setTaskStates(initTasks);
    }
  }, [isOpen, pendingAppointments, pendingTasks]);

  const setAllApptsStatus = (status: AppointmentStatus) => {
    setApptStates(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id] = { ...updated[id], status };
      });
      return updated;
    });
  };

  const setAllTasksAction = (action: 'complete' | 'cancel' | 'keep') => {
    setTaskStates(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id] = action;
      });
      return updated;
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const apptResolutions: AppointmentResolution[] = pendingAppointments.map(a => ({
        id: a.id,
        status: apptStates[a.id]?.status || 'Cancelled',
        notes: apptStates[a.id]?.notes,
      }));

      const taskResolutionsList: TaskResolution[] = pendingTasks.map(t => ({
        id: t.id,
        action: taskStates[t.id] || 'complete',
      }));

      await onConfirm(apptResolutions, taskResolutionsList);
      onClose();
    } catch (error) {
      console.error('Error resolving pending items:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasAppts = pendingAppointments.length > 0;
  const hasTasks = pendingTasks.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-background border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in-50 zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 border-b bg-amber-500/10 flex items-start gap-4 rounded-t-xl">
          <div className="p-2.5 bg-amber-500/20 text-amber-600 rounded-full shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Confirm Pending Items for Lost Lead
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              <strong className="text-foreground">{leadName}</strong> is being marked as{' '}
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-semibold px-2">
                {targetStatus}
              </Badge>
              . Please confirm how open appointments and tasks should be handled.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Pending Appointments Section */}
          {hasAppts && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-sm text-foreground">
                    Scheduled Appointments ({pendingAppointments.length})
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground mr-1">Set all:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={() => setAllApptsStatus('Cancelled')}
                  >
                    Cancelled
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={() => setAllApptsStatus('No Show')}
                  >
                    No Show
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={() => setAllApptsStatus('Completed')}
                  >
                    Completed
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {pendingAppointments.map(appt => {
                  const dateStr = appt.appointmentDate || appt.duedate || appt.date;
                  let formattedDate = 'N/A';
                  if (dateStr) {
                    try {
                      formattedDate = format(parseISO(dateStr), 'MMM d, yyyy');
                    } catch {
                      formattedDate = dateStr;
                    }
                  }

                  const rep = appt.assignedTo || appt.dialerAssigned || appt.amName || 'Unassigned';

                  return (
                    <div
                      key={appt.id}
                      className="p-3.5 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {formattedDate} {appt.starttime ? `at ${appt.starttime}` : ''}
                          </Badge>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" /> {rep}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Label htmlFor={`appt-status-${appt.id}`} className="text-xs font-semibold">
                            Status:
                          </Label>
                          <Select
                            value={apptStates[appt.id]?.status || 'Cancelled'}
                            onValueChange={(val: AppointmentStatus) =>
                              setApptStates(prev => ({
                                ...prev,
                                [appt.id]: { ...prev[appt.id], status: val },
                              }))
                            }
                          >
                            <SelectTrigger id={`appt-status-${appt.id}`} className="h-8 w-36 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cancelled">Cancelled</SelectItem>
                              <SelectItem value="No Show">No Show</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Textarea
                        placeholder="Resolution notes for appointment (optional)..."
                        className="text-xs min-h-[50px] resize-none"
                        value={apptStates[appt.id]?.notes || ''}
                        onChange={e =>
                          setApptStates(prev => ({
                            ...prev,
                            [appt.id]: { ...prev[appt.id], notes: e.target.value },
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Tasks Section */}
          {hasTasks && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-semibold text-sm text-foreground">
                    Pending Tasks ({pendingTasks.length})
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground mr-1">Set all:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={() => setAllTasksAction('complete')}
                  >
                    Mark Completed
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={() => setAllTasksAction('cancel')}
                  >
                    Cancel / Delete
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                {pendingTasks.map(task => {
                  let formattedDueDate = 'No due date';
                  if (task.dueDate) {
                    try {
                      formattedDueDate = format(parseISO(task.dueDate), 'MMM d, yyyy');
                    } catch {
                      formattedDueDate = task.dueDate;
                    }
                  }

                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {task.title || 'Untitled Task'}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>Due: {formattedDueDate}</span>
                          {task.dialerAssigned && <span>Assigned: {task.dialerAssigned}</span>}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <Select
                          value={taskStates[task.id] || 'complete'}
                          onValueChange={(val: 'complete' | 'cancel' | 'keep') =>
                            setTaskStates(prev => ({
                              ...prev,
                              [task.id]: val,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="complete">Mark Completed</SelectItem>
                            <SelectItem value="cancel">Cancel / Delete Task</SelectItem>
                            <SelectItem value="keep">Keep Open</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/40 flex items-center justify-end gap-2 rounded-b-xl">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Confirm & Mark Lead as Lost'}
          </Button>
        </div>

      </div>
    </div>
  );
}
