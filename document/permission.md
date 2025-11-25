# ERC-3643 合约权限管理文档

本文档整理了以下十个核心合约的权限管理：
- `ClaimTopicsRegistry.sol`
- `IdentityRegistry.sol`
- `IdentityRegistryStorage.sol`
- `TrustedIssuersRegistry.sol`
- `Token.sol`
- `ModularCompliance.sol`
- `RWAIdentityIdFactory.sol` & `RWAIdentityGateway.sol`
- `RWAClaimIssuerIdFactory.sol` & `RWAClaimIssuerGateway.sol`

---

## 1. ClaimTopicsRegistry.sol

**继承关系：** `OwnableUpgradeable` + `CTRStorage`

### Owner 可以做的操作

1. **`addClaimTopic(uint256 _claimTopic)`**
   - 添加新的声明主题（Claim Topic）
   - 限制：最多15个主题，不能重复添加

2. **`removeClaimTopic(uint256 _claimTopic)`**
   - 移除指定的声明主题

3. **`init()`**
   - 初始化合约（仅在部署时调用一次）

### Agent 可以做的操作

- **无**（此合约不涉及 Agent 角色）

### 其他角色/公开操作

1. **`getClaimTopics()`** (view)
   - 获取所有已注册的声明主题列表
   - 任何人都可以调用

### 权限结构图

```mermaid
graph TB
    subgraph "ClaimTopicsRegistry"
        CTR_Owner[Owner]
        CTR_Public[Public]
        
        CTR_Owner -->|addClaimTopic| CTR_F1[添加声明主题]
        CTR_Owner -->|removeClaimTopic| CTR_F2[移除声明主题]
        CTR_Owner -->|init| CTR_F3[初始化]
        CTR_Public -->|getClaimTopics| CTR_F4[查询声明主题]
    end
    
    classDef ownerStyle fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px,color:#fff
    classDef publicStyle fill:#95e1d3,stroke:#20c997,stroke-width:2px,color:#000
    
    class CTR_Owner ownerStyle
    class CTR_Public publicStyle
```

---

## 2. IdentityRegistry.sol

**继承关系：** `AgentRoleUpgradeable` + `IRStorage`

### Owner 可以做的操作

1. **`setIdentityRegistryStorage(address _identityRegistryStorage)`**
   - 设置身份注册表存储合约地址

2. **`setClaimTopicsRegistry(address _claimTopicsRegistry)`**
   - 设置声明主题注册表合约地址

3. **`setTrustedIssuersRegistry(address _trustedIssuersRegistry)`**
   - 设置可信发行者注册表合约地址

4. **`addAgent(address _agent)`** (继承自 `AgentRoleUpgradeable`)
   - 添加新的 Agent 角色

5. **`removeAgent(address _agent)`** (继承自 `AgentRoleUpgradeable`)
   - 移除 Agent 角色

6. **`init(...)`**
   - 初始化合约（仅在部署时调用一次）

### Agent 可以做的操作

1. **`batchRegisterIdentity(address[] _userAddresses, IIdentity[] _identities, uint16[] _countries)`**
   - 批量注册用户身份
   - 内部调用 `registerIdentity`

2. **`registerIdentity(address _userAddress, IIdentity _identity, uint16 _country)`**
   - 注册单个用户身份
   - 将用户地址、身份合约和国籍信息存储到 IdentityRegistryStorage

3. **`updateIdentity(address _userAddress, IIdentity _identity)`**
   - 更新用户的身份合约

4. **`updateCountry(address _userAddress, uint16 _country)`**
   - 更新用户的国籍信息

5. **`deleteIdentity(address _userAddress)`**
   - 删除用户的身份信息

### 其他角色/公开操作

以下为 view 函数，任何人都可以调用：

1. **`isVerified(address _userAddress)`** (view)
   - 检查用户是否已验证（验证身份和声明）

2. **`investorCountry(address _userAddress)`** (view)
   - 获取用户的国籍

3. **`issuersRegistry()`** (view)
   - 获取可信发行者注册表合约

4. **`topicsRegistry()`** (view)
   - 获取声明主题注册表合约

5. **`identityStorage()`** (view)
   - 获取身份注册表存储合约

6. **`contains(address _userAddress)`** (view)
   - 检查用户是否已注册

7. **`identity(address _userAddress)`** (view)
   - 获取用户的身份合约地址

### 权限结构图

```mermaid
graph TB
    subgraph "IdentityRegistry"
        IR_Owner[Owner]
        IR_Agent[Agent]
        IR_Public[Public]
        
        IR_Owner -->|setIdentityRegistryStorage| IR_F1[设置存储合约]
        IR_Owner -->|setClaimTopicsRegistry| IR_F2[设置主题注册表]
        IR_Owner -->|setTrustedIssuersRegistry| IR_F3[设置发行者注册表]
        IR_Owner -->|addAgent/removeAgent| IR_F4[管理Agent角色]
        IR_Owner -->|init| IR_F5[初始化]
        
        IR_Agent -->|registerIdentity| IR_F6[注册身份]
        IR_Agent -->|batchRegisterIdentity| IR_F7[批量注册]
        IR_Agent -->|updateIdentity| IR_F8[更新身份]
        IR_Agent -->|updateCountry| IR_F9[更新国籍]
        IR_Agent -->|deleteIdentity| IR_F10[删除身份]
        
        IR_Public -->|isVerified| IR_F11[验证状态]
        IR_Public -->|investorCountry| IR_F12[查询国籍]
        IR_Public -->|contains| IR_F13[检查注册]
        IR_Public -->|identity| IR_F14[查询身份]
        IR_Public -->|issuersRegistry| IR_F15[查询注册表]
        IR_Public -->|topicsRegistry| IR_F16[查询主题注册表]
        IR_Public -->|identityStorage| IR_F17[查询存储]
    end
    
    classDef ownerStyle fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px,color:#fff
    classDef agentStyle fill:#4ecdc4,stroke:#0c8599,stroke-width:2px,color:#fff
    classDef publicStyle fill:#95e1d3,stroke:#20c997,stroke-width:2px,color:#000
    
    class IR_Owner ownerStyle
    class IR_Agent agentStyle
    class IR_Public publicStyle
```

---

## 3. IdentityRegistryStorage.sol

**继承关系：** `AgentRoleUpgradeable` + `IRSStorage`

### Owner 可以做的操作

1. **`addAgent(address _agent)`** (继承自 `AgentRoleUpgradeable`)
   - 添加新的 Agent 角色

2. **`removeAgent(address _agent)`** (继承自 `AgentRoleUpgradeable`)
   - 移除 Agent 角色

3. **`init()`**
   - 初始化合约（仅在部署时调用一次）

### Agent 可以做的操作

1. **`addIdentityToStorage(address _userAddress, IIdentity _identity, uint16 _country)`**
   - 向存储中添加用户身份信息
   - 限制：用户地址不能已存在

2. **`modifyStoredIdentity(address _userAddress, IIdentity _identity)`**
   - 修改已存储的用户身份合约
   - 限制：用户地址必须已存在

3. **`modifyStoredInvestorCountry(address _userAddress, uint16 _country)`**
   - 修改已存储的用户国籍
   - 限制：用户地址必须已存在

4. **`removeIdentityFromStorage(address _userAddress)`**
   - 从存储中移除用户身份信息
   - 限制：用户地址必须已存在

### 其他角色/公开操作

1. **`bindIdentityRegistry(address _identityRegistry)`**
   - 绑定身份注册表合约
   - **注意：** 虽然函数本身没有 `onlyOwner` 修饰符，但内部调用了 `addAgent(_identityRegistry)`，而 `addAgent` 需要 owner 权限，因此实际上只有 owner 可以调用
   - 限制：最多绑定300个身份注册表

2. **`unbindIdentityRegistry(address _identityRegistry)`**
   - 解绑身份注册表合约
   - **注意：** 虽然函数本身没有 `onlyOwner` 修饰符，但内部调用了 `removeAgent(_identityRegistry)`，而 `removeAgent` 需要 owner 权限，因此实际上只有 owner 可以调用

以下为 view 函数，任何人都可以调用：

3. **`linkedIdentityRegistries()`** (view)
   - 获取所有绑定的身份注册表列表

4. **`storedIdentity(address _userAddress)`** (view)
   - 获取存储的用户身份合约

5. **`storedInvestorCountry(address _userAddress)`** (view)
   - 获取存储的用户国籍

### 权限结构图

```mermaid
graph TB
    subgraph "IdentityRegistryStorage"
        IRS_Owner[Owner]
        IRS_Agent[Agent]
        IRS_Public[Public]
        
        IRS_Owner -->|addAgent/removeAgent| IRS_F1[管理Agent角色]
        IRS_Owner -->|bindIdentityRegistry| IRS_F2[绑定注册表]
        IRS_Owner -->|unbindIdentityRegistry| IRS_F3[解绑注册表]
        IRS_Owner -->|init| IRS_F4[初始化]
        
        IRS_Agent -->|addIdentityToStorage| IRS_F5[添加身份]
        IRS_Agent -->|modifyStoredIdentity| IRS_F6[修改身份]
        IRS_Agent -->|modifyStoredInvestorCountry| IRS_F7[修改国籍]
        IRS_Agent -->|removeIdentityFromStorage| IRS_F8[移除身份]
        
        IRS_Public -->|linkedIdentityRegistries| IRS_F9[查询绑定列表]
        IRS_Public -->|storedIdentity| IRS_F10[查询身份]
        IRS_Public -->|storedInvestorCountry| IRS_F11[查询国籍]
    end
    
    classDef ownerStyle fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px,color:#fff
    classDef agentStyle fill:#4ecdc4,stroke:#0c8599,stroke-width:2px,color:#fff
    classDef publicStyle fill:#95e1d3,stroke:#20c997,stroke-width:2px,color:#000
    
    class IRS_Owner ownerStyle
    class IRS_Agent agentStyle
    class IRS_Public publicStyle
```

---

## 4. TrustedIssuersRegistry.sol

**继承关系：** `OwnableUpgradeable` + `TIRStorage`

### Owner 可以做的操作

1. **`addTrustedIssuer(IClaimIssuer _trustedIssuer, uint256[] _claimTopics)`**
   - 添加可信声明发行者
   - 限制：最多50个可信发行者，每个发行者最多15个声明主题

2. **`removeTrustedIssuer(IClaimIssuer _trustedIssuer)`**
   - 移除可信声明发行者

3. **`updateIssuerClaimTopics(IClaimIssuer _trustedIssuer, uint256[] _claimTopics)`**
   - 更新可信发行者的声明主题列表
   - 限制：最多15个声明主题

4. **`init()`**
   - 初始化合约（仅在部署时调用一次）

### Agent 可以做的操作

- **无**（此合约不涉及 Agent 角色）

### 其他角色/公开操作

以下为 view 函数，任何人都可以调用：

1. **`getTrustedIssuers()`** (view)
   - 获取所有可信发行者列表

2. **`getTrustedIssuersForClaimTopic(uint256 claimTopic)`** (view)
   - 获取支持特定声明主题的可信发行者列表

3. **`isTrustedIssuer(address _issuer)`** (view)
   - 检查地址是否为可信发行者

4. **`getTrustedIssuerClaimTopics(IClaimIssuer _trustedIssuer)`** (view)
   - 获取指定可信发行者的声明主题列表

5. **`hasClaimTopic(address _issuer, uint256 _claimTopic)`** (view)
   - 检查发行者是否支持指定的声明主题

### 权限结构图

```mermaid
graph TB
    subgraph "TrustedIssuersRegistry"
        TIR_Owner[Owner]
        TIR_Public[Public]
        
        TIR_Owner -->|addTrustedIssuer| TIR_F1[添加可信发行者]
        TIR_Owner -->|removeTrustedIssuer| TIR_F2[移除可信发行者]
        TIR_Owner -->|updateIssuerClaimTopics| TIR_F3[更新声明主题]
        TIR_Owner -->|init| TIR_F4[初始化]
        
        TIR_Public -->|getTrustedIssuers| TIR_F5[查询发行者列表]
        TIR_Public -->|getTrustedIssuersForClaimTopic| TIR_F6[按主题查询]
        TIR_Public -->|isTrustedIssuer| TIR_F7[检查发行者]
        TIR_Public -->|getTrustedIssuerClaimTopics| TIR_F8[查询主题列表]
        TIR_Public -->|hasClaimTopic| TIR_F9[检查主题]
    end
    
    classDef ownerStyle fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px,color:#fff
    classDef publicStyle fill:#95e1d3,stroke:#20c997,stroke-width:2px,color:#000
    
    class TIR_Owner ownerStyle
    class TIR_Public publicStyle
```

---

## 5. Token.sol

**继承关系：** `AgentRoleUpgradeable` + `TokenStorage`

### Owner 可以做的操作

1. **`setName(string calldata _name)`**
   - 设置代币名称

2. **`setSymbol(string calldata _symbol)`**
   - 设置代币符号

3. **`setOnchainID(address _onchainID)`**
   - 设置代币的 OnchainID 地址
   - 可以设置为零地址表示未绑定

4. **`setIdentityRegistry(address _identityRegistry)`**
   - 设置身份注册表合约地址

5. **`setCompliance(address _compliance)`**
   - 设置合规合约地址
   - 会自动解绑旧合规合约并绑定新合约

6. **`addAgent(address _agent)`** (继承自 `AgentRoleUpgradeable`)
   - 添加新的 Agent 角色

7. **`removeAgent(address _agent)`** (继承自 `AgentRoleUpgradeable`)
   - 移除 Agent 角色

8. **`init(...)`**
   - 初始化合约（仅在部署时调用一次）
   - 设置代币基本信息、身份注册表和合规合约

### Agent 可以做的操作

1. **`pause()`**
   - 暂停代币合约
   - 限制：合约必须未暂停

2. **`unpause()`**
   - 恢复代币合约
   - 限制：合约必须已暂停

3. **`recoveryAddress(address _lostWallet, address _newWallet, address _investorOnchainID)`**
   - 恢复丢失钱包的代币到新钱包
   - 需要新钱包的 OnchainID 验证

4. **`forcedTransfer(address _from, address _to, uint256 _amount)`**
   - 强制转账（Agent 权限）
   - 可以解冻部分代币以完成转账
   - 限制：接收地址必须已验证

5. **`mint(address _to, uint256 _amount)`**
   - 铸造代币
   - 限制：接收地址必须已验证，且通过合规检查

6. **`burn(address _userAddress, uint256 _amount)`**
   - 销毁代币
   - 可以解冻部分代币以完成销毁

7. **`setAddressFrozen(address _userAddress, bool _freeze)`**
   - 冻结/解冻地址

8. **`freezePartialTokens(address _userAddress, uint256 _amount)`**
   - 冻结用户的部分代币

9. **`unfreezePartialTokens(address _userAddress, uint256 _amount)`**
   - 解冻用户的部分代币

10. **`batchForcedTransfer(address[] _fromList, address[] _toList, uint256[] _amounts)`**
    - 批量强制转账

11. **`batchMint(address[] _toList, uint256[] _amounts)`**
    - 批量铸造代币

12. **`batchBurn(address[] _userAddresses, uint256[] _amounts)`**
    - 批量销毁代币

13. **`batchSetAddressFrozen(address[] _userAddresses, bool[] _freeze)`**
    - 批量冻结/解冻地址

14. **`batchFreezePartialTokens(address[] _userAddresses, uint256[] _amounts)`**
    - 批量冻结部分代币

15. **`batchUnfreezePartialTokens(address[] _userAddresses, uint256[] _amounts)`**
    - 批量解冻部分代币

### 其他角色/公开操作

以下为 ERC-20 标准函数和公开操作：

1. **`transfer(address _to, uint256 _amount)`**
   - 转账代币
   - 限制：合约未暂停，地址未冻结，余额充足，接收地址已验证，通过合规检查

2. **`transferFrom(address _from, address _to, uint256 _amount)`**
   - 从指定地址转账代币
   - 限制：合约未暂停，地址未冻结，余额充足，接收地址已验证，通过合规检查

3. **`approve(address _spender, uint256 _amount)`**
   - 授权支出额度

4. **`increaseAllowance(address _spender, uint256 _addedValue)`**
   - 增加授权额度

5. **`decreaseAllowance(address _spender, uint256 _subtractedValue)`**
   - 减少授权额度

6. **`batchTransfer(address[] _toList, uint256[] _amounts)`**
   - 批量转账

以下为 view 函数，任何人都可以调用：

7. **`balanceOf(address _userAddress)`** (view)
   - 查询账户余额

8. **`totalSupply()`** (view)
   - 查询代币总供应量

9. **`allowance(address _owner, address _spender)`** (view)
   - 查询授权额度

10. **`name()`** (view)
    - 查询代币名称

11. **`symbol()`** (view)
    - 查询代币符号

12. **`decimals()`** (view)
    - 查询代币精度

13. **`paused()`** (view)
    - 查询合约是否暂停

14. **`isFrozen(address _userAddress)`** (view)
    - 查询地址是否冻结

15. **`getFrozenTokens(address _userAddress)`** (view)
    - 查询冻结的代币数量

16. **`onchainID()`** (view)
    - 查询代币的 OnchainID 地址

17. **`version()`** (view)
    - 查询代币版本

18. **`identityRegistry()`** (view)
    - 查询身份注册表合约

19. **`compliance()`** (view)
    - 查询合规合约

### 权限结构图

```mermaid
graph TB
    subgraph "Token"
        Token_Owner[Owner]
        Token_Agent[Agent]
        Token_Public[Public]
        
        Token_Owner -->|setName/setSymbol| Token_F1[设置代币信息]
        Token_Owner -->|setIdentityRegistry| Token_F2[设置身份注册表]
        Token_Owner -->|setCompliance| Token_F3[设置合规合约]
        Token_Owner -->|addAgent/removeAgent| Token_F4[管理Agent角色]
        Token_Owner -->|init| Token_F5[初始化]
        
        Token_Agent -->|pause/unpause| Token_F6[暂停/恢复]
        Token_Agent -->|mint/burn| Token_F7[铸造/销毁]
        Token_Agent -->|forcedTransfer| Token_F8[强制转账]
        Token_Agent -->|setAddressFrozen| Token_F9[冻结地址]
        Token_Agent -->|freezePartialTokens| Token_F10[冻结部分代币]
        Token_Agent -->|recoveryAddress| Token_F11[恢复钱包]
        
        Token_Public -->|transfer| Token_F12[转账]
        Token_Public -->|approve| Token_F13[授权]
        Token_Public -->|balanceOf| Token_F14[查询余额]
        Token_Public -->|totalSupply| Token_F15[查询总量]
    end
    
    classDef ownerStyle fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px,color:#fff
    classDef agentStyle fill:#4ecdc4,stroke:#0c8599,stroke-width:2px,color:#fff
    classDef publicStyle fill:#95e1d3,stroke:#20c997,stroke-width:2px,color:#000
    
    class Token_Owner ownerStyle
    class Token_Agent agentStyle
    class Token_Public publicStyle
```

---

## 6. ModularCompliance.sol

**继承关系：** `OwnableUpgradeable` + `MCStorage`

### Owner 可以做的操作

1. **`addModule(address _module)`**
   - 添加合规模块
   - 限制：最多25个模块，模块必须未绑定，非即插即用模块需要通过兼容性检查

2. **`removeModule(address _module)`**
   - 移除合规模块
   - 限制：模块必须已绑定

3. **`callModuleFunction(bytes calldata callData, address _module)`**
   - 调用模块的自定义函数
   - 限制：模块必须已绑定
   - 用于配置模块参数

4. **`bindToken(address _token)`**
   - 绑定代币合约
   - **注意：** Owner 或代币合约本身可以调用
   - 限制：首次绑定时只能由代币合约调用

5. **`unbindToken(address _token)`**
   - 解绑代币合约
   - **注意：** Owner 或代币合约本身可以调用

6. **`init()`**
   - 初始化合约（仅在部署时调用一次）

### Token 可以做的操作（onlyToken）

以下操作只能由绑定的代币合约调用：

1. **`transferred(address _from, address _to, uint256 _value)`**
   - 代币转账后的回调
   - 触发所有模块的 `moduleTransferAction`

2. **`created(address _to, uint256 _value)`**
   - 代币铸造后的回调
   - 触发所有模块的 `moduleMintAction`

3. **`destroyed(address _from, uint256 _value)`**
   - 代币销毁后的回调
   - 触发所有模块的 `moduleBurnAction`

### 其他角色/公开操作

以下为 view 函数，任何人都可以调用：

1. **`canTransfer(address _from, address _to, uint256 _value)`** (view)
   - 检查转账是否合规
   - 会调用所有模块的 `moduleCheck` 函数

2. **`getModules()`** (view)
   - 获取所有已绑定的模块列表

3. **`isModuleBound(address _module)`** (view)
   - 检查模块是否已绑定

4. **`getTokenBound()`** (view)
   - 获取绑定的代币合约地址

### 权限结构图

```mermaid
graph TB
    subgraph "ModularCompliance"
        MC_Owner[Owner]
        MC_Token[Token]
        MC_Public[Public]
        
        MC_Owner -->|addModule/removeModule| MC_F1[管理模块]
        MC_Owner -->|callModuleFunction| MC_F2[调用模块函数]
        MC_Owner -->|bindToken/unbindToken| MC_F3[绑定/解绑代币]
        MC_Owner -->|init| MC_F4[初始化]
        
        MC_Token -->|transferred| MC_F5[转账回调]
        MC_Token -->|created| MC_F6[铸造回调]
        MC_Token -->|destroyed| MC_F7[销毁回调]
        
        MC_Public -->|canTransfer| MC_F8[检查合规]
        MC_Public -->|getModules| MC_F9[查询模块]
        MC_Public -->|getTokenBound| MC_F10[查询代币]
    end
    
    classDef ownerStyle fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px,color:#fff
    classDef publicStyle fill:#95e1d3,stroke:#20c997,stroke-width:2px,color:#000
    classDef tokenStyle fill:#a29bfe,stroke:#6c5ce7,stroke-width:2px,color:#fff
    
    class MC_Owner ownerStyle
    class MC_Public publicStyle
    class MC_Token tokenStyle
```

---

## 7. RWAIdentityIdFactory.sol & RWAIdentityGateway.sol

**继承关系：** 
- `RWAIdentityIdFactory` 继承自 `IdFactory` (继承自 `Ownable`)
- `RWAIdentityGateway` 继承自 `Gateway` (继承自 `Ownable`)

### RWAIdentityIdFactory - Owner 可以做的操作

1. **`addTokenFactory(address _factory)`** (继承自 `IdFactory`)
   - 添加代币工厂地址
   - 限制：地址不能为零地址，不能重复添加

2. **`removeTokenFactory(address _factory)`** (继承自 `IdFactory`)
   - 移除代币工厂地址
   - 限制：地址必须已注册为代币工厂

3. **`createIdentity(address _wallet, string memory _salt)`** (继承自 `IdFactory`)
   - 创建用户身份合约
   - 限制：钱包地址不能为零地址，salt 不能为空，salt 未被使用，钱包未链接到其他身份

4. **`createIdentityWithManagementKeys(address _wallet, string memory _salt, bytes32[] _managementKeys)`** (继承自 `IdFactory`)
   - 创建带管理密钥的用户身份合约
   - 限制：钱包地址不能为零地址，salt 不能为空，salt 未被使用，钱包未链接到其他身份，管理密钥列表不能为空，钱包地址不能出现在管理密钥中

5. **`transferOwnership(address newOwner)`** (继承自 `Ownable`)
   - 转移合约所有权

### RWAIdentityIdFactory - Token Factory 或 Owner 可以做的操作

1. **`createTokenIdentity(address _token, address _tokenOwner, string memory _salt)`** (继承自 `IdFactory`)
   - 创建代币身份合约
   - 限制：代币地址和代币所有者不能为零地址，salt 不能为空，salt 未被使用，代币未链接到其他身份

### RWAIdentityIdFactory - 其他角色/公开操作

1. **`linkWallet(address _newWallet)`** (继承自 `IdFactory`)
   - 将新钱包链接到现有身份
   - 限制：新钱包地址不能为零地址，调用者钱包必须已链接到身份，新钱包未链接，新钱包不是代币地址，每个身份最多链接100个钱包

2. **`unlinkWallet(address _oldWallet)`** (继承自 `IdFactory`)
   - 取消钱包与身份的链接
   - 限制：旧钱包地址不能为零地址，不能取消调用者自己的链接，调用者必须与旧钱包链接到同一身份

以下为 view 函数，任何人都可以调用：

3. **`getIdentity(address _wallet)`** (view, 继承自 `IdFactory`)
   - 获取钱包对应的身份合约地址

4. **`isSaltTaken(string calldata _salt)`** (view, 继承自 `IdFactory`)
   - 检查 salt 是否已被使用

5. **`getWallets(address _identity)`** (view, 继承自 `IdFactory`)
   - 获取身份合约关联的所有钱包地址列表

6. **`getToken(address _identity)`** (view, 继承自 `IdFactory`)
   - 获取身份合约关联的代币地址

7. **`isTokenFactory(address _factory)`** (view, 继承自 `IdFactory`)
   - 检查地址是否为代币工厂

8. **`implementationAuthority()`** (view, 继承自 `IdFactory`)
   - 获取实现授权合约地址

9. **`owner()`** (view, 继承自 `Ownable`)
   - 获取合约所有者地址

### RWAIdentityGateway - Owner 可以做的操作

1. **`approveSigner(address signer)`** (继承自 `Gateway`)
   - 批准签名者，允许其签名身份部署请求
   - 限制：签名者地址不能为零地址，不能重复批准

2. **`revokeSigner(address signer)`** (继承自 `Gateway`)
   - 撤销签名者权限
   - 限制：签名者地址不能为零地址，签名者必须已被批准

3. **`revokeSignature(bytes calldata signature)`** (继承自 `Gateway`)
   - 撤销签名，使该签名无法用于部署身份
   - 限制：签名必须未被撤销

4. **`approveSignature(bytes calldata signature)`** (继承自 `Gateway`)
   - 批准已撤销的签名，恢复其有效性
   - 限制：签名必须已被撤销

5. **`transferFactoryOwnership(address newOwner)`** (继承自 `Gateway`)
   - 转移工厂合约的所有权

6. **`callFactory(bytes memory data)`** (继承自 `Gateway`)
   - 调用工厂合约的任意函数
   - 限制：调用必须成功

7. **`transferOwnership(address newOwner)`** (继承自 `Ownable`)
   - 转移网关合约的所有权

### RWAIdentityGateway - 其他角色/公开操作

1. **`deployIdentityWithSalt(address identityOwner, string memory salt, uint256 signatureExpiry, bytes calldata signature)`** (继承自 `Gateway`)
   - 使用签名和自定义 salt 部署身份合约
   - 限制：身份所有者地址不能为零地址，签名未过期（如果设置了过期时间），签名来自已批准的签名者，签名未被撤销

2. **`deployIdentityWithSaltAndManagementKeys(address identityOwner, string memory salt, bytes32[] calldata managementKeys, uint256 signatureExpiry, bytes calldata signature)`** (继承自 `Gateway`)
   - 使用签名、自定义 salt 和管理密钥部署身份合约
   - 限制：身份所有者地址不能为零地址，签名未过期（如果设置了过期时间），签名来自已批准的签名者，签名未被撤销

3. **`deployIdentityForWallet(address identityOwner)`** (继承自 `Gateway`)
   - 为钱包部署身份合约（使用钱包地址作为 salt）
   - 限制：身份所有者地址不能为零地址

以下为 view 函数，任何人都可以调用：

4. **`idFactory()`** (view, 继承自 `Gateway`)
   - 获取关联的身份工厂合约地址

5. **`approvedSigners(address signer)`** (view, 继承自 `Gateway`)
   - 检查签名者是否已被批准

6. **`revokedSignatures(bytes signature)`** (view, 继承自 `Gateway`)
   - 检查签名是否已被撤销

7. **`owner()`** (view, 继承自 `Ownable`)
   - 获取合约所有者地址

### 权限结构图

```mermaid
graph TB
    subgraph "RWAIdentityIdFactory"
        IF_Owner[Owner]
        IF_TokenFactory[Token Factory]
        IF_Public[Public]
        
        IF_Owner -->|addTokenFactory/removeTokenFactory| IF_F1[管理代币工厂]
        IF_Owner -->|createIdentity| IF_F2[创建身份]
        IF_Owner -->|createIdentityWithManagementKeys| IF_F3[创建带密钥的身份]
        IF_Owner -->|transferOwnership| IF_F4[转移所有权]
        
        IF_TokenFactory -->|createTokenIdentity| IF_F5[创建代币身份]
        IF_Owner -->|createTokenIdentity| IF_F5
        
        IF_Public -->|linkWallet/unlinkWallet| IF_F6[管理钱包链接]
        IF_Public -->|getIdentity| IF_F7[查询身份]
        IF_Public -->|isSaltTaken| IF_F8[查询Salt]
        IF_Public -->|getWallets| IF_F9[查询钱包列表]
    end
    
    subgraph "RWAIdentityGateway"
        IG_Owner[Owner]
        IG_Public[Public]
        
        IG_Owner -->|approveSigner/revokeSigner| IG_F1[管理签名者]
        IG_Owner -->|revokeSignature/approveSignature| IG_F2[管理签名]
        IG_Owner -->|transferFactoryOwnership| IG_F3[转移工厂所有权]
        IG_Owner -->|callFactory| IG_F4[调用工厂函数]
        IG_Owner -->|transferOwnership| IG_F5[转移网关所有权]
        
        IG_Public -->|deployIdentityWithSalt| IG_F6[部署身份-带Salt]
        IG_Public -->|deployIdentityWithSaltAndManagementKeys| IG_F7[部署身份-带密钥]
        IG_Public -->|deployIdentityForWallet| IG_F8[部署身份-钱包]
        IG_Public -->|approvedSigners| IG_F9[查询签名者]
        IG_Public -->|revokedSignatures| IG_F10[查询签名状态]
    end
    
    classDef ownerStyle fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px,color:#fff
    classDef publicStyle fill:#95e1d3,stroke:#20c997,stroke-width:2px,color:#000
    classDef tokenFactoryStyle fill:#a29bfe,stroke:#6c5ce7,stroke-width:2px,color:#fff
    
    class IF_Owner,IG_Owner ownerStyle
    class IF_Public,IG_Public publicStyle
    class IF_TokenFactory tokenFactoryStyle
```

---

## 8. RWAClaimIssuerIdFactory.sol & RWAClaimIssuerGateway.sol

**继承关系：** 
- `RWAClaimIssuerIdFactory` 继承自 `IdFactory` (继承自 `Ownable`)
- `RWAClaimIssuerGateway` 继承自 `Gateway` (继承自 `Ownable`)

### RWAClaimIssuerIdFactory - Owner 可以做的操作

1. **`addTokenFactory(address _factory)`** (继承自 `IdFactory`)
   - 添加代币工厂地址
   - 限制：地址不能为零地址，不能重复添加

2. **`removeTokenFactory(address _factory)`** (继承自 `IdFactory`)
   - 移除代币工厂地址
   - 限制：地址必须已注册为代币工厂

3. **`createIdentity(address _wallet, string memory _salt)`** (继承自 `IdFactory`)
   - 创建声明发行者身份合约
   - 限制：钱包地址不能为零地址，salt 不能为空，salt 未被使用，钱包未链接到其他身份

4. **`createIdentityWithManagementKeys(address _wallet, string memory _salt, bytes32[] _managementKeys)`** (继承自 `IdFactory`)
   - 创建带管理密钥的声明发行者身份合约
   - 限制：钱包地址不能为零地址，salt 不能为空，salt 未被使用，钱包未链接到其他身份，管理密钥列表不能为空，钱包地址不能出现在管理密钥中

5. **`transferOwnership(address newOwner)`** (继承自 `Ownable`)
   - 转移合约所有权

### RWAClaimIssuerIdFactory - Token Factory 或 Owner 可以做的操作

1. **`createTokenIdentity(address _token, address _tokenOwner, string memory _salt)`** (继承自 `IdFactory`)
   - 创建代币身份合约
   - 限制：代币地址和代币所有者不能为零地址，salt 不能为空，salt 未被使用，代币未链接到其他身份

### RWAClaimIssuerIdFactory - 其他角色/公开操作

1. **`linkWallet(address _newWallet)`** (继承自 `IdFactory`)
   - 将新钱包链接到现有身份
   - 限制：新钱包地址不能为零地址，调用者钱包必须已链接到身份，新钱包未链接，新钱包不是代币地址，每个身份最多链接100个钱包

2. **`unlinkWallet(address _oldWallet)`** (继承自 `IdFactory`)
   - 取消钱包与身份的链接
   - 限制：旧钱包地址不能为零地址，不能取消调用者自己的链接，调用者必须与旧钱包链接到同一身份

以下为 view 函数，任何人都可以调用：

3. **`getIdentity(address _wallet)`** (view, 继承自 `IdFactory`)
   - 获取钱包对应的身份合约地址

4. **`isSaltTaken(string calldata _salt)`** (view, 继承自 `IdFactory`)
   - 检查 salt 是否已被使用

5. **`getWallets(address _identity)`** (view, 继承自 `IdFactory`)
   - 获取身份合约关联的所有钱包地址列表

6. **`getToken(address _identity)`** (view, 继承自 `IdFactory`)
   - 获取身份合约关联的代币地址

7. **`isTokenFactory(address _factory)`** (view, 继承自 `IdFactory`)
   - 检查地址是否为代币工厂

8. **`implementationAuthority()`** (view, 继承自 `IdFactory`)
   - 获取实现授权合约地址

9. **`owner()`** (view, 继承自 `Ownable`)
   - 获取合约所有者地址

### RWAClaimIssuerGateway - Owner 可以做的操作

1. **`approveSigner(address signer)`** (继承自 `Gateway`)
   - 批准签名者，允许其签名身份部署请求
   - 限制：签名者地址不能为零地址，不能重复批准

2. **`revokeSigner(address signer)`** (继承自 `Gateway`)
   - 撤销签名者权限
   - 限制：签名者地址不能为零地址，签名者必须已被批准

3. **`revokeSignature(bytes calldata signature)`** (继承自 `Gateway`)
   - 撤销签名，使该签名无法用于部署身份
   - 限制：签名必须未被撤销

4. **`approveSignature(bytes calldata signature)`** (继承自 `Gateway`)
   - 批准已撤销的签名，恢复其有效性
   - 限制：签名必须已被撤销

5. **`transferFactoryOwnership(address newOwner)`** (继承自 `Gateway`)
   - 转移工厂合约的所有权

6. **`callFactory(bytes memory data)`** (继承自 `Gateway`)
   - 调用工厂合约的任意函数
   - 限制：调用必须成功

7. **`transferOwnership(address newOwner)`** (继承自 `Ownable`)
   - 转移网关合约的所有权

### RWAClaimIssuerGateway - 其他角色/公开操作

1. **`deployIdentityWithSalt(address identityOwner, string memory salt, uint256 signatureExpiry, bytes calldata signature)`** (继承自 `Gateway`)
   - 使用签名和自定义 salt 部署声明发行者身份合约
   - 限制：身份所有者地址不能为零地址，签名未过期（如果设置了过期时间），签名来自已批准的签名者，签名未被撤销

2. **`deployIdentityWithSaltAndManagementKeys(address identityOwner, string memory salt, bytes32[] calldata managementKeys, uint256 signatureExpiry, bytes calldata signature)`** (继承自 `Gateway`)
   - 使用签名、自定义 salt 和管理密钥部署声明发行者身份合约
   - 限制：身份所有者地址不能为零地址，签名未过期（如果设置了过期时间），签名来自已批准的签名者，签名未被撤销

3. **`deployIdentityForWallet(address identityOwner)`** (继承自 `Gateway`)
   - 为钱包部署声明发行者身份合约（使用钱包地址作为 salt）
   - 限制：身份所有者地址不能为零地址

以下为 view 函数，任何人都可以调用：

4. **`idFactory()`** (view, 继承自 `Gateway`)
   - 获取关联的身份工厂合约地址

5. **`approvedSigners(address signer)`** (view, 继承自 `Gateway`)
   - 检查签名者是否已被批准

6. **`revokedSignatures(bytes signature)`** (view, 继承自 `Gateway`)
   - 检查签名是否已被撤销

7. **`owner()`** (view, 继承自 `Ownable`)
   - 获取合约所有者地址

### 权限结构图

```mermaid
graph TB
    subgraph "RWAClaimIssuerIdFactory"
        CIF_Owner[Owner]
        CIF_TokenFactory[Token Factory]
        CIF_Public[Public]
        
        CIF_Owner -->|addTokenFactory/removeTokenFactory| CIF_F1[管理代币工厂]
        CIF_Owner -->|createIdentity| CIF_F2[创建身份]
        CIF_Owner -->|createIdentityWithManagementKeys| CIF_F3[创建带密钥的身份]
        CIF_Owner -->|transferOwnership| CIF_F4[转移所有权]
        
        CIF_TokenFactory -->|createTokenIdentity| CIF_F5[创建代币身份]
        CIF_Owner -->|createTokenIdentity| CIF_F5
        
        CIF_Public -->|linkWallet/unlinkWallet| CIF_F6[管理钱包链接]
        CIF_Public -->|getIdentity| CIF_F7[查询身份]
        CIF_Public -->|isSaltTaken| CIF_F8[查询Salt]
        CIF_Public -->|getWallets| CIF_F9[查询钱包列表]
    end
    
    subgraph "RWAClaimIssuerGateway"
        CIG_Owner[Owner]
        CIG_Public[Public]
        
        CIG_Owner -->|approveSigner/revokeSigner| CIG_F1[管理签名者]
        CIG_Owner -->|revokeSignature/approveSignature| CIG_F2[管理签名]
        CIG_Owner -->|transferFactoryOwnership| CIG_F3[转移工厂所有权]
        CIG_Owner -->|callFactory| CIG_F4[调用工厂函数]
        CIG_Owner -->|transferOwnership| CIG_F5[转移网关所有权]
        
        CIG_Public -->|deployIdentityWithSalt| CIG_F6[部署身份-带Salt]
        CIG_Public -->|deployIdentityWithSaltAndManagementKeys| CIG_F7[部署身份-带密钥]
        CIG_Public -->|deployIdentityForWallet| CIG_F8[部署身份-钱包]
        CIG_Public -->|approvedSigners| CIG_F9[查询签名者]
        CIG_Public -->|revokedSignatures| CIG_F10[查询签名状态]
    end
    
    classDef ownerStyle fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px,color:#fff
    classDef publicStyle fill:#95e1d3,stroke:#20c997,stroke-width:2px,color:#000
    classDef tokenFactoryStyle fill:#a29bfe,stroke:#6c5ce7,stroke-width:2px,color:#fff
    
    class CIF_Owner,CIG_Owner ownerStyle
    class CIF_Public,CIG_Public publicStyle
    class CIF_TokenFactory tokenFactoryStyle
```

---

## 权限关系总结

### 角色层级

```
Owner (最高权限)
  ├── 管理合约配置
  ├── 管理 Agent 角色
  ├── 管理注册表核心设置
  ├── 管理身份工厂和网关
  └── 管理签名者和签名

Agent (操作权限)
  ├── 管理用户身份注册
  ├── 管理身份信息更新
  └── 管理身份存储操作

Token Factory (代币工厂权限)
  └── 创建代币身份合约

Public (公开权限)
  ├── 查询合约状态和信息
  ├── 部署身份合约（需有效签名）
  └── 管理钱包与身份的链接
```

### 关键权限说明

1. **Owner 权限范围：**
   - 所有合约的配置管理
   - Agent 角色的添加和移除
   - 注册表之间的关联设置
   - 代币基本信息和关联合约配置
   - 合规模块的添加、移除和配置
   - 身份工厂的代币工厂管理
   - 身份工厂的身份创建
   - 网关的签名者管理和签名管理

2. **Agent 权限范围：**
   - 用户身份的日常管理操作
   - 身份信息的增删改查
   - 代币的铸造、销毁、冻结等操作
   - 不涉及系统配置变更

3. **Token 权限（仅限绑定的代币合约）：**
   - 调用合规合约的转账、铸造、销毁回调
   - 用于触发合规模块的状态更新

4. **Token Factory 权限（仅限已注册的代币工厂）：**
   - 创建代币身份合约
   - 用于将代币与身份合约关联

5. **公开权限：**
   - 所有 view 函数均可公开访问
   - ERC-20 标准的转账和授权操作
   - 身份工厂的钱包链接/取消链接操作
   - 网关的身份部署操作（需要有效签名）
   - 用于查询和验证，不影响状态（转账和部署除外）

### 权限矩阵图

```mermaid
graph LR
    subgraph "权限角色"
        Owner[Owner<br/>所有者]
        Agent[Agent<br/>代理]
        Public[Public<br/>公开]
        TokenFactory[Token Factory<br/>代币工厂]
    end
    
    subgraph "合约功能"
        CTR[ClaimTopicsRegistry]
        IR[IdentityRegistry]
        IRS[IdentityRegistryStorage]
        TIR[TrustedIssuersRegistry]
        Token[Token]
        MC[ModularCompliance]
        IF[IdentityIdFactory]
        IG[IdentityGateway]
        CIF[ClaimIssuerIdFactory]
        CIG[ClaimIssuerGateway]
    end
    
    Owner -->|配置管理| CTR
    Owner -->|配置管理<br/>Agent管理| IR
    Owner -->|Agent管理<br/>绑定管理| IRS
    Owner -->|发行者管理| TIR
    Owner -->|代币配置<br/>Agent管理| Token
    Owner -->|模块管理<br/>代币绑定| MC
    Owner -->|身份工厂管理| IF
    Owner -->|签名者管理| IG
    Owner -->|声明发行者工厂管理| CIF
    Owner -->|签名者管理| CIG
    
    Agent -.->|无权限| CTR
    Agent -->|身份管理| IR
    Agent -->|存储管理| IRS
    Agent -.->|无权限| TIR
    Agent -->|代币操作<br/>冻结管理| Token
    Agent -.->|无权限| MC
    Agent -.->|无权限| IF
    Agent -.->|无权限| IG
    Agent -.->|无权限| CIF
    Agent -.->|无权限| CIG
    
    Public -->|查询| CTR
    Public -->|查询| IR
    Public -->|查询| IRS
    Public -->|查询| TIR
    Public -->|转账<br/>查询| Token
    Public -->|查询| MC
    Public -->|部署身份<br/>查询| IF
    Public -->|部署身份<br/>查询| IG
    Public -->|部署身份<br/>查询| CIF
    Public -->|部署身份<br/>查询| CIG
    
    TokenFactory -->|创建代币身份| IF
    TokenFactory -->|创建代币身份| CIF
    
    Token -.->|回调| MC
    
    classDef ownerStyle fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px,color:#fff
    classDef agentStyle fill:#4ecdc4,stroke:#0c8599,stroke-width:3px,color:#fff
    classDef publicStyle fill:#95e1d3,stroke:#20c997,stroke-width:3px,color:#000
    classDef contractStyle fill:#ffeaa7,stroke:#fdcb6e,stroke-width:2px,color:#000
    classDef tokenStyle fill:#a29bfe,stroke:#6c5ce7,stroke-width:2px,color:#fff
    classDef tokenFactoryStyle fill:#fd79a8,stroke:#e84393,stroke-width:2px,color:#fff
    
    class Owner ownerStyle
    class Agent agentStyle
    class Public publicStyle
    class TokenFactory tokenFactoryStyle
    class CTR,IR,IRS,TIR,Token,MC,IF,IG,CIF,CIG contractStyle
```

### 注意事项

1. `IdentityRegistryStorage.bindIdentityRegistry()` 和 `unbindIdentityRegistry()` 虽然没有显式的 `onlyOwner` 修饰符，但由于内部调用了需要 owner 权限的 `addAgent`/`removeAgent`，因此实际上只有 owner 可以调用。

2. Agent 角色由 Owner 通过 `addAgent()` 和 `removeAgent()` 管理，这些函数继承自 `AgentRoleUpgradeable`。

3. 所有合约都使用 `initializer` 修饰符保护初始化函数，确保只能调用一次。

4. `ModularCompliance.bindToken()` 和 `unbindToken()` 可以由 Owner 或代币合约本身调用。首次绑定时，如果 `_tokenBound` 为零地址，只能由代币合约调用。

5. `ModularCompliance` 的 `transferred`、`created`、`destroyed` 函数只能由绑定的代币合约通过 `onlyToken` 修饰符调用，用于在代币操作后触发合规模块的状态更新。

6. `Token` 合约的 `transfer` 和 `transferFrom` 函数需要满足以下条件：
   - 合约未暂停（`whenNotPaused`）
   - 地址未冻结
   - 余额充足（考虑冻结代币）
   - 接收地址已验证（`isVerified`）
   - 通过合规检查（`canTransfer`）

7. `Token` 合约的 `mint` 函数需要接收地址已验证且通过合规检查（`canTransfer` 从零地址到接收地址）。

8. `IdFactory` 合约的 `createTokenIdentity` 函数可以由 Owner 或已注册的 Token Factory 调用，用于创建代币身份合约。

9. `Gateway` 合约的 `deployIdentityWithSalt` 和 `deployIdentityWithSaltAndManagementKeys` 函数需要有效的签名，签名必须来自已批准的签名者且未被撤销。如果设置了过期时间，签名必须在有效期内。

10. `Gateway` 合约在构造函数中最多可以批准10个签名者，后续可以通过 `approveSigner` 添加更多签名者。

11. `IdFactory` 合约中，每个身份最多可以链接100个钱包地址，通过 `linkWallet` 和 `unlinkWallet` 进行管理。

