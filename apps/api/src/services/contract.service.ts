import { createWalletClient, createPublicClient, http, parseAbiItem, recoverMessageAddress, type Hash, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { getContractAddress } from './chain.service'

const PacketCreatedEvent = parseAbiItem('event PacketCreated(bytes32 indexed packetId, address indexed creator, address token, uint256 totalAmount, uint32 count, bool isRandom, uint256 expireTime)')

const RED_PACKET_ABI = [
  {
    type: 'function',
    name: 'claimPacket',
    inputs: [{ name: 'packetId', type: 'bytes32' }],
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimFor',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'packetId', type: 'bytes32' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getPacketInfo',
    inputs: [{ name: 'packetId', type: 'bytes32' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'count', type: 'uint32' },
      { name: 'remainingCount', type: 'uint32' },
      { name: 'expireTime', type: 'uint256' },
      { name: 'isRandom', type: 'bool' },
    ],
    stateMutability: 'view',
  },
] as const

/**
 * 创建钱包客户端（用于代理交易）
 */
export function createWalletClientForProxy() {
  const privateKey = process.env.PROXY_WALLET_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('PROXY_WALLET_PRIVATE_KEY not set')
  }
  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
  return createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl),
  })
}

/**
 * 读取合约信息
 */
export async function getPacketInfoFromChain(packetId: `0x${string}`) {
  const client = createPublicClient({
    transport: http(process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'),
    chain: sepolia,
  })
  const address = getContractAddress()
  
  return client.readContract({
    address,
    abi: RED_PACKET_ABI,
    functionName: 'getPacketInfo',
    args: [packetId],
  })
}

/**
 * ERC20 标准 ABI（用于读取代币信息）
 */
const ERC20_ABI = [
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const

/**
 * 获取代币元数据（symbol, decimals, name）
 */
export async function getTokenMetadata(tokenAddress: `0x${string}`) {
  const client = createPublicClient({
    transport: http(process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'),
    chain: sepolia,
  })

  try {
    const [symbol, decimals, name] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }).catch(() => 'UNKNOWN'),
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }).catch(() => 18),
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'name',
      }).catch(() => 'Unknown Token'),
    ])

    return { symbol: symbol as string, decimals: Number(decimals), name: name as string }
  } catch (error) {
    throw new Error(`Failed to fetch token metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 验证交易是否已确认
 */
export async function verifyTransaction(txHash: `0x${string}`, expectedPacketId?: `0x${string}`) {
  const client = createPublicClient({
    transport: http(process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'),
    chain: sepolia,
  })

  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash })
    if (!receipt || receipt.status !== 'success') {
      return { valid: false, error: 'Transaction failed or not found' }
    }

    // 如果提供了 packetId，验证事件
    if (expectedPacketId) {
      const address = getContractAddress()
      try {
        const logs = await client.getLogs({
          address,
          event: PacketCreatedEvent,
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber,
        })

        const found = logs.find((log) => {
          const logPacketId = log.args.packetId
          return logPacketId?.toLowerCase() === expectedPacketId.toLowerCase()
        })
        if (!found) {
          return { valid: false, error: 'PacketCreated event not found in transaction' }
        }

        return {
          valid: true,
          blockNumber: receipt.blockNumber,
          event: found.args,
        }
      } catch (error) {
        return { valid: false, error: `Failed to fetch logs: ${error instanceof Error ? error.message : 'Unknown error'}` }
      }
    }

    return {
      valid: true,
      blockNumber: receipt.blockNumber,
    }
  } catch (error) {
    return { valid: false, error: `Failed to verify transaction: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

/**
 * 生成待签名消息（EIP-191 格式）
 */
export function generateClaimMessage(packetId: `0x${string}`, userAddress: `0x${string}`, nonce: string): string {
  return `Claim packet ${packetId} as ${userAddress}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`
}

/**
 * 验证用户签名
 */
export async function verifyClaimSignature(
  message: string,
  signature: `0x${string}`,
  expectedAddress: `0x${string}`
): Promise<boolean> {
  try {
    const recovered = await recoverMessageAddress({
      message,
      signature,
    })
    return recovered.toLowerCase() === expectedAddress.toLowerCase()
  } catch {
    return false
  }
}

/**
 * 代理调用 claimPacket - 方式1：使用 claimFor 函数（需要合约支持）
 * @param packetId 红包 ID
 * @param userAddress 用户地址
 * @param signature 用户签名（对消息的签名）
 * @param message 原始消息
 * @returns 交易哈希
 */
export async function proxyClaimPacketWithClaimFor(
  packetId: `0x${string}`,
  userAddress: `0x${string}`,
  signature: `0x${string}`,
  message: string
): Promise<Hash> {
  // 1) 验证签名
  const isValid = await verifyClaimSignature(message, signature, userAddress)
  if (!isValid) {
    throw new Error('Invalid signature')
  }

  // 2) 验证消息包含 packetId
  if (!message.toLowerCase().includes(packetId.toLowerCase())) {
    throw new Error('Message does not contain packetId')
  }

  // 3) 使用代理钱包调用 claimFor
  const walletClient = createWalletClientForProxy()
  const contractAddress = getContractAddress()

  try {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: RED_PACKET_ABI,
      functionName: 'claimFor',
      args: [userAddress, packetId, signature as `0x${string}`],
    })

    return hash
  } catch (error: any) {
    // 如果合约不支持 claimFor，会在这里失败
    if (error?.message?.includes('claimFor') || error?.message?.includes('function')) {
      throw new Error('Contract does not support claimFor. Please use direct contract call or ERC-4337.')
    }
    throw error
  }
}

/**
 * 代理调用 claimPacket - 方式2：ERC-4337 Paymaster 代付（备选，待实现）
 */
export async function proxyClaimPacketWithPaymaster(
  packetId: `0x${string}`,
  userAddress: `0x${string}`
): Promise<Hash> {
  // TODO: 集成 ERC-4337 SDK
  // 1) 构建 UserOperation
  // 2) 通过 Paymaster 代付 gas
  // 3) 提交到 Bundler
  throw new Error('ERC-4337 Paymaster not implemented yet. Use proxyClaimPacketWithSignature instead.')
}

/**
 * 统一入口：代理领取红包
 * @param packetId 红包 ID
 * @param userAddress 用户地址
 * @param options 选项：signature + message（推荐）或 usePaymaster
 * @returns 交易哈希
 */
export async function proxyClaimPacket(
  packetId: `0x${string}`,
  userAddress: `0x${string}`,
  options?: {
    signature?: `0x${string}`
    message?: string
    nonce?: string
    usePaymaster?: boolean
  }
): Promise<Hash> {
  if (options?.usePaymaster) {
    return proxyClaimPacketWithPaymaster(packetId, userAddress)
  }

  if (options?.signature && options?.message) {
    return proxyClaimPacketWithClaimFor(packetId, userAddress, options.signature, options.message)
  }

  // 如果没有提供签名，生成消息并提示前端需要签名
  const nonce = options?.nonce || `${Date.now()}-${Math.random()}`
  const message = generateClaimMessage(packetId, userAddress, nonce)
  throw new Error(
    `Signature required. Please sign this message and retry:\n${message}\n\nOr use usePaymaster=true for ERC-4337.`
  )
}

