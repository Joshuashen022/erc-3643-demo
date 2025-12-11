import { MultiTransactionModalProps, TransactionStep } from "../types/multiTransaction";
import { useState, useEffect } from "react";
import { RegisterNewIdentityResult } from "../utils/operations";
import { useMultiTransaction } from "../hooks/useMultiTransaction";
import { REGISTER_NEW_IDENTITY_STEPS, createRegisterNewIdentityHandler } from "../flows/registerNewIdentity";
import { COMPLIANCE_FLOW_STEPS, createComplianceFlowHandler, ComplianceFlowResult } from "../flows/complianceFlow";
import { FINANCE_FLOW_STEPS, createFinanceFlowHandler, FinanceFlowResult } from "../flows/financeFlow";
import { LEGAL_FLOW_STEPS, createLegalFlowHandler, LegalFlowResult } from "../flows/legalFlow";
import { PUBLIC_FLOW_STEPS, createPublicFlowHandler, PublicFlowResult } from "../flows/publicFlow";
import { VALIDATE_DEPLOYMENT_STEPS, createValidateDeploymentFlowHandler, ValidateDeploymentFlowResult } from "../flows/validateDeployment";
import "../styles/components/MultiTransactionModal.css";

/**
 * 多步骤交易流程模态框组件
 * 可复用的多步骤交易流程UI组件
 */
export default function MultiTransactionModal({
  isOpen,
  onClose,
  onToggleTechnicalDetails,
  isLoading = false,
  title = "多交易流程",
  provider,
  wallet,
}: MultiTransactionModalProps) {
  type FlowResult =
    | RegisterNewIdentityResult
    | ComplianceFlowResult
    | FinanceFlowResult
    | LegalFlowResult
    | PublicFlowResult
    | ValidateDeploymentFlowResult;

  const [callFactoryResult, setCallFactoryResult] = useState<FlowResult | null>(null);
  const multiTransaction = useMultiTransaction();
  const state = multiTransaction.state;
  const technicalDetails = {
    messages: callFactoryResult?.messages || [],
    errors: callFactoryResult?.errors || [],
    receipts: [] as Array<{ label: string; hash: string }>,
  };
  const onSpeedUp = (stepId: number) => {
    console.log("加速步骤:", stepId);
  };
  // 默认步骤配置
  const defaultSteps: Omit<TransactionStep, "status">[] = [
    {
      id: -1,
      title: "出错步骤",
    },
  ];

  // 各模块对应的步骤配置，便于 Modal 自行初始化
  const titleToStepsMap: Record<string, Omit<TransactionStep, "status">[]> = {
    "注册新身份": REGISTER_NEW_IDENTITY_STEPS,
    "添加并移除模块": COMPLIANCE_FLOW_STEPS,
    "多交易流程": FINANCE_FLOW_STEPS,
    "添加并移除 Claim Topic": LEGAL_FLOW_STEPS,
    "转账操作": PUBLIC_FLOW_STEPS,
    "验证部署": VALIDATE_DEPLOYMENT_STEPS,
  };

  // 根据 title 展示对应的基础信息描述
  const titleDescriptionMap: Record<string, string> = {
    "注册新身份": "创建并注册新的身份，完成基础信息和凭证初始化。",
    "添加并移除模块": "为身份添加或移除合规/功能模块，验证模块管理流程。",
    "多交易流程": "演示多笔交易的顺序处理与状态跟踪能力。",
    "添加并移除 Claim Topic": "管理身份的 Claim Topic 列表，测试新增与删除。",
    "转账操作": "执行代币转账并展示进度、确认和失败处理。",
    "验证部署": "校验合约部署情况并回传部署验证结果。",
  };
  const basicDescription =
    titleDescriptionMap[title] || "该用例的详细描述暂未提供，敬请关注后续更新。";
  
  // 当模态框打开时，自动初始化步骤
  useEffect(() => {
    if (isOpen && !state) {
      // 根据 title 自动选择对应的步骤配置，优先使用 title 映射
      const stepsByTitle = titleToStepsMap[title];
      const stepsToUse = stepsByTitle || defaultSteps;
      multiTransaction.initialize(stepsToUse);
    }
  }, [isOpen, state, multiTransaction, title]);

  // 当模态框关闭时，清理状态
  useEffect(() => {
    if (!isOpen) {
      setCallFactoryResult(null);
      multiTransaction.reset();
    }
  }, [isOpen, multiTransaction]);

  if (!isOpen || !state) {
    return null;
  }

  // 处理多交易流程操作（用于 finance 等其他模块）
  const handleDefaultFlow = async () => {
    // 这个函数可以根据不同的模块需求来实现
    // 目前作为占位符，未来可以扩展
    if (!provider || !wallet) {
      setCallFactoryResult({
        success: false,
        messages: [],
        errors: ["Provider 或 Wallet 未提供"],
      });
      return;
    }

    // 这里可以根据 title 或其他参数来执行不同的操作
    // 例如：finance 模块的 mintAndBurn 操作
    setCallFactoryResult({
      success: true,
      messages: ["多交易流程功能待实现3333"],
      errors: [],
    });
  };

  // 根据 title 选择执行的操作函数
  const getOperationHandler = (): (Promise<void>) => {
    // 根据 title 映射到不同的操作处理函数
    const titleToHandler: Record<string, () => Promise<void>> = {
      "注册新身份": createRegisterNewIdentityHandler({
        provider,
        wallet,
        multiTransaction,
        setCallFactoryResult,
      }),
      "添加并移除模块": createComplianceFlowHandler({
        provider,
        wallet,
        multiTransaction,
        setResult: setCallFactoryResult as any,
      }),
      "多交易流程": createFinanceFlowHandler({
        provider,
        wallet,
        multiTransaction,
        setResult: setCallFactoryResult as any,
      }),
      "添加并移除 Claim Topic": createLegalFlowHandler({
        provider,
        wallet,
        multiTransaction,
        setResult: setCallFactoryResult as any,
      }),
      "转账操作": createPublicFlowHandler({
        provider,
        wallet,
        multiTransaction,
        setResult: setCallFactoryResult as any,
      }),
      "验证部署": createValidateDeploymentFlowHandler({
        provider,
        wallet,
        multiTransaction,
        setResult: setCallFactoryResult as any,
      }),
    };
    const returns = titleToHandler[title]?.() ?? handleDefaultFlow();
    // 返回对应的处理函数，如果没有匹配则使用默认的注册新身份
    return returns;
  };
  
  return (
    <div className="multi-transaction-modal">
      <div className="multi-transaction-content">
        <div className="multi-transaction-header">
          <h2 className="multi-transaction-title">{title}</h2>
          <button
            onClick={onClose}
            className="multi-transaction-close-button"
          >
            ×
          </button>
        </div>

        {/* 基本信息展示 */}
        <div className="multi-transaction-basic-info">
          <div className="basic-info-label">用例概述</div>
          <div className="basic-info-text">{basicDescription}</div>
        </div>

        {/* 进度条和交易信息 */}
        <div className="multi-transaction-progress-section">
          <div className="multi-transaction-progress-bar">
            <div className="progress-bar-left">
              <div className="token-icon">🪙</div>
              <span>{ "交易进行中"}</span>
            </div>
            <div className="progress-bar-center">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${state ? (state.currentStep / state.totalSteps) * 100 : 0}%`,
                }}
              />
              {/* <div className="progress-bar-icon">
                {state && state.currentStep < state.totalSteps ? "⟳" : "✓"}
              </div> */}
            </div>
            <div className="progress-bar-right">
              <span>进行中</span>
              <div className="token-icon">🪙</div>
            </div>
          </div>
          <div className="multi-transaction-progress-text">
            步骤 {state ? `${state.currentStep}/${state.totalSteps}` : "0/0"}
          </div>
        </div>

        {/* 交易步骤列表 */}
        <div className="multi-transaction-steps">
          {state && state.steps.map((step) => (
            <div key={step.id} className="multi-transaction-step">
              <div className="step-connector" />
              <div className={`step-icon step-icon-${step.status}`}>
                {step.status === "completed" && "✓"}
                {step.status === "in_progress" && "⟳"}
                {step.status === "failed" && "✗"}
                {step.status === "pending" && ""}
              </div>
              <div className="step-content">
                <div className="step-title">{step.title}</div>
                <div className="step-status">
                  {step.status === "in_progress" && (
                    <div className="step-progress-info">
                      {step.confirmations !== undefined &&
                      step.requiredConfirmations !== undefined ? (
                        <span>
                          等待确认中 ({step.confirmations}/{step.requiredConfirmations})...
                          {step.estimatedTimeLeft && (
                            <span> 预计剩余 {step.estimatedTimeLeft} 秒</span>
                          )}
                        </span>
                      ) : (
                        <span>处理中...</span>
                      )}
                    </div>
                  )}
                  {step.status === "pending" && <span>等待上一步完成</span>}
                  {step.status === "failed" && (
                    <span className="step-error">
                      失败: {step.error || "未知错误"}
                    </span>
                  )}
                  {step.status === "completed" && step.txHash && (
                    <span>
                      已确认 - Tx: {step.txHash.slice(0, 6)}...{step.txHash.slice(-3)}
                    </span>
                  )}
                  {step.status === "completed" && step.completeInfo && (
                    <span>
                      已确认 - {step.completeInfo}
                    </span>
                  )}
                </div>
                {step.status === "in_progress" && step.txHash && onSpeedUp && (
                  <button
                    className="speed-up-button"
                    onClick={() => onSpeedUp(step.id)}
                  >
                    加速
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 底部操作 */}
        <div className="multi-transaction-footer">
          <button
            onClick={onToggleTechnicalDetails || multiTransaction.toggleTechnicalDetails}
            className="technical-details-button"
          >
            查看技术详情
            <span
              className={`chevron ${state && state.showTechnicalDetails ? "open" : ""}`}
            >
              ▼
            </span>
          </button>
          {state && state.currentStep === 0 && (
            <button
              onClick={getOperationHandler}
              className="done-button"
              disabled={isLoading || !provider || !wallet}
            >
              开始交易
            </button>
          )}
          {(state && state.currentStep > 0 && state.steps.every(s => s.status === "completed" || s.status === "failed")) && (
            <button
              onClick={onClose}
              className="done-button"
              disabled={isLoading}
            >
              完成
            </button>
          )}
        </div>

        {/* 技术详情（可展开） */}
        {state.showTechnicalDetails && technicalDetails && (
          <div className="technical-details-section">
            {technicalDetails.messages && technicalDetails.messages.length > 0 && (
              <div className="technical-details-item">
                <h4>操作信息：</h4>
                <pre className="technical-details-pre">
                  {technicalDetails.messages.join("\n")}
                </pre>
              </div>
            )}
            {technicalDetails.receipts &&
              technicalDetails.receipts.length > 0 && (
                <div className="technical-details-item">
                  <h4>交易哈希：</h4>
                  <pre className="technical-details-pre">
                    {technicalDetails.receipts
                      .map((r) => `${r.label}: ${r.hash}`)
                      .join("\n")}
                  </pre>
                </div>
              )}
            {technicalDetails.errors && technicalDetails.errors.length > 0 && (
              <div className="technical-details-item">
                <h4>错误信息：</h4>
                <pre className="technical-details-pre error">
                  {technicalDetails.errors.join("\n")}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

