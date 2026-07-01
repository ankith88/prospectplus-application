import { NextResponse } from 'next/server';
import { TicketFormSchema } from '@/lib/ticket-schema';
import { z } from 'zod';
import { firestore as db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    let dataToValidate = { ...body };

    // Check if the payload is in the legacy/alternative format and normalize it
    if ('codes' in body || 'delivery' in body || 'enquiryType' in body) {
      const codes = body.codes || [];
      const company = body.company || {};
      const delivery = body.delivery || {};
      
      const enquirerFirstName = company.firstName || '';
      const enquirerLastName = company.lastName || '';
      const enquirerFullName = [enquirerFirstName, enquirerLastName].filter(Boolean).join(' ') || 'Unknown Enquirer';

      const deliveryFirstName = delivery.firstName || '';
      const deliveryLastName = delivery.lastName || '';
      const deliveryFullName = [deliveryFirstName, deliveryLastName].filter(Boolean).join(' ') || 'Unknown Recipient';

      const deliveryAddressParts = [
        delivery.unit ? `Unit ${delivery.unit}` : '',
        delivery.Address || delivery.address || '',
        delivery.city || '',
        delivery.state || '',
        delivery.postcode || ''
      ].filter(Boolean).join(', ');

      // Map enquiryType to a valid enum option or 'Other'
      const rawEnquiryType = body.enquiryType || 'Other';
      const validCategories = [
        'Incorrect Address: Incomplete', 'Incorrect Address: No Address', 'Incorrect Address: P.O. Box',
        'Address: Unserviced Remote Area', 'Address: Receiver No Longer at Address', 'Missorted',
        'Address: Not Safe to Leave - Re-delivery Organised', 'Alternate Delivery Point / Post Office',
        'Alternative Delivery Point', 'Delivered to Incorrect Address', 'Dispute of Delivery',
        'Check Address (Incorrect Address)', 'Check Address (Other)', 'Check Address (PO/Parcel Locker)',
        'Check Address (Receiver Unknown)', 'Delayed Item', 'Delayed +1 Day', 'Delayed +2 Days',
        'Delayed >2 Days', 'Damaged Item', 'Lost Item', 'Other'
      ];
      const category = validCategories.includes(rawEnquiryType) ? rawEnquiryType : 'Other';

      const email = (company.email || '').trim();
      const phone = (company.phone || '').trim();
      const source = email ? 'Email' : (phone ? 'Phone' : 'Email');

      let notes = body.description || body.notes || 'No description provided.';
      if (notes.length < 10) {
        notes = `${notes} (Submitted via API)`;
      }

      dataToValidate = {
        trackingIdentifier: codes[0] || 'N/A',
        issueCategory: [category],
        enquirySource: source,
        enquirerName: enquirerFullName,
        notes: notes,
        customerName: company.name || '',
        receiverDetails: {
          name: deliveryFullName,
          address: deliveryAddressParts || 'No delivery address provided'
        },
        senderDetails: {
          name: company.name || '',
          address: ''
        },
        attachments: []
      };

      if (email) {
        dataToValidate.enquirerEmail = email;
      }
      if (phone) {
        dataToValidate.enquirerPhone = phone;
      }
    }

    // Validate request body against our shared schema
    const validatedData = TicketFormSchema.parse(dataToValidate);

    // In a real implementation, you'd likely ensure the user is authenticated here
    // For an external API, you might check for an API key or bearer token

    const ticketsRef = collection(db, 'tickets');
    
    const docRef = await addDoc(ticketsRef, {
      ...validatedData,
      createdAt: serverTimestamp(),
      status: 'Open', // Initial status
      source: 'API' // Mark as created via external API
    });

    return NextResponse.json({
      success: true,
      ticketId: docRef.id,
      message: 'Ticket created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    console.error('Error creating ticket:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
