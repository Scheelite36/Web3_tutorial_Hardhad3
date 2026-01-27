import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import { configVariable, defineConfig } from "hardhat/config";
import "dotenv/config";
import "global-agent/bootstrap"; // 全局代理支持

// 确保环境变量存在
if (!process.env.SEPOLIA_RPC_URL) {
  throw new Error("请设置 SEPOLIA_RPC_URL 环境变量");
}

// 创建自定义网络配置函数
// const createNetworkConfig = (url: string, chainId?: number) => {
//   const config: any = {
//     type: "http",
//     chainType: "l1",
//     url,
//     accounts: process.env.SEPOLIA_PRIVATE_KEY
//       ? [configVariable("SEPOLIA_PRIVATE_KEY")]
//       : [],
//     gas: "auto",
//     gasPrice: "auto",
//     gasMultiplier: 1.5,
//     timeout: 60000,
//   };

//   if (chainId) {
//     config.chainId = chainId;
//   }

//   return config;
// };

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatVerify],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  // 默认是`hardhat`: 通用开发环境
  networks: {
    // 本地模拟的以太坊主网网络
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    // 模拟 Optimism 链的环境
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL!,
      accounts: [
        configVariable("SEPOLIA_PRIVATE_KEY"),
        configVariable("SEPOLIA_PRIVATE_KEY_1"),
      ],
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1.5, // 增加50%的Gas倍数
      timeout: 1200000, // 120秒超时
      chainId: 11155111,
    },
  },
});
