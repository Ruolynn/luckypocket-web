/**
 * @file DeGift Contract ABI
 * @description ABI for DeGift smart contract (EIP-4361 compliant gift system)
 */

export const DeGiftAbi = [
  // ============================================
  // Events
  // ============================================
  {
    type: 'event',
    name: 'GiftCreated',
    inputs: [
      { name: 'giftId', type: 'bytes32', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'tokenType', type: 'uint8', indexed: false }, // 0=ETH, 1=ERC20, 2=ERC721, 3=ERC1155
      { name: 'token', type: 'address', indexed: false },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'expiresAt', type: 'uint256', indexed: false },
      { name: 'message', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'GiftClaimed',
    inputs: [
      { name: 'giftId', type: 'bytes32', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'GiftRefunded',
    inputs: [
      { name: 'giftId', type: 'bytes32', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },

  // ============================================
  // Functions
  // ============================================

  // Create ETH gift
  {
    type: 'function',
    name: 'createGiftETH',
    stateMutability: 'payable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'message', type: 'string' },
    ],
    outputs: [{ name: 'giftId', type: 'bytes32' }],
  },

  // Create ERC20 gift
  {
    type: 'function',
    name: 'createGiftERC20',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'message', type: 'string' },
    ],
    outputs: [{ name: 'giftId', type: 'bytes32' }],
  },

  // Create ERC721 gift
  {
    type: 'function',
    name: 'createGiftERC721',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'message', type: 'string' },
    ],
    outputs: [{ name: 'giftId', type: 'bytes32' }],
  },

  // Create ERC1155 gift
  {
    type: 'function',
    name: 'createGiftERC1155',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'message', type: 'string' },
    ],
    outputs: [{ name: 'giftId', type: 'bytes32' }],
  },

  // Claim gift
  {
    type: 'function',
    name: 'claimGift',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'giftId', type: 'bytes32' }],
    outputs: [],
  },

  // Refund gift (only sender after expiry)
  {
    type: 'function',
    name: 'refundGift',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'giftId', type: 'bytes32' }],
    outputs: [],
  },

  // Get gift info
  {
    type: 'function',
    name: 'getGift',
    stateMutability: 'view',
    inputs: [{ name: 'giftId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'sender', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'tokenType', type: 'uint8' },
          { name: 'token', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'claimed', type: 'bool' },
          { name: 'refunded', type: 'bool' },
        ],
      },
    ],
  },

  // Check if gift can be claimed
  {
    type: 'function',
    name: 'canClaim',
    stateMutability: 'view',
    inputs: [
      { name: 'giftId', type: 'bytes32' },
      { name: 'claimer', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

// ERC20 ABI (minimal - for approve and balanceOf)
export const ERC20Abi = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const
