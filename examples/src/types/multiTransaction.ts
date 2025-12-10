// 步骤状态类型
export type StepStatus = "pending" | "in_progress" | "completed" | "failed";

// 交易步骤接口
export interface TransactionStep {
  id: number;
  title: string;
  status: StepStatus;
  txHash?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  estimatedTimeLeft?: number; // 秒
  error?: string;
}

// 多交易状态接口
export interface MultiTransactionState {
  currentStep: number;
  totalSteps: number;
  steps: TransactionStep[];
  showTechnicalDetails: boolean;
}

// 技术详情数据接口
export interface TechnicalDetails {
  messages?: string[];
  errors?: string[];
  receipts?: Array<{
    label: string;
    hash: string;
  }>;
}

// MultiTransactionModal 组件的 Props
export interface MultiTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: MultiTransactionState | null;
  onToggleTechnicalDetails?: () => void;
  technicalDetails?: TechnicalDetails;
  isLoading?: boolean;
  title?: string;
  progressLabel?: string;
  onSpeedUp?: (stepId: number) => void;
}

