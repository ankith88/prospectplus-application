
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getAllUsers, getFieldSalesSchedules, saveFieldSalesSchedule } from '@/services/firebase';
import type { UserProfile, FieldSalesSchedule } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Calendar, Clock, Save, User, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { sendScheduleToNetSuite } from '@/services/netsuite-schedule-proxy';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TeamSchedulesPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [schedules, setSchedules] = useState<FieldSalesSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const { userProfile } = useAuth();

  // Form State
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

  const handleSelectUser = (uid: string) => {
    setSelectedUserId(uid);
    const existing = schedules.find(s => s.userId === uid);
    if (existing) {
        setWorkingDays(existing.workingDays);
        setStartTime(existing.startTime);
        setEndTime(existing.endTime);
    } else {
        setWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
        setStartTime('09:00');
        setEndTime('17:00');
    }
  };

  const handleToggleDay = (day: string) => {
    setWorkingDays(prev => 
        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    const user = users.find(u => u.uid === selectedUserId);
    if (!user) return;

    setIsSaving(true);
    try {
      const scheduleData = {
        userId: selectedUserId,
        userName: user.displayName || user.email,
        workingDays,
        startTime,
        endTime
      };

      // 1. Save to Firebase
      await saveFieldSalesSchedule(selectedUserId, scheduleData);
      
      // 2. Sync with NetSuite
      const syncResult = await sendScheduleToNetSuite(scheduleData);
      
      // 3. Update local state
      setSchedules(prev => {
          const index = prev.findIndex(s => s.userId === selectedUserId);
          if (index > -1) {
              const next = [...prev];
              next[index] = { ...scheduleData, id: selectedUserId, updatedAt: new Date().toISOString() };
              return next;
          }
          return [...prev, { ...scheduleData, id: selectedUserId, updatedAt: new Date().toISOString() }];
      });

      if (syncResult.success) {
          toast({ title: 'Schedule Saved', description: `Working hours updated and synced with NetSuite for ${user.displayName}.` });
      } else {
          toast({ variant: 'destructive', title: 'Partial Success', description: `Schedule saved locally, but failed to sync with NetSuite: ${syncResult.message}` });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save schedule.' });
    } finally {
      setIsSaving(false);
    }
  };

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
            <CardTitle>Select Representative</CardTitle>
            <CardDescription>Choose a team member to define their schedule.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                <Select value={selectedUserId} onValueChange={handleSelectUser}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a representative..." />
                    </SelectTrigger>
                    <SelectContent>
                        {users.map(u => (
                            <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {selectedUserId && (
                    <div className="space-y-6 pt-4 animate-in fade-in">
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
            </div>
          </CardContent>
          <CardFooter>
              <Button className="w-full" disabled={!selectedUserId || isSaving} onClick={handleSave}>
                  {isSaving ? <Loader /> : <><Save className="mr-2 h-4 w-4" /> Save Schedule</>}
              </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current Team Schedules</CardTitle>
            <CardDescription>Overview of active working windows.</CardDescription>
          </CardHeader>
          <CardContent>
              <ScrollArea className="h-64">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Representative</TableHead>
                              <TableHead>Days</TableHead>
                              <TableHead>Window</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {schedules.map(s => (
                              <TableRow key={s.id} className={cn(selectedUserId === s.userId && "bg-muted")}>
                                  <TableCell className="font-medium">{s.userName}</TableCell>
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
                              </TableRow>
                          ))}
                          {schedules.length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">No schedules defined yet.</TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
