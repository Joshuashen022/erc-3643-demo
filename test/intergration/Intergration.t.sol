// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {RWAToken} from "../../src/rwa/RWAToken.sol";
import {RWACompliance} from "../../src/rwa/Compliance.sol";
import {RWAIdentityRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWAIdentityRegistryTest} from "../IdentityRegistry.t.sol";
import {RWAComplianceTest} from "../Compliance.t.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";

contract IntegrationTest is Test {
    RWAToken internal rwaToken;
    RWACompliance internal compliance;
    RWAIdentityRegistry internal identityRegistry;

    RWAIdentityRegistryTest internal identityRegistryTest;
    RWAComplianceTest internal complianceTest;

    string private constant TOKEN_NAME = "Test Token";
    string private constant TOKEN_SYMBOL = "TT";
    uint8 private constant TOKEN_DECIMALS = 6;
    address private constant ONCHAIN_ID = address(0x123456);
    
    function setUp() public {
        rwaToken = new RWAToken();
        identityRegistryTest = new RWAIdentityRegistryTest();
        complianceTest = new RWAComplianceTest();

        identityRegistryTest.setUp();
        complianceTest.setUp();
        
        compliance = complianceTest.compliance();
        identityRegistry = identityRegistryTest.identityRegistry();
        rwaToken.init(address(identityRegistry), address(compliance), TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, ONCHAIN_ID);

        rwaToken.addAgent(address(this));
        rwaToken.unpause();
        address owner = identityRegistry.owner();
        vm.prank(owner);
        identityRegistry.addAgent(owner);
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
        IIdentity identity1 = IIdentity(address(identityRegistryTest.identity1()));
        uint16 country = identityRegistryTest.COUNTRY_US();
        identityRegistry.registerIdentity(newUser, identity1, country);
        vm.stopPrank();
    }

    // ============ core tests ============
    function testSetUpRegisterIdentity_Success() public {
        address newUser = address(0x9999);
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