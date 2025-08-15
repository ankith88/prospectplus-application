"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = (path: string) => pathname === path

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
                <Link href="/">
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
                isActive={isActive("/") || pathname.startsWith('/leads')}
                tooltip="Leads"
              >
                <Link href="/">
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
                    <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="person avatar" />
                    <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                    <span className="font-medium text-sm truncate">Jane Doe</span>
                    <span className="text-xs text-muted-foreground truncate">jane.doe@mailplus.com</span>
                </div>
            </div>
             <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                 <Button variant="ghost" size="icon"><Settings className="size-4"/></Button>
                 <Button variant="ghost" size="icon"><LogOut className="size-4"/></Button>
             </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="p-4 sm:p-6 lg:p-8">
            {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
