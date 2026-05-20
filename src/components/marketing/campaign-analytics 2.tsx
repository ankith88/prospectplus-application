'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { Loader2, Mail, MailOpen, MousePointerClick, ShieldAlert, UserMinus, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';

interface DeliveryLog {
  id: string;
  campaignId: string;
  leadId: string;
  leadEmail: string;
  leadName: string;
  companyName: string;
  sentAt: string;
  status: 'delivered' | 'bounced';
  bounceType?: 'hard' | 'soft' | null;
  openedAt?: string[];
  clickedAt?: string[];
  unsubscribedAt?: string | null;
}

interface Campaign {
  id: string;
  name: string;
  metrics?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
}

export function CampaignAnalytics() {
  const [deliveries, setDeliveries] = useState<DeliveryLog[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [deliveriesSnap, campaignsSnap] = await Promise.all([
        getDocs(collection(firestore, 'campaign_deliveries')),
        getDocs(collection(firestore, 'marketing_campaigns'))
      ]);

      const dList = deliveriesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DeliveryLog[];
      setDeliveries(dList.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()));

      const cList = campaignsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Campaign[];
      setCampaigns(cList);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch analytics statistics.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Aggregated Metrics
  const totalSent = deliveries.length;
  const totalBounced = deliveries.filter(d => d.status === 'bounced').length;
  const totalDelivered = totalSent - totalBounced;
  const totalOpened = deliveries.filter(d => d.openedAt && d.openedAt.length > 0).length;
  const totalClicked = deliveries.filter(d => d.clickedAt && d.clickedAt.length > 0).length;
  const totalUnsubscribed = deliveries.filter(d => d.unsubscribedAt).length;

  const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : '0.0';
  const clickRate = totalDelivered > 0 ? ((totalClicked / totalDelivered) * 100).toFixed(1) : '0.0';
  const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : '0.0';
  const unsubscribeRate = totalDelivered > 0 ? ((totalUnsubscribed / totalDelivered) * 100).toFixed(1) : '0.0';

  // Chart Data Generation (engagement over time)
  const getTimelineData = () => {
    if (deliveries.length === 0) return [];
    
    // Group by Day
    const groups: { [key: string]: { opens: number; clicks: number; sends: number } } = {};
    deliveries.forEach(d => {
      const day = new Date(d.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!groups[day]) groups[day] = { opens: 0, clicks: 0, sends: 0 };
      
      groups[day].sends++;
      if (d.openedAt && d.openedAt.length > 0) groups[day].opens++;
      if (d.clickedAt && d.clickedAt.length > 0) groups[day].clicks++;
    });

    return Object.keys(groups).map(day => ({
      name: day,
      Dispatched: groups[day].sends,
      Opens: groups[day].opens,
      Clicks: groups[day].clicks
    })).reverse();
  };

  // Chart Data: Status Overview
  const getOverviewData = () => {
    return [
      { name: 'Dispatched', count: totalSent, fill: '#095C7B' },
      { name: 'Delivered', count: totalDelivered, fill: '#1A3D33' },
      { name: 'Opened', count: totalOpened, fill: '#EAF044' },
      { name: 'Clicked', count: totalClicked, fill: '#A8763A' },
      { name: 'Bounced', count: totalBounced, fill: '#D32F2F' },
      { name: 'Opted Out', count: totalUnsubscribed, fill: '#777777' }
    ];
  };

  // Sandboxed Interaction Simulator
  const handleTriggerSimulate = async (type: 'open' | 'click' | 'unsubscribe') => {
    // Locate a random delivered record
    const target = deliveries.find(d => d.status === 'delivered');
    if (!target) {
      toast({
        variant: 'destructive',
        title: 'Simulation Blocked',
        description: 'You need at least one delivered email record in the delivery log to simulate interactions. Schedule a campaign first!'
      });
      return;
    }

    setSimulating(type);
    try {
      let endpoint = '';
      if (type === 'open') {
        endpoint = `/api/campaigns/track/open?id=${target.id}`;
      } else if (type === 'click') {
        endpoint = `/api/campaigns/track/click?id=${target.id}&url=https://mailplus.com.au`;
      } else if (type === 'unsubscribe') {
        endpoint = `/api/campaigns/track/unsubscribe?id=${target.id}`;
      }

      const res = await fetch(endpoint);
      
      if (type === 'unsubscribe') {
        toast({
          title: 'Simulated Opt-Out Completed',
          description: `Contact '${target.leadName}' has triggered the unsubscribe link. Check suppression lists!`
        });
      } else {
        toast({
          title: `Simulated ${type === 'open' ? 'Open Pixel' : 'Link Click'}`,
          description: `Interaction processed for delivery ${target.id} (${target.leadEmail}).`
        });
      }

      await fetchAnalyticsData();

    } catch (err) {
      console.error('Simulated interaction failed:', err);
    } finally {
      setSimulating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Simulator Panel */}
      <Card className="border border-blue-200 bg-blue-50/50">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-sm font-semibold text-blue-800">Outbound Campaign Validation Simulator</CardTitle>
              <CardDescription className="text-[10px] text-blue-600">Simulate recipient reactions to test real-time analytics and opt-out suppressions instantly</CardDescription>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchAnalyticsData} 
            className="h-8 bg-white border-blue-200 text-blue-700 hover:bg-blue-100/50 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Sync Data
          </Button>
        </CardHeader>
        <CardContent className="py-2.5 px-4 flex flex-wrap gap-3">
          <Button
            size="sm"
            onClick={() => handleTriggerSimulate('open')}
            disabled={simulating !== null || deliveries.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs h-8"
          >
            {simulating === 'open' ? <Loader2 className="h-3 w-3 animate-spin" /> : <MailOpen className="h-3.5 w-3.5" />}
            Simulate Email Open
          </Button>
          
          <Button
            size="sm"
            onClick={() => handleTriggerSimulate('click')}
            disabled={simulating !== null || deliveries.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 text-xs h-8"
          >
            {simulating === 'click' ? <Loader2 className="h-3 w-3 animate-spin" /> : <MousePointerClick className="h-3.5 w-3.5" />}
            Simulate Link Click
          </Button>

          <Button
            size="sm"
            onClick={() => handleTriggerSimulate('unsubscribe')}
            disabled={simulating !== null || deliveries.length === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-1 text-xs h-8"
          >
            {simulating === 'unsubscribe' ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
            Simulate Unsubscribe Click
          </Button>
        </CardContent>
      </Card>

      {/* Aggregate Statistics */}
      {loading ? (
        <div className="flex h-20 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card">
            <CardContent className="pt-4 pb-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Dispatched</span>
              <span className="text-2xl font-bold text-slate-800">{totalSent}</span>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-l-4 border-emerald-500">
            <CardContent className="pt-4 pb-3 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">Open Rate</span>
              <span className="text-2xl font-bold text-emerald-700">{openRate}%</span>
              <span className="text-[10px] text-muted-foreground block">{totalOpened} opens</span>
            </CardContent>
          </Card>

          <Card className="bg-card border-l-4 border-blue-500">
            <CardContent className="pt-4 pb-3 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-600 block mb-1">Click-Through (CTR)</span>
              <span className="text-2xl font-bold text-blue-700">{clickRate}%</span>
              <span className="text-[10px] text-muted-foreground block">{totalClicked} clicks</span>
            </CardContent>
          </Card>

          <Card className="bg-card border-l-4 border-destructive">
            <CardContent className="pt-4 pb-3 text-center">
              <span className="text-[10px] uppercase font-bold text-destructive block mb-1">Bounce Rate</span>
              <span className="text-2xl font-bold text-destructive">{bounceRate}%</span>
              <span className="text-[10px] text-muted-foreground block">{totalBounced} bounces</span>
            </CardContent>
          </Card>

          <Card className="bg-card border-l-4 border-amber-500">
            <CardContent className="pt-4 pb-3 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-600 block mb-1">Unsubscribe Rate</span>
              <span className="text-2xl font-bold text-amber-700">{unsubscribeRate}%</span>
              <span className="text-[10px] text-muted-foreground block">{totalUnsubscribed} opted out</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* High-Fidelity Charts Row */}
      {!loading && deliveries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recharts Area: Engagement Over Time */}
          <Card className="lg:col-span-2 bg-card">
            <CardHeader className="py-4 px-6 border-b">
              <CardTitle className="text-sm font-semibold text-slate-800">Outbound Engagement & Deliveries Timeline</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getTimelineData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Area type="monotone" dataKey="Opens" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorOpens)" />
                  <Area type="monotone" dataKey="Clicks" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recharts Bar: Metrics breakdown */}
          <Card className="lg:col-span-1 bg-card">
            <CardHeader className="py-4 px-6 border-b">
              <CardTitle className="text-sm font-semibold text-slate-800">Dispatch Status Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getOverviewData()} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={10} tickLine={false} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" fontSize={10} tickLine={false} stroke="#94a3b8" width={65} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recipient Deliveries Logs Table */}
      <Card className="bg-card">
        <CardHeader className="py-4 px-6 border-b">
          <CardTitle className="text-sm font-semibold text-slate-800">Recipient Delivery Logs</CardTitle>
          <CardDescription className="text-xs">Individual status tracking for all campaign dispatches</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : deliveries.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground p-6 text-sm italic">
              No delivery records compiled. Please execute an active campaign scheduler to display outputs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Recipient Detail</th>
                    <th className="p-4">Associated Client</th>
                    <th className="p-4">Dispatched At</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Opens</th>
                    <th className="p-4 text-center">Clicks</th>
                    <th className="p-4 text-center">Opted-Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {deliveries.map(d => {
                    const hasOpened = d.openedAt && d.openedAt.length > 0;
                    const hasClicked = d.clickedAt && d.clickedAt.length > 0;

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{d.leadName}</span>
                            <span className="text-[10px] text-muted-foreground">{d.leadEmail}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-700 font-medium">{d.companyName}</td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(d.sentAt).toLocaleString()}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            d.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {hasOpened ? (
                            <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold border border-emerald-100">
                              <CheckCircle2 className="h-3 w-3" /> {d.openedAt?.length} Open(s)
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {hasClicked ? (
                            <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold border border-blue-100">
                              <CheckCircle2 className="h-3 w-3" /> {d.clickedAt?.length} Click(s)
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {d.unsubscribedAt ? (
                            <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-semibold border border-amber-100 uppercase text-[9px]">
                              <ShieldAlert className="h-3 w-3" /> Unsubscribed
                            </span>
                          ) : (
                            <span className="text-slate-300">No</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
