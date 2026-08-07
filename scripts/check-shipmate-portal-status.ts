import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

function isValidEmail(email: string | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  if (!lower.includes('@') || !lower.includes('.')) return false;
  const forbidden = ['n/a', 'na', 'none', 'nil', 'tba', 'tbc', 'test', 'example', 'placeholder', 'noemail'];
  const parts = lower.split('@');
  if (parts.length !== 2) return false;
  if (forbidden.includes(parts[0])) return false;
  return true;
}

export async function checkPortalStatusOfContactEmail(email: string) {
  const mainURL = 'https://mpns.protechly.com/outbound_emails?email=' + encodeURIComponent(email);
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-key': 'XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj',
  };

  try {
    const res = await fetch(mainURL, { headers });
    if (!res.ok) {
      console.warn(`[ShipMate API] Non-200 response for ${email}: status ${res.status}`);
      return null;
    }
    const emailSubjects = await res.json();

    const createPasswordEmailSent = Array.isArray(emailSubjects)
      ? emailSubjects.some(item =>
          [
            'Create Your ShipMate Password Now',
            'Your MailPlus shipping portal is now ready for you to set up.',
          ].includes(item?.subject)
        )
      : false;

    const accountActivated = Array.isArray(emailSubjects)
      ? emailSubjects.some(item =>
          typeof item?.subject === 'string' && item.subject.includes('Welcome to your MailPlus Shipping Portal.')
        )
      : false;

    const accessToShipMate: 'yes' | 'no' = (accountActivated || createPasswordEmailSent) ? 'yes' : 'no';
    let shipmateStatus: 'Activated' | 'Password Sent' | 'No Access' = 'No Access';
    if (accountActivated) {
      shipmateStatus = 'Activated';
    } else if (createPasswordEmailSent) {
      shipmateStatus = 'Password Sent';
    }

    return {
      accountActivated,
      createPasswordEmailSent,
      accessToShipMate,
      shipmateStatus,
      shipmateCheckedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error(`[ShipMate API] Exception checking ${email}:`, e);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting ShipMate access check for company contacts subcollections...');

  const companiesSnap = await db.collection('companies').get();
  console.log(`Found ${companiesSnap.size} company documents.`);

  let totalContactsChecked = 0;
  let activatedCount = 0;
  let passwordSentCount = 0;
  let noAccessCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < companiesSnap.docs.length; i++) {
    const companyDoc = companiesSnap.docs[i];
    const companyId = companyDoc.id;
    const companyName = companyDoc.data().companyName || companyId;

    const contactsSnap = await db.collection('companies').doc(companyId).collection('contacts').get();

    if (contactsSnap.empty) continue;

    console.log(`[${i + 1}/${companiesSnap.size}] Checking ${contactsSnap.size} contacts for company: ${companyName} (${companyId})`);

    for (const contactDoc of contactsSnap.docs) {
      const contactData = contactDoc.data();
      const email = contactData.email?.trim();

      if (!isValidEmail(email)) {
        skippedCount++;
        continue;
      }

      totalContactsChecked++;
      const result = await checkPortalStatusOfContactEmail(email);

      if (!result) {
        errorCount++;
        continue;
      }

      if (result.accountActivated) activatedCount++;
      else if (result.createPasswordEmailSent) passwordSentCount++;
      else noAccessCount++;

      // Update contact document in Firestore
      await contactDoc.ref.update({
        accessToShipMate: result.accessToShipMate,
        accountActivated: result.accountActivated,
        createPasswordEmailSent: result.createPasswordEmailSent,
        shipmateStatus: result.shipmateStatus,
        shipmateCheckedAt: result.shipmateCheckedAt,
      });

      console.log(
        `   ↳ Updated contact: ${contactData.name || contactDoc.id} (${email}) => status: ${result.shipmateStatus} (accessToShipMate: ${result.accessToShipMate})`
      );
    }
  }

  console.log('\n================ SHIPMATE ACCESS CHECK SUMMARY ================');
  console.log(`Total Contacts Checked: ${totalContactsChecked}`);
  console.log(`- Account Activated:    ${activatedCount}`);
  console.log(`- Password Sent:        ${passwordSentCount}`);
  console.log(`- No Access:            ${noAccessCount}`);
  console.log(`- Skipped (invalid email): ${skippedCount}`);
  console.log(`- Errors:               ${errorCount}`);
  console.log('=================================================================\n');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error in script:', err);
    process.exit(1);
  });
}
