
import type { Metadata } from 'next'
import Script from "next/script";
import './globals.css'
import { AppLayout } from './app-layout'
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/hooks/use-auth'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LoadingProvider, GlobalLoader } from '@/hooks/use-loading'
import { CallNotificationListener } from '@/components/call-notification-listener'
import { PermissionsProvider } from '@/hooks/use-permissions'
import { SyncProgressWidget } from '@/components/sync/sync-progress-widget'
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider'
import { DialingSessionProvider } from '@/hooks/use-dialing-session'
import { PerformanceProvider } from '@/hooks/use-performance'


export const metadata: Metadata = {
  title: 'prospect.plus',
  description: 'AI-powered CRM for outbound leads management.',
  icons: {
    icon: 'https://mailplus.com.au/wp-content/uploads/2021/02/mailplus-new-logo-solo-copy-4.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-ECGD82STP1"
        ></Script>
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-ECGD82STP1');
          `}
        </Script>
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <LoadingProvider>
            <SidebarProvider>
              <TooltipProvider>
                <CallNotificationListener />
                <PermissionsProvider>
                  <OnboardingProvider>
                    <DialingSessionProvider>
                      <PerformanceProvider>
                        <AppLayout>{children}</AppLayout>
                      </PerformanceProvider>
                    </DialingSessionProvider>
                  </OnboardingProvider>
                </PermissionsProvider>
                <GlobalLoader />
                <SyncProgressWidget />
              </TooltipProvider>
            </SidebarProvider>
          </LoadingProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
