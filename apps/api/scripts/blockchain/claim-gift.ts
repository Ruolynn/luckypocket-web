/**
 * @file Claim Gift Script
 * @description Claim a gift from on-chain
 *
 * Usage:
 *   tsx scripts/blockchain/claim-gift.ts <gift_id>
 *
 * Example:
 *   tsx scripts/blockchain/claim-gift.ts 0x0000000000000000000000000000000000000000000000000000000000000001
 */

import { createWalletClient, createPublicClient, http, type Address, type Hex } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { DeGiftAbi } from '../../src/abi/DeGift'
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

// Token type enum (must match contract)
enum TokenType {
  ETH = 0,
  ERC20 = 1,
  ERC721 = 2,
  ERC1155 = 3,
}

/**
 * Get gift info from contract
 */
async function getGiftInfo(giftId: Hex) {
  try {
    const gift = await publicClient.readContract({
      address: DEGIFT_CONTRACT,
      abi: DeGiftAbi,
      functionName: 'getGift',
      args: [giftId],
    })

    return gift
  } catch (error: any) {
    console.error(`\n❌ Failed to get gift info:`, error.message || error)
    return null
  }
}

/**
 * Check if gift can be claimed
 */
async function checkCanClaim(giftId: Hex) {
  try {
    const canClaim = await publicClient.readContract({
      address: DEGIFT_CONTRACT,
      abi: DeGiftAbi,
      functionName: 'canClaim',
      args: [giftId, account.address],
    })

    return canClaim
  } catch (error: any) {
    console.error(`\n❌ Failed to check claim eligibility:`, error.message || error)
    return false
  }
}

/**
 * Claim gift
 */
async function claimGift(giftId: Hex) {
  console.log('\n🎁 Claiming Gift')
  console.log(`   Network: Sepolia`)
  console.log(`   Contract: ${DEGIFT_CONTRACT}`)
  console.log(`   Claimer: ${account.address}`)
  console.log(`   Gift ID: ${giftId}\n`)

  try {
    // Get gift info
    console.log('🔍 Fetching gift info...')
    const gift = await getGiftInfo(giftId)

    if (!gift) {
      console.error(`❌ Gift not found or invalid\n`)
      process.exit(1)
    }

    const [sender, recipient, tokenType, token, tokenId, amount, expiresAt, claimed, refunded] =
      gift

    console.log(`   Sender: ${sender}`)
    console.log(`   Recipient: ${recipient}`)
    console.log(`   Token Type: ${TokenType[tokenType]}`)
    console.log(`   Token: ${token}`)
    if (tokenType === TokenType.ERC721 || tokenType === TokenType.ERC1155) {
      console.log(`   Token ID: ${tokenId}`)
    }
    console.log(`   Amount: ${amount}`)
    console.log(`   Expires: ${new Date(Number(expiresAt) * 1000).toISOString()}`)
    console.log(`   Claimed: ${claimed}`)
    console.log(`   Refunded: ${refunded}\n`)

    // Check if already claimed
    if (claimed) {
      console.error(`❌ Gift already claimed!\n`)
      process.exit(1)
    }

    // Check if refunded
    if (refunded) {
      console.error(`❌ Gift already refunded!\n`)
      process.exit(1)
    }

    // Check if expired
    const now = Math.floor(Date.now() / 1000)
    if (now > Number(expiresAt)) {
      console.error(`❌ Gift has expired!\n`)
      process.exit(1)
    }

    // Check if caller is recipient
    if (recipient.toLowerCase() !== account.address.toLowerCase()) {
      console.error(`❌ You are not the recipient of this gift!`)
      console.error(`   Expected: ${recipient}`)
      console.error(`   Your address: ${account.address}\n`)
      process.exit(1)
    }

    // Check if can claim (contract-side validation)
    console.log('🔍 Checking claim eligibility...')
    const canClaim = await checkCanClaim(giftId)

    if (!canClaim) {
      console.error(`❌ Cannot claim this gift (contract check failed)\n`)
      process.exit(1)
    }

    console.log(`   ✓ Eligible to claim\n`)

    // Send claim transaction
    console.log('📤 Sending claim transaction...')

    const hash = await walletClient.writeContract({
      address: DEGIFT_CONTRACT,
      abi: DeGiftAbi,
      functionName: 'claimGift',
      args: [giftId],
    })

    console.log(`   Transaction hash: ${hash}`)
    console.log(`   Waiting for confirmation...\n`)

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'success') {
      console.log(`✅ Gift claimed successfully!`)
      console.log(`   Block: ${receipt.blockNumber}`)
      console.log(`   Gas used: ${receipt.gasUsed}`)
      console.log(`   Transaction hash: ${hash}\n`)

      console.log(`🔗 View on Etherscan:`)
      console.log(`   https://sepolia.etherscan.io/tx/${hash}\n`)

      // Show what was received
      if (tokenType === TokenType.ETH) {
        console.log(`🎉 You received ${amount} wei of ETH!`)
      } else if (tokenType === TokenType.ERC20) {
        console.log(`🎉 You received ${amount} units of token ${token}!`)
      } else if (tokenType === TokenType.ERC721) {
        console.log(`🎉 You received NFT #${tokenId} from ${token}!`)
      } else if (tokenType === TokenType.ERC1155) {
        console.log(`🎉 You received ${amount} units of NFT #${tokenId} from ${token}!`)
      }

      console.log()
    } else {
      console.log(`❌ Claim failed (reverted)\n`)
      process.exit(1)
    }
  } catch (error: any) {
    console.error(`\n❌ Claim failed:`, error.message || error)
    process.exit(1)
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('❌ Error: Missing gift ID\n')
    console.log('Usage:')
    console.log('  tsx scripts/blockchain/claim-gift.ts <gift_id>\n')
    console.log('Example:')
    console.log(
      '  tsx scripts/blockchain/claim-gift.ts 0x0000000000000000000000000000000000000000000000000000000000000001\n'
    )
    process.exit(1)
  }

  const giftId = args[0] as Hex

  await claimGift(giftId)

  console.log('✅ Claim completed\n')
}

main()
