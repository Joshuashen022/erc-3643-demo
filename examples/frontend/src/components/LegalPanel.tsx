import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../utils/config";

interface LegalPanelProps {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Signer;
  account: string;
}

export default function LegalPanel({ provider, wallet, account }: LegalPanelProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  
  // Owner 检查状态
  const [ownerStatus, setOwnerStatus] = useState<Record<string, { isOwner: boolean | null; checking: boolean }>>({
    claimTopicsRegistry: { isOwner: null, checking: false },
    trustedIssuersRegistry: { isOwner: null, checking: false },
  });

  // ClaimTopicsRegistry 状态
  const [claimTopic, setClaimTopic] = useState("");
  const [claimTopicToRemove, setClaimTopicToRemove] = useState("");

  // TrustedIssuersRegistry 状态
  const [trustedIssuer, setTrustedIssuer] = useState("");
  const [claimTopics, setClaimTopics] = useState("");
  const [trustedIssuerToRemove, setTrustedIssuerToRemove] = useState("");
  const [trustedIssuerToUpdate, setTrustedIssuerToUpdate] = useState("");
  const [claimTopicsToUpdate, setClaimTopicsToUpdate] = useState("");

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

    checkOwnerRole("claimTopicsRegistry", CONTRACT_ADDRESSES.claimTopicsRegistry);
    checkOwnerRole("trustedIssuersRegistry", CONTRACT_ADDRESSES.trustedIssuersRegistry);
  }, [account, provider]);

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

  const handleUpdateIssuerClaimTopics = async () => {
    if (!trustedIssuerToUpdate || !claimTopicsToUpdate || !CONTRACT_ADDRESSES.trustedIssuersRegistry) {
      showResult("updateIssuerClaimTopics", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const topicsArray = claimTopicsToUpdate.split(",").map((t) => t.trim());
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trustedIssuersRegistry,
        [
          "function updateIssuerClaimTopics(address _trustedIssuer, uint256[] _claimTopics) external",
        ],
        wallet
      );
      const tx = await contract.updateIssuerClaimTopics(trustedIssuerToUpdate, topicsArray);
      await tx.wait();
      showResult("updateIssuerClaimTopics", `成功更新发行者声明主题，交易哈希: ${tx.hash}`);
      setTrustedIssuerToUpdate("");
      setClaimTopicsToUpdate("");
    } catch (error: any) {
      showResult("updateIssuerClaimTopics", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>法务管理面板</h2>

      {/* ClaimTopicsRegistry */}
      <div className="section">
        <h3>声明主题管理 (ClaimTopicsRegistry)</h3>
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          {ownerStatus.claimTopicsRegistry.checking ? (
            <div style={{ color: "#666", fontSize: "0.875rem" }}>正在检查 owner 角色...</div>
          ) : ownerStatus.claimTopicsRegistry.isOwner === null ? (
            <div style={{ color: "#999", fontSize: "0.875rem" }}>无法检查 owner 角色（请确保已配置合约地址）</div>
          ) : ownerStatus.claimTopicsRegistry.isOwner ? (
            <div style={{ color: "#28a745", fontSize: "0.875rem", fontWeight: "500" }}>
              ✓ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 是 Owner 角色
            </div>
          ) : (
            <div style={{ color: "#dc3545", fontSize: "0.875rem", fontWeight: "500" }}>
              ✗ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 不是 Owner 角色
            </div>
          )}
        </div>
        
        {/* 添加声明主题 */}
        <div className="subsection">
          <h4>添加声明主题 addClaimTopic(uint256 _claimTopic)</h4>
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
          <h4>移除声明主题 removeClaimTopic(uint256 _claimTopic)</h4>
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
          <h4>查询所有主题 getClaimTopics()</h4>
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
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          {ownerStatus.trustedIssuersRegistry.checking ? (
            <div style={{ color: "#666", fontSize: "0.875rem" }}>正在检查 owner 角色...</div>
          ) : ownerStatus.trustedIssuersRegistry.isOwner === null ? (
            <div style={{ color: "#999", fontSize: "0.875rem" }}>无法检查 owner 角色（请确保已配置合约地址）</div>
          ) : ownerStatus.trustedIssuersRegistry.isOwner ? (
            <div style={{ color: "#28a745", fontSize: "0.875rem", fontWeight: "500" }}>
              ✓ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 是 Owner 角色
            </div>
          ) : (
            <div style={{ color: "#dc3545", fontSize: "0.875rem", fontWeight: "500" }}>
              ✗ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 不是 Owner 角色
            </div>
          )}
        </div>
        
        {/* 添加可信发行者 */}
        <div className="subsection">
          <h4>添加可信发行者 addTrustedIssuer(address _trustedIssuer, uint256[] _claimTopics)</h4>
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
          <h4>移除可信发行者 removeTrustedIssuer(address _trustedIssuer)</h4>
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

        {/* 更新发行者声明主题 */}
        <div className="subsection">
          <h4>更新发行者声明主题 updateIssuerClaimTopics(address _trustedIssuer, uint256[] calldata _claimTopics)</h4>
          <div className="form-group">
            <label>发行者地址</label>
            <input
              type="text"
              value={trustedIssuerToUpdate}
              onChange={(e) => setTrustedIssuerToUpdate(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>声明主题列表（逗号分隔）</label>
            <input
              type="text"
              value={claimTopicsToUpdate}
              onChange={(e) => setClaimTopicsToUpdate(e.target.value)}
              placeholder="例如: 1, 2, 3"
            />
          </div>
          <div className="button-group">
            <button onClick={handleUpdateIssuerClaimTopics} disabled={loading} className="btn-success">
              更新发行者声明主题
            </button>
          </div>
          {results.updateIssuerClaimTopics && (
            <div className={`result ${results.updateIssuerClaimTopics.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.updateIssuerClaimTopics}</pre>
            </div>
          )}
        </div>

        {/* 查询所有发行者 */}
        <div className="subsection">
          <h4>查询所有发行者 getTrustedIssuers()</h4>
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
    </div>
  );
}

