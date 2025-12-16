

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
} from "@/components/ui/sidebar"
import { Briefcase, LogOut, Archive, FileText, BarChart2, User, ChevronsUpDown, Phone, ListTodo, Calendar, PlusCircle, Map, Star, Route } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useSidebar } from "./ui/sidebar"
import { useEffect } from "react"
import { Loader, FullScreenLoader } from "./ui/loader"
import { TaskReminderBell } from "./task-reminder-bell"
import { UniversalSearch } from "./universal-search"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userProfile, loading, signOut, isSigningOut, isSigningIn } = useAuth()
  const { isMobile } = useSidebar()
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)


  const handleSignOut = async () => {
    await signOut()
    // The redirect is handled by the useAuth hook's useEffect
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
  
  const formatAustralianPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // Handle numbers that already include the country code
    if (digits.startsWith('61')) {
        const localPart = digits.substring(2);
        if (localPart.length === 9) { // Mobile format 04xx xxx xxx
            return `+61 ${localPart.substring(0, 3)} ${localPart.substring(3, 6)} ${localPart.substring(6, 9)}`;
        }
        if (localPart.length === 10) { // Landline with area code
            return `+61 ${localPart.substring(0, 2)} ${localPart.substring(2, 6)} ${localPart.substring(6, 10)}`;
        }
        return `+${digits}`; // Fallback for other lengths
    }

    // Handle local numbers (assume they are Australian)
    if (digits.startsWith('0')) {
        const localPart = digits.substring(1);
        if (localPart.length === 9) { // Mobile format 04xx xxx xxx
            return `+61 ${localPart.substring(0, 3)} ${localPart.substring(3, 6)} ${localPart.substring(6, 9)}`;
        }
         if (localPart.length === 10) { // Landline with area code
            return `+61 ${localPart.substring(0, 2)} ${localPart.substring(2, 6)} ${localPart.substring(6, 10)}`;
        }
    }
    
    // Fallback for numbers that don't fit the pattern
    return phoneNumber;
  };


  if (isSigningOut) {
      return <FullScreenLoader message="Signing out..." />;
  }

  if (isSigningIn) {
      return <FullScreenLoader message="Signing in..." />;
  }
  
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
  
  return (
    <>
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
            {userProfile?.role && ['admin', 'Field Sales'].includes(userProfile.role) && (
               <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/field-sales")} tooltip="Dashboard">
                  <Link href="/field-sales">
                    <Route />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {userProfile?.role && ['admin', 'Field Sales'].includes(userProfile.role) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/leads/new")} tooltip="New Lead">
                  <Link href="/leads/new">
                    <PlusCircle />
                    <span>New Lead</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {userProfile?.role === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/leads'} tooltip="Leads">
                  <Link href="/leads">
                    <Briefcase />
                    <span>Outbound Leads</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/leads/map")} tooltip="Territory Map">
                <Link href="/leads/map">
                  <Map />
                  <span>Territory Map</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/appointments")} tooltip="All Appointments">
                <Link href="/appointments">
                  <Calendar />
                  <span>All Appointments</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/calls")} tooltip="All Calls">
                <Link href="/calls">
                  <Phone />
                  <span>All Calls</span>
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
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/reports")} tooltip="Reports">
                <Link href="/reports">
                  <BarChart2 />
                  <span>Reports</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/signed-customers")} tooltip="Signed Customers">
                <Link href="/signed-customers">
                  <Star />
                  <span>Signed Customers</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/leads/archive")} tooltip="Archived Leads">
                <Link href="/leads/archive">
                  <Archive />
                  <span>Archived Leads</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
         <header className="flex h-14 items-center justify-between gap-4 border-b bg-sidebar text-sidebar-foreground px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
          </div>
          
          <div className="flex-1 flex justify-center">
             <h2 className="text-xl font-bold">ProspectPlus</h2>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
           <UniversalSearch />
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-sidebar-accent focus:bg-sidebar-accent group">
                 <User className="h-5 w-5" />
                 <div className="flex flex-col items-start">
                   <span className="font-medium text-sm truncate group-hover:text-sidebar-hover-foreground">{user?.displayName}</span>
                   {userProfile?.phoneNumber && (
                    <span className="text-xs text-sidebar-foreground/70 group-hover:text-sidebar-hover-foreground/70">{formatAustralianPhoneNumber(userProfile.phoneNumber)}</span>
                   )}
                 </div>
                 <ChevronsUpDown className="h-4 w-4" />
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
        <div className="p-4 sm:p-6 lg:p-8 flex-grow">
            {children}
        </div>
        <footer className="p-4 sm:p-6 text-center text-xs text-muted-foreground border-t">
          2025 MailPlus Pty. Ltd. All rights reserved.
        </footer>
      </SidebarInset>
    </>
  )
}
