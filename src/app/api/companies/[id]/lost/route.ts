import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendCancellationNotificationEmail } from '@/lib/cancellation-email';

const db = getFirestore(adminApp);
const API_KEY = process.env.PROSPECTPLUS_API_KEY;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKeyHeader = req.headers.get('x-api-key');
  const resolvedParams = await params;
  const companyId = resolvedParams.id;

  if (!API_KEY || apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      cancellationDate,
      cancellationReason,
      cancellationReasonId,
      cancellationTheme,
      cancellationThemeId,
      cancellationWhyId,
      cancellationCategory,
      notes,
      serviceCancelledOnDate,
      serviceCancelledBy
    } = body;

    if (!cancellationDate) {
      return NextResponse.json({ error: 'cancellationDate is required' }, { status: 400 });
    }

    const cancelledOn = serviceCancelledOnDate || new Date().toISOString().substring(0, 10);
    const cancelledBy = serviceCancelledBy || 'API';

    // Check both 'companies' and 'leads' collections
    const companyRef = db.collection('companies').doc(companyId);
    const leadRef = db.collection('leads').doc(companyId);

    const [companySnap, leadSnap] = await Promise.all([
      companyRef.get(),
      leadRef.get()
    ]);

    if (!companySnap.exists && !leadSnap.exists) {
      return NextResponse.json({ error: 'Customer or Lead not found' }, { status: 404 });
    }

    const primarySnap = companySnap.exists ? companySnap : leadSnap;
    const currentData = primarySnap.data() || {};
    const companyName = currentData.companyName || 'Unknown Company';

    // Prepare update payload
    const updateData: any = {
      customerStatus: 'Lost Customer',
      status: 'Lost Customer',
      cancellationdate: cancellationDate,
      cancellationDate: cancellationDate,
      cancellationReason: cancellationReason || 'Other',
      cancellationReasonId: cancellationReasonId || '',
      cancellationTheme: cancellationTheme || '',
      cancellationThemeId: cancellationThemeId || '',
      cancellationCategory: cancellationCategory || '',
      cancellationWhyId: cancellationWhyId || '',
      serviceCancelledOnDate: cancelledOn,
      serviceCancelledBy: cancelledBy,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (companySnap.exists) {
      await companyRef.update(updateData);
      await companyRef.collection('activity').add({
        type: 'Update',
        date: new Date().toISOString(),
        notes: `Customer marked as Lost via API by ${cancelledBy}. Reason: ${cancellationReason || 'Other'}. Theme: ${cancellationTheme || 'None'}. Stop Date: ${cancellationDate}. Service Cancelled On: ${cancelledOn}.`,
        author: cancelledBy,
        syncedWithNetSuite: false
      });
    }

    if (leadSnap.exists) {
      await leadRef.update(updateData);
      await leadRef.collection('activity').add({
        type: 'Update',
        date: new Date().toISOString(),
        notes: `Customer marked as Lost via API by ${cancelledBy}. Reason: ${cancellationReason || 'Other'}. Theme: ${cancellationTheme || 'None'}. Stop Date: ${cancellationDate}. Service Cancelled On: ${cancelledOn}.`,
        author: cancelledBy,
        syncedWithNetSuite: false
      });
    }

    // Record the cancellation in the 'cancellations' collection
    const cancellationsRef = db.collection('cancellations');
    await cancellationsRef.add({
      leadId: companyId,
      companyName,
      contactName: currentData.contacts?.[0]?.name || '',
      contactEmail: currentData.customerServiceEmail || '',
      contactPhone: currentData.customerPhone || '',
      requestedDate: new Date().toISOString(),
      cancellationDate,
      trueServiceCancellationDate: cancellationDate,
      cancellationReason: cancellationReason || 'Other',
      cancellationReasonId: cancellationReasonId || '',
      cancellationTheme: cancellationTheme || '',
      cancellationThemeId: cancellationThemeId || '',
      cancellationWhyId: cancellationWhyId || '',
      cancellationCategory: cancellationCategory || '',
      status: 'Cancelled',
      originalServices: currentData.services || [],
      notes: notes || '',
      serviceCancelledOnDate: cancelledOn,
      serviceCancelledBy: cancelledBy,
      processedBy: cancelledBy,
      processedAt: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp()
    });

    // Send cancellation notification email
    try {
      await sendCancellationNotificationEmail({
        leadId: companyId,
        netsuiteId: currentData.netsuiteId || '',
        companyName,
        contactName: currentData.contacts?.[0]?.name || '',
        contactEmail: currentData.customerServiceEmail || '',
        contactPhone: currentData.customerPhone || '',
        cancellationTheme: cancellationTheme || '',
        cancellationWhy: cancellationCategory || '',
        cancellationReason: cancellationReason || 'Other',
        cancellationNotes: notes || '',
        cancellationDate,
        trueServiceCancellationDate: cancellationDate,
        processedBy: cancelledBy,
      });
    } catch (emailErr) {
      console.error('[Companies Lost Route] Error sending cancellation notification email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Customer successfully marked as lost.',
      id: companyId
    });

  } catch (error: any) {
    console.error('Error marking customer as lost via API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(req, { params });
}
