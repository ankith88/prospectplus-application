import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { AskChatSession } from '@/lib/ask/query-spec';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

async function authenticate(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.substring(7);
  try {
    const decoded = await getAuth(adminApp).verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const uid = await authenticate(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (chatId) {
      const doc = await db.collection('users').doc(uid).collection('ask_chats').doc(chatId).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }
      return NextResponse.json({ id: doc.id, ...doc.data() });
    }

    // List all chats for user, sorted by updatedAt desc
    const snap = await db.collection('users').doc(uid).collection('ask_chats')
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get();

    const chats = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title || 'Untitled Chat',
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
        messageCount: Array.isArray(d.messages) ? d.messages.length : (d.messageCount || 0),
        lastMessageSnippet: d.lastMessageSnippet || ''
      };
    });

    return NextResponse.json({ chats });
  } catch (err: any) {
    console.error('Error in GET /api/ask/chats:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch chats' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await authenticate(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, messages } = body;

    const chatId = id || db.collection('users').doc(uid).collection('ask_chats').doc().id;
    const now = new Date().toISOString();

    const cleanMessages = Array.isArray(messages) ? messages : [];
    const lastMsg = cleanMessages[cleanMessages.length - 1];
    const lastSnippet = lastMsg?.text || lastMsg?.result?.humanSummary || '';

    const chatDoc: AskChatSession = {
      id: chatId,
      userId: uid,
      title: title || (lastMsg?.text ? (lastMsg.text.slice(0, 32) + (lastMsg.text.length > 32 ? '...' : '')) : 'New Conversation'),
      createdAt: body.createdAt || now,
      updatedAt: now,
      messageCount: cleanMessages.length,
      lastMessageSnippet: lastSnippet,
      messages: cleanMessages
    };

    await db.collection('users').doc(uid).collection('ask_chats').doc(chatId).set(chatDoc, { merge: true });

    return NextResponse.json({ success: true, chat: chatDoc });
  } catch (err: any) {
    console.error('Error in POST /api/ask/chats:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save chat' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const uid = await authenticate(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title } = body;

    if (!id || !title) {
      return NextResponse.json({ error: 'Missing chatId or title' }, { status: 400 });
    }

    await db.collection('users').doc(uid).collection('ask_chats').doc(id).update({
      title: String(title).trim(),
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in PATCH /api/ask/chats:', err);
    return NextResponse.json({ error: err?.message || 'Failed to rename chat' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const uid = await authenticate(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'Missing chatId query parameter' }, { status: 400 });
    }

    await db.collection('users').doc(uid).collection('ask_chats').doc(chatId).delete();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in DELETE /api/ask/chats:', err);
    return NextResponse.json({ error: err?.message || 'Failed to delete chat' }, { status: 500 });
  }
}
