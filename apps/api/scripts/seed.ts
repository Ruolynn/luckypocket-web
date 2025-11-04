/**
 * @file Database Seed Script
 * @description Populate database with test data for development
 *
 * Usage:
 *   pnpm seed          - Clean and seed database
 *   pnpm seed --clean  - Only clean database
 */

import { PrismaClient, TokenType, GiftStatus } from '@prisma/client'

const prisma = new PrismaClient()

// Test user addresses (Ethereum addresses)
const TEST_ADDRESSES = [
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1', // Alice
  '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4', // Bob
  '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2', // Charlie
  '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db', // David
  '0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB', // Eve
]

// Test tokens
const TOKENS = {
  ETH: '0x0000000000000000000000000000000000000000',
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
  USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia USDT
}

/**
 * Clean all test data from database
 */
async function cleanDatabase() {
  console.log('🧹 Cleaning database...')

  // Delete in order to respect foreign key constraints
  await prisma.giftClaim.deleteMany({})
  console.log('  ✓ Deleted gift claims')

  await prisma.gift.deleteMany({})
  console.log('  ✓ Deleted gifts')

  await prisma.userAchievement.deleteMany({})
  console.log('  ✓ Deleted user achievements')

  await prisma.notification.deleteMany({})
  console.log('  ✓ Deleted notifications')

  await prisma.invitation.deleteMany({})
  console.log('  ✓ Deleted invitations')

  await prisma.user.deleteMany({})
  console.log('  ✓ Deleted users')

  console.log('✅ Database cleaned\n')
}

/**
 * Create test users
 */
async function seedUsers() {
  console.log('👥 Creating test users...')

  const users = await Promise.all(
    TEST_ADDRESSES.map(async (address, index) => {
      const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eve']
      const user = await prisma.user.create({
        data: {
          address: address.toLowerCase(),
          farcasterFid: index < 3 ? 1000 + index : null, // First 3 have Farcaster
          farcasterName: index < 3 ? names[index].toLowerCase() : null,
          email: index < 2 ? `${names[index].toLowerCase()}@example.com` : null, // First 2 have email
        },
      })
      console.log(`  ✓ Created user: ${names[index]} (${address.slice(0, 6)}...)`)
      return user
    })
  )

  console.log(`✅ Created ${users.length} test users\n`)
  return users
}

/**
 * Create test invitations
 */
async function seedInvitations(users: any[]) {
  console.log('🔗 Creating test invitations...')

  // Alice invites Bob and Charlie
  const invitations = await Promise.all([
    prisma.invitation.create({
      data: {
        inviterId: users[0].id,
        inviteeId: users[1].id,
        rewardPaid: true,
      },
    }),
    prisma.invitation.create({
      data: {
        inviterId: users[0].id,
        inviteeId: users[2].id,
        rewardPaid: false,
      },
    }),
    // Bob invites David
    prisma.invitation.create({
      data: {
        inviterId: users[1].id,
        inviteeId: users[3].id,
        rewardPaid: true,
      },
    }),
  ])

  console.log(`  ✓ Created ${invitations.length} invitations`)
  console.log(`✅ Invitations seeded\n`)
  return invitations
}

/**
 * Create test gifts
 */
async function seedGifts(users: any[]) {
  console.log('🎁 Creating test gifts...')

  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const gifts = []

  // 1. Pending ETH gift from Alice to Bob
  gifts.push(
    await prisma.gift.create({
      data: {
        giftId: '0x0000000000000000000000000000000000000000000000000000000000000001',
        chainId: 11155111, // Sepolia
        createTxHash: '0xa1' + '0'.repeat(62),
        senderId: users[0].id,
        recipientAddress: users[1].address,
        recipientId: users[1].id,
        tokenType: TokenType.ETH,
        token: TOKENS.ETH,
        tokenId: '0',
        amount: '100000000000000000', // 0.1 ETH
        tokenSymbol: 'ETH',
        tokenDecimals: 18,
        tokenName: 'Ethereum',
        message: 'Happy Birthday Bob! 🎂',
        status: GiftStatus.PENDING,
        expiresAt: tomorrow,
        createdAt: now,
      },
    })
  )

  // 2. Claimed USDC gift from Bob to Charlie
  const claimedGift = await prisma.gift.create({
    data: {
      giftId: '0x0000000000000000000000000000000000000000000000000000000000000002',
      chainId: 11155111,
      createTxHash: '0xa2' + '0'.repeat(62),
      senderId: users[1].id,
      recipientAddress: users[2].address,
      recipientId: users[2].id,
      tokenType: TokenType.ERC20,
      token: TOKENS.USDC,
      tokenId: '0',
      amount: '50000000', // 50 USDC (6 decimals)
      tokenSymbol: 'USDC',
      tokenDecimals: 6,
      tokenName: 'USD Coin',
      message: 'Thanks for helping me! 🙏',
      status: GiftStatus.CLAIMED,
      expiresAt: nextWeek,
      claimTxHash: '0xc2' + '0'.repeat(62),
      claimedAt: now,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  })
  gifts.push(claimedGift)

  // 3. Expired ETH gift from Charlie to David
  gifts.push(
    await prisma.gift.create({
      data: {
        giftId: '0x0000000000000000000000000000000000000000000000000000000000000003',
        chainId: 11155111,
        createTxHash: '0xa3' + '0'.repeat(62),
        senderId: users[2].id,
        recipientAddress: users[3].address,
        recipientId: users[3].id,
        tokenType: TokenType.ETH,
        token: TOKENS.ETH,
        tokenId: '0',
        amount: '50000000000000000', // 0.05 ETH
        tokenSymbol: 'ETH',
        tokenDecimals: 18,
        tokenName: 'Ethereum',
        message: 'Welcome to crypto! 🚀',
        status: GiftStatus.EXPIRED,
        expiresAt: yesterday,
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 2 days ago
      },
    })
  )

  // 4. Refunded USDT gift from David to Eve
  gifts.push(
    await prisma.gift.create({
      data: {
        giftId: '0x0000000000000000000000000000000000000000000000000000000000000004',
        chainId: 11155111,
        createTxHash: '0xa4' + '0'.repeat(62),
        senderId: users[3].id,
        recipientAddress: users[4].address,
        recipientId: users[4].id,
        tokenType: TokenType.ERC20,
        token: TOKENS.USDT,
        tokenId: '0',
        amount: '100000000', // 100 USDT (6 decimals)
        tokenSymbol: 'USDT',
        tokenDecimals: 6,
        tokenName: 'Tether USD',
        message: 'Just testing... 🧪',
        status: GiftStatus.REFUNDED,
        expiresAt: yesterday,
        refundTxHash: '0xr4' + '0'.repeat(62),
        refundedAt: now,
        createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000), // 3 days ago
      },
    })
  )

  // 5. Pending USDC gift to non-registered address
  gifts.push(
    await prisma.gift.create({
      data: {
        giftId: '0x0000000000000000000000000000000000000000000000000000000000000005',
        chainId: 11155111,
        createTxHash: '0xa5' + '0'.repeat(62),
        senderId: users[0].id,
        recipientAddress: '0x9999999999999999999999999999999999999999',
        tokenType: TokenType.ERC20,
        token: TOKENS.USDC,
        tokenId: '0',
        amount: '25000000', // 25 USDC
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        tokenName: 'USD Coin',
        message: 'Hope you like it! 🎁',
        status: GiftStatus.PENDING,
        expiresAt: nextWeek,
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
    })
  )

  console.log(`  ✓ Created ${gifts.length} test gifts`)
  console.log(`    - PENDING: 2`)
  console.log(`    - CLAIMED: 1`)
  console.log(`    - EXPIRED: 1`)
  console.log(`    - REFUNDED: 1`)
  console.log(`✅ Gifts seeded\n`)

  return gifts
}

/**
 * Create test gift claims
 */
async function seedGiftClaims(gifts: any[], users: any[]) {
  console.log('📋 Creating test gift claims...')

  // Find the claimed gift (index 1 in our array)
  const claimedGift = gifts.find((g) => g.status === GiftStatus.CLAIMED)

  if (!claimedGift) {
    console.log('  ⚠️  No claimed gifts to create claims for')
    return []
  }

  const claims = await Promise.all([
    prisma.giftClaim.create({
      data: {
        giftId: claimedGift.id,
        claimerId: users[2].id, // Charlie claimed
        amount: claimedGift.amount,
        txHash: claimedGift.claimTxHash!,
        chainId: claimedGift.chainId,
        claimedAt: claimedGift.claimedAt!,
        gasUsed: '21000',
        gasPrice: '20000000000', // 20 gwei
      },
    }),
  ])

  console.log(`  ✓ Created ${claims.length} claim records`)
  console.log(`✅ Gift claims seeded\n`)

  return claims
}

/**
 * Create test notifications
 */
async function seedNotifications(users: any[]) {
  console.log('🔔 Creating test notifications...')

  const now = new Date()

  const notifications = await Promise.all([
    // Alice - Gift sent notification
    prisma.notification.create({
      data: {
        userId: users[0].id,
        type: 'GIFT_SENT',
        title: 'Gift Sent Successfully',
        content: 'Your gift of 0.1 ETH has been sent to Bob',
        data: { giftId: '0x01', amount: '0.1', token: 'ETH' },
        read: false,
        createdAt: now,
      },
    }),
    // Bob - Gift received notification (unread)
    prisma.notification.create({
      data: {
        userId: users[1].id,
        type: 'GIFT_RECEIVED',
        title: 'New Gift Received! 🎁',
        content: 'You received a gift of 0.1 ETH from Alice',
        data: { giftId: '0x01', amount: '0.1', token: 'ETH' },
        read: false,
        createdAt: now,
      },
    }),
    // Charlie - Gift claimed notification (read)
    prisma.notification.create({
      data: {
        userId: users[2].id,
        type: 'GIFT_CLAIMED',
        title: 'Gift Claimed',
        content: 'You claimed 50 USDC from Bob',
        data: { giftId: '0x02', amount: '50', token: 'USDC' },
        read: true,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    }),
    // David - Invitation notification
    prisma.notification.create({
      data: {
        userId: users[3].id,
        type: 'INVITATION_ACCEPTED',
        title: 'Invitation Reward',
        content: 'You received rewards for accepting invitation',
        data: { reward: 100, inviter: 'Bob' },
        read: true,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
    }),
  ])

  console.log(`  ✓ Created ${notifications.length} notifications`)
  console.log(`    - Unread: 2`)
  console.log(`    - Read: 2`)
  console.log(`✅ Notifications seeded\n`)

  return notifications
}

/**
 * Create test achievements
 */
async function seedAchievements(users: any[]) {
  console.log('🏆 Creating test achievements...')

  const achievements = await Promise.all([
    // Alice - First gift sender
    prisma.userAchievement.create({
      data: {
        userId: users[0].id,
        code: 'FIRST_GIFT',
        metadata: { giftId: '0x01' },
      },
    }),
    // Alice - Generous sender (multiple gifts)
    prisma.userAchievement.create({
      data: {
        userId: users[0].id,
        code: 'GENEROUS_SENDER',
        metadata: { totalGifts: 5 },
      },
    }),
    // Charlie - First claimer
    prisma.userAchievement.create({
      data: {
        userId: users[2].id,
        code: 'FIRST_CLAIM',
        metadata: { giftId: '0x02' },
      },
    }),
    // Bob - Successful inviter
    prisma.userAchievement.create({
      data: {
        userId: users[1].id,
        code: 'SUCCESSFUL_INVITER',
        metadata: { inviteeCount: 1 },
      },
    }),
  ])

  console.log(`  ✓ Created ${achievements.length} achievements`)
  console.log(`✅ Achievements seeded\n`)

  return achievements
}

/**
 * Main seed function
 */
async function main() {
  const args = process.argv.slice(2)
  const cleanOnly = args.includes('--clean')

  try {
    console.log('🌱 Starting database seed...\n')

    // Always clean first
    await cleanDatabase()

    // If --clean flag, stop here
    if (cleanOnly) {
      console.log('✅ Database cleaned (--clean flag)')
      return
    }

    // Seed data
    const users = await seedUsers()
    await seedInvitations(users)
    const gifts = await seedGifts(users)
    await seedGiftClaims(gifts, users)
    await seedNotifications(users)
    await seedAchievements(users)

    console.log('🎉 Database seed completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`   Users: ${users.length}`)
    console.log(`   Gifts: ${gifts.length}`)
    console.log(`   Test addresses available for development`)
    console.log(`\n💡 Tip: Use these addresses in your frontend tests\n`)
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run seed
main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
