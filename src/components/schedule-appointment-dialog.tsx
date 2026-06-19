
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddContactForm } from './add-contact-form';
import type { Lead, Contact } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Calendar, UserPlus } from 'lucide-react';
import { salesReps } from '@/lib/constants';

interface ScheduleAppointmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  accountManagers: string[];
  onAssignAccountManager: (amName: string) => Promise<string | null>;
  onAppointmentScheduled?: () => void;
}

export function ScheduleAppointmentDialog({
  isOpen,
  onOpenChange,
  lead,
  accountManagers,
  onAssignAccountManager,
  onAppointmentScheduled
}: ScheduleAppointmentDialogProps) {
  const [selectedAm, setSelectedAm] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAmSelection = async () => {
    if (!selectedAm) return;
    setIsAssigning(true);
    const newWindow = window.open('', '_blank');
    try {
      const urlId = await onAssignAccountManager(selectedAm);
      if (urlId && newWindow) {
        newWindow.location.href = `/book/${urlId}`;
        onAppointmentScheduled?.();
        onOpenChange(false);
      } else if (newWindow) {
        newWindow.close();
      }
    } catch {
      if (newWindow) newWindow.close();
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
          <DialogDescription>
            Assign an Account Manager to schedule an appointment with.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-64">
          <RadioGroup
            value={selectedAm || ''}
            onValueChange={setSelectedAm}
            className="space-y-2 p-1"
          >
            {accountManagers.map((am) => (
              <Label
                key={am}
                htmlFor={am}
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent hover:text-accent-foreground has-[:checked]:bg-accent has-[:checked]:text-accent-foreground"
              >
                <RadioGroupItem value={am} id={am} />
                <div>
                  <p className="font-semibold">{am}</p>
                </div>
              </Label>
            ))}
            {accountManagers.length === 0 && (
              <p className="text-sm text-slate-500">No Account Managers found.</p>
            )}
          </RadioGroup>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAssigning}>Cancel</Button>
          <Button onClick={handleAmSelection} disabled={!selectedAm || isAssigning}>
            {isAssigning ? 'Generating Link...' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

