// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {RWAIdentityRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAIdentityRegistryStorage} from "../src/rwa/IdentityRegistry.sol";
import {RWATrustedIssuersRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAClaimTopicsRegistry} from "../src/rwa/IdentityRegistry.sol";
import {TrustedIssuersRegistryUtils} from "./utils/TrustedIssuersRegistry.t.sol";
import {IdentityRegistryStorageUtils} from "./utils/IdentityRegistryStorage.t.sol";
import {ClaimTopicsRegistryUtils} from "./utils/ClaimTopicsRegistry.t.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {MockClaimIssuer} from "./mocks/MockClaimIssuer.sol";

contract RWAIdentityRegistryTest is Test {
    RWAIdentityRegistry internal identityRegistry;
    
    RWAIdentityRegistryStorage internal identityRegistryStorage;
    RWATrustedIssuersRegistry internal trustedIssuersRegistry;
    RWAClaimTopicsRegistry internal claimTopicsRegistry;

    address internal user1;
    address internal user2;
    address internal user3;
    MockClaimIssuer internal identity1;
    MockClaimIssuer internal identity2;
    MockClaimIssuer internal identity3;

    uint16 constant COUNTRY_US = 840;
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

        // Deploy mock identities
        identity1 = new MockClaimIssuer();
        identity2 = new MockClaimIssuer();
        identity3 = new MockClaimIssuer();

    }

    function testInit() public view {
        assertEq(address(identityRegistry.identityStorage()), address(identityRegistryStorage));
        assertEq(address(identityRegistry.issuersRegistry()), address(trustedIssuersRegistry));
        assertEq(address(identityRegistry.topicsRegistry()), address(claimTopicsRegistry));
        assertEq(address(identityRegistryStorage.linkedIdentityRegistries()[0]), address(identityRegistry));
    }

    function testBatchRegisterIdentity() public {
        // Prepare arrays for batch registration
        address[] memory userAddresses = new address[](3);
        IIdentity[] memory identities = new IIdentity[](3);
        uint16[] memory countries = new uint16[](3);

        userAddresses[0] = user1;
        userAddresses[1] = user2;
        userAddresses[2] = user3;

        identities[0] = IIdentity(address(identity1));
        identities[1] = IIdentity(address(identity2));
        identities[2] = IIdentity(address(identity3));

        countries[0] = COUNTRY_US;
        countries[1] = COUNTRY_UK;
        countries[2] = COUNTRY_FR;

        // Bind IdentityRegistry to IdentityRegistryStorage (makes IdentityRegistry an agent of storage)
        identityRegistry.addAgent(identityRegistry.owner());
        console.log("identityRegistryStorage.owner():", identityRegistryStorage.owner());
        // identityRegistryStorage.bindIdentityRegistry(address(identityRegistry));

        // Call batchRegisterIdentity as agent
        vm.expectRevert(bytes("address stored already"));
        identityRegistry.batchRegisterIdentity(userAddresses, identities, countries);
    }
}