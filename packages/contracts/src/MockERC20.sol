// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
    constructor(
        string memory name_,
        string memory symbol_,
        address initialRecipient,
        uint256 initialSupply
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        if (initialRecipient != address(0) && initialSupply > 0) {
            _mint(initialRecipient, initialSupply);
        }
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}


