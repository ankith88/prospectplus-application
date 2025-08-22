
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
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
import { Briefcase, LogOut, Archive, Inbox } from "lucide-react"
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
        <SidebarHeader className="flex items-center justify-center p-4">
          <Link href="/leads" className="flex items-center gap-2">
            <Image
              src="https://mailplus.com.au/wp-content/uploads/2021/02/mailplus-new-logo-solo-copy-4.png"
              width={140}
              height={40}
              alt="MailPlus CRM Logo"
              className="group-data-[collapsible=icon]:hidden"
              data-ai-hint="logo"
            />
            <Image
              src="https://mailplus.com.au/wp-content/uploads/2021/02/mailplus-new-logo-solo-copy-4.png"
              width={40}
              height={40}
              alt="MailPlus CRM Logo"
              className="hidden group-data-[collapsible=icon]:block"
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
              <SidebarMenuButton asChild isActive={isActive("/unmatched-activities")} tooltip="Unmatched Activities">
                <Link href="/unmatched-activities">
                  <Inbox />
                  <span>Unmatched Activities</span>
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
          <div className="flex items-center gap-3 w-full">
            <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="font-medium text-sm truncate">{user?.displayName}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start">
              <LogOut className="size-4" />
              <span>Log Out</span>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
         <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
          <SidebarTrigger />
          <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
            {/* Future header content can go here */}
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
