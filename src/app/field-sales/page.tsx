
"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { 
    getLeadsFromFirebase, 
    getAllActivities, 
    getVisitNotes,
    getAllAppointments
} from '@/services/firebase'
import type { Lead, Activity, VisitNote, Appointment } from '@/lib/types'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { CheckSquare, UserPlus, Percent, TrendingUp, Filter, X, Navigation, MapPin, Clock, AlertCircle, RefreshCw, CalendarCheck } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { startOfWeek, endOfWeek, startOfDay, endOfDay, formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import type { DateRange } from 'react-day-picker'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

export default function DoorToDoorDashboard() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [allVisitNotes, setAllVisitNotes] = useState<VisitNote[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Location state
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Proximity Filters State
  const [showProximityFilters, setShowProximityFilters] = useState(false);
  const [proximityFilters, setProximityFilters] = useState({
    name: '',
    dateRange: undefined as DateRange | undefined,
    rep: [] as string[],
    outcome: [] as string[],
  });

  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const hasAccess = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin'].includes(userProfile.role);

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, hasAccess]);
  
 const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const [leads, activities, visitNotes, appointments] = await Promise.all([
            getLeadsFromFirebase({ summary: true }),
            getAllActivities(),
            getVisitNotes(),
            getAllAppointments()
        ]);

        const fieldSalesLeads = leads.filter(lead => lead.fieldSales === true);
        setAllLeads(fieldSalesLeads);
        setAllActivities(activities);
        setAllVisitNotes(visitNotes);
        setAllAppointments(appointments);
    } catch (error) {
      console.error("Failed to fetch field sales data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch dashboard data.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const requestLocation = useCallback(() => {
    setIsLocating(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        let msg = "Could not determine your location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location access denied. Please enable location permissions in your browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out.";
        }
        setLocationError(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  useEffect(() => {
    if (userProfile && hasAccess) {
      fetchData();
      requestLocation();
    }
  }, [userProfile, hasAccess, fetchData, requestLocation]);
  
  const weeklyStats = useMemo(() => {
    if (!userProfile || !userProfile.displayName) return null;
    
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    
    // 1. Total Visits this week by this user
    const visitsThisWeek = allVisitNotes.filter(n => 
        n.capturedByUid === userProfile.uid && 
        new Date(n.createdAt) >= weekStart
    );
    const totalVisits = visitsThisWeek.length;

    // 2. Converted Leads from those visits
    const convertedThisWeek = visitsThisWeek.filter(n => n.status === 'Converted' && n.leadId);
    const totalConverted = convertedThisWeek.length;
    
    const convertedLeadIds = new Set(convertedThisWeek.map(n => n.leadId!));

    // 3. Appointments completed for those converted leads
    const totalCompletedAppts = allAppointments.filter(appt => 
        convertedLeadIds.has(appt.leadId) && 
        appt.appointmentStatus === 'Completed'
    ).length;
    
    const visitToLeadRate = totalVisits > 0 ? (totalConverted / totalVisits) * 100 : 0;

    return {
      totalVisits,
      totalConverted,
      totalCompletedAppts,
      visitToLeadRate: parseFloat(visitToLeadRate.toFixed(2)),
    };
  }, [allVisitNotes, allAppointments, userProfile]);

  const nearbyRecentVisits = useMemo(() => {
    if (!myLocation || allVisitNotes.length === 0) return [];

    let filtered = allVisitNotes
      .map(note => {
        if (!note.address?.lat || !note.address?.lng) return null;
        const distance = getDistance(
          myLocation.lat,
          myLocation.lng,
          note.address.lat,
          note.address.lng
        );
        return { ...note, distance };
      })
      .filter((note): note is VisitNote & { distance: number } => 
        note !== null && note.distance <= 1.0 // Within 1km
      );

    // Apply Filters
    if (proximityFilters.name) {
        filtered = filtered.filter(n => n.companyName?.toLowerCase().includes(proximityFilters.name.toLowerCase()));
    }
    if (proximityFilters.rep.length > 0) {
        filtered = filtered.filter(n => proximityFilters.rep.includes(n.capturedBy));
    }
    if (proximityFilters.outcome.length > 0) {
        filtered = filtered.filter(n => n.outcome?.type && proximityFilters.outcome.includes(n.outcome.type));
    }
    if (proximityFilters.dateRange?.from) {
        const from = startOfDay(proximityFilters.dateRange.from);
        const to = proximityFilters.dateRange.to ? endOfDay(proximityFilters.dateRange.to) : endOfDay(from);
        filtered = filtered.filter(n => {
            const d = new Date(n.createdAt);
            return d >= from && d <= to;
        });
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [myLocation, allVisitNotes, proximityFilters]);

  const repOptions: Option[] = useMemo(() => {
      const reps = new Set(allVisitNotes.map(n => n.capturedBy));
      return Array.from(reps).map(r => ({ value: r, label: r }));
  }, [allVisitNotes]);

  const outcomeOptions: Option[] = useMemo(() => {
      const outcomes = new Set(allVisitNotes.map(n => n.outcome?.type).filter(Boolean));
      return Array.from(outcomes as string[]).map(o => ({ value: o, label: o }));
  }, [allVisitNotes]);

  const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  if (loading || authLoading || !userProfile || !hasAccess) {
    return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader /></div>;
  }
  
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Field Sales Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {userProfile.firstName}.</p>
      </header>

      {weeklyStats && (
        <Card>
            <CardHeader>
                <CardTitle>This Week's Performance</CardTitle>
                <CardDescription>Cohort analysis from Monday {startOfWeek(new Date(), { weekStartsOn: 1 }).toLocaleDateString()} to Sunday {endOfWeek(new Date(), { weekStartsOn: 1 }).toLocaleDateString()}.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Visits" value={weeklyStats.totalVisits} icon={MapPin} />
                <StatCard title="Converted Leads" value={weeklyStats.totalConverted} icon={UserPlus} />
                <StatCard title="Completed Appts" value={weeklyStats.totalCompletedAppts} icon={CalendarCheck} />
                <StatCard title="Conv. Rate (Visit to Lead)" value={`${weeklyStats.visitToLeadRate}%`} icon={Percent} />
            </CardContent>
        </Card>
      )}

      {/* RECENT VISITS NEAR ME WIDGET */}
      <Card className="border-sidebar-accent shadow-md">
        <CardHeader className="bg-sidebar-accent/10 pb-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Recent Visits Near Me</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                    {isLocating && <Loader />}
                    <Button variant="ghost" size="sm" onClick={() => setShowProximityFilters(!showProximityFilters)}>
                        <Filter className="h-4 w-4 mr-2" />
                        {showProximityFilters ? 'Hide Filters' : 'Filter'}
                    </Button>
                </div>
            </div>
            <CardDescription>Activity within a 1km radius of your current location.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
            {locationError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Location Access Error</AlertTitle>
                    <AlertDescription className="flex items-center justify-between gap-4">
                        <span>{locationError}</span>
                        <Button variant="outline" size="sm" onClick={requestLocation} className="bg-background text-foreground shrink-0">
                            <RefreshCw className="mr-2 h-3 w-3" /> Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {showProximityFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input 
                            placeholder="Filter by business..." 
                            value={proximityFilters.name} 
                            onChange={(e) => setProximityFilters(prev => ({ ...prev, name: e.target.value }))} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Field Rep</Label>
                        <MultiSelectCombobox 
                            options={repOptions} 
                            selected={proximityFilters.rep} 
                            onSelectedChange={(val) => setProximityFilters(prev => ({ ...prev, rep: val }))} 
                            placeholder="Select reps..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Outcome</Label>
                        <MultiSelectCombobox 
                            options={outcomeOptions} 
                            selected={proximityFilters.outcome} 
                            onSelectedChange={(val) => setProximityFilters(prev => ({ ...prev, outcome: val }))} 
                            placeholder="Select outcomes..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Date Range</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {proximityFilters.dateRange?.from ? (
                                        proximityFilters.dateRange.to ? 
                                        <>{format(proximityFilters.dateRange.from, "PP")} - {format(proximityFilters.dateRange.to, "PP")}</> : 
                                        format(proximityFilters.dateRange.from, "PP")
                                    ) : <span>Select dates...</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar 
                                    mode="range" 
                                    selected={proximityFilters.dateRange} 
                                    onSelect={(range) => setProximityFilters(prev => ({ ...prev, dateRange: range }))} 
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="sm:col-start-1" 
                        onClick={() => setProximityFilters({ name: '', dateRange: undefined, rep: [], outcome: [] })}
                    >
                        <X className="h-4 w-4 mr-2" /> Reset Filters
                    </Button>
                </div>
            )}

            {myLocation ? (
                nearbyRecentVisits.length > 0 ? (
                    <div className="space-y-3">
                        {nearbyRecentVisits.map(note => (
                            <div key={note.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                <div className="space-y-1">
                                    <p className="font-bold text-sm">{note.companyName}</p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {(note.distance * 1000).toFixed(0)}m away
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(note.createdAt))} ago
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-medium">{note.capturedBy}</p>
                                    <Badge variant="outline" className="text-[10px] mt-1">{note.outcome?.type}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 space-y-2">
                        <CheckSquare className="h-8 w-8 text-muted-foreground mx-auto opacity-20" />
                        <p className="text-sm text-muted-foreground">No recent visits match your filters in this area.</p>
                    </div>
                )
            ) : (
                <div className="text-center py-8 text-sm text-muted-foreground italic">
                    {isLocating ? 'Determining your location...' : 'Location access required to show nearby visits.'}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
