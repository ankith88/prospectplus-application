import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { UpdateOperatorSchema } from '@/lib/franchisee-schema';
import { z } from 'zod';

export async function PUT(request: Request, { params }: { params: Promise<{ internalId: string }> }) {
  let internalId = '';
  try {
    const resolvedParams = await params;
    internalId = resolvedParams.internalId;
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.PROSPECTPLUS_API_KEY;

    if (validApiKey && apiKey !== validApiKey) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!internalId) {
       return NextResponse.json({ success: false, message: 'Missing internalId' }, { status: 400 });
    }

    const body = await request.json();

    try {
      const parsedData = UpdateOperatorSchema.parse(body);
      
      // Remove any undefined values so they don't overwrite existing fields with null/undefined incorrectly if we don't want to
      const updateData = Object.fromEntries(Object.entries(parsedData).filter(([_, v]) => v !== undefined));

      if (Object.keys(updateData).length === 0) {
         return NextResponse.json({ success: false, message: 'No valid fields provided for update' }, { status: 400 });
      }

      const db = adminApp.firestore();
      const docRef = db.collection('operators').doc(internalId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return NextResponse.json({ success: false, message: 'Operator not found' }, { status: 404 });
      }

      await docRef.update(updateData);

      return NextResponse.json({ success: true, message: 'Operator updated successfully', data: updateData }, { status: 200 });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ success: false, message: 'Validation failed', errors: err.errors }, { status: 400 });
      }
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[API /operators/[internalId] PUT] error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ internalId: string }> }) {
  let internalId = '';
  try {
    const resolvedParams = await params;
    internalId = resolvedParams.internalId;
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.PROSPECTPLUS_API_KEY;

    if (validApiKey && apiKey !== validApiKey) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!internalId) {
       return NextResponse.json({ success: false, message: 'Missing internalId' }, { status: 400 });
    }

    const db = adminApp.firestore();
    const docRef = db.collection('operators').doc(internalId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, message: 'Operator not found' }, { status: 404 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true, message: 'Operator deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('[API /operators/[internalId] DELETE] error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
