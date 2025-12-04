// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {IModularCompliance} from "ERC-3643/compliance/modular/IModularCompliance.sol";
import {IModule} from "ERC-3643/compliance/modular/modules/IModule.sol";

contract MockModule is IModule {
    bool public bindCalled;
    bool public unbindCalled;
    address public lastCompliance;
    bool public transferActionCalled;
    bool public mintActionCalled;
    bool public burnActionCalled;
    bool public checkResult = true;
    bool public plugAndPlay = true;
    bool public canBindResult = true;

    function bindCompliance(address _compliance) external override {
        bindCalled = true;
        lastCompliance = _compliance;
        emit ComplianceBound(_compliance);
    }

    function unbindCompliance(address _compliance) external override {
        unbindCalled = true;
        lastCompliance = _compliance;
        emit ComplianceUnbound(_compliance);
    }

    function moduleTransferAction(address, address, uint256) external override {
        transferActionCalled = true;
    }

    function moduleMintAction(address, uint256) external override {
        mintActionCalled = true;
    }

    function moduleBurnAction(address, uint256) external override {
        burnActionCalled = true;
    }

    function moduleCheck(address, address, uint256, address) external view override returns (bool) {
        return checkResult;
    }

    function isComplianceBound(address) external pure override returns (bool) {
        return false;
    }

    function canComplianceBind(address) external view override returns (bool) {
        return canBindResult;
    }

    function isPlugAndPlay() external pure override returns (bool) {
        return true;
    }

    function name() external pure override returns (string memory) {
        return "MockModule";
    }

    function setCheckResult(bool _result) external {
        checkResult = _result;
    }

    function setCanBindResult(bool _value) external {
        canBindResult = _value;
    }
}
