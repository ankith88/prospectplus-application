
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Activity, Appointment, UserProfile, SavedRoute, VisitNote } from '@/lib/types';
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
  Briefcase,
  CheckSquare,
  BarChart3,
} from 'lucide-react';
import { getAllLeadsForReport, getAllCallActivities, getAllAppointments, getAllUsers, getVisitNotes } from '@/services/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
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
    topFieldRepByVisits: { name: string; count: number } | null;
    recentWins: Lead[];
    upcomingAppointments: (Appointment & { leadName: string })[];
    activeFieldSalesLeads: number;
    activeOutboundLeads: number;
    totalVisitNotesToday: number;
    totalVisitNotesThisWeek: number;
    totalConvertedNotes: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVisitNotes, setRecentVisitNotes] = useState<VisitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();

  const hasAccess = userProfile?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, hasAccess]);

  useEffect(() => {
    if (!hasAccess) return;

    setLoadingVisits(true);
    const notesQuery = query(collection(firestore, 'visitnotes'), orderBy('createdAt', 'desc'), limit(10));
    
    const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitNote));
        setRecentVisitNotes(notes);
        setLoadingVisits(false);
    }, (error) => {
        console.error("Failed to fetch real-time visit notes:", error);
        setLoadingVisits(false);
    });

    return () => unsubscribe();
  }, [hasAccess]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [leadsResponse, callsResponse, appointmentsResponse, usersResponse, visitNotesResponse] = await Promise.all([
          getAllLeadsForReport(),
          getAllCallActivities(),
          getAllAppointments(),
          getAllUsers(),
          getVisitNotes(),
        ]);

        const leads = leadsResponse || [];
        const calls = callsResponse || [];
        const appointments = appointmentsResponse || [];
        const users = usersResponse || [];
        const visitNotes = visitNotesResponse || [];
        
        const leadsMap = new Map(leads.map(lead => [lead.id, lead]));

        // Calculate KPIs
        const activeLeads = leads.filter(l => !['Won', 'Lost', 'Unqualified', 'Qualified', 'Pre Qualified', 'LPO Review', 'Trialing ShipMate', 'LocalMile Pending'].includes(l.status));
        const totalLeads = activeLeads.length;
        const activeFieldSalesLeads = activeLeads.filter(l => l.fieldSales === true).length;
        const activeOutboundLeads = activeLeads.filter(l => l.fieldSales !== true).length;
        
        const signedCustomers = leads.filter(l => l.status === 'Won').length;
        const appointmentsThisWeek = appointments.filter(a => a.duedate && isThisWeek(new Date(a.duedate), { weekStartsOn: 1 })).length;
        
        // Correctly count unique calls today
        const uniqueCallsToday = new Set(calls.filter(c => isToday(new Date(c.date))).map(c => c.callId)).size;
        const callsToday = uniqueCallsToday;
        
        const totalVisitNotesToday = visitNotes.filter(n => isToday(new Date(n.createdAt))).length;
        const totalVisitNotesThisWeek = visitNotes.filter(n => isThisWeek(new Date(n.createdAt), { weekStartsOn: 1 })).length;
        const totalConvertedNotes = visitNotes.filter(n => n.status === 'Converted').length;

        
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

        const visitsByRep = visitNotes.reduce((acc, note) => {
            if (note.capturedBy) {
                acc[note.capturedBy] = (acc[note.capturedBy] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        const topFieldRepByVisits = Object.entries(visitsByRep).sort((a, b) => b[1] - a[1])[0];

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
          topFieldRepByVisits: topFieldRepByVisits ? { name: topFieldRepByVisits[0], count: topFieldRepByVisits[1] } : null,
          recentWins,
          upcomingAppointments,
          activeFieldSalesLeads,
          activeOutboundLeads,
          totalVisitNotesToday,
          totalVisitNotesThisWeek,
          totalConvertedNotes,
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
        <StatCard title="Visits Today" value={stats?.totalVisitNotesToday ?? 0} icon={ActivityIcon} description="Notes captured today" />
        <StatCard title="Visits This Week" value={stats?.totalVisitNotesThisWeek ?? 0} icon={ActivityIcon} description="Notes captured this week" />
        <StatCard title="Converted Notes" value={stats?.totalConvertedNotes ?? 0} icon={CheckSquare} description="From captured visits" />
        <StatCard title="Outbound Leads" value={stats?.activeOutboundLeads ?? 0} icon={Phone} description="Outbound bucket" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <LeaderboardCard title="Top Dialer (Appointments)" user={stats?.topDialer?.name || null} metric={`${stats?.topDialer?.count || 0} appointments this month`} icon={Trophy} />
        <LeaderboardCard title="Top Field Rep (Wins)" user={stats?.topFieldRep?.name || null} metric={`${stats?.topFieldRep?.count || 0} wins/trials this month`} icon={Target} />
        <LeaderboardCard title="Top Outbound Performer" user={stats?.topOutboundPerformer?.name || null} metric={`${stats?.topOutboundPerformer?.rate || 0}% call-to-appt rate`} icon={LineChart} />
        <LeaderboardCard title="Top Field Rep (Visits)" user={stats?.topFieldRepByVisits?.name || null} metric={`${stats?.topFieldRepByVisits?.count || 0} total visits`} icon={Briefcase} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Field Activity</CardTitle>
            <CardDescription>The latest notes captured from the field.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingVisits ? <Loader /> : recentVisitNotes.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Captured By</TableHead>
                            <TableHead className="text-right">Outcome</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentVisitNotes.map(note => (
                            <TableRow key={note.id}>
                                <TableCell>
                                     <Button variant="link" className="p-0 h-auto" asChild>
                                        <Link href={`/visit-notes`}>{note.companyName}</Link>
                                    </Button>
                                </TableCell>
                                <TableCell>{note.capturedBy}</TableCell>
                                <TableCell className="text-right">{note.outcome?.type || 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent visit notes.</p>
            )}
          </CardContent>
        </Card>
         <Card>
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
        <Card>
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
                <Link href="/field-activity-report"><BarChart3 className="mr-2 h-4 w-4"/>Field Activity</Link>
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

    

    