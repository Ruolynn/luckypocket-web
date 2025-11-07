'use client'

import { useState } from 'react'
import type { NFTMetadata } from '@/lib/gift-types'

interface NFTSelectorProps {
  selectedNFT: string
  selectedTokenId: string
  onNFTSelect: (contract: string, tokenId: string) => void
}

export function NFTSelector({
  selectedNFT,
  selectedTokenId,
  onNFTSelect,
}: NFTSelectorProps) {
  const [nfts, setNfts] = useState<NFTMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [customContract, setCustomContract] = useState('')
  const [customTokenId, setCustomTokenId] = useState('')

  // TODO: Fetch user's NFTs
  const fetchNFTs = async () => {
    setLoading(true)
    // Mock NFT data for now
    setTimeout(() => {
      setNfts([])
      setLoading(false)
    }, 1000)
  }

  const handleCustomNFT = () => {
    if (customContract && customTokenId) {
      onNFTSelect(customContract, customTokenId)
    }
  }

  return (
    <div className="space-y-6">
      {/* NFT Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base xs:text-lg font-bold text-text-primary-light">
            Your NFTs
          </h3>
          <button
            type="button"
            onClick={fetchNFTs}
            className="glass-button-secondary h-9 px-4 rounded-lg text-sm font-medium text-text-primary-light"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="glass-card rounded-lg p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-text-secondary-light">
              <span className="material-symbols-outlined animate-spin">refresh</span>
              <span>Loading your NFTs...</span>
            </div>
          </div>
        ) : nfts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {nfts.map((nft) => (
              <button
                key={`${nft.contractAddress}-${nft.tokenId}`}
                type="button"
                onClick={() => onNFTSelect(nft.contractAddress, nft.tokenId)}
                className={`glass-card rounded-lg overflow-hidden transition-all hover:scale-105 ${
                  selectedNFT === nft.contractAddress && selectedTokenId === nft.tokenId
                    ? 'ring-2 ring-primary'
                    : ''
                }`}
              >
                <div className="aspect-square bg-gray-200">
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-text-primary-light truncate">
                    {nft.name}
                  </p>
                  <p className="text-xs text-text-secondary-light truncate">
                    #{nft.tokenId}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-lg border border-dashed border-white/30 p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-text-secondary-light">
                image
              </span>
              <p className="text-text-secondary-light">No NFTs found</p>
              <p className="text-sm text-text-secondary-light">
                Use the custom input below to specify an NFT
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Custom NFT Input */}
      <div>
        <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
          Or Specify Custom NFT
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            value={customContract}
            onChange={(e) => setCustomContract(e.target.value)}
            placeholder="NFT Contract Address (0x...)"
            className="w-full h-12 px-4 rounded-lg border border-gray-300 bg-white text-text-primary-light text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <input
            type="text"
            value={customTokenId}
            onChange={(e) => setCustomTokenId(e.target.value)}
            placeholder="Token ID"
            className="w-full h-12 px-4 rounded-lg border border-gray-300 bg-white text-text-primary-light text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button
            type="button"
            onClick={handleCustomNFT}
            disabled={!customContract || !customTokenId}
            className="glass-button-secondary w-full h-11 rounded-lg text-sm font-medium text-text-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use This NFT
          </button>
        </div>
      </div>
    </div>
  )
}
