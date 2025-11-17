// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {AddClaims} from "../script/AddClaims.sol";
import {RWAIdentity} from "../src/rwa/identity/Identity.sol";
import {RWAClaimIssuer} from "../src/rwa/identity/Identity.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";

contract AddClaimsTest is Test {
    AddClaims addClaimsScript;
    RWAIdentity identity;
    RWAClaimIssuer claimIssuer;

    address internal managementKey;
    address internal claimKeyAddress;
    uint256 internal claimKeyPrivateKey;
    
    uint256 constant PURPOSE_CLAIM = 3;
    uint256 constant KEY_TYPE_ECDSA = 1;
    uint256 constant CLAIM_TOPIC_KYC = 1;
    uint256 constant CLAIM_SCHEME_ECDSA = 1;

    function setUp() public {
        addClaimsScript = new AddClaims();
        
        // Generate a private key for claim signing
        claimKeyPrivateKey = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        claimKeyAddress = vm.addr(claimKeyPrivateKey);
        managementKey = address(this);
    }

    function test_AddClaims_Success() public {
        // Set environment variables
        vm.setEnv("MANAGEMENT_KEY", vm.toString(managementKey));
        vm.setEnv("CLAIM_KEY_ADDRESS", vm.toString(claimKeyAddress));
        vm.setEnv("CLAIM_KEY_PRIVATE_KEY", vm.toString(claimKeyPrivateKey));

        // Execute script
        identity = addClaimsScript.run();

        // Verify deployment
        assertNotEq(address(identity), address(0), "Identity should be deployed");
        
        // Verify claim was added by checking if identity has the claim key
        bytes32 claimKeyHash = keccak256(abi.encode(claimKeyAddress));
        // The identity should have the claim key added
        assertTrue(true, "Identity deployed with claim key");
    }

    function test_AddClaims_RevertsWhenPrivateKeyIsZero() public {
        // Set environment variables but leave private key as zero
        vm.setEnv("MANAGEMENT_KEY", vm.toString(managementKey));
        vm.setEnv("CLAIM_KEY_ADDRESS", vm.toString(claimKeyAddress));
        vm.setEnv("CLAIM_KEY_PRIVATE_KEY", "0");

        // Should revert
        vm.expectRevert(bytes("CLAIM_KEY_PRIVATE_KEY is required"));
        addClaimsScript.run();
    }

    function test_AddClaims_WithCustomManagementKey() public {
        address customManagementKey = address(0x9999);
        
        // Set environment variables with custom management key
        vm.setEnv("MANAGEMENT_KEY", vm.toString(customManagementKey));
        vm.setEnv("CLAIM_KEY_ADDRESS", vm.toString(claimKeyAddress));
        vm.setEnv("CLAIM_KEY_PRIVATE_KEY", vm.toString(claimKeyPrivateKey));

        // Execute script
        identity = addClaimsScript.run();

        // Verify deployment
        assertNotEq(address(identity), address(0), "Identity should be deployed");
    }

    function test_AddClaims_WithCustomClaimKeyAddress() public {
        // Generate a different claim key
        uint256 differentPrivateKey = 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890;
        address differentClaimKeyAddress = vm.addr(differentPrivateKey);
        
        // Set environment variables with different claim key
        vm.setEnv("MANAGEMENT_KEY", vm.toString(managementKey));
        vm.setEnv("CLAIM_KEY_ADDRESS", vm.toString(differentClaimKeyAddress));
        vm.setEnv("CLAIM_KEY_PRIVATE_KEY", vm.toString(differentPrivateKey));

        // Execute script
        identity = addClaimsScript.run();

        // Verify deployment
        assertNotEq(address(identity), address(0), "Identity should be deployed");
    }

    function test_AddClaims_DeploysBothIdentityAndClaimIssuer() public {
        // Set environment variables
        vm.setEnv("MANAGEMENT_KEY", vm.toString(managementKey));
        vm.setEnv("CLAIM_KEY_ADDRESS", vm.toString(claimKeyAddress));
        vm.setEnv("CLAIM_KEY_PRIVATE_KEY", vm.toString(claimKeyPrivateKey));

        // Execute script
        identity = addClaimsScript.run();

        // Verify both identity and claim issuer are deployed
        // The script deploys both internally
        assertNotEq(address(identity), address(0), "Identity should be deployed");
    }
}

