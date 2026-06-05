'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/ui/loader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Users, Play, CheckCircle2, AlertTriangle, ArrowLeft, MousePointerClick, Calendar, Loader2, Trash2 } from 'lucide-react';
import { firestore } from '@/lib/firebase';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';

export default function NurtureReportPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [reportData, setReportData] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedJourney, setSelectedJourney] = useState<any | null>(null);
  const [removingLeadId, setRemovingLeadId] = useState<string | null>(null);
  const [triggeringLeadId, setTriggeringLeadId] = useState<string | null>(null);

  const handleTriggerStep = async (e: React.MouseEvent, leadId: string, journeyId: string) => {
    e.stopPropagation();
    setTriggeringLeadId(leadId);
    try {
      const res = await fetch('/api/nurture/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, journeyId, forceExecute: true })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Step Triggered', description: 'Nurture campaign step executed successfully.' });
        // Refresh reporting data
        const refreshRes = await fetch('/api/nurture/report');
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setReportData(refreshData.report);
          const updatedJ = refreshData.report.find((j: any) => j.id === journeyId);
          if (updatedJ) {
            setSelectedJourney(updatedJ);
          }
        }
      } else {
        toast({ variant: 'destructive', title: 'Execution Failed', description: data.message || 'Failed to trigger step.' });
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to manually trigger step.' });
    } finally {
      setTriggeringLeadId(null);
    }
  };

  const handleRemoveLead = async (e: React.MouseEvent, leadId: string, journeyId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this lead from the nurture campaign?')) return;
    setRemovingLeadId(leadId);
    try {
      const stateRef = doc(firestore, 'leads', leadId, 'journey_states', journeyId);
      const leadRef = doc(firestore, 'leads', leadId);
      const nowStr = new Date().toISOString();

      await updateDoc(stateRef, {
        status: 'stopped',
        lastExecutionTime: nowStr
      });

      await updateDoc(leadRef, {
        activeJourneys: arrayRemove(journeyId)
      });

      toast({ title: 'Lead Removed', description: 'Successfully removed lead from the nurture campaign.' });
      
      const res = await fetch('/api/nurture/report');
      const data = await res.json();
      if (data.success) {
        setReportData(data.report);
        const updatedJ = data.report.find((j: any) => j.id === journeyId);
        if (updatedJ) {
          setSelectedJourney(updatedJ);
        }
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove lead from campaign.' });
    } finally {
      setRemovingLeadId(null);
    }
  };

  const isAllowed = (userProfile?.activeRole && ['admin', 'Marketing Admin', 'Marketing Manager', 'Dashback'].includes(userProfile.activeRole)) || user?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

  useEffect(() => {
    if (!loading && !isAllowed) {
      router.replace('/leads');
    }
  }, [loading, isAllowed, router]);

  useEffect(() => {
    if (isAllowed) {
      fetchReport();
    }
  }, [isAllowed]);

  const fetchReport = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/nurture/report');
      const data = await res.json();
      if (data.success) {
        setReportData(data.report);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load reporting data.' });
      }
    } catch (error) {
      console.error('Failed to load nurture report:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'System error fetching analytics.' });
    } finally {
      setFetching(false);
    }
  };

  if (loading || !isAllowed) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Calculate global aggregate statistics
  const totalEnrolled = reportData.reduce((acc, curr) => acc + (curr.metrics?.totalEnrolled || 0), 0);
  const totalActive = reportData.reduce((acc, curr) => acc + (curr.metrics?.active || 0), 0);
  const totalCompleted = reportData.reduce((acc, curr) => acc + (curr.metrics?.completed || 0), 0);
  const totalInteractions = reportData.reduce((acc, curr) => acc + (curr.metrics?.interactions || 0), 0);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto min-h-screen">
      {/* Header and Back navigation */}
      <div className="flex items-center justify-between border-b pb-4 shrink-0">
        <div>
          {selectedJourney ? (
            <Button variant="ghost" onClick={() => setSelectedJourney(null)} className="pl-0 text-primary mb-2 flex items-center gap-1.5 h-8">
              <ArrowLeft className="h-4 w-4" /> Back to Analytics Overview
            </Button>
          ) : null}
          <h1 className="text-3xl font-normal tracking-tight text-slate-800 flex items-center gap-2">
            Nurture Campaign Reporting
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedJourney 
              ? `Detailed performance and lead tracking for journey: ${selectedJourney.name}`
              : 'Real-time performance audit of lead automated sequences, stage progress, and CTA click interactions'
            }
          </p>
        </div>
        {!selectedJourney && (
          <Button onClick={fetchReport} disabled={fetching} size="sm" variant="outline" className="h-9">
            {fetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Refresh Data
          </Button>
        )}
      </div>

      {fetching && !selectedJourney ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : selectedJourney ? (
        /* Detailed Campaign View */
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-50">
              <CardContent className="pt-4">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Enrolled</span>
                <span className="text-2xl font-bold text-slate-800">{selectedJourney.metrics.totalEnrolled}</span>
              </CardContent>
            </Card>
            <Card className="bg-blue-50/50">
              <CardContent className="pt-4">
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Active Drips</span>
                <span className="text-2xl font-bold text-blue-700">{selectedJourney.metrics.active}</span>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50">
              <CardContent className="pt-4">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Completions</span>
                <span className="text-2xl font-bold text-emerald-700">{selectedJourney.metrics.completed}</span>
              </CardContent>
            </Card>
            <Card className="bg-rose-50">
              <CardContent className="pt-4">
                <span className="text-[10px] uppercase font-bold text-rose-600 block">Action Button Clicks</span>
                <span className="text-2xl font-bold text-rose-700">{selectedJourney.metrics.interactions}</span>
              </CardContent>
            </Card>
          </div>

          <Card className="border">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-base font-bold">Enrolled Leads List</CardTitle>
              <CardDescription>All leads currently or historically enrolled in this sequence</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {selectedJourney.leads.length === 0 ? (
                <div className="text-center p-8 text-xs text-muted-foreground italic">
                  No leads have been enrolled in this journey yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Lead Status</TableHead>
                      <TableHead>Campaign Stage</TableHead>
                      <TableHead>Drip Status</TableHead>
                      <TableHead>Action Interaction</TableHead>
                      <TableHead>Enrollment Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedJourney.leads.map((lead: any, idx: number) => (
                      <TableRow key={idx} className="cursor-pointer hover:bg-slate-50/50" onClick={() => router.push(`/leads/${lead.leadId}`)}>
                        <TableCell className="font-semibold text-slate-800">{lead.companyName}</TableCell>
                        <TableCell>{lead.leadStatus}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 text-[10px]">
                            {lead.currentNodeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold uppercase ${
                            lead.status === 'active' ? 'text-blue-600' :
                            lead.status === 'completed' ? 'text-emerald-600' :
                            lead.status === 'paused' ? 'text-amber-500' :
                            'text-slate-500'
                          }`}>
                            {lead.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {lead.clickedActionButton ? (
                            <Badge className="bg-emerald-500 text-white gap-1 text-[10px]">
                              <MousePointerClick className="h-3 w-3" /> Clicked Action
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No interaction</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {lead.entryTime ? new Date(lead.entryTime).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {lead.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleTriggerStep(e, lead.leadId, selectedJourney.id)}
                                className="h-7 px-2 text-xs gap-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                disabled={triggeringLeadId === lead.leadId}
                              >
                                <Play className="h-3 w-3 text-blue-600 fill-blue-600" /> Run Step
                              </Button>
                            )}
                            {lead.status !== 'stopped' && lead.status !== 'completed' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleRemoveLead(e, lead.leadId, selectedJourney.id)}
                                className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={removingLeadId === lead.leadId}
                              >
                                <Trash2 className="h-3 w-3" /> Remove
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Ended</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Overview Dashboard View */
        <div className="space-y-6">
          {/* Global Aggregates */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border shadow-sm bg-slate-50">
              <CardHeader className="py-3.5 flex flex-row items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Leads Enrolled</span>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent className="pb-4">
                <span className="text-3xl font-extrabold text-slate-800">{totalEnrolled}</span>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-blue-50/50">
              <CardHeader className="py-3.5 flex flex-row items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Active Sequences</span>
                <Play className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="pb-4">
                <span className="text-3xl font-extrabold text-blue-700">{totalActive}</span>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-emerald-50">
              <CardHeader className="py-3.5 flex flex-row items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Total Completions</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="pb-4">
                <span className="text-3xl font-extrabold text-emerald-700">{totalCompleted}</span>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-rose-50">
              <CardHeader className="py-3.5 flex flex-row items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Link Interactions</span>
                <MousePointerClick className="h-4 w-4 text-rose-500 animate-pulse" />
              </CardHeader>
              <CardContent className="pb-4">
                <span className="text-3xl font-extrabold text-rose-700">{totalInteractions}</span>
              </CardContent>
            </Card>
          </div>

          {/* List of Journeys */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportData.map(journey => (
              <Card 
                key={journey.id} 
                onClick={() => setSelectedJourney(journey)}
                className="border shadow-sm hover:shadow-md transition cursor-pointer hover:border-slate-300"
              >
                <CardHeader className="bg-slate-50/50 border-b pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800">{journey.name}</CardTitle>
                    <CardDescription className="text-[10px] mt-0.5 uppercase tracking-wider font-semibold">
                      Status: <span className={journey.status === 'active' ? 'text-emerald-600' : 'text-slate-500'}>{journey.status}</span>
                    </CardDescription>
                  </div>
                  <BarChart3 className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Enrolled</span>
                      <span className="font-extrabold text-slate-800 text-sm">{journey.metrics.totalEnrolled}</span>
                    </div>
                    <div className="bg-blue-50/50 p-2 rounded">
                      <span className="text-[9px] uppercase font-bold text-blue-600 block">Active</span>
                      <span className="font-extrabold text-blue-700 text-sm">{journey.metrics.active}</span>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded">
                      <span className="text-[9px] uppercase font-bold text-emerald-600 block">Done</span>
                      <span className="font-extrabold text-emerald-700 text-sm">{journey.metrics.completed}</span>
                    </div>
                    <div className="bg-rose-50 p-2 rounded">
                      <span className="text-[9px] uppercase font-bold text-rose-600 block">Clicks</span>
                      <span className="font-extrabold text-rose-700 text-sm">{journey.metrics.interactions}</span>
                    </div>
                  </div>

                  {/* Visual Completion Progress Bar */}
                  {journey.metrics.totalEnrolled > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                        <span>Completion Rate</span>
                        <span>{Math.round((journey.metrics.completed / journey.metrics.totalEnrolled) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full"
                          style={{ width: `${(journey.metrics.completed / journey.metrics.totalEnrolled) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
