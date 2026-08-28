import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, leadId, status, notes, updatedBy, userEmail } = body;

    if (!appointmentId || !status) {
      return NextResponse.json({ error: 'Missing appointmentId or status parameter' }, { status: 400 });
    }

    const validStatuses = ['Pending', 'Scheduled', 'Completed', 'Rescheduled', 'Cancelled', 'No Show'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const db = adminApp.firestore();
    let apptDocRef: FirebaseFirestore.DocumentReference | null = null;
    let apptData: any = null;

    // 1. Search for appointment document in Firestore
    if (leadId) {
      const parentId = leadId.startsWith('training-') ? leadId.replace('training-', '') : leadId;
      const trainingRef = db.collection('training_sessions').doc(parentId).collection('appointments').doc(appointmentId);
      const trainingSnap = await trainingRef.get();
      if (trainingSnap.exists) {
        apptDocRef = trainingRef;
        apptData = trainingSnap.data();
      } else {
        const leadRef = db.collection('leads').doc(leadId).collection('appointments').doc(appointmentId);
        const leadSnap = await leadRef.get();
        if (leadSnap.exists) {
          apptDocRef = leadRef;
          apptData = leadSnap.data();
        } else {
          const compRef = db.collection('companies').doc(leadId).collection('appointments').doc(appointmentId);
          const compSnap = await compRef.get();
          if (compSnap.exists) {
            apptDocRef = compRef;
            apptData = compSnap.data();
          }
        }
      }
    }

    // Fallback: search collectionGroup('appointments') if not found directly
    if (!apptDocRef) {
      const snap = await db.collectionGroup('appointments').where('id', '==', appointmentId).get();
      if (!snap.empty) {
        apptDocRef = snap.docs[0].ref;
        apptData = snap.docs[0].data();
      }
    }

    if (!apptDocRef || !apptData) {
      return NextResponse.json({ error: 'Appointment record not found' }, { status: 404 });
    }

    // 2. Update status & notes in Firestore
    const updateTimestamp = new Date().toISOString();
    const updateData: Record<string, any> = {
      appointmentStatus: status,
      updatedAt: updateTimestamp,
      statusUpdatedBy: updatedBy || userEmail || 'Aleyna Harnett'
    };

    if (notes !== undefined) {
      updateData.statusNotes = notes;
      if (notes.trim()) {
        updateData.notes = apptData.notes ? `${apptData.notes}\n[${status} Note]: ${notes}` : notes;
      }
    }

    await apptDocRef.update(updateData);

    // If appointment is tied to a lead document in 'leads' collection
    const parentDocRef = apptDocRef.parent.parent;
    if (parentDocRef && parentDocRef.parent?.id === 'leads') {
      try {
        const leadSnap = await parentDocRef.get();
        if (leadSnap.exists) {
          const leadData = leadSnap.data() || {};
          const existingAppts = leadData.appointments || [];
          const updatedAppts = existingAppts.map((a: any) =>
            a.id === appointmentId ? { ...a, ...updateData } : a
          );
          await parentDocRef.update({
            appointments: updatedAppts,
            lastOutcomeAt: updateTimestamp
          });
        }
      } catch (err) {
        console.error('Error updating parent lead document on status update:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Appointment status updated to ${status}`,
      appointmentId,
      status
    });
  } catch (error: any) {
    console.error('Error updating training appointment status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update appointment status' },
      { status: 500 }
    );
  }
}
