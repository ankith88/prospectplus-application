
'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, writeBatch } from 'firebase/firestore';

export function CallNotificationListener() {
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const lastToastId = useRef<string | null>(null);

    useEffect(() => {
        if (!user?.uid) return;

        console.log("[Notification Listener] Starting subscription for user:", user.uid);

        // Simple query to avoid complex index requirements
        const notificationsRef = collection(firestore, 'users', user.uid, 'notifications');
        const q = query(
            notificationsRef, 
            where('isRead', '==', false),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) return;

            const batch = writeBatch(firestore);
            
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const id = change.doc.id;

                    // Prevent duplicate toasts for the same notification if it re-triggers
                    if (lastToastId.current === id) return;
                    lastToastId.current = id;

                    toast({
                        title: data.title || "AirCall Update",
                        description: data.message,
                        variant: data.type === 'call_sync' ? 'default' : 'secondary',
                    });

                    // Mark as read immediately
                    batch.update(change.doc.ref, { isRead: true });
                }
            });

            batch.commit().catch(err => console.error("[Notification Listener] Failed to mark read:", err));
        }, (error) => {
            // If index is missing, fallback to a simpler non-ordered query
            if (error.code === 'failed-precondition') {
                console.warn("[Notification Listener] Index missing, falling back to simple query.");
                const fallbackQ = query(notificationsRef, where('isRead', '==', false));
                return onSnapshot(fallbackQ, (fallbackSnap) => {
                    const batch = writeBatch(firestore);
                    fallbackSnap.docChanges().forEach(change => {
                        if (change.type === 'added') {
                            const data = change.doc.data();
                            toast({ title: data.title, description: data.message });
                            batch.update(change.doc.ref, { isRead: true });
                        }
                    });
                    batch.commit();
                });
            }
            console.error("[Notification Listener] Subscription error:", error);
        });

        return () => unsubscribe();
    }, [user?.uid, toast]);

    return null;
}
