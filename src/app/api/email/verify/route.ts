import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailVerificationResult, EmailVerificationStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emails, leadId, contactId, forceRefresh = false } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid request: "emails" array is required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.HUNTER_API_KEY;
    const results: EmailVerificationResult[] = [];

    for (const rawEmail of emails) {
      if (!rawEmail || typeof rawEmail !== 'string') continue;
      const normalizedEmail = rawEmail.toLowerCase().trim();

      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        results.push({
          email: rawEmail,
          status: 'undeliverable',
          score: 0,
          reason: 'Invalid email syntax',
          verifiedAt: new Date().toISOString(),
          cached: true,
        });
        continue;
      }

      // Step 1: Check Firestore cache first unless forceRefresh is true
      if (!forceRefresh) {
        try {
          const cachedDoc = await db.collection('email_verifications').doc(normalizedEmail).get();
          if (cachedDoc.exists) {
            const cachedData = cachedDoc.data() as EmailVerificationResult;
            results.push({
              ...cachedData,
              cached: true,
            });
            continue;
          }
        } catch (cacheErr) {
          console.warn(`[Email Verify API] Cache lookup failed for ${normalizedEmail}:`, cacheErr);
        }
      }

      // Step 2: Call Hunter.io Email Verifier API
      if (!apiKey) {
        // Fallback if API key missing
        results.push({
          email: normalizedEmail,
          status: 'unknown',
          score: 0,
          reason: 'Hunter.io API key is not configured on server.',
          verifiedAt: new Date().toISOString(),
          cached: false,
        });
        continue;
      }

      try {
        const hunterUrl = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(normalizedEmail)}&api_key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

        let response;
        try {
          response = await fetch(hunterUrl, { signal: controller.signal as any });
        } finally {
          clearTimeout(timeout);
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[Email Verify API] Hunter.io returned error ${response.status}:`, errText);
          results.push({
            email: normalizedEmail,
            status: 'unknown',
            score: 0,
            reason: `Hunter.io HTTP error ${response.status}`,
            verifiedAt: new Date().toISOString(),
            cached: false,
          });
          continue;
        }

        const resData = await response.json();
        const data = resData?.data || {};

        const statusMap: Record<string, EmailVerificationStatus> = {
          deliverable: 'deliverable',
          risky: 'risky',
          undeliverable: 'undeliverable',
        };

        const verificationResult: EmailVerificationResult = {
          email: normalizedEmail,
          status: statusMap[data.result] || 'unknown',
          score: typeof data.score === 'number' ? data.score : 0,
          reason: data.reason || undefined,
          verifiedAt: new Date().toISOString(),
          cached: false,
          details: {
            regexp: data.regexp,
            gibberish: data.gibberish,
            disposable: data.disposable,
            webmail: data.webmail,
            mxRecords: data.mx_records,
            smtpCheck: data.smtp_check,
            acceptAll: data.accept_all,
          },
        };

        // Step 3: Save verification result in Firestore cache for future requests
        await db.collection('email_verifications').doc(normalizedEmail).set(verificationResult);
        results.push(verificationResult);

      } catch (err: any) {
        console.error(`[Email Verify API] Failed to verify ${normalizedEmail}:`, err.message || err);
        results.push({
          email: normalizedEmail,
          status: 'unknown',
          score: 0,
          reason: err.name === 'AbortError' ? 'Verification request timed out' : 'Failed to reach verification service',
          verifiedAt: new Date().toISOString(),
          cached: false,
        });
      }
    }

    // Step 4: If leadId is provided, update lead contacts in Firestore
    if (leadId && results.length > 0) {
      try {
        const leadRef = db.collection('leads').doc(leadId);
        const leadDoc = await leadRef.get();

        if (leadDoc.exists) {
          const leadData = leadDoc.data() || {};
          const contacts = (leadData.contacts || []) as any[];

          let updated = false;
          const updatedContacts = contacts.map((c: any) => {
            if (!c.email) return c;
            const norm = c.email.toLowerCase().trim();
            const match = results.find(r => r.email.toLowerCase().trim() === norm);
            if (match) {
              updated = true;
              return {
                ...c,
                verificationStatus: match.status,
                verificationScore: match.score,
                verifiedAt: match.verifiedAt,
              };
            }
            return c;
          });

          if (updated) {
            await leadRef.update({ contacts: updatedContacts });
          }

          // Check subcollection contacts if present
          if (contactId) {
            const contactSubRef = leadRef.collection('contacts').doc(contactId);
            const subDoc = await contactSubRef.get();
            if (subDoc.exists) {
              const subData = subDoc.data() || {};
              const match = results.find(r => r.email.toLowerCase().trim() === (subData.email || '').toLowerCase().trim());
              if (match) {
                await contactSubRef.update({
                  verificationStatus: match.status,
                  verificationScore: match.score,
                  verifiedAt: match.verifiedAt,
                });
              }
            }
          }
        }
      } catch (leadUpdateErr) {
        console.error(`[Email Verify API] Error updating lead contacts in Firestore:`, leadUpdateErr);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('[Email Verify API] Server error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
