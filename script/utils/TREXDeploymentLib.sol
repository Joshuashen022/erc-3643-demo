// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {console} from "forge-std/console.sol";
import {Vm} from "forge-std/Vm.sol";
import {Token} from "../../lib/ERC-3643/contracts/token/Token.sol";
import {ClaimTopicsRegistry} from "../../lib/ERC-3643/contracts/registry/implementation/ClaimTopicsRegistry.sol";
import {IdentityRegistry} from "../../lib/ERC-3643/contracts/registry/implementation/IdentityRegistry.sol";
import {IdentityRegistryStorage} from "../../lib/ERC-3643/contracts/registry/implementation/IdentityRegistryStorage.sol";
import {TrustedIssuersRegistry} from "../../lib/ERC-3643/contracts/registry/implementation/TrustedIssuersRegistry.sol";
import {ModularCompliance} from "../../lib/ERC-3643/contracts/compliance/modular/ModularCompliance.sol";
import {TREXImplementationAuthority} from "../../lib/ERC-3643/contracts/proxy/authority/TREXImplementationAuthority.sol";
import {ITREXImplementationAuthority} from "../../lib/ERC-3643/contracts/proxy/authority/ITREXImplementationAuthority.sol";
import {TREXFactory} from "../../lib/ERC-3643/contracts/factory/TREXFactory.sol";
import {TREXGateway} from "../../lib/ERC-3643/contracts/factory/TREXGateway.sol";
import {IdFactory} from "../../lib/solidity/contracts/factory/IdFactory.sol";

library TREXDeploymentLib {
    struct TREXDeploymentResult {
        TREXImplementationAuthority trexImplementationAuthority;
        TREXFactory trexFactory;
        TREXGateway trexGateway;
        ITREXImplementationAuthority.Version currentVersion;
    }

    function createTREXImplementationAuthority(
        Vm vm
    ) internal returns (TREXImplementationAuthority trexImplementationAuthority, ITREXImplementationAuthority.Version memory currentVersion) {
        console.log("\n--- Deploying TREXImplementationAuthority ---");
        vm.startBroadcast();
        trexImplementationAuthority = new TREXImplementationAuthority(
            true,  // referenceStatus = true (main IA)
            address(0),  // trexFactory = address(0) initially
            address(0)   // iaFactory = address(0) initially, will be set after IAFactory deployment
        );
        vm.stopBroadcast();
        console.log("TREXImplementationAuthority deployed at:", address(trexImplementationAuthority));
        
        // Step 1.5: Deploy implementation contracts and add TREX version
        console.log("\n--- Deploying Implementation Contracts ---");
        vm.startBroadcast();
        Token tokenImplementation = new Token();
        ClaimTopicsRegistry ctrImplementation = new ClaimTopicsRegistry();
        IdentityRegistryStorage irsImplementation = new IdentityRegistryStorage();
        TrustedIssuersRegistry tirImplementation = new TrustedIssuersRegistry();
        ModularCompliance mcImplementation = new ModularCompliance();
        IdentityRegistry irImplementation = new IdentityRegistry();
        vm.stopBroadcast();
        
        console.log("Token implementation deployed at:", address(tokenImplementation));
        console.log("ClaimTopicsRegistry implementation deployed at:", address(ctrImplementation));
        console.log("IdentityRegistryStorage implementation deployed at:", address(irsImplementation));
        console.log("TrustedIssuersRegistry implementation deployed at:", address(tirImplementation));
        console.log("ModularCompliance implementation deployed at:", address(mcImplementation));
        console.log("IdentityRegistry implementation deployed at:", address(irImplementation));
        
        // Add TREX version to TREXImplementationAuthority
        console.log("\n--- Adding TREX Version ---");
        
        ITREXImplementationAuthority.Version memory version = ITREXImplementationAuthority.Version({
            major: 4,
            minor: 0,
            patch: 0
        });

        currentVersion = version;

        ITREXImplementationAuthority.TREXContracts memory trexContracts = ITREXImplementationAuthority.TREXContracts({
            tokenImplementation: address(tokenImplementation),
            ctrImplementation: address(ctrImplementation),
            irImplementation: address(irImplementation),
            irsImplementation: address(irsImplementation),
            tirImplementation: address(tirImplementation),
            mcImplementation: address(mcImplementation)
        });
        
        vm.startBroadcast();
        trexImplementationAuthority.addTREXVersion(version, trexContracts);
        vm.stopBroadcast();
        console.log("TREX version added successfully");
        
        // Activate the version so getter methods can return the implementation addresses
        vm.startBroadcast();
        trexImplementationAuthority.useTREXVersion(version);
        vm.stopBroadcast();
        console.log("TREX version activated successfully");

        require(trexImplementationAuthority.getTokenImplementation() != address(0), "Token implementation is not set");
        require(trexImplementationAuthority.getCTRImplementation() != address(0), "ClaimTopicsRegistry implementation is not set");
        require(trexImplementationAuthority.getIRImplementation() != address(0), "IdentityRegistry implementation is not set");
        require(trexImplementationAuthority.getIRSImplementation() != address(0), "IdentityRegistryStorage implementation is not set");
        require(trexImplementationAuthority.getTIRImplementation() != address(0), "TrustedIssuersRegistry implementation is not set");
        require(trexImplementationAuthority.getMCImplementation() != address(0), "ModularCompliance implementation is not set");
    }

    function deployTREXFactory(
        Vm vm,
        TREXImplementationAuthority trexImplementationAuthority,
        IdFactory idFactory,
        address deployer
    ) internal returns (TREXFactory trexFactory) {
        console.log("\n--- Deploying TREXFactory ---");
        vm.startBroadcast(deployer);
        trexFactory = new TREXFactory(
            address(trexImplementationAuthority),
            address(idFactory)
        );
        vm.stopBroadcast();
        
        vm.startBroadcast();
        idFactory.addTokenFactory(address(trexFactory));
        vm.stopBroadcast();
        
        // Set TREXFactory in TREXImplementationAuthority
        console.log("\n--- Setting TREXFactory in TREXImplementationAuthority ---");
        vm.startBroadcast();
        trexImplementationAuthority.setTREXFactory(address(trexFactory));
        vm.stopBroadcast();
        console.log("TREXFactory set in TREXImplementationAuthority");
    }

    function deployTREXGateway(
        Vm vm,
        TREXFactory trexFactory
    ) internal returns (TREXGateway trexGateway) {
        console.log("\n--- Deploying TREXGateway ---");
        vm.startBroadcast();
        trexGateway = new TREXGateway(
            address(trexFactory),
            true  // publicDeploymentStatus = true (allow public deployments)
        );
        vm.stopBroadcast();
        console.log("TREXGateway deployed at:", address(trexGateway));
    }
}

