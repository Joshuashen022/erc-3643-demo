import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getProvider, connectWallet, checkNetwork, switchToTargetNetwork } from "./utils/contracts";
import { RPC_URL, UserRole, CHAIN_ID } from "./utils/config";
import OwnerPanel from "./components/OwnerPanel";
import AgentPanel from "./components/AgentPanel";
import PublicPanel from "./components/PublicPanel";
import BackendPanel from "./components/BackendPanel";
import CompliancePanel from "./components/CompliancePanel";
import LegalPanel from "./components/LegalPanel";
import UserPanel from "./components/UserPanel";
import "./App.css";

// 角色模块配置
const ROLE_MODULES: Record<UserRole, { name: string; modules: string[]; description: string }> = {
  owner: {
    name: "合约管理者",
    description: "管理所有合约的升级和子模块",
    modules: [
      "Token - 设置身份注册表和合规合约",
      "  • setIdentityRegistry(address _identityRegistry)",
      "  • setCompliance(address _compliance)",
      "IdentityRegistry - 管理子模块和Agent",
      "IdentityRegistryStorage - 绑定/解绑身份注册表",
      "TREXImplementationAuthority - 管理TREX版本",
      "TREXGateway - 管理网关和部署",
      "TREXFactory - 部署和管理TREX套件",
      "  • deployTREXSuite(string _salt, TokenDetails _tokenDetails, ClaimDetails _claimDetails)",
      "  • recoverContractOwnership(address _contract, address _newOwner)",
      "  • setImplementationAuthority(address _implementationAuthority)",
      "  • setIdFactory(address _idFactory)",
      "  • getImplementationAuthority() / getIdFactory() / getToken(string _salt)",
    ],
  },
  agent: {
    name: "财务管理",
    description: "处理代币资金管理相关操作",
    modules: [
      "Token - 代币资金管理",
      "  • mint(address _to, uint256 _amount)",
      "  • burn(address _userAddress, uint256 _amount)",
      "  • forcedTransfer(address _from, address _to, uint256 _amount)",
      "  • setAddressFrozen(address _userAddress, bool _freeze)",
      "  • freezePartialTokens(address _userAddress, uint256 _amount)",
      "  • unfreezePartialTokens(address _userAddress, uint256 _amount)",
    ],
  },
  backend: {
    name: "后端管理",
    description: "处理用户注册和身份管理",
    modules: [
      "IdentityRegistry - 用户身份注册和管理",
      "  • registerIdentity(address _userAddress, address _identity, uint16 _country)",
      "  • updateIdentity(address _userAddress, address _identity)",
      "  • deleteIdentity(address _userAddress)",
      "  • isVerified(address _userAddress)",
      "RWAClaimIssuerIdFactory - 身份工厂管理",
      "  • addTokenFactory(address _factory) / removeTokenFactory(address _factory)",
      "  • createIdentity(address _wallet, string _salt)",
      "  • createIdentityWithManagementKeys(address _wallet, string _salt, bytes32[] _managementKeys)",
      "  • createTokenIdentity(address _token, address _tokenOwner, string _salt)",
      "RWAClaimIssuerGateway - 签名和工厂调用管理",
      "  • approveSigner(address signer) / revokeSigner(address signer)",
      "  • approveSignature(bytes signature) / revokeSignature(bytes signature)",
      "  • transferFactoryOwnership(address newOwner)",
      "  • callFactory(bytes data)",
    ],
  },
  compliance: {
    name: "监管管理",
    description: "处理合规和监管相关操作",
    modules: [
      "ModularCompliance - 合规模块管理",
      "  • addModule(address _module) / removeModule(address _module)",
      "  • callModuleFunction(bytes callData, address _module)",
      "  • getModules()",
      "  • bindToken(address _token) / unbindToken(address _token)",
    ],
  },
  legal: {
    name: "法务管理",
    description: "处理法务相关操作",
    modules: [
      "ClaimTopicsRegistry - 声明主题管理",
      "  • addClaimTopic(uint256 _claimTopic)",
      "  • removeClaimTopic(uint256 _claimTopic)",
      "  • getClaimTopics()",
      "TrustedIssuersRegistry - 可信发行者管理",
      "  • addTrustedIssuer(address _trustedIssuer, uint256[] _claimTopics)",
      "  • removeTrustedIssuer(address _trustedIssuer)",
      "  • updateIssuerClaimTopics(address _trustedIssuer, uint256[] _claimTopics)",
      "  • getTrustedIssuers()",
    ],
  },
  public: {
    name: "普通用户",
    description: "查看公开信息和执行基本操作",
    modules: [
      "ModularCompliance - 查询合规模块",
      "IdentityRegistry - 查询身份信息",
      "ClaimTopicsRegistry - 查询声明主题",
      "  • getClaimTopics()",
      "TrustedIssuersRegistry - 查询可信发行者",
      "  • getTrustedIssuers()",
      "  • getTrustedIssuersForClaimTopic(uint256 claimTopic)",
      "Token - 查询和转账操作",
      "  • balanceOf(address _userAddress)",
      "  • totalSupply() / name() / symbol() / decimals()",
      "  • paused() / isFrozen(address _userAddress) / getFrozenTokens(address _userAddress)",
      "  • allowance(address _owner, address _spender)",
      "  • transfer(address _to, uint256 _amount)",
      "  • approve(address _spender, uint256 _amount)",
    ],
  },
  user: {
    name: "身份管理",
    description: "管理Identity合约的密钥和声明",
    modules: [
      "Identity - 身份合约管理",
      "Management Key (Purpose 1):",
      "  • addKey(bytes32 _key, uint256 _purpose, uint256 _type)",
      "  • removeKey(bytes32 _key, uint256 _purpose)",
      "  • approve(uint256 _id, bool _approve)",
      "  • execute(address _to, uint256 _value, bytes memory _data)",
      "Action Key (Purpose 2):",
      "  • execute(address _to, uint256 _value, bytes memory _data)",
      "  • approve(uint256 _id, bool _approve)",
      "Claim Key (Purpose 3):",
      "  • addClaim(uint256 _topic, uint256 _scheme, address _issuer, bytes memory _signature, bytes memory _data, string memory _uri)",
      "  • removeClaim(bytes32 _claimId)",
      "View Functions:",
      "  • getKey(bytes32 _key) / getKeyPurposes(bytes32 _key) / getKeysByPurpose(uint256 _purpose)",
      "  • getClaimIdsByTopic(uint256 _topic) / getClaim(bytes32 _claimId)",
      "  • keyHasPurpose(bytes32 _key, uint256 _purpose)",
      "  • isClaimValid(address _identity, uint256 claimTopic, bytes memory sig, bytes memory data)",
      "  • getRecoveredAddress(bytes memory sig, bytes32 dataHash)",
    ],
  },
};

function App() {
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [wallet, setWallet] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string>("");
  const [role, setRole] = useState<UserRole>("public");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
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
        // 如果已选择角色，设置角色
        if (selectedRole) {
          setRole(selectedRole);
        }
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

  const handleRoleSelect = (selectedRole: UserRole) => {
    setSelectedRole(selectedRole);
    if (account) {
      setRole(selectedRole);
    }
  };

  const handleBackToMain = () => {
    // 断开钱包连接，回到主界面
    setWallet(null);
    setAccount("");
    setRole("public");
    setSelectedRole(null);
    setNetworkStatus(null);
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
                <option value="user">身份管理</option>
                <option value="agent">财务管理</option>
                <option value="owner">合约管理</option>
                <option value="backend">后端管理</option>
                <option value="compliance">监管管理</option>
                <option value="legal">法务管理</option>
              </select>
              <button 
                onClick={handleBackToMain}
                className="back-to-main-button"
                style={{ marginLeft: "1rem" }}
              >
                回到主界面
              </button>
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
            <p>请先选择角色，然后连接钱包以开始使用</p>
            
            <div className="role-selection">
              <h3>选择角色</h3>
              <div className="role-cards">
                {(Object.keys(ROLE_MODULES) as UserRole[]).map((roleKey) => {
                  const roleInfo = ROLE_MODULES[roleKey];
                  return (
                    <div
                      key={roleKey}
                      className={`role-card ${selectedRole === roleKey ? "selected" : ""}`}
                      onClick={() => handleRoleSelect(roleKey)}
                    >
                      <h4>{roleInfo.name}</h4>
                      <p className="role-description">{roleInfo.description}</p>
                      <div className="role-modules">
                        <strong>包含模块：</strong>
                        <ul>
                          {roleInfo.modules.map((module, index) => (
                            <li key={index}>{module}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {selectedRole && (
                <div className="role-selected-info">
                  <p>已选择角色：<strong>{ROLE_MODULES[selectedRole].name}</strong></p>
                  <button onClick={handleConnectWallet} disabled={loading} className="connect-button">
                    {loading ? "连接中..." : "连接钱包并进入"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : role === "owner" ? (
          <OwnerPanel provider={provider!} wallet={wallet!} account={account} />
        ) : role === "agent" ? (
          <AgentPanel provider={provider!} wallet={wallet!} account={account} />
        ) : role === "backend" ? (
          <BackendPanel provider={provider!} wallet={wallet!} account={account} />
        ) : role === "compliance" ? (
          <CompliancePanel provider={provider!} wallet={wallet!} account={account} />
        ) : role === "legal" ? (
          <LegalPanel provider={provider!} wallet={wallet!} account={account} />
        ) : role === "user" ? (
          <UserPanel provider={provider!} wallet={wallet!} account={account} />
        ) : (
          <PublicPanel provider={provider!} account={account} />
        )}
      </main>
    </div>
  );
}

export default App;

