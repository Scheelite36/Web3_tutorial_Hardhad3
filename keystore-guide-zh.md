# Hardhat 3 Keystore 使用指南

## 为什么使用 Keystore 而不是 .env 文件？

传统的 `.env` 文件存在以下风险：
1. **意外提交到 GitHub**：容易忘记将 `.env` 添加到 `.gitignore`，导致私钥泄露
2. **文件权限问题**：`.env` 文件可能被不当权限设置暴露
3. **多环境管理困难**：需要为不同环境维护多个 `.env` 文件

Hardhat 3 的 Keystore 系统解决了这些问题：
- **加密存储**：敏感信息存储在本地机器的加密层
- **密码保护**：需要密码才能访问生产环境 keystore
- **环境隔离**：支持开发和生产环境分离
- **Git 安全**：无需担心敏感信息被提交到版本控制

## 基本使用方法

### 1. 设置变量（开发环境）

```bash
# 设置 RPC URL
echo "https://sepolia.infura.io/v3/YOUR-PROJECT-ID" | npx hardhat keystore set --dev SEPOLIA_RPC_URL

# 设置私钥（使用示例私钥，实际使用时替换为你的私钥）
echo "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" | npx hardhat keystore set --dev SEPOLIA_PRIVATE_KEY
```

### 2. 设置变量（生产环境）

首次使用生产环境 keystore 时需要设置密码：

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
```

系统会提示：
1. 输入密码（至少8个字符）
2. 确认密码
3. 输入要存储的值

### 3. 查看已存储的变量

```bash
# 列出开发环境所有键
npx hardhat keystore list --dev

# 列出生产环境所有键
npx hardhat keystore list

# 获取特定变量的值
npx hardhat keystore get --dev SEPOLIA_RPC_URL
npx hardhat keystore get SEPOLIA_RPC_URL
```

### 4. 管理 keystore

```bash
# 更改密码
npx hardhat keystore change-password

# 删除变量
npx hardhat keystore delete --dev SEPOLIA_RPC_URL
npx hardhat keystore delete SEPOLIA_RPC_URL

# 查看 keystore 存储路径
npx hardhat keystore path
```

## 在配置文件中使用

在 `hardhat.config.ts` 中使用 `configVariable` 函数：

```typescript
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  networks: {
    sepolia: {
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
```

## 最佳实践

### 1. 开发 vs 生产环境
- **开发环境**：使用 `--dev` 标志，无需密码，适合本地开发
- **生产环境**：不使用 `--dev` 标志，需要密码，适合 CI/CD 和团队协作

### 2. 密码管理
- 为生产环境 keystore 设置强密码
- 考虑使用密码管理器存储 keystore 密码
- 团队环境中，通过安全渠道共享密码

### 3. 变量命名规范
- 使用大写字母和下划线：`SEPOLIA_PRIVATE_KEY`
- 包含网络名称：`MAINNET_RPC_URL`、`SEPOLIA_RPC_URL`
- 明确变量用途：`DEPLOYER_PRIVATE_KEY`、`VERIFIER_API_KEY`

### 4. 团队协作
1. 将 `hardhat.config.ts` 提交到版本控制
2. **不要**提交 keystore 文件或密码
3. 创建 `keystore-setup.md` 文档说明如何设置变量
4. 使用环境变量或安全工具在 CI/CD 中提供 keystore 密码

### 5. 安全注意事项
- 定期轮换私钥和 API 密钥
- 使用最小权限原则：只为需要访问的账户分配权限
- 监控账户活动，设置告警
- 考虑使用硬件钱包进行高价值交易

## 迁移现有 .env 文件

如果你已经有 `.env` 文件，可以迁移到 Keystore：

```bash
# 从 .env 文件读取并设置到 keystore
export $(cat .env | xargs)
echo $SEPOLIA_RPC_URL | npx hardhat keystore set SEPOLIA_RPC_URL
echo $SEPOLIA_PRIVATE_KEY | npx hardhat keystore set SEPOLIA_PRIVATE_KEY

# 删除 .env 文件（确保已备份）
rm .env
```

## 故障排除

### 常见问题

1. **"No production keystore found"**
   - 首次使用生产环境 keystore 时需要先设置一个变量

2. **密码错误**
   - 使用 `npx hardhat keystore change-password` 重置密码

3. **变量未找到**
   - 检查是否使用了正确的环境（开发 vs 生产）
   - 使用 `npx hardhat keystore list` 确认变量存在

4. **配置读取失败**
   - 确保 `hardhat.config.ts` 中正确使用了 `configVariable`
   - 检查变量名称是否匹配

### 获取帮助

```bash
# 查看所有 keystore 命令
npx hardhat keystore --help

# 查看特定命令帮助
npx hardhat keystore set --help
npx hardhat keystore get --help
```

## 总结

Hardhat 3 的 Keystore 系统提供了比传统 `.env` 文件更安全、更便捷的敏感信息管理方案。通过加密存储、密码保护和环境隔离，它显著降低了私钥泄露的风险，同时保持了开发体验的流畅性。

开始使用 Keystore，保护你的加密资产！