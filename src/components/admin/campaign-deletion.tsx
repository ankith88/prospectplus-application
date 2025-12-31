
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader } from '../ui/loader';
import { getLeadsFromFirebase, deleteLeadsByCampaign } from '@/services/firebase';
import type { Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { Label } from '../ui/label';

export function CampaignDeletion() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      try {
        const leads = await getLeadsFromFirebase({ summary: true });
        setAllLeads(leads);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch lead data.' });
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [toast]);
  
  const uniqueCampaigns = useMemo(() => {
    const campaigns = new Set(allLeads.map(lead => lead.campaign).filter(Boolean));
    return Array.from(campaigns as string[]);
  }, [allLeads]);
  
  const leadsInSelectedCampaign = useMemo(() => {
    if (!selectedCampaign) return [];
    return allLeads.filter(lead => lead.campaign === selectedCampaign);
  }, [allLeads, selectedCampaign]);

  const handleDelete = async () => {
    if (!selectedCampaign) return;
    setIsDeleting(true);
    
    try {
        await deleteLeadsByCampaign(selectedCampaign);
        toast({ title: 'Success', description: `All leads from the "${selectedCampaign}" campaign have been deleted.` });
        // Refetch leads to update counts
        const leads = await getLeadsFromFirebase({ summary: true });
        setAllLeads(leads);
        setSelectedCampaign('');
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete leads.' });
    } finally {
        setIsDeleting(false);
        setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-4">
        <div className="flex items-end gap-4">
            <div className="space-y-2 flex-grow max-w-sm">
                <Label htmlFor="campaign-select">Campaign</Label>
                <Select
                    value={selectedCampaign}
                    onValueChange={setSelectedCampaign}
                    disabled={loading}
                >
                    <SelectTrigger id="campaign-select">
                        <SelectValue placeholder={loading ? "Loading campaigns..." : "Select a campaign to delete"} />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueCampaigns.map(campaign => (
                            <SelectItem key={campaign} value={campaign}>
                                {campaign}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <Button
                variant="destructive"
                onClick={() => setShowConfirm(true)}
                disabled={!selectedCampaign || leadsInSelectedCampaign.length === 0}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({leadsInSelectedCampaign.length}) Leads
            </Button>
        </div>
        
        {selectedCampaign && leadsInSelectedCampaign.length === 0 && (
            <p className="text-sm text-muted-foreground">No leads found in the "{selectedCampaign}" campaign.</p>
        )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-bold">{leadsInSelectedCampaign.length}</span> lead(s) from the campaign "{selectedCampaign}". 
              This action cannot be undone and will delete all associated sub-collections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader /> : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
