import { NextRequest, NextResponse } from 'next/server';
import { syncLpoTerritorySuburbs, LpoPlusSyncTerritoryPayload } from '@/services/lpo-plus-service';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const body: LpoPlusSyncTerritoryPayload = await request.json();

    if (!body || !body.netsuiteId) {
      return NextResponse.json(
        { success: false, error: 'Missing required payload parameter: netsuiteId' },
        { status: 400 }
      );
    }

    const result = await syncLpoTerritorySuburbs(body);

    if (result.success) {
      try {
        const prospectDb = getFirestore(adminApp);
        const updatedFields = {
          lastLpoTerritorySyncAt: new Date().toISOString(),
          lpoTerritorySuburbsCount: result.count || 0
        };

        const compRef = prospectDb.collection('companies').doc(String(body.netsuiteId));
        const compSnap = await compRef.get();
        if (compSnap.exists) {
          await compRef.set(updatedFields, { merge: true });
          await compRef.collection('activity').add({
            type: 'Update',
            notes: `Synced ${result.count || 0} franchisee LPO suburb mapping(s) into 'franchiseeTerritoryJSON' in mp-lpo-connect DB.`,
            author: 'System User',
            date: new Date().toISOString(),
            syncedWithNetSuite: false,
          });
        }

        const leadRef = prospectDb.collection('leads').doc(String(body.netsuiteId));
        const leadSnap = await leadRef.get();
        if (leadSnap.exists) {
          await leadRef.set(updatedFields, { merge: true });
          await leadRef.collection('activity').add({
            type: 'Update',
            notes: `Synced ${result.count || 0} franchisee LPO suburb mapping(s) into 'franchiseeTerritoryJSON' in mp-lpo-connect DB.`,
            author: 'System User',
            date: new Date().toISOString(),
            syncedWithNetSuite: false,
          });
        }
      } catch (adminErr) {
        console.warn('[API /api/lpo-plus/sync-territory Admin Sync Warning]:', adminErr);
      }

      return NextResponse.json({
        success: true,
        count: result.count,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[API /api/lpo-plus/sync-territory Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during LPO territory sync' },
      { status: 500 }
    );
  }
}
