import { createPacketRecord } from '../../../src/services/packet.service'

describe('packet.service', () => {
  it('createPacketRecord should upsert packet', async () => {
    const mockPrisma: any = {
      packet: {
        upsert: vi.fn().mockResolvedValue({ id: 'p1', packetId: '0xabc' }),
      },
    }
    const res = await createPacketRecord(mockPrisma, 'u1', {
      packetId: '0xabc',
      txHash: '0xtx',
      token: '0xusdc',
      totalAmount: '100',
      count: 10,
      isRandom: true,
      message: 'hi',
      expireTime: new Date(),
    })
    expect(mockPrisma.packet.upsert).toHaveBeenCalled()
    expect(res.packetId).toBe('0xabc')
  })
})


