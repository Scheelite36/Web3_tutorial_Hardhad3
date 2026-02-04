import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

const { viem, networkHelpers } = await network.connect();

// 定义 fixture 函数（命名函数）
async function deployFundMeFixture() {
  const fundMe = await viem.deployContract("FundMe", [3600n]);
  return { fundMe };
}

describe("FundMe", async function () {
  // 使用 loadFixture：第一次部署，后续测试复用快照
  const { fundMe } = await networkHelpers.loadFixture(deployFundMeFixture);

  it("Should work", async function () {
    const owner = await fundMe.read.owner();
    assert.ok(owner);
  });

  it("Should have funder mapping", async function () {
    // 测试同一个已部署的合约实例
    const [funder] = await viem.getWalletClients();
    const amount = await fundMe.read.fundersToAmount([funder.account.address]);
    assert.strictEqual(amount, 0n);
  });
});
