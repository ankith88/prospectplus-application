import { NextResponse } from 'next/server';
import { TicketFormSchema } from '@/lib/ticket-schema';
import { z } from 'zod';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    let dataToValidate = { ...body };

    // Check if the payload is in the website JSON format and normalize it
    if ('carrier_tracking_numbers' in body || 'receiver' in body) {
      const trackingNumbers = body.carrier_tracking_numbers || [];
      const trackingCode = trackingNumbers[0]?.code || 'N/A';
      const receiver = body.receiver || {};

      const rawEnquiryType = body.what_can_we_help_with || 'Other';
      const validEnquiryTypes = [
        'Delayed Item', 'ETA Request', 'Dispute of Delivery', 'POD Request', 'ATL Image Request',
        'Redelivery Request', 'Return To Sender Request', 'Missed Sweep', 'General Enquiry', 'Other'
      ];
      const enquiryType = validEnquiryTypes.includes(rawEnquiryType) ? rawEnquiryType : 'Other';

      let notes = body.comments_on_contents_and_packaging || body.additional_comments || 'No description provided.';
      if (notes.length < 10) {
        notes = `${notes} (Submitted via Website API)`;
      }

      dataToValidate = {
        ...body,
        trackingIdentifier: trackingCode,
        issueCategory: [enquiryType],
        enquirySource: 'Email',
        enquirerName: receiver.name || 'Unknown Enquirer',
        notes: notes,
        customerName: '',
        receiverDetails: {
          name: receiver.name || '',
          address: receiver.delivery_address || ''
        },
        senderDetails: {
          name: '',
          address: ''
        },
        attachments: [],
        enquiryType: enquiryType,
        raisedBy: 'Receiver',
        priority: 'Standard',
        description: notes,
        customerCompany: 'Website Customer',
        customerAccountNumber: 'N/A',
        receiverName: receiver.name || 'Unknown Recipient',
        receiverAddress: receiver.delivery_address || 'No delivery address provided',
        receiverPhone: receiver.contact_number || '',
        source: 'Email',
        assignedUser: 'Kaley Drummond'
      };

      const newAddr = receiver.new_delivery_address || body.new_delivery_address;
      if (newAddr && newAddr.trim()) {
        dataToValidate.hasNewReceiverDetails = true;
        dataToValidate.newReceiverAddress = newAddr;
        dataToValidate.newReceiverName = receiver.name || '';
        dataToValidate.newReceiverPhone = receiver.contact_number || '';
      }

      if (receiver.contact_number) {
        dataToValidate.enquirerPhone = receiver.contact_number;
      }
    }

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

    // Auto-enrich package/customer details if trackingIdentifier is provided (e.g. from API calls)
    let trackingId = dataToValidate.trackingIdentifier;
    if (trackingId && trackingId !== 'N/A') {
      try {
        const packagesRef = db.collection('packages');
        const byCode = await packagesRef.where('code', '==', trackingId).limit(1).get();
        const byOrder = await packagesRef.where('order_number', '==', trackingId).limit(1).get();
        const byConnote = await packagesRef.where('connote_numbers', 'array-contains', trackingId).limit(1).get();
        
        let pkgDoc = byCode.docs[0] || byOrder.docs[0] || byConnote.docs[0];
        if (pkgDoc) {
          const pkgData = pkgDoc.data();
          
          let customerName = pkgData.customer_name || '';
          let customerAccountNumber = '';
          
          let customerNsId = null;
          if (pkgData.scans && Array.isArray(pkgData.scans) && pkgData.scans.length > 0) {
            const scanWithNsId = pkgData.scans.find((s: any) => s.customer_ns_id);
            if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id;
          }
          
          if (customerNsId) {
            const companySnap = await db.collection('companies').where('internalid', 'in', [String(customerNsId), Number(customerNsId)]).limit(1).get();
            if (!companySnap.empty) {
              const compData = companySnap.docs[0].data();
              customerName = compData.companyName || customerName;
              customerAccountNumber = compData.customerEntityId || compData.entityId || String(customerNsId);
            }
          }
          
          const latestScan = pkgData.scans && pkgData.scans.length > 0 ? pkgData.scans[pkgData.scans.length - 1] : null;
          const receiverName = latestScan?.receiver_name || 'Unknown Recipient';
          const receiverAddress = [
            latestScan?.address1,
            latestScan?.address2,
            latestScan?.receiver_suburb,
            latestScan?.state,
            latestScan?.post_code
          ].filter(Boolean).join(', ') || 'No delivery address provided';

          const connoteNumber = pkgData.connote_number || (pkgData.scans && pkgData.scans.length > 0 ? pkgData.scans[pkgData.scans.length - 1].connote_number : '');
          if (connoteNumber) {
            dataToValidate.connoteNumber = connoteNumber;
          }

          if (!dataToValidate.customerCompany || dataToValidate.customerCompany === 'Unknown Company') {
            dataToValidate.customerCompany = customerName || 'Unknown Company';
          }
          if (!dataToValidate.customerAccountNumber || dataToValidate.customerAccountNumber === 'N/A') {
            dataToValidate.customerAccountNumber = customerAccountNumber || 'N/A';
          }
          if (!dataToValidate.receiverName || dataToValidate.receiverName === 'Unknown Recipient') {
            dataToValidate.receiverName = receiverName;
          }
          if (!dataToValidate.receiverAddress || dataToValidate.receiverAddress === 'No delivery address provided') {
            dataToValidate.receiverAddress = receiverAddress;
          }
          if (!dataToValidate.receiverDetails) {
            dataToValidate.receiverDetails = {
              name: receiverName,
              address: receiverAddress
            };
          }
          if (!dataToValidate.senderDetails) {
            dataToValidate.senderDetails = {
              name: customerName || 'Unknown Sender',
              address: ''
            };
          }
        }
      } catch (err) {
        console.error('Error auto-enriching ticket from package:', err);
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
    }, { status: 201, headers: corsHeaders });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400, headers: corsHeaders });
    }
    
    console.error('Error creating ticket:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500, headers: corsHeaders });
  }
}

