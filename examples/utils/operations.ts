import { ethers } from "ethers";
import { ContractConfig } from "./contracts";
import { sendTransaction } from "./transactions";

/**
 * 确保地址已注册
 */
export async function ensureAddressIsRegistered(
  config: ContractConfig,
  address: string,
  countryCode: number = 840,
  rpcUrl?: string
): Promise<void> {
  console.log(`\n--- 检查地址是否已注册: ${address} ---`);
  
  let isVerified: boolean;
  try {
    isVerified = await config.identityRegistry.isVerified(address);
  } catch (error: any) {
    throw new Error(`检查验证状态失败: ${error.message}`);
  }

  if (!isVerified) {
    console.log(`地址 ${address} 未注册，正在注册...`);
    
    await sendTransaction(
      config.identityRegistry,
      "registerIdentity",
      [address, config.identityAddress, countryCode],
      "注册身份",
      config.provider,
      rpcUrl
    );

    isVerified = await config.identityRegistry.isVerified(address);
    if (!isVerified) {
      throw new Error("身份注册失败");
    }
    console.log("✓ 身份注册成功");
  } else {
    console.log("✓ 地址已注册");
  }
}

/**
 * 注册身份
 */
export async function registerIdentity(
  config: ContractConfig,
  userAddress: string,
  identityAddress: string,
  countryCode: number = 840,
  rpcUrl?: string
): Promise<ethers.ContractTransactionReceipt> {
  return await sendTransaction(
    config.identityRegistry,
    "registerIdentity",
    [userAddress, identityAddress, countryCode],
    "注册身份",
    config.provider,
    rpcUrl
  );
}

/**
 * Mint 代币
 */
export async function mint(
  config: ContractConfig,
  toAddress: string,
  amount: bigint,
  rpcUrl?: string
): Promise<ethers.ContractTransactionReceipt> {
  console.log(`\n--- 执行 Mint 操作 ---`);
  console.log(`接收地址: ${toAddress}`);
  console.log(`Mint 数量: ${ethers.formatEther(amount)} tokens (${amount} wei)`);
  
  return await sendTransaction(
    config.token,
    "mint",
    [toAddress, amount],
    "Mint",
    config.provider,
    rpcUrl
  );
}

/**
 * Approve 授权
 */
export async function approve(
  config: ContractConfig,
  spenderAddress: string,
  amount: bigint,
  fromWallet?: ethers.Wallet,
  rpcUrl?: string
): Promise<ethers.ContractTransactionReceipt> {
  console.log(`\n--- 执行 Approve 操作 ---`);
  console.log(`授权地址: ${spenderAddress}`);
  console.log(`授权数量: ${ethers.formatEther(amount)} tokens (${amount} wei)`);
  
  const wallet = fromWallet || config.wallet;
  const token = new ethers.Contract(
    config.tokenAddress,
    config.tokenABI.length > 0 ? config.tokenABI : [
      "function approve(address _spender, uint256 _amount) external returns (bool)",
    ],
    wallet
  );
  
  return await sendTransaction(
    token,
    "approve",
    [spenderAddress, amount],
    "Approve",
    config.provider,
    rpcUrl
  );
}

/**
 * Transfer 转账
 */
export async function transfer(
  config: ContractConfig,
  toAddress: string,
  amount: bigint,
  fromWallet?: ethers.Wallet,
  rpcUrl?: string
): Promise<ethers.ContractTransactionReceipt> {
  console.log(`\n--- 执行 Transfer 操作 ---`);
  console.log(`接收地址: ${toAddress}`);
  console.log(`Transfer 数量: ${ethers.formatEther(amount)} tokens (${amount} wei)`);
  
  const wallet = fromWallet || config.wallet;
  const token = new ethers.Contract(
    config.tokenAddress,
    config.tokenABI.length > 0 ? config.tokenABI : [
      "function transfer(address _to, uint256 _amount) external returns (bool)",
    ],
    wallet
  );
  
  return await sendTransaction(
    token,
    "transfer",
    [toAddress, amount],
    "Transfer",
    config.provider,
    rpcUrl
  );
}

/**
 * TransferFrom 授权转账
 */
export async function transferFrom(
  config: ContractConfig,
  fromAddress: string,
  toAddress: string,
  amount: bigint,
  spenderWallet: ethers.Wallet,
  rpcUrl?: string
): Promise<ethers.ContractTransactionReceipt> {
  console.log(`\n--- 执行 TransferFrom 操作 ---`);
  console.log(`发送地址: ${fromAddress}`);
  console.log(`接收地址: ${toAddress}`);
  console.log(`TransferFrom 数量: ${ethers.formatEther(amount)} tokens (${amount} wei)`);
  
  const token = new ethers.Contract(
    config.tokenAddress,
    config.tokenABI.length > 0 ? config.tokenABI : [
      "function transferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
    ],
    spenderWallet
  );
  
  return await sendTransaction(
    token,
    "transferFrom",
    [fromAddress, toAddress, amount],
    "TransferFrom",
    config.provider,
    rpcUrl
  );
}

/**
 * 解析金额（支持 wei 或原始值）
 */
export function parseAmount(amountStr: string, useWei: boolean = false): bigint {
  return useWei 
    ? ethers.parseUnits(amountStr, 18)
    : BigInt(amountStr);
}

