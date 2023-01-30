module.exports = {
  lockers: {
    unicrypt: "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214",
    teamFin: "0xE2fE530C047f2d85298b07D9333C05737f1435fB", // proxy
  },
  uniswap: {
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factory: '',
  },
  tokens: {
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  },
  rpc: 'wss://rpc-mumbai.maticvigil.com/ws/v1/93de006517419d731d6585768b83477ed09e8d15', // must use websocket i.e. "wss//mainnet.infura..."
};
