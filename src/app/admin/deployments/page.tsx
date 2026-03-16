
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getDailyAreaLogs, getFieldSalesSchedules, deleteDailyAreaLog } from '@/services/firebase';
import type { DailyDeployment, FieldSalesSchedule } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { MapPin, Calendar as CalendarIcon, Clock, Filter, AlertCircle, CheckCircle2, User, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO, isValid } from 'date-fns';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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

export default function DeploymentHistoryPage() {
  const [logs, setLogs] = useState<DailyDeployment[]>([]);
  const [schedules, setSchedules] = useState<FieldSalesSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState('');
  const [userFilter, setUserFilter] = useState<string[]>([]);
  
  const [logToDelete, setLogToDelete] = useState<DailyDeployment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedLogs, fetchedSchedules] = await Promise.all([
          getDailyAreaLogs(),
          getFieldSalesSchedules()
        ]);
        setLogs(fetchedLogs);
        setSchedules(fetchedSchedules);
      } catch (error) {
        console.error("Failed to fetch deployments:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const userOptions: Option[] = useMemo(() => {
    const users = new Set(logs.map(l => l.userName));
    return Array.from(users).map(u => ({ value: u, label: u }));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const nameMatch = nameFilter ? log.area.toLowerCase().includes(nameFilter.toLowerCase()) : true;
      const userMatch = userFilter.length === 0 || userFilter.includes(log.userName);
      return nameMatch && userMatch;
    });
  }, [logs, nameFilter, userFilter]);

  const getComplianceStatus = (log: DailyDeployment) => {
    const schedule = schedules.find(s => s.userId === log.userId);
    if (!schedule) return { label: 'No Schedule', color: 'bg-gray-100 text-gray-600' };

    if (!log.date) return { label: 'Invalid Date', color: 'bg-gray-100 text-gray-600' };
    const logDate = parseISO(log.date);
    if (!isValid(logDate)) return { label: 'Invalid Date', color: 'bg-gray-100 text-gray-600' };

    const dayName = format(logDate, 'EEE');
    const isWorkingDay = schedule.workingDays.includes(dayName);

    if (!isWorkingDay) return { label: 'Unscheduled Day', color: 'bg-yellow-100 text-yellow-700' };

    // Simple time check (assuming HH:mm format)
    if (log.startTime > schedule.startTime) {
        return { label: 'Late Start', color: 'bg-red-100 text-red-700' };
    }

    return { label: 'On Time', color: 'bg-green-100 text-green-700' };
  };

  const handleDeleteLog = async () => {
      if (!logToDelete) return;
      setIsDeleting(true);
      try {
          await deleteDailyAreaLog(logToDelete.id);
          setLogs(prev => prev.filter(l => l.id !== logToDelete.id));
          toast({ title: 'Record Deleted', description: `Deployment log for ${logToDelete.userName} in ${logToDelete.area} has been removed.` });
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the deployment log.' });
      } finally {
          setIsDeleting(false);
          setLogToDelete(null);
      }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader /></div>;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Deployment History</h1>
        <p className="text-muted-foreground">Log of daily field sales deployment areas and start times.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Representative</Label>
                <MultiSelectCombobox 
                    options={userOptions}
                    selected={userFilter}
                    onSelectedChange={setUserFilter}
                    placeholder="Filter by user..."
                />
            </div>
            <div className="space-y-2">
                <Label>Area Search</Label>
                <Input 
                    placeholder="Search by area name..." 
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Activity Log</CardTitle>
          <CardDescription>Chronological history of team field coverage.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Representative</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(log => {
                const status = getComplianceStatus(log);
                const parsedDate = log.date ? parseISO(log.date) : null;
                const dateDisplay = (parsedDate && isValid(parsedDate)) ? format(parsedDate, 'PP') : 'N/A';

                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                        {dateDisplay}
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {log.userName}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {log.area}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {log.startTime}
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge className={cn("border-none", status.color)}>
                            {status.label === 'On Time' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <AlertCircle className="mr-1 h-3 w-3" />}
                            {status.label}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setLogToDelete(log)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredLogs.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">No deployment logs found.</TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!logToDelete} onOpenChange={(open) => !open && setLogToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deployment Log?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the deployment record for <strong>{logToDelete?.userName}</strong> in <strong>{logToDelete?.area}</strong> on <strong>{logToDelete?.date}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleDeleteLog} 
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {isDeleting ? <Loader /> : 'Delete Record'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
