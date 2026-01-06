import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * ecrecover 预编译合约地址
 */
const ECRECOVER_ADDRESS = "0x0000000000000000000000000000000000000001";

/**
 * 测试 ecrecover 预编译合约
 * @param provider - ethers provider 实例
 */
async function testEcrecover(provider: ethers.Provider) {
  console.log("\n=== 测试 ecrecover 预编译合约 ===");
  
  // 创建一个测试钱包
  const testWallet = ethers.Wallet.createRandom();
  const message = "Hello, ecrecover!";
  
  console.log(`测试钱包地址: ${testWallet.address}`);
  console.log(`测试消息: ${message}`);
  
  // 计算消息哈希（以太坊消息签名格式）
  const messageHash = ethers.hashMessage(message);
  console.log(`消息哈希: ${messageHash}`);
  
  // 签名消息
  const signature = await testWallet.signMessage(message);
  console.log(`签名: ${signature}`);
  
  // 解析签名得到 r, s, v
  const sig = ethers.Signature.from(signature);
  console.log(`r: ${sig.r}`);
  console.log(`s: ${sig.s}`);
  console.log(`v: ${sig.v}`);
  
  // 构造 ecrecover 的输入
  // ecrecover 的输入格式：hash (32 bytes) + v (32 bytes) + r (32 bytes) + s (32 bytes) = 128 bytes
  // 注意：v 值需要是 27 或 28，如果是 0 或 1，需要加 27
  let v = sig.v;
  if (v < 27) {
    v += 27;
  }
  
  // 注意：ecrecover 需要的是消息哈希，不是签名消息哈希
  // 以太坊的 ecrecover 使用的是 keccak256("\x19Ethereum Signed Message:\n" + len(message) + message)
  // 我们需要使用签名时的哈希，即 ethers.hashMessage 的结果
  const hashBytes = ethers.getBytes(messageHash);
  const vBytes = ethers.zeroPadValue(ethers.toBeHex(v), 32);
  const rBytes = ethers.zeroPadValue(sig.r, 32);
  const sBytes = ethers.zeroPadValue(sig.s, 32);
  
  const inputData = ethers.concat([hashBytes, vBytes, rBytes, sBytes]);
  console.log(`输入数据长度: ${inputData.length} bytes`);
  
  try {
    // 调用预编译合约
    const result = await provider.call({
      to: ECRECOVER_ADDRESS,
      data: ethers.hexlify(inputData),
    });
    
    console.log(`预编译合约返回: ${result}`);
    
    // 解析结果（地址是 20 字节，但返回是 32 字节，取后 20 字节）
    const recoveredAddress = ethers.getAddress("0x" + result.slice(-40));
    console.log(`恢复的地址: ${recoveredAddress}`);
    
    // 使用 ethers 的内置方法验证（用于对比）
    const ethersRecoveredAddress = ethers.recoverAddress(messageHash, signature);
    console.log(`ethers.recoverAddress 结果: ${ethersRecoveredAddress}`);
    
    // 验证结果
    const isValid = recoveredAddress.toLowerCase() === testWallet.address.toLowerCase();
    const ethersMatches = ethersRecoveredAddress.toLowerCase() === testWallet.address.toLowerCase();
    const bothMatch = recoveredAddress.toLowerCase() === ethersRecoveredAddress.toLowerCase();
    
    console.log(`验证结果:`);
    console.log(`  预编译合约: ${isValid ? "✓ 成功" : "✗ 失败"}`);
    console.log(`  ethers 方法: ${ethersMatches ? "✓ 成功" : "✗ 失败"}`);
    console.log(`  两者一致: ${bothMatch ? "✓ 是" : "✗ 否"}`);
    
    if (!isValid || !ethersMatches || !bothMatch) {
      console.error(`预期地址: ${testWallet.address}`);
      console.error(`预编译合约恢复: ${recoveredAddress}`);
      console.error(`ethers 恢复: ${ethersRecoveredAddress}`);
    }
    
    return isValid && ethersMatches && bothMatch;
  } catch (error: any) {
    console.error(`调用失败: ${error.message}`);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  //   const rpcUrl = "http://127.0.0.1:8545";
  const rpcUrl = "https://sepolia.base.org";
  
  // 创建 provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  console.log(`连接到 RPC: ${rpcUrl}`);
  
  try {
    const network = await provider.getNetwork();
    console.log(`网络: ${network.name} (Chain ID: ${network.chainId})`);
  } catch (error) {
    console.warn("无法获取网络信息，继续执行...");
  }
  
  // 测试 ecrecover
  const ecrecoverResult = await testEcrecover(provider);
  
  // 总结
  console.log("\n=== 测试总结 ===");
  console.log(`ecrecover: ${ecrecoverResult ? "✓ 通过" : "✗ 失败"}`);
  
  if (ecrecoverResult) {
    console.log("\n测试通过！");
  } else {
    console.log("\n测试失败，请检查上面的错误信息");
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

