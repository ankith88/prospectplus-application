import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { decodeProspectToken, encodeProspectToken } from '@/lib/presale-token';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

const db = getFirestore(adminApp);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const prospectIdParam = searchParams.get('prospectId');

    let prospectId = prospectIdParam || '';
    if (token) {
      const decoded = decodeProspectToken(token);
      prospectId = decoded.prospectId;
    }

    if (!prospectId) {
      return NextResponse.json(
        { success: false, message: 'Invalid token.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const docSnap = await db.collection('franchise_prospects').doc(prospectId).get();
    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Prospect record not found.' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const data = docSnap.data() || {};
    return NextResponse.json(
      {
        success: true,
        prospect: {
          id: docSnap.id,
          fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          email: data.email || '',
          phone: data.phone || '',
          preferredTerritory: data.preferredTerritory || '',
          confidentialityDeed: data.confidentialityDeed || {
            publicToken: token || encodeProspectToken('cd', docSnap.id),
            status: 'not_started',
          },
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error fetching Confidentiality Deed:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      token,
      prospectId: rawProspectId,
      signerName,
      signerEmail,
      signerAddress,
      signatureDataUrl,
    } = body;

    let prospectId = rawProspectId || '';
    if (token) {
      const decoded = decodeProspectToken(token);
      prospectId = decoded.prospectId;
    }

    if (!prospectId) {
      return NextResponse.json(
        { success: false, message: 'Prospect ID or token is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!signerName || !signatureDataUrl) {
      return NextResponse.json(
        { success: false, message: 'Signer name and digital signature are required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const ref = db.collection('franchise_prospects').doc(prospectId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, message: 'Prospect not found.' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const currentData = snap.data() || {};
    const publicToken = token || currentData.confidentialityDeed?.publicToken || encodeProspectToken('cd', prospectId);

    const confidentialityDeedData = {
      ...(currentData.confidentialityDeed || {}),
      publicToken,
      status: 'signed_online',
      sentAt: currentData.confidentialityDeed?.sentAt || new Date().toISOString(),
      signedAt: new Date().toISOString(),
      signerName: signerName.trim(),
      signerEmail: (signerEmail || currentData.email || '').trim(),
      signerAddress: (signerAddress || '').trim(),
      signatureDataUrl,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    };

    const newNote = {
      id: Math.random().toString(36).substring(2, 9),
      text: `Confidentiality Deed digitally signed by candidate ${signerName} (${signerEmail || currentData.email}).`,
      createdAt: new Date().toISOString(),
      createdByName: 'Candidate Online Portal',
      createdByUid: 'system_portal',
    };

    await ref.update({
      confidentialityDeed: confidentialityDeedData,
      status: 'Deed Signed',
      notes: [...(currentData.notes || []), newNote],
    });

    // Send automated email notification to Greg Hart & Michael McDaid
    try {
      const prospectName = signerName.trim() || currentData.fullName || 'Candidate';
      const prospectEmail = (signerEmail || currentData.email || '').trim();
      const territory = currentData.preferredTerritory || currentData.preferredState || 'Unspecified Territory';
      const signedAtFormatted = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prospectplus.com.au';
      const prospectUrl = `${baseUrl}/operations/franchise-prospects/${prospectId}`;

      const emailHtml = `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Confidentiality Deed Executed</h2>
          </div>
          <div style="padding: 24px; color: #2d3748; line-height: 1.6; font-size: 14px;">
            <p style="margin-top: 0;">Hi Greg & Michael,</p>
            <p><strong>${prospectName}</strong> has digitally signed their <strong>Confidentiality Deed</strong> for <strong>${territory}</strong>.</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #095c7b; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0 0 6px;"><strong>Candidate Name:</strong> ${prospectName}</p>
              <p style="margin: 0 0 6px;"><strong>Email:</strong> ${prospectEmail}</p>
              <p style="margin: 0 0 6px;"><strong>Territory / State:</strong> ${territory}</p>
              <p style="margin: 0 0 6px;"><strong>Executed Date & Time:</strong> ${signedAtFormatted} AEST</p>
              <p style="margin: 0;"><strong>Pipeline Status:</strong> Step 1 (Confidentiality Deed) Completed ✓</p>
            </div>

            <p style="margin-bottom: 24px;">The prospect is now eligible for commercial data disclosure (Step 2: Information Memorandum / Key Fact Sheet).</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${prospectUrl}" target="_blank" style="background-color: #095c7b; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block;">
                View Candidate Details in Prospect+
              </a>
            </div>
          </div>
          <div style="background-color: #f8fafb; padding: 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096;">
            <p style="margin: 0;"><strong>MailPlus Prospect+ System Notification</strong></p>
          </div>
        </div>
      `;

      await sendPhysicalEmail({
        to: 'greg.hart@mailplus.com.au',
        cc: 'michael.mcdaid@mailplus.com.au',
        subject: `[Confidentiality Deed Signed] ${prospectName} (${territory})`,
        html: emailHtml,
        prospectPlusId: prospectId,
      });
    } catch (emailErr) {
      console.error('Error dispatching deed notification email:', emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Confidentiality Deed signed successfully.',
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error signing Confidentiality Deed:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to submit signature.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
