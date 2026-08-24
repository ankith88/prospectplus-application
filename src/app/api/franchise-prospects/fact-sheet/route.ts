import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { decodeProspectToken, encodeProspectToken } from '@/lib/presale-token';

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
        { success: false, message: 'Invalid or missing token.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const docSnap = await db.collection('franchise_prospects').doc(prospectId).get();
    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Prospect not found.' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const data = docSnap.data() || {};
    let kfs = data.keyFactSheet || {};

    // Try to auto-link with franchisee presale data if fields are empty
    try {
      const presaleId = data.presaleListingId;
      const territory = data.preferredTerritory;

      let presaleDocSnap: any = null;
      if (presaleId) {
        presaleDocSnap = await db.collection('franchisee_presales').doc(String(presaleId)).get();
      }
      
      if ((!presaleDocSnap || !presaleDocSnap.exists) && territory) {
        const presaleQuery = await db.collection('franchisee_presales').get();
        const found = presaleQuery.docs.find((docItem) => {
          const p = docItem.data();
          const tName = p.presalesDetails?.territoryName || p.mainDetails?.tradingEntity || '';
          return tName.toLowerCase().includes(territory.toLowerCase());
        });
        if (found) presaleDocSnap = found;
      }

      if (presaleDocSnap && presaleDocSnap.exists) {
        const presaleData = presaleDocSnap.data() || {};
        const pd = presaleData.presalesDetails || {};
        const md = presaleData.mainDetails || {};

        kfs = {
          territoryName: kfs.territoryName || pd.territoryName || md.tradingEntity || territory || 'MailPlus Waterloo Alexandria',
          dateBusinessStarted: kfs.dateBusinessStarted || pd.dateBusinessStarted || md.dateBusinessStarted || '01/02/2022',
          numberOfOwners: kfs.numberOfOwners ?? pd.numberOfOwners ?? '1',
          reasonForSale: kfs.reasonForSale || pd.reasonForSale || 'Moving / Relocating',
          last12MonthsServiceRevenue: kfs.last12MonthsServiceRevenue || pd.serviceRevenue || '300437.26',
          askingPriceText: kfs.askingPriceText || (pd.salePrice ? (String(pd.salePrice).includes('$') ? String(pd.salePrice) : `$${Number(pd.salePrice).toLocaleString('en-AU', { minimumFractionDigits: 2 })} NEG`) : '$335,000.00 NEG'),
          last12MonthsExpressRevenue: kfs.last12MonthsExpressRevenue || pd.expressRevenue || pd.mpexCommission || '856.60',
          totalDailyRunTimeHours: kfs.totalDailyRunTimeHours || pd.totalDailyRunTime || 'Between 8.5 to 9.5 hours per day',
          morningShiftHours: kfs.morningShiftHours || pd.currentMorningShift || '6:00am to 11:00am',
          afternoonShiftHours: kfs.afternoonShiftHours || pd.currentAfternoonShift || '1:00pm to 4:00pm',
          franchiseTermYears: kfs.franchiseTermYears || pd.franchiseTerm || pd.termOnFranchiseeIM || 'Unlimited',
          franchiseFeePercent: kfs.franchiseFeePercent || pd.franchiseFeesOnServiceRevenue || '25',
          marketingLevyPercent: kfs.marketingLevyPercent || pd.marketingLevy || '5',
          territoryMapUrl: kfs.territoryMapUrl || pd.territoryMapUrl || '',
          ...kfs, // explicit overrides retain priority
        };
      }
    } catch (presaleErr) {
      console.warn('Presale auto-link lookup failed:', presaleErr);
    }

    return NextResponse.json(
      {
        success: true,
        prospect: {
          id: docSnap.id,
          fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          preferredTerritory: data.preferredTerritory || '',
          preferredState: data.preferredState || '',
          keyFactSheet: kfs,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error fetching Fact Sheet:', error);
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
      prospectId,
      senderUid = '',
      senderName = '',
      ...factSheetFields
    } = body;

    if (!prospectId) {
      return NextResponse.json(
        { success: false, message: 'prospectId is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const ref = db.collection('franchise_prospects').doc(prospectId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, message: 'Prospect not found' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const currentData = snap.data() || {};
    const existingFactSheet = currentData.keyFactSheet || {};
    const publicToken = existingFactSheet.publicToken || encodeProspectToken('kfs', prospectId);

    const updatedFactSheet = {
      ...existingFactSheet,
      ...factSheetFields,
      publicToken,
      updatedAt: new Date().toISOString(),
      updatedByUid: senderUid,
      updatedByName: senderName,
      territoryName: factSheetFields.territoryName || currentData.preferredTerritory || '',
    };

    await ref.update({
      keyFactSheet: updatedFactSheet,
      preferredTerritory: updatedFactSheet.territoryName,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Key Fact Sheet saved successfully.',
        keyFactSheet: updatedFactSheet,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error saving Fact Sheet:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to save fact sheet.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
