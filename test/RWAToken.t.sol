// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {RWAToken} from "../src/rwa/RWAToken.sol";
import {MockCompliance} from "./mocks/MockCompliance.sol";
import {MockIdentityRegistry} from "./mocks/MockIdentityRegistry.sol";

contract RWATokenTest is Test {
    RWAToken internal rwaToken;
    MockCompliance internal compliance;
    MockIdentityRegistry internal identityRegistry;

    string private constant TOKEN_NAME = "Test Token";
    string private constant TOKEN_SYMBOL = "TT";
    uint8 private constant TOKEN_DECIMALS = 6;
    address private constant ONCHAIN_ID = address(0x123456);

    function setUp() public {
        rwaToken = new RWAToken();
        compliance = new MockCompliance();
        identityRegistry = new MockIdentityRegistry();
    }

    function testInitSetsState() public {
        rwaToken.init(
            address(identityRegistry), address(compliance), TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, ONCHAIN_ID
        );

        assertEq(rwaToken.owner(), address(this));
        assertEq(rwaToken.paused(), true);
        assertEq(rwaToken.name(), TOKEN_NAME);
        assertEq(rwaToken.symbol(), TOKEN_SYMBOL);
        assertEq(rwaToken.decimals(), TOKEN_DECIMALS);
        assertEq(rwaToken.onchainID(), ONCHAIN_ID);
        assertEq(address(rwaToken.identityRegistry()), address(identityRegistry));
        assertEq(address(rwaToken.compliance()), address(compliance));
        assertTrue(compliance.bindCalled());
        assertEq(compliance.getTokenBound(), address(rwaToken));
    }

    // transferFrom tests
    function setUpTransferFrom() internal {
        rwaToken.init(
            address(identityRegistry), address(compliance), TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, ONCHAIN_ID
        );
        // Add agent and unpause the token
        rwaToken.addAgent(address(this));
        rwaToken.unpause();
    }

    function testTransferFromSuccess() public {
        setUpTransferFrom();

        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 amount = 1000;
        uint256 allowance = 2000;

        // Setup: verify addresses, mint tokens to from, approve spender
        identityRegistry.setVerified(from, true);
        identityRegistry.setVerified(to, true);
        rwaToken.mint(from, amount * 2);
        vm.prank(from);
        rwaToken.approve(spender, allowance);

        // Execute transferFrom
        vm.prank(spender);
        bool result = rwaToken.transferFrom(from, to, amount);

        // Assertions
        assertTrue(result);
        assertEq(rwaToken.balanceOf(from), amount);
        assertEq(rwaToken.balanceOf(to), amount);
        assertEq(rwaToken.allowance(from, spender), allowance - amount);
        assertTrue(compliance.transferredCalled());
        assertEq(compliance.transferredFrom(), from);
        assertEq(compliance.transferredTo(), to);
        assertEq(compliance.transferredAmount(), amount);
    }

    function testTransferFromRevertsWhenPaused() public {
        setUpTransferFrom();

        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 amount = 1000;

        // Pause the token
        rwaToken.pause();

        // Setup
        identityRegistry.setVerified(from, true);
        identityRegistry.setVerified(to, true);
        rwaToken.mint(from, amount);
        vm.prank(from);
        rwaToken.approve(spender, amount);

        // Should revert when paused
        vm.prank(spender);
        vm.expectRevert(bytes("Pausable: paused"));
        rwaToken.transferFrom(from, to, amount);
    }

    function testTransferFromRevertsWhenFromFrozen() public {
        setUpTransferFrom();

        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 amount = 1000;

        // Setup
        identityRegistry.setVerified(from, true);
        identityRegistry.setVerified(to, true);
        rwaToken.mint(from, amount);
        vm.prank(from);
        rwaToken.approve(spender, amount);

        // Freeze from address
        rwaToken.setAddressFrozen(from, true);

        // Should revert
        vm.prank(spender);
        vm.expectRevert(bytes("wallet is frozen"));
        rwaToken.transferFrom(from, to, amount);
    }

    function testTransferFromRevertsWhenToFrozen() public {
        setUpTransferFrom();

        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 amount = 1000;

        // Setup
        identityRegistry.setVerified(from, true);
        identityRegistry.setVerified(to, true);
        rwaToken.mint(from, amount);
        vm.prank(from);
        rwaToken.approve(spender, amount);

        // Freeze to address
        rwaToken.setAddressFrozen(to, true);

        // Should revert
        vm.prank(spender);
        vm.expectRevert(bytes("wallet is frozen"));
        rwaToken.transferFrom(from, to, amount);
    }

    function testTransferFromRevertsWhenInsufficientBalance() public {
        setUpTransferFrom();

        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 balance = 1000;
        uint256 amount = 2000;

        // Setup: mint less than transfer amount
        identityRegistry.setVerified(from, true);
        identityRegistry.setVerified(to, true);
        rwaToken.mint(from, balance);
        vm.prank(from);
        rwaToken.approve(spender, amount);

        // Should revert
        vm.prank(spender);
        vm.expectRevert(bytes("Insufficient Balance"));
        rwaToken.transferFrom(from, to, amount);
    }

    function testTransferFromRevertsWhenInsufficientBalanceDueToFrozenTokens() public {
        setUpTransferFrom();

        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 balance = 2000;
        uint256 frozen = 500;
        uint256 amount = 1600; // More than available (balance - frozen = 1500)

        // Setup
        identityRegistry.setVerified(from, true);
        identityRegistry.setVerified(to, true);
        rwaToken.mint(from, balance);
        vm.prank(from);
        rwaToken.approve(spender, amount);
        rwaToken.freezePartialTokens(from, frozen);

        // Should revert
        vm.prank(spender);
        vm.expectRevert(bytes("Insufficient Balance"));
        rwaToken.transferFrom(from, to, amount);
    }

    function testTransferFromRevertsWhenToNotVerified() public {
        setUpTransferFrom();

        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 amount = 1000;

        // Setup: don't verify to address
        identityRegistry.setVerified(from, true);
        rwaToken.mint(from, amount);
        vm.prank(from);
        rwaToken.approve(spender, amount);

        // Should revert
        vm.prank(spender);
        vm.expectRevert(bytes("Transfer not possible"));
        rwaToken.transferFrom(from, to, amount);
    }

    function testTransferFromRevertsWhenComplianceDisallows() public {
        setUpTransferFrom();

        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 amount = 1000;

        // Setup
        identityRegistry.setVerified(from, true);
        identityRegistry.setVerified(to, true);
        rwaToken.mint(from, amount);
        vm.prank(from);
        rwaToken.approve(spender, amount);

        // Set compliance to disallow transfer
        compliance.setCanTransfer(false);

        // Should revert
        vm.prank(spender);
        vm.expectRevert(bytes("Transfer not possible"));
        rwaToken.transferFrom(from, to, amount);
    }

    function testTransferFromUpdatesAllowanceCorrectly() public {
        setUpTransferFrom();

        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 initialAllowance = 5000;
        uint256 transferAmount1 = 1000;
        uint256 transferAmount2 = 2000;

        // Setup
        identityRegistry.setVerified(from, true);
        identityRegistry.setVerified(to, true);
        rwaToken.mint(from, initialAllowance);
        vm.prank(from);
        rwaToken.approve(spender, initialAllowance);

        // First transfer
        vm.prank(spender);
        rwaToken.transferFrom(from, to, transferAmount1);
        assertEq(rwaToken.allowance(from, spender), initialAllowance - transferAmount1);

        // Second transfer
        vm.prank(spender);
        rwaToken.transferFrom(from, to, transferAmount2);
        assertEq(rwaToken.allowance(from, spender), initialAllowance - transferAmount1 - transferAmount2);
    }

    function testTransferFromCallsComplianceTransferred() public {
        setUpTransferFrom();

        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 amount = 1000;

        // Setup
        identityRegistry.setVerified(from, true);
        identityRegistry.setVerified(to, true);
        rwaToken.mint(from, amount);
        vm.prank(from);
        rwaToken.approve(spender, amount);

        // Execute transferFrom
        vm.prank(spender);
        rwaToken.transferFrom(from, to, amount);

        // Verify compliance.transferred was called with correct parameters
        assertTrue(compliance.transferredCalled());
        assertEq(compliance.transferredFrom(), from);
        assertEq(compliance.transferredTo(), to);
        assertEq(compliance.transferredAmount(), amount);
    }
}
