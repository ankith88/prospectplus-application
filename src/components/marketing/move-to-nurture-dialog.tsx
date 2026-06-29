'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { bulkMoveLeadsToNurtureCampaign } from '@/services/firebase';
import { Loader2, Sparkles } from 'lucide-react';
import type { Lead } from '@/lib/types';

interface MoveToNurtureDialogProps {
  leads: Lead[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLeadsMoved: () => void;
}

export function MoveToNurtureDialog({ leads, isOpen, onOpenChange, onLeadsMoved }: MoveToNurtureDialogProps) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [noteText, setNoteText] = useState<string>('');
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!isOpen) return;
      setIsLoadingCampaigns(true);
      try {
        const q = query(collection(firestore, 'Journeys'), where('status', '==', 'active'));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCampaigns(list);
      } catch (error) {
        console.error('Failed to fetch active campaigns:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load active nurture campaigns.' });
      } finally {
        setIsLoadingCampaigns(false);
      }
    };
    fetchCampaigns();
  }, [isOpen, toast]);

  const handleMoveLeads = async () => {
    if (leads.length === 0 || !selectedCampaignId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select leads and a nurture campaign.' });
      return;
    }
    if (!noteText.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Notes are mandatory when enrolling in a nurture campaign.' });
      return;
    }
    setIsMoving(true);
    try {
      const author = user?.displayName || user?.email || 'System';
      const isAccountManager = userProfile?.activeRole === 'Account Manager' || 
                               userProfile?.activeRole === 'Account Managers' || 
                               userProfile?.activeRole === 'account managers' ||
                               userProfile?.role === 'Account Manager' ||
                               userProfile?.role === 'Account Managers' ||
                               userProfile?.role === 'account managers' ||
                               userProfile?.assignedRoles?.includes('Account Manager') ||
                               userProfile?.assignedRoles?.includes('Account Managers') ||
                               userProfile?.assignedRoles?.includes('account managers');

      await bulkMoveLeadsToNurtureCampaign(leads.map(l => l.id), selectedCampaignId, author, noteText.trim(), isAccountManager);
      const selectedCamp = campaigns.find(c => c.id === selectedCampaignId);
      toast({ 
        title: 'Leads Enrolled in Nurture', 
        description: `Successfully enrolled ${leads.length} lead(s) in campaign "${selectedCamp?.name || 'Nurture Campaign'}".` 
      });
      onLeadsMoved();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to move leads:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not move the selected leads.' });
    } finally {
      setIsMoving(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedCampaignId('');
      setNoteText('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border border-slate-100 rounded-2xl shadow-xl p-6">
        <DialogHeader className="space-y-2.5">
          <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500 fill-yellow-400 animate-pulse" />
            <span>Move {leads.length} Lead(s) to Nurture</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Selected leads will be enrolled in the nurture campaign chosen below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Nurture Campaign</span>
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId} disabled={isLoadingCampaigns}>
              <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-xs h-10 rounded-lg">
                <SelectValue placeholder={isLoadingCampaigns ? 'Loading campaigns...' : 'Choose active nurture campaign...'} />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map(camp => (
                  <SelectItem key={camp.id} value={camp.id} className="text-xs">
                    {camp.name}
                  </SelectItem>
                ))}
                {campaigns.length === 0 && !isLoadingCampaigns && (
                  <SelectItem value="none" disabled className="text-xs text-slate-400 italic">
                    No active campaigns found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nurture-notes" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes <span className="text-red-500">*</span></Label>
            <Textarea
              id="nurture-notes"
              placeholder="Why are you moving these leads to this nurture campaign?"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              className="bg-slate-50 border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs rounded-lg border-slate-200 text-slate-600">
            Cancel
          </Button>
          <Button 
            onClick={handleMoveLeads} 
            disabled={!selectedCampaignId || !noteText.trim() || isMoving || isLoadingCampaigns}
            className="h-9 text-xs rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
          >
            {isMoving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Moving...
              </>
            ) : (
              'Confirm & Enroll'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
