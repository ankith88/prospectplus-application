
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  SidebarProvider,
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
import { Briefcase, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useSidebar } from "./ui/sidebar"

function MobileHeader() {
    const { openMobile, setOpenMobile } = useSidebar();
    return (
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 md:hidden">
            <Link href="/" className="flex items-center gap-2 font-semibold">
                <Briefcase className="h-6 w-6 text-primary" />
                <span className="">MailPlus CRM</span>
            </Link>
            <SidebarTrigger onClick={() => setOpenMobile(!openMobile)} />
        </header>
    )
}


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const isActive = (path: string) => pathname === path

  const handleSignOut = async () => {
    await signOut();
    router.push('/signin');
  }

  // Do not render layout for signin/signup pages
  if (pathname === '/signin' || pathname === '/signup') {
    return <>{children}</>;
  }

  // Do not render layout if auth is loading or user is not signed in
  if (loading || !user) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div>Loading...</div>
        </div>
    )
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
                <Link href="/leads">
                    <Briefcase className="w-6 h-6 text-primary" />
                </Link>
            </Button>
            <h1 className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
              MailPlus CRM
            </h1>
          </div>
          <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/leads") || pathname.startsWith('/leads')}
                tooltip="Leads"
              >
                <Link href="/leads">
                  <Briefcase />
                  <span>Outbound Leads</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <div className="flex items-center gap-3 w-full">
                <Avatar className="size-8">
                    <AvatarImage src={user.photoURL || `https://placehold.co/100x100.png`} alt={user.displayName || 'User'} data-ai-hint="person avatar" />
                    <AvatarFallback>{user.displayName ? user.displayName.charAt(0) : 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                    <span className="font-medium text-sm truncate">{user.displayName}</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                </div>
            </div>
             <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                 <Button variant="ghost" size="icon"><Settings className="size-4"/></Button>
                 <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut className="size-4"/></Button>
             </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <MobileHeader />
        <div className="p-4 sm:p-6 lg:p-8">
            {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
