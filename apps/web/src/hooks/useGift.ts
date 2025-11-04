/**
 * @file useGift Hooks
 * @description React Query hooks for gift operations
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { giftsAPI } from '@/lib/api/gifts'
import { useGiftStore } from '@/lib/stores/giftStore'
import { toast } from 'sonner'

/**
 * Get single gift by ID
 */
export function useGift(giftId: string | undefined) {
  return useQuery({
    queryKey: ['gift', giftId],
    queryFn: () => giftsAPI.getGift(giftId!),
    enabled: !!giftId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Get gifts list
 */
export function useGifts(params?: Parameters<typeof giftsAPI.getGifts>[0]) {
  const setGifts = useGiftStore((s) => s.setGifts)

  return useQuery({
    queryKey: ['gifts', params],
    queryFn: async () => {
      const result = await giftsAPI.getGifts(params)
      setGifts(result.gifts)
      return result
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Get user sent gifts
 */
export function useUserSentGifts(address: string | undefined, params?: Parameters<typeof giftsAPI.getUserSentGifts>[1]) {
  const setUserSentGifts = useGiftStore((s) => s.setUserSentGifts)

  return useQuery({
    queryKey: ['user-sent-gifts', address, params],
    queryFn: async () => {
      const result = await giftsAPI.getUserSentGifts(address!, params)
      setUserSentGifts(result.data)
      return result
    },
    enabled: !!address,
    staleTime: 30 * 1000,
  })
}

/**
 * Get user received gifts
 */
export function useUserReceivedGifts(address: string | undefined, params?: Parameters<typeof giftsAPI.getUserReceivedGifts>[1]) {
  const setUserReceivedGifts = useGiftStore((s) => s.setUserReceivedGifts)

  return useQuery({
    queryKey: ['user-received-gifts', address, params],
    queryFn: async () => {
      const result = await giftsAPI.getUserReceivedGifts(address!, params)
      setUserReceivedGifts(result.data)
      return result
    },
    enabled: !!address,
    staleTime: 30 * 1000,
  })
}

/**
 * Check if can claim gift
 */
export function useCanClaim(giftId: string | undefined) {
  return useQuery({
    queryKey: ['can-claim', giftId],
    queryFn: () => giftsAPI.canClaim(giftId!),
    enabled: !!giftId,
    staleTime: 10 * 1000, // 10 seconds
  })
}

/**
 * Record gift claim mutation
 */
export function useRecordClaim() {
  const queryClient = useQueryClient()
  const updateGift = useGiftStore((s) => s.updateGift)

  return useMutation({
    mutationFn: ({ giftId, data }: { giftId: string; data: Parameters<typeof giftsAPI.recordClaim>[1] }) =>
      giftsAPI.recordClaim(giftId, data),
    onSuccess: (result, variables) => {
      toast.success('Gift claim recorded successfully!')

      // Update gift in store
      updateGift(variables.giftId, {
        status: 'CLAIMED',
        claimedAt: result.data.claimedAt,
      })

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['gift', variables.giftId] })
      queryClient.invalidateQueries({ queryKey: ['gifts'] })
      queryClient.invalidateQueries({ queryKey: ['user-received-gifts'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to record claim: ${error.message}`)
    },
  })
}

/**
 * Get global statistics
 */
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => giftsAPI.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache)
  })
}
