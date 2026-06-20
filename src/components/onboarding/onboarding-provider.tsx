"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  
  const [steps, setSteps] = useState<any[]>([]);
  const [currentRouteKey, setCurrentRouteKey] = useState<OnboardingRouteKey | null>(null);
  const tourRef = useRef<any>(null);

  useEffect(() => {
    import('shepherd.js').then((ShepherdModule) => {
      import('shepherd.js/dist/css/shepherd.css');
    }).catch(e => console.error("Failed to load shepherd", e));
  }, []);

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
        const timer = setTimeout(() => startTour(), 1500);
        return () => clearTimeout(timer);
      }
    } else {
      setCurrentRouteKey(null);
      setSteps([]);
    }
  }, [pathname, userProfile, loading]);

  const startTour = useCallback(async () => {
    if (steps.length === 0) {
      toast({ description: "No walkthrough available for this page." });
      return;
    }

    try {
      const Shepherd = (await import('shepherd.js')).default;
      
      if (tourRef.current) {
        tourRef.current.cancel();
      }

      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          cancelIcon: {
            enabled: true
          },
          classes: 'shepherd-theme-custom',
          scrollTo: { behavior: 'smooth', block: 'center' }
        }
      });

      steps.forEach((step, index) => {
        const isLast = index === steps.length - 1;
        
        tour.addStep({
          id: step.id,
          attachTo: step.attachTo,
          title: step.title || '',
          text: step.text,
          buttons: [
            ...(index > 0 ? [{
              classes: 'shepherd-button-secondary',
              text: 'Back',
              action() { return tour.back(); }
            }] : []),
            {
              classes: 'shepherd-button-primary',
              text: isLast ? 'Finish' : 'Next',
              action() { 
                if (isLast) {
                  return tour.complete();
                }
                return tour.next(); 
              }
            }
          ]
        });
      });

      tour.on('complete', async () => {
        if (currentRouteKey) {
          await completeOnboardingState(currentRouteKey);
          toast({ title: "Walkthrough completed." });
        }
      });

      tour.on('cancel', () => {
        // Option to complete on cancel as well
        // if (currentRouteKey) {
        //   completeOnboardingState(currentRouteKey);
        // }
      });

      tourRef.current = tour;
      tour.start();
    } catch (err) {
      console.error("Error starting Shepherd tour", err);
    }
  }, [steps, currentRouteKey]);

  const stopTour = useCallback(() => {
    if (tourRef.current) {
      tourRef.current.cancel();
    }
  }, []);

  return (
    <OnboardingContext.Provider value={{ startTour, stopTour }}>
      {children}
      <style>{`
        .shepherd-theme-custom .shepherd-button-primary {
          background-color: #095c7b;
          color: #ffffff;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-family: 'Inter', sans-serif;
          border: none;
          cursor: pointer;
        }
        .shepherd-theme-custom .shepherd-button-primary:hover {
          background-color: #053647;
        }
        .shepherd-theme-custom .shepherd-button-secondary {
          background-color: transparent;
          color: #095c7b;
          border: 1px solid #095c7b;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-family: 'Inter', sans-serif;
          margin-right: 0.5rem;
          cursor: pointer;
        }
        .shepherd-theme-custom .shepherd-button-secondary:hover {
          background-color: #f3f4f6;
        }
        .shepherd-theme-custom .shepherd-text {
          font-family: 'Inter', sans-serif;
          color: #333333;
          font-size: 0.875rem;
        }
        .shepherd-theme-custom .shepherd-title {
          font-family: 'Inter', sans-serif;
          color: #111827;
          font-weight: 600;
        }
        .shepherd-theme-custom .shepherd-cancel-icon {
          color: #6b7280;
        }
      `}</style>
    </OnboardingContext.Provider>
  );
};
