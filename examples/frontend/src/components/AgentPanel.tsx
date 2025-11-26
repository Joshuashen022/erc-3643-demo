import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, CHAIN_ID } from "../utils/config";
import { checkNetwork, switchToTargetNetwork } from "../utils/contracts";

interface AgentPanelProps {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Signer;
  account: string;
}

export default function AgentPanel({ provider, wallet, account }: AgentPanelProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [isAgent, setIsAgent] = useState<boolean | null>(null);
  const [checkingAgent, setCheckingAgent] = useState(false);
  const [isTokenAgent, setIsTokenAgent] = useState<boolean | null>(null);
  const [checkingTokenAgent, setCheckingTokenAgent] = useState(false);

  // IdentityRegistry 状态
  const [userAddress, setUserAddress] = useState("");
  const [identityAddress, setIdentityAddress] = useState("");
  const [country, setCountry] = useState("");

  // Token 状态
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [freezeAddress, setFreezeAddress] = useState("");
  const [freezeAmount, setFreezeAmount] = useState("");

  const showResult = (key: string, message: string) => {
    setResults((prev) => ({ ...prev, [key]: message }));
  };

  // 组件加载时检查 agent 角色
  useEffect(() => {
    const checkIdentityRegistryAgentRole = async () => {
      if (!account || !CONTRACT_ADDRESSES.identityRegistry) {
        setIsAgent(null);
        return;
      }

      setCheckingAgent(true);
      try {
        const contract = new ethers.Contract(
          CONTRACT_ADDRESSES.identityRegistry,
          [
            "function isAgent(address _agent) external view returns (bool)",
          ],
          provider
        );
        const agentStatus = await contract.isAgent(account);
        setIsAgent(agentStatus);
      } catch (error: any) {
        console.error("检查 IdentityRegistry agent 角色失败:", error);
        setIsAgent(null);
      } finally {
        setCheckingAgent(false);
      }
    };

    const checkTokenAgentRole = async () => {
      if (!account || !CONTRACT_ADDRESSES.token) {
        setIsTokenAgent(null);
        return;
      }

      setCheckingTokenAgent(true);
      try {
        const contract = new ethers.Contract(
          CONTRACT_ADDRESSES.token,
          [
            "function isAgent(address _agent) external view returns (bool)",
          ],
          provider
        );
        const agentStatus = await contract.isAgent(account);
        setIsTokenAgent(agentStatus);
      } catch (error: any) {
        console.error("检查 Token agent 角色失败:", error);
        setIsTokenAgent(null);
      } finally {
        setCheckingTokenAgent(false);
      }
    };

    checkIdentityRegistryAgentRole();
    checkTokenAgentRole();
  }, [account, provider]);

  // IdentityRegistry 操作
  const handleRegisterIdentity = async () => {
    if (!userAddress || !identityAddress || !country || !CONTRACT_ADDRESSES.identityRegistry) {
      showResult("registerIdentity", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.identityRegistry,
        [
          "function registerIdentity(address _userAddress, address _identity, uint16 _country) external",
        ],
        wallet
      );
      const tx = await contract.registerIdentity(userAddress, identityAddress, country);
      await tx.wait();
      showResult("registerIdentity", `成功注册身份，交易哈希: ${tx.hash}`);
      setUserAddress("");
      setIdentityAddress("");
      setCountry("");
    } catch (error: any) {
      showResult("registerIdentity", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIdentity = async () => {
    if (!userAddress || !identityAddress || !CONTRACT_ADDRESSES.identityRegistry) {
      showResult("updateIdentity", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.identityRegistry,
        [
          "function updateIdentity(address _userAddress, address _identity) external",
        ],
        wallet
      );
      const tx = await contract.updateIdentity(userAddress, identityAddress);
      await tx.wait();
      showResult("updateIdentity", `成功更新身份，交易哈希: ${tx.hash}`);
      setUserAddress("");
      setIdentityAddress("");
    } catch (error: any) {
      showResult("updateIdentity", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIdentity = async () => {
    if (!userAddress || !CONTRACT_ADDRESSES.identityRegistry) {
      showResult("deleteIdentity", "请填写用户地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.identityRegistry,
        [
          "function deleteIdentity(address _userAddress) external",
        ],
        wallet
      );
      const tx = await contract.deleteIdentity(userAddress);
      await tx.wait();
      showResult("deleteIdentity", `成功删除身份，交易哈希: ${tx.hash}`);
      setUserAddress("");
    } catch (error: any) {
      showResult("deleteIdentity", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleIsVerified = async () => {
    if (!userAddress || !CONTRACT_ADDRESSES.identityRegistry) {
      showResult("isVerified", "请填写用户地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.identityRegistry,
        [
          "function isVerified(address _userAddress) external view returns (bool)",
        ],
        provider
      );
      const verified = await contract.isVerified(userAddress);
      showResult("isVerified", `用户 ${userAddress} 验证状态: ${verified ? "已验证" : "未验证"}`);
    } catch (error: any) {
      showResult("isVerified", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 检查网络并切换到正确网络（如果需要）
  const ensureCorrectNetwork = async (): Promise<boolean> => {
    const networkCheck = await checkNetwork();
    if (!networkCheck.correct) {
      try {
        await switchToTargetNetwork();
        // 等待一下让网络切换完成
        await new Promise(resolve => setTimeout(resolve, 500));
        const newNetworkCheck = await checkNetwork();
        if (!newNetworkCheck.correct) {
          showResult("network", `网络错误: 当前网络 ChainId ${networkCheck.currentChainId}，需要 ChainId ${CHAIN_ID}。请在 MetaMask 中切换到正确的网络。`);
          return false;
        }
      } catch (error: any) {
        showResult("network", `切换网络失败: ${error.message}`);
        return false;
      }
    }
    return true;
  };

  // Token 操作
  const handleMint = async () => {
    if (!toAddress || !amount || !CONTRACT_ADDRESSES.token) {
      showResult("mint", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      // 确保在正确的网络
      const networkOk = await ensureCorrectNetwork();
      if (!networkOk) {
        setLoading(false);
        return;
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.token,
        [
          "function mint(address _to, uint256 _amount) external",
        ],
        wallet
      );
      const tx = await contract.mint(toAddress, amount);
      await tx.wait();
      showResult("mint", `成功铸造代币，交易哈希: ${tx.hash}`);
      setToAddress("");
      setAmount("");
    } catch (error: any) {
      let errorMsg = error.message || "未知错误";
      // 如果错误信息包含 gas 或网络相关，给出更友好的提示
      if (errorMsg.includes("insufficient funds") || errorMsg.includes("gas") || errorMsg.includes("network")) {
        errorMsg = `交易失败: ${errorMsg}\n\n请检查:\n1. MetaMask 是否连接到正确的网络 (ChainId: ${CHAIN_ID})\n2. 账户余额是否充足\n3. 合约地址是否正确配置`;
      }
      showResult("mint", `错误: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBurn = async () => {
    if (!userAddress || !amount || !CONTRACT_ADDRESSES.token) {
      showResult("burn", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.token,
        [
          "function burn(address _userAddress, uint256 _amount) external",
        ],
        wallet
      );
      const tx = await contract.burn(userAddress, amount);
      await tx.wait();
      showResult("burn", `成功销毁代币，交易哈希: ${tx.hash}`);
      setUserAddress("");
      setAmount("");
    } catch (error: any) {
      showResult("burn", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleForcedTransfer = async () => {
    if (!fromAddress || !toAddress || !amount || !CONTRACT_ADDRESSES.token) {
      showResult("forcedTransfer", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.token,
        [
          "function forcedTransfer(address _from, address _to, uint256 _amount) external",
        ],
        wallet
      );
      const tx = await contract.forcedTransfer(fromAddress, toAddress, amount);
      await tx.wait();
      showResult("forcedTransfer", `成功强制转账，交易哈希: ${tx.hash}`);
      setFromAddress("");
      setToAddress("");
      setAmount("");
    } catch (error: any) {
      showResult("forcedTransfer", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAddressFrozen = async (freeze: boolean) => {
    if (!freezeAddress || !CONTRACT_ADDRESSES.token) {
      showResult("setAddressFrozen", "请填写地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.token,
        [
          "function setAddressFrozen(address _userAddress, bool _freeze) external",
        ],
        wallet
      );
      const tx = await contract.setAddressFrozen(freezeAddress, freeze);
      await tx.wait();
      showResult("setAddressFrozen", `成功${freeze ? "冻结" : "解冻"}地址，交易哈希: ${tx.hash}`);
      setFreezeAddress("");
    } catch (error: any) {
      showResult("setAddressFrozen", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFreezePartialTokens = async () => {
    if (!freezeAddress || !freezeAmount || !CONTRACT_ADDRESSES.token) {
      showResult("freezePartialTokens", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.token,
        [
          "function freezePartialTokens(address _userAddress, uint256 _amount) external",
        ],
        wallet
      );
      const tx = await contract.freezePartialTokens(freezeAddress, freezeAmount);
      await tx.wait();
      showResult("freezePartialTokens", `成功冻结部分代币，交易哈希: ${tx.hash}`);
      setFreezeAddress("");
      setFreezeAmount("");
    } catch (error: any) {
      showResult("freezePartialTokens", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfreezePartialTokens = async () => {
    if (!freezeAddress || !freezeAmount || !CONTRACT_ADDRESSES.token) {
      showResult("unfreezePartialTokens", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.token,
        [
          "function unfreezePartialTokens(address _userAddress, uint256 _amount) external",
        ],
        wallet
      );
      const tx = await contract.unfreezePartialTokens(freezeAddress, freezeAmount);
      await tx.wait();
      showResult("unfreezePartialTokens", `成功解冻部分代币，交易哈希: ${tx.hash}`);
      setFreezeAddress("");
      setFreezeAmount("");
    } catch (error: any) {
      showResult("unfreezePartialTokens", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>Agent 管理面板</h2>

      {/* IdentityRegistry */}
      <div className="section">
        <h3>身份管理 (IdentityRegistry)</h3>
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          {checkingAgent ? (
            <div style={{ color: "#666", fontSize: "0.875rem" }}>正在检查 agent 角色...</div>
          ) : isAgent === null ? (
            <div style={{ color: "#999", fontSize: "0.875rem" }}>无法检查 agent 角色（请确保已配置合约地址）</div>
          ) : isAgent ? (
            <div style={{ color: "#28a745", fontSize: "0.875rem", fontWeight: "500" }}>
              ✓ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 是 Agent 角色
            </div>
          ) : (
            <div style={{ color: "#dc3545", fontSize: "0.875rem", fontWeight: "500" }}>
              ✗ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 不是 Agent 角色
            </div>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>用户地址</label>
            <input
              type="text"
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>身份合约地址</label>
            <input
              type="text"
              value={identityAddress}
              onChange={(e) => setIdentityAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>国家代码</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="例如: 1"
            />
          </div>
        </div>
        <div className="button-group">
          <button onClick={handleRegisterIdentity} disabled={loading} className="btn-primary">
            注册身份
          </button>
          <button onClick={handleUpdateIdentity} disabled={loading} className="btn-success">
            更新身份
          </button>
          <button onClick={handleDeleteIdentity} disabled={loading} className="btn-danger">
            删除身份
          </button>
          <button onClick={handleIsVerified} disabled={loading} className="btn-secondary">
            查询验证状态
          </button>
        </div>
        {results.registerIdentity && (
          <div className={`result ${results.registerIdentity.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
            <pre>{results.registerIdentity}</pre>
          </div>
        )}
        {results.updateIdentity && (
          <div className={`result ${results.updateIdentity.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
            <pre>{results.updateIdentity}</pre>
          </div>
        )}
        {results.deleteIdentity && (
          <div className={`result ${results.deleteIdentity.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
            <pre>{results.deleteIdentity}</pre>
          </div>
        )}
        {results.isVerified && (
          <div className={`result ${results.isVerified.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
            <pre>{results.isVerified}</pre>
          </div>
        )}
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.identityRegistry ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.identityRegistry}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
      </div>

      {/* Token 操作 */}
      <div className="section">
        <h3>代币管理 (Token)</h3>
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          {checkingTokenAgent ? (
            <div style={{ color: "#666", fontSize: "0.875rem" }}>正在检查 agent 角色...</div>
          ) : isTokenAgent === null ? (
            <div style={{ color: "#999", fontSize: "0.875rem" }}>无法检查 agent 角色（请确保已配置合约地址）</div>
          ) : isTokenAgent ? (
            <div style={{ color: "#28a745", fontSize: "0.875rem", fontWeight: "500" }}>
              ✓ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 是 Agent 角色
            </div>
          ) : (
            <div style={{ color: "#dc3545", fontSize: "0.875rem", fontWeight: "500" }}>
              ✗ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 不是 Agent 角色
            </div>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>接收地址</label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>数量</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例如: 1000000000000000000"
            />
          </div>
        </div>
        <div className="button-group">
          <button onClick={handleMint} disabled={loading} className="btn-primary">
            铸造代币
          </button>
          <button onClick={handleBurn} disabled={loading} className="btn-danger">
            销毁代币
          </button>
        </div>
        {results.mint && (
          <div className={`result ${results.mint.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
            <pre>{results.mint}</pre>
          </div>
        )}
        {results.burn && (
          <div className={`result ${results.burn.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
            <pre>{results.burn}</pre>
          </div>
        )}

        <div className="form-row" style={{ marginTop: "1rem" }}>
          <div className="form-group">
            <label>发送地址（强制转账）</label>
            <input
              type="text"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>接收地址（强制转账）</label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>转账数量</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例如: 1000000000000000000"
            />
          </div>
        </div>
        <div className="button-group">
          <button onClick={handleForcedTransfer} disabled={loading} className="btn-primary">
            强制转账
          </button>
        </div>
        {results.forcedTransfer && (
          <div className={`result ${results.forcedTransfer.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
            <pre>{results.forcedTransfer}</pre>
          </div>
        )}

        <div className="form-row" style={{ marginTop: "1rem" }}>
          <div className="form-group">
            <label>冻结/解冻地址</label>
            <input
              type="text"
              value={freezeAddress}
              onChange={(e) => setFreezeAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>冻结数量（部分冻结）</label>
            <input
              type="text"
              value={freezeAmount}
              onChange={(e) => setFreezeAmount(e.target.value)}
              placeholder="例如: 1000000000000000000"
            />
          </div>
        </div>
        <div className="button-group">
          <button onClick={() => handleSetAddressFrozen(true)} disabled={loading} className="btn-danger">
            冻结地址
          </button>
          <button onClick={() => handleSetAddressFrozen(false)} disabled={loading} className="btn-success">
            解冻地址
          </button>
          <button onClick={handleFreezePartialTokens} disabled={loading} className="btn-danger">
            冻结部分代币
          </button>
          <button onClick={handleUnfreezePartialTokens} disabled={loading} className="btn-success">
            解冻部分代币
          </button>
        </div>
        {results.setAddressFrozen && (
          <div className={`result ${results.setAddressFrozen.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
            <pre>{results.setAddressFrozen}</pre>
          </div>
        )}
        {results.freezePartialTokens && (
          <div className={`result ${results.freezePartialTokens.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
            <pre>{results.freezePartialTokens}</pre>
          </div>
        )}
        {results.unfreezePartialTokens && (
          <div className={`result ${results.unfreezePartialTokens.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
            <pre>{results.unfreezePartialTokens}</pre>
          </div>
        )}
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

