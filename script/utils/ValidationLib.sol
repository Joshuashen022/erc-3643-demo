// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {console} from "forge-std/console.sol";
import {RWAToken} from "../../src/rwa/RWAToken.sol";
import {RWACompliance} from "../../src/rwa/RWACompliance.sol";
import {RWAIdentityRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWAIdentityRegistryStorage} from "../../src/rwa/IdentityRegistry.sol";
import {RWATrustedIssuersRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWAClaimTopicsRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {TREXFactory} from "../../lib/ERC-3643/contracts/factory/TREXFactory.sol";
import {RWAIdentity} from "../../src/rwa/identity/Identity.sol";
import {RWAClaimIssuer} from "../../src/rwa/identity/Identity.sol";

library ValidationLib {
    function validateRWAModule(
        address suiteOwner,
        RWAToken token,
        RWAIdentityRegistry identityRegistry,
        RWACompliance compliance,
        RWATrustedIssuersRegistry trustedIssuersRegistry,
        RWAClaimTopicsRegistry claimTopicsRegistry,
        TREXFactory trexFactory
    ) internal view {
        // Check that suiteOwner is set
        require(suiteOwner != address(0), "Suite owner should be set");
        // Check Identity Registry agent
        require(
            identityRegistry.isAgent(suiteOwner),
            "Suite owner should be an agent of Identity Registry"
        );

        // Check Token agent
        require(
            token.isAgent(suiteOwner),
            "Suite owner should be an agent of Token"
        );
        // Check that suiteOwner is the owner of Token
        require(token.owner() == suiteOwner, "Token owner should match suite owner");
        require(identityRegistry.owner() == suiteOwner, "Identity Registry owner should match suite owner");
        require(compliance.owner() == suiteOwner, "Compliance owner should match suite owner");
        require(trustedIssuersRegistry.owner() == suiteOwner, "Trusted Issuers Registry owner should match suite owner");
        require(claimTopicsRegistry.owner() == suiteOwner, "Claim Topics Registry owner should match suite owner");
        
        // Check that suiteOwner is the owner of TREX Factory
        require(trexFactory.owner() == suiteOwner, "TREX Factory owner should match suite owner");

        console.log("Token:", address(token), "Agent", suiteOwner);
        console.log("Identity Registry:", address(identityRegistry), "Agent", suiteOwner);

        console.log("Token:", address(token), "Owner", suiteOwner);
        console.log("Identity Registry:", address(identityRegistry), "Owner", suiteOwner);
        console.log("Compliance:", address(compliance), "Owner", suiteOwner);
        console.log("Trusted Issuers Registry:", address(trustedIssuersRegistry), "Owner", suiteOwner);
        console.log("Claim Topics Registry:", address(claimTopicsRegistry), "Owner", suiteOwner);
        console.log("TREX Factory:", address(trexFactory), "Owner", suiteOwner);  
    }

    function validateIdentity(
        RWAIdentityRegistry identityRegistry,
        address identityManagementKey,
        address claimIssuerManagementKey,
        address identity,
        address claimIssuer
    ) internal view {
        // Check that identityManagementKey is set
        require(identityManagementKey != address(0), "Identity management key should be set");
        // Check that claimIssuerManagementKey is set
        require(claimIssuerManagementKey != address(0), "ClaimIssuer management key should be set");

        // Check that managementKey is a management key of Identity (purpose = 1)
        require(
            RWAIdentity(identity).keyHasPurpose(keccak256(abi.encode(identityManagementKey)), 1),
            "Management key should be a management key of Identity"
        );

        // Check that managementKey is a management key of ClaimIssuer (purpose = 1)
        require(
            RWAClaimIssuer(claimIssuer).keyHasPurpose(keccak256(abi.encode(claimIssuerManagementKey)), 1),
            "Management key should be a management key of ClaimIssuer"
        );

        console.log("Identity:", identity, "Management Key", identityManagementKey);
        console.log("ClaimIssuer:", claimIssuer, "Management Key", claimIssuerManagementKey);

        require(identityRegistry.isVerified(identityManagementKey), "Identity is not verified");
        console.log("Identity is verified", identityManagementKey);
    }
}

