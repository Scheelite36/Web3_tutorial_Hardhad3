import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import type { PublicClient, Address } from "viem";
import { ethers } from "ethers";

/**
 * 网络配置
 */
const NETWORK_CONFIG: Record<string, { dataFeed: string }> = {
  sepolia: {
    dataFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  },
};

async function main() {
  const networkName = hre.network.name;
  
  // 锁定期为 2 分钟（用于测试）
  const lockTime = 2 * 60;

  console.log("=".repeat(50));
  console.log(`部署 FundMe 合约到 ${networkName} 网络`);
  console.log("=".repeat(50));

  const { viem } = await hre.network.connect();
  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();

  // 从 PublicClient 获取 chainId
  const chainId = await publicClient.getChainId();
  console.log(`Chain ID: ${chainId}`);
  console.log(`锁定期: ${lockTime} 秒`);

  // 确定 dataFeed 地址
  let dataFeedAddress: string;
  
  if (chainId === 11155111n) {
    // Sepolia 网络使用真实的 Chainlink dataFeed
    dataFeedAddress = NETWORK_CONFIG.sepolia.dataFeed;
    console.log(`使用 Sepolia dataFeed 地址: ${dataFeedAddress}`);
  } else {
    // 本地网络：先部署 Mock 合约
    console.log("本地网络：开始部署 MockAggregatorV3Interface...");
    const mockArtifact = await hre.artifacts.readArtifact("MockV3Aggregator");
    
    const mockHash: `0x${string}` = await walletClient.deployContract({
      abi: mockArtifact.abi,
      bytecode: mockArtifact.bytecode as `0x${string}`,
      args: [8, 200000000000000000000n], // $2000 ETH/USD
    });
    
    const mockReceipt = await publicClient.waitForTransactionReceipt({
      hash: mockHash,
      confirmations: 1,
    });
    
    if (!mockReceipt.contractAddress) {
      throw new Error("Mock 合约部署失败");
    }
    
    dataFeedAddress = mockReceipt.contractAddress as string;
    console.log(`MockAggregatorV3Interface 部署地址: ${dataFeedAddress}`);
  }

  // 获取 FundMe 合约的 Artifacts
  const fundMeArtifact = await hre.artifacts.readArtifact("FundMe");

  console.log("\n部署 FundMe 合约...");
  
  const hash: `0x${string}` = await walletClient.deployContract({
    abi: fundMeArtifact.abi,
    bytecode: fundMeArtifact.bytecode as `0x${string}`,
    args: [lockTime, dataFeedAddress],
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: chainId === 11155111n ? 3 : 1,
  });

  if (!receipt.contractAddress) {
    throw new Error("FundMe 合约部署失败");
  }

  const contractAddress = receipt.contractAddress as Address;
  console.log(`\n✅ FundMe 合约地址: ${contractAddress}`);

  // 验证合约
  await verifyFunc(publicClient, contractAddress, lockTime, dataFeedAddress);

  // 测试：使用两个账户向合约充值
  console.log("\n" + "=".repeat(50));
  console.log("测试：向合约充值");
  console.log("=".repeat(50));

  const [walletClient1, walletClient2] = await viem.getWalletClients();

  // 第一个账户充值 0.1 ETH
  console.log(`\n账户1: ${walletClient1.account.address}`);
  const hash1: `0x${string}` = await walletClient1.writeContract({
    address: contractAddress,
    abi: fundMeArtifact.abi,
    functionName: "fund",
    value: ethers.parseEther("0.1"),
  });
  await publicClient.waitForTransactionReceipt({ hash: hash1, confirmations: 1 });
  console.log("  ✅ 充值 0.1 ETH 成功");

  // 第二个账户充值 0.2 ETH
  console.log(`\n账户2: ${walletClient2.account.address}`);
  const hash2: `0x${string}` = await walletClient2.writeContract({
    address: contractAddress,
    abi: fundMeArtifact.abi,
    functionName: "fund",
    value: ethers.parseEther("0.2"),
  });
  await publicClient.waitForTransactionReceipt({ hash: hash2, confirmations: 1 });
  console.log("  ✅ 充值 0.2 ETH 成功");

  // 查询合约余额
  const balance = await publicClient.getBalance({ address: contractAddress });
  console.log(`\n📊 合约当前余额: ${ethers.formatEther(balance)} ETH`);

  // 查询投资人信息
  const funder1Amount = await publicClient.readContract({
    address: contractAddress,
    abi: fundMeArtifact.abi,
    functionName: "fundersToAmount",
    args: [walletClient1.account.address as Address],
  }) as bigint;
  console.log(`\n👤 投资人1 投资金额: ${ethers.formatEther(funder1Amount)} ETH`);

  const funder2Amount = await publicClient.readContract({
    address: contractAddress,
    abi: fundMeArtifact.abi,
    functionName: "fundersToAmount",
    args: [walletClient2.account.address as Address],
  }) as bigint;
  console.log(`👤 投资人2 投资金额: ${ethers.formatEther(funder2Amount)} ETH`);

  // 获取 ETH/USD 价格
  const price = await publicClient.readContract({
    address: contractAddress,
    abi: fundMeArtifact.abi,
    functionName: "getChainlinkDataFeedLatestAnswer",
  }) as bigint;
  console.log(`\n💰 ETH/USD 价格: ${ethers.formatUnits(price, 8)} USD`);

  console.log("\n" + "=".repeat(50));
  console.log("🎉 部署和测试完成！");
  console.log("=".repeat(50));
}

// 验证合约
async function verifyFunc(
  client: PublicClient,
  addr: Address,
  lockTime: number,
  dataFeedAddress: string,
) {
  const chainId = await client.getChainId();
  
  if (chainId === 11155111) {
    console.log("\n正在验证合约...");
    try {
      await verifyContract(
        {
          address: `${addr}`,
          constructorArgs: [BigInt(lockTime), dataFeedAddress],
          provider: "sourcify",
        },
        hre,
      );
      console.log("✅ 合约验证成功！");
    } catch (error) {
      console.log("⚠️ 验证失败（可能已验证过）:", error);
    }
  } else {
    console.log(`\n⏭️ 跳过验证 (chainId: ${chainId}, 本地网络不需要验证)`);
  }
}

// 运行主函数
main().catch((error) => {
  console.error("\n❌ 错误:", error);
  process.exitCode = 1;
});
