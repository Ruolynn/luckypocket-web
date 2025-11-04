/**
 * @file Check Balance Script
 * @description Check ETH and ERC20 token balances
 *
 * Usage:
 *   tsx scripts/blockchain/check-balance.ts <address>
 *   tsx scripts/blockchain/check-balance.ts <address> <token_address>
 *
 * Examples:
 *   tsx scripts/blockchain/check-balance.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
 *   tsx scripts/blockchain/check-balance.ts 0x742d35... 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
 */

import { createPublicClient, http, formatEther, formatUnits, type Address } from 'viem'
import { sepolia } from 'viem/chains'
import { ERC20Abi } from '../../src/abi/DeGift'
import 'dotenv/config'

// Configuration
const RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo'

const client = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
})

/**
 * Check ETH balance
 */
async function checkETHBalance(address: Address) {
  console.log(`\n💰 Checking ETH balance for ${address}...\n`)

  const balance = await client.getBalance({ address })
  const formatted = formatEther(balance)

  console.log(`✅ ETH Balance: ${formatted} ETH`)
  console.log(`   Raw: ${balance} wei\n`)

  return { balance, formatted }
}

/**
 * Check ERC20 token balance
 */
async function checkTokenBalance(address: Address, tokenAddress: Address) {
  console.log(`\n🪙 Checking token balance for ${address}...\n`)

  try {
    // Get token info
    const [balance, decimals, symbol, name] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: ERC20Abi,
        functionName: 'balanceOf',
        args: [address],
      }),
      client.readContract({
        address: tokenAddress,
        abi: ERC20Abi,
        functionName: 'decimals',
      }),
      client.readContract({
        address: tokenAddress,
        abi: ERC20Abi,
        functionName: 'symbol',
      }),
      client.readContract({
        address: tokenAddress,
        abi: ERC20Abi,
        functionName: 'name',
      }),
    ])

    const formatted = formatUnits(balance, decimals)

    console.log(`Token: ${name} (${symbol})`)
    console.log(`Contract: ${tokenAddress}`)
    console.log(`Decimals: ${decimals}`)
    console.log(`\n✅ Balance: ${formatted} ${symbol}`)
    console.log(`   Raw: ${balance}\n`)

    return { balance, formatted, decimals, symbol, name }
  } catch (error) {
    console.error(`❌ Failed to check token balance:`, error)
    throw error
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('❌ Error: Missing address argument\n')
    console.log('Usage:')
    console.log('  tsx scripts/blockchain/check-balance.ts <address>')
    console.log('  tsx scripts/blockchain/check-balance.ts <address> <token_address>\n')
    process.exit(1)
  }

  const address = args[0] as Address
  const tokenAddress = args[1] as Address | undefined

  console.log('🔍 Balance Checker')
  console.log(`   Network: Sepolia`)
  console.log(`   Address: ${address}`)

  try {
    // Always check ETH balance
    await checkETHBalance(address)

    // Check token balance if provided
    if (tokenAddress) {
      await checkTokenBalance(address, tokenAddress)
    }

    console.log('✅ Balance check completed\n')
  } catch (error) {
    console.error('❌ Balance check failed:', error)
    process.exit(1)
  }
}

main()
