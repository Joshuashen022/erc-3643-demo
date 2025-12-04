// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {stdJson} from "forge-std/StdJson.sol";
import {TREXFactory} from "../../lib/ERC-3643/contracts/factory/TREXFactory.sol";
import {TREXGateway} from "../../lib/ERC-3643/contracts/factory/TREXGateway.sol";
import {
    TREXImplementationAuthority
} from "../../lib/ERC-3643/contracts/proxy/authority/TREXImplementationAuthority.sol";
import {
    ITREXImplementationAuthority
} from "../../lib/ERC-3643/contracts/proxy/authority/ITREXImplementationAuthority.sol";
import {IdentityDeploymentLib} from "./IdentityDeploymentLib.sol";
import {TREXSuiteDeploymentLib} from "./TREXSuiteDeploymentLib.sol";
import {console2} from "forge-std/console2.sol";

library DeploymentResultSerializerLib {
    using stdJson for string;

    /// @notice Serializes deployment results and writes to file
    /// @param trexFactory TREXFactory contract address
    /// @param trexGateway TREXGateway contract address
    /// @param trexImplementationAuthority TREXImplementationAuthority contract address
    /// @param identityDeployment Identity deployment result
    /// @param suiteResult TREX suite deployment result
    /// @param currentVersion Current version information
    /// @param claimIssuers Array of claim issuer deployment results
    /// @return jsonString JSON string containing all deployment results
    function serializeAndWriteDeploymentResults(
        TREXFactory trexFactory,
        TREXGateway trexGateway,
        TREXImplementationAuthority trexImplementationAuthority,
        IdentityDeploymentLib.IdentityDeploymentResult memory identityDeployment,
        TREXSuiteDeploymentLib.TREXSuiteResult memory suiteResult,
        ITREXImplementationAuthority.Version memory currentVersion,
        IdentityDeploymentLib.ClaimIssuerDeploymentResult[] memory claimIssuers
    ) internal returns (string memory jsonString) {
        jsonString = _serializeDeploymentResults(
            trexFactory,
            trexGateway,
            trexImplementationAuthority,
            identityDeployment,
            suiteResult,
            currentVersion,
            claimIssuers
        );

        string memory filePath = _getDeploymentFilePath();
        jsonString.write(filePath);

        console2.log("Deployment results serialized and written to %s", filePath);
    }

    /// @notice Serializes deployment results to JSON string
    /// @param trexFactory TREXFactory contract address
    /// @param trexGateway TREXGateway contract address
    /// @param trexImplementationAuthority TREXImplementationAuthority contract address
    /// @param identityDeployment Identity deployment result
    /// @param suiteResult TREX suite deployment result
    /// @param currentVersion Current version information
    /// @param claimIssuers Array of claim issuer deployment results
    /// @return jsonString JSON string containing all deployment results
    function _serializeDeploymentResults(
        TREXFactory trexFactory,
        TREXGateway trexGateway,
        TREXImplementationAuthority trexImplementationAuthority,
        IdentityDeploymentLib.IdentityDeploymentResult memory identityDeployment,
        TREXSuiteDeploymentLib.TREXSuiteResult memory suiteResult,
        ITREXImplementationAuthority.Version memory currentVersion,
        IdentityDeploymentLib.ClaimIssuerDeploymentResult[] memory claimIssuers
    ) internal returns (string memory jsonString) {
        string memory jsonKey = "json";
        string memory json;

        json = jsonKey.serialize("deployDate", block.timestamp);
        json = jsonKey.serialize("deployer", msg.sender);
        json = jsonKey.serialize("chainId", block.chainid);
        // Serialize TREX factory contracts
        json = jsonKey.serialize("trexFactory", address(trexFactory));
        json = jsonKey.serialize("trexFactoryOwner", address(trexFactory.owner()));
        json = jsonKey.serialize("trexGateway", address(trexGateway));
        json = jsonKey.serialize("trexGatewayOwner", address(trexGateway.owner()));
        json = jsonKey.serialize("trexImplementationAuthority", address(trexImplementationAuthority));
        json = jsonKey.serialize("trexImplementationAuthorityOwner", address(trexImplementationAuthority.owner()));

        // Serialize current version (flattened)
        json = jsonKey.serialize("versionMajor", uint256(currentVersion.major));
        json = jsonKey.serialize("versionMinor", uint256(currentVersion.minor));
        json = jsonKey.serialize("versionPatch", uint256(currentVersion.patch));

        // Serialize identity deployment result (flattened)
        json = jsonKey.serialize("rwaIdentityImpl", address(identityDeployment.rwaIdentityImpl));
        json = jsonKey.serialize("rwaClaimIssuerImpl", address(identityDeployment.rwaClaimIssuerImpl));
        json = jsonKey.serialize(
            "identityImplementationAuthority", address(identityDeployment.identityimplementationAuthority)
        );
        json = jsonKey.serialize(
            "claimIssuerImplementationAuthority", address(identityDeployment.claimIssuerImplementationAuthority)
        );
        json = jsonKey.serialize("identityIdFactory", address(identityDeployment.identityIdFactory));
        json = jsonKey.serialize("identityIdFactoryOwner", address(identityDeployment.identityIdFactory.owner()));
        json = jsonKey.serialize("identityGateway", address(identityDeployment.identityGateway));
        json = jsonKey.serialize("identityGatewayOwner", address(identityDeployment.identityGateway.owner()));
        json = jsonKey.serialize("claimIssuerIdFactory", address(identityDeployment.claimIssuerIdFactory));
        json = jsonKey.serialize("claimIssuerIdFactoryOwner", address(identityDeployment.claimIssuerIdFactory.owner()));
        json = jsonKey.serialize("claimIssuerGateway", address(identityDeployment.claimIssuerGateway));
        json = jsonKey.serialize("claimIssuerGatewayOwner", address(identityDeployment.claimIssuerGateway.owner()));

        // Serialize TREX suite result (flattened)
        json = jsonKey.serialize("token", address(suiteResult.token));
        json = jsonKey.serialize("tokenOwner", address(suiteResult.token.owner()));
        json = jsonKey.serialize("compliance", address(suiteResult.compliance));
        json = jsonKey.serialize("identityRegistry", address(suiteResult.identityRegistry));
        json = jsonKey.serialize("identityRegistryOwner", address(suiteResult.identityRegistry.owner()));
        json = jsonKey.serialize("identityRegistryStorage", address(suiteResult.identityRegistryStorage));
        json = jsonKey.serialize("identityRegistryStorageOwner", address(suiteResult.identityRegistryStorage.owner()));
        json = jsonKey.serialize("trustedIssuersRegistry", address(suiteResult.trustedIssuersRegistry));
        json = jsonKey.serialize("trustedIssuersRegistryOwner", address(suiteResult.trustedIssuersRegistry.owner()));
        json = jsonKey.serialize("claimTopicsRegistry", address(suiteResult.claimTopicsRegistry));
        json = jsonKey.serialize("claimTopicsRegistryOwner", address(suiteResult.claimTopicsRegistry.owner()));

        // Serialize claim issuers array (flattened with index prefix)
        for (uint256 i = 0; i < claimIssuers.length; i++) {
            string memory indexStr = _uint2str(i);
            json =
                jsonKey.serialize(string.concat("claimIssuer", indexStr, "_claimIssuer"), claimIssuers[i].claimIssuer);
            json = jsonKey.serialize(
                string.concat("claimIssuer", indexStr, "_claimIssuerOwner"), claimIssuers[i].claimIssuerOwner
            );
            json =
                jsonKey.serialize(string.concat("claimIssuer", indexStr, "_claimTopics"), claimIssuers[i].claimTopics);
        }
        json = jsonKey.serialize("claimIssuersCount", claimIssuers.length);

        return json;
    }

    function _getDeploymentFilePath() internal view returns (string memory filePath) {
        string memory chainIdStr = _uint2str(block.chainid);
        string memory blockTimestampStr = _uint2str(block.timestamp);
        filePath = string.concat("deployments/deployment_results_", chainIdStr, "_", blockTimestampStr, ".json");
    }

    /// @notice Converts uint256 to string
    /// @param num The number to convert
    /// @return str String representation of the number
    function _uint2str(uint256 num) internal pure returns (string memory str) {
        if (num == 0) {
            return "0";
        }
        uint256 temp = num;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (num != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + num % 10));
            num /= 10;
        }
        return string(buffer);
    }
}

