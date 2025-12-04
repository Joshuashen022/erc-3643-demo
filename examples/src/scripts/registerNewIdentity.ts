import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { initializeContracts, getContractABI } from "../utils/contracts.js";
import { registerIdentity, signClaim } from "../utils/operations.js";
import { sendTransaction } from "../utils/transactions.js";

dotenv.config();

async function main() {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("请设置 PRIVATE_KEY 环境变量");
  }

  const config = await initializeContracts(rpcUrl, privateKey);
  const { deploymentResults, provider } = config;

  console.log("\n=== 开始注册新身份 ===");

  // 生成新的管理密钥
  const newManagementKeyWallet = ethers.Wallet.createRandom().connect(provider);
  const newManagementKey = newManagementKeyWallet.address;
  const newManagementKeyPrivateKey = newManagementKeyWallet.privateKey;
  console.log(`新管理密钥地址: ${newManagementKey}`);
  console.log(`新管理密钥私钥: ${newManagementKeyPrivateKey}`);

  // 创建新身份
  console.log("\n--- 创建新身份 ---");
  const factoryOwnerWallet = new ethers.Wallet(privateKey as string,provider);
  const identityIdFactoryWithOwner = config.identityIdFactory.connect(factoryOwnerWallet) as ethers.Contract;
  const identitySalt = `newIdentity-${Date.now()}`;
  
  const tx = await factoryOwnerWallet.sendTransaction({
    to: newManagementKey,
    value: ethers.parseEther("0.0001"),
  });
  await tx.wait();
  console.log(`Factory owner sent 0.0001 ETH to new management key wallet: ${newManagementKey}`);

  let newIdentityAddress: string | undefined;
  
  const result = await (identityIdFactoryWithOwner as any).createIdentity.staticCall(newManagementKey, identitySalt);
  newIdentityAddress = ethers.getAddress(String(result));
  console.log(`预计创建的身份地址: ${newIdentityAddress} with salt: ${identitySalt}, management key: ${newManagementKey}`);

  await sendTransaction(
    identityIdFactoryWithOwner,
    "createIdentity",
    [newManagementKey, identitySalt],
    "创建身份",
    provider,
    rpcUrl
  );

  console.log(`新身份创建成功, 地址: ${newIdentityAddress}`);
  
  // 获取 claimIssuer 地址和私钥（使用 initializeContracts 返回的配置）
  console.log("\n--- 获取 ClaimIssuer 信息 ---");
  const claimSchemeEcdsa = 1;
  
  const rwaIdentityABI = getContractABI("RWAIdentity");
  const newIdentity = new ethers.Contract(
    newIdentityAddress,
    rwaIdentityABI.length > 0 ? rwaIdentityABI : [
      "function addClaim(uint256 _topic, uint256 _scheme, address _issuer, bytes memory _signature, bytes memory _data, string memory _uri) external"
    ],
    newManagementKeyWallet
  );
  
  // 遍历所有 claim issuers，对每个 issuer 支持的所有 topics 都签名并添加 claim
  for (let i = 0; i < config.config.claimIssuers.length; i++) {
    const claimIssuerKey = `claimIssuer${i}_claimIssuer` as keyof typeof config.deploymentResults;
    const claimIssuerAddressValue = config.deploymentResults[claimIssuerKey];
    if (!claimIssuerAddressValue || typeof claimIssuerAddressValue !== 'string') {
      console.log(`跳过 Claim Issuer ${i}：未找到地址`);
      continue;
    }
    
    const claimIssuerAddress = ethers.getAddress(claimIssuerAddressValue);
    const claimIssuerPrivateKey = config.config.claimIssuers[i].privateKey;
    const claimIssuerWallet = new ethers.Wallet(claimIssuerPrivateKey, provider);
    const claimTopics = config.config.claimIssuers[i].claimTopics || [];
    
    console.log(`\n处理 Claim Issuer ${i}`);
    console.log(`ClaimIssuer 地址: ${claimIssuerAddress}`);
    console.log(`ClaimIssuer 钱包地址: ${claimIssuerWallet.address}`);
    console.log(`支持的 Topics: ${claimTopics.join(', ')}`);
    
    // 对该 issuer 支持的所有 topics 都执行签名和添加 claim
    for (const claimTopic of claimTopics) {
      console.log(`\n--- 为 topic ${claimTopic} 创建并签名 claim ---`);
      const data = "0x";
      
      // 使用独立的签名函数
      const sigBytes = await signClaim(
        newIdentityAddress,
        claimTopic,
        claimIssuerWallet,
        data
      );
      
      // 添加 claim 到新身份（使用 newManagementKey 的 wallet）
      console.log(`\n--- 添加 topic ${claimTopic} 的 claim 到新身份 ---`);
      try {
        await sendTransaction(
          newIdentity,
          "addClaim",
          [claimTopic, claimSchemeEcdsa, claimIssuerAddress, sigBytes, data, ""],
          `添加 topic ${claimTopic} 的 claim`,
          provider,
          rpcUrl
        );
        console.log(`✓ Topic ${claimTopic} 的 Claim 已添加到新身份`);
      } catch (error: any) {
        throw new Error(`添加 topic ${claimTopic} 的 claim 失败: ${error.message}`);
      }
    }
  }
  
  // 注册新身份到 Identity Registry
  console.log("\n--- 注册新身份到 Identity Registry ---");
  const countryCode = 840;
  
  try {
    await registerIdentity(config, newManagementKey, newIdentityAddress, countryCode, rpcUrl);
    console.log("✓ 身份已注册到 Identity Registry");
  } catch (error: any) {
    throw new Error(`注册身份失败: ${error.message}`);
  }
  
  // 验证身份是否已注册
  console.log("\n--- 验证身份注册状态 ---");
  try {
    const isVerified = await config.identityRegistry.isVerified(newManagementKey);
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

main()
  .then(() => {
    console.log("\n脚本执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("错误:", error);
    process.exit(1);
  });
