import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { NetworkConfig } from "../../Config.js";

export default buildModule("FundMeModule", (m) => {
  const lockTime = 3600n; // 1小时
  
  // 根据网络选择 dataFeed 地址
  const isSepolia = process.env.NETWORK === "sepolia";
  const dataFeedAddress = isSepolia 
    ? NetworkConfig.sepolia.dataFeed 
    : NetworkConfig.local.dataFeed;

  // 部署 FundMe 合约
  const fundMe = m.contract("FundMe", [lockTime, dataFeedAddress], {
    id: "FundMeDeployment"
  });

  return { fundMe };
});
