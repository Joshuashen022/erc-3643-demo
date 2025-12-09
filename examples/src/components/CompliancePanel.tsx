import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../utils/config";
import { createContractConfig } from "../utils/contracts";
import { deployMockModule, addAndRemoveModule } from "../utils/operations";
import { RPC_URL } from "../utils/config";

interface CompliancePanelProps {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Signer;
  account: string;
}

export default function CompliancePanel({ provider, wallet, account }: CompliancePanelProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  
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
    showResult("callModuleExample", "正在执行示例操作：1. 部署 MockModule  2. 添加并移除模块...");

    try {
      // 第一步：部署 MockModule
      showResult("callModuleExample", "步骤 1/2: 正在部署 MockModule...");
      const deployResult = await deployMockModule(provider, wallet, RPC_URL);

      if (!deployResult.success || !deployResult.moduleAddress) {
        const errorMsg = deployResult.errors.length > 0 
          ? deployResult.errors.join("\n") 
          : "部署 MockModule 失败";
        showResult("callModuleExample", `错误: ${errorMsg}\n\n详细信息:\n${deployResult.messages.join("\n")}`);
        return;
      }

      const moduleAddress = deployResult.moduleAddress;
      showResult("callModuleExample", `步骤 1/2 完成: MockModule 已部署，地址: ${moduleAddress}\n\n步骤 2/2: 正在添加并移除模块...`);

      // 第二步：添加并移除模块
      const contractConfig = await createContractConfig(provider, wallet, {
        useClaimIssuerPrivateKeys: true,
      });

      const addRemoveResult = await addAndRemoveModule(contractConfig, moduleAddress, RPC_URL);

      if (!addRemoveResult.success) {
        const errorMsg = addRemoveResult.errors.length > 0 
          ? addRemoveResult.errors.join("\n") 
          : "添加并移除模块失败";
        showResult("callModuleExample", `步骤 1 成功，但步骤 2 失败:\n错误: ${errorMsg}\n\n详细信息:\n${deployResult.messages.join("\n")}\n\n${addRemoveResult.messages.join("\n")}`);
        return;
      }

      // 成功
      const allMessages = [
        "=== 示例操作完成 ===\n",
        "步骤 1: 部署 MockModule",
        ...deployResult.messages,
        "\n步骤 2: 添加并移除模块",
        ...addRemoveResult.messages,
        "\n=== 所有操作成功完成 ==="
      ];
      showResult("callModuleExample", allMessages.join("\n"));
    } catch (error: any) {
      showResult("callModuleExample", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>监管管理面板</h2>
        <button
          onClick={handleCallModuleExample}
          disabled={loading}
          className="example-button"
        >
          <span style={{ fontSize: "16px", lineHeight: 1 }}>▶</span>
          <span>运行示例</span>
        </button>
      </div>

      {/* 示例执行结果 */}
      {results.callModuleExample && (
        <div className={`result ${results.callModuleExample.includes("错误") || results.callModuleExample.includes("失败") ? "error" : "success"}`} style={{ marginBottom: "1rem" }}>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{results.callModuleExample}</pre>
        </div>
      )}

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
    </div>
  );
}

