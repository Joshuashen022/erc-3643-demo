// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console2} from "forge-std/Script.sol";
import {TREXImplementationAuthority} from "../lib/ERC-3643/contracts/proxy/authority/TREXImplementationAuthority.sol";
import {ITREXImplementationAuthority} from "../lib/ERC-3643/contracts/proxy/authority/ITREXImplementationAuthority.sol";
import {TREXFactory} from "../lib/ERC-3643/contracts/factory/TREXFactory.sol";
import {TREXGateway} from "../lib/ERC-3643/contracts/factory/TREXGateway.sol";
import {IdentityDeploymentLib} from "./utils/IdentityDeploymentLib.sol";
import {TREXDeploymentLib} from "./utils/TREXDeploymentLib.sol";
import {TREXSuiteDeploymentLib} from "./utils/TREXSuiteDeploymentLib.sol";
import {IdentityInitializationLib} from "./utils/IdentityInitializationLib.sol";
import {ValidationLib} from "./utils/ValidationLib.sol";
import {RWAIdentityIdFactory, RWAIdentityGateway} from "../src/rwa/proxy/RWAIdentityIdFactory.sol";
import {RWAClaimIssuerIdFactory, RWAClaimIssuerGateway} from "../src/rwa/proxy/RWAClaimIssuerIdFactory.sol";
import {ITREXFactory} from "../lib/ERC-3643/contracts/factory/ITREXFactory.sol";
import {VmSafe} from "forge-std/Vm.sol";

contract DeployERC3643 is Script {
    address public suiteOwner = vm.envOr("SUITE_OWNER", msg.sender);

    // TREX factory contracts
    TREXImplementationAuthority public trexImplementationAuthority;
    TREXFactory public trexFactory;
    TREXGateway public trexGateway;

    // RWA Identity contracts
    IdentityDeploymentLib.IdentityDeploymentResult public identityDeployment;

    // TREX Suite contracts
    TREXSuiteDeploymentLib.TREXSuiteResult public suiteResult;

    ITREXImplementationAuthority.Version public currentVersion;
    
    // Batch claim issuer initialization result
    IdentityDeploymentLib.ClaimIssuerDeploymentResult[] claimIssuers;

    function run() external {
        // Deploy Identity contracts
        console2.log("\n===============================Deploying Identity contracts================================\n");
        identityDeployment = IdentityDeploymentLib.deployAllIdentityContracts(vm, msg.sender);

        // Create TREX implementation authority
        console2.log("\n===============================Creating TREX implementation authority=======================\n");
        (trexImplementationAuthority, currentVersion) = TREXDeploymentLib.createTREXImplementationAuthority(vm);

        // Deploy TREXFactory
        console2.log("\n===============================Deploying TREXFactory========================================\n");
        trexFactory = TREXDeploymentLib.deployTREXFactory(
            vm,
            trexImplementationAuthority,
            identityDeployment.identityIdFactory,
            msg.sender
        );

        // Initialize ClaimIssuers
        console2.log("\n===============================Initializing ClaimIssuers======================================\n");
        IdentityDeploymentLib.ClaimIssuerDeploymentResult[] memory claimIssuerResults = IdentityDeploymentLib.initializeClaimIssuer(
            vm,
            identityDeployment.claimIssuerIdFactory
        );

        // Prepare claim details
        for (uint256 i = 0; i < claimIssuerResults.length; i++) {
            claimIssuers.push(claimIssuerResults[i]);
        }

        console2.log("\n===============================Preparing claim details======================================\n");
        ITREXFactory.ClaimDetails memory claimDetails = TREXSuiteDeploymentLib.prepareClaimDetails(claimIssuerResults);
        ITREXFactory.TokenDetails memory tokenDetails = TREXSuiteDeploymentLib.prepareTokenDetails(suiteOwner);
        suiteResult = TREXSuiteDeploymentLib.deployTREXSuite(
            vm,
            trexFactory,
            suiteOwner,
            claimDetails,
            tokenDetails
        );
        
        console2.log("\n===============================Deploying TREX Gateway======================================\n");
        trexGateway = TREXDeploymentLib.deployTREXGateway(vm, trexFactory);

        console2.log("\n===============================Unpausing token============================================\n");
        TREXSuiteDeploymentLib.unPauseToken(vm, suiteResult.token, suiteOwner);
    }

    function validate() internal view {
        ValidationLib.validateRWAModule(
            suiteOwner,
            suiteResult.token,
            suiteResult.identityRegistry,
            suiteResult.compliance,
            suiteResult.trustedIssuersRegistry,
            suiteResult.claimTopicsRegistry,
            trexFactory
        );
        // todo:: validate claim issuers
    }

    function identityIdFactory() external view returns (RWAIdentityIdFactory) {
        return identityDeployment.identityIdFactory;
    }
    
    function identityGateway() external view returns (RWAIdentityGateway) {
        return identityDeployment.identityGateway;
    }

    function claimIssuerIdFactory() external view returns (RWAClaimIssuerIdFactory) {
        return identityDeployment.claimIssuerIdFactory;
    }

    function claimIssuerGateway() external view returns (RWAClaimIssuerGateway) {
        return identityDeployment.claimIssuerGateway;
    }
    
}

