/**
 * @file Loading Store
 * @description Global loading state management
 */

import { create } from 'zustand'

interface LoadingStore {
  isLoading: boolean
  loadingMessage: string | null
  startLoading: (message?: string) => void
  stopLoading: () => void
}

export const useLoadingStore = create<LoadingStore>((set) => ({
  isLoading: false,
  loadingMessage: null,
  startLoading: (message) => set({ isLoading: true, loadingMessage: message || null }),
  stopLoading: () => set({ isLoading: false, loadingMessage: null }),
}))
