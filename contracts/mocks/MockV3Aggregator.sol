// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract MockV3Aggregator is AggregatorV3Interface {
    uint8 public decimals;
    int256 public latestAnswer;
    uint256 public latestTimestamp;
    uint256 public latestRoundCounter;

    mapping(uint256 => int256) public answers;
    mapping(uint256 => uint256) public timestamps;
    mapping(uint256 => uint256) public startedAts;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        latestAnswer = _initialAnswer;
        latestTimestamp = block.timestamp;
        latestRoundCounter = 0;
    }

    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (
            uint80(latestRoundCounter),
            latestAnswer,
            uint256(startedAts[latestRoundCounter]),
            latestTimestamp,
            uint80(latestRoundCounter)
        );
    }

    function updateAnswer(int256 _answer) external {
        latestAnswer = _answer;
        latestTimestamp = block.timestamp;
        latestRoundCounter++;
        answers[latestRoundCounter] = _answer;
        timestamps[latestRoundCounter] = block.timestamp;
        startedAts[latestRoundCounter] = block.timestamp;
    }

    function description() external pure returns (string memory) {
        return "MockV3Aggregator";
    }

    function version() external pure returns (uint256) {
        return 1;
    }

    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (
            _roundId,
            answers[_roundId],
            startedAts[_roundId],
            timestamps[_roundId],
            _roundId
        );
    }

    function latestRound() external view returns (uint256) {
        return latestRoundCounter;
    }
}
