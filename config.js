const obj = {
  networks: {
    1: {
      lockers: {
        unicrypt: "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214",
        teamFin: "0xE2fE530C047f2d85298b07D9333C05737f1435fB", // proxy
      },
      uniswap: {
        router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
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
        factory: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
      },
      tokens: {
        weth: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
        usdc: "", // 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 !!!DO NOT USE!!!
        usdt: "0x55d398326f99059fF775485246999027B3197955", // USDT
        dai: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", // BUSD
      },
    },
    8453: {
      lockers: {

      },
      uniswap: {
        router: "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86",
        factory: "0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB",
      },
      tokens: {
        weth: "0x4200000000000000000000000000000000000006", // WETH
        usdc: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // USDC
        usdt: "", // USDT - not deployed
        dai: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI
      },
    }
  },
  supportedNetworks: [
    { chaindId: 1, name: "eth" },
    { chaindId: 56, name: "bsc" },
    { chaindId: 8453, name: "base" },
  ],
};

obj.supportedChainIds = obj.supportedNetworks.map(
  (network) => network.chaindId
);

module.exports = obj;
