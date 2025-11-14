// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";

// Mock Identity contract for testing
contract MockIdentity is IIdentity {
    // IERC734 (Key Holder) functions
    function addKey(bytes32, uint256, uint256) external pure override returns (bool) {
        return true;
    }

    function approve(uint256, bool) external pure override returns (bool) {
        return true;
    }

    function removeKey(bytes32, uint256) external pure override returns (bool) {
        return true;
    }

    function execute(address, uint256, bytes calldata) external payable override returns (uint256) {
        return 0;
    }

    function getKey(bytes32) external pure override returns (uint256[] memory, uint256, bytes32) {
        return (new uint256[](0), 0, bytes32(0));
    }

    function getKeyPurposes(bytes32) external pure override returns (uint256[] memory) {
        return new uint256[](0);
    }

    function getKeysByPurpose(uint256) external pure override returns (bytes32[] memory) {
        return new bytes32[](0);
    }

    function keyHasPurpose(bytes32, uint256) external pure override returns (bool) {
        return false;
    }

    // IERC735 (Claim Holder) functions
    function addClaim(
        uint256,
        uint256,
        address,
        bytes calldata,
        bytes calldata,
        string calldata
    ) external virtual override returns (bytes32) {
        return bytes32(0);
    }

    function removeClaim(bytes32) external virtual override returns (bool) {
        return true;
    }

    function getClaim(bytes32)
        external
        view
        virtual
        returns (
            uint256,
            uint256,
            address,
            bytes memory,
            bytes memory,
            string memory
        )
    {
        return (0, 0, address(0), "", "", "");
    }

    function getClaimIdsByTopic(uint256) external view virtual override returns (bytes32[] memory) {
        return new bytes32[](0);
    }

    // IIdentity specific function
    function isClaimValid(
        IIdentity,
        uint256,
        bytes calldata,
        bytes calldata
    ) external pure override returns (bool) {
        return true;
    }
}

