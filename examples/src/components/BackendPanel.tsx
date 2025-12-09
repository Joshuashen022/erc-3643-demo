import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../utils/config";
import { createContractConfig } from "../utils/contracts";
import { registerNewIdentity, RegisterNewIdentityResult } from "../utils/operations";

interface BackendPanelProps {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Signer;
  account: string;
}

export default function BackendPanel({ provider, wallet, account }: BackendPanelProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [callFactoryResult, setCallFactoryResult] = useState<RegisterNewIdentityResult | null>(null);
  const [showCallFactoryResult, setShowCallFactoryResult] = useState(false);
  const [callFactoryLoading, setCallFactoryLoading] = useState(false);
  
  // Owner 检查状态
  const [ownerStatus, setOwnerStatus] = useState<Record<string, { isOwner: boolean | null; checking: boolean }>>({
    rwaClaimIssuerIdFactory: { isOwner: null, checking: false },
    rwaClaimIssuerGateway: { isOwner: null, checking: false },
  });

  // RWAClaimIssuerIdFactory 状态
  const [tokenFactoryToAdd, setTokenFactoryToAdd] = useState("");
  const [tokenFactoryToRemove, setTokenFactoryToRemove] = useState("");
  const [walletForIdentity, setWalletForIdentity] = useState("");
  const [saltForIdentity, setSaltForIdentity] = useState("");
  const [walletForIdentityWithKeys, setWalletForIdentityWithKeys] = useState("");
  const [saltForIdentityWithKeys, setSaltForIdentityWithKeys] = useState("");
  const [managementKeys, setManagementKeys] = useState("");
  const [tokenForIdentity, setTokenForIdentity] = useState("");
  const [tokenOwnerForIdentity, setTokenOwnerForIdentity] = useState("");
  const [saltForTokenIdentity, setSaltForTokenIdentity] = useState("");

  // RWAClaimIssuerGateway 状态
  const [signerToApprove, setSignerToApprove] = useState("");
  const [signerToRevoke, setSignerToRevoke] = useState("");
  const [signatureToRevoke, setSignatureToRevoke] = useState("");
  const [signatureToApprove, setSignatureToApprove] = useState("");
  const [newFactoryOwner, setNewFactoryOwner] = useState("");
  const [factoryCallData, setFactoryCallData] = useState("");

  // IdentityRegistry 状态
  const [isAgent, setIsAgent] = useState<boolean | null>(null);
  const [checkingAgent, setCheckingAgent] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [identityAddress, setIdentityAddress] = useState("");
  const [country, setCountry] = useState("");

  const showResult = (key: string, message: string) => {
    setResults((prev) => ({ ...prev, [key]: message }));
  };

  const updateCallFactoryResult = (partial: Partial<RegisterNewIdentityResult>) => {
    setCallFactoryResult((prev) => {
      const base: RegisterNewIdentityResult = prev || { success: true, messages: [], errors: [] };
      return {
        success: partial.success ?? base.success,
        messages: partial.messages ? [...partial.messages] : [...base.messages],
        errors: partial.errors ? [...partial.errors] : [...base.errors],
        newManagementKey: partial.newManagementKey ?? base.newManagementKey,
        newManagementKeyPrivateKey: partial.newManagementKeyPrivateKey ?? base.newManagementKeyPrivateKey,
        newIdentityAddress: partial.newIdentityAddress ?? base.newIdentityAddress,
        countryCode: partial.countryCode ?? base.countryCode,
      };
    });
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

    checkOwnerRole("rwaClaimIssuerIdFactory", CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory);
    checkOwnerRole("rwaClaimIssuerGateway", CONTRACT_ADDRESSES.rwaClaimIssuerGateway);
  }, [account, provider]);

  // 检查 IdentityRegistry agent 角色
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

    checkIdentityRegistryAgentRole();
  }, [account, provider]);

  // RWAClaimIssuerIdFactory 操作
  const handleAddTokenFactory = async () => {
    if (!tokenFactoryToAdd || !CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory) {
      showResult("addTokenFactory", "请填写代币工厂地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory,
        [
          "function addTokenFactory(address _factory) external",
        ],
        wallet
      );
      const tx = await contract.addTokenFactory(tokenFactoryToAdd);
      await tx.wait();
      showResult("addTokenFactory", `成功添加代币工厂，交易哈希: ${tx.hash}`);
      setTokenFactoryToAdd("");
    } catch (error: any) {
      showResult("addTokenFactory", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTokenFactory = async () => {
    if (!tokenFactoryToRemove || !CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory) {
      showResult("removeTokenFactory", "请填写代币工厂地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory,
        [
          "function removeTokenFactory(address _factory) external",
        ],
        wallet
      );
      const tx = await contract.removeTokenFactory(tokenFactoryToRemove);
      await tx.wait();
      showResult("removeTokenFactory", `成功移除代币工厂，交易哈希: ${tx.hash}`);
      setTokenFactoryToRemove("");
    } catch (error: any) {
      showResult("removeTokenFactory", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIdentity = async () => {
    if (!walletForIdentity || !saltForIdentity || !CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory) {
      showResult("createIdentity", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory,
        [
          "function createIdentity(address _wallet, string memory _salt) external",
        ],
        wallet
      );
      const tx = await contract.createIdentity(walletForIdentity, saltForIdentity);
      await tx.wait();
      showResult("createIdentity", `成功创建身份，交易哈希: ${tx.hash}`);
      setWalletForIdentity("");
      setSaltForIdentity("");
    } catch (error: any) {
      showResult("createIdentity", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIdentityWithManagementKeys = async () => {
    if (!walletForIdentityWithKeys || !saltForIdentityWithKeys || !managementKeys || !CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory) {
      showResult("createIdentityWithManagementKeys", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const keysArray = managementKeys.split(",").map((k) => k.trim()).filter((k) => k.startsWith("0x"));
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory,
        [
          "function createIdentityWithManagementKeys(address _wallet, string memory _salt, bytes32[] _managementKeys) external",
        ],
        wallet
      );
      const tx = await contract.createIdentityWithManagementKeys(walletForIdentityWithKeys, saltForIdentityWithKeys, keysArray);
      await tx.wait();
      showResult("createIdentityWithManagementKeys", `成功创建带管理密钥的身份，交易哈希: ${tx.hash}`);
      setWalletForIdentityWithKeys("");
      setSaltForIdentityWithKeys("");
      setManagementKeys("");
    } catch (error: any) {
      showResult("createIdentityWithManagementKeys", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTokenIdentity = async () => {
    if (!tokenForIdentity || !tokenOwnerForIdentity || !saltForTokenIdentity || !CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory) {
      showResult("createTokenIdentity", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory,
        [
          "function createTokenIdentity(address _token, address _tokenOwner, string memory _salt) external",
        ],
        wallet
      );
      const tx = await contract.createTokenIdentity(tokenForIdentity, tokenOwnerForIdentity, saltForTokenIdentity);
      await tx.wait();
      showResult("createTokenIdentity", `成功创建代币身份，交易哈希: ${tx.hash}`);
      setTokenForIdentity("");
      setTokenOwnerForIdentity("");
      setSaltForTokenIdentity("");
    } catch (error: any) {
      showResult("createTokenIdentity", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // RWAClaimIssuerGateway 操作
  const handleApproveSigner = async () => {
    if (!signerToApprove || !CONTRACT_ADDRESSES.rwaClaimIssuerGateway) {
      showResult("approveSigner", "请填写签名者地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.rwaClaimIssuerGateway,
        [
          "function approveSigner(address signer) external",
        ],
        wallet
      );
      const tx = await contract.approveSigner(signerToApprove);
      await tx.wait();
      showResult("approveSigner", `成功批准签名者，交易哈希: ${tx.hash}`);
      setSignerToApprove("");
    } catch (error: any) {
      showResult("approveSigner", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSigner = async () => {
    if (!signerToRevoke || !CONTRACT_ADDRESSES.rwaClaimIssuerGateway) {
      showResult("revokeSigner", "请填写签名者地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.rwaClaimIssuerGateway,
        [
          "function revokeSigner(address signer) external",
        ],
        wallet
      );
      const tx = await contract.revokeSigner(signerToRevoke);
      await tx.wait();
      showResult("revokeSigner", `成功撤销签名者，交易哈希: ${tx.hash}`);
      setSignerToRevoke("");
    } catch (error: any) {
      showResult("revokeSigner", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSignature = async () => {
    if (!signatureToRevoke || !CONTRACT_ADDRESSES.rwaClaimIssuerGateway) {
      showResult("revokeSignature", "请填写签名数据并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.rwaClaimIssuerGateway,
        [
          "function revokeSignature(bytes calldata signature) external",
        ],
        wallet
      );
      const tx = await contract.revokeSignature(signatureToRevoke);
      await tx.wait();
      showResult("revokeSignature", `成功撤销签名，交易哈希: ${tx.hash}`);
      setSignatureToRevoke("");
    } catch (error: any) {
      showResult("revokeSignature", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSignature = async () => {
    if (!signatureToApprove || !CONTRACT_ADDRESSES.rwaClaimIssuerGateway) {
      showResult("approveSignature", "请填写签名数据并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.rwaClaimIssuerGateway,
        [
          "function approveSignature(bytes calldata signature) external",
        ],
        wallet
      );
      const tx = await contract.approveSignature(signatureToApprove);
      await tx.wait();
      showResult("approveSignature", `成功批准签名，交易哈希: ${tx.hash}`);
      setSignatureToApprove("");
    } catch (error: any) {
      showResult("approveSignature", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferFactoryOwnership = async () => {
    if (!newFactoryOwner || !CONTRACT_ADDRESSES.rwaClaimIssuerGateway) {
      showResult("transferFactoryOwnership", "请填写新所有者地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.rwaClaimIssuerGateway,
        [
          "function transferFactoryOwnership(address newOwner) external",
        ],
        wallet
      );
      const tx = await contract.transferFactoryOwnership(newFactoryOwner);
      await tx.wait();
      showResult("transferFactoryOwnership", `成功转移工厂所有权，交易哈希: ${tx.hash}`);
      setNewFactoryOwner("");
    } catch (error: any) {
      showResult("transferFactoryOwnership", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCallFactory = async () => {
    if (!factoryCallData || !CONTRACT_ADDRESSES.rwaClaimIssuerGateway) {
      showResult("callFactory", "请填写调用数据并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.rwaClaimIssuerGateway,
        [
          "function callFactory(bytes memory data) external",
        ],
        wallet
      );
      const tx = await contract.callFactory(factoryCallData);
      await tx.wait();
      showResult("callFactory", `成功调用工厂函数，交易哈希: ${tx.hash}`);
      setFactoryCallData("");
    } catch (error: any) {
      showResult("callFactory", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
  const handleCallFactoryExample = async () => {
    setLoading(true);
    setCallFactoryLoading(true);
    setShowCallFactoryResult(true);
    updateCallFactoryResult({
      success: true,
      messages: ["正在执行示例操作，请稍候..."],
      errors: [],
      newManagementKey: undefined,
      newManagementKeyPrivateKey: undefined,
      newIdentityAddress: undefined,
      countryCode: undefined,
    });

    try {

      const contractConfig = await createContractConfig(provider, wallet, {
        useClaimIssuerPrivateKeys: true,
      });

      let newManagementKeyWallet: ethers.Wallet | ethers.HDNodeWallet;
      newManagementKeyWallet = ethers.Wallet.createRandom().connect(contractConfig.provider);
      const tx = await wallet.sendTransaction({
        to: await newManagementKeyWallet.getAddress(),
        value: ethers.parseEther("0.0001"),
      });
      await tx.wait();

      const registrationResult = await registerNewIdentity(
        contractConfig,
        newManagementKeyWallet,
        840,
        `${Date.now()}`,
      );

      const parts: string[] = [];
      parts.push(...registrationResult.messages);
      if (registrationResult.success) {
        parts.push("\n=== 注册结果摘要 ===");
        if (registrationResult.newManagementKey) {
          parts.push(`新管理密钥地址: ${registrationResult.newManagementKey}`);
        }
        if (registrationResult.newManagementKeyPrivateKey) {
          parts.push(`新管理密钥私钥: ${registrationResult.newManagementKeyPrivateKey}`);
        }
        if (registrationResult.newIdentityAddress) {
          parts.push(`新身份合约地址: ${registrationResult.newIdentityAddress}`);
        }
        if (registrationResult.countryCode) {
          parts.push(`国家代码: ${registrationResult.countryCode}`);
        }
      } else {
        parts.push("\n=== 注册错误 ===");
        registrationResult.errors.forEach((err) => parts.push(`✗ ${err}`));
      }

      updateCallFactoryResult({
        ...registrationResult,
        messages: parts,
      });
      showResult("callFactoryExample", parts.join("\n"));
    } catch (error: any) {
      let errorMsg = error.message || "未知错误";
      if (errorMsg.includes("insufficient funds") || errorMsg.includes("gas") || errorMsg.includes("network")) {
        errorMsg = `交易失败: ${errorMsg}\n\n请检查:\n1. RPC 是否可用 (RPC_URL)\n2. PRIVATE_KEY 账户余额是否充足\n3. 合约地址是否正确配置`;
      }
      updateCallFactoryResult({
        success: false,
        messages: [],
        errors: [errorMsg],
      });
      showResult("callFactoryExample", errorMsg);
    } finally {
      setLoading(false);
      setCallFactoryLoading(false);
    }
  };
  return (
    <div className="panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>后端管理面板</h2>
        <button
          onClick={handleCallFactoryExample}
          disabled={loading}
          className="example-button"
        >
          <span style={{ fontSize: "16px", lineHeight: 1 }}>▶</span>
          <span>运行示例</span>
        </button>
      </div>

      {/* RWAClaimIssuerIdFactory */}
      <div className="section">
        <h3>声明发行者身份工厂管理 (RWAClaimIssuerIdFactory)</h3>
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          {ownerStatus.rwaClaimIssuerIdFactory.checking ? (
            <div style={{ color: "#666", fontSize: "0.875rem" }}>正在检查 owner 角色...</div>
          ) : ownerStatus.rwaClaimIssuerIdFactory.isOwner === null ? (
            <div style={{ color: "#999", fontSize: "0.875rem" }}>无法检查 owner 角色（请确保已配置合约地址）</div>
          ) : ownerStatus.rwaClaimIssuerIdFactory.isOwner ? (
            <div style={{ color: "#28a745", fontSize: "0.875rem", fontWeight: "500" }}>
              ✓ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 是 Owner 角色
            </div>
          ) : (
            <div style={{ color: "#dc3545", fontSize: "0.875rem", fontWeight: "500" }}>
              ✗ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 不是 Owner 角色
            </div>
          )}
        </div>
        
        {/* 添加代币工厂 */}
        <div className="subsection">
          <h4>添加代币工厂 addTokenFactory(address _factory)</h4>
          <div className="form-group">
            <label>代币工厂地址</label>
            <input
              type="text"
              value={tokenFactoryToAdd}
              onChange={(e) => setTokenFactoryToAdd(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleAddTokenFactory} disabled={loading} className="btn-primary">
              添加代币工厂
            </button>
          </div>
          {results.addTokenFactory && (
            <div className={`result ${results.addTokenFactory.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.addTokenFactory}</pre>
            </div>
          )}
        </div>

        {/* 移除代币工厂 */}
        <div className="subsection">
          <h4>移除代币工厂 removeTokenFactory(address _factory)</h4>
          <div className="form-group">
            <label>代币工厂地址</label>
            <input
              type="text"
              value={tokenFactoryToRemove}
              onChange={(e) => setTokenFactoryToRemove(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleRemoveTokenFactory} disabled={loading} className="btn-danger">
              移除代币工厂
            </button>
          </div>
          {results.removeTokenFactory && (
            <div className={`result ${results.removeTokenFactory.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.removeTokenFactory}</pre>
            </div>
          )}
        </div>

        {/* 创建身份 */}
        <div className="subsection">
          <h4>创建身份 createIdentity(address _wallet, string memory _salt)</h4>
          <div className="form-group">
            <label>钱包地址</label>
            <input
              type="text"
              value={walletForIdentity}
              onChange={(e) => setWalletForIdentity(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>Salt</label>
            <input
              type="text"
              value={saltForIdentity}
              onChange={(e) => setSaltForIdentity(e.target.value)}
              placeholder="例如: my-salt"
            />
          </div>
          <div className="button-group">
            <button onClick={handleCreateIdentity} disabled={loading} className="btn-primary">
              创建身份
            </button>
          </div>
          {results.createIdentity && (
            <div className={`result ${results.createIdentity.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.createIdentity}</pre>
            </div>
          )}
        </div>

        {/* 创建带管理密钥的身份 */}
        <div className="subsection">
          <h4>创建带管理密钥的身份 createIdentityWithManagementKeys(address _wallet, string memory _salt, bytes32[] _managementKeys)</h4>
          <div className="form-group">
            <label>钱包地址</label>
            <input
              type="text"
              value={walletForIdentityWithKeys}
              onChange={(e) => setWalletForIdentityWithKeys(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>Salt</label>
            <input
              type="text"
              value={saltForIdentityWithKeys}
              onChange={(e) => setSaltForIdentityWithKeys(e.target.value)}
              placeholder="例如: my-salt"
            />
          </div>
          <div className="form-group">
            <label>管理密钥列表（逗号分隔，十六进制格式）</label>
            <input
              type="text"
              value={managementKeys}
              onChange={(e) => setManagementKeys(e.target.value)}
              placeholder="例如: 0x1234..., 0x5678..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleCreateIdentityWithManagementKeys} disabled={loading} className="btn-primary">
              创建带管理密钥的身份
            </button>
          </div>
          {results.createIdentityWithManagementKeys && (
            <div className={`result ${results.createIdentityWithManagementKeys.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.createIdentityWithManagementKeys}</pre>
            </div>
          )}
        </div>

        {/* 创建代币身份 */}
        <div className="subsection">
          <h4>创建代币身份 createTokenIdentity(address _token, address _tokenOwner, string memory _salt)</h4>
          <div className="form-group">
            <label>代币地址</label>
            <input
              type="text"
              value={tokenForIdentity}
              onChange={(e) => setTokenForIdentity(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>代币所有者地址</label>
            <input
              type="text"
              value={tokenOwnerForIdentity}
              onChange={(e) => setTokenOwnerForIdentity(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>Salt</label>
            <input
              type="text"
              value={saltForTokenIdentity}
              onChange={(e) => setSaltForTokenIdentity(e.target.value)}
              placeholder="例如: my-salt"
            />
          </div>
          <div className="button-group">
            <button onClick={handleCreateTokenIdentity} disabled={loading} className="btn-primary">
              创建代币身份
            </button>
          </div>
          {results.createTokenIdentity && (
            <div className={`result ${results.createTokenIdentity.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.createTokenIdentity}</pre>
            </div>
          )}
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.rwaClaimIssuerIdFactory}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
      </div>

      {/* RWAClaimIssuerGateway */}
      <div className="section">
        <h3>声明发行者身份网关管理 (RWAClaimIssuerGateway)</h3>
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          {ownerStatus.rwaClaimIssuerGateway.checking ? (
            <div style={{ color: "#666", fontSize: "0.875rem" }}>正在检查 owner 角色...</div>
          ) : ownerStatus.rwaClaimIssuerGateway.isOwner === null ? (
            <div style={{ color: "#999", fontSize: "0.875rem" }}>无法检查 owner 角色（请确保已配置合约地址）</div>
          ) : ownerStatus.rwaClaimIssuerGateway.isOwner ? (
            <div style={{ color: "#28a745", fontSize: "0.875rem", fontWeight: "500" }}>
              ✓ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 是 Owner 角色
            </div>
          ) : (
            <div style={{ color: "#dc3545", fontSize: "0.875rem", fontWeight: "500" }}>
              ✗ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 不是 Owner 角色
            </div>
          )}
        </div>
        
        {/* 批准签名者 */}
        <div className="subsection">
          <h4>批准签名者 approveSigner(address signer)</h4>
          <div className="form-group">
            <label>签名者地址</label>
            <input
              type="text"
              value={signerToApprove}
              onChange={(e) => setSignerToApprove(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleApproveSigner} disabled={loading} className="btn-primary">
              批准签名者
            </button>
          </div>
          {results.approveSigner && (
            <div className={`result ${results.approveSigner.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.approveSigner}</pre>
            </div>
          )}
        </div>

        {/* 撤销签名者 */}
        <div className="subsection">
          <h4>撤销签名者 revokeSigner(address signer)</h4>
          <div className="form-group">
            <label>签名者地址</label>
            <input
              type="text"
              value={signerToRevoke}
              onChange={(e) => setSignerToRevoke(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleRevokeSigner} disabled={loading} className="btn-danger">
              撤销签名者
            </button>
          </div>
          {results.revokeSigner && (
            <div className={`result ${results.revokeSigner.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.revokeSigner}</pre>
            </div>
          )}
        </div>

        {/* 撤销签名 */}
        <div className="subsection">
          <h4>撤销签名 revokeSignature(bytes calldata signature)</h4>
          <div className="form-group">
            <label>签名数据（十六进制）</label>
            <input
              type="text"
              value={signatureToRevoke}
              onChange={(e) => setSignatureToRevoke(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleRevokeSignature} disabled={loading} className="btn-danger">
              撤销签名
            </button>
          </div>
          {results.revokeSignature && (
            <div className={`result ${results.revokeSignature.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.revokeSignature}</pre>
            </div>
          )}
        </div>

        {/* 批准签名 */}
        <div className="subsection">
          <h4>批准签名 approveSignature(bytes calldata signature)</h4>
          <div className="form-group">
            <label>签名数据（十六进制）</label>
            <input
              type="text"
              value={signatureToApprove}
              onChange={(e) => setSignatureToApprove(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleApproveSignature} disabled={loading} className="btn-success">
              批准签名
            </button>
          </div>
          {results.approveSignature && (
            <div className={`result ${results.approveSignature.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.approveSignature}</pre>
            </div>
          )}
        </div>

        {/* 转移工厂所有权 */}
        <div className="subsection">
          <h4>转移工厂所有权 transferFactoryOwnership(address newOwner)</h4>
          <div className="form-group">
            <label>新所有者地址</label>
            <input
              type="text"
              value={newFactoryOwner}
              onChange={(e) => setNewFactoryOwner(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleTransferFactoryOwnership} disabled={loading} className="btn-primary">
              转移工厂所有权
            </button>
          </div>
          {results.transferFactoryOwnership && (
            <div className={`result ${results.transferFactoryOwnership.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.transferFactoryOwnership}</pre>
            </div>
          )}
        </div>

        {/* 调用工厂函数 */}
        <div className="subsection">
          <h4>调用工厂函数 callFactory(bytes memory data)</h4>
          <div className="form-group">
            <label>调用数据（十六进制）</label>
            <input
              type="text"
              value={factoryCallData}
              onChange={(e) => setFactoryCallData(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleCallFactory} disabled={loading} className="btn-success">
              调用工厂函数
            </button>
          </div>
          {results.callFactory && (
            <div className={`result ${results.callFactory.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.callFactory}</pre>
            </div>
          )}
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.rwaClaimIssuerGateway ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.rwaClaimIssuerGateway}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
      </div>

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
      {/* 工厂示例结果模态框 */}
      {showCallFactoryResult && callFactoryResult && (
        <div className="validation-result-modal">
          <div className="validation-result-content">
            <button
              onClick={() => setShowCallFactoryResult(false)}
              className="validation-result-close-button"
            >
              ×
            </button>
            <h2 className={`validation-result-title ${callFactoryResult.success ? "success" : "error"}`}>
              {callFactoryLoading
                ? "执行中..."
                : callFactoryResult.success
                  ? "✓ 操作成功"
                  : "✗ 操作失败"}
            </h2>
            <div className="validation-result-body">
              {callFactoryResult.messages.length > 0 && (
                <div>
                  <h3>操作信息：</h3>
                  <pre className="validation-result-pre">
                    {callFactoryResult.messages.join("\n")}
                  </pre>
                </div>
              )}
              {(callFactoryResult.newManagementKey ||
                callFactoryResult.newManagementKeyPrivateKey ||
                callFactoryResult.newIdentityAddress ||
                callFactoryResult.countryCode) && (
                <div className="validation-result-section">
                  <h3>注册结果摘要：</h3>
                  <pre className="validation-result-pre">
                    {callFactoryResult.newManagementKey && `新管理密钥地址: ${callFactoryResult.newManagementKey}\n`}
                    {callFactoryResult.newManagementKeyPrivateKey && `新管理密钥私钥: ${callFactoryResult.newManagementKeyPrivateKey}\n`}
                    {callFactoryResult.newIdentityAddress && `新身份合约地址: ${callFactoryResult.newIdentityAddress}\n`}
                    {callFactoryResult.countryCode && `国家代码: ${callFactoryResult.countryCode}`}
                  </pre>
                </div>
              )}
              {callFactoryResult.errors.length > 0 && (
                <div className="validation-result-section">
                  <h3>错误信息：</h3>
                  <pre className="validation-result-pre error">
                    {callFactoryResult.errors.join("\n")}
                  </pre>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowCallFactoryResult(false)}
              className="validation-result-close-btn"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

