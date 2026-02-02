
'use client';
import type { CheckinQuestion } from './types';

export function calculateCheckinScore(questions: CheckinQuestion[]): { score: number; routingTag: string; scoringReason: string } {
    let score = 0;
    const reasonParts: string[] = [];

    const getAnswer = (questionText: string): string | string[] | undefined => {
        return questions.find(q => q.question === questionText)?.answer;
    }

    const hasAuspostRelationship = getAnswer("Do you have a relationship with Australia Post?") === 'Yes';
    const usesDropOff = Array.isArray(getAnswer("Do you drop it off or do they come here?")) && (getAnswer("Do you drop it off or do they come here?") as string[]).includes('Drop-off');
    const usesBanking = Array.isArray(getAnswer("What are the reasons people leave the office?")) && (getAnswer("What are the reasons people leave the office?") as string[]).includes('Banking');
    const usesOtherCouriers = getAnswer("Do you use any other couriers?") === 'Yes';
    
    let isService = false;
    let isProduct = false;

    if (hasAuspostRelationship) {
        score += 10;
        reasonParts.push('+10 for AusPost relationship.');
        isService = true;

        if (usesDropOff) {
            score += 20;
            reasonParts.push('+20 for using Post Office drop-off.');
        }
        if (getAnswer("Do you pay for the service?") === 'Yes') {
            score += 10;
            reasonParts.push('+10 for paying for existing collection.');
        }
        const usage = getAnswer("What do you use them for?");
        if (typeof usage === 'string' && (usage.toLowerCase().includes('parcel') || usage.toLowerCase().includes('shipping'))) {
            score += 10;
            reasonParts.push('+10 for using AusPost for parcels.');
        }
    }

    if (usesBanking) {
        isService = true;
        score += 15;
        reasonParts.push('+15 for needing banking services.');
    }

    if (usesOtherCouriers) {
        isProduct = true;
        score += 10;
        reasonParts.push('+10 for using other couriers.');
        if (getAnswer("Do you have any need for local deliveries?") === 'Yes') {
            score += 20;
            reasonParts.push('+20 for needing local same-day delivery.');
        }
    }
    
    if (Array.isArray(getAnswer("What are the reasons people leave the office?")) && (getAnswer("What are the reasons people leave the office?") as string[]).includes('Local Same Day')) {
        score += 15;
        reasonParts.push('+15 for needing local same-day errands.');
    }
    
    let routingTag = 'Service'; // Default
    if (isService && isProduct) {
        routingTag = 'Service & Product';
    } else if (isProduct) {
        routingTag = 'Product';
    }

    const scoringReason = reasonParts.length > 0 ? reasonParts.join(' ') : 'No specific scoring criteria met.';

    return { score: Math.min(score, 100), routingTag, scoringReason };
}
