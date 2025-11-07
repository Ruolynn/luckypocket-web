'use client'

import { useState, useEffect } from 'react'
import type { TokenInfo } from '@/lib/gift-types'

interface TokenSelectorProps {
  selectedToken: string
  amount: string
  onTokenSelect: (token: string) => void
  onAmountChange: (amount: string) => void
}

// Popular tokens on Base
const POPULAR_TOKENS: TokenInfo[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
  },
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
  },
]

export function TokenSelector({
  selectedToken,
  amount,
  onTokenSelect,
  onAmountChange,
}: TokenSelectorProps) {
  const [customToken, setCustomToken] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const presetAmounts = ['0.01', '0.05', '0.1', '0.5', '1.0']

  const selectedTokenInfo = POPULAR_TOKENS.find((t) => t.address === selectedToken)

  return (
    <div className="space-y-6">
      {/* Token Selection */}
      <div>
        <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
          Select Token
        </h3>
        <div className="grid grid-cols-3 gap-2 xs:gap-3">
          {POPULAR_TOKENS.map((token) => (
            <button
              key={token.address}
              type="button"
              onClick={() => {
                onTokenSelect(token.address)
                setShowCustomInput(false)
              }}
              className={`h-14 xs:h-16 rounded-lg text-sm xs:text-base font-medium transition-colors touch-manipulation flex flex-col items-center justify-center gap-1 ${
                selectedToken === token.address
                  ? 'glass-button text-primary'
                  : 'glass-button-secondary text-text-primary-light'
              }`}
            >
              <span className="font-bold">{token.symbol}</span>
              <span className="text-xs text-text-secondary-light">{token.name}</span>
            </button>
          ))}
        </div>

        {/* Custom Token */}
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="mt-3 w-full glass-button-secondary h-12 rounded-lg text-sm font-medium text-text-primary-light"
        >
          {showCustomInput ? 'Hide Custom Token' : 'Use Custom Token'}
        </button>

        {showCustomInput && (
          <div className="mt-3">
            <input
              type="text"
              value={customToken}
              onChange={(e) => {
                setCustomToken(e.target.value)
                onTokenSelect(e.target.value)
              }}
              placeholder="Token contract address (0x...)"
              className="w-full h-12 px-4 rounded-lg border border-gray-300 bg-white text-text-primary-light text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        )}
      </div>

      {/* Amount Selection */}
      <div>
        <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
          Amount
        </h3>
        <div className="space-y-3 xs:space-y-4">
          {/* Preset Amounts */}
          <div className="grid grid-cols-5 gap-2 xs:gap-3">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onAmountChange(preset)}
                className={`h-10 xs:h-12 rounded-lg text-xs xs:text-sm font-medium transition-colors touch-manipulation ${
                  amount === preset
                    ? 'glass-button text-primary'
                    : 'glass-button-secondary text-text-primary-light'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Custom Amount Input */}
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              min="0"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="Enter custom amount"
              className="w-full h-12 xs:h-14 px-4 rounded-lg border border-gray-300 bg-white text-text-primary-light text-base xs:text-lg font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light font-medium">
              {selectedTokenInfo?.symbol || 'TOKEN'}
            </span>
          </div>

          {/* Balance Display */}
          {selectedTokenInfo && (
            <p className="text-xs xs:text-sm text-text-secondary-light">
              Balance: {selectedTokenInfo.balance || '--'} {selectedTokenInfo.symbol}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
