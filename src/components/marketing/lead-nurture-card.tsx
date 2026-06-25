'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Play, Pause, XCircle, ArrowRight, Loader2, Sparkles, Mail, CheckCircle, Clock, GitBranch, ExternalLink, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface LeadNurtureCardProps {
  leadId: string;
  leadData: any;
  onRefreshLead: () => void;
}

export function LeadNurtureCard({ leadId, leadData, onRefreshLead }: LeadNurtureCardProps) {
  const [journeys, setJourneys] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJourneyId, setSelectedJourneyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [minutesToNextRun, setMinutesToNextRun] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const updateMinutes = () => {
      const now = new Date();
      setMinutesToNextRun(60 - now.getMinutes());
    };
    updateMinutes();
    const interval = setInterval(updateMinutes, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchNurtureData();
  }, [leadId]);

  const fetchNurtureData = async () => {
    setLoading(true);
    try {
      const [journeysSnap, statesSnap, templatesSnap, smsTemplatesSnap] = await Promise.all([
        getDocs(collection(firestore, 'Journeys')),
        getDocs(collection(firestore, 'leads', leadId, 'journey_states')),
        getDocs(collection(firestore, 'marketing_templates')),
        getDocs(collection(firestore, 'marketing_sms_templates'))
      ]);

      const jList = journeysSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((j: any) => j.status === 'active');
      
      const sList = statesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tList = templatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const stList = smsTemplatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setJourneys(jList);
      setStates(sList);
      setTemplates(tList);
      setSmsTemplates(stList);
    } catch (error) {
      console.error('Error fetching lead nurture states:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedJourneyId) return;
    setSubmitting(true);
    try {
      const journey = journeys.find(j => j.id === selectedJourneyId);
      if (!journey) return;

      const startNode = journey.nodes?.find((n: any) => n.type === 'trigger');
      const firstEdge = journey.edges?.find((e: any) => e.source === startNode?.id);
      const initialNodeId = firstEdge ? firstEdge.target : (startNode?.id || 'trigger_1');

      const nowStr = new Date().toISOString();

      // 1. Create journey state document
      const stateRef = doc(firestore, 'leads', leadId, 'journey_states', selectedJourneyId);
      await setDoc(stateRef, {
        leadId,
        journeyId: selectedJourneyId,
        status: 'active',
        currentNodeId: initialNodeId,
        entryTime: nowStr,
        lastExecutionTime: nowStr,
        executionHistory: [
          {
            nodeId: startNode?.id || 'trigger_1',
            nodeType: 'trigger',
            executedAt: nowStr,
            actionResult: 'Enrolled via Lead Profile.'
          }
        ]
      });

      // 2. Add to lead's activeJourneys array
      const leadRef = doc(firestore, 'leads', leadId);
      await updateDoc(leadRef, {
        activeJourneys: arrayUnion(selectedJourneyId)
      });

      toast({ title: 'Lead Enrolled', description: `Successfully enrolled in '${journey.name}'` });
      setSelectedJourneyId('');
      fetchNurtureData();
      onRefreshLead();

      // 3. Trigger immediate processing for this lead
      fetch('/api/nurture/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      }).catch(err => console.error('Immediate processing failed:', err));
    } catch (error) {
      console.error('Enroll failed:', error);
      toast({ variant: 'destructive', title: 'Enrollment Failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (journeyId: string, nextStatus: 'active' | 'paused' | 'stopped') => {
    setSubmitting(true);
    try {
      const stateRef = doc(firestore, 'leads', leadId, 'journey_states', journeyId);
      const leadRef = doc(firestore, 'leads', leadId);
      const nowStr = new Date().toISOString();

      const updates: any = { status: nextStatus, lastExecutionTime: nowStr };
      await updateDoc(stateRef, updates);

      if (nextStatus === 'stopped') {
        // Remove from active list
        await updateDoc(leadRef, {
          activeJourneys: arrayRemove(journeyId)
        });
      } else if (nextStatus === 'active') {
        // Ensure present in active list
        await updateDoc(leadRef, {
          activeJourneys: arrayUnion(journeyId)
        });
      }

      toast({ title: `Campaign ${nextStatus}` });
      fetchNurtureData();
      onRefreshLead();

      if (nextStatus === 'active') {
        // Trigger immediate processing to evaluate waiting steps
        fetch('/api/nurture/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId })
        }).catch(err => console.error('Immediate processing failed:', err));
      }
    } catch (error) {
      console.error('Status update failed:', error);
      toast({ variant: 'destructive', title: 'Action Failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerStep = async (journeyId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/nurture/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, journeyId, forceExecute: true })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Step Triggered', description: 'Nurture campaign step executed successfully.' });
        fetchNurtureData();
        onRefreshLead();
      } else {
        toast({ variant: 'destructive', title: 'Execution Failed', description: data.message || 'Failed to trigger step.' });
      }
    } catch (error) {
      console.error('Trigger step failed:', error);
      toast({ variant: 'destructive', title: 'Action Failed', description: 'System error running campaign step.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getRemainingSteps = (currentNodeId: string, journey: any, lastExecTimeStr: string | null) => {
    const steps: Array<{
      nodeId: string;
      type: string;
      description: string;
      estimatedTime?: Date;
      config: any;
    }> = [];

    let currentId = currentNodeId;
    let simulatedTime = lastExecTimeStr ? new Date(lastExecTimeStr) : new Date();
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const node = journey.nodes?.find((n: any) => n.id === currentId);
      if (!node) break;

      let description = '';

      if (node.type === 'wait') {
        const config = node.config || {};
        const duration = parseFloat(config.duration || '0');
        const unit = config.unit || 'days';
        const delayMs = unit === 'hours' ? duration * 3600000 : duration * 86400000;
        simulatedTime = new Date(simulatedTime.getTime() + delayMs);
        description = `Wait for ${duration} ${unit}`;
      } else if (node.type === 'action') {
        const config = node.config || {};
        
        // Handle weekdays only
        if (config.weekdaysOnly) {
          // Check if simulatedTime is a weekend (0 = Sunday, 6 = Saturday)
          let day = simulatedTime.getDay();
          if (day === 0) { // Sunday -> Monday
            simulatedTime = new Date(simulatedTime.getTime() + 86400000);
          } else if (day === 6) { // Saturday -> Monday
            simulatedTime = new Date(simulatedTime.getTime() + 2 * 86400000);
          }
        }

        // Handle sendTime
        if (config.sendTime && config.sendTime !== 'any') {
          const [targetHour, targetMin] = config.sendTime.split(':').map(Number);
          const nextTime = new Date(simulatedTime);
          nextTime.setHours(targetHour, targetMin, 0, 0);
          if (nextTime.getTime() < simulatedTime.getTime()) {
            // Target time has already passed today, scheduled for tomorrow
            nextTime.setDate(nextTime.getDate() + 1);
          }
          simulatedTime = nextTime;
        }

        const actionType = config.actionType || 'email';
        if (actionType === 'email') {
          const template = templates.find(t => t.id === config.templateId);
          description = `Send Email: ${template?.name || 'Loading Template...'}`;
        } else {
          const smsTemplate = smsTemplates.find(t => t.id === config.smsTemplateId);
          description = `Send SMS: ${smsTemplate?.name || config.smsMessage || 'SMS Message'}`;
        }
      } else if (node.type === 'condition') {
        const config = node.config || {};
        const field = config.field || 'bucket';
        const val = config.value || '';
        description = `Check Condition: Lead ${field} is "${val}"`;
      } else if (node.type === 'action_button') {
        const config = node.config || {};
        description = `Wait for Button Click: "${config.name || 'Link'}"`;
      } else if (node.type === 'end_action') {
        const config = node.config || {};
        description = `End Journey: Set status to "${config.newStatus || ''}"`;
      } else if (node.type === 'trigger') {
        description = 'Lead enrolled';
      }

      steps.push({
        nodeId: node.id,
        type: node.type,
        description,
        estimatedTime: new Date(simulatedTime),
        config: node.config,
      });

      // Navigate to next node
      if (node.type === 'condition') {
        const config = node.config || {};
        const field = config.field || 'bucket';
        const val = config.value || '';
        
        // Evaluate statically using current leadData
        const leadVal = leadData[field];
        const isMatch = String(leadVal).toLowerCase().trim() === String(val).toLowerCase().trim();

        const matchingEdge = journey.edges?.find((e: any) => {
          if (e.source !== node.id) return false;
          const cond = e.condition || 'true';
          return isMatch ? (cond === 'true' || cond === 'match') : (cond === 'false' || cond === 'no-match');
        });

        if (matchingEdge) {
          currentId = matchingEdge.target;
        } else {
          const defaultEdge = journey.edges?.find((e: any) => e.source === node.id);
          currentId = defaultEdge ? defaultEdge.target : null;
        }
      } else {
        const nextEdge = journey.edges?.find((e: any) => e.source === node.id);
        currentId = nextEdge ? nextEdge.target : null;
      }
    }

    return steps;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const activeJourneyIds = leadData?.activeJourneys || [];
  const pendingJourneyIds = activeJourneyIds.filter((id: string) => !states.find(s => s.journeyId === id));

  return (
    <Card className="border shadow-md rounded-xl bg-white overflow-hidden">
      <CardHeader className="py-3.5 px-5 bg-slate-50 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-yellow-500 fill-yellow-400 animate-pulse" /> Nurture Campaigns
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {/* Enroll Selector */}
        <div className="flex gap-2.5 items-end">
          <div className="flex-1 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Enroll Lead in Campaign</span>
            <Select value={selectedJourneyId} onValueChange={setSelectedJourneyId}>
              <SelectTrigger className="bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select active campaign..." />
              </SelectTrigger>
              <SelectContent>
                {journeys.map(j => (
                  <SelectItem key={j.id} value={j.id} disabled={states.some(s => s.id === j.id && s.status === 'active')}>
                    {j.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleEnroll} 
            disabled={!selectedJourneyId || submitting} 
            className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 shrink-0"
          >
            Enroll
          </Button>
        </div>

        {/* Current Campaigns List */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase block border-b pb-1">Campaign Statuses & Progress</span>
          
          {states.length === 0 && pendingJourneyIds.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4 italic">
              Lead is not currently enrolled in any nurture campaigns.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingJourneyIds.map((pendingId: string) => {
                const jDef = journeys.find(j => j.id === pendingId);
                const name = jDef?.name || 'Unknown Campaign';
                return (
                  <div key={`pending-${pendingId}`} className="border rounded-xl p-3 bg-slate-50/50 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-800">{name}</span>
                        <span className="text-[10px] font-semibold ml-2 px-1.5 py-0.5 rounded-full uppercase bg-blue-50 text-blue-700 border border-blue-200">
                          Pending Setup
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 italic">
                        Waiting for background engine...
                      </div>
                    </div>
                  </div>
                );
              })}
              {states.map(state => {
                const jDef = journeys.find(j => j.id === state.journeyId);
                const name = jDef?.name || 'Nurture Campaign';
                return (
                  <div key={state.id} className="border rounded-xl p-3 bg-slate-50/50 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-800">{name}</span>
                        <span className={`text-[10px] font-semibold ml-2 px-1.5 py-0.5 rounded-full uppercase ${
                          state.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          state.status === 'paused' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {state.status}
                        </span>
                      </div>

                      {state.currentNodeId && jDef && (
                        <div className="text-xs text-slate-600 font-medium">
                          Current Stage:{' '}
                          <span className="text-[#095c7b]">
                            {(() => {
                              const currentNode = jDef?.nodes?.find((n: any) => n.id === state.currentNodeId);
                              let nodeName = currentNode?.config?.label || currentNode?.config?.subject || currentNode?.type || state.currentNodeId;
                              if (currentNode?.type === 'wait') {
                                nodeName = `Waiting (${currentNode.config?.duration || 0} ${currentNode.config?.unit || 'days'})`;
                              }
                              return nodeName;
                            })()}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-1.5">
                        {state.status === 'active' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleTriggerStep(state.journeyId)}
                              className="h-7 px-2 text-xs gap-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              disabled={submitting}
                            >
                              <Play className="h-3 w-3 text-blue-600 fill-blue-600" /> Run Step
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleStatusChange(state.journeyId, 'paused')}
                              className="h-7 px-2 text-xs gap-1 hover:bg-amber-50 hover:text-amber-700"
                              disabled={submitting}
                            >
                              <Pause className="h-3 w-3" /> Pause
                            </Button>
                          </>
                        )}
                        {state.status === 'paused' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleStatusChange(state.journeyId, 'active')}
                            className="h-7 px-2 text-xs gap-1 hover:bg-emerald-50 hover:text-emerald-700"
                            disabled={submitting}
                          >
                            <Play className="h-3 w-3" /> Resume
                          </Button>
                        )}
                        {state.status !== 'stopped' && state.status !== 'completed' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleStatusChange(state.journeyId, 'stopped')}
                            className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={submitting}
                          >
                            <XCircle className="h-3 w-3" /> Remove
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Remaining & Scheduled Steps */}
                    {state.currentNodeId && jDef && (
                      <div className="space-y-2 pt-2.5 border-t text-[11px] border-slate-100">
                        <span className="font-bold text-slate-500 uppercase block tracking-wider">Remaining Steps & Schedule:</span>
                        <div className="relative pl-4 border-l border-slate-200 ml-2 space-y-3.5 pt-1 pb-1">
                          {(() => {
                            const remaining = getRemainingSteps(state.currentNodeId, jDef, state.lastExecutionTime);
                            if (remaining.length === 0) {
                              return <span className="text-slate-400 italic">No remaining steps.</span>;
                            }
                            return remaining.map((step, sIdx) => {
                              const isCurrent = sIdx === 0;
                              
                              const getTimelineStepIcon = (type: string) => {
                                switch (type) {
                                  case 'trigger':
                                    return <Play className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500 shrink-0" />;
                                  case 'action':
                                    return step.config?.actionType === 'sms' ? (
                                      <MessageSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    ) : (
                                      <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    );
                                  case 'wait':
                                    return <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
                                  case 'condition':
                                    return <GitBranch className="h-3.5 w-3.5 text-indigo-500 shrink-0" />;
                                  case 'action_button':
                                    return <ExternalLink className="h-3.5 w-3.5 text-rose-500 shrink-0" />;
                                  case 'end_action':
                                    return <CheckCircle className="h-3.5 w-3.5 text-teal-500 shrink-0" />;
                                  default:
                                    return <Sparkles className="h-3.5 w-3.5 text-slate-500 shrink-0" />;
                                }
                              };

                              return (
                                <div key={step.nodeId} className="relative flex flex-col gap-0.5">
                                  {/* Timeline Dot */}
                                  <div className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border bg-white ${
                                    isCurrent 
                                      ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-500' 
                                      : 'border-slate-300'
                                  }`} />
                                  <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <span className={`flex items-center gap-1.5 ${isCurrent ? 'text-slate-900 font-bold' : 'text-slate-600 font-medium'}`}>
                                      {getTimelineStepIcon(step.type)}
                                      {step.description}
                                    </span>
                                    {step.estimatedTime && (
                                      <span className="text-[9px] text-slate-500 font-semibold bg-slate-100/80 border border-slate-200/50 px-1.5 py-0.5 rounded font-mono shrink-0">
                                        {format(step.estimatedTime, 'MMM d, h:mm a')}
                                      </span>
                                    )}
                                  </div>
                                  {isCurrent && (
                                    <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wide mt-0.5">
                                      Next Scheduled Action
                                    </span>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Drip Step Log & History */}
                    {state.executionHistory && state.executionHistory.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t text-[10px]">
                        <span className="font-bold text-slate-500 uppercase block">Execution History:</span>
                        <div className="space-y-1">
                          {state.executionHistory.map((hist: any, hIdx: number) => (
                            <div key={hIdx} className="flex items-start gap-1.5 text-slate-600">
                              <span className="text-[9px] text-slate-400 shrink-0 mt-0.5">{new Date(hist.executedAt).toLocaleDateString()}</span>
                              <span className="font-semibold text-slate-700 capitalize shrink-0">{hist.nodeType}:</span>
                              <span className="truncate">{hist.actionResult || 'Executed step.'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Next Run Info Note */}
        <div className="bg-slate-50 rounded p-3 text-xs text-slate-600 border border-slate-100 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            The background Nurture Process Engine automatically runs at the top of every hour to initialize pending campaigns and execute queued steps. 
            <strong className="block mt-1">Next scheduled run in ~{minutesToNextRun} minutes.</strong>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
