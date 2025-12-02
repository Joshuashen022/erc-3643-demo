// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {DeploymentFactory} from "../../src/deployment/DeploymentFactory.sol";
import {console2} from "forge-std/console2.sol";
import {Vm} from "forge-std/Vm.sol";
library DeploymentFactoryLib {
    function getDeploymentFactory(
        Vm vm,
        address deployer
    ) internal returns (DeploymentFactory deploymentFactory) {
        address deploymentFactoryAddress = vm.envOr("DEPLOYMENT_FACTORY", address(0));
        
        if (deploymentFactoryAddress == address(0)) {
            vm.startBroadcast(deployer);
            deploymentFactory = new DeploymentFactory();
            console2.log("DeploymentFactory deployed at", address(deploymentFactory));
            vm.stopBroadcast();
        } else {
            deploymentFactory = DeploymentFactory(deploymentFactoryAddress);
        }
    }
}