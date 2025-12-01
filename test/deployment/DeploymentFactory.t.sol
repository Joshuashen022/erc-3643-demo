// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DeploymentFactory} from "../../src/deployment/DeploymentFactory.sol";
import {Create2} from "openzeppelin-contracts/contracts/utils/Create2.sol";

// Simple contract for testing deployment
contract SimpleContract {
    uint256 public value;

    constructor(uint256 _value) {
        value = _value;
    }
}

contract DeploymentFactoryTest is Test {
    DeploymentFactory public factory;
    bytes32 public constant SALT = bytes32(uint256(0x1234));
    bytes32 public constant SALT2 = bytes32(uint256(0x5678));
    uint256 public constant INIT_VALUE = 42;

    function setUp() public {
        factory = new DeploymentFactory();
    }

    // ============ CREATE3 Tests ============

    function testDeploy3_Success() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address deployed = factory.deploy3(SALT, initCode);

        assertTrue(deployed != address(0));
        assertTrue(deployed.code.length > 0);
        SimpleContract deployedContract = SimpleContract(deployed);
        assertEq(deployedContract.value(), INIT_VALUE);
    }

    function testPredict3_ReturnsCorrectAddress() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address predicted = factory.predict3(SALT);
        address deployed = factory.deploy3(SALT, initCode);

        assertEq(predicted, deployed);
    }

    function testDeploy3_DifferentSaltsProduceDifferentAddresses() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address addr1 = factory.deploy3(SALT, initCode);
        address addr2 = factory.deploy3(SALT2, initCode);

        assertTrue(addr1 != addr2);
    }

    function testDeploy3_SameSaltProducesSameAddress() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address addr1 = factory.deploy3(SALT, initCode);
        
        // Deploy again with same salt should fail since contract already exists
        vm.expectRevert();
        factory.deploy3(SALT, initCode);
        
        // Verify address is the same
        address predicted = factory.predict3(SALT);
        assertEq(addr1, predicted);
    }

    function testDeployIfNotExists3_DeploysWhenNotExists() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address predicted = factory.predict3(SALT);
        assertEq(predicted.code.length, 0); // Verify it doesn't exist before

        (address deployed, bool exists) = factory.deployIfNotExists3(SALT, initCode);

        assertTrue(deployed != address(0));
        assertFalse(exists);
        assertTrue(deployed.code.length > 0);
        assertEq(deployed, predicted);
        SimpleContract deployedContract = SimpleContract(deployed);
        assertEq(deployedContract.value(), INIT_VALUE);
    }

    function testDeployIfNotExists3_ReturnsExistingWhenAlreadyDeployed() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        (address firstDeploy, bool firstExists) = factory.deployIfNotExists3(SALT, initCode);
        
        (address deployed, bool exists) = factory.deployIfNotExists3(SALT, initCode);

        assertEq(deployed, firstDeploy);
        assertFalse(firstExists); 
        assertTrue(exists); // Returns true after deployment
    }

    // ============ CREATE2 Tests ============

    function testDeploy2_Success() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address deployed = factory.deploy2(SALT, initCode);

        assertTrue(deployed != address(0));
        assertTrue(deployed.code.length > 0);
        SimpleContract deployedContract = SimpleContract(deployed);
        assertEq(deployedContract.value(), INIT_VALUE);
    }

    function testPredict2_ReturnsCorrectAddress() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address predicted = factory.predict2(SALT, initCode);
        address deployed = factory.deploy2(SALT, initCode);

        assertEq(predicted, deployed);
    }

    function testPredict2_MatchesCreate2ComputeAddress() public view {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address predicted = factory.predict2(SALT, initCode);
        address computed = Create2.computeAddress(SALT, keccak256(initCode), address(factory));

        assertEq(predicted, computed);
    }

    function testDeploy2_DifferentSaltsProduceDifferentAddresses() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address addr1 = factory.deploy2(SALT, initCode);
        address addr2 = factory.deploy2(SALT2, initCode);

        assertTrue(addr1 != addr2);
    }

    function testDeploy2_DifferentBytecodeProduceDifferentAddresses() public {
        bytes memory initCode1 = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );
        bytes memory initCode2 = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE + 1)
        );

        address addr1 = factory.deploy2(SALT, initCode1);
        address addr2 = factory.deploy2(SALT, initCode2);

        assertTrue(addr1 != addr2);
    }

    function testDeploy2_SameSaltAndBytecodeProducesSameAddress() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address addr1 = factory.deploy2(SALT, initCode);
        
        // Deploy again with same salt and bytecode should fail
        vm.expectRevert();
        factory.deploy2(SALT, initCode);
        
        // Verify address is the same
        address predicted = factory.predict2(SALT, initCode);
        assertEq(addr1, predicted);
    }

    function testDeployIfNotExists2_DeploysWhenNotExists() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address predicted = factory.predict2(SALT, initCode);
        assertEq(predicted.code.length, 0); // Verify it doesn't exist before

        (address deployed, bool exists) = factory.deployIfNotExists2(SALT, initCode);

        assertTrue(deployed != address(0));
        assertFalse(exists);
        assertTrue(deployed.code.length > 0);
        assertEq(deployed, predicted);
        SimpleContract deployedContract = SimpleContract(deployed);
        assertEq(deployedContract.value(), INIT_VALUE);
    }

    function testDeployIfNotExists2_ReturnsExistingWhenAlreadyDeployed() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address firstDeploy = factory.deploy2(SALT, initCode);
        
        (address deployed, bool exists) = factory.deployIfNotExists2(SALT, initCode);

        assertEq(deployed, firstDeploy);
        assertTrue(exists); // Already deployed
    }

    // ============ CREATE3 vs CREATE2 Tests ============

    function testDeploy3_AddressDifferentFromDeploy2() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address addr3 = factory.deploy3(SALT, initCode);
        address addr2 = factory.deploy2(SALT2, initCode);

        assertTrue(addr3 != addr2);
    }

    // ============ Edge Cases ============

    function testPredict3_WorksBeforeDeployment() public view {
        address predicted = factory.predict3(SALT);
        
        assertTrue(predicted != address(0));
        assertEq(predicted.code.length, 0);
    }

    function testPredict2_WorksBeforeDeployment() public view {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address predicted = factory.predict2(SALT, initCode);
        
        assertTrue(predicted != address(0));
        assertEq(predicted.code.length, 0);
    }

    function testDeployIfNotExists3_PredictsCorrectlyBeforeDeployment() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address predicted = factory.predict3(SALT);
        (address deployed, bool exists) = factory.deployIfNotExists3(SALT, initCode);
        
        assertEq(predicted, deployed);
        assertFalse(exists);
    }

    function testDeployIfNotExists2_PredictsCorrectlyBeforeDeployment() public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(INIT_VALUE)
        );

        address predicted = factory.predict2(SALT, initCode);
        (address deployed, bool exists) = factory.deployIfNotExists2(SALT, initCode);

        assertEq(predicted, deployed);
        assertFalse(exists);
    }

    // ============ Fuzz Tests ============

    function testFuzz_Deploy3_Predict3Consistency(bytes32 salt, uint256 value) public {
        // Build initCode with fuzzed `value`
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(value)
        );

        address predicted = factory.predict3(salt);
        address deployed = factory.deploy3(salt, initCode);

        assertEq(predicted, deployed);
        assertTrue(deployed.code.length > 0);
        assertEq(SimpleContract(deployed).value(), value);
    }

    function testFuzz_Deploy2_Predict2Consistency(bytes32 salt, uint256 value) public {
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(value)
        );

        address predicted = factory.predict2(salt, initCode);
        address deployed = factory.deploy2(salt, initCode);

        assertEq(predicted, deployed);
        assertTrue(deployed.code.length > 0);
        assertEq(SimpleContract(deployed).value(), value);
    }

    function testFuzz_DeployIfNotExists3_Idempotent(bytes32 salt, uint256 value, uint8 times) public {
        vm.assume(times > 0);
        
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(value)
        );

        // First call should deploy
        (address firstDeployed, bool firstExists) = factory.deployIfNotExists3(salt, initCode);
        assertFalse(firstExists);
        assertTrue(firstDeployed.code.length > 0);
        assertEq(SimpleContract(firstDeployed).value(), value);
        for (uint8 i = 1; i < times; i++) {
            (address deployed, bool exists) = factory.deployIfNotExists3(salt, initCode);
            assertTrue(exists);
            assertEq(deployed, firstDeployed);
        }

    }

    function testFuzz_DeployIfNotExists2_Idempotent(bytes32 salt, uint256 value, uint8 times) public {
        vm.assume(times > 0);
        
        bytes memory initCode = abi.encodePacked(
            type(SimpleContract).creationCode,
            abi.encode(value)
        );

        // First call should deploy
        (address firstDeployed, bool firstExists) = factory.deployIfNotExists2(salt, initCode);
        assertFalse(firstExists);
        assertTrue(firstDeployed.code.length > 0);
        assertEq(SimpleContract(firstDeployed).value(), value);
        for (uint8 i = 1; i < times; i++) {
            (address deployed, bool exists) = factory.deployIfNotExists2(salt, initCode);
            assertTrue(exists);
            assertEq(deployed, firstDeployed);
        }
    }
}

