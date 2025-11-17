// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeployRWAIdentityRegistryStorage} from "../../script/utils/DeployRWAIdentityRegistryStorage.s.sol";
import {RWAIdentityRegistryStorage} from "../../src/rwa/IdentityRegistry.sol";

contract DeployRWAIdentityRegistryStorageTest is Test {
    DeployRWAIdentityRegistryStorage deployScript;
    RWAIdentityRegistryStorage storageContract;

    function setUp() public {
        deployScript = new DeployRWAIdentityRegistryStorage();
    }

    function test_DeployRWAIdentityRegistryStorage_Success() public {
        // Execute deployment script
        storageContract = deployScript.run();

        // Verify deployment
        assertNotEq(address(storageContract), address(0), "Storage should be deployed");
    }
}

