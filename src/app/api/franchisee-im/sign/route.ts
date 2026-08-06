import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { decodePresaleId } from '@/lib/presale-token';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, presaleId, signerName, signerEmail, signatureDataUrl } = body;

    if (!token && !presaleId) {
      return NextResponse.json({ success: false, message: 'Presale token or ID is required.' }, { status: 400 });
    }

    if (!signatureDataUrl) {
      return NextResponse.json({ success: false, message: 'Signature is required.' }, { status: 400 });
    }

    const decodedId = decodePresaleId(token || presaleId);
    const db = adminApp.firestore();

    // Look up presale document in franchisee_presales collection
    let presaleDoc = await db.collection('franchisee_presales').doc(decodedId).get();
    let targetDocId = decodedId;

    if (!presaleDoc.exists) {
      // Query by publicToken or franchiseeId if doc ID wasn't direct match
      const snap = await db.collection('franchisee_presales')
        .where('presalesDetails.publicToken', '==', token)
        .limit(1)
        .get();

      if (!snap.empty) {
        presaleDoc = snap.docs[0];
        targetDocId = presaleDoc.id;
      } else {
        const snap2 = await db.collection('franchisee_presales')
          .where('franchiseeId', '==', decodedId)
          .limit(1)
          .get();

        if (!snap2.empty) {
          presaleDoc = snap2.docs[0];
          targetDocId = presaleDoc.id;
        }
      }
    }

    if (!presaleDoc.exists) {
      return NextResponse.json({ success: false, message: 'Presale record not found.' }, { status: 404 });
    }

    const currentData = presaleDoc.data() || {};
    const existingPresalesDetails = currentData.presalesDetails || {};
    const nowIso = new Date().toISOString();

    const updatedPresalesDetails = {
      ...existingPresalesDetails,
      imStatus: 'signed_online',
      signedAt: nowIso,
      signerName: signerName || currentData.mainDetails?.mainContact || 'Franchisee',
      signerEmail: signerEmail || currentData.mainDetails?.email || '',
      signatureDataUrl,
    };

    // Update Presale document in Firestore
    await db.collection('franchisee_presales').doc(targetDocId).set({
      presalesDetails: updatedPresalesDetails,
      step4Status: 'Completed',
      status: 'Active Presale',
      updatedAt: nowIso,
    }, { merge: true });

    // Update corresponding Franchisee document in franchisees collection
    const fId = currentData.franchiseeId || targetDocId;
    if (fId) {
      const fRef = db.collection('franchisees').doc(String(fId));
      const fDoc = await fRef.get();
      if (fDoc.exists) {
        await fRef.set({
          presaleStatus: 'Active Presale',
          isForSale: true,
          updatedAt: nowIso,
        }, { merge: true });
      } else {
        // Query by internalId or prospectPlusId
        const fSnap = await db.collection('franchisees')
          .where('internalId', '==', String(fId))
          .limit(1)
          .get();

        if (!fSnap.empty) {
          await fSnap.docs[0].ref.set({
            presaleStatus: 'Active Presale',
            isForSale: true,
            updatedAt: nowIso,
          }, { merge: true });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Franchisee IM signed successfully. Presale status is now Active Presale.',
      signedAt: nowIso,
      status: 'Active Presale',
    });
  } catch (error: any) {
    console.error('Error signing Franchisee IM:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
