import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { extractFranchiseeAgreement } from '@/ai/flows/extract-franchisee-agreement';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ internalId: string }> }
) {
  try {
    const { internalId } = await params;
    if (!internalId) {
      return NextResponse.json({ success: false, message: 'internalId is required' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userUid = (formData.get('userUid') as string) || '';
    const userName = (formData.get('userName') as string) || 'Admin';

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      return NextResponse.json({ success: false, message: 'File must be a PDF document' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Pdf = buffer.toString('base64');
    const pdfDataUri = `data:application/pdf;base64,${base64Pdf}`;

    // Upload to Firebase Storage via adminApp
    const agreementId = uuidv4();
    let downloadUrl = '';
    let storagePath = `franchisee-agreements/${internalId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    try {
      const bucket = adminApp.storage().bucket();
      const bucketFile = bucket.file(storagePath);
      await bucketFile.save(buffer, {
        contentType: 'application/pdf',
        metadata: {
          metadata: {
            uploadedBy: userName,
            userUid: userUid,
            franchiseeId: internalId,
            agreementId: agreementId,
          },
        },
      });
      // Generate public/download URL using Firebase Storage alt=media format
      downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
    } catch (storageError) {
      console.warn('[Upload Agreement] Firebase Storage upload error, using inline reference fallback:', storageError);
      downloadUrl = pdfDataUri;
    }

    // Step 2: Trigger AI Scraping using Genkit flow
    console.log(`[Upload Agreement] Scraping PDF agreement for Franchisee ${internalId} via AI...`);
    let extractedData: any = {};
    try {
      extractedData = await extractFranchiseeAgreement({
        pdfDataUri,
        fileName: file.name,
      });
    } catch (aiErr: any) {
      console.error('[Upload Agreement] AI Scraping error:', aiErr);
      extractedData = {
        error: aiErr.message || 'Failed to analyze PDF content automatically.',
      };
    }

    const db = adminApp.firestore();
    const nowStr = new Date().toISOString();

    const agreementRecord = {
      id: agreementId,
      fileName: file.name,
      storagePath,
      downloadUrl,
      uploadedAt: nowStr,
      uploadedByUid: userUid,
      uploadedByName: userName,
      extractedData,
    };

    // Step 3: Store in Franchisee Document
    const franchiseeRef = db.collection('franchisees').doc(internalId);
    const franDoc = await franchiseeRef.get();
    const existingFran = franDoc.exists ? franDoc.data() || {} : {};

    const existingAgreements = existingFran.agreements || [];
    const updatedAgreements = [agreementRecord, ...existingAgreements];

    const franUpdates: Record<string, any> = {
      agreements: updatedAgreements,
      updatedAt: nowStr,
    };

    if (extractedData.commencementDate && !existingFran.commencementDate) {
      franUpdates.commencementDate = extractedData.commencementDate;
    }
    if (extractedData.expiryDate && !existingFran.expiryDate) {
      franUpdates.expiryDate = extractedData.expiryDate;
    }
    if (extractedData.acnAbn && !existingFran.abn) {
      franUpdates.abn = extractedData.acnAbn;
    }

    await franchiseeRef.set(franUpdates, { merge: true });

    // Step 4: Find and Store in Linked User Records
    const userSnapshots = await db.collection('users').get();
    const updatedUserUids: string[] = [];

    for (const userDoc of userSnapshots.docs) {
      const userData = userDoc.data() || {};
      const linkedIds: string[] = (userData.linkedFranchiseeIds || []).map(String);
      const mainId = String(userData.franchiseeId || userData.franchiseeInternalId || '');

      const isLinked = linkedIds.includes(String(internalId)) || mainId === String(internalId);

      if (isLinked) {
        const userRef = db.collection('users').doc(userDoc.id);
        const existingUserAgreements = userData.franchiseeAgreements || [];
        const updatedUserAgreements = [agreementRecord, ...existingUserAgreements];

        const userUpdatePayload: Record<string, any> = {
          franchiseeAgreements: updatedUserAgreements,
          updatedAt: nowStr,
        };

        if (extractedData.acnAbn && !userData.abn) {
          userUpdatePayload.abn = extractedData.acnAbn;
        }
        if (extractedData.commencementDate && !userData.businessStartDate) {
          userUpdatePayload.businessStartDate = extractedData.commencementDate;
        }
        if (extractedData.registeredAddress) {
          userUpdatePayload.addressDetails = {
            ...(userData.addressDetails || {}),
            registeredAddress: extractedData.registeredAddress,
          };
        }
        if (extractedData.contactEmail && !userData.personalEmail) {
          userUpdatePayload.personalEmail = extractedData.contactEmail;
        }

        await userRef.set(userUpdatePayload, { merge: true });
        updatedUserUids.push(userDoc.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Agreement uploaded and scraped successfully. Updated ${updatedUserUids.length} linked user record(s).`,
      agreement: agreementRecord,
      extractedData,
      updatedUserCount: updatedUserUids.length,
      linkedUserUids: updatedUserUids,
    });
  } catch (error: any) {
    console.error('[API /franchisees/[internalId]/upload-agreement] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to process franchisee agreement.' },
      { status: 500 }
    );
  }
}
