/**
 * @file Gift Store
 * @description Zustand store for gift state management
 */

import { create } from 'zustand'

export interface Gift {
  id: string
  giftId: string
  chainId: number
  sender: {
    id: string
    address: string
  }
  recipient?: {
    id: string
    address: string
  }
  recipientAddress: string
  tokenType: 'ETH' | 'ERC20' | 'ERC721' | 'ERC1155'
  token: string
  amount: string
  tokenSymbol?: string
  tokenDecimals?: number
  message?: string
  status: 'PENDING' | 'CLAIMED' | 'REFUNDED' | 'EXPIRED'
  expiresAt: string
  createdAt: string
  claimedAt?: string
}

interface GiftStore {
  // State
  gifts: Gift[]
  selectedGift: Gift | null
  userSentGifts: Gift[]
  userReceivedGifts: Gift[]

  // Actions
  setGifts: (gifts: Gift[]) => void
  addGift: (gift: Gift) => void
  updateGift: (giftId: string, updates: Partial<Gift>) => void
  selectGift: (giftId: string | null) => void
  setUserSentGifts: (gifts: Gift[]) => void
  setUserReceivedGifts: (gifts: Gift[]) => void
  clearGifts: () => void
}

export const useGiftStore = create<GiftStore>((set, get) => ({
  // Initial state
  gifts: [],
  selectedGift: null,
  userSentGifts: [],
  userReceivedGifts: [],

  // Actions
  setGifts: (gifts) => set({ gifts }),

  addGift: (gift) =>
    set((state) => ({
      gifts: [gift, ...state.gifts],
    })),

  updateGift: (giftId, updates) =>
    set((state) => ({
      gifts: state.gifts.map((g) => (g.giftId === giftId ? { ...g, ...updates } : g)),
      selectedGift:
        state.selectedGift?.giftId === giftId
          ? { ...state.selectedGift, ...updates }
          : state.selectedGift,
    })),

  selectGift: (giftId) => {
    if (!giftId) {
      set({ selectedGift: null })
      return
    }
    const gift = get().gifts.find((g) => g.giftId === giftId)
    set({ selectedGift: gift || null })
  },

  setUserSentGifts: (gifts) => set({ userSentGifts: gifts }),

  setUserReceivedGifts: (gifts) => set({ userReceivedGifts: gifts }),

  clearGifts: () =>
    set({
      gifts: [],
      selectedGift: null,
      userSentGifts: [],
      userReceivedGifts: [],
    }),
}))
