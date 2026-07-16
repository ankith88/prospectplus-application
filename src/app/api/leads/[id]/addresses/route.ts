import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);
const API_KEY = process.env.PROSPECTPLUS_API_KEY;

export async function POST(
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
    const body = await req.json();
    const { type, tag, addressId, address } = body;

    if (!type || !['postal', 'additional'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be "postal" or "additional"' }, { status: 400 });
    }

    if (!address || typeof address !== 'object') {
      return NextResponse.json({ error: 'Address object is required' }, { status: 400 });
    }

    const { street, city, state, zip, country, address1, lat, lng, partnerLocationId } = address;

    if (!(street || address1) || !city || !state || !zip) {
      return NextResponse.json({ error: 'street (or address1), city, state, and zip are required in the address object' }, { status: 400 });
    }

    const leadRef = db.collection('leads').doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const addressData: any = {
      street,
      city,
      state,
      zip,
      country: country || 'Australia',
      updatedAt: FieldValue.serverTimestamp()
    };

    if (address1 !== undefined) addressData.address1 = address1;
    if (lat !== undefined) addressData.lat = lat;
    if (lng !== undefined) addressData.lng = lng;
    if (partnerLocationId !== undefined) addressData.partnerLocationId = partnerLocationId;

    const activityRef = leadRef.collection('activity');

    if (type === 'postal') {
      await leadRef.update({
        postalAddress: addressData,
        updatedAt: FieldValue.serverTimestamp()
      });

      await activityRef.add({
        type: 'Update',
        date: new Date().toISOString(),
        notes: 'Postal address updated via API.',
        author: 'External API'
      });

      return NextResponse.json({
        success: true,
        message: 'Postal address updated successfully.'
      });
    } else {
      // type === 'additional'
      if (!tag) {
        return NextResponse.json({ error: 'tag description is required for additional addresses' }, { status: 400 });
      }

      addressData.tag = tag;

      let finalAddressId = addressId;
      let isUpdate = false;

      if (addressId) {
        const subDocRef = leadRef.collection('addresses').doc(addressId);
        const subDocSnap = await subDocRef.get();
        if (subDocSnap.exists) {
          await subDocRef.update(addressData);
          isUpdate = true;
        } else {
          addressData.createdAt = FieldValue.serverTimestamp();
          await subDocRef.set(addressData);
        }
      } else {
        addressData.createdAt = FieldValue.serverTimestamp();
        const newSubDocRef = await leadRef.collection('addresses').add(addressData);
        finalAddressId = newSubDocRef.id;
      }

      await activityRef.add({
        type: 'Update',
        date: new Date().toISOString(),
        notes: `Additional address (${tag}) ${isUpdate ? 'updated' : 'added'} via API.`,
        author: 'External API'
      });

      return NextResponse.json({
        success: true,
        addressId: finalAddressId,
        message: `Additional address (${tag}) ${isUpdate ? 'updated' : 'added'} successfully.`
      });
    }

  } catch (error: any) {
    console.error('Error handling lead address API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
