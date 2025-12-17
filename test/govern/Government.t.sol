// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {VotesToken} from "../../src/govern/VotesToken.sol";
import {Government} from "../../src/govern/Government.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {console2} from "forge-std/console2.sol";
/**
 * @title GovernmentTest
 * @dev 测试用例演示 Government 治理合约的完整使用流程
 * 
 * 测试流程：
 * 1. 部署 VotesToken（投票代币）
 * 2. 部署 TimelockController（时间锁控制器）
 * 3. 部署 Government（治理合约）
 * 4. 配置权限（给 Governor 分配 proposer 角色）
 * 5. 创建提案
 * 6. 投票
 * 7. 执行提案
 */
contract GovernmentTest is Test {
    VotesToken public token;
    TimelockController public timelock;
    Government public governor;
    
    // 测试账户
    address public proposer = address(0x1);
    address public voter1 = address(0x2);
    address public voter2 = address(0x3);
    address public voter3 = address(0x4);
    address public executor = address(0); // address(0) 表示任何人都可以执行
    
    // 测试参数
    uint256 public constant MIN_DELAY = 1 days;
    uint256 public constant VOTING_DELAY = 1; // 1 block
    uint256 public constant VOTING_PERIOD = 45818; // ~1 week
    uint256 public constant QUORUM_PERCENTAGE = 4; // 4%
    uint256 public constant PROPOSAL_THRESHOLD = 0;
    
    // 代币分配
    uint256 public constant TOTAL_SUPPLY = 1_000_000e18;
    uint256 public constant VOTER1_AMOUNT = 100_000e18;
    uint256 public constant VOTER2_AMOUNT = 50_000e18;
    uint256 public constant VOTER3_AMOUNT = 30_000e18;
    
    function setUp() public {
        // 1. 部署投票代币
        token = new VotesToken("Governance Token", "GT");
        
        // 2. 部署 TimelockController
        // 使用 address(this) 作为临时 admin，以便后续配置权限
        address[] memory proposers = new address[](0); // 空数组，稍后通过 admin 添加
        address[] memory executors = new address[](1);
        executors[0] = executor; // address(0) 表示任何人都可以执行
        
        timelock = new TimelockController(
            MIN_DELAY,
            proposers,
            executors,
            address(this) // 使用 address(this) 作为 admin
        );
        
        // 3. 部署 Government
        governor = new Government(
            IVotes(address(token)),
            timelock
        );
        
        // 4. 配置权限：给 Governor 分配 PROPOSER_ROLE
        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        timelock.grantRole(proposerRole, address(governor));
        
        // 5. 分配代币给投票者（在转移所有权之前）
        token.mint(voter1, VOTER1_AMOUNT);
        token.mint(voter2, VOTER2_AMOUNT);
        token.mint(voter3, VOTER3_AMOUNT);
        
        // 5.5. 将 token 的所有权转移给 timelock，这样 timelock 才能执行提案中的 mint 操作
        token.transferOwnership(address(timelock));
        
        // 6. 委托投票权（ERC20Votes 需要委托才能投票）
        vm.prank(voter1);
        token.delegate(voter1);
        vm.prank(voter2);
        token.delegate(voter2);
        vm.prank(voter3);
        token.delegate(voter3);
    }
    
    /**
     * @dev 测试基本设置是否正确
     */
    function test_Setup() public view {
        assertEq(token.name(), "Governance Token");
        assertEq(token.symbol(), "GT");
        assertEq(token.balanceOf(voter1), VOTER1_AMOUNT);
        assertEq(token.balanceOf(voter2), VOTER2_AMOUNT);
        assertEq(token.balanceOf(voter3), VOTER3_AMOUNT);
        assertEq(governor.votingDelay(), VOTING_DELAY);
        assertEq(governor.votingPeriod(), VOTING_PERIOD);
        assertEq(governor.proposalThreshold(), PROPOSAL_THRESHOLD);
        assertEq(timelock.getMinDelay(), MIN_DELAY);
        
        // 检查 Governor 是否有 proposer 角色
        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        assertTrue(timelock.hasRole(proposerRole, address(governor)));
    }
    
    /**
     * @dev 测试创建提案
     */
    function test_CreateProposal() public {
        // 准备提案数据：调用 token.mint 函数
        address[] memory targets = new address[](1);
        targets[0] = address(token);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(
            VotesToken.mint.selector,
            address(0x999),
            1000e18
        );
        string memory description = "Proposal: Mint 1000 tokens to address 0x999";
        
        // 创建提案
        uint256 proposalId = governor.propose(targets, values, calldatas, description);
        
        // 验证提案状态
        assertGt(proposalId, 0);
        assertEq(
            uint8(governor.state(proposalId)),
            uint8(IGovernor.ProposalState.Pending)
        );
        
        // 验证提案信息
        (
            uint256 againstVotes,
            uint256 forVotes,
            uint256 abstainVotes
        ) = governor.proposalVotes(proposalId);
        assertEq(againstVotes, 0);
        assertEq(forVotes, 0);
        assertEq(abstainVotes, 0);
    }
    
    /**
     * @dev 测试完整的提案流程：创建 -> 投票 -> 执行
     */
    function test_FullProposalFlow() public {
        // 1. 创建提案：mint 代币给新地址
        address recipient = address(0x999);
        uint256 mintAmount = 10_000e18;
        
        address[] memory targets = new address[](1);
        targets[0] = address(token);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(
            VotesToken.mint.selector,
            recipient,
            mintAmount
        );
        string memory description = "Proposal: Mint tokens to new recipient";
        
        uint256 proposalId = governor.propose(targets, values, calldatas, description);

        // 2. 等待投票延迟期结束
        vm.roll(block.number + VOTING_DELAY + 1);
        
        // 3. 投票
        // voter1 投赞成票 (1 = For)
        vm.prank(voter1);
        governor.castVote(proposalId, 1);
        
        // voter2 投赞成票
        vm.prank(voter2);
        governor.castVote(proposalId, 1);
        
        // voter3 投反对票 (0 = Against)
        vm.prank(voter3);
        governor.castVote(proposalId, 0);
        
        // 验证投票结果
        (
            uint256 againstVotes,
            uint256 forVotes,
            uint256 abstainVotes
        ) = governor.proposalVotes(proposalId);
        assertEq(forVotes, VOTER1_AMOUNT + VOTER2_AMOUNT);
        assertEq(againstVotes, VOTER3_AMOUNT);
        assertEq(abstainVotes, 0);
        
        // 4. 等待投票期结束
        vm.roll(block.number + VOTING_PERIOD);
        
        // 验证提案状态变为 Succeeded（因为赞成票超过反对票）
        assertEq(
            uint8(governor.state(proposalId)),
            uint8(IGovernor.ProposalState.Succeeded)
        );
        
        // 5. 将提案加入队列（queue）
        governor.queue(targets, values, calldatas, keccak256(bytes(description)));
        
        // 验证提案状态变为 Queued
        assertEq(
            uint8(governor.state(proposalId)),
            uint8(IGovernor.ProposalState.Queued)
        );
        
        // 6. 等待时间锁延迟期
        vm.warp(block.timestamp + MIN_DELAY + 1);
        
        // 7. 执行提案
        governor.execute(targets, values, calldatas, keccak256(bytes(description)));
        
        // 验证提案已执行
        assertEq(
            uint8(governor.state(proposalId)),
            uint8(IGovernor.ProposalState.Executed)
        );
        
        // 验证代币已 mint
        assertEq(token.balanceOf(recipient), mintAmount);
    }
    
    /**
     * @dev 测试提案未达到法定人数的情况
     * 注意：voter3 有 30,000 代币，总供应量 180,000，4% 法定人数是 7,200
     * 30,000 > 7,200，所以实际上达到了法定人数
     * 这个测试演示了即使只有一个人投票，只要投票权足够大，提案仍可能通过
     */
    function test_ProposalFailsQuorum() public {
        // 创建一个新的小投票者，只有很少的代币
        address smallVoter = address(0x9999);
        uint256 smallAmount = 5_000e18; // 5,000 代币，小于法定人数 7,200
        
        // 在转移所有权之前 mint 给新投票者
        vm.prank(address(timelock));
        token.transferOwnership(address(this)); // 临时转移回来
        token.mint(smallVoter, smallAmount);
        vm.prank(smallVoter);
        token.delegate(smallVoter);
        token.transferOwnership(address(timelock)); // 转移回去
        
        // 创建提案
        address[] memory targets = new address[](1);
        targets[0] = address(token);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(
            VotesToken.mint.selector,
            address(0x999),
            1000e18
        );
        string memory description = "Proposal: Mint tokens";
        
        uint256 proposalId = governor.propose(targets, values, calldatas, description);
        
        // 等待投票延迟期
        vm.roll(block.number + VOTING_DELAY + 1);
        
        // 只有小投票者投票（投票权太少，无法达到 4% 的法定人数）
        vm.prank(smallVoter);
        governor.castVote(proposalId, 1); // 1 = For
        
        // 等待投票期结束
        vm.roll(block.number + VOTING_PERIOD);
        
        // 验证提案状态为 Defeated（因为未达到法定人数）
        assertEq(
            uint8(governor.state(proposalId)),
            uint8(IGovernor.ProposalState.Defeated)
        );
    }
    
    /**
     * @dev 测试提案被否决的情况（反对票超过赞成票）
     */
    function test_ProposalRejected() public {
        // 创建提案
        address[] memory targets = new address[](1);
        targets[0] = address(token);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(
            VotesToken.mint.selector,
            address(0x999),
            1000e18
        );
        string memory description = "Proposal: Mint tokens";
        
        uint256 proposalId = governor.propose(targets, values, calldatas, description);
        
        // 等待投票延迟期
        vm.roll(block.number + VOTING_DELAY + 1);
        
        // voter3 投赞成票（30,000）
        vm.prank(voter3);
        governor.castVote(proposalId, 1); // 1 = For
        
        // voter1 和 voter2 投反对票（100,000 + 50,000 = 150,000，总投票权更大）
        vm.prank(voter1);
        governor.castVote(proposalId, 0); // 0 = Against
        vm.prank(voter2);
        governor.castVote(proposalId, 0); // 0 = Against
        
        // 等待投票期结束
        vm.roll(block.number + VOTING_PERIOD);
        
        // 验证提案状态为 Defeated（反对票超过赞成票）
        assertEq(
            uint8(governor.state(proposalId)),
            uint8(IGovernor.ProposalState.Defeated)
        );
    }
    
    /**
     * @dev 测试使用投票权重投票
     */
    function test_CastVoteWithReason() public {
        // 创建提案
        address[] memory targets = new address[](1);
        targets[0] = address(token);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(
            VotesToken.mint.selector,
            address(0x999),
            1000e18
        );
        string memory description = "Proposal: Mint tokens";
        
        uint256 proposalId = governor.propose(targets, values, calldatas, description);
        
        // 等待投票延迟期
        vm.roll(block.number + VOTING_DELAY + 1);
        
        // 使用理由投票
        vm.prank(voter1);
        governor.castVoteWithReason(
            proposalId,
            1, // 1 = For
            "This proposal benefits the community"
        );
        
        // 验证投票记录
        (
            ,
            uint256 forVotes,
            
        ) = governor.proposalVotes(proposalId);
        assertEq(forVotes, VOTER1_AMOUNT);
    }
    
    /**
     * @dev 测试弃权投票
     */
    function test_AbstainVote() public {
        // 创建提案
        address[] memory targets = new address[](1);
        targets[0] = address(token);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(
            VotesToken.mint.selector,
            address(0x999),
            1000e18
        );
        string memory description = "Proposal: Mint tokens";
        
        uint256 proposalId = governor.propose(targets, values, calldatas, description);
        
        // 等待投票延迟期
        vm.roll(block.number + VOTING_DELAY + 1);
        
        // voter1 投弃权票
        vm.prank(voter1);
        governor.castVote(proposalId, 2); // 2 = Abstain
        
        // 验证投票记录
        (
            uint256 againstVotes,
            uint256 forVotes,
            uint256 abstainVotes
        ) = governor.proposalVotes(proposalId);
        assertEq(abstainVotes, VOTER1_AMOUNT);
        assertEq(forVotes, 0);
        assertEq(againstVotes, 0);
    }
    
    /**
     * @dev 测试批量操作（多个目标地址的提案）
     */
    function test_BatchProposal() public {
        // 准备批量提案：同时 mint 给多个地址
        address[] memory targets = new address[](2);
        targets[0] = address(token);
        targets[1] = address(token);
        
        uint256[] memory values = new uint256[](2);
        values[0] = 0;
        values[1] = 0;
        
        bytes[] memory calldatas = new bytes[](2);
        calldatas[0] = abi.encodeWithSelector(
            VotesToken.mint.selector,
            address(0xAAA),
            5000e18
        );
        calldatas[1] = abi.encodeWithSelector(
            VotesToken.mint.selector,
            address(0xBBB),
            5000e18
        );
        
        string memory description = "Proposal: Batch mint tokens to multiple addresses";
        
        uint256 proposalId = governor.propose(targets, values, calldatas, description);
        
        // 等待投票延迟期
        vm.roll(block.number + VOTING_DELAY + 1);
        
        // 投票
        vm.prank(voter1);
        governor.castVote(proposalId, 1); // 1 = For
        vm.prank(voter2);
        governor.castVote(proposalId, 1); // 1 = For
        
        // 等待投票期结束
        vm.roll(block.number + VOTING_PERIOD);
        
        // 执行提案
        governor.queue(targets, values, calldatas, keccak256(bytes(description)));
        vm.warp(block.timestamp + MIN_DELAY + 1);
        governor.execute(targets, values, calldatas, keccak256(bytes(description)));
        
        // 验证两个地址都收到了代币
        assertEq(token.balanceOf(address(0xAAA)), 5000e18);
        assertEq(token.balanceOf(address(0xBBB)), 5000e18);
    }
    
    /**
     * @dev 测试在时间锁延迟期内无法执行提案
     */
    function test_CannotExecuteBeforeTimelockDelay() public {
        // 创建并完成投票
        address[] memory targets = new address[](1);
        targets[0] = address(token);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(
            VotesToken.mint.selector,
            address(0x999),
            1000e18
        );
        string memory description = "Proposal: Mint tokens";
        
        uint256 proposalId = governor.propose(targets, values, calldatas, description);
        
        vm.roll(block.number + VOTING_DELAY + 1);
        vm.prank(voter1);
        governor.castVote(proposalId, 1); // 1 = For
        vm.prank(voter2);
        governor.castVote(proposalId, 1); // 1 = For
        vm.roll(block.number + VOTING_PERIOD);
        
        // 加入队列
        governor.queue(targets, values, calldatas, keccak256(bytes(description)));
        
        // 尝试在时间锁延迟期之前执行（应该失败）
        vm.warp(block.timestamp + MIN_DELAY - 1);
        vm.expectRevert();
        governor.execute(targets, values, calldatas, keccak256(bytes(description)));
        
        // 等待时间锁延迟期后可以执行
        vm.warp(block.timestamp + 2);
        governor.execute(targets, values, calldatas, keccak256(bytes(description)));
        
        assertEq(token.balanceOf(address(0x999)), 1000e18);
    }
    
    /**
     * @dev 测试法定人数计算
     */
    function test_QuorumCalculation() public {
        // 推进一个区块，确保 ERC20Votes 可以查询历史区块
        vm.roll(block.number + 1);
        
        // 计算上一个区块的法定人数
        uint256 quorum = governor.quorum(block.number - 1);
        
        // 法定人数应该是总供应量的 4%
        // 注意：实际总供应量是已 mint 的代币数量
        uint256 totalSupply = token.totalSupply();
        uint256 expectedQuorum = (totalSupply * QUORUM_PERCENTAGE) / 100;
        assertEq(quorum, expectedQuorum);
    }
}

