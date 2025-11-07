'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { MainLayout } from '@/components/MainLayout'
import { images } from '@/lib/images'

type PacketType = 'fixed' | 'random'
type TokenType = 'ETH' | 'USDC' | 'USDT' | 'custom'

export default function CreatePacketPage() {
  const router = useRouter()
  const { isConnected: realIsConnected, address: realAddress } = useAccount()
  const [isTestMode, setIsTestMode] = useState(false)
  const [mockConnected, setMockConnected] = useState(false)

  useEffect(() => {
    const testMode = localStorage.getItem('testMode') === 'true'
    const mockWallet = localStorage.getItem('mockWalletConnected') === 'true'
    setIsTestMode(testMode)
    setMockConnected(mockWallet)
  }, [])

  const isConnected = isTestMode ? mockConnected : realIsConnected
  const address = isTestMode
    ? (mockConnected ? '0x1234...5678' : undefined)
    : realAddress
  const [packetType, setPacketType] = useState<PacketType>('fixed')
  const [amount, setAmount] = useState('')
  const [count, setCount] = useState('10')
  const [duration, setDuration] = useState('7')
  const [message, setMessage] = useState('')
  const [token, setToken] = useState<TokenType>('ETH')
  const [customTokenAddress, setCustomTokenAddress] = useState('')

  const presetAmounts = ['0.01', '0.05', '0.1', '0.5', '1.0']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected) return
    // TODO: Implement create packet logic
    console.log({ packetType, amount, count, duration, message, token })
    // Simulate packet creation and get ID
    const mockPacketId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    // Redirect to success page after creation
    router.push(`/create/success?id=${mockPacketId}`)
  }

  return (
    <MainLayout>
      <div className="space-y-6 xs:space-y-8">
        {/* Enhanced Header with Background */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-purple-50/50 to-accent/10 mb-6 xs:mb-8 mx-3 xs:mx-4">
          {/* Background Image */}
          <div className="absolute inset-0 opacity-15">
            <Image
              src={images.technology.network}
              alt="Digital network"
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>

          {/* Decorative Gradient Blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/30 rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative flex flex-wrap justify-between items-center gap-4 p-6 xs:p-8">
            <div className="flex min-w-0 flex-col gap-2 xs:gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-primary text-2xl">
                    add_circle
                  </span>
                </div>
                <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-text-primary-light leading-tight tracking-[-0.033em]">
                  Create a New Lucky Packet
                </h1>
              </div>
              <p className="text-sm xs:text-base text-text-secondary-light pl-15">
                Fill in the details below to share some luck with your friends.
              </p>
            </div>
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
                Please connect your wallet to see your balance and create a Lucky Packet.
              </p>
              <ConnectButton />
            </div>
          ) : (
            <div className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary-light">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                  <p className="text-sm text-text-secondary-light">Balance: -- ETH</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200"></div>

        {/* Form */}
        {isConnected && (
          <form onSubmit={handleSubmit} className="space-y-6 xs:space-y-8">
            {/* Packet Type */}
            <div>
              <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2 pt-3 xs:pt-4">
                Packet Type
              </h3>
              <div className="glass-card flex h-11 xs:h-12 flex-1 items-center justify-center rounded-lg p-1 bg-white/30">
                <label
                  className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 xs:px-3 gap-1 xs:gap-2 touch-manipulation transition-all ${
                    packetType === 'fixed'
                      ? 'glass-button-secondary shadow-sm text-text-primary-light'
                      : 'text-text-secondary-light'
                  }`}
                >
                  <span className="material-symbols-outlined text-base xs:text-lg">
                    monetization_on
                  </span>
                  <span className="truncate text-xs xs:text-sm font-medium">Fixed Amount</span>
                  <input
                    type="radio"
                    name="packet-type"
                    value="fixed"
                    checked={packetType === 'fixed'}
                    onChange={() => setPacketType('fixed')}
                    className="sr-only"
                  />
                </label>
                <label
                  className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 xs:px-3 gap-1 xs:gap-2 touch-manipulation transition-all ${
                    packetType === 'random'
                      ? 'bg-white shadow-sm text-text-primary-light'
                      : 'text-text-secondary-light'
                  }`}
                >
                  <span className="material-symbols-outlined text-base xs:text-lg">casino</span>
                  <span className="truncate text-xs xs:text-sm font-medium">Random Amount</span>
                  <input
                    type="radio"
                    name="packet-type"
                    value="random"
                    checked={packetType === 'random'}
                    onChange={() => setPacketType('random')}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Amount */}
            <div>
              <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
                Total Amount
              </h3>
              <div className="space-y-3 xs:space-y-4">
                {/* Preset Amounts */}
                <div className="grid grid-cols-5 gap-2 xs:gap-3">
                  {presetAmounts.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
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
                    step="0.001"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter custom amount"
                    className="w-full h-12 xs:h-14 px-4 rounded-lg border border-gray-300 bg-white text-text-primary-light text-base xs:text-lg font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light font-medium">
                    {token}
                  </span>
                </div>
              </div>
            </div>

            {/* Packet Count */}
            <div>
              <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
                Number of Packets
              </h3>
              <input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full h-12 xs:h-14 px-4 rounded-lg border border-gray-300 bg-white text-text-primary-light text-base xs:text-lg font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
              <p className="mt-2 text-xs xs:text-sm text-text-secondary-light">
                Minimum 1, Maximum 100 packets
              </p>
            </div>

            {/* Duration */}
            <div>
              <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
                Valid Duration
              </h3>
              <div className="flex gap-2 xs:gap-3">
                {['1', '3', '7'].map((days) => (
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
              <p className="mt-2 text-xs xs:text-sm text-text-secondary-light">
                Maximum 7 days
              </p>
            </div>

            {/* Token Selection */}
            <div>
              <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
                Token
              </h3>
              <div className="grid grid-cols-3 gap-2 xs:gap-3">
                {(['ETH', 'USDC', 'USDT'] as TokenType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setToken(t)}
                    className={`h-12 xs:h-14 rounded-lg text-sm xs:text-base font-medium transition-colors touch-manipulation ${
                      token === t
                        ? 'glass-button text-primary'
                        : 'glass-button-secondary text-text-primary-light'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {token === 'custom' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={customTokenAddress}
                    onChange={(e) => setCustomTokenAddress(e.target.value)}
                    placeholder="Token contract address"
                    className="w-full h-12 px-4 rounded-lg border border-gray-300 bg-white text-text-primary-light text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              )}
            </div>

            {/* Message */}
            <div>
              <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
                Blessing Message (Optional)
              </h3>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={100}
                rows={3}
                placeholder="Enter your blessing message..."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-text-primary-light text-sm xs:text-base resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <p className="mt-2 text-xs xs:text-sm text-text-secondary-light text-right">
                {message.length}/100
              </p>
            </div>

            {/* Fee Summary */}
            <div className="glass-card rounded-lg p-4 xs:p-6">
              <h3 className="text-base xs:text-lg font-bold text-text-primary-light mb-3">
                Fee Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary-light">Platform Fee</span>
                  <span className="text-text-primary-light font-medium">2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary-light">Gas Fee</span>
                  <span className="text-text-primary-light font-medium">~$2-5</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-bold text-text-primary-light">Total</span>
                    <span className="text-base font-bold text-text-primary-light">
                      {amount ? `$${(parseFloat(amount) * 0.02).toFixed(4)} + Gas` : '--'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="glass-button w-full h-12 xs:h-14 text-primary font-bold rounded-lg text-base xs:text-lg touch-manipulation relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              <span className="relative z-10">Create Lucky Packet</span>
            </button>
          </form>
        )}
      </div>
    </MainLayout>
  )
}

