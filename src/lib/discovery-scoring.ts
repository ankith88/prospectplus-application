'use client';
import type { DiscoveryData } from './types';

export function calculateScoreAndRouting(data: Partial<DiscoveryData>): { score: number, routingTag: string, scoringReason: string } & Partial<DiscoveryData> {
      const reasonParts: string[] = [];
      
      // --- Discovery Score ---
      let groupA_score = 0;
      if (data.discoverySignals?.includes('Pays for Australia Post')) {
          groupA_score = 6;
          reasonParts.push('+6 for paying for AP services.');
      } else if (data.discoverySignals?.includes('Staff Handle Post')) {
          groupA_score = 5;
          reasonParts.push('+5 for staff handling post.');
      }
      
      let groupB_score = 0;
      if (data.discoverySignals?.includes('Drop-off is a hassle')) { groupB_score += 6; reasonParts.push('+6 for drop-off hassle.'); }
      if (data.discoverySignals?.includes('Banking Runs')) { groupB_score += 4; reasonParts.push('+4 for banking runs.'); }
      if (data.discoverySignals?.includes('Inter-office Deliveries')) { groupB_score += 4; reasonParts.push('+4 for inter-office deliveries.'); }
      if (data.discoverySignals?.includes('Needs same-day Delivery')) { groupB_score += 3; reasonParts.push('+3 for same-day needs.'); }

      let groupC_score = 0;
      if (data.discoverySignals?.includes('Uses Australia Post')) { groupC_score += 3; reasonParts.push('+3 for using AP products.'); }
      if (data.discoverySignals?.includes('Uses other couriers (<5kg)')) { groupC_score += 2; reasonParts.push('+2 for using other small couriers.'); }
      if (data.discoverySignals?.includes('Uses other couriers (100+ per week)')) { groupC_score += 2; reasonParts.push('+2 for high volume with other couriers.'); }
      if (data.discoverySignals?.includes('Shopify / WooCommerce')) { groupC_score += 1; reasonParts.push('+1 for Shopify/Woo.'); }
      if (data.discoverySignals?.includes('Other label platforms')) { groupC_score -= 2; reasonParts.push('-2 for other label platforms.'); }
      
      // --- Lost Property (Dashback) ---
      let dashbackOpportunity = '';
      if (data.lostPropertyProcess) {
          if (data.lostPropertyProcess === 'Staff organise returns manually' || data.lostPropertyProcess === 'Guests contact us to arrange shipping') {
              groupC_score += 2;
              dashbackOpportunity = 'High';
              reasonParts.push('+2 for High Dashback Opportunity.');
          } else if (data.lostPropertyProcess === 'Rarely happens / informal process') {
              groupC_score += 1;
              dashbackOpportunity = 'Medium';
              reasonParts.push('+1 for Medium Dashback Opportunity.');
          } else if (data.lostPropertyProcess === 'Already use a return platform') {
              dashbackOpportunity = 'Low / Competitor';
              reasonParts.push('Low Dashback Opportunity (Competitor).');
          }
      }

      const discoveryScore = groupA_score + groupB_score + groupC_score;
      
      // --- Qualification Score ---
      let q1_score = 0;
      if (data.inconvenience === 'Very inconvenient') { q1_score = 5; }
      else if (data.inconvenience === 'Somewhat inconvenient') { q1_score = 2; }
      else if (data.inconvenience === 'Not a big issue') { q1_score = 1; }
      if (q1_score > 0) reasonParts.push(`+${q1_score} for inconvenience level.`);

      let q2_score = 0;
      if (data.occurrence === 'Daily') { q2_score = 5; }
      else if (data.occurrence === 'Weekly') { q2_score = 3; }
      else if (data.occurrence === 'Ad-hoc') { q2_score = 1; }
      if (q2_score > 0) reasonParts.push(`+${q2_score} for occurrence frequency.`);
      
      let q3_score = 0;
      if (data.taskOwner === 'Shared admin responsibility') { q3_score = 5; }
      else if (data.taskOwner === 'Dedicated staff role') { q3_score = 3; }
      else if (data.taskOwner === 'Ad-hoc / whoever is free') { q3_score = 1; }
      if (q3_score > 0) reasonParts.push(`+${q3_score} for task ownership.`);
      
      let q4_score = 0;
      if ((data as any).personSpokenWithTags?.includes('Decision Maker')) { q4_score = 5; }
      else if ((data as any).decisionMakerName) { q4_score = 3; }
      else { q4_score = 1; }
      if (q4_score > 0) reasonParts.push(`+${q4_score} for decision maker access.`);

      const qualificationScore = q1_score + q2_score + q3_score + q4_score;

      // --- Final Score & Routing ---
      const finalScore = Math.round(discoveryScore * (qualificationScore / 10));

      if (data.discoverySignals?.includes('Decisions made at Head Office')) {
        return { ...data, score: Math.min(finalScore, 100), routingTag: 'Corporate', scoringReason: 'Lead routed to Corporate because decisions are made at Head Office.', dashbackOpportunity };
      }

      const servicePoints = (data.discoverySignals?.filter(s => ['Pays for Australia Post', 'Staff Handle Post', 'Drop-off is a hassle', 'Banking Runs', 'Inter-office Deliveries', 'Needs same-day Delivery'].includes(s)).length || 0) > 0;
      const productPoints = (data.discoverySignals?.filter(s => ['Uses Australia Post', 'Uses other couriers (<5kg)', 'Uses other couriers (100+ per week)', 'Shopify / WooCommerce', 'Other label platforms'].includes(s)).length || 0) > 0;

      let routingTag = 'Service'; // Default
      if (servicePoints && productPoints) {
          routingTag = 'Service & Product';
      } else if (productPoints) {
          routingTag = 'Product';
      }
      
      const scoringReason = reasonParts.length > 0 ? reasonParts.join(' ') : 'No specific scoring criteria met.';

      return { ...data, score: Math.min(finalScore, 100), routingTag, scoringReason, dashbackOpportunity };
  }
