"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  UserCheck, 
  UserX, 
  DollarSign, 
  Package, 
  Wrench, 
  Layers, 
  Search, 
  Download, 
  RefreshCw, 
  Calendar, 
  Building2, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend, 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  Cell
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { safeFormatDate } from '@/lib/utils';
import type { Invoice, Lead, ScfRecord } from '@/lib/types';
import { InvoiceDetailsDialog } from '@/components/invoice-details-dialog';

// Custom theme colors
const THEME = {
  primary: '#095c7b',     // Professional Navy Blue
  primaryLight: '#1d82a6',
  accent: '#eaf143',      // Accent Yellow
  success: '#10b981',     // Emerald
  danger: '#ef4444',      // Red
  warning: '#f59e0b',     // Amber
  purple: '#8b5cf6',
  slate: '#64748b',
  lightBg: '#f8fafc',
};

interface ExtendedInvoice extends Invoice {
  parentId?: string;
  franchiseeName?: string;
  companyName?: string;
}

interface FranchiseeMonthlyMetric {
  franchiseeName: string;
  franchiseeId?: string;
  month: string; // YYYY-MM
  servicesRevenue: number;
  productsRevenue: number;
  bothRevenue: number; // Invoices with both or total combined
  totalRevenue: number;
  signedCount: number;
  signedCustomers: { id: string; name: string; date: string; services?: string }[];
  lostCount: number;
  lostCustomers: { id: string; name: string; date: string; reason?: string }[];
}

interface FranchiseeSummary {
  franchiseeName: string;
  activeCount: number;
  signedCount: number;
  lostCount: number;
  netGrowth: number;
  servicesRevenue: number;
  productsRevenue: number;
  bothRevenue: number;
  totalRevenue: number;
  monthlyTrend: { month: string; revenue: number; services: number; products: number; signed: number; lost: number }[];
  signedCustomersList: { id: string; name: string; date: string }[];
  lostCustomersList: { id: string; name: string; date: string; reason?: string }[];
}

// Keyword categorization helper for Services vs Products
function classifyInvoiceItem(serviceName: string, invoiceType?: string): 'service' | 'product' {
  const text = (serviceName || '').toLowerCase() + ' ' + (invoiceType || '').toLowerCase();
  
  const productKeywords = [
    'satchel', 'box', 'envelope', 'packaging', 'product', 'supply', 'label', 'bag', 
    'carton', 'tape', 'mailbag', 'flyer', 'satchel express', 'prepaid', 'mp express satchel', 
    'startrack satchel', 'stationery', 'mailer', 'bubble', 'roll', 'hardware', 'scanner'
  ];

  for (const kw of productKeywords) {
    if (text.includes(kw)) return 'product';
  }
  
  return 'service';
}

function parseYearMonth(dateStr?: string): string | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  
  // DD/MM/YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const month = parts[1].padStart(2, '0');
      return `${year}-${month}`;
    }
  }
  
  // ISO YYYY-MM-DD
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length >= 2) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      if (year.length === 4) return `${year}-${month}`;
    }
  }
  
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  
  return null;
}

export default function FranchiseeInvoicingClient() {
  const [loading, setLoading] = useState<boolean>(true);
  const [invoices, setInvoices] = useState<ExtendedInvoice[]>([]);
  const [companies, setCompanies] = useState<Lead[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [scfs, setScfs] = useState<ScfRecord[]>([]);

  // Filter state
  const [timeframe, setTimeframe] = useState<'3m' | '6m' | '12m' | 'ytd' | 'all'>('6m');
  const [selectedFranchisee, setSelectedFranchisee] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'dynamics' | 'invoices'>('overview');

  // Selected Invoice Dialog
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState<boolean>(false);
  const [selectedInvoiceCompName, setSelectedInvoiceCompName] = useState<string>('');

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Invoices
      const invoicesSnap = await getDocs(collectionGroup(firestore, 'invoices')).catch(err => {
        console.warn("Failed to fetch collectionGroup invoices:", err);
        return { docs: [] };
      });
      
      // 2. Fetch Companies
      const companiesSnap = await getDocs(collection(firestore, 'companies')).catch(err => {
        console.warn("Failed to fetch companies:", err);
        return { docs: [] };
      });

      // 3. Fetch Leads
      const leadsSnap = await getDocs(collection(firestore, 'leads')).catch(err => {
        console.warn("Failed to fetch leads:", err);
        return { docs: [] };
      });

      // 4. Fetch SCFs (for signup history)
      const scfsSnap = await getDocs(collectionGroup(firestore, 'scfs')).catch(err => {
        console.warn("Failed to fetch scfs:", err);
        return { docs: [] };
      });

      const companiesList: Lead[] = companiesSnap.docs.map(doc => ({ id: doc.id, isCompany: true, ...doc.data() } as unknown as Lead));
      const leadsList: Lead[] = leadsSnap.docs.map(doc => ({ id: doc.id, isCompany: false, ...doc.data() } as unknown as Lead));
      const scfList: ScfRecord[] = scfsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as ScfRecord));

      // Build mapping ID -> Lead/Company
      const accountMap = new Map<string, Lead>();
      [...companiesList, ...leadsList].forEach(acc => {
        if (acc.id) accountMap.set(acc.id, acc);
      });

      // Map Invoices with parent account & franchisee information
      const invoiceList: ExtendedInvoice[] = invoicesSnap.docs.map(doc => {
        const data = doc.data();
        const parentId = doc.ref.parent?.parent?.id || (data as any).leadId || (data as any).companyId;
        const parentAcc = parentId ? accountMap.get(parentId) : undefined;
        
        const rawFranchisee = data.franchisee || data.franchiseeName || parentAcc?.franchisee || 'Unassigned Franchisee';
        const companyName = data.companyName || parentAcc?.companyName || (parentAcc as any)?.name || 'Customer Account';

        return {
          id: doc.id,
          parentId,
          companyName,
          franchiseeName: String(rawFranchisee).trim(),
          ...data
        } as ExtendedInvoice;
      });

      setInvoices(invoiceList);
      setCompanies(companiesList);
      setLeads(leadsList);
      setScfs(scfList);

    } catch (error) {
      console.error("Error loading franchisee invoicing data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get distinct list of Franchisee Names
  const franchiseeOptions = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach(inv => {
      if (inv.franchiseeName && inv.franchiseeName !== 'Unassigned Franchisee') {
        set.add(inv.franchiseeName);
      }
    });
    [...companies, ...leads].forEach(acc => {
      if (acc.franchisee) {
        set.add(acc.franchisee.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [invoices, companies, leads]);

  // Date range cutoff calculation
  const monthsRange = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    let count = 6;
    if (timeframe === '3m') count = 3;
    if (timeframe === '6m') count = 6;
    if (timeframe === '12m') count = 12;
    if (timeframe === 'ytd') count = currentMonth;
    if (timeframe === 'all') count = 24;

    const list: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      list.push(`${y}-${m}`);
    }
    return list;
  }, [timeframe]);

  // Process and Aggregate Monthly Data per Franchisee
  const processedData = useMemo(() => {
    const allAccounts = [...companies, ...leads];
    
    // Map account ID -> franchisee
    const accountFranchiseeMap = new Map<string, string>();
    allAccounts.forEach(acc => {
      if (acc.id && acc.franchisee) {
        accountFranchiseeMap.set(acc.id, acc.franchisee.trim());
      }
    });

    // 1. Identify Signed Customers & Lost Customers per month per franchisee
    const signedByFranMonth = new Map<string, { id: string; name: string; date: string }[]>();
    const lostByFranMonth = new Map<string, { id: string; name: string; date: string; reason?: string }[]>();

    allAccounts.forEach(acc => {
      const fran = acc.franchisee ? acc.franchisee.trim() : 'Unassigned Franchisee';
      const name = acc.companyName || (acc as any).name || 'Unknown Account';
      const accId = acc.id || '';
      const accStatus = String(acc.status || '');
      const custStatus = String((acc as any).customerStatus || '');

      // Check Signed
      const isSigned = accStatus === 'Signed' || accStatus === 'Signed Customer' || custStatus === 'Signed Customer' || !!(acc as any).signedAt || !!(acc as any).signedUpAt;
      if (isSigned) {
        const signedDateStr = (acc as any).signedAt || (acc as any).signedUpAt || (acc as any).startDate || (acc as any).createdAt;
        const ym = parseYearMonth(signedDateStr);
        if (ym) {
          const key = `${fran}___${ym}`;
          const list = signedByFranMonth.get(key) || [];
          list.push({ id: accId, name, date: signedDateStr ? safeFormatDate(signedDateStr, 'yyyy-MM-dd') : ym });
          signedByFranMonth.set(key, list);
        }
      }

      // Check Lost / Cancelled
      const isLost = accStatus === 'Lost Customer' || accStatus === 'Cancelled' || custStatus === 'Lost Customer' || !!(acc as any).cancellationdate || !!(acc as any).cancellationDate;
      if (isLost) {
        const lostDateStr = (acc as any).cancellationdate || (acc as any).cancellationDate || (acc as any).cancelledAt || (acc as any).updatedAt;
        const ym = parseYearMonth(lostDateStr);
        if (ym) {
          const key = `${fran}___${ym}`;
          const list = lostByFranMonth.get(key) || [];
          const reason = (acc as any).cancellationReason || (acc as any).cancellationWhy || 'Customer Churned / Cancelled';
          list.push({ id: accId, name, date: lostDateStr ? safeFormatDate(lostDateStr, 'yyyy-MM-dd') : ym, reason });
          lostByFranMonth.set(key, list);
        }
      }
    });

    // Also include SCF signups
    scfs.forEach(scf => {
      if (scf.status === 'Signed' || scf.status === 'Accepted') {
        const signedDate = scf.acceptedAt || scf.signedAt || scf.createdAt;
        const ym = parseYearMonth(signedDate);
        if (ym && scf.leadId) {
          const fran = accountFranchiseeMap.get(scf.leadId) || 'Unassigned Franchisee';
          const key = `${fran}___${ym}`;
          const list = signedByFranMonth.get(key) || [];
          if (!list.some(item => item.id === scf.leadId)) {
            list.push({ id: scf.leadId, name: `Signed Customer (SCF #${scf.id.slice(0, 6)})`, date: signedDate ? safeFormatDate(signedDate, 'yyyy-MM-dd') : ym });
            signedByFranMonth.set(key, list);
          }
        }
      }
    });

    // 2. Invoice Revenue Breakdown per Franchisee per Month
    // Key: `${fran}___${ym}`
    const invoiceMetricsMap = new Map<string, { services: number; products: number; both: number; total: number }>();

    invoices.forEach(inv => {
      const invDate = inv.invoiceDate || (inv as any).createdAt;
      const ym = parseYearMonth(invDate);
      if (!ym) return;

      const fran = inv.franchiseeName || (inv.parentId ? accountFranchiseeMap.get(inv.parentId) : null) || 'Unassigned Franchisee';
      const key = `${fran}___${ym}`;

      const totalVal = typeof inv.invoiceTotal === 'number' 
        ? inv.invoiceTotal 
        : (parseFloat(String(inv.invoiceTotal).replace(/[^0-9.]/g, '')) || 0);

      let serviceAmt = 0;
      let productAmt = 0;

      if (inv.items && inv.items.length > 0) {
        inv.items.forEach(item => {
          const itemTotal = Number(item.totalAmount || (Number(item.rate || 0) * Number(item.qty || 1)));
          const cat = classifyInvoiceItem(item.service, inv.invoiceType);
          if (cat === 'service') serviceAmt += itemTotal;
          else productAmt += itemTotal;
        });
      } else {
        const cat = classifyInvoiceItem('', inv.invoiceType);
        if (cat === 'service') serviceAmt = totalVal;
        else productAmt = totalVal;
      }

      const existing = invoiceMetricsMap.get(key) || { services: 0, products: 0, both: 0, total: 0 };
      existing.services += serviceAmt;
      existing.products += productAmt;
      existing.total += totalVal;

      // If invoice features both or non-zero in both
      if (serviceAmt > 0 && productAmt > 0) {
        existing.both += totalVal;
      } else {
        existing.both += (serviceAmt + productAmt);
      }

      invoiceMetricsMap.set(key, existing);
    });

    // 3. Assemble Franchisee Summaries
    const summaryMap = new Map<string, FranchiseeSummary>();

    // Collect all franchisee names
    const allFranchiseeNames = new Set<string>([
      ...franchiseeOptions,
      ...Array.from(signedByFranMonth.keys()).map(k => k.split('___')[0]),
      ...Array.from(lostByFranMonth.keys()).map(k => k.split('___')[0]),
      ...Array.from(invoiceMetricsMap.keys()).map(k => k.split('___')[0]),
    ]);

    allFranchiseeNames.forEach(fran => {
      if (!fran || fran === 'undefined') return;

      // Filter accounts belonging to this franchisee
      const franAccounts = allAccounts.filter(acc => acc.franchisee && acc.franchisee.trim() === fran);
      const activeCount = franAccounts.filter(acc => String(acc.status) === 'Signed' || String(acc.status) === 'Signed Customer' || (acc as any).customerStatus === 'Signed Customer').length;

      let totalServices = 0;
      let totalProducts = 0;
      let totalBoth = 0;
      let totalRev = 0;
      let totalSigned = 0;
      let totalLost = 0;

      const monthlyTrend: FranchiseeSummary['monthlyTrend'] = [];
      const signedCustomersList: FranchiseeSummary['signedCustomersList'] = [];
      const lostCustomersList: FranchiseeSummary['lostCustomersList'] = [];

      monthsRange.forEach(ym => {
        const key = `${fran}___${ym}`;
        const invMetric = invoiceMetricsMap.get(key) || { services: 0, products: 0, both: 0, total: 0 };
        const signedList = signedByFranMonth.get(key) || [];
        const lostList = lostByFranMonth.get(key) || [];

        totalServices += invMetric.services;
        totalProducts += invMetric.products;
        totalBoth += invMetric.both;
        totalRev += invMetric.total;
        totalSigned += signedList.length;
        totalLost += lostList.length;

        signedList.forEach(s => signedCustomersList.push(s));
        lostList.forEach(l => lostCustomersList.push(l));

        monthlyTrend.push({
          month: ym,
          revenue: invMetric.total,
          services: invMetric.services,
          products: invMetric.products,
          signed: signedList.length,
          lost: lostList.length
        });
      });

      summaryMap.set(fran, {
        franchiseeName: fran,
        activeCount,
        signedCount: totalSigned,
        lostCount: totalLost,
        netGrowth: totalSigned - totalLost,
        servicesRevenue: totalServices,
        productsRevenue: totalProducts,
        bothRevenue: totalBoth,
        totalRevenue: totalRev,
        monthlyTrend,
        signedCustomersList,
        lostCustomersList
      });
    });

    return Array.from(summaryMap.values());
  }, [companies, leads, scfs, invoices, monthsRange, franchiseeOptions]);

  // Filtered Franchisees based on User Selections
  const filteredSummaries = useMemo(() => {
    let result = processedData;

    if (selectedFranchisee !== 'ALL') {
      result = result.filter(s => s.franchiseeName.toLowerCase() === selectedFranchisee.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.franchiseeName.toLowerCase().includes(q));
    }

    return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [processedData, selectedFranchisee, searchQuery]);

  // Overall KPI Metrics for top summary cards
  const overallKPIs = useMemo(() => {
    let totalRev = 0;
    let servicesRev = 0;
    let productsRev = 0;
    let totalSigned = 0;
    let totalLost = 0;

    filteredSummaries.forEach(s => {
      totalRev += s.totalRevenue;
      servicesRev += s.servicesRevenue;
      productsRev += s.productsRevenue;
      totalSigned += s.signedCount;
      totalLost += s.lostCount;
    });

    const netGrowth = totalSigned - totalLost;
    const servicesPercent = totalRev > 0 ? (servicesRev / totalRev) * 100 : 0;
    const productsPercent = totalRev > 0 ? (productsRev / totalRev) * 100 : 0;

    return {
      totalRev,
      servicesRev,
      productsRev,
      totalSigned,
      totalLost,
      netGrowth,
      servicesPercent,
      productsPercent
    };
  }, [filteredSummaries]);

  // Aggregate Monthly Trend Chart Data
  const monthlyTrendChartData = useMemo(() => {
    return monthsRange.map(ym => {
      let services = 0;
      let products = 0;
      let total = 0;
      let signed = 0;
      let lost = 0;

      filteredSummaries.forEach(s => {
        const m = s.monthlyTrend.find(item => item.month === ym);
        if (m) {
          services += m.services;
          products += m.products;
          total += m.revenue;
          signed += m.signed;
          lost += m.lost;
        }
      });

      // Format month label (e.g. 2026-05 -> May 2026)
      const dateParts = ym.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthLabel = monthNames[parseInt(dateParts[1], 10) - 1] + ' ' + dateParts[0].slice(2);

      return {
        month: monthLabel,
        rawMonth: ym,
        'Services Revenue': Math.round(services),
        'Products Revenue': Math.round(products),
        'Total Revenue (Both)': Math.round(total),
        'Signed Customers': signed,
        'Lost Customers': lost,
        'Net Customer Growth': signed - lost
      };
    });
  }, [monthsRange, filteredSummaries]);

  // Detailed Invoices Filtered
  const filteredInvoices = useMemo(() => {
    let list = invoices;

    if (selectedFranchisee !== 'ALL') {
      list = list.filter(inv => inv.franchiseeName?.toLowerCase() === selectedFranchisee.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(inv => 
        (inv.invoiceDocumentID || '').toLowerCase().includes(q) ||
        (inv.companyName || '').toLowerCase().includes(q) ||
        (inv.franchiseeName || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      const dA = new Date(a.invoiceDate || 0).getTime();
      const dB = new Date(b.invoiceDate || 0).getTime();
      return dB - dA;
    });
  }, [invoices, selectedFranchisee, searchQuery]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Franchisee Name',
      'Active Customers',
      'Signed Customers',
      'Lost Customers',
      'Net Customer Growth',
      'Services Revenue ($)',
      'Products Revenue ($)',
      'Total Invoiced Revenue ($)'
    ];

    const rows = filteredSummaries.map(s => [
      `"${s.franchiseeName}"`,
      s.activeCount,
      s.signedCount,
      s.lostCount,
      s.netGrowth,
      s.servicesRevenue.toFixed(2),
      s.productsRevenue.toFixed(2),
      s.totalRevenue.toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `franchisee_invoicing_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">Loading Franchisee Invoices & Reporting Data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-headline">
              Franchisee Monthly Invoicing & Customer Dynamics
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold px-2.5 py-0.5 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Superadmin Only
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Comprehensive invoice analysis tracking monthly revenue trends across <strong className="text-slate-800">Services</strong>, <strong className="text-slate-800">Products</strong>, and <strong className="text-slate-800">Both</strong> alongside customer acquisitions and churn per franchisee.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button variant="default" size="sm" onClick={handleExportCSV} className="gap-2 bg-[#095c7b] hover:bg-[#074760]">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Invoiced Revenue */}
        <Card className="bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Total Invoicing
              <DollarSign className="h-4 w-4 text-[#095c7b]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              ${overallKPIs.totalRev.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Layers className="h-3 w-3 text-slate-400" /> Services & Products combined
            </p>
          </CardContent>
        </Card>

        {/* Services Revenue */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Services Revenue
              <Wrench className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              ${overallKPIs.servicesRev.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {overallKPIs.servicesPercent.toFixed(1)}% of total invoicing
            </p>
          </CardContent>
        </Card>

        {/* Products Revenue */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Products Revenue
              <Package className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              ${overallKPIs.productsRev.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {overallKPIs.productsPercent.toFixed(1)}% of total invoicing
            </p>
          </CardContent>
        </Card>

        {/* Signed Customers */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Signed Customers
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              +{overallKPIs.totalSigned}
            </div>
            <p className="text-xs text-emerald-700 mt-1 font-medium flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Customer acquisitions
            </p>
          </CardContent>
        </Card>

        {/* Lost Customers */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Lost Customers
              <UserX className="h-4 w-4 text-rose-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              -{overallKPIs.totalLost}
            </div>
            <p className="text-xs text-rose-700 mt-1 font-medium flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5" /> Customer churn
            </p>
          </CardContent>
        </Card>

        {/* Net Customer Growth */}
        <Card className={`border shadow-sm ${overallKPIs.netGrowth >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              Net Growth
              <Users className="h-4 w-4 text-slate-700" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-extrabold ${overallKPIs.netGrowth >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {overallKPIs.netGrowth >= 0 ? `+${overallKPIs.netGrowth}` : overallKPIs.netGrowth}
            </div>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Signed vs Lost Delta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Franchisee Select */}
          <div className="w-full sm:w-64">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Filter Franchisee</label>
            <Select value={selectedFranchisee} onValueChange={setSelectedFranchisee}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Franchisees" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="ALL">All Franchisees ({franchiseeOptions.length})</SelectItem>
                {franchiseeOptions.map(fran => (
                  <SelectItem key={fran} value={fran}>{fran}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timeframe Select */}
          <div className="w-full sm:w-44">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Time Range</label>
            <Select value={timeframe} onValueChange={(val: any) => setTimeframe(val)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="12m">Last 12 Months</SelectItem>
                <SelectItem value="ytd">Year to Date (YTD)</SelectItem>
                <SelectItem value="all">All Available</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="w-full sm:w-72">
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search franchisee or customer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Main Tabs Section */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-xl grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="overview" className="gap-2 font-semibold text-xs sm:text-sm">
            <Building2 className="h-4 w-4" /> Franchisee Overview Table
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2 font-semibold text-xs sm:text-sm">
            <BarChart2 className="h-4 w-4" /> Monthly Invoicing Trends
          </TabsTrigger>
          <TabsTrigger value="dynamics" className="gap-2 font-semibold text-xs sm:text-sm">
            <Users className="h-4 w-4" /> Customer Dynamics (Signed/Lost)
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2 font-semibold text-xs sm:text-sm">
            <FileText className="h-4 w-4" /> Invoices Explorer ({filteredInvoices.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Franchisee Overview Table */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-200 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Franchisee Invoicing & Customer Performance Summary
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Showing revenue breakdown by Services, Products, and Both alongside Customer Signups and Losses.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-semibold">
                  {filteredSummaries.length} Franchisees Listed
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100/70">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-700">Franchisee Name</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-center">Active</TableHead>
                      <TableHead className="font-bold text-xs text-emerald-700 text-center">Signed (+)</TableHead>
                      <TableHead className="font-bold text-xs text-rose-700 text-center">Lost (-)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-center">Net Growth</TableHead>
                      <TableHead className="font-bold text-xs text-blue-700 text-right">Services ($)</TableHead>
                      <TableHead className="font-bold text-xs text-amber-700 text-right">Products ($)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-900 text-right">Total Invoicing ($)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-center">Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummaries.length > 0 ? (
                      filteredSummaries.map((summary) => {
                        const isHighLost = summary.lostCount > summary.signedCount && summary.lostCount > 0;
                        const isGrowing = summary.netGrowth > 0;
                        
                        return (
                          <TableRow key={summary.franchiseeName} className="hover:bg-slate-50 text-xs transition-colors">
                            <TableCell className="font-semibold text-slate-900 flex items-center gap-2 py-3">
                              <Building2 className="h-4 w-4 text-[#095c7b] shrink-0" />
                              <span>{summary.franchiseeName}</span>
                            </TableCell>
                            <TableCell className="text-center font-medium text-slate-700">
                              {summary.activeCount}
                            </TableCell>
                            <TableCell className="text-center font-bold text-emerald-600 bg-emerald-50/40">
                              +{summary.signedCount}
                            </TableCell>
                            <TableCell className="text-center font-bold text-rose-600 bg-rose-50/40">
                              -{summary.lostCount}
                            </TableCell>
                            <TableCell className="text-center font-extrabold">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${summary.netGrowth > 0 ? 'bg-emerald-100 text-emerald-800' : summary.netGrowth < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                                {summary.netGrowth > 0 ? `+${summary.netGrowth}` : summary.netGrowth}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium text-blue-700">
                              ${summary.servicesRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-medium text-amber-700">
                              ${summary.productsRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900">
                              ${summary.totalRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center">
                              {isHighLost ? (
                                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-medium text-[11px] gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Losing Customers
                                </Badge>
                              ) : isGrowing ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-medium text-[11px] gap-1">
                                  <TrendingUp className="h-3 w-3" /> Growing
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-300 font-medium text-[11px]">
                                  Stable
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-slate-500 text-sm">
                          No franchisee data matched your filter parameters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Monthly Invoicing Trends & Visual Charts */}
        <TabsContent value="trends" className="space-y-6">
          {/* Revenue Breakdown Area Chart (Services vs Products vs Both) */}
          <Card className="bg-white border border-slate-200 shadow-sm p-4">
            <CardHeader className="px-2 pt-2 pb-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-[#095c7b]" />
                Monthly Revenue Trend: Services vs Products vs Both
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Monthly breakdown of invoiced revenue across Services, Products, and Combined Total.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorServices" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorProducts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#095c7b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#095c7b" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `$${val}`} tickLine={false} />
                    <RechartsTooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']} />
                    <Legend />
                    <Area type="monotone" dataKey="Services Revenue" stroke="#2563eb" fillOpacity={1} fill="url(#colorServices)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Products Revenue" stroke="#d97706" fillOpacity={1} fill="url(#colorProducts)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Total Revenue (Both)" stroke="#095c7b" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Customer Dynamics Bar Chart */}
          <Card className="bg-white border border-slate-200 shadow-sm p-4">
            <CardHeader className="px-2 pt-2 pb-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                Monthly Customer Dynamics: Signed vs Lost Customers
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Tracking new account signups against customer cancellations per month.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="Signed Customers" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Lost Customers" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Customer Dynamics (Signups & Losses Details) */}
        <TabsContent value="dynamics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Franchisees Signing Up Customers */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 py-4">
                <CardTitle className="text-base font-bold text-emerald-900 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                  Franchisees Signing Up Customers
                </CardTitle>
                <CardDescription className="text-xs text-emerald-700">
                  Franchisees actively onboarding new accounts in the selected timeframe.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {filteredSummaries.filter(s => s.signedCount > 0).length > 0 ? (
                  filteredSummaries
                    .filter(s => s.signedCount > 0)
                    .sort((a, b) => b.signedCount - a.signedCount)
                    .map(summary => (
                      <div key={summary.franchiseeName} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-[#095c7b]" />
                            {summary.franchiseeName}
                          </span>
                          <Badge className="bg-emerald-600 text-white font-bold">
                            +{summary.signedCount} Signed
                          </Badge>
                        </div>
                        <div className="space-y-1 pt-1 border-t border-slate-200/60">
                          {summary.signedCustomersList.slice(0, 5).map((cust, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-slate-700 py-0.5">
                              <span className="truncate max-w-[240px]" title={cust.name}>• {cust.name}</span>
                              <span className="text-slate-400 font-mono text-[11px]">{cust.date}</span>
                            </div>
                          ))}
                          {summary.signedCustomersList.length > 5 && (
                            <p className="text-[11px] text-slate-500 italic pt-1">
                              + {summary.signedCustomersList.length - 5} more signed customer(s)
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-6">No signed customers recorded in this timeframe.</p>
                )}
              </CardContent>
            </Card>

            {/* Franchisees Losing Customers */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader className="bg-rose-50/50 border-b border-rose-100 py-4">
                <CardTitle className="text-base font-bold text-rose-900 flex items-center gap-2">
                  <UserX className="h-5 w-5 text-rose-600" />
                  Franchisees Losing Customers
                </CardTitle>
                <CardDescription className="text-xs text-rose-700">
                  Franchisees experiencing customer cancellations and account churn.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {filteredSummaries.filter(s => s.lostCount > 0).length > 0 ? (
                  filteredSummaries
                    .filter(s => s.lostCount > 0)
                    .sort((a, b) => b.lostCount - a.lostCount)
                    .map(summary => (
                      <div key={summary.franchiseeName} className="border border-rose-200/60 rounded-xl p-3 bg-rose-50/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-rose-600" />
                            {summary.franchiseeName}
                          </span>
                          <Badge className="bg-rose-600 text-white font-bold">
                            -{summary.lostCount} Lost
                          </Badge>
                        </div>
                        <div className="space-y-1.5 pt-1 border-t border-rose-200/50">
                          {summary.lostCustomersList.slice(0, 5).map((cust, idx) => (
                            <div key={idx} className="flex flex-col text-xs text-slate-700 py-1 border-b border-slate-100 last:border-none">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="truncate max-w-[240px]" title={cust.name}>• {cust.name}</span>
                                <span className="text-slate-400 font-mono text-[11px]">{cust.date}</span>
                              </div>
                              {cust.reason && (
                                <span className="text-[11px] text-rose-600 pl-3 italic">Reason: {cust.reason}</span>
                              )}
                            </div>
                          ))}
                          {summary.lostCustomersList.length > 5 && (
                            <p className="text-[11px] text-slate-500 italic pt-1">
                              + {summary.lostCustomersList.length - 5} more churned customer(s)
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-6">No lost/cancelled customers recorded in this timeframe.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Invoices Explorer */}
        <TabsContent value="invoices" className="space-y-4">
          <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-200 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Individual Invoices Explorer
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Search and inspect itemized breakdown for each invoice across franchisees.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-semibold">
                  {filteredInvoices.length} Invoices Found
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100/70">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-700">Invoice #</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Customer Account</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Franchisee</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-center">Date</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-center">Classification</TableHead>
                      <TableHead className="font-bold text-xs text-slate-900 text-right">Total Amount ($)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.slice(0, 50).map((inv, index) => {
                      const docId = inv.invoiceDocumentID || inv.documentId || inv.id || `INV-${index}`;
                      const totalVal = typeof inv.invoiceTotal === 'number' 
                        ? inv.invoiceTotal 
                        : (parseFloat(String(inv.invoiceTotal).replace(/[^0-9.]/g, '')) || 0);

                      let hasServices = false;
                      let hasProducts = false;
                      if (inv.items && inv.items.length > 0) {
                        inv.items.forEach(item => {
                          const cat = classifyInvoiceItem(item.service, inv.invoiceType);
                          if (cat === 'service') hasServices = true;
                          else hasProducts = true;
                        });
                      } else {
                        const cat = classifyInvoiceItem('', inv.invoiceType);
                        if (cat === 'service') hasServices = true;
                        else hasProducts = true;
                      }

                      return (
                        <TableRow key={inv.id || index} className="hover:bg-slate-50 text-xs">
                          <TableCell className="font-mono font-semibold text-slate-900">
                            #{docId}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">
                            {inv.companyName || 'Customer Account'}
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium">
                            {inv.franchiseeName}
                          </TableCell>
                          <TableCell className="text-center text-slate-500">
                            {inv.invoiceDate ? safeFormatDate(inv.invoiceDate, 'yyyy-MM-dd') : 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            {hasServices && hasProducts ? (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                                Both (Services + Products)
                              </Badge>
                            ) : hasServices ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                                Service Invoice
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                                Product Invoice
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900">
                            ${totalVal.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setSelectedInvoiceCompName(inv.companyName || '');
                                setIsInvoiceDialogOpen(true);
                              }}
                              className="h-7 text-xs text-[#095c7b] hover:bg-slate-100"
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {filteredInvoices.length > 50 && (
                <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 border-t">
                  Showing first 50 invoices of {filteredInvoices.length}. Use Search to narrow down specific records.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Details Dialog Modal */}
      <InvoiceDetailsDialog
        isOpen={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        invoice={selectedInvoice}
        companyName={selectedInvoiceCompName}
      />
    </div>
  );
}
