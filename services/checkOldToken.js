const axios = require("axios");

const checkIfNew = async (web3, addr, chainId) => {
  const explorerMapping = {
    1: {
      url: "https://api.etherscan.com/api",
      apikey: "UETCARB8G5XUQHUTPBXAFVIUDX8M2H85JV",
    },
    56: {
      url: "https://api.bscscan.com/api",
      apikey: "WPXGC1NBH397IYQP76M2KY8U5953QSFBZS",
    },
  };
  try {
    const response = await axios.get(explorerMapping[chainId].url, {
      params: {
        module: "contract",
        action: "getcontractcreation",
        contractaddresses: addr,
        apikey: explorerMapping[chainId].apikey,
      },
    });
    const hash = response.data.result[0].txHash;
    const currentBlock = await web3.eth.getBlockNumber();
    const receipt = await web3.eth.getTransactionReceipt(hash);

    const difference = parseInt(currentBlock) - parseInt(receipt.blockNumber);
    console.log(`difference is ${difference}`);
    if (difference < 850000) {
      return true;
    } else {
      return false;
    }
  } catch {
    return false;
  }
};

module.exports = checkIfNew;
