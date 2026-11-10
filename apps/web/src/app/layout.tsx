import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { CoreProvider } from '@/core/providers/core-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'DexHub',
  description: 'Your personal modular hub',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <CoreProvider>{children}</CoreProvider>
      </body>
    </html>
  )
}
