import { ethers } from "ethers";
/**
 * 预编译合约地址和名称映射
 */
const PRECOMPILE_ADDRESSES: Array<{ address: string; name: string }> = [
  { address: "0x0000000000000000000000000000000000000001", name: "ecrecover" },
  { address: "0x0000000000000000000000000000000000000002", name: "sha256" },
  { address: "0x0000000000000000000000000000000000000003", name: "ripemd160" },
  { address: "0x0000000000000000000000000000000000000004", name: "identity" },
  { address: "0x0000000000000000000000000000000000000005", name: "modexp" },
  { address: "0x0000000000000000000000000000000000000006", name: "alt_bn128_add" },
  { address: "0x0000000000000000000000000000000000000007", name: "alt_bn128_mul" },
  { address: "0x0000000000000000000000000000000000000008", name: "alt_bn128_pairing" },
  { address: "0x0000000000000000000000000000000000000009", name: "blake2f" },
  { address: "0x000000000000000000000000000000000000000a", name: "point evaluation (EIP-4844)" },
];

/**
 * 检查预编译合约是否支持
 * @param provider - ethers provider 实例
 * @returns 返回一个布尔数组，表示每个预编译合约是否支持
 */
async function checkPrecompiles(provider: ethers.Provider): Promise<boolean[]> {
  const supported: boolean[] = [];

  for (const precompile of PRECOMPILE_ADDRESSES) {
    try {
      // 使用 call 检查预编译合约是否可用
      // 发送空的 calldata，如果成功则说明该预编译合约存在
      await provider.call({
        to: precompile.address,
        data: "0x",
      });
      
      // 如果调用成功（没有抛出异常），则认为支持
      // 注意：某些预编译合约可能需要特定的输入，但至少地址存在
      supported.push(true);
    } catch (error: any) {
      // 检查错误类型
      // 如果错误信息包含 "execution reverted"，可能表示合约存在但不接受空输入
      // 如果错误信息包含 "invalid address" 或其他网络错误，可能表示不支持
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes("execution reverted") || 
          errorMessage.includes("revert") ||
          errorMessage.includes("invalid opcode")) {
        // 这些错误通常表示预编译合约存在，但不接受空输入
        // 对于预编译合约来说，这仍然意味着支持
        supported.push(true);
      } else {
        // 其他错误（如网络错误、无效地址等）可能表示不支持
        supported.push(false);
      }
    }
  }

  return supported;
}

/**
 * 主函数：检查指定链的预编译合约支持情况
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

  console.log("\n开始检查预编译合约支持情况...\n");

  // 检查预编译合约
  const supported = await checkPrecompiles(provider);

  // 打印结果
  console.log("=== 预编译合约支持情况 ===");
  let supportedCount = 0;
  for (let i = 0; i < PRECOMPILE_ADDRESSES.length; i++) {
    const status = supported[i] ? "✓ 支持" : "✗ 不支持";
    const address = PRECOMPILE_ADDRESSES[i].address;
    const name = PRECOMPILE_ADDRESSES[i].name;
    
    console.log(`${address.padEnd(42)} ${name.padEnd(30)} ${status}`);
    
    if (supported[i]) {
      supportedCount++;
    }
  }

  console.log(`\n总计: ${supportedCount}/${PRECOMPILE_ADDRESSES.length} 个预编译合约支持`);
  
  // 返回结果对象
  return {
    supported,
    results: PRECOMPILE_ADDRESSES.map((precompile, index) => ({
      address: precompile.address,
      name: precompile.name,
      supported: supported[index],
    })),
  };
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

