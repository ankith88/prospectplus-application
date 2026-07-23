import { firestore } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import type { Contact } from '@/lib/types';

/**
 * Deactivates LocalMile access for a lead.
 * Checks for contacts with explicit LocalMile access ('accessToLocalMile === yes'),
 * LocalMile credentials (localMilePlusAuthLink or securityCode),
 * or any associated contact/lead email, and calls the LocalMile deactivation API
 * (proxied via /api/localmile/deactivate-account to prevent CORS issues).
 */
export async function deactivateLocalMileAccessForLead(
  leadId: string,
  providedContacts?: Contact[]
): Promise<{ success: boolean; emailsRevoked: string[] }> {
  try {
    const candidateEmails = new Set<string>();

    // Helper to extract email if valid
    const addEmail = (email?: string) => {
      if (email && typeof email === 'string' && email.trim() && email.includes('@')) {
        candidateEmails.add(email.trim().toLowerCase());
      }
    };

    // 1. Gather contacts from provided array and Firestore subcollection
    const allContacts: Array<any> = providedContacts ? [...providedContacts] : [];

    try {
      const contactsRef = collection(firestore, 'leads', leadId, 'contacts');
      const snap = await getDocs(contactsRef);
      snap.docs.forEach(d => {
        allContacts.push({ id: d.id, ...d.data() });
      });
    } catch (e) {
      console.warn(`[LocalMile Deactivation] Could not fetch contacts subcollection for lead ${leadId}:`, e);
    }

    // 2. Priority 1: Check contacts explicitly marked with LocalMile access or credentials
    const explicitContacts = allContacts.filter(c =>
      c.accessToLocalMile === 'yes' ||
      Boolean(c.localMilePlusAuthLink) ||
      Boolean(c.securityCode)
    );

    explicitContacts.forEach(c => addEmail(c.email));

    // 3. Priority 2: If no explicit contacts found, check all contacts associated with the lead
    if (candidateEmails.size === 0) {
      allContacts.forEach(c => addEmail(c.email));
    }

    // 4. Priority 3: If still no emails found, check the lead document itself
    if (candidateEmails.size === 0) {
      try {
        const leadSnap = await getDoc(doc(firestore, 'leads', leadId));
        if (leadSnap.exists()) {
          const leadData = leadSnap.data();
          addEmail(leadData.email);
          addEmail(leadData.customerServiceEmail);
          addEmail(leadData.contactEmail);
        }
      } catch (e) {
        console.warn(`[LocalMile Deactivation] Could not fetch lead doc ${leadId}:`, e);
      }
    }

    if (candidateEmails.size === 0) {
      console.log(`[LocalMile Deactivation] No contact email found for lead ${leadId}.`);
      return { success: false, emailsRevoked: [] };
    }

    const emailsToRevoke = Array.from(candidateEmails);
    console.log(`[LocalMile Deactivation] Attempting to revoke LocalMile access for lead ${leadId} (emails: ${emailsToRevoke.join(', ')})...`);

    const revokedEmails: string[] = [];
    const isClient = typeof window !== 'undefined';
    const targetUrl = isClient
      ? '/api/localmile/deactivate-account'
      : "https://us-central1-localmile-plus.cloudfunctions.net/deactivateExternalUserAccount";

    // 5. Call API for each candidate email
    for (const email of emailsToRevoke) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (!isClient) {
          headers["x-api-key"] = "f7d8c2e1b0a943ef8215d6c7b8a90123fe456789abcd0123456789abcdef0123";
        }

        const response = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: email,
            leadId: leadId,
            customer_id: leadId
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[LocalMile Deactivation] Failed to deactivate LocalMile account for ${email}:`, errText);
        } else {
          console.log(`[LocalMile Deactivation] Successfully deactivated LocalMile account for ${email}.`);
          revokedEmails.push(email);
        }
      } catch (apiError) {
        console.error(`[LocalMile Deactivation] API error for ${email}:`, apiError);
      }
    }

    return { success: revokedEmails.length > 0, emailsRevoked: revokedEmails };
  } catch (error) {
    console.error("[LocalMile Deactivation] Fatal error executing deactivation:", error);
    return { success: false, emailsRevoked: [] };
  }
}
