import { network } from "hardhat";
import hre from "hardhat";
import type { Address } from "viem";
import { ethers } from "ethers";

async function main() {
  console.log("=== 在 Sepolia 测试网测试 FundMe 合约 ===\n");
  
  const { viem, networkName } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer, account1, account2] = await viem.getWalletClients();
  
  console.log(`网络: ${networkName}`);
  console.log(`部署者地址: ${deployer.account.address}`);
  console.log(`账户1地址: ${account1.account.address}`);
  console.log(`账户2地址: ${account2.account.address}\n`);
  
  // 这里需要输入部署的合约地址
  // 部署后可以从 Ignition 输出中获取
  const contractAddress = process.env.FUNDME_CONTRACT_ADDRESS as Address;
  
  if (!contractAddress) {
    console.log("❌ 请设置 FUNDME_CONTRACT_ADDRESS 环境变量");
    console.log("例如: export FUNDME_CONTRACT_ADDRESS=0x...");
    console.log("或者运行: FUNDME_CONTRACT_ADDRESS=0x... npx hardhat run scripts/testSepolia.ts --network sepolia");
    return;
  }
  
  console.log(`合约地址: ${contractAddress}\n`);
  
  // 获取合约 ABI
  const artifact = await hre.artifacts.readArtifact("FundMe");
  
  // 1. 测试基本只读函数
  console.log("1. 测试基本只读函数:");
  
  try {
    // 获取合约所有者
    const ownerResult = await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "owner",
    });
    const owner = ownerResult as string;
    console.log(`   - 合约所有者: ${owner}`);
    
    // 获取是否筹资成功状态
    const isFundSuccess = await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "isFundSuccess",
    });
    console.log(`   - 是否筹资成功: ${isFundSuccess}`);
    
    // 获取 Chainlink 价格数据
    const priceData = await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getChainlinkDataFeedLatestAnswer",
    });
    console.log(`   - Chainlink ETH/USD 价格: ${priceData}`);
    
    // 测试 debugConvertUsd 函数
    const debugConvert = await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "debugConvertUsd",
      args: [ethers.parseEther("0.01")], // 0.01 ETH
    });
    console.log(`   - 0.01 ETH 转换为 USD: ${debugConvert}`);
    
    console.log(`   - 基本只读函数测试完成 ✅\n`);
  } catch (error: any) {
    console.log(`   - 读取函数失败: ${error.message}\n`);
  }
  
  // 2. 测试 fund 函数（需要真实 ETH）
  console.log("2. 测试 fund 函数:");
  
  try {
    console.log(`   - 尝试使用账户1注资 0.001 ETH...`);
    const fundHash = await account1.writeContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "fund",
      value: ethers.parseEther("0.001"), // 小金额测试
    });
    console.log(`   - 交易哈希: ${fundHash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: fundHash,
      confirmations: 1,
    });
    
    if (receipt.status === "success") {
      console.log(`   - 注资成功 ✅`);
      
      // 检查注资金额
      const account1Amount = await publicClient.readContract({
        address: contractAddress,
        abi: artifact.abi,
        functionName: "fundersToAmount",
        args: [account1.account.address as Address],
      });
      console.log(`   - 账户1出资金额: ${ethers.formatEther(account1Amount as bigint)} ETH`);
    } else {
      console.log(`   - 注资失败 ❌`);
    }
  } catch (error: any) {
    console.log(`   - 注资失败: ${error.shortMessage || error.message}`);
  }
  
  console.log("\n3. 测试合约余额:");
  
  try {
    const contractBalance = await publicClient.getBalance({
      address: contractAddress,
    });
    console.log(`   - 合约余额: ${ethers.formatEther(contractBalance)} ETH`);
  } catch (error: any) {
    console.log(`   - 获取余额失败: ${error.message}`);
  }
  
  console.log("\n=== 测试完成 ===");
  console.log("📝 注: 在 Sepolia 上测试需要真实的测试网 ETH");
  console.log("📝 注: 确保账户有足够的 ETH 支付 gas 费用");
}

// 运行主函数
main().catch((error) => {
  console.error("测试出错:", error);
  process.exitCode = 1;
});