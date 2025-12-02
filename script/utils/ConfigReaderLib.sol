// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Vm} from "forge-std/Vm.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {console2} from "forge-std/console2.sol";

library ConfigReaderLib {
    /// @notice Configuration structure containing all deployment parameters
    struct DeploymentConfig {
        // Claim topics configuration
        uint256[] claimTopics;
        // Claim issuers configuration
        ClaimIssuerConfig[] claimIssuers;
        // Token configuration
        address suiteOwner;
        string tokenName;
        string tokenSymbol;
        uint8 tokenDecimals;
        address irs;
        address onchainId;
        address[] irAgents;
        address[] tokenAgents;
    }

    struct ClaimIssuerConfig {
        uint256 privateKey;
        uint256[] claimTopics;
    }

    /// @notice Reads deployment configuration from config.json file
    /// @dev Reads configuration from config.json file in project root
    ///      JSON format:
    ///      {
    ///        "claimTopics": [1, 2],
    ///        "token": {
    ///          "name": "TREX Token",
    ///          "symbol": "TREX",
    ///          "decimals": 18,
    ///          "suiteOwner": "0x...",  // optional, defaults to deployer
    ///          "irs": "0x...",  // optional, defaults to address(0)
    ///          "onchainId": "0x...",  // optional, defaults to address(0)
    ///          "irAgents": ["0x..."],  // optional, defaults to [suiteOwner]
    ///          "tokenAgents": ["0x..."]  // optional, defaults to [suiteOwner]
    ///        }
    ///      }
    function readConfig(Vm vm, address defaultDeployer, DeploymentConfig storage config) public {
        // Read config.json file
        string memory configPath = string.concat(vm.projectRoot(), "/config.json");
        string memory json = vm.readFile(configPath);
        
        config.claimTopics = stdJson.readUintArray(json, ".claimTopics");
        config.tokenName = stdJson.readString(json, ".token.name");
        config.tokenSymbol = stdJson.readString(json, ".token.symbol");
        config.tokenDecimals = uint8(stdJson.readUint(json, ".token.decimals"));
        config.suiteOwner = _parseAddress(stdJson.readString(json, ".token.suiteOwner"));
        config.irs = _parseAddress(stdJson.readString(json, ".token.irs"));
        config.onchainId = _parseAddress(stdJson.readString(json, ".token.onchainId"));
        config.irAgents = _readAddressArray(json, ".token.irAgents");
        config.tokenAgents = _readAddressArray(json, ".token.tokenAgents");
        
        // Read claim issuers configuration
        ClaimIssuerConfig[] memory claimIssuers = _readClaimIssuersConfig(json, config.claimTopics);
        for (uint256 i = 0; i < claimIssuers.length; i++) {
            config.claimIssuers.push(claimIssuers[i]);
        }
        
        _displayConfig(config);
    }

    /// @notice Reads claim issuers configuration from JSON
    /// @param json The JSON string content
    /// @param defaultClaimTopics Default claim topics to use if not specified per issuer
    /// @return claimIssuers Array of claim issuer configurations
    function _readClaimIssuersConfig(
        string memory json,
        uint256[] memory defaultClaimTopics
    ) private view returns (ClaimIssuerConfig[] memory claimIssuers) {
        // First pass: count how many claim issuers are configured
        uint256 count = 0;
        while (true) {
            string memory jsonPath = string.concat(".claimIssuers[", _uint2str(count), "].privateKey");
            if (stdJson.keyExists(json, jsonPath)) {
                count++;
            } else {
                break;
            }
        }
        
        if (count == 0) {
            return new ClaimIssuerConfig[](0);
        }
        
        // Second pass: parse each claim issuer configuration
        claimIssuers = new ClaimIssuerConfig[](count);
        for (uint256 i = 0; i < count; i++) {
            string memory privateKeyPath = string.concat(".claimIssuers[", _uint2str(i), "].privateKey");
            string memory topicsPath = string.concat(".claimIssuers[", _uint2str(i), "].claimTopics");
            
            // Read private key as string and parse it
            string memory privateKeyStr = stdJson.readString(json, privateKeyPath);
            uint256 privateKey = _parseUint256(privateKeyStr);
            
            // Read claim topics (optional, use default if not specified)
            uint256[] memory claimTopics;
            if (stdJson.keyExists(json, topicsPath)) {
                claimTopics = stdJson.readUintArray(json, topicsPath);
            } else if (defaultClaimTopics.length > 0) {
                claimTopics = defaultClaimTopics;
            } else {
                // Default to topic 1 if nothing specified
                claimTopics = new uint256[](1);
                claimTopics[0] = 1;
            }
            
            claimIssuers[i] = ClaimIssuerConfig({
                privateKey: privateKey,
                claimTopics: claimTopics
            });
        }
    }

    /// @notice Parses a string to uint256, handling hex and decimal formats
    /// @param str The string to parse
    /// @return num The parsed uint256 value
    function _parseUint256(string memory str) private pure returns (uint256 num) {
        bytes memory strBytes = bytes(str);
        require(strBytes.length > 0, "Empty string cannot be parsed");
        
        // Check if it's a hex string (starts with 0x)
        if (strBytes.length >= 2 && strBytes[0] == '0' && (strBytes[1] == 'x' || strBytes[1] == 'X')) {
            // Parse hex string
            uint256 result = 0;
            for (uint256 i = 2; i < strBytes.length; i++) {
                uint256 char = uint256(uint8(strBytes[i]));
                if (char >= 48 && char <= 57) {
                    result = result * 16 + (char - 48);
                } else if (char >= 65 && char <= 70) {
                    result = result * 16 + (char - 55);
                } else if (char >= 97 && char <= 102) {
                    result = result * 16 + (char - 87);
                } else {
                    revert("Invalid hex character");
                }
            }
            return result;
        } else {
            // Parse decimal string
            uint256 result = 0;
            for (uint256 i = 0; i < strBytes.length; i++) {
                uint256 char = uint256(uint8(strBytes[i]));
                require(char >= 48 && char <= 57, "Invalid decimal character");
                result = result * 10 + (char - 48);
            }
            return result;
        }
    }

    /// @notice Reads an array of addresses from JSON
    /// @param json The JSON string content
    /// @param jsonPath The JSON path to the array
    /// @return addresses Array of addresses
    function _readAddressArray(string memory json, string memory jsonPath) private view returns (address[] memory addresses) {
        // Count array length
        uint256 count = 0;
        while (true) {
            string memory path = string.concat(jsonPath, "[", _uint2str(count), "]");
            if (stdJson.keyExists(json, path)) {
                count++;
            } else {
                break;
            }
        }
        
        if (count == 0) {
            return new address[](0);
        }
        
        // Read addresses
        addresses = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            string memory path = string.concat(jsonPath, "[", _uint2str(i), "]");
            string memory addrStr = stdJson.readString(json, path);
            addresses[i] = _parseAddress(addrStr);
        }
    }

    /// @notice Parses a string address to address type
    /// @param str The string to parse (hex format: "0x...")
    /// @return addr The parsed address
    function _parseAddress(string memory str) private pure returns (address addr) {
        bytes memory strBytes = bytes(str);
        require(strBytes.length == 42, "Invalid address format");
        require(strBytes[0] == '0' && (strBytes[1] == 'x' || strBytes[1] == 'X'), "Address must start with 0x");
        
        uint160 result = 0;
        for (uint256 i = 2; i < 42; i++) {
            uint256 char = uint256(uint8(strBytes[i]));
            uint256 value;
            
            if (char >= 48 && char <= 57) {
                value = char - 48;
            } else if (char >= 65 && char <= 70) {
                value = char - 55;
            } else if (char >= 97 && char <= 102) {
                value = char - 87;
            } else {
                revert("Invalid hex character in address");
            }
            
            result = result * 16 + uint160(value);
        }
        
        return address(result);
    }

    /// @notice Converts uint256 to string
    /// @param num The number to convert
    /// @return str String representation of the number
    function _uint2str(uint256 num) private pure returns (string memory str) {
        if (num == 0) {
            return "0";
        }
        uint256 temp = num;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (num != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + num % 10));
            num /= 10;
        }
        return string(buffer);
    }

    /// @notice Displays the configuration for debugging
    /// @param config The configuration to display
    function _displayConfig(DeploymentConfig memory config) private view {
        console2.log("=== Deployment Configuration ===");
        console2.log("Claim topics count:", config.claimTopics.length);
        for (uint256 i = 0; i < config.claimTopics.length; i++) {
            console2.log("  Topic", i, ":", config.claimTopics[i]);
        }
        console2.log("Token name:", config.tokenName);
        console2.log("Token symbol:", config.tokenSymbol);
        console2.log("Token decimals:", config.tokenDecimals);
        console2.log("Suite owner:", config.suiteOwner);
        console2.log("IRS:", config.irs);
        console2.log("ONCHAINID:", config.onchainId);
        console2.log("IR agents count:", config.irAgents.length);
        for (uint256 i = 0; i < config.irAgents.length; i++) {
            console2.log("  IR Agent", i, ":", config.irAgents[i]);
        }
        console2.log("Token agents count:", config.tokenAgents.length);
        for (uint256 i = 0; i < config.tokenAgents.length; i++) {
            console2.log("  Token Agent", i, ":", config.tokenAgents[i]);
        }
        console2.log("Claim issuers count:", config.claimIssuers.length);
        for (uint256 i = 0; i < config.claimIssuers.length; i++) {
            console2.log("  Claim Issuer", i, "privateKey:", config.claimIssuers[i].privateKey);
            console2.log("    Claim topics count:", config.claimIssuers[i].claimTopics.length);
            for (uint256 j = 0; j < config.claimIssuers[i].claimTopics.length; j++) {
                console2.log("      Topic", j, ":", config.claimIssuers[i].claimTopics[j]);
            }
        }
        console2.log("================================");
    }
}

