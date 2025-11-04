/**
 * @file SIWE Authentication Type Definitions
 * @description Types for Sign-In with Ethereum authentication system
 */

export interface NonceResponse {
  nonce: string
}

export interface VerifyRequest {
  message: string
  signature: string
}

export interface AuthUser {
  id: string
  address: string
}

export interface VerifyResponse {
  token: string
  user: AuthUser
}

export interface JWTPayload {
  userId: string
  address: string
  iat?: number
  exp?: number
}

export interface SIWEValidationResult {
  address: string
  nonce: string
  domain: string
  chainId: number
  expirationTime?: string
  notBefore?: string
}
