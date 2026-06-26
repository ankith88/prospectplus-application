"use client";

import React, { useState } from 'react';
import { 
  RefreshCw, 
  ArrowUpRight, 
  AlertTriangle, 
  Sliders, 
  Layout, 
  ExternalLink,
  DollarSign,
  TrendingUp,
  Percent
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

// Custom theme colors matching ProspectPlus
const THEME_COLORS = {
  primary: '#095C7B',     // Professional blue
  secondary: '#A8763A',   // Gold
  ink: '#1A3D33',         // Dark ink green
  inkSoft: '#2A4E43',     // Softer ink green
  yellow: '#EAF044',      // Accent yellow
  lightTeal: '#1d82a6',   // Lighter blue/teal
  danger: '#D32F2F',      // Red
  creamWarm: '#F0EDE4',   // Warm cream background
  offwhite: '#FFFDF6',    // Body background
  paper: '#FFFFFF'        // White cards
};

// Mock data for YTD trend mini-chart
const ytdTrendData = [
  { value: 10 },
  { value: 15 },
  { value: 12 },
  { value: 20 },
  { value: 18 },
  { value: 25 },
  { value: 28 },
];

// Mock data for MP Products Dashboard - Monthly Overview
const monthlyOverviewData = [
  { name: 'Jan', Revenue: 12000, Expenses: 8000, Distributions: 3000 },
  { name: 'Feb', Revenue: 14500, Expenses: 9000, Distributions: 4000 },
  { name: 'Mar', Revenue: 13000, Expenses: 8500, Distributions: 3500 },
  { name: 'Apr', Revenue: 17000, Expenses: 10500, Distributions: 4500 },
  { name: 'May', Revenue: 16000, Expenses: 9500, Distributions: 4000 },
  { name: 'Jun', Revenue: 19000, Expenses: 11000, Distributions: 5000 },
];

// Mock data for Customer List
const customerListData = [
  { id: 1, name: 'Main Street Logistics', raised: '$4,500.00', paid: '$4,500.00', outstanding: '$0.00' },
  { id: 2, name: 'Apex Shipping Solutions', raised: '$3,200.00', paid: '$3,200.00', outstanding: '$0.00' },
  { id: 3, name: 'Swift Delivery Co.', raised: '$2,800.00', paid: '$2,800.00', outstanding: '$0.00' },
  { id: 4, name: 'Global Freight Services', raised: '$1,979.00', paid: '$1,804.72', outstanding: '$174.28' },
  { id: 5, name: 'Prime Courier Inc.', raised: '$1,500.00', paid: '$1,500.00', outstanding: '$0.00' },
];

// Mock data for Source
const sourceData = [
  { name: 'Direct Billing', value: 65, color: THEME_COLORS.primary },
  { name: 'API Sync (NetSuite)', value: 25, color: THEME_COLORS.secondary },
  { name: 'Manual Input', value: 10, color: THEME_COLORS.inkSoft }
];

// Mock data for Product Weights
const productWeightsData = [
  { name: 'Standard Delivery', Weight: 850 },
  { name: 'Express Freight', Weight: 600 },
  { name: 'Same-day Courier', Weight: 420 },
  { name: 'International Shipping', Weight: 310 },
  { name: 'Custom Logistics', Weight: 150 }
];

export default function FinancialDashboardClient() {
  const [lastUpdated, setLastUpdated] = useState<string>('21/5/2026 at 9:29:10 am');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('monthly');

  // Interactive simulated refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      const formatTime = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const formatDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      setLastUpdated(`${formatDate} at ${formatTime.toLowerCase()}`);
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div className="flex flex-col gap-6 p-1 md:p-4">
      {/* Top Header & Settings bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Financial Dashboard</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>Last updated {lastUpdated}</span>
            <button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className="flex items-center gap-1 text-primary hover:underline font-medium focus:outline-none"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1.5 border-border bg-white text-foreground">
                <Sliders className="h-4 w-4" />
                <span>Personalize</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Dashboard Customization</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Adjust Currency</DropdownMenuItem>
              <DropdownMenuItem>Toggle Overdue Alert Limit</DropdownMenuItem>
              <DropdownMenuItem>Edit Saved Ranges</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1.5 border-border bg-white text-foreground">
                <Layout className="h-4 w-4" />
                <span>Layout</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Grid Configuration</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Compact Mode</DropdownMenuItem>
              <DropdownMenuItem>Full Screen Charts</DropdownMenuItem>
              <DropdownMenuItem>Reset to Default</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Accessible Funds */}
        <div className="rounded-xl p-6 text-white shadow-sm flex flex-col justify-between h-[120px] bg-[#095C7B]">
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase opacity-85">Accessible Funds</div>
            <div className="text-3xl font-bold tracking-tight mt-1 font-sans">-$19.69</div>
          </div>
          <div className="text-xs opacity-75 mt-2">Current balance</div>
        </div>

        {/* Card 2: Inaccessible Funds */}
        <div className="rounded-xl p-6 text-white shadow-sm flex flex-col justify-between h-[120px] bg-[#1d82a6]">
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase opacity-85">Inaccessible Funds</div>
            <div className="text-3xl font-bold tracking-tight mt-1 font-sans">$0.00</div>
          </div>
          <div className="text-xs opacity-75 mt-2">Held in reserve</div>
        </div>

        {/* Card 3: Total Receivables */}
        <div className="rounded-xl p-6 bg-white border border-border text-foreground shadow-sm flex flex-col justify-between h-[120px]">
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">Total Receivables</div>
            <div className="text-3xl font-bold tracking-tight mt-1 text-primary font-sans">$174.28</div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">60+ days overdue</div>
        </div>

        {/* Card 4: Customer Payments */}
        <div className="rounded-xl p-6 bg-white border border-border text-foreground shadow-sm flex flex-col justify-between h-[120px]">
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">Customer Payments</div>
            <div className="text-3xl font-bold tracking-tight mt-1 text-primary font-sans">$1,979.00</div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">Running total</div>
        </div>
      </div>

      {/* Row 2: Grid Section with Invoice, Franchisee, and Customer Payments Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Summary */}
        <Card className="shadow-sm border border-border rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold text-primary font-headline">Invoice Summary</CardTitle>
            <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded flex items-center gap-1">
              This Period
            </span>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 text-right font-medium">This Mth</th>
                    <th className="pb-2 text-right font-medium">Last Mth</th>
                    <th className="pb-2 text-right font-medium">This Qtr</th>
                    <th className="pb-2 text-right font-medium">This Yr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-foreground">Raised</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-foreground">Paid</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-foreground">Purchases</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-foreground">Unpaid</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Franchisee Distributions */}
        <Card className="shadow-sm border border-border rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold text-primary font-headline">Franchisee Distributions</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col justify-between h-[calc(100%-60px)]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 text-right font-medium">This Mth</th>
                    <th className="pb-2 text-right font-medium">Last Mth</th>
                    <th className="pb-2 text-right font-medium">This Yr+</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-foreground">Distributions</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* YTD Trend Chart */}
            <div className="mt-4 pt-4 border-t border-border/40">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">YTD Trend</div>
              <div className="h-[60px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ytdTrendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorYTD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME_COLORS.primary} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={THEME_COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={THEME_COLORS.primary} 
                      strokeWidth={1.5} 
                      fillOpacity={1} 
                      fill="url(#colorYTD)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Payments Summary */}
        <Card className="shadow-sm border border-border rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold text-primary font-headline">Customer Payments Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                    <th className="pb-2 font-medium">Month</th>
                    <th className="pb-2 text-right font-medium">This Mth</th>
                    <th className="pb-2 text-right font-medium">Yr Mth</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-foreground">April</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-foreground">March</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-foreground">Other</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                    <td className="py-2.5 text-right text-muted-foreground">0.00</td>
                  </tr>
                  <tr className="font-bold border-t-2 border-border/85 bg-muted/20">
                    <td className="py-2.5 font-sans text-foreground">Total</td>
                    <td className="py-2.5 text-right">0.00</td>
                    <td className="py-2.5 text-right">0.00</td>
                    <td className="py-2.5 text-right text-primary">1,979.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Receivables Aging */}
      <Card className="shadow-sm border border-border rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
          <CardTitle className="text-base font-bold text-primary font-headline">Receivables Aging</CardTitle>
          <a href="#" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
            Full Report
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Box 1: Current */}
            <div className="bg-muted/30 border border-border/50 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Current</div>
                <div className="text-xl font-bold text-foreground mt-1 font-mono">$0.00</div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">0-14 days</div>
            </div>

            {/* Box 2: 15-45 Days */}
            <div className="bg-muted/30 border border-border/50 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">15–45 Days</div>
                <div className="text-xl font-bold text-foreground mt-1 font-mono">$0.00</div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">Moderate</div>
            </div>

            {/* Box 3: 45-60 Days */}
            <div className="bg-muted/30 border border-border/50 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">45–60 Days</div>
                <div className="text-xl font-bold text-foreground mt-1 font-mono">$0.00</div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">Overdue</div>
            </div>

            {/* Box 4: 60+ Days (Warning Alert Box) */}
            <div className="bg-red-50/50 border border-red-200 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold text-red-700 tracking-wider uppercase">60+ Days</div>
                <div className="text-xl font-bold text-red-600 mt-1 font-mono">$174.28</div>
              </div>
              <div className="text-[10px] text-red-500 mt-2 font-medium">Critical</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 4: MP Products Dashboard */}
      <Card className="shadow-sm border border-border rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-bold text-primary font-headline">MP Products Dashboard</CardTitle>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-[#095c7b] hover:bg-[#084b65] text-white hover:text-white border-none flex items-center gap-1">
            <span>Full Report</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 flex items-start gap-2.5 text-xs mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Please note, the data shown below is moving over a 3-month period.</span>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex border-b border-border/80 mb-4 overflow-x-auto gap-2">
            <button 
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 text-xs font-medium border-b-2 -mb-[2px] transition-colors whitespace-nowrap ${activeTab === 'monthly' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Monthly Overview
            </button>
            <button 
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 text-xs font-medium border-b-2 -mb-[2px] transition-colors whitespace-nowrap ${activeTab === 'customers' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Customer List
            </button>
            <button 
              onClick={() => setActiveTab('source')}
              className={`px-4 py-2 text-xs font-medium border-b-2 -mb-[2px] transition-colors whitespace-nowrap ${activeTab === 'source' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Source
            </button>
            <button 
              onClick={() => setActiveTab('weights')}
              className={`px-4 py-2 text-xs font-medium border-b-2 -mb-[2px] transition-colors whitespace-nowrap ${activeTab === 'weights' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Product Weights
            </button>
          </div>

          {/* Tab Content Rendering */}
          <div className="pt-2">
            {activeTab === 'monthly' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  Revenue, Expenses & Distributions — last 6 months
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyOverviewData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={THEME_COLORS.primary} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={THEME_COLORS.primary} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={THEME_COLORS.secondary} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={THEME_COLORS.secondary} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={THEME_COLORS.yellow} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={THEME_COLORS.yellow} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} stroke="#888888" tickLine={false} axisLine={false} />
                      <YAxis 
                        fontSize={11} 
                        stroke="#888888" 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `$${value / 1000}k`} 
                      />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                      <Area 
                        type="monotone" 
                        dataKey="Revenue" 
                        stroke={THEME_COLORS.primary} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Expenses" 
                        stroke={THEME_COLORS.secondary} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorExpenses)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Distributions" 
                        stroke="#b8be23" // slightly darker version of theme yellow for visibility on white
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorDist)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div className="overflow-x-auto pt-1">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                      <th className="pb-2 font-medium">Customer Name</th>
                      <th className="pb-2 text-right font-medium">Invoices Raised</th>
                      <th className="pb-2 text-right font-medium">Amount Paid</th>
                      <th className="pb-2 text-right font-medium">Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {customerListData.map((cust) => (
                      <tr key={cust.id} className="hover:bg-muted/10">
                        <td className="py-3 font-sans font-medium text-foreground">{cust.name}</td>
                        <td className="py-3 text-right">{cust.raised}</td>
                        <td className="py-3 text-right text-emerald-600">{cust.paid}</td>
                        <td className={`py-3 text-right font-bold ${cust.outstanding !== '$0.00' ? 'text-red-500' : 'text-muted-foreground'}`}>{cust.outstanding}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'source' && (
              <div className="flex flex-col md:flex-row items-center justify-around py-4">
                <div className="h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 mt-4 md:mt-0">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Billing Distribution channels</div>
                  {sourceData.map((channel, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-foreground">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: channel.color }} />
                      <span className="font-medium">{channel.name}:</span>
                      <span className="font-mono font-semibold">{channel.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'weights' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-foreground">Product Category Volumetric Weights (kg)</div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productWeightsData} margin={{ left: -10, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" fontSize={10} stroke="#888888" tickLine={false} />
                      <YAxis fontSize={10} stroke="#888888" tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="Weight" fill={THEME_COLORS.primary} radius={[4, 4, 0, 0]} name="Weight (kg)">
                        {productWeightsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? THEME_COLORS.primary : THEME_COLORS.secondary} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
