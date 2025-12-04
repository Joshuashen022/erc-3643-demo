// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {ERC3643TestBase} from "../lib/ERC3643TestBase.sol";
import {IIdentity} from "../../lib/solidity/contracts/interface/IIdentity.sol";
import {IClaimIssuer} from "../../lib/solidity/contracts/interface/IClaimIssuer.sol";

contract MockCompliance {
    function canTransfer(address from, address to, uint256 amount) external view returns (bool) {
        return true;
    }
    function transferred(address from, address to, uint256 amount) external {}
    function created(address to, uint256 amount) external {}
    function destroyed(address from, uint256 amount) external {}
    function bindToken(address token) external {}
    function unbindToken(address token) external {}
}

contract MockIdentityRegistry {
    function isVerified(address user) external view returns (bool) {
        return true;
    }
}

// start as an ERC3643 token and downgrade to an ERC20 token
// 1. deploy an ERC3643 token
// 2. switch the compliance to a MockCompliance
// 3. switch the identity registry to a MockIdentityRegistry
// 4. check the token is an ERC20 token
// 5. switch back to an ERC3643 token
// 6. check the token is an ERC3643 token
contract DownToERC20Test is ERC3643TestBase {
    // Event definitions for testing
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function setUp() public {
        setUpBase();

        // switch the compliance to a MockCompliance
        MockCompliance mockCompliance = new MockCompliance();
        MockIdentityRegistry mockIdentityRegistry = new MockIdentityRegistry();

        vm.prank(suiteOwner);
        rwaToken.setCompliance(address(mockCompliance));
        vm.prank(suiteOwner);
        rwaToken.setIdentityRegistry(address(mockIdentityRegistry));
    }

    // ============ ERC20 Metadata Tests ============
    function test_ERC20_Metadata() public view {
        string memory name = rwaToken.name();
        string memory symbol = rwaToken.symbol();
        uint8 decimals = rwaToken.decimals();

        assertEq(keccak256(abi.encodePacked(name)), keccak256(abi.encodePacked("TREX Token")));
        assertEq(keccak256(abi.encodePacked(symbol)), keccak256(abi.encodePacked("TREX")));
        assertEq(decimals, 18);
    }

    // ============ ERC20 Balance and Supply Tests ============
    function test_ERC20_InitialBalanceAndSupply() public view {
        uint256 totalSupply = rwaToken.totalSupply();
        uint256 ownerBalance = rwaToken.balanceOf(rwaToken.owner());

        // Initially, there should be no tokens minted
        assertEq(totalSupply, 0);
        assertEq(ownerBalance, 0);
    }

    function test_ERC20_BalanceOf() public {
        address user = address(0x123);
        uint256 initialBalance = rwaToken.balanceOf(user);
        assertEq(initialBalance, 0);
    }

    // ============ ERC20 Mint Tests ============
    function test_ERC20_Mint() public {
        address owner = rwaToken.owner();
        address recipient = address(0x123);
        uint256 mintAmount = 1000 * 10 ** 18;

        uint256 initialSupply = rwaToken.totalSupply();
        uint256 initialBalance = rwaToken.balanceOf(recipient);

        // Mint tokens as owner (who is also an agent)
        vm.prank(owner);
        rwaToken.mint(recipient, mintAmount);

        assertEq(rwaToken.totalSupply(), initialSupply + mintAmount);
        assertEq(rwaToken.balanceOf(recipient), initialBalance + mintAmount);
    }

    function test_ERC20_Mint_EmitsTransfer() public {
        address owner = rwaToken.owner();
        address recipient = address(0x123);
        uint256 mintAmount = 1000 * 10 ** 18;

        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), recipient, mintAmount);
        rwaToken.mint(recipient, mintAmount);
    }

    function test_ERC20_Mint_RevertsIfNotAgent() public {
        address nonAgent = address(0x999);
        address recipient = address(0x123);
        uint256 mintAmount = 1000 * 10 ** 18;

        vm.prank(nonAgent);
        vm.expectRevert();
        rwaToken.mint(recipient, mintAmount);
    }

    // ============ ERC20 Transfer Tests ============
    function test_ERC20_Transfer() public {
        address owner = rwaToken.owner();
        address sender = address(0x111);
        address recipient = address(0x222);
        uint256 mintAmount = 1000 * 10 ** 18;
        uint256 transferAmount = 500 * 10 ** 18;

        // First mint tokens to sender
        vm.prank(owner);
        rwaToken.mint(sender, mintAmount);

        uint256 senderInitialBalance = rwaToken.balanceOf(sender);
        uint256 recipientInitialBalance = rwaToken.balanceOf(recipient);

        // Transfer tokens
        vm.prank(sender);
        bool success = rwaToken.transfer(recipient, transferAmount);

        assertTrue(success);
        assertEq(rwaToken.balanceOf(sender), senderInitialBalance - transferAmount);
        assertEq(rwaToken.balanceOf(recipient), recipientInitialBalance + transferAmount);
    }

    function test_ERC20_Transfer_EmitsTransfer() public {
        address owner = rwaToken.owner();
        address sender = address(0x111);
        address recipient = address(0x222);
        uint256 mintAmount = 1000 * 10 ** 18;
        uint256 transferAmount = 500 * 10 ** 18;

        vm.prank(owner);
        rwaToken.mint(sender, mintAmount);

        vm.prank(sender);
        vm.expectEmit(true, true, false, true);
        emit Transfer(sender, recipient, transferAmount);
        rwaToken.transfer(recipient, transferAmount);
    }

    function test_ERC20_Transfer_RevertsIfInsufficientBalance() public {
        address owner = rwaToken.owner();
        address sender = address(0x111);
        address recipient = address(0x222);
        uint256 mintAmount = 100 * 10 ** 18;
        uint256 transferAmount = 200 * 10 ** 18;

        vm.prank(owner);
        rwaToken.mint(sender, mintAmount);

        vm.prank(sender);
        vm.expectRevert();
        rwaToken.transfer(recipient, transferAmount);
    }

    function test_ERC20_Transfer_ZeroAmount() public {
        address owner = rwaToken.owner();
        address sender = address(0x111);
        address recipient = address(0x222);
        uint256 mintAmount = 1000 * 10 ** 18;

        vm.prank(owner);
        rwaToken.mint(sender, mintAmount);

        uint256 senderInitialBalance = rwaToken.balanceOf(sender);
        uint256 recipientInitialBalance = rwaToken.balanceOf(recipient);

        vm.prank(sender);
        bool success = rwaToken.transfer(recipient, 0);

        assertTrue(success);
        assertEq(rwaToken.balanceOf(sender), senderInitialBalance);
        assertEq(rwaToken.balanceOf(recipient), recipientInitialBalance);
    }

    // ============ ERC20 Approval Tests ============
    function test_ERC20_Approve() public {
        address owner = rwaToken.owner();
        address spender = address(0x333);
        uint256 approveAmount = 500 * 10 ** 18;

        vm.prank(owner);
        bool success = rwaToken.approve(spender, approveAmount);

        assertTrue(success);
        assertEq(rwaToken.allowance(owner, spender), approveAmount);
    }

    function test_ERC20_Approve_EmitsApproval() public {
        address owner = rwaToken.owner();
        address spender = address(0x333);
        uint256 approveAmount = 500 * 10 ** 18;

        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit Approval(owner, spender, approveAmount);
        rwaToken.approve(spender, approveAmount);
    }

    function test_ERC20_Approve_CanUpdateAllowance() public {
        address owner = rwaToken.owner();
        address spender = address(0x333);
        uint256 firstAmount = 500 * 10 ** 18;
        uint256 secondAmount = 1000 * 10 ** 18;

        vm.prank(owner);
        rwaToken.approve(spender, firstAmount);
        assertEq(rwaToken.allowance(owner, spender), firstAmount);

        vm.prank(owner);
        rwaToken.approve(spender, secondAmount);
        assertEq(rwaToken.allowance(owner, spender), secondAmount);
    }

    function test_ERC20_Approve_CanSetToZero() public {
        address owner = rwaToken.owner();
        address spender = address(0x333);
        uint256 approveAmount = 500 * 10 ** 18;

        vm.prank(owner);
        rwaToken.approve(spender, approveAmount);

        vm.prank(owner);
        rwaToken.approve(spender, 0);
        assertEq(rwaToken.allowance(owner, spender), 0);
    }

    // ============ ERC20 TransferFrom Tests ============
    function test_ERC20_TransferFrom() public {
        address owner = rwaToken.owner();
        address tokenOwner = address(0x111);
        address spender = address(0x222);
        address recipient = address(0x333);
        uint256 mintAmount = 1000 * 10 ** 18;
        uint256 approveAmount = 500 * 10 ** 18;
        uint256 transferAmount = 300 * 10 ** 18;

        // Mint tokens to tokenOwner
        vm.prank(owner);
        rwaToken.mint(tokenOwner, mintAmount);

        // Approve spender
        vm.prank(tokenOwner);
        rwaToken.approve(spender, approveAmount);

        uint256 tokenOwnerInitialBalance = rwaToken.balanceOf(tokenOwner);
        uint256 recipientInitialBalance = rwaToken.balanceOf(recipient);
        uint256 initialAllowance = rwaToken.allowance(tokenOwner, spender);

        // TransferFrom
        vm.prank(spender);
        bool success = rwaToken.transferFrom(tokenOwner, recipient, transferAmount);

        assertTrue(success);
        assertEq(rwaToken.balanceOf(tokenOwner), tokenOwnerInitialBalance - transferAmount);
        assertEq(rwaToken.balanceOf(recipient), recipientInitialBalance + transferAmount);
        assertEq(rwaToken.allowance(tokenOwner, spender), initialAllowance - transferAmount);
    }

    function test_ERC20_TransferFrom_EmitsTransfer() public {
        address owner = rwaToken.owner();
        address tokenOwner = address(0x111);
        address spender = address(0x222);
        address recipient = address(0x333);
        uint256 mintAmount = 1000 * 10 ** 18;
        uint256 approveAmount = 500 * 10 ** 18;
        uint256 transferAmount = 300 * 10 ** 18;

        vm.prank(owner);
        rwaToken.mint(tokenOwner, mintAmount);

        vm.prank(tokenOwner);
        rwaToken.approve(spender, approveAmount);

        vm.prank(spender);
        vm.expectEmit(true, true, false, true);
        emit Transfer(tokenOwner, recipient, transferAmount);
        rwaToken.transferFrom(tokenOwner, recipient, transferAmount);
    }

    function test_ERC20_TransferFrom_RevertsIfInsufficientAllowance() public {
        address owner = rwaToken.owner();
        address tokenOwner = address(0x111);
        address spender = address(0x222);
        address recipient = address(0x333);
        uint256 mintAmount = 1000 * 10 ** 18;
        uint256 approveAmount = 200 * 10 ** 18;
        uint256 transferAmount = 500 * 10 ** 18;

        vm.prank(owner);
        rwaToken.mint(tokenOwner, mintAmount);

        vm.prank(tokenOwner);
        rwaToken.approve(spender, approveAmount);

        vm.prank(spender);
        vm.expectRevert();
        rwaToken.transferFrom(tokenOwner, recipient, transferAmount);
    }

    function test_ERC20_TransferFrom_RevertsIfInsufficientBalance() public {
        address owner = rwaToken.owner();
        address tokenOwner = address(0x111);
        address spender = address(0x222);
        address recipient = address(0x333);
        uint256 mintAmount = 100 * 10 ** 18;
        uint256 approveAmount = 500 * 10 ** 18;
        uint256 transferAmount = 200 * 10 ** 18;

        vm.prank(owner);
        rwaToken.mint(tokenOwner, mintAmount);

        vm.prank(tokenOwner);
        rwaToken.approve(spender, approveAmount);

        vm.prank(spender);
        vm.expectRevert();
        rwaToken.transferFrom(tokenOwner, recipient, transferAmount);
    }

    // ============ ERC20 Allowance Tests ============
    function test_ERC20_Allowance_InitialIsZero() public view {
        address owner = address(0x111);
        address spender = address(0x222);

        assertEq(rwaToken.allowance(owner, spender), 0);
    }

    function test_ERC20_Allowance_AfterApproval() public {
        address owner = address(0x111);
        address spender = address(0x222);
        uint256 approveAmount = 500 * 10 ** 18;

        vm.prank(owner);
        rwaToken.approve(spender, approveAmount);

        assertEq(rwaToken.allowance(owner, spender), approveAmount);
    }

    // ============ ERC20 Total Supply Tests ============
    function test_ERC20_TotalSupply_IncreasesOnMint() public {
        address owner = rwaToken.owner();
        address recipient1 = address(0x111);
        address recipient2 = address(0x222);
        uint256 mintAmount1 = 1000 * 10 ** 18;
        uint256 mintAmount2 = 500 * 10 ** 18;

        uint256 initialSupply = rwaToken.totalSupply();

        vm.prank(owner);
        rwaToken.mint(recipient1, mintAmount1);
        assertEq(rwaToken.totalSupply(), initialSupply + mintAmount1);

        vm.prank(owner);
        rwaToken.mint(recipient2, mintAmount2);
        assertEq(rwaToken.totalSupply(), initialSupply + mintAmount1 + mintAmount2);
    }

    function test_ERC20_TotalSupply_UnaffectedByTransfer() public {
        address owner = rwaToken.owner();
        address sender = address(0x111);
        address recipient = address(0x222);
        uint256 mintAmount = 1000 * 10 ** 18;
        uint256 transferAmount = 500 * 10 ** 18;

        vm.prank(owner);
        rwaToken.mint(sender, mintAmount);

        uint256 supplyBeforeTransfer = rwaToken.totalSupply();

        vm.prank(sender);
        rwaToken.transfer(recipient, transferAmount);

        assertEq(rwaToken.totalSupply(), supplyBeforeTransfer);
    }

    // Switch back to an ERC3643 token
    // ============ Register Identity Tests ============

    function switchBackToERC3643() public {
        vm.prank(suiteOwner);
        rwaToken.setCompliance(address(compliance));
        vm.prank(suiteOwner);
        rwaToken.setIdentityRegistry(address(identityRegistry));
    }

    function test_SwitchBackToERC3643_Success() public {
        switchBackToERC3643();
        assertTrue(address(rwaToken.compliance()) == address(compliance));
        assertTrue(address(rwaToken.identityRegistry()) == address(identityRegistry));
    }

    function test_RegisterIdentity_Success() public {
        address newUser = address(0x9999);
        switchBackToERC3643();
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity)), 840);
        assertTrue(identityRegistry.isVerified(newUser));
    }

    function test_RegisterNewIdentity_Success() public {
        switchBackToERC3643();
        address newIdentityManagementKey = address(0x1111);
        initializeIdentity(newIdentityManagementKey, "newIdentity");
        assertTrue(identityRegistry.isVerified(newIdentityManagementKey));
    }

    // ============ transferFrom tests ============
    function test_TransferFromSuccess() public {
        switchBackToERC3643();
        address from = address(0x1111);
        address to = address(0x2222);
        address spender = address(0x3333);
        uint256 amount = 1000;
        uint256 allowance = 2000;

        // Setup: verify addresses, mint tokens to from, approve spender
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(from, IIdentity(address(identity)), 840);
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(to, IIdentity(address(identity)), 840);
        vm.prank(suiteOwner);
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

    // ============ transfer tests ============
    function test_TransferSuccess() public {
        switchBackToERC3643();
        address from = address(0x1111);
        address to = address(0x2222);
        uint256 amount = 1000;

        // Setup
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(from, IIdentity(address(identity)), 840);
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(to, IIdentity(address(identity)), 840);
        vm.prank(suiteOwner);
        rwaToken.mint(from, amount * 2);

        // Execute transfer
        vm.prank(from);
        bool result = rwaToken.transfer(to, amount);

        // Assertions
        assertTrue(result);
        assertEq(rwaToken.balanceOf(from), amount);
        assertEq(rwaToken.balanceOf(to), amount);
    }

    // ============ mint tests ============
    function test_MintSuccess() public {
        switchBackToERC3643();
        address to = address(0x1111);
        uint256 amount = 1000;

        // Setup: verify address
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(to, IIdentity(address(identity)), 840);

        // Execute mint
        vm.prank(suiteOwner);
        rwaToken.mint(to, amount);

        // Assertions
        assertEq(rwaToken.balanceOf(to), amount);
        assertEq(rwaToken.totalSupply(), amount);
    }

    // ============ burn tests ============
    function test_BurnSuccess() public {
        switchBackToERC3643();
        address user = address(0x1111);
        uint256 mintAmount = 1000;
        uint256 burnAmount = 500;

        // Setup
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(user, IIdentity(address(identity)), 840);
        vm.prank(suiteOwner);
        rwaToken.mint(user, mintAmount);

        // Execute burn
        vm.prank(suiteOwner);
        rwaToken.burn(user, burnAmount);

        // Assertions
        assertEq(rwaToken.balanceOf(user), mintAmount - burnAmount);
        assertEq(rwaToken.totalSupply(), mintAmount - burnAmount);
    }
}
