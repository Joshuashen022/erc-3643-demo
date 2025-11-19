// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeployERC3643} from "../../script/DeployERC3643.s.sol";
import {TREXImplementationAuthority} from "../../lib/ERC-3643/contracts/proxy/authority/TREXImplementationAuthority.sol";
import {TREXFactory} from "../../lib/ERC-3643/contracts/factory/TREXFactory.sol";
import {TREXGateway} from "../../lib/ERC-3643/contracts/factory/TREXGateway.sol";
import {IToken} from "../../lib/ERC-3643/contracts/token/IToken.sol";
import {IIdentityRegistry} from "../../lib/ERC-3643/contracts/registry/interface/IIdentityRegistry.sol";
import {IModularCompliance} from "../../lib/ERC-3643/contracts/compliance/modular/IModularCompliance.sol";
import {IClaimTopicsRegistry} from "../../lib/ERC-3643/contracts/registry/interface/IClaimTopicsRegistry.sol";
import {ITrustedIssuersRegistry} from "../../lib/ERC-3643/contracts/registry/interface/ITrustedIssuersRegistry.sol";
import {ITREXImplementationAuthority} from "../../lib/ERC-3643/contracts/proxy/authority/ITREXImplementationAuthority.sol";
import {IIdentity} from "../../lib/solidity/contracts/interface/IIdentity.sol";
import {IClaimIssuer} from "../../lib/solidity/contracts/interface/IClaimIssuer.sol";
import {RWAIdentityIdFactory} from "../../src/rwa/proxy/RWAIdentityIdFactory.sol";
import {RWAClaimIssuerIdFactory} from "../../src/rwa/proxy/RWAClaimIssuerIdFactory.sol";

import {RWAClaimIssuer, RWAIdentity} from "../../src/rwa/identity/Identity.sol";
import {RWAIdentityRegistry} from "../../src/rwa/IdentityRegistry.sol";
import {RWACompliance} from "../../src/rwa/RWACompliance.sol";
import {RWAToken} from "../../src/rwa/RWAToken.sol";
import {RWAIdentityRegistryStorage, RWATrustedIssuersRegistry, RWAClaimTopicsRegistry} from "../../src/rwa/IdentityRegistry.sol";


contract DeployERC3643Test is Test {
    DeployERC3643 deployScript;

    TREXImplementationAuthority public trexImplementationAuthority;
    TREXFactory public trexFactory;
    TREXGateway public trexGateway;
    RWAIdentityIdFactory public identityIdFactory;
    RWAClaimIssuerIdFactory public claimIssuerIdFactory;

    RWAToken internal rwaToken;
    RWACompliance internal compliance;
    RWAIdentityRegistry internal identityRegistry;
    // IdentityRegistry-related variables
    RWAIdentityRegistryStorage internal identityRegistryStorage;
    RWATrustedIssuersRegistry internal trustedIssuersRegistry;
    RWAClaimTopicsRegistry internal claimTopicsRegistry;
    
    RWAIdentity public identity;
    RWAClaimIssuer public claimIssuer;

    // Event definition for testing
    event RecoverySuccess(address indexed _lostWallet, address indexed _newWallet, address indexed _investorOnchainID);

    function setUp() public {
        deployScript = new DeployERC3643();
        deployScript.run();
        
        trexImplementationAuthority = deployScript.trexImplementationAuthority();
        trexFactory = deployScript.trexFactory();
        trexGateway = deployScript.trexGateway();
        identityIdFactory = deployScript.identityidFactory();
        claimIssuerIdFactory = deployScript.claimIssuerIdFactory();

        string memory salt = deployScript.salt();
        rwaToken = RWAToken(trexFactory.getToken(salt));
        compliance = RWACompliance(address(rwaToken.compliance()));
        identityRegistry = RWAIdentityRegistry(address(rwaToken.identityRegistry()));
        identityRegistryStorage = RWAIdentityRegistryStorage(address(identityRegistry.identityStorage()));
        trustedIssuersRegistry = RWATrustedIssuersRegistry(address(identityRegistry.issuersRegistry()));
        claimTopicsRegistry = RWAClaimTopicsRegistry(address(identityRegistry.topicsRegistry()));
        identity = RWAIdentity(deployScript.identity());
        claimIssuer = RWAClaimIssuer(deployScript.claimIssuer());
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

    // ============ Agent Initialization Tests ============
    function test_AgentInitialization_Success() public view {
        address suiteOwner = deployScript.suiteOwner();
        
        // Check that suiteOwner is set
        assertNotEq(suiteOwner, address(0), "Suite owner should be set");
        
        // Check Identity Registry agent
        assertTrue(
            identityRegistry.isAgent(suiteOwner),
            "Suite owner should be an agent of Identity Registry"
        );
        
        // Check Token agent
        assertTrue(
            rwaToken.isAgent(suiteOwner),
            "Suite owner should be an agent of Token"
        );

        // Check that suiteOwner is the owner of Token
        assertEq(rwaToken.owner(), suiteOwner, "Token owner should match suite owner");
        
        // Check that suiteOwner is the owner of Identity Registry
        assertEq(identityRegistry.owner(), suiteOwner, "Identity Registry owner should match suite owner");
    }

    // ============ Register Identity Tests ============
    function test_RegisterIdentity_Success() public {
        address newUser = address(0x9999);
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity)), 840);
        assertTrue(identityRegistry.isVerified(newUser));
    }

    function test_RegisterNewIdentity_Success() public {
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

    // ============ compliance integration tests ============
    function test_ComplianceCanTransferWhenNoModules() public view {
        address from = address(0x1111);
        address to = address(0x2222);
        uint256 amount = 1000;

        // Compliance should allow transfers when no modules are added
        assertTrue(compliance.canTransfer(from, to, amount));
    }

        // ============ forcedTransfer tests ============
    function test_ForcedTransferSuccess() public {
        address from = address(0x1111);
        address to = address(0x2222);
        uint256 amount = 1000;

        // Setup: verify addresses, mint tokens to from
        identityRegistry.registerIdentity(from, IIdentity(address(identity)), 840);
        identityRegistry.registerIdentity(to, IIdentity(address(identity)), 840);
        rwaToken.mint(from, amount * 2);

        // Execute forcedTransfer
        bool result = rwaToken.forcedTransfer(from, to, amount);

        // Assertions
        assertTrue(result);
        assertEq(rwaToken.balanceOf(from), amount); // Original balance was amount * 2, transferred amount
        assertEq(rwaToken.balanceOf(to), amount);
    }

        // ============ recoveryAddress tests ============
    function test_RecoveryAddressSuccess() public {
        address lostWallet = address(0x1111);
        address newWallet = address(0x2222);
        uint256 amount = 1000;

        // Setup: register lost wallet and mint tokens
        identityRegistry.registerIdentity(lostWallet, IIdentity(address(identity)), 840);
        rwaToken.mint(lostWallet, amount);

        // Add newWallet as a management key to the existing identity (used for lost wallet)
        address managementKey = vm.envOr("MANAGEMENT_KEY", msg.sender);
        bytes32 newWalletKeyHash = keccak256(abi.encode(newWallet));
        
        vm.startPrank(managementKey);
        identity.addKey(newWalletKeyHash, 1, 1);
        vm.stopPrank();

        // Execute recovery
        vm.expectEmit(true, true, true, true);
        emit RecoverySuccess(lostWallet, newWallet, address(identity));
        bool result = rwaToken.recoveryAddress(lostWallet, newWallet, address(identity));

        // Assertions
        assertTrue(result);
        assertEq(rwaToken.balanceOf(lostWallet), 0);
        assertEq(rwaToken.balanceOf(newWallet), amount);
        assertFalse(identityRegistry.isVerified(lostWallet));
        assertTrue(identityRegistry.isVerified(newWallet));
    }

}