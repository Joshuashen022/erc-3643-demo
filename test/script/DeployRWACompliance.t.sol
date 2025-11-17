// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeployRWACompliance} from "../../script/utils/DeployRWACompliance.s.sol";
import {RWACompliance} from "../../src/rwa/Compliance.sol";

contract DeployRWAComplianceTest is Test {
    DeployRWACompliance deployScript;
    RWACompliance compliance;

    function setUp() public {
        deployScript = new DeployRWACompliance();
    }

    function test_DeployRWACompliance_Success() public {
        // Execute deployment script
        compliance = deployScript.run();

        // Verify deployment
        assertNotEq(address(compliance), address(0), "Compliance should be deployed");
    }
}

