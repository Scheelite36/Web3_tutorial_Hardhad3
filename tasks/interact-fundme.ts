import { network } from "hardhat";
import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import type { PublicClient, Address } from "viem";
import { ethers } from "ethers";
import type { TaskArguments } from "hardhat/types/tasks";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";

export default async function (
  taskArguments: TaskArguments,
  hre: HardhatRuntimeEnvironment,
) {
  const contractAddress =
    "0x911626fe8e3bbce94d1b8e603673d480024f2f3e" as `0x${string}`;
  if (taskArguments.contract) {
    const contractAddress = taskArguments.contract as `0x${string}`;
  }
  const { viem, networkName } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const artifact = await hre.artifacts.readArtifact("FundMe");

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
    `合约地址 ${contractAddress} 的余额: ${ethers.formatEther(balance1)} ETH`,
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
    `合约地址 ${contractAddress} 的余额: ${ethers.formatEther(balance2)} ETH`,
  );
  // check mapping of fundersToAmount
  await publicClient
    .readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "fundersToAmount",
      args: [walletClient1.account.address as Address],
    })
    .then((result: unknown) => {
      console.log(
        `账户 ${
          walletClient1.account.address
        } 在合约中的出资金额: ${ethers.formatEther(result as bigint)} ETH`,
      );
    });
  await publicClient
    .readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "fundersToAmount",
      args: [walletClient2.account.address as Address],
    })
    .then((result: unknown) => {
      console.log(
        `账户 ${
          walletClient2.account.address
        } 在合约中的出资金额: ${ethers.formatEther(result as bigint)} ETH`,
      );
    });
}
