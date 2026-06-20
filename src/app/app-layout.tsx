
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
import { Briefcase, LogOut, Archive, FileText, BarChart2, User, ChevronsUpDown, Phone, ListTodo, Calendar, CalendarOff, PlusCircle, Map, Star, Route, History, BarChart3, LayoutDashboard, Settings, Database, CheckSquare, Save, CheckCircle2, ClipboardCheck, LayoutGrid, Clock, MapPin, AlertCircle, Inbox, Mail, ShieldAlert, ChevronRight, ChevronDown, Building, ListFilter, ScanLine, Package, Users, Ticket, HelpCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { usePermissions } from "@/hooks/use-permissions"
import { useSidebar } from "@/components/ui/sidebar"
import { useEffect, useState } from "react"
import { Loader, FullScreenLoader } from "@/components/ui/loader"
import { NotificationCenter } from "@/components/notification-center"
import { UniversalSearch } from "@/components/universal-search"
import { salesReps } from "@/lib/constants"
import { DailyAreaLogDialog } from "@/components/daily-area-log-dialog"
import { getTodayDeploymentForUser } from "@/services/firebase"
import { useOnboarding } from "@/components/onboarding/onboarding-provider"


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userProfile, loading, signOut, isSigningOut, isSigningIn, isSuperAdmin, switchRole } = useAuth()
  const { canView } = usePermissions()
  const { isMobile, state } = useSidebar()
  const { startTour } = useOnboarding()
  
  const [showAreaLog, setShowAreaLog] = useState(false);
  const [hasMissingDeployment, setHasMissingDeployment] = useState(false);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpandedStates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (pathname) {
      if (pathname.startsWith('/leads') || pathname.startsWith('/inbound-leads') || pathname.startsWith('/admin/marketing/import-leads')) {
        setExpandedStates(prev => ({ ...prev, 'leads-group': true }));
      }
      if (pathname.startsWith('/admin/marketing') && !pathname.startsWith('/admin/marketing/import-leads')) {
        setExpandedStates(prev => ({ ...prev, 'marketing': true }));
      }
      if (pathname.startsWith('/capture-visit') || pathname.startsWith('/visit-notes')) {
        setExpandedStates(prev => ({ ...prev, 'field-visits': true }));
      }
      if (pathname.startsWith('/saved-routes') || pathname.startsWith('/prospecting-areas') || pathname.startsWith('/completed-routes') || pathname.startsWith('/field-sales/schedules')) {
        setExpandedStates(prev => ({ ...prev, 'routes-coverage': true }));
      }
      if (pathname.startsWith('/admin/franchisees')) {
        setExpandedStates(prev => ({ ...prev, 'franchisees': true }));
      }
      if (pathname.startsWith('/appointments') || pathname.startsWith('/calls') || pathname.startsWith('/transcripts') || pathname.startsWith('/check-ins')) {
        setExpandedStates(prev => ({ ...prev, 'history': true }));
      }
      if (pathname.startsWith('/admin/tickets')) {
        setExpandedStates(prev => ({ ...prev, 'tickets': true }));
      }
    }
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === '/leads') {
        return pathname === '/leads';
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  }



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
        if (userProfile.disabled) {
            console.log("[Auth] User is disabled. Signing out...");
            localStorage.removeItem('session_init_time');
            await signOut();
            return;
        }

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
        const isFieldSales = userProfile.activeRole === 'Field Sales';
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
  
  if (isAuthPage || pathname.startsWith('/scf/') || pathname.startsWith('/hotel-leads') || pathname.startsWith('/book/')) {
    return <main className="flex min-h-svh flex-1 flex-col bg-background">{children}</main>;
  }

  if (loading || isMobile === null) {
    return (
        <div className="flex h-screen items-center justify-center">
            <FullScreenLoader message="Loading application..." />
        </div>
    )
  }
  
  const canViewD2D = canView('fieldSalesD2D');
  const canViewReporting = canView('reporting');
  const canViewHistory = canView('historyAppointments') || canView('historyCallsTranscripts') || canView('checkIns');
  const canCreateLead = canView('newLead');
  const canCaptureVisit = canView('captureVisit');
  const canProcessVisits = canView('visitNotes');
  const canViewVisits = canCaptureVisit || canProcessVisits;
  const canViewInbound = canView('inboundLeads');


  const canViewMarketingGroup = canView('marketingGroup');
  const canViewFieldSalesD2D = canView('fieldSalesD2D');
  const canViewFieldSalesMap = userProfile?.activeRole && !userProfile.activeRole.includes('Field Sales');
  const canViewFieldSalesGroup = canViewFieldSalesD2D || canViewVisits || canViewFieldSalesMap || canViewD2D;
  const canViewLeadManagementOutbound = canView('outboundLeads');
  const canViewLeadManagementArchive = userProfile?.activeRole && !userProfile.activeRole.includes('Lead Gen') && !userProfile.activeRole.includes('Field Sales') && userProfile.activeRole !== 'Dashback' && userProfile.activeRole !== 'Franchisee';
  const canImportLeads = isSuperAdmin || canView('importLeads');
  const canViewLeadManagementGroup = canCreateLead || canViewLeadManagementOutbound || canViewInbound || canViewLeadManagementArchive || canImportLeads;
  const canViewHistoryAppointments = canView('historyAppointments');
  const canViewHistoryCallsTranscripts = canView('historyCallsTranscripts');
  const canViewFranchisees = canView('franchisees');
  const canViewAccountManagerPipeline = canView('accountManagerPipeline');
  const canViewCustomerSuccessPipeline = canView('customerSuccessPipeline');
  const canViewScans = canView('scans');
  const canViewTickets = canView('tickets');
  
  return (
    <>
      <style>{`
        .sidebar-nav-theme {
          font-family: 'Inter', sans-serif;
        }
        .sidebar-nav-theme [data-active="true"] {
          background-color: #095c7b !important;
          color: white !important;
        }
        .sidebar-nav-theme [data-active="true"] span,
        .sidebar-nav-theme [data-active="true"] svg {
          color: white !important;
        }
        .sidebar-nav-theme [data-active="true"]::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          background-color: #eaf143;
          border-radius: 50%;
          margin-right: 6px;
          flex-shrink: 0;
        }
        .sidebar-nav-theme button:hover, 
        .sidebar-nav-theme a:hover {
          color: #053647 !important;
          transition: all 0.2s ease-in-out;
        }
        .sidebar-nav-theme button:hover svg, 
        .sidebar-nav-theme a:hover svg {
          color: #053647 !important;
        }
        .sidebar-nav-theme *:focus-visible {
          outline: 2px solid #eaf143 !important;
          outline-offset: 2px;
        }
      `}</style>
      <DailyAreaLogDialog isOpen={showAreaLog} onOpenChange={setShowAreaLog} />
      <Sidebar collapsible="icon" className="sidebar-nav-theme">
        <SidebarHeader className="flex items-center justify-center p-4 h-14 border-b border-sidebar-border overflow-hidden">
          <Link href="/leads" className="flex items-center gap-2">
            <div className="logo-text whitespace-nowrap">
              {state === "collapsed" ? (
                <span>p<span className="logo-plus">+</span></span>
              ) : (
                <span>prospect<span className="logo-plus">.plus</span></span>
              )}
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {/* Executive Dashboard */}
            {canView('executiveDashboard') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/dashboard")} tooltip="Executive Dashboard">
                  <Link href="/admin/dashboard">
                    <LayoutDashboard />
                    <span>Executive Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Tickets */}
            {canViewTickets && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleExpand("tickets")}>
                  <Ticket />
                  <span>Tickets</span>
                  {expandedStates["tickets"] ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
                {expandedStates["tickets"] && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/tickets") && !isActive("/admin/tickets/create")}>
                        <Link href="/admin/tickets">
                          <ListFilter className="h-4 w-4" />
                          <span>All Tickets</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/tickets/create")}>
                        <Link href="/admin/tickets/create">
                          <PlusCircle className="h-4 w-4" />
                          <span>Create Ticket</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )}

            {/* Marketing */}
            {canViewMarketingGroup && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleExpand("marketing")}>
                  <Mail />
                  <span>Marketing</span>
                  {expandedStates["marketing"] ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
                {expandedStates["marketing"] && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing/campaigns")}>
                        <Link href="/admin/marketing/campaigns">
                          <Mail className="h-4 w-4" />
                          <span>Campaigns & Queues</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing/nurture-journeys")}>
                        <Link href="/admin/marketing/nurture-journeys">
                          <Settings className="h-4 w-4" />
                          <span>Nurture Journeys</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing/nurture-report")}>
                        <Link href="/admin/marketing/nurture-report">
                          <BarChart2 className="h-4 w-4" />
                          <span>Nurture Reporting</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing") && !isActive("/admin/marketing/lists") && !isActive("/admin/marketing/campaigns") && !isActive("/admin/marketing/nurture-journeys") && !isActive("/admin/marketing/nurture-report")}>
                        <Link href="/admin/marketing">
                          <FileText className="h-4 w-4" />
                          <span>Templates & Library</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing/lists")}>
                        <Link href="/admin/marketing/lists">
                          <ListFilter className="h-4 w-4" />
                          <span>Marketing Lists</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/leads/suppressions")}>
                        <Link href="/leads/suppressions">
                          <ShieldAlert className="h-4 w-4" />
                          <span>Suppression & Opt-Outs</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/brand-bot")}>
                        <Link href="/admin/brand-bot">
                          <Settings className="h-4 w-4" />
                          <span>Brand Bot</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )}

            {/* Door-to-Door */}
            {canViewFieldSalesD2D && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/field-sales")}>
                  <Link href="/field-sales">
                    <Briefcase />
                    <span>Door-to-Door</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Field Visits */}
            {canViewVisits && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleExpand("field-visits")}>
                  <ClipboardCheck />
                  <span>Field Visits</span>
                  {expandedStates["field-visits"] ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
                {expandedStates["field-visits"] && (
                  <SidebarMenuSub>
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
                )}
              </SidebarMenuItem>
            )}

            {/* Routes & Coverage */}
            {canViewD2D && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleExpand("routes-coverage")}>
                  <Route />
                  <span>Routes & Coverage</span>
                  {expandedStates["routes-coverage"] ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
                {expandedStates["routes-coverage"] && (
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
                      <SidebarMenuSubButton asChild isActive={isActive("/prospecting-areas")}>
                        <Link href="/prospecting-areas">
                          <LayoutGrid />
                          <span>Prospecting Areas</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {canView('teamSchedules') && (
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
                )}
              </SidebarMenuItem>
            )}

            {/* Leads Group */}
            {canViewLeadManagementGroup && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleExpand("leads-group")}>
                  <Briefcase />
                  <span>Leads</span>
                  {expandedStates["leads-group"] ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
                {expandedStates["leads-group"] && (
                  <SidebarMenuSub>
                    {canCreateLead && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/leads/new")}>
                          <Link href="/leads/new">
                            <PlusCircle className="h-4 w-4" />
                            <span>New Lead</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {canViewLeadManagementOutbound && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/leads") && !isActive("/leads/new") && !isActive("/leads/map") && !isActive("/leads/archive")}>
                          <Link href="/leads">
                            <Briefcase className="h-4 w-4" />
                            <span>Outbound Leads</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {canViewInbound && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/inbound-leads")}>
                          <Link href="/inbound-leads">
                            <Inbox className="h-4 w-4" />
                            <span>Inbound Leads</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {canImportLeads && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing/import-leads")}>
                          <Link href="/admin/marketing/import-leads">
                            <PlusCircle className="h-4 w-4" />
                            <span>Import Leads</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {canView('unassignedLeads') && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/admin/unassigned-leads")}>
                          <Link href="/admin/unassigned-leads">
                            <ListTodo className="h-4 w-4" />
                            <span>Unassigned Leads</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {canViewLeadManagementArchive && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/leads/archive")}>
                          <Link href="/leads/archive">
                            <Archive className="h-4 w-4" />
                            <span>Archived Leads</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )}

            {/* Account Manager Pipeline */}
            {canViewAccountManagerPipeline && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/account-manager/pipeline")}>
                  <Link href="/account-manager/pipeline">
                    <ListTodo />
                    <span>AM Pipeline</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Customer Success Pipeline */}
            {canViewCustomerSuccessPipeline && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/customer-success/pipeline")}>
                  <Link href="/customer-success/pipeline">
                    <ListTodo />
                    <span>CS Pipeline</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Territory Map */}
            {canViewFieldSalesMap && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/leads/map")}>
                  <Link href="/leads/map">
                    <Map />
                    <span>Territory Map</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Reporting */}
            {canViewReporting && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleExpand("reporting")}>
                  <BarChart2 />
                  <span>Reporting</span>
                  {expandedStates["reporting"] ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
                {expandedStates["reporting"] && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/reports")}>
                        <Link href="/reports">
                          <BarChart2 />
                          <span>Outbound Reporting</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {canViewInbound && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/inbound-reporting")}>
                          <Link href="/inbound-reporting">
                            <Inbox />
                            <span>Inbound Reporting</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {canView('fieldActivityReport') && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/field-activity-report")}>
                          <Link href="/field-activity-report">
                            <BarChart3 />
                            <span>Field Activity</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {canViewAccountManagerPipeline && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/account-manager/reports")}>
                          <Link href="/account-manager/reports">
                            <BarChart3 />
                            <span>AM Reporting</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {canView('deploymentHistory') && (
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
                )}
              </SidebarMenuItem>
            )}

            {/* Signed Customers */}
            {canView('signedCustomers') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/signed-customers")} tooltip="Signed Customers">
                  <Link href="/signed-customers">
                    <Star />
                    <span>Signed Customers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Scans */}
            {canViewScans && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleExpand("scans")}>
                  <ScanLine />
                  <span>Scans</span>
                  {expandedStates["scans"] ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
                {expandedStates["scans"] && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/scans") && !isActive("/scans/report")}>
                        <Link href="/scans">
                          <Package className="h-4 w-4" />
                          <span>Scan Events</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/scans/report")}>
                        <Link href="/scans/report">
                          <BarChart2 className="h-4 w-4" />
                          <span>Scan Reporting</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {canView('topBarcodesUsers') && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/scans/top-users")}>
                          <Link href="/scans/top-users">
                            <Star className="h-4 w-4" />
                            <span>Top Users</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )}

            {/* History */}
            {canViewHistory && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleExpand("history")}>
                  <History />
                  <span>History</span>
                  {expandedStates["history"] ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
                {expandedStates["history"] && (
                  <SidebarMenuSub>
                    {canViewHistoryAppointments && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/appointments")}>
                          <Link href="/appointments">
                            <Calendar />
                            <span>All Appointments</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {canViewHistoryCallsTranscripts && (
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
                )}
              </SidebarMenuItem>
            )}



            {/* Franchisees */}
            {canViewFranchisees && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleExpand("franchisees")}>
                  <Building />
                  <span>Franchisees</span>
                  {expandedStates["franchisees"] ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
                {expandedStates["franchisees"] && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/franchisees/directory")}>
                        <Link href="/admin/franchisees/directory">
                          <Building />
                          <span>Franchisees Directory</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/franchisees/operators")}>
                        <Link href="/admin/franchisees/operators">
                          <Users />
                          <span>Operators Directory</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/franchisees/territory-map")}>
                        <Link href="/admin/franchisees/territory-map">
                          <Map />
                          <span>Territory Map</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
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
                    <SidebarMenuSubButton asChild isActive={isActive('/admin/settings/am-calendar')}>
                      <Link href="/admin/settings/am-calendar">
                        <Calendar />
                        <span>AM Calendars</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={isActive('/admin/settings/am-leave')}>
                      <Link href="/admin/settings/am-leave">
                        <CalendarOff />
                        <span>AM Leave Settings</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={isActive('/admin/settings') && !isActive('/admin/settings/am-calendar') && !isActive('/admin/settings/am-leave')}>
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
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={isActive('/admin/locations/import')}>
                      <Link href="/admin/locations/import">
                        <MapPin />
                        <span>Locations Import</span>
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
             <h2 className="logo-text text-xl sm:block hidden">
               prospect<span className="logo-plus">.plus</span>
             </h2>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {userProfile?.assignedRoles && userProfile.assignedRoles.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90">
                      Viewing as: {userProfile.activeRole}
                      <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {userProfile.assignedRoles.map((r) => (
                      <DropdownMenuItem key={r} onClick={() => switchRole(r)}>
                        {r} {r === userProfile.activeRole && <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
            )}
            {userProfile?.linkedSalesRep && (
                <Button variant="outline" size="sm" onClick={handleCalendlyClick} className="bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90">
                    <Calendar className="mr-2 h-4 w-4" />
                    {userProfile.linkedSalesRep} Calendar
                </Button>
            )}
           <Button variant="ghost" size="icon" onClick={() => startTour()} title="Start Walkthrough">
             <HelpCircle className="h-5 w-5" />
           </Button>
           <UniversalSearch />
           <NotificationCenter />
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button id="step-settings-panel" variant="ghost" className="flex items-center gap-2 hover:bg-sidebar-accent focus:bg-sidebar-accent group">
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
              {canViewAccountManagerPipeline && (
                <DropdownMenuItem asChild>
                  <Link href="/account-manager/settings" className="w-full flex items-center cursor-pointer">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>AM Settings</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>
        
        {hasMissingDeployment && userProfile?.activeRole === 'Field Sales' && (
            <div className="bg-amber-100 border-b border-amber-200 px-4 py-3 flex items-center justify-between text-amber-800 text-sm font-medium animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <span>You haven't logged your area deployment for today yet. Logging your area helps with global reporting.</span>
                </div>
                <Button variant="outline" size="sm" id="step-trigger-daily-area-log" className="bg-amber-600 text-white hover:bg-amber-700 border-none shrink-0" onClick={() => setShowAreaLog(true)}>
                    Log Deployment Now
                </Button>
            </div>
        )}

        <div className="p-4 sm:p-6 lg:p-8 flex-grow">
            {children}
        </div>
        <footer className="p-4 sm:p-6 text-center text-xs text-muted-foreground border-t">
          {new Date().getFullYear()} prospect.plus. All rights reserved.
        </footer>
      </SidebarInset>
    </>
  )
}
