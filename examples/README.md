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

### interact.ts

这是一个示例脚本，展示了如何使用 ethers.js 与部署的合约进行交互：

- 连接到本地节点（Anvil）
- 从 Foundry 部署日志中读取合约地址
- 读取合约 ABI
- 调用合约的只读方法
- 发送交易的示例（需要私钥）

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

