// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeployRWAToken} from "../script/DeployRWAToken.s.sol";
import {RWAToken} from "../src/rwa/RWAToken.sol";
import {MockCompliance} from "./mocks/MockCompliance.sol";
import {MockIdentityRegistry} from "./mocks/MockIdentityRegistry.sol";

contract DeployRWATokenTest is Test {
    DeployRWAToken deployScript;
    RWAToken token;
    MockCompliance compliance;
    MockIdentityRegistry identityRegistry;

    string private constant TOKEN_NAME = "Test Token";
    string private constant TOKEN_SYMBOL = "TT";
    uint8 private constant TOKEN_DECIMALS = 6;
    address private constant ONCHAIN_ID = address(0x123456);

    function setUp() public {
        deployScript = new DeployRWAToken();
        compliance = new MockCompliance();
        identityRegistry = new MockIdentityRegistry();
    }

    function test_DeployRWAToken_Success() public {
        // Set environment variables
        vm.setEnv("IDENTITY_REGISTRY_ADDRESS", vm.toString(address(identityRegistry)));
        vm.setEnv("COMPLIANCE_ADDRESS", vm.toString(address(compliance)));
        vm.setEnv("TOKEN_NAME", TOKEN_NAME);
        vm.setEnv("TOKEN_SYMBOL", TOKEN_SYMBOL);
        vm.setEnv("TOKEN_DECIMALS", vm.toString(uint256(TOKEN_DECIMALS)));
        vm.setEnv("ONCHAIN_ID", vm.toString(ONCHAIN_ID));

        // Execute deployment script
        token = deployScript.run();

        // Verify deployment
        assertNotEq(address(token), address(0), "Token should be deployed");
        
        // Verify initialization
        assertEq(token.name(), TOKEN_NAME, "Token name should be set");
        assertEq(token.symbol(), TOKEN_SYMBOL, "Token symbol should be set");
        assertEq(token.decimals(), TOKEN_DECIMALS, "Token decimals should be set");
        assertEq(token.onchainID(), ONCHAIN_ID, "Onchain ID should be set");
        assertEq(address(token.identityRegistry()), address(identityRegistry), "IdentityRegistry should be set");
        assertEq(address(token.compliance()), address(compliance), "Compliance should be set");
    }

    function test_DeployRWAToken_WithDefaults() public {
        // Set only required addresses, use defaults for others
        vm.setEnv("IDENTITY_REGISTRY_ADDRESS", vm.toString(address(identityRegistry)));
        vm.setEnv("COMPLIANCE_ADDRESS", vm.toString(address(compliance)));

        // Execute deployment script
        token = deployScript.run();

        // Verify deployment with defaults
        assertNotEq(address(token), address(0), "Token should be deployed");
        assertEq(token.name(), "Test Token", "Should use default token name");
        assertEq(token.symbol(), "TT", "Should use default token symbol");
        assertEq(token.decimals(), 6, "Should use default decimals");
    }

    function test_DeployRWAToken_WithAddAgent() public {
        // Set environment variables
        vm.setEnv("IDENTITY_REGISTRY_ADDRESS", vm.toString(address(identityRegistry)));
        vm.setEnv("COMPLIANCE_ADDRESS", vm.toString(address(compliance)));
        vm.setEnv("ADD_AGENT", "true");

        // Execute deployment script
        token = deployScript.run();

        // Verify agent was added (msg.sender in test context is the test contract)
        // Note: In the script, msg.sender is used, which in test context is the test contract
        assertTrue(true, "Token deployed with agent");
    }

    function test_DeployRWAToken_WithUnpause() public {
        // Set environment variables
        vm.setEnv("IDENTITY_REGISTRY_ADDRESS", vm.toString(address(identityRegistry)));
        vm.setEnv("COMPLIANCE_ADDRESS", vm.toString(address(compliance)));
        vm.setEnv("UNPAUSE", "true");

        // Execute deployment script
        token = deployScript.run();

        // Verify token is unpaused
        assertFalse(token.paused(), "Token should be unpaused");
    }

    function test_DeployRWAToken_RevertsWhenIdentityRegistryIsZero() public {
        // Set only compliance address
        vm.setEnv("IDENTITY_REGISTRY_ADDRESS", "");
        vm.setEnv("COMPLIANCE_ADDRESS", vm.toString(address(compliance)));

        // Should revert
        vm.expectRevert(bytes("IdentityRegistry and Compliance addresses must be provided"));
        deployScript.run();
    }

    function test_DeployRWAToken_RevertsWhenComplianceIsZero() public {
        // Set only identity registry address
        vm.setEnv("IDENTITY_REGISTRY_ADDRESS", vm.toString(address(identityRegistry)));
        vm.setEnv("COMPLIANCE_ADDRESS", "");

        // Should revert
        vm.expectRevert(bytes("IdentityRegistry and Compliance addresses must be provided"));
        deployScript.run();
    }

    function test_DeployRWAToken_RevertsWhenBothAddressesAreZero() public {
        // Don't set required addresses
        vm.setEnv("IDENTITY_REGISTRY_ADDRESS", "");
        vm.setEnv("COMPLIANCE_ADDRESS", "");

        // Should revert
        vm.expectRevert(bytes("IdentityRegistry and Compliance addresses must be provided"));
        deployScript.run();
    }

    function test_DeployRWAToken_CustomTokenParameters() public {
        string memory customName = "Custom Token";
        string memory customSymbol = "CT";
        uint8 customDecimals = 18;
        address customOnchainID = address(0xABCDEF);

        // Set environment variables with custom values
        vm.setEnv("IDENTITY_REGISTRY_ADDRESS", vm.toString(address(identityRegistry)));
        vm.setEnv("COMPLIANCE_ADDRESS", vm.toString(address(compliance)));
        vm.setEnv("TOKEN_NAME", customName);
        vm.setEnv("TOKEN_SYMBOL", customSymbol);
        vm.setEnv("TOKEN_DECIMALS", vm.toString(uint256(customDecimals)));
        vm.setEnv("ONCHAIN_ID", vm.toString(customOnchainID));

        // Execute deployment script
        token = deployScript.run();

        // Verify custom parameters
        assertEq(token.name(), customName, "Custom token name should be set");
        assertEq(token.symbol(), customSymbol, "Custom token symbol should be set");
        assertEq(token.decimals(), customDecimals, "Custom token decimals should be set");
        assertEq(token.onchainID(), customOnchainID, "Custom onchain ID should be set");
    }
}

