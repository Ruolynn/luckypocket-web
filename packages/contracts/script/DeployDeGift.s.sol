// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DeGift.sol";

/**
 * @title DeployDeGift
 * @notice Deployment script for DeGift contract
 * @dev Deploy with: forge script script/DeployDeGift.s.sol:DeployDeGift --rpc-url $RPC_URL --broadcast --verify
 */
contract DeployDeGift is Script {
    function setUp() public {}

    function run() public {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Get deployer address for logging
        address deployer = vm.addr(deployerPrivateKey);

        console.log("===========================================");
        console.log("Deploying DeGift Contract");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("-------------------------------------------");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy DeGift contract (no constructor parameters needed)
        DeGift deGift = new DeGift();

        // Stop broadcasting
        vm.stopBroadcast();

        console.log("-------------------------------------------");
        console.log("DeGift deployed at:", address(deGift));
        console.log("===========================================");
        console.log("");
        console.log("Next steps:");
        console.log("1. Verify contract on BaseScan");
        console.log("2. Test basic functionality");
        console.log("3. Update contract address in documentation");
        console.log("");
        console.log("Verify command:");
        console.log("forge verify-contract", address(deGift), "src/DeGift.sol:DeGift --chain-id", block.chainid);
        console.log("===========================================");

        // Log deployment info (writeFile disabled due to permissions)
        console.log("");
        console.log("Deployment Summary:");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Contract:", address(deGift));
        console.log("Block:", block.number);
        console.log("Timestamp:", block.timestamp);
        console.log("");
        console.log("Save this information for your records!");
    }
}
