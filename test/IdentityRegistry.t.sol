// // SPDX-License-Identifier: UNLICENSED
// pragma solidity 0.8.17;

// import {Test} from "forge-std/Test.sol";
// import {console} from "forge-std/console.sol";
// import {RWAIdentityRegistry} from "../src/rwa/IdentityRegistry.sol";
// import {RWAIdentityRegistryStorage} from "../src/rwa/IdentityRegistry.sol";
// import {RWATrustedIssuersRegistry} from "../src/rwa/IdentityRegistry.sol";
// import {RWAClaimTopicsRegistry} from "../src/rwa/IdentityRegistry.sol";
// import {TrustedIssuersRegistryUtils} from "./utils/TrustedIssuersRegistry.t.sol";
// import {IdentityRegistryStorageUtils} from "./utils/IdentityRegistryStorage.t.sol";
// import {ClaimTopicsRegistryUtils} from "./utils/ClaimTopicsRegistry.t.sol";
// import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
// import {MockClaimIssuer} from "./mocks/MockClaimIssuer.sol";

// contract RWAIdentityRegistryTest is Test {
//     RWAIdentityRegistry internal identityRegistry;
    
//     RWAIdentityRegistryStorage internal identityRegistryStorage;
//     RWATrustedIssuersRegistry internal trustedIssuersRegistry;
//     RWAClaimTopicsRegistry internal claimTopicsRegistry;

//     // address internal agent;
//     address internal user1;
//     address internal user2;
//     address internal user3;
//     MockClaimIssuer internal identity1;
//     MockClaimIssuer internal identity2;
//     MockClaimIssuer internal identity3;

//     uint16 constant COUNTRY_US = 840;
//     uint16 constant COUNTRY_UK = 826;
//     uint16 constant COUNTRY_FR = 250;

//     function setUp() public {
//         TrustedIssuersRegistryUtils trustedIssuersRegistryUtils = new TrustedIssuersRegistryUtils();
//         trustedIssuersRegistryUtils.setUp();
//         trustedIssuersRegistry = trustedIssuersRegistryUtils.trustedIssuersRegistry();
//         IdentityRegistryStorageUtils identityRegistryStorageUtils = new IdentityRegistryStorageUtils();
//         identityRegistryStorageUtils.setUp();
//         identityRegistryStorage = identityRegistryStorageUtils.identityRegistryStorage();
//         ClaimTopicsRegistryUtils claimTopicsRegistryUtils = new ClaimTopicsRegistryUtils();
//         claimTopicsRegistryUtils.setUp();
//         claimTopicsRegistry = claimTopicsRegistryUtils.claimTopicsRegistry();

//         // Deploy IdentityRegistry
//         identityRegistry = new RWAIdentityRegistry();

//         // Initialize IdentityRegistry
//         identityRegistry.init(address(trustedIssuersRegistry), address(claimTopicsRegistry), address(identityRegistryStorage));

//         // Set up test addresses and identities
//         // agent = address(0x1111);
//         user1 = address(0xAAAA);
//         user2 = address(0xBBBB);
//         user3 = address(0xCCCC);

//         // Deploy mock identities
//         identity1 = new MockClaimIssuer();
//         identity2 = new MockClaimIssuer();
//         identity3 = new MockClaimIssuer();

//         // Add agent to IdentityRegistry
//         // identityRegistry.addAgent(agent);

//         // // Print addresses
//         // console.log("identityRegistryStorage address:", address(identityRegistryStorage));
//         // console.log("trustedIssuersRegistry address:", address(trustedIssuersRegistry));
//         // console.log("claimTopicsRegistry address:", address(claimTopicsRegistry));
//         // console.log("identityRegistry address:", address(identityRegistry));
//     }

//     function testInit() public view {
//         assertEq(address(identityRegistry.identityStorage()), address(identityRegistryStorage));
//         assertEq(address(identityRegistry.issuersRegistry()), address(trustedIssuersRegistry));
//         assertEq(address(identityRegistry.topicsRegistry()), address(claimTopicsRegistry));
//     }

//     function testBatchRegisterIdentity() public {
//         // Prepare arrays for batch registration
//         address[] memory userAddresses = new address[](3);
//         IIdentity[] memory identities = new IIdentity[](3);
//         uint16[] memory countries = new uint16[](3);

//         userAddresses[0] = user1;
//         userAddresses[1] = user2;
//         userAddresses[2] = user3;

//         identities[0] = IIdentity(address(identity1));
//         identities[1] = IIdentity(address(identity2));
//         identities[2] = IIdentity(address(identity3));

//         countries[0] = COUNTRY_US;
//         countries[1] = COUNTRY_UK;
//         countries[2] = COUNTRY_FR;

//         // Bind IdentityRegistry to IdentityRegistryStorage (makes IdentityRegistry an agent of storage)
//         identityRegistry.addAgent(identityRegistry.owner());
//         console.log("identityRegistryStorage.owner():", identityRegistryStorage.owner());
//         // identityRegistryStorage.bindIdentityRegistry(address(identityRegistry));


//         // Call batchRegisterIdentity as agent
//         vm.prank(identityRegistry.owner());
//         // identityRegistry.batchRegisterIdentity(userAddresses, identities, countries);
        
//         // vm.prank(identityRegistry.owner());
//         // identityRegistry.batchRegisterIdentity(userAddresses, identities, countries);
//         // Verify all identities are registered correctly
//         // assertEq(address(identityRegistry.identity(user1)), address(identity1));
//         // assertEq(identityRegistry.investorCountry(user1), COUNTRY_US);
//         // assertTrue(identityRegistry.contains(user1));

//         // assertEq(address(identityRegistry.identity(user2)), address(identity2));
//         // assertEq(identityRegistry.investorCountry(user2), COUNTRY_UK);
//         // assertTrue(identityRegistry.contains(user2));

//         // assertEq(address(identityRegistry.identity(user3)), address(identity3));
//         // assertEq(identityRegistry.investorCountry(user3), COUNTRY_FR);
//         // assertTrue(identityRegistry.contains(user3));
//     }
// }