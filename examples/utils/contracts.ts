import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

/**
 * Deployment Results 结构体定义
 * 对应 deployment_results_*.json 文件结构
 */
export interface DeploymentResults {
  // Claim Issuers (动态字段，根据 claimIssuersCount 变化)
  [key: `claimIssuer${number}_claimIssuer`]: string;
  [key: `claimIssuer${number}_claimIssuerOwner`]: string;
  [key: `claimIssuer${number}_claimTopics`]: number[];
  
  // 固定字段
  claimIssuerGateway: string;
  claimIssuerGatewayOwner: string;
  claimIssuerIdFactory: string;
  claimIssuerIdFactoryOwner: string;
  claimIssuerImplementationAuthority: string;
  claimIssuersCount: number;
  claimTopicsRegistry: string;
  claimTopicsRegistryOwner: string;
  compliance: string;
  deployDate: number;
  identityGateway: string;
  identityGatewayOwner: string;
  identityIdFactory: string;
  identityIdFactoryOwner: string;
  identityImplementationAuthority: string;
  identityRegistry: string;
  identityRegistryOwner: string;
  identityRegistryStorage: string;
  identityRegistryStorageOwner: string;
  rwaClaimIssuerImpl: string;
  rwaIdentityImpl: string;
  suiteOwner: string;
  token: string;
  tokenOwner: string;
  trexFactory: string;
  trexFactoryOwner: string;
  trexGateway: string;
  trexGatewayOwner: string;
  trexImplementationAuthority: string;
  trexImplementationAuthorityOwner: string;
  trustedIssuersRegistry: string;
  trustedIssuersRegistryOwner: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
}

/**
 * Config 结构体定义
 * 对应 config.json 文件结构
 */
export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  irs: string;
  onchainId: string;
  irAgents: string[];
  tokenAgents: string[];
}

export interface ClaimIssuerConfig {
  privateKey: string;
  claimTopics: number[];
}

export interface OwnersConfig {
  claimIssuerGateway: string;
  claimIssuerIdFactory: string;
  identityIdFactory: string;
  identityGateway: string;
  token: string;
  identityRegistry: string;
  trexImplementationAuthority: string;
  trustedIssuersRegistry: string;
  claimTopicsRegistry: string;
  trexFactory: string;
  trexGateway: string;
}

export interface Config {
  token: TokenConfig;
  claimTopics: number[];
  claimIssuers: ClaimIssuerConfig[];
  owners: OwnersConfig;
}

/**
 * 从 Foundry 部署日志中读取合约地址
 */
export function getContractAddresses(chainId: number): Record<string, string> {
  const broadcastPath = path.join(
    __dirname,
    `../../broadcast/DeployERC3643.s.sol/${chainId}/run-latest.json`
  );

  if (!fs.existsSync(broadcastPath)) {
    console.error(`部署日志文件不存在: ${broadcastPath}`);
    console.log("请先运行部署脚本: forge script script/DeployERC3643.s.sol:DeployERC3643 --rpc-url http://127.0.0.1:8545 --private-key <key> --broadcast");
    process.exit(1);
  }

  const broadcastData = JSON.parse(fs.readFileSync(broadcastPath, "utf-8"));
  const addresses: Record<string, string> = {};

  for (const tx of broadcastData.transactions || []) {
    if (tx.contractName && tx.contractAddress) {
      addresses[tx.contractName] = tx.contractAddress;
    }
  }

  return addresses;
}

/**
 * 从 deployment_results JSON 文件中读取合约地址
 */
export function getDeploymentResults(chainId: number): DeploymentResults {
  const deploymentsDir = path.join(__dirname, `../../deployments`);
  
  if (!fs.existsSync(deploymentsDir)) {
    throw new Error(`部署结果目录不存在: ${deploymentsDir}`);
  }

  // 查找匹配 chainId 的部署结果文件
  const files = fs.readdirSync(deploymentsDir);
  const matchingFiles = files.filter(file => 
    file.startsWith(`deployment_results_${chainId}_`) && file.endsWith('.json')
  );

  if (matchingFiles.length === 0) {
    throw new Error(`未找到 chainId ${chainId} 的部署结果文件`);
  }

  // 使用最新的文件（按文件名排序，通常包含时间戳）
  const latestFile = matchingFiles.sort().reverse()[0];
  const filePath = path.join(deploymentsDir, latestFile);

  const deploymentData = JSON.parse(fs.readFileSync(filePath, "utf-8")) as DeploymentResults;
  return deploymentData;
}

/**
 * 从编译输出中读取 ABI
 */
export function getContractABI(contractName: string): any[] {
  const possiblePaths = [
    path.join(__dirname, `../../out/${contractName}.sol/${contractName}.json`),
  ];

  // fix for different contract names in out directory
  if (contractName === "RWATrustedIssuersRegistry") {
    possiblePaths.push(path.join(__dirname, `../../out/IdentityRegistry.sol/RWATrustedIssuersRegistry.json`));
  }
  if (contractName === "RWAClaimTopicsRegistry") {
    possiblePaths.push(path.join(__dirname, `../../out/IdentityRegistry.sol/RWAClaimTopicsRegistry.json`));
  }
  if (contractName === "RWAIdentity") {
    possiblePaths.push(path.join(__dirname, `../../out/Identity.sol/RWAIdentity.json`));
  }
  if (contractName === "RWAClaimIssuer") {
    possiblePaths.push(path.join(__dirname, `../../out/Identity.sol/RWAClaimIssuer.json`));
  }
  if (contractName === "RWAIdentityRegistry") {
    possiblePaths.push(path.join(__dirname, `../../out/IdentityRegistry.sol/RWAIdentityRegistry.json`));
  }
  if (contractName === "RWAClaimIssuerIdFactory") {
    possiblePaths.push(path.join(__dirname, `../../out/RWAClaimIssuerIdFactory.sol/RWAClaimIssuerIdFactory.json`));
  }
  if (contractName === "RWAClaimIssuerGateway") {
    possiblePaths.push(path.join(__dirname, `../../out/RWAClaimIssuerIdFactory.sol/RWAClaimIssuerGateway.json`));
  }
  if (contractName === "RWAIdentityIdFactory") {
    possiblePaths.push(path.join(__dirname, `../../out/RWAIdentityIdFactory.sol/RWAIdentityIdFactory.json`));
  }
  if (contractName === "RWAIdentityGateway") {
    possiblePaths.push(path.join(__dirname, `../../out/RWAIdentityIdFactory.sol/RWAIdentityGateway.json`));
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
 * 合约配置接口
 */
export interface ContractConfig {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Wallet;
  
  // Token
  token: ethers.Contract;
  
  // Identity Registry
  identityRegistry: ethers.Contract;
  
  // Identity Factory & Gateway
  identityIdFactory: ethers.Contract;
  identityGateway: ethers.Contract;
  
  // Claim Issuer Factory & Gateway
  claimIssuerIdFactory: ethers.Contract;
  claimIssuerGateway: ethers.Contract;
  
  // Registries
  claimTopicsRegistry: ethers.Contract;
  trustedIssuersRegistry: ethers.Contract;
  
  // Compliance
  compliance: ethers.Contract;
  
  // TREX Factory & Gateway
  trexFactory: ethers.Contract;
  trexGateway: ethers.Contract;
  
  // Claim Issuers
  claimIssuers: ethers.Contract[];
  
  // Deployment metadata
  deploymentResults: DeploymentResults;
  config: Config;
}

/**
 * 读取 config.json 文件
 */
export function getConfig(): Config {
  const configPath = path.join(__dirname, `../../config.json`);
  if (!fs.existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8")) as Config;
}

/**
 * 初始化合约和配置
 */
export async function initializeContracts(
  rpcUrl: string,
  privateKey?: string
): Promise<ContractConfig> {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  console.log(`连接到 RPC: ${rpcUrl}`);

  const network = await provider.getNetwork();
  console.log(`网络: ${network.name} (Chain ID: ${network.chainId})`);

  // 从 deployment_results JSON 文件读取所有合约地址
  const deploymentResults = getDeploymentResults(Number(network.chainId));
  console.log(`\n部署结果文件读取成功`);

  // 读取 config.json
  const config = getConfig();
  console.log(`\n配置文件读取成功\n`);

  // 获取私钥
  const pk = privateKey || process.env.PRIVATE_KEY;
  if (!pk) {
    throw new Error("请设置 PRIVATE_KEY 环境变量");
  }
  const wallet = new ethers.Wallet(pk, provider);
  console.log(`使用钱包地址: ${wallet.address}`);

  // Token
  const tokenAddress = ethers.getAddress(deploymentResults.token);
  console.log(`Token address: ${tokenAddress}`);
  const tokenABI = getContractABI("RWAToken");
  const token = new ethers.Contract(tokenAddress, tokenABI, wallet);

  // Identity Registry
  const identityRegistryAddress = ethers.getAddress(deploymentResults.identityRegistry);
  console.log(`Identity Registry address: ${identityRegistryAddress}`);
  const identityRegistryABI = getContractABI("RWAIdentityRegistry");
  const identityRegistry = new ethers.Contract(identityRegistryAddress, identityRegistryABI, wallet);

  // Identity Factory & Gateway
  const identityIdFactoryAddress = ethers.getAddress(deploymentResults.identityIdFactory);
  console.log(`Identity Id Factory address: ${identityIdFactoryAddress}`);
  const identityIdFactoryABI = getContractABI("RWAIdentityIdFactory");
  const identityIdFactory = new ethers.Contract(identityIdFactoryAddress, identityIdFactoryABI, wallet);

  const identityGatewayAddress = ethers.getAddress(deploymentResults.identityGateway);
  const identityGatewayABI = getContractABI("RWAIdentityGateway");
  const identityGateway = new ethers.Contract(identityGatewayAddress, identityGatewayABI, wallet);

  // Claim Issuer Factory & Gateway
  const claimIssuerIdFactoryAddress = ethers.getAddress(deploymentResults.claimIssuerIdFactory);
  const claimIssuerIdFactoryABI = getContractABI("RWAClaimIssuerIdFactory");
  const claimIssuerIdFactory = new ethers.Contract(claimIssuerIdFactoryAddress, claimIssuerIdFactoryABI, wallet);

  const claimIssuerGatewayAddress = ethers.getAddress(deploymentResults.claimIssuerGateway);
  const claimIssuerGatewayABI = getContractABI("RWAClaimIssuerGateway");
  const claimIssuerGateway = new ethers.Contract(claimIssuerGatewayAddress, claimIssuerGatewayABI, wallet);

  // Registries
  const claimTopicsRegistryAddress = ethers.getAddress(deploymentResults.claimTopicsRegistry);
  const claimTopicsRegistryABI = getContractABI("RWAClaimTopicsRegistry");
  const claimTopicsRegistry = new ethers.Contract(claimTopicsRegistryAddress, claimTopicsRegistryABI, wallet);

  const trustedIssuersRegistryAddress = ethers.getAddress(deploymentResults.trustedIssuersRegistry);
  const trustedIssuersRegistryABI = getContractABI("RWATrustedIssuersRegistry");
  const trustedIssuersRegistry = new ethers.Contract(trustedIssuersRegistryAddress, trustedIssuersRegistryABI, wallet);

  // Compliance
  const complianceAddress = ethers.getAddress(deploymentResults.compliance);
  const complianceABI = getContractABI("RWACompliance");
  const compliance = new ethers.Contract(complianceAddress, complianceABI, wallet);

  // TREX Factory & Gateway
  const trexFactoryAddress = ethers.getAddress(deploymentResults.trexFactory);
  const trexFactoryABI = getContractABI("TREXFactory");
  const trexFactory = new ethers.Contract(trexFactoryAddress, trexFactoryABI, wallet);

  const trexGatewayAddress = ethers.getAddress(deploymentResults.trexGateway);
  const trexGatewayABI = getContractABI("TREXGateway");
  const trexGateway = new ethers.Contract(trexGatewayAddress, trexGatewayABI, wallet);

  // Claim Issuers - 从 config.json 读取配置，从 deployment_results 读取地址
  const claimIssuers: ethers.Contract[] = [];
  const claimIssuerABI = getContractABI("RWAClaimIssuer");
  
  if (!config.claimIssuers || !Array.isArray(config.claimIssuers)) {
    throw new Error("config.json 中未找到 claimIssuers 配置");
  }

  for (let i = 0; i < config.claimIssuers.length; i++) {
    const claimIssuerKey = `claimIssuer${i}_claimIssuer` as keyof DeploymentResults;
    const claimIssuerAddressValue = deploymentResults[claimIssuerKey];
    if (!claimIssuerAddressValue || typeof claimIssuerAddressValue !== 'string') {
      throw new Error(`部署结果中未找到 ${claimIssuerKey}`);
    }
    const claimIssuerAddress = ethers.getAddress(claimIssuerAddressValue);
    const claimIssuerPrivateKey = config.claimIssuers[i].privateKey;
    const claimIssuerWallet = new ethers.Wallet(claimIssuerPrivateKey, provider);
    const claimIssuer = new ethers.Contract(claimIssuerAddress, claimIssuerABI, claimIssuerWallet);
    
    claimIssuers.push(claimIssuer);
    console.log(`Claim Issuer ${i} address: ${claimIssuerAddress}`);
  }

  return {
    provider,
    wallet,
    
    // Token
    token,
    
    // Identity Registry
    identityRegistry,
    
    // Identity Factory & Gateway
    identityIdFactory,
    identityGateway,
    
    // Claim Issuer Factory & Gateway
    claimIssuerIdFactory,
    claimIssuerGateway,
    
    // Registries
    claimTopicsRegistry,
    trustedIssuersRegistry,
    
    // Compliance
    compliance,
    
    // TREX Factory & Gateway
    trexFactory,
    trexGateway,
    
    // Claim Issuers
    claimIssuers,
    
    // Deployment metadata
    deploymentResults,
    config,
  };
}

