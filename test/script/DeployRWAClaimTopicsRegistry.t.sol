// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeployRWAClaimTopicsRegistry} from "../../script/utils/DeployRWAClaimTopicsRegistry.s.sol";
import {RWAClaimTopicsRegistry} from "../../src/rwa/IdentityRegistry.sol";

contract DeployRWAClaimTopicsRegistryTest is Test {
    DeployRWAClaimTopicsRegistry deployScript;
    RWAClaimTopicsRegistry claimTopicsRegistry;

    uint256 constant CLAIM_TOPIC_KYC = 1;

    function setUp() public {
        deployScript = new DeployRWAClaimTopicsRegistry();
    }

    function test_DeployRWAClaimTopicsRegistry_Success() public {
        // Execute deployment script
        claimTopicsRegistry = deployScript.run();

        // Verify deployment
        assertNotEq(address(claimTopicsRegistry), address(0), "ClaimTopicsRegistry should be deployed");
    }

    function test_DeployRWAClaimTopicsRegistry_WithKycTopic() public {
        // Set environment variable to add KYC topic
        vm.setEnv("ADD_KYC_TOPIC", "true");

        // Execute deployment script
        claimTopicsRegistry = deployScript.run();

        // Verify deployment
        assertNotEq(address(claimTopicsRegistry), address(0), "ClaimTopicsRegistry should be deployed");
        
        // Verify KYC topic was added
        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        assertEq(topics.length, 1, "Should have one claim topic");
        assertEq(topics[0], CLAIM_TOPIC_KYC, "Should have KYC claim topic");
    }

}

