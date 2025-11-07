'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { MainLayout } from '@/components/MainLayout'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { images } from '@/lib/images'
import { Icons, Decorations } from '@/lib/icons'

export default function ClaimPage() {
  const router = useRouter()
  const { isConnected: realIsConnected } = useAccount()
  const [packetId, setPacketId] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isTestMode, setIsTestMode] = useState(false)
  const [mockConnected, setMockConnected] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)

  // Check test mode
  useEffect(() => {
    const testMode = localStorage.getItem('testMode') === 'true'
    const mockWallet = localStorage.getItem('mockWalletConnected') === 'true'
    setIsTestMode(testMode)
    setMockConnected(mockWallet)
  }, [])

  const isConnected = isTestMode ? mockConnected : realIsConnected

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!packetId.trim()) return

    setIsSearching(true)

    // Simulate API call to check if packet exists
    setTimeout(() => {
      setIsSearching(false)
      // Redirect to packet detail page
      router.push(`/packet/${packetId.trim()}`)
    }, 500)
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      // Extract packet ID from URL if pasted a full link
      const urlMatch = text.match(/\/packet\/([a-zA-Z0-9]+)/)
      if (urlMatch) {
        setPacketId(urlMatch[1])
      } else {
        setPacketId(text)
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err)
    }
  }

  const handleQRScan = () => {
    setShowQRScanner(true)
  }

  const handleQRScanned = (scannedData: string) => {
    // Extract packet ID from scanned QR code
    const urlMatch = scannedData.match(/\/packet\/([a-zA-Z0-9]+)/)
    if (urlMatch) {
      setPacketId(urlMatch[1])
    } else {
      setPacketId(scannedData)
    }
    setShowQRScanner(false)
  }

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-3 xs:px-4">
        {/* Enhanced Header with Background */}
        <div className="w-full max-w-4xl mb-6 xs:mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 p-8 xs:p-12">
            {/* Background Image */}
            <div className="absolute inset-0 opacity-10">
              <Image
                src={images.celebration.gift}
                alt="Gift celebration"
                fill
                className="object-cover"
                sizes="100vw"
              />
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-4 right-4 w-20 h-20 bg-primary/20 rounded-full blur-2xl" />
            <div className="absolute bottom-4 left-4 w-32 h-32 bg-accent/20 rounded-full blur-3xl" />

            {/* Content */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 xs:w-20 h-16 xs:h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 backdrop-blur-xl border border-white/30 shadow-xl mb-4 animate-[festive-bounce_1s_ease-in-out_infinite]">
                <div className="w-10 xs:w-12 h-10 xs:h-12">
                  <Icons.GiftBox />
                </div>
              </div>
              <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-text-primary-light mb-2 xs:mb-3 relative inline-block">
                Claim Your Lucky Packet
                <Decorations.Sparkle className="absolute -top-1 -right-4 w-4 h-4" />
              </h1>
              <p className="text-sm xs:text-base text-text-secondary-light max-w-lg mx-auto">
                Enter the packet ID or paste the link to claim your gift
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md">
          {/* Spacer to separate from wallet connection */}
          <div className="h-4" />

          {/* Wallet Connection */}
          {!isConnected && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-yellow-600 text-xl flex-shrink-0">
                  info
                </span>
                <div className="flex-1">
                  <p className="text-sm text-yellow-800 mb-2">
                    Connect your wallet to claim packets
                  </p>
                  <ConnectButton />
                </div>
              </div>
            </div>
          )}

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary-light mb-2">
                Packet ID or Link
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={packetId}
                  onChange={(e) => setPacketId(e.target.value)}
                  placeholder="Enter packet ID (e.g., test123)"
                  className="w-full h-12 xs:h-14 px-4 pr-24 rounded-lg border border-gray-300 bg-white text-text-primary-light text-sm xs:text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={isSearching}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    type="button"
                    onClick={handleQRScan}
                    className="p-2 text-text-secondary-light hover:text-primary transition-colors"
                    title="Scan QR code"
                  >
                    <span className="material-symbols-outlined text-xl">
                      qr_code_scanner
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="p-2 text-text-secondary-light hover:text-primary transition-colors"
                    title="Paste from clipboard"
                  >
                    <span className="material-symbols-outlined text-xl">
                      content_paste
                    </span>
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-text-secondary-light">
                You can paste a link, scan QR code, or enter the ID directly
              </p>
            </div>

            <button
              type="submit"
              disabled={!packetId.trim() || isSearching}
              className="w-full h-12 xs:h-14 bg-gradient-to-r from-primary to-primary/90 text-white font-bold rounded-lg text-base xs:text-lg hover:shadow-xl hover:shadow-primary/40 active:scale-98 transition-all touch-manipulation shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed ripple-effect glow-primary"
            >
              {isSearching ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin">
                    progress_activity
                  </span>
                  Searching...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">search</span>
                  Find Packet
                </span>
              )}
            </button>
          </form>

          {/* Quick Links */}
          <div className="mt-8 xs:mt-10 pt-6 xs:pt-8 border-t border-gray-200">
            <p className="text-xs xs:text-sm text-text-secondary-light text-center mb-4">
              Or explore other options
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/create')}
                className="glass-card-gradient flex flex-col items-center gap-2 p-4 rounded-lg scale-on-hover touch-manipulation group"
              >
                <div className="w-8 h-8 transition-transform group-hover:scale-110 group-hover:animate-[festive-bounce_0.6s_ease-in-out_infinite]">
                  <Icons.RedPacket />
                </div>
                <span className="text-xs xs:text-sm font-medium text-text-primary-light">
                  Create Packet
                </span>
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="glass-card-gradient flex flex-col items-center gap-2 p-4 rounded-lg scale-on-hover touch-manipulation group"
              >
                <div className="w-8 h-8 transition-transform group-hover:scale-110">
                  <Icons.Wallet />
                </div>
                <span className="text-xs xs:text-sm font-medium text-text-primary-light">
                  My Packets
                </span>
              </button>
            </div>
          </div>

          {/* How it Works */}
          <div className="mt-8 p-4 xs:p-6 bg-surface-light rounded-lg">
            <h3 className="text-sm xs:text-base font-bold text-text-primary-light mb-3">
              How to Claim
            </h3>
            <ol className="space-y-2 text-xs xs:text-sm text-text-secondary-light">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>Get the packet ID or link from the sender</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Connect your wallet if not already connected</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Enter the ID or paste the link above</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>Click "Claim Now" on the packet page</span>
              </li>
            </ol>
          </div>
        </div>

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowQRScanner(false)}
          >
            <div
              className="bg-white rounded-xl p-6 xs:p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-text-primary-light">Scan QR Code</h3>
                <button
                  onClick={() => setShowQRScanner(false)}
                  className="p-2 text-text-secondary-light hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              {/* QR Scanner Placeholder */}
              <div className="aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center mb-6 border-2 border-dashed border-gray-300">
                <span className="material-symbols-outlined text-primary text-6xl mb-4">
                  qr_code_scanner
                </span>
                <p className="text-sm text-text-secondary-light text-center px-4">
                  Camera access required to scan QR codes
                </p>
                <p className="text-xs text-text-secondary-light text-center px-4 mt-2">
                  (QR scanner will be enabled in production)
                </p>
              </div>

              {/* Demo Buttons */}
              <div className="space-y-3">
                <p className="text-xs text-text-secondary-light text-center mb-3">
                  For demo purposes, try these test packets:
                </p>
                <button
                  onClick={() => handleQRScanned('test123')}
                  className="w-full py-3 px-4 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  Demo Packet #1 (test123)
                </button>
                <button
                  onClick={() => handleQRScanned('abc456')}
                  className="w-full py-3 px-4 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  Demo Packet #2 (abc456)
                </button>
                <button
                  onClick={() => handleQRScanned('https://luckypocket.app/packet/xyz789')}
                  className="w-full py-3 px-4 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  Demo Packet #3 (Full URL)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
