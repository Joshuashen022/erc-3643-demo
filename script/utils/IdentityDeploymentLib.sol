// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {console} from "forge-std/console.sol";
import {Vm, VmSafe} from "forge-std/Vm.sol";
import {ImplementationAuthority} from "../../lib/solidity/contracts/proxy/ImplementationAuthority.sol";
import {IdFactory} from "../../lib/solidity/contracts/factory/IdFactory.sol";
import {RWAIdentity, RWAClaimIssuer} from "../../src/rwa/identity/Identity.sol";
import {RWAIdentityIdFactory, RWAIdentityGateway} from "../../src/rwa/proxy/RWAIdentityIdFactory.sol";
import {RWAClaimIssuerIdFactory, RWAClaimIssuerGateway} from "../../src/rwa/proxy/RWAClaimIssuerIdFactory.sol";

library IdentityDeploymentLib {
    struct IdentityDeploymentResult {
        RWAIdentity rwaIdentityImpl;
        RWAClaimIssuer rwaClaimIssuerImpl;
        ImplementationAuthority implementationAuthority;
        ImplementationAuthority claimIssuerImplementationAuthority;
        RWAIdentityIdFactory identityIdFactory;
        RWAIdentityGateway identityGateway;
        RWAClaimIssuerIdFactory claimIssuerIdFactory;
        RWAClaimIssuerGateway claimIssuerGateway;
        address claimIssuer;
        IdFactory idFactory;
    }

    struct ClaimIssuerDeploymentResult {
        uint256 claimIssuerPrivateKey;
        address claimIssuer;
        uint256 [] claimTopics;
    }

    function deployAllIdentityContracts(
        Vm vm,
        address deployer
    ) internal returns (IdentityDeploymentResult memory result) {
        address[] memory signers = new address[](0);

        vm.startBroadcast();
        result.rwaIdentityImpl = new RWAIdentity(deployer);
        result.rwaClaimIssuerImpl = new RWAClaimIssuer(deployer);
        result.implementationAuthority = new ImplementationAuthority(address(result.rwaIdentityImpl));
        result.claimIssuerImplementationAuthority = new ImplementationAuthority(address(result.rwaClaimIssuerImpl));

        result.identityIdFactory = new RWAIdentityIdFactory(address(result.implementationAuthority));
        result.identityGateway = new RWAIdentityGateway(address(result.identityIdFactory), signers);
        result.claimIssuerIdFactory = new RWAClaimIssuerIdFactory(address(result.claimIssuerImplementationAuthority));
        result.claimIssuerGateway = new RWAClaimIssuerGateway(address(result.claimIssuerIdFactory), signers);

        vm.stopBroadcast();
        
        console.log("IdentityIdFactory deployed at:", address(result.identityIdFactory), "rwaIdentityImpl", address(result.rwaIdentityImpl));
        console.log("IdentityGateway deployed at:", address(result.identityGateway));
        console.log("ClaimIssuerIdFactory deployed at:", address(result.claimIssuerIdFactory), "rwaClaimIssuerImpl", address(result.rwaClaimIssuerImpl));
        console.log("ClaimIssuerGateway deployed at:", address(result.claimIssuerGateway));

        console.log("IdentityIdFactory owner:", result.identityIdFactory.owner());
        console.log("IdentityGateway owner:", result.identityGateway.owner());
        console.log("ClaimIssuerIdFactory owner:", result.claimIssuerIdFactory.owner());
        console.log("ClaimIssuerGateway owner:", result.claimIssuerGateway.owner());

        result.idFactory = IdFactory(address(result.identityIdFactory));
    }

    function initializeClaimIssuer(
        Vm vm,
        RWAClaimIssuerIdFactory claimIssuerIdFactory
    ) internal returns (ClaimIssuerDeploymentResult[] memory claimIssuers) {
        uint256 claimIssuerPrivateKey = vm.envOr("CLAIM_ISSUER_PRIVATE_KEY", uint256(0));
        uint256 claimTopicKyc = vm.envOr("CLAIM_TOPIC_KYC", uint256(1));
        string memory claimIssuerName = "claimissuer1";
        uint256[] memory claimTopics = new uint256[](1);
        claimTopics[0] = claimTopicKyc;

        VmSafe.Wallet memory claimIssuerWallet = vm.createWallet(claimIssuerPrivateKey);

        vm.startBroadcast();
        address claimIssuer = claimIssuerIdFactory.createIdentity(claimIssuerWallet.addr, claimIssuerName);
        vm.stopBroadcast();
        
        claimIssuers = new ClaimIssuerDeploymentResult[](1);
        claimIssuers[0] = ClaimIssuerDeploymentResult({
            claimIssuerPrivateKey: claimIssuerPrivateKey,
            claimIssuer: claimIssuer,
            claimTopics: claimTopics
        });
    }
}

