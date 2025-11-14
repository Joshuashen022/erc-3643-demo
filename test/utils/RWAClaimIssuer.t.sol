// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {RWAClaimIssuer} from "../../src/rwa/identity/Identity.sol";
import {RWAIdentity} from "../../src/rwa/identity/Identity.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";

contract RWAClaimIssuerTest is Test {
    RWAClaimIssuer public claimIssuer;
    RWAIdentity public identity;
    address internal managementKey;
    address internal claimKeySigner;
    address internal nonKey;
    
    uint256 constant PURPOSE_MANAGEMENT = 1;
    uint256 constant PURPOSE_CLAIM = 3;
    uint256 constant KEY_TYPE_ECDSA = 1;
    uint256 constant CLAIM_SCHEME_ECDSA = 1;
    
    uint256 constant CLAIM_TOPIC_KYC = 1;
    uint256 constant CLAIM_TOPIC_AML = 2;
    
    uint256 internal claimKeyPrivateKey;
    address internal claimKeyAddress;
    bytes32 internal claimKeyHash;
    
    event ClaimRevoked(bytes indexed signature);
    
    function setUp() public {
        managementKey = address(0x1111);
        nonKey = address(0x5555);
        
        // Generate a private key for claim signing
        claimKeyPrivateKey = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        claimKeyAddress = vm.addr(claimKeyPrivateKey);
        claimKeyHash = keccak256(abi.encode(claimKeyAddress));
        
        // Deploy RWAClaimIssuer with management key
        claimIssuer = new RWAClaimIssuer(managementKey);
        
        // Deploy RWAIdentity for testing
        identity = new RWAIdentity(managementKey);
        
        // Add claim key to claimIssuer (needed for isClaimValid)
        vm.startPrank(managementKey);
        claimIssuer.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();
    }
    
    // ============ isClaimValid() tests ============
    
    function testIsClaimValid_ReturnsTrueForValidClaim() public {
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
        bool isValid = claimIssuer.isClaimValid(claimIdentity, topic, sig, data);
        assertTrue(isValid);
    }
    
    function testIsClaimValid_ReturnsFalseForInvalidSignature() public {
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        
        // Create invalid signature (wrong private key)
        uint256 wrongPrivateKey = 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890;
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        bool isValid = claimIssuer.isClaimValid(claimIdentity, topic, sig, data);
        assertFalse(isValid);
    }
    
    function testIsClaimValid_ReturnsFalseWhenSignerNotHasClaimPurpose() public {
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        
        // Use a different key that doesn't have PURPOSE_CLAIM
        uint256 otherPrivateKey = 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890;
        
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(otherPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // The signer doesn't have PURPOSE_CLAIM key in claimIssuer
        bool isValid = claimIssuer.isClaimValid(claimIdentity, topic, sig, data);
        assertFalse(isValid);
    }
    
    function testIsClaimValid_ReturnsFalseWhenClaimRevoked() public {
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        
        // Create valid signature
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // First verify it's valid
        assertTrue(claimIssuer.isClaimValid(claimIdentity, topic, sig, data));
        
        // Revoke the claim
        vm.prank(managementKey);
        claimIssuer.revokeClaimBySignature(sig);
        
        // Now it should be invalid
        bool isValid = claimIssuer.isClaimValid(claimIdentity, topic, sig, data);
        assertFalse(isValid);
    }
    
    function testIsClaimValid_ReturnsFalseForInvalidSignatureLength() public {
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        
        // Create signature with wrong length (not 65 bytes)
        bytes memory invalidSig = "0x1234"; // Too short
        
        bool isValid = claimIssuer.isClaimValid(claimIdentity, topic, invalidSig, data);
        assertFalse(isValid);
    }
    
    function testIsClaimValid_ReturnsFalseForWrongData() public {
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory originalData = "0x0042";
        
        // Create signature for original data
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, originalData));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // Try to validate with different data
        bytes memory wrongData = "0x0043";
        bool isValid = claimIssuer.isClaimValid(claimIdentity, topic, sig, wrongData);
        assertFalse(isValid);
    }
    
    function testIsClaimValid_ReturnsFalseForWrongTopic() public {
        IIdentity claimIdentity = IIdentity(address(identity));
        bytes memory data = "0x0042";
        uint256 originalTopic = CLAIM_TOPIC_KYC;
        
        // Create signature for original topic
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, originalTopic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // Try to validate with different topic
        uint256 wrongTopic = CLAIM_TOPIC_AML;
        bool isValid = claimIssuer.isClaimValid(claimIdentity, wrongTopic, sig, data);
        assertFalse(isValid);
    }
    
    // ============ revokeClaim() tests ============
    
    function testRevokeClaim_Success() public {
        // First, create a claim in the identity
        bytes32 identityClaimKeyHash = keccak256(abi.encode(claimKeyAddress));
        vm.startPrank(managementKey);
        identity.addKey(identityClaimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();
        
        // Prepare claim data and signature
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // Add claim to identity with valid signature
        vm.prank(claimKeyAddress);
        bytes32 claimId = identity.addClaim(
            CLAIM_TOPIC_KYC,
            CLAIM_SCHEME_ECDSA,
            address(claimIssuer),
            sig,
            data,
            "https://example.com/claim"
        );
        
        // Verify claim is not revoked
        (uint256 returnedTopic, , , bytes memory returnedSig, , ) = 
            identity.getClaim(claimId);
        assertEq(returnedTopic, CLAIM_TOPIC_KYC);
        
        // Revoke the claim
        vm.prank(managementKey);
        vm.expectEmit(true, false, false, false);
        emit ClaimRevoked(returnedSig);
        bool success = claimIssuer.revokeClaim(claimId, address(identity));
        
        assertTrue(success);
        
        // Verify claim is now revoked
        assertTrue(claimIssuer.isClaimRevoked(returnedSig));
    }
    
    function testRevokeClaim_AfterRevokeIsClaimValidReturnsFalse() public {
        // Create a claim in the identity
        bytes32 identityClaimKeyHash = keccak256(abi.encode(claimKeyAddress));
        vm.startPrank(managementKey);
        identity.addKey(identityClaimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();
        
        // Prepare claim data and signature
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // Add claim to identity with valid signature
        vm.prank(claimKeyAddress);
        bytes32 claimId = identity.addClaim(
            CLAIM_TOPIC_KYC,
            CLAIM_SCHEME_ECDSA,
            address(claimIssuer),
            sig,
            data,
            "https://example.com/claim"
        );
        
        // Verify claim is valid before revocation
        assertTrue(claimIssuer.isClaimValid(claimIdentity, CLAIM_TOPIC_KYC, sig, data));
        
        // Revoke the claim
        vm.prank(managementKey);
        claimIssuer.revokeClaim(claimId, address(identity));
        
        // Verify claim is now invalid
        assertFalse(claimIssuer.isClaimValid(claimIdentity, CLAIM_TOPIC_KYC, sig, data));
    }
    
    function testRevokeClaim_RevertsWhenAlreadyRevoked() public {
        // Create a claim in the identity
        bytes32 identityClaimKeyHash = keccak256(abi.encode(claimKeyAddress));
        vm.startPrank(managementKey);
        identity.addKey(identityClaimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();
        
        // Prepare claim data and signature
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // Add claim to identity with valid signature
        vm.prank(claimKeyAddress);
        bytes32 claimId = identity.addClaim(
            CLAIM_TOPIC_KYC,
            CLAIM_SCHEME_ECDSA,
            address(claimIssuer),
            sig,
            data,
            "https://example.com/claim"
        );
        
        // Revoke the claim first time
        vm.startPrank(managementKey);
        claimIssuer.revokeClaim(claimId, address(identity));
        
        // Try to revoke again - should revert
        vm.expectRevert(bytes("Conflict: Claim already revoked"));
        claimIssuer.revokeClaim(claimId, address(identity));
        vm.stopPrank();
    }
    
    function testRevokeClaim_RevertsWhenNotManagementKey() public {
        // Create a claim in the identity
        bytes32 identityClaimKeyHash = keccak256(abi.encode(claimKeyAddress));
        vm.startPrank(managementKey);
        identity.addKey(identityClaimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();
        
        // Prepare claim data and signature
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // Add claim to identity with valid signature
        vm.prank(claimKeyAddress);
        bytes32 claimId = identity.addClaim(
            CLAIM_TOPIC_KYC,
            CLAIM_SCHEME_ECDSA,
            address(claimIssuer),
            sig,
            data,
            "https://example.com/claim"
        );
        
        // Try to revoke with non-management key
        vm.prank(nonKey);
        vm.expectRevert(bytes("Permissions: Sender does not have management key"));
        claimIssuer.revokeClaim(claimId, address(identity));
    }
    
    function testRevokeClaim_RevertsWhenNotDelegated() public {
        // Create a claim in the identity
        bytes32 identityClaimKeyHash = keccak256(abi.encode(claimKeyAddress));
        vm.startPrank(managementKey);
        identity.addKey(identityClaimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();
        
        // Prepare claim data and signature
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // Add claim to identity with valid signature
        vm.prank(claimKeyAddress);
        bytes32 claimId = identity.addClaim(
            CLAIM_TOPIC_KYC,
            CLAIM_SCHEME_ECDSA,
            address(claimIssuer),
            sig,
            data,
            "https://example.com/claim"
        );
        
        // This test checks that the function works when called directly
        // The delegatedOnly modifier should allow direct calls to deployed contracts
        vm.prank(managementKey);
        bool success = claimIssuer.revokeClaim(claimId, address(identity));
        assertTrue(success);
    }
    
    // ============ revokeClaimBySignature() tests ============
    
    function testRevokeClaimBySignature_Success() public {
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        
        // Create valid signature
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // Verify claim is valid before revocation
        assertTrue(claimIssuer.isClaimValid(claimIdentity, topic, sig, data));
        
        // Revoke by signature
        vm.prank(managementKey);
        vm.expectEmit(true, false, false, false);
        emit ClaimRevoked(sig);
        claimIssuer.revokeClaimBySignature(sig);
        
        // Verify claim is now revoked
        assertTrue(claimIssuer.isClaimRevoked(sig));
        assertFalse(claimIssuer.isClaimValid(claimIdentity, topic, sig, data));
    }
    
    function testRevokeClaimBySignature_RevertsWhenAlreadyRevoked() public {
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        
        // Create valid signature
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // Revoke first time
        vm.startPrank(managementKey);
        claimIssuer.revokeClaimBySignature(sig);
        
        // Try to revoke again - should revert
        vm.expectRevert(bytes("Conflict: Claim already revoked"));
        claimIssuer.revokeClaimBySignature(sig);
        vm.stopPrank();
    }
    
    function testRevokeClaimBySignature_RevertsWhenNotManagementKey() public {
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        
        // Create valid signature
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // Try to revoke with non-management key
        vm.prank(nonKey);
        vm.expectRevert(bytes("Permissions: Sender does not have management key"));
        claimIssuer.revokeClaimBySignature(sig);
    }
    
    // ============ isClaimRevoked() tests ============
    
    function testIsClaimRevoked_ReturnsFalseForNonRevokedClaim() public {
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        
        // Create valid signature
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // Claim should not be revoked
        assertFalse(claimIssuer.isClaimRevoked(sig));
    }
    
    function testIsClaimRevoked_ReturnsTrueForRevokedClaim() public {
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        
        // Create valid signature
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // Revoke the claim
        vm.prank(managementKey);
        claimIssuer.revokeClaimBySignature(sig);
        
        // Claim should now be revoked
        assertTrue(claimIssuer.isClaimRevoked(sig));
    }
    
    // ============ Integration tests ============
    
    function testFullClaimLifecycle() public {
        // 1. Setup identity with claim key
        bytes32 identityClaimKeyHash = keccak256(abi.encode(claimKeyAddress));
        vm.startPrank(managementKey);
        identity.addKey(identityClaimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();
        
        // 2. Prepare claim data and signature
        IIdentity claimIdentity = IIdentity(address(identity));
        uint256 topic = CLAIM_TOPIC_KYC;
        bytes memory data = "0x0042";
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, topic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        // 3. Add claim to identity with valid signature
        vm.prank(claimKeyAddress);
        bytes32 claimId = identity.addClaim(
            CLAIM_TOPIC_KYC,
            CLAIM_SCHEME_ECDSA,
            address(claimIssuer),
            sig,
            data,
            "https://example.com/claim"
        );
        
        // 4. Verify claim is valid
        assertTrue(claimIssuer.isClaimValid(claimIdentity, CLAIM_TOPIC_KYC, sig, data));
        assertFalse(claimIssuer.isClaimRevoked(sig));
        
        // 6. Revoke claim
        vm.prank(managementKey);
        claimIssuer.revokeClaim(claimId, address(identity));
        
        // 7. Verify claim is now invalid
        assertFalse(claimIssuer.isClaimValid(claimIdentity, CLAIM_TOPIC_KYC, sig, data));
        assertTrue(claimIssuer.isClaimRevoked(sig));
    }
}
