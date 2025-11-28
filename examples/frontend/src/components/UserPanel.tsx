import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../utils/config";

interface UserPanelProps {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Signer;
  account: string;
}

export default function UserPanel({ provider, wallet, account }: UserPanelProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  
  // Identity 合约地址
  const [identityAddress, setIdentityAddress] = useState("");
  const [queryUserAddress, setQueryUserAddress] = useState(""); // 用于通过IdentityRegistry查询

  // Management Key (Purpose 1) 状态
  const [keyToAdd, setKeyToAdd] = useState("");
  const [purposeToAdd, setPurposeToAdd] = useState("1");
  const [keyTypeToAdd, setKeyTypeToAdd] = useState("1");
  const [keyToRemove, setKeyToRemove] = useState("");
  const [purposeToRemove, setPurposeToRemove] = useState("1");
  const [approvalId, setApprovalId] = useState("");
  const [approvalValue, setApprovalValue] = useState("true");
  const [executeTo, setExecuteTo] = useState("");
  const [executeValue, setExecuteValue] = useState("0");
  const [executeData, setExecuteData] = useState("");

  // Action Key (Purpose 2) 状态 - 复用execute和approve

  // Claim Key (Purpose 3) 状态
  const [claimTopic, setClaimTopic] = useState("");
  const [claimScheme, setClaimScheme] = useState("1");
  const [claimIssuer, setClaimIssuer] = useState("");
  const [claimSignature, setClaimSignature] = useState("");
  const [claimData, setClaimData] = useState("");
  const [claimUri, setClaimUri] = useState("");
  const [claimIdToRemove, setClaimIdToRemove] = useState("");

  // View 函数状态
  const [queryKey, setQueryKey] = useState("");
  const [queryPurpose, setQueryPurpose] = useState("1");
  const [queryClaimTopic, setQueryClaimTopic] = useState("");
  const [queryClaimId, setQueryClaimId] = useState("");
  const [isClaimValidIdentity, setIsClaimValidIdentity] = useState("");
  const [isClaimValidTopic, setIsClaimValidTopic] = useState("");
  const [isClaimValidSig, setIsClaimValidSig] = useState("");
  const [isClaimValidData, setIsClaimValidData] = useState("");
  const [recoveredAddressSig, setRecoveredAddressSig] = useState("");
  const [recoveredAddressDataHash, setRecoveredAddressDataHash] = useState("");

  const showResult = (key: string, message: string) => {
    setResults((prev) => ({ ...prev, [key]: message }));
  };

  // 辅助函数：将字符串转换为bytes32
  const stringToBytes32 = (str: string): `0x${string}` => {
    // 如果已经是hex字符串（0x开头且长度为66），直接返回
    if (str.startsWith("0x") && str.length === 66) {
      return str as `0x${string}`;
    }
    // 如果是hex字符串但长度不对，尝试修复
    if (str.startsWith("0x")) {
      const hex = str.slice(2);
      const padded = hex.padStart(64, "0").slice(0, 64);
      return `0x${padded}` as `0x${string}`;
    }
    // 如果是普通字符串，转换为bytes32（使用keccak256 hash或zeroPad）
    // 使用zeroPadValue来确保是32字节
    try {
      const bytes = ethers.toUtf8Bytes(str);
      const padded = ethers.zeroPadValue(bytes, 32);
      return padded as `0x${string}`;
    } catch {
      // 如果转换失败，尝试作为hex处理
      const hex = str.replace("0x", "").padStart(64, "0").slice(0, 64);
      return `0x${hex}` as `0x${string}`;
    }
  };

  // 通过IdentityRegistry查询Identity地址
  const handleQueryIdentityAddress = async () => {
    if (!queryUserAddress || !CONTRACT_ADDRESSES.identityRegistry) {
      showResult("queryIdentity", "请填写用户地址并配置IdentityRegistry合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.identityRegistry,
        [
          "function identity(address _userAddress) external view returns (address)",
        ],
        provider
      );
      const identity = await contract.identity(queryUserAddress);
      if (identity && identity !== ethers.ZeroAddress) {
        setIdentityAddress(identity);
        showResult("queryIdentity", `用户 ${queryUserAddress} 的Identity合约地址: ${identity}`);
      } else {
        showResult("queryIdentity", `用户 ${queryUserAddress} 尚未注册Identity合约`);
      }
    } catch (error: any) {
      showResult("queryIdentity", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Management Key (Purpose 1) 操作

  const handleAddKey = async () => {
    if (!identityAddress || !keyToAdd || !purposeToAdd || !keyTypeToAdd) {
      showResult("addKey", "请填写所有字段并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType) external returns (bool success)",
        ],
        wallet
      );
      const keyBytes32 = stringToBytes32(keyToAdd);
      const tx = await contract.addKey(keyBytes32, purposeToAdd, keyTypeToAdd);
      await tx.wait();
      showResult("addKey", `成功添加密钥，交易哈希: ${tx.hash}`);
      setKeyToAdd("");
    } catch (error: any) {
      showResult("addKey", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!identityAddress || !keyToRemove || !purposeToRemove) {
      showResult("removeKey", "请填写所有字段并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function removeKey(bytes32 _key, uint256 _purpose) external returns (bool success)",
        ],
        wallet
      );
      const keyBytes32 = stringToBytes32(keyToRemove);
      const tx = await contract.removeKey(keyBytes32, purposeToRemove);
      await tx.wait();
      showResult("removeKey", `成功移除密钥，交易哈希: ${tx.hash}`);
      setKeyToRemove("");
    } catch (error: any) {
      showResult("removeKey", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!identityAddress || !approvalId) {
      showResult("approve", "请填写所有字段并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function approve(uint256 _id, bool _approve) external returns (bool success)",
        ],
        wallet
      );
      const approveValue = approvalValue === "true";
      const tx = await contract.approve(approvalId, approveValue);
      await tx.wait();
      showResult("approve", `成功${approveValue ? "批准" : "拒绝"}执行请求，交易哈希: ${tx.hash}`);
      setApprovalId("");
    } catch (error: any) {
      showResult("approve", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!identityAddress || !executeTo) {
      showResult("execute", "请填写所有字段并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function execute(address _to, uint256 _value, bytes calldata _data) external payable returns (uint256 executionId)",
        ],
        wallet
      );
      // executeData应该已经是hex格式，如果不是则尝试转换
      let dataBytes = "0x";
      if (executeData) {
        if (executeData.startsWith("0x")) {
          dataBytes = executeData;
        } else {
          // 尝试将字符串转换为hex
          try {
            dataBytes = ethers.hexlify(ethers.toUtf8Bytes(executeData));
          } catch {
            // 如果失败，假设已经是hex但没有0x前缀
            dataBytes = `0x${executeData}`;
          }
        }
      }
      const valueBigInt = BigInt(executeValue || "0");
      const tx = await contract.execute(executeTo, executeValue, dataBytes, { value: valueBigInt });
      await tx.wait();
      showResult("execute", `成功执行操作，交易哈希: ${tx.hash}`);
      setExecuteTo("");
      setExecuteValue("0");
      setExecuteData("");
    } catch (error: any) {
      showResult("execute", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Claim Key (Purpose 3) 操作

  const handleAddClaim = async () => {
    if (!identityAddress || !claimTopic || !claimIssuer) {
      showResult("addClaim", "请填写所有必填字段并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function addClaim(uint256 _topic, uint256 _scheme, address issuer, bytes calldata _signature, bytes calldata _data, string calldata _uri) external returns (bytes32 claimRequestId)",
        ],
        wallet
      );
      // 处理签名和数据，应该已经是hex格式
      let signatureBytes = "0x";
      if (claimSignature) {
        if (claimSignature.startsWith("0x")) {
          signatureBytes = claimSignature;
        } else {
          try {
            signatureBytes = ethers.hexlify(ethers.toUtf8Bytes(claimSignature));
          } catch {
            signatureBytes = `0x${claimSignature}`;
          }
        }
      }
      let dataBytes = "0x";
      if (claimData) {
        if (claimData.startsWith("0x")) {
          dataBytes = claimData;
        } else {
          try {
            dataBytes = ethers.hexlify(ethers.toUtf8Bytes(claimData));
          } catch {
            dataBytes = `0x${claimData}`;
          }
        }
      }
      const tx = await contract.addClaim(claimTopic, claimScheme, claimIssuer, signatureBytes, dataBytes, claimUri);
      await tx.wait();
      showResult("addClaim", `成功添加声明，交易哈希: ${tx.hash}`);
      setClaimTopic("");
      setClaimIssuer("");
      setClaimSignature("");
      setClaimData("");
      setClaimUri("");
    } catch (error: any) {
      showResult("addClaim", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClaim = async () => {
    if (!identityAddress || !claimIdToRemove) {
      showResult("removeClaim", "请填写声明ID并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function removeClaim(bytes32 _claimId) external returns (bool success)",
        ],
        wallet
      );
      const claimIdBytes32 = stringToBytes32(claimIdToRemove);
      const tx = await contract.removeClaim(claimIdBytes32);
      await tx.wait();
      showResult("removeClaim", `成功移除声明，交易哈希: ${tx.hash}`);
      setClaimIdToRemove("");
    } catch (error: any) {
      showResult("removeClaim", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // View 函数

  const handleGetKey = async () => {
    if (!identityAddress || !queryKey) {
      showResult("getKey", "请填写密钥并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function getKey(bytes32 _key) external view returns (uint256[] memory purposes, uint256 keyType, bytes32 key)",
        ],
        provider
      );
      const keyBytes32 = stringToBytes32(queryKey);
      const result = await contract.getKey(keyBytes32);
      const purposes = Array.from(result.purposes as bigint[]).map(p => p.toString());
      showResult("getKey", 
        `密钥信息:\n` +
        `- 目的: [${purposes.join(", ")}]\n` +
        `- 类型: ${result.keyType.toString()}\n` +
        `- 密钥值: ${result.key}`
      );
    } catch (error: any) {
      showResult("getKey", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetKeyPurposes = async () => {
    if (!identityAddress || !queryKey) {
      showResult("getKeyPurposes", "请填写密钥并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function getKeyPurposes(bytes32 _key) external view returns(uint256[] memory _purposes)",
        ],
        provider
      );
      const keyBytes32 = stringToBytes32(queryKey);
      const purposes = await contract.getKeyPurposes(keyBytes32);
      const purposesArray = Array.from(purposes as bigint[]).map(p => p.toString());
      showResult("getKeyPurposes", `密钥目的: [${purposesArray.join(", ")}]`);
    } catch (error: any) {
      showResult("getKeyPurposes", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetKeysByPurpose = async () => {
    if (!identityAddress || !queryPurpose) {
      showResult("getKeysByPurpose", "请填写目的并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function getKeysByPurpose(uint256 _purpose) external view returns (bytes32[] memory keys)",
        ],
        provider
      );
      const keys = await contract.getKeysByPurpose(queryPurpose);
      const keysArray = Array.from(keys as string[]);
      showResult("getKeysByPurpose", `具有目的 ${queryPurpose} 的密钥: ${keysArray.join(", ")}`);
    } catch (error: any) {
      showResult("getKeysByPurpose", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetClaimIdsByTopic = async () => {
    if (!identityAddress || !queryClaimTopic) {
      showResult("getClaimIdsByTopic", "请填写声明主题并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function getClaimIdsByTopic(uint256 _topic) external view returns(bytes32[] memory claimIds)",
        ],
        provider
      );
      const claimIds = await contract.getClaimIdsByTopic(queryClaimTopic);
      const claimIdsArray = Array.from(claimIds as string[]);
      showResult("getClaimIdsByTopic", `主题 ${queryClaimTopic} 的声明ID: ${claimIdsArray.join(", ")}`);
    } catch (error: any) {
      showResult("getClaimIdsByTopic", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetClaim = async () => {
    if (!identityAddress || !queryClaimId) {
      showResult("getClaim", "请填写声明ID并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function getClaim(bytes32 _claimId) external view returns(uint256 topic, uint256 scheme, address issuer, bytes memory signature, bytes memory data, string memory uri)",
        ],
        provider
      );
      const claimIdBytes32 = stringToBytes32(queryClaimId);
      const result = await contract.getClaim(claimIdBytes32);
      showResult("getClaim",
        `声明信息:\n` +
        `- 主题: ${result.topic.toString()}\n` +
        `- 方案: ${result.scheme.toString()}\n` +
        `- 发行者: ${result.issuer}\n` +
        `- 签名: ${result.signature}\n` +
        `- 数据: ${result.data}\n` +
        `- URI: ${result.uri}`
      );
    } catch (error: any) {
      showResult("getClaim", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyHasPurpose = async () => {
    if (!identityAddress || !queryKey || !queryPurpose) {
      showResult("keyHasPurpose", "请填写所有字段并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function keyHasPurpose(bytes32 _key, uint256 _purpose) external view returns (bool exists)",
        ],
        provider
      );
      const keyBytes32 = stringToBytes32(queryKey);
      const hasPurpose = await contract.keyHasPurpose(keyBytes32, queryPurpose);
      showResult("keyHasPurpose", `密钥${hasPurpose ? "具有" : "不具有"}目的 ${queryPurpose}`);
    } catch (error: any) {
      showResult("keyHasPurpose", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleIsClaimValid = async () => {
    if (!identityAddress || !isClaimValidIdentity || !isClaimValidTopic) {
      showResult("isClaimValid", "请填写所有必填字段并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function isClaimValid(address _identity, uint256 claimTopic, bytes memory sig, bytes memory data) external view returns (bool)",
        ],
        provider
      );
      // 处理签名和数据
      let sigBytes = "0x";
      if (isClaimValidSig) {
        if (isClaimValidSig.startsWith("0x")) {
          sigBytes = isClaimValidSig;
        } else {
          try {
            sigBytes = ethers.hexlify(ethers.toUtf8Bytes(isClaimValidSig));
          } catch {
            sigBytes = `0x${isClaimValidSig}`;
          }
        }
      }
      let dataBytes = "0x";
      if (isClaimValidData) {
        if (isClaimValidData.startsWith("0x")) {
          dataBytes = isClaimValidData;
        } else {
          try {
            dataBytes = ethers.hexlify(ethers.toUtf8Bytes(isClaimValidData));
          } catch {
            dataBytes = `0x${isClaimValidData}`;
          }
        }
      }
      const isValid = await contract.isClaimValid(isClaimValidIdentity, isClaimValidTopic, sigBytes, dataBytes);
      showResult("isClaimValid", `声明${isValid ? "有效" : "无效"}`);
    } catch (error: any) {
      showResult("isClaimValid", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecoveredAddress = async () => {
    if (!identityAddress || !recoveredAddressSig || !recoveredAddressDataHash) {
      showResult("getRecoveredAddress", "请填写所有字段并设置Identity合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        identityAddress,
        [
          "function getRecoveredAddress(bytes memory sig, bytes32 dataHash) external pure returns (address)",
        ],
        provider
      );
      // 处理签名
      let sigBytes = "0x";
      if (recoveredAddressSig) {
        if (recoveredAddressSig.startsWith("0x")) {
          sigBytes = recoveredAddressSig;
        } else {
          try {
            sigBytes = ethers.hexlify(ethers.toUtf8Bytes(recoveredAddressSig));
          } catch {
            sigBytes = `0x${recoveredAddressSig}`;
          }
        }
      }
      const dataHashBytes32 = stringToBytes32(recoveredAddressDataHash);
      const address = await contract.getRecoveredAddress(sigBytes, dataHashBytes32);
      showResult("getRecoveredAddress", `恢复的地址: ${address}`);
    } catch (error: any) {
      showResult("getRecoveredAddress", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>用户身份管理面板 (Identity.sol)</h2>

      {/* Identity 合约地址设置 */}
      <div className="section">
        <h3>Identity 合约地址</h3>
        <div className="form-group">
          <label>Identity 合约地址</label>
          <input
            type="text"
            value={identityAddress}
            onChange={(e) => setIdentityAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <div className="form-group">
          <label>通过用户地址查询 (IdentityRegistry)</label>
          <input
            type="text"
            value={queryUserAddress}
            onChange={(e) => setQueryUserAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <div className="button-group">
          <button onClick={handleQueryIdentityAddress} disabled={loading} className="btn-secondary">
            查询Identity地址
          </button>
        </div>
        {results.queryIdentity && (
          <div className={`result ${results.queryIdentity.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
            <pre>{results.queryIdentity}</pre>
          </div>
        )}
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          当前Identity地址: {identityAddress ? (
            <span style={{ fontFamily: "monospace" }}>{identityAddress}</span>
          ) : (
            <span style={{ color: "#999" }}>未设置</span>
          )}
        </div>
      </div>

      {/* Management Key (Purpose 1) 操作 */}
      <div className="section">
        <h3>管理密钥操作 (Management Key - Purpose 1)</h3>
        
        {/* addKey */}
        <div className="subsection">
          <h4>添加密钥 addKey(bytes32 _key, uint256 _purpose, uint256 _type)</h4>
          <div className="form-row">
            <div className="form-group">
              <label>密钥 (bytes32 - hex或字符串)</label>
              <input
                type="text"
                value={keyToAdd}
                onChange={(e) => setKeyToAdd(e.target.value)}
                placeholder="0x... 或 密钥字符串"
              />
            </div>
            <div className="form-group">
              <label>目的 (Purpose)</label>
              <input
                type="text"
                value={purposeToAdd}
                onChange={(e) => setPurposeToAdd(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="form-group">
              <label>类型 (KeyType)</label>
              <input
                type="text"
                value={keyTypeToAdd}
                onChange={(e) => setKeyTypeToAdd(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
          <div className="button-group">
            <button onClick={handleAddKey} disabled={loading} className="btn-primary">
              添加密钥
            </button>
          </div>
          {results.addKey && (
            <div className={`result ${results.addKey.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.addKey}</pre>
            </div>
          )}
        </div>

        {/* removeKey */}
        <div className="subsection">
          <h4>移除密钥 removeKey(bytes32 _key, uint256 _purpose)</h4>
          <div className="form-row">
            <div className="form-group">
              <label>密钥 (bytes32 - hex或字符串)</label>
              <input
                type="text"
                value={keyToRemove}
                onChange={(e) => setKeyToRemove(e.target.value)}
                placeholder="0x... 或 密钥字符串"
              />
            </div>
            <div className="form-group">
              <label>目的 (Purpose)</label>
              <input
                type="text"
                value={purposeToRemove}
                onChange={(e) => setPurposeToRemove(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
          <div className="button-group">
            <button onClick={handleRemoveKey} disabled={loading} className="btn-danger">
              移除密钥
            </button>
          </div>
          {results.removeKey && (
            <div className={`result ${results.removeKey.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.removeKey}</pre>
            </div>
          )}
        </div>

        {/* approve */}
        <div className="subsection">
          <h4>批准执行请求 approve(uint256 _id, bool _approve)</h4>
          <div className="form-row">
            <div className="form-group">
              <label>执行请求ID</label>
              <input
                type="text"
                value={approvalId}
                onChange={(e) => setApprovalId(e.target.value)}
                placeholder="例如: 1"
              />
            </div>
            <div className="form-group">
              <label>批准 (true/false)</label>
              <select
                value={approvalValue}
                onChange={(e) => setApprovalValue(e.target.value)}
              >
                <option value="true">批准</option>
                <option value="false">拒绝</option>
              </select>
            </div>
          </div>
          <div className="button-group">
            <button onClick={handleApprove} disabled={loading} className="btn-primary">
              批准/拒绝
            </button>
          </div>
          {results.approve && (
            <div className={`result ${results.approve.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.approve}</pre>
            </div>
          )}
        </div>

        {/* execute */}
        <div className="subsection">
          <h4>执行操作 execute(address _to, uint256 _value, bytes memory _data)</h4>
          <div className="form-row">
            <div className="form-group">
              <label>目标地址</label>
              <input
                type="text"
                value={executeTo}
                onChange={(e) => setExecuteTo(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="form-group">
              <label>发送金额 (wei)</label>
              <input
                type="text"
                value={executeValue}
                onChange={(e) => setExecuteValue(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="form-group">
            <label>调用数据 (hex)</label>
            <input
              type="text"
              value={executeData}
              onChange={(e) => setExecuteData(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleExecute} disabled={loading} className="btn-primary">
              执行操作
            </button>
          </div>
          {results.execute && (
            <div className={`result ${results.execute.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.execute}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Claim Key (Purpose 3) 操作 */}
      <div className="section">
        <h3>声明密钥操作 (Claim Key - Purpose 3)</h3>
        
        {/* addClaim */}
        <div className="subsection">
          <h4>添加声明 addClaim(uint256 _topic, uint256 _scheme, address _issuer, bytes memory _signature, bytes memory _data, string memory _uri)</h4>
          <div className="form-row">
            <div className="form-group">
              <label>声明主题 (Topic)</label>
              <input
                type="text"
                value={claimTopic}
                onChange={(e) => setClaimTopic(e.target.value)}
                placeholder="例如: 1"
              />
            </div>
            <div className="form-group">
              <label>方案 (Scheme)</label>
              <input
                type="text"
                value={claimScheme}
                onChange={(e) => setClaimScheme(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="form-group">
              <label>发行者地址</label>
              <input
                type="text"
                value={claimIssuer}
                onChange={(e) => setClaimIssuer(e.target.value)}
                placeholder="0x..."
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>签名 (hex)</label>
              <input
                type="text"
                value={claimSignature}
                onChange={(e) => setClaimSignature(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="form-group">
              <label>数据 (hex)</label>
              <input
                type="text"
                value={claimData}
                onChange={(e) => setClaimData(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="form-group">
              <label>URI</label>
              <input
                type="text"
                value={claimUri}
                onChange={(e) => setClaimUri(e.target.value)}
                placeholder="例如: https://..."
              />
            </div>
          </div>
          <div className="button-group">
            <button onClick={handleAddClaim} disabled={loading} className="btn-primary">
              添加声明
            </button>
          </div>
          {results.addClaim && (
            <div className={`result ${results.addClaim.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.addClaim}</pre>
            </div>
          )}
        </div>

        {/* removeClaim */}
        <div className="subsection">
          <h4>移除声明 removeClaim(bytes32 _claimId)</h4>
          <div className="form-group">
            <label>声明ID (bytes32 - hex或字符串)</label>
            <input
              type="text"
              value={claimIdToRemove}
              onChange={(e) => setClaimIdToRemove(e.target.value)}
              placeholder="0x... 或 声明ID字符串"
            />
          </div>
          <div className="button-group">
            <button onClick={handleRemoveClaim} disabled={loading} className="btn-danger">
              移除声明
            </button>
          </div>
          {results.removeClaim && (
            <div className={`result ${results.removeClaim.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.removeClaim}</pre>
            </div>
          )}
        </div>
      </div>

      {/* View 函数 */}
      <div className="section">
        <h3>查询函数 (View Functions)</h3>
        
        {/* getKey */}
        <div className="subsection">
          <h4>获取密钥信息 getKey(bytes32 _key)</h4>
          <div className="form-group">
            <label>密钥 (bytes32 - hex或字符串)</label>
            <input
              type="text"
              value={queryKey}
              onChange={(e) => setQueryKey(e.target.value)}
              placeholder="0x... 或 密钥字符串"
            />
          </div>
          <div className="button-group">
            <button onClick={handleGetKey} disabled={loading} className="btn-secondary">
              查询密钥
            </button>
          </div>
          {results.getKey && (
            <div className={`result ${results.getKey.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.getKey}</pre>
            </div>
          )}
        </div>

        {/* getKeyPurposes */}
        <div className="subsection">
          <h4>获取密钥目的 getKeyPurposes(bytes32 _key)</h4>
          <div className="form-group">
            <label>密钥 (bytes32 - hex或字符串)</label>
            <input
              type="text"
              value={queryKey}
              onChange={(e) => setQueryKey(e.target.value)}
              placeholder="0x... 或 密钥字符串"
            />
          </div>
          <div className="button-group">
            <button onClick={handleGetKeyPurposes} disabled={loading} className="btn-secondary">
              查询密钥目的
            </button>
          </div>
          {results.getKeyPurposes && (
            <div className={`result ${results.getKeyPurposes.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.getKeyPurposes}</pre>
            </div>
          )}
        </div>

        {/* getKeysByPurpose */}
        <div className="subsection">
          <h4>按目的查询密钥 getKeysByPurpose(uint256 _purpose)</h4>
          <div className="form-group">
            <label>目的 (Purpose)</label>
            <input
              type="text"
              value={queryPurpose}
              onChange={(e) => setQueryPurpose(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="button-group">
            <button onClick={handleGetKeysByPurpose} disabled={loading} className="btn-secondary">
              查询密钥
            </button>
          </div>
          {results.getKeysByPurpose && (
            <div className={`result ${results.getKeysByPurpose.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.getKeysByPurpose}</pre>
            </div>
          )}
        </div>

        {/* getClaimIdsByTopic */}
        <div className="subsection">
          <h4>按主题查询声明ID getClaimIdsByTopic(uint256 _topic)</h4>
          <div className="form-group">
            <label>声明主题 (Topic)</label>
            <input
              type="text"
              value={queryClaimTopic}
              onChange={(e) => setQueryClaimTopic(e.target.value)}
              placeholder="例如: 1"
            />
          </div>
          <div className="button-group">
            <button onClick={handleGetClaimIdsByTopic} disabled={loading} className="btn-secondary">
              查询声明ID
            </button>
          </div>
          {results.getClaimIdsByTopic && (
            <div className={`result ${results.getClaimIdsByTopic.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.getClaimIdsByTopic}</pre>
            </div>
          )}
        </div>

        {/* getClaim */}
        <div className="subsection">
          <h4>获取声明信息 getClaim(bytes32 _claimId)</h4>
          <div className="form-group">
            <label>声明ID (bytes32 - hex或字符串)</label>
            <input
              type="text"
              value={queryClaimId}
              onChange={(e) => setQueryClaimId(e.target.value)}
              placeholder="0x... 或 声明ID字符串"
            />
          </div>
          <div className="button-group">
            <button onClick={handleGetClaim} disabled={loading} className="btn-secondary">
              查询声明
            </button>
          </div>
          {results.getClaim && (
            <div className={`result ${results.getClaim.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.getClaim}</pre>
            </div>
          )}
        </div>

        {/* keyHasPurpose */}
        <div className="subsection">
          <h4>检查密钥目的 keyHasPurpose(bytes32 _key, uint256 _purpose)</h4>
          <div className="form-row">
            <div className="form-group">
              <label>密钥 (bytes32)</label>
              <input
                type="text"
                value={queryKey}
                onChange={(e) => setQueryKey(e.target.value)}
                placeholder="密钥字符串"
              />
            </div>
            <div className="form-group">
              <label>目的 (Purpose)</label>
              <input
                type="text"
                value={queryPurpose}
                onChange={(e) => setQueryPurpose(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
          <div className="button-group">
            <button onClick={handleKeyHasPurpose} disabled={loading} className="btn-secondary">
              检查目的
            </button>
          </div>
          {results.keyHasPurpose && (
            <div className={`result ${results.keyHasPurpose.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.keyHasPurpose}</pre>
            </div>
          )}
        </div>

        {/* isClaimValid */}
        <div className="subsection">
          <h4>验证声明有效性 isClaimValid(address _identity, uint256 claimTopic, bytes memory sig, bytes memory data)</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Identity地址</label>
              <input
                type="text"
                value={isClaimValidIdentity}
                onChange={(e) => setIsClaimValidIdentity(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="form-group">
              <label>声明主题</label>
              <input
                type="text"
                value={isClaimValidTopic}
                onChange={(e) => setIsClaimValidTopic(e.target.value)}
                placeholder="例如: 1"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>签名 (hex)</label>
              <input
                type="text"
                value={isClaimValidSig}
                onChange={(e) => setIsClaimValidSig(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="form-group">
              <label>数据 (hex)</label>
              <input
                type="text"
                value={isClaimValidData}
                onChange={(e) => setIsClaimValidData(e.target.value)}
                placeholder="0x..."
              />
            </div>
          </div>
          <div className="button-group">
            <button onClick={handleIsClaimValid} disabled={loading} className="btn-secondary">
              验证声明
            </button>
          </div>
          {results.isClaimValid && (
            <div className={`result ${results.isClaimValid.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.isClaimValid}</pre>
            </div>
          )}
        </div>

        {/* getRecoveredAddress */}
        <div className="subsection">
          <h4>从签名恢复地址 getRecoveredAddress(bytes memory sig, bytes32 dataHash)</h4>
          <div className="form-group">
            <label>签名 (hex)</label>
            <input
              type="text"
              value={recoveredAddressSig}
              onChange={(e) => setRecoveredAddressSig(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>数据哈希 (bytes32 - hex或字符串)</label>
            <input
              type="text"
              value={recoveredAddressDataHash}
              onChange={(e) => setRecoveredAddressDataHash(e.target.value)}
              placeholder="0x... 或 数据哈希字符串"
            />
          </div>
          <div className="button-group">
            <button onClick={handleGetRecoveredAddress} disabled={loading} className="btn-secondary">
              恢复地址
            </button>
          </div>
          {results.getRecoveredAddress && (
            <div className={`result ${results.getRecoveredAddress.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.getRecoveredAddress}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

