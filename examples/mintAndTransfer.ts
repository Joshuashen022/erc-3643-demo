import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { initializeContracts } from "./utils/contracts";
import { ensureAddressIsRegistered, mint, transfer, parseAmount } from "./utils/operations";
import { sendTransaction } from "./utils/transactions";

dotenv.config();

const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
const countryCode = 840;

async function main() {
  const config = await initializeContracts(rpcUrl);

  const useWei = process.env.USE_WEI === "true";
  const mintToAddress = process.env.MINT_TO_ADDRESS || config.wallet.address;
  const amountStr = process.env.MINT_AMOUNT || "10000000";
  const amount = parseAmount(amountStr, useWei);

  console.log(`\n=== 开始 Mint 操作 ===`);
  console.log(`接收地址: ${mintToAddress}`);
  console.log(`Mint 数量: ${amountStr}${useWei ? " tokens" : ""} (${amount} wei)`);

  // 确保地址已注册
  await ensureAddressIsRegistered(config, mintToAddress, countryCode, rpcUrl);
    
  // 获取 mint 前的状态
  const balanceBefore = await config.token.balanceOf(mintToAddress);
  const totalSupplyBefore = await config.token.totalSupply();
    
  console.log(`Mint 前余额: ${ethers.formatEther(balanceBefore)}`);
  console.log(`Mint 前总供应量: ${ethers.formatEther(totalSupplyBefore)}`);

  // 执行 mint 操作
  await mint(config, mintToAddress, amount, rpcUrl);
  console.log("\n=== Mint 操作完成 ===");

  // 验证 Mint 结果
  console.log("\n--- 验证 Mint 结果 ---");
  const balanceAfter = await config.token.balanceOf(mintToAddress);
  const totalSupplyAfter = await config.token.totalSupply();

  console.log(`Mint 后余额: ${ethers.formatEther(balanceAfter)}`);
  console.log(`Mint 后总供应量: ${ethers.formatEther(totalSupplyAfter)}`);

  const expectedBalance = balanceBefore + amount;
  const expectedTotalSupply = totalSupplyBefore + amount;

  if (balanceAfter === expectedBalance && totalSupplyAfter === expectedTotalSupply) {
    console.log("✓ Mint 操作成功！");
    console.log(`余额验证通过: ${ethers.formatEther(balanceAfter)} === ${ethers.formatEther(expectedBalance)}`);
    console.log(`总供应量验证通过: ${ethers.formatEther(totalSupplyAfter)} === ${ethers.formatEther(expectedTotalSupply)}`);
  } else {
    throw new Error(
      `Mint 验证失败: 余额 ${ethers.formatEther(balanceAfter)} != ${ethers.formatEther(expectedBalance)} 或 ` +
      `总供应量 ${ethers.formatEther(totalSupplyAfter)} != ${ethers.formatEther(expectedTotalSupply)}`
    );
  }

  // 执行 burn 操作
  console.log("\n--- 执行 Burn 操作 ---");
  await sendTransaction(
    config.token,
    "burn",
    [mintToAddress, amount],
    "Burn",
    config.provider,
    rpcUrl
  );
  console.log("\n=== Burn 操作完成 ===");

  // 验证 Burn 结果
  console.log("\n--- 验证 Burn 结果 ---");
  const balanceAfterBurn = await config.token.balanceOf(mintToAddress);
  const totalSupplyAfterBurn = await config.token.totalSupply();

  console.log(`Burn 后余额: ${ethers.formatEther(balanceAfterBurn)}`);
  console.log(`Burn 后总供应量: ${ethers.formatEther(totalSupplyAfterBurn)}`);

  const expectedBalanceBurn = balanceBefore;
  const expectedTotalSupplyBurn = totalSupplyBefore;

  if (balanceAfterBurn === expectedBalanceBurn && totalSupplyAfterBurn === expectedTotalSupplyBurn) {
    console.log("✓ Burn 操作成功！");
    console.log(`余额验证通过: ${ethers.formatEther(balanceAfterBurn)} === ${ethers.formatEther(expectedBalanceBurn)}`);
    console.log(`总供应量验证通过: ${ethers.formatEther(totalSupplyAfterBurn)} === ${ethers.formatEther(expectedTotalSupplyBurn)}`);
  } else {
    throw new Error(
      `Burn 验证失败: 余额 ${ethers.formatEther(balanceAfterBurn)} != ${ethers.formatEther(expectedBalanceBurn)} 或 ` +
      `总供应量 ${ethers.formatEther(totalSupplyAfterBurn)} != ${ethers.formatEther(expectedTotalSupplyBurn)}`
    );
  }

  // Transfer 操作
  const transferToAddress = process.env.TRANSFER_TO_ADDRESS || "0x1111111111111111111111111111111111111111";
  const transferAmountStr = process.env.TRANSFER_AMOUNT || amountStr;
  const transferAmount = parseAmount(transferAmountStr, useWei);

  console.log(`\n=== 开始 Transfer 操作 ===`);
  console.log(`发送地址: ${mintToAddress}`);
  console.log(`接收地址: ${transferToAddress}`);
  console.log(`Transfer 数量: ${transferAmountStr}${useWei ? " tokens" : ""} (${transferAmount} wei)`);

  // 确保接收地址已注册
  await ensureAddressIsRegistered(config, transferToAddress, countryCode, rpcUrl);

  // 确保发送地址有足够的余额
  const balanceBeforeTransfer = await config.token.balanceOf(mintToAddress);
  if (balanceBeforeTransfer < transferAmount) {
    console.log(`发送地址余额不足，需要先 mint 更多代币`);
    await mint(config, mintToAddress, transferAmount - balanceBeforeTransfer, rpcUrl);
  }

  // 获取 Transfer 前的状态
  const fromBalanceBefore = await config.token.balanceOf(mintToAddress);
  const toBalanceBefore = await config.token.balanceOf(transferToAddress);
  const totalSupplyBeforeTransfer = await config.token.totalSupply();

  console.log(`Transfer 前发送地址余额: ${ethers.formatEther(fromBalanceBefore)}`);
  console.log(`Transfer 前接收地址余额: ${ethers.formatEther(toBalanceBefore)}`);
  console.log(`Transfer 前总供应量: ${ethers.formatEther(totalSupplyBeforeTransfer)}`);

  // 执行 Transfer 操作
  let transferWallet = config.wallet;
  if (mintToAddress.toLowerCase() !== config.wallet.address.toLowerCase()) {
    const transferFromPrivateKey = process.env.TRANSFER_FROM_PRIVATE_KEY || process.env.PRIVATE_KEY || "";
    if (!transferFromPrivateKey) {
      throw new Error("请设置 TRANSFER_FROM_PRIVATE_KEY 或 PRIVATE_KEY 环境变量");
    }
    transferWallet = new ethers.Wallet(transferFromPrivateKey, config.provider);
  }
  
  await transfer(config, transferToAddress, transferAmount, transferWallet, rpcUrl);
  console.log("\n=== Transfer 操作完成 ===");

  // 验证 Transfer 结果
  console.log("\n--- 验证 Transfer 结果 ---");
  const fromBalanceAfter = await config.token.balanceOf(mintToAddress);
  const toBalanceAfter = await config.token.balanceOf(transferToAddress);
  const totalSupplyAfterTransfer = await config.token.totalSupply();

  console.log(`Transfer 后发送地址余额: ${ethers.formatEther(fromBalanceAfter)}`);
  console.log(`Transfer 后接收地址余额: ${ethers.formatEther(toBalanceAfter)}`);
  console.log(`Transfer 后总供应量: ${ethers.formatEther(totalSupplyAfterTransfer)}`);

  const expectedFromBalance = fromBalanceBefore - transferAmount;
  const expectedToBalance = toBalanceBefore + transferAmount;
  const expectedTotalSupplyTransfer = totalSupplyBeforeTransfer;

  if (fromBalanceAfter === expectedFromBalance && 
      toBalanceAfter === expectedToBalance && 
      totalSupplyAfterTransfer === expectedTotalSupplyTransfer) {
    console.log("✓ Transfer 操作成功！");
    console.log(`发送地址余额验证通过: ${ethers.formatEther(fromBalanceAfter)} === ${ethers.formatEther(expectedFromBalance)}`);
    console.log(`接收地址余额验证通过: ${ethers.formatEther(toBalanceAfter)} === ${ethers.formatEther(expectedToBalance)}`);
    console.log(`总供应量验证通过: ${ethers.formatEther(totalSupplyAfterTransfer)} === ${ethers.formatEther(expectedTotalSupplyTransfer)}`);
  } else {
    throw new Error(
      `Transfer 验证失败: 发送地址余额 ${ethers.formatEther(fromBalanceAfter)} != ${ethers.formatEther(expectedFromBalance)} 或 ` +
      `接收地址余额 ${ethers.formatEther(toBalanceAfter)} != ${ethers.formatEther(expectedToBalance)} 或 ` +
      `总供应量 ${ethers.formatEther(totalSupplyAfterTransfer)} != ${ethers.formatEther(expectedTotalSupplyTransfer)}`
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
