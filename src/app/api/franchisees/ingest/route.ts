import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { FranchiseeSchema } from '@/lib/franchisee-schema';
import { syncFranchiseeUsers } from '@/lib/franchisee-user-service';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.PROSPECTPLUS_API_KEY;
    
    // Use API key for securing ingestion if provided, otherwise fail in production if not set
    if (validApiKey && apiKey !== validApiKey) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Payload must be an array of franchisee objects' }, { status: 400 });
    }

    const db = adminApp.firestore();
    const franchiseesRef = db.collection('franchisees');

    let processedCount = 0;
    const errors: { index: number; error: any }[] = [];

    // Parse and process franchisee operations
    for (let i = 0; i < body.length; i++) {
      try {
        const parsedData = FranchiseeSchema.parse(body[i]);
        const docRef = franchiseesRef.doc(parsedData.internalId);

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
        };

        // Remove users array from direct franchisee document save
        delete franchiseePayload.users;

        // Process associated users if provided
        if (parsedData.users && parsedData.users.length > 0) {
          const newLinkedUids = await syncFranchiseeUsers(
            parsedData.internalId,
            parsedData.name || '',
            parsedData.users
          );

          const existingDoc = await docRef.get();
          const existingLinked: string[] = existingDoc.exists ? (existingDoc.data()?.linkedUserIds || []) : [];
          const updatedLinkedUserIds = Array.from(new Set([...existingLinked, ...newLinkedUids]));

          franchiseePayload.linkedUserIds = updatedLinkedUserIds;
          if (newLinkedUids.length > 0 && !existingDoc.data()?.currentOwnerUserId) {
            franchiseePayload.currentOwnerUserId = newLinkedUids[0];
          }
        }

        await docRef.set(franchiseePayload, { merge: true });
        processedCount++;

      } catch (err) {
        if (err instanceof z.ZodError) {
           errors.push({ index: i, error: err.errors });
        } else {
           errors.push({ index: i, error: String((err as any)?.message || err) });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: processedCount, 
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('[API /franchisees/ingest] Fatal error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
