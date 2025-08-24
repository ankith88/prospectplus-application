
"use client"

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getLeadsTool } from '@/ai/flows/get-leads-tool';
import type { Lead, Activity, LeadStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Phone, Users, UserCheck, UserX } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

export default function ReportsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    async function getMyLeads() {
      if (!user && !authLoading) {
        router.push('/signin');
        return;
      }
      if (authLoading || !user) return;

      try {
        setLoading(true);
        const allLeads = await getLeadsTool({});
        const myLeads = allLeads.filter(lead => lead.dialerAssigned === user.displayName);
        
        // Fetch full activity data for each lead
        const leadsWithActivity = await Promise.all(
            myLeads.map(async lead => {
                const fullLead = await getLeadsTool({ leadId: lead.id, summary: false });
                return fullLead[0];
            })
        );

        setLeads(leadsWithActivity);

      } catch (error) {
        console.error("Failed to fetch leads:", error);
      } finally {
        setLoading(false);
      }
    }
    getMyLeads();
  }, [user, authLoading, router]);

  const stats = useMemo(() => {
    if (!leads || leads.length === 0) {
      return {
        totalCalls: 0,
        leadsContacted: 0,
        leadsInQueue: 0,
        leadsByStatus: [],
      };
    }

    const totalCalls = leads.reduce((acc, lead) => {
      const callActivities = lead.activity?.filter(a => a.type === 'Call') || [];
      return acc + callActivities.length;
    }, 0);

    const leadsContacted = leads.filter(lead => lead.status !== 'New').length;
    const leadsInQueue = leads.filter(lead => lead.status === 'New').length;

    const leadsByStatus = leads.reduce((acc, lead) => {
      const status = lead.status;
      const existingEntry = acc.find(item => item.name === status);
      if (existingEntry) {
        existingEntry.value += 1;
      } else {
        acc.push({ name: status, value: 1 });
      }
      return acc;
    }, [] as { name: LeadStatus; value: number }[]);

    return {
      totalCalls,
      leadsContacted,
      leadsInQueue,
      leadsByStatus,
    };
  }, [leads]);

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">My Reports</h1>
        <p className="text-muted-foreground">Your personal lead performance dashboard.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls Made</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Contacted</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leadsContacted}</div>
            <p className="text-xs text-muted-foreground">out of {leads.length} total assigned leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads in Queue</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leadsInQueue}</div>
            <p className="text-xs text-muted-foreground">Leads with 'New' status</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads by Status</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.leadsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={stats.leadsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.leadsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              No lead status data to display.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
