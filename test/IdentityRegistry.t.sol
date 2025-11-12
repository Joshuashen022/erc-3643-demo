// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {RWAIdentityRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAIdentityRegistryStorage} from "../src/rwa/IdentityRegistry.sol";
import {RWATrustedIssuersRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAClaimTopicsRegistry} from "../src/rwa/IdentityRegistry.sol";

contract RWAIdentityRegistryTest is Test {
    RWAIdentityRegistry internal identityRegistry;
    RWAIdentityRegistryStorage internal identityRegistryStorage;
    RWATrustedIssuersRegistry internal trustedIssuersRegistry;
    RWAClaimTopicsRegistry internal claimTopicsRegistry;

    function setUp() public {
        identityRegistry = new RWAIdentityRegistry();
        identityRegistryStorage = new RWAIdentityRegistryStorage();
        trustedIssuersRegistry = new RWATrustedIssuersRegistry();
        claimTopicsRegistry = new RWAClaimTopicsRegistry();
    }

    function testInit() public {
        identityRegistry.init(address(trustedIssuersRegistry), address(claimTopicsRegistry), address(identityRegistryStorage));
        assertEq(address(identityRegistry.identityStorage()), address(identityRegistryStorage));
        assertEq(address(identityRegistry.issuersRegistry()), address(trustedIssuersRegistry));
        assertEq(address(identityRegistry.topicsRegistry()), address(claimTopicsRegistry));
    }
}