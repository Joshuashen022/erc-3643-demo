// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {ERC3643TestBase} from "../lib/ERC3643TestBase.sol";
import {IIdentity} from "../../lib/solidity/contracts/interface/IIdentity.sol";
import {IClaimIssuer} from "../../lib/solidity/contracts/interface/IClaimIssuer.sol";
import {RWAClaimIssuer, RWAIdentity} from "../../src/rwa/identity/Identity.sol";

contract DeployERC3643Test is ERC3643TestBase {
    // Event definition for testing
    event RecoverySuccess(address indexed _lostWallet, address indexed _newWallet, address indexed _investorOnchainID);

    function setUp() public {
        setUpBase();
    }

    // ============ Agent Initialization Tests ============
    function test_AgentInitialization_Success() public view {
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
    function test_InitializeIdentity_Success() public {
        address newIdentityManagementKey = address(0x213141);
        RWAIdentity newIdentity = initializeIdentity(newIdentityManagementKey, "testtesttest");
        assertTrue(identityRegistry.isVerified(newIdentityManagementKey));
    }

    /// @notice Basic deployment test
    function test_DeployERC3643_Success() public view {
        assertNotEq(address(trexImplementationAuthority), address(0));
        assertNotEq(address(trexFactory), address(0));
        assertNotEq(address(trexGateway), address(0));
        assertNotEq(address(rwaToken), address(0));
        assertNotEq(address(compliance), address(0));
        assertNotEq(address(identityRegistry), address(0));
        assertTrue(identityRegistry.isVerified(identityManagementKey));
    }

    /// @notice Test transferFrom functionality
    function test_TransferFromSuccess() public {
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

    /// @notice Test transfer functionality
    function test_TransferSuccess() public {
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

    /// @notice Test mint functionality
    function test_MintSuccess() public {
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

    /// @notice Test burn functionality
    function test_BurnSuccess() public {
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
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(from, IIdentity(address(identity)), 840);
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(to, IIdentity(address(identity)), 840);
        vm.prank(suiteOwner);
        rwaToken.mint(from, amount * 2);

        // Execute forcedTransfer
        vm.prank(suiteOwner);
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
        vm.prank(suiteOwner);
        identityRegistry.registerIdentity(lostWallet, IIdentity(address(identity)), 840);
        vm.prank(suiteOwner);
        rwaToken.mint(lostWallet, amount);

        // Add newWallet as a management key to the existing identity (used for lost wallet)
        bytes32 newWalletKeyHash = keccak256(abi.encode(newWallet));
        
        vm.startPrank(identityManagementKey);
        identity.addKey(newWalletKeyHash, 1, 1);
        vm.stopPrank();

        // Execute recovery
        vm.expectEmit(true, true, true, true);
        emit RecoverySuccess(lostWallet, newWallet, address(identity));
        vm.prank(suiteOwner);
        bool result = rwaToken.recoveryAddress(lostWallet, newWallet, address(identity));

        // Assertions
        assertTrue(result);
        assertEq(rwaToken.balanceOf(lostWallet), 0);
        assertEq(rwaToken.balanceOf(newWallet), amount);
        assertFalse(identityRegistry.isVerified(lostWallet));
        assertTrue(identityRegistry.isVerified(newWallet));
    }

    // // ============ Specific Logics ============
    // function test_DowngradeToERC20Success() public {
        
    //     TREXFactory.TokenDetails memory tokenDetails = TREXFactory.TokenDetails({
    //         owner: suiteOwner,
    //         name: "TREX Token",
    //         symbol: "TREX",
    //         decimals: 18,
    //         irs: address(identityRegistryStorage),
    //         ONCHAINID: address(0),
    //         irAgents: new address[](0),
    //         tokenAgents: new address[](0),
    //         complianceModules: new address[](0),
    //         complianceSettings: new bytes[](0)
    //     });
    //     TREXFactory.ClaimDetails memory claimDetails = TREXFactory.ClaimDetails({
    //         claimTopics: new uint256[](0),
    //         issuers: new address[](0),
    //         issuerClaims: new uint256[][](0)
    //     });

    //     trexFactory.deployTREXSuite("test-salt", tokenDetails, claimDetails);
    // }

    // ============ deployIdentityWithSalt tests ============
    // function test_DeployIdentityWithSalt_Success() public {
    //     address newIdentityOwner = address(0xAAAA);
    //     string memory salt = "test-identity-salt";
    //     uint256 signatureExpiry = 0;
    //     uint256 signerPrivateKey = uint256(0x1111111111111111111111111111111111111111111111111111111111111111);
        
    //     // Ensure Gateway is the owner of IdFactory
    //     // if (identityIdFactory.owner() != address(identityGateway)) {
    //     //     vm.prank(identityIdFactory.owner());
    //     //     identityIdFactory.transferOwnership(address(identityGateway));
    //     // }
        
    //     // Approve the signer in the Gateway
    //     vm.prank(identityGateway.owner());
    //     identityGateway.approveSigner(vm.addr(signerPrivateKey));
        
    //     // Create and sign the message
    //     bytes32 messageHash = keccak256(
    //         abi.encode("Authorize ONCHAINID deployment", newIdentityOwner, salt, signatureExpiry)
    //     );
    //     bytes32 ethSignedMessageHash = keccak256(
    //         abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
    //     );
    //     (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
    //     bytes memory signature = abi.encodePacked(r, s, v);
        
    //     // Execute deployIdentityWithSalt
    //     address deployedIdentity = identityGateway.deployIdentityWithSalt(
    //         newIdentityOwner,
    //         salt,
    //         signatureExpiry,
    //         signature
    //     );
        
    //     // Assertions
    //     assertNotEq(deployedIdentity, address(0), "Identity should be deployed");
    //     assertEq(identityIdFactory.getIdentity(newIdentityOwner), deployedIdentity, "Identity should be linked");
    //     assertTrue(
    //         RWAIdentity(deployedIdentity).keyHasPurpose(keccak256(abi.encode(newIdentityOwner)), 1),
    //         "Identity owner should be a management key"
    //     );
    // }

}