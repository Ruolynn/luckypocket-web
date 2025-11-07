'use client'

import Link from 'next/link'
import type { Gift } from '@/lib/gift-types'

interface GiftCardProps {
  gift: Gift
}

export function GiftCard({ gift }: GiftCardProps) {
  const isClaimed = gift.claimed
  const isExpired = new Date(gift.expireTime) < new Date()

  const getStatusColor = () => {
    if (isClaimed) return 'text-green-400 bg-green-500/10'
    if (isExpired) return 'text-gray-400 bg-gray-500/10'
    return 'text-accent bg-accent/20'
  }

  const getStatusText = () => {
    if (isClaimed) return 'Claimed'
    if (isExpired) return 'Expired'
    return 'Active'
  }

  return (
    <div
      className={`glass-card flex flex-col rounded-xl p-4 xs:p-6 transition-all ${
        isClaimed || isExpired ? 'opacity-60' : ''
      }`}
    >
      {/* Gift Type Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {gift.giftType === 'NFT' ? '🎨 NFT Gift' : '💰 Token Gift'}
        </span>
        <span className="text-xs text-text-secondary-light">
          {getStatusText()}
        </span>
      </div>

      {/* Gift Content */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className={`flex items-center justify-center rounded-lg shrink-0 size-14 xs:size-16 text-3xl xs:text-4xl ${getStatusColor()}`}
        >
          <span className="material-symbols-outlined">card_giftcard</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base xs:text-lg font-bold text-text-primary-light truncate mb-1">
            {gift.message || 'A Special Gift for You'}
          </p>
          <p className="text-sm text-text-secondary-light">
            From: {gift.creator.address.slice(0, 6)}...{gift.creator.address.slice(-4)}
          </p>
          <p className="text-sm text-text-secondary-light">
            To: {gift.recipient.slice(0, 6)}...{gift.recipient.slice(-4)}
          </p>
        </div>
      </div>

      {/* Amount Info */}
      <div className="glass-card rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary-light">Amount</span>
          <span className="text-lg font-bold text-text-primary-light">
            {gift.giftType === 'NFT'
              ? `NFT #${gift.amount}`
              : `${parseFloat(gift.amount) / Math.pow(10, gift.tokenDecimals || 18)} ${gift.tokenSymbol || 'TOKEN'}`
            }
          </span>
        </div>
      </div>

      {/* Expiry Info */}
      <div className="text-xs text-text-secondary-light mb-4">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">schedule</span>
          <span>
            {isExpired
              ? `Expired on ${new Date(gift.expireTime).toLocaleDateString()}`
              : `Expires on ${new Date(gift.expireTime).toLocaleDateString()}`
            }
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Link
          href={`/gift/${gift.giftId}`}
          className="flex-1 glass-button flex items-center justify-center rounded-lg h-11 text-sm font-medium text-primary"
        >
          View Details
        </Link>
        {!isClaimed && !isExpired && (
          <Link
            href={`/gift/${gift.giftId}?action=claim`}
            className="flex-1 glass-button-secondary flex items-center justify-center rounded-lg h-11 text-sm font-medium text-text-primary-light"
          >
            Claim Gift
          </Link>
        )}
      </div>
    </div>
  )
}
