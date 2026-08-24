import { NextRequest, NextResponse } from 'next/server';
import { provisionLpoPlusAccount, LpoPlusProvisionPayload } from '@/services/lpo-plus-service';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const body: LpoPlusProvisionPayload = await request.json();

    if (!body || !body.netsuiteId || !body.contactEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required payload parameters: netsuiteId and contactEmail' },
        { status: 400 }
      );
    }

    const result = await provisionLpoPlusAccount(body);

    if (result.success) {
      // Sync ProspectPlus record on server using Admin SDK to avoid client permission issues
      try {
        const prospectDb = getFirestore(adminApp);
        const updatedFields = {
          lpoPlusStatus: 'Provisioned',
          defaultPassword: body.defaultPassword || 'MailPlus2026!',
          lpoPlusProvisionedAt: new Date().toISOString(),
          status: 'LPO.Plus Access Sent',
        };

        const compRef = prospectDb.collection('companies').doc(String(body.netsuiteId));
        const compSnap = await compRef.get();
        if (compSnap.exists) {
          await compRef.set(updatedFields, { merge: true });
          await compRef.collection('activity').add({
            type: 'Update',
            notes: `LPO.Plus account created. Auth User (UID: ${result.authId}) and 'lpo' document (${body.netsuiteId}) created in lpoconnect DB. Welcome email dispatched to ${body.contactEmail}.`,
            author: 'System User',
            date: new Date().toISOString(),
            syncedWithNetSuite: false,
          });
        }

        const leadRef = prospectDb.collection('leads').doc(String(body.netsuiteId));
        const leadSnap = await leadRef.get();
        if (leadSnap.exists) {
          await leadRef.set(updatedFields, { merge: true });
          await leadRef.collection('activity').add({
            type: 'Update',
            notes: `LPO.Plus account created. Auth User (UID: ${result.authId}) and 'lpo' document (${body.netsuiteId}) created in lpoconnect DB. Welcome email dispatched to ${body.contactEmail}.`,
            author: 'System User',
            date: new Date().toISOString(),
            syncedWithNetSuite: false,
          });
        }
      } catch (adminErr) {
        console.warn('[API /api/lpo-plus/provision Admin Sync Warning]:', adminErr);
      }

      return NextResponse.json({
        success: true,
        authId: result.authId,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[API /api/lpo-plus/provision Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during LPO.Plus provisioning' },
      { status: 500 }
    );
  }
}

