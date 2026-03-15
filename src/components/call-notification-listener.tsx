
'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, writeBatch } from 'firebase/firestore';

/**
 * Real-time listener that displays a pop-up toast when the AirCall webhook 
 * successfully processes a call or transcript.
 */
export function CallNotificationListener() {
    const { user } = useAuth();
    const { toast } = useToast();
    const lastToastId = useRef<string | null>(null);

    useEffect(() => {
        if (!user?.uid) return;

        console.log("[Notification Listener] Subscribing to user notifications:", user.uid);

        const notificationsRef = collection(firestore, 'users', user.uid, 'notifications');
        
        // Simple query to avoid complex index requirements during build/deployment
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

                    // Prevent duplicate toasts for the same notification record
                    if (lastToastId.current === id) return;
                    lastToastId.current = id;

                    toast({
                        title: data.title || "Call Update",
                        description: data.message,
                        variant: data.type === 'call_sync' ? 'default' : 'secondary',
                    });

                    // Mark as read immediately so it doesn't trigger again
                    batch.update(change.doc.ref, { isRead: true });
                }
            });

            batch.commit().catch(err => console.error("[Notification Listener] Failed to mark read:", err));
        }, (error) => {
            // Log missing index errors specifically so user knows to create them
            if (error.code === 'failed-precondition') {
                console.warn("[Notification Listener] Firestore index required. Visit console to enable.");
            } else {
                console.error("[Notification Listener] Subscription error:", error);
            }
        });

        return () => unsubscribe();
    }, [user?.uid, toast]);

    return null;
}
