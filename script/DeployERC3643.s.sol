// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {Identity} from "../lib/solidity/contracts/Identity.sol";
import {ImplementationAuthority} from "../lib/solidity/contracts/proxy/ImplementationAuthority.sol";
import {IdFactory} from "../lib/solidity/contracts/factory/IdFactory.sol";
import {Gateway} from "../lib/solidity/contracts/gateway/Gateway.sol";
import {Token} from "../lib/ERC-3643/contracts/token/Token.sol";
import {RWAToken} from "../src/rwa/RWAToken.sol";
import {ClaimTopicsRegistry} from "../lib/ERC-3643/contracts/registry/implementation/ClaimTopicsRegistry.sol";
import {IdentityRegistry} from "../lib/ERC-3643/contracts/registry/implementation/IdentityRegistry.sol";
import {IdentityRegistryStorage} from "../lib/ERC-3643/contracts/registry/implementation/IdentityRegistryStorage.sol";
import {TrustedIssuersRegistry} from "../lib/ERC-3643/contracts/registry/implementation/TrustedIssuersRegistry.sol";
import {ModularCompliance} from "../lib/ERC-3643/contracts/compliance/modular/ModularCompliance.sol";
import {TREXImplementationAuthority} from "../lib/ERC-3643/contracts/proxy/authority/TREXImplementationAuthority.sol";
import {ITREXImplementationAuthority} from "../lib/ERC-3643/contracts/proxy/authority/ITREXImplementationAuthority.sol";
import {IAFactory} from "../lib/ERC-3643/contracts/proxy/authority/IAFactory.sol";
import {TREXFactory} from "../lib/ERC-3643/contracts/factory/TREXFactory.sol";
import {ITREXFactory} from "../lib/ERC-3643/contracts/factory/ITREXFactory.sol";
import {TREXGateway} from "../lib/ERC-3643/contracts/factory/TREXGateway.sol";
import {TestModule} from "../lib/ERC-3643/contracts/compliance/modular/modules/TestModule.sol";
import {RWAIdentity, RWAClaimIssuer} from "../src/rwa/identity/Identity.sol";
import {RWAIdentityRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWAClaimTopicsRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWATrustedIssuersRegistry} from "../src/rwa/IdentityRegistry.sol";
import {RWACompliance} from "../src/rwa/RWACompliance.sol";
import {RWAIdentityRegistryStorage} from "../src/rwa/IdentityRegistry.sol";
import {RWAIdentityIdFactory, RWAIdentityGateway} from "../src/rwa/proxy/RWAIdentityIdFactory.sol";
import {RWAClaimIssuerIdFactory, RWAClaimIssuerGateway} from "../src/rwa/proxy/RWAClaimIssuerIdFactory.sol";
import {IIdentity} from "../lib/solidity/contracts/interface/IIdentity.sol";

contract DeployERC3643 is Script {
    // TREX factory contracts
    TREXImplementationAuthority public trexImplementationAuthority;
    TREXFactory public trexFactory;
    TREXGateway public trexGateway;
    IAFactory public iaFactory;

    // RWA Identity contracts
    RWAIdentity public rwaIdentityImpl;
    RWAClaimIssuer public rwaClaimIssuerImpl;

    ImplementationAuthority public implementationAuthority;
    ImplementationAuthority public claimIssuerImplementationAuthority;
    RWAIdentityIdFactory public identityidFactory;
    RWAIdentityGateway public identityGateway;
    RWAClaimIssuerIdFactory public claimIssuerIdFactory;
    RWAClaimIssuerGateway public claimIssuerGateway;

    RWAToken public token;
    RWACompliance public compliance;
    RWAIdentityRegistry public identityRegistry;
    RWAIdentityRegistryStorage public identityRegistryStorage;
    RWATrustedIssuersRegistry public trustedIssuersRegistry;
    RWAClaimTopicsRegistry public claimTopicsRegistry;

    ITREXImplementationAuthority.Version public currentVersion;
    address public identity;
    address public claimIssuer;
    string public salt = "trex-suite-1";
    address public suiteOwner;
    address public managementKey = vm.envOr("MANAGEMENT_KEY", msg.sender);
    address public claimKeyAddress = vm.envOr("CLAIM_KEY_ADDRESS", msg.sender);
    uint256 claimKeyPrivateKey = vm.envOr("CLAIM_KEY_PRIVATE_KEY", uint256(0));
    uint256 claimTopicKyc = vm.envOr("CLAIM_TOPIC_KYC", uint256(1));
    uint256 country = vm.envOr("COUNTRY_CODE", uint256(840));
    uint256 claimSchemeEcdsa = 1;
    uint256 purposeClaim = 3;
    uint256 keyTypeEcdsa = 1;

    function run() external {
        console.log("=== Deploying RWA Identity Factories ===");
        IdFactory idFactory = deployAllIdentityContracts();
        
        console.log("\n=== Deploying ERC3643 and Related Contracts ===");
        
        vm.startBroadcast();
        
        // Step 1: Deploy TREXImplementationAuthority
        // For reference contract, trexFactory is set to address(0) initially, will be set after factory deployment
        // iaFactory is set to address(0) initially, will be set after IAFactory deployment
        createTREXImplementationAuthority();
        vm.stopBroadcast();
        // Step 2: Deploy TREXFactory
        // Requires implementationAuthority and idFactory
        console.log("\n--- Deploying TREXFactory ---");
        vm.startBroadcast(msg.sender);
        trexFactory = new TREXFactory(
            address(trexImplementationAuthority),
            address(idFactory)
        );
        vm.stopBroadcast();
        
        vm.startBroadcast();
        idFactory.addTokenFactory(address(trexFactory));
        // Step 3: Set TREXFactory in TREXImplementationAuthority
        // This is required for reference contracts
        console.log("\n--- Setting TREXFactory in TREXImplementationAuthority ---");
        trexImplementationAuthority.setTREXFactory(address(trexFactory));
        console.log("TREXFactory set in TREXImplementationAuthority");
        vm.stopBroadcast();

        // Step 4: Deploy TREX Suite using TREXFactory
        // This deploys Token, IdentityRegistry, IdentityRegistryStorage, TrustedIssuersRegistry,
        // ClaimTopicsRegistry, and ModularCompliance in one transaction
        // Based on deployTREXSuite function (lines 103-177)
        console.log("\n--- Deploying TREX Suite via TREXFactory ---");
        deployTREXSuite();
        
        // Step 5: Deploy TREXGateway
        // Requires factory address and publicDeploymentStatus
        // Based on deployTREXSuite function (lines 339-362), the gateway wraps the factory
        console.log("\n--- Deploying TREXGateway ---");
        vm.startBroadcast();
        trexGateway = new TREXGateway(
            address(trexFactory),
            true  // publicDeploymentStatus = true (allow public deployments)
        );
        console.log("TREXGateway deployed at:", address(trexGateway));
        
        vm.stopBroadcast();
        
        console.log("\n=== Initializing an identity ===");
        initializeIdentity();
        
        // Validate agent initialization
        console.log("\n=== Validating ===");
        validate();
        console.log("Validation passed");

        // Unpause the token after deployment
        console.log("\n--- Unpausing Token ---");
        unPauseToken();
        console.log("Token unpaused successfully");

    }
   
    function deployAllIdentityContracts() internal returns (IdFactory) {
        address[] memory signers = new address[](0);

        vm.startBroadcast();
        rwaIdentityImpl = new RWAIdentity(msg.sender);
        rwaClaimIssuerImpl = new RWAClaimIssuer(msg.sender);
        implementationAuthority = new ImplementationAuthority(address(rwaIdentityImpl));
        claimIssuerImplementationAuthority = new ImplementationAuthority(address(rwaClaimIssuerImpl));

        identityidFactory = new RWAIdentityIdFactory(address(implementationAuthority));
        identityGateway = new RWAIdentityGateway(address(identityidFactory), signers);
        claimIssuerIdFactory = new RWAClaimIssuerIdFactory(address(claimIssuerImplementationAuthority));
        claimIssuerGateway = new RWAClaimIssuerGateway(address(claimIssuerIdFactory), signers);

        vm.stopBroadcast();
        console.log("IdentityIdFactory deployed at:", address(identityidFactory), "rwaIdentityImpl", address(rwaIdentityImpl));
        console.log("IdentityGateway deployed at:", address(identityGateway));
        console.log("ClaimIssuerIdFactory deployed at:", address(claimIssuerIdFactory), "rwaClaimIssuerImpl", address(rwaClaimIssuerImpl));
        console.log("ClaimIssuerGateway deployed at:", address(claimIssuerGateway));

        console.log("IdentityIdFactory owner:", identityidFactory.owner());
        console.log("IdentityGateway owner:", identityGateway.owner());
        console.log("ClaimIssuerIdFactory owner:", claimIssuerIdFactory.owner());
        console.log("ClaimIssuerGateway owner:", claimIssuerGateway.owner());
    
        _initializeClaimIssuer();
        return identityidFactory;
    }

    function createTREXImplementationAuthority() internal returns (TREXImplementationAuthority) {

        console.log("\n--- Deploying TREXImplementationAuthority ---");
        trexImplementationAuthority = new TREXImplementationAuthority(
            true,  // referenceStatus = true (main IA)
            address(0),  // trexFactory = address(0) initially
            address(0)   // iaFactory = address(0) initially, will be set after IAFactory deployment
        );
        console.log("TREXImplementationAuthority deployed at:", address(trexImplementationAuthority));
        
        // Step 1.5: Deploy implementation contracts and add TREX version
        console.log("\n--- Deploying Implementation Contracts ---");
        Token tokenImplementation = new Token();
        ClaimTopicsRegistry ctrImplementation = new ClaimTopicsRegistry();
        IdentityRegistryStorage irsImplementation = new IdentityRegistryStorage();
        TrustedIssuersRegistry tirImplementation = new TrustedIssuersRegistry();
        ModularCompliance mcImplementation = new ModularCompliance();
        IdentityRegistry irImplementation = new IdentityRegistry();
        
        console.log("Token implementation deployed at:", address(tokenImplementation));
        console.log("ClaimTopicsRegistry implementation deployed at:", address(ctrImplementation));
        console.log("IdentityRegistryStorage implementation deployed at:", address(irsImplementation));
        console.log("TrustedIssuersRegistry implementation deployed at:", address(tirImplementation));
        console.log("ModularCompliance implementation deployed at:", address(mcImplementation));
        console.log("IdentityRegistry implementation deployed at:", address(irImplementation));
        
        // Add TREX version to TREXImplementationAuthority
        console.log("\n--- Adding TREX Version ---");
        
        ITREXImplementationAuthority.Version memory version = ITREXImplementationAuthority.Version({
            major: 4,
            minor: 0,
            patch: 0
        });

        currentVersion = version;

        ITREXImplementationAuthority.TREXContracts memory trexContracts = ITREXImplementationAuthority.TREXContracts({
            tokenImplementation: address(tokenImplementation),
            ctrImplementation: address(ctrImplementation),
            irImplementation: address(irImplementation),
            irsImplementation: address(irsImplementation),
            tirImplementation: address(tirImplementation),
            mcImplementation: address(mcImplementation)
        });
        trexImplementationAuthority.addTREXVersion(version, trexContracts);
        console.log("TREX version added successfully");
        
        // Activate the version so getter methods can return the implementation addresses
        trexImplementationAuthority.useTREXVersion(version);
        console.log("TREX version activated successfully");

        require(trexImplementationAuthority.getTokenImplementation() != address(0), "Token implementation is not set");
        require(trexImplementationAuthority.getCTRImplementation() != address(0), "ClaimTopicsRegistry implementation is not set");
        require(trexImplementationAuthority.getIRImplementation() != address(0), "IdentityRegistry implementation is not set");
        require(trexImplementationAuthority.getIRSImplementation() != address(0), "IdentityRegistryStorage implementation is not set");
        require(trexImplementationAuthority.getTIRImplementation() != address(0), "TrustedIssuersRegistry implementation is not set");
        require(trexImplementationAuthority.getMCImplementation() != address(0), "ModularCompliance implementation is not set");
        
        return trexImplementationAuthority;
    }

    function deployTREXSuite() internal {
        
        vm.startBroadcast(msg.sender);
        // Note: msg.sender should be the broadcaster address, which is also the factory owner
        // since we deployed the factory within vm.startBroadcast()
        // The factory owner is automatically set to the deployer (msg.sender) in the constructor
        suiteOwner = msg.sender;
        console.log("Suite owner (msg.sender):", suiteOwner);

        TestModule testModule = new TestModule();
        testModule.initialize();
        address[] memory complianceModules = new address[](1);
        complianceModules[0] = address(testModule);
        
        address[] memory irAgents = new address[](1);
        irAgents[0] = suiteOwner;
        address[] memory tokenAgents = new address[](1);
        tokenAgents[0] = suiteOwner;

        // Prepare TokenDetails struct
        // Note: Modify these values as needed for your specific deployment
        ITREXFactory.TokenDetails memory tokenDetails = ITREXFactory.TokenDetails({
            owner: suiteOwner,  // Owner of all deployed contracts
            name: "TREX Token",  // Token name
            symbol: "TREX",  // Token symbol
            decimals: 18,  // Token decimals
            irs: address(0),  // Set to address(0) to deploy new IdentityRegistryStorage
            ONCHAINID: address(0),  // Set to address(0) to create new token identity via IdFactory
            irAgents: irAgents,  // Identity Registry agents (max 5)
            tokenAgents: tokenAgents,  // Token agents (max 5)
            complianceModules: complianceModules,  // Compliance modules (max 30)
            complianceSettings: new bytes[](0)  // Compliance module settings
        });
        uint256 claimTopicKyc = 1;
        uint256[] memory claimTopics = new uint256[](1);
        claimTopics[0] = claimTopicKyc;
        address[] memory issuers = new address[](1);
        issuers[0] = claimIssuer;
        uint256[][] memory issuerClaims = new uint256[][](1);
        issuerClaims[0] = new uint256[](1);
        issuerClaims[0][0] = claimTopicKyc;
        // Prepare ClaimDetails struct
        // Note: Modify these values as needed for your specific deployment
        ITREXFactory.ClaimDetails memory claimDetails = ITREXFactory.ClaimDetails({
            claimTopics: claimTopics,  // Required claim topics (max 5)
            issuers: issuers,  // Trusted issuer addresses (max 5)
            issuerClaims: issuerClaims  // Claims allowed per issuer
        });
        
        // Deploy TREX Suite using the factory
        // The salt string determines the CREATE2 deployment address
        // Note: deployTREXSuite requires onlyOwner, so caller must be the factory owner

        trexFactory.deployTREXSuite(salt, tokenDetails, claimDetails);

        
        // // Get the deployed token address
        address tokenAddress = trexFactory.getToken(salt);
        console.log("TREX Suite deployed successfully");
        console.log("Token deployed at:", tokenAddress);
        console.log("Salt used:", salt);

        vm.stopBroadcast();

        token = RWAToken(tokenAddress);
        compliance = RWACompliance(address(token.compliance()));
        identityRegistry = RWAIdentityRegistry(address(token.identityRegistry()));
        identityRegistryStorage = RWAIdentityRegistryStorage(address(identityRegistry.identityStorage()));
        trustedIssuersRegistry = RWATrustedIssuersRegistry(address(identityRegistry.issuersRegistry()));
        claimTopicsRegistry = RWAClaimTopicsRegistry(address(identityRegistry.topicsRegistry()));

    }

    function _deploy(address identityImpl, address[] memory signers) internal returns (IdFactory idFactory, Gateway gateway) {
        vm.startBroadcast();
        implementationAuthority = new ImplementationAuthority(address(identityImpl));

        idFactory = new IdFactory(address(implementationAuthority));
        gateway = new Gateway(address(idFactory), signers);

        vm.stopBroadcast();
    }

    function initializeIdentity() internal {

        if (claimKeyPrivateKey == uint256(0)) {
            revert("CLAIM_KEY_PRIVATE_KEY is required");
        }

        vm.startBroadcast();
        identity = identityidFactory.createIdentity(managementKey, "identity1");
        vm.stopBroadcast();

        bytes32 claimKeyHash = keccak256(abi.encode(claimKeyAddress));

        vm.startBroadcast(managementKey);
        RWAIdentity(identity).addKey(claimKeyHash, purposeClaim, keyTypeEcdsa);
        
        bytes memory data = "";
        bytes32 dataHash = keccak256(abi.encode(identity, claimTopicKyc, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        RWAIdentity(identity).addClaim(claimTopicKyc, claimSchemeEcdsa, claimIssuer, sig, data, "");
        console.log("KYC claim added to Identity");

        vm.stopBroadcast();
        
        vm.startBroadcast(msg.sender);
        //msg.sender is the owner of identityRegistry
        identityRegistry.registerIdentity(managementKey, IIdentity(address(identity)), uint16(country));
        vm.stopBroadcast();
    }

    function unPauseToken() internal {
        address tokenAddress = trexFactory.getToken(salt);

        vm.startBroadcast(suiteOwner);
        RWAToken(tokenAddress).unpause();
        vm.stopBroadcast();
    }

    function validate() internal view {
        _validataRWAModule();
        _validateIdentity();
    }


    function _initializeClaimIssuer() internal {

        vm.startBroadcast();
        claimIssuer = claimIssuerIdFactory.createIdentity(managementKey, "claimissuer1");
        vm.stopBroadcast();
        bytes32 claimKeyHash = keccak256(abi.encode(claimKeyAddress));

        vm.startBroadcast(managementKey);
        RWAClaimIssuer(claimIssuer).addKey(claimKeyHash, purposeClaim, keyTypeEcdsa);
        
        console.log("ClaimIssuer initialized successfully", claimIssuer);

        vm.stopBroadcast();
    }

    function _validataRWAModule() internal view {
        // Check that suiteOwner is set
        require(suiteOwner != address(0), "Suite owner should be set");
        // Check Identity Registry agent
        require(
            identityRegistry.isAgent(suiteOwner),
            "Suite owner should be an agent of Identity Registry"
        );

        // Check Token agent
        require(
            token.isAgent(suiteOwner),
            "Suite owner should be an agent of Token"
        );
        // Check that suiteOwner is the owner of Token
        require(token.owner() == suiteOwner, "Token owner should match suite owner");
        require(identityRegistry.owner() == suiteOwner, "Identity Registry owner should match suite owner");
        require(compliance.owner() == suiteOwner, "Compliance owner should match suite owner");
        require(trustedIssuersRegistry.owner() == suiteOwner, "Trusted Issuers Registry owner should match suite owner");
        require(claimTopicsRegistry.owner() == suiteOwner, "Claim Topics Registry owner should match suite owner");
        
        // Check that suiteOwner is the owner of TREX Factory
        require(trexFactory.owner() == suiteOwner, "TREX Factory owner should match suite owner");


        console.log("Token:", address(token), "Agent", suiteOwner);
        console.log("Identity Registry:", address(token.identityRegistry()), "Agent", suiteOwner);

        console.log("Token:", address(token), "Owner", suiteOwner);
        console.log("Identity Registry:", address(token.identityRegistry()), "Owner", suiteOwner);
        console.log("Compliance:", address(compliance), "Owner", suiteOwner);
        console.log("Trusted Issuers Registry:", address(trustedIssuersRegistry), "Owner", suiteOwner);
        console.log("Claim Topics Registry:", address(claimTopicsRegistry), "Owner", suiteOwner);
        console.log("TREX Factory:", address(trexFactory), "Owner", suiteOwner);  
    }

    function _validateIdentity() internal view {
        // Check that managementKey is set
        require(managementKey != address(0), "Management key should be set");

        // Check that managementKey is a management key of Identity (purpose = 1)
        require(
            RWAIdentity(identity).keyHasPurpose(keccak256(abi.encode(managementKey)), 1),
            "Management key should be a management key of Identity"
        );

        // Check that managementKey is a management key of ClaimIssuer (purpose = 1)
        require(
            RWAClaimIssuer(claimIssuer).keyHasPurpose(keccak256(abi.encode(managementKey)), 1),
            "Management key should be a management key of ClaimIssuer"
        );

        console.log("Identity:", identity, "Management Key", managementKey);
        console.log("ClaimIssuer:", claimIssuer, "Management Key", managementKey);
    }
}

