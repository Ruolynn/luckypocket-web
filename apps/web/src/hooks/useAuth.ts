/**
 * @file useAuth Hook
 * @description SIWE authentication hook
 */

'use client'

import { useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { SiweMessage } from 'siwe'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

export function useAuth() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('jwt')
    setIsAuthenticated(!!token)
  }, [])

  const login = async () => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      setIsLoading(true)

      // 1. Get nonce from backend
      const { nonce } = await api.auth.getNonce(address)

      // 2. Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to DeGift',
        uri: window.location.origin,
        version: '1',
        chainId: 11155111, // Sepolia
        nonce,
      })

      const preparedMessage = message.prepareMessage()

      // 3. Sign message
      const signature = await signMessageAsync({
        message: preparedMessage,
      })

      // 4. Verify signature and get JWT
      const { token } = await api.auth.verify({
        message: preparedMessage,
        signature,
      })

      // 5. Store JWT
      localStorage.setItem('jwt', token)
      setIsAuthenticated(true)

      toast.success('Successfully signed in!')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Failed to sign in')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('jwt')
    setIsAuthenticated(false)
    disconnect()
    toast.success('Signed out')
  }

  return {
    address,
    isConnected,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }
}
