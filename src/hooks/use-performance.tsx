"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface PerformanceContextType {
  loadTime: number | null;
  setLoadTime: (time: number | null) => void;
  pageName: string;
  setPageName: (name: string) => void;
  isCustom: boolean;
  setIsCustom: (isCustom: boolean) => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [pageName, setPageName] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const pathname = usePathname();

  // Reset when pathname changes so we don't carry over old page times
  useEffect(() => {
    setLoadTime(null);
    setPageName('');
    setIsCustom(false);
  }, [pathname]);

  return (
    <PerformanceContext.Provider value={{ loadTime, setLoadTime, pageName, setPageName, isCustom, setIsCustom }}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
}
