"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { format, addDays, isBefore, startOfDay, isSameDay } from 'date-fns';
import { Phone, Video, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';

interface AvailableSlot {
  start: string; // ISO string
  end: string;
}

export default function BookingPage() {
  const params = useParams();
  const bookingUrlId = params.bookingUrlId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadName, setLeadName] = useState('');
  const [amName, setAmName] = useState('');
  const [amId, setAmId] = useState('');

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  const [meetingType, setMeetingType] = useState<'phone' | 'teams'>('phone');
  const [isBooking, setIsBooking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch lead and AM info
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/calendar/availability?bookingUrlId=${bookingUrlId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load booking info');

        setLeadName(data.leadName);
        setAmName(data.amName);
        setAmId(data.amId);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [bookingUrlId]);

  // Fetch slots when date changes
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedDate || !amId) return;
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const res = await fetch(`/api/calendar/availability?amId=${amId}&date=${dateStr}`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to fetch slots');
        setAvailableSlots(data.slots || []);
      } catch (err: any) {
        toast.error('Failed to load available times');
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDate, amId]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setIsBooking(true);
    try {
      const res = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingUrlId,
          amId,
          slot: selectedSlot,
          meetingType
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book appointment');

      setIsSuccess(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader /></div>;

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Card className="max-w-md w-full mx-4 shadow-lg border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Booking Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 p-4">
        <Card className="max-w-md w-full shadow-lg border-emerald-100 text-center">
          <CardContent className="pt-8 pb-8 flex flex-col items-center">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Booking Confirmed!</h2>
            <p className="text-slate-500 mb-6">
              Your appointment with {amName} has been scheduled. A calendar invitation has been sent to your email.
            </p>
            {selectedSlot && (
              <div className="bg-slate-50 p-4 rounded-lg w-full border border-slate-100 mb-6 text-left">
                <p className="text-sm font-medium text-slate-700 mb-1">When</p>
                <p className="text-slate-900 flex items-center gap-2 mb-3">
                  <CalendarIcon className="h-4 w-4 text-[#095c7b]" />
                  {format(new Date(selectedSlot), 'EEEE, MMMM d, yyyy @ h:mm a')}
                </p>
                <p className="text-sm font-medium text-slate-700 mb-1">How</p>
                <p className="text-slate-900 flex items-center gap-2">
                  {meetingType === 'teams' ? <Video className="h-4 w-4 text-[#095c7b]" /> : <Phone className="h-4 w-4 text-[#095c7b]" />}
                  {meetingType === 'teams' ? 'Microsoft Teams Meeting' : 'Phone Call'}
                </p>
              </div>
            )}
            <Button className="bg-[#095c7b] hover:bg-[#095c7b]/90 text-white w-full" onClick={() => window.location.href = '/'}>
              Return to Website
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#d0dfcd]/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl border-[#095c7b]/10 bg-white/95 backdrop-blur-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3">
            {/* Left Sidebar - Details */}
            <div className="bg-[#095c7b] text-white p-8 md:col-span-1 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">ProspectPlus</h2>
                <div className="h-1 w-12 bg-[#eaf143] rounded mb-8"></div>
                
                <h3 className="text-lg font-semibold text-white/90 mb-1">Appointment with</h3>
                <p className="text-2xl font-bold mb-6">{amName}</p>
                
                <h3 className="text-lg font-semibold text-white/90 mb-1">For</h3>
                <p className="text-xl mb-6">{leadName}</p>
              </div>
              <div className="mt-8 pt-8 border-t border-white/20">
                <p className="text-sm text-white/80">
                  Select a date and time to schedule your 30-minute discussion.
                </p>
              </div>
            </div>

            {/* Right Side - Booking Flow */}
            <div className="p-8 md:col-span-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Calendar Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-[#095c7b] mb-4">Select Date</h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date())) || date.getDay() === 0 || date.getDay() === 6}
                      className="rounded-md"
                    />
                  </div>
                </div>

                {/* Time & Meeting Type Selection */}
                <div className="flex flex-col h-full">
                  <h3 className="text-lg font-semibold text-[#095c7b] mb-4">
                    {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Available Times'}
                  </h3>
                  
                  <div className="flex-1 max-h-[250px] overflow-y-auto pr-2 space-y-2">
                    {loadingSlots ? (
                      <div className="flex justify-center py-8"><Loader /></div>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">No available times on this date.</p>
                    ) : (
                      availableSlots.map((slot) => {
                        const timeString = format(new Date(slot.start), 'h:mm a');
                        const isSelected = selectedSlot === slot.start;
                        return (
                          <Button
                            key={slot.start}
                            variant={isSelected ? "default" : "outline"}
                            className={`w-full justify-center text-sm font-medium transition-all ${isSelected ? 'bg-[#095c7b] text-white hover:bg-[#095c7b]/90 border-[#095c7b]' : 'border-[#095c7b]/20 text-[#095c7b] hover:bg-[#095c7b]/5'}`}
                            onClick={() => setSelectedSlot(slot.start)}
                          >
                            {timeString}
                          </Button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Section - Options & Submit */}
              {selectedSlot && (
                <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h3 className="text-lg font-semibold text-[#095c7b] mb-4">Meeting Type</h3>
                  <RadioGroup value={meetingType} onValueChange={(val: any) => setMeetingType(val)} className="flex flex-col space-y-3 mb-8">
                    <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setMeetingType('phone')}>
                      <RadioGroupItem value="phone" id="r1" />
                      <Label htmlFor="r1" className="flex items-center gap-2 cursor-pointer text-base">
                        <Phone className="h-4 w-4 text-[#095c7b]" />
                        Phone Call
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setMeetingType('teams')}>
                      <RadioGroupItem value="teams" id="r2" />
                      <Label htmlFor="r2" className="flex items-center gap-2 cursor-pointer text-base">
                        <Video className="h-4 w-4 text-[#095c7b]" />
                        Microsoft Teams Meeting
                      </Label>
                    </div>
                  </RadioGroup>

                  <Button 
                    className="w-full bg-[#eaf143] hover:bg-[#d5dc3a] text-[#095c7b] font-bold text-lg h-12"
                    onClick={handleBook}
                    disabled={isBooking}
                  >
                    {isBooking ? <Loader className="h-5 w-5" /> : `Confirm Booking`}
                  </Button>
                </div>
              )}

            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
