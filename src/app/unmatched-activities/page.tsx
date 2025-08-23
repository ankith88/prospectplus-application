
"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Activity, Lead } from '@/lib/types'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { firestore } from '@/lib/firebase'
import { collection, getDocs, orderBy, query, doc, deleteDoc, writeBatch } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { Phone, Calendar, Clock, FileText, DownloadCloud, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { getUserCallTranscripts } from '@/ai/flows/get-user-call-transcripts-flow'
import { useToast } from '@/hooks/use-toast'
import { logActivity, getLeadsTool } from '@/services/firebase'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'

type UnmatchedActivity = Activity & {
    phoneNumber: string;
};

export default function UnmatchedActivitiesPage() {
  const [unmatchedActivities, setUnmatchedActivities] = useState<UnmatchedActivity[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activityToAssign, setActivityToAssign] = useState<UnmatchedActivity | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const fetchUnmatchedActivities = async () => {
    try {
      setLoading(true);
      const activitiesRef = collection(firestore, 'unmatched_activities');
      const q = query(activitiesRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const activities = querySnapshot.docs.map(doc => {
          const data = doc.data() as Activity;
          const phoneNumber = data.notes.match(/Unmatched call from (\S+)\./)?.[1] || data.notes.match(/call with (\S+) on/)?.[1] || 'Unknown';
          return {
              ...data,
              id: doc.id,
              phoneNumber: phoneNumber,
          }
      }) as UnmatchedActivity[];
      setUnmatchedActivities(activities);
    } catch (error) {
      console.error("Failed to fetch unmatched activities:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch activities.' });
    } finally {
      setLoading(false);
    }
  }

  const fetchLeads = async () => {
    try {
        const leads = await getLeadsTool({ summary: true });
        setAllLeads(leads);
    } catch (error) {
        console.error("Failed to fetch leads:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch leads.' });
    }
  }

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    if (authLoading) return;
    
    fetchUnmatchedActivities();
    fetchLeads();

  }, [user, authLoading, router, toast]);

  const handleSyncTranscripts = async () => {
    if (!user?.displayName) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not identify user.' });
        return;
    }
    try {
        setIsSyncing(true);
        const result = await getUserCallTranscripts({ userDisplayName: user.displayName });
        
        if (result.error) {
            toast({ variant: 'destructive', title: 'Sync Failed', description: result.error });
        } else if (result.newActivities.length > 0) {
            toast({ title: 'Success', description: `Synced ${result.newActivities.length} new transcript(s).` });
            setUnmatchedActivities(prev => [...result.newActivities, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } else {
            toast({ title: 'No New Transcripts', description: 'No new transcripts were found to sync.' });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'An unknown error occurred.' });
    } finally {
        setIsSyncing(false);
    }
  }

  const handleOpenAssignDialog = (activity: UnmatchedActivity) => {
    setActivityToAssign(activity);
    setSelectedLeadId(null);
  };
  
  const handleCloseAssignDialog = () => {
    setActivityToAssign(null);
    setSelectedLeadId(null);
  };

  const handleAssignActivity = async () => {
    if (!activityToAssign || !selectedLeadId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a lead to assign the activity to.' });
        return;
    }
    
    setIsAssigning(true);
    try {
        const { id, phoneNumber, ...activityData } = activityToAssign;
        await logActivity(selectedLeadId, activityData);

        // Delete the activity from unmatched_activities
        const activityDocRef = doc(firestore, 'unmatched_activities', id);
        await deleteDoc(activityDocRef);

        // Remove from local state
        setUnmatchedActivities(prev => prev.filter(act => act.id !== id));
        
        toast({ title: 'Success', description: 'Activity has been assigned to the lead.' });
        handleCloseAssignDialog();
    } catch (error) {
        console.error("Failed to assign activity:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign activity.' });
    } finally {
        setIsAssigning(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Unmatched Activities</h1>
            <p className="text-muted-foreground">Review incoming calls from numbers not associated with any lead.</p>
        </div>
        <Button onClick={handleSyncTranscripts} disabled={isSyncing}>
            {isSyncing ? <Loader/> : <DownloadCloud className="mr-2 h-4 w-4" />}
            {isSyncing ? 'Syncing...' : 'Sync My Transcripts'}
        </Button>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Unassigned Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Call Details</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : unmatchedActivities.length > 0 ? (
                  unmatchedActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{activity.phoneNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4 mt-1 shrink-0" />
                            <p className="break-all">{activity.notes}</p>
                         </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{new Date(activity.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{new Date(activity.date).toLocaleTimeString()}</span>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleOpenAssignDialog(activity)}>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Assign to Lead
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                          No unmatched activities found.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
    
    <Dialog open={!!activityToAssign} onOpenChange={handleCloseAssignDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Activity to Lead</DialogTitle>
          <DialogDescription>
            Select a lead from the dropdown to assign this call activity to.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Select onValueChange={setSelectedLeadId}>
                <SelectTrigger>
                    <SelectValue placeholder="Search for a lead..." />
                </SelectTrigger>
                <SelectContent>
                    {allLeads.map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>
                           {lead.companyName} ({lead.customerPhone || 'No Phone'})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={handleCloseAssignDialog}>Cancel</Button>
            <Button onClick={handleAssignActivity} disabled={!selectedLeadId || isAssigning}>
                {isAssigning ? <Loader /> : "Assign Activity"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
