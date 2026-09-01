import { adminDb } from '@/services/firebase-server';
import { syncPmpoToLocalMileServer } from '@/services/localmile-sync-server';

/**
 * Scans companies and leads collections for due scheduledServiceChange entries
 * (effectiveDate <= today), promotes them into active services, and syncs PMPO to LocalMile.
 */
export async function processScheduledServiceChanges(): Promise<{
  processedCount: number;
  results: Array<{ id: string; collection: string; success: boolean; message?: string }>;
}> {
  const results: Array<{ id: string; collection: string; success: boolean; message?: string }> = [];
  const todayStr = new Date().toISOString().split('T')[0];
  const nowStr = new Date().toISOString();

  const collections = ['companies', 'leads'] as const;

  for (const colName of collections) {
    try {
      const snap = await adminDb.collection(colName).where('scheduledServiceChange', '!=', null).get();
      
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const sched = data.scheduledServiceChange;
        
        if (!sched || !sched.effectiveDate || !sched.services) {
          continue;
        }

        const effectiveDateStr = String(sched.effectiveDate).trim();
        
        // Process if effective date is today or earlier
        if (effectiveDateStr <= todayStr) {
          try {
            console.log(`[Scheduled Transition] Promoting service change for ${colName}/${docSnap.id} (Effective: ${effectiveDateStr})...`);
            
            const updates: any = {
              services: sched.services,
              scheduledServiceChange: null,
              updatedAt: nowStr
            };

            if (sched.products && Array.isArray(sched.products) && sched.products.length > 0) {
              updates.products = sched.products;
            }

            await docSnap.ref.update(updates);

            // Sync PMPO service to LocalMile scheduled_jobs with effective date
            const syncRes = await syncPmpoToLocalMileServer(docSnap.id, data, sched.services, effectiveDateStr);

            // Log activity audit doc
            try {
              await docSnap.ref.collection('activity').add({
                type: 'Update',
                notes: `Promoted scheduled service change effective from ${effectiveDateStr}. Live service rates & frequencies updated.`,
                author: 'System (Scheduled Transition)',
                createdAt: nowStr
              });
            } catch (actErr) {
              /* ignore activity log failure */
            }

            results.push({
              id: docSnap.id,
              collection: colName,
              success: true,
              message: `Promoted services effective from ${effectiveDateStr}. LocalMile sync: ${syncRes.success ? 'Success' : syncRes.message || 'Failed'}`
            });
          } catch (itemErr: any) {
            console.error(`[Scheduled Transition Error] Failed for ${colName}/${docSnap.id}:`, itemErr);
            results.push({
              id: docSnap.id,
              collection: colName,
              success: false,
              message: itemErr.message || String(itemErr)
            });
          }
        }
      }
    } catch (colErr: any) {
      console.error(`[Scheduled Transition Query Error] Failed searching ${colName}:`, colErr);
    }
  }

  return {
    processedCount: results.filter(r => r.success).length,
    results
  };
}
