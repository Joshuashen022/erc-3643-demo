// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {RWAIdentityRegistryStorage} from "../../src/rwa/IdentityRegistry.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {MockClaimIssuer} from "../mocks/MockClaimIssuer.sol";

contract IdentityRegistryStorageUtils is Test {
    RWAIdentityRegistryStorage public identityRegistryStorage;
    MockClaimIssuer internal identity1;
    MockClaimIssuer internal identity2;
    MockClaimIssuer internal identity3;
    address internal owner;
    address internal agent;
    address internal nonAgent;
    address internal user1;
    address internal user2;
    address internal user3;
    address internal identityRegistry1;
    address internal identityRegistry2;

    uint16 constant COUNTRY_US = 840;
    uint16 constant COUNTRY_UK = 826;
    uint16 constant COUNTRY_FR = 250;

    event IdentityStored(address indexed investorAddress, IIdentity indexed identity);
    event IdentityUnstored(address indexed investorAddress, IIdentity indexed identity);
    event IdentityModified(IIdentity indexed oldIdentity, IIdentity indexed newIdentity);
    event CountryModified(address indexed investorAddress, uint16 indexed country);
    event IdentityRegistryBound(address indexed identityRegistry);
    event IdentityRegistryUnbound(address indexed identityRegistry);

    function setUp() public {
        owner = address(this);
        agent = address(0x1111);
        nonAgent = address(0x2222);
        user1 = address(0xAAAA);
        user2 = address(0xBBBB);
        user3 = address(0xCCCC);
        identityRegistry1 = address(0xDDDD);
        identityRegistry2 = address(0xEEEE);

        // Deploy IdentityRegistryStorage
        identityRegistryStorage = new RWAIdentityRegistryStorage();
        identityRegistryStorage.init();

        // Deploy mock identities
        identity1 = new MockClaimIssuer();
        identity2 = new MockClaimIssuer();
        identity3 = new MockClaimIssuer();

        // Add agent
        identityRegistryStorage.addAgent(agent);

        vm.startPrank(agent);
        identityRegistryStorage.addIdentityToStorage(user1, IIdentity(address(identity1)), COUNTRY_US);
        identityRegistryStorage.addIdentityToStorage(user2, IIdentity(address(identity2)), COUNTRY_UK);
        identityRegistryStorage.addIdentityToStorage(user3, IIdentity(address(identity3)), COUNTRY_FR);
        vm.stopPrank();
    }

    // ============ init() tests ============

    function testInit() public {
        RWAIdentityRegistryStorage newStorage = new RWAIdentityRegistryStorage();
        newStorage.init();
        assertEq(newStorage.owner(), address(this));
    }

    function testInit_RevertsWhenCalledTwice() public {
        RWAIdentityRegistryStorage newStorage = new RWAIdentityRegistryStorage();
        newStorage.init();
        vm.expectRevert();
        newStorage.init();
    }

    // ============ addIdentityToStorage() tests ============
    function testAddIdentityToStorage_MultipleUsers() public view {
        assertEq(address(identityRegistryStorage.storedIdentity(user1)), address(identity1));
        assertEq(identityRegistryStorage.storedInvestorCountry(user1), COUNTRY_US);
        assertEq(address(identityRegistryStorage.storedIdentity(user2)), address(identity2));
        assertEq(identityRegistryStorage.storedInvestorCountry(user2), COUNTRY_UK);
        assertEq(address(identityRegistryStorage.storedIdentity(user3)), address(identity3));
        assertEq(identityRegistryStorage.storedInvestorCountry(user3), COUNTRY_FR);
    }

    function testAddIdentityToStorage_RevertsWhenZeroUserAddress() public {
        vm.prank(agent);
        vm.expectRevert(bytes("invalid argument - zero address"));
        identityRegistryStorage.addIdentityToStorage(address(0), IIdentity(address(identity1)), COUNTRY_US);
    }

    function testAddIdentityToStorage_RevertsWhenZeroIdentity() public {
        address newUser = address(0x9999);
        vm.prank(agent);
        vm.expectRevert(bytes("invalid argument - zero address"));
        identityRegistryStorage.addIdentityToStorage(newUser, IIdentity(address(0)), COUNTRY_US);
    }

    function testAddIdentityToStorage_RevertsWhenAlreadyStored() public {
        vm.startPrank(agent);
        // user1 is already stored in setUp, so we can directly test the revert
        vm.expectRevert(bytes("address stored already"));
        identityRegistryStorage.addIdentityToStorage(user1, IIdentity(address(identity2)), COUNTRY_UK);
        vm.stopPrank();
    }

    function testAddIdentityToStorage_RevertsWhenNotAgent() public {
        address newUser = address(0x9999);
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistryStorage.addIdentityToStorage(newUser, IIdentity(address(identity1)), COUNTRY_US);
    }

    // ============ modifyStoredIdentity() tests ============

    function testModifyStoredIdentity_Success() public {
        vm.startPrank(agent);
        // user1 is already stored in setUp with identity1
        vm.expectEmit(true, true, false, true);
        emit IdentityModified(IIdentity(address(identity1)), IIdentity(address(identity2)));
        identityRegistryStorage.modifyStoredIdentity(user1, IIdentity(address(identity2)));
        vm.stopPrank();

        assertEq(address(identityRegistryStorage.storedIdentity(user1)), address(identity2));
        assertEq(identityRegistryStorage.storedInvestorCountry(user1), COUNTRY_US); // Country should remain unchanged
    }

    function testModifyStoredIdentity_RevertsWhenZeroUserAddress() public {
        vm.startPrank(agent);
        // user1 is already stored in setUp
        vm.expectRevert(bytes("invalid argument - zero address"));
        identityRegistryStorage.modifyStoredIdentity(address(0), IIdentity(address(identity2)));
        vm.stopPrank();
    }

    function testModifyStoredIdentity_RevertsWhenZeroIdentity() public {
        vm.startPrank(agent);
        // user1 is already stored in setUp
        vm.expectRevert(bytes("invalid argument - zero address"));
        identityRegistryStorage.modifyStoredIdentity(user1, IIdentity(address(0)));
        vm.stopPrank();
    }

    function testModifyStoredIdentity_RevertsWhenNotStored() public {
        address newUser = address(0x9999);
        vm.prank(agent);
        vm.expectRevert(bytes("address not stored yet"));
        identityRegistryStorage.modifyStoredIdentity(newUser, IIdentity(address(identity1)));
    }

    function testModifyStoredIdentity_RevertsWhenNotAgent() public {
        // user1 is already stored in setUp
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistryStorage.modifyStoredIdentity(user1, IIdentity(address(identity2)));
    }

    // ============ modifyStoredInvestorCountry() tests ============

    function testModifyStoredInvestorCountry_Success() public {
        vm.startPrank(agent);
        // user1 is already stored in setUp with COUNTRY_US
        vm.expectEmit(true, true, false, true);
        emit CountryModified(user1, COUNTRY_UK);
        identityRegistryStorage.modifyStoredInvestorCountry(user1, COUNTRY_UK);
        vm.stopPrank();

        assertEq(identityRegistryStorage.storedInvestorCountry(user1), COUNTRY_UK);
        assertEq(address(identityRegistryStorage.storedIdentity(user1)), address(identity1)); // Identity should remain unchanged
    }

    function testModifyStoredInvestorCountry_RevertsWhenZeroUserAddress() public {
        vm.startPrank(agent);
        // user1 is already stored in setUp
        vm.expectRevert(bytes("invalid argument - zero address"));
        identityRegistryStorage.modifyStoredInvestorCountry(address(0), COUNTRY_UK);
        vm.stopPrank();
    }

    function testModifyStoredInvestorCountry_RevertsWhenNotStored() public {
        address newUser = address(0x9999);
        vm.prank(agent);
        vm.expectRevert(bytes("address not stored yet"));
        identityRegistryStorage.modifyStoredInvestorCountry(newUser, COUNTRY_UK);
    }

    function testModifyStoredInvestorCountry_RevertsWhenNotAgent() public {
        // user1 is already stored in setUp
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistryStorage.modifyStoredInvestorCountry(user1, COUNTRY_UK);
    }

    // ============ removeIdentityFromStorage() tests ============

    function testRemoveIdentityFromStorage_Success() public {
        vm.startPrank(agent);
        // user1 is already stored in setUp with identity1
        vm.expectEmit(true, true, false, true);
        emit IdentityUnstored(user1, IIdentity(address(identity1)));
        identityRegistryStorage.removeIdentityFromStorage(user1);
        vm.stopPrank();

        assertEq(address(identityRegistryStorage.storedIdentity(user1)), address(0));
        assertEq(identityRegistryStorage.storedInvestorCountry(user1), 0);
    }

    function testRemoveIdentityFromStorage_CanReaddAfterRemoval() public {
        vm.startPrank(agent);
        // user1 is already stored in setUp, so we remove it first
        identityRegistryStorage.removeIdentityFromStorage(user1);
        identityRegistryStorage.addIdentityToStorage(user1, IIdentity(address(identity2)), COUNTRY_UK);
        vm.stopPrank();

        assertEq(address(identityRegistryStorage.storedIdentity(user1)), address(identity2));
        assertEq(identityRegistryStorage.storedInvestorCountry(user1), COUNTRY_UK);
    }

    function testRemoveIdentityFromStorage_RevertsWhenZeroUserAddress() public {
        vm.prank(agent);
        vm.expectRevert(bytes("invalid argument - zero address"));
        identityRegistryStorage.removeIdentityFromStorage(address(0));
    }

    function testRemoveIdentityFromStorage_RevertsWhenNotStored() public {
        address newUser = address(0x9999);
        vm.prank(agent);
        vm.expectRevert(bytes("address not stored yet"));
        identityRegistryStorage.removeIdentityFromStorage(newUser);
    }

    function testRemoveIdentityFromStorage_RevertsWhenNotAgent() public {
        // user1 is already stored in setUp
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistryStorage.removeIdentityFromStorage(user1);
    }

    // ============ bindIdentityRegistry() tests ============

    function testBindIdentityRegistry_Success() public {
        vm.expectEmit(true, false, false, true);
        emit IdentityRegistryBound(identityRegistry1);
        identityRegistryStorage.bindIdentityRegistry(identityRegistry1);

        address[] memory registries = identityRegistryStorage.linkedIdentityRegistries();
        assertEq(registries.length, 1);
        assertEq(registries[0], identityRegistry1);
        assertTrue(identityRegistryStorage.isAgent(identityRegistry1));
    }

    function testBindIdentityRegistry_MultipleRegistries() public {
        identityRegistryStorage.bindIdentityRegistry(identityRegistry1);
        identityRegistryStorage.bindIdentityRegistry(identityRegistry2);

        address[] memory registries = identityRegistryStorage.linkedIdentityRegistries();
        assertEq(registries.length, 2);
        assertTrue(
            (registries[0] == identityRegistry1 && registries[1] == identityRegistry2) ||
            (registries[0] == identityRegistry2 && registries[1] == identityRegistry1)
        );
    }

    function testBindIdentityRegistry_UpTo300Registries() public {
        for (uint256 i = 0; i < 300; i++) {
            address registry = address(uint160(i + 1000));
            identityRegistryStorage.bindIdentityRegistry(registry);
        }

        address[] memory registries = identityRegistryStorage.linkedIdentityRegistries();
        assertEq(registries.length, 300);
    }

    function testBindIdentityRegistry_RevertsWhenZeroAddress() public {
        vm.expectRevert(bytes("invalid argument - zero address"));
        identityRegistryStorage.bindIdentityRegistry(address(0));
    }

    function testBindIdentityRegistry_RevertsWhenMoreThan300() public {
        for (uint256 i = 0; i < 300; i++) {
            address registry = address(uint160(i + 1000));
            identityRegistryStorage.bindIdentityRegistry(registry);
        }

        vm.expectRevert(bytes("cannot bind more than 300 IR to 1 IRS"));
        identityRegistryStorage.bindIdentityRegistry(address(0xFFFF));
    }

    // ============ unbindIdentityRegistry() tests ============

    function testUnbindIdentityRegistry_Success() public {
        identityRegistryStorage.bindIdentityRegistry(identityRegistry1);
        identityRegistryStorage.bindIdentityRegistry(identityRegistry2);

        vm.expectEmit(true, false, false, true);
        emit IdentityRegistryUnbound(identityRegistry1);
        identityRegistryStorage.unbindIdentityRegistry(identityRegistry1);

        address[] memory registries = identityRegistryStorage.linkedIdentityRegistries();
        assertEq(registries.length, 1);
        assertEq(registries[0], identityRegistry2);
        assertFalse(identityRegistryStorage.isAgent(identityRegistry1));
    }

    function testUnbindIdentityRegistry_RemovesFromMiddle() public {
        identityRegistryStorage.bindIdentityRegistry(identityRegistry1);
        identityRegistryStorage.bindIdentityRegistry(identityRegistry2);
        address registry3 = address(0x3333);
        identityRegistryStorage.bindIdentityRegistry(registry3);

        identityRegistryStorage.unbindIdentityRegistry(identityRegistry2);

        address[] memory registries = identityRegistryStorage.linkedIdentityRegistries();
        assertEq(registries.length, 2);
        // Should contain registry1 and registry3, but not registry2
        bool found1 = false;
        bool found3 = false;
        for (uint256 i = 0; i < registries.length; i++) {
            if (registries[i] == identityRegistry1) found1 = true;
            if (registries[i] == registry3) found3 = true;
            assertTrue(registries[i] != identityRegistry2);
        }
        assertTrue(found1 && found3);
    }

    function testUnbindIdentityRegistry_RemovesLast() public {
        identityRegistryStorage.bindIdentityRegistry(identityRegistry1);
        identityRegistryStorage.unbindIdentityRegistry(identityRegistry1);

        address[] memory registries = identityRegistryStorage.linkedIdentityRegistries();
        assertEq(registries.length, 0);
    }

    function testUnbindIdentityRegistry_RevertsWhenZeroAddress() public {
        vm.expectRevert(bytes("invalid argument - zero address"));
        identityRegistryStorage.unbindIdentityRegistry(address(0));
    }

    function testUnbindIdentityRegistry_RevertsWhenNoRegistries() public {
        vm.expectRevert(bytes("identity registry is not stored"));
        identityRegistryStorage.unbindIdentityRegistry(identityRegistry1);
    }

    function testUnbindIdentityRegistry_CanRebindAfterUnbind() public {
        identityRegistryStorage.bindIdentityRegistry(identityRegistry1);
        identityRegistryStorage.unbindIdentityRegistry(identityRegistry1);
        identityRegistryStorage.bindIdentityRegistry(identityRegistry1);

        address[] memory registries = identityRegistryStorage.linkedIdentityRegistries();
        assertEq(registries.length, 1);
        assertEq(registries[0], identityRegistry1);
    }

    // ============ linkedIdentityRegistries() tests ============

    function testLinkedIdentityRegistries_ReturnsEmptyArray() public {
        address[] memory registries = identityRegistryStorage.linkedIdentityRegistries();
        assertEq(registries.length, 0);
    }

    function testLinkedIdentityRegistries_ReturnsAllRegistries() public {
        identityRegistryStorage.bindIdentityRegistry(identityRegistry1);
        identityRegistryStorage.bindIdentityRegistry(identityRegistry2);

        address[] memory registries = identityRegistryStorage.linkedIdentityRegistries();
        assertEq(registries.length, 2);
    }

    // ============ storedIdentity() tests ============

    function testStoredIdentity_ReturnsZeroWhenNotStored() public {
        address newUser = address(0x9999);
        assertEq(address(identityRegistryStorage.storedIdentity(newUser)), address(0));
    }

    function testStoredIdentity_ReturnsStoredIdentity() public {
        // user1 is already stored in setUp with identity1
        assertEq(address(identityRegistryStorage.storedIdentity(user1)), address(identity1));
    }

    // ============ storedInvestorCountry() tests ============

    function testStoredInvestorCountry_ReturnsZeroWhenNotStored() public {
        address newUser = address(0x9999);
        assertEq(identityRegistryStorage.storedInvestorCountry(newUser), 0);
    }

    function testStoredInvestorCountry_ReturnsStoredCountry() public {
        // user1 is already stored in setUp with COUNTRY_US
        assertEq(identityRegistryStorage.storedInvestorCountry(user1), COUNTRY_US);
    }

    // ============ Integration tests ============

    function testFullLifecycle() public {
        vm.startPrank(agent);
        // user1 is already stored in setUp with identity1 and COUNTRY_US
        assertEq(address(identityRegistryStorage.storedIdentity(user1)), address(identity1));
        assertEq(identityRegistryStorage.storedInvestorCountry(user1), COUNTRY_US);

        // Modify country
        identityRegistryStorage.modifyStoredInvestorCountry(user1, COUNTRY_UK);
        assertEq(identityRegistryStorage.storedInvestorCountry(user1), COUNTRY_UK);

        // Modify identity
        identityRegistryStorage.modifyStoredIdentity(user1, IIdentity(address(identity2)));
        assertEq(address(identityRegistryStorage.storedIdentity(user1)), address(identity2));
        assertEq(identityRegistryStorage.storedInvestorCountry(user1), COUNTRY_UK);

        // Remove identity
        identityRegistryStorage.removeIdentityFromStorage(user1);
        assertEq(address(identityRegistryStorage.storedIdentity(user1)), address(0));
        assertEq(identityRegistryStorage.storedInvestorCountry(user1), 0);
        vm.stopPrank();
    }

    function testBoundRegistryCanAddIdentity() public {
        identityRegistryStorage.bindIdentityRegistry(identityRegistry1);
        
        address newUser = address(0x9999);
        vm.prank(identityRegistry1);
        identityRegistryStorage.addIdentityToStorage(newUser, IIdentity(address(identity1)), COUNTRY_US);

        assertEq(address(identityRegistryStorage.storedIdentity(newUser)), address(identity1));
    }
}


