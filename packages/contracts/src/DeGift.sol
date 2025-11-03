// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DeGift
 * @notice A decentralized gift system supporting ETH, ERC20 tokens, and NFTs (ERC721/ERC1155)
 * @dev Implements gift creation, claiming, and refunding with expiration mechanism
 */
contract DeGift is ReentrancyGuard, ERC721Holder, ERC1155Holder {
    using SafeERC20 for IERC20;

    /// @notice Token type enum for different asset types
    enum TokenType {
        ETH,        // Native ETH
        ERC20,      // ERC20 tokens
        ERC721,     // ERC721 NFTs
        ERC1155     // ERC1155 multi-tokens
    }

    /// @notice Gift status enum
    enum GiftStatus {
        PENDING,    // Gift created but not claimed
        CLAIMED,    // Gift has been claimed by recipient
        REFUNDED,   // Gift has been refunded to sender
        EXPIRED     // Gift has expired (auto-updated on query)
    }

    /// @notice Gift data structure
    struct Gift {
        uint256 id;              // Unique gift ID
        address sender;          // Gift sender address
        address recipient;       // Gift recipient address
        TokenType tokenType;     // Type of token (ETH, ERC20, ERC721, ERC1155)
        address token;           // Token address (address(0) for ETH)
        uint256 tokenId;         // Token ID (for ERC721/ERC1155, 0 for ETH/ERC20)
        uint256 amount;          // Gift amount (always 1 for ERC721, variable for ERC1155)
        string message;          // Gift message/blessing
        uint256 createdAt;       // Creation timestamp
        uint256 expiresAt;       // Expiration timestamp
        GiftStatus status;       // Current gift status
    }

    /// @notice Counter for generating unique gift IDs
    uint256 private _giftIdCounter;

    /// @notice Mapping from gift ID to Gift struct
    mapping(uint256 => Gift) private _gifts;

    // ============ Events ============

    /// @notice Emitted when a new gift is created
    /// @param giftId Unique identifier of the gift
    /// @param sender Address of the gift sender
    /// @param recipient Address of the gift recipient
    /// @param tokenType Type of token (ETH, ERC20, ERC721, ERC1155)
    /// @param token Token address (address(0) for ETH)
    /// @param tokenId Token ID (for NFTs, 0 for fungible tokens)
    /// @param amount Amount of tokens/ETH in the gift
    event GiftCreated(
        uint256 indexed giftId,
        address indexed sender,
        address indexed recipient,
        TokenType tokenType,
        address token,
        uint256 tokenId,
        uint256 amount
    );

    /// @notice Emitted when a gift is claimed
    /// @param giftId ID of the claimed gift
    /// @param claimer Address that claimed the gift
    /// @param tokenType Type of token claimed
    /// @param amount Amount claimed (1 for ERC721)
    event GiftClaimed(
        uint256 indexed giftId,
        address indexed claimer,
        TokenType tokenType,
        uint256 amount
    );

    /// @notice Emitted when a gift is refunded
    /// @param giftId ID of the refunded gift
    /// @param sender Original sender receiving the refund
    /// @param tokenType Type of token refunded
    /// @param amount Amount refunded (1 for ERC721)
    event GiftRefunded(
        uint256 indexed giftId,
        address indexed sender,
        TokenType tokenType,
        uint256 amount
    );

    // ============ Custom Errors ============

    /// @notice Gift with the specified ID does not exist
    error GiftNotFound();

    /// @notice Gift has already been claimed
    error GiftAlreadyClaimed();

    /// @notice Gift has expired and cannot be claimed
    error GiftExpired();

    /// @notice Gift has not expired yet and cannot be refunded
    error GiftNotExpired();

    /// @notice Caller is not the designated recipient of the gift
    error NotGiftRecipient();

    /// @notice Caller is not the original sender of the gift
    error NotGiftSender();

    /// @notice Invalid amount (must be greater than 0)
    error InvalidAmount();

    /// @notice Invalid recipient address (cannot be zero address)
    error InvalidRecipient();

    /// @notice Invalid expiration time (must be in the future)
    error InvalidExpiration();

    /// @notice Invalid token type
    error InvalidTokenType();

    /// @notice Invalid token address (cannot be zero address for tokens)
    error InvalidTokenAddress();

    /// @notice Invalid token ID for NFT
    error InvalidTokenId();

    /// @notice ERC721 amount must be 1
    error ERC721AmountMustBeOne();

    // ============ Core Functions ============

    /**
     * @notice Creates a new fungible token gift (ETH or ERC20)
     * @dev Supports both ETH (when token is address(0)) and ERC20 tokens
     * @param recipient Address of the gift recipient
     * @param token Token contract address (use address(0) for ETH)
     * @param amount Amount of tokens/ETH to gift
     * @param message Personal message or blessing (max 200 chars recommended)
     * @param expiresAt Unix timestamp when the gift expires
     * @return giftId Unique identifier of the created gift
     */
    function createGift(
        address recipient,
        address token,
        uint256 amount,
        string memory message,
        uint256 expiresAt
    ) external payable nonReentrant returns (uint256 giftId) {
        // Input validation
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (expiresAt <= block.timestamp) revert InvalidExpiration();

        // Generate unique gift ID
        giftId = ++_giftIdCounter;

        TokenType tokenType;
        // Handle token transfer
        if (token == address(0)) {
            // ETH gift
            if (msg.value != amount) revert InvalidAmount();
            tokenType = TokenType.ETH;
        } else {
            // ERC20 gift
            if (msg.value != 0) revert InvalidAmount();
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            tokenType = TokenType.ERC20;
        }

        // Store gift data
        _gifts[giftId] = Gift({
            id: giftId,
            sender: msg.sender,
            recipient: recipient,
            tokenType: tokenType,
            token: token,
            tokenId: 0, // Not used for fungible tokens
            amount: amount,
            message: message,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            status: GiftStatus.PENDING
        });

        emit GiftCreated(giftId, msg.sender, recipient, tokenType, token, 0, amount);
    }

    /**
     * @notice Creates a new NFT gift (ERC721 or ERC1155)
     * @dev Supports both ERC721 and ERC1155 NFT standards with safe transfers
     * @param recipient Address of the gift recipient
     * @param tokenType Type of NFT (must be ERC721 or ERC1155)
     * @param token NFT contract address
     * @param tokenId NFT token ID
     * @param amount Amount of tokens (must be 1 for ERC721, can be >1 for ERC1155)
     * @param message Personal message or blessing (max 200 chars recommended)
     * @param expiresAt Unix timestamp when the gift expires
     * @return giftId Unique identifier of the created gift
     */
    function createNFTGift(
        address recipient,
        TokenType tokenType,
        address token,
        uint256 tokenId,
        uint256 amount,
        string memory message,
        uint256 expiresAt
    ) external nonReentrant returns (uint256 giftId) {
        // Input validation
        if (recipient == address(0)) revert InvalidRecipient();
        if (token == address(0)) revert InvalidTokenAddress();
        if (amount == 0) revert InvalidAmount();
        if (expiresAt <= block.timestamp) revert InvalidExpiration();

        // Validate token type is NFT
        if (tokenType != TokenType.ERC721 && tokenType != TokenType.ERC1155) {
            revert InvalidTokenType();
        }

        // Generate unique gift ID
        giftId = ++_giftIdCounter;

        // Handle NFT transfer based on type
        if (tokenType == TokenType.ERC721) {
            // ERC721: amount must be 1
            if (amount != 1) revert ERC721AmountMustBeOne();

            // Safe transfer ERC721 from sender to contract
            IERC721(token).safeTransferFrom(msg.sender, address(this), tokenId);
        } else {
            // ERC1155: amount can be any positive number
            // Safe transfer ERC1155 from sender to contract
            IERC1155(token).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        }

        // Store gift data
        _gifts[giftId] = Gift({
            id: giftId,
            sender: msg.sender,
            recipient: recipient,
            tokenType: tokenType,
            token: token,
            tokenId: tokenId,
            amount: amount,
            message: message,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            status: GiftStatus.PENDING
        });

        emit GiftCreated(giftId, msg.sender, recipient, tokenType, token, tokenId, amount);
    }

    /**
     * @notice Claims a gift
     * @dev Only the designated recipient can claim. Transfers tokens/ETH/NFT to recipient.
     * @param giftId ID of the gift to claim
     */
    function claimGift(uint256 giftId) external nonReentrant {
        Gift storage gift = _gifts[giftId];

        // Validation checks
        if (gift.sender == address(0)) revert GiftNotFound();
        if (gift.status != GiftStatus.PENDING) revert GiftAlreadyClaimed();
        if (block.timestamp > gift.expiresAt) revert GiftExpired();
        if (msg.sender != gift.recipient) revert NotGiftRecipient();

        // Update status
        gift.status = GiftStatus.CLAIMED;

        // Transfer based on token type
        if (gift.tokenType == TokenType.ETH) {
            // Transfer ETH
            (bool success, ) = gift.recipient.call{value: gift.amount}("");
            require(success, "ETH transfer failed");
        } else if (gift.tokenType == TokenType.ERC20) {
            // Transfer ERC20
            IERC20(gift.token).safeTransfer(gift.recipient, gift.amount);
        } else if (gift.tokenType == TokenType.ERC721) {
            // Transfer ERC721
            IERC721(gift.token).safeTransferFrom(address(this), gift.recipient, gift.tokenId);
        } else if (gift.tokenType == TokenType.ERC1155) {
            // Transfer ERC1155
            IERC1155(gift.token).safeTransferFrom(address(this), gift.recipient, gift.tokenId, gift.amount, "");
        }

        emit GiftClaimed(giftId, msg.sender, gift.tokenType, gift.amount);
    }

    /**
     * @notice Refunds an expired or unclaimed gift back to the sender
     * @dev Only the original sender can refund, and only after expiration
     * @param giftId ID of the gift to refund
     */
    function refundGift(uint256 giftId) external nonReentrant {
        Gift storage gift = _gifts[giftId];

        // Validation checks
        if (gift.sender == address(0)) revert GiftNotFound();
        if (msg.sender != gift.sender) revert NotGiftSender();
        if (gift.status != GiftStatus.PENDING) revert GiftAlreadyClaimed();
        if (block.timestamp <= gift.expiresAt) revert GiftNotExpired();

        // Update status
        gift.status = GiftStatus.REFUNDED;

        // Refund based on token type
        if (gift.tokenType == TokenType.ETH) {
            // Refund ETH
            (bool success, ) = gift.sender.call{value: gift.amount}("");
            require(success, "ETH refund failed");
        } else if (gift.tokenType == TokenType.ERC20) {
            // Refund ERC20
            IERC20(gift.token).safeTransfer(gift.sender, gift.amount);
        } else if (gift.tokenType == TokenType.ERC721) {
            // Refund ERC721
            IERC721(gift.token).safeTransferFrom(address(this), gift.sender, gift.tokenId);
        } else if (gift.tokenType == TokenType.ERC1155) {
            // Refund ERC1155
            IERC1155(gift.token).safeTransferFrom(address(this), gift.sender, gift.tokenId, gift.amount, "");
        }

        emit GiftRefunded(giftId, gift.sender, gift.tokenType, gift.amount);
    }

    /**
     * @notice Retrieves complete gift information
     * @dev Returns the full Gift struct. Status may be auto-updated to EXPIRED.
     * @param giftId ID of the gift to query
     * @return gift Complete gift information including status
     */
    function getGift(uint256 giftId) external view returns (Gift memory gift) {
        gift = _gifts[giftId];

        // Check if gift exists
        if (gift.sender == address(0)) revert GiftNotFound();

        // Auto-update status to EXPIRED if applicable (view function, doesn't modify state)
        if (gift.status == GiftStatus.PENDING && block.timestamp > gift.expiresAt) {
            gift.status = GiftStatus.EXPIRED;
        }
    }

    /**
     * @notice Returns the total number of gifts created
     * @return Total gift count
     */
    function getTotalGifts() external view returns (uint256) {
        return _giftIdCounter;
    }

    /**
     * @notice Checks if a gift exists
     * @param giftId ID to check
     * @return exists True if gift exists, false otherwise
     */
    function giftExists(uint256 giftId) external view returns (bool exists) {
        return _gifts[giftId].sender != address(0);
    }
}
