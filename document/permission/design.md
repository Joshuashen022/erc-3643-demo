# 主要合约权限设计

## 权限表格

| 合约名称 | 角色/权限类型 | 权限描述 | 权限类别 | 负责部门 | 数量 |
|---------|-------------|---------|---------|---------|------|
| ClaimTopicsRegistry | Owner | 管理topic | 业务逻辑 | 法务 | 1 |
| TrustedIssuersRegistry | Owner | 管理issuer | 业务逻辑 | 法务 | 1 |
| ModularCompliance | Owner | 管理module | 业务逻辑 | 监管 | 1 |
| IdentityRegistry | Owner | 管理子模块 | 合约升级 | 合约管理者 | 1 |
| IdentityRegistry | Agent | 新用户注册 | 业务逻辑 | 后端 | n |
| IdentityRegistryStorage | Owner | 管理子模块 | 合约升级 | 合约管理者 | 1 |
| Token | Owner | 管理子模块 | 合约升级 | 合约管理者 | 1 |
| Token | Agent | 资金管理 | 业务逻辑 | 财务 | n |
| TREXImplementationAuthority | Owner | 管理子模块 | 合约升级 | 合约管理者 | 1 |
| TREXFactory | Owner | 管理子模块 | 合约升级 | 合约管理者 | 1 |
| TREXGateway | Owner | 管理子模块 | 合约升级 | 合约管理者 | 1 |
| TREXGateway | Agent | 管理子模块 | 合约升级 | 合约管理者 | 1 |
| IdentityIdFactory | Owner | 管理identity | 业务逻辑 | 监管 | 1 |
| IdentityIdFactory | TokenFactory | 管理Token identity | 业务逻辑 | 监管 | 1 |
| IdentityGateway | Owner | 管理identity | 业务逻辑 | 监管 | 1 |
| Identity | manageKey (1) | 最高权限，管理key，执行，管理claim | 业务逻辑 | 后端 | n |
| Identity | actionKey (2) | 执行权限，approve某些行为 | 业务逻辑 | 后端 | n |
| Identity | claimKey (3) | 执行权限，只能管理Claim | 业务逻辑 | 后端 | n |
