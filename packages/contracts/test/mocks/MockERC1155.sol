// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/**
 * @title MockERC1155
 * @notice Mock ERC1155 multi-token for testing DeGift contract
 */
contract MockERC1155 is ERC1155 {
    constructor() ERC1155("https://mock.uri/{id}.json") {}

    /**
     * @notice Mint tokens to an address
     * @param to Address to mint tokens to
     * @param tokenId Token ID to mint
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 tokenId, uint256 amount) external {
        _mint(to, tokenId, amount, "");
    }

    /**
     * @notice Batch mint multiple token IDs to an address
     * @param to Address to mint tokens to
     * @param tokenIds Array of token IDs to mint
     * @param amounts Array of amounts to mint for each token ID
     */
    function mintBatch(address to, uint256[] memory tokenIds, uint256[] memory amounts) external {
        _mintBatch(to, tokenIds, amounts, "");
    }

    /**
     * @notice Burn tokens from an address
     * @param from Address to burn tokens from
     * @param tokenId Token ID to burn
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 tokenId, uint256 amount) external {
        _burn(from, tokenId, amount);
    }

    /**
     * @notice Update the base URI for metadata
     * @param newuri New base URI
     */
    function setURI(string memory newuri) external {
        _setURI(newuri);
    }
}
