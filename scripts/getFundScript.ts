import { network } from "hardhat";
import hre from "hardhat";
import type { Address } from "viem";

async function main(address: Address) {
    console.log(`获取 FundMe 合约实例，地址: ${address}...`);
    const { viem, networkName } = await network.connect();
    const publicClient = await viem.getPublicClient();
    console.log(`Connected to network: ${networkName}`);

    // 获取合约的 Artifacts (ABI)
    const artifact = await hre.artifacts.readArtifact("FundMe");

    const [walletClient] = await viem.getWalletClients();
    
    const hashOfGetFund: `0x${string}` = await walletClient.writeContract({
      address,
      abi: artifact.abi,
      functionName: "refund",
    });
    const receipt = await publicClient.waitForTransactionReceipt({
        hash: hashOfGetFund,
        confirmations: 1,
    });
    console.log(`调用 getFund 函数的交易已确认，交易哈希: ${hashOfGetFund}`);
}
main("0x911626fe8e3bbce94d1b8e603673d480024f2f3e").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
