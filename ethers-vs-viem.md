# Ethers.js 与 Viem 对比及配置指南

## 两者区别

### Ethers.js
- **成熟度**: 更成熟、更稳定的库，社区广泛使用
- **API 设计**: 面向对象的设计模式
- **包大小**: 较大（约 1MB+），包含所有功能
- **类型系统**: 完整的 TypeScript 支持，但类型较复杂
- **学习曲线**: 相对较陡，API 较多
- **Hardhat 集成**: 通过 `@nomicfoundation/hardhat-ethers` 插件集成

### Viem
- **现代性**: 更现代、更轻量级的库
- **API 设计**: 函数式编程风格
- **包大小**: 模块化设计，支持 Tree-shaking，包体积更小
- **类型系统**: 更精细的类型安全，更好的开发者体验
- **学习曲线**: 相对平缓，API 更简洁
- **Hardhat 集成**: 通过 `@nomicfoundation/hardhat-toolbox-viem` 或 `@nomicfoundation/hardhat-viem` 插件集成

## 是否可以同时存在？

**理论上可以，但实际上有冲突**。

### 当前项目配置
当前项目使用的是 `hardhat-toolbox-viem` 插件，这是 `hardhat-toolbox` 的替代品，专门为 Viem 设计。当使用 `hardhat-toolbox-viem` 时：
- `hardhat` 模块不会导出 `ethers` 对象
- 只能使用 Viem 进行合约交互

### 测试结果
通过测试发现，即使安装了 `@nomicfoundation/hardhat-ethers` 插件：
- `hardhat` 模块仍然没有 `ethers` 属性
- TypeScript 类型定义不包含 `ethers`
- 这是因为 `hardhat-toolbox-viem` 覆盖了默认的导出

## 配置方案

### 方案1：只使用 Viem（当前配置）
```typescript
// hardhat.config.ts
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  // ... 其他配置
});

// 部署脚本
import hre from "hardhat";

async function main() {
  const connection = await hre.network.connect();
  const viem = (connection as any).viem; // 需要类型断言
  const contract = await viem.deployContract("ContractName", [...args]);
}
```

### 方案2：只使用 Ethers.js
```typescript
// 1. 移除 hardhat-toolbox-viem
// npm uninstall @nomicfoundation/hardhat-toolbox-viem

// 2. 安装 hardhat-toolbox（包含 ethers）
// npm install @nomicfoundation/hardhat-toolbox

// 3. 更新 hardhat.config.ts
import "@nomicfoundation/hardhat-toolbox";
import { defineConfig } from "hardhat/config";

export default defineConfig({
  // ... 配置
});

// 4. 部署脚本
import { ethers } from "hardhat";

async function main() {
  const Contract = await ethers.getContractFactory("ContractName");
  const contract = await Contract.deploy(...args);
  await contract.waitForDeployment();
}
```

### 方案3：同时使用两者（推荐方式）
```typescript
// 1. 使用 hardhat-toolbox（包含 ethers）
// npm uninstall @nomicfoundation/hardhat-toolbox-viem
// npm install @nomicfoundation/hardhat-toolbox

// 2. 单独安装 hardhat-viem
// npm install @nomicfoundation/hardhat-viem

// 3. 更新 hardhat.config.ts
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-viem";
import { defineConfig } from "hardhat/config";

export default defineConfig({
  // ... 配置
});

// 4. 现在可以同时使用两者
import { ethers } from "hardhat";
import hre from "hardhat";

// 使用 ethers
async function deployWithEthers() {
  const Contract = await ethers.getContractFactory("ContractName");
  return await Contract.deploy();
}

// 使用 viem
async function deployWithViem() {
  const { viem } = await hre.network.connect();
  return await viem.deployContract("ContractName");
}
```

## 迁移建议

### 从 Viem 迁移到 Ethers.js
1. 修改 `hardhat.config.ts`，将 `hardhat-toolbox-viem` 替换为 `hardhat-toolbox`
2. 更新部署脚本，使用 `ethers.getContractFactory` 代替 `viem.deployContract`
3. 更新测试文件，使用 ethers 的测试工具

### 从 Ethers.js 迁移到 Viem
1. 修改 `hardhat.config.ts`，将 `hardhat-toolbox` 替换为 `hardhat-toolbox-viem`
2. 更新部署脚本，使用 `viem.deployContract` 代替 `ethers.getContractFactory`
3. 更新测试文件，使用 Viem 的测试工具

## 性能对比

| 方面 | Ethers.js | Viem |
|------|-----------|------|
| 包大小 | ~1MB | ~300KB（按需加载） |
| 启动时间 | 较慢 | 较快 |
| 内存使用 | 较高 | 较低 |
| 类型安全 | 好 | 优秀 |
| 开发者体验 | 成熟但复杂 | 现代且简洁 |

## 结论

1. **新项目**: 推荐使用 Viem，因为它更现代、更轻量，有更好的类型安全
2. **现有项目**: 如果已经在使用 ethers.js，可以继续使用，除非有特定需求
3. **混合使用**: 如果需要同时使用两者，推荐使用方案3（hardhat-toolbox + hardhat-viem）

对于当前项目，由于已经配置了 `hardhat-toolbox-viem`，建议：
- 继续使用 Viem 进行开发
- 如果需要 ethers.js，考虑迁移到方案3
- 避免同时使用 `hardhat-toolbox-viem` 和 `hardhat-ethers`，它们会冲突