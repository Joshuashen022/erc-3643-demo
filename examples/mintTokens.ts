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
 * 主函数：执行 mint 操作
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

  // 设置 mint 参数
  // 注意：测试代码中使用的是原始数量（不是 wei），因为合约通常使用最小单位
  const mintToAddress = process.env.MINT_TO_ADDRESS || wallet.address;
  const amountStr = process.env.MINT_AMOUNT || "10000000";
  
  // 检查是否使用 wei 单位（如果环境变量包含 "wei" 后缀或指定了 USE_WEI=true）
  // 默认使用原始数量，与测试代码保持一致
  const useWei = process.env.USE_WEI === "true";
  const amountWei = useWei 
    ? ethers.parseUnits(amountStr, 18)
    : BigInt(amountStr);

  console.log(`\n=== 开始 Mint 操作 ===`);
  console.log(`接收地址: ${mintToAddress}`);
  console.log(`Mint 数量: ${amountStr}${useWei ? " tokens" : ""} (${amountWei} wei)`);

  // 步骤 1: 检查地址是否已注册
  await ensureAddressIsRegistered(
    identityRegistry,
    mintToAddress,
    identityAddress,
    countryCode,
    sendTransaction
  );
    
  // 获取 mint 前的余额和总供应量
  const balanceBefore = await token.balanceOf(mintToAddress);
  const totalSupplyBefore = await token.totalSupply();
    
  console.log(`Mint 前余额: ${ethers.formatEther(balanceBefore)}`);
  console.log(`Mint 前总供应量: ${ethers.formatEther(totalSupplyBefore)}`);

  // 步骤 2: 执行 mint 操作
  console.log("\n--- 执行 Mint 操作 ---");
  await sendTransaction(
    token,
    "mint",
    [mintToAddress, amountWei],
    "Mint"
  );
  console.log("\n=== Mint 操作完成 ===");

  // 步骤 3: 验证 Mint 结果
  console.log("\n--- 验证 Mint 结果 ---");
  const balanceAfter = await token.balanceOf(mintToAddress);
  const totalSupplyAfter = await token.totalSupply();

  console.log(`Mint 后余额: ${ethers.formatEther(balanceAfter)}`);
  console.log(`Mint 后总供应量: ${ethers.formatEther(totalSupplyAfter)}`);

  // 验证余额和总供应量
  const expectedBalance = balanceBefore + amountWei;
  const expectedTotalSupplyMint = totalSupplyBefore + amountWei;

  if (balanceAfter === expectedBalance && totalSupplyAfter === expectedTotalSupplyMint) {
    console.log("✓ Mint 操作成功！");
    console.log(`余额验证通过: ${ethers.formatEther(balanceAfter)} === ${ethers.formatEther(expectedBalance)}`);
    console.log(`总供应量验证通过: ${ethers.formatEther(totalSupplyAfter)} === ${ethers.formatEther(expectedTotalSupplyMint)}`);
  } else {
    throw new Error(
      `Mint 验证失败: 余额 ${ethers.formatEther(balanceAfter)} != ${ethers.formatEther(expectedBalance)} 或 ` +
      `总供应量 ${ethers.formatEther(totalSupplyAfter)} != ${ethers.formatEther(expectedTotalSupplyMint)}`
    );
  }

  // 步骤 4: 执行 burn 操作
  console.log("\n--- 执行 Burn 操作 ---");
  await sendTransaction(
    token,
    "burn",
    [mintToAddress, amountWei],
    "Burn"
  );
  console.log("\n=== Burn 操作完成 ===");

  // 步骤 5: 验证 Burn 结果
  console.log("\n--- 验证 Burn 结果 ---");
  const balanceAfterBurn = await token.balanceOf(mintToAddress);
  const totalSupplyAfterBurn = await token.totalSupply();

  console.log(`Burn 后余额: ${ethers.formatEther(balanceAfterBurn)}`);
  console.log(`Burn 后总供应量: ${ethers.formatEther(totalSupplyAfterBurn)}`);

  // 验证余额和总供应量（Burn 后应该恢复到 Mint 前的状态）
  const expectedBalanceBurn = balanceBefore;
  const expectedTotalSupplyBurn = totalSupplyBefore;

  if (balanceAfterBurn === expectedBalanceBurn && totalSupplyAfterBurn === expectedTotalSupplyBurn) {
    console.log("✓ Burn 操作成功！");
    console.log(`余额验证通过: ${ethers.formatEther(balanceAfterBurn)} === ${ethers.formatEther(expectedBalanceBurn)}`);
    console.log(`总供应量验证通过: ${ethers.formatEther(totalSupplyAfterBurn)} === ${ethers.formatEther(expectedTotalSupplyBurn)}`);
  } else {
    throw new Error(
      `Burn 验证失败: 余额 ${ethers.formatEther(balanceAfterBurn)} != ${ethers.formatEther(expectedBalanceBurn)} 或 ` +
      `总供应量 ${ethers.formatEther(totalSupplyAfterBurn)} != ${ethers.formatEther(expectedTotalSupplyBurn)}`
    );
  }
  // ============ Transfer 操作 ============
  const transferToAddress = process.env.TRANSFER_TO_ADDRESS || "0x1111111111111111111111111111111111111111";
  const transferAmountStr = process.env.TRANSFER_AMOUNT || amountStr;
  const transferAmountWei = useWei 
    ? ethers.parseUnits(transferAmountStr, 18)
    : BigInt(transferAmountStr);

  console.log(`\n=== 开始 Transfer 操作 ===`);
  console.log(`发送地址: ${mintToAddress}`);
  console.log(`接收地址: ${transferToAddress}`);
  console.log(`Transfer 数量: ${transferAmountStr}${useWei ? " tokens" : ""} (${transferAmountWei} wei)`);

  // 步骤 1: 确保接收地址已注册
  await ensureAddressIsRegistered(
    identityRegistry,
    transferToAddress,
    identityAddress,
    countryCode,
    sendTransaction
  );

  // 步骤 2: 确保发送地址有足够的余额（如果没有，先 mint）
  const balanceBeforeTransfer = await token.balanceOf(mintToAddress);
  if (balanceBeforeTransfer < transferAmountWei) {
    console.log(`发送地址余额不足，需要先 mint 更多代币`);
    const additionalAmount = transferAmountWei - balanceBeforeTransfer;
    await sendTransaction(
      token,
      "mint",
      [mintToAddress, additionalAmount],
      "Mint (为 Transfer 准备)"
    );
  }

  // 步骤 3: 获取 Transfer 前的余额
  const fromBalanceBefore = await token.balanceOf(mintToAddress);
  const toBalanceBefore = await token.balanceOf(transferToAddress);
  const totalSupplyBeforeTransfer = await token.totalSupply();

  console.log(`Transfer 前发送地址余额: ${ethers.formatEther(fromBalanceBefore)}`);
  console.log(`Transfer 前接收地址余额: ${ethers.formatEther(toBalanceBefore)}`);
  console.log(`Transfer 前总供应量: ${ethers.formatEther(totalSupplyBeforeTransfer)}`);

  // 步骤 4: 执行 Transfer 操作（需要从发送地址签名）
  console.log("\n--- 执行 Transfer 操作 ---");
  
  // 创建从发送地址签名的 wallet（如果发送地址不是当前 wallet）
  let transferWallet = wallet;
  if (mintToAddress.toLowerCase() !== wallet.address.toLowerCase()) {
    // 如果发送地址不是当前 wallet，需要使用发送地址的私钥
    // 这里假设使用环境变量 TRANSFER_FROM_PRIVATE_KEY，否则使用当前 wallet
    const transferFromPrivateKey = process.env.TRANSFER_FROM_PRIVATE_KEY || privateKey;
    transferWallet = new ethers.Wallet(transferFromPrivateKey, provider);
  }
  
  const tokenWithTransferWallet = new ethers.Contract(
    tokenAddress,
    tokenABI.length > 0 ? tokenABI : [
      "function transfer(address _to, uint256 _amount) external returns (bool)",
    ],
    transferWallet
  );

  await sendTransaction(
    tokenWithTransferWallet,
    "transfer",
    [transferToAddress, transferAmountWei],
    "Transfer"
  );
  console.log("\n=== Transfer 操作完成 ===");

  // 步骤 5: 验证 Transfer 结果
  console.log("\n--- 验证 Transfer 结果 ---");
  const fromBalanceAfter = await token.balanceOf(mintToAddress);
  const toBalanceAfter = await token.balanceOf(transferToAddress);
  const totalSupplyAfterTransfer = await token.totalSupply();

  console.log(`Transfer 后发送地址余额: ${ethers.formatEther(fromBalanceAfter)}`);
  console.log(`Transfer 后接收地址余额: ${ethers.formatEther(toBalanceAfter)}`);
  console.log(`Transfer 后总供应量: ${ethers.formatEther(totalSupplyAfterTransfer)}`);

  // 验证余额变化
  const expectedFromBalance = fromBalanceBefore - transferAmountWei;
  const expectedToBalance = toBalanceBefore + transferAmountWei;
  const expectedTotalSupplyTransfer = totalSupplyBeforeTransfer; // Transfer 不改变总供应量

  if (fromBalanceAfter === expectedFromBalance && 
      toBalanceAfter === expectedToBalance && 
      totalSupplyAfterTransfer === expectedTotalSupplyTransfer) {
    console.log("✓ Transfer 操作成功！");
    console.log(`发送地址余额验证通过: ${ethers.formatEther(fromBalanceAfter)} === ${ethers.formatEther(expectedFromBalance)}`);
    console.log(`接收地址余额验证通过: ${ethers.formatEther(toBalanceAfter)} === ${ethers.formatEther(expectedToBalance)}`);
    console.log(`总供应量验证通过: ${ethers.formatEther(totalSupplyAfterTransfer)} === ${ethers.formatEther(expectedTotalSupplyTransfer)}`);
  } else {
    throw new Error(
      `Transfer 验证失败: 发送地址余额 ${ethers.formatEther(fromBalanceAfter)} != ${ethers.formatEther(expectedFromBalance)} 或 ` +
      `接收地址余额 ${ethers.formatEther(toBalanceAfter)} != ${ethers.formatEther(expectedToBalance)} 或 ` +
      `总供应量 ${ethers.formatEther(totalSupplyAfterTransfer)} != ${ethers.formatEther(expectedTotalSupplyTransfer)}`
    );
  }

  // ============ TransferFrom 操作 ============
  const transferFromAddress = process.env.TRANSFER_FROM_ADDRESS || mintToAddress;
  const transferFromToAddress = process.env.TRANSFER_FROM_TO_ADDRESS || transferToAddress;
  const spenderAddress = process.env.SPENDER_ADDRESS || "0x3333333333333333333333333333333333333333";
  const transferFromAmountStr = process.env.TRANSFER_FROM_AMOUNT || transferAmountStr;
  const transferFromAmountWei = useWei 
    ? ethers.parseUnits(transferFromAmountStr, 18)
    : BigInt(transferFromAmountStr);
  const allowanceAmountStr = process.env.ALLOWANCE_AMOUNT || (BigInt(transferFromAmountStr) * BigInt(2)).toString();
  const allowanceAmountWei = useWei 
    ? ethers.parseUnits(allowanceAmountStr, 18)
    : BigInt(allowanceAmountStr);

  console.log(`\n=== 开始 TransferFrom 操作 ===`);
  console.log(`发送地址 (from): ${transferFromAddress}`);
  console.log(`接收地址 (to): ${transferFromToAddress}`);
  console.log(`授权地址 (spender): ${spenderAddress}`);
  console.log(`TransferFrom 数量: ${transferFromAmountStr}${useWei ? " tokens" : ""} (${transferFromAmountWei} wei)`);
  console.log(`授权数量: ${allowanceAmountStr}${useWei ? " tokens" : ""} (${allowanceAmountWei} wei)`);

  // 步骤 1: 确保所有地址都已注册
  await ensureAddressIsRegistered(
    identityRegistry,
    transferFromAddress,
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
    spenderAddress,
    identityAddress,
    countryCode,
    sendTransaction
  );

  // 步骤 2: 确保发送地址有足够的余额（如果没有，先 mint）
  const balanceBeforeTransferFrom = await token.balanceOf(transferFromAddress);
  if (balanceBeforeTransferFrom < transferFromAmountWei) {
    console.log(`发送地址余额不足，需要先 mint 更多代币`);
    const additionalAmount = transferFromAmountWei - balanceBeforeTransferFrom;
    await sendTransaction(
      token,
      "mint",
      [transferFromAddress, additionalAmount],
      "Mint (为 TransferFrom 准备)"
    );
  }

  // 步骤 3: 获取 TransferFrom 前的余额和授权
  const fromBalanceBeforeTransferFrom = await token.balanceOf(transferFromAddress);
  const toBalanceBeforeTransferFrom = await token.balanceOf(transferFromToAddress);
  const allowanceBefore = await token.allowance(transferFromAddress, spenderAddress);
  const totalSupplyBeforeTransferFrom = await token.totalSupply();

  console.log(`TransferFrom 前发送地址余额: ${ethers.formatEther(fromBalanceBeforeTransferFrom)}`);
  console.log(`TransferFrom 前接收地址余额: ${ethers.formatEther(toBalanceBeforeTransferFrom)}`);
  console.log(`TransferFrom 前授权额度: ${ethers.formatEther(allowanceBefore)}`);
  console.log(`TransferFrom 前总供应量: ${ethers.formatEther(totalSupplyBeforeTransferFrom)}`);

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

