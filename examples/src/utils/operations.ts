import { ethers } from "ethers";
import { ContractConfig } from "./contracts.js";
import { sendTransaction } from "./transactions.js";
import rwaIdentityABI from "../../../out/Identity.sol/RWAIdentity.json";
import { mockModuleArtifact } from "./contracts";

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

/**
 * Mint、Burn 和 Transfer 操作结果接口
 */
export interface MintAndBurnResult {
  success: boolean;
  messages: string[];
  errors: string[];
  mintReceipt?: ethers.ContractTransactionReceipt;
  burnReceipt?: ethers.ContractTransactionReceipt;
  transferReceipt?: ethers.ContractTransactionReceipt;
}

/**
 * 执行 Mint、Burn 和 Transfer 操作
 * 参考 validateDeployment 的结构，方便前端集成
 */
export async function mintAndBurn(
  _provider: ethers.JsonRpcProvider,
  contractConfig: ContractConfig,
  options: {
    mintAmount?: bigint;
    mintTo?: string;
    burnAmount?: bigint;
    burnFrom?: string;
    transferAmount?: bigint;
    transferTo?: string;
    transferFrom?: string;
    rpcUrl?: string;
    onProgress?: (update: Partial<MintAndBurnResult>) => void;
  } = {}
): Promise<MintAndBurnResult> {
  const result: MintAndBurnResult = {
    success: true,
    messages: [],
    errors: [],
  };

  const emitProgress = () => {
    if (typeof options.onProgress === "function") {
      // 复制数组，保证调用方能触发 React 渲染
      options.onProgress({
        success: result.success,
        messages: [...result.messages],
        errors: [...result.errors],
        mintReceipt: result.mintReceipt,
        burnReceipt: result.burnReceipt,
        transferReceipt: result.transferReceipt,
      });
    }
  };

  try {
    const {
      mintAmount = ethers.parseEther("1"),
      mintTo,
      burnAmount,
      burnFrom,
      transferAmount,
      transferTo,
      transferFrom,
      rpcUrl,
    } = options;

    // 获取默认地址（使用 signer 的地址）
    const defaultAddress = await contractConfig.signer.getAddress();
    const mintToAddress = mintTo || defaultAddress;
    const burnFromAddress = burnFrom || defaultAddress;
    const transferFromAddress = transferFrom || defaultAddress;

    // === Mint 操作 ===
    if (mintAmount > 0n) {
      result.messages.push("\n=== 开始 Mint 操作 ===");
      emitProgress();
      
      try {
        // 获取 mint 前的状态
        const balanceBefore = await contractConfig.token.balanceOf(mintToAddress);
        const totalSupplyBefore = await contractConfig.token.totalSupply();
        
        result.messages.push(`Mint 前余额: ${ethers.formatEther(balanceBefore)}`);
        result.messages.push(`Mint 前总供应量: ${ethers.formatEther(totalSupplyBefore)}`);
        result.messages.push(`Mint 数量: ${ethers.formatEther(mintAmount)}`);
        result.messages.push(`Mint 到地址: ${mintToAddress}`);
        emitProgress();

        // 执行 mint 操作
        const mintReceipt = await sendTransaction(
          contractConfig.token,
          "mint",
          [mintToAddress, mintAmount],
          "Mint",
          contractConfig.provider,
          rpcUrl
        );
        result.mintReceipt = mintReceipt;
        emitProgress();

        // 获取 mint 后的状态
        const balanceAfter = await contractConfig.token.balanceOf(mintToAddress);
        const totalSupplyAfter = await contractConfig.token.totalSupply();

        result.messages.push(`Mint 后余额: ${ethers.formatEther(balanceAfter)}`);
        result.messages.push(`Mint 后总供应量: ${ethers.formatEther(totalSupplyAfter)}`);
        result.messages.push("✓ Mint 操作完成");
        emitProgress();
      } catch (error: any) {
        result.success = false;
        result.errors.push(`Mint 操作失败: ${error.message}`);
        emitProgress();
      }
    }

    // === Burn 操作 ===
    if (burnAmount && burnAmount > 0n) {
      result.messages.push("\n=== 开始 Burn 操作 ===");
      emitProgress();
      
      try {
        // 获取 burn 前的状态
        const balanceBeforeBurn = await contractConfig.token.balanceOf(burnFromAddress);
        const totalSupplyBeforeBurn = await contractConfig.token.totalSupply();
        
        result.messages.push(`Burn 前余额: ${ethers.formatEther(balanceBeforeBurn)}`);
        result.messages.push(`Burn 前总供应量: ${ethers.formatEther(totalSupplyBeforeBurn)}`);
        result.messages.push(`Burn 数量: ${ethers.formatEther(burnAmount)}`);
        result.messages.push(`Burn 从地址: ${burnFromAddress}`);
        emitProgress();

        // 执行 burn 操作
        const burnReceipt = await sendTransaction(
          contractConfig.token,
          "burn",
          [burnFromAddress, burnAmount],
          "Burn",
          contractConfig.provider,
          rpcUrl
        );
        result.burnReceipt = burnReceipt;
        emitProgress();

        // 获取 burn 后的状态
        const balanceAfterBurn = await contractConfig.token.balanceOf(burnFromAddress);
        const totalSupplyAfterBurn = await contractConfig.token.totalSupply();

        result.messages.push(`Burn 后余额: ${ethers.formatEther(balanceAfterBurn)}`);
        result.messages.push(`Burn 后总供应量: ${ethers.formatEther(totalSupplyAfterBurn)}`);
        result.messages.push("✓ Burn 操作完成");
        emitProgress();
      } catch (error: any) {
        result.success = false;
        result.errors.push(`Burn 操作失败: ${error.message}`);
        emitProgress();
      }
    }

    // === Transfer 操作 ===
    if (transferAmount && transferAmount > 0n && transferTo) {
      result.messages.push("\n=== 开始 Transfer 操作 ===");
      emitProgress();
      
      try {
        // 获取 Transfer 前的状态
        const fromBalanceBefore = await contractConfig.token.balanceOf(transferFromAddress);
        const toBalanceBefore = await contractConfig.token.balanceOf(transferTo);
        const totalSupplyBeforeTransfer = await contractConfig.token.totalSupply();

        result.messages.push(`Transfer 前发送地址余额: ${ethers.formatEther(fromBalanceBefore)}`);
        result.messages.push(`Transfer 前接收地址余额: ${ethers.formatEther(toBalanceBefore)}`);
        result.messages.push(`Transfer 前总供应量: ${ethers.formatEther(totalSupplyBeforeTransfer)}`);
        result.messages.push(`Transfer 数量: ${ethers.formatEther(transferAmount)}`);
        result.messages.push(`Transfer 从地址: ${transferFromAddress}`);
        result.messages.push(`Transfer 到地址: ${transferTo}`);
        emitProgress();

        // 执行 transfer 操作
        const transferReceipt = await sendTransaction(
          contractConfig.token,
          "transfer",
          [transferTo, transferAmount],
          "Transfer",
          contractConfig.provider,
          rpcUrl
        );
        result.transferReceipt = transferReceipt;
        emitProgress();

        // 获取 Transfer 后的状态
        const fromBalanceAfter = await contractConfig.token.balanceOf(transferFromAddress);
        const toBalanceAfter = await contractConfig.token.balanceOf(transferTo);
        const totalSupplyAfterTransfer = await contractConfig.token.totalSupply();

        result.messages.push(`Transfer 后发送地址余额: ${ethers.formatEther(fromBalanceAfter)}`);
        result.messages.push(`Transfer 后接收地址余额: ${ethers.formatEther(toBalanceAfter)}`);
        result.messages.push(`Transfer 后总供应量: ${ethers.formatEther(totalSupplyAfterTransfer)}`);
        result.messages.push("✓ Transfer 操作完成");
        emitProgress();
      } catch (error: any) {
        result.success = false;
        result.errors.push(`Transfer 操作失败: ${error.message}`);
        emitProgress();
      }
    }

    if (result.success) {
      result.messages.push("\n✓ 所有操作完成！");
      emitProgress();
    } else {
      result.messages.push("\n✗ 部分操作失败，请查看错误信息");
      emitProgress();
    }

  } catch (error: any) {
    result.success = false;
    result.errors.push(`操作过程出错: ${error.message}`);
    emitProgress();
  }

  return result;
}

/**
 * 部署 MockModule 合约结果接口
 */
export interface DeployMockModuleResult {
  success: boolean;
  messages: string[];
  errors: string[];
  moduleAddress?: string;
}

/**
 * 部署 MockModule 合约
 */
export async function deployMockModule(
  provider: ethers.JsonRpcProvider,
  signer: ethers.Signer,
  rpcUrl?: string
): Promise<DeployMockModuleResult> {
  const result: DeployMockModuleResult = {
    success: true,
    messages: [],
    errors: [],
  };

  try {
    result.messages.push("\n=== 开始部署 MockModule ===");

    const factory = new ethers.ContractFactory(
      mockModuleArtifact.abi,
      mockModuleArtifact.bytecode?.object || mockModuleArtifact.bytecode,
      signer
    );

    result.messages.push("开始部署 MockModule...");
    const contract = await factory.deploy({
      gasLimit: 1_500_000n,
    });
    result.messages.push(`交易哈希: ${contract.deploymentTransaction()?.hash}`);

    const deployed = await contract.waitForDeployment();
    const address = await deployed.getAddress();
    result.moduleAddress = address;
    result.messages.push(`MockModule 部署完成，地址: ${address}`);
    result.messages.push("\n=== 部署 MockModule 完成 ===");
  } catch (error: any) {
    result.success = false;
    result.errors.push(`部署 MockModule 失败: ${error.message}`);
  }

  return result;
}

/**
 * 添加并移除模块结果接口
 */
export interface AddAndRemoveModuleResult {
  success: boolean;
  messages: string[];
  errors: string[];
}

/**
 * 添加并移除声明主题示例结果接口
 */
export interface AddAndRemoveClaimTopicExampleResult {
  success: boolean;
  messages: string[];
  errors: string[];
}

/**
 * 添加并移除模块
 */
export async function addAndRemoveModule(
  contractConfig: ContractConfig,
  moduleAddress: string,
  rpcUrl?: string
): Promise<AddAndRemoveModuleResult> {
  const result: AddAndRemoveModuleResult = {
    success: true,
    messages: [],
    errors: [],
  };

  try {
    result.messages.push("\n=== 开始添加并移除模块 ===");
    result.messages.push(`模块地址: ${moduleAddress}`);

    // 检查模块是否已绑定
    const isBoundBefore = await contractConfig.compliance.isModuleBound(moduleAddress);
    result.messages.push(`模块绑定状态: ${isBoundBefore ? "已绑定" : "未绑定"}`);

    // 如果模块尚未绑定，先绑定一次
    if (!isBoundBefore) {
      result.messages.push("\n--- 添加模块 ---");
      try {
        await sendTransaction(
          contractConfig.compliance,
          "addModule",
          [moduleAddress],
          "AddModule",
          contractConfig.provider,
          rpcUrl
        );
        result.messages.push("✓ 模块添加成功");
      } catch (error: any) {
        result.success = false;
        result.errors.push(`添加模块失败: ${error.message}`);
        return result;
      }
    } else {
      result.messages.push("模块已绑定，跳过添加步骤");
    }

    // 检查 canTransfer（在移除前）
    try {
      const canTransfer = await contractConfig.compliance.canTransfer(
        "0x0000000000000000000000000000000000001111", 
        "0x0000000000000000000000000000000000002222", 
        ethers.parseEther("1")
      );
      result.messages.push(`移除前 canTransfer: ${canTransfer}`);
    } catch (error: any) {
      result.messages.push(`检查 canTransfer 失败: ${error.message}`);
    }

    // 移除模块
    result.messages.push("\n--- 移除模块 ---");
    try {
      await sendTransaction(
        contractConfig.compliance,
        "removeModule",
        [moduleAddress],
        "RemoveModule",
        contractConfig.provider,
        rpcUrl
      );
      result.messages.push("✓ 模块移除成功");
    } catch (error: any) {
      result.success = false;
      result.errors.push(`移除模块失败: ${error.message}`);
      return result;
    }

    // Post-checks
    const isBoundAfter = await contractConfig.compliance.isModuleBound(moduleAddress);
    const modules = await contractConfig.compliance.getModules();
    const found = modules.map((m: string) => ethers.getAddress(m)).includes(moduleAddress);

    result.messages.push(`\n--- 验证移除结果 ---`);
    result.messages.push(`模块已移除: ${!isBoundAfter && !found}`);
    result.messages.push(`当前模块列表: ${modules.join(", ") || "空"}`);

    // 检查 canTransfer（移除后）
    try {
      const canTransferAfter = await contractConfig.compliance.canTransfer(
        "0x0000000000000000000000000000000000001111", 
        "0x0000000000000000000000000000000000002222", 
        ethers.parseEther("1")
      );
      result.messages.push(`移除后 canTransfer: ${canTransferAfter}`);
    } catch (error: any) {
      result.messages.push(`检查 canTransfer 失败: ${error.message}`);
    }

    result.messages.push("\n=== 添加并移除模块完成 ===");
  } catch (error: any) {
    result.success = false;
    result.errors.push(`添加并移除模块过程出错: ${error.message}`);
  }

  return result;
}

/**
 * 执行“添加并移除 Claim Topic”示例，流程同 7_addAndRemoveClaimTopic.ts
 */
export async function addAndRemoveClaimTopicExample(
  contractConfig: ContractConfig,
  userAddress: string,
  rpcUrl?: string,
  targetTopic: number = 3
): Promise<AddAndRemoveClaimTopicExampleResult> {
  const result: AddAndRemoveClaimTopicExampleResult = {
    success: true,
    messages: [],
    errors: [],
  };

  try {
    result.messages.push(`\n=== 开始执行添加并移除 Claim Topic 示例 (topic ${targetTopic}) ===`);

    // 1) 若不存在则新增 topic
    const topicsBefore: bigint[] = await contractConfig.claimTopicsRegistry.getClaimTopics();
    result.messages.push(`当前 ClaimTopics: [${topicsBefore.join(", ")}]`);
    if (!topicsBefore.map(Number).includes(targetTopic)) {
      result.messages.push("添加新的 claim topic...");
      await sendTransaction(
        contractConfig.claimTopicsRegistry,
        "addClaimTopic",
        [targetTopic],
        "AddClaimTopic",
        contractConfig.provider,
        rpcUrl
      );
      result.messages.push("✓ claim topic 添加成功");
    } else {
      result.messages.push("claim topic 已存在，跳过添加");
    }

    // 2) 部署新的 ClaimIssuer 并信任它
    result.messages.push("\n=== 部署新的 RWAClaimIssuer ===");
    const newIssuerKeyWallet = ethers.Wallet.createRandom().connect(contractConfig.provider);
    const salt = `${Date.now()}`;
    const issuerAddressPlanned = await (contractConfig.claimIssuerIdFactory as any).createIdentity.staticCall(
      newIssuerKeyWallet.address,
      salt
    );
    result.messages.push(`新 ClaimIssuer 管理密钥: ${newIssuerKeyWallet.address}`);
    result.messages.push(`预测的 issuer 地址: ${issuerAddressPlanned}`);

    await sendTransaction(
      contractConfig.claimIssuerIdFactory,
      "createIdentity",
      [newIssuerKeyWallet.address, salt],
      "CreateIdentity",
      contractConfig.provider,
      rpcUrl
    );

    const newIssuerAddress = await contractConfig.claimIssuerIdFactory.getIdentity(newIssuerKeyWallet.address);
    if (newIssuerAddress === ethers.ZeroAddress) {
      throw new Error("createIdentity 未能返回有效地址");
    }
    result.messages.push(`新 ClaimIssuer 地址: ${newIssuerAddress}`);

    result.messages.push("\n=== 将新 issuer 加入 TrustedIssuersRegistry ===");
    await sendTransaction(
      contractConfig.trustedIssuersRegistry,
      "addTrustedIssuer",
      [newIssuerAddress, [targetTopic]],
      "AddTrustedIssuer",
      contractConfig.provider,
      rpcUrl
    );
    result.messages.push("✓ 新 issuer 已加入 TrustedIssuersRegistry");

    // 3) 创建/注册身份并添加 claim
    result.messages.push("\n=== 为身份添加 claim ===");
    const identityAddress = await contractConfig.identityIdFactory.getIdentity(userAddress);
    if (identityAddress === ethers.ZeroAddress) {
      throw new Error("getIdentity 未能返回有效地址");
    }
    result.messages.push(`身份地址: ${identityAddress}`);

    const identityContract = new ethers.Contract(
      identityAddress,
      (rwaIdentityABI as any).abi && (rwaIdentityABI as any).abi.length > 0
        ? (rwaIdentityABI as any).abi
        : [
            "function addClaim(uint256 _topic, uint256 _scheme, address _issuer, bytes memory _signature, bytes memory _data, string memory _uri) external"
          ],
      contractConfig.signer
    );

    const claimSchemeEcdsa = 1;
    const claimData = "0x";
    const signature = await signClaim(identityAddress, targetTopic, newIssuerKeyWallet, claimData);

    await sendTransaction(
      identityContract,
      "addClaim",
      [targetTopic, claimSchemeEcdsa, newIssuerAddress, signature, claimData, "0x"],
      "AddClaimToIdentity",
      contractConfig.provider,
      rpcUrl
    );

    const isVerified = await contractConfig.identityRegistry.isVerified(userAddress);
    result.messages.push(`identity 是否已验证: ${isVerified}`);
    if (!isVerified) {
      throw new Error("identity 未被验证");
    }

    result.messages.push("\n=== 移除 claim topic ===");
    await sendTransaction(
      contractConfig.claimTopicsRegistry,
      "removeClaimTopic",
      [targetTopic],
      "RemoveClaimTopic",
      contractConfig.provider,
      rpcUrl
    );

    const topicsAfter: bigint[] = await contractConfig.claimTopicsRegistry.getClaimTopics();
    result.messages.push(`移除后 ClaimTopics: [${topicsAfter.join(", ")}]`);

    const stillVerified = await contractConfig.identityRegistry.isVerified(userAddress);
    result.messages.push(`移除 topic 后 identity 是否仍被验证: ${stillVerified}`);

    result.messages.push("\n=== 示例操作完成 ===");
  } catch (error: any) {
    result.success = false;
    result.errors.push(`添加并移除 Claim Topic 示例失败: ${error.message}`);
  }

  return result;
}

