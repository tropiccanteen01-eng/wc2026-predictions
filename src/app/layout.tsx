// src/app/layout.tsx
import type { Metadata } from 'next'
import { Sora, DM_Mono } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  weight: ['300', '400', '500', '600', '700'],
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'WC 2026 Predictor',
  description: 'World Cup 2026 prediction game for friends',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${dmMono.variable}`}>
      <body className="min-h-screen bg-wc-bg text-wc-text font-sans antialiased">
        <Navbar />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  )
}
