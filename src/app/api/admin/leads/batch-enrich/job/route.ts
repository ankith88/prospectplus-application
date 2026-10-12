import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';
import { enrichLeadAction } from '@/ai/flows/enrich-lead-flow';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export const dynamic = 'force-dynamic';

// Track active in-memory job workers on this server instance to avoid duplicate processing loops
const activeWorkerJobs = new Set<string>();

/**
 * Sends both an in-app notification and an email notification to the user
 * who started the enrichment batch job once it finishes.
 */
async function sendJobCompletionNotifications(jobId: string, db: FirebaseFirestore.Firestore) {
  try {
    const jobRef = db.collection('enrichment_jobs').doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return;
    const job = jobSnap.data() || {};

    // Prevent duplicate notifications
    if (job.notificationSent) return;

    await jobRef.update({
      notificationSent: true,
      notificationSentAt: FieldValue.serverTimestamp(),
    });

    const requestorUid = job.requestorUid;
    if (!requestorUid) return;

    const totalLeads = job.totalLeads || (job.leadIds?.length || 0);
    const successCount = job.successCount || 0;
    const failureCount = job.failureCount || 0;

    // 1. Fetch user profile
    let userEmail: string | null = null;
    let userName = 'Team Member';
    const userDoc = await db.collection('users').doc(requestorUid).get();
    if (userDoc.exists) {
      const uData = userDoc.data() || {};
      userEmail = uData.email || uData.workEmail || null;
      userName = uData.displayName || `${uData.firstName || ''} ${uData.lastName || ''}`.trim() || 'Team Member';
    }

    // 2. Write In-App Notification to users/{requestorUid}/notifications
    await db.collection('users').doc(requestorUid).collection('notifications').add({
      title: 'AI Lead Batch Enrichment Complete',
      message: `Enrichment finished for ${totalLeads} leads (${successCount} successfully enriched${failureCount > 0 ? `, ${failureCount} skipped` : ''}).`,
      type: 'ai_enrichment_completed',
      createdAt: new Date().toISOString(),
      isRead: false,
      link: '/leads',
      jobId,
    });

    // 3. Send Email Notification if email is available
    if (userEmail && userEmail.includes('@')) {
      const successRate = totalLeads > 0 ? Math.round((successCount / totalLeads) * 100) : 100;
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Lead Enrichment Complete</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td class="content-cell" style="padding: 40px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <div style="font-size: 20px; color: #095c7b; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.5px;">
                AI Lead Batch Enrichment Complete
              </div>
              <p style="margin: 0 0 16px; font-size: 15px; color: #4a5568;">
                Hi ${userName},
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; color: #4a5568;">
                Your background AI lead batch enrichment job has finished running autonomously in the cloud.
              </p>

              <!-- Metrics Summary -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin: 20px 0; padding: 16px;">
                <tr>
                  <td width="33%" style="padding: 10px; text-align: center; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #718096; margin-bottom: 4px;">Total Leads</div>
                    <div style="font-size: 22px; font-weight: 700; color: #095c7b;">${totalLeads.toLocaleString()}</div>
                  </td>
                  <td width="33%" style="padding: 10px; text-align: center; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #38a169; margin-bottom: 4px;">Enriched</div>
                    <div style="font-size: 22px; font-weight: 700; color: #38a169;">${successCount.toLocaleString()}</div>
                  </td>
                  <td width="34%" style="padding: 10px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #718096; margin-bottom: 4px;">Success Rate</div>
                    <div style="font-size: 22px; font-weight: 700; color: #2d3748;">${successRate}%</div>
                  </td>
                </tr>
              </table>

              <!-- Feature Highlights -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                <tr>
                  <td width="32" valign="top" style="padding-top: 2px;">
                    <span style="display: inline-block; width: 8px; height: 8px; background-color: #095c7b; border-radius: 50%;"></span>
                  </td>
                  <td style="font-size: 14px; color: #4a5568; padding-bottom: 8px;">
                    <strong>eCommerce &amp; Shipping Intelligence:</strong> Detected storefronts, PO Boxes, and Australian multi-branches have been saved.
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="padding-top: 2px;">
                    <span style="display: inline-block; width: 8px; height: 8px; background-color: #095c7b; border-radius: 50%;"></span>
                  </td>
                  <td style="font-size: 14px; color: #4a5568; padding-bottom: 8px;">
                    <strong>Dialer Queues Updated:</strong> Your leads have been distributed to your chosen dialers and are ready for outbound calls.
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 30px 0 15px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #095c7b;">
                    <a href="https://prospect.mailplus.com.au/leads" target="_blank" style="font-size: 15px; font-family: 'Inter', sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 28px; display: inline-block; font-weight: 600;">
                      View Enriched Leads &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 6px; font-size: 14px; color: #718096;">Kind regards,</p>
              <p style="margin: 0; font-size: 14px; color: #2d3748;"><strong style="font-weight: 700;">ProspectPlus System</strong></p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; 2026 MailPlus. All rights reserved. <br />
                If you no longer wish to receive marketing communications, you can&nbsp;
                <a href="https://prospect.mailplus.com.au/settings/notifications" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const CC_EMAIL = 'ankith.ravindran@mailplus.com.au';
      const recipientTo = userEmail || CC_EMAIL;
      const ccRecipient = recipientTo.toLowerCase().trim() !== CC_EMAIL.toLowerCase() ? CC_EMAIL : undefined;

      await sendPhysicalEmail({
        to: recipientTo,
        cc: ccRecipient,
        subject: `✅ AI Lead Batch Enrichment Complete: ${successCount.toLocaleString()}/${totalLeads.toLocaleString()} Leads Enriched`,
        html,
        trackingCategory: 'system',
      });
    }
  } catch (err) {
    console.error(`Error in sendJobCompletionNotifications for job ${jobId}:`, err);
  }
}

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

  // Pre-fetch requestor info so that each enriched lead gets an activity logged with the person's name
  let requestorName = 'AI Lead Intelligence Agent';
  let requestorEmail = '';
  let requestorUid = '';
  try {
    const initialSnap = await jobRef.get();
    if (initialSnap.exists) {
      requestorUid = initialSnap.data()?.requestorUid || '';
      if (requestorUid) {
        const uDoc = await db.collection('users').doc(requestorUid).get();
        if (uDoc.exists) {
          const u = uDoc.data() || {};
          requestorName = u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Team Member';
          requestorEmail = u.email || u.workEmail || '';
        }
      }
    }
  } catch (err) {
    console.warn('Could not pre-fetch requestor info:', err);
  }

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
        await sendJobCompletionNotifications(jobId, db);
        break;
      }

      // Process in batches of 6 (concurrency = 6)
      const BATCH_SIZE = 6;
      const batchLeadIds = leadIds.slice(currentIndex, currentIndex + BATCH_SIZE);

      const leadNames = jobData.leadNames || {};
      const batchPromises = batchLeadIds.map(async (id: string) => {
        const fallbackName = leadNames[id] || `Lead #${id.slice(0, 6)}`;
        try {
          const res = await enrichLeadAction(id, { requestorName, requestorEmail, requestorUid });
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
        await sendJobCompletionNotifications(jobId, db);
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
