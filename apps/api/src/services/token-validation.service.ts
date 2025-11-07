/**
 * @file Token Validation Service
 * @description Service for validating ERC20 tokens, checking blacklists, and assessing risks
 */

import { createPublicClient, http, type Address } from 'viem'
import { sepolia } from 'viem/chains'
import { getTokenMetadata } from './contract.service'

export interface TokenValidationResult {
  isValid: boolean
  isERC20: boolean
  isBlacklisted: boolean
  metadata: {
    symbol: string | null
    decimals: number | null
    name: string | null
  }
  risks: TokenRisk[]
  warnings: string[]
}

export enum TokenRisk {
  BLACKLISTED = 'BLACKLISTED',
  NO_SYMBOL = 'NO_SYMBOL',
  NO_DECIMALS = 'NO_DECIMALS',
  SUSPICIOUS_NAME = 'SUSPICIOUS_NAME',
  ZERO_ADDRESS = 'ZERO_ADDRESS',
}

/**
 * 代币验证服务
 */
export class TokenValidationService {
  private client: ReturnType<typeof createPublicClient>
  private blacklist: Set<string>
  private whitelist: Set<string>

  constructor() {
    this.client = createPublicClient({
      chain: sepolia,
      transport: http(process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'),
    })

    // 从环境变量加载黑名单
    const blacklistStr = process.env.TOKEN_BLACKLIST || ''
    this.blacklist = new Set(
      blacklistStr
        .split(',')
        .map((addr) => addr.trim().toLowerCase())
        .filter(Boolean)
    )

    // 从环境变量加载白名单
    const whitelistStr = process.env.TOKEN_WHITELIST || ''
    this.whitelist = new Set(
      whitelistStr
        .split(',')
        .map((addr) => addr.trim().toLowerCase())
        .filter(Boolean)
    )
  }

  /**
   * 验证代币地址是否为 ERC20 代币
   */
  async validateERC20Interface(tokenAddress: Address): Promise<boolean> {
    try {
      // 检查是否为零地址
      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        return false
      }

      // 尝试读取标准 ERC20 接口
      const [symbol, decimals, totalSupply] = await Promise.all([
        this.client
          .readContract({
            address: tokenAddress,
            abi: [
              {
                type: 'function',
                name: 'symbol',
                inputs: [],
                outputs: [{ type: 'string' }],
                stateMutability: 'view',
              },
            ],
            functionName: 'symbol',
          })
          .catch(() => null),
        this.client
          .readContract({
            address: tokenAddress,
            abi: [
              {
                type: 'function',
                name: 'decimals',
                inputs: [],
                outputs: [{ type: 'uint8' }],
                stateMutability: 'view',
              },
            ],
            functionName: 'decimals',
          })
          .catch(() => null),
        this.client
          .readContract({
            address: tokenAddress,
            abi: [
              {
                type: 'function',
                name: 'totalSupply',
                inputs: [],
                outputs: [{ type: 'uint256' }],
                stateMutability: 'view',
              },
            ],
            functionName: 'totalSupply',
          })
          .catch(() => null),
      ])

      // 至少需要 symbol 和 decimals 才能认为是有效的 ERC20
      return symbol !== null && decimals !== null
    } catch (error) {
      return false
    }
  }

  /**
   * 检查代币是否在黑名单中
   */
  isBlacklisted(tokenAddress: Address): boolean {
    return this.blacklist.has(tokenAddress.toLowerCase())
  }

  /**
   * 检查代币是否在白名单中
   */
  isWhitelisted(tokenAddress: Address): boolean {
    return this.whitelist.has(tokenAddress.toLowerCase())
  }

  /**
   * 添加代币到黑名单（运行时）
   */
  addToBlacklist(tokenAddress: Address): void {
    this.blacklist.add(tokenAddress.toLowerCase())
  }

  /**
   * 添加代币到白名单（运行时）
   */
  addToWhitelist(tokenAddress: Address): void {
    this.whitelist.add(tokenAddress.toLowerCase())
  }

  /**
   * 从黑名单移除代币
   */
  removeFromBlacklist(tokenAddress: Address): void {
    this.blacklist.delete(tokenAddress.toLowerCase())
  }

  /**
   * 评估代币风险
   */
  assessRisks(
    tokenAddress: Address,
    metadata: { symbol: string | null; decimals: number | null; name: string | null }
  ): TokenRisk[] {
    const risks: TokenRisk[] = []

    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      risks.push(TokenRisk.ZERO_ADDRESS)
    }

    if (this.isBlacklisted(tokenAddress)) {
      risks.push(TokenRisk.BLACKLISTED)
    }

    if (!metadata.symbol || metadata.symbol.trim() === '') {
      risks.push(TokenRisk.NO_SYMBOL)
    }

    if (metadata.decimals === null || metadata.decimals === undefined) {
      risks.push(TokenRisk.NO_DECIMALS)
    }

    // 检查可疑名称（包含常见诈骗关键词）
    const suspiciousKeywords = ['test', 'fake', 'scam', 'honeypot', 'rug']
    if (metadata.name) {
      const lowerName = metadata.name.toLowerCase()
      if (suspiciousKeywords.some((keyword) => lowerName.includes(keyword))) {
        risks.push(TokenRisk.SUSPICIOUS_NAME)
      }
    }

    return risks
  }

  /**
   * 生成风险警告消息
   */
  generateWarnings(risks: TokenRisk[], metadata: { symbol: string | null; name: string | null }): string[] {
    const warnings: string[] = []

    if (risks.includes(TokenRisk.BLACKLISTED)) {
      warnings.push('此代币已被列入黑名单，可能存在风险')
    }

    if (risks.includes(TokenRisk.NO_SYMBOL)) {
      warnings.push('代币缺少 symbol 信息，可能不是标准 ERC20 代币')
    }

    if (risks.includes(TokenRisk.NO_DECIMALS)) {
      warnings.push('代币缺少 decimals 信息，可能导致金额计算错误')
    }

    if (risks.includes(TokenRisk.SUSPICIOUS_NAME)) {
      warnings.push(`代币名称 "${metadata.name}" 包含可疑关键词，请谨慎使用`)
    }

    if (risks.includes(TokenRisk.ZERO_ADDRESS)) {
      warnings.push('代币地址为零地址，无效')
    }

    return warnings
  }

  /**
   * 完整验证代币
   */
  async validateToken(tokenAddress: Address): Promise<TokenValidationResult> {
    // 1. 检查白名单 - 白名单代币直接通过
    const isWhitelisted = this.isWhitelisted(tokenAddress)
    if (isWhitelisted) {
      // 白名单代币仍然需要获取元数据，但跳过风险检查
      let metadata = { symbol: null, decimals: null, name: null }
      try {
        metadata = await getTokenMetadata(tokenAddress)
      } catch (error) {
        // 白名单代币元数据获取失败也允许继续
      }

      return {
        isValid: true,
        isERC20: true,
        isBlacklisted: false,
        metadata,
        risks: [],
        warnings: ['此代币在白名单中，已跳过严格检查'],
      }
    }

    // 2. 检查黑名单
    const isBlacklisted = this.isBlacklisted(tokenAddress)

    // 3. 验证 ERC20 接口
    const isERC20 = await this.validateERC20Interface(tokenAddress)

    // 4. 获取元数据
    let metadata = { symbol: null, decimals: null, name: null }
    try {
      metadata = await getTokenMetadata(tokenAddress)
    } catch (error) {
      // 如果获取元数据失败，继续验证流程
    }

    // 5. 评估风险
    const risks = this.assessRisks(tokenAddress, metadata)

    // 6. 生成警告
    const warnings = this.generateWarnings(risks, metadata)

    // 7. 判断是否有效
    const isValid = isERC20 && !isBlacklisted && risks.length === 0

    return {
      isValid,
      isERC20,
      isBlacklisted,
      metadata,
      risks,
      warnings,
    }
  }

  /**
   * 批量验证代币（用于前端预检查）
   */
  async validateTokens(tokenAddresses: Address[]): Promise<Map<string, TokenValidationResult>> {
    const results = new Map<string, TokenValidationResult>()

    // 并行验证所有代币
    const promises = tokenAddresses.map(async (address) => {
      const result = await this.validateToken(address)
      results.set(address.toLowerCase(), result)
    })

    await Promise.all(promises)

    return results
  }
}

// 单例实例
let tokenValidationService: TokenValidationService | null = null

/**
 * 获取代币验证服务实例
 */
export function getTokenValidationService(): TokenValidationService {
  if (!tokenValidationService) {
    tokenValidationService = new TokenValidationService()
  }
  return tokenValidationService
}

