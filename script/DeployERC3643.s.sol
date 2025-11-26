// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
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
import {VmSafe} from "forge-std/Vm.sol";

contract DeployERC3643 is Script {
    string public salt = "trex-suite-1";
    address public suiteOwner = vm.envOr("SUITE_OWNER", msg.sender);
    uint256 public claimIssuerPrivateKey = vm.envOr("CLAIM_ISSUER_PRIVATE_KEY", uint256(0));
    uint256 public identityPrivateKey = vm.envOr("IDENTITY_PRIVATE_KEY", uint256(0));
    uint256 claimTopicKyc = vm.envOr("CLAIM_TOPIC_KYC", uint256(1));
    uint256 country = vm.envOr("COUNTRY_CODE", uint256(840));
    uint256 claimSchemeEcdsa = 1;
    uint256 purposeClaim = 3;
    uint256 keyTypeEcdsa = 1;

    // TREX factory contracts
    TREXImplementationAuthority public trexImplementationAuthority;
    TREXFactory public trexFactory;
    TREXGateway public trexGateway;

    // RWA Identity contracts
    IdentityDeploymentLib.IdentityDeploymentResult public identityDeployment;

    // TREX Suite contracts
    TREXSuiteDeploymentLib.TREXSuiteResult public suiteResult;

    ITREXImplementationAuthority.Version public currentVersion;
    address public identity;
    address public claimIssuer;

    function run() external {
        console.log("=== Deploying RWA Identity Factories ===");
        identityDeployment = IdentityDeploymentLib.deployAllIdentityContracts(vm, msg.sender);
        
        VmSafe.Wallet memory claimIssuerWallet = vm.createWallet(claimIssuerPrivateKey);
        VmSafe.Wallet memory identityWallet = vm.createWallet(identityPrivateKey);
        // Initialize ClaimIssuer
        claimIssuer = IdentityDeploymentLib.initializeClaimIssuer(
            vm,
            identityDeployment.claimIssuerIdFactory,
            claimIssuerWallet.addr,
            identityWallet.addr,
            purposeClaim,
            keyTypeEcdsa
        );
        
        console.log("\n=== Deploying ERC3643 and Related Contracts ===");
        
        // Step 1: Deploy TREXImplementationAuthority
        // For reference contract, trexFactory is set to address(0) initially, will be set after factory deployment
        // iaFactory is set to address(0) initially, will be set after IAFactory deployment
        (trexImplementationAuthority, currentVersion) = TREXDeploymentLib.createTREXImplementationAuthority(vm);
        
        // Step 2: Deploy TREXFactory
        // Requires implementationAuthority and idFactory
        trexFactory = TREXDeploymentLib.deployTREXFactory(
            vm,
            trexImplementationAuthority,
            identityDeployment.idFactory,
            msg.sender
        );

        // Step 3: Deploy TREX Suite using TREXFactory
        // This deploys Token, IdentityRegistry, IdentityRegistryStorage, TrustedIssuersRegistry,
        // ClaimTopicsRegistry, and ModularCompliance in one transaction
        console.log("\n--- Deploying TREX Suite via TREXFactory ---");
        suiteResult = TREXSuiteDeploymentLib.deployTREXSuite(
            vm,
            trexFactory,
            salt,
            claimIssuer,
            msg.sender,
            // todo::test if suiteOwner is not deployer, how to handle the case?
            suiteOwner
        );
        
        // Step 4: Deploy TREXGateway
        // Requires factory address and publicDeploymentStatus
        // The gateway wraps the factory
        trexGateway = TREXDeploymentLib.deployTREXGateway(vm, trexFactory);
        
        console.log("\n=== Initializing an identity ===");
        identity = IdentityInitializationLib.initializeIdentity(
            vm,
            identityDeployment.identityIdFactory,
            suiteResult.identityRegistry,
            identityWallet.addr,
            claimIssuerWallet.addr,
            claimIssuerWallet.privateKey,
            claimTopicKyc,
            claimSchemeEcdsa,
            purposeClaim,
            keyTypeEcdsa,
            claimIssuer,
            country,
            msg.sender
        );
        
        // Validate agent initialization
        console.log("\n=== Validating ===");
        validate(
            claimIssuerWallet.addr,
            identityWallet.addr
        );
        console.log("Validation passed");

        // Unpause the token after deployment
        console.log("\n--- Unpausing Token ---");
        TREXSuiteDeploymentLib.unPauseToken(vm, trexFactory, salt, suiteOwner);
        console.log("Token unpaused successfully");
    }
    function validate(
        address claimIssuerManagementKey,
        address identityManagementKey
    ) internal view {
        ValidationLib.validateRWAModule(
            suiteOwner,
            suiteResult.token,
            suiteResult.identityRegistry,
            suiteResult.compliance,
            suiteResult.trustedIssuersRegistry,
            suiteResult.claimTopicsRegistry,
            trexFactory
        );
        ValidationLib.validateIdentity(suiteResult.identityRegistry, identityManagementKey, claimIssuerManagementKey, identity, claimIssuer);
        require(suiteResult.identityRegistry.isVerified(identityManagementKey), "Identity is not verified");
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

