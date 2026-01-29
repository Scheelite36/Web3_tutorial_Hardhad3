import hre, { network } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import type { PublicClient, Address } from "viem";
import type { TaskArguments } from "hardhat/types/tasks";

export default async function (
  taskArguments: TaskArguments,
  hre: HardhatRuntimeEnvironment,
) {
  // 尝试从参数获取 lockTime，如果没有则使用默认值（2分钟）
  let lockTime = 120; // 默认2分钟
  
  if (taskArguments.lockTime) {
    lockTime = parseInt(taskArguments.lockTime as string);
  }
  console.log(`使用锁定期: ${lockTime} 秒`);

  // 获取 Viem 客户端
  const { viem, networkName } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();

  console.log(`Deploying FundMe to ${networkName}...`);

  const artifact = await hre.artifacts.readArtifact("FundMe");

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [BigInt(lockTime)],
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 3,
  });
  
  console.log(`🚀 合约地址: ${receipt.contractAddress}`);

  // 执行验证逻辑...
  await verifyFunc(publicClient, receipt.contractAddress!, lockTime);
}

async function verifyFunc(
  client: PublicClient,
  addr: Address,
  lockTime: number,
) {
  // 仅在 Sepolia 上执行验证
  const chainId = await client.getChainId();
  if (chainId === 11155111) {
    await verifyContract(
      {
        address: `${addr}`,
        constructorArgs: [BigInt(lockTime)],
        provider: "sourcify",
      },
      hre,
    );
  } else {
    console.log(`Skipping verification on chainId ${chainId}`);
  }

  return addr;
}
