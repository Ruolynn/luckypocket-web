'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/components/MainLayout'
import { ClaimGift } from '@/components/gift/ClaimGift'
import { LoadingState } from '@/components/LoadingState'
import type { Gift } from '@/lib/gift-types'

export default function GiftDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const giftId = params.id as string
  const showClaim = searchParams.get('action') === 'claim'

  const [gift, setGift] = useState<Gift | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (giftId) {
      fetchGiftDetails()
    }
  }, [giftId])

  const fetchGiftDetails = async () => {
    setLoading(true)
    try {
      // TODO: Implement API call to fetch gift details
      // const response = await fetch(`/api/v1/gifts/${giftId}`)
      // const data = await response.json()
      // setGift(data.gift)

      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setError('Gift not found')
    } catch (err) {
      setError('Failed to load gift details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <LoadingState message="Loading gift details..." />
      </MainLayout>
    )
  }

  if (error || !gift) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <span className="material-symbols-outlined text-6xl text-text-secondary-light">
            error
          </span>
          <h2 className="text-2xl font-bold text-text-primary-light">
            {error || 'Gift Not Found'}
          </h2>
          <p className="text-text-secondary-light">
            The gift you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/gifts"
            className="glass-button px-6 py-3 rounded-lg font-medium text-primary"
          >
            View All Gifts
          </Link>
        </div>
      </MainLayout>
    )
  }

  const getThemeColors = () => {
    // TODO: Get theme colors based on gift.theme
    return {
      bg: 'from-red-500/20 to-pink-500/20',
      accent: 'text-red-500',
    }
  }

  const theme = getThemeColors()

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 xs:space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4">
          <Link
            href="/gifts"
            className="size-10 rounded-full glass-button-secondary flex items-center justify-center"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl xs:text-3xl font-black text-text-primary-light">
              Gift Details
            </h1>
            <p className="text-sm text-text-secondary-light">#{gift.giftId}</p>
          </div>
        </div>

        {/* Gift Card with Animation */}
        <div
          className={`glass-card rounded-2xl overflow-hidden bg-gradient-to-br ${theme.bg}`}
        >
          <div className="p-6 xs:p-8">
            {/* Gift Icon */}
            <div className="flex justify-center mb-6">
              <div className={`size-24 rounded-full bg-white/90 flex items-center justify-center ${theme.accent}`}>
                <span className="material-symbols-outlined text-5xl">
                  card_giftcard
                </span>
              </div>
            </div>

            {/* Gift Message */}
            <div className="text-center mb-6">
              <h2 className="text-xl xs:text-2xl font-bold text-text-primary-light mb-3">
                {gift.message || 'A Special Gift for You'}
              </h2>
              <p className="text-sm text-text-secondary-light">
                From{' '}
                <span className="font-medium">
                  {gift.creator.address.slice(0, 6)}...{gift.creator.address.slice(-4)}
                </span>
              </p>
            </div>

            {/* Gift Amount */}
            <div className="glass-card rounded-xl p-6 mb-6">
              <div className="text-center">
                <p className="text-sm text-text-secondary-light mb-2">You will receive</p>
                <p className="text-3xl xs:text-4xl font-black text-text-primary-light">
                  {gift.giftType === 'NFT'
                    ? `NFT #${gift.amount}`
                    : `${parseFloat(gift.amount) / Math.pow(10, gift.tokenDecimals || 18)} ${gift.tokenSymbol || 'TOKEN'}`
                  }
                </p>
                {gift.giftType === 'TOKEN' && gift.tokenSymbol && (
                  <p className="text-sm text-text-secondary-light mt-2">
                    {gift.tokenSymbol}
                  </p>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary-light">Type</span>
                <span className="font-medium text-text-primary-light">
                  {gift.giftType === 'NFT' ? 'NFT Gift' : 'Token Gift'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary-light">Status</span>
                <span className="font-medium text-text-primary-light">
                  {gift.claimed ? 'Claimed' : 'Unclaimed'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary-light">Expires</span>
                <span className="font-medium text-text-primary-light">
                  {new Date(gift.expireTime).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Claim Section */}
        {showClaim && <ClaimGift gift={gift} />}

        {/* Transaction Info */}
        {gift.txHash && (
          <div className="glass-card rounded-lg p-4">
            <p className="text-sm font-medium text-text-primary-light mb-2">
              Transaction Hash
            </p>
            <a
              href={`https://basescan.org/tx/${gift.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline font-mono break-all"
            >
              {gift.txHash}
            </a>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
