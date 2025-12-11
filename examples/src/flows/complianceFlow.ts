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

    const result: ComplianceFlowResult = { success: true, messages: [], errors: [] };

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
      result.errors.push("Provider 或 Wallet 未提供");
      emitProgress();
      return;
    }

    try {
      let moduleAddress = "";

      // 步骤 1：部署 MockModule
      multiTransaction.setCurrentStep(1);
      multiTransaction.updateStep(1, { status: "in_progress" });
      result.messages.push("\n=== 步骤 1: 部署 MockModule ===");
      emitProgress();

      const deployResult = await deployMockModule(provider, wallet, RPC_URL);
      if (!deployResult.success || !deployResult.moduleAddress) {
        const errorMsg = deployResult.errors.length > 0 ? deployResult.errors.join("\n") : "部署 MockModule 失败";
        multiTransaction.updateStep(1, { status: "failed", error: errorMsg , completeInfo: `部署 MockModule 失败: ${errorMsg}`});
        result.success = false;
        result.errors.push(errorMsg);
        emitProgress();
        return;
      }
      moduleAddress = deployResult.moduleAddress;
      result.messages.push(...deployResult.messages);
      emitProgress();
      multiTransaction.updateStep(1, { status: "completed" , completeInfo: `部署 MockModule 成功: ${moduleAddress}`});

      // 生成合约配置
      const contractConfig = await createContractConfig(provider, wallet, {
        useClaimIssuerPrivateKeys: true,
      });

      // 步骤 2：添加模块
      multiTransaction.setCurrentStep(2);
      multiTransaction.updateStep(2, { status: "in_progress" });
      result.messages.push("\n=== 步骤 2: 添加模块 ===");
      emitProgress();

      const isBoundBefore = await contractConfig.compliance.isModuleBound(moduleAddress);
      result.messages.push(`模块绑定状态: ${isBoundBefore ? "已绑定" : "未绑定"}`);
      emitProgress();

      if (!isBoundBefore) {
        try {
          const addModuleTx = await contractConfig.compliance.addModule(moduleAddress, { gasLimit: 1_000_000 });
          result.messages.push(`添加模块交易哈希: ${addModuleTx.hash}`);
          emitProgress();

          const addCheckInterval = await multiTransaction.trackTransactionConfirmations?.(
            provider,
            addModuleTx.hash,
            2,
            12
          );

          await addModuleTx.wait(2);
          if (addCheckInterval) clearInterval(addCheckInterval as NodeJS.Timeout);
          result.messages.push("✓ 模块添加成功");
          emitProgress();
          multiTransaction.updateStep(2, { 
            status: "completed", 
            confirmations: 12, 
            estimatedTimeLeft: undefined,
            completeInfo: `模块添加成功: ${moduleAddress}`
          });
        } catch (error: any) {
          const msg = error.message || "添加模块失败";
          result.success = false;
          result.errors.push(`添加模块失败: ${msg}`);
          emitProgress();
          multiTransaction.updateStep(2, { status: "failed", error: msg });
          return;
        }
      } else {
        result.messages.push("模块已绑定，跳过添加步骤");
        emitProgress();
        multiTransaction.updateStep(2, { status: "completed" , completeInfo: `模块已绑定，跳过添加步骤: ${moduleAddress}`});
      }

      // 步骤 3：移除模块
      multiTransaction.setCurrentStep(3);
      multiTransaction.updateStep(3, { status: "in_progress" });
      result.messages.push("\n=== 步骤 3: 移除模块 ===");
      emitProgress();

      try {
        const removeModuleTx = await contractConfig.compliance.removeModule(moduleAddress, { gasLimit: 1_000_000 });
        result.messages.push(`移除模块交易哈希: ${removeModuleTx.hash}`);
        emitProgress();

        const removeCheckInterval = await multiTransaction.trackTransactionConfirmations?.(
          provider,
          removeModuleTx.hash,
          3,
          12
        );

        await removeModuleTx.wait(2);
        if (removeCheckInterval) clearInterval(removeCheckInterval as NodeJS.Timeout);
        result.messages.push("✓ 模块移除成功");
        emitProgress();
        multiTransaction.updateStep(3, { 
          status: "completed", 
          confirmations: 12, 
          estimatedTimeLeft: undefined,
          completeInfo: `模块移除成功: ${moduleAddress}`
        });
      } catch (error: any) {
        const msg = error.message || "移除模块失败";
        result.success = false;
        result.errors.push(`移除模块失败: ${msg}`);
        emitProgress();
        multiTransaction.updateStep(3, { status: "failed", error: msg });
        return;
      }

      // 步骤 4：验证结果
      multiTransaction.setCurrentStep(4);
      multiTransaction.updateStep(4, { status: "in_progress" });
      result.messages.push("\n=== 步骤 4: 验证结果 ===");
      emitProgress();

      const isBoundAfter = await contractConfig.compliance.isModuleBound(moduleAddress);
      const modules = await contractConfig.compliance.getModules();
      const found = modules.map((m: string) => ethers.getAddress(m)).includes(moduleAddress);

      result.messages.push(`模块已移除: ${!isBoundAfter && !found}`);
      result.messages.push(`当前模块列表: ${modules.join(", ") || "空"}`);
      emitProgress();

      try {
        const canTransferAfter = await contractConfig.compliance.canTransfer(
          "0x0000000000000000000000000000000000001111",
          "0x0000000000000000000000000000000000002222",
          ethers.parseEther("1")
        );
        result.messages.push(`移除后 canTransfer: ${canTransferAfter}`);
        emitProgress();
        multiTransaction.updateStep(4, { 
          status: "completed", 
          confirmations: 12, 
          estimatedTimeLeft: undefined,
          completeInfo: `验证结果: ${canTransferAfter}`
        });
  
      } catch (error: any) {
        result.messages.push(`检查 canTransfer 失败: ${error.message}`);
        emitProgress();
        multiTransaction.updateStep(4, { 
          status: "failed", 
          error: error.message,
          completeInfo: `检查 canTransfer 失败: ${error.message}`
        });
        return;
      }

      // 步骤 5：完成
      multiTransaction.setCurrentStep(5);
      multiTransaction.updateStep(5, { 
        status: "completed", 
        confirmations: 12, 
        estimatedTimeLeft: undefined,
        completeInfo: "所有操作成功完成"
      });
      result.messages.push("\n=== 所有操作成功完成 ===");
      emitProgress();
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


