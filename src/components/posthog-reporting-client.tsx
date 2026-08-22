"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader } from "@/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart2,
  TrendingUp,
  Users,
  Video,
  ExternalLink,
  Target,
  Globe,
  Filter,
  RefreshCw,
  Sparkles,
  Share2,
  Layers
} from "lucide-react";
import { getLeadsFromFirebase } from "@/services/firebase";
import { Lead } from "@/lib/types";

export default function PostHogReportingClient() {
  const { userProfile, loading: authLoading } = useAuth();
  const { canView } = usePermissions();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [posthogDashboardUrl, setPosthogDashboardUrl] = useState<string>(
    process.env.NEXT_PUBLIC_POSTHOG_EMBED_URL ||
    "https://us.posthog.com/project/108577/dashboard"
  );
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const activeRoleLower = (userProfile?.activeRole as string)?.toLowerCase() || "";
  const isSuperAdmin = userProfile?.email?.endsWith("@mailplus.com.au") || activeRoleLower === "superadmin";
  const isAuthorized =
    isSuperAdmin ||
    canView("posthogReporting") ||
    ["admin", "superadmin", "marketing manager", "marketing_manager"].includes(activeRoleLower);

  useEffect(() => {
    async function fetchAttributionLeads() {
      try {
        setLoadingLeads(true);
        const fetchedLeads = await getLeadsFromFirebase();
        setLeads(fetchedLeads || []);
      } catch (err) {
        console.error("Failed to fetch leads for marketing analytics:", err);
      } finally {
        setLoadingLeads(false);
      }
    }

    if (isAuthorized) {
      fetchAttributionLeads();
    }
  }, [isAuthorized]);

  if (authLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!isAuthorized) {
    return <AccessDenied />;
  }

  // Filter leads with attribution or campaign data
  const attributionLeads = leads.filter(
    (l) => l.attribution || l.inboundDetails?.channel || l.inboundDetails?.utmCampaign || l.marketingChannel
  );

  const filteredLeads = attributionLeads.filter((l) => {
    if (channelFilter === "all") return true;
    const channel = l.inboundDetails?.channel || l.marketingChannel || "";
    return channel.toLowerCase().includes(channelFilter.toLowerCase());
  });

  // Calculate top-line metrics
  const channelCounts: Record<string, number> = {};
  attributionLeads.forEach((l) => {
    const ch = l.inboundDetails?.channel || l.marketingChannel || "Direct / Organic";
    channelCounts[ch] = (channelCounts[ch] || 0) + 1;
  });

  const sortedChannels = Object.entries(channelCounts).sort((a, b) => b[1] - a[1]);
  const topChannel = sortedChannels[0] ? sortedChannels[0][0] : "Meta Ads (Facebook/Instagram)";
  const topChannelCount = sortedChannels[0] ? sortedChannels[0][1] : 0;

  const sessionReplaysCount = attributionLeads.filter(
    (l) => l.inboundDetails?.posthogSessionUrl || l.posthogSessionUrl
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">PostHog & Campaign Analytics</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Live PostHog Integration
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time PostHog dashboard embedding, social ad campaign metrics, and user session recording links.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => window.open(posthogDashboardUrl, "_blank")}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open PostHog App
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-primary/10 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Tracked Leads
            </CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attributionLeads.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Leads with campaign attribution</p>
          </CardContent>
        </Card>

        <Card className="border border-primary/10 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Top Social Ad Channel
            </CardTitle>
            <Target className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-emerald-600 truncate">{topChannel}</div>
            <p className="text-xs text-muted-foreground mt-1">{topChannelCount} leads generated</p>
          </CardContent>
        </Card>

        <Card className="border border-primary/10 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              PostHog Session Replays
            </CardTitle>
            <Video className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{sessionReplaysCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Recorded user sessions available</p>
          </CardContent>
        </Card>

        <Card className="border border-primary/10 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ad Channels Active
            </CardTitle>
            <Layers className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{sortedChannels.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique traffic sources identified</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="posthog-dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="posthog-dashboard">PostHog Live Dashboard</TabsTrigger>
          <TabsTrigger value="campaign-leads">Campaign Attribution Leads</TabsTrigger>
        </TabsList>

        {/* Tab 1: Embedded PostHog Dashboard */}
        <TabsContent value="posthog-dashboard" className="pt-4">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-base font-bold">PostHog Live Dashboard</CardTitle>
                <CardDescription className="text-xs">
                  Embedded PostHog analytics view for website traffic, funnels, and visitor retention.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.open(posthogDashboardUrl, "_blank")}>
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open Fullscreen
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full h-[750px] relative bg-muted/20">
                <iframe
                  src={posthogDashboardUrl}
                  className="w-full h-full border-0 rounded-b-lg"
                  title="PostHog Analytics Dashboard"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Lead Attribution Breakdown Table */}
        <TabsContent value="campaign-leads" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Lead Marketing Attribution List</h3>
              <p className="text-xs text-muted-foreground">
                Detailed campaign parameters, click IDs, and PostHog session replay links for recent incoming leads.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="text-xs bg-background border border-input rounded-md px-3 py-1.5 focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Ad Channels ({attributionLeads.length})</option>
                <option value="meta">Meta Ads (Facebook/Instagram)</option>
                <option value="google">Google Ads</option>
                <option value="linkedin">LinkedIn Ads</option>
                <option value="direct">Direct / Organic</option>
              </select>
            </div>
          </div>

          {loadingLeads ? (
            <div className="flex h-64 items-center justify-center">
              <Loader />
            </div>
          ) : filteredLeads.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-muted-foreground text-sm">No campaign attribution leads found matching the filter.</p>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-x-auto bg-card">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="p-3">Company & Contact</th>
                    <th className="p-3">Ad Channel & Campaign</th>
                    <th className="p-3">UTM Source / Medium</th>
                    <th className="p-3">Ad Creative / Variant</th>
                    <th className="p-3">First Landing Page</th>
                    <th className="p-3 text-right">PostHog Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLeads.map((lead) => {
                    const channel = lead.inboundDetails?.channel || lead.marketingChannel || "Direct / Organic";
                    const campaignName = lead.inboundDetails?.utmCampaign || lead.campaign || "N/A";
                    const utmSource = lead.inboundDetails?.utmSource || "N/A";
                    const utmMedium = lead.inboundDetails?.utmMedium || "N/A";
                    const utmContent = lead.inboundDetails?.utmContent || "N/A";
                    const landingPage = lead.inboundPageUrl || lead.inboundDetails?.landingPage || "N/A";
                    const sessionUrl = lead.inboundDetails?.posthogSessionUrl || lead.posthogSessionUrl;

                    return (
                      <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{lead.companyName}</div>
                          <div className="text-xs text-muted-foreground">
                            {lead.contacts?.[0]?.name || lead.customerServiceEmail || "No contact info"}
                          </div>
                        </td>

                        <td className="p-3">
                          <Badge variant="outline" className="font-semibold text-xs bg-primary/5 text-primary border-primary/20">
                            {channel}
                          </Badge>
                          <div className="text-xs font-medium text-foreground mt-1">{campaignName}</div>
                        </td>

                        <td className="p-3 text-xs">
                          <span className="font-semibold text-foreground">{utmSource}</span>
                          <span className="text-muted-foreground"> / {utmMedium}</span>
                        </td>

                        <td className="p-3 text-xs text-muted-foreground">
                          {utmContent !== "N/A" ? (
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              {utmContent}
                            </Badge>
                          ) : (
                            "N/A"
                          )}
                        </td>

                        <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate" title={landingPage}>
                          {landingPage}
                        </td>

                        <td className="p-3 text-right">
                          {sessionUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              onClick={() => window.open(sessionUrl, "_blank")}
                            >
                              <Video className="w-3.5 h-3.5 mr-1" />
                              Watch Replay
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No Recording</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
