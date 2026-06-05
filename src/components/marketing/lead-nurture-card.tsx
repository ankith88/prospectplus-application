'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Play, Pause, XCircle, ArrowRight, Loader2, Sparkles, Mail, CheckCircle } from 'lucide-react';

interface LeadNurtureCardProps {
  leadId: string;
  leadData: any;
  onRefreshLead: () => void;
}

export function LeadNurtureCard({ leadId, leadData, onRefreshLead }: LeadNurtureCardProps) {
  const [journeys, setJourneys] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJourneyId, setSelectedJourneyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchNurtureData();
  }, [leadId]);

  const fetchNurtureData = async () => {
    setLoading(true);
    try {
      const [journeysSnap, statesSnap] = await Promise.all([
        getDocs(collection(firestore, 'Journeys')),
        getDocs(collection(firestore, 'leads', leadId, 'journey_states'))
      ]);

      const jList = journeysSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((j: any) => j.status === 'active');
      
      const sList = statesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setJourneys(jList);
      setStates(sList);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

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
          
          {states.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4 italic">
              Lead is not currently enrolled in any nurture campaigns.
            </div>
          ) : (
            <div className="space-y-3">
              {states.map(state => {
                const jDef = journeys.find(j => j.id === state.journeyId);
                const name = jDef?.name || 'Nurture Campaign';
                return (
                  <div key={state.id} className="border rounded-xl p-3 bg-slate-50/50 space-y-2.5">
                    <div className="flex items-center justify-between">
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

                      <div className="flex gap-1.5">
                        {state.status === 'active' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleStatusChange(state.journeyId, 'paused')}
                            className="h-7 px-2 text-xs gap-1 hover:bg-amber-50 hover:text-amber-700"
                            disabled={submitting}
                          >
                            <Pause className="h-3 w-3" /> Pause
                          </Button>
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
                            className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10"
                            disabled={submitting}
                          >
                            <XCircle className="h-3 w-3" /> Stop
                          </Button>
                        )}
                      </div>
                    </div>

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
      </CardContent>
    </Card>
  );
}
