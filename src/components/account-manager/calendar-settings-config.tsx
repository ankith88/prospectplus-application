"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Calendar as CalendarIcon, Save, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface CalendarSettingsConfigProps {
  userId: string;
  isOwner: boolean; // True if the current user is configuring their own settings, false if an admin is configuring for someone else
}

export function CalendarSettingsConfig({ userId, isOwner }: CalendarSettingsConfigProps) {
  const searchParams = useSearchParams();
  const successParam = searchParams.get('success');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [workingHours, setWorkingHours] = useState<Record<string, { start: string; end: string; enabled: boolean }>>({});
  const [bufferMinutes, setBufferMinutes] = useState(0);

  const [meetingSubjectTemplate, setMeetingSubjectTemplate] = useState('');
  const [defaultMeetingDurationMinutes, setDefaultMeetingDurationMinutes] = useState('30');
  const [minimumBookingNoticeHours, setMinimumBookingNoticeHours] = useState('0');
  const [defaultMeetingType, setDefaultMeetingType] = useState<'phone' | 'teams'>('phone');

  useEffect(() => {
    if (successParam === 'calendar_connected' && isOwner) {
      toast.success('Outlook Calendar connected successfully!');
    }
  }, [successParam, isOwner]);

  useEffect(() => {
    async function fetchUser() {
      if (!userId) return;
      setLoading(true);
      try {
        const userSnap = await getDoc(doc(firestore, 'users', userId));
        if (userSnap.exists()) {
          const profile = userSnap.data() as UserProfile;
          setUserProfile(profile);

          const defaultHours = DAYS_OF_WEEK.reduce((acc, day) => {
            acc[day] = {
              start: '09:00',
              end: '17:00',
              enabled: !['Saturday', 'Sunday'].includes(day),
            };
            return acc;
          }, {} as Record<string, { start: string; end: string; enabled: boolean }>);

          setWorkingHours(profile.workingHours || defaultHours);
          setBufferMinutes(profile.meetingBufferMinutes || 0);
          setMeetingSubjectTemplate(profile.meetingSubjectTemplate || '');
          setDefaultMeetingDurationMinutes((profile.defaultMeetingDurationMinutes || 30).toString());
          setMinimumBookingNoticeHours((profile.minimumBookingNoticeHours || 0).toString());
          setDefaultMeetingType(profile.defaultMeetingType || 'phone');
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load user settings.");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [userId]);

  const handleConnectOutlook = () => {
    if (!userId) return;
    window.location.href = `/api/integrations/microsoft/auth?amId=${userId}`;
  };

  const handleSaveSettings = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        workingHours,
        meetingBufferMinutes: bufferMinutes,
        meetingSubjectTemplate,
        defaultMeetingDurationMinutes: parseInt(defaultMeetingDurationMinutes) || 30,
        minimumBookingNoticeHours: parseInt(minimumBookingNoticeHours) || 0,
        defaultMeetingType
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateWorkingHour = (day: string, field: 'start' | 'end' | 'enabled', value: any) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><Loader /></div>;
  }

  if (!userProfile) {
    return <div className="p-6">User profile not found.</div>;
  }

  const isConnected = !!userProfile.microsoftRefreshToken;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendar Integration Card */}
      <Card className="border-[#095c7b]/10 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-[#095c7b]">
            <CalendarIcon className="h-5 w-5" />
            <CardTitle>Outlook Calendar Integration</CardTitle>
          </div>
          <CardDescription>
            {isOwner 
              ? "Connect your Microsoft Outlook calendar to allow leads to book meetings with you directly based on your real-time availability."
              : `Connection status for ${userProfile.displayName || userProfile.firstName + ' ' + userProfile.lastName}'s Microsoft Outlook calendar.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className={`p-2 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              {isConnected ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-slate-900">
                {isConnected ? 'Outlook Connected' : 'Not Connected'}
              </h3>
              <p className="text-sm text-slate-500">
                {isConnected 
                  ? 'Calendar is connected and available for bookings.' 
                  : 'Calendar is not connected.'}
              </p>
            </div>
            {isOwner && (
              <Button 
                onClick={handleConnectOutlook}
                variant={isConnected ? 'outline' : 'default'}
                className={!isConnected ? "bg-[#095c7b] hover:bg-[#095c7b]/90 text-white" : ""}
              >
                {isConnected ? 'Reconnect Calendar' : 'Connect Outlook'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Availability Settings Card */}
      <Card className="border-[#095c7b]/10 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-[#095c7b]">
            <Settings className="h-5 w-5" />
            <CardTitle>Booking Availability</CardTitle>
          </div>
          <CardDescription>
            Set regular working hours. These will be combined with actual Outlook Calendar events to determine available booking slots.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-900">Weekly Hours</h4>
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => {
                const dayData = workingHours[day] || { start: '09:00', end: '17:00', enabled: false };
                return (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-32 flex items-center gap-2">
                      <Switch 
                        checked={dayData.enabled} 
                        onCheckedChange={(checked) => updateWorkingHour(day, 'enabled', checked)}
                        id={`switch-${day}`}
                      />
                      <Label htmlFor={`switch-${day}`} className={dayData.enabled ? 'text-slate-900' : 'text-slate-400'}>{day}</Label>
                    </div>
                    
                    <div className={`flex items-center gap-2 flex-1 ${!dayData.enabled && 'opacity-50 pointer-events-none'}`}>
                      <Input 
                        type="time" 
                        value={dayData.start}
                        onChange={(e) => updateWorkingHour(day, 'start', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-sm text-slate-500">to</span>
                      <Input 
                        type="time" 
                        value={dayData.end}
                        onChange={(e) => updateWorkingHour(day, 'end', e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buffer-minutes" className="text-sm font-medium text-slate-900">Buffer Time (Minutes)</Label>
              <p className="text-xs text-slate-500">Minimum time required between meetings.</p>
            </div>
            <Input 
              id="buffer-minutes"
              type="number" 
              min="0"
              step="5"
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(parseInt(e.target.value) || 0)}
              className="w-32"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSaveSettings} disabled={saving} className="bg-[#095c7b] hover:bg-[#095c7b]/90 text-white">
              {saving ? <Loader className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
          </div>

        </CardContent>
      </Card>
      {/* Meeting Preferences Card */}
      <Card className="border-[#095c7b]/10 shadow-sm bg-white/80 backdrop-blur-sm lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2 text-[#095c7b]">
            <FileText className="h-5 w-5" />
            <CardTitle>Meeting Preferences</CardTitle>
          </div>
          <CardDescription>
            Customize how meetings are booked and formatted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="meeting-subject" className="text-sm font-medium text-slate-900">Meeting Subject Template</Label>
                <p className="text-xs text-slate-500">Customize the calendar invite title. Available variables: <code>{'{{leadName}}'}</code>, <code>{'{{amName}}'}</code></p>
                <Input 
                  id="meeting-subject"
                  value={meetingSubjectTemplate}
                  onChange={(e) => setMeetingSubjectTemplate(e.target.value)}
                  placeholder="e.g. Discovery Call: {{leadName}} with {{amName}}"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-2 p-2 bg-slate-50 rounded border">
                  <strong>Preview:</strong> {meetingSubjectTemplate 
                    ? meetingSubjectTemplate.replace('{{leadName}}', 'Acme Corp').replace('{{amName}}', userProfile?.displayName || 'John Doe')
                    : `Acme Corp / ${userProfile?.displayName || 'John Doe'}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-meeting-type" className="text-sm font-medium text-slate-900">Default Meeting Type</Label>
                <p className="text-xs text-slate-500">The meeting type that is pre-selected on the booking page.</p>
                <Select value={defaultMeetingType} onValueChange={(val: any) => setDefaultMeetingType(val)}>
                  <SelectTrigger id="default-meeting-type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="teams">Microsoft Teams</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="default-duration" className="text-sm font-medium text-slate-900">Default Meeting Duration</Label>
                <p className="text-xs text-slate-500">How long each automatically booked meeting should last.</p>
                <Select value={defaultMeetingDurationMinutes} onValueChange={setDefaultMeetingDurationMinutes}>
                  <SelectTrigger id="default-duration" className="w-full">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Minutes</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                    <SelectItem value="45">45 Minutes</SelectItem>
                    <SelectItem value="60">60 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="advance-notice" className="text-sm font-medium text-slate-900">Minimum Advance Notice (Hours)</Label>
                <p className="text-xs text-slate-500">Prevent last-minute bookings by requiring minimum notice.</p>
                <Input 
                  id="advance-notice"
                  type="number" 
                  min="0"
                  step="1"
                  value={minimumBookingNoticeHours}
                  onChange={(e) => setMinimumBookingNoticeHours(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end border-t border-slate-100">
            <Button onClick={handleSaveSettings} disabled={saving} className="bg-[#095c7b] hover:bg-[#095c7b]/90 text-white">
              {saving ? <Loader className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
