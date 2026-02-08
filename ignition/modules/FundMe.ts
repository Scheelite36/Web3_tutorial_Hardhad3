import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { NetworkConfig } from "../../Config.js";

export default buildModule("FundMeModule", (m) => {
  // 锁定期（秒）：从配置读取
  const lockTime = NetworkConfig.fundMe.lockTime;
  
  // 根据链 ID 选择 dataFeed 地址
  const chainId = parseInt(process.env.CHAIN_ID || "31337");
  const dataFeedAddress = chainId === Number(NetworkConfig.sepolia.chainId)
    ? NetworkConfig.sepolia.dataFeed 
    : NetworkConfig.local.dataFeed;

  // 部署 FundMe 合约
  const fundMe = m.contract("FundMe", [lockTime, dataFeedAddress], {
    id: "FundMeDeployment"
  });

  return { fundMe };
});
