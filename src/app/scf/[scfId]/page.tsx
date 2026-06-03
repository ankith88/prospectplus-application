import { adminDb } from '@/services/firebase-server';
import { notFound } from 'next/navigation';
import ScfClient from './scf-client';
import type { Lead, Contact, ScfRecord } from '@/lib/types';

export default async function ScfPage({ params }: { params: Promise<{ scfId: string }> }) {
  const { scfId } = await params;

  // Query collectionGroup for the SCF
  const scfDocs = await adminDb.collectionGroup('scfs').where('id', '==', scfId).limit(1).get();
  
  if (scfDocs.empty) {
    notFound();
  }

  const scfDoc = scfDocs.docs[0];
  const scfDataRaw = scfDoc.data();
  const scfData = JSON.parse(JSON.stringify(scfDataRaw)) as ScfRecord;
  const leadRef = scfDoc.ref.parent.parent;
  
  if (!leadRef) {
    notFound();
  }

  const leadSnap = await leadRef.get();
  if (!leadSnap.exists) {
    notFound();
  }
  
  const leadDataRaw = leadSnap.data();
  const leadData = JSON.parse(JSON.stringify({ id: leadSnap.id, ...leadDataRaw })) as Lead;

  let contactData = null;
  if (scfData.contactId) {
    const contactSnap = await leadRef.collection('contacts').doc(scfData.contactId).get();
    if (contactSnap.exists) {
      const contactDataRaw = contactSnap.data();
      contactData = JSON.parse(JSON.stringify({ id: contactSnap.id, ...contactDataRaw })) as Contact;
    }
  }

  return (
    <ScfClient 
      scf={scfData} 
      lead={leadData} 
      contact={contactData} 
    />
  );
}
