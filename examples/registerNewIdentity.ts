import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * 从 Foundry 部署日志中读取合约地址
 */
function getContractAddresses(): Record<string, string> {
  const broadcastPath = path.join(
    __dirname,
    "../broadcast/DeployERC3643.s.sol/31337/run-latest.json"
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
  if (contractName === "RWAClaimIssuer") {
    possiblePaths.push(path.join(__dirname, `../out/Identity.sol/RWAClaimIssuer.json`));
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
 * 主函数：注册新身份
 */
async function main() {
  // 连接到本地节点（Anvil）
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  /**
   * 辅助函数：延迟
   */
  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 等待所有待处理的交易确认
   */
  async function waitForPendingTransactions(walletAddress: string, maxWaitTime: number = 30000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      const pendingNonce = await provider.getTransactionCount(walletAddress, "pending");
      const latestNonce = await provider.getTransactionCount(walletAddress, "latest");
      
      if (pendingNonce === latestNonce) {
        // 没有待处理的交易
        return;
      }
      
      console.log(`等待待处理交易确认... (pending: ${pendingNonce}, latest: ${latestNonce})`);
      await sleep(1000);
    }
    
    console.warn("等待超时，可能仍有待处理的交易");
  }

  /**
   * 带重试机制的交易发送函数
   * 专门处理 nonce 相关的错误，自动重试
   */
  async function sendTransactionWithRetry(
    txFunction: () => Promise<any>,
    walletAddress: string,
    maxRetries: number = 5,
    retryDelay: number = 2000
  ): Promise<any> {
    let lastError: any;
    let currentDelay = retryDelay;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 执行交易函数（函数内部会获取最新的 nonce）
        const tx = await txFunction();
        return tx;
      } catch (error: any) {
        lastError = error;
        const errorMsg = error.message || String(error);
        
        // 检查是否是 nonce 相关错误
        if (errorMsg.includes("nonce") || errorMsg.includes("replacement transaction underpriced")) {
          console.warn(`\n⚠️  Nonce 错误 (尝试 ${attempt + 1}/${maxRetries}): ${errorMsg}`);
          
          if (attempt < maxRetries - 1) {
            // 获取当前 nonce 状态用于调试
            const pendingNonce = await provider.getTransactionCount(walletAddress, "pending");
            const latestNonce = await provider.getTransactionCount(walletAddress, "latest");
            console.log(`   当前 nonce 状态 - pending: ${pendingNonce}, latest: ${latestNonce}`);
            console.log(`   等待 ${currentDelay}ms 后重试...\n`);
            
            await sleep(currentDelay);
            // 指数退避：每次重试延迟增加
            currentDelay = Math.min(currentDelay * 1.5, 10000); // 最多等待 10 秒
            continue;
          } else {
            // 最后一次尝试也失败了
            const pendingNonce = await provider.getTransactionCount(walletAddress, "pending");
            const latestNonce = await provider.getTransactionCount(walletAddress, "latest");
            throw new Error(`Nonce 错误，已重试 ${maxRetries} 次仍失败: ${errorMsg}. 当前 pending nonce: ${pendingNonce}, latest nonce: ${latestNonce}`);
          }
        }
        
        // 如果不是 nonce 错误，直接抛出
        throw error;
      }
    }
    
    throw lastError || new Error("未知错误");
  }

  console.log(`连接到 RPC: ${rpcUrl}`);

  // 获取网络信息
  const network = await provider.getNetwork();
  console.log(`网络: ${network.name} (Chain ID: ${network.chainId})`);

  // 读取合约地址
  const addresses = getContractAddresses();

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
      "function owner() view returns (address)",
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

  // 获取 Token 合约
  const tokenABI = getContractABI("RWAToken");
  const token = new ethers.Contract(
    tokenAddress,
    tokenABI.length > 0 ? tokenABI : [
      "function identityRegistry() view returns (address)",
    ],
    provider
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
  
  // 需要从部署日志或环境变量中获取
  const identityIdFactoryAddress = process.env.IDENTITY_ID_FACTORY || addresses["RWAIdentityIdFactory"];
  if (!identityIdFactoryAddress) {
    throw new Error("请设置 IDENTITY_ID_FACTORY 环境变量或确保 IdFactory 在部署日志中");
  }

  // 获取 IdFactory 合约
  const idFactoryABI = getContractABI("RWAIdentityIdFactory");
  const identityIdFactory = new ethers.Contract(
    ethers.getAddress(identityIdFactoryAddress),
    idFactoryABI.length > 0 ? idFactoryABI : [
      "function createIdentity(address _managementKey, string memory _salt) external returns (address)",
      "function owner() view returns (address)",
    ],
    wallet
  );
  console.log(`Identity IdFactory address: ${identityIdFactoryAddress} ${await identityIdFactory.owner()}`);

  
  const claimIssuerIdFactoryAddress = process.env.CLAIM_ISSUER_ID_FACTORY || addresses["RWAClaimIssuerIdFactory"];
  if (!claimIssuerIdFactoryAddress) {
    throw new Error("请设置 CLAIM_ISSUER_ID_FACTORY 环境变量或确保 RWAClaimIssuerIdFactory 在部署日志中");
  }
  console.log(`Claim Issuer IdFactory address: ${claimIssuerIdFactoryAddress}`);

  const claimIssuerIdFactoryABI = getContractABI("RWAClaimIssuerIdFactory");
  const claimIssuerIdFactory = new ethers.Contract(
    ethers.getAddress(claimIssuerIdFactoryAddress),
    claimIssuerIdFactoryABI.length > 0 ? claimIssuerIdFactoryABI : [
      "function createIdentity(address _managementKey, string memory _salt) external returns (address)",
      "function owner() view returns (address)",
    ],
    wallet  
  );
  
  // 获取 ClaimIssuer 地址
  const managementKey = process.env.MANAGEMENT_KEY || wallet.address;
  const claimIssuerAddress = await claimIssuerIdFactory.getIdentity(managementKey);
  console.log(`Claim Issuer address: ${claimIssuerAddress}`);

  // 获取 ClaimIssuer 合约
  const claimIssuerABI = getContractABI("RWAClaimIssuer");
  const claimIssuer = new ethers.Contract(
    ethers.getAddress(claimIssuerAddress),
    claimIssuerABI.length > 0 ? claimIssuerABI : [
      "function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType) external",
      "function keyHasPurpose(bytes32 _key, uint256 _purpose) external view returns (bool)",
    ],
    wallet
  );

  // 获取 RWAIdentity 合约 ABI
  const rwaIdentityABI = getContractABI("RWAIdentity");

  console.log("\n=== 开始注册新身份 ===");

  // 步骤 1: 生成新的管理密钥
  const newClaimKeyPrivateKey = process.env.NEW_CLAIM_KEY_PRIVATE_KEY || 
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const newClaimKeyWallet = new ethers.Wallet(newClaimKeyPrivateKey, provider);
  const newManagementKey = newClaimKeyWallet.address;
  console.log(`新管理密钥地址: ${newManagementKey}`);

  // 步骤 2: 创建新身份
  console.log("\n--- 创建新身份 ---");
  const identityFactoryOwner = await identityIdFactory.owner();
  console.log(`Identity Factory Owner: ${identityFactoryOwner} ${identityIdFactory.address}`);
  console.log(`Identity Factory Owner: ${await identityIdFactory.isTokenFactory("0x59b670e9fA9D0A427751Af201D676719a970857b")}`);
  // 需要以 factory owner 的身份创建身份
  const factoryOwnerWallet = new ethers.Wallet(
    process.env.FACTORY_OWNER_PRIVATE_KEY || privateKey,
    provider
  );
  const identityIdFactoryWithOwner = identityIdFactory.connect(factoryOwnerWallet);
  // 0x59b670e9fA9D0A427751Af201D676719a970857b
  // identityIdFactoryWithOwner
  const identitySalt = `newIdentity`;
  let newIdentityAddress: string | undefined;
  
  // 首先使用 staticCall 获取将要创建的身份地址（模拟调用）
  try {
      const result = await (identityIdFactoryWithOwner as any).createIdentity.staticCall(newManagementKey, identitySalt);
      newIdentityAddress = ethers.getAddress(String(result));
      console.log(`预计创建的身份地址: ${newIdentityAddress}`);
  } catch (error: any) {
      console.warn(`无法通过 staticCall 获取身份地址: ${error.message}`);
  }
  
  try {
    // 执行实际交易
    const tx = await (identityIdFactoryWithOwner as any).createIdentity(newManagementKey, identitySalt);
    console.log(`创建身份交易哈希: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`交易确认，区块号: ${receipt?.blockNumber}`);
    // 从 WalletLinked 事件中获取新身份地址（验证）
    if (receipt?.logs) {
      const walletLinkedTopic = ethers.id("WalletLinked(address,address)");
      const walletLinkedEvent = receipt.logs.find((log: any) => {
        return log.topics[0] === walletLinkedTopic && 
               ethers.getAddress(ethers.dataSlice(log.topics[1], 12)).toLowerCase() === newManagementKey.toLowerCase();
      });
      
      if (walletLinkedEvent) {
        // WalletLinked(address indexed wallet, address indexed identity)
        // topics[0] = event signature
        // topics[1] = wallet (indexed)
        // topics[2] = identity (indexed)
        const eventIdentityAddress = ethers.getAddress(ethers.dataSlice(walletLinkedEvent.topics[2], 12));
        if (newIdentityAddress && newIdentityAddress.toLowerCase() !== eventIdentityAddress.toLowerCase()) {
          console.warn(`警告: staticCall 返回的地址与事件中的地址不匹配`);
        }
        newIdentityAddress = eventIdentityAddress;
        console.log(`从 WalletLinked 事件获取身份地址: ${newIdentityAddress}`);
      }
    }
    
    // 如果仍然无法获取，抛出错误
    if (!newIdentityAddress) {
      throw new Error("无法从交易中获取新身份地址，请检查 IdFactory 的事件或手动提供地址");
    }
  } catch (error: any) {
    throw new Error(`创建身份失败: ${error.message}`);
  }

  if (!newIdentityAddress) {
    throw new Error("无法获取新身份地址");
  }

  console.log(`新身份地址: ${newIdentityAddress}`);
  
  // 步骤 4: 添加 claim key 到新身份
  console.log("\n--- 添加 claim key 到新身份 ---");
  const purposeClaim = 3; // CLAIM purpose
  const keyTypeEcdsa = 1; // ECDSA key type
  const claimKeyHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address"], [newManagementKey]));
  console.log(`Claim Key Hash: ${claimKeyHash}`);

  const newIdentity = new ethers.Contract(
    newIdentityAddress,
    rwaIdentityABI.length > 0 ? rwaIdentityABI : [
      "function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType) external",
      "function addClaim(uint256 _topic, uint256 _scheme, address _issuer, bytes memory _signature, bytes memory _data, string memory _uri) external",
      "function keyHasPurpose(bytes32 _key, uint256 _purpose) external view returns (bool)",
    ],
    newClaimKeyWallet
  );

  try {
    // 检查 key 是否已存在
    const keyExists = await (newIdentity as any).keyHasPurpose(claimKeyHash, purposeClaim);
    if (keyExists) {
      console.log("✓ Claim key 已存在于新身份，跳过添加");
    } else {
      // 在发送交易前等待所有待处理的交易确认
      console.log("检查并等待待处理交易...");
      await waitForPendingTransactions(newClaimKeyWallet.address);
      
      // 使用重试机制发送交易
      const tx = await sendTransactionWithRetry(
        async () => {
          // 每次重试时重新获取最新的 nonce（包含待处理的交易）
          const nonce = await provider.getTransactionCount(newClaimKeyWallet.address, "pending");
          console.log(`发送添加 key 交易，使用 nonce: ${nonce} (地址: ${newClaimKeyWallet.address})`);
          
          return await (newIdentity as any).addKey(claimKeyHash, purposeClaim, keyTypeEcdsa, {
            nonce: nonce
          });
        },
        newClaimKeyWallet.address,
        5, // 最多重试 5 次
        2000 // 初始延迟 2 秒
      );
      
      console.log(`添加 key 交易哈希: ${tx.hash}`);
      await tx.wait();
      console.log("✓ Claim key 已添加到新身份");
    }
  } catch (error: any) {
    // 如果是 nonce 错误，提供更详细的错误信息
    if (error.message && error.message.includes("nonce")) {
      const currentNonce = await provider.getTransactionCount(newClaimKeyWallet.address, "pending");
      const latestNonce = await provider.getTransactionCount(newClaimKeyWallet.address, "latest");
      throw new Error(`添加 claim key 失败 (nonce 错误): ${error.message}. 当前 pending nonce: ${currentNonce}, latest nonce: ${latestNonce}`);
    }
    throw new Error(`添加 claim key 失败: ${error.message}`);
  }
  
  sleep(1000);
  










  // 步骤 5: 添加 claim key 到 claimIssuer（用于签名验证）
  console.log("\n--- 添加 claim key 到 ClaimIssuer ---");
  const managementKeyWallet = new ethers.Wallet(
    process.env.MANAGEMENT_KEY_PRIVATE_KEY || privateKey,
    provider
  );
  const claimIssuerWithManager = claimIssuer.connect(managementKeyWallet);

  try {
    // 检查 key 是否已存在，避免重复添加和 nonce 冲突
    const keyExists = await (claimIssuerWithManager as any).keyHasPurpose(claimKeyHash, purposeClaim);
    if (keyExists) {
      console.log("✓ Claim key 已存在于 ClaimIssuer，跳过添加");
    } else {
      // 在发送交易前等待所有待处理的交易确认
      console.log("检查并等待待处理交易...");
      await waitForPendingTransactions(managementKeyWallet.address);
      
      // 使用重试机制发送交易
      const tx = await sendTransactionWithRetry(
        async () => {
          // 每次重试时重新获取最新的 nonce（包含待处理的交易）
          const nonce = await provider.getTransactionCount(managementKeyWallet.address, "pending");
          console.log(`发送交易，使用 nonce: ${nonce} (地址: ${managementKeyWallet.address})`);
          
          return await (claimIssuerWithManager as any).addKey(claimKeyHash, purposeClaim, keyTypeEcdsa, {
            nonce: nonce
          });
        },
        managementKeyWallet.address,
        5, // 最多重试 5 次
        2000 // 初始延迟 2 秒
      );
      
      console.log(`添加 key 到 ClaimIssuer 交易哈希: ${tx.hash}`);
      await tx.wait();
      console.log("✓ Claim key 已添加到 ClaimIssuer");
    }
  } catch (error: any) {
    // 如果是 nonce 错误，提供更详细的错误信息
    if (error.message && error.message.includes("nonce")) {
      const currentNonce = await provider.getTransactionCount(managementKeyWallet.address, "pending");
      const latestNonce = await provider.getTransactionCount(managementKeyWallet.address, "latest");
      throw new Error(`添加 claim key 到 ClaimIssuer 失败 (nonce 错误): ${error.message}. 当前 pending nonce: ${currentNonce}, latest nonce: ${latestNonce}`);
    }
    throw new Error(`添加 claim key 到 ClaimIssuer 失败: ${error.message}`);
  }
  sleep(100);
  // 步骤 6: 创建并签名 claim
  console.log("\n--- 创建并签名 claim ---");
  const claimTopicKyc = 1; // KYC claim topic
  const claimSchemeEcdsa = 1; // ECDSA scheme
  const data = "0x"; // 空数据
  const dataHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes"],
      [newIdentityAddress, claimTopicKyc, data]
    )
  );
  console.log(`Data Hash: ${dataHash}`);

  // 创建 Ethereum 签名消息前缀（与 Solidity 测试一致）
  // 注意：Solidity 使用 abi.encodePacked，所以我们需要手动构造
  const messagePrefix = "\x19Ethereum Signed Message:\n32";
  const prefixedHash = ethers.keccak256(
    ethers.concat([
      ethers.toUtf8Bytes(messagePrefix),
      ethers.getBytes(dataHash)
    ])
  );
  console.log(`Prefixed Hash: ${prefixedHash}`);

  // 使用新密钥签名 prefixedHash（直接签名哈希，不使用 signMessage）
  // 因为合约期望的是对 prefixedHash 的签名
  const signature = await newClaimKeyWallet.signingKey.sign(prefixedHash);
  // 将签名转换为 bytes 格式 (r, s, v)
  // 确保 v 是单个字节 (0-1 或 27-28，合约会处理)
  const vByte = signature.v >= 27 ? signature.v - 27 : signature.v;
  const sigBytes = ethers.concat([
    signature.r,
    signature.s,
    new Uint8Array([vByte])
  ]);
  console.log(`签名: ${sigBytes} (长度: ${sigBytes.length} 字节)`);
  sleep(100);
  // 步骤 7: 添加 claim 到新身份
  console.log("\n--- 添加 claim 到新身份 ---");
  try {
    // 在发送交易前等待所有待处理的交易确认
    console.log("检查并等待待处理交易...");
    await waitForPendingTransactions(newClaimKeyWallet.address);
    
    // 使用重试机制发送交易
    const tx = await sendTransactionWithRetry(
      async () => {
        // 每次重试时重新获取最新的 nonce（包含待处理的交易）
        const nonce = await provider.getTransactionCount(newClaimKeyWallet.address, "pending");
        console.log(`发送添加 claim 交易，使用 nonce: ${nonce} (地址: ${newClaimKeyWallet.address})`);
        
        return await (newIdentity as any).addClaim(
          claimTopicKyc,
          claimSchemeEcdsa,
          claimIssuerAddress,
          sigBytes,
          data,
          "",
          {
            nonce: nonce
          }
        );
      },
      newClaimKeyWallet.address,
      5, // 最多重试 5 次
      2000 // 初始延迟 2 秒
    );
    
    console.log(`添加 claim 交易哈希: ${tx.hash}`);
    await tx.wait();
    console.log("✓ Claim 已添加到新身份");
  } catch (error: any) {
    // 如果是 nonce 错误，提供更详细的错误信息
    if (error.message && error.message.includes("nonce")) {
      const currentNonce = await provider.getTransactionCount(newClaimKeyWallet.address, "pending");
      const latestNonce = await provider.getTransactionCount(newClaimKeyWallet.address, "latest");
      throw new Error(`添加 claim 失败 (nonce 错误): ${error.message}. 当前 pending nonce: ${currentNonce}, latest nonce: ${latestNonce}`);
    }
    throw new Error(`添加 claim 失败: ${error.message}`);
  }
  sleep(100);
  // 步骤 8: 注册新身份到 Identity Registry
  console.log("\n--- 注册新身份到 Identity Registry ---");
  const countryCode = 840; // US country code
  
  // 获取 identityRegistry 使用的钱包地址
  const identityRegistryWalletAddress = wallet.address;
  
  try {
    // 在发送交易前等待所有待处理的交易确认
    console.log("检查并等待待处理交易...");
    await waitForPendingTransactions(identityRegistryWalletAddress);
    
    // 使用重试机制发送交易
    const tx = await sendTransactionWithRetry(
      async () => {
        // 每次重试时重新获取最新的 nonce（包含待处理的交易）
        const nonce = await provider.getTransactionCount(identityRegistryWalletAddress, "pending");
        console.log(`发送注册身份交易，使用 nonce: ${nonce} (地址: ${identityRegistryWalletAddress})`);
        
        return await identityRegistry.registerIdentity(
          newManagementKey,
          newIdentityAddress,
          countryCode,
          {
            nonce: nonce
          }
        );
      },
      identityRegistryWalletAddress,
      5, // 最多重试 5 次
      2000 // 初始延迟 2 秒
    );
    
    console.log(`注册身份交易哈希: ${tx.hash}`);
    await tx.wait();
    console.log("✓ 身份已注册到 Identity Registry");
  } catch (error: any) {
    // 如果是 nonce 错误，提供更详细的错误信息
    if (error.message && error.message.includes("nonce")) {
      const currentNonce = await provider.getTransactionCount(identityRegistryWalletAddress, "pending");
      const latestNonce = await provider.getTransactionCount(identityRegistryWalletAddress, "latest");
      throw new Error(`注册身份失败 (nonce 错误): ${error.message}. 当前 pending nonce: ${currentNonce}, latest nonce: ${latestNonce}`);
    }
    throw new Error(`注册身份失败: ${error.message}`);
  }
  sleep(100);
  // 步骤 9: 验证身份是否已注册
  console.log("\n--- 验证身份注册状态 ---");
  try {
    const isVerified = await identityRegistry.isVerified(newManagementKey);
    if (isVerified) {
      console.log("✓ 身份验证成功！");
      console.log(`用户地址: ${newManagementKey}`);
      console.log(`身份合约地址: ${newIdentityAddress}`);
    } else {
      throw new Error("身份验证失败");
    }
  } catch (error: any) {
    throw new Error(`验证身份失败: ${error.message}`);
  }

  console.log("\n=== 注册新身份完成 ===");
  console.log(`新管理密钥地址: ${newManagementKey}`);
  console.log(`新身份合约地址: ${newIdentityAddress}`);
  console.log(`国家代码: ${countryCode}`);
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
