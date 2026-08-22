'use client';

import React, { useEffect, useState, use } from 'react';
import { 
  CheckCircle2, 
  FileText, 
  Lock, 
  ShieldCheck, 
  Clock, 
  AlertCircle,
  Calendar,
  PenTool,
  Upload,
  Building2,
  DollarSign,
  MapPin,
  HelpCircle,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface FranchiseAgreementPageProps {
  params: Promise<{ token: string }>;
}

export default function FranchiseAgreementPage({ params }: FranchiseAgreementPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prospect, setProspect] = useState<any>(null);
  const [lockStatus, setLockStatus] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [tab, setTab] = useState<'digital' | 'wet_ink'>('digital');

  // Form State
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [wetInkUrl, setWetInkUrl] = useState('');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sign/franchise-agreement?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to load franchise agreement.');
      }
      setProspect(json.prospect);
      setLockStatus(json.lockStatus);
      const fa = json.prospect?.franchiseAgreement || {};
      setSignerName(fa.signerName || json.prospect.fullName || '');
      setSignerEmail(fa.signerEmail || json.prospect.email || '');
      if (fa.status === 'signed_online' || fa.status === 'wet_signed_uploaded' || fa.executedAt) {
        setExecuted(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred loading the agreement page.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'digital' && !agreedTerms) {
      toast.error('You must accept the terms of the Franchise Agreement to proceed.');
      return;
    }
    if (!signerName.trim()) {
      toast.error('Signer full name is required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/sign/franchise-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          prospectId: prospect.id,
          executionType: tab,
          signerName,
          signerEmail,
          clientIp: '127.0.0.1',
          signatureDataUrl: tab === 'digital' 
            ? 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80'
            : (wetInkUrl || 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80'),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Execution failed.');
      }

      setExecuted(true);
      setProspect((prev: any) => ({
        ...prev,
        franchiseAgreement: json.franchiseAgreement,
      }));
      toast.success(json.message || 'Franchise Agreement executed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Execution failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center max-w-md w-full">
          <Clock className="w-10 h-10 text-[#095c7b] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Loading Franchise Agreement...</h2>
          <p className="text-slate-500 text-sm mt-1">Checking statutory 14-day lock status & dynamic clauses</p>
        </div>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="min-h-screen bg-[#f4f7f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-rose-200 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Agreement Link Invalid</h2>
          <p className="text-rose-600 text-sm mt-1 mb-6">{error || 'Invalid or expired document link.'}</p>
        </div>
      </div>
    );
  }

  const isLocked = lockStatus?.isLocked && !executed;
  const daysRemaining = lockStatus?.daysRemaining || 0;
  const rfd = prospect.requestForDocs || {};
  const eoi = prospect.eoiData || {};

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
              <span className="text-xs uppercase tracking-wider text-teal-200 font-semibold">Legal Execution Interface</span>
              <h1 className="text-2xl font-bold text-white">MailPlus Franchise Agreement</h1>
              <p className="text-teal-100 text-xs sm:text-sm mt-0.5">Ingested from Standard Template (FRA1745-Homebush)</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
            isLocked
              ? 'bg-rose-500 text-white'
              : executed
              ? 'bg-emerald-500 text-white'
              : 'bg-amber-400 text-amber-950'
          }`}>
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : executed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PenTool className="w-3.5 h-3.5" />}
            {isLocked ? 'Statutory 14-Day Lock Active' : executed ? 'Fully Executed' : 'Unlocked for Execution'}
          </span>
        </div>

        {/* Locked Screen Indicator */}
        {isLocked && (
          <div className="bg-gradient-to-r from-amber-900 to-rose-950 text-white rounded-2xl p-8 shadow-lg border border-amber-700 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border border-amber-400/30">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-amber-100">Statutory 14-Day Rule Active</h2>
              <p className="text-amber-200 text-sm mt-2 max-w-lg mx-auto">
                Under the Australian Franchising Code of Conduct, the Franchise Agreement is locked from execution until 14 days after the signed Disclosure Receipt is returned.
              </p>
            </div>
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-amber-950/80 rounded-xl border border-amber-700/50 font-bold text-sm text-amber-300">
              <Calendar className="w-5 h-5 text-amber-400" />
              Earliest Execution Date: {lockStatus?.earliestExecutionDate?.split('T')[0]} ({daysRemaining} days remaining)
            </div>
          </div>
        )}

        {/* Agreement Content & Schedule Dynamic Parameters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-[#095c7b] flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Agreement Schedule & Injected Process Parameters
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Dynamically injected buyer entity, territory boundaries, fee structures, and commencement dates.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block mb-1">Franchisee Buyer Entity:</span>
              <span className="text-slate-700 font-semibold">{rfd.incomingEntityName || prospect.fullName}</span>
              <span className="text-slate-500 block mt-0.5">ABN: {rfd.abn || eoi.abn || 'N/A'}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block mb-1">Territory Boundary:</span>
              <span className="text-slate-700 font-semibold">{rfd.territoryName || prospect.preferredTerritory || 'Arncliffe Territory'}</span>
              <span className="text-slate-500 block mt-0.5">Exclusive Territory defined as per attached boundary map</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block mb-1">Term & Commencement:</span>
              <span className="text-slate-700 font-semibold">5 Years | Commencing {rfd.commencementDate || '01/08/2026'}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block mb-1">Fee Structure:</span>
              <span className="text-slate-700 font-semibold">Service Fee: 25% | Marketing Levy: 5%</span>
            </div>
          </div>
        </div>

        {/* Execution Interface (If Not Locked and Not Executed) */}
        {!isLocked && !executed && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-[#095c7b] flex items-center gap-2">
                  <PenTool className="w-5 h-5" />
                  Digital Execution & R-Sign Pad
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Execute digitally online or upload a physical wet-ink signature scan.</p>
              </div>
              
              {/* Tab Selector */}
              <div className="flex rounded-lg bg-slate-100 p-1 text-xs">
                <button
                  onClick={() => setTab('digital')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                    tab === 'digital' ? 'bg-[#095c7b] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  R-Sign Digital Execution
                </button>
                <button
                  onClick={() => setTab('wet_ink')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                    tab === 'wet_ink' ? 'bg-[#095c7b] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Wet Signature Scan Fallback
                </button>
              </div>
            </div>

            <form onSubmit={handleExecute} className="space-y-4">
              {tab === 'digital' ? (
                <>
                  <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-950 space-y-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="agreedTerms"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-teal-300 text-[#095c7b] focus:ring-[#095c7b]"
                      />
                      <label htmlFor="agreedTerms" className="font-medium cursor-pointer">
                        I confirm that I have read and agree to all standard clauses, schedules, and terms of the MailPlus Franchise Agreement. I understand this digital signature creates a binding agreement.
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Signer Full Name</label>
                      <input
                        type="text"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Signer Email</label>
                      <input
                        type="email"
                        value={signerEmail}
                        onChange={(e) => setSignerEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                      />
                    </div>
                  </div>

                  {/* NetSuite Auto-Sync Streamlining Info */}
                  <div className="p-3 bg-emerald-50 rounded-lg text-[11px] text-emerald-900 border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>NetSuite Streamlined:</strong> Digital executions automatically sync into NetSuite without requiring Maddie to manually re-upload.</span>
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-xs">
                  <p className="text-slate-600">Please print the agreement, apply physical wet-ink signatures, and paste the URL or upload the scanned PDF.</p>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Wet-Ink Scanned Document URL</label>
                    <input
                      type="url"
                      placeholder="https://storage.googleapis.com/.../signed-fa.pdf"
                      value={wetInkUrl}
                      onChange={(e) => setWetInkUrl(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                    />
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg text-[11px] text-amber-900 border border-amber-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong>NetSuite Note:</strong> Physical wet-ink scans will trigger a manual NetSuite upload task for Maddie.</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#095c7b] hover:bg-[#074760] disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
                {tab === 'digital' ? 'Execute Franchise Agreement (R-Sign Digital)' : 'Submit Wet-Ink Signature Scan'}
              </button>
            </form>
          </div>
        )}

        {/* Executed Confirmation Panel */}
        {executed && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-xl font-bold text-slate-800">Franchise Agreement Fully Executed!</h3>
            <p className="text-slate-600 text-sm max-w-md mx-auto">
              The executed PDF has been archived in Prospect+ under candidate records. NetSuite sync status: <strong className="text-emerald-700">Auto-Synced</strong>.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
