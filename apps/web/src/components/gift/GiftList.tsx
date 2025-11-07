'use client'

import { useState } from 'react'
import { GiftCard } from './GiftCard'
import type { Gift } from '@/lib/gift-types'

interface GiftListProps {
  initialGifts?: Gift[]
}

export function GiftList({ initialGifts = [] }: GiftListProps) {
  const [gifts, setGifts] = useState<Gift[]>(initialGifts)
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all')
  const [loading, setLoading] = useState(false)

  // TODO: Fetch gifts from API
  const fetchGifts = async () => {
    setLoading(true)
    // Mock API call
    setTimeout(() => {
      setGifts(initialGifts)
      setLoading(false)
    }, 1000)
  }

  const filteredGifts = gifts.filter((gift) => {
    // TODO: Implement filtering based on current user
    return true
  })

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="glass-card flex h-12 items-center justify-center rounded-lg p-1 bg-white/30">
        <button
          onClick={() => setFilter('all')}
          className={`flex cursor-pointer h-full grow items-center justify-center rounded-md px-3 gap-2 transition-all ${
            filter === 'all'
              ? 'glass-button-secondary shadow-sm text-text-primary-light'
              : 'text-text-secondary-light'
          }`}
        >
          <span className="material-symbols-outlined text-lg">card_giftcard</span>
          <span className="text-sm font-medium">All Gifts</span>
        </button>
        <button
          onClick={() => setFilter('sent')}
          className={`flex cursor-pointer h-full grow items-center justify-center rounded-md px-3 gap-2 transition-all ${
            filter === 'sent'
              ? 'glass-button-secondary shadow-sm text-text-primary-light'
              : 'text-text-secondary-light'
          }`}
        >
          <span className="material-symbols-outlined text-lg">send</span>
          <span className="text-sm font-medium">Sent</span>
        </button>
        <button
          onClick={() => setFilter('received')}
          className={`flex cursor-pointer h-full grow items-center justify-center rounded-md px-3 gap-2 transition-all ${
            filter === 'received'
              ? 'glass-button-secondary shadow-sm text-text-primary-light'
              : 'text-text-secondary-light'
          }`}
        >
          <span className="material-symbols-outlined text-lg">inbox</span>
          <span className="text-sm font-medium">Received</span>
        </button>
      </div>

      {/* Gift List */}
      {loading ? (
        <div className="glass-card rounded-lg p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              refresh
            </span>
            <p className="text-text-secondary-light">Loading gifts...</p>
          </div>
        </div>
      ) : filteredGifts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGifts.map((gift) => (
            <GiftCard key={gift.id} gift={gift} />
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-lg border border-dashed border-white/30 p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-5xl text-text-secondary-light">
              card_giftcard
            </span>
            <p className="text-lg font-bold text-text-primary-light">No gifts found</p>
            <p className="text-sm text-text-secondary-light max-w-md">
              {filter === 'sent'
                ? "You haven't sent any gifts yet. Create your first gift to get started!"
                : filter === 'received'
                  ? "You haven't received any gifts yet."
                  : 'No gifts to display.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
