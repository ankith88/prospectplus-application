"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getAllUserTasks } from '@/services/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import TasksClientPage from '@/components/tasks-client';
import type { Task } from '@/lib/types';

type UserTask = Task & { leadId: string; leadName: string };

export default function TasksPage() {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const userName = userProfile?.displayName || user?.displayName || '';

  const fetchTasks = useCallback(async (name: string) => {
    if (!name) return;
    setLoading(true);
    try {
      const userTasks = await getAllUserTasks(name);
      setTasks(userTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch your tasks.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (userName) {
      fetchTasks(userName);
    } else if (!authLoading && !userName) {
      setLoading(false);
    }
  }, [userName, authLoading, fetchTasks]);

  if (authLoading || (loading && tasks.length === 0)) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center flex-col gap-3">
        <Loader />
        <p className="text-sm text-muted-foreground animate-pulse">Loading your tasks & reminders...</p>
      </div>
    );
  }

  return <TasksClientPage initialTasks={tasks} />;
}
