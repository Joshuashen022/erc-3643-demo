// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {Identity} from "../../src/rwa/identity/Identity.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {MockClaimIssuer} from "../mocks/MockClaimIssuer.sol";

/**
 * @title IdentityTest
 * @dev Simple test cases for Identity.sol demonstrating key features
 * Key Purposes:
 * - 1 = MANAGEMENT
 * - 2 = ACTION
 * - 3 = CLAIM
 * - 4 = ENCRYPTION
 */
contract IdentityTest is Test {
    Identity public identity;
    MockClaimIssuer internal claimIssuer;
    
    address internal managementKey;
    address internal actionKey;
    address internal claimKey;
    address internal encryptionKey;
    
    // Key purposes
    uint256 constant PURPOSE_MANAGEMENT = 1;
    uint256 constant PURPOSE_ACTION = 2;
    uint256 constant PURPOSE_CLAIM = 3;
    uint256 constant PURPOSE_ENCRYPTION = 4;
    
    // Key types
    uint256 constant KEY_TYPE_ECDSA = 1;
    uint256 constant KEY_TYPE_RSA = 2;

    function setUp() public {
        // Create test addresses
        managementKey = address(0x1111);
        actionKey = address(0x2222);
        claimKey = address(0x3333);
        encryptionKey = address(0x4444);
        
        // Deploy Identity with initial management key
        identity = new Identity(managementKey);
        
        // Deploy mock claim issuer
        claimIssuer = new MockClaimIssuer();
    }

    // ============ Key Management Tests ============

    /**
     * @dev Test adding keys with different purposes
     */
    function test_AddKeys() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));
        bytes32 encryptionKeyHash = keccak256(abi.encode(encryptionKey));
        
        // Add action key
        vm.prank(managementKey);
        bool success = identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        assertTrue(success);
        
        // Add claim key
        vm.prank(managementKey);
        success = identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        assertTrue(success);
        
        // Add encryption key
        vm.prank(managementKey);
        success = identity.addKey(encryptionKeyHash, PURPOSE_ENCRYPTION, KEY_TYPE_RSA);
        assertTrue(success);
        
        // Verify keys were added
        assertTrue(identity.keyHasPurpose(actionKeyHash, PURPOSE_ACTION));
        assertTrue(identity.keyHasPurpose(claimKeyHash, PURPOSE_CLAIM));
        assertTrue(identity.keyHasPurpose(encryptionKeyHash, PURPOSE_ENCRYPTION));
    }

    /**
     * @dev Test getting key information
     */
    function test_GetKey() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));
        
        // Add key
        vm.prank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        
        // Get key information
        (uint256[] memory purposes, uint256 keyType, bytes32 key) = identity.getKey(actionKeyHash);
        
        assertEq(purposes.length, 1);
        assertEq(purposes[0], PURPOSE_ACTION);
        assertEq(keyType, KEY_TYPE_ECDSA);
        assertEq(key, actionKeyHash);
    }

    /**
     * @dev Test getting key purposes
     */
    function test_GetKeyPurposes() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));
        
        // Add key with multiple purposes
        vm.prank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        vm.prank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        
        // Get purposes
        uint256[] memory purposes = identity.getKeyPurposes(actionKeyHash);
        
        assertEq(purposes.length, 2);
        assertTrue(purposes[0] == PURPOSE_ACTION || purposes[1] == PURPOSE_ACTION);
        assertTrue(purposes[0] == PURPOSE_CLAIM || purposes[1] == PURPOSE_CLAIM);
    }

    /**
     * @dev Test getting keys by purpose
     */
    function test_GetKeysByPurpose() public {
        bytes32 actionKey1Hash = keccak256(abi.encode(actionKey));
        bytes32 actionKey2Hash = keccak256(abi.encode(address(0x5555)));
        
        // Add multiple action keys
        vm.prank(managementKey);
        identity.addKey(actionKey1Hash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        vm.prank(managementKey);
        identity.addKey(actionKey2Hash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        
        // Get all action keys
        bytes32[] memory actionKeys = identity.getKeysByPurpose(PURPOSE_ACTION);
        
        assertGe(actionKeys.length, 2);
        bool found1 = false;
        bool found2 = false;
        for (uint256 i = 0; i < actionKeys.length; i++) {
            if (actionKeys[i] == actionKey1Hash) found1 = true;
            if (actionKeys[i] == actionKey2Hash) found2 = true;
        }
        assertTrue(found1);
        assertTrue(found2);
    }

    /**
     * @dev Test that management keys can act as any purpose
     */
    function test_ManagementKeyActsAsAnyPurpose() public view {
        bytes32 managementKeyHash = keccak256(abi.encode(managementKey));
        
        // Management key should have management purpose
        assertTrue(identity.keyHasPurpose(managementKeyHash, PURPOSE_MANAGEMENT));
        
        // Management key should also act as action key
        assertTrue(identity.keyHasPurpose(managementKeyHash, PURPOSE_ACTION));
        
        // Management key should also act as claim key
        assertTrue(identity.keyHasPurpose(managementKeyHash, PURPOSE_CLAIM));
    }

    /**
     * @dev Test removing key purposes
     */
    function test_RemoveKeyPurpose() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));
        
        // Add key with multiple purposes
        vm.prank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        vm.prank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        
        // Remove action purpose
        vm.prank(managementKey);
        bool success = identity.removeKey(actionKeyHash, PURPOSE_ACTION);
        assertTrue(success);
        
        // Verify action purpose removed but claim purpose remains
        assertFalse(identity.keyHasPurpose(actionKeyHash, PURPOSE_ACTION));
        assertTrue(identity.keyHasPurpose(actionKeyHash, PURPOSE_CLAIM));
    }

    // ============ Execution Management Tests ============

    /**
     * @dev Test executing a transaction with management key (auto-approved)
     */
    function test_ExecuteTransaction_ManagementKey() public {
        address recipient = address(0x9999);
        uint256 value = 1 ether;
        bytes memory data = "";
        
        // Fund the caller so it can send value to the identity contract
        vm.deal(managementKey, value);
        
        // Execute transaction with management key (auto-approved)
        // The value is sent from caller to identity, then identity sends it to recipient
        vm.prank(managementKey);
        uint256 executionId = identity.execute{value: value}(recipient, value, data);
        
        assertEq(executionId, 0);
        assertEq(recipient.balance, value);
    }

    /**
     * @dev Test executing a transaction with action key (auto-approved for external calls)
     */
    function test_ExecuteTransaction_ActionKey() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));
        
        // Add action key
        vm.prank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        
        address recipient = address(0x9999);
        uint256 value = 1 ether;
        bytes memory data = "";
        
        // Fund the caller so it can send value to the identity contract
        vm.deal(actionKey, value);
        
        // Execute transaction with action key
        // The value is sent from caller to identity, then identity sends it to recipient
        vm.prank(actionKey);
        uint256 executionId = identity.execute{value: value}(recipient, value, data);
        
        assertEq(executionId, 0);
        assertEq(recipient.balance, value);
    }

    /**
     * @dev Test approving an execution request
     */
    function test_ApproveExecution() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));
        
        // Add action key
        vm.prank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        
        address recipient = address(0x9999);
        uint256 value = 1 ether;
        bytes memory data = "";
        
        // Create execution request (from identity itself, requires approval)
        // Fund the identity contract so it can send value
        vm.deal(address(identity), value);
        vm.prank(address(identity));
        uint256 executionId = identity.execute(recipient, value, data);
        
        // Approve execution with management key
        vm.prank(managementKey);
        bool success = identity.approve(executionId, true);
        
        assertTrue(success);
        assertEq(recipient.balance, value);
    }

    // ============ Claim Management Tests ============

    /**
     * @dev Test adding a claim
     */
    function test_AddClaim() public {
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));
        
        // Add claim key
        vm.prank(managementKey);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        
        uint256 topic = 1;
        uint256 scheme = 1;
        bytes memory signature = "";
        bytes memory data = "claim data";
        string memory uri = "https://example.com/claim";
        
        // Add claim
        vm.prank(claimKey);
        bytes32 claimId = identity.addClaim(
            topic,
            scheme,
            address(claimIssuer),
            signature,
            data,
            uri
        );
        
        // Verify claim was added
        assertEq(claimId, keccak256(abi.encode(address(claimIssuer), topic)));
        
        (uint256 claimTopic, uint256 claimScheme, address issuer, , , ) = identity.getClaim(claimId);
        assertEq(claimTopic, topic);
        assertEq(claimScheme, scheme);
        assertEq(issuer, address(claimIssuer));
    }

    /**
     * @dev Test getting claims by topic
     */
    function test_GetClaimsByTopic() public {
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));
        
        // Add claim key
        vm.prank(managementKey);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        
        // Create a second claim issuer for testing
        MockClaimIssuer claimIssuer2 = new MockClaimIssuer();
        
        uint256 topic = 1;
        bytes memory signature = "";
        bytes memory data = "claim data";
        string memory uri = "https://example.com/claim";
        
        // Add multiple claims with same topic but different issuers
        // Note: Claim ID is keccak256(issuer, topic), so different issuers = different claim IDs
        vm.prank(claimKey);
        bytes32 claimId1 = identity.addClaim(topic, 1, address(claimIssuer), signature, data, uri);
        
        vm.prank(claimKey);
        bytes32 claimId2 = identity.addClaim(topic, 1, address(claimIssuer2), signature, data, uri);
        
        // Get claims by topic
        bytes32[] memory claimIds = identity.getClaimIdsByTopic(topic);
        
        assertGe(claimIds.length, 2);
        
        // Verify both claims are in the list
        bool found1 = false;
        bool found2 = false;
        for (uint256 i = 0; i < claimIds.length; i++) {
            if (claimIds[i] == claimId1) found1 = true;
            if (claimIds[i] == claimId2) found2 = true;
        }
        assertTrue(found1);
        assertTrue(found2);
    }

    /**
     * @dev Test removing a claim
     */
    function test_RemoveClaim() public {
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));
        
        // Add claim key
        vm.prank(managementKey);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        
        uint256 topic = 1;
        bytes memory signature = "";
        bytes memory data = "claim data";
        string memory uri = "https://example.com/claim";
        
        // Add claim
        vm.prank(claimKey);
        bytes32 claimId = identity.addClaim(
            topic,
            1,
            address(claimIssuer),
            signature,
            data,
            uri
        );
        
        // Remove claim
        vm.prank(claimKey);
        bool success = identity.removeClaim(claimId);
        assertTrue(success);
        
        // Verify claim was removed (issuer will be zero address)
        (, , address issuer, , , ) = identity.getClaim(claimId);
        assertEq(issuer, address(0));
    }

    // ============ Claim Validation Tests ============

    /**
     * @dev Test validating a claim
     */
    function test_IsClaimValid() public {
        // Create a test identity for validation
        Identity testIdentity = new Identity(address(0xAAAA));
        
        // Add a claim key to test identity
        bytes32 testClaimKeyHash = keccak256(abi.encode(address(0xBBBB)));
        vm.prank(address(0xAAAA));
        testIdentity.addKey(testClaimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        
        // Validate claim (using mock claim issuer which always returns true)
        bool isValid = identity.isClaimValid(
            IIdentity(address(testIdentity)),
            1,
            "",
            ""
        );
        
        // Note: This will return false because the signature doesn't match
        // but demonstrates the validation flow
        assertFalse(isValid); // Will be false without proper signature
    }

    // ============ Integration Tests ============

    /**
     * @dev Test full lifecycle: add keys, add claims, execute transactions
     */
    function test_FullLifecycle() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));
        
        // 1. Add keys
        vm.prank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        vm.prank(managementKey);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        
        // 2. Add claim
        vm.prank(claimKey);
        bytes32 claimId = identity.addClaim(
            1,
            1,
            address(claimIssuer),
            "",
            "data",
            "uri"
        );
        
        // 3. Execute transaction
        address recipient = address(0x9999);
        uint256 value = 1 ether;
        // Fund the caller so it can send value to the identity contract
        vm.deal(actionKey, value);
        vm.prank(actionKey);
        identity.execute{value: value}(recipient, value, "");
        
        // 4. Verify everything
        assertTrue(identity.keyHasPurpose(actionKeyHash, PURPOSE_ACTION));
        assertTrue(identity.keyHasPurpose(claimKeyHash, PURPOSE_CLAIM));
        (uint256 topic, , , , , ) = identity.getClaim(claimId);
        assertEq(topic, 1);
        assertEq(recipient.balance, value);
    }
}

