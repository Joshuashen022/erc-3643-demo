import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { createContractConfig } from "../utils/contracts.js";
import { ensureAddressIsRegistered, approve, transferFrom as transferFromOp, parseAmount } from "../utils/operations.js";

dotenv.config();

const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
const countryCode = 840;

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

  const transferFromPrivateKey = process.env.TRANSFER_FROM_PRIVATE_KEY || process.env.PRIVATE_KEY || "";
  if (!transferFromPrivateKey) {
    throw new Error("请设置 TRANSFER_FROM_PRIVATE_KEY 或 PRIVATE_KEY 环境变量");
  }
  const transferFromToAddress = process.env.TRANSFER_FROM_TO_ADDRESS || "0x1111111111111111111111111111111111111111";
  const spenderPrivateKey = process.env.SPENDER_PRIVATE_KEY || "";
  
  if (!spenderPrivateKey) {
    throw new Error("请设置 SPENDER_PRIVATE_KEY 环境变量");
  }

  const transferFromWallet = new ethers.Wallet(transferFromPrivateKey, config.provider);
  const spenderWallet = new ethers.Wallet(spenderPrivateKey, config.provider);
  
  const useWei = process.env.USE_WEI === "true";
  const transferFromAmountStr = process.env.TRANSFER_FROM_AMOUNT || "10000000";
  const transferFromAmount = parseAmount(transferFromAmountStr, useWei);
  const allowanceAmountStr = process.env.ALLOWANCE_AMOUNT || (BigInt(transferFromAmountStr) * BigInt(2)).toString();
  const allowanceAmount = parseAmount(allowanceAmountStr, useWei);

  console.log(`\n=== 开始 TransferFrom 操作 ===`);
  console.log(`发送地址 (from): ${transferFromWallet.address}`);
  console.log(`授权地址 (spender): ${spenderWallet.address}`);
  console.log(`接收地址 (to): ${transferFromToAddress}`);
  console.log(`TransferFrom 数量: ${transferFromAmountStr}${useWei ? " tokens" : ""} (${transferFromAmount} wei)`);
  console.log(`授权数量: ${allowanceAmountStr}${useWei ? " tokens" : ""} (${allowanceAmount} wei)`);

  // 确保所有地址都已注册
  await ensureAddressIsRegistered(config, transferFromWallet.address, countryCode, rpcUrl);
  await ensureAddressIsRegistered(config, transferFromToAddress, countryCode, rpcUrl);
  await ensureAddressIsRegistered(config, spenderWallet.address, countryCode, rpcUrl);

  // 确保发送地址有足够的余额
  const balanceBefore = await config.token.balanceOf(transferFromWallet.address);
  if (balanceBefore < transferFromAmount) {
    console.log(`发送地址余额不足，需要先 mint 更多代币`);
    const { mint } = await import("../utils/operations.js");
    await mint(config, transferFromWallet.address, transferFromAmount - balanceBefore, rpcUrl);
  }

  // 获取 TransferFrom 前的状态
  const fromBalanceBefore = await config.token.balanceOf(transferFromWallet.address);
  const toBalanceBefore = await config.token.balanceOf(transferFromToAddress);
  const totalSupplyBefore = await config.token.totalSupply();

  console.log(`TransferFrom 前发送地址余额: ${ethers.formatEther(fromBalanceBefore)}`);
  console.log(`TransferFrom 前接收地址余额: ${ethers.formatEther(toBalanceBefore)}`);
  console.log(`TransferFrom 前总供应量: ${ethers.formatEther(totalSupplyBefore)}`);
  console.log(`TransferFrom amount ${transferFromAmount}`)

  // 执行 Approve 操作
  await approve(config, spenderWallet.address, allowanceAmount, transferFromWallet, rpcUrl);
  const allowanceBefore = await config.token.allowance(transferFromWallet.address, spenderWallet.address);
  console.log(`TransferFrom 前授权额度: ${ethers.formatEther(allowanceBefore)}`);
  
  // 执行 TransferFrom 操作
  await transferFromOp(config, transferFromWallet.address, transferFromToAddress, transferFromAmount, spenderWallet, rpcUrl);

  // 验证结果
  console.log("\n--- 验证 TransferFrom 结果 ---");
  const fromBalanceAfter = await config.token.balanceOf(transferFromWallet.address);
  const toBalanceAfter = await config.token.balanceOf(transferFromToAddress);
  const allowanceAfter = await config.token.allowance(transferFromWallet.address, spenderWallet.address);
  const totalSupplyAfter = await config.token.totalSupply();

  console.log(`TransferFrom 后发送地址余额: ${ethers.formatEther(fromBalanceAfter)}`);
  console.log(`TransferFrom 后接收地址余额: ${ethers.formatEther(toBalanceAfter)}`);
  console.log(`TransferFrom 后授权额度: ${ethers.formatEther(allowanceAfter)}`);
  console.log(`TransferFrom 后总供应量: ${ethers.formatEther(totalSupplyAfter)}`);

  const expectedFromBalance = fromBalanceBefore - transferFromAmount;
  const expectedToBalance = toBalanceBefore + transferFromAmount;
  const expectedAllowance = allowanceBefore - transferFromAmount;
  const expectedTotalSupply = totalSupplyBefore;

  if (fromBalanceAfter === expectedFromBalance && 
      toBalanceAfter === expectedToBalance && 
      allowanceAfter === expectedAllowance &&
      totalSupplyAfter === expectedTotalSupply) {
    console.log("✓ TransferFrom 操作成功！");
  } else {
    throw new Error(
      `TransferFrom 验证失败: 发送地址余额 ${ethers.formatEther(fromBalanceAfter)} != ${ethers.formatEther(expectedFromBalance)} 或 ` +
      `接收地址余额 ${ethers.formatEther(toBalanceAfter)} != ${ethers.formatEther(expectedToBalance)} 或 ` +
      `授权额度 ${ethers.formatEther(allowanceAfter)} != ${ethers.formatEther(expectedAllowance)} 或 ` +
      `总供应量 ${ethers.formatEther(totalSupplyAfter)} != ${ethers.formatEther(expectedTotalSupply)}`
    );
  }
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
