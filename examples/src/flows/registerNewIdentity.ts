import { Dispatch, SetStateAction } from "react";
import { ethers } from "ethers";
import { createContractConfig } from "../utils/contracts";
import { RegisterNewIdentityResult, signClaim } from "../utils/operations";
import { MultiTransactionController } from "../hooks/useMultiTransaction";
import { TransactionStep } from "../types/multiTransaction";
import { rwaIdentityABI } from "../utils/contracts";

export interface RegisterNewIdentityHandlerDeps {
  provider?: ethers.JsonRpcProvider;
  wallet?: ethers.Signer;
  multiTransaction: MultiTransactionController;
  setCallFactoryResult: Dispatch<SetStateAction<RegisterNewIdentityResult | null>>;
}

/**
 * 注册新身份的多步骤流程
 * 返回可直接调用的异步处理函数，便于在其他组件中复用
 */
export const REGISTER_NEW_IDENTITY_STEPS: Omit<TransactionStep, "status">[] = [
  { id: 1, title: "创建新的管理密钥并预估身份地址" },
  { id: 2, title: "发送 ETH 到新管理密钥地址" },
  { id: 3, title: "创建身份合约" },
  { id: 4, title: "为身份添加 Claims" },
  { id: 5, title: "注册到 Identity Registry" },
  { id: 6, title: "验证注册状态" },
  { id: 7, title: "完成所有操作" },
];

export function createRegisterNewIdentityHandler({
  provider,
  wallet,
  multiTransaction,
  setCallFactoryResult,
}: RegisterNewIdentityHandlerDeps) {
  return async () => {
    // 初始化多步骤状态
    multiTransaction.initialize(REGISTER_NEW_IDENTITY_STEPS);

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

    // 打开弹窗后先给用户即时反馈
    updateCallFactoryResult({
      success: true,
      messages: ["正在执行示例操作，请稍候..."],
      errors: [],
      newManagementKey: undefined,
      newManagementKeyPrivateKey: undefined,
      newIdentityAddress: undefined,
      countryCode: undefined,
    });

    if (!provider || !wallet) {
      updateCallFactoryResult({
        success: false,
        messages: [],
        errors: ["Provider 或 Wallet 未提供"],
      });
      return;
    }

    try {
      const contractConfig = await createContractConfig(provider, wallet, {
        useClaimIssuerPrivateKeys: true,
      });

      const registrationResult: RegisterNewIdentityResult = {
        success: true,
        messages: [],
        errors: [],
      };

      const emitProgress = () => {
        updateCallFactoryResult({
          success: registrationResult.success,
          messages: [...registrationResult.messages],
          errors: [...registrationResult.errors],
          newManagementKey: registrationResult.newManagementKey,
          newManagementKeyPrivateKey: registrationResult.newManagementKeyPrivateKey,
          newIdentityAddress: registrationResult.newIdentityAddress,
          countryCode: registrationResult.countryCode,
        });
      };

      // 1) 创建新的管理密钥并预估身份地址
      multiTransaction.setCurrentStep(1);
      multiTransaction.updateStep(1, { status: "in_progress" });
      registrationResult.messages.push("\n=== 开始注册新身份 ===");

      const newManagementKeyWallet = ethers.Wallet.createRandom().connect(contractConfig.provider);
      const newManagementKey = await newManagementKeyWallet.getAddress();
      const identitySalt = `${Date.now()}`;

      registrationResult.messages.push(`新管理密钥地址: ${newManagementKey}`);
      registrationResult.messages.push(`使用的 salt: ${identitySalt}`);
      emitProgress();

      // 预测身份地址
      const createIdentityResult = await (contractConfig.identityIdFactory as any).createIdentity.staticCall(
        newManagementKey,
        identitySalt
      );
      const newIdentityAddress = ethers.getAddress(String(createIdentityResult));
      registrationResult.messages.push(`预测的身份合约地址: ${newIdentityAddress}`);
      multiTransaction.updateStep(1, { status: "completed", completeInfo: `预测的身份合约地址: ${newIdentityAddress}` });
      emitProgress();

      // 2) 发送 ETH 到新管理密钥地址
      multiTransaction.setCurrentStep(2);
      multiTransaction.updateStep(2, { status: "in_progress" });
      const fundingAmount = "0.0001";
      const tx = await wallet.sendTransaction({
        to: newManagementKey,
        value: ethers.parseEther(fundingAmount),
      });
      await tx.wait();
      registrationResult.messages.push(`发送 ETH 到新管理密钥地址: ${newManagementKey}`);
      multiTransaction.updateStep(2, { status: "completed", completeInfo: `发送 ETH 到新管理密钥地址: ${newManagementKey}` });
      emitProgress();

      // 3) 创建身份
      multiTransaction.setCurrentStep(3);
      multiTransaction.updateStep(3, { status: "in_progress" });
      registrationResult.messages.push("\n--- 创建身份合约 ---");
      emitProgress();

      const createIdentityTx = await contractConfig.identityIdFactory.createIdentity(
        newManagementKey,
        identitySalt,
        { gasLimit: 1_000_000 }
      );
      registrationResult.messages.push(`创建身份交易哈希: ${createIdentityTx.hash}`);
      emitProgress();

      const createIdentityCheckInterval = multiTransaction.trackTransactionConfirmations
        ? await multiTransaction.trackTransactionConfirmations(
            contractConfig.provider,
            createIdentityTx.hash,
            3,
            12
          )
        : undefined;

      await createIdentityTx.wait(2);
      if (createIdentityCheckInterval) clearInterval(createIdentityCheckInterval as NodeJS.Timeout);
      registrationResult.messages.push("✓ 身份创建交易已确认");
      multiTransaction.updateStep(3, { status: "completed", confirmations: 12, estimatedTimeLeft: undefined });
      emitProgress();

      // 4) 为身份添加 claims
      multiTransaction.setCurrentStep(4);
      multiTransaction.updateStep(4, { status: "in_progress" });
      registrationResult.messages.push("\n--- 获取 ClaimIssuer 信息 ---");

      const claimSchemeEcdsa = 1;
      const newIdentity = new ethers.Contract(
        newIdentityAddress,
        rwaIdentityABI.abi.length > 0
          ? rwaIdentityABI.abi
          : [
              "function addClaim(uint256 _topic, uint256 _scheme, address _issuer, bytes _signature, bytes _data, string _uri) external",
            ],
        newManagementKeyWallet
      );

      const issuerInfo: { address: string, topics: number[] }[] = [];
      
      for (let i = 0; i < contractConfig.config.claimIssuers.length; i++) {
        const claimIssuerKey = `claimIssuer${i}_claimIssuer` as keyof typeof contractConfig.deploymentResults;
        const claimIssuerAddressValue = contractConfig.deploymentResults[claimIssuerKey];
        if (!claimIssuerAddressValue || typeof claimIssuerAddressValue !== "string") {
          registrationResult.messages.push(`跳过 Claim Issuer ${i}：未找到地址`);
          continue;
        }

        const claimIssuerAddress = ethers.getAddress(claimIssuerAddressValue);
        const claimIssuerPrivateKey = contractConfig.config.claimIssuers[i].privateKey;
        const claimIssuerWallet = new ethers.Wallet(claimIssuerPrivateKey, contractConfig.provider);
        const claimTopics = contractConfig.config.claimIssuers[i].claimTopics || [];

        registrationResult.messages.push(`\n处理 Claim Issuer ${i}`);
        registrationResult.messages.push(`ClaimIssuer 地址: ${claimIssuerAddress}`);
        registrationResult.messages.push(`ClaimIssuer 钱包地址: ${claimIssuerWallet.address}`);
        registrationResult.messages.push(`支持的 Topics: ${claimTopics.join(", ")}`);
        emitProgress();

        issuerInfo.push({ address: claimIssuerAddress, topics: claimTopics });

        for (const claimTopic of claimTopics) {
          registrationResult.messages.push(`\n--- 为 topic ${claimTopic} 创建并签名 claim ---`);
          const data = "0x";
          const sigBytes = await signClaim(newIdentityAddress, claimTopic, claimIssuerWallet, data);

          registrationResult.messages.push(`\n--- 添加 topic ${claimTopic} 的 claim 到新身份 ---`);
          try {
            const addClaimTx = await (newIdentity as any).addClaim(
              claimTopic,
              claimSchemeEcdsa,
              claimIssuerAddress,
              sigBytes,
              data,
              "",
              { gasLimit: 1_000_000 }
            );
            registrationResult.messages.push(`添加 claim 交易哈希: ${addClaimTx.hash}`);
            emitProgress();

            await addClaimTx.wait(2);
            registrationResult.messages.push(`✓ Topic ${claimTopic} 的 Claim 已添加到新身份`);
            emitProgress();
          } catch (error: any) {
            registrationResult.success = false;
            registrationResult.errors.push(`添加 topic ${claimTopic} 的 claim 失败: ${error.message}`);
            multiTransaction.updateStep(4, { status: "failed", error: error.message });
            emitProgress();
            return;
          }
        }
      }

      multiTransaction.updateStep(4, { status: "completed", completeInfo: `为身份添加 claims: ${issuerInfo.map((issuer) => `${issuer.address}: ${issuer.topics.join(", ")}`).join("\n")}` });
      emitProgress();

      // 5) 注册到 Identity Registry
      multiTransaction.setCurrentStep(5);
      multiTransaction.updateStep(5, { status: "in_progress" });
      registrationResult.messages.push("\n--- 注册新身份到 Identity Registry ---");
      emitProgress();

      try {
        const registerTx = await contractConfig.identityRegistry.registerIdentity(
          newManagementKey,
          newIdentityAddress,
          840,
          { gasLimit: 1_000_000 }
        );
        registrationResult.messages.push(`注册身份交易哈希: ${registerTx.hash}`);
        emitProgress();

        const registerCheckInterval = multiTransaction.trackTransactionConfirmations
          ? await multiTransaction.trackTransactionConfirmations(
              contractConfig.provider,
              registerTx.hash,
              5,
              12
            )
          : undefined;

        await registerTx.wait(2);
        if (registerCheckInterval) clearInterval(registerCheckInterval as NodeJS.Timeout);

        registrationResult.messages.push("✓ 身份已注册到 Identity Registry");
        registrationResult.countryCode = 840;
        multiTransaction.updateStep(5, { status: "completed", confirmations: 12, estimatedTimeLeft: undefined });
        emitProgress();
      } catch (error: any) {
        registrationResult.success = false;
        registrationResult.errors.push(`注册身份失败: ${error.message}`);
        multiTransaction.updateStep(5, { status: "failed", error: error.message });
        emitProgress();
        return;
      }

      // 6) 验证注册状态
      multiTransaction.setCurrentStep(6);
      multiTransaction.updateStep(6, { status: "in_progress" });
      registrationResult.messages.push("\n--- 验证身份注册状态 ---");
      emitProgress();

      try {
        const isVerified = await contractConfig.identityRegistry.isVerified(newManagementKey);
        if (isVerified) {
          registrationResult.messages.push("✓ 身份验证成功！");
          registrationResult.messages.push(`用户地址: ${newManagementKey}`);
          registrationResult.messages.push(`身份合约地址: ${newIdentityAddress}`);
          multiTransaction.updateStep(6, { status: "completed", completeInfo: `用户地址: ${newManagementKey}\n身份合约地址: ${newIdentityAddress}` });
        } else {
          registrationResult.success = false;
          registrationResult.errors.push("身份验证失败");
          multiTransaction.updateStep(6, { status: "failed", error: "身份验证失败" });
        }
        emitProgress();
      } catch (error: any) {
        registrationResult.success = false;
        registrationResult.errors.push(`验证身份失败: ${error.message}`);
        multiTransaction.updateStep(6, { status: "failed", error: error.message });
        emitProgress();
        return;
      }

      // 7) 完成
      multiTransaction.setCurrentStep(7);
      if (registrationResult.success) {
        multiTransaction.updateStep(7, { status: "completed" });
        registrationResult.messages.push("\n=== 注册新身份完成 ===");
        registrationResult.newManagementKey = newManagementKey;
        registrationResult.newManagementKeyPrivateKey = newManagementKeyWallet.privateKey;
        registrationResult.newIdentityAddress = newIdentityAddress;

        registrationResult.messages.push("\n=== 注册结果摘要 ===");
        registrationResult.messages.push(`新管理密钥地址: ${newManagementKey}`);
        registrationResult.messages.push(`新管理密钥私钥: ${newManagementKeyWallet.privateKey}`);
        registrationResult.messages.push(`新身份合约地址: ${newIdentityAddress}`);
        registrationResult.messages.push(`国家代码: 840`);
      } else {
        multiTransaction.updateStep(7, { status: "failed" });
        registrationResult.messages.push("\n=== 注册错误 ===");
        registrationResult.errors.forEach((err) => registrationResult.messages.push(`✗ ${err}`));
      }

      emitProgress();
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
      if (multiTransaction.state) {
        multiTransaction.updateStep(multiTransaction.state.currentStep, { status: "failed", error: errorMsg });
      }
    } finally {
      // 预留给外部在需要时设置 loading 状态
    }
  };
}

