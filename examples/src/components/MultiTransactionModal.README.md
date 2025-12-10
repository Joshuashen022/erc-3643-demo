# MultiTransactionModal 使用指南

这是一个可复用的多步骤交易流程组件，可以用于任何需要展示多步骤交易流程的场景。

## 文件结构

```
src/
├── types/
│   └── multiTransaction.ts          # 类型定义
├── hooks/
│   └── useMultiTransaction.ts       # 状态管理 Hook
├── components/
│   └── MultiTransactionModal.tsx    # UI 组件
└── styles/
    └── components/
        └── MultiTransactionModal.css # 样式文件
```

## 快速开始

### 1. 导入必要的模块

```tsx
import { useMultiTransaction } from "../hooks/useMultiTransaction";
import MultiTransactionModal from "./MultiTransactionModal";
import { TechnicalDetails } from "../types/multiTransaction";
```

### 2. 在组件中使用 Hook

```tsx
function YourComponent() {
  const [showModal, setShowModal] = useState(false);
  const [technicalDetails, setTechnicalDetails] = useState<TechnicalDetails | undefined>();
  
  // 使用多步骤交易流程 Hook
  const multiTransaction = useMultiTransaction();

  // 初始化步骤
  const handleStartTransaction = () => {
    multiTransaction.initialize([
      { id: 1, title: "步骤 1: 准备交易" },
      { id: 2, title: "步骤 2: 执行交易" },
      { id: 3, title: "步骤 3: 确认交易" },
    ]);
    setShowModal(true);
  };

  // 执行交易流程
  const executeTransaction = async () => {
    // Step 1
    multiTransaction.setCurrentStep(1);
    multiTransaction.updateStep(1, { status: "in_progress" });
    
    try {
      // 执行你的交易逻辑
      const tx = await yourContract.yourMethod();
      
      // 跟踪交易确认
      const checkInterval = await multiTransaction.trackTransactionConfirmations(
        provider,
        tx.hash,
        1,
        12 // 需要的确认数
      );
      
      const receipt = await tx.wait(2);
      if (checkInterval) clearInterval(checkInterval);
      
      multiTransaction.updateStep(1, { 
        status: "completed",
        txHash: receipt.hash 
      });
      
      // Step 2
      multiTransaction.setCurrentStep(2);
      // ... 继续其他步骤
      
    } catch (error: any) {
      multiTransaction.updateStep(1, { 
        status: "failed", 
        error: error.message 
      });
    }
  };

  return (
    <>
      <button onClick={handleStartTransaction}>开始交易</button>
      
      <MultiTransactionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          multiTransaction.reset();
        }}
        state={multiTransaction.state}
        onToggleTechnicalDetails={multiTransaction.toggleTechnicalDetails}
        technicalDetails={technicalDetails}
        isLoading={false}
        title="我的交易流程"
        progressLabel="交易进行中"
        onSpeedUp={(stepId) => {
          // 实现加速逻辑
          console.log("加速步骤:", stepId);
        }}
      />
    </>
  );
}
```

## API 参考

### useMultiTransaction Hook

#### 方法

- `initialize(steps: Omit<TransactionStep, "status">[])` - 初始化多步骤流程
- `updateStep(stepId: number, updates: Partial<TransactionStep>)` - 更新步骤状态
- `setCurrentStep(stepNumber: number)` - 设置当前步骤
- `toggleTechnicalDetails()` - 切换技术详情显示
- `reset()` - 重置所有状态
- `trackTransactionConfirmations(provider, txHash, stepId, requiredConfirmations, onUpdate?)` - 跟踪交易确认进度

#### 状态

- `state: MultiTransactionState | null` - 当前状态

### MultiTransactionModal 组件

#### Props

- `isOpen: boolean` - 是否显示模态框
- `onClose: () => void` - 关闭回调
- `state: MultiTransactionState | null` - 交易状态
- `onToggleTechnicalDetails?: () => void` - 切换技术详情回调
- `technicalDetails?: TechnicalDetails` - 技术详情数据
- `isLoading?: boolean` - 是否加载中
- `title?: string` - 标题（默认: "多交易流程"）
- `progressLabel?: string` - 进度标签
- `onSpeedUp?: (stepId: number) => void` - 加速回调

## 步骤状态

- `pending` - 等待中
- `in_progress` - 进行中
- `completed` - 已完成
- `failed` - 失败

## 完整示例

参考 `FinancePanel.tsx` 中的 `handleMintAndBurnExample` 函数，查看完整的使用示例。

## 自定义样式

所有样式都在 `MultiTransactionModal.css` 中，可以根据需要修改。

