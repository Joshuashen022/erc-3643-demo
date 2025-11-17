// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeployRWATrustedIssuersRegistry} from "../../script/utils/DeployRWATrustedIssuersRegistry.s.sol";
import {RWATrustedIssuersRegistry} from "../../src/rwa/IdentityRegistry.sol";

contract DeployRWATrustedIssuersRegistryTest is Test {
    DeployRWATrustedIssuersRegistry deployScript;
    RWATrustedIssuersRegistry trustedIssuersRegistry;

    function setUp() public {
        deployScript = new DeployRWATrustedIssuersRegistry();
    }

    function test_DeployRWATrustedIssuersRegistry_Success() public {
        // Execute deployment script
        trustedIssuersRegistry = deployScript.run();

        // Verify deployment
        assertNotEq(address(trustedIssuersRegistry), address(0), "TrustedIssuersRegistry should be deployed");
    }

}

