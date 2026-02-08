// SPDX-License-Identifier:MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

// 1. 创建一个收款函数
// 2. 记录投资人并查看
// 3. 在锁定期，达到目标值，生产商可以提款
// 4. 在锁定期内，没有达到目标值，投资人在锁定期以后退款

contract FundMe {
    // Events
    event FundWithdrawn(address indexed owner, uint256 amount);
    event Funded(address indexed funder, uint256 amount);
    
    mapping(address => uint256) public fundersToAmount;
    
    AggregatorV3Interface internal dataFeed;
    
    uint256 constant MIN_VALUE = 1 * 10 ** 18; //1USD
    uint256 constant TARGET = 600 * 10 ** 18; //1USD

    address public owner;

    uint256 deployTime;
    uint256 lockTime;
    bool public isFundSuccess;

    address public erc20Addr;

    constructor(uint _lockTime, address _dataFeed) {
        dataFeed = AggregatorV3Interface(_dataFeed);
        owner = msg.sender;
        deployTime = block.timestamp;
        lockTime = _lockTime;   
    }

    function fund() external payable {
      require(convertUsd(msg.value) >= MIN_VALUE, "send more ETH");
      require(block.timestamp - deployTime < lockTime, "window is closed");
      fundersToAmount[msg.sender] = msg.value;
    }

    /**
    * Returns the latest answer.
    */
    function getChainlinkDataFeedLatestAnswer() public view returns (int256) {
      // prettier-ignore
      (
        /* uint80 roundId */
        ,
        int256 answer,
        /*uint256 startedAt*/
        ,
        /*uint256 updatedAt*/
        ,
        /*uint80 answeredInRound*/
      ) = dataFeed.latestRoundData();
      return answer;
    }

    function convertUsd(uint256 ethAmount) internal view returns(uint256){
      uint256 ethPrice = uint256(getChainlinkDataFeedLatestAnswer());
      // 如果资产价格对应是eth的话 X/ETH 精度是10**18
      // 如果资产价格对应USD   ETH/USD  10**8
      // 除以10**8以达到10**18精度
      return ethAmount * ethPrice / (10**8);
    }

    function transferOwner(address newOwner) public OnlyOwner{
      owner = newOwner;
    }

    function getFund() external WindowClosed OnlyOwner{
      require(convertUsd(address(this).balance)>=TARGET, "balance must bigger than target");
      // transfers the entire contract balance to msg.sender deprecated
      // payable(msg.sender).transfer(address(this).balance);
      // send
      // bool success = payable(msg.sender).send(address(this).balance);
      // require(success,"fail");
      // call
      uint256 amount = address(this).balance;
      bool success;
      (success, ) = payable(msg.sender).call{value: amount}("");
      require(success,"fail");
      require(success, "transfer tx failed");
      isFundSuccess = true;
      emit FundWithdrawn(msg.sender, amount);
    }

    // 设置erc20合约地址
    function setErc20Addr(address _erc20Addr) external OnlyOwner{
      erc20Addr = _erc20Addr;
    }

    // 供erc20合约调用，更新投资人投资金额
    function setFunderToAmount(address funder, uint256 amountToUpdate) external {
      require(msg.sender== erc20Addr, "you don't have permission to call this function");
      fundersToAmount[funder] = amountToUpdate;
    }


    function refund() external WindowClosed{
      require(convertUsd(address(this).balance) < TARGET, "balance must less than target");
      require(fundersToAmount[msg.sender] != 0, "balance is empty");
      
      bool success;
      (success, ) = payable(msg.sender).call{value: fundersToAmount[msg.sender]}("");
      // 清零 否则可以无限退款
      require(success,"transfer tx fail");
      fundersToAmount[msg.sender]=0;
    }

    modifier WindowClosed(){
      require(block.timestamp - deployTime >= lockTime, "window is not closed");
      _;
    }
    modifier OnlyOwner(){
      require(msg.sender == owner, "only own can get the fund");
      _;
    }

    function debugConvertUsd(uint256 ethAmount) public view returns (uint256) {
    return convertUsd(ethAmount);
}
}