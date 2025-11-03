// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {RedPacket} from "../src/RedPacket.sol";
import {MockERC20} from "../src/MockERC20.sol";

/**
 * @title RedPacketTest
 * @dev 红包合约完整测试套件
 * 覆盖：创建、领取、退款、手续费、VRF随机数、边界条件、错误场景
 */
contract RedPacketTest is Test {
    RedPacket public redPacket;
    MockERC20 public token;

    address public owner;
    address public feeCollector;
    address public user1;
    address public user2;
    address public user3;

    // VRF 测试参数（使用模拟地址）
    address public mockVrfCoordinator;
    bytes32 public mockKeyHash = bytes32(uint256(1));
    uint64 public mockSubscriptionId = 1;

    // 常量
    uint256 public constant INITIAL_BALANCE = 10000 * 10**6; // 10000 USDC (6 decimals)
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%

    event PacketCreated(
        bytes32 indexed packetId,
        address indexed creator,
        address indexed token,
        uint256 totalAmount,
        uint32 count,
        bool isRandom,
        uint256 expireTime
    );

    event PacketClaimed(
        bytes32 indexed packetId,
        address indexed claimer,
        uint256 amount,
        uint32 remainingCount
    );

    event PacketRefunded(
        bytes32 indexed packetId,
        address indexed creator,
        uint256 refundedAmount
    );

    function setUp() public {
        // 设置测试账户
        owner = address(this);
        feeCollector = makeAddr("feeCollector");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");

        // 部署测试代币
        token = new MockERC20("Test USDC", "USDC", address(0), 0);

        // 部署红包合约（开发模式，允许手动填充随机数）
        mockVrfCoordinator = makeAddr("vrfCoordinator");
        vm.mockCall(
            mockVrfCoordinator,
            abi.encodeWithSignature("requestRandomWords(bytes32,uint64,uint16,uint32,uint32)"),
            abi.encode(uint256(1))
        );

        redPacket = new RedPacket(
            feeCollector,
            mockVrfCoordinator,
            mockKeyHash,
            mockSubscriptionId,
            true // devMode = true
        );

        // 给用户铸造代币
        token.mint(user1, INITIAL_BALANCE);
        token.mint(user2, INITIAL_BALANCE);
        token.mint(user3, INITIAL_BALANCE);

        // 用户授权合约
        vm.prank(user1);
        token.approve(address(redPacket), type(uint256).max);
        vm.prank(user2);
        token.approve(address(redPacket), type(uint256).max);
        vm.prank(user3);
        token.approve(address(redPacket), type(uint256).max);
    }

    /*//////////////////////////////////////////////////////////////
                            基础功能测试
    //////////////////////////////////////////////////////////////*/

    function test_Deployment() public view {
        assertEq(redPacket.owner(), owner);
        assertEq(redPacket.feeCollector(), feeCollector);
        assertEq(redPacket.devMode(), true);
        assertEq(redPacket.PLATFORM_FEE_BPS(), PLATFORM_FEE_BPS);
    }

    function test_CreateFixedPacket() public {
        uint256 totalAmount = 1000 * 10**6; // 1000 USDC
        uint32 count = 10;
        uint256 duration = 1 days;
        bytes32 salt = bytes32(uint256(1));

        uint256 balanceBefore = token.balanceOf(user1);
        uint256 feeBalanceBefore = token.balanceOf(feeCollector);

        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        // 计算预期的 packetId
        bytes32 expectedPacketId = keccak256(abi.encodePacked(user1, block.timestamp, salt));

        emit PacketCreated(
            expectedPacketId,
            user1,
            address(token),
            totalAmount,
            count,
            false, // isRandom
            block.timestamp + duration
        );

        bytes32 packetId = redPacket.createPacket(
            address(token),
            totalAmount,
            count,
            false, // 固定金额
            duration,
            salt
        );

        // 验证红包信息
        (
            address creator,
            address tokenAddr,
            uint256 totalAmt,
            uint256 remainingAmt,
            uint32 totalCount,
            uint32 remainingCnt,
            uint256 expireTime,
            bool isRandom,
            bool refunded,
            bool randomReady
        ) = redPacket.packets(packetId);

        assertEq(creator, user1);
        assertEq(tokenAddr, address(token));

        // 验证金额：totalAmt 是原始金额，remainingAmt 是扣除手续费后的净金额
        uint256 fee = (totalAmount * PLATFORM_FEE_BPS) / 10000;
        uint256 netAmount = totalAmount - fee;

        assertEq(totalAmt, totalAmount, "Total amount should be original amount");
        assertEq(remainingAmt, netAmount, "Remaining amount should be net amount");
        assertEq(totalCount, count);
        assertEq(remainingCnt, count);
        assertEq(expireTime, block.timestamp + duration);
        assertEq(isRandom, false);
        assertEq(refunded, false);
        assertEq(randomReady, true); // 固定金额，立即就绪

        // 验证余额变化（user1 支付了 totalAmount，包含手续费）
        assertEq(token.balanceOf(user1), balanceBefore - totalAmount);
        // 合约收到了 netAmount（totalAmount - fee），feeCollector 收到了 fee
        assertEq(token.balanceOf(feeCollector), feeBalanceBefore + fee);
    }

    function test_CreateRandomPacket() public {
        uint256 totalAmount = 1000 * 10**6;
        uint32 count = 5;
        uint256 duration = 1 days;
        bytes32 salt = bytes32(uint256(2));

        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            totalAmount,
            count,
            true, // 随机金额
            duration,
            salt
        );

        (, , , , , , , bool isRandom, , bool randomReady) = redPacket.packets(packetId);

        assertEq(isRandom, true);
        assertEq(randomReady, false); // 随机金额，需要等待 VRF 回调
    }

    function test_ClaimFixedPacket() public {
        // 创建固定金额红包
        uint256 totalAmount = 1000 * 10**6;
        uint32 count = 10;

        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            totalAmount,
            count,
            false,
            1 days,
            bytes32(uint256(3))
        );

        // 计算每份金额
        uint256 fee = (totalAmount * PLATFORM_FEE_BPS) / 10000;
        uint256 netAmount = totalAmount - fee;
        uint256 perAmount = netAmount / count;

        // user2 领取
        uint256 balanceBefore = token.balanceOf(user2);

        vm.prank(user2);
        vm.expectEmit(true, true, false, true);
        emit PacketClaimed(packetId, user2, perAmount, count - 1);

        uint256 claimedAmount = redPacket.claimPacket(packetId);

        assertEq(claimedAmount, perAmount);
        assertEq(token.balanceOf(user2), balanceBefore + perAmount);

        // 验证领取记录
        (address claimer, uint256 amount, uint256 timestamp) = redPacket.claims(packetId, user2);
        assertEq(claimer, user2);
        assertEq(amount, perAmount);
        assertEq(timestamp, block.timestamp);

        // 验证剩余份数
        (, , , , , uint32 remainingCount, , , ,) = redPacket.packets(packetId);
        assertEq(remainingCount, count - 1);
    }

    function test_ClaimRandomPacket_WithDevModeFill() public {
        // 创建随机金额红包
        uint256 totalAmount = 1000 * 10**6;
        uint32 count = 5;

        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            totalAmount,
            count,
            true, // 随机
            1 days,
            bytes32(uint256(4))
        );

        // 计算净金额
        uint256 fee = (totalAmount * PLATFORM_FEE_BPS) / 10000;
        uint256 netAmount = totalAmount - fee;

        // Owner 手动填充随机数（开发模式）
        // 生成随机金额数组
        uint256[] memory amounts = new uint256[](count);
        uint256 remaining = netAmount;
        for (uint32 i = 0; i < count - 1; i++) {
            amounts[i] = (netAmount * (i + 1)) / (count * count); // 简单分配
            remaining -= amounts[i];
        }
        amounts[count - 1] = remaining; // 最后一份取剩余

        redPacket.fulfillRandomForPacket(packetId, amounts);

        // 验证随机数已就绪
        (, , , , , , , , , bool randomReady) = redPacket.packets(packetId);
        assertEq(randomReady, true);

        // 依次领取所有份额
        uint256 totalClaimed = 0;
        address[5] memory users = [user1, user2, user3, makeAddr("user4"), makeAddr("user5")];

        for (uint i = 0; i < count; i++) {
            vm.prank(users[i]);
            uint256 amount = redPacket.claimPacket(packetId);
            totalClaimed += amount;
            assertTrue(amount > 0, "Claimed amount should be greater than 0");
        }

        // 验证总额守恒
        assertEq(totalClaimed, netAmount);
    }

    function test_RevertWhen_ClaimingTwice() public {
        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            1000 * 10**6,
            10,
            false,
            1 days,
            bytes32(uint256(5))
        );

        vm.prank(user2);
        redPacket.claimPacket(packetId);

        // 第二次领取应该失败
        vm.prank(user2);
        vm.expectRevert("Already claimed");
        redPacket.claimPacket(packetId);
    }

    function test_RevertWhen_ClaimingExpiredPacket() public {
        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            1000 * 10**6,
            10,
            false,
            1 hours,
            bytes32(uint256(6))
        );

        // 快进时间到过期后
        vm.warp(block.timestamp + 2 hours);

        vm.prank(user2);
        vm.expectRevert("Packet expired");
        redPacket.claimPacket(packetId);
    }

    function test_RevertWhen_ClaimingEmptyPacket() public {
        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            1000 * 10**6,
            2,
            false,
            1 days,
            bytes32(uint256(7))
        );

        // user2 和 user3 领取完所有份额
        vm.prank(user2);
        redPacket.claimPacket(packetId);

        vm.prank(user3);
        redPacket.claimPacket(packetId);

        // user1 尝试领取应该失败
        vm.prank(user1);
        vm.expectRevert("Packet empty");
        redPacket.claimPacket(packetId);
    }

    function test_Refund() public {
        uint256 totalAmount = 1000 * 10**6;
        uint32 count = 10;

        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            totalAmount,
            count,
            false,
            1 hours,
            bytes32(uint256(8))
        );

        // user2 领取一份
        vm.prank(user2);
        uint256 claimedAmount = redPacket.claimPacket(packetId);

        // 快进到过期
        vm.warp(block.timestamp + 2 hours);

        // 计算预期退款金额
        uint256 fee = (totalAmount * PLATFORM_FEE_BPS) / 10000;
        uint256 netAmount = totalAmount - fee;
        uint256 expectedRefund = netAmount - claimedAmount;

        uint256 balanceBefore = token.balanceOf(user1);

        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit PacketRefunded(packetId, user1, expectedRefund);

        redPacket.refund(packetId);

        assertEq(token.balanceOf(user1), balanceBefore + expectedRefund);

        // 验证 refunded 标记
        (, , , , , , , , bool refunded,) = redPacket.packets(packetId);
        assertEq(refunded, true);
    }

    function test_RevertWhen_RefundBeforeExpiry() public {
        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            1000 * 10**6,
            10,
            false,
            1 days,
            bytes32(uint256(9))
        );

        vm.prank(user1);
        vm.expectRevert("Not expired");
        redPacket.refund(packetId);
    }

    function test_RevertWhen_RefundByNonCreator() public {
        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            1000 * 10**6,
            10,
            false,
            1 hours,
            bytes32(uint256(10))
        );

        vm.warp(block.timestamp + 2 hours);

        vm.prank(user2);
        vm.expectRevert("Not creator");
        redPacket.refund(packetId);
    }

    function test_PlatformFeeCalculation() public {
        uint256 totalAmount = 10000 * 10**6; // 10000 USDC
        uint256 expectedFee = (totalAmount * PLATFORM_FEE_BPS) / 10000; // 100 USDC = 100000000
        uint256 expectedNet = totalAmount - expectedFee; // 9900 USDC = 9900000000

        uint256 feeBalanceBefore = token.balanceOf(feeCollector);

        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            totalAmount,
            100,
            false,
            1 days,
            bytes32(uint256(11))
        );

        // 验证手续费收取
        assertEq(token.balanceOf(feeCollector), feeBalanceBefore + expectedFee, "Fee should be 1% of total");

        // 验证红包金额：totalAmount 存储原始金额，remainingAmount 存储净金额
        (, , uint256 totalAmt, uint256 remainingAmt, , , , , ,) = redPacket.packets(packetId);
        assertEq(totalAmt, totalAmount, "Total amount should be original amount");
        assertEq(remainingAmt, expectedNet, "Remaining amount should be net amount (99% of total)");
    }

    function test_IsPacketReady() public {
        // 固定金额红包立即就绪
        vm.prank(user1);
        bytes32 fixedPacketId = redPacket.createPacket(
            address(token),
            1000 * 10**6,
            10,
            false,
            1 days,
            bytes32(uint256(12))
        );
        assertTrue(redPacket.isPacketReady(fixedPacketId));

        // 随机金额红包需要等待
        vm.prank(user1);
        bytes32 randomPacketId = redPacket.createPacket(
            address(token),
            1000 * 10**6,
            10,
            true,
            1 days,
            bytes32(uint256(13))
        );
        assertFalse(redPacket.isPacketReady(randomPacketId));

        // 手动填充后就绪
        uint256[] memory amounts = new uint256[](10);
        uint256 fee = (1000 * 10**6 * PLATFORM_FEE_BPS) / 10000;
        uint256 netAmount = 1000 * 10**6 - fee;
        uint256 remaining = netAmount;
        for (uint i = 0; i < 9; i++) {
            amounts[i] = netAmount / 10;
            remaining -= amounts[i];
        }
        amounts[9] = remaining; // 最后一份取剩余，确保总和正确
        redPacket.fulfillRandomForPacket(randomPacketId, amounts);
        assertTrue(redPacket.isPacketReady(randomPacketId));
    }

    function test_GetPacketInfo() public {
        uint256 totalAmount = 1000 * 10**6;
        uint32 count = 10;
        uint256 duration = 1 days;

        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            totalAmount,
            count,
            false,
            duration,
            bytes32(uint256(14))
        );

        (
            address creator,
            address tokenAddr,
            uint256 totalAmt,
            uint32 totalCount,
            uint32 remainingCount,
            uint256 expireTime,
            bool isRandom
        ) = redPacket.getPacketInfo(packetId);

        assertEq(creator, user1);
        assertEq(tokenAddr, address(token));
        assertTrue(totalAmt > 0);
        assertEq(totalCount, count);
        assertEq(remainingCount, count);
        assertEq(expireTime, block.timestamp + duration);
    }

    /*//////////////////////////////////////////////////////////////
                            边界条件测试
    //////////////////////////////////////////////////////////////*/

    function test_SingleClaimPacket() public {
        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            100 * 10**6,
            1, // 只有1份
            false,
            1 days,
            bytes32(uint256(15))
        );

        vm.prank(user2);
        uint256 amount = redPacket.claimPacket(packetId);

        assertTrue(amount > 0);

        (, , , , , uint32 remainingCount, , , ,) = redPacket.packets(packetId);
        assertEq(remainingCount, 0);
    }

    function test_MaxCountPacket() public {
        // 给 user1 铸造足够的代币（200份 * 10 USDC每份 = 2000 USDC）
        uint256 largeAmount = 2000 * 10**6;
        token.mint(user1, largeAmount);

        vm.prank(user1);
        bytes32 packetId = redPacket.createPacket(
            address(token),
            largeAmount, // 足够大的金额
            200, // 最大份数
            false,
            1 days,
            bytes32(uint256(16))
        );

        (, , , , , uint32 remainingCount, , , ,) = redPacket.packets(packetId);
        assertEq(remainingCount, 200);
    }
}
