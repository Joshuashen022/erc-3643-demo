import { ethers } from "ethers";
import { DeploymentResults, ContractConfig } from "./contracts";

/**
 * 辅助函数：将地址转换为字符串并规范化
 */
const toAddressString = (addr: any): string => {
  return ethers.getAddress(typeof addr === "string" ? addr : String(addr));
};

/**
 * 验证结果接口
 */
export interface ValidationResult {
  success: boolean;
  messages: string[];
  errors: string[];
}

/**
 * 验证合约 owner
 */
async function verifyOwner(
  contract: ethers.Contract,
  contractName: string,
  expectedOwner: string
): Promise<{ success: boolean; message: string }> {
  try {
    const actualOwner = toAddressString(await contract.owner());
    if (actualOwner.toLowerCase() !== expectedOwner.toLowerCase()) {
      return {
        success: false,
        message: `${contractName} owner mismatch. Expected: ${expectedOwner}, Got: ${actualOwner}`
      };
    }
    return {
      success: true,
      message: `✓ ${contractName} Owner: ${actualOwner} (matches deploymentResults)`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to verify ${contractName} owner: ${error.message}`
    };
  }
}

/**
 * 前端版本：验证部署
 */
export async function validateDeployment(
  provider: ethers.JsonRpcProvider,
  contractConfig: ContractConfig
): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    messages: [],
    errors: []
  };

  try {
    // 获取网络信息
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // 从 ContractConfig 读取 deploymentResults
    const deploymentResults = contractConfig.deploymentResults;
    result.messages.push(`\n使用 Chain ID: ${chainId}`);
    result.messages.push(`部署结果文件读取成功`);

    // suiteOwner 可能是可选的，如果没有则使用 tokenOwner 作为 fallback
    const suiteOwner = deploymentResults.suiteOwner 
      ? ethers.getAddress(deploymentResults.suiteOwner)
      : ethers.getAddress(deploymentResults.tokenOwner);

    result.messages.push(`\n使用 Suite Owner: ${suiteOwner}`);

    // 从 ContractConfig 读取合约实例
    const token = contractConfig.token;
    const identityRegistry = contractConfig.identityRegistry;
    const compliance = contractConfig.compliance;
    const trustedIssuersRegistry = contractConfig.trustedIssuersRegistry;
    const claimTopicsRegistry = contractConfig.claimTopicsRegistry;
    const trexFactory = contractConfig.trexFactory;
    const identityIdFactory = contractConfig.identityIdFactory;
    const identityGateway = contractConfig.identityGateway;
    const claimIssuerIdFactory = contractConfig.claimIssuerIdFactory;
    const claimIssuerGateway = contractConfig.claimIssuerGateway;

    // 获取 Token 地址
    const tokenAddress = ethers.getAddress(token.target as string);
    result.messages.push(`Token address: ${tokenAddress}`);

    // 获取相关合约地址
    let complianceAddress: string;
    let identityRegistryAddress: string;
    try {
      complianceAddress = toAddressString(await token.compliance());
      identityRegistryAddress = toAddressString(await token.identityRegistry());
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Failed to get contract addresses: ${error.message}`);
      return result;
    }

    result.messages.push(`Compliance address: ${complianceAddress}`);
    result.messages.push(`Identity Registry address: ${identityRegistryAddress}`);

    // 验证 Compliance 地址是否匹配
    if (complianceAddress.toLowerCase() !== deploymentResults.compliance.toLowerCase()) {
      result.success = false;
      result.errors.push(
        `Compliance address mismatch. Expected: ${deploymentResults.compliance}, Got: ${complianceAddress}`
      );
    }

    // 获取子注册表地址
    let identityRegistryStorageAddress: string;
    let trustedIssuersRegistryAddress: string;
    let claimTopicsRegistryAddress: string;
    try {
      identityRegistryStorageAddress = toAddressString(await identityRegistry.identityStorage());
      trustedIssuersRegistryAddress = toAddressString(await identityRegistry.issuersRegistry());
      claimTopicsRegistryAddress = toAddressString(await identityRegistry.topicsRegistry());
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Failed to get registry addresses: ${error.message}`);
      return result;
    }

    result.messages.push(`Identity Registry Storage address: ${identityRegistryStorageAddress}`);
    result.messages.push(`Trusted Issuers Registry address: ${trustedIssuersRegistryAddress}`);
    result.messages.push(`Claim Topics Registry address: ${claimTopicsRegistryAddress}`);

    // 验证地址是否匹配 deploymentResults
    if (identityRegistryStorageAddress.toLowerCase() !== deploymentResults.identityRegistryStorage.toLowerCase()) {
      result.success = false;
      result.errors.push(
        `Identity Registry Storage address mismatch. Expected: ${deploymentResults.identityRegistryStorage}, Got: ${identityRegistryStorageAddress}`
      );
    }
    if (trustedIssuersRegistryAddress.toLowerCase() !== deploymentResults.trustedIssuersRegistry.toLowerCase()) {
      result.success = false;
      result.errors.push(
        `Trusted Issuers Registry address mismatch. Expected: ${deploymentResults.trustedIssuersRegistry}, Got: ${trustedIssuersRegistryAddress}`
      );
    }
    if (claimTopicsRegistryAddress.toLowerCase() !== deploymentResults.claimTopicsRegistry.toLowerCase()) {
      result.success = false;
      result.errors.push(
        `Claim Topics Registry address mismatch. Expected: ${deploymentResults.claimTopicsRegistry}, Got: ${claimTopicsRegistryAddress}`
      );
    }

    // 验证逻辑
    result.messages.push("\n=== 开始验证 Owner 关系 ===");

    // 验证 Identity Registry agent
    try {
      const isIdentityRegistryAgent = await identityRegistry.isAgent(suiteOwner);
      if (!isIdentityRegistryAgent) {
        result.success = false;
        result.errors.push("Suite owner should be an agent of Identity Registry");
      } else {
        result.messages.push(`✓ Identity Registry Agent: ${suiteOwner}`);
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Failed to check Identity Registry agent: ${error.message}`);
    }

    // 验证 Token agent
    try {
      const isTokenAgent = await token.isAgent(suiteOwner);
      if (!isTokenAgent) {
        result.success = false;
        result.errors.push("Suite owner should be an agent of Token");
      } else {
        result.messages.push(`✓ Token Agent: ${suiteOwner}`);
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Failed to check Token agent: ${error.message}`);
    }

    // 验证所有合约的 owner 是否与 deploymentResults 中的 owner 匹配
    const ownerChecks = [
      verifyOwner(token, "Token", deploymentResults.tokenOwner),
      verifyOwner(identityRegistry, "Identity Registry", deploymentResults.identityRegistryOwner),
      verifyOwner(compliance, "Compliance", suiteOwner),
      verifyOwner(trustedIssuersRegistry, "Trusted Issuers Registry", deploymentResults.trustedIssuersRegistryOwner),
      verifyOwner(claimTopicsRegistry, "Claim Topics Registry", deploymentResults.claimTopicsRegistryOwner),
      verifyOwner(trexFactory, "TREX Factory", deploymentResults.trexFactoryOwner),
      verifyOwner(identityIdFactory, "Identity Id Factory", deploymentResults.identityIdFactoryOwner),
      verifyOwner(identityGateway, "Identity Gateway", deploymentResults.identityGatewayOwner),
      verifyOwner(claimIssuerIdFactory, "Claim Issuer Id Factory", deploymentResults.claimIssuerIdFactoryOwner),
      verifyOwner(claimIssuerGateway, "Claim Issuer Gateway", deploymentResults.claimIssuerGatewayOwner),
    ];

    const ownerResults = await Promise.all(ownerChecks);
    ownerResults.forEach((check) => {
      if (check.success) {
        result.messages.push(check.message);
      } else {
        result.success = false;
        result.errors.push(check.message);
      }
    });

    const claimIssuersCount = deploymentResults.claimIssuersCount || 0;

    // 打印所有信息（与部署脚本格式一致）
    result.messages.push("\n=== 合约信息汇总 ===");
    result.messages.push(`Token: ${tokenAddress} Owner ${deploymentResults.tokenOwner}`);
    result.messages.push(`Identity Registry: ${identityRegistryAddress} Owner ${deploymentResults.identityRegistryOwner}`);
    result.messages.push(`Compliance: ${complianceAddress} Owner ${suiteOwner}`);
    result.messages.push(`Trusted Issuers Registry: ${trustedIssuersRegistryAddress} Owner ${deploymentResults.trustedIssuersRegistryOwner}`);
    result.messages.push(`Claim Topics Registry: ${claimTopicsRegistryAddress} Owner ${deploymentResults.claimTopicsRegistryOwner}`);
    result.messages.push(`TREX Factory: ${deploymentResults.trexFactory} Owner ${deploymentResults.trexFactoryOwner}`);
    result.messages.push(`Identity Id Factory: ${deploymentResults.identityIdFactory} Owner ${deploymentResults.identityIdFactoryOwner}`);
    result.messages.push(`Identity Gateway: ${deploymentResults.identityGateway} Owner ${deploymentResults.identityGatewayOwner}`);
    result.messages.push(`Claim Issuer Id Factory: ${deploymentResults.claimIssuerIdFactory} Owner ${deploymentResults.claimIssuerIdFactoryOwner}`);
    result.messages.push(`Claim Issuer Gateway: ${deploymentResults.claimIssuerGateway} Owner ${deploymentResults.claimIssuerGatewayOwner}`);

    // 打印所有 Claim Issuers 的信息
    result.messages.push("\n=== Claim Issuers 信息汇总 ===");
    for (let i = 0; i < claimIssuersCount; i++) {
      const claimIssuerKey = `claimIssuer${i}_claimIssuer` as keyof DeploymentResults;
      const claimIssuerOwnerKey = `claimIssuer${i}_claimIssuerOwner` as keyof DeploymentResults;
      const claimTopicsKey = `claimIssuer${i}_claimTopics` as keyof DeploymentResults;

      const claimIssuerAddress = toAddressString(deploymentResults[claimIssuerKey] as string);
      const claimIssuerOwner = toAddressString(deploymentResults[claimIssuerOwnerKey] as string);
      const claimTopics = deploymentResults[claimTopicsKey] as number[];

      result.messages.push(
        `Claim Issuer ${i}: ${claimIssuerAddress} Owner ${claimIssuerOwner} Claim Topics [${claimTopics.join(', ')}]`
      );
    }

    if (result.success) {
      result.messages.push("\n✓ 所有验证通过！");
    } else {
      result.messages.push("\n✗ 验证失败，请查看错误信息");
    }

  } catch (error: any) {
    result.success = false;
    result.errors.push(`验证过程出错: ${error.message}`);
  }

  return result;
}

