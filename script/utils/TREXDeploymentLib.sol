// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {console2} from "forge-std/console2.sol";
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
        vm.startBroadcast();
        trexImplementationAuthority = new TREXImplementationAuthority(
            true,  // referenceStatus = true (main IA)
            address(0),  // trexFactory = address(0) initially
            address(0)   // iaFactory = address(0) initially, will be set after IAFactory deployment
        );
        vm.stopBroadcast();
        
        vm.startBroadcast();
        Token tokenImplementation = new Token();
        ClaimTopicsRegistry ctrImplementation = new ClaimTopicsRegistry();
        IdentityRegistryStorage irsImplementation = new IdentityRegistryStorage();
        TrustedIssuersRegistry tirImplementation = new TrustedIssuersRegistry();
        ModularCompliance mcImplementation = new ModularCompliance();
        IdentityRegistry irImplementation = new IdentityRegistry();
        vm.stopBroadcast();
        
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
        
        // Activate the version so getter methods can return the implementation addresses
        vm.startBroadcast();
        trexImplementationAuthority.useTREXVersion(version);
        vm.stopBroadcast();
        _displayTREXImplementationAuthority(trexImplementationAuthority);
        _displayCurrentVersion(version);
    }

    function deployTREXFactory(
        Vm vm,
        TREXImplementationAuthority trexImplementationAuthority,
        IdFactory idFactory,
        address deployer
    ) internal returns (TREXFactory trexFactory) {
        vm.startBroadcast(deployer);
        trexFactory = new TREXFactory(
            address(trexImplementationAuthority),
            address(idFactory)
        );
        vm.stopBroadcast();
        
        vm.startBroadcast();
        idFactory.addTokenFactory(address(trexFactory));
        trexImplementationAuthority.setTREXFactory(address(trexFactory));
        vm.stopBroadcast();
        _displayTREXFactory(trexFactory);
    }

    function deployTREXGateway(
        Vm vm,
        TREXFactory trexFactory
    ) internal returns (TREXGateway trexGateway) {
        vm.startBroadcast();
        trexGateway = new TREXGateway(
            address(trexFactory),
            true  // publicDeploymentStatus = true (allow public deployments)
        );
        vm.stopBroadcast();
        _displayTREXGateway(trexGateway);
    }

    function _displayTREXImplementationAuthority(TREXImplementationAuthority trexImplementationAuthority) internal view {
        console2.log("TREX implementation authority: %s, owner: %s", address(trexImplementationAuthority), address(trexImplementationAuthority.owner()));
    }
    
    function _displayTREXFactory(TREXFactory trexFactory) internal view {
        console2.log("TREX factory: %s, owner: %s", address(trexFactory), address(trexFactory.owner()));
    }

    function _displayTREXGateway(TREXGateway trexGateway) internal view {
        console2.log("TREX gateway: %s, owner: %s", address(trexGateway), address(trexGateway.owner()));
    }

    function _displayCurrentVersion(ITREXImplementationAuthority.Version memory currentVersion) internal view {
        console2.log("Current version: major: %s, minor: %s, patch: %s", uint256(currentVersion.major), uint256(currentVersion.minor), uint256(currentVersion.patch));
    }
}

