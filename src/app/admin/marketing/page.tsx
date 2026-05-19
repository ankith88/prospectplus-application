'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TemplateBuilder } from '@/components/marketing/template-builder';
import { CampaignScheduler } from '@/components/marketing/campaign-scheduler';
import { CampaignAnalytics } from '@/components/marketing/campaign-analytics';
import { OutlookSettings } from '@/components/marketing/outlook-settings';
import { SuppressionList } from '@/components/marketing/suppression-list';
import { Mail, FileText, BarChart3, Settings, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { useRouter } from 'next/navigation';

export default function MarketingCampaignsPage() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const isSettingsAllowed = user?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';
  const isAllowed = (userProfile?.role && ['admin', 'Marketing Admin', 'Marketing Manager', 'Dashback'].includes(userProfile.role)) || user?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

  useEffect(() => {
    if (!loading && !isAllowed) {
      router.replace('/leads');
    }
  }, [loading, isAllowed, router]);

  if (loading || !isAllowed) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto min-h-screen">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 shrink-0">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-slate-800 flex items-center gap-2">
            Marketing Campaign System
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Design, schedule, track, and manage native Microsoft Outlook email campaigns for MailPlus
          </p>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col gap-6">
        <TabsList className="bg-slate-100 p-1 border rounded-lg w-full md:w-auto self-start shrink-0 flex flex-wrap gap-1">
          <TabsTrigger value="campaigns" className="flex items-center gap-2 text-xs font-semibold data-[state=active]:bg-white">
            <Mail className="h-4 w-4" /> Campaigns & Queue
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2 text-xs font-semibold data-[state=active]:bg-white">
            <FileText className="h-4 w-4" /> Email Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 text-xs font-semibold data-[state=active]:bg-white">
            <BarChart3 className="h-4 w-4" /> Real-Time Analytics
          </TabsTrigger>
          <TabsTrigger value="suppressions" className="flex items-center gap-2 text-xs font-semibold data-[state=active]:bg-white">
            <ShieldAlert className="h-4 w-4" /> Opt-Outs & Suppressions
          </TabsTrigger>
          {isSettingsAllowed && (
            <TabsTrigger value="settings" className="flex items-center gap-2 text-xs font-semibold data-[state=active]:bg-white animate-in fade-in zoom-in-95">
              <Settings className="h-4 w-4" /> Outlook Settings
            </TabsTrigger>
          )}
        </TabsList>

        <div className="flex-1 min-h-0">
          <TabsContent value="campaigns" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
            <CampaignScheduler />
          </TabsContent>
          
          <TabsContent value="templates" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
            <TemplateBuilder />
          </TabsContent>

          <TabsContent value="analytics" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
            <CampaignAnalytics />
          </TabsContent>

          <TabsContent value="suppressions" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
            <SuppressionList />
          </TabsContent>

          {isSettingsAllowed && (
            <TabsContent value="settings" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
              <OutlookSettings />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
