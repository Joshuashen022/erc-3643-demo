// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAClaimIssuer} from "../../src/rwa/identity/Identity.sol";

contract DeployRWAClaimIssuer is Script {
    function run() external returns (RWAClaimIssuer) {

        address managementKey = vm.envOr("MANAGEMENT_KEY", msg.sender);
        address claimKeyAddress = vm.envOr("CLAIM_KEY_ADDRESS", msg.sender);
        
        uint256 purposeClaim = vm.envOr("PURPOSE_CLAIM", uint256(0));
        console.log("Purpose claim:", purposeClaim);
        uint256 keyTypeEcdsa = vm.envOr("KEY_TYPE_ECDSA", uint256(0));
        console.log("Key type ecdsa:", keyTypeEcdsa);
        
        bytes32 claimKeyHash = keccak256(abi.encode(claimKeyAddress));
        
        // Use managementKey as the broadcast sender so msg.sender will be managementKey
        // This ensures addKey() can be called by the management key
        vm.startBroadcast(managementKey);
        
        // Deploy RWAIdentity with the management key
        // This matches the pattern from RWAIdentity.t.sol: new RWAIdentity(managementKey)
        RWAClaimIssuer claimIssuer = new RWAClaimIssuer(managementKey);

        // Add the claim key to the identity
        // msg.sender is already managementKey because of vm.startBroadcast(managementKey)
        claimIssuer.addKey(claimKeyHash, purposeClaim, keyTypeEcdsa);

        vm.stopBroadcast();
        
        // Log deployment information
        console.log("RWAClaimIssuer deployed at:", address(claimIssuer));
        console.log("Management key:", managementKey);
        
        return claimIssuer;
    }
}

