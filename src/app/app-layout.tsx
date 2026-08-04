
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Briefcase, LogOut, Archive, FileText, BarChart2, User, UserCheck, ChevronsUpDown, Phone, ListTodo, Calendar, CalendarOff, CalendarCheck, PlusCircle, Map, Star, Route, History, BarChart3, LayoutDashboard, Settings, Database, CheckSquare, Save, CheckCircle2, ClipboardCheck, LayoutGrid, Clock, MapPin, AlertCircle, Inbox, Mail, ShieldAlert, ChevronRight, ChevronDown, Building, ListFilter, ScanLine, Package, Users, Ticket, HelpCircle, Activity, DollarSign, Sparkles, Laptop, Search, PanelLeft, Layers, UserX, ArrowUpRight, XCircle, Tag, Plus, X, Globe } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { usePermissions } from "@/hooks/use-permissions"
import { useSidebar } from "@/components/ui/sidebar"
import { useEffect, useState, useRef } from "react"
import PerformanceTimer from "@/components/performance-timer"
import { AccessDenied } from "@/components/access-denied"
import { Loader, FullScreenLoader } from "@/components/ui/loader"
import { NotificationCenter } from "@/components/notification-center"
import { FranchiseeSwitcher } from "@/components/franchisee-switcher"
import { UniversalSearch } from "@/components/universal-search"
import { CommandPalette } from "@/components/command-palette"
import { salesReps, ALLOWED_ASK_UIDS, EXCLUDED_LOGIN_ACTIVITY_UIDS } from "@/lib/constants"
import { DailyAreaLogDialog } from "@/components/daily-area-log-dialog"
import { UnassignedCallDialog } from "@/components/unassigned-call-dialog"
import { getTodayDeploymentForUser } from "@/services/firebase"
import { useOnboarding } from "@/components/onboarding/onboarding-provider"
import { AskChatbot } from "@/components/ask/ask-chatbot"
import { useDialingSession } from "@/hooks/use-dialing-session"
import { usePerformance } from "@/hooks/use-performance"
import { cn } from "@/lib/utils"


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userProfile, loading, signOut, isSigningOut, isSigningIn, isSuperAdmin, switchRole, updateUserProfile } = useAuth()
  const { canView } = usePermissions()
  const { isMobile, state, toggleSidebar, setOpenMobile } = useSidebar()
  const { startTour } = useOnboarding()
  const { isSessionActive, elapsedTime, sessionLeadIds, leadsVisited, endSession } = useDialingSession()
  const { loadTime, setLoadTime, pageName, setPageName, isCustom, setIsCustom } = usePerformance()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  const getActiveGroupForPath = (path: string): string | null => {
    if (path.startsWith('/admin/dashboard') || path.startsWith('/admin/financial-dashboard') || path.startsWith('/admin/mailbox')) {
      return 'dashboards';
    }
    if (path.startsWith('/account-lookup') || path.startsWith('/ask')) {
      return 'search-ai';
    }
    if (path === '/leads/map') return 'field-logistics';
    if (path.startsWith('/leads') || path.startsWith('/inbound-leads') || path.startsWith('/franchisee-leads') || path.startsWith('/admin/marketing/import-leads') || path.startsWith('/franchisee-lead-verification') || path.startsWith('/admin/in-review-leads') || path.startsWith('/admin/all-leads') || path.startsWith('/admin/unassigned-leads') || path.startsWith('/account-manager/pipeline') || path.startsWith('/signed-customers') || path.startsWith('/lost-customers')) {
      return 'sales-crm';
    }
    if (path.startsWith('/customer-success') && !path.includes('/reporting')) {
      return 'customer-success-group';
    }
    if (path.startsWith('/field-sales') || path.startsWith('/capture-visit') || path.startsWith('/visit-notes') || path.startsWith('/saved-routes') || path.startsWith('/prospecting-areas') || path.startsWith('/completed-routes')) {
      return 'field-logistics';
    }
    if ((path.startsWith('/admin/marketing') && !path.startsWith('/admin/marketing/import-leads')) || path.startsWith('/leads/suppressions') || path.startsWith('/admin/brand-bot')) {
      return 'marketing-group';
    }
    if (path.startsWith('/lpo-leads') || path.startsWith('/lpo-opportunities')) {
      return 'partners-group';
    }
    if (path.startsWith('/admin/tickets') || path.startsWith('/scans') || path.startsWith('/appointments') || path.startsWith('/calls') || path.startsWith('/unassigned_calls') || path.startsWith('/transcripts') || path.startsWith('/check-ins')) {
      if (path === '/admin/tickets/reporting' || path === '/scans/report') return 'analytics-reports';
      return 'ops-history';
    }
    if (path.startsWith('/sales-snapshot') || path.startsWith('/reports') || path.startsWith('/inbound-reporting') || path.startsWith('/admin/lifecycle-dashboard') || path.startsWith('/account-manager/reports') || path.startsWith('/customer-success/reporting') || path.startsWith('/field-activity-report') || path.startsWith('/admin/deployments')) {
      return 'analytics-reports';
    }
    if (path.startsWith('/admin/franchisees')) {
      return 'network-group';
    }
    return null;
  };

  const isGroupCollapsed = (groupId: string): boolean => {
    if (collapsedGroups[groupId] !== undefined) {
      return collapsedGroups[groupId];
    }
    const activeGroup = getActiveGroupForPath(pathname);
    if (activeGroup === groupId) {
      return false; // Auto-open active group on load when expanded
    }
    return true; // Collapse other groups by default when expanded
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const isCurrentlyCollapsed = isGroupCollapsed(groupId);
      const newState = { ...prev, [groupId]: !isCurrentlyCollapsed };
      try {
        localStorage.setItem('prospectplus_collapsed_groups', JSON.stringify(newState));
      } catch {}
      return newState;
    });
  };

  const DEFAULT_PINNED: string[] = [];
  const [pinnedPaths, setPinnedPaths] = useState<string[]>([]);
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    if (!user || !userProfile) {
      setPinnedPaths([]);
      return;
    }

    const userId = user.uid || userProfile.uid;
    const userPins = userProfile.pinnedNav ?? userProfile.pinnedPaths;

    if (Array.isArray(userPins)) {
      setPinnedPaths(userPins);
      try {
        localStorage.setItem(`prospectplus_pinned_nav_${userId}`, JSON.stringify(userPins));
      } catch {}
      return;
    }

    // Fallback to user-scoped localStorage if not set in user profile yet
    try {
      const saved = localStorage.getItem(`prospectplus_pinned_nav_${userId}`);
      if (saved) {
        setPinnedPaths(JSON.parse(saved));
      } else {
        setPinnedPaths([]);
      }
    } catch {
      setPinnedPaths([]);
    }
  }, [user, userProfile]);

  const togglePinItem = (href: string) => {
    if (!user && !userProfile) return;
    const userId = user?.uid || userProfile?.uid;

    setPinnedPaths(prev => {
      let updated: string[];
      if (prev.includes(href)) {
        updated = prev.filter(p => p !== href);
      } else {
        updated = [...prev, href];
      }

      if (userId) {
        try {
          localStorage.setItem(`prospectplus_pinned_nav_${userId}`, JSON.stringify(updated));
        } catch {}
      }

      if (user && userProfile && updateUserProfile) {
        updateUserProfile({ pinnedNav: updated, pinnedPaths: updated });
      }

      return updated;
    });
  };

  const PINNABLE_ITEMS: Record<string, { label: string; category: string; icon: React.ElementType; href: string }> = {
    // Search & AI
    '/account-lookup': { label: 'Universal Lookup', category: 'Search & AI', icon: Search, href: '/account-lookup' },
    '/ask': { label: 'Ask Prospect+', category: 'Search & AI', icon: Sparkles, href: '/ask' },

    // Dashboards
    '/admin/dashboard': { label: 'Executive Dashboard', category: 'Dashboards', icon: LayoutDashboard, href: '/admin/dashboard' },
    '/admin/financial-dashboard': { label: 'Financial Dashboard', category: 'Dashboards', icon: DollarSign, href: '/admin/financial-dashboard' },
    '/admin/mailbox': { label: 'AI Mailbox', category: 'Dashboards', icon: Sparkles, href: '/admin/mailbox' },

    // Sales & CRM
    '/leads/new': { label: 'New Lead', category: 'Sales & CRM', icon: PlusCircle, href: '/leads/new' },
    '/leads': { label: 'Outbound Leads', category: 'Sales & CRM', icon: Briefcase, href: '/leads' },
    '/inbound-leads': { label: 'Inbound Leads', category: 'Sales & CRM', icon: Inbox, href: '/inbound-leads' },
    '/franchisee-leads': { label: 'Franchisee Leads', category: 'Sales & CRM', icon: Briefcase, href: '/franchisee-leads' },
    '/admin/marketing/import-leads': { label: 'Import Leads', category: 'Sales & CRM', icon: PlusCircle, href: '/admin/marketing/import-leads' },
    '/franchisee-lead-verification': { label: 'Franchisee Lead Review', category: 'Sales & CRM', icon: UserCheck, href: '/franchisee-lead-verification' },
    '/admin/in-review-leads': { label: 'In Review Leads', category: 'Sales & CRM', icon: ClipboardCheck, href: '/admin/in-review-leads' },
    '/admin/all-leads': { label: 'Master Leads Directory', category: 'Sales & CRM', icon: Layers, href: '/admin/all-leads' },
    '/admin/unassigned-leads': { label: 'Unassigned Leads', category: 'Sales & CRM', icon: ListTodo, href: '/admin/unassigned-leads' },
    '/leads/archive': { label: 'Archived Leads', category: 'Sales & CRM', icon: Archive, href: '/leads/archive' },
    '/account-manager/pipeline': { label: 'AM Pipeline', category: 'Sales & CRM', icon: ListTodo, href: '/account-manager/pipeline' },
    '/signed-customers': { label: 'Signed Customers', category: 'Sales & CRM', icon: Star, href: '/signed-customers' },
    '/lost-customers': { label: 'Lost Customers', category: 'Sales & CRM', icon: UserX, href: '/lost-customers' },

    // Customer Success
    '/customer-success/onboarding': { label: 'Onboarding Requests', category: 'Customer Success', icon: CalendarCheck, href: '/customer-success/onboarding' },
    '/customer-success/pipeline': { label: 'CS Pipeline', category: 'Customer Success', icon: ListTodo, href: '/customer-success/pipeline' },
    '/customer-success/cs-requests': { label: 'CS Requests', category: 'Customer Success', icon: ListTodo, href: '/customer-success/cs-requests' },
    '/customer-success/cancellations': { label: 'CS Requests', category: 'Customer Success', icon: ListTodo, href: '/customer-success/cs-requests' },
    '/customer-success/reporting': { label: 'CS Reporting', category: 'Customer Success', icon: BarChart3, href: '/customer-success/reporting' },

    // Field & Logistics
    '/field-sales': { label: 'Door-to-Door', category: 'Field & Logistics', icon: Briefcase, href: '/field-sales' },
    '/capture-visit': { label: 'Capture Visit', category: 'Field & Logistics', icon: PlusCircle, href: '/capture-visit' },
    '/visit-notes': { label: 'Visit Notes', category: 'Field & Logistics', icon: FileText, href: '/visit-notes' },
    '/saved-routes': { label: 'Saved Routes', category: 'Field & Logistics', icon: Save, href: '/saved-routes' },
    '/prospecting-areas': { label: 'Prospecting Areas', category: 'Field & Logistics', icon: LayoutGrid, href: '/prospecting-areas' },
    '/field-sales/schedules': { label: 'Team Schedules', category: 'Field & Logistics', icon: Clock, href: '/field-sales/schedules' },
    '/completed-routes': { label: 'Completed Routes', category: 'Field & Logistics', icon: CheckCircle2, href: '/completed-routes' },
    '/leads/map': { label: 'Route Planner Map', category: 'Field & Logistics', icon: Map, href: '/leads/map' },

    // Marketing
    '/admin/marketing/lead-campaigns': { label: 'Lead Campaigns', category: 'Marketing', icon: Tag, href: '/admin/marketing/lead-campaigns' },
    '/admin/marketing/campaigns': { label: 'Campaigns & Queues', category: 'Marketing', icon: Mail, href: '/admin/marketing/campaigns' },
    '/admin/marketing/nurture-journeys': { label: 'Nurture Journeys', category: 'Marketing', icon: Settings, href: '/admin/marketing/nurture-journeys' },
    '/admin/marketing/nurture-report': { label: 'Nurture Reporting', category: 'Marketing', icon: BarChart2, href: '/admin/marketing/nurture-report' },
    '/admin/marketing': { label: 'Templates & Library', category: 'Marketing', icon: FileText, href: '/admin/marketing' },
    '/admin/marketing/lists': { label: 'Marketing Lists', category: 'Marketing', icon: ListFilter, href: '/admin/marketing/lists' },
    '/leads/suppressions': { label: 'Suppression & Opt-Outs', category: 'Marketing', icon: ShieldAlert, href: '/leads/suppressions' },
    '/admin/brand-bot': { label: 'Brand Bot', category: 'Marketing', icon: Settings, href: '/admin/brand-bot' },

    // Partners
    '/lpo-leads': { label: 'Participating LPOs', category: 'Partners', icon: Building, href: '/lpo-leads' },
    '/lpo-opportunities': { label: 'Shared Opportunities', category: 'Partners', icon: ArrowUpRight, href: '/lpo-opportunities' },

    // Operations & History
    '/admin/tickets': { label: 'All Tickets', category: 'Operations & History', icon: Ticket, href: '/admin/tickets' },
    '/admin/tickets/create': { label: 'Create Ticket', category: 'Operations & History', icon: PlusCircle, href: '/admin/tickets/create' },
    '/admin/tickets/operations': { label: 'Operations Tickets', category: 'Operations & History', icon: Settings, href: '/admin/tickets/operations' },
    '/admin/tickets/it': { label: 'IT Tickets', category: 'Operations & History', icon: Laptop, href: '/admin/tickets/it' },
    '/admin/tickets/archived': { label: 'Archived Tickets', category: 'Operations & History', icon: Archive, href: '/admin/tickets/archived' },
    '/scans': { label: 'Scan Events', category: 'Operations & History', icon: Package, href: '/scans' },
    '/scans/top-users': { label: 'Top Users', category: 'Operations & History', icon: Star, href: '/scans/top-users' },
    '/scans/top-users/contact-report': { label: 'Top Users Contact Report', category: 'Operations & History', icon: Phone, href: '/scans/top-users/contact-report' },
    '/appointments': { label: 'All Appointments', category: 'Operations & History', icon: Calendar, href: '/appointments' },
    '/calls': { label: 'All Calls', category: 'Operations & History', icon: Phone, href: '/calls' },
    '/unassigned_calls': { label: 'Unassigned Calls', category: 'Operations & History', icon: HelpCircle, href: '/unassigned_calls' },
    '/transcripts': { label: 'All Transcripts', category: 'Operations & History', icon: FileText, href: '/transcripts' },
    '/check-ins': { label: 'Check-ins', category: 'Operations & History', icon: CheckSquare, href: '/check-ins' },

    // Analytics & Reports
    '/sales-snapshot': { label: 'Sales Snapshot', category: 'Analytics & Reports', icon: Layers, href: '/sales-snapshot' },
    '/reports': { label: 'Outbound Reporting', category: 'Analytics & Reports', icon: BarChart2, href: '/reports' },
    '/inbound-reporting': { label: 'Inbound Reporting', category: 'Analytics & Reports', icon: Inbox, href: '/inbound-reporting' },
    '/admin/lifecycle-dashboard': { label: 'Lifecycle Dashboard', category: 'Analytics & Reports', icon: Activity, href: '/admin/lifecycle-dashboard' },
    '/account-manager/reports': { label: 'AM Reporting', category: 'Analytics & Reports', icon: BarChart3, href: '/account-manager/reports' },
    '/admin/tickets/reporting': { label: 'Ticket Reporting', category: 'Analytics & Reports', icon: BarChart2, href: '/admin/tickets/reporting' },
    '/scans/report': { label: 'Scan Reporting', category: 'Analytics & Reports', icon: BarChart2, href: '/scans/report' },
    '/field-activity-report': { label: 'Field Activity', category: 'Analytics & Reports', icon: BarChart3, href: '/field-activity-report' },
    '/admin/deployments': { label: 'Deployment History', category: 'Analytics & Reports', icon: MapPin, href: '/admin/deployments' },

    // Network
    '/admin/franchisees/directory': { label: 'Franchisees Directory', category: 'Network', icon: Building, href: '/admin/franchisees/directory' },
    '/admin/franchisees/territory-map': { label: 'Franchisee Territory Map', category: 'Network', icon: Map, href: '/admin/franchisees/territory-map' },
  };

  const toggleExpand = (key: string) => {
    setExpandedStates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (pathname) {
      if (pathname.startsWith('/leads') || pathname.startsWith('/inbound-leads') || pathname.startsWith('/franchisee-leads') || pathname.startsWith('/admin/marketing/import-leads') || pathname.startsWith('/admin/in-review-leads')) {
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
      if (pathname.startsWith('/customer-success') && !pathname.includes('/reporting')) {
        setExpandedStates(prev => ({ ...prev, 'customer-success': true }));
      }
      if (pathname.startsWith('/lpo-leads') || pathname.startsWith('/lpo-opportunities')) {
        setExpandedStates(prev => ({ ...prev, 'lpo-plus': true }));
      }
      if (pathname.startsWith('/signed-customers') || pathname.startsWith('/lost-customers')) {
        setExpandedStates(prev => ({ ...prev, 'customers': true }));
      }
      if (pathname.startsWith('/sales-snapshot') || pathname.startsWith('/reports') || pathname.startsWith('/inbound-reporting') || pathname.startsWith('/admin/lifecycle-dashboard')) {
        setExpandedStates(prev => ({ ...prev, 'sales-reports': true }));
      }
      if (pathname.startsWith('/account-manager/reports') || pathname.startsWith('/customer-success/reporting') || pathname.startsWith('/field-activity-report') || pathname.startsWith('/admin/deployments')) {
        setExpandedStates(prev => ({ ...prev, 'op-reports': true }));
      }
      setExpandedStates(prev => ({ ...prev, 'reporting': false }));
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
            localStorage.removeItem('session_init_time');
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
  
  if (isAuthPage || pathname.startsWith('/customer-request/') || pathname.startsWith('/scf/') || pathname.startsWith('/sof/') || pathname.startsWith('/lpo-opportunity/') || pathname.startsWith('/hotel-leads') || pathname.startsWith('/book/') || pathname.startsWith('/localmile-registration/')) {
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
  const allowedRoutePlannerRoles = ['admin', 'super user', 'superadmin', 'Franchisee', 'franchisee', 'Lead Gen', 'Lead Gen Admin', 'Dashback'];
  const canViewFieldSalesMap = (isSuperAdmin || (userProfile?.activeRole && allowedRoutePlannerRoles.includes(userProfile.activeRole))) && userProfile?.activeRole !== 'user';
  const canViewFieldSalesGroup = canViewFieldSalesD2D || canViewVisits || canViewFieldSalesMap || canViewD2D;
  const canViewLeadManagementOutbound = canView('outboundLeads');
  const canViewLeadManagementArchive = userProfile?.activeRole && !userProfile.activeRole.includes('Lead Gen') && !userProfile.activeRole.includes('Field Sales') && userProfile.activeRole !== 'Dashback' && userProfile.activeRole !== 'Franchisee';
  const isUserRole = userProfile?.activeRole === 'user' || userProfile?.activeRole?.toLowerCase() === 'user' || userProfile?.role === 'user';
  const canImportLeads = (isSuperAdmin || canView('importLeads')) && !isUserRole;
  const isFranchiseeRole = userProfile?.activeRole === 'Franchisee' || userProfile?.activeRole?.toLowerCase() === 'franchisee';
  const canViewFranchiseeVerification = (isSuperAdmin || userProfile?.activeRole === 'admin' || canView('franchiseeVerification')) && !isUserRole;
  const canViewHistoryAppointments = canView('historyAppointments');
  const canViewHistoryCallsTranscripts = canView('historyCallsTranscripts');
  const canViewTerritoryMap = isSuperAdmin || (userProfile?.activeRole as string) === 'Franchisee' || (userProfile?.activeRole as string)?.toLowerCase() === 'franchisee' || (userProfile?.activeRole as string) === 'Executive' || (userProfile?.activeRole as string) === 'Outbound Admin';
  const canViewFranchisees = canView('franchisees');
  const canViewAccountManagerPipeline = canView('accountManagerPipeline');
  const canViewCustomerSuccessPipeline = canView('customerSuccessPipeline');
  const canViewCustomerSuccessOnboarding = canView('customerSuccessOnboarding') || user?.uid === 'Uh71ctLejpg8dietKngBQwnqivI2';
  const canViewScans = canView('scans');
  const canViewTickets = canView('tickets');
  const canViewLpoLeads = canView('lpoLeads');
  const canAccessAsk = !!userProfile?.uid && ALLOWED_ASK_UIDS.includes(userProfile.uid);
  const activeRoleStr = userProfile?.activeRole as string;
  const canViewFranchiseProspects = isSuperAdmin || ['admin', 'super user', 'Operations', 'operations'].includes(activeRoleStr);
  const isAdmin = isSuperAdmin || activeRoleStr === 'admin' || activeRoleStr === 'super user' || activeRoleStr === 'Sales Manager' || activeRoleStr === 'Marketing Manager' || activeRoleStr === 'Marketing Admin' || activeRoleStr === 'Outbound Admin' || activeRoleStr === 'Lead Gen Admin';
  const isMarketingAdmin = isSuperAdmin || activeRoleStr === 'admin' || activeRoleStr === 'super user' || activeRoleStr === 'Marketing Manager' || activeRoleStr === 'Marketing Admin' || userProfile?.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';
  const canViewInReviewLeads = (isAdmin || isSuperAdmin || canView('inReviewLeads')) && !isUserRole;
  const canViewMasterLeadsDirectory = (isSuperAdmin || activeRoleStr === 'admin' || activeRoleStr === 'super user' || activeRoleStr === 'Sales Manager' || activeRoleStr === 'Marketing Manager' || activeRoleStr === 'Marketing Admin') && !isUserRole && activeRoleStr !== 'Outbound Admin';
  const canViewLeadManagementGroup = canCreateLead || isFranchiseeRole || canViewLeadManagementOutbound || canViewInbound || canViewLeadManagementArchive || canImportLeads || canViewFranchiseeVerification || canViewInReviewLeads || canViewMasterLeadsDirectory;
  
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
  const canViewCustomers = canView('signedCustomers');

  return (
    <>
      <style>{`
        .sidebar-nav-theme {
          font-family: 'Inter', sans-serif;
        }
        .sidebar-nav-theme [data-sidebar="group"] {
          padding-top: 0.125rem !important;
          padding-bottom: 0.125rem !important;
        }
        .sidebar-nav-theme [data-sidebar="group-label"] {
          font-size: 0.6875rem !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.06em !important;
          color: #ffffff !important;
          padding: 0.375rem 0.75rem 0.125rem !important;
          height: auto !important;
          min-height: 0 !important;
        }
        .sidebar-nav-theme [data-sidebar="menu-button"] {
          height: 2rem !important;
          font-size: 0.8125rem !important;
        }
        .sidebar-nav-theme [data-sidebar="menu-sub-button"] {
          height: 1.875rem !important;
          font-size: 0.775rem !important;
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
        <SidebarHeader className="flex items-center justify-between px-3 py-2 h-14 border-b border-sidebar-border overflow-hidden">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpenMobile(false)}>
            <div className="logo-text whitespace-nowrap">
              {state === "collapsed" && !isMobile ? (
                <span>p<span className="logo-plus">+</span></span>
              ) : (
                <span>prospect<span className="logo-plus">.plus</span></span>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                onClick={() => setOpenMobile(false)}
                title="Close Navigation"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <SidebarTrigger className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white transition-colors" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          {state === "collapsed" && !isMobile ? (
            <SidebarMenu className="py-2 gap-2">
              {/* Pinned */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip="Pinned Shortcuts" 
                  isActive={false} 
                  onClick={() => {
                    setCollapsedGroups(prev => ({ ...prev, 'pinned': false }));
                    toggleSidebar();
                  }}
                  className="hover:bg-sidebar-accent"
                >
                  <Star className="h-4 w-4 fill-[#eaf143] text-[#eaf143]" />
                  <span>Pinned Shortcuts</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Group 1: DASHBOARDS */}
              {(canAccessMailbox || canView('executiveDashboard') || (isSuperAdmin && userProfile?.activeRole !== 'user')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Dashboards" 
                    isActive={getActiveGroupForPath(pathname) === 'dashboards'} 
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, 'dashboards': false }));
                      toggleSidebar();
                    }}
                    className="hover:bg-sidebar-accent"
                  >
                    <LayoutDashboard className="h-4 w-4 text-white" />
                    <span>Dashboards</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Group 2: SEARCH & AI */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip="Search & AI" 
                  isActive={getActiveGroupForPath(pathname) === 'search-ai'} 
                  onClick={() => {
                    setCollapsedGroups(prev => ({ ...prev, 'search-ai': false }));
                    toggleSidebar();
                  }}
                  className="hover:bg-sidebar-accent"
                >
                  <Sparkles className="h-4 w-4 text-[#eaf143]" />
                  <span>Search & AI</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Group 3: SALES & CRM */}
              {(canViewLeadManagementGroup || canViewAccountManagerPipeline || canViewCustomers) && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Sales & CRM" 
                    isActive={getActiveGroupForPath(pathname) === 'sales-crm'} 
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, 'sales-crm': false }));
                      toggleSidebar();
                    }}
                    className="hover:bg-sidebar-accent"
                  >
                    <Briefcase className="h-4 w-4 text-white" />
                    <span>Sales & CRM</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Group 4: CUSTOMER SUCCESS */}
              {canViewCustomerSuccessPipeline && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Customer Success" 
                    isActive={getActiveGroupForPath(pathname) === 'customer-success-group'} 
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, 'customer-success-group': false }));
                      toggleSidebar();
                    }}
                    className="hover:bg-sidebar-accent"
                  >
                    <Users className="h-4 w-4 text-white" />
                    <span>Customer Success</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Group 5: FIELD & LOGISTICS */}
              {canViewFieldSalesGroup && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Field & Logistics" 
                    isActive={getActiveGroupForPath(pathname) === 'field-logistics'} 
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, 'field-logistics': false }));
                      toggleSidebar();
                    }}
                    className="hover:bg-sidebar-accent"
                  >
                    <Map className="h-4 w-4 text-white" />
                    <span>Field & Logistics</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Group 6: MARKETING */}
              {canViewMarketingGroup && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Marketing" 
                    isActive={getActiveGroupForPath(pathname) === 'marketing-group'} 
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, 'marketing-group': false }));
                      toggleSidebar();
                    }}
                    className="hover:bg-sidebar-accent"
                  >
                    <Mail className="h-4 w-4 text-white" />
                    <span>Marketing</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Group 7: PARTNERS */}
              {canViewLpoLeads && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Partners" 
                    isActive={getActiveGroupForPath(pathname) === 'partners-group'} 
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, 'partners-group': false }));
                      toggleSidebar();
                    }}
                    className="hover:bg-sidebar-accent"
                  >
                    <Building className="h-4 w-4 text-white" />
                    <span>Partners</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Group 8: OPERATIONS & HISTORY */}
              {(canViewTickets || canViewScans || canViewHistory) && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Operations & History" 
                    isActive={getActiveGroupForPath(pathname) === 'ops-history'} 
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, 'ops-history': false }));
                      toggleSidebar();
                    }}
                    className="hover:bg-sidebar-accent"
                  >
                    <Ticket className="h-4 w-4 text-white" />
                    <span>Operations & History</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Group 9: ANALYTICS & REPORTS */}
              {(canViewReporting || isFranchiseeRole) && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Analytics & Reports" 
                    isActive={getActiveGroupForPath(pathname) === 'analytics-reports'} 
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, 'analytics-reports': false }));
                      toggleSidebar();
                    }}
                    className="hover:bg-sidebar-accent"
                  >
                    <BarChart2 className="h-4 w-4 text-white" />
                    <span>Analytics & Reports</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Group 10: NETWORK */}
              {canViewFranchisees && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Network" 
                    isActive={getActiveGroupForPath(pathname) === 'network-group'} 
                    onClick={() => {
                      setCollapsedGroups(prev => ({ ...prev, 'network-group': false }));
                      toggleSidebar();
                    }}
                    className="hover:bg-sidebar-accent"
                  >
                    <Globe className="h-4 w-4 text-white" />
                    <span>Network</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          ) : (
            <>
              {/* Main Pages Section for Mobile / Franchisees */}
              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center gap-1.5 text-[#eaf143] font-bold text-xs uppercase tracking-wider">
                  <Star className="h-3 w-3 fill-[#eaf143] text-[#eaf143]" />
                  Main Pages
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/leads/new")} tooltip="Create New Lead">
                        <Link href="/leads/new" onClick={() => setOpenMobile(false)}>
                          <PlusCircle className="text-[#eaf143] h-4 w-4" />
                          <span className="font-semibold text-white">Create New Lead</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/account-lookup")} tooltip="Universal Lookup">
                        <Link href="/account-lookup" onClick={() => setOpenMobile(false)}>
                          <Search className="text-[#eaf143] h-4 w-4" />
                          <span className="font-semibold text-white">Universal Lookup</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/sales-snapshot")} tooltip="Sales SnapShot">
                        <Link href="/sales-snapshot" onClick={() => setOpenMobile(false)}>
                          <Layers className="text-[#eaf143] h-4 w-4" />
                          <span className="font-semibold text-white">Sales SnapShot</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/franchisee-leads") || (isActive("/leads") && isFranchiseeRole)} tooltip="Franchisee Leads">
                        <Link href={isFranchiseeRole ? "/franchisee-leads" : "/leads"} onClick={() => setOpenMobile(false)}>
                          <Briefcase className="text-[#eaf143] h-4 w-4" />
                          <span className="font-semibold text-white">{isFranchiseeRole ? "Franchisee Leads" : "Outbound Leads"}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              {/* Pinned Quick Access */}
              <SidebarGroup>
                <SidebarGroupLabel className="cursor-pointer hover:text-white transition-colors flex items-center justify-between select-none group/glabel">
                  <span onClick={() => toggleGroup('pinned')} className="flex items-center gap-1.5 text-[#eaf143] font-bold flex-1">
                    <Star className="h-3 w-3 fill-[#eaf143] text-[#eaf143]" />
                    Pinned
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPinModal(true);
                      }}
                      className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 rounded transition-colors"
                      title="Customize Pinned Shortcuts"
                    >
                      + Edit
                    </button>
                    <div onClick={() => toggleGroup('pinned')} className="p-0.5">
                      {isGroupCollapsed('pinned') ? (
                        <ChevronRight className="h-3 w-3 text-white transition-transform" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-white transition-transform" />
                      )}
                    </div>
                  </div>
                </SidebarGroupLabel>
                {!isGroupCollapsed('pinned') && (
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {pinnedPaths.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400 italic flex items-center justify-between">
                          <span>No pinned items</span>
                          <button 
                            type="button"
                            onClick={() => setShowPinModal(true)} 
                            className="text-[11px] text-[#eaf143] underline not-italic hover:text-white"
                          >
                            Add pins
                          </button>
                        </div>
                      ) : (
                        pinnedPaths.map(href => {
                          const item = PINNABLE_ITEMS[href];
                          if (!item) return null;
                          const ItemIcon = item.icon;
                          return (
                            <SidebarMenuItem key={href} className="group/pinitem relative flex items-center">
                              <SidebarMenuButton asChild isActive={isActive(href)} tooltip={item.label} className="w-full pr-7">
                                <Link href={href}>
                                  <ItemIcon />
                                  <span>{item.label}</span>
                                </Link>
                              </SidebarMenuButton>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  togglePinItem(href);
                                }}
                                className="absolute right-1 text-slate-400 hover:text-red-400 opacity-0 group-hover/pinitem:opacity-100 transition-opacity p-1"
                                title={`Unpin ${item.label}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </SidebarMenuItem>
                          );
                        })
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                )}
              </SidebarGroup>

              {/* Group 1: DASHBOARDS */}
              {(canAccessMailbox || canView('executiveDashboard') || (isSuperAdmin && userProfile?.activeRole !== 'user')) && (
                <SidebarGroup>
                  <SidebarGroupLabel 
                    onClick={() => toggleGroup('dashboards')} 
                    className="cursor-pointer hover:text-white transition-colors flex items-center justify-between select-none group/glabel"
                  >
                    <span className="flex items-center gap-1.5 text-white font-extrabold">
                      <LayoutDashboard className="h-3.5 w-3.5 text-white/90" />
                      <span>Dashboards</span>
                    </span>
                    {isGroupCollapsed('dashboards') ? (
                      <ChevronRight className="h-3 w-3 text-white transition-transform" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-white transition-transform" />
                    )}
                  </SidebarGroupLabel>
                  {!isGroupCollapsed('dashboards') && (
                    <SidebarGroupContent>
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
                    </SidebarMenu>
                  </SidebarGroupContent>
                  )}
                </SidebarGroup>
              )}

              {/* Group 2: SEARCH & AI */}
              <SidebarGroup>
                <SidebarGroupLabel 
                  onClick={() => toggleGroup('search-ai')} 
                  className="cursor-pointer hover:text-white transition-colors flex items-center justify-between select-none group/glabel"
                >
                  <span className="flex items-center gap-1.5 text-white font-extrabold">
                    <Sparkles className="h-3.5 w-3.5 text-[#eaf143]" />
                    <span>Search & AI</span>
                  </span>
                  {isGroupCollapsed('search-ai') ? (
                    <ChevronRight className="h-3 w-3 text-white transition-transform" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-white transition-transform" />
                  )}
                </SidebarGroupLabel>
                {!isGroupCollapsed('search-ai') && (
                  <SidebarGroupContent>
                    <SidebarMenu>
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
                      {canAccessAsk && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/ask")} tooltip="Ask Prospect+">
                            <Link href="/ask">
                              <Sparkles />
                              <span>Ask Prospect+</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                )}
              </SidebarGroup>

              {/* Group 3: SALES & CRM */}
              {(canViewLeadManagementGroup || canViewAccountManagerPipeline || canViewCustomers) && (
                <SidebarGroup>
                  <SidebarGroupLabel 
                    onClick={() => toggleGroup('sales-crm')} 
                    className="cursor-pointer hover:text-white transition-colors flex items-center justify-between select-none group/glabel"
                  >
                    <span className="flex items-center gap-1.5 text-white font-extrabold">
                      <Briefcase className="h-3.5 w-3.5 text-white/90" />
                      <span>Sales & CRM</span>
                    </span>
                    {isGroupCollapsed('sales-crm') ? (
                      <ChevronRight className="h-3 w-3 text-white transition-transform" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-white transition-transform" />
                    )}
                  </SidebarGroupLabel>
                  {!isGroupCollapsed('sales-crm') && (
                    <SidebarGroupContent>
                      <SidebarMenu>
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
                        {isFranchiseeRole ? (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/franchisee-leads")} tooltip="Franchisee Leads">
                              <Link href="/franchisee-leads">
                                <Briefcase />
                                <span>Franchisee Leads</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ) : (
                          <>
                            {canViewLeadManagementOutbound && (
                              <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={isActive("/leads") && !isActive("/leads/new") && !isActive("/leads/map") && !isActive("/leads/archive")} tooltip="Outbound Leads">
                                  <Link href="/leads">
                                    <Briefcase />
                                    <span>Outbound Leads</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                            {canViewInbound && (
                              <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={isActive("/inbound-leads")} tooltip="Inbound Leads">
                                  <Link href="/inbound-leads">
                                    <Inbox />
                                    <span>Inbound Leads</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                          </>
                        )}
                        {canImportLeads && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/marketing/import-leads")} tooltip="Import Leads">
                              <Link href="/admin/marketing/import-leads">
                                <PlusCircle />
                                <span>Import Leads</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewFranchiseeVerification && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/franchisee-lead-verification")} tooltip="Franchisee Lead Review">
                              <Link href="/franchisee-lead-verification">
                                <UserCheck />
                                <span>Franchisee Lead Review</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewInReviewLeads && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/in-review-leads")} tooltip="In Review Leads">
                              <Link href="/admin/in-review-leads">
                                <ClipboardCheck />
                                <span>In Review Leads</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewMasterLeadsDirectory && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/all-leads")} tooltip="Master Leads Directory">
                              <Link href="/admin/all-leads">
                                <Layers />
                                <span>Master Leads Directory</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canView('unassignedLeads') && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/unassigned-leads")} tooltip="Unassigned Leads">
                              <Link href="/admin/unassigned-leads">
                                <ListTodo />
                                <span>Unassigned Leads</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewLeadManagementArchive && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/leads/archive")} tooltip="Archived Leads">
                              <Link href="/leads/archive">
                                <Archive />
                                <span>Archived Leads</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewAccountManagerPipeline && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/account-manager/pipeline")} tooltip="AM Pipeline">
                              <Link href="/account-manager/pipeline">
                                <ListTodo />
                                <span>AM Pipeline</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewCustomers && (
                          <>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive("/signed-customers")} tooltip="Signed Customers">
                                <Link href="/signed-customers">
                                  <Star />
                                  <span>Signed Customers</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive("/lost-customers")} tooltip="Lost Customers">
                                <Link href="/lost-customers">
                                  <UserX />
                                  <span>Lost Customers</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              )}

              {/* Group 4: CUSTOMER SUCCESS */}
              {canViewCustomerSuccessPipeline && (
                <SidebarGroup>
                  <SidebarGroupLabel 
                    onClick={() => toggleGroup('customer-success-group')} 
                    className="cursor-pointer hover:text-white transition-colors flex items-center justify-between select-none group/glabel"
                  >
                    <span className="flex items-center gap-1.5 text-white font-extrabold">
                      <Users className="h-3.5 w-3.5 text-white/90" />
                      <span>Customer Success</span>
                    </span>
                    {isGroupCollapsed('customer-success-group') ? (
                      <ChevronRight className="h-3 w-3 text-white transition-transform" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-white transition-transform" />
                    )}
                  </SidebarGroupLabel>
                  {!isGroupCollapsed('customer-success-group') && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {canViewCustomerSuccessOnboarding && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/customer-success/onboarding")} tooltip="Onboarding Requests">
                              <Link href="/customer-success/onboarding">
                                <CalendarCheck />
                                <span>Onboarding Requests</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/customer-success/pipeline")} tooltip="CS Pipeline">
                            <Link href="/customer-success/pipeline">
                              <ListTodo />
                              <span>CS Pipeline</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/customer-success/cs-requests") || isActive("/customer-success/cancellations")} tooltip="CS Requests">
                            <Link href="/customer-success/cs-requests">
                              <ListTodo />
                              <span>CS Requests</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/customer-success/reporting")} tooltip="CS Reporting">
                            <Link href="/customer-success/reporting">
                              <BarChart3 />
                              <span>CS Reporting</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              )}

              {/* Group 5: FIELD & LOGISTICS */}
              {canViewFieldSalesGroup && (
                <SidebarGroup>
                  <SidebarGroupLabel 
                    onClick={() => toggleGroup('field-logistics')} 
                    className="cursor-pointer hover:text-white transition-colors flex items-center justify-between select-none group/glabel"
                  >
                    <span className="flex items-center gap-1.5 text-white font-extrabold">
                      <Map className="h-3.5 w-3.5 text-white/90" />
                      <span>Field & Logistics</span>
                    </span>
                    {isGroupCollapsed('field-logistics') ? (
                      <ChevronRight className="h-3 w-3 text-white transition-transform" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-white transition-transform" />
                    )}
                  </SidebarGroupLabel>
                  {!isGroupCollapsed('field-logistics') && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {canViewFieldSalesD2D && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/field-sales")} tooltip="Door-to-Door">
                              <Link href="/field-sales">
                                <Briefcase />
                                <span>Door-to-Door</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canCaptureVisit && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/capture-visit')} tooltip="Capture Visit">
                              <Link href="/capture-visit">
                                <PlusCircle />
                                <span>Capture Visit</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canProcessVisits && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/visit-notes')} tooltip="Visit Notes">
                              <Link href="/visit-notes">
                                <FileText />
                                <span>Visit Notes</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewD2D && (
                          <>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive("/saved-routes")} tooltip="Saved Routes">
                                <Link href="/saved-routes">
                                  <Save />
                                  <span>Saved Routes</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive("/prospecting-areas")} tooltip="Prospecting Areas">
                                <Link href="/prospecting-areas">
                                  <LayoutGrid />
                                  <span>Prospecting Areas</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            {canView('teamSchedules') && (
                              <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={isActive("/field-sales/schedules")} tooltip="Team Schedules">
                                  <Link href="/field-sales/schedules">
                                    <Clock />
                                    <span>Team Schedules</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive("/completed-routes")} tooltip="Completed Routes">
                                <Link href="/completed-routes">
                                  <CheckCircle2 />
                                  <span>Completed Routes</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </>
                        )}
                        {canViewFieldSalesMap && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/leads/map")} tooltip="Route Planner Map">
                              <Link href="/leads/map">
                                <Map />
                                <span>Route Planner Map</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              )}

              {/* Group 6: MARKETING */}
              {canViewMarketingGroup && (
                <SidebarGroup>
                  <SidebarGroupLabel 
                    onClick={() => toggleGroup('marketing-group')} 
                    className="cursor-pointer hover:text-white transition-colors flex items-center justify-between select-none group/glabel"
                  >
                    <span className="flex items-center gap-1.5 text-white font-extrabold">
                      <Mail className="h-3.5 w-3.5 text-white/90" />
                      <span>Marketing</span>
                    </span>
                    {isGroupCollapsed('marketing-group') ? (
                      <ChevronRight className="h-3 w-3 text-white transition-transform" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-white transition-transform" />
                    )}
                  </SidebarGroupLabel>
                  {!isGroupCollapsed('marketing-group') && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {isMarketingAdmin && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/marketing/lead-campaigns")} tooltip="Lead Campaigns">
                              <Link href="/admin/marketing/lead-campaigns">
                                <Tag />
                                <span>Lead Campaigns</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {isMarketingAdmin && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/marketing/campaigns")} tooltip="Campaigns & Queues">
                              <Link href="/admin/marketing/campaigns">
                                <Mail />
                                <span>Campaigns & Queues</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {isMarketingAdmin && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/marketing/nurture-journeys")} tooltip="Nurture Journeys">
                              <Link href="/admin/marketing/nurture-journeys">
                                <Settings />
                                <span>Nurture Journeys</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {isMarketingAdmin && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/marketing/nurture-report")} tooltip="Nurture Reporting">
                              <Link href="/admin/marketing/nurture-report">
                                <BarChart2 />
                                <span>Nurture Reporting</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/admin/marketing") && !isActive("/admin/marketing/lists") && !isActive("/admin/marketing/campaigns") && !isActive("/admin/marketing/nurture-journeys") && !isActive("/admin/marketing/nurture-report") && !isActive("/admin/marketing/lead-campaigns")} tooltip="Templates & Library">
                            <Link href="/admin/marketing">
                              <FileText />
                              <span>Templates & Library</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {isMarketingAdmin && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/marketing/lists")} tooltip="Marketing Lists">
                              <Link href="/admin/marketing/lists">
                                <ListFilter />
                                <span>Marketing Lists</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {isMarketingAdmin && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/leads/suppressions")} tooltip="Suppression & Opt-Outs">
                              <Link href="/leads/suppressions">
                                <ShieldAlert />
                                <span>Suppression & Opt-Outs</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {isMarketingAdmin && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/brand-bot")} tooltip="Brand Bot">
                              <Link href="/admin/brand-bot">
                                <Settings />
                                <span>Brand Bot</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              )}

              {/* Group 7: PARTNERS */}
              {canViewLpoLeads && (
                <SidebarGroup>
                  <SidebarGroupLabel 
                    onClick={() => toggleGroup('partners-group')} 
                    className="cursor-pointer hover:text-white transition-colors flex items-center justify-between select-none group/glabel"
                  >
                    <span className="flex items-center gap-1.5 text-white font-extrabold">
                      <Building className="h-3.5 w-3.5 text-white/90" />
                      <span>Partners</span>
                    </span>
                    {isGroupCollapsed('partners-group') ? (
                      <ChevronRight className="h-3 w-3 text-white transition-transform" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-white transition-transform" />
                    )}
                  </SidebarGroupLabel>
                  {!isGroupCollapsed('partners-group') && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/lpo-leads")} tooltip="Participating LPOs">
                            <Link href="/lpo-leads">
                              <Building />
                              <span>Participating LPOs</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/lpo-opportunities")} tooltip="Shared Opportunities">
                            <Link href="/lpo-opportunities">
                              <ArrowUpRight />
                              <span>Shared Opportunities</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              )}

              {/* Group 8: OPERATIONS & HISTORY */}
              {(canViewTickets || canViewScans || canViewHistory) && (
                <SidebarGroup>
                  <SidebarGroupLabel 
                    onClick={() => toggleGroup('ops-history')} 
                    className="cursor-pointer hover:text-white transition-colors flex items-center justify-between select-none group/glabel"
                  >
                    <span className="flex items-center gap-1.5 text-white font-extrabold">
                      <Ticket className="h-3.5 w-3.5 text-white/90" />
                      <span>Operations & History</span>
                    </span>
                    {isGroupCollapsed('ops-history') ? (
                      <ChevronRight className="h-3 w-3 text-white transition-transform" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-white transition-transform" />
                    )}
                  </SidebarGroupLabel>
                  {!isGroupCollapsed('ops-history') && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {/* Tickets */}
                        {canViewTickets && (
                          <>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive("/admin/tickets") && !isActive("/admin/tickets/create") && !isActive("/admin/tickets/archived") && !isActive("/admin/tickets/operations") && !isActive("/admin/tickets/it") && !isActive("/admin/tickets/reporting")} tooltip="All Tickets">
                                <Link href="/admin/tickets">
                                  <Ticket />
                                  <span>All Tickets</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive("/admin/tickets/create")} tooltip="Create Ticket">
                                <Link href="/admin/tickets/create">
                                  <PlusCircle />
                                  <span>Create Ticket</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive("/admin/tickets/operations")} tooltip="Operations Tickets">
                                <Link href="/admin/tickets/operations">
                                  <Settings />
                                  <span>Operations Tickets</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive("/admin/tickets/it")} tooltip="IT Tickets">
                                <Link href="/admin/tickets/it">
                                  <Laptop />
                                  <span>IT Tickets</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive("/admin/tickets/archived")} tooltip="Archived Tickets">
                                <Link href="/admin/tickets/archived">
                                  <Archive />
                                  <span>Archived Tickets</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </>
                        )}

                        {/* Scans */}
                        {canViewScans && (
                          <>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive("/scans") && !isActive("/scans/report")} tooltip="Scan Events">
                                <Link href="/scans">
                                  <Package />
                                  <span>Scan Events</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            {canView('topBarcodesUsers') && (
                              <>
                                <SidebarMenuItem>
                                  <SidebarMenuButton asChild isActive={isActive("/scans/top-users") && !isActive("/scans/top-users/contact-report")} tooltip="Top Users">
                                    <Link href="/scans/top-users">
                                      <Star />
                                      <span>Top Users</span>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                  <SidebarMenuButton asChild isActive={isActive("/scans/top-users/contact-report")} tooltip="Top Users Contact Report">
                                    <Link href="/scans/top-users/contact-report">
                                      <Phone />
                                      <span>Top Users Contact Report</span>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              </>
                            )}
                          </>
                        )}

                        {/* History */}
                        {canViewHistory && (
                          <>
                            {canViewHistoryAppointments && (
                              <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={isActive("/appointments")} tooltip="All Appointments">
                                  <Link href="/appointments">
                                    <Calendar />
                                    <span>All Appointments</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                            {canViewHistoryCallsTranscripts && (
                              <>
                                <SidebarMenuItem>
                                  <SidebarMenuButton asChild isActive={isActive("/calls")} tooltip="All Calls">
                                    <Link href="/calls">
                                      <Phone />
                                      <span>All Calls</span>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                  <SidebarMenuButton asChild isActive={isActive("/unassigned_calls")} tooltip="Unassigned Calls">
                                    <Link href="/unassigned_calls">
                                      <HelpCircle />
                                      <span>Unassigned Calls</span>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                  <SidebarMenuButton asChild isActive={isActive("/transcripts")} tooltip="All Transcripts">
                                    <Link href="/transcripts">
                                      <FileText />
                                      <span>All Transcripts</span>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              </>
                            )}
                            {canViewD2D && (
                              <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={isActive("/check-ins")} tooltip="Check-ins">
                                  <Link href="/check-ins">
                                    <CheckSquare />
                                    <span>Check-ins</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                          </>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              )}

              {/* Group 9: ANALYTICS & REPORTS */}
              {(canViewReporting || isFranchiseeRole) && (
                <SidebarGroup>
                  <SidebarGroupLabel 
                    onClick={() => toggleGroup('analytics-reports')} 
                    className="cursor-pointer hover:text-white transition-colors flex items-center justify-between select-none group/glabel"
                  >
                    <span className="flex items-center gap-1.5 text-white font-extrabold">
                      <BarChart2 className="h-3.5 w-3.5 text-white/90" />
                      <span>Analytics & Reports</span>
                    </span>
                    {isGroupCollapsed('analytics-reports') ? (
                      <ChevronRight className="h-3 w-3 text-white transition-transform" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-white transition-transform" />
                    )}
                  </SidebarGroupLabel>
                  {!isGroupCollapsed('analytics-reports') && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {userProfile?.activeRole !== 'user' && userProfile?.activeRole?.toLowerCase() !== 'user' && userProfile?.activeRole !== 'Outbound Admin' && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/sales-snapshot")} tooltip="Sales Snapshot">
                              <Link href="/sales-snapshot">
                                <Layers />
                                <span>Sales Snapshot</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewReporting && !isFranchiseeRole && !(userProfile?.activeRole === 'Account Managers' || userProfile?.activeRole === 'Account Manager' || userProfile?.activeRole === 'account managers') && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/reports")} tooltip="Outbound Reporting">
                              <Link href="/reports">
                                <BarChart2 />
                                <span>Outbound Reporting</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewInboundReporting && !isFranchiseeRole && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/inbound-reporting")} tooltip="Inbound Reporting">
                              <Link href="/inbound-reporting">
                                <Inbox />
                                <span>Inbound Reporting</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {isAdmin && !(userProfile?.activeRole === 'user' || userProfile?.activeRole === 'Outbound Admin') && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/lifecycle-dashboard")} tooltip="Lifecycle Dashboard">
                              <Link href="/admin/lifecycle-dashboard">
                                <Activity />
                                <span>Lifecycle Dashboard</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewAccountManagerPipeline && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/account-manager/reports")} tooltip="AM Reporting">
                              <Link href="/account-manager/reports">
                                <BarChart3 />
                                <span>AM Reporting</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewCustomerSuccessPipeline && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/customer-success/reporting")} tooltip="CS Reporting">
                              <Link href="/customer-success/reporting">
                                <BarChart3 />
                                <span>CS Reporting</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewTickets && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/tickets/reporting")} tooltip="Ticket Reporting">
                              <Link href="/admin/tickets/reporting">
                                <BarChart2 />
                                <span>Ticket Reporting</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canViewScans && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/scans/report")} tooltip="Scan Reporting">
                              <Link href="/scans/report">
                                <BarChart2 />
                                <span>Scan Reporting</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canView('fieldActivityReport') && !isFranchiseeRole && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/field-activity-report")} tooltip="Field Activity">
                              <Link href="/field-activity-report">
                                <BarChart3 />
                                <span>Field Activity</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        {canView('deploymentHistory') && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/deployments")} tooltip="Deployment History">
                              <Link href="/admin/deployments">
                                <MapPin />
                                <span>Deployment History</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              )}

              {/* Group 10: NETWORK */}
              {canViewFranchisees && (
                <SidebarGroup>
                  <SidebarGroupLabel 
                    onClick={() => toggleGroup('network-group')} 
                    className="cursor-pointer hover:text-white transition-colors flex items-center justify-between select-none group/glabel"
                  >
                    <span className="flex items-center gap-1.5 text-white font-extrabold">
                      <Globe className="h-3.5 w-3.5 text-white/90" />
                      <span>Network</span>
                    </span>
                    {isGroupCollapsed('network-group') ? (
                      <ChevronRight className="h-3 w-3 text-white transition-transform" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-white transition-transform" />
                    )}
                  </SidebarGroupLabel>
                  {!isGroupCollapsed('network-group') && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/admin/franchisees/directory")} tooltip="Franchisees Directory">
                            <Link href="/admin/franchisees/directory">
                              <Building />
                              <span>Franchisees Directory</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/admin/franchisees/presales")} tooltip="Territory Presales">
                            <Link href="/admin/franchisees/presales">
                              <Tag />
                              <span>Territory Presales</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {canViewFranchiseProspects && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/operations/franchise-prospects")} tooltip="Franchise Prospects">
                              <Link href="/operations/franchise-prospects">
                                <UserCheck />
                                <span>Franchise Prospects</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/admin/franchisees/operators")} tooltip="Operators Directory">
                            <Link href="/admin/franchisees/operators">
                              <Users />
                              <span>Operators Directory</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {canViewTerritoryMap && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/admin/franchisees/territory-map")} tooltip="Franchisee Territory Map">
                              <Link href="/admin/franchisees/territory-map">
                                <Map />
                                <span>Franchisee Territory Map</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/admin/franchisees/suburb-mapping")} tooltip="Suburb & Lodgement Mapping">
                            <Link href="/admin/franchisees/suburb-mapping">
                              <MapPin />
                              <span>Suburb & Lodgement Mapping</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              )}
            </>
          )}
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
                    {isSuperAdmin && !EXCLUDED_LOGIN_ACTIVITY_UIDS.includes(userProfile?.uid || '') && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive('/admin/login-report')}>
                          <Link href="/admin/login-report">
                            <Clock className="h-4 w-4" />
                            <span>Login Activity</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {isSuperAdmin && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive('/admin/app-tickets')}>
                          <Link href="/admin/app-tickets">
                            <Ticket className="h-4 w-4" />
                            <span>App Tickets</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
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
          <header className="flex h-14 items-center justify-between gap-2 sm:gap-4 border-b bg-sidebar text-sidebar-foreground px-2 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-4">
            <SidebarTrigger className="hidden md:inline-flex" />
            <Link href="/" className="md:hidden flex items-center gap-1">
              <span className="logo-text text-lg font-bold text-white tracking-tight">
                prospect<span className="logo-plus">.plus</span>
              </span>
            </Link>
          </div>
          
          <div className="flex-1 flex justify-center">
             <h2 className="logo-text text-lg sm:text-xl md:block hidden">
               prospect<span className="logo-plus">.plus</span>
             </h2>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
            <div className="hidden sm:inline-flex">
              <PerformanceTimer loadTime={loadTime} pageName={pageName || getPageNameFromPath(pathname)} />
            </div>
            {userProfile?.linkedSalesRep && (
                <Button variant="outline" size="sm" onClick={handleCalendlyClick} className="hidden md:inline-flex bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90">
                    <Calendar className="mr-2 h-4 w-4" />
                    {userProfile.linkedSalesRep} Calendar
                </Button>
            )}
           <Button variant="ghost" size="icon" onClick={() => startTour()} title="Start Walkthrough" className="h-8 w-8 sm:h-9 sm:w-9">
             <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
           </Button>
           <UniversalSearch />
           <NotificationCenter />
           <FranchiseeSwitcher />
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button id="step-settings-panel" variant="ghost" className="flex items-center gap-1 sm:gap-2 hover:bg-sidebar-accent focus:bg-sidebar-accent group p-1.5 sm:px-3">
                 <User className="h-4 w-4 sm:h-5 sm:w-5" />
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
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="opacity-100 cursor-default">
                  <div className="flex flex-col w-full gap-1.5 py-0.5">
                      <span className="font-medium text-sm truncate text-foreground">{user?.displayName}</span>
                      <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                      <div className="mt-1 pt-1.5 border-t border-border/60 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Viewing as</span>
                          <span className="text-xs font-semibold text-[#095c7b] bg-[#095c7b]/10 px-2 py-0.5 rounded-full capitalize">
                              {userProfile?.activeRole || userProfile?.role || 'User'}
                          </span>
                      </div>
                  </div>
              </DropdownMenuItem>
              {userProfile?.assignedRoles && userProfile.assignedRoles.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <ChevronsUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Switch Role</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent alignOffset={-4}>
                      <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {userProfile.assignedRoles.map((r) => (
                        <DropdownMenuItem key={r} onClick={() => switchRole(r)} className="cursor-pointer flex items-center justify-between">
                          <span>{r}</span>
                          {r === userProfile.activeRole && <CheckCircle2 className="h-4 w-4 text-[#095c7b] ml-2 shrink-0" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
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

        <div ref={containerRef} className="p-3 sm:p-6 lg:p-8 pb-20 md:pb-8 flex-grow max-w-full overflow-x-hidden">
            {isBlockedForUserRole(pathname, userProfile?.activeRole) ? (
              <AccessDenied />
            ) : (
              children
            )}
        </div>
        <footer className="p-4 sm:p-6 text-center text-xs text-muted-foreground border-t pb-24 md:pb-6">
          {new Date().getFullYear()} prospect.plus. All rights reserved.
        </footer>

        {/* Mobile Bottom Navigation Bar */}
        <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#095c7b] border-t border-teal-800/60 shadow-lg px-2 py-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-5 gap-1 items-end justify-items-center max-w-md mx-auto">
            {/* 1. Left 1: Leads */}
            <Link
              href={isFranchiseeRole ? "/franchisee-leads" : "/leads"}
              className={cn(
                "flex flex-col items-center justify-center w-full py-1 rounded-lg transition-colors text-[10px] font-medium gap-0.5",
                isActive("/franchisee-leads") || (isActive("/leads") && !isActive("/leads/new"))
                  ? "text-[#eaf143] font-bold"
                  : "text-slate-200 hover:text-white"
              )}
            >
              <Briefcase className={cn("h-5 w-5", isActive("/franchisee-leads") || (isActive("/leads") && !isActive("/leads/new")) ? "text-[#eaf143] stroke-[2.5]" : "text-slate-300")} />
              <span className="truncate max-w-[64px] text-center leading-tight">Leads</span>
            </Link>

            {/* 2. Left 2: Lookup */}
            <Link
              href="/account-lookup"
              className={cn(
                "flex flex-col items-center justify-center w-full py-1 rounded-lg transition-colors text-[10px] font-medium gap-0.5",
                isActive("/account-lookup")
                  ? "text-[#eaf143] font-bold"
                  : "text-slate-200 hover:text-white"
              )}
            >
              <Search className={cn("h-5 w-5", isActive("/account-lookup") ? "text-[#eaf143] stroke-[2.5]" : "text-slate-300")} />
              <span className="truncate max-w-[64px] text-center leading-tight">Lookup</span>
            </Link>

            {/* 3. CENTER: Create Lead (Prominent Action Button) */}
            <Link
              href="/leads/new"
              className="flex flex-col items-center justify-center w-full relative -mt-3.5 group"
            >
              <div className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ring-4 ring-[#095c7b]",
                isActive("/leads/new")
                  ? "bg-[#eaf143] text-[#095c7b]"
                  : "bg-[#eaf143] text-[#095c7b] hover:bg-yellow-300"
              )}>
                <Plus className="h-6 w-6 stroke-[3]" />
              </div>
              <span className={cn(
                "text-[10px] font-semibold mt-0.5 truncate max-w-[68px] text-center leading-tight",
                isActive("/leads/new") ? "text-[#eaf143] font-bold" : "text-slate-200"
              )}>
                Create Lead
              </span>
            </Link>

            {/* 4. Right 1: Snapshot */}
            <Link
              href="/sales-snapshot"
              className={cn(
                "flex flex-col items-center justify-center w-full py-1 rounded-lg transition-colors text-[10px] font-medium gap-0.5",
                isActive("/sales-snapshot")
                  ? "text-[#eaf143] font-bold"
                  : "text-slate-200 hover:text-white"
              )}
            >
              <Layers className={cn("h-5 w-5", isActive("/sales-snapshot") ? "text-[#eaf143] stroke-[2.5]" : "text-slate-300")} />
              <span className="truncate max-w-[64px] text-center leading-tight">Snapshot</span>
            </Link>

            {/* 5. Right 2: Signed */}
            <Link
              href="/signed-customers"
              className={cn(
                "flex flex-col items-center justify-center w-full py-1 rounded-lg transition-colors text-[10px] font-medium gap-0.5",
                isActive("/signed-customers")
                  ? "text-[#eaf143] font-bold"
                  : "text-slate-200 hover:text-white"
              )}
            >
              <Star className={cn("h-5 w-5", isActive("/signed-customers") ? "text-[#eaf143] fill-[#eaf143] stroke-[2.5]" : "text-slate-300")} />
              <span className="truncate max-w-[64px] text-center leading-tight">Signed</span>
            </Link>
          </div>
        </nav>
        <UnassignedCallDialog />
        <AskChatbot />
        <CommandPalette />

        {/* Customize Pinned Shortcuts Dialog */}
        <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Star className="h-5 w-5 fill-[#eaf143] text-[#095c7b]" />
                Customize Pinned Quick Access
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground -mt-2 mb-2">
              Select the pages you want pinned to the top of your sidebar for instant 1-click access.
            </p>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {Array.from(new Set(Object.values(PINNABLE_ITEMS).map(i => i.category))).map(category => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 gap-1.5 pl-1">
                    {Object.values(PINNABLE_ITEMS)
                      .filter(i => i.category === category)
                      .map(item => {
                        const isPinned = pinnedPaths.includes(item.href);
                        const ItemIcon = item.icon;
                        return (
                          <label
                            key={item.href}
                            className={`flex items-center justify-between p-2 rounded-md border text-sm cursor-pointer transition-colors ${
                              isPinned ? 'bg-primary/10 border-primary/30 font-medium' : 'bg-card border-border hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <ItemIcon className="h-4 w-4 text-primary" />
                              <span>{item.label}</span>
                            </div>
                            <Checkbox
                              checked={isPinned}
                              onCheckedChange={() => togglePinItem(item.href)}
                            />
                          </label>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t flex justify-end">
              <Button onClick={() => setShowPinModal(false)} className="bg-[#095c7b] text-white hover:bg-[#074760]">
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </>
  )
}

const isBlockedForUserRole = (path: string, role?: string) => {
  const isFranchisee = role === 'Franchisee' || role?.toLowerCase() === 'franchisee';
  if (isFranchisee) {
    const blockedFranchiseePaths = [
      '/reports',
      '/inbound-reporting',
      '/field-activity-report',
      '/field-sales',
      '/visit-notes',
      '/capture-visit'
    ];
    if (blockedFranchiseePaths.some(p => path === p || path.startsWith(p + '/'))) {
      return true;
    }
  }

  if (role !== 'user' && role !== 'Outbound Admin') return false;
  if (path === '/admin/marketing/import-leads') return false;
  return path.startsWith('/admin/marketing') || 
         path.startsWith('/admin/mailbox') || 
         path.startsWith('/admin/financial-dashboard') || 
         path.startsWith('/admin/lifecycle-dashboard') || 
         path === '/leads/suppressions';
};

const CUSTOM_TIMER_PATHS = [
  '/reports',
  '/inbound-reporting',
  '/leads',
  '/inbound-leads',
  '/sales-snapshot',
  '/account-manager/pipeline',
  '/account-manager/reports'
];

const isCustomPath = (path: string) => {
  if (path === '/leads') return true;
  return CUSTOM_TIMER_PATHS.some(p => p !== '/leads' && (path === p || path.startsWith(p + '/')));
};

const getPageNameFromPath = (path: string) => {
  if (path === '/admin/in-review-leads') return 'In Review Leads';
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
