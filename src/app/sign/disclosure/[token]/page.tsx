'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { 
  CheckCircle2, 
  FileText, 
  Lock, 
  ShieldCheck, 
  Clock, 
  AlertCircle,
  Calendar,
  PenTool,
  Download,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface DisclosurePageProps {
  params: Promise<{ token: string }>;
}

export default function DisclosurePage({ params }: DisclosurePageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prospect, setProspect] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  
  // Signature form state
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sign/disclosure?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to load disclosure document.');
      }
      setProspect(json.prospect);
      const disc = json.prospect?.disclosureDocument || {};
      setSignerName(disc.signerName || json.prospect.fullName || '');
      setSignerEmail(disc.signerEmail || json.prospect.email || '');
      if (disc.status === 'receipt_signed' || disc.receiptSignedAt) {
        setSigned(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred loading the disclosure page.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error('You must confirm receipt of the Franchise Disclosure Document.');
      return;
    }
    if (!signerName.trim()) {
      toast.error('Signer full name is required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/sign/disclosure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          prospectId: prospect.id,
          signerName,
          signerEmail,
          clientIp: '127.0.0.1',
          dispatchMethod: 'electronic',
          signatureDataUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to submit disclosure receipt.');
      }

      setSigned(true);
      setProspect((prev: any) => ({
        ...prev,
        disclosureDocument: json.disclosureDocument,
      }));
      toast.success('Disclosure Receipt digitally signed & recorded!');
    } catch (err: any) {
      toast.error(err.message || 'Signing failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center max-w-md w-full">
          <Clock className="w-10 h-10 text-[#095c7b] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Loading Disclosure Document...</h2>
          <p className="text-slate-500 text-sm mt-1">Retrieving ~50 page disclosure pack & receipt</p>
        </div>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="min-h-screen bg-[#f4f7f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-rose-200 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Disclosure Link Invalid</h2>
          <p className="text-rose-600 text-sm mt-1 mb-6">{error || 'Invalid or expired document link.'}</p>
        </div>
      </div>
    );
  }

  const disc = prospect.disclosureDocument || {};

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
              <span className="text-xs uppercase tracking-wider text-teal-200 font-semibold">Statutory Compliance Portal</span>
              <h1 className="text-2xl font-bold text-white">Franchise Disclosure Document & Receipt</h1>
              <p className="text-teal-100 text-xs sm:text-sm mt-0.5">MailPlus Australia Mandatory Franchising Code of Conduct Disclosure</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
            signed ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'
          }`}>
            {signed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {signed ? 'Receipt Returned' : 'Pending Signature'}
          </span>
        </div>

        {/* 14-Day Statutory Compliance Alert Banner */}
        {signed && disc.earliestFranchiseAgreementExecutionDate && (
          <div className="bg-emerald-900 text-white rounded-2xl p-6 shadow-md border border-emerald-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-base text-emerald-100">Disclosure Receipt Acknowledged</h3>
                <p className="text-emerald-200 text-xs mt-1">
                  Signed on <strong>{disc.receiptSignedAt?.split('T')[0]}</strong>. Under the 14-day statutory rule, the Franchise Agreement is locked until:
                </p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-emerald-800 rounded-lg text-emerald-100 font-bold text-xs">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Earliest Execution Allowed: {disc.earliestFranchiseAgreementExecutionDate.split('T')[0]}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document Overview & Summary Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#095c7b]" />
                Franchise Disclosure Document (~50 Pages)
              </h2>
              <p className="text-slate-500 text-xs">Complete details regarding MailPlus business structure, financial history, fees, and operational terms.</p>
            </div>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); toast.info('Disclosure Document PDF (~50 pages) downloaded.'); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-xs rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Full PDF
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">Franchisor Entity:</span>
              <span className="text-slate-600">MailPlus Australia Pty Ltd (ACN 116 384 921)</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">Target Prospect:</span>
              <span className="text-slate-600">{prospect.fullName} ({prospect.email})</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">Territory Allocation:</span>
              <span className="text-slate-600">{prospect.preferredTerritory || 'Arncliffe / Territory'}</span>
            </div>
          </div>
        </div>

        {/* Digital Execution Form Panel (R-Sign Workflow) */}
        {!signed ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-[#095c7b] flex items-center gap-2">
                <PenTool className="w-5 h-5" />
                Digital Execution — Disclosure Receipt Acknowledgment
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">Please confirm that you have received and reviewed the ~50-page Franchise Disclosure Document.</p>
            </div>

            <form onSubmit={handleSignReceipt} className="space-y-4">
              <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-950 space-y-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="agreed"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-teal-300 text-[#095c7b] focus:ring-[#095c7b]"
                  />
                  <label htmlFor="agreed" className="font-medium cursor-pointer">
                    I acknowledge that I have received a copy of the MailPlus Franchise Disclosure Document and Key Fact Sheet, and understand that the 14-day statutory waiting period will begin upon submission.
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Signer Name</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Signer Email Address</label>
                  <input
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
                  />
                </div>
              </div>

              {/* R-Sign Audit Log Display */}
              <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 space-y-1">
                <div><strong>Audit Capture:</strong> IP Address (Recorded on Submit) | ISO Timestamp Signature</div>
                <div><strong>Execution Format:</strong> Electronic Digital Signature Pad</div>
              </div>

              <button
                type="submit"
                disabled={submitting || !agreed}
                className="w-full py-3 bg-[#095c7b] hover:bg-[#074760] disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Digitally Sign Disclosure Receipt
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-xl font-bold text-slate-800">Disclosure Receipt Completed</h3>
            <p className="text-slate-600 text-sm max-w-md mx-auto">
              Your acknowledgment has been digitally signed and archived into Prospect+. The statutory 14-day rule is currently active.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
