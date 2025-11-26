import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getProvider, connectWallet, checkNetwork, switchToTargetNetwork } from "./utils/contracts";
import { RPC_URL, UserRole, CHAIN_ID } from "./utils/config";
import OwnerPanel from "./components/OwnerPanel";
import AgentPanel from "./components/AgentPanel";
import PublicPanel from "./components/PublicPanel";
import "./App.css";

function App() {
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [wallet, setWallet] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string>("");
  const [role, setRole] = useState<UserRole>("public");
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<{ correct: boolean; currentChainId?: number } | null>(null);

  // 检查网络状态
  const updateNetworkStatus = async () => {
    const status = await checkNetwork();
    setNetworkStatus(status);
  };

  useEffect(() => {
    // 初始化 Provider
    const initProvider = getProvider(RPC_URL);
    setProvider(initProvider);
    
    // 如果已连接钱包，检查网络状态
    if (account) {
      updateNetworkStatus();
    }
  }, []);

  // 监听网络变化
  useEffect(() => {
    if (!account) return;

    updateNetworkStatus();

    // 监听 MetaMask 网络变化
    if (typeof window !== "undefined" && window.ethereum) {
      const handleChainChanged = () => {
        updateNetworkStatus();
      };

      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum?.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [account]);

  const handleConnectWallet = async () => {
    if (!provider) return;
    
    setLoading(true);
    try {
      const connectedWallet = await connectWallet(provider);
      if (connectedWallet) {
        setWallet(connectedWallet);
        const address = await connectedWallet.getAddress();
        setAccount(address);
        // 连接后更新网络状态
        await updateNetworkStatus();
      } else {
        alert("请安装 MetaMask 或使用其他 Web3 钱包");
      }
    } catch (error: any) {
      console.error("连接钱包失败:", error);
      const errorMessage = error.message || "连接钱包失败";
      
      if (errorMessage.includes("网络") || errorMessage.includes("chain")) {
        alert(`${errorMessage}\n\n请确保 MetaMask 已切换到正确的网络。\n如果是本地开发，请确保已启动本地节点（anvil 或 ganache）。`);
      } else if (errorMessage.includes("拒绝")) {
        // 用户拒绝，不需要显示错误
      } else {
        alert(`连接钱包失败: ${errorMessage}\n\n请检查是否已安装 MetaMask，并确保 MetaMask 已解锁。`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>ERC-3643 权限管理界面</h1>
        <div className="wallet-section">
          {account ? (
            <div className="wallet-info">
              <span>已连接: {account.slice(0, 6)}...{account.slice(-4)}</span>
              <span style={{ marginLeft: "1rem", fontSize: "0.875rem", color: networkStatus?.correct ? "#28a745" : "#dc3545" }}>
                网络: ChainId {networkStatus?.currentChainId ?? "..."} 
                {networkStatus?.correct ? (
                  <span style={{ color: "#28a745", marginLeft: "0.5rem" }}>✓</span>
                ) : networkStatus?.currentChainId !== undefined ? (
                  <>
                    <span style={{ color: "#dc3545", marginLeft: "0.5rem" }}>✗</span>
                    <button 
                      onClick={async () => {
                        try {
                          await switchToTargetNetwork();
                          await updateNetworkStatus();
                        } catch (error: any) {
                          alert(`切换网络失败: ${error.message}`);
                        }
                      }}
                      style={{
                        marginLeft: "0.5rem",
                        padding: "0.25rem 0.5rem",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.75rem"
                      }}
                    >
                      切换到 {CHAIN_ID}
                    </button>
                  </>
                ) : null}
              </span>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="role-selector"
                style={{ marginLeft: "1rem" }}
              >
                <option value="public">普通用户</option>
                <option value="agent">Agent</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          ) : (
            <button onClick={handleConnectWallet} disabled={loading}>
              {loading ? "连接中..." : "连接钱包"}
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {!account ? (
          <div className="welcome">
            <h2>欢迎使用 ERC-3643 权限管理界面</h2>
            <p>请先连接钱包以开始使用</p>
          </div>
        ) : role === "owner" ? (
          <OwnerPanel provider={provider!} wallet={wallet!} account={account} />
        ) : role === "agent" ? (
          <AgentPanel provider={provider!} wallet={wallet!} account={account} />
        ) : (
          <PublicPanel provider={provider!} account={account} />
        )}
      </main>
    </div>
  );
}

export default App;

