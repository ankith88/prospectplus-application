import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface ProductImportData {
  id: string; // Internal ID
  name?: string;
  deliverySpeed?: string;
  pricePlan?: string;
  carrier?: string;
  productWeight?: string;
  productType?: string;
  salesPriceIncGst?: string | number;
  salesPriceExcGst?: string | number;
  purchasePriceExcGst?: string | number;
  partnerCommissionRate?: string | number;
}

export const bulkImportProducts = functions
  .region('australia-southeast1')
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .https.onCall(async (data: { products: ProductImportData[] }, context) => {
    // 1. Basic Auth check
    if (!context.auth) {
       throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to import products.');
    }

    const products = data.products;
    if (!Array.isArray(products)) {
        throw new functions.https.HttpsError('invalid-argument', 'Payload must contain a "products" array.');
    }

    const errors: string[] = [];
    const incomingIds = new Set<string>();
    
    // Chunk size limit is 500 for Firestore batches, using 400 for safety
    const CHUNK_SIZE = 400; 
    let processedCount = 0;

    const validProducts = [];

    // Validation & Sanitzation
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (!p.id || typeof p.id !== 'string' || p.id.trim() === '') {
            errors.push(`Row ${i + 1}: Missing or invalid ID.`);
            continue;
        }

        const id = p.id.trim();
        incomingIds.add(id);

        const parseNum = (val: any) => {
            if (val === undefined || val === null || val === '') return null;
            const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
            return isNaN(parsed) ? null : parsed;
        };

        const salesPriceInc = parseNum(p.salesPriceIncGst);
        const salesPriceExc = parseNum(p.salesPriceExcGst);
        const purchasePriceExc = parseNum(p.purchasePriceExcGst);
        const commissionRate = parseNum(p.partnerCommissionRate);

        validProducts.push({
            id,
            name: p.name?.trim() || '',
            deliverySpeed: p.deliverySpeed?.trim() || null,
            pricePlan: p.pricePlan?.trim() || null,
            carrier: p.carrier?.trim() || null,
            productWeight: p.productWeight?.trim() || null,
            productType: p.productType?.trim() || null,
            salesPriceIncGst: salesPriceInc,
            salesPriceExcGst: salesPriceExc,
            purchasePriceExcGst: purchasePriceExc,
            partnerCommissionRate: commissionRate,
            isActive: true,
            lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // Step 1: Upsert Valid Products in Batches
    for (let i = 0; i < validProducts.length; i += CHUNK_SIZE) {
        const chunk = validProducts.slice(i, i + CHUNK_SIZE);
        const batch = db.batch();

        for (const item of chunk) {
            const docRef = db.collection('products').doc(item.id);
            // using merge: true to avoid overwriting creation timestamps if they exist
            batch.set(docRef, item, { merge: true });
            processedCount++;
        }

        try {
            await batch.commit();
        } catch (error: any) {
            console.error(`Error committing batch ${i / CHUNK_SIZE}: `, error);
            errors.push(`Batch ${i / CHUNK_SIZE} failed: ${error.message}`);
        }
    }

    // Step 2: Handle Soft-Deletes for Omitted Products
    try {
        const existingProductsSnap = await db.collection('products').where('isActive', '==', true).select('isActive').get();
        let deleteBatch = db.batch();
        let deleteCount = 0;
        let batchOpCount = 0;

        for (const doc of existingProductsSnap.docs) {
            if (!incomingIds.has(doc.id)) {
                deleteBatch.update(doc.ref, { isActive: false, lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp() });
                deleteCount++;
                batchOpCount++;
                
                // If we reach the chunk limit for deletes, commit and create a new batch
                if (batchOpCount >= CHUNK_SIZE) {
                     await deleteBatch.commit();
                     deleteBatch = db.batch();
                     batchOpCount = 0;
                }
            }
        }
        
        // Commit remaining deletes
        if (batchOpCount > 0) {
            await deleteBatch.commit();
        }

        return {
            success: true,
            message: `Successfully processed ${processedCount} products. Soft-deleted ${deleteCount} omitted products.`,
            errors: errors.length > 0 ? errors : undefined
        };

    } catch (error: any) {
        console.error("Error during soft-delete process: ", error);
        errors.push(`Soft-delete failed: ${error.message}`);
        return {
            success: false,
            message: `Processed ${processedCount} products with errors during deletion phase.`,
            errors
        };
    }
});
