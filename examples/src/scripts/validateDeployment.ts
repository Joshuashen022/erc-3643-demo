import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { initializeContracts, DeploymentResults } from "../utils/contracts.js";

dotenv.config();

/**
 * 辅助函数：将地址转换为字符串并规范化
 */
const toAddressString = (addr: any): string => {
  return ethers.getAddress(typeof addr === "string" ? addr : String(addr));
};

/**
 * 验证合约 owner
 */
async function verifyOwner(
  contract: ethers.Contract,
  contractName: string,
  expectedOwner: string
): Promise<void> {
  try {
    const actualOwner = toAddressString(await contract.owner());
    if (actualOwner.toLowerCase() !== expectedOwner.toLowerCase()) {
      throw new Error(
        `${contractName} owner mismatch. Expected: ${expectedOwner}, Got: ${actualOwner}`
      );
    }
    console.log(`✓ ${contractName} Owner: ${actualOwner} (matches deploymentResults)`);
  } catch (error: any) {
    if (error.message.includes("owner mismatch")) {
      throw error;
    }
    throw new Error(`Failed to verify ${contractName} owner: ${error.message}`);
  }
}

/**
 * 主函数：验证部署
 */
async function main() {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("请设置 PRIVATE_KEY 环境变量");
  }

  // 使用 initializeContracts 获取所有合约实例
  const contracts = await initializeContracts(rpcUrl, privateKey);
  const { deploymentResults, provider } = contracts;
  
  // suiteOwner 可能是可选的，如果没有则使用 tokenOwner 作为 fallback
  const suiteOwner = deploymentResults.suiteOwner 
    ? ethers.getAddress(deploymentResults.suiteOwner)
    : ethers.getAddress(deploymentResults.tokenOwner);

  console.log(`\n使用 Suite Owner: ${suiteOwner}`);

  // 获取 Token 地址（从 deploymentResults）
  const tokenAddress = ethers.getAddress(deploymentResults.token);
  console.log(`Token address: ${tokenAddress}`);

  // 获取相关合约地址
  let complianceAddress: string;
  let identityRegistryAddress: string;
  try {
    complianceAddress = toAddressString(await contracts.token.compliance());
    identityRegistryAddress = toAddressString(await contracts.token.identityRegistry());
  } catch (error) {
    throw new Error(`Failed to get contract addresses: ${error}`);
  }

  console.log(`Compliance address: ${complianceAddress}`);
  console.log(`Identity Registry address: ${identityRegistryAddress}`);

  // 验证 Compliance 地址是否匹配
  if (complianceAddress.toLowerCase() !== deploymentResults.compliance.toLowerCase()) {
    throw new Error(
      `Compliance address mismatch. Expected: ${deploymentResults.compliance}, Got: ${complianceAddress}`
    );
  }

  // 获取子注册表地址
  let identityRegistryStorageAddress: string;
  let trustedIssuersRegistryAddress: string;
  let claimTopicsRegistryAddress: string;
  try {
    identityRegistryStorageAddress = toAddressString(await contracts.identityRegistry.identityStorage());
    trustedIssuersRegistryAddress = toAddressString(await contracts.identityRegistry.issuersRegistry());
    claimTopicsRegistryAddress = toAddressString(await contracts.identityRegistry.topicsRegistry());
  } catch (error) {
    throw new Error(`Failed to get registry addresses: ${error}`);
  }

  console.log(`Identity Registry Storage address: ${identityRegistryStorageAddress}`);
  console.log(`Trusted Issuers Registry address: ${trustedIssuersRegistryAddress}`);
  console.log(`Claim Topics Registry address: ${claimTopicsRegistryAddress}`);

  // 验证地址是否匹配 deploymentResults
  if (identityRegistryStorageAddress.toLowerCase() !== deploymentResults.identityRegistryStorage.toLowerCase()) {
    throw new Error(
      `Identity Registry Storage address mismatch. Expected: ${deploymentResults.identityRegistryStorage}, Got: ${identityRegistryStorageAddress}`
    );
  }
  if (trustedIssuersRegistryAddress.toLowerCase() !== deploymentResults.trustedIssuersRegistry.toLowerCase()) {
    throw new Error(
      `Trusted Issuers Registry address mismatch. Expected: ${deploymentResults.trustedIssuersRegistry}, Got: ${trustedIssuersRegistryAddress}`
    );
  }
  if (claimTopicsRegistryAddress.toLowerCase() !== deploymentResults.claimTopicsRegistry.toLowerCase()) {
    throw new Error(
      `Claim Topics Registry address mismatch. Expected: ${deploymentResults.claimTopicsRegistry}, Got: ${claimTopicsRegistryAddress}`
    );
  }

  // 验证逻辑
  console.log("\n=== 开始验证 Owner 关系 ===");

  // 验证 Identity Registry agent
  let isIdentityRegistryAgent: boolean;
  try {
    isIdentityRegistryAgent = await contracts.identityRegistry.isAgent(suiteOwner);
  } catch (error) {
    throw new Error(`Failed to check Identity Registry agent: ${error}`);
  }
  if (!isIdentityRegistryAgent) {
    throw new Error("Suite owner should be an agent of Identity Registry");
  }
  console.log(`✓ Identity Registry Agent: ${suiteOwner}`);

  // 验证 Token agent
  let isTokenAgent: boolean;
  try {
    isTokenAgent = await contracts.token.isAgent(suiteOwner);
  } catch (error) {
    throw new Error(`Failed to check Token agent: ${error}`);
  }
  if (!isTokenAgent) {
    throw new Error("Suite owner should be an agent of Token");
  }
  console.log(`✓ Token Agent: ${suiteOwner}`);

  // 验证所有合约的 owner 是否与 deploymentResults 中的 owner 匹配
  await verifyOwner(contracts.token, "Token", deploymentResults.tokenOwner);
  await verifyOwner(contracts.identityRegistry, "Identity Registry", deploymentResults.identityRegistryOwner);
  await verifyOwner(contracts.compliance, "Compliance", suiteOwner);
  await verifyOwner(contracts.trustedIssuersRegistry, "Trusted Issuers Registry", deploymentResults.trustedIssuersRegistryOwner);
  await verifyOwner(contracts.claimTopicsRegistry, "Claim Topics Registry", deploymentResults.claimTopicsRegistryOwner);
  await verifyOwner(contracts.trexFactory, "TREX Factory", deploymentResults.trexFactoryOwner);
  await verifyOwner(contracts.identityIdFactory, "Identity Id Factory", deploymentResults.identityIdFactoryOwner);
  await verifyOwner(contracts.identityGateway, "Identity Gateway", deploymentResults.identityGatewayOwner);
  await verifyOwner(contracts.claimIssuerIdFactory, "Claim Issuer Id Factory", deploymentResults.claimIssuerIdFactoryOwner);
  await verifyOwner(contracts.claimIssuerGateway, "Claim Issuer Gateway", deploymentResults.claimIssuerGatewayOwner);

  const claimIssuersCount = deploymentResults.claimIssuersCount || 0;

  // 打印所有信息（与部署脚本格式一致）
  console.log("\n=== 合约信息汇总 ===");
  console.log(`Token: ${tokenAddress} Owner ${deploymentResults.tokenOwner}`);
  console.log(`Identity Registry: ${identityRegistryAddress} Owner ${deploymentResults.identityRegistryOwner}`);
  console.log(`Compliance: ${complianceAddress} Owner ${suiteOwner}`);
  console.log(`Trusted Issuers Registry: ${trustedIssuersRegistryAddress} Owner ${deploymentResults.trustedIssuersRegistryOwner}`);
  console.log(`Claim Topics Registry: ${claimTopicsRegistryAddress} Owner ${deploymentResults.claimTopicsRegistryOwner}`);
  console.log(`TREX Factory: ${deploymentResults.trexFactory} Owner ${deploymentResults.trexFactoryOwner}`);
  console.log(`Identity Id Factory: ${deploymentResults.identityIdFactory} Owner ${deploymentResults.identityIdFactoryOwner}`);
  console.log(`Identity Gateway: ${deploymentResults.identityGateway} Owner ${deploymentResults.identityGatewayOwner}`);
  console.log(`Claim Issuer Id Factory: ${deploymentResults.claimIssuerIdFactory} Owner ${deploymentResults.claimIssuerIdFactoryOwner}`);
  console.log(`Claim Issuer Gateway: ${deploymentResults.claimIssuerGateway} Owner ${deploymentResults.claimIssuerGatewayOwner}`);

  // 打印所有 Claim Issuers 的信息
  console.log("\n=== Claim Issuers 信息汇总 ===");
  for (let i = 0; i < claimIssuersCount; i++) {
    const claimIssuerKey = `claimIssuer${i}_claimIssuer` as keyof DeploymentResults;
    const claimIssuerOwnerKey = `claimIssuer${i}_claimIssuerOwner` as keyof DeploymentResults;
    const claimTopicsKey = `claimIssuer${i}_claimTopics` as keyof DeploymentResults;

    const claimIssuerAddress = toAddressString(deploymentResults[claimIssuerKey] as string);
    const claimIssuerOwner = toAddressString(deploymentResults[claimIssuerOwnerKey] as string);
    const claimTopics = deploymentResults[claimTopicsKey] as number[];

    console.log(
      `Claim Issuer ${i}: ${claimIssuerAddress} Owner ${claimIssuerOwner} Claim Topics [${claimTopics.join(', ')}]`
    );
  }

  console.log("\n✓ 所有验证通过！");

  // 获取网络信息用于生成 .env 文件
  const network = await provider.getNetwork();

  // 生成 .env 文件
  let claimIssuersEnvSection = '';
  for (let i = 0; i < claimIssuersCount; i++) {
    const claimIssuerKey = `claimIssuer${i}_claimIssuer` as keyof DeploymentResults;
    const claimIssuerAddress = toAddressString(deploymentResults[claimIssuerKey] as string);
    claimIssuersEnvSection += `VITE_CLAIM_ISSUER_${i}=${claimIssuerAddress}\n`;
  }

  const envContent = `# RPC Configuration
# this file is generated by validateDeployment.ts, do not modify it manually

VITE_RPC_URL=${rpcUrl}
VITE_CHAIN_ID=${network.chainId}

# Contract Addresses
VITE_TOKEN=${tokenAddress}
VITE_MODULAR_COMPLIANCE=${complianceAddress}
VITE_IDENTITY_REGISTRY=${identityRegistryAddress}
VITE_IDENTITY_REGISTRY_STORAGE=${identityRegistryStorageAddress}
VITE_TRUSTED_ISSUERS_REGISTRY=${trustedIssuersRegistryAddress}
VITE_CLAIM_TOPICS_REGISTRY=${claimTopicsRegistryAddress}
VITE_RWA_CLAIM_ISSUER_ID_FACTORY=${deploymentResults.claimIssuerIdFactory}
VITE_RWA_CLAIM_ISSUER_GATEWAY=${deploymentResults.claimIssuerGateway}
VITE_RWA_IDENTITY_ID_FACTORY=${deploymentResults.identityIdFactory}
VITE_RWA_IDENTITY_GATEWAY=${deploymentResults.identityGateway}
# Claim Issuers
${claimIssuersEnvSection}# Suite Owner (for reference)
SUITE_OWNER=${suiteOwner}
`;

  console.log(envContent);
  // const envPath = path.join(__dirname, "frontend", ".env");
  // fs.writeFileSync(envPath, envContent, "utf-8");
  // console.log(`\n✓ 已生成 .env 文件: ${envPath}`);
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

