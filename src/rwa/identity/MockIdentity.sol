// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";

// Base Mock Identity contract for testing
contract MockIdentity is IIdentity {
    struct Claim {
        uint256 topic;
        uint256 scheme;
        address issuer;
        bytes signature;
        bytes data;
        string uri;
        bool exists;
    }

    mapping(bytes32 => Claim) private claims;
    mapping(uint256 => bytes32[]) private claimsByTopic;

    // Constructor to initialize with a claim
    constructor(address _issuer, uint256 _topic) {
        if (_issuer != address(0) && _topic != 0) {
            bytes32 claimId = calculateClaimId(_issuer, _topic);
            claims[claimId] =
                Claim({topic: _topic, scheme: 1, issuer: _issuer, signature: "", data: "", uri: "", exists: true});
            claimsByTopic[_topic].push(claimId);
        }
    }

    function calculateClaimId(address _issuer, uint256 _topic) public pure returns (bytes32) {
        return keccak256(abi.encode(_issuer, _topic));
    }

    function addClaim(
        uint256 _topic,
        uint256 _scheme,
        address _issuer,
        bytes calldata _signature,
        bytes calldata _data,
        string calldata _uri
    ) external override returns (bytes32) {
        bytes32 claimId = calculateClaimId(_issuer, _topic);

        if (!claims[claimId].exists) {
            claimsByTopic[_topic].push(claimId);
        }

        claims[claimId] = Claim({
            topic: _topic, scheme: _scheme, issuer: _issuer, signature: _signature, data: _data, uri: _uri, exists: true
        });

        return claimId;
    }

    function getClaim(bytes32 _claimId)
        external
        view
        override
        returns (uint256, uint256, address, bytes memory, bytes memory, string memory)
    {
        Claim memory claim = claims[_claimId];
        require(claim.exists, "Claim does not exist");
        return (claim.topic, claim.scheme, claim.issuer, claim.signature, claim.data, claim.uri);
    }

    function removeClaim(bytes32 _claimId) external override returns (bool) {
        require(claims[_claimId].exists, "Claim does not exist");
        Claim memory claim = claims[_claimId];

        // Remove from claimsByTopic array
        bytes32[] storage topicClaims = claimsByTopic[claim.topic];
        for (uint256 i = 0; i < topicClaims.length; i++) {
            if (topicClaims[i] == _claimId) {
                topicClaims[i] = topicClaims[topicClaims.length - 1];
                topicClaims.pop();
                break;
            }
        }

        delete claims[_claimId];
        return true;
    }

    function getClaimIdsByTopic(uint256 _topic) external view override returns (bytes32[] memory) {
        return claimsByTopic[_topic];
    }

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

    // IIdentity specific function
    function isClaimValid(IIdentity, uint256, bytes calldata, bytes calldata) external pure override returns (bool) {
        return true;
    }
}

