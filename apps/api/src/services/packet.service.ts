import type { PrismaClient } from '@prisma/client'

export interface CreatePacketInput {
  packetId: string
  txHash: string
  token: string
  totalAmount: string
  count: number
  isRandom: boolean
  message?: string
  expireTime: Date
}

export async function createPacketRecord(prisma: PrismaClient, userId: string, input: CreatePacketInput) {
  return prisma.packet.upsert({
    where: { packetId: input.packetId },
    update: {},
    create: {
      packetId: input.packetId,
      txHash: input.txHash,
      creatorId: userId,
      token: input.token,
      totalAmount: input.totalAmount,
      count: input.count,
      isRandom: input.isRandom,
      message: input.message,
      remainingAmount: input.totalAmount,
      remainingCount: input.count,
      expireTime: input.expireTime,
    },
  })
}

export async function claimPacketRecord(prisma: PrismaClient, packetIdHex: string, userId: string) {
  const packet = await prisma.packet.findUnique({ where: { packetId: packetIdHex } })
  if (!packet) return { error: 'PACKET_NOT_FOUND' as const }
  if (packet.expireTime < new Date()) return { error: 'PACKET_EXPIRED' as const }

  const existed = await prisma.claim.findUnique({ where: { packetId_userId: { packetId: packet.id, userId } } as any })
  if (existed) return { error: 'PACKET_ALREADY_CLAIMED' as const }

  const claim = await prisma.claim.create({
    data: {
      packetId: packet.id,
      userId,
      amount: '0',
      txHash: `stub:${crypto.randomUUID()}`,
    },
  })
  return { claim }
}


