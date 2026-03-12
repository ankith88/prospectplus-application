
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getAllUsers, getFieldSalesSchedules, saveFieldSalesSchedule, deleteFieldSalesSchedule } from '@/services/firebase';
import type { UserProfile, FieldSalesSchedule } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Calendar as LucideCalendar, Clock, Save, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { sendScheduleToNetSuite } from '@/services/netsuite-schedule-proxy';
import { format, parseISO, startOfWeek } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TeamSchedulesPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [schedules, setSchedules] = useState<FieldSalesSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [weekStarting, setWeekStarting] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<FieldSalesSchedule | null>(null);
  
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [allUsers, allSchedules] = await Promise.all([
          getAllUsers(),
          getFieldSalesSchedules()
        ]);
        const fieldSalesUsers = allUsers.filter(u => u.role === 'Field Sales' || u.role === 'Field Sales Admin');
        setUsers(fieldSalesUsers);
        setSchedules(allSchedules);
      } catch (error) {
        console.error("Failed to fetch scheduling data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUserId && weekStarting) {
        const weekStr = format(weekStarting, 'yyyy-MM-dd');
        const existing = schedules.find(s => s.userId === selectedUserId && s.weekStarting === weekStr);
        if (existing) {
            setWorkingDays(existing.workingDays);
            setStartTime(existing.startTime);
            setEndTime(existing.endTime);
        } else {
            setWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
            setStartTime('09:00');
            setEndTime('17:00');
        }
    }
  }, [selectedUserId, weekStarting, schedules]);

  const handleToggleDay = (day: string) => {
    setWorkingDays(prev => 
        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!selectedUserId || !weekStarting) return;
    const user = users.find(u => u.uid === selectedUserId);
    if (!user) return;

    setIsSaving(true);
    try {
      const weekStr = format(weekStarting, 'yyyy-MM-dd');
      const scheduleData = {
        userId: selectedUserId,
        userName: user.displayName || user.email,
        workingDays,
        startTime,
        endTime,
        weekStarting: weekStr,
      };

      const docId = `${selectedUserId}_${weekStr}`;
      await saveFieldSalesSchedule(docId, scheduleData);
      
      const syncResult = await sendScheduleToNetSuite({
          ...scheduleData,
          workingDays
      });
      
      setSchedules(prev => {
          const index = prev.findIndex(s => s.userId === selectedUserId && s.weekStarting === weekStr);
          const updatedRecord = { ...scheduleData, id: docId, updatedAt: new Date().toISOString() };
          const next = [...prev];
          if (index > -1) next[index] = updatedRecord as any;
          else next.push(updatedRecord as any);
          return next;
      });

      if (syncResult.success) {
          toast({ title: 'Schedule Saved', description: `Weekly schedule for ${user.displayName} (Week of ${weekStr}) saved and synced with NetSuite.` });
      } else {
          toast({ 
            variant: 'destructive', 
            title: 'Partial Success', 
            description: `Schedule saved locally, but failed to sync with NetSuite: ${syncResult.message}` 
          });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save schedule.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!scheduleToDelete?.id) return;
    setIsDeleting(true);
    try {
        await deleteFieldSalesSchedule(scheduleToDelete.id);
        setSchedules(prev => prev.filter(s => s.id !== scheduleToDelete.id));
        toast({ title: 'Schedule Deleted', description: `Schedule for ${scheduleToDelete.userName} removed.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the schedule.' });
    } finally {
        setIsDeleting(false);
        setScheduleToDelete(null);
    }
  };

  const sortedSchedules = useMemo(() => {
      return [...schedules].sort((a, b) => {
          const weekCompare = (b.weekStarting || '').localeCompare(a.weekStarting || '');
          if (weekCompare !== 0) return weekCompare;
          return a.userName.localeCompare(b.userName);
      });
  }, [schedules]);

  if (loading) return <div className="flex h-full items-center justify-center"><Loader /></div>;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Team Schedules</h1>
        <p className="text-muted-foreground">Manage weekly working hours for Field Sales representatives.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Define Weekly Schedule</CardTitle>
            <CardDescription>Select a representative and a week to configure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label>Representative</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a representative..." />
                    </SelectTrigger>
                    <SelectContent>
                        {users.map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Week Starting (Monday)</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {weekStarting ? format(weekStarting, 'PPPP') : <span>Pick a week</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={weekStarting}
                            onSelect={(date) => date && setWeekStarting(startOfWeek(date, { weekStartsOn: 1 }))}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {selectedUserId && (
                <div className="space-y-6 pt-4 border-t animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-3">
                        <Label>Working Days</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {DAYS.map(day => (
                                <Button 
                                    key={day} 
                                    variant={workingDays.includes(day) ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleToggleDay(day)}
                                    className="text-xs"
                                >
                                    {day}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                        </div>
                    </div>
                </div>
            )}
          </CardContent>
          <CardFooter>
              <Button className="w-full" disabled={!selectedUserId || isSaving} onClick={handleSave}>
                  {isSaving ? <Loader /> : <><Save className="mr-2 h-4 w-4" /> Save Weekly Schedule</>}
              </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Schedule Overview</CardTitle>
            <CardDescription>Historical and upcoming team availability.</CardDescription>
          </CardHeader>
          <CardContent>
              <ScrollArea className="h-[500px]">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Representative</TableHead>
                              <TableHead>Week Starting</TableHead>
                              <TableHead>Days</TableHead>
                              <TableHead>Window</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {sortedSchedules.map(s => (
                              <TableRow key={s.id} className={cn(selectedUserId === s.userId && format(weekStarting, 'yyyy-MM-dd') === s.weekStarting && "bg-muted")}>
                                  <TableCell className="font-medium">{s.userName}</TableCell>
                                  <TableCell>
                                      <div className="text-xs flex items-center gap-1">
                                          <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                          {s.weekStarting ? format(parseISO(s.weekStarting), 'PP') : 'N/A'}
                                      </div>
                                  </TableCell>
                                  <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                          {s.workingDays.map(d => <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>)}
                                      </div>
                                  </TableCell>
                                  <TableCell>
                                      <div className="text-xs flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          {s.startTime} - {s.endTime}
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => setScheduleToDelete(s)}
                                      >
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </TableCell>
                              </TableRow>
                          ))}
                          {schedules.length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">No schedules defined yet.</TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!scheduleToDelete} onOpenChange={(open) => !open && setScheduleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Weekly Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the schedule for <strong>{scheduleToDelete?.userName}</strong> for the week of <strong>{scheduleToDelete?.weekStarting}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={isDeleting}
            >
              {isDeleting ? <Loader /> : 'Delete Schedule'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
