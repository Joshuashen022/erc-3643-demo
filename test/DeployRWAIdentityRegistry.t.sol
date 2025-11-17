// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeployRWAIdentityRegistry} from "../script/DeployRWAIdentityRegistry.s.sol";
import {DeployRWATrustedIssuersRegistry} from "../script/utils/DeployRWATrustedIssuersRegistry.s.sol";
import {DeployRWAClaimTopicsRegistry} from "../script/utils/DeployRWAClaimTopicsRegistry.s.sol";
import {DeployRWAIdentityRegistryStorage} from "../script/DeployRWAIdentityRegistryStorage.s.sol";
import {RWAIdentityRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWATrustedIssuersRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAClaimTopicsRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAIdentityRegistryStorage} from "../src/rwa/IdentityRegistry.sol";

contract DeployRWAIdentityRegistryTest is Test {
    DeployRWAIdentityRegistry deployScript;
    DeployRWATrustedIssuersRegistry deployTIR;
    DeployRWAClaimTopicsRegistry deployCTR;
    DeployRWAIdentityRegistryStorage deployStorage;
    
    RWAIdentityRegistry identityRegistry;
    RWATrustedIssuersRegistry trustedIssuersRegistry;
    RWAClaimTopicsRegistry claimTopicsRegistry;
    RWAIdentityRegistryStorage identityRegistryStorage;

    function setUp() public {
        deployScript = new DeployRWAIdentityRegistry();
        deployTIR = new DeployRWATrustedIssuersRegistry();
        deployCTR = new DeployRWAClaimTopicsRegistry();
        deployStorage = new DeployRWAIdentityRegistryStorage();
    }

    function test_DeployRWAIdentityRegistry_Success() public {
        // Deploy dependencies first
        trustedIssuersRegistry = deployTIR.run();
        claimTopicsRegistry = deployCTR.run();
        identityRegistryStorage = deployStorage.run();

        // Set environment variables
        vm.setEnv("TRUSTED_ISSUERS_REGISTRY_ADDRESS", vm.toString(address(trustedIssuersRegistry)));
        vm.setEnv("CLAIM_TOPICS_REGISTRY_ADDRESS", vm.toString(address(claimTopicsRegistry)));
        vm.setEnv("IDENTITY_REGISTRY_STORAGE_ADDRESS", vm.toString(address(identityRegistryStorage)));

        // Execute deployment script
        identityRegistry = deployScript.run();

        // Verify deployment
        assertNotEq(address(identityRegistry), address(0), "IdentityRegistry should be deployed");
    }

    function test_DeployRWAIdentityRegistry_WithStorageBinding() public {
        // Deploy dependencies first
        trustedIssuersRegistry = deployTIR.run();
        claimTopicsRegistry = deployCTR.run();
        identityRegistryStorage = deployStorage.run();

        // Set environment variables including storage owner
        vm.setEnv("TRUSTED_ISSUERS_REGISTRY_ADDRESS", vm.toString(address(trustedIssuersRegistry)));
        vm.setEnv("CLAIM_TOPICS_REGISTRY_ADDRESS", vm.toString(address(claimTopicsRegistry)));
        vm.setEnv("IDENTITY_REGISTRY_STORAGE_ADDRESS", vm.toString(address(identityRegistryStorage)));
        vm.setEnv("STORAGE_OWNER", vm.toString(identityRegistryStorage.owner()));

        // Execute deployment script
        identityRegistry = deployScript.run();

        // Verify deployment
        assertNotEq(address(identityRegistry), address(0), "IdentityRegistry should be deployed");
    }

    function test_DeployRWAIdentityRegistry_RevertsWhenMissingAddresses() public {
        // Don't set required environment variables
        vm.setEnv("TRUSTED_ISSUERS_REGISTRY_ADDRESS", "");
        vm.setEnv("CLAIM_TOPICS_REGISTRY_ADDRESS", "");
        vm.setEnv("IDENTITY_REGISTRY_STORAGE_ADDRESS", "");

        // Should revert with missing addresses
        vm.expectRevert(bytes("All registry addresses must be provided"));
        deployScript.run();
    }

    function test_DeployRWAIdentityRegistry_RevertsWhenTrustedIssuersRegistryIsZero() public {
        // Deploy dependencies
        claimTopicsRegistry = deployCTR.run();
        identityRegistryStorage = deployStorage.run();

        // Set only some addresses, leave trusted issuers registry as zero
        vm.setEnv("TRUSTED_ISSUERS_REGISTRY_ADDRESS", "");
        vm.setEnv("CLAIM_TOPICS_REGISTRY_ADDRESS", vm.toString(address(claimTopicsRegistry)));
        vm.setEnv("IDENTITY_REGISTRY_STORAGE_ADDRESS", vm.toString(address(identityRegistryStorage)));

        // Should revert
        vm.expectRevert(bytes("All registry addresses must be provided"));
        deployScript.run();
    }

    function test_DeployRWAIdentityRegistry_RevertsWhenClaimTopicsRegistryIsZero() public {
        // Deploy dependencies
        trustedIssuersRegistry = deployTIR.run();
        identityRegistryStorage = deployStorage.run();

        // Set only some addresses, leave claim topics registry as zero
        vm.setEnv("TRUSTED_ISSUERS_REGISTRY_ADDRESS", vm.toString(address(trustedIssuersRegistry)));
        vm.setEnv("CLAIM_TOPICS_REGISTRY_ADDRESS", "");
        vm.setEnv("IDENTITY_REGISTRY_STORAGE_ADDRESS", vm.toString(address(identityRegistryStorage)));

        // Should revert
        vm.expectRevert(bytes("All registry addresses must be provided"));
        deployScript.run();
    }

    function test_DeployRWAIdentityRegistry_RevertsWhenStorageIsZero() public {
        // Deploy dependencies
        trustedIssuersRegistry = deployTIR.run();
        claimTopicsRegistry = deployCTR.run();

        // Set only some addresses, leave storage as zero
        vm.setEnv("TRUSTED_ISSUERS_REGISTRY_ADDRESS", vm.toString(address(trustedIssuersRegistry)));
        vm.setEnv("CLAIM_TOPICS_REGISTRY_ADDRESS", vm.toString(address(claimTopicsRegistry)));
        vm.setEnv("IDENTITY_REGISTRY_STORAGE_ADDRESS", "");

        // Should revert
        vm.expectRevert(bytes("All registry addresses must be provided"));
        deployScript.run();
    }
}

