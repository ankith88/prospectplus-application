'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { Loader2, ArrowLeft, Users, CheckCircle2, PlayCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function EnrollLeadsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const journeyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [journey, setJourney] = useState<any>(null);
  const [matchingLeads, setMatchingLeads] = useState<any[]>([]);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  
  const [enrolling, setEnrolling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (journeyId) {
      fetchJourneyAndEvaluate();
    }
  }, [journeyId]);

  const evaluateCondition = (cond: any, leadData: any) => {
    if (cond.field === 'localMileJobCount') {
      return Number(cond.value) === (leadData.jobCount || 0);
    }
    if (cond.field === 'localMileTermsAccepted') {
      const isAccepted = leadData.localMileTermsAccepted === true || String(leadData.localMileTermsAccepted).toLowerCase() === 'true';
      const targetValue = cond.value === true || String(cond.value).toLowerCase() === 'true';
      return isAccepted === targetValue;
    }
    return String(cond.value).toLowerCase() === String(leadData[cond.field] || '').toLowerCase();
  };

  const fetchJourneyAndEvaluate = async () => {
    setLoading(true);
    try {
      // 1. Fetch Journey
      const jDoc = await getDoc(doc(firestore, 'Journeys', journeyId));
      if (!jDoc.exists()) {
        toast({ variant: 'destructive', title: 'Journey not found' });
        router.push('/admin/marketing/nurture-journeys');
        return;
      }
      
      const jData = jDoc.data();
      setJourney({ id: jDoc.id, ...jData });

      if (jData.status !== 'active') {
        toast({ variant: 'destructive', title: 'Journey is not active' });
        router.push('/admin/marketing/nurture-journeys');
        return;
      }

      // 2. Extract Conditions
      const triggerNode = jData.nodes?.find((n: any) => n.type === 'trigger' && n.config?.autoEnroll);
      if (!triggerNode || !triggerNode.config.enrollConditionGroups) {
        toast({ variant: 'destructive', title: 'No enrollment conditions', description: 'This journey does not have auto-enrollment conditions configured.' });
        setLoading(false);
        return;
      }

      const conditionGroups = triggerNode.config.enrollConditionGroups;

      // 3. Fetch all leads and evaluate in memory
      const leadsSnap = await getDocs(collection(firestore, 'leads'));
      const allLeads = leadsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      setTotalLeadsCount(allLeads.length);

      const matched = allLeads.filter(leadData => {
        // Skip leads already in this journey
        const currentActive = leadData.activeJourneys || [];
        if (currentActive.includes(journeyId)) return false;

        // Evaluate conditions (OR between groups, AND within groups)
        return conditionGroups.some((group: any) => 
          group.conditions?.every((cond: any) => evaluateCondition(cond, leadData))
        );
      });

      setMatchingLeads(matched);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ variant: 'destructive', title: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const startEnrollment = async () => {
    if (matchingLeads.length === 0) return;
    setEnrolling(true);

    try {
      const cancelOtherJourneys = journey.nodes?.find((n: any) => n.type === 'trigger')?.config?.cancelOtherJourneys || false;
      const batchSize = 50;
      let processed = 0;

      for (let i = 0; i < matchingLeads.length; i += batchSize) {
        const batchLeads = matchingLeads.slice(i, i + batchSize);
        const batch = writeBatch(firestore);

        batchLeads.forEach(lead => {
          const leadRef = doc(firestore, 'leads', lead.id);
          const currentActive = lead.activeJourneys || [];
          
          let journeysToKeep = [...currentActive];
          if (cancelOtherJourneys) {
            journeysToKeep = [journeyId];
          } else {
            journeysToKeep.push(journeyId);
          }

          batch.update(leadRef, { activeJourneys: journeysToKeep });
        });

        await batch.commit();
        processed += batchLeads.length;
        
        setEnrolledCount(processed);
        setProgress((processed / matchingLeads.length) * 100);
      }

      setCompleted(true);
      toast({ title: 'Enrollment Complete', description: `Successfully enrolled ${processed} leads.` });
    } catch (error) {
      console.error('Error during enrollment batch:', error);
      toast({ variant: 'destructive', title: 'Enrollment failed during processing' });
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center flex-col gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Evaluating Leads...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 mt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/marketing/nurture-journeys')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Retroactive Enrollment</h2>
          <p className="text-muted-foreground">Journey: <span className="font-medium text-slate-900">{journey?.name}</span></p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Evaluation Results
          </CardTitle>
          <CardDescription>
            We evaluated <strong>{totalLeadsCount}</strong> total leads against the enrollment conditions of this journey.
            Leads that are already enrolled in this journey have been excluded from the results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-50 border rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2">
            <span className="text-5xl font-bold text-slate-800">{matchingLeads.length}</span>
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Leads Match Criteria</span>
          </div>

          {(enrolling || completed) && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium text-slate-700">
                <span>Progress</span>
                <span>{enrolledCount} / {matchingLeads.length}</span>
              </div>
              <Progress value={progress} className="h-3" />
              {completed && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-md text-sm font-medium mt-4">
                  <CheckCircle2 className="h-5 w-5" />
                  All eligible leads have been successfully enrolled!
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t bg-slate-50/50 p-6">
          <Button variant="outline" onClick={() => router.push('/admin/marketing/nurture-journeys')} disabled={enrolling}>
            Cancel
          </Button>
          {!completed ? (
            <Button 
              onClick={startEnrollment} 
              disabled={matchingLeads.length === 0 || enrolling}
              className="gap-2"
            >
              {enrolling ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enrolling...</>
              ) : (
                <><PlayCircle className="h-4 w-4" /> Start Enrollment</>
              )}
            </Button>
          ) : (
            <Button onClick={() => router.push('/admin/marketing/nurture-journeys')}>
              Return to Dashboard
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
