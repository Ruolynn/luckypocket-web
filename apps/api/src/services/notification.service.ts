import type { PrismaClient } from '@prisma/client'

export async function notifyPacketCreated(prisma: PrismaClient, userId: string, data: { packetId: string; count: number; totalAmount: string }) {
  await prisma.notification.create({
    data: {
      userId,
      type: 'packet_created',
      title: '红包已创建',
      content: `红包 ${data.packetId} 创建成功`,
      data: data as any,
    },
  })
}


