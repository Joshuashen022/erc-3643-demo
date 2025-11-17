// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAClaimTopicsRegistry} from "../../src/rwa/IdentityRegistry.sol";

contract DeployRWAClaimTopicsRegistry is Script {
    uint256 constant CLAIM_TOPIC_KYC = 1;

    function run() external returns (RWAClaimTopicsRegistry) {
        bool addKycTopic = vm.envOr("ADD_KYC_TOPIC", true);
        
        console.log("=== Deploying RWAClaimTopicsRegistry ===");
        
        vm.startBroadcast();
        
        RWAClaimTopicsRegistry claimTopicsRegistry = new RWAClaimTopicsRegistry();
        claimTopicsRegistry.init();
        
        if (addKycTopic) {
            claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC_KYC);
            console.log("KYC claim topic added");
        }
        
        vm.stopBroadcast();
        
        console.log("RWAClaimTopicsRegistry deployed at:", address(claimTopicsRegistry));
        
        return claimTopicsRegistry;
    }
}

