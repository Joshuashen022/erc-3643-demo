// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAIdentityRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAIdentityRegistryStorage} from "../src/rwa/IdentityRegistry.sol";
import {RWATrustedIssuersRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAClaimTopicsRegistry} from "../src/rwa/IdentityRegistry.sol";

contract DeployRWAIdentityRegistry is Script {
    function run() external returns (RWAIdentityRegistry) {
        address trustedIssuersRegistryAddress = vm.envOr("TRUSTED_ISSUERS_REGISTRY_ADDRESS", address(0));
        address claimTopicsRegistryAddress = vm.envOr("CLAIM_TOPICS_REGISTRY_ADDRESS", address(0));
        address identityRegistryStorageAddress = vm.envOr("IDENTITY_REGISTRY_STORAGE_ADDRESS", address(0));
        address storageOwner = vm.envOr("STORAGE_OWNER", address(0));
        
        console.log("=== Deploying RWAIdentityRegistry ===");
        console.log("TrustedIssuersRegistry:", trustedIssuersRegistryAddress);
        console.log("ClaimTopicsRegistry:", claimTopicsRegistryAddress);
        console.log("IdentityRegistryStorage:", identityRegistryStorageAddress);
        
        require(
            trustedIssuersRegistryAddress != address(0) &&
            claimTopicsRegistryAddress != address(0) &&
            identityRegistryStorageAddress != address(0),
            "All registry addresses must be provided"
        );
        
        vm.startBroadcast();
        
        RWAIdentityRegistry identityRegistry = new RWAIdentityRegistry();
        
        // Bind IdentityRegistry to IdentityRegistryStorage if storage owner is provided
        if (storageOwner != address(0)) {
            RWAIdentityRegistryStorage identityStorage = RWAIdentityRegistryStorage(identityRegistryStorageAddress);
            vm.prank(storageOwner);
            identityStorage.bindIdentityRegistry(address(identityRegistry));
            console.log("IdentityRegistry bound to IdentityRegistryStorage");
        }
        
        // Initialize IdentityRegistry
        identityRegistry.init(
            trustedIssuersRegistryAddress,
            claimTopicsRegistryAddress,
            identityRegistryStorageAddress
        );
        
        vm.stopBroadcast();
        
        console.log("RWAIdentityRegistry deployed at:", address(identityRegistry));
        
        return identityRegistry;
    }
}

