import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { TransactionStep, MultiTransactionState } from "../types/multiTransaction";

export interface MultiTransactionController {
  state: MultiTransactionState | null;
  initialize: (steps: Omit<TransactionStep, "status">[]) => void;
  updateStep: (stepId: number, updates: Partial<TransactionStep>) => void;
  setCurrentStep: (stepNumber: number) => void;
  trackTransactionConfirmations?: (
    provider: ethers.JsonRpcProvider,
    txHash: string,
    stepId: number,
    requiredConfirmations?: number,
    onUpdate?: (confirmations: number, estimatedTimeLeft?: number) => void
  ) => Promise<NodeJS.Timeout | number | undefined>;
  toggleTechnicalDetails: () => void;
  reset: () => void;
}

/**
 * 多步骤交易流程的 Hook
 */
export function useMultiTransaction(): MultiTransactionController {
  const [state, setState] = useState<MultiTransactionState | null>(null);

  /**
   * 初始化多步骤交易流程
   */
  const initialize = useCallback((steps: Omit<TransactionStep, "status">[]) => {
    const initialSteps: TransactionStep[] = steps.map((step) => ({
      ...step,
      status: "pending" as const,
    }));

    setState({
      currentStep: 0,
      totalSteps: steps.length,
      steps: initialSteps,
      showTechnicalDetails: false,
    });
  }, []);

  /**
   * 更新步骤状态
   */
  const updateStep = useCallback((stepId: number, updates: Partial<TransactionStep>) => {
    setState((prev) => {
      if (!prev) return prev;
      const newSteps = prev.steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      );
      return { ...prev, steps: newSteps };
    });
  }, []);

  /**
   * 设置当前步骤
   */
  const setCurrentStep = useCallback((stepNumber: number) => {
    setState((prev) => {
      if (!prev) return prev;
      return { ...prev, currentStep: stepNumber };
    });
  }, []);

  /**
   * 切换技术详情显示
   */
  const toggleTechnicalDetails = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      return { ...prev, showTechnicalDetails: !prev.showTechnicalDetails };
    });
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setState(null);
  }, []);

  /**
   * 跟踪交易确认进度
   */
  const trackTransactionConfirmations = useCallback(
    async (
      provider: ethers.JsonRpcProvider,
      txHash: string,
      stepId: number,
      requiredConfirmations: number = 12,
      onUpdate?: (confirmations: number, estimatedTimeLeft?: number) => void
    ) => {
      updateStep(stepId, { txHash, confirmations: 0, requiredConfirmations });

      const checkInterval = setInterval(async () => {
        try {
          const tx = await provider.getTransaction(txHash);
          if (!tx) {
            clearInterval(checkInterval);
            return;
          }

          const currentBlock = await provider.getBlockNumber();
          const confirmations = tx.blockNumber ? currentBlock - tx.blockNumber + 1 : 0;

          // 估算剩余时间（假设每个区块12秒）
          const remainingConfirmations = Math.max(0, requiredConfirmations - confirmations);
          const estimatedTimeLeft = remainingConfirmations * 12;

          updateStep(stepId, {
            confirmations,
            estimatedTimeLeft: estimatedTimeLeft > 0 ? estimatedTimeLeft : undefined,
          });

          if (onUpdate) {
            onUpdate(confirmations, estimatedTimeLeft > 0 ? estimatedTimeLeft : undefined);
          }

          if (confirmations >= requiredConfirmations) {
            clearInterval(checkInterval);
            updateStep(stepId, { status: "completed", estimatedTimeLeft: undefined });
          }
        } catch (error) {
          console.error("检查交易确认失败:", error);
          clearInterval(checkInterval);
        }
      }, 2000); // 每2秒检查一次

      return checkInterval;
    },
    [updateStep]
  );

  return {
    state,
    initialize,
    updateStep,
    setCurrentStep,
    toggleTechnicalDetails,
    reset,
    trackTransactionConfirmations,
  };
}

