import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, CHAIN_ID } from "../utils/config";
import { checkNetwork, switchToTargetNetwork, createContractConfig } from "../utils/contracts";
import { MintAndBurnResult } from "../utils/operations";
import { useMultiTransaction } from "../hooks/useMultiTransaction";
import MultiTransactionModal from "./MultiTransactionModal";
import "../styles/components/FinancePanel.css";

interface FinancePanelProps {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Signer;
  account: string;
  setRoleChoose: (value: boolean) => void;
}

export default function FinancePanel({ provider, wallet, account, setRoleChoose }: FinancePanelProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [isTokenAgent, setIsTokenAgent] = useState<boolean | null>(null);
  const [checkingTokenAgent, setCheckingTokenAgent] = useState(false);
  const [mintAndBurnResult, setMintAndBurnResult] = useState<MintAndBurnResult | null>(null);
  const [showMintAndBurnResult, setShowMintAndBurnResult] = useState(false);
  const [mintAndBurnLoading, setMintAndBurnLoading] = useState(false);
  
  // 使用多步骤交易流程 hook
  const multiTransaction = useMultiTransaction();

  const updateMintAndBurnResult = (partial: Partial<MintAndBurnResult>) => {
    setMintAndBurnResult((prev) => {
      const base: MintAndBurnResult = prev || { success: true, messages: [], errors: [] };
      return {
        success: partial.success ?? base.success,
        messages: partial.messages ? [...partial.messages] : [...base.messages],
        errors: partial.errors ? [...partial.errors] : [...base.errors],
        mintReceipt: partial.mintReceipt ?? base.mintReceipt,
        burnReceipt: partial.burnReceipt ?? base.burnReceipt,
        transferReceipt: partial.transferReceipt ?? base.transferReceipt,
      };
    });
  };

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

    checkTokenAgentRole();
  }, [account, provider]);

  // 检查网络并切换到正确网络（如果需要）
  const ensureCorrectNetwork = async (): Promise<boolean> => {
    const networkCheck = await checkNetwork();
    if (!networkCheck.correct) {
      try {
        await switchToTargetNetwork(CHAIN_ID);
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
    if (!toAddress || !amount || !CONTRACT_ADDRESSES.token) {
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
      const tx = await contract.burn(toAddress, amount);
      await tx.wait();
      showResult("burn", `成功销毁代币，交易哈希: ${tx.hash}`);
      setToAddress("");
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

  // Mint 和 Burn 示例操作（执行脚本 3_mintAndBurn.ts 的逻辑）
  const handleMintAndBurnExample = async () => {
    setLoading(true);
    setMintAndBurnLoading(true);
    setShowMintAndBurnResult(true);

    // 初始化多步骤状态
    multiTransaction.initialize([
      {
        id: 1,
        title: "执行 Mint 操作",
      },
      {
        id: 2,
        title: "执行 Burn 操作",
      },
      {
        id: 3,
        title: "完成所有操作",
      },
    ]);

    // 打开弹窗后先给用户即时反馈
    updateMintAndBurnResult({
      success: true,
      messages: ["正在执行示例操作，请稍候..."],
      errors: [],
      mintReceipt: undefined,
      burnReceipt: undefined,
      transferReceipt: undefined,
    });

    try {
      // 确保在正确的网络
      const networkOk = await ensureCorrectNetwork();
      if (!networkOk) {
        setLoading(false);
        setMintAndBurnLoading(false);
        return;
      }

      // 初始化合约配置（前端场景，不使用 Claim Issuer 各自的私钥）
      const contractConfig = await createContractConfig(provider, wallet, {
        useClaimIssuerPrivateKeys: false,
      });

      // 在此直接实现示例脚本逻辑，方便前端展示执行过程
      const amount = ethers.parseEther("1");

      const result: MintAndBurnResult = {
        success: true,
        messages: [],
        errors: [],
      };

      const emitProgress = () => {
        updateMintAndBurnResult({
          success: result.success,
          messages: [...result.messages],
          errors: [...result.errors],
          mintReceipt: result.mintReceipt,
          burnReceipt: result.burnReceipt,
          transferReceipt: result.transferReceipt,
        });
      };

      const defaultAddress = await contractConfig.signer.getAddress();
      const mintToAddress = account || defaultAddress;
      const burnFromAddress = account || defaultAddress;

      // Step 1: Mint
      multiTransaction.setCurrentStep(1);
      multiTransaction.updateStep(1, { status: "in_progress" });
      result.messages.push("\n=== 开始 Mint 操作 ===");
      emitProgress();
      
      try {
        const balanceBefore = await contractConfig.token.balanceOf(mintToAddress);
        const totalSupplyBefore = await contractConfig.token.totalSupply();
        result.messages.push(`Mint 前余额: ${ethers.formatEther(balanceBefore)}`);
        result.messages.push(`Mint 前总供应量: ${ethers.formatEther(totalSupplyBefore)}`);
        result.messages.push(`Mint 数量: ${ethers.formatEther(amount)}`);
        result.messages.push(`Mint 到地址: ${mintToAddress}`);
        emitProgress();

        // 发送交易
        const mintTx = await contractConfig.token.mint(mintToAddress, amount, {
          gasLimit: 1000000,
        });
        result.messages.push(`Mint 交易哈希: ${mintTx.hash}`);
        emitProgress();

        // 开始跟踪确认进度
        const mintCheckInterval = await multiTransaction.trackTransactionConfirmations(
          provider,
          mintTx.hash,
          1,
          12
        );

        // 等待交易确认
        const mintReceipt = await mintTx.wait(2);
        if (mintCheckInterval) clearInterval(mintCheckInterval);
        result.mintReceipt = mintReceipt;
        multiTransaction.updateStep(1, { status: "completed", confirmations: 12, estimatedTimeLeft: undefined });
        emitProgress();

        const balanceAfter = await contractConfig.token.balanceOf(mintToAddress);
        const totalSupplyAfter = await contractConfig.token.totalSupply();
        result.messages.push(`Mint 后余额: ${ethers.formatEther(balanceAfter)}`);
        result.messages.push(`Mint 后总供应量: ${ethers.formatEther(totalSupplyAfter)}`);
        result.messages.push("✓ Mint 操作完成");
        emitProgress();
      } catch (mintError: any) {
        result.success = false;
        result.errors.push(`Mint 操作失败: ${mintError.message || mintError}`);
        multiTransaction.updateStep(1, { status: "failed", error: mintError.message || mintError });
        emitProgress();
      }

      // Step 2: Burn
      const burnAmount = amount / 2n;
      multiTransaction.setCurrentStep(2);
      multiTransaction.updateStep(2, { status: "in_progress" });
      result.messages.push("\n=== 开始 Burn 操作 ===");
      emitProgress();
      
      try {
        const balanceBeforeBurn = await contractConfig.token.balanceOf(burnFromAddress);
        const totalSupplyBeforeBurn = await contractConfig.token.totalSupply();
        result.messages.push(`Burn 前余额: ${ethers.formatEther(balanceBeforeBurn)}`);
        result.messages.push(`Burn 前总供应量: ${ethers.formatEther(totalSupplyBeforeBurn)}`);
        result.messages.push(`Burn 数量: ${ethers.formatEther(burnAmount)}`);
        result.messages.push(`Burn 从地址: ${burnFromAddress}`);
        emitProgress();

        // 发送交易
        const burnTx = await contractConfig.token.burn(burnFromAddress, burnAmount, {
          gasLimit: 1000000,
        });
        result.messages.push(`Burn 交易哈希: ${burnTx.hash}`);
        emitProgress();

        // 开始跟踪确认进度
        const burnCheckInterval = await multiTransaction.trackTransactionConfirmations(
          provider,
          burnTx.hash,
          2,
          12
        );

        // 等待交易确认
        const burnReceipt = await burnTx.wait(2);
        if (burnCheckInterval) clearInterval(burnCheckInterval);
        result.burnReceipt = burnReceipt;
        multiTransaction.updateStep(2, { status: "completed", confirmations: 12, estimatedTimeLeft: undefined });
        emitProgress();

        const balanceAfterBurn = await contractConfig.token.balanceOf(burnFromAddress);
        const totalSupplyAfterBurn = await contractConfig.token.totalSupply();
        result.messages.push(`Burn 后余额: ${ethers.formatEther(balanceAfterBurn)}`);
        result.messages.push(`Burn 后总供应量: ${ethers.formatEther(totalSupplyAfterBurn)}`);
        result.messages.push("✓ Burn 操作完成");
        emitProgress();
      } catch (burnError: any) {
        result.success = false;
        result.errors.push(`Burn 操作失败: ${burnError.message || burnError}`);
        multiTransaction.updateStep(2, { status: "failed", error: burnError.message || burnError });
        emitProgress();
      }

      // Step 3: 完成
      multiTransaction.setCurrentStep(3);
      if (result.success) {
        multiTransaction.updateStep(3, { status: "completed" });
        result.messages.push("\n✓ 所有操作完成！");
      } else {
        multiTransaction.updateStep(3, { status: "failed" });
        result.messages.push("\n✗ 部分操作失败，请查看错误信息");
      }

      updateMintAndBurnResult({
        success: result.success,
        messages: [...result.messages],
        errors: [...result.errors],
        mintReceipt: result.mintReceipt,
        burnReceipt: result.burnReceipt,
        transferReceipt: result.transferReceipt,
      });
    } catch (error: any) {
      let errorMsg = error.message || "未知错误";
      if (errorMsg.includes("insufficient funds") || errorMsg.includes("gas") || errorMsg.includes("network")) {
        errorMsg = `交易失败: ${errorMsg}\n\n请检查:\n1. MetaMask 是否连接到正确的网络 (ChainId: ${CHAIN_ID})\n2. 账户余额是否充足\n3. 合约地址是否正确配置`;
      }
      // 创建错误结果对象并显示在模态框中
      const errorResult: MintAndBurnResult = {
        success: false,
        messages: [],
        errors: [errorMsg],
      };
      updateMintAndBurnResult(errorResult);
    } finally {
      setLoading(false);
      setMintAndBurnLoading(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">财务模块管理面板</h2>
        <div className="panel-actions">
          <button
            onClick={handleMintAndBurnExample}
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

      {/* 多步骤交易流程模态框 */}
      <MultiTransactionModal
        isOpen={showMintAndBurnResult}
        onClose={() => {
          setShowMintAndBurnResult(false);
          multiTransaction.reset();
        }}
        state={multiTransaction.state}
        onToggleTechnicalDetails={multiTransaction.toggleTechnicalDetails}
        technicalDetails={
          mintAndBurnResult
            ? {
                messages: mintAndBurnResult.messages,
                errors: mintAndBurnResult.errors,
                receipts: [
                  mintAndBurnResult.mintReceipt && {
                    label: "Mint",
                    hash: mintAndBurnResult.mintReceipt.hash,
                  },
                  mintAndBurnResult.burnReceipt && {
                    label: "Burn",
                    hash: mintAndBurnResult.burnReceipt.hash,
                  },
                  mintAndBurnResult.transferReceipt && {
                    label: "Transfer",
                    hash: mintAndBurnResult.transferReceipt.hash,
                  },
                ].filter(Boolean) as Array<{ label: string; hash: string }>,
              }
            : undefined
        }
        isLoading={mintAndBurnLoading}
        title="多交易流程"
        progressLabel="Mint & Burn"
        onSpeedUp={(stepId) => {
          // 加速功能可以在这里实现
          console.log("加速步骤:", stepId);
        }}
      />
    </div>
  );
}

