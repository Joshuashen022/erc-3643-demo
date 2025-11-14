// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAClaimIssuer} from "../src/rwa/identity/Identity.sol";

contract DeployRWAClaimIssuer is Script {
    function run() external returns (RWAClaimIssuer) {

        address managementKey = msg.sender;
        address claimKeyAddress = msg.sender;
        
        uint256 purposeClaim = vm.envOr("PURPOSE_CLAIM", uint256(0));
        console.log("Purpose claim:", purposeClaim);
        uint256 keyTypeEcdsa = vm.envOr("KEY_TYPE_ECDSA", uint256(0));
        console.log("Key type ecdsa:", keyTypeEcdsa);
        
        bytes32 claimKeyHash = keccak256(abi.encode(claimKeyAddress));
        
        vm.startBroadcast();
        
        // Deploy RWAIdentity with the management key
        // This matches the pattern from RWAIdentity.t.sol: new RWAIdentity(managementKey)
        RWAClaimIssuer claimIssuer = new RWAClaimIssuer(managementKey);

        // Add the claim key to the identity
        claimIssuer.addKey(claimKeyHash, purposeClaim, keyTypeEcdsa);

        vm.stopBroadcast();
        
        // Log deployment information
        console.log("RWAClaimIssuer deployed at:", address(claimIssuer));
        console.log("Management key:", managementKey);
        
        return claimIssuer;
    }
}

