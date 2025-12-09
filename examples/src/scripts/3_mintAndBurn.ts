import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { createContractConfig } from "../utils/contracts.js";
import { mintAndBurn } from "../utils/operations.js";

dotenv.config();

const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";

/**
 * 主函数：执行 Mint、Burn 和 Transfer 操作
 */
async function main() {
  // 获取私钥
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("请设置 PRIVATE_KEY 环境变量");
  }

  // 创建 provider 和 wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // 初始化合约配置（使用 Claim Issuer 各自的私钥）
  const contractConfig = await createContractConfig(provider, wallet, {
    useClaimIssuerPrivateKeys: true,
  });

  // 使用工具函数执行操作
  const amount = ethers.parseEther("1");
  const transferToAddress = "0x340ec02864d9CAFF4919BEbE4Ee63f64b99c7806";
  
  const result = await mintAndBurn(provider, contractConfig, {
    mintAmount: amount,
    mintTo: wallet.address,
    burnAmount: amount / 2n,
    burnFrom: wallet.address,
    transferAmount: amount / 10n,
    transferTo: transferToAddress,
    transferFrom: wallet.address,
    rpcUrl,
  });

  // 打印所有消息
  result.messages.forEach((msg) => console.log(msg));

  // 打印所有错误
  if (result.errors.length > 0) {
    console.error("\n=== 操作错误 ===");
    result.errors.forEach((error) => console.error(`✗ ${error}`));
  }

  // 如果操作失败，抛出错误
  if (!result.success) {
    throw new Error("操作失败，请查看上面的错误信息");
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
