// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAIdentity} from "../src/rwa/identity/Identity.sol";

contract DeployRWAIdentity is Script {
    function run() external returns (RWAIdentity) {

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
        RWAIdentity identity = new RWAIdentity(managementKey);

        // Add the claim key to the identity
        identity.addKey(claimKeyHash, purposeClaim, keyTypeEcdsa);

        vm.stopBroadcast();
        
        // Log deployment information
        console.log("RWAIdentity deployed at:", address(identity));
        console.log("Management key:", managementKey);
        
        return identity;
    }
}

