// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWACompliance} from "../../src/rwa/Compliance.sol";

contract DeployRWACompliance is Script {
    function run() external returns (RWACompliance) {
        console.log("=== Deploying RWACompliance ===");
        
        vm.startBroadcast();
        
        RWACompliance compliance = new RWACompliance();
        compliance.init();
        
        vm.stopBroadcast();
        
        console.log("RWACompliance deployed at:", address(compliance));
        
        return compliance;
    }
}

