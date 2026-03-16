'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bell, Check, Trash2, Info, AlertTriangle, Phone, FileText, Send } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/services/firebase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    createdAt: string;
    isRead: boolean;
    callId?: string;
}

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (!user?.uid) return;

        const notificationsRef = collection(firestore, 'users', user.uid, 'notifications');
        const q = query(
            notificationsRef,
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notification));
            setNotifications(fetched);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const unreadCount = useMemo(() => 
        notifications.filter(n => !n.isRead).length
    , [notifications]);

    const handleMarkAsRead = async (id: string) => {
        if (!user?.uid) return;
        await markNotificationAsRead(user.uid, id);
    };

    const handleMarkAllAsRead = async () => {
        if (!user?.uid) return;
        await markAllNotificationsAsRead(user.uid);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'admin_broadcast': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case 'call_sync': return <Phone className="h-4 w-4 text-blue-500" />;
            case 'transcript_sync': return <FileText className="h-4 w-4 text-green-500" />;
            default: return <Info className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-sidebar-accent hover:text-sidebar-hover-foreground">
                    <Bell className="h-6 w-6" strokeWidth={2.5} />
                    {unreadCount > 0 && (
                        <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full border-2 border-background animate-in zoom-in"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 overflow-hidden" align="end">
                <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                    <h4 className="font-bold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs text-primary hover:text-primary/80"
                            onClick={handleMarkAllAsRead}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-80">
                    {notifications.length > 0 ? (
                        <div className="flex flex-col">
                            {notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    className={cn(
                                        "p-4 border-b last:border-0 transition-colors cursor-pointer hover:bg-muted/50 relative",
                                        !notif.isRead && "bg-primary/5"
                                    )}
                                    onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                                >
                                    {!notif.isRead && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />}
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 shrink-0">{getTypeIcon(notif.type)}</div>
                                        <div className="space-y-1 overflow-hidden">
                                            <p className="text-sm font-bold leading-tight truncate">{notif.title}</p>
                                            <p className="text-xs text-muted-foreground leading-normal whitespace-pre-wrap">{notif.message}</p>
                                            <p className="text-[10px] text-muted-foreground/70">
                                                {formatDistanceToNow(new Date(notif.createdAt))} ago
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                            <Info className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm italic">No recent notifications</p>
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t bg-muted/10">
                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" asChild>
                        <Link href="/calls">View Activity History</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
