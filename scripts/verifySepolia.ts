import { network } from "hardhat";
import hre from "hardhat";
import type { Address } from "viem";

async function main() {
  console.log("=== 验证 Sepolia 上的 FundMe 合约 ===\n");
  
  const { viem, networkName } = await network.connect();
  const publicClient = await viem.getPublicClient();
  
  // 合约地址
  const contractAddress = "0xccce0bb842ade71664fbca8f39043a4fb8bfeaa1" as Address;
  
  console.log(`网络: ${networkName}`);
  console.log(`合约地址: ${contractAddress}\n`);
  
  // 1. 检查合约代码
  console.log("1. 检查合约代码...");
  try {
    const code = await publicClient.getBytecode({ address: contractAddress });
    if (code && code !== "0x") {
      console.log(`   ✅ 合约代码存在 (长度: ${code.length} 字符)`);
    } else {
      console.log(`   ❌ 合约代码不存在`);
      return;
    }
  } catch (error: any) {
    console.log(`   ❌ 检查失败: ${error.message}`);
    return;
  }
  
  // 2. 获取合约 ABI
  console.log("\n2. 获取合约信息...");
  try {
    const artifact = await hre.artifacts.readArtifact("FundMe");
    console.log(`   ✅ 获取到合约 ABI (${artifact.abi.length} 个函数)`);
    
    // 3. 测试基本只读函数
    console.log("\n3. 测试基本只读函数:");
    
    // 获取合约所有者
    const owner = await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "owner",
    });
    console.log(`   - 合约所有者: ${owner}`);
    
    // 获取是否筹资成功状态
    const isFundSuccess = await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "isFundSuccess",
    });
    console.log(`   - 是否筹资成功: ${isFundSuccess}`);
    
    // 获取锁定期
    const lockTime = await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "lockTime",
    });
    console.log(`   - 锁定期: ${lockTime} 秒 (${Number(lockTime) / 3600} 小时)`);
    
    console.log(`\n✅ 合约验证成功！`);
    console.log(`\n📋 合约详情:`);
    console.log(`   地址: ${contractAddress}`);
    console.log(`   所有者: ${owner}`);
    console.log(`   锁定期: ${lockTime} 秒`);
    console.log(`   筹资状态: ${isFundSuccess ? "成功" : "未成功"}`);
    console.log(`\n🔗 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
    console.log(`\n🎉 FundMe 合约已在 Sepolia 测试网成功部署！`);
    
  } catch (error: any) {
    console.log(`   ❌ 读取合约失败: ${error.message}`);
    console.log(`\n⚠️  可能的原因:`);
    console.log(`   1. 合约 ABI 不匹配`);
    console.log(`   2. 网络连接问题`);
    console.log(`   3. 合约地址错误`);
  }
}

// 运行主函数
main().catch((error) => {
  console.error("验证出错:", error);
  process.exitCode = 1;
});