
'use client';
import type { DiscoveryData } from './types';

export function calculateScoreAndRouting(data: Partial<DiscoveryData>): { score: number, routingTag: string, scoringReason: string } {
      let score = 0;
      const reasonParts: string[] = [];
      let servicePoints = 0;
      let productPoints = 0;

      // Scoring logic
      if (data.relevanceCheck === 'No') {
          return { score: 0, routingTag: 'Not Relevant', scoringReason: 'Lead is not relevant as nobody leaves the office.' };
      }
      if (data.relevanceCheck === 'Yes') { score += 10; reasonParts.push('+10 for relevance check pass.');}

      if (data.postOfficeRelationship === 'Yes-Post Office walk up') { score += 10; servicePoints += 2; reasonParts.push('+10 for Post Office walk-up.'); }
      if (data.logisticsSetup === 'Drop-off') { score += 10; servicePoints++; reasonParts.push('+10 for dropping off items.'); }
      if (data.servicePayment === 'Yes') { score += 10; servicePoints += 2; reasonParts.push('+10 for paying for collection.'); }
      if (data.shippingVolume === '<20') { score += 5; productPoints++; reasonParts.push('+5 for <20 items/week.'); }
      else if (data.shippingVolume === '20-100') { score += 10; productPoints += 2; reasonParts.push('+10 for 20-100 items/week.'); }
      else if (data.shippingVolume === '100+') { score += 15; productPoints += 3; reasonParts.push('+15 for 100+ items/week.'); }
      if (data.expressVsStandard === 'Mostly Standard (>=80%)') { score += 10; productPoints += 2; reasonParts.push('+10 for mostly standard shipping.'); }
      else if (data.expressVsStandard === 'Balanced Mix (20-79% Express)') { score += 5; productPoints += 2; reasonParts.push('+5 for balanced shipping mix.'); }
      else if (data.expressVsStandard === 'Mostly Express (>=80%)') { score += 10; productPoints += 2; reasonParts.push('+10 for mostly express shipping.'); }
      if (data.packageType?.length) { score += 10; productPoints++; reasonParts.push('+10 for specifying package types.'); }
      if (data.currentProvider?.length) { score += 5; reasonParts.push('+5 for using a current provider.'); }
      if (data.painPoints) { score += 10; reasonParts.push('+10 for having known pain points.'); }
      if (data.eCommerceTech?.some(t => ['Shopify', 'Woo'].includes(t))) { score += 10; productPoints += 2; reasonParts.push('+10 for using compatible e-commerce tech.'); }
      if (data.sameDayCourier === 'Yes') { score += 5; productPoints++; reasonParts.push('+5 for using same-day couriers.'); }
      if (data.decisionMaker === 'Owner') { score += 10; reasonParts.push('+10 for direct contact with owner.'); }

      // Routing logic
      let routingTag = '';
      if (productPoints > servicePoints && productPoints > 1) {
          routingTag = 'Product';
      } else if (servicePoints > productPoints && servicePoints > 1) {
          routingTag = 'Service';
      } else if (productPoints > 0 && servicePoints > 0) {
          routingTag = 'Service & Product';
      } else if (productPoints > 0) {
          routingTag = 'Product';
      } else if (servicePoints > 0) {
          routingTag = 'Service';
      } else {
          routingTag = 'Service'; // Default
      }
      
      const scoringReason = reasonParts.length > 0 ? reasonParts.join(' ') : 'Score based on initial data.';

      return { score: Math.min(score, 100), routingTag, scoringReason };
  }
