import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import { configVariable, defineConfig, task } from "hardhat/config";
import "dotenv/config";
import "global-agent/bootstrap";

// 确保环境变量存在
if (!process.env.SEPOLIA_RPC_URL) {
  throw new Error("请设置 SEPOLIA_RPC_URL 环境变量");
}

const deployFundMe = task("deploy-fundme", "部署合约")
  .setAction(() => import("./tasks/deploy-fundme.js"))
  .build();

const interactFundMe = task("interact-fundme", "交互合约")
  .setAction(() => import("./tasks/interact-fundme.js"))
  .build();

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
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: 31337,
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
  tasks: [deployFundMe, interactFundMe],
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify.dev/server",
    browserUrl: "https://repo.ui.sourcify.dev",
  },
});
