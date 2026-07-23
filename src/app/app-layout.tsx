
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
import { Briefcase, LogOut, Archive, FileText, BarChart2, User, ChevronsUpDown, Phone, ListTodo, Calendar, CalendarOff, PlusCircle, Map, Star, Route, History, BarChart3, LayoutDashboard, Settings, Database, CheckSquare, Save, CheckCircle2, ClipboardCheck, LayoutGrid, Clock, MapPin, AlertCircle, Inbox, Mail, ShieldAlert, ChevronRight, ChevronDown, Building, ListFilter, ScanLine, Package, Users, Ticket, HelpCircle, Activity, DollarSign, Sparkles, Laptop, Search, PanelLeft, Layers, UserX, ArrowUpRight, XCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { usePermissions } from "@/hooks/use-permissions"
import { useSidebar } from "@/components/ui/sidebar"
import { useEffect, useState, useRef } from "react"
import PerformanceTimer from "@/components/performance-timer"
import { AccessDenied } from "@/components/access-denied"
import { Loader, FullScreenLoader } from "@/components/ui/loader"
import { NotificationCenter } from "@/components/notification-center"
import { UniversalSearch } from "@/components/universal-search"
import { salesReps } from "@/lib/constants"
import { DailyAreaLogDialog } from "@/components/daily-area-log-dialog"
import { UnassignedCallDialog } from "@/components/unassigned-call-dialog"
import { getTodayDeploymentForUser } from "@/services/firebase"
import { useOnboarding } from "@/components/onboarding/onboarding-provider"
import { AskChatbot } from "@/components/ask/ask-chatbot"
import { useDialingSession } from "@/hooks/use-dialing-session"
import { usePerformance } from "@/hooks/use-performance"


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userProfile, loading, signOut, isSigningOut, isSigningIn, isSuperAdmin, switchRole, updateUserProfile } = useAuth()
  const { canView } = usePermissions()
  const { isMobile, state } = useSidebar()
  const { startTour } = useOnboarding()
  const { isSessionActive, elapsedTime, sessionLeadIds, leadsVisited, endSession } = useDialingSession()
  const { loadTime, setLoadTime, pageName, setPageName, isCustom, setIsCustom } = usePerformance()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isCustomPath(pathname)) {
      setIsCustom(true);
      return;
    }

    const start = performance.now();
    let completed = false;
    let timeoutId: NodeJS.Timeout;

    const checkLoadingState = () => {
      if (completed) return;
      
      const container = containerRef.current;
      if (!container) return;

      // Check if any loaders or Skeletons or pulse animations are present
      const hasLoader = container.querySelector(
        '.animate-pulse, .animate-spin, [class*="loader"], [class*="spinner"]'
      ) !== null;

      if (!hasLoader) {
        // Debounce completion to make sure it is stable
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (!completed) {
            completed = true;
            const duration = Math.round(performance.now() - start);
            setLoadTime(duration);
            console.log(`[Performance Dynamic] ${pathname} - Load Time: ${duration}ms`);
          }
        }, 150); // wait 150ms of quiet time
      } else {
        // Loader is present, keep waiting
        clearTimeout(timeoutId);
      }
    };

    // Run initial check
    checkLoadingState();

    // Set up observer to track DOM changes
    const observer = new MutationObserver(() => {
      checkLoadingState();
    });

    const container = containerRef.current;
    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }

    // Safety timeout: if it takes more than 10 seconds, stop and record
    const safetyTimeout = setTimeout(() => {
      if (!completed) {
        completed = true;
        setLoadTime(Math.round(performance.now() - start));
      }
    }, 10000);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
      clearTimeout(safetyTimeout);
    };
  }, [pathname, setIsCustom, setLoadTime]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };
  
  const [showAreaLog, setShowAreaLog] = useState(false);
  const [hasMissingDeployment, setHasMissingDeployment] = useState(false);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpandedStates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (pathname) {
      if (pathname.startsWith('/leads') || pathname.startsWith('/inbound-leads') || pathname.startsWith('/admin/marketing/import-leads') || pathname.startsWith('/account-lookup')) {
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
      if (pathname.startsWith('/appointments') || pathname.startsWith('/calls') || pathname.startsWith('/unassigned_calls') || pathname.startsWith('/unassigned-calls') || pathname.startsWith('/transcripts') || pathname.startsWith('/check-ins')) {
        setExpandedStates(prev => ({ ...prev, 'history': true }));
      }
      if (pathname.startsWith('/admin/tickets')) {
        setExpandedStates(prev => ({ ...prev, 'tickets': true }));
      }
      if (pathname.startsWith('/customer-success')) {
        setExpandedStates(prev => ({ ...prev, 'customer-success': true }));
      }
      if (pathname.startsWith('/lpo-leads') || pathname.startsWith('/lpo-opportunities')) {
        setExpandedStates(prev => ({ ...prev, 'lpo-plus': true }));
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

        // 2. Universal Daily Reset (Sydney Time Midnight Logout)
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
        const lastSessionDay = localStorage.getItem('last_session_day');

        if (lastSessionDay && lastSessionDay !== today) {
            localStorage.removeItem('last_session_day');
            localStorage.removeItem('deployment_skipped_date'); // Reset skip on new day
            console.log("[Auth] Day transition detected. Signing out...");
            await signOut();
            return;
        }

        localStorage.setItem('last_session_day', today);

        // 3. Field Sales Specific Logic (Deployment prompt)
        const isFieldSales = userProfile.activeRole === 'Field Sales';
        if (isFieldSales) {
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

    // Listen to focus and visibility changes to check immediately on tab reactivations
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            checkDeploymentAndSession();
        }
    };
    window.addEventListener('focus', checkDeploymentAndSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        window.removeEventListener('focus', checkDeploymentAndSession);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, userProfile, isAuthPage, signOut, loading, pathname]);

  // 2-HOUR INACTIVITY AUTO-LOGOUT CHECK
  useEffect(() => {
    if (loading || isAuthPage || !user) return;

    const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in ms
    let checkInterval: NodeJS.Timeout;
    let lastUpdate = 0;

    const getLastActivity = () => {
        const stored = localStorage.getItem('last_activity_time');
        return stored ? parseInt(stored, 10) : Date.now();
    };

    const updateActivity = () => {
        const now = Date.now();
        // Throttle updates to local storage (once every 10 seconds)
        if (now - lastUpdate > 10000) {
            localStorage.setItem('last_activity_time', now.toString());
            lastUpdate = now;
        }
    };

    const checkInactivity = async () => {
        const lastActivity = getLastActivity();
        const now = Date.now();
        if (now - lastActivity > INACTIVITY_TIMEOUT) {
            console.log("[Auth] User inactive for more than 2 hours. Logging out...");
            localStorage.removeItem('last_activity_time');
            clearInterval(checkInterval);
            await signOut();
        }
    };

    // Run initial check
    checkInactivity();

    // Event listeners for user activity
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
        window.addEventListener(event, updateActivity);
    });

    // Check every 10 seconds
    checkInterval = setInterval(checkInactivity, 10000);

    // Also check when tab becomes visible/active again
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            checkInactivity();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        activityEvents.forEach(event => {
            window.removeEventListener(event, updateActivity);
        });
        clearInterval(checkInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, loading, isAuthPage, signOut]);
  
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
  
  if (isAuthPage || pathname.startsWith('/scf/') || pathname.startsWith('/sof/') || pathname.startsWith('/lpo-opportunity/') || pathname.startsWith('/hotel-leads') || pathname.startsWith('/book/') || pathname.startsWith('/localmile-registration/')) {
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
  const canViewInboundReporting = canView('inboundReporting');


  const canViewMarketingGroup = (canView('marketingGroup') || userProfile?.activeRole === 'Customer Service') && userProfile?.activeRole !== 'user';
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
  const canViewLpoLeads = canView('lpoLeads');
  const activeRoleStr = userProfile?.activeRole as string;
  const isAdmin = isSuperAdmin || activeRoleStr === 'admin' || activeRoleStr === 'super user' || activeRoleStr === 'Sales Manager' || activeRoleStr === 'Marketing Manager' || activeRoleStr === 'Marketing Admin';
  const isMarketingAdmin = isSuperAdmin || activeRoleStr === 'admin' || activeRoleStr === 'super user' || activeRoleStr === 'Marketing Manager' || activeRoleStr === 'Marketing Admin' || userProfile?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';
  
  const allowedMailboxRoles = [
    'admin',
    'super user',
    'Sales Manager',
    'Marketing Manager',
    'Marketing Admin',
    'Customer Success',
    'Account Managers',
    'Account Manager',
    'account managers'
  ];
  const canAccessMailbox = (isSuperAdmin || 
                           userProfile?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2' || 
                           (userProfile?.activeRole && allowedMailboxRoles.includes(userProfile.activeRole))) && userProfile?.activeRole !== 'user';

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
            {/* AI Mailbox */}
            {canAccessMailbox && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/mailbox")} tooltip="AI Mailbox">
                  <Link href="/admin/mailbox">
                    <Sparkles className="text-[#eaf143] fill-[#eaf143]/20" />
                    <span>AI Mailbox</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

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

            {/* Financial Dashboard */}
            {isSuperAdmin && userProfile?.activeRole !== 'user' && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/financial-dashboard")} tooltip="Financial Dashboard">
                  <Link href="/admin/financial-dashboard">
                    <DollarSign />
                    <span>Financial Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Universal Lookup */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/account-lookup")} tooltip="Universal Lookup">
                <Link href="/account-lookup">
                  <Search />
                  <span>Universal Lookup</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Ask Prospect+ */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/ask")} tooltip="Ask Prospect+">
                <Link href="/ask">
                  <Sparkles />
                  <span>Ask Prospect+</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

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
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/tickets") && !isActive("/admin/tickets/create") && !isActive("/admin/tickets/archived") && !isActive("/admin/tickets/operations") && !isActive("/admin/tickets/it") && !isActive("/admin/tickets/reporting")}>
                        <Link href="/admin/tickets">
                          <ListFilter className="h-4 w-4" />
                          <span>All Tickets</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/tickets/reporting")}>
                        <Link href="/admin/tickets/reporting">
                          <BarChart2 className="h-4 w-4" />
                          <span>Ticket Reporting</span>
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
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/tickets/archived")}>
                        <Link href="/admin/tickets/archived">
                          <Archive className="h-4 w-4" />
                          <span>Archived Tickets</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/tickets/operations")}>
                        <Link href="/admin/tickets/operations">
                          <Settings className="h-4 w-4" />
                          <span>Operations Tickets</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/tickets/it")}>
                        <Link href="/admin/tickets/it">
                          <Laptop className="h-4 w-4" />
                          <span>IT Tickets</span>
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
                    {isMarketingAdmin && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing/campaigns")}>
                          <Link href="/admin/marketing/campaigns">
                            <Mail className="h-4 w-4" />
                            <span>Campaigns & Queues</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {isMarketingAdmin && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing/nurture-journeys")}>
                          <Link href="/admin/marketing/nurture-journeys">
                            <Settings className="h-4 w-4" />
                            <span>Nurture Journeys</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {isMarketingAdmin && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing/nurture-report")}>
                          <Link href="/admin/marketing/nurture-report">
                            <BarChart2 className="h-4 w-4" />
                            <span>Nurture Reporting</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing") && !isActive("/admin/marketing/lists") && !isActive("/admin/marketing/campaigns") && !isActive("/admin/marketing/nurture-journeys") && !isActive("/admin/marketing/nurture-report")}>
                        <Link href="/admin/marketing">
                          <FileText className="h-4 w-4" />
                          <span>Templates & Library</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {isMarketingAdmin && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing/lists")}>
                          <Link href="/admin/marketing/lists">
                            <ListFilter className="h-4 w-4" />
                            <span>Marketing Lists</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {isMarketingAdmin && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/leads/suppressions")}>
                          <Link href="/leads/suppressions">
                            <ShieldAlert className="h-4 w-4" />
                            <span>Suppression & Opt-Outs</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {isMarketingAdmin && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/admin/brand-bot")}>
                          <Link href="/admin/brand-bot">
                            <Settings className="h-4 w-4" />
                            <span>Brand Bot</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}

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
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/account-lookup")}>
                        <Link href="/account-lookup">
                          <Search className="h-4 w-4" />
                          <span>Universal Lookup</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )}

            {/* LPO.Plus collapsible group */}
            {canViewLpoLeads && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleExpand("lpo-plus")}>
                  <Building />
                  <span>LPO.Plus</span>
                  {expandedStates["lpo-plus"] ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
                {expandedStates["lpo-plus"] && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/lpo-leads")}>
                        <Link href="/lpo-leads">
                          <Building className="h-4 w-4" />
                          <span>Participating LPOs</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/lpo-opportunities")}>
                        <Link href="/lpo-opportunities">
                          <ArrowUpRight className="h-4 w-4" />
                          <span>Shared Opportunities</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
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

            {/* Customer Success collapsible group */}
            {canViewCustomerSuccessPipeline && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleExpand("customer-success")}>
                  <Users />
                  <span>Customer Success</span>
                  {expandedStates["customer-success"] ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
                {expandedStates["customer-success"] && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/customer-success/pipeline")}>
                        <Link href="/customer-success/pipeline">
                          <ListTodo className="h-4 w-4" />
                          <span>CS Pipeline</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/customer-success/cancellations")}>
                        <Link href="/customer-success/cancellations">
                          <CalendarOff className="h-4 w-4" />
                          <span>CS Cancellations</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
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
                    {!(userProfile?.activeRole === 'Account Managers' || userProfile?.activeRole === 'Account Manager' || userProfile?.activeRole === 'account managers') && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/reports")}>
                          <Link href="/reports">
                            <BarChart2 />
                            <span>Outbound Reporting</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/sales-snapshot")}>
                        <Link href="/sales-snapshot">
                          <Layers className="h-4 w-4" />
                          <span>Sales Snapshot</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {canViewInboundReporting && (
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
                    {isAdmin && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/admin/lifecycle-dashboard")}>
                          <Link href="/admin/lifecycle-dashboard">
                            <Activity className="h-4 w-4" />
                            <span>Lifecycle Dashboard</span>
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

            {/* Lost Customers */}
            {canView('signedCustomers') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/lost-customers")} tooltip="Lost Customers">
                  <Link href="/lost-customers">
                    <UserX className="h-4 w-4" />
                    <span>Lost Customers</span>
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
                      <>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive("/scans/top-users") && !isActive("/scans/top-users/contact-report")}>
                            <Link href="/scans/top-users">
                              <Star className="h-4 w-4" />
                              <span>Top Users</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive("/scans/top-users/contact-report")}>
                            <Link href="/scans/top-users/contact-report">
                              <Phone className="h-4 w-4" />
                              <span>Top Users Contact Report</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </>
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
                          <SidebarMenuSubButton asChild isActive={isActive("/unassigned_calls")}>
                            <Link href="/unassigned_calls">
                              <HelpCircle />
                              <span>Unassigned Calls</span>
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
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive("/admin/franchisees/suburb-mapping")}>
                        <Link href="/admin/franchisees/suburb-mapping">
                          <MapPin />
                          <span>Suburb & Lodgement Mapping</span>
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
          {(isSuperAdmin || userProfile?.activeRole === 'Sales Manager') && (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleExpand("admin-settings")}>
                  <Settings />
                  <span>{isSuperAdmin ? 'Super Admin' : 'Admin Settings'}</span>
                  {expandedStates["admin-settings"] ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
                {expandedStates["admin-settings"] && (
                  <SidebarMenuSub>
                    {userProfile?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2' && (
                      <>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/admin/login-report')}>
                            <Link href="/admin/login-report">
                              <Clock className="h-4 w-4" />
                              <span>Login Activity</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/admin/app-tickets')}>
                            <Link href="/admin/app-tickets">
                              <Ticket className="h-4 w-4" />
                              <span>App Tickets</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </>
                    )}
                    {isSuperAdmin && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive('/admin/settings/am-calendar')}>
                        <Link href="/admin/settings/am-calendar">
                          <Calendar />
                          <span>AM Calendars</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    )}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive('/admin/settings/am-leave')}>
                        <Link href="/admin/settings/am-leave">
                          <CalendarOff />
                          <span>AM Leave Settings</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {isSuperAdmin && (
                    <>
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
                    </>
                    )}
                  </SidebarMenuSub>
                )}
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
            <PerformanceTimer loadTime={loadTime} pageName={pageName || getPageNameFromPath(pathname)} />
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
                   {(userProfile?.aircallPhoneNumber || userProfile?.phoneNumber) && (
                     <span className="text-xs text-sidebar-foreground/70 group-hover:text-sidebar-hover-foreground/70">
                       {formatAustralianPhoneNumber(userProfile.aircallPhoneNumber || userProfile.phoneNumber || '')}
                     </span>
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
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="cursor-pointer flex items-center justify-between gap-4"
                onClick={async () => {
                  if (updateUserProfile) {
                    await updateUserProfile({
                      sidebarAlwaysOpen: !userProfile?.sidebarAlwaysOpen
                    });
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <PanelLeft className="h-4 w-4 text-muted-foreground" />
                  <span>Keep Sidebar Open</span>
                </div>
                <div className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center shrink-0 ${userProfile?.sidebarAlwaysOpen ? 'bg-[#095C7B]' : 'bg-gray-300'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white absolute transition-all ${userProfile?.sidebarAlwaysOpen ? 'right-0.5' : 'left-0.5'}`} />
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
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app-tickets/create" className="w-full flex items-center cursor-pointer">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>Submit Feedback/Bug</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app-tickets" className="w-full flex items-center cursor-pointer">
                  <Ticket className="mr-2 h-4 w-4" />
                  <span>View Feedback & Ideas</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>
        
        {isSessionActive && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between text-sm text-red-800 sticky top-14 z-20 shadow-sm animate-in slide-in-from-top duration-200">
            <div className="flex flex-wrap items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
              </span>
              <span className="font-bold tracking-wider uppercase text-xs text-red-700">Dialing Session Active</span>
              <span className="text-red-200">|</span>
              <div className="flex items-center gap-1.5 font-mono text-slate-700 bg-white px-2.5 py-1 rounded-md border border-red-200 shadow-inner">
                <Clock className="h-4 w-4 text-red-500 animate-pulse" />
                <span className="font-semibold">{formatTime(elapsedTime)}</span>
              </div>
              <span className="text-red-200">|</span>
              <span className="text-red-900 font-medium">
                Progress: <strong className="text-red-700 bg-red-100 px-2 py-0.5 rounded font-bold">{leadsVisited.length}</strong> / {sessionLeadIds.length + leadsVisited.length} leads
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={endSession}
                className="text-red-700 hover:text-red-800 hover:bg-red-100 h-8 px-3 text-xs flex items-center gap-1.5 border border-red-200"
              >
                <XCircle className="h-4 w-4" />
                End Session
              </Button>
            </div>
          </div>
        )}
        
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

        <div ref={containerRef} className="p-4 sm:p-6 lg:p-8 flex-grow">
            {isBlockedForUserRole(pathname, userProfile?.activeRole) ? (
              <AccessDenied />
            ) : (
              children
            )}
        </div>
        <footer className="p-4 sm:p-6 text-center text-xs text-muted-foreground border-t">
          {new Date().getFullYear()} prospect.plus. All rights reserved.
        </footer>
        <UnassignedCallDialog />
        <AskChatbot />
      </SidebarInset>
    </>
  )
}

const isBlockedForUserRole = (path: string, role?: string) => {
  if (role !== 'user') return false;
  return path.startsWith('/admin/marketing') || 
         path.startsWith('/admin/mailbox') || 
         path.startsWith('/admin/financial-dashboard') || 
         path === '/leads/suppressions';
};

const CUSTOM_TIMER_PATHS = [
  '/reports',
  '/inbound-reporting',
  '/leads',
  '/inbound-leads',
  '/sales-snapshot',
  '/account-manager/pipeline'
];

const isCustomPath = (path: string) => {
  if (path === '/leads') return true;
  return CUSTOM_TIMER_PATHS.some(p => p !== '/leads' && (path === p || path.startsWith(p + '/')));
};

const getPageNameFromPath = (path: string) => {
  if (path === '/leads/archive') return 'Archived Leads';
  if (path === '/leads/map') return 'Territory Map';
  if (path.startsWith('/leads/')) return 'Lead Profile';
  if (path === '/tasks') return 'Tasks';
  if (path === '/appointments') return 'Appointments';
  if (path === '/calls') return 'Calls';
  if (path === '/visit-notes') return 'Visit Notes';
  if (path === '/app-tickets') return 'App Tickets';
  if (path === '/app-tickets/create') return 'Create Ticket';
  const segment = path.split('/').filter(Boolean).pop() || '';
  if (!segment) return 'Dashboard';
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
};
