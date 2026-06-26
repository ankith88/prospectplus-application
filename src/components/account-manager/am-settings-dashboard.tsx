"use client"

import React from 'react';
import { CalendarSettingsConfig } from './calendar-settings-config';
import { AIEmailCopilot } from '@/components/ai-email-copilot';
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

  const hasAIFeature = userProfile.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

  return (
    <div className="p-6 space-y-8">
      {hasAIFeature ? (
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Account Settings & Integrations</h2>
          <p className="text-muted-foreground">Manage your Outlook configurations, working hours, and Gemini AI assistant.</p>
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Calendar & Availability Settings</h2>
          <p className="text-muted-foreground">Manage your Outlook calendar integration and working hours.</p>
        </div>
      )}
      
      <CalendarSettingsConfig userId={userProfile.uid} isOwner={true} />

      {hasAIFeature && <AIEmailCopilot />}
    </div>
  );
}
