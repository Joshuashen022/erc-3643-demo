import { Dispatch, SetStateAction } from "react";
import { ethers } from "ethers";
import { createContractConfig } from "../utils/contracts";
import { MultiTransactionController } from "../hooks/useMultiTransaction";
import { TransactionStep } from "../types/multiTransaction";

export interface ValidateDeploymentFlowResult {
  success: boolean;
  messages: string[];
  errors: string[];
}

export interface ValidateDeploymentFlowDeps {
  provider?: ethers.JsonRpcProvider;
  wallet?: ethers.Signer;
  multiTransaction: MultiTransactionController;
  setResult: Dispatch<SetStateAction<ValidateDeploymentFlowResult | null>>;
}

export const VALIDATE_DEPLOYMENT_STEPS: Omit<TransactionStep, "status">[] = [
  { id: 1, title: "初始化合约配置" },
  { id: 2, title: "验证网络信息" },
  { id: 3, title: "验证合约地址" },
  { id: 4, title: "验证 Owner 关系" },
  { id: 5, title: "验证 Agent 关系" },
  { id: 6, title: "汇总验证结果" },
];

export function createValidateDeploymentFlowHandler({
  provider,
  wallet,
  multiTransaction,
  setResult,
}: ValidateDeploymentFlowDeps) {
  return async () => {
    // 初始化步骤
    multiTransaction.initialize(VALIDATE_DEPLOYMENT_STEPS);

    const updateResult = (partial: Partial<ValidateDeploymentFlowResult>) => {
      setResult((prev) => {
        const base: ValidateDeploymentFlowResult = prev || { success: true, messages: [], errors: [] };
        return {
          success: partial.success ?? base.success,
          messages: partial.messages ? [...partial.messages] : [...base.messages],
          errors: partial.errors ? [...partial.errors] : [...base.errors],
        };
      });
    };


    const result: ValidateDeploymentFlowResult = {
      success: true,
      messages: [],
      errors: [],
    };

    const emitProgress = () => {
      updateResult({
        success: result.success,
        messages: [...result.messages],
        errors: [...result.errors],
      });
    };
    // 基础校验
    if (!provider || !wallet) {
      result.success = false;
      result.messages.push("Provider 或 Wallet 未提供");
      result.errors.push("Provider 或 Wallet 未提供");
      emitProgress();
      return;
    }

    try {
      // 步骤 1：初始化合约配置
      multiTransaction.setCurrentStep(1);
      multiTransaction.updateStep(1, { status: "in_progress" });
      result.messages.push("\n=== 步骤 1: 初始化合约配置 ===");
      emitProgress();

      const contractConfig = await createContractConfig(provider, wallet, {
        useClaimIssuerPrivateKeys: false,
      });
      result.messages.push("✓ 合约配置初始化成功");
      emitProgress();
      multiTransaction.updateStep(1, { status: "completed", completeInfo: `合约配置初始化成功`});

      // 步骤 2：验证网络信息
      multiTransaction.setCurrentStep(2);
      multiTransaction.updateStep(2, { status: "in_progress" });
      result.messages.push("\n=== 步骤 2: 验证网络信息 ===");
      emitProgress();

      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      result.messages.push(`使用 Chain ID: ${chainId}`);
      result.messages.push("部署结果文件读取成功");
      emitProgress();
      multiTransaction.updateStep(2, { status: "completed" , completeInfo: `使用 Chain ID: ${chainId}`});

      // 步骤 3：验证合约地址
      multiTransaction.setCurrentStep(3);
      multiTransaction.updateStep(3, { status: "in_progress" });
      result.messages.push("\n=== 步骤 3: 验证合约地址 ===");
      emitProgress();

      const deploymentResults = contractConfig.deploymentResults;
      const token = contractConfig.token;
      const tokenAddress = ethers.getAddress(token.target as string);
      result.messages.push(`Token address: ${tokenAddress}`);
      emitProgress();

      let complianceAddress: string;
      let identityRegistryAddress: string;
      try {
        complianceAddress = ethers.getAddress(await token.compliance());
        identityRegistryAddress = ethers.getAddress(await token.identityRegistry());
        result.messages.push(`Compliance address: ${complianceAddress}`);
        result.messages.push(`Identity Registry address: ${identityRegistryAddress}`);
        emitProgress();
      } catch (error: any) {
        const msg = `获取合约地址失败: ${error.message}`;
        result.success = false;
        result.errors.push(msg);
        emitProgress();
        multiTransaction.updateStep(3, { status: "failed", error: msg });
        return;
      }

      // 验证地址匹配
      if (complianceAddress.toLowerCase() !== deploymentResults.compliance.toLowerCase()) {
        const msg = `Compliance 地址不匹配。期望: ${deploymentResults.compliance}, 实际: ${complianceAddress}`;
        result.success = false;
        result.errors.push(msg);
        emitProgress();
        multiTransaction.updateStep(3, { status: "failed", error: msg });
        return;
      }

      // 获取子注册表地址
      const identityRegistry = contractConfig.identityRegistry;
      let identityRegistryStorageAddress: string;
      let trustedIssuersRegistryAddress: string;
      let claimTopicsRegistryAddress: string;
      try {
        identityRegistryStorageAddress = ethers.getAddress(await identityRegistry.identityStorage());
        trustedIssuersRegistryAddress = ethers.getAddress(await identityRegistry.issuersRegistry());
        claimTopicsRegistryAddress = ethers.getAddress(await identityRegistry.topicsRegistry());
        result.messages.push(`Identity Registry Storage address: ${identityRegistryStorageAddress}`);
        result.messages.push(`Trusted Issuers Registry address: ${trustedIssuersRegistryAddress}`);
        result.messages.push(`Claim Topics Registry address: ${claimTopicsRegistryAddress}`);
        emitProgress();
      } catch (error: any) {
        const msg = `获取注册表地址失败: ${error.message}`;
        result.success = false;
        result.errors.push(msg);
        emitProgress();
        multiTransaction.updateStep(3, { status: "failed", error: msg });
        return;
      }

      // 验证注册表地址匹配
      const addressChecks = [
        { name: "Identity Registry Storage", expected: deploymentResults.identityRegistryStorage, actual: identityRegistryStorageAddress },
        { name: "Trusted Issuers Registry", expected: deploymentResults.trustedIssuersRegistry, actual: trustedIssuersRegistryAddress },
        { name: "Claim Topics Registry", expected: deploymentResults.claimTopicsRegistry, actual: claimTopicsRegistryAddress },
      ];

      let hasAddressError = false;
      for (const check of addressChecks) {
        if (check.actual.toLowerCase() !== check.expected.toLowerCase()) {
          const msg = `${check.name} 地址不匹配。期望: ${check.expected}, 实际: ${check.actual}`;
          result.success = false;
          result.errors.push(msg);
          emitProgress();
          hasAddressError = true;
        }
      }

      if (hasAddressError) {
        multiTransaction.updateStep(3, { status: "failed", error: "部分地址验证失败" });
        return;
      }

      result.messages.push("✓ 所有合约地址验证通过");
      emitProgress();
      multiTransaction.updateStep(3, { status: "completed" , completeInfo: "所有合约地址验证通过"});

      // 步骤 4：验证 Owner 关系
      multiTransaction.setCurrentStep(4);
      multiTransaction.updateStep(4, { status: "in_progress" });
      result.messages.push("\n=== 步骤 4: 验证 Owner 关系 ===");
      emitProgress();

      const suiteOwner = deploymentResults.suiteOwner 
        ? ethers.getAddress(deploymentResults.suiteOwner)
        : ethers.getAddress(deploymentResults.tokenOwner);
      result.messages.push(`使用 Suite Owner: ${suiteOwner}`);
      emitProgress();

      const toAddressString = (addr: any): string => {
        return ethers.getAddress(typeof addr === "string" ? addr : String(addr));
      };

      const verifyOwner = async (
        contract: ethers.Contract,
        contractName: string,
        expectedOwner: string
      ): Promise<{ success: boolean; message: string }> => {
        try {
          const actualOwner = toAddressString(await contract.owner());
          if (actualOwner.toLowerCase() !== expectedOwner.toLowerCase()) {
            return {
              success: false,
              message: `${contractName} owner 不匹配。期望: ${expectedOwner}, 实际: ${actualOwner}`
            };
          }
          return {
            success: true,
            message: `✓ ${contractName} Owner: ${actualOwner}`
          };
        } catch (error: any) {
          return {
            success: false,
            message: `验证 ${contractName} owner 失败: ${error.message}`
          };
        }
      };

      const compliance = contractConfig.compliance;
      const trustedIssuersRegistry = contractConfig.trustedIssuersRegistry;
      const claimTopicsRegistry = contractConfig.claimTopicsRegistry;
      const trexFactory = contractConfig.trexFactory;
      const identityIdFactory = contractConfig.identityIdFactory;
      const identityGateway = contractConfig.identityGateway;
      const claimIssuerIdFactory = contractConfig.claimIssuerIdFactory;
      const claimIssuerGateway = contractConfig.claimIssuerGateway;

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
      let hasOwnerError = false;
      ownerResults.forEach((check) => {
        if (check.success) {
          result.messages.push(check.message);
        } else {
          hasOwnerError = true;
          result.success = false;
          result.errors.push(check.message);
          emitProgress();
        }
      });

      if (hasOwnerError) {
        multiTransaction.updateStep(4, { status: "failed", error: "部分 Owner 验证失败" });
        return;
      }

      multiTransaction.updateStep(4, { status: "completed" , completeInfo: "所有 Owner 验证通过"});

      // 步骤 5：验证 Agent 关系
      multiTransaction.setCurrentStep(5);
      multiTransaction.updateStep(5, { status: "in_progress" });
      result.messages.push("\n=== 步骤 5: 验证 Agent 关系 ===");
      emitProgress();

      try {
        const isIdentityRegistryAgent = await identityRegistry.isAgent(suiteOwner);
        if (!isIdentityRegistryAgent) {
          result.success = false;
          result.errors.push("Suite owner 应该是 Identity Registry 的 agent");
          emitProgress();
          multiTransaction.updateStep(5, { status: "failed", error: "Identity Registry Agent 验证失败" });
          return;
        }
        result.messages.push(`✓ Identity Registry Agent: ${suiteOwner}`);
        emitProgress();
      } catch (error: any) {
        const msg = `检查 Identity Registry agent 失败: ${error.message}`;
        result.success = false;
        result.errors.push(msg);
        emitProgress();
        multiTransaction.updateStep(5, { status: "failed", error: msg });
        return;
      }

      try {
        const isTokenAgent = await token.isAgent(suiteOwner);
        if (!isTokenAgent) {
          result.success = false;
          result.errors.push("Suite owner 应该是 Token 的 agent");
          emitProgress();
          multiTransaction.updateStep(5, { status: "failed", error: "Token Agent 验证失败" });
          return;
        }
        result.messages.push(`✓ Token Agent: ${suiteOwner}`);
        emitProgress();
      } catch (error: any) {
        const msg = `检查 Token agent 失败: ${error.message}`;
        result.success = false;
        result.errors.push(msg);
        emitProgress();
        multiTransaction.updateStep(5, { status: "failed", error: msg });
        return;
      }

      multiTransaction.updateStep(5, { status: "completed" , completeInfo: "所有 Agent 验证通过"});

      // 步骤 6：汇总验证结果
      multiTransaction.setCurrentStep(6);
      multiTransaction.updateStep(6, { status: "in_progress" });
      result.messages.push("\n=== 步骤 6: 汇总验证结果 ===");
      emitProgress();

      // 添加合约信息汇总
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
      emitProgress();

      // 打印 Claim Issuers 信息
      const claimIssuersCount = deploymentResults.claimIssuersCount || 0;
      if (claimIssuersCount > 0) {
        result.messages.push("\n=== Claim Issuers 信息汇总 ===");
        for (let i = 0; i < claimIssuersCount; i++) {
          const claimIssuerKey = `claimIssuer${i}_claimIssuer` as keyof typeof deploymentResults;
          const claimIssuerOwnerKey = `claimIssuer${i}_claimIssuerOwner` as keyof typeof deploymentResults;
          const claimTopicsKey = `claimIssuer${i}_claimTopics` as keyof typeof deploymentResults;

          const claimIssuerAddress = toAddressString(deploymentResults[claimIssuerKey] as string);
          const claimIssuerOwner = toAddressString(deploymentResults[claimIssuerOwnerKey] as string);
          const claimTopics = deploymentResults[claimTopicsKey] as number[];

          result.messages.push(`Claim Issuer ${i}: ${claimIssuerAddress} Owner ${claimIssuerOwner} Claim Topics [${claimTopics.join(', ')}]`);
        }
      }

      result.messages.push("\n✓ 所有验证通过！");
      emitProgress();
      multiTransaction.updateStep(6, { status: "completed" , completeInfo: "所有验证通过,部署成功 (通过下方按钮查看具体信息)"});
    } catch (error: any) {
      const msg = error.message || "未知错误";
      result.success = false;
      result.errors.push(`错误: ${msg}`);
      emitProgress();
      if (multiTransaction.state) {
        multiTransaction.updateStep(multiTransaction.state.currentStep, { status: "failed", error: msg });
      }
    }
  };
} 