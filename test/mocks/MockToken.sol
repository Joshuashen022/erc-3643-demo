// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {IModularCompliance} from "ERC-3643/compliance/modular/IModularCompliance.sol";

contract MockToken {
    address public compliance;
    bool public transferCalled;
    bool public mintCalled;
    bool public burnCalled;
    address public lastFrom;
    address public lastTo;
    uint256 public lastValue;

    constructor(address _compliance) {
        compliance = _compliance;
    }

    function callTransferred(address _from, address _to, uint256 _value) external {
        transferCalled = true;
        lastFrom = _from;
        lastTo = _to;
        lastValue = _value;
        IModularCompliance(compliance).transferred(_from, _to, _value);
    }

    function callCreated(address _to, uint256 _value) external {
        mintCalled = true;
        lastTo = _to;
        lastValue = _value;
        IModularCompliance(compliance).created(_to, _value);
    }

    function callDestroyed(address _from, uint256 _value) external {
        burnCalled = true;
        lastFrom = _from;
        lastValue = _value;
        IModularCompliance(compliance).destroyed(_from, _value);
    }
}
