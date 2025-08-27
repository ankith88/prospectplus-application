import type { Metadata } from 'next'
import './globals.css'
import { AppLayout } from '@/components/app-layout'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/hooks/use-auth'
import { SidebarProvider } from '@/components/ui/sidebar'

export const metadata: Metadata = {
  title: 'ProspectPlus',
  description: 'Powered by MailPlus. AI-powered CRM for outbound leads management.',
  icons: {
    icon: 'https://mailplus.com.au/wp-content/uploads/2024/08/cropped-MP-Logo-2024-Tile.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <AuthProvider>
          <SidebarProvider>
            <AppLayout>{children}</AppLayout>
          </SidebarProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
