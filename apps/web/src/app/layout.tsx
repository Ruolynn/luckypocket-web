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
  title: {
    default: 'Lucky Packet - Web3 Red Envelope dApp',
    template: '%s | Lucky Packet',
  },
  description: 'Send and claim encrypted lucky packets on Base blockchain. Experience the joy of Web3 social payments with festive red envelopes.',
  keywords: ['lucky packet', 'red envelope', 'hongbao', 'web3', 'base', 'blockchain', 'crypto', 'dapp'],
  authors: [{ name: 'Zesty Studio' }, { name: 'Ruolynn Chen' }],
  creator: 'Zesty Studio',
  publisher: 'Lucky Packet',
  applicationName: 'Lucky Packet',
  metadataBase: new URL('https://luckypocket.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://luckypocket.vercel.app',
    title: 'Lucky Packet - Web3 Red Envelope dApp',
    description: 'Send and claim encrypted lucky packets on Base blockchain. Experience the joy of Web3 social payments with festive red envelopes.',
    siteName: 'Lucky Packet',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lucky Packet - Web3 Red Envelope dApp',
    description: 'Send and claim encrypted lucky packets on Base blockchain.',
    creator: '@luckypocket',
  },
  robots: {
    index: true,
    follow: true,
  },
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

