
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getAllUsers, getFieldSalesSchedules, saveFieldSalesSchedule, deleteFieldSalesSchedule } from '@/services/firebase';
import type { UserProfile, FieldSalesSchedule, DaySchedule } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Calendar as LucideCalendar, Clock, Save, Trash2, Calendar as CalendarIcon, StickyNote, Edit, CheckCircle2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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

  // Granular Day Config
  const [dayConfigs, setDayConfigs] = useState<Record<string, { enabled: boolean, start: string, end: string }>>(
    DAYS.reduce((acc, day) => ({ 
        ...acc, 
        [day]: { enabled: day !== 'Sat' && day !== 'Sun', start: '09:00', end: '17:00' } 
    }), {})
  );
  const [notes, setNotes] = useState('');

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
            // Load existing day config
            const newConfigs = { ...dayConfigs };
            DAYS.forEach(day => {
                const dayMatch = existing.daySchedules?.find(ds => ds.day === day);
                if (dayMatch) {
                    newConfigs[day] = { enabled: dayMatch.enabled, start: dayMatch.startTime, end: dayMatch.endTime };
                } else {
                    // Fallback for legacy records
                    const isLegacyWorking = existing.workingDays.includes(day);
                    newConfigs[day] = { 
                        enabled: isLegacyWorking, 
                        start: existing.startTime || '09:00', 
                        end: existing.endTime || '17:00' 
                    };
                }
            });
            setDayConfigs(newConfigs);
            setNotes(existing.notes || '');
        } else {
            // Reset to defaults
            setDayConfigs(DAYS.reduce((acc, day) => ({ 
                ...acc, 
                [day]: { enabled: day !== 'Sat' && day !== 'Sun', start: '09:00', end: '17:00' } 
            }), {}));
            setNotes('');
        }
    }
  }, [selectedUserId, weekStarting, schedules]);

  const handleToggleDay = (day: string, enabled: boolean) => {
    setDayConfigs(prev => ({
        ...prev,
        [day]: { ...prev[day], enabled }
    }));
  };

  const handleTimeChange = (day: string, field: 'start' | 'end', value: string) => {
    setDayConfigs(prev => ({
        ...prev,
        [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSave = async () => {
    if (!selectedUserId || !weekStarting) return;
    const user = users.find(u => u.uid === selectedUserId);
    if (!user) return;

    setIsSaving(true);
    try {
      const weekStr = format(weekStarting, 'yyyy-MM-dd');
      
      const daySchedules: DaySchedule[] = DAYS.map(day => ({
          day,
          startTime: dayConfigs[day].start,
          endTime: dayConfigs[day].end,
          enabled: dayConfigs[day].enabled
      }));

      const enabledDays = daySchedules.filter(d => d.enabled);
      const workingDays = enabledDays.map(d => d.day);
      
      // For NetSuite API (which expects single start/end), we send the first day's timing
      const primaryStart = enabledDays.length > 0 ? enabledDays[0].startTime : '09:00';
      const primaryEnd = enabledDays.length > 0 ? enabledDays[0].endTime : '17:00';

      // Create a detailed note for NetSuite if timings vary
      const breakdown = daySchedules
        .filter(d => d.enabled)
        .map(d => `${d.day}: ${d.startTime}-${d.endTime}`)
        .join(', ');
      
      const finalNotes = notes ? `${notes}\n\nDaily Breakdown: ${breakdown}` : `Daily Breakdown: ${breakdown}`;

      const scheduleData = {
        userId: selectedUserId,
        userName: user.displayName || user.email,
        workingDays,
        startTime: primaryStart,
        endTime: primaryEnd,
        daySchedules,
        weekStarting: weekStr,
        notes: notes,
      };

      const docId = `${selectedUserId}_${weekStr}`;
      await saveFieldSalesSchedule(docId, scheduleData);
      
      const syncResult = await sendScheduleToNetSuite({
          userId: selectedUserId,
          userName: user.displayName || user.email || 'Unknown',
          workingDays,
          startTime: primaryStart,
          endTime: primaryEnd,
          weekStarting: weekStr,
          notes: finalNotes,
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
          toast({ title: 'Schedule Saved', description: `Weekly schedule for ${user.displayName} saved and synced with NetSuite.` });
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

  const handleEdit = (schedule: FieldSalesSchedule) => {
      setSelectedUserId(schedule.userId);
      setWeekStarting(parseISO(schedule.weekStarting));
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <p className="text-muted-foreground">Manage granular daily working hours for Field Sales representatives.</p>
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
                    <div className="space-y-4">
                        <Label>Daily Timings</Label>
                        <div className="space-y-3">
                            {DAYS.map(day => (
                                <div key={day} className={cn(
                                    "flex items-center gap-4 p-2 rounded-md transition-colors",
                                    dayConfigs[day].enabled ? "bg-primary/5" : "opacity-50"
                                )}>
                                    <div className="flex items-center gap-2 w-20">
                                        <Checkbox 
                                            id={`check-${day}`}
                                            checked={dayConfigs[day].enabled}
                                            onCheckedChange={(checked) => handleToggleDay(day, !!checked)}
                                        />
                                        <Label htmlFor={`check-${day}`} className="font-bold cursor-pointer">{day}</Label>
                                    </div>
                                    
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-muted-foreground uppercase">In</span>
                                            <Input 
                                                type="time" 
                                                className="h-8 py-0 px-2" 
                                                disabled={!dayConfigs[day].enabled}
                                                value={dayConfigs[day].start}
                                                onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-muted-foreground uppercase">Out</span>
                                            <Input 
                                                type="time" 
                                                className="h-8 py-0 px-2" 
                                                disabled={!dayConfigs[day].enabled}
                                                value={dayConfigs[day].end}
                                                onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="schedule-notes">Schedule Notes</Label>
                        <Textarea 
                            id="schedule-notes"
                            placeholder="Add any specific instructions or notes for this week..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                        />
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
              <ScrollArea className="h-[600px]">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Representative</TableHead>
                              <TableHead>Week Starting</TableHead>
                              <TableHead>Timings</TableHead>
                              <TableHead>Notes</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {sortedSchedules.map(s => {
                              const activeDays = (s.daySchedules || []).filter(d => d.enabled);
                              const hasGranularData = activeDays.length > 0;

                              return (
                                <TableRow key={s.id} className={cn(selectedUserId === s.userId && format(weekStarting, 'yyyy-MM-dd') === s.weekStarting && "bg-muted")}>
                                    <TableCell className="font-medium align-top py-4">
                                        {s.userName}
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(hasGranularData ? activeDays : s.workingDays.map(d => ({day: d}))).map(d => (
                                                <Badge key={d.day} variant="outline" className="text-[10px] px-1">{d.day}</Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top py-4">
                                        <div className="text-xs flex items-center gap-1">
                                            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                            {s.weekStarting ? format(parseISO(s.weekStarting), 'PP') : 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top py-4">
                                        <div className="space-y-1">
                                            {hasGranularData ? (
                                                activeDays.slice(0, 3).map(d => (
                                                    <div key={d.day} className="text-[10px] flex items-center gap-1">
                                                        <span className="font-bold w-6">{d.day}:</span>
                                                        <span className="text-muted-foreground">{d.startTime} - {d.endTime}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-xs flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    {s.startTime} - {s.endTime}
                                                </div>
                                            )}
                                            {hasGranularData && activeDays.length > 3 && (
                                                <span className="text-[9px] text-muted-foreground italic">+{activeDays.length - 3} more days...</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top py-4 max-w-xs">
                                        {s.notes ? (
                                            <div className="flex items-start gap-1 text-xs text-muted-foreground">
                                                <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
                                                <p className="line-clamp-3">{s.notes}</p>
                                            </div>
                                        ) : <span className="text-muted-foreground text-xs italic">-</span>}
                                    </TableCell>
                                    <TableCell className="text-right align-top py-4">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleEdit(s)}
                                                title="Edit Schedule"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setScheduleToDelete(s)}
                                                title="Delete Schedule"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                              );
                          })}
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
