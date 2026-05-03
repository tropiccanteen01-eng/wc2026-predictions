// src/app/layout.tsx
import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase/server'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'WC 2026 Predictions | Office League',
  description: 'Predict every World Cup 2026 match score and compete with your colleagues.',
  openGraph: {
    title: 'WC 2026 Predictions',
    description: 'Predict every match. Beat your colleagues.',
    type: 'website',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, is_admin')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <html lang="en" className={dmSans.variable}>
      <body className="bg-surface-base text-white antialiased min-h-screen">
        <Navbar user={user} profile={profile} />
        <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
          {children}
        </main>
      </body>
    </html>
  )
}
