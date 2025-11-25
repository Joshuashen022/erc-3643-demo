import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { getContractAddresses, getContractABI } from "./utils/contracts";

dotenv.config();

/**
 * 主函数：与合约交互
 */
async function main() {
  // 连接到本地节点（Anvil）
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  console.log(`连接到 RPC: ${rpcUrl}`);

  // 获取网络信息
  const network = await provider.getNetwork();
  console.log(`网络: ${network.name} (Chain ID: ${network.chainId})`);

  const accounts = await provider.listAccounts();
  const defaultAccount = accounts.length > 0 
    ? (typeof accounts[0] === "string" ? accounts[0] : accounts[0].address)
    : "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  if (accounts.length > 0) {
    const balance = await provider.getBalance(defaultAccount);
    console.log(`账户 ${defaultAccount} 余额: ${ethers.formatEther(balance)} ETH`);
  }

  const addresses = getContractAddresses(Number(network.chainId));
  const suiteOwner = ethers.getAddress(process.env.SUITE_OWNER || defaultAccount);
  
  if (suiteOwner === "0x0000000000000000000000000000000000000000") {
    throw new Error("Suite owner should be set");
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

  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Token address is zero - token may not be deployed with this salt");
  }

  // 获取 Token 合约
  const tokenABI = getContractABI("RWAToken");
  const token = new ethers.Contract(
    tokenAddress, // 已经规范化
    tokenABI.length > 0 ? tokenABI : [
      "function compliance() view returns (address)",
      "function identityRegistry() view returns (address)",
      "function isAgent(address) view returns (bool)",
      "function owner() view returns (address)",
    ],
    provider
  );

  // 获取相关合约地址
  let complianceAddress: string;
  let identityRegistryAddress: string;
  try {
    complianceAddress = ethers.getAddress(String(await token.compliance()));
    identityRegistryAddress = ethers.getAddress(String(await token.identityRegistry()));
  } catch (error) {
    throw new Error(`Failed to get contract addresses: ${error}`);
  }

  console.log(`Compliance address: ${complianceAddress}`);
  console.log(`Identity Registry address: ${identityRegistryAddress}`);

  // 获取 IdentityRegistry 合约
  const identityRegistryABI = getContractABI("RWAIdentityRegistry");
  const identityRegistry = new ethers.Contract(
    identityRegistryAddress, // 已经规范化
    identityRegistryABI.length > 0 ? identityRegistryABI : [
      "function identityStorage() view returns (address)",
      "function issuersRegistry() view returns (address)",
      "function topicsRegistry() view returns (address)",
      "function isAgent(address) view returns (bool)",
      "function owner() view returns (address)",
    ],
    provider
  );

  // 获取子注册表地址
  let identityRegistryStorageAddress: string;
  let trustedIssuersRegistryAddress: string;
  let claimTopicsRegistryAddress: string;
  try {
    identityRegistryStorageAddress = ethers.getAddress(String(await identityRegistry.identityStorage()));
    trustedIssuersRegistryAddress = ethers.getAddress(String(await identityRegistry.issuersRegistry()));
    claimTopicsRegistryAddress = ethers.getAddress(String(await identityRegistry.topicsRegistry()));
  } catch (error) {
    throw new Error(`Failed to get registry addresses: ${error}`);
  }

  console.log(`Identity Registry Storage address: ${identityRegistryStorageAddress}`);
  console.log(`Trusted Issuers Registry address: ${trustedIssuersRegistryAddress}`);
  console.log(`Claim Topics Registry address: ${claimTopicsRegistryAddress}`);

  // 验证逻辑
  console.log("\n=== 开始验证 ===");

  // 验证 Identity Registry agent
  let isIdentityRegistryAgent: boolean;
  try {
    isIdentityRegistryAgent = await identityRegistry.isAgent(suiteOwner);
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
    isTokenAgent = await token.isAgent(suiteOwner);
  } catch (error) {
    throw new Error(`Failed to check Token agent: ${error}`);
  }
  if (!isTokenAgent) {
    throw new Error("Suite owner should be an agent of Token");
  }
  console.log(`✓ Token Agent: ${suiteOwner}`);

  const toAddressString = (addr: any): string => {
    return typeof addr === "string" ? addr : String(addr);
  };

  const tokenOwner = toAddressString(await token.owner());
  if (tokenOwner.toLowerCase() !== suiteOwner.toLowerCase()) {
    throw new Error(`Token owner should match suite owner. Expected: ${suiteOwner}, Got: ${tokenOwner}`);
  }
  console.log(`✓ Token Owner: ${tokenOwner}`);

  // 验证 Identity Registry owner
  const identityRegistryOwner = toAddressString(await identityRegistry.owner());
  if (identityRegistryOwner.toLowerCase() !== suiteOwner.toLowerCase()) {
    throw new Error(`Identity Registry owner should match suite owner. Expected: ${suiteOwner}, Got: ${identityRegistryOwner}`);
  }
  console.log(`✓ Identity Registry Owner: ${identityRegistryOwner}`);

  // 验证 Compliance owner
  const complianceABI = getContractABI("RWACompliance");
  const compliance = new ethers.Contract(
    complianceAddress, // 已经规范化
    complianceABI.length > 0 ? complianceABI : [
      "function owner() view returns (address)",
    ],
    provider
  );
  const complianceOwner = toAddressString(await compliance.owner());
  if (complianceOwner.toLowerCase() !== suiteOwner.toLowerCase()) {
    throw new Error(`Compliance owner should match suite owner. Expected: ${suiteOwner}, Got: ${complianceOwner}`);
  }
  console.log(`✓ Compliance Owner: ${complianceOwner}`);

  // 验证 Trusted Issuers Registry owner
  const trustedIssuersRegistryABI = getContractABI("RWATrustedIssuersRegistry");
  const trustedIssuersRegistry = new ethers.Contract(
    trustedIssuersRegistryAddress, // 已经规范化
    trustedIssuersRegistryABI.length > 0 ? trustedIssuersRegistryABI : [
      "function owner() view returns (address)",
    ],
    provider
  );
  const trustedIssuersRegistryOwner = toAddressString(await trustedIssuersRegistry.owner());
  if (trustedIssuersRegistryOwner.toLowerCase() !== suiteOwner.toLowerCase()) {
    throw new Error(`Trusted Issuers Registry owner should match suite owner. Expected: ${suiteOwner}, Got: ${trustedIssuersRegistryOwner}`);
  }
  console.log(`✓ Trusted Issuers Registry Owner: ${trustedIssuersRegistryOwner}`);

  // 验证 Claim Topics Registry owner
  const claimTopicsRegistryABI = getContractABI("RWAClaimTopicsRegistry");
  const claimTopicsRegistry = new ethers.Contract(
    claimTopicsRegistryAddress,
    claimTopicsRegistryABI.length > 0 ? claimTopicsRegistryABI : [
      "function owner() view returns (address)",
    ],
    provider
  );
  const claimTopicsRegistryOwner = toAddressString(await claimTopicsRegistry.owner());
  if (claimTopicsRegistryOwner.toLowerCase() !== suiteOwner.toLowerCase()) {
    throw new Error(`Claim Topics Registry owner should match suite owner. Expected: ${suiteOwner}, Got: ${claimTopicsRegistryOwner}`);
  }
  console.log(`✓ Claim Topics Registry Owner: ${claimTopicsRegistryOwner}`);

  // 验证 TREX Factory owner
  const trexFactoryOwner = toAddressString(await trexFactory.owner());
  if (trexFactoryOwner.toLowerCase() !== suiteOwner.toLowerCase()) {
    throw new Error(`TREX Factory owner should match suite owner. Expected: ${suiteOwner}, Got: ${trexFactoryOwner}`);
  }
  console.log(`✓ TREX Factory Owner: ${trexFactoryOwner}`);

  // 打印所有信息（与部署脚本格式一致）
  console.log("\n=== 合约信息汇总 ===");
  console.log(`Token: ${tokenAddress} Agent ${suiteOwner}`);
  console.log(`Identity Registry: ${identityRegistryAddress} Agent ${suiteOwner}`);
  console.log(`Token: ${tokenAddress} Owner ${suiteOwner}`);
  console.log(`Identity Registry: ${identityRegistryAddress} Owner ${suiteOwner}`);
  console.log(`Compliance: ${complianceAddress} Owner ${suiteOwner}`);
  console.log(`Trusted Issuers Registry: ${trustedIssuersRegistryAddress} Owner ${suiteOwner}`);
  console.log(`Claim Topics Registry: ${claimTopicsRegistryAddress} Owner ${suiteOwner}`);
  console.log(`TREX Factory: ${addresses["TREXFactory"]} Owner ${suiteOwner}`);

  console.log("\n✓ 所有验证通过！");

  // 生成 .env 文件
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

# Suite Owner (for reference)
SUITE_OWNER=${suiteOwner}
`;

  const envPath = path.join(__dirname, "frontend", ".env");
  fs.writeFileSync(envPath, envContent, "utf-8");
  console.log(`\n✓ 已生成 .env 文件: ${envPath}`);
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

