// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

contract MockCompliance {
    bool public bindCalled;
    address public boundToken;
    address public lastUnboundToken;
    bool public canTransferResult = true;
    address public transferredFrom;
    address public transferredTo;
    uint256 public transferredAmount;
    bool public transferredCalled;

    function bindToken(address _token) external {
        bindCalled = true;
        boundToken = _token;
    }

    function unbindToken(address _token) external {
        lastUnboundToken = _token;
        if (_token == boundToken) {
            boundToken = address(0);
        }
    }

    function addModule(address) external {}

    function removeModule(address) external {}

    function callModuleFunction(bytes calldata, address) external {}

    function transferred(address _from, address _to, uint256 _amount) external {
        transferredCalled = true;
        transferredFrom = _from;
        transferredTo = _to;
        transferredAmount = _amount;
    }

    function created(address, uint256) external {}

    function destroyed(address, uint256) external {}

    function canTransfer(address, address, uint256) external view returns (bool) {
        return canTransferResult;
    }

    function setCanTransfer(bool _result) external {
        canTransferResult = _result;
    }

    function getModules() external pure returns (address[] memory) {
        address[] memory modules = new address[](0);
        return modules;
    }

    function getTokenBound() external view returns (address) {
        return boundToken;
    }

    function isModuleBound(address) external pure returns (bool) {
        return false;
    }
}
