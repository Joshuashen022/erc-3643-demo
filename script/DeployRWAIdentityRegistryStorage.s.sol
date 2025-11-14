// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAIdentityRegistryStorage} from "../src/rwa/IdentityRegistry.sol";

contract DeployRWAIdentityRegistryStorage is Script {
    function run() external returns (RWAIdentityRegistryStorage) {
        address identityRegistryAddress = vm.envOr("IDENTITY_REGISTRY_ADDRESS", address(0));
        
        console.log("=== Deploying RWAIdentityRegistryStorage ===");
        
        vm.startBroadcast();
        
        RWAIdentityRegistryStorage identityRegistryStorage = new RWAIdentityRegistryStorage();
        identityRegistryStorage.init();
        
        // Optionally bind IdentityRegistry if provided
        if (identityRegistryAddress != address(0)) {
            address storageOwner = identityRegistryStorage.owner();
            vm.prank(storageOwner);
            identityRegistryStorage.bindIdentityRegistry(identityRegistryAddress);
            console.log("IdentityRegistry bound:", identityRegistryAddress);
        }
        
        vm.stopBroadcast();
        
        console.log("RWAIdentityRegistryStorage deployed at:", address(identityRegistryStorage));
        
        return identityRegistryStorage;
    }
}

