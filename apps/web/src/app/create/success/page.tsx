'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/MainLayout'
import { useSearchParams } from 'next/navigation'

function CreateSuccessContent() {
  const searchParams = useSearchParams()
  const packetId = searchParams.get('id') || '0x1234567890abcdef1234567890abcdef12345678'
  const [qrModalOpen, setQrModalOpen] = useState(false)

  const copyPacketId = () => {
    navigator.clipboard.writeText(packetId)
    alert('Packet ID copied to clipboard')
  }

  const copyWebLink = () => {
    const webUrl = `${window.location.origin}/packet/${packetId}`
    navigator.clipboard.writeText(webUrl)
    alert('Link copied to clipboard')
  }

  const shareToWarpcast = () => {
    const frameUrl = `${window.location.origin}/api/frame/${packetId}`
    const text = encodeURIComponent('I sent a lucky packet! Come claim it! 🧧')
    const warpcastUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${encodeURIComponent(frameUrl)}`
    window.open(warpcastUrl, '_blank')
  }

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center py-8 xs:py-12 sm:py-16 px-3 xs:px-4">
        <div className="w-full max-w-2xl">
          {/* Success Animation */}
          <div className="flex flex-col items-center text-center mb-6 xs:mb-8">
            <div className="relative mb-6 xs:mb-8">
              <div className="text-8xl xs:text-9xl animate-bounce">🎉</div>
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl -z-10"></div>
            </div>
            <h1 className="text-3xl xs:text-4xl sm:text-5xl font-black text-text-primary-light mb-3 xs:mb-4 tracking-[-0.033em]">
              Lucky Packet Created Successfully!
            </h1>
            <p className="text-base xs:text-lg text-text-secondary-light mb-2">
              Your lucky packet is ready to share with friends!
            </p>
            <div className="inline-flex items-center gap-2 px-3 xs:px-4 py-1.5 xs:py-2 rounded-full bg-green-100 text-green-700 text-xs xs:text-sm font-medium mt-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>Transaction Confirmed</span>
            </div>
          </div>

          {/* Packet Info Card */}
          <div className="glass-card rounded-xl p-4 xs:p-6 mb-6 xs:mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <div className="flex-1">
                <p className="text-xs xs:text-sm text-text-secondary-light mb-1">Packet ID</p>
                <p className="text-sm xs:text-base font-mono font-bold text-text-primary-light break-all">
                  {packetId}
                </p>
              </div>
              <button
                onClick={copyPacketId}
                className="glass-button-secondary flex items-center justify-center w-9 xs:w-10 h-9 xs:h-10 rounded-lg touch-manipulation ml-2"
                aria-label="Copy Packet ID"
              >
                <span className="material-symbols-outlined text-base xs:text-lg text-text-secondary-light">
                  content_copy
                </span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
              <div>
                <p className="text-xs xs:text-sm text-text-secondary-light mb-1">Total Amount</p>
                <p className="text-lg xs:text-xl font-bold text-text-primary-light">0.05 ETH</p>
              </div>
              <div>
                <p className="text-xs xs:text-sm text-text-secondary-light mb-1">Packet Count</p>
                <p className="text-lg xs:text-xl font-bold text-text-primary-light">10 packets</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-text-secondary-light">
              <span className="material-symbols-outlined text-base">schedule</span>
              <span>Valid for: 7 days</span>
            </div>
          </div>

          {/* Share Options */}
          <div className="mb-6 xs:mb-8">
            <h2 className="text-xl xs:text-2xl font-bold text-text-primary-light mb-4 text-center">
              Share Options
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xs:gap-4">
              {/* Frame Link */}
              <button
                onClick={shareToWarpcast}
                className="flex flex-col items-center gap-3 p-4 xs:p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 hover:border-purple-300 hover:shadow-md transition-all touch-manipulation group"
              >
                <div className="flex items-center justify-center w-16 xs:w-20 h-16 xs:h-20 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <span className="material-symbols-outlined text-purple-600 text-3xl xs:text-4xl">
                    cast
                  </span>
                </div>
                <h3 className="text-base xs:text-lg font-bold text-gray-900">Frame Link</h3>
                <p className="text-xs xs:text-sm text-gray-600 text-center">
                  Share to Warpcast, friends can claim directly in Frame
                </p>
                <span className="text-xs text-purple-600 font-medium mt-1">Recommended</span>
              </button>

              {/* Web Link */}
              <button
                onClick={copyWebLink}
                className="flex flex-col items-center gap-3 p-4 xs:p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 hover:border-blue-300 hover:shadow-md transition-all touch-manipulation group"
              >
                <div className="flex items-center justify-center w-16 xs:w-20 h-16 xs:h-20 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <span className="material-symbols-outlined text-blue-600 text-3xl xs:text-4xl">
                    link
                  </span>
                </div>
                <h3 className="text-base xs:text-lg font-bold text-gray-900">Web Link</h3>
                <p className="text-xs xs:text-sm text-gray-600 text-center">
                  Copy link to share on any platform
                </p>
                <span className="text-xs text-blue-600 font-medium mt-1">Tap to copy</span>
              </button>

              {/* QR Code */}
              <button
                onClick={() => setQrModalOpen(true)}
                className="flex flex-col items-center gap-3 p-4 xs:p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 hover:border-green-300 hover:shadow-md transition-all touch-manipulation group"
              >
                <div className="flex items-center justify-center w-16 xs:w-20 h-16 xs:h-20 rounded-full bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <span className="material-symbols-outlined text-green-600 text-3xl xs:text-4xl">
                    qr_code
                  </span>
                </div>
                <h3 className="text-base xs:text-lg font-bold text-gray-900">QR Code</h3>
                <p className="text-xs xs:text-sm text-gray-600 text-center">
                  Generate QR code for easy claiming
                </p>
                <span className="text-xs text-green-600 font-medium mt-1">View QR code</span>
              </button>

              {/* Social Share */}
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'I sent a lucky packet!',
                      text: 'Come claim it!',
                      url: `${window.location.origin}/packet/${packetId}`,
                    })
                  } else {
                    copyWebLink()
                  }
                }}
                className="flex flex-col items-center gap-3 p-4 xs:p-6 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 hover:border-orange-300 hover:shadow-md transition-all touch-manipulation group"
              >
                <div className="flex items-center justify-center w-16 xs:w-20 h-16 xs:h-20 rounded-full bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                  <span className="material-symbols-outlined text-orange-600 text-3xl xs:text-4xl">
                    share
                  </span>
                </div>
                <h3 className="text-base xs:text-lg font-bold text-gray-900">Social Share</h3>
                <p className="text-xs xs:text-sm text-gray-600 text-center">
                  Share to Twitter, Telegram, etc.
                </p>
                <span className="text-xs text-orange-600 font-medium mt-1">More options</span>
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3 xs:gap-4 w-full max-w-2xl">
            <Link
              href={`/packet/${packetId}`}
              className="glass-button flex-1 flex items-center justify-center gap-2 rounded-xl h-12 xs:h-14 px-6 text-primary text-base xs:text-lg font-bold touch-manipulation relative overflow-hidden group"
            >
              <span>View Packet Details</span>
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </Link>
            <Link
              href="/create"
              className="glass-button-secondary flex-1 flex items-center justify-center gap-2 rounded-xl h-12 xs:h-14 px-6 text-text-primary-light text-base xs:text-lg font-bold touch-manipulation"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              <span>Create Another</span>
            </Link>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="glass-card rounded-xl p-6 xs:p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-text-primary-light">Scan to Claim</h3>
              <button
                onClick={() => setQrModalOpen(false)}
                className="text-text-secondary-light hover:text-text-primary-light transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="glass-card flex items-center justify-center p-4 rounded-lg mb-4">
              <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-lg">
                <span className="text-text-secondary-light text-sm">QR code generation requires library integration</span>
              </div>
            </div>
            <p className="text-sm text-text-secondary-light text-center">
              Scan with wallet to claim lucky packet
            </p>
            <button
              onClick={() => setQrModalOpen(false)}
              className="glass-button w-full mt-4 rounded-lg h-10 text-primary font-bold touch-manipulation"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default function CreateSuccessPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-8 xs:py-12 sm:py-16 px-3 xs:px-4">
          <div className="text-lg text-text-secondary-light">Loading...</div>
        </div>
      </MainLayout>
    }>
      <CreateSuccessContent />
    </Suspense>
  )
}

