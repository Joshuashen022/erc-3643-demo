// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeployRWAClaimIssuer} from "../../script/utils/DeployRWAClaimIssuer.s.sol";
import {RWAClaimIssuer} from "../../src/rwa/identity/Identity.sol";

contract DeployRWAClaimIssuerTest is Test {
    DeployRWAClaimIssuer deployScript;
    RWAClaimIssuer claimIssuer;

    address private constant MANAGEMENT_KEY = address(0x111);
    address private constant CLAIM_KEY_ADDRESS = address(0x222);
    uint256 private constant PURPOSE_CLAIM = 3;
    uint256 private constant KEY_TYPE_ECDSA = 1;

    function setUp() public {
        deployScript = new DeployRWAClaimIssuer();
    }

    function test_DeployRWAClaimIssuer_Success() public {
        // Set environment variables
        vm.setEnv("MANAGEMENT_KEY", vm.toString(MANAGEMENT_KEY));
        vm.setEnv("CLAIM_KEY_ADDRESS", vm.toString(CLAIM_KEY_ADDRESS));
        vm.setEnv("PURPOSE_CLAIM", vm.toString(PURPOSE_CLAIM));
        vm.setEnv("KEY_TYPE_ECDSA", vm.toString(KEY_TYPE_ECDSA));

        // Execute deployment script
        claimIssuer = deployScript.run();

        // Verify deployment
        assertNotEq(address(claimIssuer), address(0), "ClaimIssuer should be deployed");


        claimIssuer.getKey(keccak256(abi.encode(CLAIM_KEY_ADDRESS)));
    }
}

