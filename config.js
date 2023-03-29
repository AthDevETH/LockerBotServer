// BSC

const obj = {
  networks: {
    1: {
      lockers: {
        unicrypt: "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214",
        teamFin: "0xE2fE530C047f2d85298b07D9333C05737f1435fB", // proxy
      },
      uniswap: {
        router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        factory: "",
      },
      tokens: {
        weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      },
    },
    56: {
      lockers: {
        unicrypt: "0xC765bddB93b0D1c1A88282BA0fa6B2d00E3e0c83",
        teamFin: "0x0C89C0407775dd89b12918B9c0aa42Bf96518820", // proxy
      },
      uniswap: {
        router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        factory: "",
      },
      tokens: {
        weth: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
        usdc: "", // 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 !!!DO NOT USE!!!
        usdt: "0x55d398326f99059fF775485246999027B3197955", // USDT
        dai: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", // BUSD
      },
    },
  },
  supportedNetworks: [
    { chaindId: 1, name: "eth" },
    { chaindId: 56, name: "bsc" },
  ],
};

obj.supportedChainIds = obj.supportedNetworks.map(
  (network) => network.chaindId
);

module.exports = obj;
