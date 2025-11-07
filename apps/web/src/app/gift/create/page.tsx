'use client'

import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { MainLayout } from '@/components/MainLayout'
import { CreateGiftForm } from '@/components/gift/CreateGiftForm'

export default function CreateGiftPage() {
  const { isConnected, address } = useAccount()

  return (
    <MainLayout>
      <div className="space-y-6 xs:space-y-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between gap-3 pb-6 xs:pb-8">
          <div className="flex min-w-0 flex-col gap-2 xs:gap-3">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-text-primary-light leading-tight tracking-[-0.033em]">
              Create a Gift
            </h1>
            <p className="text-sm xs:text-base text-text-secondary-light">
              Send tokens or NFTs as a special gift to someone you care about.
            </p>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="space-y-3 xs:space-y-4">
          <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
            Connect Your Wallet
          </h3>
          {!isConnected ? (
            <div className="glass-card flex flex-col items-center justify-center gap-3 xs:gap-4 rounded-lg border border-dashed border-white/30 p-4 xs:p-6 text-center">
              <div className="flex size-10 xs:size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-2xl xs:text-3xl">
                  account_balance_wallet
                </span>
              </div>
              <p className="text-sm xs:text-base font-medium text-text-primary-light">
                Your wallet is not connected
              </p>
              <p className="max-w-xs text-xs xs:text-sm text-text-secondary-light px-2">
                Please connect your wallet to see your balance and create a gift.
              </p>
              <ConnectButton />
            </div>
          ) : (
            <div className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">
                    account_balance_wallet
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary-light">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                  <p className="text-sm text-text-secondary-light">Connected</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200"></div>

        {/* Form */}
        {isConnected && <CreateGiftForm />}
      </div>
    </MainLayout>
  )
}
