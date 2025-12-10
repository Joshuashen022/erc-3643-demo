import { Dispatch, SetStateAction } from "react";
import { ethers } from "ethers";
import { createContractConfig } from "../utils/contracts";
import { MultiTransactionController } from "../hooks/useMultiTransaction";
import { TransactionStep } from "../types/multiTransaction";

export interface FinanceFlowResult {
  success: boolean;
  messages: string[];
  errors: string[];
  mintReceipt?: ethers.ContractTransactionReceipt;
  burnReceipt?: ethers.ContractTransactionReceipt;
}

export interface FinanceFlowDeps {
  provider?: ethers.JsonRpcProvider;
  wallet?: ethers.Signer;
  multiTransaction: MultiTransactionController;
  setResult: Dispatch<SetStateAction<FinanceFlowResult | null>>;
}

export const FINANCE_FLOW_STEPS: Omit<TransactionStep, "status">[] = [
  { id: 1, title: "执行 Mint 操作" },
  { id: 2, title: "执行 Burn 操作" },
  { id: 3, title: "完成所有操作" },
];

export function createFinanceFlowHandler({
  provider,
  wallet,
  multiTransaction,
  setResult,
}: FinanceFlowDeps) {
  return async () => {
    multiTransaction.initialize(FINANCE_FLOW_STEPS);

    const updateResult = (partial: Partial<FinanceFlowResult>) => {
      setResult((prev) => {
        const base: FinanceFlowResult = prev || { success: true, messages: [], errors: [] };
        return {
          success: partial.success ?? base.success,
          messages: partial.messages ? [...partial.messages] : [...base.messages],
          errors: partial.errors ? [...partial.errors] : [...base.errors],
          mintReceipt: partial.mintReceipt ?? base.mintReceipt,
          burnReceipt: partial.burnReceipt ?? base.burnReceipt,
        };
      });
    };

    if (!provider || !wallet) {
      updateResult({ success: false, messages: [], errors: ["Provider 或 Wallet 未提供"] });
      return;
    }

    const result: FinanceFlowResult = { success: true, messages: [], errors: [] };
    const emitProgress = () => updateResult({ ...result });

    try {
      const contractConfig = await createContractConfig(provider, wallet, {
        useClaimIssuerPrivateKeys: false,
      });

      const defaultAddress = await wallet.getAddress();
      const mintToAddress = defaultAddress;
      const burnFromAddress = defaultAddress;
      const amount = ethers.parseEther("1");

      // Step 1: Mint
      multiTransaction.setCurrentStep(1);
      multiTransaction.updateStep(1, { status: "in_progress" });
      result.messages.push("\n=== 开始 Mint 操作 ===");
      emitProgress();

      try {
        const balanceBefore = await contractConfig.token.balanceOf(mintToAddress);
        const totalSupplyBefore = await contractConfig.token.totalSupply();
        result.messages.push(`Mint 前余额: ${ethers.formatEther(balanceBefore)}`);
        result.messages.push(`Mint 前总供应量: ${ethers.formatEther(totalSupplyBefore)}`);
        result.messages.push(`Mint 数量: ${ethers.formatEther(amount)}`);
        result.messages.push(`Mint 到地址: ${mintToAddress}`);
        emitProgress();

        const mintTx = await contractConfig.token.mint(mintToAddress, amount, { gasLimit: 1_000_000 });
        result.messages.push(`Mint 交易哈希: ${mintTx.hash}`);
        emitProgress();

        const mintCheckInterval = await multiTransaction.trackTransactionConfirmations?.(
          provider,
          mintTx.hash,
          1,
          12
        );

        const mintReceipt = await mintTx.wait(2);
        if (mintCheckInterval) clearInterval(mintCheckInterval as NodeJS.Timeout);
        result.mintReceipt = mintReceipt;
        multiTransaction.updateStep(1, { status: "completed", confirmations: 12, estimatedTimeLeft: undefined });
        emitProgress();

        const balanceAfter = await contractConfig.token.balanceOf(mintToAddress);
        const totalSupplyAfter = await contractConfig.token.totalSupply();
        result.messages.push(`Mint 后余额: ${ethers.formatEther(balanceAfter)}`);
        result.messages.push(`Mint 后总供应量: ${ethers.formatEther(totalSupplyAfter)}`);
        result.messages.push("✓ Mint 操作完成");
        emitProgress();
      } catch (mintError: any) {
        const msg = mintError.message || mintError;
        result.success = false;
        result.errors.push(`Mint 操作失败: ${msg}`);
        multiTransaction.updateStep(1, { status: "failed", error: String(msg) });
        emitProgress();
      }

      // Step 2: Burn
      const burnAmount = amount / 2n;
      multiTransaction.setCurrentStep(2);
      multiTransaction.updateStep(2, { status: "in_progress" });
      result.messages.push("\n=== 开始 Burn 操作 ===");
      emitProgress();

      try {
        const balanceBeforeBurn = await contractConfig.token.balanceOf(burnFromAddress);
        const totalSupplyBeforeBurn = await contractConfig.token.totalSupply();
        result.messages.push(`Burn 前余额: ${ethers.formatEther(balanceBeforeBurn)}`);
        result.messages.push(`Burn 前总供应量: ${ethers.formatEther(totalSupplyBeforeBurn)}`);
        result.messages.push(`Burn 数量: ${ethers.formatEther(burnAmount)}`);
        result.messages.push(`Burn 从地址: ${burnFromAddress}`);
        emitProgress();

        const burnTx = await contractConfig.token.burn(burnFromAddress, burnAmount, { gasLimit: 1_000_000 });
        result.messages.push(`Burn 交易哈希: ${burnTx.hash}`);
        emitProgress();

        const burnCheckInterval = await multiTransaction.trackTransactionConfirmations?.(
          provider,
          burnTx.hash,
          2,
          12
        );

        const burnReceipt = await burnTx.wait(2);
        if (burnCheckInterval) clearInterval(burnCheckInterval as NodeJS.Timeout);
        result.burnReceipt = burnReceipt;
        multiTransaction.updateStep(2, { status: "completed", confirmations: 12, estimatedTimeLeft: undefined });
        emitProgress();

        const balanceAfterBurn = await contractConfig.token.balanceOf(burnFromAddress);
        const totalSupplyAfterBurn = await contractConfig.token.totalSupply();
        result.messages.push(`Burn 后余额: ${ethers.formatEther(balanceAfterBurn)}`);
        result.messages.push(`Burn 后总供应量: ${ethers.formatEther(totalSupplyAfterBurn)}`);
        result.messages.push("✓ Burn 操作完成");
        emitProgress();
      } catch (burnError: any) {
        const msg = burnError.message || burnError;
        result.success = false;
        result.errors.push(`Burn 操作失败: ${msg}`);
        multiTransaction.updateStep(2, { status: "failed", error: String(msg) });
        emitProgress();
      }

      // Step 3: 完成
      multiTransaction.setCurrentStep(3);
      if (result.success) {
        multiTransaction.updateStep(3, { status: "completed" });
        result.messages.push("\n✓ 所有操作完成！");
      } else {
        multiTransaction.updateStep(3, { status: "failed" });
        result.messages.push("\n✗ 部分操作失败，请查看错误信息");
      }

      emitProgress();
    } catch (error: any) {
      const msg = error.message || "未知错误";
      updateResult({ success: false, messages: [], errors: [msg] });
      if (multiTransaction.state) {
        multiTransaction.updateStep(multiTransaction.state.currentStep, { status: "failed", error: msg });
      }
    }
  };
}


