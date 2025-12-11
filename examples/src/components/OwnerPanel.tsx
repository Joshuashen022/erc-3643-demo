import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../utils/config";
import MultiTransactionModal from "./MultiTransactionModal";

interface OwnerPanelProps {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Signer;
  account: string;
  setRoleChoose: (value: boolean) => void;
}

export default function OwnerPanel({ provider, wallet, account, setRoleChoose }: OwnerPanelProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [showValidateDeployment, setShowValidateDeployment] = useState(false);
  
  // Owner 检查状态
  const [ownerStatus, setOwnerStatus] = useState<Record<string, { isOwner: boolean | null; checking: boolean }>>({
    token: { isOwner: null, checking: false },
    identityRegistry: { isOwner: null, checking: false },
    identityRegistryStorage: { isOwner: null, checking: false },
    trexImplementationAuthority: { isOwner: null, checking: false },
    trexGateway: { isOwner: null, checking: false },
    trexFactory: { isOwner: null, checking: false },
  });

  // Token 状态
  const [identityRegistry, setIdentityRegistry] = useState("");
  const [compliance, setCompliance] = useState("");

  // IdentityRegistry 状态
  const [identityRegistryStorage, setIdentityRegistryStorage] = useState("");
  const [claimTopicsRegistryForIR, setClaimTopicsRegistryForIR] = useState("");
  const [trustedIssuersRegistryForIR, setTrustedIssuersRegistryForIR] = useState("");
  const [agentToAdd, setAgentToAdd] = useState("");
  const [agentToRemove, setAgentToRemove] = useState("");

  // TREXImplementationAuthority 状态
  const [trexFactory, setTrexFactory] = useState("");
  const [iaFactory, setIaFactory] = useState("");
  const [versionToAdd, setVersionToAdd] = useState("");
  const [trexContractsData, setTrexContractsData] = useState("");
  const [versionToUse, setVersionToUse] = useState("");

  // TREXGateway 状态
  const [gatewayFactory, setGatewayFactory] = useState("");
  const [publicDeploymentStatus, setPublicDeploymentStatus] = useState("");
  const [newFactoryOwnerForGateway, setNewFactoryOwnerForGateway] = useState("");
  const [deploymentFeeEnabled, setDeploymentFeeEnabled] = useState("");
  const [deploymentFee, setDeploymentFee] = useState("");
  const [feeToken, setFeeToken] = useState("");
  const [feeCollector, setFeeCollector] = useState("");
  const [agentToAddForGateway, setAgentToAddForGateway] = useState("");
  const [agentToRemoveForGateway, setAgentToRemoveForGateway] = useState("");
  const [deployerToAdd, setDeployerToAdd] = useState("");
  const [deployerToRemove, setDeployerToRemove] = useState("");
  const [deployersToAddBatch, setDeployersToAddBatch] = useState("");
  const [deployersToRemoveBatch, setDeployersToRemoveBatch] = useState("");
  const [deployerForDiscount, setDeployerForDiscount] = useState("");
  const [discount, setDiscount] = useState("");
  const [deployersForDiscountBatch, setDeployersForDiscountBatch] = useState("");
  const [discountsBatch, setDiscountsBatch] = useState("");

  // TREXFactory 状态
  const [saltForDeploy, setSaltForDeploy] = useState("");
  const [tokenOwner, setTokenOwner] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState("");
  const [irsAddress, setIrsAddress] = useState("");
  const [onchainId, setOnchainId] = useState("");
  const [irAgents, setIrAgents] = useState("");
  const [tokenAgents, setTokenAgents] = useState("");
  const [complianceModules, setComplianceModules] = useState("");
  const [complianceSettings, setComplianceSettings] = useState("");
  const [claimTopicsForDeploy, setClaimTopicsForDeploy] = useState("");
  const [issuers, setIssuers] = useState("");
  const [issuerClaims, setIssuerClaims] = useState("");
  const [contractToRecover, setContractToRecover] = useState("");
  const [newOwnerForRecover, setNewOwnerForRecover] = useState("");
  const [implementationAuthority, setImplementationAuthority] = useState("");
  const [idFactory, setIdFactory] = useState("");

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

    checkOwnerRole("token", CONTRACT_ADDRESSES.token);
    checkOwnerRole("identityRegistry", CONTRACT_ADDRESSES.identityRegistry);
    checkOwnerRole("identityRegistryStorage", CONTRACT_ADDRESSES.identityRegistryStorage);
    checkOwnerRole("trexImplementationAuthority", CONTRACT_ADDRESSES.trexImplementationAuthority);
    checkOwnerRole("trexGateway", CONTRACT_ADDRESSES.trexGateway);
    checkOwnerRole("trexFactory", CONTRACT_ADDRESSES.trexFactory);
  }, [account, provider]);

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

  // IdentityRegistry 操作
  const handleSetIdentityRegistryStorage = async () => {
    if (!identityRegistryStorage || !CONTRACT_ADDRESSES.identityRegistry) {
      showResult("setIdentityRegistryStorage", "请填写身份注册表存储地址并配置 IdentityRegistry 合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.identityRegistry,
        [
          "function setIdentityRegistryStorage(address _identityRegistryStorage) external",
        ],
        wallet
      );
      const tx = await contract.setIdentityRegistryStorage(identityRegistryStorage);
      await tx.wait();
      showResult("setIdentityRegistryStorage", `成功设置身份注册表存储，交易哈希: ${tx.hash}`);
      setIdentityRegistryStorage("");
    } catch (error: any) {
      showResult("setIdentityRegistryStorage", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetClaimTopicsRegistry = async () => {
    if (!claimTopicsRegistryForIR || !CONTRACT_ADDRESSES.identityRegistry) {
      showResult("setClaimTopicsRegistry", "请填写声明主题注册表地址并配置 IdentityRegistry 合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.identityRegistry,
        [
          "function setClaimTopicsRegistry(address _claimTopicsRegistry) external",
        ],
        wallet
      );
      const tx = await contract.setClaimTopicsRegistry(claimTopicsRegistryForIR);
      await tx.wait();
      showResult("setClaimTopicsRegistry", `成功设置声明主题注册表，交易哈希: ${tx.hash}`);
      setClaimTopicsRegistryForIR("");
    } catch (error: any) {
      showResult("setClaimTopicsRegistry", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetTrustedIssuersRegistry = async () => {
    if (!trustedIssuersRegistryForIR || !CONTRACT_ADDRESSES.identityRegistry) {
      showResult("setTrustedIssuersRegistry", "请填写可信发行者注册表地址并配置 IdentityRegistry 合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.identityRegistry,
        [
          "function setTrustedIssuersRegistry(address _trustedIssuersRegistry) external",
        ],
        wallet
      );
      const tx = await contract.setTrustedIssuersRegistry(trustedIssuersRegistryForIR);
      await tx.wait();
      showResult("setTrustedIssuersRegistry", `成功设置可信发行者注册表，交易哈希: ${tx.hash}`);
      setTrustedIssuersRegistryForIR("");
    } catch (error: any) {
      showResult("setTrustedIssuersRegistry", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async () => {
    if (!agentToAdd || !CONTRACT_ADDRESSES.identityRegistry) {
      showResult("addAgent", "请填写 Agent 地址并配置 IdentityRegistry 合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.identityRegistry,
        [
          "function addAgent(address _agent) external",
        ],
        wallet
      );
      const tx = await contract.addAgent(agentToAdd);
      await tx.wait();
      showResult("addAgent", `成功添加 Agent，交易哈希: ${tx.hash}`);
      setAgentToAdd("");
    } catch (error: any) {
      showResult("addAgent", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAgent = async () => {
    if (!agentToRemove || !CONTRACT_ADDRESSES.identityRegistry) {
      showResult("removeAgent", "请填写 Agent 地址并配置 IdentityRegistry 合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.identityRegistry,
        [
          "function removeAgent(address _agent) external",
        ],
        wallet
      );
      const tx = await contract.removeAgent(agentToRemove);
      await tx.wait();
      showResult("removeAgent", `成功移除 Agent，交易哈希: ${tx.hash}`);
      setAgentToRemove("");
    } catch (error: any) {
      showResult("removeAgent", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // TREXImplementationAuthority 操作
  const handleSetTrexFactory = async () => {
    if (!trexFactory || !CONTRACT_ADDRESSES.trexImplementationAuthority) {
      showResult("setTrexFactory", "请填写 TREXFactory 地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexImplementationAuthority,
        [
          "function setTREXFactory(address trexFactory) external",
        ],
        wallet
      );
      const tx = await contract.setTREXFactory(trexFactory);
      await tx.wait();
      showResult("setTrexFactory", `成功设置 TREXFactory，交易哈希: ${tx.hash}`);
      setTrexFactory("");
    } catch (error: any) {
      showResult("setTrexFactory", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetIAFactory = async () => {
    if (!iaFactory || !CONTRACT_ADDRESSES.trexImplementationAuthority) {
      showResult("setIAFactory", "请填写 IA Factory 地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexImplementationAuthority,
        [
          "function setIAFactory(address iaFactory) external",
        ],
        wallet
      );
      const tx = await contract.setIAFactory(iaFactory);
      await tx.wait();
      showResult("setIAFactory", `成功设置 IA Factory，交易哈希: ${tx.hash}`);
      setIaFactory("");
    } catch (error: any) {
      showResult("setIAFactory", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrexVersion = async () => {
    if (!versionToAdd || !trexContractsData || !CONTRACT_ADDRESSES.trexImplementationAuthority) {
      showResult("addTrexVersion", "请填写版本和合约数据并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      // 解析版本和合约数据
      // 版本格式: major,minor,patch (例如: 1,0,0)
      // TREXContracts 数据格式: token,ctr,ir,irs,tir,mc (逗号分隔的地址)
      const versionParts = versionToAdd.split(",").map((v) => v.trim());
      if (versionParts.length !== 3) {
        showResult("addTrexVersion", "版本格式错误，应为: major,minor,patch (例如: 1,0,0)");
        setLoading(false);
        return;
      }

      const contractParts = trexContractsData.split(",").map((c) => c.trim());
      if (contractParts.length !== 6) {
        showResult("addTrexVersion", "合约数据格式错误，应为: token,ctr,ir,irs,tir,mc (6个地址，逗号分隔)");
        setLoading(false);
        return;
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexImplementationAuthority,
        [
          "function addTREXVersion((uint8,uint8,uint8) _version, (address,address,address,address,address,address) _trex) external",
        ],
        wallet
      );
      const version = [
        parseInt(versionParts[0]),
        parseInt(versionParts[1]),
        parseInt(versionParts[2]),
      ];
      const trex = [
        contractParts[0], // tokenImplementation
        contractParts[1], // ctrImplementation
        contractParts[2], // irImplementation
        contractParts[3], // irsImplementation
        contractParts[4], // tirImplementation
        contractParts[5], // mcImplementation
      ];
      const tx = await contract.addTREXVersion(version, trex);
      await tx.wait();
      showResult("addTrexVersion", `成功添加 TREX 版本，交易哈希: ${tx.hash}`);
      setVersionToAdd("");
      setTrexContractsData("");
    } catch (error: any) {
      showResult("addTrexVersion", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTrexVersion = async () => {
    if (!versionToUse || !CONTRACT_ADDRESSES.trexImplementationAuthority) {
      showResult("useTrexVersion", "请填写版本并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const versionParts = versionToUse.split(",").map((v) => v.trim());
      if (versionParts.length !== 3) {
        showResult("useTrexVersion", "版本格式错误，应为: major,minor,patch (例如: 1,0,0)");
        setLoading(false);
        return;
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexImplementationAuthority,
        [
          "function useTREXVersion((uint8,uint8,uint8) _version) external",
        ],
        wallet
      );
      const version = [
        parseInt(versionParts[0]),
        parseInt(versionParts[1]),
        parseInt(versionParts[2]),
      ];
      const tx = await contract.useTREXVersion(version);
      await tx.wait();
      showResult("useTrexVersion", `成功切换 TREX 版本，交易哈希: ${tx.hash}`);
      setVersionToUse("");
    } catch (error: any) {
      showResult("useTrexVersion", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // TREXGateway 操作
  const handleSetGatewayFactory = async () => {
    if (!gatewayFactory || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("setGatewayFactory", "请填写 TREXFactory 地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function setFactory(address factory) external",
        ],
        wallet
      );
      const tx = await contract.setFactory(gatewayFactory);
      await tx.wait();
      showResult("setGatewayFactory", `成功设置 TREXFactory，交易哈希: ${tx.hash}`);
      setGatewayFactory("");
    } catch (error: any) {
      showResult("setGatewayFactory", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPublicDeploymentStatus = async () => {
    if (publicDeploymentStatus === "" || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("setPublicDeploymentStatus", "请选择状态并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const isEnabled = publicDeploymentStatus === "true";
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function setPublicDeploymentStatus(bool _isEnabled) external",
        ],
        wallet
      );
      const tx = await contract.setPublicDeploymentStatus(isEnabled);
      await tx.wait();
      showResult("setPublicDeploymentStatus", `成功设置公开部署状态，交易哈希: ${tx.hash}`);
      setPublicDeploymentStatus("");
    } catch (error: any) {
      showResult("setPublicDeploymentStatus", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferFactoryOwnershipForGateway = async () => {
    if (!newFactoryOwnerForGateway || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("transferFactoryOwnershipForGateway", "请填写新所有者地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function transferFactoryOwnership(address _newOwner) external",
        ],
        wallet
      );
      const tx = await contract.transferFactoryOwnership(newFactoryOwnerForGateway);
      await tx.wait();
      showResult("transferFactoryOwnershipForGateway", `成功转移工厂所有权，交易哈希: ${tx.hash}`);
      setNewFactoryOwnerForGateway("");
    } catch (error: any) {
      showResult("transferFactoryOwnershipForGateway", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableDeploymentFee = async () => {
    if (deploymentFeeEnabled === "" || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("enableDeploymentFee", "请选择状态并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const isEnabled = deploymentFeeEnabled === "true";
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function enableDeploymentFee(bool _isEnabled) external",
        ],
        wallet
      );
      const tx = await contract.enableDeploymentFee(isEnabled);
      await tx.wait();
      showResult("enableDeploymentFee", `成功${isEnabled ? "启用" : "禁用"}部署费用，交易哈希: ${tx.hash}`);
      setDeploymentFeeEnabled("");
    } catch (error: any) {
      showResult("enableDeploymentFee", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDeploymentFee = async () => {
    if (!deploymentFee || !feeToken || !feeCollector || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("setDeploymentFee", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function setDeploymentFee(uint256 _fee, address _feeToken, address _feeCollector) external",
        ],
        wallet
      );
      const tx = await contract.setDeploymentFee(deploymentFee, feeToken, feeCollector);
      await tx.wait();
      showResult("setDeploymentFee", `成功设置部署费用，交易哈希: ${tx.hash}`);
      setDeploymentFee("");
      setFeeToken("");
      setFeeCollector("");
    } catch (error: any) {
      showResult("setDeploymentFee", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgentForGateway = async () => {
    if (!agentToAddForGateway || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("addAgentForGateway", "请填写 Agent 地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function addAgent(address _agent) external",
        ],
        wallet
      );
      const tx = await contract.addAgent(agentToAddForGateway);
      await tx.wait();
      showResult("addAgentForGateway", `成功添加 Agent，交易哈希: ${tx.hash}`);
      setAgentToAddForGateway("");
    } catch (error: any) {
      showResult("addAgentForGateway", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAgentForGateway = async () => {
    if (!agentToRemoveForGateway || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("removeAgentForGateway", "请填写 Agent 地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function removeAgent(address _agent) external",
        ],
        wallet
      );
      const tx = await contract.removeAgent(agentToRemoveForGateway);
      await tx.wait();
      showResult("removeAgentForGateway", `成功移除 Agent，交易哈希: ${tx.hash}`);
      setAgentToRemoveForGateway("");
    } catch (error: any) {
      showResult("removeAgentForGateway", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeployer = async () => {
    if (!deployerToAdd || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("addDeployer", "请填写部署者地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function addDeployer(address deployer) external",
        ],
        wallet
      );
      const tx = await contract.addDeployer(deployerToAdd);
      await tx.wait();
      showResult("addDeployer", `成功添加部署者，交易哈希: ${tx.hash}`);
      setDeployerToAdd("");
    } catch (error: any) {
      showResult("addDeployer", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDeployer = async () => {
    if (!deployerToRemove || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("removeDeployer", "请填写部署者地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function removeDeployer(address deployer) external",
        ],
        wallet
      );
      const tx = await contract.removeDeployer(deployerToRemove);
      await tx.wait();
      showResult("removeDeployer", `成功移除部署者，交易哈希: ${tx.hash}`);
      setDeployerToRemove("");
    } catch (error: any) {
      showResult("removeDeployer", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchAddDeployer = async () => {
    if (!deployersToAddBatch || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("batchAddDeployer", "请填写部署者地址列表并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const deployersArray = deployersToAddBatch.split(",").map((d) => d.trim());
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function batchAddDeployer(address[] calldata deployers) external",
        ],
        wallet
      );
      const tx = await contract.batchAddDeployer(deployersArray);
      await tx.wait();
      showResult("batchAddDeployer", `成功批量添加部署者，交易哈希: ${tx.hash}`);
      setDeployersToAddBatch("");
    } catch (error: any) {
      showResult("batchAddDeployer", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchRemoveDeployer = async () => {
    if (!deployersToRemoveBatch || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("batchRemoveDeployer", "请填写部署者地址列表并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const deployersArray = deployersToRemoveBatch.split(",").map((d) => d.trim());
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function batchRemoveDeployer(address[] calldata deployers) external",
        ],
        wallet
      );
      const tx = await contract.batchRemoveDeployer(deployersArray);
      await tx.wait();
      showResult("batchRemoveDeployer", `成功批量移除部署者，交易哈希: ${tx.hash}`);
      setDeployersToRemoveBatch("");
    } catch (error: any) {
      showResult("batchRemoveDeployer", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFeeDiscount = async () => {
    if (!deployerForDiscount || !discount || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("applyFeeDiscount", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const discountValue = parseInt(discount);
      if (discountValue > 10000) {
        showResult("applyFeeDiscount", "折扣不能超过 10000 (100%)");
        setLoading(false);
        return;
      }
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function applyFeeDiscount(address deployer, uint16 discount) external",
        ],
        wallet
      );
      const tx = await contract.applyFeeDiscount(deployerForDiscount, discountValue);
      await tx.wait();
      showResult("applyFeeDiscount", `成功应用费用折扣，交易哈希: ${tx.hash}`);
      setDeployerForDiscount("");
      setDiscount("");
    } catch (error: any) {
      showResult("applyFeeDiscount", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchApplyFeeDiscount = async () => {
    if (!deployersForDiscountBatch || !discountsBatch || !CONTRACT_ADDRESSES.trexGateway) {
      showResult("batchApplyFeeDiscount", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const deployersArray = deployersForDiscountBatch.split(",").map((d) => d.trim());
      const discountsArray = discountsBatch.split(",").map((d) => parseInt(d.trim()));
      if (deployersArray.length !== discountsArray.length) {
        showResult("batchApplyFeeDiscount", "部署者数量和折扣数量必须相同");
        setLoading(false);
        return;
      }
      if (discountsArray.some((d) => d > 10000)) {
        showResult("batchApplyFeeDiscount", "折扣不能超过 10000 (100%)");
        setLoading(false);
        return;
      }
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexGateway,
        [
          "function batchApplyFeeDiscount(address[] calldata deployers, uint16[] calldata discounts) external",
        ],
        wallet
      );
      const tx = await contract.batchApplyFeeDiscount(deployersArray, discountsArray);
      await tx.wait();
      showResult("batchApplyFeeDiscount", `成功批量应用费用折扣，交易哈希: ${tx.hash}`);
      setDeployersForDiscountBatch("");
      setDiscountsBatch("");
    } catch (error: any) {
      showResult("batchApplyFeeDiscount", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // TREXFactory 操作
  const handleDeployTREXSuite = async () => {
    if (!saltForDeploy || !tokenOwner || !tokenName || !tokenSymbol || !tokenDecimals || !CONTRACT_ADDRESSES.trexFactory) {
      showResult("deployTREXSuite", "请填写所有必需字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      // 解析数组字段
      const irAgentsArray = irAgents ? irAgents.split(",").map((a) => a.trim()).filter((a) => a) : [];
      const tokenAgentsArray = tokenAgents ? tokenAgents.split(",").map((a) => a.trim()).filter((a) => a) : [];
      const complianceModulesArray = complianceModules ? complianceModules.split(",").map((m) => m.trim()).filter((m) => m) : [];
      const complianceSettingsArray = complianceSettings ? complianceSettings.split("|").map((s) => s.trim()).filter((s) => s) : [];
      
      // 解析 ClaimDetails
      const claimTopicsArray = claimTopicsForDeploy 
        ? claimTopicsForDeploy.split(",").map((t) => t.trim()).filter((t) => t).map((t) => ethers.toBigInt(t))
        : [];
      const issuersArray = issuers 
        ? issuers.split(",").map((i) => i.trim()).filter((i) => i)
        : [];
      
      // 解析 issuerClaims (二维数组，格式: "1,2,3|4,5|6" 表示第一个发行者有1,2,3，第二个有4,5，第三个有6)
      const issuerClaimsArray: bigint[][] = issuerClaims
        ? issuerClaims.split("|").map((p) => p.trim()).filter((p) => p).map((part) => 
            part.split(",").map((c) => c.trim()).filter((c) => c).map((c) => ethers.toBigInt(c))
          )
        : [];

      // 构建 TokenDetails
      const tokenDetails = {
        owner: tokenOwner,
        name: tokenName,
        symbol: tokenSymbol,
        decimals: parseInt(tokenDecimals),
        irs: irsAddress || ethers.ZeroAddress,
        ONCHAINID: onchainId || ethers.ZeroAddress,
        irAgents: irAgentsArray,
        tokenAgents: tokenAgentsArray,
        complianceModules: complianceModulesArray,
        complianceSettings: complianceSettingsArray,
      };

      // 构建 ClaimDetails
      const claimDetails = {
        claimTopics: claimTopicsArray,
        issuers: issuersArray,
        issuerClaims: issuerClaimsArray,
      };

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexFactory,
        [
          "function deployTREXSuite(string memory _salt, tuple(address owner, string name, string symbol, uint8 decimals, address irs, address ONCHAINID, address[] irAgents, address[] tokenAgents, address[] complianceModules, bytes[] complianceSettings) _tokenDetails, tuple(uint256[] claimTopics, address[] issuers, uint256[][] issuerClaims) _claimDetails) external",
        ],
        wallet
      );
      const tx = await contract.deployTREXSuite(saltForDeploy, tokenDetails, claimDetails);
      await tx.wait();
      showResult("deployTREXSuite", `成功部署 TREX 套件，交易哈希: ${tx.hash}`);
      // 清空所有字段
      setSaltForDeploy("");
      setTokenOwner("");
      setTokenName("");
      setTokenSymbol("");
      setTokenDecimals("");
      setIrsAddress("");
      setOnchainId("");
      setIrAgents("");
      setTokenAgents("");
      setComplianceModules("");
      setComplianceSettings("");
      setClaimTopicsForDeploy("");
      setIssuers("");
      setIssuerClaims("");
    } catch (error: any) {
      showResult("deployTREXSuite", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverContractOwnership = async () => {
    if (!contractToRecover || !newOwnerForRecover || !CONTRACT_ADDRESSES.trexFactory) {
      showResult("recoverContractOwnership", "请填写所有字段并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexFactory,
        [
          "function recoverContractOwnership(address _contract, address _newOwner) external",
        ],
        wallet
      );
      const tx = await contract.recoverContractOwnership(contractToRecover, newOwnerForRecover);
      await tx.wait();
      showResult("recoverContractOwnership", `成功恢复合约所有权，交易哈希: ${tx.hash}`);
      setContractToRecover("");
      setNewOwnerForRecover("");
    } catch (error: any) {
      showResult("recoverContractOwnership", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetImplementationAuthority = async () => {
    if (!implementationAuthority || !CONTRACT_ADDRESSES.trexFactory) {
      showResult("setImplementationAuthority", "请填写实现授权地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexFactory,
        [
          "function setImplementationAuthority(address _implementationAuthority) external",
        ],
        wallet
      );
      const tx = await contract.setImplementationAuthority(implementationAuthority);
      await tx.wait();
      showResult("setImplementationAuthority", `成功设置实现授权，交易哈希: ${tx.hash}`);
      setImplementationAuthority("");
    } catch (error: any) {
      showResult("setImplementationAuthority", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetIdFactory = async () => {
    if (!idFactory || !CONTRACT_ADDRESSES.trexFactory) {
      showResult("setIdFactory", "请填写身份工厂地址并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexFactory,
        [
          "function setIdFactory(address _idFactory) external",
        ],
        wallet
      );
      const tx = await contract.setIdFactory(idFactory);
      await tx.wait();
      showResult("setIdFactory", `成功设置身份工厂，交易哈希: ${tx.hash}`);
      setIdFactory("");
    } catch (error: any) {
      showResult("setIdFactory", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetImplementationAuthority = async () => {
    if (!CONTRACT_ADDRESSES.trexFactory) {
      showResult("getImplementationAuthority", "请配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexFactory,
        [
          "function getImplementationAuthority() external view returns (address)",
        ],
        provider
      );
      const address = await contract.getImplementationAuthority();
      showResult("getImplementationAuthority", `实现授权地址: ${address}`);
    } catch (error: any) {
      showResult("getImplementationAuthority", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetIdFactory = async () => {
    if (!CONTRACT_ADDRESSES.trexFactory) {
      showResult("getIdFactory", "请配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexFactory,
        [
          "function getIdFactory() external view returns (address)",
        ],
        provider
      );
      const address = await contract.getIdFactory();
      showResult("getIdFactory", `身份工厂地址: ${address}`);
    } catch (error: any) {
      showResult("getIdFactory", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetToken = async () => {
    if (!saltForDeploy || !CONTRACT_ADDRESSES.trexFactory) {
      showResult("getToken", "请填写 salt 并配置合约地址");
      return;
    }

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.trexFactory,
        [
          "function getToken(string calldata _salt) external view returns (address)",
        ],
        provider
      );
      const address = await contract.getToken(saltForDeploy);
      showResult("getToken", `代币地址: ${address}`);
    } catch (error: any) {
      showResult("getToken", `错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateDeployment = async () => {
    if (!provider || !wallet) {
      alert("请先连接钱包");
      return;
    }
    setShowValidateDeployment(true);
  };

  return (
    <div className="panel">
      {/* 验证部署多步骤流程模态框 */}
      <MultiTransactionModal
        isOpen={showValidateDeployment}
        onClose={() => {
          setShowValidateDeployment(false);
        }}
        isLoading={loading}
        provider={provider}
        wallet={wallet}
        title="验证部署"
      />
      <div className="panel-header">
        <h2 className="panel-title">Owner 管理面板</h2>
        <div className="panel-actions">
          <button
            onClick={handleValidateDeployment}
            disabled={loading}
            className="example-button"
          >
            <span style={{ fontSize: "16px", lineHeight: 1 }}>✓</span>
            <span>验证部署</span>
          </button>
          <button
            onClick={() => setRoleChoose(false)}
            className="btn-secondary"
          >
            返回角色选择
          </button>
        </div>
      </div>

      {/* IdentityRegistry */}
      <div className="section">
        <h3>身份注册表管理 (IdentityRegistry)</h3>
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          {ownerStatus.identityRegistry.checking ? (
            <div style={{ color: "#666", fontSize: "0.875rem" }}>正在检查 owner 角色...</div>
          ) : ownerStatus.identityRegistry.isOwner === null ? (
            <div style={{ color: "#999", fontSize: "0.875rem" }}>无法检查 owner 角色（请确保已配置合约地址）</div>
          ) : ownerStatus.identityRegistry.isOwner ? (
            <div style={{ color: "#28a745", fontSize: "0.875rem", fontWeight: "500" }}>
              ✓ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 是 Owner 角色
            </div>
          ) : (
            <div style={{ color: "#dc3545", fontSize: "0.875rem", fontWeight: "500" }}>
              ✗ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 不是 Owner 角色
            </div>
          )}
        </div>
        
        {/* 设置身份注册表存储 */}
        <div className="subsection">
          <h4>设置身份注册表存储 setIdentityRegistryStorage(address _identityRegistryStorage)</h4>
          <div className="form-group">
            <label>身份注册表存储地址</label>
            <input
              type="text"
              value={identityRegistryStorage}
              onChange={(e) => setIdentityRegistryStorage(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleSetIdentityRegistryStorage} disabled={loading} className="btn-primary">
              设置身份注册表存储
            </button>
          </div>
          {results.setIdentityRegistryStorage && (
            <div className={`result ${results.setIdentityRegistryStorage.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.setIdentityRegistryStorage}</pre>
            </div>
          )}
        </div>

        {/* 设置声明主题注册表 */}
        <div className="subsection">
          <h4>设置声明主题注册表 setClaimTopicsRegistry(address _claimTopicsRegistry)</h4>
          <div className="form-group">
            <label>声明主题注册表地址</label>
            <input
              type="text"
              value={claimTopicsRegistryForIR}
              onChange={(e) => setClaimTopicsRegistryForIR(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleSetClaimTopicsRegistry} disabled={loading} className="btn-primary">
              设置声明主题注册表
            </button>
          </div>
          {results.setClaimTopicsRegistry && (
            <div className={`result ${results.setClaimTopicsRegistry.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.setClaimTopicsRegistry}</pre>
            </div>
          )}
        </div>

        {/* 设置可信发行者注册表 */}
        <div className="subsection">
          <h4>设置可信发行者注册表 setTrustedIssuersRegistry(address _trustedIssuersRegistry)</h4>
          <div className="form-group">
            <label>可信发行者注册表地址</label>
            <input
              type="text"
              value={trustedIssuersRegistryForIR}
              onChange={(e) => setTrustedIssuersRegistryForIR(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleSetTrustedIssuersRegistry} disabled={loading} className="btn-primary">
              设置可信发行者注册表
            </button>
          </div>
          {results.setTrustedIssuersRegistry && (
            <div className={`result ${results.setTrustedIssuersRegistry.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.setTrustedIssuersRegistry}</pre>
            </div>
          )}
        </div>

        {/* 添加 Agent */}
        <div className="subsection">
          <h4>添加 Agent addAgent(address _agent)</h4>
          <div className="form-group">
            <label>Agent 地址</label>
            <input
              type="text"
              value={agentToAdd}
              onChange={(e) => setAgentToAdd(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleAddAgent} disabled={loading} className="btn-primary">
              添加 Agent
            </button>
          </div>
          {results.addAgent && (
            <div className={`result ${results.addAgent.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.addAgent}</pre>
            </div>
          )}
        </div>

        {/* 移除 Agent */}
        <div className="subsection">
          <h4>移除 Agent removeAgent(address _agent)</h4>
          <div className="form-group">
            <label>Agent 地址</label>
            <input
              type="text"
              value={agentToRemove}
              onChange={(e) => setAgentToRemove(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleRemoveAgent} disabled={loading} className="btn-danger">
              移除 Agent
            </button>
          </div>
          {results.removeAgent && (
            <div className={`result ${results.removeAgent.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.removeAgent}</pre>
            </div>
          )}
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.identityRegistry ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.identityRegistry}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
      </div>

      {/* Token */}
      <div className="section">
        <h3>代币管理 (Token)</h3>
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          {ownerStatus.token.checking ? (
            <div style={{ color: "#666", fontSize: "0.875rem" }}>正在检查 owner 角色...</div>
          ) : ownerStatus.token.isOwner === null ? (
            <div style={{ color: "#999", fontSize: "0.875rem" }}>无法检查 owner 角色（请确保已配置合约地址）</div>
          ) : ownerStatus.token.isOwner ? (
            <div style={{ color: "#28a745", fontSize: "0.875rem", fontWeight: "500" }}>
              ✓ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 是 Owner 角色
            </div>
          ) : (
            <div style={{ color: "#dc3545", fontSize: "0.875rem", fontWeight: "500" }}>
              ✗ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 不是 Owner 角色
            </div>
          )}
        </div>
        
        {/* 设置身份注册表 */}
        <div className="subsection">
          <h4>设置身份注册表 setIdentityRegistry(address _identityRegistry)</h4>
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
          <h4>设置合规合约 setCompliance(address _compliance)</h4>
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

      {/* TREXImplementationAuthority */}
      <div className="section">
        <h3>实现授权管理 (TREXImplementationAuthority)</h3>
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          {ownerStatus.trexImplementationAuthority.checking ? (
            <div style={{ color: "#666", fontSize: "0.875rem" }}>正在检查 owner 角色...</div>
          ) : ownerStatus.trexImplementationAuthority.isOwner === null ? (
            <div style={{ color: "#999", fontSize: "0.875rem" }}>无法检查 owner 角色（请确保已配置合约地址）</div>
          ) : ownerStatus.trexImplementationAuthority.isOwner ? (
            <div style={{ color: "#28a745", fontSize: "0.875rem", fontWeight: "500" }}>
              ✓ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 是 Owner 角色
            </div>
          ) : (
            <div style={{ color: "#dc3545", fontSize: "0.875rem", fontWeight: "500" }}>
              ✗ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 不是 Owner 角色
            </div>
          )}
        </div>
        
        {/* 设置 TREXFactory */}
        <div className="subsection">
          <h4>设置 TREXFactory setTREXFactory(address trexFactory)</h4>
          <div className="form-group">
            <label>TREXFactory 地址</label>
            <input
              type="text"
              value={trexFactory}
              onChange={(e) => setTrexFactory(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleSetTrexFactory} disabled={loading} className="btn-primary">
              设置 TREXFactory
            </button>
          </div>
          {results.setTrexFactory && (
            <div className={`result ${results.setTrexFactory.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.setTrexFactory}</pre>
            </div>
          )}
        </div>

        {/* 设置 IA Factory */}
        <div className="subsection">
          <h4>设置 IA Factory setIAFactory(address iaFactory)</h4>
          <div className="form-group">
            <label>IA Factory 地址</label>
            <input
              type="text"
              value={iaFactory}
              onChange={(e) => setIaFactory(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleSetIAFactory} disabled={loading} className="btn-primary">
              设置 IA Factory
            </button>
          </div>
          {results.setIAFactory && (
            <div className={`result ${results.setIAFactory.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.setIAFactory}</pre>
            </div>
          )}
        </div>

        {/* 添加 TREX 版本 */}
        <div className="subsection">
          <h4>添加 TREX 版本 addTREXVersion(Version _version, TREXContracts _trex)</h4>
          <div className="form-group">
            <label>版本 (major,minor,patch)</label>
            <input
              type="text"
              value={versionToAdd}
              onChange={(e) => setVersionToAdd(e.target.value)}
              placeholder="例如: 1,0,0"
            />
          </div>
          <div className="form-group">
            <label>合约地址 (token,ctr,ir,irs,tir,mc，逗号分隔)</label>
            <input
              type="text"
              value={trexContractsData}
              onChange={(e) => setTrexContractsData(e.target.value)}
              placeholder="0x...,0x...,0x...,0x...,0x...,0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleAddTrexVersion} disabled={loading} className="btn-primary">
              添加 TREX 版本
            </button>
          </div>
          {results.addTrexVersion && (
            <div className={`result ${results.addTrexVersion.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.addTrexVersion}</pre>
            </div>
          )}
        </div>

        {/* 切换 TREX 版本 */}
        <div className="subsection">
          <h4>切换 TREX 版本 useTREXVersion(Version _version)</h4>
          <div className="form-group">
            <label>版本 (major,minor,patch)</label>
            <input
              type="text"
              value={versionToUse}
              onChange={(e) => setVersionToUse(e.target.value)}
              placeholder="例如: 1,0,0"
            />
          </div>
          <div className="button-group">
            <button onClick={handleUseTrexVersion} disabled={loading} className="btn-success">
              切换 TREX 版本
            </button>
          </div>
          {results.useTrexVersion && (
            <div className={`result ${results.useTrexVersion.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.useTrexVersion}</pre>
            </div>
          )}
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.trexImplementationAuthority ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.trexImplementationAuthority}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
      </div>

      {/* TREXGateway */}
      <div className="section">
        <h3>网关管理 (TREXGateway)</h3>
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          {ownerStatus.trexGateway.checking ? (
            <div style={{ color: "#666", fontSize: "0.875rem" }}>正在检查 owner 角色...</div>
          ) : ownerStatus.trexGateway.isOwner === null ? (
            <div style={{ color: "#999", fontSize: "0.875rem" }}>无法检查 owner 角色（请确保已配置合约地址）</div>
          ) : ownerStatus.trexGateway.isOwner ? (
            <div style={{ color: "#28a745", fontSize: "0.875rem", fontWeight: "500" }}>
              ✓ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 是 Owner 角色
            </div>
          ) : (
            <div style={{ color: "#dc3545", fontSize: "0.875rem", fontWeight: "500" }}>
              ✗ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 不是 Owner 角色
            </div>
          )}
        </div>
        
        {/* 设置工厂 */}
        <div className="subsection">
          <h4>设置工厂 setFactory(address factory)</h4>
          <div className="form-group">
            <label>TREXFactory 地址</label>
            <input
              type="text"
              value={gatewayFactory}
              onChange={(e) => setGatewayFactory(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleSetGatewayFactory} disabled={loading} className="btn-primary">
              设置工厂
            </button>
          </div>
          {results.setGatewayFactory && (
            <div className={`result ${results.setGatewayFactory.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.setGatewayFactory}</pre>
            </div>
          )}
        </div>

        {/* 设置公开部署状态 */}
        <div className="subsection">
          <h4>设置公开部署状态 setPublicDeploymentStatus(bool _isEnabled)</h4>
          <div className="form-group">
            <label>是否启用</label>
            <select
              value={publicDeploymentStatus}
              onChange={(e) => setPublicDeploymentStatus(e.target.value)}
            >
              <option value="">请选择</option>
              <option value="true">启用</option>
              <option value="false">禁用</option>
            </select>
          </div>
          <div className="button-group">
            <button onClick={handleSetPublicDeploymentStatus} disabled={loading} className="btn-primary">
              设置公开部署状态
            </button>
          </div>
          {results.setPublicDeploymentStatus && (
            <div className={`result ${results.setPublicDeploymentStatus.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.setPublicDeploymentStatus}</pre>
            </div>
          )}
        </div>

        {/* 转移工厂所有权 */}
        <div className="subsection">
          <h4>转移工厂所有权 transferFactoryOwnership(address _newOwner)</h4>
          <div className="form-group">
            <label>新所有者地址</label>
            <input
              type="text"
              value={newFactoryOwnerForGateway}
              onChange={(e) => setNewFactoryOwnerForGateway(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleTransferFactoryOwnershipForGateway} disabled={loading} className="btn-primary">
              转移工厂所有权
            </button>
          </div>
          {results.transferFactoryOwnershipForGateway && (
            <div className={`result ${results.transferFactoryOwnershipForGateway.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.transferFactoryOwnershipForGateway}</pre>
            </div>
          )}
        </div>

        {/* 启用/禁用部署费用 */}
        <div className="subsection">
          <h4>启用/禁用部署费用 enableDeploymentFee(bool _isEnabled)</h4>
          <div className="form-group">
            <label>是否启用</label>
            <select
              value={deploymentFeeEnabled}
              onChange={(e) => setDeploymentFeeEnabled(e.target.value)}
            >
              <option value="">请选择</option>
              <option value="true">启用</option>
              <option value="false">禁用</option>
            </select>
          </div>
          <div className="button-group">
            <button onClick={handleEnableDeploymentFee} disabled={loading} className="btn-primary">
              设置部署费用状态
            </button>
          </div>
          {results.enableDeploymentFee && (
            <div className={`result ${results.enableDeploymentFee.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.enableDeploymentFee}</pre>
            </div>
          )}
        </div>

        {/* 设置部署费用 */}
        <div className="subsection">
          <h4>设置部署费用 setDeploymentFee(uint256 _fee, address _feeToken, address _feeCollector)</h4>
          <div className="form-group">
            <label>费用金额</label>
            <input
              type="text"
              value={deploymentFee}
              onChange={(e) => setDeploymentFee(e.target.value)}
              placeholder="例如: 1000000000000000000"
            />
          </div>
          <div className="form-group">
            <label>费用代币地址</label>
            <input
              type="text"
              value={feeToken}
              onChange={(e) => setFeeToken(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>费用收集地址</label>
            <input
              type="text"
              value={feeCollector}
              onChange={(e) => setFeeCollector(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleSetDeploymentFee} disabled={loading} className="btn-primary">
              设置部署费用
            </button>
          </div>
          {results.setDeploymentFee && (
            <div className={`result ${results.setDeploymentFee.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.setDeploymentFee}</pre>
            </div>
          )}
        </div>

        {/* 添加 Agent */}
        <div className="subsection">
          <h4>添加 Agent addAgent(address _agent)</h4>
          <div className="form-group">
            <label>Agent 地址</label>
            <input
              type="text"
              value={agentToAddForGateway}
              onChange={(e) => setAgentToAddForGateway(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleAddAgentForGateway} disabled={loading} className="btn-primary">
              添加 Agent
            </button>
          </div>
          {results.addAgentForGateway && (
            <div className={`result ${results.addAgentForGateway.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.addAgentForGateway}</pre>
            </div>
          )}
        </div>

        {/* 移除 Agent */}
        <div className="subsection">
          <h4>移除 Agent removeAgent(address _agent)</h4>
          <div className="form-group">
            <label>Agent 地址</label>
            <input
              type="text"
              value={agentToRemoveForGateway}
              onChange={(e) => setAgentToRemoveForGateway(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleRemoveAgentForGateway} disabled={loading} className="btn-danger">
              移除 Agent
            </button>
          </div>
          {results.removeAgentForGateway && (
            <div className={`result ${results.removeAgentForGateway.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.removeAgentForGateway}</pre>
            </div>
          )}
        </div>

        {/* 添加部署者 */}
        <div className="subsection">
          <h4>添加部署者 addDeployer(address deployer)</h4>
          <div className="form-group">
            <label>部署者地址</label>
            <input
              type="text"
              value={deployerToAdd}
              onChange={(e) => setDeployerToAdd(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleAddDeployer} disabled={loading} className="btn-primary">
              添加部署者
            </button>
          </div>
          {results.addDeployer && (
            <div className={`result ${results.addDeployer.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.addDeployer}</pre>
            </div>
          )}
        </div>

        {/* 移除部署者 */}
        <div className="subsection">
          <h4>移除部署者 removeDeployer(address deployer)</h4>
          <div className="form-group">
            <label>部署者地址</label>
            <input
              type="text"
              value={deployerToRemove}
              onChange={(e) => setDeployerToRemove(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleRemoveDeployer} disabled={loading} className="btn-danger">
              移除部署者
            </button>
          </div>
          {results.removeDeployer && (
            <div className={`result ${results.removeDeployer.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.removeDeployer}</pre>
            </div>
          )}
        </div>

        {/* 批量添加部署者 */}
        <div className="subsection">
          <h4>批量添加部署者 batchAddDeployer(address[] calldata deployers)</h4>
          <div className="form-group">
            <label>部署者地址列表（逗号分隔）</label>
            <input
              type="text"
              value={deployersToAddBatch}
              onChange={(e) => setDeployersToAddBatch(e.target.value)}
              placeholder="0x...,0x...,0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleBatchAddDeployer} disabled={loading} className="btn-primary">
              批量添加部署者
            </button>
          </div>
          {results.batchAddDeployer && (
            <div className={`result ${results.batchAddDeployer.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.batchAddDeployer}</pre>
            </div>
          )}
        </div>

        {/* 批量移除部署者 */}
        <div className="subsection">
          <h4>批量移除部署者 batchRemoveDeployer(address[] calldata deployers)</h4>
          <div className="form-group">
            <label>部署者地址列表（逗号分隔）</label>
            <input
              type="text"
              value={deployersToRemoveBatch}
              onChange={(e) => setDeployersToRemoveBatch(e.target.value)}
              placeholder="0x...,0x...,0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleBatchRemoveDeployer} disabled={loading} className="btn-danger">
              批量移除部署者
            </button>
          </div>
          {results.batchRemoveDeployer && (
            <div className={`result ${results.batchRemoveDeployer.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.batchRemoveDeployer}</pre>
            </div>
          )}
        </div>

        {/* 应用费用折扣 */}
        <div className="subsection">
          <h4>应用费用折扣 applyFeeDiscount(address deployer, uint16 discount)</h4>
          <div className="form-group">
            <label>部署者地址</label>
            <input
              type="text"
              value={deployerForDiscount}
              onChange={(e) => setDeployerForDiscount(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>折扣 (0-10000，10000 = 100%)</label>
            <input
              type="text"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="例如: 5000 (50%)"
            />
          </div>
          <div className="button-group">
            <button onClick={handleApplyFeeDiscount} disabled={loading} className="btn-success">
              应用费用折扣
            </button>
          </div>
          {results.applyFeeDiscount && (
            <div className={`result ${results.applyFeeDiscount.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.applyFeeDiscount}</pre>
            </div>
          )}
        </div>

        {/* 批量应用费用折扣 */}
        <div className="subsection">
          <h4>批量应用费用折扣 batchApplyFeeDiscount(address[] calldata deployers, uint16[] calldata discounts)</h4>
          <div className="form-group">
            <label>部署者地址列表（逗号分隔）</label>
            <input
              type="text"
              value={deployersForDiscountBatch}
              onChange={(e) => setDeployersForDiscountBatch(e.target.value)}
              placeholder="0x...,0x...,0x..."
            />
          </div>
          <div className="form-group">
            <label>折扣列表（逗号分隔，0-10000）</label>
            <input
              type="text"
              value={discountsBatch}
              onChange={(e) => setDiscountsBatch(e.target.value)}
              placeholder="例如: 5000,3000,7000"
            />
          </div>
          <div className="button-group">
            <button onClick={handleBatchApplyFeeDiscount} disabled={loading} className="btn-success">
              批量应用费用折扣
            </button>
          </div>
          {results.batchApplyFeeDiscount && (
            <div className={`result ${results.batchApplyFeeDiscount.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.batchApplyFeeDiscount}</pre>
            </div>
          )}
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.trexGateway ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.trexGateway}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
      </div>

      {/* TREXFactory */}
      <div className="section">
        <h3>工厂管理 (TREXFactory)</h3>
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          {ownerStatus.trexFactory.checking ? (
            <div style={{ color: "#666", fontSize: "0.875rem" }}>正在检查 owner 角色...</div>
          ) : ownerStatus.trexFactory.isOwner === null ? (
            <div style={{ color: "#999", fontSize: "0.875rem" }}>无法检查 owner 角色（请确保已配置合约地址）</div>
          ) : ownerStatus.trexFactory.isOwner ? (
            <div style={{ color: "#28a745", fontSize: "0.875rem", fontWeight: "500" }}>
              ✓ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 是 Owner 角色
            </div>
          ) : (
            <div style={{ color: "#dc3545", fontSize: "0.875rem", fontWeight: "500" }}>
              ✗ 当前钱包 ({account.slice(0, 6)}...{account.slice(-4)}) 不是 Owner 角色
            </div>
          )}
        </div>
        
        {/* 部署 TREX 套件 */}
        <div className="subsection">
          <h4>部署 TREX 套件 deployTREXSuite(string memory _salt, TokenDetails _tokenDetails, ClaimDetails _claimDetails)</h4>
          <div className="form-group">
            <label>Salt (用于 CREATE2 部署)</label>
            <input
              type="text"
              value={saltForDeploy}
              onChange={(e) => setSaltForDeploy(e.target.value)}
              placeholder="例如: my-token-salt"
            />
          </div>
          <div className="form-group">
            <label>代币所有者地址 *</label>
            <input
              type="text"
              value={tokenOwner}
              onChange={(e) => setTokenOwner(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>代币名称 *</label>
            <input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="例如: My Token"
            />
          </div>
          <div className="form-group">
            <label>代币符号 *</label>
            <input
              type="text"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              placeholder="例如: MTK"
            />
          </div>
          <div className="form-group">
            <label>代币精度 (0-18) *</label>
            <input
              type="text"
              value={tokenDecimals}
              onChange={(e) => setTokenDecimals(e.target.value)}
              placeholder="例如: 18"
            />
          </div>
          <div className="form-group">
            <label>身份注册表存储地址 (留空则部署新的)</label>
            <input
              type="text"
              value={irsAddress}
              onChange={(e) => setIrsAddress(e.target.value)}
              placeholder="0x... (留空则部署新的)"
            />
          </div>
          <div className="form-group">
            <label>ONCHAINID 地址 (留空则自动创建)</label>
            <input
              type="text"
              value={onchainId}
              onChange={(e) => setOnchainId(e.target.value)}
              placeholder="0x... (留空则自动创建)"
            />
          </div>
          <div className="form-group">
            <label>IR Agents (逗号分隔，最多5个)</label>
            <input
              type="text"
              value={irAgents}
              onChange={(e) => setIrAgents(e.target.value)}
              placeholder="0x...,0x..."
            />
          </div>
          <div className="form-group">
            <label>Token Agents (逗号分隔，最多5个)</label>
            <input
              type="text"
              value={tokenAgents}
              onChange={(e) => setTokenAgents(e.target.value)}
              placeholder="0x...,0x..."
            />
          </div>
          <div className="form-group">
            <label>合规模块地址 (逗号分隔)</label>
            <input
              type="text"
              value={complianceModules}
              onChange={(e) => setComplianceModules(e.target.value)}
              placeholder="0x...,0x..."
            />
          </div>
          <div className="form-group">
            <label>合规模块设置 (用 | 分隔多个设置，每个设置为十六进制数据)</label>
            <input
              type="text"
              value={complianceSettings}
              onChange={(e) => setComplianceSettings(e.target.value)}
              placeholder="0x...|0x...|0x..."
            />
          </div>
          <div className="form-group">
            <label>声明主题列表 (逗号分隔，最多5个)</label>
            <input
              type="text"
              value={claimTopicsForDeploy}
              onChange={(e) => setClaimTopicsForDeploy(e.target.value)}
              placeholder="例如: 1, 2, 3"
            />
          </div>
          <div className="form-group">
            <label>可信发行者地址 (逗号分隔，最多5个)</label>
            <input
              type="text"
              value={issuers}
              onChange={(e) => setIssuers(e.target.value)}
              placeholder="0x...,0x..."
            />
          </div>
          <div className="form-group">
            <label>发行者声明 (用 | 分隔每个发行者，用逗号分隔声明主题，例如: "1,2,3|4,5|6")</label>
            <input
              type="text"
              value={issuerClaims}
              onChange={(e) => setIssuerClaims(e.target.value)}
              placeholder="例如: 1,2,3|4,5|6"
            />
          </div>
          <div className="button-group">
            <button onClick={handleDeployTREXSuite} disabled={loading} className="btn-primary">
              部署 TREX 套件
            </button>
          </div>
          {results.deployTREXSuite && (
            <div className={`result ${results.deployTREXSuite.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.deployTREXSuite}</pre>
            </div>
          )}
        </div>

        {/* 恢复合约所有权 */}
        <div className="subsection">
          <h4>恢复合约所有权 recoverContractOwnership(address _contract, address _newOwner)</h4>
          <div className="form-group">
            <label>合约地址</label>
            <input
              type="text"
              value={contractToRecover}
              onChange={(e) => setContractToRecover(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>新所有者地址</label>
            <input
              type="text"
              value={newOwnerForRecover}
              onChange={(e) => setNewOwnerForRecover(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleRecoverContractOwnership} disabled={loading} className="btn-primary">
              恢复合约所有权
            </button>
          </div>
          {results.recoverContractOwnership && (
            <div className={`result ${results.recoverContractOwnership.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.recoverContractOwnership}</pre>
            </div>
          )}
        </div>

        {/* 设置实现授权 */}
        <div className="subsection">
          <h4>设置实现授权 setImplementationAuthority(address _implementationAuthority)</h4>
          <div className="form-group">
            <label>实现授权地址</label>
            <input
              type="text"
              value={implementationAuthority}
              onChange={(e) => setImplementationAuthority(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleSetImplementationAuthority} disabled={loading} className="btn-primary">
              设置实现授权
            </button>
          </div>
          {results.setImplementationAuthority && (
            <div className={`result ${results.setImplementationAuthority.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.setImplementationAuthority}</pre>
            </div>
          )}
        </div>

        {/* 设置身份工厂 */}
        <div className="subsection">
          <h4>设置身份工厂 setIdFactory(address _idFactory)</h4>
          <div className="form-group">
            <label>身份工厂地址</label>
            <input
              type="text"
              value={idFactory}
              onChange={(e) => setIdFactory(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="button-group">
            <button onClick={handleSetIdFactory} disabled={loading} className="btn-primary">
              设置身份工厂
            </button>
          </div>
          {results.setIdFactory && (
            <div className={`result ${results.setIdFactory.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.setIdFactory}</pre>
            </div>
          )}
        </div>

        {/* 查询实现授权 */}
        <div className="subsection">
          <h4>查询实现授权 getImplementationAuthority()</h4>
          <div className="button-group">
            <button onClick={handleGetImplementationAuthority} disabled={loading} className="btn-secondary">
              查询实现授权
            </button>
          </div>
          {results.getImplementationAuthority && (
            <div className={`result ${results.getImplementationAuthority.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.getImplementationAuthority}</pre>
            </div>
          )}
        </div>

        {/* 查询身份工厂 */}
        <div className="subsection">
          <h4>查询身份工厂 getIdFactory()</h4>
          <div className="button-group">
            <button onClick={handleGetIdFactory} disabled={loading} className="btn-secondary">
              查询身份工厂
            </button>
          </div>
          {results.getIdFactory && (
            <div className={`result ${results.getIdFactory.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.getIdFactory}</pre>
            </div>
          )}
        </div>

        {/* 查询代币地址 */}
        <div className="subsection">
          <h4>查询代币地址 getToken(string calldata _salt)</h4>
          <div className="form-group">
            <label>Salt</label>
            <input
              type="text"
              value={saltForDeploy}
              onChange={(e) => setSaltForDeploy(e.target.value)}
              placeholder="例如: my-token-salt"
            />
          </div>
          <div className="button-group">
            <button onClick={handleGetToken} disabled={loading} className="btn-secondary">
              查询代币地址
            </button>
          </div>
          {results.getToken && (
            <div className={`result ${results.getToken.includes("错误") ? "error" : "success"}`} style={{ marginTop: "0.5rem" }}>
              <pre>{results.getToken}</pre>
            </div>
          )}
        </div>
        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
          合约地址: {CONTRACT_ADDRESSES.trexFactory ? (
            <span style={{ fontFamily: "monospace" }}>{CONTRACT_ADDRESSES.trexFactory}</span>
          ) : (
            <span style={{ color: "#999" }}>未配置</span>
          )}
        </div>
      </div>
    </div>
  );
}

