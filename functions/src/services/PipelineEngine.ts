import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export class PipelineEngine {
  
  // Define stage progression rules based on velocity score or specific events
  private readonly STAGE_THRESHOLDS: Record<string, { nextStage: string; minScore?: number; requiredEvent?: string }> = {
    'New': { nextStage: 'In Qualification', minScore: 10 },
    'In Qualification': { nextStage: 'Quote Sent', requiredEvent: 'Quote Created' },
    'Quote Sent': { nextStage: 'Won', requiredEvent: 'Contract Signed' },
  };

  /**
   * Evaluate thresholds based on an incoming event and progress the lead if conditions are met.
   */
  public async evaluateThresholds(leadId: string, event: { type: string; name?: string; duration?: number }) {
    const leadRef = db.collection('leads').doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      console.warn(`Lead ${leadId} not found in PipelineEngine`);
      return;
    }

    const lead = leadSnap.data();
    if (!lead) return;

    let newVelocityScore = lead.velocityScore || 0;

    // Calculate velocity score impact
    if (event.type === 'call' && event.duration && event.duration > 300) {
      newVelocityScore += 5; // Meaningful conversation
    } else if (event.type === 'email-click') {
      newVelocityScore += 3;
    }

    const currentState = lead.status;
    const rule = this.STAGE_THRESHOLDS[currentState];

    let shouldProgress = false;

    if (rule) {
      if (rule.minScore && newVelocityScore >= rule.minScore) {
        shouldProgress = true;
      }
      if (rule.requiredEvent && event.name === rule.requiredEvent) {
        shouldProgress = true;
      }
    }

    const updates: any = {
      velocityScore: newVelocityScore
    };

    if (shouldProgress && rule) {
      updates.status = rule.nextStage;
      updates.lastAutomatedProgression = admin.firestore.FieldValue.serverTimestamp();
      console.log(`Automatically progressed lead ${leadId} from ${currentState} to ${rule.nextStage}`);
    }

    await leadRef.update(updates);
  }
}
