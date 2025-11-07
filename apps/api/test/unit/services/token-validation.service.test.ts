/**
 * @file Token Validation Service Unit Tests
 * @description Tests for token validation, blacklist/whitelist, and risk assessment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TokenValidationService, TokenRisk } from '../../../src/services/token-validation.service'
import type { Address } from 'viem'

// Mock contract service
vi.mock('../../../src/services/contract.service', () => ({
  getTokenMetadata: vi.fn(async (address: Address) => {
    // Mock USDC metadata
    if (address.toLowerCase() === '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238') {
      return { symbol: 'USDC', decimals: 6, name: 'USD Coin' }
    }
    // Mock suspicious token
    if (address.toLowerCase() === '0x0000000000000000000000000000000000000001') {
      return { symbol: 'SCAM', decimals: 18, name: 'Fake Test Token' }
    }
    // Default valid token
    return { symbol: 'TEST', decimals: 18, name: 'Test Token' }
  }),
}))

describe('TokenValidationService', () => {
  let service: TokenValidationService

  beforeEach(() => {
    // Reset environment variables
    delete process.env.TOKEN_BLACKLIST
    delete process.env.TOKEN_WHITELIST
    service = new TokenValidationService()
  })

  describe('constructor', () => {
    it('should initialize with empty blacklist and whitelist by default', () => {
      expect(service.isBlacklisted('0x0000000000000000000000000000000000000000' as Address)).toBe(false)
      expect(service.isWhitelisted('0x0000000000000000000000000000000000000000' as Address)).toBe(false)
    })

    it('should load blacklist from environment variable', () => {
      process.env.TOKEN_BLACKLIST = '0xBAD1111111111111111111111111111111111111,0xBAD2222222222222222222222222222222222222'
      const serviceWithBlacklist = new TokenValidationService()

      expect(serviceWithBlacklist.isBlacklisted('0xBAD1111111111111111111111111111111111111' as Address)).toBe(true)
      expect(serviceWithBlacklist.isBlacklisted('0xbad1111111111111111111111111111111111111' as Address)).toBe(true) // Case insensitive
      expect(serviceWithBlacklist.isBlacklisted('0xBAD2222222222222222222222222222222222222' as Address)).toBe(true)
    })

    it('should load whitelist from environment variable', () => {
      process.env.TOKEN_WHITELIST = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238,0x2c7d4b196cb0c7b01d743fbc6116a902379c7238'
      const serviceWithWhitelist = new TokenValidationService()

      expect(serviceWithWhitelist.isWhitelisted('0x1c7d4b196cb0c7b01d743fbc6116a902379c7238' as Address)).toBe(true)
      expect(serviceWithWhitelist.isWhitelisted('0x1C7D4B196CB0C7B01D743FBC6116A902379C7238' as Address)).toBe(true) // Case insensitive
    })
  })

  describe('isBlacklisted', () => {
    it('should return false for non-blacklisted addresses', () => {
      expect(service.isBlacklisted('0x1c7d4b196cb0c7b01d743fbc6116a902379c7238' as Address)).toBe(false)
    })

    it('should be case-insensitive', () => {
      service.addToBlacklist('0xBAD1111111111111111111111111111111111111' as Address)
      expect(service.isBlacklisted('0xbad1111111111111111111111111111111111111' as Address)).toBe(true)
      expect(service.isBlacklisted('0xBAD1111111111111111111111111111111111111' as Address)).toBe(true)
    })
  })

  describe('isWhitelisted', () => {
    it('should return false for non-whitelisted addresses', () => {
      expect(service.isWhitelisted('0x0000000000000000000000000000000000000001' as Address)).toBe(false)
    })

    it('should be case-insensitive', () => {
      service.addToWhitelist('0x1c7d4b196cb0c7b01d743fbc6116a902379c7238' as Address)
      expect(service.isWhitelisted('0x1C7D4B196CB0C7B01D743FBC6116A902379C7238' as Address)).toBe(true)
    })
  })

  describe('addToBlacklist', () => {
    it('should add address to blacklist', () => {
      const address = '0xBAD1111111111111111111111111111111111111' as Address
      service.addToBlacklist(address)
      expect(service.isBlacklisted(address)).toBe(true)
    })
  })

  describe('addToWhitelist', () => {
    it('should add address to whitelist', () => {
      const address = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238' as Address
      service.addToWhitelist(address)
      expect(service.isWhitelisted(address)).toBe(true)
    })
  })

  describe('removeFromBlacklist', () => {
    it('should remove address from blacklist', () => {
      const address = '0xBAD1111111111111111111111111111111111111' as Address
      service.addToBlacklist(address)
      expect(service.isBlacklisted(address)).toBe(true)

      service.removeFromBlacklist(address)
      expect(service.isBlacklisted(address)).toBe(false)
    })
  })

  describe('assessRisks', () => {
    it('should detect ZERO_ADDRESS risk', () => {
      const risks = service.assessRisks('0x0000000000000000000000000000000000000000' as Address, {
        symbol: null,
        decimals: null,
        name: null,
      })
      expect(risks).toContain(TokenRisk.ZERO_ADDRESS)
    })

    it('should detect BLACKLISTED risk', () => {
      const address = '0xBAD1111111111111111111111111111111111111' as Address
      service.addToBlacklist(address)
      const risks = service.assessRisks(address, { symbol: 'BAD', decimals: 18, name: 'Bad Token' })
      expect(risks).toContain(TokenRisk.BLACKLISTED)
    })

    it('should detect NO_SYMBOL risk', () => {
      const risks = service.assessRisks('0x1111111111111111111111111111111111111111' as Address, {
        symbol: null,
        decimals: 18,
        name: 'Token',
      })
      expect(risks).toContain(TokenRisk.NO_SYMBOL)
    })

    it('should detect NO_DECIMALS risk', () => {
      const risks = service.assessRisks('0x1111111111111111111111111111111111111111' as Address, {
        symbol: 'TKN',
        decimals: null,
        name: 'Token',
      })
      expect(risks).toContain(TokenRisk.NO_DECIMALS)
    })

    it('should detect SUSPICIOUS_NAME risk', () => {
      const suspiciousNames = ['Test Token', 'Fake Coin', 'Scam Token', 'Honeypot', 'Rug Token']

      suspiciousNames.forEach((name) => {
        const risks = service.assessRisks('0x1111111111111111111111111111111111111111' as Address, {
          symbol: 'TKN',
          decimals: 18,
          name,
        })
        expect(risks).toContain(TokenRisk.SUSPICIOUS_NAME)
      })
    })

    it('should return empty array for valid token', () => {
      const risks = service.assessRisks('0x1111111111111111111111111111111111111111' as Address, {
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
      })
      expect(risks).toHaveLength(0)
    })
  })

  describe('generateWarnings', () => {
    it('should generate warning for BLACKLISTED risk', () => {
      const warnings = service.generateWarnings([TokenRisk.BLACKLISTED], { symbol: 'BAD', name: 'Bad Token' })
      expect(warnings).toContain('此代币已被列入黑名单，可能存在风险')
    })

    it('should generate warning for NO_SYMBOL risk', () => {
      const warnings = service.generateWarnings([TokenRisk.NO_SYMBOL], { symbol: null, name: 'Token' })
      expect(warnings).toContain('代币缺少 symbol 信息，可能不是标准 ERC20 代币')
    })

    it('should generate warning for NO_DECIMALS risk', () => {
      const warnings = service.generateWarnings([TokenRisk.NO_DECIMALS], { symbol: 'TKN', name: 'Token' })
      expect(warnings).toContain('代币缺少 decimals 信息，可能导致金额计算错误')
    })

    it('should generate warning for SUSPICIOUS_NAME risk', () => {
      const warnings = service.generateWarnings([TokenRisk.SUSPICIOUS_NAME], { symbol: 'SCAM', name: 'Scam Token' })
      expect(warnings[0]).toContain('代币名称 "Scam Token" 包含可疑关键词')
    })

    it('should generate warning for ZERO_ADDRESS risk', () => {
      const warnings = service.generateWarnings([TokenRisk.ZERO_ADDRESS], { symbol: null, name: null })
      expect(warnings).toContain('代币地址为零地址，无效')
    })

    it('should generate multiple warnings for multiple risks', () => {
      const warnings = service.generateWarnings([TokenRisk.BLACKLISTED, TokenRisk.NO_SYMBOL], { symbol: null, name: null })
      expect(warnings).toHaveLength(2)
    })
  })

  describe('validateToken', () => {
    it('should pass whitelisted tokens without strict checks', async () => {
      const address = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238' as Address
      service.addToWhitelist(address)

      const result = await service.validateToken(address)

      expect(result.isValid).toBe(true)
      expect(result.isERC20).toBe(true)
      expect(result.isBlacklisted).toBe(false)
      expect(result.risks).toHaveLength(0)
      expect(result.warnings).toContain('此代币在白名单中，已跳过严格检查')
    })

    it('should reject blacklisted tokens', async () => {
      const address = '0xBAD1111111111111111111111111111111111111' as Address
      service.addToBlacklist(address)

      const result = await service.validateToken(address)

      expect(result.isValid).toBe(false)
      expect(result.isBlacklisted).toBe(true)
      expect(result.risks).toContain(TokenRisk.BLACKLISTED)
    })

    it('should reject zero address', async () => {
      const address = '0x0000000000000000000000000000000000000000' as Address

      const result = await service.validateToken(address)

      expect(result.isValid).toBe(false)
      expect(result.risks).toContain(TokenRisk.ZERO_ADDRESS)
    })
  })

  describe('validateTokens (batch)', () => {
    it('should validate multiple tokens in parallel', async () => {
      const addresses = [
        '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238' as Address, // USDC
        '0x0000000000000000000000000000000000000001' as Address, // Suspicious
      ]

      const results = await service.validateTokens(addresses)

      expect(results.size).toBe(2)
      expect(results.has('0x1c7d4b196cb0c7b01d743fbc6116a902379c7238')).toBe(true)
      expect(results.has('0x0000000000000000000000000000000000000001')).toBe(true)
    })
  })
})
