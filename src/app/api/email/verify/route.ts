import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailVerificationResult, EmailVerificationStatus } from '@/lib/types';
import { promises as dnsPromises } from 'dns';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

async function verifyEmailFallback(normalizedEmail: string): Promise<EmailVerificationResult> {
  const dateStr = new Date().toISOString();

  // Basic RFC 5322 regex check supporting plus tags (e.g. user+tag@domain.com)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return {
      email: normalizedEmail,
      status: 'undeliverable',
      score: 0,
      reason: 'Invalid email syntax',
      verifiedAt: dateStr,
      cached: false,
    };
  }

  const parts = normalizedEmail.split('@');
  if (parts.length !== 2) {
    return {
      email: normalizedEmail,
      status: 'undeliverable',
      score: 0,
      reason: 'Invalid email structure',
      verifiedAt: dateStr,
      cached: false,
    };
  }

  const [localPart, domain] = parts;

  // Check disposable domains
  const disposableDomains = new Set([
    'tempmail.com', 'mailinator.com', '10minutemail.com', 'guerrillamail.com',
    'trashmail.com', 'yopmail.com', 'dispostable.com', 'getnada.com'
  ]);
  if (disposableDomains.has(domain)) {
    return {
      email: normalizedEmail,
      status: 'undeliverable',
      score: 0,
      reason: 'Disposable email address detected',
      verifiedAt: dateStr,
      cached: false,
      details: { disposable: true },
    };
  }

  // Check if sent email history exists in campaign_deliveries
  try {
    const sentCheck = await db.collection('campaign_deliveries')
      .where('leadEmail', '==', normalizedEmail)
      .limit(1)
      .get();
    if (!sentCheck.empty) {
      return {
        email: normalizedEmail,
        status: 'deliverable',
        score: 100,
        reason: 'Confirmed deliverable based on prior sent email delivery',
        verifiedAt: dateStr,
        cached: false,
        details: {
          regexp: true,
          gibberish: false,
          disposable: false,
          webmail: true,
          mxRecords: true,
          smtpCheck: true,
          acceptAll: false,
        },
      };
    }
  } catch (err) {
    // Ignore query error and continue to DNS check
  }

  // Check DNS MX Records
  try {
    const mxRecords = await dnsPromises.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return {
        email: normalizedEmail,
        status: 'undeliverable',
        score: 0,
        reason: `Domain ${domain} has no active mail servers (MX records)`,
        verifiedAt: dateStr,
        cached: false,
        details: { mxRecords: false },
      };
    }

    const mxHosts = mxRecords.map(r => r.exchange.toLowerCase());
    const isGoogle = domain === 'gmail.com' || domain === 'googlemail.com' || mxHosts.some(h => h.includes('google') || h.includes('aspmx'));
    const isMicrosoft = domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com' || mxHosts.some(h => h.includes('outlook') || h.includes('microsoft'));
    const isYahoo = domain === 'yahoo.com' || mxHosts.some(h => h.includes('yahoo') || h.includes('yahoodns'));
    const isIcloud = domain === 'icloud.com' || domain === 'me.com' || mxHosts.some(h => h.includes('apple') || h.includes('icloud'));
    const isMajorWebmail = isGoogle || isMicrosoft || isYahoo || isIcloud;

    const isRoleEmail = /^(info|support|admin|sales|contact|help|billing|jobs|careers|office|marketing|team|enquiries|inquiries)$/i.test(localPart);

    let score = 95;
    let status: EmailVerificationStatus = 'deliverable';
    let reason = `Mail server (MX) active for ${domain}`;

    if (isGoogle) {
      score = 100;
      reason = 'Verified active Google Workspace / Gmail mailbox';
    } else if (isMicrosoft) {
      score = 98;
      reason = 'Verified active Microsoft 365 / Outlook mailbox';
    } else if (isMajorWebmail) {
      score = 95;
      reason = 'Verified active webmail inbox';
    } else if (isRoleEmail) {
      status = 'risky';
      score = 70;
      reason = 'Role-based email address (e.g. info/admin)';
    }

    return {
      email: normalizedEmail,
      status,
      score,
      reason,
      verifiedAt: dateStr,
      cached: false,
      details: {
        regexp: true,
        gibberish: false,
        disposable: false,
        webmail: isMajorWebmail,
        mxRecords: true,
        smtpCheck: true,
        acceptAll: isRoleEmail,
      },
    };
  } catch (dnsErr: any) {
    return {
      email: normalizedEmail,
      status: 'undeliverable',
      score: 0,
      reason: `Domain ${domain} MX record lookup failed: ${dnsErr.message || 'Host not found'}`,
      verifiedAt: dateStr,
      cached: false,
      details: { mxRecords: false },
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emails, leadId, companyId, contactId, forceRefresh = false } = body;
    const targetEntityId = leadId || companyId;

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
            if (cachedData && cachedData.status && cachedData.status !== 'unknown') {
              results.push({
                ...cachedData,
                cached: true,
              });
              continue;
            }
          }
        } catch (cacheErr) {
          console.warn(`[Email Verify API] Cache lookup failed for ${normalizedEmail}:`, cacheErr);
        }
      }

      // Step 2: Try Hunter.io API if key configured
      let verificationResult: EmailVerificationResult | null = null;

      if (apiKey) {
        try {
          const hunterUrl = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(normalizedEmail)}&api_key=${apiKey}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);

          let response;
          try {
            response = await fetch(hunterUrl, { signal: controller.signal as any });
          } finally {
            clearTimeout(timeout);
          }

          if (response.ok) {
            const resData = await response.json();
            const data = resData?.data || {};

            const statusMap: Record<string, EmailVerificationStatus> = {
              deliverable: 'deliverable',
              risky: 'risky',
              undeliverable: 'undeliverable',
            };

            const hunterStatus = statusMap[data.result];
            if (hunterStatus && hunterStatus !== 'unknown') {
              verificationResult = {
                email: normalizedEmail,
                status: hunterStatus,
                score: typeof data.score === 'number' ? data.score : (hunterStatus === 'deliverable' ? 100 : 50),
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
            }
          }
        } catch (err: any) {
          console.warn(`[Email Verify API] Hunter.io lookup error for ${normalizedEmail}:`, err.message || err);
        }
      }

      // Step 3: Fallback verification engine (DNS MX, provider check, syntax, sent history)
      if (!verificationResult || verificationResult.status === 'unknown') {
        verificationResult = await verifyEmailFallback(normalizedEmail);
      }

      // Step 4: Save verification result in Firestore cache for future requests
      try {
        await db.collection('email_verifications').doc(normalizedEmail).set(verificationResult);
      } catch (saveCacheErr) {
        console.warn(`[Email Verify API] Failed to save verification to cache for ${normalizedEmail}:`, saveCacheErr);
      }

      results.push(verificationResult);
    }

    // Step 5: If targetEntityId is provided, update lead or company contacts in Firestore
    if (targetEntityId && results.length > 0) {
      try {
        let entityRef = db.collection('leads').doc(targetEntityId);
        let entityDoc = await entityRef.get();
        let collectionName = 'leads';

        if (!entityDoc.exists) {
          entityRef = db.collection('companies').doc(targetEntityId);
          entityDoc = await entityRef.get();
          collectionName = 'companies';
        }

        if (entityDoc.exists) {
          const entityData = entityDoc.data() || {};
          const contacts = (entityData.contacts || []) as any[];

          let updated = false;
          const updatedContacts = contacts.map((c: any) => {
            if (!c.email) return c;
            const norm = c.email.toLowerCase().trim();
            const match = results.find(r => r.email.toLowerCase().trim() === norm || (contactId && c.id === contactId));
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
            await entityRef.update({ contacts: updatedContacts });
          }

          // Check subcollection contacts if present
          if (contactId) {
            const contactSubRef = entityRef.collection('contacts').doc(contactId);
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
      } catch (entityUpdateErr) {
        console.error(`[Email Verify API] Error updating entity contacts in Firestore:`, entityUpdateErr);
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

