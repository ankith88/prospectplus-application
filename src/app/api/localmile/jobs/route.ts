import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const API_KEY = process.env.PROSPECTPLUS_API_KEY;

export async function POST(req: NextRequest) {
  const apiKeyHeader = req.headers.get('x-api-key');

  if (!API_KEY || apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { leadId, ...jobDetails } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    const leadRef = doc(firestore, 'leads', leadId);
    const leadSnap = await getDoc(leadRef);

    if (!leadSnap.exists()) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const leadData = leadSnap.data();
    let currentTrials = leadData.localMileTrialsRemaining;
    const isFirstJob = !leadData.hasCreatedJob;
    const newJobCount = (leadData.jobCount || 0) + 1;

    const leadUpdates: any = {
      jobCount: newJobCount,
      hasCreatedJob: true,
      updatedAt: serverTimestamp()
    };

    if (isFirstJob) {
      leadUpdates.firstJobCreatedAt = new Date().toISOString();
      if (leadData.status === 'LocalMile Opportunity') {
        leadUpdates.status = 'Trialing LocalMile';
      }
    }

    // Decrement trials remaining if present and greater than 0
    if (typeof currentTrials === 'number' && currentTrials > 0) {
      currentTrials -= 1;
      leadUpdates.localMileTrialsRemaining = currentTrials;
    }

    await updateDoc(leadRef, leadUpdates);

    // Log activity in the CRM
    const activityRef = collection(firestore, 'leads', leadId, 'activity');
    if (isFirstJob) {
      await addDoc(activityRef, {
        type: 'Update',
        date: new Date().toISOString(),
        notes: `First LocalMile Job created! Status transitioned to Trialing LocalMile. Remaining trials: ${typeof currentTrials === 'number' ? currentTrials : 'N/A'}`,
        author: 'LocalMile.Plus Webhook'
      });
    } else {
      await addDoc(activityRef, {
        type: 'Update',
        date: new Date().toISOString(),
        notes: `LocalMile Trial used. Job count: ${newJobCount}. Remaining trials: ${typeof currentTrials === 'number' ? currentTrials : 'N/A'}`,
        author: 'LocalMile.Plus Webhook'
      });
    }

    // Save job details in subcollection
    const jobsRef = collection(firestore, 'leads', leadId, 'localMileJobs');
    const jobDoc = await addDoc(jobsRef, {
      ...jobDetails,
      createdAt: serverTimestamp()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Job recorded successfully',
      jobId: jobDoc.id,
      trialsRemaining: currentTrials
    });

  } catch (error: any) {
    console.error('Error processing LocalMile job:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
