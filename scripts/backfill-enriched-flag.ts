import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function backfillEnrichedFlag() {
  console.log('Starting backfill for isAiEnriched flag...');
  
  const snap = await db.collection('leads').get();
  console.log(`Examining ${snap.size} leads...`);

  let countToUpdate = 0;
  let batches: FirebaseFirestore.WriteBatch[] = [db.batch()];
  let currentBatchIndex = 0;
  let operationCount = 0;

  for (const doc of snap.docs) {
    const d = doc.data();

    // Check if lead already has isAiEnriched === true
    if (d.isAiEnriched === true && d.discoveryData?.isAiEnriched === true) {
      continue;
    }

    const hasEnrichmentData = Boolean(
      d.isAiEnriched === true ||
      d.discoveryData?.isAiEnriched === true ||
      d.enrichedAt ||
      d.discoveryData?.lastEnriched ||
      d.discoveryData?.enrichedAt ||
      d.agentReachDossier ||
      (d.prospectSummary && String(d.prospectSummary).trim().length > 0) ||
      (d.discoveryData?.prospectSummary && String(d.discoveryData.prospectSummary).trim().length > 0) ||
      (d.shipperEvidence && String(d.shipperEvidence).trim().length > 0) ||
      (d.discoveryData?.shipperEvidence && String(d.discoveryData.shipperEvidence).trim().length > 0) ||
      (d.lodgementEvidence && String(d.lodgementEvidence).trim().length > 0) ||
      (d.discoveryData?.lodgementEvidence && String(d.discoveryData.lodgementEvidence).trim().length > 0) ||
      (d.suggestedOpener && String(d.suggestedOpener).trim().length > 0) ||
      (d.discoveryData?.suggestedOpener && String(d.discoveryData.suggestedOpener).trim().length > 0) ||
      (d.suggestedProduct && String(d.suggestedProduct).trim().length > 0) ||
      (d.discoveryData?.suggestedProduct && String(d.discoveryData.suggestedProduct).trim().length > 0) ||
      (d.suggestedPersonalisation && String(d.suggestedPersonalisation).trim().length > 0) ||
      (d.discoveryData?.suggestedPersonalisation && String(d.discoveryData.suggestedPersonalisation).trim().length > 0)
    );

    if (hasEnrichmentData) {
      countToUpdate++;
      const updatePayload: Record<string, any> = {
        isAiEnriched: true,
      };

      if (!d.enrichedBy && !d.discoveryData?.enrichedBy) {
        updatePayload.enrichedBy = 'AI Lead Intelligence';
      }

      if (!d.enrichedAt && (d.discoveryData?.lastEnriched || d.discoveryData?.enrichedAt)) {
        updatePayload.enrichedAt = d.discoveryData.lastEnriched || d.discoveryData.enrichedAt;
      }

      if (d.discoveryData && d.discoveryData.isAiEnriched !== true) {
        updatePayload['discoveryData.isAiEnriched'] = true;
      }

      if (operationCount >= 400) {
        batches.push(db.batch());
        currentBatchIndex++;
        operationCount = 0;
      }

      batches[currentBatchIndex].update(doc.ref, updatePayload);
      operationCount++;
    }
  }

  console.log(`Found ${countToUpdate} leads with enrichment data that need isAiEnriched: true.`);
  console.log(`Committing ${batches.length} batches...`);

  for (let i = 0; i < batches.length; i++) {
    await batches[i].commit();
    console.log(`Committed batch ${i + 1} of ${batches.length}`);
  }

  console.log('Backfill complete!');
}

backfillEnrichedFlag().catch(console.error);
