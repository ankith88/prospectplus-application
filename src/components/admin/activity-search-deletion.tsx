
'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { getAllActivities, bulkDeleteSubCollectionItems } from '@/services/firebase';
import type { Activity } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from '../ui/checkbox';
import Link from 'next/link';

type ActivityWithLeadId = Activity & { leadId: string };

export function ActivitySearchDeletion() {
  const [activities, setActivities] = useState<ActivityWithLeadId[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debouncedSearchTerm) {
      setActivities([]);
      return;
    }
    setLoading(true);
    try {
      const allActivities = await getAllActivities();
      const filtered = allActivities.filter(activity =>
        activity.notes.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
      setActivities(filtered);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch activities.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (activityId: string, checked: boolean) => {
    setSelectedActivities(prev =>
      checked ? [...prev, activityId] : prev.filter(id => id !== activityId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedActivities(checked ? activities.map(a => `${a.leadId}|${a.id}`) : []);
  };
  
  const handleDelete = async () => {
    if (selectedActivities.length === 0) return;
    setIsDeleting(true);

    const activitiesByLead = selectedActivities.reduce((acc, compositeId) => {
        const [leadId, activityId] = compositeId.split('|');
        if (!acc[leadId]) {
            acc[leadId] = [];
        }
        acc[leadId].push(activityId);
        return acc;
    }, {} as Record<string, string[]>);

    try {
        await Promise.all(
            Object.entries(activitiesByLead).map(([leadId, activityIds]) => 
                bulkDeleteSubCollectionItems(leadId, 'activity', activityIds)
            )
        );
        
        setActivities(prev => prev.filter(a => !selectedActivities.includes(`${a.leadId}|${a.id}`)));
        setSelectedActivities([]);
        toast({ title: 'Success', description: `${selectedActivities.length} activities have been deleted.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete some activities.' });
    } finally {
        setIsDeleting(false);
        setShowConfirm(false);
    }
  };

  const isAllSelected = activities.length > 0 && selectedActivities.length === activities.length;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search activity notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button type="submit" disabled={loading}>
          {loading ? <Loader /> : 'Search'}
        </Button>
      </form>
      
      {selectedActivities.length > 0 && (
        <Button variant="destructive" onClick={() => setShowConfirm(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({selectedActivities.length})
        </Button>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
              </TableHead>
              <TableHead>Lead ID</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center"><Loader /></TableCell>
              </TableRow>
            ) : activities.length > 0 ? (
              activities.map((activity) => (
                <TableRow key={activity.id} data-state={selectedActivities.includes(`${activity.leadId}|${activity.id}`) && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={selectedActivities.includes(`${activity.leadId}|${activity.id}`)}
                      onCheckedChange={(checked) => handleSelect(`${activity.leadId}|${activity.id}`, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Button variant="link" asChild className="p-0 h-auto">
                        <Link href={`/leads/${activity.leadId}`} target="_blank">{activity.leadId}</Link>
                    </Button>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{activity.notes}</TableCell>
                  <TableCell>{new Date(activity.date).toLocaleString()}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedActivities.length} activity record(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
