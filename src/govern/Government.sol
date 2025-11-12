// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;
import "@openzeppelin/contracts/governance/Governor.sol";

contract Government is Governor {
    
    constructor() Governor("Government") {}

    /**
     * @dev Delay, in number of blocks, between the proposal is created and the vote starts.
     */
    function votingDelay() public pure override returns (uint256) {
        return 1; // 1 block
    }

    /**
     * @dev Delay, in number of blocks, between the vote start and vote ends.
     */
    function votingPeriod() public pure override returns (uint256) {
        return 45818; // ~1 week (assuming 12s per block)
    }

    /**
     * @dev Minimum number of cast votes required for a proposal to be successful.
     */
    function quorum(uint256 /* blockNumber */) public pure override returns (uint256) {
        return 0; // No quorum requirement since _quorumReached always returns true
    }

    /**
     * @dev Amount of votes already cast passes the threshold limit.
     */
    function _quorumReached(uint256 /* proposalId */) internal pure override returns (bool) {
        return true;
    }

    /**
     * @dev Is the proposal successful or not.
     */
    function _voteSucceeded(uint256 /* proposalId */) internal pure override returns (bool) {
        return true;
    }

    /**
     * @dev Get the voting weight of `account` at a specific `blockNumber`, for a vote as described by `params`.
     */
    function _getVotes(
        address /* account */,
        uint256 /* blockNumber */,
        bytes memory /* params */
    ) internal pure override returns (uint256) {
        return 1;
    }

    /**
     * @dev Register a vote for `proposalId` by `account` with a given `support`, voting `weight` and voting `params`.
     *
     * Note: Support is generic and can represent various things depending on the voting system used.
     */
    function _countVote(
        uint256 /* proposalId */,
        address /* account */,
        uint8 /* support */,
        uint256 /* weight */,
        bytes memory /* params */
    ) internal pure override {
        // No vote counting needed
    }

    /**
     * @dev See {IGovernor-COUNTING_MODE}.
     */
    // solhint-disable-next-line func-name-mixedcase
    function COUNTING_MODE() public pure override returns (string memory) {
        return "support=bravo&quorum=0";
    }

    /**
     * @dev See {IGovernor-hasVoted}.
     */
    function hasVoted(uint256 /* proposalId */, address /* account */) public pure override returns (bool) {
        return false; // Votes are not tracked since proposals always succeed
    }
}