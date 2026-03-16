
'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

/**
 * Real-time listener that displays a pop-up toast when a new notification is added.
 * Optimized to only toast notifications created within the current user session.
 */
export function CallNotificationListener() {
    const { user } = useAuth();
    const { toast } = useToast();
    const lastToastId = useRef<string | null>(null);
    const sessionStartTime = useRef<string>(new Date().toISOString());

    useEffect(() => {
        if (!user?.uid) return;

        console.log("[Notification Listener] Subscribing to user notifications:", user.uid);

        const notificationsRef = collection(firestore, 'users', user.uid, 'notifications');
        
        // Listen for any unread notifications
        const q = query(
            notificationsRef, 
            where('isRead', '==', false),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) return;

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const id = change.doc.id;

                    // Only trigger a toast if:
                    // 1. We haven't toasted this ID already in this session
                    // 2. The notification was created AFTER the user loaded the app (session started)
                    if (lastToastId.current === id || data.createdAt <= sessionStartTime.current) {
                        return;
                    }

                    lastToastId.current = id;

                    toast({
                        title: data.title || "New Alert",
                        description: data.message,
                        variant: data.type === 'admin_broadcast' ? 'default' : 'secondary',
                    });
                }
            });
        }, (error) => {
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
