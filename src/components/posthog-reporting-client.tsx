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
import { Input } from "@/components/ui/input";
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
  Layers,
  AlertTriangle,
  Settings,
  Calendar
} from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { getLeadsFromFirebase } from "@/services/firebase";
import { Lead } from "@/lib/types";

const DEFAULT_POSTHOG_EMBED_URL = "https://us.posthog.com/embedded/7Z9Z0b9fmbffgKPARNW10Eua81T3dA";
const DEFAULT_POSTHOG_WEB_ANALYTICS_URL = "https://us.posthog.com/embedded/pQEAhZnilUU4jhKDLWvt-YHGVP00sg";

function parsePostHogUrl(input: string): string {
  let url = input.trim();
  if (!url) return "";

  // Extract URL if user pasted raw <iframe ... src="..." ...> HTML string
  const srcMatch = url.match(/src=["']([^"']+)["']/i);
  if (srcMatch && srcMatch[1]) {
    url = srcMatch[1];
  }

  // Convert public share links (/shared/...) to embed links (/embedded/...)
  if (url.includes("posthog.com/shared/")) {
    url = url.replace("posthog.com/shared/", "posthog.com/embedded/");
  }

  return url;
}

function applyDateRangeToUrl(url: string, dateRange: string): string {
  if (!url || dateRange === "default") return url;
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set("date_from", dateRange);
    return urlObj.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}date_from=${dateRange}`;
  }
}

export default function PostHogReportingClient() {
  const { userProfile, loading: authLoading } = useAuth();
  const { canView } = usePermissions();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("posthog-dashboard");
  const [posthogDashboardUrl, setPosthogDashboardUrl] = useState<string>(
    DEFAULT_POSTHOG_EMBED_URL
  );
  const [customUrlInput, setCustomUrlInput] = useState<string>("");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("default");

  const [posthogWebAnalyticsUrl, setPosthogWebAnalyticsUrl] = useState<string>(
    DEFAULT_POSTHOG_WEB_ANALYTICS_URL
  );
  const [customWebAnalyticsInput, setCustomWebAnalyticsInput] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("posthog_embed_url");
      const defaultUrl =
        process.env.NEXT_PUBLIC_POSTHOG_EMBED_URL || DEFAULT_POSTHOG_EMBED_URL;
      const initial = parsePostHogUrl(saved || defaultUrl);
      setPosthogDashboardUrl(initial);
      setCustomUrlInput(initial);

      const savedWeb = localStorage.getItem("posthog_web_analytics_url");
      const initialWeb = parsePostHogUrl(savedWeb || DEFAULT_POSTHOG_WEB_ANALYTICS_URL);
      setPosthogWebAnalyticsUrl(initialWeb);
      setCustomWebAnalyticsInput(initialWeb);
    }
  }, []);

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
        const leadMap = new Map<string, Lead>();

        const processDoc = (docSnap: any) => {
          const data = docSnap.data();
          if (!data) return;
          if (!leadMap.has(docSnap.id)) {
            leadMap.set(docSnap.id, {
              id: docSnap.id,
              internalid: data.internalid || data.internalId || docSnap.id,
              companyName: data.companyName || data.company || "Unknown Company",
              status: data.customerStatus || data.status || "New",
              customerStatus: data.customerStatus,
              profile: "",
              attribution: data.attribution,
              inboundDetails: data.inboundDetails,
              customerSource: data.customerSource || data.source || data.leadSource,
              bucket: data.bucket,
              marketingChannel: data.marketingChannel || data.attribution?.channel || (data.customerSource === "Website" ? "Website / Organic" : undefined),
              posthogSessionUrl:
                data.posthogSessionUrl ||
                data.attribution?.posthogSessionUrl ||
                (data.attribution?.posthogSessionId
                  ? `https://us.posthog.com/project/108577/replay/${data.attribution.posthogSessionId}`
                  : undefined),
              contacts:
                data.contacts ||
                (data.customerServiceEmail
                  ? [{ name: data.contactName || "", email: data.customerServiceEmail, phone: data.customerPhone || "", id: "", title: "" }]
                  : []),
              inboundPageUrl: data.inboundPageUrl || data.attribution?.landingPage,
              campaign: data.campaign || data.attribution?.utmCampaign,
              customerServiceEmail: data.customerServiceEmail || data.customerEmail,
            } as Lead);
          }
        };

        // 1. Direct indexed queries across Firestore collections
        try {
          const leadsRef = collection(firestore, "leads");
          const compRef = collection(firestore, "companies");

          const [attrSnap, inboundSnap, mktSnap, bucketSnap, siteSnap, compAttrSnap] = await Promise.all([
            getDocs(query(leadsRef, where("attribution", "!=", null))).catch(() => ({ docs: [] })),
            getDocs(query(leadsRef, where("inboundDetails", "!=", null))).catch(() => ({ docs: [] })),
            getDocs(query(leadsRef, where("marketingChannel", "!=", null))).catch(() => ({ docs: [] })),
            getDocs(query(leadsRef, where("bucket", "==", "inbound"))).catch(() => ({ docs: [] })),
            getDocs(query(leadsRef, where("customerSource", "==", "Website"))).catch(() => ({ docs: [] })),
            getDocs(query(compRef, where("attribution", "!=", null))).catch(() => ({ docs: [] })),
          ]);

          attrSnap.docs.forEach(processDoc);
          inboundSnap.docs.forEach(processDoc);
          mktSnap.docs.forEach(processDoc);
          bucketSnap.docs.forEach(processDoc);
          siteSnap.docs.forEach(processDoc);
          compAttrSnap.docs.forEach(processDoc);
        } catch (e) {
          console.warn("Direct Firestore attribution queries failed, falling back:", e);
        }

        // 2. Supplementary load via getLeadsFromFirebase
        try {
          const generalLeads = await getLeadsFromFirebase({ includeDuplicates: true });
          (generalLeads || []).forEach((lead) => {
            if (
              lead.attribution ||
              lead.inboundDetails?.channel ||
              lead.marketingChannel ||
              lead.posthogSessionUrl ||
              lead.customerSource === "Website" ||
              lead.bucket === "inbound"
            ) {
              if (!leadMap.has(lead.id)) {
                leadMap.set(lead.id, lead);
              }
            }
          });
        } catch (e) {
          console.warn("General leads fetch error:", e);
        }

        setLeads(Array.from(leadMap.values()));
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

  const handleSaveEmbedUrl = () => {
    const parsed = parsePostHogUrl(customUrlInput);
    if (parsed) {
      setPosthogDashboardUrl(parsed);
      setCustomUrlInput(parsed);
      if (typeof window !== "undefined") {
        localStorage.setItem("posthog_embed_url", parsed);
      }
    }

    const parsedWeb = parsePostHogUrl(customWebAnalyticsInput);
    if (parsedWeb) {
      setPosthogWebAnalyticsUrl(parsedWeb);
      setCustomWebAnalyticsInput(parsedWeb);
      if (typeof window !== "undefined") {
        localStorage.setItem("posthog_web_analytics_url", parsedWeb);
      }
    }

    setShowSettings(false);
  };

  const handleResetEmbedUrl = () => {
    const defaultUrl =
      process.env.NEXT_PUBLIC_POSTHOG_EMBED_URL || DEFAULT_POSTHOG_EMBED_URL;
    const parsed = parsePostHogUrl(defaultUrl);
    setPosthogDashboardUrl(parsed);
    setCustomUrlInput(parsed);

    const defaultWeb = "https://us.posthog.com/project/108577/web";
    setPosthogWebAnalyticsUrl(defaultWeb);
    setCustomWebAnalyticsInput(defaultWeb);

    if (typeof window !== "undefined") {
      localStorage.removeItem("posthog_embed_url");
      localStorage.removeItem("posthog_web_analytics_url");
    }
  };

  const isStandardProjectUrl =
    posthogDashboardUrl.includes("/project/") &&
    !posthogDashboardUrl.includes("/shared/") &&
    !posthogDashboardUrl.includes("/shared_dashboard/") &&
    !posthogDashboardUrl.includes("/embedded/");

  const isWebAnalyticsStandardUrl =
    posthogWebAnalyticsUrl.includes("/project/") &&
    !posthogWebAnalyticsUrl.includes("/shared/") &&
    !posthogWebAnalyticsUrl.includes("/shared_dashboard/") &&
    !posthogWebAnalyticsUrl.includes("/embedded/");

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

  // Filter leads with attribution, campaign, website source, or inbound bucket data
  const attributionLeads = leads.filter(
    (l) =>
      Boolean(l.attribution && (typeof l.attribution !== "object" || Object.keys(l.attribution).length > 0)) ||
      Boolean(l.inboundDetails?.channel || l.inboundDetails?.utmCampaign) ||
      Boolean(l.marketingChannel) ||
      Boolean(l.customerSource === "Website" || l.source === "Website") ||
      Boolean(l.bucket === "inbound") ||
      Boolean(l.inboundPageUrl)
  );

  const filteredLeads = attributionLeads.filter((l) => {
    if (channelFilter === "all") return true;
    const channel = l.inboundDetails?.channel || l.marketingChannel || l.attribution?.channel || "";
    return channel.toLowerCase().includes(channelFilter.toLowerCase());
  });

  // Calculate top-line metrics
  const channelCounts: Record<string, number> = {};
  attributionLeads.forEach((l) => {
    const ch = l.inboundDetails?.channel || l.marketingChannel || l.attribution?.channel || (l.customerSource === "Website" ? "Website / Organic" : "Direct / Organic");
    channelCounts[ch] = (channelCounts[ch] || 0) + 1;
  });

  const sortedChannels = Object.entries(channelCounts).sort((a, b) => b[1] - a[1]);
  const topChannel = sortedChannels[0] ? sortedChannels[0][0] : "Meta Ads (Facebook/Instagram)";
  const topChannelCount = sortedChannels[0] ? sortedChannels[0][1] : 0;

  const sessionReplaysCount = attributionLeads.filter(
    (l) =>
      l.inboundDetails?.posthogSessionUrl ||
      l.posthogSessionUrl ||
      l.attribution?.posthogSessionUrl ||
      l.attribution?.posthogSessionId
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
            Real-time PostHog dashboard embedding, web analytics, social ad campaign metrics, and user session recording links.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-4 h-4 mr-2" />
            Embed Settings
          </Button>
          <Button
            variant="default"
            size="sm"
            className="bg-[#095c7b] hover:bg-[#074760]"
            onClick={() => window.open(posthogDashboardUrl, "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open PostHog App
          </Button>
        </div>
      </div>

      {/* Settings Drawer / Panel */}
      {showSettings && (
        <Card className="border border-blue-200 bg-blue-50/50 dark:bg-slate-900 dark:border-blue-900 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm text-blue-950 dark:text-blue-200">
              <Settings className="w-4 h-4 text-blue-600" />
              Configure PostHog Embed URLs
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)} className="text-xs">
              Close
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            To embed live views directly inside ProspectPlus without Content Security Policy (CSP) blocking, create a <strong>Public Shared Link / Dashboard</strong> in PostHog (Dashboard &rarr; Share &rarr; Share dashboard publicly) and paste the URL or embed snippet below.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Main Dashboard Embed Link</label>
              <Input
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="e.g. https://us.posthog.com/embedded/your_token_here"
                className="text-xs bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Web Analytics Embed Link</label>
              <Input
                value={customWebAnalyticsInput}
                onChange={(e) => setCustomWebAnalyticsInput(e.target.value)}
                placeholder="e.g. https://us.posthog.com/embedded/web_analytics_token or https://us.posthog.com/project/108577/web"
                className="text-xs bg-white dark:bg-slate-950"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={handleSaveEmbedUrl} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                Save Links
              </Button>
              <Button size="sm" variant="outline" onClick={handleResetEmbedUrl} className="text-xs">
                Reset Defaults
              </Button>
            </div>
          </div>
        </Card>
      )}

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

      {/* Quick Section Navigation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <Button
          variant={activeTab === "posthog-dashboard" ? "default" : "outline"}
          className={`justify-between h-auto py-2.5 px-3 border text-xs font-semibold transition-all ${
            activeTab === "posthog-dashboard"
              ? "bg-[#095c7b] text-white border-[#095c7b] shadow-sm"
              : "border-amber-200 bg-amber-50/40 hover:bg-amber-100/60 dark:bg-amber-950/20 text-foreground"
          }`}
          onClick={() => setActiveTab("posthog-dashboard")}
        >
          <span className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-500" />
            Main Dashboard
          </span>
        </Button>

        <Button
          variant={activeTab === "web-analytics" ? "default" : "outline"}
          className={`justify-between h-auto py-2.5 px-3 border text-xs font-semibold transition-all ${
            activeTab === "web-analytics"
              ? "bg-[#095c7b] text-white border-[#095c7b] shadow-sm"
              : "border-teal-200 bg-teal-50/40 hover:bg-teal-100/60 dark:bg-teal-950/20 text-foreground"
          }`}
          onClick={() => setActiveTab("web-analytics")}
        >
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-500" />
            Web Analytics
          </span>
        </Button>

        <Button
          variant={activeTab === "session-replays" ? "default" : "outline"}
          className={`justify-between h-auto py-2.5 px-3 border text-xs font-semibold transition-all ${
            activeTab === "session-replays"
              ? "bg-[#095c7b] text-white border-[#095c7b] shadow-sm"
              : "border-purple-200 bg-purple-50/40 hover:bg-purple-100/60 dark:bg-purple-950/20 text-foreground"
          }`}
          onClick={() => setActiveTab("session-replays")}
        >
          <span className="flex items-center gap-2">
            <Video className="w-4 h-4 text-purple-500" />
            Session Replays
          </span>
        </Button>

        <Button
          variant={activeTab === "insights" ? "default" : "outline"}
          className={`justify-between h-auto py-2.5 px-3 border text-xs font-semibold transition-all ${
            activeTab === "insights"
              ? "bg-[#095c7b] text-white border-[#095c7b] shadow-sm"
              : "border-blue-200 bg-blue-50/40 hover:bg-blue-100/60 dark:bg-blue-950/20 text-foreground"
          }`}
          onClick={() => setActiveTab("insights")}
        >
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Funnels & Insights
          </span>
        </Button>

        <Button
          variant={activeTab === "campaign-leads" ? "default" : "outline"}
          className={`justify-between h-auto py-2.5 px-3 border text-xs font-semibold transition-all ${
            activeTab === "campaign-leads"
              ? "bg-[#095c7b] text-white border-[#095c7b] shadow-sm"
              : "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-100/60 dark:bg-emerald-950/20 text-foreground"
          }`}
          onClick={() => setActiveTab("campaign-leads")}
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            Campaign Leads
          </span>
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-4xl">
          <TabsTrigger value="posthog-dashboard">Main Dashboard</TabsTrigger>
          <TabsTrigger value="web-analytics">Web Analytics</TabsTrigger>
          <TabsTrigger value="session-replays">Session Replays</TabsTrigger>
          <TabsTrigger value="insights">Funnels & Insights</TabsTrigger>
          <TabsTrigger value="campaign-leads">Campaign Leads</TabsTrigger>
        </TabsList>

        {/* Tab 1: Embedded PostHog Dashboard */}
        <TabsContent value="posthog-dashboard" className="pt-4">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  PostHog Live Dashboard View
                  {isStandardProjectUrl && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[11px]">
                      CSP Restricted URL
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Embedded PostHog analytics view for website traffic, funnels, and visitor retention.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)} className="text-xs">
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  Change Embed Link
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.open(posthogDashboardUrl, "_blank")}
                  className="text-xs bg-[#095c7b] hover:bg-[#074760]"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open in PostHog
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* CSP Banner if using direct project URL */}
              {isStandardProjectUrl && (
                <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-950 dark:text-amber-100">
                        PostHog Content Security Policy (CSP) Restriction Notice
                      </p>
                      <p>
                        PostHog Cloud restricts direct private project links (<code>us.posthog.com/project/...</code>) from being rendered inside an iframe via <code>frame-ancestors</code> security headers.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] border-amber-300 bg-white hover:bg-amber-100 dark:bg-slate-900"
                          onClick={() => window.open(posthogDashboardUrl, "_blank")}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Launch Dashboard Directly in PostHog
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] border-amber-300 bg-white hover:bg-amber-100 dark:bg-slate-900"
                          onClick={() => setShowSettings(true)}
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Paste Shared Dashboard Link
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-muted/40 border-b text-xs">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Filter Date Range:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    variant={dateRange === "default" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("default")}
                  >
                    Dashboard Default
                  </Button>
                  <Button
                    variant={dateRange === "-7d" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-7d")}
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant={dateRange === "-14d" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-14d")}
                  >
                    Last 14 Days
                  </Button>
                  <Button
                    variant={dateRange === "-30d" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-30d")}
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    variant={dateRange === "-90d" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-90d")}
                  >
                    Last 90 Days
                  </Button>
                  <Button
                    variant={dateRange === "-1y" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-1y")}
                  >
                    Last 1 Year
                  </Button>
                </div>
              </div>

              <div className="w-full h-[750px] relative bg-muted/20">
                <iframe
                  src={applyDateRangeToUrl(posthogDashboardUrl, dateRange)}
                  className="w-full h-full border-0 rounded-b-lg"
                  title="PostHog Analytics Dashboard"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Embedded PostHog Web Analytics */}
        <TabsContent value="web-analytics" className="pt-4">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  PostHog Web Analytics (Visitors, Pageviews & Bounce Rate)
                  {isWebAnalyticsStandardUrl && (
                    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-300 text-[11px]">
                      PostHog App Page
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Analyze your overall website performance, page view counts, session durations, and top landing page paths.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.open("https://us.posthog.com/project/108577/web", "_blank")}
                  className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open Web Analytics in PostHog
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isWebAnalyticsStandardUrl && (
                <div className="p-4 bg-teal-50/80 dark:bg-teal-950/40 border-b border-teal-200 dark:border-teal-900/60 text-teal-900 dark:text-teal-200 text-xs space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Globe className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-teal-950 dark:text-teal-100">
                        Viewing PostHog Web Analytics
                      </p>
                      <p>
                        To embed a dedicated Web Analytics view directly inside this box, create a Web Analytics Dashboard in PostHog &rarr; Click <strong>Share</strong> &rarr; <strong>Share dashboard publicly</strong> &rarr; Paste the embed link into <strong>Embed Settings</strong>.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] border-teal-300 bg-white hover:bg-teal-100 dark:bg-slate-900"
                          onClick={() => window.open("https://us.posthog.com/project/108577/web", "_blank")}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Launch Full Web Analytics in PostHog
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] border-teal-300 bg-white hover:bg-amber-100 dark:bg-slate-900"
                          onClick={() => setShowSettings(true)}
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Configure Web Analytics Embed Link
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-muted/40 border-b text-xs">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Filter Date Range:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    variant={dateRange === "default" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("default")}
                  >
                    Dashboard Default
                  </Button>
                  <Button
                    variant={dateRange === "-7d" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-7d")}
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant={dateRange === "-14d" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-14d")}
                  >
                    Last 14 Days
                  </Button>
                  <Button
                    variant={dateRange === "-30d" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-30d")}
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    variant={dateRange === "-90d" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-90d")}
                  >
                    Last 90 Days
                  </Button>
                  <Button
                    variant={dateRange === "-1y" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-1y")}
                  >
                    Last 1 Year
                  </Button>
                </div>
              </div>

              <div className="w-full h-[750px] relative bg-muted/20">
                <iframe
                  src={applyDateRangeToUrl(posthogWebAnalyticsUrl, dateRange)}
                  className="w-full h-full border-0 rounded-b-lg"
                  title="PostHog Web Analytics"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Session Replays */}
        <TabsContent value="session-replays" className="space-y-4 pt-4">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Video className="w-4 h-4 text-purple-600" />
                  PostHog Session Replays & User Recordings
                </CardTitle>
                <CardDescription className="text-xs">
                  Watch step-by-step visitor session recordings to analyze user clicks, form interactions, and navigation flow.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100"
                onClick={() => window.open("https://us.posthog.com/project/108577/replay", "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                All Replays in PostHog App
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="border rounded-lg p-4 bg-purple-50/30 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Lead Session Recordings ({sessionReplaysCount})</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click any replay button below to watch recorded user sessions directly associated with converted leads.
                  </p>
                </div>
              </div>

              <div className="border rounded-lg overflow-x-auto bg-card">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="p-3">Company Name</th>
                      <th className="p-3">Channel / Source</th>
                      <th className="p-3">Landing Page</th>
                      <th className="p-3 text-right">Watch Recording</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads
                      .filter(
                        (l) =>
                          l.inboundDetails?.posthogSessionUrl ||
                          l.posthogSessionUrl ||
                          l.attribution?.posthogSessionUrl ||
                          l.attribution?.posthogSessionId
                      )
                      .map((lead) => {
                        const sessionUrl =
                          lead.inboundDetails?.posthogSessionUrl ||
                          lead.posthogSessionUrl ||
                          lead.attribution?.posthogSessionUrl ||
                          (lead.attribution?.posthogSessionId
                            ? `https://us.posthog.com/project/108577/replay/${lead.attribution.posthogSessionId}`
                            : null);
                        const channel =
                          lead.attribution?.channel ||
                          lead.inboundDetails?.channel ||
                          lead.marketingChannel ||
                          "Direct / Organic";
                        const landingPage =
                          lead.attribution?.landingPage ||
                          lead.inboundPageUrl ||
                          lead.inboundDetails?.landingPage ||
                          "N/A";

                        return (
                          <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-semibold text-foreground">{lead.companyName}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {channel}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground max-w-[250px] truncate" title={landingPage}>
                              {landingPage}
                            </td>
                            <td className="p-3 text-right">
                              {sessionUrl && (
                                <Button
                                  size="sm"
                                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                                  onClick={() => window.open(sessionUrl, "_blank")}
                                >
                                  <Video className="w-3.5 h-3.5 mr-1.5" />
                                  Play Replay
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {leads.filter(
                      (l) =>
                        l.inboundDetails?.posthogSessionUrl ||
                        l.posthogSessionUrl ||
                        l.attribution?.posthogSessionUrl ||
                        l.attribution?.posthogSessionId
                    ).length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">
                          No active session replay links detected on leads yet. Ensure PostHog Session Recording snippet is active on landing pages.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Funnels & Insights */}
        <TabsContent value="insights" className="pt-4">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  PostHog Conversion Funnels & Insights
                </CardTitle>
                <CardDescription className="text-xs">
                  Analyze drop-off points, conversion funnels, and feature usage trends right inside ProspectPlus.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100"
                onClick={() => window.open("https://us.posthog.com/project/108577/insights", "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open Insights in PostHog App
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-muted/40 border-b text-xs">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Filter Date Range:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    variant={dateRange === "default" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("default")}
                  >
                    Default
                  </Button>
                  <Button
                    variant={dateRange === "-7d" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-7d")}
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant={dateRange === "-30d" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-30d")}
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    variant={dateRange === "-90d" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDateRange("-90d")}
                  >
                    Last 90 Days
                  </Button>
                </div>
              </div>

              <div className="w-full h-[750px] relative bg-muted/20">
                <iframe
                  src={applyDateRangeToUrl(posthogDashboardUrl, dateRange)}
                  className="w-full h-full border-0 rounded-b-lg"
                  title="PostHog Insights"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Lead Attribution Breakdown Table */}
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
                    const channel = lead.inboundDetails?.channel || lead.marketingChannel || lead.attribution?.channel || "Direct / Organic";
                    const campaignName =
                      lead.inboundDetails?.utmCampaign ||
                      lead.attribution?.utmCampaign ||
                      (lead.campaign && lead.campaign !== "Outbound" ? lead.campaign : null) ||
                      "N/A";
                    const utmSource = lead.inboundDetails?.utmSource || lead.attribution?.utmSource || "N/A";
                    const utmMedium = lead.inboundDetails?.utmMedium || lead.attribution?.utmMedium || "N/A";
                    const utmContent = lead.inboundDetails?.utmContent || lead.attribution?.utmContent || "N/A";
                    const landingPage = lead.inboundPageUrl || lead.inboundDetails?.landingPage || lead.attribution?.landingPage || "N/A";
                    const sessionUrl = lead.inboundDetails?.posthogSessionUrl || lead.posthogSessionUrl || lead.attribution?.posthogSessionUrl;

                    return (
                      <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{lead.companyName}</div>
                          <div className="text-xs text-muted-foreground">
                            {lead.contacts?.[0]?.name || lead.customerServiceEmail || "No contact info"}
                          </div>
                        </td>

                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className="font-semibold text-xs bg-primary/5 text-primary border-primary/20"
                          >
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

