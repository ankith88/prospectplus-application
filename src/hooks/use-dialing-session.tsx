"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface DialingSessionContextType {
  isSessionActive: boolean;
  startTime: string | null;
  elapsedTime: number; // in seconds
  sessionLeadIds: string[];
  leadsVisited: string[];
  startSession: (leadIds: string[]) => Promise<void>;
  trackLeadVisit: (leadId: string) => Promise<void>;
  endSession: () => Promise<void>;
  removeLeadFromSession: (leadId: string) => void;
}

const DialingSessionContext = createContext<DialingSessionContextType>({
  isSessionActive: false,
  startTime: null,
  elapsedTime: 0,
  sessionLeadIds: [],
  leadsVisited: [],
  startSession: async () => {},
  trackLeadVisit: async () => {},
  endSession: async () => {},
  removeLeadFromSession: () => {},
});

export const useDialingSession = () => useContext(DialingSessionContext);

export const DialingSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionLeadIds, setSessionLeadIds] = useState<string[]>([]);
  const [leadsVisited, setLeadsVisited] = useState<string[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  // Interval ref for stopwatch
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state on mount/refresh from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedLeads = localStorage.getItem('dialingSessionLeads');
    const storedStartTime = localStorage.getItem('dialingSessionStartTime');
    const storedVisited = localStorage.getItem('dialingSessionVisitedLeads');
    const storedSessionId = localStorage.getItem('dialingSessionId');

    if (storedLeads && storedStartTime && storedSessionId) {
      setIsSessionActive(true);
      setStartTime(storedStartTime);
      setSessionLeadIds(JSON.parse(storedLeads));
      setLeadsVisited(storedVisited ? JSON.parse(storedVisited) : []);
      sessionIdRef.current = storedSessionId;

      // Calculate elapsed time
      const startMs = new Date(storedStartTime).getTime();
      const nowMs = Date.now();
      setElapsedTime(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
    }
  }, []);

  // Stopwatch ticking logic
  useEffect(() => {
    if (isSessionActive && startTime) {
      timerRef.current = setInterval(() => {
        const startMs = new Date(startTime).getTime();
        const nowMs = Date.now();
        setElapsedTime(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isSessionActive, startTime]);

  const startSession = useCallback(async (leadIds: string[]) => {
    if (leadIds.length === 0) return;

    try {
      const generatedSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const nowIso = new Date().toISOString();

      localStorage.setItem('dialingSessionLeads', JSON.stringify(leadIds));
      localStorage.setItem('dialingSessionStartTime', nowIso);
      localStorage.setItem('dialingSessionId', generatedSessionId);
      localStorage.setItem('dialingSessionVisitedLeads', JSON.stringify([]));

      setIsSessionActive(true);
      setStartTime(nowIso);
      setSessionLeadIds(leadIds);
      setLeadsVisited([]);
      setElapsedTime(0);
      sessionIdRef.current = generatedSessionId;

      // Log session start to Firestore
      if (user) {
        const sessionDocRef = doc(firestore, 'dialingSessions', generatedSessionId);
        await setDoc(sessionDocRef, {
          userId: user.uid,
          userDisplayName: userProfile?.displayName || user.email || 'Unknown Dialer',
          startTime: serverTimestamp(),
          endTime: null,
          duration: 0,
          totalLeadsCount: leadIds.length,
          leadsVisited: [],
          leadsVisitedCount: 0,
          status: 'active'
        });
      }
    } catch (error) {
      console.error('Error starting dialing session:', error);
      toast({ variant: 'destructive', title: 'Session Error', description: 'Failed to record session start.' });
    }
  }, [user, userProfile, toast]);

  const trackLeadVisit = useCallback(async (leadId: string) => {
    if (!isSessionActive || !sessionIdRef.current) return;

    setLeadsVisited((prev) => {
      if (prev.includes(leadId)) return prev;
      const updated = [...prev, leadId];
      localStorage.setItem('dialingSessionVisitedLeads', JSON.stringify(updated));

      // Async update in Firestore
      if (user) {
        const sessionDocRef = doc(firestore, 'dialingSessions', sessionIdRef.current!);
        updateDoc(sessionDocRef, {
          leadsVisited: updated,
          leadsVisitedCount: updated.length
        }).catch((err) => console.error('Error updating visited leads:', err));
      }

      return updated;
    });
  }, [isSessionActive, user]);

  const endSession = useCallback(async () => {
    const finalSessionId = sessionIdRef.current;
    
    // Clear local storage & state
    localStorage.removeItem('dialingSessionLeads');
    localStorage.removeItem('dialingSessionStartTime');
    localStorage.removeItem('dialingSessionId');
    localStorage.removeItem('dialingSessionVisitedLeads');

    setIsSessionActive(false);
    setStartTime(null);
    setElapsedTime(0);
    setSessionLeadIds([]);
    setLeadsVisited([]);
    sessionIdRef.current = null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!finalSessionId) return;

    try {
      if (user) {
        const sessionDocRef = doc(firestore, 'dialingSessions', finalSessionId);
        await updateDoc(sessionDocRef, {
          endTime: serverTimestamp(),
          duration: elapsedTime,
          status: 'completed'
        });
      }
      toast({ title: 'Dialing Session Ended', description: 'Your session metrics have been recorded.' });
    } catch (error) {
      console.error('Error ending dialing session:', error);
    }
  }, [user, elapsedTime, toast]);

  const removeLeadFromSession = useCallback((leadId: string) => {
    setSessionLeadIds((prev) => {
      const updated = prev.filter(id => id !== leadId);
      localStorage.setItem('dialingSessionLeads', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <DialingSessionContext.Provider
      value={{
        isSessionActive,
        startTime,
        elapsedTime,
        sessionLeadIds,
        leadsVisited,
        startSession,
        trackLeadVisit,
        endSession,
        removeLeadFromSession,
      }}
    >
      {children}
    </DialingSessionContext.Provider>
  );
};
