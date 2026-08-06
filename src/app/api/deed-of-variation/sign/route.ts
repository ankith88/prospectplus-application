import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { DeedOption, PresaleRecord } from '@/lib/presale-types';
import { decodePresaleId } from '@/lib/presale-token';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      presaleId: rawPresaleId,
      selectedOption,
      party1Name,
      party1Address,
      party2Name,
      party2Address,
      signerName,
      signerEmail,
      signatureDataUrl,
    } = body;

    const presaleId = decodePresaleId(rawPresaleId || '');

    if (!presaleId || !selectedOption || !signerName) {
      return NextResponse.json(
        { success: false, message: 'presaleId, selectedOption, and signerName are required' },
        { status: 400 }
      );
    }

    const db = adminApp.firestore();
    const presaleRef = db.collection('franchisee_presales').doc(String(presaleId));
    const presaleSnap = await presaleRef.get();

    if (!presaleSnap.exists) {
      return NextResponse.json(
        { success: false, message: `Presale record for ${presaleId} not found` },
        { status: 404 }
      );
    }

    const existingData = presaleSnap.data() as PresaleRecord;
    const nowStr = new Date().toISOString();

    const optionTextMap: Record<DeedOption, string> = {
      option_1: 'OPTION 1 - Franchisee sells territory independently without MailPlus facilitation.',
      option_2: 'OPTION 2 - Franchisee engages MailPlus for administrative & marketing support (10% admin fee).',
      option_3: 'OPTION 3 - Franchisee engages MailPlus for full support + NAB accreditation program (2/12ths purchase price fee).',
    };

    const updatedDeed = {
      ...existingData.deedOfVariation,
      status: 'signed_online' as const,
      selectedOption: selectedOption as DeedOption,
      party1Name: party1Name || existingData.mainDetails?.mainContact || existingData.franchiseeName,
      party1Address: party1Address || existingData.mainDetails?.address || '',
      party2Name: party2Name || party1Name || existingData.mainDetails?.mainContact,
      party2Address: party2Address || party1Address || existingData.mainDetails?.address || '',
      party3Name: 'Mail Plus Pty Ltd ACN 609 801 195 of Level 14, Suite 11, 175 Pitt Street, Sydney, NSW, 2000 (MailPlus)',
      signedAt: nowStr,
      signerName,
      signerEmail: signerEmail || existingData.mainDetails?.email || '',
      signatureDataUrl: signatureDataUrl || '',
      pdfFileName: `Deed_of_Variation_${(existingData.mainDetails?.tradingEntity || presaleId).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
    };

    const updatedPayload = {
      status: 'Step 4: Presales Details' as const,
      step1Status: 'Completed' as const,
      step2Status: 'Completed' as const,
      step3Status: 'Completed' as const,
      deedOfVariation: updatedDeed,
      updatedAt: nowStr,
    };

    await presaleRef.set(updatedPayload, { merge: true });

    // Send email notification to greg.hart@mailplus.com.au with CC: michael.mcdaid@mailplus.com.au
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; borderRadius: 12px; overflow: hidden;">
        <div style="background-color: #095c7b; padding: 20px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">Deed of Variation - Executed & Signed</h2>
          <p style="margin: 5px 0 0; font-size: 13px; color: #eaf143;">MailPlus Territory Exit Program</p>
        </div>

        <div style="padding: 24px; background-color: #ffffff;">
          <p style="margin-top: 0; font-size: 14px; line-height: 1.5;">
            The <strong>Deed of Variation - Exit Program Assistance Offer</strong> has been filled and digitally signed online.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 8px; font-weight: bold; color: #64748b; width: 140px;">Trading Entity:</td>
              <td style="padding: 8px; font-weight: bold; color: #095c7b;">${existingData.mainDetails?.tradingEntity || existingData.franchiseeName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Franchisee ID:</td>
              <td style="padding: 8px;">${existingData.franchiseeId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Party 1 (Franchisee):</td>
              <td style="padding: 8px;">${party1Name} (${party1Address})</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Selected Option:</td>
              <td style="padding: 8px; font-weight: bold; color: #047857;">${optionTextMap[selectedOption as DeedOption]}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Signed By:</td>
              <td style="padding: 8px;">${signerName} (${signerEmail})</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Executed Date:</td>
              <td style="padding: 8px;">${new Date(nowStr).toLocaleString('en-AU')}</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 30px;">
            <a href="https://prospectplus.com.au/admin/franchisees/presales/${existingData.franchiseeId}" style="background-color: #095c7b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 13px;">
              View Presale Record in ProspectPlus
            </a>
          </div>
        </div>

        <div style="background-color: #f8fafb; padding: 15px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #edf2f7;">
          MailPlus Australia Presales System &copy; 2026 MailPlus. All rights reserved.
        </div>
      </div>
    `;

    await sendPhysicalEmail({
      to: 'greg.hart@mailplus.com.au',
      cc: 'michael.mcdaid@mailplus.com.au',
      subject: `Deed of Variation Executed - ${existingData.mainDetails?.tradingEntity || existingData.franchiseeName}`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: 'Deed of Variation successfully signed and notifications dispatched.',
      data: updatedPayload,
    });
  } catch (error: any) {
    console.error('Error executing Deed of Variation:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
