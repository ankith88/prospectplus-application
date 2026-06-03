import { adminDb } from '@/services/firebase-server';
import { notFound } from 'next/navigation';
import ScfClient from './scf-client';
import type { Lead, Contact, ScfRecord } from '@/lib/types';

export default async function ScfPage({ params }: { params: { scfId: string } }) {
  const scfId = params.scfId;

  // Query collectionGroup for the SCF
  const scfDocs = await adminDb.collectionGroup('scfs').where('id', '==', scfId).limit(1).get();
  
  if (scfDocs.empty) {
    notFound();
  }

  const scfDoc = scfDocs.docs[0];
  const scfData = scfDoc.data() as ScfRecord;
  const leadRef = scfDoc.ref.parent.parent;
  
  if (!leadRef) {
    notFound();
  }

  const leadSnap = await leadRef.get();
  if (!leadSnap.exists) {
    notFound();
  }
  
  const leadData = { id: leadSnap.id, ...leadSnap.data() } as Lead;

  let contactData = null;
  if (scfData.contactId) {
    const contactSnap = await leadRef.collection('contacts').doc(scfData.contactId).get();
    if (contactSnap.exists) {
      contactData = { id: contactSnap.id, ...contactSnap.data() } as Contact;
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
