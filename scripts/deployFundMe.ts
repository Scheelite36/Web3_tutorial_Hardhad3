import {network} from "hardhat";

async function main() {
    // 锁定期为 7 天（以秒为单位）
    // const lockTime = 7 * 24 * 60 * 60;
    const lockTime = 2 * 60;
    
    console.log("部署 FundMe 合约...");
    console.log(`锁定期: ${lockTime} 秒 (${lockTime / (24 * 60 * 60)} 天)`);
    
    const { viem, networkName } = await network.connect();
    const client = await viem.getPublicClient();
    console.log(`Deploying Counter to ${networkName}...`);
    const fundMe = await viem.deployContract("FundMe", [BigInt(lockTime)]);
    
    console.log(`✅ 合约部署成功!`);
    console.log(`合约地址: ${fundMe.address}`);
    
    return fundMe;

}

// 运行主函数
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// 执行npx hardhat run scripts/deployFundMe.ts 
// 默认会生成本地网络，自动配置了测试的账户地址