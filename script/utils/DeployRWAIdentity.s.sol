// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAIdentity} from "../../src/rwa/identity/Identity.sol";

contract DeployRWAIdentity is Script {
    address public managementKey = vm.envOr("MANAGEMENT_KEY", msg.sender);
    address public claimKeyAddress = vm.envOr("CLAIM_KEY_ADDRESS", msg.sender);
    uint256 public purposeClaim = vm.envOr("PURPOSE_CLAIM", uint256(0));
    uint256 public keyTypeEcdsa = vm.envOr("KEY_TYPE_ECDSA", uint256(0));

    function run() external returns (RWAIdentity) {
        console.log("Management key:", managementKey);
        console.log("Claim key address:", claimKeyAddress);
        console.log("Purpose claim:", purposeClaim);
        console.log("Key type ecdsa:", keyTypeEcdsa);
        
        bytes32 claimKeyHash = keccak256(abi.encode(claimKeyAddress));
        
        // Use managementKey as the broadcast sender so msg.sender will be managementKey
        // This ensures addKey() can be called by the management key
        vm.startBroadcast(managementKey);
        
        // Deploy RWAIdentity with the management key
        // This matches the pattern from RWAIdentity.t.sol: new RWAIdentity(managementKey)
        RWAIdentity identity = new RWAIdentity(managementKey);

        // Add the claim key to the identity
        // msg.sender is already managementKey because of vm.startBroadcast(managementKey)
        identity.addKey(claimKeyHash, purposeClaim, keyTypeEcdsa);

        vm.stopBroadcast();
        
        // Log deployment information
        console.log("RWAIdentity deployed at:", address(identity));
        console.log("Management key:", managementKey);
        
        return identity;
    }
}

