import { ethers } from "ethers";

/**
 * 发送交易并处理错误
 */
export async function sendTransaction(
  contract: ethers.Contract,
  methodName: string,
  args: any[],
  operationName: string,
  provider: ethers.JsonRpcProvider,
  rpcUrl?: string,
  gasLimit?: bigint
): Promise<ethers.ContractTransactionReceipt> {
  try {
    const tx = await contract[methodName](...args, {
      gasLimit: gasLimit || 1000000,
    });
    console.log(`${operationName} 交易哈希: ${tx.hash}`);
    
    if (rpcUrl === "http://127.0.0.1:8545") {
      await provider.send("evm_mine", []);
      await provider.send("evm_mine", []);
    }
    
    const receipt = await tx.wait(2);
    console.log(`交易确认，区块号: ${receipt?.blockNumber}`);
    
    return receipt!;
  } catch (error: any) {
    throw new Error(`${operationName} 操作失败: ${error.message}`);
  }
}

