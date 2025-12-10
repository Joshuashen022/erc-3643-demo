import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../utils/config";
import { createContractConfig } from "../utils/contracts";
import { deployMockModule } from "../utils/operations";
import { RPC_URL } from "../utils/config";
import { useMultiTransaction } from "../hooks/useMultiTransaction";
import MultiTransactionModal from "./MultiTransactionModal";

interface CompliancePanelProps {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Signer;
  account: string;
  setRoleChoose: (value: boolean) => void;
}

export default function CompliancePanel({ provider, wallet, account, setRoleChoose }: CompliancePanelProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  
  // 模块示例相关状态
  const [moduleExampleResult, setModuleExampleResult] = useState<{
    success: boolean;
    messages: string[];
    errors: string[];
  } | null>(null);
  const [showModuleExampleResult, setShowModuleExampleResult] = useState(false);
  const [moduleExampleLoading, setModuleExampleLoading] = useState(false);
  
  // 使用多步骤交易流程 hook
  const multiTransaction = useMultiTransaction();
  
  // Owner 检查状态
  const [ownerStatus, setOwnerStatus] = useState<Record<string, { isOwner: boolean | null; checking: boolean }>>({
    modularCompliance: { isOwner: null, checking: false },
  });

  // ModularCompliance 状态
  const [moduleAddress, setModuleAddress] = useState("");
  const [moduleAddressToRemove, setModuleAddressToRemove] = useState("");
  const [moduleAddressForCall, setModuleAddressForCall] = useState("");
  const [callData, setCallData] = useState("");
  const [tokenToBind, setTokenToBind] = useState("");
  const [tokenToUnbind, setTokenToUnbind] = useState("");

  const showResult = (key: string, message: string) => {
    setResults((prev) => ({ ...prev, [key]: message }));
  };

  // 检查 owner 角色
  useEffect(() => {
    const checkOwnerRole = async (contractName: string, contractAddress: string | undefined) => {
      if (!account || !contractAddress) {
        setOwnerStatus((prev) => ({
          ...prev,
          [contractName]: { isOwner: null, checking: false },
        }));
        return;
      }

      setOwnerStatus((prev) => ({
        ...prev,
        [contractName]: { isOwner: null, checking: true },
      }));

      try {
        const contract = new ethers.Contract(
          contractAddress,
          ["function owner() external view returns (address)"],
          provider
        );
        const ownerAddress = await contract.owner();
        const isOwner = ownerAddress.toLowerCase() === account.toLowerCase();
        setOwnerStatus((prev) => ({
          ...prev,
          [contractName]: { isOwner, checking: false },
        }));
      } catch (error: any) {
        console.error(`检查 ${contractName} owner 角色失败:`, error);
        setOwnerStatus((prev) => ({
          ...prev,
          [contractName]: { isOwner: null, checking: false },
        }));
      }
    };

    checkOwnerRole("modularCompliance", CONTRACT_ADDRESSES.modularCompliance);
  }, [account, provider]);

  // ModularCompliance 操作
  const handleAddModule = async () => {
    if (!moduleAddress || !CONTRACT_ADDRESSES.modularCompliance) {
      showResult("addModule", "请填写模块地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.modularCompliance,
        [
          "function addModule(address _module) external",
        ],
        wallet
      );
      const tx = await contract.addModule(moduleAddress);
      await tx.wait();
      showResult("addModule", `成功添加模块，交易哈希: ${tx.hash}`);
      setModuleAddress("");
    } catch (error: any) {
      showResult("addModule", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveModule = async () => {
    if (!moduleAddressToRemove || !CONTRACT_ADDRESSES.modularCompliance) {
      showResult("removeModule", "请填写模块地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.modularCompliance,
        [
          "function removeModule(address _module) external",
        ],
        wallet
      );
      const tx = await contract.removeModule(moduleAddressToRemove);
      await tx.wait();
      showResult("removeModule", `成功移除模块，交易哈希: ${tx.hash}`);
      setModuleAddressToRemove("");
    } catch (error: any) {
      showResult("removeModule", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCallModuleFunction = async () => {
    if (!moduleAddressForCall || !callData || !CONTRACT_ADDRESSES.modularCompliance) {
      showResult("callModuleFunction", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.modularCompliance,
        [
          "function callModuleFunction(bytes calldata callData, address _module) external",
        ],
        wallet
      );
      const tx = await contract.callModuleFunction(callData, moduleAddressForCall);
      await tx.wait();
      showResult("callModuleFunction", `成功调用模块函数，交易哈希: ${tx.hash}`);
      setModuleAddressForCall("");
      setCallData("");
    } catch (error: any) {
      showResult("callModuleFunction", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetModules = async () => {
    if (!CONTRACT_ADDRESSES.modularCompliance) {
      showResult("getModules", "请配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.modularCompliance,
        [
          "function getModules() external view returns (address[])",
        ],
        provider
      );
      const modules = await contract.getModules();
      showResult("getModules", `模块列表: ${modules.join(", ")}`);
    } catch (error: any) {
      showResult("getModules", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBindToken = async () => {
    if (!tokenToBind || !CONTRACT_ADDRESSES.modularCompliance) {
      showResult("bindToken", "请填写代币地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.modularCompliance,
        [
          "function bindToken(address _token) external",
        ],
        wallet
      );
      const tx = await contract.bindToken(tokenToBind);
      await tx.wait();
      showResult("bindToken", `成功绑定代币，交易哈希: ${tx.hash}`);
      setTokenToBind("");
    } catch (error: any) {
      showResult("bindToken", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnbindToken = async () => {
    if (!tokenToUnbind || !CONTRACT_ADDRESSES.modularCompliance) {
      showResult("unbindToken", "请填写代币地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.modularCompliance,
        [
          "function unbindToken(address _token) external",
        ],
        wallet
      );
      const tx = await contract.unbindToken(tokenToUnbind);
      await tx.wait();
      showResult("unbindToken", `成功解绑代币，交易哈希: ${tx.hash}`);
      setTokenToUnbind("");
    } catch (error: any) {
      showResult("unbindToken", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCallModuleExample = async () => {
    setLoading(true);
    setModuleExampleLoading(true);
    setShowModuleExampleResult(true);

    // 初始化多步骤状态
    multiTransaction.initialize([
      {
        id: 1,
        title: "部署 MockModule",
      },
      {
        id: 2,
        title: "添加模块",
      },
      {
        id: 3,
        title: "移除模块",
      },
      {
        id: 4,
        title: "验证结果",
      },
      {
        id: 5,
        title: "完成所有操作",
      },
    ]);

    // 初始化结果状态
    setModuleExampleResult({
      success: true,
      messages: ["正在执行示例操作，请稍候..."],
      errors: [],
    });

    const updateResult = (partial: Partial<NonNullable<typeof moduleExampleResult>>) => {
      setModuleExampleResult((prev) => {
        const base = prev || { success: true, messages: [], errors: [] };
        return {
          success: partial.success ?? base.success,
          messages: partial.messages ? [...partial.messages] : [...base.messages],
          errors: partial.errors ? [...partial.errors] : [...base.errors],
        };
      });
    };

    try {
      // 第一步：部署 MockModule
      multiTransaction.setCurrentStep(1);
      multiTransaction.updateStep(1, { status: "in_progress" });
      updateResult({ messages: ["\n=== 步骤 1: 部署 MockModule ==="] });

      const deployResult = await deployMockModule(provider, wallet, RPC_URL);

      if (!deployResult.success || !deployResult.moduleAddress) {
        const errorMsg = deployResult.errors.length > 0 
          ? deployResult.errors.join("\n") 
          : "部署 MockModule 失败";
        multiTransaction.updateStep(1, { status: "failed", error: errorMsg });
        updateResult({
          success: false,
          messages: [...deployResult.messages],
          errors: [errorMsg],
        });
        return;
      }

      const moduleAddress = deployResult.moduleAddress;
      updateResult({ messages: [...deployResult.messages] });
      multiTransaction.updateStep(1, { status: "completed" });

      // 第二步：添加并移除模块
      const contractConfig = await createContractConfig(provider, wallet, {
        useClaimIssuerPrivateKeys: true,
      });

      // 2.1 检查模块是否已绑定并添加
      multiTransaction.setCurrentStep(2);
      multiTransaction.updateStep(2, { status: "in_progress" });
      updateResult({ messages: ["\n=== 步骤 2: 添加模块 ==="] });

      const isBoundBefore = await contractConfig.compliance.isModuleBound(moduleAddress);
      updateResult({ messages: [`模块绑定状态: ${isBoundBefore ? "已绑定" : "未绑定"}`] });

      if (!isBoundBefore) {
        updateResult({ messages: ["\n--- 添加模块 ---"] });
        try {
          const addModuleTx = await contractConfig.compliance.addModule(moduleAddress, {
            gasLimit: 1000000,
          });
          updateResult({ messages: [`添加模块交易哈希: ${addModuleTx.hash}`] });

          const addCheckInterval = await multiTransaction.trackTransactionConfirmations(
            provider,
            addModuleTx.hash,
            2,
            12
          );

          await addModuleTx.wait(2);
          if (addCheckInterval) clearInterval(addCheckInterval);
          updateResult({ messages: ["✓ 模块添加成功"] });
          multiTransaction.updateStep(2, { status: "completed", confirmations: 12, estimatedTimeLeft: undefined });
        } catch (error: any) {
          updateResult({
            success: false,
            errors: [`添加模块失败: ${error.message}`],
          });
          multiTransaction.updateStep(2, { status: "failed", error: error.message });
          return;
        }
      } else {
        updateResult({ messages: ["模块已绑定，跳过添加步骤"] });
        multiTransaction.updateStep(2, { status: "completed" });
      }

      // 检查 canTransfer（在移除前）
      try {
        const canTransfer = await contractConfig.compliance.canTransfer(
          "0x0000000000000000000000000000000000001111",
          "0x0000000000000000000000000000000000002222",
          ethers.parseEther("1")
        );
        updateResult({ messages: [`移除前 canTransfer: ${canTransfer}`] });
      } catch (error: any) {
        updateResult({ messages: [`检查 canTransfer 失败: ${error.message}`] });
      }

      // 2.2 移除模块
      multiTransaction.setCurrentStep(3);
      multiTransaction.updateStep(3, { status: "in_progress" });
      updateResult({ messages: ["\n=== 步骤 3: 移除模块 ==="] });

      try {
        const removeModuleTx = await contractConfig.compliance.removeModule(moduleAddress, {
          gasLimit: 1000000,
        });
        updateResult({ messages: [`移除模块交易哈希: ${removeModuleTx.hash}`] });

        const removeCheckInterval = await multiTransaction.trackTransactionConfirmations(
          provider,
          removeModuleTx.hash,
          3,
          12
        );

        await removeModuleTx.wait(2);
        if (removeCheckInterval) clearInterval(removeCheckInterval);
        updateResult({ messages: ["✓ 模块移除成功"] });
        multiTransaction.updateStep(3, { status: "completed", confirmations: 12, estimatedTimeLeft: undefined });
      } catch (error: any) {
        updateResult({
          success: false,
          errors: [`移除模块失败: ${error.message}`],
        });
        multiTransaction.updateStep(3, { status: "failed", error: error.message });
        return;
      }

      // 2.3 验证结果
      multiTransaction.setCurrentStep(4);
      multiTransaction.updateStep(4, { status: "in_progress" });
      updateResult({ messages: ["\n=== 步骤 4: 验证结果 ==="] });

      const isBoundAfter = await contractConfig.compliance.isModuleBound(moduleAddress);
      const modules = await contractConfig.compliance.getModules();
      const found = modules.map((m: string) => ethers.getAddress(m)).includes(moduleAddress);

      updateResult({ messages: [`模块已移除: ${!isBoundAfter && !found}`] });
      updateResult({ messages: [`当前模块列表: ${modules.join(", ") || "空"}`] });

      // 检查 canTransfer（移除后）
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

      // 完成
      multiTransaction.setCurrentStep(5);
      multiTransaction.updateStep(5, { status: "completed" });
      updateResult({ messages: ["\n=== 所有操作成功完成 ==="] });
    } catch (error: any) {
      updateResult({
        success: false,
        errors: [`错误: ${error.message}`],
      });
      if (multiTransaction.state) {
        multiTransaction.updateStep(multiTransaction.state.currentStep, { status: "failed", error: error.message });
      }
    } finally {
      setLoading(false);
      setModuleExampleLoading(false);
    }
  }
  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">监管管理面板</h2>
        <div className="panel-actions">
          <button
            onClick={handleCallModuleExample}
            disabled={loading}
            className="example-button"
          >
            <span style={{ fontSize: "16px", lineHeight: 1 }}>▶</span>
            <span>运行示例</span>
          </button>
          <button
            onClick={() => setRoleChoose(false)}
            className="btn-secondary"
          >
            返回角色选择
          </button>
        </div>
      </div>


      {/* ModularCompliance */}
      <div className="section">
        <h3>合规模块管理 (ModularCompliance)</h3>
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          {ownerStatus.modularCompliance.checking ? (
            <div style={{ color: "#666", fontSize: "0.875rem" }}>正在检查 owner 角色...</div>
          ) : ownerStatus.modularCompliance.isOwner === null ? (
            <div style={{ color: "#999", fontSize: "0.875rem" }}>无法检查 owner 角色（请确保已配置合约地址）</div>
          ) : ownerStatus.modularCompliance.isOwner ? (
            <div style={{ color: "#28a745", fontSize: "0.875rem", fontWeight: "500" }}>
              ✓ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 是 Owner 角色
            </div>
          ) : (
            <div style={{ color: "#dc3545", fontSize: "0.875rem", fontWeight: "500" }}>
              ✗ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 不是 Owner 角色
            </div>
          )}
        </div>
        
        {/* 添加模块 */}
        <div className="subsection">
          <h4>添加模块 addModule(address _module)</h4>
          <div className="form-group">
            <label>模块地址</label>
            <input
              type="text"
              value={moduleAddress}
              onChange={(e) => setModuleAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleAddModule} disabled={loading} className="btn-primary">
              添加模块
            </button>
          </div>
          {results.addModule && (
            <div className={`result ${results.addModule.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.addModule}</pre>
            </div>
          )}
        </div>

        {/* 移除模块 */}
        <div className="subsection">
          <h4>移除模块 removeModule(address _module)</h4>
          <div className="form-group">
            <label>模块地址</label>
            <input
              type="text"
              value={moduleAddressToRemove}
              onChange={(e) => setModuleAddressToRemove(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleRemoveModule} disabled={loading} className="btn-danger">
              移除模块
            </button>
          </div>
          {results.removeModule && (
            <div className={`result ${results.removeModule.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.removeModule}</pre>
            </div>
          )}
        </div>

        {/* 调用模块函数 */}
        <div className="subsection">
          <h4>调用模块函数 callModuleFunction(bytes calldata callData, address _module)</h4>
          <div className="form-group">
            <label>模块地址</label>
            <input
              type="text"
              value={moduleAddressForCall}
              onChange={(e) => setModuleAddressForCall(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>调用数据（十六进制）</label>
            <input
              type="text"
              value={callData}
              onChange={(e) => setCallData(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleCallModuleFunction} disabled={loading} className="btn-success">
              调用模块函数
            </button>
          </div>
          {results.callModuleFunction && (
            <div className={`result ${results.callModuleFunction.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.callModuleFunction}</pre>
            </div>
          )}
        </div>

        {/* 查询所有模块 */}
        <div className="subsection">
          <h4>查询所有模块 getModules()</h4>
          <div className="button-group">
            <button onClick={handleGetModules} disabled={loading} className="btn-secondary">
              查询所有模块
            </button>
          </div>
          {results.getModules && (
            <div className={`result ${results.getModules.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.getModules}</pre>
            </div>
          )}
        </div>

        {/* 绑定代币 */}
        <div className="subsection">
          <h4>绑定代币 bindToken(address _token)</h4>
          <div className="form-group">
            <label>代币地址</label>
            <input
              type="text"
              value={tokenToBind}
              onChange={(e) => setTokenToBind(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleBindToken} disabled={loading} className="btn-primary">
              绑定代币
            </button>
          </div>
          {results.bindToken && (
            <div className={`result ${results.bindToken.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.bindToken}</pre>
            </div>
          )}
        </div>

        {/* 解绑代币 */}
        <div className="subsection">
          <h4>解绑代币 unbindToken(address _token)</h4>
          <div className="form-group">
            <label>代币地址</label>
            <input
              type="text"
              value={tokenToUnbind}
              onChange={(e) => setTokenToUnbind(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleUnbindToken} disabled={loading} className="btn-danger">
              解绑代币
            </button>
          </div>
          {results.unbindToken && (
            <div className={`result ${results.unbindToken.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.unbindToken}</pre>
            </div>
          )}
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.modularCompliance ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.modularCompliance}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
      </div>

      {/* 多步骤交易流程模态框 */}
      <MultiTransactionModal
        isOpen={showModuleExampleResult}
        onClose={() => {
          setShowModuleExampleResult(false);
          multiTransaction.reset();
        }}
        state={multiTransaction.state}
        onToggleTechnicalDetails={multiTransaction.toggleTechnicalDetails}
        technicalDetails={
          moduleExampleResult
            ? {
                messages: moduleExampleResult.messages,
                errors: moduleExampleResult.errors,
                receipts: [],
              }
            : undefined
        }
        isLoading={moduleExampleLoading}
        title="添加并移除模块"
        progressLabel="模块管理流程"
        onSpeedUp={(stepId) => {
          // 加速功能可以在这里实现
          console.log("加速步骤:", stepId);
        }}
      />
    </div>
  );
}

