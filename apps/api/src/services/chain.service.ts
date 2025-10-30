import { createPublicClient, http, parseAbiItem } from 'viem'

export function getPublicClient() {
  const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
  return createPublicClient({ transport: http(rpcUrl) })
}

export function getContractAddress() {
  const addr = process.env.RED_PACKET_CONTRACT_ADDRESS
  if (!addr) throw new Error('RED_PACKET_CONTRACT_ADDRESS not set')
  return addr as `0x${string}`
}

export const topics = {
  PacketCreated: parseAbiItem('event PacketCreated(bytes32 indexed packetId, address indexed creator, address token, uint256 totalAmount, uint32 count, bool isRandom, uint256 expireTime)'),
  PacketClaimed: parseAbiItem('event PacketClaimed(bytes32 indexed packetId, address indexed claimer, uint256 amount, uint32 remainingCount)'),
}


