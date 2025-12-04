// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {console2} from "forge-std/console2.sol";
import {Vm, VmSafe} from "forge-std/Vm.sol";
import {ImplementationAuthority} from "../../lib/solidity/contracts/proxy/ImplementationAuthority.sol";
import {IdFactory} from "../../lib/solidity/contracts/factory/IdFactory.sol";
import {RWAIdentity, RWAClaimIssuer} from "../../src/rwa/identity/Identity.sol";
import {RWAIdentityIdFactory, RWAIdentityGateway} from "../../src/rwa/proxy/RWAIdentityIdFactory.sol";
import {RWAClaimIssuerIdFactory, RWAClaimIssuerGateway} from "../../src/rwa/proxy/RWAClaimIssuerIdFactory.sol";
import {ConfigReaderLib} from "./ConfigReaderLib.sol";

library IdentityDeploymentLib {
    struct IdentityDeploymentResult {
        RWAIdentity rwaIdentityImpl;
        RWAClaimIssuer rwaClaimIssuerImpl;
        ImplementationAuthority identityimplementationAuthority;
        ImplementationAuthority claimIssuerImplementationAuthority;
        RWAIdentityIdFactory identityIdFactory;
        RWAIdentityGateway identityGateway;
        RWAClaimIssuerIdFactory claimIssuerIdFactory;
        RWAClaimIssuerGateway claimIssuerGateway;
    }

    struct ClaimIssuerDeploymentResult {
        address claimIssuerManageKey;  // Management key address (public key address)
        address claimIssuer;
        address claimIssuerOwner;
        uint256[] claimTopics;
    }

    function deployAllIdentityContracts(Vm vm, address deployer)
        internal
        returns (IdentityDeploymentResult memory result)
    {
        address[] memory signers = new address[](0);

        vm.startBroadcast();
        result.rwaIdentityImpl = new RWAIdentity(deployer);
        result.rwaClaimIssuerImpl = new RWAClaimIssuer(deployer);
        result.identityimplementationAuthority = new ImplementationAuthority(address(result.rwaIdentityImpl));
        result.claimIssuerImplementationAuthority = new ImplementationAuthority(address(result.rwaClaimIssuerImpl));

        result.identityIdFactory = new RWAIdentityIdFactory(address(result.identityimplementationAuthority));
        result.identityGateway = new RWAIdentityGateway(address(result.identityIdFactory), signers);
        result.claimIssuerIdFactory = new RWAClaimIssuerIdFactory(address(result.claimIssuerImplementationAuthority));
        result.claimIssuerGateway = new RWAClaimIssuerGateway(address(result.claimIssuerIdFactory), signers);

        vm.stopBroadcast();
        _displayIdentityDeploymentResult(result);
    }

    /// @notice Initializes claim issuers from deployment configuration
    /// @param vm The Vm instance for creating wallets
    /// @param claimIssuerIdFactory The factory contract to create claim issuer identities
    /// @param config The deployment configuration containing claim issuer configs
    /// @return claimIssuers Array of deployed claim issuer results
    function initializeClaimIssuer(
        Vm vm,
        RWAClaimIssuerIdFactory claimIssuerIdFactory,
        ConfigReaderLib.DeploymentConfig memory config
    ) internal returns (ClaimIssuerDeploymentResult[] memory claimIssuers) {
        require(config.claimIssuers.length > 0, "No claim issuers configured");

        // Deploy all claim issuers
        claimIssuers = new ClaimIssuerDeploymentResult[](config.claimIssuers.length);

        vm.startBroadcast();
        for (uint256 i = 0; i < config.claimIssuers.length; i++) {
            // Use manageKey (address) directly instead of deriving from privateKey
            address claimIssuerManageKey = config.claimIssuers[i].manageKey;
            require(claimIssuerManageKey != address(0), "ClaimIssuer manageKey cannot be zero address");
            
            string memory claimIssuerName = string(abi.encodePacked("claimissuer", _uint2str(i + 1)));

            address claimIssuer = claimIssuerIdFactory.createIdentity(claimIssuerManageKey, claimIssuerName);

            claimIssuers[i] = ClaimIssuerDeploymentResult({
                claimIssuerManageKey: claimIssuerManageKey,
                claimIssuer: claimIssuer,
                claimIssuerOwner: claimIssuerManageKey,  // Owner is the manageKey address
                claimTopics: config.claimIssuers[i].claimTopics
            });
        }
        vm.stopBroadcast();

        _displayClaimIssuerDeploymentResult(claimIssuers);
    }

    /// @notice Converts uint256 to string
    /// @param num The number to convert
    /// @return str String representation of the number
    function _uint2str(uint256 num) private pure returns (string memory str) {
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

    function _displayIdentityDeploymentResult(IdentityDeploymentResult memory result) internal view {
        console2.log(
            "Identity implementation authority: %s, owner: %s",
            address(result.identityimplementationAuthority),
            address(result.identityimplementationAuthority.owner())
        );
        console2.log(
            "Identity ID factory: %s, owner: %s",
            address(result.identityIdFactory),
            address(result.identityIdFactory.owner())
        );
        console2.log(
            "Identity gateway: %s, owner: %s", address(result.identityGateway), address(result.identityGateway.owner())
        );
        console2.log(
            "Claim issuer implementation authority: %s, owner: %s",
            address(result.claimIssuerImplementationAuthority),
            address(result.claimIssuerImplementationAuthority.owner())
        );
        console2.log(
            "Claim issuer ID factory: %s, owner: %s",
            address(result.claimIssuerIdFactory),
            address(result.claimIssuerIdFactory.owner())
        );
        console2.log(
            "Claim issuer gateway: %s, owner: %s",
            address(result.claimIssuerGateway),
            address(result.claimIssuerGateway.owner())
        );
    }

    function _displayClaimIssuerDeploymentResult(ClaimIssuerDeploymentResult[] memory claimIssuers) internal view {
        for (uint256 i = 0; i < claimIssuers.length; i++) {
            console2.log(
                "Claim issuer: %s, owner: %s",
                address(claimIssuers[i].claimIssuer),
                address(claimIssuers[i].claimIssuerOwner)
            );
            console2.log("Claim topics count:", claimIssuers[i].claimTopics.length);
            for (uint256 j = 0; j < claimIssuers[i].claimTopics.length; j++) {
                console2.log("  Topic", j, ":", claimIssuers[i].claimTopics[j]);
            }
        }
    }
}

