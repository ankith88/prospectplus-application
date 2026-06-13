import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { OperatorSchema } from '@/lib/franchisee-schema';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.PROSPECTPLUS_API_KEY;

    if (validApiKey && apiKey !== validApiKey) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    try {
      const parsedData = OperatorSchema.parse(body);
      const db = adminApp.firestore();
      
      const docRef = db.collection('operators').doc(parsedData.internalId);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
         return NextResponse.json({ success: false, message: 'Operator with this internalId already exists.' }, { status: 409 });
      }

      await docRef.set(parsedData);

      return NextResponse.json({ success: true, message: 'Operator created successfully', data: parsedData }, { status: 201 });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ success: false, message: 'Validation failed', errors: err.errors }, { status: 400 });
      }
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[API /operators POST] error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
