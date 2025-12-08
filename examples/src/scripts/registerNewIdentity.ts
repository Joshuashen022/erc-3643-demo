import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { createContractConfig } from "../utils/contracts.js";
import { createNewIdentity, registerNewIdentity } from "../utils/operations.js";

dotenv.config();

/**
 * 主函数：注册新身份
 */
async function main() {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("请设置 PRIVATE_KEY 环境变量");
  }

  // 创建 provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  console.log(`连接到 RPC: ${rpcUrl}`);

  const network = await provider.getNetwork();
  console.log(`网络: ${network.name} (Chain ID: ${network.chainId})`);

  // 创建 wallet
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`使用钱包地址: ${wallet.address}`);

  // 初始化合约配置（使用 Claim Issuer 各自的私钥）
  const contractConfig = await createContractConfig(provider, wallet, {
    useClaimIssuerPrivateKeys: true,
  });

  const newManagementKeyWallet = ethers.Wallet.createRandom().connect(contractConfig.provider);
  const newManagementKey = newManagementKeyWallet.address;
  const newManagementKeyPrivateKey = newManagementKeyWallet.privateKey;
  
  console.log(`新管理密钥地址: ${newManagementKey}`);
  console.log(`新管理密钥私钥: ${newManagementKeyPrivateKey}`);

  const fundingAmount = "0.0001";
  const tx = await wallet.sendTransaction({
    to: newManagementKey,
    value: ethers.parseEther(fundingAmount),
    
  });
  await tx.wait();
  console.log(`发送 ETH 到新管理密钥地址: ${newManagementKey}`);

  // 使用工具函数进行注册（传入已创建的身份信息）
  const registrationResult = await registerNewIdentity(
    contractConfig,
    newManagementKeyWallet,
    840, // countryCode
    "1234567890", // identitySalt
    rpcUrl
  );

  // 打印所有消息
  registrationResult.messages.forEach((msg) => console.log(msg));

  // 打印所有错误
  if (registrationResult.errors.length > 0) {
    console.error("\n=== 注册错误 ===");
    registrationResult.errors.forEach((error) => console.error(`✗ ${error}`));
  }

  // 如果注册失败，抛出错误
  if (!registrationResult.success) {
    throw new Error("注册失败，请查看上面的错误信息");
  }

  // 打印注册结果摘要
  if (registrationResult.newManagementKey && registrationResult.newIdentityAddress) {
    console.log("\n=== 注册结果摘要 ===");
    console.log(`新管理密钥地址: ${registrationResult.newManagementKey}`);
    console.log(`新管理密钥私钥: ${registrationResult.newManagementKeyPrivateKey}`);
    console.log(`新身份合约地址: ${registrationResult.newIdentityAddress}`);
    console.log(`国家代码: ${registrationResult.countryCode}`);
  }
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
