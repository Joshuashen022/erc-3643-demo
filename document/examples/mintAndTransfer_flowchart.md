# Mint and Transfer 流程图

```mermaid
sequenceDiagram
    participant TokenOwner as tokenOwner
    participant MintTo as mintTo
    participant IdentityRegistry as identityRegistry
    participant Token as Token
    participant TransferTo as transferTo

    Note over TokenOwner,TransferTo: 1. 初始化阶段
    TokenOwner->>TokenOwner: 初始化合约配置

    Note over TokenOwner,IdentityRegistry: 2. Mint 阶段 - 检查 mintTo 注册状态
    TokenOwner->>IdentityRegistry: isVerified(mintTo)
    alt mintTo 未注册
        IdentityRegistry-->>TokenOwner: false
        TokenOwner->>IdentityRegistry: registerIdentity(mintTo, identityAddress, countryCode)
        IdentityRegistry-->>TokenOwner: ✓ 注册成功
    else mintTo 已注册
        IdentityRegistry-->>TokenOwner: true
    end

    Note over TokenOwner,Token: 3. Mint 操作
    TokenOwner->>Token: mint(mintTo, amount)
    Token->>MintTo: 增加余额
    Token-->>TokenOwner: ✓ Mint 成功

    Note over TokenOwner,Token: 4. Burn 操作
    TokenOwner->>Token: burn(mintTo, amount)
    Token->>MintTo: 减少余额
    Token-->>TokenOwner: ✓ Burn 成功

    Note over TokenOwner,IdentityRegistry: 5. Transfer 阶段 - 检查 transferTo 注册状态
    TokenOwner->>IdentityRegistry: isVerified(transferTo)
    alt transferTo 未注册
        IdentityRegistry-->>TokenOwner: false
        TokenOwner->>IdentityRegistry: registerIdentity(transferTo, identityAddress, countryCode)
        IdentityRegistry-->>TokenOwner: ✓ 注册成功
    else transferTo 已注册
        IdentityRegistry-->>TokenOwner: true
    end

    Note over TokenOwner,Token: 6. 检查余额并补充（如需要）
    TokenOwner->>Token: balanceOf(mintTo)
    Token-->>TokenOwner: balanceBeforeTransfer
    alt 余额不足
        TokenOwner->>Token: mint(mintTo, additionalAmount)
        Token->>MintTo: 增加余额
        Token-->>TokenOwner: ✓ 补充 Mint 成功
    end

    Note over TokenOwner,TransferTo: 7. Transfer 操作
    
    alt mintTo 不是 tokenOwner
        Note over TokenOwner: 切换到 mintTo 的钱包
        TokenOwner->>MintTo: 使用 mintTo 的钱包签名
        MintTo->>Token: transfer(transferTo, amount)
    else mintTo 是 tokenOwner
        TokenOwner->>Token: transfer(transferTo, amount)
    end
    
    Token->>MintTo: 减少余额
    Token->>TransferTo: 增加余额
    Token-->>TokenOwner: ✓ Transfer 成功
```

## 主要角色说明

- **tokenOwner**: 执行操作的钱包地址，负责调用合约方法
- **mintTo**: 接收 mint 操作的地址，也是 transfer 操作的发送方
- **identityRegistry**: 身份注册表合约，用于验证和注册用户身份
- **Token**: 代币合约，处理 mint、burn、transfer 等操作
- **transferTo**: transfer 操作的接收方地址

## 详细步骤说明

### 1. 初始化阶段
- **操作**: tokenOwner 初始化合约配置，获取合约实例
- **结果**: 准备好所有需要的合约接口和配置

### 2. Mint 阶段 - 检查 mintTo 注册状态
- **调用者**: tokenOwner
- **操作**: `identityRegistry.isVerified(mintTo)`
- **结果**: 
  - 如果未注册，调用 `registerIdentity(mintTo, identityAddress, countryCode)` 注册
  - 如果已注册，继续后续流程

### 3. Mint 操作
- **调用者**: tokenOwner
- **操作**: 
  - 获取 mint 前的余额和总供应量
  - 调用 `token.mint(mintTo, amount)` 向 mintTo mint 代币
- **结果**: mintTo 余额增加，总供应量增加

### 4. Burn 操作
- **调用者**: tokenOwner
- **操作**: `token.burn(mintTo, amount)` 从 mintTo burn 代币
- **结果**: mintTo 余额减少，总供应量减少

### 5. Transfer 阶段 - 检查 transferTo 注册状态
- **调用者**: tokenOwner
- **操作**: `identityRegistry.isVerified(transferTo)`
- **结果**: 
  - 如果未注册，调用 `registerIdentity(transferTo, identityAddress, countryCode)` 注册
  - 如果已注册，继续后续流程

### 6. 检查余额并补充（如需要）
- **调用者**: tokenOwner
- **操作**: 
  - 检查 `token.balanceOf(mintTo)` 是否足够
  - 如果余额不足，调用 `token.mint(mintTo, additionalAmount)` 补充
- **结果**: 确保 mintTo 有足够的余额进行 transfer

### 7. Transfer 操作
- **调用者**: 
  - 如果 mintTo 是 tokenOwner，由 tokenOwner 调用
  - 如果 mintTo 不是 tokenOwner，切换到 mintTo 的钱包并调用
- **操作**: 
  - 获取 transfer 前的状态（发送方、接收方余额和总供应量）
  - 调用 `token.transfer(transferTo, amount)` 转账
- **结果**: mintTo 余额减少，transferTo 余额增加，总供应量不变

