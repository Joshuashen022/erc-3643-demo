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
import {ConfigReaderLib} from "./utils/ConfigReaderLib.sol";
import {RWAIdentityIdFactory, RWAIdentityGateway} from "../src/rwa/proxy/RWAIdentityIdFactory.sol";
import {RWAClaimIssuerIdFactory, RWAClaimIssuerGateway} from "../src/rwa/proxy/RWAClaimIssuerIdFactory.sol";
import {ITREXFactory} from "../lib/ERC-3643/contracts/factory/ITREXFactory.sol";
import {VmSafe} from "forge-std/Vm.sol";
import {DeploymentResultSerializerLib} from "./utils/DeploymentResultSerializerLib.sol";
import {OwnershipTransferLib} from "./utils/OwnershipTransferLib.sol";

contract DeployERC3643 is Script {
    // Deployment configuration
    ConfigReaderLib.DeploymentConfig public deploymentConfig;

    // TREX factory contracts
    TREXFactory public trexFactory;
    TREXGateway public trexGateway;
    TREXImplementationAuthority public trexImplementationAuthority;

    // RWA Identity contracts
    IdentityDeploymentLib.IdentityDeploymentResult public identityDeployment;

    // TREX Suite contracts
    TREXSuiteDeploymentLib.TREXSuiteResult public suiteResult;

    ITREXImplementationAuthority.Version public currentVersion;

    // Batch claim issuer initialization result
    IdentityDeploymentLib.ClaimIssuerDeploymentResult[] claimIssuers;

    function run() external {
        // Read configuration from config.json at the beginning
        console2.log("\n===============================Reading deployment configuration===========================\n");
        ConfigReaderLib.readConfig(vm, msg.sender, deploymentConfig);

        // Deploy Identity contracts
        console2.log("\n===============================Deploying Identity contracts================================\n");
        identityDeployment = IdentityDeploymentLib.deployAllIdentityContracts(vm, msg.sender);

        // Create TREX implementation authority
        console2.log("\n===============================Creating TREX implementation authority=======================\n");
        (trexImplementationAuthority, currentVersion) = TREXDeploymentLib.createTREXImplementationAuthority(vm);

        // Deploy TREXFactory
        console2.log("\n===============================Deploying TREXFactory========================================\n");
        trexFactory = TREXDeploymentLib.deployTREXFactory(
            vm, trexImplementationAuthority, identityDeployment.identityIdFactory, msg.sender
        );

        // Initialize ClaimIssuers
        console2.log(
            "\n===============================Initializing ClaimIssuers======================================\n"
        );
        IdentityDeploymentLib.ClaimIssuerDeploymentResult[] memory claimIssuerResults =
            IdentityDeploymentLib.initializeClaimIssuer(vm, identityDeployment.claimIssuerIdFactory, deploymentConfig);

        // Prepare claim details
        for (uint256 i = 0; i < claimIssuerResults.length; i++) {
            claimIssuers.push(claimIssuerResults[i]);
        }

        console2.log("\n===============================Preparing claim details======================================\n");
        ITREXFactory.ClaimDetails memory claimDetails =
            TREXSuiteDeploymentLib.prepareClaimDetails(vm, claimIssuerResults, deploymentConfig);
        ITREXFactory.TokenDetails memory tokenDetails =
            TREXSuiteDeploymentLib.prepareTokenDetails(vm, deploymentConfig, msg.sender);
        suiteResult =
            TREXSuiteDeploymentLib.deployTREXSuite(vm, trexFactory, deploymentConfig, claimDetails, tokenDetails);

        console2.log("\n===============================Deploying TREX Gateway=======================================\n");
        trexGateway = TREXDeploymentLib.deployTREXGateway(vm, trexFactory);

        console2.log(
            "\n===============================Transferring contract ownerships==============================\n"
        );
        OwnershipTransferLib.transferAllOwnerships(
            vm,
            identityDeployment,
            trexImplementationAuthority,
            trexFactory,
            trexGateway,
            suiteResult,
            deploymentConfig.owners
        );

        console2.log(
            "\n===============================Serializing deployment results================================\n"
        );
        DeploymentResultSerializerLib.serializeAndWriteDeploymentResults(
            trexFactory,
            trexGateway,
            trexImplementationAuthority,
            identityDeployment,
            suiteResult,
            currentVersion,
            claimIssuers
        );
        console2.log("Contract is paused, unpause it by calling unpause() function with agent role");
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

    function getClaimIssuers() external view returns (IdentityDeploymentLib.ClaimIssuerDeploymentResult[] memory) {
        return claimIssuers;
    }

    function getClaimIssuer(uint256 index)
        external
        view
        returns (IdentityDeploymentLib.ClaimIssuerDeploymentResult memory)
    {
        require(index < claimIssuers.length, "ClaimIssuer index out of bounds");
        return claimIssuers[index];
    }
}

