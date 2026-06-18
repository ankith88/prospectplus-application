'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { logDailyArea } from '@/services/firebase';
import { sendDeploymentToNetSuite } from '@/services/netsuite-deployment-proxy';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import { MapPin, Navigation, Clock, Activity } from 'lucide-react';
import { useDynamicRouting } from '@/hooks/useDynamicRouting';
import { locationService } from '@/services/LocationService';

interface DailyAreaLogDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyAreaLogDialog({ isOpen, onOpenChange }: DailyAreaLogDialogProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const { routedLeads, loading: routingLoading } = useDynamicRouting(userProfile?.uid || '');

  const handleSkip = () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
    localStorage.setItem('deployment_skipped_date', today);
    onOpenChange(false);
    toast({ title: 'Planning Mode', description: 'Route planning mode active. Start tracking when you begin field operations.' });
  };

  const onStartRoute = async () => {
    if (!userProfile) return;
    setIsSubmitting(true);
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
      const deploymentData = {
        userId: userProfile.uid,
        userName: userProfile.displayName || 'Unknown',
        date: today,
        area: 'Dynamic Route',
        startTime: new Date().toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false }),
      };

      // 1. Log to Firebase
      await logDailyArea(deploymentData);

      // 2. Sync with NetSuite API
      const syncResult = await sendDeploymentToNetSuite({
          ...deploymentData,
          displayName: userProfile.displayName || 'Unknown',
          email: userProfile.email || '',
      });

      localStorage.removeItem('deployment_skipped_date');

      // 3. Start Geofencing Tracking
      const trackingTargets = routedLeads
        .filter(lead => lead.latitude && lead.longitude)
        .map(lead => ({
          id: lead.id,
          lat: lead.latitude!,
          lng: lead.longitude!,
          radius: lead.geofenceRadius || 50
        }));

      locationService.startBackgroundTracking(userProfile.uid, trackingTargets);
      setIsTracking(true);

      if (syncResult.success) {
          toast({ title: 'Route Started', description: 'Background GPS tracking initiated. Have a successful day!' });
      } else {
          toast({ 
            variant: 'destructive', 
            title: 'Partial Success', 
            description: `Route started locally, but NetSuite sync failed: ${syncResult.message}` 
          });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Deployment log error:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to start dynamic route.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup tracking if unmounted while tracking (optional, might want to keep running in background PWA)
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent id="step-daily-area-log-dialog" className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Dynamic Route Dashboard
          </DialogTitle>
          <DialogDescription>
            Your route has been dynamically prioritized based on account urgency, traffic, and recent signals.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" /> 
            Prioritized Field Targets
          </h4>
          
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {routingLoading ? (
               <div className="flex justify-center p-4"><Loader /></div>
            ) : routedLeads.length === 0 ? (
               <p className="text-sm text-muted-foreground text-center py-4">No high-priority leads found for your route.</p>
            ) : (
              routedLeads.slice(0, 5).map((lead, index) => (
                <div key={lead.id} className="flex justify-between items-center p-3 bg-secondary/20 rounded-md border text-sm">
                  <div className="flex gap-3 items-center">
                    <div className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{lead.companyName}</p>
                      <p className="text-muted-foreground text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {lead.address?.city || 'Unknown Location'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-accent text-accent-foreground">
                       Score: {lead.totalScore || lead.aiScore || 0}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">Status: {lead.status}</p>
                  </div>
                </div>
              ))
            )}
            
            {routedLeads.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                + {routedLeads.length - 5} more targets queued
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={handleSkip} disabled={isSubmitting}>
            Plan Route Only
          </Button>
          <Button type="button" onClick={onStartRoute} disabled={isSubmitting || routingLoading}>
            {isSubmitting ? <Loader /> : 'Start Field Tracking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

