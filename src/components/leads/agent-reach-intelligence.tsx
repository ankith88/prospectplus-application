'use client';

import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sparkles,
  Search,
  ExternalLink,
  Plus,
  Check,
  Truck,
  Building2,
  Clock,
  Instagram,
  Facebook,
  Linkedin,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Users,
  Compass,
  Zap,
  Globe,
  Package,
  Layers,
  PhoneCall,
  ShieldCheck,
  Building,
  Store,
  MapPin,
  Mail,
  Phone,
  ShoppingBag,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Lead,
  Contact,
  DecisionMakerCandidate,
  AgentReachDossier,
  SocialIntelligence,
} from '@/lib/types';
import { cn } from '@/lib/utils';

function renderFormattedSummary(text: string) {
  if (!text) return null;
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  return (
    <ul className="space-y-2">
      {lines.map((line, idx) => {
        const cleaned = line.replace(/^[-*•]\s*/, '').trim();
        const boldMatch = cleaned.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
        if (boldMatch) {
          return (
            <li key={idx} className="flex items-start gap-2 text-xs">
              <span className="text-emerald-600 font-bold mt-0.5">•</span>
              <span>
                <strong className="font-semibold text-slate-900 dark:text-slate-100">{boldMatch[1]}:</strong>{' '}
                <span className="text-slate-700 dark:text-slate-300">{boldMatch[2]}</span>
              </span>
            </li>
          );
        }
        return (
          <li key={idx} className="flex items-start gap-2 text-xs">
            <span className="text-emerald-600 font-bold mt-0.5">•</span>
            <span className="text-slate-700 dark:text-slate-300">{cleaned}</span>
          </li>
        );
      })}
    </ul>
  );
}

interface UnifiedIntelligenceHubProps {
  lead: Lead;
  onLeadUpdated?: (updatedFields: Partial<Lead>) => void;
  onContactAdded?: (newContact: Contact) => void;
  onEnrichLead?: () => Promise<void>;
  isEnrichingLead?: boolean;
}

export function UnifiedIntelligenceHub({
  lead,
  onLeadUpdated,
  onContactAdded,
  onEnrichLead,
  isEnrichingLead = false,
}: UnifiedIntelligenceHubProps) {
  const { toast } = useToast();
  const [isRunningDossier, setIsRunningDossier] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [isFindingPeople, setIsFindingPeople] = useState(false);
  const [addingContactUrl, setAddingContactUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Shipping summary state
  const [localShippingSummary, setLocalShippingSummary] = useState<string | null>(null);
  const [isSummarizingShipping, setIsSummarizingShipping] = useState<boolean>(false);
  const [isRawSnippetsOpen, setIsRawSnippetsOpen] = useState<boolean>(false);

  // Branch & Postal filtering state
  const [branchStateFilter, setBranchStateFilter] = useState<string>('ALL');
  const [branchSearchQuery, setBranchSearchQuery] = useState<string>('');
  const [showAllBranches, setShowAllBranches] = useState<boolean>(false);
  const [poBoxSearchQuery, setPoBoxSearchQuery] = useState<string>('');
  const [showAllPoBoxes, setShowAllPoBoxes] = useState<boolean>(false);

  // ----------------------------------------------------
  // Agent Reach Data
  // ----------------------------------------------------
  const dossier: AgentReachDossier | undefined = lead.discoveryData?.agentReachDossier;
  const candidates: DecisionMakerCandidate[] =
    lead.discoveryData?.decisionMakerCandidates || dossier?.decisionMakers || [];
  const social: SocialIntelligence | undefined =
    lead.discoveryData?.socialIntelligence || dossier?.socialIntelligence;
  const logistics = dossier?.logisticsSignals;
  const reachEnrichment = dossier?.enrichment;
  const effectiveShippingSummary = localShippingSummary || logistics?.shippingSummary;

  // ----------------------------------------------------
  // AI Scrape Data Extraction (All original fields preserved)
  // ----------------------------------------------------
  const lodgementEvidence =
    lead.lodgementEvidence ||
    lead.discoveryData?.lodgementEvidence ||
    (lead as any).lodgement_evidence ||
    (lead as any)['Lodgement Evidence'];
  const shipperEvidence =
    lead.shipperEvidence ||
    lead.discoveryData?.shipperEvidence ||
    (lead as any).shipper_evidence ||
    (lead as any)['Shipper Evidence'];
  const shopifyDetected =
    lead.shopifyDetected ||
    lead.discoveryData?.shopifyDetected ||
    lead.ecommercePlatform ||
    lead.discoveryData?.ecommercePlatform ||
    (lead as any).shopify_detected ||
    (lead as any).shopify ||
    (lead as any)['Shopify Detected'];
  const ecommercePlatform =
    lead.ecommercePlatform ||
    lead.discoveryData?.ecommercePlatform ||
    shopifyDetected;
  const prospectSummary =
    lead.prospectSummary ||
    lead.discoveryData?.prospectSummary ||
    (lead as any).prospect_summary ||
    (lead as any)['Prospect Summary'] ||
    (lead as any).companyDescription;
  const xeroDetected =
    lead.xeroDetected ||
    lead.discoveryData?.xeroDetected ||
    (lead as any).xero_detected ||
    (lead as any).xero ||
    (lead as any)['Xero Detected'];
  const apRelationship =
    lead.apRelationship ||
    lead.discoveryData?.apRelationship ||
    (lead as any).ap_relationship ||
    (lead as any)['AP Relationship'] ||
    (lead as any)['AP Relationship '] ||
    lead.discoveryData?.postOfficeRelationship;
  const suggestedProduct =
    lead.suggestedProduct ||
    lead.discoveryData?.suggestedProduct ||
    (lead as any).suggested_product ||
    (lead as any)['Suggessted Product'] ||
    (lead as any)['Suggested Product'] ||
    lead.discoveryData?.interestedIn ||
    lead.interestedIn;
  const suggestedOpener =
    lead.suggestedOpener ||
    lead.discoveryData?.suggestedOpener ||
    (lead as any).suggested_opener ||
    (lead as any)['Suggessted Opener'] ||
    (lead as any)['Suggested Opener'];
  const suggestedPersonalisation =
    lead.suggestedPersonalisation ||
    lead.discoveryData?.suggestedPersonalisation ||
    (lead as any).suggested_personalisation ||
    (lead as any)['Suggested Personalisation'] ||
    (lead as any)['Suggested Personalization'];
  const similarSignedCustomers =
    lead.similarSignedCustomers ||
    lead.discoveryData?.similarSignedCustomers ||
    (lead as any).similar_signed_customers ||
    [];
  const hasParcelShipping =
    lead.hasParcelShipping !== undefined
      ? lead.hasParcelShipping
      : lead.discoveryData?.hasParcelShipping;
  const hasMultipleBranches =
    lead.hasMultipleBranches !== undefined
      ? lead.hasMultipleBranches
      : lead.discoveryData?.hasMultipleBranches;
  const totalBranchCount =
    lead.totalBranchCount || lead.discoveryData?.totalBranchCount;
  const branchLocations =
    lead.branchLocations || lead.discoveryData?.branchLocations || [];
  const hasPoBox =
    lead.hasPoBox !== undefined ? lead.hasPoBox : lead.discoveryData?.hasPoBox;
  const postalAddresses: any[] =
    lead.postalAddresses || lead.discoveryData?.postalAddresses || [];

  const isPoBoxItem = (item: any) => {
    if (item.isPoBox) return true;
    const str = `${item.locationName || ''} ${item.street || ''} ${item.notes || ''}`.toLowerCase();
    return /(?:p\.?o\.?\s*box|gpo\s*box|locked\s*bag|private\s*bag|post\s*office\s*box)/i.test(str);
  };

  const rawBranchLocations: any[] = branchLocations || [];
  const physicalBranchLocations: any[] = rawBranchLocations.filter(
    (loc) => !isPoBoxItem(loc)
  );
  const combinedPostalAddresses: any[] = [
    ...postalAddresses,
    ...rawBranchLocations.filter(
      (loc) =>
        isPoBoxItem(loc) &&
        !postalAddresses.some(
          (p) =>
            (p.suburb === loc.suburb && p.postcode === loc.postcode) ||
            p.locationName === loc.locationName
        )
    ),
  ];

  const effectiveHasPoBox = Boolean(hasPoBox || combinedPostalAddresses.length > 0);
  const effectiveHasMultipleBranches =
    hasMultipleBranches !== undefined
      ? physicalBranchLocations.length >= 2 ||
        (hasMultipleBranches &&
          physicalBranchLocations.length !== 1 &&
          physicalBranchLocations.length !== 0)
      : physicalBranchLocations.length >= 2;
  const effectiveBranchCount =
    physicalBranchLocations.length > 0
      ? physicalBranchLocations.length
      : totalBranchCount || 1;

  const isNoApRel =
    !apRelationship ||
    /no\s*(existing)?\s*relationship|none|unknown|not\s*detected/i.test(
      apRelationship
    );
  const effectiveApRelationship =
    (effectiveHasPoBox || combinedPostalAddresses.length > 0) && isNoApRel
      ? `Australia Post PO Box Service (${combinedPostalAddresses
          .map((p) =>
            [p.boxNumber || p.street || p.locationName, p.suburb, p.state, p.postcode]
              .filter(Boolean)
              .join(' ')
          )
          .join(', ') || 'PO Box Address'})`
      : apRelationship || 'Not Detected';

  const hasSeparateEcommerceEntity =
    lead.hasSeparateEcommerceEntity !== undefined
      ? lead.hasSeparateEcommerceEntity
      : lead.discoveryData?.hasSeparateEcommerceEntity;
  const linkedEcommerceEntities =
    lead.linkedEcommerceEntities ||
    lead.discoveryData?.linkedEcommerceEntities ||
    [];
  const mainEntityRole =
    lead.mainEntityRole || lead.discoveryData?.mainEntityRole;
  const fulfilmentModel =
    lead.fulfilmentModel || lead.discoveryData?.fulfilmentModel;

  const getEcommerceBadgeInfo = (rawPlatform?: string) => {
    if (!rawPlatform || rawPlatform.trim() === '' || rawPlatform === 'Not Checked') {
      return {
        label: 'Not Checked',
        badge: 'Not Checked',
        className:
          'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
      };
    }
    const norm = rawPlatform.toLowerCase().trim();
    if (norm === 'yes' || norm === 'shopify') {
      return {
        label: 'Shopify',
        badge: '✓ Shopify',
        className:
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300',
      };
    }
    if (norm === 'woocommerce') {
      return {
        label: 'WooCommerce',
        badge: '✓ WooCommerce',
        className:
          'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300',
      };
    }
    if (norm === 'bigcommerce') {
      return {
        label: 'BigCommerce',
        badge: '✓ BigCommerce',
        className:
          'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300',
      };
    }
    if (norm === 'magento') {
      return {
        label: 'Magento',
        badge: '✓ Magento',
        className:
          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300',
      };
    }
    if (norm === 'squarespace') {
      return {
        label: 'Squarespace',
        badge: '✓ Squarespace',
        className:
          'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300',
      };
    }
    if (norm === 'wix') {
      return {
        label: 'Wix',
        badge: '✓ Wix',
        className:
          'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300',
      };
    }
    if (norm === 'custom' || norm.includes('custom')) {
      return {
        label: 'Custom Cart / Portal',
        badge: 'Custom eCommerce',
        className:
          'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300',
      };
    }
    if (norm === 'no' || norm === 'none' || norm === 'not detected') {
      return {
        label: 'Not Detected',
        badge: 'Not Detected',
        className:
          'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
      };
    }
    return {
      label: rawPlatform,
      badge: rawPlatform,
      className:
        'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
    };
  };

  const ecomBadgeInfo = getEcommerceBadgeInfo(ecommercePlatform);

  const hasAiEnrichment = Boolean(
    lodgementEvidence ||
      shipperEvidence ||
      shopifyDetected ||
      ecommercePlatform ||
      prospectSummary ||
      xeroDetected ||
      apRelationship ||
      suggestedProduct ||
      suggestedOpener ||
      suggestedPersonalisation ||
      hasParcelShipping !== undefined ||
      hasMultipleBranches !== undefined ||
      effectiveHasPoBox ||
      combinedPostalAddresses.length > 0 ||
      hasSeparateEcommerceEntity !== undefined ||
      (linkedEcommerceEntities && linkedEcommerceEntities.length > 0) ||
      (physicalBranchLocations && physicalBranchLocations.length > 0) ||
      (similarSignedCustomers && similarSignedCustomers.length > 0)
  );

  const hasAgentReach = Boolean(dossier || candidates.length > 0);

  // ----------------------------------------------------
  // Actions
  // ----------------------------------------------------
  const handleRunDeepResearch = async () => {
    if (!lead.id) return;
    setIsRunningDossier(true);
    try {
      const res = await fetch(
        `/api/leads/${encodeURIComponent(lead.id)}/deep-research`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to generate deep research');
      }

      const newDossier: AgentReachDossier = json.data;
      if (onLeadUpdated) {
        onLeadUpdated({
          discoveryData: {
            ...lead.discoveryData,
            agentReachDossier: newDossier,
            decisionMakerCandidates: newDossier.decisionMakers,
            socialIntelligence: newDossier.socialIntelligence,
          },
          websiteUrl: lead.websiteUrl || newDossier.officialWebsite,
        });
      }

      toast({
        title: 'Deep Research Complete',
        description: `Discovered ${newDossier.decisionMakers.length} decision makers and verified logistics evidence.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Research Failed',
        description: err.message || 'Could not complete Agent Reach research.',
      });
    } finally {
      setIsRunningDossier(false);
    }
  };

  const handleRunBoth = async () => {
    setIsRunningAll(true);
    try {
      const promises: Promise<any>[] = [handleRunDeepResearch()];
      if (onEnrichLead) {
        promises.push(onEnrichLead());
      }
      await Promise.allSettled(promises);
      toast({
        title: 'Full Intelligence Completed',
        description: 'Both AI Website Scrape and Agent Reach Live Signals have been refreshed.',
      });
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleSummarizeShipping = async () => {
    if (!logistics?.rawSnippets || logistics.rawSnippets.length === 0) return;
    setIsSummarizingShipping(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/summarize-shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawSnippets: logistics.rawSnippets }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to summarize shipping evidence');
      }

      setLocalShippingSummary(data.summary);

      if (onLeadUpdated && dossier) {
        onLeadUpdated({
          discoveryData: {
            ...lead.discoveryData,
            agentReachDossier: {
              ...dossier,
              logisticsSignals: {
                ...dossier.logisticsSignals,
                shippingSummary: data.summary,
              },
            },
          },
        });
      }

      toast({
        title: 'Shipping Policy Summarized',
        description: 'AI has synthesized the raw evidence into structured logistics takeaways.',
      });
    } catch (err: any) {
      toast({
        title: 'Summarization Failed',
        description: err.message || 'Could not generate summary at this time.',
        variant: 'destructive',
      });
    } finally {
      setIsSummarizingShipping(false);
    }
  };

  const handleFindDecisionMakers = async () => {
    if (!lead.id) return;
    setIsFindingPeople(true);
    try {
      const res = await fetch(
        `/api/leads/${encodeURIComponent(lead.id)}/find-decision-makers`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to find decision makers');
      }

      const found: DecisionMakerCandidate[] = json.data || [];
      if (onLeadUpdated) {
        onLeadUpdated({
          discoveryData: {
            ...lead.discoveryData,
            decisionMakerCandidates: found,
          },
        });
      }
      toast({
        title: 'Decision Makers Found',
        description: `Found ${found.length} decision makers on LinkedIn.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: err.message || 'Could not find decision makers.',
      });
    } finally {
      setIsFindingPeople(false);
    }
  };

  const handleAddCandidateToContacts = async (candidate: DecisionMakerCandidate) => {
    if (!lead.id) return;
    setAddingContactUrl(candidate.linkedinUrl || candidate.name);
    try {
      const res = await fetch(
        `/api/leads/${encodeURIComponent(lead.id)}/find-decision-makers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_contact', candidate }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to add contact');
      }

      const newContact: Contact = json.contact;
      if (onContactAdded) {
        onContactAdded(newContact);
      }
      toast({
        title: 'Contact Added',
        description: `${candidate.name} has been added to the lead contacts list.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Could Not Add Contact',
        description: err.message,
      });
    } finally {
      setAddingContactUrl(null);
    }
  };

  const isAlreadyContact = (candidate: DecisionMakerCandidate): boolean => {
    if (!lead.contacts || lead.contacts.length === 0) return false;
    return lead.contacts.some(
      (c) =>
        (c?.linkedinUrl &&
          candidate.linkedinUrl &&
          c.linkedinUrl.toLowerCase().trim() ===
            candidate.linkedinUrl.toLowerCase().trim()) ||
        (c?.name &&
          candidate.name &&
          c.name.toLowerCase().trim() === candidate.name.toLowerCase().trim())
    );
  };

  const topDecisionMaker =
    candidates.find((c) => c.confidence === 'High') || candidates[0];

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
      {/* ---------------------------------------------------- */}
      {/* CARD HEADER & ACTION TOOLBAR */}
      {/* ---------------------------------------------------- */}
      <CardHeader className="bg-slate-50/70 dark:bg-slate-800/50 pb-3 border-b">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#095c7b]/10 rounded-xl text-[#095c7b] dark:text-[#38bdf8] shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                <span>Lead Intelligence & Reach Hub</span>
                {hasAiEnrichment && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-[10px] font-semibold"
                  >
                    ✓ Enriched (AI)
                  </Badge>
                )}
                {hasAgentReach && (
                  <Badge
                    variant="outline"
                    className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800 text-[10px] font-semibold"
                  >
                    ✓ Agent Reach (Live)
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                AI website classification, physical branches, PO boxes, live logistics signals, LinkedIn decision makers, and delivery sentiment.
              </CardDescription>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              size="sm"
              onClick={handleRunBoth}
              disabled={isRunningAll || isRunningDossier || isEnrichingLead}
              className="bg-[#095c7b] hover:bg-[#074b64] text-white shadow-xs font-semibold text-xs h-8 px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
            >
              {isRunningAll || isEnrichingLead || isRunningDossier ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1 text-white" />
                  <span>Running Complete Intel...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300" />
                  <span>Run Complete Intel (AI + Agent Reach)</span>
                </>
              )}
            </Button>

            <FindDecisionMakersDialog
              lead={lead}
              candidates={candidates}
              onCandidateAdded={onContactAdded}
              onCandidatesRefreshed={(newCandidates) => {
                if (onLeadUpdated) {
                  onLeadUpdated({
                    discoveryData: {
                      ...lead.discoveryData,
                      decisionMakerCandidates: newCandidates,
                    },
                  });
                }
              }}
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 px-3 border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-medium rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  <span>Decision Makers {candidates.length > 0 ? `(${candidates.length})` : ''}</span>
                </Button>
              }
            />
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* SUB-TABS NAVIGATION BAR */}
        {/* ---------------------------------------------------- */}
        <div className="pt-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-100/90 dark:bg-slate-800/80 p-0.5 h-9 rounded-lg flex flex-wrap gap-0.5">
              <TabsTrigger value="overview" className="text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#095c7b]" />
                Synthesized Overview
              </TabsTrigger>
              <TabsTrigger value="ai-scrape" className="text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                AI Website Scrape {hasAiEnrichment && <span className="text-[10px] text-emerald-600">●</span>}
              </TabsTrigger>
              <TabsTrigger value="agent-reach" className="text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-600" />
                Agent Reach Signals {hasAgentReach && <span className="text-[10px] text-sky-600">●</span>}
              </TabsTrigger>
              <TabsTrigger value="decision-makers" className="text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                Decision Makers ({candidates.length})
              </TabsTrigger>
              <TabsTrigger value="social" className="text-xs font-semibold py-1.5 px-3">
                💬 Social & Sentiment
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="pt-5 pb-6">
        {/* ==================================================== */}
        {/* TAB 1: SYNTHESIZED OVERVIEW */}
        {/* ==================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {!hasAiEnrichment && !hasAgentReach ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">No Intelligence Recorded Yet</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Run &quot;Run Complete Intel&quot; to simultaneously analyze the company website with AI and gather live web, carrier, and LinkedIn decision maker signals via Agent Reach.
                </p>
                <Button size="sm" onClick={handleRunBoth} className="bg-[#095c7b] hover:bg-[#074b64] text-white text-xs">
                  <Zap className="w-3.5 h-3.5 mr-1 text-amber-300" /> Run Complete Intel
                </Button>
              </div>
            ) : (
              <>
                {/* 1. TOP DECISION MAKER CALLOUT (IF FOUND) */}
                {topDecisionMaker && (
                  <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-slate-800/90 dark:to-slate-850 rounded-xl border border-blue-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {topDecisionMaker.name}
                          </span>
                          <Badge className="text-[10px] bg-blue-100 text-blue-800 border-none">
                            Primary Decision Maker
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{topDecisionMaker.title}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {topDecisionMaker.linkedinUrl && (
                        <a
                          href={topDecisionMaker.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-800 border"
                        >
                          <Linkedin className="w-3.5 h-3.5 text-blue-600" /> LinkedIn <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      )}
                      {isAlreadyContact(topDecisionMaker) ? (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 py-1">
                          <Check className="w-3.5 h-3.5 mr-1" /> In Contacts
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAddCandidateToContacts(topDecisionMaker)}
                          disabled={addingContactUrl === topDecisionMaker.name}
                          className="h-8 text-xs bg-[#095c7b] hover:bg-[#074b64] text-white font-semibold shadow-2xs px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add to Contacts
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. DUAL-SOURCE COMPARISON GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: AI Website Scrape Summary */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#095c7b]" /> AI Website Scrape
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800">
                        Direct Site Crawl
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Industry Classification</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {lead.industryCategory || 'Not yet classified'}
                          {lead.industrySubCategory && (
                            <span className="text-slate-500 font-normal"> — {lead.industrySubCategory}</span>
                          )}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-slate-400 text-[11px] block">eCommerce Cart Tech</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {ecomBadgeInfo.label}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Physical Footprint</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {effectiveBranchCount > 1
                              ? `${effectiveBranchCount} Australian Sites`
                              : 'Single Location HQ'}
                            {effectiveHasPoBox && ' (PO Box)'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-slate-400 text-[11px] block">Xero Accounting</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {xeroDetected || 'None detected'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Parcel Shipping Status</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {hasParcelShipping ? '✓ Verified Shipper' : 'Unconfirmed'}
                          </span>
                        </div>
                      </div>

                      {similarSignedCustomers && similarSignedCustomers.length > 0 && (
                        <div className="pt-1">
                          <span className="text-slate-400 text-[11px] block">Social Proof Match</span>
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            {similarSignedCustomers.length} similar signed clients in CRM
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Agent Reach Live Signals */}
                  <div className="p-4 rounded-xl border border-sky-100 dark:border-sky-950/60 bg-sky-50/30 dark:bg-sky-950/20 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-sky-100 dark:border-sky-900/60">
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-sky-600" /> Agent Reach Live Signals
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-sky-100/70 text-sky-800 border-sky-200">
                        Exa Live Web + LinkedIn
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Verified Domain</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {dossier?.verifiedDomain || lead.websiteUrl || 'Not verified'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-slate-400 text-[11px] block">Detected Parcel Carriers</span>
                          {logistics?.carrierDetected && logistics.carrierDetected.length > 0 ? (
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              {logistics.carrierDetected.join(', ')}
                            </span>
                          ) : (
                            <span className="text-slate-500">None detected</span>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Daily Dispatch Cutoff</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {logistics?.cutoffTimes || 'Not explicitly stated'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 text-[11px] block">Key Decision Makers</span>
                          <span className="font-semibold text-blue-700 dark:text-blue-400">
                            {candidates.length > 0 ? `${candidates.length} profiles identified` : 'Not yet scanned'}
                          </span>
                        </div>
                        {social?.instagramHandle && (
                          <div className="text-right">
                            <span className="text-slate-400 text-[11px] block">Instagram</span>
                            <span className="font-semibold text-pink-600">
                              {social.instagramHandle} {social.followersCount ? `(${social.followersCount})` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. EXECUTIVE PROSPECT SUMMARY */}
                {prospectSummary && (
                  <div className="p-4 bg-gradient-to-br from-blue-50/60 to-slate-50 dark:from-slate-800/80 dark:to-slate-900 rounded-xl border border-blue-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#095c7b] dark:text-[#38bdf8] flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> Executive Prospect Summary
                      </span>
                      <CopyButton textToCopy={prospectSummary} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words max-h-80 overflow-y-auto pr-1">
                      {prospectSummary}
                    </p>
                  </div>
                )}

                {/* 4. SUGGESTED PRODUCT & SUGGESTED OPENER */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {suggestedProduct && (
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                        <Package className="w-4 h-4" /> Suggested Product
                      </span>
                      <p className="text-base font-bold text-emerald-900 dark:text-emerald-200 break-words">
                        {suggestedProduct}
                      </p>
                    </div>
                  )}

                  {suggestedOpener && (
                    <div
                      className={cn(
                        'p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/40 space-y-1.5',
                        suggestedProduct ? 'md:col-span-2' : 'md:col-span-3'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                          <PhoneCall className="w-4 h-4" /> Suggested Opener
                        </span>
                        <CopyButton textToCopy={suggestedOpener} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 italic bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-800/50 break-words max-h-60 overflow-y-auto">
                        &quot;{suggestedOpener}&quot;
                      </p>
                    </div>
                  )}
                </div>

                {/* Additional Live Web Opener (Agent Reach) if distinct */}
                {reachEnrichment?.suggestedOpener &&
                  reachEnrichment.suggestedOpener !== suggestedOpener && (
                    <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200/80 dark:border-sky-900/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-sky-700" /> Live Web Tailored Opener (Agent Reach)
                        </span>
                        <CopyButton textToCopy={reachEnrichment.suggestedOpener} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 italic bg-white/80 dark:bg-slate-850/80 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/50 break-words">
                        &quot;{reachEnrichment.suggestedOpener}&quot;
                      </p>
                    </div>
                  )}

                {/* 5. SUGGESTED PERSONALISATION */}
                {suggestedPersonalisation && (
                  <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> Suggested Personalisation
                      </span>
                      <CopyButton textToCopy={suggestedPersonalisation} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words max-h-60 overflow-y-auto pr-1">
                      {suggestedPersonalisation}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: AGENT REACH LIVE SIGNALS */}
        {/* ==================================================== */}
        {activeTab === 'agent-reach' && (
          <div className="space-y-5">
            {!hasAgentReach ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed text-slate-500 text-xs">
                <Compass className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Agent Reach Not Yet Run</p>
                <p className="text-slate-500 mt-1 mb-3">
                  Run Deep Research to search Exa for logistics terms, detected carriers, cutoff times, and LinkedIn decision makers.
                </p>
                <Button size="sm" onClick={handleRunDeepResearch} disabled={isRunningDossier} className="bg-[#095c7b] text-white text-xs">
                  Run Deep Research
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                      Detected Parcel Carriers
                    </span>
                    {logistics?.carrierDetected && logistics.carrierDetected.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {logistics.carrierDetected.map((carrier) => (
                          <Badge key={carrier} variant="secondary" className="text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
                            {carrier}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">None detected</span>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> Daily Dispatch Cutoff
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {logistics?.cutoffTimes || 'Not explicitly stated'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                      Verified Domain
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {dossier?.verifiedDomain || lead.websiteUrl || 'Not verified'}
                    </span>
                  </div>
                </div>

                {/* AI Shipping Policy & Carrier Intelligence */}
                {(effectiveShippingSummary || (logistics?.rawSnippets && logistics.rawSnippets.length > 0)) && (
                  <div className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                              Shipping Policy & Carrier Intelligence
                            </span>
                            <Badge className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-none font-semibold px-1.5 py-0 h-4">
                              AI Synthesized
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500">Live operational & fulfillment summary derived from web evidence.</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSummarizeShipping}
                        disabled={isSummarizingShipping}
                        className="h-7 text-xs px-2.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-medium rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSummarizingShipping ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                            <span>Summarizing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-emerald-600 mr-1" />
                            <span>{effectiveShippingSummary ? 'Re-summarize' : 'Summarize with AI'}</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Summary content */}
                    {effectiveShippingSummary ? (
                      <div className="bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 rounded-lg border border-emerald-100/80 dark:border-emerald-900/40">
                        {renderFormattedSummary(effectiveShippingSummary)}
                      </div>
                    ) : (
                      <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            Raw web evidence indexed ({logistics?.rawSnippets?.length || 0} excerpts). Click <strong>Summarize with AI</strong> to generate a structured 3-bullet sales takeaway.
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleSummarizeShipping}
                          disabled={isSummarizingShipping}
                          className="h-7 text-xs bg-[#095c7b] hover:bg-[#074b64] text-white shrink-0 shadow-2xs font-semibold cursor-pointer"
                        >
                          {isSummarizingShipping ? (
                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Sparkles className="w-3 h-3 mr-1" />
                          )}
                          Summarize Now
                        </Button>
                      </div>
                    )}

                    {/* Collapsible raw snippets drawer */}
                    {logistics?.rawSnippets && logistics.rawSnippets.length > 0 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setIsRawSnippetsOpen((prev) => !prev)}
                          className="flex items-center justify-between w-full text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 py-1 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>View Raw Source Citations ({logistics.rawSnippets.length} web search excerpts)</span>
                          </span>
                          {isRawSnippetsOpen ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>

                        {isRawSnippetsOpen && (
                          <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200/80 dark:border-slate-700/70 max-h-60 overflow-y-auto space-y-2">
                            {logistics.rawSnippets.map((snippet, idx) => (
                              <div
                                key={idx}
                                className="text-[11px] text-slate-600 dark:text-slate-400 p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700/60 leading-relaxed font-mono"
                              >
                                &ldquo;{snippet}&rdquo;
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Talking Points from Agent Reach */}
                {reachEnrichment?.talkingPoints && reachEnrichment.talkingPoints.length > 0 && (
                  <div className="p-4 bg-blue-50/50 dark:bg-slate-800/60 rounded-xl border border-blue-200/60 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                      Sales Talking Points (Derived from Live Signals)
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {reachEnrichment.talkingPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: AI WEBSITE SCRAPE (100% PRESERVED FIDELITY) */}
        {/* ==================================================== */}
        {activeTab === 'ai-scrape' && (
          <div className="space-y-6">
            {!hasAiEnrichment ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed text-slate-500 text-xs">
                <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No Website Scrape Data</p>
                <p className="text-slate-500 mt-1 mb-3">
                  Click below to crawl the website, extract branch footprint, match signed customers, and verify e-commerce cart tech.
                </p>
                {onEnrichLead && (
                  <Button size="sm" onClick={onEnrichLead} disabled={isEnrichingLead} className="bg-[#095c7b] text-white text-xs">
                    Enrich Website (AI)
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* 1. Industry Classification Banner */}
                <div className="p-4 bg-gradient-to-r from-sky-50/80 via-blue-50/50 to-indigo-50/50 dark:from-slate-800/80 dark:to-slate-900 rounded-xl border border-sky-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-sky-800 dark:text-sky-300">
                      Classified Industry Category & Sub-Category
                    </span>
                    <div className="flex items-center flex-wrap gap-2">
                      <Badge className="bg-[#095c7b] text-white font-semibold text-xs px-2.5 py-0.5 shadow-xs">
                        {lead.industryCategory || 'Unclassified'}
                      </Badge>
                      {lead.industrySubCategory && (
                        <Badge variant="outline" className="bg-white/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-sky-300 dark:border-sky-800 font-medium text-xs">
                          {lead.industrySubCategory}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
                    {hasParcelShipping !== undefined && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs font-semibold px-2.5 py-1',
                          hasParcelShipping
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 border-amber-300'
                        )}
                      >
                        {hasParcelShipping ? '📦 Verified Parcel Shipper' : '⚠️ Non-Shipper / Service Only'}
                      </Badge>
                    )}
                    {effectiveHasMultipleBranches !== undefined && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs font-semibold px-2.5 py-1',
                          effectiveHasMultipleBranches
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                        )}
                      >
                        {effectiveHasMultipleBranches
                          ? `🏢 Multi-Branch Footprint (${effectiveBranchCount} Sites)`
                          : '📍 Single Location Operation'}
                      </Badge>
                    )}
                    {effectiveHasPoBox && (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-semibold px-2.5 py-1"
                      >
                        📬 PO Box Identified ({combinedPostalAddresses.length || 1})
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 2. Top Metrics Row: eCommerce, Xero, AP Relationship */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">eCommerce Platform</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {ecomBadgeInfo.label}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('text-xs font-semibold px-2.5 py-1', ecomBadgeInfo.className)}>
                      {ecomBadgeInfo.badge}
                    </Badge>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Xero Detected</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {xeroDetected || 'Not Checked'}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1',
                        xeroDetected?.toLowerCase() === 'yes'
                          ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                      )}
                    >
                      {xeroDetected?.toLowerCase() === 'yes' ? '✓ Xero' : 'None'}
                    </Badge>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">AP Relationship</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {effectiveApRelationship && (
                          <CopyButton textToCopy={effectiveApRelationship} className="h-5 w-5" iconClassName="h-3 w-3" />
                        )}
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-semibold px-2 py-0.5">
                          AP Signal
                        </Badge>
                      </div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-sm font-bold text-[#095c7b] dark:text-[#38bdf8] mt-1.5 break-words max-h-24 overflow-y-auto pr-1 leading-snug cursor-text">
                            {effectiveApRelationship}
                          </div>
                        </TooltipTrigger>
                        {effectiveApRelationship && (
                          <TooltipContent side="top" className="max-w-md text-xs bg-slate-900 text-white p-3 shadow-xl break-words">
                            <p className="font-semibold text-[10px] text-amber-300 uppercase tracking-wider mb-1">Full AP Relationship</p>
                            <p className="leading-relaxed whitespace-pre-wrap">{effectiveApRelationship}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* 3. Physical Branch Locations */}
                {(effectiveHasMultipleBranches || physicalBranchLocations.length > 1) ? (() => {
                  const allLocs: any[] = physicalBranchLocations;
                  const stateCounts: Record<string, number> = {};
                  allLocs.forEach((loc) => {
                    const st = (loc.state || 'OTHER').toUpperCase().trim();
                    stateCounts[st] = (stateCounts[st] || 0) + 1;
                  });
                  const availableStates = Object.keys(stateCounts).sort();

                  const filteredLocs = allLocs.filter((loc) => {
                    if (branchStateFilter !== 'ALL') {
                      const st = (loc.state || 'OTHER').toUpperCase().trim();
                      if (st !== branchStateFilter) return false;
                    }
                    if (branchSearchQuery.trim()) {
                      const q = branchSearchQuery.toLowerCase().trim();
                      const match =
                        (loc.locationName || '').toLowerCase().includes(q) ||
                        (loc.suburb || '').toLowerCase().includes(q) ||
                        (loc.state || '').toLowerCase().includes(q) ||
                        (loc.postcode || '').toLowerCase().includes(q) ||
                        (loc.street || '').toLowerCase().includes(q) ||
                        (loc.notes || '').toLowerCase().includes(q);
                      if (!match) return false;
                    }
                    return true;
                  });

                  const INITIAL_LIMIT = 6;
                  const visibleLocs = showAllBranches ? filteredLocs : filteredLocs.slice(0, INITIAL_LIMIT);
                  const hasMore = filteredLocs.length > INITIAL_LIMIT;

                  const allAddressesText = allLocs
                    .map(
                      (l, i) =>
                        `${i + 1}. ${l.locationName || 'Branch'} - ${[l.street, l.suburb, l.state, l.postcode].filter(Boolean).join(', ')}${l.phone ? ` (Phone: ${l.phone})` : ''}`
                    )
                    .join('\n');

                  return (
                    <div className="p-4 bg-gradient-to-br from-indigo-50/60 via-sky-50/40 to-slate-50 dark:from-slate-800/80 dark:to-slate-900 rounded-xl border border-indigo-200/80 dark:border-indigo-900/40 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                              Australian Branch Footprint & Locations
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {effectiveBranchCount || allLocs.length} physical locations / branch offices identified across Australia
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {allAddressesText && (
                            <CopyButton
                              textToCopy={allAddressesText}
                              className="h-7 text-xs bg-white dark:bg-slate-800 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            />
                          )}
                          <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold text-xs px-2.5 py-0.5">
                            🏢 Multi-Branch Footprint
                          </Badge>
                        </div>
                      </div>

                      {/* State Filter Pills */}
                      {allLocs.length > 3 && (
                        <div className="pt-1 space-y-2 border-t border-indigo-100/80 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setBranchStateFilter('ALL')}
                                className={cn(
                                  'px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors border',
                                  branchStateFilter === 'ALL'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 hover:bg-slate-50'
                                )}
                              >
                                All ({allLocs.length})
                              </button>
                              {availableStates.map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => setBranchStateFilter(branchStateFilter === st ? 'ALL' : st)}
                                  className={cn(
                                    'px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors border',
                                    branchStateFilter === st
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 hover:bg-slate-50'
                                  )}
                                >
                                  {st} ({stateCounts[st]})
                                </button>
                              ))}
                            </div>

                            {allLocs.length > 6 && (
                              <div className="relative w-full sm:w-48">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={branchSearchQuery}
                                  onChange={(e) => setBranchSearchQuery(e.target.value)}
                                  placeholder="Filter branches..."
                                  className="w-full text-xs pl-8 pr-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Grid of Locations */}
                      {visibleLocs.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400">
                          No branches match the current filter.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                          {visibleLocs.map((loc: any, idx: number) => {
                            const fullAddrStr = [loc.street, loc.suburb, loc.state, loc.postcode].filter(Boolean).join(', ');
                            return (
                              <div
                                key={idx}
                                className="bg-white dark:bg-slate-800/90 p-3.5 rounded-xl border border-indigo-100/90 dark:border-slate-700 shadow-xs space-y-1.5 relative group hover:border-indigo-300 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                                      <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span className="truncate">{loc.locationName || `Location #${idx + 1}`}</span>
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {loc.isHeadOffice && (
                                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] px-1.5 py-0">
                                        HQ
                                      </Badge>
                                    )}
                                    {loc.state && (
                                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold px-1.5 py-0">
                                        {loc.state}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 pl-5">
                                  {loc.street && <p className="truncate text-slate-500">{loc.street}</p>}
                                  <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {[loc.suburb, loc.state, loc.postcode].filter(Boolean).join(' ') || 'Address detail pending'}
                                  </p>
                                  {loc.phone && (
                                    <p className="text-slate-500 flex items-center gap-1 mt-1">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      <span>{loc.phone}</span>
                                    </p>
                                  )}
                                  {loc.notes && (
                                    <p className="text-[10px] text-slate-400 italic pt-0.5">{loc.notes}</p>
                                  )}
                                </div>

                                {fullAddrStr && (
                                  <div className="pt-1 flex justify-end">
                                    <CopyButton textToCopy={fullAddrStr} className="h-5 w-5" iconClassName="h-3 w-3" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Expand / Collapse Toggle */}
                      {(hasMore || showAllBranches) && (
                        <div className="pt-2 flex items-center justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllBranches(!showAllBranches)}
                            className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 border-indigo-200 bg-white hover:bg-indigo-50 dark:bg-slate-800 flex items-center gap-1.5 shadow-xs px-4"
                          >
                            {showAllBranches ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                <span>Show Less (Top {INITIAL_LIMIT} Branches)</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                <span>View All {filteredLocs.length} Locations ({filteredLocs.length - INITIAL_LIMIT} more)</span>
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  hasAiEnrichment && !effectiveHasMultipleBranches && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Single Location Operation</p>
                          <p className="text-[11px] text-slate-500">
                            {physicalBranchLocations.length === 1
                              ? `Primary office: ${[physicalBranchLocations[0].locationName, physicalBranchLocations[0].street, physicalBranchLocations[0].suburb, physicalBranchLocations[0].state, physicalBranchLocations[0].postcode].filter(Boolean).join(', ')}`
                              : 'No additional Australian branches detected. Operates as a single headquarters or facility.'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-300">
                        📍 Single Site HQ
                      </Badge>
                    </div>
                  )
                )}

                {/* 4. Dedicated PO Box & Postal Mail Addresses Section */}
                {combinedPostalAddresses.length > 0 && (() => {
                  const allPostalText = combinedPostalAddresses
                    .map(
                      (p, i) =>
                        `${i + 1}. ${p.locationName || 'Postal Box'} - ${[p.boxNumber || p.street, p.suburb, p.state, p.postcode].filter(Boolean).join(', ')}${p.notes ? ` (${p.notes})` : ''}`
                    )
                    .join('\n');

                  return (
                    <div className="p-4 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-slate-50 dark:from-slate-800/80 dark:to-slate-900 rounded-xl border border-amber-200/80 dark:border-amber-900/40 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-lg">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                              PO Box & Postal Mail Addresses
                              <Badge variant="secondary" className="bg-amber-200/80 text-amber-900 text-[10px] px-1.5 py-0 font-bold">
                                Service Opportunity
                              </Badge>
                            </span>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              {combinedPostalAddresses.length} postal / PO Box collection address{combinedPostalAddresses.length > 1 ? 'es' : ''} identified. Prime candidate for MailPlus Daily PO Box & Mail Delivery service.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {allPostalText && (
                            <CopyButton
                              textToCopy={allPostalText}
                              className="h-7 text-xs bg-white dark:bg-slate-800 border-amber-200 text-amber-800 hover:bg-amber-50"
                            />
                          )}
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-xs px-2.5 py-0.5">
                            📬 MailPlus Daily Mail Candidate
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                        {combinedPostalAddresses.map((box: any, idx: number) => {
                          const postalAddrStr = [box.boxNumber || box.street, box.suburb, box.state, box.postcode].filter(Boolean).join(' ');
                          return (
                            <div
                              key={idx}
                              className="bg-white dark:bg-slate-800/90 p-3.5 rounded-xl border border-amber-100/90 dark:border-slate-700 shadow-xs space-y-1.5 relative group hover:border-amber-300 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                                    <Mail className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="truncate">{box.locationName || `PO Box #${idx + 1}`}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] px-1.5 py-0">
                                    PO BOX
                                  </Badge>
                                  {box.state && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-1.5 py-0">
                                      {box.state}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 pl-5">
                                {(box.boxNumber || box.street) && (
                                  <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{box.boxNumber || box.street}</p>
                                )}
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                  {[box.suburb, box.state, box.postcode].filter(Boolean).join(' ') || 'Postal detail pending'}
                                </p>
                                {box.notes && (
                                  <p className="text-[10px] text-slate-400 italic pt-0.5">{box.notes}</p>
                                )}
                              </div>

                              {postalAddrStr && (
                                <div className="pt-1 flex justify-end">
                                  <CopyButton textToCopy={postalAddrStr} className="h-5 w-5" iconClassName="h-3 w-3" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 5. Linked eCommerce Sites & Fulfilment Entities */}
                {(linkedEcommerceEntities.length > 0 || mainEntityRole || fulfilmentModel || hasSeparateEcommerceEntity) && (
                  <div className="p-4 bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-slate-50 dark:from-slate-800/80 dark:to-slate-900 rounded-xl border border-amber-200/80 dark:border-amber-900/40 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                            Linked eCommerce Sites, Sister Companies & Fulfilment Entities
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {linkedEcommerceEntities.length > 0
                              ? `${linkedEcommerceEntities.length} distinct online storefront / sister brand / dispatch entities identified`
                              : 'Fulfilment and dispatch arrangement details'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasSeparateEcommerceEntity && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 font-semibold text-xs px-2.5 py-0.5">
                            🌐 Separate Storefront / Sister Entity
                          </Badge>
                        )}
                      </div>
                    </div>

                    {(mainEntityRole || fulfilmentModel) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white/90 dark:bg-slate-800/90 rounded-lg border border-amber-100 dark:border-slate-700 text-xs">
                        {mainEntityRole && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Main Company Role</p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{mainEntityRole}</p>
                          </div>
                        )}
                        {fulfilmentModel && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fulfilment & Dispatch Arrangement</p>
                            <p className="font-semibold text-[#095c7b] dark:text-sky-400 mt-0.5">{fulfilmentModel}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {linkedEcommerceEntities && linkedEcommerceEntities.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                        {linkedEcommerceEntities.map((entity: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-slate-800/90 p-3.5 rounded-xl border border-amber-200/70 dark:border-slate-700 shadow-xs space-y-2 relative group hover:border-amber-400 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                                  <ShoppingBag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span className="truncate">{entity.entityName}</span>
                                </p>
                              </div>
                              {entity.relationshipType && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-semibold shrink-0 px-2 py-0">
                                  {entity.relationshipType}
                                </Badge>
                              )}
                            </div>

                            {entity.websiteUrl && (
                              <a
                                href={entity.websiteUrl.startsWith('http') ? entity.websiteUrl : `https://${entity.websiteUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-1 truncate font-medium"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{entity.websiteUrl.replace(/^https?:\/\//, '')}</span>
                              </a>
                            )}

                            {entity.dispatchRole && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                                <p className="font-semibold text-slate-700 dark:text-slate-200 text-[10px] uppercase tracking-wider mb-0.5">Product & Dispatch Role</p>
                                <p className="leading-snug">{entity.dispatchRole}</p>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2 pt-1 text-[10px]">
                              {entity.isPrimaryShipper ? (
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] px-1.5 py-0 font-semibold">
                                  📦 Primary Shipper
                                </Badge>
                              ) : (
                                <span className="text-slate-400">Linked Entity</span>
                              )}
                              {entity.notes && (
                                <span className="text-slate-500 italic truncate max-w-[140px]" title={entity.notes}>
                                  {entity.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Similar Signed Customers (Social Proof) */}
                {similarSignedCustomers && similarSignedCustomers.length > 0 && (
                  <div className="p-4 bg-gradient-to-br from-emerald-50/60 to-slate-50 dark:from-emerald-950/20 dark:to-slate-900 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Similar Signed Customers (Social Proof)
                      </span>
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                        {similarSignedCustomers.length} Reference Clients
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                      {similarSignedCustomers.map((c: any, idx: number) => (
                        <div key={idx} className="bg-white dark:bg-slate-800/80 p-3 rounded-lg border border-emerald-100 dark:border-slate-700 shadow-xs space-y-1.5 flex flex-col justify-between">
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{c.companyName}</p>
                              {c.matchReason && (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 shrink-0 font-medium ${
                                    c.matchType === 'both'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                                      : c.matchType === 'nearby'
                                      ? 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  }`}
                                >
                                  {c.matchType === 'both' ? 'Industry & Nearby' : c.matchType === 'nearby' ? 'Serviced Nearby' : 'Industry Match'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {c.industryCategory || 'Commercial'} {c.suburb ? `• ${c.suburb}` : ''}
                            </p>
                            {c.industrySubCategory && (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={c.industrySubCategory}>
                                {c.industrySubCategory}
                              </p>
                            )}
                          </div>
                          {c.franchiseeName && (
                            <div className="pt-1">
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                Territory: {c.franchiseeName}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. Executive Prospect Summary */}
                {prospectSummary && (
                  <div className="p-4 bg-gradient-to-br from-blue-50/60 to-slate-50 dark:from-slate-800/80 dark:to-slate-900 rounded-xl border border-blue-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#095c7b] dark:text-[#38bdf8] flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> Executive Prospect Summary
                      </span>
                      <CopyButton textToCopy={prospectSummary} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words max-h-80 overflow-y-auto pr-1">
                      {prospectSummary}
                    </p>
                  </div>
                )}

                {/* 8. Suggested Product & Opener */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {suggestedProduct && (
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                        <Package className="w-4 h-4" /> Suggested Product
                      </span>
                      <p className="text-base font-bold text-emerald-900 dark:text-emerald-200 break-words">
                        {suggestedProduct}
                      </p>
                    </div>
                  )}

                  {suggestedOpener && (
                    <div className={cn('p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/40 space-y-1.5', suggestedProduct ? 'md:col-span-2' : 'md:col-span-3')}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                          <PhoneCall className="w-4 h-4" /> Suggested Opener
                        </span>
                        <CopyButton textToCopy={suggestedOpener} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 italic bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-800/50 break-words max-h-60 overflow-y-auto">
                        &quot;{suggestedOpener}&quot;
                      </p>
                    </div>
                  )}
                </div>

                {/* 9. Suggested Personalisation */}
                {suggestedPersonalisation && (
                  <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> Suggested Personalisation
                      </span>
                      <CopyButton textToCopy={suggestedPersonalisation} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words max-h-60 overflow-y-auto pr-1">
                      {suggestedPersonalisation}
                    </p>
                  </div>
                )}

                {/* 10. Shipper & Lodgement Evidence Quotes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {shipperEvidence && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-primary" /> Shipper Evidence
                        </span>
                        <CopyButton textToCopy={shipperEvidence} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap break-words max-h-80 overflow-y-auto pr-2 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg border">
                        {shipperEvidence}
                      </div>
                    </div>
                  )}

                  {lodgementEvidence && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Building className="w-4 h-4 text-primary" /> Lodgement Evidence
                        </span>
                        <CopyButton textToCopy={lodgementEvidence} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap break-words max-h-80 overflow-y-auto pr-2 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg border">
                        {lodgementEvidence}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: DECISION MAKERS (LINKEDIN) */}
        {/* ==================================================== */}
        {activeTab === 'decision-makers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Linkedin className="w-4 h-4 text-blue-600" />
                  Key Decision Makers (Logistics, Warehouse & Operations)
                </h4>
                <p className="text-xs text-slate-500">Live search results indexed from LinkedIn for {lead.companyName}.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleFindDecisionMakers}
                disabled={isFindingPeople}
                className="text-xs h-7 border-sky-300"
              >
                {isFindingPeople ? (
                  <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Re-scan LinkedIn
              </Button>
            </div>

            {candidates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {candidates.map((c, i) => {
                  const added = isAlreadyContact(c);
                  const isAdding = addingContactUrl === (c.linkedinUrl || c.name);
                  return (
                    <div
                      key={c.linkedinUrl || `${c.name}-${i}`}
                      className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/90 dark:border-slate-700/80 flex flex-col justify-between gap-3.5 shadow-2xs hover:shadow-xs hover:border-[#095c7b]/40 dark:hover:border-sky-500/40 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                                {c.name}
                              </p>
                              {c.confidence === 'High' && (
                                <Badge className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 px-1.5 py-0 h-4.5 rounded">
                                  High Match
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5" title={c.title}>
                              {c.title || 'Decision Maker'}
                            </p>
                          </div>
                          {c.linkedinUrl && (
                            <a
                              href={c.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#095c7b] hover:text-[#074b64] p-1.5 rounded-lg bg-sky-50/80 hover:bg-sky-100 dark:bg-slate-700 dark:hover:bg-slate-600 shrink-0 transition-colors"
                              title="Open LinkedIn Profile"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        {c.department && (
                          <span className="inline-block mt-2.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-600">
                            {c.department}
                          </span>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 min-w-0 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.location || 'Australia'}</span>
                        </span>
                        {added ? (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 py-1 px-2.5 flex items-center gap-1 font-medium shrink-0">
                            <Check className="w-3.5 h-3.5" /> In Contacts
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAddCandidateToContacts(c)}
                            disabled={isAdding}
                            className="h-7.5 px-3 text-xs font-semibold bg-[#095c7b] hover:bg-[#074b64] text-white shadow-2xs hover:shadow-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-60 shrink-0"
                          >
                            {isAdding ? (
                              <RefreshCw className="w-3 h-3 animate-spin mr-0.5" />
                            ) : (
                              <Plus className="w-3 h-3 mr-0.5" />
                            )}
                            Add to Contacts
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed text-slate-500 text-xs">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No Decision Makers Found Yet</p>
                <p className="text-slate-500 mt-1 mb-3">
                  Click below to search LinkedIn for Logistics, Warehouse, Operations, and Business Owners.
                </p>
                <Button size="sm" onClick={handleFindDecisionMakers} disabled={isFindingPeople} className="bg-[#095c7b] text-white text-xs">
                  {isFindingPeople ? 'Searching LinkedIn...' : 'Search LinkedIn for Decision Makers'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5: SOCIAL & SENTIMENT */}
        {/* ==================================================== */}
        {activeTab === 'social' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border space-y-2">
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Instagram Channel
                  </span>
                </div>
                {social?.instagramHandle ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      @{social.instagramHandle}
                    </p>
                    {social.followersCount && (
                      <p className="text-xs text-slate-500">{social.followersCount} followers</p>
                    )}
                    {social.recentPostsCount && (
                      <p className="text-xs text-slate-400">{social.recentPostsCount} posts indexed</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No active Instagram profile detected.</p>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border space-y-2">
                <div className="flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Facebook Page
                  </span>
                </div>
                {social?.facebookPageUrl ? (
                  <a
                    href={social.facebookPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View Facebook Page <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-xs text-slate-500">No active Facebook page detected.</p>
                )}
              </div>
            </div>

            {/* Delivery Delay Sentiment */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Customer Delivery Delay Sentiment
                  </span>
                </div>
                {social?.deliveryDelayComplaintsDetected ? (
                  <Badge variant="destructive" className="text-xs font-semibold">
                    Delivery Complaints Detected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs font-semibold text-emerald-700 border-emerald-300 bg-emerald-50">
                    No Courier Complaints Detected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {social?.deliveryDelayComplaintsDetected
                  ? 'Public comments and customer reviews indicate frustration with current delivery turnaround or carrier delays. This represents an immediate pain point to address MailPlus express reliability and local dedicated run-drivers.'
                  : 'Social posts and comments reflect positive or neutral delivery sentiments. Emphasize MailPlus relationship, PO Box consolidation, and dedicated local service rather than carrier rescue.'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------
// FIND DECISION MAKERS DIALOG COMPONENT
// ----------------------------------------------------------------------
interface FindDecisionMakersDialogProps {
  lead: Lead;
  candidates?: DecisionMakerCandidate[];
  onCandidateAdded?: (newContact: Contact) => void;
  onContactAdded?: (newContact: Contact) => void;
  onCandidatesRefreshed?: (candidates: DecisionMakerCandidate[]) => void;
  trigger?: React.ReactNode;
}

export function FindDecisionMakersDialog({
  lead,
  candidates: initialCandidates,
  onCandidateAdded,
  onContactAdded,
  onCandidatesRefreshed,
  trigger,
}: FindDecisionMakersDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [candidates, setCandidates] = useState<DecisionMakerCandidate[]>(
    initialCandidates || lead.discoveryData?.decisionMakerCandidates || []
  );
  const [addingName, setAddingName] = useState<string | null>(null);

  const contactAddedCallback = onContactAdded || onCandidateAdded;

  const isContact = (candidate: DecisionMakerCandidate): boolean => {
    if (!lead.contacts || lead.contacts.length === 0) return false;
    return lead.contacts.some(
      (c) =>
        (c?.linkedinUrl &&
          candidate.linkedinUrl &&
          c.linkedinUrl.toLowerCase().trim() ===
            candidate.linkedinUrl.toLowerCase().trim()) ||
        (c?.name &&
          candidate.name &&
          c.name.toLowerCase().trim() === candidate.name.toLowerCase().trim())
    );
  };

  const handleSearch = async () => {
    if (!lead.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/leads/${encodeURIComponent(lead.id)}/find-decision-makers`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to search decision makers');
      }

      const results: DecisionMakerCandidate[] = json.data || [];
      setCandidates(results);
      if (onCandidatesRefreshed) {
        onCandidatesRefreshed(results);
      }
      toast({
        title: 'LinkedIn Scan Complete',
        description: `Found ${results.length} relevant decision makers for ${lead.companyName}.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async (candidate: DecisionMakerCandidate) => {
    if (!lead.id) return;
    setAddingName(candidate.name);
    try {
      const res = await fetch(
        `/api/leads/${encodeURIComponent(lead.id)}/find-decision-makers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_contact', candidate }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to add contact');
      }

      if (contactAddedCallback) {
        contactAddedCallback(json.contact);
      }
      toast({
        title: 'Contact Created',
        description: `${candidate.name} is now saved in Lead Contacts.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Could Not Add Contact',
        description: err.message,
      });
    } finally {
      setAddingName(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Find Decision Makers</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Linkedin className="w-5 h-5 text-blue-600" />
            Decision Maker Discovery — {lead.companyName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Scan live LinkedIn profiles for key roles in Logistics, Dispatch, Operations, Warehouse Management, and Ownership.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border text-xs">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Target Roles:
              </span>{' '}
              Logistics Manager, Warehouse Manager, Operations Director, Dispatch Coordinator, Business Owner.
            </div>
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-[#095c7b] hover:bg-[#074b64] text-white shrink-0 ml-3"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                  Search LinkedIn
                </>
              )}
            </Button>
          </div>

          {candidates.length > 0 ? (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Discovered Candidates ({candidates.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {candidates.map((c, i) => {
                  const added = isContact(c);
                  const isAdding = addingName === c.name;
                  return (
                    <div
                      key={c.linkedinUrl || `${c.name}-${i}`}
                      className="p-3 bg-white dark:bg-slate-800 rounded-lg border flex flex-col justify-between gap-2 shadow-2xs hover:border-blue-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                            {c.name}
                          </p>
                          {c.confidence === 'High' && (
                            <Badge className="text-[9px] bg-emerald-100 text-emerald-800 border-none px-1 py-0">
                              Top Match
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {c.title}
                        </p>
                        {c.department && (
                          <Badge variant="outline" className="text-[9px] mt-1 px-1.5 py-0 border-slate-200 text-slate-600">
                            {c.department}
                          </Badge>
                        )}
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between gap-2">
                        {c.linkedinUrl ? (
                          <a
                            href={c.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                          >
                            LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">Indexed result</span>
                        )}

                        {added ? (
                          <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 py-0.5 px-2 flex items-center gap-1 font-medium">
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> In Contacts
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAddContact(c)}
                            disabled={isAdding}
                            className="h-7 text-xs font-semibold bg-[#095c7b] hover:bg-[#074b64] text-white shadow-2xs px-2.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
                          >
                            {isAdding ? (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin mr-0.5" />
                            ) : (
                              <Plus className="w-2.5 h-2.5 mr-0.5" />
                            )}
                            Add to Contacts
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              No candidates found yet. Click &quot;Search LinkedIn&quot; above to find contacts.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
