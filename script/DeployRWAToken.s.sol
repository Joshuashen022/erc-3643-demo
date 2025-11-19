// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {RWAToken} from "../src/rwa/RWAToken.sol";
import {DeployRWAIdentityRegistry} from "./DeployRWAIdentityRegistry.s.sol";
import {DeployRWACompliance} from "./utils/DeployRWACompliance.s.sol";
import {RWACompliance} from "../src/rwa/RWACompliance.sol";
import {RWAIdentityRegistry} from "../src/rwa/IdentityRegistry.sol";
import {AddClaims} from "./AddClaims.s.sol";

contract DeployRWAToken is Script {
    function run() external returns (RWAToken) {
        string memory tokenName = vm.envOr("TOKEN_NAME", string("Test Token"));
        string memory tokenSymbol = vm.envOr("TOKEN_SYMBOL", string("TT"));
        uint8 tokenDecimals = uint8(vm.envOr("TOKEN_DECIMALS", uint256(6)));
        address onchainID = vm.envOr("ONCHAIN_ID", address(0x123456));
        bool addAgent = vm.envOr("ADD_AGENT", true);
        bool unpause = vm.envOr("UNPAUSE", true);
        
        DeployRWAIdentityRegistry deployIdentityRegistry = new DeployRWAIdentityRegistry();
        RWAIdentityRegistry identityRegistry = deployIdentityRegistry.run();
        
        DeployRWACompliance deployCompliance = new DeployRWACompliance();
        RWACompliance compliance = deployCompliance.run();
        
        AddClaims addClaims = new AddClaims();
        addClaims.run();
        console.log("KYC claim added to Identity");


        console.log("=== Deploying RWAToken ===");
        console.log("IdentityRegistry:", address(identityRegistry));
        console.log("Compliance:", address(compliance));
        console.log("Token Name:", tokenName);
        console.log("Token Symbol:", tokenSymbol);
        console.log("Token Decimals:", tokenDecimals);
        console.log("Onchain ID:", onchainID);
        
        vm.startBroadcast();
        
        RWAToken rwaToken = new RWAToken();
        rwaToken.init(
            address(identityRegistry),
            address(compliance),
            tokenName,
            tokenSymbol,
            tokenDecimals,
            onchainID
        );
        
        if (addAgent) {
            rwaToken.addAgent(msg.sender);
            console.log("Agent added to Token");
        }
        
        if (unpause) {
            rwaToken.unpause();
            console.log("Token unpaused");
        }
        
        vm.stopBroadcast();
        
        console.log("RWAToken deployed at:", address(rwaToken));
        
        return rwaToken;
    }
}

