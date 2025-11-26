// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {console} from "forge-std/console.sol";
import {Vm} from "forge-std/Vm.sol";
import {RWAIdentity, RWAClaimIssuer} from "../../src/rwa/identity/Identity.sol";
import {RWAIdentityIdFactory} from "../../src/rwa/proxy/RWAIdentityIdFactory.sol";
import {RWAIdentityRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {IIdentity} from "../../lib/solidity/contracts/interface/IIdentity.sol";

library IdentityInitializationLib {
    function initializeIdentity(
        Vm vm,
        RWAIdentityIdFactory identityIdFactory,
        RWAIdentityRegistry identityRegistry,
        address identityManagementKey,
        address claimIssuerManagementKey,
        uint256 claimKeyPrivateKey,
        uint256 claimTopicKyc,
        uint256 claimSchemeEcdsa,
        uint256 purposeClaim,
        uint256 keyTypeEcdsa,
        address claimIssuer,
        uint256 country,
        address deployer
    ) internal returns (address identity) {
        if (claimKeyPrivateKey == uint256(0)) {
            revert("CLAIM_KEY_PRIVATE_KEY is required");
        }
        
        // Create identity
        vm.startBroadcast();
        identity = identityIdFactory.createIdentity(identityManagementKey, "identity1");
        vm.stopBroadcast();
        
        // Add key and claim
        _addKeyAndClaim(
            vm,
            identity,
            identityManagementKey,
            claimIssuerManagementKey,
            claimKeyPrivateKey,
            claimTopicKyc,
            claimSchemeEcdsa,
            purposeClaim,
            keyTypeEcdsa,
            claimIssuer
        );
        
        // Register identity
        vm.startBroadcast(deployer);
        identityRegistry.registerIdentity(identityManagementKey, IIdentity(address(identity)), uint16(country));
        vm.stopBroadcast();
    }

    function _addKeyAndClaim(
        Vm vm,
        address identity,
        address identityKey,
        address claimIssuerManagementKey,
        uint256 claimIssuerPrivateKey,
        uint256 claimTopicKyc,
        uint256 claimSchemeEcdsa,
        uint256 purposeClaim,
        uint256 keyTypeEcdsa,
        address claimIssuer
    ) private {
        bytes32 claimKeyHash = keccak256(abi.encode(identityKey));
        // console.log("Adding ClaimIssuer key to ClaimIssuer");
        // vm.startBroadcast(claimIssuerManagementKey);
        // RWAClaimIssuer(claimIssuer).addKey(claimKeyHash, purposeClaim, keyTypeEcdsa);
        // console.log("ClaimIssuer key added successfully");
        // vm.stopBroadcast();
        
        // Add key
        vm.startBroadcast(identityKey);
        console.log("Adding Identity key to Identity");
        RWAIdentity(identity).addKey(claimKeyHash, purposeClaim, keyTypeEcdsa);
        console.log("Identity key added successfully");
        // Generate signature
        bytes memory sig = _generateSignature(vm, identity, claimTopicKyc, claimIssuerPrivateKey);
        
        // Add claim
        bytes memory data = "";
        RWAIdentity(identity).addClaim(claimTopicKyc, claimSchemeEcdsa, claimIssuer, sig, data, "");
        console.log("KYC claim added to Identity");

        vm.stopBroadcast();
    }

    function _generateSignature(
        Vm vm,
        address identity,
        uint256 claimTopicKyc,
        uint256 claimIssuerPrivateKey
    ) private returns (bytes memory) {
        bytes memory data = "";
        bytes32 dataHash = keccak256(abi.encode(identity, claimTopicKyc, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimIssuerPrivateKey, prefixedHash);
        return abi.encodePacked(r, s, v);
    }
}

