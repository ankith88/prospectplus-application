
'use client'

import { Bell, ListTodo } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from './ui/button'
import { useEffect, useState } from 'react'
import type { Task, Lead } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { getAllUserTasks } from '@/services/firebase'
import { Badge } from './ui/badge'
import { Loader } from './ui/loader'
import { format, isPast, isToday } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function TaskReminderBell() {
  const [tasks, setTasks] = useState<Array<Task & { leadId: string; leadName: string }>>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user?.displayName) return
      setLoading(true)
      try {
        const userTasks = await getAllUserTasks(user.displayName)
        setTasks(userTasks)
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()

    // Optionally, refresh tasks periodically
    const interval = setInterval(fetchTasks, 5 * 60 * 1000) // every 5 minutes
    return () => clearInterval(interval)
  }, [user])

  const dueTasks = tasks.filter(
    (task) => !task.isCompleted && (isPast(new Date(task.dueDate)) || isToday(new Date(task.dueDate)))
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {dueTasks.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0"
            >
              {dueTasks.length}
            </Badge>
          )}
          <span className="sr-only">Task Reminders</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                Task Reminders
            </h4>
            <p className="text-sm text-muted-foreground">
              You have {dueTasks.length} task(s) due.
            </p>
          </div>
          <div className="grid gap-2">
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader />
              </div>
            ) : dueTasks.length > 0 ? (
              dueTasks.map((task) => (
                <div key={task.id} className="grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
                  <span className={cn(
                      "flex h-2 w-2 translate-y-1 rounded-full",
                      isPast(new Date(task.dueDate)) ? 'bg-red-500' : 'bg-yellow-500'
                  )} />
                  <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">
                      <Link href={`/leads/${task.leadId}`} className="hover:underline">
                        {task.leadName}
                      </Link>
                    </p>
                    <p className="text-sm text-muted-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground">Due: {format(new Date(task.dueDate), 'PP')}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-center text-muted-foreground p-4">
                No overdue or upcoming tasks.
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
