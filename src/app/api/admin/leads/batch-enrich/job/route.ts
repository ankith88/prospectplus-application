import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';
import { enrichLeadAction } from '@/ai/flows/enrich-lead-flow';

export const dynamic = 'force-dynamic';

// Track active in-memory job workers on this server instance to avoid duplicate processing loops
const activeWorkerJobs = new Set<string>();

/**
 * Background worker loop that runs autonomously on the server.
 * Continues processing leads even if the user logs out or closes their browser.
 */
async function startJobWorker(jobId: string) {
  if (activeWorkerJobs.has(jobId)) {
    return; // Worker already running for this job
  }
  activeWorkerJobs.add(jobId);

  const db = getFirestore(adminApp);
  const jobRef = db.collection('enrichment_jobs').doc(jobId);

  try {
    while (true) {
      const jobSnap = await jobRef.get();
      if (!jobSnap.exists) break;

      const jobData = jobSnap.data() || {};
      const status = jobData.status;

      // Exit loop if paused, stopped, or completed
      if (status !== 'running') {
        break;
      }

      const leadIds: string[] = jobData.leadIds || [];
      const currentIndex: number = jobData.currentIndex || 0;

      if (currentIndex >= leadIds.length) {
        // Job finished
        await jobRef.update({
          status: 'completed',
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        break;
      }

      // Process in batches of 6 (concurrency = 6)
      const BATCH_SIZE = 6;
      const batchLeadIds = leadIds.slice(currentIndex, currentIndex + BATCH_SIZE);

      const leadNames = jobData.leadNames || {};
      const batchPromises = batchLeadIds.map(async (id: string) => {
        const fallbackName = leadNames[id] || `Lead #${id.slice(0, 6)}`;
        try {
          const res = await enrichLeadAction(id);
          if (res.success) {
            return {
              leadId: id,
              success: true,
              companyName: res.data?.companyName || fallbackName,
              ecommercePlatform: res.data?.shopifyDetected,
              hasMultipleBranches: res.data?.hasMultipleBranches,
              totalBranchCount: res.data?.totalBranchCount,
              hasPoBox: res.data?.hasPoBox,
              industryCategory: res.data?.industryCategory,
            };
          } else {
            return { leadId: id, success: false, companyName: fallbackName, error: res.error };
          }
        } catch (err: any) {
          return { leadId: id, success: false, companyName: fallbackName, error: err.message || String(err) };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Check if job status changed while batch was processing
      const freshSnap = await jobRef.get();
      const freshStatus = freshSnap.data()?.status;
      if (freshStatus !== 'running') {
        break;
      }

      const newSuccesses = batchResults.filter((r) => r.success).length;
      const newFailures = batchResults.filter((r) => !r.success).length;
      const nextIndex = currentIndex + batchLeadIds.length;

      // Keep recent results window of 30 items for live stream
      const currentRecent = freshSnap.data()?.recentResults || [];
      const updatedRecent = [...batchResults, ...currentRecent].slice(0, 30);

      const isAllDone = nextIndex >= leadIds.length;

      await jobRef.update({
        currentIndex: nextIndex,
        processedCount: FieldValue.increment(batchLeadIds.length),
        successCount: FieldValue.increment(newSuccesses),
        failureCount: FieldValue.increment(newFailures),
        recentResults: updatedRecent,
        status: isAllDone ? 'completed' : 'running',
        completedAt: isAllDone ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (isAllDone) {
        break;
      }

      // Small throttle between batches
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  } catch (error) {
    console.error(`Error in background job worker for job ${jobId}:`, error);
  } finally {
    activeWorkerJobs.delete(jobId);
  }
}

/**
 * Verify Admin Authorization
 */
async function checkAdminAuth(requestorUid: string | undefined): Promise<boolean> {
  if (!requestorUid) return false;
  if (SUPER_ADMIN_UIDS.includes(requestorUid)) return true;

  const db = getFirestore(adminApp);
  const userDoc = await db.collection('users').doc(requestorUid).get();
  if (!userDoc.exists) return false;

  const uData = userDoc.data() || {};
  const role = String(uData.role || uData.activeRole || uData.defaultRole || '').trim().toLowerCase();
  const assignedRoles = Array.isArray(uData.assignedRoles)
    ? uData.assignedRoles.map((r: any) => String(r).trim().toLowerCase())
    : [];
  const allowedRoles = ['admin', 'super_admin', 'super admin', 'super user', 'superadmin'];

  return (
    uData.isSuperAdmin === true ||
    allowedRoles.includes(role) ||
    assignedRoles.some((r) => allowedRoles.includes(r))
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, jobId, leadIds, leadNames, requestorUid, assignedDialers } = body;

    const isAuthorized = await checkAdminAuth(requestorUid);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const db = getFirestore(adminApp);

    // 1. CREATE NEW JOB
    if (action === 'create') {
      if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return NextResponse.json({ success: false, error: 'No leadIds provided.' }, { status: 400 });
      }

      const newJobRef = db.collection('enrichment_jobs').doc();
      const newJobId = newJobRef.id;

      await newJobRef.set({
        id: newJobId,
        status: 'running',
        totalLeads: leadIds.length,
        leadIds,
        leadNames: leadNames || {},
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
        currentIndex: 0,
        recentResults: [],
        assignedDialers: assignedDialers || [],
        requestorUid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: null,
      });

      // Detach and run background worker independently
      startJobWorker(newJobId).catch((err) => {
        console.error('Failed to run background job worker:', err);
      });

      return NextResponse.json({
        success: true,
        jobId: newJobId,
        totalLeads: leadIds.length,
        message: 'Background enrichment job created and started successfully.',
      });
    }

    // 2. PAUSE JOB
    if (action === 'pause') {
      if (!jobId) return NextResponse.json({ success: false, error: 'Job ID required.' }, { status: 400 });
      await db.collection('enrichment_jobs').doc(jobId).update({
        status: 'paused',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, message: 'Job paused.' });
    }

    // 3. RESUME JOB
    if (action === 'resume') {
      if (!jobId) return NextResponse.json({ success: false, error: 'Job ID required.' }, { status: 400 });
      await db.collection('enrichment_jobs').doc(jobId).update({
        status: 'running',
        updatedAt: FieldValue.serverTimestamp(),
      });
      startJobWorker(jobId).catch((err) => {
        console.error('Failed to resume background worker:', err);
      });
      return NextResponse.json({ success: true, message: 'Job resumed.' });
    }

    // 4. STOP JOB
    if (action === 'stop') {
      if (!jobId) return NextResponse.json({ success: false, error: 'Job ID required.' }, { status: 400 });
      await db.collection('enrichment_jobs').doc(jobId).update({
        status: 'stopped',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, message: 'Job stopped.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in batch enrichment job API:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const active = searchParams.get('active');

    const db = getFirestore(adminApp);

    // Fetch specific job
    if (jobId) {
      const snap = await db.collection('enrichment_jobs').doc(jobId).get();
      if (!snap.exists) {
        return NextResponse.json({ success: false, error: 'Job not found.' }, { status: 404 });
      }
      const data = snap.data();

      // Self-healing watchdog: If job is 'running' but worker isn't active and updatedAt is > 40s ago, restart worker
      if (data?.status === 'running' && !activeWorkerJobs.has(jobId)) {
        const lastUpdated = data.updatedAt?.toDate?.() ? data.updatedAt.toDate().getTime() : 0;
        if (Date.now() - lastUpdated > 40000) {
          startJobWorker(jobId).catch(() => {});
        }
      }

      return NextResponse.json({ success: true, job: data });
    }

    // Fetch latest active/running or recently completed job
    if (active === 'true') {
      const runningSnap = await db
        .collection('enrichment_jobs')
        .where('status', 'in', ['running', 'paused'])
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get();

      if (!runningSnap.empty) {
        const doc = runningSnap.docs[0];
        const data = doc.data();

        // Watchdog resume if stalled
        if (data?.status === 'running' && !activeWorkerJobs.has(doc.id)) {
          const lastUpdated = data.updatedAt?.toDate?.() ? data.updatedAt.toDate().getTime() : 0;
          if (Date.now() - lastUpdated > 40000) {
            startJobWorker(doc.id).catch(() => {});
          }
        }

        return NextResponse.json({ success: true, job: data });
      }

      // Check if there is a job completed in the last 15 minutes
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const recentCompletedSnap = await db
        .collection('enrichment_jobs')
        .where('status', '==', 'completed')
        .where('completedAt', '>=', fifteenMinsAgo)
        .orderBy('completedAt', 'desc')
        .limit(1)
        .get();

      if (!recentCompletedSnap.empty) {
        return NextResponse.json({ success: true, job: recentCompletedSnap.docs[0].data() });
      }

      return NextResponse.json({ success: true, job: null });
    }

    return NextResponse.json({ success: false, error: 'Missing jobId or active parameter.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching batch enrichment job:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
