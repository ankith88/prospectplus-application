'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { Loader2, ArrowLeft, Users, CheckCircle2, PlayCircle, AlertCircle, Eye, Building2, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function EnrollLeadsPage() {
  const { userProfile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const journeyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [journey, setJourney] = useState<any>(null);
  const [matchingLeads, setMatchingLeads] = useState<any[]>([]);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  
  const [enrolling, setEnrolling] = useState(false);
  const [activating, setActivating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (journeyId) {
      fetchJourneyAndEvaluate();
    }
  }, [journeyId]);

  const parseLeadDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val?.toDate === 'function') return val.toDate();
    if (typeof val === 'number') return new Date(val);
    if (typeof val === 'string') {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const getFieldValue = (field: string, leadData: any) => {
    if (field === 'cancellationCategory') {
      return (leadData.cancellationCategory || leadData.cancellationWhy || '').toString().trim();
    }
    if (field === 'isCompany' || field === 'recordType') {
      const isComp = leadData.isCompany === true || String(leadData.isCompany).toLowerCase() === 'true' || leadData.recordType === 'company';
      return isComp ? 'Company' : 'Lead';
    }
    if (field === 'localMileJobCount') {
      return Number(leadData.jobCount || 0);
    }
    if (field === 'localMileTermsAccepted') {
      return leadData.localMileTermsAccepted === true || String(leadData.localMileTermsAccepted).toLowerCase() === 'true';
    }
    return (leadData[field] ?? '').toString().trim();
  };

  const evaluateCondition = (cond: any, leadData: any) => {
    if (!cond.field) return false;
    const op = cond.operator || 'equals';

    if (cond.field === 'dateLeadEntered' || cond.field === 'dateEntered' || cond.field === 'createdAt') {
      const leadDate = parseLeadDate(leadData.dateLeadEntered || leadData.dateEntered || leadData.createdAt || leadData.createdDate);
      if (op === 'is_empty') return !leadDate;
      if (op === 'is_not_empty') return !!leadDate;
      if (!leadDate) return false;

      const leadTime = leadDate.getTime();
      let fromStr = cond.valueFrom || '';
      let toStr = cond.valueTo || '';

      if (cond.value && typeof cond.value === 'string' && cond.value.includes('|')) {
        const parts = cond.value.split('|');
        fromStr = fromStr || parts[0];
        toStr = toStr || parts[1];
      } else if (!fromStr && cond.value) {
        fromStr = String(cond.value);
      }

      if (op === 'between') {
        let match = true;
        if (fromStr) {
          const fromTime = new Date(`${fromStr}T00:00:00`).getTime();
          if (!isNaN(fromTime)) match = match && leadTime >= fromTime;
        }
        if (toStr) {
          const toTime = new Date(`${toStr}T23:59:59.999`).getTime();
          if (!isNaN(toTime)) match = match && leadTime <= toTime;
        }
        return match;
      }

      if (op === 'after' || op === 'greater_than') {
        if (!fromStr) return true;
        const fromTime = new Date(`${fromStr}T00:00:00`).getTime();
        return !isNaN(fromTime) ? leadTime >= fromTime : true;
      }

      if (op === 'before' || op === 'less_than') {
        const targetStr = toStr || fromStr;
        if (!targetStr) return true;
        const toTime = new Date(`${targetStr}T23:59:59.999`).getTime();
        return !isNaN(toTime) ? leadTime <= toTime : true;
      }

      if (op === 'equals') {
        if (!fromStr) return true;
        const fromTime = new Date(`${fromStr}T00:00:00`).getTime();
        const toTime = new Date(`${fromStr}T23:59:59.999`).getTime();
        return leadTime >= fromTime && leadTime <= toTime;
      }

      if (op === 'not_equals') {
        if (!fromStr) return true;
        const fromTime = new Date(`${fromStr}T00:00:00`).getTime();
        const toTime = new Date(`${fromStr}T23:59:59.999`).getTime();
        return leadTime < fromTime || leadTime > toTime;
      }
    }

    if (op === 'is_empty') {
      const val = getFieldValue(cond.field, leadData);
      if (typeof val === 'boolean') return !val;
      if (typeof val === 'number') return false;
      return val === '' || val === null || val === undefined;
    }

    if (op === 'is_not_empty') {
      const val = getFieldValue(cond.field, leadData);
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return true;
      return val !== '' && val !== null && val !== undefined;
    }

    if (cond.field === 'localMileJobCount') {
      const leadNum = Number(leadData.jobCount || 0);
      const targetNum = Number(cond.value);
      return op === 'not_equals' ? leadNum !== targetNum : leadNum === targetNum;
    }

    if (cond.field === 'localMileTermsAccepted') {
      const isAccepted = leadData.localMileTermsAccepted === true || String(leadData.localMileTermsAccepted).toLowerCase() === 'true';
      const targetValue = cond.value === true || String(cond.value).toLowerCase() === 'true';
      return op === 'not_equals' ? isAccepted !== targetValue : isAccepted === targetValue;
    }

    const leadVal = getFieldValue(cond.field, leadData).toLowerCase();
    const targetVal = String(cond.value || '').toLowerCase().trim();

    if (op === 'not_equals') {
      return leadVal !== targetVal;
    }
    return leadVal === targetVal;
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

      // 2. Extract Conditions
      const triggerNode = jData.nodes?.find((n: any) => n.type === 'trigger' && n.config?.autoEnroll);
      if (!triggerNode || !triggerNode.config.enrollConditionGroups) {
        toast({ 
          variant: 'destructive', 
          title: 'No enrollment conditions', 
          description: 'This journey does not have auto-enrollment conditions configured.' 
        });
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

      const author = userProfile?.displayName || (userProfile?.firstName && userProfile?.lastName ? `${userProfile.firstName} ${userProfile.lastName}` : userProfile?.firstName) || userProfile?.email || 'Admin';
      const nowStr = new Date().toISOString();

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

          const activityRef = doc(collection(firestore, 'leads', lead.id, 'activity'));
          batch.set(activityRef, {
            type: 'Update',
            date: nowStr,
            notes: `Lead enrolled in nurture campaign '${journey?.name || 'Nurture Campaign'}' via Admin Nurture Enrollment by ${author}.`,
            author
          });
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

  const activateAndStartEnrollment = async () => {
    if (!journeyId) return;
    setActivating(true);
    try {
      const jRef = doc(firestore, 'Journeys', journeyId);
      await updateDoc(jRef, { status: 'active' });
      setJourney((prev: any) => ({ ...prev, status: 'active' }));
      toast({ title: 'Journey Activated', description: 'Journey status updated to Active.' });
      await startEnrollment();
    } catch (error) {
      console.error('Error activating journey:', error);
      toast({ variant: 'destructive', title: 'Failed to activate journey' });
    } finally {
      setActivating(false);
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

  const isDraftOrPaused = journey?.status !== 'active';

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/marketing/nurture-journeys')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {isDraftOrPaused ? 'Journey Lead Preview & Testing' : 'Retroactive Lead Enrollment'}
              </h2>
              {journey?.status === 'active' ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-semibold border-emerald-200">
                  Active
                </Badge>
              ) : journey?.status === 'paused' ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-semibold">
                  Paused (Preview Mode)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-semibold">
                  Draft (Testing Mode)
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5">Journey: <span className="font-medium text-slate-900">{journey?.name}</span></p>
          </div>
        </div>
      </div>

      {isDraftOrPaused && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-amber-900 text-sm shadow-sm">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Draft / Testing Mode Active</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              You are inspecting the actual leads that match the trigger criteria for this journey while it is in <strong className="uppercase">{journey?.status}</strong> status. 
              Review the matching leads list below to verify your auto-enrollment conditions before activating.
            </p>
          </div>
        </div>
      )}

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
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

          {matchingLeads.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  Matching Leads Preview ({Math.min(matchingLeads.length, 50)} of {matchingLeads.length})
                </h4>
              </div>
              <div className="border rounded-lg overflow-hidden bg-white max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Company / Name</TableHead>
                      <TableHead className="text-xs font-semibold">Contact Person</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Bucket</TableHead>
                      <TableHead className="text-xs font-semibold">Lead Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchingLeads.slice(0, 50).map((lead) => (
                      <TableRow key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-medium text-xs text-slate-800">
                          {lead.companyName || lead.tradingName || lead.contactPersonName || 'Unnamed Lead'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {lead.contactPersonName || lead.email || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {lead.customerStatus || lead.status || 'New'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 capitalize">
                          {lead.bucket || 'outbound'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {lead.leadSourceName || lead.leadSource || lead.campaignName || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {matchingLeads.length > 50 && (
                <p className="text-[11px] text-slate-400 text-right italic">
                  Showing first 50 of {matchingLeads.length} matching leads
                </p>
              )}
            </div>
          )}

          {(enrolling || completed) && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm font-medium text-slate-700">
                <span>Progress</span>
                <span>{enrolledCount} / {matchingLeads.length}</span>
              </div>
              <Progress value={progress} className="h-3" />
              {completed && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-md text-sm font-medium border border-emerald-100">
                    <CheckCircle2 className="h-5 w-5" />
                    All eligible leads have been successfully queued for enrollment!
                  </div>
                  <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded border border-slate-100">
                    Note: The background Nurture Process Engine will initialize these leads and send any immediate steps at the top of the next hour.
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t bg-slate-50/50 p-6">
          <Button variant="outline" onClick={() => router.push('/admin/marketing/nurture-journeys')} disabled={enrolling || activating}>
            {completed ? 'Back to Dashboard' : 'Cancel'}
          </Button>
          {!completed && (
            isDraftOrPaused ? (
              <Button 
                onClick={activateAndStartEnrollment} 
                disabled={matchingLeads.length === 0 || enrolling || activating}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {activating || enrolling ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Activating & Enrolling...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Activate Journey & Enroll Leads</>
                )}
              </Button>
            ) : (
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
            )
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
