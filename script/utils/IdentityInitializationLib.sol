// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {console2} from "forge-std/console2.sol";
import {Vm} from "forge-std/Vm.sol";
import {RWAIdentity, RWAClaimIssuer} from "../../src/rwa/identity/Identity.sol";
import {RWAIdentityIdFactory} from "../../src/rwa/proxy/RWAIdentityIdFactory.sol";
import {RWAIdentityRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {IIdentity} from "../../lib/solidity/contracts/interface/IIdentity.sol";
import {VmSafe} from "forge-std/Vm.sol";

library IdentityInitializationLib {
    // Shared configuration for all identities
    struct IdentityInitConfig {
        RWAIdentityIdFactory identityIdFactory;
        RWAIdentityRegistry identityRegistry;
        address claimIssuerManagementKey;
        uint256 claimKeyPrivateKey;
        uint256 claimTopicKyc;
        address claimIssuer;
        address deployer;
    }

    // Parameters specific to each identity
    struct IdentityInitParams {
        address identityManagementKey;
        uint256 country;
        string name;
        bytes data;
        string uri;
        uint256 claimSchemeEcdsa;
    }

    // Result for a single identity initialization
    struct IdentityInitResult {
        address identity;
        address identityManagementKey;
        uint256 country;
    }

    // Result for batch identity initialization
    struct BatchIdentityInitResult {
        IdentityInitResult[] identities;
    }

    function prepareIdentityParams(
        Vm vm
    ) internal returns (IdentityInitParams[] memory params) {
        uint256 identityPrivateKey = vm.envOr("IDENTITY_PRIVATE_KEY", uint256(0));
        uint256 country = vm.envOr("COUNTRY_CODE", uint256(0));
        string memory defaultName = "identity1";
        string memory name = vm.envOr("IDENTITY_NAME", defaultName);
        bytes memory data = vm.envOr("CLAIM_DATA", bytes(""));
        string memory uri = vm.envOr("CLAIM_URI", string("https://example.com"));
        uint256 claimSchemeEcdsa = 1;

        VmSafe.Wallet memory identityWallet = vm.createWallet(identityPrivateKey);

        params = new IdentityInitParams[](1);
        params[0] = IdentityInitParams({
            identityManagementKey: identityWallet.addr,
            country: country,
            name: name,
            data: data,
            uri: uri,
            claimSchemeEcdsa: claimSchemeEcdsa
        });
        return params;
    }

    function initializeIdentities(
        Vm vm,
        IdentityInitConfig memory config
    ) internal returns (IdentityInitResult[] memory identities) {
        if (config.claimKeyPrivateKey == uint256(0)) {
            revert("CLAIM_KEY_PRIVATE_KEY is required");
        }

        IdentityInitParams[] memory params = prepareIdentityParams(vm);
        // IdentityInitParams[] memory params = new IdentityInitParams[](0);

        identities = new IdentityInitResult[](params.length);
        
        for (uint256 i = 0; i < params.length; i++) {
            console2.log("Initializing identity", i + 1, "of", params.length);
            console2.log("Identity management key", params[i].identityManagementKey);
            console2.log("Identity name", params[i].name);

            // Add key and claim
            address identity = _addKeyAndClaim(
                vm,
                config,
                params[i]
            );
            identities[i] = IdentityInitResult({
                identity: identity,
                identityManagementKey: params[i].identityManagementKey,
                country: params[i].country
            });
        }
    }

    function _addKeyAndClaim(
        Vm vm,
        IdentityInitConfig memory config,
        IdentityInitParams memory params
    ) private returns (address) {
        // Create identity
        vm.startBroadcast();
        address identity = config.identityIdFactory.createIdentity(
            params.identityManagementKey,
            params.name
        );
        vm.stopBroadcast();
        console2.log("Identity created successfully", identity);

        bytes memory sig = _generateSignature(vm, identity, config.claimTopicKyc, config.claimKeyPrivateKey, params.data);
        
        // Add claim
        vm.startBroadcast(params.identityManagementKey);
        RWAIdentity(identity).addClaim(config.claimTopicKyc, params.claimSchemeEcdsa, config.claimIssuer, sig, params.data, params.uri);
        vm.stopBroadcast();

        // Register identity
        vm.startBroadcast(config.deployer);
        config.identityRegistry.registerIdentity(
            params.identityManagementKey,
            IIdentity(address(identity)),
            uint16(params.country)
        );
        vm.stopBroadcast();
        console2.log("Identity registered successfully");
        return identity;
    }

    function _generateSignature(
        Vm vm,
        address identity,
        uint256 claimTopicKyc,
        uint256 claimIssuerPrivateKey,
        bytes memory data
    ) private returns (bytes memory) {
        bytes32 dataHash = keccak256(abi.encode(identity, claimTopicKyc, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimIssuerPrivateKey, prefixedHash);
        return abi.encodePacked(r, s, v);
    }
}

