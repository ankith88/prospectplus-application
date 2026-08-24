import { NextRequest, NextResponse } from 'next/server';
import { resetLpoPlusPassword, LpoPlusResetPasswordPayload } from '@/services/lpo-plus-service';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const body: LpoPlusResetPasswordPayload = await request.json();

    if (!body || !body.netsuiteId || !body.contactEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required payload parameters: netsuiteId and contactEmail' },
        { status: 400 }
      );
    }

    const newPassword = body.newPassword || 'MailPlus2026!';
    const result = await resetLpoPlusPassword({ ...body, newPassword });

    if (result.success) {
      // Sync ProspectPlus record on server using Admin SDK
      try {
        const prospectDb = getFirestore(adminApp);
        const updatedFields = {
          defaultPassword: newPassword,
          lpoPlusPasswordResetAt: new Date().toISOString(),
        };

        const compRef = prospectDb.collection('companies').doc(String(body.netsuiteId));
        const compSnap = await compRef.get();
        if (compSnap.exists) {
          await compRef.set(updatedFields, { merge: true });
          await compRef.collection('activity').add({
            type: 'Update',
            notes: `LPO.Plus account password reset. Password reset notification email dispatched to ${body.contactEmail}.`,
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
            notes: `LPO.Plus account password reset. Password reset notification email dispatched to ${body.contactEmail}.`,
            author: 'System User',
            date: new Date().toISOString(),
            syncedWithNetSuite: false,
          });
        }
      } catch (adminErr) {
        console.warn('[API /api/lpo-plus/reset-password Admin Sync Warning]:', adminErr);
      }

      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[API /api/lpo-plus/reset-password Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during password reset' },
      { status: 500 }
    );
  }
}
