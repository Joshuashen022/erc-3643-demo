import { ethers } from "ethers";

export interface ContractAddresses {
  claimTopicsRegistry?: string;
  identityRegistry?: string;
  identityRegistryStorage?: string;
  trustedIssuersRegistry?: string;
  token?: string;
  modularCompliance?: string;
}

/**
 * 从部署日志读取合约地址（简化版，实际使用时需要根据部署脚本调整）
 */
export function getContractAddresses(chainId: number): ContractAddresses {
  // 这里应该从部署日志读取，暂时返回空对象，由用户手动配置
  return {};
}

/**
 * 从编译输出中读取 ABI
 */
export async function getContractABI(contractName: string): Promise<any[]> {
  const possiblePaths: string[] = [
    `/out/${contractName}.sol/${contractName}.json`,
  ];

  // fix for different contract names in out directory
  if (contractName === "RWATrustedIssuersRegistry") {
    possiblePaths.push(`/out/IdentityRegistry.sol/RWATrustedIssuersRegistry.json`);
  }
  if (contractName === "RWAClaimTopicsRegistry") {
    possiblePaths.push(`/out/IdentityRegistry.sol/RWAClaimTopicsRegistry.json`);
  }
  if (contractName === "RWAIdentity") {
    possiblePaths.push(`/out/Identity.sol/RWAIdentity.json`);
  }
  if (contractName === "RWAClaimIssuer") {
    possiblePaths.push(`/out/Identity.sol/RWAClaimIssuer.json`);
  }
  if (contractName === "RWAIdentityRegistry") {
    possiblePaths.push(`/out/IdentityRegistry.sol/RWAIdentityRegistry.json`);
  }

  for (const abiPath of possiblePaths) {
    try {
      const response = await fetch(abiPath);
      if (response.ok) {
        const contractData = await response.json();
        return contractData.abi || [];
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }

  console.warn(`未找到 ${contractName} 的 ABI，使用空数组`);
  return [];
}

/**
 * 初始化 Provider
 */
export function getProvider(rpcUrl: string): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * 连接钱包
 */
export async function connectWallet(provider: ethers.JsonRpcProvider): Promise<ethers.Signer | null> {
  if (typeof window !== "undefined" && window.ethereum) {
    // 使用 MetaMask
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const web3Provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await web3Provider.getSigner();
    return signer;
  }
  return null;
}

/**
 * 创建合约实例
 */
export function createContract(
  address: string,
  abi: any[],
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(address, abi, signerOrProvider);
}

