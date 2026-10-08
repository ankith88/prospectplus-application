'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/ui/loader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Phone,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronLeft,
  RefreshCw,
  Zap,
  Globe,
  Radio
} from 'lucide-react';
import type { TelephonyProviderType, TelephonySettings } from '@/lib/types';

export default function TelephonySettingsPage() {
  const { userProfile, loading: authLoading, isSuperAdmin } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<TelephonySettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [switchingProvider, setSwitchingProvider] = useState(false);

  // Testing states
  const [testingAirCall, setTestingAirCall] = useState(false);
  const [testingDialpad, setTestingDialpad] = useState(false);
  const [provisioningWebhook, setProvisioningWebhook] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await fetch('/api/admin/telephony/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      } else {
        toast.error('Failed to load telephony settings');
      }
    } catch (err: any) {
      toast.error('Network error loading telephony settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace('/leads');
      return;
    }
    if (isSuperAdmin) {
      fetchSettings();
    }
  }, [authLoading, isSuperAdmin, router]);

  const handleSwitchProvider = async (newProvider: TelephonyProviderType) => {
    if (!settings || settings.activeProvider === newProvider) return;
    try {
      setSwitchingProvider(true);
      const res = await fetch('/api/admin/telephony/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeProvider: newProvider,
          updatedBy: userProfile?.displayName || userProfile?.email || 'superadmin',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        toast.success(`Active telephony provider switched to ${newProvider === 'dialpad' ? 'Dialpad' : 'AirCall'}`);
      } else {
        toast.error(data.error || 'Failed to switch provider');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating settings');
    } finally {
      setSwitchingProvider(false);
    }
  };

  const handleTestConnection = async (provider: TelephonyProviderType) => {
    if (provider === 'dialpad') setTestingDialpad(true);
    else setTestingAirCall(true);

    try {
      const res = await fetch('/api/admin/telephony/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Connection test failed');
      }
    } catch (err: any) {
      toast.error('Connection test failed due to network error');
    } finally {
      if (provider === 'dialpad') setTestingDialpad(false);
      else setTestingAirCall(false);
    }
  };

  const handleProvisionDialpadWebhook = async () => {
    try {
      setProvisioningWebhook(true);
      const res = await fetch('/api/admin/telephony/provision-dialpad-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updatedBy: userProfile?.displayName || userProfile?.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchSettings();
      } else {
        toast.error(data.message || 'Failed to provision webhook on Dialpad');
      }
    } catch (err: any) {
      toast.error('Network error during webhook provisioning');
    } finally {
      setProvisioningWebhook(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  if (authLoading || !isSuperAdmin) {
    return <div className="flex h-full items-center justify-center p-12"><Loader /></div>;
  }

  const activeProvider = settings?.activeProvider || 'aircall';
  const dialpadWebhookUrl = `https://prospectplus.com.au/api/dialpad/webhook/${process.env.NEXT_PUBLIC_WEBHOOK_SECRET || 'a5882b1fcfcd41a085b624fae1cd2948'}`;
  const aircallWebhookUrl = `https://prospectplus.com.au/api/aircall/webhook/${process.env.NEXT_PUBLIC_WEBHOOK_SECRET || 'a5882b1fcfcd41a085b624fae1cd2948'}`;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-4 px-2">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/settings')} className="gap-1 pl-1">
              <ChevronLeft className="h-4 w-4" /> Admin Settings
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PhoneCall className="h-7 w-7 text-[#095c7b] dark:text-[#38bdf8]" />
            Telephony & Phone System Switch
          </h1>
          <p className="text-muted-foreground text-sm">
            Control which telephony provider is active throughout ProspectPlus (Dialer, Webhooks, Reports & Transcripts).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loadingSettings} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loadingSettings ? 'animate-spin' : ''}`} /> Refresh Status
        </Button>
      </header>

      {/* Active System Switch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AirCall Card */}
        <Card className={`relative transition-all duration-200 border-2 ${activeProvider === 'aircall' ? 'border-[#095c7b] dark:border-[#38bdf8] bg-blue-50/20 dark:bg-blue-950/10 shadow-md' : 'border-border/60 hover:border-border'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center font-bold text-teal-700 dark:text-teal-300">
                  AC
                </div>
                <div>
                  <CardTitle className="text-xl">AirCall</CardTitle>
                  <CardDescription>Primary Telephony Integration</CardDescription>
                </div>
              </div>
              {activeProvider === 'aircall' ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white px-3 py-1 text-xs gap-1 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5" /> ACTIVE SYSTEM
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs">
                  Standby
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <div className="p-3 bg-muted/40 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">API Credentials:</span>
                <span className="font-mono">{settings?.aircall?.apiId ? 'Configured' : 'Env Vars'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Dialer URI:</span>
                <span className="font-mono text-[11px] bg-background px-2 py-0.5 rounded">aircall:&#123;phone&#125;</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestConnection('aircall')}
                disabled={testingAirCall}
                className="gap-1.5"
              >
                {testingAirCall ? <Loader /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
                Test Connection
              </Button>
            </div>
          </CardContent>

          <CardFooter className="border-t pt-4 bg-muted/10 flex justify-between">
            {activeProvider === 'aircall' ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 animate-pulse" /> Routing all calls & reports via AirCall
              </p>
            ) : (
              <Button
                size="sm"
                onClick={() => handleSwitchProvider('aircall')}
                disabled={switchingProvider}
                className="w-full bg-[#095c7b] hover:bg-[#07475f] text-white"
              >
                {switchingProvider ? <Loader /> : 'Switch to AirCall'}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Dialpad Card */}
        <Card className={`relative transition-all duration-200 border-2 ${activeProvider === 'dialpad' ? 'border-[#095c7b] dark:border-[#38bdf8] bg-blue-50/20 dark:bg-blue-950/10 shadow-md' : 'border-border/60 hover:border-border'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300">
                  DP
                </div>
                <div>
                  <CardTitle className="text-xl">Dialpad</CardTitle>
                  <CardDescription>Backup Cloud Telephony & Ai</CardDescription>
                </div>
              </div>
              {activeProvider === 'dialpad' ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white px-3 py-1 text-xs gap-1 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5" /> ACTIVE SYSTEM
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs">
                  Standby
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <div className="p-3 bg-muted/40 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">API Status:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">Ready (API v2)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Webhook Subscription:</span>
                <span className="font-mono">
                  {settings?.dialpad?.webhookId ? `ID: ${settings.dialpad.webhookId}` : 'Not auto-provisioned yet'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Dialer URI:</span>
                <span className="font-mono text-[11px] bg-background px-2 py-0.5 rounded">dialpad:&#123;phone&#125;</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestConnection('dialpad')}
                disabled={testingDialpad}
                className="gap-1.5"
              >
                {testingDialpad ? <Loader /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
                Test Connection
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleProvisionDialpadWebhook}
                disabled={provisioningWebhook}
                className="gap-1.5"
              >
                {provisioningWebhook ? <Loader /> : <Globe className="h-3.5 w-3.5" />}
                Auto-Register Webhooks
              </Button>
            </div>
          </CardContent>

          <CardFooter className="border-t pt-4 bg-muted/10 flex justify-between">
            {activeProvider === 'dialpad' ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 animate-pulse" /> Routing all calls & reports via Dialpad
              </p>
            ) : (
              <Button
                size="sm"
                onClick={() => handleSwitchProvider('dialpad')}
                disabled={switchingProvider}
                className="w-full bg-[#095c7b] hover:bg-[#07475f] text-white"
              >
                {switchingProvider ? <Loader /> : 'Switch to Dialpad'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Webhook Configuration Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Webhook Endpoints & Setup Information
          </CardTitle>
          <CardDescription>
            These endpoints ingest call hangup, missed call alerts, audio recordings, and voice transcripts into ProspectPlus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dialpad Webhook Row */}
          <div className="p-4 rounded-xl border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium text-sm">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span> Dialpad Webhook Endpoint
              </div>
              <Badge variant="outline" className="text-xs font-mono">POST</Badge>
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={dialpadWebhookUrl}
                className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded-md border text-muted-foreground select-all"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(dialpadWebhookUrl, 'Dialpad Webhook URL')}
                className="gap-1.5 shrink-0"
              >
                <Copy className="h-3.5 w-3.5" /> Copy URL
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Clicking <strong>&quot;Auto-Register Webhooks&quot;</strong> above automatically creates this webhook and subscribes to call outcomes on Dialpad via API.
            </p>
          </div>

          {/* AirCall Webhook Row */}
          <div className="p-4 rounded-xl border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium text-sm">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span> AirCall Webhook Endpoint
              </div>
              <Badge variant="outline" className="text-xs font-mono">POST</Badge>
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={aircallWebhookUrl}
                className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded-md border text-muted-foreground select-all"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(aircallWebhookUrl, 'AirCall Webhook URL')}
                className="gap-1.5 shrink-0"
              >
                <Copy className="h-3.5 w-3.5" /> Copy URL
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
