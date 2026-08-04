import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { FranchiseeSchema } from '@/lib/franchisee-schema';
import { syncFranchiseeUsers } from '@/lib/franchisee-user-service';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.PROSPECTPLUS_API_KEY;

    if (validApiKey && apiKey !== validApiKey) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body using FranchiseeSchema
    const parsedData = FranchiseeSchema.parse(body);

    const db = adminApp.firestore();
    const docRef = db.collection('franchisees').doc(parsedData.internalId);

    // Normalize franchisor fees
    const franchisorFees = {
      adminFee: parsedData.franchisorFees?.adminFee ?? parsedData.adminFee ?? 0,
      marketingFee: parsedData.franchisorFees?.marketingFee ?? parsedData.marketingFee ?? 0,
      headOfficeFee: parsedData.franchisorFees?.headOfficeFee ?? parsedData.headOfficeFee ?? 0,
    };

    const franchiseePayload: Record<string, any> = {
      ...parsedData,
      adminFee: franchisorFees.adminFee,
      marketingFee: franchisorFees.marketingFee,
      headOfficeFee: franchisorFees.headOfficeFee,
      franchisorFees,
      updatedAt: new Date().toISOString(),
    };

    // Remove users array from direct franchisee doc payload
    delete franchiseePayload.users;

    let linkedUserIds: string[] = [];
    if (parsedData.users && parsedData.users.length > 0) {
      linkedUserIds = await syncFranchiseeUsers(
        parsedData.internalId,
        parsedData.name || '',
        parsedData.users
      );

      const existingDoc = await docRef.get();
      const existingLinked: string[] = existingDoc.exists ? (existingDoc.data()?.linkedUserIds || []) : [];
      const updatedLinked = Array.from(new Set([...existingLinked, ...linkedUserIds]));

      franchiseePayload.linkedUserIds = updatedLinked;
      if (linkedUserIds.length > 0 && (!existingDoc.exists || !existingDoc.data()?.currentOwnerUserId)) {
        franchiseePayload.currentOwnerUserId = linkedUserIds[0];
      }
    }

    await docRef.set(franchiseePayload, { merge: true });

    return NextResponse.json({
      success: true,
      message: `Franchisee ${parsedData.internalId} processed successfully`,
      internalId: parsedData.internalId,
      linkedUserIds,
    });

  } catch (error: any) {
    console.error('[API /franchisees] Creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }

    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
