import { network } from "hardhat";
import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import type { PublicClient, Address } from "viem";
import { ethers } from "ethers";

async function main() {
  // 锁定期为 7 天（以秒为单位）
  // const lockTime = 7 * 24 * 60 * 60;
  const lockTime = 2 * 60;

  console.log("部署 FundMe 合约...");
  console.log(`锁定期: ${lockTime} 秒 (${lockTime / (24 * 60 * 60)} 天)`);

  const { viem, networkName } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();
  console.log(`Deploying Counter to ${networkName}...`);

  // 获取合约的 Artifacts (ABI 和 Bytecode)
  const artifact = await hre.artifacts.readArtifact("FundMe");

  // 直接使用 walletClient 部署，这将直接返回交易哈希 (Hash)
  const hash: `0x${string}` = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [lockTime],
  });
  // 等待3个confirmations后获取合约地址
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 3,
  });
  if (!receipt.contractAddress) {
    throw new Error("合约部署失败，未获取到合约地址");
  }
  const contractAddress: Address = receipt.contractAddress as Address;
  console.log(`🚀 合约地址: ${contractAddress}`);
  await verifyFunc(publicClient, contractAddress, lockTime);

  // init 2 acounts
  const [walletClient1, walletClient2] = await viem.getWalletClients();
  // fund contract with first account
  const hashForWallet1: `0x${string}` = await walletClient1.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "fund",
    value: ethers.parseEther("0.1"),
  });
  const receiptFromAccount1 = await publicClient.waitForTransactionReceipt({
    hash: hashForWallet1,
    confirmations: 1,
  });
  // check balance of contract
  const balance1 = await publicClient.getBalance({
    address: contractAddress,
  });
  console.log(
    `合约地址 ${contractAddress} 的余额: ${ethers.formatEther(
      balance1,
    )} ETH`,
  );
  // fund contract with second account
  const hashForWallet2: `0x${string}` = await walletClient2.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "fund",
    value: ethers.parseEther("0.2"),
  });
  const receiptFromAccount2 = await publicClient.waitForTransactionReceipt({
    hash: hashForWallet2,
    confirmations: 1,
  });
  // check balance of contract
  const balance2 = await publicClient.getBalance({
    address: contractAddress,
  });
  console.log(
    `合约地址 ${contractAddress} 的余额: ${ethers.formatEther(
      balance2,
    )} ETH`,
  );
  // check mapping of fundersToAmount
  await publicClient.readContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "fundersToAmount",
    args: [walletClient1.account.address as Address],
  }).then((result: bigint) => {
    console.log(
      `账户 ${walletClient1.account.address} 在合约中的出资金额: ${ethers.formatEther(
        result,
      )} ETH`,
    );
  });
  await publicClient.readContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "fundersToAmount",
    args: [walletClient2.account.address as Address],
  }).then((result: bigint) => {
    console.log(
      `账户 ${walletClient2.account.address} 在合约中的出资金额: ${ethers.formatEther(
        result,
      )} ETH`,
    );
  });
}

// 运行主函数
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

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
// 执行npx hardhat run scripts/deployFundMe.ts
// 默认会生成本地网络，自动配置了测试的账户地址, 也可以通过--network指定网络
