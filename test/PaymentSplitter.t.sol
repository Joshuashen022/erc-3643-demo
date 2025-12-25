// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {PaymentSplitter} from "../lib/openzeppelin-contracts/contracts/finance/PaymentSplitter.sol";
import {ERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract MintableERC20 is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract PaymentSplitterTest is Test {
    address internal _alice = address(0xA11CE);
    address internal _bob = address(0xB0B);
    address internal _carol = address(0xCA001);
    address internal _payer = address(0xFEE);

    function _deployDefaultSplitter() internal returns (PaymentSplitter splitter) {
        address[] memory payees = new address[](2);
        payees[0] = _alice;
        payees[1] = _bob;

        uint256[] memory shares_ = new uint256[](2);
        shares_[0] = 1;
        shares_[1] = 3;

        splitter = new PaymentSplitter(payees, shares_);
    }

    function testEthSplitReleasableAndRelease() public {
        PaymentSplitter splitter = _deployDefaultSplitter();

        // fund payer and send 4 ether into the splitter
        vm.deal(_payer, 10 ether);
        vm.prank(_payer);
        (bool ok,) = address(splitter).call{value: 4 ether}("");
        assertTrue(ok);

        // shares: alice=1, bob=3, total=4 => alice=1 ether, bob=3 ether
        assertEq(splitter.releasable(_alice), 1 ether);
        assertEq(splitter.releasable(_bob), 3 ether);

        uint256 aliceBalBefore = _alice.balance;
        uint256 bobBalBefore = _bob.balance;

        splitter.release(payable(_alice));
        splitter.release(payable(_bob));

        assertEq(_alice.balance - aliceBalBefore, 1 ether);
        assertEq(_bob.balance - bobBalBefore, 3 ether);

        assertEq(splitter.totalReleased(), 4 ether);
        assertEq(splitter.released(_alice), 1 ether);
        assertEq(splitter.released(_bob), 3 ether);
    }

    function testEthSplitReleaseRevertsWhenNoShares() public {
        PaymentSplitter splitter = _deployDefaultSplitter();

        vm.expectRevert(bytes("PaymentSplitter: account has no shares"));
        splitter.release(payable(_carol));
    }

    function testEthSplitReleaseRevertsWhenNotDue() public {
        PaymentSplitter splitter = _deployDefaultSplitter();

        // no ETH received => releasable is 0
        vm.expectRevert(bytes("PaymentSplitter: account is not due payment"));
        splitter.release(payable(_alice));
    }

    function testErc20SplitReleasableAndRelease() public {
        PaymentSplitter splitter = _deployDefaultSplitter();
        MintableERC20 token = new MintableERC20("Mock", "MOCK");

        // Mint 400 tokens to splitter. shares: 1/4 and 3/4 => 100 and 300.
        token.mint(address(splitter), 400);

        assertEq(splitter.releasable(token, _alice), 100);
        assertEq(splitter.releasable(token, _bob), 300);

        splitter.release(token, _alice);
        splitter.release(token, _bob);

        assertEq(token.balanceOf(_alice), 100);
        assertEq(token.balanceOf(_bob), 300);
        assertEq(splitter.totalReleased(token), 400);
        assertEq(splitter.released(token, _alice), 100);
        assertEq(splitter.released(token, _bob), 300);
    }

    function testErc20SplitReleaseRevertsWhenNotDue() public {
        PaymentSplitter splitter = _deployDefaultSplitter();
        MintableERC20 token = new MintableERC20("Mock", "MOCK");

        vm.expectRevert(bytes("PaymentSplitter: account is not due payment"));
        splitter.release(token, _alice);
    }
}


