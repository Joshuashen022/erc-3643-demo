// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {TrustedIssuersRegistry} from "ERC-3643/registry/implementation/TrustedIssuersRegistry.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";

// Mock ClaimIssuer contract for testing
contract MockClaimIssuer is IClaimIssuer {
    function revokeClaim(bytes32, address) external pure override returns (bool) {
        return true;
    }

    function revokeClaimBySignature(bytes calldata) external pure override {}

    function isClaimRevoked(bytes calldata) external pure override returns (bool) {
        return false;
    }

    function isClaimValid(
        IIdentity,
        uint256,
        bytes calldata,
        bytes calldata
    ) external pure override returns (bool) {
        return true;
    }

    // IIdentity interface functions (minimal implementation)
    function keyHasPurpose(bytes32, uint256) external pure override returns (bool) {
        return false;
    }

    function getKey(bytes32) external pure override returns (uint256[] memory, uint256, bytes32) {
        return (new uint256[](0), 0, bytes32(0));
    }

    function getKeyPurposes(bytes32) external pure override returns (uint256[] memory) {
        return new uint256[](0);
    }

    function getKeysByPurpose(uint256) external pure override returns (bytes32[] memory) {
        return new bytes32[](0);
    }

    function addKey(bytes32, uint256, uint256) external pure override returns (bool) {
        return true;
    }

    function removeKey(bytes32, uint256) external pure override returns (bool) {
        return true;
    }

    function approve(uint256, bool) external pure override returns (bool) {
        return true;
    }

    function execute(address, uint256, bytes calldata) external payable override returns (uint256) {
        return 0;
    }

    function addClaim(
        uint256,
        uint256,
        address,
        bytes calldata,
        bytes calldata,
        string calldata
    ) external pure override returns (bytes32) {
        return bytes32(0);
    }

    function removeClaim(bytes32) external pure override returns (bool) {
        return true;
    }

    function getClaim(bytes32)
        external
        pure
        override
        returns (
            uint256,
            uint256,
            address,
            bytes memory,
            bytes memory,
            string memory
        )
    {
        return (0, 0, address(0), "", "", "");
    }

    function getClaimIdsByTopic(uint256) external pure override returns (bytes32[] memory) {
        return new bytes32[](0);
    }
}

contract TrustedIssuersRegistryTest is Test {
    TrustedIssuersRegistry internal trustedIssuersRegistry;
    MockClaimIssuer internal issuer1;
    MockClaimIssuer internal issuer2;
    MockClaimIssuer internal issuer3;
    address internal owner;
    address internal nonOwner;

    uint256 constant CLAIM_TOPIC_KYC = 1;
    uint256 constant CLAIM_TOPIC_AML = 2;
    uint256 constant CLAIM_TOPIC_COUNTRY = 3;

    event TrustedIssuerRemoved(IClaimIssuer indexed trustedIssuer);
    event TrustedIssuerAdded(IClaimIssuer indexed trustedIssuer, uint256[] claimTopics);

    function setUp() public {
        owner = address(this);
        nonOwner = address(0x1234);

        // Deploy TrustedIssuersRegistry
        trustedIssuersRegistry = new TrustedIssuersRegistry();
        trustedIssuersRegistry.init();

        // Deploy mock claim issuers
        issuer1 = new MockClaimIssuer();
        issuer2 = new MockClaimIssuer();
        issuer3 = new MockClaimIssuer();

        // Add issuers with claim topics
        uint256[] memory topics1 = new uint256[](2);
        topics1[0] = CLAIM_TOPIC_KYC;
        topics1[1] = CLAIM_TOPIC_AML;
        trustedIssuersRegistry.addTrustedIssuer(IClaimIssuer(address(issuer1)), topics1);

        uint256[] memory topics2 = new uint256[](2);
        topics2[0] = CLAIM_TOPIC_KYC;
        topics2[1] = CLAIM_TOPIC_COUNTRY;
        trustedIssuersRegistry.addTrustedIssuer(IClaimIssuer(address(issuer2)), topics2);

        uint256[] memory topics3 = new uint256[](1);
        topics3[0] = CLAIM_TOPIC_AML;
        trustedIssuersRegistry.addTrustedIssuer(IClaimIssuer(address(issuer3)), topics3);
    }

    function testRemoveTrustedIssuer_Success() public {
        // Verify issuer1 exists before removal
        assertTrue(trustedIssuersRegistry.isTrustedIssuer(address(issuer1)));
        
        IClaimIssuer[] memory issuersBefore = trustedIssuersRegistry.getTrustedIssuers();
        assertEq(issuersBefore.length, 3);
        assertTrue(
            issuersBefore[0] == IClaimIssuer(address(issuer1)) ||
            issuersBefore[1] == IClaimIssuer(address(issuer1)) ||
            issuersBefore[2] == IClaimIssuer(address(issuer1))
        );

        // Verify issuer1 is in CLAIM_TOPIC_KYC list
        IClaimIssuer[] memory kycIssuersBefore = trustedIssuersRegistry.getTrustedIssuersForClaimTopic(CLAIM_TOPIC_KYC);
        assertTrue(
            kycIssuersBefore[0] == IClaimIssuer(address(issuer1)) ||
            kycIssuersBefore[1] == IClaimIssuer(address(issuer1))
        );

        // Remove issuer1
        vm.expectEmit(true, false, false, true);
        emit TrustedIssuerRemoved(IClaimIssuer(address(issuer1)));
        trustedIssuersRegistry.removeTrustedIssuer(IClaimIssuer(address(issuer1)));

        // Verify issuer1 no longer exists
        assertFalse(trustedIssuersRegistry.isTrustedIssuer(address(issuer1)));
        
        IClaimIssuer[] memory issuersAfter = trustedIssuersRegistry.getTrustedIssuers();
        assertEq(issuersAfter.length, 2);
        assertTrue(issuersAfter[0] != IClaimIssuer(address(issuer1)));
        assertTrue(issuersAfter[1] != IClaimIssuer(address(issuer1)));

        // Verify issuer1 is removed from CLAIM_TOPIC_KYC list
        IClaimIssuer[] memory kycIssuersAfter = trustedIssuersRegistry.getTrustedIssuersForClaimTopic(CLAIM_TOPIC_KYC);
        assertEq(kycIssuersAfter.length, 1);
        assertTrue(kycIssuersAfter[0] == IClaimIssuer(address(issuer2)));

        // Verify issuer1 is removed from CLAIM_TOPIC_AML list
        IClaimIssuer[] memory amlIssuersAfter = trustedIssuersRegistry.getTrustedIssuersForClaimTopic(CLAIM_TOPIC_AML);
        assertEq(amlIssuersAfter.length, 1);
        assertTrue(amlIssuersAfter[0] == IClaimIssuer(address(issuer3)));

        // Verify getTrustedIssuerClaimTopics reverts for removed issuer
        vm.expectRevert(bytes("trusted Issuer doesn't exist"));
        trustedIssuersRegistry.getTrustedIssuerClaimTopics(IClaimIssuer(address(issuer1)));
    }

    function testRemoveTrustedIssuer_RemovesFromAllClaimTopics() public {
        // Remove issuer2 which has CLAIM_TOPIC_KYC and CLAIM_TOPIC_COUNTRY
        trustedIssuersRegistry.removeTrustedIssuer(IClaimIssuer(address(issuer2)));

        // Verify issuer2 is removed from CLAIM_TOPIC_KYC
        IClaimIssuer[] memory kycIssuers = trustedIssuersRegistry.getTrustedIssuersForClaimTopic(CLAIM_TOPIC_KYC);
        assertEq(kycIssuers.length, 1);
        assertTrue(kycIssuers[0] == IClaimIssuer(address(issuer1)));

        // Verify issuer2 is removed from CLAIM_TOPIC_COUNTRY
        IClaimIssuer[] memory countryIssuers = trustedIssuersRegistry.getTrustedIssuersForClaimTopic(CLAIM_TOPIC_COUNTRY);
        assertEq(countryIssuers.length, 0);
    }

    function testRemoveTrustedIssuer_MaintainsOtherIssuers() public {
        // Remove issuer1
        trustedIssuersRegistry.removeTrustedIssuer(IClaimIssuer(address(issuer1)));

        // Verify issuer2 and issuer3 still exist
        assertTrue(trustedIssuersRegistry.isTrustedIssuer(address(issuer2)));
        assertTrue(trustedIssuersRegistry.isTrustedIssuer(address(issuer3)));

        // Verify their claim topics are intact
        uint256[] memory issuer2Topics = trustedIssuersRegistry.getTrustedIssuerClaimTopics(IClaimIssuer(address(issuer2)));
        assertEq(issuer2Topics.length, 2);
        assertEq(issuer2Topics[0], CLAIM_TOPIC_KYC);
        assertEq(issuer2Topics[1], CLAIM_TOPIC_COUNTRY);

        uint256[] memory issuer3Topics = trustedIssuersRegistry.getTrustedIssuerClaimTopics(IClaimIssuer(address(issuer3)));
        assertEq(issuer3Topics.length, 1);
        assertEq(issuer3Topics[0], CLAIM_TOPIC_AML);
    }

    function testRemoveTrustedIssuer_RevertsWhenZeroAddress() public {
        vm.expectRevert(bytes("invalid argument - zero address"));
        trustedIssuersRegistry.removeTrustedIssuer(IClaimIssuer(address(0)));
    }

    function testRemoveTrustedIssuer_RevertsWhenNotTrustedIssuer() public {
        MockClaimIssuer newIssuer = new MockClaimIssuer();
        
        vm.expectRevert(bytes("NOT a trusted issuer"));
        trustedIssuersRegistry.removeTrustedIssuer(IClaimIssuer(address(newIssuer)));
    }

    function testRemoveTrustedIssuer_RevertsWhenNotOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert();
        trustedIssuersRegistry.removeTrustedIssuer(IClaimIssuer(address(issuer1)));
    }

    function testRemoveTrustedIssuer_CanRemoveAllIssuers() public {
        // Remove all issuers
        trustedIssuersRegistry.removeTrustedIssuer(IClaimIssuer(address(issuer1)));
        trustedIssuersRegistry.removeTrustedIssuer(IClaimIssuer(address(issuer2)));
        trustedIssuersRegistry.removeTrustedIssuer(IClaimIssuer(address(issuer3)));

        // Verify no issuers remain
        IClaimIssuer[] memory issuers = trustedIssuersRegistry.getTrustedIssuers();
        assertEq(issuers.length, 0);

        // Verify claim topic lists are empty
        IClaimIssuer[] memory kycIssuers = trustedIssuersRegistry.getTrustedIssuersForClaimTopic(CLAIM_TOPIC_KYC);
        assertEq(kycIssuers.length, 0);

        IClaimIssuer[] memory amlIssuers = trustedIssuersRegistry.getTrustedIssuersForClaimTopic(CLAIM_TOPIC_AML);
        assertEq(amlIssuers.length, 0);
    }

    function testRemoveTrustedIssuer_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit TrustedIssuerRemoved(IClaimIssuer(address(issuer1)));
        trustedIssuersRegistry.removeTrustedIssuer(IClaimIssuer(address(issuer1)));
    }

    function testRemoveTrustedIssuer_CanRemoveAndReadd() public {
        // Remove issuer1
        trustedIssuersRegistry.removeTrustedIssuer(IClaimIssuer(address(issuer1)));
        assertFalse(trustedIssuersRegistry.isTrustedIssuer(address(issuer1)));

        // Re-add issuer1 with different topics
        uint256[] memory newTopics = new uint256[](1);
        newTopics[0] = CLAIM_TOPIC_COUNTRY;
        trustedIssuersRegistry.addTrustedIssuer(IClaimIssuer(address(issuer1)), newTopics);

        // Verify issuer1 exists again
        assertTrue(trustedIssuersRegistry.isTrustedIssuer(address(issuer1)));
        uint256[] memory topics = trustedIssuersRegistry.getTrustedIssuerClaimTopics(IClaimIssuer(address(issuer1)));
        assertEq(topics.length, 1);
        assertEq(topics[0], CLAIM_TOPIC_COUNTRY);
    }
}
