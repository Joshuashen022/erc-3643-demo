// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeployERC3643} from "../../script/DeployERC3643.s.sol";
import {TREXImplementationAuthority} from "../../lib/ERC-3643/contracts/proxy/authority/TREXImplementationAuthority.sol";
import {TREXFactory} from "../../lib/ERC-3643/contracts/factory/TREXFactory.sol";
import {TREXGateway} from "../../lib/ERC-3643/contracts/factory/TREXGateway.sol";
import {IIdentity} from "../../lib/solidity/contracts/interface/IIdentity.sol";
import {IClaimIssuer} from "../../lib/solidity/contracts/interface/IClaimIssuer.sol";
import {RWAIdentityIdFactory, RWAIdentityGateway} from "../../src/rwa/proxy/RWAIdentityIdFactory.sol";
import {RWAClaimIssuerIdFactory, RWAClaimIssuerGateway} from "../../src/rwa/proxy/RWAClaimIssuerIdFactory.sol";

import {RWAClaimIssuer, RWAIdentity} from "../../src/rwa/identity/Identity.sol";
import {RWAIdentityRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWACompliance} from "../../src/rwa/RWACompliance.sol";
import {RWAToken} from "../../src/rwa/RWAToken.sol";
import {RWAIdentityRegistryStorage, RWATrustedIssuersRegistry, RWAClaimTopicsRegistry} from "../../src/rwa/IdentityRegistry.sol";

/// @title ERC3643TestBase
/// @notice Base test contract containing common setup and utilities for ERC3643 tests
abstract contract ERC3643TestBase is Test {
    DeployERC3643 public deployScript;

    TREXImplementationAuthority public trexImplementationAuthority;
    TREXFactory public trexFactory;
    TREXGateway public trexGateway;
    RWAIdentityIdFactory public identityIdFactory;
    RWAIdentityGateway public identityGateway;
    RWAClaimIssuerIdFactory public claimIssuerIdFactory;
    RWAClaimIssuerGateway public claimIssuerGateway;

    RWAToken internal rwaToken;
    RWACompliance internal compliance;
    RWAIdentityRegistry internal identityRegistry;
    // IdentityRegistry-related variables
    RWAIdentityRegistryStorage internal identityRegistryStorage;
    RWATrustedIssuersRegistry internal trustedIssuersRegistry;
    RWAClaimTopicsRegistry internal claimTopicsRegistry;
    
    RWAClaimIssuer public claimIssuer;
    RWAIdentity public identity;
    address public identityManagementKey;
    uint256 public claimIssuerPrivateKey;
    address public claimIssuerManagementKey;
    address public suiteOwner;

    /// @notice Common setup function that should be called in child contracts' setUp
    function setUpBase() internal {
        deployScript = new DeployERC3643();
        deployScript.run();
        
        // TREX factory contracts
        trexImplementationAuthority = deployScript.trexImplementationAuthority();
        trexFactory = deployScript.trexFactory();
        trexGateway = deployScript.trexGateway();

        // RWA Identity contracts
        (
            ,,,, 
            identityIdFactory,
            identityGateway, 
            claimIssuerIdFactory, 
            claimIssuerGateway
        ) = deployScript.identityDeployment();
        
        (
            rwaToken, 
            compliance, 
            identityRegistry, 
            identityRegistryStorage, 
            trustedIssuersRegistry, 
            claimTopicsRegistry,
            suiteOwner
        ) = deployScript.suiteResult();

        // Get claimIssuer from environment variable
        claimIssuerPrivateKey = vm.envOr("CLAIM_ISSUER_PRIVATE_KEY", uint256(0));
        require(claimIssuerPrivateKey != 0, "CLAIM_ISSUER_PRIVATE_KEY must be set");
        claimIssuerManagementKey = vm.addr(claimIssuerPrivateKey);
        claimIssuer = RWAClaimIssuer(claimIssuerIdFactory.getIdentity(claimIssuerManagementKey));
        require(address(claimIssuer) != address(0), "ClaimIssuer not found");

        identityManagementKey = address(0xDEAD);
        identity = initializeIdentity(identityManagementKey, "testIdentity");
    }
    
    /// @notice Create a new OnChainID and register it to identity registry
    /// @param newIdentityManagementKey The management key for the new identity
    /// @param identityName The name of the identity
    /// @return The initialized RWAIdentity contract
    function initializeIdentity(address newIdentityManagementKey, string memory identityName) public returns (RWAIdentity) {
        uint256 claimTopicKyc = 1;
        uint256 claimSchemeEcdsa = 1;
        // Use the same private key as the deployment script for signing claims
        uint256 claimKeyPrivateKey = claimIssuerPrivateKey;
        require(claimKeyPrivateKey != 0, "CLAIM_ISSUER_PRIVATE_KEY must be set");

        // Create new identity
        vm.prank(identityIdFactory.owner());
        address newIdentity = identityIdFactory.createIdentity(newIdentityManagementKey, identityName);
        
        // Add claimIssuer's signature to new identity
        bytes memory data = "";
        bytes32 dataHash = keccak256(abi.encode(newIdentity, claimTopicKyc, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        vm.prank(newIdentityManagementKey);
        RWAIdentity(newIdentity).addClaim(claimTopicKyc, claimSchemeEcdsa, address(claimIssuer), sig, data, "");
        
        // Register new identity
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(newIdentityManagementKey, IIdentity(address(newIdentity)), 840);
        return RWAIdentity(newIdentity);
    }

    /// @notice Helper function to add a claim to an identity
    function _addClaimToIdentity(
        address newIdentity,
        address newIdentityManagementKey,
        uint256 topic,
        bytes memory data
    ) internal {
        uint256 claimSchemeEcdsa = 1;
        uint256 claimKeyPrivateKey = claimIssuerPrivateKey;
        bytes32 dataHash = keccak256(abi.encode(newIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        vm.prank(newIdentityManagementKey);
        RWAIdentity(newIdentity).addClaim(topic, claimSchemeEcdsa, address(claimIssuer), sig, data, "");
    }

    /// @notice Register identity with multiple claim topics
    /// @param newIdentityManagementKey The management key for the new identity
    /// @param identityName The name of the identity
    /// @param topics Array of claim topics to add
    /// @param dataArray Array of data for each topic (can be empty strings)
    /// @return The initialized RWAIdentity contract
    function initializeIdentityWithTopics(
        address newIdentityManagementKey,
        string memory identityName,
        uint256[] memory topics,
        bytes[] memory dataArray
    ) public returns (RWAIdentity) {
        require(claimIssuerPrivateKey != 0, "CLAIM_ISSUER_PRIVATE_KEY must be set");
        require(topics.length == dataArray.length, "Topics and data arrays must have same length");

        // Create new identity
        vm.prank(identityIdFactory.owner());
        address newIdentity = identityIdFactory.createIdentity(newIdentityManagementKey, identityName);

        // Add claims for each topic
        for (uint256 i = 0; i < topics.length; i++) {
            _addClaimToIdentity(newIdentity, newIdentityManagementKey, topics[i], dataArray[i]);
        }

        // Update trusted issuers registry to require all topics
        vm.prank(suiteOwner);
        trustedIssuersRegistry.updateIssuerClaimTopics(IClaimIssuer(address(claimIssuer)), topics);

        // Register new identity
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(newIdentityManagementKey, IIdentity(address(newIdentity)), 840);
        return RWAIdentity(newIdentity);
    }

}

