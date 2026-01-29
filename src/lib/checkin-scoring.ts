
'use client';
import type { CheckinQuestion } from './types';

export function calculateCheckinScore(questions: CheckinQuestion[]): { score: number, scoringReason: string } {
    let score = 0;
    const reasonParts: string[] = [];

    const getAnswer = (question: string): string | string[] | undefined => {
        return questions.find(q => q.question === question)?.answer;
    }

    if (getAnswer("Do you have a relationship with Australia Post?") === 'Yes') {
        const dropoff = getAnswer("Do you drop it off or do they come here?");
        if (Array.isArray(dropoff) && dropoff.includes('Drop-off')) {
            score += 20;
            reasonParts.push('+20 for dropping off at AusPost.');
        }

        if (getAnswer("Do you pay for the service?") === 'Yes') {
            score += 10;
            reasonParts.push('+10 for paying for existing service.');
        }
        
        const usage = getAnswer("What do you use them for?");
        if (typeof usage === 'string' && (usage.toLowerCase().includes('parcel') || usage.toLowerCase().includes('shipping'))) {
            score += 10;
            reasonParts.push('+10 for using AusPost for parcels.');
        }
    }

    if (getAnswer("Do you use any other couriers?") === 'Yes') {
        const couriers = getAnswer("Which Courier do you use?");
        if (Array.isArray(couriers) && couriers.length > 0) {
            score += 10;
            reasonParts.push('+10 for using other couriers.');
        }
        if (getAnswer("Do you have any need for local same-day deliveries?") === 'Yes') {
            score += 20;
            reasonParts.push('+20 for needing local same-day delivery.');
        }
    }

    if (getAnswer("Do people leave the office during the day?") === 'Yes') {
        const reasons = getAnswer("Reasons People Leave");
        if (Array.isArray(reasons)) {
            if (reasons.includes('Banking')) {
                score += 15;
                reasonParts.push('+15 for needing banking services.');
            }
            if (reasons.includes('Local Same Day')) {
                score += 15;
                reasonParts.push('+15 for needing local same-day errands.');
            }
        }
    }
    
    const scoringReason = reasonParts.length > 0 ? reasonParts.join(' ') : 'No specific scoring criteria met.';

    return { score: Math.min(score, 100), scoringReason };
}
