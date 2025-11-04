/**
 * @file Gifts API
 * @description Gift-related API endpoints
 */

import type { Gift } from '../stores/giftStore'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class GiftsAPI {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    }

    // Add JWT token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('jwt')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get gift by ID
   */
  async getGift(giftId: string): Promise<Gift> {
    return this.request<Gift>(`/api/v1/gifts/${giftId}`)
  }

  /**
   * Get gifts list with filters
   */
  async getGifts(params?: {
    status?: string
    limit?: number
    offset?: number
    orderBy?: 'createdAt' | 'expiresAt'
    order?: 'asc' | 'desc'
  }): Promise<{
    gifts: Gift[]
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }

    return this.request(`/api/v1/gifts?${searchParams.toString()}`)
  }

  /**
   * Get user sent gifts
   */
  async getUserSentGifts(
    address: string,
    params?: {
      page?: number
      limit?: number
      status?: string
      sortBy?: 'createdAt' | 'expiresAt'
      order?: 'asc' | 'desc'
    }
  ): Promise<{
    data: Gift[]
    pagination: {
      page: number
      limit: number
      total: number
      hasMore: boolean
    }
  }> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }

    return this.request(`/api/v1/users/${address}/gifts/sent?${searchParams.toString()}`)
  }

  /**
   * Get user received gifts
   */
  async getUserReceivedGifts(
    address: string,
    params?: {
      page?: number
      limit?: number
      status?: string
      sortBy?: 'createdAt' | 'expiresAt'
      order?: 'asc' | 'desc'
    }
  ): Promise<{
    data: Gift[]
    pagination: {
      page: number
      limit: number
      total: number
      hasMore: boolean
    }
  }> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }

    return this.request(`/api/v1/users/${address}/gifts/received?${searchParams.toString()}`)
  }

  /**
   * Check if user can claim a gift
   */
  async canClaim(giftId: string): Promise<{ canClaim: boolean; reason?: string }> {
    return this.request(`/api/v1/gifts/${giftId}/can-claim`)
  }

  /**
   * Record gift claim
   */
  async recordClaim(
    giftId: string,
    data: {
      txHash: string
      gasUsed?: string
      gasPrice?: string
    }
  ): Promise<{
    success: boolean
    data: {
      giftId: string
      status: string
      claimedAt: string
      claimTxHash: string
    }
  }> {
    return this.request(`/api/v1/gifts/${giftId}/claim`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Get global statistics
   */
  async getStats(): Promise<{
    data: {
      totalGifts: number
      totalClaimed: number
      totalRefunded: number
      totalPending: number
      totalExpired: number
      totalValueETH: string
      totalUsers: number
      stats24h: {
        giftsCreated: number
        giftsClaimed: number
      }
    }
  }> {
    return this.request('/api/v1/stats')
  }
}

export const giftsAPI = new GiftsAPI(API_BASE_URL)
