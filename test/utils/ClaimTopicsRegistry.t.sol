// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {RWAClaimTopicsRegistry} from "../../src/rwa/IdentityRegistry.sol";

contract ClaimTopicsRegistryUtils is Test {
    RWAClaimTopicsRegistry public claimTopicsRegistry;
    address internal owner;
    address internal nonOwner;

    uint256 constant CLAIM_TOPIC_KYC = 1;
    uint256 constant CLAIM_TOPIC_AML = 2;
    uint256 constant CLAIM_TOPIC_COUNTRY = 3;
    uint256 constant CLAIM_TOPIC_ACCREDITED = 4;
    uint256 constant CLAIM_TOPIC_VERIFIED = 5;

    event ClaimTopicAdded(uint256 indexed claimTopic);
    event ClaimTopicRemoved(uint256 indexed claimTopic);

    function setUp() public {
        owner = address(this);
        nonOwner = address(0x1234);

        // Deploy ClaimTopicsRegistry
        claimTopicsRegistry = new RWAClaimTopicsRegistry();
        claimTopicsRegistry.init();

        claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC_AML);
        claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC_COUNTRY);

    }

    // ============ init() tests ============

    function testInit() public {
        RWAClaimTopicsRegistry newRegistry = new RWAClaimTopicsRegistry();
        newRegistry.init();
        assertEq(newRegistry.owner(), address(this));
    }

    function testInit_RevertsWhenCalledTwice() public {
        RWAClaimTopicsRegistry newRegistry = new RWAClaimTopicsRegistry();
        newRegistry.init();
        vm.expectRevert();
        newRegistry.init();
    }

    // ============ addClaimTopic() tests ============

    function testAddClaimTopic_Success() public {
        // Remove existing topics first to test from clean state
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_COUNTRY);

        vm.expectEmit(true, false, false, true);
        emit ClaimTopicAdded(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC_KYC);

        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 1);
        assertEq(topics[0], CLAIM_TOPIC_KYC);
    }

    function testAddClaimTopic_MultipleTopics() public view{
        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 3);
        assertTrue(
            (topics[0] == CLAIM_TOPIC_KYC && topics[1] == CLAIM_TOPIC_AML && topics[2] == CLAIM_TOPIC_COUNTRY) ||
            (topics[0] == CLAIM_TOPIC_KYC && topics[1] == CLAIM_TOPIC_COUNTRY && topics[2] == CLAIM_TOPIC_AML) ||
            (topics[0] == CLAIM_TOPIC_AML && topics[1] == CLAIM_TOPIC_KYC && topics[2] == CLAIM_TOPIC_COUNTRY) ||
            (topics[0] == CLAIM_TOPIC_AML && topics[1] == CLAIM_TOPIC_COUNTRY && topics[2] == CLAIM_TOPIC_KYC) ||
            (topics[0] == CLAIM_TOPIC_COUNTRY && topics[1] == CLAIM_TOPIC_KYC && topics[2] == CLAIM_TOPIC_AML) ||
            (topics[0] == CLAIM_TOPIC_COUNTRY && topics[1] == CLAIM_TOPIC_AML && topics[2] == CLAIM_TOPIC_KYC)
        );
    }

    function testAddClaimTopic_UpTo15Topics() public {
        // Remove existing topics first
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_COUNTRY);

        for (uint256 i = 1; i <= 15; i++) {
            claimTopicsRegistry.addClaimTopic(i);
        }

        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 15);
    }

    function testAddClaimTopic_RevertsWhenMoreThan15() public {
        // Remove existing topics first
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_COUNTRY);

        for (uint256 i = 1; i <= 15; i++) {
            claimTopicsRegistry.addClaimTopic(i);
        }

        vm.expectRevert(bytes("cannot require more than 15 topics"));
        claimTopicsRegistry.addClaimTopic(16);
    }

    function testAddClaimTopic_RevertsWhenDuplicate() public {
        // KYC is already added in setUp, so trying to add it again should revert
        vm.expectRevert(bytes("claimTopic already exists"));
        claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC_KYC);
    }

    function testAddClaimTopic_RevertsWhenNotOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert();
        claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC_KYC);
    }

    function testAddClaimTopic_EmitsEvent() public {
        // Remove KYC first, then add it back to test event emission
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
        
        vm.expectEmit(true, false, false, true);
        emit ClaimTopicAdded(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC_KYC);
    }

    // ============ removeClaimTopic() tests ============

    function testRemoveClaimTopic_Success() public {
        // KYC and AML are already added in setUp
        vm.expectEmit(true, false, false, true);
        emit ClaimTopicRemoved(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);

        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 2);
        // Should contain AML and COUNTRY, but not KYC
        bool foundAML = false;
        bool foundCOUNTRY = false;
        for (uint256 i = 0; i < topics.length; i++) {
            if (topics[i] == CLAIM_TOPIC_AML) foundAML = true;
            if (topics[i] == CLAIM_TOPIC_COUNTRY) foundCOUNTRY = true;
            assertTrue(topics[i] != CLAIM_TOPIC_KYC);
        }
        assertTrue(foundAML && foundCOUNTRY);
    }

    function testRemoveClaimTopic_RemovesFirst() public {
        // All three topics are already added in setUp
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);

        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 2);
        // Should contain AML and COUNTRY, but not KYC
        bool foundAML = false;
        bool foundCOUNTRY = false;
        for (uint256 i = 0; i < topics.length; i++) {
            if (topics[i] == CLAIM_TOPIC_AML) foundAML = true;
            if (topics[i] == CLAIM_TOPIC_COUNTRY) foundCOUNTRY = true;
            assertTrue(topics[i] != CLAIM_TOPIC_KYC);
        }
        assertTrue(foundAML && foundCOUNTRY);
    }

    function testRemoveClaimTopic_RemovesMiddle() public {
        // All three topics are already added in setUp
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);

        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 2);
        // Should contain KYC and COUNTRY, but not AML
        bool foundKYC = false;
        bool foundCOUNTRY = false;
        for (uint256 i = 0; i < topics.length; i++) {
            if (topics[i] == CLAIM_TOPIC_KYC) foundKYC = true;
            if (topics[i] == CLAIM_TOPIC_COUNTRY) foundCOUNTRY = true;
            assertTrue(topics[i] != CLAIM_TOPIC_AML);
        }
        assertTrue(foundKYC && foundCOUNTRY);
    }

    function testRemoveClaimTopic_RemovesLast() public {
        // Remove COUNTRY first to have only KYC and AML
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_COUNTRY);
        
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);

        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 1);
        assertEq(topics[0], CLAIM_TOPIC_KYC);
    }

    function testRemoveClaimTopic_RemovesAll() public {
        // All three topics are already added in setUp
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_COUNTRY);

        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 0);
    }

    function testRemoveClaimTopic_NonExistentTopicDoesNothing() public {
        // Remove AML and COUNTRY first, leaving only KYC
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_COUNTRY);
        
        // Removing a non-existent topic should not revert, just do nothing
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);

        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 1);
        assertEq(topics[0], CLAIM_TOPIC_KYC);
    }

    function testRemoveClaimTopic_CanReaddAfterRemoval() public {
        // KYC is already added in setUp
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC_KYC);

        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        // Should have KYC, AML, and COUNTRY (3 topics)
        assertEq(topics.length, 3);
        // Verify KYC is present
        bool foundKYC = false;
        for (uint256 i = 0; i < topics.length; i++) {
            if (topics[i] == CLAIM_TOPIC_KYC) foundKYC = true;
        }
        assertTrue(foundKYC);
    }

    function testRemoveClaimTopic_RevertsWhenNotOwner() public {
        // KYC is already added in setUp
        vm.prank(nonOwner);
        vm.expectRevert();
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
    }

    function testRemoveClaimTopic_EmitsEvent() public {
        // KYC is already added in setUp
        vm.expectEmit(true, false, false, true);
        emit ClaimTopicRemoved(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
    }

    // ============ getClaimTopics() tests ============

    function testGetClaimTopics_ReturnsEmptyArray() public {
        // Remove all topics first
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_COUNTRY);
        
        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 0);
    }

    function testGetClaimTopics_ReturnsAllTopics() public view {
        // All three topics are already added in setUp
        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 3);
    }

    function testGetClaimTopics_ReturnsUpdatedListAfterRemoval() public {
        // All three topics are already added in setUp
        uint256[] memory topicsBefore = claimTopicsRegistry.getClaimTopics();
        assertEq(topicsBefore.length, 3);

        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);

        uint256[] memory topicsAfter = claimTopicsRegistry.getClaimTopics();
        assertEq(topicsAfter.length, 2);
    }

    // ============ Integration tests ============

    function testFullLifecycle() public {
        // All three topics are already added in setUp
        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 3);

        // Remove one topic
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);
        topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 2);

        // Add new topic
        claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC_ACCREDITED);
        topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 3);

        // Remove all remaining topics
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_COUNTRY);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_ACCREDITED);

        topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 0);
    }

    function testAddRemoveMultipleTimes() public {
        // Remove existing topics first
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_COUNTRY);
        
        // Add and remove multiple times
        for (uint256 i = 0; i < 5; i++) {
            claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC_KYC);
            claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
        }

        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 0);
    }

    function testComplexScenario() public {
        // Remove existing topics first (1, 2, 3 are already added)
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_KYC);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_AML);
        claimTopicsRegistry.removeClaimTopic(CLAIM_TOPIC_COUNTRY);
        
        // Add 10 topics
        for (uint256 i = 1; i <= 10; i++) {
            claimTopicsRegistry.addClaimTopic(i);
        }

        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 10);

        // Remove topics 2, 4, 6, 8, 10
        claimTopicsRegistry.removeClaimTopic(2);
        claimTopicsRegistry.removeClaimTopic(4);
        claimTopicsRegistry.removeClaimTopic(6);
        claimTopicsRegistry.removeClaimTopic(8);
        claimTopicsRegistry.removeClaimTopic(10);

        topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 5);

        // Verify remaining topics are 1, 3, 5, 7, 9
        bool found1 = false;
        bool found3 = false;
        bool found5 = false;
        bool found7 = false;
        bool found9 = false;
        for (uint256 i = 0; i < topics.length; i++) {
            if (topics[i] == 1) found1 = true;
            if (topics[i] == 3) found3 = true;
            if (topics[i] == 5) found5 = true;
            if (topics[i] == 7) found7 = true;
            if (topics[i] == 9) found9 = true;
        }
        assertTrue(found1 && found3 && found5 && found7 && found9);
    }
}


