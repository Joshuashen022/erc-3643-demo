// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {console2} from "forge-std/console2.sol";
import {Vm} from "forge-std/Vm.sol";
import {TREXFactory} from "../../lib/ERC-3643/contracts/factory/TREXFactory.sol";
import {ITREXFactory} from "../../lib/ERC-3643/contracts/factory/ITREXFactory.sol";
import {TestModule} from "../../lib/ERC-3643/contracts/compliance/modular/modules/TestModule.sol";
import {RWAToken} from "../../src/rwa/RWAToken.sol";
import {RWACompliance} from "../../src/rwa/RWACompliance.sol";
import {RWAIdentityRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWAIdentityRegistryStorage} from "../../src/rwa/IdentityRegistry.sol";
import {RWATrustedIssuersRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWAClaimTopicsRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {IdentityDeploymentLib} from "./IdentityDeploymentLib.sol";

library TREXSuiteDeploymentLib {
    struct TREXSuiteResult {
        RWAToken token;
        RWACompliance compliance;
        RWAIdentityRegistry identityRegistry;
        RWAIdentityRegistryStorage identityRegistryStorage;
        RWATrustedIssuersRegistry trustedIssuersRegistry;
        RWAClaimTopicsRegistry claimTopicsRegistry;
        address suiteOwner;
    }

    function prepareClaimDetails(
        IdentityDeploymentLib.ClaimIssuerDeploymentResult[] memory claimIssuerResults
    ) public pure returns (ITREXFactory.ClaimDetails memory) {
        uint256 length = claimIssuerResults.length;
        address[] memory issuers = new address[](length);
        uint256[][] memory issuerClaims = new uint256[][](length);
        
        // Process each claim issuer
        for (uint256 i = 0; i < length; i++) {
            issuers[i] = claimIssuerResults[i].claimIssuer;
            issuerClaims[i] = claimIssuerResults[i].claimTopics;
        }
        
        // Collect claim topics (use first issuer's topics as base, typically all issuers have same topics)
        // For most use cases, all issuers will have the same claim topics (e.g., KYC)
        // todo:: if not, how to handle the case?
        uint256[] memory allClaimTopics = claimIssuerResults[0].claimTopics;

        return ITREXFactory.ClaimDetails({
            claimTopics: allClaimTopics,
            issuers: issuers,
            issuerClaims: issuerClaims
        });
    }

    function prepareTokenDetails(address suiteOwner) public returns (ITREXFactory.TokenDetails memory) {
        TestModule testModule = new TestModule();
        testModule.initialize();
        // todo:: add more compliance modules
        address[] memory complianceModules = new address[](1);
        complianceModules[0] = address(testModule);
        
        address[] memory irAgents = new address[](1);
        irAgents[0] = suiteOwner;
        address[] memory tokenAgents = new address[](1);
        tokenAgents[0] = suiteOwner;

        return ITREXFactory.TokenDetails({
            owner: suiteOwner,
            name: "TREX Token",
            symbol: "TREX",
            decimals: 18,
            irs: address(0),
            ONCHAINID: address(0),
            irAgents: irAgents,
            tokenAgents: tokenAgents,
            complianceModules: complianceModules,
            complianceSettings: new bytes[](0)
        });
    }

    function deployTREXSuite(
        Vm vm,
        TREXFactory trexFactory,
        address suiteOwner,
        ITREXFactory.ClaimDetails memory claimDetails,
        ITREXFactory.TokenDetails memory tokenDetails
    ) internal returns (TREXSuiteResult memory result) {
        bytes32 salt = keccak256(abi.encodePacked(suiteOwner, tokenDetails.name, block.timestamp));

        string memory saltString = string(abi.encodePacked(salt));
        // Deploy TREX Suite using the factory
        vm.startBroadcast(msg.sender);
        trexFactory.deployTREXSuite(saltString, tokenDetails, claimDetails);
        vm.stopBroadcast();
        
        // Get the deployed token address and initialize result
        address tokenAddress = trexFactory.getToken(saltString);
        
        result = _initializeSuiteResult(tokenAddress, result.suiteOwner);
        _displaySuiteResult(result);
    }


    function _initializeSuiteResult(address tokenAddress, address suiteOwner) private view returns (TREXSuiteResult memory result) {
        result.suiteOwner = suiteOwner;
        result.token = RWAToken(tokenAddress);
        result.compliance = RWACompliance(address(result.token.compliance()));
        result.identityRegistry = RWAIdentityRegistry(address(result.token.identityRegistry()));
        result.identityRegistryStorage = RWAIdentityRegistryStorage(address(result.identityRegistry.identityStorage()));
        result.trustedIssuersRegistry = RWATrustedIssuersRegistry(address(result.identityRegistry.issuersRegistry()));
        result.claimTopicsRegistry = RWAClaimTopicsRegistry(address(result.identityRegistry.topicsRegistry()));
    }

    function unPauseToken(
        Vm vm,
        RWAToken token,
        address tokenOwner
    ) internal {
        vm.startBroadcast(tokenOwner);
        token.unpause();
        vm.stopBroadcast();
        _displayUnpauseToken(token);
    }

    function _displaySuiteResult(TREXSuiteResult memory result) internal view {
        console2.log("Token: %s, owner: %s", address(result.token), address(result.token.owner()));
        console2.log("Compliance: %s, owner: %s", address(result.compliance), address(result.compliance.owner()));
        console2.log("Identity registry: %s, owner: %s", address(result.identityRegistry), address(result.identityRegistry.owner()));
        console2.log("Identity registry storage: %s, owner: %s", address(result.identityRegistryStorage), address(result.identityRegistryStorage.owner()));
        console2.log("Trusted issuers registry: %s, owner: %s", address(result.trustedIssuersRegistry), address(result.trustedIssuersRegistry.owner()));
        console2.log("Claim topics registry: %s, owner: %s", address(result.claimTopicsRegistry), address(result.claimTopicsRegistry.owner()));
    }

    function _displayUnpauseToken(RWAToken token) internal view {
        console2.log("Token unpaused: %s, owner: %s", address(token), address(token.owner()));
    }
}

