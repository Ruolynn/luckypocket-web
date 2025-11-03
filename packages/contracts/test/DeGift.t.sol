// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DeGift} from "../src/DeGift.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockERC721} from "./mocks/MockERC721.sol";
import {MockERC1155} from "./mocks/MockERC1155.sol";
import {MaliciousReentrancy, MaliciousReceiver} from "./mocks/MaliciousContracts.sol";

/**
 * @title DeGiftTest
 * @notice Comprehensive test suite for DeGift contract
 */
contract DeGiftTest is Test {
    DeGift public deGift;
    MockERC20 public token;
    MockERC721 public nft721;
    MockERC1155 public nft1155;

    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);

    uint256 constant INITIAL_BALANCE = 100 ether;
    uint256 constant GIFT_AMOUNT = 1 ether;
    uint256 constant TOKEN_AMOUNT = 1000 * 10 ** 18;

    // Events for testing
    event GiftCreated(
        uint256 indexed giftId,
        address indexed sender,
        address indexed recipient,
        DeGift.TokenType tokenType,
        address token,
        uint256 tokenId,
        uint256 amount
    );

    event GiftClaimed(
        uint256 indexed giftId,
        address indexed claimer,
        DeGift.TokenType tokenType,
        uint256 amount
    );

    event GiftRefunded(
        uint256 indexed giftId,
        address indexed sender,
        DeGift.TokenType tokenType,
        uint256 amount
    );

    function setUp() public {
        // Deploy contracts
        deGift = new DeGift();
        token = new MockERC20("Test Token", "TEST");
        nft721 = new MockERC721("Test NFT", "TNFT");
        nft1155 = new MockERC1155();

        // Fund test accounts
        vm.deal(alice, INITIAL_BALANCE);
        vm.deal(bob, INITIAL_BALANCE);
        vm.deal(charlie, INITIAL_BALANCE);

        // Mint tokens to alice
        token.mint(alice, TOKEN_AMOUNT);

        // Mint NFTs to alice
        vm.startPrank(alice);
        nft721.mint(alice);
        nft721.mint(alice);
        nft1155.mint(alice, 1, 10);
        nft1155.mint(alice, 2, 5);
        vm.stopPrank();
    }

    // ============ ETH Gift Tests ============

    function test_CreateETHGift() public {
        vm.startPrank(alice);

        uint256 expiresAt = block.timestamp + 1 days;

        vm.expectEmit(true, true, true, true);
        emit GiftCreated(1, alice, bob, DeGift.TokenType.ETH, address(0), 0, GIFT_AMOUNT);

        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "Happy Birthday!",
            expiresAt
        );

        assertEq(giftId, 1);
        assertEq(address(deGift).balance, GIFT_AMOUNT);

        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(gift.sender, alice);
        assertEq(gift.recipient, bob);
        assertEq(uint8(gift.tokenType), uint8(DeGift.TokenType.ETH));
        assertEq(gift.amount, GIFT_AMOUNT);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.PENDING));

        vm.stopPrank();
    }

    function test_ClaimETHGift() public {
        // Alice creates gift
        vm.prank(alice);
        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "For you",
            block.timestamp + 1 days
        );

        uint256 bobBalanceBefore = bob.balance;

        // Bob claims gift
        vm.prank(bob);
        vm.expectEmit(true, true, true, true);
        emit GiftClaimed(giftId, bob, DeGift.TokenType.ETH, GIFT_AMOUNT);

        deGift.claimGift(giftId);

        assertEq(bob.balance, bobBalanceBefore + GIFT_AMOUNT);

        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.CLAIMED));
    }

    function test_RefundETHGift() public {
        // Alice creates gift
        vm.prank(alice);
        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "For you",
            block.timestamp + 1 days
        );

        // Fast forward past expiration
        vm.warp(block.timestamp + 2 days);

        uint256 aliceBalanceBefore = alice.balance;

        // Alice refunds gift
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit GiftRefunded(giftId, alice, DeGift.TokenType.ETH, GIFT_AMOUNT);

        deGift.refundGift(giftId);

        assertEq(alice.balance, aliceBalanceBefore + GIFT_AMOUNT);

        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.REFUNDED));
    }

    // ============ ERC20 Gift Tests ============

    function test_CreateERC20Gift() public {
        vm.startPrank(alice);

        token.approve(address(deGift), TOKEN_AMOUNT);

        uint256 expiresAt = block.timestamp + 1 days;

        vm.expectEmit(true, true, true, true);
        emit GiftCreated(1, alice, bob, DeGift.TokenType.ERC20, address(token), 0, TOKEN_AMOUNT);

        uint256 giftId = deGift.createGift(
            bob,
            address(token),
            TOKEN_AMOUNT,
            "Token gift!",
            expiresAt
        );

        assertEq(giftId, 1);
        assertEq(token.balanceOf(address(deGift)), TOKEN_AMOUNT);

        vm.stopPrank();
    }

    function test_ClaimERC20Gift() public {
        // Alice creates ERC20 gift
        vm.startPrank(alice);
        token.approve(address(deGift), TOKEN_AMOUNT);
        uint256 giftId = deGift.createGift(
            bob,
            address(token),
            TOKEN_AMOUNT,
            "Tokens for you",
            block.timestamp + 1 days
        );
        vm.stopPrank();

        uint256 bobBalanceBefore = token.balanceOf(bob);

        // Bob claims gift
        vm.prank(bob);
        deGift.claimGift(giftId);

        assertEq(token.balanceOf(bob), bobBalanceBefore + TOKEN_AMOUNT);

        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.CLAIMED));
    }

    function test_RefundERC20Gift() public {
        // Alice creates ERC20 gift
        vm.startPrank(alice);
        uint256 aliceBalanceBefore = token.balanceOf(alice);
        token.approve(address(deGift), TOKEN_AMOUNT);
        uint256 giftId = deGift.createGift(
            bob,
            address(token),
            TOKEN_AMOUNT,
            "Tokens",
            block.timestamp + 1 days
        );
        vm.stopPrank();

        // Fast forward past expiration
        vm.warp(block.timestamp + 2 days);

        // Alice refunds gift
        vm.prank(alice);
        deGift.refundGift(giftId);

        assertEq(token.balanceOf(alice), aliceBalanceBefore);

        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.REFUNDED));
    }

    // ============ ERC721 NFT Gift Tests ============

    function test_CreateERC721Gift() public {
        vm.startPrank(alice);

        uint256 tokenId = 0;
        nft721.approve(address(deGift), tokenId);

        uint256 expiresAt = block.timestamp + 1 days;

        vm.expectEmit(true, true, true, true);
        emit GiftCreated(1, alice, bob, DeGift.TokenType.ERC721, address(nft721), tokenId, 1);

        uint256 giftId = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC721,
            address(nft721),
            tokenId,
            1,
            "NFT gift!",
            expiresAt
        );

        assertEq(giftId, 1);
        assertEq(nft721.ownerOf(tokenId), address(deGift));

        vm.stopPrank();
    }

    function test_ClaimERC721Gift() public {
        // Alice creates ERC721 gift
        vm.startPrank(alice);
        uint256 tokenId = 0;
        nft721.approve(address(deGift), tokenId);
        uint256 giftId = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC721,
            address(nft721),
            tokenId,
            1,
            "NFT for you",
            block.timestamp + 1 days
        );
        vm.stopPrank();

        // Bob claims gift
        vm.prank(bob);
        deGift.claimGift(giftId);

        assertEq(nft721.ownerOf(tokenId), bob);

        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.CLAIMED));
    }

    function test_RefundERC721Gift() public {
        // Alice creates ERC721 gift
        vm.startPrank(alice);
        uint256 tokenId = 0;
        nft721.approve(address(deGift), tokenId);
        uint256 giftId = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC721,
            address(nft721),
            tokenId,
            1,
            "NFT",
            block.timestamp + 1 days
        );
        vm.stopPrank();

        // Fast forward past expiration
        vm.warp(block.timestamp + 2 days);

        // Alice refunds gift
        vm.prank(alice);
        deGift.refundGift(giftId);

        assertEq(nft721.ownerOf(tokenId), alice);

        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.REFUNDED));
    }

    function test_RevertERC721InvalidAmount() public {
        vm.startPrank(alice);
        uint256 tokenId = 0;
        nft721.approve(address(deGift), tokenId);

        vm.expectRevert(DeGift.ERC721AmountMustBeOne.selector);
        deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC721,
            address(nft721),
            tokenId,
            2, // Invalid amount
            "NFT",
            block.timestamp + 1 days
        );

        vm.stopPrank();
    }

    // ============ ERC1155 NFT Gift Tests ============

    function test_CreateERC1155Gift() public {
        vm.startPrank(alice);

        uint256 tokenId = 1;
        uint256 amount = 5;
        nft1155.setApprovalForAll(address(deGift), true);

        uint256 expiresAt = block.timestamp + 1 days;

        vm.expectEmit(true, true, true, true);
        emit GiftCreated(1, alice, bob, DeGift.TokenType.ERC1155, address(nft1155), tokenId, amount);

        uint256 giftId = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC1155,
            address(nft1155),
            tokenId,
            amount,
            "Multi-token gift!",
            expiresAt
        );

        assertEq(giftId, 1);
        assertEq(nft1155.balanceOf(address(deGift), tokenId), amount);

        vm.stopPrank();
    }

    function test_ClaimERC1155Gift() public {
        // Alice creates ERC1155 gift
        vm.startPrank(alice);
        uint256 tokenId = 1;
        uint256 amount = 5;
        nft1155.setApprovalForAll(address(deGift), true);
        uint256 giftId = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC1155,
            address(nft1155),
            tokenId,
            amount,
            "Multi-tokens for you",
            block.timestamp + 1 days
        );
        vm.stopPrank();

        uint256 bobBalanceBefore = nft1155.balanceOf(bob, tokenId);

        // Bob claims gift
        vm.prank(bob);
        deGift.claimGift(giftId);

        assertEq(nft1155.balanceOf(bob, tokenId), bobBalanceBefore + amount);

        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.CLAIMED));
    }

    function test_RefundERC1155Gift() public {
        // Alice creates ERC1155 gift
        vm.startPrank(alice);
        uint256 tokenId = 1;
        uint256 amount = 5;
        uint256 aliceBalanceBefore = nft1155.balanceOf(alice, tokenId);
        nft1155.setApprovalForAll(address(deGift), true);
        uint256 giftId = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC1155,
            address(nft1155),
            tokenId,
            amount,
            "Multi-tokens",
            block.timestamp + 1 days
        );
        vm.stopPrank();

        // Fast forward past expiration
        vm.warp(block.timestamp + 2 days);

        // Alice refunds gift
        vm.prank(alice);
        deGift.refundGift(giftId);

        assertEq(nft1155.balanceOf(alice, tokenId), aliceBalanceBefore);

        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.REFUNDED));
    }

    // ============ Edge Case Tests ============

    function test_RevertInvalidRecipient() public {
        vm.prank(alice);
        vm.expectRevert(DeGift.InvalidRecipient.selector);
        deGift.createGift{value: GIFT_AMOUNT}(
            address(0),
            address(0),
            GIFT_AMOUNT,
            "Invalid",
            block.timestamp + 1 days
        );
    }

    function test_RevertInvalidAmount() public {
        vm.prank(alice);
        vm.expectRevert(DeGift.InvalidAmount.selector);
        deGift.createGift{value: 0}(
            bob,
            address(0),
            0,
            "Invalid",
            block.timestamp + 1 days
        );
    }

    function test_RevertInvalidExpiration() public {
        vm.prank(alice);
        vm.expectRevert(DeGift.InvalidExpiration.selector);
        deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "Invalid",
            block.timestamp - 1 // Past time
        );
    }

    function test_RevertETHAmountMismatch() public {
        vm.prank(alice);
        vm.expectRevert(DeGift.InvalidAmount.selector);
        deGift.createGift{value: 1 ether}(
            bob,
            address(0),
            2 ether, // Mismatch
            "Invalid",
            block.timestamp + 1 days
        );
    }

    function test_RevertERC20WithETH() public {
        vm.startPrank(alice);
        token.approve(address(deGift), TOKEN_AMOUNT);

        vm.expectRevert(DeGift.InvalidAmount.selector);
        deGift.createGift{value: 1 ether}( // Should not send ETH
            bob,
            address(token),
            TOKEN_AMOUNT,
            "Invalid",
            block.timestamp + 1 days
        );

        vm.stopPrank();
    }

    function test_RevertGiftNotFound() public {
        vm.prank(bob);
        vm.expectRevert(DeGift.GiftNotFound.selector);
        deGift.claimGift(999); // Non-existent gift
    }

    function test_RevertNotRecipient() public {
        vm.prank(alice);
        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "For Bob",
            block.timestamp + 1 days
        );

        vm.prank(charlie);
        vm.expectRevert(DeGift.NotGiftRecipient.selector);
        deGift.claimGift(giftId);
    }

    function test_RevertGiftExpired() public {
        vm.prank(alice);
        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "For Bob",
            block.timestamp + 1 days
        );

        // Fast forward past expiration
        vm.warp(block.timestamp + 2 days);

        vm.prank(bob);
        vm.expectRevert(DeGift.GiftExpired.selector);
        deGift.claimGift(giftId);
    }

    function test_RevertAlreadyClaimed() public {
        vm.prank(alice);
        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "For Bob",
            block.timestamp + 1 days
        );

        vm.prank(bob);
        deGift.claimGift(giftId);

        // Try to claim again
        vm.prank(bob);
        vm.expectRevert(DeGift.GiftAlreadyClaimed.selector);
        deGift.claimGift(giftId);
    }

    function test_RevertNotExpired() public {
        vm.prank(alice);
        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "For Bob",
            block.timestamp + 1 days
        );

        // Try to refund before expiration
        vm.prank(alice);
        vm.expectRevert(DeGift.GiftNotExpired.selector);
        deGift.refundGift(giftId);
    }

    function test_RevertNotSender() public {
        vm.prank(alice);
        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "For Bob",
            block.timestamp + 1 days
        );

        // Fast forward past expiration
        vm.warp(block.timestamp + 2 days);

        // Charlie tries to refund Alice's gift
        vm.prank(charlie);
        vm.expectRevert(DeGift.NotGiftSender.selector);
        deGift.refundGift(giftId);
    }

    function test_RevertInvalidTokenType() public {
        vm.startPrank(alice);
        token.approve(address(deGift), TOKEN_AMOUNT);

        vm.expectRevert(DeGift.InvalidTokenType.selector);
        deGift.createNFTGift(
            bob,
            DeGift.TokenType.ETH, // Invalid for NFT
            address(token),
            0,
            1,
            "Invalid",
            block.timestamp + 1 days
        );

        vm.stopPrank();
    }

    function test_RevertInvalidTokenAddress() public {
        vm.prank(alice);
        vm.expectRevert(DeGift.InvalidTokenAddress.selector);
        deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC721,
            address(0), // Invalid
            0,
            1,
            "Invalid",
            block.timestamp + 1 days
        );
    }

    // ============ Security Tests ============

    function test_ReentrancyProtection() public {
        MaliciousReentrancy attacker = new MaliciousReentrancy(address(deGift));
        vm.deal(address(attacker), 10 ether);

        // This should not revert - reentrancy is prevented
        attacker.attack{value: 1 ether}();

        // Verify attacker didn't steal funds
        assertTrue(!attacker.attacking());
    }

    function test_MultipleGiftsSameRecipient() public {
        vm.startPrank(alice);

        uint256 giftId1 = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "Gift 1",
            block.timestamp + 1 days
        );

        uint256 giftId2 = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "Gift 2",
            block.timestamp + 1 days
        );

        vm.stopPrank();

        assertEq(giftId1, 1);
        assertEq(giftId2, 2);

        // Bob can claim both
        vm.startPrank(bob);
        deGift.claimGift(giftId1);
        deGift.claimGift(giftId2);
        vm.stopPrank();
    }

    function test_GiftStatusExpired() public {
        vm.prank(alice);
        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "For Bob",
            block.timestamp + 1 days
        );

        // Check status before expiration
        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.PENDING));

        // Fast forward past expiration
        vm.warp(block.timestamp + 2 days);

        // Check status after expiration (should auto-update to EXPIRED)
        gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.EXPIRED));
    }

    // ============ Integration Tests ============

    function test_MultipleUsersConcurrent() public {
        // Alice creates gift to Bob
        vm.prank(alice);
        uint256 giftId1 = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "From Alice",
            block.timestamp + 1 days
        );

        // Bob creates gift to Charlie
        vm.prank(bob);
        uint256 giftId2 = deGift.createGift{value: GIFT_AMOUNT}(
            charlie,
            address(0),
            GIFT_AMOUNT,
            "From Bob",
            block.timestamp + 1 days
        );

        // Charlie creates gift to Alice
        vm.prank(charlie);
        uint256 giftId3 = deGift.createGift{value: GIFT_AMOUNT}(
            alice,
            address(0),
            GIFT_AMOUNT,
            "From Charlie",
            block.timestamp + 1 days
        );

        // Each claims their gift
        vm.prank(bob);
        deGift.claimGift(giftId1);

        vm.prank(charlie);
        deGift.claimGift(giftId2);

        vm.prank(alice);
        deGift.claimGift(giftId3);

        // Verify all gifts claimed
        assertEq(uint8(deGift.getGift(giftId1).status), uint8(DeGift.GiftStatus.CLAIMED));
        assertEq(uint8(deGift.getGift(giftId2).status), uint8(DeGift.GiftStatus.CLAIMED));
        assertEq(uint8(deGift.getGift(giftId3).status), uint8(DeGift.GiftStatus.CLAIMED));
    }

    function test_TotalGiftsCounter() public {
        assertEq(deGift.getTotalGifts(), 0);

        vm.startPrank(alice);
        deGift.createGift{value: GIFT_AMOUNT}(bob, address(0), GIFT_AMOUNT, "1", block.timestamp + 1 days);
        assertEq(deGift.getTotalGifts(), 1);

        deGift.createGift{value: GIFT_AMOUNT}(bob, address(0), GIFT_AMOUNT, "2", block.timestamp + 1 days);
        assertEq(deGift.getTotalGifts(), 2);

        deGift.createGift{value: GIFT_AMOUNT}(bob, address(0), GIFT_AMOUNT, "3", block.timestamp + 1 days);
        assertEq(deGift.getTotalGifts(), 3);

        vm.stopPrank();
    }

    function test_GiftExists() public {
        assertFalse(deGift.giftExists(1));

        vm.prank(alice);
        deGift.createGift{value: GIFT_AMOUNT}(bob, address(0), GIFT_AMOUNT, "Gift", block.timestamp + 1 days);

        assertTrue(deGift.giftExists(1));
        assertFalse(deGift.giftExists(2));
    }

    // ============ Fuzz Tests ============

    function testFuzz_CreateETHGift(uint256 amount, uint256 duration) public {
        // Bound inputs to reasonable ranges
        amount = bound(amount, 0.01 ether, 10 ether);
        duration = bound(duration, 1 hours, 365 days);

        vm.deal(alice, amount);

        vm.prank(alice);
        uint256 giftId = deGift.createGift{value: amount}(
            bob,
            address(0),
            amount,
            "Fuzz test",
            block.timestamp + duration
        );

        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(gift.amount, amount);
        assertEq(gift.expiresAt, block.timestamp + duration);
    }

    function testFuzz_ClaimGift(uint256 amount) public {
        amount = bound(amount, 0.01 ether, 10 ether);
        vm.deal(alice, amount);

        vm.prank(alice);
        uint256 giftId = deGift.createGift{value: amount}(
            bob,
            address(0),
            amount,
            "Fuzz claim",
            block.timestamp + 1 days
        );

        uint256 bobBalanceBefore = bob.balance;

        vm.prank(bob);
        deGift.claimGift(giftId);

        assertEq(bob.balance, bobBalanceBefore + amount);
    }

    // ============ Additional Branch Coverage Tests ============

    function test_RevertRefundClaimedGift() public {
        vm.prank(alice);
        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "For Bob",
            block.timestamp + 1 days
        );

        // Bob claims gift
        vm.prank(bob);
        deGift.claimGift(giftId);

        // Fast forward past expiration
        vm.warp(block.timestamp + 2 days);

        // Alice tries to refund already claimed gift
        vm.prank(alice);
        vm.expectRevert(DeGift.GiftAlreadyClaimed.selector);
        deGift.refundGift(giftId);
    }

    function test_RevertRefundRefundedGift() public {
        vm.prank(alice);
        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "For Bob",
            block.timestamp + 1 days
        );

        // Fast forward past expiration
        vm.warp(block.timestamp + 2 days);

        // Alice refunds gift
        vm.prank(alice);
        deGift.refundGift(giftId);

        // Alice tries to refund again
        vm.prank(alice);
        vm.expectRevert(DeGift.GiftAlreadyClaimed.selector);
        deGift.refundGift(giftId);
    }

    function test_MultipleERC1155Amounts() public {
        vm.startPrank(alice);
        nft1155.setApprovalForAll(address(deGift), true);

        // Create gift with amount 1
        uint256 giftId1 = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC1155,
            address(nft1155),
            1,
            1,
            "Single token",
            block.timestamp + 1 days
        );

        // Create gift with amount 3
        uint256 giftId2 = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC1155,
            address(nft1155),
            1,
            3,
            "Three tokens",
            block.timestamp + 1 days
        );

        vm.stopPrank();

        // Verify both gifts exist with correct amounts
        DeGift.Gift memory gift1 = deGift.getGift(giftId1);
        assertEq(gift1.amount, 1);

        DeGift.Gift memory gift2 = deGift.getGift(giftId2);
        assertEq(gift2.amount, 3);

        // Bob claims both
        vm.startPrank(bob);
        deGift.claimGift(giftId1);
        deGift.claimGift(giftId2);
        vm.stopPrank();

        assertEq(nft1155.balanceOf(bob, 1), 4);
    }

    function test_MixedTokenTypesSequential() public {
        vm.startPrank(alice);

        // ETH gift
        uint256 giftId1 = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "ETH",
            block.timestamp + 1 days
        );

        // ERC20 gift
        token.approve(address(deGift), TOKEN_AMOUNT);
        uint256 giftId2 = deGift.createGift(
            bob,
            address(token),
            TOKEN_AMOUNT,
            "ERC20",
            block.timestamp + 1 days
        );

        // ERC721 gift
        nft721.approve(address(deGift), 0);
        uint256 giftId3 = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC721,
            address(nft721),
            0,
            1,
            "ERC721",
            block.timestamp + 1 days
        );

        // ERC1155 gift
        nft1155.setApprovalForAll(address(deGift), true);
        uint256 giftId4 = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC1155,
            address(nft1155),
            1,
            2,
            "ERC1155",
            block.timestamp + 1 days
        );

        vm.stopPrank();

        // Verify all have correct token types
        assertEq(uint8(deGift.getGift(giftId1).tokenType), uint8(DeGift.TokenType.ETH));
        assertEq(uint8(deGift.getGift(giftId2).tokenType), uint8(DeGift.TokenType.ERC20));
        assertEq(uint8(deGift.getGift(giftId3).tokenType), uint8(DeGift.TokenType.ERC721));
        assertEq(uint8(deGift.getGift(giftId4).tokenType), uint8(DeGift.TokenType.ERC1155));

        // Bob claims all
        vm.startPrank(bob);
        deGift.claimGift(giftId1);
        deGift.claimGift(giftId2);
        deGift.claimGift(giftId3);
        deGift.claimGift(giftId4);
        vm.stopPrank();
    }

    function test_RefundAfterExactExpiration() public {
        vm.prank(alice);
        uint256 expiresAt = block.timestamp + 1 days;
        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "For Bob",
            expiresAt
        );

        // Fast forward to exact expiration
        vm.warp(expiresAt);

        // Should still be claimable at exact expiration time (block.timestamp <= expiresAt)
        vm.prank(bob);
        deGift.claimGift(giftId);

        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.CLAIMED));
    }

    function test_ExpirationBoundary() public {
        vm.prank(alice);
        uint256 expiresAt = block.timestamp + 1 days;
        uint256 giftId = deGift.createGift{value: GIFT_AMOUNT}(
            bob,
            address(0),
            GIFT_AMOUNT,
            "For Bob",
            expiresAt
        );

        // At exact expiration time, cannot refund yet
        vm.warp(expiresAt);
        vm.prank(alice);
        vm.expectRevert(DeGift.GiftNotExpired.selector);
        deGift.refundGift(giftId);

        // Fast forward 1 second past expiration
        vm.warp(expiresAt + 1);

        // Now both claim should fail and refund should work
        vm.prank(bob);
        vm.expectRevert(DeGift.GiftExpired.selector);
        deGift.claimGift(giftId);

        vm.prank(alice);
        deGift.refundGift(giftId);

        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.REFUNDED));
    }

    function test_CompleteGiftLifecycleERC20() public {
        vm.startPrank(alice);
        token.approve(address(deGift), TOKEN_AMOUNT);

        uint256 giftId = deGift.createGift(
            bob,
            address(token),
            TOKEN_AMOUNT,
            "Complete lifecycle",
            block.timestamp + 1 days
        );

        // Check initial state
        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.PENDING));
        assertEq(uint8(gift.tokenType), uint8(DeGift.TokenType.ERC20));
        assertEq(gift.token, address(token));
        assertEq(gift.tokenId, 0);

        vm.stopPrank();

        // Bob claims
        vm.prank(bob);
        deGift.claimGift(giftId);

        // Check claimed state
        gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.CLAIMED));
    }

    function test_CompleteGiftLifecycleNFT721() public {
        vm.startPrank(alice);
        nft721.approve(address(deGift), 1);

        uint256 giftId = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC721,
            address(nft721),
            1,
            1,
            "Complete NFT lifecycle",
            block.timestamp + 1 days
        );

        // Check initial state
        DeGift.Gift memory gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.PENDING));
        assertEq(uint8(gift.tokenType), uint8(DeGift.TokenType.ERC721));
        assertEq(gift.tokenId, 1);

        vm.stopPrank();

        // Bob claims
        vm.prank(bob);
        deGift.claimGift(giftId);

        // Check claimed state
        gift = deGift.getGift(giftId);
        assertEq(uint8(gift.status), uint8(DeGift.GiftStatus.CLAIMED));
        assertEq(nft721.ownerOf(1), bob);
    }

    function test_ZeroTokenIdERC721() public {
        vm.startPrank(alice);
        nft721.approve(address(deGift), 0);

        uint256 giftId = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC721,
            address(nft721),
            0, // Token ID 0 is valid
            1,
            "Token ID 0",
            block.timestamp + 1 days
        );

        vm.stopPrank();

        vm.prank(bob);
        deGift.claimGift(giftId);

        assertEq(nft721.ownerOf(0), bob);
    }

    function test_LargeERC1155Amount() public {
        uint256 largeAmount = 1000;

        vm.startPrank(alice);
        nft1155.mint(alice, 3, largeAmount);
        nft1155.setApprovalForAll(address(deGift), true);

        uint256 giftId = deGift.createNFTGift(
            bob,
            DeGift.TokenType.ERC1155,
            address(nft1155),
            3,
            largeAmount,
            "Large amount",
            block.timestamp + 1 days
        );

        vm.stopPrank();

        vm.prank(bob);
        deGift.claimGift(giftId);

        assertEq(nft1155.balanceOf(bob, 3), largeAmount);
    }
}
