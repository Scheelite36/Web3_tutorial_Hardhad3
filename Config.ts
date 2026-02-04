/**
 * 网络配置静态类
 * 存放各测试网络的配置参数
 */
export class NetworkConfig {
  // Sepolia 网络配置
  static readonly sepolia = {
    chainId: 11155111n,
    dataFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306" as const,
  };

  // 本地网络配置 (Hardhat)
  static readonly local = {
    chainId: 31337n,
    dataFeed: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as const,
  };

  /**
   * 根据网络 ID 获取对应的 dataFeed 地址
   */
  static getDataFeedAddress(chainId: bigint): string {
    switch (chainId) {
      case 31337n:
        return this.local.dataFeed;
      case 11155111n:
        return this.sepolia.dataFeed;
      default:
        throw new Error(`未配置的网络 ID: ${chainId}`);
    }
  }

  /**
   * 判断是否为本地网络
   */
  static isLocalNetwork(chainId: bigint): boolean {
    return chainId === 31337n;
  }

  /**
   * 判断是否为 Sepolia 网络
   */
  static isSepoliaNetwork(chainId: bigint): boolean {
    return chainId === 11155111n;
  }
}
