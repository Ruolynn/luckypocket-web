/**
 * @file Approve Token Script
 * @description Approve ERC20 tokens for DeGift contract
 *
 * Usage:
 *   tsx scripts/blockchain/approve-token.ts <token_address> <amount>
 *
 * Example:
 *   tsx scripts/blockchain/approve-token.ts 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 100
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  type Address,
} from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { ERC20Abi } from '../../src/abi/DeGift'
import 'dotenv/config'

// Configuration
const RPC_URL = process.env.ETHEREUM_RPC_URL || ''
const PRIVATE_KEY = process.env.PROXY_WALLET_PRIVATE_KEY || ''
const DEGIFT_CONTRACT = (process.env.DEGIFT_CONTRACT_ADDRESS || '') as Address

if (!RPC_URL || !PRIVATE_KEY || !DEGIFT_CONTRACT) {
  console.error('❌ Error: Missing environment variables')
  console.error('   Required: ETHEREUM_RPC_URL, PROXY_WALLET_PRIVATE_KEY, DEGIFT_CONTRACT_ADDRESS\n')
  process.exit(1)
}

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
})

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(RPC_URL),
})

/**
 * Get current allowance
 */
async function getCurrentAllowance(tokenAddress: Address) {
  const allowance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20Abi,
    functionName: 'allowance',
    args: [account.address, DEGIFT_CONTRACT],
  })

  return allowance
}

/**
 * Get token info
 */
async function getTokenInfo(tokenAddress: Address) {
  const [decimals, symbol, name] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20Abi,
      functionName: 'decimals',
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20Abi,
      functionName: 'symbol',
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20Abi,
      functionName: 'name',
    }),
  ])

  return { decimals, symbol, name }
}

/**
 * Approve token
 */
async function approveToken(tokenAddress: Address, amount: string) {
  console.log('\n🔐 Token Approval')
  console.log(`   Network: Sepolia`)
  console.log(`   From: ${account.address}`)
  console.log(`   Token: ${tokenAddress}`)
  console.log(`   Spender: ${DEGIFT_CONTRACT}\n`)

  try {
    // Get token info
    const { decimals, symbol, name } = await getTokenInfo(tokenAddress)
    console.log(`Token: ${name} (${symbol})`)
    console.log(`Decimals: ${decimals}\n`)

    // Parse amount
    const amountWei = parseUnits(amount, decimals)
    console.log(`Approving: ${amount} ${symbol} (${amountWei} raw units)`)

    // Check current allowance
    const currentAllowance = await getCurrentAllowance(tokenAddress)
    console.log(`Current allowance: ${formatUnits(currentAllowance, decimals)} ${symbol}\n`)

    if (currentAllowance >= amountWei) {
      console.log(`✅ Already approved! Current allowance is sufficient.\n`)
      return
    }

    // Send approval transaction
    console.log('📤 Sending approval transaction...')

    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20Abi,
      functionName: 'approve',
      args: [DEGIFT_CONTRACT, amountWei],
    })

    console.log(`   Transaction hash: ${hash}`)
    console.log(`   Waiting for confirmation...\n`)

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'success') {
      console.log(`✅ Approval confirmed!`)
      console.log(`   Block: ${receipt.blockNumber}`)
      console.log(`   Gas used: ${receipt.gasUsed}`)

      // Verify new allowance
      const newAllowance = await getCurrentAllowance(tokenAddress)
      console.log(`   New allowance: ${formatUnits(newAllowance, decimals)} ${symbol}\n`)
    } else {
      console.log(`❌ Approval failed (reverted)\n`)
      process.exit(1)
    }
  } catch (error: any) {
    console.error(`\n❌ Approval failed:`, error.message || error)
    process.exit(1)
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error('❌ Error: Missing arguments\n')
    console.log('Usage:')
    console.log('  tsx scripts/blockchain/approve-token.ts <token_address> <amount>\n')
    console.log('Example:')
    console.log('  tsx scripts/blockchain/approve-token.ts 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 100\n')
    process.exit(1)
  }

  const tokenAddress = args[0] as Address
  const amount = args[1]

  await approveToken(tokenAddress, amount)

  console.log('✅ Approval completed\n')
}

main()
