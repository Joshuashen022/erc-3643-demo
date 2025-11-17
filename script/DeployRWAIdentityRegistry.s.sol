// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAIdentityRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAIdentityRegistryStorage} from "../src/rwa/IdentityRegistry.sol";
import {RWATrustedIssuersRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAClaimTopicsRegistry} from "../src/rwa/IdentityRegistry.sol";

import {DeployRWATrustedIssuersRegistry} from "./utils/DeployRWATrustedIssuersRegistry.s.sol";
import {DeployRWAClaimTopicsRegistry} from "./utils/DeployRWAClaimTopicsRegistry.s.sol";
import {DeployRWAIdentityRegistryStorage} from "./utils/DeployRWAIdentityRegistryStorage.s.sol";

contract DeployRWAIdentityRegistry is Script {
    function run() external returns (RWAIdentityRegistry) {
        DeployRWAClaimTopicsRegistry deployClaimTopics = new DeployRWAClaimTopicsRegistry();
        RWAClaimTopicsRegistry claimTopicsRegistry = deployClaimTopics.run();
        
        DeployRWATrustedIssuersRegistry deployTrustedIssuers = new DeployRWATrustedIssuersRegistry();
        RWATrustedIssuersRegistry trustedIssuersRegistry = deployTrustedIssuers.run();
        
        DeployRWAIdentityRegistryStorage deployStorage = new DeployRWAIdentityRegistryStorage();
        RWAIdentityRegistryStorage identityRegistryStorage = deployStorage.run();
        console.log("=== Deploying RWAIdentityRegistry ===");
        vm.startBroadcast();
        
        RWAIdentityRegistry identityRegistry = new RWAIdentityRegistry();
        
        // Bind IdentityRegistry to IdentityRegistryStorage
        identityRegistryStorage.bindIdentityRegistry(address(identityRegistry));
        console.log("IdentityRegistry bound to IdentityRegistryStorage");
        
        // Initialize IdentityRegistry
        identityRegistry.init(
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry),
            address(identityRegistryStorage)
        );
        
        vm.stopBroadcast();
        
        console.log("RWAIdentityRegistry deployed at:", address(identityRegistry));
        
        return identityRegistry;
    }
}

