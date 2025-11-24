import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getProvider, connectWallet } from "./utils/contracts";
import { RPC_URL, UserRole } from "./utils/config";
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

  useEffect(() => {
    // 初始化 Provider
    const initProvider = getProvider(RPC_URL);
    setProvider(initProvider);
  }, []);

  const handleConnectWallet = async () => {
    if (!provider) return;
    
    setLoading(true);
    try {
      const connectedWallet = await connectWallet(provider);
      if (connectedWallet) {
        setWallet(connectedWallet);
        setAccount(await connectedWallet.getAddress());
      } else {
        alert("请安装 MetaMask 或使用其他 Web3 钱包");
      }
    } catch (error) {
      console.error("连接钱包失败:", error);
      alert("连接钱包失败，请检查是否已安装 MetaMask");
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
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="role-selector"
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

