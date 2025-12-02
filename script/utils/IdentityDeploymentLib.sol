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
        ImplementationAuthority identityimplementationAuthority;
        ImplementationAuthority claimIssuerImplementationAuthority;
        RWAIdentityIdFactory identityIdFactory;
        RWAIdentityGateway identityGateway;
        RWAClaimIssuerIdFactory claimIssuerIdFactory;
        RWAClaimIssuerGateway claimIssuerGateway;
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
        result.identityimplementationAuthority = new ImplementationAuthority(address(result.rwaIdentityImpl));
        result.claimIssuerImplementationAuthority = new ImplementationAuthority(address(result.rwaClaimIssuerImpl));

        result.identityIdFactory = new RWAIdentityIdFactory(address(result.identityimplementationAuthority));
        result.identityGateway = new RWAIdentityGateway(address(result.identityIdFactory), signers);
        result.claimIssuerIdFactory = new RWAClaimIssuerIdFactory(address(result.claimIssuerImplementationAuthority));
        result.claimIssuerGateway = new RWAClaimIssuerGateway(address(result.claimIssuerIdFactory), signers);

        vm.stopBroadcast();
        _displayIdentityDeploymentResult(result);
    }

    function initializeClaimIssuer(
        Vm vm,
        RWAClaimIssuerIdFactory claimIssuerIdFactory
    ) internal returns (ClaimIssuerDeploymentResult[] memory claimIssuers) {
        
        // todo this is template for now, we need to make it dynamic
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
        
        _displayClaimIssuerDeploymentResult(claimIssuers);
    }

    function _displayIdentityDeploymentResult(IdentityDeploymentResult memory result) internal view {
        console.log("Identity implementation authority:", address(result.identityimplementationAuthority));
        console.log("Identity ID factory:", address(result.identityIdFactory));
        console.log("Identity gateway:", address(result.identityGateway));
        console.log("Claim issuer implementation authority:", address(result.claimIssuerImplementationAuthority));
        console.log("Claim issuer ID factory:", address(result.claimIssuerIdFactory));
        console.log("Claim issuer gateway:", address(result.claimIssuerGateway));
    }

    function _displayClaimIssuerDeploymentResult(ClaimIssuerDeploymentResult[] memory claimIssuers) internal view {
        for (uint256 i = 0; i < claimIssuers.length; i++) {
            console.log("Claim issuer:", address(claimIssuers[i].claimIssuer));
            console.log("Claim topics count:", claimIssuers[i].claimTopics.length);
            for (uint256 j = 0; j < claimIssuers[i].claimTopics.length; j++) {
                console.log("  Topic", j, ":", claimIssuers[i].claimTopics[j]);
            }
        }
    }
}

