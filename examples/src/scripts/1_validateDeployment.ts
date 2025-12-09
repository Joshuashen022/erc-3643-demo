import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { validateDeployment } from "../utils/validateDeployment.js";
import { createContractConfig } from "../utils/contracts.js";

dotenv.config();


/**
 * 主函数：验证部署
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

  // 使用工具函数进行验证
  const validationResult = await validateDeployment(provider, contractConfig);

  // 打印所有消息
  validationResult.messages.forEach((msg) => console.log(msg));

  // 打印所有错误
  if (validationResult.errors.length > 0) {
    console.error("\n=== 验证错误 ===");
    validationResult.errors.forEach((error) => console.error(`✗ ${error}`));
  }

  // 如果验证失败，抛出错误
  if (!validationResult.success) {
    throw new Error("验证失败，请查看上面的错误信息");
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

