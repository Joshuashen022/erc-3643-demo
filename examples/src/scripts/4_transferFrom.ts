import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { createContractConfig } from "../utils/contracts.js";
import { transferFrom as parseAmount } from "../utils/operations.js";
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

  console.log(`\n=== 开始 TransferFrom 操作 ===`);
  const transferFromAmount = ethers.parseEther("1");
  const allowanceAmount = ethers.parseEther("2");
  // 获取 TransferFrom 前的状态
  const fromBalanceBefore = await config.token.balanceOf(transferFromWallet.address);
  const toBalanceBefore = await config.token.balanceOf(transferFromToAddress);
  const totalSupplyBefore = await config.token.totalSupply();

  console.log(`TransferFrom 前发送地址余额: ${ethers.formatEther(fromBalanceBefore)}`);
  console.log(`TransferFrom 前接收地址余额: ${ethers.formatEther(toBalanceBefore)}`);
  console.log(`TransferFrom 前总供应量: ${ethers.formatEther(totalSupplyBefore)}`);
  console.log(`TransferFrom amount ${transferFromAmount}`)

  // 执行 Approve 操作
  await sendTransaction(
    config.token.connect(transferFromWallet) as ethers.Contract,
    "approve",
    [spenderWallet.address, allowanceAmount],
    "Approve",
    config.provider,
    rpcUrl
  );
  const allowanceBefore = await config.token.allowance(transferFromWallet.address, spenderWallet.address);
  console.log(`TransferFrom 前授权额度: ${ethers.formatEther(allowanceBefore)}`);
  
  // 执行 TransferFrom 操作
  // await transferFromOp(config, transferFromWallet.address, transferFromToAddress, transferFromAmount, spenderWallet, rpcUrl);
  await sendTransaction(
    config.token.connect(transferFromWallet) as ethers.Contract,
    "transferFrom",
    [transferFromWallet.address, transferFromToAddress, transferFromAmount],
    "TransferFrom",
    config.provider,
    rpcUrl
  );
  const fromBalanceAfter = await config.token.balanceOf(transferFromWallet.address);
  const toBalanceAfter = await config.token.balanceOf(transferFromToAddress);
  const allowanceAfter = await config.token.allowance(transferFromWallet.address, spenderWallet.address);
  const totalSupplyAfter = await config.token.totalSupply();

  console.log(`TransferFrom 后发送地址余额: ${ethers.formatEther(fromBalanceAfter)}`);
  console.log(`TransferFrom 后接收地址余额: ${ethers.formatEther(toBalanceAfter)}`);
  console.log(`TransferFrom 后授权额度: ${ethers.formatEther(allowanceAfter)}`);
  console.log(`TransferFrom 后总供应量: ${ethers.formatEther(totalSupplyAfter)}`);
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
