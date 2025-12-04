import { ethers } from "ethers";
import configData from "../../../config.json";
import deploymentResults31337 from "../../../deployments/deployment_results_31337_1.json";
import deploymentResults84532 from "../../../deployments/deployment_results_84532_1764747970.json";
import tokenABI from "../../../out/RWAToken.sol/RWAToken.json";
import identityRegistryABI from "../../../out/IdentityRegistry.sol/RWAIdentityRegistry.json";
import identityIdFactoryABI from "../../../out/RWAIdentityIdFactory.sol/RWAIdentityIdFactory.json";
import identityGatewayABI from "../../../out/RWAIdentityIdFactory.sol/RWAIdentityGateway.json";
import claimIssuerIdFactoryABI from "../../../out/RWAClaimIssuerIdFactory.sol/RWAClaimIssuerIdFactory.json";
import claimIssuerGatewayABI from "../../../out/RWAClaimIssuerIdFactory.sol/RWAClaimIssuerGateway.json";
import claimTopicsRegistryABI from "../../../out/IdentityRegistry.sol/RWAClaimTopicsRegistry.json";
import trustedIssuersRegistryABI from "../../../out/IdentityRegistry.sol/RWATrustedIssuersRegistry.json";
import complianceABI from "../../../out/RWACompliance.sol/RWACompliance.json";
import trexFactoryABI from "../../../out/TREXFactory.sol/TREXFactory.json";
import trexGatewayABI from "../../../out/TREXGateway.sol/TREXGateway.json";
import claimIssuerABI from "../../../out/Identity.sol/RWAClaimIssuer.json";
// import identityRegistryStorageABI from "../../../out/IdentityRegistry.sol/RWAIdentityRegistryStorage.json";


/**
 * Deployment Results 结构体定义
 * 对应 deployment_results_*.json 文件结构
 */
export interface DeploymentResults {
  // Optional fields (may be present in some JSON files)
  chainId?: number;
  deployer?: string;
  suiteOwner?: string;
  
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
 * 从 deployment_results JSON 文件中读取合约地址
 * 直接导入 JSON 文件，不使用路径拼接
 */
export function getDeploymentResults(chainId: number): DeploymentResults {
  // 根据 chainId 直接返回对应的导入数据
  if (chainId === 31337) {
    return deploymentResults31337 as unknown as DeploymentResults;
  } else if (chainId === 84532) {
    return deploymentResults84532 as unknown as DeploymentResults;
  } else {
    throw new Error(`未找到 chainId ${chainId} 的部署结果文件`);
  }
}

/**
 * 从编译输出中读取 ABI
 * 注意：此函数已移除文件系统依赖，需要直接导入 ABI JSON 文件
 * 建议：直接导入需要的 ABI 文件，例如：import tokenABI from "../../../out/RWAToken.sol/RWAToken.json"
 */
export function getContractABI(contractName: string): any[] {
  console.warn(`getContractABI 已移除文件系统支持，请直接导入 ABI JSON 文件: ${contractName}`);
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
 * 直接导入 JSON 文件，无需使用 fs 读取
 */
export function getConfig(): Config {
  return configData as Config;
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
  const token = new ethers.Contract(tokenAddress, tokenABI.abi, wallet);

  // Identity Registry
  const identityRegistryAddress = ethers.getAddress(deploymentResults.identityRegistry);
  console.log(`Identity Registry address: ${identityRegistryAddress}`);
  const identityRegistry = new ethers.Contract(identityRegistryAddress, identityRegistryABI.abi, wallet);

  // Identity Factory & Gateway
  const identityIdFactoryAddress = ethers.getAddress(deploymentResults.identityIdFactory);
  console.log(`Identity Id Factory address: ${identityIdFactoryAddress}`);
  const identityIdFactory = new ethers.Contract(identityIdFactoryAddress, identityIdFactoryABI.abi, wallet);

  const identityGatewayAddress = ethers.getAddress(deploymentResults.identityGateway);
  const identityGateway = new ethers.Contract(identityGatewayAddress, identityGatewayABI.abi, wallet);

  // Claim Issuer Factory & Gateway
  const claimIssuerIdFactoryAddress = ethers.getAddress(deploymentResults.claimIssuerIdFactory);
  const claimIssuerIdFactory = new ethers.Contract(claimIssuerIdFactoryAddress, claimIssuerIdFactoryABI.abi, wallet);

  const claimIssuerGatewayAddress = ethers.getAddress(deploymentResults.claimIssuerGateway);
  const claimIssuerGateway = new ethers.Contract(claimIssuerGatewayAddress, claimIssuerGatewayABI.abi, wallet);

  // Registries
  const claimTopicsRegistryAddress = ethers.getAddress(deploymentResults.claimTopicsRegistry);
  const claimTopicsRegistry = new ethers.Contract(claimTopicsRegistryAddress, claimTopicsRegistryABI.abi, wallet);

  const trustedIssuersRegistryAddress = ethers.getAddress(deploymentResults.trustedIssuersRegistry);  
  const trustedIssuersRegistry = new ethers.Contract(trustedIssuersRegistryAddress, trustedIssuersRegistryABI.abi, wallet);

  // Compliance
  const complianceAddress = ethers.getAddress(deploymentResults.compliance);
  const compliance = new ethers.Contract(complianceAddress, complianceABI.abi, wallet);

  // TREX Factory & Gateway
  const trexFactoryAddress = ethers.getAddress(deploymentResults.trexFactory);
  const trexFactory = new ethers.Contract(trexFactoryAddress, trexFactoryABI.abi, wallet);

  const trexGatewayAddress = ethers.getAddress(deploymentResults.trexGateway);
  const trexGateway = new ethers.Contract(trexGatewayAddress, trexGatewayABI.abi, wallet);

  // Claim Issuers - 从 config.json 读取配置，从 deployment_results 读取地址
  const claimIssuers: ethers.Contract[] = [];
  
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
    const claimIssuer = new ethers.Contract(claimIssuerAddress, claimIssuerABI.abi, claimIssuerWallet);
    
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

/**
 * 前端工具函数：创建 Provider
 */
export function getProvider(rpcUrl: string): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * 前端工具函数：连接钱包（MetaMask）
 * @param provider - 保留参数以保持 API 兼容性，实际使用 BrowserProvider 时不需要
 */
export async function connectWallet(
  _provider?: ethers.JsonRpcProvider
): Promise<ethers.JsonRpcSigner | null> {
  if (typeof window === "undefined" || !window.ethereum) {
    return null;
  }

  try {
    // 请求连接账户
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    // 创建 BrowserProvider
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    
    // 获取 Signer
    const signer = await browserProvider.getSigner();
    
    return signer as ethers.JsonRpcSigner;
  } catch (error: any) {
    if (error.code === 4001) {
      // 用户拒绝连接
      throw new Error("用户拒绝了连接请求");
    }
    throw error;
  }
}

/**
 * 前端工具函数：检查网络
 */
export async function checkNetwork(targetChainId?: number): Promise<{ correct: boolean; currentChainId?: number }> {
  if (typeof window === "undefined" || !window.ethereum) {
    return { correct: false };
  }

  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    const currentChainId = parseInt(chainId, 16);
    
    if (targetChainId !== undefined) {
      return {
        correct: currentChainId === targetChainId,
        currentChainId,
      };
    }
    
    return {
      correct: true,
      currentChainId,
    };
  } catch (error) {
    return { correct: false };
  }
}

/**
 * 前端工具函数：切换到目标网络
 */
export async function switchToTargetNetwork(targetChainId: number): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("请安装 MetaMask");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${targetChainId.toString(16)}` }],
    });
  } catch (error: any) {
    if (error.code === 4902) {
      // 链不存在，需要添加
      throw new Error(`网络 ChainId ${targetChainId} 未添加到 MetaMask，请手动添加`);
    }
    throw error;
  }
}

/**
 * 前端工具函数：切换到指定网络（别名，保持向后兼容）
 */
export async function switchToNetwork(chainId: number): Promise<void> {
  return switchToTargetNetwork(chainId);
}

/**
 * 前端工具函数：根据 chainId 获取合约地址
 */
export function getContractAddresses(chainId: number): Partial<Record<string, string>> {
  try {
    const deploymentResults = getDeploymentResults(chainId);
    return {
      token: deploymentResults.token,
      identityRegistry: deploymentResults.identityRegistry,
      identityIdFactory: deploymentResults.identityIdFactory,
      identityGateway: deploymentResults.identityGateway,
      claimIssuerIdFactory: deploymentResults.claimIssuerIdFactory,
      claimIssuerGateway: deploymentResults.claimIssuerGateway,
      claimTopicsRegistry: deploymentResults.claimTopicsRegistry,
      trustedIssuersRegistry: deploymentResults.trustedIssuersRegistry,
      compliance: deploymentResults.compliance,
      trexFactory: deploymentResults.trexFactory,
      trexGateway: deploymentResults.trexGateway,
      trexImplementationAuthority: deploymentResults.trexImplementationAuthority,
      identityRegistryStorage: deploymentResults.identityRegistryStorage,
    };
  } catch (error) {
    console.error(`获取 chainId ${chainId} 的合约地址失败:`, error);
    return {};
  }
}

/**
 * 前端工具函数：创建合约实例（只读）
 */
export function getContract(
  address: string,
  abi: any[],
  providerOrSigner: ethers.Provider | ethers.Signer
): ethers.Contract {
  return new ethers.Contract(address, abi, providerOrSigner);
}

