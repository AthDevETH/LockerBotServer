const Web3 = require("web3");

const DEFAULT_WEB3_OPTIONS = {
  reconnect: {
    auto: true,
    delay: 1000,
    maxAttempts: 100,
    onTimeout: false,
  },
};

// TODO: Assign a respective chainId
const DEFAULT_RPC_NODES = [
  // 'wss://rpc-mumbai.maticvigil.com/ws/v1/93de006517419d731d6585768b83477ed09e8d15',
  // 'wss://flashy-long-wish.discover.quiknode.pro/3670abd6e94008e5165d583b5cdd3a6908f968c9/',
  // 'wss://long-skilled-arm.discover.quiknode.pro/a7ea386f58647eaf12929eb0e4501f8d3b76e0ed/',
  // 'wss://late-radial-pine.bsc.discover.quiknode.pro/0775a8f112a7e5c30431e161161e894e59268132/'
  {
    url: "wss://mainnet.infura.io/ws/v3/18c6b9fba7fd44df8ffc1da5f1210c1e",
    chainId: 1,
  },
  {
    url: "wss://late-radial-pine.bsc.discover.quiknode.pro/0775a8f112a7e5c30431e161161e894e59268132/",
    chainId: 56,
  },
];

class Web3Pool {
  constructor() {
    this.pool = [];
    this.dedicatedNodes = new Map();

    this.init(DEFAULT_RPC_NODES);
  }

  init(rpcNodes) {
    for (const rpcNode of rpcNodes) {
      const provider = new Web3.providers.WebsocketProvider(rpcNode.url, {
        ...DEFAULT_WEB3_OPTIONS,
      });

      const web3 = new Web3(provider);
      this.pool.push({ web3, chainId: rpcNode.chainId });
    }
  }

  addDedicatedNode(rpcNode) {
    const provider = new Web3.providers.WebsocketProvider(rpcNode, {
      ...DEFAULT_WEB3_OPTIONS,
    });

    this.dedicatedNodes.set(rpcNode, new Web3(provider));
  }

  removeDedicatedNode(rpcNode) {
    const node = this.dedicatedNodes.get(rpcNode);

    if (node) {
      throw "RpcNode not found";
    }

    node.currentProvider.disconnect();

    return this.dedicatedNodes.delete(rpcNode);
  }

  hasDedicatedNode(rpcNode) {
    return this.dedicatedNodes.has(rpcNode);
  }

  getNode(chainId) {
    const pool = this.pool.find((pool) => pool.chainId === chainId);

    return pool.web3;
  }
}

module.exports = new Web3Pool();
