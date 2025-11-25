// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {console} from "forge-std/console.sol";
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

    function deployTREXSuite(
        Vm vm,
        TREXFactory trexFactory,
        string memory salt,
        address claimIssuer,
        address deployer
    ) internal returns (TREXSuiteResult memory result) {
        result.suiteOwner = deployer;
        console.log("Suite owner (msg.sender):", result.suiteOwner);

        // Prepare deployment details
        ITREXFactory.TokenDetails memory tokenDetails = _prepareTokenDetails(result.suiteOwner);
        ITREXFactory.ClaimDetails memory claimDetails = _prepareClaimDetails(claimIssuer);
        
        // Deploy TREX Suite using the factory
        vm.startBroadcast(deployer);
        trexFactory.deployTREXSuite(salt, tokenDetails, claimDetails);
        vm.stopBroadcast();
        
        // Get the deployed token address and initialize result
        address tokenAddress = trexFactory.getToken(salt);
        console.log("TREX Suite deployed successfully");
        console.log("Token deployed at:", tokenAddress);
        console.log("Salt used:", salt);

        result = _initializeSuiteResult(tokenAddress, result.suiteOwner);
    }

    function _prepareTokenDetails(address suiteOwner) private returns (ITREXFactory.TokenDetails memory) {
        TestModule testModule = new TestModule();
        testModule.initialize();
        
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

    function _prepareClaimDetails(address claimIssuer) private pure returns (ITREXFactory.ClaimDetails memory) {
        uint256 claimTopicKyc = 1;
        uint256[] memory claimTopics = new uint256[](1);
        claimTopics[0] = claimTopicKyc;
        address[] memory issuers = new address[](1);
        issuers[0] = claimIssuer;
        uint256[][] memory issuerClaims = new uint256[][](1);
        issuerClaims[0] = new uint256[](1);
        issuerClaims[0][0] = claimTopicKyc;

        return ITREXFactory.ClaimDetails({
            claimTopics: claimTopics,
            issuers: issuers,
            issuerClaims: issuerClaims
        });
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
        TREXFactory trexFactory,
        string memory salt,
        address suiteOwner
    ) internal {
        address tokenAddress = trexFactory.getToken(salt);

        vm.startBroadcast(suiteOwner);
        RWAToken(tokenAddress).unpause();
        vm.stopBroadcast();
    }
}

