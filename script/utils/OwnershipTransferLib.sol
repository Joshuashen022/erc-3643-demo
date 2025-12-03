// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {console2} from "forge-std/console2.sol";
import {Vm} from "forge-std/Vm.sol";
import {TREXImplementationAuthority} from "../../lib/ERC-3643/contracts/proxy/authority/TREXImplementationAuthority.sol";
import {TREXFactory} from "../../lib/ERC-3643/contracts/factory/TREXFactory.sol";
import {TREXGateway} from "../../lib/ERC-3643/contracts/factory/TREXGateway.sol";
import {IdentityDeploymentLib} from "./IdentityDeploymentLib.sol";
import {TREXSuiteDeploymentLib} from "./TREXSuiteDeploymentLib.sol";
import {ConfigReaderLib} from "./ConfigReaderLib.sol";
import {RWAToken} from "../../src/rwa/RWAToken.sol";
import {RWACompliance} from "../../src/rwa/RWACompliance.sol";
import {RWAIdentityRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWAIdentityRegistryStorage} from "../../src/rwa/IdentityRegistry.sol";
import {RWATrustedIssuersRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWAClaimTopicsRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {Ownable} from "../../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

/// @notice Interface for contracts with ownership functionality
interface IOwnable {
    function owner() external view returns (address);
    function transferOwnership(address newOwner) external;
}

library OwnershipTransferLib {
    /// @notice Transfers ownership of all deployed contracts according to OwnersConfig
    /// @param vm The Vm instance for broadcasting transactions
    /// @param identityDeployment The identity deployment result
    /// @param trexImplementationAuthority The TREX implementation authority contract
    /// @param trexFactory The TREX factory contract
    /// @param trexGateway The TREX gateway contract
    /// @param suiteResult The TREX suite deployment result
    /// @param owners The owners configuration
    function transferAllOwnerships(
        Vm vm,
        IdentityDeploymentLib.IdentityDeploymentResult memory identityDeployment,
        TREXImplementationAuthority trexImplementationAuthority,
        TREXFactory trexFactory,
        TREXGateway trexGateway,
        TREXSuiteDeploymentLib.TREXSuiteResult memory suiteResult,
        ConfigReaderLib.OwnersConfig memory owners
    ) internal {
        
        // Transfer Identity contracts ownership
        _transferOwnership(vm, address(identityDeployment.claimIssuerGateway), owners.claimIssuerGateway, "claimIssuerGateway");
        _transferOwnership(vm, address(identityDeployment.claimIssuerIdFactory), owners.claimIssuerIdFactory, "claimIssuerIdFactory");
        _transferOwnership(vm, address(identityDeployment.identityIdFactory), owners.identityIdFactory, "identityIdFactory");
        _transferOwnership(vm, address(identityDeployment.identityGateway), owners.identityGateway, "identityGateway");
        
        // Transfer TREX contracts ownership
        _transferOwnership(vm, address(trexImplementationAuthority), owners.trexImplementationAuthority, "trexImplementationAuthority");
        _transferOwnership(vm, address(trexFactory), owners.trexFactory, "trexFactory");
        _transferOwnership(vm, address(trexGateway), owners.trexGateway, "trexGateway");
        
        // Transfer TREX Suite contracts ownership
        _transferOwnership(vm, address(suiteResult.token), owners.token, "token");
        _transferOwnership(vm, address(suiteResult.identityRegistry), owners.identityRegistry, "identityRegistry");
        _transferOwnership(vm, address(suiteResult.trustedIssuersRegistry), owners.trustedIssuersRegistry, "trustedIssuersRegistry");
        _transferOwnership(vm, address(suiteResult.claimTopicsRegistry), owners.claimTopicsRegistry, "claimTopicsRegistry");
        
    }
    
    /// @notice Transfers ownership of a contract if the new owner is different from current owner
    /// @param vm The Vm instance for broadcasting transactions
    /// @param contractAddress The address of the contract to transfer ownership
    /// @param newOwner The new owner address
    /// @param contractName The name of the contract for logging
    function _transferOwnership(
        Vm vm,
        address contractAddress,
        address newOwner,
        string memory contractName
    ) private {
        if (contractAddress == address(0)) {
            console2.log("  Skipping %s: contract address is zero", contractName);
            return;
        }
        
        if (newOwner == address(0)) {
            console2.log("  Skipping %s: new owner is zero address", contractName);
            return;
        }
        
        // Get current owner using interface
        IOwnable ownableContract = IOwnable(contractAddress);
        address currentOwner = ownableContract.owner();
        
        if (currentOwner == newOwner) {
            console2.log("  Skipping %s: owner already set to %s", contractName, newOwner);
            return;
        }
        
        // Transfer ownership
        vm.startBroadcast(currentOwner);
        ownableContract.transferOwnership(newOwner);
        vm.stopBroadcast();
        
        // Verify transfer
        address verifiedOwner = ownableContract.owner();
        if (verifiedOwner == newOwner) {
            console2.log(" %s ownership transferred: %s -> %s", contractName, currentOwner, newOwner);
        } else {
            console2.log(" %s ownership transfer failed: current owner is %s, expected %s", contractName, verifiedOwner, newOwner);
        }
    }
}

