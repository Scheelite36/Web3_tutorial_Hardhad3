import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FundMeSepoliaModule", (m) => {
  // 在 Sepolia 上设置锁定期为 1 小时（3600秒）
  const lockTime = 3600n; // 1小时
  
  // 部署 FundMe 合约
  const fundMe = m.contract("FundMe", [lockTime], {
    id: "FundMeDeployment"
  });
  
  // 获取初始合约所有者
  m.call(fundMe, "owner", [], {
    id: "getInitialOwner"
  });
  
  // 设置合约所有者（将所有者转移到第一个测试账户）
  const newOwner = m.getAccount(1);
  m.call(fundMe, "transferOwner", [newOwner], {
    id: "transferOwnership"
  });
  
  // 验证所有者已转移
  m.call(fundMe, "owner", [], {
    id: "verifyNewOwner"
  });
  
  // 获取是否筹资成功状态
  m.call(fundMe, "isFundSuccess", [], {
    id: "getFundSuccessStatus"
  });
  
  // 测试 fundersToAmount 映射（传入部署者地址）
  const deployer = m.getAccount(0);
  m.call(fundMe, "fundersToAmount", [deployer], {
    id: "checkFunderAmount"
  });
  
  // 获取 Chainlink 价格数据（在 Sepolia 上应该可用）
  m.call(fundMe, "getChainlinkDataFeedLatestAnswer", [], {
    id: "getPriceData"
  });
  
  // 测试 debugConvertUsd 函数（0.01 ETH）
  m.call(fundMe, "debugConvertUsd", [10000000000000000n], {
    id: "debugConvert"
  });
  
  return { fundMe };
});