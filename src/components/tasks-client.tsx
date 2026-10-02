"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { Task, UserProfile } from '@/lib/types';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import {
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Pencil,
  Users,
  Calendar as CalendarIcon,
  RefreshCw,
  Search,
  CheckSquare,
  ListTodo,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateTaskCompletion, deleteTaskFromLead, getAllUsers, getAllUserTasks } from '@/services/firebase';
import { Checkbox } from '@/components/ui/checkbox';
import {
  format,
  isPast,
  isToday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  subMonths,
  addDays,
} from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { EditTaskDialog } from '@/components/edit-task-dialog';

type UserTask = Task & { leadId: string; leadName: string };

type TimeFramePreset = 'this_month' | 'today' | 'this_week' | 'next_30_days' | 'last_month' | 'all_time' | 'custom';

interface TasksClientPageProps {
  initialTasks: UserTask[];
  initialUser?: string;
}

export default function TasksClientPage({ initialTasks, initialUser }: TasksClientPageProps) {
  const [tasks, setTasks] = useState<UserTask[]>(initialTasks);
  const [loading, setLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<UserTask | null>(null);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);

  // Admin filter states
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [timeFrame, setTimeFrame] = useState<TimeFramePreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  const router = useRouter();
  const { user, userProfile, isSuperAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const isAdmin = Boolean(
    isSuperAdmin ||
    userProfile?.role === 'admin' ||
    userProfile?.activeRole === 'admin' ||
    (userProfile?.role as string)?.toLowerCase() === 'superadmin' ||
    (userProfile?.activeRole as string)?.toLowerCase() === 'superadmin'
  );

  const currentUserName = userProfile?.displayName || user?.displayName || '';

  // Calculate actual Date Range based on selected preset
  const { startDateISO, endDateISO, dateRangeLabel } = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    let label = '';

    switch (timeFrame) {
      case 'this_month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        label = `This Month (${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')})`;
        break;
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        label = `Today (${format(now, 'd MMM yyyy')})`;
        break;
      case 'this_week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        label = `This Week (${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')})`;
        break;
      case 'next_30_days':
        start = startOfDay(now);
        end = endOfDay(addDays(now, 30));
        label = `Next 30 Days (${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')})`;
        break;
      case 'last_month':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        label = `Last Month (${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')})`;
        break;
      case 'all_time':
        start = null;
        end = null;
        label = 'All Time';
        break;
      case 'custom':
        start = customStartDate ? startOfDay(new Date(customStartDate)) : null;
        end = customEndDate ? endOfDay(new Date(customEndDate)) : null;
        label = start && end
          ? `Custom (${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')})`
          : 'Custom Range';
        break;
    }

    return {
      startDateISO: start ? start.toISOString() : undefined,
      endDateISO: end ? end.toISOString() : undefined,
      dateRangeLabel: label,
    };
  }, [timeFrame, customStartDate, customEndDate]);

  // Load team users list for admins
  useEffect(() => {
    if (isAdmin) {
      getAllUsers()
        .then((users) => {
          const validUsers = users
            .filter((u) => u.displayName && u.displayName.trim() !== '')
            .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
          setUsersList(validUsers);
        })
        .catch((err) => console.error('Failed to load users for task filter:', err));
    }
  }, [isAdmin]);

  // Set initial selected user
  useEffect(() => {
    if (!isAdmin && currentUserName) {
      setSelectedUser(currentUserName);
    } else if (isAdmin && initialUser) {
      setSelectedUser(initialUser);
    }
  }, [isAdmin, currentUserName, initialUser]);

  // Fetch tasks when user or date filters change
  const fetchFilteredTasks = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      const targetUser = isAdmin ? selectedUser : currentUserName;
      const options = {
        startDate: startDateISO,
        endDate: endDateISO,
      };

      const fetched = await getAllUserTasks(targetUser, options);
      setTasks(fetched);
    } catch (err) {
      console.error('Error fetching filtered tasks:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to refresh tasks.' });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedUser, currentUserName, startDateISO, endDateISO, authLoading, toast]);

  useEffect(() => {
    fetchFilteredTasks();
  }, [fetchFilteredTasks]);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
    }
  }, [user, authLoading, router]);

  // Client-side text search filter
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase().trim();
    return tasks.filter((t) => {
      const titleMatch = t.title?.toLowerCase().includes(q);
      const leadMatch = t.leadName?.toLowerCase().includes(q);
      const authorMatch = t.author?.toLowerCase().includes(q);
      const assignedMatch = (t as any).dialerAssigned?.toLowerCase().includes(q);
      return titleMatch || leadMatch || authorMatch || assignedMatch;
    });
  }, [tasks, searchQuery]);

  // Categorize into Overdue, Upcoming, Completed
  const { overdue, upcoming, completed } = useMemo(() => {
    const overdue: UserTask[] = [];
    const upcoming: UserTask[] = [];
    const completed: UserTask[] = [];

    filteredTasks.forEach((task) => {
      if (task.isCompleted) {
        completed.push(task);
      } else if (isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))) {
        overdue.push(task);
      } else {
        upcoming.push(task);
      }
    });

    overdue.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    upcoming.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    completed.sort(
      (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.createdAt).getTime()
    );

    return { overdue, upcoming, completed };
  }, [filteredTasks]);

  const exportToCSV = () => {
    if (filteredTasks.length === 0) {
      toast({ title: 'No Data', description: 'No tasks to export for the selected filter.' });
      return;
    }

    const headers = [
      'Task Title',
      'Lead / Company Name',
      'Lead ID',
      'Status',
      'Due Date (Sydney)',
      'Assigned To',
      'Created By',
      'Created Date',
      'Completed Date',
      'Duration (Minutes)',
      'Outlook Synced'
    ];

    const rows = filteredTasks.map((t) => {
      let status = 'Upcoming';
      if (t.isCompleted) {
        status = 'Completed';
      } else if (isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))) {
        status = 'Overdue';
      } else if (isToday(new Date(t.dueDate))) {
        status = 'Due Today';
      }

      const dueDateFormatted = t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd HH:mm:ss') : '';
      const createdAtFormatted = t.createdAt ? format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm:ss') : '';
      const completedAtFormatted = t.completedAt ? format(new Date(t.completedAt), 'yyyy-MM-dd HH:mm:ss') : '';

      return [
        t.title || '',
        t.leadName || '',
        t.leadId || '',
        status,
        dueDateFormatted,
        (t as any).dialerAssigned || '',
        t.author || '',
        createdAtFormatted,
        completedAtFormatted,
        t.durationMinutes ? String(t.durationMinutes) : '',
        t.outlookEventId ? 'Yes' : 'No'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const userSuffix = selectedUser && selectedUser !== 'all' ? `_${selectedUser.replace(/\s+/g, '_')}` : '_all_users';
    const dateSuffix = format(new Date(), 'yyyyMMdd_HHmm');
    link.setAttribute('download', `tasks_export${userSuffix}_${dateSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Generated', description: `Exported ${filteredTasks.length} task(s) to CSV.` });
  };

  const handleToggleTask = async (task: UserTask, isCompleted: boolean) => {
    try {
      await updateTaskCompletion(task.leadId, task.id, isCompleted);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, isCompleted, completedAt: isCompleted ? new Date().toISOString() : undefined }
            : t
        )
      );
      toast({
        title: 'Success',
        description: `Task marked as ${isCompleted ? 'complete' : 'incomplete'}.`,
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update task.' });
    }
  };

  const handleDeleteTask = async (task: UserTask) => {
    try {
      await deleteTaskFromLead(task.leadId, task.id);

      // Delete from Outlook if synced
      const userEmail = userProfile?.email || user?.email || '';
      const userId = userProfile?.uid || user?.uid || '';
      if (userId && userEmail && task.outlookEventId) {
        fetch('/api/tasks/outlook-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            userId,
            userEmail,
            outlookEventId: task.outlookEventId,
          }),
        }).catch((e) => console.error('Failed to delete Outlook event:', e));
      }

      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      toast({ title: 'Success', description: 'Task deleted successfully.' });
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete task.' });
    }
  };

  const handleTaskUpdatedInPage = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? ({ ...t, ...updatedTask } as UserTask) : t))
    );
  };

  const renderTaskRow = (task: UserTask) => (
    <TableRow key={task.id} className="hover:bg-slate-50/80 transition-colors">
      <TableCell className="w-12">
        <Checkbox
          checked={task.isCompleted}
          onCheckedChange={(checked) => handleToggleTask(task, !!checked)}
          aria-label={`Mark task "${task.title}" as ${task.isCompleted ? 'incomplete' : 'complete'}`}
        />
      </TableCell>
      <TableCell>
        <p className={`font-medium ${task.isCompleted ? 'line-through text-muted-foreground' : 'text-slate-900'}`}>
          {task.title}
        </p>
      </TableCell>
      <TableCell>
        <Button variant="link" asChild className="p-0 h-auto font-semibold text-[#095c7b] hover:underline">
          <Link href={`/leads/${task.leadId}`}>{task.leadName || 'View Lead'}</Link>
        </Button>
      </TableCell>
      <TableCell>
        <Badge
          variant={
            task.isCompleted
              ? 'outline'
              : isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
              ? 'destructive'
              : 'secondary'
          }
          className={
            task.isCompleted
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
              ? 'bg-rose-100 text-rose-800 border-rose-200 font-semibold'
              : isToday(new Date(task.dueDate))
              ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
              : 'bg-sky-50 text-sky-800 border-sky-200'
          }
        >
          {format(new Date(task.dueDate), 'PP p')}
        </Badge>
      </TableCell>
      <TableCell>
        <p className="text-xs text-muted-foreground">
          {(task as any).dialerAssigned ? (
            <span className="font-medium text-slate-700">{(task as any).dialerAssigned}</span>
          ) : (
            task.author || 'Unassigned'
          )}
        </p>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingTask(task);
              setIsEditTaskOpen(true);
            }}
            title="Edit task"
          >
            <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            <span className="sr-only">Edit task</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteTask(task)}
            title="Delete task"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            <span className="sr-only">Delete task</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const TaskTable = ({ tasksList }: { tasksList: UserTask[] }) => (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50/50">
          <TableHead className="w-12"></TableHead>
          <TableHead className="font-semibold text-slate-700">Task</TableHead>
          <TableHead className="font-semibold text-slate-700">Lead / Customer</TableHead>
          <TableHead className="font-semibold text-slate-700">Due Date</TableHead>
          <TableHead className="font-semibold text-slate-700">Assigned To</TableHead>
          <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasksList.length > 0 ? (
          tasksList.map(renderTaskRow)
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center h-28 text-muted-foreground">
              No tasks found in this section for the selected filters.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#095c7b]/10 text-[#095c7b]">
              <ListTodo className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isAdmin ? 'Tasks & Reminders Management' : 'My Tasks'}
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage, schedule, and complete reminders across all customer accounts.
              </p>
            </div>
          </div>
        </div>

        {/* STATS OVERVIEW */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="px-3 py-1 bg-slate-50 text-slate-700 border-slate-200 font-medium">
            Total: <strong className="ml-1 text-slate-900">{filteredTasks.length}</strong>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-rose-50 text-rose-700 border-rose-200 font-medium">
            Overdue: <strong className="ml-1 text-rose-900">{overdue.length}</strong>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-sky-50 text-sky-700 border-sky-200 font-medium">
            Upcoming: <strong className="ml-1 text-sky-900">{upcoming.length}</strong>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
            Completed: <strong className="ml-1 text-emerald-900">{completed.length}</strong>
          </Badge>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* USER FILTER (Admins & Superadmins) */}
          {isAdmin ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#095c7b]" />
                Filter by User
              </label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full h-9 bg-slate-50/50 border-slate-300">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all" className="font-semibold text-[#095c7b]">
                    👥 All Team Members (All Users)
                  </SelectItem>
                  {usersList.map((u) => (
                    <SelectItem key={u.uid} value={u.displayName || u.email || u.uid}>
                      👤 {u.displayName || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#095c7b]" />
                Assigned User
              </label>
              <div className="h-9 px-3 flex items-center bg-slate-100 border border-slate-200 rounded-md text-sm text-slate-700 font-medium">
                {currentUserName || 'Current User'}
              </div>
            </div>
          )}

          {/* TIME FRAME FILTER */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-[#095c7b]" />
              Time Frame
            </label>
            <Select value={timeFrame} onValueChange={(v) => setTimeFrame(v as TimeFramePreset)}>
              <SelectTrigger className="w-full h-9 bg-slate-50/50 border-slate-300 font-medium">
                <SelectValue placeholder="Select period..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">📅 This Month (Default)</SelectItem>
                <SelectItem value="today">⏰ Today</SelectItem>
                <SelectItem value="this_week">🗓️ This Week</SelectItem>
                <SelectItem value="next_30_days">⏩ Next 30 Days</SelectItem>
                <SelectItem value="last_month">⏪ Last Month</SelectItem>
                <SelectItem value="all_time">🌐 All Time</SelectItem>
                <SelectItem value="custom">⚙️ Custom Date Range...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* SEARCH FILTER */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-[#095c7b]" />
              Quick Search
            </label>
            <div className="relative">
              <Input
                placeholder="Filter by title, company, lead..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pr-8 bg-slate-50/50 border-slate-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* ACTIONS / REFRESH & EXPORT */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 flex-1 border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1.5 font-medium text-slate-700"
                onClick={fetchFilteredTasks}
                disabled={loading}
                title="Refresh current tasks"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#095c7b]' : ''}`} />
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
              <Button
                size="sm"
                className="h-9 flex-1 bg-[#095c7b] hover:bg-[#053647] text-white flex items-center justify-center gap-1.5 font-medium shadow-sm"
                onClick={exportToCSV}
                disabled={loading || filteredTasks.length === 0}
                title="Export filtered tasks to CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>
        </div>

        {/* CUSTOM DATE RANGE PICKERS (If Custom selected) */}
        {timeFrame === 'custom' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 bg-slate-50/80 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Start Date:</label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 w-40 text-xs bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">End Date:</label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 w-40 text-xs bg-white"
              />
            </div>
          </div>
        )}

        {/* ACTIVE FILTER SUMMARY LABEL */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-2">
            <span>Active Range:</span>
            <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border-none font-semibold">
              {dateRangeLabel}
            </Badge>
            {isAdmin && selectedUser !== 'all' && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-none font-semibold">
                👤 {selectedUser}
              </Badge>
            )}
          </div>
          <div>
            Showing <strong>{filteredTasks.length}</strong> tasks
          </div>
        </div>
      </div>

      {/* TASKS ACCORDION CONTENT */}
      {loading ? (
        <div className="flex h-64 w-full items-center justify-center flex-col gap-3 bg-white rounded-xl border border-slate-200">
          <Loader />
          <p className="text-xs text-muted-foreground animate-pulse">Loading filtered tasks...</p>
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={['overdue', 'upcoming']} className="w-full space-y-4">
          {/* OVERDUE TASKS */}
          <Card className="border-slate-200 overflow-hidden shadow-sm">
            <AccordionItem value="overdue" className="border-b-0">
              <AccordionTrigger className="px-6 py-4 hover:bg-slate-50/50 hover:no-underline">
                <CardTitle className="flex items-center gap-3 text-rose-700 text-base font-bold">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                  <span>Overdue Tasks & Reminders (Action Required)</span>
                  <Badge variant="destructive" className="bg-rose-100 text-rose-800 border-rose-200 font-bold">
                    {overdue.length}
                  </Badge>
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="p-0 border-t border-slate-100">
                <TaskTable tasksList={overdue} />
              </AccordionContent>
            </AccordionItem>
          </Card>

          {/* UPCOMING & TODAY TASKS */}
          <Card className="border-slate-200 overflow-hidden shadow-sm">
            <AccordionItem value="upcoming" className="border-b-0">
              <AccordionTrigger className="px-6 py-4 hover:bg-slate-50/50 hover:no-underline">
                <CardTitle className="flex items-center gap-3 text-slate-800 text-base font-bold">
                  <Clock className="h-5 w-5 text-[#095c7b]" />
                  <span>Today & Upcoming Tasks</span>
                  <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border-none font-bold">
                    {upcoming.length}
                  </Badge>
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="p-0 border-t border-slate-100">
                <TaskTable tasksList={upcoming} />
              </AccordionContent>
            </AccordionItem>
          </Card>

          {/* COMPLETED TASKS */}
          <Card className="border-slate-200 overflow-hidden shadow-sm">
            <AccordionItem value="completed" className="border-b-0">
              <AccordionTrigger className="px-6 py-4 hover:bg-slate-50/50 hover:no-underline">
                <CardTitle className="flex items-center gap-3 text-slate-600 text-base font-bold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>Completed Tasks</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">
                    {completed.length}
                  </Badge>
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="p-0 border-t border-slate-100">
                <TaskTable tasksList={completed} />
              </AccordionContent>
            </AccordionItem>
          </Card>
        </Accordion>
      )}

      {/* EDIT TASK DIALOG */}
      <EditTaskDialog
        task={editingTask}
        open={isEditTaskOpen}
        onOpenChange={setIsEditTaskOpen}
        onTaskUpdated={handleTaskUpdatedInPage}
      />
    </div>
  );
}
