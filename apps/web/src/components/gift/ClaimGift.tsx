'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import type { Gift } from '@/lib/gift-types'

interface ClaimGiftProps {
  gift: Gift
  onSuccess?: () => void
}

export function ClaimGift({ gift, onSuccess }: ClaimGiftProps) {
  const { isConnected, address } = useAccount()
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(gift.claimed)

  const isClaimed = claimed || gift.claimed
  const isExpired = new Date(gift.expireTime) < new Date()
  const isRecipient = address?.toLowerCase() === gift.recipient.toLowerCase()

  const handleClaim = async () => {
    if (!isConnected || !isRecipient || isClaimed || isExpired) return

    setClaiming(true)
    try {
      // TODO: Implement claim logic
      console.log('Claiming gift:', gift.giftId)

      // Mock claim success
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setClaimed(true)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to claim gift:', error)
    } finally {
      setClaiming(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="glass-card rounded-lg p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-primary">
              account_balance_wallet
            </span>
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary-light mb-2">
              Connect Your Wallet
            </p>
            <p className="text-sm text-text-secondary-light mb-4">
              Please connect your wallet to claim this gift
            </p>
          </div>
          <ConnectButton />
        </div>
      </div>
    )
  }

  if (!isRecipient) {
    return (
      <div className="glass-card rounded-lg border-2 border-yellow-500/30 bg-yellow-500/5 p-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-2xl text-yellow-600">
            warning
          </span>
          <div>
            <p className="font-bold text-text-primary-light mb-1">Not Your Gift</p>
            <p className="text-sm text-text-secondary-light">
              This gift is intended for{' '}
              <span className="font-mono">
                {gift.recipient.slice(0, 6)}...{gift.recipient.slice(-4)}
              </span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isClaimed) {
    return (
      <div className="glass-card rounded-lg border-2 border-green-500/30 bg-green-500/5 p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-green-600">
              check_circle
            </span>
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary-light mb-1">
              Gift Claimed!
            </p>
            <p className="text-sm text-text-secondary-light">
              This gift has been successfully claimed
            </p>
            {gift.claimedAt && (
              <p className="text-xs text-text-secondary-light mt-2">
                Claimed on {new Date(gift.claimedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="glass-card rounded-lg border-2 border-gray-500/30 bg-gray-500/5 p-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-2xl text-gray-600">
            schedule
          </span>
          <div>
            <p className="font-bold text-text-primary-light mb-1">Gift Expired</p>
            <p className="text-sm text-text-secondary-light">
              This gift expired on {new Date(gift.expireTime).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-lg p-6">
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-bold text-text-primary-light mb-2">
            Ready to Claim Your Gift?
          </p>
          <p className="text-sm text-text-secondary-light">
            Click the button below to receive your gift
          </p>
        </div>

        <button
          onClick={handleClaim}
          disabled={claiming}
          className="glass-button w-full h-14 text-primary font-bold rounded-lg text-lg relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
          <span className="relative z-10 flex items-center justify-center gap-2">
            {claiming ? (
              <>
                <span className="material-symbols-outlined animate-spin">refresh</span>
                <span>Claiming...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">card_giftcard</span>
                <span>Claim Gift</span>
              </>
            )}
          </span>
        </button>

        <div className="text-xs text-text-secondary-light text-center">
          <p>Gas fees will be required to claim this gift</p>
        </div>
      </div>
    </div>
  )
}
