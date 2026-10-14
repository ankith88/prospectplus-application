import { NextRequest, NextResponse } from 'next/server';
import { syncRecentDialpadCallForLead, syncDialpadCallRecord } from '@/services/telephony/dialpad-sync';
import { fetchDialpadCall } from '@/services/telephony/dialpad-provider';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { leadId, phoneNumber, activityId, manualCallId, collectionType } = body;

    if (!leadId && !phoneNumber && !manualCallId) {
      return NextResponse.json({ success: false, message: 'Missing leadId, phoneNumber, or manualCallId' }, { status: 400 });
    }

    // 1. If manual Call ID provided, fetch directly from Dialpad API and sync
    if (manualCallId) {
      const callData = await fetchDialpadCall(String(manualCallId).trim());
      if (!callData) {
        return NextResponse.json({
          success: false,
          message: `Could not retrieve call details for Dialpad Call ID "${manualCallId}". Please verify the ID or check API connection.`,
        }, { status: 404 });
      }

      const res = await syncDialpadCallRecord(callData, undefined, {
        leadId,
        collectionType: collectionType || 'leads',
        activityId,
      });
      return NextResponse.json(res, { status: res.success ? 200 : 400 });
    }

    // 2. Query recent calls from Dialpad API matching the lead's phone number
    const res = await syncRecentDialpadCallForLead(
      leadId,
      phoneNumber,
      collectionType || 'leads',
      activityId
    );

    return NextResponse.json(res, { status: res.success ? 200 : 400 });
  } catch (error: any) {
    console.error('[Dialpad Sync Call API] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
