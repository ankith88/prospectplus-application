import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';

const API_KEY = process.env.PROSPECTPLUS_API_KEY;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiKeyHeader = req.headers.get('x-api-key');
  const leadId = params.id;

  if (!API_KEY || apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const leadRef = doc(firestore, 'leads', leadId);
    
    // Verify lead exists
    const leadSnap = await getDoc(leadRef);
    if (!leadSnap.exists()) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      ...body,
      updatedAt: serverTimestamp()
    };

    // Remove protected fields if they exist in body
    delete updateData.id;
    delete updateData.createdAt;

    // Perform update
    await updateDoc(leadRef, updateData);

    // Log activity
    const activityRef = collection(firestore, 'leads', leadId, 'activity');
    await addDoc(activityRef, {
      type: 'Update',
      date: new Date().toISOString(),
      notes: `Lead updated via NetSuite API.${body.netsuiteLeadStatus ? ` NetSuite Status: ${body.netsuiteLeadStatus}` : ''}`,
      author: 'NetSuite API'
    });

    return NextResponse.json({ 
      success: true, 
      id: leadId,
      message: 'Lead updated successfully.'
    });

  } catch (error: any) {
    console.error('Error updating lead via API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
