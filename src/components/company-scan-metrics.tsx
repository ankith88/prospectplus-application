'use client'

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader } from '@/components/ui/loader';
import { Activity } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CompanyScanMetricsProps {
  companyId: string;
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function CompanyScanMetrics({ companyId }: CompanyScanMetricsProps) {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/companies/${companyId}/packages`);
        const data = await res.json();
        if (data.packages) {
          setPackages(data.packages);
        }
      } catch (error) {
        console.error("Failed to fetch scan metrics", error);
      } finally {
        setLoading(false);
      }
    };
    if (companyId) {
      fetchPackages();
    }
  }, [companyId]);

  const metrics = useMemo(() => {
    if (!packages || packages.length === 0) {
      return { totalBarcodes: 0, timelineData: [], productTypeData: [], speedData: [] };
    }

    let totalBarcodes = packages.length;
    const timelineCount: Record<string, number> = {};
    const productTypeCount: Record<string, number> = {};
    const speedCount: Record<string, number> = {};

    packages.forEach(pkg => {
      let mainDate = pkg.sync_date;
      if (!mainDate && pkg.scans && pkg.scans.length > 0) {
        mainDate = pkg.scans[0].updated_at;
      }
      
      if (mainDate) {
        const d = new Date(mainDate);
        if (!isNaN(d.getTime())) {
          let key = '';
          if (timeframe === 'weekly') {
            const getWeek = (date: Date) => {
              const start = new Date(date.getFullYear(), 0, 1);
              const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
              return Math.ceil((date.getDay() + 1 + days) / 7);
            };
            key = `${d.getFullYear()}-W${getWeek(d).toString().padStart(2, '0')}`;
          } else {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          }
          timelineCount[key] = (timelineCount[key] || 0) + 1;
        }
      }

      // Products & Speeds from scans
      const seenProd = new Set<string>();
      const seenSpeed = new Set<string>();
      pkg.scans?.forEach((s: any) => {
        if (s.product_type && s.product_type !== 'Unknown' && !seenProd.has(s.product_type)) {
          seenProd.add(s.product_type);
          productTypeCount[s.product_type] = (productTypeCount[s.product_type] || 0) + 1;
        }
        if (s.delivery_speed && s.delivery_speed !== 'Unknown' && !seenSpeed.has(s.delivery_speed)) {
          seenSpeed.add(s.delivery_speed);
          speedCount[s.delivery_speed] = (speedCount[s.delivery_speed] || 0) + 1;
        }
      });
    });

    const toChartData = (obj: Record<string, number>) => Object.entries(obj).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    return {
      totalBarcodes,
      timelineData: Object.entries(timelineCount)
        .map(([date, scans]) => ({ date, scans }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-12), // show last 12 periods
      productTypeData: toChartData(productTypeCount),
      speedData: toChartData(speedCount)
    };
  }, [packages, timeframe]);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-muted-foreground" />Scan Activity</CardTitle></CardHeader>
        <CardContent className="flex justify-center py-10"><Loader /></CardContent>
      </Card>
    );
  }

  if (packages.length === 0) {
    return null; // hide if no activity
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-muted-foreground" />Scan Activity</CardTitle>
          <CardDescription>Total Barcodes Processed: {metrics.totalBarcodes.toLocaleString()}</CardDescription>
        </div>
        <Select value={timeframe} onValueChange={(v: 'weekly'|'monthly') => setTimeframe(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly View</SelectItem>
            <SelectItem value="monthly">Monthly View</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-700">Volume over time</h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.timelineData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="scans" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-700 text-center">Product Types</h4>
              <div className="h-[200px]">
                {metrics.productTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={metrics.productTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                        {metrics.productTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No data</div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-700 text-center">Delivery Speeds</h4>
              <div className="h-[200px]">
                {metrics.speedData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={metrics.speedData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                        {metrics.speedData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index+4) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                   <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No data</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
