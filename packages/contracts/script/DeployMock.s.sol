// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract DeployMock is Script {
    function run() public {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        string memory name_ = vm.envOr("MOCK_NAME", string("Sepolia Test Token"));
        string memory symbol_ = vm.envOr("MOCK_SYMBOL", string("sETH"));
        address mintTo = vm.envAddress("MINT_TO");
        uint256 mintAmount = vm.envOr("MINT_AMOUNT", uint256(1_000_000 * 1e18));

        vm.startBroadcast(pk);
        MockERC20 token = new MockERC20(name_, symbol_, mintTo, mintAmount);
        console.log("MockERC20 deployed:", address(token));
        console.log("Minted to:", mintTo);
        console.log("Amount:", mintAmount);
        vm.stopBroadcast();
    }
}


