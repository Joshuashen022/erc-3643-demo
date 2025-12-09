import { ethers } from "ethers";
import * as dotenv from "dotenv";
import mockModuleArtifact from "../../../out/MockModule.sol/MockModule.json" assert { type: "json" };

dotenv.config();

const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";

/**
 * 部署测试用 MockModule 合约
 */
async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("请设置 PRIVATE_KEY 环境变量（将作为部署者）");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const network = await provider.getNetwork();
  console.log(`连接到 RPC: ${rpcUrl} (chainId: ${network.chainId})`);
  console.log(`部署者地址: ${wallet.address}`);

  const factory = new ethers.ContractFactory(
    mockModuleArtifact.abi,
    mockModuleArtifact.bytecode?.object || mockModuleArtifact.bytecode,
    wallet
  );

  console.log("开始部署 MockModule...");
  const contract = await factory.deploy({
    gasLimit: 1_500_000n,
  });
  console.log(`交易哈希: ${contract.deploymentTransaction()?.hash}`);

  const deployed = await contract.waitForDeployment();
  const address = await deployed.getAddress();
  console.log(`MockModule 部署完成，地址: ${address}`);
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

