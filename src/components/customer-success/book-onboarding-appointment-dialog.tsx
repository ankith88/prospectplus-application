'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { bookOnboardingAppointment } from '@/services/onboarding-service';
import type { OnboardingRequest } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Calendar, Clock, Video, MapPin, PhoneCall } from 'lucide-react';

interface BookOnboardingAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: OnboardingRequest | null;
  onSuccess?: () => void;
}

export function BookOnboardingAppointmentDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: BookOnboardingAppointmentDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [appointmentType, setAppointmentType] = useState('Video Call');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && request) {
      // Pre-fill defaults
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const defaultDateStr = tomorrow.toISOString().split('T')[0];
      setAppointmentDate(defaultDateStr);
      setAppointmentTime('10:00');
      setAppointmentType('Video Call');
      setLocationOrLink('');
      setNotes(request.notes ? `Initial Request Notes: ${request.notes}` : '');
    }
  }, [open, request]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (!appointmentDate) {
      toast({ variant: 'destructive', title: 'Date Required', description: 'Please select an appointment date.' });
      return;
    }

    try {
      setSubmitting(true);

      const combinedISO = new Date(`${appointmentDate}T${appointmentTime}:00`).toISOString();

      await bookOnboardingAppointment(request.id, {
        appointmentDate: combinedISO,
        appointmentType,
        locationOrLink,
        notes,
        scheduledByUid: user?.uid || '',
        scheduledByName: userProfile?.displayName || user?.email || 'Liam',
      });

      toast({
        title: 'Onboarding Appointment Booked',
        description: `Appointment scheduled for ${request.companyName} on ${new Date(combinedISO).toLocaleString()}.`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error booking onboarding appointment:', err);
      toast({
        variant: 'destructive',
        title: 'Booking Failed',
        description: err.message || 'Failed to organise onboarding appointment.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xl">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Organise Onboarding Appointment
          </DialogTitle>
          <DialogDescription>
            Schedule the onboarding meeting details for <strong>{request.companyName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Customer Summary Box */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
            <p className="font-bold text-foreground text-base">{request.companyName}</p>
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 mt-1">
              <span>Contact: <strong>{request.contactName}</strong></span>
              {request.contactEmail && <span>• {request.contactEmail}</span>}
              {request.contactPhone && <span>• {request.contactPhone}</span>}
            </div>
            {request.preferredTimeframe && (
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium mt-1">
                Requested Timeframe: {request.preferredTimeframe}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Appointment Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Date
              </Label>
              <Input
                type="date"
                value={appointmentDate}
                onChange={e => setAppointmentDate(e.target.value)}
                required
              />
            </div>

            {/* Appointment Time */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" /> Time
              </Label>
              <Input
                type="time"
                value={appointmentTime}
                onChange={e => setAppointmentTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Appointment Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-emerald-600" /> Channel / Type
              </Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Video Call">Teams / Zoom Video Call</SelectItem>
                  <SelectItem value="Phone Call">Phone Onboarding Call</SelectItem>
                  <SelectItem value="Onsite Visit">In-Person / Onsite Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Meeting Link / Location */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Meeting Link / Address
              </Label>
              <Input
                placeholder="e.g. Teams link or location"
                value={locationOrLink}
                onChange={e => setLocationOrLink(e.target.value)}
              />
            </div>
          </div>

          {/* Meeting Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Appointment & Agenda Notes</Label>
            <Textarea
              placeholder="Add agenda, preparation notes, or specific onboarding topics to cover..."
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2">
              {submitting ? <Loader className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
              Confirm & Schedule Appointment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
