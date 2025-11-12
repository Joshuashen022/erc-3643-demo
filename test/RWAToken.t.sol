// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {RWAToken} from "../src/rwa/RWAToken.sol";

contract MockCompliance {
    bool public bindCalled;
    address public boundToken;
    address public lastUnboundToken;

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

    function transferred(address, address, uint256) external {}

    function created(address, uint256) external {}

    function destroyed(address, uint256) external {}

    function canTransfer(address, address, uint256) external pure returns (bool) {
        return true;
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

contract MockIdentityRegistry {}

contract RWATokenTest is Test {
    RWAToken internal rwaToken;
    MockCompliance internal compliance;
    MockIdentityRegistry internal identityRegistry;

    string private constant TOKEN_NAME = "Test Token";
    string private constant TOKEN_SYMBOL = "TT";
    uint8 private constant TOKEN_DECIMALS = 6;
    address private constant ONCHAIN_ID = address(0x123456);

    function setUp() public {
        rwaToken = new RWAToken();
        compliance = new MockCompliance();
        identityRegistry = new MockIdentityRegistry();
    }

    function testInitSetsState() public {
        rwaToken.init(
            address(identityRegistry),
            address(compliance),
            TOKEN_NAME,
            TOKEN_SYMBOL,
            TOKEN_DECIMALS,
            ONCHAIN_ID
        );

        assertEq(rwaToken.owner(), address(this));
        assertEq(rwaToken.paused(), true);
        assertEq(rwaToken.name(), TOKEN_NAME);
        assertEq(rwaToken.symbol(), TOKEN_SYMBOL);
        assertEq(rwaToken.decimals(), TOKEN_DECIMALS);
        assertEq(rwaToken.onchainID(), ONCHAIN_ID);
        assertEq(address(rwaToken.identityRegistry()), address(identityRegistry));
        assertEq(address(rwaToken.compliance()), address(compliance));
        assertTrue(compliance.bindCalled());
        assertEq(compliance.getTokenBound(), address(rwaToken));
    }

    function testInitRevertsWhenZeroAddress() public {
        vm.expectRevert(bytes("invalid argument - zero address"));
        rwaToken.init(address(0), address(compliance), TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, ONCHAIN_ID);
    }

    function testInitRevertsWhenEmptyName() public {
        vm.expectRevert(bytes("invalid argument - empty string"));
        rwaToken.init(address(identityRegistry), address(compliance), "", TOKEN_SYMBOL, TOKEN_DECIMALS, ONCHAIN_ID);
    }

    function testInitRevertsWhenEmptySymbol() public {
        vm.expectRevert(bytes("invalid argument - empty string"));
        rwaToken.init(address(identityRegistry), address(compliance), TOKEN_NAME, "", TOKEN_DECIMALS, ONCHAIN_ID);
    }

    function testInitRevertsWhenDecimalsOutOfRange() public {
        vm.expectRevert(bytes("decimals between 0 and 18"));
        rwaToken.init(address(identityRegistry), address(compliance), TOKEN_NAME, TOKEN_SYMBOL, 19, ONCHAIN_ID);
    }

    function testInitCannotBeCalledTwice() public {
        rwaToken.init(
            address(identityRegistry),
            address(compliance),
            TOKEN_NAME,
            TOKEN_SYMBOL,
            TOKEN_DECIMALS,
            ONCHAIN_ID
        );

        vm.expectRevert(bytes("Initializable: contract is already initialized"));
        rwaToken.init(
            address(identityRegistry),
            address(compliance),
            TOKEN_NAME,
            TOKEN_SYMBOL,
            TOKEN_DECIMALS,
            ONCHAIN_ID
        );
    }
}
