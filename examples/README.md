# ERC-3643 权限管理前端界面

这是一个基于 React + Vite + ethers.js 的简易前端界面，用于管理 ERC-3643 合约的权限。

## 功能特性

### Owner 角色
- **声明主题管理** (ClaimTopicsRegistry)
  - 添加/移除声明主题
  - 查询所有声明主题
  
- **可信发行者管理** (TrustedIssuersRegistry)
  - 添加/移除可信发行者
  - 查询所有发行者
  
- **合规模块管理** (ModularCompliance)
  - 添加/移除模块
  - 调用模块函数
  - 查询模块列表

### Agent 角色
- **身份管理** (IdentityRegistry)
  - 注册/更新/删除用户身份
  - 查询用户验证状态
  
- **代币管理** (Token)
  - 铸造/销毁代币
  - 强制转账
  - 冻结/解冻地址
  - 冻结/解冻部分代币

### 普通用户
- **查询功能**
  - 查询声明主题
  - 查询用户身份信息
  - 查询可信发行者
  - 查询代币余额和信息
  - 查询合规模块
  
- **代币操作**
  - 转账
  - 授权

## 安装和运行

1. 安装依赖：
```bash
cd examples/frontend
npm install
```

2. 配置合约地址：
编辑 `src/utils/config.ts`，填入实际部署的合约地址。

3. 配置 RPC URL：
创建 `.env` 文件（可选）：
```
VITE_RPC_URL=http://127.0.0.1:8545
```

4. 运行开发服务器：
```bash
npm run dev
```

5. 构建生产版本：
```bash
npm run build
```

## 使用说明

1. **连接钱包**：点击"连接钱包"按钮，使用 MetaMask 或其他 Web3 钱包连接。

2. **选择角色**：连接钱包后，在右上角选择你的角色（Owner/Agent/普通用户）。

3. **执行操作**：
   - Owner：可以管理模块、topics、claimIssuer
   - Agent：可以管理身份和代币
   - 普通用户：可以查询信息和执行转账等公开操作

## 注意事项

- 确保已正确配置所有合约地址
- 确保钱包有足够的权限执行相应操作
- 某些操作需要 Owner 或 Agent 权限，普通用户无法执行
- 建议在测试网络上先测试

## 技术栈

- React 18
- TypeScript
- Vite
- ethers.js v6
- CSS3

