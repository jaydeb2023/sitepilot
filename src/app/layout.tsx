import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://sitepilot.evynta.in'),
  title: 'SitePilot by Evynta — Construction Project & Site Management',
  description: 'Manage projects, daily site reports, labour, materials, contractor bills and budgets in one platform built for Indian builders and contractors.',
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0c1b3a' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Toaster position="top-right" toastOptions={{ style: { fontSize: 14 } }} />
      </body>
    </html>
  )
}
