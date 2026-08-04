import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { UpdateFranchiseeSchema } from '@/lib/franchisee-schema';
import { syncFranchiseeUsers } from '@/lib/franchisee-user-service';
import { z } from 'zod';

export async function PATCH(request: Request, { params }: { params: Promise<{ internalId: string }> }) {
  let internalId = '';
  try {
    const resolvedParams = await params;
    internalId = resolvedParams.internalId;
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.PROSPECTPLUS_API_KEY;
    
    // Require valid API key
    if (validApiKey && apiKey !== validApiKey) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!internalId) {
      return NextResponse.json({ success: false, message: 'internalId is required' }, { status: 400 });
    }

    const body = await request.json();

    // Parse and validate using the UpdateSchema (partial without defaults)
    const parsedData = UpdateFranchiseeSchema.parse(body);

    const db = adminApp.firestore();
    const docRef = db.collection('franchisees').doc(internalId);
    const existingDoc = await docRef.get();

    if (!existingDoc.exists) {
      return NextResponse.json({ success: false, message: 'Franchisee document not found' }, { status: 404 });
    }

    const existingData = existingDoc.data() || {};
    const franchiseeName = parsedData.name || existingData.name || '';

    // Handle user sync if users array is provided
    let updatedLinkedUserIds: string[] | undefined;
    if (parsedData.users && parsedData.users.length > 0) {
      const newLinkedUids = await syncFranchiseeUsers(
        internalId,
        franchiseeName,
        parsedData.users
      );
      const existingLinked: string[] = existingData.linkedUserIds || [];
      updatedLinkedUserIds = Array.from(new Set([...existingLinked, ...newLinkedUids]));
    }

    // Filter out undefined fields to cleanly drop them from the Firestore update payload
    const updatePayload = Object.fromEntries(
      Object.entries(parsedData).filter(([k, v]) => v !== undefined && k !== 'users')
    );

    // Merge franchisor fees object if provided or individual fee fields provided
    if (parsedData.franchisorFees || parsedData.adminFee !== undefined || parsedData.marketingFee !== undefined || parsedData.headOfficeFee !== undefined) {
      const existingFees = existingData.franchisorFees || {};
      const updatedFees = {
        adminFee: parsedData.franchisorFees?.adminFee ?? parsedData.adminFee ?? existingFees.adminFee ?? existingData.adminFee ?? 0,
        marketingFee: parsedData.franchisorFees?.marketingFee ?? parsedData.marketingFee ?? existingFees.marketingFee ?? existingData.marketingFee ?? 0,
        headOfficeFee: parsedData.franchisorFees?.headOfficeFee ?? parsedData.headOfficeFee ?? existingFees.headOfficeFee ?? existingData.headOfficeFee ?? 0,
      };
      updatePayload.franchisorFees = updatedFees;
      updatePayload.adminFee = updatedFees.adminFee;
      updatePayload.marketingFee = updatedFees.marketingFee;
      updatePayload.headOfficeFee = updatedFees.headOfficeFee;
    }

    if (updatedLinkedUserIds) {
      updatePayload.linkedUserIds = updatedLinkedUserIds;
      if (!existingData.currentOwnerUserId && updatedLinkedUserIds.length > 0) {
        updatePayload.currentOwnerUserId = updatedLinkedUserIds[0];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ success: false, message: 'No valid fields provided for update' }, { status: 400 });
    }

    // Apply the update to Firestore
    await docRef.update(updatePayload);

    return NextResponse.json({ 
      success: true, 
      message: `Franchisee ${internalId} updated successfully`,
      updatedFields: Object.keys(updatePayload)
    });

  } catch (error: any) {
    console.error(`[API /franchisees/${internalId}] Update error:`, error);
    
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

export async function DELETE(request: Request, { params }: { params: Promise<{ internalId: string }> }) {
  let internalId = '';
  try {
    const resolvedParams = await params;
    internalId = resolvedParams.internalId;
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.PROSPECTPLUS_API_KEY;
    
    // Require valid API key
    if (validApiKey && apiKey !== validApiKey) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

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
    console.error(`[API /franchisees/${internalId}] Delete error:`, error);
    
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
