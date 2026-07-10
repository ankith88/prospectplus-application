const admin = require('firebase-admin');

if (process.env.USE_PROD !== 'true') {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  console.log("Checking Emulator Firestore...");
} else {
  console.log("Checking Production Firestore...");
}

admin.initializeApp({ projectId: 'mailplus-outbound-leads-crm' });
const db = admin.firestore();

function getPhoneVariations(phoneNumber) {
    const digits = phoneNumber.replace(/\D/g, '');
    const variations = new Set();
    if (!digits) return [];
    variations.add(digits);
    variations.add(`+${digits}`);
    if (digits.startsWith('61')) {
        const localPart = digits.substring(2);
        variations.add(`0${localPart}`);
        variations.add(localPart);
    } else if (digits.startsWith('0')) {
        const localPart = digits.substring(1);
        variations.add(`61${localPart}`);
        variations.add(`+61${localPart}`);
        variations.add(localPart);
    } else {
        variations.add(`0${digits}`);
        variations.add(`61${digits}`);
        variations.add(`+61${digits}`);
    }
    variations.add(phoneNumber.trim());
    return Array.from(variations);
}

async function run() {
  const phone = "+61 490 048 801";
  const variations = getPhoneVariations(phone);
  console.log("Variations being searched:", variations);

  for (const col of ['leads', 'companies']) {
    for (const num of variations) {
      const snap = await db.collection(col).where('customerPhone', '==', num).get();
      snap.forEach(doc => {
        console.log(`[Top-level Match] Found in ${col}: ID = ${doc.id}, Name = ${doc.data().companyName}, Phone = ${doc.data().customerPhone}`);
      });
    }
  }

  for (const num of variations) {
    const snap = await db.collectionGroup('contacts').where('phone', '==', num).get();
    snap.forEach(doc => {
      const parent = doc.ref.parent.parent;
      console.log(`[Contact-level Match] Found contact ${doc.id} (Name: ${doc.data().name}, Phone: ${doc.data().phone}) under ${parent ? parent.path : 'unknown'}`);
    });
  }
}

run().catch(console.error);
