import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();
const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
const provider = new ethers.JsonRpcProvider(rpcUrl);
const countryCode = 840; // US country code

/**
 * 辅助函数：延迟
 */
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 从 Foundry 部署日志中读取合约地址
 */
function getContractAddresses(chainId: number): Record<string, string> {
  const broadcastPath = path.join(
    __dirname,
    `../broadcast/DeployERC3643.s.sol/${chainId}/run-latest.json`
  );

  if (!fs.existsSync(broadcastPath)) {
    console.error(`部署日志文件不存在: ${broadcastPath}`);
    console.log("请先运行部署脚本: forge script script/DeployERC3643.s.sol:DeployERC3643 --rpc-url http://127.0.0.1:8545 --private-key <key> --broadcast");
    process.exit(1);
  }

  const broadcastData = JSON.parse(fs.readFileSync(broadcastPath, "utf-8"));
  const addresses: Record<string, string> = {};

  // 从部署事务中提取合约地址
  for (const tx of broadcastData.transactions || []) {
    if (tx.contractName && tx.contractAddress) {
      addresses[tx.contractName] = tx.contractAddress;
    }
  }

  return addresses;
}

/**
 * 从编译输出中读取 ABI
 */
function getContractABI(contractName: string): any[] {
  // 尝试从 out 目录读取 ABI
  const possiblePaths = [
    path.join(__dirname, `../out/${contractName}.sol/${contractName}.json`),
  ];

  // fix for different contract names in out directory
  if (contractName === "RWATrustedIssuersRegistry") {
    possiblePaths.push(path.join(__dirname, `../out/IdentityRegistry.sol/RWATrustedIssuersRegistry.json`));
  }
  if (contractName === "RWAClaimTopicsRegistry") {
    possiblePaths.push(path.join(__dirname, `../out/IdentityRegistry.sol/RWAClaimTopicsRegistry.json`));
  }
  if (contractName === "RWAIdentity") {
    possiblePaths.push(path.join(__dirname, `../out/Identity.sol/RWAIdentity.json`));
  }
  if (contractName === "RWAIdentityRegistry") {
    possiblePaths.push(path.join(__dirname, `../out/IdentityRegistry.sol/RWAIdentityRegistry.json`));
  }

  for (const abiPath of possiblePaths) {
    if (fs.existsSync(abiPath)) {
      const contractData = JSON.parse(fs.readFileSync(abiPath, "utf-8"));
      return contractData.abi || [];
    }
  }

  console.warn(`未找到 ${contractName} 的 ABI，使用空数组`);
  return [];
}

/**
 * 初始化合约和配置
 */
interface ContractSetup {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Wallet;
  suiteOwner: string;
  salt: string;
  tokenAddress: string;
  token: ethers.Contract;
  tokenABI: any[];
  identityRegistryAddress: string;
  identityRegistry: ethers.Contract;
  identityIdFactoryAddress: string;
  identityIdFactory: ethers.Contract;
  managementKey: string;
  identityAddress: string;
  privateKey: string;
}

async function initializeContracts(): Promise<ContractSetup> {
  // 连接到本地节点（Anvil）

  console.log(`连接到 RPC: ${rpcUrl}`);

  // 获取网络信息
  const network = await provider.getNetwork();
  console.log(`网络: ${network.name} (Chain ID: ${network.chainId})`);

  // 读取合约地址
  const addresses = getContractAddresses(Number(network.chainId));

  // 获取私钥（用于签名交易）
  const privateKey = process.env.PRIVATE_KEY || process.env.CLAIM_KEY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("请设置 PRIVATE_KEY 或 CLAIM_KEY_PRIVATE_KEY 环境变量");
  }
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`使用钱包地址: ${wallet.address}`);

  // 获取 suiteOwner（部署者地址）
  const suiteOwnerRaw = process.env.SUITE_OWNER || wallet.address;
  let suiteOwner: string;
  
  try {
    suiteOwner = ethers.getAddress(String(suiteOwnerRaw));
  } catch (error) {
    throw new Error(`Invalid suite owner address: ${suiteOwnerRaw}`);
  }

  console.log(`\n使用 Suite Owner: ${suiteOwner}`);

  // 从 TREXFactory 获取 token 地址
  const salt = process.env.SALT || "trex-suite-1";
  console.log(`\n使用 Salt: ${salt}`);
  
  const trexFactoryABI = getContractABI("TREXFactory");
  const trexFactoryAddress = ethers.getAddress(addresses["TREXFactory"]);
  const trexFactory = new ethers.Contract(
    trexFactoryAddress,
    trexFactoryABI.length > 0 ? trexFactoryABI : [
      "function getToken(string memory) view returns (address)",
    ],
    provider
  );

  let tokenAddress: string;
  try {
    const tokenAddressRaw = await trexFactory.getToken(salt);
    tokenAddress = ethers.getAddress(String(tokenAddressRaw));
  } catch (error) {
    throw new Error(`Failed to get token address: ${error}`);
  }
  
  console.log(`Token address: ${tokenAddress}`);

  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Token address is zero - token may not be deployed with this salt");
  }

  // 获取 Token 合约
  const tokenABI = getContractABI("RWAToken");
  const token = new ethers.Contract(
    tokenAddress,
    tokenABI.length > 0 ? tokenABI : [
      "function identityRegistry() view returns (address)",
      "function mint(address _to, uint256 _amount) external",
      "function burn(address _userAddress, uint256 _amount) external",
      "function balanceOf(address) view returns (uint256)",
      "function totalSupply() view returns (uint256)",
      "function transfer(address _to, uint256 _amount) external returns (bool)",
      "function transferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
      "function approve(address _spender, uint256 _amount) external returns (bool)",
      "function allowance(address _owner, address _spender) external view returns (uint256)",
    ],
    wallet
  );

  // 获取 IdentityRegistry 地址
  let identityRegistryAddress: string;
  try {
    identityRegistryAddress = ethers.getAddress(String(await token.identityRegistry()));
  } catch (error) {
    throw new Error(`Failed to get identity registry address: ${error}`);
  }

  console.log(`Identity Registry address: ${identityRegistryAddress}`);

  // 获取 IdentityRegistry 合约
  const identityRegistryABI = getContractABI("RWAIdentityRegistry");
  const identityRegistry = new ethers.Contract(
    identityRegistryAddress,
    identityRegistryABI.length > 0 ? identityRegistryABI : [
      "function registerIdentity(address _userAddress, address _identity, uint16 _country) external",
      "function isVerified(address _userAddress) external view returns (bool)",
    ],
    wallet
  );

  // 获取 Identity 地址
  // 从环境变量或部署日志中获取 identity 地址
  const managementKey = process.env.MANAGEMENT_KEY || wallet.address;
  const identityIdFactoryAddress = process.env.IDENTITY_ID_FACTORY || addresses["RWAIdentityIdFactory"];
  
  if (!identityIdFactoryAddress) {
    throw new Error("请设置 IDENTITY_ID_FACTORY 环境变量或确保 IdFactory 在部署日志中");
  }

  const idFactoryABI = getContractABI("RWAIdentityIdFactory");
  const identityIdFactory = new ethers.Contract(
    ethers.getAddress(identityIdFactoryAddress),
    idFactoryABI.length > 0 ? idFactoryABI : [
      "function getIdentity(address _wallet) view returns (address)",
    ],
    provider
  );

  let identityAddress: string;
  try {
    // 尝试从 factory 获取 identity（使用 managementKey）
    identityAddress = ethers.getAddress(String(await identityIdFactory.getIdentity(managementKey)));
  } catch (error) {
    throw new Error(`Failed to get identity address: ${error}`);
  }

  if (identityAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Identity address is zero - identity may not be deployed");
  }

  console.log(`Identity address: ${identityAddress}`);

  return {
    provider,
    wallet,
    suiteOwner,
    salt,
    tokenAddress,
    token,
    tokenABI,
    identityRegistryAddress,
    identityRegistry,
    identityIdFactoryAddress,
    identityIdFactory,
    managementKey,
    identityAddress,
    privateKey,
  };
}

/**
 * 主函数：执行 TransferFrom 操作
 */
async function main() {
  // 初始化合约和配置
  const {
    provider,
    wallet,
    suiteOwner,
    salt,
    tokenAddress,
    token,
    tokenABI,
    identityRegistryAddress,
    identityRegistry,
    identityIdFactoryAddress,
    identityIdFactory,
    managementKey,
    identityAddress,
    privateKey,
  } = await initializeContracts();

  /**
   * 发送交易并处理错误
   */
  async function sendTransaction(
    contract: ethers.Contract,
    methodName: string,
    args: any[],
    operationName: string
  ): Promise<ethers.ContractTransactionReceipt> {
    try {
      // 执行交易
      const tx = await contract[methodName](...args,{
        gasLimit: 1000000,
      });
      console.log(`${operationName} 交易哈希: ${tx.hash}`);
      if (rpcUrl === "http://127.0.0.1:8545") {
        await provider.send("evm_mine", []);
        await provider.send("evm_mine", []);
      }
      const receipt = await tx.wait(2);
      console.log(`交易确认，区块号: ${receipt?.blockNumber}`);
      
      // await sleep(10000);
      return receipt!;
    } catch (error: any) {
      throw new Error(`${operationName} 操作失败: ${error.message}`);
    }
  }

  /**
   * 检查地址是否已注册，如果未注册则进行注册
   */
  async function ensureAddressIsRegistered(
    identityRegistry: ethers.Contract,
    toAddress: string,
    identityAddress: string,
    countryCode: number,
    sendTransaction: (
      contract: ethers.Contract,
      methodName: string,
      args: any[],
      operationName: string
    ) => Promise<ethers.ContractTransactionReceipt>
  ): Promise<void> {
    console.log("\n--- 检查地址是否已注册 ---");
    let isVerified: boolean;
    try {
      isVerified = await identityRegistry.isVerified(toAddress);
    } catch (error: any) {
      throw new Error(`检查验证状态失败: ${error.message}`);
    }

    if (!isVerified) {
      console.log(`地址 ${toAddress} 未注册，正在注册...`);
      
      // 注册身份
      await sendTransaction(
        identityRegistry,
        "registerIdentity",
        [toAddress, identityAddress, countryCode],
        "注册身份"
      );

      // 验证注册是否成功
      isVerified = await identityRegistry.isVerified(toAddress);
      if (!isVerified) {
        throw new Error("身份注册失败");
      }
      console.log("✓ 身份注册成功");
    } else {
      console.log("✓ 地址已注册");
    }
  }

  // ============ TransferFrom 操作 ============
  // 设置 TransferFrom 参数
  const transferFromPrivateKey = process.env.TRANSFER_FROM_PRIVATE_KEY || privateKey;
  const transferFromToAddress = process.env.TRANSFER_FROM_TO_ADDRESS || "0x1111111111111111111111111111111111111111";
  const spenderPrivateKey = process.env.SPENDER_PRIVATE_KEY || "";
  const transferFromAmountStr = process.env.TRANSFER_FROM_AMOUNT || "10000000";
  if (!spenderPrivateKey) {
    throw new Error("请设置 SPENDER_PRIVATE_KEY 环境变量");
  }
  // 创建从 spender 地址签名的 wallet
  const spenderWallet = new ethers.Wallet(spenderPrivateKey, provider);
  const transferFromWallet = new ethers.Wallet(transferFromPrivateKey, provider);
  
  // 检查是否使用 wei 单位
  const useWei = process.env.USE_WEI === "true";
  const transferFromAmountWei = useWei 
    ? ethers.parseUnits(transferFromAmountStr, 18)
    : BigInt(transferFromAmountStr);
  const allowanceAmountStr = process.env.ALLOWANCE_AMOUNT || (BigInt(transferFromAmountStr) * BigInt(2)).toString();
  const allowanceAmountWei = useWei 
    ? ethers.parseUnits(allowanceAmountStr, 18)
    : BigInt(allowanceAmountStr);

  console.log(`\n=== 开始 TransferFrom 操作 ===`);
  console.log(`发送地址 (from): ${transferFromWallet.address}, balance: ${await provider.getBalance(transferFromWallet.address)}`);
  console.log(`授权地址 (spender): ${spenderWallet.address}, balance: ${await provider.getBalance(spenderWallet.address)}`);
  console.log(`接收地址 (to): ${transferFromToAddress}`);
  console.log(`TransferFrom 数量: ${transferFromAmountStr}${useWei ? " tokens" : ""} (${transferFromAmountWei} wei)`);
  console.log(`授权数量: ${allowanceAmountStr}${useWei ? " tokens" : ""} (${allowanceAmountWei} wei)`);

  // 步骤 1: 确保所有地址都已注册
  await ensureAddressIsRegistered(
    identityRegistry,
    transferFromWallet.address,
    identityAddress,
    countryCode,
    sendTransaction
  );
  await ensureAddressIsRegistered(
    identityRegistry,
    transferFromToAddress,
    identityAddress,
    countryCode,
    sendTransaction
  );
  await ensureAddressIsRegistered(
    identityRegistry,
    spenderWallet.address,
    identityAddress,
    countryCode,
    sendTransaction
  );

  // 步骤 2: 确保发送地址有足够的余额（如果没有，先 mint）
  const balanceBeforeTransferFrom = await token.balanceOf(transferFromWallet.address);
  if (balanceBeforeTransferFrom < transferFromAmountWei) {
    console.log(`发送地址余额不足，需要先 mint 更多代币`);
    const additionalAmount = transferFromAmountWei - balanceBeforeTransferFrom;
    await sendTransaction(
      token,
      "mint",
      [transferFromWallet.address, additionalAmount],
      "Mint (为 TransferFrom 准备)"
    );
  }

  // 步骤 3: 获取 TransferFrom 前的余额和授权
  const fromBalanceBeforeTransferFrom = await token.balanceOf(transferFromWallet.address);
  const toBalanceBeforeTransferFrom = await token.balanceOf(transferFromToAddress);
  const allowanceBefore = await token.allowance(transferFromWallet.address, spenderWallet.address);
  const totalSupplyBeforeTransferFrom = await token.totalSupply();

  console.log(`TransferFrom 前发送地址余额: ${ethers.formatEther(fromBalanceBeforeTransferFrom)}`);
  console.log(`TransferFrom 前接收地址余额: ${ethers.formatEther(toBalanceBeforeTransferFrom)}`);
  console.log(`TransferFrom 前授权额度: ${ethers.formatEther(allowanceBefore)}`);
  console.log(`TransferFrom 前总供应量: ${ethers.formatEther(totalSupplyBeforeTransferFrom)}`);

  // 步骤 4: 从发送地址批准 spender
  console.log("\n--- 执行 Approve 操作 ---");
  
  const tokenWithApproveWallet = new ethers.Contract(
    tokenAddress,
    tokenABI.length > 0 ? tokenABI : [
      "function approve(address _spender, uint256 _amount) external returns (bool)",
    ],
    transferFromWallet
  );

  await sendTransaction(
    tokenWithApproveWallet,
    "approve",
    [spenderWallet.address, transferFromAmountWei + 10000n],
    "Approve"
  );
  console.log("\n=== Approve 操作完成 ===");

  // 步骤 5: 从 spender 执行 TransferFrom 操作
  console.log("\n--- 执行 TransferFrom 操作 ---");
  
  // 在执行 transferFrom 之前，再次检查 allowance 是否足够
  let allowanceBeforeTransferFromFinal = await token.allowance(transferFromWallet.address, spenderWallet.address);
  console.log(`TransferFrom 前实际授权额度: ${ethers.formatEther(allowanceBeforeTransferFromFinal)}`);
  console.log(`需要转移的数量: ${ethers.formatEther(transferFromAmountWei)}`);
  
  const tokenWithSpenderWallet = new ethers.Contract(
    tokenAddress,
    tokenABI.length > 0 ? tokenABI : [
      "function transferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
    ],
    spenderWallet
  );
  console.log("transferFromAddress", transferFromWallet.address);
  console.log("transferFromToAddress", transferFromToAddress);
  console.log("transferFromAmountWei", transferFromAmountWei);
  console.log("allowanceBeforeTransferFromFinal", 
    await tokenWithSpenderWallet.allowance(transferFromWallet.address, spenderWallet.address)
  );
  await sendTransaction(
    tokenWithSpenderWallet,
    "transferFrom",
    [transferFromWallet.address, transferFromToAddress, transferFromAmountWei],
    "TransferFrom"
  );
  console.log("\n=== TransferFrom 操作完成 ===");

  // 步骤 6: 验证 TransferFrom 结果
  console.log("\n--- 验证 TransferFrom 结果 ---");
  const fromBalanceAfterTransferFrom = await token.balanceOf(transferFromWallet.address);
  const toBalanceAfterTransferFrom = await token.balanceOf(transferFromToAddress);
  const allowanceAfter = await token.allowance(transferFromWallet.address, spenderWallet.address);
  const totalSupplyAfterTransferFrom = await token.totalSupply();

  console.log(`TransferFrom 后发送地址余额: ${ethers.formatEther(fromBalanceAfterTransferFrom)}`);
  console.log(`TransferFrom 后接收地址余额: ${ethers.formatEther(toBalanceAfterTransferFrom)}`);
  console.log(`TransferFrom 后授权额度: ${ethers.formatEther(allowanceAfter)}`);
  console.log(`TransferFrom 后总供应量: ${ethers.formatEther(totalSupplyAfterTransferFrom)}`);

  // 验证余额和授权变化
  const expectedFromBalanceTransferFrom = fromBalanceBeforeTransferFrom - transferFromAmountWei;
  const expectedToBalanceTransferFrom = toBalanceBeforeTransferFrom + transferFromAmountWei;
  // 计算期望的 allowance
  // 注意：如果 allowanceBeforeTransferFromFinal 是 MaxUint256，执行 transferFrom 后
  // 合约会尝试执行 MaxUint256 - amount，这会导致 underflow（在 Solidity 0.8+ 中）
  // 但实际上，如果合约没有正确处理这种情况，可能会导致 revert
  // 为了安全起见，我们检查实际的 allowanceAfter 值
  // 如果 allowanceBeforeTransferFromFinal 是 MaxUint256，我们期望它仍然是 MaxUint256（如果合约正确处理了）
  // 否则，期望值是 allowanceBeforeTransferFromFinal - transferFromAmountWei
  const expectedAllowance = allowanceBeforeTransferFromFinal === ethers.MaxUint256 
    ? ethers.MaxUint256  // 如果之前是 MaxUint256，期望仍然是 MaxUint256（如果合约正确处理）
    : (allowanceBeforeTransferFromFinal >= transferFromAmountWei 
        ? allowanceBeforeTransferFromFinal - transferFromAmountWei 
        : 0n); // 如果 allowance 不足，期望为 0（但实际上这种情况不应该发生，因为我们已经在前面检查过了）
  const expectedTotalSupplyTransferFrom = totalSupplyBeforeTransferFrom; // TransferFrom 不改变总供应量

  if (fromBalanceAfterTransferFrom === expectedFromBalanceTransferFrom && 
      toBalanceAfterTransferFrom === expectedToBalanceTransferFrom && 
      allowanceAfter === expectedAllowance &&
      totalSupplyAfterTransferFrom === expectedTotalSupplyTransferFrom) {
    console.log("✓ TransferFrom 操作成功！");
    console.log(`发送地址余额验证通过: ${ethers.formatEther(fromBalanceAfterTransferFrom)} === ${ethers.formatEther(expectedFromBalanceTransferFrom)}`);
    console.log(`接收地址余额验证通过: ${ethers.formatEther(toBalanceAfterTransferFrom)} === ${ethers.formatEther(expectedToBalanceTransferFrom)}`);
    console.log(`授权额度验证通过: ${ethers.formatEther(allowanceAfter)} === ${ethers.formatEther(expectedAllowance)}`);
    console.log(`总供应量验证通过: ${ethers.formatEther(totalSupplyAfterTransferFrom)} === ${ethers.formatEther(expectedTotalSupplyTransferFrom)}`);
  } else {
    throw new Error(
      `TransferFrom 验证失败: 发送地址余额 ${ethers.formatEther(fromBalanceAfterTransferFrom)} != ${ethers.formatEther(expectedFromBalanceTransferFrom)} 或 ` +
      `接收地址余额 ${ethers.formatEther(toBalanceAfterTransferFrom)} != ${ethers.formatEther(expectedToBalanceTransferFrom)} 或 ` +
      `授权额度 ${ethers.formatEther(allowanceAfter)} != ${ethers.formatEther(expectedAllowance)} 或 ` +
      `总供应量 ${ethers.formatEther(totalSupplyAfterTransferFrom)} != ${ethers.formatEther(expectedTotalSupplyTransferFrom)}`
    );
  }
}

// 运行主函数
main()
  .then(() => {
    console.log("\n脚本执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("错误:", error);
    process.exit(1);
  });

