## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
# simulate deployment
forge script script/DeployERC3643.s.sol:DeployERC3643

# test deployment shell
forge test ./test/script/DeployERC3643.t.sol

# simulate deployment with real chain data
FOUNDRY_PROFILE=localhost \
forge script script/DeployERC3643.s.sol:DeployERC3643 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# simulate and deploy
FOUNDRY_PROFILE=localhost \
forge script script/DeployERC3643.s.sol:DeployERC3643 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```


forge script script/DeployRWAIdentity.s.sol:DeployRWAIdentity --rpc-url <rpc> --private-key <key> --broadcast

## TypeScript 和 Ethers.js 支持

项目已配置 TypeScript 和 ethers.js，可以用于与部署的合约进行交互。

### 安装依赖

```shell
$ yarn install
```

### 运行 TypeScript 脚本

```shell
# 使用 ts-node 直接运行
$ yarn dev

# 或先编译再运行
$ yarn build
$ node dist/scripts/interact.js
```

### 环境配置

创建 `.env` 文件（可选）：

```env
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=your_private_key_here
```

### 使用示例

查看 `scripts/interact.ts` 了解如何使用 ethers.js 与合约交互的完整示例。

主要功能：
- 从 Foundry 部署日志中读取合约地址
- 读取合约 ABI
- 调用合约的只读方法
- 发送交易（需要私钥）

更多信息请参考 `scripts/README.md`。