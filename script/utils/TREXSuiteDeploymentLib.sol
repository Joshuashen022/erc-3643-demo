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
import {ConfigReaderLib} from "./ConfigReaderLib.sol";
import {IdentityRegistryStorageProxy} from "../../lib/ERC-3643/contracts/proxy/IdentityRegistryStorageProxy.sol";

library TREXSuiteDeploymentLib {
    struct TREXSuiteResult {
        RWAToken token;
        RWACompliance compliance;
        RWAIdentityRegistry identityRegistry;
        RWAIdentityRegistryStorage identityRegistryStorage;
        RWATrustedIssuersRegistry trustedIssuersRegistry;
        RWAClaimTopicsRegistry claimTopicsRegistry;
    }

    /// @notice Reads claim topics from environment variable CLAIM_TOPICS with default comma delimiter
    /// @param vm The Vm instance for reading environment variables
    /// @return claimTopics Array of claim topics parsed from environment variable
    /// @dev Environment variable format: "1,2,3" for comma-separated topics
    function readClaimTopicsFromEnv(
        Vm vm
    ) public view returns (uint256[] memory claimTopics) {
        claimTopics = vm.envUint("CLAIM_TOPICS", ",");
    }

    function prepareClaimDetails(
        Vm vm,
        IdentityDeploymentLib.ClaimIssuerDeploymentResult[] memory claimIssuerResults,
        ConfigReaderLib.DeploymentConfig memory config
    ) public pure returns (ITREXFactory.ClaimDetails memory) {
        uint256 length = claimIssuerResults.length;
        address[] memory issuers = new address[](length);
        uint256[][] memory issuerClaims = new uint256[][](length);
        
        // Process each claim issuer
        for (uint256 i = 0; i < length; i++) {
            issuers[i] = claimIssuerResults[i].claimIssuer;
            issuerClaims[i] = claimIssuerResults[i].claimTopics;
        }

        return ITREXFactory.ClaimDetails({
            claimTopics: config.claimTopics,
            issuers: issuers,
            issuerClaims: issuerClaims
        });
    }

    function prepareTokenDetails(
        Vm vm,
        ConfigReaderLib.DeploymentConfig memory config,
        address tokenOwner
    ) public returns (ITREXFactory.TokenDetails memory) {
        
        vm.startBroadcast(msg.sender);
        TestModule testModule = new TestModule();
        testModule.initialize();
        vm.stopBroadcast();
        
        // todo:: add more compliance modules
        address[] memory complianceModules = new address[](1);
        complianceModules[0] = address(testModule);

        return ITREXFactory.TokenDetails({
            owner: tokenOwner,
            name: config.tokenName,
            symbol: config.tokenSymbol,
            decimals: config.tokenDecimals,
            irs: config.irs,
            ONCHAINID: config.onchainId,
            irAgents: config.irAgents,
            tokenAgents: config.tokenAgents,
            complianceModules: complianceModules,
            complianceSettings: new bytes[](0)
        });
    }

    function deployTREXSuite(
        Vm vm,
        TREXFactory trexFactory,
        ConfigReaderLib.DeploymentConfig memory config,
        ITREXFactory.ClaimDetails memory claimDetails,
        ITREXFactory.TokenDetails memory tokenDetails
    ) internal returns (TREXSuiteResult memory result) {
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, tokenDetails.name, block.timestamp));

        string memory saltString = string(abi.encodePacked(salt));
        // Deploy TREX Suite using the factory
        vm.startBroadcast(msg.sender);
        trexFactory.deployTREXSuite(saltString, tokenDetails, claimDetails);
        vm.stopBroadcast();
        
        // Get the deployed token address and initialize result
        address tokenAddress = trexFactory.getToken(saltString);
        
        result = _initializeSuiteResult(tokenAddress);
        _displaySuiteResult(result);
    }

    function _initializeSuiteResult(address tokenAddress) private view returns (TREXSuiteResult memory result) {
        result.token = RWAToken(tokenAddress);
        result.compliance = RWACompliance(address(result.token.compliance()));
        result.identityRegistry = RWAIdentityRegistry(address(result.token.identityRegistry()));
        result.identityRegistryStorage = RWAIdentityRegistryStorage(address(result.identityRegistry.identityStorage()));
        result.trustedIssuersRegistry = RWATrustedIssuersRegistry(address(result.identityRegistry.issuersRegistry()));
        result.claimTopicsRegistry = RWAClaimTopicsRegistry(address(result.identityRegistry.topicsRegistry()));
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

