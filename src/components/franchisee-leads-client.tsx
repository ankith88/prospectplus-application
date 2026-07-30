"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getLeadsFromFirebase, getAllUsers } from '@/services/firebase';
import { Lead, UserProfile, LeadStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FullScreenLoader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { getStatusOutcomeExplanation } from '@/lib/status-outcome-mapping';
import { format, parseISO, isValid } from 'date-fns';
import { 
  Briefcase, 
  Search, 
  Mail, 
  Phone, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  Send, 
  Sparkles, 
  FileText,
  HelpCircle,
  Building2,
  MapPin,
  ArrowUpDown,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  TrendingUp,
  Tag,
  Filter,
  X
} from 'lucide-react';

// Status Classification Helpers
const ACTIONED_STATUSES: LeadStatus[] = [
  'Contacted', 'In Progress', 'Connected', 'In Qualification', 'High Touch', 
  'Qualified', 'Pre Qualified', 'Priority Lead', 'Hot Lead', 'Priority Field Lead',
  'Reschedule', 'Future Follow-up'
];

const QUOTE_STATUSES: LeadStatus[] = [
  'Quote Sent', 'Quote Accepted'
];

const TRIAL_STATUSES: LeadStatus[] = [
  'Free Trial', 'Trialing LocalMile', 'Trialing ShipMate', 'LocalMile Pending', 'LocalMile Opportunity'
];

const WON_STATUSES: LeadStatus[] = [
  'Won', 'Customer Opportunity'
];

const LOST_STATUSES: LeadStatus[] = [
  'Lost', 'Lost Customer', 'Unqualified', 'Out of Territory'
];

export default function FranchiseeLeadsClientPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
  const [selectedSpecificStatus, setSelectedSpecificStatus] = useState<string>('all');
  const [selectedAm, setSelectedAm] = useState<string>('all');
  const [selectedLeadSource, setSelectedLeadSource] = useState<string>('all'); // all, inbound, outbound
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [selectedCustomerSource, setSelectedCustomerSource] = useState<string>('all');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100); // Default 100 leads per page

  // Sorting State
  const [sortField, setSortField] = useState<keyof Lead | 'bucket' | 'customerSource'>('companyName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Contact Account Manager Dialog State
  const [contactDialogOpen, setContactDialogOpen] = useState<boolean>(false);
  const [activeLeadForContact, setActiveLeadForContact] = useState<Lead | null>(null);
  const [amEmailSubject, setAmEmailSubject] = useState<string>('');
  const [amEmailBody, setAmEmailBody] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);

  // Outbound Status Info Dialog State
  const [outboundInfoDialogOpen, setOutboundInfoDialogOpen] = useState<boolean>(false);
  const [activeLeadForStatusInfo, setActiveLeadForStatusInfo] = useState<Lead | null>(null);

  const franchiseeName = userProfile?.franchisee || '';
  const isFranchiseeRole = userProfile?.activeRole === 'Franchisee';

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [fetchedLeads, fetchedUsers] = await Promise.all([
        getLeadsFromFirebase({ 
          franchisee: isFranchiseeRole && franchiseeName ? franchiseeName : undefined 
        }),
        getAllUsers()
      ]);

      let filteredLeads = fetchedLeads;

      if (isFranchiseeRole && franchiseeName) {
        const normFranchisee = franchiseeName.toLowerCase().trim();
        filteredLeads = fetchedLeads.filter(l => 
          (l.franchisee || '').toLowerCase().trim() === normFranchisee
        );
      }

      // Filter out Won / Signed accounts so page shows ONLY Leads
      const leadsOnly = filteredLeads.filter(l => 
        !WON_STATUSES.includes(l.status as LeadStatus) &&
        !(l as any).isCompany &&
        (l.status as string) !== 'Customer Signed' &&
        (l.status as string) !== 'Signed Customer' &&
        (l as any).customerStatus !== 'Won' &&
        (l as any).customerStatus !== 'Active'
      );

      setLeads(leadsOnly);
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Error fetching franchisee leads:', err);
      toast({
        title: 'Error loading leads',
        description: 'Failed to retrieve franchisee leads. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && userProfile) {
      fetchData();
    }
  }, [authLoading, userProfile]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategoryTab, selectedSpecificStatus, selectedAm, selectedLeadSource, selectedBucket, selectedCustomerSource, pageSize]);

  // Metric counts and reporting summary
  const metrics = useMemo(() => {
    const total = leads.length;
    const actioned = leads.filter(l => ACTIONED_STATUSES.includes(l.status as LeadStatus)).length;
    const quote = leads.filter(l => QUOTE_STATUSES.includes(l.status as LeadStatus)).length;
    const trial = leads.filter(l => TRIAL_STATUSES.includes(l.status as LeadStatus)).length;
    const lost = leads.filter(l => LOST_STATUSES.includes(l.status as LeadStatus)).length;
    
    const inboundCount = leads.filter(l => 
      (l as any).bucket === 'inbound' || 
      (l as any).leadSource === 'Inbound' || 
      (l as any).inboundType || 
      (l.customerSource || '').toLowerCase().includes('inbound') || 
      (l.customerSource || '').toLowerCase().includes('website')
    ).length;
    const outboundCount = total - inboundCount;

    return { total, actioned, quote, trial, lost, inboundCount, outboundCount };
  }, [leads]);

  // Dynamic unique list of Customer Sources for filtering
  const availableCustomerSources = useMemo(() => {
    const srcSet = new Set<string>();
    leads.forEach(l => {
      const src = l.customerSource || (l as any).leadSource || (l as any).source;
      if (src && typeof src === 'string' && src.trim()) {
        srcSet.add(src.trim());
      }
    });
    return Array.from(srcSet).sort();
  }, [leads]);

  // Dynamic unique list of Buckets for filtering
  const availableBuckets = useMemo(() => {
    const bSet = new Set<string>();
    leads.forEach(l => {
      const b = (l as any).bucket || (l as any).salesRepBucket;
      if (b && typeof b === 'string' && b.trim()) {
        bSet.add(b.trim());
      }
    });
    return Array.from(bSet).sort();
  }, [leads]);

  // Unique Account Managers found across leads
  const amList = useMemo(() => {
    const amSet = new Set<string>();
    leads.forEach(l => {
      const am = l.accountManagerAssigned || l.salesRepAssigned || l.dialerAssigned || (l as any).allocatedTo;
      if (am && am !== 'Unassigned') amSet.add(am);
    });
    return Array.from(amSet).sort();
  }, [leads]);

  // Unique statuses found across leads
  const availableStatuses = useMemo(() => {
    const sSet = new Set<string>();
    leads.forEach(l => {
      if (l.status) sSet.add(l.status);
    });
    return Array.from(sSet).sort();
  }, [leads]);

  // Filtered Leads list
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // 1. Search Query (Company, Contact, Email, Phone, City, Suburb, ID, Source, Bucket)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const comp = (lead.companyName || '').toLowerCase();
        const contactName = ((lead as any).contactPerson || (lead as any).contactFirstName || lead.contacts?.[0]?.name || '').toLowerCase();
        const email = ((lead as any).email || lead.customerServiceEmail || lead.contacts?.[0]?.email || '').toLowerCase();
        const phone = ((lead as any).phone || lead.customerPhone || lead.contacts?.[0]?.phone || '').toLowerCase();
        const city = (lead.address?.city || lead.city || '').toLowerCase();
        const state = (lead.address?.state || lead.state || '').toLowerCase();
        const leadId = (lead.id || '').toLowerCase();
        const custSource = (lead.customerSource || (lead as any).leadSource || (lead as any).source || '').toLowerCase();
        const bucketVal = ((lead as any).bucket || (lead as any).salesRepBucket || '').toLowerCase();

        const matchesQuery = comp.includes(query) || 
                             contactName.includes(query) || 
                             email.includes(query) || 
                             phone.includes(query) || 
                             city.includes(query) || 
                             state.includes(query) || 
                             leadId.includes(query) || 
                             custSource.includes(query) || 
                             bucketVal.includes(query);
        if (!matchesQuery) return false;
      }

      // 2. Category Tab Filter
      if (selectedCategoryTab === 'actioned') {
        if (!ACTIONED_STATUSES.includes(lead.status as LeadStatus)) return false;
      } else if (selectedCategoryTab === 'quote') {
        if (!QUOTE_STATUSES.includes(lead.status as LeadStatus)) return false;
      } else if (selectedCategoryTab === 'trial') {
        if (!TRIAL_STATUSES.includes(lead.status as LeadStatus)) return false;
      } else if (selectedCategoryTab === 'lost') {
        if (!LOST_STATUSES.includes(lead.status as LeadStatus)) return false;
      }

      // 3. Specific Status Dropdown
      if (selectedSpecificStatus !== 'all' && lead.status !== selectedSpecificStatus) {
        return false;
      }

      // 4. Account Manager Filter
      if (selectedAm !== 'all') {
        const am = lead.accountManagerAssigned || lead.salesRepAssigned || lead.dialerAssigned || (lead as any).allocatedTo;
        if (am !== selectedAm) return false;
      }

      // 5. Lead Type Filter (Inbound vs Outbound)
      if (selectedLeadSource === 'inbound') {
        const isInbound = (lead as any).bucket === 'inbound' || (lead as any).leadSource === 'Inbound' || !!(lead as any).inboundType || (lead.customerSource || '').toLowerCase().includes('inbound') || (lead.customerSource || '').toLowerCase().includes('website');
        if (!isInbound) return false;
      } else if (selectedLeadSource === 'outbound') {
        const isInbound = (lead as any).bucket === 'inbound' || (lead as any).leadSource === 'Inbound' || !!(lead as any).inboundType || (lead.customerSource || '').toLowerCase().includes('inbound') || (lead.customerSource || '').toLowerCase().includes('website');
        if (isInbound) return false;
      }

      // 6. Bucket Dropdown Filter
      if (selectedBucket !== 'all') {
        const b = (lead as any).bucket || (lead as any).salesRepBucket || '';
        if (b.toLowerCase() !== selectedBucket.toLowerCase()) return false;
      }

      // 7. Customer Source Dropdown Filter
      if (selectedCustomerSource !== 'all') {
        const src = lead.customerSource || (lead as any).leadSource || (lead as any).source || '';
        if (src.toLowerCase() !== selectedCustomerSource.toLowerCase()) return false;
      }

      return true;
    });
  }, [leads, searchQuery, selectedCategoryTab, selectedSpecificStatus, selectedAm, selectedLeadSource, selectedBucket, selectedCustomerSource]);

  // Sorted Leads
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      if (sortField === 'bucket') {
        aVal = (a as any).bucket || (a as any).salesRepBucket || '';
        bVal = (b as any).bucket || (b as any).salesRepBucket || '';
      } else if (sortField === 'customerSource') {
        aVal = a.customerSource || (a as any).leadSource || (a as any).source || '';
        bVal = b.customerSource || (b as any).leadSource || (b as any).source || '';
      } else {
        aVal = a[sortField as keyof Lead] || '';
        bVal = b[sortField as keyof Lead] || '';
      }

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLeads, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedLeads.length / (pageSize === -1 ? sortedLeads.length || 1 : pageSize)) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedLeads = useMemo(() => {
    if (pageSize === -1) return sortedLeads;
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [sortedLeads, safeCurrentPage, pageSize]);

  const handleSort = (field: keyof Lead | 'bucket' | 'customerSource') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Clear all filters helper
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryTab('all');
    setSelectedSpecificStatus('all');
    setSelectedAm('all');
    setSelectedLeadSource('all');
    setSelectedBucket('all');
    setSelectedCustomerSource('all');
  };

  // Helper to open Contact AM Dialog
  const handleOpenContactAm = (lead: Lead) => {
    setActiveLeadForContact(lead);
    const leadAmName = lead.accountManagerAssigned || lead.salesRepAssigned || lead.dialerAssigned || (lead as any).allocatedTo || 'Account Manager';
    setAmEmailSubject(`Inquiry regarding Lead: ${lead.companyName} (${lead.id})`);
    setAmEmailBody(`Hi ${leadAmName},\n\nI am contacting you regarding the lead "${lead.companyName}" (ID: ${lead.id}) assigned to ${franchiseeName || 'our franchise'}.\n\nCould you please provide an update on this lead?\n\nThank you!`);
    setContactDialogOpen(true);
  };

  // Helper to check if a lead is in the Outbound bucket
  const isOutboundBucketLead = (lead: Lead) => {
    const bucket = ((lead as any).bucket || (lead as any).salesRepBucket || '').toLowerCase().trim();
    return !bucket || bucket === 'outbound';
  };

  // Helper to check if a lead is in the Account Manager bucket
  const isAccountManagerBucketLead = (lead: Lead) => {
    const bucket = ((lead as any).bucket || (lead as any).salesRepBucket || '').toLowerCase().trim();
    return bucket === 'account_manager' || bucket === 'account manager' || bucket === 'am';
  };

  // Helper to open Outbound Status Info Dialog
  const handleOpenOutboundStatusInfo = (lead: Lead) => {
    setActiveLeadForStatusInfo(lead);
    setOutboundInfoDialogOpen(true);
  };

  // Date formatter for dialog
  const formatDateDisplay = (dateVal?: any) => {
    if (!dateVal) return null;
    try {
      const d = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
      if (isValid(d)) {
        return format(d, 'dd MMM yyyy');
      }
    } catch (e) {}
    return String(dateVal);
  };

  // Meaning explanation helper for lead status
  const getStatusMeaningExplanation = (status: string): string => {
    const normalized = (status || '').trim();
    switch (normalized) {
      case 'New':
      case 'Unassigned':
      case 'Imported':
      case 'Pending':
        return 'The lead is a newly added entry in your pipeline awaiting initial contact from either the Outbound Team or an Account Manager, depending on which bucket it belongs to.';
      case 'In Progress':
        return 'The outbound sales team has initiated contact attempts (calls/emails) and active prospecting is underway.';
      case 'Contacted':
        return 'Direct contact has been successfully established with the lead by an outbound team member.';
      case 'Connected':
      case 'Gatekeeper':
        return 'Outbound sales reached a company gatekeeper/receptionist and is working to connect with key decision makers.';
      case 'In Qualification':
        return 'The lead is currently undergoing qualification to evaluate freight/parcel volume and service requirements.';
      case 'Pre Qualified':
        return 'The prospect passed initial screening and confirmed interest in receiving service proposals.';
      case 'High Touch':
        return 'The prospect requested a dedicated follow-up or specific callback, requiring high-priority attention.';
      case 'Qualified':
        return 'The lead has been fully qualified as a viable sales opportunity for MailPlus services.';
      case 'Priority Lead':
      case 'Hot Lead':
        return 'The lead is flagged as high-priority for urgent outbound contact and rapid follow-up.';
      case 'Priority Field Lead':
        return 'The lead requires priority follow-up by a field sales executive or Business Development Manager.';
      case 'Reschedule':
        return 'A previously planned discussion was requested to be rescheduled for a future date/time.';
      case 'Quote Sent':
        return 'A formal rate proposal or quote has been prepared and sent to the customer for review.';
      case 'Quote Accepted':
        return 'The customer accepted the proposal and is progressing toward account setup.';
      case 'Free Trial':
      case 'Trialing LocalMile':
      case 'Trialing ShipMate':
        return 'The prospect is actively testing MailPlus pickup/delivery services during a trial period.';
      case 'LocalMile Opportunity':
      case 'LocalMile Pending':
        return 'The lead has been evaluated for specialized LocalMile service integration.';
      case 'Email Brush Off':
        return 'The prospect sent an initial email brush-off; sales rep is adjusting follow-up approach.';
      case 'Future Follow-up':
        return 'The lead is scheduled for future re-engagement at a designated date.';
      case 'Won':
      case 'Customer Opportunity':
        return 'The lead successfully converted into an active, paying MailPlus customer!';
      case 'Lost':
      case 'Lost Customer':
      case 'Unqualified':
      case 'Out of Territory':
        return 'Outreach was closed or archived due to non-qualification, out-of-territory address, or prospect decision.';
      default:
        return `The lead is currently categorized under status '${status}' within the outbound sales pipeline.`;
    }
  };

  // Pipeline Status Notice card renderer
  const renderPipelineStatusNotice = (lead: Lead) => {
    const status = lead.status || 'New';
    const UNCONTACTED_STATUSES = ['New', 'Unassigned', 'Imported', 'Pending', 'Draft', 'Prospect - No Access/No Contact'];
    const isUncontacted = UNCONTACTED_STATUSES.includes(status);
    const isLost = LOST_STATUSES.includes(status as LeadStatus);
    const isWon = WON_STATUSES.includes(status as LeadStatus);

    if (isUncontacted) {
      return (
        <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 flex items-start gap-3 shadow-sm">
          <div className="p-2 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 shrink-0 mt-0.5">
            <Clock className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold flex items-center gap-1.5">
              <span>In Outbound Queue – Pending Outreach</span>
              <Badge className="bg-sky-200 text-sky-900 dark:bg-sky-900 dark:text-sky-100 text-[10px] font-semibold border-0">
                In Pipeline
              </Badge>
            </h4>
            <p className="text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
              This lead is currently in the <strong>Outbound Queue</strong> and is in your pipeline <strong>waiting to be contacted</strong> by the outbound sales team.
            </p>
          </div>
        </div>
      );
    }

    if (isWon) {
      return (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 flex items-start gap-3 shadow-sm">
          <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold flex items-center gap-1.5">
              <span>In Outbound Queue – Converted Account</span>
              <Badge className="bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100 text-[10px] font-semibold border-0">
                Won Account
              </Badge>
            </h4>
            <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
              This lead is in the <strong>Outbound Queue</strong> and <strong>has already been worked on</strong> by the outbound sales team and successfully converted into a customer.
            </p>
          </div>
        </div>
      );
    }

    if (isLost) {
      return (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 flex items-start gap-3 shadow-sm">
          <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 shrink-0 mt-0.5">
            <X className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold flex items-center gap-1.5">
              <span>In Outbound Queue – Worked On &amp; Closed</span>
              <Badge className="bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100 text-[10px] font-semibold border-0">
                Closed Lead
              </Badge>
            </h4>
            <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
              This lead is in the <strong>Outbound Queue</strong> and <strong>has already been worked on</strong> by the outbound team, but was closed with status <strong>{status}</strong>.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 flex items-start gap-3 shadow-sm">
        <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 shrink-0 mt-0.5">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold flex items-center gap-1.5">
            <span>In Outbound Queue – Active Outreach</span>
            <Badge className="bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100 text-[10px] font-semibold border-0">
              Worked On
            </Badge>
          </h4>
          <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
            This lead is currently in the <strong>Outbound Queue</strong> and <strong>has already been worked on</strong> by the outbound sales team in your pipeline.
          </p>
        </div>
      </div>
    );
  };

  // Resolve assigned user object for lead
  const getAssignedUserForLead = (lead: Lead | null) => {
    if (!lead) return null;
    const amName = lead.accountManagerAssigned || lead.salesRepAssigned || lead.dialerAssigned || (lead as any).allocatedTo;
    if (!amName || amName === 'Unassigned') return null;

    const matched = users.find(u => {
      const uName = (u.displayName || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase().trim();
      const targetName = amName.toLowerCase().trim();
      return uName === targetName || u.email?.toLowerCase().trim() === targetName;
    });

    return matched || { displayName: amName, email: undefined, phoneNumber: undefined, mobileNumber: undefined, activeRole: undefined };
  };

  // Send Direct Email to AM
  const handleSendAmEmail = async () => {
    if (!activeLeadForContact) return;
    const amUser = getAssignedUserForLead(activeLeadForContact);
    const targetEmail = amUser?.email;

    if (!targetEmail) {
      toast({
        title: 'Email Address Not Found',
        description: 'Unable to locate an email address for the assigned Account Manager. Please use your standard mail client.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSendingEmail(true);
      const response = await fetch('/api/campaigns/send-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: targetEmail,
          subject: amEmailSubject,
          bodyHtml: `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6;">${amEmailBody.replace(/\n/g, '<br/>')}</div>`,
          leadId: activeLeadForContact.id,
          senderName: userProfile?.displayName || userProfile?.email || 'Franchisee User'
        })
      });

      if (response.ok) {
        toast({
          title: 'Message Sent!',
          description: `Your message has been emailed directly to ${amUser?.displayName || targetEmail}.`
        });
        setContactDialogOpen(false);
      } else {
        throw new Error('Failed to send email via API');
      }
    } catch (err) {
      console.error('Error sending AM email:', err);
      window.location.href = `mailto:${targetEmail}?subject=${encodeURIComponent(amEmailSubject)}&body=${encodeURIComponent(amEmailBody)}`;
      toast({
        title: 'Opened Mail Client',
        description: 'Direct email dispatch failed, opening your default email application instead.'
      });
      setContactDialogOpen(false);
    } finally {
      setSendingEmail(false);
    }
  };

  // Status Badge Color Helper
  const getStatusBadgeVariant = (status: string) => {
    if (QUOTE_STATUSES.includes(status as LeadStatus)) return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    if (TRIAL_STATUSES.includes(status as LeadStatus)) return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800';
    if (WON_STATUSES.includes(status as LeadStatus)) return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
    if (ACTIONED_STATUSES.includes(status as LeadStatus)) return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
    if (LOST_STATUSES.includes(status as LeadStatus)) return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800';
    return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
  };

  // Bucket Badge Formatter
  const getBucketBadge = (lead: Lead) => {
    const bucket = (lead as any).bucket || (lead as any).salesRepBucket || '';
    if (!bucket) {
      return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[11px] font-normal">Outbound</Badge>;
    }
    const lower = bucket.toLowerCase();
    if (lower === 'inbound') {
      return <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[11px] font-medium inline-flex items-center gap-1"><Inbox className="h-3 w-3" />Inbound</Badge>;
    }
    if (lower === 'account_manager' || lower === 'account manager' || lower === 'am') {
      return <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[11px] font-medium">Account Manager</Badge>;
    }
    if (lower === 'field_sales' || lower === 'field sales' || lower === 'd2d') {
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] font-medium">Field Sales</Badge>;
    }
    if (lower === 'marketing') {
      return <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 text-[11px] font-medium">Marketing</Badge>;
    }
    return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-normal capitalize">{bucket.replace(/_/g, ' ')}</Badge>;
  };

  // Customer Source Formatter
  const getCustomerSourceDisplay = (lead: Lead) => {
    const source = lead.customerSource || (lead as any).leadSource || (lead as any).source || 'Direct';
    return (
      <div className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 font-medium" title={source}>
        <Tag className="h-3 w-3 text-slate-400 shrink-0" />
        <span className="truncate max-w-[150px]">{source}</span>
      </div>
    );
  };

  if (authLoading || loading) {
    return <FullScreenLoader message="Loading Franchisee Leads Overview..." />;
  }

  const activeAmUser = getAssignedUserForLead(activeLeadForContact);
  const activeFiltersCount = [
    selectedCategoryTab !== 'all',
    selectedSpecificStatus !== 'all',
    selectedAm !== 'all',
    selectedLeadSource !== 'all',
    selectedBucket !== 'all',
    selectedCustomerSource !== 'all',
    searchQuery.trim().length > 0
  ].filter(Boolean).length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1450px]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 rounded-2xl text-white shadow-xl border border-slate-700/50">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Franchisee Leads Overview
            </h1>
            {franchiseeName && (
              <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-sm font-semibold px-3 py-1">
                {franchiseeName}
              </Badge>
            )}
          </div>
          <p className="text-slate-300 text-sm md:text-base max-w-3xl">
            Comprehensive lead reporting hub for your franchise. Track pipeline status, quotes sent, active trials, customer sources, and contact assigned Account Managers directly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData} 
            disabled={refreshing}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 backdrop-blur-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            asChild
            size="sm" 
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold shadow-lg shadow-teal-500/20 border-none"
          >
            <Link href="/leads/new">
              <Briefcase className="h-4 w-4 mr-2" />
              New Lead
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Performance Reporting Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Total Leads */}
        <Card 
          onClick={() => setSelectedCategoryTab('all')}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${selectedCategoryTab === 'all' ? 'border-l-slate-800 ring-2 ring-slate-400/20 bg-slate-50 dark:bg-slate-900' : 'border-l-slate-400'}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              <span>Total Leads</span>
              <Briefcase className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {metrics.total}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                {metrics.inboundCount} Inbound
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200">
                {metrics.outboundCount} Outbound
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Actioned / Active */}
        <Card 
          onClick={() => setSelectedCategoryTab('actioned')}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${selectedCategoryTab === 'actioned' ? 'border-l-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/30' : 'border-l-blue-500'}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              <span>Active / Actioned</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-950 dark:text-blue-100">
              {metrics.actioned}
            </div>
            <p className="text-xs text-slate-500 mt-1">In progress & follow-ups</p>
          </CardContent>
        </Card>

        {/* Quotes Sent */}
        <Card 
          onClick={() => setSelectedCategoryTab('quote')}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${selectedCategoryTab === 'quote' ? 'border-l-amber-600 ring-2 ring-amber-500/20 bg-amber-50/50 dark:bg-amber-950/30' : 'border-l-amber-500'}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
              <span>Quotes Sent</span>
              <FileText className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-950 dark:text-amber-100">
              {metrics.quote}
            </div>
            <p className="text-xs text-slate-500 mt-1">Pending customer sign-up</p>
          </CardContent>
        </Card>

        {/* Free Trial */}
        <Card 
          onClick={() => setSelectedCategoryTab('trial')}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${selectedCategoryTab === 'trial' ? 'border-l-purple-600 ring-2 ring-purple-500/20 bg-purple-50/50 dark:bg-purple-950/30' : 'border-l-purple-500'}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
              <span>Free Trials</span>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-950 dark:text-purple-100">
              {metrics.trial}
            </div>
            <p className="text-xs text-slate-500 mt-1">Active trialing accounts</p>
          </CardContent>
        </Card>

        {/* Lost / Closed */}
        <Card 
          onClick={() => setSelectedCategoryTab('lost')}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${selectedCategoryTab === 'lost' ? 'border-l-rose-600 ring-2 ring-rose-500/20 bg-rose-50/50 dark:bg-rose-950/30' : 'border-l-rose-400'}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
              <span>Lost / Closed</span>
              <HelpCircle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-950 dark:text-rose-100">
              {metrics.lost}
            </div>
            <p className="text-xs text-slate-500 mt-1">Archived or lost</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters Card */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 md:p-6 space-y-4">
          {/* Quick Category Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={selectedCategoryTab === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoryTab('all')}
                className={selectedCategoryTab === 'all' ? 'bg-slate-900 text-white' : ''}
              >
                All Leads ({metrics.total})
              </Button>
              <Button
                variant={selectedCategoryTab === 'actioned' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoryTab('actioned')}
                className={selectedCategoryTab === 'actioned' ? 'bg-blue-600 text-white' : ''}
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Active / Actioned ({metrics.actioned})
              </Button>
              <Button
                variant={selectedCategoryTab === 'quote' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoryTab('quote')}
                className={selectedCategoryTab === 'quote' ? 'bg-amber-600 text-white' : ''}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Quote Sent ({metrics.quote})
              </Button>
              <Button
                variant={selectedCategoryTab === 'trial' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoryTab('trial')}
                className={selectedCategoryTab === 'trial' ? 'bg-purple-600 text-white' : ''}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Free Trial ({metrics.trial})
              </Button>
            </div>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear All Filters ({activeFiltersCount})
              </Button>
            )}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search company, contact, city, source, bucket..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {/* Bucket Filter (Requested Feature) */}
            <div>
              <Select value={selectedBucket} onValueChange={setSelectedBucket}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Lead Buckets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buckets</SelectItem>
                  {availableBuckets.map(b => (
                    <SelectItem key={b} value={b} className="capitalize">{b.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Source Filter (Requested Feature) */}
            <div>
              <Select value={selectedCustomerSource} onValueChange={setSelectedCustomerSource}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Customer Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customer Sources</SelectItem>
                  {availableCustomerSources.map(src => (
                    <SelectItem key={src} value={src}>{src}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specific Status Select */}
            <div>
              <Select value={selectedSpecificStatus} onValueChange={setSelectedSpecificStatus}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Specific Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {availableStatuses.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account Manager Select */}
            <div>
              <Select value={selectedAm} onValueChange={setSelectedAm}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Account Managers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Account Managers</SelectItem>
                  {amList.map(am => (
                    <SelectItem key={am} value={am}>{am}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Leads Data Table */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-4 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Leads Directory</span>
                <Badge variant="secondary" className="text-xs font-semibold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  {sortedLeads.length} Total Matched
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Click "Status Info" for Outbound bucket leads or "Contact AM" for Account Manager bucket leads.
              </CardDescription>
            </div>

            {/* Top Pagination Summary */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-900 dark:text-slate-200">{sortedLeads.length === 0 ? 0 : (safeCurrentPage - 1) * (pageSize === -1 ? sortedLeads.length : pageSize) + 1}</strong>–<strong className="text-slate-900 dark:text-slate-200">{pageSize === -1 ? sortedLeads.length : Math.min(safeCurrentPage * pageSize, sortedLeads.length)}</strong> of <strong className="text-slate-900 dark:text-slate-200">{sortedLeads.length}</strong>
              </span>

              {/* Per Page Selector */}
              <div className="flex items-center gap-1 ml-2">
                <span className="hidden sm:inline">Page Size:</span>
                <Select value={String(pageSize)} onValueChange={val => setPageSize(Number(val))}>
                  <SelectTrigger className="h-8 w-[80px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100 (Default)</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="-1">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {sortedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No leads found</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                No franchisee leads matched your current search filters. Try clearing your search query or dropdown filters.
              </p>
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2 text-xs">
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    {/* Company Name */}
                    <TableHead className="min-w-[240px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('companyName')} className="font-semibold text-xs text-slate-700 dark:text-slate-300 p-0 hover:bg-transparent">
                        Company Name <ArrowUpDown className="ml-1.5 h-3 w-3" />
                      </Button>
                    </TableHead>

                    {/* Status */}
                    <TableHead className="min-w-[160px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('status')} className="font-semibold text-xs text-slate-700 dark:text-slate-300 p-0 hover:bg-transparent">
                        Status <ArrowUpDown className="ml-1.5 h-3 w-3" />
                      </Button>
                    </TableHead>

                    {/* Bucket (Requested Column) */}
                    <TableHead className="min-w-[150px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('bucket')} className="font-semibold text-xs text-slate-700 dark:text-slate-300 p-0 hover:bg-transparent">
                        Bucket <ArrowUpDown className="ml-1.5 h-3 w-3" />
                      </Button>
                    </TableHead>

                    {/* Customer Source (Requested Column from customerSource) */}
                    <TableHead className="min-w-[160px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('customerSource')} className="font-semibold text-xs text-slate-700 dark:text-slate-300 p-0 hover:bg-transparent">
                        Customer Source <ArrowUpDown className="ml-1.5 h-3 w-3" />
                      </Button>
                    </TableHead>

                    {/* Assigned AM / Rep */}
                    <TableHead className="min-w-[180px]">Assigned AM / Rep</TableHead>

                    {/* Location */}
                    <TableHead className="min-w-[160px]">Location</TableHead>

                    {/* Actions */}
                    <TableHead className="text-right min-w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeads.map((lead) => {
                    const amName = lead.accountManagerAssigned || lead.salesRepAssigned || lead.dialerAssigned || (lead as any).allocatedTo || 'Unassigned';
                    const cityState = [lead.address?.city || lead.city, lead.address?.state || lead.state].filter(Boolean).join(', ');

                    const contactName = (lead as any).contactPerson || (lead as any).contactFirstName || lead.contacts?.[0]?.name || '';
                    const contactEmail = (lead as any).email || lead.customerServiceEmail || lead.contacts?.[0]?.email || '';

                    return (
                      <TableRow key={lead.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                        {/* Company Name & Contact Info */}
                        <TableCell className="font-medium py-3.5">
                          <div className="flex flex-col space-y-0.5">
                            <Link 
                              href={(lead as any).isCompany ? `/companies/${lead.id}` : `/leads/${lead.id}`} 
                              className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1.5 group"
                            >
                              <Building2 className="h-4 w-4 text-slate-400 group-hover:text-teal-600 transition-colors shrink-0" />
                              <span className="line-clamp-1">{lead.companyName || 'Unnamed Lead'}</span>
                            </Link>
                            {(contactName || contactEmail) && (
                              <div className="text-xs text-slate-500 pl-5 line-clamp-1">
                                {[contactName, contactEmail].filter(Boolean).join(' • ')}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="py-3.5">
                          <Badge className={`text-xs font-semibold px-2.5 py-0.5 border ${getStatusBadgeVariant(lead.status || '')}`}>
                            {lead.status || 'New'}
                          </Badge>
                        </TableCell>

                        {/* Bucket Column */}
                        <TableCell className="py-3.5">
                          {getBucketBadge(lead)}
                        </TableCell>

                        {/* Customer Source Column (from customerSource) */}
                        <TableCell className="py-3.5">
                          {getCustomerSourceDisplay(lead)}
                        </TableCell>

                        {/* Assigned Account Manager */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-xs shrink-0">
                              {amName !== 'Unassigned' ? amName.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-medium text-slate-900 dark:text-slate-200 truncate">
                                {amName}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate">
                                {lead.accountManagerAssigned ? 'Account Mgr' : (lead.salesRepAssigned ? 'Sales Rep' : 'Assigned Staff')}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Location */}
                        <TableCell className="py-3.5 text-xs text-slate-600 dark:text-slate-400">
                          {cityState ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{cityState}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isOutboundBucketLead(lead) ? (
                              /* Status Info Button for Outbound Bucket Leads */
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenOutboundStatusInfo(lead)}
                                title="View Outbound Status Info"
                                className="h-8 text-xs font-medium border-amber-300 text-amber-800 bg-amber-50/60 hover:bg-amber-100 hover:border-amber-400 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30 dark:hover:bg-amber-900/50"
                              >
                                <HelpCircle className="h-3.5 w-3.5 mr-1 text-amber-600 dark:text-amber-400 shrink-0" />
                                Status Info
                              </Button>
                            ) : isAccountManagerBucketLead(lead) ? (
                              /* Contact AM Button - ONLY for Account Manager Bucket Leads */
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenContactAm(lead)}
                                title={`Contact ${amName}`}
                                className="h-8 text-xs font-medium border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-950/50"
                              >
                                <Mail className="h-3.5 w-3.5 mr-1 text-teal-600 dark:text-teal-400 shrink-0" />
                                Contact AM
                              </Button>
                            ) : null}

                            {/* View Profile */}
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                              title="View Lead Profile"
                            >
                              <Link href={(lead as any).isCompany ? `/companies/${lead.id}` : `/leads/${lead.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Bottom Pagination Control Bar */}
          {sortedLeads.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-900 dark:text-slate-200">{sortedLeads.length === 0 ? 0 : (safeCurrentPage - 1) * (pageSize === -1 ? sortedLeads.length : pageSize) + 1}</strong> to <strong className="text-slate-900 dark:text-slate-200">{pageSize === -1 ? sortedLeads.length : Math.min(safeCurrentPage * pageSize, sortedLeads.length)}</strong> of <strong className="text-slate-900 dark:text-slate-200">{sortedLeads.length}</strong> leads
                </span>
                
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="hidden sm:inline">Per page:</span>
                  <Select value={String(pageSize)} onValueChange={val => setPageSize(Number(val))}>
                    <SelectTrigger className="h-8 w-[75px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="-1">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {pageSize !== -1 && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="h-8 w-8 p-0"
                    title="First Page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={safeCurrentPage === 1}
                    className="h-8 w-8 p-0"
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 px-2">
                    Page {safeCurrentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={safeCurrentPage === totalPages}
                    className="h-8 w-8 p-0"
                    title="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="h-8 w-8 p-0"
                    title="Last Page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Account Manager Dialog Modal */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="w-[calc(100vw-32px)] sm:max-w-[550px] p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader className="space-y-1 min-w-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Mail className="h-5 w-5 text-teal-600 shrink-0" />
              <span className="truncate">Contact Account Manager</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 truncate">
              Reach out to the assigned representative for lead <strong className="text-slate-700 dark:text-slate-300">{activeLeadForContact?.companyName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {activeLeadForContact && (
            <div className="space-y-5 py-2 w-full min-w-0 overflow-hidden">
              {/* AM Profile Card */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1 w-full sm:w-auto">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {(activeAmUser?.displayName || activeLeadForContact.accountManagerAssigned || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {activeAmUser?.displayName || activeLeadForContact.accountManagerAssigned || activeLeadForContact.salesRepAssigned || 'Assigned Representative'}
                    </h4>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5 min-w-0">
                      <span className="shrink-0">{activeAmUser?.activeRole || 'Account Manager'}</span>
                      {activeAmUser?.email && (
                        <>
                          <span className="shrink-0">•</span>
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[180px] sm:max-w-[220px]">{activeAmUser.email}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Call or Mailto Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  {activeAmUser?.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="text-xs flex-1 sm:flex-none min-w-0"
                    >
                      <a href={`mailto:${activeAmUser.email}?subject=${encodeURIComponent(amEmailSubject)}`}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1 shrink-0" />
                        <span>Open Email</span>
                      </a>
                    </Button>
                  )}
                  {(activeAmUser?.mobileNumber || activeAmUser?.phoneNumber) && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="text-xs flex-1 sm:flex-none min-w-0"
                    >
                      <a href={`tel:${activeAmUser.mobileNumber || activeAmUser.phoneNumber}`}>
                        <Phone className="h-3.5 w-3.5 mr-1 text-emerald-600 shrink-0" />
                        <span>Call</span>
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Compose Message Form */}
              <div className="space-y-3 w-full min-w-0">
                <div className="w-full min-w-0">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Subject Line
                  </Label>
                  <Input
                    value={amEmailSubject}
                    onChange={e => setAmEmailSubject(e.target.value)}
                    className="mt-1 text-sm font-medium w-full min-w-0"
                    placeholder="Enter email subject..."
                  />
                </div>

                <div className="w-full min-w-0">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Message Body
                  </Label>
                  <Textarea
                    rows={5}
                    value={amEmailBody}
                    onChange={e => setAmEmailBody(e.target.value)}
                    className="mt-1 text-sm font-sans w-full min-w-0 resize-y"
                    placeholder="Type your message to the Account Manager..."
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 w-full min-w-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setContactDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendAmEmail}
              disabled={sendingEmail || !amEmailBody.trim()}
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white font-semibold"
            >
              <Send className={`h-4 w-4 mr-2 ${sendingEmail ? 'animate-pulse' : ''}`} />
              {sendingEmail ? 'Sending Email...' : 'Send Direct Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outbound Lead Status Info Dialog Modal */}
      <Dialog open={outboundInfoDialogOpen} onOpenChange={setOutboundInfoDialogOpen}>
        <DialogContent className="w-[calc(100vw-32px)] sm:max-w-[550px] p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden border-slate-200 dark:border-slate-800 shadow-xl">
          <DialogHeader className="space-y-1 min-w-0">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shrink-0">
                <HelpCircle className="h-5 w-5" />
              </div>
              <span className="truncate">Outbound Lead Status Information</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 truncate">
              Status details and pipeline progress for <strong className="text-slate-700 dark:text-slate-300">{activeLeadForStatusInfo?.companyName}</strong>
            </DialogDescription>
          </DialogHeader>

          {activeLeadForStatusInfo && (
            <div className="space-y-4 py-2 w-full min-w-0">
              {/* Lead & Status Badge Summary Box */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {activeLeadForStatusInfo.companyName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-semibold">
                      Outbound Bucket
                    </Badge>
                    <Badge className={`text-xs font-semibold px-2.5 py-0.5 border ${getStatusBadgeVariant(activeLeadForStatusInfo.status || '')}`}>
                      {activeLeadForStatusInfo.status || 'New'}
                    </Badge>
                  </div>
                </div>
                {(activeLeadForStatusInfo.city || activeLeadForStatusInfo.address?.city) && (
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{activeLeadForStatusInfo.city || activeLeadForStatusInfo.address?.city}{activeLeadForStatusInfo.state ? `, ${activeLeadForStatusInfo.state}` : ''}</span>
                  </div>
                )}
              </div>

              {/* 1. Outbound Queue & Pipeline State Notice */}
              {renderPipelineStatusNotice(activeLeadForStatusInfo)}

              {/* 2. What Current Status Means */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <Tag className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>What does status "{activeLeadForStatusInfo.status || 'New'}" mean?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                  {getStatusMeaningExplanation(activeLeadForStatusInfo.status || 'New')}
                </p>
              </div>

              {/* 3. How it Reached this Status */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>How the lead reached this status</span>
                </div>
                <div className="pl-6 space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {getStatusOutcomeExplanation(activeLeadForStatusInfo.status || 'New')}
                  </p>
                  {activeLeadForStatusInfo.statusReason && (
                    <div className="mt-2 text-xs p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <strong className="font-semibold text-slate-900 dark:text-slate-200">Recorded Reason / Notes:</strong> {activeLeadForStatusInfo.statusReason}
                    </div>
                  )}
                  {(activeLeadForStatusInfo as any).lastProspected && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>Last Activity / Prospected: {formatDateDisplay((activeLeadForStatusInfo as any).lastProspected)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Contact Aleyna Notice & Action */}
              <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 shrink-0 mt-0.5 sm:mt-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-teal-950 dark:text-teal-100">Need More Information?</h4>
                    <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5 leading-relaxed">
                      If you need more details regarding this lead or its status, please contact <strong>Aleyna Harnett</strong>.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-8 text-xs font-semibold border-teal-300 text-teal-800 bg-white hover:bg-teal-100 hover:text-teal-900 dark:bg-slate-900 dark:border-teal-700 dark:text-teal-200 dark:hover:bg-teal-950 shrink-0"
                >
                  <a href={`mailto:aleyna.harnett@mailplus.com.au?subject=${encodeURIComponent(`Inquiry regarding Outbound Lead: ${activeLeadForStatusInfo.companyName} (${activeLeadForStatusInfo.id})`)}&body=${encodeURIComponent(`Hi Aleyna,\n\nI am contacting you regarding the outbound lead "${activeLeadForStatusInfo.companyName}" (ID: ${activeLeadForStatusInfo.id}) which is currently in status "${activeLeadForStatusInfo.status || 'New'}".\n\nCould you please provide more information or an update on this lead?\n\nThank you!`)}`}>
                    <Send className="h-3.5 w-3.5 mr-1 text-teal-600" />
                    Email Aleyna
                  </a>
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOutboundInfoDialogOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
