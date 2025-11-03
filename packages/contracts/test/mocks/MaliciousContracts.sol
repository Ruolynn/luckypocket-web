// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/DeGift.sol";

/**
 * @title MaliciousReentrancy
 * @notice Malicious contract that attempts reentrancy attack on DeGift
 */
contract MaliciousReentrancy {
    DeGift public deGift;
    uint256 public giftId;
    bool public attacking;

    constructor(address _deGift) {
        deGift = DeGift(_deGift);
    }

    /**
     * @notice Create a gift and attempt reentrancy during claim
     */
    function attack() external payable {
        // Create a gift to ourselves
        giftId = deGift.createGift{value: msg.value}(
            address(this),
            address(0), // ETH
            msg.value,
            "Malicious gift",
            block.timestamp + 1 days
        );

        // Attempt to claim and reenter
        attacking = true;
        deGift.claimGift(giftId);
    }

    /**
     * @notice Fallback to attempt reentrancy
     */
    receive() external payable {
        if (attacking) {
            attacking = false;
            // Try to claim again (should fail due to ReentrancyGuard)
            try deGift.claimGift(giftId) {
                // Should not reach here
                revert("Reentrancy succeeded - VULNERABILITY!");
            } catch {
                // Expected to fail
            }
        }
    }
}

/**
 * @title MaliciousReceiver
 * @notice Malicious contract that rejects ETH transfers
 */
contract MaliciousReceiver {
    bool public rejectPayments;

    function setRejectPayments(bool _reject) external {
        rejectPayments = _reject;
    }

    receive() external payable {
        if (rejectPayments) {
            revert("Payment rejected");
        }
    }
}

/**
 * @title MaliciousERC721
 * @notice ERC721 that doesn't properly implement safeTransferFrom
 */
contract MaliciousERC721 {
    mapping(uint256 => address) public owners;
    uint256 public nextTokenId;

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        owners[tokenId] = to;
    }

    // Doesn't check if receiver can handle ERC721
    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        require(owners[tokenId] == from, "Not owner");
        owners[tokenId] = to;
        // Intentionally doesn't call onERC721Received
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(owners[tokenId] == from, "Not owner");
        owners[tokenId] = to;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return owners[tokenId];
    }
}
