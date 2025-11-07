'use client'

import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { MainLayout } from '@/components/MainLayout'
import { GiftList } from '@/components/gift/GiftList'

export default function GiftsPage() {
  const { isConnected } = useAccount()

  return (
    <MainLayout>
      <div className="space-y-6 xs:space-y-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 pb-6 xs:pb-8">
          <div className="flex min-w-0 flex-col gap-2 xs:gap-3">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-text-primary-light leading-tight tracking-[-0.033em]">
              My Gifts
            </h1>
            <p className="text-sm xs:text-base text-text-secondary-light">
              View and manage your sent and received gifts.
            </p>
          </div>
          <Link
            href="/gift/create"
            className="glass-button flex items-center gap-2 px-4 xs:px-6 py-3 rounded-lg font-medium text-primary"
          >
            <span className="material-symbols-outlined">add</span>
            <span>Create Gift</span>
          </Link>
        </div>

        {/* Content */}
        {!isConnected ? (
          <div className="glass-card flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-white/30 p-8 xs:p-12 text-center">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-primary">
                account_balance_wallet
              </span>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary-light mb-2">
                Connect Your Wallet
              </p>
              <p className="text-sm text-text-secondary-light mb-4 max-w-md">
                Please connect your wallet to view your gifts.
              </p>
            </div>
            <ConnectButton />
          </div>
        ) : (
          <GiftList />
        )}
      </div>
    </MainLayout>
  )
}
