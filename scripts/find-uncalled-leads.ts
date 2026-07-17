import { firestore } from '../src/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

async function main() {
  console.log('Searching for leads where quote was sent in July 2026 and NetSuite API was not called...');
  
  try {
    const leadsRef = collection(firestore, 'leads');
    const snapshot = await getDocs(leadsRef);
    
    if (snapshot.empty) {
      console.log('No leads found.');
      return;
    }

    const matches: any[] = [];
    const startDate = new Date('2026-07-01T00:00:00Z');
    const endDate = new Date('2026-07-31T23:59:59Z');

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const status = data.customerStatus || data.status;
      
      if (status === 'Quote Sent') {
        const hasCommReg = !!data.commRegId;
        const hasScfUrl = !!data.dynamicScfUrl;
        
        if (!hasCommReg && !hasScfUrl) {
          const leadId = docSnapshot.id;
          let quoteDate: Date | null = null;
          let dateSource = 'none';

          // 1. Check quoteSentAt field
          if (data.quoteSentAt) {
            const d = new Date(data.quoteSentAt);
            if (!isNaN(d.getTime())) {
              quoteDate = d;
              dateSource = 'quoteSentAt';
            }
          }

          // 2. Check emails subcollection
          if (!quoteDate) {
            const emailsRef = collection(firestore, 'leads', leadId, 'emails');
            const emailSnap = await getDocs(emailsRef);
            for (const emailDoc of emailSnap.docs) {
              const emailData = emailDoc.data();
              if (emailData.subject && emailData.subject.toLowerCase().includes('quote')) {
                const sentAt = emailData.sentAt || emailData.date;
                if (sentAt) {
                  const d = new Date(sentAt);
                  if (!isNaN(d.getTime())) {
                    quoteDate = d;
                    dateSource = 'emails subcollection';
                    break;
                  }
                }
              }
            }
          }

          // 3. Check activity logs
          if (!quoteDate) {
            const activityRef = collection(firestore, 'leads', leadId, 'activity');
            const activitySnap = await getDocs(activityRef);
            for (const actDoc of activitySnap.docs) {
              const actData = actDoc.data();
              if (actData.notes && (actData.notes.includes('Quote Sent') || actData.notes.toLowerCase().includes('quote'))) {
                const actDate = actData.date;
                if (actDate) {
                  const d = new Date(actDate);
                  if (!isNaN(d.getTime())) {
                    quoteDate = d;
                    dateSource = 'activity log';
                    break;
                  }
                }
              }
            }
          }

          // Filter by July 2026
          if (quoteDate && quoteDate >= startDate && quoteDate <= endDate) {
            matches.push({
              id: leadId,
              companyName: data.companyName || 'Unknown Company',
              customerStatus: data.customerStatus,
              accountManager: data.accountManagerAssigned,
              bucket: data.bucket,
              quoteSentDate: quoteDate.toISOString(),
              dateSource
            });
          }
        }
      }
    }

    console.log('\n--- July 2026 Match Results ---');
    console.log(`Total Leads: ${matches.length}\n`);
    
    if (matches.length > 0) {
      console.log(JSON.stringify(matches, null, 2));
    } else {
      console.log('No leads matched the criteria.');
    }
    
  } catch (error) {
    console.error('Error running script:', error);
  }

  process.exit(0);
}

main().catch(console.error);
