/**
 * 从 Foundry 部署日志中读取合约地址
 * 参考 examples/utils/contracts.ts 中的 getContractAddresses 函数
 */
function getContractAddresses(chainId: number): Record<string, string> {
  // 在浏览器环境中，无法直接读取文件系统
  // 优先从环境变量读取，如果没有则返回空对象
  if (typeof window !== "undefined") {
    // 浏览器环境：从环境变量读取
    return {
      claimTopicsRegistry: import.meta.env.VITE_CLAIM_TOPICS_REGISTRY || "",
      identityRegistry: import.meta.env.VITE_IDENTITY_REGISTRY || "",
      identityRegistryStorage: import.meta.env.VITE_IDENTITY_REGISTRY_STORAGE || "",
      trustedIssuersRegistry: import.meta.env.VITE_TRUSTED_ISSUERS_REGISTRY || "",
      token: import.meta.env.VITE_TOKEN || "",
      modularCompliance: import.meta.env.VITE_MODULAR_COMPLIANCE || "",
    };
  }

  // Node.js 环境（开发/构建时）：从部署日志读取
  // 注意：在 Vite 构建时，这部分代码可能不会被执行
  try {
    // 使用动态导入以避免在浏览器环境中报错
    const fs = typeof require !== "undefined" ? require("fs") : null;
    const path = typeof require !== "undefined" ? require("path") : null;
    
    if (!fs || !path) {
      return {};
    }
    
    const broadcastPath = path.join(
      process.cwd(),
      `../../broadcast/DeployERC3643.s.sol/${chainId}/run-latest.json`
    );

    if (!fs.existsSync(broadcastPath)) {
      console.warn(`部署日志文件不存在: ${broadcastPath}`);
      return {};
    }

    const broadcastData = JSON.parse(fs.readFileSync(broadcastPath, "utf-8"));
    const addresses: Record<string, string> = {};

    // 从部署日志中提取合约地址
    for (const tx of broadcastData.transactions || []) {
      if (tx.contractName && tx.contractAddress) {
        const contractName = tx.contractName;
        const contractAddress = tx.contractAddress;

        // 映射合约名称到配置字段
        // 优先使用 Proxy 合约地址（如果存在）
        switch (contractName) {
          case "ClaimTopicsRegistry":
          case "ClaimTopicsRegistryProxy":
            if (!addresses.claimTopicsRegistry || contractName.includes("Proxy")) {
              addresses.claimTopicsRegistry = contractAddress;
            }
            break;
          case "IdentityRegistry":
          case "IdentityRegistryProxy":
            if (!addresses.identityRegistry || contractName.includes("Proxy")) {
              addresses.identityRegistry = contractAddress;
            }
            break;
          case "IdentityRegistryStorage":
          case "IdentityRegistryStorageProxy":
            if (!addresses.identityRegistryStorage || contractName.includes("Proxy")) {
              addresses.identityRegistryStorage = contractAddress;
            }
            break;
          case "TrustedIssuersRegistry":
          case "TrustedIssuersRegistryProxy":
            if (!addresses.trustedIssuersRegistry || contractName.includes("Proxy")) {
              addresses.trustedIssuersRegistry = contractAddress;
            }
            break;
          case "Token":
          case "TokenProxy":
            if (!addresses.token || contractName.includes("Proxy")) {
              addresses.token = contractAddress;
            }
            break;
          case "ModularCompliance":
          case "ModularComplianceProxy":
            if (!addresses.modularCompliance || contractName.includes("Proxy")) {
              addresses.modularCompliance = contractAddress;
            }
            break;
        }
      }
    }

    return addresses;
  } catch (error) {
    console.warn("无法读取部署日志，使用默认配置:", error);
    return {};
  }
}

// 合约地址配置（从部署日志自动初始化）
// 默认使用 chainId 84532 (Base Sepolia)，可以通过环境变量 VITE_CHAIN_ID 修改
const chainId = Number(import.meta.env.VITE_CHAIN_ID || "84532");
export const CONTRACT_ADDRESSES: Record<string, string> = {
  claimTopicsRegistry: "",
  identityRegistry: "",
  identityRegistryStorage: "",
  trustedIssuersRegistry: "",
  token: "",
  modularCompliance: "",
  ...getContractAddresses(chainId),
};

// RPC URL 配置
export const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";

// 角色类型
export type UserRole = "owner" | "agent" | "public";

