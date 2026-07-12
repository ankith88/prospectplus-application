const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

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

const dateString = `${day}-${month}-${year}`;

const [d, m, y] = dateString.split("-").map(Number);
const targetStart = new Date(y, m - 1, d, 0, 0, 0, 0);
const targetEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

const threeDaysAgo = new Date();
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

async function runLeadsReport() {
  console.log(`\n--- Running Daily Website Leads Report for ${dateString} ---`);
  
  const snapshot = await db.collection("leads")
    .where("createdAt", ">=", threeDaysAgo.toISOString())
    .get();

  const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const snapshotTS = await db.collection("leads")
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(threeDaysAgo))
    .get();

  const leadsTS = snapshotTS.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const allLeadsMap = new Map();
  leads.forEach(l => allLeadsMap.set(l.id, l));
  leadsTS.forEach(l => allLeadsMap.set(l.id, l));
  const allLeads = Array.from(allLeadsMap.values());

  const filteredLeads = allLeads.filter(lead => {
    const source = (lead.source || lead.leadSource || "").toLowerCase();
    if (!source.includes("website")) return false;

    if (lead.createdAt) {
      let createdDate;
      if (typeof lead.createdAt.toDate === "function") {
        createdDate = lead.createdAt.toDate();
      } else {
        createdDate = new Date(lead.createdAt);
      }
      if (createdDate >= targetStart && createdDate <= targetEnd) {
        return true;
      }
    }

    if (lead.dateLeadEntered) {
      const [ld, lm, ly] = lead.dateLeadEntered.split("/");
      if (ld && lm && ly) {
        const enteredDate = new Date(Number(ly), Number(lm) - 1, Number(ld));
        if (enteredDate.getDate() === d && (enteredDate.getMonth() + 1) === m && enteredDate.getFullYear() === y) {
          return true;
        }
      }
    }

    return false;
  });

  console.log(`Found ${filteredLeads.length} website leads.`);
  filteredLeads.forEach(l => {
    console.log(` - Company: ${l.companyName}, Email: ${l.email}, Created: ${l.createdAt}`);
  });
}

async function runTicketsReport() {
  console.log(`\n--- Running Daily Tickets by Source Report for ${dateString} ---`);

  const snapshot = await db.collection("tickets")
    .where("createdAt", ">=", threeDaysAgo.toISOString())
    .get();

  const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const snapshotTS = await db.collection("tickets")
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(threeDaysAgo))
    .get();

  const ticketsTS = snapshotTS.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const allTicketsMap = new Map();
  tickets.forEach(t => allTicketsMap.set(t.id, t));
  ticketsTS.forEach(t => allTicketsMap.set(t.id, t));
  const allTickets = Array.from(allTicketsMap.values());

  const filteredTickets = allTickets.filter(t => {
    if (t.createdAt) {
      let createdDate;
      if (typeof t.createdAt.toDate === "function") {
        createdDate = t.createdAt.toDate();
      } else {
        createdDate = new Date(t.createdAt);
      }
      return createdDate >= targetStart && createdDate <= targetEnd;
    }
    return false;
  });

  const sourceCounts = {};
  filteredTickets.forEach(t => {
    let source = t.source || "Unknown";
    source = source.trim();
    if (source) {
      source = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
    } else {
      source = "Unknown";
    }
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  console.log(`Total tickets created yesterday: ${filteredTickets.length}`);
  Object.entries(sourceCounts).forEach(([src, count]) => {
    console.log(` - Source: ${src}: ${count} tickets`);
  });
}

async function main() {
  await runLeadsReport();
  await runTicketsReport();
}

main().catch(console.error);
