
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import type { Address } from '@/lib/types';
import { createNewLead, checkForDuplicateLead } from '@/services/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { PlusCircle, Camera } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { analyzeBusinessCard } from '@/ai/flows/analyze-business-card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface QuickAddLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const parseAddressComponents = (components: google.maps.GeocoderAddressComponent[]): Address => {
    const address: Partial<Address> = { country: 'Australia' };
    const get = (type: string, useShortName = false) => {
        const comp = components.find(c => c.types.includes(type));
        return useShortName ? comp?.short_name : comp?.long_name;
    };

    const streetNumber = get('street_number');
    const route = get('route');
    
    address.street = `${streetNumber || ''} ${route || ''}`.trim();
    address.city = get('locality') || get('postal_town');
    address.state = get('administrative_area_level_1', true);
    address.zip = get('postal_code');

    return address as Address;
};


export function QuickAddLeadDialog({ isOpen, onOpenChange }: QuickAddLeadDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const router = useRouter();

  const [showCamera, setShowCamera] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const setupAutocomplete = useCallback(() => {
    if (!window.google || !autocompleteInputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
        types: ['establishment'],
        componentRestrictions: { country: 'au' },
    });
    
    autocomplete.setFields(['name', 'formatted_address', 'address_components', 'website', 'formatted_phone_number', 'geometry', 'place_id']);

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.address_components) {
            setSelectedPlace(place);
        }
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
        // We need a slight delay to ensure the input is rendered before setting up autocomplete
        setTimeout(setupAutocomplete, 100);
    } else {
        setSelectedPlace(null);
        if (autocompleteInputRef.current) {
            autocompleteInputRef.current.value = '';
        }
    }
  }, [isOpen, setupAutocomplete]);

  useEffect(() => {
    if (!showCamera) {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      return;
    }

    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setShowCamera(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };

    getCameraPermission();
    
    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
    };
  }, [showCamera, toast]);


  const handleCaptureAndAnalyze = () => {
    if (!videoRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const context = canvas.getContext('2d');
    context?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const imageDataUri = canvas.toDataURL('image/jpeg');
    
    if (videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
    
    setIsAnalyzing(true);
    analyzeBusinessCard({ imageDataUri })
      .then(result => {
        if (result.companyName) {
          if (autocompleteInputRef.current) {
            autocompleteInputRef.current.value = result.companyName;
            const event = new Event('input', { bubbles: true });
            autocompleteInputRef.current.dispatchEvent(event);
          }
        } else {
          toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Could not find a company name on the card.' });
        }
      })
      .catch(err => {
        console.error("Analysis failed:", err);
        toast({ variant: 'destructive', title: 'Analysis Error', description: 'Could not analyze the business card.' });
      })
      .finally(() => setIsAnalyzing(false));
  };


  const handleSubmit = async () => {
    if (!selectedPlace) {
        toast({ variant: 'destructive', title: 'No Business Selected', description: 'Please select a business from the search results.' });
        return;
    }
    if (!userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }

    setIsSubmitting(true);
    
    const place = selectedPlace;
    const companyName = place.name || '';
    const websiteUrl = place.website || '';
    const customerPhone = place.formatted_phone_number || '';
    const address = place.address_components ? parseAddressComponents(place.address_components) : {} as Address;
    const websiteDomain = (websiteUrl || '').replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const customerServiceEmail = websiteDomain ? `info@${websiteDomain}` : '';

    const duplicateId = await checkForDuplicateLead(companyName, websiteUrl, customerServiceEmail, address);
    if (duplicateId) {
        setDuplicateLeadId(duplicateId);
        setIsSubmitting(false);
        return;
    }

    try {
        const result = await createNewLead({
            companyName,
            websiteUrl,
            customerPhone,
            customerServiceEmail,
            address,
            contact: {
                firstName: 'Info',
                lastName: companyName,
                title: 'Primary Contact',
                email: customerServiceEmail,
                phone: customerPhone
            },
            dialerAssigned: userProfile.displayName,
            campaign: userProfile.role?.includes('Field Sales') ? 'Door-to-Door' : 'Outbound'
        } as any);

        if (result.success && result.leadId) {
            toast({
                title: 'Lead Created',
                description: `${companyName} has been successfully created.`,
            });
            onOpenChange(false);
            router.push(`/leads/${result.leadId}`);
        } else {
            throw new Error(result.message || 'Failed to create lead in NetSuite.');
        }
    } catch (error: any) {
        console.error('Failed to quick-add lead:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'An unexpected error occurred during lead creation.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quick Add Lead</DialogTitle>
          <DialogDescription>
            Search for a business or scan a business card to quickly create a new lead.
          </DialogDescription>
        </DialogHeader>

        {isAnalyzing && (
            <div className="flex flex-col items-center justify-center gap-2 p-8">
                <Loader />
                <p className="text-sm text-muted-foreground">Analyzing Business Card...</p>
            </div>
        )}

        {showCamera ? (
            <div className="space-y-4">
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                {hasCameraPermission === false && (
                    <Alert variant="destructive">
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                            Please allow camera access in your browser settings to use this feature.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="flex gap-2">
                    <Button onClick={handleCaptureAndAnalyze} className="w-full" disabled={!hasCameraPermission}>Capture and Analyze</Button>
                    <Button variant="outline" onClick={() => setShowCamera(false)}>Cancel</Button>
                </div>
            </div>
        ) : (
            <>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="quick-add-search">Search Business Name or Address</Label>
                         <div className="flex gap-2">
                            <Input id="quick-add-search" ref={autocompleteInputRef} placeholder="Start typing..."/>
                            <Button type="button" variant="outline" size="icon" onClick={() => setShowCamera(true)}><Camera className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    {selectedPlace && (
                        <div className="p-3 border rounded-md bg-secondary/50 text-sm">
                            <p className="font-semibold">{selectedPlace.name}</p>
                            <p className="text-muted-foreground">{selectedPlace.formatted_address}</p>
                        </div>
                    )}
                </div>
                 <DialogFooter>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!selectedPlace || isSubmitting}>
                    {isSubmitting ? <Loader /> : 'Create Lead'}
                  </Button>
                </DialogFooter>
            </>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
     <AlertDialog open={!!duplicateLeadId} onOpenChange={() => setDuplicateLeadId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Duplicate Found</AlertDialogTitle>
                <AlertDialogDescription>
                    This business appears to already exist in your system.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDuplicateLeadId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    if (duplicateLeadId) {
                         router.push(`/leads/${duplicateLeadId}`);
                         onOpenChange(false);
                         setDuplicateLeadId(null);
                    }
                }}>
                    View Existing Lead
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
