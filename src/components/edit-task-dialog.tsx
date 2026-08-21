"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, Clock, CalendarDays } from 'lucide-react'
import { format, setHours, setMinutes, parseISO } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { updateTaskInLead } from '@/services/firebase'
import type { Task } from '@/lib/types'

interface EditTaskDialogProps {
  task: (Task & { leadId?: string; leadName?: string }) | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskUpdated?: (updatedTask: Task) => void
}

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
}: EditTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [dueTime, setDueTime] = useState('09:00')
  const [durationMinutes, setDurationMinutes] = useState('30')
  const [loading, setLoading] = useState(false)

  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (task && open) {
      setTitle(task.title || '')
      const initialDate = task.dueDate ? new Date(task.dueDate) : new Date()
      setDueDate(initialDate)
      
      const hours = String(initialDate.getHours()).padStart(2, '0')
      const minutes = String(initialDate.getMinutes()).padStart(2, '0')
      setDueTime(`${hours}:${minutes}`)
      
      setDurationMinutes(String(task.durationMinutes || 30))
    }
  }, [task, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task || !title.trim() || !dueDate) return

    setLoading(true)
    try {
      const [hStr, mStr] = dueTime.split(':')
      const h = parseInt(hStr || '9', 10)
      const m = parseInt(mStr || '0', 10)

      const finalDueDate = setMinutes(setHours(dueDate, h), m)
      const dueDateIso = finalDueDate.toISOString()
      const duration = parseInt(durationMinutes, 10) || 30

      const updates: Partial<Task> = {
        title: title.trim(),
        dueDate: dueDateIso,
        durationMinutes: duration,
      }

      // If task belongs to a lead, update in Firestore
      const targetLeadId = task.leadId
      if (targetLeadId) {
        await updateTaskInLead(targetLeadId, task.id, updates)
      }

      // Attempt Outlook Sync if eligible
      const userEmail = userProfile?.email || user?.email || ''
      const userId = userProfile?.uid || user?.uid || ''

      let outlookEventId = task.outlookEventId

      if (userId && userEmail) {
        try {
          const syncRes = await fetch('/api/tasks/outlook-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              userId,
              userEmail,
              title: title.trim(),
              dueDate: dueDateIso,
              durationMinutes: duration,
              leadId: targetLeadId,
              leadName: task.leadName,
              outlookEventId: task.outlookEventId,
            }),
          })
          const syncData = await syncRes.json()
          if (syncData.synced && syncData.outlookEventId) {
            outlookEventId = syncData.outlookEventId
            updates.outlookEventId = outlookEventId
            if (targetLeadId) {
              await updateTaskInLead(targetLeadId, task.id, { outlookEventId })
            }
          }
        } catch (syncErr) {
          console.error('Failed to sync task edit with Outlook:', syncErr)
        }
      }

      const updatedTask: Task = {
        ...task,
        ...updates,
        outlookEventId,
      }

      toast({
        title: 'Task Updated',
        description: 'Task details and schedule have been updated.',
      })

      if (onTaskUpdated) {
        onTaskUpdated(updatedTask)
      }
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to update task:', error)
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not update task.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Edit Task / Reminder
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Follow up on proposal"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PP') : 'Select Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <div className="relative">
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Calendar Duration (for Outlook Block)</Label>
            <Select value={durationMinutes} onValueChange={setDurationMinutes}>
              <SelectTrigger>
                <SelectValue placeholder="Duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes (Default)</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
