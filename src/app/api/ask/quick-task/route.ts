import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    let decoded;
    try {
      decoded = await getAuth(adminApp).verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const uid = decoded.uid;
    const body = await request.json();
    const { title, dueDate, leadId, companyName, notes } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    const author = userData.displayName || userData.name || userData.email || 'Ask Prospect+ Assistant';

    const now = new Date().toISOString();
    const dueIso = dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const taskRef = db.collection('tasks').doc();
    const newTask = {
      id: taskRef.id,
      title: title.trim(),
      dueDate: dueIso,
      isCompleted: false,
      createdAt: now,
      author,
      dialerAssigned: uid,
      ...(leadId && { leadId: String(leadId) }),
      ...(companyName && { companyName: String(companyName) }),
      ...(notes && { notes: String(notes) }),
      source: 'Ask Prospect+ AI'
    };

    await taskRef.set(newTask);

    // If leadId is present, also append to lead's tasks subcollection or activity
    if (leadId) {
      try {
        await db.collection('leads').doc(leadId).collection('tasks').doc(taskRef.id).set(newTask);
        await db.collection('leads').doc(leadId).collection('activity').add({
          type: 'Update',
          date: now,
          author,
          notes: `Created follow-up task via Ask Prospect+: "${title.trim()}" (Due: ${dueIso.slice(0, 10)})`,
          leadId
        });
      } catch (subErr) {
        console.warn('Could not sync task to lead subcollections:', subErr);
      }
    }

    return NextResponse.json({ success: true, task: newTask });
  } catch (err: any) {
    console.error('Error in POST /api/ask/quick-task:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create task' }, { status: 500 });
  }
}
