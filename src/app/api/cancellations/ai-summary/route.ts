import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { getCancellationTypeInfo } from '@/lib/cancellation-reasons-mapper';

export async function POST(req: NextRequest) {
  try {
    const { items, periodName = 'the selected week/period' } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No cancellation items provided for AI summary generation.'
      }, { status: 400 });
    }

    // Format dataset for prompt context
    let totalMRRLost = 0;
    let totalMRRSaved = 0;
    let trueRedCount = 0;
    let franchiseeYellowCount = 0;
    let dataWashGreyCount = 0;
    let stillCustomerGreenCount = 0;
    let savesCount = 0;
    let reductionSavesCount = 0;

    const formattedList = items.map((r: any, idx: number) => {
      const typeInfo = getCancellationTypeInfo(r);
      const isSave = r.status === 'Saved';
      const mrr = r.originalMRR || r.avg3MonthInvoiceMRR || 0;
      const savedMrr = r.savedMRR || r.newInvoiceMRR || 0;

      if (isSave) {
        savesCount++;
        totalMRRSaved += savedMrr;
        if (r.isReductionTurnedCancellation) {
          reductionSavesCount++;
        }
      } else if (r.status === 'Cancelled') {
        totalMRRLost += mrr;
      }

      if (typeInfo.type === 'RED') trueRedCount++;
      else if (typeInfo.type === 'YELLOW') franchiseeYellowCount++;
      else if (typeInfo.type === 'GREY') dataWashGreyCount++;
      else if (typeInfo.type === 'GREEN') stillCustomerGreenCount++;

      return `Item #${idx + 1}:
- Company: ${r.companyName || 'Unknown'}
- Franchisee: ${r.franchisee || 'Unassigned'}
- Status: ${r.status || 'Pending'}
- Cancellation Type: ${typeInfo.label} (${typeInfo.type})
- Cancelled by Franchisee (EOM): ${r.cancelledByFranchisee || r.isFranchiseeCancelled ? 'Yes' : 'No'}
- Theme: ${r.cancellationTheme || 'N/A'}
- Reason Code: ${r.cancellationReason || 'N/A'}
- Save Strategy: ${r.saveStrategy || 'N/A'}
- Reduction Turned Save (Commission Tracked): ${r.isReductionTurnedCancellation ? 'Yes' : 'No'}
- MRR Lost: $${mrr.toFixed(2)} | MRR Saved: $${savedMrr.toFixed(2)}
- Notes: ${r.notes || 'None'}`;
    }).join('\n\n');

    const promptText = `You are an expert Customer Retention & Revenue Operations AI Assistant for MailPlus Australia.
Analyze the following dataset of customer cancellation and retention records for ${periodName} and construct a clear, highly actionable, executive report.

### DATA SUMMARY STATS:
- Total Records: ${items.length}
- Saved Customers: ${savesCount} (Total Saved MRR: $${totalMRRSaved.toFixed(2)}, Annualized Saved: $${(totalMRRSaved * 12).toFixed(2)})
- Commission-Tracked Saved Reductions: ${reductionSavesCount}
- Lost MRR (True Churn): $${totalMRRLost.toFixed(2)} (Annualized Lost: $${(totalMRRLost * 12).toFixed(2)})
- Classification Split:
  * 🔴 RED - True Cancellations: ${trueRedCount}
  * 🟡 YELLOW - End of Month / Franchisee Cancelled: ${franchiseeYellowCount}
  * ⚪ GREY - Data Wash: ${dataWashGreyCount}
  * 🟢 GREEN - Still a Customer (Ownership / Relocation SCF Signed): ${stillCustomerGreenCount}

---
### DETAILED RECORDS:
${formattedList}

---
### INSTRUCTIONS:
Structure your response in markdown format with clear headings and bullet points:

1. 📊 **Executive Overview**: High-level summary of cancellation activity, financial impact, and save success rate for ${periodName}.
2. 🔴🟡⚪🟢 **Classification Breakdown (Red vs Yellow vs Grey vs Green)**: Detail the ratio of True Cancellations (Red) vs Franchisee EOM Cancellations (Yellow) vs Data Wash (Grey) vs Retained Customers (Green). Highlight why separating Franchisee EOM from True Churn is key.
3. 🎯 **Top Cancellation Themes & Churn Drivers**: Highlight the primary reasons customers are attempting to cancel (e.g. Price, Competitor, Operations, Onboarding).
4. 💡 **Saves of the Week & Retention Strategies**: Showcase key saves, the strategies used, and specifically call out any saved service reductions tracked for commissions (e.g. Sarah saving customers through revised pricing).
5. 🏬 **Franchisee Tally & Regional Trends**: Summarize top franchisee churn hotspots vs franchisee-driven EOM cleanups.
6. 🚀 **Strategic Recommendations for CS Team**: Provide 3-4 concrete actions to improve customer retention next week.

Keep the tone professional, concise, encouraging, and data-driven.`;

    const response = await ai.generate({
      prompt: promptText
    });

    return NextResponse.json({
      success: true,
      summary: response.text,
      stats: {
        totalRecords: items.length,
        savesCount,
        reductionSavesCount,
        totalMRRSaved,
        totalMRRLost,
        trueRedCount,
        franchiseeYellowCount,
        dataWashGreyCount,
        stillCustomerGreenCount
      }
    });

  } catch (error: any) {
    console.error('Error generating cancellation AI summary:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to generate AI summary'
    }, { status: 500 });
  }
}
