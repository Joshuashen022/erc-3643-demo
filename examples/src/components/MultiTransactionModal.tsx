import { MultiTransactionModalProps } from "../types/multiTransaction";
import "../styles/components/MultiTransactionModal.css";

/**
 * 多步骤交易流程模态框组件
 * 可复用的多步骤交易流程UI组件
 */
export default function MultiTransactionModal({
  isOpen,
  onClose,
  state,
  onToggleTechnicalDetails,
  technicalDetails,
  isLoading = false,
  title = "多交易流程",
  progressLabel,
  onSpeedUp,
}: MultiTransactionModalProps) {
  if (!isOpen || !state) {
    return null;
  }

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

        {/* 进度条和交易信息 */}
        <div className="multi-transaction-progress-section">
          <div className="multi-transaction-progress-bar">
            <div className="progress-bar-left">
              <div className="token-icon">🪙</div>
              <span>{progressLabel || "交易进行中"}</span>
            </div>
            <div className="progress-bar-center">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${(state.currentStep / state.totalSteps) * 100}%`,
                }}
              />
              <div className="progress-bar-icon">
                {state.currentStep < state.totalSteps ? "⟳" : "✓"}
              </div>
            </div>
            <div className="progress-bar-right">
              <span>进行中</span>
              <div className="token-icon">🪙</div>
            </div>
          </div>
          <div className="multi-transaction-progress-text">
            步骤 {state.currentStep}/{state.totalSteps}
          </div>
        </div>

        {/* 交易步骤列表 */}
        <div className="multi-transaction-steps">
          {state.steps.map((step) => (
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
                  {step.status === "completed" && step.txHash && (
                    <span>
                      已确认 - Tx: {step.txHash.slice(0, 6)}...{step.txHash.slice(-3)}
                    </span>
                  )}
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
                  {step.status === "failed" && (
                    <span className="step-error">
                      失败: {step.error || "未知错误"}
                    </span>
                  )}
                  {step.status === "pending" && <span>等待上一步完成</span>}
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
            onClick={onToggleTechnicalDetails}
            className="technical-details-button"
          >
            查看技术详情
            <span
              className={`chevron ${state.showTechnicalDetails ? "open" : ""}`}
            >
              ▼
            </span>
          </button>
          <button
            onClick={onClose}
            className="done-button"
            disabled={isLoading}
          >
            完成
          </button>
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

