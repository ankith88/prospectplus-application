import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateRandomAlphanumeric } from '@/lib/prospect-plus-id';

const db = getFirestore(adminApp);
const API_KEY = process.env.PROSPECTPLUS_API_KEY;

async function generateUniqueProspectPlusId(db: FirebaseFirestore.Firestore): Promise<string> {
  let unique = false;
  let candidate = '';
  let attempts = 0;
  while (!unique && attempts < 20) {
    attempts++;
    candidate = `MP${generateRandomAlphanumeric(6)}`;
    const leadsSnap = await db.collection('leads').where('prospectPlusId', '==', candidate).limit(1).get();
    if (!leadsSnap.empty) continue;
    const companiesSnap = await db.collection('companies').where('prospectPlusId', '==', candidate).limit(1).get();
    if (!companiesSnap.empty) continue;
    unique = true;
  }
  return candidate;
}

function unwrapValue(val: any): any {
  if (val && typeof val === 'object') {
    if ('stringValue' in val) return val.stringValue;
    if ('booleanValue' in val) return val.booleanValue;
    if ('integerValue' in val) return parseInt(val.integerValue, 10);
    if ('doubleValue' in val) return parseFloat(val.doubleValue);
    if ('arrayValue' in val) return val.arrayValue.values?.map((v: any) => unwrapValue(v)) || [];
    if ('mapValue' in val) {
      const result: any = {};
      for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
        result[k] = unwrapValue(v);
      }
      return result;
    }
    return val;
  }
  return val;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKeyHeader = req.headers.get('x-api-key');
  const resolvedParams = await params;
  const leadId = resolvedParams.id;

  if (!API_KEY || apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    
    // Unwrap all values in the body
    const body: any = {};
    for (const [key, value] of Object.entries(rawBody)) {
      const unwrapped = unwrapValue(value);
      if (unwrapped !== undefined) {
        body[key] = unwrapped;
      } else {
        body[key] = null; // Ensure we don't send undefined to Firestore
      }
    }

    const leadRef = db.collection('leads').doc(leadId);
    
    // Verify lead exists
    const leadSnap = await leadRef.get();
    if (!leadSnap.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      ...body,
      updatedAt: FieldValue.serverTimestamp()
    };

    // Remove protected fields if they exist in body
    delete updateData.id;
    delete updateData.createdAt;

    // Check existing data
    const existingData = leadSnap.data() || {};
    if (!existingData.prospectPlusId && !body.prospectPlusId) {
      updateData.prospectPlusId = await generateUniqueProspectPlusId(db);
    }
    if (!existingData.createdAt) {
      updateData.createdAt = FieldValue.serverTimestamp();
    }

    // Perform update
    await leadRef.update(updateData);

    // Log activity
    const activityRef = db.collection('leads').doc(leadId).collection('activity');
    await activityRef.add({
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
