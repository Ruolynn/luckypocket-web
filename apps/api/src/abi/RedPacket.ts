export const RedPacketAbi = [
  {
    type: 'event',
    name: 'PacketCreated',
    inputs: [
      { name: 'packetId', type: 'bytes32', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'totalAmount', type: 'uint256', indexed: false },
      { name: 'count', type: 'uint32', indexed: false },
      { name: 'isRandom', type: 'bool', indexed: false },
      { name: 'expireTime', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PacketClaimed',
    inputs: [
      { name: 'packetId', type: 'bytes32', indexed: true },
      { name: 'claimer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'remainingCount', type: 'uint32', indexed: false },
    ],
  },
] as const


