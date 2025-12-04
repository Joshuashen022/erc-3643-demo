import { ethers } from "ethers";
import { ContractConfig } from "./contracts.js";
import { sendTransaction } from "./transactions.js";

/**
 * 确保地址已注册
 */
export async function ensureAddressIsRegistered(
  config: ContractConfig,
  address: string,
  countryCode: number = 840,
  rpcUrl?: string,
  identityAddress?: string
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
    
    // 如果没有提供 identityAddress，从 identityIdFactory 获取
    let identityAddr = identityAddress;
    if (!identityAddr) {
      try {
        identityAddr = await config.identityIdFactory.getIdentity(address);
        if (identityAddr === "0x0000000000000000000000000000000000000000") {
          throw new Error("Identity address is zero - identity may not be deployed");
        }
      } catch (error: any) {
        throw new Error(`Failed to get identity address: ${error.message}`);
      }
    }
    
    await sendTransaction(
      config.identityRegistry,
      "registerIdentity",
      [address, identityAddr, countryCode],
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
  const token = config.token.connect(wallet) as ethers.Contract;
  
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
  const token = config.token.connect(wallet) as ethers.Contract;
  
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
  
  const token = config.token.connect(spenderWallet) as ethers.Contract;
  
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

/**
 * 为 claim 创建签名
 * @param identityAddress 身份合约地址
 * @param claimTopic claim topic
 * @param data claim data (默认为 "0x")
 * @param claimIssuerWallet claim issuer 的钱包
 * @returns 签名后的 bytes
 */
export async function signClaim(
  identityAddress: string,
  claimTopic: number,
  claimIssuerWallet: ethers.Wallet,
  data: string = "0x"
): Promise<string> {
  // 创建 data hash
  const dataHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes"],
      [identityAddress, claimTopic, data]
    )
  );
  console.log(`Data Hash: ${dataHash}`);

  // 创建 prefixed hash
  const messagePrefix = "\x19Ethereum Signed Message:\n32";
  const prefixedHash = ethers.keccak256(
    ethers.concat([
      ethers.toUtf8Bytes(messagePrefix),
      ethers.getBytes(dataHash)
    ])
  );
  console.log(`Prefixed Hash: ${prefixedHash}`);

  // 使用 claimIssuer 的私钥签名
  const signature = await claimIssuerWallet.signingKey.sign(prefixedHash);
  const vByte = signature.v >= 27 ? signature.v - 27 : signature.v;
  const sigBytes = ethers.concat([
    signature.r,
    signature.s,
    new Uint8Array([vByte])
  ]);
  console.log(`签名: ${sigBytes} (长度: ${sigBytes.length} 字节)`);

  return sigBytes;
}

