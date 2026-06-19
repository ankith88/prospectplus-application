"use client"

import React from 'react';
import { CalendarSettingsConfig } from './calendar-settings-config';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';

export function AMSettingsDashboard() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><Loader /></div>;
  }

  if (!userProfile) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Calendar & Availability Settings</h2>
        <p className="text-muted-foreground">Manage your Outlook calendar integration and working hours.</p>
      </div>
      
      <CalendarSettingsConfig userId={userProfile.uid} isOwner={true} />
    </div>
  );
}
