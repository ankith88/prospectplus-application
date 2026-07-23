import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/services/firebase-server';
import { decryptLeadId } from '@/lib/localmile-security';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const token = resolvedParams.id;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing lead identifier' }, { status: 400 });
    }

    const targetId = decryptLeadId(token) || token;

    // Try leads collection first, fallback to companies
    let docRef = adminDb.collection('leads').doc(targetId);
    let docSnap = await docRef.get();
    let isCompany = false;

    if (!docSnap.exists) {
      docRef = adminDb.collection('companies').doc(targetId);
      docSnap = await docRef.get();
      isCompany = true;
    }

    // Fallback: search by ID field if document ID wasn't direct match
    if (!docSnap.exists) {
      const q = await adminDb.collection('leads').where('id', '==', targetId).limit(1).get();
      if (!q.empty) {
        docSnap = q.docs[0];
        docRef = docSnap.ref;
        isCompany = false;
      } else {
        const qComp = await adminDb.collection('companies').where('id', '==', targetId).limit(1).get();
        if (!qComp.empty) {
          docSnap = qComp.docs[0];
          docRef = docSnap.ref;
          isCompany = true;
        }
      }
    }

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const body = await req.json();
    const { action, note } = body;

    if (!['lost', 'convert'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const nowISO = new Date().toISOString();
    const newStatus = action === 'lost' ? 'Lost' : 'Won';

    const updates: Record<string, any> = {
      status: newStatus,
      customerStatus: newStatus,
      updatedAt: nowISO,
      lastModifiedBy: 'Public LPO Opportunity Portal',
    };

    if (action === 'convert') {
      updates.lpoConvertedAt = nowISO;
    } else {
      updates.lpoLostAt = nowISO;
    }

    const activityNoteText = action === 'lost'
      ? `Status marked as Lost from Public LPO Opportunity Portal.${note ? ` User Note: ${note}` : ''}`
      : `Opportunity successfully Converted (Won) from Public LPO Opportunity Portal.${note ? ` User Note: ${note}` : ''}`;

    const newActivity = {
      id: `act-${Date.now()}`,
      type: 'Update',
      date: nowISO,
      notes: activityNoteText,
      author: 'Public LPO Opportunity Portal',
    };

    const newNoteObj = {
      id: `note-${Date.now()}`,
      date: nowISO,
      author: 'Public LPO Opportunity Portal',
      content: activityNoteText,
    };

    // Update document
    const existingNotes = docSnap.data()?.notes || [];
    const updatedNotes = Array.isArray(existingNotes) 
      ? [newNoteObj, ...existingNotes]
      : typeof existingNotes === 'string'
        ? `${newNoteObj.content}\n\n${existingNotes}`
        : [newNoteObj];

    await docRef.update({
      ...updates,
      notes: updatedNotes,
      activities: FieldValue.arrayUnion(newActivity),
    });

    // Write to subcollections for full compatibility
    await docRef.collection('notes').add(newNoteObj).catch(() => {});
    await docRef.collection('activity').add(newActivity).catch(() => {});

    // Call NetSuite outcome API endpoint (script 2514, deploy 1)
    try {
      const leadData = docSnap.data() || {};
      const salesRep = leadData.salesRepAssigned || leadData.accountManagerAssigned || leadData.dialerAssigned || 'System';
      const nsBaseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
      const nsParams = new URLSearchParams({
        script: "2514",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQJhlGIUNNmxKFwd5sprCqoBuWrh_H7J14_qzpLd1ajvg",
        leadId: targetId,
        outcome: action === 'lost' ? 'Lost' : 'Sign Up',
        salesRep: salesRep,
        processedBy: 'Public LPO Opportunity Portal',
      });

      if (note) {
        nsParams.append('cancellationNotes', note);
        nsParams.append('cancellationReason', note);
      }

      const nsUrl = `${nsBaseUrl}?${nsParams.toString()}`;
      const nsRes = await fetch(nsUrl, { method: 'GET' });
      if (nsRes.ok) {
        console.log(`[NetSuite LPO Action Sync] Successfully synced ${action} for lead ${targetId}`);
      } else {
        console.warn(`[NetSuite LPO Action Sync] NetSuite returned status ${nsRes.status} for lead ${targetId}`);
      }
    } catch (nsErr) {
      console.error('[NetSuite LPO Action Sync Error] Failed to send NetSuite update:', nsErr);
    }

    return NextResponse.json({
      success: true,
      newStatus,
      message: `Opportunity status successfully updated to ${newStatus}.`,
    });
  } catch (error: any) {
    console.error('Error processing LPO Opportunity action:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
