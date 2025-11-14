// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWATrustedIssuersRegistry} from "../src/rwa/IdentityRegistry.sol";

contract DeployRWATrustedIssuersRegistry is Script {
    function run() external returns (RWATrustedIssuersRegistry) {
        console.log("=== Deploying RWATrustedIssuersRegistry ===");
        
        vm.startBroadcast();
        
        RWATrustedIssuersRegistry trustedIssuersRegistry = new RWATrustedIssuersRegistry();
        trustedIssuersRegistry.init();
        
        vm.stopBroadcast();
        
        console.log("RWATrustedIssuersRegistry deployed at:", address(trustedIssuersRegistry));
        
        return trustedIssuersRegistry;
    }
}

