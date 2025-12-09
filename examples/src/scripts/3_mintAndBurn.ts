import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { createContractConfig } from "../utils/contracts.js";
import { sendTransaction } from "../utils/transactions.js";

dotenv.config();

const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";

async function main() {
  // 获取私钥
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("请设置 PRIVATE_KEY 环境变量");
  }

  // 创建 provider 和 wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // 初始化合约配置（使用 Claim Issuer 各自的私钥）
  const config = await createContractConfig(provider, wallet, {
    useClaimIssuerPrivateKeys: true,
  });

  console.log(`\n=== 开始 Mint 操作 ===`);
  const amount = ethers.parseEther("1");
  
  // 获取 mint 前的状态
  const balanceBefore = await config.token.balanceOf(wallet.address);
  const totalSupplyBefore = await config.token.totalSupply();
    
  console.log(`Mint 前余额: ${ethers.formatEther(balanceBefore)}`);
  console.log(`Mint 前总供应量: ${ethers.formatEther(totalSupplyBefore)}`);

  // 执行 mint 操作
  await sendTransaction(
    config.token,
    "mint",
    [wallet.address, amount],
    "Mint",
    config.provider,
    rpcUrl
  );

  const balanceAfter = await config.token.balanceOf(wallet.address);
  const totalSupplyAfter = await config.token.totalSupply();

  console.log(`Mint 后余额: ${ethers.formatEther(balanceAfter)}`);
  console.log(`Mint 后总供应量: ${ethers.formatEther(totalSupplyAfter)}`);

  // 执行 burn 操作
  console.log("\n--- 执行 Burn 操作 ---");
  await sendTransaction(
    config.token,
    "burn",
    [wallet.address, amount / 2n],
    "Burn",
    config.provider,
    rpcUrl
  );
  console.log("\n=== Burn 操作完成 ===");

  // 验证 Burn 结果
  console.log("\n--- 验证 Burn 结果 ---");
  const balanceAfterBurn = await config.token.balanceOf(wallet.address);
  const totalSupplyAfterBurn = await config.token.totalSupply();

  console.log(`Burn 后余额: ${ethers.formatEther(balanceAfterBurn)}`);
  console.log(`Burn 后总供应量: ${ethers.formatEther(totalSupplyAfterBurn)}`);


  console.log(`\n=== 开始 Transfer 操作 ===`);
  const transferToAddress = "0x340ec02864d9CAFF4919BEbE4Ee63f64b99c7806";
  // 获取 Transfer 前的状态
  const fromBalanceBefore = await config.token.balanceOf(wallet.address);
  const toBalanceBefore = await config.token.balanceOf(transferToAddress);
  const totalSupplyBeforeTransfer = await config.token.totalSupply();

  console.log(`Transfer 前发送地址余额: ${ethers.formatEther(fromBalanceBefore)}`);
  console.log(`Transfer 前接收地址余额: ${ethers.formatEther(toBalanceBefore)}`);
  console.log(`Transfer 前总供应量: ${ethers.formatEther(totalSupplyBeforeTransfer)}`);

  await sendTransaction(
    config.token,
    "transfer",
    [transferToAddress, amount / 10n],
    "Transfer",
    config.provider,
    rpcUrl
  );
  
  console.log(`Transfer 后发送地址余额: ${ethers.formatEther(await config.token.balanceOf(wallet.address))}`);
  console.log(`Transfer 后接收地址余额: ${ethers.formatEther(await config.token.balanceOf(transferToAddress))}`);
  console.log(`Transfer 后总供应量: ${ethers.formatEther(await config.token.totalSupply())}`);
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
