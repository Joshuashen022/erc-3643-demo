import { Dispatch, SetStateAction } from "react";
import { ethers } from "ethers";
import { createContractConfig } from "../utils/contracts";
import { MultiTransactionController } from "../hooks/useMultiTransaction";
import { TransactionStep } from "../types/multiTransaction";

export interface PublicFlowResult {
  success: boolean;
  messages: string[];
  errors: string[];
  transferReceipt?: ethers.ContractTransactionReceipt;
}

export interface PublicFlowDeps {
  provider?: ethers.JsonRpcProvider;
  wallet?: ethers.Signer;
  multiTransaction: MultiTransactionController;
  setResult: Dispatch<SetStateAction<PublicFlowResult | null>>;
}

export const PUBLIC_FLOW_STEPS: Omit<TransactionStep, "status">[] = [
  { id: 1, title: "执行 Transfer 操作" },
  { id: 2, title: "完成转账" },
];

export function createPublicFlowHandler({
  provider,
  wallet,
  multiTransaction,
  setResult,
}: PublicFlowDeps) {
  return async () => {
    multiTransaction.initialize(PUBLIC_FLOW_STEPS);

    const updateResult = (partial: Partial<PublicFlowResult>) => {
      setResult((prev) => {
        const base: PublicFlowResult = prev || { success: true, messages: [], errors: [] };
        return {
          success: partial.success ?? base.success,
          messages: partial.messages ? [...partial.messages] : [...base.messages],
          errors: partial.errors ? [...partial.errors] : [...base.errors],
          transferReceipt: partial.transferReceipt ?? base.transferReceipt,
        };
      });
    };

    if (!provider || !wallet) {
      updateResult({ success: false, messages: [], errors: ["Provider 或 Wallet 未提供"] });
      return;
    }

    try {
      const account = await wallet.getAddress();
      const contractConfig = await createContractConfig(provider, wallet);
      const transferToAddress = "0x340ec02864d9CAFF4919BEbE4Ee63f64b99c7806";

      // Step 1: Transfer
      multiTransaction.setCurrentStep(1);
      multiTransaction.updateStep(1, { status: "in_progress" });

      const messages: string[] = [];
      const balance = await contractConfig.token.balanceOf(account);
      const transferAmount = balance / 10n;
      messages.push("\n=== 开始执行 Transfer 操作 ===");
      messages.push(`转账到地址: ${transferToAddress}`);
      messages.push(`当前余额: ${ethers.formatEther(balance)}`);
      messages.push(`转账数量: ${ethers.formatEther(transferAmount)}`);
      updateResult({ messages });

      const transferTx = await contractConfig.token.transfer(transferToAddress, transferAmount);
      messages.push(`转账交易哈希: ${transferTx.hash}`);
      updateResult({ messages });

      const transferCheckInterval = await multiTransaction.trackTransactionConfirmations?.(
        provider,
        transferTx.hash,
        1,
        12
      );

      const transferReceipt = await transferTx.wait(2);
      if (transferCheckInterval) clearInterval(transferCheckInterval as NodeJS.Timeout);

      messages.push("✓ 转账成功");
      const balanceAfter = await contractConfig.token.balanceOf(account);
      messages.push(`转账后余额: ${ethers.formatEther(balanceAfter)}`);
      updateResult({ messages, transferReceipt });

      multiTransaction.updateStep(1, { status: "completed", confirmations: 12, estimatedTimeLeft: undefined });

      // Step 2: 完成
      multiTransaction.setCurrentStep(2);
      multiTransaction.updateStep(2, { status: "completed" });
      messages.push("\n=== 转账操作完成 ===");
      updateResult({ messages });
    } catch (error: any) {
      const msg = error.message || "未知错误";
      updateResult({ success: false, errors: [`错误: ${msg}`] });
      if (multiTransaction.state) {
        multiTransaction.updateStep(multiTransaction.state.currentStep, { status: "failed", error: msg });
      }
    }
  };
}


