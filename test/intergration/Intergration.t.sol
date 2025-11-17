// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {RWAToken} from "../../src/rwa/RWAToken.sol";
import {RWACompliance} from "../../src/rwa/Compliance.sol";
import {RWAIdentityRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWAIdentityRegistryStorage} from "../../src/rwa/IdentityRegistry.sol";
import {RWATrustedIssuersRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWAClaimTopicsRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWAClaimIssuer} from "../../src/rwa/identity/Identity.sol";
import {RWAIdentity} from "../../src/rwa/identity/Identity.sol";

import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";


contract IntegrationTest is Test {
    RWAToken internal rwaToken;
    RWACompliance internal compliance;
    RWAIdentityRegistry internal identityRegistry;
    RWAIdentity public identity;
    RWAClaimIssuer public claimIssuer;

    // IdentityRegistry-related variables
    RWAIdentityRegistryStorage internal identityRegistryStorage;
    RWATrustedIssuersRegistry internal trustedIssuersRegistry;
    RWAClaimTopicsRegistry internal claimTopicsRegistry;

    uint16 constant public COUNTRY_US = 840;
    uint256 constant public CLAIM_TOPIC_KYC = 1;

    string private constant TOKEN_NAME = "Test Token";
    string private constant TOKEN_SYMBOL = "TT";
    uint8 private constant TOKEN_DECIMALS = 6;
    address private constant ONCHAIN_ID = address(0x123456);
    
    uint256 internal claimKeyPrivateKey = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    address internal claimKeyAddress;
    bytes32 internal claimKeyHash;
    address internal claimKey = address(0x3333);

    uint256 constant PURPOSE_MANAGEMENT = 1;
    uint256 constant PURPOSE_CLAIM = 3;
    uint256 constant KEY_TYPE_ECDSA = 1;
    uint256 constant CLAIM_SCHEME_ECDSA = 1;
    function setUp() public {

        // Set up Compliance
        compliance = new RWACompliance();
        compliance.init();

        // Set up IdentityRegistry components
        trustedIssuersRegistry = new RWATrustedIssuersRegistry();
        trustedIssuersRegistry.init();

        identityRegistryStorage = new RWAIdentityRegistryStorage();
        identityRegistryStorage.init();

        claimTopicsRegistry = new RWAClaimTopicsRegistry();
        claimTopicsRegistry.init();

        // Deploy IdentityRegistry
        identityRegistry = new RWAIdentityRegistry();
        identityRegistry.init(address(trustedIssuersRegistry), address(claimTopicsRegistry), address(identityRegistryStorage));
        {
            // for testing purposes, add the owner as an agent
            address owner = identityRegistry.owner();
            vm.prank(owner);
            identityRegistry.addAgent(owner);
        }

        // Bind IdentityRegistry to IdentityRegistryStorage
        vm.startPrank(identityRegistryStorage.owner());
        identityRegistryStorage.bindIdentityRegistry(address(identityRegistry));
        vm.stopPrank();

        // Set up Token
        rwaToken = new RWAToken();
        rwaToken.init(address(identityRegistry), address(compliance), TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, ONCHAIN_ID);
        {        
            // for testing purposes, add this contract as an agent
            rwaToken.addAgent(address(this));
            rwaToken.unpause();
        }
        
        setUpIdentity();
        setUpTopics();

    }

    // set up identity and claim issuer with CLAIM_TOPIC_KYC
    function setUpIdentity() internal {
        address managementKey = address(0x1111);
        claimKeyAddress = vm.addr(claimKeyPrivateKey);
        claimKeyHash = keccak256(abi.encode(claimKeyAddress));

        // Deploy claimIssuer and identity
        claimIssuer = new RWAClaimIssuer(managementKey);

        vm.startPrank(managementKey);
        claimIssuer.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
        vm.stopPrank();    
            
        identity = new RWAIdentity(managementKey);
            vm.startPrank(managementKey);
            identity.addKey(claimKeyHash, PURPOSE_CLAIM, KEY_TYPE_ECDSA);
            vm.stopPrank();

            // Create valid signature for the claim
            IIdentity claimIdentity = IIdentity(address(identity));
            bytes memory data = "";
            bytes32 dataHash = keccak256(abi.encode(claimIdentity, CLAIM_TOPIC_KYC, data));
            bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
            bytes memory sig = abi.encodePacked(r, s, v);
            
            vm.prank(claimKeyAddress);
            identity.addClaim(CLAIM_TOPIC_KYC, 1, address(claimIssuer), sig, data, "");
    }

    // set up claim topics and trusted issuer for CLAIM_TOPIC_KYC
    function setUpTopics() internal {
        
        claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC_KYC);

        // Add trusted issuer for claim topic 1 (KYC)
        uint256[] memory kycTopics = new uint256[](1);
        kycTopics[0] = CLAIM_TOPIC_KYC;
        trustedIssuersRegistry.addTrustedIssuer(IClaimIssuer(address(claimIssuer)), kycTopics);
    }

    function testInitIntergrationSetsState() public view {
        assertEq(rwaToken.owner(), address(this));
        assertEq(rwaToken.paused(), false); // Token is unpaused in setUp
        assertEq(rwaToken.name(), TOKEN_NAME);
        assertEq(rwaToken.symbol(), TOKEN_SYMBOL);
        assertEq(rwaToken.decimals(), TOKEN_DECIMALS);
        assertEq(rwaToken.onchainID(), ONCHAIN_ID);
        assertEq(address(rwaToken.identityRegistry()), address(identityRegistry));
        assertEq(address(rwaToken.compliance()), address(compliance));
        assertEq(compliance.getTokenBound(), address(rwaToken)); // Compliance should be bound to token
    }

    function setUpRegisterIdentity(address newUser) internal {
        address owner = identityRegistry.owner();
        vm.startPrank(owner);
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity)), COUNTRY_US);
        vm.stopPrank();
    }

    // ============ core tests ============
    function testSetUpRegisterIdentity_Success() public {
        address newUser = address(0x9999);
        setUpRegisterIdentity(newUser);
        assertTrue(identityRegistry.isVerified(newUser));
    }

    function testSetUpRegisterIdentityWithMoreTopics_Success() public {
        address newUser = address(0x9999);
        uint256 newTopic = 2;
        
        // Create valid signature for the new topic claim
        IIdentity claimIdentity = IIdentity(address(identity));
        bytes memory data = "";
        bytes32 dataHash = keccak256(abi.encode(claimIdentity, newTopic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        vm.prank(claimKeyAddress);
        identity.addClaim(newTopic, 1, address(claimIssuer), sig, data, "");
        uint256[] memory topics = new uint256[](2);
        topics[0] = CLAIM_TOPIC_KYC;
        topics[1] = newTopic;
        // this will replace the existing topic with the new topic
        trustedIssuersRegistry.updateIssuerClaimTopics(IClaimIssuer(address(claimIssuer)), topics);

        setUpRegisterIdentity(newUser);
        assertTrue(identityRegistry.isVerified(newUser));
    }

    // ============ transferFrom tests ============
    function testIntergrationTransferFromSuccess() public {
        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 amount = 1000;
        uint256 allowance = 2000;

        // Setup: verify addresses, mint tokens to from, approve spender
        setUpRegisterIdentity(from);
        setUpRegisterIdentity(to);
        rwaToken.mint(from, amount * 2);
        vm.prank(from);
        rwaToken.approve(spender, allowance);

        // Execute transferFrom
        vm.prank(spender);
        bool result = rwaToken.transferFrom(from, to, amount);

        // Assertions
        assertTrue(result);
        assertEq(rwaToken.balanceOf(from), amount); // Original balance was amount * 2, transferred amount
        assertEq(rwaToken.balanceOf(to), amount);
        assertEq(rwaToken.allowance(from, spender), allowance - amount);
    }

    function testIntergrationTransferFromRevertsWhenToNotVerified() public {
        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 amount = 1000;

        // Setup: only verify from address
        setUpRegisterIdentity(from);
        rwaToken.mint(from, amount);
        vm.prank(from);
        rwaToken.approve(spender, amount);

        // Should revert because to is not verified
        vm.prank(spender);
        vm.expectRevert(bytes("Transfer not possible"));
        rwaToken.transferFrom(from, to, amount);
    }

    function testIntergrationTransferFromRevertsWhenInsufficientBalance() public {
        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 balance = 1000;
        uint256 amount = 2000;

        // Setup
        setUpRegisterIdentity(from);
        setUpRegisterIdentity(to);
        rwaToken.mint(from, balance); // Mint less than transfer amount
        vm.prank(from);
        rwaToken.approve(spender, amount);

        // Should revert
        vm.prank(spender);
        vm.expectRevert(bytes("Insufficient Balance"));
        rwaToken.transferFrom(from, to, amount);
    }

    // ============ transfer tests ============
    function testIntergrationTransferSuccess() public {
        address from = address(0x1111);
        address to = address(0x2222);
        uint256 amount = 1000;

        // Setup
        setUpRegisterIdentity(from);
        setUpRegisterIdentity(to);
        rwaToken.mint(from, amount * 2);

        // Execute transfer
        vm.prank(from);
        bool result = rwaToken.transfer(to, amount);

        // Assertions
        assertTrue(result);
        assertEq(rwaToken.balanceOf(from), amount);
        assertEq(rwaToken.balanceOf(to), amount);
    }

    function testIntergrationTransferRevertsWhenToNotVerified() public {
        address from = address(0x1111);
        address to = address(0x2222);
        uint256 amount = 1000;

        // Setup: only verify from address
        setUpRegisterIdentity(from);
        rwaToken.mint(from, amount);

        // Should revert
        vm.prank(from);
        vm.expectRevert(bytes("Transfer not possible"));
        rwaToken.transfer(to, amount);
    }

    // ============ mint tests ============
    function testIntergrationMintSuccess() public {
        address to = address(0x1111);
        uint256 amount = 1000;

        // Setup: verify address
        setUpRegisterIdentity(to);

        // Execute mint
        rwaToken.mint(to, amount);

        // Assertions
        assertEq(rwaToken.balanceOf(to), amount);
        assertEq(rwaToken.totalSupply(), amount);
    }

    function testIntergrationMintRevertsWhenToNotVerified() public {
        address to = address(0x1111);
        uint256 amount = 1000;

        // Should revert because to is not verified
        vm.expectRevert(bytes("Identity is not verified."));
        rwaToken.mint(to, amount);
    }

    // ============ burn tests ============
    function testIntergrationBurnSuccess() public {
        address user = address(0x1111);
        uint256 mintAmount = 1000;
        uint256 burnAmount = 500;

        // Setup
        setUpRegisterIdentity(user);
        rwaToken.mint(user, mintAmount);

        // Execute burn
        rwaToken.burn(user, burnAmount);

        // Assertions
        assertEq(rwaToken.balanceOf(user), mintAmount - burnAmount);
        assertEq(rwaToken.totalSupply(), mintAmount - burnAmount);
    }

    // ============ compliance integration tests ============
    function testIntergrationComplianceCanTransferWhenNoModules() public view {
        address from = address(0x1111);
        address to = address(0x2222);
        uint256 amount = 1000;

        // Compliance should allow transfers when no modules are added
        assertTrue(compliance.canTransfer(from, to, amount));
    }

    function testIntergrationComplianceIsBoundToToken() public view {
        assertEq(compliance.getTokenBound(), address(rwaToken));
    }

    // ============ full lifecycle test ============
    function testIntergrationFullLifecycle() public {
        address user1 = address(0x1111);
        address user2 = address(0x2222);
        uint256 mintAmount = 1000;
        uint256 transferAmount = 500;

        // Register identities
        setUpRegisterIdentity(user1);
        setUpRegisterIdentity(user2);

        // Mint tokens to user1
        rwaToken.mint(user1, mintAmount);
        assertEq(rwaToken.balanceOf(user1), mintAmount);

        // Transfer from user1 to user2
        vm.prank(user1);
        rwaToken.transfer(user2, transferAmount);
        assertEq(rwaToken.balanceOf(user1), mintAmount - transferAmount);
        assertEq(rwaToken.balanceOf(user2), transferAmount);

        // Burn tokens from user1
        rwaToken.burn(user1, transferAmount);
        assertEq(rwaToken.balanceOf(user1), mintAmount - transferAmount * 2);
        assertEq(rwaToken.totalSupply(), mintAmount - transferAmount);
    }
}