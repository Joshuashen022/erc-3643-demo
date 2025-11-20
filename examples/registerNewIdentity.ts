import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { initializeContracts, getContractABI, getContractAddresses } from "./utils/contracts";
import { registerIdentity } from "./utils/operations";
import { sendTransaction } from "./utils/transactions";

dotenv.config();

async function main() {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const config = await initializeContracts(rpcUrl);

  console.log("\n=== 开始注册新身份 ===");

  // 生成新的管理密钥
  // const newClaimKeyPrivateKey = process.env.NEW_CLAIM_KEY_PRIVATE_KEY || 
  //   "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const newClaimKeyWallet = ethers.Wallet.createRandom().connect(config.provider);
  const newManagementKey = newClaimKeyWallet.address;
  console.log(`新管理密钥地址: ${newManagementKey}`);

  // 创建新身份
  console.log("\n--- 创建新身份 ---");
  const factoryOwnerWallet = new ethers.Wallet(
    process.env.FACTORY_OWNER_PRIVATE_KEY || config.privateKey,
    config.provider
  );
  const identityIdFactoryWithOwner = config.identityIdFactory.connect(factoryOwnerWallet) as ethers.Contract;
  const identitySalt = `newIdentity-${Date.now()}`;
  
  const tx = await factoryOwnerWallet.sendTransaction({
    to: newClaimKeyWallet.address,
    value: ethers.parseEther("0.0001"),
  });
  await tx.wait();
  console.log(`Factory owner sent 0.0001 ETH to new claim key wallet: ${newClaimKeyWallet.address}`);

  let newIdentityAddress: string | undefined;
  
  try {
    const result = await (identityIdFactoryWithOwner as any).createIdentity.staticCall(newManagementKey, identitySalt);
    newIdentityAddress = ethers.getAddress(String(result));
    console.log(`预计创建的身份地址: ${newIdentityAddress} with salt: ${identitySalt}, management key: ${newManagementKey}`);
  } catch (error: any) {
    console.warn(`无法通过 staticCall 获取身份地址: ${error.message}`);
    newIdentityAddress = await (identityIdFactoryWithOwner as any).getIdentity(newManagementKey);
  }
  
  try {
    const receipt = await sendTransaction(
      identityIdFactoryWithOwner,
      "createIdentity",
      [newManagementKey, identitySalt],
      "创建身份",
      config.provider,
      rpcUrl
    );
    
    // 从 WalletLinked 事件中获取新身份地址
    if (receipt?.logs) {
      const walletLinkedTopic = ethers.id("WalletLinked(address,address)");
      const walletLinkedEvent = receipt.logs.find((log: any) => {
        return log.topics[0] === walletLinkedTopic && 
               ethers.getAddress(ethers.dataSlice(log.topics[1], 12)).toLowerCase() === newManagementKey.toLowerCase();
      });
      
      if (walletLinkedEvent) {
        const eventIdentityAddress = ethers.getAddress(ethers.dataSlice(walletLinkedEvent.topics[2], 12));
        if (newIdentityAddress && newIdentityAddress.toLowerCase() !== eventIdentityAddress.toLowerCase()) {
          console.warn(`警告: staticCall 返回的地址与事件中的地址不匹配`);
        }
        newIdentityAddress = eventIdentityAddress;
        console.log(`从 WalletLinked 事件获取身份地址: ${newIdentityAddress}`);
      }
    }
    
    if (!newIdentityAddress) {
      throw new Error("无法从交易中获取新身份地址");
    }
  } catch (error: any) {
    throw new Error(`创建身份失败: ${error.message}`);
  }

  console.log(`新身份地址: ${newIdentityAddress}`);
  
  // 添加 claim key 到新身份
  console.log("\n--- 添加 claim key 到新身份 ---");
  const purposeClaim = 3;
  const keyTypeEcdsa = 1;
  const claimKeyHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address"], [newManagementKey]));
  console.log(`Claim Key Hash: ${claimKeyHash}`);

  const rwaIdentityABI = getContractABI("RWAIdentity");
  const newIdentity = new ethers.Contract(
    newIdentityAddress,
    rwaIdentityABI.length > 0 ? rwaIdentityABI : [
      "function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType) external",
      "function addClaim(uint256 _topic, uint256 _scheme, address _issuer, bytes memory _signature, bytes memory _data, string memory _uri) external",
      "function keyHasPurpose(bytes32 _key, uint256 _purpose) external view returns (bool)",
    ],
    newClaimKeyWallet
  );

  try {
    const keyExists = await (newIdentity as any).keyHasPurpose(claimKeyHash, purposeClaim);
    if (keyExists) {
      console.log("✓ Claim key 已存在于新身份，跳过添加");
    } else {
      await sendTransaction(
        newIdentity,
        "addKey",
        [claimKeyHash, purposeClaim, keyTypeEcdsa],
        "添加 key",
        config.provider,
        rpcUrl
      );
      console.log("✓ Claim key 已添加到新身份");
    }
  } catch (error: any) {
    throw new Error(`添加 claim key 失败: ${error.message}`);
  }

  // 添加 claim key 到 claimIssuer
  console.log("\n--- 添加 claim key 到 ClaimIssuer ---");
  const managementKeyWallet = new ethers.Wallet(
    process.env.MANAGEMENT_KEY_PRIVATE_KEY || config.privateKey,
    config.provider
  );
  
  const network = await config.provider.getNetwork();
  const addresses = getContractAddresses(Number(network.chainId));
  const claimIssuerIdFactoryAddress = process.env.CLAIM_ISSUER_ID_FACTORY || addresses["RWAClaimIssuerIdFactory"];
  
  if (!claimIssuerIdFactoryAddress) {
    throw new Error("请设置 CLAIM_ISSUER_ID_FACTORY 环境变量或确保 RWAClaimIssuerIdFactory 在部署日志中");
  }

  const claimIssuerIdFactoryABI = getContractABI("RWAClaimIssuerIdFactory");
  const claimIssuerIdFactory = new ethers.Contract(
    ethers.getAddress(claimIssuerIdFactoryAddress),
    claimIssuerIdFactoryABI.length > 0 ? claimIssuerIdFactoryABI : [
      "function getIdentity(address _managementKey) view returns (address)",
    ],
    config.provider
  );
  
  const claimIssuerAddress = await claimIssuerIdFactory.getIdentity(config.managementKey);
  const claimIssuerABI = getContractABI("RWAClaimIssuer");
  const claimIssuer = new ethers.Contract(
    ethers.getAddress(claimIssuerAddress),
    claimIssuerABI.length > 0 ? claimIssuerABI : [
      "function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType) external",
      "function keyHasPurpose(bytes32 _key, uint256 _purpose) external view returns (bool)",
    ],
    managementKeyWallet
  );

  try {
    const keyExists = await (claimIssuer as any).keyHasPurpose(claimKeyHash, purposeClaim);
    if (keyExists) {
      console.log("✓ Claim key 已存在于 ClaimIssuer，跳过添加");
    } else {
      await sendTransaction(
        claimIssuer,
        "addKey",
        [claimKeyHash, purposeClaim, keyTypeEcdsa],
        "添加 key 到 ClaimIssuer",
        config.provider,
        rpcUrl
      );
      console.log("✓ Claim key 已添加到 ClaimIssuer");
    }
  } catch (error: any) {
    throw new Error(`添加 claim key 到 ClaimIssuer 失败: ${error.message}`);
  }
  
  // 创建并签名 claim
  console.log("\n--- 创建并签名 claim ---");
  const claimTopicKyc = 1;
  const claimSchemeEcdsa = 1;
  const data = "0x";
  const dataHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes"],
      [newIdentityAddress, claimTopicKyc, data]
    )
  );
  console.log(`Data Hash: ${dataHash}`);

  const messagePrefix = "\x19Ethereum Signed Message:\n32";
  const prefixedHash = ethers.keccak256(
    ethers.concat([
      ethers.toUtf8Bytes(messagePrefix),
      ethers.getBytes(dataHash)
    ])
  );
  console.log(`Prefixed Hash: ${prefixedHash}`);

  const signature = await newClaimKeyWallet.signingKey.sign(prefixedHash);
  const vByte = signature.v >= 27 ? signature.v - 27 : signature.v;
  const sigBytes = ethers.concat([
    signature.r,
    signature.s,
    new Uint8Array([vByte])
  ]);
  console.log(`签名: ${sigBytes} (长度: ${sigBytes.length} 字节)`);
  
  // 添加 claim 到新身份
  console.log("\n--- 添加 claim 到新身份 ---");
  try {
    await sendTransaction(
      newIdentity,
      "addClaim",
      [claimTopicKyc, claimSchemeEcdsa, claimIssuerAddress, sigBytes, data, ""],
      "添加 claim",
      config.provider,
      rpcUrl
    );
    console.log("✓ Claim 已添加到新身份");
  } catch (error: any) {
    throw new Error(`添加 claim 失败: ${error.message}`);
  }
  
  // 注册新身份到 Identity Registry
  console.log("\n--- 注册新身份到 Identity Registry ---");
  const countryCode = 840;
  
  try {
    await registerIdentity(config, newManagementKey, newIdentityAddress, countryCode, rpcUrl);
    console.log("✓ 身份已注册到 Identity Registry");
  } catch (error: any) {
    throw new Error(`注册身份失败: ${error.message}`);
  }
  
  // 验证身份是否已注册
  console.log("\n--- 验证身份注册状态 ---");
  try {
    const isVerified = await config.identityRegistry.isVerified(newManagementKey);
    if (isVerified) {
      console.log("✓ 身份验证成功！");
      console.log(`用户地址: ${newManagementKey}`);
      console.log(`身份合约地址: ${newIdentityAddress}`);
    } else {
      throw new Error("身份验证失败");
    }
  } catch (error: any) {
    throw new Error(`验证身份失败: ${error.message}`);
  }

  console.log("\n=== 注册新身份完成 ===");
  console.log(`新管理密钥地址: ${newManagementKey}`);
  console.log(`新身份合约地址: ${newIdentityAddress}`);
  console.log(`国家代码: ${countryCode}`);
}

main()
  .then(() => {
    console.log("\n脚本执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("错误:", error);
    process.exit(1);
  });
