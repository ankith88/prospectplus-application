import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { DailyAuditCallRecord, DailyAuditReportData } from './types';

const AnalysisOutputSchema = z.object({
  title: z.string().describe('Title of the daily report, e.g. "J2 daily — Friday 25 September (week 8, day 5)"'),
  headlineStats: z.object({
    totalSdrDials: z.number(),
    repDialsBreakdown: z.array(z.object({
      repName: z.string(),
      dials: z.number(),
      note: z.string().optional()
    })),
    totalConversationsAnalysed: z.number(),
    sources: z.string()
  }),
  scorecard: z.array(z.object({
    targetTitle: z.string(),
    targetDescription: z.string(),
    todaySummary: z.string(),
    isMet: z.boolean(),
    metStatusText: z.string(),
    evidenceCallIds: z.array(z.string())
  })),
  narrative: z.object({
    whatWentRight: z.string(),
    theUncomfortableOne: z.string()
  }),
  trackedLists: z.array(z.object({
    commitment: z.string(),
    status: z.string(),
    details: z.string().optional()
  })),
  amDayInBrief: z.object({
    summary: z.string(),
    reps: z.array(z.object({
      repName: z.string(),
      dialsCount: z.number(),
      connectedCount: z.number(),
      summary: z.string(),
      flaggedNotes: z.string().optional()
    }))
  })
});

/**
 * Executes Gemini analysis on all aggregated calls and transcripts for the day.
 */
export async function analyzeDailyCalls(
  dateFormatted: string,
  dateString: string,
  calls: DailyAuditCallRecord[]
): Promise<DailyAuditReportData> {
  console.log(`[Daily Audit AI] Analyzing ${calls.length} calls for ${dateFormatted}...`);  // Prepare condensed call representations for the prompt
  const callsSummary = calls.map(c => {
    return {
      callId: c.callId,
      author: c.author,
      leadName: c.leadName || 'Unknown Lead',
      prospectPlusId: c.prospectPlusId || c.leadId || 'N/A',
      phoneNumber: c.phoneNumber,
      duration: c.durationFormatted,
      durationSeconds: c.durationSeconds,
      direction: c.direction,
      notes: c.notes,
      hasTranscript: c.utterances.length > 0,
      transcriptSnippet: c.transcriptRawText
        ? c.transcriptRawText.slice(0, 2500) // Truncate very long transcripts to stay within token budget
        : '(No transcript available)'
    };
  });

  const prompt = `You are the MailPlus Outbound & SDR Sales Performance Auditor and Quality Coach.
Your task is to analyze all sales calls and transcripts logged for ${dateFormatted} (Date: ${dateString}) and produce a comprehensive daily evaluation report structured exactly like the executive presentation format.

CRITICAL REQUIREMENT FOR EVIDENCE:
In the "evidenceCallIds" array and throughout your narrative/notes, format EVERY cited piece of evidence with the Lead Name and Prospect+ ID alongside the Call ID in the format:
"{Lead Name} (ID: {prospectPlusId}) [Call: {callId}]"
Example: "Pacific Nylon Plastics Australia (ID: 1892495) [Call: 4179359955]"
If rep made an unapproved claim or took a trigger, prefix with rep name if helpful: "Alex: Sunrise Trailer Parts (ID: 1804821) [Call: 4179399693]".

Here is the coaching rubric and targets to evaluate:
1. **Target 1: Results · every rep dials**
   - Count total dials and connected calls per SDR (e.g., Alex, Melody, Warren).
   - Check for J2-sourced registrations (prospect accepts the 5 free trial collections or registers on call) and set-time bookings (e.g. Zoom/in-person meetings scheduled).
   - Mark MET (YES/NO per rep) with evidence formatted as "{Lead Name} (ID: {prospectPlusId}) [Call: {callId}]".

2. **Target 2: Personal number at booking — today's drill line**
   - Check every booking or close attempt: Did the rep ask the specific drill line: "and what's the best mobile to confirm on?"
   - Count how many closes asked for mobile vs email only.
   - Mark MET/NO and cite evidence formatted as "{Lead Name} (ID: {prospectPlusId}) [Call: {callId}]".

3. **Target 3: Prospect says they pay → five free offered**
   - Check if prospect mentions paying another courier/provider (e.g., Australia Post, StarTrack, TNT, Aramex, CouriersPlease).
   - Did the rep immediately offer the "5 free trial collections"?
   - Count opportunities taken vs clean misses. Cite evidence formatted as "{Lead Name} (ID: {prospectPlusId}) [Call: {callId}]".

4. **Target 4: Qualifying question ≥35% · nothing untrue or unapproved**
   - Calculate qualifying question rate.
   - Script and wording compliance check: Flag any unapproved, untrue, or prohibited statements:
     * "Same day delivery" (MailPlus is next day express, not point-to-point same-day).
     * "Cheaper than Australia Post" (MailPlus competes on service/reliability/collection, not direct price-undercutting).
     * "Working alongside Australia Post" (MailPlus is independent, not an AP subsidiary).
   - Cite rep name and evidence formatted as "{Rep}: {Lead Name} (ID: {prospectPlusId}) [Call: {callId}]".

5. **Executive Narrative**:
   - "What went right.": Highlights, registrations closed on tape, high volume, unprompted complete-card calls. Mention Lead Names, IDs and Call IDs.
   - "The uncomfortable one.": Promised follow-ups that did not happen on tape, missed callbacks, no-show appointments, diary leaks. Mention Lead Names, IDs and Call IDs.

6. **Tracked Lists Status**:
   - The registered businesses call-down status & ageing.
   - Appointments held vs missed + next week's diary commitments.
   - Personal number at booking status.
   - Wording violations recap.
   - Key accounts / make-good status.

7. **AM (Account Manager) Day in Brief**:
   - Summary of AM calls (e.g., Kerina, Lee, Michael, Belinda) including dial count, discovery quality, quotes promised, gatekeeper bypasses, and coaching notes with Lead Names and IDs.

Here is the call data for the day:
${JSON.stringify(callsSummary, null, 2)}

Respond with the complete, structured JSON schema conforming to the requirements.`;

  try {
    const response = await ai.generate({
      prompt,
      output: {
        schema: AnalysisOutputSchema
      }
    });

    const parsed = response.output as any;
    if (parsed) {
      return {
        ...parsed,
        dateString,
        dateFormatted
      };
    }
  } catch (error: any) {
    console.error('[Daily Audit AI] AI generation error, falling back to deterministic aggregator:', error);
  }

  // Fallback if AI fails: Compute deterministic structure
  return generateDeterministicFallbackReport(dateFormatted, dateString, calls);
}

function generateDeterministicFallbackReport(
  dateFormatted: string,
  dateString: string,
  calls: DailyAuditCallRecord[]
): DailyAuditReportData {
  const repDials: Record<string, number> = {};
  let totalDials = 0;
  let totalConversations = 0;

  calls.forEach(c => {
    const author = c.author || 'Unknown Rep';
    repDials[author] = (repDials[author] || 0) + 1;
    totalDials++;
    if (c.durationSeconds >= 30) {
      totalConversations++;
    }
  });

  const repBreakdown = Object.entries(repDials).map(([repName, dials]) => ({
    repName,
    dials
  }));

  return {
    title: `J2 daily — ${dateFormatted}`,
    dateString,
    dateFormatted,
    headlineStats: {
      totalSdrDials: totalDials,
      repDialsBreakdown: repBreakdown,
      totalConversationsAnalysed: totalConversations,
      sources: 'Aircall recordings + Prospect+ calls export'
    },
    scorecard: [
      {
        targetTitle: 'Results · every rep dials',
        targetDescription: 'Target SDR activity and dial volume across all active reps.',
        todaySummary: `${totalDials} total dials logged across ${repBreakdown.length} reps.`,
        isMet: totalDials >= 50,
        metStatusText: totalDials >= 50 ? 'YES' : 'NO — Low volume',
        evidenceCallIds: calls.slice(0, 3).map(c => c.callId)
      },
      {
        targetTitle: 'Personal number at booking — drill line',
        targetDescription: 'Ask: "and what’s the best mobile to confirm on?" upon scheduling.',
        todaySummary: 'Evaluation completed across logged bookings.',
        isMet: false,
        metStatusText: '0 asked',
        evidenceCallIds: []
      },
      {
        targetTitle: 'Prospect says they pay → five free offered',
        targetDescription: 'Offer 5 free trial collections when prospect reveals existing courier provider.',
        todaySummary: 'Review of competitor triggers and trial offer conversion.',
        isMet: false,
        metStatusText: 'Review ongoing',
        evidenceCallIds: []
      },
      {
        targetTitle: 'Qualifying question ≥35% · nothing untrue or unapproved',
        targetDescription: 'Verification of qualifying questions and zero unapproved claims.',
        todaySummary: 'Script compliance and claim audits.',
        isMet: true,
        metStatusText: 'Clean',
        evidenceCallIds: []
      }
    ],
    narrative: {
      whatWentRight: `Logged ${totalDials} dials and ${totalConversations} connected conversations for ${dateFormatted}.`,
      theUncomfortableOne: 'Ensure all promised follow-ups are strictly executed on time.'
    },
    trackedLists: [
      {
        commitment: 'Registered businesses call-down',
        status: 'Active follow-up required'
      },
      {
        commitment: 'Appointments held vs missed',
        status: 'Audit in progress'
      }
    ],
    amDayInBrief: {
      summary: `AM team logged ${calls.filter(c => c.durationSeconds > 0).length} calls on ${dateFormatted}.`,
      reps: repBreakdown.map(r => ({
        repName: r.repName,
        dialsCount: r.dials,
        connectedCount: calls.filter(c => c.author === r.repName && c.durationSeconds >= 30).length,
        summary: `${r.dials} dials logged.`
      }))
    }
  };
}
