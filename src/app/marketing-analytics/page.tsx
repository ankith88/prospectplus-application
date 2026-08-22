import PostHogReportingClient from "@/components/posthog-reporting-client";

export const metadata = {
  title: "PostHog & Campaign Analytics | ProspectPlus",
  description: "View website traffic, conversion funnels, and social ad campaign attribution metrics.",
};

export default function MarketingAnalyticsPage() {
  return <PostHogReportingClient />;
}
