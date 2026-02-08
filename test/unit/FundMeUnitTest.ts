import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEventLogs } from "viem";

const { viem: viemConn, networkHelpers } = await network.connect();
const publicClient = await viemConn.getPublicClient();

// MockAggregator 初始价格: 2000 USD (8位精度)
const ETH_USD_PRICE = 2000n * 10n ** 8n;

// 定义 fixture 函数
async function deployFundMeFixture() {
  const mockAggregator = await viemConn.deployContract("MockV3Aggregator", [8n, ETH_USD_PRICE]);
  const fundMe = await viemConn.deployContract("FundMe", [3600n, mockAggregator.address]);
  const wallets = await viemConn.getWalletClients();
  const [owner, funder1, funder2] = wallets;
  
  return { 
    fundMe, 
    mockAggregator, 
    owner, 
    funder1, 
    funder2 
  };
}

// 帮助函数：快进时间
async function increaseTime(seconds: number) {
  // 打包区块个数（默认1）
  await networkHelpers.mine(1);
  await publicClient.request({ 
    method: "evm_increaseTime", 
    params: [seconds] 
  } as any);
  await publicClient.request({ 
    method: "evm_mine", 
    params: [] 
  } as any);
}

describe("FundMe Unit Tests", async function () {
  describe("Constructor", async function () {
    it("Should set correct owner", async function () {
      const { fundMe, owner } = await networkHelpers.loadFixture(deployFundMeFixture);
      const contractOwner = await fundMe.read.owner();
      assert.strictEqual(
        (contractOwner as string).toLowerCase(), 
        (owner.account.address as string).toLowerCase()
      );
    });

    it("Should set correct dataFeed", async function () {
      const { fundMe } = await networkHelpers.loadFixture(deployFundMeFixture);
      const price = await fundMe.read.getChainlinkDataFeedLatestAnswer();
      assert.strictEqual(price, ETH_USD_PRICE);
    });

    it("Should return correct isFundSuccess initially", async function () {
      const { fundMe } = await networkHelpers.loadFixture(deployFundMeFixture);
      const isSuccess = await fundMe.read.isFundSuccess();
      assert.strictEqual(isSuccess, false);
    });

    it("Should return correct erc20Addr initially", async function () {
      const { fundMe } = await networkHelpers.loadFixture(deployFundMeFixture);
      const erc20Addr = await fundMe.read.erc20Addr();
      console.log("Initial erc20Addr:", erc20Addr);
      assert.strictEqual(erc20Addr, "0x0000000000000000000000000000000000000000");
    });
  });

  describe("fund()", async function () {
    it("Should accept valid fund", async function () {
      const { fundMe, funder1 } = await networkHelpers.loadFixture(deployFundMeFixture);
      const funderAddr = funder1.account.address;
      
      const fundAmount = BigInt("100000000000000000"); // 0.1 ETH
      await fundMe.write.fund([], { value: fundAmount, account: funder1.account });
      
      const amount = await fundMe.read.fundersToAmount([funderAddr as `0x${string}`]);
      assert.strictEqual(amount, fundAmount);
    });

    it("Should reject fund below MIN_VALUE", async function () {
      const { fundMe, funder1 } = await networkHelpers.loadFixture(deployFundMeFixture);
      const fundAmount = BigInt("10000000000000");
      
      await assert.rejects(
        async () => {
          await fundMe.write.fund([], { value: fundAmount, account: funder1.account });
        },
        /send more ETH/
      );
    });

    it("Should reject fund after window closed", async function () {
      const { fundMe, funder1 } = await networkHelpers.loadFixture(deployFundMeFixture);
      await increaseTime(4000);
      
      const fundAmount = BigInt("100000000000000000");
      
      await assert.rejects(
        async () => {
          await fundMe.write.fund([], { value: fundAmount, account: funder1.account });
        },
        /window is closed/
      );
    });

    it("Should track multiple funders", async function () {
      const { fundMe, funder1, funder2 } = await networkHelpers.loadFixture(deployFundMeFixture);
      
      const fundAmount1 = BigInt("100000000000000000");
      const fundAmount2 = BigInt("200000000000000000");
      
      await fundMe.write.fund([], { value: fundAmount1, account: funder1.account });
      await fundMe.write.fund([], { value: fundAmount2, account: funder2.account });
      
      const amount1 = await fundMe.read.fundersToAmount([funder1.account.address as `0x${string}`]);
      const amount2 = await fundMe.read.fundersToAmount([funder2.account.address as `0x${string}`]);
      
      assert.strictEqual(amount1, fundAmount1);
      assert.strictEqual(amount2, fundAmount2);
    });
  });

  describe("convertUsd()", async function () {
    it("Should convert USD correctly", async function () {
      const { fundMe } = await networkHelpers.loadFixture(deployFundMeFixture);
      const ethAmount = BigInt("100000000000000000");
      const expectedUsd = ethAmount * ETH_USD_PRICE / (10n ** 8n);
      const actualUsd = await fundMe.read.debugConvertUsd([ethAmount]);
      assert.strictEqual(actualUsd, expectedUsd);
    });
  });

  describe("transferOwner()", async function () {
    it("Should transfer owner by current owner", async function () {
      const { fundMe, owner, funder1 } = await networkHelpers.loadFixture(deployFundMeFixture);
      
      await fundMe.write.transferOwner([funder1.account.address], { account: owner.account });
      
      const newOwner = await fundMe.read.owner();
      assert.strictEqual(
        (newOwner as string).toLowerCase(), 
        (funder1.account.address as string).toLowerCase()
      );
    });

    it("Should revert when non-owner tries to transfer", async function () {
      const { fundMe, funder1, funder2 } = await networkHelpers.loadFixture(deployFundMeFixture);
      
      await assert.rejects(
        async () => {
          await fundMe.write.transferOwner([funder2.account.address], { account: funder1.account });
        },
        /only own can get the fund/
      );
    });
  });

  describe("getFund()", async function () {
    it("Should allow owner to get fund when target reached", async function () {
      const { fundMe, owner, funder1, funder2 } = await networkHelpers.loadFixture(deployFundMeFixture);
      
      const fundAmount1 = BigInt("200000000000000000");
      const fundAmount2 = BigInt("100000000000000000");
      const totalFund = fundAmount1 + fundAmount2;
      
      await fundMe.write.fund([], { value: fundAmount1, account: funder1.account });
      await fundMe.write.fund([], { value: fundAmount2, account: funder2.account });
      
      await increaseTime(4000);
      
      // 获取交易哈希
      const hash = await fundMe.write.getFund([], { account: owner.account });
      
      // 验证事件
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi: fundMe.abi,
        logs: receipt.logs,
      });
      
      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].eventName, "FundWithdrawn");
      const event = logs[0] as unknown as { args: { owner: string; amount: bigint } };
      assert.strictEqual(
        event.args.owner.toLowerCase(), 
        owner.account.address.toLowerCase()
      );
      assert.strictEqual(event.args.amount, totalFund);
      
      const isSuccess = await fundMe.read.isFundSuccess();
      assert.strictEqual(isSuccess, true);
    });

    it("Should revert when target not reached", async function () {
      const { fundMe, owner, funder1 } = await networkHelpers.loadFixture(deployFundMeFixture);
      
      const fundAmount = BigInt("10000000000000000");
      await fundMe.write.fund([], { value: fundAmount, account: funder1.account });
      
      await increaseTime(4000);
      
      await assert.rejects(
        async () => {
          await fundMe.write.getFund([], { account: owner.account });
        },
        /balance must bigger than target/
      );
    });

    it("Should revert when non-owner tries to get fund", async function () {
      const { fundMe, funder1, funder2 } = await networkHelpers.loadFixture(deployFundMeFixture);
      
      const fundAmount = BigInt("200000000000000000");
      await fundMe.write.fund([], { value: fundAmount, account: funder1.account });
      
      await increaseTime(4000);
      
      await assert.rejects(
        async () => {
          await fundMe.write.getFund([], { account: funder2.account });
        },
        /only own can get the fund/
      );
    });
  });

  describe("setErc20Addr()", async function () {
    it("Should allow owner to set erc20 address", async function () {
      const { fundMe, owner } = await networkHelpers.loadFixture(deployFundMeFixture);
      const newErc20Addr = "0x1234567890123456789012345678901234567890";
      
      await fundMe.write.setErc20Addr([newErc20Addr as `0x${string}`], { account: owner.account });
      
      const erc20Addr = await fundMe.read.erc20Addr();
      assert.strictEqual(erc20Addr, newErc20Addr);
    });

    it("Should revert when non-owner sets erc20 address", async function () {
      const { fundMe, funder1 } = await networkHelpers.loadFixture(deployFundMeFixture);
      const newErc20Addr = "0x1234567890123456789012345678901234567890";
      
      await assert.rejects(
        async () => {
          await fundMe.write.setErc20Addr([newErc20Addr as `0x${string}`], { account: funder1.account });
        },
        /only own can get the fund/
      );
    });
  });

  describe("setFunderToAmount()", async function () {
    it("Should allow erc20 contract to update funder amount", async function () {
      const { fundMe, owner } = await networkHelpers.loadFixture(deployFundMeFixture);
      
      await fundMe.write.setErc20Addr([owner.account.address as `0x${string}`], { account: owner.account });
      
      const funderAddr = "0x1234567890123456789012345678901234567890";
      const amountToUpdate = BigInt("500000000000000000");
      
      await fundMe.write.setFunderToAmount(
        [funderAddr as `0x${string}`, amountToUpdate], 
        { account: owner.account }
      );
      
      const amount = await fundMe.read.fundersToAmount([funderAddr as `0x${string}`]);
      assert.strictEqual(amount, amountToUpdate);
    });

    it("Should revert when non-erc20 contract calls", async function () {
      const { fundMe, funder1 } = await networkHelpers.loadFixture(deployFundMeFixture);
      
      const funderAddr = "0x1234567890123456789012345678901234567890";
      const amountToUpdate = BigInt("500000000000000000");
      
      await assert.rejects(
        async () => {
          await fundMe.write.setFunderToAmount(
            [funderAddr as `0x${string}`, amountToUpdate], 
            { account: funder1.account }
          );
        },
        /you don't have permission to call this function/
      );
    });
  });

  describe("refund()", async function () {
    it("Should allow funder to refund when target not reached", async function () {
      const { fundMe, funder1 } = await networkHelpers.loadFixture(deployFundMeFixture);
      
      const fundAmount = BigInt("10000000000000000");
      await fundMe.write.fund([], { value: fundAmount, account: funder1.account });
      
      await increaseTime(4000);
      
      await fundMe.write.refund([], { account: funder1.account });
      
      const amountAfter = await fundMe.read.fundersToAmount([funder1.account.address as `0x${string}`]);
      assert.strictEqual(amountAfter, 0n);
    });

    it("Should revert when target reached", async function () {
      const { fundMe, funder1, funder2 } = await networkHelpers.loadFixture(deployFundMeFixture);
      
      const fundAmount = BigInt("200000000000000000");
      await fundMe.write.fund([], { value: fundAmount, account: funder1.account });
      await fundMe.write.fund([], { value: fundAmount, account: funder2.account });
      
      await increaseTime(4000);
      
      await assert.rejects(
        async () => {
          await fundMe.write.refund([], { account: funder1.account });
        },
        /balance must less than target/
      );
    });

    it("Should revert when funder has no balance", async function () {
      const { fundMe, funder1 } = await networkHelpers.loadFixture(deployFundMeFixture);
      
      await increaseTime(4000);
      
      await assert.rejects(
        async () => {
          await fundMe.write.refund([], { account: funder1.account });
        },
        /balance is empty/
      );
    });

    it("Should revert before window closed", async function () {
      const { fundMe, funder1 } = await networkHelpers.loadFixture(deployFundMeFixture);
      
      const fundAmount = BigInt("10000000000000000");
      await fundMe.write.fund([], { value: fundAmount, account: funder1.account });
      
      await assert.rejects(
        async () => {
          await fundMe.write.refund([], { account: funder1.account });
        },
        /window is not closed/
      );
    });
  });

  describe("View Functions", async function () {
    it("Should return correct fundersToAmount for non-funder", async function () {
      const { fundMe } = await networkHelpers.loadFixture(deployFundMeFixture);
      const nonFunderAddr = "0x1234567890123456789012345678901234567890";
      const amount = await fundMe.read.fundersToAmount([nonFunderAddr as `0x${string}`]);
      assert.strictEqual(amount, 0n);
    });
  });
});
