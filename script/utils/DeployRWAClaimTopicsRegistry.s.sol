// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAClaimTopicsRegistry} from "../../src/rwa/IdentityRegistry.sol";

contract DeployRWAClaimTopicsRegistry is Script {
    uint256 public claimTopicKyc = vm.envOr("CLAIM_TOPIC_KYC", uint256(1));
    bool public addKycTopic = vm.envOr("ADD_KYC_TOPIC", true);

    function run() external returns (RWAClaimTopicsRegistry) {
        console.log("Claim topic KYC:", claimTopicKyc);
        console.log("Add KYC topic:", addKycTopic);
        
        console.log("=== Deploying RWAClaimTopicsRegistry ===");
        
        vm.startBroadcast();
        
        RWAClaimTopicsRegistry claimTopicsRegistry = new RWAClaimTopicsRegistry();
        claimTopicsRegistry.init();
        
        if (addKycTopic) {
            claimTopicsRegistry.addClaimTopic(claimTopicKyc);
            console.log("KYC claim topic added");
        }
        
        vm.stopBroadcast();
        
        console.log("RWAClaimTopicsRegistry deployed at:", address(claimTopicsRegistry));
        
        return claimTopicsRegistry;
    }
}

