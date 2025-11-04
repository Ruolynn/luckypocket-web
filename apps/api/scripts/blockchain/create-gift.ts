/**
 * @file Create Gift Script
 * @description Create a gift on-chain
 *
 * Usage:
 *   tsx scripts/blockchain/create-gift.ts eth <recipient> <amount> <days_until_expiry> [message]
 *   tsx scripts/blockchain/create-gift.ts erc20 <recipient> <token> <amount> <days_until_expiry> [message]
 *
 * Examples:
 *   tsx scripts/blockchain/create-gift.ts eth 0x742d35Cc... 0.1 7 "Happy Birthday!"
 *   tsx scripts/blockchain/create-gift.ts erc20 0x742d35Cc... 0x1c7D4B19... 100 7 "Enjoy!"
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  parseUnits,
  type Address,
} from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { DeGiftAbi, ERC20Abi } from '../../src/abi/DeGift'
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
 * Create ETH gift
 */
async function createETHGift(
  recipient: Address,
  amount: string,
  daysUntilExpiry: number,
  message: string
) {
  console.log('\n🎁 Creating ETH Gift')
  console.log(`   Network: Sepolia`)
  console.log(`   Contract: ${DEGIFT_CONTRACT}`)
  console.log(`   From: ${account.address}`)
  console.log(`   To: ${recipient}`)
  console.log(`   Amount: ${amount} ETH`)
  console.log(`   Expires in: ${daysUntilExpiry} days`)
  console.log(`   Message: "${message}"\n`)

  try {
    const amountWei = parseEther(amount)
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + daysUntilExpiry * 24 * 60 * 60)

    console.log('📤 Sending transaction...')

    const hash = await walletClient.writeContract({
      address: DEGIFT_CONTRACT,
      abi: DeGiftAbi,
      functionName: 'createGiftETH',
      args: [recipient, expiresAt, message],
      value: amountWei,
    })

    console.log(`   Transaction hash: ${hash}`)
    console.log(`   Waiting for confirmation...\n`)

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'success') {
      console.log(`✅ Gift created successfully!`)
      console.log(`   Block: ${receipt.blockNumber}`)
      console.log(`   Gas used: ${receipt.gasUsed}`)
      console.log(`   Transaction hash: ${hash}\n`)

      // Find GiftCreated event
      const logs = await publicClient.getLogs({
        address: DEGIFT_CONTRACT,
        event: DeGiftAbi.find((item) => item.name === 'GiftCreated')!,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      })

      if (logs.length > 0) {
        const giftId = logs[0].topics[1]
        console.log(`   Gift ID: ${giftId}`)
      }

      console.log(`\n🔗 View on Etherscan:`)
      console.log(`   https://sepolia.etherscan.io/tx/${hash}\n`)
    } else {
      console.log(`❌ Gift creation failed (reverted)\n`)
      process.exit(1)
    }
  } catch (error: any) {
    console.error(`\n❌ Gift creation failed:`, error.message || error)
    process.exit(1)
  }
}

/**
 * Create ERC20 gift
 */
async function createERC20Gift(
  recipient: Address,
  tokenAddress: Address,
  amount: string,
  daysUntilExpiry: number,
  message: string
) {
  console.log('\n🎁 Creating ERC20 Gift')
  console.log(`   Network: Sepolia`)
  console.log(`   Contract: ${DEGIFT_CONTRACT}`)
  console.log(`   From: ${account.address}`)
  console.log(`   To: ${recipient}`)

  try {
    // Get token info
    const { decimals, symbol, name } = await getTokenInfo(tokenAddress)
    console.log(`   Token: ${name} (${symbol})`)
    console.log(`   Amount: ${amount} ${symbol}`)
    console.log(`   Expires in: ${daysUntilExpiry} days`)
    console.log(`   Message: "${message}"\n`)

    const amountWei = parseUnits(amount, decimals)
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + daysUntilExpiry * 24 * 60 * 60)

    // Check allowance
    console.log('🔍 Checking token allowance...')
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20Abi,
      functionName: 'allowance',
      args: [account.address, DEGIFT_CONTRACT],
    })

    if (allowance < amountWei) {
      console.error(`\n❌ Insufficient allowance!`)
      console.error(`   Current: ${allowance}`)
      console.error(`   Required: ${amountWei}`)
      console.error(`\n💡 Run the approve script first:`)
      console.error(`   tsx scripts/blockchain/approve-token.ts ${tokenAddress} ${amount}\n`)
      process.exit(1)
    }

    console.log(`   ✓ Allowance OK\n`)

    console.log('📤 Sending transaction...')

    const hash = await walletClient.writeContract({
      address: DEGIFT_CONTRACT,
      abi: DeGiftAbi,
      functionName: 'createGiftERC20',
      args: [recipient, tokenAddress, amountWei, expiresAt, message],
    })

    console.log(`   Transaction hash: ${hash}`)
    console.log(`   Waiting for confirmation...\n`)

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'success') {
      console.log(`✅ Gift created successfully!`)
      console.log(`   Block: ${receipt.blockNumber}`)
      console.log(`   Gas used: ${receipt.gasUsed}`)
      console.log(`   Transaction hash: ${hash}\n`)

      // Find GiftCreated event
      const logs = await publicClient.getLogs({
        address: DEGIFT_CONTRACT,
        event: DeGiftAbi.find((item) => item.name === 'GiftCreated')!,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      })

      if (logs.length > 0) {
        const giftId = logs[0].topics[1]
        console.log(`   Gift ID: ${giftId}`)
      }

      console.log(`\n🔗 View on Etherscan:`)
      console.log(`   https://sepolia.etherscan.io/tx/${hash}\n`)
    } else {
      console.log(`❌ Gift creation failed (reverted)\n`)
      process.exit(1)
    }
  } catch (error: any) {
    console.error(`\n❌ Gift creation failed:`, error.message || error)
    process.exit(1)
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 4) {
    console.error('❌ Error: Missing arguments\n')
    console.log('Usage:')
    console.log('  ETH gift:')
    console.log('    tsx scripts/blockchain/create-gift.ts eth <recipient> <amount> <days> [message]')
    console.log('  ERC20 gift:')
    console.log(
      '    tsx scripts/blockchain/create-gift.ts erc20 <recipient> <token> <amount> <days> [message]\n'
    )
    console.log('Examples:')
    console.log('  tsx scripts/blockchain/create-gift.ts eth 0x742d35Cc... 0.1 7 "Happy Birthday!"')
    console.log(
      '  tsx scripts/blockchain/create-gift.ts erc20 0x742d35Cc... 0x1c7D4B19... 100 7 "Enjoy!"\n'
    )
    process.exit(1)
  }

  const type = args[0].toLowerCase()

  if (type === 'eth') {
    const recipient = args[1] as Address
    const amount = args[2]
    const days = parseInt(args[3])
    const message = args[4] || 'A gift for you! 🎁'

    await createETHGift(recipient, amount, days, message)
  } else if (type === 'erc20') {
    if (args.length < 5) {
      console.error('❌ Error: ERC20 gift requires token address\n')
      process.exit(1)
    }

    const recipient = args[1] as Address
    const tokenAddress = args[2] as Address
    const amount = args[3]
    const days = parseInt(args[4])
    const message = args[5] || 'A gift for you! 🎁'

    await createERC20Gift(recipient, tokenAddress, amount, days, message)
  } else {
    console.error(`❌ Error: Unknown gift type "${type}". Use "eth" or "erc20"\n`)
    process.exit(1)
  }

  console.log('✅ Gift creation completed\n')
}

main()
