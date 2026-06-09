import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

const API_KEY = process.env.PROSPECTPLUS_API_KEY;

export async function POST(req: NextRequest) {
  const apiKeyHeader = req.headers.get('x-api-key');

  if (!API_KEY || apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { leadId, jobId, status, ...jobDetails } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    const leadRef = doc(firestore, 'leads', leadId);
    const leadSnap = await getDoc(leadRef);

    if (!leadSnap.exists()) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const leadData = leadSnap.data();
    let currentTrials = leadData.localMileTrialsRemaining;
    const isCompletedCall = status === 'completed';

    const leadUpdates: any = {
      updatedAt: serverTimestamp(),
    };

    if (isCompletedCall) {
      // Decrement trials remaining only on completion
      if (typeof currentTrials === 'number' && currentTrials > 0) {
        currentTrials -= 1;
        leadUpdates.localMileTrialsRemaining = currentTrials;
      }
    } else {
      // It's a job creation call
      const isFirstJob = !leadData.hasCreatedJob;
      const newJobCount = (leadData.jobCount || 0) + 1;
      
      leadUpdates.jobCount = newJobCount;
      leadUpdates.hasCreatedJob = true;
      leadUpdates.lastLocalMileJobCreatedAt = new Date().toISOString();
      leadUpdates.localMileNudgeCount = 0;
      leadUpdates.lastLocalMileNudgeSentAt = null;

      if (isFirstJob) {
        leadUpdates.firstJobCreatedAt = new Date().toISOString();
        if (leadData.status === 'LocalMile Opportunity') {
          leadUpdates.status = 'Trialing LocalMile';
        }
        
        // Remove from 'Activated - No First Job' nurture journey if enrolled
        if (leadData.nurtureJourneyId === 'op8xIHH4I70YeL8NRDly') {
          leadUpdates.nurtureStatus = 'completed';
          leadUpdates.nurtureLastActionAt = new Date().toISOString();
        }
      }

      // --- TRIAL NURTURE JOURNEY ENROLLMENT ---
      try {
        const journeysRef = collection(firestore, 'Journeys');
        const q = query(journeysRef, where('status', '==', 'active'));
        const journeysSnap = await getDocs(q);
        
        let newJourneyId: string | null = null;
        const allTrialJourneyIds: string[] = []; // Keep track of all trial journeys so we can un-enroll from older ones
        
        journeysSnap.forEach((docSnap) => {
          const journey = docSnap.data();
          const nodes = journey.nodes || [];
          
          const triggerNode = nodes.find((n: any) => {
            if (n.type !== 'trigger' || !n.config?.autoEnroll) return false;
            return n.config.enrollConditionGroups?.some((group: any) => 
              group.conditions?.some((cond: any) => cond.field === 'localMileJobCount')
            );
          });
          
          if (triggerNode) {
            allTrialJourneyIds.push(docSnap.id);
            
            const matchesJobCount = triggerNode.config.enrollConditionGroups.some((group: any) => 
              group.conditions?.some((cond: any) => 
                cond.field === 'localMileJobCount' && Number(cond.value) === newJobCount
              )
            );

            if (matchesJobCount) {
              newJourneyId = docSnap.id;
            }
          }
        });

        // Clean out any old trial journeys and add the new one if found
        const currentActive: string[] = leadData.activeJourneys || [];
        const journeysToKeep = currentActive.filter((id) => !allTrialJourneyIds.includes(id));
        
        if (newJourneyId) {
          journeysToKeep.push(newJourneyId);
          console.log(`[LocalMile] Enrolling Lead ${leadId} in Trial Journey ${newJourneyId} for Job Index ${newJobCount}`);
        }
        
        leadUpdates.activeJourneys = journeysToKeep;
      } catch (error) {
        console.error('[LocalMile] Error in Trial Nurture Journey Enrollment:', error);
      }
      // --- END TRIAL NURTURE JOURNEY ENROLLMENT ---
    }

    await updateDoc(leadRef, leadUpdates);

    // Log activity in the CRM
    const activityRef = collection(firestore, 'leads', leadId, 'activity');
    if (isCompletedCall) {
      await addDoc(activityRef, {
        type: 'Update',
        date: new Date().toISOString(),
        notes: `LocalMile Trial completed for job ${jobId}. Remaining trials: ${typeof currentTrials === 'number' ? currentTrials : 'N/A'}`,
        author: 'LocalMile.Plus Webhook'
      });
    } else {
      const isFirstJob = !leadData.hasCreatedJob;
      const newJobCount = (leadData.jobCount || 0) + 1;
      if (isFirstJob) {
        await addDoc(activityRef, {
          type: 'Update',
          date: new Date().toISOString(),
          notes: `First LocalMile Job created!${leadData.nurtureJourneyId === 'op8xIHH4I70YeL8NRDly' ? ' Removed from Nurture Journey.' : ''} Status transitioned to Trialing LocalMile.`,
          author: 'LocalMile.Plus Webhook'
        });
      } else {
        await addDoc(activityRef, {
          type: 'Update',
          date: new Date().toISOString(),
          notes: `LocalMile Job created. Job count: ${newJobCount}.`,
          author: 'LocalMile.Plus Webhook'
        });
      }
    }

    // Save/Update job details in subcollection
    const { setDoc } = require('firebase/firestore');
    const jobDocRef = doc(firestore, 'leads', leadId, 'localMileJobs', String(jobId));
    await setDoc(jobDocRef, {
      jobId,
      status: status || 'created',
      ...jobDetails,
      updatedAt: serverTimestamp(),
      ...(isCompletedCall ? {} : { createdAt: serverTimestamp() })
    }, { merge: true });

    return NextResponse.json({ 
      success: true, 
      message: isCompletedCall ? 'Job completion recorded successfully' : 'Job recorded successfully',
      jobId,
      trialsRemaining: currentTrials
    });

  } catch (error: any) {
    console.error('Error processing LocalMile job:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
