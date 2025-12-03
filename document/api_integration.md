# API 对接文档

## config.json 字段详解

### 1. token 对象

代币的基本配置信息。

```json
{
  "token": {
    "name": "TREX Token",           // 代币名称，显示在前端 UI
    "symbol": "TREX",               // 代币符号/代码，用于交易对显示
    "decimals": 18,                 // 小数位数，通常为 18（与 ETH 一致）
    "suiteOwner": "0x1111111111111111111111111111111111111111",  // 套件所有者地址，拥有所有合约的管理权限
    "irs": "0x0000000000000000000000000000000000000000",  // Identity Registry Storage 地址，0x0 表示部署新的
    "onchainId": "0x0000000000000000000000000000000000000000",  // 代币的 OnChainID 地址，0x0 表示部署时创建
    "irAgents": ["0x1111111111111111111111111111111111111111"],  // Identity Registry 代理地址列表，可以注册/更新身份
    "tokenAgents": ["0x1111111111111111111111111111111111111111"]  // Token 代理地址列表，可以执行 mint/burn 等操作
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 | 前端用途 | 后端用途 |
|------|------|------|----------|----------|
| `name` | string | 代币全名 | 显示在钱包、交易所等 UI | 用于日志、API 响应 |
| `symbol` | string | 代币符号 | 显示在交易对、余额等 | 用于交易查询、价格 API |
| `decimals` | number | 小数位数 | 格式化显示余额（如 `balance / 10^18`） | 金额计算和转换 |
| `suiteOwner` | address | 套件所有者 | 显示管理员信息 | 权限验证、管理操作 |
| `irs` | address | 身份注册表存储地址 | 通常不需要直接使用 | 查询身份数据 |
| `onchainId` | address | 代币身份地址 | 查看代币元数据 | 验证代币身份 |
| `irAgents` | address[] | 身份注册表代理列表 | 显示可注册身份的地址 | 调用 `registerIdentity()` 前验证权限 |
| `tokenAgents` | address[] | 代币代理列表 | 显示可铸造/销毁的地址 | 调用 `mint()`/`burn()` 前验证权限 |

### 2. claimTopics 数组

声明主题列表，定义需要哪些类型的声明（如 KYC、AML 等）。

```json
{
  "claimTopics": [1, 2]  // 声明主题 ID 列表
}
```

**字段说明：**

| 字段 | 类型 | 说明 | 前端用途 | 后端用途 |
|------|------|------|----------|----------|
| `claimTopics` | number[] | 声明主题 ID 数组 | 显示用户需要完成的验证类型 | 验证用户是否拥有所需声明 |

**常见主题 ID：**
- `1`: KYC (Know Your Customer) - 身份验证
- `2`: AML (Anti-Money Laundering) - 反洗钱验证
- `3`: 投资者认证
- 其他自定义主题

### 3. claimIssuers 数组

声明发行者配置，定义哪些机构可以签发特定类型的声明。

```json
{
  "claimIssuers": [
    {
      "privateKey": "0x0000000000000000000000000000000000000000000000000000000000000001",  // 发行者私钥（⚠️ 仅用于后端，不要暴露给前端）
      "claimTopics": [1]  // 该发行者可以签发的声明主题
    },
    {
      "privateKey": "0x0000000000000000000000000000000000000000000000000000000000000002",
      "claimTopics": [2]
    }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 说明 | 前端用途 | 后端用途 |
|------|------|------|----------|----------|
| `privateKey` | string | 发行者私钥 | ❌ **不应暴露给前端** | 用于签名声明，签发 KYC/AML 等 |
| `claimTopics` | number[] | 可签发的主题列表 | 显示哪些机构可以验证特定类型 | 选择正确的发行者来签发声明 |

**⚠️ 安全警告：**
- `privateKey` 必须保密，仅在后端服务中使用
- 前端永远不应该接收或存储私钥
- 建议使用环境变量或密钥管理服务存储私钥

### 4. owners 对象

各个合约的所有者地址，用于权限管理和升级操作。

```json
{
  "owners": {
    "claimIssuerGateway": "0x1111111111111111111111111111111111111111",
    "claimIssuerIdFactory": "0x1111111111111111111111111111111111111111",
    "identityIdFactory": "0x1111111111111111111111111111111111111111",
    "identityGateway": "0x1111111111111111111111111111111111111111",
    "token": "0x1111111111111111111111111111111111111111",
    "identityRegistry": "0x1111111111111111111111111111111111111111",
    "trexImplementationAuthority": "0x1111111111111111111111111111111111111111",
    "trustedIssuersRegistry": "0x1111111111111111111111111111111111111111",
    "claimTopicsRegistry": "0x1111111111111111111111111111111111111111",
    "trexFactory": "0x1111111111111111111111111111111111111111",
    "trexGateway": "0x1111111111111111111111111111111111111111"
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 | 前端用途 | 后端用途 |
|------|------|------|----------|----------|
| `claimIssuerGateway` | address | ClaimIssuer 网关所有者 | 显示管理权限 | 调用网关管理函数 |
| `claimIssuerIdFactory` | address | ClaimIssuer 身份工厂所有者 | 显示管理权限 | 创建新的 ClaimIssuer 身份 |
| `identityIdFactory` | address | 身份工厂所有者 | 显示管理权限 | 创建新的用户身份 |
| `identityGateway` | address | 身份网关所有者 | 显示管理权限 | 调用网关管理函数 |
| `token` | address | 代币合约所有者 | 显示管理权限 | 执行代币管理操作（暂停、升级等） |
| `identityRegistry` | address | 身份注册表所有者 | 显示管理权限 | 管理身份注册表设置 |
| `trexImplementationAuthority` | address | TREX 实现授权中心所有者 | 显示管理权限 | 升级合约实现 |
| `trustedIssuersRegistry` | address | 可信发行者注册表所有者 | 显示管理权限 | 添加/移除可信发行者 |
| `claimTopicsRegistry` | address | 声明主题注册表所有者 | 显示管理权限 | 添加/移除声明主题 |
| `trexFactory` | address | TREX 工厂所有者 | 显示管理权限 | 部署新的代币套件 |
| `trexGateway` | address | TREX 网关所有者 | 显示管理权限 | 管理部署权限 |

---

## deployment_results.json 字段详解

部署结果文件包含所有已部署合约的地址和相关信息。

### 1. 基础信息

```json
{
  "chainId": 31337,              // 链 ID（31337 = 本地测试链，84532 = Base Sepolia 等）
  "deployDate": 1,               // 部署时间戳（Unix 时间戳）
  "deployer": "0x1111111111111111111111111111111111111111",  // 部署者地址
  "suiteOwner": "0x1111111111111111111111111111111111111111",  // 套件所有者地址
  "versionMajor": 0,             // 主版本号
  "versionMinor": 0,             // 次版本号
  "versionPatch": 1              // 补丁版本号
}
```

**字段说明：**

| 字段 | 类型 | 说明 | 前端用途 | 后端用途 |
|------|------|------|----------|----------|
| `chainId` | number | 区块链网络 ID | 连接到正确的网络 | 验证部署网络 |
| `deployDate` | number | 部署时间戳 | 显示部署时间 | 记录部署历史 |
| `deployer` | address | 部署者地址 | 显示部署信息 | 记录部署者 |
| `suiteOwner` | address | 套件所有者 | 显示管理员 | 权限验证 |
| `versionMajor/Minor/Patch` | number | 版本号 | 显示版本信息 | 版本兼容性检查 |

### 2. 核心合约地址

```json
{
  "token": "0x2222222222222222222222222222222222222222",  // 代币合约地址（最重要的地址）
  "identityRegistry": "0x3333333333333333333333333333333333333333",  // 身份注册表地址
  "compliance": "0x4444444444444444444444444444444444444444",  // 合规合约地址
  "identityRegistryStorage": "0x5555555555555555555555555555555555555555",  // 身份注册表存储地址
  "claimTopicsRegistry": "0x6666666666666666666666666666666666666666",  // 声明主题注册表地址
  "trustedIssuersRegistry": "0x7777777777777777777777777777777777777777"  // 可信发行者注册表地址
}
```

**字段说明：**

| 字段 | 类型 | 说明 | 前端用途 | 后端用途 |
|------|------|------|----------|----------|
| `token` | address | 代币合约地址 | **最常用**：查询余额、转账、授权 | 调用代币方法（transfer, mint, burn） |
| `identityRegistry` | address | 身份注册表地址 | 查询用户是否已验证 | 注册/更新用户身份 |
| `compliance` | address | 合规合约地址 | 查询转账是否合规 | 检查转账合规性 |
| `identityRegistryStorage` | address | 身份注册表存储地址 | 通常不需要 | 查询身份数据 |
| `claimTopicsRegistry` | address | 声明主题注册表地址 | 查询需要的声明类型 | 管理声明主题 |
| `trustedIssuersRegistry` | address | 可信发行者注册表地址 | 查询可信发行者列表 | 管理可信发行者 |

### 3. 工厂和网关地址

```json
{
  "trexFactory": "0x8888888888888888888888888888888888888888",  // TREX 工厂地址
  "trexGateway": "0x9999999999999999999999999999999999999999",  // TREX 网关地址
  "identityIdFactory": "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",  // 身份工厂地址
  "identityGateway": "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",  // 身份网关地址
  "claimIssuerIdFactory": "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",  // ClaimIssuer 身份工厂地址
  "claimIssuerGateway": "0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"  // ClaimIssuer 网关地址
}
```

**字段说明：**

| 字段 | 类型 | 说明 | 前端用途 | 后端用途 |
|------|------|------|----------|----------|
| `trexFactory` | address | TREX 工厂地址 | 查询已部署的代币 | 部署新的代币套件 |
| `trexGateway` | address | TREX 网关地址 | 通常不需要 | 通过网关部署代币 |
| `identityIdFactory` | address | 身份工厂地址 | 查询用户身份地址 | 创建新的用户身份 |
| `identityGateway` | address | 身份网关地址 | 通常不需要 | 通过网关创建身份 |
| `claimIssuerIdFactory` | address | ClaimIssuer 身份工厂地址 | 查询发行者身份 | 创建新的发行者身份 |
| `claimIssuerGateway` | address | ClaimIssuer 网关地址 | 通常不需要 | 通过网关创建发行者身份 |

### 4. 实现合约地址

```json
{
  "rwaIdentityImpl": "0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",  // RWA 身份实现合约地址
  "rwaClaimIssuerImpl": "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",  // RWA ClaimIssuer 实现合约地址
  "identityImplementationAuthority": "0x1010101010101010101010101010101010101010",  // 身份实现授权中心地址
  "claimIssuerImplementationAuthority": "0x2020202020202020202020202020202020202020",  // ClaimIssuer 实现授权中心地址
  "trexImplementationAuthority": "0x3030303030303030303030303030303030303030"  // TREX 实现授权中心地址
}
```

**字段说明：**

| 字段 | 类型 | 说明 | 前端用途 | 后端用途 |
|------|------|------|----------|----------|
| `rwaIdentityImpl` | address | 身份实现合约 | 通常不需要 | 升级时使用 |
| `rwaClaimIssuerImpl` | address | ClaimIssuer 实现合约 | 通常不需要 | 升级时使用 |
| `identityImplementationAuthority` | address | 身份实现授权中心 | 通常不需要 | 管理身份合约升级 |
| `claimIssuerImplementationAuthority` | address | ClaimIssuer 实现授权中心 | 通常不需要 | 管理 ClaimIssuer 合约升级 |
| `trexImplementationAuthority` | address | TREX 实现授权中心 | 通常不需要 | 管理 TREX 合约升级 |

**注意：** 这些地址主要用于合约升级，前端和后端日常操作通常不需要直接使用。

### 5. ClaimIssuer 信息

```json
{
  "claimIssuersCount": 2,  // ClaimIssuer 数量
  "claimIssuer0_claimIssuer": "0x4040404040404040404040404040404040404040",  // 第一个 ClaimIssuer 地址
  "claimIssuer0_claimIssuerOwner": "0x5050505050505050505050505050505050505050",  // 第一个 ClaimIssuer 的所有者
  "claimIssuer0_claimTopics": [1],  // 第一个 ClaimIssuer 可签发的主题
  "claimIssuer1_claimIssuer": "0x6060606060606060606060606060606060606060",
  "claimIssuer1_claimIssuerOwner": "0x1111111111111111111111111111111111111111",
  "claimIssuer1_claimTopics": [2]
}
```

**字段说明：**

| 字段 | 类型 | 说明 | 前端用途 | 后端用途 |
|------|------|------|----------|----------|
| `claimIssuersCount` | number | ClaimIssuer 数量 | 显示发行者数量 | 遍历所有发行者 |
| `claimIssuer{N}_claimIssuer` | address | 第 N 个 ClaimIssuer 地址 | 显示发行者信息 | 用于签发声明 |
| `claimIssuer{N}_claimIssuerOwner` | address | 第 N 个 ClaimIssuer 的所有者 | 显示管理权限 | 管理发行者 |
| `claimIssuer{N}_claimTopics` | number[] | 第 N 个 ClaimIssuer 可签发的主题 | 显示发行者能力 | 选择正确的发行者 |

### 6. 所有者信息

```json
{
  "tokenOwner": "0x1111111111111111111111111111111111111111",
  "identityRegistryOwner": "0x1111111111111111111111111111111111111111",
  "trexFactoryOwner": "0x1111111111111111111111111111111111111111",
  "trexGatewayOwner": "0x1111111111111111111111111111111111111111",
  "trexImplementationAuthorityOwner": "0x1111111111111111111111111111111111111111",
  "trustedIssuersRegistryOwner": "0x1111111111111111111111111111111111111111",
  "claimTopicsRegistryOwner": "0x1111111111111111111111111111111111111111",
  "identityIdFactoryOwner": "0x1111111111111111111111111111111111111111",
  "identityGatewayOwner": "0x1111111111111111111111111111111111111111",
  "claimIssuerGatewayOwner": "0x1111111111111111111111111111111111111111",
  "claimIssuerIdFactoryOwner": "0x1111111111111111111111111111111111111111",
  "identityRegistryStorageOwner": "0x7070707070707070707070707070707070707070"
}
```

**字段说明：**

这些字段记录了各个合约的所有者地址，用于权限验证和管理操作。通常与 `config.json` 中的 `owners` 对象对应。

---


