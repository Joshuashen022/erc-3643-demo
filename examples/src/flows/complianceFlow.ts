import { Dispatch, SetStateAction } from "react";
import { ethers } from "ethers";
import { RPC_URL } from "../utils/config";
import { createContractConfig } from "../utils/contracts";
import { deployMockModule } from "../utils/operations";
import { MultiTransactionController } from "../hooks/useMultiTransaction";
import { TransactionStep } from "../types/multiTransaction";

export interface ComplianceFlowResult {
  success: boolean;
  messages: string[];
  errors: string[];
}

export interface ComplianceFlowDeps {
  provider?: ethers.JsonRpcProvider;
  wallet?: ethers.Signer;
  multiTransaction: MultiTransactionController;
  setResult: Dispatch<SetStateAction<ComplianceFlowResult | null>>;
}

export const COMPLIANCE_FLOW_STEPS: Omit<TransactionStep, "status">[] = [
  { id: 1, title: "部署 MockModule" },
  { id: 2, title: "添加模块" },
  { id: 3, title: "移除模块" },
  { id: 4, title: "验证结果" },
  { id: 5, title: "完成所有操作" },
];

export function createComplianceFlowHandler({
  provider,
  wallet,
  multiTransaction,
  setResult,
}: ComplianceFlowDeps) {
  return async () => {
    // 初始化步骤
    multiTransaction.initialize(COMPLIANCE_FLOW_STEPS);

    const updateResult = (partial: Partial<ComplianceFlowResult>) => {
      setResult((prev) => {
        const base: ComplianceFlowResult = prev || { success: true, messages: [], errors: [] };
        return {
          success: partial.success ?? base.success,
          messages: partial.messages ? [...partial.messages] : [...base.messages],
          errors: partial.errors ? [...partial.errors] : [...base.errors],
        };
      });
    };

    // 基础校验
    if (!provider || !wallet) {
      updateResult({ success: false, messages: [], errors: ["Provider 或 Wallet 未提供"] });
      return;
    }

    try {
      let moduleAddress = "";

      // 步骤 1：部署 MockModule
      multiTransaction.setCurrentStep(1);
      multiTransaction.updateStep(1, { status: "in_progress" });
      updateResult({ messages: ["\n=== 步骤 1: 部署 MockModule ==="] });

      const deployResult = await deployMockModule(provider, wallet, RPC_URL);
      if (!deployResult.success || !deployResult.moduleAddress) {
        const errorMsg = deployResult.errors.length > 0 ? deployResult.errors.join("\n") : "部署 MockModule 失败";
        multiTransaction.updateStep(1, { status: "failed", error: errorMsg });
        updateResult({ success: false, messages: [...deployResult.messages], errors: [errorMsg] });
        return;
      }
      moduleAddress = deployResult.moduleAddress;
      updateResult({ messages: [...deployResult.messages] });
      multiTransaction.updateStep(1, { status: "completed" });

      // 生成合约配置
      const contractConfig = await createContractConfig(provider, wallet, {
        useClaimIssuerPrivateKeys: true,
      });

      // 步骤 2：添加模块
      multiTransaction.setCurrentStep(2);
      multiTransaction.updateStep(2, { status: "in_progress" });
      updateResult({ messages: ["\n=== 步骤 2: 添加模块 ==="] });

      const isBoundBefore = await contractConfig.compliance.isModuleBound(moduleAddress);
      updateResult({ messages: [`模块绑定状态: ${isBoundBefore ? "已绑定" : "未绑定"}`] });

      if (!isBoundBefore) {
        try {
          const addModuleTx = await contractConfig.compliance.addModule(moduleAddress, { gasLimit: 1_000_000 });
          updateResult({ messages: [`添加模块交易哈希: ${addModuleTx.hash}`] });

          const addCheckInterval = await multiTransaction.trackTransactionConfirmations?.(
            provider,
            addModuleTx.hash,
            2,
            12
          );

          await addModuleTx.wait(2);
          if (addCheckInterval) clearInterval(addCheckInterval as NodeJS.Timeout);
          updateResult({ messages: ["✓ 模块添加成功"] });
          multiTransaction.updateStep(2, { status: "completed", confirmations: 12, estimatedTimeLeft: undefined });
        } catch (error: any) {
          const msg = error.message || "添加模块失败";
          updateResult({ success: false, errors: [`添加模块失败: ${msg}`] });
          multiTransaction.updateStep(2, { status: "failed", error: msg });
          return;
        }
      } else {
        updateResult({ messages: ["模块已绑定，跳过添加步骤"] });
        multiTransaction.updateStep(2, { status: "completed" });
      }

      // 步骤 3：移除模块
      multiTransaction.setCurrentStep(3);
      multiTransaction.updateStep(3, { status: "in_progress" });
      updateResult({ messages: ["\n=== 步骤 3: 移除模块 ==="] });

      try {
        const removeModuleTx = await contractConfig.compliance.removeModule(moduleAddress, { gasLimit: 1_000_000 });
        updateResult({ messages: [`移除模块交易哈希: ${removeModuleTx.hash}`] });

        const removeCheckInterval = await multiTransaction.trackTransactionConfirmations?.(
          provider,
          removeModuleTx.hash,
          3,
          12
        );

        await removeModuleTx.wait(2);
        if (removeCheckInterval) clearInterval(removeCheckInterval as NodeJS.Timeout);
        updateResult({ messages: ["✓ 模块移除成功"] });
        multiTransaction.updateStep(3, { status: "completed", confirmations: 12, estimatedTimeLeft: undefined });
      } catch (error: any) {
        const msg = error.message || "移除模块失败";
        updateResult({ success: false, errors: [`移除模块失败: ${msg}`] });
        multiTransaction.updateStep(3, { status: "failed", error: msg });
        return;
      }

      // 步骤 4：验证结果
      multiTransaction.setCurrentStep(4);
      multiTransaction.updateStep(4, { status: "in_progress" });
      updateResult({ messages: ["\n=== 步骤 4: 验证结果 ==="] });

      const isBoundAfter = await contractConfig.compliance.isModuleBound(moduleAddress);
      const modules = await contractConfig.compliance.getModules();
      const found = modules.map((m: string) => ethers.getAddress(m)).includes(moduleAddress);

      updateResult({
        messages: [
          `模块已移除: ${!isBoundAfter && !found}`,
          `当前模块列表: ${modules.join(", ") || "空"}`,
        ],
      });

      try {
        const canTransferAfter = await contractConfig.compliance.canTransfer(
          "0x0000000000000000000000000000000000001111",
          "0x0000000000000000000000000000000000002222",
          ethers.parseEther("1")
        );
        updateResult({ messages: [`移除后 canTransfer: ${canTransferAfter}`] });
      } catch (error: any) {
        updateResult({ messages: [`检查 canTransfer 失败: ${error.message}`] });
      }

      multiTransaction.updateStep(4, { status: "completed" });

      // 步骤 5：完成
      multiTransaction.setCurrentStep(5);
      multiTransaction.updateStep(5, { status: "completed" });
      updateResult({ messages: ["\n=== 所有操作成功完成 ==="] });
    } catch (error: any) {
      const msg = error.message || "未知错误";
      updateResult({ success: false, errors: [`错误: ${msg}`] });
      if (multiTransaction.state) {
        multiTransaction.updateStep(multiTransaction.state.currentStep, { status: "failed", error: msg });
      }
    }
  };
}


