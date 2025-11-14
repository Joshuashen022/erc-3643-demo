// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAToken} from "../src/rwa/RWAToken.sol";

contract DeployRWAToken is Script {
    function run() external returns (RWAToken) {
        address identityRegistryAddress = vm.envOr("IDENTITY_REGISTRY_ADDRESS", address(0));
        address complianceAddress = vm.envOr("COMPLIANCE_ADDRESS", address(0));
        string memory tokenName = vm.envOr("TOKEN_NAME", string("Test Token"));
        string memory tokenSymbol = vm.envOr("TOKEN_SYMBOL", string("TT"));
        uint8 tokenDecimals = uint8(vm.envOr("TOKEN_DECIMALS", uint256(6)));
        address onchainID = vm.envOr("ONCHAIN_ID", address(0x123456));
        bool addAgent = vm.envOr("ADD_AGENT", true);
        bool unpause = vm.envOr("UNPAUSE", true);
        
        console.log("=== Deploying RWAToken ===");
        console.log("IdentityRegistry:", identityRegistryAddress);
        console.log("Compliance:", complianceAddress);
        console.log("Token Name:", tokenName);
        console.log("Token Symbol:", tokenSymbol);
        console.log("Token Decimals:", tokenDecimals);
        console.log("Onchain ID:", onchainID);
        
        require(
            identityRegistryAddress != address(0) &&
            complianceAddress != address(0),
            "IdentityRegistry and Compliance addresses must be provided"
        );
        
        vm.startBroadcast();
        
        RWAToken rwaToken = new RWAToken();
        rwaToken.init(
            identityRegistryAddress,
            complianceAddress,
            tokenName,
            tokenSymbol,
            tokenDecimals,
            onchainID
        );
        
        if (addAgent) {
            rwaToken.addAgent(msg.sender);
            console.log("Agent added to Token");
        }
        
        if (unpause) {
            rwaToken.unpause();
            console.log("Token unpaused");
        }
        
        vm.stopBroadcast();
        
        console.log("RWAToken deployed at:", address(rwaToken));
        
        return rwaToken;
    }
}

