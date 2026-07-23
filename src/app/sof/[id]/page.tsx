import { adminDb } from '@/services/firebase-server';
import { notFound } from 'next/navigation';
import SofClient from './sof-client';
import { decryptLeadId } from '@/lib/localmile-security';
import type { Lead } from '@/lib/types';

function checkHasAmpo(data: any): boolean {
  if (!data) return false;
  const services = Array.isArray(data.services) ? data.services : [];
  return services.some((s: any) => {
    const name = typeof s === 'string' ? s : (s?.name || s?.serviceName || '');
    const n = String(name).toLowerCase();
    return n.includes('ampo') || n.includes('pmpo') || n.includes('amstreet') || n.includes('mail processing') || n.includes('redirection');
  });
}

function checkHasPostalAddress(data: any): boolean {
  if (!data || !data.postalAddress) return false;
  const p = data.postalAddress;
  return !!(p.street || p.address1 || p.city || p.zip);
}

export default async function SofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let targetId = id;
  const decrypted = decryptLeadId(id);
  if (decrypted) {
    targetId = decrypted;
  }

  // Try leads collection first
  let docSnap = await adminDb.collection('leads').doc(targetId).get();
  
  // Fallback to companies collection
  if (!docSnap.exists) {
    docSnap = await adminDb.collection('companies').doc(targetId).get();
  }

  // If still not found, search by collectionGroup / query id
  if (!docSnap.exists) {
    const querySnap = await adminDb.collection('leads').where('id', '==', targetId).limit(1).get();
    if (!querySnap.empty) {
      docSnap = querySnap.docs[0];
    }
  }

  if (!docSnap.exists) {
    notFound();
  }

  const rawData = docSnap.data() || {};
  const leadData = JSON.parse(JSON.stringify({ id: docSnap.id, ...rawData })) as Lead;

  const hasAmpo = checkHasAmpo(leadData);
  const hasPostal = checkHasPostalAddress(leadData);
  const isValidSof = hasAmpo && hasPostal;

  let invalidReason = '';
  if (!hasAmpo && !hasPostal) {
    invalidReason = 'An active AMPO service and a registered Postal / PO Box address are required before a Standing Order Form can be generated or signed.';
  } else if (!hasAmpo) {
    invalidReason = 'An active AMPO service must be selected for this lead before a Standing Order Form can be generated or signed.';
  } else if (!hasPostal) {
    invalidReason = 'A registered Postal / PO Box address is required before a Standing Order Form can be generated or signed.';
  }

  return (
    <SofClient 
      token={id}
      lead={leadData}
      isValidSof={isValidSof}
      invalidReason={invalidReason}
    />
  );
}
