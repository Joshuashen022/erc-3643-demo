# Testing Deployment Scripts in Foundry

This guide explains how to test Foundry deployment scripts.

## Overview

Foundry scripts (files ending in `.s.sol`) can be tested by:
1. Creating test contracts that inherit from `Test`
2. Instantiating the script contract
3. Calling the `run()` function directly
4. Verifying the deployment results

## Key Concepts

### Environment Variables

Scripts often use `vm.envOr()` to read environment variables. In tests, you can:
- Use `vm.setEnv()` to set environment variables before calling the script
- Rely on default values if variables are not set
- Use `vm.envOr()` defaults in the script

### Broadcast Functions

Scripts use `vm.startBroadcast()` and `vm.stopBroadcast()` for actual deployments. **In tests, you don't need to worry about these** - they're only relevant when actually broadcasting transactions to a network. The script's `run()` function will execute normally in test context.

### Testing Pattern

```solidity
contract MyScriptTest is Test {
    MyScript deployScript;
    
    function setUp() public {
        deployScript = new MyScript();
    }
    
    function test_Deploy_Success() public {
        // Set environment variables if needed
        vm.setEnv("SOME_VAR", "value");
        
        // Execute the script
        DeployedContract contract = deployScript.run();
        
        // Verify deployment
        assertNotEq(address(contract), address(0));
        // ... more assertions
    }
}
```

## Test Files Created

The following test files have been created for the deployment scripts:

1. **DeployRWAIdentityRegistryStorage.t.sol** - Tests storage deployment
2. **DeployRWAIdentityRegistry.t.sol** - Tests identity registry deployment with dependencies
3. **DeployRWAToken.t.sol** - Tests token deployment with various configurations
4. **AddClaims.t.sol** - Tests the claims addition script

## Running Tests

```bash
# Run all script tests
forge test --match-path "test/Deploy*.t.sol"

# Run a specific test file
forge test --match-path "test/DeployRWAToken.t.sol"

# Run with verbose output
forge test --match-path "test/Deploy*.t.sol" -vvv
```

## Best Practices

1. **Test Success Cases**: Verify that scripts deploy contracts correctly
2. **Test Failure Cases**: Verify that scripts revert with appropriate error messages when inputs are invalid
3. **Test Edge Cases**: Test with default values, custom values, and boundary conditions
4. **Test Dependencies**: If scripts depend on other contracts, deploy them in `setUp()` or within tests
5. **Verify Initialization**: Check that deployed contracts are properly initialized
6. **Test Environment Variables**: Test with and without environment variables set

## Example Test Structure

```solidity
function test_Deploy_Success() public {
    // 1. Setup dependencies
    Dependency dep = new Dependency();
    
    // 2. Set environment variables
    vm.setEnv("DEPENDENCY_ADDRESS", vm.toString(address(dep)));
    
    // 3. Execute script
    DeployedContract contract = deployScript.run();
    
    // 4. Verify results
    assertNotEq(address(contract), address(0));
    // ... more assertions
}

function test_Deploy_RevertsWhenInvalid() public {
    // 1. Set invalid environment variables
    vm.setEnv("REQUIRED_VAR", "");
    
    // 2. Expect revert
    vm.expectRevert(bytes("Error message"));
    deployScript.run();
}
```

