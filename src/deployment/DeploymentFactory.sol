// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {CREATE3} from "../../lib/solady/src/utils/CREATE3.sol";
import {Create2} from "openzeppelin-contracts/contracts/utils/Create2.sol";

contract DeploymentFactory {
    function deploy3(bytes32 salt, bytes memory initCode) public returns (address) {
        return CREATE3.deployDeterministic(0, initCode, salt);
    }

    function predict3(bytes32 salt) public view returns (address) {
        return CREATE3.predictDeterministicAddress(salt, address(this));
    }

    function deploy2(bytes32 salt, bytes memory initCode) public returns (address) {
        return Create2.deploy(0, salt, initCode);
    }

    function predict2(bytes32 salt, bytes memory initCode) public view returns (address) {
        return Create2.computeAddress(salt, keccak256(initCode));
    }

    function deployIfNotExists3(bytes32 salt, bytes memory initCode) public returns (address, bool exists) {
        address predicted = this.predict3(salt);
        exists = predicted.code.length > 0;
        if (!exists) {
            return (this.deploy3(salt, initCode), exists);
        } else {
            return (predicted, exists);
        }
    }

    function deployIfNotExists2(bytes32 salt, bytes memory initCode) public returns (address, bool exists) {
        address predicted = this.predict2(salt, initCode);
        exists = predicted.code.length > 0;
        if (!exists) {
            return (this.deploy2(salt, initCode), exists);
        } else {
            return (predicted, exists);
        }
    }
}
