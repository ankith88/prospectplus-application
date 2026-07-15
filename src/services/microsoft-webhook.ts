import fetch from 'node-fetch';
import { getValidAccessToken } from './microsoft-graph';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function subscribeToUserMailbox(userId: string): Promise<string> {
  const accessToken = await getValidAccessToken(userId);
  
  // Use public App URL or fallback
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'mailplus-website-y2ofq.web.app';
  const notificationUrl = `https://${appUrl}/api/integrations/microsoft/webhook`;
  
  // Set expiration to 4230 minutes (Microsoft maximum limit)
  const expirationDateTime = new Date(Date.now() + 4200 * 60 * 1000).toISOString();

  const subscriptionPayload = {
    changeType: 'created',
    notificationUrl,
    resource: 'me/messages',
    expirationDateTime,
    clientState: `user-mailbox-sync-${userId}`
  };

  const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscriptionPayload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create MS Graph subscription: ${errText}`);
  }

  const data: any = await response.json();
  const subscriptionId = data.id;

  // Save subscription state to user profile
  await db.collection('users').doc(userId).update({
    microsoftMailSubscriptionId: subscriptionId,
    microsoftMailSubscriptionExpiration: expirationDateTime
  });

  return subscriptionId;
}

export async function renewUserMailboxSubscription(userId: string, subscriptionId: string): Promise<void> {
  const accessToken = await getValidAccessToken(userId);
  const expirationDateTime = new Date(Date.now() + 4200 * 60 * 1000).toISOString();

  const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      expirationDateTime
    })
  });

  if (!response.ok) {
    // If subscription expired/deleted, re-create it
    await subscribeToUserMailbox(userId);
    return;
  }

  await db.collection('users').doc(userId).update({
    microsoftMailSubscriptionExpiration: expirationDateTime
  });
}
