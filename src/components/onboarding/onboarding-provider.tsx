"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Joyride, EventData, STATUS, Step } from 'react-joyride';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { onboardingScripts, OnboardingRouteKey } from '@/lib/onboarding-scripts';
import { useToast } from '@/hooks/use-toast';

interface OnboardingContextType {
  startTour: () => void;
  stopTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextType>({
  startTour: () => {},
  stopTour: () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { userProfile, completeOnboardingState, loading } = useAuth();
  const { toast } = useToast();
  
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentRouteKey, setCurrentRouteKey] = useState<OnboardingRouteKey | null>(null);

  // Check if there are scripts for the current route and load them
  useEffect(() => {
    if (loading || !userProfile) return;

    let routeKey = Object.keys(onboardingScripts).find((key) => pathname === key) as OnboardingRouteKey | undefined;
    
    // Check dynamic routes
    if (!routeKey && pathname === '/leads/new') {
      routeKey = '/leads/new' as OnboardingRouteKey;
    }
    if (!routeKey && pathname.startsWith('/leads/') && pathname !== '/leads/suppressions' && pathname !== '/leads/new') {
      routeKey = '/lead-profile' as OnboardingRouteKey;
    }
    if (!routeKey && pathname.startsWith('/companies/')) {
      routeKey = '/company-profile' as OnboardingRouteKey;
    }
    if (!routeKey && pathname.startsWith('/capture-visit')) {
      routeKey = '/capture-visit' as OnboardingRouteKey;
    }

    if (routeKey) {
      setCurrentRouteKey(routeKey);
      setSteps(onboardingScripts[routeKey]);

      // Check if user has completed this specific route
      const hasCompleted = userProfile.userOnboardingStates?.[routeKey];
      
      // Auto-start if not completed
      if (!hasCompleted) {
        // Small delay to allow initial DOM rendering
        const timer = setTimeout(() => setRun(true), 1000);
        return () => clearTimeout(timer);
      }
    } else {
      setRun(false);
      setCurrentRouteKey(null);
      setSteps([]);
    }
  }, [pathname, userProfile, loading]);

  const startTour = useCallback(() => {
    if (steps.length > 0) {
      setRun(true);
    } else {
      toast({ description: "No walkthrough available for this page." });
    }
  }, [steps]);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const handleJoyrideCallback = async (data: EventData) => {
    const { status, type, error } = data;

    // Handle missing target error (dynamic layout anomaly)
    if (type === 'error:target_not_found') {
      toast({
        variant: 'destructive',
        title: 'Interface Layout Anomaly Detected',
        description: 'A walkthrough target could not be found. Please report this to Ankith Ravindran for immediate administrative intervention.',
      });
      setRun(false);
    }

    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      if (currentRouteKey) {
        await completeOnboardingState(currentRouteKey);
        toast({ title: "Walkthrough completed." });
      }
    }
  };

  return (
    <OnboardingContext.Provider value={{ startTour, stopTour }}>
      {children}
      <Joyride
        onEvent={handleJoyrideCallback}
        continuous
        run={run}
        scrollToFirstStep
        steps={steps}
        options={{
          arrowColor: '#ffffff',
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.65)',
          primaryColor: '#eaf143',
          textColor: '#333333',
          zIndex: 10000,
          showProgress: true,
          buttons: ['back', 'primary', 'skip'],
        }}
        styles={{
          tooltipContainer: {
            textAlign: 'left',
          },
          buttonPrimary: {
            backgroundColor: '#095c7b', // Professional Blue
            color: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            borderRadius: '0.375rem', // rounded-md
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', // shadow-md
          },
          buttonBack: {
            color: '#095c7b',
            fontFamily: 'Inter, sans-serif',
          },
          buttonSkip: {
            color: '#666666',
            fontFamily: 'Inter, sans-serif',
          },
          tooltip: {
            fontFamily: 'Inter, sans-serif',
            borderRadius: '0.375rem', // rounded-md
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // shadow-md
          }
        }}
      />
    </OnboardingContext.Provider>
  );
};
