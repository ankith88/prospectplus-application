"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Briefcase, LogOut, Archive, FileText, BarChart2, User, ChevronsUpDown, Phone, ListTodo, Calendar, PlusCircle, Map, Star, Route, History, BarChart3, LayoutDashboard, Settings, Database, CheckSquare, Save, CheckCircle2, ClipboardCheck, LayoutGrid, Clock, MapPin, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useSidebar } from "@/components/ui/sidebar"
import { useEffect, useState } from "react"
import { Loader, FullScreenLoader } from "@/components/ui/loader"
import { NotificationCenter } from "@/components/notification-center"
import { UniversalSearch } from "@/components/universal-search"
import { salesReps } from "@/lib/constants"
import { DailyAreaLogDialog } from "@/components/daily-area-log-dialog"
import { getTodayDeploymentForUser } from "@/services/firebase"


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userProfile, loading, signOut, isSigningOut, isSigningIn } = useAuth()
  const { isMobile } = useSidebar()
  
  const [showAreaLog, setShowAreaLog] = useState(false);
  const [hasMissingDeployment, setHasMissingDeployment] = useState(false);

  const isActive = (path: string) => {
    if (path === '/leads') {
        return pathname === '/leads';
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  const isSuperAdmin = userProfile?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

  const handleSignOut = async () => {
    await signOut()
  }

  const isAuthPage = pathname === '/signin' || pathname === '/signup';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user && !isAuthPage) {
        document.body.classList.add('logged-in');
      } else {
        document.body.classList.remove('logged-in');
      }
    }
  }, [user, isAuthPage]);

  // DAILY SESSION & DEPLOYMENT CHECK
  useEffect(() => {
    if (loading || isAuthPage || !user || !userProfile) {
        return;
    }

    const checkDeploymentAndSession = async () => {
        // 1. Session Revocation (Force Logout) Logic
        const sessionInitTime = localStorage.getItem('session_init_time');
        if (!sessionInitTime) {
            localStorage.setItem('session_init_time', new Date().toISOString());
        } else {
            // @ts-ignore - forceLogoutAt is added to UserProfile
            if (userProfile.forceLogoutAt) {
                // @ts-ignore
                const forceLogoutDate = new Date(userProfile.forceLogoutAt).getTime();
                const sessionDate = new Date(sessionInitTime).getTime();
                
                if (forceLogoutDate > sessionDate) {
                    console.log("[Auth] Session revoked by admin. Signing out...");
                    localStorage.removeItem('session_init_time');
                    await signOut();
                    return;
                }
            }
        }

        // 2. Field Sales Specific Logic (Deployment & Daily Reset)
        const isFieldSales = userProfile.role === 'Field Sales';
        // Use Australian Eastern Time for daily checks
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
        const lastSessionDay = localStorage.getItem('last_session_day');

        if (isFieldSales && lastSessionDay && lastSessionDay !== today) {
            localStorage.removeItem('last_session_day');
            localStorage.removeItem('deployment_skipped_date'); // Reset skip on new day
            await signOut();
            return;
        }

        if (isFieldSales) {
            localStorage.setItem('last_session_day', today);
            
            const deployment = await getTodayDeploymentForUser(userProfile.uid);
            if (!deployment) {
                setHasMissingDeployment(true);
                // Check if they've already skipped today
                const skippedDate = localStorage.getItem('deployment_skipped_date');
                if (skippedDate !== today) {
                    setShowAreaLog(true);
                }
            } else {
                setHasMissingDeployment(false);
            }
        }
    };

    checkDeploymentAndSession();
  }, [user, userProfile, isAuthPage, signOut, loading]);
  
  const formatAustralianPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return '';
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.startsWith('61')) {
        const localPart = digits.substring(2);
        if (localPart.length === 9) return `+61 ${localPart.substring(0, 3)} ${localPart.substring(3, 6)} ${localPart.substring(6, 9)}`;
        if (localPart.length === 10) return `+61 ${localPart.substring(0, 2)} ${localPart.substring(2, 6)} ${localPart.substring(6, 10)}`;
        return `+${digits}`;
    }
    if (digits.startsWith('0')) {
        const localPart = digits.substring(1);
        if (localPart.length === 9) return `+61 ${localPart.substring(0, 3)} ${localPart.substring(3, 6)} ${localPart.substring(6, 9)}`;
         if (localPart.length === 10) return `+61 ${localPart.substring(0, 2)} ${localPart.substring(2, 6)} ${localPart.substring(6, 10)}`;
    }
    return phoneNumber;
  };

  const handleCalendlyClick = () => {
    if (userProfile?.linkedSalesRep) {
      const rep = salesReps.find(r => r.name === userProfile.linkedSalesRep);
      if (rep) {
        const url = new URL(rep.url);
        window.open(url.toString(), '_blank');
      }
    }
  };


  if (isSigningOut) return <FullScreenLoader message="Signing out..." />;
  if (isSigningIn) return <FullScreenLoader message="Signing in..." />;
  
  if (isAuthPage) {
    return <main className="flex min-h-svh flex-1 flex-col bg-background">{children}</main>;
  }

  if (loading || isMobile === null) {
    return (
        <div className="flex h-screen items-center justify-center">
            <FullScreenLoader message="Loading application..." />
        </div>
    )
  }
  
  const canViewD2D = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin'].includes(userProfile.role);
  const canViewReporting = userProfile?.role && ['admin', 'user', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Franchisee', 'Sales Manager'].includes(userProfile.role);
  const canViewHistory = userProfile?.role && ['admin', 'user', 'Field Sales', 'Field Sales Admin', 'Franchisee'].includes(userProfile.role);
  const canCreateLead = userProfile?.role && ['admin', 'Lead Gen', 'Lead Gen Admin', 'Field Sales Admin'].includes(userProfile.role);
  const canCaptureVisit = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Franchisee'].includes(userProfile.role);
  const canProcessVisits = userProfile?.role && ['admin', 'Lead Gen', 'Lead Gen Admin', 'Field Sales', 'Field Sales Admin', 'Franchisee'].includes(userProfile.role);
  const canViewVisits = canCaptureVisit || canProcessVisits;


  return (
    <>
      <DailyAreaLogDialog isOpen={showAreaLog} onOpenChange={setShowAreaLog} />
      <Sidebar collapsible="icon">
        <SidebarHeader className="flex items-center justify-center p-4 h-14 border-b border-sidebar-border">
          <Link href="/leads" className="flex items-center gap-2">
            <Image
              src="https://mailplus.com.au/wp-content/uploads/2021/02/mailplus-new-logo-solo-copy-4.png"
              width={100}
              height={100}
              alt="MailPlus CRM Logo"
              data-ai-hint="logo icon"
            />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
             {userProfile?.role === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/dashboard")} tooltip="Admin Dashboard">
                  <Link href="/admin/dashboard">
                    <LayoutDashboard />
                    <span>Admin Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {(userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin'].includes(userProfile.role)) && (
               <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/field-sales")} tooltip="Door-to-Door">
                  <Link href="/field-sales">
                    <Briefcase />
                    <span>Door-to-Door</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {canViewVisits && (
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <ClipboardCheck />
                  <span>Field Visits</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {userProfile?.role === 'Field Sales' && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton onClick={() => setShowAreaLog(true)}>
                        <MapPin />
                        <span>Log Today's Area</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {canCaptureVisit && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive('/capture-visit')}>
                        <Link href="/capture-visit">
                          <PlusCircle />
                          <span>Capture Visit</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {canProcessVisits && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive('/visit-notes')}>
                        <Link href="/visit-notes">
                          <FileText />
                          <span>Visit Notes</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              </SidebarMenuItem>
            )}
            {canViewD2D && (
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Route />
                  <span>Routes & Coverage</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                    <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/saved-routes")}>
                        <Link href="/saved-routes">
                            <Save />
                            <span>Saved Routes</span>
                        </Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive('/prospecting-areas')}>
                            <Link href="/prospecting-areas">
                                <LayoutGrid />
                                <span>Prospecting Areas</span>
                            </Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                        <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={isActive("/field-sales/schedules")}>
                            <Link href="/field-sales/schedules">
                                <Clock />
                                <span>Team Schedules</span>
                            </Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    )}
                    <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/completed-routes")}>
                        <Link href="/completed-routes">
                            <CheckCircle2 />
                            <span>Completed Routes</span>
                        </Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            )}
            {canCreateLead && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/leads/new")} tooltip="New Lead">
                  <Link href="/leads/new">
                    <PlusCircle />
                    <span>New Lead</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {(userProfile?.role && ['admin', 'user', 'Lead Gen', 'Lead Gen Admin', 'Franchisee'].includes(userProfile.role)) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/leads'} tooltip="Leads">
                  <Link href="/leads">
                    <Briefcase />
                    <span>Outbound Leads</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {(userProfile?.role && !userProfile.role.includes('Field Sales')) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/leads/map")} tooltip="Territory Map">
                  <Link href="/leads/map">
                    <Map />
                    <span>Territory Map</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {canViewReporting && (
                <SidebarMenuItem>
                    <SidebarMenuButton>
                    <BarChart2 />
                    <span>Reporting</span>
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                    {(userProfile?.role === 'admin' || userProfile?.role === 'Sales Manager') && (
                        <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={isActive("/reporting/unified")}>
                            <Link href="/reporting/unified">
                                <LayoutDashboard />
                                <span>Unified Dashboard</span>
                            </Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    )}
                    <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/reports")}>
                        <Link href="/reports">
                            <BarChart2 />
                            <span>Outbound Reporting</span>
                        </Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/field-activity-report")}>
                        <Link href="/field-activity-report">
                            <BarChart3 />
                            <span>Field Activity</span>
                        </Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {userProfile?.role === 'admin' && (
                        <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={isActive("/admin/deployments")}>
                            <Link href="/admin/deployments">
                                <MapPin />
                                <span>Deployment History</span>
                            </Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    )}
                    </SidebarMenuSub>
                </SidebarMenuItem>
            )}
             {(userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen Admin' || userProfile?.role === 'Franchisee') && (
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/signed-customers")} tooltip="Signed Customers">
                    <Link href="/signed-customers">
                      <Star />
                      <span>Signed Customers</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
             )}
             {canViewHistory && (
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <History />
                  <span>History</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {(userProfile?.role && !userProfile.role.includes('Field Sales') && userProfile.role !== 'Franchisee') && (
                    <>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive("/appointments")}>
                          <Link href="/appointments">
                              <Calendar />
                              <span>All Appointments</span>
                          </Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {(userProfile?.role !== 'Field Sales Admin') && (
                      <>
                          <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={isActive("/calls")}>
                              <Link href="/calls">
                                  <Phone />
                                  <span>All Calls</span>
                              </Link>
                              </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={isActive("/transcripts")}>
                              <Link href="/transcripts">
                                  <FileText />
                                  <span>All Transcripts</span>
                              </Link>
                              </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                      </>
                      )}
                    </>
                  )}
                  {canViewD2D && (
                    <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/check-ins")}>
                        <Link href="/check-ins">
                            <CheckSquare />
                            <span>Check-ins</span>
                        </Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              </SidebarMenuItem>
            )}
            {userProfile?.role && !userProfile.role.includes('Lead Gen') && !userProfile.role.includes('Field Sales') && userProfile.role !== 'Franchisee' && (
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/leads/archive")} tooltip="Archived Leads">
                <Link href="/leads/archive">
                  <Archive />
                  <span>Archived Leads</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-0">
          {isSuperAdmin && (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings />
                  <span>Super Admin</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={isActive('/admin/settings')}>
                      <Link href="/admin/settings">
                        <User />
                        <span>User Settings</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={isActive('/admin/data')}>
                      <Link href="/admin/data">
                        <Database />
                        <span>Data Management</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
         <header className="flex h-14 items-center justify-between gap-4 border-b bg-sidebar text-sidebar-foreground px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
          </div>
          
          <div className="flex-1 flex justify-center">
             <h2 className="text-xl font-bold hidden sm:block">ProspectPlus</h2>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {userProfile?.linkedSalesRep && (
                <Button variant="outline" size="sm" onClick={handleCalendlyClick} className="bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90">
                    <Calendar className="mr-2 h-4 w-4" />
                    {userProfile.linkedSalesRep} Calendar
                </Button>
            )}
           <UniversalSearch />
           <NotificationCenter />
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-sidebar-accent focus:bg-sidebar-accent group">
                 <User className="h-5 w-5" />
                 <div className="hidden md:flex flex-col items-start">
                   <span className="font-medium text-sm truncate group-hover:text-sidebar-hover-foreground">{user?.displayName}</span>
                   {userProfile?.phoneNumber && (
                    <span className="text-xs text-sidebar-foreground/70 group-hover:text-sidebar-hover-foreground/70">{formatAustralianPhoneNumber(userProfile.phoneNumber)}</span>
                   )}
                 </div>
                 <ChevronsUpDown className="h-4 w-4 hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                  <div className="flex flex-col">
                      <span className="font-medium text-sm truncate">{user?.displayName}</span>
                      <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                  </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>
        
        {hasMissingDeployment && userProfile?.role === 'Field Sales' && (
            <div className="bg-amber-100 border-b border-amber-200 px-4 py-3 flex items-center justify-between text-amber-800 text-sm font-medium animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <span>You haven't logged your area deployment for today yet. Logging your area helps with global reporting.</span>
                </div>
                <Button variant="outline" size="sm" className="bg-amber-600 text-white hover:bg-amber-700 border-none shrink-0" onClick={() => setShowAreaLog(true)}>
                    Log Deployment Now
                </Button>
            </div>
        )}

        <div className="p-4 sm:p-6 lg:p-8 flex-grow">
            {children}
        </div>
        <footer className="p-4 sm:p-6 text-center text-xs text-muted-foreground border-t">
          {new Date().getFullYear()} MailPlus Pty. Ltd. All rights reserved.
        </footer>
      </SidebarInset>
    </>
  )
}
