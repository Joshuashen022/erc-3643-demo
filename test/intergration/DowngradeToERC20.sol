// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeployERC3643} from "../../script/DeployERC3643.s.sol";
import {TREXImplementationAuthority} from "../../lib/ERC-3643/contracts/proxy/authority/TREXImplementationAuthority.sol";
import {TREXFactory} from "../../lib/ERC-3643/contracts/factory/TREXFactory.sol";
import {TREXGateway} from "../../lib/ERC-3643/contracts/factory/TREXGateway.sol";
import {IIdentity} from "../../lib/solidity/contracts/interface/IIdentity.sol";
import {IClaimIssuer} from "../../lib/solidity/contracts/interface/IClaimIssuer.sol";
import {RWAIdentityIdFactory} from "../../src/rwa/proxy/RWAIdentityIdFactory.sol";

import {RWAClaimIssuer, RWAIdentity} from "../../src/rwa/identity/Identity.sol";
import {RWAIdentityRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWACompliance} from "../../src/rwa/RWACompliance.sol";
import {RWAToken} from "../../src/rwa/RWAToken.sol";
import {RWATrustedIssuersRegistry} from "../../src/rwa/IdentityRegistry.sol";

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
contract DownToERC20Test is Test {
    DeployERC3643 deployScript;

    TREXImplementationAuthority public trexImplementationAuthority;
    TREXFactory public trexFactory;
    TREXGateway public trexGateway;
    RWAIdentityIdFactory public identityIdFactory;

    RWAToken internal rwaToken;
    RWACompliance internal compliance;
    RWAIdentityRegistry internal identityRegistry;
    // IdentityRegistry-related variables
    RWATrustedIssuersRegistry internal trustedIssuersRegistry;
    
    RWAIdentity public identity;
    RWAClaimIssuer public claimIssuer;

    // Event definitions for testing
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function setUp() public {
        deployScript = new DeployERC3643();
        deployScript.run();
        
        trexImplementationAuthority = deployScript.trexImplementationAuthority();
        trexFactory = deployScript.trexFactory();
        trexGateway = deployScript.trexGateway();
        identityIdFactory = deployScript.identityIdFactory();

        string memory salt = deployScript.salt();
        rwaToken = RWAToken(trexFactory.getToken(salt));
        compliance = RWACompliance(address(rwaToken.compliance()));
        identityRegistry = RWAIdentityRegistry(address(rwaToken.identityRegistry()));
        trustedIssuersRegistry = RWATrustedIssuersRegistry(address(identityRegistry.issuersRegistry()));
        identity = RWAIdentity(deployScript.identity());
        claimIssuer = RWAClaimIssuer(deployScript.claimIssuer());

        // switch the compliance to a MockCompliance
        MockCompliance mockCompliance = new MockCompliance();
        MockIdentityRegistry mockIdentityRegistry = new MockIdentityRegistry();

        rwaToken.setCompliance(address(mockCompliance));
        rwaToken.setIdentityRegistry(address(mockIdentityRegistry));
    }

    // ============ Basic Deployment Tests ============
    function test_DeployERC3643_Success() public view {
        assertNotEq(address(trexImplementationAuthority), address(0));
        assertNotEq(address(trexFactory), address(0));
        assertNotEq(address(trexGateway), address(0));
        assertNotEq(address(rwaToken), address(0));
        assertNotEq(address(compliance), address(0));
        assertNotEq(address(identityRegistry), address(0));
        assertNotEq(address(identity), address(0));
        assertNotEq(address(claimIssuer), address(0));
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
        uint256 mintAmount = 1000 * 10**18;
        
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
        uint256 mintAmount = 1000 * 10**18;
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), recipient, mintAmount);
        rwaToken.mint(recipient, mintAmount);
    }

    function test_ERC20_Mint_RevertsIfNotAgent() public {
        address nonAgent = address(0x999);
        address recipient = address(0x123);
        uint256 mintAmount = 1000 * 10**18;
        
        vm.prank(nonAgent);
        vm.expectRevert();
        rwaToken.mint(recipient, mintAmount);
    }

    // ============ ERC20 Transfer Tests ============
    function test_ERC20_Transfer() public {
        address owner = rwaToken.owner();
        address sender = address(0x111);
        address recipient = address(0x222);
        uint256 mintAmount = 1000 * 10**18;
        uint256 transferAmount = 500 * 10**18;
        
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
        uint256 mintAmount = 1000 * 10**18;
        uint256 transferAmount = 500 * 10**18;
        
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
        uint256 mintAmount = 100 * 10**18;
        uint256 transferAmount = 200 * 10**18;
        
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
        uint256 mintAmount = 1000 * 10**18;
        
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
        uint256 approveAmount = 500 * 10**18;
        
        vm.prank(owner);
        bool success = rwaToken.approve(spender, approveAmount);
        
        assertTrue(success);
        assertEq(rwaToken.allowance(owner, spender), approveAmount);
    }

    function test_ERC20_Approve_EmitsApproval() public {
        address owner = rwaToken.owner();
        address spender = address(0x333);
        uint256 approveAmount = 500 * 10**18;
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit Approval(owner, spender, approveAmount);
        rwaToken.approve(spender, approveAmount);
    }

    function test_ERC20_Approve_CanUpdateAllowance() public {
        address owner = rwaToken.owner();
        address spender = address(0x333);
        uint256 firstAmount = 500 * 10**18;
        uint256 secondAmount = 1000 * 10**18;
        
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
        uint256 approveAmount = 500 * 10**18;
        
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
        uint256 mintAmount = 1000 * 10**18;
        uint256 approveAmount = 500 * 10**18;
        uint256 transferAmount = 300 * 10**18;
        
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
        uint256 mintAmount = 1000 * 10**18;
        uint256 approveAmount = 500 * 10**18;
        uint256 transferAmount = 300 * 10**18;
        
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
        uint256 mintAmount = 1000 * 10**18;
        uint256 approveAmount = 200 * 10**18;
        uint256 transferAmount = 500 * 10**18;
        
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
        uint256 mintAmount = 100 * 10**18;
        uint256 approveAmount = 500 * 10**18;
        uint256 transferAmount = 200 * 10**18;
        
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
        uint256 approveAmount = 500 * 10**18;
        
        vm.prank(owner);
        rwaToken.approve(spender, approveAmount);
        
        assertEq(rwaToken.allowance(owner, spender), approveAmount);
    }

    // ============ ERC20 Total Supply Tests ============
    function test_ERC20_TotalSupply_IncreasesOnMint() public {
        address owner = rwaToken.owner();
        address recipient1 = address(0x111);
        address recipient2 = address(0x222);
        uint256 mintAmount1 = 1000 * 10**18;
        uint256 mintAmount2 = 500 * 10**18;
        
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
        uint256 mintAmount = 1000 * 10**18;
        uint256 transferAmount = 500 * 10**18;
        
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
        rwaToken.setCompliance(address(compliance));
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
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity)), 840);
        assertTrue(identityRegistry.isVerified(newUser));
    }

    function test_RegisterNewIdentity_Success() public {
        switchBackToERC3643();
        uint256 purposeClaim = 3;
        uint256 keyTypeEcdsa = 1;
        uint256 claimTopicKyc = 1;
        uint256 claimSchemeEcdsa = 1;
        uint256 newClaimKeyPrivateKey = uint256(0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef);
        address newManagementKey = vm.addr(newClaimKeyPrivateKey);
        bytes32 claimKeyHash = keccak256(abi.encode(newManagementKey));

        // Create new identity
        vm.prank(identityIdFactory.owner());
        address newIdentity = identityIdFactory.createIdentity(newManagementKey, "newIdentity");

        // Add claim key to new identity
        vm.prank(newManagementKey);
        RWAIdentity(newIdentity).addKey(claimKeyHash, purposeClaim, keyTypeEcdsa);

        // Add claim key to claimIssuer (required for signature verification)
        address managementKey = vm.envOr("MANAGEMENT_KEY", msg.sender);
        vm.prank(managementKey);
        RWAClaimIssuer(claimIssuer).addKey(claimKeyHash, purposeClaim, keyTypeEcdsa);

        // Add claim to new identity
        bytes memory data = "";
        bytes32 dataHash = keccak256(abi.encode(newIdentity, claimTopicKyc, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(newClaimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        vm.prank(newManagementKey);
        RWAIdentity(newIdentity).addClaim(claimTopicKyc, claimSchemeEcdsa, address(claimIssuer), sig, data, "");
        
        // Register new identity
        identityRegistry.registerIdentity(newManagementKey, IIdentity(address(newIdentity)), 840);
        assertTrue(identityRegistry.isVerified(newManagementKey));
    }

    function test_RegisterIdentityWithMoreTopics_Success() public {
        switchBackToERC3643();
        address newUser = address(0x9999);
        uint256 newTopic = 2;
        uint256 claimKeyPrivateKey = vm.envOr("CLAIM_KEY_PRIVATE_KEY", uint256(0));
        address managementKey = vm.envOr("MANAGEMENT_KEY", msg.sender);
        address claimKeyAddress = managementKey;
        
        // Create valid signature for the new topic claim
        bytes memory data = "";
        bytes32 dataHash = keccak256(abi.encode(identity, newTopic, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        vm.prank(claimKeyAddress);
        identity.addClaim(newTopic, 1, address(claimIssuer), sig, data, "");
        uint256[] memory topics = new uint256[](2);
        topics[0] = 1;
        topics[1] = newTopic;
        // this will replace the existing topic with the new topic
        trustedIssuersRegistry.updateIssuerClaimTopics(IClaimIssuer(address(claimIssuer)), topics);

        identityRegistry.registerIdentity(newUser, IIdentity(address(identity)), 840);
        
        assertTrue(identityRegistry.isVerified(newUser));
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
        identityRegistry.registerIdentity(from, IIdentity(address(identity)), 840);
        identityRegistry.registerIdentity(to, IIdentity(address(identity)), 840);
        rwaToken.mint(from, amount * 2);

        // 测试中调用 approve 时未使用 vm.prank(from)，导致批准来自测试合约而非 from。因此 _allowances[from][spender] 为 0，transferFrom 在第 228 行计算 _allowances[from][msg.sender] - _amount 时发生下溢。
        // 修复：
        // 在调用 approve 前添加 vm.prank(from)，确保批准来自正确的地址
        // 取消注释测试末尾的断言，验证所有预期结果
        // 测试现在通过，所有断言都正确：
        // from 的余额为 1000（2000 - 1000）
        // to 的余额为 1000
        // 剩余授权为 1000（2000 - 1000）
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
        identityRegistry.registerIdentity(from, IIdentity(address(identity)), 840);
        identityRegistry.registerIdentity(to, IIdentity(address(identity)), 840);
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
        identityRegistry.registerIdentity(to, IIdentity(address(identity)), 840);

        // Execute mint
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
        identityRegistry.registerIdentity(user, IIdentity(address(identity)), 840);
        rwaToken.mint(user, mintAmount);

        // Execute burn
        rwaToken.burn(user, burnAmount);

        // Assertions
        assertEq(rwaToken.balanceOf(user), mintAmount - burnAmount);
        assertEq(rwaToken.totalSupply(), mintAmount - burnAmount);
    }

}