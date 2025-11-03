// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title MockERC721
 * @notice Mock ERC721 NFT for testing DeGift contract
 */
contract MockERC721 is ERC721 {
    uint256 private _tokenIdCounter;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    /**
     * @notice Mint a new NFT to an address
     * @param to Address to mint NFT to
     * @return tokenId The ID of the minted NFT
     */
    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _tokenIdCounter++;
        _mint(to, tokenId);
    }

    /**
     * @notice Mint a specific token ID to an address
     * @param to Address to mint NFT to
     * @param tokenId Specific token ID to mint
     */
    function mintSpecific(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    /**
     * @notice Burn an NFT
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }
}
