

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Activity, Appointment, UserProfile, SavedRoute } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import {
  Users,
  Star,
  Calendar,
  Phone,
  Trophy,
  Activity as ActivityIcon,
  LineChart,
  BarChart,
  Target,
  ArrowRight,
  Route,
  CheckSquare,
} from 'lucide-react';
import { getAllLeadsForReport, getAllCallActivities, getAllAppointments, getAllUsers, getAllUserRoutes } from '@/services/firebase';
import { isThisWeek, isToday, format, isFuture, isSameDay } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import Link from 'next/link';

type DashboardStats = {
    totalLeads: number;
    signedCustomers: number;
    appointmentsThisWeek: number;
    callsToday: number;
    topDialer: { name: string; count: number } | null;
    topFieldRep: { name: string; count: number } | null;
    topOutboundPerformer: { name: string; rate: number } | null;
    topFieldSalesPerformer: { name: string; rate: number } | null;
    recentWins: Lead[];
    upcomingAppointments: (Appointment & { leadName: string })[];
    activeFieldSalesLeads: number;
    activeOutboundLeads: number;
    allSavedRoutes: (SavedRoute & { userName: string })[];
    routesToday: number;
    routesThisWeek: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();

  const hasAccess = userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin';

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, hasAccess]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [leadsResponse, callsResponse, appointmentsResponse, usersResponse, routesResponse] = await Promise.all([
          getAllLeadsForReport(),
          getAllCallActivities(),
          getAllAppointments(),
          getAllUsers(),
          getAllUserRoutes(),
        ]);

        const leads = leadsResponse || [];
        const calls = callsResponse || [];
        const appointments = appointmentsResponse || [];
        const users = usersResponse || [];
        const allRoutes = routesResponse || [];
        
        const leadsMap = new Map(leads.map(lead => [lead.id, lead]));

        // Calculate KPIs
        const activeLeads = leads.filter(l => !['Won', 'Lost', 'Unqualified'].includes(l.status));
        const totalLeads = activeLeads.length;
        const activeFieldSalesLeads = activeLeads.filter(l => l.fieldSales === true).length;
        const activeOutboundLeads = activeLeads.filter(l => l.fieldSales !== true).length;
        
        const signedCustomers = leads.filter(l => l.status === 'Won').length;
        const appointmentsThisWeek = appointments.filter(a => a.duedate && isThisWeek(new Date(a.duedate), { weekStartsOn: 1 })).length;
        
        // Correctly count unique calls today
        const uniqueCallsToday = new Set(calls.filter(c => isToday(new Date(c.date))).map(c => c.callId)).size;
        const callsToday = uniqueCallsToday;
        
        const routesToday = allRoutes.filter(r => r.scheduledDate && isToday(new Date(r.scheduledDate))).length;
        const routesThisWeek = allRoutes.filter(r => r.scheduledDate && isThisWeek(new Date(r.scheduledDate), { weekStartsOn: 1 })).length;

        
        const dialerAppointments = appointments.reduce((acc, curr) => {
            if(curr.dialerAssigned) {
                acc[curr.dialerAssigned] = (acc[curr.dialerAssigned] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        const topDialer = Object.entries(dialerAppointments).sort((a, b) => b[1] - a[1])[0];
        
        const fieldRepWins = leads.filter(l => l.salesRepAssigned && (l.status === 'Won' || l.status === 'Trialing ShipMate')).reduce((acc, curr) => {
            if (curr.salesRepAssigned) {
                 acc[curr.salesRepAssigned] = (acc[curr.salesRepAssigned] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        const topFieldRep = Object.entries(fieldRepWins).sort((a,b) => b[1] - a[1])[0];

        // Correctly associate unique calls with dialers for outbound
        const outboundCallsByDialer = calls.reduce((acc, call) => {
            const lead = leadsMap.get(call.leadId);
            if (lead && !lead.fieldSales && call.dialerAssigned && call.callId) {
                if (!acc[call.dialerAssigned]) {
                    acc[call.dialerAssigned] = new Set<string>();
                }
                acc[call.dialerAssigned].add(call.callId);
            }
            return acc;
        }, {} as Record<string, Set<string>>);

        let topOutboundPerformer: { name: string; rate: number } | null = null;
        Object.keys(dialerAppointments).forEach(dialer => {
            const numAppointments = dialerAppointments[dialer];
            const numCalls = outboundCallsByDialer[dialer]?.size || 0;
            if (numCalls > 10) { 
                const rate = (numAppointments / numCalls) * 100;
                if (!topOutboundPerformer || rate > topOutboundPerformer.rate) {
                    topOutboundPerformer = { name: dialer, rate: parseFloat(rate.toFixed(2)) };
                }
            }
        });

        // Calculate Top Field Sales Performer (Check-in to Won/Trial ratio)
        const checkInActivities = calls.filter(a => a.notes?.includes('Checked in at location via map.'));
        const checkInsByRep = checkInActivities.reduce((acc, activity) => {
            if (activity.author) {
                if (!acc[activity.author]) acc[activity.author] = new Set<string>();
                acc[activity.author].add(activity.leadId);
            }
            return acc;
        }, {} as Record<string, Set<string>>);
        
        const fieldSalesSuccesses = leads.filter(l => l.fieldSales && (l.status === 'Won' || l.status === 'Trialing ShipMate'));
        const successesByRep = fieldSalesSuccesses.reduce((acc, lead) => {
            if (lead.dialerAssigned) {
                acc[lead.dialerAssigned] = (acc[lead.dialerAssigned] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        
        let topFieldSalesPerformer: { name: string; rate: number } | null = null;
        Object.keys(checkInsByRep).forEach(rep => {
            const numCheckIns = checkInsByRep[rep].size;
            const numSuccesses = successesByRep[rep] || 0;
            if (numCheckIns > 5) { // Minimum 5 check-ins to be considered
                const rate = (numSuccesses / numCheckIns) * 100;
                if (!topFieldSalesPerformer || rate > topFieldSalesPerformer.rate) {
                    topFieldSalesPerformer = { name: rep, rate: parseFloat(rate.toFixed(2)) };
                }
            }
        });


        // Recent Wins
        const recentWins = leads
            .filter(l => l.status === 'Won')
            .sort((a, b) => {
                 const dateA = a.activity?.[0]?.date ? new Date(a.activity[0].date).getTime() : 0;
                 const dateB = b.activity?.[0]?.date ? new Date(b.activity[0].date).getTime() : 0;
                 return dateB - dateA;
            })
            .slice(0, 5);

        // Upcoming Appointments
        const now = new Date();
        const upcomingAppointments = appointments
            .filter(a => {
                if (!a.duedate) return false;
                const apptDate = new Date(a.duedate);
                return isFuture(apptDate) || isSameDay(now, apptDate);
            })
            .sort((a, b) => new Date(a.duedate).getTime() - new Date(b.duedate).getTime())
            .slice(0, 5)
            .map(appt => ({
                ...appt,
                leadName: leadsMap.get(appt.leadId)?.companyName || 'Unknown Lead'
            }));


        setStats({
          totalLeads,
          signedCustomers,
          appointmentsThisWeek,
          callsToday,
          topDialer: topDialer ? { name: topDialer[0], count: topDialer[1] } : null,
          topFieldRep: topFieldRep ? { name: topFieldRep[0], count: topFieldRep[1] } : null,
          topOutboundPerformer,
          topFieldSalesPerformer,
          recentWins,
          upcomingAppointments,
          activeFieldSalesLeads,
          activeOutboundLeads,
          allSavedRoutes: allRoutes,
          routesToday,
          routesThisWeek,
        });

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && hasAccess) {
      fetchData();
    }
  }, [userProfile, authLoading, hasAccess]);

  const StatCard = ({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: React.ElementType; description?: string; }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );

  const LeaderboardCard = ({ title, user, metric, icon: Icon }: { title: string, user: string | null, metric: string, icon: React.ElementType }) => (
      <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><Icon className="h-4 w-4" />{title}</CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
                <>
                    <p className="text-xl font-bold">{user}</p>
                    <p className="text-xs text-muted-foreground">{metric}</p>
                </>
            ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
      </Card>
  );

  if (loading || authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader /></div>;
  }
  
  if (!userProfile || !hasAccess) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userProfile.firstName}. Here's your mission control.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <StatCard title="Active Leads" value={stats?.totalLeads ?? 0} icon={Users} description="In pipeline" />
        <StatCard title="Signed Customers" value={stats?.signedCustomers ?? 0} icon={Star} description="Total won" />
        <StatCard title="Appts This Week" value={stats?.appointmentsThisWeek ?? 0} icon={Calendar} description="Team total" />
        <StatCard title="Team Calls Today" value={stats?.callsToday ?? 0} icon={Phone} description="Unique calls" />
        <StatCard title="Field Sales Leads" value={stats?.activeFieldSalesLeads ?? 0} icon={Target} description="D2D bucket" />
        <StatCard title="Outbound Leads" value={stats?.activeOutboundLeads ?? 0} icon={Phone} description="Outbound bucket" />
        <StatCard title="Routes Today" value={stats?.routesToday ?? 0} icon={Route} description="Scheduled for today" />
        <StatCard title="Routes This Week" value={stats?.routesThisWeek ?? 0} icon={Route} description="Scheduled this week" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <LeaderboardCard title="Top Dialer (Appointments)" user={stats?.topDialer?.name || null} metric={`${stats?.topDialer?.count || 0} appointments this month`} icon={Trophy} />
        <LeaderboardCard title="Top Field Rep (Wins)" user={stats?.topFieldRep?.name || null} metric={`${stats?.topFieldRep?.count || 0} wins/trials this month`} icon={Target} />
        <LeaderboardCard title="Top Outbound Performer" user={stats?.topOutboundPerformer?.name || null} metric={`${stats?.topOutboundPerformer?.rate || 0}% call-to-appt rate`} icon={LineChart} />
        <LeaderboardCard title="Top Field Sales Performer" user={stats?.topFieldSalesPerformer?.name || null} metric={`${stats?.topFieldSalesPerformer?.rate || 0}% check-in to win/trial rate`} icon={CheckSquare} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Recent Wins</CardTitle>
            <CardDescription>The latest customers to come on board.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentWins && stats.recentWins.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Assigned To</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.recentWins.map(lead => (
                            <TableRow key={lead.id}>
                                <TableCell>
                                    <Button variant="link" className="p-0 h-auto" asChild>
                                        <Link href={`/leads/${lead.id}`}>{lead.companyName}</Link>
                                    </Button>
                                </TableCell>
                                <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                                <TableCell className="text-right">{lead.salesRepAssigned || lead.dialerAssigned || 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent wins to show.</p>
            )}
          </CardContent>
        </Card>
         <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>The next few appointments on the calendar.</CardDescription>
          </CardHeader>
          <CardContent>
             {stats?.upcomingAppointments && stats.upcomingAppointments.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead className="text-right">Assigned To</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.upcomingAppointments.map(appt => (
                            <TableRow key={appt.id}>
                                <TableCell>
                                    <Button variant="link" className="p-0 h-auto" asChild>
                                        <Link href={`/leads/${appt.leadId}`}>{appt.leadName}</Link>
                                    </Button>
                                </TableCell>
                                <TableCell>{format(new Date(appt.starttime), 'MMM d, p')}</TableCell>
                                <TableCell className="text-right">{appt.assignedTo}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming appointments.</p>
            )}
          </CardContent>
        </Card>
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Saved Routes</CardTitle>
            <CardDescription>All saved routes across all users.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.allSavedRoutes && stats.allSavedRoutes.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Route Name</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead className="text-right">Stops</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.allSavedRoutes.map(route => (
                            <TableRow key={route.id}>
                                <TableCell className="font-medium">{route.name}</TableCell>
                                <TableCell>{route.userName}</TableCell>
                                <TableCell className="text-right">{route.leads.length}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No saved routes found.</p>
            )}
          </CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild variant="outline">
                <Link href="/reports"><BarChart className="mr-2 h-4 w-4"/> Outbound Reporting</Link>
            </Button>
            <Button asChild variant="outline">
                <Link href="/door-to-door-reporting"><Target className="mr-2 h-4 w-4"/>D2D Reporting</Link>
            </Button>
             <Button asChild variant="outline">
                <Link href="/leads"><Users className="mr-2 h-4 w-4"/>Manage All Leads</Link>
            </Button>
             <Button asChild variant="outline">
                <Link href="/field-sales"><ActivityIcon className="mr-2 h-4 w-4"/>Field Sales Hub</Link>
            </Button>
          </CardContent>
        </Card>
    </div>
  );
}
