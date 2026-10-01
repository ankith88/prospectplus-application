import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';
import { enrichLeadAction } from '@/ai/flows/enrich-lead-flow';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadIds, requestorUid, maxConcurrency = 3 } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "The request payload must contain a non-empty 'leadIds' array." },
        { status: 400 }
      );
    }

    const db = getFirestore(adminApp);

    // Strict Authorization Check: Only Super Admins and Admin roles
    let isAuthorized = false;

    if (requestorUid) {
      if (SUPER_ADMIN_UIDS.includes(requestorUid)) {
        isAuthorized = true;
      } else {
        const userDoc = await db.collection('users').doc(requestorUid).get();
        if (userDoc.exists) {
          const uData = userDoc.data() || {};
          const role = String(uData.role || uData.activeRole || uData.defaultRole || '').trim().toLowerCase();
          const assignedRoles = Array.isArray(uData.assignedRoles)
            ? uData.assignedRoles.map((r: any) => String(r).trim().toLowerCase())
            : [];
          const allowedRoles = ['admin', 'super_admin', 'super admin', 'super user', 'superadmin'];

          if (
            uData.isSuperAdmin === true ||
            allowedRoles.includes(role) ||
            assignedRoles.some((r) => allowedRoles.includes(r))
          ) {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Batch enrichment is restricted to Admins and Super Admins.' },
        { status: 403 }
      );
    }

    // Process in controlled concurrency chunks
    const results: Array<{ leadId: string; success: boolean; error?: string }> = [];
    const concurrency = Math.min(Math.max(1, maxConcurrency), 5);

    for (let i = 0; i < leadIds.length; i += concurrency) {
      const chunk = leadIds.slice(i, i + concurrency);
      const chunkPromises = chunk.map(async (id: string) => {
        try {
          const res = await enrichLeadAction(id);
          if (res.success) {
            return { leadId: id, success: true };
          } else {
            return { leadId: id, success: false, error: res.error };
          }
        } catch (err: any) {
          return { leadId: id, success: false, error: err.message || String(err) };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      total: leadIds.length,
      successCount,
      failureCount,
      results,
      message: `Enrichment completed for ${successCount} of ${leadIds.length} leads.`,
    });
  } catch (error: any) {
    console.error('Error in batch lead enrichment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
