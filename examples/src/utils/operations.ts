import { ethers } from "ethers";
import { ContractConfig } from "./contracts.js";
import { sendTransaction } from "./transactions.js";
import rwaIdentityABI from "../../../out/Identity.sol/RWAIdentity.json";

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
  fromSigner?: ethers.Signer,
  rpcUrl?: string
): Promise<ethers.ContractTransactionReceipt> {
  console.log(`\n--- 执行 Approve 操作 ---`);
  console.log(`授权地址: ${spenderAddress}`);
  console.log(`授权数量: ${ethers.formatEther(amount)} tokens (${amount} wei)`);
  
  const signer = fromSigner || config.signer;
  const token = config.token.connect(signer) as ethers.Contract;
  
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
  fromSigner?: ethers.Signer,
  rpcUrl?: string
): Promise<ethers.ContractTransactionReceipt> {
  console.log(`\n--- 执行 Transfer 操作 ---`);
  console.log(`接收地址: ${toAddress}`);
  console.log(`Transfer 数量: ${ethers.formatEther(amount)} tokens (${amount} wei)`);
  
  const signer = fromSigner || config.signer;
  const token = config.token.connect(signer) as ethers.Contract;
  
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

/**
 * 创建新身份的结果接口
 */
export interface CreateNewIdentityResult {
  newManagementKey: string;
  newManagementKeyPrivateKey: string;
  newIdentityAddress: string;
  newManagementKeyWallet: ethers.HDNodeWallet | ethers.Wallet;
  identitySalt: string;
}

/**
 * 注册结果接口
 */
export interface RegisterNewIdentityResult {
  success: boolean;
  messages: string[];
  errors: string[];
  newManagementKey?: string;
  newManagementKeyPrivateKey?: string;
  newIdentityAddress?: string;
  countryCode?: number;
}

/**
 * 注册新身份
 * 接收已创建的身份信息，添加 claims 并注册到 Identity Registry
 * 参考 validateDeployment 的结构，将所有注册逻辑提取到单独的函数中
 */
export async function registerNewIdentity(
  config: ContractConfig,
  newIdentitySigner: ethers.Signer,
  countryCode: number = 840,
  identitySalt: string,
  rpcUrl?: string
): Promise<RegisterNewIdentityResult> {
  const result: RegisterNewIdentityResult = {
    success: true,
    messages: [],
    errors: [],
  };

  try {
    result.messages.push("\n=== 开始注册新身份 ===");

    const newManagementKey = await newIdentitySigner.getAddress();
    
    // 检查地址是否已经注册
    if (await config.identityRegistry.isVerified(newManagementKey)) {
      result.success = false;
      result.errors.push(`Error: 地址 ${newManagementKey} 已经注册`);
      return result;
    }
    
    // 使用 staticCall 预测身份地址
    const createIdentityResult = await (config.identityIdFactory as any).createIdentity.staticCall(newManagementKey, identitySalt);
    const newIdentityAddress = ethers.getAddress(String(createIdentityResult));
  

    // 执行创建身份交易
    await sendTransaction(
      config.identityIdFactory,
      "createIdentity",
      [newManagementKey, identitySalt],
      "创建身份",
      config.provider,
      rpcUrl
    );

    
    // 获取 claimIssuer 地址和私钥（使用 createContractConfig 返回的配置）
    result.messages.push("\n--- 获取 ClaimIssuer 信息 ---");
    const claimSchemeEcdsa = 1;
    
    const newIdentity = new ethers.Contract(
      newIdentityAddress,
      rwaIdentityABI.abi.length > 0 ? rwaIdentityABI.abi : [
        "function addClaim(uint256 _topic, uint256 _scheme, address _issuer, bytes memory _signature, bytes memory _data, string memory _uri) external"
      ],
      newIdentitySigner
    );
    
    // 遍历所有 claim issuers，对每个 issuer 支持的所有 topics 都签名并添加 claim
    for (let i = 0; i < config.config.claimIssuers.length; i++) {
      const claimIssuerKey = `claimIssuer${i}_claimIssuer` as keyof typeof config.deploymentResults;
      const claimIssuerAddressValue = config.deploymentResults[claimIssuerKey];
      if (!claimIssuerAddressValue || typeof claimIssuerAddressValue !== 'string') {
        result.messages.push(`跳过 Claim Issuer ${i}：未找到地址`);
        continue;
      }
      
      const claimIssuerAddress = ethers.getAddress(claimIssuerAddressValue);
      const claimIssuerPrivateKey = config.config.claimIssuers[i].privateKey;
      const claimIssuerWallet = new ethers.Wallet(claimIssuerPrivateKey, config.provider);
      const claimTopics = config.config.claimIssuers[i].claimTopics || [];
      
      result.messages.push(`\n处理 Claim Issuer ${i}`);
      result.messages.push(`ClaimIssuer 地址: ${claimIssuerAddress}`);
      result.messages.push(`ClaimIssuer 钱包地址: ${claimIssuerWallet.address}`);
      result.messages.push(`支持的 Topics: ${claimTopics.join(', ')}`);
      
      // 对该 issuer 支持的所有 topics 都执行签名和添加 claim
      for (const claimTopic of claimTopics) {
        result.messages.push(`\n--- 为 topic ${claimTopic} 创建并签名 claim ---`);
        const data = "0x";
        
        // 使用独立的签名函数
        const sigBytes = await signClaim(
          newIdentityAddress,
          claimTopic,
          claimIssuerWallet,
          data
        );
        
        // 添加 claim 到新身份（使用 newManagementKey 的 wallet）
        result.messages.push(`\n--- 添加 topic ${claimTopic} 的 claim 到新身份 ---`);
        try {
          await sendTransaction(
            newIdentity,
            "addClaim",
            [claimTopic, claimSchemeEcdsa, claimIssuerAddress, sigBytes, data, ""],
            `添加 topic ${claimTopic} 的 claim`,
            config.provider,
            rpcUrl
          );
          result.messages.push(`✓ Topic ${claimTopic} 的 Claim 已添加到新身份`);
        } catch (error: any) {
          result.success = false;
          result.errors.push(`添加 topic ${claimTopic} 的 claim 失败: ${error.message}`);
          return result;
        }
      }
    }
    
    // 注册新身份到 Identity Registry
    result.messages.push("\n--- 注册新身份到 Identity Registry ---");
    
    try {
      await registerIdentity(config, newManagementKey, newIdentityAddress, countryCode, rpcUrl);
      result.messages.push("✓ 身份已注册到 Identity Registry");
      result.countryCode = countryCode;
    } catch (error: any) {
      result.success = false;
      result.errors.push(`注册身份失败: ${error.message}`);
      return result;
    }
    
    // 验证身份是否已注册
    result.messages.push("\n--- 验证身份注册状态 ---");
    try {
      const isVerified = await config.identityRegistry.isVerified(newManagementKey);
      if (isVerified) {
        result.messages.push("✓ 身份验证成功！");
        result.messages.push(`用户地址: ${newManagementKey}`);
        result.messages.push(`身份合约地址: ${newIdentityAddress}`);
      } else {
        result.success = false;
        result.errors.push("身份验证失败");
        return result;
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(`验证身份失败: ${error.message}`);
      return result;
    }

    result.messages.push("\n=== 注册新身份完成 ===");
    result.messages.push(`新管理密钥地址: ${newManagementKey}`);
    result.messages.push(`新身份合约地址: ${newIdentityAddress}`);
    result.messages.push(`国家代码: ${countryCode}`);

  } catch (error: any) {
    result.success = false;
    result.errors.push(`注册新身份过程出错: ${error.message}`);
  }

  return result;
}

