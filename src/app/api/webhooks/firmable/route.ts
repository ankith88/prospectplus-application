import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifySvixSignature } from '@/lib/svix-verify';
import { DecisionMakerCandidate, Contact } from '@/lib/types';
import { classifyDepartment, determineConfidence, extractCleanDomain } from '@/services/agent-reach/hunter-enricher';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

export async function POST(req: NextRequest) {
  try {
    const rawPayload = await req.text();
    const secret = process.env.FIRMABLE_WEBHOOK_SECRET;

    // 1. Verify Svix signature if secret is configured
    const svixHeaders = {
      id: req.headers.get('svix-id'),
      timestamp: req.headers.get('svix-timestamp'),
      signature: req.headers.get('svix-signature'),
    };

    if (secret && svixHeaders.signature) {
      const isValid = verifySvixSignature(rawPayload, svixHeaders, secret);
      if (!isValid) {
        console.warn('[Firmable Webhook] Invalid Svix signature received');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else if (secret && !svixHeaders.signature) {
      console.warn('[Firmable Webhook] Missing svix-signature header');
      return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    console.log(`[Firmable Webhook] Received event: ${payload.event || payload.type || 'unknown'}`);

    const eventType = payload.event || payload.type || '';
    const data = payload.data || payload;

    // 2. Extract Lead identifier
    // Check metadata, direct parameters, or URL search params
    const searchParams = req.nextUrl.searchParams;
    let targetLeadId: string | null =
      searchParams.get('leadId') ||
      data.metadata?.leadId ||
      data.leadId ||
      data.custom_id ||
      payload.leadId ||
      null;

    // Extract domain and company name from payload for fallback lead matching
    const rawDomain =
      data.company?.domain ||
      data.person?.company?.domain ||
      data.domain ||
      (data.person?.work_email ? data.person.work_email.split('@')[1] : null);
    const cleanDomain = extractCleanDomain(rawDomain);
    const companyName = data.company?.name || data.person?.company?.name || data.company_name;

    let leadDoc: FirebaseFirestore.DocumentSnapshot | null = null;

    if (targetLeadId) {
      const snap = await db.collection('leads').doc(targetLeadId).get();
      if (snap.exists) leadDoc = snap;
    }

    // Fallback: match by domain
    if (!leadDoc && cleanDomain) {
      const byDomainSnap = await db
        .collection('leads')
        .where('websiteUrl', '>=', cleanDomain)
        .where('websiteUrl', '<=', cleanDomain + '\uf8ff')
        .limit(1)
        .get();

      if (!byDomainSnap.empty) {
        leadDoc = byDomainSnap.docs[0];
        targetLeadId = leadDoc.id;
      }
    }

    // Fallback: match by companyName exact or prefix
    if (!leadDoc && companyName) {
      const byNameSnap = await db
        .collection('leads')
        .where('companyName', '==', companyName)
        .limit(1)
        .get();

      if (!byNameSnap.empty) {
        leadDoc = byNameSnap.docs[0];
        targetLeadId = leadDoc.id;
      }
    }

    if (!leadDoc || !targetLeadId) {
      console.warn(`[Firmable Webhook] Could not resolve lead for domain=${cleanDomain}, company=${companyName}`);
      return NextResponse.json({
        success: true,
        message: 'Webhook received but no matching lead found in ProspectPlus.',
      });
    }

    const leadData = leadDoc.data() || {};
    const existingCandidates: DecisionMakerCandidate[] =
      leadData.discoveryData?.decisionMakerCandidates || [];

    // 3. Process person data if enrich.person or person payload
    const person = data.person || (eventType.includes('person') ? data : null);
    const company = data.company || (eventType.includes('company') ? data : null);

    const updatePayload: Record<string, any> = {};
    let enrichedCount = 0;

    if (person) {
      const firstName = (person.first_name || person.firstName || '').trim();
      const lastName = (person.last_name || person.lastName || '').trim();
      const fullName = (person.full_name || person.name || `${firstName} ${lastName}`).trim();
      const title = (person.job_title || person.title || person.position || 'Decision Maker').trim();
      const email = (person.work_email || person.email || person.business_email || '').trim().toLowerCase();
      const mobilePhone = (
        person.mobile_phone ||
        person.mobile ||
        person.phone ||
        person.direct_dial ||
        (Array.isArray(person.phone_numbers) ? person.phone_numbers[0] : '') ||
        ''
      ).trim();
      const linkedinUrl = person.linkedin_url || person.linkedin || '';

      if (fullName) {
        const candidate: DecisionMakerCandidate = {
          name: fullName,
          title,
          department: classifyDepartment(title),
          confidence: determineConfidence(title),
          email: email || undefined,
          emailScore: 95, // Firmable verified
          phone: mobilePhone || undefined,
          linkedinUrl: linkedinUrl || undefined,
          source: 'Firmable Australia (Verified)',
          hunterEnriched: true,
        };

        // Merge or update in candidates list
        const lowerName = fullName.toLowerCase();
        const existingIdx = existingCandidates.findIndex(
          (c) =>
            c.name.toLowerCase().trim() === lowerName ||
            (c.email && email && c.email.toLowerCase() === email) ||
            (c.linkedinUrl && linkedinUrl && c.linkedinUrl.toLowerCase() === linkedinUrl.toLowerCase())
        );

        if (existingIdx >= 0) {
          existingCandidates[existingIdx] = {
            ...existingCandidates[existingIdx],
            ...candidate,
            // Prioritize new mobile number & verified email
            phone: mobilePhone || existingCandidates[existingIdx].phone,
            email: email || existingCandidates[existingIdx].email,
            title: title || existingCandidates[existingIdx].title,
            confidence: determineConfidence(title || existingCandidates[existingIdx].title),
            department: classifyDepartment(title || existingCandidates[existingIdx].title),
          };
        } else {
          existingCandidates.unshift(candidate);
        }

        enrichedCount++;

        // If high confidence decision maker, update lead fields
        if (candidate.confidence === 'High' || !leadData.decisionMakerName) {
          updatePayload.decisionMakerName = candidate.name;
          updatePayload.decisionMakerTitle = candidate.title;
          if (candidate.email) updatePayload.customerEmail = candidate.email;
          if (candidate.phone) updatePayload.customerPhone = candidate.phone;
        }

        // Add to lead contacts list if not present
        const currentContacts: Contact[] = leadData.contacts || [];
        const isAlreadyContact = currentContacts.some(
          (c) =>
            c.name.toLowerCase().trim() === lowerName ||
            (c.email && email && c.email.toLowerCase() === email)
        );

        if (!isAlreadyContact) {
          const newContact: Contact = {
            id: `ct_fmb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: fullName,
            firstName,
            lastName,
            title,
            email,
            phone: mobilePhone || leadData.customerPhone || leadData.phone || '',
            linkedinUrl,
          };
          updatePayload.contacts = [...currentContacts, newContact];
          updatePayload.contactCount = currentContacts.length + 1;
        }
      }
    }

    // 4. Process company data if enrich.company
    if (company) {
      if (company.abn && !leadData.abn) {
        updatePayload['discoveryData.abn'] = company.abn;
      }
      if (company.employees_range || company.employee_count) {
        updatePayload['discoveryData.employeeCount'] = company.employees_range || company.employee_count;
      }
      if (company.industry && (!leadData.industryCategory || leadData.industryCategory === 'Unknown')) {
        updatePayload.industryCategory = company.industry;
      }
      // If company payload contains nested contacts list
      if (Array.isArray(company.contacts) && company.contacts.length > 0) {
        for (const item of company.contacts) {
          const cName = (item.full_name || item.name || `${item.first_name || ''} ${item.last_name || ''}`).trim();
          if (!cName) continue;
          const cTitle = (item.job_title || item.title || '').trim();
          const cEmail = (item.work_email || item.email || '').trim().toLowerCase();
          const cPhone = (item.mobile_phone || item.mobile || item.phone || '').trim();

          const cand: DecisionMakerCandidate = {
            name: cName,
            title: cTitle,
            department: classifyDepartment(cTitle),
            confidence: determineConfidence(cTitle),
            email: cEmail || undefined,
            phone: cPhone || undefined,
            linkedinUrl: item.linkedin_url || undefined,
            source: 'Firmable Australia (Verified)',
            hunterEnriched: true,
          };

          const idx = existingCandidates.findIndex((c) => c.name.toLowerCase() === cName.toLowerCase());
          if (idx >= 0) {
            existingCandidates[idx] = { ...existingCandidates[idx], ...cand };
          } else {
            existingCandidates.push(cand);
          }
          enrichedCount++;
        }
      }
    }

    updatePayload['discoveryData.decisionMakerCandidates'] = existingCandidates;
    updatePayload.updatedAt = new Date().toISOString();

    await leadDoc.ref.update(updatePayload);

    // 5. Add audit log in lead activity subcollection
    try {
      await leadDoc.ref.collection('activity').add({
        type: 'firmable_enrichment',
        action: 'Firmable Webhook Received',
        details: `Firmable enriched ${enrichedCount} decision maker(s) with Australian direct dials & verified emails.`,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      leadId: targetLeadId,
      message: `Enriched ${enrichedCount} contact(s) on lead ${targetLeadId} via Firmable webhook.`,
    });
  } catch (error: any) {
    console.error('[Firmable Webhook Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
