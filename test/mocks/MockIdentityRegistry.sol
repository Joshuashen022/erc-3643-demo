// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

contract MockIdentityRegistry {
    mapping(address => bool) public verifiedAddresses;

    function isVerified(address _userAddress) external view returns (bool) {
        return verifiedAddresses[_userAddress];
    }

    function setVerified(address _userAddress, bool _verified) external {
        verifiedAddresses[_userAddress] = _verified;
    }
}
