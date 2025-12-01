// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {DeploymentFactory} from "../src/deployment/DeploymentFactory.sol";
import {Government} from "../src/govern/Government.sol";
import {Create2} from "openzeppelin-contracts/contracts/utils/Create2.sol";

contract Template is Script {

    function create3_deploy() public {
        DeploymentFactory deploymentFactory = new DeploymentFactory();

        bytes32 salt = keccak256("Template");
        address predicted = deploymentFactory.predict3(salt);
        
        (address actual, ) = deploymentFactory.deployIfNotExists3(salt, abi.encodePacked(type(Government).creationCode));
        if (actual != predicted) {
            revert("Deployment failed");
        }
        console.log("Deployment successful", actual);
    }

    function create2_deploy() public {
        DeploymentFactory deploymentFactory = new DeploymentFactory();
        bytes memory initCode = abi.encodePacked(type(Government).creationCode);
        bytes32 salt = keccak256("Template");
        address predicted = deploymentFactory.predict2(salt, initCode);
        (address actual, ) = deploymentFactory.deployIfNotExists2(salt, initCode);
        if (actual != predicted) {
            revert("Deployment failed");
        }
        console.log("Deployment successful", actual);
    }

    function run() external {
        create3_deploy();
        console.log("--------------------------------");
        create2_deploy();
        console.log("--------------------------------");
    }
}

//  forge script script/Template.s.sol:Template \
//    --rpc-url http://127.0.0.1:8545 \
//    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
//    --broadcast