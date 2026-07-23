import React from 'react';
import { adminDb } from '@/services/firebase-server';
import { decryptLeadId } from '@/lib/localmile-security';
import LpoOpportunityClient from '../lpo-opportunity-client';
import type { Lead, Contact } from '@/lib/types';
import { ShieldAlert } from 'lucide-react';

export const revalidate = 0; // Dynamic server page

function serializeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  // Handle Firestore Timestamp
  if (typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map(serializeFirestoreData);
  }

  // Handle Object
  const res: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    res[key] = serializeFirestoreData(obj[key]);
  }
  return res;
}

export default async function LpoOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: token } = await params;

  if (!token) {
    return <NotFoundCard message="Invalid or missing opportunity link." />;
  }

  const targetId = decryptLeadId(token) || token;

  // Query leads collection first, fallback to companies
  let docSnap = await adminDb.collection('leads').doc(targetId).get();

  if (!docSnap.exists) {
    docSnap = await adminDb.collection('companies').doc(targetId).get();
  }

  if (!docSnap.exists) {
    const qLeads = await adminDb.collection('leads').where('id', '==', targetId).limit(1).get();
    if (!qLeads.empty) {
      docSnap = qLeads.docs[0];
    } else {
      const qComp = await adminDb.collection('companies').where('id', '==', targetId).limit(1).get();
      if (!qComp.empty) {
        docSnap = qComp.docs[0];
      }
    }
  }

  if (!docSnap.exists) {
    return <NotFoundCard message="The requested LPO Opportunity could not be found or may have been removed." />;
  }

  const rawData = docSnap.data() || {};
  
  // 1. Fetch contacts subcollection & merge with array / top-level fields
  const contactsMap = new Map<string, any>();

  // Main doc array contacts
  if (Array.isArray(rawData.contacts)) {
    rawData.contacts.forEach((c: any, idx: number) => {
      if (c && typeof c === 'object') {
        const idKey = c.id || `doc-c-${idx}`;
        contactsMap.set(idKey, { id: idKey, ...c });
      }
    });
  }

  // Fetch contacts subcollection and notes subcollection in parallel
  const [contactsSubSnap, notesSubSnap] = await Promise.all([
    docSnap.ref.collection('contacts').get().catch(() => null),
    docSnap.ref.collection('notes').get().catch(() => null),
  ]);

  if (contactsSubSnap && !contactsSubSnap.empty) {
    contactsSubSnap.forEach((doc) => {
      const data = doc.data();
      contactsMap.set(doc.id, {
        id: doc.id,
        name: data.name || data.contactName || [data.firstName, data.lastName].filter(Boolean).join(' ') || '',
        title: data.title || data.contactTitle || data.role || '',
        email: data.email || '',
        phone: data.phone || data.mobile || data.customerPhone || '',
        isPrimary: !!data.isPrimary,
        isAccountsPayable: !!data.isAccountsPayable,
      });
    });
  }

  // If no contacts in array or subcollection, check top-level lead contact fields
  if (contactsMap.size === 0) {
    const primaryName = rawData.contactName || rawData.personSpokenWithName || rawData.decisionMakerName;
    const primaryEmail = rawData.email || rawData.personSpokenWithEmail || rawData.decisionMakerEmail;
    const primaryPhone = rawData.phone || rawData.mobile || rawData.customerPhone || rawData.personSpokenWithPhone || rawData.decisionMakerPhone;
    const primaryTitle = rawData.contactTitle || rawData.personSpokenWithTitle || rawData.decisionMakerTitle;

    if (primaryName || primaryEmail || primaryPhone) {
      contactsMap.set('top-level-primary', {
        id: 'top-level-primary',
        name: primaryName || 'Primary Contact',
        title: primaryTitle || 'Key Contact',
        email: primaryEmail || '',
        phone: primaryPhone || '',
        isPrimary: true,
      });
    }
  }

  const allContactsList = Array.from(contactsMap.values());

  // 2. Fetch notes (notes field + notes subcollection ONLY)
  const notesMap = new Map<string, any>();

  if (Array.isArray(rawData.notes)) {
    rawData.notes.forEach((n: any, idx: number) => {
      if (typeof n === 'string' && n.trim()) {
        notesMap.set(`doc-note-${idx}`, {
          id: `doc-note-${idx}`,
          content: n.trim(),
          author: 'Note',
          date: rawData.createdAt || new Date().toISOString(),
        });
      } else if (n && typeof n === 'object' && (n.content || n.notes)) {
        const key = n.id || `doc-note-${idx}`;
        notesMap.set(key, {
          id: key,
          content: n.content || n.notes,
          author: n.author || n.createdBy || 'Note',
          date: n.date || n.createdAt || new Date().toISOString(),
        });
      }
    });
  } else if (typeof rawData.notes === 'string' && rawData.notes.trim()) {
    notesMap.set('doc-notes-str', {
      id: 'doc-notes-str',
      content: rawData.notes.trim(),
      author: 'Note',
      date: rawData.createdAt || new Date().toISOString(),
    });
  }

  if (notesSubSnap && !notesSubSnap.empty) {
    notesSubSnap.forEach((doc) => {
      const d = doc.data();
      const content = d.content || d.notes || d.text;
      if (content) {
        notesMap.set(doc.id, {
          id: doc.id,
          content,
          author: d.author || d.createdBy || d.createdByName || 'Note',
          date: d.date || d.createdAt || d.timestamp || new Date().toISOString(),
        });
      }
    });
  }

  // Sort notes descending by date (newest first)
  const allNotesList = Array.from(notesMap.values());
  allNotesList.sort((a, b) => {
    const tA = a.date ? new Date(a.date).getTime() : 0;
    const tB = b.date ? new Date(b.date).getTime() : 0;
    return tB - tA;
  });

  const serialized = serializeFirestoreData(rawData);
  serialized.contacts = serializeFirestoreData(allContactsList);
  serialized.notes = serializeFirestoreData(allNotesList);

  const leadData: Lead = {
    ...serialized,
    id: docSnap.id,
    prospectPlusId: serialized.prospectPlusId || serialized.lpoProspectPlusId || `LPO-${docSnap.id.substring(0, 8).toUpperCase()}`,
  };

  return <LpoOpportunityClient token={token} initialLead={leadData} />;
}

function NotFoundCard({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#f4f7f8] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-md p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-[#095c7b] p-4 rounded-xl shadow-sm">
            <img
              src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD"
              alt="MailPlus Logo"
              className="h-10 w-auto"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Opportunity Not Found</h1>
          <p className="text-slate-600 text-sm">{message}</p>
        </div>
        <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 font-medium">
          MailPlus Business Logistics Portal
        </div>
      </div>
    </div>
  );
}
