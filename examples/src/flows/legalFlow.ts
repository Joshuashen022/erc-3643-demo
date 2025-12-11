import { Dispatch, SetStateAction } from "react";
import { ethers } from "ethers";
import { createContractConfig } from "../utils/contracts";
import { signClaim } from "../utils/operations";
import rwaIdentityABI from "../../../out/Identity.sol/RWAIdentity.json";
import { MultiTransactionController } from "../hooks/useMultiTransaction";
import { TransactionStep } from "../types/multiTransaction";

export interface LegalFlowResult {
  success: boolean;
  messages: string[];
  errors: string[];
}

export interface LegalFlowDeps {
  provider?: ethers.JsonRpcProvider;
  wallet?: ethers.Signer;
  multiTransaction: MultiTransactionController;
  setResult: Dispatch<SetStateAction<LegalFlowResult | null>>;
}

export const LEGAL_FLOW_STEPS: Omit<TransactionStep, "status">[] = [
  { id: 1, title: "添加 Claim Topic" },
  { id: 2, title: "部署新的 ClaimIssuer" },
  { id: 3, title: "添加 Claim 到身份" },
  { id: 4, title: "移除 Claim Topic" },
  { id: 5, title: "完成所有操作" },
];

export function createLegalFlowHandler({
  provider,
  wallet,
  multiTransaction,
  setResult,
}: LegalFlowDeps) {
  return async () => {
    multiTransaction.initialize(LEGAL_FLOW_STEPS);

    const updateResult = (partial: Partial<LegalFlowResult>) => {
      setResult((prev) => {
        const base: LegalFlowResult = prev || { success: true, messages: [], errors: [] };
        return {
          success: partial.success ?? base.success,
          messages: partial.messages ? [...partial.messages] : [...base.messages],
          errors: partial.errors ? [...partial.errors] : [...base.errors],
        };
      });
    };
    const result: LegalFlowResult = {
      success: true,
      messages: [],
      errors: [],
    };

    const emitProgress = () => {
      updateResult({
        success: result.success,
        messages: [...result.messages],
        errors: [...result.errors],
      });
    };
    if (!provider || !wallet) {
      result.success = false;
      result.errors.push("Provider 或 Wallet 未提供");
      emitProgress();
      return;
    }

    try {
      const contractConfig = await createContractConfig(provider, wallet, { useClaimIssuerPrivateKeys: true });
      const targetTopic = 3;
      const account = await wallet.getAddress();

      result.messages.push(`\n=== 开始执行添加并移除 Claim Topic 示例 (topic ${targetTopic}) ===`);

      // 1) 若不存在则新增 topic
      multiTransaction.setCurrentStep(1);
      multiTransaction.updateStep(1, { status: "in_progress" });

      const topicsBefore: bigint[] = await contractConfig.claimTopicsRegistry.getClaimTopics();
      result.messages.push(`当前 ClaimTopics: [${topicsBefore.join(", ")}]`);
      emitProgress();

      if (!topicsBefore.map(Number).includes(targetTopic)) {
        const addTopicTx = await contractConfig.claimTopicsRegistry.addClaimTopic(targetTopic, { gasLimit: 1_000_000 });
        result.messages.push(`添加 topic 交易哈希: ${addTopicTx.hash}`);
        emitProgress();

        const addTopicCheckInterval = await multiTransaction.trackTransactionConfirmations?.(
          provider,
          addTopicTx.hash,
          1,
          12
        );

        await addTopicTx.wait(2);
        if (addTopicCheckInterval) clearInterval(addTopicCheckInterval as NodeJS.Timeout);
        result.messages.push("✓ claim topic 添加成功");
        emitProgress();
        multiTransaction.updateStep(1, { 
          status: "completed", 
          confirmations: 12, 
          estimatedTimeLeft: undefined,
          completeInfo: `targetTopic: ${targetTopic}`
        });
      } else {
        result.messages.push("claim topic 已存在，跳过添加");
        emitProgress();
        multiTransaction.updateStep(1, { status: "completed" , completeInfo: `claim topic 已存在，跳过添加, targetTopic: ${targetTopic}`});
      }

      // 2) 部署新的 ClaimIssuer 并信任它
      multiTransaction.setCurrentStep(2);
      multiTransaction.updateStep(2, { status: "in_progress" });
      result.messages.push("\n=== 部署新的 RWAClaimIssuer ===");
      emitProgress();

      const newIssuerKeyWallet = ethers.Wallet.createRandom();
      const issuerWallet = new ethers.Wallet(newIssuerKeyWallet.privateKey, contractConfig.provider);
      const salt = `${Date.now()}`;
      const issuerAddressPlanned = await (contractConfig.claimIssuerIdFactory as any).createIdentity.staticCall(
        issuerWallet.address,
        salt
      );
      result.messages.push(`新 ClaimIssuer 管理密钥: ${issuerWallet.address}`);
      result.messages.push(`预测的 issuer 地址: ${issuerAddressPlanned}`);
      emitProgress();

      const createIssuerTx = await contractConfig.claimIssuerIdFactory.createIdentity(issuerWallet.address, salt, {
        gasLimit: 1_000_000,
      });
      result.messages.push(`创建 issuer 交易哈希: ${createIssuerTx.hash}`);
      emitProgress();

      const createIssuerCheckInterval = await multiTransaction.trackTransactionConfirmations?.(
        provider,
        createIssuerTx.hash,
        2,
        12
      );

      await createIssuerTx.wait(2);
      if (createIssuerCheckInterval) clearInterval(createIssuerCheckInterval as NodeJS.Timeout);

      const newIssuerAddress = await contractConfig.claimIssuerIdFactory.getIdentity(issuerWallet.address);
      if (newIssuerAddress === ethers.ZeroAddress) {
        throw new Error("createIdentity 未能返回有效地址");
      }
      result.messages.push(`新 ClaimIssuer 地址: ${newIssuerAddress}`);
      emitProgress();

      const addTrustedTx = await contractConfig.trustedIssuersRegistry.addTrustedIssuer(newIssuerAddress, [targetTopic], {
        gasLimit: 1_000_000,
      });
      result.messages.push(`添加 trusted issuer 交易哈希: ${addTrustedTx.hash}`);
      emitProgress();

      const addTrustedCheckInterval = await multiTransaction.trackTransactionConfirmations?.(
        provider,
        addTrustedTx.hash,
        2,
        12
      );

      await addTrustedTx.wait(2);
      if (addTrustedCheckInterval) clearInterval(addTrustedCheckInterval as NodeJS.Timeout);
      result.messages.push("✓ 新 issuer 已加入 TrustedIssuersRegistry");
      emitProgress();
      multiTransaction.updateStep(2, { 
        status: "completed", 
        confirmations: 12, 
        estimatedTimeLeft: undefined,
        completeInfo: `新 issuer 已加入: ${newIssuerAddress}`
      });

      // 3) 创建/注册身份并添加 claim
      multiTransaction.setCurrentStep(3);
      multiTransaction.updateStep(3, { status: "in_progress" });
      result.messages.push("\n=== 为身份添加 claim ===");
      emitProgress();

      const identityAddress = await contractConfig.identityIdFactory.getIdentity(account);
      if (identityAddress === ethers.ZeroAddress) {
        throw new Error("getIdentity 未能返回有效地址");
      }
      result.messages.push(`身份地址: ${identityAddress}`);
      emitProgress();

      const identityContract = new ethers.Contract(
        identityAddress,
        (rwaIdentityABI as any).abi && (rwaIdentityABI as any).abi.length > 0
          ? (rwaIdentityABI as any).abi
          : ["function addClaim(uint256,uint256,address,bytes,bytes,string) external"],
        contractConfig.signer
      );

      const claimSchemeEcdsa = 1;
      const claimData = "0x";
      const signature = await signClaim(identityAddress, targetTopic, issuerWallet, claimData);

      const addClaimTx = await identityContract.addClaim(
        targetTopic,
        claimSchemeEcdsa,
        newIssuerAddress,
        signature,
        claimData,
        "0x",
        { gasLimit: 1_000_000 }
      );
      result.messages.push(`添加 claim 交易哈希: ${addClaimTx.hash}`);
      emitProgress();

      const addClaimCheckInterval = await multiTransaction.trackTransactionConfirmations?.(
        provider,
        addClaimTx.hash,
        3,
        12
      );

      await addClaimTx.wait(2);
      if (addClaimCheckInterval) clearInterval(addClaimCheckInterval as NodeJS.Timeout);

      const isVerified = await contractConfig.identityRegistry.isVerified(account);
      result.messages.push(`identity 是否已验证: ${isVerified}`);
      emitProgress();
      if (!isVerified) {
        throw new Error("identity 未被验证");
      }

      multiTransaction.updateStep(3, { 
        status: "completed", 
        confirmations: 12, 
        estimatedTimeLeft: undefined,
        completeInfo: `identity 已添加 claim, targetTopic: ${targetTopic}`
      });

      // 4) 移除 claim topic
      multiTransaction.setCurrentStep(4);
      multiTransaction.updateStep(4, { status: "in_progress" });
      result.messages.push("\n=== 移除 claim topic ===");
      emitProgress();

      const removeTopicTx = await contractConfig.claimTopicsRegistry.removeClaimTopic(targetTopic, {
        gasLimit: 1_000_000,
      });
      result.messages.push(`移除 topic 交易哈希: ${removeTopicTx.hash}`);
      emitProgress();

      const removeTopicCheckInterval = await multiTransaction.trackTransactionConfirmations?.(
        provider,
        removeTopicTx.hash,
        4,
        12
      );

      await removeTopicTx.wait(2);
      if (removeTopicCheckInterval) clearInterval(removeTopicCheckInterval as NodeJS.Timeout);

      const topicsAfter: bigint[] = await contractConfig.claimTopicsRegistry.getClaimTopics();
      result.messages.push(`移除后 ClaimTopics: [${topicsAfter.join(", ")}]`);
      emitProgress();

      const stillVerified = await contractConfig.identityRegistry.isVerified(account);
      result.messages.push(`移除 topic 后 identity 是否仍被验证: ${stillVerified}`);
      emitProgress();

      multiTransaction.updateStep(4, { 
        status: "completed", 
        confirmations: 12, 
        estimatedTimeLeft: undefined,
        completeInfo: `移除 topic 后 identity 是否仍被验证: ${stillVerified}`
      });

      // 5) 完成
      multiTransaction.setCurrentStep(5);
      multiTransaction.updateStep(5, { status: "completed" , completeInfo: "示例操作完成"});
      result.messages.push("\n=== 示例操作完成 ===");
      emitProgress();
    } catch (error: any) {
      const msg = error.message || "未知错误";
      result.success = false;
      result.errors.push(`错误: ${msg}`);
      emitProgress();
      if (multiTransaction.state) {
        multiTransaction.updateStep(multiTransaction.state.currentStep, { status: "failed", error: msg });
      }
    }
  };
}


