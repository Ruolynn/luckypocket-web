import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
})

export const viewport = {
  themeColor: '#FF4545',
}

export const metadata: Metadata = {
  title: 'LuckyPacket - Web3 Lucky Packet dApp',
  description: 'Send and claim encrypted lucky packets on Base chain',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={`${plusJakarta.variable} font-display bg-background-light relative`}>
        {/* Liquid Glass Background */}
        <div className="liquid-bg">
          <div className="liquid-blob liquid-blob-1"></div>
          <div className="liquid-blob liquid-blob-2"></div>
          <div className="liquid-blob liquid-blob-3"></div>
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

