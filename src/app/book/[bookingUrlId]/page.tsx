"use client"

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { format, isBefore, startOfDay } from 'date-fns';
import { Phone, Video, Calendar as CalendarIcon, CheckCircle2, Clock, Globe } from 'lucide-react';

interface AvailableSlot {
  start: string; // ISO string
  end: string;
}

export default function BookingPage() {
  const params = useParams();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const bookingUrlId = params.bookingUrlId as string;
  const isEmbed = searchParams?.get('embed') === 'true';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadName, setLeadName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
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
        setContactName(data.contactName);
        setContactEmail(data.contactEmail);
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

  if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50"><Loader /></div>;

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
        <Card className="max-w-md w-full shadow-lg border-emerald-100 text-center rounded-2xl overflow-hidden">
          <CardContent className="pt-10 pb-10 flex flex-col items-center">
            <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">You are scheduled</h2>
            <p className="text-slate-600 mb-8 px-4">
              A calendar invitation has been sent to your email address.
            </p>
            {selectedSlot && (
              <div className="bg-white p-6 rounded-xl w-full border border-slate-200 shadow-sm mb-6 text-left space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">What</p>
                  <p className="text-slate-900 font-medium text-lg">Discussion with {amName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">When</p>
                  <p className="text-slate-900 flex items-center gap-2 font-medium">
                    <CalendarIcon className="h-4 w-4 text-slate-500" />
                    {format(new Date(selectedSlot), 'EEEE, MMMM d, yyyy')}
                    <br/>
                    {format(new Date(selectedSlot), 'h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">How</p>
                  <p className="text-slate-900 flex items-center gap-2 font-medium">
                    {meetingType === 'teams' ? <Video className="h-4 w-4 text-blue-600" /> : <Phone className="h-4 w-4 text-emerald-600" />}
                    {meetingType === 'teams' ? 'Microsoft Teams Meeting' : 'Phone Call'}
                  </p>
                </div>
              </div>
            )}
            <Button className="bg-slate-900 hover:bg-slate-800 text-white w-full h-12 rounded-lg text-lg font-medium" onClick={() => window.location.href = '/'}>
              Return to Website
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={isEmbed ? "w-full h-full bg-white" : "min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center"}>
      <div className={isEmbed ? "w-full max-w-full" : "max-w-[1100px] w-full"}>
        <div className={isEmbed ? "w-full" : "bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200 flex flex-col md:flex-row min-h-[600px]"}>
          
          {/* Left Panel: Meeting Details */}
          <div className="w-full md:w-[350px] bg-slate-50 p-8 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-8">MailPlus</h2>
            
            <h3 className="text-slate-500 font-semibold uppercase tracking-wider text-sm mb-2">{amName}</h3>
            <h1 className="text-3xl font-bold text-slate-900 mb-6 leading-tight">30 Minute Discussion</h1>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center text-slate-600 font-medium">
                <Globe className="h-5 w-5 mr-3 text-slate-400" />
                {contactName} {contactEmail && <span className="ml-1 text-sm font-normal text-slate-500">({contactEmail})</span>}
              </div>
              <div className="flex items-center text-slate-600 font-medium">
                <Clock className="h-5 w-5 mr-3 text-slate-400" />
                30 min
              </div>
              <div className="flex items-center text-slate-600 font-medium">
                {meetingType === 'teams' ? (
                  <>
                    <Video className="h-5 w-5 mr-3 text-slate-400" />
                    Web conferencing details provided upon confirmation.
                  </>
                ) : (
                  <>
                    <Phone className="h-5 w-5 mr-3 text-slate-400" />
                    We will call you at your registered phone number.
                  </>
                )}
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed mt-auto border-t border-slate-200 pt-6">
              Schedule a time to discuss solutions for <span className="font-semibold text-slate-900">{leadName}</span>.
            </p>
          </div>

          {/* Right Panel: Calendar & Selection */}
          <div className="flex-1 p-8">
            <div className={`flex flex-col lg:flex-row gap-8 ${selectedSlot ? 'lg:justify-between' : 'lg:justify-center'}`}>
              
              {/* Calendar Section */}
              <div className="flex-1 max-w-[400px] mx-auto">
                <h3 className="text-xl font-semibold text-slate-900 mb-6 text-center lg:text-left">Select a Date & Time</h3>
                <div className="w-full flex justify-center lg:justify-start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date())) || date.getDay() === 0 || date.getDay() === 6}
                    className="p-0 bg-transparent rounded-lg"
                    classNames={{
                      head_cell: "text-slate-500 font-medium w-10 h-10 text-sm",
                      cell: "w-10 h-10 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-slate-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-10 w-10 p-0 font-medium text-slate-900 hover:bg-slate-100 rounded-full transition-colors",
                      day_selected: "bg-slate-900 text-white hover:bg-slate-800 hover:text-white focus:bg-slate-900 focus:text-white rounded-full",
                      day_today: "bg-slate-100 text-slate-900",
                      day_outside: "text-slate-300 opacity-50",
                      day_disabled: "text-slate-300 opacity-50",
                      nav_button_previous: "absolute left-1 top-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-slate-600",
                      nav_button_next: "absolute right-1 top-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-slate-600",
                      caption: "flex justify-center pt-1 relative items-center mb-4",
                      caption_label: "text-sm font-semibold text-slate-900"
                    }}
                  />
                </div>
              </div>

              {/* Time Slots Section */}
              {selectedDate && (
                <div className="w-full lg:w-[280px] flex flex-col h-full animate-in slide-in-from-right-4 duration-300 fade-in">
                  <h3 className="text-lg font-medium text-slate-700 mb-6 text-center lg:text-left">
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </h3>
                  
                  <div className="flex-1 max-h-[380px] overflow-y-auto pr-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 pb-4">
                    {loadingSlots ? (
                       <div className="flex justify-center py-12"><Loader /></div>
                    ) : availableSlots.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-500">
                        No available times on this date.
                      </div>
                    ) : (
                      availableSlots.map((slot) => {
                        const timeString = format(new Date(slot.start), 'h:mm a');
                        const isSelected = selectedSlot === slot.start;
                        return (
                          <Button
                            key={slot.start}
                            variant="outline"
                            className={`w-full justify-center h-14 text-base font-semibold transition-all rounded-lg border ${isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900 ring-offset-2' : 'border-slate-300 text-slate-700 hover:border-slate-900 hover:text-slate-900 bg-white hover:bg-slate-50'}`}
                            onClick={() => setSelectedSlot(slot.start)}
                          >
                            {timeString}
                          </Button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Selection Area */}
            {selectedSlot && (
              <div className="mt-10 pt-8 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[600px] mx-auto lg:mx-0">
                <h3 className="text-lg font-bold text-slate-900 mb-4">How would you like to meet?</h3>
                <RadioGroup value={meetingType} onValueChange={(val: any) => setMeetingType(val)} className="flex flex-col sm:flex-row gap-4 mb-8">
                  <div 
                    className={`flex-1 flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${meetingType === 'phone' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-white'}`}
                    onClick={() => setMeetingType('phone')}
                  >
                    <RadioGroupItem value="phone" id="r1" className="sr-only" />
                    <Label htmlFor="r1" className="flex items-center gap-3 cursor-pointer text-base font-medium text-slate-900 w-full">
                      <div className={`p-2 rounded-lg ${meetingType === 'phone' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Phone className="h-5 w-5" />
                      </div>
                      Phone Call
                    </Label>
                  </div>
                  <div 
                    className={`flex-1 flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${meetingType === 'teams' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-white'}`}
                    onClick={() => setMeetingType('teams')}
                  >
                    <RadioGroupItem value="teams" id="r2" className="sr-only" />
                    <Label htmlFor="r2" className="flex items-center gap-3 cursor-pointer text-base font-medium text-slate-900 w-full">
                      <div className={`p-2 rounded-lg ${meetingType === 'teams' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Video className="h-5 w-5" />
                      </div>
                      Microsoft Teams
                    </Label>
                  </div>
                </RadioGroup>

                <Button 
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg h-14 rounded-xl shadow-md"
                  onClick={handleBook}
                  disabled={isBooking}
                >
                  {isBooking ? <Loader className="h-6 w-6 text-white" /> : `Confirm Booking`}
                </Button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
