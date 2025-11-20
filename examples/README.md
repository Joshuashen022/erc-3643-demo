# TypeScript 脚本说明

这个目录包含用于与合约交互的 TypeScript 脚本。

## 设置

1. 安装依赖：
```bash
yarn install
```

2. 配置环境变量（可选）：
```bash
cp .env.example .env
# 编辑 .env 文件，添加你的配置
```

## 运行脚本

### 基本交互脚本

```bash
# 使用 ts-node 直接运行
yarn dev

# 或者编译后运行
yarn build
node dist/scripts/interact.js
```

## 脚本说明

### validateDeployment.ts

验证部署后的合约配置和权限设置：

- 连接到本地节点（Anvil）
- 从 Foundry 部署日志中读取合约地址
- 验证所有合约的 owner 和 agent 设置
- 确认部署配置正确

### registerNewIdentity.ts

注册新的身份到 Identity Registry：

- 创建新的 Identity 合约
- 配置 claim key 和 claim
- 注册到 Identity Registry
- 完整的新用户注册流程

### mintTokens.ts

执行 mint 操作，向指定地址铸造代币：

- 检查并注册地址到 Identity Registry（如需要）
- 执行 mint 操作
- 验证余额和总供应量

使用方法：
```bash
# 设置环境变量
export PRIVATE_KEY=<your_private_key>
export MINT_TO_ADDRESS=0x1111111111111111111111111111111111111111  # 可选，默认为 0x1111...
export MINT_AMOUNT=1000  # 可选，默认为 1000

# 运行脚本
npx ts-node examples/mintTokens.ts
```

## 使用示例

### 读取合约状态

```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const contract = new ethers.Contract(
  "0x...", // 合约地址
  abi,     // ABI
  provider
);

const value = await contract.someViewFunction();
console.log(value);
```

### 发送交易

```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const contract = new ethers.Contract(address, abi, wallet);

const tx = await contract.someStateChangingFunction(...args);
await tx.wait();
console.log(`交易哈希: ${tx.hash}`);
```

## 注意事项

1. 确保在运行脚本之前已经部署了合约
2. 如果使用本地节点（Anvil），确保节点正在运行
3. 私钥应该存储在 `.env` 文件中，不要提交到版本控制

