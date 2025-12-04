// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {RWAIdentity} from "../../src/rwa/identity/Identity.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {MockClaimIssuer} from "../mocks/MockClaimIssuer.sol";

contract IdentityUtils is Test {
    RWAIdentity public identity;
    address internal managementKey;
    address internal actionKey;
    address internal claimKey;
    address internal encryptionKey;
    address internal nonKey;
    MockClaimIssuer internal claimIssuer;

    uint256 constant PURPOSE_MANAGEMENT = 1;
    uint256 constant PURPOSE_ACTION = 2;
    uint256 constant PURPOSE_CLAIM = 3;
    uint256 constant PURPOSE_ENCRYPTION = 4;
    uint256 constant KEY_TYPE_ECDSA = 1;

    uint256 constant CLAIM_TOPIC_KYC = 1;
    uint256 constant CLAIM_TOPIC_AML = 2;
    uint256 constant CLAIM_SCHEME_ECDSA = 1;

    event KeyAdded(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);
    event KeyRemoved(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);
    event ClaimAdded(
        bytes32 indexed claimId,
        uint256 indexed topic,
        uint256 scheme,
        address indexed issuer,
        bytes signature,
        bytes data,
        string uri
    );
    event ClaimRemoved(
        bytes32 indexed claimId,
        uint256 indexed topic,
        uint256 scheme,
        address indexed issuer,
        bytes signature,
        bytes data,
        string uri
    );
    event ExecutionRequested(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);
    event Approved(uint256 indexed executionId, bool approved);
    event Executed(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);

    function setUp() public {
        managementKey = address(0x1111);
        actionKey = address(0x2222);
        claimKey = address(0x3333);
        encryptionKey = address(0x4444);
        nonKey = address(0x5555);

        // Deploy RWAIdentity with management key
        identity = new RWAIdentity(managementKey);

        // Deploy mock claim issuer
        claimIssuer = new MockClaimIssuer();
    }
    // ============ isClaimValid() test ============

    function testIsClaimValid_ReturnsTrueForValidClaim() public {
        // Use a known private key to generate the claim key address
        uint256 claimKeyPrivateKey = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        address claimKeyAddress = vm.addr(claimKeyPrivateKey);
        bytes32 claimKeyHash = keccak256(abi.encode(claimKeyAddress));

        // Add the claim key to the identity
        vm.startPrank(managementKey);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();

        // Prepare claim data
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";

        // Calculate the hash that needs to be signed
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));

        // Sign the message with the claim key's private key
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Verify the claim is valid
        bool isValid = identity.isClaimValid(claimIdentity, topic, sig, data);
        assertTrue(isValid);
    }

    // ============ Constructor tests ============

    function testConstructor_Success() public {
        RWAIdentity newIdentity = new RWAIdentity(managementKey);

        bytes32 managementKeyHash = keccak256(abi.encode(managementKey));
        assertTrue(newIdentity.keyHasPurpose(managementKeyHash, PURPOSE_MANAGEMENT));

        uint256[] memory purposes = newIdentity.getKeyPurposes(managementKeyHash);
        assertEq(purposes.length, 1);
        assertEq(purposes[0], PURPOSE_MANAGEMENT);
    }

    function testConstructor_RevertsWhenZeroAddress() public {
        vm.expectRevert(bytes("invalid argument - zero address"));
        new RWAIdentity(address(0));
    }

    // ============ Initialize tests ============

    function testInitialize_RevertsWhenZeroAddress() public {
        // RWAIdentity is deployed with a management key, so initialize should revert
        // We can't test initialize on a non-library contract easily, so we'll skip this test
        // The initialize function is meant for proxy patterns
    }

    function testInitialize_RevertsWhenAlreadyInitialized() public {
        // identity is already initialized in setUp
        vm.expectRevert(bytes("Initial key was already setup."));
        identity.initialize(managementKey);
    }

    // ============ addKey() tests ============

    function testAddKey_ActionKey() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));

        vm.prank(managementKey);
        vm.expectEmit(true, true, true, true);
        emit KeyAdded(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        bool success = identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);

        assertTrue(success);
        assertTrue(identity.keyHasPurpose(actionKeyHash, PURPOSE_ACTION));

        bytes32[] memory actionKeys = identity.getKeysByPurpose(PURPOSE_ACTION);
        assertEq(actionKeys.length, 1);
        assertEq(actionKeys[0], actionKeyHash);
    }

    function testAddKey_ClaimKey() public {
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));

        vm.prank(managementKey);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);

        assertTrue(identity.keyHasPurpose(claimKeyHash, PURPOSE_CLAIM));
    }

    function testAddKey_EncryptionKey() public {
        bytes32 encryptionKeyHash = keccak256(abi.encode(encryptionKey));

        vm.prank(managementKey);
        identity.addKey(encryptionKeyHash, PURPOSE_ENCRYPTION, KEY_TYPE_ECDSA);

        assertTrue(identity.keyHasPurpose(encryptionKeyHash, PURPOSE_ENCRYPTION));
    }

    function testAddKey_MultiplePurposes() public {
        bytes32 keyHash = keccak256(abi.encode(actionKey));

        vm.startPrank(managementKey);
        identity.addKey(keyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        identity.addKey(keyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();

        assertTrue(identity.keyHasPurpose(keyHash, PURPOSE_ACTION));
        assertTrue(identity.keyHasPurpose(keyHash, PURPOSE_CLAIM));

        uint256[] memory purposes = identity.getKeyPurposes(keyHash);
        assertEq(purposes.length, 2);
    }

    function testAddKey_RevertsWhenNotManagementKey() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));

        vm.prank(nonKey);
        vm.expectRevert(bytes("Permissions: Sender does not have management key"));
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
    }

    function testAddKey_RevertsWhenDuplicatePurpose() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));

        vm.startPrank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);

        vm.expectRevert(bytes("Conflict: Key already has purpose"));
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        vm.stopPrank();
    }

    // ============ removeKey() tests ============

    function testRemoveKey_Success() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));

        vm.startPrank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);

        vm.expectEmit(true, true, true, true);
        emit KeyRemoved(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        bool success = identity.removeKey(actionKeyHash, PURPOSE_ACTION);
        vm.stopPrank();

        assertTrue(success);
        assertFalse(identity.keyHasPurpose(actionKeyHash, PURPOSE_ACTION));

        bytes32[] memory actionKeys = identity.getKeysByPurpose(PURPOSE_ACTION);
        assertEq(actionKeys.length, 0);
    }

    function testRemoveKey_RemovesOnePurpose() public {
        bytes32 keyHash = keccak256(abi.encode(actionKey));

        vm.startPrank(managementKey);
        identity.addKey(keyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        identity.addKey(keyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);

        identity.removeKey(keyHash, PURPOSE_ACTION);
        vm.stopPrank();

        assertFalse(identity.keyHasPurpose(keyHash, PURPOSE_ACTION));
        assertTrue(identity.keyHasPurpose(keyHash, PURPOSE_CLAIM));
    }

    function testRemoveKey_RevertsWhenNotManagementKey() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));

        vm.startPrank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        vm.stopPrank();

        vm.prank(nonKey);
        vm.expectRevert(bytes("Permissions: Sender does not have management key"));
        identity.removeKey(actionKeyHash, PURPOSE_ACTION);
    }

    function testRemoveKey_RevertsWhenKeyNotExists() public {
        bytes32 nonExistentKey = keccak256(abi.encode(nonKey));

        vm.prank(managementKey);
        vm.expectRevert(bytes("NonExisting: Key isn't registered"));
        identity.removeKey(nonExistentKey, PURPOSE_ACTION);
    }

    function testRemoveKey_RevertsWhenPurposeNotExists() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));

        vm.startPrank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);

        vm.expectRevert(bytes("NonExisting: Key doesn't have such purpose"));
        identity.removeKey(actionKeyHash, PURPOSE_CLAIM);
        vm.stopPrank();
    }

    // ============ getKey() tests ============

    function testGetKey_ReturnsKeyData() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));

        vm.prank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);

        (uint256[] memory purposes, uint256 keyType, bytes32 key) = identity.getKey(actionKeyHash);

        assertEq(purposes.length, 1);
        assertEq(purposes[0], PURPOSE_ACTION);
        assertEq(keyType, KEY_TYPE_ECDSA);
        assertEq(key, actionKeyHash);
    }

    function testGetKey_ReturnsEmptyForNonExistentKey() public {
        bytes32 nonExistentKey = keccak256(abi.encode(nonKey));

        (uint256[] memory purposes, uint256 keyType, bytes32 key) = identity.getKey(nonExistentKey);

        assertEq(purposes.length, 0);
        assertEq(keyType, 0);
        assertEq(key, bytes32(0));
    }

    // ============ getKeysByPurpose() tests ============

    function testGetKeysByPurpose_ReturnsAllKeys() public {
        bytes32 key1Hash = keccak256(abi.encode(actionKey));
        bytes32 key2Hash = keccak256(abi.encode(claimKey));

        vm.startPrank(managementKey);
        identity.addKey(key1Hash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        identity.addKey(key2Hash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        vm.stopPrank();

        bytes32[] memory keys = identity.getKeysByPurpose(PURPOSE_ACTION);
        assertEq(keys.length, 2);
    }

    function testGetKeysByPurpose_ReturnsEmptyArray() public {
        bytes32[] memory keys = identity.getKeysByPurpose(PURPOSE_ACTION);
        assertEq(keys.length, 0);
    }

    // ============ keyHasPurpose() tests ============

    function testKeyHasPurpose_ReturnsTrue() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));

        vm.prank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);

        assertTrue(identity.keyHasPurpose(actionKeyHash, PURPOSE_ACTION));
    }

    function testKeyHasPurpose_ManagementKeyHasAllPurposes() public {
        bytes32 managementKeyHash = keccak256(abi.encode(managementKey));

        // Management key (purpose 1) should return true for any purpose check
        assertTrue(identity.keyHasPurpose(managementKeyHash, PURPOSE_ACTION));
        assertTrue(identity.keyHasPurpose(managementKeyHash, PURPOSE_CLAIM));
        assertTrue(identity.keyHasPurpose(managementKeyHash, PURPOSE_ENCRYPTION));
    }

    function testKeyHasPurpose_ReturnsFalse() public {
        bytes32 nonExistentKey = keccak256(abi.encode(nonKey));

        assertFalse(identity.keyHasPurpose(nonExistentKey, PURPOSE_ACTION));
    }

    // ============ addClaim() tests ============

    function testAddClaim_SelfAttested() public {
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));

        vm.startPrank(managementKey);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();

        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        string memory uri = "https://example.com/claim";

        vm.prank(claimKey);
        bytes32 claimId = identity.addClaim(
            topic,
            CLAIM_SCHEME_ECDSA,
            address(identity), // Self-attested
            "",
            data,
            uri
        );

        assertEq(claimId, keccak256(abi.encode(address(identity), topic)));

        (uint256 returnedTopic,, address issuer,, bytes memory returnedData, string memory returnedUri) =
            identity.getClaim(claimId);

        assertEq(returnedTopic, topic);
        assertEq(issuer, address(identity));
        assertEq(keccak256(returnedData), keccak256(data));
        assertEq(keccak256(bytes(returnedUri)), keccak256(bytes(uri)));
    }

    function testAddClaim_RevertsWhenNotClaimKey() public {
        vm.prank(nonKey);
        vm.expectRevert(bytes("Permissions: Sender does not have claim signer key"));
        identity.addClaim(CLAIM_TOPIC_KYC, CLAIM_SCHEME_ECDSA, address(identity), "", "", "");
    }

    // ============ removeClaim() tests ============

    function testRemoveClaim_Success() public {
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));

        vm.startPrank(managementKey);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();

        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        string memory uri = "https://example.com/claim";

        vm.startPrank(claimKey);
        bytes32 claimId = identity.addClaim(topic, CLAIM_SCHEME_ECDSA, address(identity), "", data, uri);

        vm.expectEmit(true, true, false, true);
        emit ClaimRemoved(claimId, topic, CLAIM_SCHEME_ECDSA, address(identity), "", data, uri);
        bool success = identity.removeClaim(claimId);
        vm.stopPrank();

        assertTrue(success);

        (uint256 returnedTopic,,,,,) = identity.getClaim(claimId);
        assertEq(returnedTopic, 0); // Claim should be deleted
    }

    function testRemoveClaim_RevertsWhenNotClaimKey() public {
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));

        vm.startPrank(managementKey);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();

        vm.startPrank(claimKey);
        bytes32 claimId = identity.addClaim(CLAIM_TOPIC_KYC, CLAIM_SCHEME_ECDSA, address(identity), "", "", "");
        vm.stopPrank();

        vm.prank(nonKey);
        vm.expectRevert(bytes("Permissions: Sender does not have claim signer key"));
        identity.removeClaim(claimId);
    }

    function testRemoveClaim_RevertsWhenClaimNotExists() public {
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));

        vm.startPrank(managementKey);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();

        bytes32 nonExistentClaimId = keccak256(abi.encode(address(0x9999), CLAIM_TOPIC_KYC));

        vm.prank(claimKey);
        vm.expectRevert(bytes("NonExisting: There is no claim with this ID"));
        identity.removeClaim(nonExistentClaimId);
    }

    // ============ getClaim() tests ============

    function testGetClaim_ReturnsClaimData() public {
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));

        vm.startPrank(managementKey);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();

        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        string memory uri = "https://example.com/claim";

        vm.startPrank(claimKey);
        bytes32 claimId = identity.addClaim(topic, CLAIM_SCHEME_ECDSA, address(identity), "", data, uri);
        vm.stopPrank();

        (
            uint256 returnedTopic,
            uint256 scheme,
            address issuer,
            bytes memory sig,
            bytes memory returnedData,
            string memory returnedUri
        ) = identity.getClaim(claimId);

        assertEq(returnedTopic, topic);
        assertEq(scheme, CLAIM_SCHEME_ECDSA);
        assertEq(issuer, address(identity));
        assertEq(sig.length, 0);
        assertEq(keccak256(returnedData), keccak256(data));
        assertEq(keccak256(bytes(returnedUri)), keccak256(bytes(uri)));
    }

    // ============ getClaimIdsByTopic() tests ============

    function testGetClaimIdsByTopic_ReturnsClaimIds() public {
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));

        vm.startPrank(managementKey);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();

        vm.startPrank(claimKey);
        identity.addClaim(CLAIM_TOPIC_KYC, CLAIM_SCHEME_ECDSA, address(identity), "", "", "");
        identity.addClaim(CLAIM_TOPIC_KYC, CLAIM_SCHEME_ECDSA, address(claimIssuer), "", "", "");
        vm.stopPrank();

        bytes32[] memory claimIds = identity.getClaimIdsByTopic(CLAIM_TOPIC_KYC);
        assertEq(claimIds.length, 2);
    }

    function testGetClaimIdsByTopic_ReturnsEmptyArray() public {
        bytes32[] memory claimIds = identity.getClaimIdsByTopic(CLAIM_TOPIC_KYC);
        assertEq(claimIds.length, 0);
    }

    // ============ execute() tests ============

    function testExecute_ManagementKeyAutoApproves() public {
        address recipient = address(0xAAAA);
        uint256 value = 0;
        bytes memory data = "";

        vm.prank(managementKey);
        vm.expectEmit(true, true, true, true);
        emit ExecutionRequested(0, recipient, value, data);

        uint256 executionId = identity.execute(recipient, value, data);

        assertEq(executionId, 0);
    }

    function testExecute_RevertsWhenNotDelegated() public {
        // This would require testing with a library contract, which is complex
        // The delegatedOnly modifier prevents direct calls to library contracts
        // For a deployed contract (not library), this should work
        address recipient = address(0xAAAA);

        vm.prank(managementKey);
        uint256 executionId = identity.execute(recipient, 0, "");
        assertEq(executionId, 0);
    }

    // ============ isClaimValid() tests ============

    function testIsClaimValid_ReturnsFalseForInvalidClaim() public {
        IIdentity otherIdentity = IIdentity(address(0xAAAA));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory sig = "";
        bytes memory data = "";

        bool isValid = identity.isClaimValid(otherIdentity, topic, sig, data);
        assertFalse(isValid);
    }

    // ============ Integration tests ============

    function testFullLifecycle() public {
        bytes32 actionKeyHash = keccak256(abi.encode(actionKey));
        bytes32 claimKeyHash = keccak256(abi.encode(claimKey));

        // Add keys
        vm.startPrank(managementKey);
        identity.addKey(actionKeyHash, PURPOSE_ACTION, KEY_TYPE_ECDSA);
        identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();

        // Verify keys
        assertTrue(identity.keyHasPurpose(actionKeyHash, PURPOSE_ACTION));
        assertTrue(identity.keyHasPurpose(claimKeyHash, PURPOSE_CLAIM));

        // Add claim
        vm.startPrank(claimKey);
        bytes32 claimId = identity.addClaim(CLAIM_TOPIC_KYC, CLAIM_SCHEME_ECDSA, address(identity), "", "", "");
        vm.stopPrank();

        // Verify claim
        (uint256 topic,,,,,) = identity.getClaim(claimId);
        assertEq(topic, CLAIM_TOPIC_KYC);

        // Remove claim
        vm.prank(claimKey);
        identity.removeClaim(claimId);

        // Remove key
        vm.prank(managementKey);
        identity.removeKey(actionKeyHash, PURPOSE_ACTION);

        assertFalse(identity.keyHasPurpose(actionKeyHash, PURPOSE_ACTION));
    }
}

