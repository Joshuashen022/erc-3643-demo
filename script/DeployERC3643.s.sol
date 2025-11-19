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
    IdFactory public identityidFactory;
    Gateway public identityGateway;
    IdFactory public claimIssuerIdFactory;
    Gateway public claimIssuerGateway;


    ITREXImplementationAuthority.Version public currentVersion;
    address public identity;
    address public claimIssuer;
    string public salt = "trex-suite-1";
    address public suiteOwner;
    address public managementKey;

    function run() external {
        console.log("=== Deploying RWA Identity Factories ===");
        IdFactory idFactory = deployRWAIdentity();
        
        console.log("\n=== Deploying ERC3643 and Related Contracts ===");
        
        vm.startBroadcast();
        
        // Step 1: Deploy TREXImplementationAuthority
        // For reference contract, trexFactory is set to address(0) initially, will be set after factory deployment
        // iaFactory is set to address(0) initially, will be set after IAFactory deployment
        createTREXImplementationAuthority();
        
        // Step 2: Deploy TREXFactory
        // Requires implementationAuthority and idFactory
        console.log("\n--- Deploying TREXFactory ---");
        trexFactory = new TREXFactory(
            address(trexImplementationAuthority),
            address(idFactory)
        );
        console.log("TREXFactory deployed at:", address(trexFactory));
        
        idFactory.transferOwnership(address(trexFactory));

        // Step 3: Set TREXFactory in TREXImplementationAuthority
        // This is required for reference contracts
        console.log("\n--- Setting TREXFactory in TREXImplementationAuthority ---");
        trexImplementationAuthority.setTREXFactory(address(trexFactory));
        console.log("TREXFactory set in TREXImplementationAuthority");
        
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
        trexGateway = new TREXGateway(
            address(trexFactory),
            true  // publicDeploymentStatus = true (allow public deployments)
        );
        console.log("TREXGateway deployed at:", address(trexGateway));
        
        vm.stopBroadcast();
        
        // Unpause the token after deployment
        console.log("\n--- Unpausing Token ---");
        unPauseToken();
        console.log("Token unpaused successfully");

        // Validate agent initialization
        console.log("\n=== Validating ===");
        validate();
        console.log("Validation passed");
    }
   
    function deployRWAIdentity() internal returns (IdFactory) {
        
        rwaIdentityImpl = new RWAIdentity(msg.sender);
        rwaClaimIssuerImpl = new RWAClaimIssuer(msg.sender);

        address[] memory signers = new address[](0);
        (identityidFactory, identityGateway) = _deploy(address(rwaIdentityImpl), signers);
        (claimIssuerIdFactory, claimIssuerGateway) = _deploy(address(rwaClaimIssuerImpl), signers);
        
        console.log("IdentityIdFactory deployed at:", address(identityidFactory), "rwaIdentityImpl", address(rwaIdentityImpl));
        console.log("IdentityGateway deployed at:", address(identityGateway));
        console.log("ClaimIssuerIdFactory deployed at:", address(claimIssuerIdFactory), "rwaClaimIssuerImpl", address(rwaClaimIssuerImpl));
        console.log("ClaimIssuerGateway deployed at:", address(claimIssuerGateway));

        console.log("IdentityIdFactory owner:", identityidFactory.owner());
        console.log("IdentityGateway owner:", identityGateway.owner());
        console.log("ClaimIssuerIdFactory owner:", claimIssuerIdFactory.owner());
        console.log("ClaimIssuerGateway owner:", claimIssuerGateway.owner());
        
        initializeFromEnv();
        
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
    }

    function _deploy(address identityImpl, address[] memory signers) internal returns (IdFactory idFactory, Gateway gateway) {
        vm.startBroadcast();
        implementationAuthority = new ImplementationAuthority(address(identityImpl));

        idFactory = new IdFactory(address(implementationAuthority));
        gateway = new Gateway(address(idFactory), signers);

        vm.stopBroadcast();
    }

    function initializeFromEnv() internal {
        managementKey = vm.envOr("MANAGEMENT_KEY", msg.sender);
        address claimKeyAddress = managementKey;
        uint256 claimKeyPrivateKey = vm.envOr("CLAIM_KEY_PRIVATE_KEY", uint256(0));
        uint256 purposeClaim = 3;
        uint256 keyTypeEcdsa = 1;
        uint256 claimTopicKyc = 1;
        uint256 claimSchemeEcdsa = 1;

        if (claimKeyPrivateKey == uint256(0)) {
            revert("CLAIM_KEY_PRIVATE_KEY is required");
        }

        vm.startBroadcast();
        identity = identityidFactory.createIdentity(managementKey, "identity1");
        claimIssuer = claimIssuerIdFactory.createIdentity(managementKey, "claimissuer1");
        vm.stopBroadcast();
        bytes32 claimKeyHash = keccak256(abi.encode(claimKeyAddress));

        vm.startBroadcast(managementKey);
        RWAIdentity(identity).addKey(claimKeyHash, purposeClaim, keyTypeEcdsa);
        RWAClaimIssuer(claimIssuer).addKey(claimKeyHash, purposeClaim, keyTypeEcdsa);
        
        bytes memory data = "";
        bytes32 dataHash = keccak256(abi.encode(identity, claimTopicKyc, data));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimKeyPrivateKey, prefixedHash);
        bytes memory sig = abi.encodePacked(r, s, v);
        
        RWAIdentity(identity).addClaim(claimTopicKyc, claimSchemeEcdsa, claimIssuer, sig, data, "");
        console.log("KYC claim added to Identity");
        vm.stopBroadcast();
 
    }

    function unPauseToken() internal {
        address tokenAddress = trexFactory.getToken(salt);
        // Use vm.prank to call unpause as the token owner (who is an agent)
        // This works in both forge script and forge test environments
        vm.prank(suiteOwner);
        RWAToken(tokenAddress).unpause();
    }

    function validate() internal view {
        _validataRWAModule();
        _validateIdentity();
    }

    function _validataRWAModule() internal view {
        address tokenAddress = trexFactory.getToken(salt);
        RWAToken token = RWAToken(tokenAddress);
        RWAIdentityRegistry identityRegistry = RWAIdentityRegistry(address(token.identityRegistry()));
        
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

        // Check that suiteOwner is the owner of Identity Registry
        require(identityRegistry.owner() == suiteOwner, "Identity Registry owner should match suite owner");

        console.log("Token:", tokenAddress, "Suite Owner", suiteOwner);
        console.log("Identity Registry:", address(token.identityRegistry()), "Suite Owner", suiteOwner);
        
  
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

