/**
 * @file useGiftSocket Hook
 * @description WebSocket hook for real-time gift updates
 */

'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useGiftStore } from '@/lib/stores/giftStore'
import { toast } from 'sonner'
import type { Gift } from '@/lib/stores/giftStore'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'

/**
 * Connect to WebSocket and listen for gift events
 */
export function useGiftSocket(address?: string) {
  const queryClient = useQueryClient()
  const addGift = useGiftStore((s) => s.addGift)
  const updateGift = useGiftStore((s) => s.updateGift)

  useEffect(() => {
    if (typeof window === 'undefined' || !address) {
      return
    }

    // Dynamically import socket.io-client only on client side
    import('socket.io-client').then(({ io }) => {
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        auth: {
          token: localStorage.getItem('jwt'),
        },
      })

      socket.on('connect', () => {
        console.log('✅ WebSocket connected')
      })

      socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected')
      })

      // Listen for gift created events
      socket.on('gift:created', (data: { gift: Gift }) => {
        console.log('🎁 New gift created:', data.gift)

        // Check if user is involved (sender or recipient)
        const isRecipient = data.gift.recipientAddress.toLowerCase() === address.toLowerCase()
        const isSender = data.gift.sender.address.toLowerCase() === address.toLowerCase()

        if (isRecipient || isSender) {
          addGift(data.gift)

          if (isRecipient) {
            toast.success('🎁 You received a new gift!')
          }

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['gifts'] })
          queryClient.invalidateQueries({ queryKey: ['user-sent-gifts', address] })
          queryClient.invalidateQueries({ queryKey: ['user-received-gifts', address] })
        }
      })

      // Listen for gift claimed events
      socket.on('gift:claimed', (data: { giftId: string; claimedAt: string }) => {
        console.log('✅ Gift claimed:', data.giftId)

        updateGift(data.giftId, {
          status: 'CLAIMED',
          claimedAt: data.claimedAt,
        })

        toast.info('A gift was claimed!')

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['gift', data.giftId] })
        queryClient.invalidateQueries({ queryKey: ['gifts'] })
        queryClient.invalidateQueries({ queryKey: ['user-sent-gifts', address] })
        queryClient.invalidateQueries({ queryKey: ['user-received-gifts', address] })
      })

      // Listen for gift refunded events
      socket.on('gift:refunded', (data: { giftId: string }) => {
        console.log('↩️ Gift refunded:', data.giftId)

        updateGift(data.giftId, {
          status: 'REFUNDED',
        })

        toast.info('A gift was refunded')

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['gift', data.giftId] })
        queryClient.invalidateQueries({ queryKey: ['gifts'] })
      })

      // Cleanup
      return () => {
        socket.disconnect()
      }
    })
  }, [address, addGift, updateGift, queryClient])
}
