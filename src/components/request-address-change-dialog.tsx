"use client"

import { useState } from 'react';
import { Lead, Address } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/services/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { MapPin } from 'lucide-react';

interface RequestAddressChangeDialogProps {
  company: Lead | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatAddressString = (address?: Address) => {
  if (!address) return 'N/A';
  const parts = [];
  if (address.address1 && address.address1 !== 'undefined') parts.push(address.address1);
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zip) parts.push(address.zip);
  if (address.country) parts.push(address.country);
  return parts.filter(Boolean).join(', ') || 'N/A';
};

export function RequestAddressChangeDialog({ company, isOpen, onOpenChange }: RequestAddressChangeDialogProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [address1, setAddress1] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateStr, setStateStr] = useState('');
  const [zip, setZip] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!company) return null;

  const currentAddressStr = formatAddressString(company.address);

  const handleSendRequest = async () => {
    const newAddressParts = [address1, street, city, stateStr, zip].filter(Boolean).join(', ');
    if (!newAddressParts.trim()) {
      toast({ variant: 'destructive', title: 'Address Required', description: 'Please enter the requested new address details.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const requesterName = userProfile?.displayName || [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || 'User';
      const requesterEmail = userProfile?.email || '';

      const res = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'address_change_request',
          payload: {
            companyId: company.id,
            companyName: company.companyName || 'Signed Customer',
            currentAddress: currentAddressStr,
            requestedAddress: newAddressParts,
            requesterName,
            requesterEmail,
            notes
          }
        })
      });

      if (!res.ok) {
        throw new Error('Failed to send address change email request.');
      }

      await logActivity(company.id, {
        type: 'Update',
        notes: `Address change requested by ${requesterName}. New Address: ${newAddressParts}`,
        author: requesterName
      });

      toast({ title: 'Request Sent', description: 'Address change request emailed to mailplusit@mailplus.com.au.' });
      setAddress1('');
      setStreet('');
      setCity('');
      setStateStr('');
      setZip('');
      setNotes('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to request address change:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not submit address change request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <MapPin className="h-5 w-5" />
            Request Address Change
          </DialogTitle>
          <DialogDescription>
            Submit an address change request for <strong>{company.companyName}</strong>. This will email the IT team at <code>mailplusit@mailplus.com.au</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-sm">
          <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground border">
            <strong>Current Address:</strong> {currentAddressStr}
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-addr1">Building / Unit / Suite (Optional)</Label>
            <Input id="req-addr1" placeholder="e.g. Suite 4, Level 2" value={address1} onChange={(e) => setAddress1(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-street">Street Address</Label>
            <Input id="req-street" placeholder="e.g. 123 High Street" value={street} onChange={(e) => setStreet(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="req-city" className="text-xs">Suburb/City</Label>
              <Input id="req-city" placeholder="Sydney" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="req-state" className="text-xs">State</Label>
              <Input id="req-state" placeholder="NSW" value={stateStr} onChange={(e) => setStateStr(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="req-zip" className="text-xs">Postcode</Label>
              <Input id="req-zip" placeholder="2000" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-notes">Additional Instructions / Notes</Label>
            <Textarea id="req-notes" placeholder="Reason for address update..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSendRequest} disabled={isSubmitting || (!street.trim() && !city.trim())} className="bg-[#095c7b] hover:bg-[#053647]">
            {isSubmitting ? <Loader /> : 'Send Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
