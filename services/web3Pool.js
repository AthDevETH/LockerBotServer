const Web3 = require('web3');

const DEFAULT_WEB3_OPTIONS = {
  reconnect: {
    auto: true,
    delay: 1000,
    maxAttempts: 100,
    onTimeout: false,
  },
};

const DEFAULT_RPC_NODES = [
  // 'wss://rpc-mumbai.maticvigil.com/ws/v1/93de006517419d731d6585768b83477ed09e8d15',
  // 'wss://flashy-long-wish.discover.quiknode.pro/3670abd6e94008e5165d583b5cdd3a6908f968c9/',
  // 'wss://long-skilled-arm.discover.quiknode.pro/a7ea386f58647eaf12929eb0e4501f8d3b76e0ed/',
  'wss://late-radial-pine.bsc.discover.quiknode.pro/0775a8f112a7e5c30431e161161e894e59268132/'
];

class Web3Pool {
  constructor() {
    this.pool = new Set();
    this.dedicatedNodes = new Map();

    this.init(DEFAULT_RPC_NODES);
  }

  init(rpcNodes) {
    for (const rpcNode of rpcNodes) {
      const provider = new Web3.providers.WebsocketProvider(rpcNode, {
        ...DEFAULT_WEB3_OPTIONS,
      });

      const web3 = new Web3(provider);
      this.pool.add(web3);
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
      throw 'RpcNode not found';
    }

    node.currentProvider.disconnect();

    return this.dedicatedNodes.delete(rpcNode);
  }

  hasDedicatedNode(rpcNode) {
    return this.dedicatedNodes.has(rpcNode);
  }

  getNode(rpcNode) {
    if (rpcNode) {
      const node = this.dedicatedNodes.get(rpcNode);

      if (node) return node;
    }

    return this._getRandomRpcNode();
  }

  _getRandomRpcNode() {
    return [...this.pool][Math.floor(Math.random() * this.pool.size)];
  }
}

module.exports = new Web3Pool();
