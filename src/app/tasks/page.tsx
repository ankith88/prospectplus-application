
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
import type { Task } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Trash2, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getAllUserTasks, updateTaskCompletion, deleteTaskFromLead } from '@/services/firebase'
import { Checkbox } from '@/components/ui/checkbox'
import { format, isPast, isToday } from 'date-fns'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

type UserTask = Task & { leadId: string; leadName: string };

export default function TasksPage() {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (userProfile?.displayName) {
        setLoading(true);
        try {
          const userTasks = await getAllUserTasks(userProfile.displayName);
          setTasks(userTasks);
        } catch (error) {
          console.error("Failed to fetch tasks:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your tasks.' });
        } finally {
          setLoading(false);
        }
      }
    };

    if (!authLoading && userProfile?.displayName) {
        fetchTasks();
    }
  }, [userProfile?.displayName, authLoading, toast]);


  const { overdue, upcoming, completed } = useMemo(() => {
    const overdue: UserTask[] = [];
    const upcoming: UserTask[] = [];
    const completed: UserTask[] = [];

    tasks.forEach(task => {
      if (task.isCompleted) {
        completed.push(task);
      } else if (isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))) {
        overdue.push(task);
      } else {
        upcoming.push(task);
      }
    });

    // Sort by due date
    overdue.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    upcoming.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    completed.sort((a, b) => (b.completedAt ? new Date(b.completedAt).getTime() : 0) - (a.completedAt ? new Date(a.createdAt).getTime() : 0));


    return { overdue, upcoming, completed };
  }, [tasks]);

  const handleToggleTask = async (task: UserTask, isCompleted: boolean) => {
      try {
          await updateTaskCompletion(task.leadId, task.id, isCompleted);
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted, completedAt: isCompleted ? new Date().toISOString() : undefined } : t));
          toast({ title: 'Success', description: `Task marked as ${isCompleted ? 'complete' : 'incomplete'}.` });
      } catch (error) {
          console.error("Failed to update task:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to update task." });
      }
  };

  const handleDeleteTask = async (task: UserTask) => {
      try {
          await deleteTaskFromLead(task.leadId, task.id);
          setTasks(prev => prev.filter(t => t.id !== task.id));
          toast({ title: 'Success', description: 'Task deleted successfully.' });
      } catch (error) {
          console.error("Failed to delete task:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to delete task." });
      }
  };

  const renderTaskRow = (task: UserTask) => (
     <TableRow key={task.id}>
        <TableCell className="w-12">
            <Checkbox
                checked={task.isCompleted}
                onCheckedChange={(checked) => handleToggleTask(task, !!checked)}
                aria-label={`Mark task "${task.title}" as ${task.isCompleted ? 'incomplete' : 'complete'}`}
            />
        </TableCell>
        <TableCell>
            <p className="font-medium">{task.title}</p>
        </TableCell>
        <TableCell>
            <Button variant="link" asChild className="p-0 h-auto">
                <Link href={`/leads/${task.leadId}`}>{task.leadName}</Link>
            </Button>
        </TableCell>
        <TableCell>
            <Badge variant={isPast(new Date(task.dueDate)) && !task.isCompleted ? "destructive" : "outline"}>
                {format(new Date(task.dueDate), 'PP')}
            </Badge>
        </TableCell>
         <TableCell>
            <p className="text-muted-foreground">{task.author}</p>
        </TableCell>
        <TableCell className="text-right">
             <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete task</span>
            </Button>
        </TableCell>
    </TableRow>
  );

  const TaskTable = ({ tasks }: { tasks: UserTask[] }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead></TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {tasks.length > 0 ? tasks.map(renderTaskRow) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No tasks in this category.</TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
  );


  if (authLoading || loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">Manage all your scheduled reminders and tasks.</p>
      </header>
        
       <Accordion type="multiple" defaultValue={['overdue', 'upcoming']} className="w-full space-y-4">
          <Card>
             <AccordionItem value="overdue" className="border-b-0">
                <AccordionTrigger className="p-6">
                    <CardTitle className="flex items-center gap-3 text-red-600">
                        <AlertCircle />
                        <span>Overdue</span>
                        <Badge variant="destructive">{overdue.length}</Badge>
                    </CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent>
                       <TaskTable tasks={overdue} />
                    </CardContent>
                </AccordionContent>
             </AccordionItem>
          </Card>
          
           <Card>
             <AccordionItem value="upcoming" className="border-b-0">
                <AccordionTrigger className="p-6">
                    <CardTitle className="flex items-center gap-3">
                        <Clock />
                        <span>Upcoming</span>
                         <Badge variant="secondary">{upcoming.length}</Badge>
                    </CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent>
                       <TaskTable tasks={upcoming} />
                    </CardContent>
                </AccordionContent>
             </AccordionItem>
          </Card>

          <Card>
             <AccordionItem value="completed" className="border-b-0">
                <AccordionTrigger className="p-6">
                    <CardTitle className="flex items-center gap-3 text-gray-500">
                        <CheckCircle2 />
                        <span>Completed</span>
                         <Badge variant="default">{completed.length}</Badge>
                    </CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent>
                       <TaskTable tasks={completed} />
                    </CardContent>
                </AccordionContent>
             </AccordionItem>
          </Card>
       </Accordion>
    </div>
  )
}
