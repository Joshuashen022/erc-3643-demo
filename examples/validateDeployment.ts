import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * 从 Foundry 部署日志中读取合约地址
 */
function getContractAddresses(chainId: number): Record<string, string> {
  const broadcastPath = path.join(
    __dirname,
    `../broadcast/DeployERC3643.s.sol/${chainId}/run-latest.json`
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

  // 获取账户余额
  const accounts = await provider.listAccounts();
  let defaultAccount: string | undefined;
  if (accounts.length > 0) {
    // accounts[0] 可能是 Signer 对象，需要提取地址
    const account = accounts[0];
    defaultAccount = typeof account === "string" ? account : account.address;
    const balance = await provider.getBalance(defaultAccount);
    console.log(`账户 ${defaultAccount} 余额: ${ethers.formatEther(balance)} ETH`);
  }

  // 读取合约地址
  const addresses = getContractAddresses(Number(network.chainId));
  
  // 获取 suiteOwner（部署者地址）
  const suiteOwnerRaw = process.env.SUITE_OWNER || defaultAccount || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  let suiteOwner: string;
  
  // 规范化地址，避免 ENS 解析问题
  try {
    // 如果 suiteOwnerRaw 是对象（如 Signer），提取地址属性
    let addressStr: string;
    if (typeof suiteOwnerRaw === "string") {
      addressStr = suiteOwnerRaw;
    } else if (suiteOwnerRaw && typeof suiteOwnerRaw === "object") {
      // 处理 Signer 对象或其他有 address 属性的对象
      const obj = suiteOwnerRaw as { address?: string | any };
      if (obj.address) {
        addressStr = typeof obj.address === "string" ? obj.address : String(obj.address);
      } else {
        addressStr = String(suiteOwnerRaw);
      }
    } else {
      addressStr = String(suiteOwnerRaw);
    }
    suiteOwner = ethers.getAddress(addressStr);
  } catch (error) {
    throw new Error(`Invalid suite owner address: ${suiteOwnerRaw}`);
  }
  
  if (!suiteOwner || suiteOwner === "0x0000000000000000000000000000000000000000") {
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

  // 辅助函数：将地址转换为字符串
  const toAddressString = (addr: any): string => {
    if (typeof addr === "string") return addr;
    return String(addr);
  };

  // 验证 Token owner
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

