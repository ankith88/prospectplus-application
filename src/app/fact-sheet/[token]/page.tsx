'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import {
  FileText,
  CheckCircle2,
  Phone,
  Mail,
  Building,
  ShieldCheck,
  MapPin,
  DollarSign,
  Calendar,
  AlertTriangle,
  Info,
  Scale,
  Users,
  PieChart,
  Briefcase,
  HelpCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { KeyFactSheetHistoryColumn } from '@/lib/types';

function getFormVersionControlText(): string {
  const now = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}

function getFormattedCurrentDate(rawDate?: string, sentAt?: string): string {
  const target = rawDate || sentAt;
  if (target && target.trim()) {
    if (target.includes('/')) return target;
    const d = new Date(target);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${d.getFullYear()}`;
    }
    return target;
  }
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${now.getFullYear()}`;
}

export default function PublicFactSheetPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prospectData, setProspectData] = useState<any>(null);

  useEffect(() => {
    async function loadFactSheet() {
      if (!token) return;
      try {
        const res = await fetch(`/api/franchise-prospects/fact-sheet?token=${token}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Key Fact Sheet not found or link expired.');
        }
        setProspectData(data.prospect);
      } catch (err: any) {
        console.error('Failed to load fact sheet:', err);
        setError('Could not load Key Fact Sheet. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadFactSheet();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f8] flex flex-col items-center justify-center p-4">
        <Loader className="h-8 w-8 text-[#095c7b] animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading Key Fact Sheet...</p>
      </div>
    );
  }

  if (error || !prospectData) {
    return (
      <div className="min-h-screen bg-[#f4f7f8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 bg-white text-slate-900 shadow-lg">
          <CardHeader className="text-center pb-2">
            <ShieldCheck className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-xl text-red-600 font-bold">Fact Sheet Unavailable</CardTitle>
            <CardDescription className="text-sm text-slate-600">{error || 'Invalid fact sheet link.'}</CardDescription>
          </CardHeader>
          <CardContent className="text-center pt-4">
            <p className="text-xs text-slate-500 mb-4">Please contact MailPlus Head Office for assistance on 1300 65 65 95.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kfs = prospectData.keyFactSheet || {};
  const territory = kfs.territoryName || prospectData.preferredTerritory || 'Unassigned Territory';

  // Helper renderer for Radio / Boolean choices (unselected by default if empty string)
  const renderRadioChoice = (label: string, value?: string) => {
    const isYes = value === 'Yes';
    const isNo = value === 'No';
    return (
      <div className="flex items-center gap-4 text-xs font-semibold text-slate-800">
        {label && <span className="text-slate-700">{label}</span>}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs ${isYes ? 'bg-[#095c7b] text-white border-[#095c7b] font-bold shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>
            {isYes ? '✓ Yes' : '○ Yes'}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs ${isNo ? 'bg-[#095c7b] text-white border-[#095c7b] font-bold shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>
            {isNo ? '✓ No' : '○ No'}
          </span>
        </div>
      </div>
    );
  };

  const renderCheckboxItem = (label: string, checked: boolean) => (
    <div className="flex items-start gap-2.5 text-xs py-1">
      {checked ? <CheckSquare className="h-4 w-4 text-[#095c7b] shrink-0 mt-0.5" /> : <Square className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />}
      <span className={checked ? 'text-slate-900 font-bold' : 'text-slate-600'}>{label}</span>
    </div>
  );

  const versionControlText = getFormVersionControlText();
  const formattedCurrentDate = getFormattedCurrentDate(kfs.documentDate, kfs.sentAt);

  return (
    <div className="min-h-screen bg-[#d0dfcd] text-slate-900 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Brand Banner Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#095c7b] text-white p-2.5 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-[#095c7b] tracking-tight">MailPlus Key Facts Sheet</h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Prepared for <strong className="text-slate-900 font-bold">{prospectData.fullName}</strong> — Territory: <strong className="text-[#095c7b] font-bold">{territory}</strong>
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 text-right bg-slate-50 p-2.5 rounded-lg border border-slate-200 shrink-0">
              <span className="block font-medium text-slate-600">Form version control: {versionControlText}</span>
              <span className="block text-[#095c7b] font-extrabold text-xs mt-0.5">Current Date: {formattedCurrentDate}</span>
            </div>
          </div>

          {/* Top Callout Box: IMPORTANT NOTE TO PROSPECTIVE FRANCHISEES */}
          <div className="bg-[#bce6f2] text-slate-900 rounded-xl p-4 border border-sky-300 space-y-2 text-xs leading-relaxed">
            <h2 className="font-extrabold text-[#095c7b] uppercase tracking-wider text-xs flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#095c7b]" /> IMPORTANT NOTE TO PROSPECTIVE FRANCHISEES
            </h2>
            <p>
              The Key Facts Sheet contains information specific to the franchise agreement you are proposing to <span className="underline decoration-dotted decoration-sky-700 font-semibold">enter into</span> – but it does not cover everything you need to know.
            </p>
            <p>
              The Key Facts Sheet is a starting point – it is not a substitute for carefully reading the Disclosure Document and other documents given to you by the franchisor.
            </p>
            <p>
              The Key Facts Sheet should be used as a guide to reading the Disclosure Document.
            </p>
            <p>
              More resources to help you decide if you are ready to become a franchisee and if this is the right franchise business for you are available at{' '}
              <a href="https://business.gov.au/franchising" target="_blank" rel="noreferrer" className="underline font-bold text-[#095c7b]">business.gov.au/franchising</a> and{' '}
              <a href="https://www.accc.gov.au/business/industry-codes/franchising-code-of-conduct" target="_blank" rel="noreferrer" className="underline font-bold text-[#095c7b]">www.accc.gov.au/business/industry-codes/franchising-code-of-conduct</a>.
            </p>
            <p className="pt-1 text-[11px] text-slate-800 font-medium">
              It’s important to get legal, accounting and business advice from independent professionals with expertise in franchising. They will see risks you can’t and will help you in your decision making.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION A: About the franchisor */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-[#095c7b]">A. About the franchisor</h2>
          <div className="bg-[#bce6f2] text-slate-900 rounded-lg p-3 text-xs border border-sky-300">
            The Franchising Code usually requires franchisors to provide financial reports for the last 2 completed financial years in the Disclosure Document. Details about the financial viability of the franchisor can be found in items 21.1-21.6 of the Disclosure Document.
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4">
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">Name of franchisor</span>
              <div className="p-2.5 bg-white border rounded-lg font-semibold text-xs text-slate-900 shadow-sm">
                {kfs.franchisorName || 'Mail Plus Pty Ltd'}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">How long has the franchisor operated the franchise system in Australia?</span>
              <div className="p-2.5 bg-white border rounded-lg font-semibold text-xs text-slate-900 shadow-sm">
                {kfs.yearsInOperation || '8 years'}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Financial viability: does the franchisor have reasonable grounds to believe it will be able to pay its debts when they are due?
              </span>
              {renderRadioChoice('', kfs.financialViability)}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION B: Major disputes */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-[#095c7b]">B. Major disputes</h2>
          <div className="bg-[#bce6f2] text-slate-900 rounded-lg p-3 text-xs border border-sky-300">
            Details about legal proceedings can be found in items 4.1-4.4 of the Disclosure Document.
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4">
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Current legal proceedings: Is the franchisor currently involved in any disclosable legal proceedings?
              </span>
              {renderRadioChoice('', kfs.currentLegalProceedings)}
            </div>

            <div className="border-t pt-3">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Final judgments: Has the franchisor been subject to a final judgment in civil proceedings in the last 5 years (which is required to be disclosed under the Franchising Code), or declared bankrupt, been insolvent under administration or a Chapter 5 body corporate in Australia or elsewhere in the last 10 years?
              </span>
              {renderRadioChoice('', kfs.finalJudgments)}
            </div>

            <div className="border-t pt-3">
              <span className="text-xs font-bold text-slate-700 block mb-1">
                Franchisor-franchisee disputes: What percentage of franchisees in your franchise system were party to a mediation, conciliation or arbitration process in the last financial year?
              </span>
              <div className="p-2.5 bg-white border rounded-lg font-semibold text-xs text-slate-900 w-32 mt-1 shadow-sm">
                {kfs.disputeMediationPercent || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION C: Current and past franchisees */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-[#095c7b]">C. Current and past franchisees</h2>
          <div className="bg-[#bce6f2] text-slate-900 rounded-lg p-3 text-xs border border-sky-300">
            Details about businesses in the franchise system and a list of current and former franchisees you can talk to as part of your research can be found in items 6.1-6.5 of the Disclosure Document.
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4 text-xs">
            <span className="font-bold text-slate-800 block text-xs">Number of franchise businesses in the franchise system.</span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Franchisee owned</span>
                <div className="p-2.5 bg-white border rounded-lg font-bold text-sm text-[#095c7b] shadow-sm">
                  {kfs.franchiseeOwnedCount !== undefined && kfs.franchiseeOwnedCount !== '' && kfs.franchiseeOwnedCount !== null ? kfs.franchiseeOwnedCount : '-'}
                </div>
              </div>
              <div>
                <span className="font-bold text-slate-700 block mb-1">Corporate owned</span>
                <div className="p-2.5 bg-white border rounded-lg font-bold text-sm text-[#095c7b] shadow-sm">
                  {kfs.corporateOwnedCount !== undefined && kfs.corporateOwnedCount !== '' && kfs.corporateOwnedCount !== null ? kfs.corporateOwnedCount : '-'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <span className="font-bold text-slate-800 block mb-2 uppercase text-[11px] tracking-wider">
                Last 3 Financial Years (as required in the Disclosure Document)
              </span>
              
              {(() => {
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth() + 1;
                const lastCompletedFyYear = currentMonth >= 7 ? currentYear : currentYear - 1;

                const defaultCols: KeyFactSheetHistoryColumn[] = [
                  { id: 'fy_1', label: `FY ending 30/06/${lastCompletedFyYear}`, occurrences: { transferred: kfs.historyFy2024?.transferred ?? 0, ceased: kfs.historyFy2024?.ceased ?? 0, terminatedFranchisor: kfs.historyFy2024?.terminatedFranchisor ?? 0, terminatedFranchisee: kfs.historyFy2024?.terminatedFranchisee ?? 0, notExtended: kfs.historyFy2024?.notExtended ?? 0, boughtBack: kfs.historyFy2024?.boughtBack ?? 0, acquiredByFranchisor: kfs.historyFy2024?.acquiredByFranchisor ?? 0 } },
                  { id: 'fy_2', label: `FY ending 30/06/${lastCompletedFyYear - 1}`, occurrences: { transferred: kfs.historyFy2023?.transferred ?? 0, ceased: kfs.historyFy2023?.ceased ?? 0, terminatedFranchisor: kfs.historyFy2023?.terminatedFranchisor ?? 0, terminatedFranchisee: kfs.historyFy2023?.terminatedFranchisee ?? 0, notExtended: kfs.historyFy2023?.notExtended ?? 0, boughtBack: kfs.historyFy2023?.boughtBack ?? 0, acquiredByFranchisor: kfs.historyFy2023?.acquiredByFranchisor ?? 0 } },
                  { id: 'fy_3', label: `FY ending 30/06/${lastCompletedFyYear - 2}`, occurrences: { transferred: kfs.historyFy2022?.transferred ?? 0, ceased: kfs.historyFy2022?.ceased ?? 0, terminatedFranchisor: kfs.historyFy2022?.terminatedFranchisor ?? 0, terminatedFranchisee: kfs.historyFy2022?.terminatedFranchisee ?? 0, notExtended: kfs.historyFy2022?.notExtended ?? 0, boughtBack: kfs.historyFy2022?.boughtBack ?? 0, acquiredByFranchisor: kfs.historyFy2022?.acquiredByFranchisor ?? 0 } },
                ];

                const colsToRender = kfs.historyColumns?.length ? kfs.historyColumns : defaultCols;

                const eventRows = [
                  { key: 'transferred', label: 'A franchise was transferred (ownership changed to a different franchisee)' },
                  { key: 'ceased', label: 'A franchised business ceased to operate (closed)' },
                  { key: 'terminatedFranchisor', label: 'A franchise agreement was terminated by the franchisor' },
                  { key: 'terminatedFranchisee', label: 'A franchise agreement was terminated by the franchisee' },
                  { key: 'notExtended', label: 'A franchise agreement was not extended' },
                  { key: 'boughtBack', label: 'A franchise business was bought back by the franchisor' },
                  { key: 'acquiredByFranchisor', label: 'A franchise agreement was terminated and the business was acquired by the franchisor' },
                ] as const;

                return (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                    <table className="w-full text-left text-xs text-slate-800">
                      <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b">
                        <tr>
                          <th className="p-2.5 min-w-[200px] border-r">Event</th>
                          {colsToRender.map((col: KeyFactSheetHistoryColumn, idx: number) => (
                            <th key={col.id || idx} className="p-2.5 text-center min-w-[130px] border-r last:border-r-0">
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y text-[11px]">
                        {eventRows.map((row) => (
                          <tr key={row.key} className="hover:bg-slate-50">
                            <td className="p-2.5 border-r text-slate-800 font-medium">{row.label}</td>
                            {colsToRender.map((col: KeyFactSheetHistoryColumn, idx: number) => (
                              <td key={col.id || idx} className="p-2.5 text-center font-bold text-[#095c7b] border-r last:border-r-0">
                                {col.occurrences[row.key as keyof typeof col.occurrences] ?? 0}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION D: The territory or site for the business */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-[#095c7b]">D. The territory or site for the business</h2>
          <div className="bg-[#bce6f2] text-slate-900 rounded-lg p-3 text-xs border border-sky-300 space-y-1">
            <p>Details about the site or territory can be found in items 9.1-9.2, 11.1, 12.1-12.5 and 13.1-13.4 of the Disclosure Document.</p>
            <p className="font-semibold">As well as reading all the information the franchisor provides on leasing, you should seek legal advice before entering a contract.</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4 text-xs">
            <div>
              <span className="font-bold text-slate-800 block mb-2">Details of the territory or site: Tick all that apply</span>
              {renderCheckboxItem('The franchisee can only operate the business at a particular site (limited to premises only)', (kfs.territoryDetailsSelected || []).includes('limited_premises'))}
              {renderCheckboxItem('The franchisee can operate the business anywhere but may be competing with other franchised businesses (no territory)', (kfs.territoryDetailsSelected || []).includes('no_territory'))}
              {renderCheckboxItem('No other franchised business will operate in the franchisee’s defined territory (exclusive territory)', (kfs.territoryDetailsSelected || []).includes('exclusive_territory'))}
              {renderCheckboxItem('You may encounter competition from other franchisees or the franchisor in your defined territory (non-exclusive territory)', (kfs.territoryDetailsSelected || []).includes('non_exclusive_territory'))}
              {renderCheckboxItem('other – (add details below)', (kfs.territoryDetailsSelected || []).includes('other'))}
              
              {kfs.territoryOtherDetails && (
                <div className="mt-2 p-2.5 bg-white border rounded-lg text-xs text-slate-800 shadow-sm">
                  {kfs.territoryOtherDetails}
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-2">Can the franchisor change the territory or site of the franchise?</span>
              {renderRadioChoice('', kfs.canFranchisorChangeTerritory)}
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-2">Could the franchisee face competition from one or more businesses that sell goods or services that are substantially the same as the franchisee, including via online sales? Tick all that apply</span>
              {renderCheckboxItem('Yes, but only from businesses not associated with the franchisor', (kfs.competitionTypesSelected || []).includes('not_associated'))}
              {renderCheckboxItem('Yes, from another franchisee with the same brand', (kfs.competitionTypesSelected || []).includes('same_brand'))}
              {renderCheckboxItem('Yes, from the franchisor', (kfs.competitionTypesSelected || []).includes('franchisor'))}
              {renderCheckboxItem('Yes, from a third party authorised by the franchisor', (kfs.competitionTypesSelected || []).includes('third_party'))}
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-2">Can the franchisee sell goods or services of the same type or brand online?</span>
              {renderRadioChoice('', kfs.canFranchiseeSellOnline)}
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-2">Does the franchisor have an interest in a lease that will be used for the operation of the franchised business?</span>
              {renderRadioChoice('', kfs.leaseInterest)}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION E: Supply of goods and services to the franchisee */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-[#095c7b]">E. Supply of goods and services to the franchisee</h2>
          <div className="bg-[#bce6f2] text-slate-900 rounded-lg p-3 text-xs border border-sky-300">
            Details about the supply of goods or services to operate your franchise, including the rebates and other financial benefits received by the franchisor, can be found in items 10.1-10.3 of the Disclosure Document.
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4 text-xs">
            <div>
              <span className="font-bold text-slate-800 block mb-2">Are there restrictions to franchisees choosing suppliers?</span>
              {renderRadioChoice('', kfs.supplierRestrictions)}
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-2">Does the franchisor have an interest in any supplier the franchisee might have to get goods or services from?</span>
              {renderRadioChoice('', kfs.franchisorInterestInSuppliers)}
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-2">Does the franchisor receive a rebate or other financial benefit from supplying goods or services to franchisees?</span>
              {renderRadioChoice('', kfs.franchisorRebates)}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION F: What the franchisee has to pay to operate the franchise */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-[#095c7b]">F. What the franchisee has to pay to operate the franchise</h2>
          <div className="bg-[#bce6f2] text-slate-900 rounded-lg p-3 text-xs border border-sky-300 space-y-1">
            <p>Details about the costs to operate your franchise can be found in items 14.1-14.10 of the Disclosure Document.</p>
            <p>When considering operating costs, remember to look at how many staff (including you) are needed to operate the business, the average hours they would work and the costs of hiring staff. The Fair Work Ombudsman can help you understand your workplace rights: www.fairwork.gov.au/franchises.</p>
            <p className="font-semibold">(Figures provided are total amounts or an estimate if the total amount is unavailable.)</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4 text-xs">
            <div>
              <span className="font-bold text-slate-800 block mb-1">What payment does the franchisor require before the franchisee can enter the franchise agreement, if any?</span>
              <div className="p-3 bg-white border rounded-lg text-slate-900 font-medium shadow-sm">
                {kfs.preliminaryPaymentRequired || '-'}
              </div>
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-1">What are the range of costs to set up the franchise business?</span>
              <div className="p-3 bg-white border rounded-lg text-slate-900 space-y-2 shadow-sm">
                <p><strong>Initial Franchise Fee:</strong> {kfs.franchiseFee ? `$${Number(kfs.franchiseFee).toLocaleString()}` : '-'}</p>
                <p><strong>Payable to Franchisor:</strong> Transaction Fee: {kfs.transactionFee ? `$${Number(kfs.transactionFee).toLocaleString()}` : '-'}; Unlimited Term Fee: $25,000 (includes Transfer Fee & Training Fee)</p>
                <p><strong>Estimated Set-up costs:</strong> Vehicle {kfs.vehicleCostRange || '-'}; equipment {kfs.equipmentCostRange || '-'}; insurance {kfs.insuranceCostRange || '-'}; vehicle rego {kfs.regoCostRange || '-'}; working capital {kfs.workingCapitalRange || '-'}; expenses during training $3,000; set up business structure $0-$1,500; documentation $3,000; legal, accounting, business advice {kfs.legalAccountingRange || '-'}.</p>
              </div>
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-1">What is the amount and/or method of calculation of ongoing payments the franchisee has to make?</span>
              <div className="p-3 bg-white border rounded-lg text-slate-900 shadow-sm">
                {kfs.ongoingPaymentsText || 'Franchise Service Fee 25% of turnover; Marketing Levy 5% of turnover; Technology License Fee $5,000 per term; Transfer Fee $3,000; Renewal Fee $0-$5,000 (plus $3,000 Administrative Fee); Inspection and audit (if any) $0-variable; Interest 13.5% (on any amount outstanding); indemnification/enforcement cost (if any) $0-variable.'}
              </div>
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-1">What other payments are payable by the franchisee to a person other than the franchisor?</span>
              <div className="p-3 bg-white border rounded-lg text-slate-900 shadow-sm">
                {kfs.otherPaymentsText || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION G: Marketing funds */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-[#095c7b]">G. Marketing funds</h2>
          <div className="bg-[#bce6f2] text-slate-900 rounded-lg p-3 text-xs border border-sky-300 space-y-1">
            <p>Note that if the franchisor becomes insolvent, you may not get money back that you have given to the franchisor, including contributions to the marketing funds.</p>
            <p>The franchisor is required by clause 15 of the Franchising Code to provide the franchisee with marketing fund statements each year. The statements need to be audited (unless 75% of franchisees have voted to agree that statements do not need to be audited).</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3 text-xs">
            <span className="font-bold text-slate-800 block mb-1">If the franchisee must contribute to a marketing fund, what is the contribution or how is it calculated?</span>
            <div className="p-3 bg-white border rounded-lg text-[#095c7b] font-bold shadow-sm">
              {kfs.marketingFundContribution || kfs.marketingFeePercent || '-'}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION H: Unilateral variation */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-[#095c7b]">H. The franchisor’s ability to change the franchise agreement (unilateral variation)</h2>
          <div className="bg-[#bce6f2] text-slate-900 rounded-lg p-3 text-xs border border-sky-300">
            Details about the ability to change the franchise agreement or other documents can be found in items 17.1-17.2 of the Disclosure Document.
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs">
            <span className="font-bold text-slate-800 block mb-2">Can the franchisor change the franchise agreement without the franchisee’s consent?</span>
            {renderRadioChoice('', kfs.canUnilateralVariation)}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION I: Earnings */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-[#095c7b]">I. Earnings</h2>
          <div className="bg-[#bce6f2] text-slate-900 rounded-lg p-3 text-xs border border-sky-300">
            The Franchising Code requires a franchisor to state that to the best of its knowledge any earnings information provided is accurate unless it specifies otherwise. It is important to review this information with your accountant or business adviser. Details about earnings information can be found in items 20.1-20.4 of the Disclosure Document.
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4 text-xs">
            <div>
              <span className="font-bold text-slate-800 block mb-2">Does the Disclosure Document include historical earnings data for the specific site/territory of the franchise business you are being offered?</span>
              {renderRadioChoice('', kfs.historicalEarningsIncluded)}
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-2">Does the Disclosure Document include projected earnings information for the specific site/territory of the franchise business you are being offered?</span>
              {renderRadioChoice('', kfs.projectedEarningsIncluded)}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION J: What happens at the end of the franchise agreement */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-[#095c7b]">J. What happens at the end of the franchise agreement</h2>
          <div className="bg-[#bce6f2] text-slate-900 rounded-lg p-3 text-xs border border-sky-300">
            A franchise agreement may end due to expiry (non-renewal), termination or the franchise system ceasing to operate for any reason. Details about what happens at the end of the term of the franchise agreement can be found in items 18.1-18.5 of the Disclosure Document and of the franchise agreement.
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4 text-xs">
            <div>
              <span className="font-bold text-slate-800 block mb-1">Which section or items of the franchise agreement has the details about what happens at the end of the term?</span>
              <div className="p-3 bg-white border rounded-lg text-slate-900 font-semibold shadow-sm">
                {kfs.endOfAgreementClauseDetails || '-'}
              </div>
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-1">What is the term of the franchise agreement (unless terminated earlier for any reason)?</span>
              <div className="p-3 bg-white border rounded-lg text-slate-900 font-semibold shadow-sm">
                {kfs.agreementTermYears || '-'}
              </div>
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-2">Does a franchisee have an option to renew the franchise agreement? Tick all that apply</span>
              {renderCheckboxItem('Yes – subject to a new agreement', (kfs.renewalOptionSelected || []).includes('new_agreement'))}
              {renderCheckboxItem('Yes – subject to conditions', (kfs.renewalOptionSelected || []).includes('subject_conditions'))}
              {renderCheckboxItem('No', (kfs.renewalOptionSelected || []).includes('no'))}
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-2">Will the franchisor purchase unsold stock, marketing material, equipment and other assets?</span>
              {renderRadioChoice('', kfs.franchisorBuysUnsoldStock)}
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-1">Is the franchisee entitled to any compensation for goodwill in the business?</span>
              <span className="text-[11px] text-slate-500 block mb-2">Goodwill is not defined in the Franchising Code. It is important you seek independent legal advice.</span>
              {renderRadioChoice('', kfs.goodwillCompensation)}
            </div>

            <div className="border-t pt-3">
              <span className="font-bold text-slate-800 block mb-2">Will the franchisee be subject to any restraint of trade (or similar) clause?</span>
              {renderRadioChoice('', kfs.restraintOfTradeClause)}
            </div>

            {kfs.notes && (
              <div className="border-t pt-3">
                <span className="font-bold text-[#095c7b] block mb-1">Territory Specific Notes & Special Conditions</span>
                <p className="p-3 bg-white border rounded-lg text-slate-900 font-medium italic shadow-sm">"{kfs.notes}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Head Office Box */}
        <div className="bg-[#095c7b] text-white rounded-xl shadow-md p-6 text-center space-y-3">
          <h3 className="text-lg font-extrabold text-white">Questions About This Key Facts Sheet?</h3>
          <p className="text-xs text-sky-100 max-w-xl mx-auto">
            Our National Franchise Sales team is available to assist you with any questions regarding this document or next steps.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a href="tel:1300656595" className="inline-flex items-center gap-2 bg-white text-[#095c7b] hover:bg-slate-100 px-5 py-2.5 rounded-lg text-xs font-bold shadow transition-colors">
              <Phone className="h-4 w-4" /> Call Head Office (1300 65 65 95)
            </a>
            <a href="mailto:greg.hart@mailplus.com.au" className="inline-flex items-center gap-2 bg-[#074760] hover:bg-[#05374a] text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow transition-colors border border-sky-400/30">
              <Mail className="h-4 w-4" /> Email Greg Hart (National Sales)
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-300">
          <p className="font-bold text-slate-700">MailPlus Australia &copy; 2026 | Business logistics, made simple.</p>
          <p className="text-[11px] mt-1 text-slate-500">Mail Plus Pty Ltd | Level 1, 12 Woolpack Comp, Sydney NSW</p>
        </div>
      </div>
    </div>
  );
}
