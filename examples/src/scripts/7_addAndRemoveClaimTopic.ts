import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { createContractConfig } from "../utils/contracts.js";
import { sendTransaction } from "../utils/transactions.js";
import identityArtifact from "../../../out/Identity.sol/RWAIdentity.json";

dotenv.config();

const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";

/**
 * 按照测试 DeployERC3643.t.sol 的逻辑：
 * 1. 添加 topic 3（若不存在）
 * 2. 部署一个全新的 RWAClaimIssuer，并将其以 topic 3 加入 TrustedIssuersRegistry
 * 3. 创建/注册一个新的身份，给它添加 topic 3 的 claim
 * 4. 移除 topic 3，检查 topic 已删除且 identity 仍然被验证
 */
async function main() {
  const ownerPrivateKey = process.env.PRIVATE_KEY; // 需要同时是 claimTopicsRegistry / trustedIssuersRegistry / identityIdFactory 的 owner
  const newTopic = 3;

  if (!ownerPrivateKey) {
    throw new Error("请设置 PRIVATE_KEY 环境变量（应为各 Registry/Factory 的 owner）");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);
  const network = await provider.getNetwork();

  const config = await createContractConfig(provider, ownerWallet, {
    useClaimIssuerPrivateKeys: true,
  });

  const newIssuerKeyWallet = ethers.Wallet.createRandom().connect(config.provider)
  const newIssuerKey = newIssuerKeyWallet.address;

  console.log(`连接到 RPC: ${rpcUrl} (chainId: ${network.chainId})`);
  console.log(`Owner 钱包: ${ownerWallet.address}`);
  console.log(`新 ClaimIssuer 管理密钥: ${newIssuerKey}`);
  console.log(`目标 claim topic: ${newTopic}`);

  // 1) 若不存在则新增 topic
  const topicsBefore: bigint[] = await config.claimTopicsRegistry.getClaimTopics();
  console.log(`当前 ClaimTopics: [${topicsBefore.join(", ")}]`);
  if (!topicsBefore.map(Number).includes(newTopic)) {
    console.log("\n=== 添加新的 claim topic ===");
    await sendTransaction(
      config.claimTopicsRegistry,
      "addClaimTopic",
      [newTopic],
      "AddClaimTopic",
      config.provider,
      rpcUrl
    );
  }

  // 2) 部署新的 ClaimIssuer 并信任它
  console.log("\n=== 部署新的 RWAClaimIssuer ===");
  const salt = `${Date.now()}`;
  const issuerAddressPlanned = await config.claimIssuerIdFactory.createIdentity.staticCall(newIssuerKey, salt)
  console.log(`issuerAddressPlanned: ${issuerAddressPlanned}`);
  await sendTransaction(
    config.claimIssuerIdFactory,
    "createIdentity",
    [newIssuerKey, salt],
    "CreateIdentity",
    config.provider,
    rpcUrl
  );

  const newIssuerAddress = await config.claimIssuerIdFactory.getIdentity(newIssuerKey);
  if (newIssuerAddress === ethers.ZeroAddress) {
    throw new Error("createIdentity 未能返回有效地址");
  }
  console.log(`新 ClaimIssuer 地址: ${newIssuerAddress} (预测: ${issuerAddressPlanned})`);

  console.log("\n=== 将新 issuer 加入 TrustedIssuersRegistry (topic 3) ===");
  await sendTransaction(
    config.trustedIssuersRegistry,
    "addTrustedIssuer",
    [newIssuerAddress, [newTopic]],
    "AddTrustedIssuer",
    config.provider,
    rpcUrl
  );

  // 3) 创建并注册新的身份，添加 topic 3 的 claim
  console.log("\n=== 创建新的身份并注册到 IdentityRegistry ===");
  const identityAddress = await config.identityIdFactory.getIdentity(ownerWallet.address);
  if (identityAddress === ethers.ZeroAddress) {
    throw new Error("getIdentity 未能返回有效地址");
  }
  console.log(`identityAddress: ${identityAddress}`);
  const identityContract = new ethers.Contract(identityAddress, identityArtifact.abi, ownerWallet);
  const claimSchemeEcdsa = 1;
  const claimData = "0x"; // 可根据需要填充
  const dataHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256", "bytes"], [identityAddress, newTopic, claimData])
  );
  const prefixedHash = ethers.keccak256(
    ethers.concat([
      ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32"),
      ethers.getBytes(dataHash),
    ])
  );
  const signature = ethers.Signature.from(newIssuerKeyWallet.signingKey.sign(prefixedHash)).serialized;

  console.log("\n=== 为身份添加 topic 3 的 claim ===");
  await sendTransaction(
    identityContract,
    "addClaim",
    [newTopic, claimSchemeEcdsa, newIssuerAddress, signature, claimData, "0x"],
    "AddClaimToIdentity",
    provider,
    rpcUrl
  );
  const identity = await config.identityRegistry.identity(ownerWallet.address);
  console.log(`identity: ${identity}`);

  const isVerified = await config.identityRegistry.isVerified(ownerWallet.address);
  console.log(`identity 是否已验证: ${isVerified}`);
  if (!isVerified) {
    throw new Error("identity 未被验证");
  }

  const isVerifiedBefore = await config.identityRegistry.isVerified(ownerWallet.address);
  console.log(`移除 topic 前 identity 是否已验证: ${isVerifiedBefore}`);

  // 4) 移除 topic 3，并验证已删除
  console.log("\n=== 移除 claim topic 3 ===");
  await sendTransaction(
    config.claimTopicsRegistry,
    "removeClaimTopic",
    [newTopic],
    "RemoveClaimTopic",
    config.provider,
    rpcUrl
  );

  const topicsAfter: bigint[] = await config.claimTopicsRegistry.getClaimTopics();
  console.log(`移除后 ClaimTopics: [${topicsAfter.join(", ")}]`);

  const stillVerified = await config.identityRegistry.isVerified(ownerWallet.address);
  console.log(`移除 topic 后 identity 是否仍被验证: ${stillVerified}`);

  console.log("\n脚本执行完成");
}

main().catch((error) => {
  console.error("错误:", error);
  process.exit(1);
});

