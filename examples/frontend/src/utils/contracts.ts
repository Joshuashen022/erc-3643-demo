import { ethers } from "ethers";
import { CHAIN_ID, NETWORK_CONFIG } from "./config";

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
 * 检查当前网络是否正确
 */
export async function checkNetwork(): Promise<{ correct: boolean; currentChainId?: number }> {
  if (typeof window === "undefined" || !window.ethereum) {
    return { correct: false };
  }

  try {
    const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
    const currentChainIdNum = parseInt(currentChainId, 16);
    const targetChainId = CHAIN_ID;

    return {
      correct: currentChainIdNum === targetChainId,
      currentChainId: currentChainIdNum,
    };
  } catch (error) {
    console.error("检查网络失败:", error);
    return { correct: false };
  }
}

/**
 * 切换到目标网络
 */
export async function switchToTargetNetwork(): Promise<boolean> {
  if (typeof window === "undefined" || !window.ethereum) {
    return false;
  }

  try {
    // 获取当前网络
    const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
    const targetChainId = `0x${CHAIN_ID.toString(16)}`;

    // 如果已经在目标网络，不需要切换
    if (currentChainId === targetChainId) {
      return true;
    }

    // 获取网络配置
    const networkConfig = NETWORK_CONFIG[CHAIN_ID as keyof typeof NETWORK_CONFIG];
    if (!networkConfig) {
      console.error(`不支持的网络 ChainId: ${CHAIN_ID}`);
      throw new Error(`不支持的网络 ChainId: ${CHAIN_ID}`);
    }

    // 尝试切换到目标网络
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: networkConfig.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // 如果网络不存在，尝试添加网络
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [networkConfig],
          });
          return true;
        } catch (addError: any) {
          console.error("添加网络失败:", addError);
          throw new Error(`无法添加网络: ${addError.message}`);
        }
      } else {
        throw switchError;
      }
    }
  } catch (error: any) {
    console.error("切换网络失败:", error);
    throw error;
  }
}

/**
 * 连接钱包并确保在正确的网络
 */
export async function connectWallet(provider: ethers.JsonRpcProvider): Promise<ethers.Signer | null> {
  if (typeof window !== "undefined" && window.ethereum) {
    try {
      // 首先请求账户权限
      await window.ethereum.request({ method: "eth_requestAccounts" });
      
      // 切换到目标网络
      await switchToTargetNetwork();
      
      // 创建 provider 和 signer
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await web3Provider.getSigner();
      
      // 验证网络是否正确
      const network = await web3Provider.getNetwork();
      if (Number(network.chainId) !== CHAIN_ID) {
        console.warn(`网络不匹配: 当前 ${network.chainId}, 期望 ${CHAIN_ID}`);
        // 即使不匹配也返回 signer，但会在控制台警告
      }
      
      return signer;
    } catch (error: any) {
      console.error("连接钱包失败:", error);
      // 如果是用户拒绝，不显示错误
      if (error.code === 4001) {
        throw new Error("用户拒绝了连接请求");
      }
      throw error;
    }
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

