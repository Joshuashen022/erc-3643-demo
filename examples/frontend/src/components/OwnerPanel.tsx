import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../utils/config";

interface OwnerPanelProps {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Signer;
  account: string;
}

export default function OwnerPanel({ provider, wallet, account }: OwnerPanelProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});

  // ClaimTopicsRegistry 状态
  const [claimTopic, setClaimTopic] = useState("");
  const [claimTopicToRemove, setClaimTopicToRemove] = useState("");

  // TrustedIssuersRegistry 状态
  const [trustedIssuer, setTrustedIssuer] = useState("");
  const [claimTopics, setClaimTopics] = useState("");
  const [trustedIssuerToRemove, setTrustedIssuerToRemove] = useState("");

  // ModularCompliance 状态
  const [moduleAddress, setModuleAddress] = useState("");
  const [moduleAddressToRemove, setModuleAddressToRemove] = useState("");
  const [moduleAddressForCall, setModuleAddressForCall] = useState("");
  const [callData, setCallData] = useState("");

  // Token 状态
  const [identityRegistry, setIdentityRegistry] = useState("");
  const [compliance, setCompliance] = useState("");

  const showResult = (key: string, message: string) => {
    setResults((prev) => ({ ...prev, [key]: message }));
  };

  // ClaimTopicsRegistry 操作
  const handleAddClaimTopic = async () => {
    if (!claimTopic || !CONTRACT_ADDRESSES.claimTopicsRegistry) {
      showResult("addClaimTopic", "请填写声明主题并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.claimTopicsRegistry,
        [
          "function addClaimTopic(uint256 _claimTopic) external",
        ],
        wallet
      );
      const tx = await contract.addClaimTopic(claimTopic);
      await tx.wait();
      showResult("addClaimTopic", `成功添加声明主题，交易哈希: ${tx.hash}`);
      setClaimTopic("");
    } catch (error: any) {
      showResult("addClaimTopic", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClaimTopic = async () => {
    if (!claimTopicToRemove || !CONTRACT_ADDRESSES.claimTopicsRegistry) {
      showResult("removeClaimTopic", "请填写声明主题并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.claimTopicsRegistry,
        [
          "function removeClaimTopic(uint256 _claimTopic) external",
        ],
        wallet
      );
      const tx = await contract.removeClaimTopic(claimTopicToRemove);
      await tx.wait();
      showResult("removeClaimTopic", `成功移除声明主题，交易哈希: ${tx.hash}`);
      setClaimTopicToRemove("");
    } catch (error: any) {
      showResult("removeClaimTopic", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetClaimTopics = async () => {
    if (!CONTRACT_ADDRESSES.claimTopicsRegistry) {
      showResult("getClaimTopics", "请配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.claimTopicsRegistry,
        [
          "function getClaimTopics() external view returns (uint256[])",
        ],
        provider
      );
      const topics = await contract.getClaimTopics();
      showResult("getClaimTopics", `声明主题列表: ${topics.join(", ")}`);
    } catch (error: any) {
      showResult("getClaimTopics", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // TrustedIssuersRegistry 操作
  const handleAddTrustedIssuer = async () => {
    if (!trustedIssuer || !claimTopics || !CONTRACT_ADDRESSES.trustedIssuersRegistry) {
      showResult("addTrustedIssuer", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const topicsArray = claimTopics.split(",").map((t) => t.trim());
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trustedIssuersRegistry,
        [
          "function addTrustedIssuer(address _trustedIssuer, uint256[] _claimTopics) external",
        ],
        wallet
      );
      const tx = await contract.addTrustedIssuer(trustedIssuer, topicsArray);
      await tx.wait();
      showResult("addTrustedIssuer", `成功添加可信发行者，交易哈希: ${tx.hash}`);
      setTrustedIssuer("");
      setClaimTopics("");
    } catch (error: any) {
      showResult("addTrustedIssuer", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTrustedIssuer = async () => {
    if (!trustedIssuerToRemove || !CONTRACT_ADDRESSES.trustedIssuersRegistry) {
      showResult("removeTrustedIssuer", "请填写发行者地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trustedIssuersRegistry,
        [
          "function removeTrustedIssuer(address _trustedIssuer) external",
        ],
        wallet
      );
      const tx = await contract.removeTrustedIssuer(trustedIssuerToRemove);
      await tx.wait();
      showResult("removeTrustedIssuer", `成功移除可信发行者，交易哈希: ${tx.hash}`);
      setTrustedIssuerToRemove("");
    } catch (error: any) {
      showResult("removeTrustedIssuer", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetTrustedIssuers = async () => {
    if (!CONTRACT_ADDRESSES.trustedIssuersRegistry) {
      showResult("getTrustedIssuers", "请配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trustedIssuersRegistry,
        [
          "function getTrustedIssuers() external view returns (address[])",
        ],
        provider
      );
      const issuers = await contract.getTrustedIssuers();
      showResult("getTrustedIssuers", `可信发行者列表: ${issuers.join(", ")}`);
    } catch (error: any) {
      showResult("getTrustedIssuers", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  // Token 操作
  const handleSetIdentityRegistry = async () => {
    if (!identityRegistry || !CONTRACT_ADDRESSES.token) {
      showResult("setIdentityRegistry", "请填写身份注册表地址并配置 Token 合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.token,
        [
          "function setIdentityRegistry(address _identityRegistry) external",
        ],
        wallet
      );
      const tx = await contract.setIdentityRegistry(identityRegistry);
      await tx.wait();
      showResult("setIdentityRegistry", `成功设置身份注册表，交易哈希: ${tx.hash}`);
      setIdentityRegistry("");
    } catch (error: any) {
      showResult("setIdentityRegistry", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCompliance = async () => {
    if (!compliance || !CONTRACT_ADDRESSES.token) {
      showResult("setCompliance", "请填写合规合约地址并配置 Token 合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.token,
        [
          "function setCompliance(address _compliance) external",
        ],
        wallet
      );
      const tx = await contract.setCompliance(compliance);
      await tx.wait();
      showResult("setCompliance", `成功设置合规合约，交易哈希: ${tx.hash}`);
      setCompliance("");
    } catch (error: any) {
      showResult("setCompliance", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>Owner 管理面板</h2>

      {/* ClaimTopicsRegistry */}
      <div className="section">
        <h3>声明主题管理 (ClaimTopicsRegistry)</h3>
        
        {/* 添加声明主题 */}
        <div className="subsection">
          <h4>添加声明主题</h4>
          <div className="form-group">
            <label>声明主题 ID</label>
            <input
              type="text"
              value={claimTopic}
              onChange={(e) => setClaimTopic(e.target.value)}
              placeholder="例如: 1"
            />
          </div>
          <div className="button-group">
            <button onClick={handleAddClaimTopic} disabled={loading} className="btn-primary">
              添加声明主题
            </button>
          </div>
          {results.addClaimTopic && (
            <div className={`result ${results.addClaimTopic.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.addClaimTopic}</pre>
            </div>
          )}
        </div>

        {/* 移除声明主题 */}
        <div className="subsection">
          <h4>移除声明主题</h4>
          <div className="form-group">
            <label>声明主题 ID</label>
            <input
              type="text"
              value={claimTopicToRemove}
              onChange={(e) => setClaimTopicToRemove(e.target.value)}
              placeholder="例如: 1"
            />
          </div>
          <div className="button-group">
            <button onClick={handleRemoveClaimTopic} disabled={loading} className="btn-danger">
              移除声明主题
            </button>
          </div>
          {results.removeClaimTopic && (
            <div className={`result ${results.removeClaimTopic.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.removeClaimTopic}</pre>
            </div>
          )}
        </div>

        {/* 查询所有主题 */}
        <div className="subsection">
          <h4>查询所有主题</h4>
          <div className="button-group">
            <button onClick={handleGetClaimTopics} disabled={loading} className="btn-secondary">
              查询所有主题
            </button>
          </div>
          {results.getClaimTopics && (
            <div className={`result ${results.getClaimTopics.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.getClaimTopics}</pre>
            </div>
          )}
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.claimTopicsRegistry ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.claimTopicsRegistry}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
      </div>

      {/* TrustedIssuersRegistry */}
      <div className="section">
        <h3>可信发行者管理 (TrustedIssuersRegistry)</h3>
        
        {/* 添加可信发行者 */}
        <div className="subsection">
          <h4>添加可信发行者</h4>
          <div className="form-group">
            <label>发行者地址</label>
            <input
              type="text"
              value={trustedIssuer}
              onChange={(e) => setTrustedIssuer(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>声明主题列表（逗号分隔）</label>
            <input
              type="text"
              value={claimTopics}
              onChange={(e) => setClaimTopics(e.target.value)}
              placeholder="例如: 1, 2, 3"
            />
          </div>
          <div className="button-group">
            <button onClick={handleAddTrustedIssuer} disabled={loading} className="btn-primary">
              添加可信发行者
            </button>
          </div>
          {results.addTrustedIssuer && (
            <div className={`result ${results.addTrustedIssuer.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.addTrustedIssuer}</pre>
            </div>
          )}
        </div>

        {/* 移除可信发行者 */}
        <div className="subsection">
          <h4>移除可信发行者</h4>
          <div className="form-group">
            <label>发行者地址</label>
            <input
              type="text"
              value={trustedIssuerToRemove}
              onChange={(e) => setTrustedIssuerToRemove(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleRemoveTrustedIssuer} disabled={loading} className="btn-danger">
              移除可信发行者
            </button>
          </div>
          {results.removeTrustedIssuer && (
            <div className={`result ${results.removeTrustedIssuer.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.removeTrustedIssuer}</pre>
            </div>
          )}
        </div>

        {/* 查询所有发行者 */}
        <div className="subsection">
          <h4>查询所有发行者</h4>
          <div className="button-group">
            <button onClick={handleGetTrustedIssuers} disabled={loading} className="btn-secondary">
              查询所有发行者
            </button>
          </div>
          {results.getTrustedIssuers && (
            <div className={`result ${results.getTrustedIssuers.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.getTrustedIssuers}</pre>
            </div>
          )}
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.trustedIssuersRegistry ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.trustedIssuersRegistry}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
      </div>

      {/* ModularCompliance */}
      <div className="section">
        <h3>合规模块管理 (ModularCompliance)</h3>
        
        {/* 添加模块 */}
        <div className="subsection">
          <h4>添加模块</h4>
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
          <h4>移除模块</h4>
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
          <h4>调用模块函数</h4>
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
          <h4>查询所有模块</h4>
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
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.modularCompliance ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.modularCompliance}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
      </div>

      {/* Token */}
      <div className="section">
        <h3>代币管理 (Token)</h3>
        
        {/* 设置身份注册表 */}
        <div className="subsection">
          <h4>设置身份注册表</h4>
          <div className="form-group">
            <label>身份注册表地址</label>
            <input
              type="text"
              value={identityRegistry}
              onChange={(e) => setIdentityRegistry(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleSetIdentityRegistry} disabled={loading} className="btn-primary">
              设置身份注册表
            </button>
          </div>
          {results.setIdentityRegistry && (
            <div className={`result ${results.setIdentityRegistry.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.setIdentityRegistry}</pre>
            </div>
          )}
        </div>

        {/* 设置合规合约 */}
        <div className="subsection">
          <h4>设置合规合约</h4>
          <div className="form-group">
            <label>合规合约地址</label>
            <input
              type="text"
              value={compliance}
              onChange={(e) => setCompliance(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleSetCompliance} disabled={loading} className="btn-primary">
              设置合规合约
            </button>
          </div>
          {results.setCompliance && (
            <div className={`result ${results.setCompliance.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.setCompliance}</pre>
            </div>
          )}
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.token ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.token}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
      </div>
    </div>
  );
}

