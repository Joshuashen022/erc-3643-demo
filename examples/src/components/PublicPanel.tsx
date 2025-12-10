import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../utils/config";
import { createContractConfig } from "../utils/contracts";
import { useMultiTransaction } from "../hooks/useMultiTransaction";
import MultiTransactionModal from "./MultiTransactionModal";

interface PublicPanelProps {
  provider: ethers.JsonRpcProvider;
  account: string;
  setRoleChoose: (value: boolean) => void;
}

export default function PublicPanel({ provider, account, setRoleChoose }: PublicPanelProps) {
  const [loading, setLoading] = useState(false);
  
  // 每个模块独立的结果状态
  const [publicExampleResult, setPublicExampleResult] = useState<string>("");
  
  // 公共示例相关状态
  const [publicExampleResultObj, setPublicExampleResultObj] = useState<{
    success: boolean;
    messages: string[];
    errors: string[];
    transferReceipt?: ethers.ContractTransactionReceipt;
  } | null>(null);
  const [showPublicExampleResult, setShowPublicExampleResult] = useState(false);
  const [publicExampleLoading, setPublicExampleLoading] = useState(false);
  
  // 使用多步骤交易流程 hook
  const multiTransaction = useMultiTransaction();
  const [claimTopicsResult, setClaimTopicsResult] = useState<string>("");
  const [identityResult, setIdentityResult] = useState<string>("");
  const [trustedIssuersResult, setTrustedIssuersResult] = useState<string>("");
  const [tokenBalanceResult, setTokenBalanceResult] = useState<string>(""); // 查询余额和信息的结果
  const [tokenResult, setTokenResult] = useState<string>(""); // 其他代币操作的结果
  const [complianceResult, setComplianceResult] = useState<string>("");

  // 查询状态
  const [queryAddress, setQueryAddress] = useState("");
  const [queryClaimTopic, setQueryClaimTopic] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [spenderAddress, setSpenderAddress] = useState("");
  const [approveAmount, setApproveAmount] = useState("");

  // ClaimTopicsRegistry 查询
  const handleGetClaimTopics = async () => {
    if (!CONTRACT_ADDRESSES.claimTopicsRegistry) {
      setClaimTopicsResult("请配置合约地址");
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
      const topicsArray = (Array.from(topics) as bigint[]).map(t => t.toString());
      setClaimTopicsResult(`声明主题列表: ${topicsArray.join(", ")}`);
    } catch (error: any) {
      setClaimTopicsResult(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // IdentityRegistry 查询
  const handleIsVerified = async () => {
    if (!queryAddress || !CONTRACT_ADDRESSES.identityRegistry) {
      setIdentityResult("请填写地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.identityRegistry,
        [
          "function isVerified(address _userAddress) external view returns (bool)",
          "function contains(address _userAddress) external view returns (bool)",
          "function identity(address _userAddress) external view returns (address)",
          "function investorCountry(address _userAddress) external view returns (uint16)",
        ],
        provider
      );
      const verified = await contract.isVerified(queryAddress);
      const contains = await contract.contains(queryAddress);
      const identity = await contract.identity(queryAddress);
      const country = await contract.investorCountry(queryAddress);
      
      setIdentityResult(
        `用户 ${queryAddress}:\n` +
        `- 已验证: ${verified}\n` +
        `- 已注册: ${contains}\n` +
        `- 身份合约: ${identity}\n` +
        `- 国家代码: ${country}`
      );
    } catch (error: any) {
      setIdentityResult(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // TrustedIssuersRegistry 查询
  const handleGetTrustedIssuers = async () => {
    if (!CONTRACT_ADDRESSES.trustedIssuersRegistry) {
      setTrustedIssuersResult("请配置合约地址");
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
      const issuersArray = Array.from(issuers);
      setTrustedIssuersResult(`可信发行者列表: ${issuersArray.join(", ")}`);
    } catch (error: any) {
      setTrustedIssuersResult(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetTrustedIssuersForClaimTopic = async () => {
    if (!queryClaimTopic || !CONTRACT_ADDRESSES.trustedIssuersRegistry) {
      setTrustedIssuersResult("请填写声明主题并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trustedIssuersRegistry,
        [
          "function getTrustedIssuersForClaimTopic(uint256 claimTopic) external view returns (address[])",
        ],
        provider
      );
      const issuers = await contract.getTrustedIssuersForClaimTopic(queryClaimTopic);
      const issuersArray = Array.from(issuers);
      setTrustedIssuersResult(`支持声明主题 ${queryClaimTopic} 的发行者: ${issuersArray.join(", ")}`);
    } catch (error: any) {
      setTrustedIssuersResult(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Token 查询
  const handleGetBalance = async () => {
    if (!queryAddress || !CONTRACT_ADDRESSES.token) {
      setTokenBalanceResult("请填写地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.token,
        [
          "function balanceOf(address _userAddress) external view returns (uint256)",
          "function totalSupply() external view returns (uint256)",
          "function name() external view returns (string)",
          "function symbol() external view returns (string)",
          "function decimals() external view returns (uint8)",
          "function paused() external view returns (bool)",
          "function isFrozen(address _userAddress) external view returns (bool)",
          "function getFrozenTokens(address _userAddress) external view returns (uint256)",
        ],
        provider
      );
      const balance = await contract.balanceOf(queryAddress);
      const totalSupply = await contract.totalSupply();
      const name = await contract.name();
      const symbol = await contract.symbol();
      const decimals = await contract.decimals();
      const paused = await contract.paused();
      const isFrozen = await contract.isFrozen(queryAddress);
      const frozenTokens = await contract.getFrozenTokens(queryAddress);
      
      setTokenBalanceResult(
        `代币信息:\n` +
        `- 名称: ${name}\n` +
        `- 符号: ${symbol}\n` +
        `- 精度: ${decimals}\n` +
        `- 总供应量: ${totalSupply.toString()}\n` +
        `- 暂停状态: ${paused}\n\n` +
        `用户 ${queryAddress}:\n` +
        `- 余额: ${balance.toString()}\n` +
        `- 是否冻结: ${isFrozen}\n` +
        `- 冻结代币: ${frozenTokens.toString()}`
      );
    } catch (error: any) {
      setTokenBalanceResult(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAllowance = async () => {
    if (!queryAddress || !spenderAddress || !CONTRACT_ADDRESSES.token) {
      setTokenResult("请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.token,
        [
          "function allowance(address _owner, address _spender) external view returns (uint256)",
        ],
        provider
      );
      const allowance = await contract.allowance(queryAddress, spenderAddress);
      setTokenResult(`授权额度: ${allowance.toString()}`);
    } catch (error: any) {
      setTokenResult(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Token 转账操作（需要钱包签名）
  const handleTransfer = async () => {
    if (!transferTo || !transferAmount || !CONTRACT_ADDRESSES.token) {
      setTokenResult("请填写所有字段并配置合约地址");
      return;
    }

    if (typeof window === "undefined" || !window.ethereum) {
      setTokenResult("请使用 MetaMask 或其他 Web3 钱包");
      return;
    }

    setLoading(true);
    try {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await web3Provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.token,
        [
          "function transfer(address _to, uint256 _amount) external returns (bool)",
        ],
        signer
      );
      const tx = await contract.transfer(transferTo, transferAmount);
      await tx.wait();
      setTokenResult(`成功转账，交易哈希: ${tx.hash}`);
      setTransferTo("");
      setTransferAmount("");
    } catch (error: any) {
      setTokenResult(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!spenderAddress || !approveAmount || !CONTRACT_ADDRESSES.token) {
      setTokenResult("请填写所有字段并配置合约地址");
      return;
    }

    if (typeof window === "undefined" || !window.ethereum) {
      setTokenResult("请使用 MetaMask 或其他 Web3 钱包");
      return;
    }

    setLoading(true);
    try {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await web3Provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.token,
        [
          "function approve(address _spender, uint256 _amount) external returns (bool)",
        ],
        signer
      );
      const tx = await contract.approve(spenderAddress, approveAmount);
      await tx.wait();
      setTokenResult(`成功授权，交易哈希: ${tx.hash}`);
      setSpenderAddress("");
      setApproveAmount("");
    } catch (error: any) {
      setTokenResult(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ModularCompliance 查询
  const handleGetModules = async () => {
    if (!CONTRACT_ADDRESSES.modularCompliance) {
      setComplianceResult("请配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.modularCompliance,
        [
          "function getModules() external view returns (address[])",
          "function getTokenBound() external view returns (address)",
        ],
        provider
      );
      const modules = await contract.getModules();
      const tokenBound = await contract.getTokenBound();
      const modulesArray = Array.from(modules);
      setComplianceResult(
        `合规模块列表: ${modulesArray.join(", ")}\n` +
        `绑定的代币: ${tokenBound}`
      );
    } catch (error: any) {
      setComplianceResult(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCallPublicExample = async () => {
    setLoading(true);
    setPublicExampleLoading(true);
    setShowPublicExampleResult(true);

    // 初始化多步骤状态
    multiTransaction.initialize([
      {
        id: 1,
        title: "执行 Transfer 操作",
      },
      {
        id: 2,
        title: "完成转账",
      },
    ]);

    // 初始化结果状态
    setPublicExampleResultObj({
      success: true,
      messages: ["正在执行示例操作：执行 Transfer 操作..."],
      errors: [],
    });

    const updateResult = (partial: Partial<typeof publicExampleResultObj>) => {
      setPublicExampleResultObj((prev) => {
        const base = prev || { success: true, messages: [], errors: [] };
        return {
          success: partial.success ?? base.success,
          messages: partial.messages ? [...partial.messages] : [...base.messages],
          errors: partial.errors ? [...partial.errors] : [...base.errors],
          transferReceipt: partial.transferReceipt ?? base.transferReceipt,
        };
      });
    };

    try {
      if (typeof window === "undefined" || !window.ethereum) {
        updateResult({
          success: false,
          errors: ["请使用 MetaMask 或其他 Web3 钱包"],
        });
        multiTransaction.updateStep(1, { status: "failed", error: "请使用 MetaMask 或其他 Web3 钱包" });
        return;
      }

      multiTransaction.setCurrentStep(1);
      multiTransaction.updateStep(1, { status: "in_progress" });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await web3Provider.getSigner();
      const contractConfig = await createContractConfig(provider, signer);
      const transferToAddress = "0x340ec02864d9CAFF4919BEbE4Ee63f64b99c7806";

      updateResult({ messages: ["\n=== 开始执行 Transfer 操作 ==="] });
      updateResult({ messages: [`转账到地址: ${transferToAddress}`] });

      const ownerBalance = await contractConfig.token.balanceOf(account);
      const transferAmount = ownerBalance / 10n;
      updateResult({ messages: [`当前余额: ${ethers.formatEther(ownerBalance)}`] });
      updateResult({ messages: [`转账数量: ${ethers.formatEther(transferAmount)}`] });

      const transferTx = await contractConfig.token.transfer(transferToAddress, transferAmount);
      updateResult({ messages: [`转账交易哈希: ${transferTx.hash}`] });

      const transferCheckInterval = await multiTransaction.trackTransactionConfirmations(
        provider,
        transferTx.hash,
        1,
        12
      );

      const transferReceipt = await transferTx.wait(2);
      if (transferCheckInterval) clearInterval(transferCheckInterval);

      updateResult({
        messages: ["✓ 转账成功"],
        transferReceipt,
      });

      const balanceAfter = await contractConfig.token.balanceOf(account);
      updateResult({ messages: [`转账后余额: ${ethers.formatEther(balanceAfter)}`] });

      multiTransaction.updateStep(1, { status: "completed", confirmations: 12, estimatedTimeLeft: undefined });

      // 完成
      multiTransaction.setCurrentStep(2);
      multiTransaction.updateStep(2, { status: "completed" });
      updateResult({ messages: ["\n=== 转账操作完成 ==="] });
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
      setPublicExampleLoading(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">普通用户面板</h2>
        <div className="panel-actions">
          <button
            onClick={handleCallPublicExample}
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

      {/* ClaimTopicsRegistry 查询 */}
      <div className="section">
        <h3>声明主题查询 (ClaimTopicsRegistry)</h3>
        <div className="button-group">
          <button onClick={handleGetClaimTopics} disabled={loading} className="btn-secondary">
            查询所有声明主题
          </button>
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.claimTopicsRegistry ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.claimTopicsRegistry}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
        
        {/* 结果显示区域 - 显示在声明主题查询 section 的末尾 */}
        {claimTopicsResult && (
          <div 
            className={`result ${claimTopicsResult.includes("错误") ? "error" : "success"}`} 
            style={{ 
              marginTop: "1rem",
              position: "relative",
              minHeight: "50px"
            }}
          >
            <pre style={{ fontSize: "14px", lineHeight: "1.5" }}>{claimTopicsResult}</pre>
          </div>
        )}
      </div>

      {/* IdentityRegistry 查询 */}
      <div className="section">
        <h3>身份查询 (IdentityRegistry)</h3>
        <div className="form-group">
          <label>用户地址</label>
          <input
            type="text"
            value={queryAddress}
            onChange={(e) => setQueryAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <div className="button-group">
          <button onClick={handleIsVerified} disabled={loading} className="btn-secondary">
            查询用户信息
          </button>
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.identityRegistry ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.identityRegistry}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
        
        {/* 结果显示区域 */}
        {identityResult && (
          <div 
            className={`result ${identityResult.includes("错误") ? "error" : "success"}`} 
            style={{ 
              marginTop: "1rem",
              position: "relative",
              minHeight: "50px"
            }}
          >
            <pre style={{ fontSize: "14px", lineHeight: "1.5" }}>{identityResult}</pre>
          </div>
        )}
      </div>

      {/* TrustedIssuersRegistry 查询 */}
      <div className="section">
        <h3>可信发行者查询 (TrustedIssuersRegistry)</h3>
        <div className="form-group">
          <label>声明主题 ID</label>
          <input
            type="text"
            value={queryClaimTopic}
            onChange={(e) => setQueryClaimTopic(e.target.value)}
            placeholder="例如: 1"
          />
        </div>
        <div className="button-group">
          <button onClick={handleGetTrustedIssuers} disabled={loading} className="btn-secondary">
            查询所有发行者
          </button>
          <button onClick={handleGetTrustedIssuersForClaimTopic} disabled={loading} className="btn-secondary">
            按主题查询发行者
          </button>
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.trustedIssuersRegistry ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.trustedIssuersRegistry}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
        
        {/* 结果显示区域 */}
        {trustedIssuersResult && (
          <div 
            className={`result ${trustedIssuersResult.includes("错误") ? "error" : "success"}`} 
            style={{ 
              marginTop: "1rem",
              position: "relative",
              minHeight: "50px"
            }}
          >
            <pre style={{ fontSize: "14px", lineHeight: "1.5" }}>{trustedIssuersResult}</pre>
          </div>
        )}
      </div>

      {/* Token 查询和操作 */}
      <div className="section">
        <h3>代币查询和操作 (Token)</h3>
        <div className="form-group">
          <label>查询地址</label>
          <input
            type="text"
            value={queryAddress}
            onChange={(e) => setQueryAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <div className="button-group">
          <button onClick={handleGetBalance} disabled={loading} className="btn-secondary">
            查询余额和信息
          </button>
        </div>
        
        {/* 查询余额和信息的结果显示区域 - 显示在按钮下方 */}
        {tokenBalanceResult && (
          <div 
            className={`result ${tokenBalanceResult.includes("错误") ? "error" : "success"}`} 
            style={{ 
              marginTop: "1rem",
              position: "relative",
              minHeight: "50px"
            }}
          >
            <pre style={{ fontSize: "14px", lineHeight: "1.5" }}>{tokenBalanceResult}</pre>
          </div>
        )}

        <div className="form-row" style={{ marginTop: "1rem" }}>
          <div className="form-group">
            <label>接收地址（转账）</label>
            <input
              type="text"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>转账数量</label>
            <input
              type="text"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="例如: 1000000000000000000"
            />
          </div>
        </div>
        <div className="button-group">
          <button onClick={handleTransfer} disabled={loading} className="btn-primary">
            转账
          </button>
        </div>

        <div className="form-row" style={{ marginTop: "1rem" }}>
          <div className="form-group">
            <label>授权地址</label>
            <input
              type="text"
              value={spenderAddress}
              onChange={(e) => setSpenderAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>授权数量</label>
            <input
              type="text"
              value={approveAmount}
              onChange={(e) => setApproveAmount(e.target.value)}
              placeholder="例如: 1000000000000000000"
            />
          </div>
        </div>
        <div className="button-group">
          <button onClick={handleApprove} disabled={loading} className="btn-primary">
            授权
          </button>
          <button onClick={handleGetAllowance} disabled={loading} className="btn-secondary">
            查询授权额度
          </button>
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.token ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.token}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
        
        {/* 结果显示区域 */}
        {tokenResult && (
          <div 
            className={`result ${tokenResult.includes("错误") ? "error" : "success"}`} 
            style={{ 
              marginTop: "1rem",
              position: "relative",
              minHeight: "50px"
            }}
          >
            <pre style={{ fontSize: "14px", lineHeight: "1.5" }}>{tokenResult}</pre>
          </div>
        )}
      </div>

      {/* ModularCompliance 查询 */}
      <div className="section">
        <h3>合规查询 (ModularCompliance)</h3>
        <div className="button-group">
          <button onClick={handleGetModules} disabled={loading} className="btn-secondary">
            查询模块列表
          </button>
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.modularCompliance ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.modularCompliance}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
        
        {/* 结果显示区域 */}
        {complianceResult && (
          <div 
            className={`result ${complianceResult.includes("错误") ? "error" : "success"}`} 
            style={{ 
              marginTop: "1rem",
              position: "relative",
              minHeight: "50px"
            }}
          >
            <pre style={{ fontSize: "14px", lineHeight: "1.5" }}>{complianceResult}</pre>
          </div>
        )}
      </div>

      {/* 多步骤交易流程模态框 */}
      <MultiTransactionModal
        isOpen={showPublicExampleResult}
        onClose={() => {
          setShowPublicExampleResult(false);
          multiTransaction.reset();
        }}
        state={multiTransaction.state}
        onToggleTechnicalDetails={multiTransaction.toggleTechnicalDetails}
        technicalDetails={
          publicExampleResultObj
            ? {
                messages: publicExampleResultObj.messages,
                errors: publicExampleResultObj.errors,
                receipts: publicExampleResultObj.transferReceipt
                  ? [
                      {
                        label: "Transfer",
                        hash: publicExampleResultObj.transferReceipt.hash,
                      },
                    ]
                  : [],
              }
            : undefined
        }
        isLoading={publicExampleLoading}
        title="转账操作"
        progressLabel="转账流程"
        onSpeedUp={(stepId) => {
          // 加速功能可以在这里实现
          console.log("加速步骤:", stepId);
        }}
      />
    </div>
  );
}

