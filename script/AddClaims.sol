// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAIdentity} from "../src/rwa/identity/Identity.sol";
import {RWAClaimIssuer} from "../src/rwa/identity/Identity.sol";
import {DeployRWAClaimIssuer} from "./utils/DeployRWAClaimIssuer.s.sol";
import {DeployRWAIdentity} from "./utils/DeployRWAIdentity.s.sol";

contract AddClaims is Script {
    uint256 constant PURPOSE_CLAIM = 3;
    uint256 constant KEY_TYPE_ECDSA = 1;
    uint256 constant CLAIM_TOPIC_KYC = 1;
    uint256 constant CLAIM_SCHEME_ECDSA = 1;
    DeployRWAClaimIssuer deployClaimIssuer = new DeployRWAClaimIssuer();
    DeployRWAIdentity deployRWAIdentity = new DeployRWAIdentity();

    function addKycClaim(
        RWAIdentity identity,
        address claimKeyAddress,
        address claimIssuerAddress,
        uint256 claimKeyPrivateKey
    ) internal {
        // IIdentity claimIdentity = IIdentity(address(identity));
        bytes memory data = "";
        bytes32 dataHash = keccak256(abi.encode(identity, CLAIM_TOPIC_KYC, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        identity.addClaim(CLAIM_TOPIC_KYC, CLAIM_SCHEME_ECDSA, claimIssuerAddress, sig, data, "");
        console.log("KYC claim added to Identity");
    }

    function run() external returns (RWAIdentity) {
        address managementKey = vm.envOr("MANAGEMENT_KEY", msg.sender);
        address claimKeyAddress = vm.envOr("CLAIM_KEY_ADDRESS", msg.sender);
        uint256 claimKeyPrivateKey = vm.envOr("CLAIM_KEY_PRIVATE_KEY", uint256(0));
        
        console.log("=== Deploying RWAIdentity ===");
        console.log("Management Key:", managementKey);
        console.log("Claim Key Address:", claimKeyAddress);

        if (claimKeyPrivateKey == uint256(0)) {
            revert("CLAIM_KEY_PRIVATE_KEY is required");
        }
        
        bytes32 claimKeyHash = keccak256(abi.encode(claimKeyAddress));
                
        RWAIdentity identity = deployRWAIdentity.run();
        RWAClaimIssuer claimIssuer = deployClaimIssuer.run();
        
        vm.startBroadcast(managementKey);

        // Add KYC claim using the deployed claim issuer
        addKycClaim(identity, claimKeyAddress, address(claimIssuer), claimKeyPrivateKey);
   
        vm.stopBroadcast();
        
        console.log("RWAIdentity deployed at:", address(identity));
        
        return identity;
    }
}

