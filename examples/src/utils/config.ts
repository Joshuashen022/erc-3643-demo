/**
 * Configuration file for frontend application
 * Reads contract addresses and network settings from deployment results via contracts.ts
 */

import { getDeploymentResults, DeploymentResults } from "./contracts";

export type UserRole = 
  | "owner" 
  | "finance" 
  | "backend" 
  | "compliance" 
  | "legal" 
  | "public" 
  | "user";

export interface ContractAddresses {
  token: string;
  modularCompliance: string;
  identityRegistry: string;
  identityRegistryStorage: string;
  trustedIssuersRegistry: string;
  claimTopicsRegistry: string;
  rwaClaimIssuerIdFactory: string;
  rwaClaimIssuerGateway: string;
  rwaIdentityIdFactory: string;
  rwaIdentityGateway: string;
  trexFactory?: string;
  trexGateway?: string;
  trexImplementationAuthority?: string;
  claimIssuer0?: string;
  claimIssuer1?: string;
  claimIssuer2?: string;
  claimIssuer3?: string;
  claimIssuer4?: string;
  [key: string]: string | undefined;
}

// Read RPC URL from environment variable, default to localhost
export const RPC_URL = "https://sepolia.base.org";

// Read Chain ID from environment variable, default to 31337 (Anvil)
export const CHAIN_ID = 84532;

/**
 * Get contract addresses from deployment results via contracts.ts
 */
function getContractAddressesFromDeployment(chainId: number): ContractAddresses {
  try {
    const deploymentResults = getDeploymentResults(chainId);
    
    const contractAddresses: ContractAddresses = {
      token: deploymentResults.token || "",
      modularCompliance: deploymentResults.compliance || "",
      identityRegistry: deploymentResults.identityRegistry || "",
      identityRegistryStorage: deploymentResults.identityRegistryStorage || "",
      trustedIssuersRegistry: deploymentResults.trustedIssuersRegistry || "",
      claimTopicsRegistry: deploymentResults.claimTopicsRegistry || "",
      rwaClaimIssuerIdFactory: deploymentResults.claimIssuerIdFactory || "",
      rwaClaimIssuerGateway: deploymentResults.claimIssuerGateway || "",
      rwaIdentityIdFactory: deploymentResults.identityIdFactory || "",
      rwaIdentityGateway: deploymentResults.identityGateway || "",
      trexFactory: deploymentResults.trexFactory,
      trexGateway: deploymentResults.trexGateway,
      trexImplementationAuthority: deploymentResults.trexImplementationAuthority,
    };

    // Add claim issuers from deployment results
    const claimIssuersCount = deploymentResults.claimIssuersCount || 0;
    for (let i = 0; i < claimIssuersCount && i < 5; i++) {
      const claimIssuerKey = `claimIssuer${i}_claimIssuer` as keyof DeploymentResults;
      const claimIssuerAddress = deploymentResults[claimIssuerKey];
      if (claimIssuerAddress && typeof claimIssuerAddress === 'string') {
        contractAddresses[`claimIssuer${i}` as keyof ContractAddresses] = claimIssuerAddress;
      }
    }

    return contractAddresses;
  } catch (error) {
    console.error(`获取 chainId ${chainId} 的合约地址失败:`, error);
    // Return empty addresses as fallback
    return {
      token: "",
      modularCompliance: "",
      identityRegistry: "",
      identityRegistryStorage: "",
      trustedIssuersRegistry: "",
      claimTopicsRegistry: "",
      rwaClaimIssuerIdFactory: "",
      rwaClaimIssuerGateway: "",
      rwaIdentityIdFactory: "",
      rwaIdentityGateway: "",
    };
  }
}

// Contract addresses from deployment results via contracts.ts
export const CONTRACT_ADDRESSES: ContractAddresses = getContractAddressesFromDeployment(CHAIN_ID);

