const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

// Calculate yesterday's date
const sydneyFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const now = new Date();
now.setDate(now.getDate() - 1); // Yesterday

const parts = sydneyFormatter.formatToParts(now);
const day = parts.find(p => p.type === 'day')?.value;
const month = parts.find(p => p.type === 'month')?.value;
const year = parts.find(p => p.type === 'year')?.value;

const dateCreatedString = `${day}/${month}/${year}`; // e.g. "10/07/2026"
const dateString = `${day}-${month}-${year}`;

console.log(`Querying by dateCreated: "${dateCreatedString}"`);

async function test() {
  const q1 = await db.collection("leads").where("dateCreated", "==", dateCreatedString).get();
  console.log(`dateCreated query found: ${q1.size} docs`);

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const q2 = await db.collection("leads").where("createdAt", ">=", threeDaysAgo.toISOString()).get();
  console.log(`createdAt ISO query found: ${q2.size} docs`);

  const q3 = await db.collection("leads").where("createdAt", ">=", admin.firestore.Timestamp.fromDate(threeDaysAgo)).get();
  console.log(`createdAt Timestamp query found: ${q3.size} docs`);

  const combined = new Map();
  q1.docs.forEach(doc => combined.set(doc.id, doc.data()));
  q2.docs.forEach(doc => combined.set(doc.id, doc.data()));
  q3.docs.forEach(doc => combined.set(doc.id, doc.data()));

  console.log(`Total combined unique docs: ${combined.size}`);

  const filtered = Array.from(combined.values()).filter(lead => {
    const source = (lead.source || lead.leadSource || lead.customerSource || "").toLowerCase();
    const isWebsite = source.includes("website");
    return isWebsite;
  });

  console.log(`Filtered Website Leads count: ${filtered.length}`);
  filtered.forEach(l => {
    console.log(`- ${l.companyName} (${l.customerSource || l.source})`);
  });
}

test().catch(console.error);
