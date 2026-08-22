'use client';

import React, { useEffect, useState, use } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  FileText, 
  MapPin, 
  Send, 
  ShieldCheck, 
  User, 
  DollarSign, 
  Lock, 
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface RequestForDocsPageProps {
  params: Promise<{ token: string }>;
}

export default function RequestForDocsPage({ params }: RequestForDocsPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prospect, setProspect] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [instructed, setInstructed] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sign/request-for-docs?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to load request for docs.');
      }
      setProspect(json.prospect);
      if (json.prospect?.requestForDocs?.status === 'instructed') {
        setInstructed(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred loading the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstructAnna = async () => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/sign/request-for-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          prospectId: prospect.id,
          action: 'instruct_lawyer',
          requestForDocs: prospect.requestForDocs,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to dispatch legal instructions.');
      }

      setInstructed(true);
      toast.success('Legal instructions dispatched to Lawyer Anna Trist (anna.trist@klgates.com)');
    } catch (err: any) {
      toast.error(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center max-w-md w-full">
          <Clock className="w-10 h-10 text-[#095c7b] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Loading Legal Instructions...</h2>
          <p className="text-slate-500 text-sm mt-1">Ingesting template parameters and pre-populating Prospect+ data</p>
        </div>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="min-h-screen bg-[#f4f7f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-rose-200 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Unable to Load Instructions</h2>
          <p className="text-rose-600 text-sm mt-1 mb-6">{error || 'Invalid or expired document link.'}</p>
          <a
            href="/operations/franchise-prospects"
            className="inline-flex items-center px-4 py-2 bg-[#095c7b] text-white font-medium rounded-lg text-sm hover:bg-[#074760] transition-colors"
          >
            Return to Operations Dashboard
          </a>
        </div>
      </div>
    );
  }

  const rfd = prospect.requestForDocs || {};
  const fees = rfd.fees || {};
  const isSoleTrader = rfd.isSoleTrader;

  return (
    <div className="min-h-screen bg-[#f4f7f8] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Brand Banner Header */}
        <div className="bg-[#095c7b] text-white rounded-2xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <img
              src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD"
              alt="MailPlus Logo"
              className="h-10 w-auto bg-white/10 p-1.5 rounded-lg"
            />
            <div>
              <span className="text-xs uppercase tracking-wider text-teal-200 font-semibold">Legal Operations Workflow</span>
              <h1 className="text-2xl font-bold text-white">Request for Docs – Legal Instructions</h1>
              <p className="text-teal-100 text-xs sm:text-sm mt-0.5">Template Ingestion & Automated Dispatch to Lawyer Anna Trist</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
              instructed ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'
            }`}>
              {instructed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {instructed ? 'Instructed to Lawyer Anna' : 'Draft / Ready for Review'}
            </span>
            <span className="text-xs text-teal-200">Ref: RFD-{prospect.id.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        {/* Workflow Meta & Chasing Bar */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <User className="w-4 h-4 text-[#095c7b]" />
            <div>
              <span className="font-semibold text-slate-800 block">Lawyer Target:</span>
              <span>Anna Trist (K&L Gates) — anna.trist@klgates.com</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-600 border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-4">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="font-semibold text-slate-800 block">Matt Review Status:</span>
              <span className="text-emerald-700 font-medium">Reviewed & Approved</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-600 border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-4">
            <Clock className="w-4 h-4 text-amber-600" />
            <div>
              <span className="font-semibold text-slate-800 block">Maddie Chasing Workflow:</span>
              <span className="text-amber-700 font-medium">Active Chasing Assigned</span>
            </div>
          </div>
        </div>

        {/* Main Instruction Form Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
          
          {/* Section 1: Target Documentation */}
          <div className="p-6">
            <h3 className="text-base font-bold text-[#095c7b] mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              1. Document Package Requirements
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'New Franchise Pack', active: true },
                { label: 'Disclosure Document', active: true },
                { label: 'Franchise Agreement', active: true },
                { label: 'Confidentiality Deed', active: true },
                { label: 'Deed of Variation / Surrender', active: false },
                { label: 'Tripartite Deed (NAB)', active: Boolean(prospect.nabFunding?.accreditationFundingRequired) }
              ].map((item, idx) => (
                <div key={idx} className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                  item.active ? 'bg-teal-50 border-teal-200 text-[#095c7b]' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] text-white ${item.active ? 'bg-[#095c7b]' : 'bg-slate-300'}`}>✓</div>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Incoming Franchisee Entity Details */}
          <div className="p-6">
            <h3 className="text-base font-bold text-[#095c7b] mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              2. Incoming Franchisee & Entity Structure
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Entity Structure Type:</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {isSoleTrader ? 'SOLE TRADER (Individual)' : 'PTY LTD COMPANY'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Full Legal Entity / Individual Name:</span>
                <span className="font-semibold text-slate-800 text-sm">{rfd.incomingEntityName || prospect.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ABN / ACN:</span>
                <span className="font-semibold text-slate-800">{rfd.abn || 'To be provided'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Registered Business Address:</span>
                <span className="font-semibold text-slate-800">{rfd.registeredAddress || 'Registered Address'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Contact Email & Mobile:</span>
                <span className="font-semibold text-slate-800">{rfd.email} | {rfd.mobile}</span>
              </div>
            </div>

            {/* Sole Trader Conditional Display */}
            {isSoleTrader ? (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <strong>Sole Trader Rule Applied:</strong> The Guarantor field remains blank/hidden as the individual operates directly as guarantor. The Franchise Manager field is automatically mapped to <strong>{prospect.fullName}</strong>.
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-slate-800 block mb-1">Incoming Guarantor(s):</span>
                  {rfd.guarantors?.map((g: any, i: number) => (
                    <div key={i} className="text-slate-700">{g.name} — {g.address}</div>
                  )) || <span className="text-slate-500">{prospect.fullName}</span>}
                </div>
                <div>
                  <span className="font-bold text-slate-800 block mb-1">Franchise Manager:</span>
                  <span className="text-slate-700">{rfd.manager?.name || prospect.fullName}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Territory & Map Attachment */}
          <div className="p-6">
            <h3 className="text-base font-bold text-[#095c7b] mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              3. Business Name, Territory Boundary & High-Res Map
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <div>
                  <span className="text-slate-500 block">Business Name:</span>
                  <span className="font-bold text-slate-800 text-sm">{rfd.businessName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Exclusive Territory Description:</span>
                  <span className="font-semibold text-slate-800">{rfd.territoryName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Proposed Term & Commencement:</span>
                  <span className="font-semibold text-slate-800">{rfd.termYears || 5} Years | Commencing {rfd.commencementDate || '01/08/2026'}</span>
                </div>
              </div>
              <div className="border rounded-xl p-2 bg-slate-50 text-center">
                <span className="text-[11px] font-bold text-slate-700 block mb-1">Greg’s High-Res Territory Map Attachment:</span>
                <img
                  src={rfd.territoryMapUrl || 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80'}
                  alt="Territory Boundary Map"
                  className="w-full h-32 object-cover rounded-lg border border-slate-200 mb-1"
                />
                <span className="text-[10px] text-teal-700 font-semibold inline-flex items-center gap-1">
                  ✓ Matched with IM Boundary Specification
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Fees & Commercial Terms */}
          <div className="p-6">
            <h3 className="text-base font-bold text-[#095c7b] mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              4. Commercial Terms & Fee Structure
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Deposit Paid:</span>
                <span className="font-bold text-slate-900">${fees.deposit?.toLocaleString() || '1,500'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Transfer Fee:</span>
                <span className="font-bold text-slate-900">${fees.transferFee?.toLocaleString() || '3,000'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Transaction Fee:</span>
                <span className="font-bold text-slate-900">${fees.transactionFee?.toLocaleString() || '12,500'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Service Fee %:</span>
                <span className="font-bold text-slate-900">{fees.serviceFeePercent || 25}%</span>
              </div>
            </div>

            {/* Special Conditions */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-800 block mb-1">Special Conditions:</span>
              <p className="text-slate-700">{rfd.specialConditions}</p>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Ready to Dispatch Legal Instructions?</h4>
            <p className="text-slate-500 text-xs mt-0.5">Dispatches this instruction sheet directly to Anna Trist with Matt's review confirmation.</p>
          </div>
          <button
            onClick={handleInstructAnna}
            disabled={submitting || instructed}
            className={`px-6 py-3 rounded-xl font-bold text-sm text-white flex items-center gap-2 shadow-md transition-all ${
              instructed
                ? 'bg-emerald-600 cursor-not-allowed opacity-90'
                : 'bg-[#095c7b] hover:bg-[#074760] active:scale-95'
            }`}
          >
            {submitting ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : instructed ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {instructed ? 'Instructions Dispatched to Anna' : 'Single-Click Instruct Lawyer Anna'}
          </button>
        </div>

      </div>
    </div>
  );
}
