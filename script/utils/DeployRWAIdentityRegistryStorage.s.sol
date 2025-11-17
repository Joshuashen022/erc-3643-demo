// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAIdentityRegistryStorage} from "../../src/rwa/IdentityRegistry.sol";

contract DeployRWAIdentityRegistryStorage is Script {
    function run() external returns (RWAIdentityRegistryStorage) {
        console.log("=== Deploying RWAIdentityRegistryStorage ===");
        
        vm.startBroadcast();
        
        RWAIdentityRegistryStorage identityRegistryStorage = new RWAIdentityRegistryStorage();
        identityRegistryStorage.init();
        
        vm.stopBroadcast();
        
        console.log("RWAIdentityRegistryStorage deployed at:", address(identityRegistryStorage));
        
        return identityRegistryStorage;
    }
}

