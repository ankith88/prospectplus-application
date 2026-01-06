
'use client';

import { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { FullScreenLoader } from '@/components/ui/loader';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');

  const setLoading = useCallback((loading: boolean, message = 'Loading...') => {
    setIsLoading(loading);
    setLoadingMessage(message);
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, setLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

export function GlobalLoader() {
    const { isLoading, loadingMessage } = useLoading();
    
    if (!isLoading) {
        return null;
    }

    return <FullScreenLoader message={loadingMessage} />;
}

    