import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { createContractConfig } from "../utils/contracts.js";
import { sendTransaction } from "../utils/transactions.js";

dotenv.config();

const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";

/**
 * 在合规合约上移除已绑定的模块
 * 参考测试用例 DeployERC3643.t.sol 中的 remove module 场景
 */
async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const moduleAddressEnv = process.env.MODULE_ADDRESS;

  if (!privateKey) {
    throw new Error("请设置 PRIVATE_KEY 环境变量（应为合规模块所有者/套件所有者私钥）");
  }
  if (!moduleAddressEnv) {
    throw new Error("请设置 MODULE_ADDRESS 环境变量（要移除的模块合约地址）");
  }

  const moduleAddress = ethers.getAddress(moduleAddressEnv);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const config = await createContractConfig(provider, wallet, {
    useClaimIssuerPrivateKeys: true,
  });

  console.log(`使用钱包地址: ${wallet.address}`);
  console.log(`目标模块地址: ${moduleAddress}`);

  // 如果模块尚未绑定，先绑定一次便于演示完整流程
  const isBoundBefore = await config.compliance.isModuleBound(moduleAddress);
  if (!isBoundBefore) {
    console.log("模块未绑定，先执行 addModule 以便后续移除");
    await sendTransaction(
      config.compliance,
      "addModule",
      [moduleAddress],
      "AddModule",
      config.provider,
      rpcUrl
    );
  }

  const canTransfer = await config.compliance.canTransfer(
    "0x0000000000000000000000000000000000001111", 
    "0x0000000000000000000000000000000000002222", 
    ethers.parseEther("1")
  );
  console.log(`canTransfer => ${canTransfer}`);
  console.log("\n=== 移除模块 ===");
  await sendTransaction(
    config.compliance,
    "removeModule",
    [moduleAddress],
    "RemoveModule",
    config.provider,
    rpcUrl
  );

  // Post-checks 同测试逻辑
  const isBoundAfter = await config.compliance.isModuleBound(moduleAddress);
  const modules = await config.compliance.getModules();
  const found = modules.map((m: string) => ethers.getAddress(m)).includes(moduleAddress);

  console.log(`模块已移除: ${!isBoundAfter && !found}`);
  console.log(`当前模块列表: ${modules.join(", ") || "空"}`);
  const canTransferAfter = await config.compliance.canTransfer(
    "0x0000000000000000000000000000000000001111", 
    "0x0000000000000000000000000000000000002222", 
    ethers.parseEther("1")
  );
  console.log(`canTransferAfter => ${canTransferAfter}`);
  // 额外的 canTransfer 检查（使用与测试相同的默认值，可通过环境变量覆盖）
  
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

