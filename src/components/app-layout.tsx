
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
import { Briefcase, LogOut, Archive, FileText, BarChart2, User, ChevronsUpDown, Phone } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useSidebar } from "./ui/sidebar"
import { useEffect } from "react"
import { Loader } from "./ui/loader"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const { isMobile } = useSidebar()
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)


  const handleSignOut = async () => {
    await signOut()
    router.push("/signin")
  }

  const isAuthPage = pathname === '/signin' || pathname === '/signup';

  useEffect(() => {
    if (user && !isAuthPage) {
      document.body.classList.add('logged-in');
    } else {
      document.body.classList.remove('logged-in');
    }
  }, [user, isAuthPage]);
  
  if (isAuthPage) {
    return <main className="flex min-h-svh flex-1 flex-col bg-background">{children}</main>;
  }

  if (isMobile === null) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader />
        </div>
    )
  }
  
  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="flex items-center justify-center p-4 h-14 border-b">
          <Link href="/leads" className="flex items-center gap-2">
            <Image
              src="https://mailplus.com.au/wp-content/uploads/2021/02/mailplus-new-logo-solo-copy-4.png"
              width={40}
              height={40}
              alt="MailPlus CRM Logo"
              data-ai-hint="logo icon"
            />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/leads")} tooltip="Leads">
                <Link href="/leads">
                  <Briefcase />
                  <span>Outbound Leads</span>
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
              <SidebarMenuButton asChild isActive={isActive("/leads/archive")} tooltip="Archived Leads">
                <Link href="/leads/archive">
                  <Archive />
                  <span>Archived Leads</span>
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
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
         <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 sticky top-0 z-30">
          <SidebarTrigger />
          <div className="flex w-full items-center gap-4">
            <div className="flex-1">
                
            </div>
            <div className="flex items-center gap-2 lg:gap-4 ml-auto">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                   <User className="h-5 w-5" />
                   <div className="flex flex-col items-start">
                     <span className="font-medium text-sm truncate">{user?.displayName}</span>
                   </div>
                   <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
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
          </div>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">
          {loading ? (
             <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
                <Loader />
             </div>
          ) : (
            children
          )}
        </div>
      </SidebarInset>
    </>
  )
}
