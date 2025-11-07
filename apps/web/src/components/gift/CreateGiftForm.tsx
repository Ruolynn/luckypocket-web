'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { TokenSelector } from './TokenSelector'
import { NFTSelector } from './NFTSelector'
import { GiftThemeSelector } from './GiftThemeSelector'
import type { GiftType, CreateGiftRequest } from '@/lib/gift-types'

export function CreateGiftForm() {
  const { isConnected, address } = useAccount()
  const [giftType, setGiftType] = useState<GiftType>('TOKEN')
  const [token, setToken] = useState('')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [theme, setTheme] = useState('')
  const [duration, setDuration] = useState('7')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected) return

    const expireTime = new Date(
      Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000
    ).toISOString()

    const giftData: CreateGiftRequest = {
      giftType,
      token,
      amount,
      recipient,
      message,
      theme,
      expireTime,
    }

    // TODO: Implement gift creation logic
    console.log('Creating gift:', giftData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 xs:space-y-8">
      {/* Gift Type Selection */}
      <div>
        <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2 pt-3 xs:pt-4">
          Gift Type
        </h3>
        <div className="glass-card flex h-11 xs:h-12 flex-1 items-center justify-center rounded-lg p-1 bg-white/30">
          <label
            className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 xs:px-3 gap-1 xs:gap-2 touch-manipulation transition-all ${
              giftType === 'TOKEN'
                ? 'glass-button-secondary shadow-sm text-text-primary-light'
                : 'text-text-secondary-light'
            }`}
          >
            <span className="material-symbols-outlined text-base xs:text-lg">
              monetization_on
            </span>
            <span className="truncate text-xs xs:text-sm font-medium">Token Gift</span>
            <input
              type="radio"
              name="gift-type"
              value="TOKEN"
              checked={giftType === 'TOKEN'}
              onChange={() => setGiftType('TOKEN')}
              className="sr-only"
            />
          </label>
          <label
            className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 xs:px-3 gap-1 xs:gap-2 touch-manipulation transition-all ${
              giftType === 'NFT'
                ? 'bg-white shadow-sm text-text-primary-light'
                : 'text-text-secondary-light'
            }`}
          >
            <span className="material-symbols-outlined text-base xs:text-lg">
              card_giftcard
            </span>
            <span className="truncate text-xs xs:text-sm font-medium">NFT Gift</span>
            <input
              type="radio"
              name="gift-type"
              value="NFT"
              checked={giftType === 'NFT'}
              onChange={() => setGiftType('NFT')}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {/* Token/NFT Selection */}
      {giftType === 'TOKEN' ? (
        <TokenSelector
          selectedToken={token}
          amount={amount}
          onTokenSelect={setToken}
          onAmountChange={setAmount}
        />
      ) : (
        <NFTSelector
          selectedNFT={token}
          selectedTokenId={amount}
          onNFTSelect={(contract, tokenId) => {
            setToken(contract)
            setAmount(tokenId)
          }}
        />
      )}

      {/* Recipient Address */}
      <div>
        <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
          Recipient Address
        </h3>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          className="w-full h-12 xs:h-14 px-4 rounded-lg border border-gray-300 bg-white text-text-primary-light text-base xs:text-lg font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          required
        />
        <p className="mt-2 text-xs xs:text-sm text-text-secondary-light">
          Enter the recipient&apos;s wallet address
        </p>
      </div>

      {/* Message */}
      <div>
        <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
          Gift Message
        </h3>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={200}
          rows={4}
          placeholder="Write your gift message..."
          className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-text-primary-light text-sm xs:text-base resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          required
        />
        <p className="mt-2 text-xs xs:text-sm text-text-secondary-light text-right">
          {message.length}/200
        </p>
      </div>

      {/* Theme Selection */}
      <GiftThemeSelector selectedTheme={theme} onThemeSelect={setTheme} />

      {/* Duration */}
      <div>
        <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
          Valid Duration
        </h3>
        <div className="flex gap-2 xs:gap-3">
          {['1', '3', '7', '14'].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setDuration(days)}
              className={`flex-1 h-12 xs:h-14 rounded-lg text-sm xs:text-base font-medium transition-colors touch-manipulation ${
                duration === days
                  ? 'glass-button text-primary'
                  : 'glass-button-secondary text-text-primary-light'
              }`}
            >
              {days} Day{days !== '1' ? 's' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isConnected}
        className="glass-button w-full h-12 xs:h-14 text-primary font-bold rounded-lg text-base xs:text-lg touch-manipulation relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
        <span className="relative z-10">Create Gift</span>
      </button>
    </form>
  )
}
