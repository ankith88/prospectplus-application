'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  Users,
  PieChart,
  Briefcase,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

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
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prospectData, setProspectData] = useState<any>(null);

  useEffect(() => {
    async function loadIM() {
      if (!token) return;
      try {
        const res = await fetch(`/api/franchise-prospects/fact-sheet?token=${token}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Information Memorandum (IM) not found or link expired.');
        }
        setProspectData(data.prospect);
      } catch (err: any) {
        console.error('Failed to load IM:', err);
        setError('Could not load Information Memorandum (IM). Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadIM();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f8] flex flex-col items-center justify-center p-4">
        <Loader className="h-8 w-8 text-[#095c7b] animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading Information Memorandum (IM)...</p>
      </div>
    );
  }

  if (error || !prospectData) {
    return (
      <div className="min-h-screen bg-[#f4f7f8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 bg-white text-slate-900 shadow-lg rounded-2xl">
          <CardHeader className="text-center pb-2">
            <ShieldCheck className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-xl text-red-600 font-bold">Information Memorandum Unavailable</CardTitle>
            <CardDescription className="text-sm text-slate-600">{error || 'Invalid or expired IM link.'}</CardDescription>
          </CardHeader>
          <CardContent className="text-center pt-4">
            <p className="text-xs text-slate-500 mb-4">Please contact MailPlus Head Office for assistance on 1300 65 65 95.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kfs = prospectData.keyFactSheet || {};
  const territory = kfs.territoryName || prospectData.preferredTerritory || 'MailPlus Waterloo Alexandria';

  // Helper to format currency values safely
  const formatCurrencyValue = (val: any, fallback: string, suffix: string = '') => {
    if (val === undefined || val === null || val === '') return fallback;
    const strVal = String(val).trim();
    if (strVal.includes('$')) return strVal + (suffix && !strVal.includes(suffix) ? ` ${suffix}` : '');
    const num = Number(strVal);
    if (!isNaN(num)) {
      return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2 })}${suffix ? ` ${suffix}` : ''}`;
    }
    return strVal;
  };

  const formatPercentValue = (val: any, fallback: string) => {
    if (val === undefined || val === null || val === '') return fallback;
    const strVal = String(val).trim();
    if (strVal.includes('%')) return strVal;
    const num = Number(strVal);
    if (!isNaN(num)) return `${num}%`;
    return strVal;
  };

  // Dynamic values extracted with fallback to official IM defaults
  const dateBusinessStarted = kfs.dateBusinessStarted || '01/02/2022';
  const numberOfOwners = kfs.numberOfOwners ?? '1';
  const reasonForSale = kfs.reasonForSale || 'Moving / Relocating';

  const last12MonthsServiceRevenue = formatCurrencyValue(kfs.last12MonthsServiceRevenue, '$300,437.26 (+GST)', '(+GST)');
  const franchiseFeePercent = formatPercentValue(kfs.franchiseFeePercent, '25%');
  const marketingLevyPercent = formatPercentValue(kfs.marketingLevyPercent, '5%');
  const last12MonthsExpressRevenue = formatCurrencyValue(kfs.last12MonthsExpressRevenue, '$856.60');
  const askingPriceText = kfs.askingPriceText || formatCurrencyValue(kfs.askingPrice, '$335,000.00 NEG', 'NEG');

  const totalDailyRunTimeHours = kfs.totalDailyRunTimeHours || 'Between 8.5 to 9.5 hours per day';
  const morningShiftHours = kfs.morningShiftHours || '6:00am to 11:00am';
  const afternoonShiftHours = kfs.afternoonShiftHours || '1:00pm to 4:00pm';
  const franchiseTermYears = kfs.franchiseTermYears || 'Unlimited';

  const initialFranchiseFee = kfs.franchiseFee ? (String(kfs.franchiseFee).includes('$') ? String(kfs.franchiseFee) : `$${Number(kfs.franchiseFee).toLocaleString('en-AU')}`) : '$35,000';
  const trainingFee = kfs.trainingFee ? (String(kfs.trainingFee).includes('$') ? String(kfs.trainingFee) : `$${Number(kfs.trainingFee).toLocaleString('en-AU')}`) : '$5,000';

  const formattedDate = getFormattedCurrentDate(kfs.documentDate, kfs.sentAt);

  return (
    <div className="min-h-screen bg-[#f4f7f8] text-slate-900 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Brand Banner Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          <div className="bg-[#095c7b] py-6 px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD"
                alt="MailPlus Logo"
                className="h-10 sm:h-12 w-auto border-0"
              />
              <div className="border-l border-white/30 pl-4">
                <Badge className="bg-[#eaf143] text-slate-950 hover:bg-[#dbe232] font-bold text-[10px] uppercase tracking-wider mb-1">
                  OFFICIAL INFORMATION MEMORANDUM (IM)
                </Badge>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  MailPlus Franchise Profile & Schedule
                </h1>
              </div>
            </div>
            <div className="text-right text-xs text-slate-200 font-medium bg-white/10 py-2 px-3.5 rounded-xl border border-white/20">
              <span>Date Dispatched: <strong>{formattedDate}</strong></span>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">Candidate Preparation</p>
              <h2 className="text-lg font-bold text-[#095c7b] mt-0.5">
                {prospectData.fullName || prospectData.firstName || 'Valued Franchise Candidate'}
              </h2>
            </div>
            <div className="bg-white py-2 px-4 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium block">Proposed Territory Name:</span>
              <span className="font-bold text-[#095c7b] text-sm flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                {territory}
              </span>
            </div>
          </div>
        </div>

        {/* Hero Financial Highlights Cards (4 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">12M Service Revenue</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-[#095c7b]">{last12MonthsServiceRevenue}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Excluding GST (Trailing 12m)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Asking Sale Price</span>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-emerald-700">{askingPriceText}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Commercial Proposed Price</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Average Run Time</span>
                <Clock className="h-4 w-4 text-[#095c7b]" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-tight">{totalDailyRunTimeHours}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Current Operations Schedule</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Product Commission</span>
                <Award className="h-4 w-4 text-[#095c7b]" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-slate-900">{last12MonthsExpressRevenue}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">MailPlus Express (Ex GST)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 1: Proposed Territory Profile & Schedule */}
        <Card className="border-slate-200 shadow-md bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b py-4 px-6">
            <CardTitle className="text-base font-bold text-[#095c7b] flex items-center gap-2">
              <Building className="h-5 w-5 text-[#095c7b]" />
              1. Proposed Territory Profile & Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block">Territory Name:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{territory}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block">Date Business Started:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{dateBusinessStarted}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block">Number of Owners:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{numberOfOwners} Owner(s)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block">Reason for Sale:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{reasonForSale}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: Financial Revenues & Commercial Terms */}
        <Card className="border-slate-200 shadow-md bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b py-4 px-6">
            <CardTitle className="text-base font-bold text-[#095c7b] flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              2. Financial Performance & Commercial Revenues
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <span className="text-slate-600 font-medium block">Last 12 Months Service Revenue (Ex GST):</span>
                <span className="font-extrabold text-emerald-800 text-base mt-1 block">{last12MonthsServiceRevenue}</span>
              </div>
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <span className="text-slate-600 font-medium block">Asking / Proposed Sale Price:</span>
                <span className="font-extrabold text-emerald-800 text-base mt-1 block">{askingPriceText}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block">Franchise Fees on Service Revenue:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{franchiseFeePercent}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block">Marketing Levy:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{marketingLevyPercent}</span>
              </div>
              <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block">Last 12 Months MailPlus Product Revenue (Product Commission Ex GST):</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{last12MonthsExpressRevenue}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: Shift Schedule & Operational Run Time */}
        <Card className="border-slate-200 shadow-md bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b py-4 px-6">
            <CardTitle className="text-base font-bold text-[#095c7b] flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#095c7b]" />
              3. Shift Schedule & Operational Run Time
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2 p-3.5 bg-sky-50/60 rounded-xl border border-sky-200">
                <span className="text-slate-600 font-medium block">Total Average Daily Run Time (Current):</span>
                <span className="font-extrabold text-[#095c7b] text-base mt-1 block">{totalDailyRunTimeHours}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block">Current Morning Shift:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{morningShiftHours}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block">Current Afternoon Shift:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{afternoonShiftHours}</span>
              </div>
              <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block">Franchise Term:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{franchiseTermYears}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: Initial Fees & Investment */}
        <Card className="border-slate-200 shadow-md bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b py-4 px-6">
            <CardTitle className="text-base font-bold text-[#095c7b] flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#095c7b]" />
              4. Initial Investment & Fee Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block">Initial Franchise Fee:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{initialFranchiseFee}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block">Training & Onboarding Fee:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{trainingFee}</span>
              </div>
              {kfs.notes && (
                <div className="sm:col-span-2 p-3.5 bg-amber-50/60 rounded-xl border border-amber-200">
                  <span className="text-amber-800 font-bold block mb-1">Territory Notes & Special Commercial Terms:</span>
                  <p className="text-slate-700 leading-relaxed text-xs">{kfs.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 5: Official Territory Map Graphic */}
        {kfs.territoryMapUrl && (
          <Card className="border-slate-200 shadow-md bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-4 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-[#095c7b] flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                5. Territory Map & Geographic Service Boundaries
              </CardTitle>
              <Badge className="bg-[#095c7b] text-white text-[10px] font-bold">
                Official Territory Boundary
              </Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner p-2">
                <img
                  src={kfs.territoryMapUrl}
                  alt={`Territory Map for ${territory}`}
                  className="w-full h-auto max-h-[600px] object-contain mx-auto rounded-lg"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <p className="text-xs text-slate-500 italic">
                  Official territory map boundary graphic for <strong>{territory}</strong>.
                </p>
                <a
                  href={kfs.territoryMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#095c7b] hover:underline flex items-center gap-1 shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View High-Res Map
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Standard Brand Footer */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500 space-y-2">
          <p className="font-bold text-slate-700">MailPlus Australia | Business logistics, made simple.</p>
          <p className="text-[11px] text-slate-400">&copy; 2026 MailPlus. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
