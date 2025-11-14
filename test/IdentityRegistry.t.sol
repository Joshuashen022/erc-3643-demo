// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {RWAIdentityRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAIdentityRegistryStorage} from "../src/rwa/IdentityRegistry.sol";
import {RWATrustedIssuersRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAClaimTopicsRegistry} from "../src/rwa/IdentityRegistry.sol";
import {TrustedIssuersRegistryUtils} from "./utils/TrustedIssuersRegistry.t.sol";
import {IdentityRegistryStorageUtils} from "./utils/IdentityRegistryStorage.t.sol";
import {ClaimTopicsRegistryUtils} from "./utils/ClaimTopicsRegistry.t.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {MockIdentity} from "./mocks/MockIdentity.sol";
import {MockClaimIssuer} from "./mocks/MockClaimIssuer.sol";

contract MockIdentity2 is MockIdentity {
    function getClaim(bytes32)
        external
        pure
        override
        returns (
            uint256,
            uint256,
            address,
            bytes memory,
            bytes memory,
            string memory
        )
    {
        return (1, 0, address(0x4444), "", "", "");
    }
}

contract MockClaimIssuer2 is MockClaimIssuer {
    function getClaim(bytes32)
        external
        pure
        override
        returns (uint256, uint256, address, bytes memory, bytes memory, string memory) {
        return (0, 0, address(0), "", "", "");
    }
}

contract RWAIdentityRegistryTest is Test {
    // Event declarations for testing
    event IdentityRegistered(address indexed investorAddress, IIdentity indexed identity);
    event IdentityRemoved(address indexed investorAddress, IIdentity indexed identity);
    event IdentityUpdated(IIdentity indexed oldIdentity, IIdentity indexed newIdentity);
    event CountryUpdated(address indexed investorAddress, uint16 indexed country);
    event ClaimTopicsRegistrySet(address indexed claimTopicsRegistry);
    event IdentityStorageSet(address indexed identityStorage);
    event TrustedIssuersRegistrySet(address indexed trustedIssuersRegistry);
    
    RWAIdentityRegistry public identityRegistry;
    
    RWAIdentityRegistryStorage internal identityRegistryStorage;
    RWATrustedIssuersRegistry internal trustedIssuersRegistry;
    RWAClaimTopicsRegistry internal claimTopicsRegistry;

    address internal user1;
    address internal user2;
    address internal user3;
    MockIdentity public identity1;
    MockIdentity internal identity2;
    MockIdentity internal identity3;
    MockClaimIssuer internal claimIssuer1;
    MockClaimIssuer internal claimIssuer2;
    MockClaimIssuer internal claimIssuer3;

    // Predefined addresses for mock identities
    address constant IDENTITY1_ADDRESS = address(0x1111);
    address constant IDENTITY2_ADDRESS = address(0x2222);
    address constant IDENTITY3_ADDRESS = address(0x3333);

    address constant IDENTITY1_CLAIM_ISSUER_ADDRESS = address(0x4444);
    address constant IDENTITY2_CLAIM_ISSUER_ADDRESS = address(0x5555);
    address constant IDENTITY3_CLAIM_ISSUER_ADDRESS = address(0x6666);

    uint16 constant public COUNTRY_US = 840;
    uint16 constant COUNTRY_UK = 826;
    uint16 constant COUNTRY_FR = 250;

    function setUp() public {
        TrustedIssuersRegistryUtils trustedIssuersRegistryUtils = new TrustedIssuersRegistryUtils();
        IdentityRegistryStorageUtils identityRegistryStorageUtils = new IdentityRegistryStorageUtils();
        ClaimTopicsRegistryUtils claimTopicsRegistryUtils = new ClaimTopicsRegistryUtils();

        trustedIssuersRegistryUtils.setUp();
        identityRegistryStorageUtils.setUp();
        claimTopicsRegistryUtils.setUp();

        trustedIssuersRegistry = trustedIssuersRegistryUtils.trustedIssuersRegistry();
        identityRegistryStorage = identityRegistryStorageUtils.identityRegistryStorage();
        claimTopicsRegistry = claimTopicsRegistryUtils.claimTopicsRegistry();

        // Deploy IdentityRegistry
        identityRegistry = new RWAIdentityRegistry();

        // Bind IdentityRegistry to IdentityRegistryStorage
        vm.startPrank(identityRegistryStorage.owner());
        identityRegistryStorage.bindIdentityRegistry(address(identityRegistry));
        vm.stopPrank();

        // Initialize IdentityRegistry
        identityRegistry.init(address(trustedIssuersRegistry), address(claimTopicsRegistry), address(identityRegistryStorage));
        
        // Set up test addresses and identities
        user1 = address(0xAAAA);
        user2 = address(0xBBBB);
        user3 = address(0xCCCC);

        // Deploy mock identities to specified addresses
        deployCodeTo("test/IdentityRegistry.t.sol:MockIdentity2", IDENTITY1_ADDRESS);
        deployCodeTo("test/IdentityRegistry.t.sol:MockIdentity2", IDENTITY2_ADDRESS);
        deployCodeTo("test/IdentityRegistry.t.sol:MockIdentity2", IDENTITY3_ADDRESS);
        deployCodeTo("test/IdentityRegistry.t.sol:MockClaimIssuer2", IDENTITY1_CLAIM_ISSUER_ADDRESS);
        deployCodeTo("test/IdentityRegistry.t.sol:MockClaimIssuer2", IDENTITY2_CLAIM_ISSUER_ADDRESS);
        deployCodeTo("test/IdentityRegistry.t.sol:MockClaimIssuer2", IDENTITY3_CLAIM_ISSUER_ADDRESS);

        identity1 = MockIdentity2(IDENTITY1_ADDRESS);
        identity2 = MockIdentity2(IDENTITY2_ADDRESS);
        identity3 = MockIdentity2(IDENTITY3_ADDRESS);
        claimIssuer1 = MockClaimIssuer2(IDENTITY1_CLAIM_ISSUER_ADDRESS);
        claimIssuer2 = MockClaimIssuer2(IDENTITY2_CLAIM_ISSUER_ADDRESS);
        claimIssuer3 = MockClaimIssuer2(IDENTITY3_CLAIM_ISSUER_ADDRESS);

    }

    function testInit() public view {
        assertEq(address(identityRegistry.identityStorage()), address(identityRegistryStorage));
        assertEq(address(identityRegistry.issuersRegistry()), address(trustedIssuersRegistry));
        assertEq(address(identityRegistry.topicsRegistry()), address(claimTopicsRegistry));
        assertEq(address(identityRegistryStorage.linkedIdentityRegistries()[0]), address(identityRegistry));
    }

    // ============ core tests ============
    function testIsVerified_Success() public {
        address newUser = address(0x9999);
        // topics: [1]
        // identity1(address(0x1111)): [1], address(0x4444)
        // claimIssuer1(address(0x4444))

        identityRegistry.addAgent(identityRegistry.owner());
        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        assertTrue(identityRegistry.isVerified(newUser));
    }

    // ============ registerIdentity() tests ============

    function testRegisterIdentity_Success() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.expectEmit(true, true, false, true);
        emit IdentityRegistered(newUser, IIdentity(address(identity1)));
        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        assertEq(address(identityRegistry.identity(newUser)), address(identity1));
        assertEq(identityRegistry.investorCountry(newUser), COUNTRY_US);
        assertTrue(identityRegistry.contains(newUser));
    }

    function testRegisterIdentity_RevertsWhenNotAgent() public {
        address newUser = address(0x9999);
        address nonAgent = address(0x5555);

        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);
    }

    function testRegisterIdentity_EmitsEvent() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.expectEmit(true, true, false, true);
        emit IdentityRegistered(newUser, IIdentity(address(identity1)));
        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);
    }

    // ============ batchRegisterIdentity() tests ============

    function testBatchRegisterIdentity_Success() public {
        // Prepare arrays for batch registration
        address[] memory userAddresses = new address[](3);
        IIdentity[] memory identities = new IIdentity[](3);
        uint16[] memory countries = new uint16[](3);

        address newUser1 = address(0x1111);
        address newUser2 = address(0x2222);
        address newUser3 = address(0x3333);

        userAddresses[0] = newUser1;
        userAddresses[1] = newUser2;
        userAddresses[2] = newUser3;

        identities[0] = IIdentity(address(identity1));
        identities[1] = IIdentity(address(identity2));
        identities[2] = IIdentity(address(identity3));

        countries[0] = COUNTRY_US;
        countries[1] = COUNTRY_UK;
        countries[2] = COUNTRY_FR;

        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.batchRegisterIdentity(userAddresses, identities, countries);

        assertEq(address(identityRegistry.identity(newUser1)), address(identity1));
        assertEq(identityRegistry.investorCountry(newUser1), COUNTRY_US);
        assertEq(address(identityRegistry.identity(newUser2)), address(identity2));
        assertEq(identityRegistry.investorCountry(newUser2), COUNTRY_UK);
        assertEq(address(identityRegistry.identity(newUser3)), address(identity3));
        assertEq(identityRegistry.investorCountry(newUser3), COUNTRY_FR);
    }

    function testBatchRegisterIdentity_RevertsWhenAlreadyRegistered() public {
        address newUser1 = address(0x1111);
        identityRegistry.addAgent(identityRegistry.owner());

        // Register user1 first
        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser1, IIdentity(address(identity1)), COUNTRY_US);

        // Try to batch register including user1 again
        address[] memory userAddresses = new address[](1);
        IIdentity[] memory identities = new IIdentity[](1);
        uint16[] memory countries = new uint16[](1);

        userAddresses[0] = newUser1;
        identities[0] = IIdentity(address(identity2));
        countries[0] = COUNTRY_UK;

        vm.prank(identityRegistry.owner());
        vm.expectRevert(bytes("address stored already"));
        identityRegistry.batchRegisterIdentity(userAddresses, identities, countries);
    }

    function testBatchRegisterIdentity_RevertsWhenNotAgent() public {
        address[] memory userAddresses = new address[](1);
        IIdentity[] memory identities = new IIdentity[](1);
        uint16[] memory countries = new uint16[](1);

        userAddresses[0] = address(0x1111);
        identities[0] = IIdentity(address(identity1));
        countries[0] = COUNTRY_US;

        address nonAgent = address(0x5555);
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistry.batchRegisterIdentity(userAddresses, identities, countries);
    }

    // ============ updateIdentity() tests ============

    function testUpdateIdentity_Success() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        // Register identity first
        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        // Update identity
        vm.expectEmit(true, true, false, true);
        emit IdentityUpdated(IIdentity(address(identity1)), IIdentity(address(identity2)));
        vm.prank(identityRegistry.owner());
        identityRegistry.updateIdentity(newUser, IIdentity(address(identity2)));

        assertEq(address(identityRegistry.identity(newUser)), address(identity2));
        assertEq(identityRegistry.investorCountry(newUser), COUNTRY_US); // Country should remain unchanged
    }

    function testUpdateIdentity_RevertsWhenNotAgent() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        address nonAgent = address(0x5555);
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistry.updateIdentity(newUser, IIdentity(address(identity2)));
    }

    function testUpdateIdentity_EmitsEvent() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        vm.expectEmit(true, true, false, true);
        emit IdentityUpdated(IIdentity(address(identity1)), IIdentity(address(identity2)));
        vm.prank(identityRegistry.owner());
        identityRegistry.updateIdentity(newUser, IIdentity(address(identity2)));
    }

    // ============ updateCountry() tests ============

    function testUpdateCountry_Success() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        // Register identity first
        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        // Update country
        vm.expectEmit(true, true, false, true);
        emit CountryUpdated(newUser, COUNTRY_UK);
        vm.prank(identityRegistry.owner());
        identityRegistry.updateCountry(newUser, COUNTRY_UK);

        assertEq(identityRegistry.investorCountry(newUser), COUNTRY_UK);
        assertEq(address(identityRegistry.identity(newUser)), address(identity1)); // Identity should remain unchanged
    }

    function testUpdateCountry_RevertsWhenNotAgent() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        address nonAgent = address(0x5555);
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistry.updateCountry(newUser, COUNTRY_UK);
    }

    function testUpdateCountry_EmitsEvent() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        vm.expectEmit(true, true, false, true);
        emit CountryUpdated(newUser, COUNTRY_UK);
        vm.prank(identityRegistry.owner());
        identityRegistry.updateCountry(newUser, COUNTRY_UK);
    }

    // ============ deleteIdentity() tests ============

    function testDeleteIdentity_Success() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        // Register identity first
        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);
        assertTrue(identityRegistry.contains(newUser));

        // Delete identity
        vm.expectEmit(true, true, false, true);
        emit IdentityRemoved(newUser, IIdentity(address(identity1)));
        vm.prank(identityRegistry.owner());
        identityRegistry.deleteIdentity(newUser);

        assertFalse(identityRegistry.contains(newUser));
        assertEq(address(identityRegistry.identity(newUser)), address(0));
    }

    function testDeleteIdentity_RevertsWhenNotAgent() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        address nonAgent = address(0x5555);
        vm.prank(nonAgent);
        vm.expectRevert();
        identityRegistry.deleteIdentity(newUser);
    }

    function testDeleteIdentity_EmitsEvent() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        vm.expectEmit(true, true, false, true);
        emit IdentityRemoved(newUser, IIdentity(address(identity1)));
        vm.prank(identityRegistry.owner());
        identityRegistry.deleteIdentity(newUser);
    }

    // ============ setIdentityRegistryStorage() tests ============

    function testSetIdentityRegistryStorage_Success() public {
        RWAIdentityRegistryStorage newStorage = new RWAIdentityRegistryStorage();
        newStorage.init();

        vm.expectEmit(true, false, false, true);
        emit IdentityStorageSet(address(newStorage));
        vm.prank(identityRegistry.owner());
        identityRegistry.setIdentityRegistryStorage(address(newStorage));

        assertEq(address(identityRegistry.identityStorage()), address(newStorage));
    }

    function testSetIdentityRegistryStorage_RevertsWhenNotOwner() public {
        RWAIdentityRegistryStorage newStorage = new RWAIdentityRegistryStorage();
        newStorage.init();

        address nonOwner = address(0x5555);
        vm.prank(nonOwner);
        vm.expectRevert();
        identityRegistry.setIdentityRegistryStorage(address(newStorage));
    }

    function testSetIdentityRegistryStorage_EmitsEvent() public {
        RWAIdentityRegistryStorage newStorage = new RWAIdentityRegistryStorage();
        newStorage.init();

        vm.expectEmit(true, false, false, true);
        emit IdentityStorageSet(address(newStorage));
        vm.prank(identityRegistry.owner());
        identityRegistry.setIdentityRegistryStorage(address(newStorage));
    }

    // ============ setClaimTopicsRegistry() tests ============

    function testSetClaimTopicsRegistry_Success() public {
        RWAClaimTopicsRegistry newRegistry = new RWAClaimTopicsRegistry();
        newRegistry.init();

        vm.expectEmit(true, false, false, true);
        emit ClaimTopicsRegistrySet(address(newRegistry));
        vm.prank(identityRegistry.owner());
        identityRegistry.setClaimTopicsRegistry(address(newRegistry));

        assertEq(address(identityRegistry.topicsRegistry()), address(newRegistry));
    }

    function testSetClaimTopicsRegistry_RevertsWhenNotOwner() public {
        RWAClaimTopicsRegistry newRegistry = new RWAClaimTopicsRegistry();
        newRegistry.init();

        address nonOwner = address(0x5555);
        vm.prank(nonOwner);
        vm.expectRevert();
        identityRegistry.setClaimTopicsRegistry(address(newRegistry));
    }

    function testSetClaimTopicsRegistry_EmitsEvent() public {
        RWAClaimTopicsRegistry newRegistry = new RWAClaimTopicsRegistry();
        newRegistry.init();

        vm.expectEmit(true, false, false, true);
        emit ClaimTopicsRegistrySet(address(newRegistry));
        vm.prank(identityRegistry.owner());
        identityRegistry.setClaimTopicsRegistry(address(newRegistry));
    }

    // ============ setTrustedIssuersRegistry() tests ============

    function testSetTrustedIssuersRegistry_Success() public {
        RWATrustedIssuersRegistry newRegistry = new RWATrustedIssuersRegistry();
        newRegistry.init();

        vm.expectEmit(true, false, false, true);
        emit TrustedIssuersRegistrySet(address(newRegistry));
        vm.prank(identityRegistry.owner());
        identityRegistry.setTrustedIssuersRegistry(address(newRegistry));

        assertEq(address(identityRegistry.issuersRegistry()), address(newRegistry));
    }

    function testSetTrustedIssuersRegistry_RevertsWhenNotOwner() public {
        RWATrustedIssuersRegistry newRegistry = new RWATrustedIssuersRegistry();
        newRegistry.init();

        address nonOwner = address(0x5555);
        vm.prank(nonOwner);
        vm.expectRevert();
        identityRegistry.setTrustedIssuersRegistry(address(newRegistry));
    }

    function testSetTrustedIssuersRegistry_EmitsEvent() public {
        RWATrustedIssuersRegistry newRegistry = new RWATrustedIssuersRegistry();
        newRegistry.init();

        vm.expectEmit(true, false, false, true);
        emit TrustedIssuersRegistrySet(address(newRegistry));
        vm.prank(identityRegistry.owner());
        identityRegistry.setTrustedIssuersRegistry(address(newRegistry));
    }

    // ============ contains() tests ============

    function testContains_ReturnsTrueWhenRegistered() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        assertTrue(identityRegistry.contains(newUser));
    }

    function testContains_ReturnsFalseWhenNotRegistered() public view{
        address newUser = address(0x9999);
        assertFalse(identityRegistry.contains(newUser));
    }

    function testContains_ReturnsFalseAfterDeletion() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);
        assertTrue(identityRegistry.contains(newUser));

        vm.prank(identityRegistry.owner());
        identityRegistry.deleteIdentity(newUser);
        assertFalse(identityRegistry.contains(newUser));
    }

    // ============ identity() tests ============

    function testIdentity_ReturnsRegisteredIdentity() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        assertEq(address(identityRegistry.identity(newUser)), address(identity1));
    }

    function testIdentity_ReturnsZeroWhenNotRegistered() public view{
        address newUser = address(0x9999);
        assertEq(address(identityRegistry.identity(newUser)), address(0));
    }

    function testIdentity_ReturnsUpdatedIdentity() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);
        assertEq(address(identityRegistry.identity(newUser)), address(identity1));

        vm.prank(identityRegistry.owner());
        identityRegistry.updateIdentity(newUser, IIdentity(address(identity2)));
        assertEq(address(identityRegistry.identity(newUser)), address(identity2));
    }

    // ============ investorCountry() tests ============

    function testInvestorCountry_ReturnsRegisteredCountry() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        assertEq(identityRegistry.investorCountry(newUser), COUNTRY_US);
    }

    function testInvestorCountry_ReturnsZeroWhenNotRegistered() public view{
        address newUser = address(0x9999);
        assertEq(identityRegistry.investorCountry(newUser), 0);
    }

    function testInvestorCountry_ReturnsUpdatedCountry() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);
        assertEq(identityRegistry.investorCountry(newUser), COUNTRY_US);

        vm.prank(identityRegistry.owner());
        identityRegistry.updateCountry(newUser, COUNTRY_UK);
        assertEq(identityRegistry.investorCountry(newUser), COUNTRY_UK);
    }

    // ============ isVerified() tests ============

    function testIsVerified_ReturnsTrueWhenNoClaimTopics() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        // Remove all claim topics
        vm.startPrank(claimTopicsRegistry.owner());
        uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
        for (uint256 i = 0; i < topics.length; i++) {
            claimTopicsRegistry.removeClaimTopic(topics[i]);
        }
        vm.stopPrank();

        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

        assertTrue(identityRegistry.isVerified(newUser));
    }

    function testIsVerified_ReturnsFalseWhenNotRegistered() public view{
        address newUser = address(0x9999);
        assertFalse(identityRegistry.isVerified(newUser));
    }

    // function testIsVerified_ReturnsFalseWhenNoTrustedIssuers() public {
    //     address newUser = address(0x9999);
    //     identityRegistry.addAgent(identityRegistry.owner());

    //     vm.prank(identityRegistry.owner());
    //     identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);

    //     // Remove all trusted issuers for the claim topics
    //     uint256[] memory topics = claimTopicsRegistry.getClaimTopics();
    //     if (topics.length > 0) {
    //         vm.startPrank(trustedIssuersRegistry.owner());
    //         // Get all issuers and remove them
    //         // Note: This test assumes there are claim topics but no trusted issuers for them
    //         vm.stopPrank();
    //     }

    //     // If there are claim topics but no trusted issuers, should return false
    //     // The exact behavior depends on the setup, but we can test the basic case
    //     if (topics.length > 0) {
    //         // This will likely return false because MockIdentity.getClaim returns empty data
    //         // and the verification logic will fail
    //         assertFalse(identityRegistry.isVerified(newUser));
    //     }
    // }

    // ============ Integration tests ============

    function testFullLifecycle() public {
        address newUser = address(0x9999);
        identityRegistry.addAgent(identityRegistry.owner());

        // Register
        vm.prank(identityRegistry.owner());
        identityRegistry.registerIdentity(newUser, IIdentity(address(identity1)), COUNTRY_US);
        assertTrue(identityRegistry.contains(newUser));
        assertEq(address(identityRegistry.identity(newUser)), address(identity1));
        assertEq(identityRegistry.investorCountry(newUser), COUNTRY_US);

        // Update country
        vm.prank(identityRegistry.owner());
        identityRegistry.updateCountry(newUser, COUNTRY_UK);
        assertEq(identityRegistry.investorCountry(newUser), COUNTRY_UK);
        assertEq(address(identityRegistry.identity(newUser)), address(identity1));

        // Update identity
        vm.prank(identityRegistry.owner());
        identityRegistry.updateIdentity(newUser, IIdentity(address(identity2)));
        assertEq(address(identityRegistry.identity(newUser)), address(identity2));
        assertEq(identityRegistry.investorCountry(newUser), COUNTRY_UK);

        // Delete
        vm.prank(identityRegistry.owner());
        identityRegistry.deleteIdentity(newUser);
        assertFalse(identityRegistry.contains(newUser));
        assertEq(address(identityRegistry.identity(newUser)), address(0));
    }

    function testBatchRegisterAndUpdate() public {
        address newUser1 = address(0x1111);
        address newUser2 = address(0x2222);
        identityRegistry.addAgent(identityRegistry.owner());

        // Batch register
        address[] memory userAddresses = new address[](2);
        IIdentity[] memory identities = new IIdentity[](2);
        uint16[] memory countries = new uint16[](2);

        userAddresses[0] = newUser1;
        userAddresses[1] = newUser2;
        identities[0] = IIdentity(address(identity1));
        identities[1] = IIdentity(address(identity2));
        countries[0] = COUNTRY_US;
        countries[1] = COUNTRY_UK;

        vm.prank(identityRegistry.owner());
        identityRegistry.batchRegisterIdentity(userAddresses, identities, countries);

        // Update both
        vm.prank(identityRegistry.owner());
        identityRegistry.updateCountry(newUser1, COUNTRY_FR);
        vm.prank(identityRegistry.owner());
        identityRegistry.updateIdentity(newUser2, IIdentity(address(identity3)));

        assertEq(identityRegistry.investorCountry(newUser1), COUNTRY_FR);
        assertEq(address(identityRegistry.identity(newUser2)), address(identity3));
    }
}