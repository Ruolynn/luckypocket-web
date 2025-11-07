'use client'

import Link from 'next/link'
import Image from 'next/image'
import { images } from '@/lib/images'

export function EnhancedHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-6 mx-3 xs:mx-4">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <Image
          src={images.hero.community}
          alt="Community celebration"
          fill
          className="object-cover opacity-20"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-accent/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center text-center gap-4 xs:gap-6 px-4 xs:px-6 py-12 xs:py-16 backdrop-blur-sm">
        {/* Animated Icon */}
        <div className="float-animation mb-4">
          <div className="w-20 xs:w-24 h-20 xs:h-24 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-2xl">
            <span className="material-symbols-outlined text-white text-5xl xs:text-6xl drop-shadow-lg">
              redeem
            </span>
          </div>
        </div>

        <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-[-0.033em] drop-shadow-2xl">
          Send & Claim Lucky Packets
        </h1>
        <p className="text-base xs:text-lg sm:text-xl text-white/90 max-w-2xl drop-shadow-lg">
          Send and claim encrypted lucky packets on Base chain,
          <br className="hidden sm:block" />
          experience the joy of Web3 social payments
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col xs:flex-row gap-3 xs:gap-4 mt-4">
          <Link
            href="/create"
            className="glass-button flex items-center justify-center rounded-xl h-12 xs:h-14 px-6 xs:px-8 text-white bg-primary/80 hover:bg-primary text-base xs:text-lg font-bold touch-manipulation relative overflow-hidden group ripple-effect scale-on-hover shadow-xl"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity shimmer"></span>
            <span className="material-symbols-outlined mr-2 relative z-10">redeem</span>
            <span className="relative z-10">Create Packet</span>
          </Link>
          <Link
            href="/claim"
            className="glass-button-secondary flex items-center justify-center rounded-xl h-12 xs:h-14 px-6 xs:px-8 bg-white/90 hover:bg-white text-gray-900 text-base xs:text-lg font-bold touch-manipulation relative overflow-hidden group ripple-effect scale-on-hover shadow-xl"
          >
            <span className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
            <span className="material-symbols-outlined mr-2 relative z-10">qr_code_scanner</span>
            <span className="relative z-10">Claim Packet</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
