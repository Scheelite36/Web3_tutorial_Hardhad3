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
      functionName: "getFund",
    });
    const receipt = await publicClient.waitForTransactionReceipt({
        hash: hashOfGetFund,
        confirmations: 1,
    });
    console.log(`调用 getFund 函数的交易已确认，交易哈希: ${hashOfGetFund}`);
}
main("0xd838338242607967c6bfd0bcec430d3a50561c51").catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
