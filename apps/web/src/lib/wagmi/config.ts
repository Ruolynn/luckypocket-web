/**
 * @file Wagmi Configuration
 * @description Wagmi and RainbowKit configuration for DeGift
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { base, sepolia } from 'wagmi/chains'

// Get WalletConnect project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID'

if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
  console.warn(
    '⚠️  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set. Get one at https://cloud.walletconnect.com'
  )
}

/**
 * Wagmi configuration with RainbowKit defaults
 * Supports Base and Sepolia testnets
 */
export const wagmiConfig = getDefaultConfig({
  appName: 'DeGift',
  projectId,
  chains: [base, sepolia],
  ssr: true, // Enable server-side rendering support
})

/**
 * Supported chains for the app
 */
export const supportedChains = [base, sepolia] as const

/**
 * Default chain (Sepolia for development)
 */
export const defaultChain = sepolia
