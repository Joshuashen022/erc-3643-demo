// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeployERC3643} from "../../script/DeployERC3643.s.sol";
import {IdentityDeploymentLib} from "../../script/utils/IdentityDeploymentLib.sol";
import {
    TREXImplementationAuthority
} from "../../lib/ERC-3643/contracts/proxy/authority/TREXImplementationAuthority.sol";
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
import {
    RWAIdentityRegistryStorage,
    RWATrustedIssuersRegistry,
    RWAClaimTopicsRegistry
} from "../../src/rwa/IdentityRegistry.sol";

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

    RWAIdentity public identity;
    address public identityManagementKey;
    address public suiteOwner;

    // All claim issuers arrays
    IdentityDeploymentLib.ClaimIssuerDeploymentResult[] public allClaimIssuers;
    RWAClaimIssuer[] public allClaimIssuerContracts;

    /// @notice Common setup function that should be called in child contracts' setUp
    function setUpBase() internal {
        deployScript = new DeployERC3643();
        deployScript.run();

        // TREX factory contracts
        trexImplementationAuthority = deployScript.trexImplementationAuthority();
        trexFactory = deployScript.trexFactory();
        trexGateway = deployScript.trexGateway();

        // RWA Identity contracts
        (,,,, identityIdFactory, identityGateway, claimIssuerIdFactory, claimIssuerGateway) =
            deployScript.identityDeployment();

        (rwaToken, compliance, identityRegistry, identityRegistryStorage, trustedIssuersRegistry, claimTopicsRegistry) =
            deployScript.suiteResult();

        // Get all claimIssuers from deployment script
        require(deployScript.getClaimIssuers().length > 0, "No claim issuers deployed");

        IdentityDeploymentLib.ClaimIssuerDeploymentResult[] memory claimIssuerResults = deployScript.getClaimIssuers();

        // Store all claim issuers
        for (uint256 i = 0; i < claimIssuerResults.length; i++) {
            require(claimIssuerResults[i].claimIssuer != address(0), "ClaimIssuer address is zero");
            allClaimIssuers.push(claimIssuerResults[i]);
            allClaimIssuerContracts.push(RWAClaimIssuer(claimIssuerResults[i].claimIssuer));
        }

        // Set suiteOwner to the actual token owner (from deployment config)
        // This ensures suiteOwner matches the configured owner
        suiteOwner = rwaToken.owner();

        identityManagementKey = address(0xDEAD);

        identity = initializeIdentity(identityManagementKey, "testIdentity");

        // Setup token agent and unpause token
        _setupTokenAgentAndUnpause();
    }

    /// @notice Setup token agent and unpause the token if it's paused
    function _setupTokenAgentAndUnpause() internal {
        // Check if suiteOwner is already an agent
        if (!identityRegistry.isAgent(suiteOwner)) {
            // Add suiteOwner as agent (requires owner permission)
            // Use the actual owner of identityRegistry to add agent
            address registryOwner = identityRegistry.owner();
            vm.prank(registryOwner);
            identityRegistry.addAgent(suiteOwner);
        }

        // Check if token is paused and unpause if needed
        if (rwaToken.paused()) {
            vm.prank(suiteOwner);
            rwaToken.unpause();
        }
    }

    /// @notice Create a new OnChainID and register it to identity registry
    /// @param newIdentityManagementKey The management key for the new identity
    /// @param identityName The name of the identity
    /// @return The initialized RWAIdentity contract
    function initializeIdentity(address newIdentityManagementKey, string memory identityName)
        public
        returns (RWAIdentity)
    {
        require(allClaimIssuers.length > 0, "No claim issuers available");

        // Create new identity
        vm.prank(identityIdFactory.owner());
        address newIdentity = identityIdFactory.createIdentity(newIdentityManagementKey, identityName);

        // Add claims for each issuer's each topic
        bytes memory data = "";
        _addAllClaimsToIdentity(newIdentity, newIdentityManagementKey, data);

        // Register new identity
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(newIdentityManagementKey, IIdentity(address(newIdentity)), 840);
        return RWAIdentity(newIdentity);
    }

    /// @notice Helper function to add all claims from all issuers to an identity
    /// @param newIdentity The identity contract address
    /// @param newIdentityManagementKey The management key for the identity
    /// @param data The claim data (can be empty)
    function _addAllClaimsToIdentity(address newIdentity, address newIdentityManagementKey, bytes memory data)
        internal
    {
        require(allClaimIssuers.length > 0, "No claim issuers available");

        for (uint256 i = 0; i < allClaimIssuers.length; i++) {
            IdentityDeploymentLib.ClaimIssuerDeploymentResult memory issuer = allClaimIssuers[i];
            require(issuer.claimIssuerPrivateKey != 0, "CLAIM_ISSUER_PRIVATE_KEY must be set");

            // Add claim for each topic of this issuer
            for (uint256 j = 0; j < issuer.claimTopics.length; j++) {
                uint256 topic = issuer.claimTopics[j];
                _addClaimWithIssuer(
                    newIdentity, newIdentityManagementKey, topic, issuer.claimIssuerPrivateKey, issuer.claimIssuer, data
                );
            }
        }
    }

    /// @notice Internal helper function to sign and add a single claim
    /// @param newIdentity The identity contract address
    /// @param newIdentityManagementKey The management key for the identity
    /// @param topic The claim topic
    /// @param issuerPrivateKey The private key of the claim issuer for signing
    /// @param issuerAddress The address of the claim issuer
    /// @param data The claim data
    function _addClaimWithIssuer(
        address newIdentity,
        address newIdentityManagementKey,
        uint256 topic,
        uint256 issuerPrivateKey,
        address issuerAddress,
        bytes memory data
    ) internal {
        uint256 claimSchemeEcdsa = 1;
        bytes32 dataHash = keccak256(abi.encode(newIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(issuerPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        vm.prank(newIdentityManagementKey);
        RWAIdentity(newIdentity).addClaim(topic, claimSchemeEcdsa, issuerAddress, sig, data, "");
    }
}

