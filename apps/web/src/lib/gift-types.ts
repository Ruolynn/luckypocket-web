// Gift Feature Types

export type GiftType = 'TOKEN' | 'NFT'
export type GiftStatus = 'PENDING' | 'ACTIVE' | 'CLAIMED' | 'EXPIRED' | 'REFUNDED'

export interface Gift {
  id: string
  giftId: string
  txHash?: string
  creator: {
    id: string
    address: string
  }
  creatorId: string

  // Gift type and token info
  giftType: GiftType
  token: string  // For TOKEN type: ERC20 address, For NFT type: NFT contract address
  tokenSymbol?: string
  tokenDecimals?: number

  // Amount info
  amount: string  // For TOKEN: amount in wei, For NFT: tokenId

  // Recipient info
  recipient: string  // Recipient address
  recipientUser?: {
    id: string
    address: string
  }

  // Message and theme
  message: string
  theme?: string

  // Status
  status: GiftStatus
  claimed: boolean
  claimedAt?: string
  claimTxHash?: string

  // Expiry
  expireTime: string
  refunded: boolean
  refundTxHash?: string

  // Timestamps
  createdAt: string
  updatedAt: string
}

export interface NFTMetadata {
  name: string
  description: string
  image: string
  tokenId: string
  contractAddress: string
  tokenType: 'ERC721' | 'ERC1155'
}

// API Request/Response Types
export interface CreateGiftRequest {
  giftType: GiftType
  token: string
  amount: string
  recipient: string
  message: string
  theme?: string
  expireTime: string
}

export interface CreateGiftResponse {
  gift: Gift
}

export interface ClaimGiftRequest {
  giftId: string
}

export interface ClaimGiftResponse {
  gift: Gift
  txHash: string
}

export interface GiftListResponse {
  gifts: Gift[]
  total: number
  page: number
  limit: number
}

// Token Info
export interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  balance?: string
}

// Gift Theme
export interface GiftTheme {
  id: string
  name: string
  previewImage: string
  backgroundColor: string
  accentColor: string
}
