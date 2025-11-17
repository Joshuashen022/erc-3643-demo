// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeployRWAIdentity} from "../../script/utils/DeployRWAIdentity.s.sol";
import {RWAIdentity} from "../../src/rwa/identity/Identity.sol";

contract DeployRWAIdentityTest is Test {
    DeployRWAIdentity deployScript;
    RWAIdentity identity;

    address private constant MANAGEMENT_KEY = address(0x111);
    address private constant CLAIM_KEY_ADDRESS = address(0x222);
    uint256 private constant PURPOSE_CLAIM = 3;
    uint256 private constant KEY_TYPE_ECDSA = 1;

    function setUp() public {
        deployScript = new DeployRWAIdentity();
    }

    function test_DeployRWAIdentity_Success() public {
        // Set environment variables
        vm.setEnv("MANAGEMENT_KEY", vm.toString(MANAGEMENT_KEY));
        vm.setEnv("CLAIM_KEY_ADDRESS", vm.toString(CLAIM_KEY_ADDRESS));
        vm.setEnv("PURPOSE_CLAIM", vm.toString(PURPOSE_CLAIM));
        vm.setEnv("KEY_TYPE_ECDSA", vm.toString(KEY_TYPE_ECDSA));

        // Execute deployment script
        identity = deployScript.run();

        // Verify deployment
        assertNotEq(address(identity), address(0), "Identity should be deployed");
    }
}

