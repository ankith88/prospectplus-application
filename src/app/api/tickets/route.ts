import { NextResponse } from 'next/server';
import { TicketFormSchema } from '@/lib/ticket-schema';
import { z } from 'zod';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    let dataToValidate = { ...body };

    // Check if the payload is in the legacy/alternative format and normalize it
    if ('codes' in body || 'delivery' in body) {
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
        ...body,
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
        attachments: [],
        enquiryType: rawEnquiryType,
        raisedBy: 'Receiver',
        priority: 'Standard',
        description: notes,
        customerCompany: body.customerCompany || company.name || 'Unknown Company',
        customerAccountNumber: body.customerAccountNumber || company.accountNumber || 'N/A',
        receiverName: body.receiverName || deliveryFullName || 'Unknown Recipient',
        receiverAddress: body.receiverAddress || deliveryAddressParts || 'No delivery address provided',
        source: body.source || (source === 'Phone' ? 'Phone' : 'Email'),
        assignedUser: body.assignedUser || 'Kaley Drummond'
      };

      if (email) {
        dataToValidate.enquirerEmail = email;
      }
      if (phone) {
        dataToValidate.enquirerPhone = phone;
      }
    }

    if (!dataToValidate.assignedUser || dataToValidate.assignedUser === 'unassigned') {
      dataToValidate.assignedUser = 'Kaley Drummond';
    }

    const validatedData = TicketFormSchema.parse(dataToValidate);

    const ticketsRef = db.collection('tickets');
    
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let ticketSuffix = '';
    for (let i = 0; i < 6; i++) {
      ticketSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const ticketNumber = `MP-${ticketSuffix}`;
    
    const isApiCreation = 'codes' in body || 'delivery' in body;

    const docRef = await ticketsRef.add({
      ...validatedData,
      ticketNumber,
      createdAt: FieldValue.serverTimestamp(),
      status: 'Open',
      source: isApiCreation ? 'Website' : 'CRM',
      createdViaWebsiteApi: isApiCreation
    });

    // Create follow-up task if assigned user and date are specified
    if (validatedData.assignedUser && validatedData.assignedUser !== 'unassigned' && validatedData.followUpDate) {
      const taskRef = db.collection('tickets').doc(docRef.id).collection('tasks');
      await taskRef.add({
        title: `Ticket Follow-up: ${validatedData.enquiryType} - ${validatedData.trackingIdentifier}`,
        dueDate: validatedData.followUpDate,
        author: 'System',
        dialerAssigned: validatedData.assignedUser,
        isCompleted: false,
        createdAt: new Date().toISOString()
      });
    }

    // Save Customer Tier back to companies or leads level if companyId is provided
    if (body.companyId && validatedData.customerTier) {
      try {
        const companyRef = db.collection('companies').doc(body.companyId);
        await companyRef.update({
          customerTier: validatedData.customerTier,
          tier: validatedData.customerTier
        });
      } catch (err) {
        try {
          const leadRef = db.collection('leads').doc(body.companyId);
          await leadRef.update({
            customerTier: validatedData.customerTier,
            tier: validatedData.customerTier
          });
        } catch (e) {
          console.error("Failed to update customer/lead tier:", e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      ticketId: docRef.id,
      ticketNumber: ticketNumber,
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

