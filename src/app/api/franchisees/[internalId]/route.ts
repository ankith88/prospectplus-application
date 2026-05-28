import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { UpdateFranchiseeSchema } from '@/lib/franchisee-schema';
import { z } from 'zod';

export async function PATCH(request: Request, { params }: { params: { internalId: string } }) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.PROSPECTPLUS_API_KEY;
    
    // Require valid API key
    if (validApiKey && apiKey !== validApiKey) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { internalId } = params;
    if (!internalId) {
      return NextResponse.json({ success: false, message: 'internalId is required' }, { status: 400 });
    }

    const body = await request.json();

    // Parse and validate using the UpdateSchema (partial without defaults)
    const parsedData = UpdateFranchiseeSchema.parse(body);

    // Filter out undefined fields to cleanly drop them from the Firestore update payload
    const updatePayload = Object.fromEntries(
      Object.entries(parsedData).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ success: false, message: 'No valid fields provided for update' }, { status: 400 });
    }

    const db = adminApp.firestore();
    const docRef = db.collection('franchisees').doc(internalId);

    // Apply the update to Firestore
    await docRef.update(updatePayload);

    return NextResponse.json({ 
      success: true, 
      message: `Franchisee ${internalId} updated successfully`,
      updatedFields: Object.keys(updatePayload)
    });

  } catch (error: any) {
    console.error(`[API /franchisees/${params?.internalId}] Update error:`, error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }

    // Handle case where document does not exist yet
    if (error.code === 5 || error.message.includes('NOT_FOUND')) {
       return NextResponse.json({ success: false, message: 'Franchisee document not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { internalId: string } }) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.PROSPECTPLUS_API_KEY;
    
    // Require valid API key
    if (validApiKey && apiKey !== validApiKey) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { internalId } = params;
    if (!internalId) {
      return NextResponse.json({ success: false, message: 'internalId is required' }, { status: 400 });
    }

    const db = adminApp.firestore();
    const docRef = db.collection('franchisees').doc(internalId);

    // Apply the delete to Firestore
    // Using recursiveDelete in case the franchisee document has subcollections
    await db.recursiveDelete(docRef);

    return NextResponse.json({ 
      success: true, 
      message: `Franchisee ${internalId} deleted successfully`
    });

  } catch (error: any) {
    console.error(`[API /franchisees/${params?.internalId}] Delete error:`, error);
    
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
