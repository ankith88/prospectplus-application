
'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Clock, User, Mail, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import type { Lead } from '@/lib/types'
import { logActivity } from '@/services/firebase'
import { cn } from '@/lib/utils'
import { Loader } from './ui/loader'
import { getAvailability } from '@/ai/flows/get-availability-tool'

interface AppointmentSchedulerProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  lead: Lead
  contactName: string
  contactEmail: string
  onAppointmentBooked: () => void
}

export function AppointmentScheduler({
  isOpen,
  onOpenChange,
  lead,
  contactName,
  contactEmail,
  onAppointmentBooked,
}: AppointmentSchedulerProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [step, setStep] = useState<'schedule' | 'confirm' | 'booked'>('schedule')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingAvailability, setIsFetchingAvailability] = useState(false)
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const { toast } = useToast()

  const salesRep = lead.salesRepAssigned || 'Default'
  
  const fetchAvailability = useCallback(async (selectedDate: Date) => {
    if (!salesRep) return
    setIsFetchingAvailability(true)
    try {
        const result = await getAvailability({ 
            salesRepName: salesRep, 
            date: selectedDate.toISOString() 
        });
        setTimeSlots(result.timeSlots);
    } catch (error) {
        console.error("Failed to fetch availability:", error)
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch available time slots.",
        })
        setTimeSlots([]);
    } finally {
        setIsFetchingAvailability(false)
    }
  }, [salesRep, toast]);

  useEffect(() => {
    if (date) {
        fetchAvailability(date)
    }
  }, [date, fetchAvailability]);


  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    setSelectedTime(null) // Reset time when date changes
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep('confirm')
  }
  
  const handleConfirmBooking = async () => {
    if (!date || !selectedTime) return
    setIsLoading(true)

    try {
      const meetingTime = format(date, 'PPP') + ` at ${selectedTime}`
      await logActivity(lead.id, {
        type: 'Meeting',
        notes: `Scheduled a meeting with ${contactName} for ${meetingTime}. Rep: ${salesRep}`,
      })
      
      toast({
        title: "Appointment Booked!",
        description: `Meeting scheduled with ${contactName} for ${meetingTime}.`,
      })
      
      setStep('booked')
    } catch (error) {
      console.error("Failed to book appointment:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to book the appointment. Please try again.",
      })
    } finally {
        setIsLoading(false)
    }
  }

  const handleClose = () => {
    // If booking was successful, trigger the callback
    if (step === 'booked') {
        onAppointmentBooked()
    }
    onOpenChange(false)
    // Reset state after a short delay to allow dialog to close smoothly
    setTimeout(() => {
        setDate(new Date())
        setSelectedTime(null)
        setStep('schedule')
    }, 300);
  }

  const renderScheduler = () => (
    <>
      <DialogHeader>
        <DialogTitle>Book an Appointment</DialogTitle>
        <DialogDescription>
          Select a date and time for your meeting with {lead.salesRepAssigned || 'the sales team'}.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Select a Date</h3>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={(day) => day < new Date(new Date().setDate(new Date().getDate() - 1))}
            className="rounded-md border"
          />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">
            Select a Time
          </h3>
          {isFetchingAvailability ? (
             <div className="h-full flex items-center justify-center">
                <Loader />
             </div>
          ) : date ? (
             timeSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((time) => (
                    <Button
                    key={time}
                    variant="outline"
                    onClick={() => handleTimeSelect(time)}
                    >
                    {time}
                    </Button>
                ))}
                </div>
             ) : (
                <p className="text-sm text-muted-foreground">No available slots on this day.</p>
             )
          ) : (
            <p className="text-sm text-muted-foreground">Please select a date first.</p>
          )}
        </div>
      </div>
    </>
  );

  const renderConfirmation = () => (
     <>
      <DialogHeader>
        <DialogTitle>Confirm Your Booking</DialogTitle>
        <DialogDescription>
          Please review the details below before confirming.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="p-4 border rounded-lg space-y-3">
             <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{date && selectedTime ? `${format(date, 'PPPP')} at ${selectedTime}`: ''}</span>
             </div>
             <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{contactName}</span>
             </div>
             <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{contactEmail}</span>
             </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={() => setStep('schedule')}>Back</Button>
        <Button onClick={handleConfirmBooking} disabled={isLoading}>
            {isLoading ? <Loader /> : 'Confirm & Book'}
        </Button>
      </div>
     </>
  );

  const renderBooked = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-center">Appointment Booked!</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <p className="text-lg font-medium">Your meeting has been scheduled successfully.</p>
        <div className="text-muted-foreground text-sm">
            <p>A calendar invitation will be sent to {contactEmail}.</p>
            <p>Lead status has been updated to 'Qualified'.</p>
        </div>
        <Button onClick={handleClose}>
          Done
        </Button>
      </div>
    </>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl" onInteractOutside={(e) => { e.preventDefault(); }}>
        {step === 'schedule' && renderScheduler()}
        {step === 'confirm' && renderConfirmation()}
        {step === 'booked' && renderBooked()}
      </DialogContent>
    </Dialog>
  )
}
