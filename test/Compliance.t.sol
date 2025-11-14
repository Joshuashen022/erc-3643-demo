// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {RWACompliance} from "../src/rwa/Compliance.sol";
import {TestModule} from "ERC-3643/compliance/modular/modules/TestModule.sol";
import {MockModule} from "./mocks/MockModule.sol";
import {MockToken} from "./mocks/MockToken.sol";

contract RWAComplianceTest is Test {
    // Event declarations for testing
    event TokenBound(address _token);
    event TokenUnbound(address _token);
    event ModuleAdded(address indexed _module);
    event ModuleRemoved(address indexed _module);
    event ModuleInteraction(address indexed target, bytes4 selector);

    RWACompliance public compliance;
    MockToken internal token;
    MockModule internal module1;
    MockModule internal module2;
    TestModule internal testModule;

    address internal user1 = address(0xAAAA);
    address internal user2 = address(0xBBBB);
    address internal nonOwner = address(0xCCCC);

    function setUp() public {
        compliance = new RWACompliance();
        compliance.init();
        token = new MockToken(address(compliance));
        module1 = new MockModule();
        module2 = new MockModule();
        testModule = new TestModule();
        testModule.initialize();
    }

    // ============ Constructor tests ============

    function testConstructor_SetsOwner() public view {
        // Owner is set after init() is called in setUp
        assertEq(compliance.owner(), address(this));
    }

    function testConstructor_NoTokenBound() public view {
        assertEq(compliance.getTokenBound(), address(0));
    }

    function testConstructor_NoModules() public view {
        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 0);
    }

    // ============ bindToken() tests ============

    function testBindToken_SuccessByOwner() public {
        vm.expectEmit(true, false, false, true);
        emit TokenBound(address(token));
        compliance.bindToken(address(token));

        assertEq(compliance.getTokenBound(), address(token));
    }

    function testBindToken_SuccessByTokenWhenNoTokenBound() public {
        vm.prank(address(token));
        compliance.bindToken(address(token));

        assertEq(compliance.getTokenBound(), address(token));
    }

    function testBindToken_RevertsWhenZeroAddress() public {
        vm.expectRevert(bytes("invalid argument - zero address"));
        compliance.bindToken(address(0));
    }

    function testBindToken_RevertsWhenNotOwnerOrToken() public {
        vm.prank(nonOwner);
        vm.expectRevert(bytes("only owner or token can call"));
        compliance.bindToken(address(token));
    }

    function testBindToken_RevertsWhenTokenBoundAndCalledByToken() public {
        // First bind by owner
        compliance.bindToken(address(token));

        // Try to bind again by token (should fail)
        vm.prank(address(token));
        vm.expectRevert(bytes("only owner or token can call"));
        compliance.bindToken(address(0x1111));
    }

    function testBindToken_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit TokenBound(address(token));
        compliance.bindToken(address(token));
    }

    // ============ unbindToken() tests ============

    function testUnbindToken_SuccessByOwner() public {
        compliance.bindToken(address(token));
        assertEq(compliance.getTokenBound(), address(token));

        vm.expectEmit(true, false, false, true);
        emit TokenUnbound(address(token));
        compliance.unbindToken(address(token));

        assertEq(compliance.getTokenBound(), address(0));
    }

    function testUnbindToken_SuccessByToken() public {
        compliance.bindToken(address(token));
        assertEq(compliance.getTokenBound(), address(token));

        vm.prank(address(token));
        compliance.unbindToken(address(token));

        assertEq(compliance.getTokenBound(), address(0));
    }

    function testUnbindToken_RevertsWhenZeroAddress() public {
        // When no token is bound, _tokenBound is address(0)
        // Passing address(0) will pass the "not bound" check (both are zero)
        // Then fail on the zero address check
        vm.expectRevert(bytes("invalid argument - zero address"));
        compliance.unbindToken(address(0));
    }

    function testUnbindToken_RevertsWhenNotBound() public {
        vm.expectRevert(bytes("This token is not bound"));
        compliance.unbindToken(address(token));
    }

    function testUnbindToken_RevertsWhenNotOwnerOrToken() public {
        compliance.bindToken(address(token));
        vm.prank(nonOwner);
        vm.expectRevert(bytes("only owner or token can call"));
        compliance.unbindToken(address(token));
    }

    function testUnbindToken_EmitsEvent() public {
        compliance.bindToken(address(token));
        vm.expectEmit(true, false, false, true);
        emit TokenUnbound(address(token));
        compliance.unbindToken(address(token));
    }

    // ============ addModule() tests ============

    function testAddModule_Success() public {
        vm.expectEmit(true, false, false, true);
        emit ModuleAdded(address(module1));
        compliance.addModule(address(module1));

        assertTrue(compliance.isModuleBound(address(module1)));
        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 1);
        assertEq(modules[0], address(module1));
        assertTrue(module1.bindCalled());
        assertEq(module1.lastCompliance(), address(compliance));
    }

    function testAddModule_MultipleModules() public {
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));

        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 2);
        assertTrue(compliance.isModuleBound(address(module1)));
        assertTrue(compliance.isModuleBound(address(module2)));
    }

    function testAddModule_RevertsWhenZeroAddress() public {
        vm.expectRevert(bytes("invalid argument - zero address"));
        compliance.addModule(address(0));
    }

    function testAddModule_RevertsWhenAlreadyBound() public {
        compliance.addModule(address(module1));
        vm.expectRevert(bytes("module already bound"));
        compliance.addModule(address(module1));
    }

    function testAddModule_RevertsWhenNotOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert();
        compliance.addModule(address(module1));
    }

    function testAddModule_WorksWithPlugAndPlay() public {
        // MockModule always returns true for isPlugAndPlay
        compliance.addModule(address(module1));
        assertTrue(compliance.isModuleBound(address(module1)));
    }

    function testAddModule_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit ModuleAdded(address(module1));
        compliance.addModule(address(module1));
    }

    // ============ removeModule() tests ============

    function testRemoveModule_Success() public {
        compliance.addModule(address(module1));
        assertTrue(compliance.isModuleBound(address(module1)));

        vm.expectEmit(true, false, false, true);
        emit ModuleRemoved(address(module1));
        compliance.removeModule(address(module1));

        assertFalse(compliance.isModuleBound(address(module1)));
        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 0);
        assertTrue(module1.unbindCalled());
    }

    function testRemoveModule_RemovesCorrectModule() public {
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));

        compliance.removeModule(address(module1));

        assertFalse(compliance.isModuleBound(address(module1)));
        assertTrue(compliance.isModuleBound(address(module2)));
        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 1);
        assertEq(modules[0], address(module2));
    }

    function testRemoveModule_RevertsWhenZeroAddress() public {
        vm.expectRevert(bytes("invalid argument - zero address"));
        compliance.removeModule(address(0));
    }

    function testRemoveModule_RevertsWhenNotBound() public {
        vm.expectRevert(bytes("module not bound"));
        compliance.removeModule(address(module1));
    }

    function testRemoveModule_RevertsWhenNotOwner() public {
        compliance.addModule(address(module1));
        vm.prank(nonOwner);
        vm.expectRevert();
        compliance.removeModule(address(module1));
    }

    function testRemoveModule_EmitsEvent() public {
        compliance.addModule(address(module1));
        vm.expectEmit(true, false, false, true);
        emit ModuleRemoved(address(module1));
        compliance.removeModule(address(module1));
    }

    // ============ transferred() tests ============

    function testTransferred_Success() public {
        compliance.bindToken(address(token));
        compliance.addModule(address(module1));

        token.callTransferred(user1, user2, 100);

        assertTrue(module1.transferActionCalled());
    }

    function testTransferred_MultipleModules() public {
        compliance.bindToken(address(token));
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));

        token.callTransferred(user1, user2, 100);

        assertTrue(module1.transferActionCalled());
        assertTrue(module2.transferActionCalled());
    }

    function testTransferred_RevertsWhenNotToken() public {
        compliance.bindToken(address(token));
        vm.expectRevert(bytes("error : this address is not a token bound to the compliance contract"));
        compliance.transferred(user1, user2, 100);
    }

    function testTransferred_RevertsWhenZeroFrom() public {
        compliance.bindToken(address(token));
        vm.prank(address(token));
        vm.expectRevert(bytes("invalid argument - zero address"));
        compliance.transferred(address(0), user2, 100);
    }

    function testTransferred_RevertsWhenZeroTo() public {
        compliance.bindToken(address(token));
        vm.prank(address(token));
        vm.expectRevert(bytes("invalid argument - zero address"));
        compliance.transferred(user1, address(0), 100);
    }

    function testTransferred_RevertsWhenZeroValue() public {
        compliance.bindToken(address(token));
        vm.prank(address(token));
        vm.expectRevert(bytes("invalid argument - no value transfer"));
        compliance.transferred(user1, user2, 0);
    }

    // ============ created() tests ============

    function testCreated_Success() public {
        compliance.bindToken(address(token));
        compliance.addModule(address(module1));

        token.callCreated(user1, 100);

        assertTrue(module1.mintActionCalled());
    }

    function testCreated_MultipleModules() public {
        compliance.bindToken(address(token));
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));

        token.callCreated(user1, 100);

        assertTrue(module1.mintActionCalled());
        assertTrue(module2.mintActionCalled());
    }

    function testCreated_RevertsWhenNotToken() public {
        compliance.bindToken(address(token));
        vm.expectRevert(bytes("error : this address is not a token bound to the compliance contract"));
        compliance.created(user1, 100);
    }

    function testCreated_RevertsWhenZeroTo() public {
        compliance.bindToken(address(token));
        vm.prank(address(token));
        vm.expectRevert(bytes("invalid argument - zero address"));
        compliance.created(address(0), 100);
    }

    function testCreated_RevertsWhenZeroValue() public {
        compliance.bindToken(address(token));
        vm.prank(address(token));
        vm.expectRevert(bytes("invalid argument - no value mint"));
        compliance.created(user1, 0);
    }

    // ============ destroyed() tests ============

    function testDestroyed_Success() public {
        compliance.bindToken(address(token));
        compliance.addModule(address(module1));

        token.callDestroyed(user1, 100);

        assertTrue(module1.burnActionCalled());
    }

    function testDestroyed_MultipleModules() public {
        compliance.bindToken(address(token));
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));

        token.callDestroyed(user1, 100);

        assertTrue(module1.burnActionCalled());
        assertTrue(module2.burnActionCalled());
    }

    function testDestroyed_RevertsWhenNotToken() public {
        compliance.bindToken(address(token));
        vm.expectRevert(bytes("error : this address is not a token bound to the compliance contract"));
        compliance.destroyed(user1, 100);
    }

    function testDestroyed_RevertsWhenZeroFrom() public {
        compliance.bindToken(address(token));
        vm.prank(address(token));
        vm.expectRevert(bytes("invalid argument - zero address"));
        compliance.destroyed(address(0), 100);
    }

    function testDestroyed_RevertsWhenZeroValue() public {
        compliance.bindToken(address(token));
        vm.prank(address(token));
        vm.expectRevert(bytes("invalid argument - no value burn"));
        compliance.destroyed(user1, 0);
    }

    // ============ canTransfer() tests ============

    function testCanTransfer_ReturnsTrueWhenNoModules() public view {
        assertTrue(compliance.canTransfer(user1, user2, 100));
    }

    function testCanTransfer_ReturnsTrueWhenModuleAllows() public {
        compliance.addModule(address(module1));
        module1.setCheckResult(true);
        assertTrue(compliance.canTransfer(user1, user2, 100));
    }

    function testCanTransfer_ReturnsFalseWhenModuleBlocks() public {
        compliance.addModule(address(module1));
        module1.setCheckResult(false);
        assertFalse(compliance.canTransfer(user1, user2, 100));
    }

    function testCanTransfer_MultipleModulesAllAllow() public {
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));
        module1.setCheckResult(true);
        module2.setCheckResult(true);
        assertTrue(compliance.canTransfer(user1, user2, 100));
    }

    function testCanTransfer_OneModuleBlocks() public {
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));
        module1.setCheckResult(true);
        module2.setCheckResult(false);
        assertFalse(compliance.canTransfer(user1, user2, 100));
    }

    // ============ getModules() tests ============

    function testGetModules_ReturnsEmptyWhenNoModules() public view {
        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 0);
    }

    function testGetModules_ReturnsAllModules() public {
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));

        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 2);
        assertEq(modules[0], address(module1));
        assertEq(modules[1], address(module2));
    }

    // ============ getTokenBound() tests ============

    function testGetTokenBound_ReturnsZeroWhenNoToken() public view {
        assertEq(compliance.getTokenBound(), address(0));
    }

    function testGetTokenBound_ReturnsBoundToken() public {
        compliance.bindToken(address(token));
        assertEq(compliance.getTokenBound(), address(token));
    }

    // ============ isModuleBound() tests ============

    function testIsModuleBound_ReturnsFalseWhenNotBound() public view {
        assertFalse(compliance.isModuleBound(address(module1)));
    }

    function testIsModuleBound_ReturnsTrueWhenBound() public {
        compliance.addModule(address(module1));
        assertTrue(compliance.isModuleBound(address(module1)));
    }

    // ============ callModuleFunction() tests ============

    function testCallModuleFunction_Success() public {
        compliance.addModule(address(testModule));
        bytes memory callData = abi.encodeWithSelector(TestModule.doSomething.selector, uint256(42));

        vm.expectEmit(true, false, false, true);
        emit ModuleInteraction(address(testModule), TestModule.doSomething.selector);
        compliance.callModuleFunction(callData, address(testModule));
    }

    function testCallModuleFunction_RevertsWhenNotBound() public {
        bytes memory callData = abi.encodeWithSelector(TestModule.doSomething.selector, uint256(42));
        vm.expectRevert(bytes("call only on bound module"));
        compliance.callModuleFunction(callData, address(testModule));
    }

    function testCallModuleFunction_RevertsWhenNotOwner() public {
        compliance.addModule(address(testModule));
        bytes memory callData = abi.encodeWithSelector(TestModule.doSomething.selector, uint256(42));
        vm.prank(nonOwner);
        vm.expectRevert();
        compliance.callModuleFunction(callData, address(testModule));
    }

    function testCallModuleFunction_EmitsEvent() public {
        compliance.addModule(address(testModule));
        bytes memory callData = abi.encodeWithSelector(TestModule.doSomething.selector, uint256(42));
        vm.expectEmit(true, false, false, true);
        emit ModuleInteraction(address(testModule), TestModule.doSomething.selector);
        compliance.callModuleFunction(callData, address(testModule));
    }

    // ============ Integration tests ============

    function testFullLifecycle() public {
        // Bind token
        compliance.bindToken(address(token));
        assertEq(compliance.getTokenBound(), address(token));

        // Add modules
        compliance.addModule(address(module1));
        compliance.addModule(address(module2));
        assertEq(compliance.getModules().length, 2);

        // Check transfer
        module1.setCheckResult(true);
        module2.setCheckResult(true);
        assertTrue(compliance.canTransfer(user1, user2, 100));

        // Transfer
        token.callTransferred(user1, user2, 100);
        assertTrue(module1.transferActionCalled());
        assertTrue(module2.transferActionCalled());

        // Remove module
        compliance.removeModule(address(module1));
        assertEq(compliance.getModules().length, 1);
        assertFalse(compliance.isModuleBound(address(module1)));

        // Unbind token
        compliance.unbindToken(address(token));
        assertEq(compliance.getTokenBound(), address(0));
    }

    function testModuleLimit() public {
        // Add 25 modules (the limit)
        for (uint256 i = 0; i < 25; i++) {
            MockModule newModule = new MockModule();
            compliance.addModule(address(newModule));
        }

        // Try to add one more (should fail)
        MockModule extraModule = new MockModule();
        vm.expectRevert(bytes("cannot add more than 25 modules"));
        compliance.addModule(address(extraModule));
    }
}

