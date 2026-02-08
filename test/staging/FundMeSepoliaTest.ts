/**
 * FundMe 集成测试 - Sepolia 网络
 * 
 * 测试内容：
 * 1. fund() - 正常捐款
 * 2. getFund() - 达到目标后提取资金
 * 3. refund() - 未达到目标时退款
 * 
 * 运行方式：
 * npx hardhat test test/staging/FundMeSepoliaTest.ts --network sepolia
 */
import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { network } from "hardhat";
import { parseEventLogs, formatEther } from "viem";
import { NetworkConfig } from "../../Config.js";

// 使用与单元测试相同的方式连接网络
const { viem: viemConn } = await network.connect();
const publicClient = await viemConn.getPublicClient();

describe("FundMe Sepolia Integration Tests", async function () {
  // 只在 Sepolia 网络运行
  const chainId = await publicClient.getChainId();
  if (chainId !== Number(NetworkConfig.sepolia.chainId)) {
    console.log(`Skipping - not on Sepolia network (chain ID: ${chainId})`);
    return;
  }

  const wallets = await viemConn.getWalletClients();
  const walletClient = wallets[0];
  let fundMe: Awaited<ReturnType<typeof viemConn.getContractAt>>;
  let fundMeAddress: `0x${string}`;

  before(async function () {
    console.log(`\n🚀 Connected to Sepolia network, chain ID: ${chainId}`);
    console.log(`👛 Wallet: ${walletClient.account.address}`);
    
    // 读取已部署的合约地址
    const fs = await import("fs");
    const deployedAddressesPath = "./ignition/deployments/chain-11155111/deployed_addresses.json";
    const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));
    fundMeAddress = deployedAddresses["FundMeModule#FundMeDeployment"] as `0x${string}`;
    
    fundMe = await viemConn.getContractAt("FundMe", fundMeAddress);
    console.log(`📄 FundMe: ${fundMeAddress}`);
  });

  describe("Chainlink Data Feed", async function () {
    it("Should get valid ETH/USD price from Chainlink", async function () {
      const price = await fundMe.read.getChainlinkDataFeedLatestAnswer();
      console.log(`💰 ETH/USD: ${formatEther(price * 10n ** 10n)} USD`);
      assert.ok(price > 0n, "Price should be positive");
      assert.ok(price > 1000n * 10n ** 8n && price < 10000n * 10n ** 8n, "Price unrealistic");
    });
  });

  describe("fund()", async function () {
    it("Should accept valid fund", async function () {
      const price = await fundMe.read.getChainlinkDataFeedLatestAnswer();
      const fundAmount = (NetworkConfig.fundMe.minUsd * 10n ** 8n * NetworkConfig.fundMe.fundMultiplier) / price;
      
      console.log(`📤 Sending ${formatEther(fundAmount)} ETH (~$1.5 USD)`);
      
      const hash = await fundMe.write.fund([], {
        value: fundAmount,
        account: walletClient.account,
      });
      
      console.log(`📤 Transaction: ${hash}`);
      
      // 等待交易确认
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        confirmations: 1,
        timeout: 120000
      });
      
      assert.ok(receipt, "Should get transaction receipt");
      
      const finalBalance = await publicClient.getBalance({ address: fundMeAddress });
      console.log(`💰 Contract balance: ${formatEther(finalBalance)} ETH`);
      
      // 验证记录
      const funderAmount = await fundMe.read.fundersToAmount([walletClient.account.address]);
      assert.strictEqual(funderAmount, fundAmount, "Funder amount should be recorded");
      
      console.log(`✅ Funded successfully!`);
    });
  });

  describe("getFund()", async function () {
    it("Should allow owner to withdraw when target reached", async function () {
      const balance = await publicClient.getBalance({ address: fundMeAddress });
      const owner = await fundMe.read.owner();
      const price = await fundMe.read.getChainlinkDataFeedLatestAnswer();
      const balanceUsd = (balance * price) / 10n ** 8n;
      
      // 确保是 owner
      assert.strictEqual(
        owner.toLowerCase(), 
        walletClient.account.address.toLowerCase(),
        "Must be owner"
      );
      
      // 检查是否达到目标
      if (balanceUsd < NetworkConfig.fundMe.targetUsd) {
        console.log(`⚠️  Balance ${formatEther(balanceUsd * 10n ** 10n)} USD < Target ${formatEther(NetworkConfig.fundMe.targetUsd * 10n ** 10n)} USD, skipping...`);
        return;
      }
      
      const hash = await fundMe.write.getFund({
        account: walletClient.account,
      });
      
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        confirmations: 1,
        timeout: 120000
      });
      
      // 验证事件
      const logs = parseEventLogs({
        abi: fundMe.abi,
        logs: receipt.logs,
      });
      const fundWithdrawnEvent = logs.find((log: any) => log.eventName === "FundWithdrawn");
      assert.ok(fundWithdrawnEvent, "FundWithdrawn event should be emitted");
      
      // 验证状态
      const isSuccess = await fundMe.read.isFundSuccess();
      assert.strictEqual(isSuccess, true, "isFundSuccess should be true");
      
      console.log(`✅ Withdrew ${formatEther((fundWithdrawnEvent as any).args.amount)} ETH`);
    });
  });

  describe("refund()", async function () {
    it("Should allow funder to refund when target not reached", async function () {
      const isSuccess = await fundMe.read.isFundSuccess();
      if (isSuccess) {
        console.log(`⚠️  Fund already succeeded, skipping refund test`);
        return;
      }
      
      const funderAddr = walletClient.account.address;
      const funderAmount = await fundMe.read.fundersToAmount([funderAddr]);
      
      if (funderAmount === 0n) {
        console.log(`⚠️  No balance to refund`);
        return;
      }
      
      // 检查当前状态
      const balance = await publicClient.getBalance({ address: fundMeAddress });
      const price = await fundMe.read.getChainlinkDataFeedLatestAnswer();
      const balanceUsd = (balance * price) / 10n ** 8n;
      
      if (balanceUsd >= NetworkConfig.fundMe.targetUsd) {
        console.log(`⚠️  Target already reached, cannot refund`);
        return;
      }
      
      // 调用退款（需要窗口期已关闭）
      try {
        const hash = await fundMe.write.refund({
          account: walletClient.account,
        });
        
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash,
          confirmations: 1,
          timeout: 120000
        });
        
        const funderAmountAfter = await fundMe.read.fundersToAmount([funderAddr]);
        assert.strictEqual(funderAmountAfter, 0n, "Funder amount should be 0 after refund");
        
        console.log(`✅ Refunded ${formatEther(funderAmount)} ETH`);
      } catch (error: any) {
        if (error.message?.includes("window is not closed")) {
          console.log(`⏳ Window not closed yet, need to wait`);
        } else if (error.message?.includes("balance is empty")) {
          console.log(`⚠️  Funder has no balance to refund`);
        } else if (error.message?.includes("balance must less than target")) {
          console.log(`⚠️  Target already reached, cannot refund`);
        } else {
          throw error;
        }
      }
    });
  });
});
