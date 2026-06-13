import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { OperatorSchema } from '@/lib/franchisee-schema';
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
      return NextResponse.json({ success: false, message: 'Payload must be an array of operator objects' }, { status: 400 });
    }

    const db = adminApp.firestore();
    let batch = db.batch();
    const operatorsRef = db.collection('operators');

    let processedCount = 0;
    let batchCount = 0;
    const errors: { index: number; error: any }[] = [];

    // Parse and prepare batch operations
    for (let i = 0; i < body.length; i++) {
      try {
        const parsedData = OperatorSchema.parse(body[i]);
        
        // Ensure ID matches internalId 
        const docRef = operatorsRef.doc(parsedData.internalId);
        
        batch.set(docRef, parsedData, { merge: true }); // Merge ensures we can update existing gracefully
        processedCount++;
        batchCount++;

        // Firestore batches have a 500 document limit, so commit every 400
        if (batchCount === 400) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }

      } catch (err) {
        if (err instanceof z.ZodError) {
           errors.push({ index: i, error: err.errors });
        } else {
           errors.push({ index: i, error: String(err) });
        }
      }
    }

    // Commit any remaining operations in the final batch
    if (batchCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({ 
      success: true, 
      processed: processedCount, 
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('[API /operators/ingest] Fatal error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
