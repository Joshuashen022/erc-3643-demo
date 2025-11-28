import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

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
  suiteOwner: string;
  salt: string;
  tokenAddress: string;
  token: ethers.Contract;
  tokenABI: any[];
  identityRegistryAddress: string;
  identityRegistry: ethers.Contract;
  identityIdFactoryAddress: string;
  identityIdFactory: ethers.Contract;
  managementKey: string;
  identityAddress: string;
  privateKey: string;
}

/**
 * 初始化合约和配置
 */
export async function initializeContracts(
  rpcUrl: string,
  privateKey?: string,
  suiteOwner?: string,
  salt?: string,
  managementKey?: string
): Promise<ContractConfig> {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  console.log(`连接到 RPC: ${rpcUrl}`);

  const network = await provider.getNetwork();
  console.log(`网络: ${network.name} (Chain ID: ${network.chainId})`);

  const addresses = getContractAddresses(Number(network.chainId));

  const pk = privateKey || process.env.PRIVATE_KEY;
  if (!pk) {
    throw new Error("请设置 PRIVATE_KEY 环境变量");
  }
  const wallet = new ethers.Wallet(pk, provider);
  console.log(`使用钱包地址: ${wallet.address}`);

  const ownerRaw = suiteOwner || process.env.SUITE_OWNER || wallet.address;
  let owner: string;
  
  try {
    owner = ethers.getAddress(String(ownerRaw));
  } catch (error) {
    throw new Error(`Invalid suite owner address: ${ownerRaw}`);
  }

  console.log(`\n使用 Suite Owner: ${owner}`);

  const tokenSalt = salt || process.env.SALT || "trex-suite-1";
  console.log(`\n使用 Salt: ${tokenSalt}`);
  
  const trexFactoryABI = getContractABI("TREXFactory");
  const trexFactoryAddress = ethers.getAddress(addresses["TREXFactory"]);
  const trexFactory = new ethers.Contract(
    trexFactoryAddress,
    trexFactoryABI.length > 0 ? trexFactoryABI : [
      "function getToken(string memory) view returns (address)",
    ],
    provider
  );

  let tokenAddress: string;
  try {
    const tokenAddressRaw = await trexFactory.getToken(tokenSalt);
    tokenAddress = ethers.getAddress(String(tokenAddressRaw));
  } catch (error) {
    throw new Error(`Failed to get token address: ${error}`);
  }
  
  console.log(`Token address: ${tokenAddress}`);

  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Token address is zero - token may not be deployed with this salt");
  }

  const tokenABI = getContractABI("RWAToken");
  const token = new ethers.Contract(
    tokenAddress,
    tokenABI.length > 0 ? tokenABI : [
      "function identityRegistry() view returns (address)",
      "function mint(address _to, uint256 _amount) external",
      "function burn(address _userAddress, uint256 _amount) external",
      "function balanceOf(address) view returns (uint256)",
      "function totalSupply() view returns (uint256)",
      "function transfer(address _to, uint256 _amount) external returns (bool)",
      "function transferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
      "function approve(address _spender, uint256 _amount) external returns (bool)",
      "function allowance(address _owner, address _spender) external view returns (uint256)",
    ],
    wallet
  );

  let identityRegistryAddress: string;
  try {
    identityRegistryAddress = ethers.getAddress(String(await token.identityRegistry()));
  } catch (error) {
    throw new Error(`Failed to get identity registry address: ${error}`);
  }

  console.log(`Identity Registry address: ${identityRegistryAddress}`);

  const identityRegistryABI = getContractABI("RWAIdentityRegistry");
  const identityRegistry = new ethers.Contract(
    identityRegistryAddress,
    identityRegistryABI.length > 0 ? identityRegistryABI : [
      "function registerIdentity(address _userAddress, address _identity, uint16 _country) external",
      "function isVerified(address _userAddress) external view returns (bool)",
    ],
    wallet
  );

  const mgmtKey = managementKey || process.env.MANAGEMENT_KEY || wallet.address;
  const identityIdFactoryAddress = process.env.IDENTITY_ID_FACTORY || addresses["RWAIdentityIdFactory"];
  
  if (!identityIdFactoryAddress) {
    throw new Error("请设置 IDENTITY_ID_FACTORY 环境变量或确保 IdFactory 在部署日志中");
  }

  const idFactoryABI = getContractABI("RWAIdentityIdFactory");
  const identityIdFactory = new ethers.Contract(
    ethers.getAddress(identityIdFactoryAddress),
    idFactoryABI.length > 0 ? idFactoryABI : [
      "function getIdentity(address _wallet) view returns (address)",
    ],
    provider
  );

  let identityAddress: string;
  try {
    identityAddress = ethers.getAddress(String(await identityIdFactory.getIdentity(mgmtKey)));
  } catch (error) {
    throw new Error(`Failed to get identity address: ${error}`);
  }

  if (identityAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Identity address is zero - identity may not be deployed");
  }

  console.log(`Identity address: ${identityAddress}`);

  return {
    provider,
    wallet,
    suiteOwner: owner,
    salt: tokenSalt,
    tokenAddress,
    token,
    tokenABI,
    identityRegistryAddress,
    identityRegistry,
    identityIdFactoryAddress,
    identityIdFactory,
    managementKey: mgmtKey,
    identityAddress,
    privateKey: pk,
  };
}

